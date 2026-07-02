# CLAUDE.md — Project memory for Nekromancer

## What this project is

A Diablo 3 clone played in the **Diablo 4 mobile / Diablo Immortal style**: top-down ARPG,
virtual joystick + skill-cluster touch controls, auto-aim, dark gothic aesthetic.
The first (and currently only) class is the Necromancer, deliberately renamed **Nekromancer**.

## Deployment — IMPORTANT

- GitHub Pages is configured to serve from **`main` branch, `/docs` folder**.
- The playable game therefore lives entirely in `docs/` (`docs/index.html` is the entry point).
- Live URL (case sensitive path — repo name is `Nekromancer` with capital N):
  **https://nors3ai.github.io/Nekromancer/**
- Anything merged to `main` inside `docs/` is live within minutes. Never move the game out
  of `docs/` without reconfiguring Pages.

## Workflow conventions agreed with the owner

- Develop on the designated `claude/...` session branch, then **open a PR and merge it to
  `main` ourselves** — the owner has asked Claude to perform the merge.
- Keep the README's "Play Game" link intact and case-correct.
- No build step, no dependencies, no binary assets: the game must stay pure HTML/CSS/JS that
  runs by opening `docs/index.html` from a static server (or file://).

## Architecture (docs/js/, plain script tags — load order matters)

| File | Responsibility |
|---|---|
| `utils.js` | math helpers (`rand`, `clamp`, `lerp`, `dist`, `lerpAngle`, `rr` rounded rect, `hash2`) |
| `audio.js` | `AudioSys` — all SFX synthesized with WebAudio (no audio files). `init()` must be called from a user gesture |
| `particles.js` | `Particles` (world-space particles, floating texts, expanding rings, screenshake) + `fx*` helpers (`fxBlood`, `fxBone`, `fxExplosion`, `fxNova`, `fxSummon`, `fxLevel`, `fxHeal`, `dmgText`) |
| `input.js` | `Input` — virtual joystick (left ~55% of screen), touch skill buttons, WASD/Space/1-4/mouse. Discrete presses are buffered in `Input.pendingSlots` so taps are never dropped between frames |
| `world.js` | `World` — 2600×2600 graveyard. Tiled procedural ground pattern, flat decos, tall colliding props (tombstones, pillars, dead trees, rune obelisks). `collide(entity)` does circle push-out. Props join the y-sorted draw pass via `propsInView()` |
| `entities.js` | `Player`, `Enemy` (+ `ENEMY_TYPES`: zombie, skeleton, ghoul, cultist, brute boss), `Minion` (skeletal warrior), `Corpse`, `Pickup` (gold / health orb / item), `Projectile` (shard / spear / enemy bolt) |
| `items.js` | `Items` + `RARITIES`/`ITEM_SLOTS` — loot with 4 rarities (Common/Magic/Rare/Legendary), wave-scaled affix rolls (dmg%, life, crit, essence/s, life/s), 3 equip slots (weapon/armor/ring). Better drops auto-equip; worse ones salvage into gold. `Items.apply()` recomputes the player's derived stats from base + gear |
| `skills.js` | `Skills` — slot 0 primary + 4 spenders, cooldowns, essence costs, auto-aim (`nearestEnemy`/`aimAngle`), procedural button icons |
| `ui.js` | `UI` — HUD (portrait, HP/Essence/XP bars, wave, gold), joystick ghost, skill buttons with radial cooldown sweeps, wave banner, menu & death screens. `UI.buttonAt(x,y)` is the touch hit-test used by Input |
| `game.js` | `Game` — rAF loop, states `menu`/`playing`/`over`, wave director (endless waves, brute boss every 5th), camera with lerp + shake, y-sorted compositing, vignette, low-HP heartbeat overlay |

### Key game rules

- Resource: **Essence** (max 100, regen 3.5/s, +3 per Bone Splinter hit, +20/+30 at wave start/clear).
- Every non-boss enemy leaves a **Corpse** (fuel for Corpse Explosion, decays ~14s).
- Skeletal warriors: max 4, 16s lifespan, oldest is replaced when re-summoning.
- Enemy stats scale per wave (`1 + 0.16·(wave-1)` HP etc.), spawn cap ~26 concurrent.
- Leveling: `xpNext = 50·level^1.45`, +12 base maxHP, +9% base damage, full heal per level.
  Level bonuses go to `baseMaxHp`/`baseDmg`; `Items.apply()` folds gear on top.
- Crits: `player.critChance` (10% base + gear), 1.8×, orange damage numbers.
- Loot: 4.5% drop chance per kill (bosses always drop, rare+). Item pickups render as
  rarity-colored diamonds with loot beams. Gear panel: tap portrait or press `I`.
- Persistence: best wave in `localStorage['nekromancer_best']` (shown on menu/death screen).
  Gear is per-run (roguelite).

### Rendering / style notes

- Everything is drawn with canvas vector calls — **no image assets**. Palette: dark
  purple-black ground `#16121b`, bone `#e8e0cc`, necro-teal glow `#6ff7c3`, blood red
  `#c22843`, gold `#ffd76a`. Georgia serif for all text.
- Entities are drawn rotated to face movement with a bobbing animation; y-sort gives the
  pseudo-depth. DPR capped at 2.

## Testing

Headless Playwright with the preinstalled Chromium
(`executablePath: '/opt/pw-browsers/chromium'`): load `docs/index.html` via `file://`,
click to start, drive with keyboard, assert `Game` state and zero console errors,
screenshot. A reference script lives in the session scratchpad (recreate as needed —
it is intentionally not committed).

## Roadmap ideas (not yet built)

- More Nekromancer skills / skill selection & rune variants
- Full inventory UI (manual equip/compare) on top of the auto-equip loot
- More classes (Barbarian, Sorcerer, ...), class select screen
- Persistent progression via localStorage (gold, unlocked skills)
- Bosses with mechanics (Butcher-style charge, ground telegraphs)
- Dungeon/rift structure instead of pure survival waves
