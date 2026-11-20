# UI visual comparison

Captured from the actual demo browser with the same facade verification house, 1440×900 desktop, 1180×820 iPad-sized touch viewport and 390×844 phone-sized touch viewport. The baseline was saved before interface edits. Light and dark after captures use the same project; the dark theme had no before equivalent. The 3D after capture with a closed Select is the comparable view; the additional open-Select capture shows portal and bottom-sheet placement.

| View | Before | After light | After dark |
| --- | --- | --- | --- |
| Desktop 3D | [Before](before-light-desktop-3d-select.png) | [After](after-light-desktop-3d.png) · [Select open](after-light-desktop-3d-select.png) | [Dark and Select open](after-dark-desktop-3d-select.png) |
| Desktop Brief | [Before](before-light-desktop-brief.png) | [After](after-light-desktop-brief.png) | [Dark](after-dark-desktop-brief.png) |
| Desktop 2D | [Before](before-light-desktop-2d.png) | [After](after-light-desktop-2d.png) | [Dark](after-dark-desktop-2d.png) |
| iPad 3D | [Before](before-light-ipad-3d-select.png) | [After](after-light-ipad-3d.png) · [Select open](after-light-ipad-3d-select.png) | [Dark and Select open](after-dark-ipad-3d-select.png) |
| Phone 3D | [Before](before-light-phone-3d-select.png) | [After](after-light-phone-3d.png) · [Select open](after-light-phone-3d-select.png) | [Dark and Select open](after-dark-phone-3d-select.png) |
| Dashboard, settings | Baselines in this folder for all three viewports | Light captures in this folder | Dark captures in this folder |

Additional light/dark desktop captures show login, the asset library, team and proposal. [The room-jump capture](after-light-desktop-room-jump.png) shows the browser walkthrough after choosing Ground floor → Living room; the automated check also returned to Front view. These captures demonstrate UI operation and the existing scene, not an architecture change.

The UI now has aligned controls, clearer focus and active states, consistent typography, a compact phone header and a readable touch sheet over the viewer. The 3D screenshot still has the same house silhouette, materials, lighting, furniture and camera composition. Against the primary [ext-02-jaali-stone.png](../../references/ext-02-jaali-stone.png), the model still lacks the reference's broad perforated jaali plane and balanced white/stone upper composition. Against [int-03-double-height.png](../../references/int-03-double-height.png), this task provides no new interior detailing or lighting. The actual 2D plan remains less furnished and dimensional than [plan-01-cutaway.png](../../references/plan-01-cutaway.png). No Pixabay element reference was used to claim a scene improvement.

No architectural feature was implemented in this task. The user interface remains small in dense Inspector and Brief areas, and the legacy forms still have some specialised layouts. Device screenshots are touch emulation in Chromium, not physical iPad or phone tests. Console, build and test results are recorded separately in [UI-UPDATE.md](../../../UI-UPDATE.md).
