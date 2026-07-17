import React, { useState, useEffect } from 'react';
import { api, ApiError, type LokasiPengaturan } from '../../../api/client';
import { BackLink } from '../../../components/BackLink';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { UnsavedGuard } from '../../../components/UnsavedGuard';
import { useToast } from '../../../components/Toast';
import { PageContainer } from '../../../components/PageContainer';

// T15 0d: Lazy load LeafletMap (leaflet ikut chunk halaman lokasi)
const LeafletMap = React.lazy(() => import('../../../components/LeafletMap').then(m => ({ default: m.LeafletMap })));

const inputClass = 'w-full rounded-md border border-aam-border px-3 py-2.5 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[44px]';
const labelClass = 'block text-sm font-medium text-aam-text mb-1.5';

const EMPTY: LokasiPengaturan = { aktif: false, lat: 0, lng: 0, radiusMeter: 100 };

type GeoStatus = 'idle' | 'loading' | 'success' | 'denied' | 'error';

/**
 * /admin/pengaturan/lokasi — verifikasi lokasi presensi HP (T14, §15.3).
 * Saklar aktif + koordinat + "Gunakan lokasi saya" + radius.
 */
export function PengaturanLokasiPage() {
  const toast = useToast();
  const [data, setData] = useState<LokasiPengaturan>(EMPTY);
  const [original, setOriginal] = useState<LokasiPengaturan>(EMPTY);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await api.getPengaturanByKey('lokasi');
        if (cancelled) return;
        const val = { ...EMPTY, ...row.value };
        setData(val);
        setOriginal(val);
        setUpdatedByName(row.updatedByName);
        setUpdatedAt(row.updatedAt);
      } catch (err) {
        if (!cancelled) toast.show('error', 'Gagal memuat pengaturan lokasi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dirty = JSON.stringify(data) !== JSON.stringify(original);

  const update = (field: keyof LokasiPengaturan, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      toast.show('error', 'Browser tidak mendukung geolokasi');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('lat', Number(pos.coords.latitude.toFixed(6)));
        update('lng', Number(pos.coords.longitude.toFixed(6)));
        setGeoStatus('success');
        toast.show('success', 'Lokasi berhasil dideteksi');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoStatus('denied');
          toast.show('error', 'Izin lokasi ditolak. Aktifkan izin lokasi di browser Anda.');
        } else {
          setGeoStatus('error');
          toast.show('error', 'Gagal mendeteksi lokasi. Periksa koneksi GPS Anda.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const row = await api.adminUpdatePengaturan('lokasi', data);
      setData(row.value);
      setOriginal(row.value);
      setUpdatedByName(row.updatedByName);
      setUpdatedAt(row.updatedAt);
      toast.show('success', 'Pengaturan lokasi berhasil disimpan');
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
      <PageContainer size="md" bottomBar>
        <BackLink to="/admin/pengaturan" />
        <h2 className="text-lg font-heading font-semibold text-aam-text mt-4 mb-1">Lokasi Sekolah</h2>
        <p className="text-xs text-aam-text-muted mb-6">Verifikasi lokasi untuk presensi via HP (geofence)</p>

        <Card icon="location_on" className="p-6">
          <div className="space-y-5">
            {/* Saklar aktif */}
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-aam-text">Wajibkan verifikasi lokasi pada presensi HP</h3>
                <p className="text-xs text-aam-text-muted mt-1">Presensi HP akan memeriksa apakah guru berada di dalam radius sekolah</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={data.aktif}
                onClick={() => update('aktif', !data.aktif)}
                className={[
                  'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors',
                  data.aktif ? 'bg-aam-green' : 'bg-gray-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1',
                    data.aktif ? 'translate-x-6' : 'translate-x-1',
                  ].join(' ')}
                />
              </button>
            </div>

            {/* Koordinat */}
            <div className="border-t border-aam-border pt-4">
              <h3 className="text-sm font-semibold text-aam-text mb-4">Koordinat Sekolah</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="lokasi-lat">Latitude</label>
                  <input id="lokasi-lat" type="number" step="0.000001" value={data.lat} onChange={(e) => update('lat', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="-7.123456" />
                </div>
                <div>
                  <label className={labelClass} htmlFor="lokasi-lng">Longitude</label>
                  <input id="lokasi-lng" type="number" step="0.000001" value={data.lng} onChange={(e) => update('lng', parseFloat(e.target.value) || 0)} className={inputClass} placeholder="112.654321" />
                </div>
              </div>

              <div className="mt-4">
                <Button variant="secondary" size="sm" icon="my_location" onClick={handleUseMyLocation} loading={geoStatus === 'loading'}>
                  Gunakan lokasi saya sekarang
                </Button>
                {geoStatus === 'denied' && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    Izin lokasi ditolak. Aktifkan di pengaturan browser Anda.
                  </p>
                )}
                {geoStatus === 'error' && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                    Gagal mendeteksi lokasi. Periksa koneksi GPS.
                  </p>
                )}
              </div>
            </div>

            {/* Peta (T15 0d — Leaflet dynamic import, §14.10.3) */}
            <div className="border-t border-aam-border pt-4">
              <h3 className="text-sm font-semibold text-aam-text mb-3">Peta Lokasi</h3>
              <React.Suspense fallback={<div className="w-full h-64 rounded-md border border-aam-border bg-aam-bg flex items-center justify-center text-sm text-aam-text-muted">Memuat peta…</div>}>
                <LeafletMap
                  lat={data.lat}
                  lng={data.lng}
                  radiusMeter={data.radiusMeter}
                  onMove={(newLat, newLng) => {
                    update('lat', newLat);
                    update('lng', newLng);
                  }}
                />
              </React.Suspense>
              <p className="text-xs text-aam-text-muted mt-1.5">Klik peta untuk memindahkan titik. Lingkaran hijau menunjukkan radius geofence.</p>
            </div>

            {/* Radius */}
            <div className="border-t border-aam-border pt-4">
              <label className={labelClass} htmlFor="lokasi-radius">Radius (meter)</label>
              <input id="lokasi-radius" type="number" min={10} max={1000} value={data.radiusMeter} onChange={(e) => update('radiusMeter', parseInt(e.target.value) || 100)} className={inputClass} />
              <p className="text-xs text-aam-text-muted mt-1.5">Default 100 m. Guru harus berada dalam radius ini dari koordinat sekolah.</p>
            </div>

            {/* Penjelasan */}
            <div className="rounded-md bg-aam-bg border border-aam-border p-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-aam-text-muted mt-0.5" style={{ fontSize: '1.125rem' }}>info</span>
                <p className="text-xs text-aam-text-muted">
                  Kiosk tidak terdampak oleh pengaturan ini — perangkat kiosk terpasang tetap di sekolah.
                  Verifikasi lokasi hanya berlaku untuk presensi via HP.
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
