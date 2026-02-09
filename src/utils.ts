import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { DetectedFaceData, DetectedHandData, ValidationStatus, BoundingBox } from './types';

/**
 * Calcula o brilho médio de uma região da imagem (0-255).
 */
export function calculateAverageBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminance formula: ITU-R BT.709
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luminance;
  }
  return sum / (data.length / 4);
}

/**
 * Verifica se a face está na distância adequada (baseado no tamanho do bounding box).
 */
export function checkFaceDistance(
  boundingBox: BoundingBox,
  minFaceSizeFactor: number = 0.18,
  maxFaceSizeFactor: number = 0.70
): 'OK' | 'TOO_FAR' | 'TOO_CLOSE' {
  // boundingBox.width é normalizado (0-1)
  const faceWidthRatio = boundingBox.width;
  if (faceWidthRatio < minFaceSizeFactor) return 'TOO_FAR';
  if (faceWidthRatio > maxFaceSizeFactor) return 'TOO_CLOSE';
  return 'OK';
}

/**
 * MediaPipe Face Mesh landmark indices (478 pontos):
 * - Nose tip: 4
 * - Left eye: 33, 133, 159, 145
 * - Right eye: 263, 362, 386, 374
 * - Mouth: 61, 291, 0, 17 (outer lips)
 * - Face oval: contorno do rosto
 * - Ears: left ear (234), right ear (454)
 * - Eye iris: left (468-471), right (473-476)
 * - Eyelids: upper left (159, 145), lower left (144, 153), upper right (386, 374), lower right (373, 380)
 * - Mouth corners: left (61), right (291)
 * - Lips: upper (13), lower (14)
 */
const MEDIAPIPE_NOSE_TIP = 4;
const MEDIAPIPE_LEFT_EYE = [33, 133, 159, 145];
const MEDIAPIPE_RIGHT_EYE = [263, 362, 386, 374];
const MEDIAPIPE_MOUTH_OUTER = [61, 291, 0, 17, 39, 269, 270, 409];
const MEDIAPIPE_LEFT_EAR = 234;
const MEDIAPIPE_RIGHT_EAR = 454;
const MEDIAPIPE_LEFT_EYE_TOP = 159;
const MEDIAPIPE_LEFT_EYE_BOTTOM = 144;
const MEDIAPIPE_RIGHT_EYE_TOP = 386;
const MEDIAPIPE_RIGHT_EYE_BOTTOM = 373;
const MEDIAPIPE_MOUTH_LEFT_CORNER = 61;
const MEDIAPIPE_MOUTH_RIGHT_CORNER = 291;
const MEDIAPIPE_MOUTH_TOP = 13;
const MEDIAPIPE_MOUTH_BOTTOM = 14;

/**
 * Proporções do oval da moldura para centralização.
 * Ajustado para o tamanho do container (512x384) e para não encostar
 * nas bordas do vídeo em integrações como o modal do datasync-front.
 */
const OVAL_RADIUS_X_FACTOR = 0.20; // Raio horizontal do oval (20% da largura)
const OVAL_RADIUS_Y_FACTOR = 0.34; // Raio vertical do oval (34% da altura)

/**
 * Verifica se um ponto (normalizado 0-1) está dentro do oval de enquadramento.
 */
export function isPointInsideOval(
  pointX: number,
  pointY: number,
  frameWidth: number,
  frameHeight: number
): boolean {
  // Converter ponto normalizado para pixels
  const px = pointX * frameWidth;
  const py = pointY * frameHeight;
  const cx = frameWidth / 2;
  const cy = frameHeight / 2;
  const rx = frameWidth * OVAL_RADIUS_X_FACTOR;
  const ry = frameHeight * OVAL_RADIUS_Y_FACTOR;
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  const distanceSquared = dx * dx + dy * dy;

  // Mais rigoroso: nariz deve ficar próximo do centro do oval,
  // não apenas "em qualquer ponto dentro" da borda.
  // 1.0 = borda exata do oval; 0.6 ≈ região central mais restrita.
  return distanceSquared <= 0.6;
}

/**
 * Verifica se o bounding box da face cabe dentro do oval de enquadramento.
 * Versão simplificada: verifica apenas o centro e limites principais sem margem excessiva.
 */
export function isFaceBoundingBoxInsideOval(
  boundingBox: BoundingBox,
  frameWidth: number,
  frameHeight: number
): boolean {
  const cx = frameWidth / 2;
  const cy = frameHeight / 2;
  const rx = frameWidth * OVAL_RADIUS_X_FACTOR;
  const ry = frameHeight * OVAL_RADIUS_Y_FACTOR;

  // Converter bbox normalizado para pixels
  const faceLeft = boundingBox.xMin * frameWidth;
  const faceRight = (boundingBox.xMin + boundingBox.width) * frameWidth;
  const faceTop = boundingBox.yMin * frameHeight;
  const faceBottom = (boundingBox.yMin + boundingBox.height) * frameHeight;
  const faceCenterX = (faceLeft + faceRight) / 2;
  const faceCenterY = (faceTop + faceBottom) / 2;

  // 1. Centro da face deve estar dentro do oval (sem folga)
  const centerDx = (faceCenterX - cx) / rx;
  const centerDy = (faceCenterY - cy) / ry;
  if (centerDx * centerDx + centerDy * centerDy > 1.0) {
    return false;
  }

  // 2. Verificar todos os cantos SEM margem adicional
  const corners = [
    { x: faceLeft, y: faceTop },     // Top-left
    { x: faceRight, y: faceTop },    // Top-right
    { x: faceLeft, y: faceBottom },  // Bottom-left
    { x: faceRight, y: faceBottom }, // Bottom-right
  ];

  // Mais rigoroso: nenhum canto pode ficar significativamente fora do oval
  let cornersOutside = 0;
  for (const corner of corners) {
    const dx = (corner.x - cx) / rx;
    const dy = (corner.y - cy) / ry;
    if (dx * dx + dy * dy > 1.0) {
      cornersOutside++;
    }
  }

  // Não permitir cantos fora
  return cornersOutside === 0;
}

/**
 * Verifica se a cabeça está reta (sem inclinação lateral, horizontal ou vertical).
 * MediaPipe: usa landmarks dos olhos, nariz e boca.
 */
export function isHeadStraight(
  landmarks: NormalizedLandmark[],
  maxTiltDegrees: number = 25
): boolean {
  if (landmarks.length < 478) return false;

  // Pontos dos olhos
  const leftEye = landmarks[MEDIAPIPE_LEFT_EYE[0]]; // 33
  const rightEye = landmarks[MEDIAPIPE_RIGHT_EYE[0]]; // 263
  const nose = landmarks[MEDIAPIPE_NOSE_TIP]; // 4

  // Pontos da boca para pitch
  const upperLip = landmarks[13]; // Lábio superior central
  const lowerLip = landmarks[14]; // Lábio inferior central
  const chin = landmarks[152]; // Queixo
  const forehead = landmarks[10]; // Testa

  // Roll: inclinação lateral (olhos desalinhados verticalmente)
  const eyeDeltaY = Math.abs(leftEye.y - rightEye.y);
  const eyeDeltaX = Math.abs(leftEye.x - rightEye.x);
  if (eyeDeltaX < 0.01) return false; // Proteção divisão por zero
  const rollRatio = eyeDeltaY / eyeDeltaX;
  const rollAngleDeg = Math.atan(rollRatio) * (180 / Math.PI);
  if (rollAngleDeg > maxTiltDegrees) return false;

  // Yaw: desvio horizontal (nariz deslocado do centro dos olhos)
  // NOTA: validação adicional usando orelhas é feita em isYawAcceptable()
  const midEyesX = (leftEye.x + rightEye.x) / 2;
  const noseOffsetX = nose.x - midEyesX;
  const eyeDist = Math.abs(leftEye.x - rightEye.x);
  if (eyeDist < 0.01) return false;
  const yawRatio = Math.abs(noseOffsetX) / eyeDist;
  const yawAngleDeg = Math.atan(yawRatio) * (180 / Math.PI);
  if (yawAngleDeg > maxTiltDegrees) return false;

  // Validação adicional de yaw usando orelhas (mais precisa para rostos na diagonal)
  if (!isYawAcceptable(landmarks)) return false;

  // Pitch: inclinação vertical (cabeça para cima/baixo)
  const midEyesY = (leftEye.y + rightEye.y) / 2;
  const mouthY = (upperLip.y + lowerLip.y) / 2;

  // Verificações SIMPLIFICADAS apenas para inclinações EXTREMAS
  // Permitir variações naturais de postura

  // 1. Verificar altura total da face é plausível
  const faceHeight = chin.y - forehead.y;
  if (faceHeight < 0.10) {
    // Face extremamente "achatada" verticalmente = inclinação MUITO severa
    return false;
  }

  // 2. Verificar apenas ordem básica dos elementos principais
  // Apenas rejeitar casos EXTREMOS onde a ordem está completamente invertida

  // Testa deve estar ACIMA dos olhos (com margem de tolerância)
  if (forehead.y > midEyesY + 0.02) {
    return false; // Testa abaixo dos olhos = MUITO inclinado para trás
  }

  // Olhos devem estar ACIMA do nariz (com margem)
  if (midEyesY > nose.y + 0.02) {
    return false; // Olhos abaixo do nariz = inclinação extrema
  }

  // Nariz deve estar ACIMA da boca (com margem)
  if (nose.y > mouthY + 0.02) {
    return false; // Nariz abaixo da boca = inclinação extrema
  }

  // Boca deve estar ACIMA do queixo (sempre deve ser verdade)
  if (mouthY >= chin.y) {
    return false; // Geometria impossível
  }

  // 3. Verificar proporções - detectar inclinações extremas
  const foreheadToEyes = midEyesY - forehead.y;
  const eyesToNose = nose.y - midEyesY;
  const noseToMouth = mouthY - nose.y;
  const mouthToChin = chin.y - mouthY;

  const foreheadEyesRatio = foreheadToEyes / faceHeight;
  const eyesNoseRatio = eyesToNose / faceHeight;
  const noseMouthRatio = noseToMouth / faceHeight;
  const mouthChinRatio = mouthToChin / faceHeight;

  // Testa-olhos:
  // - Se MUITO GRANDE (>38%) = cabeça inclinada para FRENTE (testa dominante)
  // - Se MUITO PEQUENO (<6%) = cabeça inclinada para TRÁS (testa oculta)
  if (foreheadEyesRatio < 0.06 || foreheadEyesRatio > 0.38) {
    return false;
  }

  // Olhos-nariz: aceitar de 3% a 30%
  if (eyesNoseRatio < 0.03 || eyesNoseRatio > 0.30) {
    return false;
  }

  // Nariz-boca: aceitar de 2% a 25%
  if (noseMouthRatio < 0.02 || noseMouthRatio > 0.25) {
    return false;
  }

  // Boca-queixo: MUITO flexível (barba pode interferir)
  // Apenas rejeitar casos extremos
  if (mouthChinRatio < 0.04 || mouthChinRatio > 0.38) {
    return false;
  }

  return true;
}

/**
 * Verifica se a geometria do rosto é plausível (boca visível, não obstruída por mão).
 * MediaPipe: analisa distância nariz-boca e extensão vertical da boca.
 */
export function isFaceGeometryPlausible(
  landmarks: NormalizedLandmark[],
  boundingBox: BoundingBox
): boolean {
  if (landmarks.length < 478) return false;

  const nose = landmarks[MEDIAPIPE_NOSE_TIP];

  // Pontos da boca (contorno externo)
  const mouthPoints = MEDIAPIPE_MOUTH_OUTER.map(idx => landmarks[idx]);
  const mouthCenterY = mouthPoints.reduce((s, p) => s + p.y, 0) / mouthPoints.length;
  const mouthMinY = Math.min(...mouthPoints.map(p => p.y));
  const mouthMaxY = Math.max(...mouthPoints.map(p => p.y));
  const mouthVerticalSpread = mouthMaxY - mouthMinY;

  const boxHeight = boundingBox.height;

  // Boca deve estar abaixo do nariz (com margem de tolerância)
  if (mouthCenterY < nose.y - 0.01) return false;

  // Distância nariz–centro da boca: mínimo 6% da altura (reduzido de 10% para aceitar barbas e óculos)
  const noseToMouthDist = mouthCenterY - nose.y;
  if (noseToMouthDist < 0.06 * boxHeight) return false;

  // Extensão vertical da boca: mínimo 2% da altura (reduzido de 3%)
  if (mouthVerticalSpread < 0.02 * boxHeight) return false;

  return true;
}

/**
 * Detecta se a pessoa está usando óculos escuros através da análise de luminosidade dos olhos.
 * Óculos de grau geralmente não bloqueiam completamente a luz, permitindo ver os olhos.
 */
export function hasDarkGlasses(
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[]
): boolean {
  if (landmarks.length < 478) return false;

  try {
    // Criar canvas temporário para capturar regiões dos olhos
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return false;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Definir landmarks dos olhos (área maior que inclui região ao redor)
    const leftEyeLandmarks = [
      landmarks[33],  // Canto externo
      landmarks[133], // Canto interno
      landmarks[159], // Superior
      landmarks[144], // Inferior
      landmarks[145], // Centro
    ];

    const rightEyeLandmarks = [
      landmarks[263], // Canto externo
      landmarks[362], // Canto interno
      landmarks[386], // Superior
      landmarks[373], // Inferior
      landmarks[374], // Centro
    ];

    // Função para calcular bounding box de uma região
    const getBoundingBox = (eyeLandmarks: NormalizedLandmark[]) => {
      const xs = eyeLandmarks.map(l => l.x * videoWidth);
      const ys = eyeLandmarks.map(l => l.y * videoHeight);

      const minX = Math.max(0, Math.min(...xs) - 5);
      const maxX = Math.min(videoWidth, Math.max(...xs) + 5);
      const minY = Math.max(0, Math.min(...ys) - 5);
      const maxY = Math.min(videoHeight, Math.max(...ys) + 5);

      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    // Função para calcular luminosidade média de uma região
    const getRegionBrightness = (box: { x: number; y: number; width: number; height: number }) => {
      tempCanvas.width = box.width;
      tempCanvas.height = box.height;

      ctx.drawImage(
        video,
        box.x, box.y, box.width, box.height,
        0, 0, box.width, box.height
      );

      const imageData = ctx.getImageData(0, 0, box.width, box.height);
      return calculateAverageBrightness(imageData);
    };

    // Analisar ambos os olhos
    const leftEyeBox = getBoundingBox(leftEyeLandmarks);
    const rightEyeBox = getBoundingBox(rightEyeLandmarks);

    const leftEyeBrightness = getRegionBrightness(leftEyeBox);
    const rightEyeBrightness = getRegionBrightness(rightEyeBox);

    const avgEyeBrightness = (leftEyeBrightness + rightEyeBrightness) / 2;

    // Threshold: se a região dos olhos está muito escura (< 40 em escala 0-255)
    // isso indica óculos escuros. Óculos de grau não bloqueiam tanto a luz.
    // Ajustado para 35 para ser mais sensível a óculos escuros
    return avgEyeBrightness < 35;

  } catch (error) {
    console.warn('Erro ao detectar óculos escuros:', error);
    return false; // Em caso de erro, não bloqueia a captura
  }
}

/**
 * Verifica se a expressão facial é neutra (sem sorriso, boca fechada, olhos abertos).
 * Rejeita: sorriso, boca aberta, olhos fechados.
 */
export function isNeutralExpression(landmarks: NormalizedLandmark[]): boolean {
  if (landmarks.length < 478) return false;

  // 1. Verificar se olhos estão abertos
  const leftEyeTop = landmarks[MEDIAPIPE_LEFT_EYE_TOP];
  const leftEyeBottom = landmarks[MEDIAPIPE_LEFT_EYE_BOTTOM];
  const rightEyeTop = landmarks[MEDIAPIPE_RIGHT_EYE_TOP];
  const rightEyeBottom = landmarks[MEDIAPIPE_RIGHT_EYE_BOTTOM];

  const leftEyeOpenness = Math.abs(leftEyeTop.y - leftEyeBottom.y);
  const rightEyeOpenness = Math.abs(rightEyeTop.y - rightEyeBottom.y);

  // Olhos devem estar abertos (mínimo 1% de abertura em coordenadas normalizadas)
  if (leftEyeOpenness < 0.01 || rightEyeOpenness < 0.01) {
    return false; // Olho(s) fechado(s)
  }

  // 2. Verificar se boca está fechada
  const mouthTop = landmarks[MEDIAPIPE_MOUTH_TOP];
  const mouthBottom = landmarks[MEDIAPIPE_MOUTH_BOTTOM];
  const mouthOpenness = Math.abs(mouthTop.y - mouthBottom.y);

  // Boca deve estar relativamente fechada (máximo 2.5% de abertura)
  if (mouthOpenness > 0.025) {
    return false; // Boca aberta
  }

  // 3. Verificar se há sorriso (cantos da boca elevados)
  const mouthLeftCorner = landmarks[MEDIAPIPE_MOUTH_LEFT_CORNER];
  const mouthRightCorner = landmarks[MEDIAPIPE_MOUTH_RIGHT_CORNER];
  const nose = landmarks[MEDIAPIPE_NOSE_TIP];

  // Calcular posição vertical média dos cantos da boca relativo ao nariz
  const mouthCornersAvgY = (mouthLeftCorner.y + mouthRightCorner.y) / 2;
  const noseMouthDistance = mouthCornersAvgY - nose.y;

  // Se os cantos da boca estão muito elevados (próximos ao nariz), é sorriso
  // Em expressão neutra, os cantos devem estar significativamente abaixo do nariz
  if (noseMouthDistance < 0.05) {
    return false; // Sorriso (cantos da boca elevados)
  }

  return true;
}

/**
 * Verifica yaw (inclinação lateral) usando visibilidade das orelhas.
 * Quando o rosto está virado para o lado, uma orelha fica mais visível que a outra.
 */
export function isYawAcceptable(landmarks: NormalizedLandmark[]): boolean {
  if (landmarks.length < 478) return false;

  const leftEar = landmarks[MEDIAPIPE_LEFT_EAR];
  const rightEar = landmarks[MEDIAPIPE_RIGHT_EAR];
  const nose = landmarks[MEDIAPIPE_NOSE_TIP];

  // Calcular distância de cada orelha ao nariz (em coordenadas normalizadas)
  const leftEarToNoseX = Math.abs(leftEar.x - nose.x);
  const rightEarToNoseX = Math.abs(rightEar.x - nose.x);

  // Calcular ratio de assimetria
  const asymmetryRatio = leftEarToNoseX > 0.01 && rightEarToNoseX > 0.01
    ? Math.max(leftEarToNoseX, rightEarToNoseX) / Math.min(leftEarToNoseX, rightEarToNoseX)
    : 1.0;

  // Se uma orelha está muito mais longe do nariz que a outra, o rosto está na diagonal
  // Permitir até 40% de assimetria (1.4 ratio)
  if (asymmetryRatio > 1.4) {
    return false; // Rosto muito virado para o lado
  }

  // Verificar visibilidade Z (profundidade) se disponível
  // Em MediaPipe, coordenada Z indica profundidade relativa
  if (leftEar.z !== undefined && rightEar.z !== undefined) {
    const zDifference = Math.abs(leftEar.z - rightEar.z);
    // Se a diferença de profundidade é muito grande, o rosto está na diagonal
    if (zDifference > 0.05) {
      return false; // Rosto virado lateralmente (detectado por profundidade)
    }
  }

  return true;
}

/**
 * Verifica se a face está estável (sem movimento significativo entre frames).
 */
export function isFaceStable(
  currentFace: DetectedFaceData | null,
  previousFace: DetectedFaceData | null,
  movementThreshold: number = 5,
  frameWidth: number = 512,
  frameHeight: number = 384
): boolean {
  if (!currentFace || !previousFace) return false;

  // Converter coordenadas normalizadas para pixels
  const currentCenterX = (currentFace.boundingBox.xMin + currentFace.boundingBox.width / 2) * frameWidth;
  const currentCenterY = (currentFace.boundingBox.yMin + currentFace.boundingBox.height / 2) * frameHeight;
  const previousCenterX = (previousFace.boundingBox.xMin + previousFace.boundingBox.width / 2) * frameWidth;
  const previousCenterY = (previousFace.boundingBox.yMin + previousFace.boundingBox.height / 2) * frameHeight;

  const deltaX = Math.abs(currentCenterX - previousCenterX);
  const deltaY = Math.abs(currentCenterY - previousCenterY);
  const deltaWidth = Math.abs(currentFace.boundingBox.width - previousFace.boundingBox.width) * frameWidth;
  const deltaHeight = Math.abs(currentFace.boundingBox.height - previousFace.boundingBox.height) * frameHeight;

  return (
    deltaX <= movementThreshold &&
    deltaY <= movementThreshold &&
    deltaWidth <= movementThreshold * 2 &&
    deltaHeight <= movementThreshold * 2
  );
}

/**
 * Calcula distância entre um ponto da mão e o centro do rosto (normalizado).
 * Retorna true se a mão estiver próxima ao rosto (indicando possível obstrução).
 */
export function isHandNearFace(
  handData: DetectedHandData,
  faceBoundingBox: BoundingBox,
  maxDistance: number = 0.15
): boolean {
  const faceCenterX = faceBoundingBox.xMin + faceBoundingBox.width / 2;
  const faceCenterY = faceBoundingBox.yMin + faceBoundingBox.height / 2;

  // Verificar se algum ponto da mão está próximo ao centro do rosto
  for (const landmark of handData.landmarks) {
    const dx = landmark.x - faceCenterX;
    const dy = landmark.y - faceCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < maxDistance) {
      return true;
    }
  }

  return false;
}

/**
 * Desenha overlay de feedback visual (oval, status, debug info).
 */
export function drawOverlay(
  canvas: HTMLCanvasElement,
  debugMode: boolean,
  status: ValidationStatus,
  faceData?: DetectedFaceData,
  handData?: DetectedHandData[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const frameWidth = canvas.width;
  const frameHeight = canvas.height;
  const frameCenterX = frameWidth / 2;
  const frameCenterY = frameHeight / 2;

  ctx.clearRect(0, 0, frameWidth, frameHeight);

  // Oval: guia de enquadramento
  const radiusX = frameWidth * OVAL_RADIUS_X_FACTOR;
  const radiusY = frameHeight * OVAL_RADIUS_Y_FACTOR;

  // 1) Área fora do oval esmaecida (mais transparente)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(0, 0, frameWidth, frameHeight);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(frameCenterX, frameCenterY, radiusX, radiusY, 0, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill();
  ctx.restore();

  // 2) Borda do oval
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(frameCenterX, frameCenterY, radiusX, radiusY, 0, 0, 2 * Math.PI);
  ctx.stroke();

  // 3) Mira central
  const crosshairLength = 6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frameCenterX - crosshairLength, frameCenterY);
  ctx.lineTo(frameCenterX + crosshairLength, frameCenterY);
  ctx.moveTo(frameCenterX, frameCenterY - crosshairLength);
  ctx.lineTo(frameCenterX, frameCenterY + crosshairLength);
  ctx.stroke();

  // Debug: desenhar face bounding box adaptável e landmarks
  if (debugMode && faceData) {
    // Calcular bounding box adaptável baseado nos landmarks reais
    const landmarks = faceData.landmarks;
    if (landmarks.length >= 478) {
      // Pontos importantes para definir limites da face
      const forehead = landmarks[10];
      const chin = landmarks[152];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];

      // Calcular limites da face com margem
      const allXCoords = landmarks.map(l => l.x);
      const allYCoords = landmarks.map(l => l.y);
      const minX = Math.min(...allXCoords);
      const maxX = Math.max(...allXCoords);
      const minY = Math.min(...allYCoords);
      const maxY = Math.max(...allYCoords);

      // Adicionar margem de 8% para incluir toda a cabeça
      const width = maxX - minX;
      const height = maxY - minY;
      const margin = 0.08;

      const x = (minX - width * margin) * frameWidth;
      const y = (minY - height * margin) * frameHeight;
      const w = width * (1 + 2 * margin) * frameWidth;
      const h = height * (1 + 2 * margin) * frameHeight;

      // Bounding box colorido por status (adaptável)
      let boxColor = 'red';
      if (status === ValidationStatus.STAY_STILL || status === ValidationStatus.CAPTURING) {
        boxColor = 'lime';
      } else if (status === ValidationStatus.FACE_DETECTED) {
        boxColor = 'yellow';
      }

      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Desenhar pontos de referência chave
      const nose = landmarks[MEDIAPIPE_NOSE_TIP];
      const leftEyePoint = landmarks[MEDIAPIPE_LEFT_EYE[0]];
      const rightEyePoint = landmarks[MEDIAPIPE_RIGHT_EYE[0]];

      // Nariz (cyan)
      ctx.fillStyle = 'cyan';
      ctx.beginPath();
      ctx.arc(nose.x * frameWidth, nose.y * frameHeight, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Testa (magenta) - importante para validação de inclinação
      ctx.fillStyle = 'magenta';
      ctx.beginPath();
      ctx.arc(forehead.x * frameWidth, forehead.y * frameHeight, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Queixo (verde)
      ctx.fillStyle = 'lime';
      ctx.beginPath();
      ctx.arc(chin.x * frameWidth, chin.y * frameHeight, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Landmarks dos olhos para visualização da detecção de óculos
      // Olho esquerdo (amarelo)
      ctx.fillStyle = 'yellow';
      const leftEyeLandmarks = [
        landmarks[33],  // Canto externo
        landmarks[133], // Canto interno
        landmarks[159], // Superior (pálpebra superior)
        landmarks[144], // Inferior (pálpebra inferior)
        landmarks[145], // Centro
      ];
      leftEyeLandmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * frameWidth, landmark.y * frameHeight, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Olho direito (amarelo)
      ctx.fillStyle = 'yellow';
      const rightEyeLandmarks = [
        landmarks[263], // Canto externo
        landmarks[362], // Canto interno
        landmarks[386], // Superior (pálpebra superior)
        landmarks[373], // Inferior (pálpebra inferior)
        landmarks[374], // Centro
      ];
      rightEyeLandmarks.forEach(landmark => {
        ctx.beginPath();
        ctx.arc(landmark.x * frameWidth, landmark.y * frameHeight, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Orelhas (roxo) - usadas na detecção de yaw
      ctx.fillStyle = 'purple';
      ctx.beginPath();
      ctx.arc(leftEar.x * frameWidth, leftEar.y * frameHeight, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightEar.x * frameWidth, rightEar.y * frameHeight, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // Debug: desenhar mãos
  if (debugMode && handData && handData.length > 0) {
    handData.forEach((hand) => {
      ctx.fillStyle = 'orange';
      hand.landmarks.forEach((landmark) => {
        ctx.beginPath();
        ctx.arc(landmark.x * frameWidth, landmark.y * frameHeight, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });
  }
}
