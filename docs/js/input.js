'use strict';
// ---------------------------------------------------------------------------
// Twin-stick unified input.
//  - Left half: movement joystick. Right half (off the buttons): aim stick —
//    the hero faces that way and fires the primary while held.
//  - Skill cluster: tap = quick-cast (auto-aim); press-drag = aim, release to
//    cast that way. Channelled skills (Siphon Blood) fire while held.
//  - Every menu tap routes through UI.click()'s tap registry.
//  - Desktop: WASD moves, mouse aims/fires, Space/J primary, 1-5 skills,
//    Q potion, I inventory, K skills, Esc menu, M mute.
// ---------------------------------------------------------------------------

const Input = {
  move: { x: 0, y: 0 },
  keys: {},
  joy: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  aim: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 1 },
  buttonTouches: new Map(),           // touch id -> {slot, sx, sy, angle, aiming}
  castQueue: [],                      // {slot, angle|null}
  heldSlots: new Set(),
  mousePrimary: false,
  mouseSlot: undefined,
  mousePos: { x: 0, y: 0 },

  gameplayLive() {
    return Game.state === 'playing' && !UI.screen && Game.playerDeadT <= 0;
  },

  init(canvas) {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyM') AudioSys.enabled = !AudioSys.enabled;
      if (Game.state === 'playing') {
        if (e.code === 'KeyI') UI.screen === 'radial' ? UI.close() : UI.open('radial');
        if (e.code === 'KeyK') UI.screen === 'skills' ? UI.close() : UI.open('skills');
        if (e.code === 'Escape') UI.screen ? UI.close() : UI.open('pause');
        if (e.code === 'KeyQ' && this.gameplayLive()) Game.player.drinkPotion();
      } else if (e.code === 'Escape' && UI.screen) {
        UI.close();
      }
      if (this.gameplayLive()) {
        if (e.code === 'Space' || e.code === 'KeyJ') this.castQueue.push({ slot: 0, angle: null });
        const m = /^Digit([1-5])$/.exec(e.code);
        if (m) {
          const s = Skills.slotSkill(+m[1]);
          if (s && !s.channel) this.castQueue.push({ slot: +m[1], angle: null });
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
    });
    canvas.addEventListener('mousedown', e => {
      AudioSys.init();
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
    window.addEventListener('mouseup', () => {
      this.mousePrimary = false;
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
    this.castQueue.length = 0;
    this.mousePrimary = false;
    this.mouseSlot = undefined;
    this.joy.active = false; this.joy.id = null;
    this.aim.active = false; this.aim.id = null;
  },

  onTouchStart(e) {
    AudioSys.init();
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (UI.click(x, y)) continue;
      if (!this.gameplayLive()) continue;
      const slot = UI.buttonAt(x, y);
      if (slot !== null) {
        this.buttonTouches.set(t.identifier, { slot, sx: x, sy: y, angle: null, aiming: false });
        if (slot === 0) this.heldSlots.add(0);
      } else if (!this.joy.active && x < Game.W * 0.5) {
        this.joy.active = true;
        this.joy.id = t.identifier;
        this.joy.ox = x; this.joy.oy = y;
        this.joy.dx = 0; this.joy.dy = 0;
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

  update() {
    let kx = 0, ky = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) ky -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) ky += 1;
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
    if (slot === 0) return this.mousePrimary || !!this.keys['Space'] || !!this.keys['KeyJ'];
    return !!this.keys['Digit' + slot];
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
