# B3 2D editor update

## Changes

- All editor room moves, multi-room moves, resizes, additions, and quarter-foot nudges are confined to the buildable footprint. Bathroom attachment discards out-of-bounds candidates. Openings are checked against their room walls, and furniture edits are clamped to their owning room. Removing a room also removes its explicit objects and openings in the same undo step.
- Selected rooms show editable width and depth in feet at 0.25 ft steps. Handle drags keep a live feet/inches dimension chip on the plan.
- **Adapt plan** starts on. A changed edge adjusts rooms that share that edge, then rejects any increased overlap or a room below 1 ft with a clear message. The room and its adjusted neighbours are committed together; the latest change names the affected rooms. Turning it off edits only the selected room.
- Room rotation is a 90° action in the toolstrip, Inspector, and R key. It swaps width and depth, fits the room in the footprint, turns room furniture and openings, and is undoable. A room's door side can also be selected directly in the Inspector.
- **Move furniture** starts off. Furniture ignores pointer input while locked, so room clicks and drags select the room. Unlocking allows furniture selection, drag, rotation, and deletion. Both editor toggles are saved per project and undoable.
- Names and dimensions draw above furniture on light background chips, positioned toward available space. SVG and PNG downloads serialize a clean plan without room selection strokes, handles, or orange opening highlights.

## Verification

- `npm test`: 137 tests passed, including model regressions for the bathroom drag, setback limits, adaptation and undo, furniture, room rotation, door side, opening containment, and preference persistence.
- `npm run build`: passed.
- `node node_modules/@playwright/test/cli.js test e2e/editor-b3.spec.ts --reporter=line`: 9 browser cases passed across desktop, iPad, and phone. The iPad case dispatches touch events through Chrome DevTools and checks a live dimension label during handle resizing. Browser download checks inspect the SVG content and receive a PNG.
- Visual evidence and honest comparison: [docs/screenshots/2d-editor-b3/comparison.md](docs/screenshots/2d-editor-b3/comparison.md).

## Limits

The adaptation uses shared edges of rectangular rooms. If a move or resize needs a more complex replan, it is refused and reports why. Turning Adapt plan off retains the existing single-room behavior, including the possibility of overlap with another room; the setback boundary and furniture containment still apply. The plan images remain a 2D diagram and are not proof of 3D realism. A matched browser 3D before/after pair was not available for this pass.
