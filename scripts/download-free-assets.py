"""Download pinned, reusable Kenney GLB models for the house viewer."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen, Request
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "assets" / "free"
REVISION = "3ddcc695adbba9fb918cf31b7c139b3f95b76910"
BASE = f"https://raw.githubusercontent.com/Hidencod/tge-assets/{REVISION}/"
HEADERS = {"User-Agent": "HouseConceptStudio/1.0"}


def fetch(path: str) -> bytes:
    with urlopen(Request(BASE + path, headers=HEADERS), timeout=35) as response:
        return response.read()


def fetch_url(url: str) -> bytes:
    with urlopen(Request(url, headers=HEADERS), timeout=35) as response:
        return response.read()


catalog = json.loads(fetch("catalog.json"))
packs = {pack["id"]: pack for pack in catalog["packs"]}
models = list(packs["furniture-kit"]["models"])
extra_ids = {
    "car-kit/sedan",
    "nature-kit/tree-palmshort",
    "nature-kit/tree-default",
    "nature-kit/plant-bush",
    "nature-kit/plant-bushlarge",
    "nature-kit/flower-reda",
    "nature-kit/flower-yellowa",
    "nature-kit/grass",
}
for pack_name in ("car-kit", "nature-kit"):
    models.extend(model for model in packs[pack_name]["models"] if model["id"] in extra_ids)


def save_model(model: dict) -> dict:
    file_path = PUBLIC / model["file"].removeprefix("packs/")
    thumb_path = PUBLIC / model["thumb"].removeprefix("packs/")
    for source, target in ((model["file"], file_path), (model["thumb"], thumb_path)):
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            content = fetch(source)
            if source.endswith(".glb"):
                if len(content) < 12 or content[:4] != b"glTF" or struct.unpack_from("<I", content, 8)[0] != len(content):
                    raise ValueError(f"Invalid GLB: {source}")
            target.write_bytes(content)
    return {
        "id": model["id"],
        "name": model["name"],
        "fileUrl": "/assets/free/" + model["file"].removeprefix("packs/"),
        "thumbUrl": "/assets/free/" + model["thumb"].removeprefix("packs/"),
        "bytes": file_path.stat().st_size,
        "license": "CC0-1.0",
    }


records = []
with ThreadPoolExecutor(max_workers=12) as executor:
    futures = [executor.submit(save_model, model) for model in models]
    for future in as_completed(futures):
        records.append(future.result())

extra_models = [
    ("innerscene/curtain", "Sheer curtain", "sheer-curtain-original-interior-furnishing-48661116",
     "https://www.innerscene.com/tools/library/3d-parts/sheer-curtain-original-interior-furnishing-48661116"),
    ("innerscene/door", "Panel entry door", "panel-panel-entry-door-c7a6a51c",
     "https://www.innerscene.com/tools/library/3d-parts/panel-panel-entry-door-c7a6a51c"),
]
for model_id, name, slug, source_page in extra_models:
    relative_path = model_id + ".glb"
    destination = PUBLIC / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        destination.write_bytes(fetch_url(f"https://www.innerscene.com/api/library/{slug}/download"))
    content = destination.read_bytes()
    if len(content) < 12 or content[:4] != b"glTF" or struct.unpack_from("<I", content, 8)[0] != len(content):
        raise ValueError(f"Invalid GLB: {destination}")
    records.append({"id": model_id, "name": name, "fileUrl": "/assets/free/" + relative_path,
                    "thumbUrl": "/assets/free/innerscene/preview.svg", "bytes": len(content),
                    "license": "CC0-1.0", "source": source_page})

records.sort(key=lambda record: record["id"])
(PUBLIC / "manifest.json").write_text(json.dumps({
    "source": "Kenney assets via https://github.com/Hidencod/tge-assets",
    "revision": REVISION,
    "license": "CC0-1.0",
    "models": records,
}, indent=2), encoding="utf-8")
(PUBLIC / "LICENSE.txt").write_bytes(fetch("LICENSE"))
print(f"Saved {len(records)} models and thumbnails to {PUBLIC}")
