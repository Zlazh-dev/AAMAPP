import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { AdaptiveSelect } from '../../components/AdaptiveSelect';
import { BackLink } from '../../components/BackLink';

// ── Types ──────────────────────────────────────────────────────────────────

type JenisIzin = 'IZIN' | 'SAKIT' | 'DINAS';
type StatusIzin = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';

interface IzinItem {
  id: number;
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

function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

function formatTanggal(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function hitungHari(mulai: string, selesai: string): number {
  const a = new Date(mulai + 'T00:00:00'), b = new Date(selesai + 'T00:00:00');
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

const JENIS_OPTIONS = [
  { value: 'IZIN', label: 'Izin' },
  { value: 'SAKIT', label: 'Sakit' },
  { value: 'DINAS', label: 'Dinas' },
];

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

// ── Form Component ─────────────────────────────────────────────────────────

interface FormState {
  jenis: string;
  mulaiTanggal: string;
  selesaiTanggal: string;
  keterangan: string;
  lampiranUrl: string;
}

function IzinForm({ onSuccess }: { onSuccess: () => void }) {
  const toast = useToast();
  const today = todayWIB();

  const [form, setForm] = useState<FormState>({
    jenis: 'IZIN',
    mulaiTanggal: today,
    selesaiTanggal: today,
    keterangan: '',
    lampiranUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showForm, setShowForm] = useState(false);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.jenis) e.jenis = 'Jenis izin wajib dipilih.';
    if (!form.mulaiTanggal) e.mulaiTanggal = 'Tanggal mulai wajib diisi.';
    if (!form.selesaiTanggal) e.selesaiTanggal = 'Tanggal selesai wajib diisi.';
    if (form.mulaiTanggal && form.selesaiTanggal && form.selesaiTanggal < form.mulaiTanggal) {
      e.selesaiTanggal = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
    }
    if (!form.keterangan.trim()) e.keterangan = 'Keterangan wajib diisi.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.guruAjukanIzin({
        jenis: form.jenis as JenisIzin,
        mulaiTanggal: form.mulaiTanggal,
        selesaiTanggal: form.selesaiTanggal,
        keterangan: form.keterangan.trim(),
        lampiranUrl: form.lampiranUrl.trim() || undefined,
      });
      toast.show('success', 'Izin berhasil diajukan.');
      setForm({ jenis: 'IZIN', mulaiTanggal: today, selesaiTanggal: today, keterangan: '', lampiranUrl: '' });
      setShowForm(false);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.show('error', err.body?.message || 'Gagal mengajukan izin.');
      } else {
        toast.show('error', 'Tidak dapat terhubung ke server.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 bg-white min-h-[44px]';
  const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

  if (!showForm) {
    return (
      <Button id="btn-ajukan-izin" onClick={() => setShowForm(true)}>
        + Ajukan Izin
      </Button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-aam-text">Form Pengajuan Izin</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Jenis */}
        <div>
          <label className={labelClass}>Jenis Izin <span className="text-red-500">*</span></label>
          <AdaptiveSelect
            label="Jenis Izin"
            value={form.jenis}
            onChange={v => setForm(f => ({ ...f, jenis: v }))}
            options={JENIS_OPTIONS}
          />
          {errors.jenis && <p className="text-red-500 text-xs mt-1">{errors.jenis}</p>}
        </div>

        {/* Rentang tanggal */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Dari <span className="text-red-500">*</span></label>
            <input
              type="date"
              className={inputClass}
              value={form.mulaiTanggal}
              onChange={e => setForm(f => ({ ...f, mulaiTanggal: e.target.value }))}
              id="izin-mulai"
            />
            {errors.mulaiTanggal && <p className="text-red-500 text-xs mt-1">{errors.mulaiTanggal}</p>}
          </div>
          <div>
            <label className={labelClass}>Sampai <span className="text-red-500">*</span></label>
            <input
              type="date"
              className={inputClass}
              value={form.selesaiTanggal}
              min={form.mulaiTanggal}
              onChange={e => setForm(f => ({ ...f, selesaiTanggal: e.target.value }))}
              id="izin-selesai"
            />
            {errors.selesaiTanggal && <p className="text-red-500 text-xs mt-1">{errors.selesaiTanggal}</p>}
          </div>
        </div>

        {form.mulaiTanggal && form.selesaiTanggal && form.selesaiTanggal >= form.mulaiTanggal && (
          <p className="text-xs text-aam-muted -mt-2">
            Durasi: {hitungHari(form.mulaiTanggal, form.selesaiTanggal)} hari
          </p>
        )}

        {/* Keterangan */}
        <div>
          <label className={labelClass}>Keterangan <span className="text-red-500">*</span></label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={form.keterangan}
            onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
            placeholder="Jelaskan alasan izin Anda…"
            id="izin-keterangan"
          />
          {errors.keterangan && <p className="text-red-500 text-xs mt-1">{errors.keterangan}</p>}
        </div>

        {/* Lampiran (opsional) */}
        <div>
          <label className={labelClass}>
            URL Lampiran <span className="text-aam-muted text-xs font-normal">(opsional)</span>
          </label>
          <input
            type="url"
            className={inputClass}
            value={form.lampiranUrl}
            onChange={e => setForm(f => ({ ...f, lampiranUrl: e.target.value }))}
            placeholder="https://…"
            id="izin-lampiran"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
            Batal
          </Button>
          <Button type="submit" disabled={saving} id="btn-submit-izin">
            {saving ? 'Menyimpan…' : 'Ajukan Izin'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

/**
 * /izin/guru — Guru: ajukan izin + daftar izin sendiri.
 */
export function IzinGuruPage() {
  const toast = useToast();
  const [list, setList] = useState<IzinItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.guruGetIzinSendiri();
      setList(res.data);
    } catch {
      toast.show('error', 'Gagal memuat daftar izin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  return (
    <PageContainer>
      <BackLink to="/guru/kbm" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Izin Saya</h2>
          <p className="text-sm text-aam-muted mt-0.5">Ajukan permohonan izin dan pantau statusnya.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Form ajukan */}
        <IzinForm onSuccess={loadList} />

        {/* Daftar izin */}
        <div>
          <h3 className="text-sm font-semibold text-aam-muted uppercase tracking-wide mb-3">
            Riwayat Pengajuan
          </h3>

          {loading ? (
            <TableSkeleton rows={3} />
          ) : list.length === 0 ? (
            <EmptyState
              icon="event_busy"
              message="Belum ada pengajuan izin"
              
            />
          ) : (
            <div className="space-y-3">
              {list.map(item => (
                <Card key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-aam-text">{JENIS_LABEL[item.jenis]}</span>
                        <Badge variant={STATUS_COLOR[item.status]}>
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </div>
                      <p className="text-sm text-aam-muted">
                        {formatTanggal(item.mulaiTanggal)}
                        {item.mulaiTanggal !== item.selesaiTanggal && (
                          <> — {formatTanggal(item.selesaiTanggal)}</>
                        )}
                        <span className="ml-2 text-xs">
                          ({hitungHari(item.mulaiTanggal, item.selesaiTanggal)} hari)
                        </span>
                      </p>
                      <p className="text-sm text-aam-text mt-1 line-clamp-2">{item.keterangan}</p>
                      {item.alasanKeputusan && (
                        <p className="text-xs text-aam-muted mt-1 italic">
                          Catatan admin: {item.alasanKeputusan}
                        </p>
                      )}
                      {item.lampiranUrl && (
                        <a
                          href={item.lampiranUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-aam-green underline mt-1 inline-block"
                        >
                          Lihat Lampiran
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-aam-muted whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short',
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
