import React, { useState, useCallback, useEffect } from 'react';
import { api, PelanggaranEntry, KatalogEntry, StatusPelanggaran } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { SearchSelect } from '../../components/SearchSelect';

const KATEGORI_VARIANT: Record<string, 'gray' | 'yellow' | 'red' | 'blue'> = {
  R: 'blue', S: 'yellow', B: 'red', SB: 'red', KHUSUS: 'gray',
};
const STATUS_VARIANT: Record<StatusPelanggaran, 'gray' | 'yellow' | 'red' | 'blue'> = {
  MENUNGGU: 'yellow', DISETUJUI: 'gray', DITOLAK: 'red',
};

function saldoVariant(saldo: number): 'gray' | 'yellow' | 'red' | 'blue' {
  if (saldo <= 100) return 'red';
  if (saldo <= 250) return 'yellow';
  return 'blue';
}

function todayWIB(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

export function PelanggaranPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PelanggaranEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusPelanggaran | ''>('');

  // Siswa options for form
  const [siswaOptions, setSiswaOptions] = useState<{ value: string | number; label: string }[]>([]);
  const [katalog, setKatalog] = useState<KatalogEntry[]>([]);
  const [katalogOptions, setKatalogOptions] = useState<{ value: string | number; label: string }[]>([]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [siswaId, setSiswaId] = useState<string | number | null>(null);
  const [katalogId, setKatalogId] = useState<string | number | null>(null);
  const [tanggal, setTanggal] = useState(todayWIB());
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  // Saldo per siswa
  const [saldoMap, setSaldoMap] = useState<Record<number, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPelanggaran({ status: statusFilter || undefined, limit: 50 });
      setRows(res.data);
      // Batch saldo
      const siswaIds: number[] = [...new Set(res.data.map((r: PelanggaranEntry) => r.siswaId))];
      const saldos: Record<number, number> = {};
      await Promise.all(siswaIds.map(async (sid: number) => {
        try { saldos[sid] = (await api.getSaldo(sid)).saldo; }
        catch { saldos[sid] = 500; }
      }));
      setSaldoMap(saldos);
    } catch {
      toast.show('error', 'Gagal memuat data pelanggaran.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Load siswa + katalog for form
  useEffect(() => {
    api.adminGetSiswa({ limit: 200 }).then((r: any) =>
      setSiswaOptions((r.data ?? []).map((s: any) => ({ value: s.id as number, label: `${s.nama} (${s.nis ?? '-'})` })))
    ).catch(() => {});
    api.getKatalog({ limit: 200 }).then((r: any) => {
      const active: KatalogEntry[] = r.data.filter((k: KatalogEntry) => k.aktif);
      setKatalog(active);
      setKatalogOptions(active.map((k: KatalogEntry) => ({
        value: k.id as number,
        label: `[${k.kategori}] ${k.bentuk} (${k.poin} poin)`,
      })));
    }).catch(() => {});
  }, []);

  const selectedKatalog = katalog.find(k => k.id === Number(katalogId));

  const handleSimpan = async () => {
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
      toast.show('success', 'Pelanggaran berhasil dicatat.');
      setFormOpen(false);
      setSiswaId(null); setKatalogId(null); setCatatan(''); setTanggal(todayWIB());
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Pelanggaran Siswa</h2>
          <p className="text-sm text-aam-muted mt-0.5">Catat dan pantau pelanggaran + saldo demerit (500 poin/semester).</p>
        </div>
        <Button onClick={() => setFormOpen(true)} id="btn-catat-pelanggaran">+ Catat Pelanggaran</Button>
      </div>

      <Card className="mb-4">
        <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} id="select-status-filter">
          <option value="">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DISETUJUI">Disetujui</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
      </Card>

      <Card>
        {loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
          <EmptyState icon="gavel" message="Belum ada data pelanggaran." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Siswa','Saldo','Bentuk','Kat.','Poin','Tanggal','Status','Sumber'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.siswaNama}</td>
                    <td className="px-3 py-2">
                      {saldoMap[row.siswaId] !== undefined
                        ? <Badge variant={saldoVariant(saldoMap[row.siswaId])}>{saldoMap[row.siswaId]}</Badge>
                        : '—'}
                    </td>
                    <td className="px-3 py-2 max-w-[180px] truncate">{row.katalogBentuk ?? '—'}</td>
                    <td className="px-3 py-2"><Badge variant={KATEGORI_VARIANT[row.kategori]}>{row.kategori}</Badge></td>
                    <td className="px-3 py-2 text-right font-medium">{row.poin}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.tanggal}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge></td>
                    <td className="px-3 py-2 text-aam-muted text-xs">{row.sumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inline sheet form catat */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFormOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-4">Catat Pelanggaran</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Siswa *</label>
                <SearchSelect
                  options={siswaOptions}
                  value={siswaId}
                  onChange={(v: string | number | null) => setSiswaId(v)}
                  placeholder="Cari dan pilih siswa..."
                  searchPlaceholder="Ketik nama/NIS siswa..."
                  clearable
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Butir Pelanggaran *</label>
                <SearchSelect
                  options={katalogOptions}
                  value={katalogId}
                  onChange={(v: string | number | null) => setKatalogId(v)}
                  placeholder="Pilih butir tata tertib..."
                  searchPlaceholder="Cari butir..."
                  clearable
                />
              </div>
              {selectedKatalog && (
                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm" id="preview-poin">
                  <span className="font-medium">Kategori:</span> {selectedKatalog.kategori} —{' '}
                  <span className="font-medium">Poin otomatis:</span> {selectedKatalog.poin}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Tanggal *</label>
                <input type="date" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={tanggal} onChange={e => setTanggal(e.target.value)} id="input-tanggal-pelanggaran" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Catatan (opsional)</label>
                <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={2}
                  value={catatan} onChange={e => setCatatan(e.target.value)} id="input-catatan-pelanggaran"
                  placeholder="Keterangan tambahan..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button>
                <Button onClick={handleSimpan} disabled={saving} id="btn-simpan-pelanggaran">
                  {saving ? 'Menyimpan...' : 'Catat'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}

