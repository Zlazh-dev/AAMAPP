import React from 'react';
import { Link } from 'react-router-dom';

export interface SubPageLinkItem {
  key: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number | string;
}

interface SubPageLinksProps {
  links: SubPageLinkItem[];
}

/**
 * `<SubPageLinks>` — deretan TAUTAN TEKS sub-halaman + badge di bawah
 * header halaman utama (v0.12.0). Desktop only; mobile uses PageMenu ⋮.
 *
 * Tautan ini adalah NAVIGASI (bukan aksi) — tidak terkena aturan
 * "larangan deretan tombol aksi" (v0.12.1).
 */
export function SubPageLinks({ links }: SubPageLinksProps) {
  if (links.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 mb-4 -mt-2">
      {links.map((link, idx) => (
        <React.Fragment key={link.key}>
          {idx > 0 && (
            <span className="text-aam-border text-xs" aria-hidden="true">•</span>
          )}
          <Link
            to={link.path}
            className="inline-flex items-center gap-1.5 text-sm text-aam-text-muted hover:text-aam-green transition-colors py-1"
          >
            {link.icon && (
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                {link.icon}
              </span>
            )}
            <span>{link.label}</span>
            {link.badge !== undefined && link.badge !== '' && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full bg-aam-yellow text-[10px] font-bold text-yellow-900">
                {link.badge}
              </span>
            )}
          </Link>
        </React.Fragment>
      ))}
    </nav>
  );
}
