# Connect a rented GPU to the local application

Use **Rented GPU** in Settings for AIC, RunPod Pods, or another rental with direct SSH access. This connection does not provision, pay for or stop a rental. No public VPS or AI API key is required for this path.

## 1. Prepare before launching the paid instance

Have these files ready: `renderer/http_worker.py`, `renderer/render.py`, `renderer/scene_units.py`, `renderer/start-http-worker.sh`. Keep these worker files at the same version as the application. New model and camera exports use metres; the worker also supports old feet exports. Use an NVIDIA instance with enough VRAM for the scene; the selected 24 GB RTX 4090 is a useful starting point. Check the final rate including disk and GST on the provider checkout. We have not yet benchmarked a live rented GPU.

## 2. Prepare the GPU machine

Use the provider's SSH instructions. Copy the three files into a directory such as `/workspace/house-worker` using SCP or its file browser. This directory must be private to your rental.

Install Blender 4.5 LTS from [Blender's official release directory](https://download.blender.org/release/Blender4.5/), extract it, and set `BLENDER_BIN` to the full executable path. Python 3 and NVIDIA drivers must already be available. Blender on minimal Ubuntu may require `libgl1`, `libxi6`, `libxrender1`, `libxkbcommon0`, `libsm6` and `libxxf86vm1`; install missing runtime libraries using the instance package manager. The application does not require Docker.

In the worker directory, run:

```bash
export BLENDER_BIN=/opt/blender/blender
bash start-http-worker.sh
```

Adjust the Blender path to your installation. The launcher creates a random secret in `.worker-token`; keep this private. Copy its contents into the local application's worker secret field. Keep the worker running in a terminal or a session manager. Its listener is private on `127.0.0.1:8787`; do not open it to the public internet.

## 3. Open the SSH tunnel on Windows

In a separate PowerShell terminal in the project directory:

```powershell
.\scripts\connect-gpu.ps1 -HostName YOUR_SSH_HOST -Port YOUR_SSH_PORT -UserName root
```

Replace the host and port with those shown by the provider. Add `-IdentityFile 'C:\path\to\your\ssh-key'` if required. Keep this terminal open. The tunnel forwards this computer's `127.0.0.1:8787` to the worker's loopback port. For VPS deployment, the tunnel must run on the application server instead.

## 4. Configure the application

Settings → Connections → Rented GPU:

- Worker URL: `http://127.0.0.1:8787`
- Worker secret: the contents of the GPU machine's `.worker-token`
- Rental rate: the actual all-in checkout rate, e.g. ₹59.32/hour only if that is still your confirmed rate.
- Save connection, then Test connection. The test checks worker identity, Blender availability and NVIDIA GPU visibility. It does not render or prove Cycles driver compatibility; the first test render does that.

For a deployed worker behind your own authenticated TLS reverse proxy, a public HTTPS origin is also supported. Redirects and private network destinations other than the documented local tunnel are rejected.

## 5. Render and inspect

Save a project, open 3D, wait for assets to load, position the camera and choose **Test render**. Render this view sends a self-contained GLB, camera settings and daylight HDR directly to the worker. The worker accepts one active job, requires GPU rendering and has a ten-minute Blender time limit. Full HD and 4K options are available after the test succeeds.

The panel polls status and retrieves a private PNG. Active-render cost is an estimate from reported runtime and your configured hourly rate. It excludes instance setup, idle time, boot time, provider rounding, retained storage and any taxes not already in your entered rate. It is not a bill or guaranteed per-house price.

An interrupted submission is not blindly retried. Refresh first; the same worker job ID can be recovered. Resolve an uncertain submission only after checking it is no longer running. Cancellation kills Blender for that job, **but does not stop or terminate the rented instance**.

## 6. End the paid rental

Download your outputs and stop/terminate the instance in the provider dashboard. Closing the app, worker or SSH tunnel does not necessarily end rental or storage charges. Worker output and logs stay in `render-jobs`; input scenes are removed when a job finishes. Remove old result directories through your normal storage maintenance process.

## Local verification without a paid GPU

```powershell
npm test
python -m unittest discover -s renderer -p test_http_worker.py -v
node --env-file=.env --import tsx scripts/gpu-smoke.ts
```

The integration smoke requires the local app/database and free port 8787. It uses a simulated worker, restores any prior GPU configuration and removes its test project/files. It never calls a rental provider. A real Blender CPU fixture can verify scene import and output separately; it does not establish cloud GPU performance or reference-photo quality.

For offline rendering, download both the 3D GLB and camera settings in the viewer, then run the supplied `renderer/render.py` with Blender. Add `environment_file` to the JSON to use the included HDR daylight. AI and GPU credentials can be configured later.
