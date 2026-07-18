import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { useToast } from '../../../components/Toast';

/** Pose yang perlu dicapture — auto-capture saat wajah terdeteksi stabil. */
const POSE_LABELS = ['Depan', 'Sedikit Kiri', 'Sedikit Kanan'];
const MIN_POSES = 3;
const MAX_POSES = 5;
const QUALITY_FRAMES = 3; // frame berurutan berkualitas sebelum auto-capture

type Phase = 'loading' | 'camera' | 'done' | 'denied' | 'error';

/**
 * EnrollWizardPage — /admin/wajah/:guruId
 *
 * Auto-capture 3–5 pose wajah guru tanpa klik jepret. Setelah semua
 * pose terkumpul, kirim ke PUT /api/admin/wajah/:guruId.
 *
 * @vladmandic/human di-load secara LAZY (dynamic import via faceHuman.ts)
 * — tidak pernah masuk bundle utama (§12.15).
 */
export function EnrollWizardPage() {
  const { guruId } = useParams<{ guruId: string }>();
  const navigate = useNavigate();
  const { show } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const consecutiveGoodRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<string>('Memuat model wajah…');
  const [currentPose, setCurrentPose] = useState(0);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [saving, setSaving] = useState(false);
  const [guruNama, setGuruNama] = useState<string>('');

  // Lazily imported face module — stored in ref to avoid re-import
  const faceModRef = useRef<typeof import('../../../lib/faceHuman') | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load guru info
      try {
        const guruData = await api.adminGetGuruById(Number(guruId));
        if (!cancelled) setGuruNama(guruData.nama);
      } catch {
        // non-fatal
      }

      // Dynamic import @vladmandic/human
      try {
        const mod = await import('../../../lib/faceHuman');
        faceModRef.current = mod;
        await mod.loadHuman();
      } catch {
        if (!cancelled) {
          setPhase('error');
          setStatus('Gagal memuat model deteksi wajah');
          return;
        }
      }

      // Start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('camera');
        setStatus(`Pose ${1}/${MIN_POSES}: ${POSE_LABELS[0]}`);
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPhase('denied');
        } else {
          setPhase('error');
          setStatus('Kamera tidak dapat diakses');
        }
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [guruId, stopCamera]);

  // Detection loop — runs after camera is ready
  useEffect(() => {
    if (phase !== 'camera') return;
    const video = videoRef.current;
    const mod = faceModRef.current;
    if (!video || !mod) return;

    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      try {
        const quality = await mod.checkQuality(video);
        if (quality.ok) {
          consecutiveGoodRef.current += 1;
          setStatus(
            consecutiveGoodRef.current >= QUALITY_FRAMES
              ? '✓ Memotret…'
              : `Tahan… (${consecutiveGoodRef.current}/${QUALITY_FRAMES})`,
          );

          if (consecutiveGoodRef.current >= QUALITY_FRAMES) {
            // Auto-capture
            const det = await mod.detectEmbedding(video);
            if (det) {
              consecutiveGoodRef.current = 0;
              setEmbeddings((prev) => {
                const next = [...prev, det.embedding];
                const poseIdx = next.length;
                if (poseIdx < MAX_POSES && poseIdx < POSE_LABELS.length) {
                  setCurrentPose(poseIdx);
                  setStatus(`Pose ${poseIdx + 1}/${MIN_POSES}: ${POSE_LABELS[poseIdx] ?? 'Ekstra'}`);
                } else if (poseIdx >= MIN_POSES) {
                  // Enough poses captured
                  stopped = true;
                  stopCamera();
                  setPhase('done');
                  setStatus(`${next.length} pose berhasil ditangkap`);
                }
                return next;
              });
            }
          }
        } else {
          consecutiveGoodRef.current = 0;
          setStatus(quality.reason ?? 'Posisikan wajah di tengah');
        }
      } catch {
        // frame error — continue
      }
      if (!stopped) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, stopCamera]);

  const handleSave = async () => {
    if (embeddings.length < MIN_POSES) return;
    setSaving(true);
    try {
      await api.adminPutWajah(Number(guruId), { embeddings });
      show('success', `Data wajah ${guruNama || 'guru'} berhasil disimpan`);
      navigate('/admin/wajah');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data wajah';
      show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  if (phase === 'denied') {
    return (
      <PageContainer size="sm">
        <Card icon="no_photography" className="p-6 text-center">
          <h2 className="font-heading font-semibold text-aam-text mb-2">Izin Kamera Ditolak</h2>
          <p className="text-sm text-aam-text-muted mb-4">
            Enrollment wajah membutuhkan akses kamera. Buka pengaturan browser Anda, izinkan akses
            kamera untuk situs ini, lalu muat ulang halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-aam-green px-4 py-2 text-sm font-medium text-white hover:bg-aam-green/90"
          >
            Muat Ulang
          </button>
        </Card>
      </PageContainer>
    );
  }

  if (phase === 'error') {
    return (
      <PageContainer size="sm">
        <Card icon="error" className="p-6 text-center">
          <h2 className="font-heading font-semibold text-aam-text mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm text-aam-text-muted">{status}</p>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => { stopCamera(); navigate('/admin/wajah'); }}
          className="flex items-center gap-1 text-sm text-aam-text-muted hover:text-aam-green"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Kembali
        </button>
        <h2 className="font-heading font-semibold text-aam-text">
          Daftar Wajah — {guruNama || `Guru #${guruId}`}
        </h2>
      </div>

      {/* Progress poses */}
      <div className="mb-4 flex gap-2">
        {POSE_LABELS.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div
              className={[
                'h-2 rounded-full mb-1',
                i < embeddings.length
                  ? 'bg-aam-green'
                  : i === currentPose
                  ? 'bg-aam-green/40 animate-pulse'
                  : 'bg-aam-border',
              ].join(' ')}
            />
            <span className="text-[10px] text-aam-text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Camera or done state */}
      {phase !== 'done' ? (
        <Card icon="face" className="overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              id="enroll-video"
              className="w-full h-full object-cover mirror"
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Overlay guide */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
              {/* Face oval guide */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-52 rounded-full border-2 border-white/60" />
              <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-full z-10">
                {phase === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base animate-spin">autorenew</span>
                    {status}
                  </span>
                ) : (
                  status
                )}
              </div>
            </div>
          </div>
          <div className="p-4 text-center text-xs text-aam-text-muted">
            Sistem akan memotret otomatis saat wajah Anda terdeteksi stabil.
            Tidak perlu menekan tombol.
          </div>
        </Card>
      ) : (
        <Card icon="check_circle" className="p-6 text-center">
          <div className="text-aam-green text-5xl mb-2">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <h3 className="font-heading font-semibold text-aam-text mb-1">
            {embeddings.length} pose berhasil ditangkap
          </h3>
          <p className="text-sm text-aam-text-muted mb-4">
            Klik Simpan untuk mendaftarkan data wajah, atau Ulangi untuk mengambil ulang.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setEmbeddings([]);
                setCurrentPose(0);
                consecutiveGoodRef.current = 0;
                setPhase('loading');
                window.location.reload(); // re-trigger camera flow
              }}
              className="rounded-md border border-aam-border px-4 py-2 text-sm font-medium text-aam-text hover:border-aam-green/40"
            >
              Ulangi
            </button>
            <button
              id="btn-simpan-wajah"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-aam-green px-5 py-2 text-sm font-medium text-white hover:bg-aam-green/90 disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan Data Wajah'}
            </button>
          </div>
        </Card>
      )}

      {phase === 'camera' && (
        <p className="mt-4 text-xs text-aam-text-muted text-center">
          Pose yang ditangkap: {embeddings.length}/{MIN_POSES}–{MAX_POSES}
        </p>
      )}
    </PageContainer>
  );
}
