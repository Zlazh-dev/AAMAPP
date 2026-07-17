import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError, Kelas, KelasListResponse } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { ImageUploader } from '../../../components/ImageUploader';
import { SearchSelect, SearchSelectOption } from '../../../components/SearchSelect';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { useUnsavedChanges } from '../../../app/useUnsavedChanges';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const errorInputClass = 'border-red-400';

/**
 * T15-FIX-2 (BUG 2): SectionCard & Field DIANGKAT ke module scope (bukan
 * didefinisikan di dalam SiswaFormPage) — sebelumnya, setiap keystroke
 * memicu re-render parent yang membuat React melihat identitas komponen
 * BARU tiap render, sehingga subtree (termasuk <input>) di-unmount lalu
 * di-mount ulang → fokus hilang tiap 1 huruf. Komponen di module scope
 * punya identitas STABIL antar-render.
 */
function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <Card icon={icon} className="p-5">
      <h3 className="text-sm font-semibold text-aam-text mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-aam-text-muted mb-1">{label}{required && ' *'}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * /admin/orang/siswa/baru & /admin/orang/siswa/:id/edit
 * POLA A form: 2 columns. Main = 4 sections (Pribadi/Ortu/Wali/Sekolah).
 * Side = foto uploader + kelas (SearchSelect) + status + Simpan.
 */
export function SiswaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [kelasOptions, setKelasOptions] = useState<SearchSelectOption[]>([]);

  // Form fields
  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [agama, setAgama] = useState('');
  const [statusDalamKeluarga, setStatusDalamKeluarga] = useState('');
  const [anakKe, setAnakKe] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [sekolahAsal, setSekolahAsal] = useState('');
  const [diterimaDiKelas, setDiterimaDiKelas] = useState('');
  const [diterimaTanggal, setDiterimaTanggal] = useState('');
  const [namaAyah, setNamaAyah] = useState('');
  const [pekerjaanAyah, setPekerjaanAyah] = useState('');
  const [namaIbu, setNamaIbu] = useState('');
  const [pekerjaanIbu, setPekerjaanIbu] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [alamatWali, setAlamatWali] = useState('');
  const [teleponWali, setTeleponWali] = useState('');
  const [pekerjaanWali, setPekerjaanWali] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [kelasId, setKelasId] = useState<string | number | null>(null);
  const [status, setStatus] = useState('aktif');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setDirty, guard } = useUnsavedChanges();

  useEffect(() => {
    loadKelasOptions();
    if (isEdit) loadSiswa();
  }, [id]);

  const loadKelasOptions = async () => {
    try {
      const res = await api.adminGetKelas({ limit: 200 });
      setKelasOptions(res.data.map((k) => ({
        value: k.id,
        label: k.nama,
        subtitle: `Tingkat ${k.tingkat}`,
        icon: 'meeting_room',
      })));
    } catch {}
  };

  const loadSiswa = async () => {
    try {
      const s = await api.adminGetSiswaById(parseInt(id!, 10));
      setNama(s.nama);
      setNis(s.nis);
      setNisn(s.nisn || '');
      setJenisKelamin(s.jenisKelamin);
      setTempatLahir(s.tempatLahir || '');
      setTanggalLahir(s.tanggalLahir ? s.tanggalLahir.split('T')[0] : '');
      setAgama(s.agama || '');
      setStatusDalamKeluarga(s.statusDalamKeluarga || '');
      setAnakKe(s.anakKe ? String(s.anakKe) : '');
      setAlamat(s.alamat || '');
      setTelepon(s.telepon || '');
      setSekolahAsal(s.sekolahAsal || '');
      setDiterimaDiKelas(s.diterimaDiKelas || '');
      setDiterimaTanggal(s.diterimaTanggal ? s.diterimaTanggal.split('T')[0] : '');
      setNamaAyah(s.namaAyah || '');
      setPekerjaanAyah(s.pekerjaanAyah || '');
      setNamaIbu(s.namaIbu || '');
      setPekerjaanIbu(s.pekerjaanIbu || '');
      setNamaWali(s.namaWali || '');
      setAlamatWali(s.alamatWali || '');
      setTeleponWali(s.teleponWali || '');
      setPekerjaanWali(s.pekerjaanWali || '');
      setFotoUrl(s.fotoUrl || '');
      setKelasId(s.kelasId);
      setStatus(s.status);
    } catch {
      show('error', 'Siswa tidak ditemukan');
      navigate('/admin/orang/siswa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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
    if (!nis.trim()) {
      setErrors({ nis: 'NIS wajib diisi' });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        nama: nama.trim(),
        nis: nis.trim(),
        nisn: nisn.trim() || null,
        jenisKelamin,
        tempatLahir: tempatLahir.trim() || null,
        tanggalLahir: tanggalLahir || null,
        agama: agama.trim() || null,
        statusDalamKeluarga: statusDalamKeluarga.trim() || null,
        anakKe: anakKe ? parseInt(anakKe) : null,
        alamat: alamat.trim() || null,
        telepon: telepon.trim() || null,
        sekolahAsal: sekolahAsal.trim() || null,
        diterimaDiKelas: diterimaDiKelas.trim() || null,
        diterimaTanggal: diterimaTanggal || null,
        namaAyah: namaAyah.trim() || null,
        pekerjaanAyah: pekerjaanAyah.trim() || null,
        namaIbu: namaIbu.trim() || null,
        pekerjaanIbu: pekerjaanIbu.trim() || null,
        namaWali: namaWali.trim() || null,
        alamatWali: alamatWali.trim() || null,
        teleponWali: teleponWali.trim() || null,
        pekerjaanWali: pekerjaanWali.trim() || null,
        fotoUrl: fotoUrl || '',
        kelasId: kelasId ? Number(kelasId) : null,
        status,
      };

      if (isEdit) {
        await api.adminUpdateSiswa(parseInt(id!, 10), payload);
        show('success', 'Siswa berhasil diperbarui');
      } else {
        await api.adminCreateSiswa(payload);
        show('success', 'Siswa berhasil ditambahkan');
      }
      setDirty(false);
      navigate('/admin/orang/siswa/sukses', { replace: true, state: { entityName: nama.trim(), mode: isEdit ? 'edit' : 'create', entityId: id } });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.body?.message || '';
        if (msg.toLowerCase().includes('nisn')) {
          setErrors({ nisn: msg });
        } else if (msg.toLowerCase().includes('nis')) {
          setErrors({ nis: msg });
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

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to={isEdit ? `/admin/orang/siswa/${id}` : '/admin/orang/siswa'} mobileButton={false} />

      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <h2 className="text-lg font-heading font-semibold text-aam-text">
          {isEdit ? 'Edit Siswa' : 'Tambah Siswa'}
        </h2>
        <PageMenu
          menuTitle="Menu Siswa"
          links={[
            { key: 'daftar', label: 'Daftar Siswa', path: '/admin/orang/siswa', icon: 'diversity_3' },
            { key: 'guru', label: 'Data Guru', path: '/admin/orang/guru', icon: 'school' },
          ]}
        />
      </div>

      <form id="form-siswa" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main: 4 sections */}
          <div className="md:col-span-2 space-y-4">
            <SectionCard icon="person" title="Data Pribadi">
              <Field label="Nama Lengkap" required error={errors.nama}>
                <input value={nama} onChange={handleChange(setNama)} required className={`${inputClass} ${errors.nama ? errorInputClass : ''}`} placeholder="Nama lengkap siswa" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="NIS" required error={errors.nis}>
                  <input value={nis} onChange={handleChange(setNis)} required className={`${inputClass} ${errors.nis ? errorInputClass : ''}`} placeholder="Nomor Induk Siswa" />
                </Field>
                <Field label="NISN" error={errors.nisn}>
                  <input value={nisn} onChange={handleChange(setNisn)} className={`${inputClass} ${errors.nisn ? errorInputClass : ''}`} placeholder="NISN (opsional)" />
                </Field>
              </div>
              <Field label="Jenis Kelamin" required>
                <AdaptiveSelect
                  value={jenisKelamin}
                  onChange={(v) => { setJenisKelamin(v as 'L' | 'P'); setDirty(true); }}
                  label="Jenis Kelamin"
                  options={[
                    { value: 'L', label: 'Laki-laki' },
                    { value: 'P', label: 'Perempuan' },
                  ]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tempat Lahir">
                  <input value={tempatLahir} onChange={handleChange(setTempatLahir)} className={inputClass} placeholder="Tempat lahir" />
                </Field>
                <Field label="Tanggal Lahir">
                  <input type="date" value={tanggalLahir} onChange={handleChange(setTanggalLahir)} className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Agama">
                  <input value={agama} onChange={handleChange(setAgama)} className={inputClass} placeholder="Agama" />
                </Field>
                <Field label="Anak Ke">
                  <input type="number" value={anakKe} onChange={handleChange(setAnakKe)} className={inputClass} placeholder="Anak ke-" min="1" />
                </Field>
              </div>
              <Field label="Status Dalam Keluarga">
                <input value={statusDalamKeluarga} onChange={handleChange(setStatusDalamKeluarga)} className={inputClass} placeholder="Mis. Anak kandung" />
              </Field>
              <Field label="Alamat">
                <textarea value={alamat} onChange={handleChange(setAlamat)} className={inputClass} rows={2} placeholder="Alamat tempat tinggal" />
              </Field>
              <Field label="Telepon">
                <input value={telepon} onChange={handleChange(setTelepon)} className={inputClass} placeholder="08xxxxxxxxxx" />
              </Field>
            </SectionCard>

            <SectionCard icon="family_restroom" title="Orang Tua">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Ayah">
                  <input value={namaAyah} onChange={handleChange(setNamaAyah)} className={inputClass} placeholder="Nama ayah" />
                </Field>
                <Field label="Pekerjaan Ayah">
                  <input value={pekerjaanAyah} onChange={handleChange(setPekerjaanAyah)} className={inputClass} placeholder="Pekerjaan ayah" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama Ibu">
                  <input value={namaIbu} onChange={handleChange(setNamaIbu)} className={inputClass} placeholder="Nama ibu" />
                </Field>
                <Field label="Pekerjaan Ibu">
                  <input value={pekerjaanIbu} onChange={handleChange(setPekerjaanIbu)} className={inputClass} placeholder="Pekerjaan ibu" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon="guardian" title="Wali">
              <Field label="Nama Wali">
                <input value={namaWali} onChange={handleChange(setNamaWali)} className={inputClass} placeholder="Nama wali (opsional)" />
              </Field>
              <Field label="Alamat Wali">
                <textarea value={alamatWali} onChange={handleChange(setAlamatWali)} className={inputClass} rows={2} placeholder="Alamat wali" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telepon Wali">
                  <input value={teleponWali} onChange={handleChange(setTeleponWali)} className={inputClass} placeholder="08xxxxxxxxxx" />
                </Field>
                <Field label="Pekerjaan Wali">
                  <input value={pekerjaanWali} onChange={handleChange(setPekerjaanWali)} className={inputClass} placeholder="Pekerjaan wali" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon="school" title="Sekolah">
              <Field label="Sekolah Asal">
                <input value={sekolahAsal} onChange={handleChange(setSekolahAsal)} className={inputClass} placeholder="Sekolah asal (opsional)" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Diterima di Kelas">
                  <input value={diterimaDiKelas} onChange={handleChange(setDiterimaDiKelas)} className={inputClass} placeholder="Mis. 7A" />
                </Field>
                <Field label="Diterima Tanggal">
                  <input type="date" value={diterimaTanggal} onChange={handleChange(setDiterimaTanggal)} className={inputClass} />
                </Field>
              </div>
              <Field label="Status">
                <AdaptiveSelect
                  value={status}
                  onChange={(v) => { setStatus(v); setDirty(true); }}
                  label="Status"
                  options={[
                    { value: 'aktif', label: 'Aktif' },
                    { value: 'nonaktif', label: 'Nonaktif' },
                  ]}
                />
              </Field>
            </SectionCard>
          </div>

          {/* Side panel: foto + kelas + Simpan */}
          <div className="md:sticky md:top-4 self-start space-y-4">
            <Card icon="photo_camera" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Foto</h3>
              <ImageUploader
                value={fotoUrl}
                onChange={(url) => { setFotoUrl(url); setDirty(true); }}
                label="Foto Siswa"
              />
            </Card>

            <Card icon="meeting_room" className="p-5">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Kelas</h3>
              <Field label="Pilih Kelas">
                <SearchSelect
                  options={kelasOptions}
                  value={kelasId}
                  onChange={(v) => { setKelasId(v); setDirty(true); }}
                  placeholder="Pilih kelas..."
                  searchPlaceholder="Cari kelas..."
                  clearable
                />
              </Field>
            </Card>

            <Card icon="save" className="p-5 hidden md:block">
              <div className="space-y-3">
                <Button type="submit" loading={saving} className="w-full" size="lg">
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate(isEdit ? `/admin/orang/siswa/${id}` : '/admin/orang/siswa')}
                >
                  Batal
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <Button type="submit" form="form-siswa" loading={saving} className="w-full" size="lg">
          Simpan
        </Button>
      </div>

      {guard}
    </PageContainer>
  );
}
