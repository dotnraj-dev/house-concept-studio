# AI command bar (Prompt C, built in the Claude lane) — 2026-11-21

Type or speak a change at the bottom of the 2D and 3D canvas (press `/` to focus it).

## How it works
- **Free on-device understanding first** (`src/ai/local-commands.ts`): moves, resizes, add/remove rooms, windows, furniture, bathroom attach/detach, interior finishes, floors and view shortcuts (undo, redo, front view, walk, present, 2D/3D, show floor N). Understands Tamil-English mixes such as “pooja room-a north side-ku maathu”, *vadakku/therku/kizhakku/merku*, *jannal*, *podu*, *eduthudu*.
- **AI only for harder sentences** (`POST /api/commands`, `server/ai-commands.ts`): the configured OpenAI key stays on the server; the model must answer with a strict JSON schema of 17 allowed actions; every answer is validated with zod (`src/ai/command-schema.ts`). Nothing the model writes is executed. Per-user hourly rate limit, `projects.edit` permission required. Demo mode never calls AI.
- **Preview, then Apply** (`src/ai/execute.ts`): actions run through the same editor functions as the 2D tools, the change list and any *new* plan conflicts are shown, the first affected room is highlighted in 2D/3D, and Apply commits it as **one undo step** labelled `AI: …` in the project history.
- **Ambiguity is asked, not guessed**: “bedroom” when there are three bedrooms, or “make the room face north”, returns a question with clickable options.
- **Unsupported requests get a plain explanation** (e.g. moving the main entrance → change it in the brief).
- **Voice**: the microphone uses the browser's free speech recognition (en-IN). Cost line shows “Free · on device” or the AI token estimate.

## Evidence
- `src/ai-commands.test.ts`: 18 tests, 30+ example sentences (multi-step, ambiguous, impossible, Tamil-English), mocked provider (key header, strict schema, rejected unknown ops, failures).
- Browser: `docs/screenshots/ai-commands/preview-tamil-english.jpg` (preview of a two-step Tamil-English command with an overlap warning). Apply then a single Undo verified in the browser.

## Not yet
- Stairs, terrace and water-tank commands will be added after Codex's B2 merges (new editor actions).
- “Walk” switches to 3D; starting the walk itself is one click on the Walk button.
