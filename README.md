# Face Validator SDK

Real-time selfie validation SDK with face and hand detection, powered by **MediaPipe**. Detects faces, hands, and validates pose, lighting, and occlusions in real-time.

🎭 **[Live Demo](https://face-validator-sdk.vercel.app)** | 📦 [NPM Package](#installation) | 📖 [Documentation](#usage) | 🤝 [Contributing](#contributing)

[![CI](https://github.com/rwmsousa/face-validator-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/rwmsousa/face-validator-sdk/actions/workflows/ci.yml)
[![Deploy](https://github.com/rwmsousa/face-validator-sdk/actions/workflows/deploy-vercel.yml/badge.svg)](https://github.com/rwmsousa/face-validator-sdk/actions/workflows/deploy-vercel.yml)

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

## 📦 Installation

```bash
npm install face-validator-sdk @mediapipe/tasks-vision
```

**Peer dependency**: `@mediapipe/tasks-vision` (^0.10.15)

## 🚀 Quick Start

```typescript
import { FaceValidator, ValidationStatus } from 'face-validator-sdk';

const video = document.querySelector('video');
const canvas = document.querySelector('canvas');

const validator = new FaceValidator({
  videoElement: video,
  overlayCanvasElement: canvas,
  locale: 'pt-BR', // 'pt-BR' | 'en' | 'es'
  debugMode: false,
  
  onStatusUpdate: (status, message) => {
    console.log(status, message);
    // Update UI with validation status
  },
  
  onCaptureSuccess: (blob) => {
    // Upload or preview the captured selfie
    const url = URL.createObjectURL(blob);
    document.querySelector('img').src = url;
  },
  
  onError: (errorType, error) => {
    console.error(errorType, error);
  }
});

// Validator starts automatically
// To stop: validator.stop();
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
  // Required
  videoElement: HTMLVideoElement;
  onStatusUpdate: (status: ValidationStatus, message: string) => void;
  onCaptureSuccess: (imageBlob: Blob) => void;
  onError: (errorType: ValidationStatus, error: Error) => void;
  
  // Optional
  overlayCanvasElement?: HTMLCanvasElement;
  locale?: 'pt-BR' | 'en' | 'es'; // Default: 'en'
  debugMode?: boolean; // Default: false
  
  // Validation thresholds
  minDetectionConfidence?: number; // Default: 0.5
  minIlluminationThreshold?: number; // Default: 70 (0-255)
  minFaceSizeFactor?: number; // Default: 0.25
  maxFaceSizeFactor?: number; // Default: 0.65
  stabilizationTimeThreshold?: number; // Default: 1000ms
  stabilityMovementThreshold?: number; // Default: 5px
  minFaceVisibilityScore?: number; // Default: 0.5
  maxHeadTiltDegrees?: number; // Default: 28°
  maxHandFaceDistance?: number; // Default: 0.15 (normalized)
  
  // Advanced
  modelPath?: string; // MediaPipe WASM path (auto-detected from CDN)
  customMessages?: Partial<Record<ValidationStatus, string>>;
}
```

## 🎭 Live Demo

### Online Demo
Visit: **[https://face-validator-sdk.vercel.app](https://face-validator-sdk.vercel.app)**

### Local Development

```bash
# Clone the repository
git clone https://github.com/rwmsousa/face-validator-sdk.git
cd face-validator-sdk

# Install dependencies
npm install

# Run local demo (http://localhost:8081)
npm run dev
```

### Build Demo for Production

```bash
# Build SDK + Demo
npm run build
npm run build:demo

# Demo files output to: demo/dist/
```

## 🏗️ Architecture

### MediaPipe Integration

The SDK uses two MediaPipe models running in parallel:

1. **FaceLandmarker**: 478 facial landmarks + face detection
2. **HandLandmarker**: 21 hand landmarks per hand

```
┌─────────────────────────────────────────┐
│         FaceValidator                   │
├─────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐ │
│  │ FaceLandmarker  │  │ HandLandmarker│ │
│  │  (478 points)   │  │ (21 pts/hand) │ │
│  └─────────────────┘  └──────────────┘ │
│             ↓              ↓             │
│  ┌──────────────────────────────────┐  │
│  │   Validation Pipeline            │  │
│  │  1. Distance                     │  │
│  │  2. Centering                    │  │
│  │  3. Face geometry                │  │
│  │  4. Head pose                    │  │
│  │  5. Hand proximity ⭐NEW         │  │
│  │  6. Illumination                 │  │
│  │  7. Stability                    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

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

## 🔧 Development

### Scripts

```bash
npm run dev          # Start local dev server (webpack)
npm run build        # Build SDK (CJS, ESM, UMD)
npm run build:demo   # Build production demo
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run tests (Jest)
```

### Project Structure

```
face-validator-sdk/
├── src/
│   ├── FaceValidator.ts    # Main validator class
│   ├── types.ts            # TypeScript types
│   ├── utils.ts            # Validation functions
│   ├── i18n.ts             # Internationalization
│   └── index.ts            # Public API exports
├── demo/
│   ├── demo.ts             # Local dev demo
│   ├── demo-standalone.ts  # Production demo
│   └── public/
│       └── index.html      # Demo HTML
├── dist/                   # SDK build output
│   ├── face-validator-sdk.esm.js
│   ├── face-validator-sdk.cjs.js
│   ├── face-validator-sdk.umd.js
│   └── types/              # TypeScript declarations
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI/CD pipeline
│       └── deploy-vercel.yml # Vercel deployment
└── vercel.json             # Vercel configuration
```

## 🚀 Deployment

### Vercel (Automatic)

1. Connect repository to Vercel
2. Add secrets to GitHub:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
3. Push to `main` branch → auto-deploy

### Manual Deployment

```bash
npm run build:demo
# Deploy demo/dist/ to any static host
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `chore:` Maintenance tasks
- `refactor:` Code refactoring
- `test:` Add/update tests

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

Made with ❤️ using MediaPipe
