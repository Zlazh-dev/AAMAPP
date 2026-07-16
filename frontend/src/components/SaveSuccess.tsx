import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface SaveSuccessState {
  entityName: string;
  mode: 'create' | 'edit';
  entityId?: number | string;
}

interface SaveSuccessProps {
  /** Label entitas, mis. "Guru", "Siswa", "Kelas", "Akun" */
  entityLabel: string;
  /** Path untuk form tambah baru (mode=create) */
  addAgainPath: string;
  /** Path untuk daftar entitas */
  listPath: string;
  /** Path pattern untuk detail entitas (mode=edit) — gunakan {id} sebagai placeholder, mis. "/admin/orang/guru/{id}" */
  detailPathPattern?: string;
}

/**
 * `<SaveSuccess>` — halaman sukses setelah simpan (v0.12.1).
 *
 * - Navigasi harus REPLACE + state { entityName, mode, entityId }
 * - Jika state tidak ada (akses langsung/refresh/bookmark) → redirect ke listPath
 * - Tombol per §15.0:
 *   TAMBAH → "Tambah <Entitas> Lagi" (primer) + "Lihat Daftar" (sekunder)
 *   EDIT   → "Edit Data Lain" (primer, → daftar) + "Lihat Detail" (sekunder)
 */
export function SaveSuccess({
  entityLabel,
  addAgainPath,
  listPath,
  detailPathPattern,
}: SaveSuccessProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as SaveSuccessState | null;

  // Tanpa state lengkap → redirect ke daftar
  if (!state || !state.entityName || !state.mode) {
    navigate(listPath, { replace: true });
    return null;
  }

  const isCreate = state.mode === 'create';

  // Build detail path from pattern + entityId
  const detailPath = detailPathPattern && state.entityId
    ? detailPathPattern.replace('{id}', String(state.entityId))
    : undefined;

  // Edit mode but no detailPath or entityId → redirect to list
  if (!isCreate && !detailPath) {
    navigate(listPath, { replace: true });
    return null;
  }

  const message = isCreate
    ? `${entityLabel} '${state.entityName}' berhasil ditambahkan`
    : `Perubahan data ${entityLabel.toLowerCase()} '${state.entityName}' tersimpan`;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-md mx-auto text-center">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-aam-green/10 flex items-center justify-center mb-6">
        <span
          className="material-symbols-outlined text-aam-green"
          style={{ fontSize: '3rem' }}
        >
          check_circle
        </span>
      </div>

      {/* Message */}
      <p className="text-lg font-heading font-semibold text-aam-text mb-2">
        {message}
      </p>
      <p className="text-sm text-aam-text-muted mb-8">
        Data telah tersimpan dengan aman.
      </p>

      {/* Buttons — vertical, full-width */}
      <div className="w-full space-y-3">
        {isCreate ? (
          <>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon="add"
              onClick={() => navigate(addAgainPath)}
            >
              Tambah {entityLabel} Lagi
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              icon="list"
              onClick={() => navigate(listPath)}
            >
              Lihat Daftar {entityLabel}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon="edit"
              onClick={() => navigate(listPath)}
            >
              Edit Data Lain
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              icon="visibility"
              onClick={() => navigate(detailPath!)}
            >
              Lihat Detail
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
