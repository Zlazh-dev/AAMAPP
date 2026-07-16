import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiError, Kelas, Guru, GuruListResponse, Siswa, SiswaListResponse, KelasListResponse } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { BackLink } from '../../../components/BackLink';
import { Skeleton } from '../../../components/Skeleton';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { PageMenu } from '../../../components/PageMenu';
import { SearchSelect, SearchSelectOption } from '../../../components/SearchSelect';
import { createPortal } from 'react-dom';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/kelas/:id — POLA A detail.
 * - Kartu wali (SearchSelect guru; 409 → ConfirmDialog "Pindahkan dari kelas X?" → force)
 * - Daftar anggota siswa + pilih-multi → BottomSheet pilih kelas tujuan
 * - Tombol tambah siswa ke kelas (link ke form siswa)
 */
export function KelasDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [kelas, setKelas] = useState<Kelas | null>(null);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [guruOptions, setGuruOptions] = useState<SearchSelectOption[]>([]);
  const [kelasOptions, setKelasOptions] = useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Wali state
  const [selectedGuruId, setSelectedGuruId] = useState<string | number | null>(null);
  const [savingWali, setSavingWali] = useState(false);
  const [waliConflict, setWaliConflict] = useState<{ msg: string; guruId: number } | null>(null);

  // Pindah multi state
  const [selectedSiswa, setSelectedSiswa] = useState<Set<number>>(new Set());
  const [pindahOpen, setPindahOpen] = useState(false);
  const [targetKelasId, setTargetKelasId] = useState<string | number | null>(null);
  const [pindahProgress, setPindahProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const [pindahProcessing, setPindahProcessing] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const kelasId = parseInt(id!, 10);
      const [k, siswa, guru, allKelas] = await Promise.all([
        api.adminGetKelasById(kelasId),
        api.adminGetSiswa({ kelasId, limit: 500 }),
        api.adminGetGuru({ status: 'aktif', limit: 200 }),
        api.adminGetKelas({ limit: 200 }),
      ]);
      setKelas(k);
      setSiswaList(siswa.data);
      setSelectedGuruId(k.waliGuruId);
      setGuruOptions(guru.data.map((g) => ({
        value: g.id,
        label: g.nama,
        subtitle: g.nip || undefined,
        icon: 'school',
      })));
      setKelasOptions(allKelas.data
        .filter((k2) => k2.id !== kelasId)
        .map((k2) => ({
          value: k2.id,
          label: k2.nama,
          subtitle: `Tingkat ${k2.tingkat}`,
          icon: 'meeting_room',
        })));
    } catch {
      show('error', 'Kelas tidak ditemukan');
      navigate('/admin/kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWali = async () => {
    if (!kelas) return;
    setSavingWali(true);
    try {
      const updated = await api.adminSetWaliKelas(kelas.id, {
        waliGuruId: selectedGuruId ? Number(selectedGuruId) : null,
      });
      setKelas(updated);
      show('success', 'Wali kelas berhasil diperbarui');
      setWaliConflict(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        const msg = err.body?.message || 'Guru sudah menjadi wali kelas lain';
        setWaliConflict({ msg, guruId: Number(selectedGuruId) });
      } else {
        show('error', err instanceof ApiError ? err.body?.message : 'Gagal menyimpan wali');
      }
    } finally {
      setSavingWali(false);
    }
  };

  const handleForceWali = async () => {
    if (!kelas || !waliConflict) return;
    setSavingWali(true);
    try {
      const updated = await api.adminSetWaliKelas(kelas.id, {
        waliGuruId: waliConflict.guruId,
        force: true,
      });
      setKelas(updated);
      show('success', 'Wali kelas berhasil dipindahkan');
      setWaliConflict(null);
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal memindahkan wali');
    } finally {
      setSavingWali(false);
    }
  };

  const toggleSiswa = (siswaId: number) => {
    setSelectedSiswa((prev) => {
      const next = new Set(prev);
      if (next.has(siswaId)) next.delete(siswaId);
      else next.add(siswaId);
      return next;
    });
  };

  const handlePindah = async () => {
    if (!targetKelasId || selectedSiswa.size === 0) return;
    const targetId = Number(targetKelasId);
    const ids = Array.from(selectedSiswa);
    setPindahProcessing(true);
    setPindahProgress({ done: 0, total: ids.length, failed: [] });
    const failed: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      try {
        await api.adminUpdateSiswa(ids[i], { kelasId: targetId });
      } catch (err: any) {
        const s = siswaList.find((x) => x.id === ids[i]);
        failed.push(s?.nama || `ID ${ids[i]}`);
      }
      setPindahProgress({ done: i + 1, total: ids.length, failed });
    }
    setPindahProcessing(false);
    if (failed.length === 0) {
      show('success', `${ids.length} siswa berhasil dipindahkan`);
      setPindahOpen(false);
      setSelectedSiswa(new Set());
      setTargetKelasId(null);
      loadAll();
    } else {
      show('error', `${failed.length} siswa gagal dipindahkan: ${failed.join(', ')}`);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.adminDeleteKelas(parseInt(id!, 10));
      show('success', 'Kelas berhasil dihapus');
      navigate('/admin/kelas');
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal menghapus');
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
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

  if (!kelas) return null;

  return (
    <PageContainer size="lg">
      <BackLink to="/admin/kelas" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-heading font-semibold text-aam-text">{kelas.nama}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="purple">Fase {kelas.fase}</Badge>
            <Badge variant="gray">Tingkat {kelas.tingkat}</Badge>
          </div>
        </div>
        <PageMenu
          menuTitle={`Menu ${kelas.nama}`}
          actions={[
            {
              key: 'edit',
              label: 'Edit',
              icon: 'edit',
              variant: 'primary',
              onClick: () => navigate(`/admin/kelas/${kelas.id}/edit`),
            },
            {
              key: 'hapus',
              label: 'Hapus',
              icon: 'delete',
              variant: 'danger',
              onClick: () => setDeleteOpen(true),
            },
          ]}
          links={[
            { key: 'daftar', label: 'Daftar Kelas', path: '/admin/kelas', icon: 'meeting_room' },
          ]}
        />
      </div>

      {/* Wali kelas card */}
      <Card icon="supervisor_account" className="p-5 mb-4">
        <h3 className="text-sm font-semibold text-aam-text mb-3">Wali Kelas</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-aam-text-muted mb-1">Pilih Guru Wali</label>
            <SearchSelect
              options={guruOptions}
              value={selectedGuruId}
              onChange={setSelectedGuruId}
              placeholder="Pilih wali kelas..."
              searchPlaceholder="Cari nama guru..."
              clearable
            />
          </div>
          <Button onClick={handleSaveWali} loading={savingWali} disabled={selectedGuruId === kelas.waliGuruId}>
            Simpan Wali
          </Button>
        </div>
        {kelas.waliGuru && (
          <p className="mt-2 text-xs text-aam-text-muted">
            Wali saat ini: <span className="font-medium text-aam-text">{kelas.waliGuru.nama}</span>
          </p>
        )}
      </Card>

      {/* Daftar siswa anggota */}
      <Card icon="diversity_3" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-aam-text">
            Anggota Kelas ({siswaList.length})
          </h3>
          {selectedSiswa.size > 0 && (
            <Button size="sm" onClick={() => setPindahOpen(true)} icon="swap_horiz">
              Pindahkan ({selectedSiswa.size})
            </Button>
          )}
        </div>

        {siswaList.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '2.5rem' }}>
              group_off
            </span>
            <p className="mt-2 text-sm text-aam-text-muted">Belum ada siswa di kelas ini</p>
            <Button size="sm" className="mt-3" onClick={() => navigate('/admin/orang/siswa/baru')} icon="person_add">
              Tambah Siswa
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Desktop table */}
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
                  <th className="pb-2 w-8"></th>
                  <th className="pb-2 font-medium">Nama</th>
                  <th className="pb-2 font-medium">NIS</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {siswaList.map((s) => (
                  <tr key={s.id} className="border-b border-aam-border/30 hover:bg-gray-50">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedSiswa.has(s.id)}
                        onChange={() => toggleSiswa(s.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => navigate(`/admin/orang/siswa/${s.id}`)}
                        className="font-medium text-aam-text hover:text-aam-green"
                      >
                        {s.nama}
                      </button>
                    </td>
                    <td className="py-2 text-aam-text-muted">{s.nis}</td>
                    <td className="py-2">
                      <Badge variant={s.status === 'aktif' ? 'green' : 'gray'}>
                        {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => navigate(`/admin/orang/siswa/${s.id}`)}
                        className="text-aam-text-muted hover:text-aam-text"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_right</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list with checkboxes */}
            <div className="md:hidden space-y-1">
              {siswaList.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSiswa.has(s.id)}
                    onChange={() => toggleSiswa(s.id)}
                    className="w-5 h-5 cursor-pointer flex-shrink-0"
                  />
                  <button
                    onClick={() => navigate(`/admin/orang/siswa/${s.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-aam-text truncate">{s.nama}</p>
                    <p className="text-xs text-aam-text-muted">NIS: {s.nis}</p>
                  </button>
                  <Badge variant={s.status === 'aktif' ? 'green' : 'gray'}>
                    {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Wali conflict dialog */}
      <ConfirmDialog
        open={!!waliConflict}
        title="Pindahkan Wali Kelas?"
        description={waliConflict?.msg || 'Guru sudah menjadi wali kelas lain. Pindahkan ke kelas ini?'}
        confirmLabel="Pindahkan"
        variant="primary"
        onConfirm={handleForceWali}
        onCancel={() => setWaliConflict(null)}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        title="Hapus Kelas"
        description={`Yakin menghapus ${kelas.nama}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Pindah kelas bottom sheet */}
      {pindahOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in"
            onClick={() => !pindahProcessing && setPindahOpen(false)}
          />
          <div
            className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-5 pb-4">
              <h3 className="text-base font-semibold text-aam-text mb-2">Pindahkan Siswa</h3>
              <p className="text-sm text-aam-text-muted mb-4">
                Pilih kelas tujuan untuk {selectedSiswa.size} siswa terpilih.
              </p>

              {pindahProgress ? (
                <div className="py-4">
                  <p className="text-sm text-aam-text mb-2">
                    Memproses: {pindahProgress.done}/{pindahProgress.total}
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-aam-green transition-all"
                      style={{ width: `${(pindahProgress.done / pindahProgress.total) * 100}%` }}
                    />
                  </div>
                  {pindahProgress.failed.length > 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      Gagal: {pindahProgress.failed.join(', ')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-aam-text-muted mb-2">Kelas Tujuan</label>
                    <SearchSelect
                      options={kelasOptions}
                      value={targetKelasId}
                      onChange={setTargetKelasId}
                      placeholder="Pilih kelas tujuan..."
                      searchPlaceholder="Cari kelas..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setPindahOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handlePindah}
                      disabled={!targetKelasId}
                      loading={pindahProcessing}
                      icon="swap_horiz"
                    >
                      Pindahkan
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </PageContainer>
  );
}
