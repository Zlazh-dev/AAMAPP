import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface SubPageLinkItem {
  key: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number | string;
  /** Keterangan singkat untuk kartu (opsional). */
  description?: string;
}

interface SubPageLinksProps {
  links: SubPageLinkItem[];
}

/**
 * `<SubPageLinks>` — section tautan sub-halaman yg terlihat jelas.
 *
 * Keluhan lama: hyperlink teks tak kelihatan di desktop (text-xs, muted).
 * Sekarang: kartu ringkas berisi ikon + judul + keterangan singkat,
 * seluruh area bisa diklik.
 *
 * Penempatan (IA-HIERARCHY-V2):
 * - Desktop: di ATAS tabel (grid kartu, responsif 2-4 kolom).
 * - Mobile: tetap tampil (bukan hidden) — di bawah konten kartu.
 *
 * Karena SubPageLinks tidak bisa mengatur order sibling-nya sendiri,
 * gunakan `<SubPageLayout>` (komponen ini + children dgn urutan
 * flex yg dibalik per viewport) bila ingin pembalikan mobile/desktop.
 *
 * Aturan lama tetap: sub halaman tidak masuk sidebar; BackLink tetap
 * menunjuk induk langsung.
 */
export function SubPageLinks({ links }: SubPageLinksProps) {
  const { pathname } = useLocation();
  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Sub halaman"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
    >
      {links.map((link) => {
        const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
        return (
          <Link
            key={link.key}
            to={link.path}
            className={[
              'flex items-start gap-2.5 rounded-lg border p-2.5 transition-all min-h-[44px]',
              isActive
                ? 'border-aam-green bg-aam-green/5 shadow-sm'
                : 'border-aam-border bg-white hover:border-aam-green/40 hover:shadow-sm',
            ].join(' ')}
          >
            {link.icon && (
              <span
                className={[
                  'material-symbols-outlined shrink-0 mt-0.5',
                  isActive ? 'text-aam-green' : 'text-aam-text-muted',
                ].join(' ')}
                style={{ fontSize: '1.25rem' }}
              >
                {link.icon}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={[
                    'text-sm font-medium truncate',
                    isActive ? 'text-aam-green' : 'text-aam-text',
                  ].join(' ')}
                >
                  {link.label}
                </span>
                {link.badge !== undefined && link.badge !== '' && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 rounded-full bg-aam-yellow text-xs font-bold text-yellow-900 shrink-0">
                    {link.badge}
                  </span>
                )}
              </div>
              {link.description && (
                <p className="text-xs text-aam-text-muted mt-0.5 line-clamp-2">
                  {link.description}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

interface SubPageLayoutProps {
  links: SubPageLinkItem[];
  children: React.ReactNode;
}

/**
 * `<SubPageLayout>` — bungkus SubPageLinks + konten utama dgn urutan
 * flex yg dibalik per viewport:
 *
 * - Desktop (md+): SubPageLinks di ATAS, konten di BAWAH.
 * - Mobile: SubPageLinks di BAWAH, konten di ATAS.
 *
 * Pakai ini (bukan `<SubPageLinks>` + konten terpisah) bila halaman
 * ingin pembalikan posisi sungguhan saat viewport mengecil.
 */
export function SubPageLayout({ links, children }: SubPageLayoutProps) {
  return (
    <div className="flex flex-col">
      {/* Konten utama: di atas pada mobile, di bawah pada desktop */}
      <div className="order-first md:order-last">{children}</div>
      {/* SubPageLinks: di bawah pada mobile, di atas pada desktop */}
      <div className="order-last md:order-first mt-4 md:mt-0 md:mb-4">
        <SubPageLinks links={links} />
      </div>
    </div>
  );
}