'use strict';
// ---------------------------------------------------------------------------
// All living (and formerly living) things: the Nekromancer, enemies, skeletal
// minions, corpses, pickups and projectiles.
// ---------------------------------------------------------------------------

// ------------------------------ Player -------------------------------------

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 14;
    this.speed = 178;
    this.level = 1;
    this.maxHp = 120;
    this.hp = this.maxHp;
    this.maxEssence = 100;
    this.essence = 60;
    this.essenceRegen = 3.5;
    this.xp = 0;
    this.xpNext = 50;
    this.dmgMult = 1;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.anim = 0;
    this.flash = 0;
    this.invuln = 0;
    this.shield = 0;       // absorb pool granted by Blood Nova
    this.dead = false;
  }

  update(dt) {
    if (this.dead) return;
    const mx = Input.move.x, my = Input.move.y;
    this.moving = (mx !== 0 || my !== 0);
    if (this.moving) {
      this.x += mx * this.speed * dt;
      this.y += my * this.speed * dt;
      this.facing = lerpAngle(this.facing, Math.atan2(my, mx), Math.min(1, 14 * dt));
      this.anim += dt * 9;
    } else {
      this.anim += dt * 2;
    }
    World.collide(this);

    this.essence = Math.min(this.maxEssence, this.essence + this.essenceRegen * dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.shield = Math.max(0, this.shield - dt * 2); // shield slowly bleeds off
  }

  hurt(dmg) {
    if (this.dead || this.invuln > 0) return;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
      Particles.text(this.x, this.y - 30, 'absorbed', { color: '#6ff7c3', size: 12 });
    }
    if (dmg <= 0) return;
    this.hp -= dmg;
    this.flash = 1;
    this.invuln = 0.35;
    fxBlood(this.x, this.y, 8);
    Particles.shake(4);
    AudioSys.sfx('hurt');
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      fxBlood(this.x, this.y, 30);
      AudioSys.sfx('die');
      Game.gameOver();
    }
  }

  heal(n) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  gainEssence(n) {
    this.essence = Math.min(this.maxEssence, this.essence + n);
  }

  addXP(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.round(50 * Math.pow(this.level, 1.45));
      this.maxHp += 12;
      this.hp = this.maxHp;
      this.dmgMult += 0.09;
      this.essence = this.maxEssence;
      fxLevel(this.x, this.y);
      Particles.text(this.x, this.y - 46, 'LEVEL ' + this.level, { color: '#ffd76a', size: 22, life: 1.4 });
      AudioSys.sfx('level');
    }
  }

  draw(ctx) {
    const bob = this.moving ? Math.sin(this.anim) * 2 : Math.sin(this.anim) * 0.8;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Summoner's rune circle under foot.
    ctx.strokeStyle = 'rgba(111,247,195,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 20, 9, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 5, 13, 5.5, 0, 0, TAU); ctx.fill();

    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);

    if (this.flash > 0) { ctx.globalAlpha = 1; }
    // Tattered cloak (viewed from above, pointing "up" = facing).
    const flare = Math.sin(this.anim * 0.7) * 1.5;
    ctx.fillStyle = this.flash > 0.4 ? '#8fe8c8' : '#2a4440';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(13, -6, 11 + flare, 14);
    ctx.lineTo(6, 11); ctx.lineTo(2, 15); ctx.lineTo(-3, 11); ctx.lineTo(-7, 14);
    ctx.quadraticCurveTo(-13, -6, 0, -15);
    ctx.fill();
    // Cloak trim.
    ctx.strokeStyle = 'rgba(111,247,195,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bone pauldrons.
    ctx.fillStyle = '#d8cfb8';
    ctx.beginPath(); ctx.arc(-8, -5, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -5, 4.5, 0, TAU); ctx.fill();

    // Hood.
    ctx.fillStyle = this.flash > 0.4 ? '#b8f4de' : '#1c2e2c';
    ctx.beginPath(); ctx.arc(0, -6, 7.5, 0, TAU); ctx.fill();
    // Glowing eyes peering from hood.
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3';
    ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(-2.6, -8.5, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.6, -8.5, 1.4, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;

    // Scythe held to the right side.
    ctx.strokeStyle = '#4a3c2c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, -16); ctx.stroke();
    ctx.strokeStyle = '#d8cfb8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(9, -17, 7, -0.4, 1.5); ctx.stroke();

    ctx.restore();

    // Shield bubble.
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(111,247,195,${0.25 + 0.15 * Math.sin(this.anim * 3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y - 4, 24, 0, TAU); ctx.stroke();
    }
  }
}

// ------------------------------ Enemies ------------------------------------

const ENEMY_TYPES = {
  zombie:   { hp: 42, speed: 52, dmg: 11, r: 15, xp: 12, gold: 0.30, atkRange: 34, atkCd: 1.3 },
  skeleton: { hp: 26, speed: 92, dmg: 8, r: 13, xp: 14, gold: 0.30, atkRange: 32, atkCd: 1.0 },
  ghoul:    { hp: 22, speed: 132, dmg: 13, r: 12, xp: 18, gold: 0.35, atkRange: 30, atkCd: 1.1, lunges: true },
  cultist:  { hp: 32, speed: 62, dmg: 12, r: 13, xp: 22, gold: 0.45, atkRange: 420, atkCd: 2.4, ranged: true },
  brute:    { hp: 260, speed: 44, dmg: 24, r: 26, xp: 90, gold: 1.0, atkRange: 46, atkCd: 1.7, boss: true }
};

class Enemy {
  constructor(type, x, y, wave) {
    const t = ENEMY_TYPES[type];
    this.type = type;
    this.def = t;
    const scale = 1 + 0.16 * (wave - 1);
    this.x = x; this.y = y;
    this.r = t.r;
    this.maxHp = Math.round(t.hp * scale);
    this.hp = this.maxHp;
    this.speed = t.speed * (1 + 0.012 * (wave - 1)) * rand(0.9, 1.1);
    this.dmg = Math.round(t.dmg * (1 + 0.09 * (wave - 1)));
    this.xp = Math.round(t.xp * (1 + 0.05 * (wave - 1)));
    this.atkCd = 0;
    this.lungeCd = 0;
    this.lungeT = 0;
    this.facing = 0;
    this.anim = rand(TAU);
    this.flash = 0;
    this.slow = 0;
    this.kbx = 0; this.kby = 0;
    this.dead = false;
    this.spawnT = 0.6; // rise-from-ground intro
  }

  target() {
    // Prefer the player, but switch to a skeletal minion if one is closer.
    const p = Game.player;
    let best = p, bestD = dist(this.x, this.y, p.x, p.y);
    for (const m of Game.minions) {
      const d = dist(this.x, this.y, m.x, m.y) * 1.25; // player-biased
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  update(dt) {
    this.anim += dt * 6;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    this.slow = Math.max(0, this.slow - dt);
    if (this.spawnT > 0) { this.spawnT -= dt; return; }

    // Knockback decay.
    this.x += this.kbx * dt;
    this.y += this.kby * dt;
    this.kbx *= 1 - Math.min(1, 8 * dt);
    this.kby *= 1 - Math.min(1, 8 * dt);

    const tgt = this.target();
    const d = dist(this.x, this.y, tgt.x, tgt.y);
    const a = angleTo(this.x, this.y, tgt.x, tgt.y);
    this.facing = lerpAngle(this.facing, a, Math.min(1, 8 * dt));
    const spd = this.speed * (this.slow > 0 ? 0.45 : 1);

    if (this.def.ranged) {
      // Cultist: hold at range and hurl bolts.
      if (d > 360) {
        this.x += Math.cos(a) * spd * dt;
        this.y += Math.sin(a) * spd * dt;
      } else if (d < 240) {
        this.x -= Math.cos(a) * spd * 0.8 * dt;
        this.y -= Math.sin(a) * spd * 0.8 * dt;
      }
      if (d < this.def.atkRange && this.atkCd <= 0) {
        this.atkCd = this.def.atkCd;
        Game.projectiles.push(new Projectile(this.x, this.y, a, {
          speed: 300, dmg: this.dmg, r: 6, life: 2.2, friendly: false, type: 'bolt'
        }));
        AudioSys.sfx('bolt');
      }
    } else {
      if (this.lungeT > 0) {
        this.lungeT -= dt;
        this.x += Math.cos(this.facing) * spd * 3.2 * dt;
        this.y += Math.sin(this.facing) * spd * 3.2 * dt;
      } else if (d > this.def.atkRange * 0.8) {
        this.x += Math.cos(a) * spd * dt;
        this.y += Math.sin(a) * spd * dt;
        if (this.def.lunges && d < 170 && d > 60 && this.lungeCd <= 0) {
          this.lungeT = 0.28;
          this.lungeCd = 2.4;
        }
      }
      if (d < this.def.atkRange && this.atkCd <= 0) {
        this.atkCd = this.def.atkCd;
        tgt.hurt(this.dmg);
      }
    }

    // Cheap separation so packs don't stack into one blob.
    for (const o of Game.enemies) {
      if (o === this || o.dead) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const min = this.r + o.r;
      const dd = dx * dx + dy * dy;
      if (dd < min * min && dd > 0.001) {
        const D = Math.sqrt(dd);
        const push = (min - D) * 0.5;
        this.x += dx / D * push;
        this.y += dy / D * push;
      }
    }
    World.collide(this);
  }

  hurt(dmg, opts = {}) {
    if (this.dead) return;
    const crit = Math.random() < 0.10;
    if (crit) dmg *= 1.8;
    this.hp -= dmg;
    this.flash = 1;
    dmgText(this.x, this.y, dmg, crit);
    if (opts.knock) {
      this.kbx += Math.cos(opts.knock.a) * opts.knock.f;
      this.kby += Math.sin(opts.knock.a) * opts.knock.f;
    }
    if (opts.slow) this.slow = Math.max(this.slow, opts.slow);
    AudioSys.sfx('hit');
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    Game.kills++;
    fxBlood(this.x, this.y, this.def.boss ? 26 : 12);
    if (this.type === 'skeleton') fxBone(this.x, this.y, 12);
    Game.corpses.push(new Corpse(this.x, this.y, this.type));
    Game.player.addXP(this.xp);
    if (Math.random() < this.def.gold) {
      Game.pickups.push(new Pickup(this.x, this.y, 'gold'));
    }
    if (Math.random() < (this.def.boss ? 1 : 0.07)) {
      Game.pickups.push(new Pickup(this.x, this.y, 'orb'));
    }
    if (this.def.boss) {
      fxExplosion(this.x, this.y, 60);
      for (let i = 0; i < 3; i++) Game.pickups.push(new Pickup(this.x, this.y, 'gold'));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.spawnT > 0) {
      // Clawing out of the grave.
      const k = 1 - this.spawnT / 0.6;
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 4, this.r * k + 4, (this.r * k + 4) * 0.4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(111,247,195,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 4, this.r + 8, (this.r + 8) * 0.4, 0, 0, TAU); ctx.stroke();
      ctx.translate(0, (1 - k) * 14);
      ctx.scale(1, k);
      this.drawBody(ctx);
      ctx.restore();
      return;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, this.r * 0.9, this.r * 0.38, 0, 0, TAU); ctx.fill();
    this.drawBody(ctx);
    ctx.restore();

    // Health bar once damaged.
    if (this.hp < this.maxHp) {
      const w = this.def.boss ? 44 : 26;
      const yo = this.def.boss ? 42 : 26;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - w / 2, this.y - yo, w, 4);
      ctx.fillStyle = this.def.boss ? '#c22843' : '#9c2733';
      ctx.fillRect(this.x - w / 2, this.y - yo, w * clamp(this.hp / this.maxHp, 0, 1), 4);
    }
  }

  drawBody(ctx) {
    const bob = Math.sin(this.anim) * 1.6;
    const fl = this.flash > 0.4;
    ctx.save();
    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);
    switch (this.type) {
      case 'zombie': {
        ctx.fillStyle = fl ? '#cfe8c8' : '#4a5e3a';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.quadraticCurveTo(12, -4, 9, 12);
        ctx.lineTo(-9, 12);
        ctx.quadraticCurveTo(-12, -4, 0, -13);
        ctx.fill();
        // Reaching arms.
        ctx.strokeStyle = fl ? '#cfe8c8' : '#3d4e30';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        const reach = Math.sin(this.anim * 1.4) * 3;
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-11, -15 - reach); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(11, -15 + reach); ctx.stroke();
        // Head.
        ctx.fillStyle = fl ? '#e8f4d8' : '#5d7348';
        ctx.beginPath(); ctx.arc(0, -8, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d8d44a';
        ctx.beginPath(); ctx.arc(-2, -10, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5, -9.5, 1.3, 0, TAU); ctx.fill();
        break;
      }
      case 'skeleton': {
        ctx.strokeStyle = fl ? '#ffffff' : '#cfc6ad';
        ctx.fillStyle = fl ? '#ffffff' : '#cfc6ad';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        // Ribs / spine.
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 9); ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(-6, -3 + i * 4); ctx.lineTo(6, -3 + i * 4); ctx.stroke();
        }
        // Arms with rusted blade.
        const sw = Math.sin(this.anim * 1.5) * 4;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-12, -10 - sw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, -10 + sw); ctx.stroke();
        ctx.strokeStyle = '#8a8577';
        ctx.beginPath(); ctx.moveTo(12, -10 + sw); ctx.lineTo(16, -22 + sw); ctx.stroke();
        // Skull.
        ctx.fillStyle = fl ? '#ffffff' : '#e0d8c0';
        ctx.beginPath(); ctx.arc(0, -11, 5.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1420';
        ctx.beginPath(); ctx.arc(-2, -12, 1.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -12, 1.5, 0, TAU); ctx.fill();
        break;
      }
      case 'ghoul': {
        const crouch = this.lungeT > 0 ? 3 : 0;
        ctx.fillStyle = fl ? '#f4e4e8' : '#8a7580';
        ctx.beginPath();
        ctx.ellipse(0, 0 + crouch, 9, 12, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = fl ? '#f4e4e8' : '#75626c';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        const cl = Math.sin(this.anim * 2.2) * 4;
        ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-13, -9 - cl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(13, -9 + cl); ctx.stroke();
        ctx.fillStyle = fl ? '#fff' : '#a08a94';
        ctx.beginPath(); ctx.arc(0, -9 + crouch, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e04a3a';
        ctx.beginPath(); ctx.arc(-1.8, -10 + crouch, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(1.8, -10 + crouch, 1.3, 0, TAU); ctx.fill();
        break;
      }
      case 'cultist': {
        ctx.fillStyle = fl ? '#f4d4d8' : '#4e1a26';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.quadraticCurveTo(11, -4, 10, 13);
        ctx.lineTo(-10, 13);
        ctx.quadraticCurveTo(-11, -4, 0, -13);
        ctx.fill();
        ctx.strokeStyle = '#7a2a3a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Hood with void face.
        ctx.fillStyle = fl ? '#fff' : '#3a1420';
        ctx.beginPath(); ctx.arc(0, -7, 6.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0a060c';
        ctx.beginPath(); ctx.arc(0, -8, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e0483a';
        ctx.shadowColor = '#e0483a'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(-1.8, -8.5, 1.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(1.8, -8.5, 1.2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        // Channeling orb between raised hands.
        const pulse = 2 + Math.sin(this.anim * 3) * 1;
        ctx.fillStyle = 'rgba(224,72,58,0.8)';
        ctx.beginPath(); ctx.arc(0, -19, pulse, 0, TAU); ctx.fill();
        break;
      }
      case 'brute': {
        ctx.fillStyle = fl ? '#f4d8d0' : '#5e3028';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.quadraticCurveTo(22, -10, 17, 20);
        ctx.lineTo(-17, 20);
        ctx.quadraticCurveTo(-22, -10, 0, -22);
        ctx.fill();
        // Stitched hide.
        ctx.strokeStyle = '#3d1e18';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(2, 12); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const yy = -10 + i * 6;
          ctx.beginPath(); ctx.moveTo(-9, yy); ctx.lineTo(-1 + i, yy + 2); ctx.stroke();
        }
        // Massive arms + cleaver.
        ctx.strokeStyle = fl ? '#f4d8d0' : '#4e2620';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        const hv = Math.sin(this.anim) * 3;
        ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-21, -18 - hv); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(21, -18 + hv); ctx.stroke();
        ctx.fillStyle = '#7d8087';
        ctx.beginPath();
        ctx.moveTo(21, -18 + hv); ctx.lineTo(34, -34 + hv); ctx.lineTo(26, -12 + hv);
        ctx.closePath(); ctx.fill();
        // Horned head.
        ctx.fillStyle = fl ? '#fff' : '#6e4038';
        ctx.beginPath(); ctx.arc(0, -14, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d8cfb8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-7, -18); ctx.lineTo(-12, -26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, -18); ctx.lineTo(12, -26); ctx.stroke();
        ctx.fillStyle = '#ffb43a';
        ctx.shadowColor = '#ffb43a'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(-3, -15, 1.8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3, -15, 1.8, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
    }
    ctx.restore();
  }
}

// --------------------------- Skeletal minion -------------------------------

class Minion {
  constructor(x, y, player) {
    this.x = x; this.y = y;
    this.r = 11;
    this.speed = 150;
    this.maxHp = 40 + player.level * 6;
    this.hp = this.maxHp;
    this.dmg = 9;
    this.life = 16;
    this.atkCd = 0;
    this.facing = 0;
    this.anim = rand(TAU);
    this.flash = 0;
    this.dead = false;
  }

  update(dt) {
    this.anim += dt * 8;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      fxBone(this.x, this.y, 10);
      return;
    }

    // Find prey; otherwise heel beside the master.
    let tgt = null, bestD = 520;
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < bestD) { tgt = e; bestD = d; }
    }
    if (tgt) {
      const a = angleTo(this.x, this.y, tgt.x, tgt.y);
      this.facing = lerpAngle(this.facing, a, Math.min(1, 10 * dt));
      if (bestD > this.r + tgt.r + 6) {
        this.x += Math.cos(a) * this.speed * dt;
        this.y += Math.sin(a) * this.speed * dt;
      } else if (this.atkCd <= 0) {
        this.atkCd = 0.75;
        tgt.hurt(this.dmg * Game.player.dmgMult * 0.9, { knock: { a, f: 40 } });
      }
    } else {
      const p = Game.player;
      const hx = p.x + Math.cos(this.anim * 0.13) * 46;
      const hy = p.y + Math.sin(this.anim * 0.13) * 46;
      const d = dist(this.x, this.y, hx, hy);
      if (d > 26) {
        const a = angleTo(this.x, this.y, hx, hy);
        this.facing = lerpAngle(this.facing, a, Math.min(1, 10 * dt));
        this.x += Math.cos(a) * this.speed * dt;
        this.y += Math.sin(a) * this.speed * dt;
      }
    }
    World.collide(this);
  }

  hurt(dmg) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 1;
    if (this.hp <= 0) {
      this.dead = true;
      fxBone(this.x, this.y, 12);
    }
  }

  draw(ctx) {
    const bob = Math.sin(this.anim) * 1.4;
    const fl = this.flash > 0.4;
    const fade = this.life < 2 ? 0.35 + 0.65 * Math.abs(Math.sin(this.life * 6)) : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 3, 9, 4, 0, 0, TAU); ctx.fill();
    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);
    ctx.strokeStyle = fl ? '#ffffff' : '#e4dcc6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 8); ctx.stroke();
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-5, -2 + i * 3.5); ctx.lineTo(5, -2 + i * 3.5); ctx.stroke();
    }
    const sw = Math.sin(this.anim * 1.8) * 4;
    ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-10, -8 - sw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(10, -8 + sw); ctx.stroke();
    ctx.strokeStyle = '#9aa0a8';
    ctx.beginPath(); ctx.moveTo(10, -8 + sw); ctx.lineTo(14, -18 + sw); ctx.stroke();
    ctx.fillStyle = fl ? '#fff' : '#efe8d2';
    ctx.beginPath(); ctx.arc(0, -9, 4.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(-1.6, -9.8, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(1.6, -9.8, 1.1, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ------------------------------- Corpse ------------------------------------

class Corpse {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.t = 0;
    this.maxT = 14;
    this.seed = Math.random();
    this.gone = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.maxT) this.gone = true;
  }

  draw(ctx) {
    const left = this.maxT - this.t;
    const a = left < 3 ? 0.3 + 0.7 * Math.abs(Math.sin(left * 5)) : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.seed * TAU);
    ctx.globalAlpha = a * 0.9;
    // Pool of gore.
    ctx.fillStyle = 'rgba(90,13,23,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill();
    // The remains.
    ctx.strokeStyle = '#b8ae93';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, i * 4 - 5, 7 - i * 1.2, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = '#c5bb9f';
    ctx.beginPath(); ctx.arc(2, -9, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#16121b';
    ctx.fillRect(0.5, -10.5, 1.6, 2);
    ctx.fillRect(3.5, -10.5, 1.6, 2);
    // Necrotic shimmer marks it as usable fuel.
    ctx.globalAlpha = a * (0.3 + 0.2 * Math.sin(Game.time * 4 + this.seed * 9));
    ctx.strokeStyle = '#6ff7c3';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 17, 11, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------- Pickup ------------------------------------

class Pickup {
  constructor(x, y, kind) {
    this.x = x + rand(-14, 14);
    this.y = y + rand(-14, 14);
    this.kind = kind; // 'gold' | 'orb'
    this.vx = rand(-70, 70);
    this.vy = rand(-70, 70);
    this.t = 0;
    this.gone = false;
    this.amount = kind === 'gold' ? randInt(4, 14) : 0;
  }

  update(dt) {
    this.t += dt;
    if (this.t > 30) { this.gone = true; return; }
    const p = Game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d < 110 && !p.dead) {
      const a = angleTo(this.x, this.y, p.x, p.y);
      const pull = (110 - d) * 6 + 120;
      this.vx += Math.cos(a) * pull * dt * 4;
      this.vy += Math.sin(a) * pull * dt * 4;
    }
    this.vx *= 1 - Math.min(1, 4 * dt);
    this.vy *= 1 - Math.min(1, 4 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (d < 20 && !p.dead) {
      this.gone = true;
      if (this.kind === 'gold') {
        Game.gold += this.amount;
        AudioSys.sfx('gold');
        Particles.text(p.x, p.y - 34, '+' + this.amount, { color: '#ffd76a', size: 13 });
      } else {
        p.heal(Math.round(p.maxHp * 0.22));
        fxHeal(p.x, p.y);
        AudioSys.sfx('orb');
      }
    }
  }

  draw(ctx) {
    const hover = Math.sin(Game.time * 5 + this.x) * 2;
    ctx.save();
    ctx.translate(this.x, this.y + hover * 0.4);
    if (this.kind === 'gold') {
      ctx.fillStyle = '#ffd76a';
      ctx.shadowColor = '#ffb43a';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b8860b';
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = '#e04a5a';
      ctx.shadowColor = '#e04a5a';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// ----------------------------- Projectile ----------------------------------

class Projectile {
  constructor(x, y, angle, o) {
    this.x = x; this.y = y;
    this.a = angle;
    this.vx = Math.cos(angle) * o.speed;
    this.vy = Math.sin(angle) * o.speed;
    this.dmg = o.dmg;
    this.r = o.r || 5;
    this.life = o.life || 1.2;
    this.friendly = o.friendly !== false;
    this.pierce = !!o.pierce;
    this.type = o.type || 'shard';
    this.hits = this.pierce ? new Set() : null;
    this.dead = false;
    this.trail = 0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 20 || this.y < 20 || this.x > World.W - 20 || this.y > World.H - 20) {
      this.dead = true;
      return;
    }
    // Blocked by props.
    for (const p of World.props) {
      if (dist(this.x, this.y, p.x, p.y) < p.r + this.r - 4) {
        this.dead = true;
        if (this.type !== 'bolt') fxBone(this.x, this.y, 4);
        return;
      }
    }

    this.trail += dt;
    if (this.trail > 0.03) {
      this.trail = 0;
      const col = this.type === 'bolt' ? '#e0483a' : (this.type === 'spear' ? '#6ff7c3' : '#cfc6ad');
      Particles.spawn(this.x, this.y, {
        count: 1, color: col, minSpeed: 0, maxSpeed: 15,
        minLife: 0.12, maxLife: 0.25, minSize: 1.5, maxSize: 2.5, glow: this.type === 'spear'
      });
    }

    if (this.friendly) {
      for (const e of Game.enemies) {
        if (e.dead || e.spawnT > 0) continue;
        if (this.hits && this.hits.has(e)) continue;
        if (dist(this.x, this.y, e.x, e.y) < e.r + this.r) {
          e.hurt(this.dmg, { knock: { a: this.a, f: this.type === 'spear' ? 130 : 45 } });
          if (this.type === 'shard') Game.player.gainEssence(3);
          if (this.pierce) {
            this.hits.add(e);
          } else {
            this.dead = true;
            fxBone(this.x, this.y, 4);
            return;
          }
        }
      }
    } else {
      const p = Game.player;
      if (!p.dead && dist(this.x, this.y, p.x, p.y) < p.r + this.r) {
        p.hurt(this.dmg);
        this.dead = true;
        return;
      }
      for (const m of Game.minions) {
        if (m.dead) continue;
        if (dist(this.x, this.y, m.x, m.y) < m.r + this.r) {
          m.hurt(this.dmg);
          this.dead = true;
          return;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    switch (this.type) {
      case 'shard':
        ctx.fillStyle = '#e8e0cc';
        ctx.beginPath();
        ctx.moveTo(7, 0); ctx.lineTo(-5, -2.5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 2.5);
        ctx.closePath(); ctx.fill();
        break;
      case 'spear':
        ctx.shadowColor = '#6ff7c3';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f2ecd8';
        ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(6, -4.5); ctx.lineTo(-16, -2); ctx.lineTo(-13, 0);
        ctx.lineTo(-16, 2); ctx.lineTo(6, 4.5);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#6ff7c3';
        ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(-14, 0, 3, 0, TAU); ctx.fill();
        break;
      case 'bolt': {
        const pulse = 1 + Math.sin(Game.time * 20) * 0.2;
        ctx.fillStyle = '#e0483a';
        ctx.shadowColor = '#e0483a';
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, 0, 5 * pulse, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffb090';
        ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}
