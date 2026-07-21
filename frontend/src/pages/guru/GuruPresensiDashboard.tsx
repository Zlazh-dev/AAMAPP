import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/PageContainer';
import { ScanOverlay } from './ScanOverlay';
import { KbmHariIniPage } from './KbmHariIniPage';

/**
 * GuruPresensiDashboard â€” /guru/kbm dengan tombol"Presensi Sekarang" (F3a).
 *
 * Tombol besar mengaktifkan ScanOverlay (overlay fullscreen kamera).
 *"Daftar Wajah" â†’ /guru/wajah (alur TERPISAH dari presensi scan).
 * Konten KBM hari ini disisipkan via prop `embedded`.
 */
export function GuruPresensiDashboard() {
 const navigate = useNavigate();
 const [showScan, setShowScan] = useState(false);

 return (
 <>
 {showScan && <ScanOverlay onClose={() => setShowScan(false)} />}
 <PageContainer size="xl" backLinkMobile={false}>
 {/* Presensi action bar */}
 <div className="mb-5 flex flex-col sm:flex-row gap-3">
 <button
 id="btn-presensi-sekarang"
 onClick={() => setShowScan(true)}
 className="flex items-center justify-center gap-2 rounded-md bg-aam-green px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-aam-green/90 active:scale-95 transition-transform"
 >
 <span className="material-symbols-outlined text-xl">face_retouching_natural</span>
 Presensi Sekarang
 </button>
 <button
 id="btn-daftar-wajah"
 onClick={() => navigate('/guru/wajah')}
 className="flex items-center justify-center gap-2 rounded-md border border-aam-border px-5 py-3 text-sm font-medium text-aam-text hover:border-aam-green/40"
 >
 <span className="material-symbols-outlined text-xl">manage_accounts</span>
 Daftar Wajah Saya
 </button>
 </div>

 {/* KBM hari ini â€” embedded tanpa header duplikat */}
 <KbmHariIniPage embedded />
 </PageContainer>
 </>
 );
}



