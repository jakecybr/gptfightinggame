#!/usr/bin/env python3
from __future__ import annotations
import json
from pathlib import Path

FRAME_W = 96
FRAME_H = 128

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


def rect(x, y, w, h, fill):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" fill="{fill}" />'


def circle(cx, cy, r, fill):
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" />'


def line(x1, y1, x2, y2, stroke, width=2):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{width}" stroke-linecap="round" />'


def draw_frame(origin_x: int, action: str, i: int, total: int):
    t = i / max(total - 1, 1)
    bx = origin_x + FRAME_W / 2
    gy = FRAME_H - 14
    bob = 2 if action == "run" and i % 2 == 0 else -1 if action == "run" else 0
    arm = 20 if action in {"heavy", "special"} else 14 if action == "light" else 8
    if action == "block":
        arm = 10
    if action == "jump":
        gy -= 10

    pieces = []

    # aura for special
    if action == "special":
        pieces.append(circle(bx + 18, gy - 70, 10 + (i % 3), "#84e7ff66"))

    # shoes + legs
    step = 4 if action == "run" and i % 2 == 0 else -4 if action == "run" else 0
    pieces.append(rect(bx - 13 - step * 0.4, gy - 20, 10, 20, "#e2e6ff"))
    pieces.append(rect(bx + 3 + step * 0.4, gy - 20, 10, 20, "#e2e6ff"))
    pieces.append(rect(bx - 18, gy - 3, 14, 6, "#f4ca4d"))
    pieces.append(rect(bx + 5, gy - 3, 14, 6, "#f4ca4d"))

    # shorts/body (KH1-ish red shorts + black jacket)
    pieces.append(rect(bx - 15, gy - 42, 30, 22, "#d9363e"))
    pieces.append(rect(bx - 14, gy - 72 + bob, 28, 32, "#1c2238"))

    # arms and glove
    pieces.append(rect(bx + 13, gy - 63 + bob, arm, 7, "#f2cf9b"))
    pieces.append(rect(bx - 23, gy - 63 + bob, 10, 7, "#f2cf9b"))

    # keyblade
    kb_len = 20 + (8 if action in {"heavy", "special"} else 0)
    pieces.append(line(bx + 14 + arm, gy - 60 + bob, bx + 14 + arm + kb_len, gy - 60 + bob, "#e8edf9", 3))
    pieces.append(rect(bx + 14 + arm + kb_len - 2, gy - 64 + bob, 6, 8, "#f4ca4d"))

    # head + hair spikes
    pieces.append(circle(bx, gy - 82 + bob, 10, "#f2cf9b"))
    pieces.append(rect(bx - 12, gy - 94 + bob, 24, 6, "#7d4a1f"))
    pieces.append(rect(bx - 15, gy - 90 + bob, 5, 6, "#7d4a1f"))
    pieces.append(rect(bx + 10, gy - 90 + bob, 5, 6, "#7d4a1f"))

    # face eye
    pieces.append(rect(bx + 2, gy - 84 + bob, 4, 2, "#2e90ff"))

    # hit / block accents
    if action == "block":
        pieces.append(rect(bx + 20, gy - 72, 10, 20, "#5ec6ff88"))
    if action == "hit":
        pieces.append(line(bx - 8, gy - 96, bx + 14, gy - 106, "#ffcc88", 2))

    return "\n".join(pieces)


def main():
    out_dir = Path("assets/sora_kh1")
    out_dir.mkdir(parents=True, exist_ok=True)

    total_frames = sum(ACTIONS.values())
    svg_width = FRAME_W * total_frames
    svg_height = FRAME_H

    x_cursor = 0
    svg_parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{svg_width}" height="{svg_height}" viewBox="0 0 {svg_width} {svg_height}">']

    animations = {}

    for action, count in ACTIONS.items():
        frames = []
        for i in range(count):
            frames.append({"x": x_cursor, "y": 0, "w": FRAME_W, "h": FRAME_H})
            svg_parts.append(draw_frame(x_cursor, action, i, count))
            x_cursor += FRAME_W
        animations[action] = {"fps": 12, "frames": frames}

    svg_parts.append("</svg>")
    (out_dir / "sora_atlas.svg").write_text("\n".join(svg_parts), encoding="utf-8")

    pack = {
        "version": "1.0",
        "fighter": {
            "name": "Sora (Kingdom Hearts 1)",
            "prompt": "sora from kingdom hearts 1",
            "seed": 11111,
            "styleGuide": "Teen anime hero, spiky brown hair, black jacket, red shorts, yellow shoes, silver keyblade.",
        },
        "sheet": {
            "path": "sora_atlas.svg",
            "frameWidth": FRAME_W,
            "frameHeight": FRAME_H,
        },
        "animations": animations,
    }
    (out_dir / "sprite_pack.json").write_text(json.dumps(pack, indent=2), encoding="utf-8")
    print("Generated assets/sora_kh1/sora_atlas.svg and sprite_pack.json")


if __name__ == "__main__":
    main()
