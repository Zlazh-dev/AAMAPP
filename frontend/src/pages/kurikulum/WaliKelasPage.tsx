import React, { useState, useEffect } from 'react';
import { api, Kelas, Guru , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { TableSkeleton } from '../../components/Skeleton';
import { BackLink } from '../../components/BackLink';
import { useToast } from '../../components/Toast';
import { Table, ColumnDef } from '../../components/Table';

export function WaliKelasPage() {
  const toast = useToast();
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [kelasRes, guruRes] = await Promise.all([
          api.adminGetKelas({ limit: 1000 }),
          api.adminGetGuru({ limit: 1000 }),
        ]);
        if (cancelled) return;
        setKelasList(kelasRes.data);
        setGuruList(guruRes.data);
      } catch (err) {
        if (!cancelled) toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSetWali = async (kelasId: number, waliGuruId: number | null) => {
    setUpdating(kelasId);
    try {
      await api.adminSetWaliKelas(kelasId, { waliGuruId, force: true });
      setKelasList((prev) =>
        prev.map((k) =>
          k.id === kelasId
            ? { ...k, waliGuruId, waliGuru: waliGuruId ? guruList.find((g) => g.id === waliGuruId) || null : null }
            : k,
        ),
      );
      toast.show('success', 'Wali kelas diperbarui');
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal mengatur wali kelas');
    } finally {
      setUpdating(null);
    }
  };

  const columns: ColumnDef<Kelas>[] = [
    {
      header: 'Kelas',
      cell: (k) => <span className="font-medium text-aam-text">{k.nama}</span>,
    },
    {
      header: 'Wali Saat Ini',
      cell: (k) => k.waliGuru
        ? <span className="text-aam-text">{k.waliGuru.nama}</span>
        : <span className="text-aam-text-muted">&mdash;</span>,
    },
    {
      header: 'Ganti Wali',
      cell: (k) => (
        <select
          value={k.waliGuruId ?? ''}
          onChange={(e) => handleSetWali(k.id, e.target.value ? parseInt(e.target.value, 10) : null)}
          disabled={updating === k.id}
          className="rounded-md border border-aam-border px-2 py-1.5 text-xs outline-none focus:border-aam-green min-h-[36px]"
        >
          <option value="">-- pilih wali --</option>
          {guruList.map((g) => (
            <option key={g.id} value={g.id}>{g.nama}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <PageContainer size="xl" bottomBar>
      <BackLink to="/kurikulum/kelas" />
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">Wali Kelas</h2>
          <p className="text-xs text-aam-text-muted">{kelasList.length} kelas</p>
        </div>
      </div>
      {loading ? <TableSkeleton rows={4} cols={3} /> : (
        <Table<Kelas> columns={columns} data={kelasList} rowKey={(k) => k.id} emptyMessage="Belum ada kelas" />
      )}
    </PageContainer>
  );
}