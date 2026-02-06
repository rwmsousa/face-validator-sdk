# Face Validator SDK

Real-time selfie validation SDK with face detection, powered by **MediaPipe**. Detects faces, hands, and validates pose, lighting, and occlusions in real-time.

🎭 **[Live Demo](https://face-validator-sdk.vercel.app)** | 📦 [NPM Package](#installation) | 📖 [Documentation](#usage) | 🤝 [Contributing](#contributing)

## ✨ Features

### Face Detection (478 landmarks)

- ✅ **Distance validation**: TOO_CLOSE / TOO_FAR
- ✅ **Centering**: Face must be centered in oval guide
- ✅ **Head pose**: Detects tilted or turned head
- ✅ **Illumination**: Validates proper lighting
- ✅ **Stability**: Ensures user stays still before capture
- ✅ **Multiple faces**: Rejects when more than one face detected

### Hand Detection

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
npm install face-validator-sdk
```

The SDK automatically includes `@mediapipe/tasks-vision` as a dependency.

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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Face Validator SDK</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 20px; }
    #status { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; }
    #preview { max-width: 300px; border-radius: 8px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Face Validator SDK Demo</h1>
  
  <!-- Video element for camera feed (will be mirrored) -->
  <video id="video" width="512" height="384" autoplay playsinline muted></video>
  
  <!-- Canvas for validation feedback (landmarks, oval guide, etc.) -->
  <canvas id="overlay" width="512" height="384" style="border: 1px solid #ccc;"></canvas>
  
  <!-- Status display -->
  <div id="status">Loading...</div>
  
  <!-- Captured selfie preview -->
  <img id="preview" alt="Captured selfie" />
  
  <!-- Load SDK (MediaPipe models are loaded automatically) -->
  <script type="module" src="./app.js"></script>
</body>
</html>
```

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
│  │  5. Hand proximity               │  │
│  │  6. Illumination                 │  │
│  │  7. Stability                    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

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
│   └── index.ts            # Public API
├── demo/
│   ├── demo.ts             # Local development demo
│   ├── demo-standalone.ts  # Production demo
│   └── public/index.html   # Demo HTML
├── dist/                   # Built SDK (generated)
└── tests/                  # Test files
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) by Google for the powerful machine learning models

## 📞 Support

- 🐛 [Report Bug](https://github.com/rwmsousa/face-validator-sdk/issues)
- 💡 [Request Feature](https://github.com/rwmsousa/face-validator-sdk/issues)
- 📧 Contact: [GitHub Profile](https://github.com/rwmsousa)

---

Made with ❤️ using MediaPipe
