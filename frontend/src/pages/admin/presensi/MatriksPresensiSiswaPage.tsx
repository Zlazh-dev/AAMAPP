import React, { useState, useEffect, useMemo } from 'react';
import { api, ApiError, Kelas } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { PageContainer } from '../../../components/PageContainer';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { RosterDetailSheet } from './RosterDetailSheet';

type MatriksPresensiSiswaResponse = Awaited<ReturnType<typeof api.getMatriksPresensiSiswa>>;
type SesiMatriksRow = MatriksPresensiSiswaResponse['sesi'][number];

/** WIB "hari ini" dalam format YYYY-MM-DD (tanpa parsing offset — util lokal
 *  ringan; halaman guru/lain di proyek ini pakai `wib.util.ts` di backend,
 *  di frontend cukup format Intl dgn timeZone Asia/Jakarta). */
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

const STATUS_LABEL: Record<string, string> = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpha', T: 'Terlambat' };

function ringkasanText(r: Record<string, number> | null): string {
  if (!r) return '—';
  const parts: string[] = [];
  (['H', 'S', 'I', 'A', 'T'] as const).forEach((k) => {
    if (r[k]) parts.push(`${r[k]}${k}`);
  });
  return parts.length > 0 ? parts.join(' • ') : '—';
}

/**
 * /admin/presensi-siswa — POLA khusus §15.3: matriks kelas × sesi (per
 * kelas terpilih, karena kontrak backend GET /api/admin/presensi-siswa
 * memang di-scope per kelasId — memilih SATU kelas dulu lalu tanggal).
 *
 * Sel = status sesi (TERLAKSANA hijau / BELUM merah) + ringkasan H/S/I/A/T.
 * Klik sel → buka RosterDetailSheet (baca roster + koreksi per siswa,
 * alasan wajib bila tanggal ≠ hari ini — sesuai F2-SPEC kontrak koreksi).
 */
export function MatriksPresensiSiswaPage() {
  const { show } = useToast();
  const [kelasOptions, setKelasOptions] = useState<Kelas[]>([]);
  const [kelasId, setKelasId] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(todayWIB());
  const [data, setData] = useState<MatriksPresensiSiswaResponse | null>(null);
  const [loadingKelas, setLoadingKelas] = useState(true);
  const [loadingMatriks, setLoadingMatriks] = useState(false);
  const [selectedSesi, setSelectedSesi] = useState<SesiMatriksRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingKelas(true);
      try {
        const res = await api.adminGetKelas({ limit: 200 });
        setKelasOptions(res.data);
        if (res.data.length > 0) setKelasId(String(res.data[0].id));
      } catch {
        show('error', 'Gagal memuat daftar kelas');
      } finally {
        setLoadingKelas(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!kelasId) return;
    loadMatriks();
  }, [kelasId, tanggal]);

  const loadMatriks = async () => {
    setLoadingMatriks(true);
    try {
      const res = await api.getMatriksPresensiSiswa(Number(kelasId), tanggal);
      setData(res);
    } catch (err) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal memuat matriks presensi');
      setData(null);
    } finally {
      setLoadingMatriks(false);
    }
  };

  const kelasSelectOptions = useMemo(
    () => kelasOptions.map((k) => ({ value: String(k.id), label: `${k.nama} (Tingkat ${k.tingkat})` })),
    [kelasOptions],
  );

  const kelasKosongCount = useMemo(
    () => (data ? data.sesi.filter((s) => s.status === 'BELUM').length : 0),
    [data],
  );

  const selectedKelasNama = kelasOptions.find((k) => String(k.id) === kelasId)?.nama ?? '';

  return (
    <PageContainer size="xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Matriks Presensi Siswa
          </h2>
          <p className="text-xs text-aam-text-muted">
            Pantau kelengkapan presensi siswa per sesi KBM pada tanggal terpilih.
          </p>
        </div>
      </div>

      {/* Filter: kelas + tanggal */}
      <Card icon="filter_alt" className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Kelas</label>
            <AdaptiveSelect
              value={kelasId}
              onChange={setKelasId}
              options={kelasSelectOptions}
              label="Pilih Kelas"
              placeholder={loadingKelas ? 'Memuat kelas...' : 'Pilih kelas...'}
              disabled={loadingKelas || kelasSelectOptions.length === 0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1.5">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30"
            />
          </div>
        </div>
      </Card>

      {/* Banner "n kelas belum lengkap" — di-scope per kelas terpilih
          (kontrak backend memang per-kelasId, bukan lintas-kelas). */}
      {data && kelasKosongCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
            warning
          </span>
          <span>
            {kelasKosongCount} sesi KBM {selectedKelasNama} pada {tanggal} belum tercatat presensinya.
          </span>
        </div>
      )}

      {/* Matriks */}
      <Card icon="grid_view" className="p-0 overflow-hidden">
        {loadingMatriks ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : !data || data.sesi.length === 0 ? (
          <EmptyState
            icon="event_busy"
            message={
              !kelasId
                ? 'Pilih kelas untuk melihat matriks presensi'
                : 'Tidak ada sesi KBM terjadwal pada tanggal ini'
            }
          />
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aam-border bg-gray-50 text-left text-xs text-aam-text-muted">
                    <th className="px-4 py-2.5 font-medium">Jam</th>
                    <th className="px-4 py-2.5 font-medium">Mapel</th>
                    <th className="px-4 py-2.5 font-medium">Guru</th>
                    <th className="px-4 py-2.5 font-medium">Status Sesi</th>
                    <th className="px-4 py-2.5 font-medium">Ringkasan H/S/I/A/T</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.sesi.map((s) => (
                    <tr
                      key={s.jadwalKbmId}
                      onClick={() => setSelectedSesi(s)}
                      className={[
                        'border-b border-aam-border/50 cursor-pointer transition-colors hover:bg-gray-50',
                        s.status === 'BELUM' ? 'bg-red-50/50' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3 text-aam-text-muted whitespace-nowrap">
                        {s.jamMulai}–{s.jamSelesai}
                      </td>
                      <td className="px-4 py-3 font-medium text-aam-text">{s.mapel ?? '—'}</td>
                      <td className="px-4 py-3 text-aam-text-muted">{s.guru ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === 'TERLAKSANA' ? 'green' : 'red'}>
                          {s.status === 'TERLAKSANA' ? 'Terlaksana' : 'Kosong'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-aam-text-muted">{ringkasanText(s.ringkasan)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                          chevron_right
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-aam-border/50">
              {data.sesi.map((s) => (
                <button
                  key={s.jadwalKbmId}
                  onClick={() => setSelectedSesi(s)}
                  className={[
                    'w-full text-left p-4 transition-colors',
                    s.status === 'BELUM' ? 'bg-red-50/50' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-aam-text">{s.mapel ?? '—'}</p>
                    <Badge variant={s.status === 'TERLAKSANA' ? 'green' : 'red'}>
                      {s.status === 'TERLAKSANA' ? 'Terlaksana' : 'Kosong'}
                    </Badge>
                  </div>
                  <p className="text-xs text-aam-text-muted">
                    {s.jamMulai}–{s.jamSelesai} • {s.guru ?? '—'}
                  </p>
                  <p className="text-xs text-aam-text-muted mt-1">{ringkasanText(s.ringkasan)}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Detail roster + koreksi per siswa (bottom sheet adaptif) */}
      {selectedSesi && (
        <RosterDetailSheet
          jadwalKbmId={selectedSesi.jadwalKbmId}
          mapel={selectedSesi.mapel}
          tanggal={tanggal}
          hariIni={tanggal === todayWIB()}
          onClose={() => setSelectedSesi(null)}
          onSaved={() => {
            setSelectedSesi(null);
            loadMatriks();
          }}
        />
      )}
    </PageContainer>
  );
}
