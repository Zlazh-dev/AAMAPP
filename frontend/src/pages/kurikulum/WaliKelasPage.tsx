import React, { useState, useEffect } from 'react';
import { api, Kelas, Guru } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { BackLink } from '../../components/BackLink';
import { useToast } from '../../components/Toast';

/**
 * /kurikulum/wali-kelas — Tabel kelas + wali + jumlah siswa (T15 §14.10.3).
 * Tetapkan/Ganti wali via inline select (pilihan cepat §6.1A(3)).
 */
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
          api.adminGetKelas({ limit: 200 }),
          api.adminGetGuru({ limit: 200 }),
        ]);
        if (cancelled) return;
        setKelasList(kelasRes.data);
        setGuruList(guruRes.data);
      } catch {
        if (!cancelled) toast.show('error', 'Gagal memuat data');
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
    } catch {
      toast.show('error', 'Gagal mengatur wali kelas');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <PageContainer size="xl">
      <BackLink to="/kurikulum/penugasan" />
      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Wali Kelas
          </h2>
          <p className="text-xs text-aam-text-muted">{kelasList.length} kelas</p>
        </div>
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-aam-border text-left text-xs text-aam-text-muted">
              <th className="pb-2 font-medium">Kelas</th>
              <th className="pb-2 font-medium">Wali</th>
              <th className="pb-2 font-medium">Jumlah Siswa</th>
              <th className="pb-2 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={4}><TableSkeleton rows={4} cols={3} /></td></tr>
            ) : kelasList.length === 0 ? (
              <tr><td colSpan={4}><EmptyState icon="meeting_room" message="Belum ada kelas" /></td></tr>
            ) : (
              kelasList.map((k) => (
                <tr key={k.id} className="border-b border-aam-border/50">
                  <td className="py-3 font-medium text-aam-text">{k.nama}</td>
                  <td className="py-3 text-aam-text-muted">
                    {k.waliGuru ? k.waliGuru.nama : <span className="text-aam-text-muted">—</span>}
                  </td>
                  <td className="py-3">
                    <Badge variant="gray">—</Badge>
                  </td>
                  <td className="py-3">
                    <select
                      value={k.waliGuruId ?? ''}
                      onChange={(e) => handleSetWali(k.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                      disabled={updating === k.id}
                      className="rounded-md border border-aam-border px-2 py-1.5 text-xs outline-none focus:border-aam-green min-h-[36px]"
                    >
                      <option value="">— pilih wali —</option>
                      {guruList.map((g) => (
                        <option key={g.id} value={g.id}>{g.nama}</option>
                      ))}
                    </select>
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
        ) : kelasList.length === 0 ? (
          <EmptyState icon="meeting_room" message="Belum ada kelas" />
        ) : (
          kelasList.map((k) => (
            <Card key={k.id} icon="meeting_room" className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-aam-text">{k.nama}</p>
                <Badge variant="gray">—</Badge>
              </div>
              <p className="text-xs text-aam-text-muted mb-2">
                Wali: {k.waliGuru ? k.waliGuru.nama : 'Belum ditetapkan'}
              </p>
              <select
                value={k.waliGuruId ?? ''}
                onChange={(e) => handleSetWali(k.id, e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={updating === k.id}
                className="w-full rounded-md border border-aam-border px-3 py-2 text-xs outline-none focus:border-aam-green min-h-[44px]"
              >
                <option value="">— pilih wali —</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
