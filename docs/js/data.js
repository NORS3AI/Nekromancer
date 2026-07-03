'use strict';
// ---------------------------------------------------------------------------
// Static game data: the Diablo 3 Nekromancer skill kit (real skills, real
// unlock levels), passives, equipment slots, rarities, affixes, gems,
// crafting materials, monsters and the lands of the campaign.
// ---------------------------------------------------------------------------

// ------------------------------ rarities -----------------------------------

// Indexes matter: 0 Common · 1 Magic (uncommon) · 2 Rare · 3 Epic ·
// 4 Legendary · 5 Set. Saves from before Epic existed are migrated on load.
const RARITIES = [
  { name: 'Common',    color: '#c9bfa8', mult: 1.0, salvage: 'parts',   salvageN: 2 },
  { name: 'Magic',     color: '#6a9aff', mult: 1.4, salvage: 'dust',    salvageN: 2 },
  { name: 'Rare',      color: '#ffd76a', mult: 1.9, salvage: 'crystal', salvageN: 1 },
  { name: 'Epic',      color: '#b06adf', mult: 2.3, salvage: 'crystal', salvageN: 2 },
  { name: 'Legendary', color: '#ff8c2a', mult: 2.7, salvage: 'soul',    salvageN: 1 },
  { name: 'Set',       color: '#4ade80', mult: 3.1, salvage: 'soul',    salvageN: 2 }
];

const GAME_VERSION = 'v0.5.0-alpha';

// Newest entry first. OWNER RULE: append a new entry (and bump
// GAME_VERSION) with EVERY addition and bug fix.
const PATCH_NOTES = [
  {
    v: 'v0.5.0-alpha', date: 'July 2026',
    notes: [
      'NEW — STORY MODE (Act I), in The Wilds above Adventure Mode. Search ten lands, each haunted by a named legendary ghost lord (Sir Aldric the Hollow Knight, Lady Morwenna the Weeping Wraith, and eight more). Banish all ten and the Skeleton King\'s grave opens',
      'The Skeleton King greets you with “You dare come to my grave? You will die!” — slay him for a 40% chance at The Royal Grandeur ring',
      'NEW BIOMES — Story maps roll through varied lands: verdant meadows, whispering pine woods, tangled jungle, sunken mire, scorched dunes and broken barrens. Each has its own ground, foliage and species — oaks, pines, palms and cactus — and biomes never clash (no desert bordering snow)',
      'Every Story map is framed by a NATURAL border — a wall of forest, cliff or mountain — so no map has a bare rectangular edge. No two maps are alike',
      'Only Act I is open for now; more Acts to come'
    ]
  },
  {
    v: 'v0.4.3-alpha', date: 'July 2026',
    notes: [
      'Reverted the Nephalem Mongrel to a flat 4% per-wave spawn chance (still only one alive at a time) instead of a 1–2 per-run cap — sightings stay a pleasant surprise. Heartstring stays a 35% drop'
    ]
  },
  {
    v: 'v0.4.2-alpha', date: 'July 2026',
    notes: [
      'Nephalem Mongrel now appears only 1–2 times over a whole Rift run (rolled per run), then no more',
      'Nephalem Heartstring drop chance tuned to a flat 35%'
    ]
  },
  {
    v: 'v0.4.1-alpha', date: 'July 2026',
    notes: [
      'The Nephalem Mongrel is now a true RARE NAMED purple elite — only one ever prowls a Rift at a time, it spawns far less often, and each one bears its own name (Gorehound Vael, Skarn the Ravener, and more). A toast heralds its arrival',
      'Nephalem Heartstring is now a CHANCE drop from the Mongrel (~60%, improving with Torment tier) rather than a guaranteed one'
    ]
  },
  {
    v: 'v0.4.0-alpha', date: 'July 2026',
    notes: [
      'NEW SYSTEM — TORCHES: a new Torch equipment slot. A lit torch casts a pool of light that pushes back the darkness of the crypts, then burns out and vanishes when its fuel runs dry. Every hero starts with a Wood Torch',
      'Three torches crafted at the Blacksmith (new TORCH BENCH): Wood (12 min), Iron (37 min) and Nephalem (75 min). Forged torches are sent to your Stash for safe keeping — equip them from the Inventory wheel',
      'NEW REAGENTS — smash chairs, tables and bookcases for Lumber; pots, urns and stone clutter for Iron Rivets. Recipes: Wood = 10 Lumber · Iron = 10 Lumber + 15 Rivets · Nephalem = 25 Lumber + 40 Rivets + 3 Nephalem Heartstring',
      'NEW ELITE — the Nephalem Mongrel, a rare purple beast that prowls Rifts and drops Nephalem Heartstring, the key reagent for the mightiest torch',
      'Crypts now read as genuinely dark, lit only by your torch; open daylit lands stay bright'
    ]
  },
  {
    v: 'v0.3.9-alpha', date: 'July 2026',
    notes: [
      'NEW LEGENDARY RING — The Royal Grandeur: reduces the number of items needed for set bonuses by 1 (minimum 2), so full Grace of Inarius fires at just 5 pieces. Drops from the Act 1 boss (The Grave Warden) and nowhere else'
    ]
  },
  {
    v: 'v0.3.8-alpha', date: 'July 2026',
    notes: [
      'Haedrig\'s Gift now also includes the build\'s legendary set items: Convention of Elements & Krysbin\'s Sentence (rings), Funerary Pick (weapon), Iron Rose (phylactery) and Aquila Cuirass (chest) — the full 11-piece kit straight to your Stash'
    ]
  },
  {
    v: 'v0.3.7-alpha', date: 'July 2026',
    notes: [
      'Dev panel: new "Haedrig\'s Gift" cheat — instantly sends all 6 Grace of Inarius set pieces (with their per-slot affixes) to your Stash'
    ]
  },
  {
    v: 'v0.3.6-alpha', date: 'July 2026',
    notes: [
      'NEW LEGENDARIES: Convention of Elements (ring) — cyclically gain +200% damage for 4s on a rotating timer; and Aquila Cuirass (chest) — while above 90% essence, all damage taken is halved',
      'Iron Rose now casts a free Death Nova on EVERY Siphon Blood (was 50%) and carries +15% Death Nova + Area Damage',
      'Funerary Pick: with it equipped, the Siphon Blood Power Shift rune grants 20% per stack (up from 10%) and benefits all skills; it also carries 24% Area Damage',
      'Krysbin\'s Sentence: +100% damage to slowed foes (up from 75%), still TRIPLE vs stunned/rooted',
      'All these legendaries drop from Rift Guardians and legendary drops; they carry their signature D3 affixes'
    ]
  },
  {
    v: 'v0.3.5-alpha', date: 'July 2026',
    notes: [
      'GRACE OF INARIUS set tuned to its real Diablo 3 numbers — (2) Bone Armor damage +1000%; (4) +3% damage reduction per enemy hit; (6) Bone Armor raises a bone tornado dealing 1000% weapon damage that marks foes to take +19000% damage from you. Full Inarius is now a true nuke',
      'Set pieces carry their D3 affixes: Helm & Boots grant +15% Death Nova damage; Gloves & Shoulders grant a 20% chance to deal Area Damage on hit',
      'NEW: Area Damage — your hits have a chance to splash a share of the damage onto nearby enemies'
    ]
  },
  {
    v: 'v0.3.4-alpha', date: 'July 2026',
    notes: [
      'Emeralds retuned: a Perfect Emerald now gives +20% crit chance (was ~13%). Tiers scale 4% / 8% / 12% / 16% / 20%'
    ]
  },
  {
    v: 'v0.3.3-alpha', date: 'July 2026',
    notes: [
      'EMERALD IN BOOTS now grants +20% movement speed (per emerald) instead of its crit — stack them with the new boots Movement Speed affix to really fly'
    ]
  },
  {
    v: 'v0.3.2-alpha', date: 'July 2026',
    notes: [
      'MULTI-AREA JOURNEYS, Diablo-style: bounties and Adventure Mode now span 2–3 linked areas instead of one map. No more being stuck in a single land',
      'Each earlier area is guarded by a CHAMPION — slay it to open a descent portal and travel deeper into a fresh, newly-generated area (new layout, new packs, the new war-host enemies)',
      'The FINAL area holds the land\'s named boss; slaying it opens the portal home and the Horadric cache reward',
      'Your health and essence carry with you as you descend — it\'s one continuous run, not a free heal each area. Rifts remain a single endless map'
    ]
  },
  {
    v: 'v0.3.1-alpha', date: 'July 2026',
    notes: [
      'RIVERS ARE NOW CURVY & UNPREDICTABLE: streams meander and wind across the land instead of running dead-straight',
      'Rivers no longer cut a map in half — they are length-capped so there is always a way around, and wooden bridges still offer the shortcut across'
    ]
  },
  {
    v: 'v0.3.0-alpha', date: 'July 2026',
    notes: [
      'ARMOR is now a thing: a new Armor stat rolls on gear, and DIAMOND gems now grant Armor (instead of life regen). More armor = more damage reduction (up to 80%). Your Armor and its % reduction show on the character sheet',
      'PERFECT gems now grant +20% damage in ANY slot (not just weapons) — per gem',
      'RUBY IN THE HELM now gives an EXPERIENCE bonus instead of damage: +3% at Chipped, scaling up to +20% at Perfect',
      'BOOTS can now roll a new MOVEMENT SPEED affix, from +1% up to +25% — the character sheet shows your total move speed'
    ]
  },
  {
    v: 'v0.2.9-alpha', date: 'July 2026',
    notes: [
      'NEW ENEMIES — the war-host arrives:',
      'Gore Hound — a fast, lunging pack beast that closes the distance in a blink',
      'Damned Soldier & Fallen Knight — armored sword-wielders that shrug off knockback; Knights cleave, catching your minions in the swing',
      'Corpse Bloat — a big, slow sack of rot that BURSTS in a toxic AoE on death, hurting you and your minions — kill it at range or run',
      'Bone Catapult — a siege engine that barely moves but lobs telegraphed mortars from all the way across the field. Dodge the landing circles',
      'These are seeded into the tougher lands, and all of them roam Rifts and Adventure maps'
    ]
  },
  {
    v: 'v0.2.8-alpha', date: 'July 2026',
    notes: [
      'Terrain brightened further — floors and dungeon paths are now clearly lit and easy to read at a glance'
    ]
  },
  {
    v: 'v0.2.7-alpha', date: 'July 2026',
    notes: [
      'LIGHTER TERRAIN: the ground was too dark to read. Floors and paths are now lifted out of near-black so scenery, packs and objects stand out',
      'DUNGEON PATHS POP: crypt/ruin floor tiles now get a soft lit wash so corridors and rooms read clearly against the dark walls — much easier to navigate'
    ]
  },
  {
    v: 'v0.2.6-alpha', date: 'July 2026',
    notes: [
      'RIFT KEY DROPS REWORKED: Normal Rift Guardians now drop 0–3 Nephalem Rift Keys; Nephalem Rift Guardians drop 0–1 Master Nephalem Rift Keys',
      'SEASONS now GUARANTEE an awesome piece every clear — a random Grace of Inarius set piece (or a legendary power once your set is complete), plus a chance to refund a Master key',
      'Difficulty is now set right in THE WILDS menu with a ◀ ▶ stepper, so one setting applies to every mode instead of per-screen',
      'PERFECT gems (top quality, any type) now grant +20% weapon damage when socketed in a weapon',
      'Mystic cost now reads cost/owned (e.g. "1591/500 gold · 72/6 souls")',
      'Fixed the dev panel: "Max level" artisan cheats now correctly say (10), not (100)'
    ]
  },
  {
    v: 'v0.2.5-alpha', date: 'July 2026',
    notes: [
      'RIVERS & BRIDGES: open lands can now be cut by flowing rivers you cross on wooden plank bridges. Water blocks you (and monsters) except on a bridge; every river is guaranteed a crossing so the boss is always reachable',
      'FORESTS: dense groves of dead trees you weave through for cover, scattered across the wilds',
      'MAP VARIETY & SIZE: maps now vary in size — some lands are far bigger than others (and some are rectangular). The Desolate Sands is a vast open waste; the Blood Marsh is criss-crossed by streams and groves; the Weeping Hollow drowns among trees',
      'Rifts and Adventure maps roll their own size, rivers and forests each visit for more variety; bigger maps carry proportionally more scenery'
    ]
  },
  {
    v: 'v0.2.4-alpha', date: 'July 2026',
    notes: [
      'FIXED: buttons with long labels (like the Season screen\'s "NEED A MASTER NEPHALEM RIFT KEY") spilled off both edges on mobile. All buttons now auto-shrink their text to fit, so nothing overflows the screen',
      'Season screen labels tightened and the footer note now fits phone widths'
    ]
  },
  {
    v: 'v0.2.3-alpha', date: 'July 2026',
    notes: [
      'The TRAIN button now disappears once an artisan (Blacksmith / Jeweler / Mystic) reaches max level 10 — the header shows "LEVEL 10 / 10 (MAX)"',
      'Mystic enchant cost now shows what you OWN vs what it needs, per material — e.g. "6/72 souls · 500/1591 gold" — turning red when you\'re short, so you can see your Forgotten Souls at a glance'
    ]
  },
  {
    v: 'v0.2.2-alpha', date: 'July 2026',
    notes: [
      'Salvage clarified into two paths: INDIVIDUAL breakdown from your Inventory is ALWAYS free at any level for any item — Epics, Legendaries, everything, whenever you wish',
      'The BLACKSMITH\'s bulk "salvage all" convenience is the level-gated one: Epics unlock at level 60, Legendaries/Sets at level 70 (common/magic and rares always available). This is just the ease-of-access mass-salvage — you can still break the finest gear down one at a time from the Inventory at any level',
      'Blacksmith now has four bulk buttons: COM+MAG · RARES · EPICS (L60) · LEGENDS (L70)'
    ]
  },
  {
    v: 'v0.2.1-alpha', date: 'July 2026',
    notes: [
      'Salvage hardening: ALL loot is now guaranteed salvageable — including Epic vendor buys like the Fabled Soul Vessel. Any item, any rarity, any level, no cost. Added a safety fallback so even an odd/legacy item can never be un-salvageable',
      'Note: if you saw a "can\'t salvage" message earlier, it was the old level-60 Epic gate on a stale deployment — that gate is gone'
    ]
  },
  {
    v: 'v0.2.0-alpha', date: 'July 2026',
    notes: [
      'FIXED: WASD / arrow movement could silently stop working after visiting Settings → Keys. Arming a key rebind and then leaving the menu could let the next keypress get "stolen" from a movement key. Rebinds now only apply while the Keys menu is open, and WASD + arrows are guaranteed to always drive movement (self-heals broken bindings on load)',
      'If your movement keys are still stuck, open Settings → Keys → RESET TO DEFAULTS — but they should auto-repair now',
      'SALVAGE IS FREE & UNRESTRICTED: any gear (including Epic and Legendary) can be crushed into materials at ANY level — no level requirement, no gold cost. Removed the old level-60/70 salvage gate'
    ]
  },
  {
    v: 'v0.1.9-alpha', date: 'July 2026',
    notes: [
      'SHARED STASH: the Stash is now one account-wide vault shared by ALL characters and save slots — deposit on one hero, withdraw on another. It lives in its own storage and never travels with a single save',
      'Deposit individual items: the inventory now has a DEPOSIT TO STASH button on any selected bag item (the Stash screen still has DEPOSIT ALL and per-item WITHDRAW)',
      'Existing stashes are migrated into the shared vault automatically on first load',
      'NEW PASSIVE SLOT AT LEVEL 3: you now unlock your first passive slot at level 3 (slots now unlock at 3 / 10 / 20 / 30 / 45 — five total)'
    ]
  },
  {
    v: 'v0.1.8-alpha', date: 'July 2026',
    notes: [
      'DIFFICULTY NOW CONTROLS THE HORDE: each difficulty step above Normal spawns +10% more monsters (Hard/Expert/Master), and every Torment tier multiplies the swarm by ×1.35 on top of that',
      'Torment XVI is wild — hundreds-to-thousands of enemies flood the land in dense packs, with far more roaming the map and endless waves in Rifts',
      'Packs are larger, extra roaming packs scatter across the floor, and Rift concurrent-enemy caps and wave sizes scale with the difficulty so the screen truly fills up at high Torment',
      'Normal difficulty is unchanged — the swarm only grows as you climb'
    ]
  },
  {
    v: 'v0.1.7-alpha', date: 'July 2026',
    notes: [
      'RIFTS REBUILT: slay rare-elite packs to scatter purple orbs (10 points each) and fill a pulsing purple bar — top of screen on desktop/tablet, under your portrait on mobile',
      'Point goals: normal Rift 250 · Nephalem Rift 750 · Master (Season) Rift 1500. Rifts are large, endlessly repopulating maps you roam to hunt elites',
      'At the goal a distinct Rift Guardian rises; slay it. It has a 50/50 key drop (Nephalem Rift Keys from normal rifts, Master Nephalem Rift Keys from Nephalem/Season rifts) and a legendary chance scaling 5% at Torment I to 30% at Torment XVI',
      'Seasons now require a Master Nephalem Rift Key and run a 1500-point Master Nephalem Rift',
      'Adventure Mode is now a 3–9 tile land; Bounties remain a single map'
    ]
  },
  {
    v: 'v0.1.6-alpha', date: 'July 2026',
    notes: [
      'New STASH (camp menu, after Skills & Passives): 100-slot deep storage with sort (Score/Rarity/Slot/Name), filter chips (All/Weapon/Armor/Jewelry) and a name search',
      'Deposit your whole bag with one tap, withdraw or salvage any stashed item, with upgrade arrows vs your equipped gear',
      'The stash is saved with your hero'
    ]
  },
  {
    v: 'v0.1.5-alpha', date: 'July 2026',
    notes: [
      'Salvaging Epics now requires level 60, and Legendary/Set items require level 70 (the SALVAGE button shows the level needed)',
      'Salvaged socketed gems return to your pouch and are announced at the bottom of the screen',
      'Artisans (Blacksmith, Jeweler, Mystic) now cap at level 10 instead of 100 — level 1 does basic work, level 10 crafts at your full level (top-tier items and gems). Old saves are clamped to the new scale',
      'Manual saves are auto-labelled "Level 13 — 8:41 AM" (level and time) — no more naming prompt'
    ]
  },
  {
    v: 'v0.1.4-alpha', date: 'July 2026',
    notes: [
      'Every one of the 21 skills now has its full set of 6 authentic Diablo 3 runes to choose from in the Skills menu',
      'Newly wired rune effects include Sudden Impact / Frost Spikes / Bone Pillars / Blood Spikes, Blood Scythe / Cursed Scythe / Execution, Bone Nova / Tendril Nova / Blight, Close Quarters / Dead Cold, and Hemostasis / Molting / Transfusion — on top of the runes already active',
      'Remaining runes are selectable and show their real D3 description; more of their effects are being wired in over coming updates'
    ]
  },
  {
    v: 'v0.1.3-alpha', date: 'July 2026',
    notes: [
      'Socketing popup gains gem sort + filter chips (All / by type), sorted finest-first',
      'Desktop: the health and essence globes now flank the action bar as one centered cluster instead of sitting in the far corners',
      'Mobile top-left: red health bar, a half-height blue mana bar beneath it, and a half-height yellow experience bar under that, with the level on the portrait',
      'Desktop hover tooltips: point at a skill, rune, passive, action-bar slot or equipment slot to see its name and what it does',
      'At level 70, a green gem in your weapon is boosted +20% and a red gem is reduced 5% (weapon slot only)'
    ]
  },
  {
    v: 'v0.1.2-alpha', date: 'July 2026',
    notes: [
      'DESKTOP HUD rebuilt Diablo-style: a red health globe (left) that drains smoothly when you take damage, a teal essence globe (right), and a yellow experience bar across the bottom',
      'Action bar is now the classic 6-slot layout — Left Click (primary), keys 1-4 (four skills) and Right Click (secondary) — each slot labels its key, with the potion beside it',
      'The loadout is now 6 slots (primary · secondary · skills 1-4); old saves are trimmed to match',
      'Mobile keeps its twin-stick radial controls; the globe HUD is desktop-only'
    ]
  },
  {
    v: 'v0.1.1-alpha', date: 'July 2026',
    notes: [
      'New passive — Grave Caller (level 3): a fresh corpse rises at your feet every 3 seconds',
      'Devour rune — Aura (level 22): passively devours nearby corpses for essence and 10% life, with a pulsing green aura',
      'Frailty rune — Aura (level 30): enemies at 10% life or less near you die instantly, with a pulsing purple aura',
      'Runes can now have their own unlock level; locked runes show the level needed',
      'Added an assets/ folder (icons, images, models, music, ambience, fx, weather) so custom media can be dropped in later'
    ]
  },
  {
    v: 'v0.1.0-alpha', date: 'July 2026',
    notes: [
      'Loot, salvage, forge and enchant messages now appear in a feed at the BOTTOM of the screen and stay visible inside the artisan menus',
      'Items can hold MULTIPLE gems now — up to 4 slots on Legendary, 3 on Epic, 2 on Rare, 1 on Magic',
      'The Mystic enchant shows the list of possible outcomes, and has a rare 10% chance to uncover a new gem slot (up to the rarity cap)',
      'A red gem (Ruby) socketed in your weapon grants +25% damage',
      'Existing saves upgrade automatically: a socketed gem becomes the item\'s first gem slot'
    ]
  },
  {
    v: 'v0.0.9-alpha', date: 'July 2026',
    notes: [
      'A red "!" now appears on any equipment slot (and the camp INVENTORY button) that has a gear upgrade waiting in your bag — no more guessing what to equip',
      'Fixed the two ring slots: rings now show for BOTH slots and you can wear two at once. Equipping into a ring slot drops the ring there; a unique legendary/set piece can still only be worn once',
      'Rebindable keyboard controls: Settings → KEYS lets you tap a key to remove it or ＋ to add one, with RESET TO DEFAULTS',
      'New default keys — I or B: Inventory · K: Skills · P: Passives · C: Character · Q: potion · 1–5: skill slots · Space/J: primary · Esc: back'
    ]
  },
  {
    v: 'v0.0.8-alpha', date: 'July 2026',
    notes: [
      'Corpses no longer vanish after a few seconds — they linger on the battlefield as necromancer fuel',
      'New "Corpse limit" setting: bodies pile up until this many exist, then the oldest fade. Cycle 100 / 500 / 1,000 / 2,500 / 5,000 / 10,000 to stress-test performance',
      'The Settings menu now has an ABOUT section: "Game creator" opens the dev panel and the version button opens these patch notes (no longer only reachable from the title screen)'
    ]
  },
  {
    v: 'v0.0.7-alpha', date: 'July 2026',
    notes: [
      'SECONDARY skill slot, Diablo style: the loadout is now 7 slots — Primary, Secondary, and five skills',
      'Desktop: LEFT CLICK fires the Primary, RIGHT CLICK casts the Secondary (aimed at the cursor, channels while held), keys 1-5 cast the five skill slots',
      'Touch: the Secondary gets its own bigger button floating above the skill cluster',
      'Old saves keep their loadout — the skill that was in slot 1 becomes the Secondary',
      'Live-site deploys now run through our own GitHub Actions workflow — the Pages source was switched to "GitHub Actions", ending the double-deploy race that kept builds stuck in the queue all afternoon'
    ]
  },
  {
    v: 'v0.0.6-alpha', date: 'July 2026',
    notes: [
      'Legendary powers now do their REAL Diablo 3 things: Bloodtide Blade (+350% Death Nova damage per nearby enemy), Funerary Pick (Siphon Blood drains 3 targets, each grants +20% damage), Iron Rose (channeling Siphon Blood auto-casts free Death Novas), Haunted Visions (permanent Simulacrum that drains life), Wisdom of Kalan (Bone Armor up to 75% damage reduction), Krysbin\'s Sentence (triple damage to stunned/rooted)',
      'SKILL RUNES: choose runes in the Skills menu — Blood Nova, Blood and Bone (two simulacrums), Dislocation (Bone Armor stuns), Power Shift, Blood Spear, Bloody Mess',
      'Dev panel cheats now save with your hero',
      'Gem chips in the socket popup show just the tier — the color is the gem; tap to read the full name',
      'Jeweler gem list is scrollable when your collection outgrows the panel',
      'Pages deploys switched to a maintained GitHub Actions workflow (fixes the Node.js 20 deprecation warning and deploy queue timeouts)'
    ]
  },
  {
    v: 'v0.0.5-alpha', date: 'July 2026',
    notes: [
      'Equipment wheel is much smaller on portrait phones, and the bag list reserves exact space for the selected item — the EQUIP / SALVAGE / SOCKET buttons always stay on screen'
    ]
  },
  {
    v: 'v0.0.4-alpha', date: 'July 2026',
    notes: [
      'Every menu now shows the red ✕ close button drawn above all content — including the bounty reward screen, the vendor, The Wilds and the Bounties map (previously some panels could cover it on phones)'
    ]
  },
  {
    v: 'v0.0.3-alpha', date: 'July 2026',
    notes: [
      'THE WILDS: new camp menu holding Seasons, Adventure Mode, Rifts and Bounties (the renamed waypoint map)',
      'Adventure Mode: a randomized land at your level with a fresh bounty every visit',
      'Rifts split in two: normal Rifts (levels 1–69) whose Guardians can drop Rift Keys, and Nephalem Rifts (level 70) that consume a key',
      'New EPIC rarity (purple) between Rare and Legendary',
      'Drop rates rebuilt: 55% common · 20% magic · 12% rare · 7% epic · legendary 1% (2.29% at 60+, 2.89% at 70)',
      'Level 70 unlocks Torment I–XVI: +1% legendary at T1 up to +33.3% at T16'
    ]
  },
  {
    v: 'v0.0.2-alpha', date: 'July 2026',
    notes: [
      'Menus no longer close from stray taps — dismiss with the new red ✕ or the Escape key',
      'Gem socketing is a centered popup: tap gems to read them, then Socket / Unsocket (free) / Cancel',
      'Breakable clutter: pots, chairs, tables, bookcases, crypts, gravestones — smashed by spells and the Inarius bone tornado',
      'Enchanting much cheaper for low-rarity and low-level gear',
      'Fix: artisan popups no longer let taps fall through to the camp behind them'
    ]
  },
  {
    v: 'v0.0.1-alpha', date: 'July 2026',
    notes: [
      'The full Diablo 3 Nekromancer kit: 21 actives at authentic unlock levels, 12 passives',
      'Five lands of Sanctuary — open wilds and true crypts — with kill bounties',
      'PS5-console-style radial equipment wheel, gems, sockets',
      'Artisans: Blacksmith (masterwork forging), Jeweler, Mystic (choose-your-affix enchanting)',
      'Wandering vendors, treasure chests, shrines, telegraphed bounty bosses',
      'Season of the Grace of Inarius: Nephalem Rifts at level 70, 6-piece set hunt',
      'Legendary powers: Bloodtide Blade, Krysbin\'s Sentence, Trag\'Oul\'s Corroded Fang',
      'Settings: 5 audio channels, weather, Diablo-Immortal-style gameplay options',
      'Twin-stick mobile controls with drag-to-aim skills and iPhone safe-area support'
    ]
  }
];

// --------------------------- crafting materials ----------------------------

const MATERIALS = {
  parts:   { name: 'Reusable Parts',  color: '#c9bfa8' },
  dust:    { name: 'Arcane Dust',     color: '#6a9aff' },
  crystal: { name: 'Veiled Crystals', color: '#ffd76a' },
  soul:    { name: 'Forgotten Souls', color: '#ff8c2a' },
  // Torch-crafting reagents.
  lumber:      { name: 'Lumber',                color: '#8a6f4a' },
  rivets:      { name: 'Iron Rivets',           color: '#9aa0a8' },
  heartstring: { name: 'Nephalem Heartstring',  color: '#b06adf' }
};

// Torches — a consumable equipped in the Torch slot that lights the darkness
// for a real-time duration, then burns out. Crafted at the Blacksmith.
const TORCH_TYPES = {
  wood:     { name: 'Wood Torch',     minutes: 12, radius: 300, color: '#ffb24a', rarity: 0, recipe: { lumber: 10 } },
  iron:     { name: 'Iron Torch',     minutes: 37, radius: 380, color: '#ffcf6a', rarity: 2, recipe: { lumber: 10, rivets: 15 } },
  nephalem: { name: 'Nephalem Torch', minutes: 75, radius: 470, color: '#d8b4f0', rarity: 4, recipe: { lumber: 25, rivets: 40, heartstring: 3 } }
};

// --------------------------------- gems ------------------------------------

const GEM_TIERS = ['Chipped', 'Flawed', 'Regular', 'Flawless', 'Perfect'];

const GEM_TYPES = {
  ruby:     { name: 'Ruby',     color: '#e04a5a', stat: 'dmg',  perTier: 0.05,  label: v => `+${Math.round(v * 100)}% damage` },
  emerald:  { name: 'Emerald',  color: '#4ade80', stat: 'crit', perTier: 0.04,  label: v => `+${Math.round(v * 100)}% crit chance` },
  amethyst: { name: 'Amethyst', color: '#b06adf', stat: 'hp',   perTier: 22,    label: v => `+${Math.round(v)} life` },
  topaz:    { name: 'Topaz',    color: '#ffd76a', stat: 'ess',  perTier: 0.7,   label: v => `+${v.toFixed(1)} essence/s` },
  diamond:  { name: 'Diamond',  color: '#bfe8f4', stat: 'armor', perTier: 30,   label: v => `+${Math.round(v)} armor` }
};

// Most gem slots an item can hold, by rarity (Mystic enchants can uncover them):
// Common 0 · Magic 1 · Rare 2 · Epic 3 · Legendary 4 · Set 4.
const MAX_SOCKETS = [0, 1, 2, 3, 4, 4];

function gemStatValue(gem) {
  return GEM_TYPES[gem.type].perTier * (gem.tier + 1);
}

function gemName(gem) {
  return GEM_TIERS[gem.tier] + ' ' + GEM_TYPES[gem.type].name;
}

// ---------------------------- equipment slots -------------------------------

const ITEM_SLOTS = {
  weapon:   { label: 'Weapon',     nouns: ['Scythe', 'Bone Blade', 'Grim Sickle', 'Grave Reaper', 'Femur Cleaver'], primary: 'dmg' },
  offhand:  { label: 'Phylactery', nouns: ['Phylactery', 'Death Urn', 'Soul Vessel', 'Grim Codex'], primary: 'dmg' },
  helm:     { label: 'Helm',       nouns: ['Skullcap', 'Grave Crown', 'Deathmask', 'Hood of Rathma'], primary: 'hp' },
  shoulders:{ label: 'Shoulders',  nouns: ['Spaulders', 'Bone Mantle', 'Grave Guards', 'Pall Pads'], primary: 'hp' },
  chest:    { label: 'Chest',      nouns: ['Shroud', 'Carapace', 'Grave Plate', 'Cadaver Mail'], primary: 'hp' },
  gloves:   { label: 'Gloves',     nouns: ['Grips', 'Bonefists', 'Corpsehands', 'Reaping Claws'], primary: 'crit' },
  legs:     { label: 'Legs',       nouns: ['Greaves', 'Tomb Leggings', 'Marrow Wraps', 'Cerecloth Pants'], primary: 'hp' },
  boots:    { label: 'Boots',      nouns: ['Treads', 'Gravewalkers', 'Marrow Striders', 'Tomb Boots'], primary: 'hp' },
  amulet:   { label: 'Amulet',     nouns: ['Amulet', 'Death Locket', 'Vial Pendant', 'Rathma Charm'], primary: 'crit' },
  ring1:    { label: 'Ring',       nouns: ['Band', 'Signet', 'Knucklebone Loop', 'Death Seal', 'Wraith Coil'], primary: 'crit' },
  ring2:    { label: 'Ring',       nouns: ['Band', 'Signet', 'Knucklebone Loop', 'Death Seal', 'Wraith Coil'], primary: 'crit' },
  // A crafted, burn-down torch that lights the dark. Not a randomly-generated
  // gear slot — excluded from Items.generate and affix logic.
  torch:    { label: 'Torch',      nouns: ['Torch'], primary: 'dmg', torch: true }
};

// ------------------------- Season: Grace of Inarius -------------------------
// The endgame (per the D3 Inarius Death Nova build): keep Bone Armor up for
// the bone tornado, spend everything on Death Nova. Set pieces drop from
// Nephalem Rift Guardians once the hero reaches max level.

const SEASON = {
  name: 'Season of the Grace of Inarius',
  desc: 'Requires a Master Nephalem Rift Key — slay Nephalem Rift Guardians to earn one. Gather 1500 points, then claim all six pieces of the Grace of Inarius.'
};

const INARIUS_SET = {
  id: 'inarius',
  name: 'Grace of Inarius',
  pieces: {
    helm:      "Inarius's Will",
    shoulders: "Inarius's Conviction",
    chest:     "Inarius's Understanding",
    gloves:    "Inarius's Reticence",
    legs:      "Inarius's Perseverance",
    boots:     "Inarius's Martyrdom"
  },
  bonuses: [
    { pieces: 2, desc: 'Bone Armor damage is increased by 1000%' },
    { pieces: 4, desc: 'Bone Armor grants an additional 3% damage reduction per enemy hit' },
    { pieces: 6, desc: 'Bone Armor also activates a swirling tornado of bone, damaging nearby enemies for 1000% weapon damage and increasing the damage they take from the Necromancer by 19000%' }
  ]
};

// Legendary powers (rift loot) — the Inarius Death Nova build's items, with
// their REAL Diablo 3 effects (per the Maxroll guide).
const LEGENDARY_POWERS = {
  bloodtide: {
    slot: 'weapon', name: 'Bloodtide Blade',
    desc: 'Death Nova deals +350% damage for every enemy near you'
  },
  funeraryPick: {
    slot: 'weapon', name: 'Funerary Pick', affixes: { area: 0.24 },
    desc: 'Siphon Blood drains 2 additional targets; the Power Shift rune now grants 20% per stack and benefits ALL skills'
  },
  corrodedFang: {
    slot: 'weapon', name: "Trag'Oul's Corroded Fang",
    desc: 'You deal +60% damage to cursed enemies'
  },
  ironRose: {
    slot: 'offhand', name: 'Iron Rose', affixes: { area: 0.20, dnova: 0.15 },
    desc: 'Attacking with Siphon Blood has a 100% chance to cast a free Death Nova'
  },
  coe: {
    slot: 'ring2', name: 'Convention of Elements', affixes: { crit: 0.06, area: 0.20 },
    desc: 'Cyclically gain +200% damage for 4 seconds, rotating on a timer'
  },
  aquila: {
    slot: 'chest', name: 'Aquila Cuirass', affixes: { armor: 60 },
    desc: 'While above 90% essence, all damage taken is reduced by 50%'
  },
  hauntedVisions: {
    slot: 'amulet', name: 'Haunted Visions',
    desc: 'Simulacrum lasts forever, but drains 5% of your maximum life per second'
  },
  wisdomOfKalan: {
    slot: 'amulet', name: 'Wisdom of Kalan',
    desc: 'Bone Armor gains 5 extra stacks: up to 75% damage reduction and a larger shield'
  },
  krysbin: {
    slot: 'ring1', name: "Krysbin's Sentence", affixes: { crit: 0.06 },
    desc: 'You deal +100% damage to slowed enemies, TRIPLE damage to stunned or rooted ones'
  },
  royalGrandeur: {
    slot: 'ring1', name: 'The Royal Grandeur', affixes: { crit: 0.05, hp: 200 }, exclusive: true,
    desc: 'Reduces the number of items needed for set bonuses by 1 (to a minimum of 2). Drops from the Act 1 boss'
  }
};

// Skill runes — the full Diablo 3 Necromancer rune sets (choose one per skill
// in the Skills menu).-marked runes have their combat effect wired; the rest
// are being rolled out and read as their authentic D3 description for now.
const SKILL_RUNES = {
  boneSpikes: [
    { id: 'base', name: 'Bone Spikes', desc: 'Summon spikes from the ground for 150% weapon damage.' },
    { id: 'suddenImpact', name: 'Sudden Impact', desc: 'Stuns targets for 1 second.' },
    { id: 'bonePillars', name: 'Bone Pillars', desc: 'Larger spikes for 225% damage that knock enemies up.' },
    { id: 'frostSpikes', name: 'Frost Spikes', desc: 'Leaves a frosty patch, slowing movement by 60%.' },
    { id: 'pathOfBones', name: 'Path of Bones', desc: 'Strikes a line, up to +100% damage to distant targets.' },
    { id: 'bloodSpikes', name: 'Blood Spikes', desc: 'Enemies bleed for 50% and heal you 0.5% life per hit.' }
  ],
  siphonBlood: [
    { id: 'base', name: 'Siphon Blood', desc: 'Channel a beam draining blood and essence, healing 2%/s.' },
    { id: 'suppress', name: 'Suppress', desc: 'Channeled enemies are slowed by 75%.' },
    { id: 'powerShift', name: 'Power Shift', desc: '+10% damage each stack, up to 10.' },
    { id: 'bloodSucker', name: 'Blood Sucker', desc: 'Pulls all health globes within 40 yards while channeling.' },
    { id: 'purityOfEssence', name: 'Purity of Essence', desc: 'Essence generation rises to 15 while at full health.' },
    { id: 'drainLife', name: 'Drain Life', desc: 'Restores 6% health but no longer restores Essence.' }
  ],
  grimScythe: [
    { id: 'base', name: 'Grim Scythe', desc: 'Slash a broad arc for 150% damage, 12 Essence per hit.' },
    { id: 'bloodScythe', name: 'Blood Scythe', desc: 'Heals you 1% of total health per enemy hit.' },
    { id: 'dualScythes', name: 'Dual Scythes', desc: 'Two scythes that pull enemies together.' },
    { id: 'cursedScythe', name: 'Cursed Scythe', desc: '15% chance to afflict a random curse on hit.' },
    { id: 'frostScythe', name: 'Frost Scythe', desc: '+1% attack speed per hit for 5s, max 15 stacks.' },
    { id: 'execution', name: 'Execution', desc: 'Instantly kills cursed targets below 15% health.' }
  ],
  boneSpear: [
    { id: 'base', name: 'Bone Spear', desc: 'A piercing projectile for 500% weapon damage.' },
    { id: 'crystallization', name: 'Crystallization', desc: 'Hits lower enemy attack speed, raise yours (max 10).' },
    { id: 'shatter', name: 'Shatter', desc: 'Explodes on the first enemy for 500% in 15 yards.' },
    { id: 'blightedMarrow', name: 'Blighted Marrow', desc: '+15% damage per enemy the spear passes through.' },
    { id: 'bloodSpear', name: 'Blood Spear', desc: '700% damage, but costs 10% health per cast.' },
    { id: 'teeth', name: 'Teeth', desc: 'Fires 5 bone shards across an arc for 300% each.' }
  ],
  skeletalMage: [
    { id: 'base', name: 'Skeletal Mage', desc: 'Summon an undead mage for 400% damage. Lasts 6s.' },
    { id: 'giftOfDeath', name: 'Gift of Death', desc: 'Leaves a corpse when the mage expires or dies.' },
    { id: 'skeletonArcher', name: 'Skeleton Archer', desc: '+3% attack speed per active archer, max 10.' },
    { id: 'singularity', name: 'Singularity', desc: 'Consumes all Essence; +3% damage per point spent.' },
    { id: 'lifeSupport', name: 'Life Support', desc: 'Costs 10% health but the mage lasts 2s longer.' },
    { id: 'contamination', name: 'Contamination', desc: 'A decaying mage channels a blight aura for 100%/s.' }
  ],
  deathNova: [
    { id: 'base', name: 'Death Nova', desc: 'A burst nova for 350% damage within 25 yards.' },
    { id: 'tendrilNova', name: 'Tendril Nova', desc: 'Heals you 1% of total health per target hit.' },
    { id: 'boneNova', name: 'Bone Nova', desc: 'Spines erupt for 475% damage within 12 yards.' },
    { id: 'blight', name: 'Blight', desc: 'Leaves a cloud slowing 60% and cutting damage 30%.' },
    { id: 'unstableCompound', name: 'Unstable Compound', desc: 'Each cast grows the next nova by 5 yards (max 2).' },
    { id: 'bloodNova', name: 'Blood Nova', desc: '450% in a large radius, but costs 10% health.' }
  ],
  corpseExplosion: [
    { id: 'base', name: 'Corpse Explosion', desc: 'Explode up to 5 corpses for 1050% within 20 yards.' },
    { id: 'bloodyMess', name: 'Bloody Mess', desc: 'Explosion radius increased to 25 yards.' },
    { id: 'closeQuarters', name: 'Close Quarters', desc: 'Explode corpses near you for 1325% damage.' },
    { id: 'shrapnel', name: 'Shrapnel', desc: 'Debris flies out for 1050% in a cone behind.' },
    { id: 'deadCold', name: 'Dead Cold', desc: 'Freezes all enemies hit for 3 seconds.' },
    { id: 'finalEmbrace', name: 'Final Embrace', desc: 'Corpses crawl to the nearest enemy before exploding.' }
  ],
  corpseLance: [
    { id: 'base', name: 'Corpse Lance', desc: 'Shards from corpses strike a target for 1750%.' },
    { id: 'brittleTouch', name: 'Brittle Touch', desc: 'Each hit adds +5% chance to be crit for 5s.' },
    { id: 'bloodLance', name: 'Blood Lance', desc: '3000% damage, but costs 2% health per lance.' },
    { id: 'visceralImpact', name: 'Visceral Impact', desc: 'Stuns the target for 3 seconds.' },
    { id: 'shreddingSplinters', name: 'Shredding Splinters', desc: 'Each hit slows move/attack 10% (max 5).' },
    { id: 'ricochet', name: 'Ricochet', desc: '20% chance to ricochet to a nearby target.' }
  ],
  devour: [
    { id: 'base', name: 'Devour', desc: 'Consume corpses within 60 yards for 10 Essence each.' },
    { id: 'cannibalize', name: 'Cannibalize', desc: 'Each corpse also restores 3% total health.' },
    { id: 'satiated', name: 'Satiated', desc: '+2% max life per corpse for 20s, max 25.' },
    { id: 'voracious', name: 'Voracious', desc: '-2% Essence costs per corpse for 5s, max 25.' },
    { id: 'aura', name: 'Devouring Aura', lvl: 22, desc: 'Passively devour corpses within 15 yards, healing 7% each. A green aura pulses around you.' },
    { id: 'ruthless', name: 'Ruthless', desc: 'Also consumes minions for 10 Essence each.' }
  ],
  revive: [
    { id: 'base', name: 'Revive', desc: 'Reanimate up to 10 corpses as minions for 15s.' },
    { id: 'oblation', name: 'Oblation', desc: '+20% minion damage, but 3% health per minion.' },
    { id: 'personalArmy', name: 'Personal Army', desc: '-1% damage taken per active revived minion.' },
    { id: 'purgatory', name: 'Purgatory', desc: 'Revived minions leave a usable corpse when they expire.' },
    { id: 'recklessness', name: 'Recklessness', desc: '+150% minion damage but they last only 6s.' },
    { id: 'horrificReturn', name: 'Horrific Return', desc: 'Enemies within 20 yards flee in fear for 3s.' }
  ],
  commandSkeletons: [
    { id: 'base', name: 'Command Skeletons', desc: 'Raise up to 7 skeletons; command them at a target.' },
    { id: 'enforcer', name: 'Enforcer', desc: 'Reduces the command Essence cost by 30%.' },
    { id: 'frenzy', name: 'Frenzy', desc: '+25% skeleton attack speed on a commanded target.' },
    { id: 'darkMending', name: 'Dark Mending', desc: 'Skeletons heal you 0.5% max health per command hit.' },
    { id: 'freezingGrasp', name: 'Freezing Grasp', desc: 'Commanded target is frozen for 3 seconds.' },
    { id: 'killCommand', name: 'Kill Command', desc: 'Skeletons explode for 215% within 15 yards.' }
  ],
  commandGolem: [
    { id: 'base', name: 'Command Golem', desc: 'Raise a Golem that fights for 450% damage.' },
    { id: 'fleshGolem', name: 'Flesh Golem', desc: 'Active: collapses into 8 usable corpses.' },
    { id: 'iceGolem', name: 'Ice Golem', desc: 'Active: freezes enemies and grants crit vs them.' },
    { id: 'boneGolem', name: 'Bone Golem', desc: 'Active: drags nearby enemies in and stuns them.' },
    { id: 'decayGolem', name: 'Decay Golem', desc: 'Active: eats corpses, +30% damage per corpse.' },
    { id: 'bloodGolem', name: 'Blood Golem', desc: 'Active: sacrifices to heal you 25%, then reforms.' }
  ],
  armyOfTheDead: [
    { id: 'base', name: 'Army of the Dead', desc: 'A skeletal legion strikes for 12,000% damage.' },
    { id: 'blightedGrasp', name: 'Blighted Grasp', desc: 'Hands rise for 14,000% over 5 seconds.' },
    { id: 'frozenArmy', name: 'Frozen Army', desc: 'Skeletons march in a line, freezing targets.' },
    { id: 'unconventionalWar', name: 'Unconventional', desc: 'Hunt random targets for 50,000% over 4s.' },
    { id: 'deadStorm', name: 'Dead Storm', desc: 'A storm of bone circles you for 15,500% over 5s.' },
    { id: 'deathValley', name: 'Death Valley', desc: 'Knocks all affected enemies to the center.' }
  ],
  landOfTheDead: [
    { id: 'base', name: 'Land of the Dead', desc: 'For 10s, corpse skills cost no corpses.' },
    { id: 'frozenLands', name: 'Frozen Lands', desc: 'Periodically freezes all enemies in the area.' },
    { id: 'plaguelands', name: 'Plaguelands', desc: 'Enemies inside take 10,000% damage over 10s.' },
    { id: 'shallowGraves', name: 'Shallow Graves', desc: 'Every 10 kills extends the duration (max +2s).' },
    { id: 'invigoration', name: 'Invigoration', desc: 'Your skills cost zero Essence while active.' },
    { id: 'landOfPlenty', name: 'Land of Plenty', desc: 'Instantly heals you to full when activated.' }
  ],
  decrepify: [
    { id: 'base', name: 'Decrepify', desc: 'Slows enemy move 75% and cuts damage 30% for 30s.' },
    { id: 'enfeeblement', name: 'Enfeeblement', desc: 'Movement slow rises to 100% over 5s.' },
    { id: 'dizzyingCurse', name: 'Dizzying Curse', desc: '10% chance to stun cursed enemies when struck.' },
    { id: 'wither', name: 'Wither', desc: '+40% damage reduction but removes the slow.' },
    { id: 'opportunist', name: 'Opportunist', desc: '+3% move speed per cursed enemy.' },
    { id: 'borrowedTime', name: 'Borrowed Time', desc: '+1% cooldown reduction per cursed enemy (max 20%).' }
  ],
  frailty: [
    { id: 'base', name: 'Frailty', desc: 'Executes afflicted enemies below 15% health.' },
    { id: 'scentOfBlood', name: 'Scent of Blood', desc: 'Minions deal +15% damage to cursed targets.' },
    { id: 'volatileDeath', name: 'Volatile Death', desc: 'Cursed enemies explode for 100% on death.' },
    { id: 'aura', name: 'Aura of Frailty', lvl: 30, desc: 'A 15-yard aura auto-curses and executes enemies at 10% life. A purple aura pulses around you.' },
    { id: 'earlyGrave', name: 'Early Grave', desc: 'Execute threshold rises to 18%, duration cut to 15s.' },
    { id: 'harvestEssence', name: 'Harvest Essence', desc: 'Gain 2 Essence when a cursed enemy dies.' }
  ],
  leech: [
    { id: 'base', name: 'Leech', desc: 'Attacking a cursed enemy heals you 1% of total health.' },
    { id: 'transmittable', name: 'Transmittable', desc: 'The curse spreads to a nearby target on death.' },
    { id: 'sanguineEnd', name: 'Sanguine End', desc: 'Gain health when a cursed enemy dies.' },
    { id: 'cursedGround', name: 'Cursed Ground', desc: 'Heals 1%/s per enemy standing in the zone.' },
    { id: 'bloodFlask', name: 'Blood Flask', desc: 'Cursed deaths cut your potion cooldown by 1s.' },
    { id: 'osmosis', name: 'Osmosis', desc: 'Each cursed enemy boosts your life regeneration.' }
  ],
  boneArmor: [
    { id: 'base', name: 'Bone Armor', desc: 'Rip bone for damage and a shield (3% DR per stack).' },
    { id: 'limitedImmunity', name: 'Limited Immunity', desc: 'Immune to control-impairing effects for 5s.' },
    { id: 'dislocation', name: 'Dislocation', desc: 'Stuns all ripped targets for 2 seconds.' },
    { id: 'thyFlesh', name: 'Thy Flesh', desc: '+10% life regeneration per stack.' },
    { id: 'harvestAnguish', name: 'Harvest', desc: 'Each enemy hit grants +1% movement speed.' },
    { id: 'vengefulArms', name: 'Vengeful Arms', desc: 'Bone Armor damage raised to 145%.' }
  ],
  bloodRush: [
    { id: 'base', name: 'Blood Rush', desc: 'Teleport up to 50 yards for 5% health.' },
    { id: 'potency', name: 'Potency', desc: '+100% armor for 2s after teleporting.' },
    { id: 'transfusion', name: 'Transfusion', desc: 'Heal 2% max health per enemy passed through.' },
    { id: 'molting', name: 'Molting', desc: 'Leaves a usable corpse where you departed.' },
    { id: 'hemostasis', name: 'Hemostasis', desc: 'Removes the health cost entirely.' },
    { id: 'metabolism', name: 'Metabolism', desc: 'A second charge, but double the health cost.' }
  ],
  boneSpirit: [
    { id: 'base', name: 'Bone Spirit', desc: 'A homing skull for 4000% damage. Stores 3 charges.' },
    { id: 'possession', name: 'Possession', desc: 'Mind-controls the target for 15s (removes charges).' },
    { id: 'panicAttack', name: 'Panic Attack', desc: 'Terrifies enemies within 10 yards on impact.' },
    { id: 'astralProjection', name: 'Astral', desc: '+15% damage per enemy passed through.' },
    { id: 'poltergeist', name: 'Poltergeist', desc: 'Max charge capacity raised to 4.' },
    { id: 'unfinishedBiz', name: 'Unfinished', desc: 'Detonates for 1250% within 10 yards on impact.' }
  ],
  simulacrum: [
    { id: 'base', name: 'Simulacrum', desc: 'A blood clone duplicates your Secondary spenders for 7s.' },
    { id: 'reservoir', name: 'Reservoir', desc: 'Doubles max Essence while the clone is active.' },
    { id: 'selfSacrifice', name: 'Self Sacrifice', desc: 'The clone dies for you on fatal damage, healing you.' },
    { id: 'cursedForm', name: 'Cursed Form', desc: 'Curses cost zero and apply all 3 types at once.' },
    { id: 'bloodDebt', name: 'Blood Debt', desc: '-75% spell health costs while the clone lives.' },
    { id: 'bloodAndBone', name: 'Blood and Bone', desc: 'Summon TWO simulacrums.' }
  ]
};

const AFFIX_ROLLS = {
  dmg:   { base: 0.06, label: v => `+${Math.round(v * 100)}% damage` },
  hp:    { base: 18,   label: v => `+${Math.round(v)} life` },
  crit:  { base: 0.03, label: v => `+${Math.round(v * 100)}% crit chance` },
  ess:   { base: 0.8,  label: v => `+${v.toFixed(1)} essence/s` },
  reg:   { base: 1.2,  label: v => `+${v.toFixed(1)} life/s` },
  gold:  { base: 0.12, label: v => `+${Math.round(v * 100)}% gold find` },
  armor: { base: 20,   label: v => `+${Math.round(v)} armor` },
  // Movement speed rolls ONLY on boots (1%–25%), handled specially in generation.
  move:  { base: 0.06, label: v => `+${Math.round(v * 100)}% movement speed` },
  // Special affixes — never roll on random gear; placed on set/legendary items only.
  dnova: { base: 0.15, label: v => `+${Math.round(v * 100)}% Death Nova damage` },
  area:  { base: 0.20, label: v => `${Math.round(v * 100)}% chance to deal Area Damage on hit` }
};
// Affixes that must never appear from the generic random pool.
const RESTRICTED_AFFIXES = new Set(['move', 'dnova', 'area']);

const LEGENDARY_PREFIX = ["Maltorius'", "The Widow's", "Rathma's", "Xul's", "Trag'Oul's", "Mendeln's"];
const EPIC_PREFIX = ['Fabled', 'Mythic', 'Hallowed', 'Abyssal', 'Deathless', 'Umbral'];
const RARE_PREFIX = ['Cruel', 'Vicious', 'Dread', 'Baleful', 'Sinister', 'Woeful'];
const MAGIC_PREFIX = ['Sturdy', 'Sharp', 'Grim', 'Cold', 'Hungry', 'Pale'];

// ----------------------------- skill catalog -------------------------------
// The authentic D3 Necromancer actives with their real unlock levels.
// Categories: primary, secondary, blood (Blood & Bone), curse, corpse, reanim.
// Behavior functions live in skills.js keyed by id.

const SKILL_DATA = [
  { id: 'boneSpikes',      name: 'Bone Spikes',       cat: 'primary',   lvl: 1,  cost: 0,  gain: 18, cd: 0.42 },
  { id: 'boneSpear',       name: 'Bone Spear',        cat: 'secondary', lvl: 2,  cost: 20, cd: 0.5 },
  { id: 'grimScythe',      name: 'Grim Scythe',       cat: 'primary',   lvl: 3,  cost: 0,  gain: 12, cd: 0.4 },
  { id: 'corpseExplosion', name: 'Corpse Explosion',  cat: 'corpse',    lvl: 4,  cost: 8,  cd: 0.6 },
  { id: 'skeletalMage',    name: 'Skeletal Mage',     cat: 'secondary', lvl: 5,  cost: 40, cd: 0.8 },
  { id: 'corpseLance',     name: 'Corpse Lance',      cat: 'corpse',    lvl: 8,  cost: 15, cd: 0.5 },
  { id: 'commandSkeletons',name: 'Command Skeletons', cat: 'reanim',    lvl: 9,  cost: 50, cd: 1.5 },
  { id: 'siphonBlood',     name: 'Siphon Blood',      cat: 'primary',   lvl: 11, cost: 0,  gain: 4,  cd: 0.16, channel: true },
  { id: 'deathNova',       name: 'Death Nova',        cat: 'secondary', lvl: 12, cost: 20, cd: 0.55 },
  { id: 'commandGolem',    name: 'Command Golem',     cat: 'reanim',    lvl: 13, cost: 0,  cd: 30 },
  { id: 'decrepify',       name: 'Decrepify',         cat: 'curse',     lvl: 14, cost: 10, cd: 1 },
  { id: 'devour',          name: 'Devour',            cat: 'corpse',    lvl: 16, cost: 0,  cd: 1.5 },
  { id: 'leech',           name: 'Leech',             cat: 'curse',     lvl: 17, cost: 10, cd: 1 },
  { id: 'boneArmor',       name: 'Bone Armor',        cat: 'blood',     lvl: 19, cost: 10, cd: 10 },
  { id: 'armyOfTheDead',   name: 'Army of the Dead',  cat: 'reanim',    lvl: 22, cost: 0,  cd: 45 },
  { id: 'frailty',         name: 'Frailty',           cat: 'curse',     lvl: 22, cost: 10, cd: 1 },
  { id: 'revive',          name: 'Revive',            cat: 'reanim',    lvl: 22, cost: 25, cd: 2 },
  { id: 'boneSpirit',      name: 'Bone Spirit',       cat: 'blood',     lvl: 25, cost: 0,  cd: 12 },
  { id: 'bloodRush',       name: 'Blood Rush',        cat: 'blood',     lvl: 30, cost: 0,  cd: 5 },
  { id: 'landOfTheDead',   name: 'Land of the Dead',  cat: 'reanim',    lvl: 38, cost: 0,  cd: 60 },
  { id: 'simulacrum',      name: 'Simulacrum',        cat: 'reanim',    lvl: 61, cost: 0,  cd: 60 }
];

const SKILL_CATS = {
  primary:   { name: 'Primary',      color: '#c9bfa8' },
  secondary: { name: 'Secondary',    color: '#e8e0cc' },
  blood:     { name: 'Blood & Bone', color: '#e04a5a' },
  curse:     { name: 'Curses',       color: '#b06adf' },
  corpse:    { name: 'Corpses',      color: '#ffb43a' },
  reanim:    { name: 'Reanimation',  color: '#6ff7c3' }
};

const SKILL_DESCS = {
  boneSpikes: 'Bone erupts under the target. Generates 18 Essence.',
  grimScythe: 'Sweep a spectral scythe. Generates 12 Essence per enemy hit.',
  siphonBlood: 'Channel: drain a foe\'s blood, healing you and generating Essence.',
  boneSpear: 'Hurl a piercing spear of bone through the horde.',
  skeletalMage: 'Raise a skeletal mage that hurls deathbolts (max 4).',
  deathNova: 'Unleash a nova of death around you.',
  boneArmor: 'Rip bone from nearby enemies: damage them, gain a shield per hit.',
  boneSpirit: 'Release a spirit that seeks the strongest foe for massive damage.',
  bloodRush: 'Spend life to dash through walls and dangers.',
  decrepify: 'Curse: slows enemies and weakens their blows.',
  frailty: 'Curse: victims take more damage and die early.',
  leech: 'Curse: every hit against victims heals you.',
  corpseExplosion: 'Detonate corpses near the target.',
  corpseLance: 'Launch bone lances from corpses at the target.',
  devour: 'Consume corpses: each restores Essence and life.',
  commandSkeletons: 'Raise skeletal warriors (max 7). Recast: frenzy them.',
  commandGolem: 'Raise a bone golem. Recast: it slams the ground.',
  armyOfTheDead: 'The dead erupt from the earth, devastating an area.',
  revive: 'Raise slain corpses as fighting dead for 15s.',
  landOfTheDead: 'For 8s corpses rise everywhere and corpse skills are free.',
  simulacrum: 'A blood clone copies your Secondary casts for 15s.'
};

// ------------------------------- passives ----------------------------------
// Slots unlock at hero levels 10 / 20 / 30 / 45.

const PASSIVE_SLOT_LEVELS = [3, 10, 20, 30, 45];

const PASSIVE_DATA = [
  { id: 'graveCaller',    name: 'Grave Caller',        lvl: 3,  desc: 'Every 3 seconds, a fresh corpse rises at your feet.' },
  { id: 'quickening',     name: 'Quickening',          lvl: 10, desc: 'Primary skills attack 15% faster.' },
  { id: 'fueledByDeath',  name: 'Fueled by Death',     lvl: 10, desc: 'Consuming a corpse grants +20% move speed for 3s.' },
  { id: 'standAlone',     name: 'Stand Alone',         lvl: 10, desc: '+25% less damage taken while you have no minions.' },
  { id: 'bonePrison',     name: 'Bone Prison',         lvl: 13, desc: 'Bone Spear and Bone Spikes root enemies for 2s (30%).' },
  { id: 'swiftHarvest',   name: 'Swift Harvesting',    lvl: 16, desc: 'Primary skills generate 30% more Essence.' },
  { id: 'lifeFromDeath',  name: 'Life from Death',     lvl: 16, desc: 'Consuming a corpse may leave a health orb (25%).' },
  { id: 'extServitude',   name: 'Extended Servitude',  lvl: 20, desc: 'Your minions have +50% life and duration.' },
  { id: 'rigorMortis',    name: 'Rigor Mortis',        lvl: 20, desc: 'Bone skills slow enemies for 2s.' },
  { id: 'overwhelming',   name: 'Overwhelming Essence',lvl: 24, desc: '+40 maximum Essence.' },
  { id: 'spreadingMal',   name: 'Spreading Malediction', lvl: 27, desc: '+1.5% damage per cursed enemy nearby.' },
  { id: 'drawLife',       name: 'Draw Life',           lvl: 34, desc: '+1.5 life/s per enemy within 20 yards.' },
  { id: 'finalService',   name: 'Final Service',       lvl: 45, desc: 'Cheat death once per zone: survive with 40% life.' }
];

// ------------------------------- monsters ----------------------------------

const MONSTERS = {
  zombie:   { name: 'Risen Corpse',   hp: 42,  speed: 52,  dmg: 11, r: 15, xp: 12, atkRange: 34, atkCd: 1.3 },
  skeleton: { name: 'Skeleton',       hp: 26,  speed: 92,  dmg: 8,  r: 13, xp: 14, atkRange: 32, atkCd: 1.0 },
  archer:   { name: 'Skeletal Archer',hp: 22,  speed: 70,  dmg: 10, r: 12, xp: 16, atkRange: 380, atkCd: 2.1, ranged: 'arrow' },
  ghoul:    { name: 'Ghoul',          hp: 24,  speed: 132, dmg: 13, r: 12, xp: 18, atkRange: 30, atkCd: 1.1, lunges: true },
  imp:      { name: 'Fallen Imp',     hp: 12,  speed: 118, dmg: 6,  r: 9,  xp: 8,  atkRange: 24, atkCd: 0.8 },
  cultist:  { name: 'Blood Cultist',  hp: 34,  speed: 62,  dmg: 12, r: 13, xp: 22, atkRange: 420, atkCd: 2.4, ranged: 'bolt' },
  // --- heavier war-host monsters ---
  hound:    { name: 'Gore Hound',     hp: 30,  speed: 172, dmg: 12, r: 11, xp: 20, atkRange: 30, atkCd: 0.9, lunges: true },
  soldier:  { name: 'Damned Soldier', hp: 95,  speed: 74,  dmg: 18, r: 15, xp: 30, atkRange: 40, atkCd: 1.4, armored: true, sword: true },
  knight:   { name: 'Fallen Knight',  hp: 175, speed: 60,  dmg: 27, r: 18, xp: 50, atkRange: 52, atkCd: 1.8, armored: true, sword: true, cleave: true },
  bloat:    { name: 'Corpse Bloat',   hp: 130, speed: 34,  dmg: 16, r: 22, xp: 36, atkRange: 40, atkCd: 1.6, explodes: 150 },
  catapult: { name: 'Bone Catapult',  hp: 210, speed: 9,   dmg: 30, r: 24, xp: 62, atkRange: 640, atkCd: 3.6, siege: true },
  mongrel:  { name: 'Nephalem Mongrel', hp: 160, speed: 150, dmg: 22, r: 16, xp: 70, atkRange: 32, atkCd: 1.0, lunges: true, dropsHeartstring: true },
  brute:    { name: 'Grave Brute',    hp: 300, speed: 46,  dmg: 24, r: 26, xp: 110, atkRange: 46, atkCd: 1.7, boss: true },
  // Story Mode bosses: the 10 named legendary ghost lords, then the King.
  wraith:   { name: 'Vengeful Wraith', hp: 240, speed: 78, dmg: 21, r: 22, xp: 130, atkRange: 44, atkCd: 1.6, boss: true, ghost: true },
  skeletonking: { name: 'The Skeleton King', hp: 520, speed: 54, dmg: 30, r: 30, xp: 240, atkRange: 54, atkCd: 1.8, boss: true }
};

const ELITE_PREFIX = ['Blood', 'Grave', 'Doom', 'Plague', 'Dread', 'Bone'];
const ELITE_SUFFIX = ['maw', 'fang', 'howl', 'rot', 'claw', 'shriek'];
// Rare NAMED purple elite of the Rifts — the sole source of Nephalem
// Heartstring (chance drop). Each sighting is a distinct named beast.
const MONGREL_NAMES = [
  'Gorehound Vael', 'Rifthound Uzzek', 'Skarn the Ravener',
  'Molgrim, Heartstring Alpha', 'Vhaskr the Prowler', 'Ozgrall the Unbound'
];

// --------------------------------- lands -----------------------------------
// The campaign: five lands, each a generated map with packs of monsters,
// shrines, chests, breakables and a unique Bounty boss. Open lands are
// wilderness; 'dungeon' lands are true wall-and-corridor crypts.

const ZONES = [
  {
    id: 'hollow', name: 'The Weeping Hollow', kind: 'open', mLvl: 1,
    ground: '#16121b', accent: '#2c4230', weather: 'rain',
    monsters: ['zombie', 'zombie', 'skeleton', 'ghoul', 'hound'],
    boss: 'The Grave Warden', packs: 11,
    sizeMul: 1.0, rivers: 1, forest: true,
    desc: 'A drowned graveyard where the dead refuse to rest.'
  },
  {
    id: 'crypt', name: 'Crypt of the Forsworn', kind: 'dungeon', mLvl: 5,
    ground: '#151220', accent: '#3a3448',
    monsters: ['skeleton', 'skeleton', 'archer', 'zombie', 'soldier'],
    boss: 'Morgral the Unburied', packs: 12,
    sizeMul: 0.95,
    desc: 'Collapsed halls beneath the chapel, thick with old bones.'
  },
  {
    id: 'sands', name: 'The Desolate Sands', kind: 'open', mLvl: 10,
    ground: '#1e1812', accent: '#4a3c28', weather: 'wind',
    monsters: ['imp', 'imp', 'ghoul', 'archer', 'cultist', 'soldier', 'bloat'],
    boss: 'Sar\'Khan the Sunscoured', packs: 13,
    sizeMul: 1.4, rivers: 0, forest: false,
    desc: 'A vast burned waste of dunes, imps and buried idols.'
  },
  {
    id: 'marsh', name: 'The Blood Marsh', kind: 'open', mLvl: 16,
    ground: '#121a16', accent: '#2c4230', weather: 'rain',
    monsters: ['zombie', 'ghoul', 'ghoul', 'cultist', 'bloat', 'soldier', 'knight'],
    boss: 'Mother of Maggots', packs: 14,
    sizeMul: 1.2, rivers: 2, forest: true,
    desc: 'Rotting fens, criss-crossed by bloody streams and dead groves.'
  },
  {
    id: 'rathma', name: 'Ruins of Rathma', kind: 'dungeon', mLvl: 23,
    ground: '#141420', accent: '#3a3060',
    monsters: ['skeleton', 'archer', 'cultist', 'soldier', 'knight', 'catapult'],
    boss: 'The Bone Colossus', packs: 15,
    sizeMul: 1.25,
    desc: 'The shattered, sprawling sanctum of the first necromancers.'
  }
];

// Difficulty tiers, D3 style. Monsters and rewards scale together.
// Reaching level 70 unlocks Torment I–XVI; each Torment adds a flat bonus to
// the legendary drop chance (T1 +1% … T16 +33.3%, owner-specified).
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
// enemyMult scales how many monsters spawn: +10% per base tier, then +35% per
// Torment tier (compounding) — so Torment XVI is a wild, swarming meat grinder.
const DIFFICULTIES = [
  { name: 'Normal', mult: 1.0, reward: 1.0, legBonus: 0, enemyMult: 1.0 },
  { name: 'Hard',   mult: 1.6, reward: 1.35, legBonus: 0, enemyMult: 1.1 },
  { name: 'Expert', mult: 2.6, reward: 1.8, legBonus: 0, enemyMult: 1.2 },
  { name: 'Master', mult: 4.2, reward: 2.4, legBonus: 0, enemyMult: 1.3 }
].concat(ROMANS.map((numeral, i) => ({
  name: 'Torment ' + numeral,
  mult: +(7.0 * Math.pow(1.45, i)).toFixed(1),
  reward: +(3.2 * Math.pow(1.17, i)).toFixed(2),
  legBonus: +(0.01 + (0.333 - 0.01) * (i / 15)).toFixed(4),
  enemyMult: +(1.3 * Math.pow(1.35, i + 1)).toFixed(2),
  torment: i + 1
})));

const XP_CURVE = lvl => Math.round(60 * Math.pow(lvl, 1.5));
const MAX_LEVEL = 70;

// Rifts: filled by slaughter, capped by a Guardian.
//  - 'normal' rifts (levels 1–69): open to all; Guardians may drop Rift Keys.
//  - 'greater' Nephalem Rifts (level 70): cost a Rift Key; Guardians drop
//    Grace of Inarius pieces and legendary powers.
const RIFT_GUARDIANS = ['Blighter', 'The Choker', 'Bloodmaw', 'Sand Shaper', 'Erethon', 'Man Carver'];

// Rift point goals: gather purple orbs (10 pts each) from rare elites, then
// the Rift Guardian rises. normal 250 · Nephalem 750 · Master (Season) 1500.
const RIFT_GOALS = { normal: 250, greater: 750, season: 1500 };
const RIFT_NAMES = { normal: 'Rift', greater: 'Nephalem Rift', season: 'Master Nephalem Rift' };
const RIFT_TILES = { normal: 10, greater: 12, season: 14 };

function makeRiftZone(riftKind = 'greater') {
  const theme = pick(ZONES);
  const at70 = riftKind !== 'normal';
  const tiles = RIFT_TILES[riftKind] || 10;
  return {
    id: 'rift', name: RIFT_NAMES[riftKind] || 'Rift',
    kind: Math.random() < 0.5 ? 'dungeon' : 'open',
    mLvl: at70 ? 70 + Math.min(12, (Hero.riftsCleared || 0)) : clamp(Hero.level + 2, 1, 69),
    ground: theme.ground, accent: theme.accent,
    weather: pick(['rain', 'wind', null]),
    monsters: ['zombie', 'skeleton', 'archer', 'ghoul', 'imp', 'cultist', 'hound', 'soldier', 'knight', 'bloat', 'catapult'],
    boss: pick(RIFT_GUARDIANS) + ', Rift Guardian',
    packs: Math.round(tiles * 2.2), tiles,
    riftGoal: RIFT_GOALS[riftKind] || 250,
    desc: 'A shard of a broken realm. Slay rare elites for their orbs, then face the Guardian.',
    rift: true, riftKind
  };
}

// Adventure Mode: a randomized land at your level, 3–9 map tiles big.
function makeAdventureZone() {
  const theme = pick(ZONES);
  const first = pick(['Forgotten', 'Sunken', 'Howling', 'Withered', 'Ashen', 'Silent']);
  const second = pick(['Reach', 'Barrows', 'Expanse', 'Warrens', 'Fields', 'Depths']);
  const tiles = randInt(3, 9);
  return {
    id: 'adventure', name: 'The ' + first + ' ' + second,
    kind: Math.random() < 0.4 ? 'dungeon' : 'open',
    mLvl: clamp(Hero.level, 1, 70),
    ground: theme.ground, accent: theme.accent,
    weather: pick(['rain', 'wind', null, null]),
    monsters: ['zombie', 'skeleton', 'archer', 'ghoul', 'imp', 'cultist', 'hound', 'soldier', 'knight', 'bloat', 'catapult'],
    boss: pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) + ' the ' + pick(['Endless', 'Vile', 'Forgotten', 'Ravenous']),
    packs: tiles * 2 + 3, tiles,
    desc: 'An uncharted stretch of Sanctuary, ' + tiles + ' tiles wide, remade each visit.'
  };
}

// --------------------------------- STORY MODE ------------------------------
// A long, hand-authored journey. Each Act is a chain of biome maps, each
// gated by a named legendary ghost lord; the last is the Skeleton King's
// grave. Only ACT ONE is ready for testing.
//
// BIOMES drive the ground colour, prop/tree species, terrain and the NATURAL
// border that frames every map (a wall of forest / cliff / mountain — never a
// hard edge). Biomes are grouped by climate so a desert never borders snow.
const BIOMES = {
  grass:    { name: 'Verdant Meadows',   ground: '#18240f', accent: '#3f6a2c', tree: 'oak',
              props: ['oak', 'oak', 'rock', 'pillar'],       deco: ['grass', 'grass', 'moss', 'rock'],
              border: 'forest', weather: null,   forest: true,  rivers: 1,
              monsters: ['zombie', 'skeleton', 'ghoul', 'hound', 'archer'] },
  forest:   { name: 'Whispering Woods',   ground: '#132012', accent: '#2f5226', tree: 'pine',
              props: ['pine', 'pine', 'oak', 'rock'],         deco: ['grass', 'moss', 'moss', 'bones'],
              border: 'forest', weather: null,   forest: true,  rivers: 0,
              monsters: ['skeleton', 'archer', 'ghoul', 'hound', 'soldier'] },
  jungle:   { name: 'Tangled Jungle',     ground: '#0f2418', accent: '#2c6a3c', tree: 'palm',
              props: ['palm', 'palm', 'oak', 'rock'],         deco: ['grass', 'grass', 'moss'],
              border: 'jungle', weather: 'rain', forest: true,  rivers: 1,
              monsters: ['ghoul', 'imp', 'cultist', 'hound', 'bloat'] },
  swamp:    { name: 'Sunken Mire',        ground: '#131a15', accent: '#2c3a2a', tree: 'tree',
              props: ['tree', 'tree', 'rock', 'tomb'],        deco: ['moss', 'grass', 'bones', 'blood'],
              border: 'forest', weather: 'rain', forest: true,  rivers: 2,
              monsters: ['zombie', 'ghoul', 'ghoul', 'cultist', 'bloat'] },
  desert:   { name: 'Scorched Dunes',     ground: '#241d10', accent: '#6a5326', tree: 'cactus',
              props: ['cactus', 'cactus', 'rock', 'obelisk'], deco: ['crack', 'rubble', 'bones'],
              border: 'mountain', weather: 'wind', forest: false, rivers: 0,
              monsters: ['imp', 'imp', 'archer', 'cultist', 'soldier'] },
  badlands: { name: 'Broken Barrens',     ground: '#20180d', accent: '#4e3c22', tree: 'cactus',
              props: ['rock', 'rock', 'cactus', 'obelisk'],   deco: ['crack', 'rubble', 'rock'],
              border: 'cliff', weather: 'wind', forest: false, rivers: 0,
              monsters: ['skeleton', 'archer', 'soldier', 'knight', 'catapult'] }
};

// Ten magical named legendary ghost lords — one haunts each Act I map.
const STORY_GHOST_NAMES = [
  'Sir Aldric, the Hollow Knight',
  'Lady Morwenna, the Weeping Wraith',
  'Grellthorn the Spectral',
  'Vaelmoor, the Drowned Duke',
  'Ysolde of the Ashen Veil',
  'Baelgor, the Chained Revenant',
  'Nyxaria, Phantom of Thorns',
  'Old Grimwald, the Fen Shade',
  'Karrothys, the Gilded Ghost',
  'Emberlyn, the Smouldering Spirit'
];

// Act I biome order — climate-coherent, no two ADJACENT maps the same biome,
// tapering from green lands into the arid barrens where the King's grave lies.
const STORY_ACT1_BIOMES = ['grass', 'forest', 'jungle', 'swamp', 'forest', 'grass', 'jungle', 'swamp', 'badlands', 'desert'];

const STORY_KING_FLAVOR = '“You dare come to my grave? You will die!”';

// Build the zone for a Story-Mode stage. Stages 1–10 are biome maps (each with
// its ghost lord); stage 11 is the Skeleton King's small grave arena.
function makeStoryZone(stage) {
  if (stage >= 11) {
    return {
      id: 'story-grave', name: 'The Grave of the Skeleton King', kind: 'open', biome: 'badlands',
      mLvl: clamp(Hero.level, 1, 70),
      ground: '#1a1014', accent: '#4a2e3a', weather: 'wind',
      monsters: ['skeleton', 'skeleton', 'archer', 'soldier'],
      boss: 'Leoric, the Skeleton King', bossType: 'skeletonking',
      packs: 4, sizeMul: 0.6, forest: false, rivers: 0,
      story: true, storyFinal: true, kingFlavor: STORY_KING_FLAVOR,
      desc: 'A cramped, cursed barrow where the Skeleton King waits.'
    };
  }
  const biomeKey = STORY_ACT1_BIOMES[(stage - 1) % STORY_ACT1_BIOMES.length];
  const B = BIOMES[biomeKey];
  const ghost = STORY_GHOST_NAMES[(stage - 1) % STORY_GHOST_NAMES.length];
  return {
    id: 'story-' + stage, name: 'Act I · ' + B.name, kind: 'open', biome: biomeKey,
    mLvl: clamp(Hero.level, 1, 70),
    ground: B.ground, accent: B.accent, weather: B.weather,
    monsters: B.monsters,
    boss: ghost, bossType: 'wraith',
    packs: randInt(9, 13),
    sizeMul: rand(0.9, 1.35),
    forest: B.forest, rivers: B.rivers,
    story: true, chapter: stage,
    desc: 'Chapter ' + stage + ' of Act I — hunt the ghost of ' + ghost + '.'
  };
}
