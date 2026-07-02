'use strict';
// ---------------------------------------------------------------------------
// Loot & equipment: D3-style rarities, affix rolls that scale with the wave,
// auto-equip on upgrade (worse drops are salvaged into gold), and a gear
// panel toggled from the portrait (or the I key).
// ---------------------------------------------------------------------------

const RARITIES = [
  { name: 'Common',    color: '#c9bfa8', mult: 1.0,  salvage: 4 },
  { name: 'Magic',     color: '#6a9aff', mult: 1.4,  salvage: 12 },
  { name: 'Rare',      color: '#ffd76a', mult: 1.9,  salvage: 28 },
  { name: 'Legendary', color: '#ff8c2a', mult: 2.6,  salvage: 70 }
];

// Stat keys: dmg (× damage), hp (+max life), crit (+crit chance),
// ess (+essence regen/s), reg (+life regen/s).
const ITEM_SLOTS = {
  weapon: {
    label: 'Weapon',
    nouns: ['Scythe', 'Bone Blade', 'Grim Sickle', 'Grave Reaper', 'Femur Cleaver'],
    primary: { stat: 'dmg', base: 0.10 },
    secondaries: ['crit', 'ess']
  },
  armor: {
    label: 'Armor',
    nouns: ['Shroud', 'Carapace', 'Grave Plate', 'Cadaver Mail', 'Pall of Woe'],
    primary: { stat: 'hp', base: 24 },
    secondaries: ['reg', 'ess']
  },
  ring: {
    label: 'Ring',
    nouns: ['Band', 'Signet', 'Knucklebone Loop', 'Death Seal', 'Wraith Coil'],
    primary: { stat: 'crit', base: 0.035 },
    secondaries: ['dmg', 'hp']
  }
};

const AFFIX_ROLLS = {
  dmg:  { base: 0.06, label: v => `+${Math.round(v * 100)}% damage` },
  hp:   { base: 16,   label: v => `+${Math.round(v)} life` },
  crit: { base: 0.03, label: v => `+${Math.round(v * 100)}% crit chance` },
  ess:  { base: 0.8,  label: v => `+${v.toFixed(1)} essence/s` },
  reg:  { base: 1.2,  label: v => `+${v.toFixed(1)} life/s` }
};

const LEGENDARY_PREFIX = ['Maltherion\'s', 'The Widow\'s', 'Rathma\'s', 'Xul\'s', 'Trag\'Oul\'s'];
const RARE_PREFIX = ['Cruel', 'Vicious', 'Dread', 'Baleful', 'Sinister'];
const MAGIC_PREFIX = ['Sturdy', 'Sharp', 'Grim', 'Cold', 'Hungry'];

const Items = {
  equipped: { weapon: null, armor: null, ring: null },

  reset() {
    this.equipped = { weapon: null, armor: null, ring: null };
  },

  rollRarity(boss) {
    const r = Math.random();
    if (boss) return r < 0.25 ? 3 : 2;               // bosses drop rare+
    if (r < 0.03) return 3;
    if (r < 0.16) return 2;
    if (r < 0.48) return 1;
    return 0;
  },

  generate(wave, boss = false) {
    const slot = pick(Object.keys(ITEM_SLOTS));
    const def = ITEM_SLOTS[slot];
    const rarity = this.rollRarity(boss);
    const R = RARITIES[rarity];
    const waveScale = 1 + wave * 0.09;

    const stats = {};
    const addStat = (key, scale) => {
      const roll = AFFIX_ROLLS[key].base * scale * waveScale * rand(0.8, 1.2);
      stats[key] = (stats[key] || 0) + roll;
    };
    addStat(def.primary.stat, (def.primary.base / AFFIX_ROLLS[def.primary.stat].base) * R.mult);
    if (rarity >= 1) addStat(pick(def.secondaries), R.mult * 0.8);
    if (rarity >= 3) addStat(pick(def.secondaries), R.mult * 0.8);

    const prefix = rarity === 3 ? pick(LEGENDARY_PREFIX)
      : rarity === 2 ? pick(RARE_PREFIX)
      : rarity === 1 ? pick(MAGIC_PREFIX) : '';
    const name = (prefix ? prefix + ' ' : '') + pick(def.nouns);

    return { slot, rarity, name, stats, score: this.score(stats) };
  },

  score(stats) {
    return (stats.dmg || 0) * 320 + (stats.hp || 0) * 1 +
      (stats.crit || 0) * 400 + (stats.ess || 0) * 18 + (stats.reg || 0) * 14;
  },

  statLines(item) {
    return Object.entries(item.stats).map(([k, v]) => AFFIX_ROLLS[k].label(v));
  },

  // Recompute the player's derived stats from base + gear.
  apply() {
    const p = Game.player;
    if (!p) return;
    let dmg = 0, hp = 0, crit = 0, ess = 0, reg = 0;
    for (const slot of Object.keys(this.equipped)) {
      const it = this.equipped[slot];
      if (!it) continue;
      dmg += it.stats.dmg || 0;
      hp += it.stats.hp || 0;
      crit += it.stats.crit || 0;
      ess += it.stats.ess || 0;
      reg += it.stats.reg || 0;
    }
    p.dmgMult = p.baseDmg * (1 + dmg);
    const oldMax = p.maxHp;
    p.maxHp = Math.round(p.baseMaxHp + hp);
    if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
    p.critChance = 0.10 + crit;
    p.essenceRegen = 3.5 + ess;
    p.hpRegen = reg;
  },

  acquire(item) {
    const cur = this.equipped[item.slot];
    const R = RARITIES[item.rarity];
    if (!cur || item.score > cur.score) {
      this.equipped[item.slot] = item;
      this.apply();
      UI.toast('Equipped: ' + item.name, R.color);
      AudioSys.sfx('level');
    } else {
      Game.gold += R.salvage;
      UI.toast(`Salvaged ${item.name}  (+${R.salvage} gold)`, '#9a9080');
      AudioSys.sfx('gold');
    }
  }
};
