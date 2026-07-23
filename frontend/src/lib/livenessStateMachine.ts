/**
 * State machine murni untuk liveness challenge (tanpa kamera/side-effect).
 *
 * Cacat yang diperbaiki vs implementasi lama:
 *  1. Frame gagal-kualitas saat jendela ambil → LEWATI, bukan reset tantangan.
 *     Reset HANYA saat jendela 3 detik habis.
 *  2. Pose menoleh (turn-first / turn-opposite) → gerbang longgar: cukup
 *     lmResult ada + yaw lewat ambang. Syarat wajah-di-tengah & ambang skor
 *     penuh HANYA untuk pose Depan.
 *  3. Arah toleh tidak di-hardcode. Pose ke-2 (turn-first) = yaw melewati
 *     ±15° ke SALAH SATU arah (tanda dicatat). Pose ke-3 (turn-opposite) =
 *     melewati 15° ke arah berlawanan. Imun terhadap cermin & konvensi tanda.
 *  4. lmResult = null (frame n/a) → lewati frame, jangan pernah gagal/reset.
 */

export interface LmFrame {
  yaw: number;
  blinkL: number;
  blinkR: number;
}

export type PoseRole = 'depan' | 'turn-first' | 'turn-opposite';

export interface FrameInput {
  /** null = frame n/a (deteksi gagal) → skip, tidak pernah gagal/reset */
  lm: LmFrame | null;
  /** Hasil gerbang kualitas penuh (skor + wajah-di-tengah). Hanya wajib untuk pose Depan. */
  qualityOk: boolean;
  /** ms sejak pose saat ini dimulai (untuk cek jendela 3 detik) */
  poseElapsedMs: number;
  /** Hasil upaya capture (detectEmbedding) — hanya relevan saat di jendela ambil */
  captureResult: 'success' | 'fail' | null;
}

export interface PoseState {
  poseIndex: number;
  challengePassed: boolean;
  /** Tanda arah yaw pose ke-2. 0 = belum diset (hanya setelah turn-first pass). */
  challengeSign: 0 | 1 | -1;
}

export type PoseDecision =
  | { kind: 'skip' }
  | { kind: 'wait'; hint: string }
  | { kind: 'challenge-passed'; hint: string }
  | { kind: 'attempt-capture' }
  | { kind: 'pose-advance'; nextPoseIndex: number; hint: string }
  | { kind: 'window-expired' }
  | { kind: 'all-complete' };

export const MIN_POSES = 3;
export const POSE_WINDOW_MS = 3000;
export const YAW_THRESHOLD = 15;
export const YAW_DEPAN_MAX = 12;

export function roleForPose(idx: number): PoseRole {
  if (idx === 0) return 'depan';
  if (idx === 1) return 'turn-first';
  return 'turn-opposite';
}

export function initialPoseState(): PoseState {
  return { poseIndex: 0, challengePassed: false, challengeSign: 0 };
}

export function reducePose(
  state: PoseState,
  frame: FrameInput,
): { state: PoseState; decision: PoseDecision } {
  const role = roleForPose(state.poseIndex);

  // ── Sudah di jendela ambil (challengePassed=true) ───────────────────────
  if (state.challengePassed) {
    // Bug1: jendela 3 detik habis → reset (satu-satunya reset path)
    if (frame.poseElapsedMs >= POSE_WINDOW_MS) {
      return {
        state: { ...state, challengePassed: false },
        decision: { kind: 'window-expired' },
      };
    }

    // Bug4: frame n/a saat ambil → skip, jangan reset
    if (frame.lm === null) {
      return { state, decision: { kind: 'skip' } };
    }

    // Capture sudah dicoba frame ini
    if (frame.captureResult === 'success') {
      const nextPoseIndex = state.poseIndex + 1;
      if (nextPoseIndex >= MIN_POSES) {
        return {
          state: { poseIndex: nextPoseIndex, challengePassed: false, challengeSign: 0 },
          decision: { kind: 'all-complete' },
        };
      }
      // Reset untuk pose berikutnya
      return {
        state: { poseIndex: nextPoseIndex, challengePassed: false, challengeSign: 0 },
        decision: {
          kind: 'pose-advance',
          nextPoseIndex,
          hint: `Pose ${nextPoseIndex + 1}/${MIN_POSES}`,
        },
      };
    }

    // Bug1: capture gagal / belum dicoba → skip, TIDAK reset (jendela masih terbuka)
    return { state, decision: { kind: 'attempt-capture' } };
  }

  // ── Fase tantangan (challengePassed=false) ──────────────────────────────

  // Bug4: lmResult null → skip frame, jangan pernah gagal/reset
  if (frame.lm === null) {
    return { state, decision: { kind: 'skip' } };
  }

  const yaw = frame.lm.yaw;

  if (role === 'depan') {
    // Bug2: pose Depan → gerbang kualitas penuh (skor + wajah-di-tengah)
    if (!frame.qualityOk) {
      return { state, decision: { kind: 'wait', hint: 'Lihat lurus ke depan, wajah di tengah…' } };
    }
    if (Math.abs(yaw) < YAW_DEPAN_MAX) {
      return {
        state: { ...state, challengePassed: true },
        decision: { kind: 'challenge-passed', hint: 'Pose depan terdeteksi' },
      };
    }
    return { state, decision: { kind: 'wait', hint: 'Lihat lurus ke depan…' } };
  }

  // Bug2: pose turn → gerbang longgar (cukup lmResult ada, tanpa qualityOk)
  if (role === 'turn-first') {
    // Bug3: arah bebas — catat tanda
    if (Math.abs(yaw) >= YAW_THRESHOLD) {
      const sign: 1 | -1 = yaw > 0 ? 1 : -1;
      return {
        state: { ...state, challengePassed: true, challengeSign: sign },
        decision: { kind: 'challenge-passed', hint: 'Toleh ke satu sisi terdeteksi' },
      };
    }
    return { state, decision: { kind: 'wait', hint: 'Toleh ke satu sisi (kiri atau kanan)…' } };
  }

  // role === 'turn-opposite'
  // Bug3: arah berlawanan dari tanda yang dicatat
  const wantSign: 1 | -1 = state.challengeSign === 0 ? 1 : ((-state.challengeSign) as 1 | -1);
  if (Math.sign(yaw) === wantSign && Math.abs(yaw) >= YAW_THRESHOLD) {
    return {
      state: { ...state, challengePassed: true },
      decision: { kind: 'challenge-passed', hint: 'Pose sisi sebaliknya terdeteksi' },
    };
  }
  return { state, decision: { kind: 'wait', hint: 'Sekarang toleh ke sisi sebaliknya…' } };
}

// ── Blink challenge (ScanOverlay) ─────────────────────────────────────────
// Baseline mata terbuka di lapangan: 0.16–0.26. Deteksi kedip = pola naik
// ≥0.45 lalu turun kembali ke baseline dalam ≤1 detik (bukan ambang statis).

export interface BlinkState {
  phase: 'idle' | 'rising' | 'peaked';
  riseStartMs: number | null;
  peakValue: number;
}

export const BLINK_RISE_THRESHOLD = 0.45;
export const BLINK_OPEN_MAX = 0.3; // di atas baseline 0.26 → mata dianggap terbuka lagi
export const BLINK_WINDOW_MS = 1000;

export function initialBlinkState(): BlinkState {
  return { phase: 'idle', riseStartMs: null, peakValue: 0 };
}

export function reduceBlink(
  state: BlinkState,
  value: number,
  nowMs: number,
): { state: BlinkState; blinked: boolean } {
  if (state.phase === 'idle') {
    if (value >= BLINK_RISE_THRESHOLD) {
      return {
        state: { phase: 'rising', riseStartMs: nowMs, peakValue: value },
        blinked: false,
      };
    }
    return { state, blinked: false };
  }

  if (state.phase === 'rising') {
    // Masih naik / di puncak
    if (value >= state.peakValue) {
      return { state: { ...state, peakValue: value }, blinked: false };
    }
    // Mulai turun → peaked
    return { state: { ...state, phase: 'peaked' }, blinked: false };
  }

  // phase === 'peaked' — tunggu turun ke baseline dalam jendela 1 detik
  const elapsed = nowMs - (state.riseStartMs ?? nowMs);
  if (elapsed > BLINK_WINDOW_MS) {
    // Terlalu lambat → bukan kedip valid, reset
    return { state: initialBlinkState(), blinked: false };
  }
  if (value <= BLINK_OPEN_MAX) {
    // Turun ke baseline dalam jendela → kedip valid
    return { state: initialBlinkState(), blinked: true };
  }
  return { state, blinked: false };
}
