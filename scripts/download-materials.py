"""Download bundled CC0 Poly Haven PBR maps for offline house rendering."""
from __future__ import annotations

import hashlib
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public" / "assets" / "materials"
ASSETS = {
    "plaster": "white_plaster_02",
    "woodfloor": "wood_floor",
    "timber": "oak_veneer_03",
    "tile": "interior_tiles",
    "stone": "large_floor_tiles_02",
    "fabric": "rough_linen",
}
MAPS = {"Diffuse": "color", "nor_gl": "normal", "Rough": "roughness"}
HEADERS = {"User-Agent": "HouseConceptStudio/0.1 (offline CC0 material bundle)"}


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for surface, asset_id in ASSETS.items():
        response = requests.get(f"https://api.polyhaven.com/files/{asset_id}", headers=HEADERS, timeout=30)
        response.raise_for_status()
        files = response.json()
        for key, suffix in MAPS.items():
            item = files[key]["1k"]["jpg"]
            target = DEST / f"{surface}-{suffix}.jpg"
            if target.exists() and hashlib.md5(target.read_bytes()).hexdigest() == item["md5"]:
                print(f"Verified {target.name}")
                continue
            data = requests.get(item["url"], headers=HEADERS, timeout=90)
            data.raise_for_status()
            if hashlib.md5(data.content).hexdigest() != item["md5"]:
                raise ValueError(f"Checksum mismatch: {target.name}")
            target.write_bytes(data.content)
            print(f"Downloaded {target.name}: {len(data.content):,} bytes")
    environment = "kloofendal_48d_partly_cloudy"
    response = requests.get(f"https://api.polyhaven.com/files/{environment}", headers=HEADERS, timeout=30)
    response.raise_for_status()
    item = response.json()["hdri"]["1k"]["hdr"]
    target = DEST / "daylight.hdr"
    if not target.exists() or hashlib.md5(target.read_bytes()).hexdigest() != item["md5"]:
        data = requests.get(item["url"], headers=HEADERS, timeout=90)
        data.raise_for_status()
        if hashlib.md5(data.content).hexdigest() != item["md5"]:
            raise ValueError("Checksum mismatch: daylight.hdr")
        target.write_bytes(data.content)
    print(f"Verified {target.name}")


if __name__ == "__main__":
    main()
