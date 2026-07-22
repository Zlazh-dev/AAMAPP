import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { ImageUploader } from '../../../components/ImageUploader';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /kurikulum/orang/guru/baru & /kurikulum/orang/guru/:id/edit
 * POLA A form: 2 columns (main fields + side panel with foto + meta + Simpan).
 * UnsavedGuard + inline 409 errors.
 */
export function GuruFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [telepon, setTelepon] = useState('');
  const [email, setEmail] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [status, setStatus] = useState('aktif');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setDirty, guard } = useUnsavedChanges();

  useEffect(() => {
    if (isEdit) loadGuru();
  }, [id]);

  const loadGuru = async () => {
    try {
      const g = await api.adminGetGuruById(parseInt(id!, 10));
      setNama(g.nama);
      setNip(g.nip || '');
      setJenisKelamin(g.jenisKelamin);
      setTelepon(g.telepon || '');
      setEmail(g.email || '');
      setFotoUrl(g.fotoUrl || '');
      setStatus(g.status);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Guru tidak ditemukan');
      navigate('/kurikulum/orang/guru');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setter(e.target.value);
    setDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (nama.trim().length < 3) {
      setErrors({ nama: 'Nama minimal 3 karakter' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama: nama.trim(),
        nip: nip.trim() || null,
        jenisKelamin,
        telepon: telepon.trim() || null,
        email: email.trim() || null,
        fotoUrl: fotoUrl || '',
        status,
      };
      if (isEdit) {
        await api.adminUpdateGuru(parseInt(id!, 10), payload);
        show('success', 'Guru berhasil diperbarui');
      } else {
        await api.adminCreateGuru(payload);
        show('success', 'Guru berhasil ditambahkan');
      }
      setDirty(false);
      navigate('/kurikulum/orang/guru/sukses', { replace: true, state: { entityName: nama.trim(), mode: isEdit ? 'edit' : 'create', entityId: id } });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.body?.message || '';
        if (msg.toLowerCase().includes('nip')) {
          setErrors({ nip: msg });
        } else {
          show('error', msg);
        }
      } else {
        show('error', err instanceof ApiError ? err.body?.message : 'Gagal menyimpan');
      }
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

  const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
  const errorInputClass = 'border-red-400';

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to={isEdit ? `/kurikulum/orang/guru/${id}` : '/kurikulum/orang/guru'} mobileButton={false} />

      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <h2 className="text-lg font-heading font-semibold text-aam-text">
          {isEdit ? 'Edit Guru' : 'Tambah Guru'}
        </h2>
        <PageMenu
          menuTitle="Menu Guru"
          links={[
            { key: 'daftar', label: 'Daftar Guru', path: '/kurikulum/orang/guru', icon: 'school' },
            { key: 'siswa', label: 'Data Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
          ]}
        />
      </div>

      <form id="form-guru" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main fields */}
          <div className="md:col-span-2 space-y-4">
            <Card icon="person">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Data Guru</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Nama Lengkap *</label>
                  <input
                    value={nama}
                    onChange={handleChange(setNama)}
                    required
                    className={`${inputClass} ${errors.nama ? errorInputClass : ''}`}
                    placeholder="Masukkan nama lengkap"
                  />
                  {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">NIP</label>
                  <input
                    value={nip}
                    onChange={handleChange(setNip)}
                    className={`${inputClass} ${errors.nip ? errorInputClass : ''}`}
                    placeholder="Nomor Induk Pegawai"
                  />
                  {errors.nip && <p className="mt-1 text-xs text-red-600">{errors.nip}</p>}
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Jenis Kelamin *</label>
                  <AdaptiveSelect
                    value={jenisKelamin}
                    onChange={(v) => { setJenisKelamin(v as 'L' | 'P'); setDirty(true); }}
                    label="Jenis Kelamin"
                    options={[
                      { value: 'L', label: 'Laki-laki' },
                      { value: 'P', label: 'Perempuan' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Telepon</label>
                  <input
                    value={telepon}
                    onChange={handleChange(setTelepon)}
                    className={inputClass}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Email
                    <span className="ml-1 text-aam-text-muted">(untuk tautan akun otomatis)</span>
                  </label>
                  <input
                    id="input-guru-email"
                    type="email"
                    value={email}
                    onChange={handleChange(setEmail)}
                    className={inputClass}
                    placeholder="guru@sekolah.sch.id"
                  />
                </div>
                <div>
                  <label className="block text-xs text-aam-text-muted mb-1">Status</label>
                  <AdaptiveSelect
                    value={status}
                    onChange={(v) => { setStatus(v); setDirty(true); }}
                    label="Status"
                    options={[
                      { value: 'aktif', label: 'Aktif' },
                      { value: 'nonaktif', label: 'Nonaktif' },
                    ]}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Side panel: foto + Simpan */}
          <div className="md:sticky md:top-4 self-start space-y-4">
            <Card icon="photo_camera">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Foto</h3>
              <ImageUploader
                value={fotoUrl}
                onChange={(url) => { setFotoUrl(url); setDirty(true); }}
                label="Foto Guru"
              />
            </Card>

            <Card icon="save" className="hidden md:block">
              <div className="space-y-3">
                <Button type="submit" loading={saving} className="w-full" size="lg">
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate(isEdit ? `/kurikulum/orang/guru/${id}` : '/kurikulum/orang/guru')}
                >
                  Batal
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button type="submit" form="form-guru" loading={saving} className="w-full" size="lg">
          Simpan
        </Button>
      </div>

      {guard}
    </PageContainer>
  );
}
