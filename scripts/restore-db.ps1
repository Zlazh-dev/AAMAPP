# =========================================================================
# AAMAPP — Restore PostgreSQL Database
# Skrip: restore-db.ps1 (PowerShell untuk Windows)
# Fungsi: pg_restore via docker compose exec
# =========================================================================
# Cara pakai:
#   .\scripts\restore-db.ps1 <path-ke-file-backup>
#   .\scripts\restore-db.ps1 .\backups\aamapp-20260716-1430.dump
#
# Opsi:
#   -Force    Lewati konfirmasi (untuk otomasi — HATI-HATI!)
#
# Prasyarat:
#   - Docker Desktop berjalan
#   - Stack AAMAPP sedang up
#   - File .env ada di root proyek
#   - File backup ada dan valid
#
# PERINGATAN: Restore akan MENIMPA data database saat ini!
# =========================================================================

#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# --- Parse argumen ---
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BackupFile,

    [switch]$Force
)

# --- Resolve project root (parent of scripts/) ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# --- Validasi file backup ---
if (-not (Test-Path $BackupFile)) {
    Write-Error "[restore-db] File backup tidak ditemukan: $BackupFile"
    exit 1
}

$BackupFile = (Resolve-Path $BackupFile).Path
$FileSize = (Get-Item $BackupFile).Length

if ($FileSize -eq 0) {
    Write-Error "[restore-db] File backup berukuran 0 bytes — tidak valid"
    exit 1
}

# --- Load .env ---
$EnvFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Error "[restore-db] File .env tidak ditemukan di $ProjectRoot."
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
    Write-Error "[restore-db] POSTGRES_USER dan POSTGRES_DB harus diisi di .env"
    exit 1
}

# --- Cek container db berjalan ---
$dbRunning = docker compose ps db --format json 2>$null | ConvertFrom-Json
if (-not $dbRunning -or $dbRunning.State -ne "running") {
    Write-Error "[restore-db] Container 'db' tidak berjalan. Jalankan 'docker compose up -d' dahulu."
    exit 1
}

# --- Tampilkan ringkasan ---
$FileSizeKB = [math]::Round($FileSize / 1024, 1)
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PERINGATAN: RESTORE DATABASE" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  File backup : $BackupFile"
Write-Host "  Ukuran      : $FileSizeKB KB"
Write-Host "  Database    : $DbName (user: $DbUser)"
Write-Host "  Container   : db"
Write-Host ""
Write-Host "  INI AKAN MENIMPA SEMUA DATA DI DATABASE!" -ForegroundColor Red
Write-Host "  Pastikan tidak ada pengguna aktif." -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# --- Konfirmasi eksplisit ---
if (-not $Force) {
    $confirmation = Read-Host "Ketik 'RESTORE' (huruf besar) untuk melanjutkan"
    if ($confirmation -ne "RESTORE") {
        Write-Host "[restore-db] Dibatalkan oleh pengguna."
        exit 0
    }
}

Write-Host "[restore-db] Memulai restore dari: $BackupFile"
Write-Host "[restore-db] Database tujuan: $DbName"

# --- Jalankan pg_restore via docker compose exec ---
# pg_restore --clean = hapus object sebelum recreate
# --if-exists = hindari error jika object tidak ada
# --no-owner = jangan set owner (urus via role connection)
# Salin file backup ke container, lalu restore dari dalam container
# (menghindari masalah binary pipe di PowerShell 5.1)
$TmpRestorePath = "/tmp/aamapp_restore_tmp.dump"
docker compose cp "$BackupFile" "db:$TmpRestorePath"

if ($LASTEXITCODE -ne 0) {
    Write-Error "[restore-db] GAGAL — gagal menyalin file backup ke container"
    exit 1
}

docker compose exec -T db pg_restore -U $DbUser -d $DbName --clean --if-exists --no-owner $TmpRestorePath
$restoreExitCode = $LASTEXITCODE

# Bersihkan file sementara di container
docker compose exec -T db rm -f $TmpRestorePath | Out-Null

# pg_restore mengembalikan kode non-zero untuk warning (object already exists, dll)
# Kode 0 = sukses penuh, 1 = warning (cukup aman)
if ($restoreExitCode -gt 1) {
    Write-Error "[restore-db] GAGAL — pg_restore mengembalikan kode $restoreExitCode"
    exit 1
}
elseif ($restoreExitCode -eq 1) {
    Write-Host "[restore-db] Restore selesai dengan peringatan (kode 1 — biasanya aman)."
}
else {
    Write-Host "[restore-db] Restore BERHASIL."
}

Write-Host "[restore-db] Selesai. Disarankan restart backend: docker compose restart backend"