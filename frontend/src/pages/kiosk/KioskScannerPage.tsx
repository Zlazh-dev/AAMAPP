import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api, ApiError, clearDeviceToken, getDeviceNama } from '../../api/client';

// faceHuman dynamic import (§12.15 — dilarang di bundle utama)
type FaceDetectFn = (video: HTMLVideoElement) => Promise<{ embedding: number[]; score: number; ok: boolean } | null>;

interface MatchResult {
  guruNama: string;
  status: 'HADIR' | 'TERLAMBAT';
  jam: string;
}

type ScanState =
  | { type: 'idle' }
  | { type: 'scanning' }
  | { type: 'match'; result: MatchResult }
  | { type: 'no_match'; attempt: number }   // attempt: 1..3
  | { type: 'manual_nip' }
  | { type: 'pending_verifikasi'; nama?: string }
  | { type: 'sudah_tercatat'; jam: string }
  | { type: 'error_cam' };

/** Format jam WIB dari Date */
function jamWIB(d: Date): string {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
}

/** Format tanggal WIB besar */
function tanggalWIB(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

/**
 * Layar scanner kiosk fullscreen.
 * Auto-capture wajah → kioskScan → kartu hasil.
 * 3× gagal → input manual NIP.
 */
export function KioskScannerPage({ onUnpair }: { onUnpair: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [now, setNow] = useState(new Date());
  const [state, setState] = useState<ScanState>({ type: 'idle' });
  const [nipInput, setNipInput] = useState('');
  const [nipLoading, setNipLoading] = useState(false);
  const [nipError, setNipError] = useState<string | null>(null);
  const [humanLoaded, setHumanLoaded] = useState(false);
  const detectFnRef = useRef<FaceDetectFn | null>(null);
  const scanningRef = useRef(false);
  const noMatchRef = useRef(0);
  const deviceNama = getDeviceNama() ?? 'Kiosk';

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Heartbeat periodik 60 s
  useEffect(() => {
    const hb = () => api.kioskHeartbeat().catch(() => {});
    hb();
    const id = setInterval(hb, 60_000);
    return () => clearInterval(id);
  }, []);

  // Start kamera
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setState({ type: 'error_cam' });
      }
    })();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Load faceHuman lazy
  useEffect(() => {
    (async () => {
      try {
        const mod = await import('../../lib/faceHuman');
        await mod.loadHuman();
        detectFnRef.current = mod.detectEmbedding as unknown as FaceDetectFn;
        setHumanLoaded(true);
      } catch {
        // fallback: pakai mock di e2e atau degrade gracefully
        setHumanLoaded(false);
      }
    })();
  }, []);

  // Auto-scan loop: tiap 1,5 detik kalau idle & human loaded
  useEffect(() => {
    if (!humanLoaded) return;
    if (state.type !== 'idle') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || !videoRef.current || scanningRef.current) return;
      if (state.type !== 'idle') return;

      scanningRef.current = true;
      setState({ type: 'scanning' });

      try {
        const det = detectFnRef.current
          ? await detectFnRef.current(videoRef.current)
          : null;

        if (!det || !det.ok) {
          // Tidak ada wajah terdeteksi — kembali idle tanpa menghitung attempt
          setState({ type: 'idle' });
          scanningRef.current = false;
          return;
        }

        const scannedAt = new Date().toISOString();
        const res = await api.kioskScan({ embedding: det.embedding, scannedAt });
        noMatchRef.current = 0;
        setState({ type: 'match', result: res });
        setTimeout(() => setState({ type: 'idle' }), 4000);
      } catch (err) {
        if (err instanceof ApiError && err.status === 200) {
          // scan ganda — body punya pesan "sudah tercatat HH:MM"
          const jam = err.body?.jam ?? '';
          setState({ type: 'sudah_tercatat', jam });
          setTimeout(() => setState({ type: 'idle' }), 3000);
        } else if (err instanceof ApiError && err.status === 409) {
          // scan ganda explicit 409
          const jam = err.body?.jam ?? '';
          setState({ type: 'sudah_tercatat', jam });
          setTimeout(() => setState({ type: 'idle' }), 3000);
        } else if (err instanceof ApiError && err.status === 404) {
          noMatchRef.current += 1;
          if (noMatchRef.current >= 3) {
            setState({ type: 'manual_nip' });
          } else {
            setState({ type: 'no_match', attempt: noMatchRef.current });
            setTimeout(() => setState({ type: 'idle' }), 2500);
          }
        } else {
          setState({ type: 'idle' });
        }
      } finally {
        scanningRef.current = false;
      }
    }, 1500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [state, humanLoaded]);

  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nipInput.trim()) return;
    setNipLoading(true);
    setNipError(null);
    try {
      await api.kioskManual({ nip: nipInput.trim(), scannedAt: new Date().toISOString() });
      noMatchRef.current = 0;
      setNipInput('');
      setState({ type: 'pending_verifikasi' });
      setTimeout(() => setState({ type: 'idle' }), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setNipError(err.body?.message || 'NIP tidak ditemukan.');
      } else {
        setNipError('Tidak dapat terhubung ke server.');
      }
    } finally {
      setNipLoading(false);
    }
  }, [nipInput]);

  const handleUnpair = () => {
    if (window.confirm('Lepas perangkat ini dari kiosk?')) {
      clearDeviceToken();
      onUnpair();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,.85) 0%, transparent 100%)',
        padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ color: '#22c55e', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>
            {deviceNama}
          </div>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{tanggalWIB(now)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#fff', fontSize: 48, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {jamWIB(now)}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>WIB</div>
        </div>
      </div>

      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />

      {/* Status overlay at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%)',
        padding: '32px 32px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        {state.type === 'idle' && (
          <div style={{ color: '#94a3b8', fontSize: 16, letterSpacing: 1 }}>
            {humanLoaded ? 'Arahkan wajah ke kamera…' : 'Memuat sistem pengenalan wajah…'}
          </div>
        )}

        {state.type === 'scanning' && (
          <div style={{ color: '#fbbf24', fontSize: 16 }}>Memindai…</div>
        )}

        {state.type === 'match' && (
          <MatchCard result={state.result} />
        )}

        {state.type === 'sudah_tercatat' && (
          <InfoCard icon="check_circle" color="#22c55e" text={`Sudah tercatat${state.jam ? ` pukul ${state.jam}` : ''}`} />
        )}

        {state.type === 'no_match' && (
          <InfoCard icon="face" color="#f59e0b"
            text={`Wajah tidak dikenali (${state.attempt}/3). Coba lagi…`} />
        )}

        {state.type === 'manual_nip' && (
          <ManualNipPanel
            nipInput={nipInput}
            setNipInput={setNipInput}
            onSubmit={handleManualSubmit}
            loading={nipLoading}
            error={nipError}
            onCancel={() => { noMatchRef.current = 0; setState({ type: 'idle' }); }}
          />
        )}

        {state.type === 'pending_verifikasi' && (
          <InfoCard icon="pending" color="#a855f7" text="Kehadiran PENDING — menunggu verifikasi admin." />
        )}

        {state.type === 'error_cam' && (
          <InfoCard icon="videocam_off" color="#ef4444" text="Kamera tidak dapat diakses. Hubungi admin." />
        )}
      </div>

      {/* Unpair button (pojok kanan bawah, kecil) */}
      <button
        onClick={handleUnpair}
        style={{
          position: 'absolute', bottom: 12, right: 16, zIndex: 20,
          background: 'transparent', border: '1px solid #475569', color: '#64748b',
          padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
        }}
      >
        Lepas Perangkat
      </button>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function MatchCard({ result }: { result: MatchResult }) {
  const isHadir = result.status === 'HADIR';
  return (
    <div style={{
      background: isHadir ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)',
      border: `2px solid ${isHadir ? '#22c55e' : '#fbbf24'}`,
      borderRadius: 16, padding: '20px 40px', textAlign: 'center', minWidth: 320,
      animation: 'slideUp .3s ease',
    }}>
      <div style={{ fontSize: 48 }}>{isHadir ? '✅' : '⏰'}</div>
      <div style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700, marginTop: 8 }}>
        {result.guruNama}
      </div>
      <div style={{
        display: 'inline-block', marginTop: 8,
        background: isHadir ? '#22c55e' : '#f59e0b',
        color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700,
      }}>
        {result.status}
      </div>
      <div style={{ color: '#94a3b8', marginTop: 6, fontSize: 15 }}>{result.jam}</div>
    </div>
  );
}

function InfoCard({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 24px',
    }}>
      <span className="material-symbols-outlined" style={{ color, fontSize: 28 }}>{icon}</span>
      <span style={{ color: '#e2e8f0', fontSize: 16 }}>{text}</span>
    </div>
  );
}

function ManualNipPanel({
  nipInput, setNipInput, onSubmit, loading, error, onCancel,
}: {
  nipInput: string;
  setNipInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
  onCancel: () => void;
}) {
  return (
    <div style={{
      background: '#1e293b', borderRadius: 16, padding: '24px 32px',
      textAlign: 'center', minWidth: 360, maxWidth: 480,
    }}>
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Wajah tidak dikenali 3×
      </div>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Masukkan NIP untuk presensi manual (perlu verifikasi admin)
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          id="kiosk-manual-nip"
          type="text"
          inputMode="numeric"
          placeholder="Nomor Induk Pegawai (NIP)"
          value={nipInput}
          onChange={e => { setNipInput(e.target.value); }}
          disabled={loading}
          autoFocus
          style={{
            padding: '12px 16px', borderRadius: 10, border: '1px solid #334155',
            background: '#0f172a', color: '#f1f5f9', fontSize: 16, outline: 'none',
          }}
        />
        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={loading}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', fontSize: 14, cursor: 'pointer',
            }}>
            Batal
          </button>
          <button type="submit" disabled={loading || !nipInput.trim()}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
              background: '#a855f7', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
            {loading ? 'Menyimpan…' : 'Kirim Kehadiran'}
          </button>
        </div>
      </form>
    </div>
  );
}
