// Scratch script — T16-SPRINT lanjutan checklist eksekusi via API (brief step 4).
// Jalankan: node scratch/t16-checklist.mjs
const BASE = 'http://localhost/api';

async function req(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const log = (...a) => console.log(...a);

async function main() {
  const results = [];
  const ok = (label, cond, extra) => {
    results.push({ label, pass: !!cond, extra });
    log((cond ? 'OK  ' : 'FAIL'), label, extra ?? '');
  };

  // Login admin (kredensial default seed backend/src/seed/seed.service.ts)
  const loginRes = await req('POST', '/auth/login', null, { email: 'admin@aamapp.sch.id', password: 'admin12345' });
  ok('Login admin', (loginRes.status === 200 || loginRes.status === 201) && loginRes.json?.accessToken, loginRes.status);
  const adminToken = loginRes.json?.accessToken;

  // 1. TA 2026/2027 Sem 1 + aktifkan (toleran bila sudah ada dari run sebelumnya yg gagal cleanup)
  let taId;
  const taRes = await req('POST', '/admin/tahun-ajaran', adminToken, { nama: '2026/2027', semester: 1 });
  if (taRes.status === 201) {
    taId = taRes.json?.id;
    ok('Buat TA 2026/2027 Sem 1', true, taRes.status);
  } else if (taRes.status === 409) {
    const listExisting = await req('GET', '/admin/tahun-ajaran', adminToken);
    const existingTa = (listExisting.json ?? []).find((t) => t.nama === '2026/2027' && t.semester === 1);
    taId = existingTa?.id;
    ok('Buat TA 2026/2027 Sem 1 (sudah ada, dipakai ulang)', !!taId, taId);
  } else {
    ok('Buat TA 2026/2027 Sem 1', false, JSON.stringify(taRes.json));
  }
  const taAktifRes = await req('POST', `/admin/tahun-ajaran/${taId}/aktifkan`, adminToken, {});
  ok('Aktifkan TA', taAktifRes.status === 200 || taAktifRes.status === 201, taAktifRes.status);
  const taListRes = await req('GET', '/admin/tahun-ajaran', adminToken);
  const aktifCount = (taListRes.json ?? []).filter((t) => t.aktif).length;
  ok('Hanya 1 TA aktif', aktifCount === 1, aktifCount);

  // 3 mapel
  const suffix = Date.now();
  const mapelIds = [];
  for (let i = 0; i < 3; i++) {
    const r = await req('POST', '/kurikulum/mapel', adminToken, { nama: `Mapel Checklist ${i}-${suffix}`, kode: `MC${i}${suffix}`.slice(0, 20), kelompok: 'A', urutan: i });
    mapelIds.push(r.json?.id);
  }
  ok('3 mapel dibuat', mapelIds.every((id) => !!id), mapelIds);

  // 4 guru
  const guruIds = [];
  for (let i = 0; i < 4; i++) {
    const r = await req('POST', '/admin/guru', adminToken, { nip: `GC${i}${suffix}`.slice(0, 20), nama: `Guru Checklist ${i} ${suffix}`, jenisKelamin: i % 2 === 0 ? 'L' : 'P', status: 'aktif' });
    guruIds.push(r.json?.id);
  }
  ok('4 guru dibuat', guruIds.every((id) => !!id), guruIds);

  // 2 kelas
  const kelasIds = [];
  for (let i = 0; i < 2; i++) {
    const r = await req('POST', '/admin/kelas', adminToken, { tingkat: 7, nama: `KC${i}-${suffix}` });
    kelasIds.push(r.json?.id);
  }
  ok('2 kelas dibuat', kelasIds.every((id) => !!id), kelasIds);

  // 6 siswa (masuk ke kelas 0)
  const siswaIds = [];
  for (let i = 0; i < 6; i++) {
    const r = await req('POST', '/admin/siswa', adminToken, {
      nama: `Siswa Checklist ${i} ${suffix}`,
      nis: `SC${i}${suffix}`.slice(0, 20),
      nisn: `${suffix}${i}`.slice(-10),
      jenisKelamin: i % 2 === 0 ? 'L' : 'P',
      status: 'aktif',
      kelasId: kelasIds[0],
    });
    siswaIds.push(r.json?.id);
  }
  ok('6 siswa dibuat & masuk kelas', siswaIds.every((id) => !!id), siswaIds);

  // wali + force (endpoint khusus PATCH /admin/kelas/:id/wali)
  const waliRes = await req('PATCH', `/admin/kelas/${kelasIds[0]}/wali`, adminToken, { waliGuruId: guruIds[0] });
  ok('Set wali kelas 0', waliRes.status === 200, waliRes.status);
  const waliDupRes = await req('PATCH', `/admin/kelas/${kelasIds[1]}/wali`, adminToken, { waliGuruId: guruIds[0] });
  ok('Wali kelas 1 sama guru -> 409 tanpa force', waliDupRes.status === 409, waliDupRes.status);
  const waliForceRes = await req('PATCH', `/admin/kelas/${kelasIds[1]}/wali`, adminToken, { waliGuruId: guruIds[0], force: true });
  ok('Force pindah wali -> 200', waliForceRes.status === 200, waliForceRes.status);

  // nonaktifkan 1 siswa
  const nonaktifRes = await req('PATCH', `/admin/siswa/${siswaIds[0]}`, adminToken, { status: 'nonaktif' });
  ok('Nonaktifkan siswa 0', nonaktifRes.status === 200, nonaktifRes.status);

  // paket: 1 guru 2 kelas + duplikat 409 + ganti guru
  const paketRes = await req('POST', '/kurikulum/penugasan', adminToken, { guruId: guruIds[1], mapelId: mapelIds[0], kelasIds: [kelasIds[0], kelasIds[1]] });
  const paket = Array.isArray(paketRes.json) ? paketRes.json : [];
  ok('Paket 1 guru 2 kelas dibuat', paket.length === 2, paketRes.status);
  const paketDupRes = await req('POST', '/kurikulum/penugasan', adminToken, { guruId: guruIds[1], mapelId: mapelIds[0], kelasIds: [kelasIds[0]] });
  ok('Duplikat paket -> 409', paketDupRes.status === 409, paketDupRes.status);
  const paketId0 = paket[0]?.id;
  const gantiGuruRes = await req('PATCH', `/kurikulum/penugasan/${paketId0}`, adminToken, { guruId: guruIds[2] });
  ok('Ganti guru paket', gantiGuruRes.status === 200, gantiGuruRes.status);

  // 3 sesi jadwal + bentrok kelas (hari: int 1=Senin..6=Sabtu)
  const jadwal1 = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: paketId0, hari: 1, jamMulai: '07:00', jamSelesai: '07:40' });
  ok('Jadwal sesi 1 dibuat', jadwal1.status === 201, JSON.stringify(jadwal1.json));
  const jadwal2 = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: paketId0, hari: 2, jamMulai: '07:00', jamSelesai: '07:40' });
  ok('Jadwal sesi 2 dibuat', jadwal2.status === 201, JSON.stringify(jadwal2.json));
  const jadwal3 = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: paketId0, hari: 3, jamMulai: '07:00', jamSelesai: '07:40' });
  ok('Jadwal sesi 3 dibuat', jadwal3.status === 201, JSON.stringify(jadwal3.json));
  const bentrokKelas = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: paketId0, hari: 1, jamMulai: '07:20', jamSelesai: '08:00' });
  ok('Bentrok kelas -> 409', bentrokKelas.status === 409, bentrokKelas.status);

  // Bentrok GURU lintas kelas: guruIds[3] diberi 2 paket (mapel1) di kelas 0 & 1,
  // lalu dijadwalkan bentrok waktu di kelas BERBEDA -> harus 409 (guru sama, kelas beda).
  const paketGuruConflictRes = await req('POST', '/kurikulum/penugasan', adminToken, { guruId: guruIds[3], mapelId: mapelIds[1], kelasIds: [kelasIds[0], kelasIds[1]] });
  const paketGuruConflict = Array.isArray(paketGuruConflictRes.json) ? paketGuruConflictRes.json : [];
  const pgcA = paketGuruConflict[0]?.id;
  const pgcB = paketGuruConflict[1]?.id;
  const jadwalGuruA = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: pgcA, hari: 4, jamMulai: '09:00', jamSelesai: '09:40' });
  ok('Jadwal guru-konflik slot A dibuat', jadwalGuruA.status === 201, JSON.stringify(jadwalGuruA.json));
  const bentrokGuru = await req('POST', '/kurikulum/jadwal', adminToken, { penugasanId: pgcB, hari: 4, jamMulai: '09:00', jamSelesai: '09:40' });
  ok('Bentrok guru lintas kelas -> 409', bentrokGuru.status === 409, bentrokGuru.status);

  // pengaturan 6 sub (verifikasi read + tulis minimal — UI sudah tercakup e2e; di sini pastikan endpoint hidup)
  const pengSekolah = await req('GET', '/pengaturan/profil_sekolah', adminToken);
  const pengJam = await req('GET', '/pengaturan/jam_presensi', adminToken);
  const pengLokasi = await req('GET', '/pengaturan/lokasi', adminToken);
  const pengKkm = await req('GET', '/pengaturan/kkm', adminToken);
  const pengTaList = await req('GET', '/admin/tahun-ajaran', adminToken);
  const pengLibur = await req('GET', '/admin/libur', adminToken);
  ok('6 sub-pengaturan endpoint hidup', [pengSekolah, pengJam, pengLokasi, pengKkm, pengTaList, pengLibur].every((r) => r.status === 200),
    [pengSekolah, pengJam, pengLokasi, pengKkm, pengTaList, pengLibur].map((r) => r.status));

  // Akun uji: 1 kurikulum + 1 guru
  const akunKurikulum = await req('POST', '/admin/users', adminToken, { name: `Uji Kurikulum ${suffix}`, email: `uji.kurikulum.${suffix}@test.local`, password: 'password123', roles: ['kurikulum'] });
  const akunGuru = await req('POST', '/admin/users', adminToken, { name: `Uji Guru ${suffix}`, email: `uji.guru.${suffix}@test.local`, password: 'password123', roles: ['guru'] });
  ok('Akun uji kurikulum & guru dibuat', akunKurikulum.status === 201 && akunGuru.status === 201, JSON.stringify([akunKurikulum.status, akunKurikulum.json, akunGuru.status, akunGuru.json]));

  const loginKurikulum = await req('POST', '/auth/login', null, { email: `uji.kurikulum.${suffix}@test.local`, password: 'password123' });
  const kurikulumToken = loginKurikulum.json?.accessToken;
  const kurikulumCanMapel = await req('GET', '/kurikulum/mapel', kurikulumToken);
  ok('Kurikulum bisa GET mapel', kurikulumCanMapel.status === 200, kurikulumCanMapel.status);
  const kurikulumCanPenugasan = await req('GET', '/kurikulum/penugasan', kurikulumToken);
  ok('Kurikulum bisa GET penugasan', kurikulumCanPenugasan.status === 200, kurikulumCanPenugasan.status);
  const kurikulumCanJadwal = await req('GET', '/kurikulum/jadwal', kurikulumToken);
  ok('Kurikulum bisa GET jadwal', kurikulumCanJadwal.status === 200, kurikulumCanJadwal.status);
  const kurikulumPostGuru403 = await req('POST', '/admin/guru', kurikulumToken, { nip: `X${suffix}`, nama: 'X', jenisKelamin: 'L', status: 'aktif' });
  ok('Kurikulum POST guru -> 403', kurikulumPostGuru403.status === 403, kurikulumPostGuru403.status);

  const loginGuru = await req('POST', '/auth/login', null, { email: `uji.guru.${suffix}@test.local`, password: 'password123' });
  const guruToken = loginGuru.json?.accessToken;
  const guruPostMapel403 = await req('POST', '/kurikulum/mapel', guruToken, { nama: 'X', kode: 'X', kelompok: 'A', urutan: 1 });
  ok('Guru POST mapel -> 403', guruPostMapel403.status === 403, guruPostMapel403.status);
  const guruPostSiswa403 = await req('POST', '/admin/siswa', guruToken, { nama: 'X', nis: 'X', jenisKelamin: 'L', status: 'aktif' });
  ok('Guru POST siswa -> 403', guruPostSiswa403.status === 403, guruPostSiswa403.status);
  const guruPostKelas403 = await req('POST', '/admin/kelas', guruToken, { tingkat: 7, nama: 'X' });
  ok('Guru POST kelas -> 403', guruPostKelas403.status === 403, guruPostKelas403.status);

  // Cleanup: hapus akun uji, jadwal, penugasan, kelas, guru, mapel, siswa (kecuali activity_logs)
  for (const jid of [jadwal1, jadwal2, jadwal3, jadwalGuruA]) {
    if (jid.json?.id) await req('DELETE', `/kurikulum/jadwal/${jid.json.id}`, adminToken);
  }
  for (const p of [...paket, ...paketGuruConflict]) {
    if (p?.id) await req('DELETE', `/kurikulum/penugasan/${p.id}`, adminToken);
  }
  for (const sid of siswaIds) await req('DELETE', `/admin/siswa/${sid}`, adminToken);
  for (const kid of kelasIds) await req('DELETE', `/admin/kelas/${kid}`, adminToken);
  for (const gid of guruIds) await req('DELETE', `/admin/guru/${gid}`, adminToken);
  for (const mid of mapelIds) await req('DELETE', `/kurikulum/mapel/${mid}`, adminToken);
  if (akunKurikulum.json?.id) await req('DELETE', `/admin/users/${akunKurikulum.json.id}`, adminToken);
  if (akunGuru.json?.id) await req('DELETE', `/admin/users/${akunGuru.json.id}`, adminToken);
  if (taId) await req('DELETE', `/admin/tahun-ajaran/${taId}`, adminToken).catch(() => {});
  ok('Cleanup dijalankan', true);

  const failed = results.filter((r) => !r.pass);
  log('\n=== RINGKASAN ===');
  log(`${results.length - failed.length}/${results.length} lolos`);
  if (failed.length) {
    log('GAGAL:', failed.map((f) => f.label));
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
