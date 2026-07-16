'use strict';
// ---------------------------------------------------------------------------
// Static game data: the Diablo 3 Nekromancer skill kit (real skills, real
// unlock levels), passives, equipment slots, rarities, affixes, gems,
// crafting materials, monsters and the lands of the campaign.
// ---------------------------------------------------------------------------

// ------------------------------ rarities -----------------------------------

// Indexes matter: 0 Common · 1 Magic (uncommon) · 2 Rare · 3 Epic ·
// 4 Legendary · 5 Set. Saves from before Epic existed are migrated on load.
// v1.7.8 (owner spec): THREE rarities stand ABOVE the Artifact, found only in
// the deep Forgotten Crypt — Relic (blue, Tier 201+), Ancient (teal, Tier
// 221+), Mythic (gold, Tier 243+). All three carry star tiers up to 5★.
const RARITIES = [
  { name: 'Common',    color: '#c9bfa8', mult: 1.0, salvage: 'parts',   salvageN: 2 },
  { name: 'Magic',     color: '#6a9aff', mult: 1.4, salvage: 'dust',    salvageN: 2 },
  { name: 'Rare',      color: '#ffd76a', mult: 1.9, salvage: 'crystal', salvageN: 1 },
  { name: 'Epic',      color: '#b06adf', mult: 2.3, salvage: 'crystal', salvageN: 2 },
  { name: 'Legendary', color: '#ff8c2a', mult: 2.7, salvage: 'soul',    salvageN: 1 },
  { name: 'Set',       color: '#4ade80', mult: 3.1, salvage: 'soul',    salvageN: 2 },
  { name: 'Artifact',  color: '#ff3b3b', mult: 3.9, salvage: 'soul',    salvageN: 3 },  // index 6, red
  { name: 'Relic',     color: '#3b8cff', mult: 5.0, salvage: 'soul',    salvageN: 5 },  // index 7, blue — beyond the Artifact
  { name: 'Ancient',   color: '#2fd4c0', mult: 6.2, salvage: 'soul',    salvageN: 7 },  // index 8, teal
  { name: 'Mythic',    color: '#ffcf3b', mult: 7.5, salvage: 'soul',    salvageN: 10 }  // index 9, gold — the summit
];

// Damage elements (owner: "elemental damage types"). Each hit carries one; the
// element tints its damage numbers and triggers an on-hit effect (see Enemy.hurt):
//   cold → chill/slow · fire → burning DoT · poison → poison DoT · lightning →
//   chance to shock (brief stun) · physical → the plain baseline (knockback only).
const ELEMENTS = {
  physical:  { name: 'Physical',  color: '#e8e0cc' },
  cold:      { name: 'Cold',      color: '#8fd3ff' },
  fire:      { name: 'Fire',      color: '#ff7a3a' },
  lightning: { name: 'Lightning', color: '#ffe66a' },
  poison:    { name: 'Poison',    color: '#8fdf4a' }
};
// A skill's BASE element (default physical). Death Nova is Poison, as in D3.
const SKILL_ELEMENT = { deathNova: 'poison' };
// Runes that CONVERT their skill's damage to another element. (Cold-themed runes
// already exist; fire/lightning/poison runes can be added later and just work.)
const RUNE_ELEMENT = {
  frostSpikes: 'cold', frostScythe: 'cold', crystallization: 'cold', deadCold: 'cold',
  iceGolem: 'cold', freezingGrasp: 'cold', frozenArmy: 'cold', frozenLands: 'cold'
};

// ------------------------- cosmetics & town quests -------------------------
// Pets & wings are pure cosmetics chosen at the Mystic; themes recolour the UI
// chrome (panel borders/titles/button borders). All persist on the hero (pets/
// wings) or in Settings (theme — account-wide).
const PETS = {
  skullWisp: { name: 'Skull Wisp',  desc: 'A faithful skull, wreathed in pale fire.' },
  boneRaven: { name: 'Bone Raven',  desc: 'A skeletal raven that rides your shoulder-wind.' },
  cryptCat:  { name: 'Crypt Cat',   desc: 'A grave-grey cat. It fears nothing.' },
  graveHound: { name: 'Grave Hound', desc: 'A loyal bone-grey dog. Best friend even in death.' },
  ghostMoth:  { name: 'Ghost Moth',  desc: 'A pale moth that drifts on grave-cold air.' },
  marrowImp:  { name: 'Marrow Imp',  desc: 'A tiny horned mischief, sworn to your shadow.' },
  tombToad:   { name: 'Tomb Toad',   desc: 'A squat toad that hops between the headstones.' }
};
const WINGS = {
  boneWings:   { name: 'Wings of Bone',  color: '#e8e0cc', glow: 'rgba(232,224,204,0.25)' },
  shadowWings: { name: 'Shadow Wings',   color: '#6b4a8f', glow: 'rgba(107,74,143,0.35)' },
  emberWings:  { name: 'Ember Wings',    color: '#ff8c2a', glow: 'rgba(255,140,42,0.35)' },
  // OWNER SPRITE WINGS (v1.7.11): 16 painted frames (docs/art/wings/imp0..15
  // .webp, spliced from the owner's 4×4 sheet, offline flat-black cutout +
  // per-frame recentering). `seq` is the flap order — the frames sorted by
  // wingspan and ping-ponged open↔closed — CROSS-FADED one into the next,
  // ALWAYS animating (owner rule), even standing still.
  impWings:    { name: 'Imp Wings',      color: '#b8452f', glow: 'rgba(184,69,47,0.35)',
    desc: 'Torn crimson devil-wings of bone and sinew, ever beating.',
    art: 'imp', frames: 16,
    seq: [12, 0, 4, 13, 1, 5, 14, 2, 15, 6, 3, 7, 8, 9, 10, 11,
          10, 9, 8, 7, 3, 6, 15, 2, 14, 5, 1, 13, 4, 0] }
};
// UI themes (owner art, v1.6.83): each theme carries its own PAINTED BUTTON
// PLATE (docs/art/ui/button_<plate>.webp — the owner's glow recolors) plus
// matching panel/title/button accent colors. Legacy ids 'arcane'/'royal'
// map to violet/ember in UI.theme().
const THEMES = {
  // 'Default' = the original untinted look (v1.6.96 owner rule: "no color
  // choice, just blank") — no plate glow recolor, plain panel greys.
  none:   { name: 'Default',    panel: '#4a4356', title: '#c9bfa8', btn: '#6b5f80', plate: null,
            desc: 'The original look — no color, just the dark.' },
  void:   { name: 'Void',       panel: '#5a3a7a', title: '#d8b4f0', btn: '#7a4a8f', plate: 'violet' },
  bone:   { name: 'Bone White', panel: '#6a655c', title: '#e8e2d0', btn: '#8a8478', plate: 'bone' },
  blood:  { name: 'Blood',      panel: '#7a3040', title: '#e8b0b8', btn: '#8a4550', plate: 'blood' },
  ocean:  { name: 'Ocean',      panel: '#2a4a7a', title: '#8fd0ff', btn: '#3a5a8f', plate: 'ocean' },
  jungle: { name: 'Jungle',     panel: '#2a6a30', title: '#a8e8b0', btn: '#3a7a45', plate: 'jungle' },
  ember:  { name: 'Ember',      panel: '#8a5a2a', title: '#ffcf8a', btn: '#8a6f4a', plate: 'ember' }
};
// Lukus, Bringer of Light — the knight quest-giver in New Haven.
// THE QUEST LINE (owner request): 500 sequential quests spanning character
// level 1→70 (quests 1–200) and then Paragon 1→1000 (quests 201–500).
// THE JOURNAL (owner rule): a character can carry up to QUEST_JOURNAL_MAX (7)
// accepted quests at once — Hero.journal = [{ idx, base }] (progress =
// counter() − base; milestone quests are ABSOLUTE — reach a level/paragon).
// Lukus offers quests in line order (abandoned ones come back first);
// Hero.questLine counts turn-ins (the ledger bar), Hero.questNext is the next
// fresh offer. Every 25th quest is a milestone, every 10th pays double + a
// gem. Generation is fully DETERMINISTIC (hashed by index) so a quest's
// target never changes between sessions or saves.
const QUEST_JOURNAL_MAX = 7;

// The repeatable deeds, each measured on a LIFETIME counter (progress =
// counter − base at accept, so re-accepting never grandfathers old work).
// NAMES (owner rules: no numbering like "Forged Anew VII" — quests deserve
// quest names): each template carries an OPENER pool and a CLOSER pool; the
// k-th occurrence takes openers[k % 8] + closers[floor(k/8) % 8], giving 64
// distinct natural names per deed — more than any deed ever repeats.
const QUEST_TEMPLATES = [
  { id: 'slay', min: 25, max: 2000,
    names: [['Cull', 'Reap', 'Silence', 'Scatter', 'Break', 'Fell', 'Purge', 'Quiet'],
            ['the Restless Dead', 'the Shambling Horde', 'the Graveborn', 'the Hungering Swarm',
             'the Risen Rabble', 'the Crawling Dark', 'the Unhallowed', "the Night's Legion"]],
    addy: ['Bleed', 'Hush', 'Drown', 'Erase', 'Smother', 'Sever', 'Gut', 'Undo'],
    desc: n => 'Slay ' + n.toLocaleString() + ' monsters anywhere in the wilds.', counter: () => Hero.totalKills || 0 },
  { id: 'elite', min: 4, max: 260,
    names: [['Hunt', 'Mark', 'Topple', 'Humble', 'Unmake', 'Stalk', 'Shatter', 'End'],
            ['the Champions', 'the Gilded Few', 'the Painted Terrors', 'the Warbands',
             'the Chosen Prey', 'the Crowned Beasts', 'the Boastful', 'the Marked Ones']],
    addy: ['Rob', 'Ambush', 'Outwit', 'Undercut', 'Blindside', 'Cheat', 'Skin', 'Fleece'],
    desc: n => 'Slay ' + n + ' elite (champion) monsters.', counter: () => Hero.eliteKills || 0 },
  { id: 'boss', min: 1, max: 50,
    names: [['Behead', 'Dethrone', 'Cast Down', 'Overthrow', 'Extinguish', 'Bury', 'Break', 'Unseat'],
            ['the Tyrants', 'the Deep Kings', 'the Crowned Horrors', 'the Old Masters',
             'the Throned Dead', 'the Dread Lords', 'the Pit Princes', 'the Named Evils']],
    addy: ['Shank', 'Swindle', 'Poison', 'Betray', 'Rot', 'Collect On', 'Cross', 'Ruin'],
    desc: n => 'Fell ' + n + (n > 1 ? ' bosses or unique monsters.' : ' boss or unique monster.'), counter: () => Hero.bossKills || 0 },
  { id: 'rift', min: 1, max: 25,
    names: [['Seal', 'Walk', 'Cleanse', 'Brave', 'Close', 'Storm', 'Chart', 'Empty'],
            ['the Breach', 'the Torn Sky', 'the Nephalem Depths', 'the Screaming Tear',
             'the Far Rifts', 'the Broken Veil', 'the Shifting Halls', 'the Pale Door']],
    addy: ['Raid', 'Pillage', 'Slip Through', 'Haunt', 'Scour', 'Prowl', 'Case', 'Vanish Into'],
    desc: n => 'Clear ' + n + ' Rift' + (n > 1 ? 's' : '') + ' of any kind.', counter: () => Hero.riftsCleared || 0 },
  { id: 'salvage', min: 6, max: 180,
    names: [['Feed', 'Stoke', 'Fill', 'Serve', 'Tend', 'Heap', 'Supply', 'Glut'],
            ['the Forge', 'the Hungry Anvil', 'the Scrap Pile', 'the Smelter',
             'the Coals', 'the Iron Maw', "the Breaker's Bench", 'the Furnace']],
    addy: ['Strip', 'Fence', 'Ransack', 'Shred', 'Melt Down', 'Cannibalize', 'Repossess', 'Divvy Up'],
    desc: n => 'Salvage ' + n + ' items into materials.', counter: () => Hero.salvagedCount || 0 },
  { id: 'combine', min: 3, max: 90,
    names: [['Cut', 'Fuse', 'Polish', 'Merge', 'Facet', 'Refine', 'Marry', 'Perfect'],
            ['the Stones', 'the Gleaming Shards', 'the Deep Colors', 'the Precious Things',
             "the Jeweler's Craft", 'the Brilliant Cuts', 'the Living Light', 'the Royal Facets']],
    addy: ['Steal', 'Hoard', 'Covet', 'Smuggle', 'Appraise', 'Pocket', 'Barter', 'Palm'],
    desc: n => 'Combine gems at the Jeweler ' + n + ' times.', counter: () => Hero.gemsCombined || 0 },
  { id: 'craft', min: 2, max: 70,
    names: [['Forge', 'Hammer', 'Temper', 'Shape', 'Strike', 'Work', 'Raise', 'Draw'],
            ['New Steel', 'the White Heat', 'the Anvil Song', 'Fresh Edges',
             "the Maker's Mark", 'Iron and Ash', "the Smith's Pride", "Tomorrow's Arms"]],
    addy: ['Commission', 'Requisition', 'Order Up', 'Procure', 'Demand', 'Acquire', 'Bespeak', 'Levy'],
    desc: n => 'Craft ' + n + ' item' + (n > 1 ? 's' : '') + ' (forge, torches or gems).', counter: () => Hero.itemsCrafted || 0 },
  { id: 'enchant', min: 1, max: 45,
    names: [['Reweave', 'Unpick', 'Twist', 'Rethread', 'Bend', 'Court', 'Tempt', 'Spin'],
            ['the Threads of Fate', 'the Hidden Weave', "Fortune's Loom", 'the Arcane Knots',
             'the Veiled Pattern', "Vessa's Craft", 'the Fateful Strands', 'the Old Magics']],
    addy: ['Bribe', 'Beguile', 'Coax', 'Charm', 'Con', 'Outbid', 'Haggle Over', 'Sweet-Talk'],
    desc: n => 'Reroll ' + n + ' propert' + (n > 1 ? 'ies' : 'y') + ' at the Mystic.', counter: () => Hero.enchantsDone || 0 },
  { id: 'chest', min: 3, max: 120,
    names: [['Crack', 'Plunder', 'Spring', 'Pry', 'Loot', 'Rifle', 'Unseal', 'Empty'],
            ['the Buried Chests', 'the Lost Caches', 'the Rusted Locks', 'the Forgotten Hoards',
             'the Grave Goods', 'the Hidden Troves', 'the Sealed Coffers', "the Wilds' Riches"]],
    addy: ['Burgle', 'Pickpocket', 'Liberate', 'Crowbar', 'Heist', 'Filch', 'Pilfer', 'Lift'],
    desc: n => 'Open ' + n + ' chests in the wilds.', counter: () => Hero.chestsOpened || 0 }
];

// The 20 milestones (every 25th quest) each get their OWN name — 8 across the
// level climb, 12 across the Paragon ascent (no numbering, owner rule).
const MILESTONE_NAMES = {
  level: ['The First Ascent', 'A Flame Kindled', 'The Broadening Road', 'Strength of the Grave',
          'The Deepening Dark', 'A Name Whispered', 'The Gathering Storm', 'The Summit of Flesh'],
  paragon: ['Beyond the Veil', 'The Endless Stair', 'Starlight and Bone', 'The Path of Renown',
            'A Thousand Steps', 'The Horizon Calls', 'Light Undying', 'The Great Work',
            'Crown of Ages', 'The Last Threshold', 'Apotheosis Rising', 'The Final Trial']
};

const QUEST_COUNT = 500;

// Quest i's unlock gate: quests 0–199 walk level 1→70, quests 200–499 walk
// Paragon (~3 → 1000).
function questGate(i) {
  return i < 200
    ? { kind: 'level',   at: Math.min(70, 1 + Math.floor(i * 70 / 200)) }
    : { kind: 'paragon', at: Math.max(1, Math.round((i - 199) * 1000 / 300)) };
}

// Shared, fully deterministic quest-line builder (Lukus AND Addy use it).
//  opts: count · salt (hash offset — 0 keeps Lukus's line byte-identical) ·
//  gateFor(i) · milestoneNames (null = no milestones, every slot is a deed) ·
//  addy (true = the rogue opener pools, so her names never collide with his).
function makeQuestLine(opts) {
  const salt = opts.salt || 0;
  const h = i => {
    let x = ((i + salt + 1) * 2654435761) >>> 0;
    x ^= x >>> 13; x = (x * 2246822519) >>> 0; x ^= x >>> 11;
    return x >>> 0;
  };
  // Pass 1 — deal deeds from a reshuffling bag (all 9 templates per bag, in a
  // hash-shuffled order) so every deed recurs evenly (safely under the 64
  // unique names each carries) and no deed floods a stretch of the line.
  const picks = [], totals = {};
  let bag = [];
  for (let i = 0; i < opts.count; i++) {
    if (opts.milestoneNames && i % 25 === 24) { picks.push(null); continue; }
    if (!bag.length) {
      bag = QUEST_TEMPLATES.slice();
      for (let j = bag.length - 1; j > 0; j--) {
        const r = h(i * 31 + j) % (j + 1);
        const tmp = bag[j]; bag[j] = bag[r]; bag[r] = tmp;
      }
    }
    const T = bag.shift();
    picks.push(T);
    totals[T.id] = (totals[T.id] || 0) + 1;
  }
  // Pass 2 — build the line. HARDER EVERY TIME (owner rule): a deed's k-th
  // recurrence climbs a geometric min→max curve over its total recurrences
  // (front-loaded via the 0.7 exponent), and is FORCED strictly above the
  // previous one — the same target can never appear twice for the same deed.
  const line = [], occ = {}, prevNeed = {};
  let msLevel = 0, msParagon = 0;
  for (let i = 0; i < opts.count; i++) {
    const gate = opts.gateFor(i);
    const lvlPhase = gate.kind === 'level';
    if (!picks[i]) {
      // Milestone: REACH a level / paragon (absolute progress, no base).
      const target = lvlPhase ? Math.min(70, gate.at + 2) : Math.min(1000, gate.at + 12);
      const name = lvlPhase
        ? opts.milestoneNames.level[msLevel++ % opts.milestoneNames.level.length]
        : opts.milestoneNames.paragon[msParagon++ % opts.milestoneNames.paragon.length];
      line.push({
        idx: i, tid: 'reach', abs: true, need: target, gate, name,
        desc: lvlPhase ? 'Reach level ' + target + '.' : 'Reach Renown ' + target + '.',
        counter: lvlPhase ? (() => Hero.level || 1) : (() => Hero.paragon || 0)
      });
      continue;
    }
    const T = picks[i];
    const k = occ[T.id] || 0; occ[T.id] = k + 1;
    const K = totals[T.id];
    let need = Math.round(T.min * Math.pow(T.max / T.min, K > 1 ? Math.pow(k / (K - 1), 0.7) : 1));
    if (need >= 200) need = Math.round(need / 25) * 25;
    else if (need >= 50) need = Math.round(need / 5) * 5;
    const prev = prevNeed[T.id] || 0;
    if (need <= prev) need = prev + (prev >= 200 ? 25 : prev >= 50 ? 5 : 1);
    need = Math.max(T.min, need);
    prevNeed[T.id] = need;
    // A real name of its own: openers × closers walked DIAGONALLY, so
    // successive recurrences vary both halves — unique for 64 recurrences.
    const A = opts.addy ? T.addy : T.names[0], B = T.names[1];
    const name = A[k % A.length] + ' ' + B[(k + Math.floor(k / A.length)) % B.length];
    line.push({ idx: i, tid: T.id, abs: false, need, gate, name, desc: T.desc(need), counter: T.counter });
  }
  return line;
}

const QUEST_LINE = makeQuestLine({ count: QUEST_COUNT, salt: 0, gateFor: questGate, milestoneNames: MILESTONE_NAMES });

// ADDY, QUEEN OF THE UNDERWORLD (owner request): 500 MORE quests, all for
// LEVEL 70 — her own ledger, dealt from the same deeds but under her own
// rogue names ("Shank the Tyrants", "Heist the Buried Chests"), no
// milestones, every deed strictly harder each time it returns.
const ADDY_QUEST_COUNT = 500;
const ADDY_QUEST_LINE = makeQuestLine({
  count: ADDY_QUEST_COUNT, salt: 7777,
  gateFor: () => ({ kind: 'level', at: 70 }),
  milestoneNames: null, addy: true
});

// Addy's DAILY — "The Queen's Errand", one per real-world day, deterministic
// by the date so everyone gets the same errand on the same day.
const DAILY_NEEDS = { slay: 300, elite: 25, boss: 5, rift: 3, salvage: 25, combine: 12, craft: 8, enchant: 5, chest: 20 };
function dailyDeed(dateKey) {
  let x = 0;
  for (let i = 0; i < dateKey.length; i++) x = (x * 131 + dateKey.charCodeAt(i)) >>> 0;
  const T = QUEST_TEMPLATES[x % QUEST_TEMPLATES.length];
  const need = DAILY_NEEDS[T.id];
  return { tid: T.id, need, name: "The Queen's Errand", desc: T.desc(need), counter: T.counter };
}

// Rewards are DETERMINISTIC PER QUEST (owner rule: "make sure that rewards
// are real when awarded") — computed from the quest's own place in its line,
// never from the hero's current level, so the amount shown when you read or
// accept a quest is EXACTLY what is paid at turn-in, whenever that happens.
// Every 10th quest and every milestone pays double gold, extra souls + a gem.
// src: 'L' = Lukus's ledger · 'A' = Addy's level-70 ledger (richer, deeper).
function questRewardSrc(src, i) {
  const addy = src === 'A';
  // The quest's own "level equivalent": its level gate (or 70 growing with
  // paragon depth past the cap); Addy's whole line is endgame and digs deeper.
  const lvlEq = addy ? 70 + i * 0.6
    : (questGate(i).kind === 'level' ? questGate(i).at : 70 + (i - 199) * 0.5);
  const big = (i % 10) === 9 || (!addy && (i % 25) === 24);
  let gold = Math.round(120 * lvlEq * (1 + i * 0.02));
  let souls = (addy ? 2 : 1) + Math.floor(i / (addy ? 40 : 50));
  if (big) { gold *= 2; souls += 2; }
  const xp = Math.round(XP_CURVE(clamp(Math.round(lvlEq), 1, 69)) * 0.4);
  return { gold, souls, xp, gem: big };
}
function questReward(i) { return questRewardSrc('L', i); }

// ------------------------------ achievements -------------------------------
// Earned state is computed LIVE from the hero's persistent lifetime counters —
// no separate save data needed (the counters already snapshot).
// ---------------------------------------------------------- achievements
// THE LEDGER OF DEEDS (owner spec v1.7.7): ~5,700 achievements, generated
// deterministically as escalating CHAINS grouped by category/subcategory.
// EVERY achievement bears a UNIQUE NAME (owner rule: never the same name
// numbered I…VI) — names are dealt from a 40×40×30 combinatorial pool
// (48,000 possible), two-part first, then "… of …" three-part forms.
const ACH_A = ['Pale', 'Grim', 'Silent', 'Hollow', 'Crimson', 'Ashen', 'Veiled', 'Broken',
  'Endless', 'Withered', 'Gilded', 'Sombre', 'Howling', 'Buried', 'Frozen', 'Rotten',
  'Shattered', 'Nameless', 'Wicked', 'Solemn', 'Dread', 'Mournful', 'Blighted', 'Thorned',
  'Umbral', 'Ancient', 'Restless', 'Fallen', 'Cursed', 'Wretched', 'Ghostly', 'Ravenous',
  'Bleak', 'Haunted', 'Sunken', 'Forsaken', 'Marrow', 'Deathly', 'Iron', 'Obsidian'];
const ACH_B = ['Tally', 'Harvest', 'Vigil', 'Reckoning', 'Procession', 'Litany', 'Toll', 'Covenant',
  'Requiem', 'Threshold', 'Dirge', 'Offering', 'Dominion', 'Communion', 'Passage', 'Lament',
  'Bounty', 'Tribute', 'Descent', 'Awakening', 'Crown', 'Oath', 'Hunger', 'Shroud',
  'Chorus', 'March', 'Silence', 'Embrace', 'Verdict', 'Path', 'Hymn', 'Burden',
  'Feast', 'Watch', 'Calling', 'Grasp', 'Sermon', 'Debt', 'Trial', 'Legacy'];
const ACH_C = ['Bone', 'Ash', 'Dust', 'Blood', 'Sorrow', 'Night', 'Graves', 'Worms',
  'Echoes', 'Cinders', 'Thorns', 'Whispers', 'Ruin', 'Shadow', 'Marrow', 'Rust',
  'Salt', 'Embers', 'Hunger', 'Stone', 'Mist', 'Chains', 'Crows', 'Roots',
  'Frost', 'Smoke', 'Teeth', 'Tears', 'Depths', 'Cold'];
function achName(g) {
  const a = ACH_A[g % 40], b = ACH_B[Math.floor(g / 40) % 40];
  if (g < 1600) return a + ' ' + b;
  return a + ' ' + b + ' of ' + ACH_C[Math.floor(g / 1600) % 30];
}

// Chains: [category, subcategory, steps, lo, hi, 'linear'?, desc template, cur].
// Geometric ladders for open-ended tallies; LINEAR for hard-capped tracks
// (level, paragon, acts, crypt tiers, the two 500-quest ledgers).
const ACH_CHAINS = [
  ['Slaughter', 'Monsters',    350, 10, 50000000, 0, 'Slay # monsters',                 () => Hero.totalKills || 0],
  ['Slaughter', 'Elites',      250, 5,  2000000,  0, 'Slay # elite monsters',           () => Hero.eliteKills || 0],
  ['Slaughter', 'Bosses',      250, 1,  200000,   0, 'Slay # bosses',                   () => Hero.bossKills || 0],
  ['Slaughter', 'Hard Lessons', 75, 1,  2000,     0, 'Fall in battle # times',          () => Hero.deaths || 0],
  ['Leveling',  'Character',    70, 1,  70,       1, 'Reach level #',                   () => Hero.level || 1],
  ['Leveling',  'Renown',      350, 10, 3500,     1, 'Reach Renown #',                  () => Hero.paragon || 0],
  ['Gameplay',  'Rifts',       250, 1,  100000,   0, 'Clear # rifts',                   () => Hero.riftsCleared || 0],
  ['Gameplay',  'Campaign',    100, 1,  100,      1, 'Finish # Story Acts',             () => Hero.actsCleared || 0],
  ['Gameplay',  'The Crypt',   250, 1,  250,      1, 'Slay a Guardian at Crypt Tier #', () => Hero.cryptBest || 0],
  ['Gameplay',  'Shrines',     175, 1,  20000,    0, 'Touch # shrines',                 () => Hero.shrinesTouched || 0],
  ['Gameplay',  'Portals',     125, 1,  10000,    0, 'Open # town portals',             () => Hero.portalsUsed || 0],
  ['Gameplay',  'Potions',     125, 1,  25000,    0, 'Drink # potions',                 () => Hero.potionsDrunk || 0],
  ['Gameplay',  'Play Time',   350, 10, 900000,   0, 'Play for # minutes',              () => Math.floor((Hero.playSeconds || 0) / 60)],
  ['Fortune',   'Gambling',    175, 1,  30000,    0, "Gamble # of Lyssa's hands",       () => Hero.gamblesRolled || 0],
  ['Fortune',   'The Fountain',125, 1,  5000,     0, 'Toss # coins into the fountain',  () => Hero.fountainTosses || 0],
  ['Collecting','Gold',        250, 100, 1000000000000, 0, 'Gather # gold',             () => Hero.goldEarned || 0],
  ['Collecting','Chests',      225, 1,  100000,   0, 'Open # chests',                   () => Hero.chestsOpened || 0],
  ['Collecting','Legendaries', 250, 1,  50000,    0, 'Claim # legendary items',         () => Hero.legendariesFound || 0],
  ['Collecting','Artifacts',   175, 1,  10000,    0, 'Claim # Artifacts',               () => Hero.artifactsFound || 0],
  ['Quests',    'Ledger of Light',     250, 2, 500, 1, "Complete # of Lukus's deeds",   () => Hero.questLine || 0],
  ['Quests',    'Underworld Ledger',   250, 2, 500, 1, "Complete # of Addy's jobs",     () => Hero.addyLine || 0],
  ['Smithy',    'Salvaging',   250, 1,  200000,   0, 'Salvage # items',                 () => Hero.salvagedCount || 0],
  ['Smithy',    'Crafting',    225, 1,  50000,    0, 'Craft # items',                   () => Hero.itemsCrafted || 0],
  ['Smithy',    'Repairing',   150, 1,  20000,    0, 'Repair # pieces of gear',         () => Hero.repairsDone || 0],
  ['Smithy',    'Torches',      75, 1,  2000,     0, 'Craft # torches',                 () => Hero.torchesCrafted || 0],
  ['Jeweler',   'Combining',   225, 1,  50000,    0, 'Combine # gems',                  () => Hero.gemsCombined || 0],
  ['Jeweler',   'Selling',     150, 1,  30000,    0, 'Sell # gems',                     () => Hero.gemsSold || 0],
  ['Enchantress','Enchanting', 225, 1,  50000,    0, 'Reroll # properties',             () => Hero.enchantsDone || 0]
];

const ACHIEVEMENTS = [];
{
  // The Forgotten Crypt stands first, alone and named for itself.
  ACHIEVEMENTS.push({ cat: 'Gameplay', sub: 'The Crypt', name: 'The Forgotten Crypt',
    desc: 'Wear six Artifacts at once', need: 1, cur: () => Hero.cryptUnlocked ? 1 : 0 });
  let g = 0;
  for (const [cat, sub, steps, lo, hi, lin, tmpl, cur] of ACH_CHAINS) {
    let prev = 0;
    for (let i = 0; i < steps; i++) {
      let need = steps === 1 ? hi
        : lin ? Math.round(lo + (hi - lo) * i / (steps - 1))
        : Math.round(lo * Math.pow(hi / lo, i / (steps - 1)));
      if (need <= prev) need = prev + 1;
      prev = need;
      ACHIEVEMENTS.push({ cat, sub, name: achName(g++),
        desc: tmpl.replace('#', need.toLocaleString()), need, cur });
    }
  }
}


// Reward readout, shared by the journal, both NPC dialogs and offers. `short`
// compacts "gold" to "g" so narrow phone columns can WRAP it instead of
// ellipsizing (owner rule: no runoff under rewards).
function questRewardTextSrc(src, i, short) {
  const rw = questRewardSrc(src, i);
  return '+' + rw.gold.toLocaleString() + (short ? 'g' : ' gold') +
    ' · +' + rw.souls + ' soul' + (rw.souls > 1 ? 's' : '') +
    ' · +' + rw.xp.toLocaleString() + ' XP' + (rw.gem ? ' · a gem' : '');
}
function questRewardText(i, short) { return questRewardTextSrc('L', i, short); }
// Entry-aware variant for journal rows ({idx, base, src}).
function questRewardTextFor(entry, short) {
  return questRewardTextSrc(entry.src === 'A' ? 'A' : 'L', entry.idx, short);
}

const GAME_VERSION = 'v1.7.15-alpha';

// Newest entry first. OWNER RULE: append a new entry (and bump
// GAME_VERSION) with EVERY addition and bug fix.
const PATCH_NOTES = [
  {
    v: 'v1.7.15-alpha', date: 'July 2026',
    notes: [
      'THE UI GROWS SEAMLESS — the red ✕ sheds its plate (just the painted X now, resting on every panel\'s title bar), menu titles sit properly in their bands and shrink to fit, checkboxes wear the owner\'s square plate with a bone tick, and the sliders trade garish green for faded bone and blood',
      'Weather FX left the Settings menu — weather now rides the Ambience channel. The Settings panel keeps clear air above and below',
      'CAMERA SHAKE FIXED — the torch-light mask used to stand still while the world jittered, visually cancelling the shake; now the whole scene jolts together, and every hit lands harder',
      'TORCHLIGHT REFORGED (owner spec): bare hands see twice as far (radius 40), and the torch ladder is a clean climb — Wood 48 · Iron 58 · Wyrm-bound 69 · Ascendant\'s 83 · Master\'s Light 100 · Nekromancer\'s 120, each a fifth brighter than the last',
      'REAGENTS RENAMED: Glittering Dust · Arcane Powder · Golden Crystal · Twisted Souls — and on desktop, hovering any reagent icon names it',
      'NEW HAVEN FILLS THE SCREEN on desktop — the painted town scales up to cover the whole window instead of floating in the dark',
      'THE NPC STAGES on desktop: Lukus, Addy and Lyssa each stand centered in the right half of a pure-black stage with their words centered in the left. Lyssa lost her rift footnote; her orbs hum simply with "a boss\'s dying breath"',
      'Soul Crucible: the reagent row breathes below the title bar, every flavor line is centered, and TRANSMUTE GOLDEN MIRROR is a trim centered plate — nothing spans the whole menu anymore. The Dev Panel\'s buttons slimmed down too, and it grants +5,000 Amidrassi Orbs now'
    ]
  },
  {
    v: 'v1.7.14-alpha', date: 'July 2026',
    notes: [
      'Hover on Choose Your Hero speaks more gently now: a FADED BONE GREEN rim, low and quiet — never blinding. Blood red belongs to RETIRING alone. The plus plate\'s rim traces its outline only; the plate itself stays dim, never washed in light'
    ]
  },
  {
    v: 'v1.7.13-alpha', date: 'July 2026',
    notes: [
      'Choose Your Hero, commanded: the frames are MASSIVE now — they fill the stage from the title down to PLAY. A created hero fully banishes the ghost (its faint remnant no longer haunts claimed frames — the arch interior is scrubbed to pure black)',
      'Hover speaks in BLOOD: pointing at a hero outlines the Nekromancer themself in deep red — never a pale glow around the whole plate — and on an empty vessel the plus plate takes the same crimson rim and stirs awake'
    ]
  },
  {
    v: 'v1.7.12-alpha', date: 'July 2026',
    notes: [
      'A NEW HERO FRAME — the owner\'s repainted thorned arch replaces the old one on Choose Your Hero: the black inside the arch is part of the painting now (nothing pokes past the borders), the waiting ghost stands a little smaller so the crown stays clear, and the name and level sit neatly beneath the skull\'s hanging gem. The plus plate still marks an empty vessel'
    ]
  },
  {
    v: 'v1.7.11-alpha', date: 'July 2026',
    notes: [
      'NINE HEROES — the roster grows from three to NINE: painted arrows left and right of the Choose Your Hero frames page through three trios, with page dots beneath. Your old heroes keep their places',
      'IMP WINGS — the Enchantress\'s wardrobe gains the owner\'s painted devil-wings: sixteen torn crimson frames spliced from the sheet, cross-fading one into the next in a slow open-and-close beat that NEVER stops — walking, fighting or standing still'
    ]
  },
  {
    v: 'v1.7.10-alpha', date: 'July 2026',
    notes: [
      'Choose Your Hero: the black backing inside each gothic frame now follows the arch\'s true shape — rounded shoulders up top, tucked below the crown — so it never pokes past the frame\'s borders'
    ]
  },
  {
    v: 'v1.7.9-alpha', date: 'July 2026',
    notes: [
      'ONE CAMERA — Bird\'s Eye is retired. TOP DOWN (the closer, Diablo-style tilted view) is now the only way the world is seen, and the Camera-view toggle has left the Settings menu. Heroes who had Bird\'s Eye saved are moved over automatically'
    ]
  },
  {
    v: 'v1.7.8-alpha', date: 'July 2026',
    notes: [
      'PARAGON IS NOW RENOWN — same climb, a worthier name. The four trees are reborn as MIGHT (was Core), WARFARE (Offense), FORTITUDE (Defense) and CUNNING (Utility)',
      'THE CRYPT NOW OPENS IN BANDS — finish Tier 1 (slay a boss there) and Tiers 2–7 unlock; finish Tier 7 for the next five, and every band edge after that opens five more, all the way down to Tier 250. The Waygate shows how deep your key reaches',
      'BEYOND THE ARTIFACT: three new rarities haunt the deep Crypt, each 5★-capable and worlds stronger than an Artifact 5★ — RELIC (blue) from Tier 201 (1%), ANCIENT (teal) from Tier 221 (1%, Relics rise to 5%), MYTHIC (gold) from Tier 243 (1%, Ancient 4%, Relic 2%). At Tier 250 the floor is theirs: Mythic 3% · Ancient 5% · Relic 7%',
      'Every item can reach the new grades — set pieces keep their set bonuses at Relic/Ancient/Mythic rank, and named legendaries roll them in the deep Crypt too. Their cards wear the rarity IN THE BACKGROUND (blue/teal/gold wash, as the Artifact wears red), their drop beams and minimap stars match, and salvaging one pays 5/7/10 Forgotten Souls plus stars'
    ]
  },
  {
    v: 'v1.7.7-alpha', date: 'July 2026',
    notes: [
      'THE LEDGER OF DEEDS — the achievement list swells from 24 entries to 5,721: escalating chains across nine categories (Slaughter, Leveling, Gameplay, Fortune, Collecting, Quests, Smithy, Jeweler, Enchantress) and 28 subcategories, from your tenth kill to your fifty-millionth, from 10 minutes played to 15,000 hours, from 100 gold to a TRILLION',
      'Every deed bears its OWN name — 5,721 unique titles dealt from a necromantic word-hoard (Pale Tally, Grim Reckoning, Obsidian Hunger of Blood…); no achievement is ever a numbered copy of another',
      'The Achievements screen is REBORN: categories stand in a sidebar on the left — tap one to unfold its subcategories, tap a subcategory to browse its ladder on the right. Both columns scroll on their own, and each subcategory shows its earned count',
      'Fourteen new lifetime tallies now follow your hero (and save): deaths, play time, gold gathered, potions drunk, shrines touched, portals opened, repairs, torches forged, gems sold, gambles rolled, fountain coins, legendaries and Artifacts claimed, and your deepest Crypt-tier Guardian kill'
    ]
  },
  {
    v: 'v1.7.6-alpha', date: 'July 2026',
    notes: [
      'PARAGON RISES TO 3500 — gentle to 250, then a brutal compounding climb; the final level alone demands TRILLIONS of XP. At the cap, the well is full',
      'THE FORGOTTEN CRYPT — wear SIX Artifacts at once and the deep dark opens (a resonant popup marks the moment; it\'s an achievement too). At Ascendant XVI choose Crypt Tier I–CCL: each tier hardens monster HEALTH by half again (×1.5, compounding) — never their numbers',
      'Crypt spoils: legendaries roll 1–5★ (5★ 5% · 4★ 10% · 1–3★ even); Artifacts climb in bands — 1–2★ from Tier 10, 3–4★ from Tier 76, and 5★ appears only in Tiers 181–250',
      'Your pet now SENSES loot — gold, items and gems on the ground pull it off heel to fetch them; its senses share your pickup radius, so paragon Pickup Radius widens the pet\'s reach too'
    ]
  },
  {
    v: 'v1.7.5-alpha', date: 'July 2026',
    notes: [
      'Creation screen polish: hair color now TINTS THE SHOWCASE MODEL live, the fog is gone, the about panel is wider (no more clipped lore), a BACK plate returns to the campfire, and the stray ✕ is gone',
      'Names are letters only — max 12 characters, no spaces, numbers or specials; the default is simply NEKROMANCER',
      'Choose Your Hero: each frame now has a black backing so your hero reads clearly; the sad face is gone from retirement',
      'Mouse hover glows bone white across the campfire and creation menus — plates, medallions, busts, frames and the gear all breathe when pointed at',
      'Settings is ONE padded column — nothing spans edge to edge anymore',
      'Confirmed: every art file in the game is WebP'
    ]
  },
  {
    v: 'v1.7.4-alpha', date: 'July 2026',
    notes: [
      'CREATION SCREEN, PART TWO (owner art) — bronze GENDER medallions in their own left menu (female by default), the chosen Nekromancer stands CENTRE-STAGE as a full painted model over low, rolling ground fog',
      'Hair color picks by painted head-bust, right where gender lives; no faces, skins or eye colors to fuss over',
      'NAME YOUR NEKROMANCER sits beneath the model with CREATE on the advanced plate — straight into New Haven with your new hero',
      'A lore panel tells the Nekromancer\'s tale and the four CLASSIC SPELLS — Corpse Explosion, Death Nova, Bone Armor, Command Skeletons — each in its circle frame with what it does',
      'The bronze GEAR medallion (lower right) opens Settings from the creation screen'
    ]
  },
  {
    v: 'v1.7.3-alpha', date: 'July 2026',
    notes: [
      'CHARACTER SELECT REBORN (owner art) — a painted "Choose Your Hero — the battle for Ghallia begins" vista replaces the campfire; three gothic soul-frames stand centered, each holding a ghostly unclaimed vessel on a glowing plinth',
      'Your heroes now stand INSIDE their frames — painted avatar on the plinth, name and level up by the divider, a teal breath around the chosen one',
      'Empty vessels carry the plus plate at a quarter opacity — tap the frame to CREATE YOUR NEKROMANCER, whose screen now opens over its own painted vista ("The dead obey.")',
      'All four paintings ship as WebP'
    ]
  },
  {
    v: 'v1.7.2-alpha', date: 'July 2026',
    notes: [
      'The red ✕ now sits IN each menu\'s title bar, flush with the plate — seamless, not floating in a corner',
      'RATHMA IS BELLMAHATH — every mention across the game (Instruction of Bellmahath, Souls of Bellmahath, Bellmahath\'s Chosen, Skills of Bellmahath…)',
      'The Soul Crucible reads centered and bone-white (reagent colors stay), and its street plate now floats squarely above the painted cube',
      'The artisans greet you in BIG letters — Tharn the Smithy, Orren the Jeweler, Vessa the Enchantress',
      'Smithy: Salvage reagents centered with room to breathe; Craft benches now SELECT a piece, show its reagents, and ask CRAFT? — no more instant hammer',
      'Torch bench: bone-white names (reagents keep their colors), brighter burn times, radius text gone, centered reagent drawer',
      'Jeweler: gem stacks are centered plates wearing their gem ICON; merge & sell actions are compact centered plates; Craft-a-Gem lost its stray icons; UNSOCKET dropped the "always free" boast',
      'Enchantress: property rows are narrow centered plates in plain bone white, the phantom "undefined" property is fixed, BACK and REROLL ride the simple plate',
      'Waygate & Shroud: the difficulty name sits on its own line clear of the arrows, titles lost their icons, and every mode row is a simple plate',
      'The fountain shows your gold under the TOSS button and wears its blessing in faded blood red on two lines; the Character sheet fountain line matches',
      'Lukus and Addy no longer flash their 0/500 ledger counts; The Creator menu is spaced out with simple plates and no stray exit'
    ]
  },
  {
    v: 'v1.7.1-alpha', date: 'July 2026',
    notes: [
      'Every remaining PNG (20 rune stones, 21 skill icons) is now WebP — 1.6MB of art shrunk to 272KB',
      'MOVE SPEED IS CAPPED AT 25% game-wide (boots, paragon, everything counts toward it). The ONLY way past it: the new FLEETFOOT blessing — +100% move speed from a map shrine (30 seconds) or the wishing fountain (10 minutes)',
      'Paragon rebalanced: everything caps at 50 points (movement included); Maximum Mana is now MAXIMUM ESSENCE; Intelligence & Vitality stay uncapped but grow +0.5% per point',
      'The Character sheet is one wide scrolling column — no more cramped twin columns',
      'PATCH NOTES no longer lag: entries collapse to one line (tap to expand, newest open), grouped by month, and off-screen text is never drawn',
      'Campfire: CHOOSE YOUR HERO rides the simple plate, YES RETIRE / NO KEEP are simple plates, and the stray ✕ is gone',
      'Settings: the Keys explainer sits on two centered lines; SAVE HERO no longer spans the whole panel'
    ]
  },
  {
    v: 'v1.7.0-alpha', date: 'July 2026',
    notes: [
      'PAINTED REAGENTS (owner art) — Reusable Parts, Arcane Dust, Veiled Crystals and Forgotten Souls now show as painted icons in the Character sheet, the Blacksmith, and the Soul Crucible; the Crucible reads far leaner and lost its ✕',
      'The red ✕ plate now sits ON each menu\'s panel corner, not off in the screen corner — and it\'s gone entirely from the Crucible, Lukus, Addy, Lyssa and the artisan welcomes',
      'The artisans greet you properly: Tharn the Blacksmith, Orren the Jeweler, Vessa the Enchantress — welcome splashes spaced out, flavor centered, no more "tap anywhere" whisper',
      'TORCH BENCH reworked — wider, reagents fold into their own drawer, rarity tags gone, simple plates, the lit torch counts down, and the Nephalem Torch is now the ASCENDANT\'S TORCH',
      'Craft Weapons & Armor — centered simple-plate slots, plain words for Standard and Masterwork, less clutter',
      'Jeweler benches centered and widened; Craft a Gem fully restyled in bone white',
      'The Enchantress\'s benches center their lists, her wardrobe grows FOUR new pets — including a loyal GRAVE HOUND',
      'The fountain speaks in plain words, wraps its lines, and your blessing (with what it actually does) now shows on the Character sheet in bone white; Empowered now also doubles essence regen',
      'The Stash lives in its own painted panel like the Inventory; the town MENU button rides the simple plate; menu rows Character→Achievements go simple (Settings stays gothic); vendors keep their wares clear of the plate edges'
    ]
  },
  {
    v: 'v1.6.99-alpha', date: 'July 2026',
    notes: [
      'PARAGON UNCHAINED — spend your points in ANY category, any order; the rotation lock, its banner and the ✦ marker are gone. Core→Utility tabs ride the simple plate, Undo Last / Reset All the little empty plate',
      'The PASSIVES are now a grid of round medallions — five columns on desktop, four on tablet, three on phones — each in the painted circle frame with its name beneath; chosen ones ring in faded bone white',
      'Every selection ring (skills, passives, runes) is now a faded bone white — no more bright green, purple or yellow circles',
      'The whole interface — every menu and vendor — now speaks Cinzel, the Trajan-style face of the plates',
      'Inventory: EXPAND BAG rides the simple plate, the filter chips the little empty plate; the Jeweler\'s gem filter & tier chips settle onto the simple plate',
      'Character sheet: PARAGON and CAMPFIRE (renamed from Change Hero) on the simple plate; CHOOSE SKILLS has more breathing room'
    ]
  },
  {
    v: 'v1.6.98-alpha', date: 'July 2026',
    notes: [
      'THE WISHING FOUNTAIN — stand at New Haven\'s fountain (a skeleton-hand medallion beckons) and toss 200 gold into the dark water for a random shrine blessing that lasts 10 minutes and follows you into the wilds',
      'A new GOTHIC plate (owner art — thorned caps, twin skull crests) carries the ☰ MENU rows, APPLY & CANCEL in the skill chooser (Accept is now Apply), Delete Hero, and the artisans\' inner benches: salvage, craft toggles & slots, torch rows, gem chips, gear picks, pets/wings/themes, stash Deposit & Upgrade, and the Soul Crucible leaflet',
      'The simple plate now backs the three town vendors\' wares, Lyssa\'s gamble table, the stash filter & sort chips, and the Golden Mirror transmute; the little empty plate carries torch CRAFT, individual repairs, stash WITHDRAW & SALVAGE, and Lukus\'s & Addy\'s DROP',
      'Lukus\'s and Addy\'s quest rows breathe — taller rows, nothing squished; the chooser page count is gone',
      'The Soul Crucible menu is wider (Forgotten Souls no longer cut off) and its street plate now floats above the cube'
    ]
  },
  {
    v: 'v1.6.97-alpha', date: 'July 2026',
    notes: [
      'Five more painted UI pieces (owner art): the red ✕ close plate everywhere a window closes, painted PLUS and MINUS plates (Settings font size, the Keys tab\'s add-binding, the Paragon spend buttons)',
      'The little empty value plate now backs Settings\' value chips — camera view, loot text position & style, cursor size, corpse limit — and the Game creator / patch version row',
      'Every skill, rune and passive now sits in the painted round frame: the in-game action bar, the Skills & Passives slots, and the full chooser (skills and rune stones alike)'
    ]
  },
  {
    v: 'v1.6.96-alpha', date: 'July 2026',
    notes: [
      'The SIMPLE PLATE (owner art — diamond finials, no skull crest) arrives: death screen, artisan bench rows, quest DROP buttons, and the Settings tabs / Save Hero / Export & Import Code / Reset to Defaults all wear it — the ornate skull plate stays on the ☰ MENU and in town',
      'Inventory and Skills & Passives now sit in the painted panel frame, matching the Character sheet',
      'The Journal\'s quest stripe now wears your chosen theme color',
      'New "Default" theme at the Enchantress — the original untinted look',
      '"Save to Current Hero" is now simply SAVE HERO',
      'Six themed glow variants of the simple plate are sliced and stored for later use'
    ]
  },
  {
    v: 'v1.6.95-alpha', date: 'July 2026',
    notes: [
      'The death screen joins the set — YOU HAVE FALLEN letters in Cinzel, and RISE AT THE ENTRANCE / RETURN TO TOWN are painted plates'
    ]
  },
  {
    v: 'v1.6.94-alpha', date: 'July 2026',
    notes: [
      'FOG OF WAR reworked — the shroud is now 65% dark instead of pitch black, so the environment shows dimly through it. Enemies HIDE in the fog: you can\'t see them and they can\'t attack (or even wake) until their ground is uncovered',
      'FIXED: running right made the character face left and vice versa — the painted side profile\'s mirror was backwards',
      'Skills & Passives: the bottom "Empty slot / RUNES" bar is deleted — tapping an action-bar slot opens the skill chooser straight away; the chooser\'s category arrows are the painted arrow plates'
    ]
  },
  {
    v: 'v1.6.93-alpha', date: 'July 2026',
    notes: [
      'QUEST TRACKER — up to five of your journal quests now ride under the minimap in every dungeon with live progress bars. Finish one and it flashes GREEN, fades away, and the quests beneath bump up (the turn-in still waits with the giver)',
      'The Waygate/Shroud difficulty stepper uses the owner\'s painted ARROW plates',
      'Campaign: CONTINUE · ACT N and SELECT AN ACT are painted plates with live text'
    ]
  },
  {
    v: 'v1.6.92-alpha', date: 'July 2026',
    notes: [
      'New defaults (owner rule): ELECTIVE MODE is on, the camera starts in TOP DOWN, and the inventory opens as the GROUPED list. Anyone who already picked their own settings keeps them'
    ]
  },
  {
    v: 'v1.6.91-alpha', date: 'July 2026',
    notes: [
      'The Waygate and Shroud panels now fit their contents — no more giant empty box under one or two mode plates; the difficulty stepper is wider so the arrows never crowd the difficulty name',
      'Street signs in town are ALWAYS the unlit plate now — the theme\'s lit plate appears ONLY under a hovering mouse, nowhere else (standing at a doorway just brightens the sign\'s lettering)'
    ]
  },
  {
    v: 'v1.6.90-alpha', date: 'July 2026',
    notes: [
      'Character select: DELETE HERO shrank to a small corner plate, well away from PLAY',
      'The red 🎒 inventory shortcut beside the town ☰ MENU is gone — Inventory lives in the menu',
      'The Waygate and Shroud menus dropped their flavor lines — just the mode plates now (the description still appears as a desktop hover tip)'
    ]
  },
  {
    v: 'v1.6.89-alpha', date: 'July 2026',
    notes: [
      'Plate buttons now rest DARK — the theme\'s colored glow only ignites under the mouse (and on the town street sign you\'re standing at). Your chosen theme decides the glow color, not the resting look'
    ]
  },
  {
    v: 'v1.6.88-alpha', date: 'July 2026',
    notes: [
      'THE GREAT RENAMING — the game\'s systems take on their own names: Story Mode is the CAMPAIGN, Adventure Mode is EXPEDITIONS, Bounties are HARVESTS, the Rift is THE OSSUARY, the Nephalem Rift is THE ABYSS, and Seasons ride the BLOOD MOON',
      'The town waypoints follow: the blue gate is the WAYGATE and the purple one is THE SHROUD. Nephalem Keys are CRYPT KEYS, Master Keys are ASHEN KEYS, the Horadric\'s Cube is the SOUL CRUCIBLE, and the Horadric cache is the FORGOTTEN RELIQUARY',
      'Difficulties ranked anew: Apprenticeship · Disciple · Adept · Master, and beyond them ASCENDANT I–XVI (formerly Torment)',
      'The waypoint mode rows and the character-select DELETE HERO button are painted plates now'
    ]
  },
  {
    v: 'v1.6.87-alpha', date: 'July 2026',
    notes: [
      'The title screen\'s CHOOSE YOUR HERO button is the painted plate now — the last plain green button is gone'
    ]
  },
  {
    v: 'v1.6.86-alpha', date: 'July 2026',
    notes: [
      'Lukus, Addy and Lyssa\'s dialogs start at the very top of the screen on mobile — the big empty gap above the conversation is gone, so the quest column gets all that room back'
    ]
  },
  {
    v: 'v1.6.85-alpha', date: 'July 2026',
    notes: [
      'The Violet theme is now called VOID, and it is the game\'s default look — new players start with the void-glow plates; anyone who picked a theme keeps their choice'
    ]
  },
  {
    v: 'v1.6.84-alpha', date: 'July 2026',
    notes: [
      'MORE PAINTED PLATES — Accept Quest and Drop (Lukus, Addy and the Journal), Campfire (Character sheet), Choose Skills, the Actives/Passives tabs, and every bench button at the Smithy, Jeweler and Enchantress',
      'Gated quests share one plate with live text — "REQUIRES LEVEL X" written on the plate, no thousand baked images',
      'The ☰ MENU\'s plates are properly spaced now — no more touching panels',
      'ALL headings wear the chosen look: Cinzel caps in parchment gold — the purple MENU title and the bright-colored section headers (Character, Inventory, Stash, Journal, Achievements, Settings, Skills & Passives) are gone',
      'Menu flow: closing a menu page (Achievements, Inventory…) returns to the ☰ MENU so the other options stay in reach; closing the menu itself returns to the game',
      'DURABILITY (Diablo-3-style) — armor and weapons now wear down: hits taken grind your armor, casting grinds your weapon and phylactery, and dying costs 10% of every piece\'s maximum. Gear shows "Durability 21/21"; at 0 the item is BROKEN and gives NOTHING (stats, gems, set pieces, legendary powers all switch off) until repaired. Jewelry never wears, exactly as in D3',
      'THE SMITHY REPAIRS — a new Repair bench lists every damaged piece with its gold price, one tap per item or REPAIR ALL on a plate. TRAIN buttons at all three artisans are plates now too'
    ]
  },
  {
    v: 'v1.6.83-alpha', date: 'July 2026',
    notes: [
      'SIX PAINTED THEMES — the Enchantress\'s theme wardrobe is now the owner\'s glowing plate set: Bone White, Violet, Blood, Ocean, Jungle and Ember. Your chosen theme recolors every plate button and street sign in the game with its own painted glow, plus matching panel and title accents',
      'Old saves that wore Arcane or Royal are dressed in Violet and Ember respectively'
    ]
  },
  {
    v: 'v1.6.82-alpha', date: 'July 2026',
    notes: [
      'The round ENTER and EXIT buttons are now the owner\'s painted DOOR MEDALLIONS — a doorway spilling warm light when you can step inside, and the same door gone dark when it\'s time to leave (the label sits beneath in Cinzel)',
      'Walking up to Lukus, Addy or Lyssa shows the painted SPEECH-BUBBLE medallion — TALK has its own ring now'
    ]
  },
  {
    v: 'v1.6.81-alpha', date: 'July 2026',
    notes: [
      'PAINTED PLATE BUTTONS — the owner\'s skull-crested button plate now carries PLAY, CREATE CHARACTER, the whole ☰ MENU (Character, Inventory, Journal, Skills & Passives, Achievements, Settings, Abandon), and the artisan welcome buttons (Step Up to the Anvil, Browse the Stones, Part the Veil)',
      'All plate buttons letter in CINZEL, the Trajan-style face (self-hosted, 26KB) — the classic Diablo look',
      'The town street signs are painted plates too, and two artisans go by their proper trades now: the Blacksmith\'s is the SMITHY, and the Mystic is the ENCHANTRESS'
    ]
  },
  {
    v: 'v1.6.80-alpha', date: 'July 2026',
    notes: [
      'THE OWNER\'S PAINTED UI ARRIVES (phase one) — every menu panel in the game now wears the hand-drawn dark frame with its ornamental corners, sliced straight from the new UI kit',
      'The red ✕ close button is the kit\'s painted plate on every screen',
      'Desktop: the health and essence globes are now the kit\'s spiked orbs — the liquid drains and fills inside the painted glass',
      'More of the kit (action bar, crafting screens) lands in later phases'
    ]
  },
  {
    v: 'v1.6.79-alpha', date: 'July 2026',
    notes: [
      'The male hair-color models were rebuilt — the colored head is now MASKED AND FADED into the torso (a smooth cross-fade at the neck and collar) instead of pasted on top, so the hair melts naturally into the shoulders in every view: front, back and profile'
    ]
  },
  {
    v: 'v1.6.78-alpha', date: 'July 2026',
    notes: [
      'REAL WALKING — the avatar\'s legs are now spliced at the hip and swing in opposition: a true stride in profile, a soft step facing the camera, torso riding smoothly on top. No more skating across the ground',
      'FIXED: cosmetic wings sprouted from the hero\'s LEGS on the tall painted model (they were anchored for the old small sprite) — they now sit properly at the shoulders, scaled to the model',
      'FIXED (iPad/tablet): dragging down on the movement stick could yank the game out of full screen — that\'s an iPad system swipe the page cannot block, so the game now snaps RIGHT BACK into full screen on your next touch whenever it gets knocked out accidentally (turning full screen off via the toggle still works normally)'
    ]
  },
  {
    v: 'v1.6.77-alpha', date: 'July 2026',
    notes: [
      'MALE HAIR COLORS ON THE NEW BODY — every male hair variant is now the new full model wearing that color\'s head (same model, different hair), with true side profiles for all eight, matching the female set',
      'ONE MENU EVERYWHERE — rifts, seasons, bounties, acts and Adventure Mode now open the same ☰ MENU as town (with an ABANDON row while in a run); the old pause screen is retired',
      'The round EXIT button is gone from the pure menu screens — Character, Inventory, Journal, Skills & Passives, Achievements, Settings, the ☰ Menu and both waypoint menus close with the red ✕ or Escape, straight back to the game',
      'RENAMED: the Rift Waypoint is now THE VOID PORTAL, and the Expedition Waypoint is THE WILDS WAYPOINT',
      'Wood Torch shines 25% farther (radius 60 → 75), and every finer torch got a small push too (Iron 120 · Wyrm-bound 192 · Nephalem 264 · Master\'s 365 · Nekromancer\'s 520)'
    ]
  },
  {
    v: 'v1.6.76-alpha', date: 'July 2026',
    notes: [
      'NEW FEMALE HAIR MODELS — all eight female hair colors were repainted on the new full-model costume, and every one now includes a TRUE SIDE PROFILE for walking left and right (male hair variants are in the works)',
      'Character creation shows the hero on a plain black backdrop while picking hair — the colored glow behind the figure is gone (owner rule)',
      'All avatar art renders at one uniform size, matched to the new models'
    ]
  },
  {
    v: 'v1.6.75-alpha', date: 'July 2026',
    notes: [
      'NEW FULL-MODEL AVATARS — the owner repainted both Nekromancers head to toe: richer skull-bound leathers, front AND back, male and female',
      'REAL SIDE PROFILES — walking left or right now shows a true painted profile view (base look) instead of the old mirrored-and-sheared front; the profile mirrors to lead whichever way you walk',
      'The black-hair picker busts were recut from the new paintings so the chip matches the model'
    ]
  },
  {
    v: 'v1.6.74-alpha', date: 'July 2026',
    notes: [
      'The HAIR COLOR picker now shows painted HEAD BUSTS instead of color dots — each chip is the owner\'s portrait of that hair color, male or female to match your chosen body',
      'Black hair gets a bust too, cropped from the original painting, so all nine chips read the same way'
    ]
  },
  {
    v: 'v1.6.73-alpha', date: 'July 2026',
    notes: [
      'HAIR COLOR — character creation now offers NINE hair colors from the owner\'s new art sheets (Black, Ember, Blood, Violet, White, Silver, Gold, Green, Blue), replacing the glowing-eye color picker',
      'Your chosen hair is real painted art, not a tint: each color is its own avatar painting, front and back, male and female — the creation preview, the walking hero in the world, and the campfire roster all show it',
      'Old saves keep their look: heroes made before this update default to the original black-haired paintings'
    ]
  },
  {
    v: 'v1.6.72-alpha', date: 'July 2026',
    notes: [
      'THE CAMPFIRE ROSTER SHOWS YOUR REAL HEROES — each character by the fire is now their painted avatar, male or female per the save (older saves without a chosen gender default to male)',
      'The creation-screen preview and the walking animation were both toned WAY down — a slow breath and a subtle sway instead of the over-eager slicing that made bodies look cut in half',
      'FIXED: the Blacksmith salvage explainer ("Gems survive the forge") was cut off on phones — it wraps now',
      "FIXED: Addy's and Lukus's ledger counters overlapped the ledger title on narrow screens — the count drops to its own line when there isn't room",
      'FIXED: shop flavor text (Jeweled Necessities et al) ran off the panel and collided with the gold readout',
      'FIXED: the Stash\'s WITHDRAW buttons were truncated to "WITHDR…", and the capacity readout hid under the red ✕'
    ]
  },
  {
    v: 'v1.6.71-alpha', date: 'July 2026',
    notes: [
      'FIXED: the hero avatar walked the town half-transparent — the black-costume paintings were being chroma-keyed at runtime, and the key ate the dark leather along with the black backdrop',
      'The avatars now ship with a proper baked-in cutout (the background was separated from the costume offline, where flat backdrop black can be told apart from painted shadow), so the figure is fully solid everywhere — town, wilds, and the creation preview',
      'Side benefit: no more per-device image processing at load, and the avatar renders identically on every browser'
    ]
  },
  {
    v: 'v1.6.70-alpha', date: 'July 2026',
    notes: [
      'THE HERO IS NOW A PAINTED AVATAR — the owner\'s hand-drawn Nekromancer walks the world in Top Down view: front art facing you, back art when walking away, and a mirrored three-quarter lean for left and right',
      'The painting is layered into legs, torso and head that sway on offset rhythms as you walk, so the figure strides with real dimension instead of sliding like a card',
      'CHOOSE YOUR NEKROMANCER — character creation now offers MALE and FEMALE avatars (the owner\'s paintings, one for each), and the creation screen shows your actual walking top-down character instead of the old bird\'s-eye skull',
      'The campfire select screen dropped its "up to three Nekromancers rest by the fire" line — the fire speaks for itself',
      'The classic procedural figure still stands in anywhere the avatar art hasn\'t loaded yet, so nothing ever renders blank'
    ]
  },
  {
    v: 'v1.6.69-alpha', date: 'July 2026',
    notes: [
      'THE GAME LOADS ~12× FASTER ON SLOW CONNECTIONS — all the heavy paintings (the New Haven map, the shop interiors, every NPC portrait, the ground textures and the logo) were recompressed from 35MB of PNG down to 3MB of pixel-identical-at-game-scale WebP',
      'Art is no longer re-downloaded on every game update: paintings now carry their own version stamp that only changes when the art itself changes, so your phone keeps them cached across releases',
      'The heavy art starts downloading the moment the game boots — streaming in during the title and campfire screens instead of popping in late when you first walk somewhere',
      'And if the town painting still hasn\'t arrived, the screen now says "New Haven emerges from the dark…" instead of staying mutely black'
    ]
  },
  {
    v: 'v1.6.68-alpha', date: 'July 2026',
    notes: [
      'Lyssa\'s table no longer spells out the odds — fate keeps her secrets (the flavor line under the gamble slots is gone)',
      'Addy speaks like she belongs in Sanctuary now: the daily is a DAILY QUEST (the button too), NEXT JOB is NEXT QUEST, and TAKE THE JOB is ACCEPT QUEST — quest wording throughout her dialog and the journal'
    ]
  },
  {
    v: 'v1.6.67-alpha', date: 'July 2026',
    notes: [
      'THE CAMPFIRE ROSTER IS CLEANED UP — the two heroes flanking the fire keep their nameplates properly apart on phones (they used to print over each other), the whole scene rides higher on portrait screens so nothing collides with the selection plate, the fallen skeleton no longer strikes through anyone\'s name, and a soft dark scrim sits under the name + PLAY + DELETE controls so they read clean over the grass',
      'On short landscape screens the flanking nameplates move ABOVE their heroes\' heads, the bottom controls compress to hug the edge, and the decorative subtitle steps aside'
    ]
  },
  {
    v: 'v1.6.66-alpha', date: 'July 2026',
    notes: [
      'LYSSA, MISTRESS OF FATE has taken her place at the rift pavilion steps — the owner\'s painted gambler, fate-orb in hand. Her street plate says only "Lyssa"; her full title appears when you talk to her',
      'NEW RESOURCE: AMIDRASSI ORBS — every Rift and Season boss now breathes out 1–10 orbs at random when it falls (shown on the completion cache)',
      'SPEND THEM AT LYSSA (Kadala-style, straight from Diablo 3): pick a gear slot and she deals an unidentified roll — armor 10 orbs · phylactery and rings 15 · weapon 25 · amulet 30. Odds: mostly rares and epics, 1 in 10 hands comes up LEGENDARY (with star tiers by Torment, like world drops). The last hand she dealt shows in full so you know what fate gave you',
      'Her ! lights up whenever you carry enough orbs for at least the cheapest gamble'
    ]
  },
  {
    v: 'v1.6.65-alpha', date: 'July 2026',
    notes: [
      'THE JOURNAL KNOWS ITS GIVERS — Addy\'s jobs now SHOW DIFFERENTLY from Lukus\'s deeds: the journal is grouped into two sections, each with the giver\'s name, their slot count and their own ledger bar; her rows wear Underworld violet with her colored stripe, his wear the gold of the Light, and finished quests say exactly whom to see',
      'BOTH AT ONCE (owner rule): quest slots are now PER GIVER — up to 7 of Lukus\'s deeds AND 7 of Addy\'s jobs can ride in the journal together (14 total). Each dialog counts only its own ("JOURNAL — n / 7 of mine"), and the street markers light up per giver'
    ]
  },
  {
    v: 'v1.6.64-alpha', date: 'July 2026',
    notes: [
      'NEW NAMES, ALL OUR OWN: the Jeweler is now ORREN GILDSTONE and the Mystic is VESSA NIGHTWEAVE (no more borrowed names, matching Tharn Emberhand at the forge) — quest names that quoted the old Mystic now read "Vessa\'s Craft"',
      'LEFT-HANDED MODE — Settings ▸ Gameplay: mirrors the whole touch layout. The skill cluster, potion, portal and the town ENTER/EXIT button move to the LEFT side, and the movement joystick half moves to the RIGHT. Right-handed stays exactly as designed',
      'TOWN MOVEMENT: the walk joystick now spawns ANYWHERE you touch in New Haven — comfortable for either hand',
      'GEM CRAFTING BY JEWELER LEVEL (owner spec): level 1 cuts CHIPPED gems at 1,000g, climbing the ladder — Square, Flawless Square, Brilliant Square, Star, Flawless Star, Radiant Star, Imperial, Flawless Imperial — to level 10 cutting ROYAL IMPERIAL gems at 700,000g. The bench shows exactly what your level cuts',
      'The gem-crafting flavor text wraps onto its own lines instead of being cut off, the UNSOCKET list now shows just the item name beside the gem\'s icon (the gem name was redundant), and maxed artisans no longer show "LEVEL 10 / 10 (MAX)"'
    ]
  },
  {
    v: 'v1.6.63-alpha', date: 'July 2026',
    notes: [
      'ADDY, QUEEN OF THE UNDERWORLD has set up shop by the crates east of the rift pavilion — the owner\'s painted rogue, twin blades and all, standing right where the boss himself stood. The street plate says only "Addy"; her full name and title appear when you talk to her (and Lukus\'s plate now reads just "Lukus" too — titles come out in conversation, not on the street)',
      '500 MORE QUESTS — her Underworld Ledger opens at LEVEL 70: five hundred jobs under her own rogue names ("Shank the Tyrants", "Heist the Buried Chests", "Con Fortune\'s Loom"), every deed strictly harder each time it returns, all sharing the same 7-slot journal',
      'THE QUEEN\'S ERRAND — her special DAILY, one per real-world day: finish it and she pays ONE RANDOM MARQUISE GEM plus an odds-rolled prize — 90% a legendary, 6% a 1–3★ legendary, 3% a 4–5★ legendary, 1% an ARTIFACT — the item an even roll across every slot: armor, jewelry and weapons alike',
      'Her jobs pay endgame money (deeper gold and souls than Lukus\'s ledger), the journal and quest details know whose quest is whose, and her ! / ✓ marker only lights up once you\'re level 70'
    ]
  },
  {
    v: 'v1.6.62-alpha', date: 'July 2026',
    notes: [
      'THE ☰ MENU GREW UP (owner order): 👤 CHARACTER on top, 🎒 INVENTORY under it, then 📜 Journal, ⚔ Skills & Passives, the brand-new 🏆 ACHIEVEMENTS beneath them, and ⚙ Settings last',
      'ACHIEVEMENTS ARE IN — 24 deeds computed live from your lifetime record: from First Blood (100 kills) through Deathbringer and Warden of Silence (100,000), Godslayer, Master of the Breach, Forgemaster, The Thousandth Step (Paragon 1000), The Ledger Closed (all 500 quests) and more, each with a live progress bar until it\'s earned',
      'NEW SETTING — Settings ▸ Gameplay ▸ "Inventory: Grouped list": OFF keeps the radial wheel exactly as it is; ON replaces it with a GROUPED inventory — your equipped piece and bag items sorted into categories (Helm → Shoulders → Chest → Gloves → Legs → Boots → Amulet → Ring 1 → Ring 2 → Weapon → Off-Hand → Torch) with filter chips, upgrade arrows, and the full EQUIP / SALVAGE / SOCKET / STASH actions on every item'
    ]
  },
  {
    v: 'v1.6.61-alpha', date: 'July 2026',
    notes: [
      'EVERY QUEST NOW HAS A NAME OF ITS OWN — all 500 are unique, and the numbered repeats ("Forged Anew VII") are gone for good. Crafting deeds run from "Forge New Steel" through "Hammer the White Heat" to "Draw Tomorrow\'s Arms"; the 20 milestones carry names like "The First Ascent", "Starlight and Bone" and "The Final Trial"',
      'QUESTS THAT COME BACK COME BACK HARDER (owner rule): every repeat of a deed is strictly tougher than the last — craft 2 items, then 3, then 4… up to 85; slay 25 monsters, then 33, then 39… up to 2,000. The same target can never appear twice for the same deed',
      'Deeds are dealt evenly through the ledger (each of the nine returns ~53 times, well spread) so no stretch of the line repeats itself',
      'Note: the ledger was re-rolled for this — quest names and targets in your journal will have changed once, but your progress counters and turn-ins are untouched'
    ]
  },
  {
    v: 'v1.6.60-alpha', date: 'July 2026',
    notes: [
      'REWARD LINES NO LONGER RUN OFF THE CARD — quest details in the Journal and Lukus\'s dialog (and the NEXT DEED offer) now use a compact readout ("+120g" instead of "+120 gold") that WRAPS onto a second line on narrow phones instead of being cut off with "…"'
    ]
  },
  {
    v: 'v1.6.59-alpha', date: 'July 2026',
    notes: [
      'TAP A QUEST FOR THE FULL STORY — in the Journal and in Lukus\'s dialog, tapping a quest row opens its details: the complete deed text, its place in the 500 (with a ★ milestone note), and the EXACT reward — gold, Forgotten Souls, XP, and whether a gem is coming',
      'REWARDS ARE REAL NOW (owner rule) — every quest\'s payout is fixed to the quest itself, not to your level when you happen to turn it in. What the details show is precisely what Lukus pays: same gold, same souls, same XP, whether you read it at level 9 or turn it in at level 70 (gear XP bonuses can only add on top)',
      'The NEXT DEED offer shows the same full reward line before you accept'
    ]
  },
  {
    v: 'v1.6.58-alpha', date: 'July 2026',
    notes: [
      'THE STASH WHEEL IS GONE — the vault is now one clean list SORTED INTO GROUPS by gear type, with FILTER chips (All · Weapon · Phylactery · Helm · … · Rings · Amulet) and a SORT picker: ▲ Upgrade · Rarity · Level · Name. Deposit-bag and upgrade buttons sit right on top',
      'THE QUEST JOURNAL LIVES IN THE ☰ MENU now, above Skills & Passives — read every accepted quest with live progress bars anywhere, drop deeds back to Lukus\'s queue, and finished ones say ✔ READY — see Lukus',
      '"JEWELED NECESSITIES" is the new shop where General Goods stood — rings, necklaces and amulets only, worn once by the dead, priced for the living',
      'The APOTHECARY has shut its doors for now — the cauldron\'s cold and the shelves are bare (nothing for sale, come back another day)'
    ]
  },
  {
    v: 'v1.6.57-alpha', date: 'July 2026',
    notes: [
      'THE BLACKSMITH HAS A NAME OF HIS OWN — THARN EMBERHAND now works the New Haven forge (no more borrowed names), and the Jeweler\'s door now reads "WELCOME TO THE JEWELER\'S"',
      'THE ☰ MENU IS JUST A MENU NOW (owner rule): Skills & Passives · Inventory · Settings — nothing else. The old Survivor\'s Camp hub is retired; everything it held lives in New Haven\'s streets (artisans, stash, cube, waypoints)',
      'Every road leads home: finishing a rift, act or bounty run, dying, or abandoning a run now returns you to NEW HAVEN (reward screens open right over the streets) — the bounty map\'s back button reads "BACK TO TOWN"'
    ]
  },
  {
    v: 'v1.6.56-alpha', date: 'July 2026',
    notes: [
      'STEPPING INTO A SHOP IS A MOMENT NOW — the Blacksmith, Jeweler and Mystic open onto their painted interiors first, nearly unveiled, with a welcome all their own: Haedrig\'s "WELCOME TO THE FORGE", Shen\'s "WELCOME TO THE GEMWORKS" and Myriam\'s "WELCOME TO THE SANCTUM", each with the artisan\'s own words about what they can do for you',
      'Tap anywhere (or the big invitation button — STEP UP TO THE ANVIL · BROWSE THE STONES · PART THE VEIL) to step inside to the benches. Closing a bench still returns you straight to the shop — the welcome only greets you when you walk in from the street'
    ]
  },
  {
    v: 'v1.6.55-alpha', date: 'July 2026',
    notes: [
      'THE QUEST JOURNAL — you can now carry up to SEVEN of Lukus\'s quests at once. Accept a handful, go adventuring, and turn each one in as it finishes — in any order, straight from its row in the journal',
      'Lukus\'s dialog shows the whole journal: every accepted quest with its own live progress bar, a ✔ TURN IN button the moment it\'s done, and a DROP button that returns a quest to Lukus\'s queue (nothing is ever lost — dropped deeds are offered again first). Below the journal, the NEXT DEED on offer with its reward',
      'The journal column drag-scrolls when it outgrows the screen, and the ledger bar now counts quests TURNED IN out of 500',
      'His golden ! now means "work available and journal has room"; the green ✓ means at least one journal quest is ready to turn in',
      'Old saves migrate cleanly: your one active quest becomes the journal\'s first entry'
    ]
  },
  {
    v: 'v1.6.54-alpha', date: 'July 2026',
    notes: [
      'NEW HAVEN\'S WALLS ARE SOLID — the painted perimeter (north battlements, west wall, the diagonal south-east rampart, the treelines and market tents along the south) now blocks walking, so the hero can no longer stroll out of town into the wilderness art. The south gate remains the only opening',
      'MOBILE MENU FIXES from the owner\'s screenshots: the Blacksmith / Jeweler / Mystic bench menus now stop above the round EXIT button, so the last bench (Craft Torches / Craft a Gem / Themes) is never covered',
      'The Equipment wheel on phones: the wheel moved clear of the stat readout, huge endgame numbers (gold, life, damage-per-hit) shorten to k/m so they can\'t spill into the wheel, the readout can no longer write over the WEAPON — EQUIPPED header, and the bag list stops above the EXIT button',
      'While a menu is open in town, the street HUD ("NEW HAVEN") no longer bleeds through the dimmed background'
    ]
  },
  {
    v: 'v1.6.53-alpha', date: 'July 2026',
    notes: [
      'LUKUS STANDS BESIDE HIS WORDS ON PHONES TOO — on portrait mobile screens the dialog no longer stacks above him: his words and the quest board take the left side and the knight takes the right, raised on a soft ground shadow so he stays clear of the EXIT button below'
    ]
  },
  {
    v: 'v1.6.52-alpha', date: 'July 2026',
    notes: [
      'YOUR PET FETCHES LOOT — the companion trailing you now scoops up gold, health orbs, items and gems it passes near, exactly as if you\'d walked over them yourself. Loot magnets to whichever of you is closer',
      'NEW HAVEN IS HOME: loading or creating a character now drops you straight into town — the streets are the first map you see, with the waypoints, artisans and Lukus all around you',
      'Town HUD decluttered (owner request): the gold counter and the grey explainer text along the bottom are gone, and the grey label under the ENTER button too — the floating name plates over each doorway already say what everything is',
      'Lukus has his own side of the stage now — his portrait no longer overlaps the round EXIT button in the dialog corner',
      'The redundant LEAVE button is gone from the merchant menus (close with the red ✕ or Escape, as everywhere else), and the old unused Town Portal menu screen was deleted outright'
    ]
  },
  {
    v: 'v1.6.51-alpha', date: 'July 2026',
    notes: [
      'THE LEDGER OF LIGHT — Lukus now keeps 500 QUESTS, a single great quest line running from level 1 all the way to level 70 and on to Paragon 1000. One quest at a time: slay monsters, hunt elites, fell bosses, clear rifts, salvage, craft, combine gems, reroll at the Mystic, crack chests — with the targets growing as you do',
      'Every 25th quest is a ★ MILESTONE — a Trial of Ascension (reach a level) or a Paragon Trial (reach a Paragon rank). Every 10th quest and every milestone pays DOUBLE gold, bonus Forgotten Souls and a gem from Lukus\'s own pocket',
      'Quests deeper in the ledger are gated by level (1–70 across the first 200) and then Paragon rank (up to 1000 across the last 300) — Lukus will tell you to grow a little stronger first',
      'Lukus\'s dialog is EVENED OUT — no more cramped panel box. His words and the quest board now sit directly on the black stage beside his portrait, with a ledger progress bar showing how far through the 500 you are',
      'New lifetime deed counters (elite kills, boss kills, gems combined, items crafted, enchants, chests opened) now tick on every character — old saves pick up the ledger from quest 1'
    ]
  },
  {
    v: 'v1.6.50-alpha', date: 'July 2026',
    notes: [
      'LUKUS, BRINGER OF LIGHT is now the owner\'s PAINTED KNIGHT — his full-body portrait (helmed) stands at his post by the New Haven plaza, keyed onto the cobbles as his in-town model, golden plume and all. Five portrait moods (helmed, idle, smiling, frowning, angry) are in the game\'s art files for future dialogue',
      'Walking up to Lukus turns the action button into 💬 TALK (instead of ENTER) — press it and a proper DIALOG opens: Lukus stands life-size on the right (bare-headed, idle), and a black panel on the left carries his greeting — "Good day! I am Lukus, Bringer of Light and protectorate of New Haven…" — with his quest board beneath it',
      'The quest board itself is unchanged (accept, track, turn in) — it just lives inside the conversation now, where future quests will grow'
    ]
  },
  {
    v: 'v1.6.49-alpha', date: 'July 2026',
    notes: [
      'THE ARTISAN SHOPS ARE REBUILT — walking into the Blacksmith, Jeweler or Mystic now shows the painted SHOP INTERIOR first, with a slim row of benches to choose from. Open a bench, close it, and you\'re back in the shop looking at the art; close that and you\'re back on the street',
      'BLACKSMITH: four benches — SALVAGE (bulk breakdown), CRAFT WEAPON, CRAFT ARMOR & JEWELRY, and CRAFT TORCHES',
      'JEWELER: five benches — SOCKET A GEM (pick any socketed gear, equipped or bagged), UNSOCKET (always free, full scrolling list), MERGE GEMS (with gem-type filters and tier sorting), SELL GEMS, and CRAFT A GEM (choose the exact stone type, cut fresh for gold)',
      'MYSTIC: ENCHANT GEAR plus a whole cosmetic wardrobe — choose a PET (Skull Wisp, Bone Raven or Crypt Cat — it trails you through town and the wilds), choose WINGS (Bone, Shadow or Ember — worn on your back in every view), and choose a THEME (Bone, Blood, Arcane or Royal — re-tints every menu and button in the game)',
      'NEW NPC — LUCAS, BRINGER OF LIGHT: a knight standing watch by the New Haven plaza. He offers repeatable quests (Cull the Dead · Face the Guardian · Feed the Forge) with gold, Forgotten Souls and XP for each turn-in. A golden ! floats over him when he has work; a green ✓ when you\'re owed a reward'
    ]
  },
  {
    v: 'v1.6.48-alpha', date: 'July 2026',
    notes: [
      'BUG-FIX PASS — ten fixes from a full-code audit:',
      'Possession fixed for real: your spears and lances now fly straight THROUGH your possessed thrall and hit the enemies behind it (they used to vanish on it for zero damage), your minions no longer waste their attacks pounding on your own thrall, charming a foe extinguishes your burning/poison on it, and a charmed rare elite still yields its rift progress orbs when the charm ends',
      'Paragon "Attack Speed" now grants REAL attack speed (faster casts AND faster minions) — it was secretly just bonus damage',
      'Paragon "Undo last" now always refunds the exact point you last spent (it could hand back the wrong stat)',
      'The ONWARD/CAVE portal can no longer generate in water or inside a wall (it always finds real ground now)',
      'Rebinding a key onto W/A/S/D or the arrows is refused with a clear message — it used to silently break movement until reload',
      'Holding the attack button while a menu opened no longer machine-guns your primary when the menu closes',
      'Devouring Aura and Aura of Frailty unlock at their intended levels (22 / 30 — a table was overriding them to 42 / 45)',
      'Town vendors in New Haven now RESTOCK when you return at a new level (or after 10 minutes) — no more level-20 shelves at level 70',
      'The stylesheet is now cache-busted with every deploy like the scripts (style changes could go stale for returning players)'
    ]
  },
  {
    v: 'v1.6.47-alpha', date: 'July 2026',
    notes: [
      'The town is reborn as NEW HAVEN — a fresh hand-painted map with clean, label-free buildings. Pathways are open; buildings, the fountain and the walls are solid',
      'NEW DOOR SYSTEM: no more glowing circles or menus popping open as you walk. Stand at a doorway and an ENTER button appears where your primary skill sits (bottom-right) — press it to step inside. While inside, the same button flips to EXIT to leave. (The primary-attack key works too)',
      'Homes found for everyone: the Blacksmith works the open forge, the Jeweler keeps the grand manor, the Mystic haunts the purple-lit chapel, the Stash fills the small chapel by the gate, the Horadric\'s Cube rests on its stone plinth — and the leftover buildings house the Weapons, Armor, Apothecary and General Goods vendors',
      'TWO WAYPOINTS: the BLUE waypoint (northwest) carries you to Bounties, Story Acts and Adventure Mode; the PURPLE waypoint (northeast) to Rifts, Nephalem Rifts and Seasons',
      'TOWN PORTALS NOW LEAD HERE: stepping through a town portal takes you to New Haven itself — no more menu. Your fight waits, frozen, exactly as you left it; walk back through the town gate to RETURN to it (the portal then collapses and starts its cooldown)',
      'Also fixes a nasty bug where browsing a town-portal merchant could permanently break entering the town for the rest of the session'
    ]
  },
  {
    v: 'v1.6.46-alpha', date: 'July 2026',
    notes: [
      'Attack Speed now commands your ARMY too — the +% Attack Speed on your gear speeds up your minions\' attacks (skeletons, mages, golem), not just your own Primary/Secondary casts and channeled Siphon Blood. At +50% attack speed a skeleton swings in 0.5s instead of 0.75s. Attack Speed is finally worth building for a summoner'
    ]
  },
  {
    v: 'v1.6.45-alpha', date: 'July 2026',
    notes: [
      'Artifacts are rarer — the Torment XVI drop chance for an Artifact is cut from 5% to 1% (that 4% rolls into Legendary instead), making a red Artifact a true prize'
    ]
  },
  {
    v: 'v1.6.44-alpha', date: 'July 2026',
    notes: [
      'The Blacksmith, Jeweler and Mystic menus now open over hand-painted SHOP INTERIORS — the smith\'s fire-lit forge & anvil, the jeweler\'s vault of glowing gems, and the mystic\'s candlelit chamber of purple runes — glimmering behind the menu for real atmosphere'
    ]
  },
  {
    v: 'v1.6.43-alpha', date: 'July 2026',
    notes: [
      'Cleaner town art — the Nekropolis map now uses the label-free painting, so the only building names are the game\'s own floating sign plates (no more doubled-up labels baked into the picture)'
    ]
  },
  {
    v: 'v1.6.42-alpha', date: 'July 2026',
    notes: [
      'NEKROPOLIS is now a HAND-PAINTED town map! The whole town is the owner\'s illustrated artwork — winding cobblestone streets, torchlit shops, market tents and a great gate — and you walk right across it',
      'Every building on the painting is live: Blacksmith · Jeweler · Mystic · Stash · Inventory · Horadric\'s Cube (once found) · and SIX merchants — Weapons, Armor, Apothecary, General Goods, Food & Drink and Miscellaneous, each with its own wares. Walk up to a building to enter it',
      'The glowing blue waypoint in the square (and the one up top) take you out to the Wilds; a ☰ MENU button opens Skills / Paragon / Character / Settings'
    ]
  },
  {
    v: 'v1.6.41-alpha', date: 'July 2026',
    notes: [
      'A WALKABLE TOWN — "Nekropolis"! From the camp hub tap 🏰 VISIT TOWN and you now WALK around a real hand-drawn town instead of a menu. Stroll up to a shopfront and it opens automatically',
      'The town holds it all: the Blacksmith, Jeweler and Mystic; your Stash and Inventory; the Horadric\'s Cube (once you\'ve found it); and FOUR different merchants along the market street — a Weaponsmith, an Armorer, a Trinketeer (rings & amulets) and a Curio Peddler — each stocking different wares',
      'A central campfire ("Adventurer\'s Rest") opens the menu hub for Skills, Paragon, Character and Settings, and the great stone Gate takes you out to the Wilds to adventure',
      'Hand-drawn Diablo-style buildings with glowing windows, a smith\'s forge & anvil, a floating arcane orb, a gem-lit jeweler, an iron vault, market awnings, houses with chimney smoke, a fountain, lamps and trees. Walk with the joystick (or WASD)'
    ]
  },
  {
    v: 'v1.6.40-alpha', date: 'July 2026',
    notes: [
      'ELEMENTAL DAMAGE TYPES — every hit now has an element (Physical, Cold, Fire, Lightning, Poison). Damage numbers are tinted by element, and each element does something: COLD chills (slows), FIRE sets a burning damage-over-time, POISON festers as a lingering DoT, LIGHTNING can shock (briefly stun)',
      'Skills are typed: Death Nova is Poison, and cold-themed runes (Frost Spikes, Frost Scythe, Crystallization, Dead Cold, Ice Golem, Freezing Grasp, Frozen Army/Lands) convert their skill to COLD. The skill chooser now shows each skill\'s current element',
      'Monsters can RESIST an element (take half): Fallen Imps & the Sand Wyrm resist Fire, armoured Soldiers/Knights & the Skeleton King resist Physical, Corpse Bloats resist Poison, and Wraiths resist Cold — so your damage type matters',
      'New gear affix: +% Elemental Damage (boosts your Cold/Fire/Poison/Lightning hits). Shown on the Character Sheet, rerollable within the Offense group'
    ]
  },
  {
    v: 'v1.6.39-alpha', date: 'July 2026',
    notes: [
      'SAVE EXPORT / IMPORT — back up a hero or move it to another browser or device. Settings ▸ SAVES now has EXPORT CODE (copies a save code to your clipboard) and IMPORT CODE (paste one in to restore that hero). The code is a compact text string; importing REPLACES your current hero'
    ]
  },
  {
    v: 'v1.6.38-alpha', date: 'July 2026',
    notes: [
      'THE LAST RUNE IS IN — Bone Spirit · Possession now works: the spirit seizes a normal foe and MIND-CONTROLS it for 15 seconds. Your new thrall hunts down other monsters and beats them for you (its own damage, and it can\'t be hurt by your attacks), then collapses into a usable corpse when the charm ends',
      'Possession is expensive — casting it spends ALL of Bone Spirit\'s stored charges (as in D3). Bosses and unique enemies are too strong to control and just take the hit instead',
      'A possessed foe wears a pulsing purple ring and a soul-wisp with a draining timer arc so you can always tell your thrall from the enemy — and your own auto-aim skills ignore it. All 21 Necromancer skills now have every rune implemented'
    ]
  },
  {
    v: 'v1.6.37-alpha', date: 'July 2026',
    notes: [
      'Torches now STACK in your inventory — forging several of the same type shows one "Wood Torch ×3" entry instead of a row each. Equipping one peels a single torch off the pile; a torch you\'ve already lit (partly burnt) keeps its own entry so its fuel is tracked separately'
    ]
  },
  {
    v: 'v1.6.36-alpha', date: 'July 2026',
    notes: [
      'Zone/boss banners no longer run off the screen on phones — a long land name or subtitle now shrinks and then WRAPS to a second line, always staying inside the margins'
    ]
  },
  {
    v: 'v1.6.35-alpha', date: 'July 2026',
    notes: [
      'Act uniques moved DEEPER: the Bloodtide Blade now drops from the ACT 5 boss and the Scythe of the Cycle from the ACT 10 boss (guaranteed the first clear, 50% after) — the Ring of Royal Grandeur stays on Act 1',
      'FOUR more D3 stats now roll on gear as real affixes (previously gem-only): Crit Damage, Cooldown Reduction, Resource Cost Reduction and Life per Hit. They stack on top of any gem sources and show on the Character Sheet',
      'Mystic groups: Crit Damage & Cooldown Reduction reroll within Offense, Life per Hit within Defense, Resource Cost Reduction within Utility'
    ]
  },
  {
    v: 'v1.6.34-alpha', date: 'July 2026',
    notes: [
      'Intelligence & Vitality are now UNCAPPED on items — just like Paragon, they have no ceiling and keep climbing with item level, rarity and ★ (the old 3000 INT / 4000 VIT caps are gone)',
      'PARAGON REBUILT, D3-style: points are now spent ONE AT A TIME, and each must go into the currently-unlocked category, cycling Core → Defense → Offense → Utility → Core… You choose which stat inside that category, then the rotation advances to the next one',
      'The Paragon screen shows a "▶ Now spending in: <category>" banner and marks the unlocked category tab with ✦; the + button only lights up on the unlocked category. New "↶ Undo last" (take back your most recent point) and "Reset all" (full respec) buttons replace the old ± / +10 controls',
      'Vitality, Intelligence and Life % still scale infinitely in the Paragon trees; existing characters keep every point — old free-spend builds are grandfathered into the rotation automatically'
    ]
  },
  {
    v: 'v1.6.33-alpha', date: 'July 2026',
    notes: [
      'THREE NEW ITEM STATS — the queued D3 systems are in: ATTACK SPEED, INTELLIGENCE and VITALITY now roll on gear as real affixes',
      'Attack Speed — makes your Primary & Secondary attacks fire faster (shortens their cooldowns); stacks with the Frost Scythe / Crystallization Haste runes. Caps at +75%',
      'Intelligence — the Nekromancer\'s MAIN stat: every point adds +0.1% damage (up to +300% at the artifact-5★ ceiling of 3000 INT), folded straight into your damage multiplier',
      'Vitality — every point adds +5 Life (up to +20,000 at the 4000 VIT ceiling)',
      'All three obey the same affix caps by rarity/★, roll from the normal loot pool, and can be Mystic-rerolled within their group (INT & Attack Speed = Offense, Vitality = Defense). The Character Sheet and the equipment-wheel readout now list them'
    ]
  },
  {
    v: 'v1.6.32-alpha', date: 'July 2026',
    notes: [
      'Top Down: the Nekromancer now shows a real SIDE PROFILE when walking left or right — the hood grows a beak pointing the way you travel, the eyes converge to a single leading eye, and the silhouette narrows — instead of the old idle-looking mirrored front pose',
      'Top Down: turning between any two directions (left↔up, left↔down, side↔front, etc.) now morphs FLUIDLY. Every part of the pose — face reveal, eye position, hood beak, body twist, cloak swing — is a continuous function of the (smoothed) facing angle, so there\'s no more snapping or jank as you change direction'
    ]
  },
  {
    v: 'v1.6.31-alpha', date: 'July 2026',
    notes: [
      'RUNES — Batch 3: the runes that needed brand-new stat plumbing now work, headlined by a real ATTACK-SPEED system. Grim Scythe · Frost Scythe and Bone Spear · Crystallization stack Haste (your primary/secondary fire faster); Crystallization also drags DOWN the foe\'s attack speed on hit',
      'Devour runes: Satiated (each corpse eaten adds +2% max Life for a while) and Voracious (each corpse cuts Essence costs), plus Ruthless (eating a summoned minion refunds Essence)',
      'Bone Armor runs: Thy Flesh Is Weak (+10% Life regen per stack), Harvest of Anguish, and Limited Immunity (brief crowd-control immunity so you can\'t be chain-stunned)',
      'Curse upgrades: Decrepify · Wither (+40% damage reduction while it lingers) and Opportunist (move faster near cursed foes); Leech · Osmosis (regen per cursed foe), Cursed Ground (a lingering pool that heals you 1%/s for every enemy standing in it), and Blood Flask (a cursed enemy\'s death shaves 1s off your potion cooldown); Frailty · Scent of Blood (your minions hit cursed targets +15% harder)',
      'Blood Rush · Potency now grants a brief 25% damage-reduction bubble after you dash'
    ]
  },
  {
    v: 'v1.6.30-alpha', date: 'July 2026',
    notes: [
      'Top Down: the Nekromancer now turns to face the way it moves — front (with glowing eyes) toward the camera, its BACK when heading away, and left/right — and its cloak trails behind in the direction of travel',
      'Top Down: the torch light & fog-of-war now centre on the hero\'s HEAD, not its feet, so the head is never left sitting in the dark',
      'Minions protect the Nekromancer FIRST — they only strike foes that come near HIM (not homing across the map at distant enemies), and any minion that strays too far (stuck pathing / lost after a portal) snaps back to your side quickly',
      'Torch crafting colours now match the inventory (rarity colours): Common = White, Uncommon = Green, Magic = Blue, Rare = Yellow, Epic = Purple, Legendary = Orange'
    ]
  },
  {
    v: 'v1.6.29-alpha', date: 'July 2026',
    notes: [
      'RUNES — Batch 2: 20 more runes now actually work. Bone Spikes (Path of Bones line strike), Bone Spear (Teeth 5-shard fan · Shatter burst · Blighted Marrow ramp), Siphon Blood (Suppress slow · Drain Life big heal · Purity of Essence · Blood Sucker globe-pull), Death Nova (Unstable Compound growing nova), Corpse Explosion (Shrapnel debris cone · Final Embrace crawl-to-foe), Devour (Cannibalize heal), Bone Armor (Vengeful Arms 145%), Decrepify (Dizzying Curse stun · Borrowed Time cooldown-per-curse), Frailty (Harvest Essence · Volatile Death corpse-bomb · Early Grave 18% execute), Leech (Sanguine End heal-on-death · Transmittable curse-spread)',
      'Still pending: a handful of runes that need systems the engine doesn\'t have yet (Attack Speed for Crystallization & Frost Scythe) or new stacking buffs — coming in a later batch'
    ]
  },
  {
    v: 'v1.6.28-alpha', date: 'July 2026',
    notes: [
      'Command Skeletons & Command Golem now AUTO-SUMMON: slot the skill and your 7 skeletons / golem rise to guard you the moment you enter a land, and any that fall are raised again on their own (no essence, no casting to summon)',
      'The Command Skeletons / Command Golem button is now purely the RUNE COMMAND (order the warband to strike, trigger the golem\'s active) on its cooldown — and Command Skeletons no longer costs essence'
    ]
  },
  {
    v: 'v1.6.27-alpha', date: 'July 2026',
    notes: [
      'Diving ONWARD is now MUCH harder — new per-depth difficulty: Depth 1 = 2×, 2 = 3×, 3 = 4×, 4 = 6×, 5 = 8×, 6 = 10×, 7 = 13×, 8 = 16×, 9 = 19×, 10 = 25×, 11 = 30×, 12 = 40× the surface (HP, damage and XP), on top of your Torment tier',
      'Slaying a boss on a deeper floor now drops a DEPTH CACHE that scales with how deep you are — the deepest floor (Depth 12) pays out 6× a Horadric cache: piles of gold, Forgotten Souls, gems, and guaranteed named legendaries'
    ]
  },
  {
    v: 'v1.6.26-alpha', date: 'July 2026',
    notes: [
      'Corpse Explosion is now a proper chain reaction: each corpse gets SUCKED inward then BURSTS outward, detonating one after another from the middle of the pile outward — pure ASMR',
      'Corpse Explosion damage increased by 2%'
    ]
  },
  {
    v: 'v1.6.25-alpha', date: 'July 2026',
    notes: [
      'Top Down: the Nekromancer is now drawn as a proper upright figure facing the camera — hooded head with glowing eyes ON THE FACE (no more eyes on top of the skull), a robe shaded with gradients for real depth, bone shoulder pauldrons, and the eye-coloured staff crystal. Bird\'s Eye keeps its original straight-down sprite'
    ]
  },
  {
    v: 'v1.6.24-alpha', date: 'July 2026',
    notes: [
      'Bone Spikes now has a 0.5s cooldown (no longer instant)'
    ]
  },
  {
    v: 'v1.6.23-alpha', date: 'July 2026',
    notes: [
      'Top Down view reworked into a proper Diablo-3-style angle: the GROUND is tilted/foreshortened while every character stands UPRIGHT — so your skeletons walk on two feet on the floor instead of being squashed flat or floating around you',
      'Stronger tilt for that isometric dungeon-crawl feel. Bird\'s Eye (the original view) is completely unchanged'
    ]
  },
  {
    v: 'v1.6.22-alpha', date: 'July 2026',
    notes: [
      'NEW — Camera view toggle (Settings ▸ Gameplay): choose BIRD\'S EYE (the classic straight-down view) or TOP DOWN — a closer, Diablo-3-style tilted-down angle that\'s more personal with the monsters, bosses and environment',
      'Top Down zooms in and adds a gentle vertical tilt; aiming, the torch light, fog-of-war and the objective chevron all stay accurate under the new angle'
    ]
  },
  {
    v: 'v1.6.21-alpha', date: 'July 2026',
    notes: [
      'Toast messages now wrap onto multiple lines instead of running off the edges of the screen — long notifications (like the full-screen guidance) are fully readable',
      'Confirmed: Orion on iOS doesn\'t let web pages trigger full screen, so the toggle points you to Add to Home Screen (which launches the game chrome-free)'
    ]
  },
  {
    v: 'v1.6.20-alpha', date: 'July 2026',
    notes: [
      'The Full screen toggle now appears on all phones/tablets (it wasn\'t showing in Orion because that browser doesn\'t advertise the fullscreen API up front). Tapping it enters full screen where the browser allows it, or points you to Add to Home Screen if it doesn\'t'
    ]
  },
  {
    v: 'v1.6.19-alpha', date: 'July 2026',
    notes: [
      'Full screen now works on iOS browsers that support it — Orion and Chromium/Blink builds — not just Android/desktop. (Plain iPhone Safari still can\'t, so the toggle stays hidden there; use Add to Home Screen.)',
      'Detection is broader (checks the page and the game canvas) and falls back to fullscreen-ing the canvas for browsers that only allow element-level fullscreen'
    ]
  },
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
      'Fixed the Hidden Cave objective reading "Bounty: slay undefined" — it now names its dweller, Bellmahath\'s Chosen',
      'Slaying Bellmahath\'s Chosen in the Hidden Cave now opens the portal out (and shows a proper boss bar) — before, killing it left you trapped',
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
      'Spawning reagent bosses is now three separate buttons — Bonewyrm, Gluttonous Brain and Bellmahath\'s Chosen summon individually instead of all at once'
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
      'Horadric\'s Cube: the Instruction Leaflet now lists your Parts/Dust/Crystals/Souls at the top, "Instruction of Bellmahath" is the header, the placeholder icon is gone, and you can now run FOUR extracted powers at once (was 3)',
      'The 6-piece Grace of Inarius BONE TORNADO is now huge and pronounced — a wide whirling circle of bone shards that grinds everything (and all the scenery) to bits',
      'The Pause menu\'s abandon button now names the mode: Abandon Story Mode / Rift / Nephalem Rift / Set Dungeon / Adventure Mode / Bounty',
      'Tidied The Wilds: removed the point/key flavor from Nephalem Rift and Seasons',
      'Skills of Bellmahath and Passives screens are noticeably bigger on desktop'
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
      'HORADRIC\'S CUBE — Instruction of Bellmahath: the Cube can now EXTRACT a legendary power from a loose item in your bag (not equipped, not stashed) for 30 Parts / 50 Dust / 50 Crystals / 3 Souls, banking it forever (the item is consumed)',
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
      'Bellmahath\'s Chosen now lurks inside the rare CAVE — a real hidden dungeon you enter, not an abstract spawn'
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
      'RATHMA\'S CHOSEN — a tall, slender assassin who fades to smoke while you damage it and enrages at 35% (+20% life, +25% dmg). Lurks in a super-rare cave (3% of maps) and drops 1-3 Souls of Bellmahath (20%)',
      'Dev panel: "Spawn reagent bosses near you" summons all three for testing'
    ]
  },
  {
    v: 'v1.2.3-alpha', date: 'July 2026',
    notes: [
      'TORCH LADDER expanded to SEVEN tiers: Wood (Common, r60) · Iron (Uncommon, r110) · NEW Wyrm-bound (Magic, r180) · Nephalem (Rare, r250) · NEW Master\'s Light (Epic, r350) · NEW Nekromancer\'s (Legendary, r500)',
      'Three new crafting reagents — Wyrm Scale, Gluttonous Brain and Soul of Bellmahath — feed the top torches (their boss drop-sources are coming next)',
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

// Crafting-reagent DISPLAY renames (owner list v1.7.15): Glittering Dust /
// Arcane Powder / Golden Crystal / Twisted Souls — internal keys unchanged.
const MATERIALS = {
  parts:   { name: 'Glittering Dust', color: '#c9bfa8' },
  dust:    { name: 'Arcane Powder',   color: '#6a9aff' },
  crystal: { name: 'Golden Crystal',  color: '#ffd76a' },
  soul:    { name: 'Twisted Souls',   color: '#ff8c2a' },
  // Torch-crafting reagents.
  lumber:      { name: 'Lumber',                color: '#8a6f4a' },
  rivets:      { name: 'Iron Rivets',           color: '#9aa0a8' },
  heartstring: { name: 'Nephalem Heartstring',  color: '#b06adf' },
  wyrmscale:   { name: 'Wyrm Scale',            color: '#4ea3c0' },   // roaming Wyrm boss (12%)
  brain:       { name: 'Gluttonous Brain',      color: '#d0708c' },   // Gluttonous Brain ogre boss (10%)
  rathmasoul:  { name: 'Soul of Bellmahath',        color: '#c88bf0' }    // rare caves + Bellmahath assassin (20%, 1–3)
};

// Torches — a consumable equipped in the Torch slot that lights the darkness
// for a real-time duration, then burns out. Crafted at the Blacksmith.
// Each torch carries a display tier (name + colour) since the ladder — Common,
// Uncommon, Magic, Rare, Epic, Legendary — is finer than the gear rarity list.
// `rarity` is the numeric order (sorting); `tier`/`tierColor` drive the label.
const TORCH_TYPES = {
  // Radii rebuilt v1.7.15 (owner spec): no-torch doubled to 40, Wood 20%
  // over that, then every torch 20% over the one before — a ×1.2 ladder.
  wood:        { name: 'Wood Torch',           minutes: 12,  radius: 48,  color: '#ffb24a', rarity: 0, tier: 'Common',    tierColor: '#f4f4f4', recipe: { lumber: 10 } },
  iron:        { name: 'Iron Torch',           minutes: 37,  radius: 58,  color: '#ffcf6a', rarity: 1, tier: 'Uncommon',  tierColor: '#4ade80', recipe: { lumber: 10, rivets: 15 } },
  wyrmbound:   { name: 'Wyrm-bound Torch',     minutes: 55,  radius: 69,  color: '#7fe0ff', rarity: 2, tier: 'Magic',     tierColor: '#6a9aff', recipe: { lumber: 5, rivets: 10, wyrmscale: 5 } },
  nephalem:    { name: "Ascendant's Torch",       minutes: 75,  radius: 83,  color: '#d8b4f0', rarity: 3, tier: 'Rare',      tierColor: '#ffd76a', recipe: { lumber: 15, rivets: 30, heartstring: 3 } },
  masterlight: { name: "Master's Light Torch", minutes: 110, radius: 100, color: '#ffe6a0', rarity: 4, tier: 'Epic',      tierColor: '#b06adf', recipe: { rivets: 50, heartstring: 5, brain: 1 } },
  nekromancer: { name: "Nekromancer's Torch",  minutes: 180, radius: 120, color: '#c58bff', rarity: 5, tier: 'Legendary', tierColor: '#ff8c2a', recipe: { rathmasoul: 3 } }
};
// The lit/reveal radius (px) with no torch at all — deliberately tiny so the
// dark presses right in until you craft one. Torches widen it (see TORCH_TYPES).
const NO_TORCH_RADIUS = 40;   // doubled v1.7.15 (owner rule: +100%)

// The Wishing Fountain's blessings, in PLAIN WORDS (owner rule — "I have no
// idea what Essence Surges means"). Shared by the fountain screen and the
// character sheet readout.
const FOUNTAIN_BUFFS = {
  fleetfoot: 'Fleetfoot — +100% move speed, past every cap',
  empowered: 'Empowered — essence refills & regenerates twice as fast',
  frenzied:  'Frenzied — you deal +25% damage',
  blessed:   'Blessed — you take 25% less damage',
  fortune:   'Fortune — enemies drop double gold'
};

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
// Common 0 · Magic 1 · Rare 2 · Epic 3 · Legendary 4 · Set 4 · Artifact 4 ·
// Relic 4 · Ancient 5 · Mythic 5.
const MAX_SOCKETS = [0, 1, 2, 3, 4, 4, 4, 4, 5, 5];

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
  helm:     { label: 'Helm',       nouns: ['Skullcap', 'Grave Crown', 'Deathmask', 'Hood of Bellmahath'], primary: 'hp' },
  shoulders:{ label: 'Shoulders',  nouns: ['Spaulders', 'Bone Mantle', 'Grave Guards', 'Pall Pads'], primary: 'hp' },
  chest:    { label: 'Chest',      nouns: ['Shroud', 'Carapace', 'Grave Plate', 'Cadaver Mail'], primary: 'hp' },
  gloves:   { label: 'Gloves',     nouns: ['Grips', 'Bonefists', 'Corpsehands', 'Reaping Claws'], primary: 'crit' },
  legs:     { label: 'Legs',       nouns: ['Greaves', 'Tomb Leggings', 'Marrow Wraps', 'Cerecloth Pants'], primary: 'hp' },
  boots:    { label: 'Boots',      nouns: ['Treads', 'Gravewalkers', 'Marrow Striders', 'Tomb Boots'], primary: 'hp' },
  amulet:   { label: 'Amulet',     nouns: ['Amulet', 'Death Locket', 'Vial Pendant', 'Bellmahath Charm'], primary: 'crit' },
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
  name: 'Blood Moon of the Grace of Inarius',
  desc: 'Requires an Ashen Key — slay Abyss Guardians to earn one. Gather 1000 points across the linked maps, then claim all six pieces of the Grace of Inarius.'
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
  // Core D3 attributes + Attack Speed (owner-queued stat systems).
  // Intelligence — the Necromancer's MAIN stat: each point adds a little damage.
  int:   { base: 14,   label: v => `+${Math.round(v)} Intelligence` },
  // Vitality — each point adds flat Life.
  vit:   { base: 12,   label: v => `+${Math.round(v)} Vitality` },
  // Attack Speed — % faster Primary/Secondary attacks (shorter cooldowns).
  atkSpeed: { base: 0.04, label: v => `+${(v * 100).toFixed(1)}% attack speed` },
  // Combat stats that used to come ONLY from gems, now rollable on gear too. They
  // share the SAME player fields as the gems (they simply add on top).
  critDmg: { base: 0.05,  label: v => `+${Math.round(v * 100)}% crit damage` },
  cdr:     { base: 0.015, label: v => `+${Math.round(v * 100)}% cooldown reduction` },
  rcr:     { base: 0.015, label: v => `+${Math.round(v * 100)}% resource cost reduction` },
  lph:     { base: 60,    label: v => `+${Math.round(v)} life per hit` },
  elem:    { base: 0.06,  label: v => `+${Math.round(v * 100)}% elemental damage` },   // Cold/Fire/Poison/Lightning hits
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
  offense: ['dmg', 'crit', 'ess', 'int', 'atkSpeed', 'critDmg', 'cdr', 'elem'],  // + crit damage, cooldown reduction, elemental damage
  defense: ['hp', 'armor', 'reg', 'vit', 'lph'],                        // + life per hit
  utility: ['gold', 'move', 'rcr']                                      // + resource cost reduction
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
  // Intelligence & Vitality are UNCAPPED (owner rule) — like Paragon, they have
  // no ceiling and keep scaling with item level/rarity/★ (absent from this table
  // → affixCap() returns Infinity, so nothing clamps them).
  atkSpeed: 0.75, // 75% attack speed (kept: uncapped would zero out cooldowns)
  critDmg: 5.0,   // +500% crit damage
  cdr: 0.20,      // +20% cooldown reduction per item (total capped 60% in computeStats)
  rcr: 0.20,      // +20% resource cost reduction per item (total capped 60%)
  lph: 60000,     // 60000 life per hit
  elem: 5.0,      // +500% elemental damage
  dnova: 6.0, area: 1.5   // signature affixes — generous
};
// Fraction of the Artifact-5★ ceiling a given rarity/star tier can reach (so a
// legendary can't roll artifact-grade numbers). Artifact 5★ = 1.0. The Crypt
// rarities (v1.7.8) tower ABOVE that old ceiling by design — a Relic 0★
// already beats an Artifact 5★, and a Mythic 5★ reaches 5.1× it.
function affixTierFrac(rarity, stars) {
  if (rarity >= 7) {
    const over = [1.5, 2.4, 3.6][rarity - 7] || 1.5;
    return over + (stars || 0) * 0.3;
  }
  const base = [0.12, 0.18, 0.26, 0.40, 0.58, 0.70, 0.80][rarity];
  return clamp((base === undefined ? 0.12 : base) + (stars || 0) * 0.04, 0.05, 1.0);
}

const LEGENDARY_PREFIX = ["Maltorius'", "The Widow's", "Bellmahath's", "Xul's", "Trag'Oul's", "Mendeln's"];
// The Crypt rarities bear their own naming voices (v1.7.8).
const RELIC_PREFIX   = ['Void-Touched', 'Star-Forged', 'Deep-Sunken', "The Drowned King's", 'Athanor'];
const ANCIENT_PREFIX = ['First-Age', 'Primeval', 'Elder', 'Antediluvian', 'Worldroot'];
const MYTHIC_PREFIX  = ['Mythborn', 'Godwoven', "Worldshaper's", "Dawnbreaker's", 'Unmade'];
const EPIC_PREFIX = ['Fabled', 'Mythic', 'Hallowed', 'Abyssal', 'Deathless', 'Umbral'];
const RARE_PREFIX = ['Cruel', 'Vicious', 'Dread', 'Baleful', 'Sinister', 'Woeful'];
const MAGIC_PREFIX = ['Sturdy', 'Sharp', 'Grim', 'Cold', 'Hungry', 'Pale'];

// ----------------------------- skill catalog -------------------------------
// The authentic D3 Necromancer actives with their real unlock levels.
// Categories: primary, secondary, blood (Blood & Bone), curse, corpse, reanim.
// Behavior functions live in skills.js keyed by id.

const SKILL_DATA = [
  { id: 'boneSpikes',      name: 'Bone Spikes',       cat: 'primary',   lvl: 1,  cost: 0,  gain: 18, cd: 0.5 },
  { id: 'boneSpear',       name: 'Bone Spear',        cat: 'secondary', lvl: 2,  cost: 20, cd: 2 },
  { id: 'grimScythe',      name: 'Grim Scythe',       cat: 'primary',   lvl: 3,  cost: 0,  gain: 12, cd: 0.4 },
  { id: 'corpseExplosion', name: 'Corpse Explosion',  cat: 'corpse',    lvl: 4,  cost: 8,  cd: 3 },
  { id: 'skeletalMage',    name: 'Skeletal Mage',     cat: 'secondary', lvl: 19, cost: 40, cd: 10 },
  { id: 'corpseLance',     name: 'Corpse Lance',      cat: 'corpse',    lvl: 28, cost: 15, cd: 0.5 },
  { id: 'commandSkeletons',name: 'Command Skeletons', cat: 'reanim',    lvl: 9,  cost: 0,  cd: 25 },
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
  // A rune with a HAND-SET lvl (the Devour/Frailty auras: 22/30) keeps it — the
  // positional table only fills in the ones that don't specify their own.
  if (list) RUNE_UNLOCKS[id].forEach((lv, i) => { if (list[i + 1] && list[i + 1].lvl === undefined) list[i + 1].lvl = lv; });
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
  imp:      { name: 'Fallen Imp',     hp: 12,  speed: 118, dmg: 6,  r: 9,  xp: 8,  atkRange: 24, atkCd: 0.8, resist: 'fire' },
  cultist:  { name: 'Blood Cultist',  hp: 34,  speed: 62,  dmg: 12, r: 13, xp: 22, atkRange: 420, atkCd: 2.4, ranged: 'bolt' },
  // --- heavier war-host monsters ---
  hound:    { name: 'Gore Hound',     hp: 30,  speed: 172, dmg: 12, r: 11, xp: 20, atkRange: 30, atkCd: 0.9, lunges: true },
  soldier:  { name: 'Damned Soldier', hp: 95,  speed: 74,  dmg: 18, r: 15, xp: 30, atkRange: 40, atkCd: 1.4, armored: true, sword: true, resist: 'physical' },
  knight:   { name: 'Fallen Knight',  hp: 175, speed: 60,  dmg: 27, r: 18, xp: 50, atkRange: 52, atkCd: 1.8, armored: true, sword: true, cleave: true, resist: 'physical' },
  bloat:    { name: 'Corpse Bloat',   hp: 130, speed: 34,  dmg: 16, r: 22, xp: 36, atkRange: 40, atkCd: 1.6, explodes: 150, resist: 'poison' },
  catapult: { name: 'Bone Catapult',  hp: 210, speed: 9,   dmg: 30, r: 24, xp: 62, atkRange: 640, atkCd: 3.6, siege: true },
  mongrel:  { name: 'Nephalem Mongrel', hp: 160, speed: 150, dmg: 22, r: 16, xp: 70, atkRange: 32, atkCd: 1.0, lunges: true, dropsHeartstring: true },
  brute:    { name: 'Grave Brute',    hp: 300, speed: 46,  dmg: 24, r: 26, xp: 110, atkRange: 46, atkCd: 1.7, boss: true },
  // Treasure Goblin: never attacks, flees once hit, ~10x a normal monster's
  // life, spills gold while chased and bursts loot on death.
  goblin:   { name: 'Treasure Goblin', hp: 50, speed: 178, dmg: 0, r: 16, xp: 40, atkRange: 0, atkCd: 99, goblin: true, hpMul: 10 },
  // Story Mode bosses: the 10 named legendary ghost lords, then the King.
  wraith:   { name: 'Vengeful Wraith', hp: 240, speed: 78, dmg: 21, r: 22, xp: 130, atkRange: 44, atkCd: 1.6, boss: true, ghost: true, resist: 'cold' },
  skeletonking: { name: 'The Skeleton King', hp: 520, speed: 54, dmg: 30, r: 30, xp: 240, atkRange: 54, atkCd: 1.8, boss: true, resist: 'physical' },
  // Act III finale — a colossal burrowing desert serpent.
  sandwyrm: { name: 'The Sand Wyrm', hp: 640, speed: 60, dmg: 34, r: 34, xp: 300, atkRange: 60, atkCd: 1.7, boss: true, resist: 'fire' },
  // --- Phase-2 reagent bosses ------------------------------------------------
  // The Bonewyrm roams eligible modes and drops Wyrm Scales (12%).
  wyrm:    { name: 'The Bonewyrm',         hp: 720, speed: 66, dmg: 34, r: 34, xp: 340, atkRange: 60, atkCd: 1.7,
             boss: true, roamBoss: true, dropMat: 'wyrmscale', dropChance: 0.12, dropN: [1, 1] },
  // A huge, huge, HUGE fat ogre: vomits AoE, summons fat zombies, chain-pulls
  // and stuns, and enrages at half health. Drops Gluttonous Brain (10%).
  glutton: { name: 'The Gluttonous Brain', hp: 980, speed: 30, dmg: 30, r: 44, xp: 440, atkRange: 64, atkCd: 2.0,
             boss: true, roamBoss: true, enrageAt: 0.5, enrageDmg: 0.15, enrageHp: 0.10,
             dropMat: 'brain', dropChance: 0.10, dropN: [1, 1] },
  // Bellmahath's Chosen: a tall, slender assassin who stealths (goes to smoke) while
  // you damage it, enrages at 35%, and drops 1-3 Souls of Bellmahath (20%).
  rathma:  { name: "Bellmahath's Chosen",      hp: 150, speed: 150, dmg: 26, r: 15, xp: 320, atkRange: 34, atkCd: 1.0,
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

// Hair colors (owner art sheets): index = Hero.hair. `art` is the filename
// suffix for docs/art/hero/{m,f}_{front,back}<art>.webp — '' (index 0, Black)
// is the original full-res painting; _h1.._h8 are the sheet variants.
const HAIR_COLORS = [
  { name: 'Black',  hex: '#23202a', art: '' },
  { name: 'Ember',  hex: '#d96a1c', art: '_h1' },
  { name: 'Blood',  hex: '#9c1f1f', art: '_h2' },
  { name: 'Violet', hex: '#5f2a8f', art: '_h3' },
  { name: 'White',  hex: '#e4e0d4', art: '_h4' },
  { name: 'Silver', hex: '#a9adb5', art: '_h5' },
  { name: 'Gold',   hex: '#c9990f', art: '_h6' },
  { name: 'Green',  hex: '#2c7a2a', art: '_h7' },
  { name: 'Blue',   hex: '#2c3f7d', art: '_h8' }
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
    id: 'rathma', name: 'Ruins of Bellmahath', kind: 'dungeon', mLvl: 23,
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
  { name: 'Apprenticeship', mult: 1.0, reward: 1.0, legBonus: 0, enemyMult: 1.0 },
  { name: 'Disciple', mult: 1.6, reward: 1.35, legBonus: 0, enemyMult: 1.1 },
  { name: 'Adept', mult: 2.6, reward: 1.8, legBonus: 0, enemyMult: 1.2 },
  { name: 'Master', mult: 4.2, reward: 2.4, legBonus: 0, enemyMult: 1.3 }
].concat(ROMANS.map((numeral, i) => ({
  name: 'Ascendant ' + numeral,
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

// ---------------------------------------------------------------- RENOWN
// (Renamed from Paragon, owner rule v1.7.8 — internal keys/ids unchanged.)
// Past level 70 the hero earns RENOWN levels; each grants one Nekromancer
// Point (NP) to spend across four trees. `per` = bonus per point, `max` =
// point cap (0 = infinite). Percentages are stored as fractions.
// Tabs (owner names v1.7.8): Might · Warfare · Fortitude · Cunning
// (formerly Core · Offense · Defense · Utility). PARAGON_ROTATION remains
// only for syncParaOrder's legacy-save rebuild.
const PARAGON_CATS = ['Might', 'Warfare', 'Fortitude', 'Cunning'];
const PARAGON_ROTATION = PARAGON_CATS;
// v1.7.1 owner caps: EVERYTHING caps at 50 points except Intelligence /
// Vitality / Life% (uncapped, but Int & Vit slow to 0.5%/pt). Maximum
// Mana is renamed MAXIMUM ESSENCE.
const PARAGON_STATS = {
  // Might (formerly Core)
  vitality:     { cat: 'Might',     label: 'Vitality',           per: 0.005, max: 0,  fmt: 'pct', note: 'Life' },
  intelligence: { cat: 'Might',     label: 'Intelligence',       per: 0.005, max: 0,  fmt: 'pct', note: 'Damage' },
  moveSpeed:    { cat: 'Might',     label: 'Movement Speed',     per: 0.005, max: 50, fmt: 'pct', note: 'Move Speed' },
  maxMana:      { cat: 'Might',     label: 'Maximum Essence',    per: 0.02,  max: 50, fmt: 'pct', note: 'Max Essence' },
  // Warfare (formerly Offense)
  attackSpeed:  { cat: 'Warfare',   label: 'Attack Speed',       per: 0.005, max: 50, fmt: 'pct', note: 'Attack Speed' },
  paraCritDmg:  { cat: 'Warfare',   label: 'Crit Hit Damage',    per: 0.002, max: 50, fmt: 'pct', note: 'Crit Damage' },
  paraCritChance:{ cat: 'Warfare',  label: 'Crit Hit Chance',    per: 0.005, max: 50, fmt: 'pct', note: 'Crit Chance' },
  paraCdr:      { cat: 'Warfare',   label: 'Cooldown Reduction', per: 0.005, max: 50, fmt: 'pct', note: 'Cooldowns' },
  // Fortitude (formerly Defense)
  paraArmor:    { cat: 'Fortitude', label: 'Armor',              per: 0.01,  max: 50, fmt: 'pct', note: 'Armor' },
  lifePct:      { cat: 'Fortitude', label: 'Life %',             per: 0.02,  max: 0,  fmt: 'pct', note: 'Life' },
  paraResAll:   { cat: 'Fortitude', label: 'All Resistance',     per: 0.005, max: 50, fmt: 'pct', note: 'Resist' },
  lifeRegen:    { cat: 'Fortitude', label: 'Life per Second',    per: 0.01,  max: 50, fmt: 'pct', note: 'Regen (of max Life/s)' },
  // Cunning (formerly Utility)
  paraArea:     { cat: 'Cunning',   label: 'Area Damage',        per: 0.005, max: 50, fmt: 'pct', note: 'Area Damage' },
  paraLph:      { cat: 'Cunning',   label: 'Life per Hit',       per: 0.01,  max: 50, fmt: 'pct', note: 'Life on Hit (of max Life)' },
  paraRcr:      { cat: 'Cunning',   label: 'Resource Cost',      per: 0.005, max: 50, fmt: 'pct', note: 'Cost Reduction' },
  pickup:       { cat: 'Cunning',   label: 'Pickup Radius',      per: 0.002, max: 50, fmt: 'pct', note: 'Pickup Radius' }
};
// XP to earn the NEXT paragon level — a level-70's worth, creeping up per level.
// Paragon cap (owner rule v1.7.6): 3500 levels. The climb is gentle to 250,
// then turns BRUTAL — +0.4% compounding per level, so level 3500 demands
// roughly 2.7 TRILLION XP for that single level.
const MAX_PARAGON = 3500;
const PARAGON_XP = plevel => {
  const base = XP_CURVE(70) * (1 + plevel * 0.05);
  if (plevel < 250) return Math.round(base);
  return Math.round(base * Math.pow(1.004, plevel - 250));
};

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
