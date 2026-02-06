# Changelog

All notable changes to Face Validator SDK will be documented in this file.

## [1.0.0] – 2026-02-06

### 🎉 Initial Release

Face Validator SDK is now available! A production-ready, real-time selfie validation component powered by **MediaPipe**.

### ✨ Features

#### Face Detection & Validation

- **478 facial landmarks** for precise face analysis
- **Distance validation**: Detects when face is TOO_CLOSE or TOO_FAR from camera
- **Centering validation**: Ensures face is properly centered in oval guide
- **Head pose detection**: Validates head is straight (max 28° tilt)
- **Illumination validation**: Checks for adequate lighting (brightness > 70)
- **Stability detection**: Requires 1 second of stillness before capture
- **Multiple face detection**: Rejects frames with more than one face

#### Hand Detection (NEW)

- **21 landmarks per hand** for high precision hand tracking
- **Hand obstruction detection**: Prevents face obstruction by hands
- **Real-time hand proximity analysis**: Validates hand distance from face

#### Internationalization (i18n)

- **3 languages supported**: Portuguese (pt-BR), English (en), Spanish (es)
- **Customizable messages**: Override any validation message
- **Dynamic language switching**: Change language at runtime

#### Developer Experience

- **Multiple builds**: ESM, CJS, UMD for maximum compatibility
- **TypeScript support**: Full type definitions included
- **Debug mode**: Visualize landmarks and validation overlays
- **GPU acceleration**: Powered by MediaPipe with GPU support
- **Flexible configuration**: 15+ validation thresholds for fine-tuning

#### Demo & Documentation

- **Live interactive demo**: [https://face-validator-sdk.vercel.app](https://face-validator-sdk.vercel.app)
- **Comprehensive README**: Installation, quick start, configuration guide
- **Validation checklist**: Detailed explanation of all validation states
- **Code examples**: TypeScript examples for common use cases

### 📦 Installation

Single command installation - MediaPipe is included:

```bash
npm install face-validator-sdk
```

### 🚀 Quick Start

```typescript
import { FaceValidator, ValidationStatus } from 'face-validator-sdk';

const validator = new FaceValidator({
  videoElement: document.getElementById('video'),
  overlayCanvasElement: document.getElementById('overlay'),
  locale: 'pt-BR',
  
  onStatusUpdate: (status, message) => {
    console.log(message);
  },
  
  onCaptureSuccess: (blob) => {
    // Upload captured selfie
  },
  
  onError: (errorType, error) => {
    console.error(error);
  }
});
```

### 🔧 Configuration

15+ validation thresholds available:

- `minDetectionConfidence` (default: 0.5)
- `minIlluminationThreshold` (default: 70)
- `minFaceSizeFactor` (default: 0.25)
- `maxFaceSizeFactor` (default: 0.65)
- `maxHeadTiltDegrees` (default: 28)
- `maxHandFaceDistance` (default: 0.15)
- And more...

### 📚 What's Included

- Real-time video validation with visual feedback
- Automatic photo capture on successful validation
- Blob output for direct API upload
- LocalStorage support for demo captures
- ESM, CJS, and UMD builds for any environment

### 🎯 Key Achievements

✅ **Production Ready**: Tested and optimized for real-world use
✅ **Accessible**: Works on desktop, tablet, and mobile browsers
✅ **Customizable**: Fine-tune validation parameters for your use case
✅ **Fast**: GPU-accelerated inference with MediaPipe
✅ **Reliable**: High accuracy face and hand detection
✅ **Modern**: Built with TypeScript and modern web standards
