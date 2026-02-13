# AI Fighter Forge

A simple 2D browser fighting game prototype inspired by Super Smash Flash, focused on **AI-driven fighter generation**.

## What this prototype does

- Takes a natural-language fighter prompt.
- Converts it into deterministic fighter generation data (style, stats, animation frame counts).
- Spawns a playable fighter from that generated data.
- Renders simple sprites and animation states on a canvas stage.
- Runs a complete 1v1 loop with movement, jumping, light/heavy attacks, and HP bars.

## Run

Because this is plain HTML/CSS/JS, you can run it with any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- `A` / `D` - move
- `W` - jump
- `J` - light attack
- `K` - heavy attack

## Notes

This version uses a local deterministic generator (prompt -> seed -> fighter manifest) so it works without API keys.
You can later swap `generateFighterFromPrompt()` in `app.js` with an LLM or image model pipeline to output true authored spritesheets.
