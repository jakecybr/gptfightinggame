# AI Fighter Forge Deluxe

A local-only, for-fun 2D fighting game sandbox inspired by Smash-style combat, focused on **AI-style character generation from prompts**.

## What's upgraded

- Two-prompt fighter generation (player + enemy).
- Richer prompt parser that maps keywords into archetype, stats, style, and gear motifs.
- Dynamic sprite-sheet generation per fighter (idle/run/jump/light/heavy/special/block/hit) rendered directly from prompt-derived data.
- Dynamic stage generation from fighter seeds.
- Enhanced combat: light/heavy/special attacks, block state, knockback, super meter, particles, screen shake.
- Match flow: rounds, timer, win tracking (best-of-3).
- Usability features: random prompts, aim assist toggle, bot difficulty slider, hitbox toggle.
- Import/export JSON so you can save/load prompt setups.
- One-command launcher scripts.

## Quick start (recommended)

```bash
./run_game.sh
```

Or:

```bash
python3 launch_game.py
```

Then open the shown localhost URL.

### Sora quick test

Use this exact prompt to load the built-in KH1-inspired sprite pack:

- `sora from kingdom hearts 1`

When that prompt is used, the game loads `assets/sora_kh1/sprite_pack.json` + `sora_atlas.svg` instead of procedural sprites.

## Controls

- `A` / `D`: Move
- `W`: Jump
- `J`: Light attack
- `K`: Heavy attack
- `L`: Special attack (uses super meter)
- `Shift`: Block


## Real AI-generated sprites (best path)

If you want high-quality, consistent character assets, use the pipeline guide:

- `docs/AI_SPRITE_PIPELINE.md` for the full architecture and quality gates.
- `schemas/sprite_pack.schema.json` for required metadata format.
- `tools/create_sprite_pack_template.py` to scaffold a valid sprite pack JSON.
- `tools/validate_sprite_pack.py` to reject broken/inconsistent packs before import.

Example:

```bash
python3 tools/create_sprite_pack_template.py --name "Nova Striker" --prompt "cyber fox samurai" --out /tmp/sprite_pack.json
python3 tools/validate_sprite_pack.py /tmp/sprite_pack.json
```

## Launcher options

```bash
python3 launch_game.py --port 5000 --no-browser
```

## Project layout

- `index.html` — UI layout and game canvas.
- `style.css` — visual theme and responsive controls panel.
- `app.js` — generation logic, gameplay systems, rendering, import/export.
- `launch_game.py` + `run_game.sh` — easy local launch.
- `assets/sora_kh1` — built-in KH1-inspired Sora sprite pack (atlas + metadata).

## Notes

This project is fully local and deterministic (no API keys). If you want real AI sprite-sheet/model generation later, replace or extend `generateFighterFromPrompt()` and its rendering pipeline in `app.js`.


## Git workflow (simple)

This repo can be worked on directly in `main` locally. If you connect a GitHub remote, you can push straight to main:

```bash
git push origin main
```
