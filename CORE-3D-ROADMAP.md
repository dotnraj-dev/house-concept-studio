# Core 3D delivery roadmap

## Division of work

The API model reasons about the customer brief and proposes design decisions.
The application builds and checks measured geometry. The renderer calculates
light, reflections and shadows. A rented GPU accelerates those rendering calculations.
These components have separate jobs and separate acceptance criteria.

GPT-6 Astra is a possible planning/review model. Its official model ID is
`gpt-6-astra`; it supports image input, structured output and function calls.
Source checked 14 November 2026:
https://developers.openai.com/api/docs/models/gpt-6-astra

Using a model to help develop and test the application is distinct from the
finished application making a paid API request for each customer. An API key
is not required to continue the local engine improvements.

## Present capabilities and limits

- Settings already accepts a text model ID and stores the provider key server-side.
- The current AI endpoint extracts explicit requirements and suggests follow-up
  questions. It does not currently make a full AI floor plan or run an AI
  layout-repair loop. Selecting Astra alone does not change that architecture.
- The planner currently uses an orthogonal two-wing arrangement. It is not a
  general architectural space-planning solver.
- The browser provides the interactive view. Blender makes still renders of
  exported geometry. Renting a GPU does not automatically upgrade the browser view.
- The existing sample remains below the supplied visual references. No
  paid-model comparison or rented-GPU benchmark has been completed.

## Milestones, in delivery order

1. **Reliable physical house.** Validate one furnished sample: connected rooms,
   usable door swings, stairs, balcony/terrace access, furniture clearance and
   service-maintenance space. Fix movement through furniture and review jumping
   and head clearance. A walkthrough must match the actual geometry.
2. **One polished visual baseline.** Refine facade composition, coordinated
   detailed assets, physical materials and lighting. Inspect actual interior and
   exterior renders. Keep the same geometry in the furnished plan, browser and
   renderer; do not substitute an invented image for the model.
3. **Reliable model and camera export.** Resolve the stalled browser GLB export;
   standardise metre units and migrate worker/camera conventions together,
   keeping old exports compatible. Re-import the exported model to check scale.
4. **AI planning and review.** Add a structured, validated planning contract;
   evaluate Astra against the same representative customer briefs. Use bounded
   repair attempts, preserve exact user constraints, and report unresolved
   conflicts. Require the admin to review the plan before final presentation.
5. **GPU benchmark.** After export is stable, render the identical saved scene
   on a rented GPU. Record actual start-up time, compute time, billed duration,
   storage and final images. Estimate cost from measured jobs; do not promise a
   fixed maximum per house before this measurement.
6. **Premium guided intake.** Deliver suggested answers, custom text/voice,
   editable previous answers, a final Anything else question, an editable recap
   and traceable revisions, following the existing permission toggles.

## Proposed AI planning loop (not implemented yet)

Customer answers → normalised brief → Astra proposes a room programme,
adjacency, entrances, wet-zone grouping and design/style intent → geometry
engine creates candidate plans → deterministic checks return specific failures
→ Astra revises supported decisions within a bounded attempt/token budget →
admin reviews furnished 2D → same geometry becomes interactive 3D → Blender
renders chosen camera views, with a GPU when configured.

The checks must cover boundary/setback containment, overlapping rooms,
required dimensions, connected entrances, door and furniture clearance,
stairs between every occupied level, requested Vastu constraints and services.
Geometric validation is not a building approval or a structural design review.

Give the model supported tools such as propose_room_programme,
set_room_constraints, evaluate_layout and select_material_palette. Validate
their arguments before applying them. Avoid executing arbitrary model-written
Python or JavaScript in the live customer-generation path. We can use generated
code during development when it is reviewed and tested.

## Changes made in this increment

- Door collision follows the actual animated hinge angle, including partially
  opened leaves. Opening a door no longer makes the leaf disappear from movement.
- The visible door leaf can be targeted to open/close after it has swung away
  from the original doorway interaction volume.
- A rejected stair step cannot fall back to an imaginary flat floor. The movement
  resolver is checked across four storeys and all four house orientations,
  including descent on the flight below an intermediate landing.
- Automated checks cover these changes. A fresh manual browser walkthrough is
  still required; this increment is not a claim that all movement or visual
  quality work is complete.
