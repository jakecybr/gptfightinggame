#!/usr/bin/env python3
"""Create a starter sprite_pack.json with required action slots.

This is intended to help wire AI output into a known-good metadata format.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ACTIONS = {
    "idle": 10,
    "run": 12,
    "jump": 8,
    "light": 6,
    "heavy": 12,
    "special": 18,
    "block": 4,
    "hit": 5,
}


def build_template(name: str, prompt: str, atlas_path: str, frame_w: int, frame_h: int) -> dict:
    x_cursor = 0
    animations = {}

    for action, count in ACTIONS.items():
        frames = []
        for _ in range(count):
            frames.append({"x": x_cursor, "y": 0, "w": frame_w, "h": frame_h})
            x_cursor += frame_w
        animations[action] = {"fps": 12, "frames": frames}

    return {
        "version": "1.0",
        "fighter": {
            "name": name,
            "prompt": prompt,
            "seed": 0,
            "styleGuide": "Replace with AI-generated canonical design constraints",
        },
        "sheet": {
            "path": atlas_path,
            "frameWidth": frame_w,
            "frameHeight": frame_h,
        },
        "animations": animations,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Create starter sprite pack metadata")
    parser.add_argument("--name", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--atlas", default="fighter_atlas.png")
    parser.add_argument("--frame-width", type=int, default=96)
    parser.add_argument("--frame-height", type=int, default=128)
    parser.add_argument("--out", type=Path, default=Path("sprite_pack.json"))
    args = parser.parse_args()

    data = build_template(args.name, args.prompt, args.atlas, args.frame_width, args.frame_height)
    args.out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
