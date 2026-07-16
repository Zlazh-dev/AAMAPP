import React, { useState, useEffect } from 'react';
import { api, ApiError, type KkmPengaturan } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { UnsavedGuard } from '../../../components/UnsavedGuard';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const EMPTY: KkmPengaturan = { nilai: 75 };

/**
 * /admin/pengaturan/kkm — KKM global (T14, §15.3).
 */
export function PengaturanKkmPage() {
  const toast = useToast();
  const [data, setData] = useState<KkmPengaturan>(EMPTY);
  const [original, setOriginal] = useState<KkmPengaturan>(EMPTY);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await api.getPengaturanByKey('kkm');
        if (cancelled) return;
        const val = { ...EMPTY, ...row.value };
        setData(val);
        setOriginal(val);
        setUpdatedByName(row.updatedByName);
        setUpdatedAt(row.updatedAt);
      } catch (err) {
        if (!cancelled) toast.show('error', 'Gagal memuat KKM');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = JSON.stringify(data) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await api.adminUpdatePengaturan('kkm', data);
      setData(row.value);
      setOriginal(row.value);
      setUpdatedByName(row.updatedByName);
      setUpdatedAt(row.updatedAt);
      toast.show('success', 'KKM berhasil disimpan');
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
        <BackLink to="/admin/pengaturan" />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="sm">
        <BackLink to="/admin/pengaturan" />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">KKM (Kriteria Ketuntasan Minimal)</h2>
        <p className="text-xs text-aam-text-muted mb-6">Nilai KKM global untuk semua mapel</p>

        <Card icon="flag" className="p-6">
          <div className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="kkm-nilai">Nilai KKM</label>
              <input
                id="kkm-nilai"
                type="number"
                min={0}
                max={100}
                value={data.nilai}
                onChange={(e) => setData((prev) => ({ ...prev, nilai: parseInt(e.target.value) || 0 }))}
                className={inputClass}
              />
              <p className="text-xs text-aam-text-muted mt-1.5">Rentang 0–100. Nilai default 75.</p>
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
