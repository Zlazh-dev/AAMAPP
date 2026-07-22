import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;
let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export async function loadFaceLandmarker(onProgress?: (pct: number, label: string) => void): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    onProgress?.(10, 'Inisialisasi MediaPipe…');
    const vision = await FilesetResolver.forVisionTasks('/mediapipe');
    
    onProgress?.(30, 'Memuat model FaceLandmarker…');
    const fl = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: '/mediapipe/face_landmarker.task',
        // Fallback GPU ke CPU otomatis ditangani MediaPipe jika tidak diset, tapi biarkan default CPU untuk stabilitas/kesederhanaan
        delegate: 'GPU',
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: 'VIDEO',
      numFaces: 1,
    });
    
    onProgress?.(100, 'MediaPipe siap');
    faceLandmarker = fl;
    return fl;
  })();

  landmarkerPromise.catch((e) => {
    console.error('[FaceLandmarker] Gagal memuat:', e);
    landmarkerPromise = null;
    faceLandmarker = null;
  });

  return landmarkerPromise;
}

export interface LivenessResult {
  blinkL: number;
  blinkR: number;
  yaw: number;
}

/**
 * Deteksi liveness (blink & head pose) dengan FaceLandmarker.
 */
export async function detectLiveness(video: HTMLVideoElement, timestampMs: number): Promise<LivenessResult | null> {
  const fl = await loadFaceLandmarker();
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  try {
    const result = fl.detectForVideo(video, timestampMs);
    if (!result.faceBlendshapes || result.faceBlendshapes.length === 0) return null;
    
    const shapes = result.faceBlendshapes[0].categories;
    const blinkL = shapes.find((c) => c.categoryName === 'eyeBlinkLeft')?.score ?? 0;
    const blinkR = shapes.find((c) => c.categoryName === 'eyeBlinkRight')?.score ?? 0;

    let yaw = 0;
    if (result.facialTransformationMatrixes && result.facialTransformationMatrixes.length > 0) {
      const matrix = result.facialTransformationMatrixes[0].data;
      // matrix is 4x4, row-major.
      // 0  1  2  3
      // 4  5  6  7
      // 8  9 10 11
      // 12 13 14 15
      //
      // yaw (rotasi Y) = atan2(-r20, sqrt(r21^2 + r22^2))
      const r20 = matrix[8];
      const r21 = matrix[9];
      const r22 = matrix[10];
      yaw = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22)) * (180 / Math.PI);
    }

    return { blinkL, blinkR, yaw };
  } catch (err) {
    console.warn('[FaceLandmarker] Gagal deteksi frame:', err);
    return null;
  }
}
