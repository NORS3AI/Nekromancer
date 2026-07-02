'use strict';
// ---------------------------------------------------------------------------
// The Nekromancer's kit. Slot 0 is the primary (essence generator); slots
// 1-4 are spenders on cooldown. Auto-aim picks the nearest enemy so the game
// plays one-thumb on mobile.
// ---------------------------------------------------------------------------

function nearestEnemy(x, y, maxDist = 750) {
  let best = null, bestD = maxDist;
  for (const e of Game.enemies) {
    if (e.dead || e.spawnT > 0) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function aimAngle() {
  const p = Game.player;
  const e = nearestEnemy(p.x, p.y);
  if (e) return angleTo(p.x, p.y, e.x, e.y);
  return p.facing;
}

const Skills = {
  cds: [0, 0, 0, 0, 0],

  list: [
    {
      name: 'Bone Splinters',
      key: 'SPC',
      cd: 0.30,
      cost: 0,
      desc: 'Fire 3 bone shards. Generates Essence on hit.',
      use(p) {
        const a = aimAngle();
        for (let i = -1; i <= 1; i++) {
          Game.projectiles.push(new Projectile(
            p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14,
            a + i * 0.13 + rand(-0.03, 0.03),
            { speed: 540, dmg: 8 * p.dmgMult, r: 4, life: 0.85, type: 'shard' }
          ));
        }
        p.facing = a;
        AudioSys.sfx('shoot');
        return true;
      },
      icon(ctx, x, y, r) {
        ctx.strokeStyle = '#e8e0cc';
        ctx.lineWidth = r * 0.11;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          const a = -Math.PI / 2 + i * 0.45;
          ctx.beginPath();
          ctx.moveTo(x - Math.cos(a) * r * 0.15, y - Math.sin(a) * r * 0.15 + r * 0.3);
          ctx.lineTo(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55);
          ctx.stroke();
        }
      }
    },
    {
      name: 'Bone Spear',
      key: '1',
      cd: 2.6,
      cost: 18,
      desc: 'Hurl a piercing spear of bone.',
      use(p) {
        const a = aimAngle();
        Game.projectiles.push(new Projectile(
          p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a,
          { speed: 720, dmg: 34 * p.dmgMult, r: 9, life: 1.15, pierce: true, type: 'spear' }
        ));
        p.facing = a;
        Particles.shake(2);
        AudioSys.sfx('spear');
        return true;
      },
      icon(ctx, x, y, r) {
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
      }
    },
    {
      name: 'Corpse Explosion',
      key: '2',
      cd: 1.2,
      cost: 8,
      desc: 'Detonate nearby corpses.',
      use(p) {
        const RANGE = 270, BLAST = 120;
        const targets = [];
        for (const c of Game.corpses) {
          if (!c.gone && dist(p.x, p.y, c.x, c.y) < RANGE) targets.push(c);
          if (targets.length >= 5) break;
        }
        if (!targets.length) {
          Particles.text(p.x, p.y - 40, 'No corpses!', { color: '#9aa0a8', size: 13 });
          AudioSys.sfx('denied');
          return false;
        }
        for (const c of targets) {
          c.gone = true;
          fxExplosion(c.x, c.y, BLAST);
          for (const e of Game.enemies) {
            if (e.dead) continue;
            const d = dist(c.x, c.y, e.x, e.y);
            if (d < BLAST) {
              e.hurt(30 * p.dmgMult * (1 - d / BLAST * 0.4), {
                knock: { a: angleTo(c.x, c.y, e.x, e.y), f: 160 }
              });
            }
          }
        }
        AudioSys.sfx('explode');
        return true;
      },
      icon(ctx, x, y, r) {
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
      }
    },
    {
      name: 'Skeletal Warriors',
      key: '3',
      cd: 7,
      cost: 28,
      desc: 'Raise 2 skeletal warriors (max 4).',
      use(p) {
        for (let i = 0; i < 2; i++) {
          if (Game.minions.length >= 4) {
            const old = Game.minions.shift();
            fxBone(old.x, old.y, 8);
          }
          const a = p.facing + (i === 0 ? 0.7 : -0.7) + Math.PI;
          const m = new Minion(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 34, p);
          Game.minions.push(m);
          fxSummon(m.x, m.y);
        }
        AudioSys.sfx('summon');
        return true;
      },
      icon(ctx, x, y, r) {
        ctx.strokeStyle = '#6ff7c3';
        ctx.fillStyle = '#6ff7c3';
        ctx.lineWidth = r * 0.09;
        ctx.lineCap = 'round';
        // Little skull.
        ctx.beginPath(); ctx.arc(x, y - r * 0.18, r * 0.28, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0f2420';
        ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.22, r * 0.07, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.22, r * 0.07, 0, TAU); ctx.fill();
        // Ribs below.
        ctx.strokeStyle = '#6ff7c3';
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.06); ctx.lineTo(x, y + r * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.22, y + r * 0.2); ctx.lineTo(x + r * 0.22, y + r * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.18, y + r * 0.36); ctx.lineTo(x + r * 0.18, y + r * 0.36); ctx.stroke();
      }
    },
    {
      name: 'Blood Nova',
      key: '4',
      cd: 9,
      cost: 32,
      desc: 'Erupt in a nova of blood. Heals per enemy hit and shields you.',
      use(p) {
        const R = 210;
        fxNova(p.x, p.y, R);
        let hitCount = 0;
        for (const e of Game.enemies) {
          if (e.dead || e.spawnT > 0) continue;
          const d = dist(p.x, p.y, e.x, e.y);
          if (d < R) {
            hitCount++;
            e.hurt(42 * p.dmgMult * (1 - d / R * 0.35), {
              knock: { a: angleTo(p.x, p.y, e.x, e.y), f: 260 },
              slow: 1.5
            });
          }
        }
        if (hitCount) {
          p.heal(hitCount * 5);
          fxHeal(p.x, p.y);
        }
        p.shield = Math.min(60, p.shield + 25);
        AudioSys.sfx('nova');
        return true;
      },
      icon(ctx, x, y, r) {
        ctx.strokeStyle = '#c22843';
        ctx.lineWidth = r * 0.13;
        ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#c22843';
        ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, TAU); ctx.fill();
        ctx.lineWidth = r * 0.08;
        for (let i = 0; i < 4; i++) {
          const a = i * TAU / 4 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r * 0.52, y + Math.sin(a) * r * 0.52);
          ctx.lineTo(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68);
          ctx.stroke();
        }
      }
    }
  ],

  reset() {
    this.cds = [0, 0, 0, 0, 0];
  },

  update(dt) {
    for (let i = 0; i < this.cds.length; i++) {
      this.cds[i] = Math.max(0, this.cds[i] - dt);
    }
    // Discrete presses buffered by Input can't be dropped between frames.
    for (const slot of Input.pendingSlots) this.tryUse(slot);
    Input.pendingSlots.length = 0;
    // Held buttons fire as soon as they're ready (mobile-friendly).
    for (let i = 0; i < this.list.length; i++) {
      if (Input.skillHeld(i)) this.tryUse(i);
    }
  },

  tryUse(slot) {
    const p = Game.player;
    if (!p || p.dead || Game.state !== 'playing') return;
    const s = this.list[slot];
    if (this.cds[slot] > 0) return;
    if (p.essence < s.cost) {
      // Give feedback only on discrete presses, not every held frame.
      return;
    }
    if (s.use(p)) {
      p.essence -= s.cost;
      this.cds[slot] = s.cd;
    } else {
      this.cds[slot] = 0.35; // brief lockout after a failed cast
    }
  }
};
