// Type augmentation: Express Request with session payload (saved by AuthGuard).
// Dipakai oleh seluruh service yang menerima Request dari controller.

import 'express';

declare module 'express-serve-static-core' {
  interface SessionData {
    userId?: number;
    role?: string;
    sessionToken?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

export {};
