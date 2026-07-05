'use strict';
// ---------------------------------------------------------------------------
// Adventure flow: title → camp → waypoint map → land (dungeon crawl:
// fight through packs, loot chests, touch shrines, slay the bounty boss,
// take the portal home) → camp. The Hero persists across everything.
// ---------------------------------------------------------------------------

const Game = {
  canvas: null,
  ctx: null,
  W: 0, H: 0, dpr: 1,
  state: 'menu',            // 'menu' | 'camp' | 'map' | 'playing'
  time: 0,
  camera: { x: 0, y: 0 },
  player: null,
  zone: null,
  zoneIdx: 0,
  enemies: [],
  minions: [],
  projectiles: [],
  corpses: [],
  pickups: [],
  telegraphs: [],
  kills: 0,
  bossDead: false,
  portalCast: null,       // {t, x, y} — 7s channel to open a town portal
  portalCd: 0,            // cooldown (s) after a portal closes before a new one can be cast
  townPortalNear: false,  // debounce so standing on the portal doesn't loop the menu
  mapStack: [],           // parked map snapshots you can walk BACK into (true backtracking)
  linkDebounce: false,    // step-off-then-on gate for entrance/exit/cave portals
  // Multi-area journeys: a bounty/adventure run spans several linked maps.
  stage: 1,
  stageCount: 1,
  journeyIdx: null,   // bounty land index, or null for adventure/rift
  finalStage: true,
  descend: false,
  story: false,       // Story Mode: an 11-stage Act ending at the Skeleton King
  playerDeadT: 0,
  rewardLines: null,
  banner: { text: '', sub: '', t: 0, maxT: 1 },
  vignette: null,
  lastT: 0,
  saveTick: 0,
  riftMode: false,
  riftProgress: 0,
  riftGoal: 250,
  guardianUp: false,
  riftSpawnT: 0,
  fps: 60,
  dpsHits: [],        // rolling {t, d} log feeding the optional DPS meter

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Settings.load();
    this.applyCursor();
    Skills.init();
    Hero.loadStash();   // shared vault first, so the character load won't reseed it
    Profiles.boot();    // load the roster and make the active hero current
    Hero.sanitize();
    World.generate(ZONES[0]);   // backdrop for the title screen
    Input.init(this.canvas);
    requestAnimationFrame(t => this.frame(t));
  },

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    // iPhone notch / home-indicator insets.
    try {
      const cs = getComputedStyle(document.documentElement);
      const px = v => parseFloat(cs.getPropertyValue(v)) || 0;
      this.safe = { top: px('--sa-top'), right: px('--sa-right'), bottom: px('--sa-bottom'), left: px('--sa-left') };
    } catch (e) {
      this.safe = { top: 0, right: 0, bottom: 0, left: 0 };
    }
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    UI.layout(this.W, this.H);
    this.makeVignette();
  },

  makeVignette() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(
      this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.36,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.72);
    g.addColorStop(0, 'rgba(4,2,8,0)');
    g.addColorStop(1, 'rgba(4,2,8,0.62)');
    x.fillStyle = g;
    x.fillRect(0, 0, this.W, this.H);
    this.vignette = c;
  },

  // A skeletal bone-hand mouse pointer, boldly outlined so it stays legible over
  // the dark battlefield. Sized 1× / 2× / 3× from Settings (a data-URI CSS
  // cursor with its hotspot at the index fingertip).
  buildCursor(scale) {
    const s = clamp(scale || 1, 1, 3);
    const unit = 22 * s;                 // rendered px (22 / 44 / 66 — well under the 128 cap)
    const stroke = '#0b0810', bone = '#efe6d2', shade = '#cdbf9f';
    // Design space is 22×22; hotspot sits at the fingertip (top-left).
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='${unit}' height='${unit}' viewBox='0 0 22 22'>` +
      `<g fill='${bone}' stroke='${stroke}' stroke-width='1.6' stroke-linejoin='round' stroke-linecap='round'>` +
      // palm / fist cluster
      `<path d='M4.2 10.5 Q3.2 18.5 9 20 Q16 21.4 17 14.5 Q17.4 11 13.8 10.6 L6.5 10.2 Q4.4 10 4.2 10.5 Z'/>` +
      // extended index finger (two bone segments + knuckle joints)
      `<rect x='4.6' y='1.4' width='4.2' height='10.6' rx='2.1'/>` +
      `<circle cx='6.7' cy='4.6' r='1.55'/>` +
      `<circle cx='6.7' cy='8.4' r='1.55'/>` +
      // folded-finger knuckle bumps along the top of the fist
      `<circle cx='10.7' cy='11' r='2.1'/>` +
      `<circle cx='13.4' cy='11.3' r='1.95'/>` +
      `<circle cx='15.6' cy='12.4' r='1.7'/>` +
      // thumb
      `<path d='M4.3 12 Q1.4 12.4 1.6 15 Q1.9 17 4 16.4'/>` +
      `</g>` +
      // faint knuckle shading for a touch of bone depth
      `<g fill='none' stroke='${shade}' stroke-width='0.7' stroke-linecap='round' opacity='0.5'>` +
      `<path d='M9 13.5 Q11 15.5 13.5 14.5'/>` +
      `</g></svg>`;
    const uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    const hot = Math.round(6 * s);       // fingertip hotspot (~x6,y1 in design space)
    return `url("${uri}") ${hot} ${Math.round(1.5 * s)}, auto`;
  },

  applyCursor() {
    if (!this.canvas) return;
    const scale = (typeof Settings !== 'undefined' && Settings.g && Settings.g.cursorScale) || 1;
    try { this.canvas.style.cursor = this.buildCursor(scale); }
    catch (e) { this.canvas.style.cursor = 'auto'; }
  },

  monsterLevel() {
    return (this.zone ? this.zone.mLvl : 1) + Hero.difficulty * 6;
  },

  showBanner(text, sub = '', dur = 2.6) {
    this.banner = { text, sub, t: dur, maxT: dur };
  },

  toCamp() {
    this.state = 'camp';
    this.playerDeadT = 0;
    UI.close();
    Hero.save();
  },

  // ------------------------------------------------------------ zone flow

  // A bounty hunts a land's unique boss THREE times (owner rule). Each of the 3
  // parts is a short journey of 1–2 linked maps ending on that land's boss; when
  // a boss falls the portal carries you to the next part, and clearing the third
  // part awards the Horadric Stash.
  startZone(idx) {
    this.story = false;
    this.bountyZoneIdx = idx;
    this.startBountyPart(1);
  },

  startBountyPart(part) {
    // Carry HP/essence from part to part — the hunt isn't a free heal.
    const hpFrac = (part > 1 && this.player) ? this.player.hp / this.player.maxHp : 1;
    const ess = (part > 1 && this.player) ? this.player.essence : 60;
    this.bountyPart = part;
    this.nextBountyPart = false;
    this.stage = 1;
    this.stageCount = randInt(1, 2);
    this.journeyIdx = this.bountyZoneIdx;
    this.startLand(ZONES[this.bountyZoneIdx], this.bountyZoneIdx);
    if (part > 1 && this.player) {
      this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpFrac));
      this.player.essence = Math.min(ess, this.player.maxEssence);
    }
  },

  startAdventure() {
    this.story = false;
    this.bountyPart = 0;
    this.stage = 1;
    this.stageCount = randInt(2, 3);
    this.journeyIdx = null;
    this.startLand(makeAdventureZone(), null);
  },

  // Story Mode: an Act is a chain of 10 biome maps — each guarded by a named
  // legendary ghost lord — then the Skeleton King's grave (stage 11). Only
  // Act I is ready for testing.
  startStory(act = 1) {
    this.story = true;
    this.storyAct = act;
    this.bountyPart = 0;
    this.stage = 1;
    this.stageCount = randInt(2, 5);   // each Act is a short chain of 2–5 maps
    this.journeyIdx = null;
    this.cubeFoundThisAct = false;   // Act III: has the Horadric's Cube dropped this run?
    this.startLand(makeStoryZone(1, act, this.stageCount <= 1), null);
  },

  // kind: 'normal' (1-69, free · 250 pts) | 'greater' (Nephalem, lvl 70, costs a
  // Nephalem Rift Key · 750 pts) | 'season' (lvl 70, costs a Master key · 1500 pts)
  startRift(kind = 'greater') {
    if (kind === 'greater' || kind === 'season') {
      if (Hero.level < MAX_LEVEL) {
        UI.toast('Nephalem Rifts open at level 70', '#9a9080');
        AudioSys.sfx('denied');
        return;
      }
    }
    if (kind === 'greater') {
      if (Hero.riftKeys < 1) {
        UI.toast('You need a Nephalem Rift Key — normal Rift Guardians drop them', '#9a9080');
        AudioSys.sfx('denied');
        return;
      }
      Hero.riftKeys--; Hero.save();
    } else if (kind === 'season') {
      if (Hero.masterKeys < 1) {
        UI.toast('You need a Master Nephalem Rift Key — Nephalem Guardians drop them', '#9a9080');
        AudioSys.sfx('denied');
        return;
      }
      Hero.masterKeys--; Hero.save();
    }
    // Rifts are one endless map — no multi-area descent.
    this.story = false;
    this.bountyPart = 0;
    this.stage = 1; this.stageCount = 1; this.journeyIdx = null;
    this.startLand(makeRiftZone(kind), null);
  },

  // Descend into the next area of the current journey (new procedural map).
  nextStage() {
    this.stage++;
    this.descend = false;
    // Carry HP/essence into the next area — descending isn't a free heal.
    const hpFrac = this.player ? this.player.hp / this.player.maxHp : 1;
    const ess = this.player ? this.player.essence : 60;
    const zone = this.story ? makeStoryZone(this.stage, this.storyAct || 1, this.stage >= this.stageCount)
      : this.journeyIdx !== null ? ZONES[this.journeyIdx]
      : makeAdventureZone();
    this.startLand(zone, this.journeyIdx);
    if (this.player) {
      this.player.hp = Math.max(1, Math.round(this.player.maxHp * hpFrac));
      this.player.essence = Math.min(ess, this.player.maxEssence);
    }
  },

  startLand(zone, idx) {
    this.zoneIdx = idx === null ? -1 : idx;
    this.zone = zone;
    this.riftMode = !!zone.rift;
    this.finalStage = this.stage >= this.stageCount;
    this.descend = false;
    this.nextBountyPart = false;
    this.portalCast = null;
    this.portalCd = 0;
    this.townPortalNear = false;
    this.mapStack = [];        // a new area starts a fresh backtrack chain
    this.linkDebounce = false;
    this.linkedMap = false;    // base journey map (not reached via an exit/cave)
    this.riftProgress = 0;
    this.riftGoal = zone.riftGoal || 250;
    this.guardianUp = false;
    this.riftSpawnT = 0;
    World.generate(this.zone);
    this.enemies = [];
    this.minions = [];
    this.projectiles = [];
    this.corpses = [];
    this.pickups = [];
    this.telegraphs = [];
    Particles.reset();
    Skills.reset();
    this.kills = 0;
    this.bossDead = false;
    this.playerDeadT = 0;
    UI.close();

    this.player = new Player(World.spawn.x, World.spawn.y);
    Items.apply();
    this.player.hp = this.player.maxHp;
    this.camera.x = this.player.x - this.W / 2;
    this.camera.y = this.player.y - this.H / 2;

    // Difficulty pours on more monsters: bigger packs and extra packs. A dev
    // "spawn boost" (Hero.cheats.spawn = +0%…+1000%) scales pack SIZE so the
    // total roughly multiplies by 1+boost (linear, not compounding).
    const boost = 1 + (Hero.cheats.spawn || 0);
    const em = DIFFICULTIES[Hero.difficulty].enemyMult || 1;
    const packSize = () => clamp(Math.round(randInt(3, 5) * em * boost), 3, Math.round(14 * boost));
    const spawnPack = (x, y, eliteChance) => {
      const eliteLeader = Math.random() < eliteChance;
      const rareLeader = eliteLeader && Math.random() < 0.3;   // ~30% of elites are rare (purple)
      const n = packSize();
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), d = rand(0, 70);
        const e = new Enemy(pick(this.zone.monsters), x + Math.cos(a) * d, y + Math.sin(a) * d, {
          elite: eliteLeader && i === 0,
          rare: rareLeader && i === 0,
          name: eliteLeader && i === 0 ? (rareLeader ? 'Rare ' : '') + pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) : undefined
        });
        World.collide(e);
        this.enemies.push(e);
      }
    };
    // Populate packs (asleep until approached). Rifts crawl with rare elites.
    for (const pk of World.packs) spawnPack(pk.x, pk.y, this.riftMode ? 0.5 : 0.16);
    // Extra packs scattered across the map as difficulty climbs.
    const extra = Math.min(30, Math.round(World.packs.length * Math.min(em - 1, 3)));
    for (let k = 0; k < extra; k++) {
      let ex, ey, tries = 0;
      do { ex = rand(120, World.W - 120); ey = rand(120, World.H - 120); } while (!World.isFloorAt(ex, ey) && tries++ < 12);
      spawnPack(ex, ey, this.riftMode ? 0.5 : 0.25);
    }
    // A Treasure Goblin sometimes wanders the wilds (never the King's grave).
    if (!(this.zone && this.zone.storyFinal) && Math.random() < 0.16) {
      let gx, gy, gt = 0;
      do { gx = rand(220, World.W - 220); gy = rand(220, World.H - 220); } while (!World.isFloorAt(gx, gy) && gt++ < 20);
      const gob = new Enemy('goblin', gx, gy, { name: 'Treasure Goblin' });
      this.enemies.push(gob);
    }
    // Phase-2 roaming bosses & the super-rare cave dweller (owner spec). A
    // Bonewyrm or Gluttonous Brain sometimes stalks eligible modes (everything
    // outside Story Mode: Bounties, Adventure, Rifts, Nephalem, Seasons); a 3%
    // cave hides Rathma's Chosen on any map. All spawn away from the entrance.
    const placeAway = (minSp, minBs) => {
      let x, y, t = 0;
      do { x = rand(200, World.W - 200); y = rand(200, World.H - 200); t++; }
      while ((dist(x, y, World.spawn.x, World.spawn.y) < minSp || dist(x, y, World.bossPos.x, World.bossPos.y) < minBs || !World.isFloorAt(x, y)) && t < 30);
      return { x, y };
    };
    const eligibleRoam = !this.story && !(this.zone && this.zone.storyFinal);
    if (eligibleRoam && Math.random() < 0.18) {
      const rb = Math.random() < 0.5 ? 'wyrm' : 'glutton';
      const pos = placeAway(700, 320);
      this.enemies.push(new Enemy(rb, pos.x, pos.y, { name: MONSTERS[rb].name }));
    }
    // (Rathma's Chosen now lives inside the rare CAVE — a real linked map — not
    // loose on the surface; see World.cave + Game.enterCave.)
    // Act III: the Horadric's Cube has a 10% chance to be half-buried on any
    // (non-final) map. If the player reaches the Sand Wyrm without finding it,
    // the Wyrm drops it for certain (see onBossDead). Only spawns if unowned.
    if (this.story && this.storyAct === 3 && !this.finalStage && !Hero.hasCube && Math.random() < 0.10) {
      let cx, cy, ct = 0;
      do { cx = rand(240, World.W - 240); cy = rand(240, World.H - 240); } while (!World.isFloorAt(cx, cy) && ct++ < 20);
      const cube = new Pickup(cx, cy, 'cube');
      cube.vx = 0; cube.vy = 0;
      this.pickups.push(cube);
      this.cubeFoundThisAct = true;
    }
    // The stage guardian: the land's named unique on the FINAL area, a champion
    // that guards the descent on earlier areas. (Rifts summon a Guardian instead,
    // only once the orb bar is full.)
    if (!this.riftMode) {
      // Story Mode: every stage holds its own NAMED boss (a ghost lord, or the
      // King on the last). Bounties/Adventure keep the champion-then-unique flow.
      let name, bt = 'brute';
      if (this.story) {
        name = this.zone.boss;
        bt = this.zone.bossType || 'wraith';
      } else {
        name = this.finalStage ? this.zone.boss
          : pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) + ' the ' + pick(['Warden', 'Gatekeeper', 'Deepwalker', 'Threshold']);
      }
      const boss = new Enemy(bt, World.bossPos.x, World.bossPos.y, { unique: true, name });
      this.enemies.push(boss);
    }

    this.state = 'playing';
    let sub;
    const bountyTag = this.bountyPart ? 'Bounty ' + this.bountyPart + ' of 3 — ' : '';
    if (this.riftMode) sub = 'Slay rare elites for their orbs — fill the rift';
    else if (this.story && this.finalStage) sub = this.zone.kingFlavor || 'Slay the Skeleton King';
    else if (this.story) sub = 'Chapter ' + this.stage + '/' + this.stageCount + ' — destroy ' + this.zone.boss;
    else if (this.finalStage) sub = bountyTag + 'slay ' + this.zone.boss;
    else sub = bountyTag + 'Area ' + this.stage + ' of ' + this.stageCount + ' — slay the champion to descend';
    const title = this.story && this.finalStage ? (this.zone.boss || 'THE FINAL BOSS').toUpperCase()
      : this.zone.name + (this.riftMode || this.stageCount < 2 ? ''
        : this.story ? '  ·  ' + this.stage + '/' + this.stageCount
        : '  ·  Area ' + this.stage + '/' + this.stageCount);
    this.showBanner(title, sub, this.story && this.finalStage ? 4 : 3);
    AudioSys.sfx('wave');
    Hero.save();
  },

  // ------------------------------------------------------------- rifts

  // Purple orbs feed the rift bar; at the goal the Rift Guardian rises.
  addRiftPoints(n) {
    if (!this.riftMode || this.guardianUp || this.riftProgress >= this.riftGoal) return;
    this.riftProgress = Math.min(this.riftGoal, this.riftProgress + n);
    if (this.riftProgress >= this.riftGoal) {
      this.guardianUp = true;
      const pt = this.spawnNear(this.player, 420);
      const g = new Enemy('brute', pt.x, pt.y, { unique: true, name: this.zone.boss });
      g.guardian = true;
      g.r += 8;                       // the Guardian looms larger than a bounty boss
      g.maxHp = Math.round(g.maxHp * 1.35);
      g.hp = g.maxHp;
      g.wake();
      this.enemies.push(g);
      World.bossPos = pt;
      this.showBanner('THE RIFT GUARDIAN RISES', this.zone.boss, 3.2);
      AudioSys.sfx('die');
      Particles.shake(8);
    }
  },

  spawnNear(p, d) {
    for (let i = 0; i < 20; i++) {
      const a = rand(TAU);
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (World.isFloorAt(x, y)) return { x, y };
    }
    return { x: World.spawn.x, y: World.spawn.y };
  },

  updateRiftSpawns(dt) {
    if (!this.riftMode || this.guardianUp || this.riftProgress >= this.riftGoal) return;
    // Endlessly repopulate with rare-elite packs; harder tiers keep far more
    // on the field and spawn them faster (T16 becomes a swarm).
    const em = DIFFICULTIES[Hero.difficulty].enemyMult || 1;
    const cap = clamp(Math.round(24 * Math.pow(em, 0.42)), 30, 260);
    if (this.enemies.length < cap) {
      this.riftSpawnT -= dt;
      if (this.riftSpawnT <= 0) {
        this.riftSpawnT = clamp(2.4 / Math.sqrt(em), 0.5, 2.4);
        const waves = clamp(Math.round(em * 0.5), 1, 6);
        for (let w = 0; w < waves && this.enemies.length < cap; w++) {
          const pt = this.spawnNear(this.player, Math.max(this.W, this.H) * 0.6);
          // A RARE named purple elite — the Nephalem Mongrel — occasionally
          // prowls the rift. Only ever one at a time, and it has a CHANCE to
          // drop the Nephalem Heartstring (reagent for the Nephalem Torch).
          if (!this.enemies.some(e => e.type === 'mongrel') && Math.random() < 0.04) {
            const mg = new Enemy('mongrel', pt.x, pt.y, { elite: true, name: pick(MONGREL_NAMES) });
            World.collide(mg);
            this.enemies.push(mg);
            UI.toast('A Nephalem Mongrel prowls the rift…', MATERIALS.heartstring.color);
            continue;
          }
          const elite = Math.random() < 0.55;
          for (let i = 0; i < randInt(3, 4); i++) {
            const e = new Enemy(pick(this.zone.monsters), pt.x + rand(-60, 60), pt.y + rand(-60, 60), {
              elite: elite && i === 0,
              name: elite && i === 0 ? pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) : undefined
            });
            World.collide(e);
            this.enemies.push(e);
          }
        }
      }
    }
  },

  onBossDead(boss) {
    this.bossDead = true;
    World.portal = { x: boss.x, y: boss.y };
    World.linksClosed = true;   // the map's boss falls → its entrance/exit/cave seal
    if (this.riftMode) {
      const kind = this.zone.riftKind || 'normal';
      const mLvl = this.monsterLevel();
      const diff = DIFFICULTIES[Hero.difficulty];
      Hero.riftsCleared++;
      // Track how many keys THIS guardian dropped, for the reward summary.
      this.riftKeysDropped = 0;
      this.riftKeyLabel = (kind === 'greater' || kind === 'season') ? 'Master Nephalem Rift Key' : 'Nephalem Rift Key';
      // Guaranteed loot.
      const pu = new Pickup(boss.x, boss.y, 'item');
      pu.item = Items.generate(mLvl, 0.3);
      this.pickups.push(pu);
      // Key drops per tier: Normal Rift Guardians drop 0–3 Nephalem Rift Keys;
      // Nephalem (greater) Guardians drop 0–1 Master Nephalem Rift Keys.
      if (kind === 'normal') {
        const n = randInt(0, 3);
        this.riftKeysDropped = n;
        if (n) { Hero.riftKeys += n; UI.toast('◈ ' + n + ' Nephalem Rift Key' + (n > 1 ? 's' : '') + '! (' + Hero.riftKeys + ' held)', '#b06adf'); }
      } else if (kind === 'greater') {
        const n = randInt(0, 1);
        this.riftKeysDropped = n;
        if (n) { Hero.masterKeys += n; UI.toast('◈ Master Nephalem Rift Key! (' + Hero.masterKeys + ' held)', '#d8b4f0'); }
      }
      // Legendary chance scales with Torment: 5% at T1 → 30% at T16.
      const torment = diff.torment || 0;
      const legChance = torment ? 0.05 + (0.30 - 0.05) * (torment - 1) / 15 : 0.05;
      if (Math.random() < legChance) {
        const lp = new Pickup(boss.x, boss.y, 'item');
        lp.item = Items.generatePowerItem(mLvl);
        this.pickups.push(lp);
        UI.toast('★ Legendary drop!', '#ff8c2a');
      }
      // Seasons GUARANTEE an awesome piece: a random Grace of Inarius set piece
      // (or a legendary power once the set is complete). Also refunds a Master key
      // sometimes so the season loop doesn't run dry.
      if (kind === 'season') {
        const owned = Hero.setPiecesOwned();
        const sp = new Pickup(boss.x, boss.y, 'item');
        sp.item = owned.size < 6 ? Items.generateSetPiece(mLvl) : Items.generatePowerItem(mLvl, null, true);
        this.pickups.push(sp);
        UI.toast('✦ ' + sp.item.name + '!', '#4ade80');
        if (randInt(0, 1)) { Hero.masterKeys++; this.riftKeysDropped = (this.riftKeysDropped || 0) + 1; UI.toast('◈ Master Nephalem Rift Key! (' + Hero.masterKeys + ' held)', '#d8b4f0'); }
      } else if (kind === 'greater') {
        // Set items ONLY drop in Seasons (owner rule) — Nephalem Guardians
        // instead cough up a tiered build-defining legendary.
        if (Math.random() < 0.35) {
          const sp = new Pickup(boss.x, boss.y, 'item');
          sp.item = Items.generatePowerItem(mLvl, null, true);
          this.pickups.push(sp);
        }
      }
      Hero.save();
      AudioSys.sfx('setdrop');
      this.showBanner('RIFT CLEARED', 'The Guardian falls', 3.4);
    } else if (!this.finalStage) {
      // More land below — the portal descends to the next area.
      this.descend = true;
      const msg = this.story
        ? 'The ghost of ' + boss.name + ' is banished — a portal opens onward'
        : 'A dark portal yawns open — descend deeper';
      this.showBanner(this.story ? 'CHAPTER ' + this.stage + ' CLEARED' : 'AREA CLEARED', msg, 3.2);
    } else {
      this.descend = false;
      if (this.story) {
        // The Skeleton King falls — a good chance at The Royal Grandeur.
        this.showBanner('THE SKELETON KING FALLS', 'His grave is yours — step through the portal', 3.6);
        if (Math.random() < 0.4) {
          const rg = new Pickup(boss.x, boss.y, 'item');
          rg.item = Items.generatePowerItem(this.monsterLevel(), 'royalGrandeur');
          this.pickups.push(rg);
          UI.toast('★ The Royal Grandeur!', '#ff8c2a');
        }
      } else if (this.bountyPart && this.bountyPart < 3) {
        // Bounty parts 1 & 2: the portal carries you to the next hunt.
        this.nextBountyPart = true;
        this.showBanner('BOUNTY ' + this.bountyPart + ' OF 3 CLEARED',
          this.zone.boss + ' falls — a portal opens to the next hunt', 3.4);
      } else {
        this.showBanner(this.bountyPart ? 'FINAL BOUNTY CLEARED' : 'BOUNTY COMPLETE',
          this.bountyPart ? 'The hunt is done — claim the Horadric Stash beyond'
                          : 'A portal tears open — step through', 3.4);
        // The Act 1 boss (the first land's unique) can drop The Royal Grandeur.
        if (this.zoneIdx === 0 && Math.random() < 0.4) {
          const rg = new Pickup(boss.x, boss.y, 'item');
          rg.item = Items.generatePowerItem(this.monsterLevel(), 'royalGrandeur');
          this.pickups.push(rg);
          UI.toast('★ The Royal Grandeur!', '#ff8c2a');
        }
      }
    }
    fxNova(boss.x, boss.y, 220);
    AudioSys.sfx('portal');
    Particles.shake(8);
  },

  completeZone() {
    // Horadric cache.
    const diff = DIFFICULTIES[Hero.difficulty];
    const mLvl = this.monsterLevel();
    if (this.riftMode) {
      const gold = Math.round((500 + mLvl * 70) * diff.reward);
      Hero.gold += gold;
      const lines = [[gold + ' gold', '#ffd76a']];
      Hero.mats.soul += 2;
      lines.push(['2× Forgotten Souls', MATERIALS.soul.color]);
      const gem = Items.dropGem();
      Hero.gems.push(gem);
      lines.push([gemName(gem), GEM_TYPES[gem.type].color]);
      const kind = (this.zone && this.zone.riftKind) || 'normal';
      if (kind === 'season') {
        // Seasons don't drop keys — they drop SET pieces. Roll one by difficulty
        // (higher Torment = better odds); a hit is collected to the bag (owner rule).
        const chance = clamp(0.35 + tormentTier() * 0.035, 0.35, 0.95);
        if (Math.random() < chance) {
          const sp = Items.generateSetPiece(mLvl);
          Items.stash(sp);
          lines.push(['✦ ' + sp.name, RARITIES[5].color]);
        } else {
          lines.push(['No set piece this run', '#9a9080']);
        }
      } else {
        const kd = this.riftKeysDropped || 0;
        const klbl = this.riftKeyLabel || 'Nephalem Rift Key';
        lines.push([kd ? kd + '× ' + klbl + (kd > 1 ? 's' : '') + ' dropped' : 'No rift keys dropped this run',
          kd ? '#b06adf' : '#9a9080']);
      }
      this.rewardTitle = kind === 'season' ? 'SEASON COMPLETE' : 'RIFT COMPLETE';
      this.rewardLines = lines;
      Hero.addXP(Math.round(400 * diff.reward));
      Hero.save();
      this.state = 'camp';
      UI.open('reward');
      AudioSys.sfx('level');
      return;
    }
    // Finishing an Act of Story Mode: a bigger cache, and the run ends.
    if (this.story) {
      this.story = false;
      Hero.actsCleared = Math.max(Hero.actsCleared || 0, this.storyAct || 1);
      const gold = Math.round((900 + mLvl * 90) * diff.reward);
      Hero.gold += gold;
      const lines = [[gold + ' gold', '#ffd76a']];
      Hero.mats.soul += 3;
      lines.push(['3× Forgotten Souls', MATERIALS.soul.color]);
      const gem = Items.dropGem();
      Hero.gems.push(gem);
      lines.push([gemName(gem), GEM_TYPES[gem.type].color]);
      const item = Items.generate(mLvl + 2, 0.4);
      Items.stash(item);
      lines.push([item.name, RARITIES[item.rarity].color]);
      const act = this.storyAct || 1;
      // Act III: if the player never found the Cube in the dunes, the Sand Wyrm
      // yields it here — a guaranteed drop (owner rule).
      if (act === 3 && !Hero.hasCube) {
        Hero.hasCube = true;
        lines.push(['✦ The Horadric\'s Cube', RARITIES[6].color]);
        AudioSys.sfx('setdrop');
      }
      lines.push([act === 3 ? 'Act III complete — the Sand Wyrm is slain'
        : act === 1 ? 'Act I complete — the Skeleton King is slain'
        : 'Act ' + act + ' complete', '#ff8c2a']);
      this.rewardTitle = 'ACT ' + act + ' COMPLETE';
      this.rewardLines = lines;
      this.storyNextAct = act + 1;
      Hero.addXP(Math.round(1600 * diff.reward));
      Hero.save();
      this.state = 'camp';
      // Instead of dumping to the camp hub, offer a difficulty pick + CONTINUE.
      UI.open('actclear');
      AudioSys.sfx('level');
      return;
    }
    const gold = Math.round((300 + mLvl * 55) * diff.reward);
    Hero.gold += gold;
    const lines = [[`${gold} gold`, '#ffd76a']];
    const matGain = { parts: randInt(3, 6), dust: randInt(2, 4), crystal: mLvl >= 8 ? randInt(1, 2) : 0, soul: Math.random() < 0.45 + Hero.difficulty * 0.12 ? 1 : 0 };
    for (const [k, n] of Object.entries(matGain)) {
      if (!n) continue;
      Hero.mats[k] += n;
      lines.push([`${n}× ${MATERIALS[k].name}`, MATERIALS[k].color]);
    }
    const gem = Items.dropGem();
    Hero.gems.push(gem);
    lines.push([gemName(gem), GEM_TYPES[gem.type].color]);
    const item = Items.generate(mLvl + 1, 0.3);
    Items.stash(item);
    lines.push([item.name, RARITIES[item.rarity].color]);

    // Clearing all three parts of a bounty yields a HORADRIC STASH — gold,
    // Forgotten Souls and two gems. (Nephalem Rift Keys come from RIFTS, not
    // bounties, so the stash never mentions them.)
    if (this.zoneIdx >= 0) {
      const cGold = Math.round((500 + mLvl * 70) * diff.reward);
      Hero.gold += cGold; Hero.mats.soul += 3;
      const cGemA = Items.dropGem(); Hero.gems.push(cGemA);
      const cGemB = Items.dropGem(); Hero.gems.push(cGemB);
      lines.push(['◈ HORADRIC STASH — three bounties slain!', '#8fb0e8']);
      lines.push([cGold + ' gold  ·  3× Forgotten Souls', '#ffd76a']);
      lines.push([gemName(cGemA), GEM_TYPES[cGemA.type].color]);
      lines.push([gemName(cGemB), GEM_TYPES[cGemB.type].color]);
      AudioSys.sfx('setdrop');
    }
    this.bountyPart = 0;
    this.rewardTitle = this.zoneIdx >= 0 ? 'BOUNTIES COMPLETE' : 'ZONE COMPLETE';
    this.rewardLines = lines;

    Hero.zonesCleared = Math.max(Hero.zonesCleared, this.zoneIdx + 1);
    Hero.bestZone = Math.max(Hero.bestZone, this.zoneIdx + 1);
    Hero.addXP(Math.round(120 * (this.zoneIdx + 1) * diff.reward));
    Hero.save();
    this.state = 'camp';
    UI.open('reward');
    AudioSys.sfx('level');
  },

  onPlayerDeath() {
    this.playerDeadT = 0.01;
    Hero.save();
  },

  respawn() {
    const p = this.player;
    p.dead = false;
    p.hp = p.maxHp;
    p.essence = 40;
    p.x = World.spawn.x;
    p.y = World.spawn.y;
    p.invuln = 2;
    this.playerDeadT = 0;
    this.camera.x = p.x - this.W / 2;
    this.camera.y = p.y - this.H / 2;
    fxSummon(p.x, p.y);
    AudioSys.sfx('summon');
  },

  // ------------------------------------------------------- world objects

  // Loot burst from smashed clutter.
  breakLoot(b) {
    // Torch reagents: wood furniture (chairs/tables/bookcases/carts) yields Lumber;
    // pots, urns and stone clutter (cauldrons/braziers/pots) yield Iron Rivets.
    if (b.mat === 'wood' && Math.random() < 0.5) {
      const n = b.big ? randInt(2, 4) : 1;
      Hero.mats.lumber += n;
      Particles.text(b.x, b.y - 10, '+' + n + ' Lumber', { color: MATERIALS.lumber.color, size: 12, life: 1 });
    } else if ((b.mat === 'clay' || b.mat === 'stone') && Math.random() < 0.45) {
      const n = b.big ? randInt(2, 3) : 1;
      Hero.mats.rivets += n;
      Particles.text(b.x, b.y - 10, '+' + n + ' Iron Rivets', { color: MATERIALS.rivets.color, size: 12, life: 1 });
    }
    const roll = Math.random();
    const bonus = b.big ? 0.06 : 0;
    if (roll < 0.38 + bonus) {
      const g = new Pickup(b.x, b.y, 'gold');
      g.amount = Math.round(randInt(4, 14) * DIFFICULTIES[Hero.difficulty].reward * (this.player ? this.player.goldFind : 1) * (b.big ? 2 : 1));
      this.pickups.push(g);
    } else if (roll < 0.45 + bonus) {
      this.pickups.push(new Pickup(b.x, b.y, 'orb'));
    } else if (roll < 0.475 + bonus) {
      const pu = new Pickup(b.x, b.y, 'gem');
      pu.gem = Items.dropGem();
      this.pickups.push(pu);
    } else if (roll < 0.49 + bonus) {
      const pu = new Pickup(b.x, b.y, 'item');
      pu.item = Items.wildDrop(this.monsterLevel());
      this.pickups.push(pu);
    }
  },

  touchObjects() {
    const p = this.player;
    // Brushing past small clutter shatters it.
    for (const b of World.breakables) {
      if (b.broken || b.big) continue;
      if (dist(p.x, p.y, b.x, b.y) < p.r + b.r + 2) World.breakOne(b);
    }
    for (const o of World.objects) {
      if (o.used) continue;
      const d = dist(p.x, p.y, o.x, o.y);
      if (o.type === 'chest' && d < 46) {
        o.used = true;
        AudioSys.sfx('chest');
        Particles.spawn(o.x, o.y - 10, {
          count: 16, color: ['#ffd76a', '#ffb43a'], minSpeed: 40, maxSpeed: 180,
          minLife: 0.3, maxLife: 0.7, grav: 200, glow: true
        });
        const g = new Pickup(o.x, o.y, 'gold');
        g.amount = Math.round(rand(30, 80) * DIFFICULTIES[Hero.difficulty].reward * p.goldFind);
        this.pickups.push(g);
        if (Math.random() < 0.6) {
          const pu = new Pickup(o.x, o.y, 'item');
          pu.item = Items.wildDrop(this.monsterLevel(), 0.1);
          this.pickups.push(pu);
        }
        if (Math.random() < 0.35) {
          const pu = new Pickup(o.x, o.y, 'gem');
          pu.gem = Items.dropGem();
          this.pickups.push(pu);
        }
      } else if (o.type === 'shrine' && d < 42) {
        o.used = true;
        AudioSys.sfx('shrine');
        const names = { empowered: 'Empowered: essence surges', frenzied: 'Frenzied: +25% damage', blessed: 'Blessed: -25% damage taken', fortune: 'Fortune: +100% gold find' };
        p.shrine = { buff: o.buff, t: 60 };
        if (o.buff === 'empowered') p.essence = p.maxEssence;
        UI.toast(names[o.buff], '#6ff7c3');
        Particles.ring(o.x, o.y, 90, '#6ff7c3', 5, 0.6);
      } else if (o.type === 'vendor') {
        if (d < 50 && !o.near) {
          o.near = true;
          UI.open('vendor');       // pauses the crawl while trading
          UI.sel.vendor = o;
          AudioSys.sfx('gold');
        } else if (d > 95) {
          o.near = false;
        }
      } else if (o.type === 'urn' && d < 30) {
        o.used = true;
        AudioSys.sfx('hit');
        fxBone(o.x, o.y, 6);
        if (Math.random() < 0.7) {
          const g = new Pickup(o.x, o.y, 'gold');
          g.amount = randInt(3, 12);
          this.pickups.push(g);
        }
      }
    }
    // Shrine 'fortune' doubles gold find while active.
    // (applied via goldFind at pickup time)
    if (World.portal && this.bossDead && dist(p.x, p.y, World.portal.x, World.portal.y) < 40) {
      // On a LINKED sub-map the boss portal simply walks you back to the parent
      // map (its objective/journey lives one level up); base maps keep the
      // normal descent / bounty / completion flow.
      if (this.linkedMap && this.mapStack.length) this.goBack();
      else if (this.descend) this.nextStage();
      else if (this.nextBountyPart) this.startBountyPart(this.bountyPart + 1);
      else this.completeZone();
    }
    // Blue town portal: step off then back on to open the town-portal menu.
    if (World.townPortal) {
      const d = dist(p.x, p.y, World.townPortal.x, World.townPortal.y);
      if (d > 46) this.townPortalNear = false;
      else if (d < 34 && !this.townPortalNear) {
        this.townPortalNear = true;
        UI.townMode = true;
        UI.open('town');
        AudioSys.sfx('portal');
      }
    }
    // Entrance / exit / cave links — walkable portals into OTHER maps, open until
    // this map's boss dies. Step off then back on to travel (linkDebounce gate).
    if (!World.linksClosed && !UI.screen) {
      const near = pt => pt && dist(p.x, p.y, pt.x, pt.y) < 40;
      const onExit = near(World.exit), onCave = near(World.cave), onEntr = near(World.entrance) && this.mapStack.length > 0;
      if (!(onExit || onCave || onEntr)) this.linkDebounce = false;
      else if (!this.linkDebounce) {
        if (onCave) this.enterCave();
        else if (onExit) this.goDeeper(false);
        else if (onEntr) this.goBack();
      }
    }
  },

  // The HUD Portal button starts (or cancels) a 7-second channel that opens a
  // blue portal home. Moving cancels it (the hero must stand and focus).
  castTownPortal() {
    if (this.state !== 'playing' || UI.screen || !this.player || this.player.dead) return;
    if (this.portalCast) {                // tap again to cancel
      this.portalCast = null;
      UI.toast('Portal channel cancelled', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    if (World.townPortal) {
      UI.toast('A town portal is already open — step through it', '#8fd0ff');
      return;
    }
    if (this.portalCd > 0) {
      UI.toast('Town portal on cooldown — ' + Math.ceil(this.portalCd) + 's', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    this.portalCast = { t: 0, x: this.player.x, y: this.player.y };
    AudioSys.sfx('portal');
    UI.toast('Opening a town portal — hold still…', '#8fd0ff');
  },

  // Returning to the wilds from town collapses the portal and starts a 30-second
  // cooldown before another can be cast (called by "Back to the Wilds").
  returnFromTownPortal() {
    if (World.townPortal) {
      // A brief blue implosion where the portal winks out.
      Particles.ring(World.townPortal.x, World.townPortal.y, 70, '#8fd0ff', 5, 0.4);
      World.townPortal = null;
      this.portalCd = 30;
      this.townPortalNear = false;
      UI.toast('Town portal closed — 30s until you can open another', '#8fd0ff');
    }
  },

  // ------------------------------------------------------ map-chaining links
  // Every map has an ENTRANCE (leads back the way you came) and an EXIT (walk
  // onward to a fresh linked map) — plus the odd CAVE mouth. They stay open
  // until the map's boss dies, so you can roam a long chain of maps and walk
  // BACK into each one exactly as you left it (true saved-state backtracking).

  // Park the whole live map so it can be re-entered later, byte-for-byte.
  snapshotMap(returnPos) {
    return {
      world: World.snapshot(),
      enemies: this.enemies, projectiles: this.projectiles,
      corpses: this.corpses, pickups: this.pickups, telegraphs: this.telegraphs,
      fogBuf: this.fogBuf, fogStamp: this.fogStamp,
      bossDead: this.bossDead, linkedMap: this.linkedMap,
      returnX: returnPos.x, returnY: returnPos.y
    };
  },

  restoreMap(s) {
    World.restore(s.world);
    this.enemies = s.enemies; this.projectiles = s.projectiles;
    this.corpses = s.corpses; this.pickups = s.pickups; this.telegraphs = s.telegraphs;
    this.fogBuf = s.fogBuf; this.fogStamp = s.fogStamp;
    this.bossDead = s.bossDead; this.linkedMap = s.linkedMap;
    this.player.x = s.returnX; this.player.y = s.returnY;
    World.collide(this.player);
    this.repositionMinions();
    this.camera.x = this.player.x - this.W / 2;
    this.camera.y = this.player.y - this.H / 2;
  },

  // Your minions follow you between maps — cluster them at your new position.
  repositionMinions() {
    for (const m of this.minions) {
      if (m.dead) continue;
      const a = rand(TAU), d = rand(30, 70);
      m.x = this.player.x + Math.cos(a) * d;
      m.y = this.player.y + Math.sin(a) * d;
    }
  },

  // Build a fresh linked map from the current land's character (same monsters /
  // level), or a dank dungeon CAVE that harbours Rathma's Chosen.
  linkedZone() {
    const z = this.zone;
    return { name: z.name, kind: z.kind, mLvl: z.mLvl, monsters: z.monsters,
             biome: z.biome, weather: z.weather, tiles: z.tiles, rift: false };
  },
  caveZone() {
    return { name: 'Hidden Cave', kind: 'dungeon', mLvl: this.zone.mLvl,
             monsters: this.zone.monsters, noLinks: true, cave: true, tiles: 7 };
  },

  // Generate + populate a linked map, dropping the hero at its entrance. Keeps
  // the persistent hero (HP/essence carry) and their minions.
  loadLinkedMap(zone, cave) {
    World.generate(zone);
    this.zone = zone;
    this.enemies = []; this.projectiles = []; this.corpses = [];
    this.pickups = []; this.telegraphs = [];
    this.fogBuf = null; this.bossDead = false; this.descend = false;
    this.linkedMap = true;   // reached via an exit/cave — its boss portal returns to parent
    const boost = 1 + (Hero.cheats.spawn || 0);
    const em = DIFFICULTIES[Hero.difficulty].enemyMult || 1;
    const packSize = () => clamp(Math.round(randInt(3, 5) * em * boost), 3, Math.round(14 * boost));
    const spawnPack = (x, y, ec) => {
      const eLead = Math.random() < ec, rLead = eLead && Math.random() < 0.3, n = packSize();
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), d = rand(0, 70);
        const e = new Enemy(pick(zone.monsters), x + Math.cos(a) * d, y + Math.sin(a) * d, {
          elite: eLead && i === 0, rare: rLead && i === 0,
          name: eLead && i === 0 ? (rLead ? 'Rare ' : '') + pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) : undefined
        });
        World.collide(e); this.enemies.push(e);
      }
    };
    for (const pk of World.packs) spawnPack(pk.x, pk.y, 0.18);
    if (cave) {
      // The cave's dweller: Rathma's Chosen, a stealthing rare-elite assassin.
      this.enemies.push(new Enemy('rathma', World.bossPos.x, World.bossPos.y, { rare: true, name: MONSTERS.rathma.name }));
    } else {
      const nm = pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) + ' the ' + pick(['Warden', 'Gatekeeper', 'Deepwalker', 'Threshold']);
      this.enemies.push(new Enemy('brute', World.bossPos.x, World.bossPos.y, { unique: true, name: nm }));
      if (Math.random() < 0.18) {
        const rb = Math.random() < 0.5 ? 'wyrm' : 'glutton';
        const pos = World.pickFarSpot(700, 320);
        this.enemies.push(new Enemy(rb, pos.x, pos.y, { name: MONSTERS[rb].name }));
      }
    }
    this.player.x = World.entrance.x; this.player.y = World.entrance.y;
    World.collide(this.player);
    this.repositionMinions();
    this.camera.x = this.player.x - this.W / 2;
    this.camera.y = this.player.y - this.H / 2;
    this.linkDebounce = true;   // you arrive ON the entrance — step off to re-arm
  },

  goDeeper(cave) {
    const from = cave ? World.cave : World.exit;
    if (!from) return;
    this.mapStack.push(this.snapshotMap({ x: from.x, y: from.y }));
    this.loadLinkedMap(cave ? this.caveZone() : this.linkedZone(), cave);
    Particles.ring(this.player.x, this.player.y, 90, cave ? '#b06adf' : '#8fd0ff', 6, 0.5);
    AudioSys.sfx('portal');
    this.showBanner(cave ? 'INTO THE CAVE' : 'DEEPER STILL',
      cave ? 'Something ancient stirs in the dark' : 'A fresh expanse unfolds — the way back stays open', 2.4);
  },

  enterCave() { this.goDeeper(true); },

  goBack() {
    if (!this.mapStack.length) return;
    this.restoreMap(this.mapStack.pop());
    this.linkDebounce = true;   // you arrive ON the exit you left — step off to re-arm
    Particles.ring(this.player.x, this.player.y, 90, '#6ff7c3', 6, 0.5);
    AudioSys.sfx('portal');
    this.showBanner('BACK THE WAY YOU CAME', '', 1.8);
  },

  // Advance the town-portal channel; complete it at 7s, cancel it if the hero
  // walks off the casting spot.
  updatePortalCast(dt) {
    const pc = this.portalCast;
    if (!pc) return;
    const p = this.player;
    if (dist(p.x, p.y, pc.x, pc.y) > 34) {
      this.portalCast = null;
      UI.toast('Portal interrupted — you moved', '#9a9080');
      AudioSys.sfx('denied');
      return;
    }
    pc.t += dt;
    // Electric sparks streaming up into the storm gathering over the hero's head.
    if (Math.random() < 0.7) {
      const a = Math.random() * TAU, r = 8 + Math.random() * 16;
      Particles.spawn(p.x + Math.cos(a) * r, p.y - 16 + Math.sin(a) * r * 0.4, {
        count: 1, color: ['#8fd0ff', '#4aa3e0', '#d8ecfa'], minSpeed: 10, maxSpeed: 34,
        minLife: 0.3, maxLife: 0.7, minSize: 1.2, maxSize: 2.6, grav: -140, glow: true
      });
    }
    if (pc.t >= 7) {
      World.townPortal = { x: pc.x, y: pc.y };
      this.townPortalNear = true;         // hero is standing on it — step off to arm
      this.portalCast = null;
      // A blue flourish as the portal snaps open (matches its colour).
      Particles.ring(pc.x, pc.y, 120, '#8fd0ff', 8, 0.5);
      Particles.ring(pc.x, pc.y, 80, '#4aa3e0', 4, 0.45);
      Particles.spawn(pc.x, pc.y, {
        count: 30, color: ['#8fd0ff', '#4aa3e0', '#d8ecfa'],
        minSpeed: 120, maxSpeed: 340, minLife: 0.3, maxLife: 0.6,
        minSize: 2, maxSize: 5, glow: true, drag: 2.5
      });
      Particles.shake(5);
      AudioSys.sfx('portal');
      UI.toast('Town portal open — step through to reach town', '#8fd0ff');
    }
  },

  // ------------------------------------------------------------------ loop

  frame(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0.016);
    this.lastT = t;
    this.time += dt;
    // One bad frame must never kill the game loop.
    try {
      this.update(dt);
      this.draw();
    } catch (e) {
      console.error('frame error:', e);
    }
    requestAnimationFrame(tt => this.frame(tt));
  },

  update(dt) {
    Input.update();
    this.fps = lerp(this.fps, 1 / Math.max(dt, 0.001), 0.05);

    // Route the soundscape: zone ambience/weather vs camp hush.
    if (AudioSys.ctx) {
      if (this.state === 'playing' && this.zone) {
        AudioSys.setAmbience(this.zone.kind === 'dungeon' ? 'crypt' : 'wilds');
        AudioSys.setWeather(this.zone.weather || null);
      } else {
        AudioSys.setAmbience('camp');
        AudioSys.setWeather(null);
      }
    }

    if (this.state !== 'playing') return;

    if (this.playerDeadT > 0) {
      this.playerDeadT += dt;
      Particles.update(dt);
      return;
    }
    if (UI.screen) return; // menus pause the crawl

    const p = this.player;
    // Fortune shrine: temporary gold find boost.
    const baseGoldFind = p.goldFind;
    if (p.shrine && p.shrine.buff === 'fortune') p.goldFind = baseGoldFind * 2;

    p.update(dt);
    this.updatePortalCast(dt);
    if (this.portalCd > 0) this.portalCd = Math.max(0, this.portalCd - dt);
    Skills.update(dt);
    // A held torch burns down in real time; when it's out it disappears.
    const torch = Hero.equipped.torch;
    if (torch && torch.burnT !== undefined) {
      torch.burnT -= dt;
      if (torch.burnT <= 0) {
        delete Hero.equipped.torch;
        UI.toast('Your ' + torch.name + ' burns out — darkness closes in', '#9a9080');
        AudioSys.sfx('denied');
        Hero.save();
      }
    }
    this.updateRiftSpawns(dt);
    this.touchObjects();

    for (const e of this.enemies) e.update(dt);
    for (const m of this.minions) m.update(dt);
    for (const pr of this.projectiles) pr.update(dt);
    for (const c of this.corpses) c.update(dt);
    for (const pu of this.pickups) pu.update(dt);
    for (const t of this.telegraphs) t.t += dt;
    Particles.update(dt);

    p.goldFind = baseGoldFind;

    this.enemies = this.enemies.filter(e => !e.dead);
    this.minions = this.minions.filter(m => !m.dead);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    this.corpses = this.corpses.filter(c => !c.gone);
    // Corpses persist; cap the field by count so the oldest fade past the limit.
    const corpseCap = Settings.g.corpseCap || 100;
    if (this.corpses.length > corpseCap) {
      this.corpses.splice(0, this.corpses.length - corpseCap);
    }
    this.pickups = this.pickups.filter(pu => !pu.gone);
    this.telegraphs = this.telegraphs.filter(t => !t.done && t.t < t.maxT + 0.2);

    if (this.banner.t > 0) this.banner.t -= dt;

    this.saveTick += dt;
    if (this.saveTick > 12) {
      this.saveTick = 0;
      Hero.save();
    }
    this.updateCamera(dt);
  },

  updateCamera(dt) {
    const p = this.player;
    if (!p) return;
    const tx = clamp(p.x - this.W / 2, -60, World.W - this.W + 60);
    const ty = clamp(p.y - this.H / 2, -60, World.H - this.H + 60);
    const k = Math.min(1, 6 * dt);
    this.camera.x = lerp(this.camera.x, tx, k);
    this.camera.y = lerp(this.camera.y, ty, k);
  },

  // ------------------------------------------------------------------ draw

  drawTelegraphs(ctx) {
    for (const t of this.telegraphs) {
      const k = clamp(t.t / t.maxT, 0, 1);
      const pulse = 0.06 * Math.sin(this.time * 14);
      ctx.save();
      if (t.type === 'circle') {
        ctx.globalAlpha = 0.18 + pulse;
        ctx.fillStyle = '#c22843';
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.30 + pulse;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r * k, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#e04a5a';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.stroke();
      } else {
        ctx.translate(t.x, t.y);
        ctx.rotate(t.a);
        ctx.globalAlpha = 0.18 + pulse;
        ctx.fillStyle = '#c22843';
        ctx.fillRect(0, -t.w / 2, t.len, t.w);
        ctx.globalAlpha = 0.32 + pulse;
        ctx.fillRect(0, -t.w / 2, t.len * k, t.w);
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#e04a5a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(0, -t.w / 2, t.len, t.w);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // The town-portal channel animation (world space): a spinning blue rune ring
  // under the hero and a portal that knits together over the 7 seconds.
  // A jagged lightning arc from (x1,y1) to (x2,y2), displaced at each segment.
  strokeLightning(ctx, x1, y1, x2, y2, segs, spread) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const f = i / segs;
      ctx.lineTo(x1 + (x2 - x1) * f + rand(-spread, spread),
                 y1 + (y2 - y1) * f + rand(-spread, spread));
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  },

  // The town-portal channel: a gathering storm of blue lightning crackling ABOVE
  // the hero's head (no goofy circular cast bar) — it climbs and intensifies as
  // the 7-second channel fills, then discharges into the open portal.
  drawPortalCast(ctx) {
    const pc = this.portalCast;
    if (!pc) return;
    const p = this.player;
    if (!p) return;
    const k = clamp(pc.t / 7, 0, 1);
    const t = this.time;
    const crownX = p.x, crownY = p.y - 18;        // the crown of the hero's head
    const hx = p.x, hy = p.y - 32 - 16 * k;        // focal point, rising as it charges
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Soft glow halo behind the storm.
    const gr = 22 + 18 * k;
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, gr);
    glow.addColorStop(0, `rgba(143,208,255,${(0.22 + 0.34 * k).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(74,163,224,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(hx, hy, gr, 0, TAU); ctx.fill();
    // Forming energy core.
    ctx.fillStyle = `rgba(216,236,250,${(0.5 + 0.4 * k).toFixed(3)})`;
    const core = 1.6 + 4 * k + Math.sin(t * 20) * 0.8;
    ctx.beginPath(); ctx.arc(hx, hy, Math.max(1, core), 0, TAU); ctx.fill();
    // Lightning bolts arcing from around the crown up into the core.
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const bolts = 2 + Math.round(k * 3);
    for (let i = 0; i < bolts; i++) {
      const a = rand(0, TAU), rad = 11 + rand(0, 9);
      const ox = crownX + Math.cos(a) * rad, oy = crownY + Math.sin(a) * rad * 0.5;
      const tx = hx + rand(-4, 4), ty = hy + rand(-4, 4);
      ctx.strokeStyle = `rgba(74,163,224,${(0.35 + 0.3 * k).toFixed(3)})`;
      ctx.lineWidth = 3;
      this.strokeLightning(ctx, ox, oy, tx, ty, 5, 6);
      ctx.strokeStyle = `rgba(220,238,252,${(0.7 + 0.3 * k).toFixed(3)})`;
      ctx.lineWidth = 1.3;
      this.strokeLightning(ctx, ox, oy, tx, ty, 5, 5);
    }
    // An occasional wild arc crackling around the crown.
    if (Math.random() < 0.55) {
      const a1 = rand(0, TAU), a2 = a1 + rand(1, 2.4), r = 13;
      ctx.strokeStyle = 'rgba(143,208,255,0.5)';
      ctx.lineWidth = 1.2;
      this.strokeLightning(ctx,
        crownX + Math.cos(a1) * r, crownY + Math.sin(a1) * r * 0.5,
        crownX + Math.cos(a2) * r, crownY + Math.sin(a2) * r * 0.5, 4, 5);
    }
    ctx.restore();
  },

  // Screen-space weather: rain streaks / drifting dust, honoring settings.
  drawWeather(ctx) {
    if (!this.zone || !this.zone.weather) return;
    const n = Settings.g.lowFx ? 28 : 60;
    const t = this.time;
    if (this.zone.weather === 'rain') {
      ctx.strokeStyle = 'rgba(150,170,200,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const speed = 520 + (i % 7) * 40;
        const x = ((i * 137.51 + t * 90) % (this.W + 60)) - 30;
        const y = ((i * 211.73 + t * speed) % (this.H + 40)) - 20;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 13);
      }
      ctx.stroke();
    } else if (this.zone.weather === 'wind') {
      ctx.fillStyle = 'rgba(190,170,130,0.14)';
      for (let i = 0; i < n * 0.6; i++) {
        const x = ((i * 173.13 + t * (160 + (i % 5) * 60)) % (this.W + 40)) - 20;
        const y = (i * 97.77 + Math.sin(t * 1.4 + i) * 30) % this.H;
        ctx.fillRect(x, y, 3 + (i % 3), 1.5);
      }
    }
  },

  drawAimIndicator(ctx) {
    if (!Settings.g.aimIndicator) return;
    const p = this.player;
    if (!p || p.dead) return;
    let a = null, color = '#6ff7c3';
    const ab = Input.aimingButton();
    if (ab) {
      a = ab.angle;
      color = '#ffd76a';
    } else if (Input.aim.active) {
      a = Math.atan2(Input.aim.y, Input.aim.x);
    }
    if (a === null) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const d = 46 + i * 30;
      ctx.globalAlpha = 0.55 - i * 0.13 + 0.1 * Math.sin(this.time * 8 - i);
      ctx.lineWidth = 4 - i * 0.8;
      ctx.beginPath();
      ctx.moveTo(d - 9, -10 + i * 1.5);
      ctx.lineTo(d, 0);
      ctx.lineTo(d - 9, 10 - i * 1.5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050308';
    ctx.fillRect(0, 0, this.W, this.H);

    if (this.state !== 'playing') {
      // Drifting world backdrop behind menus.
      const cx = World.W / 2 + Math.cos(this.time * 0.08) * 260 - this.W / 2;
      const cy = World.H / 2 + Math.sin(this.time * 0.06) * 260 - this.H / 2;
      ctx.save();
      ctx.translate(-cx, -cy);
      World.drawGround(ctx, { x: cx, y: cy }, this.W, this.H);
      for (const d of World.propsInView({ x: cx, y: cy }, this.W, this.H)) d.draw(ctx);
      ctx.restore();
      ctx.fillStyle = 'rgba(5,3,8,0.55)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.drawImage(this.vignette, 0, 0);
      UI.draw(ctx, this.W, this.H);
      return;
    }

    const shake = Particles.shakeAmt;
    const sx = shake ? rand(-shake, shake) : 0;
    const sy = shake ? rand(-shake, shake) : 0;
    const cam = { x: this.camera.x + sx, y: this.camera.y + sy };

    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    World.drawGround(ctx, cam, this.W, this.H);
    this.drawTelegraphs(ctx);

    for (const c of this.corpses) c.draw(ctx);
    for (const p of this.pickups) p.draw(ctx);

    this.drawAimIndicator(ctx);

    const drawables = World.propsInView(cam, this.W, this.H);
    const inView = e => e.x > cam.x - 90 && e.x < cam.x + this.W + 90 && e.y > cam.y - 110 && e.y < cam.y + this.H + 110;
    for (const e of this.enemies) if (inView(e)) drawables.push({ y: e.y, draw: c => e.draw(c) });
    for (const m of this.minions) if (inView(m)) drawables.push({ y: m.y, draw: c => m.draw(c) });
    if (!this.player.dead) drawables.push({ y: this.player.y, draw: c => this.player.draw(c) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    for (const pr of this.projectiles) pr.draw(ctx);
    this.drawPortalCast(ctx);
    Particles.draw(ctx);

    ctx.restore();

    this.drawWeather(ctx);
    ctx.drawImage(this.vignette, 0, 0);
    this.drawTorchLight(ctx);
    this.drawWorldFog(ctx, cam);

    // Land of the Dead ambience.
    if (Skills.lotd > 0) {
      ctx.fillStyle = `rgba(60,180,140,${0.05 + 0.03 * Math.sin(this.time * 5)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    const p = this.player;
    if (p && !p.dead && p.hp / p.maxHp < 0.3) {
      const pulse = 0.16 + 0.13 * Math.sin(this.time * 6);
      ctx.fillStyle = `rgba(140,10,20,${pulse * (1 - p.hp / p.maxHp / 0.3 + 0.3)})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    UI.draw(ctx, this.W, this.H);
  },

  // The lit / fog-reveal radius (px) around the hero: tiny with no torch, more
  // with a Wood torch, more with Iron, a lot more with a Nephalem torch.
  lightRadius() {
    const torch = Hero.equipped.torch;
    const T = torch ? (TORCH_TYPES[torch.torch] || TORCH_TYPES.wood) : null;
    return T ? T.radius : NO_TORCH_RADIUS;
  },

  // The torch's pool of light — a lit circle around the hero that fades to
  // darkness. With a torch it's a gentle atmospheric edge; once it burns out the
  // dark closes right in. Nephalem torches light the most.
  drawTorchLight(ctx) {
    const p = this.player;
    if (!p) return;
    const torch = Hero.equipped.torch;
    const T = torch ? (TORCH_TYPES[torch.torch] || TORCH_TYPES.wood) : null;
    const sx = p.x - this.camera.x, sy = p.y - this.camera.y;
    // Crypts are the true dark; open daylit lands stay bright (the torch just
    // adds a cozy glow there) so the wilds never read as "too dark".
    const dark = this.zone && this.zone.kind === 'dungeon';
    const R = this.lightRadius();                 // lit radius
    const edge = dark ? (T ? 0.52 : 0.9) : (T ? 0.16 : 0.28); // darkness at the far edge
    const outer = Math.max(R + 60, Math.hypot(this.W, this.H) * 0.62);
    const g = ctx.createRadialGradient(sx, sy, R * 0.4, sx, sy, outer);
    g.addColorStop(0, 'rgba(3,2,6,0)');
    g.addColorStop(clamp(R / outer, 0.12, 0.85), 'rgba(3,2,6,' + (edge * 0.5).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(2,1,4,' + edge.toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    // Warm flicker at the flame.
    if (T) {
      const n = parseInt(T.color.slice(1), 16);
      const cr = (n >> 16) & 255, cg = (n >> 8) & 255, cb = n & 255;
      const flick = 0.12 + 0.05 * Math.sin(this.time * 12) + 0.03 * Math.sin(this.time * 27);
      const gg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.7);
      gg.addColorStop(0, `rgba(${cr},${cg},${cb},${flick.toFixed(3)})`);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalCompositeOperation = 'source-over';
    }
  },

  // Fog of war: the whole map starts pitch black and only uncovers as the hero
  // moves. Rather than a coarse per-cell grid (which unveils in blocky chunks),
  // we keep a higher-res accumulation buffer and ERASE a soft-edged brush at the
  // hero each frame — so the frontier melts away like a fine mist as you slide
  // across the map. Scaled back up with smoothing for an even softer edge.
  drawWorldFog(ctx, cam) {
    if (!World.W || !World.H) return;
    const F = 6;   // world px per fog-buffer px (fine enough for a smooth mist)
    const w = Math.max(1, Math.ceil(World.W / F));
    const h = Math.max(1, Math.ceil(World.H / F));
    if (!this.fogBuf || this.fogStamp !== World.stamp || this.fogBuf.width !== w || this.fogBuf.height !== h) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const fx = c.getContext('2d');
      fx.fillStyle = '#000';
      fx.fillRect(0, 0, w, h);          // start fully shrouded
      this.fogBuf = c; this.fogCtx = fx;
      this.fogStamp = World.stamp;
    }
    const p = this.player;
    if (p && !p.dead) {
      const fx = this.fogCtx;
      const bx = p.x / F, by = p.y / F, br = this.lightRadius() / F;
      // A feathered brush: solid clear at the centre, fading to nothing at the
      // rim, punched out with destination-out so reveals accumulate permanently.
      const g = fx.createRadialGradient(bx, by, br * 0.35, bx, by, br);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      fx.globalCompositeOperation = 'destination-out';
      fx.fillStyle = g;
      fx.beginPath(); fx.arc(bx, by, br, 0, TAU); fx.fill();
      fx.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fogBuf, -cam.x, -cam.y, w * F, h * F);
    ctx.restore();
  }
};

window.addEventListener('load', () => Game.init());
