# Face Validator SDK

Real-time selfie validation SDK with face detection, powered by **MediaPipe**. Detects faces, hands, and validates pose, lighting, and occlusions in real-time.

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

### Basic Usage

```typescript
import { FaceValidator, ValidationStatus } from 'face-validator-sdk';

// Get DOM elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('overlay');

// Initialize validator
const validator = new FaceValidator({
  videoElement,
  overlayCanvasElement: canvasElement,
  locale: 'pt-BR', // 'pt-BR' | 'en' | 'es'
  debugMode: true, // Show landmarks for debugging
  
  // Called whenever validation status changes
  onStatusUpdate: (status, message) => {
    document.getElementById('status').textContent = message;
    console.log(`Status: ${status} - ${message}`);
  },
  
  // Called when user passes all validations and photo is captured
  onCaptureSuccess: (imageBlob) => {
    // Image is a Blob with the captured selfie
    const url = URL.createObjectURL(imageBlob);
    document.getElementById('preview').src = url;
    
    // Send to backend
    const formData = new FormData();
    formData.append('selfie', imageBlob, 'selfie.jpg');
    fetch('/api/upload-selfie', { method: 'POST', body: formData });
  },
  
  // Called if something goes wrong
  onError: (errorType, error) => {
    console.error(`Validation Error: ${errorType}`, error);
    document.getElementById('status').textContent = error.message;
  }
});

// Validator starts automatically capturing when initialized
// To stop the validator: validator.stop();
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Include MediaPipe (required) -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js"></script>
</head>
<body>
  <!-- Video element for camera feed (will be mirrored) -->
  <video id="video" width="512" height="384" autoplay playsinline muted></video>
  
  <!-- Canvas for validation feedback (landmarks, oval guide, etc.) -->
  <canvas id="overlay" width="512" height="384"></canvas>
  
  <!-- Status display -->
  <div id="status">Loading...</div>
  
  <!-- Captured selfie preview -->
  <img id="preview" alt="Captured selfie" />
  
  <!-- Load SDK -->
  <script src="https://unpkg.com/face-validator-sdk@latest/dist/face-validator-sdk.umd.js"></script>
  <script src="./app.js"></script>
</body>
</html>
```

## 📊 Validation Checklist

The SDK validates multiple conditions before capturing the selfie. Here's what each status means:

| Status | Description | User Action | Validation Threshold |
|--------|-------------|-------------|----------------------|
| **INITIALIZING** | Loading MediaPipe models from CDN | Wait, models loading... | N/A |
| **NO_FACE_DETECTED** | Camera is active but no face found | Move closer to camera, ensure good lighting | Requires 1 face |
| **FACE_DETECTED** | Face detected, starting validation | Hold still for validation | Confidence > 50% |
| **TOO_CLOSE** | Face is too large in frame (too close) | Move camera away | Face height < 65% viewport |
| **TOO_FAR** | Face is too small in frame (too far) | Move camera closer | Face height > 25% viewport |
| **OFF_CENTER** | Face not properly centered in oval | Center face in the oval guide | Within center zone |
| **FACE_OBSTRUCTED** | **Hand, glasses, or low visibility** | Remove hands from face, ensure visibility | Hand distance > 15% |
| **HEAD_NOT_STRAIGHT** | Head is tilted or turned | Face camera directly, keep head straight | Yaw/Pitch < 28° |
| **MULTIPLE_FACES** | More than one face detected | Ensure only you are in frame | Exactly 1 face required |
| **POOR_ILLUMINATION** | Not enough light to see face clearly | Increase lighting (natural/lamp light) | Brightness avg > 70 |
| **STAY_STILL** | Movement detected, hold still | Stop moving, keep steady position | Movement < 5px, 1s |
| **CAPTURING** | Validation passed, taking photo... | Keep position, don't move | Auto-capture in progress |
| **SUCCESS** | ✅ Selfie captured successfully! | Photo saved and ready to upload | Capture completed |
| **ERROR** | An error occurred during validation | Check camera permissions, try again | Check logs for details |

## ⚙️ Configuration Options

```typescript
interface FaceValidatorOptions {
  // ===== REQUIRED =====
  videoElement: HTMLVideoElement;
  onStatusUpdate: (status: ValidationStatus, message: string) => void;
  onCaptureSuccess: (imageBlob: Blob) => void;
  onError: (errorType: ValidationStatus, error: Error) => void;
  
  // ===== OPTIONAL =====
  // Display
  overlayCanvasElement?: HTMLCanvasElement;
  locale?: 'pt-BR' | 'en' | 'es'; // Default: 'en'
  debugMode?: boolean; // Show landmarks and bounding boxes. Default: false
  
  // Validation Thresholds
  minDetectionConfidence?: number; // Face detection threshold. Default: 0.5 (50%)
  minIlluminationThreshold?: number; // Minimum brightness (0-255). Default: 70
  minFaceSizeFactor?: number; // Minimum face size relative to viewport. Default: 0.25 (25%)
  maxFaceSizeFactor?: number; // Maximum face size relative to viewport. Default: 0.65 (65%)
  
  // Stability & Capture
  stabilizationTimeThreshold?: number; // Time to hold still before capture (ms). Default: 1000
  stabilityMovementThreshold?: number; // Max allowed movement (pixels). Default: 5
  minFaceVisibilityScore?: number; // Minimum face visibility (0-1). Default: 0.5
  
  // Head Pose
  maxHeadTiltDegrees?: number; // Maximum head tilt allowed. Default: 28°
  
  // Hand Detection
  maxHandFaceDistance?: number; // Maximum hand distance from face (0-1). Default: 0.15 (normalized)
  
  // Advanced
  modelPath?: string; // Custom path to MediaPipe WASM models. Auto-detected from CDN.
  customMessages?: Partial<Record<ValidationStatus, string>>; // Override status messages
}
```

### Example with Custom Thresholds

```typescript
const validator = new FaceValidator({
  videoElement,
  overlayCanvasElement,
  locale: 'pt-BR',
  
  // Stricter validation for high-security use cases
  minDetectionConfidence: 0.8,     // 80% confidence required
  minIlluminationThreshold: 100,   // Very bright required
  maxHeadTiltDegrees: 15,          // Almost perfectly straight
  stabilizationTimeThreshold: 2000, // 2 seconds of stillness
  
  onStatusUpdate,
  onCaptureSuccess,
  onError
});
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
