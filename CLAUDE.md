# CLAUDE.md — Project memory for Nekromancer

## What this project is

A **Diablo 3 clone: a dungeon-crawling adventure ARPG** in the Diablo 4 mobile /
Diablo Immortal control style. NOT a wave-defense game — the owner explicitly rejected
that. The hero (the **Nekromancer**, D3 Necromancer with the authentic skill kit)
travels through lands via a waypoint map, fights pre-placed monster packs, loots
chests, completes a "slay the unique" bounty per land, and returns to camp to spend
loot at the artisans. The hero is persistent (localStorage).

## Deployment — IMPORTANT

- GitHub Pages serves from **`main` branch, `/docs` folder**.
- `docs/index.html` is the entry point; everything the game needs lives in `docs/`.
- Live URL (path is case sensitive, capital N):
  **https://nors3ai.github.io/Nekromancer/**
- Anything merged to `main` inside `docs/` is live within minutes.

## Workflow conventions agreed with the owner

- Develop on the designated `claude/...` session branch, open a PR and **merge it
  ourselves** — the owner asked Claude to perform merges.
- Keep the README "Play Game" link intact and case-correct.
- Pure HTML/CSS/JS, no build step, no dependencies, no binary assets. Everything
  (sprites, map, sounds) is procedural.

## Architecture (docs/js/, plain script tags — load order matters)

| File | Responsibility |
|---|---|
| `utils.js` | math helpers (`rand`, `clamp`, `lerp`, `dist`, `lerpAngle`, `rr`, `hash2`) |
| `audio.js` | `AudioSys` — all SFX synthesized with WebAudio. `init()` needs a user gesture |
| `particles.js` | `Particles` (particles, floating texts, rings, screenshake) + `fx*` helpers |
| `data.js` | ALL static data: `SKILL_DATA` (the 21 real D3 necro actives w/ real unlock levels), `PASSIVE_DATA` (12), `ZONES` (5 lands), `MONSTERS`, `RARITIES`, `ITEM_SLOTS` (9 equip slots), `GEM_TYPES`/`GEM_TIERS`, `MATERIALS`, `DIFFICULTIES` (Normal→Torment III), `XP_CURVE` |
| `hero.js` | `Hero` — the persistent character: level/xp, gold, materials, gems, bag (24), equipped, skill `loadout` (6 slots), `passives` (4 slots @ lvl 10/20/30/45), zone progress, difficulty. `save()/load()` → `localStorage['nekromancer_hero_v1']` |
| `input.js` | Twin-stick touch: left joystick moves, right-side drag aims (and fires primary), skill buttons tap = quick-cast / press-drag = directional cast, channel skills fire while held. All menu taps go through `UI.click()` registry. Keys: WASD, Space/J, 1-5, Q potion, I inventory, K skills, Esc |
| `world.js` | `World.generate(zone)` — two generators: `open` wilderness (props) and `dungeon` (rooms + corridors, real wall collision via cell grid, `CELL=48`). Produces spawn, boss lair, packs, chests/shrines/urns, exit portal, fog-of-war `explored` grid for the minimap. `collide`, `projBlocked`, `dashPoint` (Blood Rush through walls) |
| `entities.js` | `Player` (stats derived by `Items.apply()` — NOTE: constructor sets safe defaults; `Items.apply()` must be called AFTER `Game.player` is assigned), `Enemy` (sleep/wake packs, elites, curses, telegraphed boss charge+slam, bounty uniques), `Minion` (skeleton×7 permanent, mage×4 timed, golem, revived, simulacrum clone), `Corpse` (consume() honors corpse passives), `Pickup` (gold/orb/item/gem), `Projectile` (incl. homing lances/spirit) |
| `items.js` | generation (level-scaled affixes, sockets), `compareArrows` (console-style ▲▼), pickup/stash/equip, Blacksmith (salvage by rarity → parts/dust/crystals/souls, craft), Jeweler (combine 3→1, socket/unsocket), Mystic (`enchant` rerolls one affix), `apply()` derives player stats from Hero level + gear + gems |
| `skills.js` | `SKILL_FX` — behavior for all 21 actives; `Skills` runtime (per-id cooldowns, essence costs, Land of the Dead makes corpse skills free + spawns corpses, Simulacrum mirrors Bone Spear/Death Nova), `SKILL_ICONS` vector glyphs, passive hooks |
| `ui.js` | HUD: portrait+bars+gold, objective line + chevron pointing at bounty/portal, fog-of-war minimap, boss bar, 6-slot radial skill cluster with cooldown sweeps, potion button (25s cd), menu button, toasts, banner. Tap-region registry (`UI.register`/`UI.click`) that all menus use. `UI.screen` = active overlay |
| `screens.js` | Full-screen menus: title, camp hub, waypoint map (difficulty stepper), **PS5-console-style radial equipment wheel** (9 slots in a circle → per-slot bag list with compare arrows → equip/salvage/socket), skills & passives assignment, Blacksmith/Jeweler/Mystic, pause, death, bounty-reward cache |
| `game.js` | Adventure flow: `menu → camp → map → playing → camp`. `startZone(idx)` builds the land + packs + unique boss; `onBossDead` opens the portal; walking in → `completeZone()` (Horadric cache: gold/mats/gem/item, unlock next land, reward screen). Death → respawn at entrance or return to camp. Telegraph + aim-indicator rendering. Menus pause gameplay |

### Key game rules

- **Essence**: 100 max (+40 with Overwhelming Essence), tiny 2/s regen — primaries
  (Bone Spikes +18, Grim Scythe +12/hit, Siphon Blood channel) generate it, D3-style.
- **Skill unlocks use the real D3 levels** (Bone Spikes 1 … Land of the Dead 38,
  Simulacrum 61). Loadout = 6 slots, elective (any skill any slot). Tapping an
  assigned skill again clears it. `Hero.sanitize()` drops locked skills.
- Corpses: every kill leaves one (fuel for Corpse Explosion/Lance/Devour/Revive).
- Monster scaling: `(1+0.20·(mLvl−1)) × difficulty.mult`; `mLvl = zone.mLvl + 6·difficulty`.
- Packs sleep until the player is within ~440px (or they're hurt).
- Items: 9 slots, affix count = rarity, socket chance by rarity, gems 5 types × 5 tiers.
- Salvage yields: Common→Reusable Parts, Magic→Arcane Dust, Rare→Veiled Crystals,
  Legendary→Forgotten Souls (gems survive the forge).
- XP: `60·lvl^1.5`, cap 70. Level-up = full heal + toasts for new unlocks.
- Difficulty unlocks: up to Master until all 5 lands cleared, then Torment I–III.

## Testing

Headless Playwright with the preinstalled Chromium
(`executablePath: '/opt/pw-browsers/chromium'`), `file://` load. The reference
script drives: title→camp→map→zone via real taps, combat via keyboard, then
`page.evaluate` for deep checks (all 21 `SKILL_FX` castable, artisan ops, boss→
portal→reward, dungeon walls, reload persistence). Assert zero console errors.
Script lives in the session scratchpad (intentionally not committed).

## Roadmap ideas (not yet built)

- Skill runes (D3 has 5 per skill), set items with set bonuses
- Kanai's Cube (extract legendary powers), legendary gems
- More bounty types (Clear / Event), Nephalem/Greater Rifts as endgame
- More classes (Barbarian…) with class select
- Followers, town NPCs as walkable camp instead of menu hub
