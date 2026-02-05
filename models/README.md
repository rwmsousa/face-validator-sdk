# Face-api.js models (Tiny)

This folder must contain the **Tiny** face-api.js weights used by the SDK. They are not included in the repo due to size. Copy them here before building so that `dist/models/` is populated.

## Required files

Download from the [face-api.js weights](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) directory and place in this folder:

- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_tiny_model-weights_manifest.json`
- `face_landmark_68_tiny_model-shard1`

## Quick copy (from project root)

If you have the face-api.js repo or a copy of its `weights` folder:

```bash
cp /path/to/face-api.js/weights/tiny_face_detector_model* ./models/
cp /path/to/face-api.js/weights/face_landmark_68_tiny_model* ./models/
```

Or download via curl (replace `RAW_BASE` with the raw GitHub URL for the weights folder):

```bash
RAW_BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
for f in tiny_face_detector_model-weights_manifest.json tiny_face_detector_model-shard1 face_landmark_68_tiny_model-weights_manifest.json face_landmark_68_tiny_model-shard1; do
  curl -L -o "models/$f" "$RAW_BASE/$f"
done
```

After adding the files, run `npm run build`. The build script copies `models/` to `dist/models/`.
