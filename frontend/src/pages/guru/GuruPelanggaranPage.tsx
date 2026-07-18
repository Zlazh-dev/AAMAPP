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

const STATUS_VARIANT: Record<StatusPelanggaran, 'gray' | 'yellow' | 'red' | 'blue'> = {
  MENUNGGU: 'yellow', DISETUJUI: 'gray', DITOLAK: 'red',
};

function todayWIB(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

/**
 * /guru/pelanggaran — Guru: lapor pelanggaran (masuk antrean MENUNGGU) +
 * daftar laporan sendiri dengan status.
 */
export function GuruPelanggaranPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PelanggaranEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [katalog, setKatalog] = useState<KatalogEntry[]>([]);
  const [siswaOptions, setSiswaOptions] = useState<{ value: string | number; label: string }[]>([]);
  const [katalogOptions, setKatalogOptions] = useState<{ value: string | number; label: string }[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [siswaId, setSiswaId] = useState<string | number | null>(null);
  const [katalogId, setKatalogId] = useState<string | number | null>(null);
  const [tanggal, setTanggal] = useState(todayWIB());
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPelanggaran({ limit: 50 });
      setRows(res.data);
    } catch {
      toast.show('error', 'Gagal memuat laporan pelanggaran.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Load siswa & katalog for form
    api.adminGetSiswa({ limit: 200 }).then((r: any) =>
      setSiswaOptions((r.data ?? []).map((s: any) => ({ value: s.id, label: `${s.nama} (${s.nis ?? '-'})` })))
    ).catch(() => {});
    api.getKatalog({ limit: 200 }).then((r: any) => {
      const active = r.data.filter((k: KatalogEntry) => k.aktif);
      setKatalog(active);
      setKatalogOptions(active.map((k: KatalogEntry) => ({
        value: k.id,
        label: `[${k.kategori}] ${k.bentuk} (${k.poin} poin)`,
      })));
    }).catch(() => {});
  }, [load]);

  const selectedKatalog = katalog.find(k => k.id === Number(katalogId));

  const handleLapor = async () => {
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
      toast.show('success', 'Laporan dikirim — menunggu verifikasi kesiswaan.');
      setFormOpen(false);
      setSiswaId(null); setKatalogId(null); setCatatan(''); setTanggal(todayWIB());
      load();
    } catch (e: any) {
      toast.show('error', e.message ?? 'Gagal mengirim laporan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Laporan Pelanggaran</h2>
          <p className="text-sm text-aam-muted mt-0.5">Laporkan pelanggaran siswa — masuk antrean verifikasi.</p>
        </div>
        <Button onClick={() => setFormOpen(true)} id="btn-lapor-pelanggaran">+ Lapor Pelanggaran</Button>
      </div>

      <Card>
        {loading ? <TableSkeleton rows={5} /> : rows.length === 0 ? (
          <EmptyState icon="report" message="Belum ada laporan yang pernah Anda buat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Siswa','Bentuk','Poin','Tanggal','Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-aam-muted font-semibold border-b border-aam-border">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-aam-border">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{row.siswaNama}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{row.katalogBentuk ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{row.poin}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.tanggal}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Inline sheet form lapor */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setFormOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 max-w-lg mx-auto shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-aam-text text-lg mb-2">Lapor Pelanggaran</h3>
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-4">
              Laporan akan masuk antrean verifikasi — belum memotong saldo poin.
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Siswa *</label>
                <SearchSelect options={siswaOptions} value={siswaId} onChange={(v: string | number | null) => setSiswaId(v)}
                  placeholder="Cari dan pilih siswa..." searchPlaceholder="Ketik nama/NIS..." clearable />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Butir Pelanggaran *</label>
                <SearchSelect options={katalogOptions} value={katalogId} onChange={(v: string | number | null) => setKatalogId(v)}
                  placeholder="Pilih butir tata tertib..." searchPlaceholder="Cari butir..." clearable />
              </div>
              {selectedKatalog && (
                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm" id="guru-preview-poin">
                  <span className="font-medium">Kategori:</span> {selectedKatalog.kategori} —{' '}
                  <span className="font-medium">Poin:</span> {selectedKatalog.poin}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Tanggal *</label>
                <input type="date" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
                  value={tanggal} onChange={e => setTanggal(e.target.value)} id="guru-input-tanggal" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aam-muted mb-1">Catatan (opsional)</label>
                <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={2}
                  value={catatan} onChange={e => setCatatan(e.target.value)} id="guru-input-catatan"
                  placeholder="Keterangan tambahan..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" onClick={() => setFormOpen(false)}>Batal</Button>
                <Button onClick={handleLapor} disabled={saving} id="btn-kirim-laporan">
                  {saving ? 'Mengirim...' : 'Kirim Laporan'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  );
}


