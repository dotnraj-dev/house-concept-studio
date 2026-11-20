# UI design system update

Updated 20 November 2026. [Screenshots and visual comparison](docs/screenshots/ui/comparison.md) · [Permanent design brief](AGENTS.md).

The application now uses self-hosted Manrope, a neutral surface palette with one teal brand accent, semantic success/warning/danger colours, shared spacing/radius/elevation/focus tokens, and light/dark themes. The first visit follows `prefers-color-scheme`; the theme control stores an explicit choice. No measured house geometry, plan generation, architectural assets, scene content or facade recipe was changed. The UI pass adds a 280 ms ease for room/front camera jumps and a brief runtime selection pulse.

## Shared components

`src/ui/index.tsx` exports Button (variants, sizes, loading), IconButton with tooltip, Input, NumberInput with a visible `ft`/`in` unit, Select, searchable Combobox, SegmentedControl, Toggle, Checkbox, Slider, Tabs, Accordion, Popover, Menu, Dialog, Drawer, BottomSheet, Toast, Badge, Card, Skeleton, EmptyState and Kbd. `src/ui/tokens.css` contains the design tokens and local font faces; `src/ui/ui.css` contains component styling and screen integration.

All Select and Combobox lists render in a document-body portal. The popover chooses above or below the trigger according to viewport space; touch and phone viewports use a bottom sheet. Long lists get a search field, and architectural styles are grouped into exterior recipes, regional references and other styles. Escape, arrows, Enter, Tab focus trapping, disabled options, labels and visible focus styling are implemented. The document Dialog, Drawer and BottomSheet components also trap focus and restore it on close. Touch controls have a 44 px minimum target where they are exposed to coarse pointers.

The dashboard, Brief, 2D/3D workspace, asset library, team and settings, proposal and login now inherit the same tokens and controls. The command palette opens with Ctrl/Cmd+K or the search button, and reaches the current project's modes, save, project creation and available navigation. It filters actions by current user permissions. Theme controls are present on login, in the main navigation and in the workspace bar.

Motion uses CSS transforms/opacity for mode, panel, sheet, list and toast transitions (140–280 ms); resize disables transitions while dragging. Skeleton shimmer appears during the 3D load. `prefers-reduced-motion` removes these animations and the camera/3D selection easing.

## Control replacement inventory

The counts below are opening tags replaced from the prior application: **128 buttons, 89 inputs and 51 native selects**. Buttons and inputs retain their existing event handlers and validation attributes; checkbox/range uses were moved to Checkbox/Slider where applicable. Long architectural-style lists use Combobox. There are no native `<select>` elements in `src/`.

| Screen / module | Buttons | Inputs | Selects | Replaced controls |
| --- | ---: | ---: | ---: | --- |
| `src/App.tsx` | 26 | 24 | 1 | Login, dashboard/project cards and search, navigation, asset upload, team permissions, settings, account, brief capture, category picker |
| `src/components/BriefEditor.tsx` | 13 | 18 | 20 | Guided brief steps, customer/plot/programme fields, dimensions, preferences, direction and finish choices |
| `src/components/ClimatePanel.tsx` | 1 | 4 | 1 | Study date/time, wind and assumptions |
| `src/components/DesignGuide.tsx` | 8 | 0 | 1 | Interview actions and answer choice |
| `src/components/FitoutEditor.tsx` | 1 | 1 | 8 | Room fitout, openings, furniture and appliance choices |
| `src/components/House3D.tsx` | 11 | 6 | 3 | Viewer toolbar/options, lighting, room jump and quality |
| `src/components/PlanCanvas.tsx` | 1 | 1 | 0 | Plan download and plumbing overlay |
| `src/components/ProviderSettings.tsx` | 4 | 7 | 0 | Connection tabs, credentials and save actions |
| `src/components/QuotePanel.tsx` | 2 | 11 | 1 | Rate, extras, tax, discount and category |
| `src/components/ReferenceSearch.tsx` | 2 | 1 | 0 | Reference lookup |
| `src/components/RenderPanel.tsx` | 4 | 1 | 2 | Render connection and output quality |
| `src/components/SiteContextEditor.tsx` | 2 | 2 | 1 | Adjacent boundary use and measured context |
| `src/components/SiteEditor.tsx` | 4 | 3 | 0 | Polygon survey controls |
| `src/components/StyleControls.tsx` | 0 | 1 | 4 | Architectural style, roof, wall, floor and furniture visibility |
| `src/components/TamilNaduRules.tsx` | 0 | 6 | 5 | Site facts, access, restrictions, side clearance and boundary roles |
| `src/components/TouchWalkControls.tsx` | 3 | 0 | 0 | Walk, crouch and interaction controls |
| `src/components/ViewerBoundary.tsx` | 1 | 0 | 0 | Viewer retry |
| `src/components/VoiceInput.tsx` | 3 | 1 | 0 | Recording controls and consent |
| `src/components/Workspace.tsx` | 42 | 2 | 4 | Modes, layers, Inspector, panels, dock, export, floor, proposal and layout |

## Verification

- `npm test`: 103 passed. A test-only preload in `scripts/test-user-info.cjs` handles the restricted Windows runner's `os.userInfo()` failure before `tsx` starts. It uses the native call when available and does not load in the application.
- `npm run build`: passed. Vite's existing large-chunk warning remains.
- `node scripts/verify-ui.cjs`: verified theme switching, Ctrl+K navigation, searchable style options, Escape dismissal, zero native selects, room and front camera jumps, and no browser console errors. The room-jump capture is saved with the other UI screenshots.
- `node scripts/capture-ui.cjs after light` and `... after dark`: actual Chromium demo-browser screenshots at 1440×900, 1180×820 touch emulation and 390×844 touch emulation for dashboard, Brief, 2D, 3D with an open Select, and settings. The capture asserts no horizontal document overflow and records console errors in JSON.
- `node scripts/capture-ui-extra.cjs`: additional desktop light/dark captures for login, asset library, team and proposal.

Visual judgement is in [comparison.md](docs/screenshots/ui/comparison.md). The UI improvement does not establish architectural realism or reference matching. Physical iPad Safari, phone GPU limits and screen-reader sessions were not tested.

