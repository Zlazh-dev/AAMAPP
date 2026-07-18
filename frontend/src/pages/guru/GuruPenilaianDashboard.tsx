import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { Badge } from '../../components/Badge';

interface PaketGuru {
  penugasanId: number;
  mapelNama: string;
  kelasNama: string;
  jumlahSiswa: number;
  jumlahPenilaian: number;
}

export function GuruPenilaianDashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [pakets, setPakets] = useState<PaketGuru[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getPenilaianPaket?.();
      setPakets(res?.data ?? res ?? []);
    } catch {
      toast.show('error', 'Gagal memuat paket penilaian.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <PageContainer>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-aam-text">Penilaian</h2>
        <p className="text-sm text-aam-muted mt-0.5">Daftar paket mapel–kelas yang kamu ampu semester ini.</p>
      </div>

      {loading ? <TableSkeleton rows={3} /> : pakets.length === 0 ? (
        <EmptyState
          icon="school"
          message="Kamu belum ditugaskan ke kelas manapun untuk semester ini. Hubungi operator kurikulum."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pakets.map(p => (
            <div key={p.penugasanId} id={`paket-card-${p.penugasanId}`}>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border border-aam-border"
                onClick={() => navigate(`/guru/penilaian/${p.penugasanId}`)}
              >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-aam-text text-base">{p.mapelNama}</h3>
                  <p className="text-sm text-aam-muted mt-0.5">{p.kelasNama}</p>
                </div>
                <span className="text-2xl">📚</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge variant="blue">{p.jumlahSiswa} siswa</Badge>
                <Badge variant="gray">{p.jumlahPenilaian} penilaian</Badge>
              </div>
              <p className="text-xs text-aam-muted mt-3">Klik untuk kelola TP & Penilaian →</p>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

