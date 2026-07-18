import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { NILAI_OPTIONS, NilaiKokurikuler, nilaiToVariant } from './kokurikulerConstants';

interface Target {
  id: number;
  namaDimensi: string;
}

interface SiswaAsesmen {
  siswaId: number;
  nama: string;
  nis: string | null;
}

type AsesmenMap = Record<string, NilaiKokurikuler | null>;
// key = `${siswaId}-${targetId}`

export function KokurikulerAsesmenPage() {
  const { kegiatanId } = useParams<{ kegiatanId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [targets, setTargets] = useState<Target[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaAsesmen[]>([]);
  const [nilai, setNilai] = useState<AsesmenMap>({});
  const [kelasId, setKelasId] = useState<number | null>(null);
  const [kelasList, setKelasList] = useState<{ id: number; nama: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.adminGetKelas({ limit: 100 })
      .then((r: any) => {
        const list = r?.data ?? [];
        setKelasList(list);
        if (list.length > 0) setKelasId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!kelasId || !kegiatanId) return;
    setLoading(true);
    try {
      const res = await (api as any).getKokurikulerAsesmen?.(Number(kegiatanId), kelasId);
      setTargets(res?.targets ?? []);
      setSiswaList(res?.siswa ?? []);
      const map: AsesmenMap = {};
      (res?.asesmen ?? []).forEach((a: any) => {
        map[`${a.siswaId}-${a.targetId}`] = a.nilai;
      });
      setNilai(map);
    } catch {
      toast.show('error', 'Gagal memuat data asesmen.');
    } finally {
      setLoading(false);
    }
  }, [kegiatanId, kelasId]);

  useEffect(() => { load(); }, [load]);

  const handleSet = (siswaId: number, targetId: number, n: NilaiKokurikuler) => {
    const key = `${siswaId}-${targetId}`;
    setNilai(prev => ({
      ...prev,
      [key]: prev[key] === n ? null : n, // toggle
    }));
  };

  const handleSimpan = async () => {
    const entri = siswaList.flatMap(s =>
      targets.map(t => ({
        siswaId: s.siswaId,
        targetId: t.id,
        nilai: nilai[`${s.siswaId}-${t.id}`] ?? null,
      }))
    ).filter(e => e.nilai !== null) as { siswaId: number; targetId: number; nilai: NilaiKokurikuler }[];

    setSaving(true);
    try {
      await (api as any).putKokurikulerAsesmen?.(Number(kegiatanId), kelasId, { entri });
      toast.show('success', 'Asesmen berhasil disimpan.');
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan asesmen.');
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.values(nilai).filter(v => v !== null).length;
  const totalCells = siswaList.length * targets.length;

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/guru/kokurikuler')} id="btn-back-asesmen">
            ← Kegiatan Saya
          </Button>
          <div>
            <h2 className="text-lg font-bold text-aam-text">Input Asesmen Kokurikuler</h2>
            <p className="text-sm text-aam-muted">Klik tombol untuk set nilai; klik lagi untuk hapus.</p>
          </div>
        </div>
        <Button onClick={handleSimpan} disabled={saving} id="btn-simpan-asesmen">
          {saving ? 'Menyimpan...' : '💾 Simpan Asesmen'}
        </Button>
      </div>

      {/* Kelas selector */}
      {kelasList.length > 1 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-medium text-aam-muted">Kelas:</label>
          <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={kelasId ?? ''} onChange={e => setKelasId(Number(e.target.value))}
            id="select-kelas-asesmen">
            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
      )}

      {loading ? <TableSkeleton rows={5} /> : siswaList.length === 0 ? (
        <EmptyState icon="people" message="Tidak ada siswa di kelas ini atau kamu bukan anggota tim kegiatan ini." />
      ) : (
        <Card>
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            <Badge variant={filledCount === totalCells ? 'green' : 'yellow'}>
              {filledCount}/{totalCells} terisi
            </Badge>
            <span className="text-xs text-aam-muted">Klik SB/B/C/K untuk set nilai (toggle).</span>
          </div>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border sticky left-0 bg-gray-50 min-w-[150px]">Nama Siswa</th>
                  {targets.map(t => (
                    <th key={t.id} className="px-2 py-2.5 text-center text-aam-muted font-semibold border-b border-aam-border whitespace-nowrap min-w-[120px]">
                      {t.namaDimensi}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {siswaList.map(s => (
                  <tr key={s.siswaId} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-white">{s.nama}</td>
                    {targets.map(t => {
                      const key = `${s.siswaId}-${t.id}`;
                      const current = nilai[key] ?? null;
                      return (
                        <td key={t.id} className="px-2 py-2 text-center">
                          <div className="flex gap-0.5 justify-center flex-wrap">
                            {NILAI_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={() => handleSet(s.siswaId, t.id, opt)}
                                id={`btn-nilai-${s.siswaId}-${t.id}-${opt.replace(/\s/g, '')}`}
                                className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                                  current === opt
                                    ? opt === 'Sangat Baik' ? 'bg-green-500 text-white border-green-500'
                                    : opt === 'Baik' ? 'bg-blue-500 text-white border-blue-500'
                                    : opt === 'Cukup' ? 'bg-yellow-500 text-white border-yellow-500'
                                    : 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-aam-muted border-aam-border hover:bg-gray-50'
                                }`}
                              >
                                {opt === 'Sangat Baik' ? 'SB' : opt === 'Baik' ? 'B' : opt === 'Cukup' ? 'C' : 'K'}
                              </button>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
