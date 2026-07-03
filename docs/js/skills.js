'use strict';
// ---------------------------------------------------------------------------
// The Diablo 3 Necromancer kit, playable: behaviors for all 21 actives,
// passive hooks, cooldowns per skill, Land of the Dead state, Simulacrum
// mirroring, and the aim resolution shared by every targeted cast.
// ---------------------------------------------------------------------------

function nearestEnemy(x, y, maxDist = 750) {
  let best = null, bestD = maxDist;
  for (const e of Game.enemies) {
    if (e.dead || e.sleep || e.spawnT > 0) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function strongestEnemy(x, y, maxDist = 750) {
  let best = null, bestHp = 0;
  for (const e of Game.enemies) {
    if (e.dead || e.sleep || e.spawnT > 0) continue;
    if (dist(x, y, e.x, e.y) > maxDist) continue;
    if (e.hp > bestHp) { best = e; bestHp = e.hp; }
  }
  return best;
}

function resolveAim(explicit) {
  const p = Game.player;
  if (explicit !== null && explicit !== undefined) return explicit;
  if (Input.aim.active) return Math.atan2(Input.aim.y, Input.aim.x);
  if (Input.mousePrimary || Input.mouseSecondary) {
    return Math.atan2(
      Input.mousePos.y - (p.y - Game.camera.y),
      Input.mousePos.x - (p.x - Game.camera.x));
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
    fxSpikes(pt.x, pt.y);
    World.smash(pt.x, pt.y, 60);
    const dmg = 14 * (rune === 'bonePillars' ? 1.5 : 1) * p.power(); // Bone Pillars: 225%
    let hit = 0;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      if (dist(pt.x, pt.y, e.x, e.y) < 60 + e.r) {
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
    const drained = inRange.slice(0, maxTargets).map(t => t[1]);
    for (const e of drained) {
      e.hurt(6 * p.power());
      p.heal(p.maxHp * 0.008);
      fxSiphon(p, e);
    }
    p.gainEssence(Skills.gainFor('siphonBlood'));
    p.facing = angleTo(p.x, p.y, drained[0].x, drained[0].y);
    // Funerary Pick: +20% damage per target being drained, 3s.
    if (pick) { p.funeraryStacks = drained.length; p.funeraryT = 3; }
    // Power Shift rune: +10% damage per channel stack, max 10.
    if (Hero.rune('siphonBlood') === 'powerShift') {
      p.powerShiftStacks = Math.min(10, p.powerShiftStacks + 1);
      p.powerShiftT = 1;
    }
    // Iron Rose: channeling Siphon Blood casts free Death Novas.
    if (p.powers && p.powers.ironRose && Skills.ironRoseCd <= 0 && Math.random() < 0.5) {
      Skills.ironRoseCd = 0.45;
      SKILL_FX.deathNova(p);
    }
    if (Math.random() < 0.25) AudioSys.sfx('siphon');
    return true;
  },

  boneSpear(p, a) {
    // Blood Spear rune: +40% damage paid for in blood.
    const blood = Hero.rune('boneSpear') === 'bloodSpear';
    if (blood) {
      const lifeCost = p.maxHp * 0.02;
      if (p.hp <= lifeCost + 1) return false;
      p.hp -= lifeCost;
    }
    const o = boneOpts(a, 130);
    Game.projectiles.push(new Projectile(
      p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a,
      {
        speed: 720, dmg: (blood ? 56 : 40) * p.power(), r: 9, life: 1.15, pierce: true, type: 'spear',
        root: o.root ? 2 : 0, slowOnHit: o.slow || 0
      }
    ));
    p.facing = a;
    Particles.shake(2);
    AudioSys.sfx('spear');
    Skills.mirror('boneSpear', a);
    return true;
  },

  skeletalMage(p, a) {
    if (minionCount('mage') >= 4) cullOldest('mage');
    const m = new Minion(p.x + Math.cos(a + 0.8) * 36, p.y + Math.sin(a + 0.8) * 36, 'mage');
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
    const R = rune === 'boneNova' ? 130 : 190;   // Bone Nova: tighter, harder
    fxNova(p.x, p.y, R);
    World.smash(p.x, p.y, R);
    // Bloodtide Blade: +350% Death Nova damage per enemy near you.
    let mult = blood ? 1.5 : rune === 'boneNova' ? 1.35 : 1;
    mult *= 1 + (p.deathNovaBonus || 0);   // Inarius helm/boots + Iron Rose: +Death Nova damage
    if (p.powers && p.powers.bloodtide) {
      let near = 0;
      for (const e of Game.enemies) {
        if (!e.dead && !e.sleep && dist(p.x, p.y, e.x, e.y) < 220) near++;
      }
      mult *= 1 + 3.5 * Math.min(15, near);
    }
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < R) {
        e.hurt(34 * mult * p.power() * (1 - d / R * 0.3), { knock: { a: angleTo(p.x, p.y, e.x, e.y), f: 200 } });
        if (rune === 'tendrilNova') p.heal(p.maxHp * 0.01);  // Tendril Nova: lifesteal
        if (rune === 'blight') e.slow = Math.max(e.slow, 3);  // Blight: slow cloud
      }
    }
    AudioSys.sfx('nova');
    Skills.mirror('deathNova', 0);
    return true;
  },

  boneArmor(p) {
    const set = p.setCount || 0;
    const kalan = p.powers && p.powers.wisdomOfKalan; // 5 extra stacks, 75% DR cap, bigger shield
    const stun = Hero.rune('boneArmor') === 'dislocation';
    World.smash(p.x, p.y, 150);
    let hits = 0;
    for (const e of Game.enemies) {
      if (e.dead || e.sleep || e.spawnT > 0) continue;
      if (dist(p.x, p.y, e.x, e.y) < 150 + e.r) {
        const o = boneOpts(angleTo(p.x, p.y, e.x, e.y), 80);
        if (stun) o.root = Math.max(o.root || 0, 2); // Dislocation: stunned
        // Inarius 2pc: Bone Armor damage +1000% (x11).
        e.hurt(12 * (set >= 2 ? 11 : 1) * p.power(), o);
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
    const tgt = strongestEnemy(p.x, p.y, 800) || nearestEnemy(p.x, p.y, 800);
    Game.projectiles.push(new Projectile(p.x, p.y - 8, a, {
      speed: 300, dmg: 160 * p.power(), r: 10, life: 4, type: 'spirit', homing: tgt
    }));
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
    p.dash = { t: 0, maxT: 0.16, fx: p.x, fy: p.y, tx: pt.x, ty: pt.y };
    p.facing = a;
    AudioSys.sfx('rush');
    return true;
  },

  decrepify(p, a) {
    const pt = aimPoint(a);
    return applyCurse('decrepify', pt.x, pt.y);
  },

  frailty(p, a) {
    const pt = aimPoint(a);
    return applyCurse('frailty', pt.x, pt.y);
  },

  leech(p, a) {
    const pt = aimPoint(a);
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
    for (const c of corpses) {
      c.consume();
      fxExplosion(c.x, c.y, BLAST);
      World.smash(c.x, c.y, BLAST);
      for (const e of Game.enemies) {
        if (e.dead || e.sleep) continue;
        const d = dist(c.x, c.y, e.x, e.y);
        if (d < BLAST) {
          const o = { knock: { a: angleTo(c.x, c.y, e.x, e.y), f: 160 } };
          if (ceRune === 'deadCold') o.root = 3;  // Dead Cold: freeze
          e.hurt(36 * ceMult * p.power() * (1 - d / BLAST * 0.4), o);
        }
      }
    }
    AudioSys.sfx('explode');
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
    for (const c of sources) {
      c.consume();
      const la = angleTo(c.x, c.y, tgt.x, tgt.y);
      Game.projectiles.push(new Projectile(c.x, c.y - 6, la, {
        speed: 640, dmg: 48 * p.power(), r: 7, life: 1.4, type: 'lance', homing: tgt
      }));
      fxBone(c.x, c.y, 5);
    }
    AudioSys.sfx('spear');
    return true;
  },

  devour(p) {
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
      p.heal(p.maxHp * 0.015);
      Particles.spawn(c.x, c.y, {
        count: 6, color: ['#6ff7c3', '#3ee6a0'], minSpeed: 60, maxSpeed: 160,
        minLife: 0.25, maxLife: 0.5, glow: true
      });
    }
    fxHeal(p.x, p.y);
    AudioSys.sfx('devour');
    return true;
  },

  commandSkeletons(p, a) {
    const have = minionCount('skeleton');
    if (have >= 7) {
      // Recast: frenzy the warband.
      for (const m of Game.minions) {
        if (m.kind === 'skeleton') m.frenzyT = 6;
      }
      Particles.text(p.x, p.y - 40, 'ATTACK!', { color: '#ff8c5a', size: 15 });
      AudioSys.sfx('summon');
      return true;
    }
    const raise = Math.min(7 - have, 4);
    for (let i = 0; i < raise; i++) {
      const sa = a + Math.PI + (i - raise / 2) * 0.5;
      Game.minions.push(new Minion(p.x + Math.cos(sa) * 38, p.y + Math.sin(sa) * 38, 'skeleton'));
    }
    AudioSys.sfx('summon');
    return true;
  },

  commandGolem(p, a) {
    let golem = null;
    for (const m of Game.minions) if (!m.dead && m.kind === 'golem') golem = m;
    if (!golem) {
      Game.minions.push(new Minion(p.x + Math.cos(a + Math.PI) * 44, p.y + Math.sin(a + Math.PI) * 44, 'golem'));
      AudioSys.sfx('summon');
      return true;
    }
    // Recast: the golem slams.
    fxExplosion(golem.x, golem.y, 150);
    World.smash(golem.x, golem.y, 150);
    Particles.shake(5);
    for (const e of Game.enemies) {
      if (e.dead || e.sleep) continue;
      const d = dist(golem.x, golem.y, e.x, e.y);
      if (d < 150 + e.r) {
        e.hurt(50 * p.power(), { knock: { a: angleTo(golem.x, golem.y, e.x, e.y), f: 220 }, slow: 2 });
      }
    }
    AudioSys.sfx('explode');
    Skills.cds.commandGolem = 12; // slam has its own shorter cooldown
    return 'cdSet';
  },

  armyOfTheDead(p, a) {
    const pt = aimPoint(a, 260);
    const R = 260;
    fxArmy(pt.x, pt.y, R);
    World.smash(pt.x, pt.y, R);
    for (const e of Game.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist(pt.x, pt.y, e.x, e.y);
      if (d < R) {
        e.wake();
        e.hurt(220 * p.power() * (1 - d / R * 0.4), { knock: { a: angleTo(pt.x, pt.y, e.x, e.y), f: 260 } });
      }
    }
    Particles.shake(9);
    AudioSys.sfx('army');
    return true;
  },

  revive(p) {
    const corpses = Skills.lotd > 0
      ? [0, 1, 2].map(() => ({ x: p.x + rand(-60, 60), y: p.y + rand(-60, 60), consume() {} }))
      : corpsesNear(p.x, p.y, 320, 5);
    if (!corpses.length) {
      Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
      AudioSys.sfx('denied');
      return false;
    }
    for (const c of corpses) {
      c.consume();
      if (minionCount('revived') >= 8) cullOldest('revived');
      Game.minions.push(new Minion(c.x, c.y, 'revived'));
    }
    AudioSys.sfx('summon');
    return true;
  },

  landOfTheDead(p) {
    Skills.lotd = 8;
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
  lotd: 0,          // Land of the Dead time remaining
  lotdSpawn: 0,
  ironRoseCd: 0,    // Iron Rose free-nova throttle
  graveTick: 3,     // Grave Caller passive corpse timer
  byId: {},

  init() {
    this.byId = {};
    for (const s of SKILL_DATA) this.byId[s.id] = s;
  },

  reset() {
    this.cds = {};
    this.lotd = 0;
    this.ironRoseCd = 0;
    this.graveTick = 3;
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
    return cd;
  },

  costFor(s) {
    if (this.lotd > 0 && s.cat === 'corpse') return 0;
    return s.cost;
  },

  update(dt) {
    for (const k of Object.keys(this.cds)) {
      this.cds[k] = Math.max(0, this.cds[k] - dt);
    }
    this.ironRoseCd = Math.max(0, this.ironRoseCd - dt);

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
    const result = SKILL_FX[s.id](p, resolveAim(angle));
    if (result) {
      p.essence -= cost;
      if (result !== 'cdSet') this.cds[s.id] = this.cdFor(s);
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

const SKILL_ICONS = {
  boneSpikes(ctx, x, y, r) {
    ctx.fillStyle = '#e8e0cc';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.34 - r * 0.14, y + r * 0.45);
      ctx.lineTo(x + i * r * 0.34, y - r * 0.5 + Math.abs(i) * r * 0.22);
      ctx.lineTo(x + i * r * 0.34 + r * 0.14, y + r * 0.45);
      ctx.closePath(); ctx.fill();
    }
  },
  grimScythe(ctx, x, y, r) {
    ctx.strokeStyle = '#c9bfa8';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y + r * 0.55); ctx.lineTo(x + r * 0.15, y - r * 0.45); ctx.stroke();
    ctx.lineWidth = r * 0.13;
    ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.28, r * 0.42, -0.6, 1.4); ctx.stroke();
  },
  siphonBlood(ctx, x, y, r) {
    ctx.strokeStyle = '#e04a5a';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.3);
    ctx.quadraticCurveTo(x, y - r * 0.55, x + r * 0.45, y - r * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#e04a5a';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.05);
    ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.35, x, y + r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.35, x, y - r * 0.05);
    ctx.fill();
  },
  boneSpear(ctx, x, y, r) {
    ctx.fillStyle = '#f2ecd8';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(r * 0.62, 0); ctx.lineTo(r * 0.15, -r * 0.2);
    ctx.lineTo(-r * 0.55, -r * 0.08); ctx.lineTo(-r * 0.45, 0);
    ctx.lineTo(-r * 0.55, r * 0.08); ctx.lineTo(r * 0.15, r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },
  skeletalMage(ctx, x, y, r) {
    ctx.fillStyle = '#4ecbe0';
    ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.16, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#cfc6ad';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.05); ctx.lineTo(x, y + r * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 0.12); ctx.lineTo(x + r * 0.3, y + r * 0.12); ctx.stroke();
    ctx.fillStyle = '#cfc6ad';
    ctx.beginPath(); ctx.arc(x, y - r * 0.05, r * 0.14, 0, TAU); ctx.fill();
  },
  deathNova(ctx, x, y, r) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath(); ctx.arc(x, y, r * 0.15, 0, TAU); ctx.fill();
    ctx.lineWidth = r * 0.07;
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4 + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52);
      ctx.lineTo(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66);
      ctx.stroke();
    }
  },
  boneArmor(ctx, x, y, r) {
    ctx.strokeStyle = '#e8e0cc';
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.42, y - r * 0.25);
    ctx.lineTo(x + r * 0.42, y + r * 0.15);
    ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.5, x, y + r * 0.58);
    ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.5, x - r * 0.42, y + r * 0.15);
    ctx.lineTo(x - r * 0.42, y - r * 0.25);
    ctx.closePath();
    ctx.stroke();
  },
  boneSpirit(ctx, x, y, r) {
    ctx.fillStyle = '#e8e0cc';
    ctx.beginPath(); ctx.arc(x, y - r * 0.1, r * 0.3, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.28, y);
    ctx.quadraticCurveTo(x - r * 0.4, y + r * 0.5, x - r * 0.1, y + r * 0.42);
    ctx.quadraticCurveTo(x, y + r * 0.55, x + r * 0.1, y + r * 0.42);
    ctx.quadraticCurveTo(x + r * 0.4, y + r * 0.5, x + r * 0.28, y);
    ctx.fill();
    ctx.fillStyle = '#16121b';
    ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.14, r * 0.07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.14, r * 0.07, 0, TAU); ctx.fill();
  },
  bloodRush(ctx, x, y, r) {
    ctx.strokeStyle = '#e04a5a';
    ctx.lineWidth = r * 0.12;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.4 + i * 0.3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5 + i * r * 0.28, y + r * 0.2);
      ctx.lineTo(x - r * 0.2 + i * r * 0.28, y - r * 0.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  decrepify(ctx, x, y, r) {
    ctx.strokeStyle = '#b06adf';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0.6, TAU - 0.6); ctx.stroke();
    ctx.fillStyle = '#b06adf';
    ctx.beginPath(); ctx.arc(x, y, r * 0.14, 0, TAU); ctx.fill();
  },
  frailty(ctx, x, y, r) {
    ctx.strokeStyle = '#e04a5a';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0.6, TAU - 0.6); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.15, y - r * 0.15); ctx.lineTo(x + r * 0.15, y + r * 0.15);
    ctx.moveTo(x + r * 0.15, y - r * 0.15); ctx.lineTo(x - r * 0.15, y + r * 0.15);
    ctx.stroke();
  },
  leech(ctx, x, y, r) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0.6, TAU - 0.6); ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.2);
    ctx.quadraticCurveTo(x + r * 0.22, y + r * 0.1, x, y + r * 0.25);
    ctx.quadraticCurveTo(x - r * 0.22, y + r * 0.1, x, y - r * 0.2);
    ctx.fill();
  },
  corpseExplosion(ctx, x, y, r) {
    ctx.fillStyle = '#ffb43a';
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      const len = i % 2 ? r * 0.55 : r * 0.34;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a + 0.25) * r * 0.14, y + Math.sin(a + 0.25) * r * 0.14);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.lineTo(x + Math.cos(a - 0.25) * r * 0.14, y + Math.sin(a - 0.25) * r * 0.14);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#b52033';
    ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill();
  },
  corpseLance(ctx, x, y, r) {
    ctx.strokeStyle = '#ffb43a';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + i * r * 0.3);
      ctx.lineTo(x + r * 0.45, y);
      ctx.stroke();
    }
  },
  devour(ctx, x, y, r) {
    ctx.strokeStyle = '#6ff7c3';
    ctx.lineWidth = r * 0.11;
    ctx.lineCap = 'round';
    // Jaws.
    ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.4, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + r * 0.15, r * 0.4, Math.PI + 0.15, -0.15); ctx.stroke();
    ctx.fillStyle = '#6ff7c3';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.22 - r * 0.06, y - r * 0.22);
      ctx.lineTo(x + i * r * 0.22, y - r * 0.02);
      ctx.lineTo(x + i * r * 0.22 + r * 0.06, y - r * 0.22);
      ctx.fill();
    }
  },
  commandSkeletons(ctx, x, y, r) {
    ctx.strokeStyle = '#6ff7c3';
    ctx.fillStyle = '#6ff7c3';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.arc(x + i * r * 0.3, y - r * 0.05, r * 0.14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + i * r * 0.3, y + r * 0.08); ctx.lineTo(x + i * r * 0.3, y + r * 0.42); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(x, y - r * 0.3, r * 0.18, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - r * 0.12); ctx.lineTo(x, y + r * 0.3); ctx.stroke();
  },
  commandGolem(ctx, x, y, r) {
    ctx.fillStyle = '#b8ae93';
    rr(ctx, x - r * 0.34, y - r * 0.42, r * 0.68, r * 0.6, r * 0.12); ctx.fill();
    ctx.fillRect(x - r * 0.5, y - r * 0.25, r * 0.18, r * 0.5);
    ctx.fillRect(x + r * 0.32, y - r * 0.25, r * 0.18, r * 0.5);
    ctx.fillRect(x - r * 0.28, y + r * 0.2, r * 0.2, r * 0.38);
    ctx.fillRect(x + r * 0.08, y + r * 0.2, r * 0.2, r * 0.38);
    ctx.fillStyle = '#6ff7c3';
    ctx.fillRect(x - r * 0.18, y - r * 0.26, r * 0.1, r * 0.1);
    ctx.fillRect(x + r * 0.08, y - r * 0.26, r * 0.1, r * 0.1);
  },
  armyOfTheDead(ctx, x, y, r) {
    ctx.strokeStyle = '#6ff7c3';
    ctx.lineWidth = r * 0.09;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      const h = r * (0.35 + (2 - Math.abs(i)) * 0.12);
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.22, y + r * 0.5);
      ctx.lineTo(x + i * r * 0.22, y + r * 0.5 - h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.22 - r * 0.08, y + r * 0.5 - h * 0.7);
      ctx.lineTo(x + i * r * 0.22 + r * 0.08, y + r * 0.5 - h * 0.7);
      ctx.stroke();
    }
  },
  revive(ctx, x, y, r) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = r * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.5); ctx.lineTo(x, y - r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, y); ctx.lineTo(x + r * 0.3, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.18, y - r * 0.28);
    ctx.lineTo(x, y - r * 0.5);
    ctx.lineTo(x + r * 0.18, y - r * 0.28);
    ctx.stroke();
  },
  landOfTheDead(ctx, x, y, r) {
    ctx.strokeStyle = '#6ff7c3';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.3, r * 0.5, r * 0.18, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#6ff7c3';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.3 - r * 0.07, y + r * 0.25);
      ctx.lineTo(x + i * r * 0.3, y - r * 0.35 + Math.abs(i) * r * 0.15);
      ctx.lineTo(x + i * r * 0.3 + r * 0.07, y + r * 0.25);
      ctx.fill();
    }
  },
  simulacrum(ctx, x, y, r) {
    ctx.strokeStyle = '#e04a5a';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.arc(x - r * 0.18, y, r * 0.32, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(x + r * 0.22, y, r * 0.32, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
};

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
