CREATE TABLE IF NOT EXISTS "jam_pelajaran" (
  "id" SERIAL PRIMARY KEY,
  "tahunAjaranId" INTEGER NOT NULL REFERENCES "tahun_ajaran"("id") ON DELETE CASCADE,
  "hari" INTEGER NOT NULL,
  "urutan" INTEGER NOT NULL,
  "jamMulai" TIME NOT NULL,
  "jamSelesai" TIME NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_jp_ta_hari_urutan"
  ON "jam_pelajaran" ("tahunAjaranId", "hari", "urutan");

INSERT INTO "jam_pelajaran" ("tahunAjaranId", "hari", "urutan", "jamMulai", "jamSelesai")
SELECT
  sub."tahunAjaranId",
  sub."hari",
  ROW_NUMBER() OVER (PARTITION BY sub."tahunAjaranId", sub."hari" ORDER BY sub."jamMulai") AS urutan,
  sub."jamMulai",
  sub."jamSelesai"
FROM (
  SELECT DISTINCT
    p."tahunAjaranId",
    j."hari",
    j."jamMulai",
    j."jamSelesai"
  FROM "jadwal_kbm" j
  INNER JOIN "penugasan" p ON p.id = j."penugasanId"
) sub
ON CONFLICT ("tahunAjaranId", "hari", "urutan") DO NOTHING;

SELECT COUNT(*) AS jp_count FROM "jam_pelajaran";
