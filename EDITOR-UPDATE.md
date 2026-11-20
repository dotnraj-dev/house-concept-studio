# 2D plan editor update

The 2D plan is the editing surface for rooms, openings, primary furniture, generated fitout items, added objects, and service markers. The 3D viewer and plan derive from the same generated plan plus saved editor overrides. All model coordinates remain in feet. The existing design brief and room requests remain the source for generated defaults.

## Model and persistence

- `src/editor-model.ts` stores explicit room, door, window, and object overrides under `requirements.design.editor`. Each entry retains a stable ID and an undoable before/after snapshot. Additions, removals, moves, resizes, room type/name/floor changes, bathroom attachments, and object rotations are recorded. Primary sofa, rug, table, chair, TV, bed, and plant IDs are derived from the permanent room ID; their transforms can be overridden independently.
- Projects without editor data migrate to an empty version 1 edit set when loaded. The existing saved design fields remain intact. Edits pass the project schema and survive JSON save/load and plan regeneration.
- `src/plan.ts` applies the overrides after each generated plan. `src/house3d/layout-v2.ts` rebuilds walls and openings from the edited rooms and applies door/window overrides. The fitout and scene use object overrides. A regenerated default can still change identity if its underlying room topology changes enough to rename a generated opening; custom added IDs remain stable.
- The functions in `src/editor-model.ts` are the editing API for UI clicks and future AI commands. The action layer checks finite measurements, positive sizes, floor existence, and valid bathroom/bedroom pairing. Spatial conflicts are reported as review warnings rather than silently changed.

## Controls

The 2D toolbar has Add room, Undo, and Redo. Add room offers the requested room types, placement in a free area, or a click position on the plan. Rooms drag on a 3 inch grid with nearby edge snapping, eight resize handles, live feet and square feet labels, arrow nudging, and Shift selection. Dragging a bathroom against a bedroom attaches it; dragging away detaches it. The inspector edits room name/type/floor, attachment, openings, furniture/decor, and selected object rotation or removal. Doors and windows drag along walls; the inspector changes widths and door swing. Floor switching uses the shared Select. Ctrl+Z and Ctrl+Shift+Z operate the edit history. History is listed in the inspector.

The canvas uses pointer events and larger handles on coarse pointer devices. Touch uses a 450 ms long press for room selection and drag; pen input selects directly. The phone plan has a larger scrollable drawing and a Pan plan/Edit plan switch for finger panning. Emulated tablet long press and room drag, pen selection, and phone panning passed browser checks. Physical iPad, phone, and Pencil devices were not tested. Shift-selected rooms can move together in one undoable edit.

## Live review and known limits

After edits, the plan reruns Tamil Nadu review and reports small rooms, footprint bounds, overlaps, possible disconnection, object/wall crossing, and overridable Vastu preferences. Warnings appear on rooms and in the rules dock. The checks are preliminary. Furniture-to-furniture and door-swing clearance are not comprehensively solved for arbitrary edits. The editor does not silently resolve room conflicts. A bathroom placed against a bedroom gets an attachment relationship; a door requires a usable shared wall in the generated layout. A manual attachment selected for distant rooms can therefore remain a connectivity warning.

Generated furniture remains partly driven by room type and the brief. The editor now gives primary living, dining, and bedroom furniture stable IDs and direct move/rotate/remove overrides, alongside fitout and decor objects. Kitchen joinery, bath fixtures, some small accessories, and stair details are not yet independent transformable objects. Automatic room furniture may need further fitting after aggressive room changes. Opening moves are limited to exterior walls of the same room. Service marker movement is persisted; service creation and removal remain in the brief workflow. The 3D and 2D selection IDs are shared where model objects expose selection metadata.

## Verification

- `npm test`: 121 tests passed, including action, undo/redo, grouped movement, migration, persistence, furniture identity, and bathroom attachment tests.
- `npm run build`: passed.
- `node scripts/verify-editor.cjs`: browser flow for add/delete pooja, resize bedroom, attach/detach bathroom, move window to another wall, move painting, and move sofa. Matched 2D, front, cutaway, and Living room Walk captures accompany the assertions and coordinates in `docs/screenshots/editor/browser-checks.json`.
- `node scripts/verify-editor-touch.cjs`: emulated tablet long press and room drag, pen selection, plus phone plan panning. Screenshots are in `docs/screenshots/editor/`.
- Actual browser screenshots and the reference comparison are in `docs/screenshots/editor/comparison.md`. The tests do not establish visual reference quality.

No commit or push was made. The external runner owns those steps for this environment.


