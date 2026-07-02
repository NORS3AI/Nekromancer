'use strict';
// ---------------------------------------------------------------------------
// Items: generation with level-scaled affixes, sockets & gems, the artisans
// (Blacksmith salvage/craft, Jeweler combine/socket, Mystic enchant), and
// Items.apply() which derives the Player's stats from Hero gear + passives.
// ---------------------------------------------------------------------------

const Items = {

  // ------------------------------------------------------------ generation

  // Owner-specified drop table (before difficulty modifiers):
  //   Common/trash 55% · Magic 20% · Rare 10% · Epic 5% · Legendary 1%,
  //   with the leftover 4% "overlap" split between Rare and Epic (+2% each).
  // Legendary by HERO level: 1% (1–59), 2.29% (60–69), 2.89% (70).
  // Torment I–XVI add their flat legBonus (+1% … +33.3%) on top.
  // `boost` (elites, bosses, masterwork) tilts the whole table upward;
  // negative boost (vendor junk) tilts it down.
  rollRarity(boost = 0) {
    const lvl = Hero.level;
    let leg = lvl >= 70 ? 0.0289 : lvl >= 60 ? 0.0229 : 0.01;
    leg += (DIFFICULTIES[Hero.difficulty].legBonus || 0);
    let epic = 0.05 + 0.02;
    let rare = 0.10 + 0.02;
    let magic = 0.20;
    if (boost > 0) {
      leg += boost * 0.25;
      epic += boost * 0.35;
      rare += boost * 0.5;
    } else if (boost < 0) {
      leg = 0;
      epic = Math.max(0, epic + boost * 0.2);
      rare = Math.max(0.04, rare + boost * 0.3);
      magic = Math.max(0.10, magic + boost * 0.4);
    }
    const r = Math.random();
    if (r < leg) return 4;
    if (r < leg + epic) return 3;
    if (r < leg + epic + rare) return 2;
    if (r < leg + epic + rare + magic) return 1;
    return 0;
  },

  generate(mLvl, boost = 0, forceSlot = null) {
    const slot = forceSlot || pick(Object.keys(ITEM_SLOTS));
    const def = ITEM_SLOTS[slot];
    const rarity = this.rollRarity(boost);
    const R = RARITIES[rarity];
    const lvlScale = 1 + mLvl * 0.11;

    const stats = {};
    const addStat = (key, mult) => {
      const roll = AFFIX_ROLLS[key].base * mult * lvlScale * rand(0.8, 1.2);
      stats[key] = (stats[key] || 0) + roll;
    };
    addStat(def.primary, 1.6 * R.mult);
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary);
    for (let i = 0; i < rarity; i++) addStat(pick(pool), 0.85 * R.mult);

    // Sockets: rarer items are likelier to bear one.
    const sockets = Math.random() < [0.06, 0.14, 0.25, 0.38, 0.5, 0.6][rarity] ? 1 : 0;

    const prefix = rarity >= 4 ? pick(LEGENDARY_PREFIX)
      : rarity === 3 ? pick(EPIC_PREFIX)
      : rarity === 2 ? pick(RARE_PREFIX)
      : rarity === 1 ? pick(MAGIC_PREFIX) : '';
    const name = (prefix ? prefix + ' ' : '') + pick(def.nouns);

    return { slot, rarity, name, stats, mLvl, sockets, gem: null };
  },

  generateGem(mLvl) {
    const tier = clamp(Math.floor(mLvl / 8) + (Math.random() < 0.25 ? 1 : 0), 0, GEM_TIERS.length - 1);
    return { type: pick(Object.keys(GEM_TYPES)), tier };
  },

  // A Grace of Inarius piece the hero doesn't own yet (or a re-roll if all
  // six are claimed). Rift Guardian loot.
  generateSetPiece(mLvl) {
    const owned = Hero.setPiecesOwned();
    const missing = Object.keys(INARIUS_SET.pieces).filter(s => !owned.has(s));
    const slot = missing.length ? pick(missing) : pick(Object.keys(INARIUS_SET.pieces));
    const def = ITEM_SLOTS[slot];
    const R = RARITIES[5];
    const lvlScale = 1 + mLvl * 0.11;
    const stats = {};
    const addStat = (key, mult) => {
      stats[key] = (stats[key] || 0) + AFFIX_ROLLS[key].base * mult * lvlScale * rand(0.9, 1.2);
    };
    addStat(def.primary, 1.8 * R.mult);
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary);
    for (let i = 0; i < 3; i++) addStat(pick(pool), 0.9 * R.mult);
    return {
      slot, rarity: 5, set: 'inarius',
      name: INARIUS_SET.pieces[slot],
      stats, mLvl, sockets: 1, gem: null
    };
  },

  // Build-defining legendaries from the Inarius guide.
  generatePowerItem(mLvl) {
    const key = pick(Object.keys(LEGENDARY_POWERS));
    const P = LEGENDARY_POWERS[key];
    const item = this.generate(mLvl, 0, P.slot);
    item.rarity = 4;
    item.name = P.name;
    item.power = key;
    if (!item.sockets) item.sockets = Math.random() < 0.4 ? 1 : 0;
    return item;
  },

  score(item) {
    let s = 0;
    for (const [k, v] of Object.entries(item.stats)) {
      s += v * ({ dmg: 320, hp: 1, crit: 400, ess: 18, reg: 14, gold: 40 })[k];
    }
    if (item.sockets) s += 15;
    if (item.gem) s += gemStatValue(item.gem) * 30;
    return s;
  },

  statLines(item) {
    const lines = Object.entries(item.stats).map(([k, v]) => AFFIX_ROLLS[k].label(v));
    if (item.power) lines.push('★ ' + LEGENDARY_POWERS[item.power].desc);
    if (item.set === 'inarius') {
      const n = this.setCount();
      lines.push('◈ Grace of Inarius (' + n + '/6 equipped)');
    }
    if (item.sockets && !item.gem) lines.push('◇ empty socket');
    if (item.gem) lines.push('◆ ' + gemName(item.gem) + ': ' + GEM_TYPES[item.gem.type].label(gemStatValue(item.gem)));
    return lines;
  },

  setCount() {
    let n = 0;
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.set === 'inarius') n++;
    }
    return n;
  },

  equippedPowers() {
    const p = {};
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.power) p[it.power] = true;
    }
    return p;
  },

  // D3-console-style compare arrows: -1 worse, 0 even, +1 better (per tier).
  compareArrows(item, against) {
    if (!against) return 3;
    const d = this.score(item) - this.score(against);
    const rel = d / Math.max(30, this.score(against));
    if (rel > 0.35) return 3;
    if (rel > 0.12) return 2;
    if (rel > 0.02) return 1;
    if (rel < -0.35) return -3;
    if (rel < -0.12) return -2;
    if (rel < -0.02) return -1;
    return 0;
  },

  // ------------------------------------------------------------- inventory

  pickup(item) {
    const cur = Hero.equipped[item.slot];
    // Auto-equip clear upgrades on pickup (mobile-friendly); rest go to bag.
    if (!cur) {
      Hero.equipped[item.slot] = item;
      this.apply();
      UI.toast('Equipped: ' + item.name, RARITIES[item.rarity].color);
      AudioSys.sfx('level');
    } else {
      this.stash(item);
      UI.toast(item.name + '  →  bag', RARITIES[item.rarity].color);
    }
    Hero.save();
  },

  stash(item) {
    Hero.bag.push(item);
    if (Hero.bag.length > Hero.BAG_SIZE) {
      let worst = 0;
      for (let i = 1; i < Hero.bag.length; i++) {
        if (this.score(Hero.bag[i]) < this.score(Hero.bag[worst])) worst = i;
      }
      const junk = Hero.bag.splice(worst, 1)[0];
      this.grantSalvage(junk, true);
    }
  },

  equip(item) {
    const idx = Hero.bag.indexOf(item);
    if (idx < 0) return;
    Hero.bag.splice(idx, 1);
    const cur = Hero.equipped[item.slot];
    Hero.equipped[item.slot] = item;
    if (cur) Hero.bag.push(cur);
    this.apply();
    UI.toast('Equipped: ' + item.name, RARITIES[item.rarity].color);
    AudioSys.sfx('level');
    Hero.save();
  },

  // ------------------------------------------------------------ blacksmith

  grantSalvage(item, quiet = false) {
    const R = RARITIES[item.rarity];
    Hero.mats[R.salvage] += R.salvageN;
    if (item.gem) Hero.gems.push(item.gem); // gems survive the forge
    if (!quiet) {
      UI.toast(`Salvaged ${item.name} → ${R.salvageN}× ${MATERIALS[R.salvage].name}`, MATERIALS[R.salvage].color);
      AudioSys.sfx('craft');
    } else {
      UI.toast(`Bag full — auto-salvaged ${item.name}`, '#9a9080');
    }
  },

  salvage(item) {
    const idx = Hero.bag.indexOf(item);
    if (idx < 0) return;
    Hero.bag.splice(idx, 1);
    this.grantSalvage(item);
    Hero.save();
  },

  salvageJunk() {
    // Salvage all common+magic in the bag at once.
    let n = 0;
    for (let i = Hero.bag.length - 1; i >= 0; i--) {
      if (Hero.bag[i].rarity <= 1) {
        const it = Hero.bag.splice(i, 1)[0];
        const R = RARITIES[it.rarity];
        Hero.mats[R.salvage] += R.salvageN;
        if (it.gem) Hero.gems.push(it.gem);
        n++;
      }
    }
    if (n) {
      UI.toast(`Salvaged ${n} items`, '#c9bfa8');
      AudioSys.sfx('craft');
      Hero.save();
    } else {
      UI.toast('No common or magic items in bag', '#9a9080');
    }
  },

  // Artisan levels (1–100) sweeten every service.
  artisanDiscount(which) {
    return 1 - 0.4 * (Hero.artisans[which] - 1) / 99;
  },

  trainCost(which) {
    return Math.round(400 * Math.pow(Hero.artisans[which], 1.25));
  },

  train(which) {
    if (Hero.artisans[which] >= 100) return;
    const cost = this.trainCost(which);
    if (Hero.gold < cost) {
      UI.toast('Not enough gold to train', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    Hero.gold -= cost;
    Hero.artisans[which]++;
    UI.toast(({ smith: 'Blacksmith', mystic: 'Mystic', jeweler: 'Jeweler' })[which] + ' trained to level ' + Hero.artisans[which], '#ffd76a');
    AudioSys.sfx('craft');
    Hero.save();
  },

  craftCost(master = false) {
    const d = this.artisanDiscount('smith');
    if (master) {
      return {
        gold: Math.round((250 + Hero.level * 40) * 3 * d),
        parts: 6, dust: 4, crystal: 3,
        soul: Hero.level >= 30 ? 1 : 0
      };
    }
    return { gold: Math.round((250 + Hero.level * 40) * d), parts: 4, dust: 2, crystal: Hero.level >= 20 ? 1 : 0 };
  },

  canAfford(cost) {
    if ((cost.gold || 0) > Hero.gold) return false;
    for (const m of ['parts', 'dust', 'crystal', 'soul']) {
      if ((cost[m] || 0) > Hero.mats[m]) return false;
    }
    return true;
  },

  pay(cost) {
    Hero.gold -= cost.gold || 0;
    for (const m of ['parts', 'dust', 'crystal', 'soul']) Hero.mats[m] -= cost[m] || 0;
  },

  craft(slot, master = false) {
    const cost = this.craftCost(master);
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold or materials', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.pay(cost);
    const craftLvl = Hero.level + Math.floor(Hero.artisans.smith / 10);
    let item, tries = 0;
    do {
      item = this.generate(craftLvl, master ? 0.2 : 0.12, slot);
    } while (master && item.rarity < 2 && tries++ < 30); // masterwork: Rare or better
    if (master && !item.sockets) item.sockets = Math.random() < 0.5 ? 1 : 0;
    this.stash(item);
    UI.toast((master ? 'Masterworked: ' : 'Forged: ') + item.name, RARITIES[item.rarity].color);
    AudioSys.sfx('craft');
    Hero.save();
  },

  salvageRares() {
    let n = 0;
    for (let i = Hero.bag.length - 1; i >= 0; i--) {
      if (Hero.bag[i].rarity === 2) {
        const it = Hero.bag.splice(i, 1)[0];
        Hero.mats.crystal += RARITIES[2].salvageN;
        if (it.gem) Hero.gems.push(it.gem);
        n++;
      }
    }
    if (n) {
      UI.toast(`Salvaged ${n} rare item${n > 1 ? 's' : ''} → ${n}× Veiled Crystals`, '#ffd76a');
      AudioSys.sfx('craft');
      Hero.save();
    } else {
      UI.toast('No rare items in bag', '#9a9080');
    }
  },

  // --------------------------------------------------------------- jeweler

  // Combine 3 identical gems into one of the next tier.
  combineGems(type, tier) {
    if (tier >= GEM_TIERS.length - 1) return;
    const matching = Hero.gems.filter(g => g.type === type && g.tier === tier);
    const cost = 500 * (tier + 1);
    if (matching.length < 3 || Hero.gold < cost) {
      UI.toast(matching.length < 3 ? 'Need 3 matching gems' : 'Not enough gold', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    Hero.gold -= cost;
    let removed = 0;
    for (let i = Hero.gems.length - 1; i >= 0 && removed < 3; i--) {
      if (Hero.gems[i].type === type && Hero.gems[i].tier === tier) {
        Hero.gems.splice(i, 1);
        removed++;
      }
    }
    const gem = { type, tier: tier + 1 };
    Hero.gems.push(gem);
    UI.toast('Combined: ' + gemName(gem), GEM_TYPES[type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  // Keep folding a stack 3→1 for as long as it lasts (and gold does).
  combineAllGems(type, tier) {
    let made = 0;
    while (tier < GEM_TIERS.length - 1) {
      const n = Hero.gems.filter(g => g.type === type && g.tier === tier).length;
      const cost = 500 * (tier + 1);
      if (n < 3 || Hero.gold < cost) break;
      this.combineGems(type, tier);
      made++;
    }
    if (!made) AudioSys.sfx('denied');
  },

  // Jeweler trades in gold and gems only.
  gemPrice() {
    return { gold: Math.round((600 + Hero.level * 25) * this.artisanDiscount('jeweler')) };
  },

  buyGem() {
    const cost = this.gemPrice();
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold or dust', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.pay(cost);
    const gem = this.generateGem(Hero.level + Math.floor(Hero.artisans.jeweler / 4));
    Hero.gems.push(gem);
    UI.toast('Cut a fresh gem: ' + gemName(gem), GEM_TYPES[gem.type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  socketGem(item, gemIndex) {
    const gem = Hero.gems[gemIndex];
    if (!gem || !item || !item.sockets) return;
    if (item.gem) Hero.gems.push(item.gem); // swap out the old one
    Hero.gems.splice(gemIndex, 1);
    item.gem = gem;
    this.apply();
    UI.toast(gemName(gem) + ' socketed into ' + item.name, GEM_TYPES[gem.type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  unsocket(item) {
    if (!item || !item.gem) return;
    Hero.gems.push(item.gem);
    item.gem = null;
    this.apply();
    AudioSys.sfx('gem');
    Hero.save();
  },

  // ---------------------------------------------------------------- mystic

  // Each enchant on an item drives the next one's price up, D3-style.
  // The Mystic trades in gold and Forgotten Souls only; training softens
  // both the base price and the escalation. Cheap for low rarities and
  // low-level gear so enchanting is useful from the start.
  enchantCost(item) {
    const n = item.enchants || 0;
    const d = this.artisanDiscount('mystic');
    const escal = 0.5 * (1 - Hero.artisans.mystic / 200);
    const rarityMult = [0.4, 0.6, 1.0, 1.3, 1.6, 1.8][item.rarity] || 1;
    return {
      gold: Math.round((80 + item.mLvl * 28) * rarityMult * (1 + n * escal) * d),
      soul: (item.rarity >= 4 ? 2 : 1) + Math.floor(n / 2)
    };
  },

  // Reroll the affix the PLAYER chose; the rest of the item is untouched.
  enchant(item, statKey) {
    if (!(statKey in item.stats)) return;
    const cost = this.enchantCost(item);
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold or materials', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.pay(cost);
    delete item.stats[statKey];
    // New property: anything the item doesn't already have (incl. a fresh
    // roll of the one just removed).
    const pool = Object.keys(AFFIX_ROLLS).filter(k => !(k in item.stats));
    const nk = pick(pool);
    const R = RARITIES[item.rarity];
    item.stats[nk] = AFFIX_ROLLS[nk].base * (nk === ITEM_SLOTS[item.slot].primary ? 1.6 : 0.85)
      * R.mult * (1 + item.mLvl * 0.11) * rand(0.85, 1.25);
    item.enchants = (item.enchants || 0) + 1;
    this.apply();
    UI.toast(`Enchanted ${item.name}: ${AFFIX_ROLLS[nk].label(item.stats[nk])}`, '#b06adf');
    AudioSys.sfx('gem');
    Hero.save();
    return nk;
  },

  // ------------------------------------------------------- derived stats

  // Hero level + gear + gems + passives, as a plain stats object.
  // Works with no live Player (used by the character sheet in camp).
  computeStats() {
    let dmg = 0, hp = 0, crit = 0, ess = 0, reg = 0, gold = 0;
    const gather = it => {
      if (!it) return;
      dmg += it.stats.dmg || 0;
      hp += it.stats.hp || 0;
      crit += it.stats.crit || 0;
      ess += it.stats.ess || 0;
      reg += it.stats.reg || 0;
      gold += it.stats.gold || 0;
      if (it.gem) {
        const v = gemStatValue(it.gem);
        const s = GEM_TYPES[it.gem.type].stat;
        if (s === 'dmg') dmg += v;
        else if (s === 'hp') hp += v;
        else if (s === 'crit') crit += v;
        else if (s === 'ess') ess += v;
        else if (s === 'reg') reg += v;
      }
    };
    for (const slot of Object.keys(ITEM_SLOTS)) gather(Hero.equipped[slot]);
    const lvl = Hero.level;
    return {
      dmgMult: (1 + (lvl - 1) * 0.09) * (1 + dmg),
      gearDmg: dmg,
      maxHp: Math.round(110 + (lvl - 1) * 14 + hp),
      critChance: 0.10 + crit,
      essenceRegen: 2 + ess,
      hpRegen: reg,
      goldFind: 1 + gold,
      maxEssence: 100 + (Hero.hasPassive('overwhelming') ? 40 : 0),
      setCount: this.setCount(),
      powers: this.equippedPowers()
    };
  },

  // Fold the derived stats into the live Player entity.
  apply() {
    const p = Game.player;
    if (!p) return;
    const s = this.computeStats();
    const oldMax = p.maxHp || s.maxHp;
    p.dmgMult = s.dmgMult;
    p.maxHp = s.maxHp;
    if (p.hp === undefined) p.hp = p.maxHp;
    else if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
    p.critChance = s.critChance;
    p.essenceRegen = s.essenceRegen;
    p.hpRegen = s.hpRegen;
    p.goldFind = s.goldFind;
    p.maxEssence = s.maxEssence;
    p.setCount = s.setCount;
    p.powers = s.powers;
    p.essence = Math.min(p.essence ?? 60, p.maxEssence);
  }
};
