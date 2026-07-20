import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../../../api/client';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { TableSkeleton } from '../../../components/Skeleton';
import { useToast } from '../../../components/Toast';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { BackLink } from '../../../components/BackLink';

// ── Types ──────────────────────────────────────────────────────────────────

type JenisIzin = 'IZIN' | 'SAKIT' | 'DINAS';
type StatusIzin = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

interface IzinAdminItem {
  id: number;
  guruId: number;
  guruNama: string;
  jenis: JenisIzin;
  mulaiTanggal: string;
  selesaiTanggal: string;
  keterangan: string;
  lampiranUrl: string | null;
  status: StatusIzin;
  alasanKeputusan: string | null;
  disetujuiPada: string | null;
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTanggal(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function hitungHari(mulai: string, selesai: string): number {
  const a = new Date(mulai + 'T00:00:00'), b = new Date(selesai + 'T00:00:00');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

const STATUS_COLOR: Record<StatusIzin, 'yellow' | 'green' | 'red'> = {
  MENUNGGU: 'yellow',
  DISETUJUI: 'green',
  DITOLAK: 'red',
};

const STATUS_LABEL: Record<StatusIzin, string> = {
  MENUNGGU: 'Menunggu',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

const JENIS_LABEL: Record<JenisIzin, string> = {
  IZIN: 'Izin',
  SAKIT: 'Sakit',
  DINAS: 'Dinas',
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'MENUNGGU', label: 'Menunggu' },
  { value: 'DISETUJUI', label: 'Disetujui' },
  { value: 'DITOLAK', label: 'Ditolak' },
];

// ── Action Sheet ───────────────────────────────────────────────────────────

interface ActionSheetProps {
  item: IzinAdminItem;
  onClose: () => void;
  onDone: () => void;
}

function IzinActionSheet({ item, onClose, onDone }: ActionSheetProps) {
  const toast = useToast();
  const [alasan, setAlasan] = useState('');
  const [saving, setSaving] = useState<'setujui' | 'tolak' | null>(null);
  const [alasanError, setAlasanError] = useState('');

  const handleSetujui = async () => {
    setSaving('setujui');
    try {
      await api.adminSetujuiIzin(item.id, alasan.trim() || undefined);
      toast.show('success', 'Izin disetujui.');
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.show('error', err.body?.message || 'Gagal menyetujui izin.');
      } else {
        toast.show('error', 'Tidak dapat terhubung ke server.');
      }
    } finally {
      setSaving(null);
    }
  };

  const handleTolak = async () => {
    if (!alasan.trim()) {
      setAlasanError('Alasan wajib diisi saat menolak.');
      return;
    }
    setSaving('tolak');
    try {
      await api.adminTolakIzin(item.id, alasan.trim());
      toast.show('success', 'Izin ditolak.');
      onDone();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.show('error', err.body?.message || 'Gagal menolak izin.');
      } else {
        toast.show('error', 'Tidak dapat terhubung ke server.');
      }
    } finally {
      setSaving(null);
    }
  };

  const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 bg-white min-h-[44px]';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 flex items-end md:items-center justify-center"
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className="w-full max-w-lg bg-white rounded-t-2xl md:rounded-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >

        <h3 className="text-sm font-semibold text-aam-text mb-1">{item.guruNama}</h3>
        <div className="flex gap-2 items-center mb-3">
          <Badge variant={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          <span className="text-sm text-aam-text-muted">{JENIS_LABEL[item.jenis]}</span>
          <span className="text-sm text-aam-text-muted">·</span>
          <span className="text-sm text-aam-text-muted">
            {formatTanggal(item.mulaiTanggal)}
            {item.mulaiTanggal !== item.selesaiTanggal && ` — ${formatTanggal(item.selesaiTanggal)}`}
            <span className="ml-1 text-xs">({hitungHari(item.mulaiTanggal, item.selesaiTanggal)} hari)</span>
          </span>
        </div>

        <p className="text-sm text-aam-text mb-3 border-l-4 border-aam-border pl-3">{item.keterangan}</p>

        {item.lampiranUrl && (
          <a
            href={item.lampiranUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-aam-green underline mb-3 inline-block"
          >
            Lihat Lampiran
          </a>
        )}

        {item.status === 'MENUNGGU' ? (
          <div className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-aam-text mb-1.5">
                Catatan / Alasan{' '}
                <span className="text-aam-text-muted text-xs font-normal">(wajib saat menolak)</span>
              </label>
              <textarea
                id="admin-izin-alasan"
                className={`${inputClass} min-h-[72px] resize-y`}
                value={alasan}
                onChange={e => { setAlasan(e.target.value); setAlasanError(''); }}
                placeholder="Masukkan catatan atau alasan keputusan…"
              />
              {alasanError && <p className="text-red-500 text-xs mt-1">{alasanError}</p>}
            </div>

            <div className="flex gap-3">
              <Button
                id="btn-tolak-izin"
                variant="secondary"
                className="flex-1 !border-red-300 !text-red-600"
                onClick={handleTolak}
                disabled={saving !== null}
              >
                {saving === 'tolak' ? 'Menolak…' : 'Tolak'}
              </Button>
              <Button
                id="btn-setujui-izin"
                className="flex-1"
                onClick={handleSetujui}
                disabled={saving !== null}
              >
                {saving === 'setujui' ? 'Menyetujui…' : 'Setujui'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {item.alasanKeputusan && (
              <p className="text-sm text-aam-text-muted italic mb-3">
                Alasan: {item.alasanKeputusan}
              </p>
            )}
            {item.disetujuiPada && (
              <p className="text-xs text-aam-text-muted">
                Diproses: {new Date(item.disetujuiPada).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            )}
            <Button variant="secondary" className="w-full mt-4" onClick={onClose}>
              Tutup
            </Button>
          </div>
        )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

/**
 * /tu/izin-guru — Admin/kepsek: daftar izin guru berpaginasi + filter +
 * setujui/tolak via adaptive sheet.
 */
export function AdminIzinGuruPage() {
  const toast = useToast();
  const [list, setList] = useState<IzinAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDari, setFilterDari] = useState('');
  const [filterSampai, setFilterSampai] = useState('');

  // Selected item for sheet
  const [selected, setSelected] = useState<IzinAdminItem | null>(null);

  const loadList = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await api.adminGetIzinGuru({
        status: filterStatus || undefined,
        dari: filterDari || undefined,
        sampai: filterSampai || undefined,
        page: pg,
        limit: PAGE_SIZE,
      });
      setList(res.data);
      setTotal(res.total);
      setPage(pg);
    } catch (err) {
      toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat daftar izin.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDari, filterSampai]);

  useEffect(() => { loadList(1); }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const inputClass = 'rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 bg-white min-h-[40px]';

  return (
    <PageContainer>
      <BackLink to="/tu/presensi-guru" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Izin Guru</h2>
          <p className="text-sm text-aam-text-muted mt-0.5">
            Tinjau dan setujui/tolak permohonan izin guru.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Status</label>
            <AdaptiveSelect
              label="Filter Status"
              value={filterStatus}
              onChange={v => setFilterStatus(v)}
              options={STATUS_FILTER_OPTIONS}
              placeholder="Semua Status"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Dari</label>
            <input
              type="date"
              className={inputClass}
              value={filterDari}
              onChange={e => setFilterDari(e.target.value)}
              id="admin-izin-dari"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-aam-text-muted mb-1">Sampai</label>
            <input
              type="date"
              className={inputClass}
              value={filterSampai}
              onChange={e => setFilterSampai(e.target.value)}
              id="admin-izin-sampai"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => { setFilterStatus(''); setFilterDari(''); setFilterSampai(''); }}
            className="min-h-[40px]"
          >
            Reset
          </Button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="event_available"
          message="Tidak ada izin ditemukan"
          
        />
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {list.map(item => (
              <Card
                key={item.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-aam-text">{item.guruNama}</span>
                      <Badge variant={STATUS_COLOR[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                      <span className="text-xs text-aam-text-muted bg-aam-border/40 px-2 py-0.5 rounded-full">
                        {JENIS_LABEL[item.jenis]}
                      </span>
                    </div>
                    <p className="text-sm text-aam-text-muted">
                      {formatTanggal(item.mulaiTanggal)}
                      {item.mulaiTanggal !== item.selesaiTanggal && ` — ${formatTanggal(item.selesaiTanggal)}`}
                      <span className="ml-1.5 text-xs">
                        ({hitungHari(item.mulaiTanggal, item.selesaiTanggal)} hari)
                      </span>
                    </p>
                    <p className="text-sm text-aam-text mt-1 line-clamp-1">{item.keterangan}</p>
                  </div>
                  <span className="material-symbols-outlined text-aam-text-muted text-lg mt-0.5 shrink-0">
                    chevron_right
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => loadList(page - 1)}
                disabled={page <= 1}
                className="min-h-[36px] px-3"
              >
                ‹ Prev
              </Button>
              <span className="text-sm text-aam-text-muted flex items-center px-3">
                {page} / {totalPages} ({total} total)
              </span>
              <Button
                variant="secondary"
                onClick={() => loadList(page + 1)}
                disabled={page >= totalPages}
                className="min-h-[36px] px-3"
              >
                Next ›
              </Button>
            </div>
          )}
        </>
      )}

      {/* Action Sheet */}
      {selected && (
        <IzinActionSheet
          item={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); loadList(page); }}
        />
      )}
    </PageContainer>
  );
}
