/**
 * faceHuman.ts — LAZY wrapper untuk @vladmandic/human (§12.15).
 *
 * PENTING: file ini TIDAK BOLEH diimpor langsung dari bundle utama.
 * Hanya boleh di-load via dynamic import di dalam komponen kamera.
 *
 * Model lokal (nol CDN):
 *   /models/blazeface.json     — detektor wajah
 *   /models/faceres.json       — embedding (untuk identifikasi)
 *   /models/facemesh.json      — mesh 468 titik (wajib untuk gestur kedip)
 *   /models/iris.json          — estimasi iris (wajib untuk gestur kedip)
 *   /models/antispoof.json     — deteksi foto/layar (face.real)
 *   /models/liveness.json      — deteksi keaktifan (face.live)
 *   /wasm/                     — TF.js WASM backend (nol CDN)
 *
 * ── Arsitektur Liveness (PENTING untuk audit keamanan) ─────────────────────
 * Pemeriksaan antispoof + blink di sini adalah GERBANG SISI KLIEN.
 * Tujuannya: mencegah pengguna awam mem-bypass dengan foto/layar.
 * Ini BUKAN pengganti verifikasi server. Server tetap memverifikasi:
 *   - Kecocokan embedding (cosine similarity)
 *   - Geofence GPS
 *   - Status faceStatus TERVALIDASI
 * Seseorang dengan kemampuan modifikasi JS lokal bisa melewati gerbang klien.
 * Jika keamanan tinggi dibutuhkan, verifikasi liveness perlu pindah ke server.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Urutan backend: WebGL → WASM → CPU (fallback otomatis + dilaporkan)
 * ?debug=1 di URL → console.log ringkas per frame, tanpa re-render
 */

export interface FaceDetection {
  embedding: number[];
  score: number;
  ok: boolean;
}

export type LoadProgressCallback = (pct: number, label: string) => void;

// Singleton
let humanInstance: import('@vladmandic/human').Human | null = null;
let loadPromise: Promise<import('@vladmandic/human').Human> | null = null;

/** Backend aktual yang berhasil di-init. Diisi setelah loadHuman() selesai. */
export let activeBackend = 'unknown';

/**
 * Ambang antispoof default — nilai 0.7 ditetapkan di lapangan.
 * Dapat di-override via argumen checkQuality() / detectEmbedding().
 * face.real < ANTISPOOF_THRESHOLD → tolak sebagai foto/layar.
 */
export const ANTISPOOF_THRESHOLD = 0.7;

/**
 * Muat Human + semua model. Singleton — panggilan berulang return instance sama.
 * Bila reject, singleton di-reset agar retry bisa dipanggil.
 */
export async function loadHuman(
  onProgress?: LoadProgressCallback,
): Promise<import('@vladmandic/human').Human> {
  if (humanInstance) {
    onProgress?.(100, 'Model siap');
    return humanInstance;
  }
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    onProgress?.(5, 'Memuat pustaka…');
    const { default: Human } = await import('@vladmandic/human');

    onProgress?.(10, 'Konfigurasi backend…');

    // ── Set WASM path SEBELUM instance dibuat ──────────────────────
    try {
      if (typeof (Human as any).setWasmPaths === 'function') {
        (Human as any).setWasmPaths('/wasm/');
      } else {
        const tf = (Human as any).tf ?? (Human as any).__tf;
        if (tf?.setWasmPaths) tf.setWasmPaths('/wasm/');
      }
    } catch (e) {
      console.warn('[faceHuman] setWasmPaths failed:', e);
    }

    const cfg = {
      debug: false,
      modelBasePath: '/models',
      wasmPath: '/wasm/',
      backend: 'webgl' as string,
      face: {
        enabled: true,
        detector: {
          enabled: true,
          modelPath: 'blazeface.json',
          rotation: false,
          return: true,
          minConfidence: 0.3,
          iouThreshold: 0.3,
          maxDetected: 1,
        },
        mesh: {
          // Wajib aktif untuk gestur kedip (mesh 468 titik)
          enabled: true,
          modelPath: 'facemesh.json',
        },
        iris: {
          // Wajib aktif untuk estimasi posisi iris → gestur kedip
          enabled: true,
          modelPath: 'iris.json',
        },
        description: {
          enabled: true,
          modelPath: 'faceres.json',
          minConfidence: 0.3,
        },
        emotion:   { enabled: false },
        antispoof: {
          // Deteksi foto/layar — face.real (0=palsu, 1=nyata)
          enabled: true,
          modelPath: 'antispoof.json',
        },
        liveness: {
          // Deteksi keaktifan — face.live (0=pasif, 1=aktif)
          enabled: true,
          modelPath: 'liveness.json',
        },
      },
      // Gesture WAJIB aktif agar blink terdeteksi
      gesture:      { enabled: true },
      body:         { enabled: false },
      hand:         { enabled: false },
      object:       { enabled: false },
      segmentation: { enabled: false },
    } as unknown as import('@vladmandic/human').Config;

    const instance = new Human(cfg);

    // Progress event bila tersedia
    try {
      const ev = (instance as any).events;
      if (ev?.on) {
        let loadedCount = 0;
        ev.on('load', (model: string) => {
          loadedCount++;
          // 6 model: blazeface, facemesh, iris, faceres, antispoof, liveness
          const pct = Math.min(20 + loadedCount * 10, 75);
          onProgress?.(pct, `Memuat ${model}…`);
        });
      }
    } catch { /* opsional */ }

    onProgress?.(15, 'Memuat model…');
    try {
      await instance.load();
    } catch (err) {
      loadPromise = null;
      humanInstance = null;
      throw new Error(`Gagal memuat model: ${(err as Error).message ?? err}`);
    }

    onProgress?.(80, 'Inisialisasi backend…');

    // ── Pin backend ke WebGL secara eksplisit ─────────────────────────
    try {
      const tf = (instance as any).tf;
      if (tf?.setBackend && tf?.ready) {
        const webglOk = await tf.setBackend('webgl').then(() => true).catch(() => false);
        if (webglOk) {
          await tf.ready();
          activeBackend = tf.getBackend() ?? 'webgl';
          console.info('[faceHuman] backend di-pin: webgl');
        } else {
          const wasmOk = await tf.setBackend('wasm').then(() => true).catch(() => false);
          if (wasmOk) {
            await tf.ready();
            activeBackend = tf.getBackend() ?? 'wasm';
            console.warn('[faceHuman] WebGL tidak tersedia, fallback: wasm');
          } else {
            await tf.setBackend('cpu').catch(() => {});
            await tf.ready().catch(() => {});
            activeBackend = tf.getBackend?.() ?? 'cpu';
            console.warn('[faceHuman] WASM juga gagal, fallback: cpu');
          }
        }
      } else if (typeof (instance as any).init === 'function') {
        await (instance as any).init();
        activeBackend = (instance as any).tf?.getBackend?.() ?? 'unknown';
      }
    } catch (err) {
      console.warn('[faceHuman] backend pin warn:', err);
    }

    onProgress?.(90, 'Pemanasan model…');

    // ── Warm-up ─────────────────────────────────────────────────────
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const t0 = performance.now();
      await instance.detect(canvas);
      const warmupMs = Math.round(performance.now() - t0);
      console.info(`[faceHuman] warm-up selesai: ${warmupMs}ms (backend: ${activeBackend})`);
    } catch (err) {
      console.warn('[faceHuman] warm-up gagal:', err);
    }

    onProgress?.(100, 'Model siap');
    humanInstance = instance;
    return instance;
  })();

  loadPromise.catch(() => {
    loadPromise = null;
    humanInstance = null;
  });

  return loadPromise;
}

// ── Tipe hasil kualitas ─────────────────────────────────────────────────────

export interface DebugInfo {
  faceCount: number;
  score: number;
  box: number[] | null;
  detectMs: number;
  backend: string;
  /** Antispoof score: 0=foto/layar, 1=wajah nyata. null bila model belum selesai. */
  realScore: number | null;
  /** Liveness score: 0=tidak aktif, 1=aktif. null bila model belum selesai. */
  liveScore: number | null;
  /** Apakah gesture blink terdeteksi di frame ini. */
  blinkDetected: boolean;
}

export interface QualityResult {
  ok: boolean;
  reason?: string;
  /** Diisi hanya bila wajah terdeteksi — untuk log debug. */
  debugInfo?: DebugInfo;
  /**
   * Gagal antispoof: wajah terdeteksi tapi real < threshold.
   * Dipakai untuk membedakan "tidak ada wajah" vs "wajah tapi foto/layar".
   */
  isSpoof?: boolean;
  /** Gesture blink terdeteksi di frame ini. */
  blinkDetected?: boolean;
}

/**
 * Deteksi apakah ada gesture blink di result.gesture[].
 * Human melaporkan `"blink left eye"` atau `"blink right eye"` bila salah satu mata tertutup.
 */
function hasBlinkGesture(result: import('@vladmandic/human').Result): boolean {
  const gestures = result.gesture ?? [];
  return gestures.some(
    (g) =>
      typeof (g as any).gesture === 'string' &&
      (g as any).gesture.startsWith('blink'),
  );
}

/**
 * Cek kualitas frame — dua gerbang TERPISAH:
 *
 * Gerbang 1 — Kualitas deteksi:
 *   Skor wajah ≥ minScore (default 0.3), ukuran & posisi wajar.
 *   Ini menentukan apakah frame layak diproses.
 *
 * Gerbang 2 — Anti-spoof (jika wajah terdeteksi):
 *   face.real ≥ antispoofThreshold (default ANTISPOOF_THRESHOLD = 0.7).
 *   Jika gagal → ok=false, isSpoof=true, reason="Terdeteksi foto/layar…".
 *
 * Kedua gerbang sengaja dipisah agar tidak saling mempengaruhi ambang.
 *
 * PERINGATAN: Ini gerbang sisi klien. Lihat komentar arsitektur di atas.
 *
 * @param video               - HTMLVideoElement yang sedang streaming
 * @param minScore            - ambang skor detektor (default 0.3)
 * @param minBoxRatio         - rasio ukuran wajah minimum (default 0.05)
 * @param antispoofThreshold  - ambang antispoof (default ANTISPOOF_THRESHOLD)
 */
export async function checkQuality(
  video: HTMLVideoElement,
  minScore = 0.3,
  minBoxRatio = 0.05,
  antispoofThreshold = ANTISPOOF_THRESHOLD,
): Promise<QualityResult> {
  if (video.readyState < 2 || video.videoWidth === 0) {
    return { ok: false, reason: 'Kamera belum siap — tunggu sebentar' };
  }

  const human = await loadHuman();
  const t0 = performance.now();
  const result = await human.detect(video);
  const detectMs = Math.round(performance.now() - t0);

  const faces = result.face ?? [];
  const blinkDetected = hasBlinkGesture(result);

  const baseDebug: Omit<DebugInfo, 'realScore' | 'liveScore' | 'blinkDetected'> = {
    faceCount: faces.length,
    score: faces[0]?.score ?? 0,
    box: faces[0]?.box ?? null,
    detectMs,
    backend: activeBackend,
  };

  if (faces.length === 0) {
    return {
      ok: false,
      reason: 'Tidak ada wajah — hadap ke kamera',
      debugInfo: { ...baseDebug, realScore: null, liveScore: null, blinkDetected },
    };
  }
  if (faces.length > 1) {
    return {
      ok: false,
      reason: 'Hanya satu wajah di depan kamera',
      debugInfo: { ...baseDebug, realScore: null, liveScore: null, blinkDetected },
    };
  }

  const f = faces[0];
  const score = f.score ?? 0;
  const realScore = f.real ?? null;
  const liveScore = f.live ?? null;

  const debugInfo: DebugInfo = {
    ...baseDebug,
    faceCount: faces.length,
    score,
    box: f.box ?? null,
    realScore,
    liveScore,
    blinkDetected,
  };

  // Gerbang 1: kualitas deteksi
  if (score < minScore) {
    return {
      ok: false,
      reason: 'Kurang cahaya atau terlalu jauh — dekat & pastikan cukup cahaya',
      debugInfo,
    };
  }

  const box = f.box;
  if (box && video.videoWidth > 0) {
    const ratio = box[2] / video.videoWidth;
    if (ratio < minBoxRatio) {
      return { ok: false, reason: 'Terlalu jauh — dekati kamera', debugInfo };
    }
    const cx = (box[0] + box[2] / 2) / video.videoWidth;
    if (cx < 0.08 || cx > 0.92) {
      return { ok: false, reason: 'Arahkan wajah ke tengah layar', debugInfo };
    }
  }

  // Gerbang 2: antispoof (terpisah dari gerbang kualitas)
  if (realScore !== null && realScore < antispoofThreshold) {
    return {
      ok: false,
      isSpoof: true,
      reason: `Terdeteksi foto/layar — gunakan wajah asli (skor: ${realScore.toFixed(2)})`,
      debugInfo,
      blinkDetected,
    };
  }

  return { ok: true, debugInfo, blinkDetected };
}

/**
 * Deteksi wajah & kembalikan embedding untuk identifikasi.
 * Melempar Error bila ada kegagalan internal — caller wajib catch dan tampilkan.
 *
 * Gerbang antispoof juga diterapkan di sini sebagai pertahanan berlapis.
 *
 * PERINGATAN: Ini gerbang sisi klien. Lihat komentar arsitektur di file atas.
 *
 * @param video               - HTMLVideoElement yang sedang streaming
 * @param minScore            - ambang confidence wajah (default 0.55 sesuai lapangan)
 * @param antispoofThreshold  - ambang antispoof (default ANTISPOOF_THRESHOLD)
 */
export async function detectEmbedding(
  video: HTMLVideoElement,
  minScore = 0.55,
  antispoofThreshold = ANTISPOOF_THRESHOLD,
): Promise<FaceDetection | null> {
  const human = await loadHuman();
  if (video.readyState < 2 || video.videoWidth === 0) {
    throw new Error('Video belum siap (readyState < 2)');
  }
  const result = await human.detect(video);

  const faces = result.face ?? [];
  if (faces.length === 0) return null;

  const best = faces.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b));
  const score = best.score ?? 0;
  if (score < minScore) return null;

  // Gerbang antispoof di detectEmbedding (pertahanan berlapis — lihat komentar di atas)
  const realScore = best.real ?? null;
  if (realScore !== null && realScore < antispoofThreshold) {
    throw new Error(
      `Terdeteksi foto/layar — gunakan wajah asli (antispoof: ${realScore.toFixed(2)})`,
    );
  }

  const rawEmbed = best.embedding as number[] | Float32Array | undefined;
  if (!rawEmbed || rawEmbed.length === 0) {
    throw new Error('Embedding kosong — model mungkin tidak termuat dengan benar');
  }

  const embedding = Array.isArray(rawEmbed) ? rawEmbed : Array.from(rawEmbed);
  return { embedding, score, ok: true };
}

/** Reset singleton — untuk retry setelah gagal. */
export function resetHuman(): void {
  humanInstance = null;
  loadPromise = null;
  activeBackend = 'unknown';
}
