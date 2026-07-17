import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { AdaptiveSelect } from '../../../components/AdaptiveSelect';
import { UnsavedGuard } from '../../../components/UnsavedGuard';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const SEMESTER_OPTIONS = [
  { value: '1', label: 'Ganjil (Semester 1)' },
  { value: '2', label: 'Genap (Semester 2)' },
];

/**
 * /admin/pengaturan/tahun-ajaran/baru — form tambah TA (T14).
 * Uses SaveSuccess route per arahan planner #3.
 */
export function PengaturanTahunAjaranFormPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [nama, setNama] = useState('');
  const [semester, setSemester] = useState('1');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const dirty = touched && (nama !== '' || semester !== '1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.match(/^\d{4}\/\d{4}$/)) {
      toast.show('error', 'Format nama harus YYYY/YYYY (contoh 2025/2026)');
      return;
    }
    setSaving(true);
    try {
      const created = await api.adminCreateTahunAjaran({
        nama,
        semester: parseInt(semester) as 1 | 2,
      });
      // Navigate to SaveSuccess route with state
      navigate('/admin/pengaturan/tahun-ajaran/sukses', {
        replace: true,
        state: { entityName: `${created.nama} Semester ${created.semester === 1 ? 'Ganjil' : 'Genap'}`, mode: 'create' },
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal membuat tahun ajaran';
      toast.show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="sm">
        <BackLink to="/admin/pengaturan/tahun-ajaran" mobileButton={false} />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">Tambah Tahun Ajaran</h2>
        <p className="text-xs text-aam-text-muted mb-6">Buat tahun ajaran dan semester baru</p>

        <Card icon="date_range" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="ta-nama">Tahun Ajaran</label>
              <input
                id="ta-nama"
                type="text"
                value={nama}
                onChange={(e) => { setNama(e.target.value); setTouched(true); }}
                className={inputClass}
                placeholder="2025/2026"
                maxLength={9}
                required
              />
              <p className="text-xs text-aam-text-muted mt-1">Format: YYYY/YYYY (contoh 2025/2026)</p>
            </div>

            <div>
              <label className={labelClass}>Semester</label>
              <AdaptiveSelect
                value={semester}
                onChange={(v) => { setSemester(v); setTouched(true); }}
                options={SEMESTER_OPTIONS}
                label="Pilih Semester"
              />
            </div>

            <div className="border-t border-aam-border pt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" size="md" onClick={() => navigate('/admin/pengaturan/tahun-ajaran')} type="button">
                Batal
              </Button>
              <Button type="submit" size="md" icon="save" loading={saving} disabled={!nama}>
                Simpan
              </Button>
            </div>
          </form>
        </Card>
      </PageContainer>
    </UnsavedGuard>
  );
}
