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
const THUMBNAILS_LIST_ID = 'thumbnailsList';
const LOCALE_ID = 'locale';
const DEBUG_ID = 'debugMode';
const BTN_RETRY_ID = 'btnRetry';

const STORAGE_KEY = 'face-validator-captures';
const MAX_THUMBNAILS = 3;

let validator: FaceValidator | null = null;
let cameraStream: MediaStream | null = null;
let currentLocale: SupportedLocale = 'pt-BR';
let capturedImages: string[] = [];

// Traduções da interface
const translations = {
  'pt-BR': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Validação de selfie em tempo real com detecção de face',
    languageLabel: '🌐 Idioma',
    debugLabel: '🔍 Modo Debug',
    debugCheckbox: 'Mostrar landmarks',
    retryButton: '🔄 Tentar Novamente',
    allowCameraButton: '📷 Permitir Acesso à Câmera',
    previewTitle: '✅ Captura realizada!',
    footerText: 'Desenvolvido com ❤️ usando',
    githubLink: 'Ver no GitHub',
    initialMessage: 'Clique no botão abaixo para permitir o acesso à câmera e iniciar a validação facial.',
    requestingCamera: 'Solicitando acesso à câmera...',
    cameraReady: 'Câmera pronta! Aguarde, iniciando validação...',
    cameraError: 'Erro ao acessar câmera',
    permissionDenied: 'Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador e recarregue a página.',
    cameraNotAvailable: 'Câmera não disponível. Recarregue a página.',
    startingValidation: 'Iniciando validação facial...',
    captureSuccess: 'Captura realizada com sucesso!',
    validationStopped: 'Validação parada. Clique em "Tentar Novamente" para recomeçar.',
    thumbnailsTitle: 'Últimas capturas',
  },
  'en': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Real-time selfie validation with face detection',
    languageLabel: '🌐 Language',
    debugLabel: '🔍 Debug Mode',
    debugCheckbox: 'Show landmarks',
    retryButton: '🔄 Try Again',
    allowCameraButton: '📷 Allow Camera Access',
    previewTitle: '✅ Capture successful!',
    footerText: 'Developed with ❤️ using',
    githubLink: 'View on GitHub',
    initialMessage: 'Click the button below to allow camera access and start face validation.',
    requestingCamera: 'Requesting camera access...',
    cameraReady: 'Camera ready! Please wait, starting validation...',
    cameraError: 'Error accessing camera',
    permissionDenied: 'Permission denied. Please allow camera access in your browser settings and reload the page.',
    cameraNotAvailable: 'Camera not available. Reload the page.',
    startingValidation: 'Starting face validation...',
    captureSuccess: 'Capture successful!',
    validationStopped: 'Validation stopped. Click "Try Again" to restart.',
    thumbnailsTitle: 'Latest captures',
  },
  'es': {
    title: '🎭 Face Validator SDK',
    subtitle: 'Validación de selfie en tiempo real con detección de rostro y manos',
    languageLabel: '🌐 Idioma',
    debugLabel: '🔍 Modo Debug',
    debugCheckbox: 'Mostrar landmarks',
    retryButton: '🔄 Intentar Nuevamente',
    allowCameraButton: '📷 Permitir Acceso a la Cámara',
    previewTitle: '✅ ¡Captura realizada!',
    footerText: 'Desarrollado con ❤️ usando',
    githubLink: 'Ver en GitHub',
    initialMessage: 'Haga clic en el botón a continuación para permitir el acceso a la cámara e iniciar la validación facial.',
    requestingCamera: 'Solicitando acceso a la cámara...',
    cameraReady: 'Cámara lista! Espere, iniciando validación...',
    cameraError: 'Error al acceder a la cámara',
    permissionDenied: 'Permiso denegado. Por favor, permita el acceso a la cámara en la configuración del navegador y recargue la página.',
    cameraNotAvailable: 'Cámara no disponible. Recargue la página.',
    startingValidation: 'Iniciando validación facial...',
    captureSuccess: '¡Captura exitosa!',
    validationStopped: 'Validación detenida. Haga clic en "Intentar Nuevamente" para reiniciar.',
    thumbnailsTitle: 'Capturas recientes',
  },
};

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

// Gerenciamento de thumbnails no localStorage
function clearStoredThumbnails() {
  localStorage.removeItem(STORAGE_KEY);
  capturedImages = [];
}

function loadStoredThumbnails(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Error loading thumbnails from localStorage:', error);
    return [];
  }
}

function saveThumbnail(imageDataUrl: string) {
  // Adicionar nova imagem no início
  capturedImages.unshift(imageDataUrl);

  // Manter apenas as últimas 3
  if (capturedImages.length > MAX_THUMBNAILS) {
    capturedImages = capturedImages.slice(0, MAX_THUMBNAILS);
  }

  // Salvar no localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capturedImages));
  } catch (error) {
    console.warn('Error saving to localStorage:', error);
  }

  renderThumbnails();
}

function toggleThumbnailZoom(thumbnailElement: HTMLElement) {
  const overlay = document.getElementById('thumbnailOverlay');
  const isZoomed = thumbnailElement.classList.contains('zoomed');

  // Remover zoom de todos os thumbnails
  document.querySelectorAll('.thumbnail-item.zoomed').forEach(el => {
    el.classList.remove('zoomed');
  });

  if (isZoomed) {
    // Estava ampliado, fechar
    if (overlay) overlay.classList.remove('active');
  } else {
    // Ampliar este thumbnail
    thumbnailElement.classList.add('zoomed');
    if (overlay) overlay.classList.add('active');
  }
}

function renderThumbnails() {
  const container = document.getElementById(THUMBNAILS_LIST_ID);
  if (!container) return;

  container.innerHTML = '';

  capturedImages.forEach((imageDataUrl, index) => {
    const thumbnailItem = document.createElement('div');
    thumbnailItem.className = 'thumbnail-item fade-in';

    const img = document.createElement('img');
    img.src = imageDataUrl;
    img.alt = `Capture ${index + 1}`;

    // Evento de clique para ampliar (não fechar ao clicar na imagem ampliada)
    thumbnailItem.onclick = (e) => {
      // Se já está ampliado, não fazer nada (deixar apenas o overlay fechar)
      if (thumbnailItem.classList.contains('zoomed')) {
        return;
      }

      // Ampliar
      toggleThumbnailZoom(thumbnailItem);
    };

    thumbnailItem.appendChild(img);
    container.appendChild(thumbnailItem);
  });

  // Fechar zoom ao clicar no overlay (fora da imagem)
  const overlay = document.getElementById('thumbnailOverlay');
  if (overlay) {
    overlay.onclick = () => {
      document.querySelectorAll('.thumbnail-item.zoomed').forEach(el => {
        el.classList.remove('zoomed');
      });
      overlay.classList.remove('active');
    };
  }
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
  const retryButton = document.getElementById(BTN_RETRY_ID);
  const allowCameraButton = document.getElementById('btnAllowCamera');
  const initialMessage = document.getElementById('initialMessage');
  const previewTitle = document.getElementById('previewTitle');
  const footerText = document.getElementById('footerText');
  const githubLink = document.getElementById('githubLink');
  const thumbnailsTitle = document.getElementById('thumbnailsTitle');

  if (title) title.textContent = translate('title');
  if (subtitle) subtitle.textContent = translate('subtitle');
  if (languageLabel) languageLabel.textContent = translate('languageLabel');
  if (debugLabel) debugLabel.textContent = translate('debugLabel');
  if (debugCheckboxLabel) debugCheckboxLabel.textContent = translate('debugCheckbox');
  if (retryButton) retryButton.textContent = translate('retryButton');
  if (allowCameraButton) allowCameraButton.textContent = translate('allowCameraButton');
  if (initialMessage) initialMessage.textContent = translate('initialMessage');
  if (previewTitle) previewTitle.textContent = translate('previewTitle');
  if (footerText) footerText.textContent = translate('footerText');
  if (githubLink) githubLink.textContent = translate('githubLink');
  if (thumbnailsTitle) thumbnailsTitle.textContent = translate('thumbnailsTitle');
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
 * Inicializa a câmera com permissão do usuário
 */
async function initCamera() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  const allowCameraButton = document.getElementById('btnAllowCamera');
  const initialScreen = document.getElementById('initialScreen');

  statusContainer.classList.remove('success', 'error', 'warning');
  statusEl.textContent = translate('requestingCamera');

  // Ocultar tela inicial e botão de permitir
  if (initialScreen) initialScreen.style.display = 'none';
  if (allowCameraButton) allowCameraButton.style.display = 'none';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 512, height: 384, facingMode: 'user' }
    });
    cameraStream = stream;
    video.srcObject = stream;
    await video.play();

    statusContainer.classList.remove('error');
    statusEl.textContent = translate('cameraReady');

    // Iniciar validação automaticamente após 500ms
    setTimeout(() => {
      startValidation();
    }, 500);
  } catch (err: any) {
    statusContainer.classList.add('error');

    // Verificar tipo de erro
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      statusEl.textContent = translate('permissionDenied');
    } else {
      statusEl.textContent = `${translate('cameraError')}: ${err.message}`;
    }

    console.error('Erro ao acessar câmera:', err);

    // Mostrar botão novamente para tentar de novo
    if (allowCameraButton) allowCameraButton.style.display = 'block';
  }
}

/**
 * Inicia a validação facial
 */
async function startValidation() {
  const video = getEl<HTMLVideoElement>(VIDEO_ID);
  const overlay = getEl<HTMLCanvasElement>(OVERLAY_ID);
  const statusEl = getEl<HTMLDivElement>(STATUS_ID);
  const statusContainer = getEl<HTMLDivElement>(STATUS_CONTAINER_ID);
  const debugCheckbox = getEl<HTMLInputElement>(DEBUG_ID);
  const btnRetry = getEl<HTMLButtonElement>(BTN_RETRY_ID);

  if (validator) {
    validator.stop();
    validator = null;
  }

  // Verificar se a câmera está ativa
  if (!cameraStream || !video.srcObject) {
    statusContainer.classList.add('error');
    statusEl.textContent = translate('cameraNotAvailable');
    return;
  }

  // Ocultar botão Retry durante validação
  btnRetry.style.display = 'none';

  // Resetar status
  statusContainer.classList.remove('success', 'error', 'warning');
  statusEl.textContent = translate('startingValidation');

  // FaceValidator inicia automaticamente no construtor
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

      // Converter blob para Data URL para salvar no localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        saveThumbnail(dataUrl);
      };
      reader.readAsDataURL(blob);

      // Mostrar botão retry
      btnRetry.style.display = 'block';
    },
    onError: (errorType: ValidationStatus, error: Error) => {
      updateStatusUI(errorType, `Erro: ${error.message}`);
      console.error(errorType, error);
      // Mostrar botão retry em caso de erro
      btnRetry.style.display = 'block';
    },
  });
}

/**
 * Reinicia a validação facial (para a validação atual e inicia uma nova)
 */
function retry() {
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
  statusEl.textContent = translate('validationStopped');

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
  const btnRetry = document.getElementById(BTN_RETRY_ID);
  const btnAllowCamera = document.getElementById('btnAllowCamera');
  const localeSelect = getEl<HTMLSelectElement>(LOCALE_ID);
  const initialScreen = document.getElementById('initialScreen');

  // Limpar capturas do localStorage ao carregar a página
  clearStoredThumbnails();
  renderThumbnails();

  // Ocultar botão Retry inicialmente
  if (btnRetry) btnRetry.style.display = 'none';

  // Mostrar tela inicial
  if (initialScreen) initialScreen.style.display = 'flex';

  // Event listeners
  if (btnRetry) btnRetry.addEventListener('click', retry);
  if (btnAllowCamera) btnAllowCamera.addEventListener('click', initCamera);
  localeSelect.addEventListener('change', changeLanguage);

  // Fechar zoom ao pressionar ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const zoomed = document.querySelector('.thumbnail-item.zoomed');
      const overlay = document.getElementById('thumbnailOverlay');
      if (zoomed) {
        zoomed.classList.remove('zoomed');
      }
      if (overlay) {
        overlay.classList.remove('active');
      }
    }
  });

  // Configurar idioma inicial
  currentLocale = localeSelect.value as SupportedLocale;
  updatePageTexts();
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
