import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export interface PageMenuAction {
  key: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  onClick: () => void;
  /** ID HTML untuk button — dipakai e2e locator. */
  id?: string;
}

export interface PageMenuLink {
  key: string;
  label: string;
  path: string;
  icon?: string;
  badge?: number | string;
}

interface PageMenuProps {
  /** Aksi halaman — primary action tampil inline di desktop; sisanya di ⋮ */
  actions?: PageMenuAction[];
  /** Halaman terkait — link ke sub-halaman ber-route (BUKA HALAMAN). */
  links?: PageMenuLink[];
  /** Optional title shown on mobile sheet top (default: "Menu"). */
  menuTitle?: string;
}

/**
 * <PageMenu> — SATU menu ⋮ per halaman (KEPUTUSAN USER v0.10.4).
 *
 * v0.12.1 — Aturan SATU tombol aksi + ⋮ ADAPTIF:
 * - DESKTOP (≥md): primary action (variant='primary' atau action pertama)
 *   tampil sebagai tombol inline; SEMUA aksi lain + links masuk ⋮ DROPDOWN
 *   (popover anchored to ⋮ button, ~240-280px; items ≥40px; destructive
 *   merah paling bawah; tutup via klik-luar/Esc; fokus kembali ke tombol ⋮).
 * - MOBILE (<md): SATU tombol ⋮ (≥44×44) → BOTTOM SHEET berisi dua kelompok:
 *   1) AKSI — semua tombol (primary hijau; destruktif paling bawah merah);
 *   2) BUKA HALAMAN — link ke sub-halaman + badge.
 *
 * v0.12.8 HOTFIX:
 * - Butir 1: outside-click handler whitelist sheetRef (mobile sheet tidak tertutup)
 * - Butir 2: split desktopTriggerRef & mobileTriggerRef (ref tidak tertimpa)
 * - Butir 3: useNavigate() react-router (bukan window.location.assign)
 * - Butir 5: desktop dropdown via PORTAL ke document.body (tidak terpangkas Card overflow-hidden)
 *
 * Pengecualian §15.0: Simpan/Batal form, Kembali/Lanjut wizard, tombol
 * tunggal dalam kartu — bukan deretan aksi header, tidak masuk PageMenu.
 */
export function PageMenu({ actions = [], links = [], menuTitle = 'Menu' }: PageMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Butir 2: split refs — desktop & mobile ⋮ buttons are separate elements
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Track viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Helper: focus the currently visible trigger (butir 2)
  const focusVisibleTrigger = () => {
    if (isMobile) {
      mobileTriggerRef.current?.focus();
    } else {
      desktopTriggerRef.current?.focus();
    }
  };

  // Determine primary action (first 'primary' variant or first action)
  const primaryAction =
    actions.find((a) => a.variant === 'primary') ?? actions[0] ?? null;
  const overflowActions = actions.filter((a) => a !== primaryAction);
  const hasOverflow = overflowActions.length > 0 || links.length > 0;

  // Body scroll lock + Esc for mobile sheet
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Esc to close + focus return (butir 2: focus visible trigger)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        focusVisibleTrigger();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, isMobile]);

  // Outside click — whitelist: trigger (visible one), desktop dropdown, AND mobile sheet (butir 1)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Ignore clicks on either trigger (desktop or mobile)
      if (desktopTriggerRef.current?.contains(target)) return;
      if (mobileTriggerRef.current?.contains(target)) return;
      // Ignore clicks inside desktop dropdown
      if (dropdownRef.current?.contains(target)) return;
      // Ignore clicks inside mobile bottom sheet (butir 1 FIX)
      if (sheetRef.current?.contains(target)) return;
      // Otherwise close
      setOpen(false);
      focusVisibleTrigger();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile]);

  // Dropdown position for desktop portal (v0.12.7 — butir 5)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 256 });

  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const computePos = () => {
      const trigger = desktopTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dropdownHeight = 320; // approx max height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showBelow = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;
      const width = Math.max(rect.width, 256);
      // Keep dropdown within viewport horizontally
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setDropdownPos({
        top: showBelow ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
        left: Math.max(8, left),
        width,
      });
    };
    computePos();
    // Close on scroll to avoid floating panel detaching from trigger
    const handleScroll = () => {
      setOpen(false);
      focusVisibleTrigger();
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, isMobile]);

  // Sort overflow actions: danger at bottom
  const sortedOverflow = [...overflowActions].sort((a, b) => {
    if (a.variant === 'danger' && b.variant !== 'danger') return 1;
    if (a.variant !== 'danger' && b.variant === 'danger') return -1;
    return 0;
  });

  return (
    <>
      {/* Desktop: primary action inline + ⋮ dropdown for overflow */}
      <div className="hidden md:flex items-center gap-2">
        {primaryAction && (
          <button
            key={primaryAction.key}
            id={primaryAction.id}
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className={[
              'inline-flex items-center gap-1.5 text-sm font-medium rounded-md px-4 py-2.5 transition-colors min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed',
              primaryAction.variant === 'primary'
                ? 'bg-aam-green text-white hover:bg-aam-green-dark'
                : primaryAction.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-aam-text border border-aam-border bg-white hover:bg-gray-50',
            ].join(' ')}
          >
            {primaryAction.icon && (
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {primaryAction.icon}
              </span>
            )}
            {primaryAction.label}
          </button>
        )}
        {hasOverflow && (
          <div className="relative">
            <button
              ref={desktopTriggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menu halaman"
              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] text-aam-text-muted hover:text-aam-text hover:bg-gray-100 rounded-md transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                more_vert
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile: SATU tombol ⋮ → bottom sheet */}
      <div className="md:hidden">
        <button
          ref={mobileTriggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu halaman"
          className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-aam-text-muted hover:text-aam-text hover:bg-gray-100 rounded-md transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
            more_vert
          </span>
        </button>
      </div>

      {/* Desktop: dropdown via PORTAL (v0.12.7 — butir 5) */}
      {open && !isMobile && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[10000] bg-white rounded-md border border-aam-border shadow-lg py-1 animate-fade-in"
          style={{
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
        >
          {sortedOverflow.length > 0 && (
            <div className="mb-1">
              {sortedOverflow.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    if (action.disabled) return;
                    action.onClick();
                    setOpen(false);
                    desktopTriggerRef.current?.focus();
                  }}
                  disabled={action.disabled}
                  className={[
                    'w-full flex items-center gap-3 px-4 text-sm text-left transition-colors min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed',
                    action.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-aam-text hover:bg-gray-50',
                  ].join(' ')}
                >
                  {action.icon && (
                    <span
                      className={[
                        'material-symbols-outlined',
                        action.variant === 'danger' ? 'text-red-600' : 'text-aam-text-muted',
                      ].join(' ')}
                      style={{ fontSize: '1.125rem' }}
                    >
                      {action.icon}
                    </span>
                  )}
                  <span className="flex-1">{action.label}</span>
                </button>
              ))}
            </div>
          )}
          {links.length > 0 && (
            <div>
              {sortedOverflow.length > 0 && (
                <div className="my-1 border-t border-aam-border" />
              )}
              <p className="px-4 py-1.5 text-[10px] font-semibold text-aam-text-muted uppercase tracking-wider">
                Buka Halaman
              </p>
              {links.map((link) => (
                <a
                  key={link.key}
                  href={link.path}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    navigate(link.path);
                  }}
                  className="w-full flex items-center gap-3 px-4 text-sm text-left transition-colors min-h-[40px] text-aam-text hover:bg-gray-50"
                >
                  {link.icon && (
                    <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                      {link.icon}
                    </span>
                  )}
                  <span className="flex-1">{link.label}</span>
                  {link.badge !== undefined && link.badge !== '' && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-aam-yellow text-[10px] font-bold text-yellow-900">
                      {link.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* Mobile: bottom sheet (portal) */}
      {open && isMobile && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in md:hidden"
            onClick={() => {
              setOpen(false);
              mobileTriggerRef.current?.focus();
            }}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={menuTitle}
            className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Sheet title */}
            <div className="px-5 pb-2">
              <p className="text-xs text-aam-text-muted">{menuTitle}</p>
            </div>

            <div className="px-2 pb-4">
              {/* AKSI group */}
              {actions.length > 0 && (
                <div className="mb-2">
                  <p className="px-4 py-2 text-[10px] font-semibold text-aam-text-muted uppercase tracking-wider">
                    Aksi
                  </p>
                  {actions.map((action) => {
                    const isPrimary = action.variant === 'primary';
                    const isDanger = action.variant === 'danger';
                    const isFirst = actions.indexOf(action) === 0;
                    const highlightPrimary =
                      isPrimary || (isFirst && !isDanger);

                    return (
                      <button
                        key={action.key}
                        id={action.id}
                        type="button"
                        onClick={() => {
                          if (action.disabled) return;
                          action.onClick();
                          setOpen(false);
                          mobileTriggerRef.current?.focus();
                        }}
                        disabled={action.disabled}
                        className={[
                          'w-full flex items-center gap-3 px-4 text-sm text-left transition-colors rounded-md min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed',
                          highlightPrimary && !isDanger
                            ? 'bg-aam-green/10 text-aam-green font-medium hover:bg-aam-green/15'
                            : isDanger
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-aam-text hover:bg-gray-50',
                        ].join(' ')}
                      >
                        {action.icon && (
                          <span
                            className={[
                              'material-symbols-outlined',
                              highlightPrimary && !isDanger
                                ? 'text-aam-green'
                                : isDanger
                                  ? 'text-red-600'
                                  : 'text-aam-text-muted',
                            ].join(' ')}
                            style={{ fontSize: '1.125rem' }}
                          >
                            {action.icon}
                          </span>
                        )}
                        <span className="flex-1">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* BUKA HALAMAN group */}
              {links.length > 0 && (
                <div>
                  {actions.length > 0 && (
                    <div className="my-2 border-t border-aam-border" />
                  )}
                  <p className="px-4 py-2 text-[10px] font-semibold text-aam-text-muted uppercase tracking-wider">
                    Buka Halaman
                  </p>
                  {links.map((link) => (
                    <a
                      key={link.key}
                      href={link.path}
                      onClick={(e) => {
                        e.preventDefault();
                        setOpen(false);
                        navigate(link.path);
                      }}
                      className="w-full flex items-center gap-3 px-4 text-sm text-left transition-colors min-h-[48px] rounded-md text-aam-text hover:bg-gray-50"
                    >
                      {link.icon && (
                        <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                          {link.icon}
                        </span>
                      )}
                      <span className="flex-1">{link.label}</span>
                      {link.badge !== undefined && link.badge !== '' && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-aam-yellow text-[10px] font-bold text-yellow-900">
                          {link.badge}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1.125rem' }}>
                        chevron_right
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
