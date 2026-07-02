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
      case 'settings': this.settings(ctx, W, H); break;
      case 'devconfirm': this.devconfirm(ctx, W, H); break;
      case 'cheats': this.cheats(ctx, W, H); break;
      case 'patchnotes': this.patchnotes(ctx, W, H); break;
      case 'season': this.season(ctx, W, H); break;
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
    ctx.fillText('Left thumb: move · Right thumb: aim & cast · Tap portrait: gear', cx, H - 62);

    // Developer credit — taps open the dev panel gate.
    ctx.font = 'italic 11px Georgia';
    ctx.fillStyle = '#8a8070';
    const credit = 'Sterling Grant, 2026 | A fan-built game made with love for the Necromancer’s of Rathma';
    ctx.fillText(this.fitText(ctx, credit, W - 90), cx, H - 36);
    UI.register(cx - Math.min(W - 90, 420) / 2, H - 48, Math.min(W - 90, 420), 24, () => {
      UI.open('devconfirm');
    });

    // Version — taps open the patch notes.
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.textAlign = 'right';
    ctx.fillText(GAME_VERSION, W - 12, H - 14);
    UI.register(W - 110, H - 28, 104, 24, () => UI.open('patchnotes'));
    ctx.textAlign = 'center';
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
      ['MYSTIC', () => UI.open('mystic'), '#4ecbe0'],
      [Hero.level >= MAX_LEVEL ? '◈ SEASON: THE RIFT' : '◈ SEASON (level 70)',
        Hero.level >= MAX_LEVEL ? () => UI.open('season') : null, '#4ade80'],
      ['SETTINGS', () => UI.open('settings'), '#9a9080']
    ];
    const cols = W > 560 ? 2 : 1;
    const bw = cols === 2 ? (pw - 12) / 2 : pw;
    const rowH = cols === 1 ? Math.min(52, (H - (56 + panelH) - 46) / items.length) : 56;
    items.forEach(([label, cb, col], i) => {
      const cx2 = px + (i % cols) * (bw + 12);
      const cy2 = 56 + panelH + 16 + Math.floor(i / cols) * rowH;
      UI.btn(ctx, cx2, cy2, bw, rowH - 8, label, cb, {
        size: narrow ? 13 : 15, color: col,
        border: i === 0 ? '#57b894' : undefined,
        disabled: !cb
      });
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
    const maxRows = Math.max(1, Math.floor((H - dy - 20) / 34) - (UI.sel.item ? 5 : 0));
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
    if (UI.sel.item) {
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
      const canSocket = !!UI.sel.item.sockets;
      UI.btn(ctx, dx + (bw + 8) * 2, dy, bw, 34, 'SOCKET', canSocket ? () => {
        UI.sel.gemTarget = UI.sel.item;
        UI.sel.gemPick = true;
        UI.sel.gemIdx = undefined;
      } : null, { disabled: !canSocket, border: '#7a4a8f', color: '#b06adf', size: 13 });
    } else if (equipped && (equipped.sockets || equipped.gem)) {
      // Socket management for the equipped piece opens the gem popup.
      UI.btn(ctx, dx, dy + 6, 150, 30, equipped.gem ? 'MANAGE SOCKET' : 'SOCKET GEM', () => {
        UI.sel.gemTarget = equipped;
        UI.sel.gemPick = true;
        UI.sel.gemIdx = undefined;
      }, { border: '#7a4a8f', color: '#b06adf', size: 12 });
    }

    // The socketing popup, drawn over everything.
    if (UI.sel.gemPick) this.gemModal(ctx, W, H);
  },

  // Centered popup: inspect gems, then socket / unsocket / cancel.
  gemModal(ctx, W, H) {
    const target = UI.sel.gemTarget;
    if (!target) { UI.sel.gemPick = false; return; }
    this.dim(ctx, W, H);
    // Anything outside the popup cancels it (but keeps the inventory open).
    UI.register(0, 0, W, H, () => {
      UI.sel.gemPick = false;
      UI.sel.gemIdx = undefined;
      UI.sel.gemTarget = null;
    });
    const pw = Math.min(430, W - 20);
    const px = W / 2 - pw / 2;
    const shown = Hero.gems.slice(0, 12);
    const rows = Math.max(1, Math.ceil(shown.length / 4));
    const hasInfo = UI.sel.gemIdx !== undefined && Hero.gems[UI.sel.gemIdx];
    const ph = Math.min(H - 12,
      118 + (target.gem ? 36 : 0) + rows * 36 + (hasInfo ? 72 : 0) + 46);
    const py = Math.max(6, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SOCKET GEM');
    UI.register(px, py, pw, ph, () => { /* dead space inside the popup */ });

    const close = () => {
      UI.sel.gemPick = false;
      UI.sel.gemIdx = undefined;
      UI.sel.gemTarget = null;
    };

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = RARITIES[target.rarity].color;
    ctx.fillText(this.fitText(ctx, target.name, pw - 32), px + 16, py + 50);
    let y = py + 64;

    // Currently socketed gem, with a free unsocket.
    if (target.gem) {
      const gm = GEM_TYPES[target.gem.type];
      ctx.font = '11px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText(this.fitText(ctx, '◆ ' + gemName(target.gem) + ' — ' + gm.label(gemStatValue(target.gem)), pw - 170), px + 16, y + 8);
      UI.btn(ctx, px + pw - 136, y - 6, 120, 26, 'UNSOCKET', () => {
        Items.unsocket(target);
        UI.sel.gemIdx = undefined;
      }, { size: 10, border: '#7a4a8f', color: '#b06adf' });
      y += 36;
    }

    // Gem pouch grid — tap to read what each does.
    if (!shown.length) {
      ctx.font = 'italic 12px Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('No gems in your pouch — monsters, chests and rifts drop them.', px + 16, y + 14);
      y += 36;
    } else {
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('TAP A GEM TO SEE WHAT IT DOES' + (Hero.gems.length > 12 ? '  (+' + (Hero.gems.length - 12) + ' more in pouch)' : ''), px + 16, y);
      y += 10;
      shown.forEach((g, gi) => {
        const gx = px + 16 + (gi % 4) * ((pw - 32) / 4);
        const gy = y + Math.floor(gi / 4) * 36;
        const selected = UI.sel.gemIdx === gi;
        UI.btn(ctx, gx, gy, (pw - 32) / 4 - 6, 30, gemName(g), () => {
          UI.sel.gemIdx = selected ? undefined : gi;
        }, {
          size: 9, color: GEM_TYPES[g.type].color,
          bg: selected ? 'rgba(70,44,90,0.95)' : undefined,
          border: selected ? GEM_TYPES[g.type].color : undefined
        });
      });
      y += rows * 36 + 4;
    }

    // Info card for the inspected gem.
    if (hasInfo) {
      const g = Hero.gems[UI.sel.gemIdx];
      const gm = GEM_TYPES[g.type];
      ctx.fillStyle = 'rgba(20,17,28,0.94)';
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.fill();
      ctx.strokeStyle = gm.color;
      ctx.lineWidth = 1.5;
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText('◆ ' + gemName(g), px + 28, y + 16);
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#b5ab94';
      ctx.fillText('When socketed: ' + gm.label(gemStatValue(g)), px + 32, y + 33);
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#8a6f4a';
      ctx.fillText(target.gem ? 'Replaces ' + gemName(target.gem) + ' (returned to your pouch)' : 'Fills the empty socket', px + 32, y + 49);
      y += 70;
    }

    // Actions.
    const bw2 = (pw - 40) / 2;
    UI.btn(ctx, px + 16, y, bw2, 36, 'SOCKET IT', hasInfo ? () => {
      Items.socketGem(target, UI.sel.gemIdx);
      close();
    } : null, { disabled: !hasInfo, border: '#7a4a8f', color: '#b06adf', size: 13 });
    UI.btn(ctx, px + 24 + bw2, y, bw2, 36, 'CANCEL', close, { size: 13 });
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
    this.artisanRow(ctx, px, pw, 88, 'smith', 'FORGE');
    this.matsRow(ctx, px + 16, 114, pw - 32);

    // Salvage row.
    const half = (pw - 40) / 2;
    UI.btn(ctx, px + 16, 124, half, 32, 'SALVAGE COMMON+MAGIC', () => Items.salvageJunk(),
      { size: 11, border: '#8a6f4a', color: '#ffb43a' });
    UI.btn(ctx, px + 24 + half, 124, half, 32, 'SALVAGE RARES', () => Items.salvageRares(),
      { size: 11, border: '#8a6f4a', color: '#ffd76a' });

    // Forge quality selector.
    if (UI.sel.master === undefined) UI.sel.master = false;
    const stdCost = Items.craftCost(false);
    const mwCost = Items.craftCost(true);
    UI.btn(ctx, px + 16, 166, half, 42, '', () => { UI.sel.master = false; },
      { bg: !UI.sel.master ? 'rgba(60,52,78,0.95)' : undefined, border: !UI.sel.master ? '#c9bfa8' : undefined });
    UI.btn(ctx, px + 24 + half, 166, half, 42, '', () => { UI.sel.master = true; },
      { bg: UI.sel.master ? 'rgba(70,54,30,0.95)' : undefined, border: UI.sel.master ? '#ffd76a' : undefined });
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('STANDARD', px + 16 + half / 2, 180);
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('MASTERWORK', px + 24 + half * 1.5, 180);
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#8a8070';
    ctx.fillText(this.fitText(ctx, this.costLabel(stdCost), half - 12), px + 16 + half / 2, 196);
    ctx.fillText(this.fitText(ctx, this.costLabel(mwCost), half - 12), px + 24 + half * 1.5, 196);

    const cost = Items.craftCost(UI.sel.master);
    const afford = Items.canAfford(cost);
    ctx.font = '10px Georgia';
    ctx.fillStyle = UI.sel.master ? '#ffd76a' : '#6f6552';
    ctx.textAlign = 'left';
    ctx.fillText(this.fitText(ctx, UI.sel.master
      ? 'Masterwork: guaranteed Rare or better, 50% chance of a socket.'
      : 'Standard: a quick roll of the dice for the chosen slot.', pw - 32), px + 16, 220);

    const slots = Object.keys(ITEM_SLOTS);
    const cols = pw >= 480 ? 4 : 3;
    const bw = (pw - 32 - (cols - 1) * 8) / cols;
    slots.forEach((slot, i) => {
      const bx = px + 16 + (i % cols) * (bw + 8);
      const by = 232 + Math.floor(i / cols) * 40;
      UI.btn(ctx, bx, by, bw, 34, ITEM_SLOTS[slot].label, () => Items.craft(slot, UI.sel.master),
        { size: 11, disabled: !afford, border: UI.sel.master ? '#8a6f4a' : undefined });
    });

    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Salvage single items from the Inventory wheel. Gems survive the forge.', pw - 24),
      px + pw / 2, 232 + Math.ceil(slots.length / cols) * 40 + 10);
  },

  jeweler(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 470), 'COVETOUS SHEN — JEWELER');
    this.artisanRow(ctx, px, pw, 88, 'jeweler', 'GEMCRAFT');
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', px + 16, 104);
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(this.fitText(ctx, 'Combine 3 matching gems into a finer one. Socket via the Inventory wheel.', pw - 32), px + 16, 114);
    // Buy a freshly cut gem.
    const gemCost = Items.gemPrice();
    UI.btn(ctx, px + 16, 122, pw - 32, 32,
      `CUT A RANDOM GEM — ${this.costLabel(gemCost)}`,
      Items.canAfford(gemCost) ? () => Items.buyGem() : null,
      { size: 11, disabled: !Items.canAfford(gemCost), border: '#7a4a8f', color: '#b06adf' });

    // Socketed gear: pull gems back out, free of charge.
    let y = 162;
    const socketed = Object.keys(ITEM_SLOTS).filter(s => Hero.equipped[s] && Hero.equipped[s].gem);
    for (const slot of socketed.slice(0, 3)) {
      const it = Hero.equipped[slot];
      const gm = GEM_TYPES[it.gem.type];
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, y, pw - 32, 26, 5); ctx.fill();
      ctx.fillStyle = gm.color;
      ctx.save();
      ctx.translate(px + 30, y + 13);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#b5ab94';
      ctx.fillText(this.fitText(ctx, gemName(it.gem) + '  in  ' + it.name, pw - 200), px + 44, y + 13);
      UI.btn(ctx, px + pw - 148, y + 1, 132, 24, 'UNSOCKET (free)', () => Items.unsocket(it),
        { size: 10, border: '#7a4a8f', color: '#b06adf' });
      y += 30;
    }
    if (socketed.length) y += 4;

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
      ctx.textAlign = 'left';
      ctx.fillText('No gems in your pouch — monsters and chests drop them.', px + 16, y + 14);
      return;
    }
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

  // Artisan level + train row shared by the three shops.
  artisanRow(ctx, px, pw, y, which, label) {
    const lvl = Hero.artisans[which];
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(label + '  ·  LEVEL ' + lvl + (lvl >= 100 ? '  (MAX)' : ''), px + 16, y + 8);
    if (lvl < 100) {
      const cost = Items.trainCost(which);
      UI.btn(ctx, px + pw - 156, y - 6, 140, 26, `TRAIN  (${cost}g)`,
        Hero.gold >= cost ? () => Items.train(which) : null,
        { size: 10, disabled: Hero.gold < cost, border: '#8a6f4a', color: '#ffd76a' });
    }
    return y + 22;
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
    this.artisanRow(ctx, px, pw, 88, 'mystic', 'ENCHANTING');

    // ---- pick an item ----
    if (!UI.sel.item) {
      ctx.textAlign = 'left';
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('Choose an equipped item, then the exact property', px + 16, 112);
      ctx.fillText('to reroll. The rest of the item is untouched.', px + 16, 128);
      let y = 142;
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
      // Tap once = full stat card; then an explicit BUY or CANCEL.
      const entry = UI.sel.buy;
      y += 2;
      y = this.itemCard(ctx, px + 14, y, pw - 28, entry.item, Hero.equipped[entry.item.slot], true);
      const afford = Hero.gold >= entry.price;
      const arrows = Items.compareArrows(entry.item, Hero.equipped[entry.item.slot]);
      const hint = arrows > 0 ? '▲ upgrade' : arrows < 0 ? '▼ worse' : '— sidegrade';
      const bw2 = (pw - 36) * 0.62;
      UI.btn(ctx, px + 14, y, bw2, 36,
        afford ? `BUY — ${entry.price}g  (${hint})` : `NEED ${entry.price} GOLD`,
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
      UI.btn(ctx, px + 22 + bw2, y, pw - 36 - bw2, 36, 'CANCEL', () => { UI.sel.buy = null; }, { size: 12 });
    } else {
      UI.btn(ctx, px + 14, y + 2, pw - 28, 32, 'LEAVE', () => UI.close(), { size: 12 });
    }
  },

  // ------------------------------------------------------------ settings

  settings(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const twoCol = pw >= 480;
    const ph = Math.min(H - 20, twoCol ? 470 : 640);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SETTINGS');

    // Tabs: options vs manual save slots.
    if (!UI.sel.stab) UI.sel.stab = 'options';
    UI.btn(ctx, px + 16, py + 40, (pw - 40) / 2, 30, 'OPTIONS', () => { UI.sel.stab = 'options'; },
      { size: 12, bg: UI.sel.stab === 'options' ? 'rgba(60,52,78,0.95)' : undefined });
    UI.btn(ctx, px + 24 + (pw - 40) / 2, py + 40, (pw - 40) / 2, 30, 'SAVES', () => { UI.sel.stab = 'saves'; },
      { size: 12, bg: UI.sel.stab === 'saves' ? 'rgba(60,52,78,0.95)' : undefined });
    if (UI.sel.stab === 'saves') {
      this.savesTab(ctx, W, H, px, py, pw, ph);
      return;
    }

    // ---- audio: slider + mute per channel ----
    const chans = [
      ['master', 'Master volume'],
      ['sfx', 'Sound FX'],
      ['music', 'Music'],
      ['ambience', 'Ambience FX'],
      ['weather', 'Weather FX']
    ];
    const colW = twoCol ? (pw - 44) / 2 : pw - 32;
    let ay = py + 92;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('— AUDIO —', px + 16, ay);
    ay += 14;
    for (const [chan, label] of chans) {
      const a = Settings.audio[chan];
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#c9bfa8';
      ctx.textAlign = 'left';
      ctx.fillText(label, px + 16, ay + 6);
      ctx.textAlign = 'right';
      ctx.fillStyle = a.mute ? '#8a5a5a' : '#9a9080';
      ctx.fillText(a.mute ? 'muted' : Math.round(a.v * 100) + '%', px + 16 + colW - 66, ay + 6);
      UI.slider(ctx, px + 16, ay + 12, colW - 76, a.v, v => {
        a.v = v;
        Settings.save();
      });
      UI.check(ctx, px + 16 + colW - 56, ay + 2, a.mute, () => {
        a.mute = !a.mute;
        Settings.save();
      }, 'mute');
      ay += 42;
    }

    // ---- gameplay (Diablo-Immortal-style options) ----
    let gx = twoCol ? px + 28 + colW : px + 16;
    let gy = twoCol ? py + 106 : ay + 8;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('— GAMEPLAY —', gx, gy - 14);
    const toggles = [
      ['dmgNumbers', 'Damage numbers'],
      ['shake', 'Camera shake'],
      ['healthBars', 'Enemy health bars'],
      ['aimIndicator', 'Aim indicator'],
      ['fixedJoy', 'Fixed movement joystick'],
      ['bigMinimap', 'Large minimap'],
      ['lowFx', 'Reduced effects (battery saver)'],
      ['showFps', 'Show frame rate']
    ];
    for (const [key, label] of toggles) {
      UI.check(ctx, gx, gy, Settings.g[key], () => {
        Settings.g[key] = !Settings.g[key];
        Settings.save();
      }, label);
      gy += 34;
    }
  },

  // ------------------------------------------------------- manual saves

  savesTab(ctx, W, H, px, py, pw, ph) {
    const saves = Saves.list();
    UI.btn(ctx, px + 16, py + 84, pw - 32, 38,
      saves.length >= Saves.MAX ? 'ALL 20 SLOTS FULL' : '＋ SAVE CURRENT HERO  (' + saves.length + ' / ' + Saves.MAX + ')',
      saves.length >= Saves.MAX ? null : () => {
        let name = null;
        try { name = window.prompt('Name this save:', 'Level ' + Hero.level + ' Nekromancer'); } catch (e) { /* blocked */ }
        if (name === null && saves.length) name = 'Save ' + (saves.length + 1);
        Saves.add(name || 'Level ' + Hero.level + ' Nekromancer');
      },
      { size: 13, disabled: saves.length >= Saves.MAX, border: '#57b894', color: '#6ff7c3' });

    if (!saves.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 12px Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('No manual saves yet. The game still autosaves constantly.', W / 2, py + 150);
      return;
    }
    let y = py + 132;
    const rowH = Math.min(30, (ph - 150) / Math.max(1, saves.length));
    saves.forEach((s, i) => {
      if (y > py + ph - 26) return;
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, y, pw - 32, rowH - 4, 5); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = '#e8e0cc';
      ctx.fillText(this.fitText(ctx, s.name, pw - 240), px + 26, y + rowH / 2 - 2);
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.textAlign = 'right';
      ctx.fillText('lvl ' + (s.level || '?') + ' · ' + (s.date || ''), px + pw - 148, y + rowH / 2 - 2);
      UI.btn(ctx, px + pw - 138, y + 1, 74, rowH - 6, 'LOAD', () => Saves.load(i),
        { size: 10, border: '#57b894', color: '#6ff7c3' });
      UI.btn(ctx, px + pw - 58, y + 1, 42, rowH - 6, '✕', () => Saves.remove(i),
        { size: 10, border: '#8a4550', color: '#e04a5a' });
      y += rowH;
    });
    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Saves live in this browser (localStorage). Loading replaces your current hero.', W / 2, py + ph - 14);
  },

  // ------------------------------------------------- dev panel & cheats

  devconfirm(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(360, W - 30);
    const px = W / 2 - pw / 2;
    const py = H / 2 - 90;
    UI.panel(ctx, px, py, pw, 180, 'DEVELOPER');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '13px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Would you like to open the dev panel?', W / 2, py + 58);
    if (UI.sel.devToggle === undefined) UI.sel.devToggle = false;
    UI.check(ctx, px + pw / 2 - 60, py + 76, UI.sel.devToggle, () => {
      UI.sel.devToggle = !UI.sel.devToggle;
    }, 'yes, I am sure');
    const bw = (pw - 44) / 2;
    UI.btn(ctx, px + 16, py + 118, bw, 38, 'OPEN',
      UI.sel.devToggle ? () => UI.open('cheats') : null,
      { size: 13, disabled: !UI.sel.devToggle, border: '#c22843', color: '#e04a5a' });
    UI.btn(ctx, px + 28 + bw, py + 118, bw, 38, 'CANCEL', () => UI.close(), { size: 13 });
  },

  cheats(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 500);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, '☠ DEV CHEATS ☠');
    let y = py + 52;

    // Toggles.
    UI.check(ctx, px + 16, y, Game.cheats.god, () => { Game.cheats.god = !Game.cheats.god; }, 'Immortality (god mode)');
    y += 34;
    UI.check(ctx, px + 16, y, Game.cheats.essence, () => { Game.cheats.essence = !Game.cheats.essence; }, 'Infinite essence (mana/rage/energy)');
    y += 40;

    const row = (label, cb, color = '#e8e0cc') => {
      UI.btn(ctx, px + 16, y, pw - 32, 30, label, cb, { size: 12, color });
      y += 36;
    };
    row('Add 100 of each crafting resource', () => {
      for (const k of Object.keys(MATERIALS)) Hero.mats[k] += 100;
      UI.toast('+100 of every material', '#ffd76a');
      Hero.save();
    });
    row('Add 6 of each gem type', () => {
      for (const type of Object.keys(GEM_TYPES)) {
        for (let i = 0; i < 6; i++) Hero.gems.push({ type, tier: 2 });
      }
      UI.toast('+6 of every gem', '#b06adf');
      Hero.save();
    });
    // Gold row: five amounts.
    const golds = [100, 1000, 10000, 100000, 1000000];
    const gw = (pw - 32 - 4 * 6) / 5;
    golds.forEach((g, i) => {
      UI.btn(ctx, px + 16 + i * (gw + 6), y, gw, 30,
        g >= 1000000 ? '1m g' : g >= 1000 ? (g / 1000) + 'k g' : g + ' g',
        () => { Hero.gold += g; UI.toast('+' + g + ' gold', '#ffd76a'); Hero.save(); },
        { size: 11, color: '#ffd76a' });
    });
    y += 36;
    // Level row.
    const lvls = [1, 5, 10];
    const lw = (pw - 32 - 2 * 6) / 3;
    lvls.forEach((n, i) => {
      UI.btn(ctx, px + 16 + i * (lw + 6), y, lw, 30, '+' + n + ' level' + (n > 1 ? 's' : ''),
        () => Hero.grantLevels(n), { size: 11 });
    });
    y += 36;
    row('Max level Blacksmith (100)', () => {
      Hero.artisans.smith = 100; UI.toast('Blacksmith mastered', '#ffb43a'); Hero.save();
    }, '#ffb43a');
    row('Max level Enchantress (100)', () => {
      Hero.artisans.mystic = 100; UI.toast('Mystic mastered', '#b06adf'); Hero.save();
    }, '#b06adf');
    row('Max level Gem Crafter (100)', () => {
      Hero.artisans.jeweler = 100; UI.toast('Jeweler mastered', '#4ecbe0'); Hero.save();
    }, '#4ecbe0');
    ctx.textAlign = 'center';
    ctx.font = 'italic 10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Toggles last for this session. Grants are saved to the hero.', px + pw / 2, y + 8);
  },

  // -------------------------------------------------------- patch notes

  patchnotes(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 480);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'PATCH NOTES');
    let y = py + 54;
    for (const patch of PATCH_NOTES) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = '#57b894';
      ctx.fillText(patch.v + '   —   ' + patch.date, px + 16, y);
      y += 20;
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#b5ab94';
      for (const n of patch.notes) {
        if (y > py + ph - 20) break;
        y = wrapText(ctx, '• ' + n, px + 22, y, pw - 44, 14, 2) + 4;
      }
      y += 10;
    }
  },

  // ------------------------------------------------------------- season

  season(ctx, W, H) {
    this.dim(ctx, W, H);
    this.closeX(ctx, W);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 470);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, SEASON.name.toUpperCase());
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Georgia';
    ctx.fillStyle = '#9a9080';
    wrapText(ctx, SEASON.desc, W / 2, py + 54, pw - 40, 15, 2);

    // The set hunt.
    const owned = Hero.setPiecesOwned();
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('GRACE OF INARIUS  —  ' + owned.size + ' / 6', W / 2, py + 96);
    let y = py + 114;
    ctx.textAlign = 'left';
    for (const [slot, name] of Object.entries(INARIUS_SET.pieces)) {
      const has = owned.has(slot);
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = has ? '#4ade80' : '#544d44';
      ctx.fillText((has ? '◆  ' : '◇  ') + name, px + 24, y);
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = has ? '#3a7a4a' : '#453f52';
      ctx.fillText(ITEM_SLOTS[slot].label, px + pw - 24, y);
      ctx.textAlign = 'left';
      y += 22;
    }
    y += 4;
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#8a8070';
    for (const b of INARIUS_SET.bonuses) {
      const active = Items.setCount() >= b.pieces;
      ctx.fillStyle = active ? '#4ade80' : '#6f6552';
      y = wrapText(ctx, `(${b.pieces}) ${b.desc}` + (active ? '  ✓' : ''), px + 24, y, pw - 48, 14, 2) + 2;
    }
    y += 8;
    UI.btn(ctx, px + 16, y, pw - 32, 44, '◈ ENTER THE NEPHALEM RIFT', () => {
      UI.close();
      Game.startRift();
    }, { size: 14, border: '#3a7a4a', color: '#4ade80' });
    y += 52;
    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Rifts cleared: ' + Hero.riftsCleared + '  ·  Guardians always drop set pieces', W / 2, y);
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
    UI.btn(ctx, cx, y, bw, 40, 'SETTINGS', () => UI.open('settings'), { size: 13 });
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
