# B3 2D editor screenshot comparison

The screenshots show the same saved 30 × 50 ft G+1 demo project, ground floor, north up, at a 1440 × 900 browser viewport. The plan uses its default Fit view in both captures. The expanded toolstrip changes the available canvas height slightly, so the plan shifts a few pixels and its displayed zoom rounds to 47% in both.

- [Before editor](before-editor.png): furnished rooms are visible, but room dimensions are small or obscured by furniture; there are no Adapt plan or Move furniture controls and no PNG export.
- [After editor](after-editor.png): room names and feet/inches dimensions sit on light chips above the furniture. The Adapt plan and Move furniture states are visible in the toolstrip, with SVG and PNG downloads.
- [After selection](after-selected.png): selected passage shows eight resize handles and an editable width in the Inspector. This is an interaction view, not a matched before/after camera pair.

The primary plan references are [plan-01-cutaway.png](../../references/plan-01-cutaway.png) and [plan-02-cutaway-4bhk.png](../../references/plan-02-cutaway-4bhk.png). The labels now make room use easier to read, but the browser plan remains a flat diagram. It still lacks the reference images' cutaway depth, contact shadows, wall thickness, and detailed furniture presentation. No Pixabay element reference was used for this editor task.

The browser 3D house was not visually changed in this pass. A matched browser 3D before/after pair was not captured before editing, so this report makes no claim that the 3D scene matches the references. The geometry changes made *through* the editor still require project-specific 3D review.

Functional checks are recorded separately in [B3-UPDATE.md](../../../B3-UPDATE.md).
