import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';

interface GuruWajahRow {
  id: number;
  nama: string;
  email: string;
  enrolled: boolean;
  poses: number;
  faceUpdatedAt: string | null;
}

interface WajahListResponse {
  data: GuruWajahRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * WajahListPage — /admin/wajah
 *
 * Daftar guru + status enrollment wajah. Admin bisa klik
 * "Daftarkan" atau "Perbarui" untuk masuk ke wizard.
 * "Hapus" untuk clear faceEmbeddings (GDPR/privasi).
 */
export function WajahListPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [rows, setRows] = useState<GuruWajahRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminGetWajah({ q, page, limit: LIMIT }) as WajahListResponse;
      setRows(res.data);
      setTotal(res.total);
    } catch {
      show('error', 'Gagal memuat daftar wajah guru');
    } finally {
      setLoading(false);
    }
  }, [q, page, show]);

  useEffect(() => { load(); }, [load]);

  const handleHapus = async (row: GuruWajahRow) => {
    if (!confirm(`Hapus data wajah ${row.nama}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await api.adminDeleteWajah(row.id);
      show('success', `Data wajah ${row.nama} dihapus`);
      load();
    } catch (err: unknown) {
      show('error', err instanceof Error ? err.message : 'Gagal menghapus data wajah');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <PageContainer size="xl">
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Pendaftaran Wajah Guru
          </h2>
          <p className="text-xs text-aam-text-muted">
            Kelola data biometrik wajah untuk presensi mandiri guru.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card icon="search" className="p-3 mb-4">
        <input
          type="text"
          placeholder="Cari nama atau email guru…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="w-full max-w-sm rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
        />
      </Card>

      {/* Table desktop */}
      <div className="hidden md:block">
        <Card icon="face" className="overflow-hidden p-0">
          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : rows.length === 0 ? (
            <EmptyState icon="face" message="Tidak ada data guru" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-aam-border bg-aam-surface text-left">
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Nama Guru</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Email</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Status Wajah</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted">Terakhir Diperbarui</th>
                  <th className="px-4 py-3 font-medium text-aam-text-muted text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-aam-border last:border-0 hover:bg-aam-surface/50">
                    <td className="px-4 py-3 font-medium text-aam-text">{row.nama}</td>
                    <td className="px-4 py-3 text-aam-text-muted">{row.email}</td>
                    <td className="px-4 py-3">
                      {row.enrolled ? (
                        <Badge variant="green">{row.poses} pose</Badge>
                      ) : (
                        <Badge variant="yellow">Belum daftar</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-aam-text-muted text-xs">
                      {row.faceUpdatedAt
                        ? new Date(row.faceUpdatedAt).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          id={`btn-enroll-${row.id}`}
                          onClick={() => navigate(`/admin/wajah/${row.id}`)}
                          className="rounded-md border border-aam-border px-3 py-1 text-xs font-medium text-aam-text hover:border-aam-green/40 hover:text-aam-green"
                        >
                          {row.enrolled ? 'Perbarui' : 'Daftarkan'}
                        </button>
                        {row.enrolled && (
                          <button
                            id={`btn-hapus-wajah-${row.id}`}
                            onClick={() => handleHapus(row)}
                            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-aam-border" />
          ))
        ) : rows.length === 0 ? (
          <Card icon="face" className="p-0">
            <EmptyState icon="face" message="Tidak ada data guru" />
          </Card>
        ) : rows.map((row) => (
          <Card key={row.id} icon="face" className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-aam-text truncate">{row.nama}</p>
                <p className="text-xs text-aam-text-muted">{row.email}</p>
              </div>
              {row.enrolled ? (
                <Badge variant="green">{row.poses} pose</Badge>
              ) : (
                <Badge variant="yellow">Belum daftar</Badge>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => navigate(`/admin/wajah/${row.id}`)}
                className="flex-1 rounded-md border border-aam-border py-2 text-xs font-medium text-aam-text"
              >
                {row.enrolled ? 'Perbarui' : 'Daftarkan'}
              </button>
              {row.enrolled && (
                <button
                  onClick={() => handleHapus(row)}
                  className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                >
                  Hapus
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-aam-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ‹ Sebelumnya
          </button>
          <span className="px-3 py-1.5 text-sm text-aam-text-muted">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-aam-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </PageContainer>
  );
}
