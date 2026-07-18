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
import { NILAI_OPTIONS, NilaiKokurikuler, nilaiToVariant } from '../kokurikuler/kokurikulerConstants';

interface Peserta { id: number; siswaId: number; nama: string; nis: string | null; }
interface Tujuan { id: number; semester: number; deskripsi: string; }
type NilaiMap = Record<string, NilaiKokurikuler | null>; // `${pesertaId}-${tujuanId}`
type KehadiranMap = Record<number, { jumlahHadir: number | ''; totalPertemuan: number | '' }>; // pesertaId

export function EkskulPembinaPage() {
  const { ekskulId } = useParams<{ ekskulId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [ekskul, setEkskul] = useState<{ nama: string } | null>(null);
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [tujuan, setTujuan] = useState<Tujuan[]>([]);
  const [nilai, setNilai] = useState<NilaiMap>({});
  const [kehadiran, setKehadiran] = useState<KehadiranMap>({});
  const [semester, setSemester] = useState(1);
  const [loading, setLoading] = useState(true);

  // Tujuan sheet
  const [tujuanSheet, setTujuanSheet] = useState(false);
  const [editTujuanId, setEditTujuanId] = useState<number | null>(null);
  const [tujuanDeskripsi, setTujuanDeskripsi] = useState('');

  // Peserta add
  const [siswaSheet, setSiswaSheet] = useState(false);
  const [cariSiswa, setCariSiswa] = useState('');
  const [siswaResults, setSiswaResults] = useState<{ id: number; nama: string; nis: string | null }[]>([]);
  const [searchingS, setSearchingS] = useState(false);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await (api as any).getEkskulDetail?.(Number(ekskulId), semester);
      setEkskul({ nama: res?.nama ?? '' });
      setPeserta(res?.peserta ?? []);
      setTujuan((res?.tujuan ?? []).filter((t: Tujuan) => t.semester === semester));

      const nm: NilaiMap = {};
      (res?.nilai ?? []).forEach((n: any) => {
        nm[`${n.pesertaId}-${n.tujuanId}`] = n.nilai;
      });
      setNilai(nm);

      const km: KehadiranMap = {};
      (res?.kehadiran ?? []).forEach((k: any) => {
        km[k.pesertaId] = { jumlahHadir: k.jumlahHadir, totalPertemuan: k.totalPertemuan };
      });
      setKehadiran(km);
    } catch {
      toast.show('error', 'Gagal memuat data ekskul.');
    } finally {
      setLoading(false);
    }
  }, [ekskulId, semester]);

  useEffect(() => { load(); }, [load]);

  const toggleNilai = (pesertaId: number, tujuanId: number, n: NilaiKokurikuler) => {
    const key = `${pesertaId}-${tujuanId}`;
    setNilai(prev => ({ ...prev, [key]: prev[key] === n ? null : n }));
  };

  const handleSimpanNilai = async () => {
    const entri = peserta.flatMap(p =>
      tujuan.map(t => ({ pesertaId: p.id, tujuanId: t.id, nilai: nilai[`${p.id}-${t.id}`] ?? null }))
    ).filter(e => e.nilai !== null) as { pesertaId: number; tujuanId: number; nilai: NilaiKokurikuler }[];
    setSaving(true);
    try {
      await (api as any).putEkskulNilai?.(Number(ekskulId), { semester, entri });
      toast.show('success', 'Nilai berhasil disimpan.');
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  const handleSimpanKehadiran = async () => {
    const entri = peserta
      .map(p => {
        const k = kehadiran[p.id];
        return k ? { pesertaId: p.id, jumlahHadir: Number(k.jumlahHadir) || 0, totalPertemuan: Number(k.totalPertemuan) || 0 } : null;
      })
      .filter(Boolean) as { pesertaId: number; jumlahHadir: number; totalPertemuan: number }[];
    setSaving(true);
    try {
      await (api as any).putEkskulKehadiran?.(Number(ekskulId), { semester, entri });
      toast.show('success', 'Kehadiran berhasil disimpan.');
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan kehadiran.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTujuan = async () => {
    if (!tujuanDeskripsi.trim()) { toast.show('error', 'Deskripsi tujuan wajib diisi.'); return; }
    setSaving(true);
    try {
      if (editTujuanId) {
        await (api as any).updateEkskulTujuan?.(Number(ekskulId), editTujuanId, { deskripsi: tujuanDeskripsi });
        toast.show('success', 'Tujuan diperbarui.');
      } else {
        await (api as any).createEkskulTujuan?.(Number(ekskulId), { semester, deskripsi: tujuanDeskripsi });
        toast.show('success', 'Tujuan ditambahkan.');
      }
      setTujuanSheet(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan tujuan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTujuan = async (id: number) => {
    if (!window.confirm('Hapus tujuan ini?')) return;
    try {
      await (api as any).deleteEkskulTujuan?.(Number(ekskulId), id);
      toast.show('success', 'Tujuan dihapus.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus tujuan.');
    }
  };

  const searchSiswa = async () => {
    if (!cariSiswa.trim()) return;
    setSearchingS(true);
    try {
      const res = await api.adminGetSiswa({ q: cariSiswa, limit: 10 });
      setSiswaResults(res?.data ?? []);
    } catch {
      toast.show('error', 'Gagal mencari siswa.');
    } finally {
      setSearchingS(false);
    }
  };

  const handleAddPeserta = async (siswaId: number) => {
    try {
      await (api as any).addEkskulPeserta?.(Number(ekskulId), { siswaId });
      toast.show('success', 'Siswa ditambahkan sebagai peserta.');
      setSiswaSheet(false);
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menambahkan peserta.');
    }
  };

  const handleRemovePeserta = async (pesertaId: number) => {
    if (!window.confirm('Hapus peserta ini dari ekskul?')) return;
    try {
      await (api as any).removeEkskulPeserta?.(Number(ekskulId), pesertaId);
      toast.show('success', 'Peserta dihapus.');
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menghapus peserta.');
    }
  };

  function pctKehadiran(p: Peserta) {
    const k = kehadiran[p.id];
    if (!k || !k.totalPertemuan || Number(k.totalPertemuan) === 0) return null;
    return Math.round((Number(k.jumlahHadir) / Number(k.totalPertemuan)) * 100);
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="secondary" onClick={() => navigate('/admin/ekskul')} id="btn-back-ekskul">← Ekskul</Button>
        <div>
          <h2 className="text-xl font-bold text-aam-text">{ekskul?.nama ?? 'Ekskul'}</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-aam-muted">Semester:</label>
          <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
            value={semester} onChange={e => setSemester(Number(e.target.value))} id="select-semester-ekskul">
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : (
        <div className="space-y-6">
          {/* Tujuan Ekskul */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-aam-text">Tujuan Ekskul — Semester {semester}</h3>
              <Button onClick={() => { setEditTujuanId(null); setTujuanDeskripsi(''); setTujuanSheet(true); }}
                id="btn-tambah-tujuan">+ Tujuan</Button>
            </div>
            {tujuan.length === 0 ? (
              <p className="text-sm text-aam-muted italic">Belum ada tujuan untuk semester ini.</p>
            ) : (
              <ul className="space-y-2">
                {tujuan.map(t => (
                  <li key={t.id} className="flex items-start justify-between gap-3" id={`tujuan-item-${t.id}`}>
                    <span className="text-sm">{t.deskripsi}</span>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="secondary" onClick={() => { setEditTujuanId(t.id); setTujuanDeskripsi(t.deskripsi); setTujuanSheet(true); }}
                        id={`btn-edit-tujuan-${t.id}`}>Edit</Button>
                      <Button variant="secondary" onClick={() => handleDeleteTujuan(t.id)}
                        id={`btn-delete-tujuan-${t.id}`}>Hapus</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Peserta */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-aam-text">Peserta ({peserta.length})</h3>
              <Button onClick={() => { setCariSiswa(''); setSiswaResults([]); setSiswaSheet(true); }}
                id="btn-tambah-peserta">+ Peserta</Button>
            </div>
            {peserta.length === 0 ? (
              <EmptyState icon="people" message="Belum ada peserta." />
            ) : (
              <div className="flex gap-2 flex-wrap">
                {peserta.map(p => (
                  <div key={p.id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-sm"
                    id={`peserta-badge-${p.id}`}>
                    <span>{p.nama}</span>
                    <button onClick={() => handleRemovePeserta(p.id)}
                      className="text-red-500 ml-1 hover:text-red-700" id={`btn-remove-peserta-${p.id}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Grid Nilai */}
          {peserta.length > 0 && tujuan.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-aam-text">Nilai per Tujuan</h3>
                <Button onClick={handleSimpanNilai} disabled={saving} id="btn-simpan-nilai-ekskul">
                  {saving ? 'Menyimpan...' : '💾 Simpan Nilai'}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b sticky left-0 bg-gray-50 min-w-[150px]">Peserta</th>
                      {tujuan.map(t => (
                        <th key={t.id} className="px-2 py-2.5 text-center text-aam-muted font-semibold border-b min-w-[130px]">
                          {t.deskripsi.slice(0, 30)}{t.deskripsi.length > 30 ? '...' : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aam-border">
                    {peserta.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium sticky left-0 bg-white">{p.nama}</td>
                        {tujuan.map(t => {
                          const key = `${p.id}-${t.id}`;
                          const cur = nilai[key] ?? null;
                          return (
                            <td key={t.id} className="px-2 py-2 text-center">
                              <div className="flex gap-0.5 justify-center">
                                {NILAI_OPTIONS.map(opt => (
                                  <button key={opt}
                                    onClick={() => toggleNilai(p.id, t.id, opt)}
                                    id={`btn-nilai-ekskul-${p.id}-${t.id}-${opt.replace(/\s/g, '')}`}
                                    className={`text-xs px-1.5 py-0.5 rounded border transition-all ${
                                      cur === opt
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

          {/* Kehadiran */}
          {peserta.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-aam-text">Kehadiran</h3>
                <Button onClick={handleSimpanKehadiran} disabled={saving} id="btn-simpan-kehadiran-ekskul">
                  {saving ? 'Menyimpan...' : '💾 Simpan Kehadiran'}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Peserta', 'Hadir', 'Total Pertemuan', 'Persentase'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aam-border">
                    {peserta.map(p => {
                      const pct = pctKehadiran(p);
                      const isMerah = pct !== null && pct < 70;
                      return (
                        <tr key={p.id} className={isMerah ? 'bg-red-50' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-2 font-medium">{p.nama}</td>
                          <td className="px-3 py-2">
                            <input type="number" min={0}
                              className="w-16 rounded-md border border-aam-border px-2 py-1 text-sm"
                              value={kehadiran[p.id]?.jumlahHadir ?? ''}
                              onChange={e => setKehadiran(prev => ({ ...prev, [p.id]: { ...prev[p.id], jumlahHadir: e.target.value !== '' ? Number(e.target.value) : '' } }))}
                              id={`input-hadir-${p.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0}
                              className="w-20 rounded-md border border-aam-border px-2 py-1 text-sm"
                              value={kehadiran[p.id]?.totalPertemuan ?? ''}
                              onChange={e => setKehadiran(prev => ({ ...prev, [p.id]: { ...prev[p.id], totalPertemuan: e.target.value !== '' ? Number(e.target.value) : '' } }))}
                              id={`input-total-${p.id}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            {pct !== null ? (
                              <Badge variant={isMerah ? 'red' : 'green'}>{pct}%</Badge>
                            ) : <span className="text-aam-muted">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-aam-muted mt-2">⚠️ Persentase &lt;70% ditandai merah (§9).</p>
            </Card>
          )}
        </div>
      )}

      {/* Tujuan Sheet */}
      {tujuanSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setTujuanSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">{editTujuanId ? 'Edit Tujuan' : 'Tambah Tujuan'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Deskripsi Tujuan *</label>
                <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={3}
                  value={tujuanDeskripsi} onChange={e => setTujuanDeskripsi(e.target.value)}
                  placeholder="Contoh: Siswa mampu memimpin regu..." id="input-deskripsi-tujuan" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setTujuanSheet(false)}>Batal</Button>
                <Button onClick={handleSaveTujuan} disabled={saving} id="btn-simpan-tujuan">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Peserta Search Sheet */}
      {siswaSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSiswaSheet(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">Tambah Peserta</h3>
            <div className="flex gap-2 mb-3">
              <input className="flex-1 rounded-md border border-aam-border px-3 py-2 text-sm"
                value={cariSiswa} onChange={e => setCariSiswa(e.target.value)}
                placeholder="Cari nama siswa..." id="input-cari-siswa-ekskul"
                onKeyDown={e => e.key === 'Enter' && searchSiswa()} />
              <Button onClick={searchSiswa} disabled={searchingS} id="btn-cari-siswa-ekskul">
                {searchingS ? '...' : 'Cari'}
              </Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {siswaResults.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-md">
                  <span className="text-sm">{s.nama} {s.nis ? `(${s.nis})` : ''}</span>
                  <Button onClick={() => handleAddPeserta(s.id)} id={`btn-add-peserta-${s.id}`}>+ Tambah</Button>
                </div>
              ))}
              {siswaResults.length === 0 && cariSiswa && !searchingS && (
                <p className="text-sm text-aam-muted text-center py-2">Tidak ada hasil pencarian.</p>
              )}
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}
