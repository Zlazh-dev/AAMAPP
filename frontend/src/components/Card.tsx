import React from 'react';

interface CardProps {
  icon?: string;
  className?: string;
  children: React.ReactNode;
  light?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * Komponen bersama <Card icon> — minimalist pure utility + watermark ikon
 * miring −15° opasitas 6–8% di pojok kanan-bawah.
 */
export function Card({
  icon,
  className = '',
  children,
  light = false,
  onClick,
  hoverable = false,
}: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-md border border-aam-border bg-white',
        onClick || hoverable
          ? 'transition-colors hover:border-aam-green/40'
          : '',
        onClick ? 'text-left w-full' : '',
        className,
      ].join(' ')}
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
      <div className="relative z-10">{children}</div>
    </Tag>
  );
}
