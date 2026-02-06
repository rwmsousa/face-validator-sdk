# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
