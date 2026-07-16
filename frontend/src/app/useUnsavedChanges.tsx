import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface UseUnsavedChangesOptions {
  /** Pesan judul dialog (default: "Perubahan belum disimpan") */
  title?: string;
  /** Pesan deskripsi dialog */
  description?: string;
}

/**
 * Hook bersama untuk mencegah navigasi saat form punya perubahan belum disimpan.
 *
 * - Navigasi in-app (klik menu, BackLink, navigate()): diblokir via
 *   `useBlocker` dari react-router data router → tampilkan `<ConfirmDialog>`
 *   adaptif (desktop: modal tengah / mobile: bottom sheet) dengan tombol
 *   "Lanjut Mengedit" (batal) & "Buang Perubahan" (lanjut navigasi).
 * - Refresh / tutup tab: `beforeunload` (browser memaksa dialog native di sini
 *   — satu-satunya pengecualian yang wajar per §14.8).
 *
 * MENGEMBALIKAN: { dirty, setDirty, guard }
 * - dirty: boolean state (untuk render kondisional jika perlu)
 * - setDirty: (v: boolean) => void — SET SINKRON ke ref + state
 * - guard: elemen <ConfirmDialog> — render di tempat hook dipanggil
 *
 * Cara pakai:
 *   const { dirty, setDirty, guard } = useUnsavedChanges();
 *   // setDirty(true) saat user mengubah input
 *   // setDirty(false) setelah save berhasil, SEBELUM navigate()
 *   // di JSX paling bawah: {guard}
 *
 * Penting: selalu panggil setDirty(false) SEBELUM navigate() di handler save.
 * Ref di-update sinkron sehingga blocker tidak melihat dirty lama.
 */
export function useUnsavedChanges(
  initialDirty: boolean = false,
  options: UseUnsavedChangesOptions = {},
) {
  const { title = 'Perubahan belum disimpan', description } = options;

  // Ref holds the LATEST dirty value synchronously — updated in setDirty
  // before any re-render, so useBlocker's function always sees the truth.
  const dirtyRef = useRef(initialDirty);
  const [dirty, setDirtyState] = useState(initialDirty);

  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirtyState(value);
  }, []);

  // useBlocker with a function callback reads dirtyRef.current — always
  // up-to-date even when setDirty(false) + navigate() happen in the same
  // tick (ref is set synchronously before navigate triggers blocker check).
  const blocker = useBlocker(() => dirtyRef.current);

  const showDialog = blocker.state === 'blocked';

  const handleDiscard = () => {
    if (blocker.state === 'blocked') blocker.proceed();
  };

  const handleKeepEditing = () => {
    if (blocker.state === 'blocked') blocker.reset();
  };

  // beforeunload for refresh / close tab only
  useEffect(() => {
    if (!dirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const guard = (
    <ConfirmDialog
      open={showDialog}
      title={title}
      description={description}
      confirmLabel="Buang Perubahan"
      cancelLabel="Lanjut Mengedit"
      variant="danger"
      onConfirm={handleDiscard}
      onCancel={handleKeepEditing}
    />
  );

  return { dirty, setDirty, guard };
}
