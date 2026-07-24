-- =============================================================================
-- bersihkan-jadwal-hantu.sql
-- Membersihkan baris jadwal_kbm yang jamnya tidak cocok dengan JP manapun di
-- jam_pelajaran (untuk hari & TA yang sama).
--
-- PENGGUNAAN:
--   psql -U aamapp -d aamapp -f scripts/bersihkan-jadwal-hantu.sql
--
-- Default: ROLLBACK (dry-run). Pemilik produk yang COMMIT.
-- Untuk terapkan: ganti ROLLBACK di baris terakhir dengan COMMIT;
-- =============================================================================

BEGIN;

-- Tampilkan jadwal hantu sebelum dihapus
SELECT
    j.id            AS jadwal_id,
    j.hari,
    j."jamMulai"    AS jam_mulai,
    j."jamSelesai"  AS jam_selesai,
    k.nama          AS kelas,
    m.nama          AS mapel,
    g.nama          AS guru
FROM jadwal_kbm j
INNER JOIN penugasan p  ON p.id = j."penugasanId"
LEFT  JOIN kelas    k   ON k.id = p."kelasId"
LEFT  JOIN mapel    m   ON m.id = p."mapelId"
LEFT  JOIN guru     g   ON g.id = p."guruId"
WHERE NOT EXISTS (
    SELECT 1 FROM jam_pelajaran jp
    WHERE  jp."tahunAjaranId" = p."tahunAjaranId"
      AND  jp.hari            = j.hari
      AND  jp."jamMulai"      = j."jamMulai"
      AND  jp."jamSelesai"    = j."jamSelesai"
)
ORDER BY j.hari, j."jamMulai", k.nama;

-- Hapus jadwal hantu
DELETE FROM jadwal_kbm
WHERE id IN (
    SELECT j.id
    FROM jadwal_kbm j
    INNER JOIN penugasan p ON p.id = j."penugasanId"
    WHERE NOT EXISTS (
        SELECT 1 FROM jam_pelajaran jp
        WHERE  jp."tahunAjaranId" = p."tahunAjaranId"
          AND  jp.hari            = j.hari
          AND  jp."jamMulai"      = j."jamMulai"
          AND  jp."jamSelesai"    = j."jamSelesai"
    )
);

-- Laporan hasil
SELECT
    COUNT(*) AS jadwal_hantu_dihapus
FROM jadwal_kbm j
INNER JOIN penugasan p ON p.id = j."penugasanId"
WHERE NOT EXISTS (
    SELECT 1 FROM jam_pelajaran jp
    WHERE  jp."tahunAjaranId" = p."tahunAjaranId"
      AND  jp.hari            = j.hari
      AND  jp."jamMulai"      = j."jamMulai"
      AND  jp."jamSelesai"    = j."jamSelesai"
);

-- Ubah ke COMMIT; untuk terapkan perubahan.
ROLLBACK;
