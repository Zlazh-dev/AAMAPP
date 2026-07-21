import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Mapel , ApiError } from '../../api/client';
import { useCachedList } from '../../hooks/useCachedList';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { PageMenu } from '../../components/PageMenu';
import { FilterBar } from '../../components/FilterBar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { SubPageLayout } from '../../components/SubPageLinks';
import { Pagination } from '../../components/Pagination';
import { Table } from '../../components/Table';

/** Sub halaman Mata Pelajaran (IA-HIERARCHY-V2). */
const MAPEL_SUB_LINKS = [
  { key: 'penugasan', label: 'Penugasan Mapel', path: '/kurikulum/penugasan', icon: 'assignment_ind', description: 'Guru pengampu per mapel dan kelas' },
  { key: 'kokurikuler', label: 'Kokurikuler', path: '/kurikulum/kokurikuler', icon: 'school', description: 'Kegiatan dan tim penilai per kelas' },
  { key: 'ekskul', label: 'Ekstrakurikuler', path: '/kurikulum/ekskul', icon: 'sports', description: 'Pembina dan daftar ekskul' },
  { key: 'ta-kkm', label: 'Tahun Ajaran & KKM', path: '/kurikulum/tahun-ajaran-kkm', icon: 'event_note', description: 'Aktifkan TA dan nilai KKM global' },
];

/**
 * /kurikulum/mapel — Daftar Mata Pelajaran (POLA A, §14.10.3).
 * Tabel desktop, card-list mobile. Search server-side.
 */
export function MapelListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Mapel | null>(null);

  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: mapelList, total, loading, refresh } = useCachedList<Mapel>(
    () => api.getMapel({ q: debouncedSearch || undefined, page, limit: 25 }),
    `/kurikulum/mapel?q=${debouncedSearch}&p=${page}`,
    [debouncedSearch, page],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteMapel(deleteTarget.id);
      toast.show('success', 'Mata pelajaran dihapus');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal menghapus mata pelajaran');
    }
  };

  return (
    <PageContainer size="xl" backLinkMobile={false}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Mata Pelajaran
          </h2>
          <p className="text-xs text-aam-text-muted">
            {mapelList.length} dari {total} mapel
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Mapel"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Mapel',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/kurikulum/mapel/baru'),
            },
          ]}
          links={[]}
        />
      </div>

      <SubPageLayout links={MAPEL_SUB_LINKS}>

      <div className="mb-4">
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Cari nama atau kode mapel...',
          }}
          filters={[]}
          values={{}}
          onChange={() => {}}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <>
        <Table
          columns={[
            {
              header: 'Nama',
              cell: (m) => <span className="font-medium text-aam-text">{m.nama}</span>,
            },
            { header: 'Kode', cell: (m) => <span className="font-mono text-xs text-aam-text-muted">{m.kode}</span> },
            { header: 'Kelompok', cell: (m) => <span className="text-aam-text-muted">{m.kelompok}</span> },
            { header: 'Urutan', align: 'center' as const, cell: (m) => <span className="text-aam-text-muted">{m.urutan}</span> },
            {
              header: '',
              align: 'right' as const,
              cell: (m) => (
                <Button variant="secondary" size="sm" icon="delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}>Hapus</Button>
              ),
            },
            {
              header: '',
              width: 'w-8',
              cell: () => <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span>,
            },
          ]}
          data={[...mapelList].sort((a, b) => a.urutan - b.urutan)}
          rowKey={(m) => m.id}
          emptyMessage="Belum ada mata pelajaran"
          onRowClick={(m) => navigate(`/kurikulum/mapel/${m.id}/edit`)}
        />
        <Pagination page={page} limit={25} total={total} onPageChange={setPage} loading={loading} />
        </>
      )}


      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Mata Pelajaran"
        description={`Hapus ${deleteTarget?.nama}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      </SubPageLayout>
    </PageContainer>
  );
}
