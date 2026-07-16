import React from 'react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackLink({ to, label = 'Kembali', className = '' }: BackLinkProps) {
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
