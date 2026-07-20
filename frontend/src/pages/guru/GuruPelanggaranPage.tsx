import React, { useState, useCallback, useEffect } from 'react';
import { api, PelanggaranEntry, KatalogEntry, StatusPelanggaran , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { SearchSelect } from '../../components/SearchSelect';

const STATUS_VARIANT: Record<StatusPelanggaran, 'gray' | 'yellow' | 'red' | 'blue'> = {
 MENUNGGU: 'yellow', DISETUJUI: 'gray', DITOLAK: 'red',
};

function todayWIB(): string {
 return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * /guru/pelanggaran — Guru: lapor pelanggaran (masuk antrean MENUNGGU) +
 * daftar laporan sendiri dengan status.
 */
export function GuruPelanggaranPage() {
 const toast = useToast();
 const [rows, setRows] = useState<PelanggaranEntry[]>([]);
 const [loading, setLoading] = useState(false);
 const [katalog, setKatalog] = useState<KatalogEntry[]>([]);
 const [siswaOptions, setSiswaOptions] = useState<{ value: string | number; label: string }[]>([]);
 const [katalogOptions, setKatalogOptions] = useState<{ value: string | number; label: string }[]>([]);

 const [formOpen, setFormOpen] = useState(false);
 const [siswaId, setSiswaId] = useState<string | number | null>(null);
 const [katalogId, setKatalogId] = useState<string | number | null>(null);
 const [tanggal, setTanggal] = useState(todayWIB());
 const [catatan, setCatatan] = useState('');
 const [saving, setSaving] = useState(false);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const res = await api.getPelanggaran({ limit: 50 });
 setRows(res.data);
 } catch (err) {
 toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat laporan pelanggaran.');
 } finally {
 setLoading(false);
 }
 }, []);

  useEffect(() => {
  load();
  }, [load]);

  // Pencarian sisi-server untuk pemilih siswa & katalog (bukan ambil 200 baris).
  const searchSiswa = useCallback(async (q: string) => {
  const r: any = await api.adminGetSiswa({ q: q || undefined, limit: 20 });
  const opts = (r.data ?? []).map((s: any) => ({ value: s.id, label: `${s.nama} (${s.nis ?? '-'})` }));
  setSiswaOptions((prev) => { const seen = new Set(prev.map((o: any) => o.value)); return [...prev, ...opts.filter((o: any) => !seen.has(o.value))]; });
  return opts;
  }, []);

  const searchKatalog = useCallback(async (q: string) => {
  const r: any = await api.getKatalog({ q: q || undefined, limit: 20 });
  const active: KatalogEntry[] = (r.data ?? []).filter((k: KatalogEntry) => k.aktif);
  const opts = active.map((k: KatalogEntry) => ({ value: k.id, label: `[${k.kategori}] ${k.bentuk} (${k.poin} poin)` }));
  setKatalog((prev) => { const seen = new Set(prev.map((k) => k.id)); return [...prev, ...active.filter((k) => !seen.has(k.id))]; });
  setKatalogOptions((prev) => { const seen = new Set(prev.map((o: any) => o.value)); return [...prev, ...opts.filter((o: any) => !seen.has(o.value))]; });
  return opts;
  }, []);

  const selectedKatalog = katalog.find(k => k.id === Number(katalogId));

 const handleLapor = async () => {
 if (!siswaId) { toast.show('error', 'Pilih siswa.'); return; }
 if (!katalogId) { toast.show('error', 'Pilih butir pelanggaran.'); return; }
 if (!tanggal) { toast.show('error', 'Tanggal wajib diisi.'); return; }
 setSaving(true);
 try {
 await api.catatPelanggaran({
 siswaId: Number(siswaId),
 katalogId: Number(katalogId),
 tanggal,
 catatan: catatan.trim() || undefined,
 });
 toast.show('success', 'Laporan dikirim — menunggu verifikasi kesiswaan.');
 setFormOpen(false);
 setSiswaId(null); setKatalogId(null); setCatatan(''); setTanggal(todayWIB());
 load();
 } catch (e: any) {
 toast.show('error', e.message ?? 'Gagal mengirim laporan.');
 } finally {
 setSaving(false);
 }
 };

 return (
 <PageContainer>
 <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
 <div>
 <h2 className="text-xl font-bold text-aam-text">Laporan Pelanggaran</h2>
 <p className="text-sm text-aam-text-muted mt-0.5">Laporkan pelanggaran siswa — masuk antrean verifikasi.</p>
 </div>
 <Button onClick={() => setFormOpen(true)} id="btn-lapor-pelanggaran">+ Lapor Pelanggaran</Button>
 </div>

 <Card>
 {loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
 <EmptyState icon="report" message="Belum ada laporan yang pernah Anda buat." />
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 {['Siswa','Bentuk','Poin','Tanggal','Status'].map(h => (
 <th key={h} className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-aam-border">
 {rows.map(row => (
 <tr key={row.id} className="hover:bg-gray-50">
 <td className="px-3 py-2 font-medium">{row.siswaNama}</td>
 <td className="px-3 py-2 max-w-[200px] truncate">{row.katalogBentuk ?? '—'}</td>
 <td className="px-3 py-2 text-right">{row.poin}</td>
 <td className="px-3 py-2 whitespace-nowrap">{row.tanggal}</td>
 <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge></td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </Card>

 {/* Inline sheet form lapor */}
 {formOpen && (
 <>
 <div className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center" onClick={() => setFormOpen(false)} />
 <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
 <div className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto pointer-events-auto" onClick={e => e.stopPropagation()}>
 <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />
 <h3 className="font-bold text-aam-text text-lg mb-2">Lapor Pelanggaran</h3>
 <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-4">
 Laporan akan masuk antrean verifikasi — belum memotong saldo poin.
 </div>
 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-aam-text-muted mb-1">Siswa *</label>
  <SearchSelect options={siswaOptions} value={siswaId} onChange={(v: string | number | null) => setSiswaId(v)} onSearch={searchSiswa}
 placeholder="Cari dan pilih siswa..." searchPlaceholder="Ketik nama/NIS..." clearable />
 </div>
 <div>
 <label className="block text-xs font-medium text-aam-text-muted mb-1">Butir Pelanggaran *</label>
  <SearchSelect options={katalogOptions} value={katalogId} onChange={(v: string | number | null) => setKatalogId(v)} onSearch={searchKatalog}
 placeholder="Pilih butir tata tertib..." searchPlaceholder="Cari butir..." clearable />
 </div>
 {selectedKatalog && (
 <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm" id="guru-preview-poin">
 <span className="font-medium">Kategori:</span> {selectedKatalog.kategori} —{' '}
 <span className="font-medium">Poin:</span> {selectedKatalog.poin}
 </div>
 )}
 <div>
 <label className="block text-xs font-medium text-aam-text-muted mb-1">Tanggal *</label>
 <input type="date" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
 value={tanggal} onChange={e => setTanggal(e.target.value)} id="guru-input-tanggal" />
 </div>
 <div>
 <label className="block text-xs font-medium text-aam-text-muted mb-1">Catatan (opsional)</label>
 <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={2}
 value={catatan} onChange={e => setCatatan(e.target.value)} id="guru-input-catatan"
 placeholder="Keterangan tambahan..." />
 </div>
 <div className="flex gap-3 justify-end pt-2">
 <Button variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button>
 <Button onClick={handleLapor} disabled={saving} id="btn-kirim-laporan">
 {saving ? 'Mengirim...' : 'Kirim Laporan'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </PageContainer>
 );
}




