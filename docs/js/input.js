'use strict';
// ---------------------------------------------------------------------------
// Unified input: virtual joystick + on-screen skill buttons (touch),
// WASD / arrows + Space / 1-4 keys + mouse (desktop).
// Skill slots: 0 = primary, 1..4 = skills.
// ---------------------------------------------------------------------------

const Input = {
  move: { x: 0, y: 0 },          // normalized movement vector
  keys: {},
  joy: { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 },
  touchSkill: new Map(),          // touch id -> skill slot
  heldSlots: new Set(),           // slots held via touch/mouse buttons
  pendingSlots: [],               // discrete presses, consumed by Skills.update
  mousePrimary: false,
  anyTap: false,                  // consumed by menus each frame

  init(canvas) {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' || e.code === 'Enter') this.anyTap = true;
      if (e.code === 'KeyM') AudioSys.enabled = !AudioSys.enabled;
      if (e.code === 'KeyI' && Game.state === 'playing') UI.showGear = !UI.showGear;
      if (e.code === 'Space' || e.code === 'KeyJ') this.pendingSlots.push(0);
      const m = /^Digit([1-4])$/.exec(e.code);
      if (m) this.pendingSlots.push(+m[1]);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    const opts = { passive: false };
    canvas.addEventListener('touchstart', e => { e.preventDefault(); this.onTouchStart(e); }, opts);
    canvas.addEventListener('touchmove', e => { e.preventDefault(); this.onTouchMove(e); }, opts);
    canvas.addEventListener('touchend', e => { e.preventDefault(); this.onTouchEnd(e); }, opts);
    canvas.addEventListener('touchcancel', e => { e.preventDefault(); this.onTouchEnd(e); }, opts);

    canvas.addEventListener('mousedown', e => {
      this.anyTap = true;
      if (Game.state === 'playing' && UI.portraitHit(e.clientX, e.clientY)) {
        UI.showGear = !UI.showGear;
        return;
      }
      const slot = UI.buttonAt(e.clientX, e.clientY);
      if (slot !== null) {
        this.heldSlots.add(slot);
        this.pendingSlots.push(slot);
        this.mouseSlot = slot;
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
    this.touchSkill.clear();
    this.mousePrimary = false;
    this.joy.active = false;
    this.joy.id = null;
  },

  onTouchStart(e) {
    this.anyTap = true;
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      if (Game.state === 'playing' && UI.portraitHit(x, y)) {
        UI.showGear = !UI.showGear;
        continue;
      }
      const slot = UI.buttonAt(x, y);
      if (slot !== null && Game.state === 'playing') {
        this.touchSkill.set(t.identifier, slot);
        this.heldSlots.add(slot);
        this.pendingSlots.push(slot);
      } else if (!this.joy.active && x < Game.W * 0.55) {
        this.joy.active = true;
        this.joy.id = t.identifier;
        this.joy.ox = x; this.joy.oy = y;
        this.joy.dx = 0; this.joy.dy = 0;
      } else if (Game.state === 'playing') {
        // Spare right-side touch acts as primary attack.
        this.touchSkill.set(t.identifier, 0);
        this.heldSlots.add(0);
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
      }
    }
  },

  onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joy.id) {
        this.joy.active = false;
        this.joy.id = null;
        this.joy.dx = 0; this.joy.dy = 0;
      }
      const slot = this.touchSkill.get(t.identifier);
      if (slot !== undefined) {
        this.touchSkill.delete(t.identifier);
        // Only release the slot if no other touch holds it.
        let stillHeld = false;
        for (const s of this.touchSkill.values()) if (s === slot) stillHeld = true;
        if (!stillHeld) this.heldSlots.delete(slot);
      }
    }
  },

  // Recompute movement vector each frame from keyboard + joystick.
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
    if (slot === 0) return this.mousePrimary || !!this.keys['Space'] || !!this.keys['KeyJ'];
    return !!this.keys['Digit' + slot];
  },

  consumeTap() {
    const t = this.anyTap;
    this.anyTap = false;
    return t;
  }
};
