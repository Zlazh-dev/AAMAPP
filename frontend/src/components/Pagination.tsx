import React from 'react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

/**
 * `<Pagination>` — paginasi bersama untuk tabel desktop & kartu mobile.
 *
 * Desktop: sebelumnya/berikutnya + nomor halaman + total data.
 * Mobile: tombol ‹ sebelumnya / berikutnya › + total (lebih ringkas).
 *
 * Jangan bikin per halaman; pakai ini di semua daftar.
 */
export function Pagination({ page, limit, total, onPageChange, loading }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  if (total <= limit && page === 1) {
    // Hanya 1 halaman — tampilkan total saja (bila > 0).
    if (total === 0) return null;
    return (
      <div className="flex items-center justify-between text-xs text-aam-text-muted py-2 px-1">
        <span>{total} data</span>
      </div>
    );
  }

  // Tombol nomor halaman (desktop): tampilkan max 5 halaman sekitar current.
  const pageButtons: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pageButtons.push(i);

  return (
    <>
      {/* Desktop: tombol + nomor halaman + total */}
      <div className="hidden md:flex items-center justify-between py-3 px-1">
        <span className="text-xs text-aam-text-muted">
          Menampilkan <strong className="text-aam-text">{from}–{to}</strong> dari <strong className="text-aam-text">{total}</strong> data
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="px-2.5 py-1.5 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
            aria-label="Halaman sebelumnya"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_left</span>
          </button>
          {start > 1 && (
            <>
              <button type="button" onClick={() => onPageChange(1)} className="px-3 py-1.5 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 min-h-[36px]">1</button>
              {start > 2 && <span className="px-1 text-aam-text-muted">…</span>}
            </>
          )}
          {pageButtons.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={[
                'px-3 py-1.5 rounded-md border text-sm min-h-[36px]',
                p === page
                  ? 'border-aam-green bg-aam-green/10 text-aam-green font-semibold'
                  : 'border-aam-border text-aam-text hover:bg-gray-50',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-aam-text-muted">…</span>}
              <button type="button" onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 min-h-[36px]">{totalPages}</button>
            </>
          )}
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="px-2.5 py-1.5 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
            aria-label="Halaman berikutnya"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Mobile: ringkas — ‹ Sebelumnya / Berikutnya › + total */}
      <div className="flex md:hidden items-center justify-between py-3 px-1 gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] flex-1 justify-center"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_left</span>
          Sebelumnya
        </button>
        <span className="text-xs text-aam-text-muted whitespace-nowrap px-1">
          {from}–{to} / {total}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-aam-border text-sm text-aam-text hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] flex-1 justify-center"
        >
          Berikutnya
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>chevron_right</span>
        </button>
      </div>
    </>
  );
}