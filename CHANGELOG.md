# Changelog

## [1.1.0] – 2026-02-06

### Changed

- **Oval proporcional ao container**: Ajuste de `OVAL_RADIUS_Y_FACTOR` (0.38 → 0.34) para que o oval não extrapole a altura do vídeo em modais e containers com proporções variadas.
- **Demo**: Thumbnails das últimas 3 capturas com zoom ao clicar, botão X para remover (localStorage), overlay para fechar zoom; alinhamento dos thumbnails ao topo; dois botões X distintos (remover no thumb, fechar na imagem ampliada).

### Fixed

- Oval desproporcional em integrações (ex.: modal do datasync-front) quando o canvas era exibido em containers com dimensões diferentes.

---

## [1.0.0] – 2025-02-02

### Added

- Initial release.
- Real-time selfie validation with **MediaPipe** (FaceLandmarker 478 landmarks + HandLandmarker 21 pts/hand).
- Validation steps: single face, distance (too close / too far), oval centering, head pose (roll/yaw/pitch), hand near face, neutral expression, dark glasses, illumination, stability; then capture.
- Optional `modelPath`; when omitted, uses CDN (jsdelivr).
- Internationalization: `pt-BR`, `en`, `es` via `locale` and optional `customMessages`.
- Helpers: `getMessage`, `getValidationMessages`, `getLoadingModelsMessage`.
- Builds: ESM, CJS, UMD; TypeScript declarations in `dist/types`.
