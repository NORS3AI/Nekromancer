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
  **v1.6.69 — ALL HEAVY PAINTINGS ARE WEBP q85 now** (town map, shop interiors,
  NPC portraits, ground tiles, logo — 35MB PNG → 3MB WebP; the .png originals
  live only in git history) and are cache-busted with **`?v=ART_V`**
  (index.html), NOT BUILD — bump ART_V ONLY when an art file actually changes,
  so phones keep the paintings cached across game releases. `Game.preloadArt()`
  (called in boot) + `Screens.preloadShops()` + `World.loadTiles()` start every
  heavy download at the title screen; `drawTown` shows "New Haven emerges from
  the dark…" until the map arrives. Small art is ALL WebP too as of v1.7.1 (runes
  `rune0..N.webp`, skill icons `icons/<id>.webp` — the PNGs live only in
  git history).
- **PAINTED HERO AVATARS (v1.6.70, owner art; v1.6.71 BAKED ALPHA; v1.6.75
  NEW FULL MODELS + REAL SIDE PROFILES)**:
  `docs/art/hero/{m,f}_{front,back,side}.webp` — male & female Nekromancer
  paintings (v1.6.75 repaints, scratchpad `malemodel.py`; the side sheets held
  two left-facing profiles each — the FIRST is kept). `drawAvatarModel` takes
  `(ctx, front, back, side, bob)`: when moving sideways the base (hair 0) look
  draws the true LEFT-facing profile (mirrored via `ctx.scale(fx>0?-1:1,1)` to
  lead the walk); hair variants (no side art — never request `*_side_h*`) keep
  the mirrored+sheared front. `bust_{m,f}0` are recut from the new fronts.
  ART_V went 3→4 with this repaint (existing files changed).
  **These four WebPs carry a real alpha channel** (RGBA, cut out OFFLINE): the
  costumes are as black as the backdrop, so the NPC-style runtime chroma-key
  hollowed out ~2/3 of the body — do NOT chroma-key hero art at runtime. The
  offline cut (scratchpad `cutout.py` pattern): background = flat pure-black
  (9px maximum-filter < 8) connected to the border via scipy label, re-grown
  4px across l<10, hole-filled by complement, 1.1px Gaussian feather. If the
  owner ships new avatar art on black, rerun that and bump ART_V. `Hero.gender`
  ('m'|'f', snapshot parity, chosen on the creation screen via ♂ MALE / ♀ FEMALE
  buttons). **HAIR COLORS (v1.6.73 sheets; v1.6.76 female repaint; v1.6.77
  male head-swap)**: `HAIR_COLORS` (data.js, 9 entries) — index 0 Black = the
  base full-model paintings, 1–8 = `{m,f}_{front,back,side}_h1..8.webp`.
  FEMALE variants come from the new-costume 8×(side,front,side2,back) sheet
  (scratchpad `newfemhair.py`). **MALE variants are MASKED CROSS-FADE
  composites (owner rule v1.6.79 "don't put one image on top of another —
  mask and fade the head to the torso"): the body's own head fades OUT over
  a ~RAMP(1.2% figH) gradient above the neck line (figTop+0.155·figH), and
  the bust-sheet head (scaled to `headW×1.0`) fades its neck/shoulder stump
  INTO the torso across the seam — no hard beheading cut, no shoulder line
  (scratchpad `malehead2.py`, ART_V 7)** — every gender+hair has a true side
  profile, `Player.draw` requests side art unconditionally. The creation preview sits
  on PLAIN BLACK — no hair-tinted aura (owner rule v1.6.76).
  `Hero.hair` (0–8, snapshot parity, legacy saves default 0/black) feeds
  `Game.heroImg(gender,side,hair)` / `heroSprite(gender,side,hair)`; the
  creation screen's swatch row is HAIR COLOR (replaced GLOWING EYES, owner
  rule — `Hero.eyeColor` still exists for staff/aura tints), and the walking
  model + campfire roster (`snap.hair`) show the variant art. **The picker
  chips are painted HEAD BUSTS (v1.6.74, owner sheets — one 8×(side/front/back)
  bust sheet per gender, front view kept; scratchpad `busts.py`):**
  `bust_{m,f}0..8.webp` (`bust_*0` = head crop of the base painting) drawn via
  `Game.heroBust(gender,hair)` with a color-dot fallback until loaded. `preloadArt()`
  warms the base four + each roster hero's variant; the rest load lazily. In **Top Down view** `Player.draw` calls
  `drawAvatarModel(ctx, front, back, bob)` (entities.js): back art when walking
  up, front art mirrored + sheared (`ctx.transform` −0.14) for left/right as a
  cheap ¾ turn, and the painting drawn as a base pass + **three phase-shifted
  overlay slices** (legs sy 0.54 / torso 0.24–0.58 counter-sway / head top 0.26)
  so it strides with depth ("layer the image to make it 3d" — owner rule).
  Falls back to the procedural `drawUpright` until both sides load; Bird's-Eye
  keeps the classic rotating sprite. **WALK CYCLE (v1.6.78, owner rule "splice
  the legs and make them move, not skating"): while moving, the painting is
  split at the hip line (legY 0.52) into TWO leg halves, each rotating about
  its own hip on an opposed sine (profile ±0.15 rad stride; front/back ±0.06
  + a 1.1px stepping-foot lift), torso+head drawn as one piece overlapping the
  seam (legY+0.05) with a gentle counter-sway; standing draws the whole
  painting unsliced. Angles stay SMALL (v1.6.72 owner rule "subtle movements,
  not dancing images"). Cosmetic wings anchor at the SHOULDERS of the tall
  model (`translate(0, feet−HT·0.66)` + 1.15× before `drawWings(ctx,false)`)
  — the raw birds-eye anchor sat at the origin = LEG height (v1.6.78 fix).**
  **iPad fullscreen (v1.6.78)**: iPadOS exits element fullscreen on any
  downward swipe (system gesture, unblockable) — joystick drags triggered it.
  `Game.toggleFullscreen` sets `fsWant`; `fullscreenchange` arms `fsRearm`
  when fullscreen drops while wanted; the next canvas touchend calls
  `Game.refullscreen()` (a user gesture) to snap back in. `Screens.create` shows a
  calm breathing idle (NO walk slices; eye-color aura, adaptive `pvH`, swatches
  go 10-wide on short panels), and the CAMPFIRE ROSTER (`drawRosterAvatar`)
  shows each save's painted avatar by the fire (gender from the snapshot,
  legacy saves default male; `drawNecroFigure` stands in until art loads).
  The campfire select's "up to three Nekromancers rest by the fire" subtitle
  was deleted (owner rule).
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
| `input.js` | Twin-stick touch: left joystick moves, right-side drag aims (MIRRORED when `Settings.g.leftHanded` — v1.6.64 owner rule: `UI.layout` flips the cluster/potion/portal x, `drawTownEnter` sits bottom-left, `fixedAnchor` + move-half swap sides, and BOTH NPC dialogs shrink `btnZone`/`viewBot` accordingly; in TOWN the walk joystick spawns ANYWHERE on screen) (and fires primary), skill buttons tap = quick-cast / press-drag = directional cast, channel skills fire while held. All menu taps go through `UI.click()` registry. Keys: WASD, Space/J, 1-5, Q potion, I inventory, K skills, Esc |
| `world.js` | `World.generate(zone)` — two generators: `open` wilderness (props) and `dungeon` (rooms + corridors, real wall collision via cell grid, `CELL=48`). **Variable map size** (`zone.sizeMul` pins a land's character, else rolled per visit; W/H independent → sometimes rectangular). Open lands can carry **rivers** (`makeRivers`: curvy meandering polylines, `zone.rivers` count — length-capped so they never bisect the map, you can always walk around) crossed by **wooden bridges** (oriented plank decks) and **forests** (`makeForests`: dense tree groves you weave through, `zone.forest`). `inWater`/`onBridge`/`blockedTerrain` keep scenery/packs off the water & decks; `collide` blocks water except on a bridge; `isFloorAt` treats water as non-floor. Produces spawn, boss lair, packs, chests/shrines/urns, **one wandering vendor per land** (`vendorStock()`), exit portal, fog-of-war `explored` grid (`reveal(x,y,cells)` — radius scales with the torch). **World fog of war (v1.6.94: 65% opacity — the environment shows dimly through the shroud; ENEMIES in fog are hidden from the draw lists via `Game.inFog(x,y)` and never wake — `Enemy.update` gates `wake()` on the cell being explored)**: the map renders shrouded and only uncovers as you move — `Game.drawWorldFog` keeps a higher-res accumulation buffer (`fogBuf`, world/6 px, rebuilt when `World.stamp` bumps) and each frame ERASES a feathered radial brush at the hero with `destination-out`, so the frontier melts away like a fine mist instead of blocky cells; scaled back up with smoothing. The minimap still uses the coarse `explored` cell grid (revealed in `Player.update`). The lit/reveal radius comes from `Game.lightRadius()` (torch `radius`; no torch `NO_TORCH_RADIUS`=20). **Seven torches** (`TORCH_TYPES`, own rarity ladder via `tier`/`tierColor`): Wood 60 (Common) · Iron 110 (Uncommon) · Wyrm-bound 180 (Magic) · Nephalem 250 (Rare) · Master's Light 350 (Epic) · Nekromancer's 500 (Legendary); recipes use boss reagents `wyrmscale`/`brain`/`rathmasoul`, and the Torch Bench (`Screens.torches`) drag-scrolls the ladder. `collide`, `projBlocked`, `dashPoint` |
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
- **PARAGON (past 70)**: XP overflow feeds `Hero.paragon` (near-infinite); each paragon level = 1 NP (`Hero.np`). **FREE SPEND (v1.6.99 owner rule — supersedes the old rotation lock)**: `Hero.spendParagon(key)` spends 1 point on ANY stat in ANY category, in any order (still records it in `Hero.paraOrder`); the old rotation helpers (`paragonCat`, `PARAGON_ROTATION`) remain only for `syncParaOrder`'s legacy-save rebuild; `refundLastParagon()` undoes the last point (LIFO via `paraOrder`), `resetParagon()` refunds all. `syncParaOrder()` rebuilds `paraOrder` for old free-spend saves. `PARAGON_STATS` (16 stats; `per`=per-point, `max`=cap, **0=infinite — Vitality/Intelligence/Life% never cap**). `Hero.paragonBonus(key)`→fraction, folded into `computeStats` (`paraHpMul`/`paraDmgMul`/`paraManaMul`, additive to crit/cdr/rcr/area/move/resistDR, ×armor/regen/lph, +pickupRadius). `Screens.paragon` (opened from the Character Sheet footer) shows Core→Utility view tabs on the SIMPLE plate (no banner, no lock, v1.6.99), per-row painted `+`, and Undo Last / Reset All on the little empty plate; `PARAGON_XP(p)` is the per-level cost.
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
- **ONE MENU EVERYWHERE (v1.6.77, owner rule)**: dungeons (rifts/seasons/
  bounties/acts/Adventure) open the SAME `Screens.sysmenu` as town — the HUD
  menu button and Escape open 'sysmenu', never 'pause' (`Screens.pause` is
  dead code); in a run the menu grows a red "⏏ ABANDON <mode>" row
  (`Game.toCamp`). **Pure MENU screens have NO round EXIT button** —
  `UI.MENU_SCREENS` (sysmenu/character/radial/invGrouped/journal/skills/
  skillChooser/achievements/settings/paragon/wilds/storyacts) suppresses
  `drawTownEnter` in town; the red ✕/Escape closes them STRAIGHT to the
  playable screen. Doorway screens (shops, stash, vendors, NPC dialogs) keep
  the EXIT button. **Town stations renamed (v1.6.77)**: blue = "The Wilds
  Waypoint", purple = "The Void Portal" (headers in `Screens.wilds` match).
- **Torches (v1.6.77)**: Wood 75 (+25%, owner rule) · Iron 120 · Wyrm-bound
  192 · Nephalem 264 · Master's Light 365 · Nekromancer's 520.
- **PAINTED UI KIT (v1.6.80, owner sheet — phase one)**: the owner shipped a
  full Diablo-style UI sheet (panels/globes/action bar/✕ plates), sliced
  offline (scratchpad `uikit.py`) into `docs/art/ui/{panel,close,globe_red,
  globe_blue}.webp`, loaded via `Game.uiImg(key)` (warmed in preloadArt).
  `UI.panel` draws the frame via `UI.drawNine` — a 9-slice whose EDGE STRIPS
  are thin samples from clean border runs (`tx=0.28·sw`, `ly=0.55·sh` — the
  full spans carry baked title text + mid-edge gem ornaments; the CENTER is a
  flat dark fill, never stretched art). `Screens.closeX` draws the painted ✕
  plate. Desktop `UI.drawGlobe` takes an artKey ('globe_red'/'globe_blue') —
  dim pass = empty glass, bright pass clipped to the fill fraction;
  `globe_blue` is a channel-swap of the red (the sheet's blue globe is
  clipped by the action bar). All have procedural fallbacks until loaded.
  REMAINING KIT (not yet applied): action-bar frame, crafting-panel layouts,
  small orbs, chat bubble, minimap diamond.
- **PLATE BUTTONS + CINZEL (v1.6.81, owner art + rule)**: the owner's skull-
  crested button plate (`docs/art/ui/button.webp`, sliced from its own sheet)
  drawn by `UI.btnPlate` — a 5-slice (finial caps 15% each end + center skull
  crest 45.5–54.5% stay 1:1; two clean bar runs stretch; art drawn 1.42× the
  logical height so the BAR matches the button rect, crest overhangs). Labels
  are UPPERCASE in **Cinzel** (Trajan-style, OFL, self-hosted at
  `docs/fonts/cinzel.woff2` 26KB variable 400–900; @font-face in style.css,
  warmed via `document.fonts.load` in preloadArt; canvas font string
  `600 Npx Cinzel, Georgia`). APPLIED TO: campfire PLAY, create-screen
  CREATE CHARACTER (renamed from BEGIN THE JOURNEY), all ☰ MENU rows (emoji
  dropped) + ABANDON, artisan intro enters (Step Up to the Anvil / Browse the
  Stones / Part the Veil), and the town STREET PLATES (`drawTownPlate`, mini
  3-slice). **Artisan renames (owner list): street plate + hub title
  'Blacksmith'→'SMITHY', 'Mystic'→'ENCHANTRESS'** (internal keys stay
  smith/mystic; NPC names Tharn/Vessa unchanged). `UI.btnPlate` falls back to
  `UI.btn` until the art loads. **THEMED PLATES (v1.6.83, owner art)**:
  `THEMES` (data.js) is now SIX entries — Void (default) · Bone White ·
  Blood · Ocean · Jungle · Ember — each with a `plate` key naming its glow recolor
  (`docs/art/ui/button_<plate>.webp`, all 1532×385 = same 5-slice fractions
  as the neutral plate). `UI.plateImg(hover)` resolves the plate: **plates
  idle DARK (neutral `button.webp`); the theme's glow recolor shows ONLY on
  mouse hover (v1.6.89 owner rule — `btnPlate` checks `Input.mousePos`,
  never in touch mode); town street plates glow when standing at the pad.**
  Legacy theme ids map in `UI.theme()`: arcane/violet→void, royal→ember.
  **v1.6.85: 'Violet' is renamed VOID (id 'void', plate art key stays
  'violet') and is the DEFAULT theme (Settings default 'void').**
  `preloadArt` warms the active theme's plate; the rest lazy-load in the
  Enchantress's theme picker. **v1.6.96: a 'Default' theme (id 'none',
  `plate: null`, original grey panel colors, own `desc`) sits FIRST in
  THEMES — the "no color, just blank" choice; with it active, plates never
  glow (hover shows the neutral art).**
- **THE SIMPLE PLATE (v1.6.96, owner art)**: `docs/art/ui/plate2.webp`
  (1456×367 — octagonal-cut frame, a diamond finial at each end, cracked-
  leather bar, NO skull crest), drawn by `UI.btnPlate2` — a flat 3-slice
  (caps 1:1 at `capF` 0.14, one clean bar run 0.42–0.52 stretched, art at
  1.08× the button rect; same Cinzel label treatment, hover only brightens
  the label). APPLIED TO (owner list): death-screen buttons, ALL artisan
  bench rows (`artisanHub` — TRAIN keeps the ornate plate), every quest
  DROP (Journal, Lukus, Addy), and Settings' OPTIONS/KEYS/SAVES tabs
  (selected bright `#f0dcae`, rest dim), SAVE HERO (renamed from "Save to
  Current Hero"), EXPORT/IMPORT CODE, RESET TO DEFAULTS. **The ornate
  skull plate STAYS on the ☰ MENU rows and everything in town (owner rule
  "keep the old plates for in the town").** Six themed glow recolors are
  SLICED AND STORED but NOT wired (`plate2_{violet,bone,blood,ocean,
  jungle,ember}.webp`, 740×218, scratchpad `plate2themes.py` — owner:
  "when a theme is chosen and only in specific places I want you to use
  them. Just splice them and store them for now").
- **SMALL PAINTED UI BITS (v1.6.97, owner art — five pieces, scratchpad
  `uibits.py`)**: `docs/art/ui/{minus,plus,close2,chip,circle}.webp`.
  (1) `close2` = the NEW red ✕ plate — `Screens.closeX` draws it at its own
  aspect (h 34, w ≈ 51); the old `close.webp` is dead but left on disk (no
  ART_V bump — all five are new files). (2) `UI.iconPlate(ctx,key,x,y,w,h,
  cb,o)` contain-fits plus/minus art in a rect, returns false until loaded
  (callers keep procedural fallbacks): Settings font-size −/+, Keys tab's
  add-binding ＋ (drawn 32×18 at `addX-14`; the key-chip overflow guard
  clears it at `addX-18`), Paragon per-row ＋. (3) `UI.chip(...)` = the
  EMPTY VALUE PLATE, flat 3-slice (capF 0.18) + Cinzel label — Settings'
  value chips (Camera view/Loot pos/Loot style/Cursor size/Corpse limit)
  and the ABOUT row (Game creator + GAME_VERSION). (4) `UI.circleFrame(ctx,
  cx,cy,r)` draws the round quatrefoil SKILL FRAME at 2.35r behind EVERY
  skill/rune/passive circle: HUD `drawSkillButtons` (procedural stroke
  kept only when art absent; status ring stays on top), skills() actives
  slots, passives slots, skillChooser skills + rune stones (stones shrink
  to 0.86r inside the frame); selection glow rings still draw over it.
  The campfire "＋ New Nekromancer" ghost marker keeps its plain glyph.
- **THE GOTHIC PLATE + FOUNTAIN (v1.6.98, owner art)**: `docs/art/ui/
  plate3.webp` (1526×380 — thorned spike caps, small skull crest top AND
  bottom of centre) drawn by `UI.btnPlate3` — same 5-slice discipline as
  the ornate plate (capF 0.14, crest 0.45–0.55, art 1.48× the rect, run
  samples 0.20/0.72). **Plate assignment (owner list)**: GOTHIC = ☰ MENU
  rows (ABANDON keeps the OLD ornate), skillChooser APPLY (renamed from
  ACCEPT) + CANCEL, campfire DELETE HERO (150×28 — roomier), gem filter/
  tier chips (jewSell+jewMerge via `gemStackList`), jewCraft type rows,
  mysEnchant gear rows, `cosmeticList` rows (pets/wings/themes),
  smithSalvage buttons, smithCraft STANDARD/MASTERWORK + slot buttons,
  torch rows + BACK TO FORGE, stash DEPOSIT/UPGRADE, cube INSTRUCTION
  LEAFLET. SIMPLE plate (`btnPlate2`) = the three town vendors' stock rows
  (`vendor()`), Lyssa's gamble rows, stash filter+sort chips, TRANSMUTE
  GOLDEN MIRROR. CHIP = torch CRAFT, smithRepair per-item costs, stash
  WITHDRAW/SALVAGE, Lukus + Addy DROP (the ☰ Journal DROP stays simple-
  plate). `btnPlate2/3` return true when the art drew (callers keep
  procedural fallbacks). Lukus/Addy journal rows grew 42→50px (step 58)
  — owner: "space out better". The chooser's "1 / 6" page count is gone.
  Cube menu widened (440→520; leaflet 460→520/640) and the leaflet's
  extraction-cost tokens FLOW-WRAP (Forgotten Souls was clipped); the
  Soul Crucible street plate rides at `it.y - 185` (above the painted
  cube). **THE WISHING FOUNTAIN**: town pad (600,712, kind 'fountain')
  at the fountain's south rim; `UI.drawTownEnter` shows the skeleton-hand
  medallion (`fountain.webp`, label WISH) → `Screens.fountain` — toss
  200g (a `UI.chip` button) for a RANDOM shrine buff (empowered/frenzied/
  blessed/fortune) lasting 600s: `Game.fountainBuff {buff,t}` ticks in
  `update()` (all states, real-time), `startLand` copies it onto the
  fresh Player's `shrine`, session-only (not saved).
- **CINZEL EVERYWHERE + BONE-WHITE SELECTION + PASSIVE MEDALLIONS
  (v1.6.99, owner rules)**: EVERY `px Georgia` font string in screens.js
  (334 of them — all menus and vendors, bold/italic/concat forms) became
  `px Cinzel, Georgia`, and `UI.btn`'s label font too (the in-game HUD in
  ui.js is untouched). ALL selection rings (skills actives slot, passives,
  chooser skill/rune, No-Rune socket) are **faded bone white `#cfc8b8`** —
  never bright green/purple/yellow (owner rule "keeping in theme with the
  arpg medieval look"). **PASSIVES are a GRID of circle-framed medallions**
  (5 cols desktop / 4 tablet / 3 mobile — `UI.desktop ? 5 : W>=760 ? 4 :
  3`), each passive in `UI.circleFrame` with its Cinzel name beneath
  (font MUST be set before `wrapLabel` — its last param is LINE HEIGHT,
  not size), '✔' inside when chosen, 'lvl N' inside when locked; same
  tap-to-assign behavior. CHOOSE SKILLS sits lower (`cyc+cr+44`).
  Inventory: EXPAND BAG on the simple plate, filter chips on `UI.chip`;
  the Jeweler's `gemStackList` chips moved gothic→SIMPLE plate (owner
  correction). Character footer: PARAGON + **CAMPFIRE** (renamed from
  CHANGE HERO) on the simple plate.
- **v1.7.3 — CHARACTER SELECT REBORN (owner art)**: `Screens.select` no
  longer draws the campfire scene (those helpers are dead code) — it
  draws `docs/art/ui/select_bg.webp` (painted "CHOOSE YOUR HERO — the
  battle for Ghallia begins" vista, BAKED title: landscape = cover-fit,
  portrait = width-fit anchored TOP so the title survives), THREE gothic
  `slot_frame.webp` frames centered (interior alpha'd out so the vista
  shows through; plinth + teal glow kept), a `ghost.webp` silhouette on
  each empty plinth with the `plus` plate at 25% opacity as the CREATE
  button (tap frame → `Profiles.create(i)` + open 'create'), and claimed
  frames showing the hero's painted avatar (breathing) with name/level
  by the divider (~0.145/0.195 of frame h) and a teal ellipse breath
  when selected. PLAY / DELETE HERO / retire-confirm flow unchanged.
  `Screens.create` draws `create_bg.webp` ("CREATE YOUR NEKROMANCER —
  The dead obey.", baked title) behind its panel, same portrait rule.
  All four warm in preloadArt; frame/ghost cut with the flat-black
  recipe (frame WITHOUT hole-fill so its interior is transparent).
- **v1.7.2 (owner list)**: (1) **✕ IN THE TITLE BAR** — `drawGlobalClose`
  anchors the plate at `panelRects[0].x+w-30, y+22`, inside the header
  band. (2) **GLOBAL RENAME: Rathma → Bellmahath** (capital-R display
  strings only; ids `rathma`/`rathmasoul` unchanged) — Instruction of
  Bellmahath, Souls of Bellmahath, Bellmahath's Chosen, Skills of
  Bellmahath, legendary prefix, credit line. (3) Cube street plate:
  `xOff = 52` for kind 'cube' in drawTownPlate (right + high, over the
  painted cube); cube + leaflet screens fully CENTERED in bone
  `#cfc8b8` (only reagent tokens keep color), tally/cost icon rows
  centered. (4) Fountain: gold under TOSS (not the corner); active buff
  in FADED BLOOD RED `#c98a8a`, two wrapped lines + its own countdown
  line. (5) **Artisan hubs draw their name BIG** (20px Cinzel custom
  header over an untitled panel): THARN THE SMITHY (renamed again from
  Blacksmith) / ORREN THE JEWELER / VESSA THE ENCHANTRESS.
  (6) smithSalvage: `matsRow(..., center)` mode, reagents dropped to
  y112 + centered, flavor wrapCentered, buttons below, "always free"
  footer deleted. (7) **smithCraft is SELECT-then-CRAFT?**: slot plates
  set `UI.sel.craftSlot`, the chosen slot's cost renders as centered
  gold + mat-icon tokens, a centered CRAFT? simple plate (180px) does
  the hammering; per-quality costLabels under the toggles are gone.
  (8) Torch bench: names/burn lines bone (`#e8e2d0`/`#c9bfa8`), radius
  text gone, drawer reagents centered (token-line flush layout), CRAFT
  chip bone. (9) Jeweler: socket explainer at y100 (list y134);
  UNSOCKET title plain; `gemStackList` rows = centered 66%-width SIMPLE
  plates with the gem ICON + "Tier ×N" in bone; merge/sell actions =
  compact centered simple plates; jewCraft's per-row icon deleted; SELL
  GEMS gold nudged left of the title-bar ✕. (10) mysEnchant: BACK +
  REROLL simple plates, affix rows = centered 74%-width simple plates in
  bone, **"undefined" property fixed** (stats without an `AFFIX_ROLLS`
  entry are skipped). cosmeticList rows are SIMPLE plates now (pets/
  wings/themes). (11) Wilds: titles lose their icons, the difficulty
  NAME sits on its own line under a "Difficulty" caption (arrows never
  overlapped again), mode rows on SIMPLE plates, ph +28. (12) Lukus +
  Addy ledger headers lose the "N OF 500 DONE" counts (bars stay).
  (13) devconfirm: ph 390, everything wrapCentered with air, DEV
  PANEL/CLOSE simple plates, screen in MENU_SCREENS (no EXIT).
  (14) vendor(): flavor wrapCentered 2 lines, gold right-aligned
  beneath, rows start py+96 (ph 126+…).
- **v1.7.1 (owner list)**: (1) The last PNGs (20 runes + 21 skill icons,
  1.6MB→272KB) converted to WebP; loaders in skills.js now request
  `.webp`. (2) **MOVE SPEED HARD CAP 25%** — `computeStats.moveSpeed`
  clamps to 0.25 (boots + paragon + everything); the ONLY exception is
  the new **FLEETFOOT** shrine buff (+100% move speed — Player.update
  multiplies past the cap): in the map-shrine pool (30s, world.js pick +
  game.js duration branch) and the fountain pool (10 min,
  FOUNTAIN_BUFFS). (3) **PARAGON**: every capped stat now max 50 (move
  included); `maxMana` label is MAXIMUM ESSENCE; Int/Vit per-point
  0.02→0.005 (uncapped). (4) **Character sheet = ONE wide scrolling
  column** (`twoCol = false`, pw ≤720). (5) **PATCH NOTES**: collapsed
  one-line rows (tap to expand; newest open via `UI.sel.pnOpen`),
  grouped by month header, off-screen notes get estimated heights (no
  wrapText) — 61fps; screen added to MENU_SCREENS (no round EXIT).
  (6) Campfire select: heading + YES RETIRE / NO KEEP on simple plates,
  'select' in NO_CLOSE_X. (7) Settings: Keys explainer = two centered
  lines; SAVE HERO is 62% width, centered.
- **v1.7.0 (owner mega-list)**: (1) **MATERIAL ICONS** — owner art in
  `docs/art/mats/{parts,dust,crystal,soul}.webp` (square-padded 96px),
  loaded by `Game.matImg`, drawn by global `drawMatIcon(ctx,key,x,y,s)`
  (utils.js, colored-dot fallback) — replaces the written names in the
  Character REAGENTS panel, the Blacksmith `matsRow`, and the Crucible
  leaflet (tally + extraction cost); the leaflet's explainer is one line
  now. (2) **✕ ON THE PANEL** — `drawGlobalClose` anchors the ✕ plate to
  `UI.panelRects[0]`'s top-right corner (screen-corner fallback);
  `UI.NO_CLOSE_X` = cube/lukus/addy/lyssa have NO ✕ at all, and the
  artisan intro sets `UI.introShowing` (reset in clearHits) which kills
  both ✕ and the round EXIT on the splash. (3) **ARTISANS**: hub titles
  are THARN THE BLACKSMITH / ORREN THE JEWELER / VESSA THE ENCHANTRESS;
  intro splash spaced out, flavor CENTERED (`Screens.wrapCentered`
  helper), "tap anywhere" whisper deleted, npc names surname-free.
  (4) **TORCH BENCH** rebuilt: pw 640, REAGENTS in a collapsible drawer
  (`UI.sel.torchReag`), lit-torch countdown kept, NO rarity tags, rows on
  the SIMPLE plate (rowH 82), CRAFT chip inside the plate at
  `px+pw-152`, BACK TO FORGE gothic; TORCH_TYPES.nephalem is now
  "Ascendant's Torch". (5) **smithCraft**: quality toggles + slot grid on
  SIMPLE plates, every row CENTERED, "Forges level X–Y" centered with
  the owner's Standard/Masterwork lines beneath, bag-note deleted.
  (6) **JEWELER**: socket/unsocket explainers centered+wrapped; merge/
  sell pw 620 with the chip row CENTERED; jewCraft restyled — centered
  Cinzel bone-white level/cost lines, 52px simple-plate rows, stats in
  `#cfc8b8`. (7) **ENCHANTRESS**: enchant list + cosmeticList text
  centered; her four benches joined MENU_SCREENS (no round EXIT — panel
  ✕/Escape); FOUR NEW PETS (graveHound dog / ghostMoth / marrowImp /
  tombToad — procedural draws in Game.drawPet). (8) **FOUNTAIN**: flavor
  + footer lines wrap via wrapCentered; buff text bone-white Cinzel from
  the shared `FOUNTAIN_BUFFS` plain-words table (data.js); the blessing
  ALSO shows on the Character sheet (JOURNEY, with description);
  Empowered now doubles essence regen while active (entities.js).
  (9) **STASH** wraps in its own UI.panel like Inventory. (10) Town's
  top-left ☰ is a SIMPLE-plate MENU button. (11) sysmenu rows
  Character→Achievements SIMPLE plate, SETTINGS gothic, ABANDON ornate.
  (12) Vendor rows inset text/gold 44px clear of the plate caps; Lyssa's
  column indented (`lx = max(30, W*0.055)`), orb costs pulled in; Addy
  DAILY QUEST gothic + ACCEPT simple; Lukus ACCEPT simple.
- **PAINTED PANELS for INVENTORY + SKILLS (v1.6.96, owner rule "see the UI
  in Character? Create similar… so everything matches")**: `invGrouped`
  wraps its whole list in `UI.panel` (title carries the bag count:
  "INVENTORY — n / N"), and `skills()` wraps both tabs in a full-height
  `UI.panel` titled SKILLS OF RATHMA (tab plates at `ppy+44`; both
  sub-screens' `sy` is 112 with slot circles pushed to `sy+40`/`sy+34` so
  the section labels clear them). The Journal's per-quest left stripe is
  the ACTIVE THEME's `title` color, not the giver's gold/violet (owner:
  "if violet, do violet").
- **PLATES EVERYWHERE + CINZEL HEADINGS (v1.6.84, owner rules)**: `btnPlate`
  also carries Accept Quest / Drop (Lukus, Addy, Journal), Campfire
  (character sheet), Choose Skills, the ACTIVES/PASSIVES tabs (selected =
  bright gold, unselected dim), every artisan BENCH row (labels stripped of
  emoji; description in small italics beneath), the TRAIN buttons, and gated
  quests ("REQUIRES LEVEL X" as live text on ONE plate — never baked images).
  ☰ MENU rows got real spacing (rowH 46/62, btnH −20 — the 1.42× overhang
  made touching plates). ALL headings are Cinzel parchment-gold `#d8c5a0`
  (UI.panel titles incl. MENU, character sheet sections, stash/invGrouped
  group headers + titles, settings — AUDIO/GAMEPLAY —, journal giver tags)
  — never the theme color, never bright greens/purples. **MENU NAVIGATION
  (supersedes v1.6.77): ✕/Escape on a ☰ child (character/radial/invGrouped/
  journal/skills/achievements/settings/paragon) returns to 'sysmenu'; ✕ on
  sysmenu exits to the playable screen** (closeAction).
- **DURABILITY + REPAIR (v1.6.84, owner spec, D3-matched)**: `Items.DUR_SLOTS`
  = the 6 armor slots + weapon/offhand — jewelry NEVER wears (D3 rule),
  torches burn instead. `durMax = 14 + mLvl·2.2 + rarity·30 + stars·90`
  (~20 low-level, ~900 artifact-5★); fresh gear = max/max; legacy items get
  durability lazily via `ensureDur` (no migration). Wear: every 10th hit
  taken → armor −1 (`Player.hurt`), every 60th successful cast → weapon+
  offhand −1 (`Skills.tryUse`), death → −10% of durMax on all (D3,
  `Game.onPlayerDeath` → `Items.wearOnDeath`). At 0 the item is BROKEN:
  `computeStats` gather, `setCount` and `equippedPowers` all skip it (still
  worn visually) until repaired. `statLines` prepends "🛠 Durability a/b".
  Repair: `repairCost = missing·(0.5 + mLvl·0.06 + rarity·0.4)` gold;
  `Screens.smithRepair` (Smithy's 5th bench) lists equipped+bag damaged
  gear, broken rows red, REPAIR ALL plate; `Items.repairItem/repairAll`.
- **DOOR + TALK MEDALLIONS (v1.6.82, owner art)**: the round ENTER/EXIT
  button (`UI.drawTownEnter`) draws the owner's painted medallions —
  `docs/art/ui/enter.webp` (doorway spilling light) when standing at a
  doorway (gentle breathing pulse), `exit.webp` (dark doorway) while a
  doorway screen is open, and `talk.webp` (speech-bubble ring) at the NPCs
  (Lukus/Addy/Lyssa). Label (ENTER/EXIT/TALK) beneath in Cinzel.
  Procedural circle fallback until the art loads.
- **THE GREAT RENAMING (v1.6.88, owner list — DISPLAY names only, all internal
  keys/ids unchanged)**: Story Mode→CAMPAIGN · Adventure Mode→EXPEDITIONS ·
  Bounties→HARVESTS · The Rift→THE OSSUARY · Nephalem Rift→THE ABYSS ·
  Seasons→BLOOD MOON · The Wilds Waypoint→WAYGATE · The Void Portal→THE
  SHROUD · Nephalem (Rift) Keys→CRYPT KEYS (`Hero.riftKeys`) · Master
  Keys→ASHEN KEYS (`Hero.masterKeys`) · Horadric's Cube→SOUL CRUCIBLE
  (`Hero.hasCube`, screen id 'cube') · Horadric cache/Stash→FORGOTTEN
  RELIQUARY · difficulties: Normal→APPRENTICESHIP, Hard→DISCIPLE,
  Expert→ADEPT, Torment→ASCENDANT I–XVI (`tormentTier` etc. keep their
  names). Waypoint mode rows + select-screen DELETE HERO are plates.
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

- **LYSSA, MISTRESS OF FATE (v1.6.66, owner request)** — the owner's painted
  gambler (`docs/art/npc/lyssa_idle.png`, chroma-keyed `Game.lyssaSprite()`,
  drawn at (880,477), pad (880,500) kind 'lyssa', near the rift pavilion;
  plate says just 'Lyssa'). **AMIDRASSI ORBS** (`Hero.amOrbs`, snapshot
  parity): every Rift/Season boss completion grants `randInt(1,10)` (in the
  riftMode reward block). **Kadala-style gambling** (`Items.GAMBLE_COSTS`:
  armor 10 · offhand/ring 15 · weapon 25 · amulet 30; `Items.gambleItem(slot)`
  — 20% magic / 45% rare / 25% epic / 10% legendary with `legendaryStars
  (tormentTier())`, mLvl = level + 3·difficulty, item → bag). `Screens.lyssa`
  = the NPC stage + orb purse + FATE DEALT card (`UI.sel.lastGamble`) +
  slot table; her ! lights when orbs ≥ cheapest cost.

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
  — a compact overlay (v1.6.62 owner ORDER: 👤 CHARACTER top · 🎒 INVENTORY ·
  📜 JOURNAL (`Screens.journal`: read-anywhere quest list with live bars, DROP
  buttons, "✔ READY — see Lukus"; turn-ins stay with Lukus) · ⚔ SKILLS &
  PASSIVES · 🏆 ACHIEVEMENTS · ⚙ SETTINGS; compact rows below H<520) — and the
  🎒 button → radial. **ACHIEVEMENTS (v1.6.62)**: `ACHIEVEMENTS` (data.js, 24
  entries `{name, desc, need, cur()}`) computed LIVE from lifetime counters (no
  extra save state); `Screens.achievements` = scroll list, gold+✓ when earned,
  mini progress bar otherwise. **INVENTORY LAYOUT TOGGLE (v1.6.62, owner
  rule)**: `Settings.g.invGrouped` (Settings ▸ Gameplay "Inventory: Grouped
  list") — OFF = the radial wheel; ON = `Screens.invGrouped`, a grouped list in
  fixed `INV_GROUP_ORDER` (helm→shoulders→chest→gloves→legs→boots→amulet→
  ring1→ring2→weapon→offhand→torch): equipped row tagged EQUIPPED (green tint,
  MANAGE SOCKETS), bag rows with upgrade arrows sorted best-first, tap →
  itemCard + EQUIP/SALVAGE/SOCKET/STASH, filter chips, gemModal on top,
  EXIT-zone-aware scroll. **THE SURVIVOR'S CAMP HUB IS RETIRED**: `Game.toCamp()` now calls
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
  Diablo names) / Orren Gildstone "WELCOME TO THE JEWELER'S" / Vessa Nightweave "WELCOME TO THE SANCTUM" (Jeweler+Mystic renamed v1.6.64, owner rule),
  each with its own info line + enter-button label); tap anywhere or the button
  sets `UI.sel.inside` → benches. Bench-close `backToHub()` re-sets
  `sel.inside` so the splash only plays on street entry. Smith: `smithSalvage`/`smithWeapon`/
  `smithArmor` (shared `smithCraft`)/`torches`. Jeweler: `jewSocket` (reuses `gemModal`)/
  `jewUnsocket` (rows show ONLY the item name beside the gem icon, v1.6.64)/`jewMerge`/`jewSell` (both via `gemStackList` — type filter chips + tier
  sort)/`jewCraft` (**v1.6.64 owner spec: `Items.GEM_CRAFT_LEVELS` — jeweler level fixes BOTH the cut and the cost: L1 Chipped 1,000g → L2 Square → … → L10 Royal Imperial 700,000g; `gemCraftSpec()`/`craftGem(type)` mint `{type, tier}` directly**). Maxed artisans show NO level line (`showTrain` in `artisanHub`).
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
  **THE JOURNAL (v1.6.55, owner rule "up to 7 quests"; v1.6.65: slots are PER
  GIVER — 7 of Lukus's AND 7 of Addy's ride together, `Hero.journalCount(src)`
  gates accepts/markers/dialog counts, applySnapshot caps per giver, and the
  menu journal is GROUPED BY GIVER with colored stripes/bars — Addy violet,
  Lukus gold — each section showing its own n/7 + ledger bar)**: `Hero.journal` =
  [{idx, base[, src:'A']}] (≤ `QUEST_JOURNAL_MAX`=7 per giver), `Hero.questNext` = next
  fresh offer, `Hero.questRepool` = abandoned idxs (re-offered FIRST, lowest
  first — nothing is ever lost), `Hero.questLine` = quests TURNED IN (the
  ledger bar). API on Hero: `questProgress(entry)` / `questOffer()` /
  `acceptQuest()` / `abandonQuest(entry)` / `completeQuest(entry)` (pays
  gold/souls/XP/gem, bumps questLine). Turn-ins are order-independent,
  straight from each journal row; milestones (abs) can't be dropped. The
  dialog's journal + NEXT DEED column drag-scrolls via `UI.sel.scrollRegion`.
  Old saves migrate: the single `quest` → journal[0], `questNext` derived
  (old `{id,...}` quests dropped on load).
  **ADDY, QUEEN OF THE UNDERWORLD (v1.6.63, owner request)** — the owner's
  painted rogue (`docs/art/npc/addy_idle.png`, chroma-keyed via
  `Game.addySprite()`, drawn by `Game.drawAddy` at (1150,492), station pad
  (1150,515) kind 'addy' — placed where the owner's character stood, east of
  the rift pavilion). **NPC plates show SHORT names only (owner rule)**:
  'Lukus' / 'Addy' on the street; full name + title only in their dialogs.
  Her `ADDY_QUEST_LINE` = 500 MORE quests, ALL gated level 70, built by the
  shared `makeQuestLine({salt:7777, addy:true})` (salt 0 keeps Lukus's line
  byte-identical) using per-template rogue opener pools (`T.addy`) so all
  1000 names are globally unique; no milestones; same strict escalation.
  Journal entries carry `src:'A'` for her jobs; `Hero.questOffer/acceptQuest`
  take a src param, `questRewardSrc('A', i)` pays deeper endgame gold/souls
  (`questRewardTextFor(entry)` renders either ledger); `Hero.addyLine/
  addyNext/addyRepool` persist. **THE QUEEN'S ERRAND (daily)**: `dailyDeed
  (dateKey)` — deterministic per real-world day (`Hero.dailyKey()`),
  `Hero.daily={date,base,done}` (`dailyState/acceptDaily/completeDaily`),
  level-70 gated, pays 1 random MARQUISE gem + `Items.addyDailyItem()` —
  owner odds 90% legendary 0★ / 6% 1–3★ / 3% 4–5★ / 1% artifact, slot an
  even roll across all equip slots (via `Items.generate(mLvl, boost, slot,
  force={rarity,stars})`). `Screens.addy` mirrors the Lukus stage (purple
  accents, daily card, her journal rows keyed `'A'+idx`, NEXT JOB). Station at
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
