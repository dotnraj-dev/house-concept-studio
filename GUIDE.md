# House Concept Studio — build and operation guide

This checkout is the working Windows application at `D:\HouseConceptStudio`. It uses React, TypeScript, SVG, Three.js, Fastify and PostgreSQL. The core workflow needs no AI key and no Docker.

## Start on this computer

```powershell
cd D:\HouseConceptStudio
powershell -ExecutionPolicy Bypass -File .\scripts\start-local.ps1
```

Open **http://127.0.0.1:5173/**. Use the existing administrator account configured in your local `.env`. Change its password under My account. Credentials are deliberately excluded from this guide and source archives.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-local.ps1
```

The start script opens background processes without a visible command window. It records the process ID and creation time before the stop script can stop that process tree. PostgreSQL uses this project's `.local_pg` cluster on port 5434; it does not stop the separate PostgreSQL service on port 5432. Logs are `.local-app.stdout.log`, `.local-app.stderr.log` and `.local-postgres.log`. Keep the database log outside the cluster directory.

For a foreground developer session, start the project database and run `npm run dev`. Stop that session with Ctrl+C. A managed start script cannot stop an unrelated terminal session.

## Customer meeting workflow

1. **Create a concept.** Capture the customer, household, language, site address, authority and budget.
2. **Define the plot.** Choose a rectangle or measured polygon. Edit/drag corners; give every edge its own setback and road flag. Upload a survey image as a tracing reference. North remains up on the drawing.
3. **Set floors.** Enter the total number of levels including ground. Use automatic room distribution or specify each floor's bedrooms, bathrooms, kitchen, lounge, rental use and future provision.
4. **Shape the rooms.** Start with automatic sizing. Customise individual generated rooms with a name, preferred/exact size, zone, furniture/cooking facing and toilet style. Resolve fit warnings and conflicts before treating a plan as reviewed.
5. **Specify entrances and Vastu.** House orientation, road direction, outer entrance and main-door direction are separate. Enable a foyer for a two-stage entrance. Strict and semi Vastu use the customer's entered instructions; no universal direction rules are silently assumed. None skips those Vastu instructions.
6. **Place services.** Choose the riser side, working clearance and sewer/septic destination. Add and drag storage, sump, pump, septic, borewell, sewer or rainwater markers. Set each equipment level and capacity. The same routes can be shown in 2D and 3D.
7. **Choose the presentation.** Set wall/floor materials and a flat or pitched roof. Furnished mode shows loose furniture and decor. The unfurnished view retains fixed kitchen and bathroom fittings.
8. **Review the 2D plan.** Select rooms, inspect dimensions, compare three layout variants and adjust the west-wing width. Furniture, windows and door swings follow the same layout used by the 3D scene. Download a plan as SVG.
9. **Show the house.** All levels share one scene. Use Exterior, All floors, Guided tour or Walk inside. WASD/mouse move/look, Shift sprints, Space jumps, C crouches, E interacts, Esc releases the mouse. Open doors/cabinets, switch the TV/chimney, sit on the sofa, and inspect a window view. Stairs can be walked or used as a floor shortcut; the floor selector reaches every level.
10. **Prepare the quotation.** Set the company construction rate or a project override. Enclosed areas are counted once per floor; portico uses an explicit billing factor. Interiors and other extras remain itemised, with included items excluded from double billing. Apply discount and tax, then print/save the complete proposal as PDF.

Admin creates employees and enables each feature under Team & permissions. Service editing, quote editing, rendering and provider credentials have server checks as well as interface controls. Only admin can store/remove/test provider credentials. Basic editing permissions are also needed to persist edited project data.

## Form, paragraph and voice

- The form is the authoritative record.
- **Read details (free)** recognises common plot sizes, room counts, G+N, directions, two entrances, a hall size and some style requests. Every suggestion needs an individual accept/dismiss decision. Unrecognised text stays in the saved paragraph.
- **Read with AI (paid)** uses the configured text model for more flexible language. AI output remains a suggestion and is validated before application.
- Voice recording works before keys are configured. Record up to three minutes, replay/download the audio, or paste a transcript. Audio remains in browser memory unless downloaded or deliberately sent for paid transcription. The saved transcript is editable. Language support and measurement accuracy depend on the speech model.

## Optional AI and GPU settings

Under Settings, admin can enter the OpenAI key, text model ID and transcription model ID. No source edit is necessary. Keys are encrypted with AES-256-GCM in PostgreSQL and are never returned in API responses. A blank key field keeps the existing credential; Remove deletes the stored configuration. Environment credentials, if supplied, remain a fallback.

`CREDENTIAL_ENCRYPTION_KEY` may contain a base64-encoded 32-byte key. Otherwise the server generates `.secrets/credentials.key`. **Back up that key with the database.** Losing it makes the stored provider credentials unreadable. The app works without either provider configured.

### Exact-scene Blender rendering

**Direct GPU rentals:** Settings now includes **Rented GPU** as an alternative to RunPod serverless. Follow [GPU-SETUP.md](GPU-SETUP.md) for a private SSH tunnel, worker token, connection test, output profiles, status, cancellation and rental cost estimates. This option can send scenes directly from localhost without a VPS or public application URL. The app never provisions or stops a paid instance automatically.

The viewer includes a detailed, locally bundled Poly Haven sofa and dining chair with 2K embedded PBR textures. Both are CC0; sources and licences are in `public/assets/quality/manifest.json` and `LICENSE.txt`. Admin uploads still override their categories. These two models improve furnishing detail but do not certify photorealism across every room.

Download 3D exports the current scene as a self-contained GLB. A Blender Cycles worker can render that same geometry with denoising, multiple light bounces, HDR daylight and PBR materials. An AI image service is not used to invent or alter the floor plan.

For RunPod:

1. Deploy the supplied `renderer/worker.py` and `renderer/render.py` on a queue-based Serverless endpoint. `renderer/Dockerfile` is an optional **cloud worker** container; the application and VPS do not require Docker.
2. Set the worker environment `SCENE_ALLOWED_HOST` to the exact application hostname, e.g. `studio.example.com`. The application must be reachable over HTTPS. Workers reject other hosts and redirects with scene credentials.
3. In app Settings, save the RunPod API key, endpoint ID and public application URL. A raw rented GPU or a model endpoint is insufficient: this worker must be running there.
4. Position the 3D camera, open High-quality still renders, choose samples and explicitly submit a paid render. One project can have one active job. Submission is not automatically retried after an uncertain response.
5. Progress and cancellation appear in the application. The server also polls in the background, so a closed browser does not prevent result retrieval. Completed PNGs are stored locally under `render-output` and require login to download.

Scene inputs use short-lived bearer access and expire after two hours. Inputs are limited to 50 MB; linked external textures are rejected. A render has a ten-minute worker limit. Failed/cancelled jobs may still consume provider time. These safeguards are not a guaranteed rupee spending ceiling. Set provider-side worker and spending limits too.

For a local render, install Blender 4.5 LTS or newer, download the GLB and supply an options JSON containing the camera pose, width and samples:

```powershell
blender --background --python renderer/render.py -- house.glb options.json house.png
```

The camera pose is Three.js Y-up coordinates; the script converts it to Blender coordinates and converts application feet to metres. It uses a supported GPU when available and otherwise CPU. A portable Blender 4.5.16 copy used for verification exists under ignored `.work/blender` on this computer; it is not part of the deliverable archive.

The live RunPod submission and real AI services still need account-specific verification after you configure them. A local Blender fixture has been rendered successfully; that does not establish a photorealism guarantee for every generated house or asset.

## Native Linux VPS deployment

Use Node.js 22+ (this build was tested with Node 24), PostgreSQL, Caddy and systemd. A GPU is unnecessary for hosting the application; external GPU workers are optional for still renders.

1. Create a dedicated `house-studio` Linux account and a PostgreSQL database/user with a strong password. Keep PostgreSQL private.
2. Copy the project to `/opt/house-studio`, run `npm ci`, create `.env` from `.env.example`, and set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `NODE_ENV=production`. The admin password must have at least 12 characters. Do not enable `VITE_DEMO_MODE`.
3. Run `npm run build`. Create `uploads`, `render-output` and `.secrets`, owned by `house-studio`. Protect `.env` and `.secrets` with owner-only access.
4. Install `deploy/house-studio.service` in `/etc/systemd/system/`. Update `/usr/bin/node` if your Node installation uses another location, then enable/start the service.
5. Use `deploy/Caddyfile`, replace the example hostname and point DNS at the VPS. Caddy forwards HTTPS to the application on port 3001. Expose ports 80/443; keep port 3001 private with the VPS firewall.
6. Verify login, saving, file uploads, browser 3D and printing on the deployed domain. Configure provider credentials only when needed.

Production cookies require HTTPS. All app data is in PostgreSQL; uploaded models, renders and the encryption key are separate files. `scripts/backup-native.sh` uses a `DATABASE_URL` supplied in the backup process environment and exports both the database and private files. Copy backups off the VPS and test restoration. The original Docker deployment files remain optional.

## Assets and research

The archive includes all 150 downloaded CC0 GLBs and local Poly Haven PBR/HDR maps. Their manifest, individual source/licence metadata and `public/assets/materials/LICENSE.md` remain included. Original rounded sofa, bed, dining and ceramic fitting geometry is generated in `src/house3d/builtins.ts`; it can be reused and exported without per-house asset charges. Purchased GLBs can replace categories through Asset library; record the licence and source. Custom opening animations require appropriate hinges in uploaded models.

The initial Indian-home library contains 16 source records, nine regional references and 16 customer-request patterns, with Tamil Nadu emphasis. It is searchable under Style & materials. Its sources, review date and limitations are retained in `src/data/indian-homes.json`. References guide the brief; selecting a regional label does not guarantee a historically complete regional design.

## Practical limits

- The planner fits a conservative orthogonal building footprint within an irregular surveyed polygon. It does not optimise every wedge into a bespoke non-orthogonal house.
- Layouts use a passage and room wings. Difficult combinations can remain unresolved; the application flags them rather than falsely reporting success. The example north outer entrance / east main door is supported. Other combinations must pass the actual door/access checks.
- Concept grid room sizes include wall zones. They are not verified finished internal construction dimensions.
- Services show conceptual equipment positions and pipe routes. They do not calculate hydraulic pressure, pipe diameters, slopes, structural supports, sewage treatment or statutory clearances.
- Roof overhangs, facade projections, setbacks, building height, stairs, accessibility, fire provisions and structure require site-specific professional review. No legal-compliance certificate is generated.
- Multiple floors are supported up to a resource guard of 100 levels; very large room programmes are rejected. Rental/future flags record intended use. Rental units currently share the stair core and need access/separation review.
- PBR textures, lighting and rounded furniture improve presentation. The bundled library includes simple models, so the supplied reference photographs cannot be promised for every interactive view. High-quality models, detailed design and render review determine the final result.

## Verification commands

```text
npm test
npm run build
npm run verify:assets
npm run smoke:local
node --env-file=.env --import tsx scripts/v2-smoke.ts
```

The smoke scripts create and remove temporary accounts/projects. The v2 script temporarily stores a fake provider key, checks encryption/masking and restores the prior encrypted configuration; it makes no paid provider calls.

Reference documentation: [RunPod queue requests](https://docs.runpod.io/serverless/endpoints/send-requests), [Blender glTF](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html), [Blender 4.5 release files](https://download.blender.org/release/Blender4.5/).
