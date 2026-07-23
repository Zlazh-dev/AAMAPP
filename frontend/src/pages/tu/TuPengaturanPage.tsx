import React from 'react';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { PengaturanJamPage } from '../admin/pengaturan/PengaturanJamPage';
import { PengaturanLiburPage } from '../admin/pengaturan/PengaturanLiburPage';
import { PengaturanLokasiPage } from '../admin/pengaturan/PengaturanLokasiPage';
import { PengaturanSekolahPage } from '../admin/pengaturan/PengaturanSekolahPage';

/**
 * /tu/pengaturan — satu halaman scroll, BUKAN hub sub-halaman.
 * Keempat bagian (Jam KBM, Hari Libur, Lokasi Presensi, Profil Sekolah)
 * jadi section ber-heading. Nol SubPageLinks, nol rute sub.
 *
 * TU-PENGATURAN: komponen lama dipakai ulang sebagai section (embedded=true)
 * — chrome halaman (BackLink & judul sendiri) dibuang supaya tidak dobel.
 */
export function TuPengaturanPage() {
  return (
    <PageContainer size="xl">
      <h1 className="text-xl font-bold text-aam-text mb-6">Pengaturan</h1>

      {/* Section 1: Jam Presensi */}
      <section id="pengaturan-jam" className="mb-8">
        <h2 className="text-base font-heading font-semibold text-aam-text mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>schedule</span>
          Jam Presensi
        </h2>
        <p className="text-xs text-aam-text-muted mb-3">Jam masuk, pulang, toleransi keterlambatan, dan cutoff</p>
        <Card>
          <PengaturanJamPage embedded />
        </Card>
      </section>

      {/* Section 2: Kalender Libur */}
      <section id="pengaturan-libur" className="mb-8">
        <h2 className="text-base font-heading font-semibold text-aam-text mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>event_busy</span>
          Kalender Libur
        </h2>
        <p className="text-xs text-aam-text-muted mb-3">Klik tanggal untuk memilih, lalu gunakan bar aksi di bawah</p>
        <PengaturanLiburPage embedded />
      </section>

      {/* Section 3: Lokasi Presensi */}
      <section id="pengaturan-lokasi" className="mb-8">
        <h2 className="text-base font-heading font-semibold text-aam-text mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>location_on</span>
          Lokasi Presensi
        </h2>
        <p className="text-xs text-aam-text-muted mb-3">Verifikasi lokasi untuk presensi via HP (geofence)</p>
        <Card>
          <PengaturanLokasiPage embedded />
        </Card>
      </section>

      {/* Section 4: Profil Sekolah */}
      <section id="pengaturan-sekolah" className="mb-8">
        <h2 className="text-base font-heading font-semibold text-aam-text mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>school</span>
          Profil Sekolah
        </h2>
        <p className="text-xs text-aam-text-muted mb-3">Data sekolah untuk kop dokumen & rapor</p>
        <Card>
          <PengaturanSekolahPage embedded />
        </Card>
      </section>
    </PageContainer>
  );
}
