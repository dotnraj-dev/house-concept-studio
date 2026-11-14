# House Concept Studio — implementation report

**Date:** 13 November 2026. **Project:** `D:\HouseConceptStudio`.

The expanded application has been implemented and built locally. The local app is available at **http://127.0.0.1:5173/** using the existing admin account. The source archive excludes customer data, actual credentials, the database, uploads and the temporary Blender installation.

## Implemented

| Area | Delivered behaviour |
|---|---|
| Customer discovery | Guided customer-first brief; household, address, authority, budget and language |
| Plot | Rectangular or multi-sided surveyed geometry, editable/dragged corners, survey-image reference and separate setbacks on every edge |
| Floors and rooms | Multiple levels, automatic or individual floor programmes, room names, preferred/exact concept sizes and placement requests |
| Indian preferences | Strict/semi/none Vastu; explicit customer rules; separate sofa, cooking, deity and worshipper directions; conflicts displayed |
| Entrances | Independent road, house, outer-entry and main-door directions; two-stage foyer; tested north outer / east main-door arrangement |
| Services | Movable equipment, tank level/capacity, riser side, access-clearance warnings and conceptual supply/waste/rain routes in 2D/3D |
| 2D | Furniture, finishes, measured rooms, windows and matching door swings; per-floor SVG downloads |
| 3D | Stacked floors, PBR materials, daylight/shadows, rounded original furniture, exterior/cutaway, guided tour, first-person controls and interactions |
| Interior toggle | Loose furniture/decor hidden while fixed kitchen and bathroom fittings remain |
| Quotation | Company/project ₹/sq ft rate, per-floor areas, portico factor, separately itemised extras/interiors, discount/tax, future-floor exclusions and PDF printing |
| Intake | Keyless paragraph reader with reviewed suggestions; audio recording/replay/download; optional paid multilingual transcription/AI extraction |
| Administration | Employee accounts, feature toggles, password changes, project autosave and GLB uploads with licence records |
| Provider settings | Admin-only encrypted key storage; model/endpoint configuration; connection testing and removal; masked responses |
| Rendering | GLB export and optional asynchronous RunPod Blender jobs, progress/cancellation, background retrieval and private PNG storage |
| Operations | Native Windows start/stop scripts, native Linux systemd/Caddy deployment examples and backup instructions |
| Research | Searchable initial Indian-home reference library with 16 sources, nine regional references and 16 request patterns |

All 150 bundled free GLB files and local PBR/HDR material files are retained. Purchased models can be added later. Original rounded furniture is generated locally, with no per-house generation charge.

## Verification completed

- **36 automated tests passed**, covering geometry, setbacks, room fit, multiple floors, non-overlapping rooms, entrances, furniture clearance, rotated stair walking, Vastu constraints, services, quotations, input validation, original meshes, credentials and render input safety.
- **Production build passed:** TypeScript, Vite frontend and bundled Fastify server.
- **Asset verification passed:** 150 CC0 GLBs and their catalogue references.
- **Database smoke tests passed:** admin login, project create/edit, employee accounts and live permission changes.
- **Expanded API tests passed:** four-floor persistence, two-door brief, local extraction, invalid input, restricted service/quote/render operations, encrypted fake-key save/removal, masked responses and development secret-file blocking. The prior provider configuration was restored.
- **Production HTTP smoke passed:** compiled page/chunks, HDR/PBR/GLB delivery, secure cookies, authenticated API routes and origin checks.
- **Local Blender 4.5.16 test passed:** textured GLB fixture imported, unit/camera conversion completed, Cycles PNG and Blender scene saved. A 640×360, 32-sample verification render took about 20 seconds of reported render time on this machine. This timing is not a cloud cost estimate or a 1080p performance promise.
- **Managed start/stop passed:** the local web/API and project PostgreSQL cluster stopped and restarted; the separate PostgreSQL installation was not stopped.

The build reports large frontend chunks and upstream Zod annotation warnings. The build completes; 3D code is loaded separately. These are not failed tests, but loading on slower client devices still needs browser measurement.

**No paid AI or cloud GPU requests were made.** Provider credentials were not required to build or test the core application.

## Remaining validation and practical limits

1. **Browser walkthrough validation remains pending.** Automatic approval review previously rejected opening the local app in the browser. It was not bypassed with another browser or automation route. Compilation, HTTP, data/geometry tests and local Blender output do not establish that every browser interaction has been visually checked.
2. **Live AI and RunPod calls remain unverified.** Enter your credentials in Settings and deploy the supplied Blender worker. RunPod also needs a reachable HTTPS application URL; a key alone cannot make a GPU reach a localhost-only server. The worker container has not been built/deployed to a cloud account in this session.
3. **Reference-photo quality is not guaranteed.** Materials, shadows and rounded models improve the scene, but parts of the free asset library remain simple. Full photorealism depends on detailed models, composition, lighting and render review. The Blender verification image is a fixture, not a screenshot or quality certification of every application scene.
4. **This is a concept generator.** It fits an orthogonal footprint inside irregular land, uses a passage/room-wing planner, and flags combinations it cannot resolve. Room dimensions include concept wall zones. It does not produce certified construction, structural or hydraulic drawings, or a legal/Vastu-compliance certificate.
5. **Rental/future intent requires design review.** Rental levels currently use the shared stair core. Future floor construction is excluded from the immediate quote; structural provision can be added as a separate extra. The interactive resource guard is 100 levels and a bounded room programme.
6. **Plumbing is conceptual.** Equipment positions, pipe routes and working-space warnings are visible. Pipe sizing, gravity falls, pressure, containment, sanitation and final access require professional design.

Read **GUIDE.md** for the exact workflow, startup commands, key configuration, native VPS deployment, backups and operational limits.
