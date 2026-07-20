import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type TahunAjaran } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';
import { Table, ColumnDef } from '../../../components/Table';

export function PengaturanTahunAjaranPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [list, setList] = useState<TahunAjaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [activateTarget, setActivateTarget] = useState<TahunAjaran | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TahunAjaran | null>(null);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const data = await api.adminListTahunAjaran();
      setList(data);
    } catch (err) {
      toast.show('error', 'Gagal memuat tahun ajaran');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

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
        : <span className="text-xs text-aam-text-muted">Nonaktif</span>,
    },
    {
      header: 'Aksi',
      align: 'right',
      cell: (ta) => (
        <div className="inline-flex items-center gap-1">
          {!ta.aktif && (
            <Button size="sm" variant="primary" icon="check_circle" onClick={() => setActivateTarget(ta)}>
              Aktifkan
            </Button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(ta); }}
            disabled={ta.aktif}
            className="p-2 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Hapus"
            title={ta.aktif ? 'Tidak dapat menghapus TA aktif' : 'Hapus'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <PageContainer size="xl">
        <BackLink to="/kurikulum" />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat.</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/kurikulum" />
      <div className="flex items-center justify-between mt-4 mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-heading font-semibold text-aam-text">Tahun Ajaran</h2>
        <Button size="sm" icon="add" onClick={() => navigate('/kurikulum/tahun-ajaran/baru')}>Tambah Tahun Ajaran</Button>
      </div>
      <p className="text-xs text-aam-text-muted mb-6">Kelola tahun ajaran dan semester aktif</p>

      {list.length === 0 ? (
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
  );
}