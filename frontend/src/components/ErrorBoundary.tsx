import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — menangkap error chunk-load (React.lazy gagal).
 * Menampilkan panel "Gagal memuat halaman" + tombol "Muat Ulang".
 * (§12.15b — BUKAN layar putih/spinner abadi)
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Loading CSS chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      console.warn('[AAMAPP] Chunk load gagal:', error.message);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="max-w-sm text-center">
            <span
              className="material-symbols-outlined text-aam-text-muted mb-3"
              style={{ fontSize: '3rem' }}
            >
              cloud_off
            </span>
            <h2 className="text-lg font-heading font-semibold text-aam-text mb-2">
              Gagal memuat halaman
            </h2>
            <p className="text-sm text-aam-text-muted mb-5">
              Halaman tidak dapat dimuat. Ini mungkin terjadi setelah pembaruan
              aplikasi. Coba muat ulang halaman.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-md bg-aam-green px-5 py-2.5 text-sm font-medium text-white hover:bg-aam-green-dark transition-colors min-h-[44px]"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                refresh
              </span>
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
