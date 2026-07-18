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
    this.introShowing = false;   // set by Screens.artisanIntro while it draws
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
  // Faded bone + blood styling (owner rule v1.7.15 — no garish blue/green).
  slider(ctx, x, y, w, value, set) {
    ctx.fillStyle = '#221b16';
    rr(ctx, x, y + 8, w, 8, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(138,111,74,0.45)'; ctx.lineWidth = 1;
    rr(ctx, x, y + 8, w, 8, 4); ctx.stroke();
    ctx.fillStyle = '#6e262d';
    rr(ctx, x, y + 8, Math.max(4, w * value), 8, 4); ctx.fill();
    ctx.fillStyle = '#cfc8b8';
    ctx.beginPath(); ctx.arc(x + w * value, y + 12, 9, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a2026';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + w * value, y + 12, 9, 0, TAU); ctx.stroke();
    this.sliderRegs.push({ x, y: y - 6, w, h: 36, set });
  },

  // A checkbox with label; the box is the owner's painted square plate
  // (check.webp, v1.7.15) with a bone-white tick, procedural until loaded.
  check(ctx, x, y, checked, cb, label) {
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('check') : null;
    if (img) {
      const bh = 20, bw2 = Math.round(bh * (img.width / img.height));
      ctx.drawImage(img, x + 11 - bw2 / 2, y + 1, bw2, bh);
    } else {
      ctx.fillStyle = checked ? '#2e2620' : '#241f30';
      rr(ctx, x, y, 22, 22, 5); ctx.fill();
      ctx.strokeStyle = checked ? '#8a6f4a' : '#4a4356';
      ctx.lineWidth = 2;
      rr(ctx, x, y, 22, 22, 5); ctx.stroke();
    }
    if (checked) {
      ctx.strokeStyle = '#cfc8b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 11); ctx.lineTo(x + 10, y + 16); ctx.lineTo(x + 17, y + 6);
      ctx.stroke();
    }
    if (label) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '12px Cinzel, Georgia';
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
    // A held attack must not survive into (and out of) a menu.
    if (typeof Input !== 'undefined' && Input.releaseCombat) Input.releaseCombat();
  },

  close() {
    this.screen = null;
    this.sel = {};
  },

  // Screens that are pure MENUS (owner rule): the red ✕ / Escape is the only
  // way out (straight back to the playable screen) — no round EXIT button.
  MENU_SCREENS: ['sysmenu', 'character', 'radial', 'invGrouped', 'journal',
    'skills', 'skillChooser', 'achievements', 'settings', 'paragon',
    'wilds', 'storyacts',
    // The Enchantress's benches shed the round EXIT too (owner rule v1.7.0)
    // — their ✕ rides the panel corner and Escape returns to the hub.
    'mysEnchant', 'mysPet', 'mysWings', 'mysTheme', 'patchnotes', 'devconfirm'],

  // The navigation for the red ✕ / Escape on the CURRENT screen. Most screens
  // just close, but a few step back to a parent menu instead:
  //  · recipes → Cube, skillChooser → skills, storyacts → wilds
  // Returns a callback so both the ✕ and the Escape key run identical logic.
  closeAction() {
    // Settings opened from the creation screen's gear returns there.
    if (this.screen === 'settings' && this.settingsBack) {
      const back = this.settingsBack;
      return () => { this.settingsBack = null; this.open(back); };
    }
    if (this.screen === 'recipes') return () => this.open('cube');
    if (this.screen === 'skillChooser') return () => this.open('skills');
    if (this.screen === 'storyacts') return () => this.open('wilds');
    // ☰ MENU children step back to the ROOT MENU so the other options stay in
    // reach; closing the menu itself exits to the playable screen (owner rule
    // v1.6.84 — supersedes the close-straight-to-game behavior of v1.6.77).
    if (['character', 'radial', 'invGrouped', 'journal', 'skills',
         'achievements', 'settings', 'paragon'].includes(this.screen))
      return () => this.open('sysmenu');
    // Artisan sub-screens step back to their HUB (the shop interior stays up —
    // owner rule: closing a bench shows the background art again). Arriving
    // FROM a bench skips the welcome splash (sel.inside) — you're already in.
    const backToHub = hub => () => { this.open(hub); this.sel.inside = true; };
    if (['smithSalvage', 'smithWeapon', 'smithArmor', 'torches', 'smithRepair'].includes(this.screen)) return backToHub('smith');
    if (['jewSocket', 'jewUnsocket', 'jewMerge', 'jewSell', 'jewCraft'].includes(this.screen)) return backToHub('jeweler');
    if (['mysEnchant', 'mysPet', 'mysWings', 'mysTheme'].includes(this.screen)) return backToHub('mystic');
    return () => this.close();
  },

  toast(text, color) {
    this.toasts.push({ text, color, until: (Game.time || 0) + 3 });
    if (this.toasts.length > 4) this.toasts.shift();
  },

  // A standard chunky button; draws and registers in one call.
  // The active UI theme (Mystic ▸ Themes). Falls back to Bone before data loads.
  theme() {
    let id = (typeof Settings !== 'undefined' && Settings.g && Settings.g.theme) || 'void';
    // Legacy theme ids: pre-plate (arcane/royal) and the v1.6.83 'violet'
    // (renamed Void in v1.6.85, the new default).
    if (id === 'arcane' || id === 'violet') id = 'void';
    if (id === 'royal') id = 'ember';
    return (typeof THEMES !== 'undefined' && (THEMES[id] || THEMES.void)) ||
      { panel: '#4a4356', title: '#c9bfa8', btn: '#6b5f80' };
  },

  // Plates idle DARK (the neutral art); the theme's colored glow shows only
  // on mouse hover (owner rule). hover=true resolves the themed recolor.
  plateImg(hover) {
    if (typeof Game === 'undefined' || !Game.uiImg) return null;
    const th = this.theme();
    if (hover && th.plate) return Game.uiImg('button_' + th.plate) || Game.uiImg('button');
    return Game.uiImg('button') || (th.plate && Game.uiImg('button_' + th.plate));
  },

  btn(ctx, x, y, w, h, label, cb, o = {}) {
    ctx.fillStyle = o.disabled ? 'rgba(30,26,38,0.9)' : (o.bg || 'rgba(44,38,58,0.95)');
    rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = o.disabled ? '#3a3448' : (o.border || this.theme().btn);
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.fillStyle = o.disabled ? '#5c5569' : (o.color || '#e8e0cc');
    const bold = o.bold === false ? '' : 'bold ';
    // Auto-fit the label to the button width so nothing overflows on mobile:
    // shrink the font first, then ellipsize as a last resort.
    let size = o.size || 14;
    const maxW = w - 14;
    ctx.font = `${bold}${size}px Cinzel, Georgia`;
    while (size > 8 && ctx.measureText(label).width > maxW) {
      size--; ctx.font = `${bold}${size}px Cinzel, Georgia`;
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
      // Desktop hover help: every button surfaces a tooltip — the FULL (un-fitted)
      // label as the title, plus an optional o.tip description. No-op on touch.
      if (o.tip !== false) this.tip(x, y, w, h, o.tipTitle || label, o.tip || '');
    }
  },

  panel(ctx, x, y, w, h, title) {
    (this.panelRects = this.panelRects || []).push({ x, y, w, h });
    const th = this.theme();
    const art = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('panel') : null;
    if (art) {
      // The owner's painted frame, 9-sliced: ornamental corners stay 1:1,
      // edge strips stretch, the middle is a flat dark fill (never stretch
      // the painted interior — it carries baked-in content).
      // TOTAL BLACK interior (owner rule v1.7.17 — no purple rectangle).
      ctx.fillStyle = 'rgba(2,1,4,0.96)';
      rr(ctx, x + 6, y + 6, w - 12, h - 12, 10); ctx.fill();
      this.drawNine(ctx, art, x, y, w, h, 46);
    } else {
      ctx.fillStyle = 'rgba(2,1,4,0.96)';
      rr(ctx, x, y, w, h, 12); ctx.fill();
      ctx.strokeStyle = th.panel;
      ctx.lineWidth = 2;
      rr(ctx, x, y, w, h, 12); ctx.stroke();
    }
    if (title) {
      // Panel titles wear the plate style everywhere: Cinzel caps in
      // parchment gold (owner rule — never the theme's colored font).
      // v1.7.15: sit lower in the header band (they rode the carved top
      // border) and SHRINK to fit beside the ✕ — titles never overflow.
      let txt = String(title).toUpperCase();
      let fs = 17;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const maxW = w - 96;
      do {
        ctx.font = '600 ' + fs + 'px Cinzel, Georgia';
        if (ctx.measureText(txt).width <= maxW || fs <= 11) break;
        fs--;
      } while (true);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(txt, x + w / 2, y + 27.5);
      ctx.fillStyle = '#dcc9a2';
      ctx.fillText(txt, x + w / 2, y + 26);
      ctx.strokeStyle = '#3a3448';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 16, y + 40); ctx.lineTo(x + w - 16, y + 40); ctx.stroke();
    }
  },

  // ---------------------------------------------------------------- layout

  layout(W, H) {
    this.buttons = [];
    const safe = this.safe = Game.safe || { top: 0, right: 0, bottom: 0, left: 0 };
    // Desktop (mouse) gets the Diablo bottom bar + globes; touch keeps the
    // twin-stick radial cluster.
    // Desktop globe HUD when on a mouse device, OR when a tablet user forces it
    // on via the dev panel (v1.7.29 — it auto-shrinks to fit below).
    const forceHud = typeof Settings !== 'undefined' && Settings.g && Settings.g.forceDesktopHud;
    this.desktop = (forceHud || !Input.touchMode) && W >= 760;
    this.menuBtn = { x: W - 30 - safe.right, y: 26 + safe.top, r: 18 };

    if (this.desktop) {
      // NEW HUD (v1.7.26 owner art), bottom-centered. The essence potion
      // MIRRORS the health potion (v1.7.28 owner rule):
      //   [health globe] [health potion] [ skill bar + XP ] [essence potion] [essence globe]
      let gr = this.globeR = Math.min(56, H * 0.12);
      let s = 26, gap = 12, potR = 24;
      const order = [0, 2, 3, 4, 5, 1]; // LMB · 1 · 2 · 3 · 4 · RMB
      const measure = () => 2 * gr + gap + 2 * potR + gap +
        (order.length * s * 2 + (order.length - 1) * gap) + gap + 2 * potR + gap + 2 * gr;
      // Fit-to-width: if the cluster is wider than the screen (a narrow tablet
      // forcing the desktop HUD), scale every element down until it fits — no
      // clipping (owner rule v1.7.29).
      const avail = W - 16 - safe.left - safe.right;
      let groupW = measure();
      if (groupW > avail) {
        const k = avail / groupW;
        gr = this.globeR = Math.max(28, gr * k);
        s = Math.max(15, s * k); potR = Math.max(14, potR * k); gap = Math.max(6, gap * k);
        groupW = measure();
      }
      const barW = order.length * s * 2 + (order.length - 1) * gap;
      // The ring art overhangs the globe circle (skull spikes ~1.4×R below),
      // so seat the cluster high enough that the bottom spikes stay on-screen.
      const cy = H - safe.bottom - Math.ceil(1.42 * gr) - 8;
      let x = W / 2 - groupW / 2;
      this.hpGlobe = { x: x + gr, y: cy, r: gr }; x += 2 * gr + gap;
      this.potionBtn = { x: x + potR, y: cy, r: potR }; x += 2 * potR + gap;
      const barX = x;
      order.forEach((slot, i) => {
        this.buttons.push({ x: x + s + i * (s * 2 + gap), y: cy, r: s, slot });
      });
      x += barW + gap;
      // Essence potion — mirror position, right of the skill bar.
      this.essPotionBtn = { x: x + potR, y: cy, r: potR }; x += 2 * potR + gap;
      this.essGlobe = { x: x + gr, y: cy, r: gr };
      // Town-portal button stacks above the health potion.
      this.portalHudBtn = { x: this.potionBtn.x, y: cy - 2 * potR - 22, r: potR };
      // XP bar rides ON TOP of the skill bar, spanning its width.
      this.xpBar = { x: barX - s, w: barW + 2 * s, y: cy - s - 16 };
      return;
    }
    this.essPotionBtn = null;   // touch HUD keeps just the health potion

    const scale = clamp(Math.min(W, H) / 420, 0.85, 1.35);
    const px = W - 84 * scale - safe.right;
    const py = H - 90 * scale - safe.bottom * 0.7;
    this.buttons.push({ x: px, y: py, r: 42 * scale, slot: 0 });
    const R = 106 * scale;
    // Slot 1 (SECONDARY, right click on desktop) floats above the cluster —
    // pushed a little higher so its frame clears the top arc slot (v1.7.30).
    const sa = Math.PI * 1.55, sr = R + 70 * scale;
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
    // Town-portal button stacks directly above the potion (same proven column).
    const portR = 20 * scale;
    this.portalHudBtn = { x: this.potionBtn.x, y: this.potionBtn.y - (this.potionBtn.r + portR + 30 * scale), r: portR };
    // LEFT-HANDED mode (Settings ▸ Gameplay, owner rule): the whole action
    // cluster mirrors to the LEFT side of the screen; movement moves to the
    // right half (input.js). Everything keeps its proven geometry — just flipped.
    if (typeof Settings !== 'undefined' && Settings.g && Settings.g.leftHanded) {
      for (const b of this.buttons) b.x = W - b.x;
      this.potionBtn.x = W - this.potionBtn.x;
      this.portalHudBtn.x = W - this.portalHudBtn.x;
    }
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

    if (Game.state === 'town') {
      // New Haven: overlays (open shop screens) + the movement joystick, but none
      // of the combat HUD. The ENTER button (bottom-right, where the primary
      // skill sits) walks you into the building you're standing at; while inside
      // it flips to EXIT (owner rule — the button IS the doorway).
      if (this.screen) {
        this.overlayBarrier = this.hits.length;
        Screens.draw(ctx, W, H);
        this.drawGlobalClose(ctx, W);
        // Pure MENU screens rely on the red ✕ alone (owner rule — no round
        // EXIT button); doorway screens (shops, stash, NPCs) keep it.
        if (!this.MENU_SCREENS.includes(this.screen) && !this.introShowing)
          this.drawTownEnter(ctx, W, H, true);   // EXIT — registered above the barrier
      } else {
        if (!this.desktop) this.drawJoystick(ctx);
        // Top-left: ☰ MENU (camp hub: skills/paragon/character/settings) + 🎒.
        const s = this.safe || { top: 0, left: 0 };
        this.btnPlate2(ctx, 12 + s.left, 40 + s.top, 96, 30, 'MENU', () => UI.open('sysmenu'),
          { size: 12, color: '#c9bfa8' });
        // (The 🎒 inventory shortcut beside MENU was deleted — owner rule;
        // Inventory lives in the ☰ MENU.)
        if (Game.townPrompt) this.drawTownEnter(ctx, W, H, false);
      }
      // FPS in town too, bottom-left (owner rule v1.7.18).
      if (Settings.g.showFps) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '11px Georgia';
        ctx.fillStyle = '#57b894';
        ctx.fillText(Math.round(Game.fps) + ' fps', 8 + (this.safe ? this.safe.left : 0), H - 12);
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
    this.drawQuestTracker(ctx, W, H);   // active quests ride under the map (owner rule)
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
    this.drawPortalButton(ctx, p);
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

  // New Haven's ENTER/EXIT button — a big round action button at the primary-
  // skill position (bottom-right). Outside: shows the doorway you're standing at
  // and ENTERs it. Inside a shop: flips to EXIT. Also fired by the primary key.
  drawTownEnter(ctx, W, H, inside) {
    const s = this.safe || { top: 0, right: 0, bottom: 0, left: 0 };
    const r = 38;
    const lefty = typeof Settings !== 'undefined' && Settings.g && Settings.g.leftHanded;
    const cx = lefty ? 66 + (s.left || 0) : W - 66 - s.right;
    const cy = H - 92 - (s.bottom || 0);
    const it = Game.townPrompt;
    // NPCs get a speech verb instead of a doorway verb (owner rule: walking up
    // to Lukus turns the button into "Talk to Lukus").
    const talk = !inside && it && (it.kind === 'lukus' || it.kind === 'addy' || it.kind === 'lyssa');
    // The fountain gets its own medallion — a skeleton hand tossing a coin
    // (v1.6.98 owner art).
    const wish = !inside && it && it.kind === 'fountain';
    const lbl = inside ? 'EXIT' : talk ? 'TALK' : wish ? 'WISH' : 'ENTER';
    const art = (typeof Game !== 'undefined' && Game.uiImg)
      ? Game.uiImg(inside ? 'exit' : talk ? 'talk' : wish ? 'fountain' : 'enter') : null;
    if (art) {
      // The owner's painted medallions: lit doorway = ENTER, dark = EXIT,
      // speech-bubble ring = TALK (NPCs).
      const breathe = inside ? 1 : (0.94 + 0.06 * Math.sin(Game.time * 4));
      const d = r * 2.45 * breathe;
      ctx.save();
      ctx.drawImage(art, cx - d / 2, cy - d / 2, d, d);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 12px Cinzel, Georgia';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(lbl, cx, cy + r + 12 + 1.5);
      ctx.fillStyle = inside ? '#e0a24a' : '#f0dcae';
      ctx.fillText(lbl, cx, cy + r + 12);
      ctx.restore();
      this.register(cx - r - 8, cy - r - 8, r * 2 + 16, r * 2 + 16, () => Game.townEnter());
      return;
    }
    const color = inside ? '#e0a24a' : (it ? it.color : '#6ff7c3');
    const pulse = 0.75 + 0.25 * Math.sin(Game.time * 4);
    ctx.save();
    ctx.fillStyle = 'rgba(14,10,20,0.9)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = pulse;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '20px Georgia'; ctx.fillStyle = color;
    ctx.fillText(inside ? '⏏' : talk ? '💬' : (it ? it.icon : '➜'), cx, cy - 9);
    ctx.font = 'bold 11px Georgia';
    ctx.fillText(lbl, cx, cy + 13);
    // (no grey label under the button — the building's name plate says it, owner rule)
    ctx.restore();
    this.register(cx - r - 8, cy - r - 8, r * 2 + 16, r * 2 + 16, () => Game.townEnter());
  },

  // Every open menu gets the same red ✕, drawn ABOVE all of its content
  // (some panels used to paint over their own close button on phones).
  // Screens whose ✕ was removed outright (owner list v1.7.0): the Crucible
  // and the three NPC dialogs keep only Escape / the round EXIT medallion.
  NO_CLOSE_X: ['cube', 'lukus', 'addy', 'lyssa', 'select', 'create'],

  drawGlobalClose(ctx, W) {
    if (this.NO_CLOSE_X.includes(this.screen)) return;
    // The artisan WELCOME splash carries no ✕ at all (owner rule).
    if (this.introShowing) return;
    const s = this.safe || { top: 0, right: 0 };
    // The ✕ plate rides the MENU PANEL's top-right corner (owner rule v1.7.0
    // — "on the menu items they are on, not far away in the corner"); screens
    // that draw no panel fall back to the screen corner.
    // Integrated INTO the title bar (owner rule v1.7.2): the ✕ sits on the
    // same band as the menu title, flush with the panel's right edge.
    // The creation screen's panels are side menus — its ✕ stays in the
    // screen corner instead of riding the gender panel.
    const pr = this.screen === 'create' ? null : (this.panelRects && this.panelRects[0]) || null;
    const x = pr ? Math.min(W - 26 - s.right, pr.x + pr.w - 30) : W - 26 - s.right;
    const y = pr ? pr.y + 26 : 26 + s.top;
    // ✕ and Escape share one navigation policy (see closeAction).
    Screens.closeX(ctx, W, { x, y, cb: this.closeAction() });
  },

  // ------------------------------------------------------------- HUD parts

  // Diablo-style desktop HUD: a health globe, an essence globe and a yellow
  // experience bar framing the action bar.
  drawDesktopHud(ctx, W, H, p) {
    const hg = this.hpGlobe, eg = this.essGlobe;
    const hpF = clamp((p.hpDisplay === undefined ? p.hp : p.hpDisplay) / p.maxHp, 0, 1);
    const esF = clamp((p.essDisplay === undefined ? p.essence : p.essDisplay) / p.maxEssence, 0, 1);

    // The experience / renown bar rides ON TOP of the skill bar (owner art).
    const xb = this.xpBar;
    if (xb && xb.w > 40) {
      let xf;
      if (Hero.level < (typeof MAX_LEVEL !== 'undefined' ? MAX_LEVEL : 70)) {
        xf = clamp(Hero.xp / XP_CURVE(Hero.level), 0, 1);
      } else if ((Hero.paragon || 0) >= (typeof MAX_PARAGON !== 'undefined' ? MAX_PARAGON : 3500)) {
        xf = 1;   // max Renown — the bar stays full
      } else {
        xf = clamp((Hero.paragonXp || 0) / PARAGON_XP(Hero.paragon || 0), 0, 1);
      }
      this.drawXpBar(ctx, xb, xf);
    }

    this.drawGlobe(ctx, hg, hpF, 'red', Math.ceil(Math.max(0, p.hp)));
    this.drawGlobe(ctx, eg, esF, 'blue', Math.floor(p.essence));

    // Shield ripple over the health globe.
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(232,224,204,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hg.x, hg.y, hg.r + 4, -Math.PI / 2,
        -Math.PI / 2 + TAU * clamp(p.shield / (p.shieldMax + Hero.level), 0, 1));
      ctx.stroke();
    }

    // Level (or Renown) badge on the health globe.
    const badge = Hero.level >= (typeof MAX_LEVEL !== 'undefined' ? MAX_LEVEL : 70) && Hero.paragon
      ? 'R' + Hero.paragon : String(Hero.level);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(badge, hg.x, hg.y - hg.r * 0.46);
    ctx.fillText(badge, hg.x, hg.y - hg.r * 0.46);

    // Gold above the essence globe.
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 12px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Hero.gold + ' g', eg.x, eg.y - eg.r - 8);
  },

  // The XP / Renown bar: the owner's dark frame (3-slice) with the purple
  // fill on top, clipped to the fraction (v1.7.26).
  drawXpBar(ctx, xb, frac) {
    const g = (typeof Game !== 'undefined' && Game.hudImg) ? Game.hudImg.bind(Game) : () => null;
    const frame = g('hud_xp_frame'), fill = g('hud_xp_fill');
    const h = 16, x = xb.x, y = xb.y - h / 2, w = xb.w;
    // 1) the frame / track (3-slice: 1:1 ornate ends, stretched middle).
    if (frame && frame.complete && frame.naturalWidth) {
      const sc = frame.width, sch = frame.height, cap = Math.min(w * 0.1, h * (110 / sch));
      ctx.drawImage(frame, 0, 0, 110, sch, x, y, cap, h);
      ctx.drawImage(frame, 110, 0, sc - 220, sch, x + cap, y, w - 2 * cap, h);
      ctx.drawImage(frame, sc - 110, 0, 110, sch, x + w - cap, y, cap, h);
    } else {
      ctx.fillStyle = 'rgba(4,3,7,0.88)'; rr(ctx, x, y, w, h, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(94,78,52,0.6)'; ctx.lineWidth = 1; rr(ctx, x, y, w, h, 4); ctx.stroke();
    }
    // 2) the purple fill on top, inside the frame's groove.
    const inset = 4;
    const fw = (w - 2 * inset) * clamp(frac, 0, 1);
    if (fw > 1) {
      ctx.save();
      ctx.beginPath(); rr(ctx, x + inset, y + inset, fw, h - 2 * inset, 2); ctx.clip();
      if (fill && fill.complete && fill.naturalWidth) {
        for (let tx = 0; tx < w; tx += fill.width) ctx.drawImage(fill, x + inset + tx, y, fill.width, h);
      } else {
        ctx.fillStyle = '#7a2ad0'; ctx.fillRect(x + inset, y + inset, fw, h - 2 * inset);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(222,160,255,0.75)';
      ctx.fillRect(x + inset + fw - 2, y + inset, 2, h - 2 * inset);
    }
  },

  // The owner's painted PLATE BUTTON (UI kit): spiked finial caps, skull
  // crest at centre, cracked-leather bar — drawn as a 5-slice so any width
  // works (caps and crest stay 1:1, the bar runs stretch). Labels render in
  // Cinzel (Trajan-style, self-hosted). Falls back to UI.btn until the art
  // loads. Source fractions measured off the sliced sheet.
  // Cap a LABELED button plate to a natural max width, centered — buttons never
  // stretch menu-wide (owner rule v1.7.47). Empty-label plates (row backgrounds)
  // and callers passing {stretch:true} keep their full width.
  capPlate(x, w, label, o) {
    if (!label || (o && o.stretch)) return { x, w };
    const CAP = 340;
    if (w <= CAP + 40) return { x, w };
    return { x: x + (w - CAP) / 2, w: CAP };
  },

  btnPlate(ctx, x, y, w, h, label, cb, o = {}) {
    ({ x, w } = this.capPlate(x, w, label, o));
    // Hover (mouse only) lights the plate with the theme's glow.
    const mp = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
    const hover = !!(mp && cb && !o.disabled &&
      mp.x >= x && mp.x <= x + w && mp.y >= y && mp.y <= y + h);
    const img = this.plateImg(hover);
    if (!img) return this.btn(ctx, x, y, w, h, label, cb, o);
    const sw = img.width, sh = img.height;
    const capF = 0.15, sk0 = 0.455, sk1 = 0.545;
    // The crest overhangs the bar band (bar ≈ 2/3 of source height): draw the
    // art taller than the logical button so the BAR matches the button rect.
    const dh = h * 1.42, dy = y - (dh - h) / 2;
    const scale = dh / sh;
    let capW = sw * capF * scale, skW = sw * (sk1 - sk0) * scale;
    const k = Math.min(1, (w * 0.72) / (capW * 2 + skW));
    capW *= k; skW *= k;
    const runW = Math.max(0, (w - 2 * capW - skW) / 2);
    if (o.disabled) ctx.globalAlpha = 0.45;
    let dx = x;
    ctx.drawImage(img, 0, 0, sw * capF, sh, dx, dy, capW, dh); dx += capW;
    ctx.drawImage(img, sw * (capF + 0.06), 0, sw * 0.08, sh, dx, dy, runW, dh); dx += runW;
    ctx.drawImage(img, sw * sk0, 0, sw * (sk1 - sk0), sh, dx, dy, skW, dh); dx += skW;
    ctx.drawImage(img, sw * (1 - capF - 0.14), 0, sw * 0.08, sh, dx, dy, runW, dh); dx += runW;
    ctx.drawImage(img, sw * (1 - capF), 0, sw * capF, sh, dx, dy, capW, dh);
    // Label — Trajan-style caps, gold on the dark leather.
    let size = o.size || 15;
    const maxW = w - capW * 2 - 16;
    const text = String(label).toUpperCase();
    ctx.font = `600 ${size}px Cinzel, Georgia`;
    while (size > 9 && ctx.measureText(text).width > maxW) {
      size--; ctx.font = `600 ${size}px Cinzel, Georgia`;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(text, x + w / 2, y + h / 2 + 2.5);
    ctx.fillStyle = o.disabled ? '#6f6552' : (o.color || '#dcc9a2');
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    ctx.globalAlpha = 1;
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = label;
      if (o.tip !== false) this.tip(x, y, w, h, o.tipTitle || label, o.tip || '');
    }
  },

  // The owner's SIMPLE plate (v1.6.96): octagonal-cut frame, a diamond
  // finial at each end, cracked-leather bar — no skull crest. Flat 3-slice
  // (caps 1:1, one clean bar run stretched); the bar IS the full art height
  // so it draws at the button rect (tiny 1.08 overhang for the bevel).
  // Themed glow variants (plate2_<key>.webp) are sliced and STORED but not
  // wired — the owner will point at the specific places later.
  btnPlate2(ctx, x, y, w, h, label, cb, o = {}) {
    ({ x, w } = this.capPlate(x, w, label, o));
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('plate2') : null;
    if (!img) return this.btn(ctx, x, y, w, h, label, cb, o);
    const mp = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
    const hover = !!(mp && cb && !o.disabled &&
      mp.x >= x && mp.x <= x + w && mp.y >= y && mp.y <= y + h);
    // Bone-white hover glow on the campfire/creation menus (owner rule).
    if (hover && (this.screen === 'create' || this.screen === 'select')) this.boneGlow(ctx, x, y, w, h);
    const sw = img.width, sh = img.height;
    const capF = 0.14;
    const dh = h * 1.08, dy = y - (dh - h) / 2;
    let capW = sw * capF * (dh / sh);
    capW = Math.min(capW, w * 0.32);
    const runW = Math.max(0, w - 2 * capW);
    if (o.disabled) ctx.globalAlpha = 0.45;
    ctx.drawImage(img, 0, 0, sw * capF, sh, x, dy, capW, dh);
    ctx.drawImage(img, sw * 0.42, 0, sw * 0.10, sh, x + capW, dy, runW, dh);
    ctx.drawImage(img, sw * (1 - capF), 0, sw * capF, sh, x + w - capW, dy, capW, dh);
    let size = o.size || 15;
    const maxW = w - capW * 2 - 10;
    const text = String(label).toUpperCase();
    ctx.font = `600 ${size}px Cinzel, Georgia`;
    while (size > 9 && ctx.measureText(text).width > maxW) {
      size--; ctx.font = `600 ${size}px Cinzel, Georgia`;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(text, x + w / 2, y + h / 2 + 2.5);
    ctx.fillStyle = o.disabled ? '#6f6552' :
      (hover ? '#f4e6c4' : (o.color || '#dcc9a2'));
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    ctx.globalAlpha = 1;
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = label;
      if (o.tip !== false) this.tip(x, y, w, h, o.tipTitle || label, o.tip || '');
    }
    return true;
  },

  // A soft bone-white glow behind a hovered control (creation/campfire
  // menus, owner rule v1.7.5).
  boneGlow(ctx, x, y, w, h, r = 10) {
    ctx.save();
    ctx.shadowColor = 'rgba(232,226,208,0.75)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'rgba(232,226,208,0.07)';
    rr(ctx, x, y, w, h, r); ctx.fill();
    rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.restore();
  },

  // The GOTHIC plate (v1.6.98 owner art, `plate3.webp`): spiked thorn caps,
  // a small skull crest at the top AND bottom of centre, cracked-stone bar.
  // Same 5-slice discipline as the ornate plate — caps and crest stay 1:1,
  // the two clean bar runs stretch; the crests overhang ~1.48× the button
  // rect. Carries the ☰ MENU rows, artisan bench interiors, Apply/Cancel.
  btnPlate3(ctx, x, y, w, h, label, cb, o = {}) {
    ({ x, w } = this.capPlate(x, w, label, o));
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('plate3') : null;
    if (!img || !img.complete || !img.naturalWidth) return this.btn(ctx, x, y, w, h, label, cb, o);
    const mp = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
    const hover = !!(mp && cb && !o.disabled &&
      mp.x >= x && mp.x <= x + w && mp.y >= y && mp.y <= y + h);
    if (hover && (this.screen === 'create' || this.screen === 'select')) this.boneGlow(ctx, x, y, w, h);
    const sw = img.width, sh = img.height;
    const capF = 0.14, sk0 = 0.45, sk1 = 0.55;
    const dh = h * 1.48, dy = y - (dh - h) / 2;
    const scale = dh / sh;
    let capW = sw * capF * scale, skW = sw * (sk1 - sk0) * scale;
    const k = Math.min(1, (w * 0.72) / (capW * 2 + skW));
    capW *= k; skW *= k;
    const runW = Math.max(0, (w - 2 * capW - skW) / 2);
    if (o.disabled) ctx.globalAlpha = 0.45;
    let dx = x;
    ctx.drawImage(img, 0, 0, sw * capF, sh, dx, dy, capW, dh); dx += capW;
    ctx.drawImage(img, sw * 0.20, 0, sw * 0.08, sh, dx, dy, runW, dh); dx += runW;
    ctx.drawImage(img, sw * sk0, 0, sw * (sk1 - sk0), sh, dx, dy, skW, dh); dx += skW;
    ctx.drawImage(img, sw * 0.72, 0, sw * 0.08, sh, dx, dy, runW, dh); dx += runW;
    ctx.drawImage(img, sw * (1 - capF), 0, sw * capF, sh, dx, dy, capW, dh);
    let size = o.size || 15;
    const maxW = w - capW * 2 - 12;
    const text = String(label).toUpperCase();
    ctx.font = `600 ${size}px Cinzel, Georgia`;
    while (size > 9 && ctx.measureText(text).width > maxW) {
      size--; ctx.font = `600 ${size}px Cinzel, Georgia`;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillText(text, x + w / 2, y + h / 2 + 2.5);
    ctx.fillStyle = o.disabled ? '#6f6552' :
      (hover ? '#f4e6c4' : (o.color || '#dcc9a2'));
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    ctx.globalAlpha = 1;
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = label;
      if (o.tip !== false) this.tip(x, y, w, h, o.tipTitle || label, o.tip || '');
    }
    return true;
  },

  // Small painted ICON PLATES (v1.6.97 owner art): plus / minus etc. Drawn
  // contain-fit in the rect, centered. Returns false when the art isn't
  // loaded yet so the caller can draw its procedural fallback instead.
  iconPlate(ctx, key, x, y, w, h, cb, o = {}) {
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg(key) : null;
    if (!img || !img.complete || !img.naturalWidth) return false;
    const k = Math.min(w / img.width, h / img.height);
    const dw = img.width * k, dh = img.height * k;
    if (o.disabled) ctx.globalAlpha = 0.4;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = o.label || key;
    }
    return true;
  },

  // The small EMPTY VALUE PLATE (v1.6.97 owner art, `chip.webp`): notched-
  // corner frame, blank leather — for little value buttons (Settings' Top
  // Down / Bottom / Straight / cursor 1×, Game creator, patch version).
  // Flat 3-slice + the usual Cinzel label. Falls back to UI.btn.
  chip(ctx, x, y, w, h, label, cb, o = {}) {
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('chip') : null;
    if (!img || !img.complete || !img.naturalWidth) return this.btn(ctx, x, y, w, h, label, cb, o);
    const sw = img.width, sh = img.height;
    const capF = 0.18;
    let capW = sw * capF * (h / sh);
    capW = Math.min(capW, w * 0.3);
    if (o.disabled) ctx.globalAlpha = 0.45;
    ctx.drawImage(img, 0, 0, sw * capF, sh, x, y, capW, h);
    ctx.drawImage(img, sw * 0.40, 0, sw * 0.20, sh, x + capW, y, w - 2 * capW, h);
    ctx.drawImage(img, sw * (1 - capF), 0, sw * capF, sh, x + w - capW, y, capW, h);
    let size = o.size || 12;
    const maxW = w - capW * 2 - 8;
    const text = String(label).toUpperCase();
    ctx.font = `600 ${size}px Cinzel, Georgia`;
    while (size > 8 && ctx.measureText(text).width > maxW) {
      size--; ctx.font = `600 ${size}px Cinzel, Georgia`;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text, x + w / 2, y + h / 2 + 2);
    ctx.fillStyle = o.disabled ? '#6f6552' : (o.color || '#dcc9a2');
    ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
    ctx.globalAlpha = 1;
    if (!o.disabled && cb) {
      this.register(x, y, w, h, cb);
      this.hits[this.hits.length - 1].label = label;
    }
    return true;
  },

  // The round SKILL FRAME (v1.6.97 owner art, `circle.webp`): drawn BEHIND
  // every skill / rune / passive icon circle. The frame's leather centre is
  // ~56% of the art, so 2.35× the icon radius leaves a visible ring of
  // chrome around the glyph. Returns false until the art loads.
  // The painted quatrefoil frame behind a skill/rune/passive circle. `fscale`
  // is the frame diameter relative to r (default 2.35 for menus); the HUD
  // passes a tighter value so adjacent action-bar frames don't overlap
  // (owner rule v1.7.30).
  circleFrame(ctx, cx, cy, r, fscale = 2.35) {
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('circle') : null;
    if (!img || !img.complete || !img.naturalWidth) return false;
    const d = r * fscale;
    ctx.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    return true;
  },

  // 9-slice a painted frame over a rect: corners 1:1, THIN text-free strips
  // (not the full spans, which carry baked-in content) stretched for edges.
  drawNine(ctx, img, x, y, w, h, c) {
    const sw = img.width, sh = img.height;
    const cs = Math.round(Math.min(sw, sh) * 0.17);
    c = Math.max(14, Math.min(c, w * 0.3, h * 0.3));
    const st = 22;
    // Strip sample points chosen from CLEAN border runs (away from the baked
    // title text and the mid-edge gem ornaments).
    const tx = Math.round(sw * 0.28), ly = Math.round(sh * 0.55);
    ctx.drawImage(img, tx, 0, st, cs, x + c, y, w - 2 * c, c);                 // top
    ctx.drawImage(img, tx, sh - cs, st, cs, x + c, y + h - c, w - 2 * c, c);   // bottom
    ctx.drawImage(img, 0, ly, cs, st, x, y + c, c, h - 2 * c);                 // left
    ctx.drawImage(img, sw - cs, ly, cs, st, x + w - c, y + c, c, h - 2 * c);   // right
    ctx.drawImage(img, 0, 0, cs, cs, x, y, c, c);                              // corners
    ctx.drawImage(img, sw - cs, 0, cs, cs, x + w - c, y, c, c);
    ctx.drawImage(img, 0, sh - cs, cs, cs, x, y + h - c, c, c);
    ctx.drawImage(img, sw - cs, sh - cs, cs, cs, x + w - c, y + h - c, c, c);
  },

  // A globe (v1.7.26 owner art): SWIRLING liquid (animated frames, filled to
  // the fraction from the bottom) inside the ornate skull ring frame.
  drawGlobe(ctx, g, frac, kind, label) {
    const R = g.r, gx = g.x, gy = g.y;
    const g2 = (typeof Game !== 'undefined' && Game.hudImg) ? Game.hudImg.bind(Game) : () => null;
    const ring = g2('hud_ring_' + kind);
    // 1) empty dark glass in the hole, then the swirling liquid to the fill.
    ctx.save();
    ctx.beginPath(); ctx.arc(gx, gy, R, 0, TAU); ctx.clip();
    ctx.fillStyle = kind === 'red' ? '#0b0304' : '#030b12';
    ctx.fillRect(gx - R, gy - R, 2 * R, 2 * R);
    const top = gy + R - 2 * R * clamp(frac, 0, 1);
    ctx.beginPath(); ctx.rect(gx - R, top, 2 * R, gy + R - top); ctx.clip();
    this.drawSwirl(ctx, kind, gx, gy, R);
    // a bright meniscus line at the liquid surface
    if (frac > 0.02 && frac < 0.99) {
      ctx.fillStyle = kind === 'red' ? 'rgba(255,120,110,0.5)' : 'rgba(150,210,255,0.5)';
      ctx.fillRect(gx - R, top, 2 * R, 2);
    }
    ctx.restore();
    // 2) the ornate ring on top (its centre is transparent).
    if (ring && ring.complete && ring.naturalWidth) {
      const holeRf = 0.385, cxf = 0.5, cyf = 0.44;
      const dw = R / holeRf, dh = dw * (ring.height / ring.width);
      ctx.drawImage(ring, gx - cxf * dw, gy - cyf * dh, dw, dh);
    } else {
      ctx.strokeStyle = '#5c5569'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(gx, gy, R, 0, TAU); ctx.stroke();
    }
    // 3) the numeric label low in the globe.
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(label, gx, gy + R * 0.4);
    ctx.fillText(label, gx, gy + R * 0.4);
  },

  // The swirling liquid: 20 painted frames cross-faded, over a slow continuous
  // rotation — flows and loops (owner rule: "epic to watch"). Clip to the
  // globe circle before calling.
  drawSwirl(ctx, kind, gx, gy, R) {
    const N = 20, t = (typeof Game !== 'undefined' ? Game.time : 0);
    const f = (t * 10) % N;              // ~10 frames a second
    const i0 = Math.floor(f), k = f - i0;
    const g2 = (typeof Game !== 'undefined' && Game.hudImg) ? Game.hudImg.bind(Game) : () => null;
    const a = g2('swirl_' + kind + i0), b = g2('swirl_' + kind + ((i0 + 1) % N));
    if (!a && !b) {   // art not loaded — a plain tinted fill stands in
      ctx.fillStyle = kind === 'red' ? '#c0202a' : '#2a6ad0';
      ctx.fillRect(gx - R, gy - R, 2 * R, 2 * R);
      return;
    }
    const d = 2 * R * 1.04;
    ctx.save();
    ctx.translate(gx, gy); ctx.rotate(t * 0.18);   // slow, continuous swirl
    if (a && a.complete && a.naturalWidth) { ctx.globalAlpha = 1 - k; ctx.drawImage(a, -d / 2, -d / 2, d, d); }
    if (b && b.complete && b.naturalWidth) { ctx.globalAlpha = k; ctx.drawImage(b, -d / 2, -d / 2, d, d); }
    ctx.restore();
    ctx.globalAlpha = 1;
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
    // Tap the portrait to open the inventory; if a screen is already up, close
    // it the SAME way the red ✕ does (→ the ☰ menu for menu children, owner
    // rule v1.7.29) rather than dropping straight back to combat.
    this.register(x0, y0, 62, 62, () => { if (!UI.screen) UI.open('radial'); else UI.closeAction()(); });

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
      ctx.fillText((Game.bossDead ? '◈ Enter the portal' : '☠ ' + Game.zone.boss)
        + (Game.linkDepth > 0 ? '   ⬇' + Game.linkDepth : ''), 14 + s.left, 86 + st);
    } else {
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = '#c9bfa8';
      const depthTag = Game.linkDepth > 0 ? '   ·   ⬇ Depth ' + Game.linkDepth + '/' + MAX_LINK_DEPTH : '';
      ctx.fillText(Game.zone.name + '  ·  ' + DIFFICULTIES[Hero.difficulty].name + depthTag, W / 2, 16 + st);
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
    // World angle → on-screen angle (tilt squashes the vertical component).
    const as = Math.atan2(Math.sin(a) * Game.viewTilt(), Math.cos(a));
    const hs = Game.worldToScreen(p.x, p.y);
    const sx = hs.x + Math.cos(as) * 74;
    const sy = hs.y + Math.sin(as) * 74;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(as);
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

  // Active-quest tracker under the minimap (owner rule): up to 5 journal
  // quests with live progress. A finished quest flashes GREEN, holds a
  // moment, fades out — and the rows beneath bump up to fill the space
  // (the quest itself stays in the journal for the NPC turn-in).
  qtFade: {},
  drawQuestTracker(ctx, W, H) {
    const jr = (typeof Hero !== 'undefined' && Hero.journal) || [];
    if (!jr.length) { this.qtFade = {}; return; }
    const s = this.safe || { top: 0, right: 0 };
    const S = Math.min(Settings.g.bigMinimap ? 160 : 110, W * (Settings.g.bigMinimap ? 0.3 : 0.2));
    const x0 = W - S - 12 - s.right;
    let y = 48 + s.top + S + 12;
    if (Settings.g.dpsMeter && Settings.g.dpsX == null) y += 42;   // default DPS spot is under the map too
    const t = Game.time || 0;
    let shown = 0;
    ctx.save();
    ctx.textBaseline = 'middle';
    for (const e of jr) {
      if (shown >= 5) break;
      const key = (e.src === 'A' ? 'A' : 'L') + e.idx;
      const q = Hero.questProgress(e);
      if (!q.def) continue;
      let alpha = 1;
      if (q.done) {
        if (!this.qtFade[key]) this.qtFade[key] = t;
        const ft = t - this.qtFade[key];
        if (ft > 2.4) continue;                       // faded away — rows bump up
        alpha = ft < 1.4 ? 1 : Math.max(0, 1 - (ft - 1.4));
      }
      shown++;
      ctx.globalAlpha = 0.85 * alpha;
      ctx.fillStyle = 'rgba(8,6,12,0.72)';
      rr(ctx, x0 - 3, y, S + 6, 24, 5); ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'left';
      ctx.font = '600 9px Cinzel, Georgia';
      ctx.fillStyle = q.done ? '#4ade80' : '#d8c5a0';
      const nm = (typeof Screens !== 'undefined') ? Screens.fitText(ctx, q.def.name, S - 34) : q.def.name;
      ctx.fillText(nm, x0 + 2, y + 8);
      ctx.textAlign = 'right';
      ctx.font = 'bold 9px Georgia';
      ctx.fillStyle = q.done ? '#4ade80' : '#9a9080';
      ctx.fillText(q.done ? '✓' : (q.prog + '/' + q.def.need), x0 + S + 1, y + 8);
      ctx.fillStyle = 'rgba(60,54,74,0.8)';
      rr(ctx, x0 + 2, y + 16, S - 4, 3, 1.5); ctx.fill();
      ctx.fillStyle = q.done ? '#4ade80' : '#c9a84a';
      rr(ctx, x0 + 2, y + 16, Math.max(2, (S - 4) * clamp(q.prog / q.def.need, 0, 1)), 3, 1.5); ctx.fill();
      ctx.globalAlpha = 1;
      y += 28;
    }
    // Forget fade stamps for quests that left the journal (turned in/dropped).
    for (const k of Object.keys(this.qtFade)) {
      if (!jr.some(e => ((e.src === 'A' ? 'A' : 'L') + e.idx) === k)) delete this.qtFade[k];
    }
    ctx.restore();
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
        const col = pk.item.rarity >= 7 ? RARITIES[pk.item.rarity].color
          : pk.item.rarity === 6 ? '#ff3b3b' : pk.item.rarity >= 5 ? '#4ade80' : '#ff8c2a';
        this.star(ctx, x0 + pk.x / World.W * S, y0 + pk.y / World.H * S, col, 4 + Math.sin(Game.time * 6) * 1.2);
      }
    }
    // Map-chaining links (open until the boss falls).
    if (!World.linksClosed) {
      if (World.exit) dot(World.exit.x, World.exit.y, '#8fd0ff', 3);
      if (World.cave) dot(World.cave.x, World.cave.y, '#b06adf', 3);
      if (World.entrance && Game.mapStack && Game.mapStack.length) dot(World.entrance.x, World.entrance.y, '#6ff7c3', 3);
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
  // A screen may also set `UI.sel.scrollRegion2` (+ scrollY2/scrollMax2) for a
  // SECOND independent pane (the achievements category sidebar) — the drag
  // remembers which pane it started in.
  startDragScroll(x, y, id) {
    const inR = r => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    // A visible SCROLLBAR (v1.7.16, achievements): dragging its track moves
    // the content directly — the screen sets UI.sel.scrollBar each frame as
    // {x, y, w, h, ratio} where ratio maps track-pixels → content-pixels.
    const sb = this.sel.scrollBar;
    if (inR(sb)) {
      this.dragScroll = { id, sx: x, sy: y, start: this.sel.scrollY || 0, moved: false,
        yKey: 'scrollY', maxKey: 'scrollMax', bar: true, ratio: sb.ratio || 1 };
      return true;
    }
    let key = null;
    if (inR(this.sel.scrollRegion2)) key = 2;
    else if (inR(this.sel.scrollRegion)) key = 1;
    if (!key) return false;
    const yKey = key === 2 ? 'scrollY2' : 'scrollY';
    this.dragScroll = { id, sx: x, sy: y, start: this.sel[yKey] || 0, moved: false,
      yKey, maxKey: key === 2 ? 'scrollMax2' : 'scrollMax' };
    return true;
  },
  moveDragScroll(x, y) {
    const d = this.dragScroll; if (!d) return;
    if (Math.abs(y - d.sy) > 6 || Math.abs(x - d.sx) > 6) d.moved = true;
    const dy = y - d.sy;
    this.sel[d.yKey] = clamp(d.start + (d.bar ? dy * d.ratio : -dy), 0, this.sel[d.maxKey] || 0);
  },
  endDragScroll(x, y) {
    const d = this.dragScroll; if (!d) return;
    this.dragScroll = null;
    if (!d.moved) this.click(d.sx, d.sy);   // it was a tap, not a scroll
  },
  // THE ART SCROLLBAR (v1.7.25, owner art): a skull thumb on a dark rail with
  // up/down caps, drawn on the right edge of a scroll region `r`. It's fully
  // DRAGGABLE (grab the thumb and fling to the bottom — no wheel needed on
  // touch), and the caps page the view. Sets `sel.scrollBar` for the drag.
  drawScrollbar(ctx, r, scrollY, scrollMax) {
    if (!r || scrollMax <= 0) { this.sel.scrollBar = null; return; }
    const w = 22;
    const x = r.x + r.w - w - 1;
    const g = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg.bind(Game) : () => null;
    const up = g('scroll_up'), dn = g('scroll_down'), sk = g('scroll_skull');
    const capH = up && up.naturalWidth ? Math.round(w * up.height / up.width) : 18;
    const capHd = dn && dn.naturalWidth ? Math.round(w * dn.height / dn.width) : 18;
    const trackTop = r.y + capH + 1, trackBot = r.y + r.h - capHd - 1;
    const trackH = Math.max(12, trackBot - trackTop);
    // dark grooved rail
    ctx.fillStyle = 'rgba(6,4,10,0.78)';
    rr(ctx, x + w / 2 - 4, trackTop, 8, trackH, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(94,78,52,0.45)'; ctx.lineWidth = 1;
    rr(ctx, x + w / 2 - 4, trackTop, 8, trackH, 4); ctx.stroke();
    // the skull thumb, positioned by scroll fraction
    const thumbH = sk && sk.naturalWidth ? Math.round(w * sk.height / sk.width) : 42;
    const th = Math.min(thumbH, trackH);
    const ty = trackTop + (trackH - th) * (scrollMax > 0 ? clamp(scrollY / scrollMax, 0, 1) : 0);
    if (sk && sk.complete && sk.naturalWidth) ctx.drawImage(sk, x, ty, w, th);
    else { ctx.fillStyle = '#6e5a3a'; rr(ctx, x + 3, ty, w - 6, th, 4); ctx.fill(); }
    // up / down caps
    if (up && up.complete && up.naturalWidth) ctx.drawImage(up, x, r.y, w, capH);
    if (dn && dn.complete && dn.naturalWidth) ctx.drawImage(dn, x, r.y + r.h - capHd, w, capHd);
    // draggable thumb/track (grab anywhere on the rail) + arrow paging.
    this.sel.scrollBar = { x: x - 4, y: trackTop, w: w + 8, h: trackH,
      ratio: scrollMax / Math.max(1, trackH - th) };
    const page = Math.max(48, r.h * 0.8);
    this.register(x - 2, r.y, w + 4, capH, () => { this.sel.scrollY = clamp((this.sel.scrollY || 0) - page, 0, scrollMax); });
    this.register(x - 2, r.y + r.h - capHd, w + 4, capHd, () => { this.sel.scrollY = clamp((this.sel.scrollY || 0) + page, 0, scrollMax); });
  },

  // Desktop mouse-wheel over a scrollable overlay. The second pane wins when
  // the cursor hovers it.
  wheelScroll(dy) {
    const r2 = this.sel.scrollRegion2, m = Input.mousePos;
    if (r2 && m && m.x >= r2.x && m.x <= r2.x + r2.w && m.y >= r2.y && m.y <= r2.y + r2.h) {
      this.sel.scrollY2 = clamp((this.sel.scrollY2 || 0) + dy, 0, this.sel.scrollMax2 || 0);
      return true;
    }
    if (!this.sel.scrollRegion) return false;
    this.sel.scrollY = clamp((this.sel.scrollY || 0) + dy, 0, this.sel.scrollMax || 0);
    return true;
  },

  drawBossBar(ctx, W, H) {
    let boss = null;
    for (const e of Game.enemies) {
      if ((e.unique || e.mapBoss || (e.def && e.def.roamBoss)) && !e.dead && !e.sleep) boss = e;
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
  // Greedy word-wrap for a toast so a long message never runs off-screen (no
  // ellipsis — owner rule).
  _wrapToast(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return [text];
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  },

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
    const maxW = Math.min(W - 28, 440);   // keep pills on-screen; wrap past this
    const lineH = 16;
    // Anchor position (owner setting): top / middle / bottom.
    const pos = Settings.g.lootPos || 'bottom';
    const anchorY = pos === 'top' ? 96 + st
      : pos === 'middle' ? H * 0.44
      : H - (this.desktop ? 116 : 30) - sb;
    const dir = pos === 'top' ? 1 : -1;   // stack away from the anchored edge
    const arc = Settings.g.lootStyle === 'arc';
    // Pre-wrap each toast so we can stack them without overlap (taller pills push
    // their neighbours further from the anchor edge; newest stays nearest it).
    const wrapped = this.toasts.map(t => this._wrapToast(ctx, t.text, maxW));
    const offs = [];
    let acc = 0;
    for (let i = n - 1; i >= 0; i--) {
      const bh = wrapped[i].length * lineH + 8;
      offs[i] = acc + bh / 2;
      acc += bh + 6;
    }
    this.toasts.forEach((t, i) => {
      const left = t.until - Game.time;
      ctx.globalAlpha = clamp(left / 0.5, 0, 1);
      const lines = wrapped[i];
      const boxH = lines.length * lineH + 8;
      let x = W / 2, y;
      if (arc) {
        const rel = i - (n - 1) / 2;
        x = W / 2 + rel * Math.min(140, W * 0.2);
        y = anchorY + dir * (rel * rel) * 9;
      } else {
        y = anchorY + dir * offs[i];   // straight column, spaced by real height
      }
      let tw = 0;
      for (const ln of lines) tw = Math.max(tw, ctx.measureText(ln).width);
      ctx.fillStyle = 'rgba(6,4,10,0.85)';
      rr(ctx, x - tw / 2 - 12, y - boxH / 2, tw + 24, boxH, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
      rr(ctx, x - tw / 2 - 12, y - boxH / 2, tw + 24, boxH, 7); ctx.stroke();
      ctx.fillStyle = t.color;
      const startY = y - (lines.length - 1) * lineH / 2;
      for (let li = 0; li < lines.length; li++) ctx.fillText(lines[li], x, startY + li * lineH);
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
      // The painted round frame wraps every skill slot (v1.6.97 owner rule).
      // The HUD uses a tighter frame than menus so the action-bar slots sit
      // NEXT to each other without the ornate rings overlapping (owner rule
      // v1.7.30 — was clipping on tablets).
      ctx.globalAlpha = 1;
      const framed = this.circleFrame(ctx, b.x, b.y, b.r, this.desktop ? 2.15 : 2.05);

      // Desktop action bar: the bound key under each slot (LMB · 1-4 · RMB).
      if (this.desktop) {
        ctx.fillStyle = '#9a9080';
        ctx.font = 'bold 10px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(this.slotKeyLabel(b.slot), b.x, b.y + b.r + 9);
      }

      if (!s) {
        ctx.globalAlpha = 0.5;
        if (!framed) {
          ctx.strokeStyle = '#3a3448';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
        }
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
      // Remaining charges for multi-charge skills (Bone Spirit, Metabolism Blood Rush).
      if (s.charges && Skills.chargeMax(s) > 1) {
        const ch = Skills.charges[s.id];
        const shown = ch === undefined ? Skills.chargeMax(s) : ch;
        ctx.fillStyle = shown > 0 ? '#ffd76a' : '#6a5f45';
        ctx.font = `bold ${Math.round(b.r * 0.5)}px Georgia`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown, b.x + b.r * 0.6, b.y - b.r * 0.6);
      }
      this.tip(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, s.name, SKILL_DESCS[s.id]);
    }
    ctx.globalAlpha = 1;
  },

  drawPotion(ctx, p) {
    // Health potion (left of the skill bar).
    this.drawPotionButton(ctx, this.potionBtn, 'potion_health', 'red',
      p.potionCd, 25, () => p.drinkPotion());
    // Essence potion — mirror slot on the right (desktop HUD only, v1.7.28).
    if (this.essPotionBtn) {
      this.drawPotionButton(ctx, this.essPotionBtn, 'potion_essence', 'blue',
        p.essPotionCd, 25, () => p.drinkEssencePotion());
    }
  },

  // One painted potion button (owner art, advanced-cropped WebP): the flask
  // fills the round hit-area, dimmed with a radial cooldown sweep + seconds
  // while on cooldown. Falls back to a procedural flask until the art loads.
  drawPotionButton(ctx, b, artKey, kind, cd, cdMax, cb) {
    if (!b) return;
    const onCd = cd > 0;
    const img = (typeof Game !== 'undefined' && Game.hudImg) ? Game.hudImg(artKey) : null;
    if (img) {
      // Contain-fit the tall flask into a box a bit larger than the circle.
      const boxH = b.r * 2.5, boxW = boxH * (img.width / img.height);
      ctx.save();
      ctx.globalAlpha = onCd ? 0.5 : 1;
      ctx.drawImage(img, b.x - boxW / 2, b.y - boxH / 2, boxW, boxH);
      ctx.restore();
    } else {
      // Procedural flask fallback.
      const dim = kind === 'red' ? '#5e2a33' : '#22506e';
      const lit = kind === 'red' ? '#c22843' : '#2a86c0';
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#1a1016';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = onCd ? dim : lit;
      ctx.beginPath(); ctx.arc(b.x, b.y + 3, b.r * 0.45, 0, TAU); ctx.fill();
      ctx.fillRect(b.x - 3, b.y - b.r * 0.6, 6, b.r * 0.5);
      ctx.fillStyle = '#8a6f4a';
      ctx.fillRect(b.x - 4, b.y - b.r * 0.68, 8, 4);
      ctx.globalAlpha = 1;
    }
    if (onCd) {
      // Radial darkening sweep + seconds remaining.
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, b.r + 3, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(cd / cdMax, 0, 1));
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#e8e0cc';
      ctx.font = `bold ${Math.round(b.r * 0.6)}px Georgia`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(Math.ceil(cd), b.x, b.y);
      ctx.fillText(Math.ceil(cd), b.x, b.y);
    }
    ctx.globalAlpha = 1;
    this.register(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, cb);
  },

  // The town-portal button, stacked above the potion. Tap to channel a blue
  // portal home (7s); tap again to cancel. Shows the countdown while casting
  // and 'OPEN' once a portal is standing on the map.
  drawPortalButton(ctx, p) {
    const b = this.portalHudBtn;
    if (!b) return;
    const casting = !!Game.portalCast;
    const open = !!(typeof World !== 'undefined' && World.townPortal);
    const cd = Game.portalCd > 0 && !casting && !open ? Game.portalCd : 0;
    const k = casting ? clamp(Game.portalCast.t / 7, 0, 1) : 0;
    const t = Game.time;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = cd > 0 ? '#141018' : '#0e1a26';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.globalAlpha = cd > 0 ? 0.45 : 1;
    // Blue swirl glyph — two spiral arms.
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = open ? '#6ff7c3' : '#4aa3e0';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2.2; a += 0.3) {
        const rr = b.r * 0.22 + a * b.r * 0.055;
        const x = Math.cos(a + t * 1.5 + i * Math.PI) * rr;
        const y = Math.sin(a + t * 1.5 + i * Math.PI) * rr;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Casting countdown ring + seconds remaining.
    if (casting) {
      ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      ctx.fillStyle = '#e8f2ff'; ctx.font = `bold ${Math.round(b.r * 0.62)}px Georgia`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(7 - Game.portalCast.t), b.x, b.y);
    } else if (cd > 0) {
      // Cooldown sweep + seconds remaining after the portal closed.
      ctx.strokeStyle = '#5f7ab0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd / 30)); ctx.stroke();
      ctx.fillStyle = '#c9d4e8'; ctx.font = `bold ${Math.round(b.r * 0.62)}px Georgia`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.ceil(cd), b.x, b.y);
    }
    ctx.strokeStyle = open ? '#57b894' : (casting ? '#8fd0ff' : cd > 0 ? '#3a3448' : '#2a6a8a');
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
    // Label.
    ctx.fillStyle = open ? '#8fe8c8' : '#8fd0ff';
    ctx.font = `bold ${Math.round(b.r * 0.44)}px Georgia`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'OPEN' : 'Portal', b.x, b.y + b.r + Math.round(b.r * 0.5));
    this.register(b.x - b.r - 3, b.y - b.r - 3, b.r * 2 + 6, b.r * 2 + 6, () => Game.castTownPortal());
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
      () => { UI.screen === 'sysmenu' ? UI.close() : UI.open('sysmenu'); });
  },

  drawBanner(ctx, W, H) {
    if (!Game.banner.t || Game.banner.t <= 0) return;
    const k = Game.banner.t / Game.banner.maxT;
    const a = k > 0.85 ? (1 - k) / 0.15 : (k < 0.25 ? k / 0.25 : 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const maxW = W - 32;

    // Greedily split `text` into ≤maxLines lines that each fit maxW at the current
    // font (last line ellipsized if even a single word won't fit) — so a long boss
    // name or subtitle wraps instead of bleeding off a phone screen.
    const wrap = (text, maxLines) => {
      const words = String(text).split(' ');
      const lines = [];
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + ' ' + words[i] : words[i];
        // Break to a new line only while we still have line budget; on the final
        // allowed line we keep accumulating (it gets ellipsized below if needed).
        if (ctx.measureText(test).width > maxW && line && lines.length < maxLines - 1) {
          lines.push(line); line = words[i];
        } else line = test;
      }
      // `line` holds the final (possibly overflowing) line — trim it to fit.
      if (ctx.measureText(line).width > maxW) {
        while (line.length > 1 && ctx.measureText(line + '…').width > maxW) line = line.slice(0, -1);
        line += '…';
      }
      lines.push(line);
      return lines.length ? lines : [String(text)];
    };
    // Shrink the font first; only wrap once we hit the floor and it STILL overflows.
    const fit = (text, maxFont, minFont, maxLines, bold) => {
      let s = maxFont;
      for (; s > minFont; s--) {
        ctx.font = (bold ? 'bold ' : '') + s + 'px Georgia';
        if (ctx.measureText(text).width <= maxW) return { size: s, lines: [text] };
      }
      ctx.font = (bold ? 'bold ' : '') + minFont + 'px Georgia';
      return { size: minFont, lines: wrap(text, maxLines) };
    };

    const cx = W / 2, anchor = H * 0.30;
    const title = fit(Game.banner.text, 32, 15, 2, true);
    const tLineH = title.size * 1.14;
    // Centre the (possibly multi-line) title block on the anchor.
    let ty = anchor - (title.lines.length - 1) * tLineH / 2;
    ctx.font = 'bold ' + title.size + 'px Georgia';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    for (const ln of title.lines) {
      ctx.strokeText(ln, cx, ty);
      ctx.fillStyle = '#c22843';
      ctx.fillText(ln, cx, ty);
      ty += tLineH;
    }
    if (Game.banner.sub) {
      const sub = fit(Game.banner.sub, 15, 10, 2, false);
      const sLineH = sub.size * 1.2;
      let sy = anchor + (title.lines.length - 1) * tLineH / 2 + 30;
      ctx.font = sub.size + 'px Georgia';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      for (const ln of sub.lines) {
        ctx.strokeText(ln, cx, sy);
        ctx.fillStyle = '#c9bfa8';
        ctx.fillText(ln, cx, sy);
        sy += sLineH;
      }
    }
    ctx.globalAlpha = 1;
  }
};
