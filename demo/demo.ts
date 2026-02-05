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

/**
 * Atualiza o status visual com classes CSS apropriadas
 */
function updateStatusUI(status: ValidationStatus, message: string) {
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  
  statusEl.textContent = message;
  
  // Remove classes anteriores
  statusContainer.classList.remove('success', 'error', 'warning');
  
  // Adiciona classe baseada no status
  if (status === ValidationStatus.SUCCESS) {
    statusContainer.classList.add('success');
  } else if (status === ValidationStatus.ERROR) {
    statusContainer.classList.add('error');
  } else if (
    status === ValidationStatus.NO_FACE_DETECTED ||
    status === ValidationStatus.MULTIPLE_FACES ||
    status === ValidationStatus.TOO_CLOSE ||
    status === ValidationStatus.TOO_FAR ||
    status === ValidationStatus.OFF_CENTER ||
    status === ValidationStatus.HEAD_NOT_STRAIGHT ||
    status === ValidationStatus.FACE_OBSTRUCTED ||
    status === ValidationStatus.POOR_ILLUMINATION ||
    status === ValidationStatus.STAY_STILL
  ) {
    statusContainer.classList.add('warning');
  }
}

/**
 * Inicializa a câmera automaticamente
 */
async function initCamera() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);

  statusContainer.classList.remove('success', 'error', 'warning');
  statusEl.textContent = 'Solicitando acesso à câmera...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' } 
    });
    cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    
    statusContainer.classList.remove('error');
    statusEl.textContent = 'Câmera pronta! Clique em "Iniciar" para começar a validação.';
    btnStart.disabled = false;
  } catch (err) {
    statusContainer.classList.add('error');
    statusEl.textContent = `Erro ao acessar câmera: ${err}`;
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
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  const debugCheckbox = getEl<HTMLInputElement>(DEBUG_ID);
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);
  const btnStop = getEl<HTMLButtonElement>(BTN_STOP_ID);
  const previewContainer = getEl<HTMLDivElement>(PREVIEW_CONTAINER_ID);

  // Ocultar preview anterior
  previewContainer.style.display = 'none';

  if (validator) {
    validator.stop();
    validator = null;
  }

  // Verificar se a câmera está ativa
  if (!cameraStream || !video.srcObject) {
    statusContainer.classList.add('error');
    statusEl.textContent = 'Câmera não disponível. Recarregue a página.';
    return;
  }

  // Desabilitar botão Start, habilitar botão Stop
  btnStart.disabled = true;
  btnStop.disabled = false;

  // Resetar status
  statusContainer.classList.remove('success', 'error', 'warning');
  statusEl.textContent = 'Iniciando validação facial...';

  const locale = localeSelect.value as SupportedLocale;

  // FaceValidator inicia automaticamente no construtor
  validator = new FaceValidator({
    videoElement: video,
    overlayCanvasElement: overlay,
    locale,
    debugMode: debugCheckbox.checked,
    onStatusUpdate: (status: ValidationStatus, message: string) => {
      updateStatusUI(status, message);
    },
    onCaptureSuccess: (blob: Blob) => {
      const statusMessages = {
        'pt-BR': 'Captura realizada com sucesso!',
        'en': 'Capture successful!',
        'es': '¡Captura exitosa!',
      };
      const message = statusMessages[locale] || statusMessages['en'];
      
      updateStatusUI(ValidationStatus.SUCCESS, message);
      
      const url = URL.createObjectURL(blob);
      const preview = getEl<HTMLDivElement>(PREVIEW_ID);
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Captured';
      preview.appendChild(img);
      
      // Mostrar container de preview
      previewContainer.style.display = 'block';
    },
    onError: (errorType: ValidationStatus, error: Error) => {
      updateStatusUI(errorType, `Erro: ${error.message}`);
      console.error(errorType, error);
    },
  });
}

/**
 * Para a validação facial (mas mantém a câmera ativa)
 */
function stop() {
  const btnStart = getEl<HTMLButtonElement>(BTN_START_ID);
  const btnStop = getEl<HTMLButtonElement>(BTN_STOP_ID);
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);

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
  
  // Resetar status
  statusContainer.classList.remove('success', 'error', 'warning');
  statusEl.textContent = 'Validação parada. Câmera ainda ativa. Clique em "Iniciar" para validar novamente.';
  
  // Habilitar botão Start, desabilitar botão Stop
  btnStart.disabled = false;
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
  
  // Iniciar câmera automaticamente ao carregar a página
  initCamera();
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
