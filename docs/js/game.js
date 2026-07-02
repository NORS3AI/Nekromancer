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

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
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
    this.zoneIdx = idx;
    this.zone = ZONES[idx];
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
    // The bounty boss.
    const boss = new Enemy('brute', World.bossPos.x, World.bossPos.y, {
      unique: true, name: this.zone.boss
    });
    this.enemies.push(boss);

    this.state = 'playing';
    this.showBanner(this.zone.name, 'Bounty: slay ' + this.zone.boss, 3);
    AudioSys.sfx('wave');
    Hero.save();
  },

  onBossDead(boss) {
    this.bossDead = true;
    World.portal = { x: boss.x, y: boss.y };
    this.showBanner('BOUNTY COMPLETE', 'A portal tears open — step through', 3.4);
    fxNova(boss.x, boss.y, 220);
    AudioSys.sfx('portal');
    Particles.shake(8);
  },

  completeZone() {
    // Horadric cache.
    const diff = DIFFICULTIES[Hero.difficulty];
    const mLvl = this.monsterLevel();
    const gold = Math.round((300 + mLvl * 55) * diff.reward);
    Hero.gold += gold;
    const lines = [[`${gold} gold`, '#ffd76a']];
    const matGain = { parts: randInt(3, 6), dust: randInt(2, 4), crystal: mLvl >= 8 ? randInt(1, 2) : 0, soul: Hero.difficulty >= 3 && Math.random() < 0.5 ? 1 : 0 };
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

  touchObjects() {
    const p = this.player;
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

  drawAimIndicator(ctx) {
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
