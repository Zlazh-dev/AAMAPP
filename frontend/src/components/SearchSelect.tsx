import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface SearchSelectOption {
  value: string | number;
  label: string;
  subtitle?: string;
  icon?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  /**
   * Pencarian sisi-server (async). Bila disediakan, SearchSelect tidak
   * menyaring `options` di browser — mengirim `q` ke server (debounce
   * ±300ms, ambil ±20 hasil teratas). `options` dipakai hanya sbg cache
   * opsi terpilih (supaya label terpilih tetap tampil).
   *
   * Alasan: dgn >200 siswa, siswa ke-201 tak bisa dipilih bila filter
   * sisi-browser memotong ke 200.
   */
  onSearch?: (q: string) => Promise<SearchSelectOption[]>;
}

/**
 * <SearchSelect> — search dropdown for guru/siswa/kelas selection.
 *
 * - DESKTOP: dropdown panel below the input
 * - MOBILE (≤768px): bottom sheet with search + list
 * - Filter options by search text
 * - Touch targets ≥48px in mobile sheet
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  disabled = false,
  clearable = false,
  onSearch,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Async server-side search ──────────────────────────────────────────
  // Bila onSearch disediakan, hasil dropdown diambil dari server (debounce
  // ±300ms), bukan difilter di browser. `options` tetap dipakai sbg cache
  // opsi terpilih (supaya label terpilih tampil saat dropdown tertutup).
  const [asyncOptions, setAsyncOptions] = useState<SearchSelectOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const asyncAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!onSearch || !open) return;
    let cancelled = false;
    setSearchLoading(true);
    // Hentikan pencarian sebelumnya (debounce 300ms).
    if (asyncAbortRef.current) asyncAbortRef.current.abort();
    const ac = new AbortController();
    asyncAbortRef.current = ac;
    const timer = setTimeout(async () => {
      try {
        const results = await onSearch(search);
        if (!cancelled && !ac.signal.aborted) {
          setAsyncOptions(results);
        }
      } catch {
        // Aborted atau error — biarkan hasil sebelumnya.
      } finally {
        if (!cancelled && !ac.signal.aborted) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, open, onSearch]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close desktop dropdown on outside click — whitelist: container + desktop dropdown portal (butir 5)
  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (desktopDropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile]);

  // Body scroll lock for mobile sheet
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, isMobile]);

  // Opsi terpilih: cari di `options` (cache induk) atau `asyncOptions`.
  const selected = options.find((o) => o.value === value) || asyncOptions.find((o) => o.value === value) || null;

  // Hasil dropdown: bila onSearch, pakai asyncOptions; jika tidak, filter sisi-browser.
  const filtered = onSearch
    ? asyncOptions
    : options.filter((o) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          o.label.toLowerCase().includes(s) ||
          (o.subtitle?.toLowerCase().includes(s) ?? false)
        );
      });

  const handleSelect = (val: string | number | null) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  // Dropdown position for desktop portal (v0.12.7 — butir 5)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const trigger = containerRef.current;
    const initialRect = trigger?.getBoundingClientRect();
    const computePos = () => {
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dropdownHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showBelow = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;
      setDropdownPos({
        top: showBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
        left: rect.left,
        width: rect.width,
      });
    };
    computePos();
    // Close only on a REAL page scroll (trigger moved). Opening the dropdown
    // focuses the search input, which can cause the browser to fire a benign
    // 'scroll' event (e.g. scrolling the focused element into view) even
    // though the trigger itself hasn't moved — don't treat that as a close.
    const handleScroll = () => {
      if (!trigger) { setOpen(false); return; }
      const rect = trigger.getBoundingClientRect();
      if (!initialRect || Math.abs(rect.top - initialRect.top) > 1 || Math.abs(rect.left - initialRect.left) > 1) {
        setOpen(false);
      }
    };
    const handleResize = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, isMobile]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const triggerClass = [
    'w-full flex items-center justify-between gap-2 rounded-md border border-aam-border bg-white px-3 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[48px] transition-colors',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-aam-green/40',
  ].join(' ');

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={triggerClass}
      >
        <span className={selected ? 'text-aam-text' : 'text-aam-text-muted'}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.icon && (
                <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                  {selected.icon}
                </span>
              )}
              <span className="truncate">{selected.label}</span>
              {selected.subtitle && (
                <span className="text-xs text-aam-text-muted">({selected.subtitle})</span>
              )}
            </span>
          ) : placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
              className="material-symbols-outlined text-aam-text-muted hover:text-red-600 cursor-pointer"
              style={{ fontSize: '1.125rem' }}
            >
              close
            </span>
          )}
          <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.25rem' }}>
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </span>
      </button>

      {/* Desktop dropdown via PORTAL (v0.12.7 — butir 5) */}
      {!isMobile && open && createPortal(
        <div
          ref={desktopDropdownRef}
          className="fixed z-[10000] bg-white border border-aam-border rounded-md shadow-lg max-h-64 overflow-hidden flex flex-col animate-fade-in"
          style={{
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
        >
          <div className="relative p-2 border-b border-aam-border">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-aam-text-muted pointer-events-none"
              style={{ fontSize: '1.125rem' }}
            >
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm outline-none min-h-[40px]"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {searchLoading ? (
              <p className="px-3 py-4 text-sm text-aam-text-muted text-center">Mencari…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-aam-text-muted text-center">
                {onSearch && !search ? 'Ketik untuk mencari…' : 'Tidak ada hasil'}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={[
                    'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors min-h-[44px]',
                    opt.value === value
                      ? 'bg-aam-green/10 text-aam-green font-medium'
                      : 'text-aam-text hover:bg-gray-50',
                  ].join(' ')}
                >
                  {opt.icon && (
                    <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                      {opt.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.subtitle && (
                    <span className="text-xs text-aam-text-muted">{opt.subtitle}</span>
                  )}
                  {opt.value === value && (
                    <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.125rem' }}>
                      check
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Mobile bottom sheet */}
      {isMobile && open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Search */}
            <div className="px-5 pb-3">
              <div className="relative">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aam-text-muted pointer-events-none"
                  style={{ fontSize: '1.125rem' }}
                >
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                  className="w-full pl-10 pr-3 py-3 text-sm border border-aam-border rounded-md outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30 min-h-[48px]"
                />
              </div>
            </div>
            {/* Options */}
            <div className="px-2 pb-4 max-h-[50vh] overflow-y-auto">
              {searchLoading ? (
                <p className="px-3 py-6 text-sm text-aam-text-muted text-center">Mencari…</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-sm text-aam-text-muted text-center">
                  {onSearch && !search ? 'Ketik untuk mencari…' : 'Tidak ada hasil'}
                </p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={[
                      'w-full flex items-center gap-3 px-4 text-sm text-left transition-colors rounded-md min-h-[48px]',
                      opt.value === value
                        ? 'bg-aam-green/10 text-aam-green font-medium'
                        : 'text-aam-text hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {opt.icon && (
                      <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.25rem' }}>
                        {opt.icon}
                      </span>
                    )}
                    <span className="flex-1 truncate">
                      {opt.label}
                      {opt.subtitle && (
                        <span className="block text-xs text-aam-text-muted">{opt.subtitle}</span>
                      )}
                    </span>
                    {opt.value === value && (
                      <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.25rem' }}>
                        check
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
