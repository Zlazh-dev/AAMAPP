import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api, GuruRosterResponse, StatusPresensi } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { BackLink } from '../../components/BackLink';
import { useToast } from '../../components/Toast';

const STATUS_CYCLE: StatusPresensi[] = ['H', 'S', 'I', 'A', 'T'];

const STATUS_META: Record<StatusPresensi, { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'purple' }> = {
  H: { label: 'Hadir', variant: 'green' },
  S: { label: 'Sakit', variant: 'blue' },
  I: { label: 'Izin', variant: 'yellow' },
  A: { label: 'Alpha', variant: 'red' },
  T: { label: 'Terlambat', variant: 'purple' },
};

/**
 * Guru: RosterPage — grid presensi siswa untuk satu sesi KBM (F2).
 * Klik status siswa untuk cycle H→S→I→A→T→H. Simpan via POST roster.
 */
export function RosterPage() {
  const { jadwalId } = useParams<{ jadwalId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const tanggal = searchParams.get('tanggal') || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GuruRosterResponse | null>(null);
  const [statusMap, setStatusMap] = useState<Map<number, StatusPresensi>>(new Map());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (jadwalId && tanggal) {
      loadRoster();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jadwalId, tanggal]);

  const loadRoster = async () => {
    if (!jadwalId || !tanggal) return;
    setLoading(true);
    try {
      const result = await api.getGuruKbmRoster({ jadwalId: Number(jadwalId), tanggal });
      setData(result);
      const map = new Map<number, StatusPresensi>();
      result.siswa.forEach((s) => map.set(s.siswaId, s.status));
      setStatusMap(map);
      setDirty(false);
    } catch (err) {
      console.error('Failed to load roster data:', err);
      show('error', 'Gagal memuat data roster');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const cycleStatus = (siswaId: number) => {
    setStatusMap((prev) => {
      const next = new Map(prev);
      const cur = next.get(siswaId) ?? 'H';
      const idx = STATUS_CYCLE.indexOf(cur);
      next.set(siswaId, STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!jadwalId || !tanggal || !data) return;
    setSaving(true);
    try {
      const entri = Array.from(statusMap.entries()).map(([siswaId, status]) => ({ siswaId, status }));
      await api.postGuruKbmRoster({
        jadwalId: Number(jadwalId),
        body: { tanggal, entri },
      });
      show('success', 'Presensi berhasil disimpan');
      setData((prev) => (prev ? { ...prev, tersimpan: true } : null));
      setDirty(false);
    } catch (err) {
      console.error('Failed to save roster:', err);
      show('error', 'Gagal menyimpan presensi. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !jadwalId || !tanggal) {
    return (
      <PageContainer size="lg" bottomBar>
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Roster Presensi
        </h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer size="lg">
        <BackLink to="/guru/kbm" label="Kembali ke KBM Hari Ini" className="mb-4 hidden md:inline-flex" />
        <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text mb-4">
          Roster Presensi
        </h2>
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '3rem' }}>
            error
          </span>
          <p className="mt-3 text-sm text-aam-text-muted">
            Tidak ada data roster untuk jadwal dan tanggal ini.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/guru/kbm" label="Kembali ke KBM Hari Ini" className="mb-4 hidden md:inline-flex" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
            Roster Presensi
          </h2>
          <p className="text-xs text-aam-text-muted mt-0.5">
            {data.mapel} • {data.kelas} • {new Date(data.tanggal).toLocaleDateString('id-ID')}
          </p>
        </div>
        {data.tersimpan ? (
          <Badge variant="green">Tersimpan</Badge>
        ) : (
          <Badge variant="yellow">Belum disimpan</Badge>
        )}
      </div>

      <p className="text-xs text-aam-text-muted mb-3">
        Klik status siswa untuk mengubah (Hadir → Sakit → Izin → Alpha → Terlambat).
      </p>

      <Card icon="groups" className="p-0 overflow-hidden mb-4">
        <div className="divide-y divide-aam-border/50">
          {data.siswa.map((s, index) => {
            const status = statusMap.get(s.siswaId) ?? s.status;
            const meta = STATUS_META[status];
            return (
              <button
                key={s.siswaId}
                type="button"
                onClick={() => cycleStatus(s.siswaId)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[56px] text-left hover:bg-gray-50 transition-colors"
              >
                <span className="min-w-0 flex items-center gap-3">
                  <span className="text-xs text-aam-text-muted w-6 shrink-0">{index + 1}.</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-aam-text truncate">{s.nama}</span>
                    <span className="block text-xs text-aam-text-muted">NIS: {s.nis}</span>
                  </span>
                </span>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Ringkasan status */}
      <Card icon="summarize" className="p-4 mb-4">
        <p className="text-sm font-medium text-aam-text mb-2">Ringkasan</p>
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {STATUS_CYCLE.map((status) => {
            const count = Array.from(statusMap.values()).filter((s) => s === status).length;
            return (
              <div key={status}>
                <p className="text-lg font-semibold text-aam-text">{count}</p>
                <p className="text-aam-text-muted">{STATUS_META[status].label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Desktop: tombol inline. Mobile: sticky bottom bar (§BACKLINK-ADAPTIF-MOBILE pola bottomBar) */}
      <div className="hidden md:flex justify-end gap-3">
        <Button variant="secondary" size="md" onClick={() => navigate('/guru/kbm')} disabled={saving}>
          Batal
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} loading={saving} icon="save">
          Simpan Presensi
        </Button>
      </div>
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30 flex gap-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="secondary" size="lg" onClick={() => navigate('/guru/kbm')} disabled={saving} className="flex-1">
          Batal
        </Button>
        <Button variant="primary" size="lg" onClick={handleSave} loading={saving} icon="save" className="flex-1">
          Simpan
        </Button>
      </div>
    </PageContainer>
  );
}