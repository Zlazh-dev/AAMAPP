import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { BackLink } from '../../components/BackLink';

const KKM = 75;

interface MapelRapor {
 mapelId: number;
 mapelNama: string;
 nilaiAkhir: number | null;
 nilaiKatrol: number | null;
 deskripsiAuto: string;
 deskripsiOverride: string | null;
}

interface Kehadiran { sakit: number; izin: number; alpha: number; }

interface KokurikulerDimensi {
 namaDimensi: string;
 nilaiAkhir: string | null;
 deskripsi: string;
}

interface EkskulTujuan { deskripsi: string; nilai: string | null; }
interface EkskulItem {
 ekskulId: number;
 nama: string;
 kehadiranPersen: number | null;
 flagMerah: boolean;
 tujuan: EkskulTujuan[];
 deskripsi: string;
}

interface RaporSiswa {
 siswaId: number;
 nama: string;
 nis: string | null;
 kelas: string;
 semester: number;
 tahunAjaran?: string;
 status: 'DRAFT' | 'FINAL';
 catatanWali: string | null;
 kehadiran: Kehadiran;
 mapel: MapelRapor[];
 kokurikuler?: KokurikulerDimensi[];
 ekstrakurikuler?: EkskulItem[];
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

async function doExportPdf(rapor: RaporSiswa) {
 const { exportRaporPenuh } = await import('../../lib/exportPdf');
 const profil = await getProfilForPdf();
 await exportRaporPenuh({
 profil,
 siswa: {
 nama: rapor.nama,
 nis: rapor.nis,
 kelas: rapor.kelas,
 semester: rapor.semester ?? 1,
 tahunAjaran: rapor.tahunAjaran,
 status: rapor.status,
 },
 kehadiran: rapor.kehadiran,
 mapel: rapor.mapel,
 kokurikuler: rapor.kokurikuler ?? [],
 ekstrakurikuler: (rapor.ekstrakurikuler ?? []).map(e => ({
 nama: e.nama,
 kehadiranPersen: e.kehadiranPersen,
 flagMerah: e.flagMerah ?? (e.kehadiranPersen !== null && e.kehadiranPersen < 70),
 tujuan: e.tujuan,
 deskripsi: e.deskripsi,
 })),
 catatanWali: rapor.catatanWali,
 kkm: KKM,
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
 } catch (err) {
 toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat rapor siswa.');
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
 await doExportPdf(rapor);
 } catch (err) {
 toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal mengekspor PDF.');
 } finally {
 setExporting(false);
 }
 };

 if (loading) return <PageContainer><TableSkeleton rows={8} /></PageContainer>;
 if (!rapor) return <PageContainer><p className="text-aam-text-muted">Rapor tidak ditemukan.</p></PageContainer>;

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
 <p className="text-sm text-aam-text-muted">{rapor.kelas} {rapor.nis ? `· NIS ${rapor.nis}` : ''}</p>
 </div>
 <Badge variant={rapor.status === 'FINAL' ? 'green' : 'yellow'}>{rapor.status}</Badge>
 </div>
 <div className="flex gap-2 flex-wrap">
 <Button variant="secondary" onClick={handleExportPdf} disabled={exporting} id="btn-export-rapor-pdf">
 {exporting ? 'Mengekspor...' : '↓ PDF Penuh'}
 </Button>
 {!isFinal && (
 <Button onClick={handleFinalisasi} disabled={finalizing} id="btn-finalisasi-rapor">
 {finalizing ? 'Memfinalisasi...' : '✅ Finalisasi'}
 </Button>
 )}
 </div>
 </div>

 {isFinal && (
 <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
 Rapor FINAL
 {rapor.finalisasiPada ? ` — ${new Date(rapor.finalisasiPada).toLocaleDateString('id-ID')}` : ''}.
 Data beku.
 </div>
 )}

 <div className="space-y-4">

 {/* Kehadiran */}
 <Card>
 <h3 className="font-bold text-aam-text mb-3">Kehadiran Semester</h3>
 <div className="flex gap-6 flex-wrap">
 <div className="text-center">
 <div className="text-2xl font-bold text-blue-600">{rapor.kehadiran.sakit}</div>
 <div className="text-xs text-aam-text-muted">Sakit</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-yellow-600">{rapor.kehadiran.izin}</div>
 <div className="text-xs text-aam-text-muted">Izin</div>
 </div>
 <div className="text-center">
 <div className="text-2xl font-bold text-red-600">{rapor.kehadiran.alpha}</div>
 <div className="text-xs text-aam-text-muted">Tanpa Keterangan</div>
 </div>
 </div>
 </Card>

 {/* B. Nilai Akademik */}
 <Card>
 <h3 className="font-bold text-aam-text mb-3">B. Nilai Akademik</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 {['Mata Pelajaran', 'Nilai', 'Katrol', 'KKM', 'Predikat', 'Deskripsi', ''].map(h => (
 <th key={h} className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border whitespace-nowrap">{h}</th>
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

 return (
 <tr key={m.mapelId} className={isBelowKkm ? 'bg-red-50' : 'hover:bg-gray-50'}>
 <td className="px-3 py-2 font-medium">{m.mapelNama}</td>
 <td className="px-3 py-2 text-center">
 {m.nilaiAkhir !== null
 ? <Badge variant={isBelowKkm ? 'red' : 'green'}>{m.nilaiAkhir}</Badge>
 : <span className="text-aam-text-muted">—</span>}
 </td>
 <td className="px-3 py-2 text-center">
 {isEditing && !isFinal ? (
 <input type="number" min={0} max={100}
 className="w-16 text-center rounded border border-aam-border px-1 py-0.5 text-sm"
 value={overrides[m.mapelId]?.nilaiKatrol ?? ''}
 onChange={e => setOverrides(prev => ({ ...prev, [m.mapelId]: { ...prev[m.mapelId], nilaiKatrol: e.target.value } }))}
 id={`input-katrol-${m.mapelId}`} />
 ) : m.nilaiKatrol !== null ? (
 <Badge variant="blue">{m.nilaiKatrol}</Badge>
 ) : <span className="text-aam-text-muted text-xs">—</span>}
 </td>
 <td className="px-3 py-2 text-center text-aam-text-muted">{KKM}</td>
 <td className="px-3 py-2">
 {nilaiTampil !== null ? (
 <Badge variant={nilaiTampil >= KKM ? 'green' : 'red'}>
 {nilaiTampil >= KKM ? 'Tuntas' : 'Belum Tuntas'}
 </Badge>
 ) : <span className="text-aam-text-muted">—</span>}
 </td>
 <td className="px-3 py-2 max-w-xs">
 {isEditing && !isFinal ? (
 <textarea className="w-full text-sm rounded border border-aam-border px-2 py-1" rows={2}
 value={overrides[m.mapelId]?.deskripsi ?? ''}
 onChange={e => setOverrides(prev => ({ ...prev, [m.mapelId]: { ...prev[m.mapelId], deskripsi: e.target.value } }))}
 placeholder={m.deskripsiAuto}
 id={`input-deskripsi-${m.mapelId}`} />
 ) : (
 <span className={`text-xs ${!m.deskripsiOverride ? 'text-aam-text-muted italic' : ''}`}>
 {m.deskripsiOverride ?? m.deskripsiAuto}
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

 {/* D. Kokurikuler */}
 <div id="section-kokurikuler">
 <Card>
 <h3 className="font-bold text-aam-text mb-3">D. Kokurikuler (Profil Pelajar Pancasila)</h3>
 {!rapor.kokurikuler || rapor.kokurikuler.length === 0 ? (
 <p className="text-sm text-aam-text-muted italic">Belum ada penilaian kokurikuler untuk siswa ini.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 {['Dimensi', 'Nilai', 'Deskripsi'].map(h => (
 <th key={h} className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-aam-border">
 {rapor.kokurikuler.map(k => (
 <tr key={k.namaDimensi} className="hover:bg-gray-50">
 <td className="px-3 py-2 font-medium">{k.namaDimensi}</td>
 <td className="px-3 py-2">
 {k.nilaiAkhir ? (
 <Badge variant={
 k.nilaiAkhir === 'Sangat Baik' ? 'green'
 : k.nilaiAkhir === 'Baik' ? 'blue'
 : k.nilaiAkhir === 'Cukup' ? 'yellow'
 : 'red'
 }>{k.nilaiAkhir}</Badge>
 ) : <span className="text-aam-text-muted">—</span>}
 </td>
 <td className="px-3 py-2 text-xs text-aam-text">{k.deskripsi || '—'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>
 </div>

 {/* E. Ekstrakurikuler */}
 <div id="section-ekskul">
 <Card>
 <h3 className="font-bold text-aam-text mb-3">E. Ekstrakurikuler</h3>
 {!rapor.ekstrakurikuler || rapor.ekstrakurikuler.length === 0 ? (
 <p className="text-sm text-aam-text-muted italic">Siswa tidak mengikuti ekstrakurikuler.</p>
 ) : (
 <div className="space-y-4">
 {rapor.ekstrakurikuler.map(e => {
 const isMerah = e.flagMerah ?? (e.kehadiranPersen !== null && e.kehadiranPersen < 70);
 return (
 <div key={e.ekskulId} className="border border-aam-border rounded-md p-3" id={`ekskul-rapor-${e.ekskulId}`}>
 <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
 <span className="font-semibold text-aam-text">{e.nama}</span>
 {e.kehadiranPersen !== null && (
 <div className="flex items-center gap-1.5">
 <span className="text-xs text-aam-text-muted">Kehadiran:</span>
 <Badge variant={isMerah ? 'red' : 'green'}>{e.kehadiranPersen}%</Badge>
 {isMerah && <span className="text-xs text-red-600">⚠️ &lt;70%</span>}
 </div>
 )}
 </div>
 {e.tujuan.length > 0 && (
 <table className="w-full text-xs">
 <tbody>
 {e.tujuan.map((t, ti) => (
 <tr key={ti} className="border-t border-aam-border first:border-0">
 <td className="py-1 pr-3">{t.deskripsi}</td>
 <td className="py-1 whitespace-nowrap">
 {t.nilai ? (
 <Badge variant={
 t.nilai === 'Sangat Baik' ? 'green'
 : t.nilai === 'Baik' ? 'blue'
 : t.nilai === 'Cukup' ? 'yellow'
 : 'red'
 }>{t.nilai}</Badge>
 ) : <span className="text-aam-text-muted">—</span>}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 {e.deskripsi && <p className="text-xs text-aam-text-muted italic mt-1">{e.deskripsi}</p>}
 </div>
 );
 })}
 </div>
 )}
 </Card>
 </div>

 {/* F. Catatan wali */}
 <Card>
 <h3 className="font-bold text-aam-text mb-3">F. Catatan Wali Kelas</h3>
 {isFinal ? (
 <p className="text-sm text-aam-text">{rapor.catatanWali || <span className="text-aam-text-muted italic">Tidak ada catatan.</span>}</p>
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
 </div>{/* /space-y-4 */}
 </PageContainer>
 );
}



