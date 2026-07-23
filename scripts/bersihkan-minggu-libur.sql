-- ────────────────────────────────────────────────────────────────────────────
-- TU-PENGATURAN Bagian A: Bersihkan baris Minggu (LU) dari kalender_libur.
--
-- Minggu kini libur struktural (derivasi getDay()===0 di backend + UI kalender),
-- jadi 55 baris LU di kalender_libur untuk hari Minggu adalah redundan dan
-- menenggelamkan libur sungguhan (16 LHB + 1 CB).
--
-- Skrip ini transaksional: verifikasi hitungan SEBELUM COMMIT.
-- Jangan hapus otomatis — pemilik produk yang menjalankan.
-- ────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Hitung SEBELUM hapus (verifikasi)
SELECT
  COUNT(*) FILTER (WHERE EXTRACT(DOW FROM tanggal) = 0) AS minggu_count,
  COUNT(*) FILTER (WHERE EXTRACT(DOW FROM tanggal) <> 0) AS non_minggu_count,
  COUNT(*) AS total
FROM kalender_libur;

-- 2. Hapus baris Minggu (DOW=0) — kini derivasi struktural menangani
DELETE FROM kalender_libur
WHERE EXTRACT(DOW FROM tanggal) = 0;

-- 3. Hitung SESUDAH hapus (verifikasi)
SELECT
  COUNT(*) FILTER (WHERE EXTRACT(DOW FROM tanggal) = 0) AS minggu_count,
  COUNT(*) FILTER (WHERE EXTRACT(DOW FROM tanggal) <> 0) AS non_minggu_count,
  COUNT(*) AS total
FROM kalender_libur;

-- 4. Commit (uncomment untuk eksekusi nyata)
-- COMMIT;
-- ROLLBACK; -- default: rollback supaya pemilik produk lihat hitungan dulu
ROLLBACK;
