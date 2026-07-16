import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useCachedList — stale-while-revalidate hook (§12.16c).
 *
 * - Kembali ke halaman → render INSTAN dari cache lalu revalidasi diam-diam
 * - Setiap mutasi yang memanggil invalidateCache(prefix) akan menyegarkan data
 * - Cache dibatasi LRU ±50 entri, TTL 60 dtk (di client.ts)
 *
 * @param fetcher  Fungsi async yang mengembalikan { data, total, page, limit }
 * @param cacheKey Kunci cache unik (biasanya URL lengkap dengan query params)
 * @param deps     Dependency array — re-fetch saat berubah
 */
export function useCachedList<T>(
  fetcher: () => Promise<{ data: T[]; total: number; page: number; limit: number }>,
  cacheKey: string,
  deps: any[] = [],
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      setData(result.data);
      setTotal(result.total);
      setPage(result.page);
      setLimit(result.limit);
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err?.message || 'Gagal memuat data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { data, total, page, limit, loading, error, refresh };
}
