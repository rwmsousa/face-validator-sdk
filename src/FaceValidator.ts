import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  FaceValidatorOptions,
  ValidationStatus,
  DetectedFaceData,
  DetectedHandData,
  SupportedLocale,
  BoundingBox,
} from './types';
import { getMessage, getLoadingModelsMessage } from './i18n';
import {
  calculateAverageBrightness,
  checkFaceDistance,
  isFaceStable,
  isHeadStraight,
  isFaceGeometryPlausible,
  isPointInsideOval,
  isFaceBoundingBoxInsideOval,
  isHandNearFace,
  drawOverlay,
} from './utils';

const DEFAULT_LOCALE: SupportedLocale = 'en';

const defaultOptions = {
  overlayCanvasElement: undefined as HTMLCanvasElement | null | undefined,
  videoWidth: 512,
  videoHeight: 384,
  minDetectionConfidence: 0.5,
  minIlluminationThreshold: 60,
  minFaceSizeFactor: 0.18,
  maxFaceSizeFactor: 0.70,
  stabilizationTimeThreshold: 1000,
  stabilityMovementThreshold: 5,
  minFaceVisibilityScore: 0.5,
  maxHeadTiltDegrees: 25,
  maxHandFaceDistance: 0.15,
  debugMode: false,
  locale: DEFAULT_LOCALE,
  customMessages: {} as Partial<Record<ValidationStatus, string>>,
};

export type ResolvedFaceValidatorOptions = FaceValidatorOptions & {
  modelPath: string;
  locale: SupportedLocale;
  customMessages: Partial<Record<ValidationStatus, string>>;
};

/**
 * FaceValidator SDK - Real-time selfie validation with MediaPipe
 */
export class FaceValidator {
  private options: ReturnType<typeof this.resolveOptions>;
  private faceLandmarker: FaceLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private animationFrameId: number | null = null;
  private lastDetection: DetectedFaceData | null = null;
  private stableSince: number | null = null;
  private isCapturing = false;

  constructor(options: FaceValidatorOptions) {
    this.options = this.resolveOptions(options);
    this.setStatus(ValidationStatus.INITIALIZING);
    this.init();
  }

  private resolveOptions(options: FaceValidatorOptions) {
    const modelPath = options.modelPath || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
    return {
      ...defaultOptions,
      ...options,
      modelPath,
      locale: options.locale || DEFAULT_LOCALE,
      customMessages: options.customMessages || {},
    };
  }

  private async init(): Promise<void> {
    try {
      const loadingMsg = getLoadingModelsMessage(this.options.locale);
      this.setStatus(ValidationStatus.INITIALIZING, undefined, loadingMsg);

      // Initialize MediaPipe FilesetResolver
      const vision = await FilesetResolver.forVisionTasks(this.options.modelPath);

      // Initialize FaceLandmarker
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 2, // Detectar até 2 faces para MULTIPLE_FACES
        minFaceDetectionConfidence: this.options.minDetectionConfidence,
        minFacePresenceConfidence: this.options.minFaceVisibilityScore,
        minTrackingConfidence: this.options.minFaceVisibilityScore,
      });

      // Initialize HandLandmarker
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.startDetectionLoop();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.setStatus(ValidationStatus.ERROR, error);
    }
  }

  private getMessageForStatus(status: ValidationStatus, messageOverride?: string): string {
    if (messageOverride) return messageOverride;
    if (this.options.customMessages[status]) {
      return this.options.customMessages[status]!;
    }
    return getMessage(status, this.options.locale);
  }

  private setStatus(
    status: ValidationStatus,
    error?: Error,
    messageOverride?: string
  ): void {
    const message = this.getMessageForStatus(status, messageOverride);
    this.options.onStatusUpdate(status, message);

    if (status === ValidationStatus.ERROR && error) {
      this.options.onError(status, error);
    }
  }

  private startDetectionLoop(): void {
    const video = this.options.videoElement;
    const frameWidth = this.options.videoWidth || 640;
    const frameHeight = this.options.videoHeight || 480;

    const detect = async () => {
      if (!this.faceLandmarker || !this.handLandmarker || !video.videoWidth) {
        this.animationFrameId = requestAnimationFrame(detect);
        return;
      }

      try {
        const now = performance.now();
        let currentStatus: ValidationStatus = ValidationStatus.NO_FACE_DETECTED;
        let faceData: DetectedFaceData | null = null;
        let handData: DetectedHandData[] = [];

        // Detectar faces
        const faceResults = this.faceLandmarker.detectForVideo(video, now);
        
        // Detectar mãos
        const handResults = this.handLandmarker.detectForVideo(video, now);

        // Processar mãos detectadas
        if (handResults.landmarks && handResults.landmarks.length > 0) {
          handData = handResults.landmarks.map((landmarks, idx) => ({
            landmarks,
            handedness: handResults.handednesses?.[idx]?.[0]?.categoryName || 'Unknown'
          }));
        }

        if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 1) {
          // Múltiplas faces detectadas
          currentStatus = ValidationStatus.MULTIPLE_FACES;
          this.stableSince = null;

          // Usar primeira face para overlay
          const landmarks = faceResults.faceLandmarks[0];
          const box = faceResults.faceBlendshapes?.[0] ? this.estimateBoundingBox(landmarks) : null;
          if (box) {
            faceData = { boundingBox: box, landmarks, timestamp: now };
          }
        } else if (faceResults.faceLandmarks && faceResults.faceLandmarks.length === 1) {
          // Uma face detectada
          const landmarks = faceResults.faceLandmarks[0];
          const boundingBox = this.estimateBoundingBox(landmarks);

          faceData = {
            boundingBox,
            landmarks,
            timestamp: now,
          };

          // Validações sequenciais
          const distanceStatus = checkFaceDistance(
            boundingBox,
            this.options.minFaceSizeFactor,
            this.options.maxFaceSizeFactor
          );

          if (distanceStatus !== 'OK') {
            currentStatus = distanceStatus === 'TOO_CLOSE' ? ValidationStatus.TOO_CLOSE : ValidationStatus.TOO_FAR;
            this.stableSince = null;
          } else {
            // Verificar centralização: nariz no oval OU bounding box dentro do oval
            // Relaxado para aceitar quando pelo menos uma condição é verdadeira
            const nose = landmarks[4]; // MediaPipe nose tip
            const isNoseCentered = isPointInsideOval(
              nose.x,
              nose.y,
              frameWidth,
              frameHeight
            );
            const isFaceInsideOval = isFaceBoundingBoxInsideOval(
              boundingBox,
              frameWidth,
              frameHeight
            );

            // Aceitar se nariz está centrado (validação principal)
            // Validação do bounding box é adicional mas não obrigatória
            if (!isNoseCentered) {
              currentStatus = ValidationStatus.OFF_CENTER;
              this.stableSince = null;
            } else if (!isFaceGeometryPlausible(landmarks, boundingBox)) {
              currentStatus = ValidationStatus.FACE_OBSTRUCTED;
              this.stableSince = null;
            } else if (!isHeadStraight(landmarks, this.options.maxHeadTiltDegrees)) {
              currentStatus = ValidationStatus.HEAD_NOT_STRAIGHT;
              this.stableSince = null;
            } else if (handData.length > 0 && isHandNearFace(handData[0], boundingBox, this.options.maxHandFaceDistance)) {
              // Mão detectada próxima ao rosto
              currentStatus = ValidationStatus.FACE_OBSTRUCTED;
              this.stableSince = null;
            } else {
              // Verificar iluminação
              const tempCanvas = document.createElement('canvas');
              const boxX = boundingBox.xMin * video.videoWidth;
              const boxY = boundingBox.yMin * video.videoHeight;
              const boxW = boundingBox.width * video.videoWidth;
              const boxH = boundingBox.height * video.videoHeight;

              tempCanvas.width = boxW;
              tempCanvas.height = boxH;
              const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

              if (tempCtx) {
                tempCtx.drawImage(video, boxX, boxY, boxW, boxH, 0, 0, boxW, boxH);
                const faceImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                const brightness = calculateAverageBrightness(faceImageData);

                if (brightness < this.options.minIlluminationThreshold) {
                  currentStatus = ValidationStatus.POOR_ILLUMINATION;
                  this.stableSince = null;
                } else {
                  // Verificar estabilidade
                  if (
                    isFaceStable(
                      faceData,
                      this.lastDetection,
                      this.options.stabilityMovementThreshold,
                      frameWidth,
                      frameHeight
                    )
                  ) {
                    if (!this.stableSince) this.stableSince = now;
                    if (now - this.stableSince >= this.options.stabilizationTimeThreshold) {
                      currentStatus = ValidationStatus.CAPTURING;
                    } else {
                      currentStatus = ValidationStatus.STAY_STILL;
                    }
                  } else {
                    this.stableSince = null;
                    currentStatus = ValidationStatus.STAY_STILL;
                  }
                }
              } else {
                currentStatus = ValidationStatus.FACE_DETECTED;
                this.stableSince = null;
              }
            }
          }
        } else {
          // Nenhuma face detectada
          this.lastDetection = null;
          this.stableSince = null;
        }

        this.lastDetection = faceData;
        this.setStatus(currentStatus);

        // Desenhar overlay
        if (this.options.overlayCanvasElement) {
          drawOverlay(
            this.options.overlayCanvasElement,
            this.options.debugMode || false,
            currentStatus,
            faceData || undefined,
            handData.length > 0 ? handData : undefined
          );
        }

        // Capturar se status é CAPTURING
        if (currentStatus === ValidationStatus.CAPTURING && !this.isCapturing) {
          this.isCapturing = true;
          await this.captureImage();
          this.setStatus(ValidationStatus.SUCCESS);
          this.stop();
          return;
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.setStatus(ValidationStatus.ERROR, error);
      }

      this.animationFrameId = requestAnimationFrame(detect);
    };

    this.animationFrameId = requestAnimationFrame(detect);
  }

  /**
   * Estima bounding box a partir dos landmarks (MediaPipe não fornece bbox diretamente).
   */
  private estimateBoundingBox(landmarks: any[]): BoundingBox {
    const xs = landmarks.map((l: any) => l.x);
    const ys = landmarks.map((l: any) => l.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    return {
      xMin,
      yMin,
      width: xMax - xMin,
      height: yMax - yMin,
    };
  }

  private async captureImage(): Promise<void> {
    const video = this.options.videoElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      this.setStatus(ValidationStatus.ERROR, new Error('Failed to get canvas context'));
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          this.options.onCaptureSuccess(blob);
        } else {
          this.setStatus(ValidationStatus.ERROR, new Error('Failed to generate image blob'));
        }
      },
      'image/jpeg',
      0.95
    );
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
    }
    if (this.handLandmarker) {
      this.handLandmarker.close();
    }
  }
}
