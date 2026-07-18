import React, { useState, useEffect, useRef, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface AdaptiveSelectOption {
  value: string;
  label: string;
}

interface AdaptiveSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AdaptiveSelectOption[];
  /** Label for sheet title / aria-label */
  label?: string;
  /** Placeholder text when no value selected */
  placeholder?: string;
  disabled?: boolean;
  /** Extra class for the trigger button */
  className?: string;
}

/**
 * `<AdaptiveSelect>` — komponen bersama select adaptif (v0.12.4).
 *
 * - DESKTOP (≥md): dropdown popover anchored to trigger button.
 * - MOBILE (<md): bottom sheet with list of options (≥48px items,
 *   checkmark on selected). If >8 options, search input in sheet.
 * - Pengecualian: input tanggal/jam tetap native (§15.0).
 * - Anti-bug: fokus kembali ke tombol pemicu saat dropdown/sheet ditutup.
 */
export function AdaptiveSelect({
  value,
  onChange,
  options,
  label = 'Pilih',
  placeholder = 'Pilih...',
  disabled = false,
  className = '',
}: AdaptiveSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetSearchRef = useRef<HTMLInputElement>(null);
  const reactId = useId();

  // Track viewport for adaptive rendering
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = selectedOption?.label ?? placeholder;

  // Close on outside click — whitelist: trigger, desktop dropdown, AND mobile sheet (butir 1)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Ignore clicks on trigger
      if (triggerRef.current?.contains(target)) return;
      // Ignore clicks inside desktop dropdown
      if (dropdownRef.current?.contains(target)) return;
      // Ignore clicks inside mobile bottom sheet (butir 1 FIX)
      if (sheetRef.current?.contains(target)) return;
      // Otherwise close
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Esc to close + focus return
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Body scroll lock + focus search on mobile sheet open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus search after a tick if mobile sheet
      if (isMobile && options.length > 8) {
        setTimeout(() => sheetSearchRef.current?.focus(), 100);
      }
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, isMobile, options.length]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Dropdown position for desktop portal (v0.12.7 — butir 5; T15-FIX bug 1)
  const [dropdownPos, setDropdownPos] = useState<{
    left: number;
    width: number;
    maxHeight: number;
    top?: number;
    bottom?: number;
  }>({ left: 0, width: 0, maxHeight: 256 });

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const computePos = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const PREFERRED_MAX = 256; // max-h-64
      const GAP = 4;
      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;
      const showBelow = spaceBelow >= Math.min(PREFERRED_MAX, spaceAbove) || spaceBelow >= spaceAbove;
      if (showBelow) {
        // Anchor TOP edge to trigger bottom — grows downward.
        setDropdownPos({
          top: rect.bottom + GAP,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.max(80, Math.min(PREFERRED_MAX, spaceBelow)),
        });
      } else {
        // T15-FIX bug 1: anchor BOTTOM edge to trigger top (no height guess) —
        // panel grows upward flush against the trigger, no floating gap.
        setDropdownPos({
          bottom: window.innerHeight - rect.top + GAP,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.max(80, Math.min(PREFERRED_MAX, spaceAbove)),
        });
      }
    };
    computePos();
    // Reposition or close on scroll/resize
    const handleScroll = (e: Event) => {
      // Jangan tutup bila scroll terjadi DI DALAM dropdown/sheet itu sendiri
      // (mis. daftar opsi panjang yang di-scroll saat mencari opsi) — hanya
      // tutup bila scroll terjadi di luar (halaman induk bergeser, sehingga
      // panel floating akan lepas dari posisi trigger).
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', computePos);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', computePos);
    };
  }, [open, isMobile]);

  const filteredOptions = searchQuery
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : options;

  const inputClass =
    'w-full rounded-md border border-aam-border px-3 py-2 text-sm outline-none focus:border-aam-green focus:ring-1 focus:ring-aam-green/30';

  const triggerClass = [
    inputClass,
    'text-left flex items-center justify-between cursor-pointer',
    disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-aam-green/50',
    className,
  ].join(' ');

  return (
    <>
      {/* Trigger button — looks like a select input */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={selectedOption ? 'text-aam-text' : 'text-aam-text-muted'}>
          {selectedLabel}
        </span>
        <span
          className="material-symbols-outlined text-aam-text-muted ml-2"
          style={{ fontSize: '1.25rem' }}
        >
          arrow_drop_down
        </span>
      </button>

      {/* Desktop: dropdown popover via PORTAL (v0.12.7 — butir 5) */}
      {open && !isMobile && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[10000] bg-white rounded-md border border-aam-border shadow-lg overflow-y-auto py-1 animate-fade-in"
          style={{
            ...(dropdownPos.top !== undefined ? { top: `${dropdownPos.top}px` } : {}),
            ...(dropdownPos.bottom !== undefined ? { bottom: `${dropdownPos.bottom}px` } : {}),
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            maxHeight: `${dropdownPos.maxHeight}px`,
          }}
          role="listbox"
        >
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={[
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors min-h-[40px]',
                option.value === value
                  ? 'bg-aam-green/10 text-aam-green font-medium'
                  : 'text-aam-text hover:bg-gray-50',
              ].join(' ')}
              role="option"
              aria-selected={option.value === value}
            >
              <span className="flex-1">{option.label}</span>
              {option.value === value && (
                <span
                  className="material-symbols-outlined text-aam-green"
                  style={{ fontSize: '1.125rem' }}
                >
                  check
                </span>
              )}
            </button>
          ))}
          {filteredOptions.length === 0 && (
            <p className="px-3 py-2 text-sm text-aam-text-muted">
              Tidak ada opsi cocok
            </p>
          )}
        </div>,
        document.body,
      )}

      {/* Mobile: bottom sheet (portal) */}
      {open && isMobile &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in md:hidden"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            />
            <div
              ref={sheetRef}
              className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up md:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Sheet title */}
              <div className="px-5 pb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-aam-text">{label}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="text-aam-text-muted hover:text-aam-text p-1 -mr-1"
                  aria-label="Tutup"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                    close
                  </span>
                </button>
              </div>

              {/* Search (if >8 options) */}
              {options.length > 8 && (
                <div className="px-4 pb-2">
                  <input
                    ref={sheetSearchRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari..."
                    className={inputClass}
                  />
                </div>
              )}

              {/* Options list */}
              <div className="px-2 pb-4">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={[
                      'w-full flex items-center gap-3 px-4 text-sm text-left transition-colors rounded-md min-h-[48px]',
                      option.value === value
                        ? 'bg-aam-green/10 text-aam-green font-medium'
                        : 'text-aam-text hover:bg-gray-50',
                    ].join(' ')}
                    role="option"
                    aria-selected={option.value === value}
                  >
                    <span className="flex-1">{option.label}</span>
                    {option.value === value && (
                      <span
                        className="material-symbols-outlined text-aam-green"
                        style={{ fontSize: '1.25rem' }}
                      >
                        check
                      </span>
                    )}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <p className="px-4 py-3 text-sm text-aam-text-muted">
                    Tidak ada opsi cocok
                  </p>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
