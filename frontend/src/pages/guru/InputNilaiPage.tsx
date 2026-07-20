import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

interface NilaiSiswa {
 siswaId: number;
 nama: string;
 nis: string | null;
 nilai: number | null;
 catatan: string | null;
}

interface PenilaianInfo {
 id: number;
 nama: string;
 jenis: string;
 bobot: number;
 tanggal: string;
}

export function InputNilaiPage() {
 const { penilaianId } = useParams<{ penilaianId: string }>();
 const navigate = useNavigate();
 const toast = useToast();

 const [info, setInfo] = useState<PenilaianInfo | null>(null);
 const [siswaList, setSiswaList] = useState<NilaiSiswa[]>([]);
 const [nilaiMap, setNilaiMap] = useState<Record<number, number | ''>>({});
 const [catatanMap, setCatatanMap] = useState<Record<number, string>>({});
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const res = await (api as any).getNilaiList?.(Number(penilaianId));
 const p: PenilaianInfo = res?.penilaian ?? res?.info;
 const siswa: NilaiSiswa[] = res?.siswa ?? res?.data ?? [];
 setInfo(p);
 setSiswaList(siswa);
 const nm: Record<number, number | ''> = {};
 const cm: Record<number, string> = {};
 siswa.forEach((s: NilaiSiswa) => {
 nm[s.siswaId] = s.nilai ?? '';
 cm[s.siswaId] = s.catatan ?? '';
 });
 setNilaiMap(nm);
 setCatatanMap(cm);
 } catch (err) {
 toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data nilai.');
 } finally {
 setLoading(false);
 }
 }, [penilaianId]);

 useEffect(() => { load(); }, [load]);

 const handleNilaiChange = (siswaId: number, raw: string) => {
 if (raw === '') {
 setNilaiMap(prev => ({ ...prev, [siswaId]: '' }));
 return;
 }
 const v = Math.min(100, Math.max(0, Number(raw)));
 setNilaiMap(prev => ({ ...prev, [siswaId]: v }));
 };

 const handleSimpan = async () => {
 const entri = siswaList.map(s => ({
 siswaId: s.siswaId,
 nilai: nilaiMap[s.siswaId] === '' ? null : Number(nilaiMap[s.siswaId]),
 catatan: catatanMap[s.siswaId] || undefined,
 })).filter(e => e.nilai !== null);

 setSaving(true);
 try {
 await (api as any).putNilai?.(Number(penilaianId), { entri });
 toast.show('success', 'Nilai berhasil disimpan.');
 } catch (e: any) {
 toast.show('error', e.message ?? 'Gagal menyimpan nilai.');
 } finally {
 setSaving(false);
 }
 };

 const belumDiisiCount = siswaList.filter(s => nilaiMap[s.siswaId] === '').length;

 return (
 <PageContainer>
 <div className="flex items-center gap-3 mb-4 flex-wrap">
 <Button variant="secondary" onClick={() => navigate(-1)} id="btn-back-nilai">← Kembali</Button>
 <div>
 <h2 className="text-lg font-bold text-aam-text">{info?.nama ?? 'Input Nilai'}</h2>
 {info && (
 <p className="text-sm text-aam-text-muted">{info.jenis} · Bobot {info.bobot} · {info.tanggal}</p>
 )}
 </div>
 </div>

 {belumDiisiCount > 0 && (
 <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
 ⚠️ {belumDiisiCount} siswa belum diisi (ditandai kuning).
 </div>
 )}

 {loading ? <TableSkeleton rows={5} /> : (
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">Nama Siswa</th>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">NIS</th>
 <th className="px-3 py-2.5 text-center text-aam-text-muted font-semibold border-b border-aam-border w-28">Nilai (0–100)</th>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">Catatan</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-aam-border">
 {siswaList.map(s => {
 const belumDiisi = nilaiMap[s.siswaId] === '';
 return (
 <tr key={s.siswaId} className={belumDiisi ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
 <td className="px-3 py-2 font-medium">{s.nama}</td>
 <td className="px-3 py-2 text-aam-text-muted">{s.nis ?? '—'}</td>
 <td className="px-3 py-2 text-center">
 <input
 type="number"
 min={0}
 max={100}
 className={`w-20 text-center rounded-md border px-2 py-1 text-sm ${belumDiisi ? 'border-yellow-400 bg-yellow-50' : 'border-aam-border'}`}
 value={nilaiMap[s.siswaId] ?? ''}
 onChange={e => handleNilaiChange(s.siswaId, e.target.value)}
 id={`input-nilai-${s.siswaId}`}
 placeholder="—"
 />
 </td>
 <td className="px-3 py-2">
 <input
 type="text"
 className="w-full rounded-md border border-aam-border px-2 py-1 text-sm"
 value={catatanMap[s.siswaId] ?? ''}
 onChange={e => setCatatanMap(prev => ({ ...prev, [s.siswaId]: e.target.value }))}
 id={`input-catatan-${s.siswaId}`}
 placeholder="Opsional..."
 />
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 <div className="flex items-center justify-between pt-4 px-1 flex-wrap gap-3">
 <div className="flex items-center gap-3">
 <Badge variant={belumDiisiCount > 0 ? 'yellow' : 'green'}>
 {siswaList.length - belumDiisiCount}/{siswaList.length} terisi
 </Badge>
 </div>
 <Button onClick={handleSimpan} disabled={saving} id="btn-simpan-nilai">
 {saving ? 'Menyimpan...' : '💾 Simpan Nilai'}
 </Button>
 </div>
 </Card>
 )}
 </PageContainer>
 );
}


