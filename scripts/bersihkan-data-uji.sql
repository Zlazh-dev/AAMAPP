-- Bersihkan data uji e2e dari DB dev. Transaksional: rollback bila FK meleset.
-- DIJAGA: 14 mapel, 44 guru berkode, 25 kelas 7A-9I, 300 penugasan, ~942 jadwal,
--         72 libur, katalog pelanggaran (seed), pengaturan (seed), TA 2026/2027,
--         akun admin@ + e2e-admin@. Tabel konten dikosongkan (belum ada data asli).
BEGIN;
-- 1) konten (semua uji — belum ada siswa/konten asli)
DELETE FROM presensi_siswa;
DELETE FROM presensi_sesi;
DELETE FROM presensi_harian_guru;
DELETE FROM ekskul_kehadiran; DELETE FROM ekskul_nilai; DELETE FROM ekskul_peserta; DELETE FROM ekskul_tujuan; DELETE FROM ekskul;
DELETE FROM kokurikuler_asesmen; DELETE FROM kokurikuler_target; DELETE FROM kokurikuler_tim; DELETE FROM kokurikuler_kegiatan;
DELETE FROM nilai; DELETE FROM penilaian_tp; DELETE FROM penilaian; DELETE FROM tujuan_pembelajaran;
DELETE FROM rapor_mapel_override; DELETE FROM rapor;
DELETE FROM tindak_lanjut; DELETE FROM pelanggaran;
DELETE FROM izin_guru;
DELETE FROM device_kiosk;
-- 2) penugasan uji (guru tanpa kode / kelas non-pola / TA bukan aktif) -> jadwal CASCADE
DELETE FROM penugasan p USING guru g, kelas k
  WHERE p."guruId"=g.id AND p."kelasId"=k.id
  AND (g.kode IS NULL OR k.nama !~ '^[789][A-J]$' OR p."tahunAjaranId" <> 1);
-- 3) master by sidik jari
DELETE FROM siswa;                                        -- belum ada siswa asli
DELETE FROM kelas WHERE nama !~ '^[789][A-J]$';
DELETE FROM guru  WHERE kode IS NULL;
DELETE FROM users WHERE email NOT IN ('admin@aamapp.sch.id','e2e-admin@aamapp.sch.id');
DELETE FROM tahun_ajaran WHERE id <> 1;
-- verifikasi poros asli sebelum COMMIT
SELECT 'mapel' t, COUNT(*) FROM mapel
 UNION ALL SELECT 'guru', COUNT(*) FROM guru
 UNION ALL SELECT 'kelas', COUNT(*) FROM kelas
 UNION ALL SELECT 'penugasan', COUNT(*) FROM penugasan
 UNION ALL SELECT 'jadwal_kbm', COUNT(*) FROM jadwal_kbm
 UNION ALL SELECT 'kalender_libur', COUNT(*) FROM kalender_libur
 UNION ALL SELECT 'siswa', COUNT(*) FROM siswa
 UNION ALL SELECT 'users', COUNT(*) FROM users
 UNION ALL SELECT 'tahun_ajaran', COUNT(*) FROM tahun_ajaran ORDER BY 1;
COMMIT;
