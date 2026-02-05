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
const BTN_RETRY_ID = 'btnRetry';

let validator: FaceValidator | null = null;
let cameraStream: MediaStream | null = null;
let currentLocale: SupportedLocale = 'pt-BR';

// Traduções da interface
const translations = {
  'pt-BR': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Validação de selfie em tempo real com detecção de face e mãos',
    languageLabel: '🌐 Idioma',
    debugLabel: '🔍 Modo Debug',
    debugCheckbox: 'Mostrar landmarks',
    retryButton: '🔄 Tentar Novamente',
    previewTitle: '✅ Captura realizada!',
    footerText: 'Desenvolvido com ❤️ usando',
    githubLink: 'Ver no GitHub',
    requestingCamera: 'Solicitando acesso à câmera...',
    cameraReady: 'Câmera pronta! Aguarde, iniciando validação...',
    cameraError: 'Erro ao acessar câmera',
    cameraNotAvailable: 'Câmera não disponível. Recarregue a página.',
    startingValidation: 'Iniciando validação facial...',
    captureSuccess: 'Captura realizada com sucesso!',
    validationStopped: 'Validação parada. Clique em "Tentar Novamente" para recomeçar.',
  },
  'en': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Real-time selfie validation with face and hand detection',
    languageLabel: '🌐 Language',
    debugLabel: '🔍 Debug Mode',
    debugCheckbox: 'Show landmarks',
    retryButton: '🔄 Try Again',
    previewTitle: '✅ Capture successful!',
    footerText: 'Developed with ❤️ using',
    githubLink: 'View on GitHub',
    requestingCamera: 'Requesting camera access...',
    cameraReady: 'Camera ready! Please wait, starting validation...',
    cameraError: 'Error accessing camera',
    cameraNotAvailable: 'Camera not available. Reload the page.',
    startingValidation: 'Starting face validation...',
    captureSuccess: 'Capture successful!',
    validationStopped: 'Validation stopped. Click "Try Again" to restart.',
  },
  'es': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Validación de selfie en tiempo real con detección de rostro y manos',
    languageLabel: '🌐 Idioma',
    debugLabel: '🔍 Modo Debug',
    debugCheckbox: 'Mostrar landmarks',
    retryButton: '🔄 Intentar Nuevamente',
    previewTitle: '✅ ¡Captura realizada!',
    footerText: 'Desarrollado con ❤️ usando',
    githubLink: 'Ver en GitHub',
    requestingCamera: 'Solicitando acceso a la cámara...',
    cameraReady: 'Cámara lista! Espere, iniciando validación...',
    cameraError: 'Error al acceder a la cámara',
    cameraNotAvailable: 'Cámara no disponible. Recargue la página.',
    startingValidation: 'Iniciando validación facial...',
    captureSuccess: '¡Captura exitosa!',
    validationStopped: 'Validación detenida. Haga clic en "Intentar Nuevamente" para reiniciar.',
  },
};

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function translate(key: keyof typeof translations['pt-BR']): string {
  return translations[currentLocale][key];
}

function updatePageTexts() {
  const title = document.getElementById('pageTitle');
  const subtitle = document.getElementById('pageSubtitle');
  const languageLabel = document.getElementById('languageLabel');
  const debugLabel = document.getElementById('debugLabel');
  const debugCheckboxLabel = document.getElementById('debugCheckboxLabel');
  const retryButton = getEl<HTMLButtonElement>(BTN_RETRY_ID);
  const previewTitle = document.getElementById('previewTitle');
  const footerText = document.getElementById('footerText');
  const githubLink = document.getElementById('githubLink');

  if (title) title.textContent = translate('title');
  if (subtitle) subtitle.textContent = translate('subtitle');
  if (languageLabel) languageLabel.textContent = translate('languageLabel');
  if (debugLabel) debugLabel.textContent = translate('debugLabel');
  if (debugCheckboxLabel) debugCheckboxLabel.textContent = translate('debugCheckbox');
  retryButton.textContent = translate('retryButton');
  if (previewTitle) previewTitle.textContent = translate('previewTitle');
  if (footerText) footerText.textContent = translate('footerText');
  if (githubLink) githubLink.textContent = translate('githubLink');
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
 * Inicializa a câmera automaticamente e inicia a validação
 */
async function initCamera() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);

  updateStatusUI(ValidationStatus.INITIALIZING, translate('requestingCamera'));

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480, facingMode: 'user' } 
    });
    cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    
    updateStatusUI(ValidationStatus.FACE_DETECTED, translate('cameraReady'));
    
    // Iniciar validação automaticamente após 500ms
    setTimeout(() => {
      startValidation();
    }, 500);
  } catch (err) {
    const error = err as Error;
    updateStatusUI(ValidationStatus.ERROR, `${translate('cameraError')}: ${error.message}`);
    console.error('Erro ao acessar câmera:', err);
  }
}

/**
 * Inicia a validação facial
 */
async function startValidation() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const overlay = getEl<HTMLCanvasElement>(OVERLAY_ID);
  const debugCheckbox = getEl<HTMLInputElement>(DEBUG_ID);
  const btnRetry = getEl<HTMLButtonElement>(BTN_RETRY_ID);
  const previewContainer = getEl<HTMLDivElement>(PREVIEW_CONTAINER_ID);

  if (validator) {
    validator.stop();
    validator = null;
  }

  // Verificar se a câmera está ativa
  if (!cameraStream || !video.srcObject) {
    updateStatusUI(ValidationStatus.ERROR, translate('cameraNotAvailable'));
    return;
  }

  // Ocultar botão Retry durante validação
  btnRetry.style.display = 'none';

  // Esconder preview anterior
  previewContainer.style.display = 'none';

  updateStatusUI(ValidationStatus.INITIALIZING, translate('startingValidation'));

  // FaceValidator inicia automaticamente no construtor
  try {
    validator = new FaceValidator({
      videoElement: video,
      overlayCanvasElement: overlay,
      locale: currentLocale,
      debugMode: debugCheckbox.checked,
      onStatusUpdate: (status: ValidationStatus, message: string) => {
        updateStatusUI(status, message);
      },
      onCaptureSuccess: (blob: Blob) => {
        updateStatusUI(ValidationStatus.SUCCESS, translate('captureSuccess'));
        const url = URL.createObjectURL(blob);
        const preview = getEl<HTMLDivElement>(PREVIEW_ID);
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Selfie capturada';
        preview.appendChild(img);
        previewContainer.style.display = 'block';
        // Mostrar botão retry
        btnRetry.style.display = 'block';
      },
      onError: (errorType: ValidationStatus, error: Error) => {
        updateStatusUI(errorType, `❌ Erro: ${error.message}`);
        console.error(errorType, error);
        // Mostrar botão retry em caso de erro
        btnRetry.style.display = 'block';
      },
    });
  } catch (err) {
    const error = err as Error;
    updateStatusUI(ValidationStatus.ERROR, `Erro ao inicializar: ${error.message}`);
    // Mostrar botão retry em caso de erro
    btnRetry.style.display = 'block';
  }
}

/**
 * Reinicia a validação facial (para a validação atual e inicia uma nova)
 */
function retry() {
  const previewContainer = getEl<HTMLDivElement>(PREVIEW_CONTAINER_ID);

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
  
  // Ocultar preview
  previewContainer.style.display = 'none';
  
  updateStatusUI(ValidationStatus.INITIALIZING, translate('validationStopped'));
  
  // Reiniciar validação
  startValidation();
}

/**
 * Atualiza o idioma da aplicação
 */
function changeLanguage() {
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  currentLocale = localeSelect.value as SupportedLocale;
  updatePageTexts();
  
  // Se há um validador ativo, reiniciar com novo idioma
  if (validator) {
    retry();
  }
}

/**
 * Inicializa a aplicação
 */
function init() {
  const btnRetry = getEl<HTMLButtonElement>(BTN_RETRY_ID);
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  
  // Ocultar botão Retry inicialmente
  btnRetry.style.display = 'none';
  
  // Event listeners
  btnRetry.addEventListener('click', retry);
  localeSelect.addEventListener('change', changeLanguage);
  
  console.log('Face Validator SDK Demo initialized');
  console.log('MediaPipe version: using CDN');
  
  // Configurar idioma inicial
  currentLocale = localeSelect.value as SupportedLocale;
  updatePageTexts();
  
  // Iniciar câmera automaticamente ao carregar a página
  initCamera();
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
