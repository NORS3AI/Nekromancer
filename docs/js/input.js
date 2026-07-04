'use strict';
// ---------------------------------------------------------------------------
// Twin-stick unified input.
//  - Left half: movement joystick. Right half (off the buttons): aim stick —
//    the hero faces that way and fires the primary while held.
//  - Skill cluster: tap = quick-cast (auto-aim); press-drag = aim, release to
//    cast that way. Channelled skills (Siphon Blood) fire while held.
//  - Every menu tap routes through UI.click()'s tap registry.
//  - Desktop: WASD moves, left click aims/fires the PRIMARY, right click
//    casts the SECONDARY (slot 1), Space/J primary, 1-5 the five skill
//    slots, Q potion, I inventory, K skills, Esc menu, M mute.
//  - Touch: the secondary is its own button above the skill cluster.
// ---------------------------------------------------------------------------

const Input = {
  move: { x: 0, y: 0 },
  keys: {},
  // Touch devices use the twin-stick HUD; mouse devices get the Diablo globes.
  touchMode: (typeof window !== 'undefined') &&
    (('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0)),
  joy: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  aim: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 1 },
  buttonTouches: new Map(),           // touch id -> {slot, sx, sy, angle, aiming}
  castQueue: [],                      // {slot, angle|null}
  heldSlots: new Set(),
  mousePrimary: false,
  mouseSecondary: false,      // right button held (slot 1)
  mouseSlot: undefined,
  mousePos: { x: 0, y: 0 },
  sliderTouches: new Map(),   // touch id -> slider reg
  mouseSlider: null,

  gameplayLive() {
    return Game.state === 'playing' && !UI.screen && Game.playerDeadT <= 0;
  },

  init(canvas) {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      // Keys settings: while listening, the next key binds to the chosen action.
      // ONLY consume a keypress as a rebind while the Keys menu is actually open —
      // otherwise a stray armed rebind could hijack a movement key mid-game and
      // silently steal it (the "WASD stopped working" bug).
      const rebinding = UI.sel && UI.sel.rebindAction &&
        UI.screen === 'settings' && UI.sel.stab === 'keys';
      if (rebinding) {
        if (e.code !== 'Escape') Settings.bindKey(UI.sel.rebindAction, e.code);
        UI.sel.rebindAction = null;
        e.preventDefault();
        return;
      }
      if (UI.sel) UI.sel.rebindAction = null; // clear any stale arm outside the menu
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      const action = Settings.actionFor(e.code);
      if (action === 'mute') AudioSys.enabled = !AudioSys.enabled;

      // Menu shortcuts work both in the field and back at camp.
      if (Game.state === 'playing' || Game.state === 'camp') {
        if (action === 'inventory') UI.screen === 'radial' ? UI.close() : UI.open('radial');
        else if (action === 'skills') {
          if (UI.screen === 'skills' && UI.sel.tab !== 'passives') UI.close();
          else { UI.open('skills'); UI.sel.tab = 'actives'; }
        } else if (action === 'passives') {
          if (UI.screen === 'skills' && UI.sel.tab === 'passives') UI.close();
          else { UI.open('skills'); UI.sel.tab = 'passives'; }
        } else if (action === 'character') UI.screen === 'character' ? UI.close() : UI.open('character');
      }
      if (Game.state === 'playing') {
        if (action === 'pause') UI.screen ? UI.close() : UI.open('pause');
        else if (action === 'potion' && this.gameplayLive()) Game.player.drinkPotion();
      } else if (action === 'pause') {
        if (UI.screen) UI.close();
        else if (Game.state === 'map') Game.state = 'camp';
      }

      if (this.gameplayLive()) {
        if (action === 'primary') this.castQueue.push({ slot: 0, angle: null });
        else if (action && /^skill[1-4]$/.test(action)) {
          const slot = +action.slice(5) + 1;   // skill1 → loadout slot 2 (slot 1 is Secondary)
          const s = Skills.slotSkill(slot);
          if (s && !s.channel) this.castQueue.push({ slot, angle: null });
        }
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    const opts = { passive: false };
    canvas.addEventListener('touchstart', e => { e.preventDefault(); this.onTouchStart(e); }, opts);
    canvas.addEventListener('touchmove', e => { e.preventDefault(); this.onTouchMove(e); }, opts);
    canvas.addEventListener('touchend', e => { e.preventDefault(); this.onTouchEnd(e); }, opts);
    canvas.addEventListener('touchcancel', e => { e.preventDefault(); this.onTouchEnd(e); }, opts);

    canvas.addEventListener('mousemove', e => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      if (UI.dpsDrag) UI.moveDps(e.clientX, e.clientY);
      if (this.mouseSlider) this.mouseSlider.set(clamp((e.clientX - this.mouseSlider.x) / this.mouseSlider.w, 0, 1));
    });
    // Right click is the SECONDARY skill (slot 1), Diablo style.
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => {
      AudioSys.init();
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      if (e.button === 2) {
        if (!this.gameplayLive()) return;
        const s = Skills.slotSkill(1);
        if (!s) return;
        this.mouseSecondary = true; // channelled skills fire while held
        if (!s.channel) this.castQueue.push({ slot: 1, angle: this.mouseAngle() });
        return;
      }
      if (e.button !== 0) return;
      const sl = UI.sliderAt(e.clientX, e.clientY);
      if (sl) {
        this.mouseSlider = sl;
        sl.set(clamp((e.clientX - sl.x) / sl.w, 0, 1));
        return;
      }
      if (UI.startDpsDrag(e.clientX, e.clientY, 'mouse')) return;
      if (UI.click(e.clientX, e.clientY)) return;
      if (!this.gameplayLive()) return;
      const slot = UI.buttonAt(e.clientX, e.clientY);
      if (slot !== null) {
        this.mouseSlot = slot;
        const s = Skills.slotSkill(slot);
        if (slot === 0) this.heldSlots.add(0);
        else if (s && !s.channel) this.castQueue.push({ slot, angle: null });
      } else {
        this.mousePrimary = true;
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 2) {
        this.mouseSecondary = false;
        return;
      }
      if (UI.dpsDrag) UI.endDps();
      this.mousePrimary = false;
      this.mouseSlider = null;
      if (this.mouseSlot !== undefined) {
        this.heldSlots.delete(this.mouseSlot);
        this.mouseSlot = undefined;
      }
    });
    window.addEventListener('blur', () => this.releaseAll());
  },

  releaseAll() {
    this.keys = {};
    this.heldSlots.clear();
    this.buttonTouches.clear();
    this.sliderTouches.clear();
    this.mouseSlider = null;
    this.castQueue.length = 0;
    this.mousePrimary = false;
    this.mouseSecondary = false;
    this.mouseSlot = undefined;
    this.joy.active = false; this.joy.id = null;
    this.aim.active = false; this.aim.id = null;
  },

  // World-space angle from the hero toward the mouse cursor.
  mouseAngle() {
    const p = Game.player;
    if (!p) return null;
    return Math.atan2(
      this.mousePos.y - (p.y - Game.camera.y),
      this.mousePos.x - (p.x - Game.camera.x));
  },

  fixedAnchor() {
    const s = Game.safe || { left: 0, bottom: 0 };
    return { x: 96 + s.left, y: Game.H - 108 - s.bottom };
  },

  onTouchStart(e) {
    this.touchMode = true;   // confirmed a touch device → twin-stick HUD
    AudioSys.init();
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      const sl = UI.sliderAt(x, y);
      if (sl) {
        this.sliderTouches.set(t.identifier, sl);
        sl.set(clamp((x - sl.x) / sl.w, 0, 1));
        continue;
      }
      if (UI.startDpsDrag(x, y, t.identifier)) continue;
      if (UI.click(x, y)) continue;
      if (!this.gameplayLive()) continue;
      const slot = UI.buttonAt(x, y);
      if (slot !== null) {
        this.buttonTouches.set(t.identifier, { slot, sx: x, sy: y, angle: null, aiming: false });
        if (slot === 0) this.heldSlots.add(0);
      } else if (!this.joy.active && x < Game.W * 0.5) {
        this.joy.active = true;
        this.joy.id = t.identifier;
        if (Settings.g.fixedJoy) {
          const a = this.fixedAnchor();
          this.joy.ox = a.x; this.joy.oy = a.y;
          const dx = x - a.x, dy = y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const k = Math.min(1, d / 64);
          this.joy.dx = dx / d * k;
          this.joy.dy = dy / d * k;
        } else {
          this.joy.ox = x; this.joy.oy = y;
          this.joy.dx = 0; this.joy.dy = 0;
        }
      } else if (!this.aim.active) {
        this.aim.active = true;
        this.aim.id = t.identifier;
        this.aim.ox = x; this.aim.oy = y;
        this.heldSlots.add(0);   // aiming also fires the primary
      }
    }
  },

  onTouchMove(e) {
    for (const t of e.changedTouches) {
      if (UI.dpsDrag && UI.dpsDrag.id === t.identifier) { UI.moveDps(t.clientX, t.clientY); continue; }
      const sl = this.sliderTouches.get(t.identifier);
      if (sl) {
        sl.set(clamp((t.clientX - sl.x) / sl.w, 0, 1));
        continue;
      }
      if (t.identifier === this.joy.id) {
        const R = 64;
        let dx = t.clientX - this.joy.ox;
        let dy = t.clientY - this.joy.oy;
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = dx / d * R; dy = dy / d * R; }
        this.joy.dx = dx / R;
        this.joy.dy = dy / R;
        continue;
      }
      if (t.identifier === this.aim.id) {
        const dx = t.clientX - this.aim.ox;
        const dy = t.clientY - this.aim.oy;
        const d = Math.hypot(dx, dy);
        if (d > 10) { this.aim.x = dx / d; this.aim.y = dy / d; }
        continue;
      }
      const bt = this.buttonTouches.get(t.identifier);
      if (bt) {
        const dx = t.clientX - bt.sx;
        const dy = t.clientY - bt.sy;
        if (Math.hypot(dx, dy) > 16) {
          bt.aiming = true;
          bt.angle = Math.atan2(dy, dx);
        }
      }
    }
  },

  onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (UI.dpsDrag && UI.dpsDrag.id === t.identifier) UI.endDps();
      this.sliderTouches.delete(t.identifier);
      if (t.identifier === this.joy.id) {
        this.joy.active = false; this.joy.id = null;
        this.joy.dx = 0; this.joy.dy = 0;
      }
      if (t.identifier === this.aim.id) {
        this.aim.active = false; this.aim.id = null;
        this.releaseHeld(0);
      }
      const bt = this.buttonTouches.get(t.identifier);
      if (bt) {
        this.buttonTouches.delete(t.identifier);
        if (bt.slot === 0) {
          this.releaseHeld(0);
        } else {
          const s = Skills.slotSkill(bt.slot);
          if (s && !s.channel && this.gameplayLive()) {
            this.castQueue.push({ slot: bt.slot, angle: bt.aiming ? bt.angle : null });
          }
        }
      }
    }
  },

  releaseHeld(slot) {
    if (slot === 0 && this.aim.active) return;
    for (const bt of this.buttonTouches.values()) {
      if (bt.slot === slot) return;
    }
    this.heldSlots.delete(slot);
  },

  actionHeld(action) {
    const codes = Settings.keys[action];
    if (!codes) return false;
    for (const c of codes) if (this.keys[c]) return true;
    return false;
  },

  update() {
    let kx = 0, ky = 0;
    if (this.actionHeld('moveLeft')) kx -= 1;
    if (this.actionHeld('moveRight')) kx += 1;
    if (this.actionHeld('moveUp')) ky -= 1;
    if (this.actionHeld('moveDown')) ky += 1;
    if (kx || ky) {
      const d = Math.hypot(kx, ky);
      this.move.x = kx / d;
      this.move.y = ky / d;
    } else if (this.joy.active) {
      this.move.x = this.joy.dx;
      this.move.y = this.joy.dy;
    } else {
      this.move.x = 0;
      this.move.y = 0;
    }
  },

  skillHeld(slot) {
    if (this.heldSlots.has(slot)) return true;
    if (this.mouseSlot === slot) return true;
    for (const bt of this.buttonTouches.values()) {
      if (bt.slot === slot) return true;
    }
    if (slot === 0) return this.mousePrimary || this.actionHeld('primary');
    if (slot === 1) return this.mouseSecondary;
    return this.actionHeld('skill' + (slot - 1));
  },

  heldAngle(slot) {
    for (const bt of this.buttonTouches.values()) {
      if (bt.slot === slot && bt.aiming) return bt.angle;
    }
    return null;
  },

  aimingButton() {
    for (const bt of this.buttonTouches.values()) {
      if (bt.aiming && bt.slot > 0) return bt;
    }
    return null;
  }
};
