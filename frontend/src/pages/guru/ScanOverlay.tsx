import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../components/Toast';

type ScanPhase =
 | 'idle'
 | 'geo-check'
 | 'loading-model'
 | 'scanning'
 | 'success'
 | 'denied-camera'
 | 'denied-geo'
 | 'error'
 | 'manual';

interface ScanResult {
 status: 'HADIR' | 'TERLAMBAT';
 checkInAt?: string;
 checkOutAt?: string;
 similarity: number;
 distanceMeter?: number;
 pesan: string;
}

interface ScanOverlayProps {
 onClose: () => void;
}

const MAX_FAILS = 3;

/**
 * ScanOverlay — fullscreen overlay kamera untuk presensi mandiri guru.
 *
 * Alur:
 * 1. Cek geolokasi (bila pengaturan.lokasi.aktif)
 * 2. Load @vladmandic/human lazily
 * 3. Buka kamera, auto-capture embedding
 * 4. POST /api/guru/presensi-scan
 * 5. Tampil hasil HADIR/TERLAMBAT
 * 6. Gagal 3× → arahkan ke manual (hubungi admin)
 *
 * @vladmandic/human di-import DINAMIS via faceHuman.ts — tidak masuk bundle utama.
 */
export function ScanOverlay({ onClose }: ScanOverlayProps) {
 const { show } = useToast();

 const videoRef = useRef<HTMLVideoElement>(null);
 const streamRef = useRef<MediaStream | null>(null);
 const animFrameRef = useRef<number>(0);
 const faceModRef = useRef<typeof import('../../lib/faceHuman') | null>(null);
 const failCountRef = useRef(0);
 const geoRef = useRef<{ lat: number; lng: number } | null>(null);

 const [phase, setPhase] = useState<ScanPhase>('idle');
 const [statusMsg, setStatusMsg] = useState('Memulai…');
 const [result, setResult] = useState<ScanResult | null>(null);

 const stopCamera = useCallback(() => {
 cancelAnimationFrame(animFrameRef.current);
 streamRef.current?.getTracks().forEach((t) => t.stop());
 streamRef.current = null;
 }, []);

 // Main scan flow
 useEffect(() => {
 let cancelled = false;

 const run = async () => {
 // Phase 1: Geolocation
 setPhase('geo-check');
 setStatusMsg('Memeriksa lokasi…');

 // Try to get geo — we always try; server decides if required
 try {
 const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
 navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
 );
 geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
 } catch (err: unknown) {
 const code = (err as GeolocationPositionError)?.code;
 // PERMISSION_DENIED = 1
 if (code === 1) {
 if (!cancelled) {
 setPhase('denied-geo');
 setStatusMsg('Izin lokasi ditolak. Sistem akan mencoba presensi tanpa geofence.');
 }
 // Continue without geo — server will decide
 }
 // Other errors: timeout etc — just continue without coords
 }

 if (cancelled) return;

 // Phase 2: Load face model
 setPhase('loading-model');
 setStatusMsg('Memuat model deteksi wajah…');
 try {
 const mod = await import('../../lib/faceHuman');
 faceModRef.current = mod;
 await mod.loadHuman();
 } catch {
 if (!cancelled) {
 setPhase('error');
 setStatusMsg('Gagal memuat model wajah');
 }
 return;
 }

 if (cancelled) return;

 // Phase 3: Camera
 try {
 const stream = await navigator.mediaDevices.getUserMedia({
 video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
 });
 if (cancelled) {
 stream.getTracks().forEach((t) => t.stop());
 return;
 }
 streamRef.current = stream;
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 await videoRef.current.play();
 }
 setPhase('scanning');
 setStatusMsg('Posisikan wajah Anda…');
 } catch (err: unknown) {
 if (cancelled) return;
 const name = err instanceof Error ? err.name : '';
 if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
 setPhase('denied-camera');
 setStatusMsg('Izin kamera ditolak');
 } else {
 setPhase('error');
 setStatusMsg('Kamera tidak dapat diakses');
 }
 }
 };

 run();
 return () => {
 cancelled = true;
 stopCamera();
 };
 }, [stopCamera]);

 // Detection loop (only when scanning)
 useEffect(() => {
 if (phase !== 'scanning') return;
 const video = videoRef.current;
 const mod = faceModRef.current;
 if (!video || !mod) return;

 let stopped = false;
 let goodFrames = 0;

 const loop = async () => {
 if (stopped) return;
 try {
 const quality = await mod.checkQuality(video);
 if (quality.ok) {
 goodFrames++;
 if (goodFrames < 3) {
 setStatusMsg(`Tahan… (${goodFrames}/3)`);
 } else {
 setStatusMsg('Memindai wajah…');
 const det = await mod.detectEmbedding(video);
 if (det) {
 stopped = true;
 stopCamera();
 await doScan(det.embedding);
 return;
 }
 goodFrames = 0;
 }
 } else {
 goodFrames = 0;
 setStatusMsg(quality.reason ?? 'Posisikan wajah di tengah');
 }
 } catch {
 goodFrames = 0;
 }
 if (!stopped) animFrameRef.current = requestAnimationFrame(loop);
 };

 animFrameRef.current = requestAnimationFrame(loop);
 return () => {
 stopped = true;
 cancelAnimationFrame(animFrameRef.current);
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [phase]);

 const doScan = async (embedding: number[]) => {
 try {
 const body: {
 embedding: number[];
 lat?: number;
 lng?: number;
 mode?: 'masuk' | 'pulang';
 } = { embedding };
 if (geoRef.current) {
 body.lat = geoRef.current.lat;
 body.lng = geoRef.current.lng;
 }

 const res = await api.guruPresensiScan(body);
 setResult(res as ScanResult);
 setPhase('success');
 } catch (err: unknown) {
 failCountRef.current++;
 if (err instanceof ApiError) {
 if (err.status === 400) {
 // belum enroll
 setPhase('error');
 setStatusMsg(err.message || 'Wajah Anda belum didaftarkan. Hubungi admin.');
 return;
 }
 if (err.status === 403) {
 setPhase('error');
 setStatusMsg(err.message || 'Anda berada di luar area sekolah');
 return;
 }
 if (err.status === 401) {
 if (failCountRef.current >= MAX_FAILS) {
 setPhase('manual');
 setStatusMsg('Wajah tidak dikenali 3×');
 return;
 }
 setStatusMsg(
 `Wajah tidak dikenali (${failCountRef.current}/${MAX_FAILS}). Coba lagi.`,
 );
 // Restart scanning
 setTimeout(() => {
 if (videoRef.current && streamRef.current) {
 setPhase('scanning');
 } else {
 // re-open camera
 setPhase('loading-model');
 }
 }, 1500);
 return;
 }
 }
 setPhase('error');
 setStatusMsg(err instanceof Error ? err.message : 'Terjadi kesalahan scan');
 }
 };

 // Expose doScan for e2e mock
 (window as unknown as Record<string, unknown>).__scanWithEmbedding = doScan;

 // ── Render ──────────────────────────────────────────────────────────

 return (
 <div
 className="fixed inset-0 z-50 bg-black flex flex-col"
 role="dialog"
 aria-label="Presensi Sekarang"
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white">
 <span className="font-heading font-semibold">Presensi Sekarang</span>
 <button
 id="btn-tutup-scan"
 onClick={() => { stopCamera(); onClose(); }}
 className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
 >
 <span className="material-symbols-outlined text-base">close</span>
 Tutup
 </button>
 </div>

 {/* Body */}
 <div className="flex-1 flex flex-col items-center justify-center relative">
 {/* Camera feed */}
 {(phase === 'scanning' || phase === 'loading-model' || phase === 'geo-check') && (
 <video
 ref={videoRef}
 id="scan-video"
 playsInline
 muted
 className="absolute inset-0 w-full h-full object-cover"
 style={{ transform: 'scaleX(-1)' }}
 />
 )}

 {/* Success */}
 {phase === 'success' && result && (
 <div className="text-center text-white z-10 px-6">
 <span className="material-symbols-outlined text-7xl text-green-400 mb-4 block">
 check_circle
 </span>
 <h2 className="text-3xl font-heading font-bold mb-2">
 {result.status === 'HADIR' ? 'HADIR' : 'TERLAMBAT'}
 </h2>
 <p className="text-lg mb-1">{result.pesan}</p>
 {result.checkInAt && (
 <p className="text-sm text-white/70">
 Masuk:{' '}
 {new Date(result.checkInAt).toLocaleTimeString('id-ID', {
 hour: '2-digit',
 minute: '2-digit',
 timeZone: 'Asia/Jakarta',
 })}
 </p>
 )}
 {result.checkOutAt && (
 <p className="text-sm text-white/70">
 Pulang:{' '}
 {new Date(result.checkOutAt).toLocaleTimeString('id-ID', {
 hour: '2-digit',
 minute: '2-digit',
 timeZone: 'Asia/Jakarta',
 })}
 </p>
 )}
 <button
 id="btn-tutup-hasil"
 onClick={() => { stopCamera(); onClose(); }}
 className="mt-6 rounded-md bg-white/20 px-6 py-3 text-sm font-medium hover:bg-white/30"
 >
 Tutup
 </button>
 </div>
 )}

 {/* Manual fallback */}
 {phase === 'manual' && (
 <div className="text-center text-white z-10 px-6">
 <span className="material-symbols-outlined text-6xl text-yellow-400 mb-4 block">
 warning
 </span>
 <h2 className="text-xl font-heading font-bold mb-2">Wajah Tidak Dikenali</h2>
 <p className="text-sm text-white/80 mb-4">
 Sistem tidak berhasil mengenali wajah Anda setelah {MAX_FAILS}× percobaan.
 Silakan hubungi admin untuk pencatatan presensi manual.
 </p>
 <button
 onClick={() => { stopCamera(); onClose(); }}
 className="rounded-md bg-white/20 px-5 py-2 text-sm font-medium hover:bg-white/30"
 >
 Kembali
 </button>
 </div>
 )}

 {/* Denied geo */}
 {phase === 'denied-geo' && (
 <div className="text-center text-white z-10 px-6">
 <span className="material-symbols-outlined text-5xl text-yellow-400 mb-3 block">
 location_off
 </span>
 <p className="text-sm text-white/80 mb-4">{statusMsg}</p>
 <p className="text-xs text-white/60">
 Melanjutkan tanpa data lokasi…
 </p>
 </div>
 )}

 {/* Denied camera */}
 {phase === 'denied-camera' && (
 <div className="text-center text-white z-10 px-6">
 <span className="material-symbols-outlined text-6xl text-red-400 mb-4 block">
 no_photography
 </span>
 <h2 className="text-xl font-heading font-bold mb-2">Izin Kamera Ditolak</h2>
 <p className="text-sm text-white/80 mb-4">
 Buka pengaturan browser, izinkan akses kamera, lalu coba lagi.
 </p>
 <button
 onClick={() => { stopCamera(); onClose(); }}
 className="rounded-md bg-white/20 px-5 py-2 text-sm font-medium"
 >
 Kembali
 </button>
 </div>
 )}

 {/* Error */}
 {phase === 'error' && (
 <div className="text-center text-white z-10 px-6">
 <span className="material-symbols-outlined text-6xl text-red-400 mb-4 block">
 error
 </span>
 <p className="text-base mb-4">{statusMsg}</p>
 <button
 onClick={() => { stopCamera(); onClose(); }}
 className="rounded-md bg-white/20 px-5 py-2 text-sm font-medium"
 >
 Kembali
 </button>
 </div>
 )}

 {/* Scanning overlay guide */}
 {phase === 'scanning' && (
 <>
 {/* Face oval */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-52 h-72 rounded-full border-2 border-white/60 z-10" />
 {/* Status bar */}
 <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
 <div className="bg-black/60 text-white text-sm px-6 py-3 rounded-full">
 {statusMsg}
 </div>
 </div>
 </>
 )}

 {/* Loading spinner — shown only during init phases */}
 {(phase === 'idle' || phase === 'loading-model' || phase === 'geo-check') && (
 <div className="text-white text-center z-10">
 <span className="material-symbols-outlined text-4xl animate-spin block mb-2">
 autorenew
 </span>
 <p className="text-sm">{statusMsg}</p>
 </div>
 )}
 </div>
 </div>
 );
}

