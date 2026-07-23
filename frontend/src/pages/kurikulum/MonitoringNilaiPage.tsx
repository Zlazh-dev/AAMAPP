import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

type StatusNilai = 'Kosong' | 'Pending' | 'Proses' | 'Selesai';

function StatusBadge({ status }: { status: StatusNilai }) {
  const variantMap: Record<StatusNilai, 'red' | 'yellow' | 'purple' | 'green'> = {
    Kosong: 'red',
    Pending: 'yellow',
    Proses: 'purple',
    Selesai: 'green',
  };
  return <Badge variant={variantMap[status]}>{status}</Badge>;
}

function ProgressBar({ persen }: { persen: number }) {
  const color = persen >= 100 ? 'bg-green-500' : persen > 0 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, persen)}%` }}
        />
      </div>
      <span className="text-xs text-aam-text-muted w-10 text-right">{persen}%</span>
    </div>
  );
}

export function MonitoringNilaiPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [expandedGuru, setExpandedGuru] = useState<number | null>(null);
  const [copiedGuruId, setCopiedGuruId] = useState<number | null>(null);

  React.useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getMonitoringNilai();
      setData(res);
    } catch (err: any) {
      toast.show('error', err?.body?.message ?? 'Gagal memuat monitoring nilai');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyTagihan(guru: any) {
    if (!guru.tagihanWa) return;
    navigator.clipboard.writeText(guru.tagihanWa).then(() => {
      setCopiedGuruId(guru.guruId);
      setTimeout(() => setCopiedGuruId(null), 2000);
    });
  }

  const filteredData = (data?.data ?? []).filter((g: any) =>
    filterStatus ? g.guruStatus === filterStatus : true,
  );

  const r = data?.ringkasan;

  return (
    <PageContainer size="xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-heading font-bold text-aam-text">
            Monitoring Progres Input Nilai
          </h2>
          <p className="text-xs text-aam-text-muted mt-0.5">
            Per guru-mapel-kelas — TA aktif
          </p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* ⚠️ Transparansi: Peringatan angka bolong */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <span className="font-bold">⚠️ Perhatian:</span> Nilai kosong (NULL) <strong>tidak masuk pembagi</strong>{' '}
        formula rapor — rapor bisa tampak wajar padahal data bolong. Monitoring ini menampilkan angka bolong secara
        eksplisit. Kolom <em>Bolong</em> = nilai yang belum diisi dari total target.
      </div>

      {/* Ringkasan */}
      {r && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total Paket', value: r.total, color: 'text-aam-text' },
            { label: 'Selesai', value: r.selesai, color: 'text-green-600' },
            { label: 'Proses', value: r.proses, color: 'text-purple-600' },
            { label: 'Pending', value: r.pending, color: 'text-amber-600' },
            { label: 'Kosong', value: r.kosong, color: 'text-red-600' },
          ].map((s) => (
            <Card key={s.label} className="p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-aam-text-muted mt-1">{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'Selesai', 'Proses', 'Pending', 'Kosong'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilterStatus(s)}
            className={[
              'px-3 py-1.5 text-xs rounded-lg border transition-colors',
              filterStatus === s
                ? 'bg-aam-green text-white border-aam-green'
                : 'bg-white text-aam-text-muted border-aam-border hover:border-aam-green/40',
            ].join(' ')}
          >
            {s || 'Semua Guru'}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="space-y-3">
          {filteredData.map((guru: any) => (
            <Card key={guru.guruId} className="overflow-hidden">
              {/* Header baris guru */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedGuru(expandedGuru === guru.guruId ? null : guru.guruId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-aam-text">{guru.guruNama}</span>
                    <StatusBadge status={guru.guruStatus} />
                    <span className="text-xs text-aam-text-muted">
                      {guru.paket.length} paket
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar persen={guru.guruPersen} />
                  </div>
                  <p className="text-xs text-aam-text-muted mt-0.5">
                    {guru.totalRealisasi} / {guru.totalTarget} nilai diisi
                    {guru.totalTarget > guru.totalRealisasi && (
                      <span className="text-red-500 ml-2">
                        • {guru.totalTarget - guru.totalRealisasi} nilai kosong
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {guru.tagihanWa && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copiedGuruId === guru.guruId ? 'check' : 'content_copy'}
                      onClick={(e) => { e.stopPropagation(); handleCopyTagihan(guru); }}
                    >
                      {copiedGuruId === guru.guruId ? 'Disalin!' : 'Salin Tagihan'}
                    </Button>
                  )}
                  <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                    {expandedGuru === guru.guruId ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>

              {/* Detail paket per guru */}
              {expandedGuru === guru.guruId && (
                <div className="border-t border-aam-border">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-aam-text-muted">Mapel</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-aam-text-muted">Kelas</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-aam-text-muted">Siswa</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-aam-text-muted">Target</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-aam-text-muted">Terisi</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-red-500">Bolong</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-aam-text-muted">Progres</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-aam-text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {guru.paket.map((p: any) => (
                        <tr
                          key={p.penugasanId}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/guru/penilaian/${p.penugasanId}`)}
                        >
                          <td className="px-4 py-2 font-medium text-aam-text">{p.mapelNama}</td>
                          <td className="px-4 py-2 text-aam-text-muted">{p.kelasNama}</td>
                          <td className="px-4 py-2 text-right text-aam-text-muted">{p.jumlahSiswa}</td>
                          <td className="px-4 py-2 text-right text-aam-text-muted">{p.targetNilai}</td>
                          <td className="px-4 py-2 text-right text-aam-text-muted">{p.realisasiNilai}</td>
                          <td className={`px-4 py-2 text-right font-medium ${p.targetNilai - p.realisasiNilai > 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {p.targetNilai - p.realisasiNilai}
                          </td>
                          <td className="px-4 py-2 w-32">
                            <ProgressBar persen={p.persen} />
                          </td>
                          <td className="px-4 py-2">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}

          {filteredData.length === 0 && !loading && (
            <div className="text-center py-12 text-aam-text-muted">
              {filterStatus ? `Tidak ada guru dengan status ${filterStatus}` : 'Belum ada data penugasan'}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
