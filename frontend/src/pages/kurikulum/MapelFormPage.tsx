import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, Mapel } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { BackLink } from '../../components/BackLink';
import { UnsavedGuard } from '../../components/UnsavedGuard';
import { useToast } from '../../components/Toast';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const EMPTY: Partial<Mapel> = { nama: '', kode: '', kelompok: '', urutan: 1 };

/**
 * /kurikulum/mapel/baru & /kurikulum/mapel/:id/edit — Form Mapel (T15 §15.0).
 * Sub-halaman + SaveSuccess pattern.
 */
export function MapelFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<Partial<Mapel>>(EMPTY);
  const [original, setOriginal] = useState<Partial<Mapel>>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const m = await api.getMapelById(parseInt(id!, 10));
        if (cancelled) return;
        setData(m);
        setOriginal(m);
      } catch {
        if (!cancelled) toast.show('error', 'Gagal memuat data mapel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const dirty = JSON.stringify(data) !== JSON.stringify(original);

  const update = (field: keyof Mapel, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { nama: data.nama, kode: data.kode, kelompok: data.kelompok, urutan: data.urutan };
      if (isEdit) {
        await api.updateMapel(parseInt(id!, 10), payload);
        toast.show('success', 'Mapel berhasil diperbarui');
        navigate(`/kurikulum/mapel`);
      } else {
        await api.createMapel(payload as { nama: string; kode: string; kelompok: string; urutan: number });
        navigate('/kurikulum/mapel/sukses');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan';
      toast.show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="md">
        <BackLink to="/kurikulum/mapel" />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="md" bottomBar>
        <BackLink to="/kurikulum/mapel" mobileButton={false} />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">
          {isEdit ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        </h2>
        <p className="text-xs text-aam-text-muted mb-6">Isi data mata pelajaran di bawah ini</p>

        <Card icon="book" className="p-6">
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="mapel-nama">Nama</label>
              <input
                id="mapel-nama"
                type="text"
                value={data.nama || ''}
                onChange={(e) => update('nama', e.target.value)}
                className={inputClass}
                placeholder="Matematika"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="mapel-kode">Kode</label>
              <input
                id="mapel-kode"
                type="text"
                value={data.kode || ''}
                onChange={(e) => update('kode', e.target.value.toUpperCase())}
                className={inputClass}
                placeholder="MAT"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="mapel-kelompok">Kelompok</label>
              <input
                id="mapel-kelompok"
                type="text"
                value={data.kelompok || ''}
                onChange={(e) => update('kelompok', e.target.value)}
                className={inputClass}
                placeholder="A (Wajib)"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="mapel-urutan">Urutan</label>
              <input
                id="mapel-urutan"
                type="number"
                min={1}
                value={data.urutan || 1}
                onChange={(e) => update('urutan', parseInt(e.target.value) || 1)}
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* Sticky bottom bar (mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Button onClick={handleSave} loading={saving} disabled={!dirty} icon="save" className="w-full">
            Simpan
          </Button>
        </div>

        {/* Desktop save button */}
        <div className="hidden md:flex items-center justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => navigate('/kurikulum/mapel')}>Batal</Button>
          <Button onClick={handleSave} loading={saving} disabled={!dirty} icon="save">Simpan</Button>
        </div>
      </PageContainer>
    </UnsavedGuard>
  );
}
