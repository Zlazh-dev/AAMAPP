import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, Guru, Penugasan, TahunAjaran } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { PageMenu } from '../../components/PageMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchSelect } from '../../components/SearchSelect';
import { useToast } from '../../components/Toast';

/**
 * /kurikulum/penugasan — Paket Mengajar (T15 §14.10.3).
 * Filter by TA aktif. Show table of penugasan.
 * No TA active → panel arahan ke Pengaturan (planner correction #3).
 */
export function PenugasanPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [penugasanList, setPenugasanList] = useState<Penugasan[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [taAktif, setTaAktif] = useState<TahunAjaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null);
  const [gantiTarget, setGantiTarget] = useState<Penugasan | null>(null);
  const [gantiGuruId, setGantiGuruId] = useState<number | null>(null);
  const [gantiSaving, setGantiSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ta, guruRes] = await Promise.all([
          api.getTahunAjaranAktif(),
          api.adminGetGuru({ limit: 1000 }),
        ]);
        if (cancelled) return;
        setTaAktif(ta);
        setGuruList(guruRes.data);
        if (ta) {
          const list = await api.getPenugasan({ taId: ta.id });
          if (!cancelled) setPenugasanList(list);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deletePenugasan(deleteTarget.id);
      toast.show('success', 'Penugasan dihapus');
      setDeleteTarget(null);
      setPenugasanList((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch {
      toast.show('error', 'Gagal menghapus penugasan');
    }
  };

  const openGanti = (p: Penugasan) => {
    setGantiTarget(p);
    setGantiGuruId(p.guruId);
  };

  const handleGantiGuru = async () => {
    if (!gantiTarget || !gantiGuruId) return;
    setGantiSaving(true);
    try {
      await api.updatePenugasan(gantiTarget.id, { guruId: gantiGuruId });
      const guruBaru = guruList.find((g) => g.id === gantiGuruId);
      toast.show('success', 'Guru pengampu berhasil diganti');
      setPenugasanList((prev) =>
        prev.map((p) =>
          p.id === gantiTarget.id
            ? { ...p, guruId: gantiGuruId, guruNama: guruBaru?.nama ?? p.guruNama }
            : p,
        ),
      );
      setGantiTarget(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mengganti guru';
      toast.show('error', msg);
    } finally {
      setGantiSaving(false);
    }
  };

  // No TA active → panel arahan
  if (!loading && !taAktif) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Penugasan
        </h2>
        <Card className="p-8 text-center">
          <span className="material-symbols-outlined text-aam-text-muted mb-3" style={{ fontSize: '3rem' }}>
            calendar_off
          </span>
          <h3 className="text-sm font-medium text-aam-text mb-2">Belum ada tahun ajaran aktif</h3>
          <p className="text-xs text-aam-text-muted mb-4 max-w-sm mx-auto">
            Penugasan memerlukan tahun ajaran aktif. Buat dan aktifkan tahun ajaran di Pengaturan terlebih dahulu.
          </p>
          <Button variant="secondary" size="sm" icon="settings" onClick={() => navigate('/admin/pengaturan/tahun-ajaran')}>
            Buka Pengaturan Tahun Ajaran
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Penugasan
          </h2>
          <p className="text-xs text-aam-text-muted">
            {taAktif ? `TA ${taAktif.nama} Sem ${taAktif.semester}` : ''} • {penugasanList.length} paket
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Penugasan"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Penugasan',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/kurikulum/penugasan/baru'),
            },
          ]}
          links={[
            { key: 'wali-kelas', label: 'Wali Kelas', path: '/kurikulum/wali-kelas', icon: 'supervisor_account' },
          ]}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Guru</th>
              <th className="pb-2 font-medium">Mapel</th>
              <th className="pb-2 font-medium">Kelas</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={4}><TableSkeleton rows={4} cols={3} /></td></tr>
            ) : penugasanList.length === 0 ? (
              <tr><td colSpan={4}><EmptyState icon="assignment_ind" message="Belum ada penugasan" /></td></tr>
            ) : (
              penugasanList.map((p) => (
                <tr key={p.id} className="border-b border-aam-border/50">
                  <td className="py-3 font-medium text-aam-text">{p.guruNama}</td>
                  <td className="py-3 text-aam-text-muted">{p.mapelNama}</td>
                  <td className="py-3">
                    <Badge variant="gray">{p.kelasNama}</Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="secondary" size="sm" icon="swap_horiz" onClick={() => openGanti(p)}>
                        Ganti Guru
                      </Button>
                      <Button variant="secondary" size="sm" icon="delete" onClick={() => setDeleteTarget(p)}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : penugasanList.length === 0 ? (
          <EmptyState icon="assignment_ind" message="Belum ada penugasan" />
        ) : (
          penugasanList.map((p) => (
            <Card key={p.id} icon="assignment_ind" className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-aam-text">{p.guruNama}</p>
                  <p className="text-xs text-aam-text-muted">{p.mapelNama}</p>
                </div>
                <Badge variant="gray">{p.kelasNama}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon="swap_horiz" onClick={() => openGanti(p)}>
                  Ganti Guru
                </Button>
                <Button variant="secondary" size="sm" icon="delete" onClick={() => setDeleteTarget(p)}>
                  Hapus
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Penugasan"
        description={`Hapus penugasan ${deleteTarget?.guruNama} — ${deleteTarget?.mapelNama} (${deleteTarget?.kelasNama})?`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Ganti Guru dialog (§14.10.2 — id paket TETAP, hanya guruId berubah) */}
      {gantiTarget && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/40"
          onClick={() => !gantiSaving && setGantiTarget(null)}
        >
          <div
            className="bg-white rounded-t-md md:rounded-md w-full md:max-w-sm p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-aam-text mb-1">Ganti Guru Pengampu</h3>
            <p className="text-xs text-aam-text-muted mb-4">
              {gantiTarget.mapelNama} di {gantiTarget.kelasNama} — guru saat ini: {gantiTarget.guruNama}
            </p>
            <label className="block text-sm font-medium text-aam-text mb-1.5">Guru baru</label>
            <SearchSelect
              options={guruList.map((g) => ({ value: g.id, label: g.nama, subtitle: g.nip ?? undefined }))}
              value={gantiGuruId}
              onChange={(v) => setGantiGuruId(v as number | null)}
              placeholder="Pilih guru…"
              searchPlaceholder="Cari guru…"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => setGantiTarget(null)} disabled={gantiSaving}>
                Batal
              </Button>
              <Button
                size="sm"
                icon="swap_horiz"
                onClick={handleGantiGuru}
                loading={gantiSaving}
                disabled={!gantiGuruId || gantiGuruId === gantiTarget.guruId}
              >
                Simpan
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </PageContainer>
  );
}
