'use strict';
// ---------------------------------------------------------------------------
// Living things and moving objects: the Nekromancer, monsters (with curses,
// sleep/wake pack AI and telegraphed boss mechanics), the whole minion
// menagerie (skeletons, mages, golem, revived, simulacrum), corpses,
// pickups and projectiles.
// ---------------------------------------------------------------------------

// ------------------------------ Player -------------------------------------

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.r = 14;
    this.speed = 180;
    this.facing = -Math.PI / 2;
    this.moving = false;
    this.anim = 0;
    this.flash = 0;
    this.invuln = 0;
    this.shield = 0;          // Bone Armor absorb
    this.shieldMax = 60;
    this.dash = null;         // Blood Rush {t, maxT, fx, fy, tx, ty}
    this.speedBuffT = 0;      // Fueled by Death
    this.shrine = null;       // {buff, t}
    this.potionCd = 0;
    this.cheatUsed = false;   // Final Service, once per zone
    this.dead = false;
    // Sane defaults; Items.apply() (called once Game.player is assigned)
    // derives the real values from Hero level + gear.
    this.baseDmg = 1;
    this.baseMaxHp = 110;
    this.maxHp = 110;
    this.hp = 110;
    this.dmgMult = 1;
    this.critChance = 0.10;
    this.essenceRegen = 2;
    this.hpRegen = 0;
    this.goldFind = 1;
    this.maxEssence = 100;
    this.essence = 60;
    this.setCount = 0;
    this.powers = {};
    this.funeraryT = 0;       // Funerary Pick: +20% per drained target
    this.funeraryStacks = 0;
    this.powerShiftT = 0;     // Siphon Blood Power Shift rune stacks
    this.powerShiftStacks = 0;
    this.boneArmorT = 0;     // Inarius: Bone Armor buff window
    this.boneArmorDR = 0;    // 4pc damage reduction
    this.tornadoTick = 0;    // 6pc bone tornado
  }

  // Effective damage multiplier including auras and shrines.
  power() {
    let m = this.dmgMult;
    if (this.shrine && this.shrine.buff === 'frenzied') m *= 1.25;
    if (Hero.hasPassive('spreadingMal')) {
      let cursed = 0;
      for (const e of Game.enemies) {
        if (!e.dead && e.curse && dist(this.x, this.y, e.x, e.y) < 620) cursed++;
      }
      m *= 1 + 0.015 * Math.min(20, cursed);
    }
    if (this.funeraryT > 0) m *= 1 + 0.20 * this.funeraryStacks;   // Funerary Pick
    // Power Shift rune: +10% per stack, or +20% with the Funerary Pick.
    if (this.powerShiftT > 0) m *= 1 + (this.powers && this.powers.funeraryPick ? 0.20 : 0.10) * this.powerShiftStacks;
    // Convention of Elements: a rotating +200% damage window (4s of every 24s).
    if (this.powers && this.powers.coe && ((Game.time || 0) % 24) < 4) m *= 3;
    return m;
  }

  update(dt) {
    if (this.dead) return;
    this.anim += dt * (this.moving ? 9 : 2);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    this.speedBuffT = Math.max(0, this.speedBuffT - dt);
    this.funeraryT = Math.max(0, this.funeraryT - dt);
    if (this.funeraryT <= 0) this.funeraryStacks = 0;
    this.powerShiftT = Math.max(0, this.powerShiftT - dt);
    if (this.powerShiftT <= 0) this.powerShiftStacks = 0;
    if (this.shrine) {
      this.shrine.t -= dt;
      if (this.shrine.t <= 0) this.shrine = null;
    }

    if (this.dash) {
      const d = this.dash;
      d.t += dt;
      const k = Math.min(1, d.t / d.maxT);
      this.x = lerp(d.fx, d.tx, k);
      this.y = lerp(d.fy, d.ty, k);
      if (k >= 1) {
        this.dash = null;
        World.collide(this);
        Particles.spawn(this.x, this.y, {
          count: 10, color: ['#c22843', '#8f1626'], minSpeed: 30, maxSpeed: 120,
          minLife: 0.2, maxLife: 0.5
        });
      }
    } else {
      const mx = Input.move.x, my = Input.move.y;
      this.moving = (mx !== 0 || my !== 0);
      const spd = this.speed * (this.speedBuffT > 0 ? 1.2 : 1);
      if (this.moving) {
        this.x += mx * spd * dt;
        this.y += my * spd * dt;
      }
      if (Input.aim.active) {
        this.facing = lerpAngle(this.facing, Math.atan2(Input.aim.y, Input.aim.x), Math.min(1, 18 * dt));
      } else if (this.moving) {
        this.facing = lerpAngle(this.facing, Math.atan2(my, mx), Math.min(1, 14 * dt));
      }
      World.collide(this);
    }

    let regen = this.hpRegen;
    if (Hero.hasPassive('drawLife')) {
      let near = 0;
      for (const e of Game.enemies) if (!e.dead && !e.sleep && dist(this.x, this.y, e.x, e.y) < 260) near++;
      regen += 1.5 * Math.min(8, near);
    }
    if (regen > 0) this.heal(regen * dt);
    // Haunted Visions: the eternal Simulacrum feeds on your life.
    if (this.powers.hauntedVisions && Game.minions.some(mn => !mn.dead && mn.kind === 'sim')) {
      this.hp = Math.max(1, this.hp - this.maxHp * 0.05 * dt);
    }
    this.essence = clamp(this.essence + this.essenceRegen * dt, 0, this.maxEssence);
    if (Hero.cheats.essence) this.essence = this.maxEssence;
    this.shield = Math.max(0, this.shield - dt * 1.2);

    // Devour — Aura rune: passively pull in nearby corpses for essence + 10% life.
    if (this.auraDevour()) {
      this.auraDevourT = (this.auraDevourT || 0) - dt;
      if (this.auraDevourT <= 0) {
        this.auraDevourT = 0.6;
        let nearest = null, bd = 140;
        for (const c of Game.corpses) {
          if (c.gone) continue;
          const d = dist(this.x, this.y, c.x, c.y);
          if (d < bd) { bd = d; nearest = c; }
        }
        if (nearest) {
          nearest.consume();
          this.gainEssence(12);
          this.heal(this.maxHp * 0.10);
          Particles.spawn(nearest.x, nearest.y, {
            count: 6, color: ['#6ff7c3', '#3ee6a0'], minSpeed: 60, maxSpeed: 150,
            minLife: 0.2, maxLife: 0.45, glow: true
          });
        }
      }
    }
    // Frailty — Aura rune: execute nearby enemies at 10% life or less.
    if (this.auraFrailty()) {
      for (const e of Game.enemies) {
        if (e.dead || e.sleep || e.spawnT > 0 || e.unique) continue;
        if (e.hp <= e.maxHp * 0.10 && dist(this.x, this.y, e.x, e.y) < 240) {
          Particles.text(e.x, e.y - 20, 'FRAIL', { color: '#b06adf', size: 12, life: 0.6 });
          e.hurt(e.hp + 1);
        }
      }
    }

    // Grace of Inarius: Bone Armor buff window + the 6pc bone tornado.
    if (this.boneArmorT > 0) {
      this.boneArmorT -= dt;
      if (this.boneArmorT <= 0) this.boneArmorDR = 0;
      if (this.setCount >= 6) {
        this.tornadoTick -= dt;
        if (this.tornadoTick <= 0) {
          this.tornadoTick = 0.25;
          const R = 150;
          for (const e of Game.enemies) {
            if (e.dead || e.sleep || e.spawnT > 0) continue;
            if (dist(this.x, this.y, e.x, e.y) < R + e.r) {
              e.vulnT = 3;            // 6pc: +19000% damage taken from you (see hurt)
              // Tornado hits for ~1000% weapon damage per tick.
              e.hurt(60 * this.power(), { knock: { a: angleTo(this.x, this.y, e.x, e.y), f: 20 }, noSplash: true });
            }
          }
          World.smash(this.x, this.y, R); // the tornado grinds furniture to dust
          if (Math.random() < 0.3) AudioSys.sfx('tornado');
        }
        // Orbiting bone shards.
        const oa = Game.time * 7;
        for (let i = 0; i < 2; i++) {
          const a = oa + i * Math.PI;
          Particles.spawn(this.x + Math.cos(a) * rand(40, 120), this.y + Math.sin(a) * rand(40, 120) * 0.6, {
            count: 1, color: ['#e8e0cc', '#c9c0a8'], angle: a + Math.PI / 2, spread: 0.3,
            minSpeed: 60, maxSpeed: 140, minLife: 0.15, maxLife: 0.35, minSize: 2, maxSize: 3.5
          });
        }
      }
    }

    // Smoothly trailing bar/globe values — health drains slowly when hit.
    this.hpDisplay = this.hpDisplay === undefined ? this.hp
      : this.hpDisplay + (this.hp - this.hpDisplay) * Math.min(1, dt * 4);
    this.essDisplay = this.essDisplay === undefined ? this.essence
      : this.essDisplay + (this.essence - this.essDisplay) * Math.min(1, dt * 9);

    World.reveal(this.x, this.y);
  }

  drinkPotion() {
    if (this.potionCd > 0 || this.dead || this.hp >= this.maxHp) return;
    this.potionCd = 25;
    this.heal(Math.round(this.maxHp * 0.55));
    fxHeal(this.x, this.y);
    AudioSys.sfx('potion');
  }

  hurt(dmg) {
    if (this.dead || this.invuln > 0 || this.dash) return;
    if (Hero.cheats.god) return;
    if (Hero.hasPassive('standAlone') && Game.minions.length === 0) dmg *= 0.75;
    if (this.shrine && this.shrine.buff === 'blessed') dmg *= 0.75;
    if (this.boneArmorT > 0 && this.boneArmorDR > 0) dmg *= 1 - this.boneArmorDR;
    if (this.armorDR > 0) dmg *= 1 - this.armorDR;   // armor mitigation from gear/diamonds
    // Aquila Cuirass: above 90% essence, all damage taken is halved.
    if (this.powers && this.powers.aquila && this.essence >= this.maxEssence * 0.9) dmg *= 0.5;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }
    if (dmg <= 0) return;
    this.hp -= dmg;
    this.flash = 1;
    this.invuln = 0.35;
    fxBlood(this.x, this.y, 8);
    Particles.shake(4);
    AudioSys.sfx('hurt');
    if (this.hp <= 0) {
      if (Hero.hasPassive('finalService') && !this.cheatUsed) {
        this.cheatUsed = true;
        this.hp = Math.round(this.maxHp * 0.4);
        this.invuln = 2;
        Particles.text(this.x, this.y - 40, 'FINAL SERVICE', { color: '#b06adf', size: 18, life: 1.5 });
        fxNova(this.x, this.y, 160);
        return;
      }
      this.hp = 0;
      this.dead = true;
      fxBlood(this.x, this.y, 30);
      AudioSys.sfx('die');
      Game.onPlayerDeath();
    }
  }

  heal(n) {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + n);
  }

  gainEssence(n) {
    this.essence = Math.min(this.maxEssence, this.essence + n);
  }

  // Aura runes are active only while their skill is slotted and unlocked.
  auraDevour() {
    return Hero.loadout.includes('devour') && Hero.rune('devour') === 'aura';
  }
  auraFrailty() {
    return Hero.loadout.includes('frailty') && Hero.rune('frailty') === 'aura';
  }

  draw(ctx) {
    const bob = this.moving ? Math.sin(this.anim) * 2 : Math.sin(this.anim) * 0.8;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.strokeStyle = 'rgba(111,247,195,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 4, 20, 9, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 5, 13, 5.5, 0, 0, TAU); ctx.fill();

    if (this.dash) ctx.globalAlpha = 0.55;
    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);

    const flare = Math.sin(this.anim * 0.7) * 1.5;
    ctx.fillStyle = this.flash > 0.4 ? '#8fe8c8' : '#2a4440';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(13, -6, 11 + flare, 14);
    ctx.lineTo(6, 11); ctx.lineTo(2, 15); ctx.lineTo(-3, 11); ctx.lineTo(-7, 14);
    ctx.quadraticCurveTo(-13, -6, 0, -15);
    ctx.fill();
    ctx.strokeStyle = 'rgba(111,247,195,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#d8cfb8';
    ctx.beginPath(); ctx.arc(-8, -5, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -5, 4.5, 0, TAU); ctx.fill();

    ctx.fillStyle = this.flash > 0.4 ? '#b8f4de' : '#1c2e2c';
    ctx.beginPath(); ctx.arc(0, -6, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3';
    ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(-2.6, -8.5, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.6, -8.5, 1.4, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#4a3c2c';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, -16); ctx.stroke();
    ctx.strokeStyle = '#d8cfb8';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(9, -17, 7, -0.4, 1.5); ctx.stroke();

    ctx.restore();

    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(232,224,204,${0.3 + 0.15 * Math.sin(this.anim * 3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y - 4, 24, 0, TAU); ctx.stroke();
    }
    // Aura runes: a pulsing ring — green for Devour, purple for Frailty.
    if (this.auraDevour()) {
      const t = Game.time * 4;
      ctx.strokeStyle = `rgba(78,230,160,${0.22 + 0.16 * (0.5 + 0.5 * Math.sin(t))})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y - 2, 30 + 4 * Math.sin(t), 0, TAU); ctx.stroke();
    }
    if (this.auraFrailty()) {
      const t = Game.time * 4 + 1.5;
      ctx.strokeStyle = `rgba(176,106,223,${0.22 + 0.16 * (0.5 + 0.5 * Math.sin(t))})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y - 2, 38 + 4 * Math.sin(t), 0, TAU); ctx.stroke();
    }
    if (this.shrine) {
      const cols = { empowered: '#4ecbe0', frenzied: '#ff8c5a', blessed: '#ffd76a', fortune: '#4ade80' };
      ctx.fillStyle = cols[this.shrine.buff];
      ctx.beginPath(); ctx.arc(this.x, this.y - 34, 3, 0, TAU); ctx.fill();
    }
  }
}

// ------------------------------ Monsters ------------------------------------

class Enemy {
  constructor(type, x, y, opts = {}) {
    const t = MONSTERS[type];
    this.type = type;
    this.def = t;
    this.elite = !!opts.elite;
    this.unique = !!opts.unique;
    this.name = opts.name || t.name;
    const mLvl = Game.monsterLevel();
    const diff = DIFFICULTIES[Hero.difficulty];
    const scale = (1 + 0.20 * (mLvl - 1)) * diff.mult
      * (this.elite ? 2.4 : 1) * (this.unique ? 9 : 1);
    this.x = x; this.y = y;
    this.r = t.r + (this.elite ? 2 : 0) + (this.unique ? 6 : 0);
    this.maxHp = Math.round(t.hp * scale);
    this.hp = this.maxHp;
    this.speed = t.speed * (1 + 0.008 * mLvl) * rand(0.9, 1.1);
    this.dmg = Math.round(t.dmg * (1 + 0.11 * (mLvl - 1)) * Math.sqrt(diff.mult) * (this.elite ? 1.3 : 1) * (this.unique ? 1.6 : 1));
    this.xp = Math.round(t.xp * (1 + 0.12 * (mLvl - 1)) * diff.reward * (this.elite ? 3 : 1) * (this.unique ? 12 : 1));
    this.sleep = true;
    this.atkCd = 0;
    this.lungeCd = 0;
    this.lungeT = 0;
    this.facing = rand(TAU);
    this.anim = rand(TAU);
    this.flash = 0;
    this.slow = 0;
    this.root = 0;
    this.curse = null;      // {type:'decrepify'|'frailty'|'leech', t}
    this.vulnT = 0;         // Inarius tornado vulnerability
    this.frenzyT = 0;       // set on the player's Command Skeletons target
    this.kbx = 0; this.kby = 0;
    this.dead = false;
    this.spawnT = 0;
    // Boss mechanics.
    this.state = 'normal';
    this.stateT = 0;
    this.mechCd = 3;
    this.chargeA = 0;
    this.chargeD = 0;
    this.chargeHits = null;
    this.telegraph = null;
    this.strikes = [];      // pending siege mortar impacts {x,y,r,dmg,t}
  }

  wake() {
    if (!this.sleep) return;
    this.sleep = false;
    this.spawnT = this.type === 'zombie' || this.type === 'skeleton' ? 0.6 : 0.2;
  }

  target() {
    const p = Game.player;
    let best = p, bestD = p.dead ? 1e9 : dist(this.x, this.y, p.x, p.y);
    for (const m of Game.minions) {
      const d = dist(this.x, this.y, m.x, m.y) * 1.3; // bias toward the hero
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  update(dt) {
    if (this.sleep) {
      const p = Game.player;
      if (!p.dead && dist(this.x, this.y, p.x, p.y) < 440) this.wake();
      else return;
    }
    this.anim += dt * 6;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.root = Math.max(0, this.root - dt);
    this.vulnT = Math.max(0, this.vulnT - dt);
    if (this.curse) {
      this.curse.t -= dt;
      if (this.curse.t <= 0) this.curse = null;
    }
    if (this.spawnT > 0) { this.spawnT -= dt; return; }

    // Resolve pending siege mortar impacts (they land even if we've moved).
    if (this.strikes.length) {
      for (const s of this.strikes) {
        s.t -= dt;
        if (s.t <= 0) {
          fxExplosion(s.x, s.y, s.r);
          AudioSys.sfx('explode');
          Particles.shake(5);
          const p = Game.player;
          if (p && !p.dead && dist(s.x, s.y, p.x, p.y) < s.r + p.r) p.hurt(s.dmg);
          for (const m of Game.minions) if (!m.dead && dist(s.x, s.y, m.x, m.y) < s.r + m.r) m.hurt(s.dmg);
          s.done = true;
        }
      }
      this.strikes = this.strikes.filter(s => !s.done);
    }

    this.x += this.kbx * dt;
    this.y += this.kby * dt;
    this.kbx *= 1 - Math.min(1, 8 * dt);
    this.kby *= 1 - Math.min(1, 8 * dt);

    if ((this.unique || this.def.boss) && this.bossUpdate(dt)) {
      World.collide(this);
      return;
    }

    const tgt = this.target();
    const d = dist(this.x, this.y, tgt.x, tgt.y);
    const a = angleTo(this.x, this.y, tgt.x, tgt.y);
    this.facing = lerpAngle(this.facing, a, Math.min(1, 8 * dt));
    let spd = this.speed;
    if (this.curse && this.curse.type === 'decrepify') spd *= 0.4;
    if (this.slow > 0) spd *= 0.5;
    if (this.root > 0) spd = 0;

    if (this.def.siege) {
      // A near-stationary catapult: hold the line and lob arcing mortars.
      if (d > this.def.atkRange) { this.x += Math.cos(a) * spd * dt; this.y += Math.sin(a) * spd * dt; }
      else if (d < 150) { this.x -= Math.cos(a) * spd * dt; this.y -= Math.sin(a) * spd * dt; }
      if (this.atkCd <= 0 && d < this.def.atkRange && d > 90) {
        this.atkCd = this.def.atkCd * rand(0.9, 1.1);
        this.lobMortar(tgt);
      }
    } else if (this.def.ranged) {
      if (d > 340) {
        this.x += Math.cos(a) * spd * dt;
        this.y += Math.sin(a) * spd * dt;
      } else if (d < 200) {
        this.x -= Math.cos(a) * spd * 0.8 * dt;
        this.y -= Math.sin(a) * spd * 0.8 * dt;
      }
      if (d < this.def.atkRange && this.atkCd <= 0) {
        this.atkCd = this.def.atkCd * rand(0.9, 1.2);
        Game.projectiles.push(new Projectile(this.x, this.y, a, {
          speed: this.def.ranged === 'arrow' ? 420 : 300,
          dmg: this.attackDmg(), r: 5, life: 2.0, friendly: false, type: this.def.ranged
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
        if (this.def.lunges && d < 170 && d > 60 && this.lungeCd <= 0 && this.root <= 0) {
          this.lungeT = 0.28;
          this.lungeCd = 2.4;
        }
      }
      if (d < this.def.atkRange && this.atkCd <= 0) {
        this.atkCd = this.def.atkCd;
        tgt.hurt(this.attackDmg());
        // Knights cleave — the swing catches nearby minions too.
        if (this.def.cleave) {
          for (const m of Game.minions) {
            if (m.dead || m === tgt) continue;
            if (dist(this.x, this.y, m.x, m.y) < this.def.atkRange * 1.2) m.hurt(Math.round(this.attackDmg() * 0.6));
          }
        }
      }
    }

    // Separation.
    for (const o of Game.enemies) {
      if (o === this || o.dead || o.sleep) continue;
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

  attackDmg() {
    let d = this.dmg;
    if (this.curse && this.curse.type === 'decrepify') d *= 0.8;
    return Math.round(d);
  }

  // Lob an arcing mortar at the target — telegraphed landing circle, then AoE.
  lobMortar(tgt) {
    const scatter = 40;
    const tx = clamp(tgt.x + rand(-scatter, scatter), 40, World.W - 40);
    const ty = clamp(tgt.y + rand(-scatter, scatter), 40, World.H - 40);
    const r = 92;
    const delay = 1.15;
    Game.telegraphs.push({ type: 'circle', x: tx, y: ty, r, t: 0, maxT: delay });
    this.strikes.push({ x: tx, y: ty, r, dmg: Math.round(this.dmg * 1.3), t: delay });
    AudioSys.sfx('bolt');
  }

  bossUpdate(dt) {
    const tgt = this.target();
    const d = dist(this.x, this.y, tgt.x, tgt.y);
    switch (this.state) {
      case 'normal':
        this.mechCd -= dt;
        if (this.mechCd <= 0) {
          if (d < 150) {
            this.state = 'windSlam';
            this.stateT = 0.75;
            this.telegraph = { type: 'circle', x: this.x, y: this.y, r: 165, t: 0, maxT: 0.75 };
            Game.telegraphs.push(this.telegraph);
            this.mechCd = rand(4.5, 6.5);
            AudioSys.sfx('wave');
            return true;
          }
          if (d < 560) {
            this.state = 'windCharge';
            this.stateT = 0.8;
            this.chargeA = angleTo(this.x, this.y, tgt.x, tgt.y);
            this.facing = this.chargeA;
            this.telegraph = { type: 'line', x: this.x, y: this.y, a: this.chargeA, len: 540, w: this.r * 2 + 18, t: 0, maxT: 0.8 };
            Game.telegraphs.push(this.telegraph);
            this.mechCd = rand(4.5, 6.5);
            AudioSys.sfx('wave');
            return true;
          }
          this.mechCd = 1.0;
        }
        return false;
      case 'windCharge':
        this.facing = this.chargeA;
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'charging';
          this.chargeD = 0;
          this.chargeHits = new Set();
          if (this.telegraph) this.telegraph.done = true;
          Particles.shake(3);
        }
        return true;
      case 'charging': {
        const step = 560 * dt;
        this.x += Math.cos(this.chargeA) * step;
        this.y += Math.sin(this.chargeA) * step;
        this.chargeD += step;
        for (const v of [Game.player, ...Game.minions]) {
          if (v.dead || this.chargeHits.has(v)) continue;
          if (dist(this.x, this.y, v.x, v.y) < this.r + v.r + 8) {
            this.chargeHits.add(v);
            v.hurt(Math.round(this.dmg * 1.5));
          }
        }
        const bx = this.x, by = this.y;
        World.collide(this);
        const blocked = dist(bx, by, this.x, this.y) > 0.5;
        if (this.chargeD > 540 || blocked) {
          this.state = 'stunned';
          this.stateT = 1.1;
          Particles.shake(6);
          fxBone(this.x + Math.cos(this.chargeA) * this.r, this.y + Math.sin(this.chargeA) * this.r, 10);
          AudioSys.sfx('explode');
        }
        return true;
      }
      case 'windSlam':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'normal';
          if (this.telegraph) this.telegraph.done = true;
          fxExplosion(this.x, this.y, 165);
          AudioSys.sfx('explode');
          World.smash(this.x, this.y, 165);
          for (const v of [Game.player, ...Game.minions]) {
            if (v.dead) continue;
            if (dist(this.x, this.y, v.x, v.y) < 165 + v.r) v.hurt(Math.round(this.dmg * 1.3));
          }
        }
        return true;
      case 'stunned':
        this.stateT -= dt;
        if (this.stateT <= 0) this.state = 'normal';
        return true;
    }
    return false;
  }

  hurt(dmg, opts = {}) {
    if (this.dead) return;
    this.wake();
    const p = Game.player;
    const crit = Math.random() < (p ? p.critChance : 0.1);
    if (crit) dmg *= 1.8;
    if (this.curse) {
      if (this.curse.type === 'frailty') dmg *= 1.15;
      if (this.curse.type === 'leech' && p && !p.dead) p.heal(p.maxHp * 0.012);
      if (p && p.powers && p.powers.corrodedFang) dmg *= 1.6; // Trag'Oul's Corroded Fang
    }
    // Krysbin's Sentence: +100% vs slowed, TRIPLE vs stunned/rooted.
    if (p && p.powers && p.powers.krysbin) {
      if (this.root > 0 || this.state === 'stunned') dmg *= 3;
      else if (this.slow > 0 || (this.curse && this.curse.type === 'decrepify')) dmg *= 2;
    }
    if (this.vulnT > 0) dmg *= 191; // Inarius 6pc: +19000% damage taken from you
    this.hp -= dmg;
    this.flash = 1;
    dmgText(this.x, this.y, dmg, crit);
    // Area Damage: 20% proc to splash a share of the hit onto nearby foes.
    if (!opts.noSplash && p && p.areaDamage > 0 && Math.random() < 0.20) {
      const splash = dmg * p.areaDamage;
      for (const e of Game.enemies) {
        if (e === this || e.dead || e.sleep || e.spawnT > 0) continue;
        if (dist(this.x, this.y, e.x, e.y) < 130) e.hurt(splash, { noSplash: true });
      }
    }
    if (opts.knock && !this.unique) {
      const f = opts.knock.f * (this.def.armored ? 0.4 : 1); // armored foes shrug off knockback
      this.kbx += Math.cos(opts.knock.a) * f;
      this.kby += Math.sin(opts.knock.a) * f;
    }
    if (opts.slow) this.slow = Math.max(this.slow, opts.slow);
    if (opts.root && !this.unique) this.root = Math.max(this.root, opts.root);
    AudioSys.sfx('hit');
    // Frailty: cursed enemies die early.
    if (this.curse && this.curse.type === 'frailty' && this.hp > 0 && this.hp < this.maxHp * 0.10) this.hp = 0;
    if (this.hp <= 0) this.die();
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    if (this.telegraph) this.telegraph.done = true;
    Game.kills++;
    Hero.totalKills++;
    // Rifts: a slain rare-elite pack scatters 1-3 purple orbs (10 pts each).
    if (Game.riftMode && this.elite && !this.guardian && !this.unique && Game.riftProgress < Game.riftGoal) {
      const n = randInt(1, 3);
      for (let i = 0; i < n; i++) Game.pickups.push(new Pickup(this.x, this.y, 'riftorb'));
    }
    fxBlood(this.x, this.y, this.unique ? 30 : 12);
    if (this.type === 'skeleton' || this.type === 'archer') fxBone(this.x, this.y, 12);
    // Nephalem Mongrel: a CHANCE to drop the Nephalem Heartstring (Nephalem
    // Torch reagent). Higher Torment tiers improve the odds a little.
    if (this.def.dropsHeartstring) {
      const chance = 0.6 + 0.02 * (Hero.difficulty || 0);
      if (Math.random() < chance) {
        const n = randInt(1, 2);
        Hero.mats.heartstring += n;
        Particles.text(this.x, this.y - 14, '+' + n + ' Nephalem Heartstring', { color: MATERIALS.heartstring.color, size: 12, life: 1.4 });
        AudioSys.sfx('setdrop');
      } else {
        Particles.text(this.x, this.y - 14, 'No Heartstring…', { color: '#7a6f80', size: 11, life: 1.2 });
      }
    }
    // Corpse Bloats burst on death — a toxic AoE that hits you and your minions.
    if (this.def.explodes) {
      const r = this.def.explodes;
      fxExplosion(this.x, this.y, r);
      Particles.spawn(this.x, this.y - 6, {
        count: 26, color: ['#6faa3a', '#4a5e2a', '#9ac24a'], minSpeed: 40, maxSpeed: 240,
        minLife: 0.3, maxLife: 0.8, minSize: 2, maxSize: 5, grav: 120
      });
      Particles.shake(6);
      AudioSys.sfx('explode');
      const bd = Math.round(this.dmg * 1.8);
      const p = Game.player;
      if (p && !p.dead && dist(this.x, this.y, p.x, p.y) < r + p.r) p.hurt(bd);
      for (const m of Game.minions) if (!m.dead && dist(this.x, this.y, m.x, m.y) < r + m.r) m.hurt(bd);
    }
    Game.corpses.push(new Corpse(this.x, this.y, this.type));
    Hero.addXP(this.xp);

    const p = Game.player;
    const diff = DIFFICULTIES[Hero.difficulty];
    if (Math.random() < 0.32) {
      const g = new Pickup(this.x, this.y, 'gold');
      g.amount = Math.round(g.amount * diff.reward * (p ? p.goldFind : 1) * (this.elite ? 3 : 1) * (this.unique ? 15 : 1));
      Game.pickups.push(g);
    }
    if (Math.random() < (this.unique ? 1 : this.elite ? 0.3 : 0.06)) {
      Game.pickups.push(new Pickup(this.x, this.y, 'orb'));
    }
    const dropChance = this.unique ? 1 : this.elite ? 0.45 : 0.035 * diff.reward;
    if (Math.random() < dropChance) {
      const pu = new Pickup(this.x, this.y, 'item');
      pu.item = Items.generate(Game.monsterLevel(), (this.elite ? 0.12 : 0) + (this.unique ? 0.2 : 0));
      Game.pickups.push(pu);
    }
    if (this.unique) {
      // The bounty boss always drops a second, better item.
      const pu = new Pickup(this.x, this.y, 'item');
      pu.item = Items.generate(Game.monsterLevel() + 2, 0.35);
      Game.pickups.push(pu);
    }
    if (Math.random() < (this.unique ? 0.9 : this.elite ? 0.14 : 0.015)) {
      const pu = new Pickup(this.x, this.y, 'gem');
      pu.gem = Items.generateGem(Game.monsterLevel());
      Game.pickups.push(pu);
    }
    if (this.unique) Game.onBossDead(this);
  }

  draw(ctx) {
    if (this.sleep) {
      // Dormant: a mound / slumped silhouette.
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 3, this.r, this.r * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#221c2b';
      ctx.beginPath(); ctx.ellipse(0, 0, this.r * 0.85, this.r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.spawnT > 0) {
      const k = 1 - this.spawnT / 0.6;
      ctx.globalAlpha = k;
      ctx.strokeStyle = 'rgba(111,247,195,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 4, this.r + 8, (this.r + 8) * 0.4, 0, 0, TAU); ctx.stroke();
      ctx.translate(0, (1 - k) * 14);
      ctx.scale(1, Math.max(0.05, k));
      this.drawBody(ctx);
      ctx.restore();
      return;
    }

    if (this.elite || this.unique) {
      const col = this.unique ? '255,140,42' : '111,247,195';
      ctx.strokeStyle = `rgba(${col},${0.4 + 0.2 * Math.sin(this.anim * 2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 4, this.r + 7, (this.r + 7) * 0.42, 0, 0, TAU); ctx.stroke();
    }
    if (this.curse) {
      const cols = { decrepify: '#b06adf', frailty: '#e04a5a', leech: '#4ade80' };
      ctx.fillStyle = cols[this.curse.type];
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(0, -this.r - 20, 3, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, this.r * 0.9, this.r * 0.38, 0, 0, TAU); ctx.fill();
    this.drawBody(ctx);
    if (this.state === 'stunned') {
      ctx.fillStyle = '#ffd76a';
      for (let i = 0; i < 3; i++) {
        const a = this.anim * 3 + i * TAU / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 14, -this.r - 16 + Math.sin(a) * 4, 2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    if (this.hp < this.maxHp && !this.unique && Settings.g.healthBars) {
      const w = this.elite ? 34 : 26;
      const yo = this.r + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - w / 2, this.y - yo, w, 4);
      ctx.fillStyle = this.elite ? '#6ff7c3' : '#9c2733';
      ctx.fillRect(this.x - w / 2, this.y - yo, w * clamp(this.hp / this.maxHp, 0, 1), 4);
    }
  }

  drawBody(ctx) {
    const bob = Math.sin(this.anim) * 1.6;
    const fl = this.flash > 0.4;
    ctx.save();
    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);
    const uniqueScale = this.unique ? 1.15 : 1;
    ctx.scale(uniqueScale, uniqueScale);
    switch (this.type) {
      case 'zombie': {
        ctx.fillStyle = fl ? '#cfe8c8' : '#4a5e3a';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.quadraticCurveTo(12, -4, 9, 12);
        ctx.lineTo(-9, 12);
        ctx.quadraticCurveTo(-12, -4, 0, -13);
        ctx.fill();
        ctx.strokeStyle = fl ? '#cfe8c8' : '#3d4e30';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        const reach = Math.sin(this.anim * 1.4) * 3;
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-11, -15 - reach); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(11, -15 + reach); ctx.stroke();
        ctx.fillStyle = fl ? '#e8f4d8' : '#5d7348';
        ctx.beginPath(); ctx.arc(0, -8, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d8d44a';
        ctx.beginPath(); ctx.arc(-2, -10, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5, -9.5, 1.3, 0, TAU); ctx.fill();
        break;
      }
      case 'skeleton':
      case 'archer': {
        const isArcher = this.type === 'archer';
        ctx.strokeStyle = fl ? '#ffffff' : '#cfc6ad';
        ctx.fillStyle = fl ? '#ffffff' : '#cfc6ad';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 9); ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(-6, -3 + i * 4); ctx.lineTo(6, -3 + i * 4); ctx.stroke();
        }
        const sw = Math.sin(this.anim * 1.5) * 4;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-12, -10 - sw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, -2); ctx.lineTo(12, -10 + sw); ctx.stroke();
        if (isArcher) {
          // Bow held forward.
          ctx.strokeStyle = '#8a6f4a';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, -16, 9, Math.PI * 0.15, Math.PI * 0.85, false); ctx.stroke();
          ctx.strokeStyle = '#d8cfb8';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-8.5, -13); ctx.lineTo(8.5, -13); ctx.stroke();
        } else {
          ctx.strokeStyle = '#8a8577';
          ctx.beginPath(); ctx.moveTo(12, -10 + sw); ctx.lineTo(16, -22 + sw); ctx.stroke();
        }
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
        ctx.ellipse(0, crouch, 9, 12, 0, 0, TAU);
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
      case 'imp': {
        ctx.fillStyle = fl ? '#ffd8c8' : '#8a4530';
        ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = fl ? '#ffd8c8' : '#733a28';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        const fr = Math.sin(this.anim * 3) * 3;
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-9, -7 - fr); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(9, -7 + fr); ctx.stroke();
        ctx.fillStyle = fl ? '#fff' : '#a55a40';
        ctx.beginPath(); ctx.arc(0, -7, 4.5, 0, TAU); ctx.fill();
        // Little horns.
        ctx.strokeStyle = '#d8cfb8';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(-5, -14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(5, -14); ctx.stroke();
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath(); ctx.arc(-1.6, -7.5, 1, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(1.6, -7.5, 1, 0, TAU); ctx.fill();
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
        ctx.fillStyle = fl ? '#fff' : '#3a1420';
        ctx.beginPath(); ctx.arc(0, -7, 6.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0a060c';
        ctx.beginPath(); ctx.arc(0, -8, 4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e0483a';
        ctx.shadowColor = '#e0483a'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(-1.8, -8.5, 1.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(1.8, -8.5, 1.2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
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
        ctx.strokeStyle = '#3d1e18';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(2, 12); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const yy = -10 + i * 6;
          ctx.beginPath(); ctx.moveTo(-9, yy); ctx.lineTo(-1 + i, yy + 2); ctx.stroke();
        }
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
      case 'hound':
      case 'mongrel': {
        // Low quadruped beast lunging forward. Mongrels are bigger, purple-hued
        // and eye-glowing with the Nephalem taint.
        const neph = this.type === 'mongrel';
        const sc = neph ? 1.4 : 1;
        ctx.save(); ctx.scale(sc, sc);
        const lunge = this.lungeT > 0 ? 3 : 0;
        ctx.fillStyle = fl ? '#f4d0c8' : (neph ? '#4a2e5a' : '#5a3e3a');
        ctx.beginPath(); ctx.ellipse(0, 2 - lunge * 0.3, 8, 6.5, 0, 0, TAU); ctx.fill();
        // Legs.
        ctx.strokeStyle = fl ? '#f4d0c8' : (neph ? '#3a2448' : '#4a302c');
        ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        const gl = Math.sin(this.anim * 4) * 3;
        ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(-8, 10 + gl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, 4); ctx.lineTo(8, 10 - gl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(-6, 10 - gl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(6, 10 + gl); ctx.stroke();
        // Head thrust forward (facing = up after rotate).
        ctx.fillStyle = fl ? '#fff' : (neph ? '#5c3a70' : '#6a4a44');
        ctx.beginPath(); ctx.ellipse(0, -8 - lunge, 5, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = neph ? '#1a1024' : '#2a1a18';
        ctx.beginPath(); ctx.moveTo(-3, -12 - lunge); ctx.lineTo(0, -16 - lunge); ctx.lineTo(3, -12 - lunge); ctx.fill(); // snout
        ctx.fillStyle = neph ? '#c8a0ff' : '#ffd84a';
        if (neph) { ctx.shadowColor = '#b06adf'; ctx.shadowBlur = 5; }
        ctx.beginPath(); ctx.arc(-2, -9 - lunge, 1.1, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -9 - lunge, 1.1, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'soldier':
      case 'knight': {
        const big = this.type === 'knight';
        const s = big ? 1.25 : 1;
        ctx.save(); ctx.scale(s, s);
        // Armored torso.
        ctx.fillStyle = fl ? '#e8eef4' : (big ? '#3a4150' : '#4a4e58');
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.quadraticCurveTo(11, -6, 9, 13); ctx.lineTo(-9, 13);
        ctx.quadraticCurveTo(-11, -6, 0, -14); ctx.fill();
        // Plate seams.
        ctx.strokeStyle = 'rgba(10,8,14,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
        // Shield arm (left).
        ctx.fillStyle = fl ? '#fff' : (big ? '#5a4a2a' : '#6b5330');
        ctx.beginPath(); ctx.ellipse(-11, 0, 4.5, 8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-11, 0, 4.5, 8, 0, 0, TAU); ctx.stroke();
        // Sword arm (right) — a swung blade.
        const sw = Math.sin(this.anim * 1.6) * 5;
        ctx.strokeStyle = fl ? '#fff' : '#8a8f99'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(9, -2); ctx.lineTo(15, -10 + sw); ctx.stroke();
        ctx.strokeStyle = '#dfe6ef'; ctx.lineWidth = big ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(15, -10 + sw); ctx.lineTo(22 + (big ? 6 : 0), -26 + sw); ctx.stroke();
        ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 2; // crossguard
        ctx.beginPath(); ctx.moveTo(12, -8 + sw); ctx.lineTo(18, -12 + sw); ctx.stroke();
        // Helmeted head.
        ctx.fillStyle = fl ? '#fff' : (big ? '#4a5160' : '#5a5e68');
        ctx.beginPath(); ctx.arc(0, -12, 5.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0a0810'; ctx.fillRect(-4, -13, 8, 2); // visor slit
        if (big) { // knight plume
          ctx.strokeStyle = '#8a2635'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(4, -22, 1, -26); ctx.stroke();
        }
        ctx.fillStyle = '#e0483a';
        ctx.beginPath(); ctx.arc(0, -12, 1.4, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case 'bloat': {
        // Big, bloated, distended sack of rot — pulsing.
        const pulse = 1 + Math.sin(this.anim * 1.3) * 0.05;
        ctx.save(); ctx.scale(pulse, pulse);
        ctx.fillStyle = fl ? '#e8f4c8' : '#5a6e34';
        ctx.beginPath(); ctx.ellipse(0, -2, 17, 19, 0, 0, TAU); ctx.fill();
        // Belly highlight.
        ctx.fillStyle = fl ? '#f4ffe0' : '#7a923f';
        ctx.beginPath(); ctx.ellipse(-3, 0, 9, 11, 0, 0, TAU); ctx.fill();
        // Pustules.
        ctx.fillStyle = '#9ac24a';
        for (let i = 0; i < 5; i++) {
          const a = this.anim * 0.2 + i * 1.7;
          ctx.beginPath(); ctx.arc(Math.cos(a) * 11, Math.sin(a) * 12 - 2, 2.6, 0, TAU); ctx.fill();
        }
        // Stubby head.
        ctx.fillStyle = fl ? '#fff' : '#4a5e2a';
        ctx.beginPath(); ctx.arc(0, -16, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c8e04a';
        ctx.beginPath(); ctx.arc(-2, -17, 1.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.4, -16.5, 1.5, 0, TAU); ctx.fill();
        // Gas wisps.
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.anim * 2);
        ctx.fillStyle = 'rgba(154,194,74,0.5)';
        ctx.beginPath(); ctx.arc(6, -22, 3, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        break;
      }
      case 'catapult': {
        // A wooden siege engine with a throwing arm.
        ctx.save();
        // Base frame.
        ctx.fillStyle = fl ? '#e8d8b0' : '#4a3a24';
        ctx.fillRect(-18, 0, 36, 8);
        ctx.strokeStyle = '#2e2416'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(-22, 18); ctx.moveTo(16, 8); ctx.lineTo(22, 18); ctx.stroke();
        // Wheels.
        ctx.fillStyle = '#3a2c1a';
        ctx.beginPath(); ctx.arc(-14, 18, 6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(14, 18, 6, 0, TAU); ctx.fill();
        // A-frame.
        ctx.strokeStyle = fl ? '#e8d8b0' : '#5e4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(0, -14); ctx.lineTo(8, 2); ctx.stroke();
        // Throwing arm — cocked, recoils on the attack cooldown.
        const cock = clamp(this.atkCd / (this.def.atkCd || 3.6), 0, 1);
        const armA = -0.5 - cock * 1.4;
        ctx.save(); ctx.translate(0, -14); ctx.rotate(armA);
        ctx.strokeStyle = fl ? '#fff' : '#6b5330'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -20); ctx.stroke();
        ctx.fillStyle = '#2b2634';           // the loaded skull-boulder
        ctx.beginPath(); ctx.arc(0, -22, 5, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }
}

// ------------------------------- Minions ------------------------------------
// kinds: skeleton (permanent, max 7), mage (timed, ranged, max 4),
// golem (permanent, single), revived (timed), sim (simulacrum clone).

class Minion {
  constructor(x, y, kind) {
    this.kind = kind;
    this.x = x; this.y = y;
    const lvl = Hero.level;
    const life = Hero.hasPassive('extServitude') ? 1.5 : 1;
    const cfg = {
      skeleton: { r: 11, speed: 155, hp: (40 + lvl * 8) * life, dmg: 8, life: Infinity, atkCd: 0.75 },
      mage:     { r: 11, speed: 130, hp: (30 + lvl * 6) * life, dmg: 16, life: 10 * life, atkCd: 1.1, ranged: true },
      golem:    { r: 19, speed: 120, hp: (160 + lvl * 22) * life, dmg: 22, life: Infinity, atkCd: 1.2 },
      revived:  { r: 12, speed: 140, hp: (36 + lvl * 7) * life, dmg: 10, life: 15 * life, atkCd: 0.9 },
      sim:      { r: 13, speed: 0,   hp: 1e9, dmg: 0, life: 15, atkCd: 99 }
    }[kind];
    this.cfg = cfg;
    this.r = cfg.r;
    this.speed = cfg.speed;
    this.maxHp = Math.round(cfg.hp);
    this.hp = this.maxHp;
    this.dmg = cfg.dmg;
    this.life = cfg.life;
    this.atkCd = 0;
    this.facing = 0;
    this.anim = rand(TAU);
    this.flash = 0;
    this.frenzyT = 0;
    this.dead = false;
    fxSummon(x, y);
  }

  update(dt) {
    this.anim += dt * 8;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    if (this.life !== Infinity) {
      this.life -= dt;
      if (this.life <= 0) {
        this.dead = true;
        fxBone(this.x, this.y, 8);
        return;
      }
    }
    if (this.kind === 'sim') return; // the clone just stands and casts

    let tgt = null, bestD = 560;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      const d = dist(this.x, this.y, e.x, e.y);
      if (d < bestD) { tgt = e; bestD = d; }
    }
    const dmgMult = Game.player.power() * (this.frenzyT > 0 ? 1.5 : 1);
    if (tgt) {
      const a = angleTo(this.x, this.y, tgt.x, tgt.y);
      this.facing = lerpAngle(this.facing, a, Math.min(1, 10 * dt));
      if (this.cfg.ranged) {
        if (bestD > 300) {
          this.x += Math.cos(a) * this.speed * dt;
          this.y += Math.sin(a) * this.speed * dt;
        } else if (this.atkCd <= 0) {
          this.atkCd = this.cfg.atkCd;
          Game.projectiles.push(new Projectile(this.x, this.y - 8, a, {
            speed: 480, dmg: this.dmg * dmgMult, r: 5, life: 1.4, type: 'deathbolt'
          }));
          AudioSys.sfx('bolt');
        }
      } else if (bestD > this.r + tgt.r + 6) {
        this.x += Math.cos(a) * this.speed * (this.frenzyT > 0 ? 1.3 : 1) * dt;
        this.y += Math.sin(a) * this.speed * (this.frenzyT > 0 ? 1.3 : 1) * dt;
      } else if (this.atkCd <= 0) {
        this.atkCd = this.cfg.atkCd;
        tgt.hurt(this.dmg * dmgMult, { knock: { a, f: this.kind === 'golem' ? 120 : 40 } });
      }
    } else {
      const p = Game.player;
      const hx = p.x + Math.cos(this.anim * 0.13) * 52;
      const hy = p.y + Math.sin(this.anim * 0.13) * 52;
      if (dist(this.x, this.y, hx, hy) > 30) {
        const a = angleTo(this.x, this.y, hx, hy);
        this.facing = lerpAngle(this.facing, a, Math.min(1, 10 * dt));
        this.x += Math.cos(a) * this.speed * dt;
        this.y += Math.sin(a) * this.speed * dt;
      }
    }
    World.collide(this);
  }

  hurt(dmg) {
    if (this.dead || this.kind === 'sim') return;
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
    const fade = (this.life !== Infinity && this.life < 2) ? 0.35 + 0.65 * Math.abs(Math.sin(this.life * 6)) : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 3, this.r * 0.85, this.r * 0.38, 0, 0, TAU); ctx.fill();
    ctx.rotate(this.facing + Math.PI / 2);
    ctx.translate(0, -bob);

    if (this.kind === 'golem') {
      ctx.fillStyle = fl ? '#fff' : '#b8ae93';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.quadraticCurveTo(18, -8, 14, 16);
      ctx.lineTo(-14, 16);
      ctx.quadraticCurveTo(-18, -8, 0, -18);
      ctx.fill();
      ctx.strokeStyle = '#8f8672';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-2, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(3, 12); ctx.stroke();
      ctx.strokeStyle = fl ? '#fff' : '#a99f86';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      const hv = Math.sin(this.anim) * 3;
      ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-19, -14 - hv); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -4); ctx.lineTo(19, -14 + hv); ctx.stroke();
      ctx.fillStyle = fl ? '#fff' : '#cfc6ad';
      ctx.beginPath(); ctx.arc(0, -12, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6ff7c3';
      ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(-2.5, -13, 1.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.5, -13, 1.6, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.kind === 'sim') {
      // Blood clone of the hero.
      ctx.globalAlpha = fade * 0.85;
      ctx.fillStyle = '#5e1626';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.quadraticCurveTo(13, -6, 11, 14);
      ctx.lineTo(-11, 14);
      ctx.quadraticCurveTo(-13, -6, 0, -15);
      ctx.fill();
      ctx.fillStyle = '#3d0e1a';
      ctx.beginPath(); ctx.arc(0, -6, 7.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e04a5a';
      ctx.shadowColor = '#e04a5a'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(-2.6, -8.5, 1.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -8.5, 1.4, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.kind === 'mage') {
      ctx.fillStyle = fl ? '#fff' : '#2a3440';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.quadraticCurveTo(10, -4, 9, 12);
      ctx.lineTo(-9, 12);
      ctx.quadraticCurveTo(-10, -4, 0, -13);
      ctx.fill();
      ctx.fillStyle = fl ? '#fff' : '#e4dcc6';
      ctx.beginPath(); ctx.arc(0, -9, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4ecbe0';
      ctx.shadowColor = '#4ecbe0'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(-1.7, -10, 1.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(1.7, -10, 1.2, 0, TAU); ctx.fill();
      const pulse = 2 + Math.sin(this.anim * 3);
      ctx.fillStyle = 'rgba(78,203,224,0.8)';
      ctx.beginPath(); ctx.arc(0, -20, pulse, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // skeleton / revived: bone warrior.
      const col = this.kind === 'revived' ? (fl ? '#fff' : '#9aa58a') : (fl ? '#fff' : '#e4dcc6');
      ctx.strokeStyle = col;
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
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -9, 4.5, 0, TAU); ctx.fill();
      const eye = this.frenzyT > 0 ? '#ff8c5a' : '#6ff7c3';
      ctx.fillStyle = eye;
      ctx.shadowColor = eye; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(-1.6, -9.8, 1.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(1.6, -9.8, 1.1, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}

// ------------------------------- Corpse ------------------------------------

class Corpse {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.t = 0;
    // Corpses linger indefinitely (necro fuel); the field is instead capped by
    // count in Game.update (Settings.g.corpseCap). Land of the Dead's temporary
    // corpses override this with a short maxT so they still expire on their own.
    this.maxT = Infinity;
    this.seed = Math.random();
    this.gone = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.maxT) this.gone = true;
  }

  // Consume for a corpse skill; honors the corpse-consumption passives.
  consume() {
    this.gone = true;
    if (Hero.hasPassive('fueledByDeath')) Game.player.speedBuffT = 3;
    if (Hero.hasPassive('lifeFromDeath') && Math.random() < 0.25) {
      Game.pickups.push(new Pickup(this.x, this.y, 'orb'));
    }
  }

  draw(ctx) {
    const left = this.maxT - this.t;
    const a = left < 3 ? 0.3 + 0.7 * Math.abs(Math.sin(left * 5)) : 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.seed * TAU);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = 'rgba(90,13,23,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, TAU); ctx.fill();
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
    this.kind = kind; // 'gold' | 'orb' | 'item' | 'gem'
    this.vx = rand(-70, 70);
    this.vy = rand(-70, 70);
    this.t = 0;
    this.gone = false;
    this.amount = kind === 'gold' ? randInt(6, 18) : 0;
  }

  update(dt) {
    this.t += dt;
    if (this.t > 60) { this.gone = true; return; }
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
        Hero.gold += this.amount;
        AudioSys.sfx('gold');
        Particles.text(p.x, p.y - 34, '+' + this.amount, { color: '#ffd76a', size: 13 });
      } else if (this.kind === 'orb') {
        p.heal(Math.round(p.maxHp * 0.20));
        fxHeal(p.x, p.y);
        AudioSys.sfx('orb');
      } else if (this.kind === 'riftorb') {
        Game.addRiftPoints(10);
        Particles.spawn(p.x, p.y - 10, {
          count: 8, color: ['#b06adf', '#d8b4f0'], minSpeed: 40, maxSpeed: 130,
          minLife: 0.2, maxLife: 0.5, glow: true
        });
        AudioSys.sfx('gem');
      } else if (this.kind === 'item') {
        Items.pickup(this.item);
      } else if (this.kind === 'gem') {
        Hero.gems.push(this.gem);
        UI.toast('Gem: ' + gemName(this.gem), GEM_TYPES[this.gem.type].color);
        AudioSys.sfx('gem');
        Hero.save();
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
    } else if (this.kind === 'orb') {
      ctx.fillStyle = '#e04a5a';
      ctx.shadowColor = '#e04a5a';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-2, -2, 2.5, 0, TAU); ctx.fill();
    } else if (this.kind === 'riftorb') {
      const pulse = 1 + Math.sin(Game.time * 8 + this.x) * 0.18;
      ctx.fillStyle = '#b06adf';
      ctx.shadowColor = '#b06adf';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, -8 * pulse); ctx.lineTo(6 * pulse, 0); ctx.lineTo(0, 8 * pulse); ctx.lineTo(-6 * pulse, 0);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(0, -8 * pulse); ctx.lineTo(3, -1); ctx.lineTo(-3, -1); ctx.closePath(); ctx.fill();
    } else if (this.kind === 'item') {
      const col = RARITIES[this.item.rarity].color;
      const bg = ctx.createLinearGradient(0, -40, 0, 0);
      bg.addColorStop(0, 'rgba(255,255,255,0)');
      bg.addColorStop(1, col);
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(Game.time * 4 + this.x);
      ctx.fillStyle = bg;
      ctx.fillRect(-2.5, -42, 5, 42);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-6, -6, 5, 5);
      ctx.restore();
    } else if (this.kind === 'gem') {
      const col = GEM_TYPES[this.gem.type].color;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5, 0);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(2.5, -1); ctx.lineTo(-2.5, -1);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// ----------------------------- Projectile ----------------------------------

class Projectile {
  constructor(x, y, angle, o) {
    this.x = x; this.y = y;
    this.a = angle;
    this.speed = o.speed;
    this.vx = Math.cos(angle) * o.speed;
    this.vy = Math.sin(angle) * o.speed;
    this.dmg = o.dmg;
    this.r = o.r || 5;
    this.life = o.life || 1.2;
    this.friendly = o.friendly !== false;
    this.pierce = !!o.pierce;
    this.homing = o.homing || null;   // target entity
    this.root = o.root || 0;
    this.slowOnHit = o.slowOnHit || 0;
    this.type = o.type || 'shard';
    this.hits = this.pierce ? new Set() : null;
    this.dead = false;
    this.trail = 0;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    if (this.homing && !this.homing.dead) {
      const ta = angleTo(this.x, this.y, this.homing.x, this.homing.y);
      this.a = lerpAngle(this.a, ta, Math.min(1, 8 * dt));
      this.vx = Math.cos(this.a) * this.speed;
      this.vy = Math.sin(this.a) * this.speed;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (World.projBlocked(this.x, this.y, this.r) && this.type !== 'spirit') {
      this.dead = true;
      if (this.friendly) fxBone(this.x, this.y, 4);
      return;
    }

    this.trail += dt;
    if (this.trail > 0.03) {
      this.trail = 0;
      const col = { bolt: '#e0483a', arrow: '#9a8f76', spear: '#6ff7c3', lance: '#ffb43a', spirit: '#e8e0cc', deathbolt: '#4ecbe0' }[this.type] || '#cfc6ad';
      Particles.spawn(this.x, this.y, {
        count: 1, color: col, minSpeed: 0, maxSpeed: 15,
        minLife: 0.12, maxLife: 0.25, minSize: 1.5, maxSize: 2.5,
        glow: this.type === 'spear' || this.type === 'spirit'
      });
    }

    if (this.friendly) {
      World.smash(this.x, this.y, this.r + 6); // projectiles shatter clutter
      for (const e of Game.enemies) {
        if (e.dead || e.sleep || e.spawnT > 0) continue;
        if (this.hits && this.hits.has(e)) continue;
        if (dist(this.x, this.y, e.x, e.y) < e.r + this.r) {
          const opts = { knock: { a: this.a, f: this.type === 'spear' ? 130 : 45 } };
          if (this.root && Math.random() < 0.3) opts.root = this.root;
          if (this.slowOnHit) opts.slow = this.slowOnHit;
          e.hurt(this.dmg, opts);
          if (this.type === 'spirit') {
            fxExplosion(this.x, this.y, 90);
            for (const e2 of Game.enemies) {
              if (e2 === e || e2.dead || e2.sleep) continue;
              if (dist(this.x, this.y, e2.x, e2.y) < 90) e2.hurt(this.dmg * 0.4);
            }
          }
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
      case 'lance':
        ctx.shadowColor = '#ffb43a';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath();
        ctx.moveTo(14, 0); ctx.lineTo(2, -3.5); ctx.lineTo(-10, -1.5); ctx.lineTo(-10, 1.5); ctx.lineTo(2, 3.5);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case 'spirit': {
        const pulse = 1 + Math.sin(Game.time * 12) * 0.15;
        ctx.shadowColor = '#e8e0cc';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(232,224,204,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, 9 * pulse, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#16121b';
        ctx.beginPath(); ctx.arc(-2.5, -1.5, 1.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.5, -1.5, 1.6, 0, TAU); ctx.fill();
        break;
      }
      case 'deathbolt':
        ctx.fillStyle = '#4ecbe0';
        ctx.shadowColor = '#4ecbe0';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case 'arrow':
        ctx.strokeStyle = '#9a8f76';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(6, 0); ctx.stroke();
        ctx.fillStyle = '#d8cfb8';
        ctx.beginPath();
        ctx.moveTo(9, 0); ctx.lineTo(4, -2.5); ctx.lineTo(4, 2.5);
        ctx.closePath(); ctx.fill();
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
