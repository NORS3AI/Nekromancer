'use strict';
// ---------------------------------------------------------------------------
// The Hero: the persistent RPG character. Level, gear, bag, gems, crafting
// materials, skill loadout and passives all live here and are saved to
// localStorage. The in-zone Player entity is built from this each run.
// ---------------------------------------------------------------------------

const SAVE_KEY = 'nekromancer_hero_v1';
const SAVES_KEY = 'nekromancer_saves_v1';

// Resilient localStorage write. Browsers cap localStorage (~5 MB on iPhone
// Safari); once it's full EVERY setItem throws QuotaExceededError, which used to
// be swallowed silently — so the game just stopped saving with no warning. Now:
// on a full store we drop the OLDEST manual save (progress matters more than an
// old snapshot) and retry once; a hard failure is surfaced ONCE so the player
// knows to free space. Returns true on success.
let _storageWarned = false;
// Is localStorage writable AT ALL? In iPhone Safari Private Browsing (and when
// site storage is blocked) even a 1-byte write throws — that's "blocked", which
// is different from "full". Used to give the player an accurate warning.
function storageBlocked() {
  try { localStorage.setItem('__nek_probe__', '1'); localStorage.removeItem('__nek_probe__'); return false; }
  catch (e) { return true; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); _storageWarned = false; return true; }
  catch (e) {
    // Free room by pruning the oldest manual save, then retry (never for the
    // saves key itself — that would just rewrite the value we're pruning).
    if (key !== SAVES_KEY) {
      try {
        const raw = localStorage.getItem(SAVES_KEY);
        const saves = raw ? JSON.parse(raw) : [];
        if (saves && saves.length) {
          saves.shift();
          localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
          localStorage.setItem(key, value);
          if (typeof UI !== 'undefined') UI.toast('Storage was full — dropped the oldest manual save so your progress keeps saving', '#ffb43a');
          return true;
        }
      } catch (e2) { /* still out of room */ }
    }
    if (!_storageWarned && typeof UI !== 'undefined') {
      _storageWarned = true;
      UI.toast(storageBlocked()
        ? '⚠ Saving is blocked by your browser (Private Browsing?). Turn off Private Browsing to save.'
        : '⚠ Storage is full. Sell/salvage items and delete old manual saves to free space.',
        '#e04a5a');
      if (typeof AudioSys !== 'undefined') AudioSys.sfx('denied');
    }
    return false;
  }
}
// Up to 3 concurrent character profiles (Diablo-style roster). The active
// character mirrors to SAVE_KEY for backward compatibility.
const PROFILES_KEY = 'nekromancer_profiles_v1';
// Shared, account-wide stash — one vault for ALL characters/saves, stored
// separately from any single hero so it never travels with a save slot.
const STASH_KEY = 'nekromancer_stash_v1';
const STASH_TIER_KEY = 'nekromancer_stashtier_v1';
// Per-EQUIP-SLOT capacity by upgrade tier, and the gold cost to reach each.
const STASH_PER_SLOT = [100, 1000, 5000, 10000];
const STASH_UP_COST = [0, 500000, 50000000, 999000000];

// Named manual save slots (up to 20), separate from the rolling autosave.
const Saves = {
  MAX: 20,

  list() {
    try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e) { return []; }
  },

  persist(arr) {
    return lsSet(SAVES_KEY, JSON.stringify(arr));
  },

  add(name) {
    const arr = this.list();
    if (arr.length >= this.MAX) {
      UI.toast('All 20 save slots are full — delete one first', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    const when = new Date();
    arr.push({
      // Auto-labelled "Level 13 — 8:41 AM".
      name: 'Level ' + Hero.level + ' — ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: when.toLocaleDateString(),
      level: Hero.level,
      data: Hero.snapshot()
    });
    if (this.persist(arr)) {
      UI.toast('Saved: ' + arr[arr.length - 1].name, '#6ff7c3');
      AudioSys.sfx('level');
    } else {
      UI.toast('⚠ Save failed — storage is full. Delete a manual save or salvage/sell items to free space.', '#e04a5a');
      AudioSys.sfx('denied');
    }
  },

  load(i) {
    const arr = this.list();
    const s = arr[i];
    if (!s) return;
    Hero.applySnapshot(s.data);
    UI.toast('Loaded: ' + s.name, '#6ff7c3');
    AudioSys.sfx('level');
    Game.enterTown();   // the town is the first map after a load (owner rule)
  },

  remove(i) {
    const arr = this.list();
    const s = arr.splice(i, 1)[0];
    if (s) {
      this.persist(arr);
      UI.toast('Deleted save: ' + s.name, '#9a9080');
    }
  },

  // ------- portable export / import (move a hero between browsers/devices) -----
  // A save code is "NEKRO1:" + base64(JSON snapshot). Unicode-safe (hero names).
  exportCode() {
    try {
      const json = JSON.stringify(Hero.snapshot());
      return 'NEKRO1:' + btoa(unescape(encodeURIComponent(json)));
    } catch (e) { return null; }
  },

  // Parse a save code and REPLACE the current hero. Returns true on success.
  importCode(str) {
    if (!str) return false;
    let code = String(str).trim();
    const tag = code.indexOf('NEKRO1:');
    if (tag >= 0) code = code.slice(tag + 7);
    code = code.replace(/\s+/g, '');
    if (!code) return false;
    let data;
    try { data = JSON.parse(decodeURIComponent(escape(atob(code)))); }
    catch (e) { return false; }
    if (!data || typeof data !== 'object' || typeof data.level !== 'number' || !data.name) return false;
    Hero.applySnapshot(data);
    Hero.save();
    return true;
  }
};

const Hero = {
  name: 'The Nekromancer',
  eyeColor: '#6ff7c3',      // glowing-eye colour, chosen at character creation
  level: 1,
  xp: 0,
  paragon: 0,       // paragon levels earned past 70 (near-infinite)
  paragonXp: 0,     // XP banked toward the next paragon level
  np: 0,            // unspent Nekromancer Points
  para: {},         // allocated paragon points, keyed by PARAGON_STATS id
  paraOrder: [],    // spend history (keys, in order) for rotation + single-undo
  gold: 0,
  mats: { parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0, wyrmscale: 0, brain: 0, rathmasoul: 0 },
  gems: [],                 // [{type, tier}]
  bag: [],                  // unequipped items
  stash: [],                // shared vault, auto-sorted into equip-slot bins
  stashTier: 0,             // 0..3 → STASH_PER_SLOT capacity (account-wide)
  equipped: {},             // slot -> item
  // 6 slots, Diablo action bar: 0 primary (LMB) · 1 secondary (RMB) ·
  // 2-5 skills (keys 1-4).
  loadout: ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
  passives: [null, null, null, null, null],
  zonesCleared: 0,          // count of lands beaten (unlocks the next)
  actsCleared: 0,           // Story Mode acts finished (of 100 planned)
  actUniques: {},           // acts whose signature legendary has dropped once (→ 50% after)
  difficulty: 0,
  bestZone: 0,
  totalKills: 0,
  riftsCleared: 0,
  bountyProgress: 0,    // bounties finished toward the next Horadric Stash (0-2)
  riftKeys: 0,          // Nephalem Rift Keys (open Nephalem Rifts)
  masterKeys: 0,        // Master Nephalem Rift Keys (open Season rifts)
  seasonUnlocked: false, // latches true once the first Master Key is earned — Seasons stays visible
  hasCube: false,       // Horadric's Cube found (Act 3) — unlocks the town button
  goldenMirror: false,  // Golden Mirror in inventory (Treasure Goblin drop)
  orbAutoPickup: false, // Golden Mirror converted → rift/season orbs auto-collect
  cubePowers: [],       // legendary powers EXTRACTED into the Cube (the bank)
  cubeActive: [],       // up to 3 extracted powers the hero has switched ON
  artisans: { smith: 1, mystic: 1, jeweler: 1 },
  runes: {},                          // skillId -> rune id
  pet: null,            // cosmetic companion id (PETS), chosen at the Mystic
  wings: null,          // cosmetic wings id (WINGS), chosen at the Mystic
  journal: [],          // accepted quests: [{ idx, base[, src:'A'] }] — up to QUEST_JOURNAL_MAX (7)
  questRepool: [],      // abandoned quest idxs Lukus re-offers first (lowest first)
  questNext: 0,         // the next FRESH quest index Lukus offers (0-500)
  questLine: 0,         // Lukus quests TURNED IN — the ledger progress (0-500)
  addyRepool: [],       // abandoned Addy quest idxs, re-offered first
  addyNext: 0,          // the next FRESH quest Addy offers (0-500)
  addyLine: 0,          // Addy quests TURNED IN (0-500)
  daily: null,          // Addy's daily: { date, base (null = not taken), done }
  amOrbs: 0,            // Amidrassi Orbs — rift/season boss drops, spent at Lyssa
  gender: 'm',          // 'm' | 'f' — picks the painted avatar (creation choice)
  salvagedCount: 0,     // lifetime items salvaged (quest counter)
  eliteKills: 0,        // lifetime elite/champion kills (quest counter)
  bossKills: 0,         // lifetime boss/unique kills (quest counter)
  gemsCombined: 0,      // lifetime Jeweler gem merges (quest counter)
  itemsCrafted: 0,      // lifetime crafts — forge, torches, gems (quest counter)
  enchantsDone: 0,      // lifetime Mystic rerolls (quest counter)
  chestsOpened: 0,      // lifetime chests opened (quest counter)
  cheats: { god: false, essence: false, spawn: 0 }, // dev panel, kept per save
  bagTier: 0,               // purchased bag expansions (0 = base 24)
  bagBonus: 0,              // dev-granted extra slots (added on top of the tier)
  BAG_SIZE: 24,             // derived from bagTier via applyBagSize()
  STASH_SIZE: 100,
  SAVE_VERSION: 4,   // v2: Epic rarity @ index 3 · v3: item.gem → item.gems[] · v4: 13-tier gems

  fresh() {
    // name/eyeColor/gender are chosen at character creation; keep any already set.
    if (!this.name) this.name = 'The Nekromancer';
    if (!this.eyeColor) this.eyeColor = '#6ff7c3';
    if (!this.gender) this.gender = 'm';
    this.level = 1; this.xp = 0; this.gold = 0;
    this.paragon = 0; this.paragonXp = 0; this.np = 0; this.para = {}; this.paraOrder = [];
    this.mats = { parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0, wyrmscale: 0, brain: 0, rathmasoul: 0 };
    this.gems = [];
    this.bag = [];
    // NOTE: stash is account-wide (shared vault) — a fresh character does NOT
    // clear it. It is loaded/kept via loadStash()/saveStash().
    this.equipped = {};
    // Every Nekromancer starts holding a Wood torch against the dark.
    if (typeof Items !== 'undefined' && Items.makeTorch) this.equipped.torch = Items.makeTorch('wood');
    this.loadout = ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null];
    this.passives = [null, null, null, null, null];
    this.zonesCleared = 0;
    this.actsCleared = 0;
    this.actUniques = {};
    this.pet = null; this.wings = null;
    this.journal = []; this.questRepool = []; this.questNext = 0; this.questLine = 0;
    this.addyRepool = []; this.addyNext = 0; this.addyLine = 0; this.daily = null;
    this.amOrbs = 0;
    this.salvagedCount = 0; this.eliteKills = 0; this.bossKills = 0;
    this.gemsCombined = 0; this.itemsCrafted = 0; this.enchantsDone = 0; this.chestsOpened = 0;
    this.difficulty = 0;
    this.bestZone = 0;
    this.totalKills = 0;
    this.riftsCleared = 0;
    this.bountyProgress = 0;
    this.riftKeys = 0;
    this.masterKeys = 0;
    this.seasonUnlocked = false;
    this.hasCube = false;
    this.goldenMirror = false;
    this.orbAutoPickup = false;
    this.cubePowers = [];
    this.cubeActive = [];
    this.artisans = { smith: 1, mystic: 1, jeweler: 1 };
    this.runes = {};
    this.cheats = { god: false, essence: false, spawn: 0 };
    this.bagTier = 0;
    this.bagBonus = 0;
    this.applyBagSize();
  },

  // Bag capacity grows with purchased upgrades.
  applyBagSize() {
    const base = this.bagTier > 0 && BAG_UPGRADES[this.bagTier - 1]
      ? BAG_UPGRADES[this.bagTier - 1].size : 24;
    this.BAG_SIZE = base + (this.bagBonus || 0);
  },

  // Bag slots in use — torches persist in the bag but DON'T occupy a slot.
  bagUsed() {
    return (this.bag || []).reduce((n, it) => n + (it && !it.torch ? 1 : 0), 0);
  },

  nextBagUpgrade() {
    return this.bagTier < BAG_UPGRADES.length ? BAG_UPGRADES[this.bagTier] : null;
  },

  buyBagUpgrade() {
    const up = this.nextBagUpgrade();
    if (!up) { UI.toast('Bag is already at maximum size', '#9a9080'); AudioSys.sfx('denied'); return; }
    if (this.gold < up.cost) { UI.toast('Not enough gold', '#9a9080'); AudioSys.sfx('denied'); return; }
    this.gold -= up.cost;
    this.bagTier++;
    this.applyBagSize();
    this.save();
    UI.toast('Bag expanded to ' + this.BAG_SIZE + ' slots', '#6ff7c3');
    AudioSys.sfx('level');
  },

  snapshot() {
    return {
      v: this.SAVE_VERSION,
      name: this.name, eyeColor: this.eyeColor,
      level: this.level, xp: this.xp, gold: this.gold, mats: this.mats,
      paragon: this.paragon, paragonXp: this.paragonXp, np: this.np, para: this.para, paraOrder: this.paraOrder,
      gems: this.gems, bag: this.bag, equipped: this.equipped,
      loadout: this.loadout, passives: this.passives,
      zonesCleared: this.zonesCleared, actsCleared: this.actsCleared, actUniques: this.actUniques, difficulty: this.difficulty,
      bestZone: this.bestZone, totalKills: this.totalKills,
      riftsCleared: this.riftsCleared, bountyProgress: this.bountyProgress,
      riftKeys: this.riftKeys, masterKeys: this.masterKeys, seasonUnlocked: this.seasonUnlocked,
      hasCube: this.hasCube, goldenMirror: this.goldenMirror, orbAutoPickup: this.orbAutoPickup,
      cubePowers: this.cubePowers, cubeActive: this.cubeActive,
      artisans: this.artisans, runes: this.runes, cheats: this.cheats,
      pet: this.pet, wings: this.wings,
      journal: this.journal, questRepool: this.questRepool, questNext: this.questNext, questLine: this.questLine,
      addyRepool: this.addyRepool, addyNext: this.addyNext, addyLine: this.addyLine, daily: this.daily,
      amOrbs: this.amOrbs, gender: this.gender,
      salvagedCount: this.salvagedCount, eliteKills: this.eliteKills, bossKills: this.bossKills,
      gemsCombined: this.gemsCombined, itemsCrafted: this.itemsCrafted,
      enchantsDone: this.enchantsDone, chestsOpened: this.chestsOpened,
      bagTier: this.bagTier, bagBonus: this.bagBonus
    };
  },

  // v2: Epic rarity (index 3) inserted — shift Legendary/Set up.
  // v3: single item.gem replaced by an item.gems[] array (multi-socket).
  // v4: gem ladder went from 5 tiers to 13 — remap old tier indices.
  migrate(d) {
    const v = d.v || 1;
    const each = fn => {
      (d.bag || []).forEach(fn);
      (d.stash || []).forEach(fn);
      for (const k of Object.keys(d.equipped || {})) fn(d.equipped[k]);
    };
    if (v < 2) {
      each(it => {
        if (!it) return;
        if (it.set) it.rarity = 5;
        else if (it.rarity >= 3) it.rarity = 4;
      });
    }
    if (v < 3) {
      each(it => {
        if (!it) return;
        if (it.gems === undefined) it.gems = it.gem ? [it.gem] : [];
        delete it.gem;
      });
    }
    if (v < 4) {
      // Old 5 tiers (Chipped·Flawed·Regular·Flawless·Perfect) → new 13-tier ladder
      // (Chipped·Flawless·Perfect·…·Marquise), preserving rough value.
      const REMAP = [0, 0, 1, 1, 2];
      const fixGem = g => { if (g && g.tier != null) g.tier = REMAP[g.tier] != null ? REMAP[g.tier] : Math.min(g.tier, 2); };
      (d.gems || []).forEach(fixGem);
      each(it => { if (it && it.gems) it.gems.forEach(fixGem); });
    }
    d.v = 4;
    return d;
  },

  applySnapshot(d) {
    d = this.migrate(d);
    Object.assign(this, {
      name: d.name || 'The Nekromancer', eyeColor: d.eyeColor || '#6ff7c3',
      level: d.level || 1, xp: d.xp || 0, gold: d.gold || 0,
      paragon: d.paragon || 0, paragonXp: d.paragonXp || 0, np: d.np || 0,
      para: (d.para && typeof d.para === 'object') ? Object.assign({}, d.para) : {},
      paraOrder: Array.isArray(d.paraOrder) ? d.paraOrder.slice() : [],
      mats: Object.assign({ parts: 0, dust: 0, crystal: 0, soul: 0, lumber: 0, rivets: 0, heartstring: 0, wyrmscale: 0, brain: 0, rathmasoul: 0 }, d.mats),
      gems: d.gems || [], bag: d.bag || [], equipped: d.equipped || {},
      loadout: d.loadout || ['boneSpikes', 'boneSpear', 'corpseExplosion', null, null, null],
      passives: d.passives || [null, null, null, null, null],
      zonesCleared: d.zonesCleared || 0, actsCleared: d.actsCleared || 0,
      actUniques: (d.actUniques && typeof d.actUniques === 'object') ? Object.assign({}, d.actUniques) : {},
      difficulty: d.difficulty || 0,
      bestZone: d.bestZone || 0, totalKills: d.totalKills || 0,
      riftsCleared: d.riftsCleared || 0, bountyProgress: d.bountyProgress || 0,
      riftKeys: d.riftKeys || 0, masterKeys: d.masterKeys || 0,
      seasonUnlocked: !!d.seasonUnlocked || (d.masterKeys || 0) > 0,
      hasCube: !!d.hasCube, goldenMirror: !!d.goldenMirror, orbAutoPickup: !!d.orbAutoPickup,
      cubePowers: Array.isArray(d.cubePowers) ? d.cubePowers.slice() : [],
      cubeActive: Array.isArray(d.cubeActive) ? d.cubeActive.slice() : [],
      artisans: (() => {
        const a = Object.assign({ smith: 1, mystic: 1, jeweler: 1 }, d.artisans);
        for (const k of Object.keys(a)) a[k] = clamp(a[k], 1, 10); // artisans now cap at 10
        return a;
      })(),
      runes: d.runes || {},
      pet: d.pet || null, wings: d.wings || null,
      // The quest JOURNAL (up to QUEST_JOURNAL_MAX accepted quests). Migration:
      // an old single active quest ({idx, base}) becomes the journal's first
      // entry; ancient {id,...} quests are dropped (those repeatables are gone).
      journal: (() => {
        let j = Array.isArray(d.journal) ? d.journal : [];
        if (!j.length && d.quest && typeof d.quest === 'object' && typeof d.quest.idx === 'number') j = [d.quest];
        // Slots are PER GIVER: up to 7 of Lukus's AND 7 of Addy's survive a load.
        const seen = {}, cnt = { L: 0, A: 0 };
        return j.filter(e => {
          if (!e || typeof e.idx !== 'number' || e.idx < 0 || e.idx >= QUEST_COUNT) return false;
          const src = e.src === 'A' ? 'A' : 'L';
          const key = src + e.idx;
          if (seen[key] || cnt[src] >= QUEST_JOURNAL_MAX) return false;
          seen[key] = 1; cnt[src]++;
          return true;
        }).map(e => e.src === 'A' ? { idx: e.idx, base: e.base || 0, src: 'A' } : { idx: e.idx, base: e.base || 0 });
      })(),
      questRepool: Array.isArray(d.questRepool)
        ? d.questRepool.filter(i => typeof i === 'number' && i >= 0 && i < QUEST_COUNT) : [],
      addyRepool: Array.isArray(d.addyRepool)
        ? d.addyRepool.filter(i => typeof i === 'number' && i >= 0 && i < ADDY_QUEST_COUNT) : [],
      addyNext: clamp(d.addyNext || 0, 0, ADDY_QUEST_COUNT),
      addyLine: clamp(d.addyLine || 0, 0, ADDY_QUEST_COUNT),
      daily: (d.daily && typeof d.daily === 'object' && d.daily.date)
        ? { date: '' + d.daily.date, base: d.daily.base == null ? null : d.daily.base, done: !!d.daily.done } : null,
      amOrbs: Math.max(0, d.amOrbs || 0),
      gender: d.gender === 'f' ? 'f' : 'm',
      questLine: clamp(d.questLine || 0, 0, QUEST_COUNT),
      // Old saves have no questNext: the line pointer was questLine itself,
      // +1 if its quest was already accepted.
      questNext: d.questNext != null
        ? clamp(d.questNext, 0, QUEST_COUNT)
        : Math.max(clamp(d.questLine || 0, 0, QUEST_COUNT),
            (d.quest && typeof d.quest === 'object' && typeof d.quest.idx === 'number') ? d.quest.idx + 1 : 0),
      salvagedCount: d.salvagedCount || 0,
      eliteKills: d.eliteKills || 0, bossKills: d.bossKills || 0,
      gemsCombined: d.gemsCombined || 0, itemsCrafted: d.itemsCrafted || 0,
      enchantsDone: d.enchantsDone || 0, chestsOpened: d.chestsOpened || 0,
      cheats: Object.assign({ god: false, essence: false, spawn: 0 }, d.cheats),
      bagTier: clamp(d.bagTier || 0, 0, BAG_UPGRADES.length),
      bagBonus: Math.max(0, d.bagBonus || 0)
    });
    this.applyBagSize();
    // Legacy migration: pre-shared saves embedded a per-character stash. If the
    // shared vault is still empty, absorb those items so nothing is lost.
    if (d.stash && d.stash.length && (!this.stash || !this.stash.length)) {
      this.stash = d.stash.slice(0, this.STASH_SIZE);
      this.saveStash();
    }
    this.sanitize();
    this.save();
    Items.apply();
  },

  save() {
    try { lsSet(SAVE_KEY, JSON.stringify(this.snapshot())); } catch (e) { /* serialization guard */ }
    this.saveStash();
    // Mirror into the active roster slot so profiles stay current.
    if (typeof Profiles !== 'undefined') Profiles.saveActive();
  },

  // --- Per-slot stash (auto-sorted, upgradable) ---
  // Items live in one shared array but are BINNED by equip-slot family; each bin
  // holds STASH_PER_SLOT[tier]. Torches stack and never count against a bin.
  stashPerSlot() { return STASH_PER_SLOT[clamp(this.stashTier || 0, 0, STASH_PER_SLOT.length - 1)]; },
  stashSlotCount(slot) {
    const fam = Items.slotFamily(slot);
    let n = 0;
    for (const it of this.stash) if (it && !it.torch && fam.includes(it.slot)) n++;
    return n;
  },
  stashSlotItems(slot) {
    const fam = Items.slotFamily(slot);
    return this.stash.filter(it => it && !it.torch && fam.includes(it.slot));
  },
  stashUpgradeCost() {
    const t = (this.stashTier || 0) + 1;
    return t < STASH_PER_SLOT.length ? STASH_UP_COST[t] : null;
  },
  buyStashUpgrade() {
    const cost = this.stashUpgradeCost();
    if (cost === null) return;
    if (this.gold < cost) { UI.toast('Not enough gold to upgrade the stash', '#9a9080'); AudioSys.sfx('denied'); return; }
    this.gold -= cost;
    this.stashTier++;
    this.saveStash(); this.save();
    UI.toast('Stash upgraded — ' + this.stashPerSlot().toLocaleString() + ' per slot', '#6ff7c3');
    AudioSys.sfx('craft');
  },

  // Persist the shared vault to its own key (never inside a save slot).
  saveStash() {
    try { lsSet(STASH_KEY, JSON.stringify(this.stash || [])); } catch (e) { /* serialization guard */ }
    lsSet(STASH_TIER_KEY, String(this.stashTier || 0));
  },

  // Load the shared vault. On first run after the shared-stash update, seed it
  // from the active character's legacy embedded stash (one-time migration).
  loadStash() {
    try {
      this.stashTier = clamp(+(localStorage.getItem(STASH_TIER_KEY) || 0) || 0, 0, STASH_PER_SLOT.length - 1);
      const raw = localStorage.getItem(STASH_KEY);
      if (raw !== null) { this.stash = JSON.parse(raw) || []; this.mergeStashTorches(); return; }
      // No shared vault yet — migrate from the current hero save if present.
      let seed = [];
      try {
        const hraw = localStorage.getItem(SAVE_KEY);
        if (hraw) { const hd = this.migrate(JSON.parse(hraw)); seed = hd.stash || []; }
      } catch (e) { /* ignore */ }
      this.stash = seed.slice(0, this.STASH_SIZE);
      this.mergeStashTorches();
      this.saveStash();
    } catch (e) { this.stash = this.stash || []; }
  },

  // Torches no longer live in the Stash (owner rule) — pull any out into the
  // bag, where they persist WITHOUT taking a slot (see bagUsed()). Runs when
  // both the bag and the stash are loaded; if the bag isn't ready yet it leaves
  // the torches in place for the next pass (sanitize calls this too).
  mergeStashTorches() {
    if (!Array.isArray(this.stash)) return;
    const bagReady = Array.isArray(this.bag) && typeof Items !== 'undefined' && Items.makeTorch;
    const kept = [];
    for (const it of this.stash) {
      if (it && it.torch && bagReady) {
        const cnt = it.count || 1;
        for (let k = 0; k < cnt; k++) this.bag.push(Items.makeTorch(it.torch));
        continue;   // removed from the stash
      }
      kept.push(it);
    }
    this.stash = kept;
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.applySnapshot(JSON.parse(raw));
      return true;
    } catch (e) { return false; }
  },

  exists() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  },

  wipe() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    this.fresh();
  },

  // -------------------------------------------- Lukus's quest journal (≤7)

  // Progress of a journal entry: milestones read the counter absolutely,
  // deed quests measure counter − base-at-accept. Entries with src 'A' come
  // from Addy's ledger, all others from Lukus's.
  questProgress(entry) {
    const def = (entry.src === 'A' ? ADDY_QUEST_LINE : QUEST_LINE)[entry.idx];
    if (!def) return { def: null, prog: 0, done: false };
    const prog = clamp(def.abs ? def.counter() : def.counter() - entry.base, 0, def.need);
    return { def, prog, done: prog >= def.need };
  },

  // The quest an NPC offers next: abandoned quests come back first (lowest
  // index), then the next fresh one in the line. −1 = the ledger is
  // exhausted. src: undefined/'L' = Lukus · 'A' = Addy.
  questOffer(src) {
    const addy = src === 'A';
    const line = addy ? ADDY_QUEST_LINE : QUEST_LINE;
    const next = addy ? (this.addyNext || 0) : (this.questNext || 0);
    const pool = ((addy ? this.addyRepool : this.questRepool) || [])
      .filter(i => !(this.journal || []).some(e => e.idx === i && (e.src === 'A') === addy));
    if (pool.length) return Math.min.apply(null, pool);
    return next < line.length ? next : -1;
  },

  // Slots are PER GIVER (owner rule: the player can carry BOTH Lukus's and
  // Addy's quests): up to 7 of his AND 7 of hers at once.
  journalCount(src) {
    const addy = src === 'A';
    return (this.journal || []).filter(e => (e.src === 'A') === addy).length;
  },

  acceptQuest(src) {
    const addy = src === 'A';
    const idx = this.questOffer(src);
    if (idx < 0 || this.journalCount(src) >= QUEST_JOURNAL_MAX) return false;
    const def = (addy ? ADDY_QUEST_LINE : QUEST_LINE)[idx];
    const gateOk = def.gate.kind === 'level' ? this.level >= def.gate.at : (this.paragon || 0) >= def.gate.at;
    if (!gateOk) return false;
    const entry = { idx, base: def.abs ? 0 : def.counter() };
    if (addy) entry.src = 'A';
    this.journal.push(entry);
    const pool = addy ? this.addyRepool : this.questRepool;
    const k = pool.indexOf(idx);
    if (k >= 0) pool.splice(k, 1);
    else if (addy) this.addyNext = Math.max(this.addyNext || 0, idx + 1);
    else this.questNext = Math.max(this.questNext || 0, idx + 1);
    this.save();
    return def;
  },

  // Dropping a quest sends it back to its NPC's queue — nothing in either
  // 500 is ever lost, it just waits to be taken up again.
  abandonQuest(entry) {
    const k = this.journal.indexOf(entry);
    if (k < 0) return;
    this.journal.splice(k, 1);
    const pool = entry.src === 'A' ? this.addyRepool : this.questRepool;
    if (!pool.includes(entry.idx)) pool.push(entry.idx);
    this.save();
  },

  // Turn a finished journal entry in: pays gold/souls/XP (and a gem on bonus
  // quests), bumps that NPC's ledger. Returns the reward (with .gemGot) or null.
  completeQuest(entry) {
    const { def, done } = this.questProgress(entry);
    const k = this.journal.indexOf(entry);
    if (!def || !done || k < 0) return null;
    this.journal.splice(k, 1);
    const addy = entry.src === 'A';
    const rw = questRewardSrc(addy ? 'A' : 'L', entry.idx);
    this.gold += rw.gold;
    this.mats.soul = (this.mats.soul || 0) + rw.souls;
    if (rw.gem && typeof Items !== 'undefined') {
      rw.gemGot = Items.dropGem();
      this.gems.push(rw.gemGot);
    }
    if (addy) this.addyLine = Math.min(ADDY_QUEST_COUNT, (this.addyLine || 0) + 1);
    else this.questLine = Math.min(QUEST_COUNT, (this.questLine || 0) + 1);
    this.addXP(rw.xp);   // the exact XP the quest advertised (gear XP bonuses can only add)
    this.save();
    return rw;
  },

  // ---- Addy's daily ("The Queen's Errand") — one per real-world day. ----
  dailyKey() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  },
  // Normalized daily state for TODAY (a stale entry resets at midnight).
  dailyState() {
    const key = this.dailyKey();
    if (!this.daily || this.daily.date !== key) this.daily = { date: key, base: null, done: false };
    return this.daily;
  },
  acceptDaily() {
    if (this.level < 70) return false;
    const st = this.dailyState();
    if (st.done || st.base !== null) return false;
    st.base = dailyDeed(st.date).counter();
    this.save();
    return dailyDeed(st.date);
  },
  // Pays the daily prize: a random MARQUISE gem + the odds-item (90% legendary,
  // 6% 1–3★, 3% 4–5★, 1% artifact — Items.addyDailyItem). Item goes to the bag.
  completeDaily() {
    const st = this.dailyState();
    if (st.done || st.base === null) return null;
    const dd = dailyDeed(st.date);
    if (dd.counter() - st.base < dd.need) return null;
    st.done = true;
    const gem = { type: pick(Object.keys(GEM_TYPES)), tier: GEM_MAX_TIER };
    this.gems.push(gem);
    const item = Items.addyDailyItem();
    Items.stash(item);
    this.save();
    return { gem, item };
  },

  // ------------------------------------------------------------ progression

  addXP(n) {
    // Ruby-in-helm XP bonus (and any future XP find) scales the gain.
    const xpBonus = (Game.player && Game.player.xpBonus) || 0;
    const gain = Math.round(n * (1 + xpBonus));
    let leveled = false;
    if (this.level < MAX_LEVEL) {
      this.xp += gain;
      while (this.level < MAX_LEVEL && this.xp >= XP_CURVE(this.level)) {
        this.xp -= XP_CURVE(this.level);
        this.level++;
        leveled = true;
      }
      // At the cap, any leftover XP rolls straight into paragon.
      if (this.level >= MAX_LEVEL && this.xp > 0) { this.paragonXp += this.xp; this.xp = 0; }
    } else {
      this.paragonXp += gain;   // past 70: all XP feeds paragon
    }
    // Bank paragon levels — each grants one Nekromancer Point.
    let gainedPara = 0;
    while (this.paragonXp >= PARAGON_XP(this.paragon)) {
      this.paragonXp -= PARAGON_XP(this.paragon);
      this.paragon++; this.np++; gainedPara++;
    }
    if (leveled && Game.player) {
      Items.apply();
      const p = Game.player;
      p.hp = p.maxHp;
      p.essence = p.maxEssence;
      fxLevel(p.x, p.y);
      Particles.text(p.x, p.y - 46, 'LEVEL ' + this.level, { color: '#ffd76a', size: 22, life: 1.4 });
      AudioSys.sfx('level');
      const unlocked = SKILL_DATA.filter(s => s.lvl === this.level);
      for (const s of unlocked) UI.toast('Skill unlocked: ' + s.name, '#6ff7c3');
      const pUnlocked = PASSIVE_DATA.filter(s => s.lvl === this.level);
      for (const s of pUnlocked) UI.toast('Passive unlocked: ' + s.name, '#b06adf');
      if (PASSIVE_SLOT_LEVELS.includes(this.level)) UI.toast('Passive slot unlocked!', '#b06adf');
    }
    if (gainedPara && Game.player) {
      const p = Game.player;
      Particles.text(p.x, p.y - 46, 'PARAGON ' + this.paragon, { color: '#ff8c2a', size: 20, life: 1.4 });
      AudioSys.sfx('level');
      UI.toast('Paragon ' + this.paragon + ' — +' + gainedPara + ' Nekromancer Point' + (gainedPara > 1 ? 's' : ''), '#ff8c2a');
    }
    if (leveled || gainedPara) this.save();
  },

  // The fraction a paragon stat currently grants (points × per-point value).
  paragonBonus(key) {
    const st = PARAGON_STATS[key];
    return st ? (this.para[key] || 0) * st.per : 0;
  },

  // Total paragon points allocated across every stat.
  paragonSpent() {
    let n = 0;
    for (const k in this.para) n += this.para[k] || 0;
    return n;
  },

  // Is every stat in `cat` already at its cap? (Core/Defense hold uncapped stats,
  // so they're never full; Offense/Utility could theoretically fill at very high
  // paragon — then the rotation skips past them.)
  categoryFull(cat) {
    for (const k in PARAGON_STATS) {
      const st = PARAGON_STATS[k];
      if (st.cat !== cat) continue;
      if (!st.max || (this.para[k] || 0) < st.max) return false;
    }
    return true;
  },

  // Keep paraOrder (the spend history, for single-point undo) in step with the
  // per-stat totals — rebuilding it canonically for old saves that predate the
  // rotation rule (free-spend distributions get grandfathered into rotation order).
  syncParaOrder() {
    if (!Array.isArray(this.paraOrder)) this.paraOrder = [];
    const total = this.paragonSpent();
    if (this.paraOrder.length === total) return;
    const remaining = Object.assign({}, this.para);
    const order = [];
    for (let i = 0; i < total; i++) {
      const cat = PARAGON_ROTATION[i % PARAGON_ROTATION.length];
      let k = Object.keys(PARAGON_STATS).find(kk => PARAGON_STATS[kk].cat === cat && (remaining[kk] || 0) > 0);
      if (!k) k = Object.keys(remaining).find(kk => (remaining[kk] || 0) > 0);  // old free-spend leftover
      if (!k) break;
      remaining[k]--; order.push(k);
    }
    this.paraOrder = order;
  },

  // The category the NEXT point must go into — the rotation slot for the current
  // spend count, skipping any category that's completely capped.
  paragonCat() {
    this.syncParaOrder();
    const base = this.paraOrder.length % PARAGON_ROTATION.length;
    for (let n = 0; n < PARAGON_ROTATION.length; n++) {
      const cat = PARAGON_ROTATION[(base + n) % PARAGON_ROTATION.length];
      if (!this.categoryFull(cat)) return cat;
    }
    return PARAGON_ROTATION[base];
  },

  // Spend ONE Nekromancer Point on `key` — only allowed if that stat sits in the
  // currently-unlocked rotation category (owner rule: one point at a time, cycling
  // Core → Defense → Offense → Utility). Intelligence & Vitality are uncapped.
  spendParagon(key) {
    const st = PARAGON_STATS[key];
    if (!st) return;
    if ((this.np || 0) <= 0) { AudioSys.sfx('denied'); return; }
    const cat = this.paragonCat();
    if (st.cat !== cat) {
      if (typeof UI !== 'undefined') UI.toast('Spend your point in ' + cat + ' first', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    const cur = this.para[key] || 0;
    if (st.max && cur >= st.max) { AudioSys.sfx('denied'); return; }
    // Reconcile any legacy free-spend history BEFORE recording this point — the
    // old order (sync AFTER incrementing) desynced the history every spend, so a
    // later rebuild canonicalized it and "Undo last" could refund the WRONG stat.
    this.syncParaOrder();
    this.para[key] = cur + 1;
    this.paraOrder.push(key);
    this.np--;
    if (typeof UI !== 'undefined' && UI.sel) UI.sel.paraCat = this.paragonCat();   // advance the view
    if (typeof Items !== 'undefined') Items.apply();
    AudioSys.sfx('gem');
    this.save();
  },

  // Undo the most recently spent point (returns it to the NP pool).
  refundLastParagon() {
    this.syncParaOrder();
    const key = this.paraOrder.pop();
    if (!key) { AudioSys.sfx('denied'); return; }
    this.para[key] = Math.max(0, (this.para[key] || 0) - 1);
    if (this.para[key] === 0) delete this.para[key];
    this.np++;
    if (typeof UI !== 'undefined' && UI.sel) UI.sel.paraCat = this.paragonCat();
    if (typeof Items !== 'undefined') Items.apply();
    AudioSys.sfx('gem');
    this.save();
  },

  // Refund EVERY spent point back to the NP pool (a clean respec).
  resetParagon() {
    const spent = this.paragonSpent();
    if (spent <= 0) { AudioSys.sfx('denied'); return; }
    this.np += spent;
    this.para = {};
    this.paraOrder = [];
    if (typeof UI !== 'undefined' && UI.sel) UI.sel.paraCat = this.paragonCat();
    if (typeof Items !== 'undefined') Items.apply();
    AudioSys.sfx('gem');
    this.save();
  },

  // Cheat / testing helper: jump N levels instantly.
  grantLevels(n) {
    let gained = 0;
    while (n-- > 0 && this.level < MAX_LEVEL) {
      this.xp = 0;
      this.level++;
      gained++;
    }
    if (gained) {
      Items.apply();
      if (Game.player) {
        Game.player.hp = Game.player.maxHp;
        fxLevel(Game.player.x, Game.player.y);
      }
      UI.toast('+' + gained + ' level' + (gained > 1 ? 's' : '') + ' → ' + this.level, '#ffd76a');
      AudioSys.sfx('level');
      this.save();
    }
  },

  // Which Grace of Inarius pieces does the hero own (equipped or bagged)?
  setPiecesOwned() {
    const owned = new Set();
    const check = it => { if (it && it.set === 'inarius') owned.add(it.slot); };
    for (const slot of Object.keys(ITEM_SLOTS)) check(this.equipped[slot]);
    for (const it of this.bag) check(it);
    return owned;
  },

  rune(skillId) {
    const id = this.runes[skillId] || 'base';
    // A rune you haven't reached the unlock level for falls back to base.
    if (typeof SKILL_RUNES !== 'undefined' && SKILL_RUNES[skillId]) {
      const r = SKILL_RUNES[skillId].find(x => x.id === id);
      if (r && r.lvl && this.level < r.lvl) return 'base';
    }
    return id;
  },

  passiveSlots() {
    return PASSIVE_SLOT_LEVELS.filter(l => this.level >= l).length;
  },

  hasPassive(id) {
    return this.passives.includes(id);
  },

  unlockedSkills() {
    return SKILL_DATA.filter(s => s.lvl <= this.level);
  },

  // Normalize the 6-slot action bar. Default is CATEGORY-LOCKED: slot i holds a
  // skill of LOADOUT_CATS[i], and old/elective loadouts collapse into their
  // category's slot (first valid wins). With ELECTIVE MODE on (a gameplay
  // setting), any skill may sit in any slot — duplicates within a category are
  // kept — and only locked/over-level skills are cleared.
  sanitize() {
    const elective = typeof Settings !== 'undefined' && Settings.g && Settings.g.electiveMode;
    const ok = id => id && SKILL_DATA.some(s => s.id === id && s.lvl <= this.level);
    if (elective) {
      while (this.loadout.length < 6) this.loadout.push(null);
      if (this.loadout.length > 6) this.loadout.length = 6;
      for (let i = 0; i < 6; i++) if (!ok(this.loadout[i])) this.loadout[i] = null;
      if (!this.loadout[0]) this.loadout[0] = 'boneSpikes';
    } else {
      const cats = (typeof LOADOUT_CATS !== 'undefined') ? LOADOUT_CATS
        : ['primary', 'secondary', 'corpse', 'reanim', 'curse', 'blood'];
      const next = [null, null, null, null, null, null];
      for (const id of (this.loadout || [])) {
        if (!ok(id)) continue;
        const ci = cats.indexOf(SKILL_DATA.find(x => x.id === id).cat);
        if (ci >= 0 && !next[ci]) next[ci] = id;   // first valid skill per category
      }
      if (!next[0]) next[0] = 'boneSpikes';         // always have a primary
      this.loadout = next;
    }
    this.mergeStashTorches();   // torches live in the bag now, never the stash
    // Pad passives to the number of slots (a new lvl-3 slot was added).
    while (this.passives.length < PASSIVE_SLOT_LEVELS.length) this.passives.push(null);
    if (this.passives.length > PASSIVE_SLOT_LEVELS.length) this.passives.length = PASSIVE_SLOT_LEVELS.length;
  }
};

// The character roster: up to 3 heroes at once, chosen from the campfire
// select scene. The shared Stash is common to all of them.
const Profiles = {
  MAX: 3,
  slots: [null, null, null],
  active: 0,

  load() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.slots = (d.slots || []).slice(0, this.MAX);
        while (this.slots.length < this.MAX) this.slots.push(null);
        this.active = clamp(d.active || 0, 0, this.MAX - 1);
      }
    } catch (e) { /* ignore */ }
    // One-time migration: fold a legacy single hero into slot 0.
    if (!this.slots.some(Boolean)) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) { this.slots[0] = JSON.parse(raw); this.active = 0; this.persist(); }
      } catch (e) { /* ignore */ }
    }
  },

  persist() {
    lsSet(PROFILES_KEY, JSON.stringify({ slots: this.slots, active: this.active }));
  },

  count() { return this.slots.filter(Boolean).length; },
  full() { return this.count() >= this.MAX; },
  firstEmpty() { return this.slots.findIndex(s => !s); },
  firstFilled() { const i = this.slots.findIndex(Boolean); return i < 0 ? 0 : i; },

  // Persist the currently-active Hero into its slot (called on every save).
  saveActive() {
    if (this.active >= 0 && this.active < this.MAX && this.slots[this.active] !== undefined) {
      this.slots[this.active] = Hero.snapshot();
      this.persist();
    }
  },

  // Load an existing profile into the active Hero.
  select(i) {
    if (!this.slots[i]) return false;
    this.active = i;
    Hero.applySnapshot(this.slots[i]);
    this.persist();
    return true;
  },

  // Start a brand-new hero in slot i (the creation screen then customizes it).
  create(i) {
    if (i < 0 || i >= this.MAX || this.slots[i]) return false;
    this.active = i;
    Hero.name = ''; Hero.eyeColor = '';
    Hero.fresh();
    this.slots[i] = Hero.snapshot();
    this.persist();
    return true;
  },

  remove(i) {
    if (i < 0 || i >= this.MAX) return;
    this.slots[i] = null;
    if (this.active === i) this.active = this.firstFilled();
    this.persist();
  },

  // Load the roster at boot and make the active (or first) hero current.
  boot() {
    this.load();
    const act = this.slots[this.active] ? this.active : this.firstFilled();
    if (this.slots[act]) { this.active = act; Hero.applySnapshot(this.slots[act]); return true; }
    Hero.fresh();
    return false;
  }
};
