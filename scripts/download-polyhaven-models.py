"""Download curated CC0 Poly Haven models (1k glTF), pack each into a self-contained GLB
under public/assets/quality/<category>/ and record them in public/assets/quality/library.json.

The older manifest.json (sofa.glb, chair.glb) is left untouched.
Usage: python -I scripts/download-polyhaven-models.py
Requires: npx @gltf-transform/cli (fetched on demand).
After downloading, small props were shrunk with `gltf-transform resize --width 512 --height 512`
(pooja, decor, planter, shrub, terrace chair, street lamp, outdoor AC, small succulent), and the
two island trees (45-65 MB each) were excluded as too heavy for iPad/integrated graphics.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".work" / "polyhaven"
DEST = ROOT / "public" / "assets" / "quality"
HEADERS = {"User-Agent": "HouseConceptStudio/0.3 (curated CC0 model bundle)"}

# id: (category, use in the app, approximate real height in feet)
MODELS = {
    "sofa_02": ("sofa", "living room three-seater", 2.8),
    "modern_arm_chair_01": ("armchair", "living/bedroom accent chair", 2.9),
    "modern_coffee_table_01": ("coffee", "living coffee table", 1.4),
    "coffee_table_round_01": ("coffee", "round coffee table", 1.5),
    "side_table_01": ("sidetable", "sofa side table / bedside", 1.8),
    "dining_table": ("dining", "dining table", 2.5),
    "painted_wooden_nightstand": ("nightstand", "bedside table", 2.0),
    "modern_wooden_cabinet": ("cabinet", "TV unit / sideboard base", 2.6),
    "wooden_display_shelves_01": ("shelf", "display / book shelf", 5.5),
    "ceiling_fan": ("ceilingfan", "Indian ceiling fan", 1.2),
    "modern_ceiling_lamp_01": ("pendant", "dining pendant light", 1.5),
    "hanging_picture_frame_01": ("painting", "wall painting", 2.0),
    "hanging_picture_frame_02": ("painting", "wall painting", 2.0),
    "hanging_picture_frame_03": ("painting", "wall painting", 2.0),
    "ornate_mirror_01": ("mirror", "dressing/foyer mirror", 3.0),
    "potted_plant_01": ("plant", "indoor potted plant", 2.5),
    "potted_plant_02": ("plant", "indoor potted plant", 2.0),
    "potted_plant_04": ("plant", "small succulent pot", 0.8),
    "planter_pot_clay": ("planter", "terracotta planter", 1.2),
    "plastic_monobloc_chair_01": ("terracechair", "terrace / sit-out chair", 2.7),
    "exterior_aircon_unit": ("acoutdoor", "split AC outdoor unit on facade", 2.0),
    "brass_diya_lantern": ("pooja", "brass diya lantern for pooja", 1.0),
    "brass_pot_01": ("pooja", "brass kalash/pot", 0.6),
    "brass_candleholders": ("pooja", "brass lamp stands", 0.8),
    "brass_vase_01": ("decor", "brass vase", 1.0),
    "ceramic_vase_01": ("decor", "ceramic vase", 1.0),
    "shrub_01": ("shrub", "flowering shrub", 3.0),
    "shrub_02": ("shrub", "garden shrub", 3.0),
    "street_lamp_01": ("streetlamp", "street lamp", 18.0),
}


def fetch(url: str, target: Path, md5: str) -> None:
    if target.is_file() and hashlib.md5(target.read_bytes()).hexdigest() == md5:
        return
    data = requests.get(url, headers=HEADERS, timeout=120)
    data.raise_for_status()
    if hashlib.md5(data.content).hexdigest() != md5:
        raise ValueError(f"Checksum mismatch: {target.name}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data.content)


def main() -> None:
    entries = []
    for asset, (category, use, height_ft) in MODELS.items():
        files = requests.get(f"https://api.polyhaven.com/files/{asset}", headers=HEADERS, timeout=30).json()
        gltf = files["gltf"].get("1k") or files["gltf"].get("2k")
        node = gltf["gltf"]
        folder = WORK / asset
        fetch(node["url"], folder / "source.gltf", node["md5"])
        for rel, item in node.get("include", {}).items():
            target = (folder / rel).resolve()
            if not target.is_relative_to(folder.resolve()):
                raise ValueError("Invalid include path")
            fetch(item["url"], target, item["md5"])
        out = DEST / category / f"{asset}.glb"
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(f'npx --yes @gltf-transform/cli@4.5.1 copy "{folder / "source.gltf"}" "{out}"',
                       check=True, shell=True, capture_output=True)
        entries.append({
            "id": f"{category}/{asset}", "category": category, "name": asset,
            "use": use, "file": f"{category}/{asset}.glb", "bytes": out.stat().st_size,
            "approxHeightFt": height_ft, "source": f"https://polyhaven.com/a/{asset}",
            "license": "CC0-1.0", "resolution": "1k", "sourceMd5": node["md5"],
        })
        print(f"{category}/{asset}: {out.stat().st_size // 1024} KB", flush=True)
    library = {"license": "CC0-1.0", "licenseUrl": "https://polyhaven.com/license",
               "note": "Curated realistic models for interiors, pooja, terrace and streetscape. Fit to explicit feet dimensions before placing.",
               "models": entries}
    (DEST / "library.json").write_text(json.dumps(library, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
