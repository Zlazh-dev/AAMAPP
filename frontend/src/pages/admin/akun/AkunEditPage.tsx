import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { RoleSelector } from './RoleSelector';
import { Skeleton } from '../../../components/Skeleton';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageMenu } from '../../../components/PageMenu';
import { PageContainer } from '../../../components/PageContainer';

export function AkunEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  // Block navigation when form has unsaved changes (ref-based for sync setDirty)
  const { setDirty, guard } = useUnsavedChanges();

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const u = await api.adminGetUser(parseInt(id!, 10));
      setName(u.name);
      setEmail(u.email);
      setRoles(u.roles);
    } catch {
      show('error', 'Akun tidak ditemukan');
      navigate('/admin/akun');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { show('error', 'Nama minimal 3 karakter'); return; }
    if (roles.length === 0) { show('error', 'Minimal pilih satu peran'); return; }
    if (password && password.length < 8) { show('error', 'Password minimal 8 karakter'); return; }
    setSaving(true);
    try {
      await api.adminUpdateUser(parseInt(id!, 10), {
        name,
        email,
        password: password || undefined,
        roles,
      });
      show('success', 'Akun berhasil diperbarui');
      setDirty(false);
      navigate('/admin/akun/sukses', { replace: true, state: { entityName: name.trim(), mode: 'edit', entityId: id } });
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal memperbarui');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageContainer size="lg">
      <BackLink to={`/admin/akun/${id}`} mobileButton={false} />
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <h2 className="text-lg font-heading font-semibold text-aam-text">Edit Akun</h2>
        <PageMenu
          menuTitle="Menu Akun"
          links={[
            { key: 'detail', label: 'Lihat Detail', path: `/admin/akun/${id}`, icon: 'visibility' },
            { key: 'daftar', label: 'Daftar Akun', path: '/admin/akun', icon: 'group' },
            { key: 'sesi', label: 'Sesi Aktif', path: '/admin/akun/sesi', icon: 'devices' },
            { key: 'aktivitas', label: 'Aktivitas', path: '/admin/akun/aktivitas', icon: 'history' },
          ]}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <Card icon="edit" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Data Akun</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Nama</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDirty(true); }}
                    required
                    className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
                    required
                    className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Password Baru (opsional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setDirty(true); }}
                    className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                    placeholder="Kosongkan jika tidak diganti"
                  />
                </div>
              </div>
            </Card>

            <Card icon="badge" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Peran</h3>
              <RoleSelector selected={roles} onChange={(r) => { setRoles(r); setDirty(true); }} />
            </Card>
          </div>

          <div className="md:sticky md:top-4 self-start">
            <Card icon="save" className="p-5">
              <div className="space-y-3">
                <Button type="submit" loading={saving} className="w-full" size="lg">
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate(`/admin/akun/${id}`)}
                >
                  Batal
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
      {guard}
    </PageContainer>
  );
}
