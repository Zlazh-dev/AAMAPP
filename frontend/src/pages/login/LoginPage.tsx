import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, setToken, setReturnTo } from '../../api/client';
import { useAuth } from '../../app/AuthContext';
import { getHomePath } from '../../app/menu';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pendingInfo, setPendingInfo] = useState('');
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const googleScriptRef = useRef<HTMLScriptElement | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(getHomePath(user), { replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch Google config
  useEffect(() => {
    api.getAuthConfig().then((c) => {
      setGoogleClientId(c.googleClientId);
      if (c.googleClientId) {
        // Load GIS script
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
        googleScriptRef.current = script;
      }
    }).catch(() => {});
  }, []);

  // Initialize Google button when client ID is available
  useEffect(() => {
    if (!googleClientId) return;
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'continue_with',
            locale: 'id',
          },
        );
      }
    };
    // Wait for script to load
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        initGoogle();
      }
    }, 200);
    return () => clearInterval(timer);
  }, [googleClientId]);

  const handleGoogleCredential = async (response: any) => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await api.loginGoogle(response.credential);
      login(result.accessToken, result.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404 && err.body?.unregistered) {
          // Redirect to daftar step 2 with credential
          sessionStorage.setItem('aamapp_google_credential', response.credential);
          navigate('/daftar');
          return;
        }
        if (err.status === 403 && err.body?.pending) {
          setPendingInfo(err.body.message || 'Akun menunggu persetujuan admin.');
          return;
        }
        setError(err.body?.message || 'Login Google gagal');
      } else {
        setError('Tidak dapat terhubung ke server');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingInfo('');
    setSubmitLoading(true);
    try {
      const result = await api.login(email, password);
      login(result.accessToken, result.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.body?.pending) {
          setPendingInfo(err.body.message || 'Akun menunggu persetujuan admin.');
        } else {
          setError(err.body?.message || 'Login gagal');
        }
      } else {
        setError('Tidak dapat terhubung ke server');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="hidden md:flex md:w-2/5 bg-aam-sidebar relative overflow-hidden flex-col justify-center px-12">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-aam-green flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '1.5rem' }}>
                school
              </span>
            </div>
            <div>
              <p className="font-heading font-bold text-white text-xl">AAMAPP</p>
              <p className="text-sm text-white/50">SMP IT Asy-Syadzili</p>
            </div>
          </div>
          <h1 className="font-heading font-semibold text-white text-3xl leading-tight">
            Ekosistem Sekolah
          </h1>
          <p className="mt-3 text-white/60 text-sm max-w-sm">
            Presensi • Kurikulum • Kesiswaan • Administrasi — dalam satu aplikasi.
          </p>
        </div>
        {/* Watermark */}
        <span
          className="material-symbols-outlined absolute bottom-[-40px] right-[-40px] text-white"
          style={{ fontSize: '300px', transform: 'rotate(-15deg)', opacity: 0.04 }}
          aria-hidden="true"
        >
          school
        </span>
      </div>

      {/* Right form area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:px-8 bg-aam-page">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-aam-green flex items-center justify-center">
              <span className="material-symbols-outlined text-white">school</span>
            </div>
            <div>
              <p className="font-heading font-bold text-aam-text">AAMAPP</p>
              <p className="text-xs text-aam-text-muted">SMP IT Asy-Syadzili</p>
            </div>
          </div>

          <Card icon="lock" className="p-6 md:p-8">
            <h2 className="text-xl font-heading font-semibold text-aam-text mb-1">
              Masuk
            </h2>
            <p className="text-sm text-aam-text-muted mb-6">
              Gunakan akun yang terdaftar
            </p>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>error</span>
                {error}
              </div>
            )}

            {pendingInfo && (
              <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800 flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>hourglass_empty</span>
                {pendingInfo}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-aam-text mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                  placeholder="nama@sekolah.sch.id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-aam-text mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-md border border-aam-border px-3 py-2.5 pr-10 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-aam-text-muted hover:text-aam-text"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={submitLoading}
                className="w-full"
              >
                Masuk
              </Button>
            </form>

            {googleClientId && (
              <>
                <div className="my-4 flex items-center gap-3">
                  <div className="flex-1 h-px bg-aam-border" />
                  <span className="text-xs text-aam-text-muted">atau</span>
                  <div className="flex-1 h-px bg-aam-border" />
                </div>
                <div className="flex flex-col items-center">
                  {googleLoading && (
                    <div className="flex items-center gap-2 text-sm text-aam-text-muted">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1.125rem' }}>
                        progress_activity
                      </span>
                      Memverifikasi...
                    </div>
                  )}
                  <div id="google-login-btn" style={{ display: googleLoading ? 'none' : 'block' }} />
                </div>
              </>
            )}

            <p className="mt-6 text-center text-sm text-aam-text-muted">
              Belum punya akses?{' '}
              <Link to="/daftar" className="text-aam-green font-medium hover:underline">
                Daftar di sini
              </Link>
            </p>

            <p className="mt-3 text-center text-xs text-aam-text-muted">
              Dengan masuk, aktivitas &amp; perangkat Anda tercatat untuk keamanan.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
