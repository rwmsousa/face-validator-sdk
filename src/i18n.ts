import { ValidationStatus, type SupportedLocale } from './types';

export type { SupportedLocale };

const messages: Record<SupportedLocale, Record<ValidationStatus, string>> = {
  'pt-BR': {
    [ValidationStatus.INITIALIZING]: 'Inicializando câmera e detector...',
    [ValidationStatus.NO_FACE_DETECTED]: 'Posicione seu rosto no centro do oval.',
    [ValidationStatus.FACE_DETECTED]: 'Analisando...',
    [ValidationStatus.TOO_CLOSE]: 'Afaste-se um pouco',
    [ValidationStatus.TOO_FAR]: 'Aproxime-se da câmera',
    [ValidationStatus.OFF_CENTER]: 'Centralize o rosto no centro do oval',
    [ValidationStatus.FACE_OBSTRUCTED]: 'Mantenha o rosto totalmente visível. Remova as mãos do rosto.',
    [ValidationStatus.HEAD_NOT_STRAIGHT]: 'Olhe diretamente para a câmera e mantenha a cabeça reta.',
    [ValidationStatus.MULTIPLE_FACES]: 'Mantenha apenas uma pessoa no quadro.',
    [ValidationStatus.POOR_ILLUMINATION]:
      'Procure um ambiente com boa iluminação e centralize seu rosto no centro do oval.',
    [ValidationStatus.NOT_NEUTRAL_EXPRESSION]: 'Mantenha expressão neutra: boca fechada, sem sorrir e olhos abertos.',
    [ValidationStatus.DARK_GLASSES]: 'Remova os óculos escuros. Óculos de grau são permitidos.',
    [ValidationStatus.STAY_STILL]: 'Fique imóvel para capturar a foto',
    [ValidationStatus.CAPTURING]: 'Capturando...',
    [ValidationStatus.SUCCESS]: 'Captura realizada!',
    [ValidationStatus.ERROR]: 'Ocorreu um erro.',
  },
  en: {
    [ValidationStatus.INITIALIZING]: 'Initializing camera and detector...',
    [ValidationStatus.NO_FACE_DETECTED]: 'Position your face in the center of the oval.',
    [ValidationStatus.FACE_DETECTED]: 'Analyzing...',
    [ValidationStatus.TOO_CLOSE]: 'Move back a little',
    [ValidationStatus.TOO_FAR]: 'Move closer to the camera',
    [ValidationStatus.OFF_CENTER]: 'Center your face in the center of the oval',
    [ValidationStatus.FACE_OBSTRUCTED]: 'Keep your face fully visible. Remove your hands from your face.',
    [ValidationStatus.HEAD_NOT_STRAIGHT]: 'Look directly at the camera and keep your head straight.',
    [ValidationStatus.MULTIPLE_FACES]: 'Keep only one person in the frame.',
    [ValidationStatus.POOR_ILLUMINATION]:
      'Find a well-lit environment and center your face in the oval.',
    [ValidationStatus.NOT_NEUTRAL_EXPRESSION]: 'Keep a neutral expression: mouth closed, no smiling, and eyes open.',
    [ValidationStatus.DARK_GLASSES]: 'Remove sunglasses. Prescription glasses are allowed.',
    [ValidationStatus.STAY_STILL]: 'Stay still to capture the photo',
    [ValidationStatus.CAPTURING]: 'Capturing...',
    [ValidationStatus.SUCCESS]: 'Capture complete!',
    [ValidationStatus.ERROR]: 'An error occurred.',
  },
  es: {
    [ValidationStatus.INITIALIZING]: 'Inicializando cámara y detector...',
    [ValidationStatus.NO_FACE_DETECTED]: 'Coloque su rostro en el centro del óvalo.',
    [ValidationStatus.FACE_DETECTED]: 'Analizando...',
    [ValidationStatus.TOO_CLOSE]: 'Aléjese un poco',
    [ValidationStatus.TOO_FAR]: 'Acérquese a la cámara',
    [ValidationStatus.OFF_CENTER]: 'Centre el rostro en el centro del óvalo',
    [ValidationStatus.FACE_OBSTRUCTED]: 'Mantenga el rostro totalmente visible. Quite las manos del rostro.',
    [ValidationStatus.HEAD_NOT_STRAIGHT]: 'Mire directamente a la cámara y mantenga la cabeza recta.',
    [ValidationStatus.MULTIPLE_FACES]: 'Mantenga solo una persona en el encuadre.',
    [ValidationStatus.POOR_ILLUMINATION]:
      'Busque un ambiente con buena iluminación y centre su rostro en el óvalo.',
    [ValidationStatus.NOT_NEUTRAL_EXPRESSION]: 'Mantenga expresión neutra: boca cerrada, sin sonreír y ojos abiertos.',
    [ValidationStatus.DARK_GLASSES]: 'Quite las gafas de sol. Las gafas graduadas están permitidas.',
    [ValidationStatus.STAY_STILL]: 'Permanezca quieto para capturar la foto',
    [ValidationStatus.CAPTURING]: 'Capturando...',
    [ValidationStatus.SUCCESS]: '¡Captura realizada!',
    [ValidationStatus.ERROR]: 'Ocurrió un error.',
  },
};

const unknownStatusByLocale: Record<SupportedLocale, string> = {
  'pt-BR': 'Status desconhecido.',
  en: 'Unknown status.',
  es: 'Estado desconhecido.',
};

/**
 * Returns the validation messages for the given locale.
 */
export function getValidationMessages(
  locale: SupportedLocale
): Record<ValidationStatus, string> {
  return { ...messages[locale] };
}

/**
 * Returns the message for a given status and locale.
 */
export function getMessage(status: ValidationStatus, locale: SupportedLocale): string {
  return messages[locale][status] ?? unknownStatusByLocale[locale];
}

/**
 * Returns the "Loading models..." message for a given locale (used during model load).
 */
export function getLoadingModelsMessage(locale: SupportedLocale): string {
  const loading: Record<SupportedLocale, string> = {
    'pt-BR': 'Carregando modelos...',
    en: 'Loading models...',
    es: 'Cargando modelos...',
  };
  return loading[locale];
}
