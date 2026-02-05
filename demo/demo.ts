/**
 * Local demo for Face Validator SDK (MediaPipe).
 * Run: npm run demo
 *
 * Models are loaded from MediaPipe CDN automatically.
 */

import { FaceValidator, ValidationStatus, type SupportedLocale } from '../src/index';

const VIDEO_ID = 'video';
const OVERLAY_ID = 'overlay';
const STATUS_ID = 'status';
const PREVIEW_ID = 'preview';
const LOCALE_ID = 'locale';
const DEBUG_ID = 'debugMode';

let validator: FaceValidator | null = null;

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

async function start() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const overlay = getEl<HTMLCanvasElement>(OVERLAY_ID);
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  const debugCheckbox = getEl<HTMLInputElement>(DEBUG_ID);

  if (validator) {
    validator.stop();
    validator = null;
  }

  // Iniciar câmera
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' } 
    });
    video.srcObject = stream;
    await video.play();
  } catch (err) {
    statusEl.textContent = `Erro ao acessar câmera: ${err}`;
    return;
  }

  const locale = localeSelect.value as SupportedLocale;

  // FaceValidator inicia automaticamente no construtor
  validator = new FaceValidator({
    videoElement: video,
    overlayCanvasElement: overlay,
    locale,
    debugMode: debugCheckbox.checked,
    onStatusUpdate: (status: ValidationStatus, message: string) => {
      statusEl.textContent = `[${status}] ${message}`;
    },
    onCaptureSuccess: (blob: Blob) => {
      statusEl.textContent = 'Capture successful!';
      const url = URL.createObjectURL(blob);
      const preview = getEl<HTMLDivElement>(PREVIEW_ID);
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Captured';
      preview.appendChild(img);
    },
    onError: (errorType: ValidationStatus, error: Error) => {
      statusEl.textContent = `Error: ${error.message}`;
      console.error(errorType, error);
    },
  });
}

function stop() {
  if (validator) {
    validator.stop();
    validator = null;
  }
  // Parar câmera
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const stream = video.srcObject as MediaStream;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
  getEl<HTMLDivElement>(STATUS_ID).textContent = 'Stopped.';
}

function init() {
  getEl<HTMLButtonElement>('btnStart').addEventListener('click', start);
  getEl<HTMLButtonElement>('btnStop').addEventListener('click', stop);
}

init();
