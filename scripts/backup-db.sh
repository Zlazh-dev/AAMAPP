#!/usr/bin/env bash
# =========================================================================
# AAMAPP — Backup PostgreSQL Database
# Skrip: backup-db.sh (Bash untuk Linux/macOS)
# Fungsi: pg_dump format custom (-Fc) via docker compose exec
# Output: backups/aamapp-YYYYMMDD-HHmm.dump
# Retensi: simpan 14 berkas terakhir, hapus sisanya
# =========================================================================
# Cara pakai:
#   ./scripts/backup-db.sh
#
# Prasyarat:
#   - Docker berjalan
#   - Stack AAMAPP sedang up (docker compose ps menunjukkan db healthy)
#   - File .env ada di root proyek (berisi POSTGRES_USER, POSTGRES_DB)
# =========================================================================

set -euo pipefail

# --- Resolve project root (parent of scripts/) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Load .env ---
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "[backup-db] ERROR: File .env tidak ditemukan di $PROJECT_ROOT."
    echo "            Salin .env.example menjadi .env lalu sesuaikan."
    exit 1
fi

# Parse .env (hanya KEY=VALUE, abaikan komentar)
DB_USER=""
DB_NAME=""
while IFS='=' read -r key value; do
    # Skip komentar dan baris kosong
    key=$(echo "$key" | xargs)
    [[ -z "$key" || "$key" == \#* ]] && continue
    value=$(echo "$value" | xargs)
    case "$key" in
        POSTGRES_USER) DB_USER="$value" ;;
        POSTGRES_DB)   DB_NAME="$value" ;;
    esac
done < "$ENV_FILE"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "[backup-db] ERROR: POSTGRES_USER dan POSTGRES_DB harus diisi di .env"
    exit 1
fi

# --- Cek container db berjalan ---
DB_STATE=$(docker compose ps db --format json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('State',''))" 2>/dev/null || echo "")
if [ "$DB_STATE" != "running" ]; then
    echo "[backup-db] ERROR: Container 'db' tidak berjalan. Jalankan 'docker compose up -d' dahulu."
    exit 1
fi

# --- Buat direktori backups ---
BACKUPS_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUPS_DIR"

# --- Generate nama file backup ---
TIMESTAMP=$(date +"%Y%m%d-%H%M")
BACKUP_FILE="$BACKUPS_DIR/aamapp-$TIMESTAMP.dump"

echo "[backup-db] Memulai backup database '$DB_NAME' (user: $DB_USER)..."
echo "[backup-db] File tujuan: $BACKUP_FILE"

# --- Jalankan pg_dump via docker compose exec ---
docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "[backup-db] GAGAL — pg_dump mengembalikan kode error"
    # Hapus file kosong/gagal
    [ -f "$BACKUP_FILE" ] && [ ! -s "$BACKUP_FILE" ] && rm -f "$BACKUP_FILE"
    exit 1
fi

# --- Verifikasi file backup ---
if [ ! -f "$BACKUP_FILE" ]; then
    echo "[backup-db] GAGAL — file backup tidak ditemukan setelah pg_dump"
    exit 1
fi

FILE_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
if [ "$FILE_SIZE" -eq 0 ]; then
    echo "[backup-db] GAGAL — file backup berukuran 0 bytes"
    rm -f "$BACKUP_FILE"
    exit 1
fi

FILE_SIZE_KB=$(echo "scale=1; $FILE_SIZE / 1024" | bc 2>/dev/null || echo "$((FILE_SIZE / 1024))")
echo "[backup-db] Backup BERHASIL — ukuran ${FILE_SIZE_KB} KB ($FILE_SIZE bytes)"

# --- Retensi: simpan 14 berkas terakhir ---
BACKUP_COUNT=$(ls -1 "$BACKUPS_DIR"/aamapp-*.dump 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 14 ]; then
    TO_DELETE=$((BACKUP_COUNT - 14))
    echo "[backup-db] Retensi: menghapus $TO_DELETE berkas lama..."
    ls -1t "$BACKUPS_DIR"/aamapp-*.dump | tail -n "$TO_DELETE" | while read -r old_file; do
        echo "  Hapus: $(basename "$old_file")"
        rm -f "$old_file"
    done
fi

FINAL_COUNT=$(ls -1 "$BACKUPS_DIR"/aamapp-*.dump 2>/dev/null | wc -l)
echo "[backup-db] Selesai. Total berkas backup: $FINAL_COUNT"