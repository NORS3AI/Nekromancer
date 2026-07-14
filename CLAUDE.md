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
- Pure HTML/CSS/JS, no build step, no dependencies. Sprites, map and sounds are
  procedural. EXCEPTION (owner-supplied hand-drawn art): skill-icon PNGs in
  `docs/art/icons/` (opt-in per id via `SKILL_ICON_FILES` in `skills.js`, drawn
  through `drawSkillIcon()`) and rune PNGs in `docs/art/runes/` (`rune0..N.png`,
  drawn through `drawRuneStone()`). Both fall back to the procedural glyph
  (`SKILL_ICONS` / `drawRuneStoneGlyph`) if art is absent, so the game still runs
  art-free. Also owner-supplied: the walkable town map (`docs/art/town/nekropolis.png`,
  `Game.townImg`) and the shop-interior backdrops (`docs/art/shops/{smith,jeweler,
  mystic}.png`, drawn cover-fit under a dark veil by `Screens.shopBackdrop()` behind
  those three artisan menus; falls back to `dim()` until loaded). All loaded with a
  `?v=BUILD` cache-bust.
- **Update `PATCH_NOTES` (data.js) with EVERY addition and bug fix** — prepend a new
  entry (newest first) and bump `GAME_VERSION` (vX.Y.Z-alpha). The version label on
  the title screen opens the notes; the owner reads them.
- **Cache-busting: `docs/index.html` loads the js/ files via a `BUILD` constant that
  appends `?v=BUILD` to each `<script>` (GitHub Pages caches assets ~10 min, so
  without this a deploy serves STALE JS). BUMP `BUILD` in index.html whenever any
  `js/` file changes — keep it in step with `GAME_VERSION`.**

## Architecture (docs/js/, plain script tags — load order matters)

| File | Responsibility |
|---|---|
| `utils.js` | math helpers (`rand`, `clamp`, `lerp`, `dist`, `lerpAngle`, `rr`, `hash2`, `wrapText`) |
| `settings.js` | `Settings` — 5 audio channels (master/sfx/music/ambience/weather, each volume+mute) and DI-style gameplay toggles (damage numbers, shake, health bars, aim indicator, fixed joystick, low FX, big minimap, FPS) plus `cursorScale` (bone-hand mouse pointer 1×/2×/3×, applied via `Game.buildCursor`/`applyCursor` as a data-URI CSS cursor). Persisted separately from the hero |
| `audio.js` | `AudioSys` — SFX synthesized with WebAudio, mixed through per-channel gains (master/sfx/music/ambience/weather). **MUSIC** prefers real files: drop tracks in `docs/sounds/music/` named `1.mp3…16.mp3` (playlist = `MUSIC_PLAYLIST` at top of audio.js), played **shuffled** (a reshuffling bag — `shuffleMusic`/`advanceMusic`, no repeat until the bag empties) on loop through the music channel (so Settings Master×Music volume + mute apply); falls back to the generative dark-ambient loop if no files load (single 404 probe). Per-zone ambience beds (wilds/crypt/camp), weather loops (rain/wind). `init()` needs a user gesture. `docs/sounds/{music,ambience,weather,fx}/` reserved for assets |
| `particles.js` | `Particles` (particles, floating texts, rings, screenshake) + `fx*` helpers |
| `data.js` | ALL static data: `SKILL_DATA` (the 21 real D3 necro actives w/ real unlock levels), `PASSIVE_DATA` (12), `ZONES` (5 lands, some with `weather`), `MONSTERS`, `RARITIES` (incl. index 4 = Set, green), `ITEM_SLOTS` (**11** equip slots incl. shoulders/legs), `GEM_TYPES`/`GEM_TIERS`, `MATERIALS`, `DIFFICULTIES`, `XP_CURVE`, `GAME_VERSION`/`PATCH_NOTES`, `SEASON`/`INARIUS_SET`/`LEGENDARY_POWERS`, `makeRiftZone()` |
| `hero.js` | **Horadric's Cube (`Screens.cube`/`recipes`)**: the Instruction Leaflet's "Instruction of Rathma" EXTRACTS a loose bag legendary's power into `Hero.cubePowers` (bank; consumes the item, costs 30 parts/50 dust/50 crystal/3 soul via `Items.extractPower`/`extractable`); `Hero.cubeActive` (≤3) toggles powers ON via `Items.toggleCubePower`, merged into `Items.equippedPowers()` so they apply unequipped (Kanai-style) and show in the Character Sheet ACTIVE POWERS panel. Golden Mirror transmute lives at the END of the leaflet. | `Hero` — the persistent character: `name`, `eyeColor`, level/xp, gold, materials, gems, bag (`bagTier`→`BAG_SIZE`, base 24, purchasable up to 120 via `BAG_UPGRADES`/`buyBagUpgrade`), equipped, skill `loadout` (6 slots), `passives` (5 slots @ lvl 3/10/20/30/45), zone progress, difficulty, `riftsCleared`, `artisans` levels (smith/mystic/jeweler 1–10). `snapshot()/applySnapshot()`; autosave → `localStorage['nekromancer_hero_v1']`. **`Profiles`** — up to **3 concurrent character slots** (`nekromancer_profiles_v1`), chosen from the campfire select scene; `boot()` loads the roster, `Hero.save()` mirrors the active hero into its slot. Shared Stash (`nekromancer_stash_v1`) common to all profiles, auto-sorted into per-equip-slot bins (`STASH_PER_SLOT` 100→10000 by `stashTier`, `nekromancer_stashtier_v1`; `stashSlotCount`/`buyStashUpgrade`). `Saves` — up to 20 named manual slots (`nekromancer_saves_v1`) |
| `input.js` | Twin-stick touch: left joystick moves, right-side drag aims (and fires primary), skill buttons tap = quick-cast / press-drag = directional cast, channel skills fire while held. All menu taps go through `UI.click()` registry. Keys: WASD, Space/J, 1-5, Q potion, I inventory, K skills, Esc |
| `world.js` | `World.generate(zone)` — two generators: `open` wilderness (props) and `dungeon` (rooms + corridors, real wall collision via cell grid, `CELL=48`). **Variable map size** (`zone.sizeMul` pins a land's character, else rolled per visit; W/H independent → sometimes rectangular). Open lands can carry **rivers** (`makeRivers`: curvy meandering polylines, `zone.rivers` count — length-capped so they never bisect the map, you can always walk around) crossed by **wooden bridges** (oriented plank decks) and **forests** (`makeForests`: dense tree groves you weave through, `zone.forest`). `inWater`/`onBridge`/`blockedTerrain` keep scenery/packs off the water & decks; `collide` blocks water except on a bridge; `isFloorAt` treats water as non-floor. Produces spawn, boss lair, packs, chests/shrines/urns, **one wandering vendor per land** (`vendorStock()`), exit portal, fog-of-war `explored` grid (`reveal(x,y,cells)` — radius scales with the torch). **World fog of war**: the whole map renders pitch black and only uncovers as you move — `Game.drawWorldFog` keeps a higher-res accumulation buffer (`fogBuf`, world/6 px, rebuilt when `World.stamp` bumps) and each frame ERASES a feathered radial brush at the hero with `destination-out`, so the frontier melts away like a fine mist instead of blocky cells; scaled back up with smoothing. The minimap still uses the coarse `explored` cell grid (revealed in `Player.update`). The lit/reveal radius comes from `Game.lightRadius()` (torch `radius`; no torch `NO_TORCH_RADIUS`=20). **Seven torches** (`TORCH_TYPES`, own rarity ladder via `tier`/`tierColor`): Wood 60 (Common) · Iron 110 (Uncommon) · Wyrm-bound 180 (Magic) · Nephalem 250 (Rare) · Master's Light 350 (Epic) · Nekromancer's 500 (Legendary); recipes use boss reagents `wyrmscale`/`brain`/`rathmasoul`, and the Torch Bench (`Screens.torches`) drag-scrolls the ladder. `collide`, `projBlocked`, `dashPoint` |
| `entities.js` | `Player` (stats derived by `Items.apply()` — NOTE: constructor sets safe defaults; `Items.apply()` must be called AFTER `Game.player` is assigned; green `healText` on heal), `Enemy` (sleep/wake packs; **elite tiers** — normal `elite` = yellow outline, `rare` = purple/tougher/+loot, `unique`/boss = orange; curses; **boss ability kits** in `this.abilities` by type — charge/slam/nova/summon/fissures via `bossUpdate`; **Treasure Goblin** `goblin` flag: flees once hit, drips 1g/2s while chased, bursts gold+gems+rare gear on death; `hpMul`/`speedMul` opts; **Phase-2 reagent bosses** — generic `def.dropMat`/`dropChance`/`dropN` drop in `die()`, `def.enrageAt`/`enrageDmg`/`enrageHp` flip a one-time enrage in `update()`, `def.stealth` fades a foe to smoke on `hurt` (`stealthT`): **Bonewyrm** (`wyrm`, roams non-Story maps ~18%, Wyrm Scale 12%), **Gluttonous Brain** (`glutton`, fat ogre — `vomit` AoE splat + `chain` cone-pull that sets `player.stun` 2s + `summon` fat zombies, enrage@50%, Gluttonous Brain 10%), **Rathma's Chosen** (`rathma`, stealthing rare-elite assassin from a 3% cave, enrage@35%, Souls of Rathma 20% ×1-3); roaming bosses show the boss bar via `def.roamBoss`, all spawned in `Game.startLand`, `Minion` (skeleton×7 permanent, mage×4 timed, golem, revived, simulacrum clone), `Corpse` (consume() honors corpse passives), `Pickup` (gold/orb/item/gem; legendary/set drops fire an orange/green light pillar + minimap star), `Projectile` (incl. homing lances/spirit) |
| `items.js` | generation (level-scaled affixes, sockets), `compareArrows` (console-style ▲▼) — PRIORITY-TIERED via `tierScores`: OFFENSE (dmg>crit>dnova/area — dmg outweighs crit) before all else, then SURVIVAL (hp/reg), then UTILITY (armor/gold/ess/move); socketed gems (incl. Perfect +20%dmg / weapon-ruby) count, empty sockets get a small potential credit, and a legendary-power/set bump is a GENTLE ×1.15/×1.10 tiebreaker only (must never override a clearly stronger item). Ties fall through to the next tier (`score` stays a single number for vendor price/sorting/ring-swap). pickup/stash/equip, Blacksmith (salvage junk/rares → parts/dust/crystals/souls; `craft(slot, master)` — masterwork guarantees Rare+, 50% socket), Jeweler (combine 3→1, `combineAllGems`, `buyGem`, socket/unsocket), Mystic (`enchant(item, statKey)` rerolls the **player-chosen** affix; `enchantCost` escalates per enchant via `item.enchants`), `computeStats()` (player-independent, feeds the character sheet) + `apply()` |
| `skills.js` | `SKILL_FX` — behavior for all 21 actives; `Skills` runtime (per-id cooldowns, essence costs, Land of the Dead makes corpse skills free + spawns corpses, Simulacrum mirrors Bone Spear/Death Nova), `SKILL_ICONS` vector glyphs, passive hooks |
| `ui.js` | HUD: portrait+bars+gold, objective line + chevron pointing at bounty/portal (single compact line under the bars when `W<560`), fog-of-war minimap, boss bar, 6-slot radial skill cluster with cooldown sweeps, potion button (25s cd), menu button, toasts, banner. Tap-region registry (`UI.register`/`UI.click`) that all menus use; **`UI.overlayBarrier` makes hits registered before an overlay unreachable — the fix for tap-through**. `UI.screen` = active overlay. HUD respects iPhone safe-area insets (`Game.safe`, read from CSS `env()` vars in `Game.resize`) |
| `screens.js` | Full-screen menus: title, camp hub (hero strip taps into the **character sheet**: full stats via `Items.computeStats()`, reagents, and an `analyze()` tip list), waypoint map (difficulty stepper), **PS5-console-style radial equipment wheel** (11 slots in a circle; upper-left live stat readout — dmg/crit/gold/life/life-s/ess-s; per-slot bag list SORTED by upgrade arrows (▲▲▲→▼▼▼, a ▲▲▲ bobs+pulses green in sync) → equip/salvage/socket; a `Game.lastSwap` "↺ Re-wear" one-tap button holds the just-removed piece; socketing opens `gemModal` — a CENTERED POPUP with tap-to-inspect gem chips, info card, SOCKET IT / UNSOCKET (free) / CANCEL; tap outside cancels only the popup), skills & passives assignment (grids adapt rows/columns to short screens), Blacksmith/Jeweler (tap a gem stack to inspect before combining)/Mystic, **vendor shop** (pauses the crawl; buy with upgrade/sidegrade hints), pause, death, bounty-reward cache. `fitText`/`wrapText` keep text on-screen on phones |
| `town portal` | In the wilds, a HUD **Portal** button (stacked above the potion, `UI.drawPortalButton`) starts a **7-second channel** (`Game.castTownPortal`/`updatePortalCast` + `drawPortalCast` — a gathering storm of blue lightning crackling above the hero's head, via `strokeLightning`, that intensifies as it fills; moving cancels it) that spawns a **blue town portal** on the map (`World.townPortal`, a blue twin of `drawPortal`). Stepping through it (step off then back on, `Game.townPortalNear` debounce) opens the `Screens.town` overlay with Blacksmith/Jeweler/Mystic/Stash + "Back to the Wilds". The game stays menu-paused underneath, so returning drops you back into the same fight. **"Back to the Wilds" closes the portal** (`Game.returnFromTownPortal`) and starts a **30-second cooldown** (`Game.portalCd`, ticked in update, blocks `castTownPortal`, shown as a sweep on `UI.drawPortalButton`) before another can be cast. `UI.townMode` makes those artisans' ✕/Escape return to town; `UI.close` clears it |
| `loot on the ground` | No more auto-salvage (`Items.stash` just adds; `grantSalvage` only via explicit salvage). A full bag LEAVES drops on the ground: `Items.canPickup(item)` (false when bag full & no empty slot) gates `Pickup.update` — blocked items don't magnet, don't collect, and never auto-despawn (`t>60` fade skips `kind==='item'`) |
| `game.js` | Adventure flow: `menu → camp → map → playing → camp`. **Multi-area journeys** (`stage`/`stageCount`/`journeyIdx`): bounties & Adventure span 2–3 linked procedural maps — intermediate areas are gated by a **champion** guardian whose death opens a **descent** portal (`this.descend` → `nextStage()` rebuilds a fresh map, carrying HP/essence), the FINAL area holds the land's named unique boss whose portal → `completeZone()` (Horadric cache, reward screen). Rifts stay one endless map (`stageCount=1`). `onBossDead` opens the portal (descent vs complete by `finalStage`). Death → respawn at entrance or camp. Telegraph + aim-indicator rendering. Menus pause gameplay |

### Key game rules

- **Essence**: 100 max (+40 with Overwhelming Essence), tiny 2/s regen — primaries
  (Bone Spikes +18, Grim Scythe +12/hit, Siphon Blood channel) generate it, D3-style.
- **Skills AND runes are level-gated by the owner's progression table** (in
  data.js: `SKILL_DATA[].lvl` + `RUNE_UNLOCKS` applied onto `SKILL_RUNES[*][i].lvl`).
  The action bar is **CATEGORY-LOCKED by default**: 6 slots = `LOADOUT_CATS`
  (primary·secondary·corpse·reanim·curse·blood), one skill per category — unless
  **Elective Mode** (`Settings.g.electiveMode`, a Gameplay toggle) is on, which
  lets any skill sit in any slot (multiple per category); `Hero.sanitize()`
  branches on it.
  `CAT_SKILLS` lists each category's skills in table order. `Hero.sanitize()`
  rebuilds the loadout by category (drops locked/duplicate). Choose skills+runes
  in the **`Screens.skillChooser`** popup (category ◀ ▶ arrows → skills → runes →
  assigned preview → ACCEPT), opened by `Screens.openChooser(slot,skill,rune)`
  from the action-bar "CHOOSE SKILLS & RUNES" button or the "◈ RUNES" footer button.
- Corpses: every kill leaves one (fuel for Corpse Explosion/Lance/Devour/Revive).
- Monster scaling: `(1+0.20·(mLvl−1)) × difficulty.mult`; `mLvl = zone.mLvl + 6·difficulty`.
- Packs sleep until the player is within ~440px (or they're hurt).
- Items: 9 slots, affix count = rarity, socket chance by rarity, gems 5 types × **13
  tiers** (`GEM_TIERS`: Chipped·Flawless·Perfect·Square·Flawless Square·Brilliant
  Square·Star·Flawless Star·Radiant Star·Imperial·Flawless Imperial·Royal
  Imperial·Marquise; `GEM_PERFECT_TIER`=2 apex threshold, `GEM_MAX_TIER`=12).
  Gem icons draw through `drawGemIcon()` (art in `docs/art/gems/<type><tier>.png`,
  gated by `GEM_ART_READY`; `GEM_ART_GRID` = the owner sheet's A–J/1–13 slice map)
  with a procedural faceted `drawGemGlyph()` fallback. Saves migrate 5→13 tiers via
  `Hero.migrate` (SAVE_VERSION 4).
- **Stats (owner rules):** `armor` affix → damage reduction `armor/(armor+67000)`
  capped 80% (in `Player.hurt`) — big fixed denominator, so only hundreds-of-
  thousands of armor is tanky. Boots roll a `move` affix (1–25%, flat) →
  `Player.speed = 180·(1+move)`.
- **Gems (owner rule): each gem grants TWO stats, per-tier tables in `GEM_STATS`
  (data.js), applied regardless of slot** (no more slot-specific gem rules).
  `gemStats(gem)`→`{keyA,keyB}`, `gemStatText(gem)` for tooltips. By type:
  **Ruby** `flatDmg` (+N damage per hit, in `Enemy.hurt`) + `xp` (+% XP, ×0.1 at
  level 70); **Emerald** `critDmg` (adds to the ×1.8 crit multiplier) + `gold`;
  **Amethyst** `lph` (life per hit, heals in `Enemy.hurt`) + `hp`; **Topaz** `rcr`
  (resource-cost reduction, `Skills.costFor`) + `gold`; **Diamond** `resAll`
  (all-element resist → `resistDR = resAll/(resAll+2500)` cap 80%, in `Player.hurt`)
  + `cdr` (cooldown reduction, `Skills.cdFor`). All fold in via `computeStats`/`apply`.
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
- **PARAGON (past 70)**: XP overflow feeds `Hero.paragon` (near-infinite); each paragon level = 1 NP (`Hero.np`). **D3-style ROTATION spend (owner rule)**: points go in ONE AT A TIME, and each must land in the currently-unlocked category, cycling **Core → Defense → Offense → Utility** (`PARAGON_ROTATION`=`PARAGON_CATS`). `Hero.paragonCat()` returns the unlocked category from `paraOrder.length % 4` (skipping any fully-capped category); `Hero.spendParagon(key)` spends 1 point iff `key`'s cat matches (records it in `Hero.paraOrder`); `refundLastParagon()` undoes the last point (LIFO via `paraOrder`), `resetParagon()` refunds all. `syncParaOrder()` rebuilds `paraOrder` for old free-spend saves. `PARAGON_STATS` (16 stats; `per`=per-point, `max`=cap, **0=infinite — Vitality/Intelligence/Life% never cap**). `Hero.paragonBonus(key)`→fraction, folded into `computeStats` (`paraHpMul`/`paraDmgMul`/`paraManaMul`, additive to crit/cdr/rcr/area/move/resistDR, ×armor/regen/lph, +pickupRadius). `Screens.paragon` (opened from the Character Sheet footer) shows the "▶ Now spending" banner, rotation-locked ✦ tab, per-row single `+`, and Undo/Reset footer; `PARAGON_XP(p)` is the per-level cost.
- Difficulty unlocks: up to Master until all 5 lands cleared, then Torment I–III.
- **Artisan resource lanes (owner rule)**: Blacksmith = gold/parts/dust/crystals;
  Mystic = gold + Forgotten Souls ONLY; Jeweler = gold + gems ONLY (and BUYS gems
  back for gold — `Items.gemSellValue`/`sellGem`, value ×3 per tier, SELL 1 / SELL
  ALL in the gem detail card). Unsocketing is free (Jeweler has an UNSOCKET row);
  salvage always returns socketed gems.
- **Affix value caps (owner rule)**: every affix is clamped to `AFFIX_CAP[key] ×
  affixTierFrac(rarity,stars)` — Artifact-5★ ceilings are dmg 20.0 (2000%) · crit
  10.0 (1000%) · gold 60.0 (6000%) · hp 20000 · reg 450 · ess 200 · armor 10000 ·
  move 0.25; lower tiers scale down. Generation rolls DISTINCT affixes (no
  stacking) and `enchant`/`affixRange` use the identical formula
  (`starPower(item)` included) + the same cap, so an item's value can NEVER exceed
  the Mystic's shown max, and the Mystic can reroll up to the cap.
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
- **Drop table (owner spec)** — `Items.rollRarity` returns the BASE rarity by
  sampling `ITEM_DROP_TABLE` (items.js): one editable row per difficulty index,
  7 columns `[Trash, Common, Magic, Rare, Epic, Legendary, Artifact]` as percents
  summing to 100 (mapped via `DROP_MAP`). `boost` (elites/bosses/masterwork) gives
  successive one-column upgrade chances; Artifact (col 6) is reachable only at T16.
  **Star tiers are gated by Torment band, NOT rolled here** (`tormentTier(di)` → 0/1–16):
  - `legendaryStars(tt)`: 1★ **T3–T7** · 2★ **T8–T13** · 3★ **T14–T16** (0★ below T3).
  - Artifacts drop **ONLY at T16** (below T16 the artifact slice rolls up as a
    legendary). `artifactStars()`: 1★ 10% · 2★ 7% · 3★ 5% · 4★ 3% · 5★ 1% (else 0★).
  - **Gem drops**: per-difficulty distribution lives in `GEM_DROP_TABLE` (data.js,
    one editable row per difficulty: `[None, Chipped…Marquise]` percents summing
    to 100). `Items.gemTableRoll(noNone)` samples it — wild monster kills use
    `rollWildGem()` (honours the `None` column, may yield no gem), while
    guaranteed drops (Horadric caches / act rewards) use `dropGem()`/`dropGemTier()`
    (renormalize past `None`). Per-kill gate is still 5% normal / 16% elite / 90%
    unique; the Jeweler cuts by jeweler level via `generateGem`, not this table.
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
- **WALKABLE MAIN TOWN (v1.6.41, renamed & reworked v1.6.47)** — "NEW HAVEN"
  (`Game.state==='town'`). The map is the OWNER'S HAND-DRAWN PAINTING
  (`docs/art/town/newhaven.png`, 1254², loaded as `Game.townImg`, `?v=BUILD` bust) drawn
  1:1 as the world; `Game.TOWN_STATIONS` traces interaction pads + INVISIBLE collision
  boxes over the painted buildings (`TOWN_SCENERY` = fountain blocker + the PERIMETER
  WALLS, added v1.6.54 — 12 stepped boxes tracing the painted battlements/rampart/
  treelines so the hero can't leave town; the only opening is the south gate corridor
  x 540–660; pathways stay open, `updateTown` clamps to the map edges).
  **TOWN MENUS vs the EXIT button (v1.6.54)**: the round EXIT button owns the
  bottom-right ~150px while a screen is open in town — `artisanHub` bottom-pads 150
  in town, radial + stash scroll lists set `viewBot = H-150` in town, the radial's
  narrow wheel sits at `cx=W*0.63` clear of the stat readout, huge readout values
  shorten to k/m, the detail column starts below `Screens._radialStatsBottom`, and
  `drawTown` hides the street HUD + name plates while `UI.screen` is open.
  **ENTER-BUTTON interaction (owner rule — NO
  pad circles, NO proximity auto-open)**: standing at a doorway arms `Game.townPrompt`;
  `UI.drawTownEnter()` shows a big round ENTER button at the primary-skill position
  (bottom-right) which fires `Game.townEnter()` → opens that building's screen; while a
  screen is open the button FLIPS TO EXIT (registered above `overlayBarrier`). The
  primary-attack key does the same (input.js). Stations: Blacksmith (forge bldg),
  Jeweler (top-left manor), Mystic (purple-door chapel), Horadric Cube (cube plinth,
  gated `Hero.hasCube`), Stash (small chapel), 4 leftover-building vendors
  (Weapons/Armor via `Game.rollVendorStock()` — RENAMED from
  merchantStock because `Screens.merchant` caches an ARRAY on `Game.merchantStock`; the
  old name collision bricked buildTown; v1.6.58 owner rules: **"Jeweled
  Necessities"** replaced General Goods and sells ONLY ring1/ring2/amulet, and
  the **Apothecary is CLOSED** — `slots: null` → empty stock, "shelves are
  bare" line in `Screens.vendor`, skipped by the restock loop). **STASH is a
  GROUPED LIST (v1.6.58, owner rule "get rid of the stash wheel")**: one
  scrolling list grouped by gear type (rings folded into "Rings"), flow-wrap
  FILTER chips (ALL + per-group, empty groups hidden) + SORT picker
  (`STASH_SORTS`: ▲ Upgrade / Rarity / Level / Name via `UI.sel.stashFilter`/
  `stashSort`), deposit/upgrade pinned on top, same per-slot bins underneath. **Waypoints (owner rule)**: BLUE (top-left) →
  bounties/acts/adventure, PURPLE (top-right) → rifts/nephalem/seasons — both open
  `Screens.wilds` with `UI.sel.wpFilter='blue'|'purple'` which filters the mode rows.
  **Town portal goes STRAIGHT to New Haven** (the old `Screens.town` menu + its
  `UI.townMode` routing were DELETED in v1.6.52 — owner rule "menus that have the
  leave button are to be deleted"; the vendor menu's LEAVE button is gone too, ✕/
  Escape are the exits): `enterTownFromPortal()` saves `townPortalReturn={x,y,hp,essence}`
  and the paused run stays in memory; the gate pad (visible only via `cond` while
  `townPortalReturn` is set) → `returnToWilds()` restores the position and calls
  `returnFromTownPortal()` (portal collapse + 30s cd). `startLand()` clears
  `townPortalReturn`. **THE ☰ MENU (v1.6.57, owner rule "only skills and
  passives, inventory, and settings")**: the top-left ☰ opens `Screens.sysmenu`
  — a compact overlay with EXACTLY those rows (+ 📜 JOURNAL added ABOVE
  Skills & Passives in v1.6.58, owner rule — `Screens.journal`: read-anywhere
  quest list with live bars, DROP buttons, "✔ READY — see Lukus" on finished
  deeds; turn-ins stay with Lukus) — and the 🎒 button → radial. **THE SURVIVOR'S CAMP HUB IS RETIRED**: `Game.toCamp()` now calls
  `enterTown()`, every reward/act-clear/death/abandon/bounty-map exit lands in
  New Haven (reward + actclear overlays open OVER the streets), and no code
  path sets `state='camp'` anymore (`Screens.camp` is dead code). **TOWN IS HOME (v1.6.52, owner rules)**: character
  load/creation lands IN TOWN — roster PLAY (`Profiles.select` → `Game.enterTown()`),
  `Saves.load` and `importSave` all enter New Haven, not camp. Town HUD is BARE:
  just "NEW HAVEN" — no gold readout, no bottom explainer legend, no grey label
  under the ENTER button (the floating name plates carry the labels). **The pet
  FETCHES LOOT** (v1.6.52): `Pickup.update` magnets/collects off whichever is
  nearer of hero/`Game.pet`; all effects still land on the hero.
- **ARTISAN HUBS (v1.6.49, owner rule)**: entering Blacksmith/Jeweler/Mystic shows the
  shop-interior ART first (`Screens.artisanHub`, `shopBackdrop` veil 0.34) with a slim
  bottom panel of bench buttons; each bench is its own screen and `UI.closeAction()`
  maps it BACK to its hub (sub → hub → town). **WELCOME SPLASH (v1.6.56, owner rule
  "open up to the background first, then a welcome — different for each")**:
  fresh entry shows `Screens.artisanIntro` — the interior art near-unveiled
  (veil 0.10) + a per-artisan welcome (`ARTISAN_INTROS`: Tharn Emberhand
  "WELCOME TO THE FORGE" (blacksmith renamed v1.6.57, owner rule — no borrowed
  Diablo names) / Shen "WELCOME TO THE JEWELER'S" / Myriam "WELCOME TO THE SANCTUM",
  each with its own info line + enter-button label); tap anywhere or the button
  sets `UI.sel.inside` → benches. Bench-close `backToHub()` re-sets
  `sel.inside` so the splash only plays on street entry. Smith: `smithSalvage`/`smithWeapon`/
  `smithArmor` (shared `smithCraft`)/`torches`. Jeweler: `jewSocket` (reuses `gemModal`)/
  `jewUnsocket`/`jewMerge`/`jewSell` (both via `gemStackList` — type filter chips + tier
  sort)/`jewCraft` (`Items.craftGem(type)`, cost `gemCraftCost()`=1.5× random cut).
  Mystic: `mysEnchant` (the old mystic body)/`mysPet`/`mysWings`/`mysTheme` (shared
  `cosmeticList`). **COSMETICS**: `PETS`/`WINGS`/`THEMES` in data.js; `Hero.pet`/`Hero.wings`
  persisted (snapshot parity!), `Settings.g.theme` account-wide. Pet = `Game.pet` follower
  (`updatePet` in town + playing; drawn in town/birdseye/topdown), wings = `Player.drawWings`
  behind the body in both views, theme = `UI.theme()` recolours `UI.panel` border/title +
  default `UI.btn` borders. **LUKUS, BRINGER OF LIGHT** (knight quest-giver) — **THE
  LEDGER OF LIGHT (v1.6.51, owner request "500 quests level 1→70 paragon 1000")**:
  `QUEST_LINE` (data.js) = 500 SEQUENTIAL quests, generated DETERMINISTICALLY (hashed
  by index — targets never change between loads). Quests 0–199 gate by LEVEL 1→70,
  200–499 by PARAGON →1000 (`questGate(i)`); every 25th is a ★ MILESTONE ("reach
  level/paragon X", `abs:true` — progress read absolutely, no base, not abandonable).
  **v1.6.61 owner rules — names & escalation**: ALL 500 names are UNIQUE and
  NEVER numbered (no "Forged Anew VII") — each template carries 8 openers × 8
  closers walked diagonally (64 combos/deed); the 20 milestones have their own
  `MILESTONE_NAMES` pools (8 level + 12 paragon). Deeds are dealt from a
  reshuffling 9-template bag (~53 recurrences each), and each deed's k-th
  recurrence climbs a geometric min→max curve (exponent 0.7, friendly rounding)
  FORCED strictly above its previous target — a deed's target never repeats;
  every 10th + milestones pay double gold, bonus souls and a gem (`questReward(i)`
  — **DETERMINISTIC PER QUEST since v1.6.59 (owner rule "rewards are real when
  awarded")**: gold/souls/XP computed from the quest's own gate ("level
  equivalent"), NEVER from Hero.level, so the shown reward === the paid reward;
  `questRewardText(i)` is the shared one-line readout; `completeQuest` pays
  `rw.xp` exactly, gear XP bonuses only add). **Tap a quest row (journal screen
  AND Lukus dialog, v1.6.59)** → `UI.sel.qInfo` expands a detail card: full
  deed text, "Quest n of 500", ★ milestone note, and the exact REWARD line. `QUEST_TEMPLATES` = 9 deeds on LIFETIME
  counters: totalKills · `Hero.eliteKills`/`bossKills` (Enemy.die — unique/def.boss/
  mapBoss vs elite) · riftsCleared · salvagedCount (grantSalvage) · `gemsCombined`
  (combineGems) · `itemsCrafted` (craft/craftTorch/buyGem/craftGem) · `enchantsDone`
  (enchant) · `chestsOpened` (touchObjects). All persisted with snapshot parity.
  **THE JOURNAL (v1.6.55, owner rule "up to 7 quests")**: `Hero.journal` =
  [{idx, base}] (≤ `QUEST_JOURNAL_MAX`=7 concurrent), `Hero.questNext` = next
  fresh offer, `Hero.questRepool` = abandoned idxs (re-offered FIRST, lowest
  first — nothing is ever lost), `Hero.questLine` = quests TURNED IN (the
  ledger bar). API on Hero: `questProgress(entry)` / `questOffer()` /
  `acceptQuest()` / `abandonQuest(entry)` / `completeQuest(entry)` (pays
  gold/souls/XP/gem, bumps questLine). Turn-ins are order-independent,
  straight from each journal row; milestones (abs) can't be dropped. The
  dialog's journal + NEXT DEED column drag-scrolls via `UI.sel.scrollRegion`.
  Old saves migrate: the single `quest` → journal[0], `questNext` derived
  (old `{id,...}` quests dropped on load). Station at
  (718,668, kind 'lukus') → the ENTER button flips to 💬 TALK (`it.kind==='lukus'`
  in `UI.drawTownEnter`) → `Screens.lukus` DIALOG: solid-black stage, the owner's
  painted knight (idle) bottom-right (black bg melts in), and the dialog laid
  STRAIGHT ON THE BLACK — **NO panel box (owner rule: "it doesn't need to be in a
  box")**: glowing gold header + fading rule, greeting, ledger progress bar
  ("QUEST n OF 500"), then the current quest (accept / progress / turn-in, or a
  disabled "REQUIRES LEVEL/PARAGON X" gate). SIDE-BY-SIDE ON EVERY SCREEN (owner
  rule v1.6.53 "lukus needs to be side to side with the text"): on narrow
  portrait phones (`nr` = side room < 260px) the text keeps the LEFT ~52% and
  the knight takes the right column, RAISED above the EXIT button zone
  (`feetY = H-148`) on a soft ground-shadow ellipse, with compact fonts. His
  in-town model is
  the HELMED painting keyed onto the map: `Game.lukusImg(mood)` loads
  `docs/art/npc/lukus_{helmed,idle,smile,frown,angry}.png` (owner art, ?v=BUILD),
  `Game.lukusSprite()` chroma-keys the black bg (falls back to 'screen' blend when
  getImageData is unavailable on file://), `Game.drawLukus` draws it at (718,640)
  with a warm halo + !/✓ quest marker (✓ = a journal quest is turn-in ready,
  ! = an offer exists and the journal has room).
- **⭐ OWNER TODO (requested 2026-07-03): create the MASTER LIST of primary +
  secondary stats and affixes for items.** The engine now models:
  `dmg` (%), `hp`, `crit` (chance), `ess` (essence/s), `reg` (life/s), `gold`,
  `armor`, `move` (boots), `dnova` (Death Nova %), `area` (Area Damage) as item
  affixes; `critDmg`/`lph`/`rcr`/`cdr`/`resAll`/`flatDmg`/`xp` via GEMS; and — added
  v1.6.33 — **`int` (Intelligence, +0.1%dmg/pt), `vit` (Vitality, +5 Life/pt) —
  both UNCAPPED like Paragon (absent from `AFFIX_CAP` → `affixCap()` returns
  Infinity, still tier-scaled via rarity/★) — and `atkSpeed` (Attack Speed, faster
  primary/secondary cooldowns, cap 75%)** as real rollable affixes (in
  `AFFIX_ROLLS`/`AFFIX_GROUPS`; folded in `computeStats`/`apply`; `atkSpeed` hooks
  `Skills.cdFor`).
  Added v1.6.35: **Life per Hit, Crit Damage, cooldown reduction, resource cost
  reduction** as real ITEM affixes (`lph`/`critDmg`/`cdr`/`rcr`, on top of the gem
  sources). Added v1.6.40: **ELEMENTAL DAMAGE TYPES** — `ELEMENTS` (physical/cold/
  fire/lightning/poison) in data.js; `SKILL_ELEMENT` (Death Nova = poison) +
  `RUNE_ELEMENT` (cold runes) resolved by `Skills.elementFor()`; `Skills.tryUse`
  stamps `p.castElement`, read in `Enemy.hurt` for tinted damage numbers, per-hit
  effects (cold chill · fire `igniteT`/poison `poisonT` DoTs ticked in Enemy.update
  · lightning shock), monster `def.resist` (½ dmg), and the `elem` affix (+% elemental
  damage, non-physical → `p.elemDmg`). Remaining unmodelled: none of the core taxonomy.
- Skill runes (D3 has 5 per skill), set items with set bonuses
- Kanai's Cube (extract legendary powers), legendary gems
- More bounty types (Clear / Event), Nephalem/Greater Rifts as endgame
- More classes (Barbarian…) with class select
- Followers, town NPCs as walkable camp instead of menu hub
