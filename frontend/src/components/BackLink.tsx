import React from 'react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
  /**
   * BACKLINK-ADAPTIF-MOBILE (keputusan user): di layar <md, teks kecil
   * "← Kembali" di atas halaman sulit dijangkau ibu jari. Default (`true`)
   * merender ADAPTIF:
   *  - Desktop (≥md): tautan teks kecil "← Kembali" di atas (perilaku lama).
   *  - Mobile (<md): TIDAK ada teks atas; sebaliknya tombol full-width
   *    "← Kembali" (≥48px) MELAYANG di paling bawah viewport (position:
   *    fixed — otomatis "elemen terakhir" secara visual tanpa perlu
   *    dipindah di JSX).
   * Set `false` pada halaman FORM (sudah punya Simpan/Batal sendiri —
   * "Batal" = jalan kembali) dan halaman SaveSuccess (tombol sendiri) agar
   * tidak dobel, sesuai keputusan user.
   */
  mobileButton?: boolean;
  /** z-index tombol mobile — naikkan bila halaman punya sticky bar lain yang lebih tinggi. */
  mobileZ?: number;
}

export function BackLink({
  to,
  label = 'Kembali',
  className = '',
  mobileButton = true,
  mobileZ = 30,
}: BackLinkProps) {
  return (
    <>
      <Link
        to={to}
        className={[
          'items-center gap-1 text-sm text-aam-text-muted hover:text-aam-text transition-colors',
          mobileButton ? 'hidden md:inline-flex' : 'inline-flex',
          className,
        ].join(' ')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
          arrow_back
        </span>
        {label}
      </Link>

      {mobileButton && (
        <div
          className="md:hidden fixed left-0 right-0 bottom-0 px-4 pointer-events-none"
          style={{ zIndex: mobileZ, paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Link
            to={to}
            className="pointer-events-auto flex items-center justify-center gap-2 w-full rounded-md border border-aam-border bg-white shadow-lg text-aam-text text-sm font-medium min-h-[48px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              arrow_back
            </span>
            {label}
          </Link>
        </div>
      )}
    </>
  );
}
