'use strict';
// ---------------------------------------------------------------------------
// Main loop, wave director, camera and compositing.
// ---------------------------------------------------------------------------

const Game = {
  canvas: null,
  ctx: null,
  W: 0, H: 0, dpr: 1,
  state: 'menu',            // 'menu' | 'playing' | 'over'
  time: 0,
  overT: 0,
  camera: { x: 0, y: 0 },
  player: null,
  enemies: [],
  minions: [],
  projectiles: [],
  corpses: [],
  pickups: [],
  wave: 0,
  kills: 0,
  gold: 0,
  spawnQueue: [],
  spawnTimer: 0,
  restTimer: 0,
  banner: { text: '', sub: '', t: 0, maxT: 0 },
  vignette: null,
  lastT: 0,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', () => this.resize());
    this.resize();
    World.generate();
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

  reset() {
    this.player = new Player(World.W / 2, World.H / 2);
    this.enemies.length = 0;
    this.minions.length = 0;
    this.projectiles.length = 0;
    this.corpses.length = 0;
    this.pickups.length = 0;
    this.spawnQueue.length = 0;
    Particles.reset();
    Skills.reset();
    this.wave = 0;
    this.kills = 0;
    this.gold = 0;
    this.restTimer = 1.2;
    this.camera.x = this.player.x - this.W / 2;
    this.camera.y = this.player.y - this.H / 2;
  },

  showBanner(text, sub = '', dur = 2.4) {
    this.banner = { text, sub, t: dur, maxT: dur };
  },

  // ----------------------------------------------------------- wave director

  nextWave() {
    this.wave++;
    const n = Math.min(8 + this.wave * 3, 46);
    const pool = ['zombie'];
    if (this.wave >= 2) pool.push('skeleton', 'skeleton');
    if (this.wave >= 3) pool.push('ghoul');
    if (this.wave >= 4) pool.push('cultist');
    if (this.wave >= 6) pool.push('ghoul', 'cultist');
    this.spawnQueue.length = 0;
    for (let i = 0; i < n; i++) this.spawnQueue.push(pick(pool));
    const isBossWave = this.wave % 5 === 0;
    if (isBossWave) {
      const brutes = 1 + Math.floor(this.wave / 10);
      for (let i = 0; i < brutes; i++) this.spawnQueue.push('brute');
    }
    this.spawnTimer = 0.5;
    this.showBanner('WAVE ' + this.wave, isBossWave ? 'Something big stirs...' : '');
    AudioSys.sfx('wave');
    // A little essence to open the wave with.
    this.player.gainEssence(20);
  },

  spawnPoint() {
    const p = this.player;
    const d = Math.max(this.W, this.H) * 0.6 + rand(40, 160);
    for (let i = 0; i < 12; i++) {
      const a = rand(TAU);
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (x > 70 && y > 70 && x < World.W - 70 && y < World.H - 70) return { x, y };
    }
    return { x: clamp(p.x + rand(-d, d), 70, World.W - 70), y: clamp(p.y + rand(-d, d), 70, World.H - 70) };
  },

  updateWaves(dt) {
    if (this.restTimer > 0) {
      this.restTimer -= dt;
      if (this.restTimer <= 0) this.nextWave();
      return;
    }
    const cap = Math.min(15 + this.wave, 26);
    if (this.spawnQueue.length && this.enemies.length < cap) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(0.3, 0.95 - this.wave * 0.04);
        const type = this.spawnQueue.shift();
        const pt = this.spawnPoint();
        this.enemies.push(new Enemy(type, pt.x, pt.y, this.wave));
      }
    }
    if (!this.spawnQueue.length && !this.enemies.length) {
      this.restTimer = 3.2;
      this.showBanner('WAVE CLEARED', 'The dead rest... briefly', 2);
      this.player.gainEssence(30);
    }
  },

  // ------------------------------------------------------------------- loop

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

    if (this.state === 'menu') {
      if (Input.consumeTap()) {
        AudioSys.init();
        this.reset();
        this.state = 'playing';
      }
      return;
    }

    if (this.state === 'over') {
      this.overT += dt;
      Particles.update(dt);
      if (this.overT > 1.2 && Input.consumeTap()) {
        this.reset();
        this.state = 'playing';
      }
      this.updateCamera(dt);
      return;
    }

    Input.consumeTap();
    this.player.update(dt);
    Skills.update(dt);
    this.updateWaves(dt);

    for (const e of this.enemies) e.update(dt);
    for (const m of this.minions) m.update(dt);
    for (const pr of this.projectiles) pr.update(dt);
    for (const c of this.corpses) c.update(dt);
    for (const pu of this.pickups) pu.update(dt);
    Particles.update(dt);

    this.enemies = this.enemies.filter(e => !e.dead);
    this.minions = this.minions.filter(m => !m.dead);
    this.projectiles = this.projectiles.filter(p => !p.dead);
    this.corpses = this.corpses.filter(c => !c.gone);
    this.pickups = this.pickups.filter(p => !p.gone);

    if (this.banner.t > 0) this.banner.t -= dt;
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

  gameOver() {
    this.state = 'over';
    this.overT = 0;
    Particles.shake(10);
  },

  // ------------------------------------------------------------------- draw

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#050308';
    ctx.fillRect(0, 0, this.W, this.H);

    if (this.state === 'menu') {
      // Slow drifting camera over the world for the title backdrop.
      const cx = World.W / 2 + Math.cos(this.time * 0.1) * 300 - this.W / 2;
      const cy = World.H / 2 + Math.sin(this.time * 0.07) * 300 - this.H / 2;
      ctx.save();
      ctx.translate(-cx, -cy);
      World.drawGround(ctx, { x: cx, y: cy }, this.W, this.H);
      for (const d of World.propsInView({ x: cx, y: cy }, this.W, this.H)) d.draw(ctx);
      ctx.restore();
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

    // Flat layer: corpses then pickups.
    for (const c of this.corpses) c.draw(ctx);
    for (const p of this.pickups) p.draw(ctx);

    // Y-sorted tall layer: props + all actors.
    const drawables = World.propsInView(cam, this.W, this.H);
    for (const e of this.enemies) drawables.push({ y: e.y, draw: c => e.draw(c) });
    for (const m of this.minions) drawables.push({ y: m.y, draw: c => m.draw(c) });
    if (!this.player.dead) drawables.push({ y: this.player.y, draw: c => this.player.draw(c) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    for (const pr of this.projectiles) pr.draw(ctx);
    Particles.draw(ctx);

    ctx.restore();

    ctx.drawImage(this.vignette, 0, 0);

    // Low-health heartbeat.
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
