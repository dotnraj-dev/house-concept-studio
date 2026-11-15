# Permanent design brief: Tamil Nadu residential 3D

This is the repository-wide design brief for every future task. Preserve these commitments when changing planning, geometry, assets, materials, lighting, controls, exports or the interface. This document defines the visual target; it does not claim the current application already meets it. Existing reports remain historical evidence and must be kept, not rewritten to suggest unfinished work is complete.

## 1. Goal and acceptance

The **browser 3D house must look like the Tamil Nadu residential render references in [docs/references/](docs/references/)**. The core deliverable is a coherent, furnished, navigable house with convincing architecture, materials, lighting and surroundings. Improving the intake UI must not displace this objective.

**Reference hierarchy:** The parent folder's `ext-01`–`ext-05`, `int-01`–`int-04` and `plan-01`–`plan-02` images are the primary style/composition targets. [docs/references/pixabay/](docs/references/pixabay/) is a secondary **element-reference library**, including files whose names start with `ext-px`. Read its [SOURCES.md](docs/references/pixabay/SOURCES.md) for provenance. Use those images to refine jaali, tiles, TV walls, headboards, bathrooms, lamps and similar details; they must not replace the primary targets, create additional style recipes or redefine Tamil Nadu residential architecture.

**Visual quality is judged from actual browser screenshots, not from tests passing.** Tests establish correctness and prevent regressions; they do not establish realism. Do not call a result photorealistic, reference-matched or complete solely because it builds, has no console errors or passes tests.

Before visual work, open every image in `docs/references/` at a readable size and use the observations below as a starting point. Inspect any newly added images too. Filenames, search captions and earlier summaries are not substitutes for looking at the images.

Match composition, proportions, depth, architectural detailing, material response, furniture scale and light quality. Keep the same measured house in the furnished 2D plan, browser scene, walkthrough and final render. References guide the design; they do not justify blocking doors, inventing inaccessible balconies or ignoring the actual plot and customer brief.

## 2. Units: feet throughout the model

- The model and browser scene use **feet**. [src/building-dimensions.ts](src/building-dimensions.ts) is the source of truth for storey height, wall height, ceiling level, ground level and plinth height. Import those constants instead of scattering replacement numbers.
- Geometry, room dimensions, furniture placement, stairs, collision volumes, camera positions, light placement, texture scale and animation travel must use that same feet convention. **Never mix metres into model coordinates or dimensions.**
- Fit externally sourced GLB assets to explicit dimensions in feet before placing them. Check a known door, stair rise and human eye height whenever changing asset fitting or export code.
- Existing regulatory inputs and standards-based export/renderer interfaces may require metres. Keep any necessary conversion explicit, named and isolated at that interface; use the shared conversion constant. Do not feed metre values back into the feet scene, silently scale an entire house, or convert twice.
- Older reports discuss a possible metre-based scene migration. That is historical planning, not permission to change the model convention. This brief's feet rule takes precedence.

## 3. Reference observations: every supplied image

These descriptions record visible evidence. Colours are approximate visual descriptions, not sampled material specifications. The five exterior recipes in the next section are implementation directions based on that evidence.

### Primary style and composition images

| Reference | What is visible |
| --- | --- |
| [ext-01-contemporary-slats.png](docs/references/ext-01-contemporary-slats.png) | A broad G+1 contemporary frontage with cream-white rectangular frames and a deep flat roof overhang. A tall warm timber-toned slat plane anchors the left side; charcoal rectangular cladding occupies the upper centre. A recessed timber entrance, dark window frames, an upper balcony with slender dark metal rails, a low compound frontage and dense planting give depth. Golden evening light catches the glazing and timber. |
| [ext-02-jaali-stone.png](docs/references/ext-02-jaali-stone.png) | A layered white G+1 facade, recessed ground floor and projecting upper balcony with green-tinted glass railing. The upper elevation balances a white perforated jaali on the left against a large ochre-brown stone panel on the right; timber-toned soffits sit behind them. A tall terrace enclosure of vertical fins/louvres rises above the roof. The compound wall repeats stone, white framing and vertical metalwork, with planted edges. Clear daylight produces strong patterned shadows. |
| [ext-03-curved-villa.png](docs/references/ext-03-curved-villa.png) | A corner villa with rounded balcony corners and sweeping white horizontal frames around taupe-grey recesses. The first-floor balcony has glass rails, tall supports and warm downlights. A planted roof terrace has slender vertical rails; the upper white frame has an open, rounded cut-out. A tall rounded window, vertical warm-toned fins, patterned gate panels, hedge, paving, trees and a wet-looking road complete a sunset scene. |
| [ext-04-tiled-bungalow.png](docs/references/ext-04-tiled-bungalow.png) | A single-storey, Kerala-influenced garden bungalow with a red-orange tiled pitched roof, overlapping roof forms and small white triangular gable accents. White walls and eaves frame a shaded veranda with shallow arches and white supports. Warm timber doors and divided casement windows, several broad entry steps, dark veranda lanterns, terracotta pots, lawn, flower borders and a paved side path create a sheltered domestic scale. |
| [ext-05-narrow-g2.png](docs/references/ext-05-narrow-g2.png) | A narrow three-level street elevation, G+2, using stacked white box frames, a dark stone-clad vertical zone, screened windows and projecting balcony/soffit elements. Timber-toned slats or pergola members and warm recessed lighting accent the upper levels and entrance. A designed compound frontage, planting and two-wheelers establish the street setting. This is a small image: exact stone species, window hardware and sign text cannot be resolved reliably. |
| [int-01-living-arches.png](docs/references/int-01-living-arches.png) | A calm contemporary living room with a grey fabric sectional, layered cushions and throw, round timber coffee table and patterned rug. Timber outlines an arched doorway and a tall arched display niche with shelves, books, ceramics and a plant. A framed painting, full-height curtains, ceiling fan and soft side daylight make the space feel occupied without clutter. |
| [int-02-living-classic.png](docs/references/int-02-living-classic.png) | A cream classical living room with detailed cornices, moulded wall panels, decorative ceiling work and a central sculptural pendant. Black-framed tall windows and long curtains light a coordinated sofa-and-armchair arrangement. Herringbone timber flooring, layered rug, stone/timber occasional tables, framed artwork and a mantel with mirror provide material variety and human scale. This is an interior finish reference, not a requirement to add a fireplace to every TN home. |
| [int-03-double-height.png](docs/references/int-03-double-height.png) | A luxurious open living/dining composition with a tall veined stone TV feature wall, illuminated display shelves and lower TV storage. Timber and metallic vertical details contrast with glossy large-format pale flooring. An open stair, planting, upper-level railing/slatted soffit, chandeliers and dining chairs create layered views through the house. Warm cove and accent light complement daylight. |
| [int-04-furniture-picker.png](docs/references/int-04-furniture-picker.png) | A furniture-selection interface beside a rendered living space. The room has pale upholstered seating, a dark feature panel, large framed abstract art, rug, timber furniture, a pendant and tall glazed openings toward balcony greenery. The separate furniture thumbnails show varied silhouettes, including woven and upholstered seats, tables, a plant and a stool. Use it for asset variety and coordinated furnishing, not as an image to place inside the house. |
| [plan-01-cutaway.png](docs/references/plan-01-cutaway.png) | A furnished overhead cutaway of a long, narrow home surrounded by greenery. Visible rooms include a bedroom with a red bed cover, a compact bathroom with sanitary fittings, a furnished sitting area, a kitchen with counters/island seating and a small outdoor terrace. Timber-toned floors, wall thickness, real openings, furniture and contact shadows make room use legible. It is a rendered cutaway, not merely a coloured rectangle diagram. |
| [plan-02-cutaway-4bhk.png](docs/references/plan-02-cutaway-4bhk.png) | A furnished, dimension-annotated multi-bedroom floor plan with bedrooms arranged around living/dining, a central stair near the rear, kitchen/service spaces and a front car portico with a vehicle. Beds, seating, dining furniture, sanitary fixtures, doors and windows explain how the house is used. The image is low resolution: do not transcribe uncertain dimension text or invent exact room labels from it. |

### Secondary Pixabay element images

All 22 images below were inspected individually. Preserve [SOURCES.md](docs/references/pixabay/SOURCES.md); link to its source records rather than copying them here. These are a mixture of photographs, renders and at least one image identified as AI-generated by its source record. A filename or source caption is not proof of material, location, construction detail or geometry. Learn the named element without copying unrelated foreign-house massing, pools, bathtubs, fireplaces, colours or room programmes into a customer's house.

| Element reference | Visible detail and permitted use |
| --- | --- |
| [detail-px-01-jaali-star.jpg](docs/references/pixabay/detail-px-01-jaali-star.jpg) | Rose-red lattice with six-petal floral centres, angular polygon openings, profiled edges and mottled weathering. Study repeat geometry, thickness, bevels and shadowed holes. The image alone does not establish whether the material is clay or carved stone. |
| [detail-px-02-jaali-arch.jpg](docs/references/pixabay/detail-px-02-jaali-arch.jpg) | A backlit arched lattice with interlocking crosses, squares and hexagonal side patterns. The bright exterior remains visible through real openings. Use for cut-through jaali geometry, arched framing and light transmission, not an opaque printed screen. |
| [detail-px-03-clay-roof-tiles.jpg](docs/references/pixabay/detail-px-03-clay-roof-tiles.jpg) | Diagonal rows of overlapping curved tiles with raised lips, thickness, dark contact shadows and grey/brown weathering. Use for instanced tile profiles, overlap and restrained material variation rather than a flat checkerboard roof texture. |
| [ext-px-01-kerala-tiled-roof.jpg](docs/references/pixabay/ext-px-01-kerala-tiled-roof.jpg) | A white waterside house beneath a red tiled roof with small raised ridge/gable forms, a shaded front veranda and palms. Study roof layering, eaves and shade for the primary tiled-bungalow recipe. Do not add a canal or claim a TN location from the image. |
| [ext-px-02-tiled-bungalow-verandah.jpg](docs/references/pixabay/ext-px-02-tiled-bungalow-verandah.jpg) | A stone-faced cottage with a dominant gabled tiled roof, lower veranda roof, timber triangular porch bracing, pale posts and planted garden. Study tile edges, veranda depth and support joints. The visible main roof is gabled; do not repeat a generic hipped-roof caption as an observation. |
| [ext-px-03-heritage-verandah-facade.jpg](docs/references/pixabay/ext-px-03-heritage-verandah-facade.jpg) | A long white two-level heritage frontage with reddish tiled roofs, closely repeated upper windows, ornate balcony/frieze work, a projecting central gable and timber ground-floor doors. Use for eave, fretwork, joinery rhythm and veranda detail, not as the default scale or whole-house style. |
| [ext-px-04-indian-gate-balcony.jpg](docs/references/pixabay/ext-px-04-indian-gate-balcony.jpg) | A lime-green frontage with white columns and balusters, arched openings, timber joinery, red compound panels and a black curved wrought-metal double gate between lantern-topped piers. Study gate scrollwork, hinges, piers, balcony supports and entry alignment; the strong paint palette is optional. |
| [ext-px-05-box-frame-dusk.jpg](docs/references/pixabay/ext-px-05-box-frame-dusk.jpg) | A dusk render with a projecting upper box, timber-lined deep soffit, large glazed openings, horizontal blinds and warm downlights reflected in a pool. Use frame/reveal depth, soffit detailing and balanced interior/exterior exposure. Do not import the pool or replace the primary TN facade recipe. |
| [ext-px-06-modern-villa-dusk.jpg](docs/references/pixabay/ext-px-06-modern-villa-dusk.jpg) | A white flat-roof villa render with offset volumes, recessed glazing, slim light strips, warm rooms and cool pool-edge illumination. Study layered lighting, shadow depth and exposure balance; the resort deck, pool and event decor are not default house requirements. |
| [ext-px-07-glass-railings.jpg](docs/references/pixabay/ext-px-07-glass-railings.jpg) | A white multi-level building with dark-framed glazing, projecting balcony slabs, pale transparent glass guards and visible panel divisions on balcony and roof edges. Study glass tint, panel thickness/joints and how the guard meets the slab. The source is not evidence of a TN house. |
| [int-px-01-tv-wall-false-ceiling.jpg](docs/references/pixabay/int-px-01-tv-wall-false-ceiling.jpg) | A timber-panelled TV wall with integrated display/book shelves, varied shelf geometry, a white lower cabinet, recessed lighting and a stepped ceiling recess. Use connected TV joinery, shelf thickness, objects and grazing light; keep actual doors clear. |
| [int-px-02-living-tv-unit.jpg](docs/references/pixabay/int-px-02-living-tv-unit.jpg) | A timber TV unit with tall side bookcases, baskets, plants, lower storage, wall lights and a timber ceiling with dark beams. A furnished sofa/rug zone faces it. SOURCES.md identifies the linked image as AI-generated: use it for detail ideas only, not construction evidence or a substitute for the interactive model. |
| [int-px-03-living-decor.jpg](docs/references/pixabay/int-px-03-living-decor.jpg) | Pale fabric sofa with cushion/throw variation, layered rug, small coffee table, tripod floor lamp, abstract artwork, curtains and adjacent dining furniture. Study fabric folds, believable decor density and varied object silhouettes without filling circulation space. |
| [int-px-04-bedroom-headboard-cove.jpg](docs/references/pixabay/int-px-04-bedroom-headboard-cove.jpg) | A broad timber headboard wall with a display ledge, white floating bedside surfaces, personal objects, profiled ceiling cornice and downlights making scalloped wall washes. Study headboard/ledge depth and light falloff. The photo does not clearly prove a hidden cove LED strip despite its filename. |
| [int-px-05-bedroom-backlit-headboard.jpg](docs/references/pixabay/int-px-05-bedroom-backlit-headboard.jpg) | A timber headboard with recessed side niches, switches/sockets, white bedding and a continuous warm glow behind its upper edge against cool ambient light. Study the backlight recess, joinery thickness and practical bedside details; the blue room tint is not a required palette. |
| [int-px-06-bedroom-fan-ac.jpg](docs/references/pixabay/int-px-06-bedroom-fan-ac.jpg) | A three-blade ceiling fan and high wall-mounted split AC above a coordinated bedroom with upholstered headboard, paired bedside lamps/drawers, artwork, blinds and curtains. Study actual appliance silhouettes, fan blade profiles and comfortable furnishing relationships. |
| [int-px-07-bedroom-wardrobe.jpg](docs/references/pixabay/int-px-07-bedroom-wardrobe.jpg) | Tall pale timber wardrobe doors with long metal handles, a reflective panel at the right, upholstered headboard and a white bedside drawer unit with a lit glass lamp. Study wardrobe grain direction, joints, handle scale and bedside layering; the crop does not establish exact wardrobe height. |
| [int-px-08-kitchen-granite.jpg](docs/references/pixabay/int-px-08-kitchen-granite.jpg) | A thick, speckled tan stone island counter with a profiled edge, timber panelled cabinets, detailed pulls, a multi-burner hob and pendant lighting. Use stone response, edge thickness and cabinet hardware. It does not override the TN default black-granite counter and two-burner hob. |
| [int-px-09-kitchen-straight.jpg](docs/references/pixabay/int-px-09-kitchen-straight.jpg) | Despite the filename, the visible counter turns into an L-shaped run. White base cabinets, dark counters, a steel cooker/hood, tiled backsplash and a sink below windows/blinds coordinate with real worktop objects. Study sink/window relationships, counter continuity, tile joints and storage, not an assumed straight-only layout. |
| [int-px-10-bath-vanity.jpg](docs/references/pixabay/int-px-10-bath-vanity.jpg) | A double vanity with speckled stone top, framed panel storage, metal taps, broad mirror and warm mirror lights; a separate framed glass shower is visible beside a bathtub. Study wet/dry separation, glass joints, fixture spacing and reflections. Do not add a bathtub or double basin unless requested and accommodated. |
| [int-px-11-bath-tiled-wall.jpg](docs/references/pixabay/int-px-11-bath-tiled-wall.jpg) | Blue rectangular wall tiles with staggered pale grout, a large round mirror, twin taps/vanity units, small wall lights, shelves, toiletries and towels. Study tile scale/joints, chrome response, mirror reflection and accessory placement. Neither blue tile nor this large bathroom programme is mandatory. |
| [pooja-px-01-kuthuvilakku.jpg](docs/references/pixabay/pooja-px-01-kuthuvilakku.jpg) | A close-up brass oil lamp with a turned, ridged central finial, broad scalloped bowl, wick-bearing edges and small flames. Bright highlights contrast with darker aged metal. Model the turned profile, bowl and wick detail; a ball on a plain cylinder is not an adequate finished lamp. The cropped image does not establish the full stem/base or overall height. |

## 4. Tamil Nadu house vocabulary

Use these elements as an architectural vocabulary, composing a coherent house rather than attaching every feature to every facade. Preserve customer choices, plot limits, access, ventilation, service routes and the existing rules review.

### Exterior

- Car porch/portico with an actual vehicle approach and usable parking clearance.
- Sunshades over windows (**chajja**) with thickness, projection and supporting/reveal detail.
- Parapet and a staircase headroom block on the terrace, with louvres where appropriate.
- An overhead water tank screened from the street when a roof tank is selected; retain editable tank location and maintenance access.
- Stone-cladding feature wall, CNC jaali screen, vertical fins and timber/WPC slat screens with real depth, spacing and shadows.
- Projecting box frames around balconies, glass balcony railings, balcony access doors and pergola members.
- Compound wall with a designed gate, pedestrian approach and compatible vehicle opening.
- Plinth with **3–5 entry steps** as appropriate to the actual rise and safe step dimensions; do not change the shared plinth height merely to obtain a preferred step count.
- Wall-washer lights, cove lights, recessed soffit lights and a deliberate day/evening lighting composition.

### Interior

- False ceiling with a cove LED strip in living, dining and the master bedroom. Model the recess, lip, edges and light source; an emissive stripe on an otherwise flat slab is insufficient.
- TV feature wall using a coordinated fluted panel, marble/stone or louvred treatment, with a TV unit, display objects and lower storage. Reserve the full composition so paintings, doors and windows do not overlap it.
- For a requested **Hindu pooja space**: wooden or marble mandir unit, bell-and-jaali double doors, brass **kuthuvilakku** lamp, kolam floor decal and a backlit back panel. Support both a dedicated room and the customer's full-height prayer cabinet. Faith-specific fittings require the customer's selection; retain neutral and other-faith prayer options.
- TN modular kitchen: **black granite counter**, loft storage above wall cabinets, wall tiles extending **2 ft above the counter**, two-burner hob, chimney and steel vessels. Provide usable preparation space, storage and appliance clearances. Open kitchen to dining is a genuine layout option, with a real opening.
- Full-height wardrobes, headboard wall, coordinated bedside tables and lamps, curtains and framed art. Include fans, AC and storage according to the editable room brief and appropriate installation clearances.
- Bathrooms with **7 ft wall tiles** and separate wet and dry areas where space allows. Coordinate WC, basin, mirror, taps, shower, bucket/mug, soap storage, drain and door swing; do not pretend a tiny bathroom has a separate wet zone if it does not fit.

### Vastu preferences, never unchangeable geometry

When Vastu is enabled and the customer has not given directions, offer these **overridable preferences**: pooja in the north-east, kitchen in the south-east, master bedroom in the south-west, entrance facing east or north. Do not infer the customer's religion from the location. Explicit customer directions take precedence; no-Vastu mode disables these preferences. Respect strict/semi/no-Vastu choices and show unresolved conflicts honestly instead of silently rotating furniture or changing the brief.

## 5. Five exterior style recipes

The material colours below are approximate palette targets. Each recipe follows its named image; a detail proposed for an evening view is not a claim that it is visible in a daytime reference. Adapt the composition to the actual plot, floor programme and customer-selected style.

### ext-01 — Contemporary timber/slat frontage

Reference: [ext-01-contemporary-slats.png](docs/references/ext-01-contemporary-slats.png).

- **Massing:** Broad G+1 composition with two interlocking rectangular volumes, a deep horizontal roof/eave, recessed entrance and first-floor balcony. Use a tall left-hand feature plane to balance the horizontal slabs.
- **Materials and colours:** Warm ivory/off-white plaster, charcoal-grey large-format stone/panel cladding, honey-brown timber/WPC slats and door, dark bronze/black metalwork, grey paving and dense green planting. Give the slats and panel joints dimensional relief.
- **Elements:** Two-storey slat screen, shaded timber entrance canopy, feature wall, planter pockets, balcony, aligned front steps, low compound wall and slender vertical gate/fence members.
- **Windows:** Dark slim frames; broad glazed/sliding openings to the balcony and living spaces. Include the upper horizontal louvred/shaded opening. Follow the reference's slender **metal balcony railing**, rather than automatically substituting glass.
- **Parapet and roof:** Clean flat terrace/parapet silhouette with a substantial projecting white roof edge. Integrate and screen any stair headroom or tank without allowing it to dominate the street view.
- **Lighting:** Golden-hour daylight, warm glazing and restrained warm canopy/soffit light. Preserve the shaded entrance and recesses; graze timber and stone without flattening them into uniformly bright surfaces.

### ext-02 — Jaali, stone and terrace louvres

Reference: [ext-02-jaali-stone.png](docs/references/ext-02-jaali-stone.png).

- **Massing:** Layered G+1 white frame around a broad upper balcony, with a deeply recessed ground floor and a taller screened terrace/headroom volume behind. Balance a light perforated plane against a solid stone plane.
- **Materials and colours:** Chalk-white plaster/CNC jaali, warm ochre and brown textured stone, rich brown timber-toned soffits, clear green-grey glazing and muted grey metalwork. Repeat the stone and white framing at the compound wall.
- **Elements:** Perforated jaali with real holes, deep balcony frame, glass rails, timber/WPC soffit/slat work, tall vertical terrace fins/louvres, integrated planters, designed gate and compound wall.
- **Windows:** Recessed dark timber/metal frames with clear glazed openings behind the balcony and screening. Keep access through the balcony facade functional; jaali must not seal a necessary door or window.
- **Parapet and roof:** Flat terrace, horizontal white parapet/frame and a coordinated tall slatted enclosure. A screened stair block/tank can occupy that enclosure if the programme requires it; concealment does not remove service access.
- **Lighting:** The reference is daylight-led, with strong, readable jaali/fins shadows and a shaded ground floor. For an additional evening view, use restrained warm soffit/downlighting and stone grazing; keep the perforation pattern legible.

### ext-03 — Rounded corner villa

Reference: [ext-03-curved-villa.png](docs/references/ext-03-curved-villa.png).

- **Massing:** G+1 corner villa with a wraparound projecting balcony, rounded slab/frame corners, tall supports and a planted roof terrace. Combine a tall vertical rounded opening with broad horizontal bands.
- **Materials and colours:** Warm white/light grey plaster, taupe-grey recessed surfaces, honey-timber/WPC accents, clear glass, dark bronze/brown rails and gate, pale grey pavers and rich hedging.
- **Elements:** Profiled curved balcony/slab edges, glass railing, tall vertical fins, upper open rounded/pergola frame, roof planting, patterned CNC gate panels, boundary hedge, entrance path and corner-street context.
- **Windows:** Dark-framed full-height glazed balcony doors plus a tall rounded-corner vertical window. Model the curved reveal/frame and real glass thickness; do not fake the rounded opening with an opaque image.
- **Parapet and roof:** Flat terrace with rounded perimeter composition, slim vertical roof balustrade and planters. Set necessary screened services/headroom behind the main silhouette.
- **Lighting:** Low warm sunset with warm recessed balcony downlights, shaded soffits and softer interior light. The road's damp sheen should have controlled roughness and broken reflections, not a uniform mirror surface.

### ext-04 — Tiled garden bungalow

Reference: [ext-04-tiled-bungalow.png](docs/references/ext-04-tiled-bungalow.png).

- **Massing:** Low, single-storey bungalow with a generous veranda, overlapping pitched/hipped roof forms and small triangular gable accents. Keep the entrance, eaves and columns at a domestic scale rather than applying an urban G+1 box facade.
- **Materials and colours:** Lime/cream-white plaster and fascia, red-orange terracotta roof tiles, warm brown timber joinery, pale stone steps, grey interlocking paving, terracotta pots and layered greens.
- **Elements:** Sheltered arched veranda, profiled supports, deep eaves, individual/instanced tile and ridge details, broad front steps, dark metal lanterns, lawn, flower borders, pots and side path. Any gate/compound treatment should be quiet and compatible with the garden setting.
- **Windows:** Warm timber divided-light/casement windows with visible frame, sill and shutter/grille detail; coordinate the main timber entrance door with them.
- **Parapet and roof:** Pitched tiled roof is the dominant silhouette, with white-edged gable accents and proper ridge/eave thickness. Do not add an exposed flat-roof parapet or roof tank in front of it. Accommodate services discreetly according to the actual brief.
- **Lighting:** Soft garden daylight, shaded veranda and natural tree shadows. Veranda lanterns may provide a warm evening variant; avoid an all-over orange wash or excessive facade LEDs.

### ext-05 — Narrow urban G+2

Reference: [ext-05-narrow-g2.png](docs/references/ext-05-narrow-g2.png).

- **Massing:** Slender three-level frontage with stacked, offset box frames, a strong vertical cladding zone, recessed glazing and projecting balcony/canopy layers. Preserve usable rooms, stairs and parking behind the narrow facade.
- **Materials and colours:** Warm white/cream frames, dark charcoal/brown stone cladding, honey-brown timber/WPC soffits or slats, dark metalwork, clear/smoked balcony glass and small green planting accents. Do not infer an exact stone product from the small image.
- **Elements:** Stone feature plane, screened windows, projecting balcony frames, upper pergola/slat detail, shaded entry/portico, designed compound wall/gate, entry steps and compact street planting. Keep the pedestrian route and vehicle/two-wheeler access usable.
- **Windows:** Rectangular dark-framed glazed openings with visible protective grille/screen detail, plus glazed balcony access. Use a consistent window family across storeys while varying size and shading by room.
- **Parapet and roof:** Flat terrace with a stepped/projecting white top frame, upper slat/pergola element and discreet rear-set headroom/tank screening. Keep rooftop equipment out of the main street silhouette.
- **Lighting:** Dusk/blue-hour exterior with warm entry, balcony and soffit/cove lighting, plus subtle stone wall-washing. Retain dark recesses and neighbouring/street context rather than overexposing the whole elevation.

## 6. Geometry, material and layout rules

- **No new geometry built only from plain boxes when a profiled shape, a GLB model or an instanced detail is possible.** Simple boxes can support hidden structure, collision or temporary layout debugging; they are not sufficient finished visual assets. Use bevelled/profiled edges, extrusions, curves, lathed fittings, fitted GLBs and instanced repetitive detail where appropriate.
- Model real reveals, sills, frame thickness, tile joints, slat spacing, cabinet carcasses, shelf thickness and hinge/track behaviour. Jaali holes, fins, roof tiles and pergola members must produce appropriate depth and shadows. Keep repeated detail efficient through instancing/shared resources.
- Use material-specific PBR response and feet-consistent UV scale: plaster, stone, timber/WPC, granite, fabric, glass, tile, chrome and brass must not all share the same colour/roughness response. Glossy tile should show controlled reflections; bathroom flooring must not look like a polished mirror.
- Integrate daylight, interior lighting, cove lighting, contact shadows and exposure. Detail must remain readable in both the exterior and the occupied rooms; emissive geometry alone is not a substitute for lighting the room.
- Respect physical access: clear door swings, correctly oriented chairs/sofas, usable stairs and landings, bedroom-to-attached-bath access, balcony doors, wardrobe opening clearance and service-maintenance space. Do not add a room solely to occupy leftover area or house a basin.
- Compose surroundings coherently: ground, boundary, designed gate, road, paving, plants and neighbouring volumes. Use recorded plot surroundings when supplied; keep example surroundings identified as examples.
- Keep supported design choices editable. Preserve room-specific window/door/wardrobe choices, prayer modes, kitchen connection, furniture toggles and customer overrides when updating a style recipe.

## 7. Mandatory visual evidence for every visual task

Every visual task ends with **before and after screenshots of the actual browser 3D** saved under `docs/screenshots/<task>/`, plus a short, honest comparison against named images in `docs/references/`.

Use a descriptive task folder and files such as `before-exterior.png`, `after-exterior.png`, `before-living.png`, `after-living.png` and `comparison.md`. Capture affected interior/detail views as well as the street-facing exterior when relevant. Keep the same house, camera position/FOV, viewport, lighting preset and quality settings for each comparable pair. Label any necessary difference. Capture the baseline before editing; do not recreate or invent a successful-looking "before" afterwards.

In `comparison.md`, name the primary style reference files used, record what visibly improved, what still looks wrong and any feature not implemented. Name any Pixabay element references separately; success at matching a lamp or tile does not establish that the whole house matches the primary style target. Check proportions, silhouette, material/texture scale, light/shadow, reflections, detail, furniture orientation and access. Include walkthrough evidence where geometry or interaction changed. A missing screenshot or failed browser render is an unresolved validation gap, not a passing visual review.

Run appropriate functional checks too, but report them separately from the visual judgement. Documentation-only or nonvisual changes do not require invented scene screenshots; they must preserve this process for subsequent visual tasks.

## 8. The interactive house must remain real 3D

**No AI image may replace the 3D model in the interactive view.** Do not substitute a generated photograph, panorama, billboard, prerecorded flythrough or flattened facade for navigable, measured house geometry. Supporting textures, artwork and environment lighting are allowed; the actual walls, openings, rooms, furniture and interactions must remain camera-navigable 3D.

Presentation stills must be identified as stills and correspond to the same house scene. AI may assist planning and development, but it does not excuse incoherent geometry or supply proof of browser rendering quality. Renting a GPU or configuring an AI key is not itself a visual improvement.

## 9. Existing reports and working references

Keep these files intact and link to them rather than duplicating their text here. Read the relevant report before changing its subsystem. Distinguish historical implementation status from the target in this brief; if older advice conflicts with the feet convention or screenshot-based acceptance, follow this brief.

| Existing document | Use |
| --- | --- |
| [README.md](README.md), [GUIDE.md](GUIDE.md) | Project entry points and application usage. |
| [PRODUCT-PRIORITIES.md](PRODUCT-PRIORITIES.md) | Core 3D priority and recorded acceptance gaps. |
| [CORE-3D-ROADMAP.md](CORE-3D-ROADMAP.md) | Delivery sequence, planning/rendering responsibilities and historical limits. |
| [HOUSE-REFERENCE-STUDY.md](HOUSE-REFERENCE-STUDY.md) | Earlier floor-plan/elevation study and source references. |
| [REGIONAL-DESIGN-UPDATE.md](REGIONAL-DESIGN-UPDATE.md) | Regional styles, context and research scope. |
| [INTERIOR-REALISM-UPDATE.md](INTERIOR-REALISM-UPDATE.md) | Interior material, lighting/reflection and reference-search work. |
| [FURNISHING-UPDATE.md](FURNISHING-UPDATE.md) | Furnishing choices, measured placement and clearance behaviour. |
| [FACADE-KIT-UPDATE.md](FACADE-KIT-UPDATE.md) | Parametric Tamil Nadu facade recipes, browser screenshot comparisons, export evidence and remaining visual/access limits. |
| [FACADE-PASS-2.md](FACADE-PASS-2.md) | Front-elevation camera, recipe colours/windows/lighting, streetscape, matched-camera evidence and visual/performance limits. |
| [TAMIL-NADU-RULES.md](TAMIL-NADU-RULES.md) | Building-rule sources, supported checks and review limits. Architectural style does not replace the site's applicable rules. |
| [BUILD-REPORT.md](BUILD-REPORT.md), [BUILD-REPORT-2026-11-14.md](BUILD-REPORT-2026-11-14.md) | Previous build records and validation scope. |
| [STAGING-REPORT.md](STAGING-REPORT.md) | Staging results and recorded limitations. |
| [HOSTING.md](HOSTING.md), [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting/deployment configuration and verification records. |
| [GPU-SETUP.md](GPU-SETUP.md) | Optional rendering worker/GPU setup; not evidence of achieved quality. |
| [Material licences](public/assets/materials/LICENSE.md) | Existing material attribution and reuse information. |
