# House modelling correction — reference review

This update uses the user's elevation images, five distinct floor-plan PDFs (one supplied PDF is an exact duplicate) and four Houseyog project galleries as visual references. Images and drawings are studied locally, not distributed as application assets or substituted for a generated 3D model.

## Observations used in the implementation

- Public circulation can open into living and dining, instead of sitting behind a succession of narrow corridor doorways. The plan generator now gives those connections broad openings.
- Bedrooms and their attached bathrooms form private suites. Dressing space can adjoin the bedroom; a suite bathroom needs a private bedroom door and should not acquire an extra corridor door.
- A common guest bathroom is still useful. The form now offers attached, mixed and common bathroom access; it does not assume every household wants the same arrangement.
- A balcony must be an actual space with an access opening, floor, guard and connected interior. The model now carves a front sit-out from a sufficiently deep upper lounge and provides a glazed access door.
- The elevation's materials should follow its openings. New front cladding uses the actual wall pieces around doors and windows rather than covering those openings with decorative panels.
- The entrance and parking opening should align with real approach routes. The entrance garden and compound composition reserve these clear openings; the displayed gate leaves are open.
- Window privacy differs by room. Bathrooms now have higher, smaller windows and no living-room curtains.
- Furniture needs solid wall space. Unconstrained living-room orientations now select a usable solid wall for the TV instead of placing it across a front window. Explicit customer facing instructions still take precedence.

The appearance update adds photographic stacked-stone, paving and marble materials, physical-scale UVs, charcoal window trim, wood soffits, facade lighting, balcony details, contact shading and a warm-afternoon/daylight choice. The roof and finish controls remain editable.

## Files reviewed visually

All are in C:/Users/Rajkumar/Downloads:
- fp1295-1486.pdf: 30 x 50 north-face ground-floor plan.
- fp1141-1332.pdf: 51 x 55 north-face ground-floor plan.
- fp1341-1532 (1).pdf: 33 x 47 south-face ground-floor plan.
- fp1341-1532.pdf: exact duplicate of the preceding PDF, verified by SHA-256.
- fp1344-1535.pdf: 22 x 30 south-face ground-floor plan.
- fp1346-1537.pdf: another 30 x 50 north-face ground-floor plan.

Raster pages are kept in .work/pdf-references for local visual review. Source watermarks were preserved. Their depicted dimensions are examples, not consolidated local construction requirements.

## Linked project galleries

- [66 x 44 duplex / independent family floors](https://www.houseyog.com/44-east-facing-4bhk-house-design-duplex/dhp/100)
- [18 x 62 narrow-plot duplex](https://www.houseyog.com/18x62-east-facing-house-plan-6bhk-duplex-elevation/dhp/99)
- [Eluru function hall, multiple floors](https://www.houseyog.com/small-banquet-hall-design-in-eluru-andhra-pradesh-g-3-modern-elevation-smart-layout-compact-planning/dhp/97)
- [19 x 45 multi-storey dwelling](https://www.houseyog.com/19x45-west-facing-5-storey-house-plan-10-bhk-modern-elevation/dhp/93)

The narrow-plot page has conflicting east/north labels, and the multi-storey page uses inconsistent storey counts. The drawings were used for spatial relationships; those labels were not turned into automatic planning rules. The function hall is a commercial precedent and does not imply that the residential generator now designs compliant commercial buildings.

Further architect-provided references:
- [Framed House / Crest Architects](https://www.archdaily.com/959292/framed-house-crest-architecture)
- [Akam House / Ishtika](https://www.archdaily.com/993217/akam-house-ishtika)
- [Corbel House / Kamat & Rozario Architecture](https://www.archdaily.com/888970/corbel-house-kamat-and-rozario-architecture)

## Assets and renderer

New photographic maps are from [Poly Haven](https://polyhaven.com/license), licensed CC0. Source IDs and checksum verification are in scripts/download-facade-materials.py and public/assets/materials/LICENSE.md. Screen-space contact shading uses [Three.js SSAOPass](https://threejs.org/docs/pages/SSAOPass.html). It improves the interactive view without replacing it with a generated image.

## Remaining limits

The planner still has a two-wing basis and can flag a brief that does not fit its available layout. It is not yet a general solver for every narrow plot, multi-family arrangement or regional form. Attached suites are created when sufficient width is available and no locked custom room size is being overridden. Very tight programmes still need revision.

The scene is a real, navigable model. Photo-reference quality must be judged from the actual displayed output; tests alone cannot establish photorealism. Contact shading is screen-space rather than full global illumination, and material improvements do not remove the need for further architectural modelling and lighting work.


## Verification for this release

All 65 automated checks pass, including suite privacy, optional common bathrooms, real balcony access, TV clearance and continuous texture coordinates. TypeScript and production builds pass. The browser study inspected the actual street-height exterior, living room, bedroom and attached bathroom. It checks that the canvas contains rendered geometry as well as reporting browser exceptions. These screenshots are local verification artefacts in exports/architecture-preview.
