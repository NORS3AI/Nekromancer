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
  { name: 'Set',       color: '#4ade80', mult: 3.1, salvage: 'soul',    salvageN: 2 },
  { name: 'Artifact',  color: '#ff3b3b', mult: 3.9, salvage: 'soul',    salvageN: 3 }  // index 6, red — the pinnacle
];

const GAME_VERSION = 'v1.6.18-alpha';

// Newest entry first. OWNER RULE: append a new entry (and bump
// GAME_VERSION) with EVERY addition and bug fix.
const PATCH_NOTES = [
  {
    v: 'v1.6.18-alpha', date: 'July 2026',
    notes: [
      'Bone Spikes is now instant — no cooldown',
      'Long skill, rune and passive names no longer get cut off with "…" — they wrap onto two (or three) lines instead, so you can always read the full name',
      'The chooser\'s Assigned Skill card is a touch taller so the full rune/skill description fits without being clipped'
    ]
  },
  {
    v: 'v1.6.17-alpha', date: 'July 2026',
    notes: [
      'The "Full screen" toggle now only appears in browsers that actually support it (Android/desktop); it\'s hidden on iOS where the browser blocks it (use Add to Home Screen there)'
    ]
  },
  {
    v: 'v1.6.16-alpha', date: 'July 2026',
    notes: [
      'New Settings → Gameplay toggle: "Full screen (hide address bar)" — hides the browser chrome on Android/desktop for a bigger play area',
      'On iPhone/iPad the browser blocks true full screen, so the toggle points you to Share → "Add to Home Screen", which launches the game chrome-free'
    ]
  },
  {
    v: 'v1.6.15-alpha', date: 'July 2026',
    notes: [
      'Diamond All-Resist now starts at 10 (Chipped) and climbs smoothly to 5000 (Marquise)',
      'Amethyst Life-per-Hit now starts at 10 (Chipped) and grows gradually up to 75000 (Marquise)'
    ]
  },
  {
    v: 'v1.6.14-alpha', date: 'July 2026',
    notes: [
      'Gem values de-inflated: instead of tripling per tier (which ballooned into the millions), each gem\'s key stat now steps down 33.3% per tier from its original Marquise value (Ruby back to +750 dmg, Emerald +300% crit dmg, Amethyst +75000 life/hit, Diamond +5000 resist, Topaz +250% gold)',
      'Combining is still worth it — each new tier is a little better than one gem of the tier below (it no longer has to beat all three), so numbers stay sane',
      'Bonus: Diamond All-Resist no longer instantly maxes the 80% cap, so those upgrades matter all the way up'
    ]
  },
  {
    v: 'v1.6.13-alpha', date: 'July 2026',
    notes: [
      'All gems now follow the same rule as Ruby — three of a tier are always worth less than one of the next, so combining is never a waste. The climbing stat is the one that isn\'t balance-capped: Emerald = Crit Damage, Amethyst = Life-per-Hit, Diamond = All-Resist, Topaz = Gold Find (its Resource-Cost reduction caps at 60%, so Gold carries the upgrade instead)',
      'Note: Diamond All-Resist still caps at 80% damage reduction and Topaz Resource-Cost at 60%, so those particular effects plateau at the top tiers even as the numbers keep climbing'
    ]
  },
  {
    v: 'v1.6.12-alpha', date: 'July 2026',
    notes: [
      'Ruby damage rebalanced so upgrading is ALWAYS worth it: three of any tier are now worth less than one of the next tier up (3/10/32/98/300/930/2900… climbing ~3.1× per tier). Before, three Chipped rubies (27 dmg) beat one Flawless (12), so there was no reason to combine',
      'Ruby XP now starts lower (3% / 5% / 6%) and keeps the old ladder from there (9%…30%)'
    ]
  },
  {
    v: 'v1.6.11-alpha', date: 'July 2026',
    notes: [
      'Patch notes now scroll with the mouse wheel (desktop) or a finger drag (tablet/mobile) — no more tapping arrows',
      'Merchant button icon no longer shows as an empty square in the Town Portal menu',
      'The Survivor\'s Camp hub no longer shows the Merchant (it belongs in the Wilds/Town Portal) and is otherwise icon-free apart from The Wilds'
    ]
  },
  {
    v: 'v1.6.10-alpha', date: 'July 2026',
    notes: [
      'Slaying a boss in ANY deeper/ONWARD map now SEALS the descent — you can no longer dive deeper anywhere; only the BACK portals stay open until you climb all the way to the original map (where diving reopens)',
      'The ONWARD and cave portals vanish while the descent is sealed, so the only way is back',
      'A depth tally now rides at the top of the HUD (⬇ Depth N / 12) so you always know how deep you are'
    ]
  },
  {
    v: 'v1.6.9-alpha', date: 'July 2026',
    notes: [
      'Hidden Cave is now genuinely full of enemies — twice the pack sites the land defines (it previously spawned almost none)',
      'Fixed the Hidden Cave objective reading "Bounty: slay undefined" — it now names its dweller, Rathma\'s Chosen',
      'Slaying Rathma\'s Chosen in the Hidden Cave now opens the portal out (and shows a proper boss bar) — before, killing it left you trapped',
      'Town Portal: closing the town menu with ✕/Escape now collapses the portal and starts its 30s cooldown just like "Back to the Wilds", so you can\'t step back through it after returning'
    ]
  },
  {
    v: 'v1.6.8-alpha', date: 'July 2026',
    notes: [
      'Your minions now keep pace with the Nekromancer — they travel at least as fast as you (and speed up further with your move-speed gear), so they no longer trail behind as you run',
      'Desktop: hovering the mouse over any button now shows a tooltip'
    ]
  },
  {
    v: 'v1.6.7-alpha', date: 'July 2026',
    notes: [
      'Mystic now lets you enchant BOTH rings — the second ring was being cut off the bottom of the item list (and the list now scrolls, so every equip slot is reachable on any screen size)',
      'The non-enchantable Torch no longer clutters the Mystic\'s item list'
    ]
  },
  {
    v: 'v1.6.6-alpha', date: 'July 2026',
    notes: [
      'DIVING ONWARD now has teeth: every "ONWARD" portal you take makes the next map 1.2× deadlier (compounding) — monster health and damage climb with the depth',
      'The abyss has a bottom: after 12 dives the deepest floor spawns with NO onward portal, forcing you to turn back toward the main map',
      'The "DEEPER STILL" banner shows your current depth and how much harder foes hit (e.g. "Depth 4 — foes hit 2.1× harder"); climbing back out lightens the difficulty step by step',
      'Tougher deep foes also grant proportionally more XP'
    ]
  },
  {
    v: 'v1.6.5-alpha', date: 'July 2026',
    notes: [
      'Shoulders and Legs now have their own inventory icons (they were showing the ring icon by mistake)',
      'Selling to the Travelling Merchant now lists your gear highest sell-price first, cheapest last',
      'The Merchant now has a 🪙 icon on its button in both Town Portal and Camp',
      'Minions left more than a screen behind for over 5 seconds now teleport back to your side',
      'Topaz reworked: resource-cost reduction now climbs +2% per tier — Chipped 1% → Flawless 3% → … capping at 22%',
      'Jeweler gem-cutting cost now scales by Jeweler level (500g at L1 up to 9000g at L10)',
      'Blacksmith gold cost now scales by Smith level — Standard 200g (L1) → 6000g (L10); Masterwork 500g (L1) → 8000g (L10)'
    ]
  },
  {
    v: 'v1.6.4-alpha', date: 'July 2026',
    notes: [
      'RUNES — Batch 1: eight skills whose runes did NOTHING now work. Skeletal Mage (Gift of Death corpse · Life Support · Contamination blight aura · Skeleton Archer faster fire · Singularity essence→damage), Corpse Lance (Blood Lance · Visceral Impact stun · Shredding Splinters slow · Brittle Touch · Ricochet), Revive (Oblation · Personal Army damage-reduction · Purgatory · Recklessness · Horrific Return fear), Command Skeletons (Enforcer cheaper · Frenzy · Dark Mending heal · Freezing Grasp · Kill Command explosion), Command Golem (Flesh/Ice/Bone/Decay/Blood golem actives), Army of the Dead (Blighted/Frozen/Unconventional/Dead Storm/Death Valley), Land of the Dead (Frozen Lands · Plaguelands DoT · Shallow Graves · Invigoration free casts · Land of Plenty full heal), Bone Spirit (Panic Attack fear · Astral Projection pierce+ramp · Poltergeist 4 charges · Unfinished Business detonation)',
      'New under-the-hood effects powering these: enemy FEAR (flee) and BRITTLE (takes more crits), plus projectile ricochet/detonation/stun-on-hit',
      '(Bone Spirit\'s Possession / mind-control rune is still pending — it needs a new system.)'
    ]
  },
  {
    v: 'v1.6.3-alpha', date: 'July 2026',
    notes: [
      'The Nekromancer now wields a staff topped with a glowing crystal in your chosen eye colour',
      'Your minions carry a floating "<Name>\'s Minion" tag; skeletons walk on two legs, and idle minions (and the golem) now fall in BEHIND you in a rank instead of orbiting',
      'Travelling Merchant: a greeting with a live restock countdown ("new items in 9:59…"); stock now rolls by category (50% armour · 35% weapon/off-hand · 10% rings & amulets · 5% reagents you can buy with gold)',
      'Merchant upgrade/downgrade now shows as animated arrows only (1/2/3 up = better, down = worse, ▲▲▲ pulses green) — no words — and the arrows are hidden inside the item stats card since the row already shows them',
      'The empty-socket diamond on equipment is now much bigger and glows, so you can actually see it',
      'Rune fixes: Death Nova (Blight) now also weakens enemies\' damage, and the Aura of Frailty now auto-curses nearby foes as its description says'
    ]
  },
  {
    v: 'v1.6.2-alpha', date: 'July 2026',
    notes: [
      'Skill cooldowns retuned: Bone Spikes 2s · Bone Spear 2s · Death Nova 1s · Corpse Explosion 3s · Skeletal Mage 10s · Command Skeletons 25s · Command Golem 30s · Revive 60s · Army of the Dead 60s · Bone Armor 10s · Land of the Dead 120s · Simulacrum 120s',
      'Bone Spirit now has 3 CHARGES — cast up to three times, then a 25s cooldown before all three return',
      'Blood Rush cooldown is 8s; with the Metabolism rune it gains a 2nd charge (dash twice before the cooldown starts)',
      'Multi-charge skills show their remaining charge count on the skill button'
    ]
  },
  {
    v: 'v1.6.1-alpha', date: 'July 2026',
    notes: [
      'Act bosses\' signature legendary now appears IN the Act cache on the ACT COMPLETE screen (and goes to your Stash) instead of a missable ground drop — Act 1 Ring of Royal Grandeur · Act 2 Bloodtide Blade · Act 3 Scythe of the Cycle, guaranteed the first time you finish the Act, 50% after',
      'Character sheet: renamed the "Holdings" section to "Reagents"'
    ]
  },
  {
    v: 'v1.6.0-alpha', date: 'July 2026',
    notes: [
      'Raw damage now shows in BOTH the Inventory readout (DMG/HIT) and the Character sheet (Damage per hit), right under the damage ×multiplier',
      'About Rubies: a Ruby adds FLAT damage per hit, not % damage — so a weapon\'s "30% damage" affix will NOT change when you socket a Ruby (that is by design). What DOES change is your "Damage per hit": e.g. socketing a Marquise Ruby jumps it by +750. Watch that number, not the weapon %'
    ]
  },
  {
    v: 'v1.5.9-alpha', date: 'July 2026',
    notes: [
      'Blacksmith now shows a single Ring forge button instead of two (a crafted ring goes to your bag/stash, so one is all you need)'
    ]
  },
  {
    v: 'v1.5.8-alpha', date: 'July 2026',
    notes: [
      'Act bosses now drop their signature legendary — GUARANTEED the first time you beat the Act, 50% every time after: Act 1 → Ring of Royal Grandeur · Act 2 → Bloodtide Blade · Act 3 → Scythe of the Cycle',
      'Blacksmith: you can now always craft gear the smith can forge, even when your level is far above it — the gold cost scales with the GEAR level made, not your character level',
      'New Settings ▸ Font size (– / +, from 8 to 22) scales all on-screen text; the Horadric Cube leaflet and Character sheet are also auto-enlarged on tablet/desktop',
      'Weather sound effects now start MUTED by default (turn them on in Settings ▸ Audio)'
    ]
  },
  {
    v: 'v1.5.7-alpha', date: 'July 2026',
    notes: [
      'NEW Travelling Merchant — reachable from the Town Portal menu and the camp. BUY a rotating 5-item stock, or SELL your bag gear for gold (an alternative to salvaging it for materials)',
      'Inventory stats now show your RAW per-hit damage (HIT) beside the ×multiplier, plus your current GOLD at the bottom — and on tablet/desktop the whole stat readout is much bigger and easier to read',
      'Blacksmith crafting costs now scale with the gear level forged: lvl 1–15 need only Parts · 16–30 add Crystals · 31–60 add Dust · 61–70 add Souls',
      'Jeweler and Mystic use bigger fonts and more spaced-out rows on tablet/desktop'
    ]
  },
  {
    v: 'v1.5.6-alpha', date: 'July 2026',
    notes: [
      'FIXED saving: the browser\'s storage had filled up and saves were failing SILENTLY (no warning). Saving is now resilient — when storage is full it frees the oldest manual save so your progress keeps saving, and if it still can\'t save it tells you clearly instead of failing in silence',
      'Tip: browser storage is limited (~5 MB on iPhone). Salvage/sell items and delete old manual saves to free space if you see the storage warning'
    ]
  },
  {
    v: 'v1.5.5-alpha', date: 'July 2026',
    notes: [
      'Gem clarity: gems were always working, but the Inventory stat readout hid it. A Ruby grants FLAT damage (+9 per hit at Chipped), not a % multiplier — so the DMG line now shows it as "×2.03  +9" instead of looking unchanged',
      'The readout now also lists a gem stat the moment you socket one: Crit Damage (Emerald), Life per Hit (Amethyst), Cooldown Reduction & All-Resist (Diamond), Resource Cost (Topaz) — so every gem visibly moves a number'
    ]
  },
  {
    v: 'v1.5.4-alpha', date: 'July 2026',
    notes: [
      'Inventory: a glinting diamond now sits on the bottom of an equipment slot (weapon, helm, etc.) whenever the equipped item has an EMPTY gem socket — an at-a-glance "socket me". It fades away the moment you fill the last socket',
      'Removed the "Tap a gem to inspect" line from the socket popup'
    ]
  },
  {
    v: 'v1.5.3-alpha', date: 'July 2026',
    notes: [
      'Dev panel reorganized: every cheat is now its own row, grouped under category headers (Toggles · Character · Resources · Gold · Keys & Storage · Gear & Legendaries · Spawn Reagent Bosses · Artisans · Horadric\'s Cube), and the whole panel drag-scrolls so nothing is cut off',
      'Spawning reagent bosses is now three separate buttons — Bonewyrm, Gluttonous Brain and Rathma\'s Chosen summon individually instead of all at once'
    ]
  },
  {
    v: 'v1.5.2-alpha', date: 'July 2026',
    notes: [
      'FIXED iPhone music: the 16 soundtrack tracks are now served from the game\'s own site instead of a GitHub Release. The Release delivered them as a "download" (octet-stream/attachment) that iOS Safari refused to play inline — desktop tolerated it, iPhone did not. They now load as proper inline audio, so music plays on iPhone',
      'The music is unchanged; only where it\'s hosted moved'
    ]
  },
  {
    v: 'v1.5.1-alpha', date: 'July 2026',
    notes: [
      'New Settings ▸ Audio ▸ "Mono audio (single speaker)" toggle — folds the game audio to one channel so a single or mono Bluetooth speaker plays the whole mix',
      'Note: Mono affects effects, ambience, weather and the built-in score; the uploaded music tracks play through your phone directly (the OS already routes them to a paired Bluetooth speaker automatically)'
    ]
  },
  {
    v: 'v1.5.0-alpha', date: 'July 2026',
    notes: [
      'Mobile music: the game now retries starting your music tracks on every tap, so a rejected or stalled first play (slow load / autoplay block) recovers instead of staying silent',
      'NOTE for iPhone: music plays through HTML5 audio, which the phone\'s Ring/Silent switch mutes (game sound effects use a separate path and are unaffected). If you hear effects but no music, flip the Ring/Silent switch to Ring and turn media volume up'
    ]
  },
  {
    v: 'v1.4.9-alpha', date: 'July 2026',
    notes: [
      'Emerald in your BOOTS now grants an extra +20% Movement Speed',
      'Ruby in your HELM XP bonus retuned to +20% (2.0% at level 70) — both boons show on the item tooltip'
    ]
  },
  {
    v: 'v1.4.8-alpha', date: 'July 2026',
    notes: [
      'Fixed stale updates: the game\'s scripts are now cache-busted per version, so a new deploy is picked up right away instead of your browser serving old cached code (this is why the "Add 6 Marquise gems" fix looked like it was still giving Perfect gems)'
    ]
  },
  {
    v: 'v1.4.7-alpha', date: 'July 2026',
    notes: [
      'Dev panel: the "Add 6 of each gem" grant now gives top-tier MARQUISE gems (was Perfect) for endgame testing'
    ]
  },
  {
    v: 'v1.4.6-alpha', date: 'July 2026',
    notes: [
      'Full code audit — verified every screen, all 21 skills, combat, map-chaining, the tile system and save/reload all run clean. Hardened the lighting/fog rendering so a stray bad coordinate can never freeze the frame'
    ]
  },
  {
    v: 'v1.4.5-alpha', date: 'July 2026',
    notes: [
      'EVERY map now uses the new ground tiles — open graveyard/wet lands take the Marsh floor, sandy/windy wastes the Desert floor, all crypts the Dungeon floor, caves the Cave floor (no map is left on the old procedural ground)',
      'Fixed: a normal Rift Guardian now ALWAYS drops 1–3 Nephalem Rift Keys (it could previously roll zero)'
    ]
  },
  {
    v: 'v1.4.4-alpha', date: 'July 2026',
    notes: [
      'BIOME GROUND TEXTURES are now LIVE — Snow, Marsh, Desert, Dungeon and Cave maps tile the floor with their own hand-made art (the procedural ground stays as a fallback)'
    ]
  },
  {
    v: 'v1.4.3-alpha', date: 'July 2026',
    notes: [
      'Stash: TAP an item to inspect it — a card unfolds with its full stats and upgrade arrows vs what you have equipped',
      'Fixed the fog of war staying dark after returning from a cave (or any linked map) — the world now uncovers around you again as it should',
      'Loot cleanup: roughly HALF of ordinary monsters now just drop a little gold instead of gear/gems/trash (elites and bosses still roll full loot)',
      'Character Sheet no longer spells out the gem name on each bonus (Emerald/Ruby/…) — the coloured value already says which gem it is'
    ]
  },
  {
    v: 'v1.4.2-alpha', date: 'July 2026',
    notes: [
      'Groundwork for BIOME GROUND TEXTURES: each biome/theme (Snow, Marsh, Desert, Dungeon, Cave) can now tile the floor with its own art — drop the PNGs into docs/art/tiles/ and the game uses them (procedural ground until then). Dungeons & caves stay treeless, deserts keep cactus, marsh keeps marsh-trees'
    ]
  },
  {
    v: 'v1.4.1-alpha', date: 'July 2026',
    notes: [
      'Horadric\'s Cube: the Instruction Leaflet now lists your Parts/Dust/Crystals/Souls at the top, "Instruction of Rathma" is the header, the placeholder icon is gone, and you can now run FOUR extracted powers at once (was 3)',
      'The 6-piece Grace of Inarius BONE TORNADO is now huge and pronounced — a wide whirling circle of bone shards that grinds everything (and all the scenery) to bits',
      'The Pause menu\'s abandon button now names the mode: Abandon Story Mode / Rift / Nephalem Rift / Set Dungeon / Adventure Mode / Bounty',
      'Tidied The Wilds: removed the point/key flavor from Nephalem Rift and Seasons',
      'Skills of Rathma and Passives screens are noticeably bigger on desktop'
    ]
  },
  {
    v: 'v1.4.0-alpha', date: 'July 2026',
    notes: [
      'PARAGON LEVELS: past level 70 you keep leveling (near-infinite) — every paragon level grants a Nekromancer Point (NP) to spend',
      'Spend NP across four trees — CORE (Vitality, Intelligence, Movement Speed, Maximum Mana), OFFENSE (Attack Speed, Crit Damage, Crit Chance, Cooldown Reduction), DEFENSE (Armor, Life %, All Resistance, Life per Second), UTILITY (Area Damage, Life per Hit, Resource Cost, Pickup Radius)',
      'Vitality, Intelligence and Life % scale infinitely; the rest cap (200 pts, or 500 for Life per Hit). Open the Paragon screen from the Character Sheet footer, and points can be freely refunded',
      'Dev panel: "Level 70", "+25 Paragon" and "+200 NP" buttons for testing'
    ]
  },
  {
    v: 'v1.3.3-alpha', date: 'July 2026',
    notes: [
      'Seasons now GUARANTEE a Grace of Inarius set piece on every run — duplicates included, because chasing better rolls is the whole point',
      'Season orb requirement cut from 1500 to 1000 points',
      'Season maps are now MEDIUM instead of extra-large, and their entrance/exit portals work — roam and cycle through several smaller maps to fill the orb bar (your progress carries across them; the Guardian rises wherever the bar completes and seals the links)'
    ]
  },
  {
    v: 'v1.3.2-alpha', date: 'July 2026',
    notes: [
      'HORADRIC\'S CUBE — Instruction of Rathma: the Cube can now EXTRACT a legendary power from a loose item in your bag (not equipped, not stashed) for 30 Parts / 50 Dust / 50 Crystals / 3 Souls, banking it forever (the item is consumed)',
      'Switch on up to 3 banked powers at once — they apply to your character WITHOUT wearing the item (Kanai-style). Check the Character Sheet\'s ACTIVE POWERS panel to see them',
      'The Recipe Book is now the Instruction Leaflet; the Golden Mirror transmute moved to the END of it (and off the top of the Cube)',
      'Only legendaries that actually carry a secondary power appear in the extract list — plain legendaries are skipped'
    ]
  },
  {
    v: 'v1.3.1-alpha', date: 'July 2026',
    notes: [
      'Set items now spell out their bonuses on every piece: how many you are wearing (e.g. 4/6) and which tier bonuses are ACTIVE (◈) vs dormant (◇), Royal Grandeur\'s extra piece included',
      'The Character Sheet has a new ACTIVE POWERS panel listing every legendary power and set bonus currently shaping your build',
      'Verified all 11 legendary secondary powers fire when equipped (Bloodtide, Cycle Scythe, Funerary Pick, Iron Rose, Convention of Elements, Krysbin\'s Sentence, Royal Grandeur, and more)'
    ]
  },
  {
    v: 'v1.3.0-alpha', date: 'July 2026',
    notes: [
      'MAP CHAINING: every map now has a walkable ENTRANCE and EXIT (plus the odd rare CAVE mouth). Step through an exit to roam onward into a fresh linked map — chain as far as you like — and walk back through an entrance to return to the EXACT map you left, with every enemy, corpse and pickup right where you left it (true saved-state backtracking)',
      'The links stay open until a map\'s boss falls; killing the boss seals them and opens the usual portal (which, on a linked sub-map, walks you back to the parent map)',
      'Rathma\'s Chosen now lurks inside the rare CAVE — a real hidden dungeon you enter, not an abstract spawn'
    ]
  },
  {
    v: 'v1.2.5-alpha', date: 'July 2026',
    notes: [
      'The Gluttonous Brain is now properly grotesque — sickly green flesh mottled with bruise-purple welts (no more pink)',
      'Torch Bench cleaned up: it only lists reagents you actually hold and only torches you can forge right now — no spoilers for gear you have not found. Removed the rarity labels (the craft colour says it all) and the reagent-source flavor text'
    ]
  },
  {
    v: 'v1.2.4-alpha', date: 'July 2026',
    notes: [
      'THREE new bosses now drop the top-torch reagents: THE BONEWYRM roams outside Story Mode (Bounties/Adventure/Rifts/Nephalem/Seasons) and drops Wyrm Scales (12%)',
      'THE GLUTTONOUS BRAIN — a huge, huge, HUGE fat ogre who vomits bile AoE, chain-pulls and STUNS you for 2s, summons fat zombies, and ENRAGES at 50% life (+15% dmg, +10% life). Drops Gluttonous Brain (10%)',
      'RATHMA\'S CHOSEN — a tall, slender assassin who fades to smoke while you damage it and enrages at 35% (+20% life, +25% dmg). Lurks in a super-rare cave (3% of maps) and drops 1-3 Souls of Rathma (20%)',
      'Dev panel: "Spawn reagent bosses near you" summons all three for testing'
    ]
  },
  {
    v: 'v1.2.3-alpha', date: 'July 2026',
    notes: [
      'TORCH LADDER expanded to SEVEN tiers: Wood (Common, r60) · Iron (Uncommon, r110) · NEW Wyrm-bound (Magic, r180) · Nephalem (Rare, r250) · NEW Master\'s Light (Epic, r350) · NEW Nekromancer\'s (Legendary, r500)',
      'Three new crafting reagents — Wyrm Scale, Gluttonous Brain and Soul of Rathma — feed the top torches (their boss drop-sources are coming next)',
      'The Torch Bench now scrolls so all seven torches fit, each showing its rarity tier'
    ]
  },
  {
    v: 'v1.2.2-alpha', date: 'July 2026',
    notes: [
      'Character sheet now SHOWS every gem bonus that was previously invisible: Crit Damage (Emerald), Bonus Damage per hit (Ruby), Life per Hit (Amethyst), All Resist + Cooldown Reduction (Diamond) and Resource Cost Reduction (Topaz) — the values were always applied in combat, they just weren\'t displayed, so socketed gems looked like they did nothing',
      'Socket-gem popup: gem choices now show each gem\'s ICON and TYPE name (Ruby / Emerald / Amethyst / Topaz / Diamond) instead of five identical "Marquise ×N" chips you couldn\'t tell apart',
      'Fixed the torch action buttons reading a meaningless "L0" (looked like "Lo") — torches now show "—" for Salvage/Socket/Stash since they can\'t be broken down, socketed or stashed',
      'Item tooltips no longer let long affix/gem lines spill off the edge of the card'
    ]
  },
  {
    v: 'v1.2.1-alpha', date: 'July 2026',
    notes: [
      'Returning from town now CLOSES your town portal (so you can cast a fresh one), with a 30-second cooldown before the next portal — the HUD Portal button shows the countdown'
    ]
  },
  {
    v: 'v1.2.0-alpha', date: 'July 2026',
    notes: [
      'The Town Portal is now bound to the T key on desktop (rebindable in Settings → Keys → "Town portal")'
    ]
  },
  {
    v: 'v1.1.9-alpha', date: 'July 2026',
    notes: [
      'The land now unveils as a smooth, feathered MIST that melts away as your hero slides across the map — no more revealing in blocky chunks'
    ]
  },
  {
    v: 'v1.1.8-alpha', date: 'July 2026',
    notes: [
      'Reworked the town-portal channel: instead of a circular cast bar, a gathering storm of blue lightning now crackles ABOVE your hero\'s head, climbing and intensifying as the 7-second channel fills'
    ]
  },
  {
    v: 'v1.1.7-alpha', date: 'July 2026',
    notes: [
      'The mouse pointer is now a boldly-outlined skeletal BONE HAND — far easier to spot on the dark battlefield',
      'Settings → "Bone cursor size" lets you scale the pointer up to 2× or 3× for extra visibility'
    ]
  },
  {
    v: 'v1.1.6-alpha', date: 'July 2026',
    notes: [
      'Tightened the torch light: no torch now lights only 20 · Wood 60 · Iron 110 · Nephalem 180 — the dark presses in much harder until you upgrade your torch'
    ]
  },
  {
    v: 'v1.1.5-alpha', date: 'July 2026',
    notes: [
      'FOG OF WAR is back on the world map: every land now starts pitch black and uncovers as you explore it, exactly like the minimap',
      'Your torch controls how far you can see: with NO torch the pool of light is really small, a Wood Torch widens it, an Iron Torch a bit more, and a Nephalem Torch lights a LOT more (and uncovers the fog just as far)'
    ]
  },
  {
    v: 'v1.1.4-alpha', date: 'July 2026',
    notes: [
      'Dev panel: new "+5 gem slots on equipped weapon" button — adds 5 sockets to your currently equipped weapon (and lets the Mystic keep pace)'
    ]
  },
  {
    v: 'v1.1.3-alpha', date: 'July 2026',
    notes: [
      'A Ruby socketed in your HELM now grants a bonus +50% XP gain (softening to +5.0% at level 70, like all XP) — on top of its usual two stats',
      'The Funerary Pick now drops with 0–3 gem sockets (rolled at random); the Mystic can uncover any it is missing, up to 3, just like a normal socket reveal',
      'Artifacts can now gain sockets from the Mystic as well (were previously capped at zero)'
    ]
  },
  {
    v: 'v1.1.2-alpha', date: 'July 2026',
    notes: [
      'Inventory: equipping a piece now snaps the bag list back to the TOP (instead of the bottom) so your other strong items stay in view',
      'Inventory: added an "↑ Top" button beside SOCKET GEM to jump straight back to the top of the bag list',
      'Jeweler: gems are now sorted best-tier-on-top within each kind (Marquise up top, Chipped at the bottom) — no more finest gem buried in the middle'
    ]
  },
  {
    v: 'v1.1.1-alpha', date: 'July 2026',
    notes: [
      'The Jeweler gem list now scrolls by DRAGGING (the ▲/▼ arrow buttons are gone)',
      'Confirmed the gem pouch uses the new 13-tier two-stat gems everywhere (Chipped → Marquise); any older gems convert automatically on load'
    ]
  },
  {
    v: 'v1.1.0-alpha', date: 'July 2026',
    notes: [
      'FIX: the Bounty Horadric Stash no longer mentions Nephalem Rift Keys ("No rift key this time") — keys come from Rifts, not bounties. The bounty stash now grants gold, 3 Forgotten Souls and two gems'
    ]
  },
  {
    v: 'v1.0.9-alpha', date: 'July 2026',
    notes: [
      'MUSIC IS LIVE — 16 tracks now stream from the music-v1 GitHub Release, shuffled on loop, through Settings ▸ Master × Music volume (mute works). Verified the release files are valid MP3s and reachable'
    ]
  },
  {
    v: 'v1.0.8-alpha', date: 'July 2026',
    notes: [
      'Music playlist entries can now be FULL URLs — host tracks anywhere (a GitHub Release, a CDN, etc.) by pasting complete links into MUSIC_PLAYLIST, or keep bare filenames with a MUSIC_BASE_URL. (Google Drive works only via unreliable direct-download links — a GitHub Release is recommended.)'
    ]
  },
  {
    v: 'v1.0.7-alpha', date: 'July 2026',
    notes: [
      'GEMS REWORKED — each gem now grants TWO stats, with hand-tuned values for all 13 tiers (GEM_STATS in data.js). Ruby = +Damage & +XP · Emerald = +Crit Damage & +Gold · Amethyst = +Life-per-Hit & +Life · Topaz = -Resource Cost & +Gold · Diamond = +All-Resist & -Cooldowns',
      'New gem stats are fully functional: crit damage boosts crits, all-resist adds damage reduction (stacked with armor), cooldown- and resource-cost reduction lower skill cooldowns/costs, life-per-hit heals on every hit, flat damage adds to each hit',
      'Gems no longer have slot-specific rules — a gem gives its two stats in any socket. (Ruby XP still shrinks to 1/10 at level 70.)'
    ]
  },
  {
    v: 'v1.0.6-alpha', date: 'July 2026',
    notes: [
      'Music can now be hosted OUTSIDE the repo — set MUSIC_BASE_URL in audio.js to a GitHub Release download URL and drop your 16 tracks there (audio files are too big to live in the repo / GitHub Pages). Local sounds/music/ still works for small files',
      'Music volume now runs on the audio element directly (Master × Music, mute included), so externally-hosted tracks play without cross-origin issues'
    ]
  },
  {
    v: 'v1.0.5-alpha', date: 'July 2026',
    notes: [
      'Music now plays SHUFFLED — a random order that never repeats a track until the rest have played, so you never know which is next',
      'The music playlist now holds 16 tracks (drop 1.mp3–16.mp3 into docs/sounds/music/)'
    ]
  },
  {
    v: 'v1.0.4-alpha', date: 'July 2026',
    notes: [
      'Item rarity drops retuned to a full per-difficulty table (ITEM_DROP_TABLE in items.js) — Trash/Common/Magic/Rare/Epic/Legendary/Artifact odds are now set explicitly for every difficulty. Elite/boss/masterwork bonuses still tilt drops upward, and Artifacts remain Torment XVI only'
    ]
  },
  {
    v: 'v1.0.3-alpha', date: 'July 2026',
    notes: [
      'Gem drops retuned to a full per-difficulty table (GEM_DROP_TABLE in data.js) — every difficulty now has its own spread across the 13 tiers, including a "no gem" chance. Monster kills honour that "None" chance; Horadric/act cache gems always drop',
      'MUSIC now supports real audio files. Drop tracks into docs/sounds/music/ named 1.mp3–8.mp3 and they play in order on loop, mixed through Settings ▸ Master × Music volume (mute works). No files = the built-in generative score still plays',
      'Added docs/sounds/ with music/ · ambience/ · weather/ · fx/ folders (see docs/sounds/README.md) for future audio'
    ]
  },
  {
    v: 'v1.0.2-alpha', date: 'July 2026',
    notes: [
      'New NEKROMANCY title logo is now showing. Its white background was knocked out to transparent so it sits cleanly on the dark title screen',
      'FIX: the logo is now cache-busted by game version, so a replaced logo.png always loads fresh instead of showing a stale cached image'
    ]
  },
  {
    v: 'v1.0.1-alpha', date: 'July 2026',
    notes: [
      'NEW — a PORTAL button on the HUD (above the potion). Tap it to channel a TOWN PORTAL: your Nekromancer stands and focuses for 7 seconds (with a rune-ring casting animation) and a blue portal — a twin of the boss portals — tears open. Step through it to reach town (Blacksmith/Jeweler/Mystic/Stash), then step back to the fight',
      'Moving cancels the channel; tap the button again to cancel it yourself. The button shows the countdown while casting and reads OPEN once the portal is up',
      'Removed the old blue town-portal button from the Inventory wheel — it now lives on the HUD'
    ]
  },
  {
    v: 'v1.0.0-alpha', date: 'July 2026',
    notes: [
      'Town-portal Escape flow: in the town-portal menu, Escape returns to the wilds. Inside one of its menus (inventory/blacksmith/jeweler/mystic/stash), Escape steps back to the town-portal menu; pressing Escape again then returns to the wilds — matching the red ✕'
    ]
  },
  {
    v: 'v0.9.9-alpha', date: 'July 2026',
    notes: [
      'The title screen now shows the new NEKROMANCY key-art logo, framed by a steady purple glow (no more hovering). It stays OFF the hero-select screen',
      'The old separate "NEKROMANCER" wordmark is gone — the title is part of the artwork now'
    ]
  },
  {
    v: 'v0.9.8-alpha', date: 'July 2026',
    notes: [
      'Removed the logo from the title and hero-select screens',
      'Hero-select: removed the forest, and added a little VILLAGE on the back-right horizon — silhouetted houses with a church spire and warm flickering windows',
      'Fewer bats, and they now fly straight PAST the moon instead of orbiting it',
      'Dragons are now assorted colours (green/red/blue/purple/gold/bone), appear every 34–89s, weave up and down much more, and vary in size — some soar far away and small'
    ]
  },
  {
    v: 'v0.9.7-alpha', date: 'July 2026',
    notes: [
      'The hand-drawn GAME LOGO (purple radiant-skull emblem) is now live — it crowns the title screen and sits on the hero-select screen, replacing the procedural stand-in'
    ]
  },
  {
    v: 'v0.9.6-alpha', date: 'July 2026',
    notes: [
      'HERO-SELECT SCENE overhauled: the forest treeline now sits higher on the horizon, clearly BEHIND the heroes; the campfire glow is dimmer so it no longer blows out the scene',
      'The wind-swept grass no longer looks like "waving spaghetti" — each tuft now has a random number of blades at different heights that lean independently on the gusts',
      'More scattered stones and litter across the clearing, plus a fallen adventurer\'s skeleton (with sword and shield) resting in the foreground grass',
      'More bats — a colony now wheels across the moon',
      'NEW: every 12–40 seconds a far dragon glides across the distant sky and breathes a gout of fire, tracked by a glowing ember at its maw'
    ]
  },
  {
    v: 'v0.9.5-alpha', date: 'July 2026',
    notes: [
      'NEW — a GAME LOGO (purple radiant-skull emblem) now crowns the title screen above the NEKROMANCER wordmark, and sits in the upper-right of the hero-select screen. Drop the hand-drawn art into docs/art/logo.png and flip LOGO_ART_READY to swap the procedural emblem for the real thing (drawn via drawGameLogo, procedural fallback otherwise)'
    ]
  },
  {
    v: 'v0.9.4-alpha', date: 'July 2026',
    notes: [
      'GEMS EXPANDED to a 13-tier ladder (owner rule): Chipped · Flawless · Perfect · Square · Flawless Square · Brilliant Square · Star · Flawless Star · Radiant Star · Imperial · Flawless Imperial · Royal Imperial · Marquise. Old saves migrate automatically',
      'Torment drops climb the new ladder — roughly Perfect at T1 up to Marquise at T16; below Torment you still find Chipped→Perfect. Combine 3→1 all the way to Marquise',
      'Each gem now draws a FACETED ICON that evolves its cut up the ladder (round → square → star → imperial → marquise) — shown on the ground, in the Jeweler and in the socket picker. Ready to swap in the hand-drawn gem art (drop the sliced PNGs into docs/art/gems/ and flip GEM_ART_READY)',
      'The apex gem perks (+20% damage in any slot, helm-ruby XP, boots-emerald move) now trigger at Perfect-or-better and the helm-XP scales across the full 13-tier range (3%→20%)'
    ]
  },
  {
    v: 'v0.9.3-alpha', date: 'July 2026',
    notes: [
      'FIX: choosing a skill & rune and hitting ACCEPT now keeps you focused on the slot you just edited (e.g. Command Skeletons in the Reanimation slot) instead of snapping back to the first Primary slot. CANCEL likewise returns to the slot you came from'
    ]
  },
  {
    v: 'v0.9.2-alpha', date: 'July 2026',
    notes: [
      'THE WILDS — modes now unlock by level and are HIDDEN until then: Story Mode & The Rift from level 1, Bounties at 20, Adventure Mode at 60, Nephalem Rift at 70, and Seasons once you earn your first Master Key (it stays unlocked after)',
      'Rift renamed to THE RIFT — "Survive the onslaught and kill the Guardian"',
      'The difficulty arrows now GREY OUT at the bounds (◀ dark on Normal, ▶ dark on the top Torment). "Monsters ×N" and "Rewards ×N" are bigger and white',
      'Removed the "Torment unlocks at level 70" line from the menus',
      'STORY MODE — each Act is now a short chain of 2–5 maps ending on the Act boss. When the boss falls, a new screen offers a difficulty choice with CONTINUE (straight into the next Act) or TOWN (bank your progress and continue later)',
      'BOUNTIES are now a three-part hunt: each part is 1–2 maps ending on the land\'s unique boss, and the portal carries you onward. Slay all three bosses to claim the HORADRIC STASH (the same loot as a Rift for your difficulty)',
      'The Wilds footer hides the Nephalem/Master key counts until you\'ve earned one, and the old "Cleared" line is gone'
    ]
  },
  {
    v: 'v0.9.1-alpha', date: 'July 2026',
    notes: [
      'NEW — every 3 Bounties you finish awards a HORADRIC STASH: the same loot as a Normal Rift (gold, Forgotten Souls, a gem, and a chance at a Nephalem Rift Key). The reward screen tracks your progress (x / 3)',
      'FIX: the character sheet now SCROLLS (drag up/down) so the ANALYSIS section is reachable on phones',
      'FIX: a rune\'s unlock level is no longer hidden behind the rune art — it shows as a clear badge on top',
      'You can now tap a locked skill or rune in the chooser to READ it; it just can\'t be equipped/used until you reach its level'
    ]
  },
  {
    v: 'v0.9.0-alpha', date: 'July 2026',
    notes: [
      'STORY MODE now opens a menu: CONTINUE picks up at your next uncleared Act, or SELECT AN ACT to replay any Act you\'ve already cleared (the dropdown is barred until you\'ve finished at least one Act). The campaign spans 100 Acts — every Act after the hand-authored ones (I and III) is themed procedurally so the journey always continues',
      'Campfire (Choose Your Hero) reworked: the fire sits closer to you and is softer in the centre, the two side heroes gather in close around it, the forest treeline reads clearly with a moonlit rim, and a field of wind-swept grass of varying heights sways in the foreground'
    ]
  },
  {
    v: 'v0.8.9-alpha', date: 'July 2026',
    notes: [
      'NEW — ELECTIVE MODE (Settings ▸ Gameplay): turn it on to run more than one skill from the same category on your action bar. Off by default (one skill per category)',
      'FIX: Forgotten Souls now always show in the Blacksmith\'s reagent row after salvaging Legendaries/Artifacts — the row shrinks to fit every reagent instead of dropping Souls off the end; bulk salvage also reports the souls gained',
      'TORCHES now go to your INVENTORY when crafted and take NO bag slot — they just persist. They no longer use a Stash bin (existing stash torches move to your bag automatically)',
      'Inventory expansions are bigger per tier — +50, then +150, +250, +350 … up to 2,474 slots',
      'Fixed a duplicate Damage/Life/Crit readout inside the equipment wheel (those live in the upper-left panel) and nudged the wheel right so the stats have room',
      'Dev panel: +100k inventory space · +5 Lumber/Rivets/Heartstring'
    ]
  },
  {
    v: 'v0.8.8-alpha', date: 'July 2026',
    notes: [
      'NEW — a fleshed-out SKILLS & RUNES chooser: browse skills by category with ◀ ▶ arrows (Primary · Secondary · Corpses · Reanimation · Curses · Blood & Bone), pick a rune underneath, preview the assigned skill, then ACCEPT. Open it from the ⚑ CHOOSE SKILLS & RUNES button or the ◈ RUNES button under a skill\'s description',
      'The action bar is now ONE skill per category (six category slots)',
      'Skills AND runes are now locked behind character level — the chooser shows each unlock level in red, and dims what you can\'t use yet',
      'Retuned skill & rune unlock levels to the owner\'s progression table (e.g. Skeletal Mage 19, Corpse Lance 28, Bone Armor 17); Revive is now a Corpse skill and Simulacrum a Blood & Bone skill'
    ]
  },
  {
    v: 'v0.8.7-alpha', date: 'July 2026',
    notes: [
      'Runes: each of a skill\'s rune options now shows a DISTINCT carved stone — no two options for the same skill share a rune image anymore'
    ]
  },
  {
    v: 'v0.8.6-alpha', date: 'July 2026',
    notes: [
      'NEW ART — all 21 skills now use hand-drawn circular icon art across the radial HUD, loadout and skill grid (the procedural glyphs remain as an automatic fallback)',
      'NEW ART — runes now render as hand-drawn glowing lava-carved stones (20 variants) beside each rune option, seeded so a given slot always shows the same stone'
    ]
  },
  {
    v: 'v0.8.5-alpha', date: 'July 2026',
    notes: [
      'NEW — skill slots can now show CUSTOM ICON ART. Drop a square PNG in docs/art/icons/<skillId>.png and list that id in SKILL_ICON_FILES (skills.js); it renders across the radial HUD, loadout and skill grid, with the built-in procedural glyph as an automatic fallback',
      'The game still ships with the procedural glyphs by default — no art files, no extra downloads'
    ]
  },
  {
    v: 'v0.8.4-alpha', date: 'July 2026',
    notes: [
      'Mystic: rerolling a property now KEEPS it selected afterward, so you can watch the value change roll after roll (it follows the reroll if it lands on another property in the group) instead of deselecting every time',
      'Mystic: a property already at its maximum rollable value is shown in GOLD with a "maxed ✓" tag — so you know at a glance a reroll can\'t improve it'
    ]
  },
  {
    v: 'v0.8.3-alpha', date: 'July 2026',
    notes: [
      'SKILL ICONS reworked — every one of the 21 actives now has a full-colour, glowing emblem themed to its element (green bone magic, cyan army/scythe, red blood, orange corpse, purple curse) instead of the old flat monochrome glyphs',
      'Curses re-coloured and redrawn: Decrepify (cyan wither), Leech (red barbed drain), Frailty (purple hourglass)',
      'NEW — runes now render as a carved-stone shard with a glowing etched glyph (five random variants) beside each rune option'
    ]
  },
  {
    v: 'v0.8.2-alpha', date: 'July 2026',
    notes: [
      'NEW — STORY MODE, ACT III: ten scorched desert lands guarded by named legendary horrors, ending in the grave of the SAND WYRM — a colossal burrowing serpent that erupts from the sand',
      'NEW ARTIFACT — the HORADRIC\'S CUBE. It has a 10% chance to be found on any Act III map; if you reach the Sand Wyrm without it, the Wyrm drops it for certain',
      'Once you hold the Cube, a HORADRIC\'S CUBE button appears in town (before the Blacksmith). Its recipe book is a closed tome for now — "coming soon ™"',
      'NEW — the GOLDEN MIRROR: the Treasure Goblin now has a 10% chance to drop it. Transmute it in the Horadric\'s Cube and every purple orb (Rifts & Seasons) is collected INSTANTLY — no more chasing them down',
      'Dev panel: grant the Horadric\'s Cube + Golden Mirror for testing',
      'FIX: the dev "enemy spawn boost" now also multiplies the purple orbs that drop in Rifts & Seasons — a boosted run fills the orb bar as fast as the swollen packs suggest'
    ]
  },
  {
    v: 'v0.8.1-alpha', date: 'July 2026',
    notes: [
      'STASH OVERHAUL: the vault now uses the equipment WHEEL — items auto-sort into per-slot bins (tap a slot to browse/withdraw/salvage). Each bin holds 100, and rings share a bin',
      'Stash is upgradable: 1,000 per slot (500k g) · 5,000 per slot (50m g) · 10,000 per slot (999m g)',
      'Dev panel: replaced the bag-space grant with "Max Stash upgrades"'
    ]
  },
  {
    v: 'v0.8.0-alpha', date: 'July 2026',
    notes: [
      'Settings now SCROLL by touch (drag up/down) instead of ▲/▼ arrows — and the "GAMEPLAY" heading no longer overlaps the Weather slider',
      'Tapping "Game creator" now opens a proper about card — the game, its creator (Sterling Grant) and version — with a checkbox below to enable the dev panel',
      'Dev panel: a slider to boost enemy spawns in ALL difficulties, +0% up to +1000% (kept per hero) — great for stress-testing the horde',
      'The Town Portal now includes INVENTORY (above Blacksmith), so you can manage gear mid-run, not just drop and go'
    ]
  },
  {
    v: 'v0.7.9-alpha', date: 'July 2026',
    notes: [
      'AFFIX SYSTEM OVERHAUL: every stat now has a hard per-tier ceiling. Artifact-5★ maxes — Damage 2000% · Crit 1000% · Gold Find 6000% · Life 20000 · Life/s 450 · Essence/s 200 · Armor 10000 — and lower tiers scale down proportionally',
      'Items no longer roll the SAME affix twice (no stacking), and the Mystic reroll uses the exact same math as item generation — so an item can NEVER hold a value above what the Mystic shows as the max (the old "max 1035% but yours 1932%" mismatch is gone). The Mystic can now reroll all the way to the cap'
    ]
  },
  {
    v: 'v0.7.8-alpha', date: 'July 2026',
    notes: [
      'Inventory now shows a live STAT READOUT in the upper-left — Damage, Crit, Gold Find, Life, Life/s, Essence/s — so you can see at a glance what your gear gives',
      'Bag list is SORTED by upgrade: ▲▲▲ best-in-slot at the very top, down through ▲▲ · ▲ · — · ▼ · ▼▼ · ▼▼▼, so the good stuff is always on top. A ▲▲▲ (clear upgrade) gently bobs and pulses green — all in sync — to catch your eye',
      'Swapping gear now HOLDS ONTO the piece you took off: a one-tap "↺ Re-wear" button appears above the bag list so you can change your mind without hunting through the list'
    ]
  },
  {
    v: 'v0.7.7-alpha', date: 'July 2026',
    notes: [
      'Fixed upgrade arrows badly over-valuing legendary-power items: crit was weighted higher than damage (now damage leads, as +100% dmg beats +100% crit), and the legendary/set "build bump" was far too strong — it could flag a weapon with LESS than half the damage as an upgrade. The bump is now a gentle tiebreaker that never overrides a clearly stronger item',
      'Blacksmith top bar now shows your Forgotten SOULS right next to Crystals (gold abbreviated so nothing clips) — handy when salvaging legendaries & artifacts',
      'Season runs now say SEASON COMPLETE and, instead of a rift-keys line (seasons don\'t drop keys), roll a SET PIECE into the cache by difficulty (green) — higher Torment, better odds'
    ]
  },
  {
    v: 'v0.7.6-alpha', date: 'July 2026',
    notes: [
      'TOWN PORTAL: a blue portal button (opposite the ✕) in the wilds inventory whisks you to the Blacksmith, Jeweler, Mystic and Stash mid-run — then "Back to the Wilds" drops you right back into the fight you left',
      'No more auto-salvage: when your bag is full, loot is LEFT ON THE GROUND — it stops being pulled toward you and no longer chases you. Free up space and come back for it',
      'The Jeweler now BUYS gems for gold — SELL 1 or SELL ALL from the gem detail card (value climbs with tier)',
      'Upgrade arrows now count the gems in your equipped gear — a Perfect-gemmed or ruby-in-weapon piece is valued for real against a bare, gemless drop'
    ]
  },
  {
    v: 'v0.7.5-alpha', date: 'July 2026',
    notes: [
      'UPGRADE ARROWS are now priority-tiered (D3-style): damage & crit are weighed before all else, then life & life-regen, then armor/gold/essence — and a legendary power or set piece gets a build-value bump so it stops being under-rated next to a stat-stacked rare',
      'Season screen now SCROLLS (drag the middle, START button pinned) so the set-bonus text is never cut off on mobile',
      'Dev panel: buttons for +5000 inventory slots, +5 Master Keys, and +5 Nephalem Rift Keys'
    ]
  },
  {
    v: 'v0.7.4-alpha', date: 'July 2026',
    notes: [
      'Salvaging an ARTIFACT now returns Forgotten Souls by its star tier: 3 at 0★, 4 at 1★, 5 at 2★, 6 at 3★, 7 at 4★, 8 at 5★ — individual and bulk salvage both honor it'
    ]
  },
  {
    v: 'v0.7.3-alpha', date: 'July 2026',
    notes: [
      'MYSTIC screen now SCROLLS — drag the middle (card + property list + odds) while the cost and REROLL button stay pinned at the bottom, so nothing runs off a phone screen no matter how many affixes an item has',
      'Reroll odds now show each outcome\'s VALUE RANGE and the max, plus your current roll — e.g. "Damage · rolls 12–150% (max) · yours 142%" — so you know how close to perfect you are before spending',
      'Removed the leftover "lands cleared" line at the bottom of the camp screen'
    ]
  },
  {
    v: 'v0.7.2-alpha', date: 'July 2026',
    notes: [
      'Build-defining legendaries now DROP IN THE WILD at Torment — Funerary Pick, Iron Rose, Convention of Elements, Krysbin\'s Sentence, Bloodtide Blade, Scythe of the Cycle and The Royal Grandeur each have a shot in the ~10% "named power" slice of T1–T16 loot',
      'Their quality scales with the Torment level: legendary (1★ at T3–T7, 2★ T8–T13, 3★ T14–T15) and full ARTIFACT grade at T16 (up to 5★)',
      'GRACE OF INARIUS set pieces now drop ONLY in Seasons — and they scale from legendary up to artifact-5★ by Torment (each star adds an affix and lifts every roll). Nephalem Rift Guardians now hand out a tiered named legendary instead of set pieces'
    ]
  },
  {
    v: 'v0.7.1-alpha', date: 'July 2026',
    notes: [
      'Rift Guardian reward now reports how many RIFT KEYS dropped this run (e.g. "2× Nephalem Rift Keys dropped") instead of the running "Rifts cleared" count'
    ]
  },
  {
    v: 'v0.7.0-alpha', date: 'July 2026',
    notes: [
      'GEM DROP TIERS now gate by difficulty (owner spec): Chipped/Flawed/Regular drop below Torment, Flawless drops T1–T10, Perfect drops T11–T16. (The Jeweler still cuts gems by his own level.)',
      'LEGENDARY STAR tiers gate by Torment band: 1★ drops T3–T7, 2★ T8–T13, 3★ T14–T16 — below T3 legendaries are plain',
      'ARTIFACTS now drop ONLY at Torment XVI. When one drops its star tier rolls: 1★ 10% · 2★ 7% · 3★ 5% · 4★ 3% · 5★ 1% (else a base artifact). A 5★ artifact is the pinnacle drop',
      'Loot table refactored so star tiers are assigned by difficulty band instead of being baked into the rarity roll'
    ]
  },
  {
    v: 'v0.6.9-alpha', date: 'July 2026',
    notes: [
      'INVENTORY now SCROLLS by touch (drag up/down) — no more arrows and no more truncation. Tall drops (3★ legendaries, artifacts) no longer leak their action buttons off the bottom; picking an item auto-scrolls to reveal them. Mouse-drag and the scroll-wheel work too',
      'Added a fourth action button — STASH — beside EQUIP / SALVAGE / SOCKET, to deposit a single item straight into the shared vault'
    ]
  },
  {
    v: 'v0.6.8-alpha', date: 'July 2026',
    notes: [
      'BLACKSMITH now forges by his own level, not yours: L1 makes lvl 1–5 gear, L2 6–10, L3 11–20, L4 21–30, L5 31–40, L6 41–50, L7 51–60, L9 61–70. His current forge band is shown on the anvil',
      'Bulk-salvage gates moved to the smith: level 8 unlocks EPIC bulk-salvage, level 10 unlocks LEGENDARY/SET (single items still break down free from the Inventory any time)',
      'MYSTIC reroll is no longer a gamble — every property belongs to a GROUP (Offense: damage/crit/essence · Defense: life/armor/life-regen · Utility: gold/move) and a reroll can only land within that group, with the EXACT odds shown before you pay. Signature legendary affixes are locked',
      'Mystic pricing reworked: rerolls start at just 50g and climb gently (~15–20 rolls to reach the tens of thousands). Souls are charged ONLY on legendary-and-above, per tier: Set 1 · Legendary 1–4 by star · Artifact 5–10 by star',
      'Dev panel labels corrected to Mystic and Jeweler'
    ]
  },
  {
    v: 'v0.6.7-alpha', date: 'July 2026',
    notes: [
      'LOOT TABLE overhaul (owner spec). New top rarity — the ARTIFACT (red) — plus LEGENDARY STAR tiers (★, ★★, ★★★, each a little stronger) and grey TRASH gear for salvage/vendor fodder',
      'Drop odds now scale by difficulty: at Normal you mostly see commons (legendary ~1.9%, artifact ~0.1%); by Torment XVI legendaries hit 30% and artifacts 5%, with commons and trash drying up. ~5% of drops are gems',
      'Settings screen now SCROLLS (▲/▼) so the bottom options (loot text style, corpse limit, about) are reachable on phones'
    ]
  },
  {
    v: 'v0.6.6-alpha', date: 'July 2026',
    notes: [
      'ARMOR rebalanced — low armor now barely mitigates (201 armor ≈ 0.3% instead of 30%), so you\'re genuinely squishy early. Only huge armor totals (hundreds of thousands, the endgame goal) reach real damage reduction, capped at 80%',
      'The world gets tougher at the endgame: monsters hit +5% harder at level 60 and +9% harder at level 70'
    ]
  },
  {
    v: 'v0.6.5-alpha', date: 'July 2026',
    notes: [
      'Bosses fight with far more variety — each archetype has its own ability kit: a whirling BONE NOVA (a ring of shards), SUMMONING extra undead, and erupting GROUND FISSURES that chase you, on top of the classic charge and ground slam. The Skeleton King raises skeletal archers; the ghost lords favour novas and fissures'
    ]
  },
  {
    v: 'v0.6.4-alpha', date: 'July 2026',
    notes: [
      'The campfire hero-select is now a proper night scene: a full moon and stars over a dark forest treeline, decrepit ruined buildings in the right background, and bats that flap across the sky now and then',
      'The fire actually DANCES — layered flame tongues that sway and flicker (not a pulse), sat on a little stack of logs with rising embers',
      'The ground is strewn with dry grass, rocks, leaves and branches whose long shadows sway with the firelight, and a still bank of fog drifts across the foreground'
    ]
  },
  {
    v: 'v0.6.3-alpha', date: 'July 2026',
    notes: [
      'NEW SETTING — a DPS meter (off by default) that lives under the minimap. Toggle its lock with the padlock; when unlocked, drag it anywhere on mobile, tablet or desktop',
      'NEW SETTING — loot announcement position (Top / Middle / Bottom) and layout (Straight line or Arc)',
      'Damage numbers toggle now notes the colours: red hits, yellow crits, green healing'
    ]
  },
  {
    v: 'v0.6.2-alpha', date: 'July 2026',
    notes: [
      'NEW ENEMY — the TREASURE GOBLIN: a gold-pulsing imp with a chest on its back and ~10x a normal monster\'s life. It never attacks and flees once struck, spilling a coin every 2s while you give chase (it stops dripping if it stops or dies). Slay it for a burst of gold (3x a chest), 1-3 random gems, and a rare shot at damage gear',
      'Combat numbers recoloured: RED normal hits, YELLOW crits, GREEN healing',
      'Elites now read at a glance — normal elites glow YELLOW, rare elites glow PURPLE (and hit harder with better loot); bosses keep their orange aura',
      'Legendary drops fire an ORANGE pillar of light (+ orange star on the minimap); Set drops fire a GREEN pillar (+ green star)'
    ]
  },
  {
    v: 'v0.6.1-alpha', date: 'July 2026',
    notes: [
      'Campfire roster reworked: the fire sits dead-centre with one hero standing behind it (raised & smaller for depth). Tap a hero to select it — its name & level appear at the bottom with a green pulsing ▶ PLAY button. Removed the per-hero ✕ and the Title button',
      'Retiring a hero is now a deliberate flow: tap "☠ Delete Hero" (lower-left), pick a hero, then confirm "Are you sure? :(" — YES retires, NO keeps'
    ]
  },
  {
    v: 'v0.6.0-alpha', date: 'July 2026',
    notes: [
      'Character stats now track "Story acts finished" (out of 100 planned) instead of "Lands cleared"'
    ]
  },
  {
    v: 'v0.5.9-alpha', date: 'July 2026',
    notes: [
      'The character sheet now has a "⌂ CAMPFIRE — CHANGE HERO" button — leave to the campfire roster to switch to another Nekromancer or create a new one, without restarting'
    ]
  },
  {
    v: 'v0.5.8-alpha', date: 'July 2026',
    notes: [
      'The buyable space upgrade is your INVENTORY (the bag that fills from combat loot & crafting) — the EXPAND button now lives in the Inventory screen, not the Stash, so it is never confused with the shared vault'
    ]
  },
  {
    v: 'v0.5.7-alpha', date: 'July 2026',
    notes: [
      'NEW — up to THREE characters at once. No more deleting a hero to make room. Pick "Choose Your Hero" on the title screen',
      'NEW — a CAMPFIRE roster scene: your Nekromancers stand around a crackling fire (one behind it, two to the sides), drawn in pseudo-3D with warm firelight instead of a list of buttons. Tap a hero to play, tap an empty spot to create one, tap the ✕ to retire one. The Stash is shared across all your heroes',
      'NEW — buy INVENTORY space from the Inventory screen: 24 → 30 → 45 → 60 → 75 → 90 → 105 → 120 slots for escalating gold (1k · 10k · 50k · 150k · 500k · 1m · 100m)'
    ]
  },
  {
    v: 'v0.5.6-alpha', date: 'July 2026',
    notes: [
      'NEW — CHARACTER CREATION: starting a new Nekromancer now lets you NAME your hero and choose your glowing-eye colour (green, yellow, red, blue, cyan, white, black, purple or pink). Your name shows in camp and on the character sheet',
      'Map edges no longer end in a solid wall — they now dissolve into FOG with a distant skyline beyond (forest, mountains, ocean or snow by land), so every place feels far bigger than its walkable bounds',
      'Wood/Iron/Nephalem torches now STACK — a whole pile of one type takes a single Stash slot (×count), not one slot each. Torches no longer show "lvl undefined" and are never rated as your best/worst gear',
      'Gems now STACK in the socket picker — "Perfect ×12" on one chip instead of a dozen identical chips',
      'Fixed the Stash search box overlapping the category filters on phones (two tidy rows now)',
      'Fixed long land names overflowing the on-screen banner on phones (auto-shrinks to fit)',
      'Tapping a filled loadout slot now names its skill in the footer, so you don\'t have to hunt for it in the grid'
    ]
  },
  {
    v: 'v0.5.5-alpha', date: 'July 2026',
    notes: [
      'BUGFIX — vendor (and any) item prices could read “NaN g”. Items that rolled Armor, Movement Speed, Death Nova or Area Damage had no value weight, poisoning the price with NaN. Every affix is now weighted and guarded so a price can never be NaN again',
      'Crypts and other indoor areas now always have a cold STONE floor — never a grass/sand/biome ground stamped underground'
    ]
  },
  {
    v: 'v0.5.4-alpha', date: 'July 2026',
    notes: [
      'Fixed the ugly tiled/grid look of the ground — the terrain texture is now a large SEAMLESS tile (every blotch wraps across the edges), so every land reads as one continuous, flowing biome instead of stamped squares'
    ]
  },
  {
    v: 'v0.5.3-alpha', date: 'July 2026',
    notes: [
      'DEV legendary-grant buttons reordered by Act: Royal Grandeur (A1) · Bloodtide (A2) · Cycle Scythe (A3)'
    ]
  },
  {
    v: 'v0.5.2-alpha', date: 'July 2026',
    notes: [
      'DEV panel now also grants The Royal Grandeur (Act 1) ring — the legendary-grant row is now three buttons: Bloodtide (A2), Cycle Scythe (A3) and Royal Grandeur (A1), each sent to your Stash at level 70'
    ]
  },
  {
    v: 'v0.5.1-alpha', date: 'July 2026',
    notes: [
      'NEW LEGENDARY — Bloodtide Blade (2-H Scythe): Death Nova deals +400% damage for every enemy within 25 yards, up to 10. Carries its authentic lvl-70 stat block (Vitality/Intelligence/elemental damage). Will drop from the Act 2 boss (not yet implemented)',
      'NEW LEGENDARY — Scythe of the Cycle (1-H Scythe): your Secondary skills deal +400% damage while Bone Armor is active, but each such cast burns 4 seconds off Bone Armor. Will drop from the Act 3 boss (not yet implemented)',
      'Both blades are grantable now from the DEV panel (two ⚔ buttons) — sent to your Stash at level 70 stats',
      'D3 stats the engine does not model yet (Vitality, Intelligence, elemental damage, attack speed) are shown on the items as their authentic lvl-70 numbers'
    ]
  },
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
  heartstring: { name: 'Nephalem Heartstring',  color: '#b06adf' },
  wyrmscale:   { name: 'Wyrm Scale',            color: '#4ea3c0' },   // roaming Wyrm boss (12%)
  brain:       { name: 'Gluttonous Brain',      color: '#d0708c' },   // Gluttonous Brain ogre boss (10%)
  rathmasoul:  { name: 'Soul of Rathma',        color: '#c88bf0' }    // rare caves + Rathma assassin (20%, 1–3)
};

// Torches — a consumable equipped in the Torch slot that lights the darkness
// for a real-time duration, then burns out. Crafted at the Blacksmith.
// Each torch carries a display tier (name + colour) since the ladder — Common,
// Uncommon, Magic, Rare, Epic, Legendary — is finer than the gear rarity list.
// `rarity` is the numeric order (sorting); `tier`/`tierColor` drive the label.
const TORCH_TYPES = {
  wood:        { name: 'Wood Torch',           minutes: 12,  radius: 60,  color: '#ffb24a', rarity: 0, tier: 'Common',    tierColor: '#c9bfa8', recipe: { lumber: 10 } },
  iron:        { name: 'Iron Torch',           minutes: 37,  radius: 110, color: '#ffcf6a', rarity: 1, tier: 'Uncommon',  tierColor: '#4ade80', recipe: { lumber: 10, rivets: 15 } },
  wyrmbound:   { name: 'Wyrm-bound Torch',     minutes: 55,  radius: 180, color: '#7fe0ff', rarity: 2, tier: 'Magic',     tierColor: '#6a9aff', recipe: { lumber: 5, rivets: 10, wyrmscale: 5 } },
  nephalem:    { name: 'Nephalem Torch',       minutes: 75,  radius: 250, color: '#d8b4f0', rarity: 3, tier: 'Rare',      tierColor: '#ffd76a', recipe: { lumber: 15, rivets: 30, heartstring: 3 } },
  masterlight: { name: "Master's Light Torch", minutes: 110, radius: 350, color: '#ffe6a0', rarity: 4, tier: 'Epic',      tierColor: '#b06adf', recipe: { rivets: 50, heartstring: 5, brain: 1 } },
  nekromancer: { name: "Nekromancer's Torch",  minutes: 180, radius: 500, color: '#c58bff', rarity: 5, tier: 'Legendary', tierColor: '#ff8c2a', recipe: { rathmasoul: 3 } }
};
// The lit/reveal radius (px) with no torch at all — deliberately tiny so the
// dark presses right in until you craft one. Torches widen it (see TORCH_TYPES).
const NO_TORCH_RADIUS = 20;

// --------------------------------- gems ------------------------------------

// 13-tier gem ladder (owner art set). Perfect (index 2) is the threshold for the
// apex gem perks (+20% damage in any slot, etc.); Marquise (index 12) is the top.
const GEM_TIERS = [
  'Chipped', 'Flawless', 'Perfect', 'Square', 'Flawless Square', 'Brilliant Square',
  'Star', 'Flawless Star', 'Radiant Star', 'Imperial', 'Flawless Imperial',
  'Royal Imperial', 'Marquise'
];
const GEM_PERFECT_TIER = 2;               // 'Perfect' — apex-perk threshold
const GEM_MAX_TIER = GEM_TIERS.length - 1; // 'Marquise' — top of the ladder

// Per-difficulty gem drop distribution (owner-tuned). Row = difficulty index
// (0 Normal … 3 Master, 4 Torment I … 19 Torment XVI). 14 columns, as percents:
//   [None, Chipped, Flawless, Perfect, Square, Flawless Square, Brilliant Square,
//    Star, Flawless Star, Radiant Star, Imperial, Flawless Imperial, Royal Imperial,
//    Marquise]. Column 0 = "no gem"; columns 1–13 map to tiers 0–12. Each row
//    sums to 100. Edit these rows to retune what gems drop where.
const GEM_DROP_TABLE = [
  [50, 50,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Normal
  [25, 25, 50,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Hard
  [25, 25, 25, 25,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Expert
  [15, 20, 25, 25, 15,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Master
  [10, 15, 25, 25, 25,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Torment I
  [ 8, 12, 25, 25, 30,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Torment II
  [ 5,  5, 20, 30, 30, 10,  0,  0,  0,  0,  0,  0,  0,  0],  // Torment III
  [ 3,  0, 10, 15, 30, 27, 15,  0,  0,  0,  0,  0,  0,  0],  // Torment IV
  [ 2,  0,  0,  0, 35, 35, 28,  0,  0,  0,  0,  0,  0,  0],  // Torment V
  [ 2,  0,  0,  0, 33, 37, 28,  0,  0,  0,  0,  0,  0,  0],  // Torment VI
  [ 2,  0,  0,  0, 31, 39, 28,  0,  0,  0,  0,  0,  0,  0],  // Torment VII
  [ 2,  0,  0,  0, 29, 37, 32,  0,  0,  0,  0,  0,  0,  0],  // Torment VIII
  [ 2,  0,  0,  0, 20, 35, 40,  3,  0,  0,  0,  0,  0,  0],  // Torment IX
  [ 2,  0,  0,  0, 10, 30, 50,  8,  0,  0,  0,  0,  0,  0],  // Torment X
  [ 1,  0,  0,  0,  0, 20, 30, 40,  5,  4,  0,  0,  0,  0],  // Torment XI
  [ 1,  0,  0,  0,  0,  0, 35, 45, 10,  5,  3,  1,  0,  0],  // Torment XII
  [ 1,  0,  0,  0,  0,  0, 10, 50, 20, 10,  6,  3,  0,  0],  // Torment XIII
  [ 1,  0,  0,  0,  0,  0,  0, 15, 25, 30, 20,  7,  2,  0],  // Torment XIV
  [ 0,  0,  0,  0,  0,  0,  0,  0, 10, 20, 40, 15, 10,  5],  // Torment XV
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0, 10, 20, 30, 30, 10]   // Torment XVI
];

// Each gem grants TWO stats (owner spec). GEM_TYPES[type].keys names them;
// GEM_STATS[type][tier] = [valueA, valueB]. Percent-style values are stored as
// fractions (0.02 = 2%). Stat keys:
//   flatDmg (+N damage) · xp (+% experience, ×0.1 at level 70) ·
//   critDmg (+% crit damage) · gold (+% gold find) · lph (life per hit) ·
//   hp (+life) · rcr (-% resource cost) · resAll (+all-element resist) ·
//   cdr (-% cooldowns)
const GEM_TYPES = {
  ruby:     { name: 'Ruby',     color: '#e04a5a', keys: ['flatDmg', 'xp'] },
  emerald:  { name: 'Emerald',  color: '#4ade80', keys: ['critDmg', 'gold'] },
  amethyst: { name: 'Amethyst', color: '#b06adf', keys: ['lph', 'hp'] },
  topaz:    { name: 'Topaz',    color: '#ffd76a', keys: ['rcr', 'gold'] },
  diamond:  { name: 'Diamond',  color: '#bfe8f4', keys: ['resAll', 'cdr'] }
};
const GEM_STATS = {
  // Each gem's "combine-worthy" stat is anchored at its ORIGINAL Marquise value
  // and steps DOWN 33.3% per tier (= ×1.5 per tier going up). So every tier is a
  // little better than the one below — combining 3→1 gives a gem better than a
  // single lower gem (it need not beat all three). Values stay sane, no huge
  // numbers. The tripled stat is the one that ISN'T balance-capped:
  //   Ruby → Damage · Emerald → Crit Damage · Amethyst → Life-per-Hit ·
  //   Diamond → All-Resist · Topaz → Gold (its Resource-Cost primary caps at 60%).
  // The other stat on each gem stays on its gentle ladder.
  ruby:     [[6, .03], [9, .05], [13, .06], [20, .09], [29, .10], [44, .12], [66, .15], [99, .16], [148, .17], [222, .20], [333, .22], [500, .25], [750, .30]],
  emerald:  [[.023, .02], [.035, .03], [.052, .04], [.078, .06], [.117, .09], [.176, .12], [.263, .15], [.395, .18], [.593, .21], [.889, .25], [1.333, .28], [2.0, .31], [3.0, .35]],
  amethyst: [[10, 10], [21, 30], [44, 60], [93, 100], [196, 200], [412, 500], [866, 700], [1822, 900], [3832, 1500], [8059, 3000], [16952, 7000], [35657, 15000], [75000, 30000]],
  topaz:    [[.01, .019], [.03, .029], [.05, .043], [.07, .065], [.09, .098], [.11, .146], [.13, .219], [.15, .329], [.17, .494], [.19, .741], [.21, 1.111], [.22, 1.667], [.22, 2.5]],
  diamond:  [[10, .012], [17, .016], [28, .02], [47, .035], [79, .05], [133, .07], [224, .09], [375, .11], [630, .13], [1057, .17], [1775, .19], [2979, .20], [5000, .25]]
};

// Most gem slots an item can hold, by rarity (Mystic enchants can uncover them):
// Common 0 · Magic 1 · Rare 2 · Epic 3 · Legendary 4 · Set 4 · Artifact 4.
const MAX_SOCKETS = [0, 1, 2, 3, 4, 4, 4];

// The two stats a gem grants, as a { key: value } object.
function gemStats(gem) {
  const keys = GEM_TYPES[gem.type].keys;
  const row = GEM_STATS[gem.type][clamp(gem.tier, 0, GEM_MAX_TIER)];
  return { [keys[0]]: row[0], [keys[1]]: row[1] };
}

// Primary stat value — a single number for scoring / sorting / vendor price.
function gemStatValue(gem) {
  return GEM_STATS[gem.type][clamp(gem.tier, 0, GEM_MAX_TIER)][0];
}

// One-line human-readable descriptions of a gem's two stats.
const GEM_STAT_LABELS = {
  flatDmg: v => '+' + Math.round(v) + ' Damage',
  xp:      v => '+' + Math.round(v * 100) + '% XP',
  critDmg: v => '+' + Math.round(v * 100) + '% Crit Dmg',
  gold:    v => '+' + Math.round(v * 100) + '% Gold',
  lph:     v => '+' + Math.round(v) + ' Life/Hit',
  hp:      v => '+' + Math.round(v) + ' Life',
  rcr:     v => '-' + Math.round(v * 100) + '% Resource Cost',
  resAll:  v => '+' + Math.round(v) + ' All Resist',
  cdr:     v => '-' + (+(v * 100).toFixed(1)) + '% Cooldowns'
};
function gemStatText(gem) {
  return Object.entries(gemStats(gem)).map(([k, v]) => GEM_STAT_LABELS[k](v)).join('  ·  ');
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
  desc: 'Requires a Master Nephalem Rift Key — slay Nephalem Rift Guardians to earn one. Gather 1000 points across the linked maps, then claim all six pieces of the Grace of Inarius.'
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
    slot: 'weapon', name: 'Bloodtide Blade', exclusive: true,
    affixes: { dmg: 1.25, hp: 1050, dnova: 0.50, crit: 0.06 },
    desc: 'Death Nova deals +400% damage for every enemy within 25 yards (up to 10). Drops from the Act 2 boss',
    flavorLines: [
      '2-H Scythe · 1687.4 DPS · 1461–1607 dmg · 1.10 aps (lvl 70)',
      '+946–1125 Vitality · +946–1125 Intelligence',
      '+(1177–1439)–(1410–1788) elemental Damage (one of 7)'
    ]
  },
  cycleScythe: {
    slot: 'weapon', name: 'Scythe of the Cycle', exclusive: true,
    affixes: { dmg: 0.95, crit: 0.06, hp: 320 },
    desc: 'Secondary skills deal +400% damage while Bone Armor is active, but each such cast cuts 4s from Bone Armor. Drops from the Act 3 boss',
    flavorLines: [
      '1-H Scythe · 461.5 DPS · 249–461 dmg · 1.30 aps (lvl 70)',
      '+626–750 Intelligence',
      '+(981–1199)–(1175–1490) elemental Damage (one of 7)'
    ]
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

// Named build-defining legendaries that ALSO seep into the wild loot pool at
// Torment (owner spec): a 10% slice of wild drops in T1–T16 is one of these,
// its tier scaling legendary→artifact with the Torment level. (They still drop
// from their dedicated sources too — Act bosses, Rift Guardians.)
const WILD_POWER_KEYS = ['funeraryPick', 'ironRose', 'coe', 'krysbin', 'bloodtide', 'cycleScythe', 'royalGrandeur'];

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

// Mystic reroll GROUPS (owner rule): a rerolled property can only become
// another property in its OWN group, so the player always knows the exact
// odds — enchanting is a targeted choice, not a slot machine. `dnova`/`area`
// are signature legendary affixes and belong to no group (never rerollable).
const AFFIX_GROUPS = {
  offense: ['dmg', 'crit', 'ess'],   // damage, crit chance, essence/s
  defense: ['hp', 'armor', 'reg'],   // life, armor, life/s
  utility: ['gold', 'move']          // gold find, movement (move is boots-only)
};
const AFFIX_GROUP_NAME = { offense: 'Offense', defense: 'Defense', utility: 'Utility' };
function affixGroup(key) {
  for (const g in AFFIX_GROUPS) if (AFFIX_GROUPS[g].includes(key)) return g;
  return null;
}

// Hard per-affix ceilings for the TOP tier — Artifact 5★ (owner-specified).
// Every affix on any item is clamped to AFFIX_CAP × affixTierFrac(rarity,stars),
// and the Mystic reroll range reflects the same cap, so an item's value can
// never exceed the max the Mystic shows.
const AFFIX_CAP = {
  dmg: 20.0,      // 2000% damage
  crit: 10.0,     // 1000% crit chance
  gold: 60.0,     // 6000% gold find
  hp: 20000,      // 20000 life
  reg: 450,       // 450 life/s
  ess: 200,       // 200 essence/s
  armor: 10000,   // 10000 armor
  move: 0.25,     // 25% movement (boots)
  dnova: 6.0, area: 1.5   // signature affixes — generous
};
// Fraction of the Artifact-5★ ceiling a given rarity/star tier can reach (so a
// legendary can't roll artifact-grade numbers). Artifact 5★ = 1.0.
function affixTierFrac(rarity, stars) {
  const base = [0.12, 0.18, 0.26, 0.40, 0.58, 0.70, 0.80][rarity];
  return clamp((base === undefined ? 0.12 : base) + (stars || 0) * 0.04, 0.05, 1.0);
}

const LEGENDARY_PREFIX = ["Maltorius'", "The Widow's", "Rathma's", "Xul's", "Trag'Oul's", "Mendeln's"];
const EPIC_PREFIX = ['Fabled', 'Mythic', 'Hallowed', 'Abyssal', 'Deathless', 'Umbral'];
const RARE_PREFIX = ['Cruel', 'Vicious', 'Dread', 'Baleful', 'Sinister', 'Woeful'];
const MAGIC_PREFIX = ['Sturdy', 'Sharp', 'Grim', 'Cold', 'Hungry', 'Pale'];

// ----------------------------- skill catalog -------------------------------
// The authentic D3 Necromancer actives with their real unlock levels.
// Categories: primary, secondary, blood (Blood & Bone), curse, corpse, reanim.
// Behavior functions live in skills.js keyed by id.

const SKILL_DATA = [
  { id: 'boneSpikes',      name: 'Bone Spikes',       cat: 'primary',   lvl: 1,  cost: 0,  gain: 18, cd: 0 },
  { id: 'boneSpear',       name: 'Bone Spear',        cat: 'secondary', lvl: 2,  cost: 20, cd: 2 },
  { id: 'grimScythe',      name: 'Grim Scythe',       cat: 'primary',   lvl: 3,  cost: 0,  gain: 12, cd: 0.4 },
  { id: 'corpseExplosion', name: 'Corpse Explosion',  cat: 'corpse',    lvl: 4,  cost: 8,  cd: 3 },
  { id: 'skeletalMage',    name: 'Skeletal Mage',     cat: 'secondary', lvl: 19, cost: 40, cd: 10 },
  { id: 'corpseLance',     name: 'Corpse Lance',      cat: 'corpse',    lvl: 28, cost: 15, cd: 0.5 },
  { id: 'commandSkeletons',name: 'Command Skeletons', cat: 'reanim',    lvl: 9,  cost: 50, cd: 25 },
  { id: 'siphonBlood',     name: 'Siphon Blood',      cat: 'primary',   lvl: 11, cost: 0,  gain: 4,  cd: 0.16, channel: true },
  { id: 'deathNova',       name: 'Death Nova',        cat: 'secondary', lvl: 12, cost: 20, cd: 1 },
  { id: 'commandGolem',    name: 'Command Golem',     cat: 'reanim',    lvl: 13, cost: 0,  cd: 30 },
  { id: 'decrepify',       name: 'Decrepify',         cat: 'curse',     lvl: 14, cost: 10, cd: 1 },
  { id: 'devour',          name: 'Devour',            cat: 'corpse',    lvl: 16, cost: 0,  cd: 1.5 },
  { id: 'boneArmor',       name: 'Bone Armor',        cat: 'blood',     lvl: 17, cost: 10, cd: 10 },
  { id: 'leech',           name: 'Leech',             cat: 'curse',     lvl: 24, cost: 10, cd: 1 },
  { id: 'armyOfTheDead',   name: 'Army of the Dead',  cat: 'reanim',    lvl: 22, cost: 0,  cd: 60 },
  { id: 'revive',          name: 'Revive',            cat: 'corpse',    lvl: 22, cost: 25, cd: 60 },
  { id: 'bloodRush',       name: 'Blood Rush',        cat: 'blood',     lvl: 27, cost: 0,  cd: 8,  charges: 1, metabolismCharges: 2 },
  { id: 'frailty',         name: 'Frailty',           cat: 'curse',     lvl: 30, cost: 10, cd: 1 },
  { id: 'boneSpirit',      name: 'Bone Spirit',       cat: 'blood',     lvl: 34, cost: 0,  cd: 25, charges: 3 },
  { id: 'landOfTheDead',   name: 'Land of the Dead',  cat: 'reanim',    lvl: 38, cost: 0,  cd: 120 },
  { id: 'simulacrum',      name: 'Simulacrum',        cat: 'blood',     lvl: 61, cost: 0,  cd: 120 }
];

const SKILL_CATS = {
  primary:   { name: 'Primary',      color: '#c9bfa8' },
  secondary: { name: 'Secondary',    color: '#e8e0cc' },
  blood:     { name: 'Blood & Bone', color: '#e04a5a' },
  curse:     { name: 'Curses',       color: '#b06adf' },
  corpse:    { name: 'Corpses',      color: '#ffb43a' },
  reanim:    { name: 'Reanimation',  color: '#6ff7c3' }
};

// The 6-slot action bar is CATEGORY-LOCKED: slot i holds a skill of LOADOUT_CATS[i].
// Order (and the per-category skill order) matches the owner's skill table.
const LOADOUT_CATS = ['primary', 'secondary', 'corpse', 'reanim', 'curse', 'blood'];
const CAT_SKILLS = {
  primary:   ['boneSpikes', 'grimScythe', 'siphonBlood'],
  secondary: ['boneSpear', 'deathNova', 'skeletalMage'],
  corpse:    ['corpseExplosion', 'devour', 'revive', 'corpseLance'],
  reanim:    ['commandSkeletons', 'commandGolem', 'armyOfTheDead', 'landOfTheDead'],
  curse:     ['decrepify', 'leech', 'frailty'],
  blood:     ['boneArmor', 'bloodRush', 'boneSpirit', 'simulacrum']
};

// Character-level a skill's 5 non-base runes unlock at (owner's table), applied
// by position: index 0 of each SKILL_RUNES list is the always-free 'No Rune'.
const RUNE_UNLOCKS = {
  boneSpikes: [6, 12, 18, 24, 30],   grimScythe: [9, 14, 21, 27, 33],   siphonBlood: [17, 23, 35, 47, 54],
  boneSpear: [7, 13, 19, 26, 32],    deathNova: [18, 23, 35, 48, 57],   skeletalMage: [24, 29, 36, 44, 55],
  corpseExplosion: [10, 16, 22, 28, 34], devour: [21, 27, 33, 42, 59],  revive: [26, 31, 38, 49, 58],
  corpseLance: [33, 39, 46, 52, 60], commandSkeletons: [19, 25, 31, 37, 43], commandGolem: [18, 24, 29, 36, 53],
  armyOfTheDead: [34, 40, 45, 51, 58], landOfTheDead: [43, 47, 52, 56, 61], decrepify: [20, 26, 41, 50, 57],
  leech: [29, 34, 39, 46, 54],       frailty: [35, 40, 45, 49, 60],     boneArmor: [22, 28, 34, 41, 59],
  bloodRush: [32, 37, 44, 50, 56],   boneSpirit: [39, 45, 51, 55, 60],  simulacrum: [62, 63, 64, 65, 66]
};
for (const id in RUNE_UNLOCKS) {
  const list = SKILL_RUNES[id];
  if (list) RUNE_UNLOCKS[id].forEach((lv, i) => { if (list[i + 1]) list[i + 1].lvl = lv; });
}

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
  // Treasure Goblin: never attacks, flees once hit, ~10x a normal monster's
  // life, spills gold while chased and bursts loot on death.
  goblin:   { name: 'Treasure Goblin', hp: 50, speed: 178, dmg: 0, r: 16, xp: 40, atkRange: 0, atkCd: 99, goblin: true, hpMul: 10 },
  // Story Mode bosses: the 10 named legendary ghost lords, then the King.
  wraith:   { name: 'Vengeful Wraith', hp: 240, speed: 78, dmg: 21, r: 22, xp: 130, atkRange: 44, atkCd: 1.6, boss: true, ghost: true },
  skeletonking: { name: 'The Skeleton King', hp: 520, speed: 54, dmg: 30, r: 30, xp: 240, atkRange: 54, atkCd: 1.8, boss: true },
  // Act III finale — a colossal burrowing desert serpent.
  sandwyrm: { name: 'The Sand Wyrm', hp: 640, speed: 60, dmg: 34, r: 34, xp: 300, atkRange: 60, atkCd: 1.7, boss: true },
  // --- Phase-2 reagent bosses ------------------------------------------------
  // The Bonewyrm roams eligible modes and drops Wyrm Scales (12%).
  wyrm:    { name: 'The Bonewyrm',         hp: 720, speed: 66, dmg: 34, r: 34, xp: 340, atkRange: 60, atkCd: 1.7,
             boss: true, roamBoss: true, dropMat: 'wyrmscale', dropChance: 0.12, dropN: [1, 1] },
  // A huge, huge, HUGE fat ogre: vomits AoE, summons fat zombies, chain-pulls
  // and stuns, and enrages at half health. Drops Gluttonous Brain (10%).
  glutton: { name: 'The Gluttonous Brain', hp: 980, speed: 30, dmg: 30, r: 44, xp: 440, atkRange: 64, atkCd: 2.0,
             boss: true, roamBoss: true, enrageAt: 0.5, enrageDmg: 0.15, enrageHp: 0.10,
             dropMat: 'brain', dropChance: 0.10, dropN: [1, 1] },
  // Rathma's Chosen: a tall, slender assassin who stealths (goes to smoke) while
  // you damage it, enrages at 35%, and drops 1-3 Souls of Rathma (20%).
  rathma:  { name: "Rathma's Chosen",      hp: 150, speed: 150, dmg: 26, r: 15, xp: 320, atkRange: 34, atkCd: 1.0,
             lunges: true, rareBoss: true, stealth: true, enrageAt: 0.35, enrageHp: 0.20, enrageDmg: 0.25,
             dropMat: 'rathmasoul', dropChance: 0.20, dropN: [1, 3] }
};

// Purchasable bag expansions. The bag starts at 24; each upgrade adds space
// for escalating gold (owner rule): 24 → 30 → 45 → 60 → 75 → 90 → 105 → 120.
// Each upgrade adds a bigger jump than the last: +50, +150, +250, +350 … from
// the base 24 (owner rule).
const BAG_UPGRADES = [
  { size: 74,   cost: 1000 },
  { size: 224,  cost: 10000 },
  { size: 474,  cost: 50000 },
  { size: 824,  cost: 150000 },
  { size: 1274, cost: 500000 },
  { size: 1824, cost: 1000000 },
  { size: 2474, cost: 100000000 }
];

// Glowing-eye colours offered at character creation.
const EYE_COLORS = [
  { name: 'Green',  hex: '#6ff7c3' },
  { name: 'Yellow', hex: '#ffd84a' },
  { name: 'Red',    hex: '#ff5a4a' },
  { name: 'Blue',   hex: '#5aa0ff' },
  { name: 'Cyan',   hex: '#4ee0e0' },
  { name: 'White',  hex: '#f4f0e6' },
  { name: 'Black',  hex: '#2a2a30' },
  { name: 'Purple', hex: '#b06adf' },
  { name: 'Pink',   hex: '#ff8fd0' }
];

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
    sizeMul: 1.0, rivers: 1, forest: true, edge: 'forest',
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
    sizeMul: 1.4, rivers: 0, forest: false, edge: 'mountain',
    desc: 'A vast burned waste of dunes, imps and buried idols.'
  },
  {
    id: 'marsh', name: 'The Blood Marsh', kind: 'open', mLvl: 16,
    ground: '#121a16', accent: '#2c4230', weather: 'rain',
    monsters: ['zombie', 'ghoul', 'ghoul', 'cultist', 'bloat', 'soldier', 'knight'],
    boss: 'Mother of Maggots', packs: 14,
    sizeMul: 1.2, rivers: 2, forest: true, edge: 'ocean',
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

// Torment tier (1–16) for a difficulty index, or 0 when below Torment
// (Normal/Hard/Expert/Master). Loot-tier gating keys off this.
function tormentTier(di) {
  const d = DIFFICULTIES[di != null ? di : (typeof Hero !== 'undefined' ? (Hero.difficulty || 0) : 0)];
  return d && d.torment ? d.torment : 0;
}

const XP_CURVE = lvl => Math.round(60 * Math.pow(lvl, 1.5));
const MAX_LEVEL = 70;

// ---------------------------------------------------------------- PARAGON
// Past level 70 the hero earns PARAGON levels (near-infinite); each grants one
// Nekromancer Point (NP) to spend across four trees. `per` = bonus per point,
// `max` = point cap (0 = infinite). Percentages are stored as fractions.
const PARAGON_CATS = ['Core', 'Offense', 'Defense', 'Utility'];
const PARAGON_STATS = {
  // Core
  vitality:     { cat: 'Core',    label: 'Vitality',           per: 0.02,  max: 0,   fmt: 'pct', note: 'Life' },
  intelligence: { cat: 'Core',    label: 'Intelligence',       per: 0.02,  max: 0,   fmt: 'pct', note: 'Damage' },
  moveSpeed:    { cat: 'Core',    label: 'Movement Speed',     per: 0.005, max: 200, fmt: 'pct', note: 'Move Speed' },
  maxMana:      { cat: 'Core',    label: 'Maximum Mana',       per: 0.02,  max: 200, fmt: 'pct', note: 'Max Essence' },
  // Offense
  attackSpeed:  { cat: 'Offense', label: 'Attack Speed',       per: 0.005, max: 200, fmt: 'pct', note: 'Attack Speed' },
  paraCritDmg:  { cat: 'Offense', label: 'Crit Hit Damage',    per: 0.002, max: 200, fmt: 'pct', note: 'Crit Damage' },
  paraCritChance:{ cat: 'Offense', label: 'Crit Hit Chance',   per: 0.005, max: 200, fmt: 'pct', note: 'Crit Chance' },
  paraCdr:      { cat: 'Offense', label: 'Cooldown Reduction', per: 0.005, max: 200, fmt: 'pct', note: 'Cooldowns' },
  // Defense
  paraArmor:    { cat: 'Defense', label: 'Armor',              per: 0.01,  max: 200, fmt: 'pct', note: 'Armor' },
  lifePct:      { cat: 'Defense', label: 'Life %',             per: 0.02,  max: 0,   fmt: 'pct', note: 'Life' },
  paraResAll:   { cat: 'Defense', label: 'All Resistance',     per: 0.005, max: 200, fmt: 'pct', note: 'Resist' },
  lifeRegen:    { cat: 'Defense', label: 'Life per Second',    per: 0.01,  max: 200, fmt: 'pct', note: 'Regen (of max Life/s)' },
  // Utility
  paraArea:     { cat: 'Utility', label: 'Area Damage',        per: 0.005, max: 200, fmt: 'pct', note: 'Area Damage' },
  paraLph:      { cat: 'Utility', label: 'Life per Hit',       per: 0.01,  max: 500, fmt: 'pct', note: 'Life on Hit (of max Life)' },
  paraRcr:      { cat: 'Utility', label: 'Resource Cost',      per: 0.005, max: 200, fmt: 'pct', note: 'Cost Reduction' },
  pickup:       { cat: 'Utility', label: 'Pickup Radius',      per: 0.002, max: 200, fmt: 'pct', note: 'Pickup Radius' }
};
// XP to earn the NEXT paragon level — a level-70's worth, creeping up per level.
const PARAGON_XP = plevel => Math.round(XP_CURVE(70) * (1 + plevel * 0.05));

// Rifts: filled by slaughter, capped by a Guardian.
//  - 'normal' rifts (levels 1–69): open to all; Guardians may drop Rift Keys.
//  - 'greater' Nephalem Rifts (level 70): cost a Rift Key; Guardians drop
//    Grace of Inarius pieces and legendary powers.
const RIFT_GUARDIANS = ['Blighter', 'The Choker', 'Bloodmaw', 'Sand Shaper', 'Erethon', 'Man Carver'];

// Rift point goals: gather purple orbs (10 pts each) from rare elites, then
// the Rift Guardian rises. normal 250 · Nephalem 750 · Master (Season) 1500.
const RIFT_GOALS = { normal: 250, greater: 750, season: 1000 };
const RIFT_NAMES = { normal: 'Rift', greater: 'Nephalem Rift', season: 'Master Nephalem Rift' };
// Season maps are now MEDIUM so you cycle through several via the entrance/exit
// links rather than roaming one giant map (owner rule).
const RIFT_TILES = { normal: 10, greater: 12, season: 5 };

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
              border: 'forest', edge: 'forest', weather: null, forest: true, rivers: 1,
              monsters: ['zombie', 'skeleton', 'ghoul', 'hound', 'archer'] },
  forest:   { name: 'Whispering Woods',   ground: '#132012', accent: '#2f5226', tree: 'pine',
              props: ['pine', 'pine', 'oak', 'rock'],         deco: ['grass', 'moss', 'moss', 'bones'],
              border: 'forest', edge: 'forest', weather: null, forest: true, rivers: 0,
              monsters: ['skeleton', 'archer', 'ghoul', 'hound', 'soldier'] },
  jungle:   { name: 'Tangled Jungle',     ground: '#0f2418', accent: '#2c6a3c', tree: 'palm',
              props: ['palm', 'palm', 'oak', 'rock'],         deco: ['grass', 'grass', 'moss'],
              border: 'jungle', edge: 'forest', weather: 'rain', forest: true, rivers: 1,
              monsters: ['ghoul', 'imp', 'cultist', 'hound', 'bloat'] },
  swamp:    { name: 'Sunken Mire',        ground: '#131a15', accent: '#2c3a2a', tree: 'tree',
              props: ['tree', 'tree', 'rock', 'tomb'],        deco: ['moss', 'grass', 'bones', 'blood'],
              border: 'forest', edge: 'ocean', weather: 'rain', forest: true, rivers: 2,
              monsters: ['zombie', 'ghoul', 'ghoul', 'cultist', 'bloat'] },
  desert:   { name: 'Scorched Dunes',     ground: '#241d10', accent: '#6a5326', tree: 'cactus',
              props: ['cactus', 'cactus', 'rock', 'obelisk'], deco: ['crack', 'rubble', 'bones'],
              border: 'mountain', edge: 'mountain', weather: 'wind', forest: false, rivers: 0,
              monsters: ['imp', 'imp', 'archer', 'cultist', 'soldier'] },
  badlands: { name: 'Broken Barrens',     ground: '#20180d', accent: '#4e3c22', tree: 'cactus',
              props: ['rock', 'rock', 'cactus', 'obelisk'],   deco: ['crack', 'rubble', 'rock'],
              border: 'cliff', edge: 'mountain', weather: 'wind', forest: false, rivers: 0,
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

// Act III biome order — the scorched barrens of the deep desert, where the
// Sand Wyrm sleeps beneath the dunes.
const STORY_ACT3_BIOMES = ['desert', 'badlands', 'desert', 'badlands', 'desert', 'badlands', 'desert', 'badlands', 'desert', 'desert'];

// Ten named legendary horrors that stalk the Act III desert lands.
const STORY_ACT3_NAMES = [
  'Qadeshi, the Dune Reaver',
  'Ashmaw, the Cinder Jackal',
  'Sethrahk, the Bone-Sand Priest',
  'Vetrannis, the Mirage Witch',
  'Khemet, the Scorched Warlord',
  'Nabu-Kesh, the Salt Revenant',
  'Zephrail, the Howling Djinn',
  'Ammit, the Devourer of Graves',
  'Ossuric, the Buried Colossus',
  'Serapha, the Glass Widow'
];

const STORY_KING_FLAVOR = '“You dare come to my grave? You will die!”';
const STORY_WYRM_FLAVOR = '“The sands have swallowed kings. They will swallow you.”';

// Every biome, and a rotation of finale bosses, so any Act (1–100) can be
// generated. Acts 1 and 3 are hand-authored below; the rest are themed
// procedurally off the act number so the journey always continues.
const STORY_BIOME_KEYS = ['grass', 'forest', 'jungle', 'swamp', 'desert', 'badlands'];
const STORY_FINAL_BOSSES = [
  { type: 'brute',        name: 'The Warden' },
  { type: 'wraith',       name: 'The Revenant Lord' },
  { type: 'skeletonking', name: 'The Bone Tyrant' },
  { type: 'sandwyrm',     name: 'The Dune Colossus' }
];

// A procedurally-themed Act for anything that isn't hand-authored (2, 4–100).
function makeGenericStoryZone(stage, act, final) {
  const fb = STORY_FINAL_BOSSES[act % STORY_FINAL_BOSSES.length];
  if (final) {
    const bk = STORY_BIOME_KEYS[(act + 5) % STORY_BIOME_KEYS.length];
    const B = BIOMES[bk];
    return {
      id: 'story' + act + '-grave', name: 'Act ' + act + ' · The Final Grave', kind: 'open', biome: bk,
      mLvl: clamp(Hero.level, 1, 70), ground: B.ground, accent: B.accent, weather: B.weather,
      monsters: B.monsters, boss: fb.name + ' of Act ' + act, bossType: fb.type,
      packs: 4, sizeMul: 0.6, forest: false, rivers: 0,
      story: true, storyAct: act, storyFinal: true,
      desc: 'The final battle of Act ' + act + '.'
    };
  }
  const bk = STORY_BIOME_KEYS[(stage + act) % STORY_BIOME_KEYS.length];
  const B = BIOMES[bk];
  const lord = STORY_GHOST_NAMES[(stage - 1 + act) % STORY_GHOST_NAMES.length];
  return {
    id: 'story' + act + '-' + stage, name: 'Act ' + act + ' · ' + B.name, kind: 'open', biome: bk,
    mLvl: clamp(Hero.level, 1, 70), ground: B.ground, accent: B.accent, weather: B.weather,
    monsters: B.monsters, boss: lord, bossType: 'wraith',
    packs: randInt(9, 13), sizeMul: rand(0.9, 1.35), forest: B.forest, rivers: B.rivers,
    story: true, storyAct: act, chapter: stage,
    desc: 'Chapter ' + stage + ' of Act ' + act + '.'
  };
}

// Build the zone for a Story-Mode stage of the given act. Each act is a short
// chain of 2–5 biome maps (each with its named boss); the LAST stage (`final`)
// is the act finale's grave arena.
function makeStoryZone(stage, act = 1, final = false) {
  if (act !== 1 && act !== 3) return makeGenericStoryZone(stage, act, final);
  if (act === 3) {
    if (final) {
      return {
        id: 'story3-grave', name: 'The Sunken Grave of the Sand Wyrm', kind: 'open', biome: 'desert',
        mLvl: clamp(Hero.level, 1, 70),
        ground: '#241b0e', accent: '#6a5326', weather: 'wind',
        monsters: ['imp', 'archer', 'cultist', 'soldier'],
        boss: 'The Sand Wyrm', bossType: 'sandwyrm',
        packs: 4, sizeMul: 0.65, forest: false, rivers: 0,
        story: true, storyAct: 3, storyFinal: true, kingFlavor: STORY_WYRM_FLAVOR,
        desc: 'A sunken bowl of shifting sand where the Sand Wyrm lies coiled.'
      };
    }
    const bk3 = STORY_ACT3_BIOMES[(stage - 1) % STORY_ACT3_BIOMES.length];
    const B3 = BIOMES[bk3];
    const horror = STORY_ACT3_NAMES[(stage - 1) % STORY_ACT3_NAMES.length];
    return {
      id: 'story3-' + stage, name: 'Act III · ' + B3.name, kind: 'open', biome: bk3,
      mLvl: clamp(Hero.level, 1, 70),
      ground: B3.ground, accent: B3.accent, weather: B3.weather,
      monsters: B3.monsters,
      boss: horror, bossType: 'wraith',
      packs: randInt(9, 13),
      sizeMul: rand(0.9, 1.35),
      forest: B3.forest, rivers: B3.rivers,
      story: true, storyAct: 3, chapter: stage,
      desc: 'Chapter ' + stage + ' of Act III — hunt ' + horror + ' across the dunes.'
    };
  }
  if (final) {
    return {
      id: 'story-grave', name: 'The Grave of the Skeleton King', kind: 'open', biome: 'badlands',
      mLvl: clamp(Hero.level, 1, 70),
      ground: '#1a1014', accent: '#4a2e3a', weather: 'wind',
      monsters: ['skeleton', 'skeleton', 'archer', 'soldier'],
      boss: 'Leoric, the Skeleton King', bossType: 'skeletonking',
      packs: 4, sizeMul: 0.6, forest: false, rivers: 0,
      story: true, storyAct: 1, storyFinal: true, kingFlavor: STORY_KING_FLAVOR,
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
    story: true, storyAct: 1, chapter: stage,
    desc: 'Chapter ' + stage + ' of Act I — hunt the ghost of ' + ghost + '.'
  };
}
