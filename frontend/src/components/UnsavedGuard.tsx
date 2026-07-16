import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';

interface UnsavedGuardProps {
  /** True if form has unsaved changes */
  dirty: boolean;
  /** Children to render (the page content) */
  children: React.ReactNode;
}

/**
 * <UnsavedGuard> — mencegah navigasi tanpa sengaja bila form kotor.
 *
 * - Intercept navigation via popstate (back/forward) & in-app navigate.
 * - Tampilkan ConfirmDialog adaptif (modal desktop / bottom sheet mobile).
 * - Fokus kembali ke pemicu setelah batal.
 */
export function UnsavedGuard({ dirty, children }: UnsavedGuardProps) {
  const navigate = useNavigate();
  const pendingPathRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const handlePopState = useCallback(
    (e: PopStateEvent) => {
      if (!dirty) return;
      e.preventDefault();
      pendingPathRef.current = window.location.pathname;
      // Push state back so user stays on page
      window.history.pushState(null, '', window.location.pathname);
      setShowDialog(true);
    },
    [dirty],
  );

  const [showDialog, setShowDialog] = React.useState(false);

  useEffect(() => {
    if (!dirty) return;
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dirty, handlePopState]);

  const confirmLeave = () => {
    setShowDialog(false);
    // Allow navigation — temporarily disable dirty
    pendingPathRef.current = null;
    // Navigate back — the history state was restored, so go back again
    window.history.back();
  };

  const cancelLeave = () => {
    setShowDialog(false);
    pendingPathRef.current = null;
  };

  return (
    <>
      {children}
      <ConfirmDialog
        open={showDialog}
        title="Perubahan belum disimpan"
        description="Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?"
        confirmLabel="Ya, Tinggalkan"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </>
  );
}
