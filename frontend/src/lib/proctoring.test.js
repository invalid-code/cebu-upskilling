import { describe, it, expect } from 'vitest';
import { getHeadAngles, isLookingAway, evaluateProctorFrame, YAW_THRESHOLD_DEG, PITCH_THRESHOLD_DEG } from './proctoring';

// Helpers to build column-major 4x4 matrices MediaPipe uses.
function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function yawMatrix(deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // col-major: col0=[c,0,-s,0], col1=[0,1,0,0], col2=[s,0,c,0], col3=[0,0,0,1]
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

function pitchMatrix(deg) {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  // col-major: col0=[1,0,0,0], col1=[0,c,s,0], col2=[0,-s,c,0]
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

describe('proctoring — port of github.com/AaravMehta-07/Exam-Cheating-Detection-Application-Using-Python', () => {
  it('getHeadAngles returns ~0 for an identity (facing camera)', () => {
    const a = getHeadAngles(identityMatrix());
    expect(a.yaw).toBeCloseTo(0, 0);
    expect(a.pitch).toBeCloseTo(0, 0);
    expect(a.roll).toBeCloseTo(0, 0);
  });

  it('getHeadAngles computes yaw ~+30° for a 30° yaw', () => {
    const a = getHeadAngles(yawMatrix(30));
    expect(a.yaw).toBeCloseTo(30, 0);
    expect(Math.abs(a.pitch)).toBeLessThan(1);
  });

  it('getHeadAngles computes negative yaw for right turn', () => {
    const a = getHeadAngles(yawMatrix(-35));
    expect(a.yaw).toBeCloseTo(-35, 0);
  });

  it('getHeadAngles computes pitch', () => {
    const a = getHeadAngles(pitchMatrix(20));
    expect(a.pitch).toBeCloseTo(20, 0);
  });

  it('returns null for missing/short matrix', () => {
    expect(getHeadAngles(null)).toBeNull();
    expect(getHeadAngles([])).toBeNull();
    expect(getHeadAngles([1, 2, 3])).toBeNull();
  });

  it('isLookingAway is false when head is straight', () => {
    expect(isLookingAway({ yaw: 0, pitch: 0, roll: 0 })).toBe(false);
    expect(isLookingAway({ yaw: 5, pitch: -8, roll: 0 })).toBe(false);
  });

  it('isLookingAway is true once yaw exceeds threshold', () => {
    expect(isLookingAway({ yaw: YAW_THRESHOLD_DEG + 1, pitch: 0, roll: 0 })).toBe(true);
    expect(isLookingAway({ yaw: -(YAW_THRESHOLD_DEG + 5), pitch: 0, roll: 0 })).toBe(true);
  });

  it('isLookingAway is true once pitch exceeds threshold', () => {
    expect(isLookingAway({ yaw: 0, pitch: PITCH_THRESHOLD_DEG + 1, roll: 0 })).toBe(true);
  });

  it('evaluateProctorFrame reports noFace when no landmarks', () => {
    const f = evaluateProctorFrame({ faceLandmarkerResult: { faceLandmarks: [], facialTransformationMatrixes: [] } });
    expect(f.noFace).toBe(true);
    expect(f.multipleFaces).toBe(false);
    expect(f.lookingAway).toBe(false);
    expect(f.faceCount).toBe(0);
  });

  it('evaluateProctorFrame reports multipleFaces', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}], [{}]], facialTransformationMatrixes: [{ data: identityMatrix() }, { data: identityMatrix() }] },
    });
    expect(f.multipleFaces).toBe(true);
    expect(f.noFace).toBe(false);
    expect(f.faceCount).toBe(2);
  });

  it('evaluateProctorFrame flags lookingAway via head pose', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: yawMatrix(35) }] },
    });
    expect(f.lookingAway).toBe(true);
    expect(f.multipleFaces).toBe(false);
    expect(f.noFace).toBe(false);
    expect(f.headAngles.yaw).toBeCloseTo(35, 0);
  });

  it('evaluateProctorFrame does not flag lookingAway when facing forward', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: identityMatrix() }] },
    });
    expect(f.lookingAway).toBe(false);
  });

  it('evaluateProctorFrame flags phone/book detection', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: identityMatrix() }] },
      objectDetectorResult: {
        detections: [
          { categories: [{ categoryName: 'cell phone', score: 0.88 }], boundingBox: {} },
        ],
      },
    });
    expect(f.phoneDetected).toBe(true);
  });

  it('evaluateProctorFrame ignores low-score phone detection', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: identityMatrix() }] },
      objectDetectorResult: {
        detections: [{ categories: [{ categoryName: 'cell phone', score: 0.2 }] }],
      },
    });
    expect(f.phoneDetected).toBe(false);
  });

  it('evaluateProctorFrame detects laptop/book as phone-risk', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: identityMatrix() }] },
      objectDetectorResult: { detections: [{ categories: [{ categoryName: 'book', score: 0.9 }] }] },
    });
    expect(f.phoneDetected).toBe(true);
  });

  it('evaluateProctorFrame tolerates missing objectDetectorResult', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [{ data: identityMatrix() }] },
      objectDetectorResult: null,
    });
    expect(f.phoneDetected).toBe(false);
    expect(f.lookingAway).toBe(false);
  });

  it('evaluateProctorFrame handles missing transformation matrix', () => {
    const f = evaluateProctorFrame({
      faceLandmarkerResult: { faceLandmarks: [[{}]], facialTransformationMatrixes: [] },
    });
    expect(f.lookingAway).toBe(false);
    expect(f.headAngles).toBeNull();
  });
});
