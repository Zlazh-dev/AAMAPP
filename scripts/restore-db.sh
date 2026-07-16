#!/usr/bin/env bash
# =========================================================================
# AAMAPP — Restore PostgreSQL Database
# Skrip: restore-db.sh (Bash untuk Linux/macOS)
# Fungsi: pg_restore via docker compose exec
# =========================================================================
# Cara pakai:
#   ./scripts/restore-db.sh <path-ke-file-backup>
#   ./scripts/restore-db.sh ./backups/aamapp-20260716-1430.dump
#
# Opsi:
#   --force    Lewati konfirmasi (untuk otomasi — HATI-HATI!)
#
# Prasyarat:
#   - Docker berjalan
#   - Stack AAMAPP sedang up
#   - File .env ada di root proyek
#   - File backup ada dan valid
#
# PERINGATAN: Restore akan MENIMPA data database saat ini!
# =========================================================================

set -euo pipefail

# --- Parse argumen ---
FORCE=false
BACKUP_FILE=""

for arg in "$@"; do
    case "$arg" in
        --force) FORCE=true ;;
        -*) echo "Opsi tidak dikenal: $arg"; exit 1 ;;
        *) BACKUP_FILE="$arg" ;;
    esac
done

if [ -z "$BACKUP_FILE" ]; then
    echo "Cara pakai: $0 <path-ke-file-backup> [--force]"
    echo "Contoh:    $0 ./backups/aamapp-20260716-1430.dump"
    exit 1
fi

# --- Resolve project root (parent of scripts/) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Validasi file backup ---
if [ ! -f "$BACKUP_FILE" ]; then
    echo "[restore-db] ERROR: File backup tidak ditemukan: $BACKUP_FILE"
    exit 1
fi

BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"
FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)

if [ "$FILE_SIZE" -eq 0 ]; then
    echo "[restore-db] ERROR: File backup berukuran 0 bytes — tidak valid"
    exit 1
fi

# --- Load .env ---
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[restore-db] ERROR: File .env tidak ditemukan di $PROJECT_ROOT."
    exit 1
fi

DB_USER=""
DB_NAME=""
while IFS='=' read -r key value; do
    key=$(echo "$key" | xargs)
    [[ -z "$key" || "$key" == \#* ]] && continue
    value=$(echo "$value" | xargs)
    case "$key" in
        POSTGRES_USER) DB_USER="$value" ;;
        POSTGRES_DB)   DB_NAME="$value" ;;
    esac
done < "$ENV_FILE"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "[restore-db] ERROR: POSTGRES_USER dan POSTGRES_DB harus diisi di .env"
    exit 1
fi

# --- Cek container db berjalan ---
DB_STATE=$(docker compose ps db --format json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('State',''))" 2>/dev/null || echo "")
if [ "$DB_STATE" != "running" ]; then
    echo "[restore-db] ERROR: Container 'db' tidak berjalan. Jalankan 'docker compose up -d' dahulu."
    exit 1
fi

# --- Tampilkan ringkasan ---
FILE_SIZE_KB=$(echo "scale=1; $FILE_SIZE / 1024" | bc 2>/dev/null || echo "$((FILE_SIZE / 1024))")
echo ""
echo "============================================"
echo "  PERINGATAN: RESTORE DATABASE"
echo "============================================"
echo "  File backup : $BACKUP_FILE"
echo "  Ukuran      : ${FILE_SIZE_KB} KB"
echo "  Database    : $DB_NAME (user: $DB_USER)"
echo "  Container   : db"
echo ""
echo "  INI AKAN MENIMPA SEMUA DATA DI DATABASE!"
echo "  Pastikan tidak ada pengguna aktif."
echo "============================================"
echo ""

# --- Konfirmasi eksplisit ---
if [ "$FORCE" != "true" ]; then
    read -p "Ketik 'RESTORE' (huruf besar) untuk melanjutkan: " confirmation
    if [ "$confirmation" != "RESTORE" ]; then
        echo "[restore-db] Dibatalkan oleh pengguna."
        exit 0
    fi
fi

echo "[restore-db] Memulai restore dari: $BACKUP_FILE"
echo "[restore-db] Database tujuan: $DB_NAME"

# --- Jalankan pg_restore via docker compose exec ---
docker compose exec -T db pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner < "$BACKUP_FILE"
RESTORE_EXIT_CODE=$?

# pg_restore mengembalikan kode non-zero untuk warning (object already exists, dll)
# Kode 0 = sukses penuh, 1 = warning (cukup aman)
if [ "$RESTORE_EXIT_CODE" -gt 1 ]; then
    echo "[restore-db] GAGAL — pg_restore mengembalikan kode $RESTORE_EXIT_CODE"
    exit 1
elif [ "$RESTORE_EXIT_CODE" -eq 1 ]; then
    echo "[restore-db] Restore selesai dengan peringatan (kode 1 — biasanya aman)."
else
    echo "[restore-db] Restore BERHASIL."
fi

echo "[restore-db] Selesai. Disarankan restart backend: docker compose restart backend"