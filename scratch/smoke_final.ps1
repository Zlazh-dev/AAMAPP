$tok = "15e3d11836b7ee35e16890e657a637f6ba7aa90d1fe5b9fb00fcf62cae8568c09a330ef94b68326f98db57b39dc2501e"
$S = "d:\Codeproject\AAMAPP\scratch"
$AH = @("Content-Type: application/json", "Authorization: Bearer $tok")

function ApiCall($label, $method, $url, $file) {
    Write-Host -NoNewline "$label => "
    if ($file) {
        $out = curl.exe -sS -m 10 -X $method $url -H $AH[0] -H $AH[1] --data-binary "@$S\$file" 2>&1
    } else {
        $out = curl.exe -sS -m 10 -X $method $url -H $AH[0] -H $AH[1] 2>&1
    }
    Write-Host $out
    Write-Host ""
}

# SETUP
ApiCall "SETUP TA" POST "http://localhost/api/admin/tahun-ajaran" "b_ta.json"
ApiCall "SETUP MAPEL" POST "http://localhost/api/kurikulum/mapel" "b_mapel.json"
ApiCall "SETUP KELAS 7A" POST "http://localhost/api/admin/kelas" "b_k7a.json"
ApiCall "SETUP KELAS 7B" POST "http://localhost/api/admin/kelas" "b_k7b.json"
ApiCall "SETUP GURU Rina" POST "http://localhost/api/admin/guru" "b_g1.json"
ApiCall "SETUP GURU Budi" POST "http://localhost/api/admin/guru" "b_g2.json"
ApiCall "SETUP GURU Cipto" POST "http://localhost/api/admin/guru" "b_g3.json"

# T12-FIX TESTS
ApiCall "1. CREATE PENUGASAN (guru=1, mapel=1, kelas=[1,2])" POST "http://localhost/api/kurikulum/penugasan" "b_penugasan.json"
ApiCall "2. DUP PENUGASAN (409 + nama mapel+guru)" POST "http://localhost/api/kurikulum/penugasan" "b_dup_penugasan.json"
ApiCall "3. PATCH guruId=3 (200, id tetap)" PATCH "http://localhost/api/kurikulum/penugasan/1" "b_patch_guru3.json"
ApiCall "4. 404 guruId=999" PATCH "http://localhost/api/kurikulum/penugasan/1" "b_patch_guru999.json"
ApiCall "5. LIST PENUGASAN" GET "http://localhost/api/kurikulum/penugasan" $null
ApiCall "6. CREATE JADWAL 07:00-07:40" POST "http://localhost/api/kurikulum/jadwal" "b_jadwal1.json"
ApiCall "7. BENTROK KELAS (409)" POST "http://localhost/api/kurikulum/jadwal" "b_jadwal_bentrok_kelas.json"
ApiCall "8. BENTROK GURU LINTAS KELAS (409)" POST "http://localhost/api/kurikulum/jadwal" "b_jadwal_bentrok_guru.json"
ApiCall "9. DELETE PENUGASAN w/ jadwal (409)" DELETE "http://localhost/api/kurikulum/penugasan/1" $null
ApiCall "10. PATCH KKM {nilai:80}" PATCH "http://localhost/api/kurikulum/pengaturan/kkm" "b_kkm.json"
ApiCall "11. GET KKM" GET "http://localhost/api/kurikulum/pengaturan/kkm" $null
ApiCall "12. GET /api/pengaturan (4 keys)" GET "http://localhost/api/pengaturan" $null
ApiCall "13. GET /api/libur (404 - deleted)" GET "http://localhost/api/libur" $null
ApiCall "14. GET /api/admin/libur" GET "http://localhost/api/admin/libur" $null
ApiCall "15. CREATE LIBUR" POST "http://localhost/api/admin/libur" "b_libur.json"
ApiCall "16. DUP LIBUR (409)" POST "http://localhost/api/admin/libur" "b_libur.json"

Write-Host "=== DONE ==="
