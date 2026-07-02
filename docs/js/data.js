'use strict';
// ---------------------------------------------------------------------------
// Static game data: the Diablo 3 Nekromancer skill kit (real skills, real
// unlock levels), passives, equipment slots, rarities, affixes, gems,
// crafting materials, monsters and the lands of the campaign.
// ---------------------------------------------------------------------------

// ------------------------------ rarities -----------------------------------

const RARITIES = [
  { name: 'Common',    color: '#c9bfa8', mult: 1.0, salvage: 'parts',   salvageN: 2 },
  { name: 'Magic',     color: '#6a9aff', mult: 1.4, salvage: 'dust',    salvageN: 2 },
  { name: 'Rare',      color: '#ffd76a', mult: 1.9, salvage: 'crystal', salvageN: 1 },
  { name: 'Legendary', color: '#ff8c2a', mult: 2.7, salvage: 'soul',    salvageN: 1 },
  { name: 'Set',       color: '#4ade80', mult: 3.1, salvage: 'soul',    salvageN: 2 }
];

const GAME_VERSION = 'v0.0.2-alpha';

// Newest entry first. OWNER RULE: append a new entry (and bump
// GAME_VERSION) with EVERY addition and bug fix.
const PATCH_NOTES = [
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
  soul:    { name: 'Forgotten Souls', color: '#ff8c2a' }
};

// --------------------------------- gems ------------------------------------

const GEM_TIERS = ['Chipped', 'Flawed', 'Regular', 'Flawless', 'Perfect'];

const GEM_TYPES = {
  ruby:     { name: 'Ruby',     color: '#e04a5a', stat: 'dmg',  perTier: 0.05,  label: v => `+${Math.round(v * 100)}% damage` },
  emerald:  { name: 'Emerald',  color: '#4ade80', stat: 'crit', perTier: 0.025, label: v => `+${Math.round(v * 100)}% crit chance` },
  amethyst: { name: 'Amethyst', color: '#b06adf', stat: 'hp',   perTier: 22,    label: v => `+${Math.round(v)} life` },
  topaz:    { name: 'Topaz',    color: '#ffd76a', stat: 'ess',  perTier: 0.7,   label: v => `+${v.toFixed(1)} essence/s` },
  diamond:  { name: 'Diamond',  color: '#bfe8f4', stat: 'reg',  perTier: 1.1,   label: v => `+${v.toFixed(1)} life/s` }
};

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
  ring2:    { label: 'Ring',       nouns: ['Band', 'Signet', 'Knucklebone Loop', 'Death Seal', 'Wraith Coil'], primary: 'crit' }
};

// ------------------------- Season: Grace of Inarius -------------------------
// The endgame (per the D3 Inarius Death Nova build): keep Bone Armor up for
// the bone tornado, spend everything on Death Nova. Set pieces drop from
// Nephalem Rift Guardians once the hero reaches max level.

const SEASON = {
  name: 'Season of the Grace of Inarius',
  desc: 'Reach the Nephalem Rifts. Claim all six pieces of the Grace of Inarius. Become the storm of bone.'
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
    { pieces: 2, desc: 'Bone Armor damage ×10 and its shield is doubled' },
    { pieces: 4, desc: 'Bone Armor grants 3% damage reduction per enemy hit (max 60%)' },
    { pieces: 6, desc: 'Bone Armor raises a swirling bone tornado; enemies it strikes take +50% damage from you' }
  ]
};

// Legendary powers (rift loot) — the build-defining items from the guide.
const LEGENDARY_POWERS = {
  bloodtide: {
    slot: 'weapon', name: 'Bloodtide Blade',
    desc: 'Death Nova deals +8% damage per enemy near you (max 15)'
  },
  krysbin: {
    slot: 'ring1', name: "Krysbin's Sentence",
    desc: 'You deal +75% damage to slowed, rooted or decrepified enemies'
  },
  corrodedFang: {
    slot: 'weapon', name: "Trag'Oul's Corroded Fang",
    desc: 'You deal +60% damage to cursed enemies'
  }
};

const AFFIX_ROLLS = {
  dmg:  { base: 0.06, label: v => `+${Math.round(v * 100)}% damage` },
  hp:   { base: 18,   label: v => `+${Math.round(v)} life` },
  crit: { base: 0.03, label: v => `+${Math.round(v * 100)}% crit chance` },
  ess:  { base: 0.8,  label: v => `+${v.toFixed(1)} essence/s` },
  reg:  { base: 1.2,  label: v => `+${v.toFixed(1)} life/s` },
  gold: { base: 0.12, label: v => `+${Math.round(v * 100)}% gold find` }
};

const LEGENDARY_PREFIX = ["Maltorius'", "The Widow's", "Rathma's", "Xul's", "Trag'Oul's", "Mendeln's"];
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

const PASSIVE_SLOT_LEVELS = [10, 20, 30, 45];

const PASSIVE_DATA = [
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
  brute:    { name: 'Grave Brute',    hp: 300, speed: 46,  dmg: 24, r: 26, xp: 110, atkRange: 46, atkCd: 1.7, boss: true }
};

const ELITE_PREFIX = ['Blood', 'Grave', 'Doom', 'Plague', 'Dread', 'Bone'];
const ELITE_SUFFIX = ['maw', 'fang', 'howl', 'rot', 'claw', 'shriek'];

// --------------------------------- lands -----------------------------------
// The campaign: five lands, each a generated map with packs of monsters,
// shrines, chests, breakables and a unique Bounty boss. Open lands are
// wilderness; 'dungeon' lands are true wall-and-corridor crypts.

const ZONES = [
  {
    id: 'hollow', name: 'The Weeping Hollow', kind: 'open', mLvl: 1,
    ground: '#16121b', accent: '#2c4230', weather: 'rain',
    monsters: ['zombie', 'zombie', 'skeleton', 'ghoul'],
    boss: 'The Grave Warden', packs: 11,
    desc: 'A drowned graveyard where the dead refuse to rest.'
  },
  {
    id: 'crypt', name: 'Crypt of the Forsworn', kind: 'dungeon', mLvl: 5,
    ground: '#151220', accent: '#3a3448',
    monsters: ['skeleton', 'skeleton', 'archer', 'zombie'],
    boss: 'Morgral the Unburied', packs: 12,
    desc: 'Collapsed halls beneath the chapel, thick with old bones.'
  },
  {
    id: 'sands', name: 'The Desolate Sands', kind: 'open', mLvl: 10,
    ground: '#1e1812', accent: '#4a3c28', weather: 'wind',
    monsters: ['imp', 'imp', 'ghoul', 'archer', 'cultist'],
    boss: 'Sar\'Khan the Sunscoured', packs: 13,
    desc: 'A burned waste of dunes, imps and buried idols.'
  },
  {
    id: 'marsh', name: 'The Blood Marsh', kind: 'open', mLvl: 16,
    ground: '#121a16', accent: '#2c4230', weather: 'rain',
    monsters: ['zombie', 'ghoul', 'ghoul', 'cultist', 'imp'],
    boss: 'Mother of Maggots', packs: 14,
    desc: 'Rotting fens where the cult drains its offerings.'
  },
  {
    id: 'rathma', name: 'Ruins of Rathma', kind: 'dungeon', mLvl: 23,
    ground: '#141420', accent: '#3a3060',
    monsters: ['skeleton', 'archer', 'cultist', 'ghoul', 'zombie'],
    boss: 'The Bone Colossus', packs: 15,
    desc: 'The shattered sanctum of the first necromancers.'
  }
];

// Difficulty tiers, D3 style. Monsters and rewards scale together.
const DIFFICULTIES = [
  { name: 'Normal',      mult: 1.0,  reward: 1.0 },
  { name: 'Hard',        mult: 1.6,  reward: 1.35 },
  { name: 'Expert',      mult: 2.6,  reward: 1.8 },
  { name: 'Master',      mult: 4.2,  reward: 2.4 },
  { name: 'Torment I',   mult: 7.0,  reward: 3.2 },
  { name: 'Torment II',  mult: 11.5, reward: 4.4 },
  { name: 'Torment III', mult: 19.0, reward: 6.0 }
];

const XP_CURVE = lvl => Math.round(60 * Math.pow(lvl, 1.5));
const MAX_LEVEL = 70;

// Endless endgame dungeon: filled by slaughter, capped by a Guardian.
const RIFT_GUARDIANS = ['Blighter', 'The Choker', 'Bloodmaw', 'Sand Shaper', 'Erethon', 'Man Carver'];

function makeRiftZone() {
  const theme = pick(ZONES);
  return {
    id: 'rift', name: 'Nephalem Rift', kind: Math.random() < 0.5 ? 'dungeon' : 'open',
    mLvl: 26 + Math.min(44, (Hero.riftsCleared || 0) * 2),
    ground: theme.ground, accent: theme.accent,
    weather: pick(['rain', 'wind', null]),
    monsters: ['zombie', 'skeleton', 'archer', 'ghoul', 'imp', 'cultist'],
    boss: pick(RIFT_GUARDIANS) + ', Rift Guardian', packs: 18,
    desc: 'A shard of a broken realm. Fill the rift; face its guardian.',
    rift: true
  };
}
