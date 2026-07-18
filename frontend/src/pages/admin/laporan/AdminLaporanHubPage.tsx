import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../../components/PageContainer';
import { Card } from '../../../components/Card';
import { BackLink } from '../../../components/BackLink';

interface SubPageLink {
  path: string;
  icon: string;
  title: string;
  description: string;
}

const SUB_PAGES: SubPageLink[] = [
  {
    path: '/admin/laporan/harian-guru',
    icon: 'person_check',
    title: 'Laporan Harian Guru',
    description: 'Rekap hadir/terlambat/izin/sakit/dinas/alpha/libur per guru dalam rentang tanggal.',
  },
  {
    path: '/admin/laporan/keterlaksanaan',
    icon: 'class',
    title: 'Keterlaksanaan KBM',
    description: 'Persentase KBM terlaksana vs total per guru, kelas, atau mapel.',
  },
  {
    path: '/admin/laporan/siswa',
    icon: 'groups',
    title: 'Kehadiran Siswa',
    description: 'Rekap H/S/I/A/T per siswa dalam rentang tanggal.',
  },
];

/**
 * /admin/laporan — HUB laporan (SubPageLinks, TANPA TAB, per spec F4b).
 */
export function AdminLaporanHubPage() {
  return (
    <PageContainer size="md">
      <BackLink to="/admin" />

      <div className="mb-8">
        <h2 className="text-xl font-bold text-aam-text">Laporan</h2>
        <p className="text-sm text-aam-muted mt-0.5">
          Pilih jenis laporan untuk melihat rekap dan mengekspor data.
        </p>
      </div>

      <div className="space-y-3">
        {SUB_PAGES.map(p => (
          <Link key={p.path} to={p.path} className="block group">
            <Card className="hover:shadow-md transition-shadow group-hover:border-aam-green/40">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-aam-green/10 p-3 shrink-0">
                  <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 24 }}>
                    {p.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-aam-text group-hover:text-aam-green transition-colors">
                    {p.title}
                  </div>
                  <div className="text-sm text-aam-muted mt-0.5">{p.description}</div>
                </div>
                <span className="material-symbols-outlined text-aam-muted shrink-0" style={{ fontSize: 20 }}>
                  chevron_right
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
