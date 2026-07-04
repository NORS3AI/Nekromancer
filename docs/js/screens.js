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
      case 'torches': this.torches(ctx, W, H); break;
      case 'jeweler': this.jeweler(ctx, W, H); break;
      case 'mystic': this.mystic(ctx, W, H); break;
      case 'pause': this.pause(ctx, W, H); break;
      case 'reward': this.reward(ctx, W, H); break;
      case 'character': this.character(ctx, W, H); break;
      case 'stash': this.stash(ctx, W, H); break;
      case 'vendor': this.vendor(ctx, W, H); break;
      case 'settings': this.settings(ctx, W, H); break;
      case 'devconfirm': this.devconfirm(ctx, W, H); break;
      case 'cheats': this.cheats(ctx, W, H); break;
      case 'patchnotes': this.patchnotes(ctx, W, H); break;
      case 'season': this.season(ctx, W, H); break;
      case 'town': this.town(ctx, W, H); break;
      case 'wilds': this.wilds(ctx, W, H); break;
      case 'create': this.create(ctx, W, H); break;
      case 'select': this.select(ctx, W, H); break;
    }
  },

  // The campfire roster: up to three Nekromancers stand around a fire, drawn
  // with pseudo-3D depth. Tap a hero to select it, then the green PLAY button
  // to enter. "Delete Hero" toggles a retire flow. Empty spots create.
  select(ctx, W, H) {
    const fx = W / 2, fy = H * 0.5;
    const t = Game.time || 0;
    // Night sky — deep blue-black at the top, warming toward the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#070610');
    sky.addColorStop(0.55, '#0c0a16');
    sky.addColorStop(1, '#140d0a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Full moon (upper-left) with a soft halo and a couple of stars.
    const mx = W * 0.24, my = H * 0.2;
    const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 90);
    halo.addColorStop(0, 'rgba(210,220,240,0.5)');
    halo.addColorStop(1, 'rgba(150,170,210,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, 90, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8ecf6'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(180,190,210,0.4)';   // craters
    ctx.beginPath(); ctx.arc(mx - 10, my - 6, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 9, my + 8, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 4, my - 12, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(230,235,250,0.7)';
    for (let i = 0; i < 7; i++) {
      const sx = (i * 137.5) % W, sy = (i * 61.7) % (H * 0.42);
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.7 + i));
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // Decrepit buildings on the right background.
    this.drawRuins(ctx, W, H);
    // A dark forest treeline across the horizon.
    this.drawTreeline(ctx, W, H * 0.62);
    // Bats flap across the sky now and then.
    this.drawBats(ctx, W, H, t);

    // Warm ground plane + firelight pool for depth.
    const floor = ctx.createLinearGradient(0, fy - 120, 0, H);
    floor.addColorStop(0, 'rgba(20,14,10,0)');
    floor.addColorStop(1, 'rgba(52,28,12,0.6)');
    ctx.fillStyle = floor; ctx.fillRect(0, fy - 120, W, H - (fy - 120));
    const glow = ctx.createRadialGradient(fx, fy, 10, fx, fy, Math.max(W, H) * 0.6);
    const gf = 0.30 + 0.05 * Math.sin(t * 8) + 0.03 * Math.sin(t * 17); // firelight flicker
    glow.addColorStop(0, `rgba(255,150,60,${gf.toFixed(3)})`);
    glow.addColorStop(0.4, 'rgba(200,90,30,0.10)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    // Ground litter around the fire, its shadows dancing with the flames.
    this.drawGroundLitter(ctx, fx, fy, W, t);

    const delMode = !!UI.sel.delMode;
    // Pre-select the active hero so PLAY is ready (unless we're deleting).
    if (!delMode && UI.sel.pick === undefined) {
      UI.sel.pick = Profiles.slots[Profiles.active] ? Profiles.active : null;
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.min(30, W * 0.07) + 'px Georgia';
    ctx.fillStyle = delMode ? '#e04a5a' : '#e8d8b0';
    ctx.fillText(delMode ? 'RETIRE A HERO' : 'CHOOSE YOUR HERO', W / 2, H * 0.1);
    ctx.font = '12px Georgia'; ctx.fillStyle = '#9a8f7a';
    ctx.fillText(delMode ? 'Tap the hero you wish to retire' : 'Up to ' + Profiles.MAX + ' Nekromancers rest by the fire', W / 2, H * 0.1 + 26);

    // Fire dead-centre; one hero stands behind it (higher & smaller), two front.
    const s = clamp(W / 760, 0.72, 1.05);
    const spots = [
      { i: 0, x: fx,        y: fy - 74 * s, scale: 0.74 * s, front: false },  // behind the fire
      { i: 1, x: W * 0.22,  y: fy + 20 * s, scale: 1.06 * s, front: true },
      { i: 2, x: W * 0.78,  y: fy + 20 * s, scale: 1.06 * s, front: true }
    ];
    const back = spots.find(sp => !sp.front);
    this.drawRosterSpot(ctx, back, back.scale, delMode);
    this.drawCampfire(ctx, fx, fy, s);
    for (const sp of spots) if (sp.front) this.drawRosterSpot(ctx, sp, sp.scale, delMode);

    // ---- bottom controls ----
    const pick = UI.sel.pick;
    const delId = UI.sel.delConfirm;
    if (delMode && delId !== undefined && Profiles.slots[delId]) {
      // Confirm retire.
      const nm = Profiles.slots[delId].name || 'this hero';
      ctx.textAlign = 'center'; ctx.font = 'bold 15px Georgia'; ctx.fillStyle = '#e8e0cc';
      ctx.fillText(this.fitText(ctx, 'Retire ' + nm + '? Are you sure? :(', W - 40), W / 2, H - 100);
      const bw = Math.min(150, (W - 48) / 2);
      UI.btn(ctx, W / 2 - bw - 6, H - 84, bw, 36, 'YES, RETIRE', () => {
        Profiles.remove(delId);
        UI.sel.delConfirm = undefined; UI.sel.delMode = false; UI.sel.pick = undefined;
      }, { size: 13, border: '#c22843', color: '#e04a5a' });
      UI.btn(ctx, W / 2 + 6, H - 84, bw, 36, 'NO, KEEP', () => { UI.sel.delConfirm = undefined; }, { size: 13 });
    } else if (!delMode && pick !== undefined && pick !== null && Profiles.slots[pick]) {
      // Selected hero → name/level + a green pulsing PLAY button.
      const snap = Profiles.slots[pick];
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px Georgia'; ctx.fillStyle = '#ffd76a';
      ctx.fillText(this.fitText(ctx, snap.name || 'The Nekromancer', W - 40), W / 2, H - 118);
      ctx.font = '12px Georgia'; ctx.fillStyle = '#9a8f7a';
      ctx.fillText('Level ' + (snap.level || 1) + ' Necromancer', W / 2, H - 100);
      const bw = Math.min(220, W - 70), bh = 40, bx = W / 2 - bw / 2, byy = H - 86;
      const pulse = 0.5 + 0.5 * Math.sin(Game.time * 4);
      ctx.save();
      ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 10 + pulse * 16;
      ctx.fillStyle = 'rgba(26,54,34,0.96)';
      rr(ctx, bx, byy, bw, bh, 12); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2 + pulse * 1.6;
      rr(ctx, bx, byy, bw, bh, 12); ctx.stroke();
      ctx.fillStyle = '#aef7c8'; ctx.font = 'bold 18px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▶  PLAY', W / 2, byy + bh / 2);
      UI.register(bx, byy, bw, bh, () => { Profiles.select(pick); Game.toCamp(); });
    }

    // Delete / cancel toggle, lower-left (its own row, clear of PLAY / YES-NO).
    UI.btn(ctx, 16, H - 40, 140, 30, delMode ? '‹ CANCEL' : '☠ DELETE HERO', () => {
      UI.sel.delMode = !delMode;
      UI.sel.delConfirm = undefined;
      if (!delMode) UI.sel.pick = null;   // entering delete mode clears the play selection
    }, { size: 12, border: delMode ? '#6b5f80' : '#8a4550', color: delMode ? '#c9bfa8' : '#e04a5a' });

    // Still, low-lying fog drifts across the foreground.
    this.drawForegroundFog(ctx, W, H, t);
  },

  // A ragged dark forest treeline silhouette across the given horizon y.
  drawTreeline(ctx, W, yh) {
    ctx.fillStyle = '#0a0d0a';
    ctx.beginPath();
    ctx.moveTo(0, yh + 40);
    for (let x = -20; x < W + 20; x += 26) {
      const h = 30 + (hash2(Math.round(x / 26), 3)) * 70;
      ctx.lineTo(x, yh - h);
      ctx.lineTo(x + 13, yh - h * 0.5);
    }
    ctx.lineTo(W, yh + 40); ctx.closePath(); ctx.fill();
    // A faint mist behind the trees.
    ctx.fillStyle = 'rgba(40,44,60,0.12)';
    ctx.fillRect(0, yh - 20, W, 40);
  },

  // Decrepit ruined buildings on the right background.
  drawRuins(ctx, W, H) {
    const base = H * 0.62;
    ctx.save();
    // Tall broken tower — dark stone with a faint moonlit left edge.
    let bx = W * 0.8;
    ctx.fillStyle = '#1a1722';
    ctx.beginPath();
    ctx.moveTo(bx, base);
    ctx.lineTo(bx, base - 160);
    ctx.lineTo(bx + 11, base - 170); ctx.lineTo(bx + 18, base - 148);
    ctx.lineTo(bx + 24, base - 162); ctx.lineTo(bx + 33, base - 146);
    ctx.lineTo(bx + 42, base - 160); ctx.lineTo(bx + 48, base);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,160,190,0.16)'; ctx.fillRect(bx, base - 160, 3, 160);   // moonlit edge
    ctx.fillStyle = 'rgba(30,26,38,0.9)';                                              // broken windows
    ctx.fillRect(bx + 12, base - 128, 8, 13);
    ctx.fillRect(bx + 30, base - 96, 8, 13);
    ctx.fillRect(bx + 18, base - 62, 8, 13);
    // A lower crumbling house.
    ctx.fillStyle = '#161320';
    bx = W * 0.9;
    ctx.beginPath();
    ctx.moveTo(bx, base);
    ctx.lineTo(bx, base - 74);
    ctx.lineTo(bx + 13, base - 94); ctx.lineTo(bx + 22, base - 78);
    ctx.lineTo(bx + 37, base - 90); ctx.lineTo(bx + 54, base - 70);
    ctx.lineTo(bx + 62, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,160,190,0.14)'; ctx.fillRect(bx, base - 74, 2.5, 74);
    ctx.fillStyle = 'rgba(30,26,38,0.9)'; ctx.fillRect(bx + 22, base - 56, 9, 15);
    ctx.restore();
  },

  // Bats flapping across the night sky, wrapping around.
  drawBats(ctx, W, H, t) {
    ctx.strokeStyle = 'rgba(10,8,14,0.85)';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const speed = 40 + i * 12;
      const bx = ((t * speed + i * 320) % (W + 120)) - 60;
      const by = H * (0.14 + 0.06 * i) + Math.sin(t * 1.5 + i) * 14;
      const flap = Math.sin(t * 9 + i * 2) * 4;
      ctx.beginPath();
      ctx.moveTo(bx - 7, by);
      ctx.quadraticCurveTo(bx - 3, by - 4 - flap, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 4 - flap, bx + 7, by);
      ctx.stroke();
    }
  },

  // Dry grass tufts, rocks, leaves and branches near the fire — their long
  // shadows sway with the firelight.
  drawGroundLitter(ctx, fx, fy, W, t) {
    const flick = Math.sin(t * 9) * 0.12 + Math.sin(t * 5.3) * 0.06;
    const items = [
      [fx - 150, fy + 70, 'grass'], [fx + 160, fy + 60, 'grass'], [fx - 240, fy + 110, 'rock'],
      [fx + 250, fy + 100, 'branch'], [fx - 90, fy + 120, 'leaf'], [fx + 110, fy + 130, 'leaf'],
      [fx + 40, fy + 150, 'grass'], [fx - 40, fy + 90, 'branch'], [fx + 300, fy + 150, 'rock'],
      [fx - 320, fy + 150, 'leaf']
    ];
    for (const [x, y, kind] of items) {
      const dx = x - fx;
      // Shadow stretches away from the fire and wavers with the flame.
      const sh = (dx / 60 + flick * (dx > 0 ? 1 : -1));
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sh * 14, y + 4); ctx.stroke();
      if (kind === 'grass') {
        ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 1.6;
        for (let b = -2; b <= 2; b++) {
          ctx.beginPath(); ctx.moveTo(x + b * 2, y); ctx.quadraticCurveTo(x + b * 3 + flick * 6, y - 9, x + b * 4 + flick * 10, y - 13); ctx.stroke();
        }
      } else if (kind === 'rock') {
        ctx.fillStyle = '#3a3640';
        ctx.beginPath(); ctx.ellipse(x, y - 2, 8, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a2732';
        ctx.beginPath(); ctx.ellipse(x - 2, y, 5, 3, 0, 0, TAU); ctx.fill();
      } else if (kind === 'branch') {
        ctx.strokeStyle = '#4a3620'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y - 3); ctx.moveTo(x + 2, y - 1); ctx.lineTo(x + 6, y - 6); ctx.stroke();
      } else { // leaf
        ctx.fillStyle = '#5a3a1a';
        ctx.beginPath(); ctx.ellipse(x, y, 3.5, 2, 0.6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#6a4622';
        ctx.beginPath(); ctx.ellipse(x + 6, y + 2, 3, 1.8, -0.4, 0, TAU); ctx.fill();
      }
    }
  },

  // A still bank of fog low across the foreground.
  drawForegroundFog(ctx, W, H, t) {
    for (let b = 0; b < 3; b++) {
      const y = H - 30 - b * 20;
      const drift = Math.sin(t * 0.25 + b) * 30;
      const fog = ctx.createLinearGradient(0, y - 40, 0, H);
      fog.addColorStop(0, 'rgba(120,120,140,0)');
      fog.addColorStop(1, `rgba(150,150,170,${(0.05 + b * 0.03).toFixed(3)})`);
      ctx.fillStyle = fog;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 40) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + t * 0.4 + b) * 8 + drift * 0.2);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
  },

  // Draw one roster position: a hero (if the slot is filled) or an empty
  // "create" plinth, plus its nameplate, selection ring and tap region.
  drawRosterSpot(ctx, sp, scale, delMode) {
    const snap = Profiles.slots[sp.i];
    const R = 70 * scale;
    if (snap) {
      this.drawNecroFigure(ctx, sp.x, sp.y, scale, snap.eyeColor || '#6ff7c3', false);
      // Selection / delete ring.
      const selRing = !delMode && UI.sel.pick === sp.i;
      const delRing = delMode && UI.sel.delConfirm === sp.i;
      if (selRing || delRing) {
        const pulse = 0.5 + 0.5 * Math.sin(Game.time * 4);
        ctx.strokeStyle = delRing ? `rgba(224,74,90,${(0.55 + 0.35 * pulse).toFixed(2)})`
          : `rgba(78,230,128,${(0.55 + 0.35 * pulse).toFixed(2)})`;
        ctx.lineWidth = 2.5 + pulse * 1.5;
        ctx.beginPath(); ctx.ellipse(sp.x, sp.y + 56 * scale, 42 * scale, 15 * scale, 0, 0, TAU); ctx.stroke();
      }
      // Nameplate — below the front heroes, higher above the one behind the fire.
      const ny = sp.front ? sp.y + 80 * scale : sp.y - 96 * scale;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = selRing ? '#ffd76a' : '#e8e0cc';
      ctx.fillText(this.fitText(ctx, snap.name || 'The Nekromancer', 150), sp.x, ny);
      ctx.font = '11px Georgia'; ctx.fillStyle = '#9a8f7a';
      ctx.fillText('Level ' + (snap.level || 1) + ' Necromancer', sp.x, ny + 16);
      // Tap: select for play, or mark for retire in delete mode.
      UI.register(sp.x - R * 0.6, sp.y - R, R * 1.2, R * 1.6, () => {
        if (delMode) UI.sel.delConfirm = sp.i;
        else UI.sel.pick = sp.i;
      });
    } else {
      // Empty plinth — a faint hooded ghost + "＋ New". (Not deletable.)
      this.drawNecroFigure(ctx, sp.x, sp.y, scale, '#5a6f9a', false, true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px Georgia'; ctx.fillStyle = '#6ff7c3';
      ctx.fillText('＋', sp.x, sp.y - 6 * scale);
      ctx.font = 'bold 13px Georgia'; ctx.fillStyle = '#8fb0e8';
      ctx.fillText('New Nekromancer', sp.x, sp.front ? sp.y + 82 * scale : sp.y - 74 * scale);
      if (!delMode) {
        UI.register(sp.x - R * 0.6, sp.y - R, R * 1.2, R * 1.6, () => {
          if (Profiles.create(sp.i)) UI.open('create');
        });
      }
    }
  },

  // A standing hooded Nekromancer with glowing eyes of the given colour.
  drawNecroFigure(ctx, x, y, scale, eye, active, ghost) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (ghost) ctx.globalAlpha = 0.32;
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 56, 34, 11, 0, 0, TAU); ctx.fill();
    if (active) {
      ctx.strokeStyle = 'rgba(255,215,106,0.7)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 56, 40, 14, 0, 0, TAU); ctx.stroke();
    }
    // Robe (hooded cloak).
    ctx.fillStyle = '#231d2e';
    ctx.beginPath();
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(30, -18, 26, 54);
    ctx.lineTo(-26, 54);
    ctx.quadraticCurveTo(-30, -18, 0, -34);
    ctx.fill();
    // Cloak highlight (firelit right side).
    ctx.fillStyle = 'rgba(120,74,40,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -34); ctx.quadraticCurveTo(30, -18, 26, 54); ctx.lineTo(6, 54);
    ctx.quadraticCurveTo(10, -14, 0, -34); ctx.fill();
    // Hood opening + skull.
    ctx.fillStyle = '#1a1622';
    ctx.beginPath(); ctx.ellipse(0, -30, 15, 18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = ghost ? '#5a5560' : '#ded5bd';
    ctx.beginPath(); ctx.arc(0, -30, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a070c';
    ctx.beginPath(); ctx.ellipse(-3.6, -31, 2.4, 3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.6, -31, 2.4, 3, 0, 0, TAU); ctx.fill();
    // Glowing eyes.
    ctx.fillStyle = eye; ctx.shadowColor = eye; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(-3.6, -31, 1.4 + Math.sin(Game.time * 3) * 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(3.6, -31, 1.4 + Math.sin(Game.time * 3 + 1) * 0.4, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    // Staff.
    ctx.strokeStyle = '#4a3c2c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, 54); ctx.lineTo(26, -40); ctx.stroke();
    ctx.fillStyle = eye; ctx.shadowColor = eye; ctx.shadowBlur = ghost ? 0 : 6;
    ctx.beginPath(); ctx.arc(26, -44, 4, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // A crackling campfire: logs, glowing embers and a flickering flame.
  drawCampfire(ctx, x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // A little stack of logs.
    ctx.strokeStyle = '#4a3320'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-24, 16); ctx.lineTo(22, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 24); ctx.lineTo(24, 14); ctx.stroke();
    ctx.strokeStyle = '#5a4028'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-16, 12); ctx.lineTo(16, 12); ctx.stroke();
    // Cut log ends.
    ctx.fillStyle = '#6a4c2c';
    ctx.beginPath(); ctx.arc(-24, 16, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(24, 14, 4.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2e2014'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18, 20); ctx.lineTo(18, 20); ctx.stroke();
    // Glowing ember bed, breathing.
    const t = Game.time;
    const eb = 0.4 + 0.2 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(255,120,40,${eb.toFixed(2)})`;
    ctx.beginPath(); ctx.ellipse(0, 16, 22, 7, 0, 0, TAU); ctx.fill();
    // Real dancing flame: each tongue sways sideways and varies its height with
    // layered, out-of-phase noise, so it flickers organically (not a pulse).
    const flame = (w, hgt, col, seed) => {
      const sway = Math.sin(t * 7 + seed) * 5 + Math.sin(t * 13 + seed * 2) * 2.5;
      const h = hgt * (1 + Math.sin(t * 9 + seed) * 0.14 + Math.sin(t * 21 + seed) * 0.07);
      const lean = Math.sin(t * 5 + seed) * 4;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-w, 14);
      ctx.quadraticCurveTo(-w * 0.6 + lean, -h * 0.4, sway * 0.5, -h * 0.7);
      ctx.quadraticCurveTo(sway * 1.2, -h * 0.9, sway, -h);          // whippy tip
      ctx.quadraticCurveTo(sway * 0.4 + w * 0.5, -h * 0.5, w, 14);
      ctx.quadraticCurveTo(0, 8, -w, 14);
      ctx.fill();
    };
    ctx.shadowColor = '#ff8c2a'; ctx.shadowBlur = 26;
    flame(19, 50, 'rgba(200,55,18,0.9)', 0.0);
    flame(14, 40, 'rgba(255,130,36,0.95)', 1.7);
    flame(9, 28, 'rgba(255,214,110,0.95)', 3.1);
    flame(5, 18, 'rgba(255,244,190,0.9)', 4.6);
    ctx.shadowBlur = 0;
    // Embers/sparks rising and drifting.
    for (let i = 0; i < 7; i++) {
      const a = t * 2 + i * 1.3;
      const sy = 6 - ((t * 34 + i * 34) % 80);
      const sx = Math.sin(a) * (8 + (80 + sy) * 0.14);
      ctx.fillStyle = `rgba(255,190,90,${(0.7 * (1 - (6 - sy) / 86)).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  // Character creation: name your Nekromancer and choose your glowing-eye
  // colour. Opened from the title screen when starting a new hero.
  create(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(460, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 460);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'CREATE YOUR NEKROMANCER');

    // Live preview — a hooded skull with the chosen glowing eyes.
    const cx = W / 2, hy = py + 96;
    const eye = Hero.eyeColor || '#6ff7c3';
    ctx.save();
    ctx.translate(cx, hy);
    ctx.fillStyle = '#ded5bd';
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.fillRect(-16, 17, 32, 15);
    ctx.fillStyle = '#0a070c';
    ctx.beginPath(); ctx.ellipse(-10, -2, 7, 9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -2, 7, 9, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-4, 14); ctx.lineTo(4, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = eye; ctx.shadowColor = eye; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(-10, -2, 3 + Math.sin(Game.time * 3) * 0.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -2, 3 + Math.sin(Game.time * 3 + 1) * 0.7, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Name row.
    let y = py + 150;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText('NAME', px + 16, y);
    UI.btn(ctx, px + 16, y + 10, pw - 32, 34, this.fitText(ctx, Hero.name || 'The Nekromancer', pw - 60), () => {
      let q = null;
      try { q = window.prompt('Name your Nekromancer:', Hero.name || ''); } catch (e) { /* blocked */ }
      if (q !== null) { const t = q.trim().slice(0, 22); Hero.name = t || 'The Nekromancer'; }
    }, { size: 14, border: '#6b5f80', color: '#e8e0cc' });
    y += 58;

    // Eye-colour swatches.
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText('GLOWING EYES', px + 16, y);
    y += 12;
    const cols = 5, gap = 8;
    const sw = (pw - 32 - (cols - 1) * gap) / cols;
    EYE_COLORS.forEach((c, i) => {
      const bx = px + 16 + (i % cols) * (sw + gap);
      const by = y + Math.floor(i / cols) * (sw + 20);
      const sel = (Hero.eyeColor || '#6ff7c3').toLowerCase() === c.hex.toLowerCase();
      ctx.fillStyle = '#16121d';
      rr(ctx, bx, by, sw, sw, 8); ctx.fill();
      ctx.fillStyle = c.hex;
      ctx.shadowColor = c.hex; ctx.shadowBlur = sel ? 12 : 4;
      ctx.beginPath(); ctx.arc(bx + sw / 2, by + sw / 2, sw * 0.28, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = sel ? '#f2ecd8' : '#3a3448';
      ctx.lineWidth = sel ? 3 : 1.5;
      rr(ctx, bx, by, sw, sw, 8); ctx.stroke();
      ctx.fillStyle = sel ? '#f2ecd8' : '#8a8070';
      ctx.font = '9px Georgia'; ctx.textAlign = 'center';
      ctx.fillText(c.name, bx + sw / 2, by + sw + 9);
      UI.register(bx, by, sw, sw + 14, () => { Hero.eyeColor = c.hex; });
    });
    y += Math.ceil(EYE_COLORS.length / cols) * (sw + 20) + 6;

    // Begin — the new hero joins the roster at the campfire.
    UI.btn(ctx, px + 16, py + ph - 46, pw - 32, 36, 'BEGIN THE JOURNEY', () => {
      if (!Hero.name) Hero.name = 'The Nekromancer';
      if (!Hero.eyeColor) Hero.eyeColor = '#6ff7c3';
      Hero.save();
      UI.open('select');
    }, { size: 15, border: '#57b894', color: '#6ff7c3' });
  },

  dim(ctx, W, H) {
    ctx.fillStyle = 'rgba(4,2,8,0.82)';
    ctx.fillRect(0, 0, W, H);
  },

  // The one true way to dismiss a menu: a fat red ✕ (Escape works too).
  closeX(ctx, W, opts = {}) {
    const x = opts.x !== undefined ? opts.x : W - 26;
    const y = opts.y !== undefined ? opts.y : 26;
    const cb = opts.cb || (() => UI.close());
    ctx.fillStyle = '#7a1220';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#e04a5a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#ffe0e4';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
    ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
    ctx.stroke();
    UI.register(x - 24, y - 24, 48, 48, cb);
  },

  // A glowing blue swirl — the town portal button (mirror of the red ✕).
  portalBtn(ctx, x, y, cb) {
    ctx.save();
    ctx.fillStyle = '#0e2a44';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4aa3e0';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#8fd0ff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#4aa3e0';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const ang = i * 0.55 + (Game.time || 0) * 2.2;
      const rr2 = 1.5 + i * 0.5;
      const sx = x + Math.cos(ang) * rr2, sy = y + Math.sin(ang) * rr2;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
    UI.register(x - 24, y - 24, 48, 48, cb);
  },

  // Town portal overlay — reachable from the wilds inventory. The artisans and
  // stash sit here; the game stays paused underneath, so "Back to the Wilds"
  // drops the player straight back into the fight they left.
  town(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(440, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 40, 440);
    const py = Math.max(20, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'TOWN PORTAL');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('Visit the artisans and your stash, then head back.', W / 2, py + 56);

    let y = py + 82;
    const stops = [
      ['⚒   BLACKSMITH', () => UI.open('smith'), '#ffb43a', '#8a6f4a'],
      ['◆   JEWELER', () => UI.open('jeweler'), '#4ecbe0', '#2a6a7a'],
      ['✦   MYSTIC', () => UI.open('mystic'), '#b06adf', '#7a4a8f'],
      ['▤   STASH', () => UI.open('stash'), '#8fb0e8', '#5f7ab0']
    ];
    for (const [label, cb, color, border] of stops) {
      UI.btn(ctx, px + 20, y, pw - 40, 46, label, cb, { size: 15, color, border });
      y += 54;
    }
    y += 8;
    UI.btn(ctx, px + 20, y, pw - 40, 46, '↩   BACK TO THE WILDS',
      () => { UI.townMode = false; UI.close(); },
      { size: 15, color: '#6ff7c3', border: '#3a7a6a' });
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
    const by = H * 0.56;
    const has = Profiles.count() > 0;
    UI.btn(ctx, cx - bw / 2, by, bw, 46, has ? 'CHOOSE YOUR HERO' : 'BEGIN',
      () => UI.open('select'), { size: 16, border: '#57b894', color: '#6ff7c3' });
    if (has) {
      ctx.font = '11px Georgia'; ctx.fillStyle = '#6f6552'; ctx.textAlign = 'center';
      ctx.fillText(Profiles.count() + ' / ' + Profiles.MAX + ' Nekromancers by the fire', cx, by + 62);
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
    ctx.fillText(this.fitText(ctx, Hero.name + '  ·  Level ' + Hero.level, pw - 120), px + 14, 76);
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
      ['⛰ THE WILDS', () => UI.open('wilds'), '#6ff7c3'],
      ['INVENTORY', () => UI.open('radial'), '#e8e0cc'],
      ['SKILLS & PASSIVES', () => UI.open('skills'), '#e8e0cc'],
      ['STASH', () => UI.open('stash'), '#8fb0e8'],
      ['BLACKSMITH', () => UI.open('smith'), '#ffb43a'],
      ['JEWELER', () => UI.open('jeweler'), '#b06adf'],
      ['MYSTIC', () => UI.open('mystic'), '#4ecbe0'],
      ['SETTINGS', () => UI.open('settings'), '#9a9080']
    ];
    const cols = W > 560 ? 2 : 1;
    const bw = cols === 2 ? (pw - 12) / 2 : pw;
    const rowH = cols === 1 ? Math.min(52, (H - (56 + panelH) - 46) / items.length) : 56;
    const showUpgrade = Items.anyUpgrade();
    items.forEach(([label, cb, col], i) => {
      const cx2 = px + (i % cols) * (bw + 12);
      const cy2 = 56 + panelH + 16 + Math.floor(i / cols) * rowH;
      UI.btn(ctx, cx2, cy2, bw, rowH - 8, label, cb, {
        size: narrow ? 13 : 15, color: col,
        border: i === 0 ? '#57b894' : undefined,
        disabled: !cb
      });
      // Red "!" on Inventory when a gear upgrade is waiting in the bag.
      if (label === 'INVENTORY' && showUpgrade) {
        const ex = cx2 + bw - 16, ey = cy2 + (rowH - 8) / 2;
        ctx.fillStyle = '#e0402f';
        ctx.beginPath(); ctx.arc(ex, ey, 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#12080a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ex, ey, 8, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', ex, ey + 0.5);
      }
    });
  },

  // -------------------------------------------------------------- wilds
  // The gateway to everything beyond camp.

  wilds(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(540, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 476);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, '⛰ THE WILDS');

    // Global difficulty stepper — set it once here for every mode below.
    const maxDiff = Hero.level >= MAX_LEVEL ? DIFFICULTIES.length - 1 : 3;
    Hero.difficulty = Math.min(Hero.difficulty, maxDiff);
    const sdw = Math.min(320, pw - 40);
    const sdx = W / 2 - sdw / 2;
    UI.btn(ctx, sdx, py + 46, 40, 32, '◀', () => {
      Hero.difficulty = Math.max(0, Hero.difficulty - 1); Hero.save();
    }, { size: 14 });
    UI.btn(ctx, sdx + sdw - 40, py + 46, 40, 32, '▶', () => {
      Hero.difficulty = Math.min(maxDiff, Hero.difficulty + 1); Hero.save();
    }, { size: 14 });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = Hero.difficulty >= 4 ? '#e04a5a' : '#ffd76a';
    ctx.fillText('Difficulty: ' + DIFFICULTIES[Hero.difficulty].name, W / 2, py + 56);
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#9a9080';
    const D = DIFFICULTIES[Hero.difficulty];
    ctx.fillText('monsters ×' + D.mult + '  ·  rewards ×' + D.reward +
      (Hero.level < MAX_LEVEL ? '  ·  Torment unlocks at level 70' : (D.legBonus ? '  ·  +' + (D.legBonus * 100).toFixed(1) + '% legendary' : '')),
      W / 2, py + 72);

    const at70 = Hero.level >= MAX_LEVEL;
    const rows = [
      ['BOUNTIES', 'The lands of Sanctuary — hunt each land\'s unique boss', '#6ff7c3',
        () => { UI.close(); Game.state = 'map'; }],
      ['STORY MODE — ACT I', 'Hunt 10 ghost lords across the lands, then the Skeleton King', '#ff8c2a',
        () => { UI.close(); Game.startStory(1); }],
      ['ADVENTURE MODE', 'A randomized land at your level, new every visit', '#ffd76a',
        () => { UI.close(); Game.startAdventure(); }],
      ['RIFT  (levels 1–69)', 'Gather 250 orb points from rare elites, then slay the Guardian', '#b06adf',
        () => { UI.close(); Game.startRift('normal'); }],
      ['NEPHALEM RIFT  (level 70)', at70
        ? 'Uses a Nephalem Rift Key · 750 points · Guardians drop Master keys & set pieces'
        : 'Opens at level 70 · requires a Nephalem Rift Key', '#4ade80',
        at70 && Hero.riftKeys > 0 ? () => { UI.close(); Game.startRift('greater'); } : null],
      ['SEASONS', at70 ? SEASON.name : 'The season begins at level 70', '#4ade80',
        at70 ? () => UI.open('season') : null]
    ];
    let y = py + 90;
    for (const [label, desc, col, cb] of rows) {
      UI.btn(ctx, px + 16, y, pw - 32, 50, '', cb, { disabled: !cb });
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = cb ? col : '#5c5569';
      ctx.fillText(label, px + 30, y + 18);
      ctx.font = '11px Georgia';
      ctx.fillStyle = cb ? '#9a9080' : '#453f52';
      ctx.fillText(this.fitText(ctx, desc, pw - 60), px + 30, y + 35);
      y += 55;
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#b06adf';
    ctx.fillText('◈ Nephalem Keys: ' + Hero.riftKeys + '   ·   ◈ Master Keys: ' + Hero.masterKeys +
      '   ·   Cleared: ' + Hero.riftsCleared, W / 2, y + 8);
  },

  // ---------------------------------------------------------------- map

  map(ctx, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('BOUNTIES OF SANCTUARY', W / 2, 30);

    // Difficulty stepper — Torment I–XVI unlock at level 70.
    const maxDiff = Hero.level >= MAX_LEVEL ? DIFFICULTIES.length - 1 : 3;
    Hero.difficulty = Math.min(Hero.difficulty, maxDiff);
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
    const D = DIFFICULTIES[Hero.difficulty];
    ctx.fillText(`monsters ×${D.mult}  ·  rewards ×${D.reward}` +
      (D.legBonus ? `  ·  +${(D.legBonus * 100).toFixed(1)}% legendary` : ''), W / 2, 84);
    if (Hero.level < MAX_LEVEL) {
      ctx.fillStyle = '#544d44';
      ctx.fillText('Torment I–XVI unlock at level 70', W / 2, 96);
    }

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
    // Bounties is a full state, not an overlay — give it its own red ✕.
    const sfa = UI.safe || { top: 0, right: 0 };
    this.closeX(ctx, W, { x: W - 26 - sfa.right, y: 26 + sfa.top, cb: () => { Game.state = 'camp'; } });
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
      case 'torch': {
        // Flame atop a short haft.
        ctx.beginPath(); ctx.moveTo(x, y + r * 0.5); ctx.lineTo(x, y - r * 0.05); ctx.stroke();
        ctx.fillStyle = '#ffb24a';
        ctx.beginPath();
        ctx.moveTo(x, y - r * 0.55);
        ctx.quadraticCurveTo(x + r * 0.32, y - r * 0.15, x, y - r * 0.02);
        ctx.quadraticCurveTo(x - r * 0.32, y - r * 0.15, x, y - r * 0.55);
        ctx.closePath(); ctx.fill();
        break;
      }
      default: // rings
        ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.3, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r * 0.12, y - r * 0.25); ctx.lineTo(x, y - r * 0.45); ctx.lineTo(x + r * 0.12, y - r * 0.25);
        ctx.closePath(); ctx.fill();
    }
  },

  radial(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const p = Game.player;
    const slots = Object.keys(ITEM_SLOTS);
    if (!UI.sel.slot) UI.sel.slot = 'weapon';

    // On narrow (portrait phone) screens the wheel shrinks hard so the
    // equipped card, bag list and EQUIP/SALVAGE/SOCKET actions all fit below.
    const narrow = W < 620;
    const cx = narrow ? W / 2 : W * 0.26;
    const cy = narrow ? 116 : H * 0.5;
    const R = narrow ? Math.min(78, W * 0.30) : Math.min(150, H * 0.32);
    const chipR = narrow ? 19 : 25;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (narrow ? 14 : 17) + 'px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('EQUIPMENT', cx, cy - R - chipR - 8);

    // In the wilds, a blue TOWN PORTAL opposite the red ✕ — nip back to the
    // artisans & stash, then return to the fight (owner request).
    if (Game.state === 'playing') {
      const sf = UI.safe || { top: 0, left: 0 };
      this.portalBtn(ctx, 26 + sf.left, 26 + sf.top, () => { UI.townMode = true; UI.open('town'); });
    }

    // Upper-left live stat readout (owner request) — at a glance, what your gear
    // gives: damage, crit, gold find, life, life/s, essence/s.
    {
      const sf2 = UI.safe || { top: 0, left: 0 };
      const st = Items.computeStats();
      const rows = [
        ['DMG', '×' + st.dmgMult.toFixed(2), '#6ff7c3'],
        ['CRIT', Math.round(st.critChance * 100) + '%', '#ffb43a'],
        ['GOLD', '+' + Math.round((st.goldFind - 1) * 100) + '%', '#ffd76a'],
        ['LIFE', '' + st.maxHp, '#e04a5a'],
        ['LIFE/s', st.hpRegen.toFixed(1), '#e0808a'],
        ['ESS/s', st.essenceRegen.toFixed(1), '#8fb0e8']
      ];
      let sy = 50 + sf2.top;
      ctx.textBaseline = 'middle';
      for (const [lbl, val, col] of rows) {
        ctx.textAlign = 'left';
        ctx.font = '9px Georgia';
        ctx.fillStyle = '#8a8070';
        ctx.fillText(lbl, 10 + sf2.left, sy);
        ctx.font = 'bold 11px Georgia';
        ctx.fillStyle = col;
        ctx.fillText(val, 52 + sf2.left, sy);
        sy += 15;
      }
    }

    // Character summary in the wheel's hub.
    ctx.font = 'bold ' + (narrow ? 9 : 12) + 'px Georgia';
    ctx.fillStyle = '#6ff7c3';
    if (p) {
      const gap = narrow ? 11 : 16;
      ctx.fillText('DMG ×' + p.dmgMult.toFixed(2), cx, cy - gap);
      ctx.fillStyle = '#e04a5a';
      ctx.fillText('LIFE ' + p.maxHp, cx, cy);
      ctx.fillStyle = '#ffb43a';
      ctx.fillText('CRIT ' + Math.round(p.critChance * 100) + '%', cx, cy + gap);
    }

    // The wheel.
    slots.forEach((slot, i) => {
      const a = -Math.PI / 2 + i * TAU / slots.length;
      const bx = cx + Math.cos(a) * R;
      const by = cy + Math.sin(a) * R;
      const it = Hero.equipped[slot];
      const selected = UI.sel.slot === slot;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, by, chipR, 0, TAU); ctx.fill();
      ctx.strokeStyle = it ? RARITIES[it.rarity].color : '#3a3448';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath(); ctx.arc(bx, by, chipR, 0, TAU); ctx.stroke();
      this.slotGlyph(ctx, slot, bx, by, chipR - 3);
      if (it && it.gems) {
        it.gems.forEach((g, gi) => {
          ctx.fillStyle = GEM_TYPES[g.type].color;
          ctx.beginPath(); ctx.arc(bx + chipR * 0.68 - gi * 6, by - chipR * 0.68, 3.5, 0, TAU); ctx.fill();
        });
      }
      // Red "!" badge: a better item for this slot is waiting in the bag.
      if (Items.slotHasUpgrade(slot)) {
        const ex = bx - chipR * 0.72, ey = by - chipR * 0.72;
        ctx.fillStyle = '#e0402f';
        ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#12080a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('!', ex, ey + 0.5);
      }
      UI.tip(bx - chipR - 3, by - chipR - 3, chipR * 2 + 6, chipR * 2 + 6,
        it ? it.name : ITEM_SLOTS[slot].label,
        it ? Items.statLines(it).join(' · ') : 'Empty ' + ITEM_SLOTS[slot].label + ' slot');
      UI.register(bx - chipR - 3, by - chipR - 3, chipR * 2 + 6, chipR * 2 + 6, () => {
        UI.sel.slot = slot;
        UI.sel.item = null;
        UI.sel.gemPick = false;
        UI.sel.scrollY = 0;   // fresh slot → back to the top of the bag list
      });
    });

    // Detail column.
    const dx = narrow ? 12 : W * 0.48;
    const dw = narrow ? W - 24 : W * 0.48;
    let dy = narrow ? cy + R + chipR + 22 : 54;
    const slot = UI.sel.slot;
    const equipped = Hero.equipped[slot];
    const fam = Items.slotFamily(slot);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(ITEM_SLOTS[slot].label.toUpperCase() + ' — EQUIPPED', dx, dy);
    dy += 10;
    dy = this.itemCard(ctx, dx, dy, dw, equipped, null, false);

    // Quick re-equip: hold onto the piece you just swapped out so you can put it
    // back with ONE tap, without hunting through the bag (owner request).
    const ls = Game.lastSwap;
    if (ls && ls.item && fam.includes(ls.item.slot) && ls.item !== equipped && Hero.bag.includes(ls.item)) {
      UI.btn(ctx, dx, dy + 2, dw, 26, '↺  RE-WEAR:  ' + ls.item.name,
        () => { Items.equip(ls.item, slot); UI.sel.item = null; },
        { size: 11, border: '#5f7ab0', color: '#8fb0e8' });
      dy += 30;
    }

    // Inventory capacity + purchasable expansion. This is the BAG that fills up
    // from combat loot and crafting — NOT the shared Stash vault.
    const up = Hero.nextBagUpgrade();
    if (up) {
      const afford = Hero.gold >= up.cost;
      const gshort = n => n >= 1e6 ? (n / 1e6) + 'm' : n >= 1000 ? (n / 1000) + 'k' : '' + n;
      UI.btn(ctx, dx, dy + 4, dw, 26,
        'INVENTORY ' + Hero.bag.length + '/' + Hero.BAG_SIZE + '  —  EXPAND → ' + up.size + ' (' + gshort(up.cost) + 'g)',
        afford ? () => Hero.buyBagUpgrade() : null,
        { size: 10, disabled: !afford, border: '#8a6f4a', color: '#ffd76a' });
    } else {
      ctx.textAlign = 'left'; ctx.font = '11px Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText('INVENTORY ' + Hero.bag.length + '/' + Hero.BAG_SIZE + ' (max size)', dx, dy + 16);
    }
    dy += 34;

    // ---- Scrollable inventory region: bag list + selected card + actions.
    // Drag it up/down (touch, mouse or wheel) so tall items — 3★ legendaries,
    // artifacts — never leak their EQUIP/SALVAGE/SOCKET/STASH buttons off the
    // bottom of the screen (owner rule). Everything above stays pinned.
    // Sort the bag list by UPGRADE so the good stuff is always at the top:
    // ▲▲▲ → ▲▲ → ▲ → — → ▼ → ▼▼ → ▼▼▼ (owner request). Arrows precomputed once.
    const bagItems = Hero.bag.filter(it => fam.includes(it.slot))
      .map(it => ({ it, arrows: Items.compareArrows(it, equipped) }))
      .sort((a, b) => b.arrows - a.arrows || RARITIES[b.it.rarity].mult - RARITIES[a.it.rarity].mult);
    const listTop = dy;
    const viewBot = H - 12;
    const viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: dx - 4, y: listTop - 4, w: dw + 8, h: viewH + 8 };

    ctx.save();
    ctx.beginPath();
    ctx.rect(dx - 4, listTop - 4, dw + 8, viewH + 8);
    ctx.clip();

    let c = listTop;   // content-space cursor; draw at (c - scrollY)
    const vis = (top, h) => (top - scrollY + h > listTop) && (top - scrollY < viewBot);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('IN BAG (' + bagItems.length + ')', dx, c - scrollY + 14);
    c += 24;

    if (!bagItems.length) {
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#6f6552';
      ctx.fillText('No ' + ITEM_SLOTS[slot].label.toLowerCase() + ' items in your bag.', dx, c - scrollY + 12);
      c += 22;
    }
    bagItems.forEach(({ it, arrows }) => {
      const yy = c - scrollY;
      if (vis(c, 30)) {
        const selected = UI.sel.item === it;
        UI.btn(ctx, dx, yy, dw, 30, '', () => {
          const now = (UI.sel.item === it) ? null : it;
          UI.sel.item = now;
          UI.sel.gemPick = false;
          if (now) UI.sel.scrollToBottom = true;   // auto-reveal its action buttons
        }, { bg: selected ? 'rgba(60,52,78,0.95)' : 'rgba(28,24,38,0.92)' });
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Georgia';
        ctx.fillStyle = RARITIES[it.rarity].color;
        ctx.fillText(this.fitText(ctx, it.name, dw - 70), dx + 10, yy + 15);
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px Georgia';
        if (arrows === 3) {
          // Best-in-slot upgrades: the ▲▲▲ bob up/down and pulse green, all in
          // sync (shared Game.time phase) so the eye is drawn straight to them.
          const ph = (Game.time || 0) * 4.2;
          const bob = Math.sin(ph) * 2;
          const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(ph));
          ctx.fillStyle = `rgba(74,222,128,${pulse.toFixed(3)})`;
          ctx.fillText('▲▲▲', dx + dw - 10, yy + 15 + bob);
        } else {
          ctx.fillStyle = arrows > 0 ? '#4ade80' : arrows < 0 ? '#e04a5a' : '#9a9080';
          ctx.fillText(arrows > 0 ? '▲'.repeat(arrows) : arrows < 0 ? '▼'.repeat(-arrows) : '—', dx + dw - 10, yy + 15);
        }
      }
      c += 34;
    });

    // Selected bag item: card + 4-button action row (EQUIP · SALVAGE · SOCKET · STASH).
    if (UI.sel.item) {
      c += 6;
      c = this.itemCard(ctx, dx, c - scrollY, dw, UI.sel.item, equipped, true) + scrollY;
      const yy = c - scrollY;
      const bw = (dw - 24) / 4;
      if (vis(c, 34)) {
        UI.btn(ctx, dx, yy, bw, 34, 'EQUIP', () => {
          Items.equip(UI.sel.item, slot);
          UI.sel.item = null;
        }, { border: '#57b894', color: '#6ff7c3', size: 12 });
        const canSalv = Items.canSalvage(UI.sel.item);
        UI.btn(ctx, dx + bw + 8, yy, bw, 34, canSalv ? 'SALVAGE' : 'L' + Items.salvageReq(UI.sel.item),
          canSalv ? () => { Items.salvage(UI.sel.item); UI.sel.item = null; } : null,
          { disabled: !canSalv, border: '#8a6f4a', color: '#ffb43a', size: 12 });
        const canSocket = !!UI.sel.item.sockets;
        UI.btn(ctx, dx + (bw + 8) * 2, yy, bw, 34, 'SOCKET', canSocket ? () => {
          UI.sel.gemTarget = UI.sel.item;
          UI.sel.gemPick = true;
          UI.sel.gemKey = undefined;
        } : null, { disabled: !canSocket, border: '#7a4a8f', color: '#b06adf', size: 12 });
        // STASH: deposit this single item into the shared, account-wide vault.
        const stashFull = Hero.stash.length >= Hero.STASH_SIZE;
        UI.btn(ctx, dx + (bw + 8) * 3, yy, bw, 34, stashFull ? 'FULL' : 'STASH',
          stashFull ? null : () => { if (Items.toStash(UI.sel.item)) UI.sel.item = null; },
          { disabled: stashFull, border: '#5f7ab0', color: '#8fb0e8', size: 12 });
      }
      c += 34;
    } else if (equipped && (equipped.sockets || (equipped.gems && equipped.gems.length))) {
      // Socket management for the equipped piece opens the gem popup.
      if (vis(c, 36)) {
        UI.btn(ctx, dx, c - scrollY + 6, 150, 30, (equipped.gems && equipped.gems.length) ? 'MANAGE SOCKETS' : 'SOCKET GEM', () => {
          UI.sel.gemTarget = equipped;
          UI.sel.gemPick = true;
          UI.sel.gemKey = undefined;
        }, { border: '#7a4a8f', color: '#b06adf', size: 12 });
      }
      c += 40;
    }

    ctx.restore();

    // Scroll range for next frame; snap to the actions when an item was just picked.
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
    if (UI.sel.scrollToBottom) { UI.sel.scrollY = UI.sel.scrollMax; UI.sel.scrollToBottom = false; }
    // Fade hints when there's more content above/below the fold.
    ctx.textAlign = 'center';
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', dx + dw / 2, listTop + 4);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', dx + dw / 2, viewBot - 1);

    // The socketing popup, drawn over everything.
    if (UI.sel.gemPick) this.gemModal(ctx, W, H);
  },

  // Centered popup: inspect gems, then socket / unsocket / cancel.
  gemModal(ctx, W, H) {
    const target = UI.sel.gemTarget;
    if (!target) { UI.sel.gemPick = false; return; }
    this.dim(ctx, W, H);
    // Swallow every tap behind the popup; only ✕ / CANCEL dismiss it.
    UI.register(0, 0, W, H, () => { /* blocked by popup */ });
    const pw = Math.min(430, W - 20);
    const px = W / 2 - pw / 2;
    // Group identical gems (type+tier) into stacks so the pouch reads as
    // "Perfect ×12", not a dozen separate chips.
    const groupsMap = {};
    for (let i = 0; i < Hero.gems.length; i++) {
      const g = Hero.gems[i];
      if (UI.sel.gemFilter && g.type !== UI.sel.gemFilter) continue;
      const key = g.type + ':' + g.tier;
      if (!groupsMap[key]) groupsMap[key] = { key, type: g.type, tier: g.tier, count: 0, idx: i };
      groupsMap[key].count++;
    }
    const groups = Object.values(groupsMap).sort((a, b) => b.tier - a.tier);
    const shown = groups.slice(0, 12);
    const rows = Math.max(1, Math.ceil(shown.length / 4));
    const selGroup = UI.sel.gemKey ? groupsMap[UI.sel.gemKey] : null;
    const hasInfo = !!selGroup;
    const gems = target.gems || [];
    const emptyCount = (target.sockets || 0) - gems.length;
    const ph = Math.min(H - 12,
      118 + gems.length * 30 + (emptyCount > 0 ? 18 : 0) + (Hero.gems.length ? 28 : 0)
        + rows * 36 + (hasInfo ? 72 : 0) + 46);
    const py = Math.max(6, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SOCKET GEM');
    UI.register(px, py, pw, ph, () => { /* dead space inside the popup */ });

    const close = () => {
      UI.sel.gemPick = false;
      UI.sel.gemKey = undefined;
      UI.sel.gemTarget = null;
    };
    this.closeX(ctx, W, { x: px + pw - 20, y: py + 20, cb: close });

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = RARITIES[target.rarity].color;
    ctx.fillText(this.fitText(ctx, target.name, pw - 32), px + 16, py + 50);
    let y = py + 64;

    // Currently socketed gems, each with a free unsocket. (Tier only — the
    // chip colour says which gem; the info card has the full name.)
    gems.forEach((g, gi) => {
      const gm = GEM_TYPES[g.type];
      ctx.font = '11px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText(this.fitText(ctx, '◆ ' + GEM_TIERS[g.tier] + ' — ' + gm.label(gemStatValue(g)), pw - 170), px + 16, y + 8);
      UI.btn(ctx, px + pw - 136, y - 6, 120, 24, 'UNSOCKET', () => {
        Items.unsocket(target, gi);
        UI.sel.gemKey = undefined;
      }, { size: 10, border: '#7a4a8f', color: '#b06adf' });
      y += 30;
    });
    if (emptyCount > 0) {
      ctx.font = 'italic 10px Georgia';
      ctx.fillStyle = '#6f6552';
      ctx.fillText('◇ ' + emptyCount + ' empty socket' + (emptyCount > 1 ? 's' : ''), px + 16, y + 8);
      y += 18;
    }

    // Filter chips: All + one per gem type (sorted by tier, finest first).
    if (Hero.gems.length) {
      const types = Object.keys(GEM_TYPES);
      const chipW = (pw - 32) / (types.length + 1);
      UI.btn(ctx, px + 16, y, chipW - 4, 22, 'All', () => { UI.sel.gemFilter = null; UI.sel.gemKey = undefined; },
        { size: 9, bg: !UI.sel.gemFilter ? 'rgba(70,44,90,0.95)' : undefined, color: '#c9bfa8' });
      types.forEach((t, ti) => {
        const on = UI.sel.gemFilter === t;
        UI.btn(ctx, px + 16 + (ti + 1) * chipW, y, chipW - 4, 22, GEM_TYPES[t].name.slice(0, 3),
          () => { UI.sel.gemFilter = on ? null : t; UI.sel.gemKey = undefined; },
          { size: 9, color: GEM_TYPES[t].color, bg: on ? 'rgba(70,44,90,0.95)' : undefined, border: on ? GEM_TYPES[t].color : undefined });
      });
      y += 28;
    }

    // Gem pouch grid — tap to read what each does.
    if (!shown.length) {
      ctx.font = 'italic 12px Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText(Hero.gems.length ? 'No gems match this filter.' : 'No gems in your pouch — monsters, chests and rifts drop them.', px + 16, y + 14);
      y += 36;
    } else {
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('TAP A GEM TO INSPECT' + (groups.length > 12 ? '  (+' + (groups.length - 12) + ' more)' : ''), px + 16, y);
      y += 10;
      shown.forEach((grp, k) => {
        const gx = px + 16 + (k % 4) * ((pw - 32) / 4);
        const gy = y + Math.floor(k / 4) * 36;
        const selected = UI.sel.gemKey === grp.key;
        UI.btn(ctx, gx, gy, (pw - 32) / 4 - 6, 30, GEM_TIERS[grp.tier] + (grp.count > 1 ? ' ×' + grp.count : ''), () => {
          UI.sel.gemKey = selected ? undefined : grp.key;
        }, {
          size: 9, color: GEM_TYPES[grp.type].color,
          bg: selected ? 'rgba(70,44,90,0.95)' : undefined,
          border: selected ? GEM_TYPES[grp.type].color : undefined
        });
      });
      y += rows * 36 + 4;
    }

    // Info card for the inspected gem stack.
    if (hasInfo) {
      const g = { type: selGroup.type, tier: selGroup.tier };
      const gm = GEM_TYPES[g.type];
      ctx.fillStyle = 'rgba(20,17,28,0.94)';
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.fill();
      ctx.strokeStyle = gm.color;
      ctx.lineWidth = 1.5;
      rr(ctx, px + 16, y, pw - 32, 62, 6); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText('◆ ' + gemName(g) + (selGroup.count > 1 ? '  (×' + selGroup.count + ')' : ''), px + 28, y + 16);
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#b5ab94';
      ctx.fillText('When socketed: ' + gm.label(gemStatValue(g)), px + 32, y + 33);
      ctx.font = '11px Georgia';
      ctx.fillStyle = '#8a6f4a';
      ctx.fillText(emptyCount > 0 ? 'Fills an empty socket' : 'No empty socket — unsocket one first', px + 32, y + 49);
      y += 70;
    }

    // Actions.
    const bw2 = (pw - 40) / 2;
    const canSock = hasInfo && emptyCount > 0;
    UI.btn(ctx, px + 16, y, bw2, 36, 'SOCKET IT', canSock ? () => {
      Items.socketGem(target, selGroup.idx);
      close();
    } : null, { disabled: !canSock, border: '#7a4a8f', color: '#b06adf', size: 13 });
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
      ctx.fillStyle = ln[0] === '◆' ? '#8fe8c8' : ln[0] === '◇' ? '#6f6552'
        : ln[0] === '❢' ? '#ff9a6a' : ln[0] === '★' ? '#ff8c2a'
        : ln[0] === '◈' ? '#4ade80' : '#b5ab94';
      ctx.fillText(ln, x + 16, y + 32 + i * 15);
    });
    return y + h + 8;
  },

  // ------------------------------------------------------ skills screen

  skills(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
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
      const runes = s.cat && typeof SKILL_RUNES !== 'undefined' ? SKILL_RUNES[s.id] : null;
      if (runes && s.lvl <= Hero.level) {
        // Rune picker: tap to choose how this skill behaves.
        ctx.fillStyle = '#6f6552';
        ctx.font = 'bold 10px Georgia';
        ctx.fillText('RUNE', px + 12, fy + 63);
        const bx0 = px + 48;
        const bw = Math.min(160, (pw - 62 - (runes.length - 1) * 6) / runes.length);
        runes.forEach((r, ri) => {
          const locked = r.lvl && Hero.level < r.lvl;
          const active = (Hero.runes[s.id] || 'base') === r.id && !locked;
          UI.tip(bx0 + ri * (bw + 6), fy + 52, bw, 22,
            r.name + (locked ? '  (lvl ' + r.lvl + ')' : ''), r.desc);
          UI.btn(ctx, bx0 + ri * (bw + 6), fy + 52, bw, 22,
            this.fitText(ctx, locked ? r.name + ' L' + r.lvl : r.name, bw - 8), locked ? null : () => {
              Hero.runes[s.id] = r.id;
              Hero.save();
              UI.toast(r.name + ': ' + r.desc, '#6ff7c3');
            }, {
            size: 10, disabled: locked,
            bg: active ? 'rgba(70,44,90,0.95)' : undefined,
            border: active ? '#6ff7c3' : undefined,
            color: active ? '#6ff7c3' : undefined
          });
        });
      } else {
        ctx.fillStyle = '#6f6552';
        ctx.font = '11px Georgia';
        ctx.fillText(
          this.fitText(ctx,
            s.cat ? `unlocks at level ${s.lvl}${s.cost ? ' · ' + s.cost + ' essence' : ''}${s.cd >= 2 ? ' · ' + s.cd + 's cooldown' : ''}` : `unlocks at level ${s.lvl}`,
            pw - 24),
          px + 12, fy + 65);
      }
    }
  },

  skillsActives(ctx, W, H, px, pw) {
    // Loadout slots.
    const sy = 96;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('LOADOUT — tap a slot, then a skill', px, sy - 14);
    const nSlots = Hero.loadout.length; // 7: primary · secondary · skills 1-5
    const sw = pw / nSlots;
    const cr = Math.min(23, sw / 2 - 3);
    for (let i = 0; i < nSlots; i++) {
      const bx = px + i * sw + sw / 2;
      const selected = UI.sel.slotIdx === i;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, sy + 20, cr, 0, TAU); ctx.fill();
      ctx.strokeStyle = selected ? '#6ff7c3' : '#3a3448';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath(); ctx.arc(bx, sy + 20, cr, 0, TAU); ctx.stroke();
      const id = Hero.loadout[i];
      if (id) SKILL_ICONS[id](ctx, bx, sy + 20, cr - 3);
      else {
        ctx.fillStyle = '#3a3448';
        ctx.font = '20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('+', bx, sy + 21);
      }
      ctx.fillStyle = '#6f6552';
      ctx.font = i === 1 ? '8px Georgia' : '9px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? 'PRIMARY' : i === 1 ? 'SECONDARY' : 'SKILL ' + (i - 1), bx, sy + 50);
      UI.register(bx - sw / 2 + 2, sy - 5, sw - 4, 62, () => {
        UI.sel.slotIdx = i;
        // Name the skill already in this slot in the info footer, so you don't
        // have to hunt for it in the grid below.
        const sid = Hero.loadout[i];
        UI.sel.info = sid ? (SKILL_DATA.find(s => s.id === sid) || null) : null;
      });
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
      UI.tip(gx - iconR - 2, gyy - iconR - 2, iconR * 2 + 4, iconR * 2 + 4,
        s.name + (locked ? '  (lvl ' + s.lvl + ')' : ''), SKILL_DESCS[s.id]);
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
    const nPassiveSlots = PASSIVE_SLOT_LEVELS.length;
    const sw = pw / nPassiveSlots;
    for (let i = 0; i < nPassiveSlots; i++) {
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
      UI.tip(cx2, y, colW2, 26, s.name + (locked ? '  (lvl ' + s.lvl + ')' : ''), s.desc);
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
    // Compact, measured labels that never spill off narrow phones. Shows the
    // FORGE reagents only — including Souls (legendary/artifact salvage) right
    // next to Crystals; gold is abbreviated so nothing gets clipped. Torch
    // reagents (lumber/rivets/heart) live on the torch bench.
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    const gs = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 1e4 ? (n / 1e3).toFixed(0) + 'k' : '' + n;
    const short = { parts: 'Parts', dust: 'Dust', crystal: 'Cryst', soul: 'Souls' };
    const parts = [[gs(Hero.gold) + 'g', '#ffd76a']];
    for (const key of ['parts', 'dust', 'crystal', 'soul']) {
      parts.push([(Hero.mats[key] || 0) + ' ' + short[key], MATERIALS[key].color]);
    }
    let cx = x;
    for (const [txt, col] of parts) {
      const tw = ctx.measureText(txt).width;
      if (cx + tw > x + w - 12) break;
      ctx.fillStyle = col;
      ctx.fillText(txt, cx, y);
      cx += tw + Math.min(16, w * 0.035);
    }
  },

  smith(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 480);
    UI.panel(ctx, px, 46, pw, ph, 'HAEDRIG — BLACKSMITH');
    this.artisanRow(ctx, px, pw, 88, 'smith', 'FORGE');
    this.matsRow(ctx, px + 16, 114, pw - 32);

    // Bulk salvage row (ease of access). Epics unlock at smith 8, Legendaries at
    // smith 10; single items always break down free from the Inventory wheel.
    const half = (pw - 40) / 2;
    const q = (pw - 32 - 3 * 6) / 4;
    const epicLvl = Items.BULK_SALVAGE_SMITH.epic, legLvl = Items.BULK_SALVAGE_SMITH.legendary;
    const epicOk = Hero.artisans.smith >= epicLvl, legOk = Hero.artisans.smith >= legLvl;
    UI.btn(ctx, px + 16 + 0 * (q + 6), 124, q, 32, 'COM+MAG', () => Items.salvageJunk(),
      { size: 10, border: '#8a6f4a', color: '#ffb43a' });
    UI.btn(ctx, px + 16 + 1 * (q + 6), 124, q, 32, 'RARES', () => Items.salvageRares(),
      { size: 10, border: '#8a6f4a', color: '#ffd76a' });
    UI.btn(ctx, px + 16 + 2 * (q + 6), 124, q, 32, epicOk ? 'EPICS' : 'EPICS S' + epicLvl, () => Items.salvageEpics(),
      { size: 10, border: '#7a4a8f', color: epicOk ? '#b06adf' : '#6f5a7a' });
    UI.btn(ctx, px + 16 + 3 * (q + 6), 124, q, 32, legOk ? 'LEGENDS' : 'LEG S' + legLvl, () => Items.salvageLegendaries(),
      { size: 10, border: '#8a5a2a', color: legOk ? '#ff8c2a' : '#7a5f45' });

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
    // Forge band — smith level pins the gear level the Blacksmith can make —
    // shown alongside the quality note on one line so the slot grid stays put.
    const [flo, fhi] = Items.smithRange();
    ctx.font = '10px Georgia';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffb43a';
    const bandTxt = 'Forges lvl ' + flo + '–' + fhi + '.  ';
    ctx.fillText(bandTxt, px + 16, 220);
    const bandW = ctx.measureText(bandTxt).width;
    ctx.fillStyle = UI.sel.master ? '#ffd76a' : '#6f6552';
    ctx.fillText(this.fitText(ctx, UI.sel.master
      ? 'Masterwork: Rare+ guaranteed, 50% socket.'
      : 'Standard: a quick roll for the slot.', pw - 32 - bandW), px + 16 + bandW, 220);

    // Torches are recipe-crafted, not random-forged — keep them off the roll grid.
    const slots = Object.keys(ITEM_SLOTS).filter(s => !ITEM_SLOTS[s].torch);
    const cols = pw >= 480 ? 4 : 3;
    const bw = (pw - 32 - (cols - 1) * 8) / cols;
    slots.forEach((slot, i) => {
      const bx = px + 16 + (i % cols) * (bw + 8);
      const by = 232 + Math.floor(i / cols) * 40;
      UI.btn(ctx, bx, by, bw, 34, ITEM_SLOTS[slot].label, () => Items.craft(slot, UI.sel.master),
        { size: 11, disabled: !afford, border: UI.sel.master ? '#8a6f4a' : undefined });
    });

    const footY = 232 + Math.ceil(slots.length / cols) * 40 + 6;
    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Salvage single items from the Inventory wheel. Gems survive the forge.', pw - 24),
      px + pw / 2, footY);
    // Gateway to the torch-crafting bench.
    UI.btn(ctx, px + 16, footY + 8, pw - 32, 30, '🔥  CRAFT TORCHES  »', () => UI.open('torches'),
      { size: 12, border: '#c8722a', color: '#ffb24a' });
  },

  // The torch-crafting bench. Torches light the darkness for a limited time,
  // then burn out. All three are recipe-built from smashed-scenery reagents
  // and go straight to the Stash for safe keeping.
  torches(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 468);
    UI.panel(ctx, px, 46, pw, ph, 'TORCH BENCH');

    // Reagent tally.
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    const tally = [
      [(Hero.mats.lumber || 0) + ' Lumber', MATERIALS.lumber.color],
      [(Hero.mats.rivets || 0) + ' Rivets', MATERIALS.rivets.color],
      [(Hero.mats.heartstring || 0) + ' Heartstring', MATERIALS.heartstring.color]
    ];
    let tx = px + 16;
    for (const [txt, col] of tally) {
      ctx.fillStyle = col;
      ctx.fillText(txt, tx, 96);
      tx += ctx.measureText(txt).width + 18;
    }
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#8a8070';
    ctx.fillText(this.fitText(ctx,
      'Smash chairs/tables/shelves for Lumber; cauldrons/braziers/pots for Rivets; Nephalem Mongrels drop Heartstring.',
      pw - 32), px + 16, 112);

    // Current torch status.
    const eq = Hero.equipped.torch;
    ctx.font = '11px Georgia';
    if (eq && eq.burnT !== undefined) {
      const mins = Math.floor(eq.burnT / 60), secs = Math.floor(eq.burnT % 60);
      const T = TORCH_TYPES[eq.torch] || TORCH_TYPES.wood;
      ctx.fillStyle = T.color;
      ctx.fillText('Lit: ' + eq.name + '  —  ' + mins + ':' + String(secs).padStart(2, '0') + ' left', px + 16, 132);
    } else {
      ctx.fillStyle = '#6f6552';
      ctx.fillText('No torch lit — darkness closes in.', px + 16, 132);
    }

    // Three craft rows.
    const order = ['wood', 'iron', 'nephalem'];
    let y = 146;
    const rowH = 76;
    for (const type of order) {
      const T = TORCH_TYPES[type];
      const can = Items.canCraftTorch(type);
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, y, pw - 32, rowH - 8, 8); ctx.fill();
      ctx.strokeStyle = can ? T.color : '#3a3448';
      ctx.lineWidth = 1.5;
      rr(ctx, px + 16, y, pw - 32, rowH - 8, 8); ctx.stroke();

      // Name + duration.
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Georgia';
      ctx.fillStyle = T.color;
      ctx.fillText(T.name, px + 28, y + 20);
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('Burns ' + T.minutes + ' min  ·  light radius ' + T.radius, px + 28, y + 36);

      // Recipe (owned / needed per component). Short reagent names + a hard
      // left edge at the CRAFT button so nothing slides under it on phones.
      const shortMat = { lumber: 'Lumber', rivets: 'Rivets', heartstring: 'Heart' };
      ctx.font = (pw < 420 ? 10 : 11) + 'px Georgia';
      let rx = px + 28;
      const recipeRight = px + pw - 128;
      for (const [k, n] of Object.entries(T.recipe)) {
        const have = Hero.mats[k] || 0;
        const label = have + '/' + n + ' ' + (shortMat[k] || MATERIALS[k].name);
        if (rx + ctx.measureText(label).width > recipeRight) break;
        ctx.fillStyle = have >= n ? MATERIALS[k].color : '#a05a5a';
        ctx.fillText(label, rx, y + 54);
        rx += ctx.measureText(label).width + 14;
      }

      // Craft button.
      UI.btn(ctx, px + pw - 118, y + 14, 92, rowH - 36, can ? 'CRAFT' : 'NEED MATS',
        can ? () => Items.craftTorch(type) : null,
        { size: 11, disabled: !can, border: T.color, color: can ? T.color : '#5c5569' });

      y += rowH;
    }

    ctx.textAlign = 'center';
    ctx.font = 'italic 10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Forged torches are sent to your Stash. Equip one from the Inventory wheel.', pw - 24),
      px + pw / 2, y + 6);
    UI.btn(ctx, px + 16, y + 14, pw - 32, 28, '«  BACK TO FORGE', () => UI.open('smith'),
      { size: 11, border: '#6b5f80' });
  },

  jeweler(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
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

    // Socketed gear: pull any gem back out, free of charge.
    let y = 162;
    const socketedRows = [];
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.gems) it.gems.forEach((g, gi) => socketedRows.push({ it, gi, g }));
    }
    for (const { it, gi, g } of socketedRows.slice(0, 3)) {
      const gm = GEM_TYPES[g.type];
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
      ctx.fillText(this.fitText(ctx, gemName(g) + '  in  ' + it.name, pw - 200), px + 44, y + 13);
      UI.btn(ctx, px + pw - 148, y + 1, 132, 24, 'UNSOCKET (free)', () => Items.unsocket(it, gi),
        { size: 10, border: '#7a4a8f', color: '#b06adf' });
      y += 30;
    }
    if (socketedRows.length) y += 4;

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
    // Scrollable stack list — every gem is reachable via the ▲/▼ arrows.
    const panelBot = 46 + Math.min(H - 56, 470);
    const detailNeed = UI.sel.gemKey && groups[UI.sel.gemKey] ? 176 : 0;
    let visRows = Math.max(1, Math.floor((panelBot - 12 - detailNeed - y) / 40));
    let scroll = 0;
    const overflow = keys.length > visRows;
    if (overflow) {
      visRows = Math.max(1, visRows - 1); // reserve a row for the arrows
      scroll = clamp(UI.sel.jewelScroll || 0, 0, keys.length - visRows);
      UI.sel.jewelScroll = scroll;
    }
    keys.slice(scroll, scroll + visRows).forEach(key => {
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
      // Tier only — the chip color names the gem; inspecting reveals the rest.
      ctx.fillText(`${GEM_TIERS[tier]}  ×${n}`, px + 50, y + 17);
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.fillText(selected ? '▾' : 'tap to inspect', px + pw - 26, y + 17);
      y += 40;
    });
    if (overflow) {
      const maxScroll = keys.length - visRows;
      const half = (pw - 40) / 2;
      UI.btn(ctx, px + 16, y, half, 26, '▲', scroll > 0 ? () => { UI.sel.jewelScroll = scroll - 1; } : null,
        { size: 12, disabled: scroll <= 0 });
      UI.btn(ctx, px + 24 + half, y, half, 26, '▼', scroll < maxScroll ? () => { UI.sel.jewelScroll = scroll + 1; } : null,
        { size: 12, disabled: scroll >= maxScroll });
      y += 32;
    }

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
      // Sell for gold.
      y += 40;
      const sell1 = Items.gemSellValue(tier);
      UI.btn(ctx, px + 16, y, halfW, 34, `SELL 1  (${sell1}g)`,
        () => { Items.sellGem(type, tier, false); if ((groups[UI.sel.gemKey] || 0) <= 1) UI.sel.gemKey = null; },
        { size: 11, border: '#8a6f4a', color: '#ffd76a' });
      UI.btn(ctx, px + 24 + halfW, y, halfW, 34, `SELL ALL ×${n}  (${sell1 * n}g)`,
        () => { Items.sellGem(type, tier, true); UI.sel.gemKey = null; },
        { size: 11, border: '#8a6f4a', color: '#ffd76a' });
    }
  },

  // Artisan level + train row shared by the three shops.
  artisanRow(ctx, px, pw, y, which, label) {
    const lvl = Hero.artisans[which];
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(label + '  ·  LEVEL ' + lvl + ' / 10' + (lvl >= 10 ? '  (MAX)' : ''), px + 16, y + 8);
    if (lvl < 10) {
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

  // The numeric token of an affix value ("150%", "18", "3.2"), pulled from its
  // AFFIX_ROLLS label so range text never drifts from the real formatting.
  valTok(key, v) {
    const s = AFFIX_ROLLS[key].label(v);
    const m = s.match(/[+-]?[\d.]+%?/);
    return m ? m[0].replace('+', '') : s;
  },

  mystic(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 480);
    UI.panel(ctx, px, 46, pw, ph, 'MYRIAM — MYSTIC');
    this.artisanRow(ctx, px, pw, 88, 'mystic', 'ENCHANTING');
    UI.sel.scrollRegion = null;   // only the detail view (below) is scrollable

    // ---- pick an item ----
    if (!UI.sel.item) {
      ctx.textAlign = 'left';
      ctx.font = '12px Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('Choose an item, then a property to reroll. Each reroll', px + 16, 112);
      ctx.fillText('stays in that property\'s group — you see the exact odds.', px + 16, 128);
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
    // Fixed header (BACK + count), a SCROLLABLE middle (card + affix list +
    // odds), and a PINNED footer (cost + reroll) so the button is always
    // reachable on phones no matter how many affixes the item has.
    const it = UI.sel.item;
    UI.btn(ctx, px + 16, 88, 92, 28, '‹ BACK', () => { UI.sel.item = null; UI.sel.affix = null; UI.sel.scrollY = 0; }, { size: 12 });
    ctx.textAlign = 'right';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText((it.enchants || 0) + ' enchant' + (it.enchants === 1 ? '' : 's') + ' so far', px + pw - 16, 102);

    const shortAffix = { dmg: 'Damage', hp: 'Life', crit: 'Crit', ess: 'Essence', reg: 'Life regen', gold: 'Gold find', armor: 'Armor', move: 'Move speed' };
    if (UI.sel.affix && !affixGroup(UI.sel.affix)) UI.sel.affix = null;   // signatures unselectable
    const cost = Items.enchantCost(it);
    const afford = Items.canAfford(cost);

    // Footer geometry (pinned).
    const footerH = 74;
    const footerTop = 46 + ph - footerH;
    const scrollTop = 116;
    const viewBot = footerTop - 2;
    const viewH = Math.max(60, viewBot - scrollTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px + 2, y: scrollTop, w: pw - 4, h: viewH };

    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 2, scrollTop, pw - 4, viewH);
    ctx.clip();
    let c = 124;   // content-space cursor; draw at (c - scrollY)
    const vis = (top, h) => (top - scrollY + h > scrollTop) && (top - scrollY < viewBot);

    c = this.itemCard(ctx, px + 16, c - scrollY, pw - 32, it, null, true) + scrollY;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#b06adf';
    ctx.fillText('CHOOSE WHICH PROPERTY TO REROLL:', px + 16, c - scrollY + 8);
    c += 18;
    for (const [key, v] of Object.entries(it.stats)) {
      const grp = affixGroup(key);
      const selected = UI.sel.affix === key;
      const yy = c - scrollY;
      if (vis(c, 30)) {
        UI.btn(ctx, px + 16, yy, pw - 32, 30, '', grp ? () => {
          UI.sel.affix = selected ? null : key;
        } : null, { bg: selected ? 'rgba(70,44,90,0.95)' : undefined, border: selected ? '#b06adf' : undefined, disabled: !grp });
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Georgia';
        ctx.fillStyle = !grp ? '#6f6552' : selected ? '#d8b4f0' : '#b5ab94';
        ctx.fillText(AFFIX_ROLLS[key].label(v), px + 28, yy + 15);
        ctx.textAlign = 'right';
        ctx.font = '11px Georgia';
        ctx.fillStyle = !grp ? '#544d44' : selected ? '#b06adf' : '#6a8a5a';
        ctx.fillText(!grp ? 'signature' : selected ? 'will be rerolled ✦' : AFFIX_GROUP_NAME[grp], px + pw - 28, yy + 15);
      }
      c += 34;
    }

    // Reroll odds AND the value range of each outcome, so the player sees how
    // close to a perfect roll they can get (owner rule).
    c += 6;
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = '#9a9080';
    if (UI.sel.affix) {
      if (vis(c, 14)) ctx.fillText('REROLL ODDS  ·  ' + AFFIX_GROUP_NAME[affixGroup(UI.sel.affix)] + ' group', px + 16, c - scrollY + 6);
      c += 16;
      for (const o of Items.enchantOutcomes(it, UI.sel.affix)) {
        const rng = Items.affixRange(it, o.key);
        if (vis(c, 26)) {
          const yy = c - scrollY;
          ctx.textAlign = 'left';
          ctx.font = '11px Georgia';
          ctx.fillStyle = o.current ? '#d8b4f0' : '#b5ab94';
          ctx.fillText('•  ' + shortAffix[o.key] + (o.current ? '  (new value)' : ''), px + 24, yy + 4);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#6a8a5a';
          ctx.fillText(Math.round(o.chance * 100) + '%', px + pw - 24, yy + 4);
          // Range line: min–max the roll can land on, plus the current value.
          ctx.textAlign = 'left';
          ctx.font = '10px Georgia';
          ctx.fillStyle = '#8a7f6c';
          // For the current affix, never show a max BELOW the item's own value
          // (a legacy item may sit above the fresh-roll range).
          const hi = o.current ? Math.max(rng.max, it.stats[o.key] || 0) : rng.max;
          let rtxt = 'rolls ' + this.valTok(o.key, rng.min) + '–' + this.valTok(o.key, hi) + ' (max)';
          if (o.current) rtxt += '   ·   yours ' + this.valTok(o.key, it.stats[o.key]);
          ctx.fillText(rtxt, px + 34, yy + 18);
        }
        c += 28;
      }
      c += 2;
    } else {
      if (vis(c, 14)) ctx.fillText('Select a property to see its reroll odds & value range.', px + 16, c - scrollY + 6);
      c += 18;
    }
    const maxS = MAX_SOCKETS[it.rarity] || 0;
    const room = (it.sockets || 0) < maxS;
    if (vis(c, 14)) {
      ctx.textAlign = 'left';
      ctx.font = '11px Georgia';
      ctx.fillStyle = room ? '#6ff7c3' : '#6f6552';
      ctx.fillText(room
        ? `Rare 10% chance: uncover a gem slot  (${it.sockets || 0}/${maxS})`
        : `Gem slots maxed for ${RARITIES[it.rarity].name}  (${it.sockets || 0}/${maxS})`,
        px + 16, c - scrollY + 4);
    }
    c += 20;
    ctx.restore();

    UI.sel.scrollMax = Math.max(0, (c - scrollTop) - viewH + 4);
    // Scroll affordances.
    ctx.textAlign = 'center';
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, scrollTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag for more ▼', px + pw / 2, viewBot - 1);

    // ---- pinned footer: cost + reroll ----
    ctx.strokeStyle = '#3a3448';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 12, footerTop); ctx.lineTo(px + pw - 12, footerTop); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '11px Georgia';
    let cxp = px + 16;
    ctx.fillStyle = '#9a9080';
    ctx.fillText('Cost: ', cxp, footerTop + 14); cxp += ctx.measureText('Cost: ').width;
    const owned = { gold: Hero.gold, soul: Hero.mats.soul };
    const parts = [];
    if (cost.gold) parts.push(['gold', owned.gold, cost.gold]);
    if (cost.soul) parts.push(['soul' + (cost.soul > 1 ? 's' : ''), owned.soul, cost.soul]);
    parts.forEach(([name, have, need], i) => {
      const txt = need + '/' + have + ' ' + name;
      ctx.fillStyle = have >= need ? '#c9bfa8' : '#e04a5a';
      ctx.fillText(txt, cxp, footerTop + 14); cxp += ctx.measureText(txt).width;
      if (i < parts.length - 1) { ctx.fillStyle = '#6f6552'; ctx.fillText('  ·  ', cxp, footerTop + 14); cxp += ctx.measureText('  ·  ').width; }
    });
    UI.btn(ctx, px + 16, footerTop + 24, pw - 32, 38,
      !UI.sel.affix ? 'SELECT A PROPERTY ABOVE'
        : !afford ? 'NOT ENOUGH GOLD OR SOULS'
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
    // (red ✕ drawn globally by UI.draw, above all content)
    const s = Items.computeStats();
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const twoCol = pw >= 420;
    const ph = Math.min(H - 16, twoCol ? 470 : 620);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, this.fitText(ctx, Hero.name.toUpperCase() + '  ·  LVL ' + Hero.level, pw - 60));
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
    ly = line(lx, ly, 'Armor', s.armor + '  (' + Math.round(s.armorDR * 100) + '% dmg reduced)', '#bfe8f4');
    ly = line(lx, ly, 'Move speed', '+' + Math.round((s.moveSpeed || 0) * 100) + '%', '#6ff7c3');
    ly = line(lx, ly, 'Gold find', '+' + Math.round((s.goldFind - 1) * 100) + '%', '#ffd76a');
    if (s.xpBonus > 0) ly = line(lx, ly, 'Bonus XP', '+' + Math.round(s.xpBonus * 100) + '%', '#ffd76a');
    ly += 6;
    ly = header(lx, ly, '— JOURNEY —', '#b06adf');
    ly = line(lx, ly, 'XP', `${Hero.xp} / ${XP_CURVE(Hero.level)}`);
    ly = line(lx, ly, 'Story acts finished', (Hero.actsCleared || 0) + ' / 100');
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

    // Analysis (leave room for the campfire button at the very bottom).
    ry = header(rx, ry, '— ANALYSIS —', '#e04a5a');
    ctx.textAlign = 'left';
    ctx.font = '11px Georgia';
    ctx.fillStyle = '#b5ab94';
    for (const tip of this.analyze(s)) {
      if (ry > py + ph - 50) break;
      ry = wrapText(ctx, '• ' + tip, rx, ry, colW, 14, 2) + 3;
    }

    // Leave to the campfire roster — switch to another hero or make a new one.
    UI.btn(ctx, px + 16, py + ph - 40, pw - 32, 30, '⌂  CAMPFIRE — CHANGE HERO', () => {
      Hero.save();
      Game.state = 'menu';
      UI.open('select');
    }, { size: 12, border: '#c8722a', color: '#ffb24a' });
  },

  analyze(s) {
    const tips = [];
    // The torch is a convenience light, not gear — never rate it as best/worst
    // or nag about an empty torch slot.
    const gearSlots = Object.keys(ITEM_SLOTS).filter(sl => !ITEM_SLOTS[sl].torch);
    const empty = gearSlots.filter(sl => !Hero.equipped[sl]);
    if (empty.length) tips.push('Empty gear: ' + empty.slice(0, 3).map(sl => ITEM_SLOTS[sl].label).join(', ') + (empty.length > 3 ? '…' : ''));
    let openSockets = 0, worst = null;
    for (const sl of gearSlots) {
      const it = Hero.equipped[sl];
      if (!it) continue;
      openSockets += (it.sockets || 0) - ((it.gems && it.gems.length) || 0);
      if (!worst || Items.score(it) < Items.score(worst)) worst = it;
    }
    if (openSockets) tips.push(openSockets + ' empty socket' + (openSockets > 1 ? 's' : '') + ' — visit the Inventory to add gems');
    if (worst) tips.push('Weakest piece: ' + worst.name + ' (' + ITEM_SLOTS[worst.slot].label + ') — enchant or replace it');
    const freeSlots = Hero.loadout.filter(id => !id).length;
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

  // ------------------------------------------------- stash (100 slots)

  stash(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(640, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 560);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'STASH  (' + Hero.stash.length + ' / ' + Hero.STASH_SIZE + ')');

    if (!UI.sel.stashSort) UI.sel.stashSort = 'score';
    if (!UI.sel.stashFilter) UI.sel.stashFilter = 'all';
    const narrow = pw < 520;

    // Controls, laid out in two clean rows so nothing overlaps on phones:
    //   row 1 — Sort (left) + Search (right);  row 2 — the four filter chips.
    let cy = py + 46;
    const sorts = { score: 'Score', rarity: 'Rarity', slot: 'Slot', name: 'Name' };
    const halfC = (pw - 32 - 8) / 2;
    UI.btn(ctx, px + 16, cy, halfC, 26, 'Sort: ' + sorts[UI.sel.stashSort], () => {
      const o = Object.keys(sorts);
      UI.sel.stashSort = o[(o.indexOf(UI.sel.stashSort) + 1) % o.length];
    }, { size: 11, border: '#6b5f80' });
    UI.btn(ctx, px + 16 + halfC + 8, cy, halfC, 26,
      UI.sel.stashSearch ? '\u{1F50D} ' + this.fitText(ctx, UI.sel.stashSearch, halfC - 34) : '\u{1F50D} Search…', () => {
        let q = null;
        try { q = window.prompt('Search stash by name:', UI.sel.stashSearch || ''); } catch (e) { /* blocked */ }
        if (q !== null) { UI.sel.stashSearch = q.trim() || null; UI.sel.stashScroll = 0; }
      }, { size: 10, border: '#6b5f80' });
    cy += 32;
    const fams = [['all', 'All'], ['weapon', 'Wpn'], ['armor', 'Armor'], ['jewelry', 'Jewel']];
    const cw = (pw - 32 - 3 * 6) / 4;
    fams.forEach((f, i) => {
      UI.btn(ctx, px + 16 + i * (cw + 6), cy, cw, 26, f[1], () => { UI.sel.stashFilter = f[0]; UI.sel.stashScroll = 0; },
        { size: 10, bg: UI.sel.stashFilter === f[0] ? 'rgba(60,52,78,0.95)' : undefined });
    });
    cy += 32;

    UI.btn(ctx, px + 16, cy, pw - 32, 28,
      'DEPOSIT ALL FROM BAG  (bag ' + Hero.bag.length + '/' + Hero.BAG_SIZE + ')',
      Hero.bag.length ? () => Items.depositAll() : null,
      { size: 11, disabled: !Hero.bag.length, border: '#57b894', color: '#6ff7c3' });
    cy += 36;

    // Filter + sort + search the view.
    const famOf = s => (s === 'weapon' || s === 'offhand') ? 'weapon'
      : (s === 'amulet' || s === 'ring1' || s === 'ring2') ? 'jewelry' : 'armor';
    let view = Hero.stash.slice();
    if (UI.sel.stashFilter !== 'all') view = view.filter(it => famOf(it.slot) === UI.sel.stashFilter);
    if (UI.sel.stashSearch) {
      const q = UI.sel.stashSearch.toLowerCase();
      view = view.filter(it => it.name.toLowerCase().includes(q));
    }
    const sortFn = {
      score: (a, b) => Items.score(b) - Items.score(a),
      rarity: (a, b) => b.rarity - a.rarity || Items.score(b) - Items.score(a),
      slot: (a, b) => a.slot.localeCompare(b.slot) || Items.score(b) - Items.score(a),
      name: (a, b) => a.name.localeCompare(b.name)
    }[UI.sel.stashSort];
    view.sort(sortFn);

    if (!view.length) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 12px Georgia'; ctx.fillStyle = '#544d44';
      ctx.fillText(Hero.stash.length ? 'No items match this filter/search.' : 'Stash is empty — deposit items from your bag.', px + 16, cy + 18);
      return;
    }

    const rowH = 34;
    const listBot = py + ph - 38;
    const visRows = Math.max(1, Math.floor((listBot - cy) / rowH));
    const overflow = view.length > visRows;
    const scroll = clamp(UI.sel.stashScroll || 0, 0, Math.max(0, view.length - visRows));
    UI.sel.stashScroll = scroll;
    view.slice(scroll, scroll + visRows).forEach((it, k) => {
      const y = cy + k * rowH;
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, y, pw - 32, rowH - 4, 5); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
      const cnt = it.torch && (it.count || 1) > 1 ? '  ×' + it.count : '';
      ctx.fillText(this.fitText(ctx, it.name + cnt, pw * 0.36), px + 26, y + 11);
      ctx.font = '10px Georgia'; ctx.fillStyle = '#8a8070';
      // Torches have no item level — show their type/fuel instead of "lvl undefined".
      const sub = it.torch
        ? 'Torch · ' + (TORCH_TYPES[it.torch] ? TORCH_TYPES[it.torch].minutes + ' min' : 'light')
        : ITEM_SLOTS[it.slot].label + ' · lvl ' + it.mLvl;
      ctx.fillText(sub, px + 26, y + 23);
      if (!it.torch) {
        const arrows = Items.compareArrows(it, Hero.equipped[it.slot]);
        ctx.textAlign = 'center'; ctx.font = 'bold 12px Georgia';
        ctx.fillStyle = arrows > 0 ? '#4ade80' : arrows < 0 ? '#e04a5a' : '#9a9080';
        ctx.fillText(arrows > 0 ? '▲'.repeat(arrows) : arrows < 0 ? '▼'.repeat(-arrows) : '—', px + pw * 0.50, y + (rowH - 4) / 2);
      }
      UI.tip(px + 16, y, pw * 0.45, rowH - 4, it.name, Items.statLines(it).join(' · '));
      // Torches: WITHDRAW only (no salvage). Gear: WITHDRAW + SALVAGE.
      if (it.torch) {
        UI.btn(ctx, px + pw - 178, y + 3, 162, rowH - 10, 'WITHDRAW ONE', () => Items.fromStash(it),
          { size: 10, border: '#57b894', color: '#6ff7c3' });
      } else {
        UI.btn(ctx, px + pw - 178, y + 3, 84, rowH - 10, 'WITHDRAW', () => Items.fromStash(it),
          { size: 10, border: '#57b894', color: '#6ff7c3' });
        const canSalv = Items.canSalvage(it);
        UI.btn(ctx, px + pw - 88, y + 3, 72, rowH - 10, canSalv ? 'SALVAGE' : 'L' + Items.salvageReq(it),
          canSalv ? () => { const i = Hero.stash.indexOf(it); if (i >= 0) { Hero.stash.splice(i, 1); Items.grantSalvage(it); Hero.save(); } } : null,
          { size: 10, disabled: !canSalv, border: '#8a6f4a', color: '#ffb43a' });
      }
    });
    if (overflow) {
      const half = (pw - 40) / 2, ay = py + ph - 32;
      const maxS = view.length - visRows;
      UI.btn(ctx, px + 16, ay, half, 24, '▲', scroll > 0 ? () => { UI.sel.stashScroll = scroll - 1; } : null, { size: 12, disabled: scroll <= 0 });
      UI.btn(ctx, px + 24 + half, ay, half, 24, '▼', scroll < maxS ? () => { UI.sel.stashScroll = scroll + 1; } : null, { size: 12, disabled: scroll >= maxS });
    }
  },

  // ------------------------------------------------- wandering vendor

  vendor(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
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
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const twoCol = pw >= 480;
    const ph = Math.min(H - 16, twoCol ? 470 : 720);
    const compact = !twoCol && H < 720;   // tighten spacing on short phones
    const audioStep = compact ? 36 : 42;
    const rowStep = compact ? 28 : 34;
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SETTINGS');

    // Tabs: options · keybindings · manual save slots.
    if (!UI.sel.stab) UI.sel.stab = 'options';
    const tabs = [['options', 'OPTIONS'], ['keys', 'KEYS'], ['saves', 'SAVES']];
    const tw = (pw - 48) / 3;
    tabs.forEach((t, i) => {
      UI.btn(ctx, px + 16 + i * (tw + 8), py + 40, tw, 30, t[1], () => { UI.sel.stab = t[0]; UI.sel.rebindAction = null; },
        { size: 12, bg: UI.sel.stab === t[0] ? 'rgba(60,52,78,0.95)' : undefined });
    });
    if (UI.sel.stab === 'saves') { this.savesTab(ctx, W, H, px, py, pw, ph); return; }
    if (UI.sel.stab === 'keys') { this.keysTab(ctx, W, H, px, py, pw, ph); return; }

    // The options list can exceed the panel on phones — scroll it (▲/▼), with
    // the content clipped to the panel body below the tabs. A ▲/▼ row is
    // reserved at the bottom when the content overflows.
    const overflowing = (UI.sel.setMax || 0) > 0;
    const bodyTop = py + 78, bodyBot = py + ph - 8 - (overflowing ? 34 : 0);
    const sc = clamp(UI.sel.setScroll || 0, 0, UI.sel.setMax || 0);
    UI.sel.setScroll = sc;
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 2, bodyTop, pw - 4, bodyBot - bodyTop); ctx.clip();

    // ---- audio: slider + mute per channel ----
    const chans = [
      ['master', 'Master volume'],
      ['sfx', 'Sound FX'],
      ['music', 'Music'],
      ['ambience', 'Ambience FX'],
      ['weather', 'Weather FX']
    ];
    const colW = twoCol ? (pw - 44) / 2 : pw - 32;
    let ay = py + 92 - sc;
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
      ay += audioStep;
    }

    // ---- gameplay (Diablo-Immortal-style options) ----
    let gx = twoCol ? px + 28 + colW : px + 16;
    let gy = twoCol ? py + 106 - sc : ay + 8;
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('— GAMEPLAY —', gx, gy - 14);
    const toggles = [
      ['dmgNumbers', 'Damage numbers (red/yellow/green)'],
      ['dpsMeter', 'DPS meter (drag to move · lock)'],
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
      gy += rowStep;
    }

    // Loot announcement — position and layout style.
    const lpos = ['bottom', 'middle', 'top'];
    ctx.textAlign = 'left'; ctx.font = '12px Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Loot text position', gx, gy + 14);
    UI.btn(ctx, gx + colW - 118, gy + 1, 118, 26, (Settings.g.lootPos || 'bottom').toUpperCase(), () => {
      Settings.g.lootPos = lpos[(lpos.indexOf(Settings.g.lootPos || 'bottom') + 1) % lpos.length];
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;
    ctx.textAlign = 'left'; ctx.font = '12px Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Loot text style', gx, gy + 14);
    UI.btn(ctx, gx + colW - 118, gy + 1, 118, 26, (Settings.g.lootStyle || 'line') === 'arc' ? 'ARC' : 'STRAIGHT', () => {
      Settings.g.lootStyle = (Settings.g.lootStyle || 'line') === 'line' ? 'arc' : 'line';
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;

    // Corpse limit — corpses linger until this many exist, then the oldest fade.
    const caps = [100, 500, 1000, 2500, 5000, 10000];
    const curCap = Settings.g.corpseCap || 100;
    ctx.textAlign = 'left';
    ctx.font = '12px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Corpse limit', gx, gy + 14);
    UI.btn(ctx, gx + colW - 118, gy + 1, 118, 26, curCap.toLocaleString(), () => {
      Settings.g.corpseCap = caps[(caps.indexOf(curCap) + 1) % caps.length];
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;
    ctx.textAlign = 'left';   // UI.btn left it centered
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Bodies linger as necro fuel; raise it to stress-test.', colW), gx, gy + 2);
    gy += compact ? 16 : 22;

    // About — the game's creator (dev panel) and version (patch notes).
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('— ABOUT —', gx, gy + 6);
    gy += 14;
    const abw = (colW - 8) / 2;
    const abh = compact ? 28 : 30;
    UI.btn(ctx, gx, gy, abw, abh, 'Game creator', () => UI.open('devconfirm'),
      { size: 11, border: '#6b5f80' });
    UI.btn(ctx, gx + abw + 8, gy, abw, abh, GAME_VERSION, () => UI.open('patchnotes'),
      { size: 11, border: '#57b894', color: '#6ff7c3' });
    ctx.restore();   // end scroll clip

    // How far the content overruns the panel body → the scrollable range.
    UI.sel.setMax = Math.max(0, (gy + sc + abh + 12) - bodyBot);
    if (UI.sel.setMax > 0 || overflowing) {
      const half = (pw - 40) / 2, ry = py + ph - 34;
      UI.btn(ctx, px + 16, ry, half, 26, '▲', sc > 0 ? () => { UI.sel.setScroll = Math.max(0, sc - 100); } : null,
        { size: 13, disabled: sc <= 0 });
      UI.btn(ctx, px + 24 + half, ry, half, 26, '▼', sc < UI.sel.setMax ? () => { UI.sel.setScroll = Math.min(UI.sel.setMax, sc + 100); } : null,
        { size: 13, disabled: sc >= UI.sel.setMax });
    }
  },

  // ------------------------------------------------------- manual saves

  savesTab(ctx, W, H, px, py, pw, ph) {
    const saves = Saves.list();
    UI.btn(ctx, px + 16, py + 84, pw - 32, 38,
      saves.length >= Saves.MAX ? 'ALL 20 SLOTS FULL' : '＋ SAVE CURRENT HERO  (' + saves.length + ' / ' + Saves.MAX + ')',
      saves.length >= Saves.MAX ? null : () => Saves.add(),
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
      ctx.fillText(s.date || '', px + pw - 148, y + rowH / 2 - 2);
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

  // ------------------------------------------------- keybindings (desktop)

  keysTab(ctx, W, H, px, py, pw, ph) {
    const narrow = pw < 480;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '11px Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText(narrow ? 'Keyboard controls (desktop).'
      : 'Keyboard controls (desktop) — tap a key to remove it, ＋ to add one.',
      px + 16, py + 86);

    const listTop = py + 104;
    const listBot = py + ph - 44;
    const cols = narrow ? 1 : 2;
    const gap = 12;
    const colW = (pw - 32 - (cols - 1) * gap) / cols;
    const rowsPerCol = Math.ceil(KEY_ACTIONS.length / cols);
    const rowH = Math.min(30, (listBot - listTop) / rowsPerCol);

    KEY_ACTIONS.forEach(([id, label], i) => {
      const col = Math.floor(i / rowsPerCol);
      const row = i % rowsPerCol;
      const x = px + 16 + col * (colW + gap);
      const y = listTop + row * rowH;
      const labelW = colW * 0.40;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px Georgia'; ctx.fillStyle = '#c9bfa8';
      ctx.fillText(this.fitText(ctx, label, labelW - 4), x, y + rowH / 2);

      const chipY = y + (rowH - 18) / 2;
      const addX = x + colW - 20;
      let cxp = x + labelW;
      if (UI.sel.rebindAction === id) {
        ctx.fillStyle = '#6ff7c3'; ctx.font = 'italic 11px Georgia';
        ctx.fillText('press a key…', cxp, y + rowH / 2);
      } else {
        for (const code of (Settings.keys[id] || [])) {
          ctx.font = 'bold 10px Georgia';
          const name = keyName(code);
          const chw = Math.min(58, ctx.measureText(name).width + 12);
          if (cxp + chw > addX - 4) {
            ctx.fillStyle = '#6f6552'; ctx.font = '10px Georgia';
            ctx.fillText('…', cxp, y + rowH / 2);
            break;
          }
          ctx.fillStyle = 'rgba(44,38,58,0.95)';
          rr(ctx, cxp, chipY, chw, 18, 4); ctx.fill();
          ctx.strokeStyle = '#6b5f80'; ctx.lineWidth = 1;
          rr(ctx, cxp, chipY, chw, 18, 4); ctx.stroke();
          ctx.fillStyle = '#e8e0cc'; ctx.textAlign = 'center';
          ctx.fillText(name, cxp + chw / 2, y + rowH / 2);
          ctx.textAlign = 'left';
          UI.register(cxp, chipY, chw, 18, () => Settings.unbindKey(id, code));
          cxp += chw + 4;
        }
      }
      // ＋ add — enter listening mode for the next keypress.
      ctx.fillStyle = 'rgba(28,40,32,0.95)';
      rr(ctx, addX, chipY, 18, 18, 4); ctx.fill();
      ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 1;
      rr(ctx, addX, chipY, 18, 18, 4); ctx.stroke();
      ctx.fillStyle = '#6ff7c3'; ctx.font = 'bold 14px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('+', addX + 9, chipY + 9);
      ctx.textAlign = 'left';
      UI.register(addX, chipY, 18, 18, () => { UI.sel.rebindAction = id; });
    });

    UI.btn(ctx, px + 16, py + ph - 38, pw - 32, 28, 'RESET TO DEFAULTS', () => {
      Settings.resetKeys();
      UI.sel.rebindAction = null;
    }, { size: 11, border: '#8a4550', color: '#e04a5a' });
  },

  // ------------------------------------------------- dev panel & cheats

  devconfirm(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
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

  // Grant a specific legendary (at level 70+) straight to the Stash.
  grantLegendary(key) {
    if (Hero.stash.length >= Hero.STASH_SIZE) {
      UI.toast('Stash is full — make room first', '#9a9080'); AudioSys.sfx('denied'); return;
    }
    const it = Items.generatePowerItem(Math.max(70, Hero.level), key);
    Hero.stash.push(it); Hero.saveStash(); Hero.save();
    UI.toast('★ ' + it.name + ' → Stash', '#ff8c2a'); AudioSys.sfx('setdrop');
  },

  cheats(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 548);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, '☠ DEV CHEATS ☠');
    let y = py + 50;

    // Toggles — kept per save.
    UI.check(ctx, px + 16, y, Hero.cheats.god, () => {
      Hero.cheats.god = !Hero.cheats.god;
      Hero.save();
    }, 'Immortality (god mode)');
    y += 34;
    UI.check(ctx, px + 16, y, Hero.cheats.essence, () => {
      Hero.cheats.essence = !Hero.cheats.essence;
      Hero.save();
    }, 'Infinite essence (mana/rage/energy)');
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
    row("✦ Haedrig's Gift — full Inarius set + legendaries to Stash", () => {
      const mLvl = Math.max(70, Hero.level);
      let n = 0;
      const give = it => { if (Hero.stash.length < Hero.STASH_SIZE) { Hero.stash.push(it); n++; } };
      // The 6 Grace of Inarius set pieces...
      for (const slot of Object.keys(INARIUS_SET.pieces)) give(Items.generateSetPiece(mLvl, slot));
      // ...plus the build's legendary "set items": rings, weapon, phylactery, chest.
      for (const key of ['coe', 'krysbin', 'funeraryPick', 'ironRose', 'aquila']) give(Items.generatePowerItem(mLvl, key));
      Hero.saveStash();
      Hero.save();
      UI.toast("Haedrig's Gift: " + n + ' pieces sent to Stash' + (Hero.stash.length >= Hero.STASH_SIZE ? ' (Stash full)' : ''), '#4ade80');
      AudioSys.sfx('setdrop');
    }, '#4ade80');
    // Act-boss exclusive legendaries → Stash (their bosses drop these in-game).
    const tw3 = (pw - 32 - 2 * 6) / 3;
    UI.btn(ctx, px + 16, y, tw3, 30, '◈ Royal Grandeur (A1)',
      () => Screens.grantLegendary('royalGrandeur'), { size: 10, color: '#ffd76a', border: '#8a6f4a' });
    UI.btn(ctx, px + 16 + tw3 + 6, y, tw3, 30, '⚔ Bloodtide (A2)',
      () => Screens.grantLegendary('bloodtide'), { size: 10, color: '#e04a5a', border: '#8a2635' });
    UI.btn(ctx, px + 16 + 2 * (tw3 + 6), y, tw3, 30, '⚔ Cycle Scythe (A3)',
      () => Screens.grantLegendary('cycleScythe'), { size: 10, color: '#b06adf', border: '#5a3a7a' });
    y += 36;
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
    // Keys + inventory-space row (dev grants).
    const kw = (pw - 32 - 2 * 6) / 3;
    UI.btn(ctx, px + 16, y, kw, 30, '+5000 Bag',
      () => { Hero.BAG_SIZE += 5000; UI.toast('+5000 inventory slots (now ' + Hero.BAG_SIZE + ')', '#6ff7c3'); Hero.save(); },
      { size: 11, color: '#6ff7c3', border: '#3a7a6a' });
    UI.btn(ctx, px + 16 + kw + 6, y, kw, 30, '+5 Master Keys',
      () => { Hero.masterKeys += 5; UI.toast('+5 Master Nephalem Rift Keys (' + Hero.masterKeys + ')', '#d8b4f0'); Hero.save(); },
      { size: 10, color: '#d8b4f0', border: '#5a3a7a' });
    UI.btn(ctx, px + 16 + 2 * (kw + 6), y, kw, 30, '+5 Nephalem Keys',
      () => { Hero.riftKeys += 5; UI.toast('+5 Nephalem Rift Keys (' + Hero.riftKeys + ')', '#b06adf'); Hero.save(); },
      { size: 10, color: '#b06adf', border: '#5a3a7a' });
    y += 36;
    // Level row.
    const lvls = [1, 5, 10];
    const lw = (pw - 32 - 2 * 6) / 3;
    lvls.forEach((n, i) => {
      UI.btn(ctx, px + 16 + i * (lw + 6), y, lw, 30, '+' + n + ' level' + (n > 1 ? 's' : ''),
        () => Hero.grantLevels(n), { size: 11 });
    });
    y += 36;
    row('Max level Blacksmith (10)', () => {
      Hero.artisans.smith = 10; UI.toast('Blacksmith mastered', '#ffb43a'); Hero.save();
    }, '#ffb43a');
    row('Max level Mystic (10)', () => {
      Hero.artisans.mystic = 10; UI.toast('Mystic mastered', '#b06adf'); Hero.save();
    }, '#b06adf');
    row('Max level Jeweler (10)', () => {
      Hero.artisans.jeweler = 10; UI.toast('Jeweler mastered', '#4ecbe0'); Hero.save();
    }, '#4ecbe0');
    ctx.textAlign = 'center';
    ctx.font = 'italic 10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Everything here is saved with the hero.', px + pw / 2, y + 8);
  },

  // -------------------------------------------------------- patch notes

  // Full-length notes — nothing truncated, nothing off screen. Content
  // scrolls inside the panel via the ▲/▼ buttons when it overflows.
  patchnotes(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 520);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'PATCH NOTES');

    if (UI.sel.scroll === undefined) UI.sel.scroll = 0;
    const top = py + 48;
    const viewH = ph - 60;

    // Clip the scrolling content to the panel.
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 4, top, pw - 8, viewH);
    ctx.clip();

    let y = top + 8 - UI.sel.scroll;
    for (const patch of PATCH_NOTES) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px Georgia';
      ctx.fillStyle = '#57b894';
      ctx.fillText(patch.v + '   —   ' + patch.date, px + 16, y);
      y += 22;
      ctx.font = '11px Georgia';
      for (const n of patch.notes) {
        ctx.fillStyle = '#b5ab94';
        // Generous line budget: never ellipsize a note.
        y = wrapText(ctx, '• ' + n, px + 22, y, pw - 74, 14, 30) + 4;
      }
      y += 14;
    }
    ctx.restore();

    // Scroll controls when the content is taller than the panel.
    const contentH = (y + UI.sel.scroll) - (top + 8);
    const maxScroll = Math.max(0, contentH - viewH + 16);
    UI.sel.scroll = clamp(UI.sel.scroll, 0, maxScroll);
    if (maxScroll > 0) {
      UI.btn(ctx, px + pw - 44, top + 4, 34, 40, '▲',
        UI.sel.scroll > 0 ? () => { UI.sel.scroll = Math.max(0, UI.sel.scroll - 130); } : null,
        { size: 14, disabled: UI.sel.scroll <= 0 });
      UI.btn(ctx, px + pw - 44, top + viewH - 44, 34, 40, '▼',
        UI.sel.scroll < maxScroll ? () => { UI.sel.scroll = Math.min(maxScroll, UI.sel.scroll + 130); } : null,
        { size: 14, disabled: UI.sel.scroll >= maxScroll });
      // Scroll position hint.
      ctx.fillStyle = '#3a3448';
      ctx.fillRect(px + pw - 29, top + 50, 4, viewH - 100);
      ctx.fillStyle = '#57b894';
      const kH = Math.max(20, (viewH / (contentH || 1)) * (viewH - 100));
      ctx.fillRect(px + pw - 29, top + 50 + (UI.sel.scroll / maxScroll) * (viewH - 100 - kH), 4, kH);
    }
  },

  // ------------------------------------------------------------- season

  season(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 560);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, SEASON.name.toUpperCase());

    // Scrollable body (never ellipsize — owner rule) with the START button
    // pinned as a footer so it's always reachable on phones.
    const footerH = 72;
    const footerTop = py + ph - footerH;
    const scrollTop = py + 44;
    const viewBot = footerTop - 2;
    const viewH = Math.max(60, viewBot - scrollTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px + 2, y: scrollTop, w: pw - 4, h: viewH };

    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 2, scrollTop, pw - 4, viewH);
    ctx.clip();
    let c = scrollTop + 12;

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Georgia';
    ctx.fillStyle = '#9a9080';
    c = wrapText(ctx, SEASON.desc, W / 2, c - scrollY, pw - 40, 16, 8) + scrollY + 10;

    const owned = Hero.setPiecesOwned();
    ctx.font = 'bold 14px Georgia';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.fillText('GRACE OF INARIUS  —  ' + owned.size + ' / 6', W / 2, c - scrollY);
    c += 26;
    for (const [slot, name] of Object.entries(INARIUS_SET.pieces)) {
      const has = owned.has(slot);
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Georgia';
      ctx.fillStyle = has ? '#4ade80' : '#544d44';
      ctx.fillText((has ? '◆  ' : '◇  ') + name, px + 24, c - scrollY);
      ctx.textAlign = 'right';
      ctx.font = '10px Georgia';
      ctx.fillStyle = has ? '#3a7a4a' : '#453f52';
      ctx.fillText(ITEM_SLOTS[slot].label, px + pw - 24, c - scrollY);
      c += 22;
    }
    c += 6;
    ctx.textAlign = 'left';
    ctx.font = '11px Georgia';
    for (const b of INARIUS_SET.bonuses) {
      const active = Items.setCount() >= b.pieces;
      ctx.fillStyle = active ? '#4ade80' : '#6f6552';
      c = wrapText(ctx, `(${b.pieces}) ${b.desc}` + (active ? '  ✓' : ''), px + 24, c - scrollY, pw - 48, 14, 8) + scrollY + 4;
    }
    ctx.restore();

    UI.sel.scrollMax = Math.max(0, (c - scrollTop) - viewH + 6);
    ctx.textAlign = 'center';
    ctx.font = '9px Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', W / 2, scrollTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag for more ▼', W / 2, viewBot - 1);

    // Pinned footer: the season is a Master Nephalem Rift (1500 pts, 1 Master key).
    ctx.strokeStyle = '#3a3448';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 12, footerTop); ctx.lineTo(px + pw - 12, footerTop); ctx.stroke();
    const hasMaster = Hero.masterKeys > 0;
    UI.btn(ctx, px + 16, footerTop + 10, pw - 32, 40,
      hasMaster ? `◈ START MASTER RIFT — 1500 pts  (1 Master Key)`
        : '◈ NEED A MASTER NEPHALEM RIFT KEY',
      hasMaster ? () => { UI.close(); Game.startRift('season'); } : null,
      { size: 13, disabled: !hasMaster, border: '#3a7a4a', color: '#4ade80' });
    ctx.textAlign = 'center';
    ctx.font = '10px Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, '◈ Master Keys: ' + Hero.masterKeys + '  ·  Nephalem Guardians drop them & set pieces', pw - 24), W / 2, footerTop + 60);
  },

  // ------------------------------------------------------ pause / death

  pause(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
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
    UI.panel(ctx, px, py, pw, ph, Game.rewardTitle || 'BOUNTY COMPLETE');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 15px Georgia';
    ctx.fillStyle = '#ffb43a';
    ctx.fillText(Game.zone ? Game.zone.boss + '  slain' : 'The bounty is done', W / 2, py + 60);
    ctx.font = '13px Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(Game.rewardTitle === 'SEASON COMPLETE' ? 'Season cache:' : 'Horadric cache:', W / 2, py + 86);
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
