import React, { useState, useEffect } from 'react';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { SubPageLinks } from '../../components/SubPageLinks';

const KURIKULUM_SUB_LINKS = [
  { key: 'monitoring-nilai', label: 'Monitoring Input Nilai', path: '/kurikulum/monitoring-nilai', icon: 'track_changes', description: 'Progres input nilai per guru-mapel-kelas' },
  { key: 'leger', label: 'Leger Kelas', path: '/kurikulum/leger', icon: 'table_view', description: 'Matriks nilai semua siswa per kelas' },
];

/**
 * /kurikulum — Dashboard Kurikulum (T15, §14.10.3 bullet terakhir).
 * Kartu jumlah nyata: mapel, penugasan TA aktif, jadwal.
 * BUKAN dashboard monitor penuh (itu F4).
 */
export function KurikulumDashboardPage() {
  const [data, setData] = useState<{
    mapelCount: number;
    penugasanCount: number;
    jadwalCount: number;
    taAktif: { id: number; nama: string; semester: number } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getKurikulumDashboard();
        if (!cancelled) setData(d);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: 'Mata Pelajaran', value: data?.mapelCount ?? 0, icon: 'book', color: 'text-aam-green' },
    { label: 'Penugasan TA Aktif', value: data?.penugasanCount ?? 0, icon: 'assignment_ind', color: 'text-blue-600' },
    { label: 'Slot Jadwal', value: data?.jadwalCount ?? 0, icon: 'calendar_month', color: 'text-amber-600' },
  ];

  return (
    <PageContainer size="xl" backLinkMobile={false}>
      <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-1">
        Dashboard Kurikulum
      </h2>
      <p className="text-xs text-aam-text-muted mb-6">
        {data?.taAktif
          ? `Tahun Ajaran Aktif: ${data.taAktif.nama} — Semester ${data.taAktif.semester}`
          : 'Belum ada tahun ajaran aktif'}
      </p>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="flex items-center gap-4">
              <span
                className={`material-symbols-outlined ${c.color}`}
                style={{ fontSize: '2rem' }}
              >
                {c.icon}
              </span>
              <div>
                <p className="text-2xl font-heading font-bold text-aam-text">
                  {loading ? '…' : c.value}
                </p>
                <p className="text-xs text-aam-text-muted">{c.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Sub halaman dashboard kurikulum */}
      <div className="mt-6">
        <SubPageLinks links={KURIKULUM_SUB_LINKS} />
      </div>
    </PageContainer>
  );
}
