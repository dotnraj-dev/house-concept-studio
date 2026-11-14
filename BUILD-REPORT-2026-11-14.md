# House Concept Studio — GPU-ready update

Project: `D:\HouseConceptStudio`. Date: 14 November 2026.

## Delivered

- Added **Rented GPU** beside OpenAI and RunPod in Settings. The admin saves an encrypted worker token, URL and their actual hourly rental rate. Responses never include the secret.
- Added a portable, authenticated Python HTTP worker for a directly rented NVIDIA GPU. It accepts scenes from the local application through an SSH tunnel, so this workflow does not need a public VPS, public application URL or RunPod API key.
- Added worker identity, Blender installation and GPU visibility checks. Submission refuses a worker without a visible NVIDIA GPU. A real Cycles render is still required to establish driver compatibility.
- Added bounded test, Full HD and 4K render profiles; camera field-of-view export; status polling; PNG download; cancellation; and active-render cost estimates.
- Preserved RunPod serverless support. New database columns migrate existing jobs with the RunPod provider as their default.
- Added per-project and per-worker active-job protection, idempotent job IDs and recovery polling after uncertain submissions. The application does not blindly resubmit a potentially started job.
- Worker cancellation stops its Blender process. Graceful worker shutdown also cancels active work. Neither action terminates a rental or its storage billing.
- Added adaptive sampling, subtle architectural edge bevels and camera field-of-view matching in the Blender renderer. Paid GPU workers refuse CPU fallback instead of silently rendering on CPU.
- Downloaded and checksum-verified two Poly Haven CC0 models: `sofa_03` and `dining_chair_02`. Self-contained GLBs have embedded 2K PBR textures. Source/licence records and actual Blender-rendered thumbnails are bundled locally. Uploaded assets retain priority; dining-chair orientation is corrected for table placement.
- Existing 150 free GLBs, materials, intake, surveyed plots, Vastu requests, entrances, plumbing, quotations and employee feature permissions remain in place.
- Added an offline camera-settings download beside the GLB download.
- OpenAI connection testing now checks access to both selected model IDs without requesting generation. Current defaults were verified against official [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) and [transcription](https://developers.openai.com/api/docs/models/gpt-transcribe) documentation.
- Removed the unstable backend file watcher from the normal development command. Frontend hot reload remains; API code edits require restarting the application.
- Added [GPU-SETUP.md](GPU-SETUP.md), a Windows SSH-tunnel script and a native GPU worker launcher. No application Docker installation is needed.

## Verification completed

- Production build passed: TypeScript, Vite frontend and Fastify bundle. Existing large-chunk and upstream Zod annotation warnings remain.
- **38 TypeScript tests passed**: geometry, circulation, stairs, door clearance, Vastu, services, quotations, credentials, worker URL restrictions and bounded render inputs.
- **5 Python worker tests passed**: authentication, input rejection, idempotency, single active job, result persistence and cancellation of a running Blender process.
- GPU API integration passed with a **simulated local worker**: encrypted configuration, health check, refusal when GPU visibility is absent, upload, duplicate prevention, active-job lock, completion/runtime, authenticated PNG download and cancellation. The script restores prior worker configuration and removes its own project/output files.
- Existing expanded API smoke passed: four-floor project persistence, two-door brief, local extraction, input validation, employee permissions, encrypted/masked credentials and secret-file blocking.
- Production HTTP smoke passed: compiled app/assets, secure cookies, authenticated APIs and origin checks. New GLBs, thumbnails and licence files all returned HTTP 200.
- Validated **152 CC0 GLBs**: the original 150 plus the two detailed models. Detailed models have embedded PBR images and no external buffer links.
- Updated Blender renderer successfully imported and rendered a textured fixture at 640×360, 32 samples, with a two-thread local CPU run reporting about 65 seconds. This is a verification fixture, not a cloud GPU benchmark or production render-time estimate.
- Independently rendered and visually inspected the two new asset thumbnails. These are real renders of the bundled meshes, not generated images.

## Remaining validation

1. **No live AIC, RunPod or paid OpenAI calls were made.** The GPU instance has not been rented, deployed or benchmarked by this update. Configure credentials and follow the setup guide before a paid test.
2. **Browser visual validation is incomplete.** The in-app browser could not connect to localhost. The Windows computer-use tool then stopped because it could not determine the current browser URL confidently enough to enforce its policy. No alternate automation route was used after that restriction.
3. The app is a concept-design application. This update does not certify every generated floor plan or guarantee reference-photo quality across every room. Much of the broader asset catalogue remains simple; full-house composition, material scale and furniture detail need live scene review.
4. Active-render cost is an estimate based on runtime and the entered rate. Rental setup, idle time, rounding, retained storage and taxes not already included in the rate remain separate. There is no guaranteed maximum per-house bill.
5. Worker results/logs remain on the rented machine until maintained or downloaded. A hard worker/host crash can leave work uncertain; check processes before retrying. Always stop the rental in the provider dashboard when finished.

The temporary local test servers and project PostgreSQL cluster are stopped after verification. Start the application with `scripts/start-local.ps1` when required. Existing user data and provider configuration are preserved.
