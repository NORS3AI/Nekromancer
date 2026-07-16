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
    [ 0,  0,  0,  0, 55, 44,  1]   // Torment XVI  (Artifact 1%, owner rule)
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

  // ---- THE FORGOTTEN CRYPT (owner spec v1.7.6) ----
  // Active tier: only once unlocked, a tier is chosen, and the difficulty
  // stands at Ascendant XVI. 0 = the Crypt is closed.
  cryptTier() {
    return (typeof Hero !== 'undefined' && Hero.cryptUnlocked && (Hero.cryptTier || 0) > 0 &&
      tormentTier() >= 16) ? Math.min(Hero.cryptTier, this.cryptMaxTier()) : 0;
  },

  // Tier PROGRESSION (owner spec v1.7.8): tiers open in bands. Finishing
  // Tier 1 (a boss kill at that tier, tracked in Hero.cryptBest) opens 2–7;
  // finishing Tier 7 opens the next five (8–12), and each finished band edge
  // opens five more, all the way to 250.
  cryptMaxTier() {
    const b = (typeof Hero !== 'undefined' && Hero.cryptBest) || 0;
    if (b < 1) return 1;
    if (b < 7) return 7;
    return Math.min(250, 12 + 5 * Math.floor((b - 7) / 5));
  },

  // BEYOND THE ARTIFACT (owner spec v1.7.8) — the deep Crypt's own rarities.
  // Returns 7 Relic · 8 Ancient · 9 Mythic, or 0 (no upgrade). Chances by tier:
  //   201–220: Relic 1%
  //   221–242: Relic 5% · Ancient 1%
  //   243–249: Relic 2% · Ancient 4% · Mythic 1%
  //        250: Relic 7% · Ancient 5% · Mythic 3%
  cryptRarityRoll() {
    const t = this.cryptTier();
    if (t < 201) return 0;
    let mythic = 0, ancient = 0, relic = 1;
    if (t >= 250)      { mythic = 3; ancient = 5; relic = 7; }
    else if (t >= 243) { mythic = 1; ancient = 4; relic = 2; }
    else if (t >= 221) { ancient = 1; relic = 5; }
    const x = Math.random() * 100;
    if (x < mythic) return 9;
    if (x < mythic + ancient) return 8;
    if (x < mythic + ancient + relic) return 7;
    return 0;
  },

  // Crypt legendaries roll 1–5★: 5★ 5% · 4★ 10% · 1–3★ split evenly (owner).
  cryptLegendaryStars() {
    const x = Math.random();
    if (x < 0.05) return 5;
    if (x < 0.15) return 4;
    return 1 + Math.min(2, Math.floor((x - 0.15) / (0.85 / 3)));
  },

  // Crypt artifact stars come in TIER BANDS (owner spec):
  //   tiers  10–75 : 1–2★ 5%
  //   tiers 76–180 : 3–4★ 5% · 1–2★ 25%
  //   tiers 181–250: 5★ 3% · 3–4★ 25% · 1–2★ 35%
  cryptArtifactStars(tier) {
    const x = Math.random();
    const lo = () => Math.random() < 0.5 ? 1 : 2;
    const mid = () => Math.random() < 0.5 ? 3 : 4;
    if (tier >= 181) {
      if (x < 0.03) return 5;
      if (x < 0.28) return mid();
      if (x < 0.63) return lo();
      return 0;
    }
    if (tier >= 76) {
      if (x < 0.05) return mid();
      if (x < 0.30) return lo();
      return 0;
    }
    if (tier >= 10) return x < 0.05 ? lo() : 0;
    return this.artifactStars();
  },

  // `force` = {rarity, stars} skips the drop table entirely (quest/daily
  // rewards with promised odds, e.g. Addy's daily).
  generate(mLvl, boost = 0, forceSlot = null, force = null) {
    const slot = forceSlot || pick(Object.keys(ITEM_SLOTS).filter(s => !ITEM_SLOTS[s].torch));
    const def = ITEM_SLOTS[slot];
    const roll = force ? { r: force.rarity } : this.rollRarity(boost);
    let rarity = roll.r;
    let trash = !!roll.trash;           // grey junk
    // The deep Crypt's own rarities override the table roll (owner spec v1.7.8).
    if (!force) {
      const up = this.cryptRarityRoll();
      if (up) { rarity = up; trash = false; }
    }
    const tt = tormentTier();
    // Star tier is gated by Torment band, not by the rarity roll (owner spec).
    let stars = 0;
    const ct = this.cryptTier();
    if (force && force.stars != null) stars = force.stars;
    else if (rarity === 4) stars = ct ? this.cryptLegendaryStars() : this.legendaryStars(tt);
    else if (rarity === 6) stars = ct ? this.cryptArtifactStars(ct) : this.artifactStars();
    else if (rarity >= 7) stars = this.cryptArtifactStars(Math.max(ct, 181));   // 5★-capable, always
    const R = RARITIES[rarity];
    const lvlScale = 1 + mLvl * 0.11;
    // Artifacts (and above) and starred legendaries roll a little hotter.
    const power = (trash ? 0.6 : 1) * (1 + stars * 0.18) * (rarity >= 7 ? 1.25 : rarity === 6 ? 1.15 : 1);
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
    const sockets = Math.random() < ([0.06, 0.14, 0.25, 0.38, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9][rarity] || 0.06) ? 1 : 0;

    let prefix;
    if (trash) prefix = pick(['Cracked', 'Rusted', 'Broken', 'Worn']);
    else if (rarity === 9) prefix = pick(MYTHIC_PREFIX);
    else if (rarity === 8) prefix = pick(ANCIENT_PREFIX);
    else if (rarity === 7) prefix = pick(RELIC_PREFIX);
    else if (rarity === 6) prefix = pick(['Primordial', 'Godforged', 'Eternal', 'Deathless']);
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
    this.ensureDur(item);   // fresh gear arrives at full durability (aaa/bbb = max/max)
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
    const ct = this.cryptTier();
    if (ct) return this.cryptArtifactStars(ct);
    const tt = tormentTier();
    return tt >= 16 ? this.artifactStars() : this.legendaryStars(tt);
  },

  generateSetPiece(mLvl, forceSlot) {
    const owned = Hero.setPiecesOwned();
    const missing = Object.keys(INARIUS_SET.pieces).filter(s => !owned.has(s));
    const slot = forceSlot || (missing.length ? pick(missing) : pick(Object.keys(INARIUS_SET.pieces)));
    const def = ITEM_SLOTS[slot];
    // Set pieces (season-only) scale legendary→artifact-5★ with Torment: each
    // star adds an affix and lifts every roll (owner spec). In the deep Crypt
    // a set piece can rise to Relic/Ancient/Mythic grade too (owner v1.7.8 —
    // "five star mythic on every item, including sets") while KEEPING its set
    // membership (setCount reads item.set, not rarity).
    const rar = this.cryptRarityRoll() || 5;
    const R = RARITIES[rar];
    const stars = this.tieredStars();
    const power = (1 + stars * 0.18) * (rar >= 7 ? 1.25 : 1);
    const lvlScale = 1 + mLvl * 0.11;
    const stats = {};
    const capItem = { rarity: rar, stars };
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
      slot, rarity: rar, set: 'inarius',
      name: INARIUS_SET.pieces[slot] + (stars ? ' ' + '★'.repeat(stars) : ''),
      stats, mLvl, sockets: 1, gems: []
    };
    if (stars) item.stars = stars;
    this.ensureDur(item);
    return item;
  },

  // Build-defining legendaries from the Inarius guide. `tiered` (wild drops)
  // scales the piece legendary→artifact with the Torment level (owner spec) —
  // and up to Relic/Ancient/Mythic grade in the deep Crypt (owner v1.7.8).
  generatePowerItem(mLvl, forceKey, tiered = false) {
    // Exclusive powers (e.g. The Royal Grandeur) only drop from their specific
    // source, never from the generic legendary pool.
    const key = forceKey || pick(Object.keys(LEGENDARY_POWERS).filter(k => !LEGENDARY_POWERS[k].exclusive));
    const P = LEGENDARY_POWERS[key];
    let rarity = 4, stars = 0;
    if (tiered) {
      stars = this.tieredStars();
      rarity = this.cryptRarityRoll() || (tormentTier() >= 16 ? 6 : 4);   // artifact at T16, Crypt rarities deeper
    }
    // Forcing rarity+stars into generate() makes the base stats roll at the
    // item's TRUE grade (caps, power multiplier, affix count all match).
    const item = this.generate(mLvl, 0, P.slot, { rarity, stars });
    item.rarity = rarity;
    item.power = key;
    item.name = P.name + (stars ? ' ' + '★'.repeat(stars) : '');
    if (stars) item.stars = stars; else delete item.stars;
    delete item.trash;
    // Signature affixes that define the item (Area Damage, crit, Death Nova…).
    if (P.affixes) for (const [k, v] of Object.entries(P.affixes)) item.stats[k] = v;
    if (key === 'funeraryPick') {
      // The Funerary Pick carves 0–3 of its own gem sockets; the Mystic can
      // uncover any it's missing, up to 3 (like a normal socket reveal).
      item.sockets = randInt(0, 3);
      item.maxSockets = 3;
    } else if (!item.sockets) {
      item.sockets = Math.random() < 0.4 ? 1 : 0;
    }
    return item;
  },

  // Addy's daily prize (owner odds): 90% legendary (no star) · 6% legendary
  // 1–3★ · 3% legendary 4–5★ · 1% artifact — the slot is an even roll across
  // ALL equip slots (armor, jewelry, weapon alike).
  addyDailyItem() {
    const r = Math.random();
    let force;
    if (r < 0.01) force = { rarity: 6, stars: this.artifactStars() };
    else if (r < 0.04) force = { rarity: 4, stars: randInt(4, 5) };
    else if (r < 0.10) force = { rarity: 4, stars: randInt(1, 3) };
    else force = { rarity: 4, stars: 0 };
    return this.generate(70, 0, null, force);
  },

  // ---- Lyssa, Mistress of Fate — gambling with Amidrassi Orbs (owner rule,
  // Kadala-style like Diablo 3): pick a slot, pay orbs, get an unidentified
  // roll of that slot. Armor is cheap, weapons dear, amulets dearest.
  GAMBLE_COSTS: {
    helm: 10, shoulders: 10, chest: 10, gloves: 10, legs: 10, boots: 10,
    offhand: 15, ring: 15, weapon: 25, amulet: 30
  },
  // Kadala's odds, tuned to our ladder: 20% magic · 45% rare · 25% epic ·
  // 10% legendary (star tier by Torment band, like world drops).
  gambleItem(slotKey) {
    Hero.gamblesRolled = (Hero.gamblesRolled || 0) + 1;
    const cost = this.GAMBLE_COSTS[slotKey];
    if (!cost || (Hero.amOrbs || 0) < cost) {
      UI.toast('Not enough Amidrassi Orbs', '#9a9080');
      AudioSys.sfx('denied');
      return null;
    }
    Hero.amOrbs -= cost;
    const slot = slotKey === 'ring' ? pick(['ring1', 'ring2']) : slotKey;
    const r = Math.random();
    let force;
    if (r < 0.10) force = { rarity: 4, stars: this.legendaryStars(tormentTier()) };
    else if (r < 0.35) force = { rarity: 3, stars: 0 };
    else if (r < 0.80) force = { rarity: 2, stars: 0 };
    else force = { rarity: 1, stars: 0 };
    const mLvl = Math.max(1, (Hero.level || 1) + (Hero.difficulty || 0) * 3);
    const item = this.generate(mLvl, 0, slot, force);
    this.stash(item);
    UI.toast('Fate deals: ' + item.name, RARITIES[item.rarity].color);
    AudioSys.sfx(item.rarity >= 4 ? 'setdrop' : 'gem');
    Hero.save();
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

  // Add a torch to the bag, STACKING it onto an existing full pile of the same
  // type — freshly-forged torches are all full, so a dozen Wood Torches read as
  // one "Wood Torch ×12" entry instead of a dozen rows. A partially-burnt torch
  // (one that's been lit) never merges; it stays its own item so its fuel is
  // tracked separately. Returns the bag entry the torch ended up in.
  addTorchToBag(torch) {
    const full = torch.burnT >= (torch.burnMax || 0);
    if (full) {
      const stack = Hero.bag.find(it => it && it !== torch && it.torch === torch.torch
        && it.burnT >= (it.burnMax || 0));
      if (stack) { stack.count = (stack.count || 1) + (torch.count || 1); return stack; }
    }
    Hero.bag.push(torch);
    return torch;
  },

  // Craft a torch at the Blacksmith — consumes reagents, sends it to the bag
  // (torches persist in the bag WITHOUT taking a slot; see Hero.bagUsed()).
  craftTorch(type) {
    Hero.torchesCrafted = (Hero.torchesCrafted || 0) + 1;
    const T = TORCH_TYPES[type];
    if (!T) return;
    for (const [k, n] of Object.entries(T.recipe)) {
      if ((Hero.mats[k] || 0) < n) {
        UI.toast('Not enough ' + MATERIALS[k].name, '#9a9080');
        AudioSys.sfx('denied');
        return;
      }
    }
    this.addTorchToBag(this.makeTorch(type));
    for (const [k, n] of Object.entries(T.recipe)) Hero.mats[k] -= n;
    Hero.itemsCrafted = (Hero.itemsCrafted || 0) + 1;   // Lukus's quest counter
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
    const W = { dmg: 320, hp: 1, crit: 400, ess: 18, reg: 14, gold: 40, armor: 0.8, move: 700, dnova: 200, area: 200, int: 0.32, vit: 5, atkSpeed: 620, critDmg: 250, cdr: 600, rcr: 300, lph: 3, elem: 300 };
    let s = 0;
    for (const [k, v] of Object.entries(item.stats)) {
      s += (v || 0) * (W[k] || 0);
    }
    if (item.sockets) s += 15 * item.sockets;
    // Gems: tier-based credit (gem stats span wildly different magnitudes, so
    // score by tier rather than raw value).
    for (const g of item.gems || []) s += (g.tier + 1) * 22;
    return s;
  },

  statLines(item) {
    if (item.torch) {
      const T = TORCH_TYPES[item.torch] || TORCH_TYPES.wood;
      const mins = Math.max(0, Math.round((item.burnT !== undefined ? item.burnT : T.minutes * 60) / 60));
      return ['🔥 Lights the darkness (radius ' + T.radius + ')', '⏳ ' + mins + ' min of fuel remaining'];
    }
    const lines = Object.entries(item.stats).map(([k, v]) => AFFIX_ROLLS[k].label(v));
    if (this.hasDurability(item)) {
      this.ensureDur(item);
      lines.unshift(item.dur <= 0
        ? '🛠 Durability 0/' + item.durMax + ' — BROKEN (no stats until repaired)'
        : '🛠 Durability ' + item.dur + '/' + item.durMax);
    }
    if (item.power) {
      const P = LEGENDARY_POWERS[item.power];
      lines.push('★ ' + P.desc);
      if (P.flavorLines) for (const fl of P.flavorLines) lines.push('  ' + fl);
    }
    if (item.set === 'inarius') {
      const n = this.setCount();
      // Royal Grandeur lets bonuses count one fewer piece (min 2).
      const eff = (this.equippedPowers().royalGrandeur && n >= 2) ? Math.min(6, n + 1) : n;
      lines.push('◈ Grace of Inarius — ' + n + '/6 pieces worn' + (eff > n ? '  (+1 Royal Grandeur)' : ''));
      for (const bonus of INARIUS_SET.bonuses) {
        const active = eff >= bonus.pieces;
        lines.push((active ? '◈ ' : '◇ ') + '(' + bonus.pieces + ' pc) ' + bonus.desc);
      }
    }
    const gems = item.gems || [];
    for (const g of gems) {
      lines.push('◆ ' + gemName(g) + ': ' + gemStatText(g));
      // Slot-specific gem boons, shown on top of the gem's two stats.
      if (g.type === 'ruby' && item.slot === 'helm') {
        lines.push('   ⤷ +' + (Hero.level >= MAX_LEVEL ? '2.0' : '20') + '% XP (helm bonus)');
      }
      if (g.type === 'emerald' && item.slot === 'boots') {
        lines.push('   ⤷ +20% Movement Speed (boots bonus)');
      }
    }
    const empty = (item.sockets || 0) - gems.length;
    for (let i = 0; i < empty; i++) lines.push('◇ empty socket');
    return lines;
  },

  // ---- DURABILITY (owner spec v1.6.84, matched to Diablo 3) ----
  // Armor and weapons carry durability; jewelry does not (as in D3), and
  // torches burn out on their own timer instead. Wear comes from taking hits
  // (armor), casting (weapon/offhand), and death (−10% of max, D3-style).
  // At 0 the item is BROKEN: still worn, but contributes NOTHING — no stats,
  // no gems, no set piece, no legendary power — until repaired at the Smithy.
  DUR_SLOTS: ['helm', 'shoulders', 'chest', 'gloves', 'legs', 'boots', 'weapon', 'offhand'],
  hasDurability(it) {
    return !!it && !it.torch && this.DUR_SLOTS.includes(it.slot);
  },
  durMaxFor(it) {
    // Low-level commons land around ~20; endgame artifacts near ~900.
    return Math.round(14 + (it.mLvl || 1) * 2.2 + (it.rarity || 0) * 30 + (it.stars || 0) * 90);
  },
  ensureDur(it) {
    if (!this.hasDurability(it)) return;
    if (!it.durMax) { it.durMax = this.durMaxFor(it); it.dur = it.durMax; }
    if (it.dur == null || it.dur > it.durMax) it.dur = it.durMax;
  },
  isBroken(it) {
    if (!this.hasDurability(it)) return false;
    this.ensureDur(it);
    return it.dur <= 0;
  },
  // D3 repair pricing: gold per missing point, scaling with item level/rarity.
  repairCost(it) {
    this.ensureDur(it);
    const missing = (it.durMax || 0) - (it.dur || 0);
    return Math.ceil(missing * (0.5 + (it.mLvl || 1) * 0.06 + (it.rarity || 0) * 0.4));
  },
  damagedGear() {
    const out = [];
    for (const slot of this.DUR_SLOTS) {
      const it = Hero.equipped[slot];
      if (this.hasDurability(it)) { this.ensureDur(it); if (it.dur < it.durMax) out.push(it); }
    }
    for (const it of Hero.bag) {
      if (this.hasDurability(it)) { this.ensureDur(it); if (it.dur < it.durMax) out.push(it); }
    }
    return out;
  },
  repairItem(it) {
    Hero.repairsDone = (Hero.repairsDone || 0) + 1;
    const cost = this.repairCost(it);
    if (cost <= 0) return false;
    if (Hero.gold < cost) { UI.toast('Not enough gold — ' + cost + 'g to repair', '#e04a5a'); AudioSys.sfx('denied'); return false; }
    Hero.gold -= cost;
    it.dur = it.durMax;
    AudioSys.sfx('craft');
    if (Game.player) this.apply();
    Hero.save();
    return true;
  },
  repairAllCost() {
    return this.damagedGear().reduce((s, it) => s + this.repairCost(it), 0);
  },
  repairAll() {
    Hero.repairsDone = (Hero.repairsDone || 0) + this.damagedGear().length;
    const cost = this.repairAllCost();
    if (cost <= 0) return false;
    if (Hero.gold < cost) { UI.toast('Not enough gold — ' + cost + 'g to repair all', '#e04a5a'); AudioSys.sfx('denied'); return false; }
    Hero.gold -= cost;
    for (const it of this.damagedGear()) it.dur = it.durMax;
    UI.toast('All gear repaired', '#4ade80');
    AudioSys.sfx('craft');
    if (Game.player) this.apply();
    Hero.save();
    return true;
  },
  // kind: 'armor' wears the six armor slots (hits taken), 'weapon' wears
  // weapon+offhand (casting). Breaking a piece re-applies stats immediately.
  wearEquipped(n, kind) {
    const slots = kind === 'weapon' ? ['weapon', 'offhand']
      : ['helm', 'shoulders', 'chest', 'gloves', 'legs', 'boots'];
    let broke = false;
    for (const slot of slots) {
      const it = Hero.equipped[slot];
      if (!this.hasDurability(it)) continue;
      this.ensureDur(it);
      if (it.dur <= 0) continue;
      it.dur = Math.max(0, it.dur - n);
      if (it.dur === 0) { broke = true; UI.toast(it.name + ' BROKE — repair it at the Smithy', '#e04a5a'); }
    }
    if (broke && Game.player) { this.apply(); AudioSys.sfx('denied'); }
  },
  // Death costs 10% of every equipped piece's MAX durability (D3 rule).
  wearOnDeath() {
    let broke = false;
    for (const slot of this.DUR_SLOTS) {
      const it = Hero.equipped[slot];
      if (!this.hasDurability(it)) continue;
      this.ensureDur(it);
      const was = it.dur;
      it.dur = Math.max(0, it.dur - Math.ceil(it.durMax * 0.10));
      if (was > 0 && it.dur === 0) broke = true;
    }
    if (broke) UI.toast('Gear broke in death — see the Smithy', '#e04a5a');
    if (Game.player) this.apply();
  },

  setCount() {
    let n = 0;
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.set === 'inarius' && !this.isBroken(it)) n++;
    }
    return n;
  },

  equippedPowers() {
    const p = {};
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.power && !this.isBroken(it)) p[it.power] = true;
    }
    // Cube: up to 3 EXTRACTED legendary powers the hero has switched on apply
    // even without the item equipped (Kanai-style).
    for (const k of (Hero.cubeActive || [])) if (LEGENDARY_POWERS[k]) p[k] = true;
    return p;
  },

  // Loose bag legendaries that carry an extractable power AND aren't already in
  // the Cube. (Equipped or stashed items don't qualify — must be in inventory.)
  extractable() {
    return Hero.bag.filter(it => it && it.power && !it.torch && LEGENDARY_POWERS[it.power]
      && !(Hero.cubePowers || []).includes(it.power));
  },

  extractCost() { return { parts: 30, dust: 50, crystal: 50, soul: 3 }; },

  // Instruction of Bellmahath: rip the legendary power out of a loose item into the
  // Cube's bank (destroys the item), paying reagents.
  extractPower(item) {
    if (!item || !item.power || !LEGENDARY_POWERS[item.power]) return;
    if ((Hero.cubePowers || []).includes(item.power)) { UI.toast('That power is already in the Cube', '#9a9080'); return; }
    const c = this.extractCost();
    for (const [k, n] of Object.entries(c)) {
      if ((Hero.mats[k] || 0) < n) { UI.toast('Need ' + n + ' ' + MATERIALS[k].name, '#9a9080'); AudioSys.sfx('denied'); return; }
    }
    for (const [k, n] of Object.entries(c)) Hero.mats[k] -= n;
    const i = Hero.bag.indexOf(item);
    if (i >= 0) Hero.bag.splice(i, 1);
    Hero.cubePowers = Hero.cubePowers || [];
    Hero.cubePowers.push(item.power);
    Hero.save();
    UI.toast('Extracted: ' + LEGENDARY_POWERS[item.power].name + ' → the Cube', '#ff5a4a');
    AudioSys.sfx('setdrop');
  },

  // Toggle one of the banked powers on/off (max 3 active), then re-derive stats.
  toggleCubePower(key) {
    Hero.cubeActive = Hero.cubeActive || [];
    const i = Hero.cubeActive.indexOf(key);
    if (i >= 0) { Hero.cubeActive.splice(i, 1); }
    else {
      if (Hero.cubeActive.length >= 4) { UI.toast('Only 4 powers can be active at once', '#9a9080'); AudioSys.sfx('denied'); return; }
      Hero.cubeActive.push(key);
    }
    this.apply();
    Hero.save();
    AudioSys.sfx('gem');
  },

  // Priority tiers for judging upgrades (owner rule): OFFENSE (damage & crit —
  // plus Death Nova / Area, which ARE damage) is weighed BEFORE ALL ELSE, then
  // SURVIVAL (life & life-regen), then UTILITY (armor, gold, essence, movement).
  // Per-stat values just normalize the very different affix magnitudes so they
  // compare fairly within a tier.
  // dmg is the headline offense stat: +100% damage is worth MORE than +100%
  // crit chance, so dmg outweighs crit per point (they used to be reversed).
  STAT_TIER: { dmg: 0, crit: 0, dnova: 0, area: 0, int: 0, atkSpeed: 0, critDmg: 0, cdr: 0, elem: 0, hp: 1, reg: 1, vit: 1, lph: 1, armor: 2, gold: 2, ess: 2, move: 2, rcr: 2 },
  STAT_VAL:  { dmg: 1600, crit: 1000, dnova: 700, area: 500, int: 1.6, atkSpeed: 900, critDmg: 600, cdr: 800, elem: 900, hp: 2.4, reg: 34, vit: 12, lph: 3, armor: 0.7, gold: 110, ess: 16, move: 210, rcr: 300 },

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
    // Socketed gems are realized power — credit by tier (their stats span very
    // different magnitudes, so tier is the fair yardstick).
    for (const g of item.gems || []) t[0] += (g.tier + 1) * 130;
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
    // Equipping from a torch STACK peels off a SINGLE torch and leaves the pile.
    let toEquip = item;
    if (item.torch && (item.count || 1) > 1) {
      item.count -= 1;
      toEquip = Object.assign({}, item, { count: 1 });
    } else {
      Hero.bag.splice(idx, 1);
    }
    const cur = Hero.equipped[slot];
    toEquip.slot = slot;           // rebrand a ring to the chosen ring slot
    Hero.equipped[slot] = toEquip;
    // The piece coming off goes back to the bag — a full torch re-stacks.
    if (cur) { if (cur.torch) this.addTorchToBag(cur); else Hero.bag.push(cur); }
    // Remember the piece we just took off so the inventory can offer a one-tap
    // "re-wear" (owner request) — no digging through the bag to change your mind.
    Game.lastSwap = cur ? { slot, item: cur } : null;
    this.apply();
    UI.toast('Equipped: ' + toEquip.name, RARITIES[toEquip.rarity].color);
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
    // Artifact and above: stars sweeten the soul yield (owner rule).
    const n = item.rarity >= 6 ? R.salvageN + (item.stars || 0) : R.salvageN;
    return { mat: R.salvage, n };
  },

  grantSalvage(item, quiet = false) {
    // Fallback keeps ALL loot salvageable even if an item has a missing/odd rarity.
    const { mat, n } = this.salvageYield(item);
    Hero.mats[mat] = (Hero.mats[mat] || 0) + n;
    Hero.salvagedCount = (Hero.salvagedCount || 0) + 1;   // Lucas's quest counter
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

  // Exact gold cost by SMITH LEVEL (owner spec), Standard and Masterwork.
  SMITH_GOLD_STD: { 1: 200, 2: 400, 3: 600, 4: 800, 5: 1000, 6: 1400, 7: 1800, 8: 2500, 9: 4000, 10: 6000 },
  SMITH_GOLD_MW: { 1: 500, 2: 900, 3: 1300, 4: 1700, 5: 2100, 6: 2900, 7: 3700, 8: 4500, 9: 5300, 10: 8000 },

  craftCost(master = false) {
    // Gold cost is a fixed table per smith level (owner spec). Material
    // requirement still scales with the GEAR LEVEL forged (the band ceiling):
    //   lvl 1–15 Parts · 16–30 +Crystals · 31–60 +Dust · 61–70 +Souls.
    const lvl = clamp(Hero.artisans.smith || 1, 1, 10);
    const hi = this.smithRange()[1];
    const cost = {
      gold: (master ? this.SMITH_GOLD_MW : this.SMITH_GOLD_STD)[lvl],
      parts: master ? 6 : 4
    };
    if (hi >= 16) cost.crystal = master ? 3 : 2;
    if (hi >= 31) cost.dust = master ? 4 : 2;
    if (hi >= 61) cost.soul = master ? 2 : 1;
    return cost;
  },

  // Gold the town merchant pays for the player's gear. Kept well below salvage's
  // material value so salvaging still matters, but a real gold path (owner req).
  sellValue(item) {
    if (!item || item.torch) return 0;
    const s = this.score(item) || 0;
    return Math.max(5, Math.round((18 + s * 0.6) * (1 + (item.rarity || 0) * 0.5)));
  },

  buyPrice(it) {
    return Math.round((40 + this.score(it) * 1.4) * (1 + it.rarity * 0.9));
  },

  // Reagents the merchant sometimes stocks, with per-unit gold prices and the
  // bundle size sold (owner spec).
  MERCHANT_REAGENTS: [
    { mat: 'parts',   unit: 10,   qty: 10 },
    { mat: 'dust',    unit: 50,   qty: 5 },
    { mat: 'crystal', unit: 200,  qty: 3 },
    { mat: 'soul',    unit: 1000, qty: 1 },
    { mat: 'lumber',  unit: 25,   qty: 5 },
    { mat: 'rivets',  unit: 50,   qty: 5 }
  ],

  // A fresh 5-item stock for the town merchant, scaled to the hero. Each slot
  // rolls a CATEGORY by owner weights: 50% armor · 35% weapon/off-weapon · 10%
  // ring/amulet · 5% reagents.
  townStock() {
    const mLvl = Math.max(1, (Hero.level || 1) + (Hero.difficulty || 0) * 6);
    const ARMOR = ['helm', 'shoulders', 'chest', 'gloves', 'legs', 'boots'];
    const WEAPON = ['weapon', 'offhand'];   // offhand = Phylactery
    const JEWEL = ['ring1', 'amulet'];
    const stock = [];
    for (let i = 0; i < 5; i++) {
      const roll = Math.random();
      if (roll < 0.05) {
        const r = pick(this.MERCHANT_REAGENTS);
        stock.push({ kind: 'reagent', mat: r.mat, qty: r.qty, price: r.unit * r.qty, sold: false });
        continue;
      }
      let slot;
      if (roll < 0.55) slot = pick(ARMOR);           // 50%
      else if (roll < 0.90) slot = pick(WEAPON);      // 35%
      else slot = pick(JEWEL);                         // 10%
      const boost = i === 0 ? 0.3 : 0.05;
      const item = this.generate(mLvl + (i === 0 ? 2 : 0), boost, slot);
      stock.push({ kind: 'gear', item, price: this.buyPrice(item), sold: false });
    }
    return stock;
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
    Hero.itemsCrafted = (Hero.itemsCrafted || 0) + 1;   // Lukus's quest counter
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
    Hero.gemsCombined = (Hero.gemsCombined || 0) + 1;   // Lukus's quest counter
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

  // Cost to cut a random gem, by JEWELER LEVEL (owner spec).
  GEM_CUT_GOLD: { 1: 500, 2: 1000, 3: 2000, 4: 3000, 5: 4000, 6: 5000, 7: 6000, 8: 7000, 9: 8000, 10: 9000 },

  // Jeweler trades in gold and gems only.
  gemPrice() {
    return { gold: this.GEM_CUT_GOLD[clamp(Hero.artisans.jeweler || 1, 1, 10)] };
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
    Hero.itemsCrafted = (Hero.itemsCrafted || 0) + 1;   // Lukus's quest counter
    UI.toast('Cut a fresh gem: ' + gemName(gem), GEM_TYPES[gem.type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  // Craft a gem of a CHOSEN type (Jeweler's gem bench). The CUT and the COST
  // are set by JEWELER LEVEL (owner spec): L1 Chipped @1,000g climbing the
  // ladder to L10 Royal Imperial @700,000g.
  GEM_CRAFT_LEVELS: {
    1:  { tier: 0,  gold: 1000 },     // Chipped
    2:  { tier: 3,  gold: 2000 },     // Square
    3:  { tier: 4,  gold: 4300 },     // Flawless Square
    4:  { tier: 5,  gold: 8900 },     // Brilliant Square
    5:  { tier: 6,  gold: 18500 },    // Star
    6:  { tier: 7,  gold: 38000 },    // Flawless Star
    7:  { tier: 8,  gold: 79000 },    // Radiant Star
    8:  { tier: 9,  gold: 163000 },   // Imperial
    9:  { tier: 10, gold: 340000 },   // Flawless Imperial
    10: { tier: 11, gold: 700000 }    // Royal Imperial
  },
  gemCraftSpec() {
    return this.GEM_CRAFT_LEVELS[clamp(Hero.artisans.jeweler || 1, 1, 10)];
  },
  gemCraftCost() {
    return { gold: this.gemCraftSpec().gold };
  },
  craftGem(type) {
    if (!GEM_TYPES[type]) return;
    const spec = this.gemCraftSpec();
    const cost = { gold: spec.gold };
    if (!this.canAfford(cost)) {
      UI.toast('Not enough gold', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.pay(cost);
    const gem = { type, tier: spec.tier };
    Hero.gems.push(gem);
    Hero.itemsCrafted = (Hero.itemsCrafted || 0) + 1;   // quest counter
    UI.toast('Crafted: ' + gemName(gem), GEM_TYPES[type].color);
    AudioSys.sfx('gem');
    Hero.save();
  },

  // Gems sell to the Jeweler for gold — value roughly triples per tier (3 of a
  // tier combine into 1 of the next), softened up a touch by jeweler training.
  gemSellValue(tier) {
    return Math.round(40 * Math.pow(3, tier) * (2 - this.artisanDiscount('jeweler')));
  },

  sellGem(type, tier, all = false) {
    Hero.gemsSold = (Hero.gemsSold || 0) + (all ? Hero.gems.filter(g => g.type === type && g.tier === tier).length : 1);
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
  //   Set = 1 · Legendary 0-3★ = 1..4 · Artifact 0-5★ = 5..10 ·
  //   Relic = 8..13 · Ancient = 11..16 · Mythic = 14..19
  mysticSoulCost(item) {
    const st = item.stars || 0;
    if (item.rarity === 4) return 1 + st;   // Legendary
    if (item.rarity === 5) return 1;        // Set
    if (item.rarity === 6) return 5 + st;   // Artifact
    if (item.rarity === 7) return 8 + st;   // Relic
    if (item.rarity === 8) return 11 + st;  // Ancient
    if (item.rarity >= 9) return 14 + st;   // Mythic
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
    return (item.trash ? 0.6 : 1) * (1 + (item.stars || 0) * 0.18) *
      (item.rarity >= 7 ? 1.25 : item.rarity === 6 ? 1.15 : 1);
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
    Hero.enchantsDone = (Hero.enchantsDone || 0) + 1;   // Lukus's quest counter
    // Rare 10% chance: the Mystic uncovers a new gem slot, up to the item's cap
    // (a per-item override like the Funerary Pick's 3, else the rarity cap).
    const maxS = item.maxSockets != null ? item.maxSockets : (MAX_SOCKETS[item.rarity] || 0);
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

  // Per-hit base damage of each primary, for the "raw damage" readout.
  PRIMARY_HIT_BASE: { boneSpikes: 14, grimScythe: 11, siphonBlood: 6 },

  // A concrete raw per-hit damage number: the equipped primary's base × your
  // damage multiplier, plus flat gem damage (Ruby). This is the number that
  // grows when you socket a Ruby — the weapon's % affix is a separate multiplier
  // and (by design) a Ruby never changes it.
  rawHit(s) {
    s = s || this.computeStats();
    const base = this.PRIMARY_HIT_BASE[Hero.loadout[0]] || 14;
    return Math.round(base * s.dmgMult) + (s.flatDmg || 0);
  },

  // Hero level + gear + gems + passives, as a plain stats object.
  // Works with no live Player (used by the character sheet in camp).
  computeStats() {
    let dmg = 0, hp = 0, crit = 0, ess = 0, reg = 0, gold = 0, armor = 0, move = 0, xpBonus = 0, dnova = 0, area = 0;
    // Core D3 attributes + attack speed (owner-queued stat systems).
    let intel = 0, vit = 0, atkSpeed = 0, elem = 0;
    // New gem stats (each gem grants two; see GEM_STATS in data.js).
    let resAll = 0, cdr = 0, critDmg = 0, rcr = 0, lph = 0, flatDmg = 0;
    const at70 = Hero.level >= MAX_LEVEL;
    const gather = (it, slot) => {
      if (!it) return;
      // BROKEN gear (durability 0) contributes nothing until repaired —
      // exactly as if the piece were taken off (owner rule, D3 behavior).
      if (this.isBroken(it)) return;
      dmg += it.stats.dmg || 0;
      hp += it.stats.hp || 0;
      crit += it.stats.crit || 0;
      ess += it.stats.ess || 0;
      reg += it.stats.reg || 0;
      gold += it.stats.gold || 0;
      armor += it.stats.armor || 0;
      move += it.stats.move || 0;
      intel += it.stats.int || 0;
      vit += it.stats.vit || 0;
      atkSpeed += it.stats.atkSpeed || 0;
      elem += it.stats.elem || 0;
      // Combat stats now rollable as affixes too — add on top of any gem sources.
      critDmg += it.stats.critDmg || 0;
      cdr += it.stats.cdr || 0;
      rcr += it.stats.rcr || 0;
      lph += it.stats.lph || 0;
      dnova += it.stats.dnova || 0;
      area += it.stats.area || 0;
      for (const g of it.gems || []) {
        const gs = gemStats(g);            // { keyA: valA, keyB: valB }
        if (gs.flatDmg) flatDmg += gs.flatDmg;
        if (gs.xp)      xpBonus += at70 ? gs.xp * 0.1 : gs.xp;   // XP bonus shrinks at cap
        if (gs.critDmg) critDmg += gs.critDmg;
        if (gs.gold)    gold += gs.gold;
        if (gs.lph)     lph += gs.lph;
        if (gs.hp)      hp += gs.hp;
        if (gs.rcr)     rcr += gs.rcr;
        if (gs.resAll)  resAll += gs.resAll;
        if (gs.cdr)     cdr += gs.cdr;
        // Slot-specific gem boons:
        //  · Ruby in the HELM  → +20% XP (2.0% at the level cap, like all XP)
        //  · Emerald in BOOTS  → +20% movement speed
        if (g.type === 'ruby' && slot === 'helm') xpBonus += at70 ? 0.02 : 0.20;
        if (g.type === 'emerald' && slot === 'boots') move += 0.20;
      }
    };
    for (const slot of Object.keys(ITEM_SLOTS)) gather(Hero.equipped[slot], slot);
    const lvl = Hero.level;
    // PARAGON — points spent past 70 amplify the derived stats. Fractions ADD to
    // fractional stats (crit, cdr, resist…); multipliers scale base stats.
    const pb = k => (Hero.paragonBonus ? Hero.paragonBonus(k) : 0);
    const paraHpMul = 1 + pb('vitality') + pb('lifePct');
    const paraDmgMul = 1 + pb('intelligence');
    const paraManaMul = 1 + pb('maxMana');
    armor *= 1 + pb('paraArmor');
    reg *= 1 + pb('lifeRegen');
    lph *= 1 + pb('paraLph');
    crit += pb('paraCritChance');
    critDmg += pb('paraCritDmg');
    cdr += pb('paraCdr');
    rcr += pb('paraRcr');
    area += pb('paraArea');
    move += pb('moveSpeed');
    const paraResistDR = pb('paraResAll');   // adds straight to the resist DR fraction
    const pickupRadius = pb('pickup');
    // Armor → damage reduction, capped at 80%. Big denominator (owner rule):
    // low armor barely helps (201 armor ≈ 0.3%, you're squishy), while the
    // best endgame armor climbs into the hundreds of thousands for real
    // mitigation (≈75% at 200k, cap at ~268k).
    const armorDR = clamp(armor / (armor + 67000), 0, 0.80);
    // All-element resistance → its own damage reduction, stacked with armor.
    // Diminishing (owner-tunable): ~66% at 5000 resist, hard cap 80%.
    const resistDR = clamp(resAll / (resAll + 2500) + paraResistDR, 0, 0.80);
    // The Royal Grandeur: set bonuses need one fewer piece (min 2) — modelled as
    // +1 effective set pieces once you already have at least 2.
    const powers = this.equippedPowers();
    const rawSet = this.setCount();
    const setCountEff = (powers.royalGrandeur && rawSet >= 2) ? Math.min(6, rawSet + 1) : rawSet;
    // Intelligence (the Necromancer's MAIN stat) adds 0.1% damage per point;
    // Vitality adds 5 Life per point — both fold in alongside the % affixes.
    const intDmg = intel * 0.001;
    const vitHp = vit * 5;
    return {
      dmgMult: (1 + (lvl - 1) * 0.09) * (1 + dmg + intDmg) * paraDmgMul,
      gearDmg: dmg,
      intelligence: Math.round(intel),
      vitality: Math.round(vit),
      // Gear + paragon Attack Speed — REAL attack speed (faster primary/secondary
      // casts and minion attacks), not damage as it mistakenly was.
      attackSpeed: clamp(atkSpeed + pb('attackSpeed'), 0, 0.75),
      elementalDamage: clamp(elem, 0, 5),      // +% Cold/Fire/Poison/Lightning damage
      maxHp: Math.round((110 + (lvl - 1) * 14 + hp + vitHp) * paraHpMul),
      critChance: 0.10 + crit,
      essenceRegen: 2 + ess,
      hpRegen: reg,
      goldFind: 1 + gold,
      maxEssence: Math.round((100 + (Hero.hasPassive('overwhelming') ? 40 : 0)) * paraManaMul),
      armor: Math.round(armor),
      armorDR,
      moveSpeed: clamp(move, 0, 0.25),  // boots + paragon — HARD CAP 25% (owner rule v1.7.1; only Fleetfoot passes it)
      xpBonus,
      deathNovaBonus: dnova,
      areaDamage: clamp(area, 0, 2),
      pickupRadius,
      // Gem-driven stats.
      resistAll: Math.round(resAll),
      resistDR,
      cooldownReduction: clamp(cdr, 0, 0.60),   // Diamond
      critDamage: critDmg,                       // Emerald — added to the crit multiplier
      resourceCostReduction: clamp(rcr, 0, 0.60),// Topaz
      lifePerHit: Math.round(lph),               // Amethyst
      flatDmg: Math.round(flatDmg),              // Ruby — flat damage per hit
      setCount: setCountEff,
      setCountRaw: rawSet,
      powers
    };
  },

  // Fold the derived stats into the live Player entity.
  apply() {
    // THE FORGOTTEN CRYPT unlocks the moment SIX worn pieces are Artifacts
    // (owner rule v1.7.6) — a big popup + a permanent achievement.
    if (typeof Hero !== 'undefined' && !Hero.cryptUnlocked) {
      const nArt = Object.values(Hero.equipped || {}).filter(it => it && it.rarity >= 6).length;
      if (nArt >= 6) {
        Hero.cryptUnlocked = true;
        Hero.save();
        if (typeof AudioSys !== 'undefined') AudioSys.sfx('setdrop');
        if (typeof UI !== 'undefined' && UI.open) UI.open('cryptUnlock');
      }
    }
    const p = Game.player;
    if (!p) return;
    const s = this.computeStats();
    const oldMax = p.maxHp || s.maxHp;
    p.dmgMult = s.dmgMult;
    p.baseMaxHp = s.maxHp;   // pre-buff base (Satiated rune rescales p.maxHp off this)
    p.maxHp = Math.round(s.maxHp * (1 + 0.02 * (p.satiatedStacks || 0)));
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
    p.resistAll = s.resistAll;
    p.resistDR = s.resistDR;
    p.cdr = s.cooldownReduction;
    p.critDmg = s.critDamage;
    p.rcr = s.resourceCostReduction;
    p.atkSpeed = s.attackSpeed;   // Attack Speed → shorter Primary/Secondary cooldowns
    p.elemDmg = s.elementalDamage; // +% elemental (non-physical) damage
    p.lifePerHit = s.lifePerHit;
    p.flatDmg = s.flatDmg;
    p.xpBonus = s.xpBonus;
    p.deathNovaBonus = s.deathNovaBonus;
    p.areaDamage = s.areaDamage;
    p.pickupRadius = s.pickupRadius || 0;   // paragon pickup radius (fraction)
    p.speed = 180 * (1 + s.moveSpeed);   // base 180 + movement-speed affix
    p.setCount = s.setCount;
    p.powers = s.powers;
    p.essence = Math.min(p.essence ?? 60, p.maxEssence);
  }
};
