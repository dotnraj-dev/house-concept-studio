# 3D performance pass (Claude lane, 2026-11-20)

Target: ≥40 fps in the overview on this laptop's AMD Radeon integrated GPU (ANGLE/D3D11) without visibly lowering quality.

## Profile before changes (same demo project, street camera, 1440×900)
| Measure | Value |
|---|---|
| Draw calls per frame (all passes) | **10,068** |
| Meshes | 1,728 (1,563 casting shadows) |
| Unique materials | **1,454** — almost one per mesh |
| Texture objects | **1,792** — every Block cloned its three PBR maps |
| Real-time lights | 23, including 14 per-room spot lights that were always on |
| Triangles drawn per frame (all passes) | 2.27 M |

The cost was CPU/driver-side (draw calls and state changes), which is why Codex's Low quality level (smaller canvas, no SSAO/reflections) still only reached ~15 fps.

## Changes
1. **Shared materials and textures** (`src/house3d/Surface.tsx`): Blocks with the same look share one material; PBR maps are prepared once instead of cloned per Block. Physical shading only for clearcoat stone/porcelain. Block's props and appearance are unchanged.
2. **Static batching** (`src/house3d/static-batch.ts`, `StaticBatcher.tsx`): static, opaque, single-material meshes under `HouseExport` are merged per material/shadow setting into world-space meshes (128 batches for 1,505 meshes). Originals move to layer 31: not drawn and not in shadow maps, but still visible for walk collision (`obstacles.ts`), raycast picking (R3F raycaster and CameraRig enable layer 31) and GLB export (batches are `runtimeOnly` and never exported).
   - Excluded automatically: doors and anything under `actionId`/`interactionId`/`runtimeOnly`/`dynamic`, transparent materials, instanced/skinned meshes, ShaderMaterials.
   - Self-correcting: a mesh seen moving twice (fans, shelf doors, sliding wardrobes) is marked dynamic and left unmerged; a single move, a material/visibility/shadow change or new/removed meshes trigger a rebuild once the scene is stable for two checks. Curtains (animated vertices) are marked `dynamic`.
3. **Room lights only where visible** (`HouseScene.tsx` RoomLight): spot lights are on in the cutaway overview and, while walking/touring, only on the camera's floor. The exterior overview no longer pays for 14 interior spot lights.

## Results (same session, same camera; `.work/perf/ab.cjs` times `renderer.render` + `gl.finish`)
| | Before | After |
|---|---|---|
| Main-pass frame time | 51.6 ms (≈19 fps) | **21.3 ms (≈47 fps)** |
| Main-pass draw calls | 1,782 | **405** |
| All-pass draw calls per frame | 10,068 | **810** |
| Triangles drawn per frame (all passes) | 2.27 M | 0.68 M |
| Unique materials / texture objects | 1,454 / 1,792 | 453 / 149 |

Visual equivalence: the same frame rendered merged vs unmerged differs by a mean of 0.009/255 per pixel; 53 of 730,884 pixels differ by more than 30/255 (depth-order noise). See `docs/screenshots/perf/after-batched.png` and `before-unbatched.png`.

Functional checks: npm test 107/107 (adds `static-batch.test.ts`), npm run build green.

## Limits / next
- Measured with Chrome headless on this laptop; the in-page fps readout fluctuates with background load (Codex jobs), so render-time A/B in one session is the reliable number. Physical iPad not tested.
- SSAO/post-processing passes add cost on High; not changed here.
- Batches are whole-house per material (no per-floor culling yet). If larger plans need more headroom, split batches per floor and cull floors above the cutaway.
