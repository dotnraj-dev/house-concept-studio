# Canvas workspace update

Updated 20 November 2026. [Screenshot gallery](docs/screenshots/workspace/index.html) · [Visual comparison](docs/screenshots/workspace/comparison.md) · [Permanent design brief](AGENTS.md).

The project screen now puts the measured house in the centre, with project layers on the left, an Inspector on the right and studies in a collapsible bottom dock. The existing planning algorithm, room programme, floor count, facade recipes, architectural materials and asset library are unchanged. HouseScene changes attach selection/event metadata; selection ink and the site north marker are runtime overlays excluded from GLB.

## Navigation and feature locations

| Existing feature | Location in the workspace |
| --- | --- |
| Project title, autosave, manual save | Top bar. The studio menu returns to All concepts. |
| Guided interview, detailed form, paragraph input, voice and reviewed extraction suggestions | Brief mode. A new/opened project starts with the guided interview; its generation action opens 3D. |
| Customer data, polygon/survey, boundary setbacks and nearby site context | Brief → Form → Customer / Plot & setbacks. Left checklist → Plot and rules opens the plot section and the existing TN site-facts form. |
| Floors/programme, room sizes/customisations, entrances and independent facing choices, Vastu, water/plumbing | The remaining sections of the existing detailed form. Inspector shortcuts open the relevant sections. |
| Architectural style, roof, wall/floor finishes, furniture visibility | Inspector with no selection, or Facade selected. These share the same StyleControls as the detailed form. |
| Prayer options, doors/windows, wardrobes, appliances, storage, room fitouts and Indian home reference library | Inspector → All finishes, furniture & regional references → existing Style & materials form. |
| Concept variants and west-wing proportions | Clear Inspector selection → Starting concept / West wing width. Existing behaviour and permissions are retained. |
| Furnished 2D, room inspection, plumbing overlay, SVG download | 2D mode. Floor selector is on the canvas. The SVG and printable plans carry north roses. |
| Front view, old street-corner preset, walk, guided tour and all-floor cutaway | Floating 3D toolbar. Orbit / select invokes the retained corner preset; Cutaway invokes the aerial/all-floor view. |
| Transparent walls, plumbing, temporary interior preview, lighting, shadows, reflections, surroundings and full screen | 3D toolbar → More viewing tools. Keyboard/touch help is there too. |
| Floor choice and all-floor room/storage/shower jumps | Floating selectors on the canvas. Explicit room/object views take precedence over generic floor navigation. |
| Sun & breeze study, date/time, wind, assumed window state and door opening | Bottom dock → Sun & breeze, using the existing ClimatePanel and overlays. Its toolbar shortcut opens the same dock. |
| Tamil Nadu rule review, missing facts, conflicts and design warnings | Bottom dock → Tamil Nadu rules; edit inputs through Plot and rules. These remain preliminary checks. |
| Construction rate, scope, interiors/extras, tax, discount and quote | Proposal mode or bottom dock → Quote, reusing QuotePanel. Review status stays in Proposal. |
| Presentation render connections/jobs, paid submission/cancellation | Bottom dock → Presentation renders, reusing RenderPanel. Connection and permission checks remain in place. |
| GLB and camera JSON download, proposal PDF/print | Top bar → Export. GLB/camera downloads also remain under More viewing tools; SVG stays in 2D. |
| Bundled/custom assets, GLB uploads, reference-image search | Studio menu → Asset library & references. |
| Company settings, API/GPU connections, admin team permissions, password/account | Studio menu → Settings & API connections / Team & access / My account. The original account pages remain. |

The left checklist marks recorded milestones, not architectural approval: customer name recorded; surveyed plot plus road measurement recorded; valid concept viewed; proposal status marked reviewed. Outstanding technical checks stay visible in the rules dock.

## Selection, panels and presentation

One Selection state in Workspace drives the tree, 2D selection, physical 3D picking and Inspector. Rooms have subtle floor/outline highlights; floors, facade and site have their own Inspector summaries. Interactive furniture keeps its existing click/E actions while selecting its associated item/room.

The 3D canvas stays loaded after the first visit. Other modes hide it, stop its render loop and remove walking input listeners. Returning from 2D reuses the camera and renderer. This saves a scene reload at the cost of retaining GPU/asset memory until leaving the project. A changed confirmed plan returns the camera to Front view; obsolete room/floor selections are cleared.

At 1280px and above the layout has three columns. At 768–1279px the side panels are drawers over a full-width canvas; below 768px Inspector is a bottom sheet and modes use a compact select. Panel widths, dock height, phone sheet height and desktop collapsed state are stored per viewport class in this browser's localStorage, with bounded values and try/catch fallbacks. They are device/browser preferences, not project data. Pointer and keyboard resize handles, drawer focus trapping, Escape dismissal, safe-area padding and dynamic viewport height are included.

Present hides both panels, dock, quality/editing controls and walking HUD. It retains the actual house, Front view, guided tour, room jump, compass and a large exit button. New add/drag/resize/attach-bath editing is deliberately absent; disabled 2D toolbar positions and an Inspector slot reserve its place for the next task.

## Verified north convention

This was checked against planner-v2 zoneMatches/final coordinates, layout-v2 wall normals/entrancePose and climate.sunPosition, rather than inferred from the camera.

- Plan +x is east and +y is south: north is up in the SVG.
- Scene +X is east, +Z is south, +Y is up. True north is −Z.
- houseFacing and roadSide arrange the programme/choose elevations in that fixed geographical frame. They do not redefine north. Main-door and outer-door facing remain independent.
- The sun study emits [east, up, −north] using the project coordinates (or its labelled Chennai default).
- Camera heading is atan2(forward.x, −forward.z), clockwise from north. The compass rose rotates by the opposite heading. A person outside a north-facing door looking into the house faces south; looking outward through that door faces north.

The 2D rose includes cardinal letters and intermediate ticks, with an embedded SVG counterpart for downloads/print. Overview, walk and Present retain the live compass; a subtle directional marker is drawn on the site ground. Touch walking uses a movement joystick, native pointer drag-to-look, jump/crouch/interact buttons and no pointer lock. Desktop WASD/mouse/Shift/Space/C/E remain.

The browser orbit test measured 89.7° for a requested quarter turn. Walk readouts were N 0.1°, E 90.0°, S 179.9°, W 269.9°. Four-facing generated-entrance unit checks also pass. The compass uses monotonic wall-clock timing because the rendering clock resets when changing between idle and continuous rendering.

## Quality and measured performance

| Level | Maximum DPR | Contact SSAO | Live reflections | Sun shadow map | Distant detail |
| --- | ---: | --- | --- | ---: | --- |
| High | 1.7 | On, user switchable | On, user switchable | 2048 | Shown |
| Balanced | 1.0 | Off | Off | 1024 | Shown |
| Low | 0.75 | Off | Off | 512 | Hidden |

The effective DPR is also capped by the device DPR. Balanced/Low reuse static overview shadow maps after animations settle; walking/tours keep live maps. Changes to doors, scene layout, cutaway, lighting or study inputs refresh the cache. Browser quality does not remove distant meshes from the GLB export.

Auto warms up after loading, samples two 2.4-second rendered windows and steps down for sustained results below 40fps. Idle demand-rendered gaps and hidden tabs are excluded. Manual choice is remembered per viewport class. The displayed fps is the most recent sample, not a guaranteed continuous rate.

The actual development renderer was AMD Radeon integrated graphics through ANGLE/D3D11. At the same 709 × 603 CSS canvas and saved street camera, this session measured **High 10.5fps → Auto/Low 15.3fps** in six-second continuous probes. The original pre-change capture recorded 18.5fps on 15 November; that earlier session is retained as evidence, not a claim of a cross-session speedup. The larger new workspace recorded a 14.3fps Auto probe starting at Balanced, during which Auto may continue stepping down.

**The 40fps target is not achieved on this development machine.** This scene remains expensive, particularly while walking with live lights/shadows. Quality fallback improves cost but cannot guarantee smooth performance on weak hardware or larger plans. Further batching/scene optimisation is separate work; this UI task does not silently simplify the house.

## Validation and limits

- npm test: **103 passed**. npm run build: passed; the existing large-chunk warning remains.
- Actual demo-browser captures cover desktop 1440×900 (Brief, selected 3D, 2D, Present, walk), iPad 1180×820 and 820×1180 (drawer and joystick walk), and phone 390×844 (Inspector sheet). No horizontal page overflow was observed in those captures.
- [verification.json](docs/screenshots/workspace/verification.json): quarter-turn orbit, four walk headings, actual joystick camera movement, panel persistence and viewport records.
- [controls-verification.json](docs/screenshots/workspace/controls-verification.json): retained renderer/camera, physical 3D picking shared with the tree/Inspector, room-jump preservation, climate/quote/rules locations, quality persistence, touch look/crouch without pointer lock and print compass.
- [glb-verification.json](docs/screenshots/workspace/glb-verification.json): actual downloaded GLB, embedded textures, metric export boundary and excluded runtime overlays. The download is approximately 31.47MiB; raw GLB/camera files stay under ignored exports/workspace/.
- No API key or rented GPU was needed. No paid AI/render job was submitted. Blender was not run.
- Tablet/phone checks are Chromium viewport/touch emulation on this laptop. Physical iPad Safari, real phone memory limits and TV hardware were not tested. A retained scene consumes memory even when paused.
- House realism, circulation and material/detail gaps against the references remain. This pass changes the workspace and navigation, not those architectural results.

Reproduce with VITE_DEMO_MODE=true on localhost, then node scripts/capture-workspace.cjs, node scripts/verify-workspace-controls.cjs and python scripts/inspect-workspace-glb.py. The capture script also supports --touch-only to refresh device shots while preserving the desktop performance/compass record. Historical facade capture scripts target the former navigation; use the current mode/Inspector selectors for new captures.

Existing architecture evidence remains in [FACADE-PASS-2.md](FACADE-PASS-2.md), [FACADE-KIT-UPDATE.md](FACADE-KIT-UPDATE.md), [FURNISHING-UPDATE.md](FURNISHING-UPDATE.md) and [TAMIL-NADU-RULES.md](TAMIL-NADU-RULES.md).
