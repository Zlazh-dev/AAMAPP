import React from 'react';

/** Definisi satu kolom tabel. */
export interface ColumnDef<T> {
  /** Judul header kolom. */
  header: string;
  /** Lebar kolom opsional (e.g. 'w-24', '12%'). */
  width?: string;
  /** Alignment konten — default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** Render cell untuk baris. Return string atau ReactNode. */
  cell: (row: T, rowIndex: number) => React.ReactNode;
  /** Class tambahan untuk header cell. */
  headerClass?: string;
  /** Class tambahan untuk data cell. */
  cellClass?: string;
}

interface TableProps<T> {
  /** Definisi kolom. */
  columns: ColumnDef<T>[];
  /** Data baris. */
  data: T[];
  /** Key unik per baris. */
  rowKey: (row: T, index: number) => string | number;
  /** Pesan saat tidak ada data. */
  emptyMessage?: string;
  /** Class tambahan untuk wrapper. */
  className?: string;
  /** Aktifkan striping baris genap. Default true. */
  striped?: boolean;
  /** Aktifkan hover highlight. Default true. */
  hoverable?: boolean;
  /** Ukuran teks: 'sm' | 'xs'. Default 'sm'. */
  size?: 'sm' | 'xs';
  /** Callback klik baris opsional. */
  onRowClick?: (row: T) => void;
  /** ID untuk elemen wrapper (untuk e2e). */
  id?: string;
}

const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/**
 * `<Table>` reusable — tabel data bergaya konsisten.
 * Responsif: overflow-x-auto, ukuran font konsisten, striping, hover.
 *
 * §6 (CARD-DESIGN-STANDARD.md): token fix bg-aam-page, text-aam-text-muted,
 * sel px-3 py-2.5. Table = surface sendiri — JANGAN bungkus dalam <Card>.
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'Tidak ada data.',
  className = '',
  striped = true,
  hoverable = true,
  size = 'sm',
  onRowClick,
  id,
}: TableProps<T>) {
  const textSize = size === 'xs' ? 'text-xs' : 'text-sm';

  return (
    <div className={`overflow-x-auto rounded-md border border-aam-border ${className}`} id={id}>
      <table className={`w-full ${textSize}`}>
        <thead>
          <tr className="bg-aam-page border-b border-aam-border">
            {columns.map((col, ci) => (
              <th
                key={ci}
                className={[
                  'px-3 py-2.5 font-semibold text-aam-text-muted uppercase tracking-wide text-xs',
                  ALIGN_CLASS[col.align ?? 'left'],
                  col.headerClass ?? '',
                  col.width ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-aam-text-muted italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => (
              <tr
                key={rowKey(row, ri)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'border-b border-aam-border last:border-0',
                  striped && ri % 2 === 1 ? 'bg-aam-page/50' : 'bg-white',
                  hoverable ? 'hover:bg-aam-green/5 transition-colors' : '',
                  onRowClick ? 'cursor-pointer' : '',
                ].join(' ')}
              >
                {columns.map((col, ci) => (
                  <td
                    key={ci}
                    className={[
                      'px-3 py-2.5 text-aam-text',
                      ALIGN_CLASS[col.align ?? 'left'],
                      col.cellClass ?? '',
                    ].join(' ')}
                  >
                    {col.cell(row, ri)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
