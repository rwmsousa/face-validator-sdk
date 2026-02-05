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
 */
const MEDIAPIPE_NOSE_TIP = 4;
const MEDIAPIPE_LEFT_EYE = [33, 133, 159, 145];
const MEDIAPIPE_RIGHT_EYE = [263, 362, 386, 374];
const MEDIAPIPE_MOUTH_OUTER = [61, 291, 0, 17, 39, 269, 270, 409];

/**
 * Proporções do oval da moldura para centralização.
 * Aumentado para garantir que toda a face caiba dentro do oval.
 */
const OVAL_RADIUS_X_FACTOR = 0.24; // Aumentado para aceitar cabeças maiores
const OVAL_RADIUS_Y_FACTOR = 0.42; // Aumentado para aceitar cabeças maiores

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
  return dx * dx + dy * dy <= 1;
}

/**
 * Verifica se o bounding box da face cabe dentro do oval de enquadramento.
 * Usa margem de segurança para garantir que toda a cabeça seja capturada.
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

  // Adicionar margem de 5% para garantir que não corte a cabeça (reduzido de 10%)
  const margin = 0.05;
  const faceWidth = faceRight - faceLeft;
  const faceHeight = faceBottom - faceTop;
  const marginX = faceWidth * margin;
  const marginY = faceHeight * margin;

  // Verificar se os 4 cantos (com margem) estão dentro do oval
  const corners = [
    { x: faceLeft - marginX, y: faceTop - marginY }, // Top-left
    { x: faceRight + marginX, y: faceTop - marginY }, // Top-right
    { x: faceLeft - marginX, y: faceBottom + marginY }, // Bottom-left
    { x: faceRight + marginX, y: faceBottom + marginY }, // Bottom-right
  ];

  // Todos os cantos devem estar dentro do oval
  for (const corner of corners) {
    const dx = (corner.x - cx) / rx;
    const dy = (corner.y - cy) / ry;
    if (dx * dx + dy * dy > 1) {
      return false;
    }
  }

  return true;
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
  const midEyesX = (leftEye.x + rightEye.x) / 2;
  const noseOffsetX = nose.x - midEyesX;
  const eyeDist = Math.abs(leftEye.x - rightEye.x);
  if (eyeDist < 0.01) return false;
  const yawRatio = Math.abs(noseOffsetX) / eyeDist;
  const yawAngleDeg = Math.atan(yawRatio) * (180 / Math.PI);
  if (yawAngleDeg > maxTiltDegrees) return false;

  // Pitch: inclinação vertical (cabeça para cima/baixo)
  const midEyesY = (leftEye.y + rightEye.y) / 2;
  const mouthY = (upperLip.y + lowerLip.y) / 2;
  
  // 1. CRÍTICO: Verificar ordem vertical correta dos elementos
  // Em coordenadas de tela, Y cresce para baixo, então ordem deve ser: testa < olhos < nariz < boca < queixo
  if (forehead.y >= midEyesY) {
    // Testa está no mesmo nível ou ABAIXO dos olhos = ERRO GRAVE (cabeça para trás)
    return false;
  }
  
  if (midEyesY >= nose.y) {
    // Olhos estão no mesmo nível ou ABAIXO do nariz = inclinação para trás
    return false;
  }
  
  if (nose.y >= mouthY) {
    // Nariz está no mesmo nível ou ABAIXO da boca = inclinação severa
    return false;
  }
  
  if (mouthY >= chin.y) {
    // Boca está no mesmo nível ou ABAIXO do queixo = geometria inválida
    return false;
  }
  
  // 2. Verificar altura total da face é plausível
  const faceHeight = chin.y - forehead.y;
  if (faceHeight < 0.15) {
    // Face muito "achatada" verticalmente = inclinação para trás
    return false;
  }
  
  // 3. Verificar proporções corretas entre elementos
  const foreheadToEyes = midEyesY - forehead.y;
  const eyesToNose = nose.y - midEyesY;
  const noseToMouth = mouthY - nose.y;
  const mouthToChin = chin.y - mouthY;
  
  // Proporções esperadas em face frontal:
  // - Testa-olhos: ~20-30% da altura total
  // - Olhos-nariz: ~10-18% da altura total
  // - Nariz-boca: ~8-15% da altura total
  // - Boca-queixo: ~15-25% da altura total
  
  const foreheadEyesRatio = foreheadToEyes / faceHeight;
  const eyesNoseRatio = eyesToNose / faceHeight;
  const noseMouthRatio = noseToMouth / faceHeight;
  const mouthChinRatio = mouthToChin / faceHeight;
  
  // Validar testa-olhos (se muito pequeno = testa oculta = inclinação para trás)
  if (foreheadEyesRatio < 0.18) {
    return false; // Testa muito pequena ou oculta
  }
  
  // Validar olhos-nariz (se muito pequeno = elementos comprimidos = inclinação)
  if (eyesNoseRatio < 0.08) {
    return false;
  }
  
  // Validar nariz-boca (se muito pequeno = face comprimida = inclinação)
  if (noseMouthRatio < 0.06) {
    return false;
  }
  
  // Validar boca-queixo (se muito pequeno = queixo oculto ou comprimido)
  if (mouthChinRatio < 0.12) {
    return false;
  }
  
  // 4. Verificação adicional: nariz não pode estar muito acima dos olhos
  if (nose.y < midEyesY) {
    // Nariz acima dos olhos é impossível em face frontal
    return false;
  }
  
  // 5. Verificar se nariz está na posição correta (não muito longe abaixo dos olhos)
  if (eyesNoseRatio > 0.18) {
    // Nariz muito longe dos olhos = face esticada = inclinação para frente
    return false;
  }
  
  // 6. Verificar se boca está em posição plausível em relação ao nariz
  if (noseMouthRatio > 0.15) {
    // Boca muito longe do nariz = inclinação para frente
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

  // Boca deve estar abaixo do nariz
  if (mouthCenterY <= nose.y) return false;

  // Distância nariz–centro da boca: mínimo 10% da altura (reduzido de 12% para aceitar óculos)
  const noseToMouthDist = mouthCenterY - nose.y;
  if (noseToMouthDist < 0.10 * boxHeight) return false;

  // Extensão vertical da boca: mínimo 3% da altura (reduzido de 3.5%)
  if (mouthVerticalSpread < 0.03 * boxHeight) return false;

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

  // 1) Área fora do oval esmaecida
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
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

  // Debug: desenhar face bounding box e landmarks
  if (debugMode && faceData) {
    const bbox = faceData.boundingBox;
    const x = bbox.xMin * frameWidth;
    const y = bbox.yMin * frameHeight;
    const w = bbox.width * frameWidth;
    const h = bbox.height * frameHeight;

    // Bounding box colorido por status
    let boxColor = 'red';
    if (status === ValidationStatus.STAY_STILL || status === ValidationStatus.CAPTURING) {
      boxColor = 'lime';
    } else if (status === ValidationStatus.FACE_DETECTED) {
      boxColor = 'yellow';
    }

    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Desenhar nariz (ponto de referência)
    if (faceData.landmarks.length >= 478) {
      const nose = faceData.landmarks[MEDIAPIPE_NOSE_TIP];
      ctx.fillStyle = 'cyan';
      ctx.beginPath();
      ctx.arc(nose.x * frameWidth, nose.y * frameHeight, 5, 0, 2 * Math.PI);
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
