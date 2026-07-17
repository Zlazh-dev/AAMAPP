import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';

/**
 * Guru: KbmHariIniPage - Daftar sesi KBM hari ini
 * Menampilkan jadwal KBM guru untuk tanggal yang dipilih (default hari ini WIB)
 * Status: TERLAKSANA (ada presensi_sesi) atau BELUM (belum ada presensi_sesi)
 */
export function KbmHariIniPage() {
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState<string>(() => {
    // Default ke hari ini WIB
    const now = new Date();
    // Konversi ke WIB (UTC+7)
    const wibOffset = 7 * 60; // 7 jam dalam menit
    const localTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = localTime + (wibOffset * 60000);
    return new Date(wibTime).toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [data, setData] = useState<{
    tanggal: string;
    sesi: Array<{
      jadwalKbmId: number;
      mapel: string;
      kelas: string;
      jamMulai: string;
      jamSelesai: string;
      sesiKe: number;
      status: 'TERLAKSANA' | 'BELUM';
    }>;
  } | null>(null);

  useEffect(() => {
    loadKbm();
  }, [tanggal]);

  const loadKbm = async () => {
    setLoading(true);
    try {
      const result = await api.getGuruKbm({ tanggal });
      setData(result);
    } catch (err) {
      console.error('Failed to load KBM data:', err);
      // Tetap tampilkan data null untuk menampilkan state error
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTanggal(e.target.value);
  };

  if (loading) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          KBM Hari Ini
        </h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-aam-text mb-2">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          KBM Hari Ini
        </h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-aam-text mb-2">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={handleDateChange}
            className="w-full px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
            warning
          </span>
          <p className="mt-3 text-sm text-aam-text-muted">
            Gagal memuat data KBM. Silakan coba lagi.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="xl">
      <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
        KBM Hari Ini ({new Date(data.tanggal).toLocaleDateString('id-ID')})
      </h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-aam-text mb-2">
          Tanggal
        </label>
        <input
          type="date"
          value={tanggal}
          onChange={handleDateChange}
          className="w-full px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      
      {data.sesi.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
            calendar_today
          </span>
          <p className="mt-3 text-sm text-aam-text-muted">
            Tidak ada jadwal KBM untuk tanggal ini
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.sesi.map((sesi) => (
            <Card
              key={sesi.jadwalKbmId}
              icon={sesi.status === 'TERLAKSANA' ? 'check_circle' : 'radio_button_unchecked'}
              className={`p-4 ${sesi.status === 'TERLAKSANA' ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-500'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <span
                    className={`material-symbols-outlined ${
                      sesi.status === 'TERLAKSANA' ? 'text-green-600' : 'text-yellow-600'
                    }`}
                    style={{ fontSize: '2rem' }}
                  >
                    {sesi.status === 'TERLAKSANA' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-aam-text">
                    {sesi.mapel} ({sesi.kelas})
                  </h3>
                  <p className="text-sm text-aam-text-muted">
                    Jam {sesi.jamMulai} - {sesi.jamSelesai} • Sesi ke-{sesi.sesiKe}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {sesi.status === 'TERLAKSANA' ? 'Sudah dipresensi' : 'Belum dipresensi'}
                  </p>
                  {/* Tombol aksi untuk masuk ke RosterPage */}
                  <div className="mt-3">
                    <a
                      href={`/guru/roster/${sesi.jadwalKbmId}?tanggal=${data.tanggal}`}
                      className="text-sm font-medium text-primary hover:text-primary-dark"
                    >
                      Lihat Roster →
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}