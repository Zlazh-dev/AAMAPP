import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/Card';
import { PageContainer } from '../../../components/PageContainer';

/**
 * /admin/pengaturan — HUB 6 kartu → sub-halaman (T14, §15.3).
 */
export function PengaturanHubPage() {
  const navigate = useNavigate();

  const cards = [
    { label: 'Profil Sekolah', desc: 'Nama, jenjang, logo, kepala sekolah, alamat', icon: 'school', path: '/admin/pengaturan/sekolah' },
    { label: 'Jam Presensi', desc: 'Jam masuk, pulang, toleransi, cutoff', icon: 'schedule', path: '/admin/pengaturan/jam' },
    { label: 'Lokasi Sekolah', desc: 'Verifikasi lokasi presensi HP (geofence)', icon: 'location_on', path: '/admin/pengaturan/lokasi' },
    { label: 'Kalender Libur', desc: 'Tanggal libur sekolah', icon: 'calendar_month', path: '/admin/pengaturan/libur' },
    { label: 'Tahun Ajaran', desc: 'Daftar tahun ajaran & semester aktif', icon: 'date_range', path: '/admin/pengaturan/tahun-ajaran' },
    { label: 'KKM', desc: 'Kriteria Ketuntasan Minimal global', icon: 'flag', path: '/admin/pengaturan/kkm' },
  ];

  return (
    <PageContainer size="xl">
      <h2 className="text-lg font-heading font-semibold text-aam-text mb-1">Pengaturan</h2>
      <p className="text-xs text-aam-text-muted mb-6">Kelola pengaturan sekolah dan aplikasi</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button
            key={c.path}
            onClick={() => navigate(c.path)}
            className="text-left transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-aam-green/20 rounded-md"
          >
            <Card icon={c.icon} className="p-5 h-full cursor-pointer hover:border-aam-green/30">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.75rem' }}>
                  {c.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-aam-text">{c.label}</h3>
                  <p className="text-xs text-aam-text-muted mt-1">{c.desc}</p>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </PageContainer>
  );
}
