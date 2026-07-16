import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FilterBarFieldBase {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date';
  placeholder?: string;
}

interface FilterBarSelectField extends FilterBarFieldBase {
  type: 'select';
  options: { value: string; label: string }[];
}

interface FilterBarTextField extends FilterBarFieldBase {
  type: 'text';
}

interface FilterBarDateField extends FilterBarFieldBase {
  type: 'date';
}

export type FilterBarField = FilterBarSelectField | FilterBarTextField | FilterBarDateField;

export type FilterValues = Record<string, string>;

interface FilterBarProps {
  /** Search text (full-width on mobile). */
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  /** Filter fields (applied via bottom sheet on mobile, inline on desktop). */
  filters: FilterBarField[];
  values: FilterValues;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  /** Optional extra right-side controls (desktop inline). */
  rightExtras?: React.ReactNode;
  /** Optional title for mobile filter sheet. */
  sheetTitle?: string;
}

function getActiveFilterCount(filters: FilterBarField[], values: FilterValues): number {
  return filters.filter((f) => {
    const v = values[f.key];
    return v !== undefined && v !== '' && v !== '__all__' && v !== 'all';
  }).length;
}

/**
 * <FilterBar> — pengganti native select/search jejer (T10.7 v0.10.4).
 *
 * - DESKTOP (≥md): baris horizontal dengan search input + field filter inline
 *   + right-extras (mis. PageMenu).
 * - MOBILE (<md): search full-width di baris 1 + tombol "Filter (n)" di baris 2
 *   → BOTTOM SHEET berisi semua kontrol filter + tombol Terapkan & Reset.
 *   Tombol Reset disembunyikan bila onReset tak diberikan.
 */
export function FilterBar({
  search,
  filters,
  values,
  onChange,
  onReset,
  rightExtras,
  sheetTitle = 'Filter',
}: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterValues>(values);

  const activeCount = getActiveFilterCount(filters, values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  // Body scroll lock
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

  const handleApply = () => {
    // Commit each field
    for (const f of filters) {
      const v = draft[f.key] ?? '';
      const prev = values[f.key] ?? '';
      if (v !== prev) onChange(f.key, v);
    }
    setOpen(false);
  };

  const handleReset = () => {
    const cleared: FilterValues = {};
    for (const f of filters) cleared[f.key] = '';
    setDraft(cleared);
    for (const f of filters) {
      if (values[f.key] !== '' && values[f.key] !== undefined) {
        onChange(f.key, '');
      }
    }
    if (onReset) onReset();
    setOpen(false);
  };

  return (
    <>
      {/* DESKTOP (≥md): horizontal bar */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {search && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aam-text-muted pointer-events-none"
              style={{ fontSize: '1.125rem' }}
            >
              search
            </span>
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? 'Cari...'}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-aam-border rounded-md bg-white text-aam-text placeholder-aam-text-muted focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[44px]"
            />
          </div>
        )}
        {filters.map((f) => {
          if (f.type === 'select') {
            return (
              <select
                key={f.key}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="text-sm px-3 py-2.5 border border-aam-border rounded-md bg-white text-aam-text focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[44px]"
                aria-label={f.label}
              >
                {f.placeholder ? (
                  <option value="">{f.placeholder}</option>
                ) : (
                  <option value="">Semua</option>
                )}
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }
          if (f.type === 'date') {
            return (
              <input
                key={f.key}
                type="date"
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
                aria-label={f.label}
                className="text-sm px-3 py-2.5 border border-aam-border rounded-md bg-white text-aam-text focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[44px]"
              />
            );
          }
          // text
          return (
            <input
              key={f.key}
              type="text"
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.placeholder ?? f.label}
              aria-label={f.label}
              className="text-sm px-3 py-2.5 border border-aam-border rounded-md bg-white text-aam-text placeholder-aam-text-muted focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[44px]"
            />
          );
        })}
        {rightExtras}
      </div>

      {/* MOBILE (<md): search full-width + filter button */}
      <div className="md:hidden space-y-2">
        {search && (
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aam-text-muted pointer-events-none"
              style={{ fontSize: '1.125rem' }}
            >
              search
            </span>
            <input
              type="text"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? 'Cari...'}
              className="w-full pl-10 pr-3 py-3 text-sm border border-aam-border rounded-md bg-white text-aam-text placeholder-aam-text-muted focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[48px]"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-aam-text border border-aam-border bg-white hover:bg-gray-50 rounded-md transition-colors min-h-[44px]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
              tune
            </span>
            Filter
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-aam-green text-white text-[10px] font-bold">
                {activeCount}
              </span>
            )}
          </button>
          {rightExtras}
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {open && createPortal(
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
            {/* Title */}
            <div className="px-5 pb-3">
              <h2 className="text-base font-semibold text-aam-text">{sheetTitle}</h2>
              <p className="text-xs text-aam-text-muted mt-0.5">
                Atur filter untuk mempersempit daftar
              </p>
            </div>

            {/* Fields */}
            <div className="px-5 space-y-4 pb-4">
              {filters.map((f) => {
                const draftVal = draft[f.key] ?? '';
                return (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-aam-text-muted mb-1.5">
                      {f.label}
                    </label>
                    {f.type === 'select' && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDraft((d) => ({ ...d, [f.key]: '' }))}
                          className={[
                            'px-3 py-2 rounded-md text-sm transition-colors min-h-[40px]',
                            draftVal === ''
                              ? 'bg-aam-green text-white font-medium'
                              : 'bg-white border border-aam-border text-aam-text hover:bg-gray-50',
                          ].join(' ')}
                        >
                          Semua
                        </button>
                        {f.options.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, [f.key]: o.value }))}
                            className={[
                              'px-3 py-2 rounded-md text-sm transition-colors min-h-[40px]',
                              draftVal === o.value
                                ? 'bg-aam-green text-white font-medium'
                                : 'bg-white border border-aam-border text-aam-text hover:bg-gray-50',
                            ].join(' ')}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {f.type === 'text' && (
                      <input
                        type="text"
                        value={draftVal}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                        placeholder={f.placeholder ?? f.label}
                        className="w-full text-sm px-3 py-3 border border-aam-border rounded-md bg-white text-aam-text placeholder-aam-text-muted focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[48px]"
                      />
                    )}
                    {f.type === 'date' && (
                      <input
                        type="date"
                        value={draftVal}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                        }
                        className="w-full text-sm px-3 py-3 border border-aam-border rounded-md bg-white text-aam-text focus:outline-none focus:ring-2 focus:ring-aam-green/20 focus:border-aam-green min-h-[48px]"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 bg-white border-t border-aam-border px-4 pt-3 pb-4 flex items-center gap-2">
              {onReset && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 text-sm font-medium text-aam-text-muted hover:text-aam-text hover:bg-gray-100 rounded-md transition-colors min-h-[48px]"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-aam-green hover:bg-aam-green-dark rounded-md transition-colors min-h-[48px]"
              >
                Terapkan
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
