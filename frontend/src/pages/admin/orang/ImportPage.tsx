import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, ImportPreviewResult, ImportCommitResult } from '../../../api/client';
import { getToken } from '../../../api/client';
import { useToast } from '../../../components/Toast';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { BackLink } from '../../../components/BackLink';
import { PageMenu } from '../../../components/PageMenu';
import { SubPageLinks } from '../../../components/SubPageLinks';
import { PageContainer } from '../../../components/PageContainer';

type Step = 1 | 2 | 3 | 4; // 1=template, 2=upload+preview, 3=commit, 4=done
type Jenis = 'guru' | 'siswa';

/**
 * /kurikulum/orang/import — wizard 3 langkah:
 * 1. Unduh template (per jenis guru/siswa)
 * 2. Upload & pratinjau (baris error merah + pesan)
 * 3. Konfirmasi & commit ? ringkasan {tersimpan, dilewati}
 */
export function ImportPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [jenis, setJenis] = useState<Jenis>('siswa');
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);

  const handleDownloadTemplate = useCallback(() => {
    const url = api.adminImportTemplate(jenis);
    const token = getToken();
    // Use fetch with auth header to download
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal mengunduh template');
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = jenis === 'guru' ? 'template-guru.xlsx' : 'template-siswa.xlsx';
        a.click();
        URL.revokeObjectURL(a.href);
        show('success', 'Template berhasil diunduh');
      })
      .catch(() => show('error', 'Gagal mengunduh template'));
  }, [jenis, show]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    try {
      const res = await api.adminImportPreview(jenis, file);
      setPreview(res);
      setStep(3);
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal mempratinjau file');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setCommitting(true);
    try {
      const res = await api.adminImportCommit(jenis, file);
      setResult(res);
      setStep(4);
      show('success', `Import selesai: ${res.tersimpan} tersimpan, ${res.dilewati} dilewati`);
    } catch (err: any) {
      show('error', err instanceof ApiError ? err.body?.message : 'Gagal melakukan import');
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const steps = [
    { num: 1, label: 'Unduh Template' },
    { num: 2, label: 'Unggah & Pratinjau' },
    { num: 3, label: 'Konfirmasi' },
    { num: 4, label: 'Selesai' },
  ];

  return (
    <PageContainer size="lg" bottomBar>
      <BackLink to="/kurikulum/orang/guru" />

      <div className="flex items-center justify-between gap-3 mt-3 mb-4">
        <h2 className="text-lg font-heading font-semibold text-aam-text">Import Data</h2>
        <PageMenu
          menuTitle="Menu Data Orang"
          links={[
            { key: 'guru', label: 'Data Guru', path: '/kurikulum/orang/guru', icon: 'school' },
            { key: 'siswa', label: 'Data Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
          ]}
        />
      </div>

      {/* SubPageLinks — desktop navigation to sibling sub-pages (v0.12.0) */}
      <SubPageLinks
        links={[
          { key: 'guru', label: 'Guru', path: '/kurikulum/orang/guru', icon: 'school' },
          { key: 'siswa', label: 'Siswa', path: '/kurikulum/orang/siswa', icon: 'diversity_3' },
        ]}
      />

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {steps.map((s, i) => (
          <React.Fragment key={s.num}>
            <div className={[
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap',
              step >= s.num ? 'bg-aam-green/10 text-aam-green font-medium' : 'text-aam-text-muted',
            ].join(' ')}>
              <span className={[
                'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                step > s.num ? 'bg-aam-green text-white' : step === s.num ? 'bg-aam-green text-white' : 'bg-gray-200 text-gray-500',
              ].join(' ')}>
                {step > s.num ? '?' : s.num}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <span className="material-symbols-outlined text-aam-text-muted" style={{ fontSize: '1rem' }}>
                chevron_right
              </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Template + jenis selection */}
      {step === 1 && (
        <Card icon="upload_file">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Pilih Jenis & Unduh Template</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-aam-text-muted mb-2">Jenis Data</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setJenis('guru')}
                  className={[
                    'flex-1 flex items-center gap-3 p-4 rounded-md border transition-colors min-h-[48px]',
                    jenis === 'guru' ? 'border-aam-green bg-aam-green/5' : 'border-aam-border hover:border-aam-green/40',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.5rem' }}>school</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-aam-text">Guru</p>
                    <p className="text-xs text-aam-text-muted">Import data guru</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setJenis('siswa')}
                  className={[
                    'flex-1 flex items-center gap-3 p-4 rounded-md border transition-colors min-h-[48px]',
                    jenis === 'siswa' ? 'border-aam-green bg-aam-green/5' : 'border-aam-border hover:border-aam-green/40',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-aam-green" style={{ fontSize: '1.5rem' }}>diversity_3</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-aam-text">Siswa</p>
                    <p className="text-xs text-aam-text-muted">Import data siswa</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center py-4 border-2 border-dashed border-aam-border rounded-md bg-gray-50">
              <span className="material-symbols-outlined text-aam-green mb-2" style={{ fontSize: '2.5rem' }}>
                download
              </span>
              <p className="text-sm text-aam-text-muted mb-3 text-center px-4">
                Unduh template Excel untuk {jenis === 'guru' ? 'guru' : 'siswa'}, isi sesuai kolom, lalu unggah kembali.
              </p>
              <Button onClick={handleDownloadTemplate} icon="download" size="lg">
                Unduh Template {jenis === 'guru' ? 'Guru' : 'Siswa'}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} icon="arrow_forward">
                Lanjut: Unggah
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Upload & preview */}
      {step === 2 && (
        <Card icon="upload">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Unggah File Excel</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-aam-text-muted mb-2">Jenis: {jenis === 'guru' ? 'Guru' : 'Siswa'}</label>
            </div>
            <div className="flex flex-col items-center py-8 border-2 border-dashed border-aam-border rounded-md bg-gray-50">
              <span className="material-symbols-outlined text-aam-text-muted mb-2" style={{ fontSize: '2.5rem' }}>
                upload_file
              </span>
              <p className="text-sm text-aam-text-muted mb-3 text-center px-4">
                Pilih file Excel (.xlsx) yang telah diisi
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-aam-text border border-aam-border bg-white hover:bg-gray-50 rounded-md cursor-pointer transition-colors min-h-[48px]"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>file_open</span>
                {file ? file.name : 'Pilih File'}
              </label>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)} icon="arrow_back">
                Kembali
              </Button>
              <Button onClick={handlePreview} loading={previewing} disabled={!file} icon="visibility">
                Pratinjau
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Preview results */}
      {step === 3 && preview && (
        <Card icon="preview">
          <h3 className="text-sm font-semibold text-aam-text mb-4">Pratinjau Data</h3>
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-2xl font-bold text-green-700">{preview.valid.length}</p>
                <p className="text-xs text-green-700">Baris Valid</p>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <p className="text-2xl font-bold text-red-700">{preview.errors.length}</p>
                <p className="text-xs text-red-700">Baris Error</p>
              </div>
            </div>

            {/* Error rows */}
            {preview.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">Baris Error:</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {preview.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200">
                      <span className="material-symbols-outlined text-red-600 flex-shrink-0" style={{ fontSize: '1.125rem' }}>
                        error
                      </span>
                      <div className="text-sm">
                        <p className="text-red-700 font-medium">Baris {err.baris}</p>
                        <p className="text-red-600 text-xs">
                          {err.kolom && `Kolom: ${err.kolom} — `}{err.pesan}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid preview */}
            {preview.valid.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-aam-text mb-2">Baris Valid ({preview.valid.length}):</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-aam-border text-left text-aam-text-muted">
                        {Object.keys(preview.valid[0]).slice(0, 4).map((k) => (
                          <th key={k} className="pb-1 pr-3 font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.valid.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b border-aam-border/30">
                          {Object.values(row).slice(0, 4).map((v: any, j: number) => (
                            <td key={j} className="py-1.5 pr-3 text-aam-text">{String(v ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                      {preview.valid.length > 10 && (
                        <tr><td colSpan={4} className="py-2 text-aam-text-muted">...dan {preview.valid.length - 10} baris lainnya</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)} icon="arrow_back">
                Kembali
              </Button>
              <div className="flex gap-2">
                {preview.errors.length > 0 && (
                  <span className="text-xs text-aam-text-muted self-center mr-2">
                    Baris error akan dilewati
                  </span>
                )}
                <Button onClick={handleCommit} loading={committing} icon="check">
                  Import {preview.valid.length} Baris
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === 4 && result && (
        <Card icon="check_circle">
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-aam-green mb-3" style={{ fontSize: '3rem' }}>
              task_alt
            </span>
            <h3 className="text-lg font-heading font-semibold text-aam-text mb-2">Import Selesai</h3>
            <div className="flex justify-center gap-6 my-4">
              <div>
                <p className="text-3xl font-bold text-green-600">{result.tersimpan}</p>
                <p className="text-sm text-aam-text-muted">Tersimpan</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{result.dilewati}</p>
                <p className="text-sm text-aam-text-muted">Dilewati</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="secondary" onClick={reset} icon="refresh">
                Import Lagi
              </Button>
              <Button onClick={() => navigate(jenis === 'guru' ? '/kurikulum/orang/guru' : '/kurikulum/orang/siswa')} icon="list">
                Lihat {jenis === 'guru' ? 'Guru' : 'Siswa'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
