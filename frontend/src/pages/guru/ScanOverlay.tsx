import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../components/Toast';

type ScanPhase =
  | 'idle'
  | 'geo-check'
  | 'loading-model'
  | 'scanning'
  | 'success'
  | 'denied-camera'
  | 'denied-geo'
  | 'error'
  | 'manual';

interface ScanResult {
  status: 'HADIR' | 'TERLAMBAT';
  checkInAt?: string;
  checkOutAt?: string;
  similarity: number;
  distanceMeter?: number;
  pesan: string;
}

interface ScanOverlayProps {
  onClose: () => void;
}

const MAX_FAILS = 3;
const STABLE_FRAMES_NEEDED = 2;
const MANUAL_TRIGGER_MS = 5000;
const VIDEO_READY_TIMEOUT_MS = 5000;

/**
 * ScanOverlay — fullscreen overlay kamera untuk presensi mandiri guru.
 *
 * Perbaikan v2:
 * - Semua catch bisu DIBUKA → error tampil di layar
 * - wasmPath lokal via faceHuman.ts (human.esm.js default ke CDN)
 * - Warm-up dilakukan di loadHuman()
 * - Video readyState check 5 detik sebelum loop dimulai
 * - Debug overlay: ?debug=1
 * - Backend label tampil di header
 */
export function ScanOverlay({ onClose }: ScanOverlayProps) {
  const { show } = useToast();
  const [searchParams] = useSearchParams();
  const isDebug = searchParams.get('debug') === '1';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const faceModRef = useRef<typeof import('../../lib/faceHuman') | null>(null);
  const failCountRef = useRef(0);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** true = tantangan blink sudah terpenuhi, boleh ambil embedding */
  const blinkPassedRef = useRef(false);
  /** setTimeout untuk menutup jendela blink (3 detik setelah blink terdeteksi) */
  const blinkWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [statusMsg, setStatusMsg] = useState('Memulai…');
  const [loadPct, setLoadPct] = useState(0);
  const [backendLabel, setBackendLabel] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showManualBtn, setShowManualBtn] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Ref untuk deduplicate setStatusMsg — mencegah re-render per frame
  const prevStatusRef = useRef('');
  // Ref untuk isDebug — agar tidak perlu masuk deps loop
  const isDebugRef = useRef(isDebug);
  useEffect(() => { isDebugRef.current = isDebug; }, [isDebug]);

  /** Set status hanya bila pesan berubah — mencegah re-render per frame. */
  const setStatus = useCallback((msg: string) => {
    if (prevStatusRef.current !== msg) {
      prevStatusRef.current = msg;
      setStatusMsg(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startManualTimer = useCallback(() => {
    setShowManualBtn(false);
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    manualTimerRef.current = setTimeout(() => setShowManualBtn(true), MANUAL_TRIGGER_MS);
  }, []);

  // ── Main scan flow ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Phase 1: Geolocation
      setPhase('geo-check');
      setStatusMsg('Memeriksa lokasi…');

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
        );
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err: unknown) {
        const code = (err as GeolocationPositionError)?.code;
        if (code === 1 && !cancelled) {
          setPhase('denied-geo');
          setStatusMsg('Izin lokasi ditolak — melanjutkan tanpa geofence…');
          await new Promise((r) => setTimeout(r, 1200));
        }
        // timeout / error lain → lanjut tanpa koordinat
      }

      if (cancelled) return;

      // Phase 2: Load face model
      setPhase('loading-model');
      setStatusMsg('Memuat model deteksi wajah…');
      setLoadPct(0);
      setLoadError(false);

      let mod: typeof import('../../lib/faceHuman');
      try {
        mod = await import('../../lib/faceHuman');
        faceModRef.current = mod;
        await mod.loadHuman((pct, label) => {
          if (!cancelled) { setLoadPct(pct); setStatusMsg(label); }
        });
        if (cancelled) return;
        setBackendLabel(`mesin: ${mod.activeBackend}`);
      } catch (err: unknown) {
        if (!cancelled) {
          setLoadError(true);
          setPhase('error');
          setStatusMsg(
            err instanceof Error
              ? `Gagal memuat model: ${err.message}`
              : 'Gagal memuat model — periksa koneksi atau coba lagi',
          );
        }
        return;
      }

      if (cancelled) return;

      // Phase 3: Kamera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch((e) => { throw new Error(`Putar video gagal: ${e.message}`); });
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        const isPermDenied = name === 'NotAllowedError' || name === 'PermissionDeniedError';
        setPhase(isPermDenied ? 'denied-camera' : 'error');
        setStatusMsg(
          isPermDenied
            ? 'Izin kamera ditolak'
            : `Kamera tidak dapat diakses: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      if (cancelled) return;

      // Phase 4: Tunggu video siap
      const video = videoRef.current;
      if (video) {
        const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
        while (
          !cancelled &&
          (video.readyState < 2 || video.videoWidth === 0) &&
          Date.now() < deadline
        ) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (cancelled) return;
        if (video.readyState < 2 || video.videoWidth === 0) {
          setPhase('error');
          setStatusMsg(
            `Kamera tidak mengirim gambar (readyState=${video.readyState}, ` +
            `videoWidth=${video.videoWidth}). Tutup tab lain yang memakai kamera.`,
          );
          return;
        }
      }

      setPhase('scanning');
      setStatusMsg('Posisikan wajah Anda di tengah lingkaran');
      blinkPassedRef.current = false;
      startManualTimer();
    };

    run();
    return () => { cancelled = true; stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Detection loop ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'scanning') return;
    const video = videoRef.current;
    const mod = faceModRef.current;
    if (!video || !mod) return;

    let stopped = false;
    let goodFrames = 0;

    const loop = async () => {
      if (stopped) return;
      try {
        const quality = await mod.checkQuality(video);

        // ?debug=1 — console.log ringkas per frame (nol setState, nol re-render)
        if (isDebugRef.current && quality.debugInfo) {
          const d = quality.debugInfo;
          const box = d.box ? d.box.map((n: number) => Math.round(n)).join(',') : 'null';
          const real = d.realScore !== null ? d.realScore.toFixed(2) : 'n/a';
          const live = d.liveScore !== null ? d.liveScore.toFixed(2) : 'n/a';
          const blink = d.blinkDetected ? 'ya' : 'belum';
          // eslint-disable-next-line no-console
          console.log(`[wajah] n=${d.faceCount} skor=${d.score.toFixed(3)} box=${box} det=${d.detectMs}ms be=${d.backend} real=${real} live=${live} blink=${blink}`);
        }

        if (quality.isSpoof) {
          // Antispoof gagal — pesan jujur, tidak diam
          goodFrames = 0;
          blinkPassedRef.current = false;
          setStatus(quality.reason ?? 'Terdeteksi foto/layar — gunakan wajah asli');
        } else if (quality.ok) {
          goodFrames++;
          if (goodFrames >= STABLE_FRAMES_NEEDED) {
            if (!blinkPassedRef.current) {
              // ── Fase tantangan blink ───────────────────────────────
              // Wajah sudah stabil & lolos antispoof — minta kedip
              setStatus('Kedipkan mata Anda…');
              if (quality.blinkDetected) {
                // Blink terdeteksi — buka jendela 3 detik
                blinkPassedRef.current = true;
                if (blinkWindowRef.current) clearTimeout(blinkWindowRef.current);
                blinkWindowRef.current = setTimeout(() => {
                  // Tutup jendela — reset agar minta blink lagi
                  blinkPassedRef.current = false;
                  goodFrames = 0;
                }, 3000);
              }
            } else {
              // ── Jendela blink terbuka — ambil embedding ─────────────
              if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
              setShowManualBtn(false);
              setStatus('Memindai wajah…');

              let det: import('../../lib/faceHuman').FaceDetection | null = null;
              try {
                det = await mod.detectEmbedding(video);
              } catch (err: unknown) {
                // Error nyata (incl. antispoof gagal di detectEmbedding) — tampil di layar
                setStatus(
                  err instanceof Error
                    ? err.message
                    : `Gagal ambil embedding: ${String(err)}`,
                );
                goodFrames = 0;
                blinkPassedRef.current = false;
                if (!stopped) animFrameRef.current = requestAnimationFrame(loop);
                return;
              }

              if (det) {
                stopped = true;
                if (blinkWindowRef.current) clearTimeout(blinkWindowRef.current);
                stopCamera();
                await doScan(det.embedding);
                return;
              } else {
                setStatus('Skor wajah terlalu rendah — pastikan cahaya cukup dan wajah terlihat jelas');
                goodFrames = 0;
                blinkPassedRef.current = false;
              }
            }
          } else {
            setStatus(`Tahan… (${goodFrames}/${STABLE_FRAMES_NEEDED})`);
          }
        } else {
          goodFrames = 0;
          setStatus(quality.reason ?? 'Posisikan wajah di tengah');
        }
      } catch (err: unknown) {
        // Error dari checkQuality — tampil di layar (kejadian langka)
        goodFrames = 0;
        setStatus(`Error deteksi: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!stopped) animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const doScan = async (embedding: number[]) => {
    try {
      const body: { embedding: number[]; lat?: number; lng?: number; mode?: 'masuk' | 'pulang' } = { embedding };
      if (geoRef.current) { body.lat = geoRef.current.lat; body.lng = geoRef.current.lng; }
      const res = await api.guruPresensiScan(body);
      setResult(res as ScanResult);
      setPhase('success');
    } catch (err: unknown) {
      failCountRef.current++;
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setPhase('error');
          setStatusMsg(err.message || 'Wajah Anda belum didaftarkan. Hubungi admin.');
          return;
        }
        if (err.status === 403) {
          setPhase('error');
          setStatusMsg(err.message || 'Di luar area sekolah atau wajah belum divalidasi.');
          return;
        }
        if (err.status === 401) {
          if (failCountRef.current >= MAX_FAILS) {
            setPhase('manual');
            setStatusMsg(`Wajah tidak dikenali ${MAX_FAILS}×`);
            return;
          }
          setStatusMsg(`Wajah tidak dikenali (${failCountRef.current}/${MAX_FAILS}). Coba lagi.`);
          setTimeout(() => {
            if (streamRef.current) { setPhase('scanning'); startManualTimer(); }
          }, 1500);
          return;
        }
      }
      setPhase('error');
      setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleManualCapture = async () => {
    const video = videoRef.current;
    const mod = faceModRef.current;
    if (!video || !mod) return;
    setShowManualBtn(false);
    setStatusMsg('Memindai wajah…');
    try {
      const det = await mod.detectEmbedding(video);
      if (det) {
        stopCamera();
        await doScan(det.embedding);
      } else {
        setStatusMsg('Wajah tidak terdeteksi — pastikan pencahayaan cukup, lalu coba lagi');
        startManualTimer();
      }
    } catch (err: unknown) {
      // Tampilkan error nyata — JANGAN bisu
      setStatusMsg(`Gagal memotret: ${err instanceof Error ? err.message : String(err)}`);
      startManualTimer();
    }
  };

  // Expose doScan for e2e mock
  (window as unknown as Record<string, unknown>).__scanWithEmbedding = doScan;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      role="dialog"
      aria-label="Presensi Sekarang"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white shrink-0 z-10">
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Presensi Sekarang</span>
          {backendLabel && (
            <span className="text-[10px] text-white/30 font-mono">{backendLabel}</span>
          )}
        </div>
        <button
          id="btn-tutup-scan"
          onClick={() => { stopCamera(); onClose(); }}
          className="flex items-center gap-1 text-sm text-white/70 active:text-white"
        >
          <span className="material-symbols-outlined text-base leading-none">close</span>
          Tutup
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">

        {/* Video feed — selalu dirender */}
        <video
          ref={videoRef}
          id="scan-video"
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* ── LOADING ── */}
        {(phase === 'idle' || phase === 'geo-check' || phase === 'loading-model') && !loadError && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8">
            <span className="material-symbols-outlined text-4xl text-white/50 animate-spin">autorenew</span>
            {phase === 'loading-model' ? (
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-sm text-white/70 mb-1">
                  <span>{statusMsg}</span>
                  <span>{loadPct}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all duration-300"
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
                <p className="text-xs text-white/30 mt-2 text-center">Model dimuat lokal — tidak butuh internet</p>
              </div>
            ) : (
              <p className="text-sm text-white/60">{statusMsg}</p>
            )}
          </div>
        )}

        {/* ── SCANNING ── */}
        {phase === 'scanning' && (
          <>
            {/* Oval panduan */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-52 h-72 rounded-full border-2 border-white/50 pointer-events-none z-10" />

            {/* Status — atas */}
            <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
              <div className="bg-black/65 text-white text-sm px-5 py-2.5 rounded-full max-w-[88%] text-center leading-snug">
                {statusMsg}
              </div>
            </div>

            {/* Tombol manual fallback */}
            {showManualBtn && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                <button
                  id="btn-ambil-foto-scan"
                  onClick={handleManualCapture}
                  className="rounded-2xl bg-white text-black text-base font-semibold px-8 py-4 shadow-lg active:bg-gray-100"
                >
                  <span className="material-symbols-outlined align-middle mr-1 text-lg">camera_alt</span>
                  Ambil Foto
                </button>
              </div>
            )}



          </>
        )}

        {/* ── SUCCESS ── */}
        {phase === 'success' && result && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-7xl text-green-400">check_circle</span>
            <h2 className="text-3xl font-bold text-white">
              {result.status === 'HADIR' ? 'HADIR' : 'TERLAMBAT'}
            </h2>
            <p className="text-lg text-white/80">{result.pesan}</p>
            {result.checkInAt && (
              <p className="text-sm text-white/50">
                Masuk:{' '}
                {new Date(result.checkInAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
                })}
              </p>
            )}
            {result.checkOutAt && (
              <p className="text-sm text-white/50">
                Pulang:{' '}
                {new Date(result.checkOutAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
                })}
              </p>
            )}
            <button
              id="btn-tutup-hasil"
              onClick={() => { stopCamera(); onClose(); }}
              className="mt-2 rounded-xl bg-white/20 px-8 py-4 text-base font-medium text-white active:bg-white/30 w-full max-w-xs"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ── MANUAL (gagal 3×) ── */}
        {phase === 'manual' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-6xl text-yellow-400">warning</span>
            <h2 className="text-xl font-semibold text-white">Wajah Tidak Dikenali</h2>
            <p className="text-sm text-white/70 max-w-xs">
              Sistem tidak berhasil mengenali wajah Anda setelah {MAX_FAILS}× percobaan.
              Hubungi admin untuk pencatatan presensi manual.
            </p>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white active:bg-white/30"
            >
              Kembali
            </button>
          </div>
        )}

        {/* ── DENIED GEO ── */}
        {phase === 'denied-geo' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="material-symbols-outlined text-5xl text-yellow-400">location_off</span>
            <p className="text-sm text-white/70">{statusMsg}</p>
          </div>
        )}

        {/* ── DENIED CAMERA ── */}
        {phase === 'denied-camera' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400">no_photography</span>
            <h2 className="text-xl font-semibold text-white">Izin Kamera Ditolak</h2>
            <p className="text-sm text-white/70">
              Buka pengaturan browser → izinkan akses kamera → coba lagi.
            </p>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white"
            >
              Kembali
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {(phase === 'error' || loadError) && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400">error</span>
            <p className="text-sm text-red-300 font-semibold">Terjadi Kesalahan</p>
            <p className="text-xs text-white/70 max-w-xs leading-relaxed">{statusMsg}</p>
            <button
              id="btn-tutup-scan-error"
              onClick={() => { stopCamera(); onClose(); }}
              className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white"
            >
              Kembali
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
