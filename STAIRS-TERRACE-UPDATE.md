# 2D navigation, stairs and terrace update

## Scope and model convention

This change adds a view-only default 2D plan, a project-persisted Editor mode, and an editable terrace and stair programme. All plan and browser geometry remains in feet and uses `FLOOR_HEIGHT` from `src/building-dimensions.ts`. It builds on the B1 edit history instead of creating a separate drag store. The earlier [WORKSPACE-UPDATE.md](WORKSPACE-UPDATE.md), [FACADE-KIT-UPDATE.md](FACADE-KIT-UPDATE.md) and [TAMIL-NADU-RULES.md](TAMIL-NADU-RULES.md) remain historical records.

## 2D navigation and editing

- Wheel and trackpad zoom anchor at the pointer; empty-space drag pans. Pointer gestures support two-finger pinch and pan. Keyboard `+`, `-` and `0` zoom in, zoom out and fit.
- The toolbar offers Zoom in, Zoom out, Fit plan, 100%, Zoom to selected room and the current zoom level. The compass and ten-foot scale stay screen fixed. Dimension and area labels use feet/inches, abbreviate as space shrinks and hide minor text at small scales. The SVG keeps strokes crisp.
- Editor is off for a new project. With it off, room and object movement and editing controls are unavailable while selection and navigation still work. With it on, the B1 room, opening, furniture and service actions and an Editing badge appear. `design.editorEnabled` is saved with the project.
- Pure zoom and fit calculations are tested in `src/plan-navigation.test.ts`; browser interaction is asserted by `scripts/verify-stairs-terrace.cjs`.

## Roof and circulation

- The generated plan has a Terrace level above its top storey, including a stair headroom room, roof deck, full parapet, drainage direction, roof finish and roof tank. A one-storey tiled bungalow retains its dominant pitched front roof with an accessible flat rear terrace.
- A tank defaults to the headroom roof or can be mounted on the slab. The terrace inspector controls support and litres. The 2D tank is draggable with B1 `moveObject`, persists through the project editor data, appears in 3D with a ladder and slatted screen, and shares the existing service/plumbing nodes.
- Stair position supports internal, external front, side or rear. The external footprint can be dragged in the ground plan. Dog-legged and spiral geometry, landings, connections, a cabin door and canopy are represented in 3D. The interior stair continues to the roof. Walking surface logic supports the roof level.
- An upper floor can be selected as an independent dwelling. The planner includes kitchen, living and bathrooms and omits the internal stair for an external stair project. The layout adds a unit entrance. The rules and quotation count the dwellings; the quote includes external stair area and calls out headroom, drainage, waterproofing and tank support for itemised pricing.
- Terrace and headroom are available through the floor switcher and layer tree. The same scene geometry is present in the browser viewer, walkthrough and export path. Export still performs its named feet-to-metres conversion at the export interface. Blender-compatible camera conventions remain aligned with that path; no separate Blender import was visually reviewed for this update.

## Checks and evidence

`src/terrace.test.ts` covers default view-only persistence, internal G+1 access, a side-stair independent first floor, B1 tank movement, a tiled one-storey terrace, and front/side/rear spiral stair placements. The terrace review checks rise, tread, clear width, setback envelope, tank working clearance and independent-unit access. The geometry thresholds follow the stair provisions in the [Tamil Nadu Combined Development and Building Rules, 2019](https://tnurbantree.tn.gov.in/wp-content/uploads/2020/06/TN_combined_development_building_rules_2019.pdf); this is concept checking, not a structural or sanction drawing.

The actual browser captures and the honest visual comparisons are in [docs/screenshots/2d-navigation/comparison.md](docs/screenshots/2d-navigation/comparison.md) and [docs/screenshots/stairs-terrace/comparison.md](docs/screenshots/stairs-terrace/comparison.md). The browser interaction assertions are in [browser-proof.json](docs/screenshots/stairs-terrace/browser-proof.json). The proof covers the G+1 internal terrace, external side stair and independent first floor, tank movement in 2D, and a tiled one-storey rear terrace. The 3D screenshots compare against the primary `ext-01`, `ext-02` and `ext-04` images in `docs/references/`; they do not establish a reference match.

Final local checks on 21 November 2026: `npm test` passed 129/129 tests; `npm run build` completed its TypeScript, Vite and server bundle stages; `node scripts/verify-stairs-terrace.cjs` passed with no browser page errors; `node scripts/capture-pitched-terrace.cjs` retook the pitched views after material loading with no page errors; and `git diff --check` found no whitespace errors. Vite reported a bundle size warning, and npm's PowerShell launcher printed an access warning while still completing both commands successfully.

## Remaining limits

The exterior stair and cabin are concept geometry. Guard joints, tread nosings, roof waterproofing, drainage fall, structural tank support, and weather protection need detailed design. The pitched roof to rear-terrace junction is visibly abrupt. The roof Walk proof lands on the deck but does not prove a complete keyboard-driven ascent. Tank maintenance clearance is flagged in review when inadequate. A physical iPad was not tested; touch proof uses browser-simulated two-finger input. The generated GLB was not separately opened in Blender. The facade and interior still have the material, detail and lighting gaps recorded in the screenshot comparisons and the previous facade reports.

No commit or push was made; the external runner performs the final repository operation after its own `npm test` and `npm run build` gates.
