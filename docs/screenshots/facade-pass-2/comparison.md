# Facade pass 2 — front-elevation visual review

[Gallery](index.html) · [Pass 1](../facade/comparison.md) · [Design brief](../../../AGENTS.md)

The five recipes now have a clearer frontage, off-white structural walls, distinct large facade planes, dark or timber window families, and a planted streetscape. **The result is still less realistic than the primary reference renders.** The car/furniture library, vegetation, material response and some architectural details remain visibly simplified.

## Proof and camera conditions

The authentic `before-<style>-front.png` files were captured **before any appearance changes**, using the previous application appearance plus the new Front view command. They have not been recreated or replaced.

A subsequent check of the downloaded camera showed that the legacy orbit limit had raised the initial Front view above its requested height. That control limit is corrected. To make the comparison honest, this folder contains:

- **before-…-front.png:** original capture, including the original camera's measured height (about 8.95 ft above ground).
- **after-…-matched-front.png:** new appearance replayed at that exact baseline camera; use this pair to compare the facade itself.
- **after-…-front.png:** final Front view, 15° off the road-facing normal, FOV 45°, eye **5.5 ft above ground**, facade about 70% of the image height.
- **after-…-corner.png:** the retained corner preset as a second view, FOV 52°.

All use Chrome, the same 1280 × 1200 viewport, north road, 30 × 50 ft plot and unchanged G+1 / 24 × 42 ft house. All 14 rooms, their coordinates and floor count stay unchanged. Windows can widen inside their real wall segments; bathroom windows stay small and high. The baseline lighting is the former Warm afternoon; the final shots intentionally use the requested recipe lighting. Lighting is therefore a labelled part of this change, not a controlled constant.

Camera files, [before verification](before-verification.json), [after verification](after-verification.json), [geometry evidence](geometry-verification.json) and [control/entrance evidence](controls-verification.json) accompany the images. The sky is procedural, and the house, vegetation and neighbouring massing are actual geometry. No AI house image or panorama replaces the model.

## ext-01 — Contemporary slats

[Reference](../../references/ext-01-contemporary-slats.png) · [Before](before-tn-contemporary-slats-front.png) · [Matched after](after-tn-contemporary-slats-matched-front.png) · [Final Front view](after-tn-contemporary-slats-front.png) · [Corner](after-tn-contemporary-slats-corner.png)

**Now matches:** a broad projecting white upper surround, larger timber and charcoal planes, recessed dark-framed glazing, slender steel balcony rails, timber soffit/pergola members, a shaded entrance and a golden-hour preset. The front rather than the long side dominates the image; planting, pavement and neighbouring roofs give context.

**Still differs:**

1. The fixed layout puts a bathroom at the upper front, so its high privacy window remains; the reference's wide glazed upper room cannot be copied without changing that programme.
2. The frontage is narrower and the arrangement is mirrored/adapted to the actual solid room, passage and balcony bays. It does not reproduce the reference's deeper asymmetric volumes.
3. Panel seams, timber grain, landscaping and reflections remain more regular/stylised; the stock car is especially visibly simplified.

## ext-02 — Jaali and stone

[Reference](../../references/ext-02-jaali-stone.png) · [Before](before-tn-jaali-stone-front.png) · [Matched after](after-tn-jaali-stone-matched-front.png) · [Final Front view](after-tn-jaali-stone-front.png) · [Corner](after-tn-jaali-stone-corner.png)

**Now matches:** a white surround spanning the frontage, a large ochre stone plane balanced by a much broader perforated jaali plane, glass guards, dark glazing and timber soffit detail. Part of the jaali has actual balcony daylight behind it; clear daylight replaces the common orange wash.

**Still differs:**

1. The stone pattern is more regular than the reference's rough, irregular cladding, and close material detail is less convincing.
2. The real balcony occupies only its measured bay, while the reference has a broader recessed balcony/ground-floor composition.
3. The real stair core is at the rear, so its screened headroom does not form the prominent front terrace-louvre skyline seen in the reference.

## ext-03 — Curved villa

[Reference](../../references/ext-03-curved-villa.png) · [Before](before-tn-curved-villa-front.png) · [Matched after](after-tn-curved-villa-matched-front.png) · [Final Front view](after-tn-curved-villa-front.png) · [Corner](after-tn-curved-villa-corner.png)

**Now matches:** a frontage-wide rounded white surround, rounded floor/roof edges, taupe recesses, a broader vertical timber plane, glass balcony guards, dark recessed window profiles and a sunset preset with warm entry/cove lighting. The corner shot shows the quieter two-tone side treatment.

**Still differs:**

1. The measured house remains rectangular; the reference has a more pronounced sweeping corner balcony, curved glass and a tall rounded window.
2. The roof's large open rounded cut-out and planted terrace composition are absent. No extra usable floor or balcony was invented.
3. The road sheen, soft lighting and mature planting are less natural and detailed than the reference's sunset render.

## ext-04 — Tiled bungalow

[Reference](../../references/ext-04-tiled-bungalow.png) · [Before](before-tn-tiled-bungalow-front.png) · [Matched after](after-tn-tiled-bungalow-matched-front.png) · [Final Front view](after-tn-tiled-bungalow-front.png) · [Corner](after-tn-tiled-bungalow-corner.png)

**Now matches:** pale plaster, red pitched clay roof and gable, arched veranda treatment, timber divided-light casements and daylight-led garden/street context. The roof tile orientation on the side slopes is corrected.

**Still differs:**

1. This stays the requested **G+1** house; the reference is a **single-storey bungalow**. Style selection does not remove a floor.
2. Roof layering, ridge/eave detail and veranda supports are simpler, and some existing porch fittings remain generic.
3. Timber joinery, garden variety, pots and natural tree density remain less rich than the reference photograph.

## ext-05 — Narrow urban

[Reference](../../references/ext-05-narrow-g2.png) · [Before](before-tn-narrow-g2-front.png) · [Matched after](after-tn-narrow-g2-matched-front.png) · [Final Front view](after-tn-narrow-g2-front.png) · [Corner](after-tn-narrow-g2-corner.png)

**Now matches:** stacked white frontage frames, a broad dark cladding bay, timber screening, glass balcony rail, dark window profiles, and a blue-hour preset with warm entrance, wall and soffit light. It is no longer the same peach daylight shell as the other recipes.

**Still differs:**

1. The test stays **G+1**, while the small reference is **G+2**.
2. Balcony, cladding and window proportions follow the actual fixed plan rather than the reference's different narrow-house programme.
3. Night reflections, material detail and the stock vehicle/furniture remain below the reference's realism.

## Scope, surroundings and performance

No plan-generation file, room layout or floor count was changed. The real HouseLayout wall cuts and window interactions follow the widened openings. Explicit customer window-family overrides remain supported.

The foreground uses instanced coconut palms, rain-tree and frangipani meshes, shrubs and planters. Two muted neighbouring house examples, road/kerb/footpath and a distant tree/building line replace the empty green field. Recorded boundary observations remain; the extra streetscape/planting is labelled illustrative rather than presented as surveyed fact.

The example streetscape uses **17 mesh draws**, about **115,620 rendered triangles** and **4.65 MB shared geometry**, with no added image textures. These are geometry budgets, not measured frame-rate claims. Static overview renders on demand; camera movement, walkthrough, active appliances and the climate study keep rendering as needed. A physical iPad was not available for this check.

All primary and secondary references were reviewed. [Pixabay SOURCES.md](../../references/pixabay/SOURCES.md) remains a secondary element reference, not the main style target.
