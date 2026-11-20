# 2D editor visual review

## Evidence

The `before-plan.png` and `before-exterior.png` files were captured from the browser before editor changes. `after-plan.png`, `after-exterior.png`, and `after-add-room-2d.png` / `after-add-room-3d.png` record the initial editor pass. The `scenario-before-*` and `scenario-after-*` pairs use the same demo house, 1440 × 900 viewport, floor, quality setting, lighting preset, and named Front view, Cutaway, or Living room Walk view. The scenario includes a bedroom resize, a bathroom attach and detach, a window moved to another exterior wall, and painting and sofa moves. `scenario-attached-plan.png` records the temporary attachment. The earlier add-room 3D pair was captured during camera animation and is illustrative rather than a matched camera comparison.

The browser action assertions are in `browser-checks.json`. They confirm changed room, window, painting, and sofa coordinates and UI state. `touch-tablet-plan.png`, `touch-phone-plan.png`, and `touch-phone-panned.png` show emulated touch layouts and phone panning. These checks do not prove access, architectural quality, or realism.

## Reference comparison

Primary exterior target: `docs/references/ext-01-contemporary-slats.png`. The edited browser house retains navigable 3D, an entrance, glazing, porch, and planting. Plan edits alter the actual cutaway geometry and window placement. Its silhouette remains a much simpler box than the reference: the deep white roof frame, tall timber slat plane, charcoal panel balance, refined balcony rail, and golden material response are still missing or weak. The editor task did not constitute a facade quality pass.

Primary plan targets: `docs/references/plan-01-cutaway.png` and `docs/references/plan-02-cutaway-4bhk.png`. The 2D plan now exposes selectable rooms, openings, primary furniture, fittings, dimensions, warnings, and transform handles. The larger desktop canvas makes these easier to inspect. The reference cutaways have much clearer furniture scale, wall thickness, contact shadows, and room identity. In the browser plan, text and some furniture still overlap at this zoom, and new room placement can conflict with the starter layout. The conflict remains visible for review rather than being silently resolved.

Primary interior targets: `docs/references/int-01-living-arches.png` and `docs/references/int-03-double-height.png`. Painting and sofa positions changed in the actual model. The matched Walk view shows a detailed TV unit and shelving, but it faces the TV wall and does not show the moved sofa. It is still materially simpler than the references' joinery, furniture layering, surface response, and lighting. No Pixabay detail image was used as a whole-house target in this editor pass.

## Access and limitations

The edited cutaway shows changes to the measured scene. Room overlaps or out-of-footprint edits trigger warnings; the resize sequence intentionally leaves review conflicts. The cutaway screenshot alone cannot prove all doors, paths, furniture clearances, or stairs are usable. The matched Walk room jump establishes that the interior still renders after regeneration; it does not exercise a full walking path. Emulated tablet and phone input passed; phone, iPad, and Apple Pencil behavior was not verified on physical devices. Visual quality remains below the primary references.

Functional checks are recorded separately in `EDITOR-UPDATE.md`.
