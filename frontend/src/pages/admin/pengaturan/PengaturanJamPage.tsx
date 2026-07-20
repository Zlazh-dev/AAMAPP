import React, { useState, useEffect } from 'react';
import { api, ApiError, type JamPresensi } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { UnsavedGuard } from '../../../components/UnsavedGuard';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const EMPTY: JamPresensi = { jamMasuk: '06:30', jamPulang: '15:00', toleransiMenit: 15, cutoff: '15:00' };

/**
 * /tu/rekap-guru/jam — jam presensi global (T14, §15.3).
 * Input waktu = native time input (pengecualian §15.0).
 * Pratinjau kalimat "Guru terlambat bila check-in setelah HH:MM WIB".
 */
export function PengaturanJamPage() {
  const toast = useToast();
  const [data, setData] = useState<JamPresensi>(EMPTY);
  const [original, setOriginal] = useState<JamPresensi>(EMPTY);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await api.getPengaturanByKey('jam_presensi');
        if (cancelled) return;
        const val = { ...EMPTY, ...row.value };
        setData(val);
        setOriginal(val);
        setUpdatedByName(row.updatedByName);
        setUpdatedAt(row.updatedAt);
      } catch (err) {
        if (!cancelled) toast.show('error', 'Gagal memuat pengaturan jam');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = JSON.stringify(data) !== JSON.stringify(original);

  const update = (field: keyof JamPresensi, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Compute pratinjau kalimat
  const computeLateTime = (): string => {
    const [h, m] = data.jamMasuk.split(':').map(Number);
    const total = h * 60 + m + (data.toleransiMenit || 0);
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await api.adminUpdatePengaturan('jam_presensi', data);
      setData(row.value);
      setOriginal(row.value);
      setUpdatedByName(row.updatedByName);
      setUpdatedAt(row.updatedAt);
      toast.show('success', 'Pengaturan jam berhasil disimpan');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan';
      toast.show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="xl">
        <BackLink to="/tu/pengaturan" />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="md" bottomBar>
        <BackLink to="/tu/pengaturan" />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">Jam Presensi</h2>
        <p className="text-xs text-aam-text-muted mb-6">Jam masuk, pulang, toleransi keterlambatan, dan cutoff</p>

        <Card icon="schedule">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="jam-masuk">Jam Masuk</label>
                <input id="jam-masuk" type="time" value={data.jamMasuk} onChange={(e) => update('jamMasuk', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="jam-pulang">Jam Pulang</label>
                <input id="jam-pulang" type="time" value={data.jamPulang} onChange={(e) => update('jamPulang', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="jam-toleransi">Toleransi Keterlambatan (menit)</label>
                <input id="jam-toleransi" type="number" min={0} max={120} value={data.toleransiMenit} onChange={(e) => update('toleransiMenit', parseInt(e.target.value) || 0)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="jam-cutoff">Jam Cutoff</label>
                <input id="jam-cutoff" type="time" value={data.cutoff} onChange={(e) => update('cutoff', e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Pratinjau kalimat */}
            <div className="rounded-md bg-aam-page border border-aam-border p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-aam-green mt-0.5" style={{ fontSize: '1.125rem' }}>info</span>
                <p className="text-sm text-aam-text">
                  Guru terlambat bila check-in setelah <strong>{computeLateTime()} WIB</strong>
                  {' '}({data.jamMasuk} + {data.toleransiMenit} menit toleransi).
                </p>
              </div>
            </div>

            {/* Save + footer */}
            <div className="border-t border-aam-border pt-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-aam-text-muted">
                {updatedByName && (
                  <span>Terakhir disimpan oleh <strong className="text-aam-text">{updatedByName}</strong>{updatedAt && ` — ${new Date(updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`}</span>
                )}
              </div>
              <Button onClick={handleSave} loading={saving} disabled={!dirty} icon="save">Simpan</Button>
            </div>
          </div>
        </Card>
      </PageContainer>
    </UnsavedGuard>
  );
}
