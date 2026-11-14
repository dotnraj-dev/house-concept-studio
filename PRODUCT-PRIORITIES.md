# Product priorities

## Current priority: the actual 3D house

The core result takes priority over the assistant-interface redesign. A generated
house must have coherent geometry and usable space before presentation polish.

Acceptance work still needed:

- Reliable export directly from the application. The sample's browser export
  stalled; a local Blender export from the saved planner data was used instead.
- Comfortable, connected layouts across plot proportions and facings. The first
  east-facing 45 × 65 ft sample produced narrow service rooms and was rejected.
  The final north-facing demonstration uses a different floor programme that
  passes the current comfort/access checks. That does not fix every brief.
- Consistent furniture footprints in the plan and 3D scene. Sofa/rug placement
  was aligned during this generation; other schematic symbols need review.
- More detailed, coordinated assets and better facade composition. Some vehicle,
  plant and fixture models remain visibly simple. Reference-image quality has
  not been achieved consistently across the whole house.
- First-person walkthrough review for door swings, stair clearance, furniture
  clearance, balcony access and camera viewpoints, beyond automated checks.
- One unit convention across the browser, model export and renderer. The sample
  includes a standard metre-scale GLB and a separate feet variant for the current
  worker protocol.
- A real paid GPU benchmark only after the local scene and export are stable.

The generated example is saved as **Thendral Residence — furnished G+1** and its
files are in `exports/thendral-residence`.

## Later: premium guided-assistant interface

Use the user's FastRender screenshots as interaction references, with our own
visual identity. Do not implement this redesign ahead of the 3D acceptance work.

- Ask one clear question at a time, with suggested-answer buttons and an own-answer field.
- Support typed paragraphs, form editing and optional multilingual voice input.
- Adapt follow-up questions to earlier answers, including irregular plots,
  individual setbacks, floor programmes, entrances, Vastu and services.
- Let the admin return to and edit any answer. Every saved field, room size,
  placement, material, asset choice and supported design option should have a
  clear editing path; surface geometry constraints when a requested edit cannot fit.
- Ask an explicit final **Anything else?** question with unrestricted notes.
- Show an editable, structured recap before generation.
- Keep a clear connection between answers, the 2D plan and the 3D house. Explain
  which parts will change, preserve unaffected details where possible, and retain
  previous design versions with undo/redo.
- Use a modern, spacious, premium visual system, real progress states, useful
  error messages and the existing admin/employee feature permissions.
- Do not label local preset questions as live AI. AI behaviour depends on an
  explicitly configured provider; the keyless guided flow must still work.

## Research only

BuildFlow analysis is in `exports/buildflow-analysis.md`. No BuildFlow or
FastRender integration, account creation or purchase has been performed.
