import { FaceValidator } from './FaceValidator';
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
export default FaceValidator;
