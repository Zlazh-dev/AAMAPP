import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/kelas/baru & /admin/kelas/:id/edit
 * POLA A form: nama, tingkat (auto-fase), status.
 */
export function KelasFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [nama, setNama] = useState('');
  const [tingkat, setTingkat] = useState('7');
  const [fase, setFase] = useState('D');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setDirty, guard } = useUnsavedChanges();

  useEffect(() => {
    if (isEdit) loadKelas();
  }, [id]);

  // Auto-set fase based on tingkat
  useEffect(() => {
    const t = parseInt(tingkat);
    if (t === 7) setFase('D');
    else if (t === 8) setFase('E');
    else if (t === 9) setFase('F');
  }, [tingkat]);

  const loadKelas = async () => {
    try {
      const k = await api.adminGetKelasById(parseInt(id!, 10));
      setNama(k.nama);
      setTingkat(String(k.tingkat));
      setFase(k.fase);
    } catch {
      show('error', 'Kelas tidak ditemukan');
      navigate('/admin/kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (nama.trim().length < 1) {
      setErrors({ nama: 'Nama kelas wajib diisi' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama: nama.trim(),
        tingkat: parseInt(tingkat),
        fase,
      };
      if (isEdit) {
        await api.adminUpdateKelas(parseInt(id!, 10), payload);
        show('success', 'Kelas berhasil diperbarui');
      } else {
        await api.adminCreateKelas(payload);
        show('success', 'Kelas berhasil ditambahkan');
      }
      setDirty(false);
      navigate('/admin/kelas/sukses', { replace: true, state: { entityName: nama.trim(), mode: isEdit ? 'edit' : 'create', entityId: id } });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ nama: err.body?.message || 'Nama kelas sudah digunakan' });
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
    <PageContainer size="md" bottomBar>
      <BackLink to={isEdit ? `/admin/kelas/${id}` : '/admin/kelas'} />

      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <h2 className="text-lg font-heading font-semibold text-aam-text">
          {isEdit ? 'Edit Kelas' : 'Tambah Kelas'}
        </h2>
        <PageMenu
          menuTitle="Menu Kelas"
          links={[
            { key: 'daftar', label: 'Daftar Kelas', path: '/admin/kelas', icon: 'meeting_room' },
          ]}
        />
      </div>

      <form id="form-kelas" onSubmit={handleSubmit}>
        <Card icon="meeting_room" className="p-5">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Data Kelas</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-aam-text-muted mb-1">Nama Kelas *</label>
              <input
                value={nama}
                onChange={(e) => { setNama(e.target.value); setDirty(true); }}
                required
                className={`${inputClass} ${errors.nama ? errorInputClass : ''}`}
                placeholder="Mis. 7A"
              />
              {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama}</p>}
            </div>
            <div>
              <label className="block text-xs text-aam-text-muted mb-1">Tingkat *</label>
              <AdaptiveSelect
                value={tingkat}
                onChange={(v) => { setTingkat(v); setDirty(true); }}
                label="Tingkat"
                options={[
                  { value: '7', label: 'Kelas 7 (Fase D)' },
                  { value: '8', label: 'Kelas 8 (Fase E)' },
                  { value: '9', label: 'Kelas 9 (Fase F)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs text-aam-text-muted mb-1">Fase</label>
              <input
                value={fase}
                readOnly
                className={`${inputClass} bg-gray-50 text-aam-text-muted`}
              />
              <p className="mt-1 text-xs text-aam-text-muted">Fase ditentukan otomatis dari tingkat.</p>
            </div>
          </div>
        </Card>

        <div className="hidden md:flex mt-4 gap-3">
          <Button type="submit" loading={saving} size="lg" className="flex-1">
            Simpan
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => navigate(isEdit ? `/admin/kelas/${id}` : '/admin/kelas')}
          >
            Batal
          </Button>
        </div>
      </form>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button type="submit" form="form-kelas" loading={saving} className="w-full" size="lg">
          Simpan
        </Button>
      </div>

      {guard}
    </PageContainer>
  );
}
