import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../components/Toast';
import {
  initialPoseState,
  reducePose,
  roleForPose,
  POSE_WINDOW_MS,
  type PoseState,
} from '../../lib/livenessStateMachine';

const POSE_LABELS = ['Depan', 'Toleh ke satu sisi', 'Toleh ke sisi sebaliknya'];
const MIN_POSES = 3;
const STABLE_FRAMES_NEEDED = 2;
const MANUAL_TRIGGER_MS = 5000;
const VIDEO_READY_TIMEOUT_MS = 5000;

type Phase =
  | 'loading'
  | 'camera'
  | 'done'
  | 'denied'
  | 'error';

/**
 * GuruEnrollWizardPage — /guru/wajah/enroll
 *
 * UI kamera fullscreen, mobile-first.
 * ?debug=1 di URL: tulis log ringkas per frame ke console ([wajah] n=... skor=...).
 */
export function GuruEnrollWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDebug = searchParams.get('debug') === '1';
  const { show } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const consecutiveGoodRef = useRef(0);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [loadPct, setLoadPct] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Memuat model wajah…');
  const [status, setStatusRaw] = useState('');
  const [backendLabel, setBackendLabel] = useState('');
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [saving, setSaving] = useState(false);
  const [showManualBtn, setShowManualBtn] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Ref untuk deduplicate setStatus — mencegah re-render per frame
  const prevStatusRef = useRef('');
  // Ref untuk isDebug — agar tidak perlu masuk deps loop
  const isDebugRef = useRef(isDebug);
  useEffect(() => { isDebugRef.current = isDebug; }, [isDebug]);

  /** Set status hanya bila pesan berubah — mencegah re-render per frame. */
  const setStatus = useCallback((msg: string) => {
    if (prevStatusRef.current !== msg) {
      prevStatusRef.current = msg;
      setStatusRaw(msg);
    }
  }, []);

  const faceModRef = useRef<typeof import('../../lib/faceHuman') | null>(null);
  const lmModRef = useRef<typeof import('../../lib/faceLandmarker') | null>(null);
  /** true = tantangan liveness sudah terpenuhi untuk pose saat ini */
  const challengePassedRef = useRef(false);
  /** setTimeout jendela liveness (3 detik setelah pose terdeteksi) */
  const challengeWindowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** State machine pose (murni) — sumber kebenaran untuk idx/sign/challengePassed */
  const poseStateRef = useRef<PoseState>(initialPoseState());
  /** performance.now() saat challenge pose saat ini pass (mulai jendela ambil) */
  const challengeStartRef = useRef(0);
  /** F3b — snapshot frame pose Depan (base64 JPEG, ~320px q0.7). Dikirim saat enroll. */
  const snapshotBase64Ref = useRef<string | null>(null);

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

  // ── Muat model & buka kamera ─────────────────────────────────────
  const initCamera = useCallback(async (cancelled: { v: boolean }) => {
    setLoadPct(0);
    setLoadLabel('Memuat model wajah…');
    setLoadError(false);
    setPhase('loading');
    setStatus('');
    setBackendLabel('');

    // 1. Load AI models
    let mod: typeof import('../../lib/faceHuman');
    let lmMod: typeof import('../../lib/faceLandmarker');
    try {
      const [humanMod, landmarkerMod] = await Promise.all([
        import('../../lib/faceHuman'),
        import('../../lib/faceLandmarker')
      ]);
      mod = humanMod;
      lmMod = landmarkerMod;
      faceModRef.current = humanMod;
      lmModRef.current = landmarkerMod;

      await humanMod.loadHuman((pct, label) => {
        if (!cancelled.v) { setLoadPct(Math.round(pct / 2)); setLoadLabel(`Human: ${label}`); }
      });
      await landmarkerMod.loadFaceLandmarker((pct, label) => {
        if (!cancelled.v) { setLoadPct(50 + Math.round(pct / 2)); setLoadLabel(`MediaPipe: ${label}`); }
      });
      
      if (cancelled.v) return;
      setBackendLabel(`mesin: ${mod.activeBackend}`);
    } catch (err: unknown) {
      if (!cancelled.v) {
        setLoadError(true);
        setStatus(
          err instanceof Error
            ? `Gagal memuat model: ${err.message}`
            : 'Gagal memuat model — periksa koneksi atau muat ulang',
        );
      }
      return;
    }

    // 2. Buka kamera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (cancelled.v) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch((e) => { throw new Error(`Putar video gagal: ${e.message}`); });
      }
    } catch (err: unknown) {
      if (cancelled.v) return;
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        setPhase('denied');
      } else {
        setPhase('error');
        setStatus(`Kamera tidak dapat diakses: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    if (cancelled.v) return;

    // 3. Tunggu video siap (videoWidth > 0, readyState >= 2)
    const video = videoRef.current;
    if (video) {
      const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
      while (
        !cancelled.v &&
        (video.readyState < 2 || video.videoWidth === 0) &&
        Date.now() < deadline
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled.v) return;
      if (video.readyState < 2 || video.videoWidth === 0) {
        setPhase('error');
        setStatus(
          `Kamera tidak mengirim gambar (readyState=${video.readyState}, ` +
          `videoWidth=${video.videoWidth}). Coba tutup tab lain yang pakai kamera.`,
        );
        return;
      }
    }

    consecutiveGoodRef.current = 0;
    challengePassedRef.current = false;
    poseStateRef.current = initialPoseState();
    challengeStartRef.current = 0;
    snapshotBase64Ref.current = null;
    if (challengeWindowRef.current) clearTimeout(challengeWindowRef.current);
    setPhase('camera');
    setStatus(`Pose 1/${MIN_POSES}: ${POSE_LABELS[0]}`);
    startManualTimer();
  }, [startManualTimer]);

  useEffect(() => {
    const cancelled = { v: false };
    initCamera(cancelled);
    return () => { cancelled.v = true; stopCamera(); };
  }, [initCamera, stopCamera]);

  // ── Loop deteksi ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'camera') return;
    const video = videoRef.current;
    const mod = faceModRef.current;
    const lmMod = lmModRef.current;
    if (!video || !mod) return;

    let stopped = false;

    const loop = async () => {
      if (stopped) return;
      try {
        const quality = await mod.checkQuality(video);
        
        let lmResult = null;
        if (lmMod) {
          lmResult = await lmMod.detectLiveness(video, performance.now());
        }

        // ?debug=1 — console.log ringkas per frame (nol setState, nol re-render)
        if (isDebugRef.current && quality.debugInfo) {
          const d = quality.debugInfo;
          const box = d.box ? d.box.map((n: number) => Math.round(n)).join(',') : 'null';
          const blinkL = lmResult?.blinkL.toFixed(2) ?? 'n/a';
          const blinkR = lmResult?.blinkR.toFixed(2) ?? 'n/a';
          const yaw = lmResult?.yaw.toFixed(0) ?? 'n/a';
          // eslint-disable-next-line no-console
          console.log(`[wajah] n=${d.faceCount} skor=${d.score.toFixed(3)} box=${box} det=${d.detectMs}ms be=${d.backend} bL=${blinkL} bR=${blinkR} yaw=${yaw}°`);
        }

        const idx = embeddings.length;
        const role = roleForPose(idx);
        // Bug2: pose turn → gerbang longgar (cukup lmResult ada). Depan → gerbang penuh.
        // Bug4: lmResult null → skip frame, jangan pernah gagal/reset.
        const gateOk = lmResult === null ? false : (role === 'depan' ? quality.ok : true);

        if (lmResult === null) {
          // Bug4: frame n/a → lewati, jangan sentuh counter/tantangan
        } else if (gateOk) {
          consecutiveGoodRef.current++;
          if (consecutiveGoodRef.current >= STABLE_FRAMES_NEEDED) {
            const elapsed = challengePassedRef.current
              ? performance.now() - challengeStartRef.current
              : 0;

            if (!challengePassedRef.current) {
              // ── Fase tantangan pose via state machine murni ────────────────
              const { state: next, decision } = reducePose(poseStateRef.current, {
                lm: lmResult,
                qualityOk: quality.ok,
                poseElapsedMs: elapsed,
                captureResult: null,
              });
              poseStateRef.current = next;

              if (decision.kind === 'wait') {
                setStatus(decision.hint);
              } else if (decision.kind === 'challenge-passed') {
                challengePassedRef.current = true;
                challengeStartRef.current = performance.now();
                if (challengeWindowRef.current) clearTimeout(challengeWindowRef.current);
                challengeWindowRef.current = setTimeout(() => {
                  // Bug1: reset HANYA saat jendela 3 detik habis
                  challengePassedRef.current = false;
                  consecutiveGoodRef.current = 0;
                  poseStateRef.current = { ...poseStateRef.current, challengePassed: false };
                }, POSE_WINDOW_MS);
                setStatus(decision.hint);
              }
              // decision.kind === 'skip' → diam (frame n/a di tengah)
            } else {
              // ── Jendela pose terbuka — ambil embedding ─────────────────────
              if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
              setShowManualBtn(false);
              setStatus('✓ Memotret…');

              let det: import('../../lib/faceHuman').FaceDetection | null = null;
              let captureResult: 'success' | 'fail' = 'fail';
              try {
                det = await mod.detectEmbedding(video);
                captureResult = det ? 'success' : 'fail';
              } catch (err: unknown) {
                setStatus(
                  err instanceof Error
                    ? err.message
                    : `Gagal ambil embedding: ${String(err)}`,
                );
                // Bug1: JANGAN reset challengePassed — coba frame berikutnya
                captureResult = 'fail';
              }

              if (det) {
                // F3b: tangkap snapshot saat pose Depan (idx 0) berhasil — untuk kartu validasi admin
                if (idx === 0) {
                  snapshotBase64Ref.current = captureSnapshot();
                }
                // Capture berhasil → advance pose (reset challenge untuk pose berikutnya)
                consecutiveGoodRef.current = 0;
                challengePassedRef.current = false;
                if (challengeWindowRef.current) clearTimeout(challengeWindowRef.current);
                setEmbeddings((prev) => {
                  const nextEmb = [...prev, det!.embedding];
                  const newIdx = nextEmb.length;
                  if (newIdx < MIN_POSES) {
                    poseStateRef.current = {
                      poseIndex: newIdx,
                      challengePassed: false,
                      challengeSign: 0,
                    };
                    setStatus(`Pose ${newIdx + 1}/${MIN_POSES}: ${POSE_LABELS[newIdx] ?? 'Pose selanjutnya'}`);
                    startManualTimer();
                  } else {
                    stopped = true;
                    stopCamera();
                    setPhase('done');
                    setStatus(`${nextEmb.length} pose berhasil ditangkap`);
                  }
                  return nextEmb;
                });
              }
              // Bug1: det null / throw → skip, jangan reset (jendela masih terbuka)
            }
          } else {
            setStatus(`Tahan… (${consecutiveGoodRef.current}/${STABLE_FRAMES_NEEDED})`);
          }
        } else {
          consecutiveGoodRef.current = 0;
          setStatus(quality.reason ?? 'Posisikan wajah di tengah');
        }
      } catch (err: unknown) {
        consecutiveGoodRef.current = 0;
        setStatus(`Error deteksi: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!stopped) animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, stopCamera, startManualTimer]);

  const handleManualCapture = async () => {
    const video = videoRef.current;
    const mod = faceModRef.current;
    if (!video || !mod) return;
    setShowManualBtn(false);
    setStatus('Memotret…');
    try {
      const det = await mod.detectEmbedding(video);
      if (det) {
        setEmbeddings((prev) => {
          const next = [...prev, det!.embedding];
          const idx = next.length;
          if (idx < MIN_POSES) {
            setStatus(`Pose ${idx + 1}/${MIN_POSES}: ${POSE_LABELS[idx] ?? 'Bergerak sedikit'}`);
            startManualTimer();
          } else {
            stopCamera();
            setPhase('done');
            setStatus(`${next.length} pose berhasil ditangkap`);
          }
          return next;
        });
      } else {
        setStatus('Wajah tidak terdeteksi — pastikan wajah terlihat jelas, lalu coba lagi');
        startManualTimer();
      }
    } catch (err: unknown) {
      // Tampilkan error nyata — JANGAN bisu
      setStatus(`Gagal memotret: ${err instanceof Error ? err.message : String(err)}`);
      startManualTimer();
    }
  };

  const handleSave = async () => {
    if (embeddings.length < MIN_POSES) return;
    setSaving(true);
    try {
      await api.guruPutWajah({
        embeddings,
        snapshotBase64: snapshotBase64Ref.current ?? undefined,
      });
      show('success', 'Data wajah berhasil didaftarkan. Menunggu validasi admin.');
      navigate('/guru/wajah');
    } catch (err: unknown) {
      show('error', err instanceof Error ? err.message : 'Gagal menyimpan data wajah');
    } finally {
      setSaving(false);
    }
  };

  /** F3b — Tangkap snapshot frame video → canvas → JPEG base64 (sisi panjang ±320px, q0.7). */
  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const MAX = 320;
    const scale = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const handleRetry = () => {
    setEmbeddings([]);
    setShowManualBtn(false);
    consecutiveGoodRef.current = 0;
    challengePassedRef.current = false;
    poseStateRef.current = initialPoseState();
    challengeStartRef.current = 0;
    snapshotBase64Ref.current = null;
    if (challengeWindowRef.current) clearTimeout(challengeWindowRef.current);
    stopCamera();
    const cancelled = { v: false };
    initCamera(cancelled);
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col" style={{ touchAction: 'none' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white z-10 shrink-0">
        <button
          id="btn-kembali-enroll"
          onClick={() => { stopCamera(); navigate('/guru/wajah'); }}
          className="flex items-center gap-1.5 text-sm text-white/70 active:text-white"
        >
          <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
          Kembali
        </button>
        <span className="font-semibold text-sm">Daftar Wajah Saya</span>
        {backendLabel ? (
          <span className="text-[10px] text-white/30 font-mono">{backendLabel}</span>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Titik progres pose */}
      <div className="flex gap-3 justify-center py-3 bg-black/60 shrink-0 z-10">
        {POSE_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className={[
              'w-3 h-3 rounded-full transition-all duration-300',
              i < embeddings.length
                ? 'bg-green-400 scale-110'
                : i === embeddings.length
                ? 'bg-white/50 animate-pulse'
                : 'bg-white/20',
            ].join(' ')} />
            <span className="text-[10px] text-white/50">{label}</span>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">

        {/* Video — selalu dirender agar stream tidak putus */}
        <video
          ref={videoRef}
          id="guru-enroll-video"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* ── LOADING ── */}
        {phase === 'loading' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8">
            {!loadError ? (
              <>
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-sm text-white/70 mb-1">
                    <span>{loadLabel}</span>
                    <span>{loadPct}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all duration-300"
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-white/30 text-center">Model dimuat lokal — tidak butuh internet</p>
              </>
            ) : (
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-red-400 mb-3 block">error</span>
                <p className="text-sm text-white/80 mb-1 font-semibold">Gagal Memuat Model</p>
                <p className="text-xs text-white/60 mb-4 max-w-xs leading-relaxed">{status}</p>
                <button
                  id="btn-retry-model-enroll"
                  onClick={handleRetry}
                  className="rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white active:bg-green-600"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── KAMERA DENIED ── */}
        {phase === 'denied' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-6xl text-red-400">no_photography</span>
            <h2 className="font-semibold text-white text-lg">Izin Kamera Ditolak</h2>
            <p className="text-sm text-white/70">
              Buka pengaturan browser → izinkan akses kamera → muat ulang halaman.
            </p>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white">
              Muat Ulang
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="material-symbols-outlined text-5xl text-red-400">error</span>
            <p className="text-sm text-red-300 font-semibold mb-1">Terjadi Kesalahan</p>
            <p className="text-xs text-white/70 max-w-xs leading-relaxed">{status}</p>
            <button id="btn-retry-enroll" onClick={handleRetry} className="rounded-xl bg-white/20 px-6 py-3 text-sm font-medium text-white">
              Coba Lagi
            </button>
          </div>
        )}

        {/* ── KAMERA AKTIF ── */}
        {phase === 'camera' && (
          <>
            {/* Oval panduan */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-52 h-72 rounded-full border-2 border-white/50 pointer-events-none z-10" />

            {/* Status */}
            <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
              <div className="bg-black/65 text-white text-sm px-5 py-2.5 rounded-full max-w-[88%] text-center leading-snug">
                {status}
              </div>
            </div>

            {/* Tombol Ambil Foto manual */}
            {showManualBtn && (
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                <button
                  id="btn-ambil-foto-manual"
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

        {/* ── SELESAI ── */}
        {phase === 'done' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="material-symbols-outlined text-6xl text-green-400">check_circle</span>
            <div>
              <h3 className="font-semibold text-white text-xl mb-1">{embeddings.length} pose ditangkap</h3>
              <p className="text-sm text-white/60">Simpan untuk menyelesaikan pendaftaran wajah Anda.</p>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <button
                id="btn-ulangi-enroll"
                onClick={handleRetry}
                className="flex-1 rounded-xl border border-white/30 text-white text-sm font-medium py-3 active:bg-white/10"
              >
                Ulangi
              </button>
              <button
                id="btn-simpan-wajah-guru"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 text-white text-sm font-semibold py-3 disabled:opacity-60 active:bg-green-600"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
