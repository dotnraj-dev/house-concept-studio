# Security review (Claude lane, 2026-11-20)

Scope: Fastify API (`server/*.ts`), session/auth, uploads and file storage, outbound integrations (OpenAI, RunPod, GPU worker, Pixabay), render pipeline, response headers, dependencies, and the browser build under a Content-Security-Policy. The Codex lane will add AI command routes later (Prompt C); those must reuse `server/security.ts` (see "For later routes").

## Checks and results
| Area | Finding | Status |
|---|---|---|
| Passwords | scrypt (64-byte key, random salt), `timingSafeEqual`; min length 12 | OK |
| Sessions | 32-byte random token, only SHA-256 hash stored; HttpOnly, SameSite=Strict, Secure in production; 7-day expiry; other sessions revoked on password change and on deactivation | OK |
| Login enumeration by timing | Unknown accounts skipped scrypt, so they answered faster | **Fixed**: equal scrypt cost for unknown accounts |
| Login brute force behind a proxy | `request.ip` was the proxy's address on Render, so every user shared one bucket: one attacker could lock everyone out, and the per-IP limit did not stop guessing | **Fixed**: `trustProxy` trusts exactly one hop in production (`TRUST_PROXY_HOPS` overrides) |
| Login brute force per account | Only per-IP limiting | **Fixed**: 20 failures / 15 min per IP and 8 / 15 min per account, with `Retry-After` |
| Limiter memory | Unbounded `Map` of IPs | **Fixed**: bounded `RateLimiter` (pruned, capped at 20,000 keys) |
| Expired sessions | Never removed | **Fixed**: purged on each successful login |
| Paid / third-party API abuse | `/api/extract` (AI), `/api/transcribe`, `/api/references/search` unlimited | **Fixed**: 60 requests per user per hour each (429 + `Retry-After`) |
| Authorisation | Every route checks `requireUser` + `requireFeature`/admin; employees cannot edit admins; plan/quote/service changes need their specific permission | OK |
| Input validation | zod on every body/param; UUID params; 2 MB JSON limit | OK |
| Uploads | GLB only (extension + magic + length check), 25 MB asset / 50 MB render scene, one file | OK |
| File storage paths | Keys must match `^(assets|renders)/[a-f0-9-]+\.(glb|png)$`; no user-controlled paths | OK |
| Static files | `@fastify/static` 8.3.0 had path-traversal and route-guard advisories (GHSA-pr96-94w5-mx2h, GHSA-x428-ghpx-8j92) | **Fixed**: upgraded to 10.1.12; traversal attempts (`%2e%2e`, `..%2f`) return the SPA shell, not files |
| Dependency audit | 3 vulnerabilities (1 high, 2 moderate) | **Fixed**: `npm audit --omit=dev` reports 0 |
| Credentials at rest | Provider keys AES-256-GCM encrypted; production requires `CREDENTIAL_ENCRYPTION_KEY`; never returned to the browser | OK |
| SSRF | GPU worker URL: HTTPS origin only, no credentials/path/query, private and link-local addresses rejected (except the documented SSH tunnel); RunPod endpoint id regex; Pixabay URLs pinned | OK, one accepted risk below |
| Render input | Per-job random token, stored hashed, time-limited | OK |
| CSRF | SameSite=Strict cookie + production Origin check on all state-changing methods | OK |
| Clickjacking / sniffing | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff` | OK |
| Content-Security-Policy | None | **Added**: self-only scripts (plus gstatic for the Draco decoder, `wasm-unsafe-eval`, no `unsafe-inline`/`unsafe-eval`), Google Fonts, Pixabay images, `object-src 'none'`, `base-uri`/`form-action 'self'` |
| Other headers | None | **Added**: HSTS (production, 1 year), `Permissions-Policy` (microphone self only; camera, location, payment, USB off), COOP and CORP same-origin |
| Error messages | Generic 500s; details only for validation errors | OK |

## Verification
- `server/security.test.ts`: limiter windows and memory bound, headers on every response, CSP rules, proxy trust (5 tests). Full suite: **112/112**, build green, asset validation green.
- The production demo build was served with the new headers and opened in Chrome: the 3D house rendered (1,648 meshes) with **0 CSP violations and 0 console errors**.

## Accepted risks / follow-ups
- **DNS rebinding on the GPU worker URL**: validation checks the hostname, not the address it resolves to. Only the admin can set it. Pin the resolved IP per request if non-admin users ever get this setting.
- **Rate limits are per server process** (in memory). With more than one instance, use a shared store (Postgres or Redis).
- **`style-src 'unsafe-inline'`** stays because React inline styles and the 3D UI need it. Scripts remain strict.
- **Runtime environment:** if Render sits behind an additional CDN hop, set `TRUST_PROXY_HOPS=2`.

## For later routes (Codex Prompt C, AI commands)
Use `externalApi.hit(`ai:${user.id}`)` and `tooMany(...)` from `server/security.ts` on every paid AI call, keep provider keys server-side, and validate tool arguments with zod.
