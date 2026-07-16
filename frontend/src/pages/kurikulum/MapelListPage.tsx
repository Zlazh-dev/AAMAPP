import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Mapel } from '../../api/client';
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: mapelList, total, loading, refresh } = useCachedList<Mapel>(
    () => api.getMapel({ q: debouncedSearch || undefined, limit: 200 }),
    `/kurikulum/mapel?q=${debouncedSearch}`,
    [debouncedSearch],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteMapel(deleteTarget.id);
      toast.show('success', 'Mata pelajaran dihapus');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.show('error', 'Gagal menghapus mata pelajaran');
    }
  };

  return (
    <PageContainer size="xl">
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

      {/* FilterBar */}
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

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">Kode</th>
              <th className="pb-2 font-medium">Kelompok</th>
              <th className="pb-2 font-medium">Urutan</th>
              <th className="pb-2 font-medium"></th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={6}><TableSkeleton rows={4} cols={4} /></td></tr>
            ) : mapelList.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="book" message="Belum ada mata pelajaran" /></td></tr>
            ) : (
              mapelList
                .sort((a, b) => a.urutan - b.urutan)
                .map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/kurikulum/mapel/${m.id}/edit`)}
                  className="border-b border-aam-border/50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 font-medium text-aam-text">{m.nama}</td>
                  <td className="py-3 text-aam-text-muted font-mono text-xs">{m.kode}</td>
                  <td className="py-3 text-aam-text-muted">{m.kelompok}</td>
                  <td className="py-3 text-aam-text-muted">{m.urutan}</td>
                  <td className="py-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="delete"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
                    >
                      Hapus
                    </Button>
                  </td>
                  <td className="py-3">
                    <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span>
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
        ) : mapelList.length === 0 ? (
          <EmptyState icon="book" message="Belum ada mata pelajaran" />
        ) : (
          mapelList
            .sort((a, b) => a.urutan - b.urutan)
            .map((m) => (
            <Card
              key={m.id}
              icon="book"
              onClick={() => navigate(`/kurikulum/mapel/${m.id}/edit`)}
              className="p-4"
            >
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-aam-text">{m.nama}</p>
                <Badge variant="gray">{m.kode}</Badge>
              </div>
              <p className="text-xs text-aam-text-muted mb-3">{m.kelompok}</p>
              <Button
                variant="secondary"
                size="sm"
                icon="delete"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(m); }}
              >
                Hapus
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Mata Pelajaran"
        description={`Hapus ${deleteTarget?.nama}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageContainer>
  );
}
