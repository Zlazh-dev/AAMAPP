SELECT j.id, j.hari, j."jamMulai", j."jamSelesai", j."penugasanId" FROM jadwal_kbm j WHERE j.hari=5 AND j."jamMulai" >= '22:00' ORDER BY j."jamMulai";
