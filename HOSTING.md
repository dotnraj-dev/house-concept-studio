# Shared test deployment

## Prepared configuration

`render.yaml` creates a **free staging web service and free PostgreSQL database**
in Singapore, using native Node 22. Docker is not required. Frontend and API use
one HTTPS origin. No AI or GPU key is needed to test saved projects, plans,
interactive 3D, quotations, permissions and assets.

The free service sleeps after 15 minutes without traffic and can take about a
minute to wake. Its PostgreSQL database **expires 30 days after creation**.
Export or upgrade before expiry. This is a temporary test environment, not a
permanent customer deployment. Do not store irreplaceable customer data here.

Uploaded GLBs and render files use PostgreSQL in this small staging configuration,
with a 200 MB application file quota. This keeps uploaded files across service
restarts without relying on an ephemeral directory. The bundled free assets
are shipped with the source and do not consume this database file quota.

`render.paid.yaml` is the separate always-on option with a persistent file disk
and a paid database. Review current checkout costs before enabling it. Do not
switch a database-file deployment to filesystem storage without migrating its
files. Keep FILE_STORAGE=database initially when upgrading the existing test.

## Deployment

1. Connect the private GitHub repository to Render with access to this repository.
2. Create a Blueprint using the root `render.yaml`; verify both plans say Free.
3. Render generates the stable credential-encryption key and initial admin password.
   Preserve the encryption key through redeploys and backup/restoration. It is
   separate from GitHub access, OpenAI keys and the GPU worker secret.
4. Initial admin email: `admin@house-studio.local`. The generated password is in
   the web service's Environment page. Use My account to change it after login.
   The seed password does not reset an existing admin on later deployments.
5. The first empty database receives a fictional Thendral Residence showcase.
   No local customer projects, sessions, uploads, provider keys or local `.env`
   are copied into this deployment.
6. `/api/health` checks database connectivity and returns a short build identifier.
   Source pushes rebuild the test application; the database and saved files persist
   for the database's lifetime. GitHub Actions verifies tests and builds.

## GPU connection from hosted Render

The `127.0.0.1:8787` SSH tunnel described for local development is **local to the
application server**. A tunnel on the developer's Windows PC cannot be reached
through Render's localhost. For shared staging, use either RunPod serverless or
a rented worker behind a public HTTPS reverse proxy with the worker token. Do
not expose the unauthenticated Blender process or an HTTP worker port publicly.
No rental is automatically provisioned, paid for or stopped by the web app.

The hosted browser renders interactive 3D using the viewer device's graphics
hardware. A more expensive Render web plan does not improve its visual quality.
Blender GPU rendering is a separate, asynchronous presentation-image pipeline.

## Validation and limits

Automated tests cover geometry, access, door/stair movement, metre-scale export,
credentials, storage configuration and GPU inputs. Browser export still needs
a real test of the complete textured scene after deployment. An API integration
without a configured key is intentionally unavailable rather than simulated.
The current AI endpoint extracts requirements; full AI layout proposal/repair
is a separate remaining milestone in CORE-3D-ROADMAP.md. Visual reference quality
has not been established across every possible generated plan.

Sources checked 14 November 2026:
- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/disks
- https://render.com/pricing
