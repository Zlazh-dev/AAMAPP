import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

interface RekapEntry {
 siswaId: number;
 nama: string;
 nis?: string;
 nilaiAkhir: number | null;
}

export function RekapNilaiPage() {
 const { penugasanId } = useParams<{ penugasanId: string }>();
 const navigate = useNavigate();
 const toast = useToast();
 const [rows, setRows] = useState<RekapEntry[]>([]);
 const [loading, setLoading] = useState(true);

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const res = await (api as any).getRekapNilai?.(Number(penugasanId));
 setRows(res?.data ?? res ?? []);
 } catch (err) {
 toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat rekap nilai akhir.');
 } finally {
 setLoading(false);
 }
 }, [penugasanId]);

 useEffect(() => { load(); }, [load]);

 function nilaiVariant(n: number | null): 'green' | 'yellow' | 'red' | 'gray' {
 if (n === null) return 'gray';
 if (n >= 80) return 'green';
 if (n >= 70) return 'yellow';
 return 'red';
 }

 const rataRata = rows.length > 0
 ? (rows.filter(r => r.nilaiAkhir !== null).reduce((s, r) => s + (r.nilaiAkhir ?? 0), 0) /
 rows.filter(r => r.nilaiAkhir !== null).length) || 0
 : 0;

 return (
 <div className="mt-4">
 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
 <h3 className="font-bold text-aam-text">Rekap Nilai Akhir</h3>
 <div className="flex gap-2">
 <Button variant="secondary" onClick={load} id="btn-refresh-rekap">↻ Refresh</Button>
 <Button onClick={() => navigate(`/guru/penilaian/${penugasanId}/penilaian`)} id="btn-ke-penilaian">
 ← Ke Penilaian
 </Button>
 </div>
 </div>

 {rows.length > 0 && (
 <div className="mb-3 flex gap-3 flex-wrap">
 <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-sm">
 <span className="text-aam-text-muted">Rata-rata:</span>
 <span className="ml-1 font-bold text-blue-700">{rataRata.toFixed(1)}</span>
 </div>
 <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 text-sm">
 <span className="text-aam-text-muted">Sudah ada nilai:</span>
 <span className="ml-1 font-bold">{rows.filter(r => r.nilaiAkhir !== null).length}/{rows.length}</span>
 </div>
 </div>
 )}

 {loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
 <EmptyState icon="bar_chart" message="Belum ada data nilai. Tambahkan penilaian Sumatif dan input nilai terlebih dahulu." />
 ) : (
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">#</th>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">Nama Siswa</th>
 <th className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">NIS</th>
 <th className="px-3 py-2.5 text-center text-aam-text-muted font-semibold border-b border-aam-border">Nilai Akhir</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-aam-border">
 {rows.map((r, idx) => (
 <tr key={r.siswaId} className="hover:bg-gray-50">
 <td className="px-3 py-2 text-aam-text-muted">{idx + 1}</td>
 <td className="px-3 py-2 font-medium">{r.nama}</td>
 <td className="px-3 py-2 text-aam-text-muted">{r.nis ?? '—'}</td>
 <td className="px-3 py-2 text-center">
 {r.nilaiAkhir !== null
 ? <Badge variant={nilaiVariant(r.nilaiAkhir)}>{r.nilaiAkhir}</Badge>
 : <span className="text-aam-text-muted text-xs">Belum ada nilai Sumatif</span>
 }
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p className="text-xs text-aam-text-muted mt-2 px-3 pb-1">
 Formula: round(Σ(nilai×bobot)/Σ(bobot)) — hanya penilaian Sumatif.
 </p>
 </Card>
 )}
 </div>
 );
}


