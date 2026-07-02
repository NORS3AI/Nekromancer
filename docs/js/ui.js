'use strict';
// ---------------------------------------------------------------------------
// HUD in the Diablo-mobile layout: portrait + bars top-left, gold/wave top,
// virtual joystick bottom-left, skill cluster bottom-right with radial
// cooldown sweeps, plus menu / death screens.
// ---------------------------------------------------------------------------

const UI = {
  buttons: [],   // {x, y, r, slot}
  toasts: [],    // {text, color, until}
  showGear: false,

  toast(text, color) {
    this.toasts.push({ text, color, until: Game.time + 3 });
    if (this.toasts.length > 3) this.toasts.shift();
  },

  portraitHit(x, y) {
    return dist(x, y, 40, 38) < 36;
  },

  layout(W, H) {
    this.buttons.length = 0;
    const scale = clamp(Math.min(W, H) / 420, 0.85, 1.35);
    const px = W - 86 * scale;
    const py = H - 92 * scale;
    this.buttons.push({ x: px, y: py, r: 44 * scale, slot: 0 });
    const R = 112 * scale;
    const angles = [Math.PI, Math.PI * 1.195, Math.PI * 1.39, Math.PI * 1.585];
    for (let i = 0; i < 4; i++) {
      this.buttons.push({
        x: px + Math.cos(angles[i]) * R,
        y: py + Math.sin(angles[i]) * R,
        r: 30 * scale,
        slot: i + 1
      });
    }
  },

  buttonAt(x, y) {
    for (const b of this.buttons) {
      if (dist(x, y, b.x, b.y) < b.r * 1.25) return b.slot;
    }
    return null;
  },

  draw(ctx, W, H) {
    const p = Game.player;
    if (Game.state === 'menu') { this.drawMenu(ctx, W, H); return; }
    if (!p) return;

    this.drawTopBar(ctx, W, H, p);
    this.drawToasts(ctx, W);
    this.drawJoystick(ctx);
    this.drawSkillButtons(ctx, p);
    if (this.showGear && Game.state === 'playing') this.drawGearPanel(ctx, W, H, p);
    this.drawBanner(ctx, W, H);
    if (Game.state === 'over') this.drawDeath(ctx, W, H);
  },

  // ---------------------------------------------------------------- top bar

  drawTopBar(ctx, W, H, p) {
    const x0 = 14, y0 = 12;

    // Portrait ring.
    ctx.fillStyle = 'rgba(8,5,12,0.8)';
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 26, 27, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5c5569';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 26, 27, 0, TAU); ctx.stroke();
    // Mini nekromancer face.
    ctx.fillStyle = '#142020';
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 24, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(x0 + 21, y0 + 23, 2.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x0 + 31, y0 + 23, 2.2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // Level badge.
    ctx.fillStyle = '#1c1622';
    ctx.beginPath(); ctx.arc(x0 + 45, y0 + 44, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x0 + 45, y0 + 44, 11, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.level, x0 + 45, y0 + 45);

    // Bars.
    const bx = x0 + 62, bw = Math.min(190, W * 0.32);
    this.bar(ctx, bx, y0 + 8, bw, 13, p.hp / p.maxHp, '#9c2733', '#e04a5a',
      `${Math.ceil(p.hp)} / ${p.maxHp}`);
    this.bar(ctx, bx, y0 + 25, bw, 10, p.essence / p.maxEssence, '#1e5e6e', '#4ecbe0',
      Math.floor(p.essence));
    // XP sliver.
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, y0 + 39, bw, 4);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(bx, y0 + 39, bw * clamp(p.xp / p.xpNext, 0, 1), 4);
    if (p.shield > 0) {
      ctx.fillStyle = 'rgba(111,247,195,0.85)';
      ctx.fillRect(bx, y0 + 5, bw * clamp(p.shield / 60, 0, 1), 2.5);
    }

    // Wave + kills, centered.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9bfa8';
    ctx.font = 'bold 15px Georgia';
    ctx.fillText('WAVE ' + Game.wave, W / 2, y0 + 12);
    ctx.fillStyle = '#7d7568';
    ctx.font = '11px Georgia';
    ctx.fillText(Game.kills + ' slain', W / 2, y0 + 28);

    // Gold, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 14px Georgia';
    ctx.fillText(Game.gold, W - 26, y0 + 14);
    ctx.beginPath(); ctx.arc(W - 16, y0 + 13, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b8860b';
    ctx.beginPath(); ctx.arc(W - 16, y0 + 13, 2.5, 0, TAU); ctx.fill();
  },

  drawToasts(ctx, W) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      if (this.toasts[i].until < Game.time) this.toasts.splice(i, 1);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px Georgia';
    this.toasts.forEach((t, i) => {
      const left = t.until - Game.time;
      ctx.globalAlpha = clamp(left / 0.5, 0, 1);
      const y = 62 + i * 20;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.text, W / 2, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, W / 2, y);
    });
    ctx.globalAlpha = 1;
  },

  drawGearPanel(ctx, W, H, p) {
    const w = Math.min(300, W * 0.6);
    const x = 14, y = 74;
    const slots = Object.keys(ITEM_SLOTS);
    // Measure: header + per-slot block.
    let lines = 3; // stat summary
    for (const s of slots) {
      const it = Items.equipped[s];
      lines += 1 + (it ? Items.statLines(it).length : 1);
    }
    const h = 34 + lines * 16 + slots.length * 8;

    ctx.fillStyle = 'rgba(8,5,12,0.88)';
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#3a3448';
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 8); ctx.stroke();

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('EQUIPMENT', x + 12, y + 18);
    ctx.textAlign = 'right';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('tap portrait / I to close', x + w - 10, y + 18);
    ctx.textAlign = 'left';

    let yy = y + 40;
    for (const s of slots) {
      const it = Items.equipped[s];
      ctx.font = 'bold 12px Georgia';
      if (it) {
        ctx.fillStyle = RARITIES[it.rarity].color;
        ctx.fillText(`${ITEM_SLOTS[s].label}:  ${it.name}`, x + 12, yy);
        yy += 16;
        ctx.font = '11px Georgia';
        ctx.fillStyle = '#9a9080';
        for (const line of Items.statLines(it)) {
          ctx.fillText('  ' + line, x + 20, yy);
          yy += 16;
        }
      } else {
        ctx.fillStyle = '#7d7568';
        ctx.fillText(`${ITEM_SLOTS[s].label}:`, x + 12, yy);
        yy += 16;
        ctx.font = 'italic 11px Georgia';
        ctx.fillStyle = '#544d44';
        ctx.fillText('  — empty —', x + 20, yy);
        yy += 16;
      }
      yy += 8;
    }
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText(`Damage ×${p.dmgMult.toFixed(2)}`, x + 12, yy); yy += 16;
    ctx.fillText(`Crit ${Math.round(p.critChance * 100)}%   ·   Life ${p.maxHp}`, x + 12, yy); yy += 16;
    ctx.fillText(`Essence ${p.essenceRegen.toFixed(1)}/s   ·   Regen ${p.hpRegen.toFixed(1)}/s`, x + 12, yy);
  },

  bar(ctx, x, y, w, h, frac, base, bright, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 4); ctx.fill();
    const f = clamp(frac, 0, 1);
    if (f > 0) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, bright);
      g.addColorStop(1, base);
      ctx.fillStyle = g;
      rr(ctx, x, y, w * f, h, 3); ctx.fill();
    }
    if (label !== undefined && h >= 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `bold ${h - 3}px Georgia`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    }
  },

  // --------------------------------------------------------------- joystick

  drawJoystick(ctx) {
    const j = Input.joy;
    if (!j.active) return;
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#c9bfa8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(j.ox, j.oy, 52, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#c9bfa8';
    ctx.beginPath(); ctx.arc(j.ox + j.dx * 40, j.oy + j.dy * 40, 24, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  },

  // ----------------------------------------------------------- skill wheel

  drawSkillButtons(ctx, p) {
    for (const b of this.buttons) {
      const s = Skills.list[b.slot];
      const cd = Skills.cds[b.slot];
      const affordable = p.essence >= s.cost;
      const held = Input.skillHeld(b.slot);

      // Base plate.
      ctx.globalAlpha = 0.82;
      const g = ctx.createRadialGradient(b.x, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, held ? '#2e2a3a' : '#211c2b');
      g.addColorStop(1, '#0d0a12');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();

      // Icon.
      ctx.globalAlpha = affordable ? 0.95 : 0.35;
      s.icon(ctx, b.x, b.y, b.r * 0.95);

      // Cooldown sweep.
      if (cd > 0) {
        const frac = cd / s.cd;
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = '#05030a';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
        ctx.closePath(); ctx.fill();
        if (b.slot > 0 && cd > 0.4) {
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#e8e0cc';
          ctx.font = `bold ${Math.round(b.r * 0.55)}px Georgia`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(Math.ceil(cd), b.x, b.y);
        }
      }

      // Rim: teal when ready, dim blue when starved for essence.
      ctx.globalAlpha = 1;
      ctx.lineWidth = b.slot === 0 ? 3 : 2.5;
      ctx.strokeStyle = !affordable ? '#28506e'
        : (cd > 0 ? '#3a3448' : (held ? '#a8ffe0' : '#57b894'));
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();

      // Essence cost pip.
      if (s.cost > 0) {
        ctx.fillStyle = affordable ? '#4ecbe0' : '#28506e';
        ctx.font = `bold ${Math.round(b.r * 0.32)}px Georgia`;
        ctx.textAlign = 'center';
        ctx.fillText(s.cost, b.x, b.y + b.r * 0.68);
      }
    }
    ctx.globalAlpha = 1;
  },

  // ------------------------------------------------------ banners & screens

  drawBanner(ctx, W, H) {
    if (!Game.banner.t) return;
    const k = Game.banner.t / Game.banner.maxT;
    const a = k > 0.85 ? (1 - k) / 0.15 : (k < 0.25 ? k / 0.25 : 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 34px Georgia';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(Game.banner.text, W / 2, H * 0.30);
    ctx.fillStyle = '#c22843';
    ctx.fillText(Game.banner.text, W / 2, H * 0.30);
    if (Game.banner.sub) {
      ctx.font = '15px Georgia';
      ctx.strokeText(Game.banner.sub, W / 2, H * 0.30 + 32);
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText(Game.banner.sub, W / 2, H * 0.30 + 32);
    }
    ctx.globalAlpha = 1;
  },

  drawMenu(ctx, W, H) {
    ctx.fillStyle = 'rgba(4,2,8,0.72)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.38;
    const t = Game.time;

    // Brooding skull sigil.
    ctx.save();
    ctx.translate(cx, cy - 78 + Math.sin(t * 1.4) * 4);
    ctx.shadowColor = '#6ff7c3';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ded5bd';
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill();
    ctx.fillRect(-15, 16, 30, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a070c';
    ctx.beginPath(); ctx.ellipse(-10, -2, 6.5, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -2, 6.5, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 6); ctx.lineTo(-4, 14); ctx.lineTo(4, 14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-10, -2, 2.6 + Math.sin(t * 3) * 0.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -2, 2.6 + Math.sin(t * 3 + 1) * 0.8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#0a070c';
      ctx.fillRect(-10 + i * 8, 17, 3, 10);
    }
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(58, W * 0.11)}px Georgia`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText('NEKROMANCER', cx, cy + 12);
    const grad = ctx.createLinearGradient(0, cy - 14, 0, cy + 38);
    grad.addColorStop(0, '#f2ecd8');
    grad.addColorStop(0.55, '#c9bfa8');
    grad.addColorStop(1, '#6f6552');
    ctx.fillStyle = grad;
    ctx.fillText('NEKROMANCER', cx, cy + 12);

    ctx.font = 'italic 16px Georgia';
    ctx.fillStyle = '#8a2635';
    ctx.fillText('~ Rise of the Dead ~', cx, cy + 52);

    const best = Game.getBest();
    if (best > 0) {
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = '#ffd76a';
      ctx.fillText('Best: Wave ' + best, cx, cy + 80);
    }

    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3.2);
    ctx.font = 'bold 19px Georgia';
    ctx.fillStyle = '#6ff7c3';
    ctx.fillText(('ontouchstart' in window) ? 'TOUCH TO RISE' : 'CLICK TO RISE', cx, H * 0.66);
    ctx.globalAlpha = 1;

    ctx.font = '12px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Left thumb: move   ·   Right thumb: skills', cx, H * 0.66 + 34);
    ctx.fillText('Keyboard: WASD + Space, 1-4   ·   M: mute', cx, H * 0.66 + 52);
  },

  drawDeath(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,3,6,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(46, W * 0.09)}px Georgia`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText('YOU HAVE FALLEN', cx, cy);
    ctx.fillStyle = '#c22843';
    ctx.fillText('YOU HAVE FALLEN', cx, cy);

    ctx.font = '16px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(`Wave ${Game.wave}  ·  ${Game.kills} slain  ·  Level ${Game.player.level}  ·  ${Game.gold} gold`, cx, cy + 44);
    if (Game.newBest) {
      ctx.font = 'bold 15px Georgia';
      ctx.fillStyle = '#ffd76a';
      ctx.fillText('★ NEW BEST ★', cx, cy + 68);
    }

    if (Game.overT > 1.2) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(Game.time * 3.2);
      ctx.font = 'bold 17px Georgia';
      ctx.fillStyle = '#6ff7c3';
      ctx.fillText('TAP TO RISE AGAIN', cx, cy + 96);
      ctx.globalAlpha = 1;
    }
  }
};
