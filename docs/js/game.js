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
  playerDeadT: 0,
  rewardLines: null,
  banner: { text: '', sub: '', t: 0, maxT: 1 },
  vignette: null,
  lastT: 0,
  saveTick: 0,
  cheats: { god: false, essence: false },   // dev panel, session-only
  riftMode: false,
  riftProgress: 0,
  guardianUp: false,
  riftSpawnT: 0,
  fps: 60,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    Settings.load();
    Skills.init();
    Hero.load();
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

  startZone(idx) {
    this.startLand(ZONES[idx], idx);
  },

  startRift() {
    this.startLand(makeRiftZone(), null);
  },

  startLand(zone, idx) {
    this.zoneIdx = idx === null ? -1 : idx;
    this.zone = zone;
    this.riftMode = !!zone.rift;
    this.riftProgress = 0;
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

    // Populate packs (asleep until approached).
    for (const pk of World.packs) {
      const n = randInt(3, 5);
      const eliteLeader = Math.random() < 0.16;
      for (let i = 0; i < n; i++) {
        const a = rand(TAU), d = rand(0, 70);
        const type = pick(this.zone.monsters);
        const e = new Enemy(type, pk.x + Math.cos(a) * d, pk.y + Math.sin(a) * d, {
          elite: eliteLeader && i === 0,
          name: eliteLeader && i === 0 ? pick(ELITE_PREFIX) + pick(ELITE_SUFFIX) : undefined
        });
        World.collide(e);
        this.enemies.push(e);
      }
    }
    // The bounty boss (rifts summon their Guardian only when the bar fills).
    if (!this.riftMode) {
      const boss = new Enemy('brute', World.bossPos.x, World.bossPos.y, {
        unique: true, name: this.zone.boss
      });
      this.enemies.push(boss);
    }

    this.state = 'playing';
    this.showBanner(this.zone.name,
      this.riftMode ? 'Slay everything. Fill the rift.' : 'Bounty: slay ' + this.zone.boss, 3);
    AudioSys.sfx('wave');
    Hero.save();
  },

  // ------------------------------------------------------------- rifts

  riftKill(enemy) {
    if (!this.riftMode || this.guardianUp || this.riftProgress >= 100) return;
    this.riftProgress = Math.min(100, this.riftProgress + (enemy.elite ? 4.5 : 1.6));
    if (this.riftProgress >= 100) {
      this.guardianUp = true;
      const pt = this.spawnNear(this.player, 420);
      const g = new Enemy('brute', pt.x, pt.y, { unique: true, name: this.zone.boss });
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
    if (!this.riftMode || this.riftProgress >= 100) return;
    // Keep the shard crawling with prey.
    if (this.enemies.length < 26) {
      this.riftSpawnT -= dt;
      if (this.riftSpawnT <= 0) {
        this.riftSpawnT = 2.6;
        const pt = this.spawnNear(this.player, Math.max(this.W, this.H) * 0.62);
        const elite = Math.random() < 0.12;
        for (let i = 0; i < randInt(2, 4); i++) {
          const e = new Enemy(pick(this.zone.monsters), pt.x + rand(-60, 60), pt.y + rand(-60, 60), { elite: elite && i === 0 });
          World.collide(e);
          this.enemies.push(e);
        }
      }
    }
  },

  onBossDead(boss) {
    this.bossDead = true;
    World.portal = { x: boss.x, y: boss.y };
    if (this.riftMode) {
      Hero.riftsCleared++;
      // The Guardian's hoard: the set hunt is the endgame.
      const owned = Hero.setPiecesOwned();
      const pu = new Pickup(boss.x, boss.y, 'item');
      pu.item = owned.size < 6 ? Items.generateSetPiece(this.monsterLevel())
        : (Math.random() < 0.5 ? Items.generatePowerItem(this.monsterLevel()) : Items.generateSetPiece(this.monsterLevel()));
      this.pickups.push(pu);
      if (Math.random() < 0.45) {
        const pu2 = new Pickup(boss.x, boss.y, 'item');
        pu2.item = Items.generatePowerItem(this.monsterLevel());
        this.pickups.push(pu2);
      }
      AudioSys.sfx('setdrop');
      this.showBanner('RIFT CLEARED', 'The Guardian yields its hoard', 3.4);
    } else {
      this.showBanner('BOUNTY COMPLETE', 'A portal tears open — step through', 3.4);
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
      const gem = Items.generateGem(mLvl + 4);
      Hero.gems.push(gem);
      lines.push([gemName(gem), GEM_TYPES[gem.type].color]);
      lines.push(['Rifts cleared: ' + Hero.riftsCleared, '#b06adf']);
      this.rewardLines = lines;
      Hero.addXP(Math.round(400 * diff.reward));
      Hero.save();
      this.state = 'camp';
      UI.open('reward');
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
    const gem = Items.generateGem(mLvl);
    Hero.gems.push(gem);
    lines.push([gemName(gem), GEM_TYPES[gem.type].color]);
    const item = Items.generate(mLvl + 1, 0.3);
    Items.stash(item);
    lines.push([item.name, RARITIES[item.rarity].color]);
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
      pu.gem = Items.generateGem(this.monsterLevel());
      this.pickups.push(pu);
    } else if (roll < 0.49 + bonus) {
      const pu = new Pickup(b.x, b.y, 'item');
      pu.item = Items.generate(this.monsterLevel());
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
          pu.item = Items.generate(this.monsterLevel(), 0.1);
          this.pickups.push(pu);
        }
        if (Math.random() < 0.35) {
          const pu = new Pickup(o.x, o.y, 'gem');
          pu.gem = Items.generateGem(this.monsterLevel());
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
      this.completeZone();
    }
  },

  // ------------------------------------------------------------------ loop

  frame(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0.016);
    this.lastT = t;
    this.time += dt;
    this.update(dt);
    this.draw();
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
    Skills.update(dt);
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
    Particles.draw(ctx);

    ctx.restore();

    this.drawWeather(ctx);
    ctx.drawImage(this.vignette, 0, 0);

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
  }
};

window.addEventListener('load', () => Game.init());
