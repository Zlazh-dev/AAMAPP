import React from 'react';

type PageContainerSize = 'xl' | 'lg' | 'md' | 'sm';

const sizeClass: Record<PageContainerSize, string> = {
  xl: 'max-w-[1280px]',
  lg: 'max-w-[1024px]',
  md: 'max-w-[768px]',
  sm: 'max-w-[640px]',
};

interface PageContainerProps {
  size?: PageContainerSize;
  /** Extra className for the container div */
  className?: string;
  /** T15 0c: Tambah padding bawah pada mobile agar sticky bottom bar tidak menutupi konten */
  bottomBar?: boolean;
  children: React.ReactNode;
}

/**
 * `<PageContainer>` — komponen bersama max-width + mx-auto (v0.12.8).
 *
 * Mencegah pola "konten nempel kiri, kanan kosong" pada viewport ≥1280px.
 * SELALU memakai `mx-auto` agar konten di tengah area konten.
 *
 * Size mapping:
 * - xl (±1280px) — daftar/tabel/laporan
 * - lg (±1024px) — detail & form 2-kolom + panel samping
 * - md (±768px)  — wizard, form 1 kolom, hub kartu, halaman sukses
 * - sm (±640px)  — halaman fokus tunggal
 *
 * Header halaman (judul + BackLink + PageMenu + SubPageLinks) ikut
 * DI DALAM kontainer agar sejajar dengan konten.
 *
 * Mobile tidak terpengaruh — full-width + padding standar.
 */
export function PageContainer({
  size = 'xl',
  className = '',
  bottomBar = false,
  children,
}: PageContainerProps) {
  return (
    <div
      className={[
        'w-full mx-auto p-4 md:p-6',
        bottomBar ? 'pb-24 md:pb-6' : '',
        sizeClass[size],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
