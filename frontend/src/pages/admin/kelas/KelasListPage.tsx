import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Kelas, KelasListResponse } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { FilterBar, FilterValues } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/kelas — POLA A list.
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
  const [filters, setFilters] = useState<FilterValues>({});

  useEffect(() => {
    loadKelas();
  }, [search, filters]);

  const loadKelas = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetKelas({
        q: search || undefined,
        tingkat: filters.tingkat ? parseInt(filters.tingkat) : undefined,
        limit: 200,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      show('error', 'Gagal memuat data kelas');
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
    <PageContainer size="xl">
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
              onClick: () => navigate('/admin/kelas/baru'),
            },
          ]}
          links={[
            { key: 'guru', label: 'Data Guru', path: '/admin/orang/guru', icon: 'school' },
            { key: 'siswa', label: 'Data Siswa', path: '/admin/orang/siswa', icon: 'diversity_3' },
          ]}
        />
      </div>

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

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">Tingkat</th>
              <th className="pb-2 font-medium">Fase</th>
              <th className="pb-2 font-medium">Wali Kelas</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={5}><TableSkeleton rows={4} cols={4} /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5}><EmptyState icon="door_closed" message="Belum ada data kelas" /></td></tr>
            ) : (
              data.map((k) => (
                <tr
                  key={k.id}
                  onClick={() => navigate(`/admin/kelas/${k.id}`)}
                  className="border-b border-aam-border/50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 font-medium text-aam-text">{k.nama}</td>
                  <td className="py-3 text-aam-text-muted">{k.tingkat}</td>
                  <td className="py-3"><Badge variant="purple">Fase {k.fase}</Badge></td>
                  <td className="py-3 text-aam-text-muted">{k.waliGuru?.nama || '—'}</td>
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
        ) : data.length === 0 ? (
          <EmptyState icon="door_closed" message="Belum ada data kelas" />
        ) : (
          data.map((k) => (
            <Card
              key={k.id}
              icon="meeting_room"
              onClick={() => navigate(`/admin/kelas/${k.id}`)}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-aam-text">{k.nama}</p>
                <Badge variant="purple">Fase {k.fase}</Badge>
              </div>
              <div className="text-xs text-aam-text-muted">
                <span>Tingkat {k.tingkat}</span>
                {k.waliGuru && <span className="ml-3">Wali: {k.waliGuru.nama}</span>}
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
