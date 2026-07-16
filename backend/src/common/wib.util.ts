/**
 * Util WIB (Asia/Jakarta) — dipakai semua fase.
 * Semua perhitungan & tampilan waktu memakai zona Asia/Jakarta.
 */
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

export const WIB = 'Asia/Jakarta';

/** Format tanggal untuk tampilan Indonesia */
export function formatWIB(date: Date | string, fmt = 'yyyy-MM-dd HH:mm:ss'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const zoned = toZonedTime(d, WIB);
  return format(zoned, fmt);
}

/** Format waktu relatif dalam Bahasa Indonesia */
export function formatRelativeWIB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatWIB(d, 'dd MMM yyyy');
}

/** Ambil "hari ini" dalam zona WIB — mengembalikan Date di zona WIB */
export function todayWIB(): Date {
  return toZonedTime(new Date(), WIB);
}

/** Konversi Date lokal ke WIB untuk penyimpanan */
export function toWIB(date: Date): Date {
  return fromZonedTime(date, WIB);
}

/** Format jam saja HH:MM:SS */
export function formatTimeWIB(date: Date | string): string {
  return formatWIB(date, 'HH:mm:ss');
}

/** Format tanggal saja */
export function formatDateWIB(date: Date | string): string {
  return formatWIB(date, 'yyyy-MM-dd');
}

/** Nama hari dalam Bahasa Indonesia */
export function dayNameWIB(date: Date | string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = typeof date === 'string' ? new Date(date) : date;
  const zoned = toZonedTime(d, WIB);
  return days[zoned.getDay()];
}
