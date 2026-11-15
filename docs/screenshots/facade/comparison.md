# Facade study: five Tamil Nadu recipes

The later [facade pass 2](../facade-pass-2/comparison.md) adds Front view comparisons, recipe window/colour/lighting treatment and a planted streetscape. This page and its original screenshots remain the pass 1 record.

The kit is implemented, and the five recipes now have visibly different material balances and architectural details. **These browser views still fall short of the primary reference renders in realism and composition.** Passing geometry checks does not establish visual equivalence.

[Side-by-side gallery](index.html) · [Original baseline](before-exterior.png) · [Permanent brief](../../../AGENTS.md) · [Implementation report](../../../FACADE-KIT-UPDATE.md)

## Capture conditions

- Actual browser screenshots in local **VITE_DEMO_MODE=true**, using the fictional [saved project](demo-project.json).
- All five use the same **30 × 50 ft plot, G+1, 24 × 42 ft footprint**, two bedrooms, two bathrooms, north road. The plan's rooms/openings are preserved when selecting a recipe.
- Chrome, 1600 × 1100 viewport; canvas capture excludes the toolbar. FOV 52°, warm afternoon, contact shadows, live reflections and surroundings enabled.
- Street-corner camera in model feet: **[-32.76, 6.2, -54.6]**, looking toward [0, 8, 0]. [Downloaded camera](camera.json) is explicitly in metres at the Blender boundary.
- The authentic baseline was captured before editing the facade. Its legacy style is `tn-contemporary`. It has the same house, camera and presentation settings. It is deliberately retained, not regenerated.
- The main references set the style target. All 22 [Pixabay references](../../references/pixabay/SOURCES.md) were reviewed as secondary elements only; no reference photo or AI image replaces the navigable house.

## Contemporary slats — ext-01

[Reference](../../references/ext-01-contemporary-slats.png) · [Browser](tn-contemporary-slats.png) · [Comparison board](compare-tn-contemporary-slats.jpg)

The new frontage has charcoal jointed panels, tall instanced timber fins, a deep balcony surround, a steel guard, framed pergola and an aligned timber/metal gate.

Three remaining differences:

1. The fixed narrow house and its long side wall have simpler massing than the reference's broad, layered frontage and generous recesses.
2. The upper front room is a bathroom with a privacy window. It cannot acquire the reference's broad dark-framed glazing merely by changing a facade recipe; the existing white window family remains.
3. Timber, wall/stone detail and planting are less natural and varied, and the shared afternoon setup lacks the reference's richer dusk reflections and landscaped lighting.

## Jaali and stone — ext-02

[Reference](../../references/ext-02-jaali-stone.png) · [Browser](tn-jaali-stone.png) · [Comparison board](compare-tn-jaali-stone.jpg)

Ochre stone is concentrated on the upper wall, a white frame projects around it, and an alpha-cut cross jaali occupies clear wall/balcony-edge space. Glass guards, timber soffit members and CNC gates distinguish it from the slat recipe.

Three remaining differences:

1. The jaali is narrower and partly backed by a solid wall; only its balcony-edge part has daylight behind it. The reference has a much broader perforated screen.
2. The procedural six-inch stone courses read more regularly than the reference's rough irregular cladding. Existing window framing and glass response also differ.
3. The headroom block follows the real rear stair core and is mostly hidden from this street angle. The reference's prominent terrace louvres, deeper balcony layering and denser landscaping are not reproduced.

## Curved villa — ext-03

[Reference](../../references/ext-03-curved-villa.png) · [Browser](tn-curved-villa.png) · [Comparison board](compare-tn-curved-villa.jpg)

Rounded balcony surrounds, continuous rounded floor fascia, balcony slab/canopy returns and a rounded roof edge now sit against taupe recesses, timber fins and glass guards.

Three remaining differences:

1. Curves are modest adaptations of the rectangular measured plan. The reference has more pronounced sweeping corner volumes and a large open roof-frame cut-out.
2. The guards remain straight glass panels on real balcony edges, and the existing windows remain rectangular. The reference's wrapped glass corner and tall rounded window are absent.
3. Planting, pavement/road reflections and sunset atmosphere remain much simpler; the browser material and shadow response is not at the reference's photorealistic level.

## Tiled bungalow — ext-04

[Reference](../../references/ext-04-tiled-bungalow.png) · [Browser](tn-tiled-bungalow.png) · [Comparison board](compare-tn-tiled-bungalow.jpg)

A hipped clay roof with individual instanced tile relief, a front cross-gable, profiled veranda arches and steel gates replace the generic flat-terrace composition.

Three remaining differences:

1. This is deliberately the requested **G+1 test house**, whereas the reference is a **single-storey bungalow**. Selecting this style never silently removes a storey.
2. The main roof is largely hidden from the low street camera, and its layering, tile weathering and veranda support detailing are simpler than the reference.
3. Existing white window frames/modern doors differ from the reference's timber divided casements; the lush garden, flowers and domestic garden scale remain underdeveloped.

## Narrow urban — ext-05

[Reference](../../references/ext-05-narrow-g2.png) · [Browser](tn-narrow-g2.png) · [Comparison board](compare-tn-narrow-g2.jpg)

Stacked projecting surrounds, a dark vertical cladding strip, high horizontal timber screens, a glass balcony and timber/metal gates provide a taller rhythm without inventing another floor.

Three remaining differences:

1. The test is **G+1** while the reference is **G+2**. Floor count remains a customer/plan choice rather than a side effect of style selection.
2. Frames and screening adapt to this plan's actual bathroom, passage, portico and balcony; their proportions and offsets therefore differ from the small reference image.
3. Dusk lighting, irregular stone detail, greenery and occupied urban street context remain less convincing and less detailed than the reference.

## Functional evidence and limits

[Browser verification](browser-verification.json) records all five captures and console/page errors. [GLB verification](glb-verification.json) inspects the actual full-house download: embedded images, alpha masking, units and expanded instances. The binary stays in ignored `exports/facade/`.

[Entrance walkthrough](walkthrough-verification.json): the main door was opened using E, then W moved the camera 7.92 ft through it. The before/after camera files and screenshots are kept alongside the street views. The close-up closed-door image is an interaction check, not a composition reference.

The raycast checks cover real doors/windows on every elevation for all five styles and all four road facings. They found no facade obstruction in the tested layouts. They do not certify arbitrary future plots, structural supports or regulatory setbacks for decorative projections.

The headroom volume is positioned over the actual stair core and explicitly flagged for roof-access review: this task does not add a new roof stair flight. A tank screen is omitted and tagged for clearance review when it would overlap the stair core or exceed the roof; the customer's selected service position is never silently moved. The tiled recipe does not add a visible flat-roof tank above its pitched roof.

The GLB shares the live kit geometry and materials. A Blender render was **not** executed in this session; identical lighting or identical pixels in Blender are not claimed.
