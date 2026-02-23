# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] – 2026-02-23

### Added

- **Container-first API**: New `container`, `ui`, `autoStart`, `mirror`, and `videoConstraints` options to let the SDK manage media elements and UI automatically.
- **Managed UI styling**: Default UI now injects its own minimal styles when `ui: 'default'` is used.
- **Lifecycle cleanup**: New `destroy()` method to release resources, stop camera streams, and clean up managed DOM elements.

### Changed

- **Callbacks optional**: `onStatusUpdate`, `onCaptureSuccess`, and `onError` are now optional.
- **Camera initialization**: Internal camera setup now awaits readiness before starting detection loops.
- **ReactSelfieCapture**: Uses SDK-managed camera lifecycle and `destroy()` for cleanup.

## [1.2.1] – 2026-02-18

### Fixed

- **ReactSelfieCapture**: Fixed circular import dependency that caused `ValidationStatus` to be undefined on load.
- **Message throttling**: Implemented proper delay between instruction messages (1.5s minimum) to improve readability and user experience. Previous implementation was canceling timeouts preventing the delay from working correctly.
- **Message display logic**: Messages now stay visible for a minimum configurable time (`MESSAGE_DELAY_MS`), with critical statuses (SUCCESS, ERROR, CAPTURING, INITIALIZING) still displaying immediately.

### Changed

- **Smooth transitions**: Added CSS transitions (`0.4s ease-in-out`) to message banner for smoother visual updates.
- **Import structure**: Changed ReactSelfieCapture imports to use direct module paths instead of index barrel to avoid circular dependencies.

## [1.1.0] – 2026-02-06

### Changed

- **Oval proportional to container**: Adjusted `OVAL_RADIUS_Y_FACTOR` (0.38 → 0.34) so the oval does not overflow the video height in modals and containers with varying aspect ratios.
- **Demo**: Last 3 captures as thumbnails with click-to-zoom, X button to remove (localStorage), overlay to close zoom; thumbnails aligned to top; two distinct X buttons (remove on thumb, close on enlarged image).

### Fixed

- Oval disproportionate in integrations (e.g. datasync-front modal) when the canvas was displayed in containers with different dimensions.

## [1.0.0] – 2025-02-02

### Added

- Initial release.
- Real-time selfie validation with **MediaPipe** (FaceLandmarker 478 landmarks + HandLandmarker 21 pts/hand).
- Validation steps: single face, distance (too close / too far), oval centering, head pose (roll/yaw/pitch), hand near face, neutral expression, dark glasses, illumination, stability; then capture.
- Optional `modelPath`; when omitted, uses CDN (jsdelivr).
- Internationalization: `pt-BR`, `en`, `es` via `locale` and optional `customMessages`.
- Helpers: `getMessage`, `getValidationMessages`, `getLoadingModelsMessage`.
- Builds: ESM, CJS, UMD; TypeScript declarations in `dist/types`.
