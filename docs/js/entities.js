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
    this.critDmg = 0;         // Emerald: extra crit damage (adds to the ×1.8 base)
    this.flatDmg = 0;         // Ruby: flat damage per hit
    this.resistAll = 0;       // Diamond: all-element resistance
    this.resistDR = 0;        // derived damage reduction from resistAll
    this.cdr = 0;             // Diamond: cooldown reduction (fraction)
    this.rcr = 0;             // Topaz: resource cost reduction (fraction)
    this.lifePerHit = 0;      // Amethyst: life restored per hit dealt
    this.xpBonus = 0;
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
    this.secondaryBoost = false;  // Scythe of the Cycle: transient +400% on a secondary cast
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
    // Scythe of the Cycle: +400% on the secondary cast currently in flight.
    if (this.secondaryBoost) m *= 5;
    return m;
  }

  update(dt) {
    if (this.dead) return;
    this.anim += dt * (this.moving ? 9 : 2);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.invuln = Math.max(0, this.invuln - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    this.stun = Math.max(0, (this.stun || 0) - dt);
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
      this.moving = (mx !== 0 || my !== 0) && this.stun <= 0;   // chained = rooted in place
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
        if (dist(this.x, this.y, e.x, e.y) < 240) {
          // Aura of Frailty AUTO-CURSES nearby foes (frailty), then executes any
          // already low enough — matching the rune's "auto-curse and execute".
          if (!e.curse) e.curse = { type: 'frailty', t: 6 };
          if (e.hp <= e.maxHp * 0.10) {
            Particles.text(e.x, e.y - 20, 'FRAIL', { color: '#b06adf', size: 12, life: 0.6 });
            e.hurt(e.hp + 1);
          }
        }
      }
    }

    // Grace of Inarius: Bone Armor buff window + the 6pc bone tornado.
    if (this.boneArmorT > 0) {
      this.boneArmorT -= dt;
      if (this.boneArmorT <= 0) this.boneArmorDR = 0;
      if (this.setCount >= 6) {
        const R = 230;   // a WIDE grinding vortex of bone
        this.tornadoTick -= dt;
        if (this.tornadoTick <= 0) {
          this.tornadoTick = 0.22;
          for (const e of Game.enemies) {
            if (e.dead || e.sleep || e.spawnT > 0) continue;
            if (dist(this.x, this.y, e.x, e.y) < R + e.r) {
              e.vulnT = 3;            // 6pc: +19000% damage taken from you (see hurt)
              // Tornado hits for ~1000% weapon damage per tick + hurls them out.
              e.hurt(60 * this.power(), { knock: { a: angleTo(this.x, this.y, e.x, e.y), f: 34 }, noSplash: true });
              if (Math.random() < 0.5) fxBone(e.x, e.y, 4);   // shrapnel off every victim it grinds
            }
          }
          World.smash(this.x, this.y, R); // grind all furniture in reach to bits
          Particles.shake(2);
          if (Math.random() < 0.5) AudioSys.sfx('tornado');
        }
        // A dense whirling ring of bone shards spanning the whole radius.
        const oa = Game.time * 8;
        for (let i = 0; i < 6; i++) {
          const a = oa + i * TAU / 6;
          const rr2 = R * rand(0.55, 0.98);
          Particles.spawn(this.x + Math.cos(a) * rr2, this.y + Math.sin(a) * rr2 * 0.6, {
            count: 1, color: ['#e8e0cc', '#c9c0a8', '#b0a488'], angle: a + Math.PI / 2, spread: 0.25,
            minSpeed: 120, maxSpeed: 220, minLife: 0.15, maxLife: 0.4, minSize: 2.5, maxSize: 5
          });
        }
      }
    }

    // Smoothly trailing bar/globe values — health drains slowly when hit.
    this.hpDisplay = this.hpDisplay === undefined ? this.hp
      : this.hpDisplay + (this.hp - this.hpDisplay) * Math.min(1, dt * 4);
    this.essDisplay = this.essDisplay === undefined ? this.essence
      : this.essDisplay + (this.essence - this.essDisplay) * Math.min(1, dt * 9);

    // Uncover fog around the hero out to the torch's light — a hair past the lit
    // pool so the edge you can just see becomes permanently explored.
    World.reveal(this.x, this.y, Game.lightRadius() / CELL + 1);
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
    // Revive · Personal Army: -1% damage taken per active revived minion (cap 50%).
    if (Hero.rune('revive') === 'personalArmy') {
      let rev = 0;
      for (const m of Game.minions) if (!m.dead && m.kind === 'revived') rev++;
      if (rev) dmg *= 1 - Math.min(0.5, rev * 0.01);
    }
    if (this.armorDR > 0) dmg *= 1 - this.armorDR;     // armor mitigation from gear
    if (this.resistDR > 0) dmg *= 1 - this.resistDR;   // all-element resist (Diamonds)
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
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    const gained = this.hp - before;
    // Green healing numbers (batched by frame so trickle-regen doesn't spam).
    if (gained >= 1 && typeof healText === 'function') {
      this._healAcc = (this._healAcc || 0) + gained;
      if (this._healAcc >= 8) { healText(this.x, this.y - 8, this._healAcc); this._healAcc = 0; }
    }
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

    // 6pc Grace of Inarius: a big whirling CIRCLE OF BONES grinding around the hero.
    if (this.setCount >= 6 && this.boneArmorT > 0) {
      const R = 230, tt = Game.time;
      ctx.save();
      ctx.strokeStyle = 'rgba(232,224,204,0.30)'; ctx.lineWidth = 3;
      for (let ring = 0; ring < 2; ring++) {
        const rr2 = R * (0.6 + ring * 0.32);
        ctx.beginPath(); ctx.ellipse(0, 4, rr2, rr2 * 0.42, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#e8e0cc'; ctx.strokeStyle = '#3a3020'; ctx.lineWidth = 1;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = tt * 5 + i * TAU / n;
        const rr2 = R * (0.55 + 0.4 * ((i % 3) / 2));
        const bx = Math.cos(a) * rr2, by = Math.sin(a) * rr2 * 0.42 + 4;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.roundRect(-2, -7, 4, 14, 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -7, 2.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 7, 2.4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    if (this.dash) ctx.globalAlpha = 0.55;

    if (typeof Game !== 'undefined' && Game.topDown && Game.topDown()) {
      // Diablo-style upright figure (face forward, shaded for depth).
      this.drawUpright(ctx, bob);
    } else {
      // Classic Bird's-Eye sprite (rotates to face movement; eyes read as the
      // top of the head, correct for a straight-down view).
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
      const eye = (typeof Hero !== 'undefined' && Hero.eyeColor) || '#6ff7c3';
      ctx.fillStyle = eye;
      ctx.shadowColor = eye;
      ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(-2.6, -8.5, 1.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -8.5, 1.4, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;

      // Staff shaft.
      ctx.strokeStyle = '#4a3c2c';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(12, 10); ctx.lineTo(16, -22); ctx.stroke();
      // Bone claw cradling the crystal at the staff head.
      ctx.strokeStyle = '#d8cfb8';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(12, -22, 6, -0.2, 2.0); ctx.stroke();
      // Staff crystal — glows in the hero's chosen eye colour.
      const staffPulse = 0.7 + 0.3 * Math.sin(Game.time * 3);
      ctx.fillStyle = eye;
      ctx.shadowColor = eye;
      ctx.shadowBlur = 9 + 5 * staffPulse;
      ctx.beginPath(); ctx.arc(15, -24, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(14, -25, 1.2, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }

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

  // Top-Down (Diablo-style) hero: an UPRIGHT robed figure that faces the camera,
  // shaded with gradients so the flat 2D sprite reads with real volume — a hooded
  // head with glowing eyes ON THE FACE (not the top of the skull), a mantled robe
  // with a lit front and shadowed sides, and the eye-coloured staff crystal. It
  // mirrors left/right with movement so it still feels responsive. Feet sit at the
  // origin so it stands on the tilted floor. (Called only in Top Down view.)
  drawUpright(ctx, bob) {
    const flash = this.flash > 0.4;
    const eye = (typeof Hero !== 'undefined' && Hero.eyeColor) || '#6ff7c3';
    const flip = Math.cos(this.facing) < 0 ? -1 : 1;   // face/lean toward travel
    ctx.save();
    ctx.translate(0, -bob);
    ctx.scale(flip, 1);

    // ---- staff behind the body (shaft + bone claw) ----
    ctx.strokeStyle = '#4a3c2c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(14, -48); ctx.stroke();
    ctx.strokeStyle = flash ? '#eef8f2' : '#d0c7ae'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(14, -48, 5.2, -0.3, 2.4); ctx.stroke();

    // ---- robe body (feet at ~y0, shoulders ~y-34) with a vertical gradient ----
    ctx.beginPath();
    ctx.moveTo(-7, -33);
    ctx.quadraticCurveTo(-15, -13, -12, -1);
    ctx.quadraticCurveTo(-8, 3, -3, 1.5);
    ctx.lineTo(-1.5, -6); ctx.lineTo(1.5, -6); ctx.lineTo(3, 1.5);   // centre hem split
    ctx.quadraticCurveTo(8, 3, 12, -1);
    ctx.quadraticCurveTo(15, -13, 7, -33);
    ctx.closePath();
    const rg = ctx.createLinearGradient(0, -34, 0, 3);
    if (flash) { rg.addColorStop(0, '#a6ecd3'); rg.addColorStop(1, '#4c6f66'); }
    else { rg.addColorStop(0, '#37564f'); rg.addColorStop(0.55, '#243c37'); rg.addColorStop(1, '#141f1b'); }
    ctx.fillStyle = rg; ctx.fill();
    // Front highlight down the middle (form/volume).
    const hg = ctx.createLinearGradient(-6, 0, 6, 0);
    hg.addColorStop(0, 'rgba(130,210,185,0)');
    hg.addColorStop(0.5, flash ? 'rgba(220,255,245,0.22)' : 'rgba(130,210,185,0.16)');
    hg.addColorStop(1, 'rgba(130,210,185,0)');
    ctx.fillStyle = hg; ctx.fill();
    ctx.strokeStyle = 'rgba(111,247,195,0.30)'; ctx.lineWidth = 1.1; ctx.stroke();

    // ---- bone shoulder mantle (two pauldrons) ----
    ctx.fillStyle = flash ? '#eef8f2' : '#cfc6ad';
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(-8.5, -32, 5.5, 3.6, -0.35, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8.5, -32, 5.5, 3.6, 0.35, 0, TAU); ctx.fill(); ctx.stroke();

    // ---- hooded head ----
    ctx.beginPath();
    ctx.moveTo(-7.5, -33);
    ctx.quadraticCurveTo(-9, -49, 0, -50);
    ctx.quadraticCurveTo(9, -49, 7.5, -33);
    ctx.quadraticCurveTo(0, -30, -7.5, -33);
    ctx.closePath();
    const hd = ctx.createLinearGradient(0, -50, 0, -30);
    if (flash) { hd.addColorStop(0, '#9fe6cd'); hd.addColorStop(1, '#4a6a62'); }
    else { hd.addColorStop(0, '#2f4c45'); hd.addColorStop(1, '#1a2c28'); }
    ctx.fillStyle = hd; ctx.fill();
    ctx.strokeStyle = 'rgba(111,247,195,0.30)'; ctx.lineWidth = 1; ctx.stroke();
    // Face cavity (dark) then glowing eyes ON THE FACE.
    ctx.fillStyle = '#0b1310';
    ctx.beginPath(); ctx.ellipse(0, -39, 4.6, 5.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = eye; ctx.shadowColor = eye; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-2.1, -39, 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(2.1, -39, 1.5, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;

    // ---- staff crystal (in front), glowing in the eye colour ----
    const pulse = 0.7 + 0.3 * Math.sin(Game.time * 3);
    ctx.fillStyle = eye; ctx.shadowColor = eye; ctx.shadowBlur = 9 + 5 * pulse;
    ctx.beginPath(); ctx.arc(14, -51, 3.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(13, -52, 1.2, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}

// ------------------------------ Monsters ------------------------------------

class Enemy {
  constructor(type, x, y, opts = {}) {
    const t = MONSTERS[type];
    this.type = type;
    this.def = t;
    this.elite = !!opts.elite;
    this.rare = !!opts.rare;     // rare elite (purple, tougher, better loot)
    if (this.rare) this.elite = true;
    this.unique = !!opts.unique;
    this.mapBoss = !!opts.mapBoss;   // a linked sub-map's boss (e.g. cave dweller): death opens the exit
    this.goblin = !!opts.goblin || !!t.goblin;   // Treasure Goblin: flees, no attacks
    this.name = opts.name || t.name;
    const mLvl = Game.monsterLevel();
    const diff = DIFFICULTIES[Hero.difficulty];
    const eliteMul = this.rare ? 4.5 : this.elite ? 2.4 : 1;
    // The world gets harder as the hero hits the endgame: +5% at level 60,
    // +9% at level 70 (owner rule).
    const lvlDiff = Hero.level >= 70 ? 1.09 : Hero.level >= 60 ? 1.05 : 1.0;
    // Diving "ONWARD" compounds difficulty 1.2× per linked-map dive (Game.depthMul).
    const depthMul = (typeof Game !== 'undefined' && Game.depthMul) ? Game.depthMul() : 1;
    const scale = (1 + 0.20 * (mLvl - 1)) * diff.mult
      * eliteMul * (this.unique ? 9 : 1) * (t.hpMul || 1) * lvlDiff * depthMul;
    this.x = x; this.y = y;
    this.r = t.r + (this.elite ? 2 : 0) + (this.rare ? 2 : 0) + (this.unique ? 6 : 0);
    this.maxHp = Math.round(t.hp * scale);
    this.hp = this.maxHp;
    this.speed = t.speed * (1 + 0.008 * mLvl) * rand(0.9, 1.1) * (opts.speedMul || 1);
    this.dmg = Math.round(t.dmg * (1 + 0.11 * (mLvl - 1)) * Math.sqrt(diff.mult) * lvlDiff * depthMul * (this.rare ? 1.5 : this.elite ? 1.3 : 1) * (this.unique ? 1.6 : 1));
    this.xp = Math.round(t.xp * (1 + 0.12 * (mLvl - 1)) * diff.reward * depthMul * (this.rare ? 5 : this.elite ? 3 : 1) * (this.unique ? 12 : 1));
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
    // Boss ability kits — each archetype fights differently.
    if (this.unique || t.boss) {
      this.abilities = ({
        skeletonking: ['slam', 'summon', 'fissures', 'charge'],
        wraith: ['nova', 'fissures', 'charge', 'summon'],
        sandwyrm: ['fissures', 'charge', 'slam', 'nova'],
        wyrm: ['fissures', 'charge', 'nova', 'slam'],
        glutton: ['vomit', 'chain', 'summon', 'slam'],
        brute: ['charge', 'slam', 'nova']
      })[type] || ['charge', 'slam', 'nova'];
    }
    this.enraged = false;      // set once when hp drops past def.enrageAt
    this.stealthT = 0;         // Rathma's Chosen fades to smoke while hurt
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
    this.stealthT = Math.max(0, this.stealthT - dt);
    this.fearT = Math.max(0, (this.fearT || 0) - dt);       // feared → flees (rune effects)
    this.brittleT = Math.max(0, (this.brittleT || 0) - dt); // brittle → takes more crits
    if (this.curse) {
      this.curse.t -= dt;
      if (this.curse.t <= 0) this.curse = null;
    }
    // Enrage: once health drops past the threshold, permanently harder-hitting
    // and (retroactively) higher max health (owner spec per boss).
    if (!this.enraged && this.def.enrageAt && this.hp <= this.maxHp * this.def.enrageAt) {
      this.enraged = true;
      this.dmg = Math.round(this.dmg * (1 + (this.def.enrageDmg || 0)));
      const hpBump = Math.round(this.maxHp * (this.def.enrageHp || 0));
      this.maxHp += hpBump; this.hp += hpBump;
      Particles.text(this.x, this.y - this.r - 12, 'ENRAGED!', { color: '#ff3b3b', size: 15, life: 1.4 });
      Particles.spawn(this.x, this.y, { count: 22, color: ['#ff3b3b', '#ff8c2a', '#c22843'], minSpeed: 60, maxSpeed: 240, minLife: 0.3, maxLife: 0.7, glow: true });
      Particles.shake(6); AudioSys.sfx('wave');
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

    // Feared: flee from the hero and don't attack (Horrific Return, Panic Attack,
    // Bone Golem/Army variants). Bosses & uniques are immune.
    if (this.fearT > 0 && !this.unique && !this.def.boss) {
      const p = Game.player;
      if (p && !p.dead) {
        const away = angleTo(p.x, p.y, this.x, this.y);
        this.facing = lerpAngle(this.facing, away, Math.min(1, 10 * dt));
        let spd = this.speed * 1.1;
        if (this.slow > 0) spd *= 0.5;
        if (this.root > 0) spd = 0;
        if (spd > 0) { this.x += Math.cos(away) * spd * dt; this.y += Math.sin(away) * spd * dt; }
        World.collide(this);
        return;
      }
    }

    if ((this.unique || this.def.boss) && this.bossUpdate(dt)) {
      World.collide(this);
      return;
    }

    // Treasure Goblin: never fights. Ambles idly until struck, then sprints
    // away from the hero, spilling a coin every 2s while actively pursued.
    if (this.goblin) {
      const p = Game.player;
      const gd = p && !p.dead ? dist(this.x, this.y, p.x, p.y) : 1e9;
      if (this.hp < this.maxHp) this.fleeing = true;
      let moved = false;
      if (this.fleeing && gd < 900) {
        const away = angleTo(p.x, p.y, this.x, this.y);
        this.facing = lerpAngle(this.facing, away, Math.min(1, 10 * dt));
        let spd = this.speed;
        if (this.slow > 0) spd *= 0.6;
        if (this.root > 0) spd = 0;
        if (spd > 0) { this.x += Math.cos(away) * spd * dt; this.y += Math.sin(away) * spd * dt; moved = true; }
      } else if (!this.fleeing) {
        this.gWander = (this.gWander || 0) - dt;
        if (this.gWander <= 0) { this.gWander = rand(1.2, 2.6); this.gDir = rand(TAU); }
        this.x += Math.cos(this.gDir) * this.speed * 0.16 * dt;
        this.y += Math.sin(this.gDir) * this.speed * 0.16 * dt;
        this.facing = this.gDir;
      }
      // Coins only while fleeing AND moving AND the hero is close (being chased).
      if (this.fleeing && moved && gd < 620) {
        this.coinT = (this.coinT || 0) - dt;
        if (this.coinT <= 0) {
          this.coinT = 2;
          const coin = new Pickup(this.x + rand(-10, 10), this.y + rand(-6, 6), 'gold');
          coin.amount = 1;
          Game.pickups.push(coin);
          Particles.ring(this.x, this.y, 16, '#ffd76a', 3, 0.3);
        }
      } else {
        this.coinT = 2;   // stopped chasing → reset the drip
      }
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
      case 'normal': {
        this.mechCd -= dt;
        if (this.mechCd > 0) return false;
        // Choose an ability the boss can actually use at this range.
        const kit = this.abilities || ['charge', 'slam'];
        const pool = kit.filter(ab => ab === 'slam' ? d < 190 : ab === 'charge' ? d < 620 : ab === 'chain' ? d < 520 : true);
        const ab = pick(pool.length ? pool : ['slam']);
        this.mechCd = rand(3.6, 5.6);
        if (ab === 'slam') {
          this.state = 'windSlam'; this.stateT = 0.75;
          this.telegraph = { type: 'circle', x: this.x, y: this.y, r: 165, t: 0, maxT: 0.75 };
          Game.telegraphs.push(this.telegraph);
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'charge') {
          this.state = 'windCharge'; this.stateT = 0.8;
          this.chargeA = angleTo(this.x, this.y, tgt.x, tgt.y);
          this.facing = this.chargeA;
          this.telegraph = { type: 'line', x: this.x, y: this.y, a: this.chargeA, len: 540, w: this.r * 2 + 18, t: 0, maxT: 0.8 };
          Game.telegraphs.push(this.telegraph);
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'nova') {
          this.state = 'windNova'; this.stateT = 0.6;
          this.telegraph = { type: 'circle', x: this.x, y: this.y, r: 130, t: 0, maxT: 0.6 };
          Game.telegraphs.push(this.telegraph);
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'summon') {
          this.state = 'summon'; this.stateT = 0.5;
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'vomit') {
          // Vomits a spreading bile pool — several overlapping AoE splats around
          // the hero that deal exceptional area damage as they land.
          const pp = Game.player;
          this.state = 'vomit'; this.stateT = 0.7;
          this.facing = angleTo(this.x, this.y, pp.x, pp.y);
          this.vomitAt = { x: clamp(pp.x, 40, World.W - 40), y: clamp(pp.y, 40, World.H - 40) };
          this.telegraph = { type: 'circle', x: this.vomitAt.x, y: this.vomitAt.y, r: 150, t: 0, maxT: 0.7 };
          Game.telegraphs.push(this.telegraph);
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'chain') {
          // Hurls a hooked chain in a wide cone; if it catches the hero it reels
          // them in and stuns for 2s.
          this.state = 'windChain'; this.stateT = 0.65;
          this.chainA = angleTo(this.x, this.y, tgt.x, tgt.y);
          this.facing = this.chainA;
          this.telegraph = { type: 'line', x: this.x, y: this.y, a: this.chainA, len: 500, w: 240, t: 0, maxT: 0.65 };
          Game.telegraphs.push(this.telegraph);
          AudioSys.sfx('wave');
          return true;
        }
        if (ab === 'fissures') {
          // Erupting ground fissures chase the hero — several delayed blasts;
          // the boss keeps moving while they land.
          const pp = Game.player;
          for (let i = 0; i < 4; i++) {
            const tx = clamp(i === 0 ? pp.x : pp.x + rand(-170, 170), 40, World.W - 40);
            const ty = clamp(i === 0 ? pp.y : pp.y + rand(-170, 170), 40, World.H - 40);
            const delay = 0.9 + i * 0.24;
            Game.telegraphs.push({ type: 'circle', x: tx, y: ty, r: 72, t: 0, maxT: delay });
            this.strikes.push({ x: tx, y: ty, r: 72, dmg: Math.round(this.dmg * 1.1), t: delay });
          }
          AudioSys.sfx('bolt');
          return false;   // keep chasing
        }
        return false;
      }
      case 'windNova':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'normal';
          if (this.telegraph) this.telegraph.done = true;
          const n = 14;
          for (let i = 0; i < n; i++) {
            Game.projectiles.push(new Projectile(this.x, this.y, i / n * TAU, {
              speed: 300, dmg: Math.round(this.dmg * 0.9), r: 7, life: 2.2, friendly: false, type: 'bolt'
            }));
          }
          fxNova(this.x, this.y, 130); AudioSys.sfx('nova'); Particles.shake(4);
        }
        return true;
      case 'vomit':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'normal';
          if (this.telegraph) this.telegraph.done = true;
          // The splat lands, plus two smaller bile pools spreading outward — all
          // dealing exceptional area damage where they hit.
          const va = this.vomitAt || { x: this.x, y: this.y };
          fxExplosion(va.x, va.y, 150);
          Particles.spawn(va.x, va.y, { count: 30, color: ['#7fa83a', '#4a5e2a', '#a8c24a', '#9ac24a'], minSpeed: 40, maxSpeed: 230, minLife: 0.4, maxLife: 1.0, grav: 60 });
          Particles.shake(6); AudioSys.sfx('explode');
          const bileDmg = Math.round(this.dmg * 1.6);
          const splats = [[va.x, va.y, 150], [va.x + rand(-120, 120), va.y + rand(-120, 120), 100], [va.x + rand(-120, 120), va.y + rand(-120, 120), 100]];
          for (const [sx, sy, sr] of splats) {
            const pp = Game.player;
            if (pp && !pp.dead && dist(sx, sy, pp.x, pp.y) < sr + pp.r) pp.hurt(bileDmg);
            for (const m of Game.minions) if (!m.dead && dist(sx, sy, m.x, m.y) < sr + m.r) m.hurt(bileDmg);
          }
        }
        return true;
      case 'windChain': {
        this.facing = this.chainA;
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'normal';
          if (this.telegraph) this.telegraph.done = true;
          // Reel the hero in if they're inside the cone, then stun for 2s.
          const pp = Game.player;
          if (pp && !pp.dead) {
            const dd = dist(this.x, this.y, pp.x, pp.y);
            const rel = Math.abs(((angleTo(this.x, this.y, pp.x, pp.y) - this.chainA + Math.PI * 3) % TAU) - Math.PI);
            if (dd < 520 && rel < 0.55) {
              const stopA = angleTo(this.x, this.y, pp.x, pp.y);
              pp.x = this.x + Math.cos(stopA) * (this.r + pp.r + 16);
              pp.y = this.y + Math.sin(stopA) * (this.r + pp.r + 16);
              World.collide(pp);
              pp.stun = Math.max(pp.stun || 0, 2);
              pp.hurt(Math.round(this.dmg * 0.6));
              Particles.text(pp.x, pp.y - 22, 'CHAINED!', { color: '#ff8c2a', size: 14, life: 1.2 });
              Particles.shake(5); AudioSys.sfx('explode');
            }
          }
        }
        return true;
      }
      case 'summon':
        this.stateT -= dt;
        if (this.stateT <= 0) {
          this.state = 'normal';
          const n = randInt(2, 4);
          const kinds = this.type === 'skeletonking' ? ['skeleton', 'skeleton', 'archer']
            : this.type === 'glutton' ? ['zombie', 'bloat', 'zombie'] : ['skeleton', 'zombie', 'ghoul'];
          for (let i = 0; i < n; i++) {
            const a = rand(TAU), dd = rand(44, 92);
            const add = new Enemy(pick(kinds), this.x + Math.cos(a) * dd, this.y + Math.sin(a) * dd, {});
            add.sleep = false; add.spawnT = 0.4;
            World.collide(add); Game.enemies.push(add);
          }
          fxSummon(this.x, this.y); AudioSys.sfx('summon');
        }
        return true;
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
    // Ruby flat damage adds to each primary hit (not to splash/DoT ticks).
    if (p && p.flatDmg && !opts.noSplash) dmg += p.flatDmg;
    // Brittle (Corpse Lance · Brittle Touch, Ice Golem): the victim takes crits
    // far more often while the debuff lasts.
    const critChance = (p ? p.critChance : 0.1) + (this.brittleT > 0 ? 0.25 : 0);
    const crit = Math.random() < critChance;
    if (crit) dmg *= 1.8 + (p ? (p.critDmg || 0) : 0);   // Emerald crit damage
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
    // Rathma's Chosen fades to smoke while you damage it — briefly hard to see.
    if (this.def.stealth && !this.dead) {
      if (this.stealthT <= 0) {
        Particles.spawn(this.x, this.y, { count: 10, color: ['#2a2436', '#4a4258', '#6b5f80'], minSpeed: 30, maxSpeed: 120, minLife: 0.3, maxLife: 0.7 });
        AudioSys.sfx('wave');
      }
      this.stealthT = 0.9;
    }
    // Amethyst life-per-hit: heal the Necromancer on each primary hit landed.
    if (p && !p.dead && (p.lifePerHit || 0) > 0 && !opts.noSplash) p.heal(p.lifePerHit);
    dmgText(this.x, this.y, dmg, crit);
    // Feed the DPS meter (dealt damage over a rolling window).
    if (Game.dpsHits) Game.dpsHits.push({ t: Game.time, d: dmg });
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
    // Land of the Dead · Shallow Graves: every 10 kills during it extends it (max +2s).
    if (Skills.lotd > 0 && Skills.lotdRune === 'shallowGraves') {
      Skills.lotdKills = (Skills.lotdKills || 0) + 1;
      if (Skills.lotdKills % 10 === 0) Skills.lotd = Math.min(Skills.lotd + 2, 30);
    }
    // Rifts: a slain rare-elite pack scatters 1-3 purple orbs (10 pts each).
    // The dev spawn boost swells packs, so orbs scale with it too — a boosted
    // rift/season drops proportionally more orbs (owner rule).
    if (Game.riftMode && this.elite && !this.guardian && !this.unique && Game.riftProgress < Game.riftGoal) {
      const boost = 1 + (Hero.cheats.spawn || 0);
      const n = Math.max(1, Math.round(randInt(1, 3) * boost));
      for (let i = 0; i < n; i++) Game.pickups.push(new Pickup(this.x + rand(-20, 20), this.y + rand(-20, 20), 'riftorb'));
    }
    fxBlood(this.x, this.y, this.unique ? 30 : 12);
    if (this.type === 'skeleton' || this.type === 'archer') fxBone(this.x, this.y, 12);
    // Nephalem Mongrel: a 35% CHANCE to drop the Nephalem Heartstring
    // (reagent for the Nephalem Torch).
    if (this.def.dropsHeartstring) {
      if (Math.random() < 0.35) {
        const n = randInt(1, 2);
        Hero.mats.heartstring += n;
        Particles.text(this.x, this.y - 14, '+' + n + ' Nephalem Heartstring', { color: MATERIALS.heartstring.color, size: 12, life: 1.4 });
        AudioSys.sfx('setdrop');
      } else {
        Particles.text(this.x, this.y - 14, 'No Heartstring…', { color: '#7a6f80', size: 11, life: 1.2 });
      }
    }
    // Phase-2 reagent bosses: a chance to drop their crafting material (owner
    // spec — Wyrm Scale 12%, Gluttonous Brain 10%, Souls of Rathma 20% ×1-3).
    if (this.def.dropMat) {
      if (Math.random() < (this.def.dropChance || 0.1)) {
        const [lo, hi] = this.def.dropN || [1, 1];
        const n = randInt(lo, hi);
        Hero.mats[this.def.dropMat] = (Hero.mats[this.def.dropMat] || 0) + n;
        Particles.text(this.x, this.y - this.r - 10, '+' + n + ' ' + MATERIALS[this.def.dropMat].name, { color: MATERIALS[this.def.dropMat].color, size: 13, life: 1.6 });
        AudioSys.sfx('setdrop');
      } else {
        Particles.text(this.x, this.y - this.r - 10, 'No ' + MATERIALS[this.def.dropMat].name + '…', { color: '#7a6f80', size: 11, life: 1.2 });
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

    // Treasure Goblin death: a burst of coins, gems and maybe damage gear.
    // (No further coin dripping — that stops the moment it dies.)
    if (this.goblin) {
      const gp = Game.player;
      const gf = gp ? gp.goldFind : 1;
      const gdiff = DIFFICULTIES[Hero.difficulty];
      const mLvl = Game.monsterLevel();
      const g = new Pickup(this.x, this.y, 'gold');
      g.amount = Math.round(rand(30, 80) * 3 * gdiff.reward * gf); // 3x a treasure chest
      Game.pickups.push(g);
      const ng = randInt(1, 3);
      for (let i = 0; i < ng; i++) {
        const pu = new Pickup(this.x + rand(-18, 18), this.y + rand(-12, 12), 'gem');
        pu.gem = Items.dropGem();
        Game.pickups.push(pu);
      }
      if (Math.random() < 0.22) {   // rare damage-focused gear
        const pu = new Pickup(this.x, this.y, 'item');
        pu.item = Items.generate(mLvl + 2, 0.3, 'weapon');
        Game.pickups.push(pu);
      }
      // 10% chance to drop the Golden Mirror (transmute it in the Cube for
      // instant orb pickup). Only drops if not already owned/converted.
      if (!Hero.goldenMirror && !Hero.orbAutoPickup && Math.random() < 0.10) {
        const mir = new Pickup(this.x, this.y, 'mirror');
        mir.vx = rand(-40, 40); mir.vy = rand(-40, 40);
        Game.pickups.push(mir);
      }
      fxNova(this.x, this.y, 90);
      Particles.spawn(this.x, this.y - 6, {
        count: 30, color: ['#ffd76a', '#ffb43a', '#fff0b0'], minSpeed: 50, maxSpeed: 260,
        minLife: 0.4, maxLife: 1.0, grav: 160, glow: true
      });
      Particles.shake(5);
      AudioSys.sfx('chest');
      return;
    }

    const p = Game.player;
    const diff = DIFFICULTIES[Hero.difficulty];
    const dropGold = () => {
      const g = new Pickup(this.x, this.y, 'gold');
      g.amount = Math.round(g.amount * diff.reward * (p ? p.goldFind : 1) * (this.elite ? 3 : 1) * (this.unique ? 15 : 1));
      Game.pickups.push(g);
    };
    // Not every kill needs to spew gear/gems/trash — roughly HALF of ordinary
    // monsters just cough up a little gold and nothing else (owner rule). Elites
    // and uniques always roll the full loot table.
    if (!this.elite && !this.unique && Math.random() < 0.5) { dropGold(); return; }
    if (Math.random() < 0.32) dropGold();
    if (Math.random() < (this.unique ? 1 : this.elite ? 0.3 : 0.06)) {
      Game.pickups.push(new Pickup(this.x, this.y, 'orb'));
    }
    const dropChance = this.unique ? 1 : this.elite ? 0.45 : 0.035 * diff.reward;
    if (Math.random() < dropChance) {
      const pu = new Pickup(this.x, this.y, 'item');
      pu.item = Items.wildDrop(Game.monsterLevel(), (this.elite ? 0.12 : 0) + (this.unique ? 0.2 : 0));
      Game.pickups.push(pu);
    }
    if (this.unique) {
      // The bounty boss always drops a second, better item.
      const pu = new Pickup(this.x, this.y, 'item');
      pu.item = Items.wildDrop(Game.monsterLevel() + 2, 0.35);
      Game.pickups.push(pu);
    }
    if (Math.random() < (this.unique ? 0.9 : this.elite ? 0.16 : 0.05)) {   // gem roll gate
      const gem = Items.rollWildGem();       // may be null (the drop table's None column)
      if (gem) {
        const pu = new Pickup(this.x, this.y, 'gem');
        pu.gem = gem;
        Game.pickups.push(pu);
      }
    }
    if (this.unique || this.mapBoss) Game.onBossDead(this);
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

    // Stealth: the assassin all but vanishes into smoke while being hit.
    if (this.stealthT > 0) ctx.globalAlpha = 0.16 + 0.08 * Math.sin(this.anim * 8);
    if (this.elite || this.unique) {
      // Owner rule: normal elites glow YELLOW, rare elites PURPLE, bosses orange.
      const col = this.unique ? '255,140,42' : this.rare ? '176,106,223' : '255,216,74';
      ctx.strokeStyle = `rgba(${col},${0.45 + 0.25 * Math.sin(this.anim * 2)})`;
      ctx.lineWidth = this.rare ? 2.6 : 2;
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
      case 'wraith': {
        // A spectral ghost lord — translucent hooded revenant that drifts.
        const drift = Math.sin(this.anim * 1.4) * 3;
        ctx.globalAlpha = 0.78;
        // Tattered robe fading into a smoky tail.
        ctx.fillStyle = fl ? '#e8f0ff' : '#5a6f9a';
        ctx.beginPath();
        ctx.moveTo(0, -26 + drift);
        ctx.quadraticCurveTo(20, -8, 15, 16);
        ctx.quadraticCurveTo(9, 10 + Math.sin(this.anim * 3) * 3, 4, 22);
        ctx.quadraticCurveTo(0, 14, -4, 22);
        ctx.quadraticCurveTo(-9, 10 - Math.sin(this.anim * 3) * 3, -15, 16);
        ctx.quadraticCurveTo(-20, -8, 0, -26 + drift);
        ctx.fill();
        // Inner shroud glow.
        ctx.fillStyle = fl ? '#fff' : 'rgba(180,210,255,0.5)';
        ctx.beginPath(); ctx.ellipse(0, -14 + drift, 8, 11, 0, 0, TAU); ctx.fill();
        // Hood void + burning eyes.
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#0c1226';
        ctx.beginPath(); ctx.arc(0, -16 + drift, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = '#bfe3ff';
        ctx.shadowColor = '#8fd0ff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-2.6, -17 + drift, 1.7, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.6, -17 + drift, 1.7, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case 'skeletonking': {
        // A towering crowned skeleton on a throne of bone — the Act finale.
        const s = 1.25;
        ctx.save(); ctx.scale(s, s);
        // Ribcage torso.
        ctx.fillStyle = fl ? '#fff' : '#d8cfb8';
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.quadraticCurveTo(16, -8, 12, 20); ctx.lineTo(-12, 20);
        ctx.quadraticCurveTo(-16, -8, 0, -20); ctx.fill();
        ctx.strokeStyle = fl ? '#d8cfb8' : '#8a8070'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const yy = -10 + i * 7;
          ctx.beginPath(); ctx.moveTo(-9 + i, yy); ctx.quadraticCurveTo(0, yy + 4, 9 - i, yy); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 16); ctx.stroke();
        // Great sword in the right hand.
        const sw = Math.sin(this.anim * 1.4) * 4;
        ctx.strokeStyle = fl ? '#fff' : '#c9c0a8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(12, 2); ctx.lineTo(20, -6 + sw); ctx.stroke();
        ctx.strokeStyle = '#e6ecf4'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(20, -6 + sw); ctx.lineTo(30, -30 + sw); ctx.stroke();
        ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(16, -2 + sw); ctx.lineTo(24, -8 + sw); ctx.stroke();
        // Skull.
        ctx.fillStyle = fl ? '#fff' : '#e8e0cc';
        ctx.beginPath(); ctx.arc(0, -24, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1418';
        ctx.beginPath(); ctx.arc(-3.4, -25, 2.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3.4, -25, 2.4, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e0402f'; ctx.shadowColor = '#e0402f'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(-3.4, -25, 1.1, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(3.4, -25, 1.1, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#c9c0a8'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(4, -20); ctx.stroke();
        // Golden crown.
        ctx.fillStyle = '#e8c34a';
        ctx.beginPath();
        ctx.moveTo(-9, -30); ctx.lineTo(-9, -34); ctx.lineTo(-5, -31); ctx.lineTo(-2, -36);
        ctx.lineTo(0, -31); ctx.lineTo(2, -36); ctx.lineTo(5, -31); ctx.lineTo(9, -34);
        ctx.lineTo(9, -30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e0402f';
        ctx.beginPath(); ctx.arc(0, -32, 1.3, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case 'wyrm':
      case 'sandwyrm': {
        // A colossal desert serpent rearing from the sand — segmented coils,
        // a fanged maw and gnashing mandibles.
        const s = 1.35;
        ctx.save(); ctx.scale(s, s);
        const sway = Math.sin(this.anim * 1.3) * 5;
        // Sand mound it erupts from.
        ctx.fillStyle = fl ? '#c9b078' : '#6a5326';
        ctx.beginPath(); ctx.ellipse(0, 20, 26, 9, 0, 0, TAU); ctx.fill();
        // Coiling body segments, tapering upward.
        for (let i = 5; i >= 0; i--) {
          const yy = 16 - i * 7;
          const xx = Math.sin(this.anim * 1.3 + i * 0.6) * (i * 1.6) + sway * (i / 6);
          const rad = 15 - i * 1.6;
          ctx.fillStyle = fl ? '#fff' : (i % 2 ? '#8a6a3a' : '#a07e46');
          ctx.beginPath(); ctx.ellipse(xx, yy, rad, rad * 0.82, 0, 0, TAU); ctx.fill();
          // Chitin ridge highlight.
          ctx.fillStyle = fl ? '#fff' : 'rgba(220,190,120,0.5)';
          ctx.beginPath(); ctx.ellipse(xx, yy - rad * 0.4, rad * 0.6, rad * 0.3, 0, 0, TAU); ctx.fill();
        }
        // Head at the top.
        const hx = sway, hy = -26;
        ctx.fillStyle = fl ? '#fff' : '#b58a4a';
        ctx.beginPath(); ctx.ellipse(hx, hy, 12, 14, 0, 0, TAU); ctx.fill();
        // Gaping maw with teeth.
        ctx.fillStyle = '#2a0e08';
        ctx.beginPath(); ctx.ellipse(hx, hy + 3, 7, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f0e6cc';
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * TAU;
          ctx.beginPath();
          ctx.moveTo(hx + Math.cos(a) * 6, hy + 3 + Math.sin(a) * 7);
          ctx.lineTo(hx + Math.cos(a) * 3, hy + 3 + Math.sin(a) * 3.5);
          ctx.lineTo(hx + Math.cos(a + 0.3) * 6, hy + 3 + Math.sin(a + 0.3) * 7);
          ctx.closePath(); ctx.fill();
        }
        // Mandibles.
        ctx.strokeStyle = fl ? '#fff' : '#7a5a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const mand = Math.sin(this.anim * 2) * 3;
        ctx.beginPath(); ctx.moveTo(hx - 9, hy - 2); ctx.quadraticCurveTo(hx - 16 - mand, hy + 4, hx - 12, hy + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx + 9, hy - 2); ctx.quadraticCurveTo(hx + 16 + mand, hy + 4, hx + 12, hy + 12); ctx.stroke();
        // Burning eyes.
        ctx.fillStyle = '#ffb43a'; ctx.shadowColor = '#ff8c2a'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(hx - 4, hy - 3, 2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + 4, hy - 3, 2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'goblin': {
        // A hunched imp lugging a treasure chest on its back, pulsing gold.
        const glow = 0.5 + 0.5 * Math.sin(this.anim * 2.2);
        ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 8 + glow * 10;
        // Body.
        ctx.fillStyle = fl ? '#fff' : '#3a6a4a';
        ctx.beginPath(); ctx.ellipse(0, 2, 11, 13, 0, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        // Treasure chest/sack on the back (behind = -y after facing rotate).
        ctx.fillStyle = '#6a4a24';
        rr(ctx, -9, -14, 18, 12, 3); ctx.fill();
        ctx.fillStyle = '#8a6a34';
        rr(ctx, -9, -14, 18, 4, 2); ctx.fill();
        ctx.fillStyle = '#e8c34a';
        ctx.fillRect(-2, -14, 4, 12);   // gold latch
        ctx.beginPath(); ctx.arc(0, -8, 1.6, 0, TAU); ctx.fill();
        // Coins spilling glint.
        ctx.fillStyle = `rgba(255,220,110,${(0.4 + 0.5 * glow).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(6, -12, 1.6, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-6, -11, 1.4, 0, TAU); ctx.fill();
        // Head + eyes.
        ctx.fillStyle = fl ? '#fff' : '#4a7a58';
        ctx.beginPath(); ctx.arc(0, 8, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd24a'; ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(-2.2, 8, 1.2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2.2, 8, 1.2, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0;
        // Little legs.
        ctx.strokeStyle = fl ? '#fff' : '#2e5240'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        const gl = Math.sin(this.anim * 5) * 3;
        ctx.beginPath(); ctx.moveTo(-4, 13); ctx.lineTo(-6, 18 + gl); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, 13); ctx.lineTo(6, 18 - gl); ctx.stroke();
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
      case 'glutton': {
        // A huge, huge, HUGE fat ogre — bloated, grotesque, sickly GREEN flesh
        // mottled with BRUISE-PURPLE welts. Flushes an angrier bruise when enraged.
        const belly = this.enraged ? '#5a5a3a' : '#66723f';
        const skin = this.enraged ? '#5a3f5f' : '#6b5570';   // bruise purple
        ctx.fillStyle = fl ? '#e6f0c0' : belly;
        ctx.beginPath(); ctx.ellipse(0, 6, 30, 26, 0, 0, TAU); ctx.fill();   // gut
        ctx.strokeStyle = 'rgba(14,10,18,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 6, 30, 26, 0, 0, TAU); ctx.stroke();
        // Bruise-purple welts blotching the gut.
        ctx.fillStyle = fl ? '#d8c0e0' : 'rgba(90,60,110,0.7)';
        ctx.beginPath(); ctx.ellipse(-12, 8, 7, 5, 0.4, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(10, 14, 6, 4, -0.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(4, -2, 5, 4, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = fl ? '#e6f0c0' : skin;
        ctx.beginPath(); ctx.arc(-20, -4, 8, 0, TAU); ctx.fill();            // shoulders
        ctx.beginPath(); ctx.arc(20, -4, 8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -20, 11, 0, TAU); ctx.fill();           // small head
        // Vile dribbling maw + green bile.
        ctx.fillStyle = '#241a2a';
        ctx.beginPath(); ctx.ellipse(0, -17, 6, 4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8fbf3a';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-4 + i * 4, -12 + (this.anim * 2 + i) % 3 * 2, 1.6, 0, TAU); ctx.fill(); }
        // Eyes.
        ctx.fillStyle = this.enraged ? '#ff3b3b' : '#c8e06a';
        ctx.beginPath(); ctx.arc(-4, -22, 1.8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(4, -22, 1.8, 0, TAU); ctx.fill();
        break;
      }
      case 'rathma': {
        // A tall, slender assassin — a lean cloaked figure with a hood and thin
        // twin blades; reads as smoke-and-shadow.
        const cloak = fl ? '#e8e0cc' : '#241f30';
        ctx.fillStyle = cloak;
        ctx.beginPath();
        ctx.moveTo(0, -22); ctx.quadraticCurveTo(9, -6, 6, 18);
        ctx.lineTo(-6, 18); ctx.quadraticCurveTo(-9, -6, 0, -22); ctx.fill();
        ctx.strokeStyle = 'rgba(176,106,223,0.5)'; ctx.lineWidth = 1.2; ctx.stroke();
        // Hood + eyes.
        ctx.fillStyle = '#0c0a12';
        ctx.beginPath(); ctx.arc(0, -18, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = this.enraged ? '#ff3b3b' : '#b06adf';
        ctx.beginPath(); ctx.arc(-2, -18, 1.3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(2, -18, 1.3, 0, TAU); ctx.fill();
        // Thin blades.
        ctx.strokeStyle = fl ? '#fff' : '#9aa0b0'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-13, 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(13, 12); ctx.stroke();
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
    // Idle formation: a stable lateral slot so idle minions line up BEHIND the
    // hero instead of orbiting him. -1..1 spreads them left→right.
    this.formOffset = rand(-1, 1);
    fxSummon(x, y);
  }

  update(dt) {
    this.anim += dt * 8;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    // Left behind? If a minion is far from the hero for more than 5s (stuck on
    // terrain, lost after a portal), blink it back to his side.
    {
      const pl = Game.player;
      if (pl) {
        if (dist(this.x, this.y, pl.x, pl.y) > 460) {
          this.behindT = (this.behindT || 0) + dt;
          if (this.behindT > 5) {
            this.behindT = 0;
            const ta = rand(TAU);
            this.x = pl.x + Math.cos(ta) * 56; this.y = pl.y + Math.sin(ta) * 56;
            fxSummon(this.x, this.y);
          }
        } else this.behindT = 0;
      }
    }
    if (this.life !== Infinity) {
      this.life -= dt;
      if (this.life <= 0) {
        this.dead = true;
        if (this.giftCorpse) Game.corpses.push(new Corpse(this.x, this.y, 'zombie'));  // Gift of Death / Purgatory
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
    const dmgMult = Game.player.power() * (this.frenzyT > 0 ? 1.5 : 1) * (this.dmgBuff || 1);
    // Minions keep pace with the Nekromancer — never slower than the hero, so they
    // don't lag behind as you run (owner rule). Move-speed gear speeds them up too.
    const travel = Game.player ? Math.max(this.speed, Game.player.speed) : this.speed;
    if (tgt) {
      const a = angleTo(this.x, this.y, tgt.x, tgt.y);
      this.facing = lerpAngle(this.facing, a, Math.min(1, 10 * dt));
      if (this.cfg.ranged) {
        if (bestD > 300) {
          this.x += Math.cos(a) * travel * dt;
          this.y += Math.sin(a) * travel * dt;
        } else if (this.atkCd <= 0) {
          this.atkCd = this.cfg.atkCd * (this.archer ? 0.6 : 1);   // Skeleton Archer: faster
          Game.projectiles.push(new Projectile(this.x, this.y - 8, a, {
            speed: 480, dmg: this.dmg * dmgMult, r: 5, life: 1.4, type: 'deathbolt'
          }));
          AudioSys.sfx('bolt');
        }
      } else if (bestD > this.r + tgt.r + 6) {
        this.x += Math.cos(a) * travel * (this.frenzyT > 0 ? 1.3 : 1) * dt;
        this.y += Math.sin(a) * travel * (this.frenzyT > 0 ? 1.3 : 1) * dt;
      } else if (this.atkCd <= 0) {
        this.atkCd = this.cfg.atkCd;
        tgt.hurt(this.dmg * dmgMult, { knock: { a, f: this.kind === 'golem' ? 120 : 40 } });
        // Dark Mending: commanded skeletons heal the necromancer on each hit.
        if (this.healOnHit && !Game.player.dead) Game.player.heal(Game.player.maxHp * 0.005);
      }
      // Contamination: a decaying mage channels a blight aura around itself.
      if (this.blightAura) {
        this.blightTick = (this.blightTick || 0) - dt;
        if (this.blightTick <= 0) {
          this.blightTick = 0.5;
          for (const e of Game.enemies) {
            if (e.dead || e.sleep) continue;
            if (dist(this.x, this.y, e.x, e.y) < 120) e.hurt(this.dmg * dmgMult * 0.5, { noSplash: true });
          }
          Particles.spawn(this.x, this.y, { count: 2, color: ['#4ade80', '#2a7a3a'], minSpeed: 10, maxSpeed: 40, minLife: 0.3, maxLife: 0.6 });
        }
      }
    } else {
      // Idle: fall in BEHIND the hero (opposite his facing) in a loose rank —
      // no more orbiting. Each minion holds a stable lateral slot (formOffset).
      const p = Game.player;
      const back = p.facing + Math.PI;
      const depth = this.kind === 'golem' ? 58 : 46;
      const bx = p.x + Math.cos(back) * depth + Math.cos(back + Math.PI / 2) * this.formOffset * 42;
      const by = p.y + Math.sin(back) * depth + Math.sin(back + Math.PI / 2) * this.formOffset * 42;
      const d = dist(this.x, this.y, bx, by);
      if (d > 22) {
        const a = angleTo(this.x, this.y, bx, by);
        this.facing = lerpAngle(this.facing, a, Math.min(1, 9 * dt));
        // A touch quicker than the hero when catching up in formation, so the
        // rank re-forms promptly instead of trailing forever.
        this.x += Math.cos(a) * travel * 1.08 * dt;
        this.y += Math.sin(a) * travel * 1.08 * dt;
      } else {
        // In position — face the same way as the hero, standing guard behind him.
        this.facing = lerpAngle(this.facing, p.facing, Math.min(1, 6 * dt));
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
      if (this.giftCorpse) Game.corpses.push(new Corpse(this.x, this.y, 'zombie'));  // Gift of Death / Purgatory
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
      // Two legs — a walking gait (the legs swing in opposite phase).
      ctx.lineWidth = 2.5;
      const legSw = Math.sin(this.anim * 1.8) * 3.2;
      ctx.beginPath(); ctx.moveTo(-1.8, 7); ctx.lineTo(-4, 15 + legSw); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.8, 7); ctx.lineTo(4, 15 - legSw); ctx.stroke();
      ctx.lineWidth = 2.5;
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

    // Name tag floating over the head — "<Hero>'s Minion" (the blood clone is
    // the hero himself, so it gets none). Drawn upright in world space.
    if (this.kind !== 'sim') {
      const label = (Hero.name || 'The Nekromancer') + "'s Minion";
      ctx.save();
      ctx.globalAlpha = fade * 0.62;
      ctx.font = '8px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const ty = this.y - this.r - 8;
      ctx.fillStyle = 'rgba(6,6,10,0.9)';
      ctx.fillText(label, this.x + 0.6, ty + 0.6);
      ctx.fillStyle = '#cdeee0';
      ctx.fillText(label, this.x, ty);
      ctx.restore();
    }
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
    this.kind = kind; // 'gold' | 'orb' | 'riftorb' | 'item' | 'gem' | 'mirror' | 'cube'
    this.vx = rand(-70, 70);
    this.vy = rand(-70, 70);
    this.t = 0;
    this.gone = false;
    this.amount = kind === 'gold' ? randInt(6, 18) : 0;
  }

  update(dt) {
    this.t += dt;
    const p = Game.player;
    // Golden Mirror converted: purple orbs are collected instantly, no chase.
    if (this.kind === 'riftorb' && Hero.orbAutoPickup && p && !p.dead) {
      this.gone = true;
      Game.addRiftPoints(10);
      Particles.spawn(p.x, p.y - 10, {
        count: 6, color: ['#b06adf', '#d8b4f0'], minSpeed: 40, maxSpeed: 120,
        minLife: 0.15, maxLife: 0.4, glow: true
      });
      AudioSys.sfx('gem');
      return;
    }
    // Dropped ITEMS and quest pickups (Cube/Mirror) linger until collected;
    // other pickups fade at 60s.
    const lingers = this.kind === 'item' || this.kind === 'cube' || this.kind === 'mirror';
    if (this.t > 60 && !lingers) { this.gone = true; return; }
    // A full bag leaves loot on the ground: no magnet, no pickup (owner rule).
    // Gold/orbs/gems (they go to the pouch) are never blocked.
    const blocked = this.kind === 'item' && !Items.canPickup(this.item);
    const d = dist(this.x, this.y, p.x, p.y);
    const mag = 110 * (1 + (p.pickupRadius || 0));   // paragon Pickup Radius widens the magnet
    if (!blocked && d < mag && !p.dead) {
      const a = angleTo(this.x, this.y, p.x, p.y);
      const pull = (mag - d) * 6 + 120;
      this.vx += Math.cos(a) * pull * dt * 4;
      this.vy += Math.sin(a) * pull * dt * 4;
    }
    this.vx *= 1 - Math.min(1, 4 * dt);
    this.vy *= 1 - Math.min(1, 4 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (!blocked && d < 20 && !p.dead) {
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
      } else if (this.kind === 'mirror') {
        Hero.goldenMirror = true;
        UI.toast('You found the GOLDEN MIRROR — transmute it in the Horadric\'s Cube', '#ffd76a');
        fxNova(p.x, p.y, 70);
        AudioSys.sfx('setdrop');
        Hero.save();
      } else if (this.kind === 'cube') {
        Hero.hasCube = true;
        UI.toast('You found the HORADRIC\'S CUBE — it now waits in town', RARITIES[6].color);
        fxNova(p.x, p.y, 90);
        Particles.shake(6);
        AudioSys.sfx('setdrop');
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
      // Legendary (orange) and Set (green) drops fire a tall pillar of light.
      const rr2 = this.item.rarity;
      if (rr2 >= 4) {
        const beamCol = rr2 === 6 ? '255,59,59' : rr2 >= 5 ? '78,222,128' : '255,140,42';
        const bh2 = 150;
        const pillar = ctx.createLinearGradient(0, -bh2, 0, 0);
        pillar.addColorStop(0, `rgba(${beamCol},0)`);
        pillar.addColorStop(1, `rgba(${beamCol},0.7)`);
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Game.time * 3 + this.x);
        ctx.fillStyle = pillar;
        ctx.fillRect(-5, -bh2, 10, bh2);
        ctx.globalAlpha = 1;
        // Rising sparks in the beam.
        for (let i = 0; i < 3; i++) {
          const sy = -((Game.time * 60 + i * 50 + this.x * 7) % bh2);
          ctx.fillStyle = `rgba(${beamCol},0.9)`;
          ctx.beginPath(); ctx.arc(Math.sin(Game.time * 4 + i) * 3, sy, 2, 0, TAU); ctx.fill();
        }
      }
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
      drawGemIcon(ctx, this.gem.type, this.gem.tier, 0, 0, 8);
    } else if (this.kind === 'mirror') {
      // The Golden Mirror — a gilded hand-mirror on a beam of light.
      const beam = ctx.createLinearGradient(0, -48, 0, 0);
      beam.addColorStop(0, 'rgba(255,215,106,0)');
      beam.addColorStop(1, 'rgba(255,215,106,0.7)');
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Game.time * 3 + this.x);
      ctx.fillStyle = beam; ctx.fillRect(-4, -48, 8, 48);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8c34a'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(0, -4, 7, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff7d8';
      ctx.beginPath(); ctx.ellipse(0, -4, 4.5, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.ellipse(-1.5, -6, 1.6, 2.6, -0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c9a04a'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(0, 11); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (this.kind === 'cube') {
      // The Horadric's Cube — a floating arcane box wreathed in red light.
      const beamCol = '255,59,59';
      const beam = ctx.createLinearGradient(0, -60, 0, 0);
      beam.addColorStop(0, `rgba(${beamCol},0)`);
      beam.addColorStop(1, `rgba(${beamCol},0.7)`);
      ctx.globalAlpha = 0.55 + 0.3 * Math.sin(Game.time * 3 + this.x);
      ctx.fillStyle = beam; ctx.fillRect(-6, -60, 12, 60);
      ctx.globalAlpha = 1;
      const spin = Math.sin(Game.time * 1.6) * 0.25;
      ctx.save(); ctx.rotate(spin);
      ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 14;
      // Cube faces.
      ctx.fillStyle = '#3a2622';
      ctx.beginPath();
      ctx.moveTo(-8, -2); ctx.lineTo(0, -8); ctx.lineTo(8, -2); ctx.lineTo(8, 8);
      ctx.lineTo(0, 14); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3a30';
      ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(0, -8); ctx.lineTo(0, 4); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a4a3a';
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, -2); ctx.lineTo(8, 8); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
      // Glowing runes.
      ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-4, 1); ctx.lineTo(-4, 5); ctx.moveTo(4, 1); ctx.lineTo(4, 5); ctx.stroke();
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath(); ctx.arc(0, 2, 1.6, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
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
    // Rune-effect hooks (Corpse Lance / Bone Spirit runes).
    this.stunOnHit = o.stunOnHit || 0;     // guaranteed stun/root on hit
    this.brittleOnHit = o.brittleOnHit || 0;
    this.ricochet = o.ricochet || 0;       // chance to bounce to a new target
    this.astralRamp = o.astralRamp || 0;   // +dmg fraction per enemy pierced
    this.detonateR = o.detonateR || 0;     // AoE detonation on impact
    this.detonateMul = o.detonateMul || 1;
    this.fearOnHit = o.fearOnHit || 0;
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
          if (this.stunOnHit) opts.root = Math.max(opts.root || 0, this.stunOnHit);
          if (this.slowOnHit) opts.slow = this.slowOnHit;
          e.hurt(this.dmg, opts);
          if (this.brittleOnHit) e.brittleT = Math.max(e.brittleT || 0, this.brittleOnHit);
          if (this.fearOnHit) {
            for (const e2 of Game.enemies) {
              if (e2.dead || e2.sleep) continue;
              if (dist(this.x, this.y, e2.x, e2.y) < 150) e2.fearT = Math.max(e2.fearT || 0, this.fearOnHit);
            }
          }
          // Detonation (Bone Spirit · Unfinished Business): an AoE blast on impact.
          if (this.detonateR) {
            fxExplosion(this.x, this.y, this.detonateR);
            for (const e2 of Game.enemies) {
              if (e2 === e || e2.dead || e2.sleep) continue;
              if (dist(this.x, this.y, e2.x, e2.y) < this.detonateR) e2.hurt(this.dmg * this.detonateMul);
            }
          }
          if (this.type === 'spirit' && !this.detonateR) {
            fxExplosion(this.x, this.y, 90);
            for (const e2 of Game.enemies) {
              if (e2 === e || e2.dead || e2.sleep) continue;
              if (dist(this.x, this.y, e2.x, e2.y) < 90) e2.hurt(this.dmg * 0.4);
            }
          }
          // Ricochet (Corpse Lance): a chance to leap to another nearby foe.
          if (this.ricochet && Math.random() < this.ricochet) {
            let next = null, bd = 300;
            for (const e2 of Game.enemies) {
              if (e2 === e || e2.dead || e2.sleep) continue;
              const dd = dist(this.x, this.y, e2.x, e2.y);
              if (dd < bd) { bd = dd; next = e2; }
            }
            if (next) Game.projectiles.push(new Projectile(this.x, this.y, angleTo(this.x, this.y, next.x, next.y), {
              speed: this.speed, dmg: this.dmg * 0.7, r: this.r, life: 1.0, type: this.type, homing: next
            }));
          }
          if (this.pierce) {
            this.hits.add(e);
            if (this.astralRamp) this.dmg *= 1 + this.astralRamp;  // ramps per enemy pierced
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
