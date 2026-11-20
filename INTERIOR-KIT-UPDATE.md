# Indian interior kit — pass 1 (Claude lane, 2026-11-20)

Built ahead of Codex's B1 (2D editor) so neither lane waits. All pieces live in `src/house3d/InteriorKit.tsx` with a single hook per room in `HouseScene.tsx`, so B1 can give them permanent ids without restructuring. Existing fitout (wardrobes, lofts, fan, AC, art, prayer cabinet) is extended, not duplicated.

## Added
| Room | Element |
|---|---|
| Living, dining, master bedroom (largest bedroom) | False ceiling: 0.55 ft gypsum drop around the edges, recessed centre, upstand lip hiding a warm LED cove strip, a real RectAreaLight washing the recess, four downlights. Hidden in the cutaway view. |
| Living | Fluted timber TV feature wall (walnut backing, oak flutes, warm top backlight) behind the existing TV joinery; brass vase from the CC0 library. |
| Bedrooms | Upholstered panel headboard wall in a timber frame with a warm backlight strip. |
| Kitchen | Black galaxy granite counter (was white quartz), 2 ft dado tiles above the counter, steel pot and kadai on the hob. |
| Pooja (when the customer selects the Hindu prayer option) | Stepped gopuram-style crown with a brass kalasam on the prayer cabinet, backlit jaali panel, a pair of turned brass kuthuvilakku floor lamps with five glowing wicks, kolam floor decal, brass diya lantern and kalash pot from the library. Neutral/other-faith options are unchanged. |

## Added in pass 1b
| Room | Element |
|---|---|
| Bathrooms with a shower zone | Frameless glass wet/dry partition with a steel edge profile and a stone kerb; LED bar above the vanity mirror. |
| Kitchen | Modern slanted black-glass chimney hood with a brushed-steel canopy and duct (replaces the low-poly kit hood; an uploaded hood model still takes priority). |

## Evidence
`docs/screenshots/interior-kit/after-*.png` (living TV wall, kitchen, parents bedroom, pooja with the Hindu option). Before images: `docs/screenshots/realism` and earlier workspace captures.

Performance: RectAreaLights only switch on in the cutaway view or on the camera's floor while walking; measured walk-mode frame time 28.7 ms with them vs 29.7 ms without (noise). npm test and build green.

## Pass 2 (Claude lane, 2026-11-21, after B1)
Every kit choice is now a per-room option in the Inspector (Edit room panel), stored the B1 way: `setRoomInterior` in `src/editor-model.ts` writes `room.interior` into the room override, so choices survive regeneration and style changes, and appear in undo/redo and the change history. Values are validated against `src/interior-options.ts`; unknown fields or values are rejected.

| Room type | Options (default first) |
|---|---|
| Living, lounge | Ceiling: automatic / false ceiling / plain. TV wall: fluted timber / backlit marble (book-matched slabs, edge glow) / timber louvres with a lit shelf |
| Bedroom | Ceiling (automatic = master bedroom only). Headboard: linen beige / teal velvet / charcoal / timber slats |
| Dining, study, foyer | Ceiling: automatic / on / off |
| Kitchen | Counter granite: black galaxy / tan brown / Kashmir white / tropical green. Dado tiles: ivory / sage / terracotta / Athangudi blue. Tile border: decorative listello band with brass pencil line / none |
| Pooja | Mandir: carved teak / white marble (marble crown tiers and carved pilasters). Pooja doors: bell-and-jaali double doors / standard door |

Bell-and-jaali double doors: two teak leaves with a solid lower panel and a cut-through jaali upper panel, hinged at both jambs and swinging to the same side. The brass bells appear only with the Hindu prayer option. Walk-mode collision uses `doorLeaves()` in `src/house3d/doors.ts`, which has the same hinge positions and leaf length, so both leaves block when closed and the doorway is clear when open.

Tests: `src/interior-options.test.ts` covers defaults, per-type fields, override persistence through save/migrate/undo/redo, rejection of invalid values, pooja double-door marking and double-door collision on both wall axes. npm test 126/126, build green.

Visual evidence gap: this pass was done by the unattended takeover task. Starting the browser preview was declined in that session, so **no before/after screenshots were captured for pass 2**. Per AGENTS.md §7, this is an open validation item, not a visual pass. Next session: capture living (each TV wall), kitchen (granite and dado variants), master bedroom (each headboard) and pooja (marble mandir, doors open and closed) into docs/screenshots/interior-kit/pass2-*.png and compare them with int-03 and the Pixabay int-px-01/04/05/08 and pooja-px-01 references.
