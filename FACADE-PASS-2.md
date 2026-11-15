# Facade pass 2: presentation, materials and streetscape

The browser now defaults to a road-facing Front view and gives each Tamil Nadu recipe a distinct facade/material/lighting composition. The existing corner camera is retained. The room programme, positions, floor count and plan-generation implementation are unchanged.

Review the actual [before/after gallery](docs/screenshots/facade-pass-2/index.html) and [per-style matches and remaining differences](docs/screenshots/facade-pass-2/comparison.md). The images show improvement; they still do not establish photorealistic equivalence to the references.

## Changes

- [Camera preset](src/house3d/camera-presets.ts): 15° road-facing view, fitted elevation, 45° FOV and an actual 5.5 ft eye height above ground. The orbit polar-angle limit is widened for this preset so it cannot silently lift the camera.
- [Recipes](src/house3d/facade-styles.ts) own wall, frame, trim, soffit and side colours. The former palette already recognised recipe IDs, but frame/wall colours were coupled, window families fell back to pale casements, and the common warm sun/material treatment dominated every render. Exterior plaster now uses the recipe tint without a coloured albedo multiplier; frames, trims and soffits use their respective recipe roles.
- [Window defaults](src/fitout.ts) select dark sliding families for the contemporary recipes and timber divided casements for the tiled style. [HouseLayout](src/house3d/layout-v2.ts) widens automatic glazing within the measured wall segment before generating the real wall cuts. Wet-room privacy windows and explicit customer family overrides are preserved.
- [Facade composition](src/house3d/facade-kit/build.ts): frontage-wide frames, larger timber/stone/jaali planes, recessed window surrounds, quieter upper side walls and low bands. The real balcony and room extents remain authoritative.
- [Lighting](src/house3d/exterior-lighting.ts): golden hour, clear daylight, sunset and dusk. Recipe defaults are switchable, and a manual lighting choice persists when the facade style changes. The procedural sky supports the scene rather than replacing house geometry.
- [Streetscape](src/house3d/streetscape.ts) and [botanical meshes](src/house3d/vegetation.ts): whole-tree instancing with profiled leaves/branches, coconut palms, shrubs/planters, two muted neighbour examples, road/kerbs/footpath and distant silhouettes. No new exterior image download, AI call or GPU rental is needed.
- Static overview uses demand rendering with a short settling-animation period. Walkthrough, tour, climate study and active appliance animation keep rendering. This reduces idle GPU work; it is not a guarantee of a particular iPad frame rate.

## Validation

- `npm test`: **99 passed**.
- `npm run build`: passed; existing dependency-comment and large-bundle warnings remain.
- Python renderer checks: **7 passed**.
- Five original before Front views, five final Front views, five retained corner views and five extra matched-camera after views are saved.
- The initial camera was found to be clamped above its intended eye height. Authentic before images remain untouched; matched-camera after images isolate the visual changes, and final Front images prove the corrected height. All camera metadata is retained.
- The existing raycast checks still cover facade obstructions on all elevations and four road facings; added checks cover room/floor invariance, real window holes, privacy/overrides, lighting choices and scenery budgets.

[Control/entrance verification](docs/screenshots/facade-pass-2/controls-verification.json) and [GLB verification](docs/screenshots/facade-pass-2/glb-verification.json) record the browser checks and full scene export. The exported binary stays in ignored `exports/facade-pass-2/`.

## Reproduction and measured browser results

Start the app on localhost:5251 with `VITE_DEMO_MODE=true`. The QA helpers use `playwright-core` (installed under `.work/qa` in this workspace) and local Chrome.

- `node scripts/capture-facade-pass-2.cjs after` recreates the final and matched-camera views. The before mode refuses to overwrite the authentic baseline.
- `node scripts/verify-facade-pass-2.cjs` checks lighting override persistence, actual camera height, baseline-camera replay, GLB download and walking through the entrance.
- `python scripts/make-facade-pass-2-comparisons.py` builds the labelled gallery boards.
- `python scripts/inspect-facade-glb.py exports/facade-pass-2/house.glb docs/screenshots/facade-pass-2/glb-verification.json` inspects the binary without changing the historical pass 1 evidence.

The control run measured a **5.5 ft** Front view eye above ground, matching baseline camera replay within 0.0001 m at the export interface, and **12.47 ft** of forward entrance travel. No browser page/console errors were recorded. The full furnished scene including streetscape exported as **38,053,164 bytes (36.29 MiB)**, below the 50 MiB upload limit; its textures are embedded and facade instancing is expanded for standard GLB import.

The example outdoor scene adds 17 mesh draws, 115,620 rendered triangles and 4,648,718 bytes of shared geometry, with no additional image textures. The actual browser check used AMD Radeon desktop graphics; it does not establish physical iPad performance.

## Limits

The unchanged demo programme has a front upper bathroom rather than the wide glazed living/bedroom bay in some references. This work does not fake a larger opening there, invent a balcony or change a storey to force a visual match.

Plants and neighbours are procedural approximations. Vehicle/furniture assets, glass/stone response, natural landscaping and some facade details remain visibly simpler than the references. Roof access and service-screen review limits from [pass 1](FACADE-KIT-UPDATE.md) still apply. Blender rendering and physical iPad testing were not performed.

Keep the historical reports in [AGENTS.md](AGENTS.md); this report records the second facade pass.
