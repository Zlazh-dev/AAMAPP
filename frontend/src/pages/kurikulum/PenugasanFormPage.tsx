import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, Guru, Kelas, Mapel, TahunAjaran } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { BackLink } from '../../components/BackLink';
import { SearchSelect } from '../../components/SearchSelect';
import { UnsavedGuard } from '../../components/UnsavedGuard';
import { useToast } from '../../components/Toast';

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

/**
 * /kurikulum/penugasan/baru — Form Tambah Penugasan (T15 §14.10.3).
 * SearchSelect guru ? mapel ? kelas multi-checkbox.
 * Sub-halaman + SaveSuccess pattern.
 */
export function PenugasanFormPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [guruList, setGuruList] = useState<Guru[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [taAktif, setTaAktif] = useState<TahunAjaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [guruId, setGuruId] = useState<number | null>(null);
  const [mapelId, setMapelId] = useState<number | null>(null);
  const [selectedKelas, setSelectedKelas] = useState<Set<number>>(new Set());

  // Pencarian sisi-server untuk guru & mapel (bukan ambil 1000 baris).
  // Kelas tetap checkbox multi-select (jumlah kelas terbatas, butuh lihat semua).
  const searchGuru = React.useCallback(async (q: string) => {
    const res = await api.adminGetGuru({ q: q || undefined, limit: 20 });
    return res.data.map((g) => ({ value: g.id, label: `${g.nama}${g.nip ? ` — ${g.nip}` : ''}` }));
  }, []);

  const searchMapel = React.useCallback(async (q: string) => {
    const res = await api.getMapel({ q: q || undefined, limit: 20 });
    return res.data.map((m) => ({ value: m.id, label: `${m.nama} (${m.kode})` }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ta, kelasRes] = await Promise.all([
          api.getTahunAjaranAktif(),
          api.adminGetKelas({ limit: 100 }),
        ]);
        if (cancelled) return;
        setTaAktif(ta);
        setKelasList(kelasRes.data);
      } catch (err) {
        if (!cancelled) toast.show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = guruId !== null || mapelId !== null || selectedKelas.size > 0;

  const toggleKelas = (id: number) => {
    setSelectedKelas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!guruId || !mapelId || selectedKelas.size === 0 || !taAktif) return;
    setSaving(true);
    try {
      // Backend creates one penugasan row per kelasId in a single batch request
      // (server resolves TA aktif itself).
      await api.createPenugasan({
        guruId,
        mapelId,
        kelasIds: Array.from(selectedKelas),
      });
      navigate('/kurikulum/penugasan/sukses');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal menyimpan';
      toast.show('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer size="md">
        <BackLink to="/kurikulum/penugasan" mobileButton={false} />
        <div className="mt-8 text-center text-sm text-aam-text-muted">Memuat…</div>
      </PageContainer>
    );
  }

  // No TA active ? panel arahan
  if (!taAktif) {
    return (
      <PageContainer size="md">
        <BackLink to="/kurikulum/penugasan" mobileButton={false} />
        <Card className="text-center mt-4">
          <span className="material-symbols-outlined text-aam-text-muted mb-3" style={{ fontSize: '3rem' }}>
            calendar_off
          </span>
          <h3 className="text-sm font-medium text-aam-text mb-2">Belum ada tahun ajaran aktif</h3>
          <p className="text-xs text-aam-text-muted mb-4">
            Penugasan memerlukan tahun ajaran aktif. Buat dan aktifkan tahun ajaran di Pengaturan.
          </p>
          <Button variant="secondary" size="sm" icon="settings" onClick={() => navigate('/kurikulum/tahun-ajaran-kkm')}>
            Buka Pengaturan
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <UnsavedGuard dirty={dirty}>
      <PageContainer size="md" bottomBar>
        <BackLink to="/kurikulum/penugasan" mobileButton={false} />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">
          Tambah Penugasan
        </h2>
        <p className="text-xs text-aam-text-muted mb-6">
          TA {taAktif.nama} Sem {taAktif.semester}
        </p>

        <Card icon="assignment_ind">
          <div className="space-y-5">
            {/* Guru */}
            <div>
              <label className={labelClass}>Guru</label>
              <SearchSelect
                options={guruId ? [{ value: guruId, label: guruList.find((g) => g.id === guruId)?.nama ?? `Guru #${guruId}` }] : []}
                value={guruId}
                onChange={(v) => setGuruId(v as number | null)}
                placeholder="Pilih guru…"
                searchPlaceholder="Cari nama/NIP guru…"
                onSearch={searchGuru}
              />
            </div>

            {/* Mapel */}
            <div>
              <label className={labelClass}>Mata Pelajaran</label>
              <SearchSelect
                options={mapelId ? [{ value: mapelId, label: mapelList.find((m) => m.id === mapelId)?.nama ?? `Mapel #${mapelId}` }] : []}
                value={mapelId}
                onChange={(v) => setMapelId(v as number | null)}
                placeholder="Pilih mapel…"
                searchPlaceholder="Cari nama mapel…"
                onSearch={searchMapel}
              />
            </div>

            {/* Kelas multi-select */}
            <div>
              <label className={labelClass}>Kelas (pilih satu atau lebih)</label>
              <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border border-aam-border p-3">
                {kelasList.map((k) => (
                  <label key={k.id} className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={selectedKelas.has(k.id)}
                      onChange={() => toggleKelas(k.id)}
                      className="w-4 h-4 rounded border-aam-border text-aam-green focus:ring-aam-green/30"
                    />
                    <span className="text-sm text-aam-text">{k.nama}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Sticky bottom bar (mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-aam-border p-3 z-30" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!guruId || !mapelId || selectedKelas.size === 0}
            icon="save"
            className="w-full"
          >
            Simpan ({selectedKelas.size} kelas)
          </Button>
        </div>

        {/* Desktop save button */}
        <div className="hidden md:flex items-center justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => navigate('/kurikulum/penugasan')}>Batal</Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!guruId || !mapelId || selectedKelas.size === 0}
            icon="save"
          >
            Simpan ({selectedKelas.size} kelas)
          </Button>
        </div>
      </PageContainer>
    </UnsavedGuard>
  );
}
