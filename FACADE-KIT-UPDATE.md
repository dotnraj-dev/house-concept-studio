# Parametric Tamil Nadu facade kit

Five editable style selections now compose actual Three.js facade geometry around the measured house rather than adding the same generic bands to every elevation. The interactive house stays real 3D.

**Visual status:** the recipes are differentiated and opening-aware, but the screenshots remain simpler and less realistic than the primary references. Review the [before/after comparison and three remaining differences per style](docs/screenshots/facade/comparison.md), not just the test result.

## Implementation

- [Facade kit](src/house3d/facade-kit/): profiled/rounded projecting frames; instanced fins, slats, roof tiles and gate bars; three original alpha-cut jaali patterns; physically scaled stone cladding; glass and steel railings; pergolas; rounded floor/roof details; headroom louvres and roof-tank screening; surveyed-polygon compound walls, three gate patterns, pillar lights, warm wall washers and cove strips.
- [Five recipes](src/house3d/facade-styles.ts): `tn-contemporary-slats`, `tn-jaali-stone`, `tn-curved-villa`, `tn-tiled-bungalow`, `tn-narrow-g2`. Width affects projection, frame/screen spacing and the composition; floor count and the actual road-facing edge drive placement.
- The five recipes lead the [style catalogue](src/regions.ts). Existing state/legacy styles remain. Users with project-edit access can also change the facade from the 3D toolbar.
- The model remains in **feet**, using [shared dimensions](src/building-dimensions.ts). Only the named GLB/camera export boundary converts to metres.
- [Export preparation](src/house3d/export.ts) expands live instances into ordinary mesh nodes for Blender import, preserving matrices, colours and alpha-cut materials. Opaque original JPEG textures retain JPEG encoding/dimensions; masks remain alpha-capable. Export resources are isolated from the live scene.
- Original material generation/provenance: [generator](scripts/make-facade-kit-assets.py), [material licence record](public/assets/materials/LICENSE.md). No primary or Pixabay reference photo is copied into these maps.

## Evidence

- Genuine baseline plus five final browser captures and reference comparison boards: [gallery](docs/screenshots/facade/index.html).
- Fictional, reproducible [30 × 50 ft G+1 demo project](docs/screenshots/facade/demo-project.json); no API key, paid AI call or GPU rental was used.
- Browser capture/GLB download: [capture script](scripts/capture-facade.cjs). Start Vite with `VITE_DEMO_MODE=true` on localhost:5251, install `playwright-core` under `.work/qa` if needed, then run `node scripts/capture-facade.cjs`. Chrome must be installed. This preserves the original baseline.
- Inspect the actual download with `python scripts/inspect-facade-glb.py`; [recorded GLB evidence](docs/screenshots/facade/glb-verification.json) includes its size/hash, embedded textures, masks and ordinary mesh nodes. The binary is deliberately ignored under `exports/facade/`.

## Validation

- `npm test`: **94 passed**. Includes actual-mesh raycasts against doors/windows on all elevations for five recipes × four road facings, clipping, PNG masks, transform/colour preservation and JPEG/alpha export handling.
- `npm run build`: passed (existing dependency-annotation and large-chunk warnings remain).
- Python renderer checks: **7 passed**.
- Five real browser street captures: no page/console errors recorded.
- Full furnished-house GLB: **33,070,768 bytes (31.54 MiB)**, embedded images, alpha-cut jaali, ordinary expanded instance nodes. The initial PNG-heavy export exceeded the 50 MB limit; retaining original opaque JPEG encoding fixed the measured case without lowering texture dimensions.
- [Entrance walkthrough evidence](docs/screenshots/facade/walkthrough-verification.json): E opens the main door, then W moves the camera about **7.92 ft** into the house. [Closed door](docs/screenshots/facade/entrance-closed.png) / [after walking through](docs/screenshots/facade/entrance-open-walk.png). The initial walk camera is very close to the closed door; this is access evidence, not a finished presentation view.

## Practical limits

This is a facade-composition implementation, not a replacement for architectural review. Projections must still be checked against each site's permitted envelope. The retained demo plan has a front upper bathroom/long rectangular side elevation; a facade recipe cannot make that layout identical to a reference with different rooms and glazing.

Headroom placement follows the real stair core, with a roof-access-review flag; a new accessible roof flight is not implemented here. Tank-screen clearance conflicts are retained as metadata rather than moving the customer's service equipment. Pitched roofs need a separate service/maintenance design. Glass guards follow real straight balcony edges, and window/door families remain the customer's existing choices.

The downloaded GLB was inspected and reuses the live geometry. Blender itself was unavailable in this session, so no Blender render or identical lighting claim is made.

Keep the historical reports listed in [AGENTS.md](AGENTS.md); this report records only the facade work.
