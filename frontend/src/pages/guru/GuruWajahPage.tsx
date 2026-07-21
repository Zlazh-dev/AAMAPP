import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api , ApiError } from '../../api/client';
import { PageContainer } from '../../components/PageContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';

/** Wajah status mandiri untuk guru sendiri via GET /api/guru/wajah/status */
interface WajahStatus {
 enrolled: boolean;
 poses: number;
 faceUpdatedAt: string | null;
}

/**
 * GuruWajahPage — /guru/wajah
 *
 * Guru dapat melihat status enrollment wajah miliknya dan melakukan
 * enrollment mandiri (wizard kamera). ALUR TERPISAH dari presensi scan.
 */
export function GuruWajahPage() {
 const navigate = useNavigate();
 const { show } = useToast();
 const [status, setStatus] = useState<WajahStatus | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 setLoading(true);
 try {
 const res = await api.guruWajahStatus();
 setStatus(res as WajahStatus);
 } catch (err) {
 show('error', err instanceof ApiError && err.body?.message ? err.body.message : 'Gagal memuat status wajah');
 } finally {
 setLoading(false);
 }
 })();
 }, [show]);

 return (
 <PageContainer size="sm" backLinkMobile={false}>
 <div className="mb-4">
 <h2 className="text-base md:text-lg font-heading font-semibold text-aam-text">
 Daftar Wajah Saya
 </h2>
 <p className="text-xs text-aam-text-muted">
 Daftarkan wajah Anda agar dapat melakukan presensi mandiri via kamera.
 </p>
 </div>

 {loading ? (
 <div className="h-32 animate-pulse rounded-md bg-aam-border" />
 ) : (
 <Card icon="face" className="">
 <div className="flex items-center gap-4 mb-4">
 <span className="material-symbols-outlined text-4xl text-aam-green">
 face_retouching_natural
 </span>
 <div>
 <p className="font-heading font-semibold text-aam-text">Status Wajah</p>
 {status?.enrolled ? (
 <Badge variant="green">{status.poses} pose terdaftar</Badge>
 ) : (
 <Badge variant="yellow">Belum terdaftar</Badge>
 )}
 </div>
 </div>

 {status?.faceUpdatedAt && (
 <p className="text-xs text-aam-text-muted mb-4">
 Terakhir diperbarui:{' '}
 {new Date(status.faceUpdatedAt).toLocaleDateString('id-ID', {
 day: '2-digit', month: 'long', year: 'numeric',
 })}
 </p>
 )}

 {!status?.enrolled && (
 <p className="text-sm text-aam-text-muted mb-4">
 Anda belum mendaftarkan data wajah. Klik tombol di bawah untuk memulai
 wizard pendaftaran — sistem akan memandu Anda mengambil 3 pose secara otomatis.
 </p>
 )}

 <button
 id="btn-mulai-enroll-guru"
 onClick={() => navigate('/guru/wajah/enroll')}
 className="w-full rounded-md bg-aam-green px-4 py-3 text-sm font-medium text-white hover:bg-aam-green/90"
 >
 {status?.enrolled ? 'Perbarui Data Wajah' : 'Mulai Pendaftaran Wajah'}
 </button>
 </Card>
 )}
 </PageContainer>
 );
}

