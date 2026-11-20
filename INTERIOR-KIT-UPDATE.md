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

## Evidence
`docs/screenshots/interior-kit/after-*.png` (living TV wall, kitchen, parents bedroom, pooja with the Hindu option). Before images: `docs/screenshots/realism` and earlier workspace captures.

Performance: RectAreaLights only switch on in the cutaway view or on the camera's floor while walking; measured walk-mode frame time 28.7 ms with them vs 29.7 ms without (noise). npm test and build green.

## Still to do (pass 2, after B1 lands)
- Inspector options per room (ceiling on/off, TV wall finish: fluted/marble/louvre, headboard fabric, granite colour) as B1 actions with ids.
- Dado tiles are close to the wall colour: offer tile colours and a decorative border.
- Pooja room bell-and-jaali double doors (door design system) and a marble mandir variant.
- Bathroom vanity mirror light and wet/dry glass partition.
