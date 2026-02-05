# Changelog

## [1.0.0] – 2025-02-02

### Added

- Initial release.
- Real-time selfie validation with face-api.js (Tiny Face Detector + Face Landmark 68 Tiny).
- Validation steps: single face, distance (too close / too far), nose centering, illumination, stability; then capture.
- Optional `modelPath`; when omitted, uses default base URL (e.g. `./models/` or ESM `import.meta.url`-based).
- Internationalization: `pt-BR`, `en`, `es` via `locale` and optional `customMessages`.
- Helpers: `getMessage`, `getValidationMessages`, `getLoadingModelsMessage`, `getDefaultModelBaseUrl`.
- Builds: ESM, CJS, UMD; TypeScript declarations in `dist/types`.
- Build copies `models/` to `dist/models/` when weight files are present (see `models/README.md`).
