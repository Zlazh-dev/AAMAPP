import React from 'react';
import { Link, useLocation } from 'react-router-dom';

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
 * header halaman utama. Desktop only; mobile uses PageMenu ⋮.
 *
 * §9 fix: h-5 (was h-4.5 invalid), text-xs (was text-[10px]), mb-4 (no -mt-2).
 */
export function SubPageLinks({ links }: SubPageLinksProps) {
  const { pathname } = useLocation();
  if (links.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 mb-4">
      {links.map((link, idx) => {
        const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
        return (
          <React.Fragment key={link.key}>
            {idx > 0 && (
              <span className="text-aam-border text-xs" aria-hidden="true">•</span>
            )}
            <Link
              to={link.path}
              className={[
                'inline-flex items-center gap-1.5 text-sm transition-colors py-1 px-1',
                isActive
                  ? 'text-aam-green font-medium'
                  : 'text-aam-text-muted hover:text-aam-green',
              ].join(' ')}
            >
              {link.icon && (
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                  {link.icon}
                </span>
              )}
              <span>{link.label}</span>
              {link.badge !== undefined && link.badge !== '' && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-aam-yellow text-xs font-bold text-yellow-900">
                  {link.badge}
                </span>
              )}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
