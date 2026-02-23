# Face Validator SDK

Real-time selfie validation SDK with face detection, powered by **MediaPipe**. Detects faces, hands, and validates pose, lighting, and occlusions in real-time.

🎭 **[Live Demo](https://face-validator-sdk.vercel.app)** 

## ✨ Features

### Face Detection (478 landmarks)
- ✅ **Distance validation**: TOO_CLOSE / TOO_FAR
- ✅ **Centering**: Face must be centered in oval guide
- ✅ **Head pose**: Detects tilted or turned head
- ✅ **Illumination**: Validates proper lighting
- ✅ **Stability**: Ensures user stays still before capture
- ✅ **Multiple faces**: Rejects when more than one face detected

### Hand Detection (NEW! 🎉)
- ✅ **Hand near face detection**: Prevents hand covering face (obstructions)
- ✅ **21 landmarks per hand**: High precision tracking
- ✅ **Real-time validation**: Instant feedback

### Additional Features
- 🌐 **i18n**: Portuguese (pt-BR), English (en), Spanish (es)
- 🎨 **Visual feedback**: Oval guide with color-coded status
- 🐛 **Debug mode**: Visualize landmarks and bounding boxes
- 📦 **Multiple builds**: ESM, CJS, UMD
- 🚀 **GPU accelerated**: Powered by MediaPipe with GPU support

## 📦 Installation (Core SDK)

For any web application (React, Angular, Vue, vanilla JS, Java backend with JS frontend, etc.) that wants to use the **core validator**:

```bash
npm install face-validator-sdk
```

> The SDK declares `@mediapipe/tasks-vision` (^0.10.15) as a regular dependency, so it is installed automatically when you install `face-validator-sdk`.

## 🚀 Quick Start (Core API)

```typescript
import { FaceValidator, ValidationStatus } from 'face-validator-sdk';

const validator = new FaceValidator({
  container: '#selfieContainer',
  ui: 'default',
  locale: 'pt-BR',
  debugMode: false,
  mirror: true,
  onStatusUpdate: (status, message) => {
    console.log(status, message);
  },
  onCaptureSuccess: (blob) => {
    const url = URL.createObjectURL(blob);
    document.querySelector('img')!.src = url;
  },
  onError: (errorType, error) => {
    console.error(errorType, error);
  }
});

// The validator starts automatically.
// To stop and release resources: validator.destroy();
```

## 📊 Validation Status

| Status | Description |
|--------|-------------|
| `INITIALIZING` | Loading MediaPipe models |
| `NO_FACE_DETECTED` | No face found in frame |
| `FACE_DETECTED` | Face detected, validating... |
| `TOO_CLOSE` | Face too close to camera |
| `TOO_FAR` | Face too far from camera |
| `OFF_CENTER` | Face not centered in oval |
| `FACE_OBSTRUCTED` | **Hand covering face or low visibility** |
| `HEAD_NOT_STRAIGHT` | Head tilted or turned |
| `MULTIPLE_FACES` | More than one face detected |
| `POOR_ILLUMINATION` | Insufficient lighting |
| `STAY_STILL` | Hold still for capture |
| `CAPTURING` | Taking photo... |
| `SUCCESS` | Capture successful! |
| `ERROR` | An error occurred |

## ⚙️ Configuration Options

```typescript
interface FaceValidatorOptions {
  // UI structure
  container?: HTMLElement | string;   // Element or selector to auto-render video/canvas and status
  ui?: 'default' | 'none';            // Default: 'default'
  autoStart?: boolean;                // Default: true
  mirror?: boolean;                   // Default: true

  // Camera
  videoElement?: HTMLVideoElement;    // Use if you want to control the video manually
  overlayCanvasElement?: HTMLCanvasElement | null;
  videoConstraints?: MediaTrackConstraints;
  videoWidth?: number;
  videoHeight?: number;

  // Idioma e debug
  locale?: 'pt-BR' | 'en' | 'es';
  debugMode?: boolean;
  customMessages?: Partial<Record<ValidationStatus, string>>;

  // Callbacks
  onStatusUpdate?: (status: ValidationStatus, message: string) => void;
  onCaptureSuccess?: (imageBlob: Blob) => void;
  onError?: (errorType: ValidationStatus, error: Error) => void;

  // Thresholds de validacao
  minDetectionConfidence?: number;
  minIlluminationThreshold?: number;
  minFaceSizeFactor?: number;
  maxFaceSizeFactor?: number;
  stabilizationTimeThreshold?: number;
  stabilityMovementThreshold?: number;
  minFaceVisibilityScore?: number;
  maxHeadTiltDegrees?: number;
  maxHandFaceDistance?: number;

  // Advanced
  modelPath?: string; // Path to MediaPipe WASM (auto-detected via CDN)
}
```

## ✅ Usage with React (ReactSelfieCapture)

```tsx
import { ReactSelfieCapture } from 'face-validator-sdk';

export function SelfieModal() {
  const handleCapture = (imageBase64: string | null) => {
    if (!imageBase64) return;
    // Send the selfie to your API
  };

  return (
    <ReactSelfieCapture
      locale="pt-BR"
      onCapture={handleCapture}
      onDismiss={() => console.log('Modal closed')}
      debugMode={false}
      labels={{
        previewQuestion: 'Check your selfie before saving',
        savePhoto: 'Confirm selfie'
      }}
    />
  );
}
```

- `locale`: defines the language for messages and labels displayed.
- `onCapture`: main callback; receives the base64 image or `null` if the user cancels.
- `onDismiss`: used to close the modal/dialog when the user clicks cancel.
- `debugMode`: enables landmark visualization for debugging.
- `labels`: overrides default texts (e.g., preview title and button label).

## ✅ Usage with Angular (Core API)

```ts
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FaceValidator, ValidationStatus } from 'face-validator-sdk';

@Component({
  selector: 'app-selfie-dialog',
  template: '<div id="selfieContainer"></div>'
})
export class SelfieDialogComponent implements AfterViewInit, OnDestroy {
  private validator: FaceValidator | null = null;

  ngAfterViewInit(): void {
    this.validator = new FaceValidator({
      container: '#selfieContainer',
      ui: 'none',
      locale: 'pt-BR',
      debugMode: false,
      mirror: true,
      onStatusUpdate: (status: ValidationStatus, message: string) => {
        console.log(status, message);
      },
      onCaptureSuccess: (blob: Blob) => {
        console.log('Selfie capturada', blob);
      },
      onError: (errorType: ValidationStatus, error: Error) => {
        console.error(errorType, error);
      }
    });
  }

  ngOnDestroy(): void {
    this.validator?.destroy();
  }
}
```

- `container`: target element where the SDK automatically renders video and canvas.
- `ui`: use `none` to render your own UI (status, buttons, etc.).
- `locale`: defines the language for SDK messages.
- `debugMode`: displays landmarks for debugging during development.
- `mirror`: mirrors the camera (selfie default).
- `onStatusUpdate`: receives the status and message for you to update the UI.
- `onCaptureSuccess`: receives the `Blob` of the captured selfie for upload/preview.
- `onError`: captures camera or model loading errors.

---

## 🧩 React Component: `ReactSelfieCapture`

If you are building a **React** application and want a **ready‑to‑use selfie capture UI**, the SDK exposes an optional React component that encapsulates:

- Camera access (`getUserMedia`)
- Validation loop (`FaceValidator`)
- Overlay drawing (oval + feedback)
- Preview step (photo + buttons)
- i18n for pt-BR, en, es

### Installation (React project)

Your React app should already have `react` and `react-dom` installed. Then:

```bash
npm install face-validator-sdk
```

> `@mediapipe/tasks-vision` is installed automatically as a dependency of the SDK.  
> `react` and `react-dom` are declared as **peerDependencies** – they are **not** bundled inside the package.  
> Non‑React applications should use the **core `FaceValidator` API** shown above instead of `ReactSelfieCapture`.

### Basic usage

```tsx
import { ReactSelfieCapture } from 'face-validator-sdk';

function SelfieExample() {
  const handleCapture = (imageBase64: string | null) => {
    if (imageBase64) {
      // send to API, store, etc.
    }
  };

  return (
    <ReactSelfieCapture
      locale={navigator.language}   // 'pt-BR' | 'en' | 'es' (auto-normalized)
      onCapture={handleCapture}
      onDismiss={() => console.log('Modal closed')}
    />
  );
}
```

### Props

```ts
type SupportedLocale = 'pt-BR' | 'en' | 'es';

type SelfieCaptureStyles = {
  container?: React.CSSProperties;
  media?: React.CSSProperties;
  messageBanner?: React.CSSProperties;
  primaryButton?: React.CSSProperties;
  secondaryButton?: React.CSSProperties;
};

type SelfieCaptureUILabelOverrides = Partial<{
  previewQuestion: string;
  savePhoto: string;
  tryAgain: string;
  cancel: string;
}>;

interface ReactSelfieCaptureProps {
  onCapture: (image: string | null) => void; // base64 data URL or null on cancel
  onDismiss?: () => void;

  // Behaviour
  locale?: SupportedLocale | string; // Default: 'pt-BR' (auto-normalized)
  videoWidth?: number;               // Default: 512
  videoHeight?: number;              // Default: 384
  debugMode?: boolean;               // Default: false
  modelPath?: string;                // Optional MediaPipe WASM path; if omitted, uses internal CDN default

  // Visual customization (inline styles)
  styles?: SelfieCaptureStyles;

  // Optional UI labels override (per-locale defaults exist)
  labels?: SelfieCaptureUILabelOverrides;
}
```

### Labels and i18n

By default, the component renders UI labels in **Portuguese (pt-BR)**, **English (en)** or **Spanish (es)**:

- Preview question (“O que você achou?” / “What do you think?” / “¿Qué te pareció?”)
- Buttons (“Salvar foto”, “Tentar novamente”, “Cancelar”, etc.)

You can override any of these without having to set up an external i18n layer:

```tsx
<ReactSelfieCapture
  locale="pt-BR"
  onCapture={handleCapture}
  labels={{
    previewQuestion: 'Confira sua selfie antes de salvar',
    savePhoto: 'Confirmar selfie',
  }}
/>
```

### Styling

The component ships with a sensible default layout, but you can tweak it via the `styles` prop:

```tsx
<ReactSelfieCapture
  onCapture={handleCapture}
  styles={{
    container: { borderRadius: 24 },
    media: { borderRadius: 16 },
    messageBanner: { backgroundColor: '#f0f9ff', color: '#0369a1' },
    primaryButton: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    secondaryButton: { borderRadius: 9999 },
  }}
/>;
```

> Tip: you can wrap `ReactSelfieCapture` in your own modal/dialog and pass `onDismiss` to close it from the **Cancel** button.


## 🏗️ Architecture

### MediaPipe Integration

The SDK uses two MediaPipe models running in parallel:

1. **FaceLandmarker**: 478 facial landmarks + face detection
2. **HandLandmarker**: 21 hand landmarks per hand

## 📚 Why MediaPipe?

Migrated from face-api.js (discontinued 2021) to MediaPipe (Google):

| Feature | face-api.js | MediaPipe |
|---------|-------------|-----------|
| Landmarks | 68 points | **478 points** |
| Hand detection | ❌ None | ✅ **21 pts/hand** |
| Maintenance | ❌ Discontinued | ✅ Active (Google) |
| Performance | CPU only | ✅ **GPU accelerated** |
| Accuracy | ~60-70% | ✅ **~90-95%** |
| Model size | ~8MB | ~15MB |

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) by Google
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) (original inspiration)

## 📞 Support

- 🐛 [Report Bug](https://github.com/rwmsousa/face-validator-sdk/issues)
- 💡 [Request Feature](https://github.com/rwmsousa/face-validator-sdk/issues)
- 📧 Contact: [GitHub Profile](https://github.com/rwmsousa)

---

