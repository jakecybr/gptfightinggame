# AI Sprite Pipeline (Production-Ready Approach)

If your goal is **easy workflow + correct-looking assets + reliable animation**, use a two-model pipeline with validation gates.

## Recommended architecture

1. **LLM (design brain)**
   - Input: user prompt.
   - Output (strict JSON):
     - canonical character design sheet (silhouette, outfit, colors, weapon, constraints)
     - animation action list and motion notes per action
     - negative constraints ("do not change hair", "always left-facing base", etc.)

2. **Image model (asset renderer)**
   - Generate one **reference turnaround** (front/side/pose anchor) first.
   - Generate **keyframes** per action using the same seed + reference image conditioning.
   - Inpaint/fix pass for consistency drift.

3. **Post-process tooling (deterministic)**
   - Normalize to pixel/canvas dimensions.
   - Remove background / alpha cleanup.
   - Pack into atlas and write `sprite_pack.json` metadata.

4. **Validation gates (must pass)**
   - schema validation (`schemas/sprite_pack.schema.json`)
   - gameplay validation (`tools/validate_sprite_pack.py`)
   - visual diff checks between neighboring frames (avoid wild jumps)

5. **Runtime integration**
   - Game loads atlas + metadata, not raw prompts.
   - Keep prompt + seed + model version in metadata for reproducibility.

---

## Why this works better than one-shot "make me sprites"

One-shot image generation often fails at:
- costume consistency
- body proportions between frames
- action readability
- transparent backgrounds

The pipeline above solves this by splitting concerns:
- LLM locks spec,
- image model renders,
- deterministic tools enforce quality,
- validator blocks broken assets.

---

## Practical model options

### Local-first (best for control)
- SDXL / Flux with ControlNet + IP-Adapter for reference locking.
- Optional AnimateDiff for interim motion frames.

### API-first (best for simplicity)
- Any modern image API that supports:
  - image-to-image conditioning,
  - masked edits/inpainting,
  - fixed seed,
  - transparent output or clean segmentation workflow.

---

## "Correct assets" checklist (non-negotiable)

- [ ] all required actions exist: idle/run/jump/light/heavy/special/block/hit
- [ ] frame size consistent across all actions
- [ ] same head/body silhouette across all frames
- [ ] weapon position follows action intent
- [ ] transparency/alpha is clean (no halos)
- [ ] atlas bounds valid
- [ ] naming/metadata includes prompt, seed, model version

---

## Suggested generation flow for your app

1. User enters prompt.
2. LLM returns `character_spec.json`.
3. Asset worker renders keyframes from spec.
4. Packer builds atlas + `sprite_pack.json`.
5. Run validator.
6. If pass -> load in game.
7. If fail -> auto-regenerate only failed actions.

This keeps it simple for users while still enforcing quality.
