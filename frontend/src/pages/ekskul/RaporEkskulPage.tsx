import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { nilaiToVariant, NilaiKokurikuler } from '../kokurikuler/kokurikulerConstants';

interface EkskulRaporItem {
  ekskulId: number;
  ekskulNama: string;
  pembinaNama: string | null;
  kehadiranPct: number | null;
  nilaiPerTujuan: {
    tujuanId: number;
    deskripsi: string;
    nilai: NilaiKokurikuler | null;
  }[];
  deskripsiAuto: string;
}

export function RaporEkskulPage() {
  const { siswaId } = useParams<{ siswaId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<EkskulRaporItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getRaporEkskul?.(Number(siswaId), semester);
      setRows(res?.data ?? res ?? []);
    } catch {
      toast.show('error', 'Gagal memuat rapor ekskul.');
    } finally {
      setLoading(false);
    }
  }, [siswaId, semester]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="secondary" onClick={() => navigate(-1)} id="btn-back-rapor-ekskul">← Kembali</Button>
        <div>
          <h2 className="text-lg font-bold text-aam-text">Rapor Ekstrakurikuler</h2>
          <p className="text-sm text-aam-muted">Penilaian kegiatan ekskul yang diikuti siswa.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-aam-muted">Semester:</label>
          <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={semester} onChange={e => setSemester(Number(e.target.value))}
            id="select-semester-rapor-ekskul">
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={4} /> : rows.length === 0 ? (
        <EmptyState icon="sports" message="Siswa ini tidak mengikuti ekstrakurikuler di semester ini." />
      ) : (
        <div className="space-y-4">
          {rows.map(e => {
            const isMerah = e.kehadiranPct !== null && e.kehadiranPct < 70;
            return (
              <div key={e.ekskulId} id={`rapor-ekskul-card-${e.ekskulId}`}>
                <Card>
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div>
                      <h3 className="font-bold text-aam-text">{e.ekskulNama}</h3>
                      {e.pembinaNama && <p className="text-xs text-aam-muted">Pembina: {e.pembinaNama}</p>}
                    </div>
                    {e.kehadiranPct !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-aam-muted">Kehadiran:</span>
                        <Badge variant={isMerah ? 'red' : 'green'}>{e.kehadiranPct}%</Badge>
                        {isMerah && <span className="text-xs text-red-600">⚠️ &lt;70%</span>}
                      </div>
                    )}
                  </div>
                  <div className="overflow-x-auto mb-3">
                    <table className="text-sm w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-aam-muted font-semibold border-b">Tujuan</th>
                          <th className="px-3 py-2 text-center text-aam-muted font-semibold border-b">Nilai</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-aam-border">
                        {e.nilaiPerTujuan.map(n => (
                          <tr key={n.tujuanId} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{n.deskripsi}</td>
                            <td className="px-3 py-2 text-center">
                              {n.nilai
                                ? <Badge variant={nilaiToVariant(n.nilai)}>{n.nilai}</Badge>
                                : <span className="text-aam-muted text-xs">Belum dinilai</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {e.deskripsiAuto && (
                    <p className="text-xs text-aam-muted italic border-t pt-2">{e.deskripsiAuto}</p>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
