'use strict';
// ---------------------------------------------------------------------------
// The Diablo 3 Necromancer kit, playable: behaviors for all 21 actives,
// passive hooks, cooldowns per skill, Land of the Dead state, Simulacrum
// mirroring, and the aim resolution shared by every targeted cast.
// ---------------------------------------------------------------------------

function nearestEnemy(x, y, maxDist = 750) {
  let best = null, bestD = maxDist;
  for (const e of Game.enemies) {
    if (e.dead || e.sleep || e.spawnT > 0 || e.charmed) continue;   // skip your own thralls
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function strongestEnemy(x, y, maxDist = 750) {
  let best = null, bestHp = 0;
  for (const e of Game.enemies) {
    if (e.dead || e.sleep || e.spawnT > 0 || e.charmed) continue;   // skip your own thralls
    if (dist(x, y, e.x, e.y) > maxDist) continue;
    if (e.hp > bestHp) { best = e; bestHp = e.hp; }
  }
  return best;
}

function resolveAim(explicit) {
  const p = Game.player;
  if (explicit !== null && explicit !== undefined) return explicit;
  if (Input.aim.active) return Game.aimWorldAngle(Input.aim.x, Input.aim.y);
  if (Input.mousePrimary || Input.mouseSecondary) {
    const hs = Game.worldToScreen(p.x, p.y);
    return Game.aimWorldAngle(Input.mousePos.x - hs.x, Input.mousePos.y - hs.y);
  }
  const e = nearestEnemy(p.x, p.y);
  if (e) return angleTo(p.x, p.y, e.x, e.y);
  return p.facing;
}

// A point to target: the nearest enemy, or a spot along the aim.
function aimPoint(a, reach = 240) {
  const p = Game.player;
  const e = nearestEnemy(p.x, p.y, 480);
  if (e) return { x: e.x, y: e.y, enemy: e };
  return { x: p.x + Math.cos(a) * reach, y: p.y + Math.sin(a) * reach, enemy: null };
}

function corpsesNear(x, y, range, max) {
  const out = [];
  for (const c of Game.corpses) {
    if (!c.gone && dist(x, y, c.x, c.y) < range) {
      out.push(c);
      if (out.length >= max) break;
    }
  }
  return out;
}

function minionCount(kind) {
  let n = 0;
  for (const m of Game.minions) if (!m.dead && m.kind === kind) n++;
  return n;
}

function cullOldest(kind) {
  for (let i = 0; i < Game.minions.length; i++) {
    if (Game.minions[i].kind === kind) {
      const m = Game.minions.splice(i, 1)[0];
      fxBone(m.x, m.y, 6);
      return;
    }
  }
}

function boneOpts(a, knockF = 60) {
  const o = { knock: { a, f: knockF } };
  if (Hero.hasPassive('rigorMortis')) o.slow = 2;
  if (Hero.hasPassive('bonePrison') && Math.random() < 0.3) o.root = 2;
  return o;
}

function applyCurse(type, cx, cy, radius = 220) {
  let n = 0;
  for (const e of Game.enemies) {
    if (e.dead || e.sleep) continue;
    if (dist(cx, cy, e.x, e.y) < radius) {
      e.curse = { type, t: 30 };
      n++;
    }
  }
  const cols = { decrepify: '#b06adf', frailty: '#e04a5a', leech: '#4ade80' };
  Particles.ring(cx, cy, radius, cols[type], 4, 0.5);
  AudioSys.sfx('curse');
  return n > 0;
}

// ------------------------------ behaviors ----------------------------------
// Each returns true if the cast succeeded (resource is spent by the caller).

const SKILL_FX = {

  boneSpikes(p, a) {
    const rune = Hero.rune('boneSpikes');
    const pt = aimPoint(a, 150);
    const line = rune === 'pathOfBones';   // strike a LINE, +100% to distant foes
    fxSpikes(pt.x, pt.y);
    if (line) fxSpikes((p.x + pt.x) / 2, (p.y + pt.y) / 2);
    World.smash(pt.x, pt.y, 60);
    const baseDmg = 14 * (rune === 'bonePillars' ? 1.5 : 1) * p.power(); // Bone Pillars: 225%
    let hit = 0;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      let inRange, dmg = baseDmg;
      if (line) {
        inRange = distToSeg(e.x, e.y, p.x, p.y, pt.x, pt.y) < 46 + e.r;
        if (inRange) dmg *= 1 + Math.min(1, dist(p.x, p.y, e.x, e.y) / 150);   // up to ×2 at reach
      } else {
        inRange = dist(pt.x, pt.y, e.x, e.y) < 60 + e.r;
      }
      if (inRange) {
        const o = boneOpts(angleTo(p.x, p.y, e.x, e.y), rune === 'bonePillars' ? 90 : 20);
        if (rune === 'suddenImpact') o.root = Math.max(o.root || 0, 1);  // stun
        if (rune === 'frostSpikes') o.slow = Math.max(o.slow || 0, 2);
        e.hurt(dmg, o);
        if (rune === 'bloodSpikes') p.heal(p.maxHp * 0.005);
        hit++;
      }
    }
    if (hit) p.gainEssence(Skills.gainFor('boneSpikes'));
    p.facing = a;
    AudioSys.sfx('shoot');
    return true;
  },

  grimScythe(p, a) {
    const rune = Hero.rune('grimScythe');
    p.facing = a;
    World.smash(p.x + Math.cos(a) * 55, p.y + Math.sin(a) * 55, 60);
    let hits = 0;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > 95 + e.r) continue;
      let da = Math.abs(((angleTo(p.x, p.y, e.x, e.y) - a) % TAU + TAU) % TAU);
      if (da > Math.PI) da = TAU - da;
      if (da > 1.15) continue;
      const ea = angleTo(p.x, p.y, e.x, e.y);
      // Dual Scythes pulls enemies inward instead of knocking them back.
      e.hurt(11 * p.power(), { knock: { a: rune === 'dualScythes' ? ea + Math.PI : ea, f: 60 } });
      if (rune === 'bloodScythe') p.heal(p.maxHp * 0.01);
      if (rune === 'frostScythe') { p.hasteStacks = Math.min(15, p.hasteStacks + 1); p.hasteT = 5; }  // +1% attack speed/hit
      if (rune === 'cursedScythe' && !e.curse && Math.random() < 0.15) {
        e.curse = { type: pick(['decrepify', 'frailty', 'leech']), t: 30 };
      }
      if (rune === 'execution' && e.curse && !e.dead && e.hp > 0 && e.hp < e.maxHp * 0.15) e.hurt(e.hp + 1);
      hits++;
    }
    if (hits) p.gainEssence(Skills.gainFor('grimScythe') * hits);
    fxScythe(p, a);
    AudioSys.sfx('swing');
    return true;
  },

  siphonBlood(p, a) {
    // Funerary Pick: drain from 2 additional targets.
    const pick = p.powers && p.powers.funeraryPick;
    const maxTargets = pick ? 3 : 1;
    const inRange = [];
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 340) inRange.push([d, e]);
    }
    if (!inRange.length) return false;
    inRange.sort((u, v) => u[0] - v[0]);
    const sbRune = Hero.rune('siphonBlood');
    const drained = inRange.slice(0, maxTargets).map(t => t[1]);
    for (const e of drained) {
      e.hurt(6 * p.power());
      p.heal(p.maxHp * (sbRune === 'drainLife' ? 0.06 : 0.008));  // Drain Life: big heal
      if (sbRune === 'suppress') e.slow = Math.max(e.slow || 0, 1);  // Suppress: -75% (slow)
      fxSiphon(p, e);
    }
    // Blood Sucker: yank nearby health globes toward you while channeling.
    if (sbRune === 'bloodSucker') {
      for (const pk of Game.pickups) {
        if (pk.kind === 'orb' && dist(p.x, p.y, pk.x, pk.y) < 360) {
          const pa = angleTo(pk.x, pk.y, p.x, p.y);
          pk.x += Math.cos(pa) * 14; pk.y += Math.sin(pa) * 14;
        }
      }
    }
    // Essence: Drain Life gives none; Purity of Essence pours 15 at full health.
    if (sbRune === 'drainLife') { /* no essence */ }
    else if (sbRune === 'purityOfEssence' && p.hp >= p.maxHp - 1) p.gainEssence(15);
    else p.gainEssence(Skills.gainFor('siphonBlood'));
    p.facing = angleTo(p.x, p.y, drained[0].x, drained[0].y);
    // Funerary Pick: +20% damage per target being drained, 3s.
    if (pick) { p.funeraryStacks = drained.length; p.funeraryT = 3; }
    // Power Shift rune: +10% damage per channel stack, max 10.
    if (Hero.rune('siphonBlood') === 'powerShift') {
      p.powerShiftStacks = Math.min(10, p.powerShiftStacks + 1);
      p.powerShiftT = 1;
    }
    // Iron Rose: attacking with Siphon Blood has a 100% chance to cast a free Death Nova.
    if (p.powers && p.powers.ironRose && Skills.ironRoseCd <= 0) {
      Skills.ironRoseCd = 0.45;
      SKILL_FX.deathNova(p);
    }
    if (Math.random() < 0.25) AudioSys.sfx('siphon');
    return true;
  },

  boneSpear(p, a) {
    const rune = Hero.rune('boneSpear');
    // Blood Spear rune: +40% damage paid for in blood.
    const blood = rune === 'bloodSpear';
    if (blood) {
      const lifeCost = p.maxHp * 0.02;
      if (p.hp <= lifeCost + 1) return false;
      p.hp -= lifeCost;
    }
    const o = boneOpts(a, 130);
    // Teeth: a fan of 5 bone shards instead of one spear.
    if (rune === 'teeth') {
      for (let i = 0; i < 5; i++) {
        const sa = a + (i - 2) * 0.16;
        Game.projectiles.push(new Projectile(p.x + Math.cos(sa) * 16, p.y + Math.sin(sa) * 16, sa, {
          speed: 700, dmg: 24 * p.power(), r: 7, life: 0.85, type: 'spear',
          root: o.root ? 2 : 0, slowOnHit: o.slow || 0
        }));
      }
      p.facing = a; Particles.shake(2); AudioSys.sfx('spear'); Skills.mirror('boneSpear', a);
      return true;
    }
    const opts = {
      speed: 720, dmg: (blood ? 56 : 40) * p.power(), r: 9, life: 1.15, pierce: true, type: 'spear',
      root: o.root ? 2 : 0, slowOnHit: o.slow || 0
    };
    if (rune === 'shatter') { opts.pierce = false; opts.detonateR = 150; opts.detonateMul = 1.0; }  // burst on the first foe
    if (rune === 'blightedMarrow') opts.astralRamp = 0.15;   // +15% damage per foe pierced
    if (rune === 'crystallization') {   // lower foes' attack speed & raise yours (max 10)
      opts.atkSlowOnHit = 3;
      p.hasteStacks = Math.min(10, p.hasteStacks + 1); p.hasteT = 5;
    }
    Game.projectiles.push(new Projectile(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a, opts));
    p.facing = a;
    Particles.shake(2);
    AudioSys.sfx('spear');
    Skills.mirror('boneSpear', a);
    return true;
  },

  skeletalMage(p, a) {
    const rune = Hero.rune('skeletalMage');
    if (rune === 'lifeSupport') { const hc = p.maxHp * 0.10; if (p.hp > hc + 1) p.hp -= hc; } // Life Support: 10% HP
    if (minionCount('mage') >= 4) cullOldest('mage');
    const m = new Minion(p.x + Math.cos(a + 0.8) * 36, p.y + Math.sin(a + 0.8) * 36, 'mage');
    if (rune === 'giftOfDeath') m.giftCorpse = true;         // corpse when it expires/dies
    if (rune === 'lifeSupport') m.life += 2;                 // lasts 2s longer
    if (rune === 'contamination') m.blightAura = true;       // blight aura
    if (rune === 'skeletonArcher') m.archer = true;          // faster fire
    if (rune === 'singularity') {                            // consume all essence for damage
      const cost = Skills.costFor(Skills.byId.skeletalMage);
      m.dmgBuff = 1 + 0.03 * Math.max(0, p.essence - cost);
      p.essence = cost;                                       // tryUse subtracts cost → 0 left
    }
    Game.minions.push(m);
    AudioSys.sfx('summon');
    return true;
  },

  deathNova(p) {
    const rune = Hero.rune('deathNova');
    // Blood Nova rune: +50% damage, paid for in blood.
    const blood = rune === 'bloodNova';
    if (blood) {
      const lifeCost = p.maxHp * 0.02;
      if (p.hp <= lifeCost + 1) return false;
      p.hp -= lifeCost;
    }
    // Unstable Compound: each cast in quick succession grows the nova (max 2 steps).
    let growStacks = 0;
    if (rune === 'unstableCompound') {
      if ((p.novaT || 0) < Game.time) p.novaStacks = 0;   // reset if you stopped casting
      growStacks = Math.min(2, p.novaStacks || 0);
    }
    const R = (rune === 'boneNova' ? 130 : 190) * (1 + 0.18 * growStacks);   // Bone Nova: tighter, harder
    if (rune === 'unstableCompound') { p.novaStacks = Math.min(2, (p.novaStacks || 0) + 1); p.novaT = Game.time + 3; }
    fxNova(p.x, p.y, R);
    World.smash(p.x, p.y, R);
    // Bloodtide Blade: +400% Death Nova damage per enemy within 25 yards (max 10).
    let mult = blood ? 1.5 : rune === 'boneNova' ? 1.35 : 1;
    mult *= 1 + (p.deathNovaBonus || 0);   // Inarius helm/boots + Iron Rose: +Death Nova damage
    if (p.powers && p.powers.bloodtide) {
      let near = 0;
      for (const e of Game.enemies) {
        if (!e.dead && !e.sleep && dist(p.x, p.y, e.x, e.y) < 220) near++;
      }
      mult *= 1 + 4.0 * Math.min(10, near);
    }
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < R) {
        e.hurt(34 * mult * p.power() * (1 - d / R * 0.3), { knock: { a: angleTo(p.x, p.y, e.x, e.y), f: 200 } });
        if (rune === 'tendrilNova') p.heal(p.maxHp * 0.01);  // Tendril Nova: lifesteal
        if (rune === 'blight') {                              // Blight: slow AND weaken
          e.slow = Math.max(e.slow, 3);
          // A decrepify curse cuts the victim's damage — the "-30% damage" part.
          if (!e.curse || e.curse.type !== 'decrepify') e.curse = { type: 'decrepify', t: 4 };
        }
      }
    }
    AudioSys.sfx('nova');
    Skills.mirror('deathNova', 0);
    return true;
  },

  boneArmor(p) {
    const set = p.setCount || 0;
    const kalan = p.powers && p.powers.wisdomOfKalan; // 5 extra stacks, 75% DR cap, bigger shield
    const baRune = Hero.rune('boneArmor');
    const stun = baRune === 'dislocation';
    const dmgMul = baRune === 'vengefulArms' ? 1.45 : 1;   // Vengeful Arms: 145% damage
    World.smash(p.x, p.y, 150);
    let hits = 0;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      if (dist(p.x, p.y, e.x, e.y) < 150 + e.r) {
        const o = boneOpts(angleTo(p.x, p.y, e.x, e.y), 80);
        if (stun) o.root = Math.max(o.root || 0, 2); // Dislocation: stunned
        // Inarius 2pc: Bone Armor damage +1000% (x11).
        e.hurt(12 * (set >= 2 ? 11 : 1) * dmgMul * p.power(), o);
        hits++;
      }
    }
    const shieldGain = (14 + hits * 7) * (set >= 2 ? 2 : 1) * (kalan ? 1.5 : 1);
    p.shield = Math.min((p.shieldMax + Hero.level) * (set >= 2 ? 2 : 1) * (kalan ? 1.5 : 1), p.shield + shieldGain);
    // Inarius 4pc: damage reduction per enemy hit; 6pc: the tornado spins up.
    // Wisdom of Kalan grants DR even without the set and raises the cap.
    p.boneArmorT = 15;
    const stacks = hits + (kalan ? 5 : 0);
    p.boneArmorDR = (set >= 4 || kalan) ? Math.min(kalan ? 0.75 : 0.6, stacks * 0.03) : 0;
    // Batch-3 Bone Armor runes.
    if (baRune === 'thyFlesh') { p.thyFleshStacks = Math.min(10, hits + 3); p.thyFleshT = 15; }        // +10% regen/stack
    if (baRune === 'harvestAnguish') { p.harvestStacks = Math.min(25, (p.harvestStacks || 0) + hits); p.harvestT = 5; } // +1% move/hit
    if (baRune === 'limitedImmunity') p.ccImmuneT = 5;   // immune to control effects 5s
    if (set >= 6) {
      Particles.ring(p.x, p.y, 150, '#4ade80', 5, 0.6);
      AudioSys.sfx('tornado');
    }
    Particles.ring(p.x, p.y, 150, '#e8e0cc', 5, 0.45);
    fxBone(p.x, p.y, 14);
    AudioSys.sfx('nova');
    return true;
  },

  boneSpirit(p, a) {
    const rune = Hero.rune('boneSpirit');
    const tgt = strongestEnemy(p.x, p.y, 800) || nearestEnemy(p.x, p.y, 800);
    const o = { speed: 300, dmg: 160 * p.power(), r: 10, life: 4, type: 'spirit', homing: tgt };
    if (rune === 'astralProjection') { o.pierce = true; o.astralRamp = 0.15; } // +15% per enemy passed
    if (rune === 'unfinishedBiz') { o.detonateR = 150; o.detonateMul = 0.31; }  // detonation on impact
    if (rune === 'panicAttack') o.fearOnHit = 3;                                // terrify on impact
    if (rune === 'possession') {                                               // mind-control the target for 15s
      o.charmOnHit = 15;
      o.homing = tgt;                    // fly straight at the victim to seize it
    }
    Game.projectiles.push(new Projectile(p.x, p.y - 8, a, o));
    // Possession is expensive — it consumes ALL remaining charges (owner/D3 rule).
    if (rune === 'possession') Skills.charges.boneSpirit = 0;
    AudioSys.sfx('spirit');
    return true;
  },

  bloodRush(p, a) {
    const rune = Hero.rune('bloodRush');
    // Hemostasis removes the cost; Metabolism doubles it (for its 2nd charge).
    const cost = rune === 'hemostasis' ? 0
      : Math.round(p.maxHp * (rune === 'metabolism' ? 0.10 : 0.05));
    if (cost > 0 && p.hp <= cost + 1) return false;
    p.hp -= cost;
    const ox = p.x, oy = p.y;
    const pt = World.dashPoint(p.x, p.y, a, 280);
    fxBloodTrail(p.x, p.y, pt.x, pt.y);
    if (rune === 'molting') Game.corpses.push(new Corpse(ox, oy, 'zombie')); // usable corpse
    if (rune === 'transfusion') {                                            // heal per enemy passed
      for (const e of Game.enemies) {
        if (!e.dead && !e.sleep && distToSeg(e.x, e.y, ox, oy, pt.x, pt.y) < 40) p.heal(p.maxHp * 0.02);
      }
    }
    if (rune === 'potency') p.potencyT = 2;   // Potency: hardened armor for 2s after teleporting
    p.dash = { t: 0, maxT: 0.16, fx: p.x, fy: p.y, tx: pt.x, ty: pt.y };
    p.facing = a;
    AudioSys.sfx('rush');
    return true;
  },

  decrepify(p, a) {
    const pt = aimPoint(a);
    if (Hero.rune('decrepify') === 'wither') p.witherT = 6;   // Wither: +40% DR while it lingers
    return applyCurse('decrepify', pt.x, pt.y);
  },

  frailty(p, a) {
    const pt = aimPoint(a);
    return applyCurse('frailty', pt.x, pt.y);
  },

  leech(p, a) {
    const pt = aimPoint(a);
    // Cursed Ground: leaves a lingering pool that heals you 1%/s per foe in it.
    if (Hero.rune('leech') === 'cursedGround') {
      Skills.cursedZones.push({ x: pt.x, y: pt.y, r: 150, t: 8 });
    }
    return applyCurse('leech', pt.x, pt.y);
  },

  corpseExplosion(p, a) {
    const ceRune = Hero.rune('corpseExplosion');
    const pt = aimPoint(a, 200);
    const BLAST = ceRune === 'bloodyMess' ? 156 : 130; // Bloody Mess: +20% radius
    const ceMult = ceRune === 'closeQuarters' ? 1.26 : 1; // Close Quarters: harder hit
    let corpses;
    if (Skills.lotd > 0) {
      corpses = [{ x: pt.x, y: pt.y, consume() {} }, { x: pt.x + rand(-50, 50), y: pt.y + rand(-50, 50), consume() {} }];
    } else {
      corpses = corpsesNear(pt.x, pt.y, 280, 5);
      if (!corpses.length) {
        Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
        AudioSys.sfx('denied');
        return false;
      }
    }
    // Chain reaction: consume all corpses now, then detonate them one after
    // another from the MIDDLE outward — each sucks inward then bursts (owner
    // request: "inward then outward" · +2% damage). Processed in Skills.update.
    let cx = 0, cy = 0;
    for (const c of corpses) { cx += c.x; cy += c.y; }
    cx /= corpses.length; cy /= corpses.length;
    corpses.sort((A, B) => dist(A.x, A.y, cx, cy) - dist(B.x, B.y, cx, cy));
    const baseDmg = 36 * 1.02 * ceMult * p.power();   // +2% damage
    corpses.forEach((c, i) => {
      c.consume();
      let bx = c.x, by = c.y;
      // Final Embrace: the corpse crawls to the nearest foe before it blows.
      if (ceRune === 'finalEmbrace') {
        const tgt = nearestEnemy(c.x, c.y, 300);
        if (tgt) { bx = tgt.x; by = tgt.y; }
      }
      Skills.pendingCE.push({ x: bx, y: by, r: BLAST, dmg: baseDmg, rune: ceRune, t: 0.14 + i * 0.09, imp: false });
    });
    AudioSys.sfx('spirit');   // a soft gathering whoosh as the pile draws inward
    return true;
  },

  corpseLance(p, a) {
    const tgt = nearestEnemy(p.x, p.y, 620);
    if (!tgt) return false;
    let sources;
    if (Skills.lotd > 0) {
      sources = [0, 1, 2].map(() => ({ x: p.x + rand(-80, 80), y: p.y + rand(-80, 80), consume() {} }));
    } else {
      sources = corpsesNear(tgt.x, tgt.y, 340, 3);
      if (!sources.length) sources = corpsesNear(p.x, p.y, 340, 3);
      if (!sources.length) {
        Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
        AudioSys.sfx('denied');
        return false;
      }
    }
    const rune = Hero.rune('corpseLance');
    const dmgMul = rune === 'bloodLance' ? 1.7 : 1;   // Blood Lance: ~3000% vs 1750%
    for (const c of sources) {
      if (rune === 'bloodLance') { const hc = p.maxHp * 0.02; if (p.hp > hc + 1) p.hp -= hc; }
      c.consume();
      const la = angleTo(c.x, c.y, tgt.x, tgt.y);
      const o = { speed: 640, dmg: 48 * dmgMul * p.power(), r: 7, life: 1.4, type: 'lance', homing: tgt };
      if (rune === 'visceralImpact') o.stunOnHit = 3;         // stun 3s
      if (rune === 'shreddingSplinters') o.slowOnHit = 2;     // slow move/attack
      if (rune === 'brittleTouch') o.brittleOnHit = 5;        // +crit-taken 5s
      if (rune === 'ricochet') o.ricochet = 0.2;              // 20% bounce
      Game.projectiles.push(new Projectile(c.x, c.y - 6, la, o));
      fxBone(c.x, c.y, 5);
    }
    AudioSys.sfx('spear');
    return true;
  },

  devour(p) {
    const rune = Hero.rune('devour');
    const corpses = Skills.lotd > 0
      ? [{ x: p.x, y: p.y, consume() {} }, { x: p.x, y: p.y, consume() {} }, { x: p.x, y: p.y, consume() {} }]
      : corpsesNear(p.x, p.y, 340, 12);
    if (!corpses.length) {
      Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
      AudioSys.sfx('denied');
      return false;
    }
    for (const c of corpses) {
      c.consume();
      p.gainEssence(10);
      p.heal(p.maxHp * (rune === 'cannibalize' ? 0.045 : 0.015));   // Cannibalize: +3% health/corpse
      if (rune === 'satiated') { p.satiatedStacks = Math.min(25, p.satiatedStacks + 1); p.satiatedT = 20; }  // +2% max life/corpse
      if (rune === 'voracious') { p.voraciousStacks = Math.min(25, p.voraciousStacks + 1); p.voraciousT = 5; } // -2% cost/corpse
      Particles.spawn(c.x, c.y, {
        count: 6, color: ['#6ff7c3', '#3ee6a0'], minSpeed: 60, maxSpeed: 160,
        minLife: 0.25, maxLife: 0.5, glow: true
      });
    }
    // Ruthless: also devour your TEMPORARY minions (mages/revived) for 10 Essence
    // each — the permanent skeletons/golem are spared (and auto-resummon anyway).
    if (rune === 'ruthless') {
      for (const m of Game.minions) {
        if (m.dead || (m.kind !== 'mage' && m.kind !== 'revived')) continue;
        if (dist(p.x, p.y, m.x, m.y) < 320) { m.dead = true; p.gainEssence(10); fxBone(m.x, m.y, 6); }
      }
    }
    fxHeal(p.x, p.y);
    AudioSys.sfx('devour');
    return true;
  },

  commandSkeletons(p, a) {
    // The 7 skeletons are auto-summoned & auto-resummoned (Game.maintainCommand-
    // Minions). This button is now purely the COMMAND — hurl the warband at the
    // nearest foe with the rune's effect, gated by the skill's cooldown.
    const rune = Hero.rune('commandSkeletons');
    const tgt = nearestEnemy(p.x, p.y, 700);
    for (const m of Game.minions) {
      if (m.kind !== 'skeleton' || m.dead) continue;
      if (rune === 'frenzy') m.frenzyT = 6;            // Frenzy: +attack speed
      if (rune === 'darkMending') m.healOnHit = true;  // Dark Mending: heal on hit
      if (tgt) m.commandTgt = tgt;                     // focus-fire the marked foe
    }
    if (tgt) {
      if (rune === 'freezingGrasp' && !tgt.unique) tgt.root = Math.max(tgt.root || 0, 3);   // freeze
      if (rune === 'killCommand') {                    // skeletons detonate at the target
        fxExplosion(tgt.x, tgt.y, 150); World.smash(tgt.x, tgt.y, 150); Particles.shake(4);
        for (const e of Game.enemies) {
          if (e.dead || e.sleep) continue;
          if (dist(tgt.x, tgt.y, e.x, e.y) < 150) e.hurt(60 * p.power(), { knock: { a: angleTo(tgt.x, tgt.y, e.x, e.y), f: 120 } });
        }
        AudioSys.sfx('explode');
      }
    }
    Particles.text(p.x, p.y - 40, 'ATTACK!', { color: '#ff8c5a', size: 15 });
    AudioSys.sfx('summon');
    return true;
  },

  commandGolem(p, a) {
    // The golem is auto-summoned & reforms on its own (Game.maintainCommand-
    // Minions). This button triggers the golem's ACTIVE (differs by rune), gated
    // by cooldown. Uses the golem's spot, or the hero's if it's mid-reform.
    let golem = null;
    for (const m of Game.minions) if (!m.dead && m.kind === 'golem') golem = m;
    const rune = Hero.rune('commandGolem');
    const gx = golem ? golem.x : p.x, gy = golem ? golem.y : p.y;
    fxExplosion(gx, gy, 150);
    World.smash(gx, gy, 150);
    Particles.shake(5);
    let slamMul = 1;
    if (rune === 'decayGolem') {                 // eat corpses, +30% dmg each
      const near = corpsesNear(gx, gy, 190, 20);
      for (const c of near) c.consume();
      slamMul = 1 + 0.30 * near.length;
    }
    for (const e of Game.enemies) {
      if (e.dead || e.sleep) continue;
      const d = dist(gx, gy, e.x, e.y);
      if (d < 150 + e.r) {
        const o = { knock: { a: angleTo(gx, gy, e.x, e.y), f: 220 }, slow: 2 };
        if (rune === 'boneGolem') { o.knock = { a: angleTo(e.x, e.y, gx, gy), f: 240 }; o.root = 2; } // drag in + stun
        if (rune === 'iceGolem') { o.root = 3; e.brittleT = Math.max(e.brittleT || 0, 5); }            // freeze + crit
        e.hurt(50 * slamMul * p.power(), o);
      }
    }
    if (golem && rune === 'fleshGolem') {        // collapse into 8 corpses (reforms)
      for (let i = 0; i < 8; i++) Game.corpses.push(new Corpse(gx + rand(-40, 40), gy + rand(-40, 40), 'zombie'));
      golem.dead = true;
    }
    if (golem && rune === 'bloodGolem') { p.heal(p.maxHp * 0.25); golem.dead = true; }   // sacrifice → heal, reforms
    AudioSys.sfx('explode');
    Skills.cds.commandGolem = 12; // slam has its own shorter cooldown
    return 'cdSet';
  },

  armyOfTheDead(p, a) {
    const rune = Hero.rune('armyOfTheDead');
    const storm = rune === 'deadStorm';
    const R = storm ? 300 : 260;
    const cx = storm ? p.x : aimPoint(a, 260).x, cy = storm ? p.y : aimPoint(a, 260).y;   // Dead Storm circles you
    fxArmy(cx, cy, R);
    World.smash(cx, cy, R);
    const mul = rune === 'unconventionalWar' ? 1.6 : rune === 'blightedGrasp' ? 1.3 : 1;   // heavier hits
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist(cx, cy, e.x, e.y);
      if (d < R) {
        e.wake();
        const o = { knock: { a: angleTo(cx, cy, e.x, e.y), f: 260 } };
        if (rune === 'frozenArmy') o.root = 3;                                        // Frozen Army: freeze
        if (rune === 'deathValley') o.knock = { a: angleTo(e.x, e.y, cx, cy), f: 320 }; // Death Valley: pull to center
        e.hurt(220 * mul * p.power() * (1 - d / R * 0.4), o);
      }
    }
    Particles.shake(9);
    AudioSys.sfx('army');
    return true;
  },

  revive(p) {
    const rune = Hero.rune('revive');
    const corpses = Skills.lotd > 0
      ? [0, 1, 2].map(() => ({ x: p.x + rand(-60, 60), y: p.y + rand(-60, 60), consume() {} }))
      : corpsesNear(p.x, p.y, 320, 10);
    if (!corpses.length) {
      Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
      AudioSys.sfx('denied');
      return false;
    }
    for (const c of corpses) {
      if (rune === 'oblation') { const hc = p.maxHp * 0.03; if (p.hp > hc + 1) p.hp -= hc; }
      c.consume();
      if (minionCount('revived') >= 10) cullOldest('revived');
      const m = new Minion(c.x, c.y, 'revived');
      if (rune === 'oblation') m.dmgBuff = 1.20;               // +20% damage
      if (rune === 'recklessness') { m.dmgBuff = 2.5; m.life = 6; } // +150% dmg, 6s life
      if (rune === 'purgatory') m.giftCorpse = true;           // corpse on expiry
      Game.minions.push(m);
    }
    if (rune === 'horrificReturn') {                           // enemies flee in fear
      for (const e of Game.enemies) {
        if (e.dead || e.sleep) continue;
        if (dist(p.x, p.y, e.x, e.y) < 360) e.fearT = Math.max(e.fearT || 0, 3);
      }
    }
    AudioSys.sfx('summon');
    return true;
  },

  landOfTheDead(p) {
    Skills.lotd = 10;                              // desc: for 10s
    Skills.lotdRune = Hero.rune('landOfTheDead');
    Skills.lotdTick = 0;
    if (Skills.lotdRune === 'landOfPlenty') p.hp = p.maxHp;  // instant full heal
    Particles.ring(p.x, p.y, 300, '#6ff7c3', 8, 0.8);
    Particles.text(p.x, p.y - 46, 'LAND OF THE DEAD', { color: '#6ff7c3', size: 18, life: 1.6 });
    Particles.shake(6);
    AudioSys.sfx('army');
    return true;
  },

  simulacrum(p, a) {
    for (const m of Game.minions) {
      if (!m.dead && m.kind === 'sim') m.dead = true;
    }
    const twins = Hero.rune('simulacrum') === 'bloodAndBone' ? 2 : 1; // Blood and Bone: TWO clones
    const eternal = p.powers && p.powers.hauntedVisions;             // Haunted Visions: forever
    for (let i = 0; i < twins; i++) {
      const sa = a + Math.PI / 2 + i * Math.PI;
      const s = new Minion(p.x + Math.cos(sa) * 42, p.y + Math.sin(sa) * 42, 'sim');
      s.facing = p.facing;
      if (eternal) s.life = Infinity;
      Game.minions.push(s);
    }
    AudioSys.sfx('curse');
    return true;
  }
};

// -------------------------------- Skills -----------------------------------

const Skills = {
  cds: {},          // skill id -> seconds remaining
  charges: {},      // charge-skill id -> charges remaining (Bone Spirit, Blood Rush)
  lotd: 0,          // Land of the Dead time remaining
  lotdSpawn: 0,
  ironRoseCd: 0,    // Iron Rose free-nova throttle
  graveTick: 3,     // Grave Caller passive corpse timer
  pendingCE: [],    // scheduled Corpse-Explosion detonations (implode→burst chain)
  cursedZones: [],  // Leech · Cursed Ground healing pools
  byId: {},
  chargeSkills: [],

  init() {
    this.byId = {};
    for (const s of SKILL_DATA) this.byId[s.id] = s;
    this.chargeSkills = SKILL_DATA.filter(s => s.charges);
  },

  reset() {
    this.cds = {};
    this.charges = {};
    this.lotd = 0;
    this.lotdRune = null;
    this.lotdTick = 0;
    this.lotdKills = 0;
    this.ironRoseCd = 0;
    this.graveTick = 3;
    this.pendingCE = [];
    this.cursedZones = [];
  },

  // How many charges a charge-skill has right now. Blood Rush gets an extra
  // charge with the Metabolism rune (so you dash twice before the cooldown).
  chargeMax(s) {
    if (!s.charges) return 0;
    if (s.metabolismCharges && Hero.rune(s.id) === 'metabolism') return s.metabolismCharges;
    if (s.id === 'boneSpirit' && Hero.rune('boneSpirit') === 'poltergeist') return 4;  // Poltergeist: 4 charges
    return s.charges;
  },

  slotSkill(slot) {
    const id = Hero.loadout[slot];
    return id ? this.byId[id] : null;
  },

  gainFor(id) {
    const base = this.byId[id].gain || 0;
    return Math.round(base * (Hero.hasPassive('swiftHarvest') ? 1.3 : 1));
  },

  cdFor(s) {
    let cd = s.cd;
    if (s.cat === 'primary' && Hero.hasPassive('quickening')) cd *= 0.85;
    const p = Game.player;
    if (p && p.cdr) cd *= 1 - p.cdr;            // Diamond cooldown reduction
    // Borrowed Time (Decrepify rune): +1% cooldown reduction per cursed enemy (max 20%).
    if (Hero.rune('decrepify') === 'borrowedTime' && Game.enemies) {
      let cursed = 0;
      for (const e of Game.enemies) if (!e.dead && e.curse) cursed++;
      if (cursed) cd *= 1 - 0.01 * Math.min(20, cursed);
    }
    // Attack Speed makes Primary/Secondary attacks fire faster — from gear
    // (permanent p.atkSpeed) and from the Frost Scythe / Crystallization Haste buff.
    if (p && (s.cat === 'primary' || s.cat === 'secondary')) {
      if (p.atkSpeed) cd /= 1 + p.atkSpeed;
      if (p.hasteT > 0) cd /= 1 + 0.01 * p.hasteStacks;
    }
    return cd;
  },

  // A skill's damage element right now: a converting rune wins, else the skill's
  // base element, else Physical.
  elementFor(id) {
    const rune = Hero.rune(id);
    return (typeof RUNE_ELEMENT !== 'undefined' && RUNE_ELEMENT[rune])
      || (typeof SKILL_ELEMENT !== 'undefined' && SKILL_ELEMENT[id])
      || 'physical';
  },

  costFor(s) {
    if (this.lotd > 0 && s.cat === 'corpse') return 0;
    // Land of the Dead · Invigoration: ALL skills cost zero Essence while active.
    if (this.lotd > 0 && this.lotdRune === 'invigoration') return 0;
    let cost = s.cost;
    // Command Skeletons · Enforcer: −30% command Essence cost.
    if (s.id === 'commandSkeletons' && Hero.rune('commandSkeletons') === 'enforcer') cost = Math.round(cost * 0.7);
    const p = Game.player;
    if (p && p.rcr) cost = Math.round(cost * (1 - p.rcr));   // Topaz resource cost reduction
    if (p && p.voraciousT > 0) cost = Math.round(cost * (1 - 0.02 * p.voraciousStacks));  // Devour · Voracious
    return cost;
  },

  update(dt) {
    for (const k of Object.keys(this.cds)) {
      this.cds[k] = Math.max(0, this.cds[k] - dt);
    }
    // Charge skills (Bone Spirit ×3, Blood Rush ×1/×2) refill to FULL once their
    // cooldown lapses — the cd only starts after the LAST charge is spent.
    for (const s of this.chargeSkills) {
      if (this.charges[s.id] === 0 && (this.cds[s.id] || 0) <= 0) {
        this.charges[s.id] = this.chargeMax(s);
      }
    }
    this.ironRoseCd = Math.max(0, this.ironRoseCd - dt);

    // Corpse Explosion chain: each scheduled corpse SUCKS inward, then a beat
    // later BURSTS outward and deals its damage — rippling out from the middle
    // so a pile of corpses pops like a chain reaction.
    for (let i = this.pendingCE.length - 1; i >= 0; i--) {
      const c = this.pendingCE[i];
      if (!c.imp && c.t <= 0.16) { fxImplode(c.x, c.y, c.r * 0.85); c.imp = true; }
      c.t -= dt;
      if (c.t <= 0) {
        fxExplosion(c.x, c.y, c.r);
        World.smash(c.x, c.y, c.r);
        Particles.shake(3);
        AudioSys.sfx('explode');
        for (const e of Game.enemies) {
          if (e.dead || e.sleep) continue;
          const d = dist(c.x, c.y, e.x, e.y);
          if (d < c.r) {
            const o = { knock: { a: angleTo(c.x, c.y, e.x, e.y), f: 160 } };
            if (c.rune === 'deadCold') o.root = 3;   // Dead Cold: freeze
            e.hurt(c.dmg * (1 - d / c.r * 0.4), o);
          }
        }
        // Shrapnel: bone debris sprays out in a cone away from the hero.
        if (c.rune === 'shrapnel') {
          const base = Game.player ? angleTo(Game.player.x, Game.player.y, c.x, c.y) : 0;
          for (let k = 0; k < 5; k++) {
            const sa = base + (k - 2) * 0.22;
            Game.projectiles.push(new Projectile(c.x, c.y, sa, {
              speed: 620, dmg: c.dmg * 0.5, r: 6, life: 0.5, type: 'spear'
            }));
          }
        }
        this.pendingCE.splice(i, 1);
      }
    }

    // Leech · Cursed Ground: lingering pools heal you 1%/s for each foe inside.
    for (let i = this.cursedZones.length - 1; i >= 0; i--) {
      const z = this.cursedZones[i];
      z.t -= dt;
      const p = Game.player;
      if (p && !p.dead) {
        let inside = 0;
        for (const e of Game.enemies) {
          if (e.dead || e.sleep) continue;
          if (dist(z.x, z.y, e.x, e.y) < z.r) inside++;
        }
        if (inside) p.heal(p.maxHp * 0.01 * inside * dt);
        Particles.ring(z.x, z.y, z.r, '#4ade80', 2, 0.18);
      }
      if (z.t <= 0) this.cursedZones.splice(i, 1);
    }

    // Grave Caller passive: a fresh corpse rises at the hero's feet every 3s.
    if (Hero.hasPassive('graveCaller')) {
      this.graveTick -= dt;
      if (this.graveTick <= 0) {
        this.graveTick = 3;
        const p = Game.player;
        if (p && !p.dead) {
          Game.corpses.push(new Corpse(p.x + rand(-12, 12), p.y + rand(-12, 12), 'zombie'));
          fxSummon(p.x, p.y);
        }
      }
    }
    if (this.lotd > 0) {
      this.lotd -= dt;
      this.lotdSpawn -= dt;
      if (this.lotdSpawn <= 0) {
        this.lotdSpawn = 0.6;
        const p = Game.player;
        const a = rand(TAU);
        const c = new Corpse(p.x + Math.cos(a) * rand(60, 200), p.y + Math.sin(a) * rand(60, 200), 'zombie');
        c.maxT = 6;
        Game.corpses.push(c);
        fxSummon(c.x, c.y);
      }
      // Land of the Dead rune fields: Frozen Lands freezes; Plaguelands damages.
      if (this.lotdRune === 'frozenLands' || this.lotdRune === 'plaguelands') {
        this.lotdTick = (this.lotdTick || 0) - dt;
        if (this.lotdTick <= 0) {
          this.lotdTick = 1;
          const p = Game.player;
          for (const e of Game.enemies) {
            if (e.dead || e.sleep) continue;
            if (dist(p.x, p.y, e.x, e.y) < 320) {
              if (this.lotdRune === 'frozenLands' && !e.unique) e.root = Math.max(e.root || 0, 1.2);
              if (this.lotdRune === 'plaguelands') e.hurt(60 * p.power(), { noSplash: true });
            }
          }
        }
      }
    }

    for (const cast of Input.castQueue) this.tryUse(cast.slot, cast.angle);
    Input.castQueue.length = 0;
    if (Input.skillHeld(0)) this.tryUse(0, Input.heldAngle(0));
    for (let i = 1; i < Hero.loadout.length; i++) {
      const s = this.slotSkill(i);
      if (s && s.channel && Input.skillHeld(i)) this.tryUse(i, Input.heldAngle(i));
    }
  },

  tryUse(slot, angle = null) {
    const p = Game.player;
    if (!p || p.dead || Game.state !== 'playing' || UI.screen) return;
    const s = this.slotSkill(slot);
    if (!s) return;
    if ((this.cds[s.id] || 0) > 0) return;
    const cost = this.costFor(s);
    if (p.essence < cost) return;
    // Scythe of the Cycle: Secondary skills hit for +400% while Bone Armor is
    // up, but each such cast burns 4s off the Bone Armor timer.
    const cycle = s.cat === 'secondary' && p.powers && p.powers.cycleScythe && p.boneArmorT > 0;
    if (cycle) p.secondaryBoost = true;
    // Tag this cast's element so every hit it deals is typed (read in Enemy.hurt).
    p.castElement = this.elementFor(s.id);
    const result = SKILL_FX[s.id](p, resolveAim(angle));
    if (cycle) {
      p.secondaryBoost = false;
      if (result) p.boneArmorT = Math.max(0, p.boneArmorT - 4);
    }
    if (result) {
      p.essence -= cost;
      if (result === 'cdSet') {
        // the skill set its own cooldown
      } else if (s.charges) {
        // Spend a charge; the real cooldown only begins once the LAST one is gone.
        if (this.charges[s.id] === undefined) this.charges[s.id] = this.chargeMax(s);
        this.charges[s.id] = Math.max(0, this.charges[s.id] - 1);
        this.cds[s.id] = this.charges[s.id] > 0 ? 0.2 : this.cdFor(s);
      } else {
        this.cds[s.id] = this.cdFor(s);
      }
    } else {
      this.cds[s.id] = 0.3;
    }
  },

  // Every Simulacrum copies Secondary casts at half power.
  mirror(id, a) {
    const p = Game.player;
    for (const sim of Game.minions) {
      if (sim.dead || sim.kind !== 'sim') continue;
      if (id === 'boneSpear') {
        const tgt = nearestEnemy(sim.x, sim.y, 700);
        const sa = tgt ? angleTo(sim.x, sim.y, tgt.x, tgt.y) : a;
        Game.projectiles.push(new Projectile(sim.x, sim.y, sa, {
          speed: 720, dmg: 20 * p.power(), r: 9, life: 1.15, pierce: true, type: 'spear'
        }));
      } else if (id === 'deathNova') {
        const R = 190;
        fxNova(sim.x, sim.y, R);
        World.smash(sim.x, sim.y, R);
        for (const e of Game.enemies) {
          if (e.dead || e.sleep) continue;
          const d = dist(sim.x, sim.y, e.x, e.y);
          if (d < R) e.hurt(17 * p.power());
        }
      }
    }
  }
};

// ---------------------------- skill icons ----------------------------------
// Small vector glyphs for the buttons and menus, keyed by skill id.

// Each glyph is an original, colored vector emblem (dark backing + glow +
// signature-colored motif) — themed per skill, drawn in the game's own style.
const SKILL_ICONS = (() => {
  // Shared helpers: a bone gradient and a glow wrapper.
  const boneGrad = (ctx, x, y, r, top, mid, bot) => {
    const g = ctx.createLinearGradient(x, y + r * 0.55, x, y - r * 0.55);
    g.addColorStop(0, bot); g.addColorStop(0.55, mid); g.addColorStop(1, top);
    return g;
  };
  const glow = (ctx, col, r, fn) => {
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = r * 0.55; fn(); ctx.restore();
  };
  // A hollow-eyed skull, colored — the recurring necromantic motif.
  const skull = (ctx, x, y, r, col, eye) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y - r * 0.05, r, 0, Math.PI, true); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.05); ctx.lineTo(x - r * 0.55, y + r * 0.9);
    ctx.lineTo(x + r * 0.55, y + r * 0.9); ctx.lineTo(x + r, y - r * 0.05); ctx.fill();
    ctx.fillStyle = '#100a14';
    ctx.beginPath(); ctx.ellipse(x - r * 0.42, y + r * 0.05, r * 0.3, r * 0.34, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.42, y + r * 0.05, r * 0.3, r * 0.34, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.lineTo(x - r * 0.14, y + r * 0.6); ctx.lineTo(x + r * 0.14, y + r * 0.6); ctx.fill();
    if (eye) {
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.arc(x - r * 0.42, y + r * 0.05, r * 0.13, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.05, r * 0.13, 0, TAU); ctx.fill();
    }
  };
  return {
  boneSpikes(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => {
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = boneGrad(ctx, x, y, r, '#f2ffe8', '#a8e6bd', '#2f6a3a');
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.36 - r * 0.16, y + r * 0.5);
        ctx.lineTo(x + i * r * 0.36, y - r * 0.56 + Math.abs(i) * r * 0.2);
        ctx.lineTo(x + i * r * 0.36 + r * 0.16, y + r * 0.5);
        ctx.closePath(); ctx.fill();
      }
    });
  },
  grimScythe(ctx, x, y, r) {
    glow(ctx, '#4ecbe0', r, () => {
      ctx.strokeStyle = '#7a6f58'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - r * 0.12, y + r * 0.6); ctx.lineTo(x + r * 0.2, y - r * 0.5); ctx.stroke();
      const g = ctx.createLinearGradient(x - r * 0.5, y - r * 0.5, x + r * 0.3, y);
      g.addColorStop(0, '#eafaff'); g.addColorStop(1, '#2a94ad');
      ctx.strokeStyle = g; ctx.lineWidth = r * 0.2;
      ctx.beginPath(); ctx.arc(x - r * 0.14, y - r * 0.3, r * 0.46, -0.7, 1.5); ctx.stroke();
    });
  },
  siphonBlood(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => {
      // A grasping hand.
      ctx.strokeStyle = '#c9bfa8'; ctx.lineWidth = r * 0.11; ctx.lineCap = 'round';
      ctx.fillStyle = '#3a2a30';
      ctx.beginPath(); ctx.ellipse(x - r * 0.05, y + r * 0.15, r * 0.34, r * 0.4, 0, 0, TAU); ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.16, y - r * 0.05);
        ctx.lineTo(x + i * r * 0.2, y - r * 0.55 + Math.abs(i) * r * 0.12);
        ctx.stroke();
      }
    });
    glow(ctx, '#e0402f', r, () => {
      ctx.fillStyle = '#e0402f';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.2);
      ctx.quadraticCurveTo(x + r * 0.22, y + r * 0.55, x, y + r * 0.75);
      ctx.quadraticCurveTo(x - r * 0.22, y + r * 0.55, x, y + r * 0.2);
      ctx.fill();
    });
  },
  boneSpear(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = boneGrad(ctx, 0, 0, r, '#f2ffe8', '#bfeccb', '#3a7a4a');
      ctx.beginPath();
      ctx.moveTo(r * 0.66, 0); ctx.lineTo(r * 0.12, -r * 0.22);
      ctx.lineTo(-r * 0.58, -r * 0.09); ctx.lineTo(-r * 0.46, 0);
      ctx.lineTo(-r * 0.58, r * 0.09); ctx.lineTo(r * 0.12, r * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });
  },
  skeletalMage(ctx, x, y, r) {
    glow(ctx, '#4ecbe0', r, () => {
      // Hooded revenant.
      ctx.fillStyle = '#123842';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.6);
      ctx.quadraticCurveTo(x + r * 0.55, y - r * 0.2, x + r * 0.4, y + r * 0.6);
      ctx.lineTo(x - r * 0.4, y + r * 0.6);
      ctx.quadraticCurveTo(x - r * 0.55, y - r * 0.2, x, y - r * 0.6);
      ctx.fill();
    });
    ctx.fillStyle = '#0a1518';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.05, r * 0.3, r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7fecff';
    glow(ctx, '#4ecbe0', r, () => {
      ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.08, r * 0.09, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.12, y - r * 0.08, r * 0.09, 0, TAU); ctx.fill();
    });
  },
  deathNova(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => {
      ctx.strokeStyle = '#7df0a6'; ctx.lineWidth = r * 0.14;
      ctx.beginPath(); ctx.arc(x, y, r * 0.44, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#c8ffd8';
      ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
        ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
        ctx.stroke();
      }
    });
  },
  corpseExplosion(ctx, x, y, r) {
    glow(ctx, '#ff8c2a', r, () => {
      const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 0.7);
      g.addColorStop(0, '#fff0b0'); g.addColorStop(0.5, '#ffb43a'); g.addColorStop(1, '#e0402f');
      ctx.fillStyle = g;
      for (let i = 0; i < 10; i++) {
        const a = i * TAU / 10;
        const len = i % 2 ? r * 0.62 : r * 0.36;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a + 0.22) * r * 0.16, y + Math.sin(a + 0.22) * r * 0.16);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.lineTo(x + Math.cos(a - 0.22) * r * 0.16, y + Math.sin(a - 0.22) * r * 0.16);
        ctx.closePath(); ctx.fill();
      }
    });
    ctx.fillStyle = '#5a0d17';
    ctx.beginPath(); ctx.arc(x, y, r * 0.17, 0, TAU); ctx.fill();
  },
  corpseLance(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => {
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const g = ctx.createLinearGradient(x - r * 0.5, y, x + r * 0.5, y);
        g.addColorStop(0, 'rgba(224,64,47,0.2)'); g.addColorStop(1, '#ffcf6a');
        ctx.strokeStyle = g; ctx.lineWidth = r * 0.12 - Math.abs(i) * r * 0.02;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.55, y + i * r * 0.34);
        ctx.lineTo(x + r * 0.5, y + i * r * 0.05);
        ctx.stroke();
      }
    });
  },
  devour(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => {
      ctx.strokeStyle = '#e05a4a'; ctx.lineWidth = r * 0.13; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y - r * 0.16, r * 0.44, 0.16, Math.PI - 0.16); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + r * 0.16, r * 0.44, Math.PI + 0.16, -0.16); ctx.stroke();
    });
    ctx.fillStyle = '#ffcf6a';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.24 - r * 0.07, y - r * 0.24);
      ctx.lineTo(x + i * r * 0.24, y - r * 0.02);
      ctx.lineTo(x + i * r * 0.24 + r * 0.07, y - r * 0.24); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.24 - r * 0.07, y + r * 0.24);
      ctx.lineTo(x + i * r * 0.24, y + r * 0.02);
      ctx.lineTo(x + i * r * 0.24 + r * 0.07, y + r * 0.24); ctx.fill();
    }
  },
  revive(ctx, x, y, r) {
    glow(ctx, '#eafaff', r, () => {
      // A soul rising, arms raised.
      ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.55); ctx.lineTo(x, y - r * 0.15); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.42, y - r * 0.55);
      ctx.quadraticCurveTo(x, y - r * 0.1, x + r * 0.42, y - r * 0.55);
      ctx.stroke();
    });
    ctx.fillStyle = '#ffffff';
    glow(ctx, '#8fd0ff', r, () => { ctx.beginPath(); ctx.arc(x, y - r * 0.28, r * 0.16, 0, TAU); ctx.fill(); });
  },
  commandSkeletons(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => skull(ctx, x, y - r * 0.1, r * 0.52, '#bfeccb', '#2f6a3a'));
    ctx.fillStyle = 'rgba(120,220,150,0.55)';
    skull(ctx, x - r * 0.5, y + r * 0.28, r * 0.3, 'rgba(160,230,180,0.7)');
    skull(ctx, x + r * 0.5, y + r * 0.28, r * 0.3, 'rgba(160,230,180,0.7)');
  },
  commandGolem(ctx, x, y, r) {
    glow(ctx, '#ff8c2a', r, () => {
      const g = ctx.createLinearGradient(x, y - r * 0.5, x, y + r * 0.5);
      g.addColorStop(0, '#9a6a3a'); g.addColorStop(1, '#5a3a24');
      ctx.fillStyle = g;
      rr(ctx, x - r * 0.4, y - r * 0.46, r * 0.8, r * 0.7, r * 0.14); ctx.fill();
    });
    // Craggy brow + jaw.
    ctx.fillStyle = '#3a2416';
    ctx.fillRect(x - r * 0.4, y - r * 0.1, r * 0.8, r * 0.08);
    ctx.fillStyle = '#ffb43a';
    glow(ctx, '#ff8c2a', r, () => {
      ctx.fillRect(x - r * 0.28, y - r * 0.3, r * 0.16, r * 0.14);
      ctx.fillRect(x + r * 0.12, y - r * 0.3, r * 0.16, r * 0.14);
    });
    ctx.fillStyle = '#3a2416';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - r * 0.26 + i * r * 0.22, y + r * 0.06, r * 0.1, r * 0.16);
  },
  armyOfTheDead(ctx, x, y, r) {
    glow(ctx, '#4ecbe0', r, () => skull(ctx, x, y - r * 0.16, r * 0.44, '#cdeef5', '#2a94ad'));
    ctx.fillStyle = 'rgba(140,220,235,0.6)';
    skull(ctx, x - r * 0.46, y + r * 0.3, r * 0.28, 'rgba(150,225,240,0.75)');
    skull(ctx, x + r * 0.46, y + r * 0.3, r * 0.28, 'rgba(150,225,240,0.75)');
  },
  landOfTheDead(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => {
      ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.4, r * 0.6, r * 0.18, 0, 0, TAU); ctx.stroke();
      // Skeletal hands clawing up.
      ctx.strokeStyle = '#c8ffd8'; ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
      for (let h = -1; h <= 1; h += 2) {
        const hx = x + h * r * 0.34;
        ctx.beginPath(); ctx.moveTo(hx, y + r * 0.35); ctx.lineTo(hx, y - r * 0.1); ctx.stroke();
        for (let f = -1; f <= 1; f++) {
          ctx.beginPath();
          ctx.moveTo(hx, y - r * 0.05);
          ctx.lineTo(hx + f * r * 0.14, y - r * 0.5);
          ctx.stroke();
        }
      }
    });
  },
  decrepify(ctx, x, y, r) {
    glow(ctx, '#4ecbe0', r, () => {
      // A withering curse — cracked ring + downward drag.
      ctx.strokeStyle = '#7fdce8'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(x, y, r * 0.44, 0.7, TAU - 0.7); ctx.stroke();
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.24); ctx.lineTo(x, y + r * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.lineTo(x - r * 0.16, y + r * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.lineTo(x + r * 0.16, y + r * 0.1); ctx.stroke();
    });
  },
  leech(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => {
      ctx.strokeStyle = '#e8564a'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(x, y, r * 0.44, 0.7, TAU - 0.7); ctx.stroke();
      // Downward barbed drain.
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.3); ctx.lineTo(x, y + r * 0.34); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const yy = y - r * 0.14 + i * r * 0.2;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x - r * 0.2, yy - r * 0.14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + r * 0.2, yy - r * 0.14); ctx.stroke();
      }
    });
  },
  frailty(ctx, x, y, r) {
    glow(ctx, '#b06adf', r, () => {
      ctx.strokeStyle = '#c98fe8'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(x, y, r * 0.44, 0.7, TAU - 0.7); ctx.stroke();
      // Hourglass — life running out.
      ctx.fillStyle = '#d8a8f0';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.24, y - r * 0.28); ctx.lineTo(x + r * 0.24, y - r * 0.28);
      ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.24, y + r * 0.28); ctx.lineTo(x + r * 0.24, y + r * 0.28);
      ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    });
  },
  boneArmor(ctx, x, y, r) {
    glow(ctx, '#8fd0ff', r, () => {
      const g = ctx.createLinearGradient(x, y - r * 0.5, x, y + r * 0.6);
      g.addColorStop(0, '#eafaff'); g.addColorStop(1, '#5f8fc0');
      ctx.strokeStyle = g; ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.52);
      ctx.lineTo(x + r * 0.44, y - r * 0.26);
      ctx.lineTo(x + r * 0.44, y + r * 0.16);
      ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.52, x, y + r * 0.6);
      ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.52, x - r * 0.44, y + r * 0.16);
      ctx.lineTo(x - r * 0.44, y - r * 0.26);
      ctx.closePath(); ctx.stroke();
      // Rib crossbars.
      ctx.lineWidth = r * 0.07;
      for (let i = 0; i < 3; i++) {
        const yy = y - r * 0.15 + i * r * 0.22;
        ctx.beginPath(); ctx.moveTo(x - r * 0.28, yy); ctx.quadraticCurveTo(x, yy + r * 0.1, x + r * 0.28, yy); ctx.stroke();
      }
    });
  },
  boneSpirit(ctx, x, y, r) {
    glow(ctx, '#4ade80', r, () => {
      ctx.fillStyle = boneGrad(ctx, x, y, r, '#f2ffe8', '#a8e6bd', '#2f6a3a');
      ctx.beginPath(); ctx.arc(x, y - r * 0.12, r * 0.34, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.3, y);
      ctx.quadraticCurveTo(x - r * 0.44, y + r * 0.55, x - r * 0.1, y + r * 0.46);
      ctx.quadraticCurveTo(x, y + r * 0.6, x + r * 0.1, y + r * 0.46);
      ctx.quadraticCurveTo(x + r * 0.44, y + r * 0.55, x + r * 0.3, y);
      ctx.fill();
    });
    ctx.fillStyle = '#0a1a10';
    ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.16, r * 0.08, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.12, y - r * 0.16, r * 0.08, 0, TAU); ctx.fill();
  },
  bloodRush(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const g = ctx.createLinearGradient(x - r * 0.55 + i * r * 0.3, y, x - r * 0.1 + i * r * 0.3, y);
        g.addColorStop(0, 'rgba(224,64,47,0.15)'); g.addColorStop(1, '#ff6a4a');
        ctx.strokeStyle = g; ctx.lineWidth = r * 0.15 - i * r * 0.02;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.55 + i * r * 0.3, y + r * 0.28);
        ctx.lineTo(x - r * 0.1 + i * r * 0.3, y - r * 0.28);
        ctx.stroke();
      }
    });
  },
  simulacrum(ctx, x, y, r) {
    glow(ctx, '#e0402f', r, () => skull(ctx, x - r * 0.2, y, r * 0.42, '#f0b8b0', '#e0402f'));
    ctx.globalAlpha = 0.45;
    skull(ctx, x + r * 0.26, y, r * 0.42, '#e8564a', '#ff6a4a');
    ctx.globalAlpha = 1;
  }
  };
})();

// Hand-drawn rune art (docs/art/runes/rune0.png …). Seeded per option so a
// given rune slot always shows the same stone. Falls back to the procedural
// glyph below when the art is absent.
const RUNE_IMAGE_COUNT = 20;
const RUNE_IMAGES = [];
(function loadRuneImages() {
  if (typeof Image === 'undefined') return;
  for (let i = 0; i < RUNE_IMAGE_COUNT; i++) {
    const img = new Image();
    img.src = 'art/runes/rune' + i + '.png';
    RUNE_IMAGES.push(img);
  }
})();

// Draw a rune shard. When `idx` is given it selects that exact rune image
// (callers pass distinct indices so a skill's options never repeat a stone);
// otherwise the stone is chosen by hashing `seed`. Falls back to the
// procedural carved glyph when the art is absent.
function drawRuneStone(ctx, x, y, r, seed, idx) {
  if (RUNE_IMAGES.length) {
    const n = RUNE_IMAGES.length;
    const pick = idx != null
      ? ((idx % n) + n) % n
      : Math.abs(Math.round(hash2(seed * 12.9898, seed * 78.233))) % n;
    const img = RUNE_IMAGES[pick];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - r * 1.15, y - r * 1.15, r * 2.3, r * 2.3);
      return;
    }
  }
  drawRuneStoneGlyph(ctx, x, y, r, seed);
}

// Procedural fallback: a chipped tablet with a glowing orange glyph, varied by
// a seed so each rune reads as a different etched stone.
function drawRuneStoneGlyph(ctx, x, y, r, seed) {
  const h = (hash2(seed * 12.9898, seed * 78.233) % 1000) / 1000;
  const rot = (h - 0.5) * 0.5;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  // Stone body — a rough shard.
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#6a6152'); g.addColorStop(0.5, '#4a4438'); g.addColorStop(1, '#2e2a22');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.82, -r * 0.7 + h * r * 0.2);
  ctx.lineTo(r * 0.6, -r * 0.86);
  ctx.lineTo(r * 0.86, r * 0.5);
  ctx.lineTo(-r * 0.5, r * 0.84 - h * r * 0.2);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8a8070'; ctx.lineWidth = r * 0.06; ctx.stroke();
  // Chipped top edge highlight.
  ctx.strokeStyle = 'rgba(230,225,210,0.4)'; ctx.lineWidth = r * 0.05;
  ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.55); ctx.lineTo(r * 0.5, -r * 0.7); ctx.stroke();
  // Glowing carved glyph — one of a few random variants.
  const variant = Math.floor(h * 5) % 5;
  ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = '#ff6a1a'; ctx.shadowBlur = r * 0.6;
  ctx.beginPath();
  if (variant === 0) {            // arrow-cross
    ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5);
    ctx.moveTo(-r * 0.3, -r * 0.1); ctx.lineTo(0, -r * 0.5); ctx.lineTo(r * 0.3, -r * 0.1);
    ctx.moveTo(-r * 0.3, r * 0.2); ctx.lineTo(0, r * 0.5);
  } else if (variant === 1) {     // angular K
    ctx.moveTo(-r * 0.25, -r * 0.5); ctx.lineTo(-r * 0.25, r * 0.5);
    ctx.moveTo(-r * 0.25, 0); ctx.lineTo(r * 0.3, -r * 0.5);
    ctx.moveTo(-r * 0.25, 0); ctx.lineTo(r * 0.3, r * 0.5);
  } else if (variant === 2) {     // radiant fork
    ctx.moveTo(0, r * 0.5); ctx.lineTo(0, -r * 0.15);
    ctx.moveTo(0, -r * 0.15); ctx.lineTo(-r * 0.35, -r * 0.5);
    ctx.moveTo(0, -r * 0.15); ctx.lineTo(r * 0.35, -r * 0.5);
    ctx.moveTo(0, -r * 0.15); ctx.lineTo(0, -r * 0.5);
  } else if (variant === 3) {     // zigzag bolt
    ctx.moveTo(-r * 0.3, -r * 0.5); ctx.lineTo(r * 0.15, -r * 0.1);
    ctx.lineTo(-r * 0.15, r * 0.1); ctx.lineTo(r * 0.3, r * 0.5);
  } else {                        // spiked eye
    ctx.moveTo(-r * 0.35, 0); ctx.lineTo(r * 0.35, 0);
    ctx.moveTo(0, -r * 0.4); ctx.lineTo(0, r * 0.4);
    ctx.moveTo(-r * 0.24, -r * 0.28); ctx.lineTo(r * 0.24, r * 0.28);
    ctx.moveTo(r * 0.24, -r * 0.28); ctx.lineTo(-r * 0.24, r * 0.28);
  }
  ctx.stroke();
  ctx.restore();
}

// -------------------------- custom icon art loader --------------------------
// Optional image art overrides the procedural glyphs. Drop a square PNG at
// docs/art/icons/<skillId>.png AND list that <skillId> in SKILL_ICON_FILES
// below; it renders in every skill slot (radial HUD, loadout, skill grid) with
// the procedural glyph as an automatic fallback. Listing only files that exist
// keeps the load free of 404s (the game ships with no icon art by default).
const SKILL_ICON_IMAGES = {};
const SKILL_ICON_FILES = [
  // Custom art in docs/art/icons/. Remove an id to fall back to its glyph.
  'boneSpikes', 'grimScythe', 'siphonBlood', 'boneSpear', 'skeletalMage', 'deathNova',
  'corpseExplosion', 'corpseLance', 'devour', 'revive', 'commandSkeletons', 'commandGolem',
  'armyOfTheDead', 'landOfTheDead', 'decrepify', 'leech', 'frailty', 'boneArmor',
  'boneSpirit', 'bloodRush', 'simulacrum'
];
function loadSkillIcons() {
  if (typeof Image === 'undefined') return;
  for (const id of SKILL_ICON_FILES) {
    if (!SKILL_ICONS[id]) continue;               // ignore unknown ids
    const img = new Image();
    img.src = 'art/icons/' + id + '.png';
    SKILL_ICON_IMAGES[id] = img;
  }
}
loadSkillIcons();

// Draw a skill's icon: the custom art if it has finished loading, else the
// hand-drawn procedural glyph. Art is fit to the button and clipped to its
// circle so square tiles stay inside the round slot.
function drawSkillIcon(ctx, id, x, y, r) {
  const img = SKILL_ICON_IMAGES[id];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    return;
  }
  const fn = SKILL_ICONS[id];
  if (fn) fn(ctx, x, y, r);
}

// -------------------------- gem icon art loader -----------------------------
// The owner's gem sheet is a 10-column (A–J) × 13-row grid. GEM_ART_GRID maps
// each gem type + tier (in GEM_TIERS order: Chipped…Marquise) to its [col,row]
// cell (col 0=A … 9=J, row 1–13) so tools/slice can cut the sheet into
// art/gems/<type><tier>.png. Kept in-repo as the authoritative source map.
const GEM_ART_GRID = {
  diamond:  [[1,1],[0,2],[0,3],[0,4],[0,6],[1,6],[1,5],[1,7],[0,7],[1,8],[1,10],[1,11],[1,12]],
  emerald:  [[2,1],[2,5],[3,2],[3,4],[2,6],[3,6],[3,5],[2,7],[3,7],[2,8],[3,8],[3,11],[2,11]],
  ruby:     [[5,1],[4,3],[4,2],[4,4],[5,4],[5,6],[5,5],[4,6],[5,7],[4,8],[4,9],[5,11],[4,12]],
  topaz:    [[7,1],[6,2],[7,3],[7,4],[7,6],[6,5],[7,5],[7,7],[6,9],[6,8],[7,10],[7,11],[7,12]],
  amethyst: [[8,1],[9,3],[9,2],[9,4],[9,6],[8,6],[9,5],[8,7],[9,7],[8,8],[8,10],[8,11],[9,11]]
};
// Flip to true once the 65 sliced PNGs exist in docs/art/gems/. Until then every
// gem draws its procedural glyph, so the game ships art-free with no 404s.
const GEM_ART_READY = false;
const GEM_IMAGES = {};   // GEM_IMAGES[type][tier] = Image
(function loadGemIcons() {
  if (!GEM_ART_READY || typeof Image === 'undefined' || typeof GEM_TYPES === 'undefined') return;
  for (const type of Object.keys(GEM_TYPES)) {
    GEM_IMAGES[type] = [];
    for (let t = 0; t < GEM_TIERS.length; t++) {
      const img = new Image();
      img.src = 'art/gems/' + type + t + '.png';
      GEM_IMAGES[type][t] = img;
    }
  }
})();

// Draw a gem: the sliced art if loaded, else the procedural faceted glyph.
function drawGemIcon(ctx, type, tier, x, y, r) {
  const imgs = GEM_IMAGES[type];
  const img = imgs && imgs[tier];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    return;
  }
  drawGemGlyph(ctx, type, tier, x, y, r);
}

// Procedural fallback: a faceted gem whose cut evolves up the 13-tier ladder —
// round → square → star → imperial → marquise — brighter and more ornate higher.
function drawGemGlyph(ctx, type, tier, x, y, r) {
  const gt = (typeof GEM_TYPES !== 'undefined' && GEM_TYPES[type]) || { color: '#bfe8f4' };
  const col = gt.color;
  const band = tier <= 2 ? 0 : tier <= 5 ? 1 : tier <= 8 ? 2 : tier <= 11 ? 3 : 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = col;
  ctx.shadowBlur = r * (0.35 + tier * 0.06);
  // Outline points for the cut.
  let pts;
  if (band === 0) {                                   // round brilliant
    pts = []; const n = 8; for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; pts.push([Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92]); }
  } else if (band === 1) {                             // square
    const s = r * 0.82; pts = [[-s, -s], [s, -s], [s, s], [-s, s]];
  } else if (band === 2) {                             // star / pointed
    pts = []; const n = 6; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU - Math.PI / 2; const rr2 = (i % 2 ? 0.5 : 1) * r; pts.push([Math.cos(a) * rr2, Math.sin(a) * rr2]); }
  } else if (band === 3) {                             // imperial oval
    pts = []; const n = 10; for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2; pts.push([Math.cos(a) * r * 0.7, Math.sin(a) * r]); }
  } else {                                             // marquise (pointed oval)
    pts = [[0, -r], [r * 0.6, -r * 0.2], [r * 0.5, r * 0.55], [0, r], [-r * 0.5, r * 0.55], [-r * 0.6, -r * 0.2]];
  }
  // Body with a vertical gradient.
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.28, col); g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // Facets — radiating lines to each vertex.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.6, r * 0.05);
  ctx.beginPath();
  pts.forEach(p => { ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); });
  ctx.stroke();
  // Rim.
  ctx.strokeStyle = shade(col, 0.3); ctx.lineWidth = Math.max(0.8, r * 0.09);
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  ctx.closePath(); ctx.stroke();
  // Top sparkle.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.4, r * 0.16, r * 0.28, -0.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ------------------------------ game logo art ------------------------------
// Optional title/menu logo. Drop docs/art/logo.png and flip LOGO_ART_READY to
// true; otherwise a procedural purple radiant-skull emblem is drawn. The art is
// fit (letterboxed) inside the given box so any aspect ratio stays uncropped.
const LOGO_ART_READY = true;
let LOGO_IMAGE = null;
(function loadLogo() {
  if (!LOGO_ART_READY || typeof Image === 'undefined') return;
  LOGO_IMAGE = new Image();
  // Cache-bust by version so a replaced logo.png is never served stale from the
  // browser/CDN cache (the filename stays the same, so the query must change).
  LOGO_IMAGE.src = 'art/logo.png?v=' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '1');
})();

function drawGameLogo(ctx, x, y, size, t = 0) {
  if (LOGO_IMAGE && LOGO_IMAGE.complete && LOGO_IMAGE.naturalWidth > 0) {
    const ar = LOGO_IMAGE.naturalWidth / LOGO_IMAGE.naturalHeight;
    let w = size, h = size / ar;
    if (h > size) { h = size; w = size * ar; }
    ctx.drawImage(LOGO_IMAGE, x - w / 2, y - h / 2, w, h);
    return;
  }
  drawLogoGlyph(ctx, x, y, size, t);
}

// Procedural fallback: a purple skull wreathed in a sunburst of bone spikes,
// with a glowing third eye — matching the owner's emblem until the art drops in.
function drawLogoGlyph(ctx, x, y, size, t) {
  const R = size / 2;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2);
  ctx.save();
  ctx.translate(x, y);
  // Purple aura — kept tight so the sunburst spikes read past its edge.
  const aura = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R * 0.72);
  aura.addColorStop(0, 'rgba(150,70,220,' + (0.34 + 0.14 * pulse).toFixed(3) + ')');
  aura.addColorStop(0.55, 'rgba(110,40,180,0.16)');
  aura.addColorStop(1, 'rgba(40,10,70,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.72, 0, TAU); ctx.fill();
  // Radiating bone spikes (sunburst).
  const rays = 18;
  ctx.shadowColor = '#b06adf'; ctx.shadowBlur = R * 0.14;
  for (let i = 0; i < rays; i++) {
    const long = i % 2 === 0;
    const len = R * (long ? 0.98 : 0.6);
    const w = R * (long ? 0.045 : 0.028);
    ctx.save(); ctx.rotate(i / rays * TAU);
    const g = ctx.createLinearGradient(0, -R * 0.24, 0, -len);
    g.addColorStop(0, 'rgba(180,120,240,0.12)');
    g.addColorStop(1, 'rgba(238,220,255,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-w, -R * 0.28); ctx.lineTo(0, -len); ctx.lineTo(w, -R * 0.28);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  // Skull.
  const sk = R * 0.6;
  const skg = ctx.createLinearGradient(0, -sk, 0, sk);
  skg.addColorStop(0, '#ecd6ff'); skg.addColorStop(0.5, '#a86ad8'); skg.addColorStop(1, '#3f1c63');
  ctx.fillStyle = skg;
  ctx.shadowColor = '#7a3ab0'; ctx.shadowBlur = R * 0.2;
  ctx.beginPath();
  ctx.moveTo(-sk * 0.7, -sk * 0.1);
  ctx.bezierCurveTo(-sk * 0.78, -sk * 0.95, sk * 0.78, -sk * 0.95, sk * 0.7, -sk * 0.1);
  ctx.bezierCurveTo(sk * 0.66, sk * 0.34, sk * 0.42, sk * 0.5, sk * 0.3, sk * 0.55);
  ctx.lineTo(sk * 0.2, sk * 0.92); ctx.lineTo(-sk * 0.2, sk * 0.92);
  ctx.lineTo(-sk * 0.3, sk * 0.55);
  ctx.bezierCurveTo(-sk * 0.42, sk * 0.5, -sk * 0.66, sk * 0.34, -sk * 0.7, -sk * 0.1);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // Eye sockets.
  ctx.fillStyle = '#180724';
  ctx.beginPath(); ctx.ellipse(-sk * 0.32, -sk * 0.04, sk * 0.23, sk * 0.27, 0.25, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sk * 0.32, -sk * 0.04, sk * 0.23, sk * 0.27, -0.25, 0, TAU); ctx.fill();
  // Glowing eyes + third eye.
  ctx.fillStyle = '#e0a8ff'; ctx.shadowColor = '#c060ff'; ctx.shadowBlur = R * 0.16;
  const er = sk * 0.09 * (0.8 + 0.4 * pulse);
  ctx.beginPath(); ctx.arc(-sk * 0.32, -sk * 0.01, er, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(sk * 0.32, -sk * 0.01, er, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -sk * 0.52, sk * 0.08, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0;
  // Nasal cavity + teeth.
  ctx.fillStyle = '#180724';
  ctx.beginPath(); ctx.moveTo(0, sk * 0.06); ctx.lineTo(-sk * 0.11, sk * 0.32); ctx.lineTo(sk * 0.11, sk * 0.32); ctx.closePath(); ctx.fill();
  for (let i = -2; i <= 2; i++) ctx.fillRect(i * sk * 0.13 - sk * 0.05, sk * 0.56, sk * 0.09, sk * 0.2);
  ctx.restore();
}

// Lighten (t>0) or darken (t<0) a #rrggbb hex by fraction t.
function shade(hex, t) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const f = c => { let v = parseInt(c, 16); v = t < 0 ? v * (1 + t) : v + (255 - v) * t; return Math.max(0, Math.min(255, Math.round(v))); };
  const h = n => n.toString(16).padStart(2, '0');
  return '#' + h(f(m[1])) + h(f(m[2])) + h(f(m[3]));
}

// ------------------------------ extra FX ------------------------------------

function fxSpikes(x, y) {
  Particles.ring(x, y, 60, '#e8e0cc', 3, 0.3);
  Particles.spawn(x, y, {
    count: 14, color: ['#e8e0cc', '#c9c0a8'],
    minSpeed: 40, maxSpeed: 200, minLife: 0.2, maxLife: 0.45,
    minSize: 2, maxSize: 4, grav: 340
  });
}

function fxScythe(p, a) {
  for (let i = 0; i < 9; i++) {
    const aa = a + rand(-1.1, 1.1);
    const rr2 = rand(50, 92);
    Particles.spawn(p.x + Math.cos(aa) * rr2, p.y + Math.sin(aa) * rr2, {
      count: 1, color: ['#c9bfa8', '#8f8672'], angle: aa + Math.PI / 2, spread: 0.3,
      minSpeed: 60, maxSpeed: 150, minLife: 0.12, maxLife: 0.26, minSize: 2, maxSize: 3
    });
  }
}

function fxSiphon(p, e) {
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const wob = Math.sin(Game.time * 30 + i) * 6;
    Particles.spawn(lerp(p.x, e.x, k), lerp(p.y, e.y, k) + wob, {
      count: 1, color: ['#e04a5a', '#b52033'], minSpeed: 0, maxSpeed: 20,
      minLife: 0.08, maxLife: 0.16, minSize: 2, maxSize: 3.5, glow: true
    });
  }
}

function fxBloodTrail(x1, y1, x2, y2) {
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    Particles.spawn(lerp(x1, x2, k), lerp(y1, y2, k), {
      count: 2, color: ['#c22843', '#8f1626'], minSpeed: 10, maxSpeed: 60,
      minLife: 0.2, maxLife: 0.45, minSize: 2, maxSize: 4
    });
  }
}

function fxArmy(x, y, R) {
  Particles.ring(x, y, R, '#6ff7c3', 8, 0.6);
  Particles.ring(x, y, R * 0.6, '#e8e0cc', 5, 0.5);
  for (let i = 0; i < 24; i++) {
    const a = rand(TAU), d = rand(R * 0.15, R * 0.9);
    Particles.spawn(x + Math.cos(a) * d, y + Math.sin(a) * d, {
      count: 3, color: ['#e8e0cc', '#6ff7c3', '#c9c0a8'],
      minSpeed: 30, maxSpeed: 160, minLife: 0.3, maxLife: 0.8,
      grav: -120, glow: true
    });
  }
}
