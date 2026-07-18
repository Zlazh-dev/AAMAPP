import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Siswa, Kelas, KelasListResponse } from '../../../api/client';
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
 * /admin/orang/siswa — POLA A list.
 * Desktop: table (foto, nama, NISN/NIS, kelas, status).
 * Mobile: card-list.
 * FilterBar: search + filter kelas + filter status.
 */
export function SiswaListPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [data, setData] = useState<Siswa[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    loadKelasOptions();
  }, []);

  useEffect(() => {
    loadSiswa();
  }, [search, filters]);

  const loadKelasOptions = async () => {
    try {
      const res = await api.adminGetKelas({ limit: 1000 });
      setKelasOptions(res.data.map((k) => ({ value: String(k.id), label: k.nama })));
    } catch {}
  };

  const loadSiswa = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetSiswa({
        q: search || undefined,
        kelasId: filters.kelasId ? parseInt(filters.kelasId) : undefined,
        status: filters.status || undefined,
        limit: 200,
      });
      setData(res.data);
      setTotal(res.total);
    } catch {
      show('error', 'Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const filterFields = [
    {
      key: 'kelasId',
      label: 'Kelas',
      type: 'select' as const,
      options: kelasOptions,
    },
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
            Data Siswa
          </h2>
          <p className="text-xs text-aam-text-muted">
            {loading ? 'Memuat...' : `${data.length} dari ${total} siswa`}
          </p>
        </div>
        <PageMenu
          menuTitle="Menu Data Orang"
          actions={[
            {
              key: 'tambah',
              label: 'Tambah Siswa',
              icon: 'person_add',
              variant: 'primary',
              onClick: () => navigate('/admin/orang/siswa/baru'),
            },
          ]}
          links={[
            { key: 'guru', label: 'Data Guru', path: '/admin/orang/guru', icon: 'school' },
            { key: 'import', label: 'Import Excel', path: '/admin/orang/import', icon: 'upload_file' },
          ]}
        />
      </div>

      {/* SubPageLinks — desktop navigation to sibling sub-pages (v0.12.0) */}
      <SubPageLinks
        links={[
          { key: 'guru', label: 'Guru', path: '/admin/orang/guru', icon: 'school' },
          { key: 'import', label: 'Import', path: '/admin/orang/import', icon: 'upload_file' },
        ]}
      />

      {/* FilterBar */}
      <div className="mb-4">
        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'Cari nama siswa...' }}
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
              <th className="pb-2 font-medium">NIS</th>
              <th className="pb-2 font-medium">NISN</th>
              <th className="pb-2 font-medium">Kelas</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={6}><TableSkeleton rows={4} cols={5} /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="person_off" message="Belum ada data siswa" /></td></tr>
            ) : (
              data.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/admin/orang/siswa/${s.id}`)}
                  className="border-b border-aam-border/50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {s.fotoUrl ? (
                        <img src={s.fotoUrl} alt={s.nama} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-aam-green flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                          {s.nama.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-aam-text">{s.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 text-aam-text-muted">{s.nis}</td>
                  <td className="py-3 text-aam-text-muted">{s.nisn || '—'}</td>
                  <td className="py-3 text-aam-text-muted">{s.kelas?.nama || '—'}</td>
                  <td className="py-3">
                    <Badge variant={s.status === 'aktif' ? 'green' : 'gray'}>
                      {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
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
        ) : data.length === 0 ? (
          <EmptyState icon="person_off" message="Belum ada data siswa" />
        ) : (
          data.map((s) => (
            <Card
              key={s.id}
              icon="diversity_3"
              onClick={() => navigate(`/admin/orang/siswa/${s.id}`)}
              className="p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                {s.fotoUrl ? (
                  <img src={s.fotoUrl} alt={s.nama} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-aam-green flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {s.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-aam-text truncate">{s.nama}</p>
                  <p className="text-xs text-aam-text-muted truncate">NIS: {s.nis}</p>
                </div>
                <Badge variant={s.status === 'aktif' ? 'green' : 'gray'}>
                  {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-aam-text-muted">
                <span>Kelas: {s.kelas?.nama || '—'}</span>
                {s.nisn && <span>NISN: {s.nisn}</span>}
              </div>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
