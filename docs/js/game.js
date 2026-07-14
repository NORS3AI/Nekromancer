'use strict';
// ---------------------------------------------------------------------------
// Adventure flow: title → camp → waypoint map → land (dungeon crawl:
// fight through packs, loot chests, touch shrines, slay the bounty boss,
// take the portal home) → camp. The Hero persists across everything.
// ---------------------------------------------------------------------------

// The "ONWARD" linked-map chain gets 1.2× deadlier per dive and bottoms out
// after this many dives (the deepest floor has no further exit — turn back).
const MAX_LINK_DEPTH = 12;
// Per-depth combat multiplier for "ONWARD" dives (owner-tuned). Index = depth;
// applied to monster HP, damage and XP on top of the difficulty tier. Depth 12
// is a brutal 40× the surface.
const DEPTH_MULT = [1, 2, 3, 4, 6, 8, 10, 13, 16, 19, 25, 30, 40];

// Camera view modes. BIRD'S EYE is the classic straight-down view (zoom 1, no
// tilt). TOP DOWN is a closer, Diablo-3-style angle: zoomed in for a more
// personal feel with the monsters/bosses, plus a gentle vertical foreshorten
// that fakes a tilted-down camera. Tunable.
const TOPDOWN_ZOOM = 1.4;
const TOPDOWN_TILT = 0.66;   // ground foreshorten ratio (vertical/horizontal); sprites stay upright

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
  linkDepth: 0,           // how many "ONWARD" dives deep — difficulty per DEPTH_MULT (cap MAX_LINK_DEPTH)
  onwardSealed: false,    // once a boss is slain in ANY deeper map, no more diving ONWARD until you're back on the original map
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

  // Global UI font size (Settings ▸ Font size, 8–22). Every `ctx.font = 'Npx …'`
  // has its px multiplied by fontSize/13 so ALL text scales together. Default 13
  // → scale 1 (skipped for zero overhead); only a changed size pays the regex.
  installFontScale(ctx) {
    const desc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    if (!desc || !desc.set || !desc.get) return;
    Object.defineProperty(ctx, 'font', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) {
        const fs = (typeof Settings !== 'undefined' && Settings.g && Settings.g.fontSize) || 13;
        if (fs === 13) { desc.set.call(this, v); return; }
        const scale = fs / 13;
        desc.set.call(this, String(v).replace(/(\d+(?:\.\d+)?)px/,
          (m, n) => (Math.round(parseFloat(n) * scale * 10) / 10) + 'px'));
      }
    });
  },

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.installFontScale(this.ctx);
    window.addEventListener('resize', () => this.resize());
    // Entering/leaving fullscreen changes the viewport → re-fit the canvas.
    document.addEventListener('fullscreenchange', () => this.resize());
    document.addEventListener('webkitfullscreenchange', () => this.resize());
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

  // ---- Fullscreen (hide the mobile address bar / browser chrome) ----
  // Works on Android Chrome/Firefox and desktop, AND on iOS browsers that expose
  // the Fullscreen API — notably Orion and Blink/Chromium builds (plain iOS/iPad
  // Safari does not, so the toggle stays hidden there). Some iOS WebKit browsers
  // only allow ELEMENT-level fullscreen, so we fall back to the game canvas when
  // the documentElement can't. requestFullscreen must run inside a user gesture.
  _fsRequest(el) {
    if (!el) return null;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    return fn ? fn.bind(el) : null;
  },
  fullscreenEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  },
  fullscreenSupported() {
    // 1) The API is advertised (Android/desktop, iPad Safari, Blink on iOS)…
    if (document.fullscreenEnabled || document.webkitFullscreenEnabled ||
        this._fsRequest(document.documentElement) || this._fsRequest(this.canvas)) return true;
    // 2) …or it's a touch device (phone/tablet). Some iOS browsers — Orion in
    // particular — support fullscreen without advertising the API on the elements
    // we probe, so we still SHOW the toggle on any touch device and let the tap
    // attempt it (toggleFullscreen explains gracefully if the browser refuses).
    return (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
  },
  toggleFullscreen() {
    try {
      if (!this.fullscreenEl()) {
        // Prefer the whole page; fall back to the canvas for element-only iOS WebKit.
        const el = (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)
          ? document.documentElement : this.canvas;
        let r;
        if (el && el.requestFullscreen) r = el.requestFullscreen({ navigationUI: 'hide' });
        else if (el && el.webkitRequestFullscreen) r = el.webkitRequestFullscreen();
        else {
          UI.toast('This browser blocks full screen for web pages — Add to Home Screen for a chrome-free launch', '#ffd76a');
          AudioSys.sfx('denied');
          return;
        }
        if (r && r.catch) r.catch(() => {});
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    } catch (e) { /* browser refused — ignore */ }
  },

  // Combat multiplier from diving "ONWARD" — 1.2× compounding per linked-map dive.
  depthMul() {
    return DEPTH_MULT[clamp(this.linkDepth || 0, 0, MAX_LINK_DEPTH)];
  },

  // ---- Camera view mode (Bird's Eye vs Top Down) ----
  topDown() {
    return typeof Settings !== 'undefined' && Settings.g && Settings.g.viewMode === 'topdown';
  },
  viewZoom() { return this.topDown() ? TOPDOWN_ZOOM : 1; },
  viewTilt() { return this.topDown() ? TOPDOWN_TILT : 1; },
  // Set up the world-space transform (zoom + vertical tilt about the screen
  // centre). Bird's Eye reduces to the plain camera translate.
  applyWorldTransform(ctx, cam) {
    const Z = this.viewZoom(), TY = this.viewTilt();
    if (Z === 1 && TY === 1) { ctx.translate(-cam.x, -cam.y); return; }
    ctx.translate(this.W / 2, this.H / 2);
    ctx.scale(Z, Z * TY);
    ctx.translate(-(cam.x + this.W / 2), -(cam.y + this.H / 2));
  },
  // World → screen for HUD-layer overlays (torch light, fog, objective chevron)
  // and top-down sprite billboarding. Pass `cam` to include screenshake.
  worldToScreen(wx, wy, cam) {
    const Z = this.viewZoom(), TY = this.viewTilt(), c = cam || this.camera;
    if (Z === 1 && TY === 1) return { x: wx - c.x, y: wy - c.y };
    const cx = c.x + this.W / 2, cy = c.y + this.H / 2;
    return { x: (wx - cx) * Z + this.W / 2, y: (wy - cy) * Z * TY + this.H / 2 };
  },
  // Convert a SCREEN-space aim direction (dx,dy) into a WORLD-space angle. Uniform
  // zoom cancels out; only the tilt un-squashes the vertical component so shots go
  // where the player points. Bird's Eye → plain atan2(dy,dx).
  aimWorldAngle(dx, dy) {
    return Math.atan2(dy / this.viewTilt(), dx);
  },
  // The world point the torch light & fog-of-war reveal centre on. In Top Down
  // the hero stands UPRIGHT from its feet, so we lift the light to head height —
  // the head must never sit in the dark (Bird's Eye keeps it at the feet).
  heroLightPoint() {
    const p = this.player;
    if (!p) return { x: 0, y: 0 };
    return { x: p.x, y: p.y - (this.topDown() ? 42 : 0) };
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

  // =========================== WALKABLE TOWN ============================
  // NEW HAVEN — the owner's hand-drawn town, walked for real. Buildings are
  // solid (invisible blockers over the painting); standing at a doorway shows an
  // ENTER button where the primary skill sits — pressing it walks you inside
  // (opens that shop's screen); the same button flips to EXIT while inside.
  // Blue waypoint = bounties / acts / adventure · purple = rifts / greater
  // rifts / seasons. A town portal from the wilds arrives HERE (no more menu).

  // (named rollVendorStock — NOT merchantStock — because Screens.merchant caches
  //  its stock array on Game.merchantStock and would clobber a method named that)
  rollVendorStock(slots, opts = {}) {
    const mLvl = Math.max(1, (Hero.level || 1) + (Hero.difficulty || 0) * 3);
    const stock = [];
    const n = opts.count || 6;
    for (let i = 0; i < n; i++) {
      const slot = pick(slots);
      const boost = (opts.boost || 0) + (i === 0 ? 0.35 : (i >= n - 2 ? -0.2 : 0));
      const item = Items.generate(mLvl + (i === 0 ? 2 : 0), boost, slot);
      stock.push({ item, price: Math.round((40 + Items.score(item) * 1.4) * (1 + item.rarity * 0.9)), sold: false });
    }
    return stock;
  },

  // Interaction pads + collision boxes traced over the New Haven painting
  // (docs/art/town/newhaven.png, image-pixel coords).
  //   padX, padY, padR,  blockerCX,CY,W,H,  label, icon, color, kind[, slots, boost]
  TOWN_STATIONS: [
    [435, 395, 60,   420, 260, 240, 220, 'Jeweler',        '◆', '#4ecbe0', 'jeweler'],
    [720, 375, 60,   745, 240, 180, 190, 'Mystic',         '✦', '#b06adf', 'mystic'],
    [305, 745, 60,   250, 650, 210, 150, 'Blacksmith',     '⚒', '#ffb43a', 'smith'],
    [835, 725, 60,   885, 615, 180, 130, "Horadric's Cube", '◈', '#ff5a4a', 'cube'],
    [150, 485, 55,    95, 415, 180, 110, 'Weapons',        '⚔', '#e0724a', 'vendor', ['weapon', 'offhand']],
    [435, 955, 60,   370, 860, 230, 160, 'Armor',          '🛡', '#8fb0e8', 'vendor', ['helm', 'chest', 'gloves', 'boots', 'shoulders', 'legs']],
    [1100, 765, 60, 1130, 680, 190, 140, 'Apothecary',     '⚗', '#9fd88a', 'vendor', ['amulet', 'ring1', 'ring2']],
    [790, 945, 60,   800, 855, 230, 150, 'General Goods',  '◉', '#ffd76a', 'vendor', 'all'],
    [610, 1015, 55,  610, 930, 130, 140, 'Stash',          '▤', '#c9bfa8', 'stash'],
    [718, 668, 55,     0, 0, 0, 0, 'Lukus, Bringer of Light', '⚔', '#ffd76a', 'lukus'],         // the knight quest-giver
    [183, 195, 62,     0, 0, 0, 0, 'Expedition Waypoint',  '✧', '#8fd0ff', 'waypoint-blue'],    // bounties · acts · adventure
    [1020, 350, 66,    0, 0, 0, 0, 'Rift Waypoint',        '✧', '#c88bf0', 'waypoint-purple'],  // rifts · greater rifts · seasons
    [585, 1120, 70,    0, 0, 0, 0, 'Return to the Wilds',  '↩', '#8fd0ff', 'gate']              // only while visiting via portal
  ],
  // Scenery blockers with no interaction (fountain, landmarks) PLUS the town's
  // PERIMETER WALLS (owner rule: the painted walls must be solid — the hero was
  // walking out through them into the trees). Axis-aligned boxes traced over
  // the painting; the diagonal south-east rampart is stepped. The only opening
  // is the south gate corridor (x 540–660) where the hero spawns.
  TOWN_SCENERY: [
    { cx: 600, cy: 610, w: 200, h: 150 },      // the central fountain
    { cx: 290, cy: 68, w: 580, h: 136 },       // north wall, west run
    { cx: 690, cy: 55, w: 260, h: 110 },       // north treeline behind the chapel
    { cx: 1027, cy: 75, w: 454, h: 150 },      // north wall, east run (and the water beyond)
    { cx: 28, cy: 525, w: 56, h: 830 },        // west wall
    { cx: 120, cy: 1097, w: 240, h: 314 },     // south-west tents & treeline
    { cx: 390, cy: 1190, w: 300, h: 130 },     // south wall, west of the gate
    { cx: 840, cy: 1177, w: 360, h: 154 },     // south wall, east of the gate (market tents)
    { cx: 1122, cy: 1147, w: 264, h: 214 },    // south-east corner woods
    { cx: 1157, cy: 980, w: 194, h: 160 },     // south-east rampart, lower step
    { cx: 1192, cy: 840, w: 124, h: 160 },     // south-east rampart, upper step
    { cx: 1217, cy: 630, w: 74, h: 300 },      // east wall
    { cx: 1240, cy: 320, w: 30, h: 360 }       // east edge beside the pavilion
  ],
  ALL_SLOTS: ['weapon', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'shoulders', 'legs', 'amulet', 'ring1', 'ring2'],

  buildTown() {
    const S = 1254;
    if (!this.townImg) { const img = new Image(); img.src = 'art/town/newhaven.png?v=' + (typeof BUILD !== 'undefined' ? BUILD : '1'); this.townImg = img; }
    const interacts = [], blockers = [];
    const vendors = [];
    const mkVendor = (name, flavor, slots, boost) => {
      const sl = slots === 'all' ? this.ALL_SLOTS : slots;
      const o = { name: name.toUpperCase(), flavor, stock: this.rollVendorStock(sl, { boost: boost || 0 }),
                  slots: sl, boost: boost || 0, lvl: Hero.level, t: this.time };
      vendors.push(o);
      return () => { UI.open('vendor'); UI.sel.vendor = o; AudioSys.sfx('gold'); };
    };
    const FLAVOR = {
      Weapons: '"Blades for the brave — and the doomed."',
      Armor: '"Good steel between you and the grave."',
      Apothecary: '"Charms, rings and little miracles."',
      'General Goods': '"A bit of everything, friend."'
    };
    for (const s of this.TOWN_STATIONS) {
      const [px, py, pr, bx, by, bw, bh, label, icon, color, kind, slots, boost] = s;
      let open, cond;
      if (kind === 'vendor') open = mkVendor(label, FLAVOR[label] || '', slots, boost);
      else if (kind === 'waypoint-blue') open = () => { UI.open('wilds'); UI.sel.wpFilter = 'blue'; };
      else if (kind === 'waypoint-purple') open = () => { UI.open('wilds'); UI.sel.wpFilter = 'purple'; };
      else if (kind === 'gate') { open = () => this.returnToWilds(); cond = () => !!this.townPortalReturn; }
      else if (kind === 'cube') { open = () => UI.open('cube'); cond = () => Hero.hasCube; }
      else open = () => UI.open(kind);
      interacts.push({ x: px, y: py, r: pr, label, icon, color, open, cond, kind });
      if (bw > 0) blockers.push({ cx: bx, cy: by, w: bw, h: bh });
    }
    for (const b of this.TOWN_SCENERY) blockers.push(b);
    this.town = { W: S, H: S, spawn: { x: 555, y: 1075 }, interacts, blockers, vendors };
  },

  enterTown() {
    if (!this.town) this.buildTown();
    const t = this.town;
    // Vendors RESTOCK when you return a level (or 10+ minutes) later — no more
    // level-20 goods for a level-70 hero, and bought-out shelves refill.
    for (const v of (t.vendors || [])) {
      if (v.lvl !== Hero.level || this.time - v.t > 600) {
        v.stock = this.rollVendorStock(v.slots, { boost: v.boost });
        v.lvl = Hero.level; v.t = this.time;
      }
    }
    if (!this.player) { this.player = new Player(t.spawn.x, t.spawn.y); if (typeof Items !== 'undefined') Items.apply(); }
    this.player.x = t.spawn.x; this.player.y = t.spawn.y;
    this.player.dead = false; this.player.facing = -Math.PI / 2; this.player.moving = false;
    this.state = 'town';
    this.townPrompt = null;
    UI.close();
    this.camera.x = clamp(this.player.x - this.W / 2, 0, Math.max(0, t.W - this.W));
    this.camera.y = clamp(this.player.y - this.H / 2, 0, Math.max(0, t.H - this.H));
    AudioSys.sfx('portal');
    Hero.save();
  },

  // Stepping through a wilds town portal arrives IN New Haven (no menu). The
  // run is left paused in memory; the gate's RETURN button resumes it exactly
  // where you left off (and collapses the portal + starts its cooldown).
  enterTownFromPortal() {
    const p = this.player;
    this.townPortalReturn = { x: p.x, y: p.y, hp: p.hp, essence: p.essence };
    this.enterTown();
    UI.toast('Welcome to New Haven — the gate leads back to your fight', '#8fd0ff');
  },

  returnToWilds() {
    const r = this.townPortalReturn;
    if (!r) return;
    this.townPortalReturn = null;
    const p = this.player;
    p.x = r.x; p.y = r.y; p.moving = false;
    this.state = 'playing';
    this.returnFromTownPortal();   // collapse the portal + 30s cooldown
    AudioSys.sfx('portal');
  },

  townBlocked(x, y) {
    for (const b of this.town.blockers) {
      const hw = b.w / 2, hh = b.h / 2;
      if (x > b.cx - hw && x < b.cx + hw && y > b.cy - hh && y < b.cy + hh) return true;
    }
    return false;
  },

  updateTown(dt) {
    Particles.update(dt);
    this.updatePet(dt);
    if (UI.screen) return;            // a shop/menu is open — walking is paused
    const t = this.town, p = this.player;
    const spd = 210;
    const mx = Input.move.x, my = Input.move.y;
    p.moving = (mx !== 0 || my !== 0);
    if (p.moving) {
      const nx = p.x + mx * spd * dt, ny = p.y + my * spd * dt;
      if (!this.townBlocked(nx, p.y)) p.x = nx;
      if (!this.townBlocked(p.x, ny)) p.y = ny;
      p.x = clamp(p.x, 55, t.W - 55);
      p.y = clamp(p.y, 125, t.H - 95);
      p.facing = lerpAngle(p.facing, Math.atan2(my, mx), Math.min(1, 14 * dt));
      p.anim += dt * 7;
    }
    this.camera.x = clamp(p.x - this.W / 2, 0, Math.max(0, t.W - this.W));
    this.camera.y = clamp(p.y - this.H / 2, 0, Math.max(0, t.H - this.H));

    // NO auto-open: standing near a doorway only arms the ENTER button
    // (UI.drawTownEnter); Game.townEnter() fires it.
    let prompt = null, best = 1e9;
    for (const it of t.interacts) {
      if (it.cond && !it.cond()) continue;
      const d = dist(p.x, p.y, it.x, it.y);
      if (d < it.r && d < best) { best = d; prompt = it; }
    }
    this.townPrompt = prompt;
  },

  // The ENTER/EXIT action (bottom-right button, or the primary-attack key).
  townEnter() {
    if (this.state !== 'town') return;
    if (UI.screen) { UI.closeAction()(); AudioSys.sfx('gold'); return; }   // EXIT the building
    const it = this.townPrompt;
    if (!it || (it.cond && !it.cond())) return;
    it.open();
    AudioSys.sfx('gold');
  },

  drawTown(ctx) {
    const t = this.town; if (!t) return;
    const cam = this.camera, p = this.player;
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    // The owner's hand-drawn town map, blitting only the visible slice.
    const img = this.townImg;
    if (img && img.complete && img.naturalWidth) {
      const sx = clamp(cam.x, 0, t.W), sy = clamp(cam.y, 0, t.H);
      const sw = Math.min(this.W, t.W - sx), sh = Math.min(this.H, t.H - sy);
      if (sw > 0 && sh > 0) ctx.drawImage(img, sx, sy, sw, sh, sx, sy, sw, sh);
    } else {
      ctx.fillStyle = '#171320'; ctx.fillRect(cam.x, cam.y, this.W, this.H);
    }

    // Lukus, Bringer of Light — the painted knight at his post by the plaza,
    // with a golden ! when he has work for you (or ✓ when a quest is done).
    // Drawn a step NORTH of his talk-pad so the hero stands before him, not on him.
    this.drawLukus(ctx, 718, 640);

    // The hero (and their pet) walk on top of the map. (No pad circles — the
    // doorway prompt lives on the ENTER button instead, owner rule.)
    if (this.pet) this.drawPetSprite(ctx);
    p.draw(ctx);

    // Floating name plates over each interactable — hidden while a menu is
    // open so they don't ghost through the dimmed backdrop (owner screenshot).
    if (!UI.screen) {
      for (const it of t.interacts) {
        if (it.cond && !it.cond()) continue;
        this.drawTownPlate(ctx, it, this.townPrompt === it);
      }
    }
    ctx.restore();

    // The street HUD only while actually on the street — behind an open menu
    // the town title just bled through the dim (owner screenshot).
    if (!UI.screen) this.drawTownHud(ctx);
  },

  drawTownPlate(ctx, it, on) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Georgia';
    const txt = it.icon + '  ' + it.label;
    const w = ctx.measureText(txt).width + 20;
    const y = it.y - 92;
    ctx.globalAlpha = on ? 1 : 0.82;
    ctx.fillStyle = 'rgba(12,9,16,0.82)';
    rr(ctx, it.x - w / 2, y - 12, w, 22, 6); ctx.fill();
    ctx.strokeStyle = it.color; ctx.lineWidth = on ? 1.8 : 1;
    rr(ctx, it.x - w / 2, y - 12, w, 22, 6); ctx.stroke();
    ctx.fillStyle = it.color;
    ctx.fillText(txt, it.x, y);
    ctx.globalAlpha = 1;
  },

  // Just the town name — no gold readout, no bottom legend (owner rule: the
  // explanatory grey text was unnecessary; the name plates already say it all).
  drawTownHud(ctx) {
    const s = (UI.safe || { top: 0, left: 0, right: 0 });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('NEW HAVEN', this.W / 2, 22 + s.top);
  },

  // ---- Lukus, Bringer of Light — the OWNER'S PAINTED KNIGHT, shrunk onto the
  // town map as his standing model. Five moods live in docs/art/npc/
  // (helmed · idle · smile · frown · angry); the town uses HELMED, the dialog
  // screen uses the bare-faced moods.
  lukusArt: {},
  lukusImg(mood) {
    let img = this.lukusArt[mood];
    if (!img) {
      img = new Image();
      img.src = 'art/npc/lukus_' + mood + '.png?v=' + (typeof BUILD !== 'undefined' ? BUILD : '1');
      this.lukusArt[mood] = img;
    }
    return img;
  },
  // The paintings sit on solid black — key it out once into a cached canvas so
  // the knight stands cleanly on the cobbles. If pixel readback is unavailable
  // (file:// testing taints the canvas), fall back to 'screen' blending.
  lukusCut: {},
  lukusSprite(mood) {
    if (this.lukusCut[mood]) return this.lukusCut[mood];
    const img = this.lukusImg(mood);
    if (!img.complete || !img.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    try {
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = Math.max(px[i], px[i + 1], px[i + 2]);
        if (l < 26) px[i + 3] = Math.max(0, (l - 10) * 16);   // near-black → transparent
      }
      g.putImageData(d, 0, 0);
    } catch (e) { c.screenBlend = true; }
    this.lukusCut[mood] = c;
    return c;
  },

  drawLukus(ctx, x, y) {
    const bob = Math.sin(this.time * 1.6) * 1.4;
    const spr = this.lukusSprite('helmed');
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 6, 0, 0, TAU); ctx.fill();
    if (spr) {
      const h = 124, w = h * (spr.width / spr.height);
      // A faint warm halo so the dark armor reads against the dark cobbles.
      ctx.fillStyle = 'rgba(216,180,74,0.10)';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.5, h * 0.5, 0, 0, TAU); ctx.fill();
      if (spr.screenBlend) ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(spr, -w / 2, -h + 4 - bob, w, h);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // Art not loaded yet — a simple stand-in silhouette.
      ctx.fillStyle = '#8f96a3'; rr(ctx, -9, -28 - bob, 18, 26, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -34 - bob, 7, 0, TAU); ctx.fill();
    }
    // quest marker: ✓ = a journal quest is ready to turn in · ! = Lukus has
    // work to hand out (an offer exists and the 7-slot journal has room)
    let mark = null, col = '#ffd76a';
    if (typeof QUEST_LINE !== 'undefined' && Hero.questProgress) {
      if ((Hero.journal || []).some(e => Hero.questProgress(e).done)) { mark = '✓'; col = '#4ade80'; }
      else if (Hero.questOffer() >= 0 && (Hero.journal || []).length < QUEST_JOURNAL_MAX) mark = '!';
    }
    if (mark) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 17px Georgia'; ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.fillText(mark, 0, -124 + Math.sin(this.time * 3) * 2);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  // ------------------------------- cosmetic pet -------------------------------
  // A little companion (Mystic ▸ Pets) that trails the hero in town and the
  // wilds. Pure cosmetic: no combat, no collision.
  updatePet(dt) {
    if (!Hero.pet || !PETS[Hero.pet] || !this.player) { this.pet = null; return; }
    const p = this.player;
    if (!this.pet || this.pet.id !== Hero.pet) {
      this.pet = { id: Hero.pet, x: p.x - 40, y: p.y + 10, bob: 0 };
    }
    const pet = this.pet;
    pet.bob += dt;
    // Heel position: behind-left of the hero's facing.
    const a = p.facing + 2.6;
    const tx = p.x + Math.cos(a) * 44, ty = p.y + Math.sin(a) * 44;
    const d = dist(pet.x, pet.y, tx, ty);
    if (d > 700) { pet.x = tx; pet.y = ty; }              // teleport if left behind
    else if (d > 6) {
      const sp = Math.min(d * 5, 320) * dt;
      const an = angleTo(pet.x, pet.y, tx, ty);
      pet.x += Math.cos(an) * sp; pet.y += Math.sin(an) * sp;
    }
  },

  drawPetSprite(ctx) {
    const pet = this.pet; if (!pet) return;
    const bob = Math.sin(pet.bob * 3) * 3;
    ctx.save();
    ctx.translate(pet.x, pet.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 2, 9, 3.5, 0, 0, TAU); ctx.fill();
    if (pet.id === 'skullWisp') {
      ctx.translate(0, -14 + bob);
      ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#e8e0cc'; ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b1310';
      ctx.beginPath(); ctx.arc(-2.2, -1, 1.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.2, -1, 1.6, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(111,247,195,0.5)';
      ctx.beginPath(); ctx.arc(0, 7, 3, 0, TAU); ctx.fill();   // trailing wisp
    } else if (pet.id === 'boneRaven') {
      ctx.translate(0, -10 + bob * 0.6);
      ctx.fillStyle = '#23202b';
      ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, 0, 0, TAU); ctx.fill();          // body
      ctx.beginPath(); ctx.arc(6, -3, 3.2, 0, TAU); ctx.fill();                    // head
      ctx.fillStyle = '#c9bfa8'; ctx.beginPath();
      ctx.moveTo(9, -3); ctx.lineTo(13, -2); ctx.lineTo(9, -1); ctx.closePath(); ctx.fill();  // beak
      const flap = Math.sin(pet.bob * 8) * 3;
      ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-7, -8 - flap, -12, -4 - flap); ctx.stroke();
      ctx.fillStyle = '#e04a5a'; ctx.beginPath(); ctx.arc(6.6, -3.6, 0.8, 0, TAU); ctx.fill(); // eye
    } else {   // cryptCat
      ctx.translate(0, -6);
      ctx.fillStyle = '#5a5560';
      ctx.beginPath(); ctx.ellipse(0, -3, 8, 5, 0, 0, TAU); ctx.fill();             // body
      ctx.beginPath(); ctx.arc(7, -8, 4, 0, TAU); ctx.fill();                       // head
      ctx.beginPath(); ctx.moveTo(4.6, -11); ctx.lineTo(5.6, -14.5); ctx.lineTo(7.2, -11.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7.6, -11.6); ctx.lineTo(9.4, -14.2); ctx.lineTo(10, -10.8); ctx.closePath(); ctx.fill();
      const swish = Math.sin(pet.bob * 2.4) * 4;
      ctx.strokeStyle = '#5a5560'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-7, -4); ctx.quadraticCurveTo(-13, -8 + swish, -15, -14 + swish); ctx.stroke();
      ctx.fillStyle = '#9adf8f';
      ctx.beginPath(); ctx.arc(6, -8.6, 0.9, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(8.6, -8.6, 0.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
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
    this.townPortalReturn = null;   // starting a NEW run invalidates a pending portal return
    this.mapStack = [];        // a new area starts a fresh backtrack chain
    this.linkDepth = 0;        // …at surface difficulty (ONWARD dives raise it)
    this.onwardSealed = false; // …with diving re-enabled (fresh original map)
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

    // Auto-summon: Command Skeletons / Command Golem raise their army the moment
    // you enter a land (the skill BUTTON is now purely the rune command). Any who
    // fall are re-raised over time by maintainCommandMinions().
    const pp = this.player;
    if (Hero.loadout && Hero.loadout.includes('commandSkeletons')) {
      for (let i = 0; i < 7; i++) {
        const a = rand(TAU), d = rand(38, 60);
        this.minions.push(new Minion(pp.x + Math.cos(a) * d, pp.y + Math.sin(a) * d, 'skeleton'));
      }
    }
    if (Hero.loadout && Hero.loadout.includes('commandGolem')) {
      const a = rand(TAU);
      this.minions.push(new Minion(pp.x + Math.cos(a) * 52, pp.y + Math.sin(a) * 52, 'golem'));
    }
    this._skelT = 0; this._golemT = 0;

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
      World.linksClosed = true;   // seal the entrance/exit — the Guardian must be faced here
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

  // Keep the auto-summoned army topped up while Command Skeletons / Command
  // Golem are slotted: skeletons return one at a time (or a full squad after a
  // wipe), the golem reforms a couple seconds after it falls. Summoning is free
  // and automatic — the skill button only issues the rune command.
  maintainCommandMinions(dt) {
    const p = this.player;
    if (!p || p.dead || !Hero.loadout) return;
    if (Hero.loadout.includes('commandSkeletons')) {
      let have = 0;
      for (const m of this.minions) if (m.kind === 'skeleton' && !m.dead) have++;
      if (have < 7) {
        this._skelT = (this._skelT || 0) - dt;
        if (have === 0 || this._skelT <= 0) {
          this._skelT = 0.7;
          const n = have === 0 ? 7 : 1;   // instant squad after a wipe, else trickle
          for (let i = 0; i < n; i++) {
            const a = rand(TAU), d = rand(40, 62);
            const m = new Minion(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 'skeleton');
            this.minions.push(m); fxSummon(m.x, m.y);
          }
        }
      }
    }
    if (Hero.loadout.includes('commandGolem')) {
      let alive = false;
      for (const m of this.minions) if (m.kind === 'golem' && !m.dead) { alive = true; break; }
      if (!alive) {
        this._golemT = (this._golemT || 0) - dt;
        if (this._golemT <= 0) {
          this._golemT = 2.5;
          const a = rand(TAU);
          this.minions.push(new Minion(p.x + Math.cos(a) * 52, p.y + Math.sin(a) * 52, 'golem'));
          fxSummon(p.x, p.y);
        }
      }
    }
  },

  onBossDead(boss) {
    this.bossDead = true;
    World.portal = { x: boss.x, y: boss.y };
    World.linksClosed = true;   // the map's boss falls → its entrance/exit/cave seal
    // On a LINKED sub-map (a cave or an ONWARD floor), the boss falling just opens
    // the way BACK to the parent map — skip the descend/bounty/completion flow.
    if (this.linkedMap && this.mapStack.length && !this.riftMode) {
      // Slaying a deeper boss seals the ONWARD path: no diving deeper anywhere
      // until you climb all the way back to the original map (only BACK stays open).
      this.onwardSealed = true;
      this.grantDepthCache(boss);   // depth-scaled loot (Depth 12 = 6× a Horadric cache)
      fxNova(boss.x, boss.y, 220);
      AudioSys.sfx('portal');
      Particles.shake(8);
      this.showBanner('THE WAY OUT OPENS', boss.name + ' falls — climb back; the way deeper is sealed', 3.0);
      return;
    }
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
      // Key drops per tier: Normal Rift Guardians ALWAYS drop 1–3 Nephalem Rift
      // Keys (guaranteed, owner rule); Nephalem (greater) Guardians drop 0–1
      // Master Nephalem Rift Keys.
      if (kind === 'normal') {
        const n = randInt(1, 3);
        this.riftKeysDropped = n;
        Hero.riftKeys += n; UI.toast('◈ ' + n + ' Nephalem Rift Key' + (n > 1 ? 's' : '') + '! (' + Hero.riftKeys + ' held)', '#b06adf');
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
        // Seasons ALWAYS drop one of the six set pieces — duplicates are fine,
        // chasing better rolls IS the ARPG loop (owner rule).
        const sp = new Pickup(boss.x, boss.y, 'item');
        sp.item = Items.generateSetPiece(mLvl);
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
        // The Act's final boss falls. Its signature legendary is granted in the
        // Act cache (see completeZone) so it shows on the ACT COMPLETE screen and
        // can't be missed — step through the portal to claim it.
        this.showBanner('THE ACT ' + (this.storyAct || 1) + ' BOSS FALLS', 'Its grave is yours — step through the portal', 3.6);
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

  // Loot for slaying a boss on a deeper ONWARD floor — scales with depth so that
  // the DEEPEST floor (depth 12) is worth 6× a Horadric cache (owner rule). One
  // "cache unit" ≈ the Horadric Stash: gold + 3 Forgotten Souls + 2 gems. The
  // multiplier is depth/2 → 0.5× at depth 1 up to 6× at depth 12.
  grantDepthCache(boss) {
    const depth = this.linkDepth || 0;
    if (depth < 1) return;
    const diff = DIFFICULTIES[Hero.difficulty];
    const mLvl = this.monsterLevel();
    const cacheMul = depth / 2;                       // depth 12 → 6×
    const unitGold = Math.round((500 + mLvl * 70) * diff.reward);
    const totalGold = Math.round(unitGold * cacheMul);
    const souls = Math.round(3 * cacheMul);
    const gems = Math.round(2 * cacheMul);
    // Scatter the gold in piles around the boss.
    const piles = clamp(Math.round(cacheMul * 2), 2, 16);
    for (let i = 0; i < piles; i++) {
      const g = new Pickup(boss.x + rand(-46, 46), boss.y + rand(-46, 46), 'gold');
      g.amount = Math.max(1, Math.round(totalGold / piles));
      this.pickups.push(g);
    }
    // Souls + gems straight to the hero.
    Hero.mats.soul += souls;
    for (let i = 0; i < gems; i++) Hero.gems.push(Items.dropGem());
    // Gear: more, and better, the deeper you are — guaranteed named legendaries deep.
    const items = clamp(Math.round(cacheMul), 1, 6);
    for (let i = 0; i < items; i++) {
      const pu = new Pickup(boss.x + rand(-34, 34), boss.y + rand(-34, 34), 'item');
      pu.item = (depth >= 8 || Math.random() < depth / 14)
        ? Items.generatePowerItem(mLvl, null, true)
        : Items.generate(mLvl + 1, 0.4);
      this.pickups.push(pu);
    }
    Hero.save();
    const mulLabel = (cacheMul % 1 ? cacheMul.toFixed(1) : cacheMul) + '×';
    UI.toast('◈ Depth ' + depth + ' cache — ' + mulLabel + ' Horadric  ·  ' + souls + ' souls · ' + gems + ' gems', '#8fb0e8');
    AudioSys.sfx('setdrop');
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
        // Seasons don't drop keys — they GUARANTEE a set piece (owner rule): one
        // of the six Grace of Inarius pieces, whether or not you own it already.
        const sp = Items.generateSetPiece(mLvl);
        Items.stash(sp);
        lines.push(['✦ ' + sp.name, RARITIES[5].color]);
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
      // The Act's signature legendary — GUARANTEED the first time you finish the
      // Act, 50% every time after (owner rule): Act 1 → Ring of Royal Grandeur ·
      // Act 5 → Bloodtide Blade · Act 10 → Scythe of the Cycle. Shown in the cache.
      const ACT_UNIQUE = { 1: 'royalGrandeur', 5: 'bloodtide', 10: 'cycleScythe' };
      const ukey = ACT_UNIQUE[act];
      if (ukey) {
        Hero.actUniques = Hero.actUniques || {};
        const first = !Hero.actUniques[act];
        if (first || Math.random() < 0.5) {
          const uni = Items.generatePowerItem(mLvl, ukey);
          Items.stash(uni);
          lines.push(['★ ' + uni.name + (first ? '' : '  (lucky!)'), RARITIES[uni.rarity].color]);
          Hero.actUniques[act] = true;
        }
      }
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
        Hero.chestsOpened = (Hero.chestsOpened || 0) + 1;   // Lukus's quest counter
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
      if (this.linkedMap && this.mapStack.length && !this.riftMode) this.goBack();
      else if (this.descend) this.nextStage();
      else if (this.nextBountyPart) this.startBountyPart(this.bountyPart + 1);
      else this.completeZone();
    }
    // Blue town portal: step off then back on to travel to NEW HAVEN itself
    // (no menu — you arrive in the walkable town; the gate brings you back).
    if (World.townPortal) {
      const d = dist(p.x, p.y, World.townPortal.x, World.townPortal.y);
      if (d > 46) this.townPortalNear = false;
      else if (d < 34 && !this.townPortalNear) {
        this.townPortalNear = true;
        this.enterTownFromPortal();
      }
    }
    // Entrance / exit / cave links — walkable portals into OTHER maps, open until
    // this map's boss dies. Step off then back on to travel (linkDebounce gate).
    if (!World.linksClosed && !UI.screen) {
      const near = pt => pt && dist(p.x, p.y, pt.x, pt.y) < 40;
      // Diving ONWARD (exit / cave) is disabled while a deeper boss's seal is in
      // effect — only the BACK entrance works until you reach the original map.
      const onExit = near(World.exit) && !this.onwardSealed;
      const onCave = near(World.cave) && !this.onwardSealed;
      const onEntr = near(World.entrance) && this.mapStack.length > 0;
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
      depth: this.linkDepth || 0,   // remember this map's ONWARD difficulty depth
      returnX: returnPos.x, returnY: returnPos.y
    };
  },

  restoreMap(s) {
    World.restore(s.world);
    this.enemies = s.enemies; this.projectiles = s.projectiles;
    this.corpses = s.corpses; this.pickups = s.pickups; this.telegraphs = s.telegraphs;
    this.fogBuf = s.fogBuf; this.fogStamp = s.fogStamp;
    // Re-derive the fog buffer's 2D context, or the reveal brush would keep
    // erasing into a STALE canvas (the cave's) and this map would never uncover.
    this.fogCtx = this.fogBuf ? this.fogBuf.getContext('2d') : null;
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
    // Preserve RIFT character so cycling through season/rift maps stays a rift
    // (orb progress carries, the Guardian rises when the bar fills on any map).
    return { name: z.name, kind: Math.random() < 0.5 ? 'dungeon' : 'open', mLvl: z.mLvl, monsters: z.monsters,
             biome: z.biome, weather: z.weather, tiles: z.tiles, ground: z.ground, accent: z.accent,
             boss: z.boss, packs: z.packs, rift: z.rift, riftKind: z.riftKind, riftGoal: z.riftGoal };
  },
  caveZone() {
    // A Hidden Cave crawls with foes — TWICE the pack sites the land defines, so
    // it's genuinely full of enemies (they sleep until you're near, D3-style).
    const basePacks = this.zone.packs || 12;
    return { name: 'Hidden Cave', kind: 'dungeon', mLvl: this.zone.mLvl,
             monsters: this.zone.monsters, noLinks: true, cave: true, tiles: 7,
             packs: basePacks * 2,
             boss: MONSTERS.rathma.name };   // the cave's dweller — objective reads this
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
    this.riftMode = !!zone.rift;
    this.riftGoal = zone.riftGoal || this.riftGoal;
    this.guardianUp = false;   // a fresh map: the Guardian isn't up (orb progress carries)
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
    for (const pk of World.packs) spawnPack(pk.x, pk.y, zone.rift ? 0.5 : cave ? 0.3 : 0.18);
    if (cave) {
      // The cave's dweller: Rathma's Chosen — the cave's boss (its death opens the
      // way out). mapBoss makes its death fire onBossDead + shows the boss bar.
      this.enemies.push(new Enemy('rathma', World.bossPos.x, World.bossPos.y, { rare: true, mapBoss: true, name: MONSTERS.rathma.name }));
    } else if (zone.rift) {
      // Rift/season linked maps carry NO fixed boss — you fill the orb bar across
      // the chain and the Guardian rises wherever the bar completes.
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
    // Each ONWARD dive is one step deeper and 1.2× deadlier; the run bottoms out
    // at MAX_LINK_DEPTH — the deepest floor spawns with NO onward exit (turn back).
    const newDepth = (this.linkDepth || 0) + 1;
    this.linkDepth = newDepth;
    const atFloor = !cave && newDepth >= MAX_LINK_DEPTH;
    const zone = cave ? this.caveZone() : this.linkedZone();
    if (atFloor) zone.noLinks = true;
    this.loadLinkedMap(zone, cave);
    Particles.ring(this.player.x, this.player.y, 90, cave ? '#b06adf' : '#8fd0ff', 6, 0.5);
    AudioSys.sfx('portal');
    const mul = this.depthMul();
    const sub = cave ? 'Something ancient stirs in the dark'
      : atFloor ? 'DEPTH 12 — the abyss bottoms out. Foes hit 40× harder; no path leads deeper. Turn back.'
      : 'Depth ' + newDepth + ' — foes hit ' + mul + '× harder. The way back stays open.';
    this.showBanner(cave ? 'INTO THE CAVE' : 'DEEPER STILL', sub, 2.6);
  },

  enterCave() { this.goDeeper(true); },

  goBack() {
    if (!this.mapStack.length) return;
    const s = this.mapStack.pop();
    this.restoreMap(s);
    this.linkDepth = s.depth || 0;   // difficulty reverts to the map you step back into
    // Reaching the original map (no longer a linked sub-map) re-opens diving ONWARD.
    if (!this.linkedMap) this.onwardSealed = false;
    this.linkDebounce = true;   // you arrive ON the exit you left — step off to re-arm
    Particles.ring(this.player.x, this.player.y, 90, '#6ff7c3', 6, 0.5);
    AudioSys.sfx('portal');
    const backSub = !this.linkedMap ? 'You surface at the original map — the way deeper reopens'
      : this.onwardSealed ? 'Depth ' + this.linkDepth + ' — climb on; the way deeper stays sealed'
      : 'Depth ' + this.linkDepth + ' — the air lightens as you climb';
    this.showBanner('BACK THE WAY YOU CAME', backSub, 1.8);
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

    if (this.state === 'town') { this.updateTown(dt); return; }
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
    this.updatePet(dt);
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
    this.maintainCommandMinions(dt);
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

    if (this.state === 'town') {
      this.drawTown(ctx);
      ctx.drawImage(this.vignette, 0, 0);
      UI.draw(ctx, this.W, this.H);
      return;
    }

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

    if (this.topDown()) {
      this.drawWorldTopDown(ctx, cam);
    } else {
      // ---- Bird's Eye (original view — untouched) ----
      ctx.save();
      this.applyWorldTransform(ctx, cam);

      World.drawGround(ctx, cam, this.W, this.H);
      this.drawTelegraphs(ctx);

      for (const c of this.corpses) c.draw(ctx);
      for (const p of this.pickups) p.draw(ctx);

      this.drawAimIndicator(ctx);

      const drawables = World.propsInView(cam, this.W, this.H);
      const inView = e => e.x > cam.x - 90 && e.x < cam.x + this.W + 90 && e.y > cam.y - 110 && e.y < cam.y + this.H + 110;
      for (const e of this.enemies) if (inView(e)) drawables.push({ y: e.y, draw: c => e.draw(c) });
      for (const m of this.minions) if (inView(m)) drawables.push({ y: m.y, draw: c => m.draw(c) });
      if (this.pet) drawables.push({ y: this.pet.y, draw: c => this.drawPetSprite(c) });
      if (!this.player.dead) drawables.push({ y: this.player.y, draw: c => this.player.draw(c) });
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.draw(ctx);

      for (const pr of this.projectiles) pr.draw(ctx);
      this.drawPortalCast(ctx);
      Particles.draw(ctx);

      ctx.restore();
    }

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

  // Diablo-3-style Top-Down render: the GROUND (and flat ground FX) is drawn
  // through the foreshortening tilt, but every STANDING sprite — hero, minions,
  // monsters — is billboarded UPRIGHT (uniform zoom, no vertical squash) at its
  // projected, foreshortened foot position. So skeletons stand on two feet on the
  // tilted floor instead of being flattened / floating. Bird's Eye is unaffected.
  drawWorldTopDown(ctx, cam) {
    const Z = this.viewZoom();
    // 1) Ground plane + flat, on-the-floor elements (foreshortened).
    ctx.save();
    this.applyWorldTransform(ctx, cam);
    World.drawGround(ctx, cam, this.W, this.H);
    this.drawTelegraphs(ctx);
    for (const c of this.corpses) c.draw(ctx);
    for (const pk of this.pickups) pk.draw(ctx);
    this.drawAimIndicator(ctx);
    for (const d of World.propsInView(cam, this.W, this.H)) d.draw(ctx);
    ctx.restore();

    // 2) Standing sprites, billboarded upright, painter-sorted back-to-front.
    const inView = e => e.x > cam.x - 240 && e.x < cam.x + this.W + 240 && e.y > cam.y - 320 && e.y < cam.y + this.H + 320;
    const sprites = [];
    for (const e of this.enemies) if (inView(e)) sprites.push(e);
    for (const m of this.minions) if (inView(m)) sprites.push(m);
    if (this.pet) sprites.push({ x: this.pet.x, y: this.pet.y, draw: c => this.drawPetSprite(c) });
    if (!this.player.dead) sprites.push(this.player);
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) {
      const fs = this.worldToScreen(s.x, s.y, cam);   // foreshortened foot on screen
      if (!isFinite(fs.x) || !isFinite(fs.y)) continue;
      ctx.save();
      ctx.translate(fs.x, fs.y);
      ctx.scale(Z, Z);              // upright + zoomed; NO vertical squash on the body
      ctx.translate(-s.x, -s.y);
      s.draw(ctx);
      ctx.restore();
    }

    // 3) Projectiles / channel / particles ride over the foreshortened ground.
    ctx.save();
    this.applyWorldTransform(ctx, cam);
    for (const pr of this.projectiles) pr.draw(ctx);
    this.drawPortalCast(ctx);
    Particles.draw(ctx);
    ctx.restore();
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
    const lp = this.heroLightPoint();
    const ps = this.worldToScreen(lp.x, lp.y);
    const sx = ps.x, sy = ps.y;
    if (!isFinite(sx) || !isFinite(sy)) return;   // never let a bad coord crash the frame
    // Crypts are the true dark; open daylit lands stay bright (the torch just
    // adds a cozy glow there) so the wilds never read as "too dark".
    const dark = this.zone && this.zone.kind === 'dungeon';
    const R = this.lightRadius() * this.viewZoom(); // lit radius (screen px; zoom-scaled)
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
    if (p && !p.dead && isFinite(p.x) && isFinite(p.y)) {
      const fx = this.fogCtx;
      const lp = this.heroLightPoint();
      const bx = lp.x / F, by = lp.y / F, br = this.lightRadius() / F;
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
    // Draw the world-sized fog buffer through the SAME view transform as the
    // world, so it lines up under zoom / tilt (Bird's Eye = plain -cam translate).
    this.applyWorldTransform(ctx, cam);
    ctx.drawImage(this.fogBuf, 0, 0, w * F, h * F);
    ctx.restore();
  }
};

window.addEventListener('load', () => Game.init());
