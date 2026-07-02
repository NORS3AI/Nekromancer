'use strict';
// ---------------------------------------------------------------------------
// HUD + shared UI plumbing. Full-screen menus (radial inventory, skills,
// artisans, map, camp) live in screens.js; this file owns the in-zone HUD,
// the tap-region registry that all menus use, toasts and the wave banner.
// ---------------------------------------------------------------------------

const UI = {
  buttons: [],    // skill buttons {x, y, r, slot}
  potionBtn: null,
  menuBtn: null,
  hits: [],       // tap regions rebuilt every frame: {x, y, w, h, cb}
  screen: null,   // null | 'radial' | 'skills' | 'smith' | 'jeweler' | 'mystic' | 'pause' | 'reward'
  toasts: [],
  // Menu state shared with screens.js
  sel: {},

  // ------------------------------------------------------------ tap routing

  clearHits() {
    this.hits = [];
    this.sliderRegs = [];
    this.panelRects = [];
    this.overlayBarrier = 0;
  },

  register(x, y, w, h, cb) {
    this.hits.push({ x, y, w, h, cb });
  },

  sliderAt(x, y) {
    for (const s of this.sliderRegs || []) {
      if (x >= s.x - 12 && x <= s.x + s.w + 12 && y >= s.y && y <= s.y + s.h) return s;
    }
    return null;
  },

  // A draggable volume slider (0..1). Registers itself for touch/mouse drags.
  slider(ctx, x, y, w, value, set) {
    ctx.fillStyle = '#241f30';
    rr(ctx, x, y + 8, w, 8, 4); ctx.fill();
    ctx.fillStyle = '#57b894';
    rr(ctx, x, y + 8, Math.max(4, w * value), 8, 4); ctx.fill();
    ctx.fillStyle = '#e8e0cc';
    ctx.beginPath(); ctx.arc(x + w * value, y + 12, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#57b894';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + w * value, y + 12, 9, 0, TAU); ctx.stroke();
    this.sliderRegs.push({ x, y: y - 6, w, h: 36, set });
  },

  // A checkbox with label; returns width consumed.
  check(ctx, x, y, checked, cb, label) {
    ctx.fillStyle = checked ? '#2c4a3a' : '#241f30';
    rr(ctx, x, y, 22, 22, 5); ctx.fill();
    ctx.strokeStyle = checked ? '#57b894' : '#4a4356';
    ctx.lineWidth = 2;
    rr(ctx, x, y, 22, 22, 5); ctx.stroke();
    if (checked) {
      ctx.strokeStyle = '#6ff7c3';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 11); ctx.lineTo(x + 9, y + 16); ctx.lineTo(x + 17, y + 6);
      ctx.stroke();
    }
    if (label) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText(label, x + 30, y + 12);
    }
    this.register(x - 6, y - 6, (label ? 34 + ctx.measureText(label || '').width : 22) + 12, 34, cb);
  },

  click(x, y) {
    // Regions registered before an overlay (HUD, camp buttons) are
    // unreachable while the overlay is up — no tapping "through" menus.
    const overlayUp = this.screen || (Game.playerDeadT || 0) > 0;
    const gate = overlayUp ? this.overlayBarrier : 0;
    for (let i = this.hits.length - 1; i >= gate; i--) {
      const r = this.hits[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        r.cb();
        AudioSys.sfx('click');
        return true;
      }
    }
    if (this.screen) {
      // Dead space INSIDE a popup panel just swallows the tap; only taps
      // outside the panel close the menu (reward stays until its button).
      for (const r of this.panelRects || []) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
      }
      if (this.screen !== 'reward') this.close();
      return true;
    }
    if ((Game.playerDeadT || 0) > 0) return true;
    return false;
  },

  open(screen) {
    this.screen = screen;
    this.sel = {};
  },

  close() {
    this.screen = null;
    this.sel = {};
  },

  toast(text, color) {
    this.toasts.push({ text, color, until: (Game.time || 0) + 3 });
    if (this.toasts.length > 4) this.toasts.shift();
  },

  // A standard chunky button; draws and registers in one call.
  btn(ctx, x, y, w, h, label, cb, o = {}) {
    ctx.fillStyle = o.disabled ? 'rgba(30,26,38,0.9)' : (o.bg || 'rgba(44,38,58,0.95)');
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = o.disabled ? '#3a3448' : (o.border || '#6b5f80');
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.fillStyle = o.disabled ? '#5c5569' : (o.color || '#e8e0cc');
    ctx.font = `${o.bold === false ? '' : 'bold '}${o.size || 14}px Georgia`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    if (!o.disabled && cb) this.register(x, y, w, h, cb);
  },

  panel(ctx, x, y, w, h, title) {
    (this.panelRects = this.panelRects || []).push({ x, y, w, h });
    ctx.fillStyle = 'rgba(10,7,14,0.94)';
    rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = '#4a4356';
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 12); ctx.stroke();
    if (title) {
      ctx.fillStyle = '#c9bfa8';
      ctx.font = 'bold 17px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(title, x + w / 2, y + 22);
      ctx.strokeStyle = '#3a3448';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 16, y + 38); ctx.lineTo(x + w - 16, y + 38); ctx.stroke();
    }
  },

  // ---------------------------------------------------------------- layout

  layout(W, H) {
    this.buttons = [];
    const safe = this.safe = Game.safe || { top: 0, right: 0, bottom: 0, left: 0 };
    const scale = clamp(Math.min(W, H) / 420, 0.85, 1.35);
    const px = W - 84 * scale - safe.right;
    const py = H - 90 * scale - safe.bottom * 0.7;
    this.buttons.push({ x: px, y: py, r: 42 * scale, slot: 0 });
    const R = 106 * scale;
    const angles = [Math.PI * 0.98, Math.PI * 1.14, Math.PI * 1.30, Math.PI * 1.46, Math.PI * 1.62];
    for (let i = 0; i < 5; i++) {
      this.buttons.push({
        x: px + Math.cos(angles[i]) * R,
        y: py + Math.sin(angles[i]) * R,
        r: 27 * scale,
        slot: i + 1
      });
    }
    // Potion sits on the cluster arc, outside skill slot 1 (no overlap).
    const pa = Math.PI * 0.98, pr = R + 54 * scale;
    this.potionBtn = { x: px + Math.cos(pa) * pr, y: py + Math.sin(pa) * pr + 20 * scale, r: 22 * scale };
    this.menuBtn = { x: W - 30 - safe.right, y: 26 + safe.top, r: 18 };
  },

  buttonAt(x, y) {
    for (const b of this.buttons) {
      if (dist(x, y, b.x, b.y) < b.r * 1.22) return b.slot;
    }
    return null;
  },

  portraitHit(x, y) {
    const s = this.safe || { top: 0, left: 0 };
    return dist(x, y, 40 + s.left, 38 + s.top) < 36;
  },

  // ------------------------------------------------------------------ draw

  draw(ctx, W, H) {
    this.clearHits();
    if (Game.state === 'menu') {
      Screens.title(ctx, W, H);
      if (this.screen) {
        this.overlayBarrier = this.hits.length;
        Screens.draw(ctx, W, H);
      }
      return;
    }
    if (Game.state === 'camp' || Game.state === 'map') {
      if (Game.state === 'camp') Screens.camp(ctx, W, H);
      else Screens.map(ctx, W, H);
      if (this.screen) {
        this.overlayBarrier = this.hits.length;
        Screens.draw(ctx, W, H);
      }
      this.drawToasts(ctx, W);
      return;
    }

    // ---- playing ----
    const p = Game.player;
    if (!p) return;
    this.drawTopBar(ctx, W, H, p);
    this.drawObjective(ctx, W, H);
    this.drawMinimap(ctx, W, H);
    this.drawBossBar(ctx, W, H);
    if (Settings.g.showFps) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#57b894';
      ctx.fillText(Math.round(Game.fps) + ' fps', 8 + (this.safe ? this.safe.left : 0), H - 12);
    }
    if (Game.cheats.god || Game.cheats.essence) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = '#e04a5a';
      ctx.fillText('DEV' + (Game.cheats.god ? ' · GOD' : '') + (Game.cheats.essence ? ' · ∞' : ''), W / 2, H - 12);
    }
    this.drawToasts(ctx, W);
    this.drawJoystick(ctx);
    this.drawSkillButtons(ctx, p);
    this.drawPotion(ctx, p);
    this.drawMenuButton(ctx);
    this.drawBanner(ctx, W, H);

    if (Game.playerDeadT > 0) {
      this.overlayBarrier = this.hits.length;
      Screens.death(ctx, W, H);
    } else if (this.screen) {
      this.overlayBarrier = this.hits.length;
      Screens.draw(ctx, W, H);
    }
  },

  // ------------------------------------------------------------- HUD parts

  drawTopBar(ctx, W, H, p) {
    const s = this.safe || { top: 0, left: 0 };
    const x0 = 14 + s.left, y0 = 12 + s.top;
    ctx.fillStyle = 'rgba(8,5,12,0.8)';
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 26, 27, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5c5569';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 26, 27, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#142020';
    ctx.beginPath(); ctx.arc(x0 + 26, y0 + 24, 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(x0 + 21, y0 + 23, 2.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x0 + 31, y0 + 23, 2.2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1c1622';
    ctx.beginPath(); ctx.arc(x0 + 45, y0 + 44, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x0 + 45, y0 + 44, 11, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Hero.level, x0 + 45, y0 + 45);
    this.register(x0, y0, 62, 62, () => { if (!UI.screen) UI.open('radial'); else UI.close(); });

    const bx = x0 + 62, bw = Math.min(180, W * 0.30);
    this.bar(ctx, bx, y0 + 8, bw, 13, p.hp / p.maxHp, '#9c2733', '#e04a5a', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    this.bar(ctx, bx, y0 + 25, bw, 10, p.essence / p.maxEssence, '#1e5e6e', '#4ecbe0', Math.floor(p.essence));
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, y0 + 39, bw, 4);
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(bx, y0 + 39, bw * clamp(Hero.xp / XP_CURVE(Hero.level), 0, 1), 4);
    if (p.shield > 0) {
      ctx.fillStyle = 'rgba(232,224,204,0.9)';
      ctx.fillRect(bx, y0 + 5, bw * clamp(p.shield / (p.shieldMax + Hero.level), 0, 1), 2.5);
    }
    // Gold under the bars.
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText(Hero.gold + ' g', bx, y0 + 56);
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

  drawObjective(ctx, W, H) {
    const s = this.safe || { top: 0, left: 0 };
    const st = s.top;
    ctx.textBaseline = 'middle';
    if (Game.riftMode) {
      // Rift: a progress bar is the objective.
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = '#b06adf';
      ctx.fillText(Game.zone.name + '  ·  ' + DIFFICULTIES[Hero.difficulty].name, W / 2, 16 + st);
      const bw = Math.min(240, W * 0.36);
      if (Game.bossDead) {
        ctx.font = '12px Georgia';
        ctx.fillText('Enter the portal', W / 2, 33 + st);
      } else if (Game.guardianUp) {
        ctx.font = '12px Georgia';
        ctx.fillStyle = '#e04a5a';
        ctx.fillText('Slay ' + Game.zone.boss, W / 2, 33 + st);
      } else {
        this.bar(ctx, W / 2 - bw / 2, 27 + st, bw, 10, Game.riftProgress / 100, '#5a2a7a', '#b06adf',
          Math.floor(Game.riftProgress) + '%');
      }
      if (Game.guardianUp || Game.bossDead) this.drawObjectiveArrow(ctx, W, H);
      return;
    }
    if (W < 560) {
      // Narrow phones: a single bounty line under the bars (the zone name
      // shows in the entry banner and the pause menu).
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = Game.bossDead ? '#b06adf' : '#ffb43a';
      ctx.fillText(Game.bossDead ? '◈ Enter the portal' : '☠ ' + Game.zone.boss, 14 + s.left, 86 + st);
    } else {
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText(Game.zone.name + '  ·  ' + DIFFICULTIES[Hero.difficulty].name, W / 2, 16 + st);
      ctx.font = '12px Georgia';
      ctx.fillStyle = Game.bossDead ? '#b06adf' : '#ffb43a';
      ctx.fillText(Game.bossDead ? 'Enter the portal' : 'Bounty: slay ' + Game.zone.boss, W / 2, 33 + st);
    }
    this.drawObjectiveArrow(ctx, W, H);
  },

  drawObjectiveArrow(ctx, W, H) {
    // Chevron pointing at the objective.
    const p = Game.player;
    const tgt = Game.bossDead ? World.portal : World.bossPos;
    if (!tgt || p.dead) return;
    const d = dist(p.x, p.y, tgt.x, tgt.y);
    if (d < 320) return;
    const a = angleTo(p.x, p.y, tgt.x, tgt.y);
    const sx = p.x - Game.camera.x + Math.cos(a) * 74;
    const sy = p.y - Game.camera.y + Math.sin(a) * 74;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(Game.time * 5);
    ctx.strokeStyle = Game.bossDead ? '#b06adf' : '#ffb43a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -8); ctx.lineTo(4, 0); ctx.lineTo(-6, 8);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  drawMinimap(ctx, W, H) {
    const s = this.safe || { top: 0, right: 0 };
    const S = Math.min(Settings.g.bigMinimap ? 160 : 110, W * (Settings.g.bigMinimap ? 0.3 : 0.2));
    const x0 = W - S - 12 - s.right, y0 = 48 + s.top;
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#08060c';
    rr(ctx, x0 - 3, y0 - 3, S + 6, S + 6, 6); ctx.fill();
    const sx = S / World.cols, sy = S / World.rows;
    for (let cy = 0; cy < World.rows; cy++) {
      for (let cx = 0; cx < World.cols; cx++) {
        if (!World.explored[cy * World.cols + cx]) continue;
        ctx.fillStyle = World.walls && World.isWall(cx, cy) ? '#241f30' : '#4a4258';
        ctx.fillRect(x0 + cx * sx, y0 + cy * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
    const dot = (wx, wy, col, r = 2.5) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x0 + wx / World.W * S, y0 + wy / World.H * S, r, 0, TAU);
      ctx.fill();
    };
    for (const o of World.objects) {
      if (o.used || o.type === 'urn') continue;
      const cell = World.explored[Math.floor(o.y / CELL) * World.cols + Math.floor(o.x / CELL)];
      if (cell) dot(o.x, o.y, o.type === 'chest' ? '#ffd76a' : o.type === 'vendor' ? '#ffb43a' : '#6ff7c3', o.type === 'vendor' ? 3 : 2);
    }
    if (Game.bossDead && World.portal) dot(World.portal.x, World.portal.y, '#b06adf', 3.5);
    else if (!Game.riftMode || Game.guardianUp) dot(World.bossPos.x, World.bossPos.y, '#e04a5a', 3);
    dot(Game.player.x, Game.player.y, '#e8e0cc', 3);
    ctx.globalAlpha = 1;
  },

  drawBossBar(ctx, W, H) {
    let boss = null;
    for (const e of Game.enemies) {
      if (e.unique && !e.dead && !e.sleep) boss = e;
    }
    if (!boss) return;
    const w = Math.min(360, W * 0.5);
    const x = W / 2 - w / 2, y = 46 + (this.safe || { top: 0 }).top;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px Georgia';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(boss.name, W / 2, y);
    ctx.fillStyle = '#ff8c2a';
    ctx.fillText(boss.name, W / 2, y);
    this.bar(ctx, x, y + 10, w, 9, boss.hp / boss.maxHp, '#7a1220', '#c22843');
  },

  drawToasts(ctx, W) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      if (this.toasts[i].until < Game.time) this.toasts.splice(i, 1);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px Georgia';
    const st = (this.safe || { top: 0 }).top;
    this.toasts.forEach((t, i) => {
      const left = t.until - Game.time;
      ctx.globalAlpha = clamp(left / 0.5, 0, 1);
      const y = 68 + st + i * 19;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(t.text, W / 2, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, W / 2, y);
    });
    ctx.globalAlpha = 1;
  },

  drawJoystick(ctx) {
    const j = Input.joy;
    if (!j.active && Settings.g.fixedJoy && Game.state === 'playing' && !this.screen) {
      const a = Input.fixedAnchor();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#c9bfa8';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, 52, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(a.x, a.y, 22, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
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

  drawSkillButtons(ctx, p) {
    for (const b of this.buttons) {
      const s = Skills.slotSkill(b.slot);
      const held = Input.skillHeld(b.slot);

      ctx.globalAlpha = 0.82;
      const g = ctx.createRadialGradient(b.x, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, held ? '#2e2a3a' : '#211c2b');
      g.addColorStop(1, '#0d0a12');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();

      if (!s) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#3a3448';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#3a3448';
        ctx.font = `${Math.round(b.r * 0.8)}px Georgia`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', b.x, b.y);
        ctx.globalAlpha = 1;
        continue;
      }

      const cd = Skills.cds[s.id] || 0;
      const cost = Skills.costFor(s);
      const affordable = p.essence >= cost;

      ctx.globalAlpha = affordable ? 0.95 : 0.35;
      SKILL_ICONS[s.id](ctx, b.x, b.y, b.r * 0.92);

      if (cd > 0.05) {
        const frac = cd / Skills.cdFor(s);
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = '#05030a';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(frac, 0, 1));
        ctx.closePath(); ctx.fill();
        if (cd > 0.9) {
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = '#e8e0cc';
          ctx.font = `bold ${Math.round(b.r * 0.5)}px Georgia`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(Math.ceil(cd), b.x, b.y);
        }
      }

      ctx.globalAlpha = 1;
      ctx.lineWidth = b.slot === 0 ? 3 : 2.5;
      ctx.strokeStyle = !affordable ? '#28506e'
        : (cd > 0.05 ? '#3a3448' : (held ? '#a8ffe0' : '#57b894'));
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();

      if (cost > 0) {
        ctx.fillStyle = affordable ? '#4ecbe0' : '#28506e';
        ctx.font = `bold ${Math.round(b.r * 0.32)}px Georgia`;
        ctx.textAlign = 'center';
        ctx.fillText(cost, b.x, b.y + b.r * 0.66);
      }
    }
    ctx.globalAlpha = 1;
  },

  drawPotion(ctx, p) {
    const b = this.potionBtn;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1a1016';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    // Flask.
    ctx.fillStyle = p.potionCd > 0 ? '#5e2a33' : '#c22843';
    ctx.beginPath(); ctx.arc(b.x, b.y + 3, b.r * 0.45, 0, TAU); ctx.fill();
    ctx.fillRect(b.x - 3, b.y - b.r * 0.6, 6, b.r * 0.5);
    ctx.fillStyle = '#8a6f4a';
    ctx.fillRect(b.x - 4, b.y - b.r * 0.68, 8, 4);
    if (p.potionCd > 0) {
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * (p.potionCd / 25));
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#e8e0cc';
      ctx.font = `bold ${Math.round(b.r * 0.55)}px Georgia`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(p.potionCd), b.x, b.y);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.potionCd > 0 ? '#3a3448' : '#8a4550';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    this.register(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, () => p.drinkPotion());
  },

  drawMenuButton(ctx) {
    const b = this.menuBtn;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#1c1622';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5c5569';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#c9bfa8';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(b.x - 7, b.y + i * 5);
      ctx.lineTo(b.x + 7, b.y + i * 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.register(b.x - b.r - 4, b.y - b.r - 4, b.r * 2 + 8, b.r * 2 + 8,
      () => { UI.screen === 'pause' ? UI.close() : UI.open('pause'); });
  },

  drawBanner(ctx, W, H) {
    if (!Game.banner.t || Game.banner.t <= 0) return;
    const k = Game.banner.t / Game.banner.maxT;
    const a = k > 0.85 ? (1 - k) / 0.15 : (k < 0.25 ? k / 0.25 : 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 32px Georgia';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(Game.banner.text, W / 2, H * 0.30);
    ctx.fillStyle = '#c22843';
    ctx.fillText(Game.banner.text, W / 2, H * 0.30);
    if (Game.banner.sub) {
      ctx.font = '15px Georgia';
      ctx.strokeText(Game.banner.sub, W / 2, H * 0.30 + 30);
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText(Game.banner.sub, W / 2, H * 0.30 + 30);
    }
    ctx.globalAlpha = 1;
  }
};
