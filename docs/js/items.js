'use strict';
// ---------------------------------------------------------------------------
// Items: generation with level-scaled affixes, sockets & gems, the artisans
// (Blacksmith salvage/craft, Jeweler combine/socket, Mystic enchant), and
// Items.apply() which derives the Player's stats from Hero gear + passives.
// ---------------------------------------------------------------------------

const Items = {

  // ------------------------------------------------------------ generation

  // BASE rarity drop table (owner-tuned) — one editable row per difficulty index
  // (0 Normal … 3 Master, 4 Torment I … 19 Torment XVI). 7 columns, as percents:
  //   [Trash, Common, Magic, Rare, Epic, Legendary, Artifact]  (each row sums 100)
  // Artifacts are non-zero only at T16 (owner rule). Star tiers are NOT rolled
  // here — gated by Torment band afterwards (legendaryStars / artifactStars).
  DROP_MAP: [
    { r: 0, trash: true }, { r: 0 }, { r: 1 }, { r: 2 }, { r: 3 }, { r: 4 }, { r: 6 }
  ],
  ITEM_DROP_TABLE: [
    [60, 40,  0,  0,  0,  0,  0],  // Normal
    [40, 50, 10,  0,  0,  0,  0],  // Hard
    [30, 60,  9,  1,  0,  0,  0],  // Expert
    [20, 50, 20,  9,  0,  1,  0],  // Master
    [10, 40, 40,  8,  2,  0,  0],  // Torment I
    [ 8, 40, 30, 15,  7,  0,  0],  // Torment II
    [ 6, 30, 25, 28, 10,  1,  0],  // Torment III
    [ 3, 25, 30, 30, 10,  2,  0],  // Torment IV
    [ 1, 20, 30, 35, 12,  2,  0],  // Torment V
    [ 0, 15, 30, 35, 16,  4,  0],  // Torment VI
    [ 0, 10, 25, 40, 20,  5,  0],  // Torment VII
    [ 0,  4, 25, 40, 25,  6,  0],  // Torment VIII
    [ 0,  2, 20, 35, 37,  6,  0],  // Torment IX
    [ 0,  0, 18, 35, 40,  7,  0],  // Torment X
    [ 0,  0, 15, 30, 45, 10,  0],  // Torment XI
    [ 0,  0, 10, 25, 55, 10,  0],  // Torment XII
    [ 0,  0,  0, 10, 80, 10,  0],  // Torment XIII
    [ 0,  0,  0,  0, 80, 20,  0],  // Torment XIV
    [ 0,  0,  0,  0, 70, 30,  0],  // Torment XV
    [ 0,  0,  0,  0, 55, 40,  5]   // Torment XVI
  ],
  // Roll a base rarity. `boost` (elites/bosses/masterwork) gives a chance to
  // upgrade the rolled rarity one column at a time (Artifact only reachable at T16).
  rollRarity(boost = 0) {
    const di = clamp(Hero.difficulty || 0, 0, this.ITEM_DROP_TABLE.length - 1);
    const row = this.ITEM_DROP_TABLE[di];
    let total = 0; for (const w of row) total += w;
    let x = Math.random() * total, acc = 0, col = 0;
    for (let i = 0; i < row.length; i++) { col = i; acc += row[i]; if (x < acc) break; }
    const topCol = tormentTier(di) >= 16 ? 6 : 5;       // artifact (col 6) only at T16
    let b = boost;
    while (b > 0 && col < topCol && Math.random() < b) { col++; b -= 0.5; }
    return this.DROP_MAP[col];
  },

  // Legendary star tier by Torment band (owner spec): 1★ at T3–T7, 2★ at
  // T8–T13, 3★ at T14–T16; below T3 legendaries are plain (0★).
  legendaryStars(tt) {
    if (tt >= 14) return 3;
    if (tt >= 8) return 2;
    if (tt >= 3) return 1;
    return 0;
  },

  // Artifact star tier — only meaningful at T16 (artifacts don't drop below).
  // Owner chances: 1★ 10% · 2★ 7% · 3★ 5% · 4★ 3% · 5★ 1% (else 0★).
  artifactStars() {
    const x = Math.random();
    if (x < 0.01) return 5;
    if (x < 0.04) return 4;   // +3%
    if (x < 0.09) return 3;   // +5%
    if (x < 0.16) return 2;   // +7%
    if (x < 0.26) return 1;   // +10%
    return 0;
  },

  generate(mLvl, boost = 0, forceSlot = null) {
    const slot = forceSlot || pick(Object.keys(ITEM_SLOTS).filter(s => !ITEM_SLOTS[s].torch));
    const def = ITEM_SLOTS[slot];
    const roll = this.rollRarity(boost);
    const rarity = roll.r;
    const trash = !!roll.trash;         // grey junk
    const tt = tormentTier();
    // Star tier is gated by Torment band, not by the rarity roll (owner spec).
    let stars = 0;
    if (rarity === 4) stars = this.legendaryStars(tt);
    else if (rarity === 6) stars = this.artifactStars();
    const R = RARITIES[rarity];
    const lvlScale = 1 + mLvl * 0.11;
    // Artifacts and starred legendaries roll a little hotter.
    const power = (trash ? 0.6 : 1) * (1 + stars * 0.18) * (rarity === 6 ? 1.15 : 1);
    const capItem = { rarity, stars };

    const stats = {};
    const setStat = (key, mult) => {
      const v = AFFIX_ROLLS[key].base * mult * lvlScale * rand(0.8, 1.2) * power;
      // Clamp to the per-tier ceiling (owner rule): affixes never exceed the cap.
      stats[key] = Math.min((stats[key] || 0) + v, this.affixCap(capItem, key));
    };
    setStat(def.primary, 1.6 * R.mult);
    // DISTINCT secondary affixes (no stacking) so a SINGLE Mystic reroll can
    // always reach any value the item can hold. Count = rarity (+1 per star),
    // capped at the pool size. Restricted affixes never roll here.
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary && !RESTRICTED_AFFIXES.has(k));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const affixN = Math.min(rarity + stars, pool.length);
    for (let i = 0; i < affixN; i++) setStat(pool[i], 0.85 * R.mult);

    // Boots can roll Movement Speed (1%–25%), a flat non-level-scaled roll.
    if (slot === 'boots' && Math.random() < 0.55) {
      stats.move = clamp((stats.move || 0) + rand(0.01, 0.25), 0.01, 0.25);
    }

    // Sockets: rarer items are likelier to bear one.
    const sockets = Math.random() < ([0.06, 0.14, 0.25, 0.38, 0.5, 0.6, 0.7][rarity] || 0.06) ? 1 : 0;

    let prefix;
    if (trash) prefix = pick(['Cracked', 'Rusted', 'Broken', 'Worn']);
    else if (rarity === 6) prefix = pick(['Ancient', 'Primordial', 'Godforged', 'Eternal']);
    else if (rarity >= 4) prefix = pick(LEGENDARY_PREFIX);
    else if (rarity === 3) prefix = pick(EPIC_PREFIX);
    else if (rarity === 2) prefix = pick(RARE_PREFIX);
    else if (rarity === 1) prefix = pick(MAGIC_PREFIX);
    else prefix = '';
    let name = (prefix ? prefix + ' ' : '') + pick(def.nouns);
    if (stars) name += ' ' + '★'.repeat(stars);

    const item = { slot, rarity, name, stats, mLvl, sockets, gems: [] };
    if (stars) item.stars = stars;
    if (trash) item.trash = true;
    return item;
  },

  generateGem(mLvl) {
    const tier = clamp(Math.floor(mLvl / 8) + (Math.random() < 0.25 ? 1 : 0), 0, GEM_MAX_TIER);
    return { type: pick(Object.keys(GEM_TYPES)), tier };
  },

  // Sample GEM_DROP_TABLE for the current difficulty. Returns a tier 0–12, or
  // -1 for the "None" column. `noNone` renormalizes over the tier columns only —
  // used by GUARANTEED drops (caches / rift & story rewards) that must always
  // yield a gem. (The Jeweler cuts by jeweler level via generateGem, not this.)
  gemTableRoll(noNone) {
    const row = GEM_DROP_TABLE[clamp(Hero.difficulty || 0, 0, GEM_DROP_TABLE.length - 1)];
    const start = noNone ? 1 : 0;
    let total = 0;
    for (let i = start; i < row.length; i++) total += row[i];
    if (total <= 0) return noNone ? 0 : -1;
    let x = Math.random() * total, acc = 0;
    for (let i = start; i < row.length; i++) { acc += row[i]; if (x < acc) return i - 1; }
    return row.length - 2;                   // safety: top tier
  },

  // Guaranteed-drop tier (never None) — for Horadric caches and act rewards.
  dropGemTier() {
    return this.gemTableRoll(true);
  },

  dropGem() {
    return { type: pick(Object.keys(GEM_TYPES)), tier: this.dropGemTier() };
  },

  // A WILD per-kill gem roll that honours the table's None column — returns a
  // gem or null (no gem this roll).
  rollWildGem() {
    const tier = this.gemTableRoll(false);
    return tier < 0 ? null : { type: pick(Object.keys(GEM_TYPES)), tier };
  },

  // A Grace of Inarius piece the hero doesn't own yet (or a re-roll if all
  // six are claimed). Rift Guardian loot.
  // Star tier for a tiered drop (wild power items, season set pieces) by
  // Torment (owner spec): legendary bands 0–3 below T16, an artifact-grade
  // roll (0–5★) at T16 — so quality varies from legendary up to artifact-5★.
  tieredStars() {
    const tt = tormentTier();
    return tt >= 16 ? this.artifactStars() : this.legendaryStars(tt);
  },

  generateSetPiece(mLvl, forceSlot) {
    const owned = Hero.setPiecesOwned();
    const missing = Object.keys(INARIUS_SET.pieces).filter(s => !owned.has(s));
    const slot = forceSlot || (missing.length ? pick(missing) : pick(Object.keys(INARIUS_SET.pieces)));
    const def = ITEM_SLOTS[slot];
    const R = RARITIES[5];
    // Set pieces (season-only) scale legendary→artifact-5★ with Torment: each
    // star adds an affix and lifts every roll (owner spec).
    const stars = this.tieredStars();
    const power = 1 + stars * 0.18;
    const lvlScale = 1 + mLvl * 0.11;
    const stats = {};
    const capItem = { rarity: 5, stars };
    const addStat = (key, mult) => {
      stats[key] = Math.min((stats[key] || 0) + AFFIX_ROLLS[key].base * mult * lvlScale * rand(0.9, 1.2) * power,
        this.affixCap(capItem, key));
    };
    addStat(def.primary, 1.8 * R.mult);
    const pool = Object.keys(AFFIX_ROLLS).filter(k => k !== def.primary && !RESTRICTED_AFFIXES.has(k));
    for (let i = 0; i < 3 + stars; i++) addStat(pick(pool), 0.9 * R.mult);
    if (slot === 'boots') stats.move = clamp((stats.move || 0) + rand(0.10, 0.25), 0.01, 0.25);
    // Grace of Inarius per-piece affixes (D3): Death Nova on helm/boots, Area
    // Damage on gloves/shoulders.
    if (slot === 'helm' || slot === 'boots') stats.dnova = 0.15;
    if (slot === 'gloves' || slot === 'shoulders') stats.area = 0.20;
    const item = {
      slot, rarity: 5, set: 'inarius',
      name: INARIUS_SET.pieces[slot] + (stars ? ' ' + '★'.repeat(stars) : ''),
      stats, mLvl, sockets: 1, gems: []
    };
    if (stars) item.stars = stars;
    return item;
  },

  // Build-defining legendaries from the Inarius guide. `tiered` (wild drops)
  // scales the piece legendary→artifact with the Torment level (owner spec).
  generatePowerItem(mLvl, forceKey, tiered = false) {
    // Exclusive powers (e.g. The Royal Grandeur) only drop from their specific
    // source, never from the generic legendary pool.
    const key = forceKey || pick(Object.keys(LEGENDARY_POWERS).filter(k => !LEGENDARY_POWERS[k].exclusive));
    const P = LEGENDARY_POWERS[key];
    const item = this.generate(mLvl, 0, P.slot);
    let rarity = 4, stars = 0;
    if (tiered) {
      stars = this.tieredStars();
      rarity = tormentTier() >= 16 ? 6 : 4;   // artifact-grade at T16, else legendary
    }
    item.rarity = rarity;
    item.power = key;
    item.name = P.name + (stars ? ' ' + '★'.repeat(stars) : '');
    if (stars) item.stars = stars; else delete item.stars;
    delete item.trash;
    // Signature affixes that define the item (Area Damage, crit, Death Nova…).
    if (P.affixes) for (const [k, v] of Object.entries(P.affixes)) item.stats[k] = v;
    if (!item.sockets) item.sockets = Math.random() < 0.4 ? 1 : 0;
    return item;
  },

  // A single wild-loot roll: in Torment, a 10% slice becomes one of the named
  // build-defining legendaries (tier by Torment); otherwise an ordinary drop.
  wildDrop(mLvl, boost = 0) {
    if (tormentTier() >= 1 && Math.random() < 0.10) {
      return this.generatePowerItem(mLvl, pick(WILD_POWER_KEYS), true);
    }
    return this.generate(mLvl, boost);
  },

  // ------------------------------------------------------------------ torches

  makeTorch(type) {
    const T = TORCH_TYPES[type] || TORCH_TYPES.wood;
    const secs = T.minutes * 60;
    return {
      slot: 'torch', torch: type, name: T.name, rarity: T.rarity,
      stats: {}, gems: [], sockets: 0, burnMax: secs, burnT: secs, count: 1
    };
  },

  // Put an item in the Stash. Torches never enter the stash (owner rule) — they
  // live in the bag. Returns false if the item's per-slot bin is full.
  addToStash(item) {
    if (item.torch) return false;
    if (Hero.stashSlotCount(item.slot) >= Hero.stashPerSlot()) return false;
    Hero.stash.push(item);
    return true;
  },

  // Craft a torch at the Blacksmith — consumes reagents, sends it to the bag
  // (torches persist in the bag WITHOUT taking a slot; see Hero.bagUsed()).
  craftTorch(type) {
    const T = TORCH_TYPES[type];
    if (!T) return;
    for (const [k, n] of Object.entries(T.recipe)) {
      if ((Hero.mats[k] || 0) < n) {
        UI.toast('Not enough ' + MATERIALS[k].name, '#9a9080');
        AudioSys.sfx('denied');
        return;
      }
    }
    Hero.bag.push(this.makeTorch(type));
    for (const [k, n] of Object.entries(T.recipe)) Hero.mats[k] -= n;
    Hero.save();
    UI.toast('Forged a ' + T.name + ' → your inventory', T.color);
    AudioSys.sfx('craft');
  },

  canCraftTorch(type) {
    const T = TORCH_TYPES[type];
    return T && Object.entries(T.recipe).every(([k, n]) => (Hero.mats[k] || 0) >= n);
  },

  score(item) {
    // Every affix the engine can roll needs a weight here — a missing one used
    // to multiply by undefined and poison the whole score (and any vendor price
    // built from it) with NaN. The `|| 0` guard makes that impossible.
    const W = { dmg: 320, hp: 1, crit: 400, ess: 18, reg: 14, gold: 40, armor: 0.8, move: 700, dnova: 200, area: 200 };
    let s = 0;
    for (const [k, v] of Object.entries(item.stats)) {
      s += (v || 0) * (W[k] || 0);
    }
    if (item.sockets) s += 15 * item.sockets;
    for (const g of item.gems || []) s += gemStatValue(g) * 30;
    return s;
  },

  statLines(item) {
    if (item.torch) {
      const T = TORCH_TYPES[item.torch] || TORCH_TYPES.wood;
      const mins = Math.max(0, Math.round((item.burnT !== undefined ? item.burnT : T.minutes * 60) / 60));
      return ['🔥 Lights the darkness (radius ' + T.radius + ')', '⏳ ' + mins + ' min of fuel remaining'];
    }
    const lines = Object.entries(item.stats).map(([k, v]) => AFFIX_ROLLS[k].label(v));
    if (item.power) {
      const P = LEGENDARY_POWERS[item.power];
      lines.push('★ ' + P.desc);
      if (P.flavorLines) for (const fl of P.flavorLines) lines.push('  ' + fl);
    }
    if (item.set === 'inarius') {
      const n = this.setCount();
      lines.push('◈ Grace of Inarius (' + n + '/6 equipped)');
    }
    const gems = item.gems || [];
    for (const g of gems) {
      // A helm ruby reads as an XP bonus, not damage.
      if (item.slot === 'helm' && g.type === 'ruby') {
        const xp = 0.03 + (0.20 - 0.03) * (g.tier / GEM_MAX_TIER);
        lines.push('◆ ' + gemName(g) + ': +' + Math.round(xp * 100) + '% experience');
      } else if (item.slot === 'boots' && g.type === 'emerald') {
        lines.push('◆ ' + gemName(g) + ': +20% movement speed');
      } else {
        lines.push('◆ ' + gemName(g) + ': ' + GEM_TYPES[g.type].label(gemStatValue(g)));
      }
    }
    const empty = (item.sockets || 0) - gems.length;
    for (let i = 0; i < empty; i++) lines.push('◇ empty socket');
    // Any Perfect-or-better gem, any slot: +20% damage.
    if (gems.some(g => g.tier >= GEM_PERFECT_TIER)) lines.push('❢ +20% damage (Perfect+ gem)');
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

  // Priority tiers for judging upgrades (owner rule): OFFENSE (damage & crit —
  // plus Death Nova / Area, which ARE damage) is weighed BEFORE ALL ELSE, then
  // SURVIVAL (life & life-regen), then UTILITY (armor, gold, essence, movement).
  // Per-stat values just normalize the very different affix magnitudes so they
  // compare fairly within a tier.
  // dmg is the headline offense stat: +100% damage is worth MORE than +100%
  // crit chance, so dmg outweighs crit per point (they used to be reversed).
  STAT_TIER: { dmg: 0, crit: 0, dnova: 0, area: 0, hp: 1, reg: 1, armor: 2, gold: 2, ess: 2, move: 2 },
  STAT_VAL:  { dmg: 1600, crit: 1000, dnova: 700, area: 500, hp: 2.4, reg: 34, armor: 0.7, gold: 110, ess: 16, move: 210 },

  // [offense, survival, utility] sub-scores. Sockets/gems credit offense (a
  // Perfect gem is +20% damage); a legendary power or set piece lifts the whole
  // piece so build-defining gear isn't under-rated by its raw affixes alone.
  tierScores(item) {
    const t = [0, 0, 0];
    for (const [k, v] of Object.entries(item.stats || {})) {
      const ti = this.STAT_TIER[k];
      if (ti === undefined) continue;
      t[ti] += (v || 0) * (this.STAT_VAL[k] || 0);
    }
    // Empty sockets are potential; SOCKETED gems are realized power. So the
    // gems the player already has in their gear count for real, while a bare
    // drop only gets the (smaller) empty-socket credit (owner rule).
    const filled = (item.gems || []).length;
    t[0] += Math.max(0, (item.sockets || 0) - filled) * 120;   // empty sockets: potential
    for (const g of item.gems || []) {
      t[0] += gemStatValue(g) * 60;
      // Special gem rules are big offense multipliers a bare drop can't match.
      if (g.tier >= GEM_PERFECT_TIER) t[0] += 0.20 * this.STAT_VAL.dmg;                     // Perfect+ gem: +20% damage
      if (item.slot === 'weapon' && g.type === 'ruby') t[0] += 0.25 * this.STAT_VAL.dmg;   // ruby in weapon: +25%
    }
    // Build-defining pieces get a GENTLE nudge — enough to break a near-tie in
    // their favor, never enough to override a clearly stronger item (owner rule:
    // a much higher raw-damage weapon must still win even without a power).
    const mul = 1 + (item.power ? 0.15 : 0) + (item.set ? 0.10 : 0);
    return [t[0] * mul, t[1] * mul, t[2] * mul];
  },

  // Console-style compare arrows (−3…+3). The winner is decided by the HIGHEST
  // priority tier in which the two differ by more than ~3%; a virtual tie in a
  // tier falls through to the next tier down (dmg/crit first, then life, then
  // the rest — owner rule).
  compareArrows(item, against) {
    if (!against) return 3;
    const a = this.tierScores(item), b = this.tierScores(against);
    for (let t = 0; t < 3; t++) {
      const rel = (a[t] - b[t]) / Math.max(30, b[t]);
      if (rel > 0.35) return 3;
      if (rel > 0.10) return 2;
      if (rel > 0.03) return 1;
      if (rel < -0.35) return -3;
      if (rel < -0.10) return -2;
      if (rel < -0.03) return -1;
      // this tier is a virtual tie → let the next tier decide
    }
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

  // Add to the bag. No more auto-salvage (owner rule): rewards/crafts are never
  // silently destroyed. Loot pickup is gated separately by canPickup() so a
  // full bag simply leaves drops on the ground.
  stash(item) {
    Hero.bag.push(item);
  },

  // Can this dropped item be picked up right now? An item that auto-equips into
  // an EMPTY slot needs no bag room; otherwise the bag must have space. When it
  // can't, the drop is left on the ground (no magnet, no collect).
  canPickup(item) {
    if (!item || item.torch) return true;       // torches never take a bag slot
    const target = this.bestTargetSlot(item);
    if (!Hero.equipped[target]) return true;    // auto-equips, no bag needed
    return Hero.bagUsed() < Hero.BAG_SIZE;
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
    // Remember the piece we just took off so the inventory can offer a one-tap
    // "re-wear" (owner request) — no digging through the bag to change your mind.
    Game.lastSwap = cur ? { slot, item: cur } : null;
    this.apply();
    UI.toast('Equipped: ' + item.name, RARITIES[item.rarity].color);
    AudioSys.sfx('level');
    Hero.save();
  },

  // --------------------------------------------------------------- stash

  toStash(item) {
    const i = Hero.bag.indexOf(item);
    if (i < 0) return false;
    if (!this.addToStash(item)) {
      UI.toast(ITEM_SLOTS[item.slot].label + ' stash bin is full (' + Hero.stashPerSlot().toLocaleString() + ')', '#9a9080');
      AudioSys.sfx('denied');
      return false;
    }
    Hero.bag.splice(i, 1);
    Hero.saveStash();
    Hero.save();
    return true;
  },

  // Withdraw ONE from the stash. Torch stacks hand over a single torch and
  // keep the rest of the pile in place.
  fromStash(item) {
    const i = Hero.stash.indexOf(item);
    if (i < 0) return false;
    if (Hero.bagUsed() >= Hero.BAG_SIZE && !item.torch) {
      UI.toast('Your bag is full', '#9a9080');
      AudioSys.sfx('denied');
      return false;
    }
    if (item.torch && (item.count || 1) > 1) {
      item.count -= 1;
      Hero.bag.push(this.makeTorch(item.torch));
    } else {
      Hero.stash.splice(i, 1);
      if (item.torch) item.count = 1;
      Hero.bag.push(item);
    }
    Hero.saveStash();
    Hero.save();
    return true;
  },

  depositAll() {
    let n = 0;
    for (let i = Hero.bag.length - 1; i >= 0; i--) {
      if (Hero.bag[i].torch) continue;   // torches stay in the bag, never stashed
      if (this.addToStash(Hero.bag[i])) { Hero.bag.splice(i, 1); n++; }
    }
    if (n) { UI.toast('Stashed ' + n + ' item' + (n > 1 ? 's' : ''), '#6ff7c3'); Hero.saveStash(); Hero.save(); }
    else { UI.toast('Stash bins full for those items', '#9a9080'); AudioSys.sfx('denied'); }
  },

  // ------------------------------------------------------------ blacksmith

  // What a salvage returns: the material key and its count. Artifacts hand back
  // MORE Forgotten Souls the higher their star tier (owner spec): 3 souls at 0★,
  // +1 per star up to 8 at 5★.
  salvageYield(item) {
    const R = RARITIES[item.rarity] || RARITIES[0];
    const n = item.rarity === 6 ? 3 + (item.stars || 0) : R.salvageN;
    return { mat: R.salvage, n };
  },

  grantSalvage(item, quiet = false) {
    // Fallback keeps ALL loot salvageable even if an item has a missing/odd rarity.
    const { mat, n } = this.salvageYield(item);
    Hero.mats[mat] = (Hero.mats[mat] || 0) + n;
    const gems = item.gems || [];
    for (const g of gems) Hero.gems.push(g); // socketed gems survive, back to the pouch
    if (gems.length) {
      UI.toast('Recovered ' + gems.length + ' gem' + (gems.length > 1 ? 's' : '') + ' to your pouch', '#6ff7c3');
    }
    if (!quiet) {
      UI.toast(`Salvaged ${item.name} → ${n}× ${MATERIALS[mat].name}`, MATERIALS[mat].color);
      AudioSys.sfx('craft');
    } else {
      UI.toast(`Bag full — auto-salvaged ${item.name}`, '#9a9080');
    }
  },

  // ALL loot is salvageable — any gear, any rarity, any level, no gold cost
  // (owner rule). D3-style Blacksmith salvage.
  canSalvage(item) {
    // Torches are tools, not salvage fodder.
    return !!item && !item.torch;
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

  // Gear level range the Blacksmith forges, by smith level (owner spec).
  // Levels 8 & 10 don't add a new tier — they unlock inventory epic/legendary
  // salvage — so they forge at the previous tier's range.
  SMITH_RANGE: {
    1: [1, 5],   2: [6, 10],  3: [11, 20], 4: [21, 30], 5: [31, 40],
    6: [41, 50], 7: [51, 60], 8: [51, 60], 9: [61, 70], 10: [61, 70]
  },

  // The gear-level band the smith currently forges, as [lo, hi].
  smithRange() {
    return this.SMITH_RANGE[Hero.artisans.smith] || [1, 5];
  },

  craft(slot, master = false) {
    const cost = this.craftCost(master);
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold or materials', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.pay(cost);
    // Smith level pins the gear-level band (owner spec): L1 forges 1-5, L9 forges 61-70.
    const [lo, hi] = this.smithRange();
    const craftLvl = Math.max(1, Math.round(rand(lo, hi)));
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

  // Blacksmith bulk salvage is the "ease of access" path, gated by SMITH LEVEL
  // for the finest gear (owner spec): Epics at smith 8, Legendaries/Sets at
  // smith 10. This does NOT restrict breaking items down one at a time from the
  // Inventory wheel (that is always free at any level — see canSalvage).
  BULK_SALVAGE_SMITH: { epic: 8, legendary: 10 },

  salvageEpics() {
    if (Hero.artisans.smith < this.BULK_SALVAGE_SMITH.epic) {
      UI.toast('Train the Blacksmith to level ' + this.BULK_SALVAGE_SMITH.epic +
        ' to bulk-salvage Epics — you can still break them down one at a time from your Inventory', '#b06adf');
      AudioSys.sfx('denied');
      return;
    }
    this.bulkSalvage(r => r === 3, 0, 'Epic');
  },

  salvageLegendaries() {
    if (Hero.artisans.smith < this.BULK_SALVAGE_SMITH.legendary) {
      UI.toast('Train the Blacksmith to level ' + this.BULK_SALVAGE_SMITH.legendary +
        ' to bulk-salvage Legendaries — you can still break them down one at a time from your Inventory', '#ff8c2a');
      AudioSys.sfx('denied');
      return;
    }
    this.bulkSalvage(r => r >= 4, 0, 'Legendary/Set');
  },

  // Salvage every bag item matching `pred` (a rarity predicate) at once.
  bulkSalvage(pred, minLvl, label) {
    let n = 0;
    const got = {};   // material key -> amount, so the toast can report Souls etc.
    for (let i = Hero.bag.length - 1; i >= 0; i--) {
      if (Hero.bag[i].torch) continue;
      if (pred(Hero.bag[i].rarity)) {
        const it = Hero.bag.splice(i, 1)[0];
        const { mat, n: yield_ } = this.salvageYield(it);
        Hero.mats[mat] = (Hero.mats[mat] || 0) + yield_;
        got[mat] = (got[mat] || 0) + yield_;
        for (const g of it.gems || []) Hero.gems.push(g);
        n++;
      }
    }
    if (n) {
      const mats = Object.entries(got).map(([k, v]) => v + '× ' + MATERIALS[k].name).join(', ');
      UI.toast(`Salvaged ${n} ${label} item${n > 1 ? 's' : ''} → ${mats}`, '#ffd76a');
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

  // Gems sell to the Jeweler for gold — value roughly triples per tier (3 of a
  // tier combine into 1 of the next), softened up a touch by jeweler training.
  gemSellValue(tier) {
    return Math.round(40 * Math.pow(3, tier) * (2 - this.artisanDiscount('jeweler')));
  },

  sellGem(type, tier, all = false) {
    const idxs = [];
    for (let i = Hero.gems.length - 1; i >= 0; i--) {
      if (Hero.gems[i].type === type && Hero.gems[i].tier === tier) idxs.push(i);
    }
    if (!idxs.length) { AudioSys.sfx('denied'); return; }
    const count = all ? idxs.length : 1;
    const each = this.gemSellValue(tier);
    for (let k = 0; k < count; k++) Hero.gems.splice(idxs[k], 1);   // descending idxs: safe splice
    const gold = each * count;
    Hero.gold += gold;
    UI.toast('Sold ' + count + '× ' + GEM_TIERS[tier] + ' ' + GEM_TYPES[type].name + '  →  ' + gold + 'g', '#ffd76a');
    AudioSys.sfx('gold');
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

  // Forgotten Souls the Mystic needs per reroll, by item tier (owner table).
  // ONLY legendary-and-above cost souls; common/magic/rare/epic are gold-only.
  //   Set = 1 · Legendary 0-3★ = 1..4 · Artifact 0-5★ = 5..10
  mysticSoulCost(item) {
    const st = item.stars || 0;
    if (item.rarity === 4) return 1 + st;   // Legendary
    if (item.rarity === 5) return 1;        // Set
    if (item.rarity === 6) return 5 + st;   // Artifact
    return 0;                               // common / magic / rare / epic
  },

  // Reroll cost starts at 50g and climbs ~1.42× each time — 15-20 rerolls
  // before it reaches the tens of thousands, never substantially beyond
  // (owner rule). Mystic training softens the price. Souls are a flat per-tier
  // toll (mysticSoulCost), NOT escalated by enchant count.
  enchantCost(item) {
    const n = item.enchants || 0;
    const d = this.artisanDiscount('mystic');
    return {
      gold: Math.round(50 * Math.pow(1.42, n) * d),
      soul: this.mysticSoulCost(item)
    };
  },

  // The affixes a reroll of `statKey` could produce — restricted to statKey's
  // own group, each with EQUAL odds — so the player sees exact chances before
  // paying (owner rule). The current affix is always a candidate (a new value).
  enchantOutcomes(item, statKey) {
    const g = affixGroup(statKey);
    if (!g) return [];   // signature affixes (dnova/area) can't be rerolled
    const cands = AFFIX_GROUPS[g].filter(k =>
      (k === statKey || !(k in item.stats)) &&
      (k !== 'move' || item.slot === 'boots'));
    const chance = cands.length ? 1 / cands.length : 0;
    return cands.map(k => ({ key: k, chance, current: k === statKey }));
  },

  // The star/rarity/trash multiplier a fresh roll on this item gets — the SAME
  // one generation uses, so enchant and generation stay in lock-step.
  starPower(item) {
    return (item.trash ? 0.6 : 1) * (1 + (item.stars || 0) * 0.18) * (item.rarity === 6 ? 1.15 : 1);
  },

  // The hard ceiling for `key` on this item = the Artifact-5★ cap scaled by the
  // item's tier. Uncapped affixes (none listed) return Infinity.
  affixCap(item, key) {
    const c = AFFIX_CAP[key];
    if (c === undefined) return Infinity;
    return c * affixTierFrac(item.rarity, item.stars || 0);
  },

  // The [min, max] a reroll of `key` can land on THIS item — mirrors enchant()
  // EXACTLY (base × slot × rarity × level × starPower × rand(0.85–1.25)), then
  // clamped to the tier cap, so the shown max is the true max and the item's
  // value can never exceed it (owner rule).
  affixRange(item, key) {
    if (key === 'move') return { min: 0.01, max: 0.25 };   // flat boots roll
    const R = RARITIES[item.rarity] || RARITIES[0];
    const base = AFFIX_ROLLS[key].base * (key === ITEM_SLOTS[item.slot].primary ? 1.6 : 0.85)
      * R.mult * (1 + item.mLvl * 0.11) * this.starPower(item);
    const cap = this.affixCap(item, key);
    return { min: Math.min(base * 0.85, cap), max: Math.min(base * 1.25, cap) };
  },

  // Reroll the affix the PLAYER chose into another affix in its group.
  enchant(item, statKey) {
    if (!(statKey in item.stats)) return;
    if (!affixGroup(statKey)) {   // dnova/area are signature — untouchable
      UI.toast('This property is a signature affix and cannot be rerolled', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    const cost = this.enchantCost(item);
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold or souls', '#9a9080');
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
    // New property comes from statKey's group only (the shown odds).
    const outs = this.enchantOutcomes(item, statKey);
    const nk = outs.length ? pick(outs).key : statKey;
    delete item.stats[statKey];
    const R = RARITIES[item.rarity];
    if (nk === 'move') {
      item.stats.move = clamp(rand(0.01, 0.25), 0.01, 0.25);   // flat, not level-scaled
    } else {
      const raw = AFFIX_ROLLS[nk].base * (nk === ITEM_SLOTS[item.slot].primary ? 1.6 : 0.85)
        * R.mult * (1 + item.mLvl * 0.11) * this.starPower(item) * rand(0.85, 1.25);
      item.stats[nk] = Math.min(raw, this.affixCap(item, nk));   // never above the tier cap
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
    let dmg = 0, hp = 0, crit = 0, ess = 0, reg = 0, gold = 0, armor = 0, move = 0, xpBonus = 0, dnova = 0, area = 0;
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
      dnova += it.stats.dnova || 0;
      area += it.stats.area || 0;
      for (const g of it.gems || []) {
        // A Perfect-or-better gem grants +20% damage — in ANY slot, per gem.
        if (g.tier >= GEM_PERFECT_TIER) dmg += 0.20;
        // A Ruby in the HELM gives an XP bonus instead of its damage:
        // 3% (Chipped) → 20% (Marquise).
        if (slot === 'helm' && g.type === 'ruby') {
          xpBonus += 0.03 + (0.20 - 0.03) * (g.tier / GEM_MAX_TIER);
          continue;
        }
        // An Emerald in the BOOTS grants +20% movement speed instead of crit.
        if (slot === 'boots' && g.type === 'emerald') {
          move += 0.20;
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
    // Armor → damage reduction, capped at 80%. Big denominator (owner rule):
    // low armor barely helps (201 armor ≈ 0.3%, you're squishy), while the
    // best endgame armor climbs into the hundreds of thousands for real
    // mitigation (≈75% at 200k, cap at ~268k).
    const armorDR = clamp(armor / (armor + 67000), 0, 0.80);
    // The Royal Grandeur: set bonuses need one fewer piece (min 2) — modelled as
    // +1 effective set pieces once you already have at least 2.
    const powers = this.equippedPowers();
    const rawSet = this.setCount();
    const setCountEff = (powers.royalGrandeur && rawSet >= 2) ? Math.min(6, rawSet + 1) : rawSet;
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
      moveSpeed: clamp(move, 0, 1.0),   // affix (≤25%) + emerald boots (+20% each)
      xpBonus,
      deathNovaBonus: dnova,
      areaDamage: clamp(area, 0, 1),
      setCount: setCountEff,
      setCountRaw: rawSet,
      powers
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
    p.deathNovaBonus = s.deathNovaBonus;
    p.areaDamage = s.areaDamage;
    p.speed = 180 * (1 + s.moveSpeed);   // base 180 + movement-speed affix
    p.setCount = s.setCount;
    p.powers = s.powers;
    p.essence = Math.min(p.essence ?? 60, p.maxEssence);
  }
};
