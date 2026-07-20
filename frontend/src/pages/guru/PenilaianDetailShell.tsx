import React from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { SubPageLinks } from '../../components/SubPageLinks';
import { PageContainer } from '../../components/PageContainer';
import { Button } from '../../components/Button';

/**
 * Shell layout for /guru/penilaian/:penugasanId
 * SubPageLinks (no tab): TP • Penilaian • Rekap
 */
export function PenilaianDetailShell() {
 const { penugasanId } = useParams<{ penugasanId: string }>();
 const navigate = useNavigate();

 const links = [
 { key: 'tp', label: 'Tujuan Pembelajaran', path: `/guru/penilaian/${penugasanId}/tp` },
 { key: 'penilaian', label: 'Penilaian', path: `/guru/penilaian/${penugasanId}/penilaian` },
 { key: 'rekap', label: 'Rekap Nilai Akhir', path: `/guru/penilaian/${penugasanId}/rekap` },
 ];

 return (
 <PageContainer>
 <div className="flex items-center gap-3 mb-2">
 <Button variant="secondary" onClick={() => navigate('/guru/penilaian')} id="btn-back-paket">
 ← Paket Saya
 </Button>
 <h2 className="text-lg font-bold text-aam-text">Detail Paket Penilaian</h2>
 </div>
 <SubPageLinks links={links} />
 <Outlet />
 </PageContainer>
 );
}

