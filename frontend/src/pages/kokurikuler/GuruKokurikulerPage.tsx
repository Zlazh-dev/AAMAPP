import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

interface KegiatanGuru {
  id: number;
  tema: string;
  semester: number;
  targetDimensi: string[];
  kelasPenilai: string[];
}

export function GuruKokurikulerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<KegiatanGuru[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api as any).getGuruKokurikuler?.()
      .then((res: any) => setRows(res?.data ?? res ?? []))
      .catch(() => toast.show('error', 'Gagal memuat kegiatan.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Kokurikuler — Kegiatan Saya</h2>
        <p className="text-sm text-aam-muted mt-0.5">Kegiatan di mana kamu ditugaskan sebagai penilai.</p>
      </div>

      {loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
        <EmptyState icon="school" message="Kamu belum ditugaskan sebagai penilai di kegiatan kokurikuler manapun." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(k => (
            <div key={k.id} id={`guru-kok-card-${k.id}`}>
              <Card className="h-full flex flex-col">
                <h3 className="font-bold text-aam-text">{k.tema}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="blue">Semester {k.semester}</Badge>
                  {k.kelasPenilai?.map(kn => (
                    <Badge key={kn} variant="gray">{kn}</Badge>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {k.targetDimensi.slice(0, 3).map(d => (
                    <span key={d} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">{d}</span>
                  ))}
                  {k.targetDimensi.length > 3 && (
                    <span className="text-xs text-aam-muted">+{k.targetDimensi.length - 3} lainnya</span>
                  )}
                </div>
                <div className="mt-auto pt-3">
                  <Button onClick={() => navigate(`/guru/kokurikuler/${k.id}/asesmen`)}
                    className="w-full" id={`btn-asesmen-${k.id}`}>
                    Input Asesmen
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
