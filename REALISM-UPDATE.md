# Realism pass: lighting, assets and materials

The browser scene still falls short of the primary Tamil Nadu render references. This pass improves the existing measured 3D house and records the remaining visual and performance gaps. See the [matched browser screenshots and comparison](docs/screenshots/realism/comparison.md). The original before images were captured before these edits; the after images and metadata are in the same folder.

## What changed

- The four presentation presets now use explicit sun elevations in radians: approximately 54° for clear day, 17° for golden hour, 7° for sunset and 3° for dusk. Their directional sun, sky and ground fill, HDR environment intensity and ACES exposure are tuned together. The lower sun produces longer facade/ground shadows; PCF filtering softens their edge. White plaster retains more detail. The sky dome has a blue zenith, atmospheric horizon and solar glow, with a low-cost shader suitable for the integrated GPU. These are art-directed presets, not a claim that a specific date and site orientation has been simulated. The separate Sun & breeze study still supplies its own date/site sun direction.
- Dusk activates warm practical room light behind the front glazing in addition to the facade fittings. Walk mode uses one moving room light and a restrained fill; the other room spots do not illuminate unseen rooms. Sun shadows are reused while the geometry is static and refreshed after scene changes.
- The portico vehicle remains editable 3D geometry in feet: a procedural hatchback with cut wheel arches, glazed cabin, tyres, six-spoke rims, side seams, mirrors, grille, plate, headlamps and rear lamps. This removes the runtime Kenney sedan fallback. It is still a simplified car model when viewed close up.
- The curated CC0 library supplies the street lamp, two shrub species, side-facade outdoor AC units for rooms whose AC is enabled, terrace monobloc chairs and two coffee-table variants. All GLBs are fitted to explicit feet dimensions. Existing instanced coconut, rain tree and frangipani geometry remains because the library has **no full-size realistic tree GLB**. Compound shrubs now vary in rotation, width and height without extra draws. Example neighbours gain window grilles, chajja/sill pieces, a roof screen or veranda posts and steps. These examples do not replace recorded site context.
- PBR surfaces use feet-based texture repeat and reduced normal-map strength. The facade kit's paint, stone and timber normals were calibrated separately; stone keeps its documented six-inch course scale. Clearcoat and environment response improve window and railing glass. A fine, repeated asphalt albedo variation plus moderate roughness/metalness gives the sunset road a restrained sheen rather than a mirror surface.
- Static meshes are batched by room so walking can cull rooms outside the view. Surrounding assets are skipped when walking inside and looking away from windows; they reappear when facing the exterior. This changes runtime visibility only, leaving the measured model and export data intact.

## Material scale audit

`Block` PBR maps repeat at the following model-space feet interval. The normal value is the strength multiplier for the map. Each surface retains its own roughness map; wood flooring uses a 0.85 multiplier, and polished porcelain, quartz and marble use a restrained clearcoat. These numbers were checked against the browser screenshots for visible surfaces; photographic material calibration for every room is still outstanding.

| Surface | Feet per repeat | Normal strength |
| --- | ---: | ---: |
| Porcelain | 2.5 | 0.10 |
| Bathroom wall / floor | 2 / 2 | 0.18 / 0.16 |
| Quartz | 4 | 0.12 |
| Rug | 3 | 0.34 |
| Stacked stone | 4 | 0.36 |
| Pavers | 3 | 0.30 |
| Marble | 4 | 0.12 |
| Paint / plaster | 5 / 5 | 0.08 / 0.12 |
| Limestone | 4 | 0.22 |
| Tile | 2 | 0.16 |
| Timber / wood floor | 3 / 4 | 0.20 / 0.16 |
| Stone | 4 | 0.27 |
| Fabric | 3 | 0.32 |

The facade kit still uses its shared four-foot geometry UV repeat; its paint/wall, stone, and timber normal strengths are 0.12, 0.28, and 0.20. The procedural road is a separate surface. Glass has a physical clearcoat response and HDR environment, but the screenshots do not prove accurate local reflections. Optional baked lightmaps were not added: arbitrary customer layouts and editable geometry would need a UV2/bake pipeline and invalidation on edits.

## Validation and limits

The actual AMD Radeon browser run used the same 30 × 50 ft G+1 demo project, 1280 × 1000 viewport and Auto quality choice for the screenshot pairs. The browser reported `ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001506) Direct3D11 vs_5_0 ps_5_0, D3D11)`. Auto may settle at a different effective level between pairs; both levels are recorded in [capture metadata](docs/screenshots/realism/after-capture.json). The camera and lighting choice are recorded for every front and room view. The screenshots show real 3D, including navigable room jumps; they do not establish photorealism.

**The 40 fps target is not met in every view.** See the final measured per-preset values below. Overview remains the limiting case on this AMD integrated GPU. Some walk views reach 40 fps, while the ground living view is slower. The visual result also remains well short of the primary references in landscaping, car silhouette, room furnishing and material depth. The G+1 demo cannot match the primary single-storey tiled bungalow or G+2 narrow elevation without changing the customer programme. The road's wet response is subtle and is not a ray-traced reflection. No per-view lightmaps were baked.

Functional checks are separate from the screenshot judgement: `npm test` passed all 130 tests, and `npm run build` passed. Existing third-party annotation and bundle-size warnings remain. No commit or push was attempted because this environment's `.git` directory is read-only and the external runner performs those steps.

### Final Auto quality frame samples

Measured rendered frames over 4.2 seconds after preset settling, from the same Front camera and viewport. The complete raw data and browser errors are in `docs/screenshots/realism/after-capture.json`.

| View / preset | Effective quality | FPS |
| --- | --- | ---: |
| Clear daylight Front | low | 22.0 |
| Golden hour Front | low | 21.7 |
| Sunset Front | low | 21.7 |
| Dusk Front | low | 19.9 |
| Upper lounge walk, golden hour | low | 42.5 |

The per-room screenshot status text is also recorded in the capture JSON; it is a short adaptive sample and may differ from the longer rendered-frame measurement above.
