import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import ExcelJS from 'exceljs';
import { exportToPdf, PdfColumn } from '../../lib/exportPdf';
import { Button } from '../../components/Button';

export default function LegerKelasPage() {
  const { kelasId: paramKelasId } = useParams();
  const navigate = useNavigate();
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(paramKelasId ? Number(paramKelasId) : null);
  
  const [kelasOptions, setKelasOptions] = useState<any[]>([]);
  const [profilData, setProfilData] = useState<any>(null);
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paramKelasId) {
      // Load kelas options for kurikulum
      (async () => {
        try {
          const res = await (api as any).getRaporKelasOptions?.();
          const list = res?.data ?? res ?? [];
          setKelasOptions(list);
          if (list.length > 0 && !selectedKelasId) {
            setSelectedKelasId(list[0].id);
          }
        } catch {
          try {
            const r = await api.adminGetKelas({ limit: 50 });
            const list = r?.data ?? [];
            setKelasOptions(list);
            if (list.length > 0 && !selectedKelasId) {
              setSelectedKelasId(list[0].id);
            }
          } catch (e) {
            // silent
          }
        }
      })();
    }
  }, [paramKelasId, selectedKelasId]);

  useEffect(() => {
    api.getPengaturan()
      .then(entries => {
        const entry = entries.find((e: any) => e.key === 'profil_sekolah');
        if (entry?.value) {
          setProfilData(typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedKelasId) return;
    setIsLoading(true);
    setError(null);
    api.getLegerKelas(selectedKelasId)
      .then(res => {
        setData(res);
      })
      .catch(() => {
        setError('Gagal memuat leger kelas');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedKelasId]);

  const handleExportPdf = async () => {
    if (!profilData || !data) return;
    const columns: PdfColumn[] = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'NIS', key: 'nis', width: 10 },
      { header: 'Nama Lengkap', key: 'nama', width: 20 },
      { header: 'L/P', key: 'jk', width: 5 },
      ...data.mapel.map((m: any) => ({
        header: m.nama,
        key: `mapel_${m.mapelId}`,
      })),
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Rank', key: 'rank', width: 5 },
    ];

    const rows = data.siswa.map((s: any, i: number) => {
      const row: any = {
        no: String(i + 1),
        nis: s.nis ?? '-',
        nama: s.nama,
        jk: s.jenisKelamin === 'Laki-Laki' ? 'L' : s.jenisKelamin === 'Perempuan' ? 'P' : '-',
        total: String(s.totalNilai),
        rank: String(s.ranking),
      };
      for (const mv of s.mapel) {
        row[`mapel_${mv.mapelId}`] = mv.nilai !== null ? String(mv.nilai) : '-';
      }
      return row;
    });

    await exportToPdf({
      title: `LEGER NILAI KELAS ${data.kelasNama}`,
      profil: profilData,
      columns,
      rows,
    });
  };

  const handleExportExcel = async () => {
    if (!data) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leger Kelas');

    const mapelHeaders = data.mapel.map((m: any) => m.nama);
    ws.addRow(['No', 'NIS', 'Nama Lengkap', 'L/P', ...mapelHeaders, 'Total', 'Rank']);
    
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: 'center' };

    data.siswa.forEach((s: any, idx: number) => {
      const rowData = [
        idx + 1,
        s.nis ?? '-',
        s.nama,
        s.jenisKelamin === 'Laki-Laki' ? 'L' : s.jenisKelamin === 'Perempuan' ? 'P' : '-',
      ];
      data.mapel.forEach((m: any) => {
        const mv = s.mapel.find((x: any) => x.mapelId === m.mapelId);
        rowData.push(mv && mv.nilai !== null ? mv.nilai : '-');
      });
      rowData.push(s.totalNilai);
      rowData.push(s.ranking);

      const row = ws.addRow(rowData);

      let colIdx = 5;
      data.mapel.forEach((m: any) => {
        const mv = s.mapel.find((x: any) => x.mapelId === m.mapelId);
        const cell = row.getCell(colIdx);
        if (mv && mv.nilai !== null) {
          if (!mv.tuntas) {
            cell.font = { color: { argb: 'FFFF0000' } };
          }
          if (mv.isOverride) {
            cell.note = 'Nilai di-katrol (override)';
          }
        }
        colIdx++;
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leger-Kelas-${data.kelasNama.replace(/\s+/g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-4 md:p-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {paramKelasId && (
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leger Nilai Kelas {data?.kelasNama ?? ''}</h1>
            <p className="text-gray-500">Tahun Ajaran: {data?.tahunAjaranNama ?? ''}</p>
          </div>
        </div>

        {!paramKelasId && kelasOptions && kelasOptions.length > 0 && (
          <div className="sm:ml-6 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Pilih Kelas:</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white"
              value={selectedKelasId ?? ''}
              onChange={e => setSelectedKelasId(Number(e.target.value))}
            >
              {kelasOptions.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>
        )}

        {data && (
          <div className="ml-auto flex gap-2">
            <Button
              onClick={handleExportExcel}
              variant="secondary"
              icon="table_view"
            >
              Excel
            </Button>
            <Button
              onClick={handleExportPdf}
              variant="secondary"
              icon="picture_as_pdf"
            >
              PDF
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 bg-white rounded-lg border text-center text-gray-500">Memuat Leger...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
      ) : data ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">No</th>
                <th className="px-4 py-3 whitespace-nowrap">NIS</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Lengkap</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">L/P</th>
                {data.mapel.map((m: any) => (
                  <th key={m.mapelId} className="px-4 py-3 text-center whitespace-nowrap">
                    {m.nama}
                  </th>
                ))}
                <th className="px-4 py-3 text-center whitespace-nowrap">Total</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.siswa.map((s: any, i: number) => (
                <tr key={s.siswaId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-500">{s.nis ?? '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.nama}</td>
                  <td className="px-4 py-3 text-center">
                    {s.jenisKelamin === 'Laki-Laki' ? 'L' : s.jenisKelamin === 'Perempuan' ? 'P' : '-'}
                  </td>
                  {data.mapel.map((m: any) => {
                    const mv = s.mapel.find((x: any) => x.mapelId === m.mapelId);
                    const isRed = mv && mv.nilai !== null && !mv.tuntas;
                    const isKatrol = mv && mv.isOverride;
                    return (
                      <td
                        key={m.mapelId}
                        className={`px-4 py-3 text-center ${isRed ? 'text-red-600 font-bold' : ''} ${isKatrol ? 'bg-yellow-50' : ''}`}
                        title={isKatrol ? 'Nilai Override (Di-katrol)' : ''}
                      >
                        {mv && mv.nilai !== null ? mv.nilai : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-bold">{s.totalNilai}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                      {s.ranking}
                    </span>
                  </td>
                </tr>
              ))}
              {data.siswa.length === 0 && (
                <tr>
                  <td colSpan={6 + data.mapel.length} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data siswa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 bg-white rounded-lg border text-center text-gray-500">Pilih kelas untuk melihat leger.</div>
      )}
    </div>
  );
}
