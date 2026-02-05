/**
 * Standalone demo for Face Validator SDK (production build for Vercel).
 * This version includes the SDK bundled.
 */

import { FaceValidator, ValidationStatus, type SupportedLocale } from '../src/index';

const VIDEO_ID = 'video';
const OVERLAY_ID = 'overlay';
const STATUS_ID = 'status';
const STATUS_CONTAINER_ID = 'statusContainer';
const PREVIEW_ID = 'preview';
const PREVIEW_CONTAINER_ID = 'previewContainer';
const LOCALE_ID = 'locale';
const DEBUG_ID = 'debugMode';
const BTN_START_ID = 'btnStart';
const BTN_STOP_ID = 'btnStop';

let validator: FaceValidator | null = null;
let cameraStream: MediaStream | null = null;

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function updateStatusUI(status: ValidationStatus, message: string) {
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const containerEl = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  
  statusEl.textContent = message;
  
  // Remove classes anteriores
  containerEl.classList.remove('success', 'error', 'warning');
  
  // Adiciona classe baseada no status
  if (status === ValidationStatus.SUCCESS || status === ValidationStatus.CAPTURING) {
    containerEl.classList.add('success');
  } else if (status === ValidationStatus.ERROR) {
    containerEl.classList.add('error');
  } else if (
    status === ValidationStatus.OFF_CENTER ||
    status === ValidationStatus.TOO_CLOSE ||
    status === ValidationStatus.TOO_FAR ||
    status === ValidationStatus.POOR_ILLUMINATION ||
    status === ValidationStatus.FACE_OBSTRUCTED ||
    status === ValidationStatus.HEAD_NOT_STRAIGHT ||
    status === ValidationStatus.MULTIPLE_FACES
  ) {
    containerEl.classList.add('warning');
  }
}

/**
 * Inicializa a câmera automaticamente
 */
async function initCamera() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);

  updateStatusUI(ValidationStatus.INITIALIZING, 'Solicitando acesso à câmera...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' } 
    });
    cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    
    updateStatusUI(ValidationStatus.FACE_DETECTED, 'Câmera pronta! Clique em "Iniciar" para começar a validação.');
    btnStart.disabled = false;
  } catch (err) {
    const error = err as Error;
    updateStatusUI(ValidationStatus.ERROR, `Erro ao acessar câmera: ${error.message}`);
    btnStart.disabled = true;
    console.error('Erro ao acessar câmera:', err);
  }
}

/**
 * Inicia a validação facial
 */
async function start() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const overlay = getEl<HTMLCanvasElement>(OVERLAY_ID);
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  const debugCheckbox = getEl<HTMLInputElement>(DEBUG_ID);
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);
  const btnStop = getEl<HTMLButtonElement>(BTN_STOP_ID);
  const previewContainer = getEl<HTMLDivElement>(PREVIEW_CONTAINER_ID);

  if (validator) {
    validator.stop();
    validator = null;
  }

  // Verificar se a câmera está ativa
  if (!cameraStream || !video.srcObject) {
    updateStatusUI(ValidationStatus.ERROR, 'Câmera não disponível. Recarregue a página.');
    return;
  }

  // Desabilitar botão start
  btnStart.disabled = true;
  btnStart.innerHTML = '<span class="loading"></span> Carregando...';

  // Esconder preview anterior
  previewContainer.style.display = 'none';

  const locale = localeSelect.value as SupportedLocale;

  // FaceValidator inicia automaticamente no construtor
  try {
    validator = new FaceValidator({
      videoElement: video,
      overlayCanvasElement: overlay,
      locale,
      debugMode: debugCheckbox.checked,
      onStatusUpdate: (status: ValidationStatus, message: string) => {
        updateStatusUI(status, message);
      },
      onCaptureSuccess: (blob: Blob) => {
        updateStatusUI(ValidationStatus.SUCCESS, '✅ Captura realizada com sucesso!');
        const url = URL.createObjectURL(blob);
        const preview = getEl<HTMLDivElement>(PREVIEW_ID);
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Selfie capturada';
        preview.appendChild(img);
        previewContainer.style.display = 'block';
      },
      onError: (errorType: ValidationStatus, error: Error) => {
        updateStatusUI(errorType, `❌ Erro: ${error.message}`);
        console.error(errorType, error);
      },
    });

    // Habilitar botão stop
    btnStart.disabled = false;
    btnStart.innerHTML = '▶ Iniciar';
    btnStop.disabled = false;
  } catch (err) {
    const error = err as Error;
    updateStatusUI(ValidationStatus.ERROR, `Erro ao inicializar: ${error.message}`);
    btnStart.disabled = false;
    btnStart.innerHTML = '▶ Iniciar';
  }
}

/**
 * Para a validação facial (mas mantém a câmera ativa)
 */
function stop() {
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);
  const btnStop = getEl<HTMLButtonElement>(BTN_STOP_ID);
  
  if (validator) {
    validator.stop();
    validator = null;
  }
  
  // Limpar o canvas overlay
  const overlay = getEl<HTMLCanvasElement>(OVERLAY_ID);
  const ctx = overlay.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }
  
  updateStatusUI(ValidationStatus.FACE_DETECTED, 'Validação parada. Câmera ainda ativa. Clique em "Iniciar" para validar novamente.');
  
  // Atualizar botões
  btnStart.disabled = false;
  btnStart.innerHTML = '▶ Iniciar';
  btnStop.disabled = true;
}

/**
 * Inicializa a aplicação
 */
function init() {
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);
  const btnStop = getEl<HTMLButtonElement>(BTN_STOP_ID);
  
  // Desabilitar botão Iniciar até que a câmera esteja pronta
  btnStart.disabled = true;
  
  btnStart.addEventListener('click', start);
  btnStop.addEventListener('click', stop);
  
  console.log('Face Validator SDK Demo initialized');
  console.log('MediaPipe version: using CDN');
  
  // Iniciar câmera automaticamente ao carregar a página
  initCamera();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
