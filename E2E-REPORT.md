# E2E report (pass 1 — existing screens)

Run: `npm run e2e` (Playwright, demo build with VITE_DEMO_MODE=true, local Chrome). Date: 2026-11-21.

| Project | Viewport | Result |
|---|---|---|
| desktop | 1440x900 | 7/7 pass |
| ipad | 1180x820, touch, iPad UA | 7/7 pass |
| phone | 390x844, touch, mobile | 7/7 pass |

Covered: demo sign-in, wrong password, every workspace mode (Brief/2D/3D/Present/Proposal), 3D render + orbit turns the compass + front view, jump inside a room (walking compass), Present mode hide/exit, Ctrl+K command palette, theme switch, no sideways page scroll, no uncaught page errors.

## Bugs found and fixed
- 3D toolbar buttons were nameless for screen readers on phones/tablets (their text labels are hidden there): Front view, Orbit / select, Walk inside, Guided tour and Cutaway now have aria-labels (src/components/House3D.tsx). Regression check in `3D house renders…`.
- Test-harness race: mode switching checked for the desktop buttons before the workspace rendered and fell back to the phone select. `openMode` now waits for the project header.

## Not yet covered (extend after Codex B1/B2/C land)
2D edits (rooms, bathrooms, windows, paintings, stairs/terrace, independent floors), AI command bar with mocked provider, facade-style and interior sweeps, proposal export, settings and team permissions, axe accessibility scan. WebKit is not used (large browser download); Safari checks stay manual.
