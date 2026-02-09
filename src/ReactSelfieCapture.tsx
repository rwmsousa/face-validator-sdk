import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  FaceValidator,
  type FaceValidatorOptions,
  ValidationStatus,
  type SupportedLocale,
  getMessage,
  getLoadingModelsMessage,
} from './index';

const DEFAULT_VIDEO_WIDTH = 512;
const DEFAULT_VIDEO_HEIGHT = 384;
const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';

type UILabels = {
  previewQuestion: string;
  savePhoto: string;
  tryAgain: string;
  cancel: string;
};

const UI_LABELS: Record<SupportedLocale, UILabels> = {
  'pt-BR': {
    previewQuestion: 'O que você achou?',
    savePhoto: 'Salvar foto',
    tryAgain: 'Tentar novamente',
    cancel: 'Cancelar',
  },
  en: {
    previewQuestion: 'What do you think?',
    savePhoto: 'Save photo',
    tryAgain: 'Try again',
    cancel: 'Cancel',
  },
  es: {
    previewQuestion: '¿Qué te pareció?',
    savePhoto: 'Guardar foto',
    tryAgain: 'Intentar de nuevo',
    cancel: 'Cancelar',
  },
};

export type SelfieCaptureStyles = {
  container?: CSSProperties;
  media?: CSSProperties;
  messageBanner?: CSSProperties;
  primaryButton?: CSSProperties;
  secondaryButton?: CSSProperties;
};

export type SelfieCaptureUILabelOverrides = Partial<UILabels>;

export interface ReactSelfieCaptureProps {
  onCapture: (image: string | null) => void;
  onDismiss?: () => void;
  locale?: SupportedLocale | string;
  videoWidth?: number;
  videoHeight?: number;
  debugMode?: boolean;
  modelPath?: string;
  styles?: SelfieCaptureStyles;
  labels?: SelfieCaptureUILabelOverrides;
}

const resolveLocale = (locale?: string): SupportedLocale => {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('es')) return 'es';
  return 'pt-BR';
};

export const ReactSelfieCapture: React.FC<ReactSelfieCaptureProps> = ({
  onCapture,
  onDismiss,
  locale,
  videoWidth = DEFAULT_VIDEO_WIDTH,
  videoHeight = DEFAULT_VIDEO_HEIGHT,
  debugMode = false,
  modelPath,
  styles,
  labels,
}) => {
  const effectiveLocale = resolveLocale(locale);
  const baseLabels = UI_LABELS[effectiveLocale];
  const ui: UILabels = { ...baseLabels, ...(labels ?? {}) };

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sdkRef = useRef<FaceValidator | null>(null);

  const [status, setStatus] = useState<ValidationStatus>(ValidationStatus.INITIALIZING);
  const [message, setMessage] = useState<string>(
    getMessage(ValidationStatus.INITIALIZING, effectiveLocale),
  );
  const [showCapture, setShowCapture] = useState<boolean>(true);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);

  const handleStatusUpdate = useCallback(
    (newStatus: ValidationStatus, newMessage: string) => {
      setStatus(newStatus);
      setMessage(newMessage);
    },
    [],
  );

  function blobToBase64(blob: Blob): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string | null);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const handleCaptureSuccess = useCallback(
    (imageBlob: Blob) => {
      setStatus(ValidationStatus.SUCCESS);
      setMessage(getMessage(ValidationStatus.SUCCESS, effectiveLocale));
      blobToBase64(imageBlob).then((base64: string | null) => {
        setPhotoCaptured(base64);
        setShowCapture(false);
      });
    },
    [effectiveLocale],
  );

  const saveImage = useCallback(() => {
    onCapture(photoCaptured ?? null);
    onDismiss?.();
  }, [onCapture, onDismiss, photoCaptured]);

  const captureAgain = useCallback(() => {
    setPhotoCaptured(null);
    setStatus(ValidationStatus.INITIALIZING);
    setMessage(getMessage(ValidationStatus.INITIALIZING, effectiveLocale));
    setShowCapture(true);
  }, [effectiveLocale]);

  const handleError = useCallback(
    (_errorType: ValidationStatus, error: Error) => {
      setMessage(error.message);
      setStatus(ValidationStatus.ERROR);
    },
    [],
  );

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!showCapture) {
      if (sdkRef.current) {
        sdkRef.current.stop();
        sdkRef.current = null;
      }
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        // eslint-disable-next-line no-param-reassign
        videoElement.srcObject = null;
      }
      return;
    }

    if (!videoElement) return;

    let isCancelled = false;

    const setupCameraAndSdk = async () => {
      try {
        if (!videoElement.srcObject) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: videoWidth, height: videoHeight },
          });
          if (isCancelled) return;

          // eslint-disable-next-line no-param-reassign
          videoElement.srcObject = stream;
          await videoElement.play();
        }

        const canvasElement = canvasRef.current;
        if (canvasElement) {
          const vw = videoElement.videoWidth || videoWidth;
          const vh = videoElement.videoHeight || videoHeight;
          canvasElement.width = vw;
          canvasElement.height = vh;
        }

        if (sdkRef.current || isCancelled) return;

        const options: FaceValidatorOptions = {
          videoElement,
          overlayCanvasElement: canvasRef.current ?? undefined,
          locale: effectiveLocale,
          debugMode,
          onStatusUpdate: handleStatusUpdate,
          onCaptureSuccess: handleCaptureSuccess,
          onError: handleError,
          videoWidth,
          videoHeight,
        };

        if (modelPath) {
          options.modelPath = modelPath;
        }

        const instance = new FaceValidator(options);
        sdkRef.current = instance;
      } catch (error) {
        if (isCancelled) return;
        const err = error as Error;
        setMessage(err.message);
        setStatus(ValidationStatus.ERROR);
      }
    };

    setupCameraAndSdk().catch(() => {});

    return () => {
      isCancelled = true;
      if (sdkRef.current) {
        sdkRef.current.stop();
        sdkRef.current = null;
      }
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        // eslint-disable-next-line no-param-reassign
        videoElement.srcObject = null;
      }
    };
  }, [
    showCapture,
    effectiveLocale,
    videoWidth,
    videoHeight,
    debugMode,
    modelPath,
    handleStatusUpdate,
    handleCaptureSuccess,
    handleError,
  ]);

  const handleCloseClick = () => {
    onDismiss?.();
    onCapture(null);
    setShowCapture(false);
  };

  const isLoading = (): boolean => status === ValidationStatus.INITIALIZING;
  const isPreview = !showCapture && Boolean(photoCaptured);
  const isCamera = showCapture;

  const containerStyle: CSSProperties = {
    width: '100%',
    maxWidth: 640,
    boxSizing: 'border-box',
    ...styles?.container,
  };

  const bannerBase: CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    padding: '10px 12px',
    marginBottom: 10,
    borderRadius: 10,
    fontWeight: 600,
    marginTop: 30,
    height: 52,
    boxSizing: 'border-box',
    ...styles?.messageBanner,
  };

  const bannerStyle: CSSProperties = {
    ...bannerBase,
    backgroundColor: '#fff7df',
    color: '#b67219',
  };

  if (isCamera) {
    if (status === ValidationStatus.SUCCESS) {
      bannerStyle.backgroundColor = '#e0ffdf';
      bannerStyle.color = '#26c026';
    } else if (status === ValidationStatus.ERROR) {
      bannerStyle.backgroundColor = '#ffdfdf';
      bannerStyle.color = '#c02626';
    }
  }

  const mediaWrapper: CSSProperties = {
    width: '100%',
    maxWidth: 512,
    height: 384,
    margin: '0 auto',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
    ...styles?.media,
  };

  const buttonBase: CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    borderRadius: 4,
    border: '1px solid #d9d9d9',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: 14,
  };

  const primaryButtonStyle: CSSProperties = {
    ...buttonBase,
    backgroundColor: '#1dbe32',
    color: '#ffffff',
    borderColor: '#1dbe32',
    ...styles?.primaryButton,
  };

  const secondaryButtonStyle: CSSProperties = {
    ...buttonBase,
    ...styles?.secondaryButton,
  };

  const actionsAreaStyle: CSSProperties = {
    marginTop: 10,
  };

  return (
    <div style={containerStyle}>
      <div style={bannerStyle}>
        {isPreview ? ui.previewQuestion : message}
      </div>

      <div style={mediaWrapper}>
        {isCamera ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                transform: 'scaleX(-1)',
              }}
            />
          </>
        ) : isPreview && photoCaptured ? (
          <img
            src={photoCaptured}
            alt="Selfie preview"
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              backgroundColor: 'transparent',
              border: 'none',
            }}
          />
        ) : (
          <div aria-hidden />
        )}
      </div>

      <div style={actionsAreaStyle}>
        {isPreview ? (
          <>
            <button
              type="button"
              onClick={captureAgain}
              style={secondaryButtonStyle}
            >
              {ui.tryAgain}
            </button>
            <div style={{ height: 8 }} />
            <button
              type="button"
              onClick={saveImage}
              disabled={!photoCaptured}
              style={{
                ...primaryButtonStyle,
                opacity: photoCaptured ? 1 : 0.6,
                cursor: photoCaptured ? 'pointer' : 'not-allowed',
              }}
            >
              {ui.savePhoto}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleCloseClick}
            style={secondaryButtonStyle}
          >
            {ui.cancel}
          </button>
        )}
      </div>
    </div>
  );
};

