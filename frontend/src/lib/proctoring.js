// Browser port of exam-cheating heuristics from
// https://github.com/AaravMehta-07/Exam-Cheating-Detection-Application-Using-Python
//   Python (OpenCV+MediaPipe+YOLOv8) → Browser (MediaPipe Tasks Vision + getUserMedia).
//   FaceLandmarker replaces MediaPipe Face Mesh + head-pose; ObjectDetector replaces YOLOv8
//   for phone/book. Counting faces, estimating head yaw/pitch from the facial
//   transformation matrix, and checking COCO categories for phone/book.

export const YAW_THRESHOLD_DEG = 22;
export const PITCH_THRESHOLD_DEG = 18;
export const MIN_FACE_SCORE = 0.5;

// How many consecutive flagged frames before we emit an event. At ~10
// inferences/s, 12 frames ~ 1.2 s of sustained looking-away avoids flicker.
export const SUSTAINED_FRAMES = 12;
// Cool-down frames before the same event may re-fire.
export const COOLDOWN_FRAMES = 30;

// ---------------------------------------------------------------------------
// Pure helpers — fully unit-testable without a camera or MediaPipe.
// ---------------------------------------------------------------------------

/**
 * Convert a MediaPipe facial transformation matrix (16 floats, column-major)
 * into yaw/pitch/roll in degrees.
 * Column layout: col0=m[0..3], col1=m[4..7], col2=m[8..11], col3=m[12..15].
 * Face forward is +Z in the canonical model. When the user faces the camera
 * yaw/pitch/roll are ~0; yaw grows on left/right turn, pitch on up/down.
 */
export function getHeadAngles(data) {
  if (!data || data.length < 16) return null;
  const m = data;
  const yaw = Math.atan2(m[8], m[10]) * 180 / Math.PI;
  const pitch = Math.atan2(-m[9], Math.hypot(m[8], m[10])) * 180 / Math.PI;
  const roll = Math.atan2(m[4], m[0]) * 180 / Math.PI;
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch) || !Number.isFinite(roll)) return null;
  return { yaw, pitch, roll };
}

export function isLookingAway(angles, yawTh = YAW_THRESHOLD_DEG, pitchTh = PITCH_THRESHOLD_DEG) {
  if (!angles) return false;
  return Math.abs(angles.yaw) > yawTh || Math.abs(angles.pitch) > pitchTh;
}

const PHONE_BOOK_LABELS = new Set(['cell phone', 'book', 'laptop', 'tablet', 'cellphone']);

/**
 * Evaluate a single frame's MediaPipe results into proctor flags.
 * @param {object} faceLandmarkerResult - FaceLandmarkerResult (faceLandmarks, facialTransformationMatrixes)
 * @param {object|null} objectDetectorResult - ObjectDetectorResult (detections)
 * @returns {{lookingAway:boolean,multipleFaces:boolean,noFace:boolean,phoneDetected:boolean,headAngles:object|null,faceCount:number}}
 */
export function evaluateProctorFrame({ faceLandmarkerResult, objectDetectorResult } = {}) {
  const faceCount = faceLandmarkerResult?.faceLandmarks?.length ?? 0;
  const multipleFaces = faceCount > 1;
  const noFace = faceCount === 0;

  let lookingAway = false;
  let headAngles = null;
  if (faceCount === 1) {
    const m = faceLandmarkerResult?.facialTransformationMatrixes?.[0]?.data;
    if (m) {
      headAngles = getHeadAngles(m);
      lookingAway = isLookingAway(headAngles);
    }
  }

  let phoneDetected = false;
  const detections = objectDetectorResult?.detections ?? [];
  for (const d of detections) {
    for (const c of d.categories ?? []) {
      const name = String(c.categoryName ?? c.displayName ?? '').toLowerCase().replace(/[_-]/g, ' ');
      if (PHONE_BOOK_LABELS.has(name) && (c.score ?? 0) > MIN_FACE_SCORE) {
        phoneDetected = true;
        break;
      }
    }
    if (phoneDetected) break;
  }

  return { lookingAway, multipleFaces, noFace, phoneDetected, headAngles, faceCount };
}

// ---------------------------------------------------------------------------
// Runtime controller — owns webcam + MediaPipe tasks + rAF loop.
// Lazy-imports @mediapipe/tasks-vision so tests/jsdom can import this file
// without requiring WASM or a camera.
// ---------------------------------------------------------------------------

const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const OBJECT_DETECTOR_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite';

function toIntegrityType(flag) {
  switch (flag) {
    case 'lookingAway': return 'LookingAway';
    case 'multipleFaces': return 'MultipleFaces';
    case 'noFace': return 'NoFace';
    case 'phoneDetected': return 'PhoneDetected';
    default: return flag;
  }
}

/**
 * Start browser proctoring.
 * @param {object} opts
 * @param {HTMLVideoElement} opts.videoEl - <video> to render the webcam (caller creates it)
 * @param {(eventType:string, detail:string)=>void} opts.onEvent - called debounced per flag
 * @param {(status:string, detail?:string)=>void} [opts.onStatus]
 * @param {string} [opts.wasmBase] - override WASM CDN base
 * @returns {Promise<{stop:()=>void, getFlags:()=>object}>}
 */
export async function createProctor({ videoEl, onEvent, onStatus, wasmBase } = {}) {
  if (!videoEl) throw new Error('createProctor: videoEl required');
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    onStatus?.('unsupported', 'Camera not available');
    return { stop: () => {}, getFlags: () => ({}) };
  }

  const vision = await import('@mediapipe/tasks-vision');
  const { FilesetResolver, FaceLandmarker, ObjectDetector } = vision;

  const wasmFileset = await FilesetResolver.forVisionTasks(
    wasmBase ?? 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  );

  const faceLandmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
    baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL },
    runningMode: 'VIDEO',
    numFaces: 2,
    outputFacialTransformationMatrixes: true,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let objectDetector = null;
  try {
    objectDetector = await ObjectDetector.createFromOptions(wasmFileset, {
      baseOptions: { modelAssetPath: OBJECT_DETECTOR_MODEL },
      runningMode: 'VIDEO',
      maxResults: 5,
      scoreThreshold: 0.5,
    });
  } catch {
    // Phone/book check is best-effort; face-only proctoring still works.
    objectDetector = null;
  }

  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
  } catch (err) {
    onStatus?.('denied', err?.message ?? 'Camera permission denied');
    faceLandmarker.close();
    objectDetector?.close();
    throw err;
  }

  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.playsInline = true;
  await videoEl.play().catch(() => {});
  await new Promise((resolve) => {
    if (videoEl.readyState >= 2) return resolve();
    const onLoaded = () => resolve();
    videoEl.addEventListener('loadeddata', onLoaded, { once: true });
    setTimeout(resolve, 1000);
  });

  onStatus?.('active');

  let raf = 0;
  let lastTs = 0;
  const counters = { lookingAway: 0, multipleFaces: 0, noFace: 0, phoneDetected: 0 };
  const cooldowns = { lookingAway: 0, multipleFaces: 0, noFace: 0, phoneDetected: 0 };
  const lastFlags = { lookingAway: false, multipleFaces: false, noFace: false, phoneDetected: false };

  const maybeEmit = (flag, detail) => {
    if (cooldowns[flag] > 0) return;
    cooldowns[flag] = COOLDOWN_FRAMES;
    onEvent?.(toIntegrityType(flag), detail);
  };

  const tick = () => {
    const now = performance.now();
    // Throttle inference to ~10 Hz to save CPU while video renders at native rate.
    if (now - lastTs < 90) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastTs = now;

    try {
      const ts = now;
      const faceRes = faceLandmarker.detectForVideo(videoEl, ts);
      const objRes = objectDetector ? objectDetector.detectForVideo(videoEl, ts) : null;
      const { lookingAway, multipleFaces, noFace, phoneDetected } = evaluateProctorFrame({
        faceLandmarkerResult: faceRes,
        objectDetectorResult: objRes,
      });
      const flags = { lookingAway, multipleFaces, noFace, phoneDetected };

      for (const k of Object.keys(flags)) {
        if (cooldowns[k] > 0) cooldowns[k] -= 1;
        if (flags[k]) counters[k] += 1;
        else counters[k] = 0;

        if (counters[k] >= SUSTAINED_FRAMES && !lastFlags[k]) {
          const detail =
            k === 'lookingAway'
              ? 'Learner looked away from the screen'
              : k === 'multipleFaces'
                ? 'Multiple faces detected in frame'
                : k === 'noFace'
                  ? 'No face detected in frame'
                  : 'Phone/book detected in frame';
          maybeEmit(k, detail);
          lastFlags[k] = true;
        }
        if (!flags[k] && lastFlags[k] && counters[k] === 0) lastFlags[k] = false;
      }
    } catch {
      // Per-frame errors are expected transiently; keep the loop alive.
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  const stop = () => {
    cancelAnimationFrame(raf);
    try { faceLandmarker.close(); } catch {}
    try { objectDetector?.close(); } catch {}
    if (stream) for (const t of stream.getTracks()) t.stop();
    try { videoEl.pause(); } catch {}
    videoEl.srcObject = null;
    onStatus?.('idle');
  };

  const getFlags = () => ({ ...lastFlags });

  return { stop, getFlags };
}
