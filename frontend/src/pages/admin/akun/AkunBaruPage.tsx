import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { RoleSelector } from './RoleSelector';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageContainer } from '../../../components/PageContainer';

export function AkunBaruPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Block navigation when form has unsaved changes (ref-based for sync setDirty)
  const { setDirty, guard } = useUnsavedChanges();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { show('error', 'Nama minimal 3 karakter'); return; }
    if (password.length < 8) { show('error', 'Password minimal 8 karakter'); return; }
    if (roles.length === 0) { show('error', 'Minimal pilih satu peran'); return; }
    setLoading(true);
    try {
      const u = await api.adminCreateUser({ name, email, password, roles });
      show('success', `Akun ${u.name} berhasil dibuat`);
      setDirty(false);
      navigate('/admin/akun/sukses', { replace: true, state: { entityName: name.trim(), mode: 'create' } });
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal membuat akun');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer size="lg">
      <BackLink to="/admin/akun" />
      <h2 className="text-lg font-heading font-semibold text-aam-text mt-3 mb-4">Tambah Akun</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="md:col-span-2 space-y-4">
            <Card icon="person_add" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Data Akun</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Nama</label>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setDirty(true); }}
                    required
                    className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                    placeholder="Nama lengkap"
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
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setDirty(true); }}
                    required
                    className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
                    placeholder="Minimal 8 karakter"
                  />
                </div>
              </div>
            </Card>

            <Card icon="badge" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Peran</h3>
              <RoleSelector selected={roles} onChange={(r) => { setRoles(r); setDirty(true); }} />
            </Card>
          </div>

          {/* Sidebar column */}
          <div className="md:sticky md:top-4 self-start">
            <Card icon="save" className="p-5">
              <div className="space-y-3">
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate('/admin/akun')}
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
