/**
 * faceHuman.ts — LAZY wrapper untuk \@vladmandic/human (§12.15).
 *
 * PENTING: file ini TIDAK BOLEH diimpor langsung dari bundle utama.
 * Hanya boleh di-load via dynamic import di dalam komponen kamera
 * (EnrollWizard, ScanOverlay) yang di-lazy-load React.lazy().
 *
 * Alasan: human + model TF.js besar (±15 MB) — harus split chunk.
 */

// Tipe minimal — agar komponen lain tetap type-safe tanpa import human
export interface FaceDetection {
  embedding: number[];
  score: number;
  /** Apakah ada wajah tunggal & skor cukup tinggi */
  ok: boolean;
}

// Singleton instance agar model hanya dimuat sekali per sesi halaman
let humanInstance: import('@vladmandic/human').Human | null = null;
let loadPromise: Promise<import('@vladmandic/human').Human> | null = null;

/**
 * Muat Human + model wajah secara lazy. Panggil sekali; panggilan berulang
 * mengembalikan instance yang sama (memoized Promise).
 */
export async function loadHuman(): Promise<import('@vladmandic/human').Human> {
  if (humanInstance) return humanInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Dynamic import — TIDAK masuk bundle utama (Vite code-split)
    const { default: Human } = await import('@vladmandic/human');

    const cfg = {
      // Nonaktifkan model yang tidak dibutuhkan
      debug: false,
      modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models',
      face: {
        enabled: true,
        detector: { enabled: true, rotation: false, return: true },
        mesh: { enabled: false },
        iris: { enabled: false },
        description: { enabled: true }, // embedding
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
      segmentation: { enabled: false },
    } as unknown as import('@vladmandic/human').Config;

    const instance = new Human(cfg);
    await instance.load();
    humanInstance = instance;
    return instance;
  })();

  return loadPromise;
}

/**
 * Deteksi wajah di frame video dan kembalikan embedding.
 * Kembalikan null bila tidak ada wajah atau skor terlalu rendah.
 *
 * @param video - HTMLVideoElement yang sedang streaming kamera
 * @param minScore - ambang confidence wajah (default 0.6)
 */
export async function detectEmbedding(
  video: HTMLVideoElement,
  minScore = 0.6,
): Promise<FaceDetection | null> {
  const human = await loadHuman();
  const result = await human.detect(video);

  const faces = result.face ?? [];
  if (faces.length === 0) return null;

  // Ambil wajah dengan skor tertinggi
  const best = faces.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b));
  const score = best.score ?? 0;
  if (score < minScore) return null;

  // embedding = array 1D dari descriptor wajah
  const rawEmbed = best.embedding as number[] | Float32Array | undefined;
  if (!rawEmbed || (Array.isArray(rawEmbed) ? rawEmbed.length : rawEmbed.length) === 0) {
    return null;
  }

  const embedding = Array.isArray(rawEmbed) ? rawEmbed : Array.from(rawEmbed);

  return { embedding, score, ok: true };
}

/**
 * Cek kualitas pose / liveness ringan:
 * - Ada tepat 1 wajah
 * - Skor ≥ minScore
 * - Bounding box cukup besar (wajah tidak terlalu jauh)
 */
export async function checkQuality(
  video: HTMLVideoElement,
  minScore = 0.6,
  minBoxRatio = 0.1, // wajah minimal 10% lebar video
): Promise<{ ok: boolean; reason?: string }> {
  const human = await loadHuman();
  const result = await human.detect(video);

  const faces = result.face ?? [];
  if (faces.length === 0) return { ok: false, reason: 'Wajah tidak terdeteksi' };
  if (faces.length > 1) return { ok: false, reason: 'Posisikan hanya satu wajah' };

  const f = faces[0];
  const score = f.score ?? 0;
  if (score < minScore) return { ok: false, reason: 'Skor deteksi terlalu rendah' };

  // Cek ukuran kotak wajah relatif terhadap video
  const box = f.box; // [x, y, w, h]
  if (box && video.videoWidth > 0) {
    const ratio = box[2] / video.videoWidth;
    if (ratio < minBoxRatio) return { ok: false, reason: 'Dekati kamera lebih dekat' };
  }

  return { ok: true };
}

/** Reset singleton — berguna di unit test atau setelah model gagal load. */
export function resetHuman(): void {
  humanInstance = null;
  loadPromise = null;
}
