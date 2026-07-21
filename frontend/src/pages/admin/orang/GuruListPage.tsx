import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Guru, GuruListResponse , ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { Pagination } from '../../../components/Pagination';
import { FilterBar, FilterValues } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';
import { Table, ColumnDef } from '../../../components/Table';

/**
 * /kurikulum/orang/guru — POLA A list.
 * Desktop: table (foto, nama, NIP, status, akun, paket).
 * Mobile: card-list.
 * PageMenu: + Tambah (primary) + Buka Halaman (Siswa, Import).
 */
export function GuruListPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [data, setData] = useState<Guru[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadGuru();
  }, [search, filters, page]);

  useEffect(() => { setPage(1); }, [search, filters]);

  const loadGuru = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetGuru({
        q: search || undefined,
        status: filters.status || undefined,
        page,
        limit: 25,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  };

  const filterFields = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'aktif', label: 'Aktif' },
        { value: 'nonaktif', label: 'Nonaktif' },
      ],
    },
  ];

  return (
    <PageContainer size="xl" backLinkMobile={false}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-aam-text">
            Data Guru
          </h1>
          <p className="text-sm text-aam-text-muted mt-1">
            {loading ? 'Memuat...' : `${data.length} dari ${total} guru`}
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Data Orang"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Guru',
              icon: 'person_add',
              variant: 'primary',
              onClick: () => navigate('/kurikulum/orang/guru/baru'),
            },
          ]}
          links={[
            { key: 'siswa', label: 'Data Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
            { key: 'import', label: 'Import Excel', path: '/kurikulum/orang/import', icon: 'upload_file' },
          ]}
        />
      </div>

      <SubPageLayout
        links={[
          { key: 'siswa', label: 'Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3', description: 'Data induk siswa' },
          { key: 'import', label: 'Import', path: '/kurikulum/orang/import', icon: 'upload_file', description: 'Impor massal guru & siswa' },
        ]}
      >

      {/* FilterBar */}
      <div className="mb-4">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Cari nama guru...' }}
          filters={filterFields}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState icon="person_off" message="Belum ada data guru" />
        ) : (
          <Table<Guru>
            columns={[
              {
                header: 'Nama',
                cell: (g) => (
                  <div className="flex items-center gap-2">
                    {g.fotoUrl ? (
                      <img src={g.fotoUrl} alt={g.nama} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-aam-green flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {g.nama.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-aam-text">{g.nama}</span>
                  </div>
                ),
              },
              { header: 'NIP', cellClass: 'text-aam-text-muted', cell: (g) => g.nip || '—' },
              { header: 'Status', cell: (g) => (
                <Badge variant={g.status === 'aktif' ? 'green' : 'gray'}>
                  {g.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              )},
              { header: 'Akun', cell: (g) => g.punyaAkun ? (
                <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>link</span>
              ) : <span className="text-aam-text-muted text-xs">—</span> },
              { header: 'Paket', align: 'right', cell: (g) => String(g.jumlahPaket) },
              { header: '', align: 'right', cell: () => (
                <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span>
              )},
            ] as ColumnDef<Guru>[]}
            data={data}
            rowKey={(g) => g.id}
            onRowClick={(g) => navigate(`/kurikulum/orang/guru/${g.id}`)}
          />
        )}
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : data.length === 0 ? (
          <EmptyState icon="person_off" message="Belum ada data guru" />
        ) : (
          data.map((g) => (
            <Card
              key={g.id}
              icon="school"
              onClick={() => navigate(`/kurikulum/orang/guru/${g.id}`)}
              className="p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                {g.fotoUrl ? (
                  <img src={g.fotoUrl} alt={g.nama} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-aam-green flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {g.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-aam-text truncate">{g.nama}</p>
                  <p className="text-xs text-aam-text-muted truncate">NIP: {g.nip || '—'}</p>
                </div>
                <Badge variant={g.status === 'aktif' ? 'green' : 'gray'}>
                  {g.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-aam-text-muted">
                {g.punyaAkun && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-aam-green" style={{ fontSize: '0.875rem' }}>link</span>Berakun</span>}
                <span>{g.jumlahPaket} paket</span>
              </div>
            </Card>
           ))
         )}
       </div>
       <Pagination page={page} limit={25} total={total} onPageChange={setPage} loading={loading} />
      </SubPageLayout>
    </PageContainer>
  );
}
