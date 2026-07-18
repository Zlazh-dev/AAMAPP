import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../components/Toast';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';

/** Pose yang perlu dicapture */
const POSE_LABELS = ['Depan', 'Sedikit Kiri', 'Sedikit Kanan'];
const MIN_POSES = 3;
const MAX_POSES = 5;

type Phase = 'loading' | 'camera' | 'done' | 'denied' | 'error';

/**
 * GuruEnrollWizardPage — /guru/wajah/enroll
 *
 * Wizard mandiri untuk guru mendaftarkan wajah sendiri.
 * PUT /api/guru/wajah (bukan admin endpoint).
 * @vladmandic/human di-load LAZY.
 */
export function GuruEnrollWizardPage() {
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

  const faceModRef = useRef<typeof import('../../lib/faceHuman') | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('../../lib/faceHuman');
        faceModRef.current = mod;
        await mod.loadHuman();
      } catch {
        if (!cancelled) { setPhase('error'); setStatus('Gagal memuat model deteksi wajah'); }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setPhase('camera');
        setStatus(`Pose ${1}/${MIN_POSES}: ${POSE_LABELS[0]}`);
      } catch (err: unknown) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        setPhase(name === 'NotAllowedError' ? 'denied' : 'error');
        setStatus('Kamera tidak dapat diakses');
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [stopCamera]);

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
          consecutiveGoodRef.current++;
          setStatus(consecutiveGoodRef.current >= 3 ? '✓ Memotret…' : `Tahan… (${consecutiveGoodRef.current}/3)`);
          if (consecutiveGoodRef.current >= 3) {
            const det = await mod.detectEmbedding(video);
            if (det) {
              consecutiveGoodRef.current = 0;
              setEmbeddings((prev) => {
                const next = [...prev, det.embedding];
                const idx = next.length;
                if (idx < MAX_POSES && idx < POSE_LABELS.length) {
                  setCurrentPose(idx);
                  setStatus(`Pose ${idx + 1}/${MIN_POSES}: ${POSE_LABELS[idx] ?? 'Ekstra'}`);
                } else if (idx >= MIN_POSES) {
                  stopped = true;
                  stopCamera();
                  setPhase('done');
                  setStatus(`${next.length} pose ditangkap`);
                }
                return next;
              });
            }
          }
        } else {
          consecutiveGoodRef.current = 0;
          setStatus(quality.reason ?? 'Posisikan wajah di tengah');
        }
      } catch { /* continue */ }
      if (!stopped) animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { stopped = true; cancelAnimationFrame(animFrameRef.current); };
  }, [phase, stopCamera]);

  const handleSave = async () => {
    if (embeddings.length < MIN_POSES) return;
    setSaving(true);
    try {
      await api.guruPutWajah({ embeddings });
      show('success', 'Data wajah berhasil didaftarkan');
      navigate('/guru/wajah');
    } catch (err: unknown) {
      show('error', err instanceof Error ? err.message : 'Gagal menyimpan data wajah');
    } finally {
      setSaving(false);
    }
  };

  if (phase === 'denied') return (
    <PageContainer size="sm">
      <Card icon="no_photography" className="p-6 text-center">
        <h2 className="font-heading font-semibold text-aam-text mb-2">Izin Kamera Ditolak</h2>
        <p className="text-sm text-aam-text-muted mb-4">Izinkan akses kamera di pengaturan browser, lalu muat ulang.</p>
        <button onClick={() => window.location.reload()} className="rounded-md bg-aam-green px-4 py-2 text-sm font-medium text-white">Muat Ulang</button>
      </Card>
    </PageContainer>
  );

  if (phase === 'error') return (
    <PageContainer size="sm">
      <Card icon="error" className="p-6 text-center">
        <h2 className="font-heading font-semibold text-aam-text mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-aam-text-muted">{status}</p>
      </Card>
    </PageContainer>
  );

  return (
    <PageContainer size="sm">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => { stopCamera(); navigate('/guru/wajah'); }} className="flex items-center gap-1 text-sm text-aam-text-muted hover:text-aam-green">
          <span className="material-symbols-outlined text-base">arrow_back</span> Kembali
        </button>
        <h2 className="font-heading font-semibold text-aam-text">Daftar Wajah Saya</h2>
      </div>

      <div className="mb-4 flex gap-2">
        {POSE_LABELS.map((label, i) => (
          <div key={label} className="flex-1 text-center">
            <div className={['h-2 rounded-full mb-1', i < embeddings.length ? 'bg-aam-green' : i === currentPose ? 'bg-aam-green/40 animate-pulse' : 'bg-aam-border'].join(' ')} />
            <span className="text-[10px] text-aam-text-muted">{label}</span>
          </div>
        ))}
      </div>

      {phase !== 'done' ? (
        <Card icon="face" className="overflow-hidden">
          <div className="relative bg-black aspect-video">
            <video ref={videoRef} id="guru-enroll-video" className="w-full h-full object-cover" playsInline muted style={{ transform: 'scaleX(-1)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-52 rounded-full border-2 border-white/60" />
              <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-full z-10">
                {phase === 'loading' ? <span className="flex items-center gap-2"><span className="material-symbols-outlined text-base animate-spin">autorenew</span>{status}</span> : status}
              </div>
            </div>
          </div>
          <div className="p-4 text-center text-xs text-aam-text-muted">Sistem memotret otomatis saat wajah terdeteksi stabil. Pose yang ditangkap: {embeddings.length}/{MIN_POSES}–{MAX_POSES}</div>
        </Card>
      ) : (
        <Card icon="check_circle" className="p-6 text-center">
          <span className="material-symbols-outlined text-5xl text-aam-green mb-2 block">check_circle</span>
          <h3 className="font-heading font-semibold text-aam-text mb-1">{embeddings.length} pose berhasil ditangkap</h3>
          <p className="text-sm text-aam-text-muted mb-4">Simpan untuk mendaftarkan data wajah Anda.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setEmbeddings([]); setCurrentPose(0); consecutiveGoodRef.current = 0; window.location.reload(); }} className="rounded-md border border-aam-border px-4 py-2 text-sm font-medium text-aam-text">Ulangi</button>
            <button id="btn-simpan-wajah-guru" onClick={handleSave} disabled={saving} className="rounded-md bg-aam-green px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
