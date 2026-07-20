import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, ActivityLogEntry , ApiError } from '../../api/client';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { PageContainer } from '../../components/PageContainer';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';

/**
 * /admin — Dashboard Admin (IA-HIERARCHY-V2).
 * Hanya menampilkan AKTIVITAS AKUN. Statistik kehadiran guru/siswa/KBM
 * milik kesiswaan & TU — tidak ditampilkan di sini.
 */
export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [act, pending] = await Promise.all([
        api.adminGetActivities({ page: 1, limit: 15 }),
        api.adminCountPending().catch(() => ({ count: 0 })),
      ]);
      setActivities(act.items);
      setTotal(act.total);
      setPendingCount(pending.count);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-aam-text">Dashboard</h2>
          <p className="text-sm text-aam-text-muted">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Asia/Jakarta',
            })}
          </p>
        </div>
        <Link
          to="/admin/akun"
          className="text-sm text-aam-green underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
          Kelola Akun
        </Link>
      </div>

      <div className="space-y-4">
        {pendingCount > 0 && (
          <Card className="border-l-4 border-yellow-400">
            <Link
              to="/admin/akun/persetujuan"
              className="flex items-center justify-between p-1 rounded-lg hover:bg-yellow-50 transition-colors"
            >
              <span className="text-sm text-aam-text flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 18 }}>how_to_reg</span>
                Persetujuan Akun Menunggu
              </span>
              <Badge variant="yellow">{pendingCount}</Badge>
            </Link>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-aam-text flex items-center gap-2">
              <span className="material-symbols-outlined text-aam-green" style={{ fontSize: 18 }}>history</span>
              Aktivitas Akun Terbaru
            </h3>
            <Link to="/admin/akun/aktivitas" className="text-xs text-aam-green underline">
              Lihat semua ({total})
            </Link>
          </div>
          {activities.length === 0 ? (
            <EmptyState icon="history" message="Belum ada aktivitas akun" />
          ) : (
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={a.id ?? i} className="flex items-start gap-2 text-sm border-b border-aam-border last:border-0 pb-2 last:pb-0">
                  <span className="text-aam-text-muted text-xs whitespace-nowrap mt-0.5 w-20 shrink-0">
                    {new Date(a.createdAt).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      timeZone: 'Asia/Jakarta',
                    })}
                  </span>
                  <div className="min-w-0">
                    <span className="text-aam-text font-medium">{a.userName ?? 'Sistem'}</span>
                    <span className="text-aam-text-muted"> · {a.action} {a.entity}</span>
                    {a.summary && (
                      <p className="text-xs text-aam-text-muted truncate">{a.summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
