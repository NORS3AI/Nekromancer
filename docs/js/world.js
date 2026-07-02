'use strict';
// ---------------------------------------------------------------------------
// The lands. Two generators:
//  - 'open'    : wilderness with colliding props, packs scattered across it
//  - 'dungeon' : carved rooms + corridors with real wall collision
// Both produce: spawn point, boss lair, pack positions, chests, shrines,
// breakable urns, fog-of-war exploration grid and a minimap.
// ---------------------------------------------------------------------------

const CELL = 48;

const World = {
  zone: null,
  W: 2600, H: 2600,
  cols: 0, rows: 0,
  walls: null,          // Uint8Array, 1 = solid (dungeon only)
  explored: null,       // Uint8Array fog for the minimap
  props: [],            // colliding decorations (open zones)
  decos: [],            // flat decorations
  objects: [],          // {type:'chest'|'shrine'|'urn'|'vendor', x, y, used}
  breakables: [],       // smashable clutter {type, x, y, r, big, broken, seed}
  packs: [],            // spawn descriptors consumed by Game
  spawn: { x: 0, y: 0 },
  bossPos: { x: 0, y: 0 },
  portal: null,         // {x, y} exit portal once the bounty is done
  pattern: null,
  patternFill: null,

  // ------------------------------------------------------------- generation

  generate(zone) {
    this.zone = zone;
    this.props = [];
    this.decos = [];
    this.objects = [];
    this.breakables = [];
    this.packs = [];
    this.portal = null;
    this.patternFill = null;
    this.makePattern(zone);
    if (zone.kind === 'dungeon') this.genDungeon(zone);
    else this.genOpen(zone);
    this.explored = new Uint8Array(this.cols * this.rows);
  },

  genOpen(zone) {
    this.W = 2600; this.H = 2600;
    this.cols = Math.ceil(this.W / CELL);
    this.rows = Math.ceil(this.H / CELL);
    this.walls = null;

    // Hero enters at the south-west, the bounty waits at the north-east.
    this.spawn = { x: 300, y: this.H - 300 };
    this.bossPos = { x: this.W - rand(280, 420), y: rand(280, 420) };

    const propTypes = ['tomb', 'tomb', 'cross', 'pillar', 'tree', 'obelisk', 'rock'];
    let attempts = 0;
    while (this.props.length < 60 && attempts++ < 900) {
      const x = rand(90, this.W - 90);
      const y = rand(90, this.H - 90);
      if (dist(x, y, this.spawn.x, this.spawn.y) < 260) continue;
      if (dist(x, y, this.bossPos.x, this.bossPos.y) < 260) continue;
      let ok = true;
      for (const p of this.props) if (dist(x, y, p.x, p.y) < 115) { ok = false; break; }
      if (!ok) continue;
      const type = pick(propTypes);
      const r = { tomb: 16, cross: 13, pillar: 19, tree: 15, obelisk: 17, rock: 20 }[type];
      this.props.push({ x, y, r, type, seed: Math.random() });
    }
    const decoTypes = ['skull', 'bones', 'ribcage', 'rubble', 'crack', 'blood', 'moss', 'grass'];
    for (let i = 0; i < 240; i++) {
      this.decos.push({ x: rand(50, this.W - 50), y: rand(50, this.H - 50), type: pick(decoTypes), seed: Math.random() });
    }

    // Monster packs strung between entrance and lair.
    for (let i = 0; i < zone.packs; i++) {
      const pt = this.openPoint(240);
      this.packs.push(pt);
    }
    this.placeObjects(6, 2, 0, () => this.openPoint(200));
    // Graveyard clutter: smash it for gold.
    this.placeBreakables(
      ['gravestone', 'gravestone', 'crypt', 'pot', 'pot', 'urnB', 'bonepile', 'cart'],
      34, () => this.openPoint(120));
  },

  openPoint(minSpawnDist) {
    for (let t = 0; t < 40; t++) {
      const x = rand(160, this.W - 160);
      const y = rand(160, this.H - 160);
      if (dist(x, y, this.spawn.x, this.spawn.y) < minSpawnDist + 300) continue;
      return { x, y };
    }
    return { x: this.W / 2, y: this.H / 2 };
  },

  genDungeon(zone) {
    this.cols = 56; this.rows = 56;
    this.W = this.cols * CELL;
    this.H = this.rows * CELL;
    const walls = new Uint8Array(this.cols * this.rows).fill(1);
    const rooms = [];
    let attempts = 0;
    while (rooms.length < 14 && attempts++ < 300) {
      const w = randInt(5, 10), h = randInt(5, 10);
      const x = randInt(2, this.cols - w - 2), y = randInt(2, this.rows - h - 2);
      let ok = true;
      for (const r of rooms) {
        if (x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) walls[yy * this.cols + xx] = 0;
      }
    }
    // Connect each room to the previous with an L-corridor (width 2).
    const carve = (x, y) => {
      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
          const xx = clamp(x + dx, 1, this.cols - 2);
          const yy = clamp(y + dy, 1, this.rows - 2);
          walls[yy * this.cols + xx] = 0;
        }
      }
    };
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i];
      let x = a.cx, y = a.cy;
      while (x !== b.cx) { carve(x, y); x += Math.sign(b.cx - x); }
      while (y !== b.cy) { carve(x, y); y += Math.sign(b.cy - y); }
      carve(x, y);
    }
    this.walls = walls;

    // Spawn in room 0; the bounty boss lairs in the room farthest from it.
    const start = rooms[0];
    this.spawn = { x: (start.cx + 0.5) * CELL, y: (start.cy + 0.5) * CELL };
    let far = rooms[1], farD = 0;
    for (const r of rooms.slice(1)) {
      const d = dist(r.cx, r.cy, start.cx, start.cy);
      if (d > farD) { farD = d; far = r; }
    }
    this.bossPos = { x: (far.cx + 0.5) * CELL, y: (far.cy + 0.5) * CELL };

    // Packs fill the middle rooms.
    const midRooms = rooms.slice(1).filter(r => r !== far);
    for (let i = 0; i < zone.packs; i++) {
      const r = pick(midRooms.length ? midRooms : rooms);
      this.packs.push({
        x: (r.x + rand(1, r.w - 1)) * CELL,
        y: (r.y + rand(1, r.h - 1)) * CELL
      });
    }
    const roomPoint = () => {
      const r = pick(midRooms.length ? midRooms : rooms);
      return { x: (r.x + rand(1.2, r.w - 1.2)) * CELL, y: (r.y + rand(1.2, r.h - 1.2)) * CELL };
    };
    this.placeObjects(3, 2, 0, roomPoint);
    // Crypt furniture: pots, chairs, tables, bookcases, sarcophagi.
    this.placeBreakables(
      ['pot', 'pot', 'urnB', 'chair', 'chair', 'table', 'bookcase', 'bookcase', 'sarcophagus', 'bonepile'],
      38, roomPoint);

    // Bone piles as decor inside floor cells.
    const decoTypes = ['skull', 'bones', 'ribcage', 'rubble', 'crack'];
    for (let i = 0; i < 130; i++) {
      const pt = roomPoint();
      this.decos.push({ x: pt.x, y: pt.y, type: pick(decoTypes), seed: Math.random() });
    }
  },

  // A wandering merchant with a small, luck-of-the-draw stock.
  vendorStock() {
    const mLvl = (this.zone ? this.zone.mLvl : 1) + (Hero.difficulty || 0) * 6;
    const stock = [];
    for (let i = 0; i < 5; i++) {
      // First slot leans good, the tail leans junk — caveat emptor.
      const boost = i === 0 ? 0.3 : (i >= 3 ? -0.25 : 0);
      const item = Items.generate(mLvl + (i === 0 ? 2 : 0), boost);
      stock.push({
        item,
        price: Math.round((40 + Items.score(item) * 1.4) * (1 + item.rarity * 0.9)),
        sold: false
      });
    }
    return stock;
  },

  // ------------------------------------------------------------ breakables
  // Smashable clutter. `big` pieces block movement until broken; everything
  // shatters to spells, projectiles — and the Inarius bone tornado.

  BREAKABLE_DEFS: {
    pot:         { r: 8,  big: false, mat: 'clay' },
    urnB:        { r: 9,  big: false, mat: 'clay' },
    bonepile:    { r: 9,  big: false, mat: 'bone' },
    chair:       { r: 10, big: false, mat: 'wood' },
    table:       { r: 18, big: true,  mat: 'wood' },
    bookcase:    { r: 16, big: true,  mat: 'wood' },
    cart:        { r: 17, big: true,  mat: 'wood' },
    gravestone:  { r: 13, big: true,  mat: 'stone' },
    sarcophagus: { r: 20, big: true,  mat: 'stone' },
    crypt:       { r: 22, big: true,  mat: 'stone' }
  },

  placeBreakables(kinds, count, pointFn) {
    let attempts = 0;
    while (this.breakables.length < count && attempts++ < count * 8) {
      const pt = pointFn();
      const type = pick(kinds);
      const def = this.BREAKABLE_DEFS[type];
      if (dist(pt.x, pt.y, this.spawn.x, this.spawn.y) < 120) continue;
      if (dist(pt.x, pt.y, this.bossPos.x, this.bossPos.y) < 140) continue;
      let ok = true;
      for (const o of this.objects) if (dist(pt.x, pt.y, o.x, o.y) < 60) { ok = false; break; }
      for (const b of this.breakables) if (dist(pt.x, pt.y, b.x, b.y) < def.r + b.r + 26) { ok = false; break; }
      if (!ok) continue;
      this.breakables.push({ type, x: pt.x, y: pt.y, r: def.r, big: def.big, mat: def.mat, broken: false, seed: Math.random() });
    }
  },

  // Shatter everything within radius. Returns how many broke.
  smash(x, y, radius) {
    let n = 0;
    for (const b of this.breakables) {
      if (b.broken) continue;
      if (dist(x, y, b.x, b.y) < radius + b.r) {
        this.breakOne(b);
        n++;
      }
    }
    return n;
  },

  breakOne(b) {
    b.broken = true;
    const colors = {
      clay: ['#a8674a', '#7a4a34', '#c9885e'],
      wood: ['#8a6f4a', '#5e4a2a', '#4a3a24'],
      stone: ['#5c5569', '#4a4356', '#37313f'],
      bone: ['#e8e0cc', '#c9c0a8', '#a99f86']
    }[b.mat];
    Particles.spawn(b.x, b.y - 6, {
      count: b.big ? 18 : 11, color: colors,
      minSpeed: 40, maxSpeed: b.big ? 240 : 170,
      minLife: 0.25, maxLife: 0.6, minSize: 2, maxSize: 4.5, grav: 320
    });
    if (b.mat === 'wood' && b.type === 'bookcase') {
      // Loose pages flutter out.
      Particles.spawn(b.x, b.y - 14, {
        count: 6, color: ['#e8e0cc', '#d8cfb8'], minSpeed: 20, maxSpeed: 80,
        minLife: 0.5, maxLife: 1.0, grav: 60, minSize: 3, maxSize: 4
      });
    }
    AudioSys.sfx(b.mat === 'clay' ? 'breakPot' : b.mat === 'stone' ? 'breakStone' : b.mat === 'bone' ? 'hit' : 'breakWood');
    if (typeof Game !== 'undefined' && Game.breakLoot) Game.breakLoot(b);
  },

  placeObjects(chests, shrines, urns, pointFn) {
    const vp = pointFn();
    this.objects.push({ type: 'vendor', x: vp.x, y: vp.y, used: false, near: false, seed: Math.random(), stock: this.vendorStock() });
    for (let i = 0; i < chests; i++) {
      const pt = pointFn();
      this.objects.push({ type: 'chest', x: pt.x, y: pt.y, used: false, seed: Math.random() });
    }
    for (let i = 0; i < shrines; i++) {
      const pt = pointFn();
      this.objects.push({ type: 'shrine', x: pt.x, y: pt.y, used: false, seed: Math.random(), buff: pick(['empowered', 'frenzied', 'blessed', 'fortune']) });
    }
    for (let i = 0; i < urns; i++) {
      const pt = pointFn();
      this.objects.push({ type: 'urn', x: pt.x, y: pt.y, used: false, seed: Math.random() });
    }
  },

  makePattern(zone) {
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const x = c.getContext('2d');
    x.fillStyle = zone ? zone.ground : '#16121b';
    x.fillRect(0, 0, 320, 320);
    for (let i = 0; i < 46; i++) {
      const px = rand(320), py = rand(320), r = rand(14, 52);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${randInt(8, 30)},${randInt(6, 24)},${randInt(10, 34)},0.55)`);
      g.addColorStop(1, 'rgba(20,16,26,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
    for (let i = 0; i < 260; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(70,60,82,0.22)' : 'rgba(5,3,8,0.35)';
      x.fillRect(rand(320), rand(320), rand(1, 2.5), rand(1, 2.5));
    }
    x.strokeStyle = 'rgba(8,5,12,0.55)';
    x.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      let px = rand(320), py = rand(320);
      x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 5; s++) { px += rand(-22, 22); py += rand(-22, 22); x.lineTo(px, py); }
      x.stroke();
    }
    this.pattern = c;
  },

  // -------------------------------------------------------------- collision

  isWall(cx, cy) {
    if (!this.walls) return false;
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.walls[cy * this.cols + cx] === 1;
  },

  isFloorAt(x, y) {
    if (x < 30 || y < 30 || x > this.W - 30 || y > this.H - 30) return false;
    if (!this.walls) return true;
    return !this.isWall(Math.floor(x / CELL), Math.floor(y / CELL));
  },

  collide(e) {
    e.x = clamp(e.x, 34, this.W - 34);
    e.y = clamp(e.y, 34, this.H - 34);
    if (this.walls) {
      // Circle vs the 3x3 neighborhood of wall cells.
      const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
      for (let yy = cy - 1; yy <= cy + 1; yy++) {
        for (let xx = cx - 1; xx <= cx + 1; xx++) {
          if (!this.isWall(xx, yy)) continue;
          const bx = clamp(e.x, xx * CELL, (xx + 1) * CELL);
          const by = clamp(e.y, yy * CELL, (yy + 1) * CELL);
          const dx = e.x - bx, dy = e.y - by;
          const d2 = dx * dx + dy * dy;
          if (d2 < e.r * e.r) {
            if (d2 > 0.001) {
              const d = Math.sqrt(d2);
              e.x = bx + dx / d * e.r;
              e.y = by + dy / d * e.r;
            } else {
              e.y = yy * CELL - e.r; // degenerate: push up
            }
          }
        }
      }
    }
    for (const p of this.props) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const min = p.r + e.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.001) {
        const d = Math.sqrt(d2);
        e.x = p.x + dx / d * min;
        e.y = p.y + dy / d * min;
      }
    }
    // Big furniture blocks the way until it's smashed.
    for (const b of this.breakables) {
      if (b.broken || !b.big) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const min = b.r + e.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.001) {
        const d = Math.sqrt(d2);
        e.x = b.x + dx / d * min;
        e.y = b.y + dy / d * min;
      }
    }
  },

  projBlocked(x, y, r) {
    if (this.walls && !this.isFloorAt(x, y)) return true;
    for (const p of this.props) {
      if (dist(x, y, p.x, p.y) < p.r + r - 4) return true;
    }
    return false;
  },

  // Farthest floor point along a direction (Blood Rush passes walls).
  dashPoint(x, y, a, maxD) {
    for (let d = maxD; d > 30; d -= 16) {
      const tx = x + Math.cos(a) * d;
      const ty = y + Math.sin(a) * d;
      if (this.isFloorAt(tx, ty)) return { x: tx, y: ty };
    }
    return { x, y };
  },

  // -------------------------------------------------------------- fog of war

  reveal(x, y) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    const R = 6;
    for (let yy = cy - R; yy <= cy + R; yy++) {
      for (let xx = cx - R; xx <= cx + R; xx++) {
        if (xx < 0 || yy < 0 || xx >= this.cols || yy >= this.rows) continue;
        if ((xx - cx) * (xx - cx) + (yy - cy) * (yy - cy) > R * R) continue;
        this.explored[yy * this.cols + xx] = 1;
      }
    }
  },

  // --------------------------------------------------------------- drawing

  drawGround(ctx, cam, w, h) {
    if (!this.patternFill) this.patternFill = ctx.createPattern(this.pattern, 'repeat');
    ctx.fillStyle = this.patternFill;
    ctx.fillRect(cam.x, cam.y, w, h);

    ctx.fillStyle = '#050308';
    if (cam.x < 0) ctx.fillRect(cam.x, cam.y, -cam.x, h);
    if (cam.y < 0) ctx.fillRect(cam.x, cam.y, w, -cam.y);
    if (cam.x + w > this.W) ctx.fillRect(this.W, cam.y, cam.x + w - this.W, h);
    if (cam.y + h > this.H) ctx.fillRect(cam.x, this.H, w, cam.y + h - this.H);

    if (this.walls) this.drawWalls(ctx, cam, w, h);
    else {
      ctx.strokeStyle = 'rgba(111,247,195,0.10)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, this.W, this.H);
    }

    for (const d of this.decos) {
      if (d.x < cam.x - 60 || d.x > cam.x + w + 60 || d.y < cam.y - 60 || d.y > cam.y + h + 60) continue;
      this.drawDeco(ctx, d);
    }
    // Rubble of things already smashed lies flat on the ground.
    for (const b of this.breakables) {
      if (!b.broken) continue;
      if (b.x < cam.x - 60 || b.x > cam.x + w + 60 || b.y < cam.y - 60 || b.y > cam.y + h + 60) continue;
      this.drawDebris(ctx, b);
    }
  },

  drawDebris(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.seed * TAU);
    const cols = { clay: '#6b4534', wood: '#4a3a24', stone: '#37313f', bone: '#a99f86' };
    ctx.fillStyle = cols[b.mat];
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < (b.big ? 7 : 4); i++) {
      const a = b.seed * 9 + i * 1.83;
      const d = (b.r * 0.7) * ((i % 3) / 3 + 0.3);
      ctx.fillRect(Math.cos(a) * d - 2, Math.sin(a) * d * 0.6 - 1.5, 4 + (i % 3) * 2, 3);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  drawWalls(ctx, cam, w, h) {
    const x0 = clamp(Math.floor(cam.x / CELL) - 1, 0, this.cols - 1);
    const y0 = clamp(Math.floor(cam.y / CELL) - 1, 0, this.rows - 1);
    const x1 = clamp(Math.ceil((cam.x + w) / CELL) + 1, 0, this.cols - 1);
    const y1 = clamp(Math.ceil((cam.y + h) / CELL) + 1, 0, this.rows - 1);
    const accent = this.zone.accent;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!this.isWall(cx, cy)) continue;
        const px = cx * CELL, py = cy * CELL;
        // Solid rock body.
        ctx.fillStyle = '#0b0910';
        ctx.fillRect(px, py, CELL, CELL);
        // Lit top edge where a floor cell lies below (pseudo-depth).
        if (cy + 1 <= this.rows - 1 && !this.isWall(cx, cy + 1)) {
          ctx.fillStyle = accent;
          ctx.fillRect(px, py + CELL - 10, CELL, 10);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(px, py + CELL - 4, CELL, 4);
        }
        if (cy - 1 >= 0 && !this.isWall(cx, cy - 1)) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(px, py, CELL, 5);
        }
        // Brick seams, deterministic per cell.
        const s = hash2(cx, cy);
        if (s > 0.4) {
          ctx.strokeStyle = 'rgba(60,52,74,0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, py + CELL * (0.3 + s * 0.4));
          ctx.lineTo(px + CELL, py + CELL * (0.3 + s * 0.4));
          ctx.stroke();
        }
      }
    }
  },

  drawDeco(ctx, d) {
    const s = d.seed;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(s * TAU);
    switch (d.type) {
      case 'skull':
        ctx.fillStyle = '#b3aa92';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        ctx.fillRect(-3.5, 3, 7, 3);
        ctx.fillStyle = '#16121b';
        ctx.fillRect(-3, -1.5, 2.2, 2.5);
        ctx.fillRect(1, -1.5, 2.2, 2.5);
        break;
      case 'bones':
        ctx.strokeStyle = '#a99f86';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(4, 6); ctx.stroke();
        break;
      case 'ribcage':
        ctx.strokeStyle = '#9c9279';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, i * 5 - 8, 8 - i, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
        break;
      case 'rubble':
        ctx.fillStyle = '#2b2433';
        for (let i = 0; i < 5; i++) {
          const a = s * 10 + i * 1.7;
          ctx.fillRect(Math.cos(a) * 8, Math.sin(a) * 8, 3 + i % 3, 3 + (i + 1) % 3);
        }
        break;
      case 'crack':
        ctx.strokeStyle = 'rgba(6,4,10,0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-14, 0);
        ctx.lineTo(-5, 3 - s * 6); ctx.lineTo(4, s * 6 - 3); ctx.lineTo(14, 0);
        ctx.stroke();
        break;
      case 'blood':
        ctx.fillStyle = 'rgba(90,13,23,0.5)';
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(9 + s * 5, 4, 3, 0, TAU); ctx.fill();
        break;
      case 'moss':
        ctx.fillStyle = 'rgba(44,66,48,0.4)';
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 9, 0, 0, TAU); ctx.fill();
        break;
      case 'grass':
        ctx.strokeStyle = 'rgba(74,84,58,0.65)';
        ctx.lineWidth = 1.5;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 4, 3);
          ctx.quadraticCurveTo(i * 4 + 2, -4, i * 5, -8);
          ctx.stroke();
        }
        break;
    }
    ctx.restore();
  },

  // Tall things (props + interactables + breakables + portal) for the y-sort.
  propsInView(cam, w, h) {
    const out = [];
    for (const p of this.props) {
      if (p.x < cam.x - 80 || p.x > cam.x + w + 80 || p.y < cam.y - 120 || p.y > cam.y + h + 120) continue;
      out.push({ y: p.y, draw: ctx => this.drawProp(ctx, p) });
    }
    for (const b of this.breakables) {
      if (b.broken) continue;
      if (b.x < cam.x - 80 || b.x > cam.x + w + 80 || b.y < cam.y - 120 || b.y > cam.y + h + 120) continue;
      out.push({ y: b.y, draw: ctx => this.drawBreakable(ctx, b) });
    }
    for (const o of this.objects) {
      if (o.x < cam.x - 80 || o.x > cam.x + w + 80 || o.y < cam.y - 120 || o.y > cam.y + h + 120) continue;
      out.push({ y: o.y, draw: ctx => this.drawObject(ctx, o) });
    }
    if (this.portal) {
      out.push({ y: this.portal.y, draw: ctx => this.drawPortal(ctx) });
    }
    return out;
  },

  drawObject(ctx, o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 3, 16, 7, 0, 0, TAU); ctx.fill();
    if (o.type === 'chest') {
      ctx.fillStyle = o.used ? '#3d3324' : '#5e4a2a';
      rr(ctx, -14, -16, 28, 18, 3); ctx.fill();
      ctx.fillStyle = o.used ? '#2c2519' : '#4a3a20';
      rr(ctx, -14, -16, 28, 8, 3); ctx.fill();
      ctx.strokeStyle = o.used ? '#6b5a36' : '#ffd76a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-2.5, -12, 5, 6);
      if (!o.used) {
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Game.time * 3 + o.seed * 9);
        ctx.strokeStyle = '#ffd76a';
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, TAU); ctx.stroke();
      }
    } else if (o.type === 'shrine') {
      const col = o.used ? '#544d5e' : '#6ff7c3';
      ctx.fillStyle = '#3a3448';
      ctx.beginPath();
      ctx.moveTo(-10, 2); ctx.lineTo(-5, -34); ctx.lineTo(5, -34); ctx.lineTo(10, 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      if (!o.used) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.arc(0, -40, 6 + (o.used ? 0 : Math.sin(Game.time * 4) * 1.5), 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (o.type === 'vendor') {
      // Cart.
      ctx.fillStyle = '#4a3a24';
      rr(ctx, 8, -20, 26, 20, 3); ctx.fill();
      ctx.fillStyle = '#5e4a2a';
      rr(ctx, 8, -24, 26, 7, 3); ctx.fill();
      ctx.strokeStyle = '#2e2416';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(15, 2, 6, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(28, 2, 6, 0, TAU); ctx.stroke();
      // Wares on top.
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(15, -27, 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b06adf';
      ctx.beginPath(); ctx.arc(22, -28, 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e04a5a';
      ctx.beginPath(); ctx.arc(28, -27, 2.5, 0, TAU); ctx.fill();
      // The merchant.
      ctx.fillStyle = '#4a3c50';
      ctx.beginPath();
      ctx.moveTo(-8, 2);
      ctx.quadraticCurveTo(-16, -14, -8, -26);
      ctx.lineTo(0, -26);
      ctx.quadraticCurveTo(4, -12, 0, 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a06a';
      ctx.beginPath(); ctx.arc(-4, -28, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a3c50';
      ctx.beginPath(); ctx.arc(-4, -30, 5.5, Math.PI, 0); ctx.fill();
      // Lantern glow + trade hint.
      const gl = 0.55 + 0.25 * Math.sin(Game.time * 3 + o.seed * 7);
      ctx.fillStyle = `rgba(255,215,106,${gl})`;
      ctx.shadowColor = '#ffd76a';
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(4, -34, 3, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 10px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('TRADE', 6, -46 + Math.sin(Game.time * 2.5) * 2);
      ctx.globalAlpha = 1;
    } else if (o.type === 'urn' && !o.used) {
      ctx.fillStyle = '#4a4356';
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-9, -10, -4, -14);
      ctx.lineTo(4, -14); ctx.quadraticCurveTo(9, -10, 6, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#37313f';
      ctx.fillRect(-5, -16, 10, 3);
    }
    ctx.restore();
  },

  drawPortal(ctx) {
    const p = this.portal;
    const t = Game.time;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = 'rgba(176,106,223,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 4, 26, 12, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.7 + i / 3) % 1;
      ctx.globalAlpha = 0.75 * (1 - k);
      ctx.strokeStyle = '#b06adf';
      ctx.lineWidth = 3.5 - i;
      ctx.beginPath();
      ctx.ellipse(0, -22, 16 + k * 10, 30 + k * 12, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#b06adf';
    ctx.shadowColor = '#b06adf';
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.ellipse(0, -22, 11, 24, 0, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8d8f4';
    ctx.beginPath(); ctx.ellipse(0, -22, 5, 14, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawBreakable(ctx, b) {
    const s = b.seed;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(0, 3, b.r + 3, (b.r + 3) * 0.4, 0, 0, TAU); ctx.fill();
    switch (b.type) {
      case 'pot': {
        ctx.rotate((s - 0.5) * 0.2);
        ctx.fillStyle = s > 0.5 ? '#a8674a' : '#8a5540';
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-10, -9, -4, -14);
        ctx.lineTo(4, -14); ctx.quadraticCurveTo(10, -9, 6, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#6b4534';
        ctx.fillRect(-5, -16, 10, 3);
        ctx.strokeStyle = 'rgba(60,35,25,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-7, -7); ctx.quadraticCurveTo(0, -9, 7, -7); ctx.stroke();
        break;
      }
      case 'urnB': {
        ctx.fillStyle = '#4a4356';
        ctx.beginPath();
        ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-9, -10, -4, -15);
        ctx.lineTo(4, -15); ctx.quadraticCurveTo(9, -10, 6, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#37313f';
        ctx.fillRect(-5, -17, 10, 3);
        ctx.fillStyle = 'rgba(111,247,195,0.35)';
        ctx.fillRect(-4, -9, 8, 1.5);
        break;
      }
      case 'bonepile': {
        ctx.strokeStyle = '#c9c0a8';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const a = s * 9 + i * 1.7;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 3 - 2);
          ctx.lineTo(Math.cos(a + 2) * 8, Math.sin(a + 2) * 4 - 6);
          ctx.stroke();
        }
        ctx.fillStyle = '#d8cfb8';
        ctx.beginPath(); ctx.arc(2, -7, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#16121b';
        ctx.fillRect(0.5, -8.5, 1.5, 2); ctx.fillRect(3.5, -8.5, 1.5, 2);
        break;
      }
      case 'chair': {
        ctx.rotate((s - 0.5) * 0.8);
        ctx.fillStyle = '#5e4a2a';
        ctx.fillRect(-6, -8, 12, 3);           // seat
        ctx.fillRect(-6, -20, 3, 12);          // back
        ctx.fillStyle = '#4a3a24';
        ctx.fillRect(-6, -5, 2.5, 6);
        ctx.fillRect(3.5, -5, 2.5, 6);
        break;
      }
      case 'table': {
        ctx.fillStyle = '#5e4a2a';
        rr(ctx, -18, -14, 36, 9, 3); ctx.fill();
        ctx.fillStyle = '#4a3a24';
        ctx.fillRect(-15, -6, 4, 8);
        ctx.fillRect(11, -6, 4, 8);
        // Clutter on top.
        ctx.fillStyle = '#8a8577';
        ctx.beginPath(); ctx.arc(-6, -16, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9885e';
        ctx.fillRect(3, -19, 5, 5);
        break;
      }
      case 'bookcase': {
        ctx.fillStyle = '#4a3a24';
        rr(ctx, -13, -38, 26, 40, 2); ctx.fill();
        ctx.fillStyle = '#2e2416';
        for (let i = 0; i < 3; i++) ctx.fillRect(-11, -34 + i * 12, 22, 9);
        // Books.
        const bookCols = ['#8a2635', '#2c4a3a', '#8a6f4a', '#3a3448', '#6b4534'];
        for (let i = 0; i < 3; i++) {
          let bx = -10;
          let k = 0;
          while (bx < 8) {
            const wd = 3 + ((s * 13 + i * 7 + k) % 3);
            ctx.fillStyle = bookCols[Math.floor((s * 31 + i * 3 + k) % bookCols.length)];
            ctx.fillRect(bx, -33 + i * 12, wd, 8);
            bx += wd + 1;
            k++;
          }
        }
        break;
      }
      case 'cart': {
        ctx.rotate((s - 0.5) * 0.3);
        ctx.fillStyle = '#4a3a24';
        rr(ctx, -16, -16, 32, 12, 3); ctx.fill();
        ctx.strokeStyle = '#2e2416';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(-8, 0, 5.5, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(8, 0, 5.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#8a6f4a';
        ctx.fillRect(-13, -20, 8, 5);
        ctx.fillRect(-1, -21, 9, 6);
        break;
      }
      case 'gravestone': {
        ctx.rotate((s - 0.5) * 0.3);
        ctx.fillStyle = '#5c5569';
        rr(ctx, -10, -26, 20, 28, 8); ctx.fill();
        ctx.fillStyle = '#454050';
        rr(ctx, -10, -26, 5, 28, 8); ctx.fill();
        ctx.strokeStyle = '#37313f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -18); ctx.lineTo(4, -18);
        ctx.moveTo(-4, -13); ctx.lineTo(4, -13);
        ctx.stroke();
        break;
      }
      case 'sarcophagus': {
        ctx.rotate((s - 0.5) * 0.25);
        ctx.fillStyle = '#4a4356';
        rr(ctx, -20, -18, 40, 20, 4); ctx.fill();
        ctx.fillStyle = '#5c5569';
        rr(ctx, -18, -22, 36, 8, 3); ctx.fill();
        ctx.strokeStyle = 'rgba(111,247,195,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(12, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -3); ctx.stroke();
        break;
      }
      case 'crypt': {
        ctx.fillStyle = '#3a3448';
        rr(ctx, -22, -34, 44, 36, 4); ctx.fill();
        ctx.fillStyle = '#2c2838';
        ctx.beginPath();
        ctx.moveTo(-25, -34); ctx.lineTo(0, -48); ctx.lineTo(25, -34);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#16121b';
        rr(ctx, -8, -22, 16, 24, 6); ctx.fill();
        ctx.strokeStyle = '#4a4356';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-14, -4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(14, -4); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  },

  drawProp(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 3, p.r + 4, (p.r + 4) * 0.4, 0, 0, TAU); ctx.fill();
    const s = p.seed;
    switch (p.type) {
      case 'tomb': {
        ctx.rotate((s - 0.5) * 0.22);
        ctx.fillStyle = '#4a4356';
        rr(ctx, -12, -34, 24, 36, 9); ctx.fill();
        ctx.fillStyle = '#37313f';
        rr(ctx, -12, -34, 6, 36, 9); ctx.fill();
        ctx.strokeStyle = '#2a2531';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -12);
        ctx.moveTo(-5, -22); ctx.lineTo(5, -22); ctx.stroke();
        break;
      }
      case 'cross': {
        ctx.rotate((s - 0.5) * 0.3);
        ctx.fillStyle = '#3d3648';
        ctx.fillRect(-3.5, -42, 7, 44);
        ctx.fillRect(-13, -32, 26, 7);
        ctx.fillStyle = '#2e2938';
        ctx.fillRect(-3.5, -42, 3, 44);
        break;
      }
      case 'pillar': {
        ctx.fillStyle = '#514a5e';
        ctx.fillRect(-13, -46 - s * 14, 26, 48 + s * 14);
        ctx.fillStyle = '#3c3647';
        ctx.fillRect(-13, -46 - s * 14, 8, 48 + s * 14);
        ctx.fillStyle = '#5c5569';
        ctx.fillRect(-16, 0, 32, 6);
        ctx.fillStyle = '#16121b';
        ctx.beginPath();
        ctx.moveTo(-13, -46 - s * 14);
        ctx.lineTo(-4, -40 - s * 14);
        ctx.lineTo(5, -48 - s * 14);
        ctx.lineTo(13, -43 - s * 14);
        ctx.lineTo(13, -52 - s * 14);
        ctx.lineTo(-13, -52 - s * 14);
        ctx.fill();
        break;
      }
      case 'tree': {
        ctx.strokeStyle = '#241e2c';
        ctx.lineCap = 'round';
        ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(4 * (s - 0.5) * 8, -30, (s - 0.5) * 22, -56); ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo((s - 0.5) * 10, -34); ctx.lineTo((s - 0.5) * 10 + 18, -52); ctx.stroke();
        ctx.beginPath(); ctx.moveTo((s - 0.5) * 6, -24); ctx.lineTo((s - 0.5) * 6 - 20, -44); ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo((s - 0.5) * 22, -56); ctx.lineTo((s - 0.5) * 22 + 8, -70); ctx.stroke();
        break;
      }
      case 'obelisk': {
        ctx.fillStyle = '#2f2a3a';
        ctx.beginPath();
        ctx.moveTo(-11, 2); ctx.lineTo(-6, -58); ctx.lineTo(6, -58); ctx.lineTo(11, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a3448';
        ctx.beginPath();
        ctx.moveTo(0, 2); ctx.lineTo(2, -58); ctx.lineTo(6, -58); ctx.lineTo(11, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(111,247,195,0.8)';
        ctx.shadowColor = '#6ff7c3';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 11px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(['ᛟ', 'ᚦ', 'ᛝ', 'ᚱ'][Math.floor(s * 4)], 0, -26);
        ctx.shadowBlur = 0;
        break;
      }
      case 'rock': {
        ctx.fillStyle = '#3a3444';
        ctx.beginPath();
        ctx.moveTo(-p.r, 2);
        ctx.lineTo(-p.r * 0.6, -14 - s * 8);
        ctx.lineTo(p.r * 0.2, -20 - s * 6);
        ctx.lineTo(p.r * 0.9, -8);
        ctx.lineTo(p.r, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2b2634';
        ctx.beginPath();
        ctx.moveTo(-p.r, 2);
        ctx.lineTo(-p.r * 0.6, -14 - s * 8);
        ctx.lineTo(-p.r * 0.2, -10);
        ctx.lineTo(-p.r * 0.1, 2);
        ctx.closePath(); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
};
