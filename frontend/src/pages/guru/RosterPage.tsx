import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';

/**
 * Guru: RosterPage - Grid presensi siswa untuk satu sesi KBM
 * Menampilkan dan mengelola presensi siswa untuk jadwal KBM spesifik pada tanggal tertentu
 * Status siswa: H (Hadir), S (Sakit), I (Izin), A (Alpha), T (Terlambat)
 */
export function RosterPage() {
  const { jadwalId } = useParams<{ jadwalId: string }>();
  const [searchParams] = useSearchParams();
  const tanggalFromUrl = searchParams.get('tanggal') || '';
  
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState<string>(tanggalFromUrl);
  const [data, setData] = useState<{ 
    jadwalKbmId: number; 
    tanggal: string; 
    kelas: string; 
    mapel: string; 
    tersimpan: boolean;
    siswa: Array<{
      siswaId: number;
      nama: string;
      nis: string;
      status: 'H' | 'S' | 'I' | 'A' | 'T';
    }>
  } | null>(null);
  const [statusMap, setStatusMap] = useState<Map<number, 'H' | 'S' | 'I' | 'A' | 'T'>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jadwalId && tanggalFromUrl) {
      loadRoster();
    }
  }, [jadwalId, tanggalFromUrl]);

  const loadRoster = async () => {
    if (!jadwalId || !tanggal) return;
    
    setLoading(true);
    try {
      const result = await api.getGuruKbmRoster({ jadwalId: Number(jadwalId), tanggal });
      setData(result);
      
      // Initialize statusMap dari data yang diterima
      const map = new Map<number, 'H' | 'S' | 'I' | 'A' | 'T'>();
      result.siswa.forEach(siswa => {
        map.set(siswa.siswaId, siswa.status as 'H' | 'S' | 'I' | 'A' | 'T');
      });
      setStatusMap(map);
    } catch (err) {
      console.error('Failed to load roster data:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTanggalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setTanggal(newDate);
    // Reload data ketika tanggal berubah
    if (jadwalId && newDate) {
      loadRoster();
    }
  };

  const handleStatusChange = (siswaId: number, status: 'H' | 'S' | 'I' | 'A' | 'T') => {
    statusMap.set(siswaId, status);
  };

  const handleSave = async () => {
    if (!jadwalId || !tanggal || !data) return;
    
    setSaving(true);
    try {
      const entri = Array.from(statusMap.entries()).map(([siswaId, status]) => ({
        siswaId,
        status
      }));
      
      await api.postGuruKbmRoster({
        jadwalId: Number(jadwalId),
        body: {
          tanggal,
          entri
        }
      });
      
      // Update state untuk menandakan data tersimpan
      setData(prev => prev ? { ...prev, tersimpan: true } : null);
      
      // Tampilkan feedback sukses sementara
      const originalText = document.querySelector('.save-button span')?.textContent;
      const saveButton = document.querySelector('.save-button');
      if (saveButton) {
        saveButton.innerHTML = '<span class="material-symbols-outlined">check</span> Disimpan!';
        setTimeout(() => {
          if (saveButton && originalText !== undefined) {
            saveButton.innerHTML = `<span class="material-symbols-outlined">save</span> ${originalText}`;
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to save roster:', err);
      alert('Gagal menyimpan presensi. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !jadwalId || !tanggal) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Roster Presensi
        </h2>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-aam-text mb-2">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={handleTanggalChange}
              className="ml-4 px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="text-center py-8">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full rounded-md" />
              <p className="mt-2 text-sm text-aam-text-muted">Memuat data...</p>
            </>
          ) : (
            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
              error
            </span>
            <p className="mt-3 text-sm text-aam-text-muted">
              Gagal memuat data roster. Silakan periksa jadwal dan tanggal.
            </p>
          )}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer size="xl">
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Roster Presensi
        </h2>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <label className="block text-sm font-medium text-aam-text mb-2">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={handleTanggalChange}
              className="ml-4 px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
            error
          </span>
          <p className="mt-3 text-sm text-aam-text-muted">
            Tidak ada data roster untuk jadwal dan tanggal ini.
          </p>
        </div>
      </PageContainer>
    );
  }

  const statusLabels: Record<'H' | 'S' | 'I' | 'A' | 'T', { label: string; color: string }> = {
    H: { label: 'Hadir', color: 'text-green-600' },
    S: { label: 'Sakit', color: 'text-blue-600' },
    I: { label: 'Izin', color: 'text-yellow-600' },
    A: { label: 'Alpha', color: 'text-red-600' },
    T: { label: 'Terlambat', color: 'text-orange-600' },
  };

  return (
    <PageContainer size="xl">
      <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
        Roster Presensi
      </h2>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <label className="block text-sm font-medium text-aam-text mb-2">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={handleTanggalChange}
            className="ml-4 px-3 py-2 border border-input bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-aam-text-muted">
            {data.kelas} • {data.mapel}
          </span>
        </div>
      </div>
      
      {/* Info jadwal dan status penyimpanan */}
      <div className="mb-4 p-3 bg-muted rounded-md">
        <p className="text-sm text-aam-text-muted">
          Jadwal: {data.jadwalKbmId} | Kelas: {data.kelas} | Mapel: {data.mapel}
        </p>
        {data.tersimpan ? (
          <p className="mt-1 text-sm text-green-600 font-medium">
            Data terakhir tersimpan
          </p>
        ) : (
          <p className="mt-1 text-sm text-yellow-600 font-medium">
            Ada perubahan yang belum disimpan
          </p>
        )}
      </div>
      
      {/* Grid siswa */}
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-muted">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-aam-text-muted uppercase tracking-wider">
                  No
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-aam-text-muted uppercase tracking-wider">
                  NIS
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-aam-text-muted uppercase tracking-wider">
                  Nama Siswa
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-aam-text-muted uppercase tracking-wider">
                  Status Presensi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {data.siswa.map((siswa, index) => (
                <tr key={siswa.siswaId} className="hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm text-aam-text">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-aam-text font-mono">
                    {siswa.nis}
                  </td>
                  <td className="px-4 py-3 text-sm text-aam-text font-medium">
                    {siswa.nama}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-3">
                      {[['H', 'S', 'I', 'A', 'T'] as const].map((status) => (
                        <label
                          key={status}
                          className={`flex items-center gap-2 cursor-pointer select-none ${
                            statusMap.get(siswa.siswaId) === status
                              ? 'font-medium text-aam-text'
                              : 'text-aam-text-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={statusMap.get(siswa.siswaId) === status}
                            onChange={() => handleStatusChange(siswa.siswaId, status as 'H' | 'S' | 'I' | 'A' | 'T')}
                            className="h-4 w-4 text-primary rounded focus:ring-primary"
                            aria-label={statusLabels[status].label}
                          />
                          <span className={`text-sm font-mono ${statusLabels[status].color}`}>
                            {statusLabels[status].label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Ringkasan status */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-sm font-medium text-aam-text mb-2">
            Ringkasan Status
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[['H', 'S', 'I', 'A', 'T'] as const].map((status) => {
              const count = Array.from(statusMap.values()).filter(s => s === status).length;
              return (
                <div key={status} className={`flex items-center gap-2 ${statusLabels[status].color}`}>
                  <span className={`material-symbols-outlined`}>
                    {status === 'H' ? 'check_circle' : 
                     status === 'S' ? 'hospital' : 
                     status === 'I' ? 'person_add' : 
                     status === 'A' ? 'person_off' : 
                     'access_time'}
                  </span>
                  <span>{count} {statusLabels[status].label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Tombol aksi */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            // Navigasi kembali ke KBM hari ini
            window.history.back();
          }}
        >
          Kembali
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="save-button ml-3"
          onClick={handleSave}
          disabled={saving}
        >
          <span className="material-symbols-outlined mr-2">save</span>
          Simpan Presensi
        </Button>
      </div>
    </PageContainer>
  );
}