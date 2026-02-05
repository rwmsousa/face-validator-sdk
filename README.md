# face-validator-sdk

Real-time selfie validation SDK with face detection, optional bundled models, and i18n (pt-BR, en, es). Built on [face-api.js](https://github.com/justadudewhohacks/face-api.js).

## Features

- **Face detection & validation**: Single face, distance, centering (nose), illumination, and stability checks.
- **Optional model path**: Use your own model URL or omit it to use the default (see [Models](#models)).
- **i18n**: Portuguese (pt-BR), English (en), and Spanish (es) with optional custom messages.
- **Multiple builds**: ESM, CJS, and UMD.

## Installation

```bash
npm install face-validator-sdk face-api.js
```

Peer dependency: `face-api.js` (e.g. `^0.22.2`).

## Models

The SDK uses the **Tiny** face-api.js models: `tinyFaceDetector` and `faceLandmark68TinyNet`.

- **Option A – Custom URL**: Pass `modelPath` in options (e.g. your CDN or public path where the weights are served).
- **Option B – Bundled**: Add the weight files to the `models/` folder in the package (see [face-api.js weights](https://github.com/justadudewhohacks/face-api.js/tree/master/weights)), build the package, then serve `dist/models/` from your app (e.g. at `/models/`). If you don’t set `modelPath`, the SDK uses a default base URL (e.g. `./models/` or, in ESM, one derived from `import.meta.url` when available).

See `models/README.md` in the repo for how to obtain the required weight files.

## Usage

```js
import FaceValidator, { ValidationStatus } from 'face-validator-sdk';

const video = document.querySelector('video');
const overlay = document.querySelector('canvas');

const validator = new FaceValidator({
  videoElement: video,
  overlayCanvasElement: overlay ?? undefined,
  locale: 'en',
  // modelPath: '/models',  // optional; omit to use default
  onStatusUpdate: (status, message) => {
    console.log(status, message);
  },
  onCaptureSuccess: (blob) => {
    // Use the captured selfie (e.g. upload, preview)
  },
  onError: (status, err) => {
    console.error(status, err);
  },
});

await validator.start();
// Later: validator.stop();
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `videoElement` | `HTMLVideoElement` | required | Video element for the camera stream. |
| `overlayCanvasElement` | `HTMLCanvasElement \| null` | `undefined` | Optional canvas for debug overlay. |
| `modelPath` | `string` | default URL | Base URL for face-api.js models. |
| `locale` | `'pt-BR' \| 'en' \| 'es'` | `'en'` | UI language. |
| `customMessages` | `Partial<Record<ValidationStatus, string>>` | `{}` | Override messages per status. |
| `onStatusUpdate` | `(status, message) => void` | required | Called on each status change. |
| `onCaptureSuccess` | `(blob: Blob) => void` | required | Called with the captured image. |
| `onError` | `(status, error) => void` | required | Called on error. |
| `videoWidth` / `videoHeight` | `number` | 640 / 480 | Preferred video size. |
| `minDetectionConfidence` | `number` | 0.6 | Face detection threshold (0–1). |
| `minIlluminationThreshold` | `number` | 70 | Min brightness (0–255). |
| `minFaceSizeFactor` / `maxFaceSizeFactor` | `number` | 0.25 / 0.65 | Face size vs frame width. |
| `stabilizationTimeThreshold` | `number` | 1000 | Ms to stay still before capture. |
| `noseCenteringTolerance` | `number` | 0.1 | Nose centering tolerance. |
| `debugMode` | `boolean` | `false` | Mostra retângulo da face e ponto do nariz no overlay (a moldura e a mira central são sempre exibidas). |

## API

- **`FaceValidator`** – Main class. `start()`, `stop()`.
- **`ValidationStatus`** – Enum of states (e.g. `NO_FACE_DETECTED`, `STAY_STILL`, `CAPTURING`, `SUCCESS`, `ERROR`).
- **`getMessage(status, locale)`** – Get default message for a status and locale.
- **`getValidationMessages(locale)`** – Get all default messages for a locale.
- **`getLoadingModelsMessage(locale)`** – “Loading models…” for the locale.
- **`getDefaultModelBaseUrl()`** – Default base URL used when `modelPath` is not set.

## Local demo

To run the SDK in a browser and test the flow (camera, validation, capture) locally:

```bash
npm install
npm run dev
```

(or `npm run demo` — same command.)

This starts a dev server and opens the demo in the browser. **URL:** [http://localhost:8081/](http://localhost:8081/). The terminal also prints this URL when the server is ready. Models are loaded from a public CDN, so no local weight files are required. Use **Start** to begin, allow camera access, and follow the on-screen messages; the captured image appears in the preview area.

The dev server runs with **hot reload**: changes to files in `demo/` or `src/` trigger a rebuild and the browser updates automatically.

## License

See repository license.
