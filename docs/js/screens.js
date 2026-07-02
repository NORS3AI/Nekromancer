'use strict';
// ---------------------------------------------------------------------------
// Full-screen menus: title, camp hub, waypoint map, the console-style radial
// equipment wheel, skills & passives, Blacksmith, Jeweler, Mystic, pause,
// death and the bounty reward screen. All input goes through UI's tap
// registry, so everything is one-thumb friendly.
// ---------------------------------------------------------------------------

const Screens = {

  draw(ctx, W, H) {
    switch (UI.screen) {
      case 'radial': this.radial(ctx, W, H); break;
      case 'skills': this.skills(ctx, W, H); break;
      case 'smith': this.smith(ctx, W, H); break;
      case 'jeweler': this.jeweler(ctx, W, H); break;
      case 'mystic': this.mystic(ctx, W, H); break;
      case 'pause': this.pause(ctx, W, H); break;
      case 'reward': this.reward(ctx, W, H); break;
    }
  },

  dim(ctx, W, H) {
    ctx.fillStyle = 'rgba(4,2,8,0.82)';
    ctx.fillRect(0, 0, W, H);
  },

  closeX(ctx, W) {
    ctx.fillStyle = '#c9bfa8';
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✕', W - 26, 26);
    UI.register(W - 46, 6, 40, 40, () => UI.close());
  },

  // -------------------------------------------------------------- title

  title(ctx, W, H) {
    const cx = W / 2, cy = H * 0.34;
    const t = Game.time;

    ctx.save();
    ctx.translate(cx, cy - 76 + Math.sin(t * 1.4) * 4);
    ctx.shadowColor = '#6ff7c3';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ded5bd';
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
    ctx.fillRect(-14, 15, 28, 13);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a070c';
    ctx.beginPath(); ctx.ellipse(-9, -2, 6, 7.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -2, 6, 7.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 5); ctx.lineTo(-3.5, 12); ctx.lineTo(3.5, 12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6ff7c3';
    ctx.shadowColor = '#6ff7c3'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-9, -2, 2.4 + Math.sin(t * 3) * 0.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -2, 2.4 + Math.sin(t * 3 + 1) * 0.8, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(56, W * 0.105)}px Georgia`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText('NEKROMANCER', cx, cy + 10);
    const grad = ctx.createLinearGradient(0, cy - 14, 0, cy + 36);
    grad.addColorStop(0, '#f2ecd8');
    grad.addColorStop(0.55, '#c9bfa8');
    grad.addColorStop(1, '#6f6552');
    ctx.fillStyle = grad;
    ctx.fillText('NEKROMANCER', cx, cy + 10);
    ctx.font = 'italic 15px Georgia';
    ctx.fillStyle = '#8a2635';
    ctx.fillText('~ A Sanctuary of the Dead ~', cx, cy + 46);

    const bw = Math.min(260, W * 0.7);
    let by = H * 0.56;
    if (Hero.exists()) {
      UI.btn(ctx, cx - bw / 2, by, bw, 46,
        `CONTINUE  ·  Level ${Hero.level}`, () => Game.toCamp(), { size: 16, border: '#57b894', color: '#6ff7c3' });
      by += 58;
      UI.btn(ctx, cx - bw / 2, by, bw, 40, 'NEW NEKROMANCER', () => { UI.sel.confirmNew = true; }, { size: 13 });
      if (UI.sel.confirmNew) {
        UI.btn(ctx, cx - bw / 2, by + 48, bw, 36, 'Erase old hero and begin anew?', () => {
          Hero.wipe();
          Game.toCamp();
        }, { size: 12, border: '#c22843', color: '#e04a5a' });
      }
    } else {
      UI.btn(ctx, cx - bw / 2, by, bw, 46, 'BEGIN', () => Game.toCamp(), { size: 17, border: '#57b894', color: '#6ff7c3' });
    }
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.textAlign = 'center';
    ctx.fillText('Left thumb: move · Right thumb: aim & cast · Tap portrait: gear', cx, H - 30);
    ctx.fillText('Keys: WASD + Space/1-5 · Q potion · I gear · K skills · Esc menu', cx, H - 14);
  },

  // --------------------------------------------------------------- camp

  camp(ctx, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText("SURVIVOR'S CAMP", W / 2, 34);

    // Hero summary strip.
    const pw = Math.min(560, W - 24);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 56, pw, 66);
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('Level ' + Hero.level + ' Nekromancer', px + 16, 78);
    ctx.font = '12px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(`${Hero.gold} gold  ·  ${Hero.totalKills} slain  ·  ${Hero.gems.length} gems`, px + 16, 100);
    UI.bar(ctx, px + pw * 0.55, 70, pw * 0.4, 8, Hero.xp / XP_CURVE(Hero.level), '#8a6f2a', '#ffd76a');
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.textAlign = 'left';
    ctx.fillText(`XP ${Hero.xp} / ${XP_CURVE(Hero.level)}`, px + pw * 0.55, 92);
    ctx.fillText(
      `Parts ${Hero.mats.parts} · Dust ${Hero.mats.dust} · Crystals ${Hero.mats.crystal} · Souls ${Hero.mats.soul}`,
      px + pw * 0.55, 108);

    // Hub buttons.
    const items = [
      ['WAYPOINT MAP', () => { Game.state = 'map'; }, '#6ff7c3'],
      ['INVENTORY', () => UI.open('radial'), '#e8e0cc'],
      ['SKILLS & PASSIVES', () => UI.open('skills'), '#e8e0cc'],
      ['BLACKSMITH', () => UI.open('smith'), '#ffb43a'],
      ['JEWELER', () => UI.open('jeweler'), '#b06adf'],
      ['MYSTIC', () => UI.open('mystic'), '#4ecbe0']
    ];
    const cols = W > 560 ? 2 : 1;
    const bw = cols === 2 ? (pw - 12) / 2 : pw;
    items.forEach(([label, cb, col], i) => {
      const cx2 = px + (i % cols) * (bw + 12);
      const cy2 = 138 + Math.floor(i / cols) * 56;
      UI.btn(ctx, cx2, cy2, bw, 46, label, cb, { size: 15, color: col, border: i === 0 ? '#57b894' : undefined });
    });

    ctx.font = '11px Georgia';
    ctx.fillStyle = '#544d44';
    ctx.textAlign = 'center';
    ctx.fillText('Progress: ' + Hero.zonesCleared + ' / ' + ZONES.length + ' lands cleared', W / 2, H - 16);
  },

  // ---------------------------------------------------------------- map

  map(ctx, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('WAYPOINTS OF SANCTUARY', W / 2, 30);

    // Difficulty stepper.
    const maxDiff = Math.min(DIFFICULTIES.length - 1, Hero.zonesCleared >= ZONES.length ? DIFFICULTIES.length - 1 : 3);
    const dw = Math.min(340, W - 24);
    const dx = W / 2 - dw / 2;
    UI.btn(ctx, dx, 50, 44, 36, '◀', () => {
      Hero.difficulty = Math.max(0, Hero.difficulty - 1);
      Hero.save();
    }, { size: 15 });
    UI.btn(ctx, dx + dw - 44, 50, 44, 36, '▶', () => {
      Hero.difficulty = Math.min(maxDiff, Hero.difficulty + 1);
      Hero.save();
    }, { size: 15 });
    ctx.fillStyle = Hero.difficulty >= 4 ? '#e04a5a' : '#ffd76a';
    ctx.font = 'bold 16px Georgia';
    ctx.fillText(DIFFICULTIES[Hero.difficulty].name, W / 2, 68);
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(`monsters ×${DIFFICULTIES[Hero.difficulty].mult}  ·  rewards ×${DIFFICULTIES[Hero.difficulty].reward}`, W / 2, 84);

    const pw = Math.min(560, W - 24);
    const px = W / 2 - pw / 2;
    ZONES.forEach((z, i) => {
      const y = 100 + i * 58;
      const locked = i > Hero.zonesCleared;
      UI.btn(ctx, px, y, pw, 50, '', locked ? null : () => Game.startZone(i), {
        disabled: locked,
        border: i === Math.min(Hero.zonesCleared, ZONES.length - 1) ? '#57b894' : undefined
      });
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = locked ? '#5c5569' : '#e8e0cc';
      ctx.fillText((locked ? '🔒  ' : '') + z.name, px + 14, y + 17);
      ctx.font = '11px Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#9a9080';
      ctx.fillText(locked ? 'Clear the previous land to unlock' : z.desc, px + 14, y + 35);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#ffb43a';
      ctx.fillText(z.kind === 'dungeon' ? 'CRYPT' : 'WILDS', px + pw - 12, y + 17);
      ctx.fillStyle = locked ? '#453f52' : '#c9bfa8';
      ctx.fillText('lvl ' + (z.mLvl + Hero.difficulty * 6), px + pw - 12, y + 35);
    });

    UI.btn(ctx, px, 100 + ZONES.length * 58 + 6, pw, 40, '← BACK TO CAMP', () => { Game.state = 'camp'; }, { size: 13 });
  },

  // ------------------------------------------------- radial inventory

  slotGlyph(ctx, slot, x, y, r) {
    ctx.strokeStyle = '#c9bfa8';
    ctx.fillStyle = '#c9bfa8';
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    ctx.lineCap = 'round';
    switch (slot) {
      case 'weapon':
        ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.4); ctx.lineTo(x + r * 0.35, y - r * 0.35); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.28, 0.3, 2.2); ctx.stroke();
        break;
      case 'offhand':
        ctx.beginPath(); ctx.arc(x, y - r * 0.05, r * 0.32, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.27); ctx.lineTo(x, y + r * 0.5); ctx.stroke();
        break;
      case 'helm':
        ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.4, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.4, y + r * 0.1); ctx.lineTo(x + r * 0.4, y + r * 0.1); ctx.stroke();
        break;
      case 'chest':
        ctx.beginPath();
        ctx.moveTo(x - r * 0.35, y - r * 0.35); ctx.lineTo(x + r * 0.35, y - r * 0.35);
        ctx.lineTo(x + r * 0.25, y + r * 0.4); ctx.lineTo(x - r * 0.25, y + r * 0.4);
        ctx.closePath(); ctx.stroke();
        break;
      case 'gloves':
        ctx.beginPath(); ctx.moveTo(x - r * 0.25, y + r * 0.4); ctx.lineTo(x - r * 0.25, y - r * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.4); ctx.lineTo(x, y - r * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + r * 0.25, y + r * 0.4); ctx.lineTo(x + r * 0.25, y - r * 0.1); ctx.stroke();
        break;
      case 'boots':
        ctx.beginPath();
        ctx.moveTo(x - r * 0.15, y - r * 0.4); ctx.lineTo(x - r * 0.15, y + r * 0.2);
        ctx.lineTo(x + r * 0.4, y + r * 0.35);
        ctx.stroke();
        break;
      case 'amulet':
        ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 0.32, 0.5, Math.PI - 0.5, true); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - r * 0.15, y + r * 0.3); ctx.lineTo(x + r * 0.15, y + r * 0.3);
        ctx.closePath(); ctx.fill();
        break;
      default: // rings
        ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.3, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r * 0.12, y - r * 0.25); ctx.lineTo(x, y - r * 0.45); ctx.lineTo(x + r * 0.12, y - r * 0.25);
        ctx.closePath(); ctx.fill();
    }
  },

  radial(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const p = Game.player;
    const slots = Object.keys(ITEM_SLOTS);
    if (!UI.sel.slot) UI.sel.slot = 'weapon';

    const narrow = W < 620;
    const cx = narrow ? W / 2 : W * 0.26;
    const cy = narrow ? 168 : H * 0.5;
    const R = narrow ? Math.min(112, W * 0.36) : Math.min(150, H * 0.32);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('EQUIPMENT', cx, cy - R - 34);

    // Character summary in the wheel's hub.
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#6ff7c3';
    if (p) {
      ctx.fillText('DMG ×' + p.dmgMult.toFixed(2), cx, cy - 16);
      ctx.fillStyle = '#e04a5a';
      ctx.fillText('LIFE ' + p.maxHp, cx, cy);
      ctx.fillStyle = '#ffb43a';
      ctx.fillText('CRIT ' + Math.round(p.critChance * 100) + '%', cx, cy + 16);
    }

    // The wheel.
    slots.forEach((slot, i) => {
      const a = -Math.PI / 2 + i * TAU / slots.length;
      const bx = cx + Math.cos(a) * R;
      const by = cy + Math.sin(a) * R;
      const it = Hero.equipped[slot];
      const selected = UI.sel.slot === slot;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, by, 25, 0, TAU); ctx.fill();
      ctx.strokeStyle = it ? RARITIES[it.rarity].color : '#3a3448';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath(); ctx.arc(bx, by, 25, 0, TAU); ctx.stroke();
      this.slotGlyph(ctx, slot, bx, by, 22);
      if (it && it.gem) {
        ctx.fillStyle = GEM_TYPES[it.gem.type].color;
        ctx.beginPath(); ctx.arc(bx + 17, by - 17, 4.5, 0, TAU); ctx.fill();
      }
      UI.register(bx - 27, by - 27, 54, 54, () => {
        UI.sel.slot = slot;
        UI.sel.item = null;
        UI.sel.gemPick = false;
      });
    });

    // Detail column.
    const dx = narrow ? 12 : W * 0.48;
    const dw = narrow ? W - 24 : W * 0.48;
    let dy = narrow ? cy + R + 44 : 54;
    const slot = UI.sel.slot;
    const equipped = Hero.equipped[slot];

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(ITEM_SLOTS[slot].label.toUpperCase() + ' — EQUIPPED', dx, dy);
    dy += 10;
    dy = this.itemCard(ctx, dx, dy, dw, equipped, null, false);

    // Bag items for this slot, with compare arrows.
    const bagItems = Hero.bag.filter(it => it.slot === slot);
    ctx.font = 'bold 13px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('IN BAG (' + bagItems.length + ')', dx, dy + 14);
    dy += 24;
    const maxRows = Math.max(1, Math.floor((H - dy - 20) / 34) - (UI.sel.item ? 4 : 0));
    bagItems.slice(0, maxRows).forEach(it => {
      const selected = UI.sel.item === it;
      UI.btn(ctx, dx, dy, dw, 30, '', () => {
        UI.sel.item = (UI.sel.item === it ? null : it);
        UI.sel.gemPick = false;
      }, { bg: selected ? 'rgba(60,52,78,0.95)' : 'rgba(28,24,38,0.92)' });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = RARITIES[it.rarity].color;
      ctx.fillText(it.name, dx + 10, dy + 15);
      const arrows = Items.compareArrows(it, equipped);
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = arrows > 0 ? '#4ade80' : arrows < 0 ? '#e04a5a' : '#9a9080';
      ctx.fillText(arrows > 0 ? '▲'.repeat(arrows) : arrows < 0 ? '▼'.repeat(-arrows) : '—', dx + dw - 10, dy + 15);
      dy += 34;
    });
    if (bagItems.length > maxRows) {
      ctx.textAlign = 'left';
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#6f6552';
      ctx.fillText('+' + (bagItems.length - maxRows) + ' more…', dx, dy + 8);
      dy += 18;
    }

    // Selected bag item: card + actions.
    if (UI.sel.item && !UI.sel.gemPick) {
      dy += 6;
      dy = this.itemCard(ctx, dx, dy, dw, UI.sel.item, equipped, true);
      const bw = (dw - 16) / 3;
      UI.btn(ctx, dx, dy, bw, 34, 'EQUIP', () => {
        Items.equip(UI.sel.item);
        UI.sel.item = null;
      }, { border: '#57b894', color: '#6ff7c3', size: 13 });
      UI.btn(ctx, dx + bw + 8, dy, bw, 34, 'SALVAGE', () => {
        Items.salvage(UI.sel.item);
        UI.sel.item = null;
      }, { border: '#8a6f4a', color: '#ffb43a', size: 13 });
      const canSocket = UI.sel.item.sockets && Hero.gems.length;
      UI.btn(ctx, dx + (bw + 8) * 2, dy, bw, 34, 'SOCKET', canSocket ? () => { UI.sel.gemPick = true; } : null,
        { disabled: !canSocket, border: '#7a4a8f', color: '#b06adf', size: 13 });
    } else if (!UI.sel.item && equipped) {
      // Actions on the equipped piece.
      const canSocket = equipped.sockets && Hero.gems.length;
      if (canSocket && !UI.sel.gemPick) {
        UI.btn(ctx, dx, dy + 6, 130, 30, 'SOCKET GEM', () => { UI.sel.gemPick = true; UI.sel.item = null; },
          { border: '#7a4a8f', color: '#b06adf', size: 12 });
      }
      if (equipped.gem && !UI.sel.gemPick) {
        UI.btn(ctx, dx + 140, dy + 6, 130, 30, 'REMOVE GEM', () => Items.unsocket(equipped), { size: 12 });
      }
    }

    // Gem picker for socketing.
    if (UI.sel.gemPick) {
      const target = UI.sel.item || equipped;
      dy += 6;
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = '#b06adf';
      ctx.fillText('CHOOSE A GEM:', dx, dy + 8);
      dy += 18;
      Hero.gems.slice(0, 8).forEach((g, gi) => {
        const gx = dx + (gi % 4) * (dw / 4);
        const gy = dy + Math.floor(gi / 4) * 34;
        UI.btn(ctx, gx, gy, dw / 4 - 6, 30, gemName(g), () => {
          Items.socketGem(target, Hero.gems.indexOf(g));
          UI.sel.gemPick = false;
        }, { size: 10, color: GEM_TYPES[g.type].color });
      });
    }
  },

  // An item stat card. Returns the y below the card.
  itemCard(ctx, x, y, w, item, compareTo, compact) {
    if (!item) {
      ctx.fillStyle = 'rgba(20,17,28,0.9)';
      rr(ctx, x, y, w, 34, 6); ctx.fill();
      ctx.textAlign = 'left';
      ctx.font = 'italic 12px Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('— nothing equipped —', x + 12, y + 18);
      return y + 42;
    }
    const lines = Items.statLines(item);
    const h = 30 + lines.length * 15;
    ctx.fillStyle = 'rgba(20,17,28,0.94)';
    rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = RARITIES[item.rarity].color;
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 6); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia';
    ctx.fillStyle = RARITIES[item.rarity].color;
    ctx.fillText(item.name, x + 12, y + 15);
    ctx.textAlign = 'right';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(RARITIES[item.rarity].name + ' · lvl ' + item.mLvl, x + w - 10, y + 15);
    ctx.textAlign = 'left';
    ctx.font = '12px Georgia';
    lines.forEach((ln, i) => {
      ctx.fillStyle = ln.startsWith('◆') ? GEM_TYPES[item.gem.type].color : '#b5ab94';
      ctx.fillText(ln, x + 16, y + 32 + i * 15);
    });
    return y + h + 8;
  },

  // ------------------------------------------------------ skills screen

  skills(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    if (!UI.sel.tab) UI.sel.tab = 'actives';
    if (UI.sel.slotIdx === undefined) UI.sel.slotIdx = 0;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('SKILLS OF RATHMA', W / 2, 22);

    const pw = Math.min(600, W - 16);
    const px = W / 2 - pw / 2;
    UI.btn(ctx, px, 40, pw / 2 - 4, 32, 'ACTIVES', () => { UI.sel.tab = 'actives'; UI.sel.info = null; },
      { bg: UI.sel.tab === 'actives' ? 'rgba(60,52,78,0.95)' : undefined, size: 13 });
    UI.btn(ctx, px + pw / 2 + 4, 40, pw / 2 - 4, 32, 'PASSIVES', () => { UI.sel.tab = 'passives'; UI.sel.info = null; },
      { bg: UI.sel.tab === 'passives' ? 'rgba(60,52,78,0.95)' : undefined, size: 13 });

    if (UI.sel.tab === 'actives') this.skillsActives(ctx, W, H, px, pw);
    else this.skillsPassives(ctx, W, H, px, pw);

    // Info footer.
    if (UI.sel.info) {
      const s = UI.sel.info;
      const fy = H - 74;
      UI.panel(ctx, px, fy, pw, 64);
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = s.cat ? SKILL_CATS[s.cat].color : '#b06adf';
      ctx.fillText(s.name + (s.cat ? '  ·  ' + SKILL_CATS[s.cat].name : '  ·  Passive'), px + 12, fy + 18);
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#b5ab94';
      const desc = s.cat ? SKILL_DESCS[s.id] : s.desc;
      ctx.fillText(desc, px + 12, fy + 36);
      ctx.fillStyle = '#6f6552';
      ctx.font = '11px Georgia';
      ctx.fillText(
        s.cat ? `unlocks at level ${s.lvl}${s.cost ? ' · ' + s.cost + ' essence' : ''}${s.cd >= 2 ? ' · ' + s.cd + 's cooldown' : ''}` : `unlocks at level ${s.lvl}`,
        px + 12, fy + 52);
    }
  },

  skillsActives(ctx, W, H, px, pw) {
    // Loadout slots.
    const sy = 96;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('LOADOUT — tap a slot, then a skill', px, sy - 14);
    const sw = pw / 6;
    for (let i = 0; i < 6; i++) {
      const bx = px + i * sw + sw / 2;
      const selected = UI.sel.slotIdx === i;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, sy + 20, 23, 0, TAU); ctx.fill();
      ctx.strokeStyle = selected ? '#6ff7c3' : '#3a3448';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath(); ctx.arc(bx, sy + 20, 23, 0, TAU); ctx.stroke();
      const id = Hero.loadout[i];
      if (id) SKILL_ICONS[id](ctx, bx, sy + 20, 20);
      else {
        ctx.fillStyle = '#3a3448';
        ctx.font = '20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('+', bx, sy + 21);
      }
      ctx.fillStyle = '#6f6552';
      ctx.font = '9px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'PRIMARY' : 'SKILL ' + i, bx, sy + 50);
      UI.register(bx - 25, sy - 5, 50, 62, () => { UI.sel.slotIdx = i; });
    }

    // All skills grid.
    const gy = sy + 66;
    const cols = Math.min(7, Math.floor(pw / 64));
    const cell = pw / cols;
    SKILL_DATA.forEach((s, i) => {
      const gx = px + (i % cols) * cell + cell / 2;
      const gyy = gy + Math.floor(i / cols) * 64 + 22;
      const locked = s.lvl > Hero.level;
      const inSlot = Hero.loadout.indexOf(s.id);
      ctx.globalAlpha = locked ? 0.32 : 1;
      ctx.fillStyle = '#16121d';
      ctx.beginPath(); ctx.arc(gx, gyy, 21, 0, TAU); ctx.fill();
      ctx.strokeStyle = inSlot >= 0 ? '#6ff7c3' : SKILL_CATS[s.cat].color;
      ctx.lineWidth = inSlot >= 0 ? 2.5 : 1.5;
      ctx.globalAlpha = locked ? 0.32 : (inSlot >= 0 ? 1 : 0.7);
      ctx.beginPath(); ctx.arc(gx, gyy, 21, 0, TAU); ctx.stroke();
      ctx.globalAlpha = locked ? 0.32 : 1;
      SKILL_ICONS[s.id](ctx, gx, gyy, 18);
      ctx.globalAlpha = 1;
      if (locked) {
        ctx.fillStyle = '#9a9080';
        ctx.font = 'bold 10px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(s.lvl, gx + 14, gyy + 14);
      }
      UI.register(gx - 23, gyy - 23, 46, 46, () => {
        UI.sel.info = s;
        if (locked) return;
        const slot = UI.sel.slotIdx;
        const existing = Hero.loadout.indexOf(s.id);
        if (existing === slot) {
          Hero.loadout[slot] = null;      // tap again to clear
        } else {
          if (existing >= 0) Hero.loadout[existing] = Hero.loadout[slot];
          Hero.loadout[slot] = s.id;
        }
        Hero.sanitize();
        Hero.save();
      });
    });
  },

  skillsPassives(ctx, W, H, px, pw) {
    const sy = 96;
    const nSlots = Hero.passiveSlots();
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(`PASSIVE SLOTS (${nSlots} unlocked)`, px, sy - 14);
    const sw = pw / 4;
    for (let i = 0; i < 4; i++) {
      const bx = px + i * sw + sw / 2;
      const locked = i >= nSlots;
      const selected = UI.sel.slotIdx === i && !locked;
      ctx.globalAlpha = locked ? 0.35 : 1;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, sy + 20, 23, 0, TAU); ctx.fill();
      ctx.strokeStyle = selected ? '#b06adf' : '#3a3448';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath(); ctx.arc(bx, sy + 20, 23, 0, TAU); ctx.stroke();
      const id = Hero.passives[i];
      ctx.textAlign = 'center';
      if (locked) {
        ctx.fillStyle = '#5c5569';
        ctx.font = '10px Georgia';
        ctx.fillText('lvl ' + PASSIVE_SLOT_LEVELS[i], bx, sy + 21);
      } else if (id) {
        const pd = PASSIVE_DATA.find(x => x.id === id);
        ctx.fillStyle = '#b06adf';
        ctx.font = 'bold 9px Georgia';
        const words = pd.name.split(' ');
        words.forEach((wd, wi) => ctx.fillText(wd, bx, sy + 14 + wi * 11));
      } else {
        ctx.fillStyle = '#3a3448';
        ctx.font = '20px Georgia';
        ctx.fillText('+', bx, sy + 21);
      }
      ctx.globalAlpha = 1;
      if (!locked) UI.register(bx - 25, sy - 5, 50, 52, () => { UI.sel.slotIdx = i; });
    }

    const gy = sy + 62;
    PASSIVE_DATA.forEach((s, i) => {
      const y = gy + i * 30;
      if (y > H - 90) return;
      const locked = s.lvl > Hero.level;
      const active = Hero.passives.includes(s.id);
      UI.btn(ctx, px, y, pw, 26, '', locked ? null : () => {
        UI.sel.info = s;
        const slot = clamp(UI.sel.slotIdx, 0, Math.max(0, nSlots - 1));
        const existing = Hero.passives.indexOf(s.id);
        if (existing === slot) Hero.passives[slot] = null;
        else {
          if (existing >= 0) Hero.passives[existing] = Hero.passives[slot];
          Hero.passives[slot] = s.id;
        }
        Hero.save();
        Items.apply();
      }, {
        disabled: locked,
        bg: active ? 'rgba(70,44,90,0.85)' : undefined
      });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = locked ? '#5c5569' : (active ? '#d8b4f0' : '#c9bfa8');
      ctx.fillText(s.name + (locked ? '  (lvl ' + s.lvl + ')' : ''), px + 10, y + 13);
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#8a8070';
      const dsc = s.desc.length > 52 && W < 560 ? s.desc.slice(0, 50) + '…' : s.desc;
      ctx.fillText(dsc, px + pw - 10, y + 13);
    });
  },

  // ----------------------------------------------------------- artisans

  matsRow(ctx, x, y, w) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    let cx = x;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', cx, y);
    cx += w * 0.22;
    for (const [key, m] of Object.entries(MATERIALS)) {
      ctx.fillStyle = m.color;
      ctx.fillText(Hero.mats[key] + ' ' + m.name.split(' ')[0], cx, y);
      cx += w * 0.19;
    }
  },

  smith(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 66, 430), 'HAEDRIG — BLACKSMITH');
    this.matsRow(ctx, px + 16, 102, pw);

    UI.btn(ctx, px + 16, 118, pw - 32, 38, 'SALVAGE ALL COMMON & MAGIC IN BAG', () => Items.salvageJunk(),
      { size: 13, border: '#8a6f4a', color: '#ffb43a' });

    const cost = Items.craftCost();
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('FORGE A NEW PIECE', px + 16, 178);
    ctx.font = '11px Georgia';
    ctx.fillStyle = Items.canAfford(cost) ? '#c9bfa8' : '#8a5a5a';
    ctx.fillText(`cost: ${cost.gold} gold · ${cost.parts} parts · ${cost.dust} dust${cost.crystal ? ' · ' + cost.crystal + ' crystal' : ''}`, px + 16, 194);

    const slots = Object.keys(ITEM_SLOTS);
    const cols = 3;
    const bw = (pw - 32 - (cols - 1) * 8) / cols;
    slots.forEach((slot, i) => {
      const bx = px + 16 + (i % cols) * (bw + 8);
      const by = 206 + Math.floor(i / cols) * 44;
      UI.btn(ctx, bx, by, bw, 36, ITEM_SLOTS[slot].label, () => Items.craft(slot),
        { size: 12, disabled: !Items.canAfford(cost) });
    });

    ctx.textAlign = 'center';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Salvage single items from the Inventory wheel. Gems survive the forge.', px + pw / 2, 206 + 3 * 44 + 16);
  },

  jeweler(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 66, 440), 'COVETOUS SHEN — JEWELER');
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', px + 16, 100);
    ctx.fillStyle = '#9a9080';
    ctx.fillText('Combine 3 matching gems into a finer one. Socket them from the Inventory wheel.', px + 16, 118);

    // Group gems.
    const groups = {};
    for (const g of Hero.gems) {
      const key = g.type + ':' + g.tier;
      groups[key] = (groups[key] || 0) + 1;
    }
    const keys = Object.keys(groups).sort();
    if (!keys.length) {
      ctx.font = 'italic 13px Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('No gems yet — monsters and chests drop them.', px + 16, 150);
      return;
    }
    let y = 134;
    keys.forEach(key => {
      if (y > H - 80) return;
      const [type, tierS] = key.split(':');
      const tier = +tierS;
      const n = groups[key];
      const gm = GEM_TYPES[type];
      const canCombine = n >= 3 && tier < GEM_TIERS.length - 1;
      const combineCost = 500 * (tier + 1);
      UI.btn(ctx, px + 16, y, pw - 32, 34, '', canCombine ? () => Items.combineGems(type, tier) : null,
        { disabled: !canCombine });
      // Gem chip.
      ctx.fillStyle = gm.color;
      ctx.save();
      ctx.translate(px + 34, y + 17);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText(`${GEM_TIERS[tier]} ${gm.name}  ×${n}`, px + 50, y + 13);
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.fillText(gm.label(gm.perTier * (tier + 1)), px + 50, y + 26);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = canCombine ? '#4ade80' : '#453f52';
      ctx.fillText(tier >= GEM_TIERS.length - 1 ? 'MAX' : `COMBINE 3 → 1  (${combineCost}g)`, px + pw - 26, y + 17);
      y += 40;
    });
  },

  mystic(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 66, 460), 'MYRIAM — MYSTIC');
    ctx.textAlign = 'left';
    ctx.font = '12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('Enchanting rerolls one random affix on an equipped item.', px + 16, 100);

    let y = 116;
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (y > H - 100) break;
      const selected = UI.sel.item === it && it;
      UI.btn(ctx, px + 16, y, pw - 32, 30, '', it ? () => { UI.sel.item = selected ? null : it; } : null,
        { disabled: !it, bg: selected ? 'rgba(60,52,78,0.95)' : undefined });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = it ? RARITIES[it.rarity].color : '#453f52';
      ctx.fillText(ITEM_SLOTS[slot].label + ':  ' + (it ? it.name : '—'), px + 26, y + 15);
      y += 34;
    }

    if (UI.sel.item) {
      const it = UI.sel.item;
      const cost = Items.enchantCost(it);
      y += 4;
      y = this.itemCard(ctx, px + 16, y, pw - 32, it, null, true);
      const afford = Items.canAfford(cost);
      UI.btn(ctx, px + 16, y, pw - 32, 36,
        `ENCHANT — ${cost.gold}g · ${cost.dust} dust${cost.crystal ? ' · ' + cost.crystal + ' crystals' : ''}${cost.soul ? ' · ' + cost.soul + ' soul' : ''}`,
        afford ? () => Items.enchant(it) : null,
        { size: 12, disabled: !afford, border: '#7a4a8f', color: '#b06adf' });
    }
  },

  // ------------------------------------------------------ pause / death

  pause(ctx, W, H) {
    this.dim(ctx, W, H);
    const bw = Math.min(280, W * 0.72);
    const cx = W / 2 - bw / 2;
    let y = H * 0.24;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(Game.zone ? Game.zone.name : 'PAUSED', W / 2, y - 24);
    UI.btn(ctx, cx, y, bw, 44, 'RESUME', () => UI.close(), { size: 15, border: '#57b894', color: '#6ff7c3' });
    y += 54;
    UI.btn(ctx, cx, y, bw, 40, 'INVENTORY', () => UI.open('radial'), { size: 13 });
    y += 50;
    UI.btn(ctx, cx, y, bw, 40, 'SKILLS & PASSIVES', () => UI.open('skills'), { size: 13 });
    y += 50;
    UI.btn(ctx, cx, y, bw, 40, 'ABANDON BOUNTY → CAMP', () => Game.toCamp(), { size: 13, border: '#8a4550', color: '#e04a5a' });
  },

  death(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,3,6,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.36;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(44, W * 0.085)}px Georgia`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText('YOU HAVE FALLEN', cx, cy);
    ctx.fillStyle = '#c22843';
    ctx.fillText('YOU HAVE FALLEN', cx, cy);
    ctx.font = '14px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('The dead reclaim their own... but Rathma\'s work is not done.', cx, cy + 36);
    if (Game.playerDeadT > 1) {
      const bw = Math.min(250, W * 0.6);
      UI.btn(ctx, cx - bw / 2, cy + 66, bw, 42, 'RISE AT THE ENTRANCE', () => Game.respawn(),
        { size: 13, border: '#57b894', color: '#6ff7c3' });
      UI.btn(ctx, cx - bw / 2, cy + 118, bw, 38, 'RETURN TO CAMP', () => Game.toCamp(), { size: 13 });
    }
  },

  reward(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(420, W - 30);
    const px = W / 2 - pw / 2;
    const ph = 210 + (Game.rewardLines ? Game.rewardLines.length * 20 : 0);
    const py = H / 2 - ph / 2;
    UI.panel(ctx, px, py, pw, ph, 'BOUNTY COMPLETE');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px Georgia';
    ctx.fillStyle = '#ffb43a';
    ctx.fillText(Game.zone.boss + '  slain', W / 2, py + 60);
    ctx.font = '13px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Horadric cache:', W / 2, py + 86);
    (Game.rewardLines || []).forEach((ln, i) => {
      ctx.fillStyle = ln[1];
      ctx.font = 'bold 13px Georgia';
      ctx.fillText(ln[0], W / 2, py + 110 + i * 20);
    });
    const by = py + ph - 56;
    UI.btn(ctx, px + 20, by, pw - 40, 42, 'RETURN TO CAMP', () => Game.toCamp(),
      { size: 14, border: '#57b894', color: '#6ff7c3' });
  }
};
