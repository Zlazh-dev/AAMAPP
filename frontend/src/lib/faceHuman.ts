/**
 * faceHuman.ts — LAZY wrapper untuk @vladmandic/human (§12.15).
 *
 * PENTING: file ini TIDAK BOLEH diimpor langsung dari bundle utama.
 * Hanya boleh di-load via dynamic import di dalam komponen kamera.
 *
 * Model: /models/blazeface.json + /models/faceres.json  (lokal, tanpa CDN)
 * WASM:  /wasm/                                          (lokal, tanpa CDN)
 *
 * Urutan backend: WebGL → WASM → CPU (fallback otomatis + dilaporkan)
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
 * Muat Human + model. Singleton — panggilan berulang return instance sama.
 * Bila reject, singleton di-reset agar retry bisa dipanggil.
 *
 * @param onProgress - dipanggil saat progres loading (0–100)
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

    onProgress?.(15, 'Konfigurasi backend…');

    // ── Set WASM path SEBELUM instance dibuat ──────────────────────
    // human.esm.js defaultnya pakai wasmPath CDN. Override ke lokal:
    try {
      // setWasmPaths harus dipanggil sebelum backend init
      if (typeof (Human as any).setWasmPaths === 'function') {
        (Human as any).setWasmPaths('/wasm/');
      } else {
        // tfjs ekspos lewat instance.tf — akses via require dinamis
        const tf = (Human as any).tf ?? (Human as any).__tf;
        if (tf?.setWasmPaths) tf.setWasmPaths('/wasm/');
      }
    } catch (e) {
      // Tidak fatal — lanjut, tapi WASM mungkin ke CDN
      console.warn('[faceHuman] setWasmPaths failed:', e);
    }

    const cfg = {
      debug: false,
      modelBasePath: '/models',
      // Override wasmPath Human agar tidak ke CDN
      wasmPath: '/wasm/',
      backend: 'webgl' as string, // preferensi; Human fallback ke wasm/cpu
      face: {
        enabled: true,
        detector: {
          enabled: true,
          modelPath: 'blazeface.json',
          rotation: false,
          return: true,
          minConfidence: 0.3,   // lebih toleran
          iouThreshold: 0.3,
          maxDetected: 1,
        },
        mesh: { enabled: false },
        iris: { enabled: false },
        description: {
          enabled: true,
          modelPath: 'faceres.json',
          minConfidence: 0.3,
        },
        emotion:    { enabled: false },
        antispoof:  { enabled: false },
        liveness:   { enabled: false },
      },
      body:         { enabled: false },
      hand:         { enabled: false },
      object:       { enabled: false },
      gesture:      { enabled: false },
      segmentation: { enabled: false },
    } as unknown as import('@vladmandic/human').Config;

    const instance = new Human(cfg);

    // Pasang progress event bila tersedia
    try {
      const ev = (instance as any).events;
      if (ev?.on) {
        ev.on('load', (model: string) => {
          onProgress?.(model.includes('faceres') ? 75 : 50, `Memuat ${model}…`);
        });
      }
    } catch { /* opsional */ }

    onProgress?.(20, 'Memuat model detector…');

    try {
      await instance.load();
    } catch (err) {
      loadPromise = null;
      humanInstance = null;
      throw new Error(`Gagal memuat model: ${(err as Error).message ?? err}`);
    }

    onProgress?.(85, 'Inisialisasi backend…');

    // ── Pin backend ke WebGL secara eksplisit ─────────────────────────
    // Sebelumnya hanya diset di config (preferensi) — sekarang di-pin via tf.setBackend().
    // Ini memastikan WebGL benar-benar aktif, bukan hanya "diinginkan".
    try {
      const tf = (instance as any).tf;
      if (tf?.setBackend && tf?.ready) {
        // Coba WebGL dulu
        const webglOk = await tf.setBackend('webgl').then(() => true).catch(() => false);
        if (webglOk) {
          await tf.ready();
          activeBackend = tf.getBackend() ?? 'webgl';
          console.info('[faceHuman] backend di-pin: webgl');
        } else {
          // Fallback ke wasm — ini bukan error fatal
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
      // Non-fatal; lanjut
    }

    onProgress?.(90, 'Pemanasan model (warm-up)…');

    // ── Warm-up: satu detect dummy agar WebGL compile shader selesai ─
    try {
      // Buat canvas 64×64 sebagai input dummy
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const t0 = performance.now();
      await instance.detect(canvas);
      const warmupMs = Math.round(performance.now() - t0);
      console.info(`[faceHuman] warm-up selesai: ${warmupMs}ms (backend: ${activeBackend})`);
    } catch (err) {
      // Warm-up gagal — bukan fatal, tapi catat
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

/**
 * Deteksi wajah di frame video dan kembalikan embedding.
 * Melempar Error (bukan return null) bila ada kegagalan internal —
 * caller wajib catch dan tampilkan pesan.
 *
 * @param video    - HTMLVideoElement yang sedang streaming
 * @param minScore - ambang confidence wajah (default 0.35)
 */
export async function detectEmbedding(
  video: HTMLVideoElement,
  minScore = 0.35,
): Promise<FaceDetection | null> {
  const human = await loadHuman();
  // Lempar bila video belum siap
  if (video.readyState < 2 || video.videoWidth === 0) {
    throw new Error('Video belum siap (readyState < 2)');
  }
  const result = await human.detect(video);

  const faces = result.face ?? [];
  if (faces.length === 0) return null;

  const best = faces.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b));
  const score = best.score ?? 0;
  if (score < minScore) return null;

  const rawEmbed = best.embedding as number[] | Float32Array | undefined;
  if (!rawEmbed || rawEmbed.length === 0) {
    throw new Error('Embedding kosong — model mungkin tidak termuat dengan benar');
  }

  const embedding = Array.isArray(rawEmbed) ? rawEmbed : Array.from(rawEmbed);
  return { embedding, score, ok: true };
}

/**
 * Cek kualitas pose — lebih toleran.
 * Melempar Error bila ada masalah internal.
 *
 * @returns { ok, reason, debugInfo }
 */
export async function checkQuality(
  video: HTMLVideoElement,
  minScore = 0.3,
  minBoxRatio = 0.05,
): Promise<{ ok: boolean; reason?: string; debugInfo?: DebugInfo }> {
  if (video.readyState < 2 || video.videoWidth === 0) {
    return { ok: false, reason: 'Kamera belum siap — tunggu sebentar' };
  }

  const human = await loadHuman();
  const t0 = performance.now();
  const result = await human.detect(video);
  const detectMs = Math.round(performance.now() - t0);

  const faces = result.face ?? [];

  const debugInfo: DebugInfo = {
    faceCount: faces.length,
    score: faces[0]?.score ?? 0,
    box: faces[0]?.box ?? null,
    detectMs,
    backend: activeBackend,
  };

  if (faces.length === 0) {
    return { ok: false, reason: 'Tidak ada wajah — hadap ke kamera', debugInfo };
  }
  if (faces.length > 1) {
    return { ok: false, reason: 'Hanya satu wajah di depan kamera', debugInfo };
  }

  const f = faces[0];
  const score = f.score ?? 0;
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

  return { ok: true, debugInfo };
}

export interface DebugInfo {
  faceCount: number;
  score: number;
  box: number[] | null;
  detectMs: number;
  backend: string;
}

/** Reset singleton — untuk retry setelah gagal. */
export function resetHuman(): void {
  humanInstance = null;
  loadPromise = null;
  activeBackend = 'unknown';
}
