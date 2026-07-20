import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/PageContainer';
import { SubPageLayout } from '../../components/SubPageLinks';
import { PageMenu } from '../../components/PageMenu';

const PENGATURAN_LINKS = [
  { key: 'jam', label: 'Jam KBM', path: '/tu/pengaturan/jam', icon: 'schedule', description: 'Jam masuk, pulang, toleransi, cutoff' },
  { key: 'libur', label: 'Hari Libur', path: '/tu/pengaturan/libur', icon: 'event_busy', description: 'Kalender libur sekolah' },
  { key: 'lokasi', label: 'Lokasi Presensi', path: '/tu/pengaturan/lokasi', icon: 'location_on', description: 'Geofence sekolah & radius' },
  { key: 'sekolah', label: 'Profil Sekolah', path: '/tu/pengaturan/sekolah', icon: 'apartment', description: 'Nama, NPSN, identitas sekolah' },
];

const CARDS = [
  {
    key: 'jam',
    path: '/tu/pengaturan/jam',
    icon: 'schedule',
    title: 'Jam KBM',
    desc: 'Jam masuk, pulang, toleransi, dan cutoff presensi guru.',
  },
  {
    key: 'libur',
    path: '/tu/pengaturan/libur',
    icon: 'event_busy',
    title: 'Hari Libur',
    desc: 'Kalender libur sekolah dan impor libur nasional.',
  },
  {
    key: 'lokasi',
    path: '/tu/pengaturan/lokasi',
    icon: 'location_on',
    title: 'Lokasi Presensi',
    desc: 'Geofence sekolah: koordinat dan radius absensi.',
  },
  {
    key: 'sekolah',
    path: '/tu/pengaturan/sekolah',
    icon: 'apartment',
    title: 'Profil Sekolah',
    desc: 'Nama, alamat, NPSN, dan identitas sekolah.',
  },
];

/**
 * /tu/pengaturan — halaman induk Pengaturan TU (IA-HIERARCHY-V2 revisi 2026-07-20).
 * Sub: Jam KBM · Hari Libur · Lokasi Presensi · Profil Sekolah.
 */
export function TuPengaturanPage() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Pengaturan</h2>
          <p className="text-sm text-aam-text-muted">Pengaturan operasional presensi dan jadwal</p>
        </div>
        <PageMenu menuTitle="Menu Pengaturan" links={PENGATURAN_LINKS} />
      </div>

      <SubPageLayout links={PENGATURAN_LINKS}>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            to={c.path}
            className="flex flex-col gap-2 rounded-lg border border-aam-border bg-aam-card p-4 hover:shadow-md transition-shadow"
          >
            <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 28 }}>
              {c.icon}
            </span>
            <span className="text-sm font-semibold text-aam-text">{c.title}</span>
            <span className="text-xs text-aam-text-muted">{c.desc}</span>
          </Link>
        ))}
      </div>
      </SubPageLayout>
    </PageContainer>
  );
}
