import React, { useState, useEffect } from 'react';
import { api, GuruListResponse, SiswaListResponse, KelasListResponse } from '../../api/client';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';

/**
 * /admin — Dashboard Admin (T13: diperkaya kartu jumlah real).
 * Kartu: guru aktif, siswa aktif, kelas.
 * Dashboard monitor penuh = F4 (bukan T13).
 */
export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [guruCount, setGuruCount] = useState(0);
  const [siswaCount, setSiswaCount] = useState(0);
  const [kelasCount, setKelasCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [guru, siswa, kelas] = await Promise.all([
        api.adminGetGuru({ status: 'aktif', limit: 1 }),
        api.adminGetSiswa({ status: 'aktif', limit: 1 }),
        api.adminGetKelas({ limit: 1 }),
      ]);
      setGuruCount(guru.total);
      setSiswaCount(siswa.total);
      setKelasCount(kelas.total);
    } catch {
      // silent — dashboard is non-critical
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Guru Aktif', value: guruCount, icon: 'school', color: 'text-blue-600' },
    { label: 'Siswa Aktif', value: siswaCount, icon: 'diversity_3', color: 'text-green-600' },
    { label: 'Kelas', value: kelasCount, icon: 'meeting_room', color: 'text-purple-600' },
  ];

  return (
    <PageContainer size="xl">
      <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
        Dashboard Admin
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))
        ) : (
          stats.map((s) => (
            <Card key={s.label} icon={s.icon} className="p-4">
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined ${s.color}`}
                  style={{ fontSize: '2rem' }}
                >
                  {s.icon}
                </span>
                <div>
                  <p className="text-2xl font-bold text-aam-text">{s.value}</p>
                  <p className="text-xs text-aam-text-muted">{s.label}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Placeholder for future modules */}
      <Card icon="dashboard" className="p-6">
        <div className="text-center py-8">
          <span
            className="material-symbols-outlined text-gray-300"
            style={{ fontSize: '3rem' }}
          >
            construction
          </span>
          <p className="mt-3 text-sm text-aam-text-muted">
            Modul presensi, kurikulum, dan kesiswaan menyusul di fase berikutnya.
          </p>
        </div>
      </Card>
    </PageContainer>
  );
}
