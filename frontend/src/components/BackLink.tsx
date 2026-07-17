import React from 'react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
  /**
   * 'text' (default) — tautan teks kecil "← Kembali" (dipakai desktop, atas halaman).
   * 'button' — tombol full-width ≥48px (dipakai mobile, BAWAH konten — BACKLINK-ADAPTIF-MOBILE).
   */
  variant?: 'text' | 'button';
}

export function BackLink({ to, label = 'Kembali', className = '', variant = 'text' }: BackLinkProps) {
  if (variant === 'button') {
    return (
      <Link
        to={to}
        className={[
          'flex items-center justify-center gap-2 w-full rounded-md border border-aam-border bg-white',
          'text-aam-text text-sm font-medium min-h-[48px] hover:bg-gray-50 active:bg-gray-100 transition-colors',
          className,
        ].join(' ')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
          arrow_back
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={[
        'inline-flex items-center gap-1 text-sm text-aam-text-muted hover:text-aam-text transition-colors',
        className,
      ].join(' ')}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
        arrow_back
      </span>
      {label}
    </Link>
  );
}
