# Furnishing and planning update · 15 November 2026

## Reference study

Reviewed the photographed frame, shutter, handle, track and glazing arrangements on pages 13–14 and the gallery on pages 21–22 of the [AIS Windows March 2025 brochure](https://www.aiswindows.com/aiswindowscms/uploads/brochure/pdf/brochure_1744710498.pdf). The reference offers casement, sliding, French, combination, arched and top-hung examples. Also consulted [Fenesta's Indian design catalogue](https://www.fenesta.com/design) and [window range](https://www.fenesta.com/window); the detailed design page blocked automated retrieval, so the visual study used the accessible primary AIS brochure.

These are design references, not licensed assets or endorsements. No manufacturer photographs, logos or proprietary models are shipped. Original reusable geometry models white casements, charcoal sliding windows, timber casements with grilles, divided-light timber windows and privacy louvres. This is procedural modelling informed by reference photographs, not automatic single-image reconstruction. Arched and bay structural openings are not advertised as implemented.

## Application behaviour

- House-wide and individual room choices persist through the production API schema. Existing projects receive neutral, backwards-compatible defaults.
- Three timber door treatments and three full-size wardrobe treatments, including sliding and mirror-panel variants. Doors use real hinges or tracks.
- Wardrobes are fitted to continuous solid walls with clearance to beds and entrances. Private dressing areas can hold wardrobes where the bedroom wall cannot. An unavailable fit produces a visible review warning.
- Bedsides use measured footprints; smaller bedside units are used where larger ones cannot fit. Lamps and original framed botanical art add detail without unlicensed images.
- Closed loft storage, kitchen upper cabinets, open shelves with containers, split AC units and animated ceiling fans. AC/fan choices are editable per room. Wet rooms default to privacy ventilation, without an AC or ceiling fan; a customer override is a visual provision requiring an appropriate technical specification.
- Kitchen cabinet placement reserves the chimney, fridge and real window openings. A measured appliance column replaces the fridge formerly placed near the open entrance. Wall art reserves the complete TV display unit.
- Neutral, Hindu, Christian, Muslim and customer-defined prayer fittings. Religious symbols are selected explicitly. Dedicated room, wall shelves or full-height floor-standing cabinet. Cabinet/shelf modes use living space and remove the automatic prayer room.
- Integrated washing avoids a basin-only room. A dedicated laundry is generated only when washing is selected and the dedicated-laundry option is chosen.
- Open kitchen mode puts kitchen and dining together and cuts a real broad opening; a locked programme that prevents this remains a conflict.
- Automatic upper lounge depth is limited to 17 ft; excess front area becomes an accessible terrace. Locked exact room sizes remain unchanged.
- Main furnishings, joinery and bedsides share measured placements with the furnished 2D plan. High wall fittings are omitted from the top-down plan to keep it legible.
- Storage doors, fans and AC have first-person interaction targets. The existing unfurnished mode retains fixed joinery and service fittings while hiding loose decor.
- All new objects remain part of the metric GLB export and the existing render scene, with texture, shadow and reflection support.

## Scope

The live interactive scene uses physically based materials and local reflections. Adding these assets does not turn it into a fully path-traced photograph. The separate optional Blender renderer remains the path to final presentation renders; no paid rendering or AI request is needed for these changes.

Window opening fractions are explicit assumptions (sliding 45%, louvres 65%, casements 85%). Sizing accounts for the selected type; constraints are not waived when a type cannot provide enough opening. Product shop drawings and actual free area must be checked for construction. Existing Tamil Nadu review limitations remain applicable.

All new geometry and botanical art are original project assets, reusable within this application. Existing third-party asset licences are unchanged.


Verification: 88 application tests, 7 Python worker tests, production typecheck/build, API save/readback and browser captures. Browser screenshots are held locally under exports/fitout-review; they are fictional QA projects.
