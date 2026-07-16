import React, { useState, useRef, useCallback } from 'react';
import { api, ApiError } from '../api/client';

interface ImageUploaderProps {
  /** Current image URL (empty = no image) */
  value: string;
  /** Callback when upload succeeds — receives the new URL */
  onChange: (url: string) => void;
  /** Label below the uploader */
  label?: string;
  /** Icon watermark for the card */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * <ImageUploader> — drag&drop or click → POST /api/admin/uploads → preview.
 *
 * - Shows circular preview if value exists, with delete button
 * - Drag & drop zone with click fallback
 * - Loading spinner during upload
 * - Error message inline
 * - Touch targets ≥44px
 */
export function ImageUploader({
  value,
  onChange,
  label = 'Foto',
  icon = 'photo_camera',
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran file maksimal 5MB');
        return;
      }
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setError('Format harus JPG, PNG, atau WEBP');
        return;
      }
      setUploading(true);
      try {
        const res = await api.adminUploadFile(file);
        onChange(res.url);
      } catch (err: any) {
        setError(
          err instanceof ApiError
            ? err.body?.message || 'Gagal mengunggah'
            : 'Gagal mengunggah',
        );
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled],
  );

  return (
    <div className="flex flex-col items-center">
      {/* Preview / Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={[
          'relative w-32 h-32 rounded-full border-2 flex items-center justify-center overflow-hidden cursor-pointer transition-colors',
          dragOver
            ? 'border-aam-green bg-aam-green/5'
            : 'border-aam-border bg-gray-50 hover:border-aam-green/40',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '1.5rem' }}>
                  progress_activity
                </span>
              </div>
            )}
          </>
        ) : uploading ? (
          <span className="material-symbols-outlined animate-spin text-aam-green" style={{ fontSize: '1.5rem' }}>
            progress_activity
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1 text-aam-text-muted">
            <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>
              {icon}
            </span>
            <span className="text-[10px] text-center px-2">Klik atau seret foto</span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ''; // reset for re-upload
        }}
      />

      {/* Label */}
      <p className="mt-2 text-xs font-medium text-aam-text-muted">{label}</p>

      {/* Delete button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
          className="mt-1 text-xs text-red-600 hover:text-red-700 min-h-[44px] px-2"
        >
          Hapus Foto
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
