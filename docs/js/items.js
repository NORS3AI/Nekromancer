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
    // `move` is boots-only, never rolled from the generic pool.
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary && k !== 'move');
    for (let i = 0; i < rarity; i++) addStat(pick(pool), 0.85 * R.mult);

    // Boots can roll Movement Speed (1%–25%), a flat non-level-scaled roll.
    if (slot === 'boots' && Math.random() < 0.55) {
      stats.move = clamp((stats.move || 0) + rand(0.01, 0.25), 0.01, 0.25);
    }

    // Sockets: rarer items are likelier to bear one.
    const sockets = Math.random() < [0.06, 0.14, 0.25, 0.38, 0.5, 0.6][rarity] ? 1 : 0;

    const prefix = rarity >= 4 ? pick(LEGENDARY_PREFIX)
      : rarity === 3 ? pick(EPIC_PREFIX)
      : rarity === 2 ? pick(RARE_PREFIX)
      : rarity === 1 ? pick(MAGIC_PREFIX) : '';
    const name = (prefix ? prefix + ' ' : '') + pick(def.nouns);

    return { slot, rarity, name, stats, mLvl, sockets, gems: [] };
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
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary && k !== 'move');
    for (let i = 0; i < 3; i++) addStat(pick(pool), 0.9 * R.mult);
    if (slot === 'boots') stats.move = clamp((stats.move || 0) + rand(0.10, 0.25), 0.01, 0.25);
    return {
      slot, rarity: 5, set: 'inarius',
      name: INARIUS_SET.pieces[slot],
      stats, mLvl, sockets: 1, gems: []
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
    if (item.sockets) s += 15 * item.sockets;
    for (const g of item.gems || []) s += gemStatValue(g) * 30;
    return s;
  },

  statLines(item) {
    const lines = Object.entries(item.stats).map(([k, v]) => AFFIX_ROLLS[k].label(v));
    if (item.power) lines.push('★ ' + LEGENDARY_POWERS[item.power].desc);
    if (item.set === 'inarius') {
      const n = this.setCount();
      lines.push('◈ Grace of Inarius (' + n + '/6 equipped)');
    }
    const gems = item.gems || [];
    const perfectTier = GEM_TIERS.length - 1;
    for (const g of gems) {
      // A helm ruby reads as an XP bonus, not damage.
      if (item.slot === 'helm' && g.type === 'ruby') {
        const xp = 0.03 + (0.20 - 0.03) * (g.tier / perfectTier);
        lines.push('◆ ' + gemName(g) + ': +' + Math.round(xp * 100) + '% experience');
      } else {
        lines.push('◆ ' + gemName(g) + ': ' + GEM_TYPES[g.type].label(gemStatValue(g)));
      }
    }
    const empty = (item.sockets || 0) - gems.length;
    for (let i = 0; i < empty; i++) lines.push('◇ empty socket');
    // Any Perfect gem, any slot: +20% damage.
    if (gems.some(g => g.tier >= perfectTier)) lines.push('❢ +20% damage (Perfect gem)');
    if (item.slot === 'weapon') {
      if (gems.some(g => g.type === 'ruby')) lines.push('❢ +25% weapon damage (ruby)');
      if (Hero.level >= MAX_LEVEL && gems.some(g => g.type === 'emerald')) lines.push('❢ Emerald +20% in weapon (lvl 70)');
      if (Hero.level >= MAX_LEVEL && gems.some(g => g.type === 'ruby')) lines.push('❢ Ruby -5% in weapon (lvl 70)');
    }
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

  // Rings share two interchangeable slots; every other slot is its own family.
  slotFamily(slot) {
    return (slot === 'ring1' || slot === 'ring2') ? ['ring1', 'ring2'] : [slot];
  },

  // The slot in an item's family that should receive it: an empty one first,
  // otherwise the weakest currently equipped (so an upgrade bumps the worse).
  bestTargetSlot(item) {
    const fam = this.slotFamily(item.slot);
    if (fam.length === 1) return item.slot;
    let best = fam[0], bestScore = Infinity;
    for (const s of fam) {
      const eq = Hero.equipped[s];
      if (!eq) return s;
      const sc = this.score(eq);
      if (sc < bestScore) { bestScore = sc; best = s; }
    }
    return best;
  },

  // A unique piece (legendary power or set item) can't be worn twice at once.
  uniqueConflict(item, slot) {
    if (!item.power && !item.set) return false;
    for (const s of this.slotFamily(item.slot)) {
      if (s === slot) continue;
      const o = Hero.equipped[s];
      if (o && ((item.power && o.power === item.power) ||
                (item.set && item.name === o.name))) return true;
    }
    return false;
  },

  // Does any bag item beat what's worn in this slot (or fill it if empty)?
  slotHasUpgrade(slot) {
    const equipped = Hero.equipped[slot];
    const fam = this.slotFamily(slot);
    for (const it of Hero.bag) {
      if (fam.includes(it.slot) && this.compareArrows(it, equipped) > 0) return true;
    }
    return false;
  },

  anyUpgrade() {
    for (const slot of Object.keys(ITEM_SLOTS)) if (this.slotHasUpgrade(slot)) return true;
    return false;
  },

  pickup(item) {
    const target = this.bestTargetSlot(item);
    const cur = Hero.equipped[target];
    // Auto-equip clear upgrades on pickup (mobile-friendly); rest go to bag.
    if (!cur) {
      item.slot = target;
      Hero.equipped[target] = item;
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

  equip(item, targetSlot) {
    const idx = Hero.bag.indexOf(item);
    if (idx < 0) return;
    const fam = this.slotFamily(item.slot);
    const slot = (targetSlot && fam.includes(targetSlot)) ? targetSlot : this.bestTargetSlot(item);
    if (this.uniqueConflict(item, slot)) {
      UI.toast('Only one ' + item.name + ' can be worn at once', '#e04a5a');
      AudioSys.sfx('denied');
      return;
    }
    Hero.bag.splice(idx, 1);
    const cur = Hero.equipped[slot];
    item.slot = slot;              // rebrand a ring to the chosen ring slot
    Hero.equipped[slot] = item;
    if (cur) Hero.bag.push(cur);
    this.apply();
    UI.toast('Equipped: ' + item.name, RARITIES[item.rarity].color);
    AudioSys.sfx('level');
    Hero.save();
  },

  // --------------------------------------------------------------- stash

  toStash(item) {
    const i = Hero.bag.indexOf(item);
    if (i < 0) return false;
    if (Hero.stash.length >= Hero.STASH_SIZE) {
      UI.toast('Stash is full (' + Hero.STASH_SIZE + ')', '#9a9080');
      AudioSys.sfx('denied');
      return false;
    }
    Hero.bag.splice(i, 1);
    Hero.stash.push(item);
    Hero.save();
    return true;
  },

  fromStash(item) {
    const i = Hero.stash.indexOf(item);
    if (i < 0) return false;
    if (Hero.bag.length >= Hero.BAG_SIZE) {
      UI.toast('Your bag is full', '#9a9080');
      AudioSys.sfx('denied');
      return false;
    }
    Hero.stash.splice(i, 1);
    Hero.bag.push(item);
    Hero.save();
    return true;
  },

  depositAll() {
    let n = 0;
    for (let i = Hero.bag.length - 1; i >= 0 && Hero.stash.length < Hero.STASH_SIZE; i--) {
      Hero.stash.push(Hero.bag.splice(i, 1)[0]);
      n++;
    }
    if (n) { UI.toast('Stashed ' + n + ' item' + (n > 1 ? 's' : ''), '#6ff7c3'); Hero.save(); }
    else { AudioSys.sfx('denied'); }
  },

  // ------------------------------------------------------------ blacksmith

  grantSalvage(item, quiet = false) {
    // Fallback keeps ALL loot salvageable even if an item has a missing/odd rarity.
    const R = RARITIES[item.rarity] || RARITIES[0];
    Hero.mats[R.salvage] = (Hero.mats[R.salvage] || 0) + R.salvageN;
    const gems = item.gems || [];
    for (const g of gems) Hero.gems.push(g); // socketed gems survive, back to the pouch
    if (gems.length) {
      UI.toast('Recovered ' + gems.length + ' gem' + (gems.length > 1 ? 's' : '') + ' to your pouch', '#6ff7c3');
    }
    if (!quiet) {
      UI.toast(`Salvaged ${item.name} → ${R.salvageN}× ${MATERIALS[R.salvage].name}`, MATERIALS[R.salvage].color);
      AudioSys.sfx('craft');
    } else {
      UI.toast(`Bag full — auto-salvaged ${item.name}`, '#9a9080');
    }
  },

  // ALL loot is salvageable — any gear, any rarity, any level, no gold cost
  // (owner rule). D3-style Blacksmith salvage.
  canSalvage(item) {
    return !!item;
  },

  salvageReq(item) {
    return 0;
  },

  salvage(item) {
    const idx = Hero.bag.indexOf(item);
    if (idx < 0) return;
    if (!this.canSalvage(item)) {
      UI.toast('Reach level ' + this.salvageReq(item) + ' to salvage ' + RARITIES[item.rarity].name + ' items', '#e04a5a');
      AudioSys.sfx('denied');
      return;
    }
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
        for (const g of it.gems || []) Hero.gems.push(g);
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

  // Artisan levels run 1–10; level 10 = top-tier work. Each level sweetens
  // costs and (for the smith/jeweler) raises what they can make.
  artisanDiscount(which) {
    return 1 - 0.4 * (Hero.artisans[which] - 1) / 9;
  },

  trainCost(which) {
    return Math.round(500 * Math.pow(Hero.artisans[which], 1.7));
  },

  train(which) {
    if (Hero.artisans[which] >= 10) return;
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
    // Level 1 forges low-tier gear; level 10 forges at your full level.
    const craftLvl = Math.max(1, Math.round(Hero.level * (0.5 + 0.05 * Hero.artisans.smith)));
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
    this.bulkSalvage(r => r === 2, 0, 'rare');
  },

  // Blacksmith bulk salvage is the "ease of access" path and is level-gated for
  // the finest gear: Epics from level 60, Legendaries/Sets from level 70. This
  // does NOT restrict breaking items down one at a time from the Inventory wheel
  // (that is always free at any level — see canSalvage). Owner rule.
  BULK_SALVAGE_LVL: { epic: 60, legendary: 70 },

  salvageEpics() {
    if (Hero.level < this.BULK_SALVAGE_LVL.epic) {
      UI.toast('Blacksmith bulk-salvages Epics at level ' + this.BULK_SALVAGE_LVL.epic +
        ' — you can still break them down one at a time from your Inventory', '#b06adf');
      AudioSys.sfx('denied');
      return;
    }
    this.bulkSalvage(r => r === 3, this.BULK_SALVAGE_LVL.epic, 'Epic');
  },

  salvageLegendaries() {
    if (Hero.level < this.BULK_SALVAGE_LVL.legendary) {
      UI.toast('Blacksmith bulk-salvages Legendaries at level ' + this.BULK_SALVAGE_LVL.legendary +
        ' — you can still break them down one at a time from your Inventory', '#ff8c2a');
      AudioSys.sfx('denied');
      return;
    }
    this.bulkSalvage(r => r >= 4, this.BULK_SALVAGE_LVL.legendary, 'Legendary/Set');
  },

  // Salvage every bag item matching `pred` (a rarity predicate) at once.
  bulkSalvage(pred, minLvl, label) {
    let n = 0;
    for (let i = Hero.bag.length - 1; i >= 0; i--) {
      if (pred(Hero.bag[i].rarity)) {
        const it = Hero.bag.splice(i, 1)[0];
        const R = RARITIES[it.rarity] || RARITIES[0];
        Hero.mats[R.salvage] = (Hero.mats[R.salvage] || 0) + R.salvageN;
        for (const g of it.gems || []) Hero.gems.push(g);
        n++;
      }
    }
    if (n) {
      UI.toast(`Salvaged ${n} ${label} item${n > 1 ? 's' : ''}`, '#ffd76a');
      AudioSys.sfx('craft');
      Hero.save();
    } else {
      UI.toast('No ' + label + ' items in bag', '#9a9080');
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
    // Jeweler level 10 cuts gems at your full level (max tiers).
    const gem = this.generateGem(Math.max(1, Math.round(Hero.level * (0.5 + 0.05 * Hero.artisans.jeweler))));
    Hero.gems.push(gem);
    UI.toast('Cut a fresh gem: ' + gemName(gem), GEM_TYPES[gem.type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  socketGem(item, gemIndex) {
    const gem = Hero.gems[gemIndex];
    if (!gem || !item || !item.sockets) return;
    item.gems = item.gems || [];
    if (item.gems.length >= item.sockets) {   // every socket is full
      UI.toast('No empty socket on ' + item.name, '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    Hero.gems.splice(gemIndex, 1);
    item.gems.push(gem);
    this.apply();
    UI.toast(gemName(gem) + ' socketed into ' + item.name, GEM_TYPES[gem.type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  unsocket(item, idx) {
    if (!item || !item.gems || !item.gems.length) return;
    const i = (idx === undefined) ? item.gems.length - 1 : idx;
    const g = item.gems.splice(i, 1)[0];
    if (!g) return;
    Hero.gems.push(g);
    this.apply();
    UI.toast('Unsocketed ' + gemName(g) + ' from ' + item.name, GEM_TYPES[g.type].color);
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
    const escal = 0.5 * (1 - Hero.artisans.mystic / 20);
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
    item.enchants = (item.enchants || 0) + 1;
    // Rare 10% chance: the Mystic uncovers a new gem slot, up to the rarity cap.
    const maxS = MAX_SOCKETS[item.rarity] || 0;
    if ((item.sockets || 0) < maxS && Math.random() < 0.10) {
      item.sockets = (item.sockets || 0) + 1;
      this.apply();
      UI.toast('A gem slot appears! ' + item.name + ' now has ' +
        item.sockets + ' socket' + (item.sockets > 1 ? 's' : ''), '#6ff7c3');
      AudioSys.sfx('gem');
      Hero.save();
      return 'socket';
    }
    delete item.stats[statKey];
    // New property: anything the item doesn't already have. `move` stays boots-only.
    const pool = Object.keys(AFFIX_ROLLS).filter(k =>
      !(k in item.stats) && (k !== 'move' || item.slot === 'boots'));
    const nk = pick(pool);
    const R = RARITIES[item.rarity];
    if (nk === 'move') {
      item.stats.move = clamp(rand(0.01, 0.25), 0.01, 0.25);   // flat, not level-scaled
    } else {
      item.stats[nk] = AFFIX_ROLLS[nk].base * (nk === ITEM_SLOTS[item.slot].primary ? 1.6 : 0.85)
        * R.mult * (1 + item.mLvl * 0.11) * rand(0.85, 1.25);
    }
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
    let dmg = 0, hp = 0, crit = 0, ess = 0, reg = 0, gold = 0, armor = 0, move = 0, xpBonus = 0;
    const perfectTier = GEM_TIERS.length - 1;
    const gather = (it, slot) => {
      if (!it) return;
      dmg += it.stats.dmg || 0;
      hp += it.stats.hp || 0;
      crit += it.stats.crit || 0;
      ess += it.stats.ess || 0;
      reg += it.stats.reg || 0;
      gold += it.stats.gold || 0;
      armor += it.stats.armor || 0;
      move += it.stats.move || 0;
      for (const g of it.gems || []) {
        // A Perfect-tier gem grants +20% damage — in ANY slot, per gem.
        if (g.tier >= perfectTier) dmg += 0.20;
        // A Ruby in the HELM gives an XP bonus instead of its damage:
        // 3% (Chipped) → 20% (Perfect).
        if (slot === 'helm' && g.type === 'ruby') {
          xpBonus += 0.03 + (0.20 - 0.03) * (g.tier / perfectTier);
          continue;
        }
        let v = gemStatValue(g);
        const s = GEM_TYPES[g.type].stat;
        // At level 70, weapon-slot gems are retuned: green +20%, red -5%.
        if (slot === 'weapon' && Hero.level >= MAX_LEVEL) {
          if (g.type === 'emerald') v *= 1.20;
          else if (g.type === 'ruby') v *= 0.95;
        }
        if (s === 'dmg') dmg += v;
        else if (s === 'hp') hp += v;
        else if (s === 'crit') crit += v;
        else if (s === 'ess') ess += v;
        else if (s === 'reg') reg += v;
        else if (s === 'armor') armor += v;
      }
      // A red gem (ruby) socketed in the weapon: +25% damage.
      if (slot === 'weapon' && (it.gems || []).some(g => g.type === 'ruby')) dmg += 0.25;
    };
    for (const slot of Object.keys(ITEM_SLOTS)) gather(Hero.equipped[slot], slot);
    const lvl = Hero.level;
    // Armor → damage reduction (diminishing, level-scaled), capped at 80%.
    const armorDR = clamp(armor / (armor + 60 + 45 * lvl), 0, 0.80);
    return {
      dmgMult: (1 + (lvl - 1) * 0.09) * (1 + dmg),
      gearDmg: dmg,
      maxHp: Math.round(110 + (lvl - 1) * 14 + hp),
      critChance: 0.10 + crit,
      essenceRegen: 2 + ess,
      hpRegen: reg,
      goldFind: 1 + gold,
      maxEssence: 100 + (Hero.hasPassive('overwhelming') ? 40 : 0),
      armor: Math.round(armor),
      armorDR,
      moveSpeed: clamp(move, 0, 0.60),
      xpBonus,
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
    p.armor = s.armor;
    p.armorDR = s.armorDR;
    p.xpBonus = s.xpBonus;
    p.speed = 180 * (1 + s.moveSpeed);   // base 180 + movement-speed affix
    p.setCount = s.setCount;
    p.powers = s.powers;
    p.essence = Math.min(p.essence ?? 60, p.maxEssence);
  }
};
