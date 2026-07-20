import React, { useState, useEffect, useCallback } from 'react';
import { api, Kelas, Guru, ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { TableSkeleton } from '../../components/Skeleton';
import { BackLink } from '../../components/BackLink';
import { Pagination } from '../../components/Pagination';
import { Table, ColumnDef } from '../../components/Table';
import { SearchSelect } from '../../components/SearchSelect';
import { useToast } from '../../components/Toast';

/**
 * /kurikulum/wali-kelas — penugasan wali kelas.
 * Sub dari Kelas (IA-HIERARCHY-V2).
 *
 * Daftar kelas: paginasi 25 (bukan 1000).
 * Pemilih guru: SearchSelect dgn onSearch sisi-server (bukan 1000 opsi).
 */
export function WaliKelasPage() {
  const toast = useToast();
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const kelasRes = await api.adminGetKelas({ page, limit: 25 });
      setKelasList(kelasRes.data);
      setMeta({ total: kelasRes.total, page: kelasRes.page, limit: kelasRes.limit });
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  // Pencarian guru sisi-server (bukan ambil 1000 baris).
  const searchGuru = useCallback(async (q: string) => {
    const res = await api.adminGetGuru({ q: q || undefined, limit: 20 });
    return res.data.map((g) => ({ value: g.id, label: g.nama }));
  }, []);

  const handleSetWali = async (kelasId: number, waliGuruId: number | null) => {
    setUpdating(kelasId);
    try {
      await api.adminSetWaliKelas(kelasId, { waliGuruId, force: true });
      setKelasList((prev) =>
        prev.map((k) =>
          k.id === kelasId
            ? { ...k, waliGuruId }
            : k
        )
      );
      toast.show('success', 'Wali kelas diperbarui');
      load();
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memperbarui wali');
    } finally {
      setUpdating(null);
    }
  };

  const columns: ColumnDef<Kelas>[] = [
    { header: 'Kelas', cell: (k) => <span className="font-medium text-aam-text">{k.nama}</span> },
    { header: 'Tingkat', cell: (k) => String(k.tingkat) },
    {
      header: 'Wali Kelas',
      cell: (k) => (
        <SearchSelect
          options={k.waliGuruId ? [{ value: k.waliGuruId, label: k.waliGuru?.nama ?? `Guru #${k.waliGuruId}` }] : []}
          value={k.waliGuruId ?? null}
          onChange={(v) => handleSetWali(k.id, v != null ? Number(v) : null)}
          placeholder="-- pilih wali --"
          searchPlaceholder="Cari nama guru..."
          clearable
          onSearch={searchGuru}
          disabled={updating === k.id}
        />
      ),
    },
  ];

  return (
    <PageContainer size="xl" bottomBar>
      <BackLink to="/kurikulum/kelas" />
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">Wali Kelas</h2>
          <p className="text-xs text-aam-text-muted">{meta.total} kelas</p>
        </div>
      </div>
      {loading ? <TableSkeleton rows={4} cols={3} /> : (
        <>
          <Table<Kelas> columns={columns} data={kelasList} rowKey={(k) => k.id} emptyMessage="Belum ada kelas" />
          <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} loading={loading} />
        </>
      )}
    </PageContainer>
  );
}