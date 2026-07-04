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
| `hero.js` | `Hero` — the persistent character: `name`, `eyeColor`, level/xp, gold, materials, gems, bag (`bagTier`→`BAG_SIZE`, base 24, purchasable up to 120 via `BAG_UPGRADES`/`buyBagUpgrade`), equipped, skill `loadout` (6 slots), `passives` (5 slots @ lvl 3/10/20/30/45), zone progress, difficulty, `riftsCleared`, `artisans` levels (smith/mystic/jeweler 1–10). `snapshot()/applySnapshot()`; autosave → `localStorage['nekromancer_hero_v1']`. **`Profiles`** — up to **3 concurrent character slots** (`nekromancer_profiles_v1`), chosen from the campfire select scene; `boot()` loads the roster, `Hero.save()` mirrors the active hero into its slot. Shared Stash (`nekromancer_stash_v1`) is common to all profiles. `Saves` — up to 20 named manual slots (`nekromancer_saves_v1`) |
| `input.js` | Twin-stick touch: left joystick moves, right-side drag aims (and fires primary), skill buttons tap = quick-cast / press-drag = directional cast, channel skills fire while held. All menu taps go through `UI.click()` registry. Keys: WASD, Space/J, 1-5, Q potion, I inventory, K skills, Esc |
| `world.js` | `World.generate(zone)` — two generators: `open` wilderness (props) and `dungeon` (rooms + corridors, real wall collision via cell grid, `CELL=48`). **Variable map size** (`zone.sizeMul` pins a land's character, else rolled per visit; W/H independent → sometimes rectangular). Open lands can carry **rivers** (`makeRivers`: curvy meandering polylines, `zone.rivers` count — length-capped so they never bisect the map, you can always walk around) crossed by **wooden bridges** (oriented plank decks) and **forests** (`makeForests`: dense tree groves you weave through, `zone.forest`). `inWater`/`onBridge`/`blockedTerrain` keep scenery/packs off the water & decks; `collide` blocks water except on a bridge; `isFloorAt` treats water as non-floor. Produces spawn, boss lair, packs, chests/shrines/urns, **one wandering vendor per land** (`vendorStock()`), exit portal, fog-of-war `explored` grid. `collide`, `projBlocked`, `dashPoint` |
| `entities.js` | `Player` (stats derived by `Items.apply()` — NOTE: constructor sets safe defaults; `Items.apply()` must be called AFTER `Game.player` is assigned; green `healText` on heal), `Enemy` (sleep/wake packs; **elite tiers** — normal `elite` = yellow outline, `rare` = purple/tougher/+loot, `unique`/boss = orange; curses; **boss ability kits** in `this.abilities` by type — charge/slam/nova/summon/fissures via `bossUpdate`; **Treasure Goblin** `goblin` flag: flees once hit, drips 1g/2s while chased, bursts gold+gems+rare gear on death; `hpMul`/`speedMul` opts), `Minion` (skeleton×7 permanent, mage×4 timed, golem, revived, simulacrum clone), `Corpse` (consume() honors corpse passives), `Pickup` (gold/orb/item/gem; legendary/set drops fire an orange/green light pillar + minimap star), `Projectile` (incl. homing lances/spirit) |
| `items.js` | generation (level-scaled affixes, sockets), `compareArrows` (console-style ▲▼), pickup/stash/equip, Blacksmith (salvage junk/rares → parts/dust/crystals/souls; `craft(slot, master)` — masterwork guarantees Rare+, 50% socket), Jeweler (combine 3→1, `combineAllGems`, `buyGem`, socket/unsocket), Mystic (`enchant(item, statKey)` rerolls the **player-chosen** affix; `enchantCost` escalates per enchant via `item.enchants`), `computeStats()` (player-independent, feeds the character sheet) + `apply()` |
| `skills.js` | `SKILL_FX` — behavior for all 21 actives; `Skills` runtime (per-id cooldowns, essence costs, Land of the Dead makes corpse skills free + spawns corpses, Simulacrum mirrors Bone Spear/Death Nova), `SKILL_ICONS` vector glyphs, passive hooks |
| `ui.js` | HUD: portrait+bars+gold, objective line + chevron pointing at bounty/portal (single compact line under the bars when `W<560`), fog-of-war minimap, boss bar, 6-slot radial skill cluster with cooldown sweeps, potion button (25s cd), menu button, toasts, banner. Tap-region registry (`UI.register`/`UI.click`) that all menus use; **`UI.overlayBarrier` makes hits registered before an overlay unreachable — the fix for tap-through**. `UI.screen` = active overlay. HUD respects iPhone safe-area insets (`Game.safe`, read from CSS `env()` vars in `Game.resize`) |
| `screens.js` | Full-screen menus: title, camp hub (hero strip taps into the **character sheet**: full stats via `Items.computeStats()`, reagents, and an `analyze()` tip list), waypoint map (difficulty stepper), **PS5-console-style radial equipment wheel** (11 slots in a circle → per-slot bag list with compare arrows → equip/salvage/socket; socketing opens `gemModal` — a CENTERED POPUP with tap-to-inspect gem chips, info card, SOCKET IT / UNSOCKET (free) / CANCEL; tap outside cancels only the popup), skills & passives assignment (grids adapt rows/columns to short screens), Blacksmith/Jeweler (tap a gem stack to inspect before combining)/Mystic, **vendor shop** (pauses the crawl; buy with upgrade/sidegrade hints), pause, death, bounty-reward cache. `fitText`/`wrapText` keep text on-screen on phones |
| `game.js` | Adventure flow: `menu → camp → map → playing → camp`. **Multi-area journeys** (`stage`/`stageCount`/`journeyIdx`): bounties & Adventure span 2–3 linked procedural maps — intermediate areas are gated by a **champion** guardian whose death opens a **descent** portal (`this.descend` → `nextStage()` rebuilds a fresh map, carrying HP/essence), the FINAL area holds the land's named unique boss whose portal → `completeZone()` (Horadric cache, reward screen). Rifts stay one endless map (`stageCount=1`). `onBossDead` opens the portal (descent vs complete by `finalStage`). Death → respawn at entrance or camp. Telegraph + aim-indicator rendering. Menus pause gameplay |

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
- **Stats/gems (owner rules):** `armor` affix + Diamond gem (`stat:'armor'`) → damage
  reduction `armor/(armor+67000)` capped 80% (applied in `Player.hurt`) — a big
  fixed denominator so low armor barely helps (201 armor ≈ 0.3%, you're squishy)
  and only hundreds-of-thousands of armor is tanky (owner rule). Boots can
  roll a `move` affix (1–25%, boots-only, flat) → `Player.speed = 180·(1+move)`. A
  **Perfect-tier gem in ANY slot = +20% damage** (per gem). A **Ruby in the HELM** gives
  **+3%→+20% XP** (by tier) instead of its damage (feeds `Hero.addXP` via `player.xpBonus`).
  An **Emerald in the BOOTS** grants **+20% movement speed** (flat, per gem) instead of crit.
  Ruby-in-weapon +25% dmg and the lvl70 weapon retune (emerald ×1.2 / ruby ×0.95) remain.
- Salvage yields (`Items.salvageYield`): Common→Reusable Parts, Magic→Arcane Dust,
  Rare→Veiled Crystals, Legendary/Set→Forgotten Souls (1/2). **Artifacts →
  Forgotten Souls scaling with star tier: 3 at 0★, +1 per star up to 8 at 5★ (owner
  rule).** Gems survive the forge. **Two salvage paths (owner
  rule): (1) INDIVIDUAL breakdown from the Inventory wheel is always free at any
  level for any rarity (`canSalvage` always true). (2) The BLACKSMITH's bulk
  "ease of access" salvage is gated by SMITH LEVEL for the finest gear —
  Epics from smith **8**, Legendaries/Sets from smith **10**
  (`BULK_SALVAGE_SMITH`, `salvageEpics`/`salvageLegendaries`); common/magic
  (`salvageJunk`) and rares (`salvageRares`) are always available.**
- **Blacksmith forges by SMITH LEVEL, not hero level (owner spec, `SMITH_RANGE`/
  `smithRange`)**: L1 makes lvl 1–5 gear, L2 6–10, L3 11–20, L4 21–30, L5 31–40,
  L6 41–50, L7 51–60, L8 51–60 (unlocks epic salvage), L9 61–70, L10 61–70
  (unlocks legendary salvage). `craft()` rolls `craftLvl` inside that band; the
  forge screen shows the current band.
- Potion button sits ON the skill-cluster arc past slot 1 (angle π·0.98, radius R+54·scale)
  — verified non-overlapping at 390×750 / 844×390 / 900×500 / 1280×720.
- XP: `60·lvl^1.5`, cap 70. Level-up = full heal + toasts for new unlocks.
- Difficulty unlocks: up to Master until all 5 lands cleared, then Torment I–III.
- **Artisan resource lanes (owner rule)**: Blacksmith = gold/parts/dust/crystals;
  Mystic = gold + Forgotten Souls ONLY; Jeweler = gold + gems ONLY. Unsocketing is
  free (Jeweler has an UNSOCKET row); salvage always returns socketed gems.
- **Mystic reroll = TARGETED, not gambling (owner rule)**: every rerollable affix
  belongs to a GROUP (`AFFIX_GROUPS` — Offense: dmg/crit/ess · Defense: hp/armor/reg
  · Utility: gold/move) and a reroll can only land within that group; the Mystic UI
  shows the EXACT equal odds for each outcome PLUS the value range it can roll
  (`enchantOutcomes` + `Items.affixRange` → "rolls min–max (max) · yours X") so the
  player sees how close to perfect they are. The Mystic detail view scrolls (drag
  the middle; cost + REROLL pinned as a footer) via the shared
  `UI.sel.scrollRegion`/`scrollY`/`scrollMax` drag-scroll (also used by the inventory).
  Signature legendary affixes (`dnova`/`area`, no group) are locked. Gold cost
  starts at **50g** and climbs ~1.42× per enchant (`enchantCost` — ~15–20 rolls to
  reach the tens of thousands, softened by mystic training). Souls are charged ONLY
  on legendary-and-above, a flat per-tier toll (`mysticSoulCost`): Set 1 · Legendary
  1–4 by ★ · Artifact 5–10 by ★.
- **Menus NEVER close from stray taps (owner rule)**: `UI.click()` swallows every
  unmatched tap while a screen is open. The only ways out are the red ✕
  (`Screens.closeX`, present on every screen incl. the gem popup), the Escape key,
  or a screen's own buttons (CANCEL / LEAVE / RESUME / reward's button).
- **THE WILDS** (camp hub menu) holds all game modes: Bounties (the renamed waypoint
  map), Adventure Mode (`makeAdventureZone()`: randomized land at hero level),
  normal Rifts (`Game.startRift('normal')`, levels 1–69, Guardians drop **Rift Keys**
  45%), Nephalem Rifts (`'greater'`, level 70, consumes `Hero.riftKeys`), Seasons.
- **Rarity indexes: 0 Common · 1 Magic · 2 Rare · 3 Epic · 4 Legendary · 5 Set ·
  6 Artifact (red).** Items carry a **star tier** (`item.stars`, shown as ★,
  +1 affix each) and the lowest common is grey **trash** (`item.trash`). Saves
  migrated via `Hero.migrate` (SAVE_VERSION 3).
- **Drop table (owner spec)** — `Items.rollRarity` returns the BASE rarity only,
  interpolated Normal→T16 from `DROP_N`/`DROP_T`/`DROP_MAP` (7 entries: trash,
  common, magic, rare, epic, legendary, artifact): **Normal** trash 3 · common 50
  · magic 25 · rare 15 · epic 5 · legendary 2; **T16** trash 0 · common/magic/rare
  15 · epic 20 · legendary 30 · artifact 5. **Star tiers are gated by Torment
  band, NOT rolled here** (`tormentTier(di)` → 0/1–16):
  - `legendaryStars(tt)`: 1★ **T3–T7** · 2★ **T8–T13** · 3★ **T14–T16** (0★ below T3).
  - Artifacts drop **ONLY at T16** (below T16 the artifact slice rolls up as a
    legendary). `artifactStars()`: 1★ 10% · 2★ 7% · 3★ 5% · 4★ 3% · 5★ 1% (else 0★).
  - **Gem drops** (`Items.dropGem`/`dropGemTier` — monster/chest/cache, NOT the
    Jeweler): below Torment → Chipped/Flawed/Regular (0–2) · **T1–T10** Flawless (3)
    · **T11–T16** Perfect (4). Gems drop ~5% on their own roll.
- **Torment I–XVI unlock at level 70** (`DIFFICULTIES` = 20 tiers, generated;
  `legBonus` +1%…+33.3%). Stepper caps at Master below 70.
- **Named power items in the wild (owner rule)**: `WILD_POWER_KEYS` (funeraryPick,
  ironRose, coe, krysbin, bloodtide, cycleScythe, royalGrandeur) also seep into
  wild loot — `Items.wildDrop()` makes ~10% of T1–T16 monster/chest drops a named
  legendary. `generatePowerItem(mLvl, key, tiered=true)` scales it by Torment via
  `tieredStars()`: legendary bands below T16, **full artifact grade (0–5★) at T16**.
  Wild drop sites (Enemy.die, chests, breakables) call `wildDrop`; caches/act-boss
  drops stay untiered.
- **Set items are SEASON-ONLY (owner rule)**: `generateSetPiece` runs only in
  season rifts (+ Haedrig's Gift dev cheat) — Nephalem/greater Guardians now drop a
  tiered named legendary instead. Set pieces carry a `tieredStars()` star tier so
  they scale legendary→artifact-5★ by Torment (each star = +1 affix + a power bump).
- **Endgame (level 70)**: Nephalem Rift Guardians drop legendaries (leg chance 5%→30%
  by Torment) and tiered named powers. Set bonuses hook: skills.js `boneArmor`
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

- **⭐ OWNER TODO (requested 2026-07-03): HORADRIC'S CUBE — a legendary tool
  (game system) the player FINDS in Act Three.** Flesh out: how it's found (Act 3
  boss/quest drop), what it does (D3 Kanai's Cube-style: extract legendary powers
  to a passive bank, reforge/upgrade/convert items and gems, transmute recipes),
  its own crafting UI, and how extracted powers integrate with `p.powers`.
- **⭐ OWNER TODO (requested 2026-07-03): big meta features —** Story Mode
  (campaign narrative/quests), Achievements + Titles (earned, shown on the hero),
  ~~Character NAME CREATION~~ (DONE — name + glowing-eye colour chosen on New Game
  via `Screens.create`; `Hero.name`/`Hero.eyeColor`), SAVE/LOAD OVERHAUL (robust
  multi-character profiles, cloud-ish export/import, migration), and GRAPHICS &
  SOUND additions (richer sprites/FX/music/ambience beyond the current procedural set).
- **⭐ OWNER TODO (requested 2026-07-04): a walkable MAIN TOWN.** Instead of the
  menu-hub camp, the hero walks around a real town and steps up to NPC artisans —
  the Blacksmith, the Mystic and the Jeweler (and likely the Stash/Wilds portal) —
  to open each one. Flesh out: town map/layout, NPC placement + interaction radius,
  how it replaces (or wraps) the current `Screens.camp` hub, and camp↔town↔zone flow.
- **⭐ OWNER TODO (requested 2026-07-03): create the MASTER LIST of primary +
  secondary stats and affixes for items.** The engine currently models only:
  `dmg` (%), `hp`, `crit` (chance), `ess` (essence/s), `reg` (life/s), `gold`,
  `armor`, `move` (boots), `dnova` (Death Nova %), `area` (Area Damage). D3 items
  reference stats we DON'T have yet — **Attack Speed, Life per Hit, Intelligence,
  Crit Damage, Vitality, resource cost reduction, cooldown reduction** — so items
  like The Royal Grandeur are placed with in-engine stand-in affixes. Define the
  full stat/affix taxonomy (which are primary vs secondary, roll ranges by ilvl,
  which slots) before adding more authentic D3 items.
- Skill runes (D3 has 5 per skill), set items with set bonuses
- Kanai's Cube (extract legendary powers), legendary gems
- More bounty types (Clear / Event), Nephalem/Greater Rifts as endgame
- More classes (Barbarian…) with class select
- Followers, town NPCs as walkable camp instead of menu hub
