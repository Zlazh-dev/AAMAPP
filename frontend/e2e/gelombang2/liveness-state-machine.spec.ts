/**
 * Spec: livenessStateMachine (murni, tanpa kamera)
 *
 * Memberi urutan frame yang meniru log lapangan pemilik produk:
 *  - frame n/a (lmResult null) di tengah urutan
 *  - frame gagal-kualitas saat jendela ambil
 *  - pose toleh dengan qualityOk=false (box bergeser, skor turun)
 *
 * Aseritif: tantangan TETAP selesai (semua 3 pose capture berhasil).
 */

import { test, expect } from '@playwright/test';
import {
  initialPoseState,
  reducePose,
  initialBlinkState,
  reduceBlink,
  type FrameInput,
  type PoseState,
  type PoseDecision,
  POSE_WINDOW_MS,
  YAW_THRESHOLD,
} from '../../src/lib/livenessStateMachine';

/** Jalankan urutan frame melalui reducer pose; kembalikan state akhir + keputusan. */
function runPoseFrames(
  frames: FrameInput[],
  start: PoseState = initialPoseState(),
): { state: PoseState; decisions: PoseDecision[] } {
  let state = start;
  const decisions: PoseDecision[] = [];
  for (const f of frames) {
    const { state: next, decision } = reducePose(state, f);
    state = next;
    decisions.push(decision);
  }
  return { state, decisions };
}

/** Helper: buat frame dengan field wajib. */
function frame(opts: Partial<FrameInput>): FrameInput {
  return {
    lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 },
    qualityOk: true,
    poseElapsedMs: 0,
    captureResult: null,
    ...opts,
  };
}

// ─── Pose 3-tahap: Depan → turn-first → turn-opposite ─────────────────────

test.describe('Pose state machine — 3 pose flow', () => {
  test('menyelesaikan semua 3 pose meski ada frame n/a & gagal-kualitas di jendela ambil', () => {
    const frames: FrameInput[] = [
      // ── Pose 0 (Depan): stabil → challenge-passed ──
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      frame({ lm: { yaw: 2, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      // Frame ke-2: challenge-passed (|yaw|<12, qualityOk)
      // ── Jendela ambil pose 0 ──
      // Bug1: capture gagal → skip, jangan reset
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true, captureResult: 'fail', poseElapsedMs: 100 }),
      // Bug4: frame n/a di tengah jendela ambil → skip, jangan reset
      frame({ lm: null, poseElapsedMs: 200 }),
      // Capture berhasil → advance ke pose 1
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true, captureResult: 'success', poseElapsedMs: 300 }),

      // ── Pose 1 (turn-first): stabil → challenge-passed ──
      // Bug4: frame n/a di awal pose 1 → skip
      frame({ lm: null }),
      // yaw belum cukup
      frame({ lm: { yaw: 10, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      // Bug2: qualityOk=false (box bergeser saat menoleh) tapi yaw cukup → PASSED
      frame({ lm: { yaw: 20, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
      // ── Jendela ambil pose 1 ──
      // Bug1: capture gagal → skip
      frame({ lm: { yaw: 18, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false, captureResult: 'fail', poseElapsedMs: 50 }),
      // Capture berhasil → advance ke pose 2
      frame({ lm: { yaw: 16, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false, captureResult: 'success', poseElapsedMs: 100 }),

      // ── Pose 2 (turn-opposite): harus arah berlawanan dari pose 1 (sign=+1) ──
      // Arah sama (+20) → tidak boleh pass
      frame({ lm: { yaw: 20, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
      // Bug3: arah berlawanan (-18) → PASSED
      frame({ lm: { yaw: -18, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
      // Capture berhasil → all-complete
      frame({ lm: { yaw: -16, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false, captureResult: 'success', poseElapsedMs: 50 }),
    ];

    const { state, decisions } = runPoseFrames(frames);

    // Semua 3 pose selesai
    expect(state.poseIndex).toBe(3);
    // Keputusan terakhir = all-complete
    expect(decisions[decisions.length - 1].kind).toBe('all-complete');
    // Tidak ada keputusan 'window-expired' di tengah (tantangan tidak pernah direset)
    expect(decisions.some((d) => d.kind === 'window-expired')).toBe(false);
  });

  test('Bug4: frame n/a (lmResult null) tidak pernah mereset tantangan', () => {
    const frames: FrameInput[] = [
      // Pose 0: challenge-passed
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      // Jendela ambil: 5 frame n/a berturut-turut (masih dalam jendela <3s)
      frame({ lm: null, poseElapsedMs: 100 }),
      frame({ lm: null, poseElapsedMs: 200 }),
      frame({ lm: null, poseElapsedMs: 300 }),
      frame({ lm: null, poseElapsedMs: 400 }),
      frame({ lm: null, poseElapsedMs: 500 }),
      // Capture berhasil → advance
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, captureResult: 'success', poseElapsedMs: 600 }),
    ];

    const { state, decisions } = runPoseFrames(frames);

    // Pose 0 selesai, lanjut ke pose 1 (tidak ter-reset ke pose 0)
    expect(state.poseIndex).toBe(1);
    // Semua keputusan frame n/a = skip (bukan window-expired, bukan wait)
    const nullDecisions = decisions.slice(2, 7);
    expect(nullDecisions.every((d) => d.kind === 'skip')).toBe(true);
  });

  test('Bug1: jendela 3 detik habis → reset tantangan (satu-satunya reset path)', () => {
    const frames: FrameInput[] = [
      // Pose 0: challenge-passed
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: true }),
      // Jendela ambil: capture gagal berulang, lalu jendela habis
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, captureResult: 'fail', poseElapsedMs: 1000 }),
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, captureResult: 'fail', poseElapsedMs: 2500 }),
      // Jendela habis (>3000ms) → window-expired, challengePassed=false
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, captureResult: null, poseElapsedMs: POSE_WINDOW_MS + 100 }),
    ];

    const { state, decisions } = runPoseFrames(frames);

    // Tantangan direset — masih di pose 0, challengePassed=false
    expect(state.poseIndex).toBe(0);
    expect(state.challengePassed).toBe(false);
    // Ada keputusan window-expired
    expect(decisions.some((d) => d.kind === 'window-expired')).toBe(true);
  });
});

// ─── Bug2: gerbang longgar untuk pose toleh ────────────────────────────────

test.describe('Bug2: gerbang kualitas longgar untuk pose toleh', () => {
  test('pose Depan dengan qualityOk=false → wait (gerbang penuh)', () => {
    const frames: FrameInput[] = [
      frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
    ];
    const { decisions } = runPoseFrames(frames);
    expect(decisions[0].kind).toBe('wait');
  });

  test('pose turn-first dengan qualityOk=false + yaw cukup → challenge-passed', () => {
    // Mulai langsung di pose 1
    const start: PoseState = { poseIndex: 1, challengePassed: false, challengeSign: 0 };
    const frames: FrameInput[] = [
      frame({ lm: { yaw: 20, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
    ];
    const { state, decisions } = runPoseFrames(frames, start);
    expect(decisions[0].kind).toBe('challenge-passed');
    expect(state.challengePassed).toBe(true);
  });

  test('pose turn-opposite dengan qualityOk=false + yaw berlawanan → challenge-passed', () => {
    const start: PoseState = { poseIndex: 2, challengePassed: false, challengeSign: 1 };
    const frames: FrameInput[] = [
      frame({ lm: { yaw: -18, blinkL: 0.2, blinkR: 0.2 }, qualityOk: false }),
    ];
    const { decisions } = runPoseFrames(frames, start);
    expect(decisions[0].kind).toBe('challenge-passed');
  });
});

// ─── Bug3: arah toleh tidak di-hardcode (imun cermin) ──────────────────────

test.describe('Bug3: arah toleh bebas, lawan arah untuk pose ke-3', () => {
  test('pose 1 yaw positif → sign=+1, pose 2 butuh yaw negatif', () => {
    let state = initialPoseState();
    // Pose 0: pass
    let r = reducePose(state, frame({ lm: { yaw: 0, blinkL: 0.2, blinkR: 0.2 } }));
    state = r.state;
    expect(state.challengePassed).toBe(true);

    // Advance ke pose 1
    state = { poseIndex: 1, challengePassed: false, challengeSign: 0 };
    // Pose 1: yaw +20 → sign harus +1
    r = reducePose(state, frame({ lm: { yaw: 20, blinkL: 0.2, blinkR: 0.2 } }));
    state = r.state;
    expect(state.challengeSign).toBe(1);
    expect(r.decision.kind).toBe('challenge-passed');

    // Advance ke pose 2
    state = { poseIndex: 2, challengePassed: false, challengeSign: 1 };
    // Pose 2: yaw +20 (arah sama) → TIDAK boleh pass
    r = reducePose(state, frame({ lm: { yaw: 20, blinkL: 0.2, blinkR: 0.2 } }));
    expect(r.decision.kind).toBe('wait');
    // Pose 2: yaw -18 (berlawanan) → pass
    r = reducePose(state, frame({ lm: { yaw: -18, blinkL: 0.2, blinkR: 0.2 } }));
    expect(r.decision.kind).toBe('challenge-passed');
  });

  test('pose 1 yaw negatif → sign=-1, pose 2 butuh yaw positif (cermin)', () => {
    let state: PoseState = { poseIndex: 1, challengePassed: false, challengeSign: 0 };
    // Pose 1: yaw -20 → sign harus -1
    let r = reducePose(state, frame({ lm: { yaw: -20, blinkL: 0.2, blinkR: 0.2 } }));
    state = r.state;
    expect(state.challengeSign).toBe(-1);

    // Pose 2: yaw -20 (arah sama) → TIDAK boleh pass
    state = { poseIndex: 2, challengePassed: false, challengeSign: -1 };
    r = reducePose(state, frame({ lm: { yaw: -20, blinkL: 0.2, blinkR: 0.2 } }));
    expect(r.decision.kind).toBe('wait');
    // Pose 2: yaw +18 (berlawanan) → pass
    r = reducePose(state, frame({ lm: { yaw: 18, blinkL: 0.2, blinkR: 0.2 } }));
    expect(r.decision.kind).toBe('challenge-passed');
  });
});

// ─── Bug5: deteksi kedip = pola naik ≥0.45 lalu turun ≤1 detik ─────────────

test.describe('Bug5: blink state machine (pola naik-turun, bukan ambang statis)', () => {
  test('pola valid: baseline → naik ≥0.45 → turun ke baseline dalam 1s = kedip', () => {
    let state = initialBlinkState();
    let blinked = false;

    // Baseline (mata terbuka ~0.2)
    ({ state, blinked } = reduceBlink(state, 0.2, 0));
    expect(blinked).toBe(false);

    // Naik ke 0.5 (mata tertutup)
    ({ state, blinked } = reduceBlink(state, 0.5, 100));
    expect(blinked).toBe(false);
    expect(state.phase).toBe('rising');

    // Mulai turun → peaked
    ({ state, blinked } = reduceBlink(state, 0.4, 200));
    expect(blinked).toBe(false);
    expect(state.phase).toBe('peaked');

    // Turun ke baseline (≤0.3) dalam 1 detik → KEDIP
    ({ state, blinked } = reduceBlink(state, 0.22, 300));
    expect(blinked).toBe(true);
    expect(state.phase).toBe('idle');
  });

  test('ambang statis 0.5 sesaat TIDAK memicu kedip (tanpa pola naik-turun)', () => {
    let state = initialBlinkState();
    // Lonceng ke 0.5 tanpa transisi rising→peaked→fall
    let { state: s, blinked } = reduceBlink(state, 0.5, 0);
    state = s;
    // Baru rising, belum kedip
    expect(blinked).toBe(false);

    // Tetap di 0.5 (tidak turun) → belum kedip
    ({ state: s, blinked } = reduceBlink(state, 0.5, 100));
    expect(blinked).toBe(false);

    ({ state: s, blinked } = reduceBlink(state, 0.5, 200));
    expect(blinked).toBe(false);
  });

  test('turun terlalu lambat (>1 detik) → bukan kedip valid', () => {
    let state = initialBlinkState();
    let blinked = false;

    // Naik
    ({ state, blinked } = reduceBlink(state, 0.5, 0));
    expect(blinked).toBe(false);
    // Mulai turun → peaked
    ({ state, blinked } = reduceBlink(state, 0.4, 100));
    expect(blinked).toBe(false);

    // Turun ke baseline TAPI setelah >1000ms → bukan kedip
    ({ state, blinked } = reduceBlink(state, 0.22, 1200));
    expect(blinked).toBe(false);
    expect(state.phase).toBe('idle');
  });

  test('baseline mata terbuka 0.16–0.26 tidak memicu false positive', () => {
    let state = initialBlinkState();
    // Beberapa frame di baseline terbuka → tidak ada kedip
    for (let i = 0; i < 10; i++) {
      const v = 0.16 + (i % 3) * 0.05; // 0.16, 0.21, 0.26 berulang
      const { state: s, blinked } = reduceBlink(state, v, i * 33);
      state = s;
      expect(blinked).toBe(false);
    }
  });
});
