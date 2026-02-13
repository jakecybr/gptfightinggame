# AI Fighter Forge Deluxe

A local-only, for-fun 2D fighting game sandbox inspired by Smash-style combat, focused on **AI-style character generation from prompts**.

## What's upgraded

- Two-prompt fighter generation (player + enemy).
- Richer prompt parser that maps keywords into archetype, stats, style, and gear motifs.
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

## Controls

- `A` / `D`: Move
- `W`: Jump
- `J`: Light attack
- `K`: Heavy attack
- `L`: Special attack (uses super meter)
- `Shift`: Block

## Launcher options

```bash
python3 launch_game.py --port 5000 --no-browser
```

## Project layout

- `index.html` — UI layout and game canvas.
- `style.css` — visual theme and responsive controls panel.
- `app.js` — generation logic, gameplay systems, rendering, import/export.
- `launch_game.py` + `run_game.sh` — easy local launch.

## Notes

This project is fully local and deterministic (no API keys). If you want real AI sprite-sheet/model generation later, replace or extend `generateFighterFromPrompt()` and its rendering pipeline in `app.js`.
