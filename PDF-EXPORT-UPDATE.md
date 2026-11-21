# Plan PDFs + UI audit (2026-11-21)

## Plan PDFs (Export menu)
- **Floor plan PDF · <current floor>**: A4 landscape, the floor plan plus a room schedule (room, size in feet and inches, area, total).
- **All floors side by side · PDF**: every floor plus the terrace on one sheet (A4 for 2 plans, A3 for 3+), all drawn at the same scale.
- The header has the company logo, name, tagline and contact details. The footer has plot, house size, enclosed area, facing, the company address and GSTIN, and a "concept, not for construction" note.
- Plans are drawn without the selection outline, resize handles or hover states. Room names are drawn above furniture.
- jsPDF (MIT) and the renderer load only when a PDF is requested (about 126 kB gzip, kept out of the first page load).

## Settings → Company details
- Logo upload (PNG/JPG/WebP, resized to ≤600×240 px PNG, ≤400 KB stored), tagline, office address, phone, email, website, GSTIN.
- The server validates the logo as a base64 PNG/JPEG/WebP data URL only (no SVG, so no script in logos).

## UI/UX audit fixes (src/ui/layout-fixes.css)
- 2D toolbar: the full-width strip over the plan is now a compact centred bar. The compass moved below it. The floor picker and command bar sit above the bottom dock and no longer overlap each other or the plan.
- Brand mark: the building icon was black on black. It is now white.
- One font family: the guided-interview question and login tagline used Georgia/Times.
- Softer layered shadows; Brief step bar without a visible scrollbar; neutral notice strip.

Screenshots: docs/screenshots/pdf-export/.
