#!/usr/bin/env python3
"""Validate AI-generated sprite pack metadata for gameplay compatibility.

This script performs structural + gameplay checks:
- required actions exist
- frame counts are sufficient
- all frame rectangles match declared frame width/height
- frames stay within atlas bounds (if image provided)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REQUIRED_ACTIONS = {
    "idle": 6,
    "run": 8,
    "jump": 4,
    "light": 4,
    "heavy": 6,
    "special": 8,
    "block": 2,
    "hit": 2,
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def maybe_get_image_size(image_path: Path) -> tuple[int, int] | None:
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return None

    with Image.open(image_path) as image:
        return image.size


def validate(pack: dict, pack_path: Path) -> list[str]:
    errors: list[str] = []

    sheet = pack.get("sheet", {})
    frame_w = int(sheet.get("frameWidth", 0))
    frame_h = int(sheet.get("frameHeight", 0))

    if frame_w <= 0 or frame_h <= 0:
        errors.append("sheet.frameWidth/frameHeight must be > 0")

    animations = pack.get("animations", {})
    for action, minimum in REQUIRED_ACTIONS.items():
        if action not in animations:
            errors.append(f"Missing required action: {action}")
            continue

        frames = animations[action].get("frames", [])
        if len(frames) < minimum:
            errors.append(f"Action '{action}' has {len(frames)} frames; requires at least {minimum}")

        for i, frame in enumerate(frames):
            w = frame.get("w")
            h = frame.get("h")
            if w != frame_w or h != frame_h:
                errors.append(
                    f"Action '{action}' frame {i} size {w}x{h} does not match sheet {frame_w}x{frame_h}"
                )

    atlas_path = sheet.get("path")
    if atlas_path:
        image_path = (pack_path.parent / atlas_path).resolve()
        if image_path.exists():
            size = maybe_get_image_size(image_path)
            if size:
                img_w, img_h = size
                for action, data in animations.items():
                    for i, frame in enumerate(data.get("frames", [])):
                        x = int(frame.get("x", -1))
                        y = int(frame.get("y", -1))
                        w = int(frame.get("w", 0))
                        h = int(frame.get("h", 0))
                        if x < 0 or y < 0 or x + w > img_w or y + h > img_h:
                            errors.append(
                                f"Out-of-bounds frame: {action}[{i}] rect=({x},{y},{w},{h}) exceeds atlas {img_w}x{img_h}"
                            )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate AI Fighter Forge sprite pack JSON")
    parser.add_argument("pack", type=Path, help="Path to sprite pack JSON file")
    args = parser.parse_args()

    pack = load_json(args.pack)
    errors = validate(pack, args.pack)
    if errors:
        print("Sprite pack validation failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("Sprite pack validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
