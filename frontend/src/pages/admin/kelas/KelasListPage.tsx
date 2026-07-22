import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Kelas, KelasListResponse , ApiError } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { Table } from '../../../components/Table';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLayout } from '../../../components/SubPageLinks';
import { Pagination } from '../../../components/Pagination';
import { FilterBar, FilterValues } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';

const KELAS_SUB_LINKS = [
  { key: 'wali', label: 'Wali Kelas', path: '/kurikulum/wali-kelas', icon: 'manage_accounts', description: 'Penugasan wali kelas' },
  { key: 'leger', label: 'Leger Kelas', path: '/kurikulum/leger', icon: 'table_view', description: 'Lihat matriks nilai kelas' },
];

/**
 * /kurikulum/kelas — POLA A list.
 * Desktop: table (nama, tingkat/fase, wali, jumlah siswa).
 * Mobile: card-list.
 */
export function KelasListPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [data, setData] = useState<Kelas[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  useEffect(() => {
    loadKelas();
  }, [search, filters, page]);

  useEffect(() => { setPage(1); }, [search, filters]);

  const loadKelas = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetKelas({
        q: search || undefined,
        tingkat: filters.tingkat ? parseInt(filters.tingkat) : undefined,
        page,
        limit: 25,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  const filterFields = [
    {
      key: 'tingkat',
      label: 'Tingkat',
      type: 'select' as const,
      options: [
        { value: '7', label: 'Kelas 7' },
        { value: '8', label: 'Kelas 8' },
        { value: '9', label: 'Kelas 9' },
      ],
    },
  ];

  return (
    <PageContainer size="xl" backLinkMobile={false}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Data Kelas
          </h2>
          <p className="text-xs text-aam-text-muted">
            {loading ? 'Memuat...' : `${data.length} kelas`}
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Kelas"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Kelas',
              icon: 'add',
              variant: 'primary',
              onClick: () => navigate('/kurikulum/kelas/baru'),
            },
          ]}
          links={KELAS_SUB_LINKS}
        />
      </div>

      <SubPageLayout links={KELAS_SUB_LINKS}>

      {/* FilterBar */}
      <div className="mb-4">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Cari nama kelas...' }}
          filters={filterFields}
          values={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({})}
        />
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <>
        <Table
          columns={[
            { header: 'Nama', cell: (k: any) => <span className="font-medium text-aam-text">{k.nama}</span> },
            { header: 'Tingkat', cell: (k: any) => <span className="text-aam-text-muted">{k.tingkat}</span> },
            { header: 'Fase', cell: (k: any) => <Badge variant="purple">Fase {k.fase}</Badge> },
            { header: 'Wali Kelas', cell: (k: any) => <span className="text-aam-text-muted">{k.waliGuru?.nama || '\u2014'}</span> },
            { header: '', width: 'w-8', cell: () => <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>chevron_right</span> },
          ]}
          data={data}
          rowKey={(k: any) => k.id}
          emptyMessage="Belum ada data kelas"
          onRowClick={(k: any) => navigate(`/kurikulum/kelas/${k.id}`)}
        />
        <Pagination page={page} limit={25} total={total} onPageChange={setPage} loading={loading} />
        </>
      )}
      </SubPageLayout>
    </PageContainer>
  );
}

