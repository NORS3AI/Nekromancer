'use strict';
// ---------------------------------------------------------------------------
// Particles, floating combat text, expanding rings and screen shake.
// Everything here lives in WORLD coordinates and is drawn inside the
// camera transform.
// ---------------------------------------------------------------------------

const Particles = {
  list: [],
  texts: [],
  rings: [],
  shakeAmt: 0,
  MAX: 700,

  reset() {
    this.list.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.shakeAmt = 0;
  },

  shake(n) {
    if (typeof Settings !== 'undefined' && !Settings.g.shake) return;
    this.shakeAmt = Math.min(16, this.shakeAmt + n);
  },

  spawn(x, y, o = {}) {
    let n = o.count || 6;
    if (typeof Settings !== 'undefined' && Settings.g.lowFx) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.MAX) this.list.shift();
      const spread = o.spread !== undefined ? o.spread : Math.PI;
      const a = o.angle !== undefined ? o.angle + rand(-spread, spread) : rand(TAU);
      const sp = rand(o.minSpeed ?? 20, o.maxSpeed ?? 130);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        maxLife: rand(o.minLife ?? 0.3, o.maxLife ?? 0.8),
        size: rand(o.minSize ?? 1.5, o.maxSize ?? 3.5),
        color: Array.isArray(o.color) ? pick(o.color) : (o.color || '#fff'),
        drag: o.drag ?? 2.2,
        grav: o.grav ?? 0,
        glow: !!o.glow
      });
    }
  },

  ring(x, y, radius, color, width = 4, life = 0.4) {
    this.rings.push({ x, y, radius, color, width, life: 0, maxLife: life });
  },

  text(x, y, str, o = {}) {
    this.texts.push({
      x: x + rand(-8, 8), y,
      str,
      life: 0,
      maxLife: o.life ?? 0.9,
      color: o.color || '#fff',
      size: o.size || 15,
      vy: o.vy ?? -52,
      vx: rand(-10, 10),
      stroke: o.stroke !== false
    });
  },

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.maxLife) { L.splice(i, 1); continue; }
      const d = 1 - Math.min(1, p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life += dt;
      if (t.life >= t.maxLife) { this.texts.splice(i, 1); continue; }
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy *= 1 - 1.5 * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) this.rings.splice(i, 1);
    }
    this.shakeAmt *= Math.max(0, 1 - 7 * dt);
    if (this.shakeAmt < 0.15) this.shakeAmt = 0;
  },

  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
      }
      const s = p.size * (0.4 + 0.6 * k);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      if (p.glow) ctx.shadowBlur = 0;
    }
    for (const r of this.rings) {
      const k = r.life / r.maxLife;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.25 + 0.75 * k), 0, TAU);
      ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.life / t.maxLife;
      ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
      ctx.font = `bold ${t.size}px Georgia, serif`;
      if (t.stroke) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(t.str, t.x, t.y);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
};

// --------------------------- effect shorthands -----------------------------

function dmgText(x, y, amount, crit = false) {
  if (typeof Settings !== 'undefined' && !Settings.g.dmgNumbers) return;
  Particles.text(x, y - 24, Math.round(amount), {
    color: crit ? '#ffb43a' : '#f3ede0',
    size: crit ? 22 : 15,
    life: crit ? 1.0 : 0.8
  });
}

function fxBlood(x, y, n = 10, angle) {
  Particles.spawn(x, y, {
    count: n, angle, spread: angle === undefined ? Math.PI : 0.9,
    color: ['#8f1626', '#6d0f1c', '#b52033'],
    minSpeed: 30, maxSpeed: 190, minLife: 0.25, maxLife: 0.6,
    minSize: 2, maxSize: 4.5, grav: 260
  });
}

function fxBone(x, y, n = 8) {
  Particles.spawn(x, y, {
    count: n,
    color: ['#e8e0cc', '#c9c0a8', '#a99f86'],
    minSpeed: 40, maxSpeed: 220, minLife: 0.2, maxLife: 0.55,
    minSize: 1.5, maxSize: 3.5, grav: 320
  });
}

function fxExplosion(x, y, r) {
  Particles.ring(x, y, r, '#ffb43a', 6, 0.35);
  Particles.ring(x, y, r * 0.7, '#b52033', 5, 0.3);
  Particles.spawn(x, y, {
    count: 26, color: ['#ffb43a', '#e06427', '#b52033', '#5a0d17'],
    minSpeed: 60, maxSpeed: 340, minLife: 0.25, maxLife: 0.7,
    minSize: 2.5, maxSize: 6, glow: true, drag: 3
  });
  Particles.spawn(x, y, {
    count: 12, color: ['#e8e0cc', '#a99f86'],
    minSpeed: 80, maxSpeed: 300, minLife: 0.3, maxLife: 0.6, grav: 300
  });
  Particles.shake(5);
}

function fxNova(x, y, r) {
  Particles.ring(x, y, r, '#c22843', 10, 0.5);
  Particles.ring(x, y, r * 0.8, '#6ff7c3', 4, 0.45);
  Particles.spawn(x, y, {
    count: 40, color: ['#c22843', '#8f1626', '#6ff7c3'],
    minSpeed: 160, maxSpeed: 420, minLife: 0.3, maxLife: 0.6,
    minSize: 2, maxSize: 5, glow: true, drag: 2.5
  });
  Particles.shake(7);
}

function fxSummon(x, y) {
  Particles.ring(x, y, 42, '#6ff7c3', 3, 0.5);
  Particles.spawn(x, y, {
    count: 16, color: ['#6ff7c3', '#3ee6a0', '#e8e0cc'],
    minSpeed: 20, maxSpeed: 90, minLife: 0.4, maxLife: 0.9,
    grav: -140, glow: true
  });
}

function fxLevel(x, y) {
  Particles.ring(x, y, 90, '#ffd76a', 5, 0.7);
  Particles.ring(x, y, 60, '#6ff7c3', 4, 0.6);
  Particles.spawn(x, y, {
    count: 40, color: ['#ffd76a', '#ffb43a', '#6ff7c3', '#fff'],
    minSpeed: 40, maxSpeed: 260, minLife: 0.4, maxLife: 1.1,
    grav: -80, glow: true
  });
}

function fxHeal(x, y) {
  Particles.spawn(x, y, {
    count: 12, color: ['#e04a5a', '#ff7a88', '#fff'],
    minSpeed: 15, maxSpeed: 70, minLife: 0.4, maxLife: 0.8,
    grav: -120, glow: true
  });
}
