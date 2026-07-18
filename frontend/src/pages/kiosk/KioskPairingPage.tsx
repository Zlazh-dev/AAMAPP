import React, { useState, useRef, useEffect } from 'react';
import { api, ApiError, setDeviceToken } from '../../api/client';

interface Props {
  onPaired: (nama: string) => void;
}

/**
 * Layar pairing kiosk — tampil saat belum ada device token.
 * User mengetik kode 6 digit yang ditampilkan admin → token tersimpan.
 */
export function KioskPairingPage({ onPaired }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError('Kode harus 6 digit.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.kioskPair(code);
      setDeviceToken(res.deviceToken, res.nama);
      onPaired(res.nama);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.body?.message || 'Kode salah atau kedaluwarsa.');
      } else {
        setError('Tidak dapat terhubung ke server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#0f172a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 20, padding: '48px 56px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)', maxWidth: 440, width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo area */}
        <div style={{ marginBottom: 32 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#22c55e' }}>
            linked_services
          </span>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: '12px 0 4px' }}>
            Kiosk Presensi
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Masukkan kode pairing 6 digit dari admin
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            id="kiosk-pairing-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(null); }}
            placeholder="_ _ _ _ _ _"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 40, fontWeight: 700, letterSpacing: 16,
              textAlign: 'center', padding: '16px 20px',
              background: '#0f172a', border: `2px solid ${error ? '#ef4444' : '#334155'}`,
              borderRadius: 12, color: '#f1f5f9', outline: 'none',
              fontFamily: 'monospace', transition: 'border-color .2s',
            }}
            disabled={loading}
          />

          {error && (
            <p style={{ color: '#ef4444', marginTop: 12, fontSize: 14 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              marginTop: 24, width: '100%', padding: '14px 0',
              background: code.length === 6 && !loading ? '#22c55e' : '#334155',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Menghubungkan…' : 'Hubungkan Perangkat'}
          </button>
        </form>
      </div>
    </div>
  );
}
