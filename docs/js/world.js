'use strict';
// ---------------------------------------------------------------------------
// The cursed graveyard: tiled ground pattern, flat decorations (bones, cracks,
// blood) and tall colliding props (tombstones, pillars, dead trees) that are
// merged into the y-sorted draw pass with the entities.
// ---------------------------------------------------------------------------

const World = {
  W: 2600,
  H: 2600,
  props: [],    // colliding: {x, y, r, type, seed}
  decos: [],    // flat, non-colliding: {x, y, type, seed}
  pattern: null,

  generate() {
    this.props.length = 0;
    this.decos.length = 0;
    this.makePattern();

    const cx = this.W / 2, cy = this.H / 2;
    const propTypes = ['tomb', 'tomb', 'cross', 'pillar', 'tree', 'obelisk', 'rock'];
    let attempts = 0;
    while (this.props.length < 58 && attempts++ < 900) {
      const x = rand(90, this.W - 90);
      const y = rand(90, this.H - 90);
      if (dist(x, y, cx, cy) < 300) continue;
      let ok = true;
      for (const p of this.props) {
        if (dist(x, y, p.x, p.y) < 120) { ok = false; break; }
      }
      if (!ok) continue;
      const type = pick(propTypes);
      const r = { tomb: 16, cross: 13, pillar: 19, tree: 15, obelisk: 17, rock: 20 }[type];
      this.props.push({ x, y, r, type, seed: Math.random() });
    }

    const decoTypes = ['skull', 'bones', 'ribcage', 'rubble', 'crack', 'blood', 'moss', 'grass'];
    for (let i = 0; i < 220; i++) {
      this.decos.push({
        x: rand(50, this.W - 50),
        y: rand(50, this.H - 50),
        type: pick(decoTypes),
        seed: Math.random()
      });
    }
  },

  makePattern() {
    const c = document.createElement('canvas');
    c.width = c.height = 320;
    const x = c.getContext('2d');
    x.fillStyle = '#16121b';
    x.fillRect(0, 0, 320, 320);
    // Dark blotches for uneven, trampled dirt.
    for (let i = 0; i < 46; i++) {
      const px = rand(320), py = rand(320), r = rand(14, 52);
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      const shade = pick(['#1a1520', '#120e17', '#1c1622', '#100c14']);
      g.addColorStop(0, shade);
      g.addColorStop(1, 'rgba(20,16,26,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill();
    }
    // Speckles / gravel.
    for (let i = 0; i < 260; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(60,50,72,0.25)' : 'rgba(5,3,8,0.35)';
      x.fillRect(rand(320), rand(320), rand(1, 2.5), rand(1, 2.5));
    }
    // A few hairline cracks.
    x.strokeStyle = 'rgba(8,5,12,0.55)';
    x.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      let px = rand(320), py = rand(320);
      x.beginPath(); x.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        px += rand(-22, 22); py += rand(-22, 22);
        x.lineTo(px, py);
      }
      x.stroke();
    }
    this.pattern = c;
  },

  // Push a circular entity out of props and world bounds.
  collide(e) {
    e.x = clamp(e.x, 40, this.W - 40);
    e.y = clamp(e.y, 40, this.H - 40);
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
  },

  drawGround(ctx, cam, w, h) {
    if (!this.patternFill) this.patternFill = ctx.createPattern(this.pattern, 'repeat');
    ctx.fillStyle = this.patternFill;
    ctx.fillRect(cam.x, cam.y, w, h);

    // Void beyond the world edge.
    ctx.fillStyle = '#050308';
    if (cam.x < 0) ctx.fillRect(cam.x, cam.y, -cam.x, h);
    if (cam.y < 0) ctx.fillRect(cam.x, cam.y, w, -cam.y);
    if (cam.x + w > this.W) ctx.fillRect(this.W, cam.y, cam.x + w - this.W, h);
    if (cam.y + h > this.H) ctx.fillRect(cam.x, this.H, w, cam.y + h - this.H);
    ctx.strokeStyle = 'rgba(111,247,195,0.10)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, this.W, this.H);

    // Flat decorations in view.
    for (const d of this.decos) {
      if (d.x < cam.x - 60 || d.x > cam.x + w + 60 || d.y < cam.y - 60 || d.y > cam.y + h + 60) continue;
      this.drawDeco(ctx, d);
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

  // Tall props in view, packaged for the shared y-sort pass.
  propsInView(cam, w, h) {
    const out = [];
    for (const p of this.props) {
      if (p.x < cam.x - 80 || p.x > cam.x + w + 80 || p.y < cam.y - 120 || p.y > cam.y + h + 120) continue;
      out.push({ y: p.y, draw: ctx => this.drawProp(ctx, p) });
    }
    return out;
  },

  drawProp(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 3, p.r + 4, (p.r + 4) * 0.4, 0, 0, TAU); ctx.fill();
    const s = p.seed;
    switch (p.type) {
      case 'tomb': {
        const tilt = (s - 0.5) * 0.22;
        ctx.rotate(tilt);
        ctx.fillStyle = '#4a4356';
        rr(ctx, -12, -34, 24, 36, 9);
        ctx.fill();
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
        // Broken top.
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
        // Glowing rune.
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
