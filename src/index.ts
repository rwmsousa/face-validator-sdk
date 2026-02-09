import { FaceValidator } from './FaceValidator';
import { ReactSelfieCapture } from './ReactSelfieCapture';
import {
  ValidationStatus,
  type FaceValidatorOptions,
  type DetectedFaceData,
  type DetectedHandData,
  type SupportedLocale,
  type BoundingBox,
} from './types';
import {
  getValidationMessages,
  getMessage,
  getLoadingModelsMessage,
} from './i18n';

export { FaceValidator };
export { ValidationStatus, FaceValidatorOptions, DetectedFaceData, DetectedHandData, BoundingBox, SupportedLocale };
export { getValidationMessages, getMessage, getLoadingModelsMessage };
export { ReactSelfieCapture };
export default FaceValidator;
