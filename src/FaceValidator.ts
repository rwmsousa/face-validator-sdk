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
  isNeutralExpression,
  hasDarkGlasses,
  drawOverlay,
} from './utils';

const DEFAULT_LOCALE: SupportedLocale = 'en';

const defaultOptions = {
  container: undefined as HTMLElement | string | undefined,
  ui: 'default' as 'default' | 'none',
  autoStart: true,
  mirror: true,
  videoConstraints: undefined as MediaTrackConstraints | undefined,
  overlayCanvasElement: undefined as HTMLCanvasElement | null | undefined,
  videoWidth: 512,
  videoHeight: 384,
  minDetectionConfidence: 0.4,
  minIlluminationThreshold: 50,
  minFaceSizeFactor: 0.15,
  maxFaceSizeFactor: 0.75,
  stabilizationTimeThreshold: 1000,
  stabilityMovementThreshold: 5,
  minFaceVisibilityScore: 0.4,
  maxHeadTiltDegrees: 30,
  maxHandFaceDistance: 0.15,
  debugMode: false,
  locale: DEFAULT_LOCALE,
  customMessages: {} as Partial<Record<ValidationStatus, string>>,
  onStatusUpdate: undefined as ((status: ValidationStatus, message: string) => void) | undefined,
  onCaptureSuccess: undefined as ((imageBlob: Blob) => void) | undefined,
  onError: undefined as ((errorType: ValidationStatus, error: Error) => void) | undefined,
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
  private containerElement: HTMLElement | null = null;
  private statusElement: HTMLDivElement | null = null;
  private uiRootElement: HTMLDivElement | null = null;
  private cameraStream: MediaStream | null = null;
  private cameraReadyPromise: Promise<void> | null = null;
  private managedElements = false;
  private managedCamera = false;
  private injectedStyleElement: HTMLStyleElement | null = null;

  constructor(options: FaceValidatorOptions) {
    this.options = this.resolveOptions(options);
    this.setupElements();
    this.setStatus(ValidationStatus.INITIALIZING);
    this.cameraReadyPromise = this.options.autoStart ? this.initCamera() : Promise.resolve();
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
      onStatusUpdate: options.onStatusUpdate || (() => {}),
      onCaptureSuccess: options.onCaptureSuccess || (() => {}),
      onError: options.onError || (() => {}),
      videoConstraints:
        options.videoConstraints ||
        ({
          width: { ideal: options.videoWidth || defaultOptions.videoWidth },
          height: { ideal: options.videoHeight || defaultOptions.videoHeight },
          facingMode: 'user',
        } as MediaTrackConstraints),
    };
  }

  private setupElements(): void {
    const container = this.resolveContainer(this.options.container);
    this.containerElement = container;

    if (this.options.ui === 'default' && container) {
      this.ensureDefaultUI(container);
    }

    if (!this.options.videoElement) {
      if (!container) {
        throw new Error('FaceValidator requires either videoElement or container.');
      }

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.className = 'fv-sdk-video';

      const canvas = document.createElement('canvas');
      canvas.className = 'fv-sdk-canvas';

      this.attachMediaElements(container, video, canvas);
      this.options.videoElement = video;
      this.options.overlayCanvasElement = canvas;
      this.managedElements = true;
    } else if (!this.options.overlayCanvasElement && container) {
      const canvas = document.createElement('canvas');
      canvas.className = 'fv-sdk-canvas';
      this.attachMediaElements(container, this.options.videoElement, canvas);
      this.options.overlayCanvasElement = canvas;
      this.managedElements = true;
    }

    if (this.options.mirror) {
      this.applyMirrorStyles();
    }
  }

  private resolveContainer(container?: HTMLElement | string): HTMLElement | null {
    if (!container) return null;
    if (typeof container === 'string') {
      return document.querySelector(container) as HTMLElement | null;
    }
    return container;
  }

  private ensureDefaultUI(container: HTMLElement): void {
    container.innerHTML = '';
    container.classList.add('fv-sdk-root');

    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'fv-sdk-media';
    container.appendChild(mediaWrapper);

    const status = document.createElement('div');
    status.className = 'fv-sdk-status';
    container.appendChild(status);

    this.statusElement = status;
    this.uiRootElement = container as HTMLDivElement;
    this.injectDefaultStyles();
  }

  private attachMediaElements(container: HTMLElement, video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    const mediaWrapper = container.querySelector('.fv-sdk-media') as HTMLDivElement | null;
    if (mediaWrapper) {
      mediaWrapper.appendChild(video);
      mediaWrapper.appendChild(canvas);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'fv-sdk-media';
    wrapper.appendChild(video);
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
  }

  private injectDefaultStyles(): void {
    if (this.injectedStyleElement || document.querySelector('style[data-fv-sdk="true"]')) return;

    const style = document.createElement('style');
    style.setAttribute('data-fv-sdk', 'true');
    style.textContent = `
      .fv-sdk-root { display: flex; flex-direction: column; gap: 12px; width: 100%; }
      .fv-sdk-media { position: relative; width: 100%; max-width: 512px; height: 384px; margin: 0 auto; background: #000; border-radius: 10px; overflow: hidden; }
      .fv-sdk-video, .fv-sdk-canvas { width: 100%; height: 100%; display: block; object-fit: contain; }
      .fv-sdk-canvas { position: absolute; top: 0; left: 0; }
      .fv-sdk-status { text-align: center; display: flex; align-items: center; justify-content: center; font-size: 14px; padding: 10px 12px; border-radius: 8px; font-weight: 600; background: #f8f9fa; color: #555; }
      .fv-sdk-status.success { background: #d4edda; color: #155724; }
      .fv-sdk-status.error { background: #f8d7da; color: #721c24; }
      .fv-sdk-status.warning { background: #fff3cd; color: #856404; }
    `;
    document.head.appendChild(style);
    this.injectedStyleElement = style;
  }

  private applyMirrorStyles(): void {
    const video = this.options.videoElement;
    const canvas = this.options.overlayCanvasElement;
    if (video) video.style.transform = 'scaleX(-1)';
    if (canvas) canvas.style.transform = 'scaleX(-1)';
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

      if (this.cameraReadyPromise) {
        await this.cameraReadyPromise;
      }

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
    this.updateStatusUI(status, message);
    this.options.onStatusUpdate(status, message);

    if (status === ValidationStatus.ERROR && error) {
      this.options.onError(status, error);
    }
  }

  private updateStatusUI(status: ValidationStatus, message: string): void {
    if (!this.statusElement) return;
    this.statusElement.textContent = message;
    this.statusElement.classList.remove('success', 'warning', 'error');

    const statusClass = this.getStatusClass(status);
    if (statusClass) {
      this.statusElement.classList.add(statusClass);
    }
  }

  private getStatusClass(status: ValidationStatus): '' | 'success' | 'warning' | 'error' {
    if (status === ValidationStatus.SUCCESS) return 'success';
    if (status === ValidationStatus.ERROR) return 'error';

    const warningStatuses: ValidationStatus[] = [
      ValidationStatus.NO_FACE_DETECTED,
      ValidationStatus.MULTIPLE_FACES,
      ValidationStatus.TOO_CLOSE,
      ValidationStatus.TOO_FAR,
      ValidationStatus.OFF_CENTER,
      ValidationStatus.HEAD_NOT_STRAIGHT,
      ValidationStatus.FACE_OBSTRUCTED,
      ValidationStatus.POOR_ILLUMINATION,
      ValidationStatus.NOT_NEUTRAL_EXPRESSION,
      ValidationStatus.DARK_GLASSES,
      ValidationStatus.STAY_STILL,
      ValidationStatus.CAPTURING,
    ];

    return warningStatuses.includes(status) ? 'warning' : '';
  }

  private async initCamera(): Promise<void> {
    const video = this.options.videoElement;
    if (!video || video.srcObject) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.options.videoConstraints,
      });
      this.cameraStream = stream;
      this.managedCamera = true;
      // eslint-disable-next-line no-param-reassign
      video.srcObject = stream;

      await this.waitForVideoReady(video);
      await video.play();

      const canvas = this.options.overlayCanvasElement;
      if (canvas) {
        canvas.width = video.videoWidth || this.options.videoWidth || defaultOptions.videoWidth;
        canvas.height = video.videoHeight || this.options.videoHeight || defaultOptions.videoHeight;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.setStatus(ValidationStatus.ERROR, error);
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 2) return;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };
      const onError = (event: Event) => {
        video.removeEventListener('error', onError);
        reject(event);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      setTimeout(() => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      }, 5000);
    });
  }

  private startDetectionLoop(): void {
    const video = this.getVideoElement();
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
            // Verificar centralização: nariz no oval E bounding box dentro do oval
            // Mais rigoroso: exige os dois critérios ao mesmo tempo
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

            // Rejeitar se QUALQUER um dos critérios de centralização falhar
            // - Nariz deve estar dentro do oval
            // - Bounding box da face deve caber dentro do oval
            if (!isNoseCentered || !isFaceInsideOval) {
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
            } else if (!isNeutralExpression(landmarks)) {
              // Expressão não neutra (sorriso, boca aberta, olhos fechados)
              currentStatus = ValidationStatus.NOT_NEUTRAL_EXPRESSION;
              this.stableSince = null;
            } else if (hasDarkGlasses(video, landmarks)) {
              // Óculos escuros detectados
              currentStatus = ValidationStatus.DARK_GLASSES;
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
    const video = this.getVideoElement();
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
    if (this.managedCamera) {
      this.stopCamera();
    }
  }

  public destroy(): void {
    this.stop();
    if (this.managedElements && this.containerElement) {
      this.containerElement.innerHTML = '';
    }
    this.statusElement = null;
    this.uiRootElement = null;
  }

  private stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }

  private getVideoElement(): HTMLVideoElement {
    if (!this.options.videoElement) {
      throw new Error('Video element is not available. Provide videoElement or container.');
    }
    return this.options.videoElement;
  }
}
