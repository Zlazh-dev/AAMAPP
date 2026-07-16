import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Guru, GuruListResponse } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLinks } from '../../../components/SubPageLinks';
import { FilterBar, FilterValues } from '../../../components/FilterBar';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/orang/guru — POLA A list.
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

  useEffect(() => {
    loadGuru();
  }, [search, filters]);

  const loadGuru = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetGuru({
        q: search || undefined,
        status: filters.status || undefined,
        limit: 200,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      show('error', 'Gagal memuat data guru');
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
    <PageContainer size="xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Data Guru
          </h2>
          <p className="text-xs text-aam-text-muted">
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
              onClick: () => navigate('/admin/orang/guru/baru'),
            },
          ]}
          links={[
            { key: 'siswa', label: 'Data Siswa', path: '/admin/orang/siswa', icon: 'diversity_3' },
            { key: 'import', label: 'Import Excel', path: '/admin/orang/import', icon: 'upload_file' },
          ]}
        />
      </div>

      {/* SubPageLinks — desktop navigation to sibling sub-pages (v0.12.0) */}
      <SubPageLinks
        links={[
          { key: 'siswa', label: 'Siswa', path: '/admin/orang/siswa', icon: 'diversity_3' },
          { key: 'import', label: 'Import', path: '/admin/orang/import', icon: 'upload_file' },
        ]}
      />

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
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Nama</th>
              <th className="pb-2 font-medium">NIP</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Akun</th>
              <th className="pb-2 font-medium">Paket</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={6}><TableSkeleton rows={4} cols={5} /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="person_off" message="Belum ada data guru" /></td></tr>
            ) : (
              data.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => navigate(`/admin/orang/guru/${g.id}`)}
                  className="border-b border-aam-border/50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3">
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
                  </td>
                  <td className="py-3 text-aam-text-muted">{g.nip || '—'}</td>
                  <td className="py-3">
                    <Badge variant={g.status === 'aktif' ? 'green' : 'gray'}>
                      {g.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {g.punyaAkun ? (
                      <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>link</span>
                    ) : (
                      <span className="text-aam-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 text-aam-text-muted">{g.jumlahPaket}</td>
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
          <EmptyState icon="person_off" message="Belum ada data guru" />
        ) : (
          data.map((g) => (
            <Card
              key={g.id}
              icon="school"
              onClick={() => navigate(`/admin/orang/guru/${g.id}`)}
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
    </PageContainer>
  );
}
