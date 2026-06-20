# Live Camera Virtual Dressing Room

Hybrid edge-cloud AR mirror scaffold:

- Next.js App Router renders the webcam, MediaPipe pose tracking, and Three.js garment overlay entirely in the browser.
- Spring Boot serves whitelisted `.glb` assets and fit metadata outside the frame loop.
- Starter generated garments are intentionally lightweight placeholders. Replace them with optimized production GLBs that use the same fit profiles.

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000/ar`.

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

The asset API runs at `http://localhost:8080/api/assets`.

## Fit Calibration

Each asset has a profile in `backend/src/main/java/com/example/dressingroom/assets/AssetManifest.java`.
The important values are:

- `localShoulderWidth`: model-space distance between garment shoulder points at scale 1.
- `localTorsoLength`: model-space distance from upper-chest anchor to waist/hem anchor.
- `anchorDown`: where the model origin should sit between shoulder line and hip line.
- `fitX`, `fitY`, `fitZ`: looseness multipliers for width, height, and depth.

For real garments, measure these values in Blender after setting the model origin near the upper chest.
