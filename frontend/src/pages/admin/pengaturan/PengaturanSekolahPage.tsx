import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError, type ProfilSekolah } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { ImageUploader } from '../../../components/ImageUploader';
import { UnsavedGuard } from '../../../components/UnsavedGuard';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';

const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const EMPTY: ProfilSekolah = {
  nama: '', jenjang: '', logoUrl: '', kepsekNama: '', kepsekNip: '', kepsekJabatan: 'Kepala Sekolah', alamat: '', kabKota: '',
};

/**
 * /admin/sekolah — profil sekolah (T14, §15.3).
 * Simpan sendiri + feedback inline + "Terakhir disimpan oleh X".
 */
export function PengaturanSekolahPage() {
  const toast = useToast();
  const [data, setData] = useState<ProfilSekolah>(EMPTY);
  const [original, setOriginal] = useState<ProfilSekolah>(EMPTY);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await api.getPengaturanByKey('profil_sekolah');
        if (cancelled) return;
        const val = row.value as ProfilSekolah;
        const merged = { ...EMPTY, ...val };
        setData(merged);
        setOriginal(merged);
        setUpdatedByName(row.updatedByName);
        setUpdatedAt(row.updatedAt);
      } catch (err) {
        if (!cancelled) toast.show('error', 'Gagal memuat profil sekolah');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = JSON.stringify(data) !== JSON.stringify(original);

  const update = (field: keyof ProfilSekolah, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await api.adminUpdatePengaturan('profil_sekolah', data);
      setData(row.value as ProfilSekolah);
      setOriginal(row.value as ProfilSekolah);
      setUpdatedByName(row.updatedByName);
      setUpdatedAt(row.updatedAt);
      toast.show('success', 'Profil sekolah berhasil disimpan');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan';
      toast.show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="xl">
        <BackLink to="/admin" />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="md" bottomBar>
        <BackLink to="/admin" />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">Profil Sekolah</h2>
        <p className="text-xs text-aam-text-muted mb-6">Data sekolah untuk kop dokumen & rapor</p>

        <Card icon="school">
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <span className={labelClass}>Logo Sekolah</span>
              <ImageUploader
                value={data.logoUrl}
                onChange={(url) => update('logoUrl', url)}
                label="Logo sekolah"
                icon="school"
              />
            </div>

            {/* Nama */}
            <div>
              <label className={labelClass} htmlFor="sekolah-nama">Nama Sekolah</label>
              <input
                id="sekolah-nama"
                type="text"
                value={data.nama}
                onChange={(e) => update('nama', e.target.value)}
                className={inputClass}
                placeholder="SMP IT Asy-Syadzili"
              />
            </div>

            {/* Jenjang */}
            <div>
              <label className={labelClass} htmlFor="sekolah-jenjang">Jenjang</label>
              <input
                id="sekolah-jenjang"
                type="text"
                value={data.jenjang}
                onChange={(e) => update('jenjang', e.target.value)}
                className={inputClass}
                placeholder="SMP / MTs"
              />
            </div>

            {/* Kepsek */}
            <div className="border-t border-aam-border pt-4">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Kepala Sekolah</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="sekolah-kepsek-nama">Nama</label>
                  <input
                    id="sekolah-kepsek-nama"
                    type="text"
                    value={data.kepsekNama}
                    onChange={(e) => update('kepsekNama', e.target.value)}
                    className={inputClass}
                    placeholder="Nama kepala sekolah"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sekolah-kepsek-nip">NIP</label>
                  <input
                    id="sekolah-kepsek-nip"
                    type="text"
                    value={data.kepsekNip}
                    onChange={(e) => update('kepsekNip', e.target.value)}
                    className={inputClass}
                    placeholder="NIP kepala sekolah"
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sekolah-kepsek-jabatan">Jabatan</label>
                  <input
                    id="sekolah-kepsek-jabatan"
                    type="text"
                    value={data.kepsekJabatan}
                    onChange={(e) => update('kepsekJabatan', e.target.value)}
                    className={inputClass}
                    placeholder="Kepala Sekolah"
                  />
                </div>
              </div>
            </div>

            {/* Alamat */}
            <div className="border-t border-aam-border pt-4">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Alamat</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass} htmlFor="sekolah-alamat">Alamat Lengkap</label>
                  <textarea
                    id="sekolah-alamat"
                    value={data.alamat}
                    onChange={(e) => update('alamat', e.target.value)}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    placeholder="Jl. ..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="sekolah-kabkota">Kabupaten/Kota</label>
                  <input
                    id="sekolah-kabkota"
                    type="text"
                    value={data.kabKota}
                    onChange={(e) => update('kabKota', e.target.value)}
                    className={inputClass}
                    placeholder="Kabupaten/Kota"
                  />
                </div>
              </div>
            </div>

            {/* Save + footer */}
            <div className="border-t border-aam-border pt-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-aam-text-muted">
                {updatedByName && (
                  <span>Terakhir disimpan oleh <strong className="text-aam-text">{updatedByName}</strong>{updatedAt && ` — ${new Date(updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}</span>
                )}
              </div>
              <Button onClick={handleSave} loading={saving} disabled={!dirty} icon="save">
                Simpan
              </Button>
            </div>
          </div>
        </Card>
      </PageContainer>
    </UnsavedGuard>
  );
}
