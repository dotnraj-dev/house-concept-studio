# Tamil Nadu residential rule checks

Reviewed 15 November 2026. This is a bounded concept-stage rules implementation. It is not an approval engine, does not implement every provision of the 252-page book or every amendment, and does not certify a design for construction.

## Sources and review

The supplied February 2019 Tamil Nadu Combined Development and Building Rules PDF has 252 PDF pages. The text was extracted in full, its contents/structure reviewed, and the relevant residential tables and room/stair/ventilation pages inspected visually. Key provisions used: Rules 28, 35, 52, 54, 63 and Annexures IV/XXII. Page numbers in the source book differ from PDF page numbers: Rule 35 tables are PDF pages 50–54; Rule 52 room dimensions and ventilation/stairs are PDF pages 88–92; wastewater requirements are on PDF page 96.

The 2019 file is not a current consolidated code. The official CMDA amendment index was downloaded and relevant later orders examined, including:

- G.O.16, 31 January 2020: substituted Rule 35 table, including alternative side-clearance arrangements and normally permissible FSI.
- G.O.69, 11 March 2024: revised height-category references and side/rear setback table. The scanned table was read visually. It retains the 7 m height split and revises the next side/rear category to 14 m.
- G.O.156, 10 October 2025: individual-house parking note. This is flagged for a proper dwelling-area parking schedule; a customer's one-car request is not treated as statutory sufficiency.
- G.O.171, 30 October 2025: EV requirements, subsequently amended in G.O.194.
- G.O.194, 26 October 2026: examined a government-order copy preserved by an external archive. It changes the upper non-high-rise category to 19.50 m, revises associated provisions, allows defined open kitchens and changes EV infrastructure provisions. That taller category is **not** automatically approved by this application.
- Other indexed amendments were screened for scope: telecom infrastructure, land-use change, industrial parameters, Metro premium-FSI charges and authority/registration matters do not establish blanket permission for an ordinary house.

Official base rules and amendment index:
https://www.cmdachennai.gov.in/TNCDBR2019.html

Official 2020 substituted table:
https://www.cmdachennai.gov.in/pdfs/TNCDBR/Amendments/Amendment_GO_Ms_No_16_Dated_31_01_2020.pdf

Official 2024 amendment:
https://www.cmdachennai.gov.in/pdfs/TNCDBR/Amendments/Amendment_GO_Ms_No_69_Dated_11_03_2024.pdf

Official 2025 parking amendment:
https://www.cmdachennai.gov.in/pdfs/TNCDBR/Amendments/Amendment_GO_Ms_No_156_Dated_10_10_2025.pdf

Government G.O.194 copy in external archive (not an official hosting domain):
https://files.verified.realestate/kb/tn-planning-go-hud-go-194-urban-development-amendment-to-tamil-nadu-combined-development-and-building-rul-26-1-cb8724-r2.pdf

The official CMDA index available during this review did not contain a current consolidated 2026 book. The implementation therefore exposes scope limits and outstanding verification rather than asserting comprehensive current compliance.

## Implemented behavior

- All project reviews use Tamil Nadu as the building jurisdiction. A Kerala or other state visual style is independent of site jurisdiction.
- Collect approving authority, notified area classification, direct/private access, surveyed road width, dwelling units, special overlays, road-widening alignment and its confirmation.
- Automatically apply the ordinary standard-area residential setback table only when required classification/access/road/alignment facts are recorded, no special overlay is declared, the roof is flat, the slab-level model height is within 14 m and the dwelling count is within the implemented category.
- Preserve any larger user-entered setback. Convert statutory metres to model feet explicitly. Front setbacks vary by road-width band; the 7 m height split, plot frontage and side-clearance choice determine side/rear minima.
- For polygons, require surveyed frontage and a legal role for every edge. Missing edge roles are not guessed. Use the existing conservative orthogonal footprint inside the true, individually offset boundaries.
- Limit supported footprints to a conservative base FSI 2.0 envelope across modelled floors. Gross model areas count covered portico and stairs; exclusions and premium FSI need a professional area statement.
- Check approximate clear habitable/kitchen/combined bath-WC areas and widths; opening area and daylight reach; prohibited direct bathroom–kitchen doors; and stair width, tread, riser and flight count.
- Size external windows to the preliminary opening target where the available wall permits. The concept specifies casement-style glazing with an assumed 85% openable fraction; exact product clear openings must be checked. Baths have high ventilating windows.
- Rework automatic bedroom suites so the bedroom retains an exterior wall, with a private attached bath and dressing area behind it. Avoid placing the bathroom door centrally when that prevents a separate shower zone.
- Use 10 ft storeys with about 2.94 m clear model ceiling height. Keep floor slabs, stairs, cameras, interaction points, elevations, services and exports on the same height convention.
- Model a 0.457 m plinth above example site ground, with three traversable entrance steps. Actual flood level and surveyed drainage levels may require more.
- Flag rainwater harvesting, parking schedules, wastewater design near drinking-water sources, special restrictions, taller buildings and structural/fire/authority checks as outstanding.
- Existing review-status APIs reject concepts with unresolved conflicts. Passing the implemented checks never means planning permission.

## Explicit limits

CBA/EWS variations, private passages, corner-road authority interpretation, restricted coastal/hill/aquifer/airport/heritage sites, premium FSI, statutory exclusions, multi-block projects, high rises, detailed structural/beam/headroom sections, fire approvals, flood surveys and complete parking/service design require project-specific professional verification. Pitched-roof crown/eave height needs a detailed section; automatic site-table selection is withheld for those designs. Three floors is not imposed as a model-generation limit: larger buildings remain available as concepts with a manual-review flag.

A stock-photo reference, AI answer or a customer Vastu preference cannot override a statutory condition. Changes to a rule profile should be sourced and regression-tested before use. The admin must obtain the applicable current authority interpretation and approved site records for each customer.

