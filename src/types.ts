import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export enum ValidationStatus {
  INITIALIZING = 'INITIALIZING',
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  FACE_DETECTED = 'FACE_DETECTED',
  TOO_CLOSE = 'TOO_CLOSE',
  TOO_FAR = 'TOO_FAR',
  OFF_CENTER = 'OFF_CENTER',
  FACE_OBSTRUCTED = 'FACE_OBSTRUCTED',
  HEAD_NOT_STRAIGHT = 'HEAD_NOT_STRAIGHT',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  POOR_ILLUMINATION = 'POOR_ILLUMINATION',
  NOT_NEUTRAL_EXPRESSION = 'NOT_NEUTRAL_EXPRESSION',
  DARK_GLASSES = 'DARK_GLASSES',
  STAY_STILL = 'STAY_STILL',
  CAPTURING = 'CAPTURING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type SupportedLocale = 'pt-BR' | 'en' | 'es';

export interface FaceValidatorOptions {
  /** Optional container element or selector to auto-render UI and media elements. */
  container?: HTMLElement | string;
  /** Optional UI mode. Default: 'default'. */
  ui?: 'default' | 'none';
  /** Auto-start camera if SDK manages the video element. Default: true. */
  autoStart?: boolean;
  /** Mirror preview horizontally. Default: true. */
  mirror?: boolean;
  /** Optional video constraints passed to getUserMedia. */
  videoConstraints?: MediaTrackConstraints;
  /** Optional path to MediaPipe models WASM files. Default: auto-detected from CDN */
  modelPath?: string;
  /** Video element for the camera stream. */
  videoElement?: HTMLVideoElement;
  /** Optional canvas for visual feedback (e.g. face outline). */
  overlayCanvasElement?: HTMLCanvasElement | null;
  /** Optional video width. Default: 640 */
  videoWidth?: number;
  /** Optional video height. Default: 480 */
  videoHeight?: number;
  /** UI language. Default: 'en' */
  locale?: SupportedLocale;
  /** Optional override for specific status messages. */
  customMessages?: Partial<Record<ValidationStatus, string>>;
  /** Callback on each validation status update. */
  onStatusUpdate?: (status: ValidationStatus, message: string) => void;
  /** Callback when selfie is successfully captured (receives Blob). */
  onCaptureSuccess?: (imageBlob: Blob) => void;
  /** Callback on error. */
  onError?: (errorType: ValidationStatus, error: Error) => void;
  /** Optional min detection confidence (0–1). Default: 0.5 */
  minDetectionConfidence?: number;
  /** Optional min brightness (0–255). Default: 70 */
  minIlluminationThreshold?: number;
  /** Optional min face size factor. Default: 0.25 */
  minFaceSizeFactor?: number;
  /** Optional max face size factor. Default: 0.65 */
  maxFaceSizeFactor?: number;
  /** Optional stable time before capture (ms). Default: 1000 */
  stabilizationTimeThreshold?: number;
  /** Optional movement tolerance (px). Default: 5 */
  stabilityMovementThreshold?: number;
  /** Min face visibility score to accept (below = FACE_OBSTRUCTED). Default: 0.5 */
  minFaceVisibilityScore?: number;
  /** Max head tilt in degrees (roll and yaw only). Default: 28 */
  maxHeadTiltDegrees?: number;
  /** Max distance from hand to face (normalized, 0-1). Default: 0.15 */
  maxHandFaceDistance?: number;
  /** Optional debug mode. Default: false */
  debugMode?: boolean;
}

/**
 * Bounding box structure compatible with MediaPipe (normalized 0-1 coords)
 */
export interface BoundingBox {
  xMin: number;
  yMin: number;
  width: number;
  height: number;
}

/**
 * Detected face data from MediaPipe FaceLandmarker
 */
export interface DetectedFaceData {
  /** Bounding box (normalized coordinates 0-1) */
  boundingBox: BoundingBox;
  /** 478 face landmarks (normalized coordinates) */
  landmarks: NormalizedLandmark[];
  /** Detection timestamp */
  timestamp: number;
}

/**
 * Detected hand data from MediaPipe HandLandmarker
 */
export interface DetectedHandData {
  /** 21 hand landmarks (normalized coordinates) */
  landmarks: NormalizedLandmark[];
  /** Hand classification (Left/Right) */
  handedness: string;
}
