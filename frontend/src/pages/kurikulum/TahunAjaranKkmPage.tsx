import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type TahunAjaran, type KkmPengaturan } from '../../api/client';
import { BackLink } from '../../components/BackLink';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { UnsavedGuard } from '../../components/UnsavedGuard';
import { useToast } from '../../components/Toast';
import { PageContainer } from '../../components/PageContainer';
import { Table, ColumnDef } from '../../components/Table';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';
const EMPTY_KKM: KkmPengaturan = { nilai: 75 };

/**
 * /kurikulum/tahun-ajaran-kkm — Tahun Ajaran & KKM digabung (IA-HIERARCHY-V2).
 * Sub dari Mata Pelajaran.
 */
export function TahunAjaranKkmPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [list, setList] = useState<TahunAjaran[]>([]);
  const [loadingTa, setLoadingTa] = useState(true);
  const [activateTarget, setActivateTarget] = useState<TahunAjaran | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TahunAjaran | null>(null);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [kkm, setKkm] = useState<KkmPengaturan>(EMPTY_KKM);
  const [kkmOriginal, setKkmOriginal] = useState<KkmPengaturan>(EMPTY_KKM);
  const [kkmBy, setKkmBy] = useState<string | null>(null);
  const [kkmAt, setKkmAt] = useState<string | null>(null);
  const [loadingKkm, setLoadingKkm] = useState(true);
  const [savingKkm, setSavingKkm] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const data = await api.adminListTahunAjaran();
      setList(data);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat tahun ajaran');
    } finally {
      setLoadingTa(false);
    }
  }, [toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await api.getPengaturanByKey('kkm');
        if (cancelled) return;
        const val = { ...EMPTY_KKM, ...row.value };
        setKkm(val);
        setKkmOriginal(val);
        setKkmBy(row.updatedByName);
        setKkmAt(row.updatedAt);
      } catch (err) {
        if (!cancelled) toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat KKM');
      } finally {
        if (!cancelled) setLoadingKkm(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirtyKkm = JSON.stringify(kkm) !== JSON.stringify(kkmOriginal);

  const handleActivate = async () => {
    if (!activateTarget) return;
    setActivating(true);
    try {
      await api.adminAktifkanTahunAjaran(activateTarget.id);
      toast.show('success', `${activateTarget.nama} Semester ${activateTarget.semester} diaktifkan`);
      setActivateTarget(null);
      fetchList();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal mengaktifkan';
      toast.show('error', msg);
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteTahunAjaran(deleteTarget.id);
      toast.show('success', 'Tahun ajaran dihapus');
      setDeleteTarget(null);
      fetchList();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menghapus';
      toast.show('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveKkm = async () => {
    setSavingKkm(true);
    try {
      const row = await api.adminUpdatePengaturan('kkm', kkm);
      setKkm(row.value);
      setKkmOriginal(row.value);
      setKkmBy(row.updatedByName);
      setKkmAt(row.updatedAt);
      toast.show('success', 'KKM berhasil disimpan');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan';
      toast.show('error', msg);
    } finally {
      setSavingKkm(false);
    }
  };

  const columns: ColumnDef<TahunAjaran>[] = [
    {
      header: 'Tahun Ajaran',
      cell: (ta) => <span className="font-medium text-aam-text">{ta.nama}</span>,
    },
    {
      header: 'Semester',
      cell: (ta) => ta.semester === 1 ? 'Ganjil' : 'Genap',
    },
    {
      header: 'Status',
      cell: (ta) => ta.aktif
        ? <Badge variant="green">Aktif</Badge>
        : <Badge variant="gray">Nonaktif</Badge>,
    },
    {
      header: '',
      cell: (ta) => (
        <div className="flex items-center gap-1 justify-end">
          {!ta.aktif && (
            <button
              type="button"
              onClick={() => setActivateTarget(ta)}
              disabled={activating}
              className="text-xs text-aam-green underline px-2 py-1"
            >
              Aktifkan
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteTarget(ta)}
            disabled={ta.aktif || deleting}
            aria-label="Hapus"
            className="text-aam-text-muted hover:text-red-600 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <UnsavedGuard dirty={dirtyKkm}>
      <PageContainer size="lg" bottomBar>
        <BackLink to="/kurikulum/mapel" />
        <div className="flex items-center justify-between mt-4 mb-1 flex-wrap gap-2">
          <h2 className="text-lg font-heading font-semibold text-aam-text">Tahun Ajaran &amp; KKM</h2>
          <Button size="sm" icon="add" onClick={() => navigate('/kurikulum/tahun-ajaran/baru')}>
            Tambah Tahun Ajaran
          </Button>
        </div>
        <p className="text-xs text-aam-text-muted mb-6">Kelola tahun ajaran aktif dan KKM global</p>

        <section className="mb-8">
          <h3 className="text-sm font-semibold text-aam-text mb-3">Tahun Ajaran</h3>
          {loadingTa ? (
            <div className="text-center text-sm text-aam-text-muted py-8">Memuat…</div>
          ) : list.length === 0 ? (
            <Card icon="date_range" className="text-center">
              <span className="material-symbols-outlined text-aam-text-muted mb-2" style={{ fontSize: '3rem' }}>inbox</span>
              <p className="text-sm text-aam-text-muted">Belum ada tahun ajaran. Tambahkan untuk mulai.</p>
            </Card>
          ) : (
            <Table<TahunAjaran>
              columns={columns}
              data={list}
              rowKey={(ta) => ta.id}
              emptyMessage="Belum ada tahun ajaran"
            />
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-aam-text mb-3">KKM (Kriteria Ketuntasan Minimal)</h3>
          {loadingKkm ? (
            <div className="text-center text-sm text-aam-text-muted py-8">Memuat…</div>
          ) : (
            <Card icon="flag">
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="kkm-nilai">Nilai KKM</label>
                  <input
                    id="kkm-nilai"
                    type="number"
                    min={0}
                    max={100}
                    value={kkm.nilai}
                    onChange={(e) => setKkm((prev) => ({ ...prev, nilai: parseInt(e.target.value) || 0 }))}
                    className={inputClass}
                  />
                  <p className="text-xs text-aam-text-muted mt-1.5">Rentang 0–100. Nilai default 75.</p>
                </div>
                <div className="border-t border-aam-border pt-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-xs text-aam-text-muted">
                    {kkmBy && (
                      <span>
                        Terakhir disimpan oleh <strong className="text-aam-text">{kkmBy}</strong>
                        {kkmAt && ` · ${new Date(kkmAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}
                      </span>
                    )}
                  </div>
                  <Button onClick={handleSaveKkm} loading={savingKkm} disabled={!dirtyKkm} icon="save">
                    Simpan
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </section>

        <ConfirmDialog
          open={!!activateTarget}
          title="Aktifkan Tahun Ajaran?"
          description={
            activateTarget
              ? `Mengaktifkan ${activateTarget.nama} Semester ${activateTarget.semester === 1 ? 'Ganjil' : 'Genap'} akan menonaktifkan tahun ajaran aktif saat ini.`
              : ''
          }
          confirmLabel="Ya, Aktifkan"
          cancelLabel="Batal"
          variant="primary"
          onConfirm={handleActivate}
          onCancel={() => setActivateTarget(null)}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title="Hapus Tahun Ajaran?"
          description={
            deleteTarget
              ? `Yakin menghapus ${deleteTarget.nama} Semester ${deleteTarget.semester === 1 ? 'Ganjil' : 'Genap'}? Tindakan ini tidak dapat dibatalkan.`
              : ''
          }
          confirmLabel="Hapus"
          cancelLabel="Batal"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </PageContainer>
    </UnsavedGuard>
  );
}
