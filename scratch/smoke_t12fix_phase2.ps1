$tok = "ab0a9b079274e8fa46c2c7d5de1706d69fe107af337b6052ac306c1778300ec9036493b4e3b55bf67dd10de5372a2832"
$H = @{"Authorization" = "Bearer $tok"; "Content-Type" = "application/json"}

function Req($label, $method, $url, $body) {
    try {
        if ($body) {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $H -Body $body -UseBasicParsing
        } else {
            $r = Invoke-WebRequest -Method $method -Uri $url -Headers $H -UseBasicParsing
        }
        Write-Host "$label => $($r.StatusCode) $($r.Content)"
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $errBody = $sr.ReadToEnd()
            Write-Host "$label => $([int]$resp.StatusCode) $errBody"
        } else {
            Write-Host "$label => ERR $($_.Exception.Message)"
        }
    }
    Write-Host ""
}

# Data already exists from previous run:
# TA id=1, Mapel id=1, Kelas 7A=1 7B=2, Guru: 1=Rina 2=Budi 3=Cipto
# Penugasan: id=1 (7A, guruId=3), id=2 (7B, guruId=1)
# Jadwal: id=1 (penugasan=1, hari=1, 07:00-07:40), id=2 (penugasan=2, hari=1, 07:00-07:40)

Write-Host "=== BENTROK GURU TEST: PATCH penugasan=2 to guruId=3 (same guru as penugasan=1) ==="
Req "PATCH penugasan 2 guruId=3" PATCH "http://localhost/api/kurikulum/penugasan/2" '{"guruId":3}'

Write-Host "=== Now DELETE jadwal=2 (so we can recreate with conflict) ==="
Req "DELETE jadwal 2" DELETE "http://localhost/api/kurikulum/jadwal/2" $null

Write-Host "=== BENTROK GURU LINTAS KELAS: create jadwal penugasan=2 (7B, guru=3), hari=1, 07:00-07:40 ==="
Write-Host "    guru 3 already teaches 7A at 07:00-07:40 on Senin => should 409"
Req "CREATE jadwal bentrok guru" POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":2,"hari":1,"jamMulai":"07:00","jamSelesai":"07:40"}'

Write-Host "=== BENTROK KELAS: create jadwal penugasan=1 (7A), hari=1, 07:20-08:00 (overlap with 07:00-07:40) ==="
Req "CREATE jadwal bentrok kelas" POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":1,"hari":1,"jamMulai":"07:20","jamSelesai":"08:00"}'

Write-Host "=== NON-CONFLICT: jadwal penugasan=2 (7B, guru=3), hari=1, 08:00-08:40 (no overlap) ==="
Req "CREATE jadwal OK" POST "http://localhost/api/kurikulum/jadwal" '{"penugasanId":2,"hari":1,"jamMulai":"08:00","jamSelesai":"08:40"}'

Write-Host "=== DELETE PENUGASAN id=1 (has 1 jadwal => 409) ==="
Req "DELETE penugasan 1" DELETE "http://localhost/api/kurikulum/penugasan/1" $null

Write-Host "=== DELETE JADWAL id=1 ==="
Req "DELETE jadwal 1" DELETE "http://localhost/api/kurikulum/jadwal/1" $null

Write-Host "=== DELETE PENUGASAN id=1 (no jadwal now => 200) ==="
Req "DELETE penugasan 1 (no jadwal)" DELETE "http://localhost/api/kurikulum/penugasan/1" $null

Write-Host "=== DONE ==="
