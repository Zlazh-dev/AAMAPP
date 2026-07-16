import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge, roleLabel } from '../../components/Badge';

const ROLE_OPTIONS = [
  { code: 'guru', label: 'Guru', icon: 'school', desc: 'Mengajar & presensi' },
  { code: 'kurikulum', label: 'Staf Kurikulum', icon: 'menu_book', desc: 'Jadwal & penugasan' },
  { code: 'kesiswaan', label: 'Staf Kesiswaan', icon: 'gavel', desc: 'Tata tertib & demerit' },
  { code: 'tu', label: 'Staf TU', icon: 'description', desc: 'Rekap presensi guru' },
  { code: 'kepsek', label: 'Kepala Sekolah', icon: 'admin_panel_settings', desc: 'Monitor & approve' },
];

export function DaftarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [credential, setCredential] = useState('');
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check for pre-carried credential from login
  useEffect(() => {
    const carried = sessionStorage.getItem('aamapp_google_credential');
    if (carried) {
      setCredential(carried);
      sessionStorage.removeItem('aamapp_google_credential');
      // Decode basic info from JWT
      try {
        const payload = JSON.parse(atob(carried.split('.')[1]));
        setGoogleUser({
          name: payload.name || payload.email,
          email: payload.email,
          picture: payload.picture,
        });
        setStep(2);
      } catch {
        // invalid token — start from step 1
      }
    }
  }, []);

  // Fetch Google config
  useEffect(() => {
    api.getAuthConfig().then((c) => {
      setGoogleClientId(c.googleClientId);
      if (c.googleClientId) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }).catch(() => {});
  }, []);

  // Initialize Google button
  useEffect(() => {
    if (!googleClientId || step !== 1) return;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-daftar-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            locale: 'id',
          },
        );
      }
    }, 200);
    return () => clearInterval(timer);
  }, [googleClientId, step]);

  const handleGoogleCredential = async (response: any) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      setCredential(response.credential);
      setGoogleUser({
        name: payload.name || payload.email,
        email: payload.email,
        picture: payload.picture,
      });
      setStep(2);
    } catch {
      setError('Token Google tidak valid');
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSubmit = async () => {
    if (!consent) {
      setError('Anda harus menyetujui pencatatan informasi perangkat');
      return;
    }
    if (selectedRoles.length === 0) {
      setError('Minimal pilih satu peran yang diajukan');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.registerGoogle(credential, selectedRoles, note || null, true);
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Akun sudah terdaftar — silakan masuk');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        setError(err.body?.message || 'Pendaftaran gagal');
      } else {
        setError('Tidak dapat terhubung ke server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-aam-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-aam-green flex items-center justify-center">
            <span className="material-symbols-outlined text-white">school</span>
          </div>
          <div>
            <p className="font-heading font-bold text-aam-text">AAMAPP</p>
            <p className="text-xs text-aam-text-muted">SMP IT Asy-Syadzili</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center mb-6">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  s <= step ? 'bg-aam-green text-white' : 'bg-gray-200 text-gray-400',
                ].join(' ')}
              >
                {s < step ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check</span>
                ) : s}
              </div>
              {s < 3 && (
                <div className={[
                  'w-12 h-0.5 transition-colors',
                  s < step ? 'bg-aam-green' : 'bg-gray-200',
                ].join(' ')} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card icon="person_add" className="p-6 md:p-8">
          {/* Step 1: Google Account */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-heading font-semibold text-aam-text mb-2">
                Daftar Akses AAMAPP
              </h2>
              <p className="text-sm text-aam-text-muted mb-6">
                Pilih akun Google untuk memulai pendaftaran
              </p>

              {googleClientId ? (
                <div className="flex flex-col items-center">
                  <div id="google-daftar-btn" />
                </div>
              ) : (
                <div className="rounded-md bg-gray-50 border border-aam-border p-4 text-center">
                  <span className="material-symbols-outlined text-aam-text-muted">lock</span>
                  <p className="mt-2 text-sm text-aam-text-muted">
                    Pendaftaran belum dibuka — hubungi admin sekolah
                  </p>
                </div>
              )}

              <p className="mt-6 text-center text-sm text-aam-text-muted">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-aam-green font-medium hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </div>
          )}

          {/* Step 2: Consent + Role Selection */}
          {step === 2 && googleUser && (
            <div>
              <h2 className="text-xl font-heading font-semibold text-aam-text mb-2">
                Konfirmasi &amp; Peran
              </h2>
              <p className="text-sm text-aam-text-muted mb-4">
                Lengkapi pendaftaran Anda
              </p>

              {/* Identity card */}
              <div className="flex items-center gap-3 rounded-md border border-aam-border p-3 mb-4">
                {googleUser.picture ? (
                  <img
                    src={googleUser.picture}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-aam-green flex items-center justify-center text-white font-medium">
                    {googleUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-aam-text truncate">{googleUser.name}</p>
                  <p className="text-xs text-aam-text-muted truncate">{googleUser.email}</p>
                </div>
              </div>

              {/* Consent panel */}
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 mb-4">
                <p className="text-sm text-yellow-900 mb-2">
                  AAMAPP akan mencatat informasi perangkat (browser &amp; sistem
                  operasi), alamat IP, dan waktu akses untuk keamanan sesi.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-aam-green focus:ring-aam-green/30"
                  />
                  <span className="text-sm text-yellow-900">
                    Saya menyetujui pencatatan informasi tersebut
                  </span>
                </label>
              </div>

              {/* Role selection */}
              <div className="mb-4">
                <p className="text-sm font-medium text-aam-text mb-2">
                  Peran yang diajukan
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const selected = selectedRoles.includes(role.code);
                    return (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => toggleRole(role.code)}
                        className={[
                          'flex items-center gap-3 rounded-md border p-3 transition-colors text-left',
                          selected
                            ? 'border-aam-green bg-green-50'
                            : 'border-aam-border hover:border-gray-300',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'material-symbols-outlined flex-shrink-0',
                            selected ? 'text-aam-green' : 'text-aam-text-muted',
                          ].join(' ')}
                          style={{ fontSize: '1.25rem' }}
                        >
                          {role.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-aam-text">{role.label}</p>
                          <p className="text-xs text-aam-text-muted">{role.desc}</p>
                        </div>
                        {selected && (
                          <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-aam-text mb-1.5">
                  Keterangan (opsional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 resize-none"
                  placeholder="mis. Guru Matematika kelas 7"
                />
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={!consent || selectedRoles.length === 0}
                size="lg"
                className="w-full"
              >
                Kirim Pendaftaran
              </Button>

              <button
                onClick={() => navigate('/login')}
                className="mt-3 w-full text-center text-sm text-aam-text-muted hover:text-aam-text"
              >
                Batal
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '2.5rem' }}>
                  check_circle
                </span>
              </div>
              <h2 className="mt-4 text-xl font-heading font-semibold text-aam-text">
                Pendaftaran terkirim
              </h2>
              <p className="mt-2 text-sm text-aam-text-muted">
                Akun Anda menunggu persetujuan admin.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {selectedRoles.map((r) => (
                  <Badge key={r} variant="gray">{roleLabel(r)}</Badge>
                ))}
              </div>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 text-sm text-aam-green font-medium hover:underline"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>arrow_back</span>
                Kembali ke Halaman Masuk
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
