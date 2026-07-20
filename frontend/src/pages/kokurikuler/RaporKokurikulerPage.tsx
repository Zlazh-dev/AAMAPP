import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { nilaiToVariant, NilaiKokurikuler } from './kokurikulerConstants';

interface DimensiRapor {
  namaDimensi: string;
  nilaiAkhir: NilaiKokurikuler | null;
  deskripsi: string;
}

interface RaporKokurikuler {
  siswaId: number;
  nama: string;
  kelas: string;
  semester: number;
  dimensi: DimensiRapor[];
}

export function RaporKokurikulerPage() {
  const { siswaId } = useParams<{ siswaId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [rapor, setRapor] = useState<RaporKokurikuler | null>(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getRaporKokurikuler?.(Number(siswaId), semester);
      setRapor(res?.data ?? res ?? null);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat rapor kokurikuler.');
    } finally {
      setLoading(false);
    }
  }, [siswaId, semester]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="secondary" onClick={() => navigate(-1)} id="btn-back-rapor-kok">← Kembali</Button>
        <div>
          <h2 className="text-lg font-bold text-aam-text">Rapor Kokurikuler</h2>
          {rapor && <p className="text-sm text-aam-text-muted">{rapor.nama} · {rapor.kelas}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-aam-text-muted">Semester:</label>
          <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={semester} onChange={e => setSemester(Number(e.target.value))}
            id="select-semester-rapor-kok">
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : !rapor || rapor.dimensi.length === 0 ? (
        <EmptyState icon="school" message="Belum ada data kokurikuler untuk siswa ini semester ini." />
      ) : (
        <Card>
          <h3 className="font-bold text-aam-text mb-4">Nilai per Dimensi — Semester {rapor.semester}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Dimensi', 'Nilai Akhir', 'Deskripsi'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-aam-text-muted font-semibold border-b border-aam-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rapor.dimensi.map(d => (
                  <tr key={d.namaDimensi} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{d.namaDimensi}</td>
                    <td className="px-3 py-2">
                      {d.nilaiAkhir
                        ? <Badge variant={nilaiToVariant(d.nilaiAkhir)}>{d.nilaiAkhir}</Badge>
                        : <span className="text-aam-text-muted text-xs">Belum dinilai</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-sm text-aam-text max-w-xs">
                      {d.deskripsi || <span className="text-aam-text-muted italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-aam-text-muted mt-2 px-1">
            Formula: rata-rata skor penilai (SB=4, B=3, C=2, K=1) → &gt;3.5 SB · &gt;2.5 B · &gt;1.5 C · else K.
          </p>
        </Card>
      )}
    </PageContainer>
  );
}
