import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

const KKM = 75;

interface MapelRapor {
  mapelId: number;
  mapelNama: string;
  nilaiAkhir: number | null;
  nilaiKatrol: number | null;
  deskripsiAuto: string;
  deskripsiOverride: string | null;
}

interface Kehadiran {
  sakit: number;
  izin: number;
  alpha: number;
}

interface RaporSiswa {
  siswaId: number;
  nama: string;
  nis: string | null;
  kelas: string;
  status: 'DRAFT' | 'FINAL';
  catatanWali: string | null;
  kehadiran: Kehadiran;
  mapel: MapelRapor[];
  finalisasiOleh?: string | null;
  finalisasiPada?: string | null;
}

async function getProfilForPdf() {
  try {
    const entries = await api.getPengaturan();
    const entry = (entries as any[]).find((e: any) => e.key === 'profil_sekolah');
    if (entry?.value) return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
  } catch { /* ignore */ }
  return { nama: 'Sekolah', alamat: '', kabKota: '', logoUrl: '', kepsekNama: '', kepsekNip: '', kepsekJabatan: 'Kepala Sekolah' };
}

async function exportRaporPdf(rapor: RaporSiswa) {
  const { exportToPdf } = await import('../../lib/exportPdf');
  const profil = await getProfilForPdf();

  // Flatten mapel rows
  const rows = rapor.mapel.map(m => {
    const nilaiTampil = m.nilaiKatrol ?? m.nilaiAkhir;
    return {
      mapel: m.mapelNama,
      nilai: nilaiTampil !== null ? String(nilaiTampil) : '—',
      kkm: String(KKM),
      predikat: nilaiTampil !== null ? (nilaiTampil >= KKM ? 'Tuntas' : 'Belum Tuntas') : '—',
      deskripsi: m.deskripsiOverride ?? m.deskripsiAuto,
    };
  });

  await exportToPdf({
    title: `Rapor Akademik — ${rapor.nama} (${rapor.kelas})`,
    profil,
    columns: [
      { header: 'Mata Pelajaran', key: 'mapel', width: 25 },
      { header: 'Nilai', key: 'nilai', width: 8 },
      { header: 'KKM', key: 'kkm', width: 8 },
      { header: 'Predikat', key: 'predikat', width: 12 },
      { header: 'Deskripsi Capaian', key: 'deskripsi', width: 47 },
    ],
    rows,
  });
}

export function RaporDetailPage() {
  const { siswaId } = useParams<{ siswaId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [rapor, setRapor] = useState<RaporSiswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit state
  const [catatanWali, setCatatanWali] = useState('');
  const [overrides, setOverrides] = useState<Record<number, { nilaiKatrol: string; deskripsi: string }>>({});
  const [editingMapelId, setEditingMapelId] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getRaporSiswa?.(Number(siswaId));
      const data: RaporSiswa = res?.data ?? res;
      setRapor(data);
      setCatatanWali(data.catatanWali ?? '');
      const ov: Record<number, { nilaiKatrol: string; deskripsi: string }> = {};
      data.mapel.forEach(m => {
        ov[m.mapelId] = {
          nilaiKatrol: m.nilaiKatrol !== null ? String(m.nilaiKatrol) : '',
          deskripsi: m.deskripsiOverride ?? '',
        };
      });
      setOverrides(ov);
    } catch {
      toast.show('error', 'Gagal memuat rapor siswa.');
    } finally {
      setLoading(false);
    }
  }, [siswaId]);

  useEffect(() => { load(); }, [load]);

  const isFinal = rapor?.status === 'FINAL';

  const handleSaveOverride = async (mapelId: number) => {
    const ov = overrides[mapelId];
    setSaving(true);
    try {
      await (api as any).putRaporOverride?.(Number(siswaId), mapelId, {
        nilaiKatrol: ov.nilaiKatrol !== '' ? Number(ov.nilaiKatrol) : null,
        deskripsiOverride: ov.deskripsi.trim() || null,
      });
      toast.show('success', 'Override disimpan.');
      setEditingMapelId(null);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan override.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCatatan = async () => {
    setSaving(true);
    try {
      await (api as any).patchCatatanWali?.(Number(siswaId), { catatanWali });
      toast.show('success', 'Catatan wali disimpan.');
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan catatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalisasi = async () => {
    if (!window.confirm('Finalisasi rapor? Status menjadi FINAL dan tidak bisa diubah lagi. Lanjutkan?')) return;
    setFinalizing(true);
    try {
      await (api as any).finalisasiRapor?.(Number(siswaId));
      toast.show('success', 'Rapor berhasil difinalisasi!');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal finalisasi.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!rapor) return;
    setExporting(true);
    try {
      await exportRaporPdf(rapor);
    } catch {
      toast.show('error', 'Gagal mengekspor PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageContainer><TableSkeleton rows={8} /></PageContainer>;
  if (!rapor) return <PageContainer><p className="text-aam-muted">Rapor tidak ditemukan.</p></PageContainer>;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/guru/rapor')} id="btn-back-rapor">
            ← Daftar
          </Button>
          <div>
            <h2 className="text-xl font-bold text-aam-text">{rapor.nama}</h2>
            <p className="text-sm text-aam-muted">{rapor.kelas} {rapor.nis ? `· NIS ${rapor.nis}` : ''}</p>
          </div>
          <Badge variant={rapor.status === 'FINAL' ? 'green' : 'yellow'}>{rapor.status}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={handleExportPdf} disabled={exporting} id="btn-export-rapor-pdf">
            {exporting ? 'Mengekspor...' : '↓ PDF'}
          </Button>
          {!isFinal && (
            <Button onClick={handleFinalisasi} disabled={finalizing} id="btn-finalisasi-rapor">
              {finalizing ? 'Memfinalisasi...' : '✅ Finalisasi'}
            </Button>
          )}
        </div>
      </div>

      {isFinal && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
          ✅ Rapor telah difinalisasi
          {rapor.finalisasiPada ? ` pada ${new Date(rapor.finalisasiPada).toLocaleDateString('id-ID')}` : ''}.
          Data tidak bisa diubah lagi.
        </div>
      )}

      {/* Kehadiran */}
      <Card className="mb-4">
        <h3 className="font-bold text-aam-text mb-3">Kehadiran Semester</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{rapor.kehadiran.sakit}</div>
            <div className="text-xs text-aam-muted">Sakit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{rapor.kehadiran.izin}</div>
            <div className="text-xs text-aam-muted">Izin</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{rapor.kehadiran.alpha}</div>
            <div className="text-xs text-aam-muted">Tanpa Keterangan</div>
          </div>
          <div className="text-xs text-aam-muted self-end ml-4">
            (dari data presensi F2)
          </div>
        </div>
      </Card>

      {/* Nilai per mapel */}
      <Card className="mb-4">
        <h3 className="font-bold text-aam-text mb-3">Nilai Per Mata Pelajaran</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Mata Pelajaran', 'Nilai', 'Katrol', 'KKM', 'Predikat', 'Deskripsi Capaian', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-aam-border">
              {rapor.mapel.map(m => {
                const nilaiTampil = overrides[m.mapelId]?.nilaiKatrol !== '' && overrides[m.mapelId]?.nilaiKatrol
                  ? Number(overrides[m.mapelId].nilaiKatrol)
                  : (m.nilaiKatrol ?? m.nilaiAkhir);
                const isBelowKkm = nilaiTampil !== null && nilaiTampil < KKM;
                const isEditing = editingMapelId === m.mapelId;
                const deskripsiTampil = m.deskripsiOverride ?? m.deskripsiAuto;

                return (
                  <tr key={m.mapelId} className={isBelowKkm ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2 font-medium">{m.mapelNama}</td>
                    <td className="px-3 py-2 text-center">
                      {m.nilaiAkhir !== null
                        ? <Badge variant={isBelowKkm ? 'red' : 'green'}>{m.nilaiAkhir}</Badge>
                        : <span className="text-aam-muted">—</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing && !isFinal ? (
                        <input type="number" min={0} max={100}
                          className="w-16 text-center rounded border border-aam-border px-1 py-0.5 text-sm"
                          value={overrides[m.mapelId]?.nilaiKatrol ?? ''}
                          onChange={e => setOverrides(prev => ({
                            ...prev,
                            [m.mapelId]: { ...prev[m.mapelId], nilaiKatrol: e.target.value }
                          }))}
                          id={`input-katrol-${m.mapelId}`}
                        />
                      ) : m.nilaiKatrol !== null ? (
                        <Badge variant="blue">{m.nilaiKatrol}</Badge>
                      ) : (
                        <span className="text-aam-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-aam-muted">{KKM}</td>
                    <td className="px-3 py-2">
                      {nilaiTampil !== null ? (
                        <Badge variant={nilaiTampil >= KKM ? 'green' : 'red'}>
                          {nilaiTampil >= KKM ? 'Tuntas' : 'Belum Tuntas'}
                        </Badge>
                      ) : <span className="text-aam-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      {isEditing && !isFinal ? (
                        <textarea
                          className="w-full text-sm rounded border border-aam-border px-2 py-1"
                          rows={2}
                          value={overrides[m.mapelId]?.deskripsi ?? ''}
                          onChange={e => setOverrides(prev => ({
                            ...prev,
                            [m.mapelId]: { ...prev[m.mapelId], deskripsi: e.target.value }
                          }))}
                          placeholder={m.deskripsiAuto}
                          id={`input-deskripsi-${m.mapelId}`}
                        />
                      ) : (
                        <span className={`text-xs ${!m.deskripsiOverride ? 'text-aam-muted italic' : ''}`}>
                          {deskripsiTampil}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {!isFinal && (
                        isEditing ? (
                          <div className="flex gap-1">
                            <Button onClick={() => handleSaveOverride(m.mapelId)} disabled={saving}
                              id={`btn-save-override-${m.mapelId}`}>Simpan</Button>
                            <Button variant="secondary" onClick={() => setEditingMapelId(null)}>Batal</Button>
                          </div>
                        ) : (
                          <Button variant="secondary" onClick={() => setEditingMapelId(m.mapelId)}
                            id={`btn-edit-override-${m.mapelId}`}>Edit</Button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Catatan wali */}
      <Card>
        <h3 className="font-bold text-aam-text mb-3">Catatan Wali Kelas</h3>
        {isFinal ? (
          <p className="text-sm text-aam-text">{rapor.catatanWali || <span className="text-aam-muted italic">Tidak ada catatan.</span>}</p>
        ) : (
          <>
            <textarea
              className="w-full rounded-md border border-aam-border px-3 py-2 text-sm mb-3"
              rows={4}
              value={catatanWali}
              onChange={e => setCatatanWali(e.target.value)}
              placeholder="Tulis catatan wali kelas untuk siswa ini..."
              id="textarea-catatan-wali"
            />
            <Button onClick={handleSaveCatatan} disabled={saving} id="btn-simpan-catatan">
              {saving ? 'Menyimpan...' : 'Simpan Catatan'}
            </Button>
          </>
        )}
      </Card>
    </PageContainer>
  );
}
