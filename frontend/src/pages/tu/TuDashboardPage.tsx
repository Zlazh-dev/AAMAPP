import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';
import { Badge } from '../../components/Badge';
import { SubPageLayout } from '../../components/SubPageLinks';
import { PageMenu } from '../../components/PageMenu';

function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

const PRESENSI_GURU_LINKS = [
  { key: 'rekap', label: 'Rekap Guru', path: '/tu/rekap-guru', icon: 'summarize', description: 'Rekap bulanan kehadiran guru' },
  { key: 'harian', label: 'Laporan Harian', path: '/tu/laporan/harian-guru', icon: 'assessment', description: 'Laporan harian per guru' },
  { key: 'izin', label: 'Izin Guru', path: '/tu/izin-guru', icon: 'event_available', description: 'Antrean izin dan persetujuan' },
];

function StatCard({ icon, label, value, sub }: {
  icon: string; label: string; value: number | string; sub?: string;
}) {
  return (
    <Card icon={icon}>
      <div className="text-3xl font-bold text-aam-text leading-none">{value}</div>
      <div className="text-sm font-medium text-aam-text mt-2">{label}</div>
      {sub && <div className="text-xs text-aam-text-muted mt-0.5">{sub}</div>}
    </Card>
  );
}

/**
 * /tu — Dashboard TU (IA-HIERARCHY-V2).
 * Monitoring kehadiran guru saja (stats). Rekap/laporan/izin = sub Presensi Guru.
 */
export function TuDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [guruStatus, setGuruStatus] = useState<Record<string, number> | null>(null);
  const [izinMenunggu, setIzinMenunggu] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dash = await api.adminGetDashboard(todayWIB());
      setGuruStatus(dash.guruStatus);
      setIzinMenunggu(dash.perluPerhatian?.izinMenunggu ?? 0);
    } catch (err) {
      setGuruStatus(null);
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
        </div>
      </PageContainer>
    );
  }

  const totalGuru = guruStatus
    ? Object.values(guruStatus).reduce((a, b) => a + b, 0)
    : 0;
  const hadir = (guruStatus?.HADIR ?? 0) + (guruStatus?.TERLAMBAT ?? 0);
  const hadirPct = totalGuru > 0 ? Math.round(hadir / totalGuru * 100) : 0;

  const statusItems = [
    { key: 'HADIR', label: 'Hadir', color: 'bg-green-100 text-green-700' },
    { key: 'TERLAMBAT', label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'IZIN', label: 'Izin', color: 'bg-blue-100 text-blue-700' },
    { key: 'SAKIT', label: 'Sakit', color: 'bg-orange-100 text-orange-700' },
    { key: 'DINAS', label: 'Dinas', color: 'bg-purple-100 text-purple-700' },
    { key: 'ALPHA', label: 'Alpha', color: 'bg-red-100 text-red-700' },
    { key: 'LIBUR', label: 'Libur', color: 'bg-gray-100 text-gray-600' },
  ] as const;

  return (
    <PageContainer backLinkMobile={false}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Dashboard TU</h2>
          <p className="text-sm text-aam-text-muted">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Asia/Jakarta',
            })}
          </p>
        </div>
        <PageMenu
          menuTitle="Menu TU"
          links={[
            { key: 'presensi', label: 'Presensi Guru', path: '/tu/presensi-guru', icon: 'badge' },
            { key: 'pengaturan', label: 'Pengaturan', path: '/tu/pengaturan', icon: 'settings' },
            ...PRESENSI_GURU_LINKS,
          ]}
        />
      </div>

      <SubPageLayout links={[
        { key: 'presensi', label: 'Presensi Hari Ini', path: '/tu/presensi-guru', icon: 'badge' },
        ...PRESENSI_GURU_LINKS,
      ]}>
      <div className="space-y-4">
        {izinMenunggu > 0 && (
          <Card className="border-l-4 border-yellow-400">
            <Link
              to="/tu/izin-guru?status=MENUNGGU"
              className="flex items-center justify-between p-1 rounded-lg hover:bg-yellow-50 transition-colors"
            >
              <span className="text-sm text-aam-text">Izin Menunggu Persetujuan</span>
              <Badge variant="yellow">{izinMenunggu}</Badge>
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="person_check" label="Guru Hadir" value={`${hadirPct}%`}
            sub={`${hadir}/${totalGuru}`} />
          <StatCard icon="event_busy" label="Alpha" value={guruStatus?.ALPHA ?? 0} />
          <StatCard icon="schedule" label="Terlambat" value={guruStatus?.TERLAMBAT ?? 0} />
          <StatCard icon="event_available" label="Izin/Sakit/Dinas"
            value={(guruStatus?.IZIN ?? 0) + (guruStatus?.SAKIT ?? 0) + (guruStatus?.DINAS ?? 0)} />
        </div>

        {guruStatus && (
          <Card>
            <h3 className="font-semibold text-aam-text mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 18 }}>groups</span>
              Status Guru Hari Ini
            </h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {statusItems.map(({ key, label, color }) => (
                <div key={key} className="text-center">
                  <div className={`text-lg font-bold rounded-lg py-1.5 ${color}`}>
                    {guruStatus[key] ?? 0}
                  </div>
                  <div className="text-xs text-aam-text-muted mt-1">{label}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
      </SubPageLayout>
    </PageContainer>
  );
}
