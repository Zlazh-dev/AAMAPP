import React from 'react';

export interface CardProps {
  /** Material Symbols icon name — renders as background watermark. */
  icon?: string;
  className?: string;
  children: React.ReactNode;
  light?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
  /**
   * flush=true → no padding baked in (use for tables/lists that need
   * edge-to-edge content). flush=false (default) → p-4 sm:p-5 baked in.
   * All callers MUST remove any explicit p-* className after this change.
   */
  flush?: boolean;
}

/**
 * Komponen bersama <Card> — minimalist pure utility + optional watermark ikon
 * miring −15° opasitas 6–8% di pojok kanan-bawah.
 *
 * §1 (CARD-DESIGN-STANDARD.md):
 *   - Root: rounded-md border shadow-sm (selalu)
 *   - Interactive: hover:border-aam-green/40 hover:shadow-md
 *   - Inner wrapper: p-4 sm:p-5 (unless flush=true)
 */
export function Card({
  icon,
  className = '',
  children,
  light = false,
  onClick,
  hoverable = false,
  flush = false,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-md border border-aam-border bg-white shadow-sm',
        onClick || hoverable
          ? 'transition-colors hover:border-aam-green/40 hover:shadow-md'
          : '',
        onClick ? 'text-left w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {icon && (
        <span
          className={[
            'material-symbols-outlined card-watermark',
            light ? 'card-watermark-light' : '',
          ].join(' ')}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className={flush ? 'relative z-10' : 'relative z-10 p-4 sm:p-5'}>
        {children}
      </div>
    </Tag>
  );
}
