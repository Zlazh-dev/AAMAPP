import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface FormDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
  /** Lebar max modal desktop (default: max-w-md) */
  maxWidth?: string;
  /** ID untuk tombol submit — dipakai e2e locator. */
  submitId?: string;
}

/**
 * `<FormDrawer>` — form adaptif v0.12.x:
 * - Desktop (≥md): modal sentral dengan overlay + trap focus
 * - Mobile (<md): bottom sheet dengan drag handle
 *
 * Gunakan sebagai ganti bottom sheet inline (pattern lama).
 * Submit button di footer — tidak perlu tombol di dalam children.
 */
export function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel = 'Simpan',
  submitting = false,
  submitDisabled = false,
  children,
  maxWidth = 'max-w-md',
  submitId,
}: FormDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Tutup dengan Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll saat terbuka
  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {!isMobile ? (
        /* Desktop: modal sentral */
        <div
          className="flex fixed inset-0 z-50 items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="form-drawer-title"
        >
          <div
            ref={contentRef}
            className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col`}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-aam-border flex-shrink-0">
              <h3 id="form-drawer-title" className="font-bold text-aam-text text-base">{title}</h3>
              <button
                onClick={onClose}
                className="text-aam-text-muted hover:text-aam-text transition-colors rounded-md p-1 -mr-1"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
            {onSubmit && (
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-aam-border flex-shrink-0">
                <Button variant="secondary" onClick={onClose}>Batal</Button>
                <Button onClick={onSubmit} disabled={submitting || submitDisabled} id={submitId ?? 'btn-form-drawer-submit'}>
                  {submitting ? 'Menyimpan...' : submitLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mobile: bottom sheet */
        <div
          className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]"
          aria-modal="true"
          role="dialog"
          aria-labelledby="form-drawer-title-mobile"
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-aam-border flex-shrink-0">
            <h3 id="form-drawer-title-mobile" className="font-bold text-aam-text text-base">{title}</h3>
            <button onClick={onClose} className="text-aam-text-muted" aria-label="Tutup">
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {onSubmit && (
            <div className="flex gap-3 px-5 py-4 border-t border-aam-border flex-shrink-0">
              <Button variant="secondary" onClick={onClose} className="flex-1">Batal</Button>
              <Button onClick={onSubmit} disabled={submitting || submitDisabled} className="flex-1" id={submitId ? `${submitId}-mobile` : undefined}>
                {submitting ? 'Menyimpan...' : submitLabel}
              </Button>
            </div>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
