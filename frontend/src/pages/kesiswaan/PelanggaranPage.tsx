import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, PelanggaranEntry, KatalogEntry, StatusPelanggaran , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { SearchSelect } from '../../components/SearchSelect';
import { Table, ColumnDef } from '../../components/Table';
import { FormDrawer } from '../../components/FormDrawer';
import { SubPageLayout } from '../../components/SubPageLinks';
import { BackLink } from '../../components/BackLink';
import { Pagination } from '../../components/Pagination';
import { PageMenu } from '../../components/PageMenu';

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

/** Sub dari Tata Tertib (IA-HIERARCHY-V2). */
const PELANGGARAN_SUB_LINKS = [
  { key: 'verifikasi', label: 'Verifikasi', path: '/kesiswaan/verifikasi', icon: 'task_alt', description: 'Antrean persetujuan pelanggaran' },
  { key: 'tindak-lanjut', label: 'Tindak Lanjut', path: '/kesiswaan/tindak-lanjut', icon: 'assignment_late', description: 'Tindak lanjut pelanggaran berat' },
  { key: 'reward', label: 'Reward', path: '/kesiswaan/reward', icon: 'emoji_events', description: 'Daftar siswa berprestasi' },
];

export function PelanggaranPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState<PelanggaranEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusPelanggaran | ''>('');

  const [siswaOptions, setSiswaOptions] = useState<{ value: string | number; label: string }[]>([]);
  const [katalog, setKatalog] = useState<KatalogEntry[]>([]);
  const [katalogOptions, setKatalogOptions] = useState<{ value: string | number; label: string }[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [siswaId, setSiswaId] = useState<string | number | null>(null);
  const [katalogId, setKatalogId] = useState<string | number | null>(null);
  const [tanggal, setTanggal] = useState(todayWIB());
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const [saldoMap, setSaldoMap] = useState<Record<number, number>>({});
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 25 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPelanggaran({ status: statusFilter || undefined, page, limit: 25 });
      setRows(res.data);
      setMeta({ total: res.total, page: res.page, limit: res.limit });
      const siswaIds: number[] = [...new Set(res.data.map((r: PelanggaranEntry) => r.siswaId))];
      const saldos: Record<number, number> = {};
      await Promise.all(siswaIds.map(async (sid: number) => {
        try { saldos[sid] = (await api.getSaldo(sid)).saldo; }
        catch { saldos[sid] = 500; }
      }));
      setSaldoMap(saldos);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data pelanggaran.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  // Reset ke halaman 1 saat filter berubah.
  useEffect(() => { setPage(1); }, [statusFilter]);

  // Pencarian siswa sisi-server (bukan ambil 200 baris).
  const searchSiswa = useCallback(async (q: string) => {
    const r: any = await api.adminGetSiswa({ q: q || undefined, limit: 20 });
    const opts = (r.data ?? []).map((s: any) => ({ value: s.id as number, label: `${s.nama} (${s.nis ?? '-'})` }));
    // Cache opsi terpilih supaya label tampil saat dropdown tertutup.
    setSiswaOptions((prev) => {
      const seen = new Set(prev.map((o: any) => o.value));
      return [...prev, ...opts.filter((o: any) => !seen.has(o.value))];
    });
    return opts;
  }, []);

  // Pencarian katalog sisi-server (hanya katalog aktif).
  const searchKatalog = useCallback(async (q: string) => {
    const r: any = await api.getKatalog({ q: q || undefined, limit: 20 });
    const active: KatalogEntry[] = (r.data ?? []).filter((k: KatalogEntry) => k.aktif);
    const opts = active.map((k: KatalogEntry) => ({
      value: k.id as number,
      label: `[${k.kategori}] ${k.bentuk} (${k.poin} poin)`,
    }));
    setKatalog((prev) => {
      const seen = new Set(prev.map((k) => k.id));
      return [...prev, ...active.filter((k) => !seen.has(k.id))];
    });
    setKatalogOptions((prev) => {
      const seen = new Set(prev.map((o) => o.value));
      return [...prev, ...opts.filter((o) => !seen.has(o.value))];
    });
    return opts;
  }, []);

  // Bila sudah ada siswaId/katalogId (edit mode), cache opsinya sekali.
  useEffect(() => {
    if (siswaId != null && siswaOptions.length === 0) {
      api.adminGetSiswaById(Number(siswaId)).then((s) => {
        setSiswaOptions([{ value: s.id, label: `${s.nama} (${s.nis ?? '-'})` }]);
      }).catch(() => {});
    }
  }, [siswaId]);

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

  const columns: ColumnDef<PelanggaranEntry>[] = [
    { header: 'Siswa', cell: (r) => <span className="font-medium">{r.siswaNama}</span> },
    {
      header: 'Saldo',
      align: 'center',
      cell: (r) => saldoMap[r.siswaId] !== undefined
        ? <Badge variant={saldoVariant(saldoMap[r.siswaId])}>{saldoMap[r.siswaId]}</Badge>
        : <span className="text-aam-text-muted">—</span>,
    },
    { header: 'Bentuk', cellClass: 'max-w-[180px] truncate', cell: (r) => r.katalogBentuk ?? '—' },
    { header: 'Kat.', width: 'w-12', cell: (r) => <Badge variant={KATEGORI_VARIANT[r.kategori]}>{r.kategori}</Badge> },
    { header: 'Poin', width: 'w-12', align: 'right', cell: (r) => <span className="font-medium">{r.poin}</span> },
    { header: 'Tanggal', width: 'w-28', cell: (r) => <span className="whitespace-nowrap">{r.tanggal}</span> },
    { header: 'Status', width: 'w-24', cell: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge> },
    { header: 'Sumber', width: 'w-24', cellClass: 'text-xs text-aam-text-muted', cell: (r) => r.sumber },
  ];

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Pelanggaran Siswa</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">Catat dan pantau pelanggaran + saldo demerit (500 poin/semester).</p>
        </div>
        <PageMenu
          menuTitle="Menu Pelanggaran"
          actions={[{ key: 'catat', label: 'Catat Pelanggaran', icon: 'report', variant: 'primary', onClick: () => setFormOpen(true) }]}
        />
      </div>

      <BackLink to="/kesiswaan/tata-tertib" />
      <SubPageLayout links={PELANGGARAN_SUB_LINKS}>

      {/* Filter */}
      <Card>
        <select className="rounded-md border border-aam-border px-3 py-2 text-sm bg-white"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} id="select-status-filter">
          <option value="">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DISETUJUI">Disetujui</option>
          <option value="DITOLAK">Ditolak</option>
        </select>
      </Card>

      <Card icon="warning">
        {loading ? <TableSkeleton rows={5} /> : (
          <Table
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/kesiswaan/pelanggaran/${r.id}`)}
            emptyMessage="Belum ada data pelanggaran."
          />
        )}
        <Pagination page={meta.page} limit={meta.limit} total={meta.total} onPageChange={setPage} loading={loading} />
      </Card>

      {/* FormDrawer — desktop modal / mobile bottom sheet */}
      <FormDrawer
        open={formOpen}
        title="Catat Pelanggaran"
        onClose={() => setFormOpen(false)}
        onSubmit={handleSimpan}
        submitting={saving}
        submitLabel="Catat"
        submitId="btn-simpan-pelanggaran"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Siswa *</label>
            <SearchSelect
              options={siswaOptions} value={siswaId}
              onChange={(v: string | number | null) => setSiswaId(v)}
              placeholder="Cari dan pilih siswa..."
              searchPlaceholder="Ketik nama/NIS siswa..."
              clearable
              onSearch={searchSiswa}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Butir Pelanggaran *</label>
            <SearchSelect
              options={katalogOptions} value={katalogId}
              onChange={(v: string | number | null) => setKatalogId(v)}
              placeholder="Pilih butir tata tertib..."
              searchPlaceholder="Cari butir..."
              clearable
              onSearch={searchKatalog}
            />
          </div>
          {selectedKatalog && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm" id="preview-poin">
              <span className="font-medium">Kategori:</span> {selectedKatalog.kategori} —{' '}
              <span className="font-medium">Poin otomatis:</span> {selectedKatalog.poin}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Tanggal *</label>
            <input type="date" className="w-full rounded-md border border-aam-border px-3 py-2 text-sm"
              value={tanggal} onChange={e => setTanggal(e.target.value)} id="input-tanggal-pelanggaran" />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Catatan (opsional)</label>
            <textarea className="w-full rounded-md border border-aam-border px-3 py-2 text-sm" rows={2}
              value={catatan} onChange={e => setCatatan(e.target.value)} id="input-catatan-pelanggaran"
              placeholder="Keterangan tambahan..." />
          </div>
        </div>
      </FormDrawer>
      </SubPageLayout>
    </PageContainer>
  );
}
