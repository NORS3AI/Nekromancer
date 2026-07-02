'use strict';
// ---------------------------------------------------------------------------
// Full-screen menus: title, camp hub, waypoint map, the console-style radial
// equipment wheel, skills & passives, Blacksmith, Jeweler, Mystic, pause,
// death and the bounty reward screen. All input goes through UI's tap
// registry, so everything is one-thumb friendly.
// ---------------------------------------------------------------------------

const Screens = {

  // Truncate a string so it fits maxW at the current ctx font.
  fitText(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = String(text);
    while (t.length > 2 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  },

  draw(ctx, W, H) {
    switch (UI.screen) {
      case 'radial': this.radial(ctx, W, H); break;
      case 'skills': this.skills(ctx, W, H); break;
      case 'smith': this.smith(ctx, W, H); break;
      case 'jeweler': this.jeweler(ctx, W, H); break;
      case 'mystic': this.mystic(ctx, W, H); break;
      case 'pause': this.pause(ctx, W, H); break;
      case 'reward': this.reward(ctx, W, H); break;
      case 'character': this.character(ctx, W, H); break;
      case 'vendor': this.vendor(ctx, W, H); break;
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

    // Hero summary strip — tap it for the full character sheet.
    const narrow = W < 560;
    const pw = Math.min(560, W - 24);
    const px = W / 2 - pw / 2;
    const panelH = narrow ? 92 : 66;
    UI.panel(ctx, px, 56, pw, panelH);
    UI.register(px, 56, pw, panelH, () => UI.open('character'));
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('Level ' + Hero.level + ' Nekromancer', px + 14, 76);
    ctx.font = '12px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(`${Hero.gold} gold  ·  ${Hero.totalKills} slain  ·  ${Hero.gems.length} gems`, px + 14, 96);
    if (narrow) {
      UI.bar(ctx, px + 14, 106, pw - 110, 8, Hero.xp / XP_CURVE(Hero.level), '#8a6f2a', '#ffd76a');
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('XP', px + pw - 88, 110);
    } else {
      UI.bar(ctx, px + pw * 0.55, 70, pw * 0.42, 8, Hero.xp / XP_CURVE(Hero.level), '#8a6f2a', '#ffd76a');
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText(`XP ${Hero.xp} / ${XP_CURVE(Hero.level)}`, px + pw * 0.55, 92);
    }
    ctx.textAlign = 'right';
    ctx.font = 'italic 11px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('tap for full stats ▸', px + pw - 12, 56 + panelH - 12);

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
    const rowH = cols === 1 ? Math.min(52, (H - (56 + panelH) - 46) / items.length) : 56;
    items.forEach(([label, cb, col], i) => {
      const cx2 = px + (i % cols) * (bw + 12);
      const cy2 = 56 + panelH + 16 + Math.floor(i / cols) * rowH;
      UI.btn(ctx, cx2, cy2, bw, rowH - 8, label, cb, { size: narrow ? 13 : 15, color: col, border: i === 0 ? '#57b894' : undefined });
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
      ctx.fillText(this.fitText(ctx, locked ? 'Clear the previous land to unlock' : z.desc, pw - 100), px + 14, y + 35);
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
    const maxRows = Math.max(1, Math.floor((H - dy - 20) / 34) - ((UI.sel.item || UI.sel.gemPick) ? 5 : 0));
    bagItems.slice(0, maxRows).forEach(it => {
      const selected = UI.sel.item === it;
      UI.btn(ctx, dx, dy, dw, 30, '', () => {
        UI.sel.item = (UI.sel.item === it ? null : it);
        UI.sel.gemPick = false;
      }, { bg: selected ? 'rgba(60,52,78,0.95)' : 'rgba(28,24,38,0.92)' });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = RARITIES[it.rarity].color;
      ctx.fillText(this.fitText(ctx, it.name, dw - 70), dx + 10, dy + 15);
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

    // Gem picker for socketing: tap a gem to read it, then choose.
    if (UI.sel.gemPick) {
      const target = UI.sel.item || equipped;
      dy += 6;
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = '#b06adf';
      ctx.fillText('TAP A GEM TO INSPECT IT:', dx, dy + 8);
      dy += 18;
      const shown = Hero.gems.slice(0, 8);
      shown.forEach((g, gi) => {
        const gx = dx + (gi % 4) * (dw / 4);
        const gy = dy + Math.floor(gi / 4) * 34;
        const selected = UI.sel.gemIdx === gi;
        UI.btn(ctx, gx, gy, dw / 4 - 6, 30, gemName(g), () => {
          UI.sel.gemIdx = selected ? undefined : gi;
        }, {
          size: 10, color: GEM_TYPES[g.type].color,
          bg: selected ? 'rgba(70,44,90,0.95)' : undefined,
          border: selected ? GEM_TYPES[g.type].color : undefined
        });
      });
      dy += Math.ceil(shown.length / 4) * 34 + 4;

      if (UI.sel.gemIdx !== undefined && Hero.gems[UI.sel.gemIdx]) {
        const g = Hero.gems[UI.sel.gemIdx];
        const gm = GEM_TYPES[g.type];
        const cardH = target.gem ? 62 : 48;
        ctx.fillStyle = 'rgba(20,17,28,0.94)';
        rr(ctx, dx, dy, dw, cardH, 6); ctx.fill();
        ctx.strokeStyle = gm.color;
        ctx.lineWidth = 1.5;
        rr(ctx, dx, dy, dw, cardH, 6); ctx.stroke();
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px Georgia';
        ctx.fillStyle = gm.color;
        ctx.fillText('◆ ' + gemName(g), dx + 12, dy + 16);
        ctx.font = '12px Georgia';
        ctx.fillStyle = '#b5ab94';
        ctx.fillText('When socketed: ' + gm.label(gemStatValue(g)), dx + 16, dy + 33);
        if (target.gem) {
          ctx.fillStyle = '#8a6f4a';
          ctx.font = '11px Georgia';
          ctx.fillText('Replaces ' + gemName(target.gem) + ' (returned to your pouch)', dx + 16, dy + 49);
        }
        dy += cardH + 6;
        const bw2 = (dw - 8) / 2;
        UI.btn(ctx, dx, dy, bw2, 32, 'SOCKET IT', () => {
          Items.socketGem(target, UI.sel.gemIdx);
          UI.sel.gemPick = false;
          UI.sel.gemIdx = undefined;
        }, { border: '#7a4a8f', color: '#b06adf', size: 13 });
        UI.btn(ctx, dx + bw2 + 8, dy, bw2, 32, 'CANCEL', () => {
          UI.sel.gemPick = false;
          UI.sel.gemIdx = undefined;
        }, { size: 13 });
      }
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
    ctx.fillText(this.fitText(ctx, item.name, w - 116), x + 12, y + 15);
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
      const fy = H - 84;
      UI.panel(ctx, px, fy, pw, 76);
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = s.cat ? SKILL_CATS[s.cat].color : '#b06adf';
      ctx.fillText(this.fitText(ctx, s.name + (s.cat ? '  ·  ' + SKILL_CATS[s.cat].name : '  ·  Passive'), pw - 24), px + 12, fy + 16);
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#b5ab94';
      const desc = s.cat ? SKILL_DESCS[s.id] : s.desc;
      wrapText(ctx, desc, px + 12, fy + 33, pw - 24, 14, 2);
      ctx.fillStyle = '#6f6552';
      ctx.font = '11px Georgia';
      ctx.fillText(
        this.fitText(ctx,
          s.cat ? `unlocks at level ${s.lvl}${s.cost ? ' · ' + s.cost + ' essence' : ''}${s.cd >= 2 ? ' · ' + s.cd + 's cooldown' : ''}` : `unlocks at level ${s.lvl}`,
          pw - 24),
        px + 12, fy + 65);
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

    // All skills grid — row height adapts so it never collides with the footer.
    const gy = sy + 66;
    const cols = Math.min(7, Math.floor(pw / 64));
    const cell = pw / cols;
    const rows = Math.ceil(SKILL_DATA.length / cols);
    const rowH = clamp((H - gy - 100) / rows, 42, 64);
    const iconR = Math.min(21, rowH * 0.36);
    SKILL_DATA.forEach((s, i) => {
      const gx = px + (i % cols) * cell + cell / 2;
      const gyy = gy + Math.floor(i / cols) * rowH + rowH * 0.4;
      const locked = s.lvl > Hero.level;
      const inSlot = Hero.loadout.indexOf(s.id);
      ctx.globalAlpha = locked ? 0.32 : 1;
      ctx.fillStyle = '#16121d';
      ctx.beginPath(); ctx.arc(gx, gyy, iconR, 0, TAU); ctx.fill();
      ctx.strokeStyle = inSlot >= 0 ? '#6ff7c3' : SKILL_CATS[s.cat].color;
      ctx.lineWidth = inSlot >= 0 ? 2.5 : 1.5;
      ctx.globalAlpha = locked ? 0.32 : (inSlot >= 0 ? 1 : 0.7);
      ctx.beginPath(); ctx.arc(gx, gyy, iconR, 0, TAU); ctx.stroke();
      ctx.globalAlpha = locked ? 0.32 : 1;
      SKILL_ICONS[s.id](ctx, gx, gyy, iconR * 0.86);
      ctx.globalAlpha = 1;
      if (locked) {
        ctx.fillStyle = '#9a9080';
        ctx.font = 'bold 10px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(s.lvl, gx + iconR * 0.7, gyy + iconR * 0.7);
      }
      UI.register(gx - iconR - 2, gyy - iconR - 2, iconR * 2 + 4, iconR * 2 + 4, () => {
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

    // More columns when the screen is too short for one tall list.
    const gy = sy + 62;
    const rowsFit = Math.max(3, Math.floor((H - gy - 100) / 30));
    const listCols = Math.min(3, Math.max(1, Math.ceil(PASSIVE_DATA.length / rowsFit)));
    const colW2 = (pw - (listCols - 1) * 8) / listCols;
    PASSIVE_DATA.forEach((s, i) => {
      const cx2 = px + (i % listCols) * (colW2 + 8);
      const y = gy + Math.floor(i / listCols) * 30;
      if (y > H - 96) return;
      const locked = s.lvl > Hero.level;
      const active = Hero.passives.includes(s.id);
      UI.btn(ctx, cx2, y, colW2, 26, '', locked ? null : () => {
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
      const name = s.name + (locked ? '  (lvl ' + s.lvl + ')' : '');
      ctx.fillText(this.fitText(ctx, name, colW2 - 30), cx2 + 10, y + 13);
      const nameW = ctx.measureText(name).width;
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#8a8070';
      // On phones (or multi-column mode) the description lives in the footer.
      if (W < 640 || listCols > 1) {
        ctx.fillText('›', cx2 + colW2 - 12, y + 13);
      } else {
        ctx.fillText(this.fitText(ctx, s.desc, colW2 - nameW - 40), cx2 + colW2 - 10, y + 13);
      }
    });
  },

  // ----------------------------------------------------------- artisans

  matsRow(ctx, x, y, w) {
    // Compact, measured labels that never spill off narrow phones.
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    const parts = [[Hero.gold + 'g', '#ffd76a']];
    const short = { parts: 'Parts', dust: 'Dust', crystal: 'Cryst', soul: 'Souls' };
    for (const [key, m] of Object.entries(MATERIALS)) {
      parts.push([Hero.mats[key] + ' ' + short[key], m.color]);
    }
    let cx = x;
    for (const [txt, col] of parts) {
      const tw = ctx.measureText(txt).width;
      if (cx + tw > x + w - 20) break;
      ctx.fillStyle = col;
      ctx.fillText(txt, cx, y);
      cx += tw + Math.min(18, w * 0.04);
    }
  },

  smith(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 480);
    UI.panel(ctx, px, 46, pw, ph, 'HAEDRIG — BLACKSMITH');
    this.matsRow(ctx, px + 16, 100, pw - 32);

    // Salvage row.
    const half = (pw - 40) / 2;
    UI.btn(ctx, px + 16, 112, half, 36, 'SALVAGE COMMON+MAGIC', () => Items.salvageJunk(),
      { size: 11, border: '#8a6f4a', color: '#ffb43a' });
    UI.btn(ctx, px + 24 + half, 112, half, 36, 'SALVAGE RARES', () => Items.salvageRares(),
      { size: 11, border: '#8a6f4a', color: '#ffd76a' });

    // Forge quality selector.
    if (UI.sel.master === undefined) UI.sel.master = false;
    const stdCost = Items.craftCost(false);
    const mwCost = Items.craftCost(true);
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('FORGE A NEW PIECE', px + 16, 168);
    UI.btn(ctx, px + 16, 178, half, 44, '', () => { UI.sel.master = false; },
      { bg: !UI.sel.master ? 'rgba(60,52,78,0.95)' : undefined, border: !UI.sel.master ? '#c9bfa8' : undefined });
    UI.btn(ctx, px + 24 + half, 178, half, 44, '', () => { UI.sel.master = true; },
      { bg: UI.sel.master ? 'rgba(70,54,30,0.95)' : undefined, border: UI.sel.master ? '#ffd76a' : undefined });
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('STANDARD', px + 16 + half / 2, 192);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('MASTERWORK', px + 24 + half * 1.5, 192);
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#8a8070';
    ctx.fillText(this.fitText(ctx, this.costLabel(stdCost), half - 12), px + 16 + half / 2, 207);
    ctx.fillText(this.fitText(ctx, this.costLabel(mwCost), half - 12), px + 24 + half * 1.5, 207);

    const cost = Items.craftCost(UI.sel.master);
    const afford = Items.canAfford(cost);
    ctx.font = '10px Georgia';
    ctx.fillStyle = UI.sel.master ? '#ffd76a' : '#6f6552';
    ctx.textAlign = 'left';
    ctx.fillText(UI.sel.master
      ? 'Masterwork: guaranteed Rare or better, 50% chance of a socket.'
      : 'Standard: a quick roll of the dice for the chosen slot.', px + 16, 234);

    const slots = Object.keys(ITEM_SLOTS);
    const cols = 3;
    const bw = (pw - 32 - (cols - 1) * 8) / cols;
    slots.forEach((slot, i) => {
      const bx = px + 16 + (i % cols) * (bw + 8);
      const by = 246 + Math.floor(i / cols) * 44;
      UI.btn(ctx, bx, by, bw, 36, ITEM_SLOTS[slot].label, () => Items.craft(slot, UI.sel.master),
        { size: 12, disabled: !afford, border: UI.sel.master ? '#8a6f4a' : undefined });
    });

    ctx.textAlign = 'center';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Salvage single items from the Inventory wheel. Gems survive the forge.', pw - 24), px + pw / 2, 246 + 3 * 44 + 14);
  },

  jeweler(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 470), 'COVETOUS SHEN — JEWELER');
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', px + 16, 98);
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(this.fitText(ctx, 'Combine 3 matching gems into a finer one. Socket via the Inventory wheel.', pw - 32), px + 16, 114);
    // Buy a freshly cut gem.
    const gemCost = Items.gemPrice();
    UI.btn(ctx, px + 16, 122, pw - 32, 32,
      `CUT A RANDOM GEM — ${this.costLabel(gemCost)}`,
      Items.canAfford(gemCost) ? () => Items.buyGem() : null,
      { size: 11, disabled: !Items.canAfford(gemCost), border: '#7a4a8f', color: '#b06adf' });

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
      ctx.fillText('No gems yet — monsters and chests drop them.', px + 16, 178);
      return;
    }
    let y = 164;
    const detailH = 108;
    keys.forEach(key => {
      if (y > H - 100 - (UI.sel.gemKey ? detailH : 0)) return;
      const [type, tierS] = key.split(':');
      const tier = +tierS;
      const n = groups[key];
      const gm = GEM_TYPES[type];
      const selected = UI.sel.gemKey === key;
      UI.btn(ctx, px + 16, y, pw - 32, 34, '', () => {
        UI.sel.gemKey = selected ? null : key;
      }, { bg: selected ? 'rgba(70,44,90,0.9)' : undefined, border: selected ? gm.color : undefined });
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
      ctx.fillText(`${GEM_TIERS[tier]} ${gm.name}  ×${n}`, px + 50, y + 17);
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.fillText(selected ? '▾' : 'tap to inspect', px + pw - 26, y + 17);
      y += 40;
    });

    // Detail card for the selected stack.
    if (UI.sel.gemKey && groups[UI.sel.gemKey]) {
      const [type, tierS] = UI.sel.gemKey.split(':');
      const tier = +tierS;
      const n = groups[UI.sel.gemKey];
      const gm = GEM_TYPES[type];
      const canCombine = n >= 3 && tier < GEM_TIERS.length - 1;
      const cost = 500 * (tier + 1);
      y += 4;
      ctx.fillStyle = 'rgba(20,17,28,0.94)';
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.fill();
      ctx.strokeStyle = gm.color;
      ctx.lineWidth = 1.5;
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText('◆ ' + GEM_TIERS[tier] + ' ' + gm.name, px + 28, y + 16);
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#b5ab94';
      ctx.fillText('In a socket: ' + gm.label(gm.perTier * (tier + 1)), px + 32, y + 33);
      ctx.fillStyle = tier < GEM_TIERS.length - 1 ? '#4ade80' : '#8a8070';
      ctx.fillText(
        tier < GEM_TIERS.length - 1
          ? 'Next tier: ' + gm.label(gm.perTier * (tier + 2))
          : 'This gem is already perfect.',
        px + 32, y + 50);
      y += 68;
      const halfW = (pw - 40) / 2;
      UI.btn(ctx, px + 16, y, halfW, 34,
        tier >= GEM_TIERS.length - 1 ? 'MAX TIER'
          : n < 3 ? `NEED 3 (have ${n})`
          : `COMBINE 3→1  (${cost}g)`,
        canCombine ? () => {
          Items.combineGems(type, tier);
          if ((groups[UI.sel.gemKey] || 0) <= 3) UI.sel.gemKey = null;
        } : null,
        { size: 11, disabled: !canCombine, border: '#3a7a4a', color: '#4ade80' });
      UI.btn(ctx, px + 24 + halfW, y, halfW, 34,
        'COMBINE ALL',
        canCombine && n >= 6 ? () => {
          Items.combineAllGems(type, tier);
          UI.sel.gemKey = null;
        } : null,
        { size: 11, disabled: !(canCombine && n >= 6), border: '#3a7a4a', color: '#4ade80' });
    }
  },

  costLabel(cost) {
    const bits = [cost.gold + 'g'];
    if (cost.parts) bits.push(cost.parts + ' parts');
    if (cost.dust) bits.push(cost.dust + ' dust');
    if (cost.crystal) bits.push(cost.crystal + ' crystals');
    if (cost.soul) bits.push(cost.soul + ' soul' + (cost.soul > 1 ? 's' : ''));
    return bits.join(' · ');
  },

  mystic(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 480);
    UI.panel(ctx, px, 46, pw, ph, 'MYRIAM — MYSTIC');

    // ---- pick an item ----
    if (!UI.sel.item) {
      ctx.textAlign = 'left';
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('Enchanting: choose an equipped item, then the exact', px + 16, 98);
      ctx.fillText('property to reroll. The rest of the item is untouched.', px + 16, 114);
      let y = 130;
      for (const slot of Object.keys(ITEM_SLOTS)) {
        const it = Hero.equipped[slot];
        if (y > 46 + ph - 40) break;
        UI.btn(ctx, px + 16, y, pw - 32, 30, '', it ? () => {
          UI.sel.item = it;
          UI.sel.affix = null;
        } : null, { disabled: !it });
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Georgia';
        ctx.fillStyle = it ? RARITIES[it.rarity].color : '#453f52';
        ctx.fillText(this.fitText(ctx, ITEM_SLOTS[slot].label + ':  ' + (it ? it.name : '—'), pw - 90), px + 26, y + 15);
        if (it && it.enchants) {
          ctx.textAlign = 'right';
          ctx.font = '10px Georgia';
          ctx.fillStyle = '#b06adf';
          ctx.fillText('✦ ' + it.enchants, px + pw - 26, y + 15);
        }
        y += 34;
      }
      return;
    }

    // ---- pick the affix & confirm ----
    const it = UI.sel.item;
    UI.btn(ctx, px + 16, 88, 92, 28, '‹ BACK', () => { UI.sel.item = null; UI.sel.affix = null; }, { size: 12 });
    ctx.textAlign = 'right';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText((it.enchants || 0) + ' enchant' + (it.enchants === 1 ? '' : 's') + ' so far', px + pw - 16, 102);

    let y = this.itemCard(ctx, px + 16, 124, pw - 32, it, null, true);
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#b06adf';
    ctx.fillText('CHOOSE WHICH PROPERTY TO REROLL:', px + 16, y + 8);
    y += 18;
    for (const [key, v] of Object.entries(it.stats)) {
      const selected = UI.sel.affix === key;
      UI.btn(ctx, px + 16, y, pw - 32, 30, '', () => {
        UI.sel.affix = selected ? null : key;
      }, { bg: selected ? 'rgba(70,44,90,0.95)' : undefined, border: selected ? '#b06adf' : undefined });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = selected ? '#d8b4f0' : '#b5ab94';
      ctx.fillText(AFFIX_ROLLS[key].label(v), px + 28, y + 15);
      ctx.textAlign = 'right';
      ctx.font = '11px Georgia';
      ctx.fillStyle = selected ? '#b06adf' : '#544d44';
      ctx.fillText(selected ? 'will be rerolled ✦' : 'keep', px + pw - 28, y + 15);
      y += 34;
    }

    const cost = Items.enchantCost(it);
    const afford = Items.canAfford(cost);
    y += 4;
    ctx.textAlign = 'left';
    ctx.font = '11px Georgia';
    ctx.fillStyle = afford ? '#c9bfa8' : '#8a5a5a';
    ctx.fillText('Cost: ' + this.costLabel(cost), px + 16, y + 6);
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Each enchant on this item raises the next one\'s price.', px + 16, y + 21);
    y += 32;
    UI.btn(ctx, px + 16, y, pw - 32, 38,
      !UI.sel.affix ? 'SELECT A PROPERTY ABOVE'
        : !afford ? 'NOT ENOUGH GOLD OR MATERIALS'
        : 'REROLL ' + AFFIX_ROLLS[UI.sel.affix].label(it.stats[UI.sel.affix]).toUpperCase(),
      (UI.sel.affix && afford) ? () => {
        Items.enchant(it, UI.sel.affix);
        UI.sel.affix = null;
      } : null,
      { size: 13, disabled: !UI.sel.affix || !afford, border: '#7a4a8f', color: '#b06adf' });
  },

  // ------------------------------------------------- character sheet

  character(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const s = Items.computeStats();
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const twoCol = pw >= 420;
    const ph = Math.min(H - 16, twoCol ? 470 : 620);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, `LEVEL ${Hero.level} NEKROMANCER`);
    const colW = twoCol ? (pw - 44) / 2 : pw - 32;
    const lx = px + 16;
    const rx = twoCol ? px + 28 + colW : lx;
    let ly = py + 56, ry = py + 56;

    const line = (x, yv, label, value, color = '#e8e0cc') => {
      ctx.textAlign = 'left';
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.fillText(label, x, yv);
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = color;
      ctx.fillText(value, x + colW, yv);
      return yv + 19;
    };
    const header = (x, yv, txt, color) => {
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = color;
      ctx.fillText(txt, x, yv);
      return yv + 18;
    };

    // Combat stats.
    ly = header(lx, ly, '— COMBAT —', '#6ff7c3');
    ly = line(lx, ly, 'Damage', '×' + s.dmgMult.toFixed(2), '#6ff7c3');
    ly = line(lx, ly, 'Life', s.maxHp, '#e04a5a');
    ly = line(lx, ly, 'Crit chance', Math.round(s.critChance * 100) + '%  (×1.8)', '#ffb43a');
    ly = line(lx, ly, 'Max essence', s.maxEssence, '#4ecbe0');
    ly = line(lx, ly, 'Essence regen', s.essenceRegen.toFixed(1) + '/s', '#4ecbe0');
    ly = line(lx, ly, 'Life regen', s.hpRegen.toFixed(1) + '/s', '#e04a5a');
    ly = line(lx, ly, 'Gold find', '+' + Math.round((s.goldFind - 1) * 100) + '%', '#ffd76a');
    ly += 6;
    ly = header(lx, ly, '— JOURNEY —', '#b06adf');
    ly = line(lx, ly, 'XP', `${Hero.xp} / ${XP_CURVE(Hero.level)}`);
    ly = line(lx, ly, 'Lands cleared', Hero.zonesCleared + ' / ' + ZONES.length);
    ly = line(lx, ly, 'Difficulty', DIFFICULTIES[Hero.difficulty].name);
    ly = line(lx, ly, 'Monsters slain', Hero.totalKills);
    if (!twoCol) ry = ly + 6; // stack columns on narrow screens

    // Reagents & holdings.
    ry = header(rx, ry, '— HOLDINGS —', '#ffd76a');
    ry = line(rx, ry, 'Gold', Hero.gold, '#ffd76a');
    for (const [key, m] of Object.entries(MATERIALS)) {
      ry = line(rx, ry, m.name, Hero.mats[key], m.color);
    }
    ry = line(rx, ry, 'Gems in pouch', Hero.gems.length, '#b06adf');
    ry = line(rx, ry, 'Bag', Hero.bag.length + ' / ' + Hero.BAG_SIZE);
    ry += 6;

    // Analysis.
    ry = header(rx, ry, '— ANALYSIS —', '#e04a5a');
    ctx.textAlign = 'left';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#b5ab94';
    for (const tip of this.analyze(s)) {
      if (ry > py + ph - 18) break;
      ry = wrapText(ctx, '• ' + tip, rx, ry, colW, 14, 2) + 3;
    }
  },

  analyze(s) {
    const tips = [];
    const empty = Object.keys(ITEM_SLOTS).filter(sl => !Hero.equipped[sl]);
    if (empty.length) tips.push('Empty gear: ' + empty.slice(0, 3).map(sl => ITEM_SLOTS[sl].label).join(', ') + (empty.length > 3 ? '…' : ''));
    let openSockets = 0, worst = null;
    for (const sl of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[sl];
      if (!it) continue;
      if (it.sockets && !it.gem) openSockets++;
      if (!worst || Items.score(it) < Items.score(worst)) worst = it;
    }
    if (openSockets) tips.push(openSockets + ' empty socket' + (openSockets > 1 ? 's' : '') + ' — visit the Inventory to add gems');
    if (worst) tips.push('Weakest piece: ' + worst.name + ' (' + ITEM_SLOTS[worst.slot].label + ') — enchant or replace it');
    const freeSlots = Hero.loadout.filter((id, i) => !id && i < 6).length;
    if (freeSlots) tips.push(freeSlots + ' empty skill slot' + (freeSlots > 1 ? 's' : '') + ' in your loadout');
    const pSlots = Hero.passiveSlots();
    const unset = Hero.passives.slice(0, pSlots).filter(p => !p).length;
    if (unset) tips.push(unset + ' passive slot' + (unset > 1 ? 's' : '') + ' unassigned');
    // Combinable gems?
    const groups = {};
    for (const g of Hero.gems) {
      const key = g.type + ':' + g.tier;
      groups[key] = (groups[key] || 0) + 1;
    }
    for (const [key, n] of Object.entries(groups)) {
      const [type, tier] = key.split(':');
      if (n >= 3 && +tier < GEM_TIERS.length - 1) {
        tips.push('The Jeweler can combine your ' + GEM_TIERS[+tier] + ' ' + GEM_TYPES[type].name + 's');
        break;
      }
    }
    if (Hero.bag.length >= Hero.BAG_SIZE - 4) tips.push('Bag nearly full — salvage at the Blacksmith');
    if (Hero.zonesCleared >= ZONES.length && Hero.difficulty < DIFFICULTIES.length - 1) {
      tips.push('You can raise the difficulty for richer rewards');
    }
    if (!tips.length) tips.push('Your build is battle-ready. Sanctuary awaits.');
    return tips;
  },

  // ------------------------------------------------- wandering vendor

  vendor(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const o = UI.sel.vendor;
    if (!o) { UI.close(); return; }
    const pw = Math.min(540, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 20, 96 + o.stock.length * 40 + (UI.sel.buy ? 140 : 40));
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'WANDERING MERCHANT');
    ctx.textAlign = 'left';
    ctx.font = 'italic 11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('"Fine wares! Mostly. No refunds."', px + 16, py + 52);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', px + pw - 16, py + 52);

    let y = py + 66;
    o.stock.forEach(entry => {
      const it = entry.item;
      const selected = UI.sel.buy === entry;
      UI.btn(ctx, px + 14, y, pw - 28, 34, '', entry.sold ? null : () => {
        UI.sel.buy = selected ? null : entry;
      }, { disabled: entry.sold, bg: selected ? 'rgba(70,54,44,0.95)' : undefined, border: selected ? '#ffd76a' : undefined });
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = entry.sold ? '#544d44' : RARITIES[it.rarity].color;
      ctx.fillText(this.fitText(ctx, it.name, pw - 130), px + 26, y + 12);
      ctx.font = '10px Georgia';
      ctx.fillStyle = entry.sold ? '#453f52' : '#8a8070';
      ctx.fillText(ITEM_SLOTS[it.slot].label + ' · ' + RARITIES[it.rarity].name, px + 26, y + 25);
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = entry.sold ? '#453f52' : (Hero.gold >= entry.price ? '#ffd76a' : '#8a5a5a');
      ctx.fillText(entry.sold ? 'SOLD' : entry.price + ' g', px + pw - 26, y + 17);
      y += 40;
    });

    if (UI.sel.buy && !UI.sel.buy.sold) {
      const entry = UI.sel.buy;
      y += 2;
      y = this.itemCard(ctx, px + 14, y, pw - 28, entry.item, Hero.equipped[entry.item.slot], true);
      const afford = Hero.gold >= entry.price;
      const arrows = Items.compareArrows(entry.item, Hero.equipped[entry.item.slot]);
      const hint = arrows > 0 ? '▲ upgrade' : arrows < 0 ? '▼ worse than yours' : '— sidegrade';
      UI.btn(ctx, px + 14, y, pw - 28, 36,
        afford ? `BUY — ${entry.price} gold   (${hint})` : `NOT ENOUGH GOLD (${entry.price})`,
        afford ? () => {
          Hero.gold -= entry.price;
          entry.sold = true;
          Items.stash(entry.item);
          UI.toast('Bought: ' + entry.item.name, RARITIES[entry.item.rarity].color);
          AudioSys.sfx('gold');
          Hero.save();
          UI.sel.buy = null;
        } : null,
        { size: 12, disabled: !afford, border: '#8a6f4a', color: '#ffd76a' });
    } else {
      UI.btn(ctx, px + 14, y + 2, pw - 28, 32, 'LEAVE', () => UI.close(), { size: 12 });
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
