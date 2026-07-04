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
    this.tipHover = null;
  },

  // Desktop hover help: if the mouse is inside this rect, remember its tooltip.
  // The last (topmost) matching rect each frame wins.
  tip(x, y, w, h, title, desc) {
    if (!this.desktop || (!title && !desc)) return;
    const m = Input.mousePos;
    if (m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h) this.tipHover = { title, desc };
  },

  drawTooltip(ctx, W, H) {
    const t = this.tipHover;
    if (!t) return;
    const m = Input.mousePos;
    const maxW = 250;
    ctx.font = '12px Georgia';
    const words = (t.desc || '').split(' ');
    const lines = [];
    let line = '';
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; }
      else line = test;
    }
    if (line) lines.push(line);
    ctx.font = 'bold 13px Georgia';
    const titleW = t.title ? ctx.measureText(t.title).width : 0;
    ctx.font = '12px Georgia';
    let bodyW = 0;
    for (const ln of lines) bodyW = Math.max(bodyW, ctx.measureText(ln).width);
    const boxW = Math.min(maxW + 20, Math.max(titleW, bodyW) + 20);
    const boxH = 10 + (t.title ? 18 : 0) + lines.length * 15;
    let bx = m.x + 16, by = m.y + 8;
    if (bx + boxW > W - 6) bx = m.x - boxW - 12;
    if (by + boxH > H - 6) by = H - boxH - 6;
    if (bx < 6) bx = 6;
    ctx.fillStyle = 'rgba(8,5,12,0.97)';
    rr(ctx, bx, by, boxW, boxH, 6); ctx.fill();
    ctx.strokeStyle = '#6b5f80'; ctx.lineWidth = 1.5;
    rr(ctx, bx, by, boxW, boxH, 6); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    let ty = by + 7;
    if (t.title) {
      ctx.font = 'bold 13px Georgia'; ctx.fillStyle = '#e8e0cc';
      ctx.fillText(t.title, bx + 10, ty); ty += 18;
    }
    ctx.font = '12px Georgia'; ctx.fillStyle = '#b5ab94';
    for (const ln of lines) { ctx.fillText(ln, bx + 10, ty); ty += 15; }
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
      // Menus never close from stray taps — only the red ✕, Escape, or
      // their own buttons dismiss them. Swallow everything else.
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
    this.townMode = false;   // leaving any menu ends town-portal navigation
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
    const bold = o.bold === false ? '' : 'bold ';
    // Auto-fit the label to the button width so nothing overflows on mobile:
    // shrink the font first, then ellipsize as a last resort.
    let size = o.size || 14;
    const maxW = w - 14;
    ctx.font = `${bold}${size}px Georgia`;
    while (size > 8 && ctx.measureText(label).width > maxW) {
      size--; ctx.font = `${bold}${size}px Georgia`;
    }
    let text = label;
    if (ctx.measureText(text).width > maxW) {
      while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
      text += '…';
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = label; // findable in tests
    }
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
    // Desktop (mouse) gets the Diablo bottom bar + globes; touch keeps the
    // twin-stick radial cluster.
    this.desktop = !Input.touchMode && W >= 760;
    this.menuBtn = { x: W - 30 - safe.right, y: 26 + safe.top, r: 18 };

    if (this.desktop) {
      // One centered cluster: [health globe] [1 2 3 4 + LMB/RMB] [essence globe] [potion].
      const gr = this.globeR = Math.min(52, H * 0.11);
      const s = 26, gap = 12, potR = 24;
      const order = [0, 2, 3, 4, 5, 1]; // LMB · 1 · 2 · 3 · 4 · RMB
      const barW = order.length * s * 2 + (order.length - 1) * gap;
      const groupW = 2 * gr + gap + barW + gap + 2 * gr + gap + 2 * potR;
      const cy = H - 20 - gr - safe.bottom;
      let x = W / 2 - groupW / 2;
      this.hpGlobe = { x: x + gr, y: cy, r: gr }; x += 2 * gr + gap;
      order.forEach((slot, i) => {
        this.buttons.push({ x: x + s + i * (s * 2 + gap), y: cy, r: s, slot });
      });
      x += barW + gap;
      this.essGlobe = { x: x + gr, y: cy, r: gr }; x += 2 * gr + gap;
      this.potionBtn = { x: x + potR, y: cy, r: potR };
      this.xpBar = { x: this.hpGlobe.x - gr, w: (this.potionBtn.x + potR) - (this.hpGlobe.x - gr), y: H - 8 - safe.bottom };
      return;
    }

    const scale = clamp(Math.min(W, H) / 420, 0.85, 1.35);
    const px = W - 84 * scale - safe.right;
    const py = H - 90 * scale - safe.bottom * 0.7;
    this.buttons.push({ x: px, y: py, r: 42 * scale, slot: 0 });
    const R = 106 * scale;
    // Slot 1 (SECONDARY, right click on desktop) floats above the cluster.
    const sa = Math.PI * 1.55, sr = R + 58 * scale;
    this.buttons.push({
      x: Math.min(px + Math.cos(sa) * sr, W - 32 * scale - safe.right),
      y: py + Math.sin(sa) * sr,
      r: 30 * scale,
      slot: 1
    });
    const angles = [Math.PI * 0.98, Math.PI * 1.16, Math.PI * 1.34, Math.PI * 1.52];
    for (let i = 0; i < 4; i++) {
      this.buttons.push({
        x: px + Math.cos(angles[i]) * R,
        y: py + Math.sin(angles[i]) * R,
        r: 27 * scale,
        slot: i + 2
      });
    }
    // Potion sits on the cluster arc, outside skill slot 1 (no overlap).
    const pa = Math.PI * 0.98, pr = R + 54 * scale;
    this.potionBtn = { x: px + Math.cos(pa) * pr, y: py + Math.sin(pa) * pr + 20 * scale, r: 22 * scale };
  },

  // Key label shown on a desktop action-bar slot.
  slotKeyLabel(slot) {
    return slot === 0 ? 'LMB' : slot === 1 ? 'RMB' : String(slot - 1);
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
        this.drawGlobalClose(ctx, W);
      }
      return;
    }
    if (Game.state === 'camp' || Game.state === 'map') {
      if (Game.state === 'camp') Screens.camp(ctx, W, H);
      else Screens.map(ctx, W, H);
      if (this.screen) {
        this.overlayBarrier = this.hits.length;
        Screens.draw(ctx, W, H);
        this.drawGlobalClose(ctx, W);
      }
      this.drawToasts(ctx, W);
      this.drawTooltip(ctx, W, H);
      return;
    }

    // ---- playing ----
    const p = Game.player;
    if (!p) return;
    if (this.desktop) this.drawDesktopHud(ctx, W, H, p);
    else this.drawTopBar(ctx, W, H, p);
    this.drawObjective(ctx, W, H);
    this.drawMinimap(ctx, W, H);
    this.drawDpsMeter(ctx, W, H);
    this.drawBossBar(ctx, W, H);
    if (Settings.g.showFps) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#57b894';
      ctx.fillText(Math.round(Game.fps) + ' fps', 8 + (this.safe ? this.safe.left : 0), H - 12);
    }
    if (Hero.cheats.god || Hero.cheats.essence) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = '#e04a5a';
      ctx.fillText('DEV' + (Hero.cheats.god ? ' · GOD' : '') + (Hero.cheats.essence ? ' · ∞' : ''), W / 2, H - 12);
    }
    if (!this.desktop) this.drawJoystick(ctx);
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
      this.drawGlobalClose(ctx, W);
    }
    this.drawToasts(ctx, W);   // above menus, at the bottom of the screen
    this.drawTooltip(ctx, W, H);
  },

  // Every open menu gets the same red ✕, drawn ABOVE all of its content
  // (some panels used to paint over their own close button on phones).
  drawGlobalClose(ctx, W) {
    const s = this.safe || { top: 0, right: 0 };
    // Town-portal navigation: the artisans & stash opened from town return TO
    // town on ✕; town itself (and its ✕) exits back to the wilds.
    let cb;
    // The recipe book always returns to the Cube (whether in town or camp).
    if (this.screen === 'recipes') cb = () => this.open('cube');
    // The skill/rune chooser always returns to the skills screen.
    else if (this.screen === 'skillChooser') cb = () => this.open('skills');
    // The Story menu returns to The Wilds.
    else if (this.screen === 'storyacts') cb = () => this.open('wilds');
    else if (this.townMode) {
      if (this.screen === 'town') cb = () => { this.townMode = false; this.close(); };
      else if (['smith', 'jeweler', 'mystic', 'stash', 'torches', 'radial', 'cube'].includes(this.screen)) cb = () => this.open('town');
    }
    Screens.closeX(ctx, W, { x: W - 26 - s.right, y: 26 + s.top, cb });
  },

  // ------------------------------------------------------------- HUD parts

  // Diablo-style desktop HUD: a health globe, an essence globe and a yellow
  // experience bar framing the action bar.
  drawDesktopHud(ctx, W, H, p) {
    const hg = this.hpGlobe, eg = this.essGlobe;
    const hpF = clamp((p.hpDisplay === undefined ? p.hp : p.hpDisplay) / p.maxHp, 0, 1);
    const esF = clamp((p.essDisplay === undefined ? p.essence : p.essDisplay) / p.maxEssence, 0, 1);
    this.drawGlobe(ctx, hg, hpF, '#4a0c14', '#e0402f', Math.ceil(Math.max(0, p.hp)));
    this.drawGlobe(ctx, eg, esF, '#0d2e38', '#4ecbe0', Math.floor(p.essence));

    // Shield ripple over the health globe.
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(232,224,204,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hg.x, hg.y, hg.r + 4, -Math.PI / 2,
        -Math.PI / 2 + TAU * clamp(p.shield / (p.shieldMax + Hero.level), 0, 1));
      ctx.stroke();
    }

    // Level badge on the health globe.
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 15px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(Hero.level, hg.x, hg.y - hg.r * 0.42);
    ctx.fillText(Hero.level, hg.x, hg.y - hg.r * 0.42);

    // Gold above the essence globe.
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Hero.gold + ' g', eg.x, eg.y - eg.r - 10);

    // Experience bar under the whole cluster.
    const xb = this.xpBar;
    if (xb && xb.w > 40) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      rr(ctx, xb.x, xb.y - 6, xb.w, 6, 3); ctx.fill();
      ctx.fillStyle = '#ffd76a';
      rr(ctx, xb.x, xb.y - 6, xb.w * clamp(Hero.xp / XP_CURVE(Hero.level), 0, 1), 6, 3); ctx.fill();
    }
  },

  drawGlobe(ctx, g, frac, dark, bright, label) {
    ctx.save();
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU);
    ctx.fillStyle = '#0a070c'; ctx.fill();
    // Liquid fills from the bottom.
    ctx.save();
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r - 3, 0, TAU); ctx.clip();
    const top = g.y + g.r - 2 * g.r * frac;
    const grad = ctx.createLinearGradient(0, g.y - g.r, 0, g.y + g.r);
    grad.addColorStop(0, bright); grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.fillRect(g.x - g.r, top, g.r * 2, g.r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(g.x - g.r, top, g.r * 2, 3);
    ctx.restore();
    // Rim + glass highlight.
    ctx.strokeStyle = '#5c5569'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.62, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(label, g.x, g.y + g.r * 0.4);
    ctx.fillText(label, g.x, g.y + g.r * 0.4);
  },

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

    // Stacked bars: red health (full height), then a half-height blue mana
    // bar, then a half-height yellow experience bar (matches the D3 layout).
    const bx = x0 + 62, bw = Math.min(180, W * 0.30);
    const hHp = 14, hSub = 7, gapB = 2;
    this.bar(ctx, bx, y0 + 5, bw, hHp, p.hp / p.maxHp, '#9c2733', '#e04a5a', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    if (p.shield > 0) {
      ctx.fillStyle = 'rgba(232,224,204,0.9)';
      ctx.fillRect(bx, y0 + 2, bw * clamp(p.shield / (p.shieldMax + Hero.level), 0, 1), 2.5);
    }
    const manaY = y0 + 5 + hHp + gapB;
    this.bar(ctx, bx, manaY, bw, hSub, p.essence / p.maxEssence, '#1e5e6e', '#4ecbe0');
    const xpY = manaY + hSub + gapB;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    rr(ctx, bx - 1.5, xpY - 1.5, bw + 3, hSub + 3, 3); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(bx, xpY, bw * clamp(Hero.xp / XP_CURVE(Hero.level), 0, 1), hSub);
    // Gold under the bars.
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(Hero.gold + ' g', bx, xpY + hSub + 12);
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
      // A pulsing purple orb-progress bar. On phones it tucks under the
      // portrait/bars (top-left); on desktop/tablet it spans the top-centre.
      const phone = W < 560;
      const frac = clamp(Game.riftProgress / Game.riftGoal, 0, 1);
      const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(Game.time * 5));
      if (Game.bossDead || Game.guardianUp) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px Georgia';
        ctx.fillStyle = Game.bossDead ? '#b06adf' : '#e04a5a';
        ctx.fillText(Game.bossDead ? 'Enter the portal' : 'Slay ' + Game.zone.boss,
          phone ? 90 + (s.left || 0) : W / 2, phone ? 74 + st : 20 + st);
        this.drawObjectiveArrow(ctx, W, H);
        return;
      }
      let bx, by, bw;
      if (phone) { bx = 14 + (s.left || 0); by = 68 + st; bw = Math.min(180, W * 0.42); }
      else { bw = Math.min(300, W * 0.42); bx = W / 2 - bw / 2; by = 22 + st; }
      // Bar background + pulsing fill.
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      rr(ctx, bx - 1.5, by - 1.5, bw + 3, 11, 4); ctx.fill();
      ctx.globalAlpha = pulse;
      const g = ctx.createLinearGradient(bx, by, bx, by + 8);
      g.addColorStop(0, '#d8b4f0'); g.addColorStop(1, '#7a3aa0');
      ctx.fillStyle = g;
      rr(ctx, bx, by, Math.max(2, bw * frac), 8, 3); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(176,106,223,0.7)'; ctx.lineWidth = 1;
      rr(ctx, bx - 1.5, by - 1.5, bw + 3, 11, 4); ctx.stroke();
      ctx.textAlign = phone ? 'left' : 'center';
      ctx.font = 'bold 10px Georgia';
      ctx.fillStyle = '#e8d8f4';
      ctx.fillText('RIFT  ' + Math.floor(Game.riftProgress) + ' / ' + Game.riftGoal,
        phone ? bx : W / 2, by + 20);
      if (!phone) {
        ctx.font = '11px Georgia'; ctx.fillStyle = '#8a7a9a';
        ctx.fillText(Game.zone.name + '  ·  ' + DIFFICULTIES[Hero.difficulty].name, W / 2, by - 12);
      }
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
    // Legendary (orange) & Set (green) drops get a pulsing star on the map.
    for (const pk of Game.pickups) {
      if (pk.gone || pk.kind !== 'item' || !pk.item) continue;
      if (pk.item.rarity >= 4) {
        const col = pk.item.rarity === 6 ? '#ff3b3b' : pk.item.rarity >= 5 ? '#4ade80' : '#ff8c2a';
        this.star(ctx, x0 + pk.x / World.W * S, y0 + pk.y / World.H * S, col, 4 + Math.sin(Game.time * 6) * 1.2);
      }
    }
    if (Game.bossDead && World.portal) dot(World.portal.x, World.portal.y, '#b06adf', 3.5);
    else if (!Game.riftMode || Game.guardianUp) dot(World.bossPos.x, World.bossPos.y, '#e04a5a', 3);
    dot(Game.player.x, Game.player.y, '#e8e0cc', 3);
    ctx.globalAlpha = 1;
  },

  // A small 5-point star (loot beacon marker on the minimap).
  star(ctx, cx, cy, col, r) {
    ctx.save();
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr2 = i % 2 ? r * 0.44 : r;
      const px = cx + Math.cos(a) * rr2, py = cy + Math.sin(a) * rr2;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  // Optional DPS meter — sits under the minimap by default, movable when
  // unlocked (drag it anywhere; the padlock toggles lock).
  drawDpsMeter(ctx, W, H) {
    if (!Settings.g.dpsMeter || Game.state !== 'playing') return;
    const now = Game.time || 0, win = 2;
    const hits = Game.dpsHits;
    while (hits.length && hits[0].t < now - win) hits.shift();
    let sum = 0; for (const h of hits) sum += h.d;
    const dps = Math.round(sum / win);
    const w = 120, h = 34;
    const s = this.safe || { top: 0, right: 0 };
    const S = Math.min(Settings.g.bigMinimap ? 160 : 110, W * (Settings.g.bigMinimap ? 0.3 : 0.2));
    const defX = W - S - 12 - s.right;
    const defY = 48 + s.top + S + 6 + 8;
    const x = clamp(Settings.g.dpsX != null ? Settings.g.dpsX : defX, 4, W - w - 4);
    const y = clamp(Settings.g.dpsY != null ? Settings.g.dpsY : defY, 40, H - h - 4);
    this.dpsRect = { x, y, w, h, lx: x + w - 24, ly: y + 4 };
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(8,6,12,0.85)';
    rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = Settings.g.dpsLocked ? 'rgba(107,95,128,0.7)' : 'rgba(111,247,195,0.85)';
    ctx.lineWidth = 1.5; rr(ctx, x, y, w, h, 6); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '9px Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText('DPS', x + 9, y + 10);
    ctx.font = 'bold 16px Georgia'; ctx.fillStyle = '#ffb43a';
    ctx.fillText(String(dps), x + 9, y + 23);
    this.drawLockIcon(ctx, x + w - 13, y + h / 2, Settings.g.dpsLocked);
    this.register(x + w - 24, y + 4, 24, h - 8, () => { Settings.g.dpsLocked = !Settings.g.dpsLocked; Settings.save(); });
    ctx.globalAlpha = 1;
  },

  // A little padlock — closed shackle when locked, open when unlocked.
  drawLockIcon(ctx, cx, cy, locked) {
    ctx.save();
    ctx.strokeStyle = locked ? '#9a9080' : '#6ff7c3';
    ctx.fillStyle = locked ? '#9a9080' : '#6ff7c3';
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    // Shackle.
    ctx.beginPath();
    if (locked) ctx.arc(cx, cy - 3, 3.2, Math.PI, 0);
    else ctx.arc(cx + 3, cy - 3, 3.2, Math.PI * 0.9, -0.2);
    ctx.stroke();
    if (locked) { ctx.beginPath(); ctx.moveTo(cx - 3.2, cy - 3); ctx.lineTo(cx - 3.2, cy); ctx.moveTo(cx + 3.2, cy - 3); ctx.lineTo(cx + 3.2, cy); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(cx + 6.2, cy - 3); ctx.lineTo(cx + 6.2, cy - 1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 3.2, cy - 1); ctx.lineTo(cx - 3.2, cy); ctx.stroke(); }
    // Body.
    ctx.fillRect(cx - 4, cy, 8, 6.5);
    ctx.restore();
  },

  // ---- DPS meter dragging (mouse + touch) ----
  startDpsDrag(x, y, id) {
    if (Settings.g.dpsLocked || !Settings.g.dpsMeter) return false;
    const r = this.dpsRect;
    if (!r) return false;
    if (x >= r.lx && x <= r.lx + 24 && y >= r.ly && y <= r.ly + (r.h - 8)) return false; // lock icon → tap
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      this.dpsDrag = { id, offx: x - r.x, offy: y - r.y };
      return true;
    }
    return false;
  },
  moveDps(x, y) {
    if (!this.dpsDrag) return;
    Settings.g.dpsX = x - this.dpsDrag.offx;
    Settings.g.dpsY = y - this.dpsDrag.offy;
  },
  endDps() { if (this.dpsDrag) { this.dpsDrag = null; Settings.save(); } },

  // ---- Generic menu drag-scroll (mouse + touch) ----
  // Any overlay that sets `UI.sel.scrollRegion` (+ scrollY/scrollMax each frame)
  // becomes scrollable: a touch/drag that starts inside the region scrolls it
  // instead of firing a button; a tap that never moves is forwarded to click()
  // on release, so buttons still work. Used by the inventory and the Mystic.
  startDragScroll(x, y, id) {
    const r = this.sel.scrollRegion;
    if (!r) return false;
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return false;
    this.dragScroll = { id, sx: x, sy: y, start: this.sel.scrollY || 0, moved: false };
    return true;
  },
  moveDragScroll(x, y) {
    const d = this.dragScroll; if (!d) return;
    if (Math.abs(y - d.sy) > 6 || Math.abs(x - d.sx) > 6) d.moved = true;
    this.sel.scrollY = clamp(d.start - (y - d.sy), 0, this.sel.scrollMax || 0);
  },
  endDragScroll(x, y) {
    const d = this.dragScroll; if (!d) return;
    this.dragScroll = null;
    if (!d.moved) this.click(d.sx, d.sy);   // it was a tap, not a scroll
  },
  // Desktop mouse-wheel over a scrollable overlay.
  wheelScroll(dy) {
    if (!this.sel.scrollRegion) return false;
    this.sel.scrollY = clamp((this.sel.scrollY || 0) + dy, 0, this.sel.scrollMax || 0);
    return true;
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

  // A feed of loot / salvage / forge / enchant messages, pinned to the BOTTOM
  // of the screen and drawn above menus so it's visible inside the artisans.
  drawToasts(ctx, W) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      if (this.toasts[i].until < Game.time) this.toasts.splice(i, 1);
    }
    if (!this.toasts.length) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px Georgia';
    const sb = (this.safe || { bottom: 0 }).bottom || 0;
    const st = (this.safe || { top: 0 }).top || 0;
    const n = this.toasts.length;
    const H = Game.H || 700;
    // Anchor position (owner setting): top / middle / bottom.
    const pos = Settings.g.lootPos || 'bottom';
    const anchorY = pos === 'top' ? 96 + st
      : pos === 'middle' ? H * 0.44
      : H - (this.desktop ? 116 : 30) - sb;
    const dir = pos === 'top' ? 1 : -1;   // stack away from the anchored edge
    const arc = Settings.g.lootStyle === 'arc';
    this.toasts.forEach((t, i) => {
      const left = t.until - Game.time;
      ctx.globalAlpha = clamp(left / 0.5, 0, 1);
      let x = W / 2, y;
      if (arc) {
        // Fan the messages along a shallow arc that bows off the anchor edge.
        const rel = i - (n - 1) / 2;
        x = W / 2 + rel * Math.min(140, W * 0.2);
        y = anchorY + dir * (rel * rel) * 9;
      } else {
        y = anchorY + dir * (n - 1 - i) * 24;   // straight column
      }
      const tw = ctx.measureText(t.text).width;
      ctx.fillStyle = 'rgba(6,4,10,0.85)';
      rr(ctx, x - tw / 2 - 12, y - 11, tw + 24, 22, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      rr(ctx, x - tw / 2 - 12, y - 11, tw + 24, 22, 7); ctx.stroke();
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, y);
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

      // Desktop action bar: the bound key under each slot (LMB · 1-4 · RMB).
      if (this.desktop) {
        ctx.fillStyle = '#9a9080';
        ctx.font = 'bold 10px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.slotKeyLabel(b.slot), b.x, b.y + b.r + 9);
      }

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
      drawSkillIcon(ctx, s.id, b.x, b.y, b.r * 0.92);

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
      this.tip(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, s.name, SKILL_DESCS[s.id]);
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
    const maxW = W - 32;
    // Auto-shrink both lines so long land names never run off a phone screen.
    let ts = 32;
    ctx.font = 'bold ' + ts + 'px Georgia';
    while (ts > 15 && ctx.measureText(Game.banner.text).width > maxW) { ts -= 1; ctx.font = 'bold ' + ts + 'px Georgia'; }
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(Game.banner.text, W / 2, H * 0.30);
    ctx.fillStyle = '#c22843';
    ctx.fillText(Game.banner.text, W / 2, H * 0.30);
    if (Game.banner.sub) {
      let ss = 15;
      ctx.font = ss + 'px Georgia';
      while (ss > 10 && ctx.measureText(Game.banner.sub).width > maxW) { ss -= 1; ctx.font = ss + 'px Georgia'; }
      ctx.lineWidth = 4;
      ctx.strokeText(Game.banner.sub, W / 2, H * 0.30 + 30);
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText(Game.banner.sub, W / 2, H * 0.30 + 30);
    }
    ctx.globalAlpha = 1;
  }
};
