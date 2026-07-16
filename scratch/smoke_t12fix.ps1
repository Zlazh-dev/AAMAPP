$tok = "ab0a9b079274e8fa46c2c7d5de1706d69fe107af337b6052ac306c1778300ec9036493b4e3b55bf67dd10de5372a2832"
$H = @{"Authorization" = "Bearer $tok"; "Content-Type" = "application/json"}

function Req($method, $url, $body) {
    try {
        if ($body) {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $H -Body $body -UseBasicParsing
        } else {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $H -UseBasicParsing
        }
        Write-Host "$($r.StatusCode) $($r.Content)"
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $body = $sr.ReadToEnd()
            Write-Host "$([int]$resp.StatusCode) $body"
        } else {
            Write-Host "ERR $($_.Exception.Message)"
        }
    }
    Write-Host "---"
}

Write-Host "=== SETUP: TA ==="
Req POST "http://localhost/api/admin/tahun-ajaran" '{"nama":"2026/2027","semester":1,"aktif":true}'

Write-Host "=== SETUP: MAPEL ==="
Req POST "http://localhost/api/kurikulum/mapel" '{"kode":"MAT","nama":"Matematika","kelompok":"A"}'

Write-Host "=== SETUP: KELAS 7A + 7B ==="
Req POST "http://localhost/api/admin/kelas" '{"nama":"7A","tingkat":7}'
Req POST "http://localhost/api/admin/kelas" '{"nama":"7B","tingkat":7}'

Write-Host "=== SETUP: GURU Bu Rina (P), Pak Budi (L), Pak Cipto (L) ==="
Req POST "http://localhost/api/admin/guru" '{"nama":"Bu Rina","nip":"198501012010012001","jenisKelamin":"P"}'
Req POST "http://localhost/api/admin/guru" '{"nama":"Pak Budi","nip":"198501022010012002","jenisKelamin":"L"}'
Req POST "http://localhost/api/admin/guru" '{"nama":"Pak Cipto","nip":"198501032010012003","jenisKelamin":"L"}'

Write-Host "=== 1. CREATE PENUGASAN: guruId=1 mapelId=1 kelasIds=[1,2] ==="
Req POST "http://localhost/api/kurikulum/penugasan" '{"guruId":1,"mapelId":1,"kelasIds":[1,2]}'

Write-Host "=== 2. DUP PENUGASAN (409 expected with mapel+guru name) ==="
Req POST "http://localhost/api/kurikulum/penugasan" '{"guruId":2,"mapelId":1,"kelasIds":[1]}'

Write-Host "=== 3. PATCH guruId=3 (should 200, id paket tetap) ==="
Req PATCH "http://localhost/api/kurikulum/penugasan/1" '{"guruId":3}'

Write-Host "=== 4. 404 guruId=999 ==="
Req PATCH "http://localhost/api/kurikulum/penugasan/1" '{"guruId":999}'

Write-Host "=== 5. LIST penugasan (verify guruId=3 persisted on id=1) ==="
Req GET "http://localhost/api/kurikulum/penugasan" $null

Write-Host "=== 6. CREATE JADWAL penugasan=1, hari=1 (Senin), 07:00-07:40 ==="
Req POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":1,"hari":1,"jamMulai":"07:00","jamSelesai":"07:40"}'

Write-Host "=== 7. BENTROK KELAS: same kelas, hari, overlapping (409) ==="
Req POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":1,"hari":1,"jamMulai":"07:30","jamSelesai":"08:10"}'

Write-Host "=== 8. BENTROK GURU LINTAS KELAS: penugasan=2 (7B), guru=3, hari=1, 07:00-07:40 (409) ==="
Req POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":2,"hari":1,"jamMulai":"07:00","jamSelesai":"07:40"}'

Write-Host "=== 9. DELETE PENUGASAN id=1 (409 - has jadwal) ==="
Req DELETE "http://localhost/api/kurikulum/penugasan/1" $null

Write-Host "=== 10. PATCH KKM {nilai: 80} ==="
Req PATCH "http://localhost/api/kurikulum/pengaturan/kkm" '{"nilai":80}'

Write-Host "=== 11. GET KKM (should be {nilai: 80}) ==="
Req GET "http://localhost/api/kurikulum/pengaturan/kkm" $null

Write-Host "=== 12. GET /api/pengaturan (should have 4 keys) ==="
Req GET "http://localhost/api/pengaturan" $null

Write-Host "=== 13. GET /api/libur (should 404 - public controller deleted) ==="
Req GET "http://localhost/api/libur" $null

Write-Host "=== 14. GET /api/admin/libur ==="
Req GET "http://localhost/api/admin/libur" $null

Write-Host "=== 15. CREATE LIBUR ==="
Req POST "http://localhost/api/admin/libur" '{"tanggal":"2026-08-17","keterangan":"Hari Kemerdekaan RI"}'

Write-Host "=== 16. DUP LIBUR (409) ==="
Req POST "http://localhost/api/admin/libur" '{"tanggal":"2026-08-17","keterangan":"Duplikat"}'

Write-Host "=== DONE ==="
