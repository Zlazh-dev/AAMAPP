import React, { useState, useEffect } from 'react';
import { api, ApiError, SessionInfo } from '../../api/client';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../components/Toast';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge, roleLabel, roleVariant } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useUnsavedChanges } from '../../app/useUnsavedChanges';
import { PageContainer } from '../../components/PageContainer';

function timeAgo(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  if (hr < 24) return `${hr} jam lalu`;
  return `${day} hari lalu`;
}

export function ProfilPage() {
  const { user, refresh } = useAuth();
  const { show } = useToast();
  const [profile, setProfile] = useState(user);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit name
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Google link
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Session revoke
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);

  useEffect(() => {
    loadProfile();
    loadSessions();
    api.getAuthConfig().then((c) => setGoogleClientId(c.googleClientId)).catch(() => {});
  }, []);

  // Dirty when name changed from loaded value OR password fields have content
  const nameChanged = profile !== null && editName.trim() !== '' && editName !== profile.name;
  const pwDirty = currentPw.trim() !== '' || newPw.trim() !== '';
  const computedDirty = nameChanged || pwDirty;
  const { setDirty, guard } = useUnsavedChanges(false, {
    description: 'Perubahan nama atau password belum disimpan. Yakin ingin meninggalkan halaman?',
  });

  // Sync ref-based dirty tracker with computed dirty state
  useEffect(() => {
    setDirty(computedDirty);
  }, [computedDirty, setDirty]);

  const loadProfile = async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
      setEditName(p.name);
    } catch {
      // ignore
    }
  };

  const loadSessions = async () => {
    try {
      const s = await api.getOwnSessions();
      setSessions(s);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (editName.trim().length < 3) {
      show('error', 'Nama minimal 3 karakter');
      return;
    }
    setSavingName(true);
    try {
      await api.updateProfile(editName);
      await refresh();
      show('success', 'Nama berhasil diubah');
      setDirty(false);
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menyimpan');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePw = async () => {
    if (newPw.length < 8) {
      show('error', 'Password baru minimal 8 karakter');
      return;
    }
    setSavingPw(true);
    try {
      await api.changePassword(profile?.hasPassword ? currentPw : null, newPw);
      show('success', 'Password berhasil diubah. Sesi lain telah dicabut.');
      setDirty(false);
      setCurrentPw('');
      setNewPw('');
      await loadSessions();
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal mengubah password');
    } finally {
      setSavingPw(false);
    }
  };

  const handleGoogleLink = async (response: any) => {
    try {
      await api.linkGoogle(response.credential);
      await refresh();
      show('success', 'Akun Google berhasil tertaut');
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menautkan');
    }
  };

  const handleUnlinkGoogle = async () => {
    setShowUnlinkConfirm(false);
    try {
      await api.unlinkGoogle();
      await refresh();
      show('success', 'Tautan Google dilepas');
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal melepas tautan');
    }
  };

  const handleRevokeSession = async () => {
    if (!revokeTarget) return;
    try {
      await api.revokeOwnSession(revokeTarget.id);
      show('success', 'Sesi dicabut');
      setRevokeTarget(null);
      await loadSessions();
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal mencabut sesi');
    }
  };

  // Initialize Google button for linking
  useEffect(() => {
    if (!googleClientId || profile?.googleLinked) return;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLink,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-link-btn'),
          { theme: 'outline', size: 'medium', text: 'link_with', locale: 'id' },
        );
      }
    }, 200);
    return () => clearInterval(timer);
  }, [googleClientId, profile?.googleLinked]);

  if (!profile) return null;

  return (
    <PageContainer size="lg">
      <h2 className="text-lg font-heading font-semibold text-aam-text mb-4">Profil Saya</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Identity + Password */}
        <div className="space-y-4">
          {/* Identity card */}
          <Card icon="person" className="p-5">
            <h3 className="text-sm font-semibold text-aam-text mb-4">Identitas</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-aam-text-muted mb-1">Nama</label>
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                  />
                  <Button size="sm" onClick={handleSaveName} loading={savingName}>
                    Simpan
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-aam-text-muted mb-1">Email</label>
                <p className="text-sm text-aam-text px-3 py-2 bg-gray-50 rounded-md">{profile.email}</p>
              </div>
              <div>
                <label className="block text-xs text-aam-text-muted mb-1">Peran</label>
                <div className="flex flex-wrap gap-1.5">
                  {profile.roles.map((r) => (
                    <Badge key={r} variant={roleVariant(r)}>{roleLabel(r)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Password card */}
          <Card icon="lock" className="p-5">
            <h3 className="text-sm font-semibold text-aam-text mb-4">
              {profile.hasPassword ? 'Ganti Password' : 'Buat Password'}
            </h3>
            {profile.hasPassword && (
              <div className="mb-3">
                <label className="block text-xs text-aam-text-muted mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                  placeholder="••••••••"
                />
              </div>
            )}
            <div className="mb-3">
              <label className="block text-xs text-aam-text-muted mb-1">Password Baru</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <Button onClick={handleChangePw} loading={savingPw} size="sm" disabled={newPw.length < 8}>
              {profile.hasPassword ? 'Ubah Password' : 'Buat Password'}
            </Button>
            {!profile.hasPassword && (
              <p className="mt-2 text-xs text-aam-text-muted">
                Diperlukan untuk melepas tautan Google di kemudian hari.
              </p>
            )}
          </Card>
        </div>

        {/* Right column: Google + Sessions */}
        <div className="space-y-4">
          {/* Google account card */}
          <Card icon="account_circle" className="p-5">
            <h3 className="text-sm font-semibold text-aam-text mb-4">Akun Google</h3>
            {profile.googleLinked ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="green">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>link</span>
                    Tertaut
                  </Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUnlinkConfirm(true)}
                  disabled={!profile.hasPassword}
                  title={!profile.hasPassword ? 'Buat password terlebih dahulu untuk melepas tautan' : ''}
                >
                  Lepas Tautan
                </Button>
                {!profile.hasPassword && (
                  <p className="mt-2 text-xs text-aam-text-muted">
                    Buat password terlebih dahulu untuk melepas tautan Google.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-aam-text-muted mb-3">Akun Google belum tertaut</p>
                {googleClientId && <div id="google-link-btn" />}
                {!googleClientId && (
                  <p className="text-xs text-aam-text-muted">Login Google belum dikonfigurasi</p>
                )}
              </div>
            )}
          </Card>

          {/* Sessions card */}
          <Card icon="devices" className="p-5">
            <h3 className="text-sm font-semibold text-aam-text mb-4">Sesi Aktif Saya</h3>
            {loading ? (
              <p className="text-sm text-aam-text-muted">Memuat...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-aam-text-muted">Tidak ada sesi aktif</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-aam-border p-3"
                  >
                    <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.25rem' }}>
                      devices
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-aam-text truncate">{s.deviceSummary}</p>
                      <p className="text-xs text-aam-text-muted">
                        {s.ipAddress} • {timeAgo(s.lastActiveAt)}
                      </p>
                    </div>
                    {s.current ? (
                      <Badge variant="green">Sesi ini</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRevokeTarget(s)}
                      >
                        Cabut
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={showUnlinkConfirm}
        title="Lepas Tautan Google"
        description="Anda tidak akan bisa login dengan Google setelah ini. Lanjutkan?"
        confirmLabel="Lepas Tautan"
        onConfirm={handleUnlinkGoogle}
        onCancel={() => setShowUnlinkConfirm(false)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Cabut Sesi"
        description={`Cabut sesi di ${revokeTarget?.deviceSummary}? Pengguna perangkat tersebut akan keluar.`}
        confirmLabel="Cabut Sesi"
        onConfirm={handleRevokeSession}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Unsaved changes guard */}
      {guard}
    </PageContainer>
  );
}
