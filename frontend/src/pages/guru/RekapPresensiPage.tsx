import React, { useState, useEffect, useMemo } from 'react';
import { api, ApiError, Kelas, GuruRekapPresensiEntry } from '../../api/client';
import { useAuth } from '../../app/AuthContext';
import { useToast } from '../../components/Toast';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';
import { BackLink } from '../../components/BackLink';
import { AdaptiveSelect } from '../../components/AdaptiveSelect';

/** WIB "hari ini" dalam format YYYY-MM-DD. */
function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/** 30 hari sebelum tanggal WIB hari ini, format YYYY-MM-DD (rentang default). */
function daysAgoWIB(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

const LIMIT = 20;

/**
 * /guru/rekap — Rekap Presensi per kelas (wali kelas | admin), F2-REKAP-FRONTEND.
 * Pilih kelas + rentang tanggal → tabel Σ H/S/I/A/T per siswa, berpaginasi.
 * Backend: GET /api/guru/kelas/rekap-presensi (RBAC: wali kelas ATAU admin;
 * 403 bila guru login bukan wali kelas terpilih).
 */
export function RekapPresensiPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const isAdmin = !!user?.roles.includes('admin');

  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([]);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [kelasId, setKelasId] = useState<string>('');
  const [dari, setDari] = useState<string>(daysAgoWIB(30));
  const [sampai, setSampai] = useState<string>(todayWIB());
  const [page, setPage] = useState(1);

  const [data, setData] = useState<GuruRekapPresensiEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // Muat daftar kelas sekali (admin: semua kelas; guru: tetap semua kelas
  // ditampilkan agar UI konsisten — server menolak 403 bila bukan wali
  // kelas yang dipilih, sesuai kontrak F2-SPEC).
  useEffect(() => {
    (async () => {
      setLoadingKelas(true);
      try {
        const res = await api.adminGetKelas({ limit: 1000 });
        setKelasOptions(res.data);
        if (res.data.length > 0) setKelasId(String(res.data[0].id));
      } catch {
        show('error', 'Gagal memuat daftar kelas');
      } finally {
        setLoadingKelas(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!kelasId || !dari || !sampai) return;
    let cancelled = false;
    setLoading(true);
    setForbidden(false);
    api
      .getGuruKelasRekapPresensi({ kelasId: Number(kelasId), dari, sampai, page, limit: LIMIT })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
          setData([]);
          setTotal(0);
          return;
        }
        show(
          'error',
          err instanceof ApiError ? err.body?.message || 'Gagal memuat rekap presensi' : 'Gagal memuat rekap presensi',
        );
        setData([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kelasId, dari, sampai, page]);

  const kelasSelectOptions = useMemo(
    () => kelasOptions.map((k) => ({ value: String(k.id), label: `${k.nama} (Tingkat ${k.tingkat})` })),
    [kelasOptions],
  );

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleKelasChange = (v: string) => {
    setKelasId(v);
    setPage(1);
  };

  return (
    <PageContainer size="xl" bottomBar>
      <BackLink to="/guru/kbm" />
      <div className="mb-4">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
          Rekap Presensi
        </h2>
        <p className="text-xs text-aam-text-muted">
          Ringkasan H/S/I/A/T per siswa dalam rentang tanggal terpilih.
          {isAdmin ? '' : ' Hanya tersedia untuk kelas yang Anda wali-i.'}
        </p>
      </div>

      {/* Filter: kelas + rentang tanggal */}
      <Card icon="filter_alt" className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Kelas</label>
            <AdaptiveSelect
              value={kelasId}
              onChange={handleKelasChange}
              options={kelasSelectOptions}
              label="Pilih Kelas"
              placeholder={loadingKelas ? 'Memuat kelas...' : 'Pilih kelas...'}
              disabled={loadingKelas || kelasSelectOptions.length === 0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Dari</label>
            <input
              type="date"
              value={dari}
              max={sampai}
              onChange={(e) => {
                setDari(e.target.value || daysAgoWIB(30));
                setPage(1);
              }}
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Sampai</label>
            <input
              type="date"
              value={sampai}
              min={dari}
              onChange={(e) => {
                setSampai(e.target.value || todayWIB());
                setPage(1);
              }}
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
            />
          </div>
        </div>
      </Card>

      {forbidden ? (
        <Card icon="lock" className="p-0">
          <EmptyState icon="lock" message="Anda bukan wali kelas ini — hanya wali kelas atau admin yang dapat melihat rekap." />
        </Card>
      ) : (
        <Card icon="summarize" className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              icon="summarize"
              message={!kelasId ? 'Pilih kelas untuk melihat rekap' : 'Belum ada data presensi pada rentang ini'}
            />
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-aam-border bg-gray-50 text-left text-xs text-aam-text-muted">
                      <th className="px-4 py-2.5 font-medium">NIS</th>
                      <th className="px-4 py-2.5 font-medium">Nama</th>
                      <th className="px-4 py-2.5 font-medium text-center">H</th>
                      <th className="px-4 py-2.5 font-medium text-center">S</th>
                      <th className="px-4 py-2.5 font-medium text-center">I</th>
                      <th className="px-4 py-2.5 font-medium text-center">A</th>
                      <th className="px-4 py-2.5 font-medium text-center">T</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {data.map((s) => (
                      <tr key={s.siswaId} className="border-b border-aam-border/50">
                        <td className="px-4 py-3 text-aam-text-muted">{s.nis}</td>
                        <td className="px-4 py-3 font-medium text-aam-text">{s.nama}</td>
                        <td className="px-4 py-3 text-center text-aam-text-muted">{s.rekap ? s.rekap.H : '—'}</td>
                        <td className="px-4 py-3 text-center text-aam-text-muted">{s.rekap ? s.rekap.S : '—'}</td>
                        <td className="px-4 py-3 text-center text-aam-text-muted">{s.rekap ? s.rekap.I : '—'}</td>
                        <td className="px-4 py-3 text-center text-aam-text-muted">{s.rekap ? s.rekap.A : '—'}</td>
                        <td className="px-4 py-3 text-center text-aam-text-muted">{s.rekap ? s.rekap.T : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: card list */}
              <div className="md:hidden divide-y divide-aam-border/50">
                {data.map((s) => (
                  <div key={s.siswaId} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-aam-text">{s.nama}</p>
                      <span className="text-xs text-aam-text-muted">{s.nis}</span>
                    </div>
                    {s.rekap ? (
                      <p className="text-xs text-aam-text-muted">
                        {s.rekap.H}H • {s.rekap.S}S • {s.rekap.I}I • {s.rekap.A}A • {s.rekap.T}T
                      </p>
                    ) : (
                      <p className="text-xs text-aam-text-muted">Tidak tercatat</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Pagination */}
      {!forbidden && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-aam-text-muted">
            {total} siswa • hal {page}/{totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
