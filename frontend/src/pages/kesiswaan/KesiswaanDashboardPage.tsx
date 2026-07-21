import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';
import { Badge } from '../../components/Badge';

function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function monthStartWIB(): string {
  const t = todayWIB();
  return t.slice(0, 8) + '01';
}

function StatCard({ icon, label, value, sub, to }: {
  icon: string; label: string; value: number | string; sub?: string; to?: string;
}) {
  const inner = (
    <Card icon={icon}>
      <div className="text-3xl font-bold text-aam-text leading-none">{value}</div>
      <div className="text-sm font-medium text-aam-text mt-2">{label}</div>
      {sub && <div className="text-xs text-aam-text-muted mt-0.5">{sub}</div>}
    </Card>
  );
  if (to) {
    return <Link to={to} className="block hover:shadow-md transition-shadow rounded-lg">{inner}</Link>;
  }
  return inner;
}

/**
 * /kesiswaan — Dashboard Kesiswaan (IA-HIERARCHY-V2).
 * Monitoring kehadiran guru + siswa + demerit keseluruhan.
 * Memakai endpoint dashboard admin (agregat) + laporan demerit.
 */
export function KesiswaanDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [guruStatus, setGuruStatus] = useState<Record<string, number> | null>(null);
  const [siswa, setSiswa] = useState<{ hadir: number; alpha: number; total: number } | null>(null);
  const [izinMenunggu, setIzinMenunggu] = useState(0);
  const [demeritTotal, setDemeritTotal] = useState(0);
  const [demeritTop, setDemeritTop] = useState<Array<{ siswaNama: string; saldo: number; terpotong: number }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const t = todayWIB();
    try {
      const dash = await api.adminGetDashboard(t).catch(() => null);
      if (dash) {
        setGuruStatus(dash.guruStatus);
        setSiswa(dash.siswa);
        setIzinMenunggu(dash.perluPerhatian?.izinMenunggu ?? 0);
      }
    } catch { /* ignore */ }

    try {
      const dem = await api.getLaporanDemerit({ dari: monthStartWIB(), sampai: t, limit: 5 });
      setDemeritTotal(dem.total ?? dem.data?.length ?? 0);
      setDemeritTop((dem.data ?? []).slice(0, 5).map((r: any) => ({
        siswaNama: r.siswaNama ?? r.nama ?? '—',
        saldo: r.saldo ?? 0,
        terpotong: r.terpotong ?? 0,
      })));
    } catch (err) {
      setDemeritTotal(0);
      setDemeritTop([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <PageContainer backLinkMobile={false}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  const totalGuru = guruStatus
    ? Object.values(guruStatus).reduce((a, b) => a + b, 0)
    : 0;
  const guruHadir = guruStatus
    ? (guruStatus.HADIR ?? 0) + (guruStatus.TERLAMBAT ?? 0)
    : 0;
  const guruAlpha = guruStatus?.ALPHA ?? 0;
  const hadirPct = totalGuru > 0 ? Math.round(guruHadir / totalGuru * 100) : 0;

  return (
    <PageContainer backLinkMobile={false}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Dashboard Kesiswaan</h2>
        <p className="text-sm text-aam-text-muted">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'Asia/Jakarta',
          })}
        </p>
      </div>

      <div className="space-y-4">
        {izinMenunggu > 0 && (
          <Card className="border-l-4 border-yellow-400">
            <Link
              to="/tu/izin-guru?status=MENUNGGU"
              className="flex items-center justify-between p-1 rounded-lg hover:bg-yellow-50 transition-colors"
            >
              <span className="text-sm text-aam-text">Izin Guru Menunggu Persetujuan</span>
              <Badge variant="yellow">{izinMenunggu}</Badge>
            </Link>
          </Card>
        )}

        <div>
          <h3 className="text-sm font-semibold text-aam-text mb-3">Kehadiran Guru Hari Ini</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="person_check" label="Guru Hadir" value={`${hadirPct}%`}
              sub={`${guruHadir}/${totalGuru}`} to="/tu/presensi-guru" />
            <StatCard icon="event_busy" label="Guru Alpha" value={guruAlpha} to="/tu/presensi-guru" />
            <StatCard icon="event_available" label="Izin/Sakit/Dinas"
              value={(guruStatus?.IZIN ?? 0) + (guruStatus?.SAKIT ?? 0) + (guruStatus?.DINAS ?? 0)}
              to="/tu/izin-guru" />
            <StatCard icon="schedule" label="Terlambat" value={guruStatus?.TERLAMBAT ?? 0}
              to="/tu/presensi-guru" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-aam-text mb-3">Kehadiran Siswa Hari Ini</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon="groups" label="Siswa Hadir" value={siswa?.hadir ?? '—'}
              sub={siswa ? `Alpha: ${siswa.alpha}` : undefined} to="/kesiswaan/presensi-siswa" />
            <StatCard icon="person_off" label="Siswa Alpha" value={siswa?.alpha ?? '—'}
              to="/kesiswaan/laporan-kehadiran" />
            <StatCard icon="school" label="Total Siswa" value={siswa?.total ?? '—'}
              to="/kesiswaan/presensi-siswa" />
          </div>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-aam-text flex items-center gap-2">
              <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 18 }}>bar_chart</span>
              Demerit Siswa (bulan ini)
            </h3>
            <Link to="/kesiswaan/laporan" className="text-xs text-aam-green underline">
              Laporan lengkap ({demeritTotal})
            </Link>
          </div>
          {demeritTop.length === 0 ? (
            <p className="text-sm text-aam-text-muted">Belum ada data demerit bulan ini.</p>
          ) : (
            <div className="space-y-2">
              {demeritTop.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
                  <span className="text-aam-text font-medium">{r.siswaNama}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-600">−{r.terpotong}</span>
                    <span className="text-aam-text-muted">Saldo: {r.saldo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
