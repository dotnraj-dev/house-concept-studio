> Historical verification record. The free deployment subsequently went live on 14 November 2026 at https://house-concept-studio-test.onrender.com. See DEPLOYMENT.md and REGIONAL-DESIGN-UPDATE.md for the latest status.

# Core 3D and staging verification — 14 November 2026

## Implemented

- Actual animated door leaves remain solid and can be targeted after opening.
- Stair movement rejects unsafe positions instead of inventing a flat floor.
- Furniture, vehicles, plants, kitchen counters and portico columns participate
  in movement collision using their rendered world bounds. Seated viewpoints
  can leave an object without moving deeper through it. Low objects can be jumped.
- Furnished plan and scene share the sofa, rug, coffee table, bed and dining
  footprints. Bedroom beds use more realistic dimensions within the room.
- Added original reusable round coffee-table and plant geometry, entrance canopy,
  window sunshades/sills and facade bands tied to the actual openings. Added living
  space light shadows and reduced the previous washed-out exposure.
- GLB export creates an isolated metre-scale scene, preserves the live viewer,
  removes invisible interaction volumes, shares packed roughness images across
  generated materials and limits texture size. Concurrent exports are prevented
  and a slow export shows a timeout instead of an indefinitely busy download.
- Render workers read explicit metre geometry and camera metadata and continue
  accepting older feet exports. Copy scene_units.py when updating a worker.
- Native Render manifests are prepared for a free test environment and a separate
  paid environment. Production requires a stable encryption key, checks the
  database in its health endpoint and handles shutdown. Uploaded files can use
  PostgreSQL with a bounded test quota, preserving them across free-service restarts.
- A fresh staging database receives a fictional, furnished G+1 showcase.
- Private GitHub repository created and application source pushed. Local .env,
  provider credentials, database, customer projects and generated exports were
  excluded using a clean allowlisted source checkout.

## Passed checks

- **53 TypeScript tests**, including geometry, constraints, stairs in four
  orientations and four storeys, animated door collision, furniture obstacles,
  metric export, facade details and production storage configuration.
- **7 Python worker/unit tests**, including metre/legacy model and camera scales.
- TypeScript, Vite and bundled production API build.
- GitHub Actions on Linux: installation, all tests and production build succeeded.
- Production HTTP smoke: compiled frontend and bundled HDR/PBR/GLB assets, secure
  session cookies, authenticated APIs, error paths and cross-origin rejection.
- Real authenticated asset upload and download through PostgreSQL storage.
  The identical upload survived a full application process restart.
- Disposable storage fixture, preview account and QA project removed afterward.

## Not verified or not complete

- No paid OpenAI or rented-GPU generation was requested. Full AI layout proposal
  and repair remains distinct from the existing requirement-extraction endpoint.
- The complete textured browser export and fresh manual first-person walkthrough
  were not verified: browser access to the local test origin was declined, then
  Computer Use reported a physical Escape stop. Reauthorising Render-only actions
  did not clear the tool's stop state in this turn.
- Reference-photo quality has not been established across the entire generated
  house. The deterministic planner remains constrained; it is not a general
  architectural solver, certified construction drawing or structural design.
- Render account/repository connection was completed by the user, but a running
  Render service has not been created or verified by this update. No live URL
  should be presented until deployment succeeds.
- Existing large frontend bundle and upstream Zod annotation warnings remain.

Repository: https://github.com/dotnraj-dev/house-concept-studio (private).
The prepared deployment uses free plans only. Free PostgreSQL expires 30 days
after creation; export or upgrade before expiry.
