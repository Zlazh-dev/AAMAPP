import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, GuruKbmResponse } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

/** WIB "hari ini" dalam format YYYY-MM-DD (tanpa parsing offset manual). */
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

/**
 * Guru: KbmHariIniPage — daftar sesi KBM guru pada tanggal terpilih (F2).
 * Status TERLAKSANA (presensi_sesi ada) atau BELUM. Klik sesi → RosterPage.
 */
export function KbmHariIniPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [tanggal, setTanggal] = useState<string>(todayWIB());
  const [data, setData] = useState<GuruKbmResponse | null>(null);

  useEffect(() => {
    loadKbm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal]);

  const loadKbm = async () => {
    setLoading(true);
    try {
      const result = await api.getGuruKbm({ tanggal });
      setData(result);
    } catch (err) {
      console.error('Failed to load KBM data:', err);
      show('error', 'Gagal memuat data KBM hari ini');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const inner = (
    <>
      {!embedded && (
        <div className="mb-4">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            KBM Hari Ini
          </h2>
          <p className="text-xs text-aam-text-muted">
            Daftar sesi KBM Anda pada tanggal terpilih. Klik sesi untuk mengisi presensi.
          </p>
        </div>
      )}

      <Card icon="event" className="p-4 mb-4">
        <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Tanggal</label>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="w-full max-w-xs rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
        />
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ) : !data || data.sesi.length === 0 ? (
        <Card icon="calendar_today" className="p-0">
          <EmptyState icon="calendar_today" message="Tidak ada jadwal KBM untuk tanggal ini" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.sesi.map((sesi) => (
            <Card
              key={sesi.jadwalKbmId}
              icon={sesi.status === 'TERLAKSANA' ? 'check_circle' : 'radio_button_unchecked'}
              hoverable
              onClick={() => navigate(`/guru/roster/${sesi.jadwalKbmId}?tanggal=${data.tanggal}`)}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-aam-text truncate">
                    {sesi.mapel} — {sesi.kelas}
                  </h3>
                  <p className="text-xs text-aam-text-muted mt-0.5">
                    Jam {sesi.jamMulai}–{sesi.jamSelesai} • Sesi ke-{sesi.sesiKe}
                  </p>
                </div>
                <Badge variant={sesi.status === 'TERLAKSANA' ? 'green' : 'yellow'}>
                  {sesi.status === 'TERLAKSANA' ? 'Sudah presensi' : 'Belum presensi'}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-aam-green">
                {sesi.status === 'TERLAKSANA' ? 'Lihat / koreksi presensi →' : 'Isi presensi →'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return inner;
  return <PageContainer size="xl">{inner}</PageContainer>;
}

export default KbmHariIniPage;