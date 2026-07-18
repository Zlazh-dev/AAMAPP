import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';
import { Badge } from '../../components/Badge';

// ── Helpers ───────────────────────────────────────────────────────────────

function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface DashboardData {
  guruStatus: {
    HADIR: number; TERLAMBAT: number; IZIN: number;
    SAKIT: number; DINAS: number; ALPHA: number; LIBUR: number;
  };
  kbm: { terlaksana: number; kosong: number };
  siswa: { hadir: number; alpha: number; total: number };
  perluPerhatian: { izinMenunggu: number; presensiPending: number };
  feed: Array<{ waktu: string; pesan: string; tipe: string }>;
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub }: {
  icon: string; label: string; value: number | string;
  color: string; sub?: string;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`rounded-full p-2.5 ${color}`}>
        <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-aam-text">{value}</div>
        <div className="text-xs text-aam-muted">{label}</div>
        {sub && <div className="text-xs text-aam-muted">{sub}</div>}
      </div>
    </Card>
  );
}

function GuruStatusGrid({ status }: { status: DashboardData['guruStatus'] }) {
  const items = [
    { key: 'HADIR', label: 'Hadir', color: 'bg-green-100 text-green-700' },
    { key: 'TERLAMBAT', label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'IZIN', label: 'Izin', color: 'bg-blue-100 text-blue-700' },
    { key: 'SAKIT', label: 'Sakit', color: 'bg-orange-100 text-orange-700' },
    { key: 'DINAS', label: 'Dinas', color: 'bg-purple-100 text-purple-700' },
    { key: 'ALPHA', label: 'Alpha', color: 'bg-red-100 text-red-700' },
    { key: 'LIBUR', label: 'Libur', color: 'bg-gray-100 text-gray-600' },
  ] as const;

  return (
    <Card>
      <h3 className="font-semibold text-aam-text mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 18 }}>groups</span>
        Status Guru Hari Ini
      </h3>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {items.map(({ key, label, color }) => (
          <div key={key} className="text-center">
            <div className={`text-lg font-bold rounded-lg py-1.5 ${color}`}>
              {status[key]}
            </div>
            <div className="text-xs text-aam-muted mt-1">{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PerluPerhatianCard({ data }: { data: DashboardData['perluPerhatian'] }) {
  if (data.izinMenunggu === 0 && data.presensiPending === 0) return null;
  return (
    <Card className="border-l-4 border-yellow-400">
      <h3 className="font-semibold text-aam-text mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 18 }}>warning</span>
        Perlu Perhatian
      </h3>
      <div className="space-y-2">
        {data.izinMenunggu > 0 && (
          <Link
            to="/admin/izin-guru?status=MENUNGGU"
            className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            <span className="text-sm text-aam-text">Izin Menunggu Persetujuan</span>
            <Badge variant="yellow">{data.izinMenunggu}</Badge>
          </Link>
        )}
        {data.presensiPending > 0 && (
          <Link
            to="/admin/presensi-guru-pending"
            className="flex items-center justify-between p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <span className="text-sm text-aam-text">Presensi Manual Pending</span>
            <Badge variant="yellow">{data.presensiPending}</Badge>
          </Link>
        )}
      </div>
    </Card>
  );
}

function FeedCard({ feed }: { feed: DashboardData['feed'] }) {
  if (feed.length === 0) return null;
  return (
    <Card>
      <h3 className="font-semibold text-aam-text mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 18 }}>feed</span>
        Aktivitas Terbaru
      </h3>
      <div className="space-y-2">
        {feed.slice(0, 8).map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-aam-muted text-xs whitespace-nowrap mt-0.5 w-20 shrink-0">
              {new Date(f.waktu).toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
              })}
            </span>
            <span className="text-aam-text">{f.pesan}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

/**
 * /admin — Dashboard Admin (F4b upgrade: agregat + feed + perlu perhatian).
 * Jika backend F4b belum live, fallback ke kartu statis T13.
 */
export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // Fallback counts (statis T13) saat dashboard F4b belum live
  const [guruCount, setGuruCount] = useState(0);
  const [siswaCount, setSiswaCount] = useState(0);
  const [kelasCount, setKelasCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Try F4b dashboard first
      const data = await api.adminGetDashboard(todayWIB());
      setDashboard(data);
    } catch {
      // Backend F4b belum live — fallback ke count statis
      try {
        const [guru, siswa, kelas] = await Promise.all([
          api.adminGetGuru({ status: 'aktif', limit: 1 }),
          api.adminGetSiswa({ status: 'aktif', limit: 1 }),
          api.adminGetKelas({ limit: 1 }),
        ]);
        setGuruCount((guru as any).total ?? 0);
        setSiswaCount((siswa as any).total ?? 0);
        setKelasCount((kelas as any).total ?? 0);
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  // ── F4b dashboard loaded ──────────────────────────────────────────────────
  if (dashboard) {
    const totalGuru = Object.values(dashboard.guruStatus).reduce((a, b) => a + b, 0);
    const hadirPct = totalGuru > 0
      ? Math.round((dashboard.guruStatus.HADIR + dashboard.guruStatus.TERLAMBAT) / totalGuru * 100)
      : 0;

    return (
      <PageContainer>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-aam-text">Dashboard</h2>
            <p className="text-sm text-aam-muted">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                timeZone: 'Asia/Jakarta',
              })}
            </p>
          </div>
          <Link
            to="/admin/laporan"
            className="text-sm text-aam-green underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assessment</span>
            Laporan
          </Link>
        </div>

        <div className="space-y-4">
          {/* Perlu perhatian */}
          <PerluPerhatianCard data={dashboard.perluPerhatian} />

          {/* Status guru grid */}
          <GuruStatusGrid status={dashboard.guruStatus} />

          {/* Kartu KBM + Siswa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="person_check" label="Guru Hadir" value={`${hadirPct}%`}
              color="bg-green-500" sub={`${dashboard.guruStatus.HADIR + dashboard.guruStatus.TERLAMBAT}/${totalGuru}`} />
            <StatCard icon="event_busy" label="Guru Alpha" value={dashboard.guruStatus.ALPHA}
              color="bg-red-500" />
            <StatCard icon="class" label="KBM Terlaksana" value={dashboard.kbm.terlaksana}
              color="bg-blue-500" sub={`Kosong: ${dashboard.kbm.kosong}`} />
            <StatCard icon="groups" label="Siswa Hadir" value={dashboard.siswa.hadir}
              color="bg-purple-500" sub={`Alpha: ${dashboard.siswa.alpha}`} />
          </div>

          {/* Feed */}
          <FeedCard feed={dashboard.feed} />
        </div>
      </PageContainer>
    );
  }

  // ── Fallback: statis T13 ─────────────────────────────────────────────────
  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-aam-text">Dashboard</h2>
        <Link to="/admin/laporan" className="text-sm text-aam-green underline flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assessment</span>
          Laporan
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon="person" label="Guru Aktif" value={guruCount} color="bg-blue-500" />
        <StatCard icon="groups" label="Siswa Aktif" value={siswaCount} color="bg-green-500" />
        <StatCard icon="meeting_room" label="Kelas" value={kelasCount} color="bg-purple-500" />
      </div>
    </PageContainer>
  );
}
