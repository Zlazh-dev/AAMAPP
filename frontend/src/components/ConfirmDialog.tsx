import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Komponen <ConfirmDialog> adaptif:
 * - Desktop: modal kecil di tengah layar
 * - Mobile (≤768px): bottom sheet
 * - Render via portal ke document.body agar tidak terpotong overflow/transform ancestor
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (open) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      setTimeout(() => confirmRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Esc to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div
      className={[
        'flex flex-col gap-4',
        isMobile ? 'px-5 pb-5 pt-2' : 'p-5',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {variant === 'danger' && (
          <span
            className="material-symbols-outlined text-red-600 flex-shrink-0"
            style={{ fontSize: '1.5rem' }}
          >
            warning
          </span>
        )}
        <div className="flex-1">
          <h3 className="text-base font-semibold text-aam-text">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-aam-text-muted">{description}</p>
          )}
        </div>
      </div>
      <div
        className={[
          'flex gap-2',
          isMobile ? 'flex-col-reverse' : 'justify-end',
        ].join(' ')}
      >
        <Button
          variant="secondary"
          size={isMobile ? 'lg' : 'md'}
          onClick={onCancel}
          disabled={loading}
          className={isMobile ? 'w-full' : ''}
        >
          {cancelLabel}
        </Button>
        <Button
          ref={confirmRef}
          size={isMobile ? 'lg' : 'md'}
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={loading}
          className={isMobile ? 'w-full' : ''}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  return createPortal(
    <>
      <style>{`body { overflow: hidden !important; }`}</style>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 animate-fade-in"
        onClick={() => !loading && onCancel()}
      />

      {/* Panel — desktop modal centered */}
      {!isMobile && (
        <div
          className="fixed z-[10000] bg-white rounded-lg shadow-2xl w-[calc(100%-32px)] max-w-md animate-fade-in"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {content}
        </div>
      )}

      {/* Panel — mobile bottom sheet */}
      {isMobile && (
        <div
          className="fixed z-[10000] left-0 right-0 bottom-0 bg-white rounded-t-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {content}
        </div>
      )}
    </>,
    document.body,
  );
}
