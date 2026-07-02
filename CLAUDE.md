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
- **Update `PATCH_NOTES` (data.js) with EVERY addition and bug fix** — prepend a new
  entry (newest first) and bump `GAME_VERSION` (vX.Y.Z-alpha). The version label on
  the title screen opens the notes; the owner reads them.

## Architecture (docs/js/, plain script tags — load order matters)

| File | Responsibility |
|---|---|
| `utils.js` | math helpers (`rand`, `clamp`, `lerp`, `dist`, `lerpAngle`, `rr`, `hash2`, `wrapText`) |
| `settings.js` | `Settings` — 5 audio channels (master/sfx/music/ambience/weather, each volume+mute) and DI-style gameplay toggles (damage numbers, shake, health bars, aim indicator, fixed joystick, low FX, big minimap, FPS). Persisted separately from the hero |
| `audio.js` | `AudioSys` — all SFX synthesized with WebAudio, mixed through per-channel gains. Generative dark-ambient music loop, per-zone ambience beds (wilds/crypt/camp), weather loops (rain/wind). `init()` needs a user gesture |
| `particles.js` | `Particles` (particles, floating texts, rings, screenshake) + `fx*` helpers |
| `data.js` | ALL static data: `SKILL_DATA` (the 21 real D3 necro actives w/ real unlock levels), `PASSIVE_DATA` (12), `ZONES` (5 lands, some with `weather`), `MONSTERS`, `RARITIES` (incl. index 4 = Set, green), `ITEM_SLOTS` (**11** equip slots incl. shoulders/legs), `GEM_TYPES`/`GEM_TIERS`, `MATERIALS`, `DIFFICULTIES`, `XP_CURVE`, `GAME_VERSION`/`PATCH_NOTES`, `SEASON`/`INARIUS_SET`/`LEGENDARY_POWERS`, `makeRiftZone()` |
| `hero.js` | `Hero` — the persistent character: level/xp, gold, materials, gems, bag (24), equipped, skill `loadout` (6 slots), `passives` (4 slots @ lvl 10/20/30/45), zone progress, difficulty, `riftsCleared`, `artisans` levels (smith/mystic/jeweler 1–100). `snapshot()/applySnapshot()`; autosave → `localStorage['nekromancer_hero_v1']`. `Saves` — up to 20 named manual slots (`nekromancer_saves_v1`), named via `window.prompt` |
| `input.js` | Twin-stick touch: left joystick moves, right-side drag aims (and fires primary), skill buttons tap = quick-cast / press-drag = directional cast, channel skills fire while held. All menu taps go through `UI.click()` registry. Keys: WASD, Space/J, 1-5, Q potion, I inventory, K skills, Esc |
| `world.js` | `World.generate(zone)` — two generators: `open` wilderness (props) and `dungeon` (rooms + corridors, real wall collision via cell grid, `CELL=48`). Produces spawn, boss lair, packs, chests/shrines/urns, **one wandering vendor per land** (`vendorStock()`: 5 items, good-to-crap spread, priced by score/rarity), exit portal, fog-of-war `explored` grid for the minimap. `collide`, `projBlocked`, `dashPoint` (Blood Rush through walls) |
| `entities.js` | `Player` (stats derived by `Items.apply()` — NOTE: constructor sets safe defaults; `Items.apply()` must be called AFTER `Game.player` is assigned), `Enemy` (sleep/wake packs, elites, curses, telegraphed boss charge+slam, bounty uniques), `Minion` (skeleton×7 permanent, mage×4 timed, golem, revived, simulacrum clone), `Corpse` (consume() honors corpse passives), `Pickup` (gold/orb/item/gem), `Projectile` (incl. homing lances/spirit) |
| `items.js` | generation (level-scaled affixes, sockets), `compareArrows` (console-style ▲▼), pickup/stash/equip, Blacksmith (salvage junk/rares → parts/dust/crystals/souls; `craft(slot, master)` — masterwork guarantees Rare+, 50% socket), Jeweler (combine 3→1, `combineAllGems`, `buyGem`, socket/unsocket), Mystic (`enchant(item, statKey)` rerolls the **player-chosen** affix; `enchantCost` escalates per enchant via `item.enchants`), `computeStats()` (player-independent, feeds the character sheet) + `apply()` |
| `skills.js` | `SKILL_FX` — behavior for all 21 actives; `Skills` runtime (per-id cooldowns, essence costs, Land of the Dead makes corpse skills free + spawns corpses, Simulacrum mirrors Bone Spear/Death Nova), `SKILL_ICONS` vector glyphs, passive hooks |
| `ui.js` | HUD: portrait+bars+gold, objective line + chevron pointing at bounty/portal (single compact line under the bars when `W<560`), fog-of-war minimap, boss bar, 6-slot radial skill cluster with cooldown sweeps, potion button (25s cd), menu button, toasts, banner. Tap-region registry (`UI.register`/`UI.click`) that all menus use; **`UI.overlayBarrier` makes hits registered before an overlay unreachable — the fix for tap-through**. `UI.screen` = active overlay. HUD respects iPhone safe-area insets (`Game.safe`, read from CSS `env()` vars in `Game.resize`) |
| `screens.js` | Full-screen menus: title, camp hub (hero strip taps into the **character sheet**: full stats via `Items.computeStats()`, reagents, and an `analyze()` tip list), waypoint map (difficulty stepper), **PS5-console-style radial equipment wheel** (11 slots in a circle → per-slot bag list with compare arrows → equip/salvage/socket; socketing opens `gemModal` — a CENTERED POPUP with tap-to-inspect gem chips, info card, SOCKET IT / UNSOCKET (free) / CANCEL; tap outside cancels only the popup), skills & passives assignment (grids adapt rows/columns to short screens), Blacksmith/Jeweler (tap a gem stack to inspect before combining)/Mystic, **vendor shop** (pauses the crawl; buy with upgrade/sidegrade hints), pause, death, bounty-reward cache. `fitText`/`wrapText` keep text on-screen on phones |
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
  Legendary→Forgotten Souls (gems survive the forge). **Salvage is free and
  unrestricted — any rarity crushes at any level, no gold cost (`canSalvage`
  always true). The old epic@60/legendary@70 level-gate was removed (owner rule).**
- Potion button sits ON the skill-cluster arc past slot 1 (angle π·0.98, radius R+54·scale)
  — verified non-overlapping at 390×750 / 844×390 / 900×500 / 1280×720.
- XP: `60·lvl^1.5`, cap 70. Level-up = full heal + toasts for new unlocks.
- Difficulty unlocks: up to Master until all 5 lands cleared, then Torment I–III.
- **Artisan resource lanes (owner rule)**: Blacksmith = gold/parts/dust/crystals;
  Mystic = gold + Forgotten Souls ONLY; Jeweler = gold + gems ONLY. Unsocketing is
  free (Jeweler has an UNSOCKET row); salvage always returns socketed gems.
- Enchant gold cost is rarity-scaled (0.4/0.6/1.0/1.6/1.8 ×) over a low base
  (80 + 28·mLvl) so early commons cost tens of gold, not hundreds (owner rule).
- **Menus NEVER close from stray taps (owner rule)**: `UI.click()` swallows every
  unmatched tap while a screen is open. The only ways out are the red ✕
  (`Screens.closeX`, present on every screen incl. the gem popup), the Escape key,
  or a screen's own buttons (CANCEL / LEAVE / RESUME / reward's button).
- **THE WILDS** (camp hub menu) holds all game modes: Bounties (the renamed waypoint
  map), Adventure Mode (`makeAdventureZone()`: randomized land at hero level),
  normal Rifts (`Game.startRift('normal')`, levels 1–69, Guardians drop **Rift Keys**
  45%), Nephalem Rifts (`'greater'`, level 70, consumes `Hero.riftKeys`), Seasons.
- **Rarity indexes: 0 Common · 1 Magic · 2 Rare · 3 EPIC · 4 Legendary · 5 Set.**
  Saves are migrated via `Hero.migrate` (SAVE_VERSION 2). Owner drop table in
  `Items.rollRarity`: magic 20% · rare 12% · epic 7% (incl. the 4% overlap) ·
  legendary by HERO level (1% / 2.29% @60 / 2.89% @70) + Torment legBonus;
  common/trash absorbs the remainder.
- **Torment I–XVI unlock at level 70** (`DIFFICULTIES` = 20 tiers, generated;
  `legBonus` +1%…+33.3%). Stepper caps at Master below 70.
- **Endgame (level 70)**: Nephalem Rift Guardians drop guaranteed `INARIUS_SET`
  pieces (scaling via `Hero.riftsCleared`). Set bonuses hook: skills.js `boneArmor`
  (2/4pc) + Player.update bone tornado (6pc, `vulnT` on victims); `LEGENDARY_POWERS`
  checked via `p.powers` (bloodtide in deathNova, krysbin/corrodedFang in Enemy.hurt).
- Patch notes screen shows FULL wrapped note text with ▲/▼ scrolling — never
  ellipsize or clip notes (owner rule).
- **Dev panel**: tap the developer credit on the title screen → confirm toggle →
  cheats (god, infinite essence — session-only on `Game.cheats`; grants save).
  Game version label (bottom-right of title) opens `PATCH_NOTES`.

## GitHub Pages deployment ops (learned 2026-07-02)

- The "pages build and deployment" workflow is **GitHub's managed one**
  (`dynamic/pages/pages-build-deployment`) — the repo has NO workflows of its own.
  The "Node.js 20 deprecated" notice comes from GitHub's pinned actions inside it;
  it is informational and nothing in this repo can or needs to change for it.
- Deploy failures showing `Current status: deployment_queued` → `Timeout reached,
  aborting!` are GitHub-side Pages queue congestion (seen when several merges land
  minutes apart). Commits/pushes/merges still worked; the site just stayed on the
  previous version. Recovery: it self-heals on the next push, or re-run the failed
  run from the Actions tab. Avoid merging several PRs back-to-back when possible.
- **The Pages source is now "GitHub Actions"** (owner flipped it in Settings on
  2026-07-02 ~16:30 UTC). Consequences: GitHub's managed `pages build and
  deployment` no longer runs, and `.github/workflows/pages.yml` is the ONLY
  deployer — never delete it while the source is set to GitHub Actions, or
  nothing deploys at all. (Deleting it was briefly done that day; the site froze.)
- History of the trap, for the record: while the source was still "Deploy from a
  branch", workflow-submitted deployments sat in `deployment_queued` forever
  (three runs, ~30 min, zero progress) and the deploy step's timeout CANCELLED
  the shared deployment, killing the managed branch deploy for the same commit —
  the live site stayed pinned on v0.0.4 all afternoon. A custom deploy-pages
  workflow and branch-source Pages must never coexist.
- Claude's token cannot re-run failed Actions runs, dispatch workflows, or read
  repo Settings (403) — recovering a failed deploy means merging a new commit,
  or the owner clicking re-run in the Actions tab.

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
