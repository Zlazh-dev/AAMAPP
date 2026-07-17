import { SetMetadata } from '@nestjs/common';

/**
 * SEC-1 Butir 2: dekorator untuk menandai route publik (tidak butuh
 * SessionAuthGuard). Dipakai di route yang memang sengaja tanpa auth,
 * misal login, konfigurasi Google Client ID, dan pendaftaran akun baru.
 * SessionAuthGuard dan RolesGuard (yang kini APP_GUARD/fail-closed)
 * membaca metadata ini via Reflector untuk melewati pemeriksaan.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
