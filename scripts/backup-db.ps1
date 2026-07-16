# =========================================================================
# AAMAPP — Backup PostgreSQL Database
# Skrip: backup-db.ps1 (PowerShell untuk Windows)
# Fungsi: pg_dump format custom (-Fc) via docker compose exec
# Output: backups/aamapp-YYYYMMDD-HHmm.dump
# Retensi: simpan 14 berkas terakhir, hapus sisanya
# =========================================================================
# Cara pakai:
#   .\scripts\backup-db.ps1
#
# Prasyarat:
#   - Docker Desktop berjalan
#   - Stack AAMAPP sedang up (docker compose ps menunjukkan db healthy)
#   - File .env ada di root proyek (berisi POSTGRES_USER, POSTGRES_DB)
# =========================================================================

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# --- Resolve project root (parent of scripts/) ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# --- Load .env ---
$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Error "[backup-db] File .env tidak ditemukan di $ProjectRoot. Salin .env.example menjadi .env lalu sesuaikan."
    exit 1
}

$EnvVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        $EnvVars[$key] = $value
    }
}

$DbUser = $EnvVars["POSTGRES_USER"]
$DbName = $EnvVars["POSTGRES_DB"]

if (-not $DbUser -or -not $DbName) {
    Write-Error "[backup-db] POSTGRES_USER dan POSTGRES_DB harus diisi di .env"
    exit 1
}

# --- Cek container db berjalan ---
$dbRunning = docker compose ps db --format json 2>$null | ConvertFrom-Json
if (-not $dbRunning -or $dbRunning.State -ne "running") {
    Write-Error "[backup-db] Container 'db' tidak berjalan. Jalankan 'docker compose up -d' dahulu."
    exit 1
}

# --- Buat direktori backups ---
$BackupsDir = Join-Path $ProjectRoot "backups"
if (-not (Test-Path $BackupsDir)) {
    New-Item -ItemType Directory -Path $BackupsDir -Force | Out-Null
    Write-Host "[backup-db] Dibuat direktori: $BackupsDir"
}

# --- Generate nama file backup ---
$Timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$BackupFile = Join-Path $BackupsDir "aamapp-$Timestamp.dump"

Write-Host "[backup-db] Memulai backup database '$DbName' (user: $DbUser)..."
Write-Host "[backup-db] File tujuan: $BackupFile"

# --- Jalankan pg_dump via docker compose exec ---
# Gunakan --file di dalam container lalu docker compose cp keluar
# (menghindari masalah binary redirect di PowerShell 5.1)
$TmpDumpPath = "/tmp/aamapp_backup_tmp.dump"
docker compose exec -T db pg_dump -U $DbUser -d $DbName -Fc --file $TmpDumpPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "[backup-db] GAGAL — pg_dump mengembalikan kode $LASTEXITCODE"
    exit 1
}

# Salin file dari container ke host
docker compose cp "db:$TmpDumpPath" "$BackupFile"

if ($LASTEXITCODE -ne 0) {
    Write-Error "[backup-db] GAGAL — docker compose cp mengembalikan kode $LASTEXITCODE"
    exit 1
}

# Bersihkan file sementara di container
docker compose exec -T db rm -f $TmpDumpPath | Out-Null

# --- Verifikasi file backup ---
if (-not (Test-Path $BackupFile)) {
    Write-Error "[backup-db] GAGAL — file backup tidak ditemukan setelah pg_dump"
    exit 1
}

$FileSize = (Get-Item $BackupFile).Length
if ($FileSize -eq 0) {
    Write-Error "[backup-db] GAGAL — file backup berukuran 0 bytes"
    Remove-Item $BackupFile -Force
    exit 1
}

$FileSizeKB = [math]::Round($FileSize / 1024, 1)
Write-Host "[backup-db] Backup BERHASIL — ukuran $FileSizeKB KB ($FileSize bytes)"

# --- Retensi: simpan 14 berkas terakhir ---
$AllBackups = Get-ChildItem -Path $BackupsDir -Filter "aamapp-*.dump" | Sort-Object LastWriteTime -Descending
if ($AllBackups.Count -gt 14) {
    $toDelete = $AllBackups.Count - 14
    Write-Host "[backup-db] Retensi: menghapus $toDelete berkas lama..."
    $AllBackups | Select-Object -Skip 14 | ForEach-Object {
        Write-Host "  Hapus: $($_.Name)"
        Remove-Item $_.FullName -Force
    }
}

Write-Host "[backup-db] Selesai. Total berkas backup: $((Get-ChildItem -Path $BackupsDir -Filter 'aamapp-*.dump').Count)"