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

  // Draw a short label at (x, baseY), wrapping onto up to maxLines lines when it's
  // too wide — NEVER truncated with "…" (owner rule: names read as 2–3 lines). The
  // block is centred vertically on baseY so it barely disturbs the layout around
  // it. Respects the current textAlign (centre for grid labels, left for rows).
  // Used for skill / rune / passive names so long ones wrap instead of clipping.
  wrapLabel(ctx, text, x, baseY, maxW, maxLines = 2, lh = 9) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    // Fold any overflow beyond maxLines into the last line (no ellipsis).
    if (lines.length > maxLines) { lines[maxLines - 1] = lines.slice(maxLines - 1).join(' '); lines.length = maxLines; }
    const _fs = (typeof Settings !== 'undefined' && Settings.g && Settings.g.fontSize) || 13;
    const lineH = _fs !== 13 ? lh * (_fs / 13) : lh;
    const startY = baseY - (lines.length - 1) * lineH / 2;
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, startY + i * lineH);
  },

  draw(ctx, W, H) {
    switch (UI.screen) {
      case 'radial': this.radial(ctx, W, H); break;
      case 'sysmenu': this.sysmenu(ctx, W, H); break;
      case 'journal': this.journal(ctx, W, H); break;
      case 'achievements': this.achievements(ctx, W, H); break;
      case 'skills': this.skills(ctx, W, H); break;
      case 'skillChooser': this.skillChooser(ctx, W, H); break;
      case 'smith': this.smith(ctx, W, H); break;
      case 'smithSalvage': this.smithSalvage(ctx, W, H); break;
      case 'smithRepair': this.smithRepair(ctx, W, H); break;
      case 'smithWeapon': this.smithWeapon(ctx, W, H); break;
      case 'smithArmor': this.smithArmor(ctx, W, H); break;
      case 'torches': this.torches(ctx, W, H); break;
      case 'jeweler': this.jeweler(ctx, W, H); break;
      case 'jewSocket': this.jewSocket(ctx, W, H); break;
      case 'jewUnsocket': this.jewUnsocket(ctx, W, H); break;
      case 'jewMerge': this.jewMerge(ctx, W, H); break;
      case 'jewSell': this.jewSell(ctx, W, H); break;
      case 'jewCraft': this.jewCraft(ctx, W, H); break;
      case 'mystic': this.mystic(ctx, W, H); break;
      case 'mysEnchant': this.mysEnchant(ctx, W, H); break;
      case 'mysPet': this.mysPet(ctx, W, H); break;
      case 'mysWings': this.mysWings(ctx, W, H); break;
      case 'mysTheme': this.mysTheme(ctx, W, H); break;
      case 'lukus': this.lukus(ctx, W, H); break;
      case 'addy': this.addy(ctx, W, H); break;
      case 'lyssa': this.lyssa(ctx, W, H); break;
      case 'pause': this.pause(ctx, W, H); break;
      case 'reward': this.reward(ctx, W, H); break;
      case 'character': this.character(ctx, W, H); break;
      case 'paragon': this.paragon(ctx, W, H); break;
      case 'stash': this.stash(ctx, W, H); break;
      case 'vendor': this.vendor(ctx, W, H); break;
      case 'merchant': this.merchant(ctx, W, H); break;
      case 'settings': this.settings(ctx, W, H); break;
      case 'devconfirm': this.devconfirm(ctx, W, H); break;
      case 'cheats': this.cheats(ctx, W, H); break;
      case 'patchnotes': this.patchnotes(ctx, W, H); break;
      case 'season': this.season(ctx, W, H); break;
      case 'cube': this.cube(ctx, W, H); break;
      case 'fountain': this.fountain(ctx, W, H); break;
      case 'cryptUnlock': this.cryptUnlock(ctx, W, H); break;
      case 'recipes': this.recipes(ctx, W, H); break;
      case 'wilds': this.wilds(ctx, W, H); break;
      case 'storyacts': this.storyMenu(ctx, W, H); break;
      case 'actclear': this.actClear(ctx, W, H); break;
      case 'create': this.create(ctx, W, H); break;
      case 'select': this.select(ctx, W, H); break;
    }
    // Universal ART SCROLLBAR (v1.7.25): every screen that set a scroll
    // region gets the owner's draggable skull-thumb rail on its right edge.
    if (UI.sel.scrollRegion && (UI.sel.scrollMax || 0) > 0) {
      UI.drawScrollbar(ctx, UI.sel.scrollRegion, UI.sel.scrollY || 0, UI.sel.scrollMax);
    } else if (!UI.sel.gemPick) {
      UI.sel.scrollBar = null;
    }
  },

  // The campfire roster: up to three Nekromancers stand around a fire, drawn
  // with pseudo-3D depth. Tap a hero to select it, then the green PLAY button
  // to enter. "Delete Hero" toggles a retire flow. Empty spots create.
  select(ctx, W, H) {
    // THE HALL OF HEROES (v1.7.3 owner art): the painted CHOOSE YOUR HERO
    // vista fills the screen; three gothic slot frames stand centered, each
    // holding a ghostly unclaimed vessel — the plus plate at 25% opacity on
    // an empty vessel is the CREATE button. Claimed frames show the hero.
    const t = Game.time || 0;
    // TITLE-FREE vista now (v1.7.20): the "CHOOSE YOUR HERO" plate is a
    // SEPARATE, DEVICE-SCALED element drawn on top — so it can shrink on
    // phones and grow on desktop instead of being baked huge into the art.
    const bg = Game.uiImg('select_bg');
    ctx.fillStyle = '#050408'; ctx.fillRect(0, 0, W, H);
    if (bg && bg.complete && bg.naturalWidth) {
      const cf = Math.max(W / bg.width, H / bg.height);   // always cover-fit
      ctx.drawImage(bg, (W - bg.width * cf) / 2, (H - bg.height * cf) / 2, bg.width * cf, bg.height * cf);
    }
    // The painted title plate, scaled to the viewport tier. `titleBottom`
    // is where the frames must begin so nothing overlaps the plate.
    let titleBottom = H * 0.10;
    {
      const title = Game.uiImg('select_title');
      // desktop wide · tablet · phone → a fraction of the screen width, capped.
      const wf = W >= 1100 ? 0.46 : W >= 640 ? 0.58 : 0.82;
      const ty = Math.max(8, H * 0.04);
      if (title && title.complete && title.naturalWidth) {
        const tw = Math.min(W * wf, 620);
        const th = tw * (title.height / title.width);
        ctx.drawImage(title, W / 2 - tw / 2, ty, tw, th);
        titleBottom = ty + th;
      } else {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + Math.round(W < 640 ? 22 : 30) + 'px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
        ctx.fillText('CHOOSE YOUR HERO', W / 2, H * 0.10);
        titleBottom = H * 0.14;
      }
    }

    const delMode = !!UI.sel.delMode;
    if (!delMode && UI.sel.pick === undefined) {
      UI.sel.pick = Profiles.slots[Profiles.active] ? Profiles.active : null;
    }

    // ---- three slot frames per PAGE (v1.7.11 owner rule: up to 9 heroes,
    // paged 3 at a time with painted arrows left and right) ----
    const frame = Game.uiImg('slot_frame');
    const ghost = Game.uiImg('ghost');
    const plus = Game.uiImg('plus');
    const FA = frame && frame.naturalWidth ? frame.width / frame.height : 0.60;
    const short = H < 480;
    const gap = Math.max(10, W * 0.02);
    // On narrow screens the side gutters would starve the frames — the
    // arrows move DOWN beside the page dots instead (v1.7.12).
    const narrow = W < 640;
    const gutter = narrow ? 0 : 46;      // side room reserved for the arrows
    // MASSIVE frames (owner rule v1.7.13: "fill the space… command it"):
    // from just under the scalable title plate down to the PLAY row.
    let y0 = Math.max(H * 0.17, 58, titleBottom + 14);
    let fh = Math.min(H - 96 - y0, 640);
    let fw = fh * FA;
    const avail = W - (narrow ? 20 : 8 + gutter * 2);
    if (fw * 3 + gap * 2 > avail) {
      // Width-bound (portrait phones): size by width and drop the row back
      // to the lower half so the vista's baked title stays clear.
      fw = (avail - gap * 2) / 3; fh = fw / FA;
      y0 = Math.max(y0, H * 0.55 - fh / 2);
    }
    if (delMode) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 13px Cinzel, Georgia'; ctx.fillStyle = '#e04a5a';
      ctx.fillText('RETIRE A HERO — tap the hero you wish to retire', W / 2, y0 - 12);
    }
    // A soft rim around a drawing's SILHOUETTE only (shadow-only pass: the
    // image itself lands 10000px off-canvas, its shadow lands here) — the
    // hover cue never washes the content itself (owner rule v1.7.14).
    const rim = (im, dx, dy, dw2, dh2, col, blur) => {
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.shadowOffsetX = 10000;
      ctx.drawImage(im, dx - 10000, dy, dw2, dh2);
      ctx.drawImage(im, dx - 10000, dy, dw2, dh2);   // second pass firms the rim
      ctx.restore();
    };
    // Faded bone green, low opacity — never blinding. BLOOD RED is reserved
    // solely for delete mode (owner rule v1.7.14).
    const RIM_HOVER = 'rgba(152,188,158,0.5)';
    const RIM_DELETE = 'rgba(190,28,36,0.9)';
    const pages = Math.ceil((Profiles.MAX || 3) / 3);
    if (UI.sel.selPage === undefined) {
      const home = Profiles.slots[Profiles.active] ? Profiles.active : Profiles.firstFilled();
      UI.sel.selPage = Math.floor(clamp(home, 0, (Profiles.MAX || 3) - 1) / 3);
    }
    const page = clamp(UI.sel.selPage, 0, pages - 1);
    UI.sel.selPage = page;
    for (let k = 0; k < 3; k++) {
      const i = page * 3 + k;
      const x0 = W / 2 - (fw * 3 + gap * 2) / 2 + k * (fw + gap);
      const snap = Profiles.slots[i];
      const selected = !delMode && UI.sel.pick === i && !!snap;
      // (v1.7.12 owner art: the frame painting carries its own OPAQUE BLACK
      // interior now — the procedural arch-shaped backing is gone. The baked
      // ghost was erased offline and lives on as the separate ghost.webp so
      // claimed frames stay clean for the name and level.)
      const mpf = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
      const fhov = !!(mpf && mpf.x >= x0 && mpf.x <= x0 + fw && mpf.y >= y0 && mpf.y <= y0 + fh);
      // The frame (procedural arch until the art loads). No plate-wide glow
      // (owner rule v1.7.13) — the hover outline lives on the HERO / plus.
      if (frame && frame.complete && frame.naturalWidth) {
        // Near-opaque even unselected — the painting's interior is solid
        // black now, so a low alpha would bleed the vista through it.
        ctx.globalAlpha = selected ? 1 : 0.97;
        ctx.drawImage(frame, x0, y0, fw, fh);
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = selected ? '#cfc8b8' : '#3a3448'; ctx.lineWidth = 2;
        rr(ctx, x0, y0, fw, fh, 12); ctx.stroke();
      }
      if (snap) {
        // A claimed vessel — the hero's painted avatar on the plinth. On
        // hover the HERO ITSELF takes a soft rim: faded bone green normally,
        // blood red only while retiring (owner rules v1.7.13/14).
        const img = Game.heroImg(snap.gender || 'm', 'front', snap.hair || 0);
        const gh2 = fh * 0.60;
        if (img && img.complete && img.naturalWidth) {
          const gw2 = gh2 * (img.width / img.height);
          const breath = Math.sin(t * 1.6 + i) * 1.2;
          const ax2 = x0 + fw / 2 - gw2 / 2, ay2 = y0 + fh * 0.875 - gh2 - breath;
          if (fhov) rim(img, ax2, ay2, gw2, gh2 + breath,
            delMode ? RIM_DELETE : RIM_HOVER, Math.max(10, fw * 0.05));
          ctx.drawImage(img, ax2, ay2, gw2, gh2 + breath);
        } else {
          this.drawNecroFigure(ctx, x0 + fw / 2, y0 + fh * 0.86, fh / 420, '#8fb0e8', false, false);
        }
        // Name + level under the skull medallion's hanging gem (the new
        // frame's crown reaches ~0.16 of the height — sit just below it).
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 ' + Math.max(9, Math.round(fw * 0.062)) + 'px Cinzel, Georgia';
        ctx.fillStyle = selected ? '#ffd76a' : '#cfc8b8';
        ctx.fillText(this.fitText(ctx, (snap.name || 'Nekromancer').toUpperCase(), fw - 26), x0 + fw / 2, y0 + fh * 0.185);
        ctx.font = Math.max(8, Math.round(fw * 0.052)) + 'px Cinzel, Georgia';
        ctx.fillStyle = '#9a8f7a';
        ctx.fillText('Level ' + (snap.level || 1), x0 + fw / 2, y0 + fh * 0.232);
        if (selected) {
          // Soft teal breath around the plinth for the chosen one.
          const pl = 0.25 + 0.12 * Math.sin(t * 2.4);
          ctx.strokeStyle = 'rgba(120,220,215,' + pl.toFixed(3) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x0 + fw / 2, y0 + fh * 0.885, fw * 0.30, fh * 0.035, 0, 0, TAU); ctx.stroke();
        }
        UI.register(x0, y0, fw, fh, delMode
          ? () => { UI.sel.delConfirm = i; }
          : () => { UI.sel.pick = i; });
      } else {
        // An unclaimed vessel — the ghost waits (drawn SMALLER than the
        // baked original, owner rule v1.7.12, so the crown stays clear);
        // the plus plate (25% opacity, owner spec) is the CREATE button.
        if (ghost && ghost.complete && ghost.naturalWidth) {
          const gh2 = fh * 0.62;
          const gw2 = gh2 * (ghost.width / ghost.height);
          ctx.globalAlpha = 0.85 + 0.1 * Math.sin(t * 1.1 + i * 2);
          ctx.drawImage(ghost, x0 + fw / 2 - gw2 / 2, y0 + fh * 0.90 - gh2, gw2, gh2);
          ctx.globalAlpha = 1;
        }
        if (plus && plus.complete && plus.naturalWidth) {
          // On hover the plus plate takes a faded bone-green rim traced
          // around its OUTLINE only — the plate itself stays at its quiet
          // 25%, never washed brighter (owner rule v1.7.14).
          const pw2 = fw * 0.52, ph2 = pw2 * (plus.height / plus.width);
          const px2 = x0 + fw / 2 - pw2 / 2, py2 = y0 + fh * 0.56 - ph2 / 2;
          if (fhov && !delMode) rim(plus, px2, py2, pw2, ph2, RIM_HOVER, 8);
          ctx.globalAlpha = 0.25;
          ctx.drawImage(plus, px2, py2, pw2, ph2);
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = 0.25;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '600 ' + Math.round(fw * 0.22) + 'px Cinzel, Georgia'; ctx.fillStyle = '#e8e2d0';
          ctx.fillText('+', x0 + fw / 2, y0 + fh * 0.56);
          ctx.globalAlpha = 1;
        }
        if (!delMode) UI.register(x0, y0, fw, fh, () => {
          if (Profiles.create(i)) UI.open('create');
        });
      }
    }

    // ---- page arrows (painted plates) + page dots. Wide screens: arrows
    // flank the frame row; narrow screens: arrows sit below, beside the dots ----
    if (pages > 1) {
      const rowL = W / 2 - (fw * 3 + gap * 2) / 2;
      const abw = narrow ? 40 : Math.min(44, gutter - 4);
      const ayc = narrow ? y0 + fh + 24 : y0 + fh / 2;
      const dotY = narrow ? ayc : y0 + fh + (short ? 8 : 12);
      const drawArrow = (key, glyph, ax, cb) => {
        const img = Game.uiImg(key);
        if (img) {
          const abh = Math.round(abw * (img.height / img.width));
          const mpa = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
          const hov = !!(mpa && mpa.x >= ax && mpa.x <= ax + abw && mpa.y >= ayc - abh && mpa.y <= ayc + abh);
          ctx.save();
          if (hov) { ctx.shadowColor = 'rgba(232,226,208,0.6)'; ctx.shadowBlur = 16; }
          ctx.globalAlpha = hov ? 1 : 0.85;
          ctx.drawImage(img, ax, ayc - abh / 2, abw, abh);
          ctx.restore();
          ctx.globalAlpha = 1;
          UI.register(ax - 8, ayc - abh / 2 - 14, abw + 16, abh + 28, cb);
        } else {
          UI.btn(ctx, ax, ayc - 18, 38, 36, glyph, cb, { size: 16 });
        }
      };
      drawArrow('arrow_left', '◀',
        narrow ? W / 2 - 84 - abw / 2 : Math.max(2, rowL - gutter + 2),
        () => { UI.sel.selPage = (page + pages - 1) % pages; AudioSys.sfx('click'); });
      drawArrow('arrow_right', '▶',
        narrow ? W / 2 + 84 - abw / 2 : Math.min(W - 2 - abw, rowL + fw * 3 + gap * 2 + 2),
        () => { UI.sel.selPage = (page + 1) % pages; AudioSys.sfx('click'); });
      // Page dots — the current page burns bone-bright.
      for (let d = 0; d < pages; d++) {
        ctx.fillStyle = d === page ? '#cfc8b8' : 'rgba(207,200,184,0.28)';
        ctx.beginPath(); ctx.arc(W / 2 + (d - (pages - 1) / 2) * 18, dotY, d === page ? 3.4 : 2.4, 0, TAU); ctx.fill();
      }
    }

    // ---- bottom controls ----
    const scrimH = short ? 110 : 150;
    const scrim = ctx.createLinearGradient(0, H - scrimH, 0, H);
    scrim.addColorStop(0, 'rgba(5,4,10,0)');
    scrim.addColorStop(0.45, 'rgba(5,4,10,0.55)');
    scrim.addColorStop(1, 'rgba(5,4,10,0.85)');
    ctx.fillStyle = scrim; ctx.fillRect(0, H - scrimH, W, scrimH);
    const pick = UI.sel.pick;
    const delId = UI.sel.delConfirm;
    if (delMode && delId !== undefined && Profiles.slots[delId]) {
      const nm = Profiles.slots[delId].name || 'this hero';
      ctx.textAlign = 'center'; ctx.font = 'bold 15px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
      ctx.fillText(this.fitText(ctx, 'Retire ' + nm + '? Are you sure?', W - 40), W / 2, H - 100);
      const bw = Math.min(150, (W - 48) / 2);
      UI.btnPlate2(ctx, W / 2 - bw - 6, H - 84, bw, 36, 'YES, RETIRE', () => {
        Profiles.remove(delId);
        UI.sel.delConfirm = undefined; UI.sel.delMode = false; UI.sel.pick = undefined;
      }, { size: 13, color: '#e04a5a' });
      UI.btnPlate2(ctx, W / 2 + 6, H - 84, bw, 36, 'NO, KEEP', () => { UI.sel.delConfirm = undefined; }, { size: 13 });
    } else if (!delMode && pick !== undefined && pick !== null && Profiles.slots[pick]) {
      const bw = Math.min(240, W - 70), bh = short ? 34 : 42, bx = W / 2 - bw / 2, byy = H - (short ? 60 : 74);
      // PLAY lands you in New Haven (owner rule).
      UI.btnPlate(ctx, bx, byy, bw, bh, 'PLAY',
        () => { Profiles.select(pick); Game.enterTown(); }, { size: 18, color: '#e6d4a8' });
    }

    // Delete / cancel toggle, lower-left.
    UI.btnPlate3(ctx, 14, H - 42, 150, 28, delMode ? 'CANCEL' : 'DELETE HERO', () => {
      UI.sel.delMode = !delMode;
      UI.sel.delConfirm = undefined;
      if (!delMode) UI.sel.pick = null;
    }, { size: 11, color: delMode ? '#c9bfa8' : '#e04a5a' });
  },

  // A ragged dark forest treeline silhouette across the given horizon y.
  drawTreeline(ctx, W, yh) {
    // A faint moonlit mist BEHIND the trees so their silhouettes read clearly.
    ctx.fillStyle = 'rgba(70,80,110,0.22)';
    ctx.fillRect(0, yh - 70, W, 90);
    // Far ridge — a fainter, lower row for depth.
    ctx.fillStyle = '#13201a';
    ctx.beginPath();
    ctx.moveTo(0, yh + 40);
    for (let x = -20; x < W + 20; x += 34) {
      const h = 18 + (hash2(Math.round(x / 34), 9)) * 40;
      ctx.lineTo(x, yh - h + 20);
      ctx.lineTo(x + 17, yh - h * 0.5 + 20);
    }
    ctx.lineTo(W, yh + 40); ctx.closePath(); ctx.fill();
    // Near treeline — taller pines, lifted out of pure black so the forest shows.
    ctx.fillStyle = '#18261b';
    ctx.beginPath();
    ctx.moveTo(0, yh + 40);
    for (let x = -20; x < W + 20; x += 26) {
      const h = 34 + (hash2(Math.round(x / 26), 3)) * 78;
      ctx.lineTo(x, yh - h);
      ctx.lineTo(x + 13, yh - h * 0.5);
    }
    ctx.lineTo(W, yh + 40); ctx.closePath(); ctx.fill();
    // Cool rim light on the tree tips from the moon.
    ctx.strokeStyle = 'rgba(150,170,210,0.18)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -20; x < W + 20; x += 26) {
      const h = 34 + (hash2(Math.round(x / 26), 3)) * 78;
      ctx.moveTo(x, yh - h); ctx.lineTo(x + 13, yh - h * 0.5);
    }
    ctx.stroke();
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

  // A little village on the back-right horizon: silhouetted houses with pitched
  // roofs, a church spire, and warm flickering windows.
  drawVillage(ctx, W, H) {
    const base = H * 0.565;
    const t = Game.time || 0;
    ctx.save();
    // Low dark rise the village sits on.
    ctx.fillStyle = '#0e1016';
    ctx.beginPath();
    ctx.moveTo(W * 0.6, base + 8);
    ctx.quadraticCurveTo(W * 0.8, base - 10, W * 1.02, base + 2);
    ctx.lineTo(W * 1.02, base + 44); ctx.lineTo(W * 0.6, base + 44);
    ctx.closePath(); ctx.fill();
    // [x-fraction, width, height, chimney, spire]
    const houses = [
      [0.67, 38, 30, 0, 0], [0.74, 50, 44, 1, 0], [0.81, 42, 28, 0, 0],
      [0.88, 56, 62, 0, 1], [0.95, 44, 38, 1, 0], [1.0, 34, 26, 0, 0]
    ];
    for (const [hf, w, h, chim, spire] of houses) {
      const x = W * hf - w / 2, y = base - h;
      ctx.fillStyle = '#171420'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(150,160,190,0.13)'; ctx.fillRect(x, y, 2.5, h);   // moonlit edge
      // Pitched roof (steep for the church/spire).
      ctx.fillStyle = '#241a26';
      const rh = spire ? h * 0.7 : 14;
      ctx.beginPath();
      ctx.moveTo(x - 4, y); ctx.lineTo(x + w / 2, y - rh); ctx.lineTo(x + w + 4, y);
      ctx.closePath(); ctx.fill();
      if (spire) {
        ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + w / 2, y - rh); ctx.lineTo(x + w / 2, y - rh - 14); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + w / 2 - 4, y - rh - 9); ctx.lineTo(x + w / 2 + 4, y - rh - 9); ctx.stroke();
      }
      if (chim) { ctx.fillStyle = '#171420'; ctx.fillRect(x + w * 0.66, y - 15, 6, 15); }
      // Warm flickering windows.
      const fl = 0.65 + 0.35 * Math.sin(t * 3 + hf * 30);
      ctx.fillStyle = `rgba(255,180,80,${(0.55 * fl).toFixed(2)})`;
      ctx.shadowColor = '#ffb050'; ctx.shadowBlur = 6;
      const rows = Math.max(1, Math.floor(h / 22));
      for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) {
        if (hash2(hf * 10 + r, c + 1) > 0.42) ctx.fillRect(x + 7 + c * (w - 18), y + 8 + r * 20, 5, 6);
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  // A few bats flapping straight across the night sky, wrapping around. Their
  // paths run through the moon's height so some pass IN FRONT of the disc.
  drawBats(ctx, W, H, t) {
    ctx.strokeStyle = 'rgba(10,8,14,0.85)';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const sz = 7 + (i % 2) * 2;
      const speed = 30 + i * 14;
      const bx = ((t * speed + i * 430) % (W + 140)) - 70;
      // Heights cluster around the moon (~H*0.2) so bats fly past it, not around.
      const by = H * (0.17 + 0.05 * i) + Math.sin(t * 1.4 + i) * 12;
      const flap = Math.sin(t * 9 + i * 2) * sz * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx - sz, by);
      ctx.quadraticCurveTo(bx - sz * 0.4, by - sz * 0.6 - flap, bx, by);
      ctx.quadraticCurveTo(bx + sz * 0.4, by - sz * 0.6 - flap, bx + sz, by);
      ctx.stroke();
    }
  },

  // Dry grass tufts, rocks, leaves and branches near the fire — their long
  // shadows sway with the firelight.
  drawGroundLitter(ctx, fx, fy, W, H, t) {
    // A field of wind-swept grass across the foreground. Each tuft has a random
    // number of blades of DIFFERENT heights (no more uniform "spaghetti") —
    // taller/darker nearer the viewer, all leaning together on the gusts.
    const wind = Math.sin(t * 1.5) * 0.6 + Math.sin(t * 0.8 + 1.3) * 0.4;  // -1..1 gust
    for (let i = 0; i < 58; i++) {
      const gx = (i * 89 + 21) % W;
      const depth = hash2(i * 1.7, 7);                 // 0 (far) .. 1 (near)
      const gy = fy + 40 + depth * (H - fy - 26);
      const base = 6 + hash2(i, 3) * 34 + depth * 20;  // this tuft's tallest blade
      const blades = 2 + Math.floor(hash2(i, 11) * 4); // 2..5 blades
      ctx.strokeStyle = depth > 0.5 ? '#4a3a1e' : '#2f2614';
      ctx.lineWidth = 1 + depth * 1.4; ctx.lineCap = 'round';
      for (let b = 0; b < blades; b++) {
        const off = (b - (blades - 1) / 2);
        // Per-blade height varies 45%–100% of the tuft's max so blades stagger.
        const hgt = base * (0.45 + 0.55 * hash2(i * 3.3 + b, b * 2 + 1));
        const lean = 0.6 + hash2(i + b, 5) * 0.8;      // each blade leans a bit differently
        const sway = wind * (3 + depth * 9) * lean + Math.sin(t * 3 + i + b) * 1.6;
        const bx = gx + off * (2 + depth * 2.4);
        ctx.beginPath();
        ctx.moveTo(bx, gy);
        ctx.quadraticCurveTo(bx + sway * 0.5, gy - hgt * 0.6, bx + sway, gy - hgt);
        ctx.stroke();
      }
    }
    // Scattered small stones strewn across the clearing for texture.
    for (let i = 0; i < 16; i++) {
      const sx = (i * 137 + 40) % W;
      const depth = hash2(i * 2.3, 4);
      const sy = fy + 30 + depth * (H - fy - 20);
      const r = 2 + depth * 5 + hash2(i, 8) * 3;
      ctx.fillStyle = depth > 0.5 ? '#413c48' : '#2c2934';
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.62, hash2(i, 2) * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(sx + r * 0.4, sy + r * 0.35, r * 0.6, r * 0.34, 0, 0, TAU); ctx.fill();
    }
    const flick = Math.sin(t * 9) * 0.12 + Math.sin(t * 5.3) * 0.06;
    const items = [
      [fx - 150, fy + 70, 'grass'], [fx + 160, fy + 60, 'grass'], [fx - 240, fy + 110, 'rock'],
      [fx + 250, fy + 100, 'branch'], [fx - 90, fy + 120, 'leaf'], [fx + 110, fy + 130, 'leaf'],
      [fx + 40, fy + 150, 'grass'], [fx - 40, fy + 90, 'branch'], [fx + 300, fy + 150, 'rock'],
      [fx - 320, fy + 150, 'leaf'], [fx - 200, fy + 60, 'rock'], [fx + 210, fy + 40, 'rock'],
      [fx + 90, fy + 80, 'branch'], [fx - 120, fy + 168, 'rock'], [fx + 180, fy + 176, 'branch'],
      [fx - 280, fy + 74, 'leaf'], [fx + 330, fy + 90, 'rock'], [fx + 20, fy + 200, 'rock'],
      [fx - 60, fy + 210, 'leaf'], [fx + 130, fy + 220, 'branch']
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

  // Assorted dragon liveries — body silhouette, moonlit rim, maw ember, and a
  // two-stop fire-breath gradient (colour string prefixes, alpha appended).
  DRAGON_PALETTE: [
    { body: 'rgba(24,34,22,0.95)', rim: 'rgba(130,210,120,0.5)', ember: '#8ef07a', fire: ['rgba(200,255,150,', 'rgba(120,220,80,'] },   // green
    { body: 'rgba(42,20,20,0.95)', rim: 'rgba(232,110,90,0.55)', ember: '#ff6a4a', fire: ['rgba(255,210,120,', 'rgba(255,110,40,'] },   // red
    { body: 'rgba(20,26,44,0.95)', rim: 'rgba(120,162,232,0.5)', ember: '#6aa8ff', fire: ['rgba(185,222,255,', 'rgba(80,140,240,'] },   // blue
    { body: 'rgba(30,20,44,0.95)', rim: 'rgba(184,120,232,0.5)', ember: '#c060ff', fire: ['rgba(226,182,255,', 'rgba(150,70,220,'] },   // purple
    { body: 'rgba(40,32,16,0.95)', rim: 'rgba(236,202,112,0.55)', ember: '#ffcb4a', fire: ['rgba(255,236,150,', 'rgba(240,170,50,'] }, // gold
    { body: 'rgba(30,30,36,0.95)', rim: 'rgba(202,202,216,0.5)', ember: '#e6e6f0', fire: ['rgba(232,232,246,', 'rgba(150,160,188,'] }  // bone
  ],

  // Dragons of assorted colours cross the far sky every 34–89s, weaving up and
  // down and breathing fire. Some spawn small/faint (further away). Several can
  // share the sky at once.
  drawDragons(ctx, W, H, t) {
    if (!this._dragons) { this._dragons = []; this._dragonNext = t + 3 + Math.random() * 6; }
    if (t >= this._dragonNext) {
      const depth = Math.random();                     // 0 far/small/faint .. 1 near/big
      this._dragons.push({
        start: t, dur: 8 + Math.random() * 5, depth,
        base: 0.14 + Math.random() * 0.22,             // altitude fraction of H
        pal: this.DRAGON_PALETTE[Math.floor(Math.random() * this.DRAGON_PALETTE.length)],
        breath: 0.32 + Math.random() * 0.36,
        vamp: 0.06 + Math.random() * 0.07,             // vertical wave amplitude (frac of H)
        vfreq: 1.2 + Math.random() * 1.6,
        phase: Math.random() * TAU,
        loops: 2 + Math.floor(Math.random() * 3)       // up/down cycles across the sky
      });
      this._dragonNext = t + 34 + Math.random() * 55;  // next in 34–89s
    }
    this._dragons = this._dragons.filter(d => (t - d.start) / d.dur < 1);
    for (const d of this._dragons) this.drawOneDragon(ctx, W, H, t, d);
  },

  drawOneDragon(ctx, W, H, t, d) {
    const p = (t - d.start) / d.dur;                   // 0..1 right → left
    const x = (W + 60) - p * (W + 120);
    // Weaves up and down: a steady bob plus a few big swoops across the crossing.
    let y = H * d.base + Math.sin(t * d.vfreq + d.phase) * H * d.vamp
      + Math.sin(p * Math.PI * d.loops) * H * d.vamp * 0.9;
    y = clamp(y, H * 0.09, H * 0.46);                  // clear of the title & the heroes
    const s = Math.min(26, W * 0.03) * (0.45 + d.depth * 0.9);   // further = smaller
    const flap = Math.sin(t * 6 + d.phase) * 0.5;
    const fade = Math.min(1, Math.sin(p * Math.PI) * 2.2) * (0.4 + d.depth * 0.55);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    // Fire breath (from the leading head), during its breath window — team colour.
    const bt = (p - d.breath) / 0.16;
    if (bt > 0 && bt < 1) {
      const fl = Math.sin(bt * Math.PI);
      const fg = ctx.createLinearGradient(-s * 1.2, 0, -s * 4.4, 0);
      fg.addColorStop(0, d.pal.fire[0] + (0.9 * fl).toFixed(3) + ')');
      fg.addColorStop(0.5, d.pal.fire[1] + (0.6 * fl).toFixed(3) + ')');
      fg.addColorStop(1, d.pal.fire[1] + '0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(-s * 1.2, -s * 0.1);
      ctx.lineTo(-s * (2.6 + fl * 1.8), -s * 0.5);
      ctx.lineTo(-s * (2.8 + fl * 1.8), s * 0.5);
      ctx.closePath(); ctx.fill();
    }
    // Silhouette body + serpentine tail.
    ctx.strokeStyle = d.pal.body; ctx.fillStyle = d.pal.body;
    ctx.lineWidth = s * 0.34; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.quadraticCurveTo(0, s * 0.1, s * 1.0, -s * 0.05);
    ctx.quadraticCurveTo(s * 2.0, s * 0.2, s * 2.9, s * 0.55 + Math.sin(t * 4 + d.phase) * s * 0.2);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-s * 1.15, 0, s * 0.42, s * 0.3, 0, 0, TAU); ctx.fill();
    // Wings — bat-like, flapping.
    const wy = -s * (0.9 + flap);
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.2, wy, -s * 1.5, wy * 0.5);
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.1, -s * 0.1, -s * 0.1);
    ctx.moveTo(s * 0.2, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, wy, s * 1.7, wy * 0.5);
    ctx.quadraticCurveTo(s * 0.7, -s * 0.1, s * 0.2, -s * 0.1);
    ctx.fill();
    // Coloured rim along the wing tops so the shape separates from the sky.
    ctx.strokeStyle = d.pal.rim; ctx.lineWidth = Math.max(0.8, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.1); ctx.quadraticCurveTo(-s * 0.2, wy, -s * 1.5, wy * 0.5);
    ctx.moveTo(s * 0.2, -s * 0.1); ctx.quadraticCurveTo(s * 0.5, wy, s * 1.7, wy * 0.5);
    ctx.stroke();
    // A constant ember at the maw so the dragon is trackable between breaths.
    ctx.fillStyle = d.pal.ember; ctx.shadowColor = d.pal.ember; ctx.shadowBlur = s * 0.6;
    ctx.beginPath(); ctx.arc(-s * 1.4, 0, s * 0.14, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  // A fallen adventurer's skeleton resting in the grass, sword and shield beside
  // it — a bit of lore-flavoured foreground clutter.
  drawFallenSkeleton(ctx, x, y, sc, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    // Soft ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 6, 46, 12, 0, 0, TAU); ctx.fill();
    // Round wooden shield (to the left), rim + boss.
    ctx.fillStyle = '#3a2c1c';
    ctx.beginPath(); ctx.ellipse(-34, 2, 15, 12, -0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-34, 2, 15, 12, -0.2, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#6a6470';
    ctx.beginPath(); ctx.arc(-34, 2, 3.4, 0, TAU); ctx.fill();
    // Sword (to the right), blade + crossguard + grip.
    ctx.strokeStyle = '#b9c0cc'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(24, 4); ctx.lineTo(58, -6); ctx.stroke();
    ctx.strokeStyle = '#7a6a48'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(28, 0); ctx.stroke();          // crossguard
    ctx.strokeStyle = '#4a3a22'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, 12); ctx.lineTo(23, 6); ctx.stroke();          // grip
    // Bones — ribcage, spine, limbs, skull. Bone-white with faint shadow.
    const bone = '#c7c2b2';
    ctx.strokeStyle = bone; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    // Spine.
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(12, -2); ctx.stroke();
    // Ribs.
    for (let i = 0; i < 4; i++) {
      const rx = -6 + i * 4.5;
      ctx.beginPath(); ctx.moveTo(rx, -1); ctx.quadraticCurveTo(rx + 1, 7, rx + 4, 8); ctx.stroke();
    }
    // Arm + leg bones.
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-18, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(22, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(16, 12); ctx.stroke();
    // Skull (head lolled to the left).
    ctx.fillStyle = bone;
    ctx.beginPath(); ctx.arc(-16, -2, 6.5, 0, TAU); ctx.fill();
    ctx.fillRect(-14, 2, 5, 4);                                                     // jaw
    ctx.fillStyle = '#2a2620';
    ctx.beginPath(); ctx.arc(-18, -3, 1.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-14, -3, 1.7, 0, TAU); ctx.fill();
    ctx.restore();
  },

  // Draw one roster position: a hero (if the slot is filled) or an empty
  // "create" plinth, plus its nameplate, selection ring and tap region.
  drawRosterSpot(ctx, sp, scale, delMode) {
    const snap = Profiles.slots[sp.i];
    const R = 70 * scale;
    if (snap) {
      // The hero's PAINTED AVATAR rests by the fire (male/female per the
      // save; old saves without a gender default to male). The procedural
      // hooded figure stands in until the art loads.
      const spr = Game.heroSprite ? Game.heroSprite(snap.gender === 'f' ? 'f' : 'm', 'front', snap.hair || 0) : null;
      if (spr) this.drawRosterAvatar(ctx, sp.x, sp.y, scale, spr, sp.i);
      else this.drawNecroFigure(ctx, sp.x, sp.y, scale, snap.eyeColor || '#6ff7c3', false);
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
      // Nameplate — below the front heroes (ABOVE their heads on short
      // landscape screens, clear of the bottom controls), higher above the
      // one behind the fire (clamped below the title).
      const short = (Game.H || 600) < 480;
      const ny = sp.front
        ? (short ? sp.y - 96 * scale : sp.y + 80 * scale)
        : Math.max(sp.y - 96 * scale, (Game.H || 600) * 0.16 + 12);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px Cinzel, Georgia';
      ctx.fillStyle = selRing ? '#ffd76a' : '#e8e0cc';
      ctx.fillText(this.fitText(ctx, snap.name || 'The Nekromancer', 150), sp.x, ny);
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#9a8f7a';
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
      ctx.font = 'bold 22px Cinzel, Georgia'; ctx.fillStyle = '#6ff7c3';
      ctx.fillText('＋', sp.x, sp.y - 6 * scale);
      ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = '#8fb0e8';
      const shortE = (Game.H || 600) < 480;
      ctx.fillText('New Nekromancer', sp.x,
        sp.front ? (shortE ? sp.y - 84 * scale : sp.y + 82 * scale)
          : Math.max(sp.y - 74 * scale, (Game.H || 600) * 0.16 + 12));
      if (!delMode) {
        UI.register(sp.x - R * 0.6, sp.y - R, R * 1.2, R * 1.6, () => {
          if (Profiles.create(sp.i)) UI.open('create');
        });
      }
    }
  },

  // A roster hero as their painted avatar: standing quietly by the fire with
  // just a slow breath (subtle — no walk animation here). Feet sit on the same
  // ground line the procedural figure used (y + 56·scale).
  drawRosterAvatar(ctx, x, y, scale, spr, seed) {
    const HT = 112 * scale;
    const w = HT * (spr.width / spr.height);
    const feetY = y + 56 * scale;
    const breath = Math.sin((Game.time || 0) * 1.5 + (seed || 0) * 1.7);
    ctx.save();
    // Ground shadow + warm fire glow at the feet.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(x, feetY, w * 0.42, 10 * scale, 0, 0, TAU); ctx.fill();
    ctx.translate(x, feetY);
    ctx.rotate(breath * 0.006);
    ctx.drawImage(spr, -w / 2, -HT - breath * 0.9 * scale, w, HT + breath * 0.9 * scale);
    ctx.restore();
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
    // Glowing ember bed, breathing (softer now).
    const t = Game.time;
    const eb = 0.26 + 0.12 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(230,100,34,${eb.toFixed(2)})`;
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
    // Softer glow, and a dimmer/thinner white-hot core so the centre isn't blinding.
    ctx.shadowColor = '#ff8c2a'; ctx.shadowBlur = 15;
    flame(19, 50, 'rgba(180,48,16,0.82)', 0.0);
    flame(14, 40, 'rgba(230,112,30,0.82)', 1.7);
    flame(9, 28, 'rgba(240,180,84,0.72)', 3.1);
    flame(4, 16, 'rgba(255,232,170,0.5)', 4.6);
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
  // The showcase model with the chosen HAIR COLOR tinted in (cached per
  // gender+hair; index 0 = the painting's own black).
  _showTint: {},
  showcaseTinted(gd, hair) {
    if (!hair) return null;
    const key = gd + ':' + hair;
    if (this._showTint[key]) return this._showTint[key];
    const src = Game.uiImg(gd === 'f' ? 'showcase_f' : 'showcase_m');
    if (!src || !src.complete || !src.naturalWidth) return null;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const col = (HAIR_COLORS[hair] && HAIR_COLORS[hair].hex) || '#ffffff';
    // A soft crown-centred radial, masked to the figure — reads as hair.
    g.globalCompositeOperation = 'source-atop';
    const hx = c.width / 2, hy = c.height * 0.045, hr = c.width * 0.30;
    const rg = g.createRadialGradient(hx, hy, hr * 0.12, hx, hy, hr);
    rg.addColorStop(0, col + 'aa');
    rg.addColorStop(0.65, col + '55');
    rg.addColorStop(1, col + '00');
    g.fillStyle = rg;
    g.fillRect(0, 0, c.width, c.height);
    this._showTint[key] = c;
    return c;
  },

  create(ctx, W, H) {
    // CREATE YOUR NEKROMANCER, part 2 (owner art): painted vista behind,
    // gender medallions in their own left menu, the big SHOWCASE model
    // centre-stage over rolling ground fog, name + CREATE beneath, a lore
    // panel with the four classic spells at right, and the gear medallion
    // (bottom-right) into Settings.
    const t = Game.time || 0;
    const cbg = Game.uiImg('create_bg');
    ctx.fillStyle = '#050408'; ctx.fillRect(0, 0, W, H);
    if (cbg && cbg.complete && cbg.naturalWidth) {
      if (W < H) {
        const cf = W / cbg.width;
        ctx.drawImage(cbg, 0, 0, cbg.width * cf, cbg.height * cf);
      } else {
        const cf = Math.max(W / cbg.width, H / cbg.height);
        ctx.drawImage(cbg, (W - cbg.width * cf) / 2, (H - cbg.height * cf) / 2, cbg.width * cf, cbg.height * cf);
      }
      ctx.fillStyle = 'rgba(3,2,6,0.30)'; ctx.fillRect(0, 0, W, H);
    }
    // Defaults FEMALE on a fresh visit (owner rule).
    if (UI.sel._cinit === undefined) { UI.sel._cinit = 1; Hero.gender = 'f'; }
    const gd = Hero.gender || 'f';
    const wide = W >= 760;
    // Left-panel geometry up front so the model can sit CLEAR of it on
    // phones (owner fix v1.7.21 — the model used to hide behind the panel).
    const lpW = wide ? Math.min(210, W * 0.24) : Math.min(178, W * 0.42);
    const lpX = wide ? Math.max(10, W * 0.03) : 8;
    // Wide screens keep the model centre-stage; phones nudge it into the
    // space to the RIGHT of the panel so nothing overlaps.
    const cx = wide ? W * 0.5 : (lpX + lpW + (W - lpX - lpW) / 2);

    // ---- the FULL per-hair-colour MODEL, centre-stage ----
    // Owner rule v1.7.21: show the ACTUAL model that changes with the chosen
    // hair colour — NOT an airbrushed head over one showcase render. This is
    // the same front art the walking hero uses (m_front[_hN].webp), so a new
    // hair choice swaps the whole figure. Falls back to the showcase render
    // only until the hero art loads.
    const model = (Game.heroImg && Game.heroImg(gd, 'front', Hero.hair || 0)) ||
                  Game.uiImg(gd === 'f' ? 'showcase_f' : 'showcase_m');
    const feet = H * (wide ? 0.74 : 0.58);
    const mh = H * (wide ? 0.56 : 0.40);
    if (model && model.complete && model.naturalWidth) {
      const mw = mh * (model.width / model.height);
      const breath = Math.sin(t * 1.5) * 1.4;
      ctx.drawImage(model, cx - mw / 2, feet - mh - breath, mw, mh + breath);
    } else {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('the flesh takes shape…', cx, feet - mh / 2);
    }

    // ---- LEFT MENU: gender medallions + hair-colour busts ----
    // (lpW / lpX computed above so the model clears the panel on phones.)
    const lpH = wide ? 388 : 300;
    const lpY = wide ? H / 2 - lpH / 2 : Math.max(50, H * 0.10);
    UI.panel(ctx, lpX, lpY, lpW, lpH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
    ctx.fillText('GENDER', lpX + lpW / 2, lpY + 24);
    const gsz = wide ? 58 : 46;
    const gy2 = lpY + 40;
    [['m', 'gender_m'], ['f', 'gender_f']].forEach(([g3, key], gi) => {
      const gx2 = lpX + lpW / 2 + (gi === 0 ? -gsz - 8 : 8);
      const img = Game.uiImg(key);
      const on = gd === g3;
      const mp2 = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
      const hov = !!(mp2 && mp2.x >= gx2 && mp2.x <= gx2 + gsz && mp2.y >= gy2 && mp2.y <= gy2 + gsz);
      if (img && img.complete && img.naturalWidth) {
        ctx.save();
        if (hov) { ctx.shadowColor = 'rgba(232,226,208,0.8)'; ctx.shadowBlur = 18; }
        ctx.globalAlpha = on ? 1 : (hov ? 0.75 : 0.45);
        ctx.drawImage(img, gx2, gy2, gsz, gsz);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = on ? '#cfc8b8' : '#3a3448'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx2 + gsz / 2, gy2 + gsz / 2, gsz / 2 - 2, 0, TAU); ctx.stroke();
        ctx.font = (gsz * 0.5) + 'px Georgia'; ctx.fillStyle = on ? '#e8e2d0' : '#8a8070';
        ctx.fillText(g3 === 'm' ? '♂' : '♀', gx2 + gsz / 2, gy2 + gsz / 2);
      }
      if (on) {
        const pl = 0.45 + 0.2 * Math.sin(t * 2.6);
        ctx.strokeStyle = 'rgba(120,220,215,' + pl.toFixed(3) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx2 + gsz / 2, gy2 + gsz / 2, gsz / 2 + 3, 0, TAU); ctx.stroke();
      }
      UI.register(gx2 - 3, gy2 - 3, gsz + 6, gsz + 6, () => { Hero.gender = g3; });
    });
    // Hair-colour busts (3 across).
    ctx.font = '600 12px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
    ctx.fillText('HAIR COLOR', lpX + lpW / 2, gy2 + gsz + 22);
    const hcols = 3, hgap = 8;
    const sw = Math.min(52, (lpW - 32 - (hcols - 1) * hgap) / hcols);
    const hy0 = gy2 + gsz + 36;
    const hx0 = lpX + lpW / 2 - (hcols * sw + (hcols - 1) * hgap) / 2;
    HAIR_COLORS.forEach((c, i) => {
      const bx = hx0 + (i % hcols) * (sw + hgap);
      const by = hy0 + Math.floor(i / hcols) * (sw + hgap);
      const sel = (Hero.hair || 0) === i;
      ctx.fillStyle = '#16121d';
      rr(ctx, bx, by, sw, sw, 8); ctx.fill();
      const bust = Game.heroBust ? Game.heroBust(gd, i) : null;
      if (bust) {
        const s2 = Math.min((sw - 4) / bust.width, (sw - 4) / bust.height);
        const dw = bust.width * s2, dh2 = bust.height * s2;
        ctx.save();
        rr(ctx, bx + 1, by + 1, sw - 2, sw - 2, 7); ctx.clip();
        ctx.drawImage(bust, bx + (sw - dw) / 2, by + sw - dh2 - 2, dw, dh2);
        ctx.restore();
      } else {
        ctx.fillStyle = c.hex;
        ctx.beginPath(); ctx.arc(bx + sw / 2, by + sw / 2, sw * 0.28, 0, TAU); ctx.fill();
      }
      const mpb = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
      const bhov = !!(mpb && mpb.x >= bx && mpb.x <= bx + sw && mpb.y >= by && mpb.y <= by + sw);
      ctx.save();
      if (bhov && !sel) { ctx.shadowColor = 'rgba(232,226,208,0.7)'; ctx.shadowBlur = 12; }
      ctx.strokeStyle = sel ? '#f2ecd8' : bhov ? '#cfc8b8' : '#3a3448';
      ctx.lineWidth = sel ? 2.5 : 1.2;
      rr(ctx, bx, by, sw, sw, 8); ctx.stroke();
      ctx.restore();
      UI.register(bx, by, sw, sw, () => { Hero.hair = i; });
    });

    // ---- RIGHT MENU: the Nekromancer's lore + the four classic spells ----
    if (wide) {
      // Wider about panel (owner rule) — the lore never clips.
      const rpW = Math.min(330, W * 0.34);
      const rpH = Math.min(450, H - 50);
      const rpX = W - rpW - Math.max(10, W * 0.025);
      const rpY = H / 2 - rpH / 2;
      UI.panel(ctx, rpX, rpY, rpW, rpH, 'THE NEKROMANCER');
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
      let ry = this.wrapCentered(ctx,
        'A master of death and decay from the cult of Bellmahath. Where others see corpses, the Nekromancer sees an army waiting for orders. The dead obey.',
        rpX + rpW / 2, rpY + 58, rpW - 44, 15, 7);
      ry += 14;
      ctx.font = '600 12px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
      ctx.fillText('— CLASSIC SPELLS —', rpX + rpW / 2, ry);
      ry += 12;
      const SPELLS = [
        ['corpseExplosion', 'Corpse Explosion', 'Detonate the fallen in a shower of gore', '#ffb43a'],
        ['deathNova', 'Death Nova', 'A poison ring that scours all around you', '#9adf5a'],
        ['boneArmor', 'Bone Armor', 'Shield yourself in the bones of the dead', '#e8e2d0'],
        ['commandSkeletons', 'Command Skeletons', 'Raise a tireless skeletal army', '#8fd0ff']
      ];
      for (const [id, nm, desc] of SPELLS.map(x => x)) {
        const col = SPELLS.find(sp => sp[0] === id)[3];
        ctx.save();
        ctx.beginPath(); ctx.arc(rpX + 32, ry + 18, 15, 0, TAU);
        ctx.fillStyle = '#16121d'; ctx.fill();
        ctx.restore();
        UI.circleFrame(ctx, rpX + 32, ry + 18, 15);
        if (typeof drawSkillIcon === 'function') drawSkillIcon(ctx, id, rpX + 32, ry + 18, 12);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 12px Cinzel, Georgia'; ctx.fillStyle = col;
        ctx.fillText(nm, rpX + 56, ry + 13);
        ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
        const dB = wrapText(ctx, desc, rpX + 56, ry + 27, rpW - 76, 12, 2);
        ry += Math.max(46, (dB - ry) + 12);
      }
    }

    // ---- NAME YOUR NEKROMANCER + CREATE, beneath the model ----
    // On phones these sit below the panel where the whole width is free, so
    // they centre on the SCREEN (owner fix v1.7.21); wide screens keep cx.
    const ncx = wide ? cx : W / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 13px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
    const ny = wide ? H * 0.79 : H * 0.64;
    ctx.fillText('NAME YOUR NEKROMANCER', ncx, ny);
    const nw = Math.min(320, W * (wide ? 0.5 : 0.72));
    UI.btn(ctx, ncx - nw / 2, ny + 10, nw, 34, this.fitText(ctx, Hero.name || 'Nekromancer', nw - 30), () => {
      let q = null;
      try { q = window.prompt('Name your Nekromancer (letters only, max 12):', Hero.name || ''); } catch (e) { /* blocked */ }
      // Letters only, no spaces/numbers/specials, max 12 (owner rules).
      if (q !== null) { const t2 = q.replace(/[^A-Za-z]/g, '').slice(0, 12); Hero.name = t2 || 'Nekromancer'; }
    }, { size: 14, border: '#6b5f80', color: '#e8e0cc' });
    // CREATE on the ADVANCED plate — straight to New Haven (owner rule).
    UI.btnPlate3(ctx, ncx - nw / 2, ny + 54, nw, 40, 'CREATE', () => {
      if (!Hero.name) Hero.name = 'Nekromancer';
      if (!Hero.eyeColor) Hero.eyeColor = '#6ff7c3';
      Hero.save();
      Game.enterTown();
    }, { size: 15 });
    // BACK to the hero-select campfire, lower left (simple plate).
    UI.btnPlate2(ctx, 14, H - 42, 130, 28, 'BACK', () => UI.open('select'), { size: 11 });

    // ---- the SETTINGS gear medallion, lower right ----
    const gear = Game.uiImg('gear');
    const gr2 = wide ? 34 : 28;
    const gcx = W - gr2 - 16, gcy = H - gr2 - 16;
    const mpg = (typeof Input !== 'undefined' && !Input.touchMode) ? Input.mousePos : null;
    const ghov = !!(mpg && Math.hypot(mpg.x - gcx, mpg.y - gcy) < gr2 + 6);
    if (gear && gear.complete && gear.naturalWidth) {
      ctx.save();
      if (ghov) { ctx.shadowColor = 'rgba(232,226,208,0.8)'; ctx.shadowBlur = 18; }
      ctx.drawImage(gear, gcx - gr2, gcy - gr2, gr2 * 2, gr2 * 2);
      ctx.restore();
    } else {
      ctx.strokeStyle = '#8a8070'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gcx, gcy, gr2 - 4, 0, TAU); ctx.stroke();
      ctx.font = (gr2) + 'px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#c9bfa8'; ctx.fillText('⚙', gcx, gcy);
    }
    UI.register(gcx - gr2, gcy - gr2, gr2 * 2, gr2 * 2, () => {
      UI.settingsBack = 'create';
      UI.open('settings');
    });
  },

  dim(ctx, W, H) {
    ctx.fillStyle = 'rgba(4,2,8,0.82)';
    ctx.fillRect(0, 0, W, H);
  },

  // Hand-drawn shop interiors (owner art) behind the Blacksmith/Jeweler/Mystic
  // menus: the painting fills the screen (cover-fit) under a dark veil so the
  // panel content stays readable, then the menu draws on top. Falls back to the
  // plain dim() until the image loads.
  shopImg: {},
  // Warm the three shop interiors at boot (see Game.preloadArt).
  preloadShops() {
    for (const key of ['smith', 'jeweler', 'mystic']) {
      if (!this.shopImg[key]) {
        const img = new Image();
        img.src = 'art/shops/' + key + '.webp?v=' + (typeof ART_V !== 'undefined' ? ART_V : '1');
        this.shopImg[key] = img;
      }
    }
  },
  shopBackdrop(ctx, W, H, key, veil = 0.66) {
    let img = this.shopImg[key];
    if (!img) {
      img = new Image();
      img.src = 'art/shops/' + key + '.webp?v=' + (typeof ART_V !== 'undefined' ? ART_V : '1');
      this.shopImg[key] = img;
    }
    if (img.complete && img.naturalWidth) {
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      // Veil so panel content stays readable (hubs pass a LIGHTER veil so the
      // interior painting is the star — owner rule: show the art first).
      ctx.fillStyle = 'rgba(4,2,8,' + veil + ')';
      ctx.fillRect(0, 0, W, H);
    } else {
      this.dim(ctx, W, H);
    }
  },

  // Artisan HUB (owner rule): entering a shop shows its INTERIOR ART first with
  // a slim column of category buttons. Each button opens a sub-screen; closing a
  // sub-screen (✕ / Escape / EXIT) drops back HERE (art visible again); closing
  // the hub leaves the shop. `buttons` = [label, desc, screenId|cb, color].
  // Walking into an artisan's shop shows the PAINTED INTERIOR first with a
  // "welcome" moment unique to each artisan (owner rule) — the benches only
  // appear after you step inside. Returning from a bench skips the welcome
  // (closeAction sets UI.sel.inside), so browsing benches stays snappy.
  ARTISAN_INTROS: {
    smith: {
      npc: 'THARN', color: '#ffb43a', welcome: 'WELCOME TO THE FORGE',
      info: '"The coals never cool in New Haven. Bring me your battle-scrap and I\'ll break it down to parts, dust and crystal — or set the hammer to fresh steel: weapons, armor, and torches to carry the Light into the dark."',
      enter: 'STEP UP TO THE ANVIL'
    },
    jeweler: {
      npc: 'ORREN', color: '#4ecbe0', welcome: "WELCOME TO THE JEWELER'S",
      info: '"Every stone has a soul, friend — let me show you. I cut fresh gems, merge three of a kind into finer ones, set them snug into your sockets and pry them out again without a scratch. Tired of a stone? I pay honest gold."',
      enter: 'BROWSE THE STONES'
    },
    mystic: {
      npc: 'VESSA', color: '#b06adf', welcome: 'WELCOME TO THE SANCTUM',
      info: '"Sit, child — the threads of fate can always be rewoven. I reroll the properties on your gear until they suit you, and I keep a wardrobe of wonders besides: pets to walk beside you, wings for your back, and themes to re-tint the very world."',
      enter: 'PART THE VEIL'
    }
  },

  artisanIntro(ctx, W, H, artKey) {
    const I = this.ARTISAN_INTROS[artKey];
    // No ✕, no round EXIT on the welcome splash (owner rule v1.7.0) —
    // tapping anywhere steps inside; Escape still leaves.
    UI.introShowing = true;
    // The art is the star — barely veiled.
    this.shopBackdrop(ctx, W, H, artKey, 0.10);
    // A readability gradient over the lower third only.
    const g = ctx.createLinearGradient(0, H * 0.30, 0, H);
    g.addColorStop(0, 'rgba(2,1,4,0)'); g.addColorStop(1, 'rgba(2,1,4,0.9)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.30, W, H * 0.70);

    // Anywhere on the art steps inside (Escape still exits).
    UI.register(0, 0, W, H, () => { UI.sel.inside = true; AudioSys.sfx('gold'); });

    // Spaced-out groupings (owner rule): name · WELCOME · flavor · button,
    // each with real air between them.
    const pad = 40;
    const bw = Math.min(300, W - 40), bx = W / 2 - bw / 2;
    const by = H - pad - 44;
    const iw = Math.min(470, W - 48);
    let iy = by - 30 - 5 * 18;   // flavor block, well above the button

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText('—  ' + I.npc + '  —', W / 2, iy - 74);
    ctx.font = 'bold ' + (W < 520 ? 20 : 26) + 'px Cinzel, Georgia';
    ctx.fillStyle = I.color;
    ctx.shadowColor = I.color; ctx.shadowBlur = 16;
    ctx.fillText(this.fitText(ctx, I.welcome, W - 30), W / 2, iy - 38);
    ctx.shadowBlur = 0;
    // Flavor text CENTERED (owner rule).
    ctx.font = 'italic ' + (W < 520 ? 11 : 12) + 'px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
    this.wrapCentered(ctx, I.info, W / 2, iy, iw, 18, 5);

    UI.btnPlate(ctx, bx, by, bw, 40, I.enter, () => { UI.sel.inside = true; AudioSys.sfx('gold'); },
      { size: 13 });
  },

  // Center-aligned wrapText (ctx.textAlign must be 'center').
  wrapCentered(ctx, text, cx, y, maxW, lineH, maxLines) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines[maxLines - 1] = lines.slice(maxLines - 1).join(' '); lines.length = maxLines; }
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], cx, y + i * lineH);
    return y + lines.length * lineH;
  },

  artisanHub(ctx, W, H, artKey, title, npcLine, buttons, trainKey) {
    // First moment in the shop: the interior art + the artisan's welcome.
    if (!UI.sel.inside && this.ARTISAN_INTROS[artKey]) { this.artisanIntro(ctx, W, H, artKey); return; }
    this.shopBackdrop(ctx, W, H, artKey, 0.34);
    // Wider panel so the artisan's full name never clips (owner rule v1.7.27).
    const pw = Math.min(520, W - 24);
    const px = W / 2 - pw / 2;
    const rowH = 58;
    // A maxed artisan shows NO level line at all (owner rule: no "10/10 (MAX)").
    const showTrain = trainKey && (Hero.artisans[trainKey.k] || 1) < 10;
    const ph = 104 + (showTrain ? 52 : 0) + buttons.length * rowH + 14;
    // Panel hugs the bottom; in town it stops above the round EXIT button's
    // corner zone so the last bench row is never covered (owner screenshots).
    const py = Math.max(10, H - ph - (Game.state === 'town' ? 150 : 24));
    // BIG artisan name (owner rule v1.7.2) — hand-drawn title over the panel.
    UI.panel(ctx, px, py, pw, ph);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 20px Cinzel, Georgia';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(this.fitText(ctx, title.toUpperCase(), pw - 90), px + pw / 2, py + 26.5);
    ctx.fillStyle = '#dcc9a2';
    ctx.fillText(this.fitText(ctx, title.toUpperCase(), pw - 56), px + pw / 2, py + 25);
    ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 16, py + 44); ctx.lineTo(px + pw - 16, py + 44); ctx.stroke();
    ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText(this.fitText(ctx, npcLine, pw - 30), W / 2, py + 58);
    let y = py + 72;
    if (showTrain) { y = this.artisanRow(ctx, px, pw, y + 6, trainKey.k, trainKey.label); }
    // Bench rows wear the SIMPLE plate (v1.6.96 owner rule — the ornate
    // skull plate stays on the ☰ MENU and the town); the bench's one-line
    // description sits beneath the plate in small italics. Plates are inset
    // off the panel edges so they never span the full width (owner rule).
    const bInset = Math.round(pw * 0.11), bx = px + bInset, bw = pw - bInset * 2;
    for (const [label, desc, target] of buttons) {
      const cb = typeof target === 'function' ? target : () => UI.open(target);
      UI.btnPlate2(ctx, bx, y + 2, bw, rowH - 24, String(label).replace(/^[^A-Za-z]*/, ''), cb, { size: 14, tip: desc });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 9px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      ctx.fillText(this.fitText(ctx, desc, pw - 60), px + pw / 2, y + rowH - 11);
      y += rowH;
    }
  },

  // The ☰ MENU (owner-ruled order): Character on top, Inventory under it,
  // Journal, Skills & Passives, Achievements beneath them, Settings last.
  sysmenu(ctx, W, H) {
    this.dim(ctx, W, H);
    const rows = [
      ['👤   CHARACTER', 'character', '#ffd76a'],
      ['🎒   INVENTORY', 'radial', '#6ff7c3'],
      ['📜   JOURNAL', 'journal', '#e8c56a'],
      ['⚔   SKILLS & PASSIVES', 'skills', '#b06adf'],
      ['🏆   ACHIEVEMENTS', 'achievements', '#8fd0a0'],
      ['⚙   SETTINGS', 'settings', '#c9bfa8']
    ];
    // This same menu serves the dungeons (owner rule — rifts, seasons,
    // bounties, acts and Adventure use the ☰ MENU, not a separate pause
    // screen); there it grows an ABANDON row so a run can still be quit.
    const inRun = Game.state === 'playing';
    const mode = !inRun ? '' : Game.story ? 'Campaign'
      : Game.riftMode ? ((Game.zone && Game.zone.riftKind === 'season') ? 'Blood Moon'
        : (Game.zone && Game.zone.riftKind === 'greater') ? 'The Abyss' : 'The Ossuary')
      : (Game.bountyPart === 0 && Game.journeyIdx === null) ? 'Expedition'
      : 'Harvest';
    const pw = Math.min(360, W - 24);
    const px = W / 2 - pw / 2;
    // Compact rows on short (landscape phone) screens so all rows fit. The
    // plate art overhangs its rect ~21% top and bottom, so rows need real
    // breathing room or the plates touch (owner rule: space them out).
    const nRows = rows.length + (inRun ? 1 : 0);
    const rowH = H < (inRun ? 600 : 550) ? 46 : 62;
    const btnH = rowH - 20;
    const ph = 64 + nRows * rowH + 14;
    const py = Math.max(8, Math.min(H / 2 - ph / 2, H - ph - (Game.state === 'town' ? 150 : 12)));
    UI.panel(ctx, px, py, pw, ph, 'MENU');
    let y = py + 56;
    for (const [label, target] of rows) {
      // Character→Achievements ride the SIMPLE plate; SETTINGS keeps the
      // gothic plate (owner rule v1.7.0). ABANDON keeps the old ornate.
      const plateFn = target === 'settings' ? 'btnPlate3' : 'btnPlate2';
      UI[plateFn](ctx, px + 16, y, pw - 32, btnH, label.replace(/^[^A-Z]*/, ''), () => UI.open(target),
        { size: H < 520 ? 13 : 15 });
      y += rowH;
    }
    if (inRun) {
      UI.btnPlate(ctx, px + 16, y, pw - 32, btnH, 'ABANDON ' + mode.toUpperCase(), () => Game.toCamp(),
        { size: H < 520 ? 13 : 15, color: '#e04a5a' });
    }
  },

  // The QUEST JOURNAL from the ☰ MENU — read your accepted quests anywhere.
  // Progress bars live-update; finished deeds say to see Lukus (turn-ins are
  // his), and unfinished ones can be dropped back to his queue from here.
  // The QUEST JOURNAL from the ☰ MENU — every accepted quest, GROUPED BY
  // GIVER (owner rule: Addy's quests SHOW DIFFERENTLY, and both Lukus's and
  // Addy's quests ride together — 7 slots EACH). Lukus's deeds wear his
  // gold; Addy's jobs wear Underworld violet with her stripe.
  journal(ctx, W, H) {
    this.dim(ctx, W, H);
    const jr = Hero.journal || [];
    const pw = Math.min(470, W - 24);
    const px = W / 2 - pw / 2;
    const ph = Math.min(560, H - (Game.state === 'town' ? 170 : 24));
    const py = Math.max(10, Math.min(H / 2 - ph / 2, H - ph - (Game.state === 'town' ? 150 : 12)));
    UI.panel(ctx, px, py, pw, ph, '📜 JOURNAL');

    const givers = [
      { src: 'L', tag: '⚔  LUKUS, BRINGER OF LIGHT', color: '#ffd76a', nameCol: '#e8e0cc',
        barCol: '#8a6f2a', bg: 'rgba(28,24,38,0.6)', see: 'see Lukus',
        list: jr.filter(e => e.src !== 'A'),
        done: clamp(Hero.questLine || 0, 0, QUEST_COUNT), total: QUEST_COUNT, show: true },
      { src: 'A', tag: '🗡  ADDY, QUEEN OF THE UNDERWORLD', color: '#c86adf', nameCol: '#e8b3f2',
        barCol: '#7a4a8f', bg: 'rgba(40,26,46,0.65)', see: 'see Addy',
        list: jr.filter(e => e.src === 'A'),
        done: clamp(Hero.addyLine || 0, 0, ADDY_QUEST_COUNT), total: ADDY_QUEST_COUNT,
        show: Hero.level >= 70 || jr.some(e => e.src === 'A') || (Hero.addyLine || 0) > 0 }
    ];

    // Scrollable, sectioned list — padded off the panel edges (owner rule),
    // rows sit INSIDE the padding rather than spanning the full width.
    const lx = px + 26, lw = pw - 52;
    const listTop = py + 56, viewBot = py + ph - 18, viewH = Math.max(50, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: lx - 4, y: listTop - 4, w: lw + 8, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(lx - 4, listTop - 4, lw + 8, viewH + 8); ctx.clip();
    let c = listTop;
    const vis = (top, hh) => (top - scrollY + hh > listTop) && (top - scrollY < viewBot);

    for (const g of givers) {
      if (!g.show) continue;
      // Section header: the giver + how many quests they're carrying. The total
      // ledger count ("n / 500 done") is HIDDEN — the player shouldn't know how
      // many quests exist (owner rule).
      if (vis(c, 24)) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 10px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
        ctx.fillText(this.fitText(ctx, g.tag, lw - 60), lx, c - scrollY + 10);
        ctx.textAlign = 'right'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
        ctx.fillText(g.list.length + ' / ' + QUEST_JOURNAL_MAX, lx + lw, c - scrollY + 10);
      }
      c += 22;
      if (!g.list.length) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ctx.fillText(g.src === 'A'
          ? (Hero.level >= 70 ? 'No quests from Addy right now.' : "Addy's ledger opens at level 70.")
          : 'No deeds from Lukus right now.', lx, c - scrollY + 9);
        c += 22;
      }
      for (const entry of g.list.slice()) {
        const qp = Hero.questProgress(entry);
        if (!qp.def) { Hero.abandonQuest(entry); continue; }
        const def = qp.def, milestone = def.tid === 'reach';
        const qKey = (entry.src === 'A' ? 'A' : 'L') + entry.idx;
        const expanded = UI.sel.qInfo === qKey;
        const yy = c - scrollY;
        if (vis(c, 62)) {
          ctx.fillStyle = expanded ? 'rgba(46,42,58,0.8)' : g.bg;
          rr(ctx, lx - 4, yy, lw + 8, 58, 6); ctx.fill();
          // The stripe on the row's left edge wears the ACTIVE THEME's color
          // (v1.6.96 owner rule — "if violet, do violet").
          ctx.fillStyle = UI.theme().title;
          rr(ctx, lx - 4, yy, 3, 58, 2); ctx.fill();
          if (expanded) { ctx.strokeStyle = milestone ? '#b06adf' : g.barCol; ctx.lineWidth = 1.2; rr(ctx, lx - 4, yy, lw + 8, 58, 6); ctx.stroke(); }
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = milestone ? '#b06adf' : g.nameCol;
          ctx.fillText(this.fitText(ctx, (milestone ? '★ ' : '') + def.name, lw - 60), lx + 4, yy + 14);
          ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
          ctx.fillText(this.fitText(ctx, def.desc, lw - 60), lx + 4, yy + 27);
          UI.bar(ctx, lx + 4, yy + 33, lw - 64, 9, qp.prog / def.need, '#221d2e', qp.done ? '#4ade80' : g.barCol);
          ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          ctx.fillText(qp.prog + ' / ' + def.need + '  ·  tap for details', lx + 4, yy + 52);
          // Tap the row body (left of the buttons) for full details + reward.
          UI.register(lx - 4, yy, lw - 56, 58, () => { UI.sel.qInfo = expanded ? null : qKey; });
          if (qp.done) {
            ctx.textAlign = 'right'; ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#4ade80';
            ctx.fillText('✔ READY', lx + lw - 2, yy + 30);
            ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#7ab88a';
            ctx.fillText(g.see, lx + lw - 2, yy + 42);
          } else if (!def.abs) {
            UI.btnPlate2(ctx, lx + lw - 50, yy + 18, 48, 22, 'DROP', () => {
              Hero.abandonQuest(entry);
              UI.toast('Returned to ' + (g.src === 'A' ? 'Addy' : 'Lukus') + ': ' + def.name, '#9a9080');
            }, { size: 8, border: '#7a4a4a', color: '#c98a8a' });
          }
        }
        c += 64;
        // Expanded detail card: full text, place in the line, and the EXACT
        // reward it pays (rewards are fixed per quest — what you read is what
        // you get, owner rule).
        if (expanded) {
          const eh = 110;
          const ey = c - scrollY;
          if (vis(c, eh)) {
            ctx.fillStyle = 'rgba(18,14,26,0.85)';
            rr(ctx, lx - 4, ey, lw + 8, eh - 6, 6); ctx.fill();
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
            wrapText(ctx, def.desc, lx + 4, ey + 16, lw - 8, 14, 2);
            ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
            ctx.fillText('REWARD', lx + 4, ey + 52);
            ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = g.color;
            // Compact + wrapped (2 lines) so the reward can never run off the card.
            wrapText(ctx, questRewardTextFor(entry, true), lx + 4, ey + 66, lw - 8, 13, 2);
            ctx.font = 'italic 9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
            wrapText(ctx, (entry.src === 'A' ? "Addy's quest " : "Lukus's quest ") + (entry.idx + 1) + ' of ' + g.total +
              (milestone ? ' · ★ milestone — tracks itself, cannot be dropped' : ''), lx + 4, ey + 94, lw - 8, 11, 1);
          }
          c += eh;
        }
      }
      c += 12;
    }
    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, listTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', px + pw / 2, viewBot - 2);
  },

  // 🏆 ACHIEVEMENTS — earned live from the hero's lifetime counters.
  // The 5,700-strong LEDGER OF DEEDS never changes at runtime — group it into
  // its category → subcategory tree exactly once.
  _achIndex: null,
  achIndex() {
    if (this._achIndex) return this._achIndex;
    const cats = [], catMap = {}, subMap = {};
    for (const a of ACHIEVEMENTS) {
      let c = catMap[a.cat];
      if (!c) { c = catMap[a.cat] = { cat: a.cat, subs: [], n: 0 }; cats.push(c); }
      const k = a.cat + '|' + a.sub;
      let s = subMap[k];
      if (!s) { s = subMap[k] = { sub: a.sub, key: k, list: [] }; c.subs.push(s); }
      s.list.push(a); c.n++;
    }
    return this._achIndex = cats;
  },
  // Earned tallies + POINTS, cached half a second at a time.
  achCounts() {
    const c = UI.sel.achCache;
    if (c && Game.time - c.t < 0.5) return c;
    const bySub = {}; let earned = 0, pts = 0;
    for (const a of ACHIEVEMENTS) {
      const k = a.cat + '|' + a.sub;
      const b = bySub[k] || (bySub[k] = { e: 0, n: 0 });
      b.n++;
      if (a.cur() >= a.need) { b.e++; earned++; pts += a.pts || 0; }
    }
    return UI.sel.achCache = { t: Game.time, earned, pts, bySub };
  },
  // Is a subcategory visible for this character? (Artifacts/Relics/Ancients/
  // Mythics hide until the first one is claimed — owner rule v1.7.16.)
  achSubVisible(key) {
    const g = (typeof ACH_SUB_GATES !== 'undefined') && ACH_SUB_GATES[key];
    return !g || g();
  },

  // ACHIEVEMENTS (owner spec v1.7.16): a category sidebar on the left, the
  // selected sub's hand-authored ladder on the right with POINTS, a real
  // scrollbar, and a three-way earned filter. Title shows the character's
  // total Achievement Points — no icon, no earned tally.
  achievements(ctx, W, H) {
    this.dim(ctx, W, H);
    const idx = this.achIndex(), cc = this.achCounts();
    if (!UI.sel.achSub || !this.achSubVisible(UI.sel.achSub)) {
      UI.sel.achCat = idx[0].cat;
      UI.sel.achSub = idx[0].subs[0].key;
    }
    const pw = Math.min(720, W - 20), px = W / 2 - pw / 2;
    const ph = Math.min(640, H - 20), py = Math.max(10, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'ACHIEVEMENTS — ' + cc.pts.toLocaleString() + ' POINTS');

    const listTop = py + 56, viewBot = py + ph - 14, viewH = Math.max(50, viewBot - listTop);
    ctx.textBaseline = 'alphabetic';

    // ---- LEFT: the category sidebar (accordion; slimmer on phones) ----
    const sw = Math.max(W < 480 ? 112 : 136, Math.min(210, Math.round(pw * 0.31)));
    const showCnt = sw >= 130;   // per-sub earned counts need the room
    // Indented off the panel's left edge (owner rule — it clung to the wall).
    const sx = px + 24;
    const sScroll = clamp(UI.sel.scrollY2 || 0, 0, UI.sel.scrollMax2 || 0);
    UI.sel.scrollY2 = sScroll;
    UI.sel.scrollRegion2 = { x: sx - 6, y: listTop - 4, w: sw + 10, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(sx - 6, listTop - 4, sw + 10, viewH + 8); ctx.clip();
    let c = listTop;
    for (const cat of idx) {
      const open = UI.sel.achCat === cat.cat;
      const yy = c - sScroll;
      if (yy + 30 > listTop && yy < viewBot) {
        ctx.fillStyle = open ? 'rgba(44,38,28,0.7)' : 'rgba(28,24,38,0.55)';
        rr(ctx, sx - 4, yy, sw + 6, 28, 6); ctx.fill();
        ctx.textAlign = 'left'; ctx.font = 'bold ' + (sw < 130 ? 10.5 : 12) + 'px Cinzel, Georgia';
        ctx.fillStyle = open ? '#d8c5a0' : '#9a9080';
        ctx.fillText(this.fitText(ctx, cat.cat.toUpperCase(), sw - 22), sx + 4, yy + 19);
        ctx.textAlign = 'right'; ctx.font = '10px Cinzel, Georgia';
        ctx.fillStyle = '#6f6552';
        ctx.fillText(open ? '▾' : '▸', sx + sw - 4, yy + 19);
        const cName = cat.cat;
        UI.register(sx - 6, yy, sw + 10, 30, () => {
          UI.sel.achCat = (UI.sel.achCat === cName) ? null : cName;
        });
      }
      c += 32;
      if (open) {
        for (const sb2 of cat.subs) {
          if (!this.achSubVisible(sb2.key)) continue;
          const on = UI.sel.achSub === sb2.key;
          const sy = c - sScroll;
          if (sy + 26 > listTop && sy < viewBot) {
            if (on) {
              ctx.fillStyle = 'rgba(207,200,184,0.13)';
              rr(ctx, sx + 4, sy, sw - 2, 24, 5); ctx.fill();
              ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 1;
              rr(ctx, sx + 4, sy, sw - 2, 24, 5); ctx.stroke();
            }
            const b = cc.bySub[sb2.key] || { e: 0, n: sb2.list.length };
            ctx.textAlign = 'left'; ctx.font = (on ? 'bold ' : '') + '10px Cinzel, Georgia';
            ctx.fillStyle = on ? '#e8e2d0' : (b.e >= b.n ? '#b8a76a' : '#8a8070');
            ctx.fillText(this.fitText(ctx, sb2.sub, sw - (showCnt ? 62 : 22)), sx + 12, sy + 16);
            if (showCnt) {
              ctx.textAlign = 'right'; ctx.font = '8px Cinzel, Georgia';
              ctx.fillStyle = b.e >= b.n ? '#ffd76a' : '#6f6552';
              ctx.fillText(b.e + '/' + b.n, sx + sw - 2, sy + 16);
            }
            const sk = sb2.key;
            UI.register(sx - 6, sy, sw + 10, 26, () => {
              if (UI.sel.achSub !== sk) { UI.sel.achSub = sk; UI.sel.scrollY = 0; }
            });
          }
          c += 26;
        }
        c += 6;
      }
    }
    ctx.restore();
    UI.sel.scrollMax2 = Math.max(0, (c - listTop) - viewH + 6);

    // Divider between the panes.
    const dx = sx + sw + 10;
    ctx.strokeStyle = 'rgba(140,120,90,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(dx, listTop - 4); ctx.lineTo(dx, viewBot + 4); ctx.stroke();

    // ---- RIGHT: the selected subcategory's ladder ----
    let sel = null;
    for (const cat of idx) for (const s2 of cat.subs) if (s2.key === UI.sel.achSub) sel = s2;
    if (!sel) sel = idx[0].subs[0];
    // A reserved right-hand gutter for the skull scrollbar so the rows and the
    // points text never clip under it (owner rule v1.7.29).
    const ACH_GUT = 32;
    const lx = dx + 12, lw = (px + pw - 14) - lx - ACH_GUT;
    // Three-way filter chip: show all · hide earned · hide unearned.
    const FILTERS = [['all', 'SHOW ALL'], ['unearned', 'HIDE EARNED'], ['earned', 'HIDE UNEARNED']];
    const fi = Math.max(0, FILTERS.findIndex(f => f[0] === (UI.sel.achFilter || 'all')));
    UI.chip(ctx, lx + lw - 128, listTop - 2, 128, 22, FILTERS[fi][1], () => {
      UI.sel.achFilter = FILTERS[(fi + 1) % 3][0];
      UI.sel.scrollY = 0;
    }, { size: 9 });
    const rowsTop = listTop + 28;
    const rowsH = Math.max(40, viewBot - rowsTop);
    let rows = sel.list;
    if (UI.sel.achFilter === 'unearned') rows = rows.filter(a => a.cur() < a.need);
    else if (UI.sel.achFilter === 'earned') rows = rows.filter(a => a.cur() >= a.need);

    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    // Region extends into the reserved gutter so the scrollbar sits clear of the rows.
    UI.sel.scrollRegion = { x: lx - 4, y: rowsTop - 4, w: lw + 4 + ACH_GUT, h: rowsH + 8 };
    // Row geometry scales with the global font size (owner rule — the setting
    // must actually enlarge the achievement rows, not just clip the text).
    const fm = Math.max(1, (((typeof Settings !== 'undefined' && Settings.g && Settings.g.fontSize) || 13) / 13));
    const rowH = Math.round(40 * fm), rowStep = rowH + 6;
    const res = Math.round((lw < 250 ? 54 : 82) * fm), bw = Math.round((lw < 250 ? 48 : 64) * fm);
    const gs = n => n >= 1e12 ? (Math.round(n / 1e11) / 10) + 't'
      : n >= 1e9 ? (Math.round(n / 1e8) / 10) + 'b'
      : n >= 1e6 ? (Math.round(n / 1e5) / 10) + 'm'
      : n >= 10000 ? Math.round(n / 1000) + 'k' : n.toLocaleString();
    ctx.save();
    ctx.beginPath(); ctx.rect(lx - 4, rowsTop - 4, lw + 8, rowsH + 8); ctx.clip();
    let r = rowsTop;
    // Play Time leads with the LIVE clock (owner rule: after the milestones,
    // just count).
    if (sel.sub === 'Play Time') {
      const t = Math.floor(Hero.playSeconds || 0);
      const d2 = Math.floor(t / 86400), h2 = Math.floor((t % 86400) / 3600),
        m2 = Math.floor((t % 3600) / 60), s2 = t % 60;
      const yy = r - scrollY;
      if (yy + 30 > rowsTop && yy < viewBot) {
        ctx.textAlign = 'center'; ctx.font = 'bold 14px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
        ctx.fillText('Time in the dark — ' + (d2 ? d2 + 'd ' : '') + h2 + 'h ' + m2 + 'm ' + s2 + 's',
          lx + lw / 2, yy + 16);
      }
      r += 34;
    }
    for (const a of rows) {
      const yy = r - scrollY;
      if (yy + rowH + 4 > rowsTop && yy < viewBot) {
        const cur = a.cur();
        const done = cur >= a.need;
        ctx.fillStyle = done ? 'rgba(42,38,24,0.75)' : 'rgba(28,24,38,0.6)';
        rr(ctx, lx - 4, yy, lw + 8, rowH, 6); ctx.fill();
        if (done) { ctx.strokeStyle = 'rgba(255,215,106,0.5)'; ctx.lineWidth = 1; rr(ctx, lx - 4, yy, lw + 8, rowH, 6); ctx.stroke(); }
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = done ? '#ffd76a' : '#8a8070';
        ctx.fillText(this.fitText(ctx, a.name, lw - res), lx + 4, yy + rowH * 0.38);
        ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = done ? '#b5ab94' : '#6f6552';
        ctx.fillText(this.fitText(ctx, a.desc, lw - res), lx + 4, yy + rowH * 0.75);
        if (done) {
          ctx.textAlign = 'right'; ctx.font = 'bold 15px Cinzel, Georgia'; ctx.fillStyle = '#4ade80';
          ctx.fillText('✓', lx + lw - 4, yy + rowH * 0.42);
          ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
          ctx.fillText('+' + (a.pts || 0) + ' pts', lx + lw - 4, yy + rowH * 0.78);
        } else {
          UI.bar(ctx, lx + lw - bw - 4, yy + rowH * 0.2, bw, 7, Math.min(1, cur / a.need), '#221d2e', '#8a6f2a');
          ctx.textAlign = 'right'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          ctx.fillText(gs(cur) + ' / ' + gs(a.need), lx + lw - 4, yy + rowH * 0.6);
          ctx.fillStyle = '#8a7f5a';
          ctx.fillText((a.pts || 0) + ' pts', lx + lw - 4, yy + rowH * 0.85);
        }
      }
      r += rowStep;
    }
    if (!rows.length) {
      ctx.textAlign = 'center'; ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText(UI.sel.achFilter === 'earned' ? 'Nothing earned here yet.' : 'Everything here is done.',
        lx + lw / 2, rowsTop + 30 - scrollY);
      r += 40;
    }
    ctx.restore();
    const contentH = r - rowsTop;
    UI.sel.scrollMax = Math.max(0, contentH - rowsH + 6);
    // (The draggable scrollbar is drawn universally now — see UI.drawScrollbar
    // called at the end of Screens.draw, v1.7.25.)
  },

  // The one true way to dismiss a menu: the red ✕ (Escape works too).
  // v1.7.15 (owner rule): the BARE painted X (close_x.webp — lifted off its
  // plate offline) so it sits seamlessly on any panel; no plate frame.
  closeX(ctx, W, opts = {}) {
    const x = opts.x !== undefined ? opts.x : W - 26;
    const y = opts.y !== undefined ? opts.y : 26;
    const cb = opts.cb || (() => UI.close());
    const img = (typeof Game !== 'undefined' && Game.uiImg) ? Game.uiImg('close_x') : null;
    if (img && img.complete && img.naturalWidth) {
      const dh = 26, dw = dh * (img.width / img.height);
      ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
    } else {
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
    }
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

  // (The old TOWN PORTAL menu is gone — a wilds portal walks you straight into
  //  New Haven, and menus with LEAVE-style buttons were deleted, owner rule.)

  // ------------------------------------------------------ horadric's cube
  // A legendary crafting tool found in Act III. For now it holds only the
  // Golden Mirror transmute; its recipe book is a closed "coming soon" tome.

  cube(ctx, W, H) {
    this.dim(ctx, W, H);
    // Wider + roomier (v1.6.98 owner rule — nothing gets cut off).
    const pw = Math.min(520, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, 490);
    const py = Math.max(12, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SOUL CRUCIBLE');

    // The floating cube glyph.
    const cx = W / 2, cyc = py + 108, t = Game.time;
    ctx.save();
    ctx.translate(cx, cyc + Math.sin(t * 1.5) * 4);
    ctx.rotate(Math.sin(t * 1.2) * 0.18);
    ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 22;
    const R = 34;
    ctx.fillStyle = '#3a2622';
    ctx.beginPath();
    ctx.moveTo(-R, -R * 0.28); ctx.lineTo(0, -R); ctx.lineTo(R, -R * 0.28);
    ctx.lineTo(R, R * 0.72); ctx.lineTo(0, R * 1.2); ctx.lineTo(-R, R * 0.72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a30';
    ctx.beginPath(); ctx.moveTo(-R, -R * 0.28); ctx.lineTo(0, -R); ctx.lineTo(0, R * 0.16); ctx.lineTo(-R, R * 0.72); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4a3a';
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(R, -R * 0.28); ctx.lineTo(R, R * 0.72); ctx.lineTo(0, R * 0.16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-14, 20); ctx.moveTo(14, 4); ctx.lineTo(14, 20); ctx.stroke();
    ctx.fillStyle = '#ffcf6a';
    ctx.beginPath(); ctx.arc(0, 8, 4, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText('An ancient artifact of transmutation.', W / 2, py + 168);

    // Extracted-power summary (the Golden Mirror now lives at the END of the
    // Instruction Leaflet, not here).
    let y = py + 196;
    const rowW = pw - 40, rx = px + 20;
    const active = (Hero.cubeActive || []).length, banked = (Hero.cubePowers || []).length;
    UI.panel(ctx, rx, y, rowW, 62);
    // Centered, bone-white (owner rule v1.7.2 — color only for reagents).
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    ctx.fillText('Legendary powers extracted: ' + banked, rx + rowW / 2, y + 22);
    ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    ctx.fillText(active + ' / 4 powers active — swap them in the leaflet.', rx + rowW / 2, y + 42);
    y += 80;

    UI.btnPlate3(ctx, rx, y, rowW, 44, 'INSTRUCTION LEAFLET', () => { UI.open('recipes'); UI.sel.scrollY = 0; },
      { size: 15 });
  },

  // THE FORGOTTEN CRYPT unlock popup (owner rule v1.7.6): six worn
  // Artifacts resonate — a new dark opens beneath Ascendant XVI.
  cryptUnlock(ctx, W, H) {
    this.dim(ctx, W, H);
    const t = Game.time || 0;
    const pw = Math.min(440, W - 24);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, 320);
    const py = Math.max(10, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    ctx.font = '600 22px Cinzel, Georgia';
    ctx.shadowColor = 'rgba(232,226,208,' + (0.5 * pulse).toFixed(2) + ')';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e8e2d0';
    ctx.fillText(this.fitText(ctx, 'THE FORGOTTEN CRYPT', pw - 40), W / 2, py + 62);
    ctx.shadowBlur = 0;
    ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    this.wrapCentered(ctx, 'The six Artifacts you wear resonate as one. A deeper dark has opened beneath Ascendant XVI.',
      W / 2, py + 104, pw - 60, 17, 3);
    ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    this.wrapCentered(ctx, 'Choose a Crypt Tier — I to CCL — at the Waygate or the Shroud. Each tier hardens the dead by half again… and sweetens what they carry.',
      W / 2, py + 168, pw - 60, 15, 4);
    UI.btnPlate3(ctx, px + pw / 2 - 110, py + ph - 60, 220, 40, 'SO BE IT', () => UI.close(), { size: 14 });
  },

  // THE WISHING FOUNTAIN (v1.6.98 owner request): stand at New Haven's
  // fountain and toss 200 gold into the dark water for a RANDOM shrine
  // blessing that lasts 10 real minutes — it follows you into the wilds
  // (Game.fountainBuff, copied onto each fresh Player in startLand).
  FOUNTAIN_COST: 200,
  fountain(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(420, W - 24);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, 430);
    const py = Math.max(10, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'THE FOUNTAIN');

    // The skeleton-hand medallion (owner art), gently bobbing.
    const art = Game.uiImg && Game.uiImg('fountain');
    const my = py + 122;
    if (art && art.complete && art.naturalWidth) {
      const d = 128 + Math.sin(Game.time * 1.4) * 3;
      ctx.drawImage(art, W / 2 - d / 2, my - d / 2, d, d);
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    // Two lines — never clipped (owner rule).
    this.wrapCentered(ctx, 'Coins glint far below the dark water. The dead are listening.', W / 2, py + 202, pw - 44, 16, 2);

    let y = py + 240;
    const fb = Game.fountainBuff;
    const names = FOUNTAIN_BUFFS;
    if (fb && fb.t > 0) {
      const mins = Math.floor(fb.t / 60), secs = Math.floor(fb.t % 60);
      // Faded blood red, two lines — never clipped (owner rule v1.7.2).
      ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#c98a8a';
      this.wrapCentered(ctx, '✦ ' + names[fb.buff], W / 2, y - 6, pw - 48, 14, 2);
      ctx.fillText(mins + ':' + String(secs).padStart(2, '0') + ' left', W / 2, y + 22);
      y += 14;
    } else {
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('No blessing upon you.', W / 2, y);
    }
    y += 26;

    const afford = Hero.gold >= this.FOUNTAIN_COST;
    // The toss rides a SMALL centered plate hugging its words (owner rule
    // v1.7.16 — never the menu's full width).
    const tossW = 172;
    UI.chip(ctx, W / 2 - tossW / 2, y, tossW, 38,
      afford ? 'TOSS 200 GOLD' : 'NEED 200 GOLD',
      afford ? () => {
        Hero.gold -= this.FOUNTAIN_COST;
        Hero.fountainTosses = (Hero.fountainTosses || 0) + 1;
        const buff = pick(['empowered', 'frenzied', 'blessed', 'fortune', 'fleetfoot']);
        // The fountain blessing lives ONLY on Game.fountainBuff now — it applies
        // via Player.hasShrine and STACKS with any wild shrine (owner rule
        // v1.7.33), so it must NOT overwrite Player.shrine.
        Game.fountainBuff = { buff, t: 600 };
        if (Game.player && buff === 'empowered') Game.player.essence = Game.player.maxEssence;
        Hero.save();
        AudioSys.sfx('shrine');
        UI.toast('The water stirs… ' + names[buff] + ' (10 min)', '#cfc8b8');
        Particles.ring(W / 2, my, 80, '#8fd0ff', 5, 0.6);
      } : null,
      { size: 13, disabled: !afford, color: '#ffd76a' });
    y += 46;
    // Gold sits right under the TOSS button (owner rule — not in the corner).
    ctx.textAlign = 'center'; ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold.toLocaleString() + ' g', W / 2, y);
    y += 18;
    ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    this.wrapCentered(ctx, 'A random shrine blessing · lasts 10 minutes · follows you into the wilds', W / 2, y, pw - 48, 13, 2);
  },

  // The Instruction Leaflet: Instruction of Bellmahath (extract legendary powers into
  // the Cube, pick up to 3 active) — with the Golden Mirror transmute at the end.
  recipes(ctx, W, H) {
    this.dim(ctx, W, H);
    // Tablet/desktop: scale the leaflet's text + row spacing up via k.
    const big = W >= 760, k = big ? 1.32 : 1;
    // Wider (v1.6.98 owner rule — Forgotten Souls was getting cut off).
    const pw = Math.min(big ? 640 : 520, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, big ? 580 : 500);
    const py = Math.max(12, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'INSTRUCTION LEAFLET');
    const rx = px + 16, rw = pw - 32;
    const bodyTop = py + 44, bodyBot = py + ph - 12;
    const viewH = bodyBot - bodyTop;
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px + 2, y: bodyTop, w: pw - 4, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 2, bodyTop, pw - 4, viewH); ctx.clip();
    let y = bodyTop + 22 - scrollY;   // breathing room below the title bar (owner rule v1.7.15)
    const vis = (yy, hh) => yy + hh > bodyTop && yy < bodyBot;

    // ---- Your extraction reagents — painted icons + counts, CENTERED ----
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 ' + (11 * k) + 'px Cinzel, Georgia';
    if (vis(y, 18 * k)) {
      let tot = 0;
      for (const mk of ['parts', 'dust', 'crystal', 'soul'])
        tot += 22 * k + ctx.measureText(String(Hero.mats[mk] || 0)).width + 16;
      let mxx = rx + Math.max(0, (rw - tot) / 2);
      for (const mk of ['parts', 'dust', 'crystal', 'soul']) {
        drawMatIcon(ctx, mk, mxx + 10 * k, y + 4 * k, 20 * k);
        const txt = String(Hero.mats[mk] || 0);
        ctx.fillStyle = MATERIALS[mk].color;
        ctx.fillText(txt, mxx + 22 * k, y + 8 * k);
        mxx += 22 * k + ctx.measureText(txt).width + 16;
      }
    }
    y += 24 * k;

    // ---- Instruction of Bellmahath (extraction) — centered, bone white ----
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + (14 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    if (vis(y, 20 * k)) ctx.fillText('Instruction of Bellmahath', rx + rw / 2, y + 6 * k);
    y += 20 * k;
    ctx.font = (10 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    if (vis(y, 16 * k)) ctx.fillText("Extract a loose bag legendary's power. The item is consumed.", rx + rw / 2, y + 8 * k);
    y += 18 * k;
    ctx.textAlign = 'left';
    const c = Items.extractCost();
    ctx.font = '600 ' + (10 * k) + 'px Cinzel, Georgia';
    {
      // Cost: painted icon + number per reagent — CENTERED.
      let tot2 = 0;
      for (const [mk, n] of Object.entries(c)) tot2 += 20 * k + ctx.measureText(String(n)).width + 14;
      let cxx = rx + Math.max(0, (rw - tot2) / 2);
      for (const [mk, n] of Object.entries(c)) {
        const have = (Hero.mats[mk] || 0) >= n;
        if (vis(y, 18 * k)) {
          drawMatIcon(ctx, mk, cxx + 9 * k, y + 4 * k, 18 * k);
          ctx.fillStyle = have ? MATERIALS[mk].color : '#a05a5a';
          ctx.fillText(String(n), cxx + 20 * k, y + 8 * k);
        }
        cxx += 20 * k + ctx.measureText(String(n)).width + 14;
      }
    }
    y += 22 * k;
    const items = Items.extractable();
    if (!items.length) {
      ctx.textAlign = 'center';
      ctx.font = 'italic ' + (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (vis(y, 16 * k)) ctx.fillText('No loose legendary with an unclaimed power in your bag.', rx + rw / 2, y + 10 * k);
      ctx.textAlign = 'left';
      y += 22 * k;
    } else {
      const rh = 38 * k;
      for (const it of items) {
        if (vis(y, rh)) {
          ctx.fillStyle = 'rgba(28,24,38,0.9)'; rr(ctx, rx, y, rw, rh, 6); ctx.fill();
          ctx.strokeStyle = '#8a3f3a'; ctx.lineWidth = 1; rr(ctx, rx, y, rw, rh, 6); ctx.stroke();
          ctx.textAlign = 'left'; ctx.font = 'bold ' + (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
          ctx.fillText(this.fitText(ctx, it.name, rw - 96 * k), rx + 10, y + 15 * k);
          ctx.font = (9 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#b06adf';
          ctx.fillText(this.fitText(ctx, LEGENDARY_POWERS[it.power].name, rw - 96 * k), rx + 10, y + 29 * k);
          const can = Object.entries(c).every(([mk, n]) => (Hero.mats[mk] || 0) >= n);
          UI.btn(ctx, rx + rw - 84 * k, y + 5 * k, 78 * k, 28 * k, can ? 'EXTRACT' : 'NEED MATS',
            can ? () => Items.extractPower(it) : null, { size: 10 * k, disabled: !can, border: '#c22843', color: '#ff5a4a' });
        }
        y += rh + 4 * k;
      }
    }
    y += 10 * k;

    // ---- Powers in the Cube — toggle up to 4 active ----
    ctx.textAlign = 'center'; ctx.font = 'bold ' + (13 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    if (vis(y, 18 * k)) ctx.fillText('Powers in the Cube (' + (Hero.cubeActive || []).length + '/4 active)', rx + rw / 2, y + 6 * k);
    ctx.textAlign = 'left';
    y += 20 * k;
    const bank = Hero.cubePowers || [];
    if (!bank.length) {
      ctx.textAlign = 'center';
      ctx.font = 'italic ' + (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (vis(y, 16 * k)) ctx.fillText('Extract a power above to bank it here.', rx + rw / 2, y + 10 * k);
      ctx.textAlign = 'left';
      y += 22 * k;
    } else {
      const rh = 44 * k;
      for (const bk of bank) {
        const P = LEGENDARY_POWERS[bk]; if (!P) continue;
        const on = (Hero.cubeActive || []).includes(bk);
        if (vis(y, rh)) {
          ctx.fillStyle = on ? 'rgba(70,44,26,0.95)' : 'rgba(24,20,30,0.9)'; rr(ctx, rx, y, rw, rh, 6); ctx.fill();
          ctx.strokeStyle = on ? '#ff8c2a' : '#3a3448'; ctx.lineWidth = on ? 1.6 : 1; rr(ctx, rx, y, rw, rh, 6); ctx.stroke();
          ctx.textAlign = 'left'; ctx.font = 'bold ' + (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = on ? '#ffb86a' : '#c9bfa8';
          ctx.fillText((on ? '◈ ' : '') + P.name, rx + 10, y + 14 * k);
          ctx.font = (9 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          wrapText(ctx, P.desc, rx + 10, y + 26 * k, rw - 96 * k, 11 * k, 2);
          UI.btn(ctx, rx + rw - 84 * k, y + 8 * k, 78 * k, 28 * k, on ? 'ACTIVE' : 'ACTIVATE',
            () => Items.toggleCubePower(bk), { size: 10 * k, bg: on ? 'rgba(90,54,26,0.9)' : undefined, border: '#8a6f4a', color: on ? '#ffb86a' : '#c9bfa8' });
        }
        y += rh + 4 * k;
      }
    }
    y += 12 * k;

    // ---- Golden Mirror (moved to the END of the leaflet) ----
    ctx.textAlign = 'center'; ctx.font = 'bold ' + (13 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    if (vis(y, 18 * k)) ctx.fillText('Golden Mirror', rx + rw / 2, y + 6 * k);
    ctx.textAlign = 'left';
    y += 18 * k;
    // All Golden Mirror flavor is CENTERED (owner rule v1.7.15), and the
    // transmute plate hugs its own label — never the full menu width.
    if (Hero.orbAutoPickup) {
      ctx.font = (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      if (vis(y, 16 * k)) { this.wrapCentered(ctx, '✦ Transmuted — purple orbs (Rifts & Seasons) now collect instantly.', rx + rw / 2, y + 10 * k, rw, 13 * k, 2); y += 30 * k; }
      else y += 30 * k;
    } else if (Hero.goldenMirror) {
      ctx.textAlign = 'center';
      ctx.font = (10 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      if (vis(y, 14 * k)) ctx.fillText('Transmute to auto-collect every purple orb.', rx + rw / 2, y + 10 * k);
      ctx.textAlign = 'left';
      y += 18 * k;
      ctx.font = '600 ' + (12 * k) + 'px Cinzel, Georgia';
      const tbw = Math.min(rw, ctx.measureText('TRANSMUTE GOLDEN MIRROR').width + 56 * k);
      if (vis(y, 28 * k)) UI.btnPlate2(ctx, rx + (rw - tbw) / 2, y, tbw, 26 * k, 'TRANSMUTE GOLDEN MIRROR', () => {
        Hero.goldenMirror = false; Hero.orbAutoPickup = true; Hero.save();
        UI.toast('The Golden Mirror dissolves — purple orbs now come to you', '#ffd76a');
        AudioSys.sfx('level');
      }, { size: 12 * k, color: '#ffd76a' });
      y += 32 * k;
    } else {
      ctx.textAlign = 'center';
      ctx.font = 'italic ' + (10 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#57503f';
      if (vis(y, 14 * k)) ctx.fillText('Not found — the Treasure Goblin sometimes carries it (10%).', rx + rw / 2, y + 10 * k);
      ctx.textAlign = 'left';
      y += 18 * k;
    }

    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (y + scrollY) - bodyTop - viewH + 12);
    if ((UI.sel.scrollMax || 0) > 0) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (scrollY > 1) ctx.fillText('▲ drag ▲', W / 2, bodyTop + 2);
      if (scrollY < UI.sel.scrollMax - 1) ctx.fillText('▼ drag for more ▼', W / 2, bodyBot - 2);
    }
  },

  // -------------------------------------------------------------- title

  title(ctx, W, H) {
    const cx = W / 2;
    // TITLE INTRO SEQUENCE (owner spec v1.7.22): the splash art shows at once,
    // the logo slow-fades in at 3s, and the PLAY plate slow-fades in at 5s.
    // The clock starts the first time the title is shown this session.
    if (this._titleStart === undefined) this._titleStart = Game.time;
    const el = Game.time - this._titleStart;
    const fade = (start, dur) => Math.max(0, Math.min(1, (el - start) / dur));
    const logoA = fade(3, 1.6);   // logo fades in over 1.6s starting at 3s
    const plateA = fade(5, 1.6);  // PLAY plate fades in over 1.6s starting at 5s

    // ---- the splash art, cover-fit, immediately ----
    const splash = Game.uiImg('title_splash');
    ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, W, H);
    if (splash && splash.complete && splash.naturalWidth) {
      const cf = Math.max(W / splash.width, H / splash.height);
      ctx.drawImage(splash, (W - splash.width * cf) / 2, (H - splash.height * cf) / 2, splash.width * cf, splash.height * cf);
      // a soft vignette so the logo + plate read over the busy art
      const vg = ctx.createRadialGradient(cx, H * 0.42, H * 0.2, cx, H * 0.5, H * 0.85);
      vg.addColorStop(0, 'rgba(5,3,7,0)'); vg.addColorStop(1, 'rgba(5,3,7,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    // ---- the NEKROMANCER logo, slow fade at 3s ----
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const logo = Game.uiImg('title_logo');
    const lar = (logo && logo.naturalWidth) ? logo.width / logo.height : 1.0;
    const lh = Math.min(H * 0.46, W * 0.62 / lar);
    const lw = lh * lar;
    const lyC = H * 0.05 + lh / 2;
    if (logoA > 0) {
      ctx.save();
      ctx.globalAlpha = logoA;
      if (logo && logo.complete && logo.naturalWidth) {
        ctx.shadowColor = 'rgba(120,220,215,0.5)'; ctx.shadowBlur = Math.min(38, W * 0.05);
        ctx.drawImage(logo, cx - lw / 2, lyC - lh / 2, lw, lh);
      } else {
        ctx.font = '600 ' + Math.round(W < 640 ? 34 : 52) + 'px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
        ctx.fillText('NEKROMANCER', cx, lyC);
      }
      ctx.restore();
    }

    // ---- the PLAY plate, slow fade at 5s ----
    const bw = Math.min(300, W * 0.78);
    const by = H * 0.72;
    if (plateA > 0) {
      ctx.save();
      ctx.globalAlpha = plateA;
      // Only register the tap once the plate is essentially in — no invisible
      // hitbox. PLAY → Choose Your Hero (owner spec).
      UI.btnPlate(ctx, cx - bw / 2, by, bw, 46, 'PLAY',
        plateA > 0.9 ? () => UI.open('select') : null, { size: 18 });
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // (v1.7.23 owner rule: the control-hint line and the credit line are
    // GONE — the splash speaks for itself.) The version rides a SMALL SIMPLE
    // PLATE in the LOWER-RIGHT (v1.7.24 owner rule — quiet, for the dev),
    // Cinzel bone white, opening the patch notes.
    const vpw = Math.min(118, W * 0.3), vpx = W - vpw - 10, vpy = H - 32;
    UI.btnPlate2(ctx, vpx, vpy, vpw, 22, GAME_VERSION, () => UI.open('patchnotes'),
      { size: 9, color: '#cfc8b8' });
    // Dev-panel access lives on quietly: a small unmarked tap in the very
    // bottom-left corner (owner keeps it without any visible credit text).
    UI.register(0, H - 30, 70, 30, () => UI.open('devconfirm'));
    ctx.textAlign = 'center';
  },

  // --------------------------------------------------------------- camp

  camp(ctx, W, H) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 26px Cinzel, Georgia';
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
    ctx.font = 'bold 15px Cinzel, Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(this.fitText(ctx, Hero.name + '  ·  Level ' + Hero.level, pw - 120), px + 14, 76);
    ctx.font = '12px Cinzel, Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(`${Hero.gold} gold  ·  ${Hero.totalKills} slain  ·  ${Hero.gems.length} gems`, px + 14, 96);
    if (narrow) {
      UI.bar(ctx, px + 14, 106, pw - 110, 8, Hero.xp / XP_CURVE(Hero.level), '#8a6f2a', '#ffd76a');
      ctx.font = '11px Cinzel, Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('XP', px + pw - 88, 110);
    } else {
      UI.bar(ctx, px + pw * 0.55, 70, pw * 0.42, 8, Hero.xp / XP_CURVE(Hero.level), '#8a6f2a', '#ffd76a');
      ctx.font = '11px Cinzel, Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText(`XP ${Hero.xp} / ${XP_CURVE(Hero.level)}`, px + pw * 0.55, 92);
    }
    ctx.textAlign = 'right';
    ctx.font = 'italic 11px Cinzel, Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('tap for full stats ▸', px + pw - 12, 56 + panelH - 12);

    // Hub buttons.
    const items = [
      ['🏰 VISIT NEW HAVEN', () => Game.enterTown(), '#ffd76a'],
      ['⛰ THE WILDS', () => UI.open('wilds'), '#6ff7c3'],
      ['INVENTORY', () => UI.open('radial'), '#e8e0cc'],
      ['SKILLS & PASSIVES', () => UI.open('skills'), '#e8e0cc'],
      ['STASH', () => UI.open('stash'), '#8fb0e8'],
      ['SMITHY', () => UI.open('smith'), '#ffb43a'],
      ['JEWELER', () => UI.open('jeweler'), '#b06adf'],
      ['ENCHANTRESS', () => UI.open('mystic'), '#4ecbe0'],
      ['SETTINGS', () => UI.open('settings'), '#9a9080']
    ];
    // The Horadric's Cube joins the hub (before the Blacksmith) once found.
    if (Hero.hasCube) items.splice(4, 0, ['SOUL CRUCIBLE', () => UI.open('cube'), '#ff5a4a']);
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
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Cinzel, Georgia';
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
    // New Haven's two waypoints open FILTERED views (owner rule):
    //   blue → bounties · acts (story) · adventure    purple → rifts · greater
    //   rifts · seasons. No filter (camp access) shows everything.
    const wp = UI.sel.wpFilter || null;
    const pw = Math.min(540, W - 20);
    const px = W / 2 - pw / 2;

    // Modes UNLOCK by level (locked ones are hidden entirely, not greyed):
    // Campaign & The Ossuary from level 1; Harvests 20; Expeditions 60;
    // The Abyss 70; Blood Moon once you hold an Ashen Key. Rows and the keys
    // footer are computed FIRST so the panel is sized to its content (owner
    // rule: no giant empty box under two rows).
    const lvl = Hero.level;
    const rows = [];
    const show = tag => !wp || wp === tag;    // waypoint filter (null = show all)
    if (show('blue')) rows.push(['CAMPAIGN', 'Continue your campaign, or replay a cleared Act', '#ff8c2a',
      () => UI.open('storyacts')]);
    if (show('purple')) rows.push(['THE OSSUARY', 'Survive the onslaught and kill the Guardian', '#b06adf',
      () => { UI.close(); Game.startRift('normal'); }]);
    if (show('blue') && lvl >= 20) rows.push(['HARVESTS', 'Hunt each land\'s unique boss thrice for a reward', '#6ff7c3',
      () => { UI.close(); Game.state = 'map'; }]);
    if (show('blue') && lvl >= 60) rows.push(['EXPEDITIONS', 'A randomized land at your level, new every visit', '#ffd76a',
      () => { UI.close(); Game.startAdventure(); }]);
    if (show('purple') && lvl >= MAX_LEVEL) rows.push(['THE ABYSS', Hero.riftKeys > 0
      ? 'Uses a Crypt Key'
      : 'Requires a Crypt Key — Ossuary Guardians drop them', '#4ade80',
      Hero.riftKeys > 0 ? () => { UI.close(); Game.startRift('greater'); } : null]);
    if ((Hero.masterKeys || 0) > 0) Hero.seasonUnlocked = true;   // latch once earned
    if (show('purple') && Hero.seasonUnlocked) rows.push(['BLOOD MOON', SEASON.name, '#4ade80',
      () => UI.open('season')]);
    // Keys footer — each shown only once earned; nothing here otherwise.
    const foot = [];
    if ((Hero.riftKeys || 0) > 0) foot.push('◈ Crypt Keys: ' + Hero.riftKeys);
    if ((Hero.masterKeys || 0) > 0) foot.push('◈ Ashen Keys: ' + Hero.masterKeys);

    // Panel sized to its content.
    const rowH = 54;
    const cryptRow = (Hero.cryptUnlocked && Hero.difficulty >= DIFFICULTIES.length - 1) ? 84 : 0;
    const ph = Math.min(H - 16, 132 + cryptRow + Math.max(1, rows.length) * rowH + (foot.length ? 34 : 14));
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph,
      wp === 'blue' ? 'WAYGATE' : wp === 'purple' ? 'THE SHROUD' : 'THE WILDS');

    // Global difficulty stepper — set it once here for every mode below. Wide
    // enough that the arrows never crowd the difficulty name.
    const maxDiff = Hero.level >= MAX_LEVEL ? DIFFICULTIES.length - 1 : 3;
    Hero.difficulty = Math.min(Hero.difficulty, maxDiff);
    const atMin = Hero.difficulty <= 0;
    const atMax = Hero.difficulty >= maxDiff;
    const sdw = Math.min(440, pw - 24);
    const sdx = W / 2 - sdw / 2;
    // Painted arrow plates (owner art) step the difficulty; the procedural
    // buttons stand in until the art loads.
    const arrowBtn = (ax, key, glyph, cb, disabled) => {
      const img = Game.uiImg ? Game.uiImg(key) : null;
      if (img) {
        const abw = 54, abh = Math.round(54 * (img.height / img.width));
        const ay = py + 60 - abh / 2;
        ctx.globalAlpha = disabled ? 0.35 : 1;
        ctx.drawImage(img, ax, ay, abw, abh);
        ctx.globalAlpha = 1;
        if (!disabled && cb) UI.register(ax - 4, ay - 4, abw + 8, abh + 8, cb);
      } else {
        UI.btn(ctx, ax + 7, py + 44, 40, 32, glyph, disabled ? null : cb, { size: 14, disabled });
      }
    };
    arrowBtn(sdx, 'arrow_left', '◀',
      () => { Hero.difficulty = Math.max(0, Hero.difficulty - 1); Hero.save(); }, atMin);
    arrowBtn(sdx + sdw - 54, 'arrow_right', '▶',
      () => { Hero.difficulty = Math.min(maxDiff, Hero.difficulty + 1); Hero.save(); }, atMax);
    // The difficulty NAME sits on its OWN line below the arrows so long
    // names (Ascendant XIV) never overlap the plates (owner rule v1.7.2).
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText('Difficulty', W / 2, py + 54);
    ctx.font = 'bold 14px Cinzel, Georgia';
    ctx.fillStyle = Hero.difficulty >= 4 ? '#e04a5a' : '#ffd76a';
    ctx.fillText(this.fitText(ctx, DIFFICULTIES[Hero.difficulty].name, pw - 60), W / 2, py + 86);
    const D = DIFFICULTIES[Hero.difficulty];
    ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    ctx.fillText('Monsters ×' + D.mult + '      Rewards ×' + D.reward +
      (D.legBonus ? '      +' + (D.legBonus * 100).toFixed(1) + '% leg' : ''), W / 2, py + 106);

    // ---- FORGOTTEN CRYPT tier picker (owner spec v1.7.6): unlocked by six
    // worn Artifacts, live only at Ascendant XVI. Tier 0 = closed.
    // v1.7.8: tiers open in BANDS — finish Tier 1 for 2–7, finish Tier 7 for
    // five more, and so on to 250 (Items.cryptMaxTier reads Hero.cryptBest).
    let cryptH = 0;
    if (Hero.cryptUnlocked && Hero.difficulty >= DIFFICULTIES.length - 1) {
      cryptH = 84;
      const cy2 = py + 136;
      const maxT = Items.cryptMaxTier();
      Hero.cryptTier = clamp(Hero.cryptTier || 0, 0, maxT);
      const ctv = Hero.cryptTier;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
      ctx.fillText('FORGOTTEN CRYPT', W / 2, cy2);
      ctx.font = 'bold 14px Cinzel, Georgia';
      ctx.fillStyle = ctv > 0 ? '#e8e2d0' : '#6f6552';
      ctx.fillText(ctv > 0 ? 'Tier ' + ctv + '   ·   monsters ×' + (Math.pow(1.5, ctv) >= 1e6 ? Math.pow(1.5, ctv).toExponential(1) : Math.round(Math.pow(1.5, ctv) * 10) / 10) : 'CLOSED', W / 2, cy2 + 24);
      ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText(maxT >= 250 ? 'All 250 tiers stand open'
        : 'Open to Tier ' + maxT + ' — slay a boss at Tier ' + maxT + ' to descend further', W / 2, cy2 + 40);
      const step = (dx2, lbl, d2) => UI.chip(ctx, W / 2 + dx2 - 26, cy2 + 12, 52, 24, lbl,
        () => { Hero.cryptTier = clamp((Hero.cryptTier || 0) + d2, 0, Items.cryptMaxTier()); Hero.save(); }, { size: 11 });
      step(-pw / 2 + 58, '−10', -10); step(-pw / 2 + 116, '−1', -1);
      step(pw / 2 - 116, '+1', 1); step(pw / 2 - 58, '+10', 10);
    }

    if (!rows.length) {
      ctx.textAlign = 'center'; ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Nothing calls to you from this waypoint yet.', W / 2, py + 146 + cryptH);
      return;
    }

    let y = py + 124 + cryptH;
    // Mode plates are inset off the panel edges — they don't span the full
    // width (owner rule v1.7.27).
    const rInset = Math.round(pw * 0.12), rx = px + rInset, rw = pw - rInset * 2;
    for (const [label, desc, col, cb] of rows) {
      // SIMPLE plates for the mode rows (owner rule v1.7.2); the description
      // survives as the desktop hover tip.
      UI.btnPlate2(ctx, rx, y + 2, rw, rowH - 18, label, cb, { size: 14, disabled: !cb, tip: desc });
      y += rowH;
    }
    if (foot.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px Cinzel, Georgia';
      ctx.fillStyle = '#c8b8e8';
      ctx.fillText(foot.join('     '), W / 2, y + 12);
    }
  },

  // ------------------------------------------------------------ story menu
  // CONTINUE the campaign, or SELECT AN ACT to replay a cleared one (the
  // dropdown is barred until at least one Act is complete).
  storyMenu(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(440, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, 500);
    const py = Math.max(12, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'CAMPAIGN');

    const cleared = Hero.actsCleared || 0;
    const nextAct = Math.min(100, cleared + 1);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    ctx.fillText(cleared + ' of 100 Acts cleared', W / 2, py + 52);

    // CONTINUE — pick up at the next uncleared Act.
    UI.btnPlate(ctx, px + 20, py + 70, pw - 40, 44, 'CONTINUE  ·  ACT ' + nextAct,
      () => { UI.close(); Game.startStory(nextAct); }, { size: 16 });
    ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    ctx.fillText(cleared >= 100 ? 'You have conquered all 100 Acts — replay the finale.'
      : 'Continue your journey where you left off.', W / 2, py + 128);

    // SELECT AN ACT — dropdown of cleared Acts (barred until one is cleared).
    const dy = py + 150;
    if (cleared <= 0) {
      UI.btnPlate(ctx, px + 20, dy, pw - 40, 38, 'SELECT AN ACT', null, { size: 13, disabled: true });
      ctx.textAlign = 'center'; ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#5c5569';
      ctx.fillText('Clear an Act to unlock replay.', W / 2, dy + 58);
      return;
    }
    UI.btnPlate(ctx, px + 20, dy, pw - 40, 38, 'SELECT AN ACT  ' + (UI.sel.actDropOpen ? '▲' : '▾'),
      () => { UI.sel.actDropOpen = !UI.sel.actDropOpen; UI.sel.scrollY = 0; }, { size: 14 });

    if (!UI.sel.actDropOpen) {
      ctx.textAlign = 'center'; ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Tap to choose a cleared Act to replay.', W / 2, dy + 58);
      return;
    }

    // Scrollable grid of the cleared Act numbers.
    const listTop = dy + 48;
    const listBot = py + ph - 14;
    const viewH = Math.max(40, listBot - listTop);
    const cols = 5;
    const cw = (pw - 40) / cols, chh = 34;
    const rows = Math.ceil(cleared / cols);
    const contentH = rows * chh;
    const scrollMax = Math.max(0, contentH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = { x: px + 18, y: listTop, w: pw - 36, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 18, listTop, pw - 36, viewH); ctx.clip();
    for (let a = 1; a <= cleared; a++) {
      const i = a - 1;
      const gx = px + 20 + (i % cols) * cw;
      const gy = listTop + Math.floor(i / cols) * chh - scrollY;
      if (gy + chh < listTop || gy > listBot) continue;   // off-view: skip draw + hit
      UI.btn(ctx, gx + 2, gy + 2, cw - 4, chh - 4, '' + a,
        () => { UI.close(); Game.startStory(a); }, { size: 13, color: '#ffd76a', border: '#8a6f4a' });
    }
    ctx.restore();
    if (scrollY < scrollMax - 1) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('▼ drag for more ▼', W / 2, listBot - 2);
    }
  },

  // ---------------------------------------------------------------- map

  map(ctx, W, H) {
    // HARVESTS OF GHALLIA (owner rules v1.7.18): the owner's painted gothic
    // vista replaces the old moving world backdrop; the menu matches every
    // other panel — simple plates, painted arrows, ✕ riding the panel.
    ctx.fillStyle = '#020104'; ctx.fillRect(0, 0, W, H);
    const bg = Game.uiImg('harvests_bg');
    if (bg) {
      const cf = Math.max(W / bg.width, H / bg.height);
      ctx.drawImage(bg, (W - bg.width * cf) / 2, (H - bg.height * cf) / 2, bg.width * cf, bg.height * cf);
      ctx.fillStyle = 'rgba(2,1,4,0.42)'; ctx.fillRect(0, 0, W, H);
    }

    const pw = Math.min(620, W - 24);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 24, 196 + ZONES.length * 56 + 56);
    const py = Math.max(12, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'HARVESTS OF GHALLIA');

    // Difficulty stepper — painted arrow plates, greyed at Normal / T16.
    const maxDiff = Hero.level >= MAX_LEVEL ? DIFFICULTIES.length - 1 : 3;
    Hero.difficulty = Math.min(Hero.difficulty, maxDiff);
    const atMin = Hero.difficulty <= 0, atMax = Hero.difficulty >= maxDiff;
    const dw = Math.min(360, pw - 48);
    const dx = W / 2 - dw / 2;
    const arrowBtn = (ax, key, glyph, cb, disabled) => {
      const img = Game.uiImg ? Game.uiImg(key) : null;
      if (img) {
        const abw = 50, abh = Math.round(abw * (img.height / img.width));
        const ay = py + 72 - abh / 2;
        ctx.globalAlpha = disabled ? 0.35 : 1;
        ctx.drawImage(img, ax, ay, abw, abh);
        ctx.globalAlpha = 1;
        if (!disabled && cb) UI.register(ax - 4, ay - 4, abw + 8, abh + 8, cb);
      } else {
        UI.btn(ctx, ax, py + 56, 40, 32, glyph, disabled ? null : cb, { size: 14, disabled });
      }
    };
    arrowBtn(dx, 'arrow_left', '◀',
      () => { Hero.difficulty = Math.max(0, Hero.difficulty - 1); Hero.save(); }, atMin);
    arrowBtn(dx + dw - 50, 'arrow_right', '▶',
      () => { Hero.difficulty = Math.min(maxDiff, Hero.difficulty + 1); Hero.save(); }, atMax);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText('DIFFICULTY', W / 2, py + 54);
    ctx.fillStyle = Hero.difficulty >= 4 ? '#e04a5a' : '#ffd76a';
    ctx.font = 'bold 15px Cinzel, Georgia';
    ctx.fillText(DIFFICULTIES[Hero.difficulty].name, W / 2, py + 72);
    const D = DIFFICULTIES[Hero.difficulty];
    ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    ctx.fillText(`Monsters ×${D.mult}   ·   Rewards ×${D.reward}` +
      (D.legBonus ? `   ·   +${(D.legBonus * 100).toFixed(1)}% leg` : ''), W / 2, py + 92);

    // The five lands — SIMPLE plates, inset from the panel edges.
    const rx = px + 24, rw = pw - 48;
    ZONES.forEach((z, i) => {
      const y = py + 112 + i * 56;
      const locked = i > Hero.zonesCleared;
      UI.btnPlate2(ctx, rx, y, rw, 46, '', locked ? null : () => Game.startZone(i), { disabled: locked });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 13px Cinzel, Georgia';
      ctx.fillStyle = locked ? '#5c5569' : '#e8e0cc';
      ctx.fillText((locked ? '🔒  ' : '') + z.name, rx + 26, y + 20);
      ctx.font = '10px Cinzel, Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#9a9080';
      ctx.fillText(this.fitText(ctx, locked ? 'Clear the previous land to unlock' : z.desc, rw - 140), rx + 26, y + 35);
      ctx.textAlign = 'right';
      ctx.font = 'bold 10px Cinzel, Georgia';
      ctx.fillStyle = locked ? '#453f52' : '#ffb43a';
      ctx.fillText(z.kind === 'dungeon' ? 'CRYPT' : 'WILDS', rx + rw - 26, y + 20);
      ctx.fillStyle = locked ? '#453f52' : '#c9bfa8';
      ctx.fillText('lvl ' + (z.mLvl + Hero.difficulty * 6), rx + rw - 26, y + 35);
    });

    // Compact centered BACK plate — never full width (owner rule).
    const bw2 = 200;
    UI.btnPlate2(ctx, W / 2 - bw2 / 2, py + 112 + ZONES.length * 56 + 6, bw2, 36,
      'BACK TO TOWN', () => { Game.enterTown(); }, { size: 12 });
    // The ✕ rides the panel's title bar like every other menu (owner rule).
    this.closeX(ctx, W, { x: px + pw - 30, y: py + 26, cb: () => { Game.enterTown(); } });
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
      case 'shoulders':
        // Two pauldron humps over a yoke line.
        ctx.beginPath(); ctx.arc(x - r * 0.28, y + r * 0.05, r * 0.3, Math.PI, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + r * 0.28, y + r * 0.05, r * 0.3, Math.PI, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.05); ctx.lineTo(x + r * 0.5, y + r * 0.05); ctx.stroke();
        break;
      case 'legs':
        // Trousers: a waist bar splitting into two legs.
        ctx.beginPath(); ctx.moveTo(x - r * 0.32, y - r * 0.4); ctx.lineTo(x + r * 0.32, y - r * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - r * 0.2, y - r * 0.4); ctx.lineTo(x - r * 0.22, y + r * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + r * 0.2, y - r * 0.4); ctx.lineTo(x + r * 0.22, y + r * 0.45); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y - r * 0.4); ctx.lineTo(x, y + r * 0.05); ctx.stroke();
        break;
      default: // rings
        ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.3, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r * 0.12, y - r * 0.25); ctx.lineTo(x, y - r * 0.45); ctx.lineTo(x + r * 0.12, y - r * 0.25);
        ctx.closePath(); ctx.fill();
    }
  },

  radial(ctx, W, H) {
    // Grouped-list layout (Settings ▸ Gameplay ▸ Inventory: Grouped) replaces
    // the wheel entirely (owner rule).
    if (Settings.g.invGrouped) { this.invGrouped(ctx, W, H); return; }
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const p = Game.player;
    const slots = Object.keys(ITEM_SLOTS);
    if (!UI.sel.slot) UI.sel.slot = 'weapon';

    // On narrow (portrait phone) screens the wheel shrinks hard so the
    // equipped card, bag list and EQUIP/SALVAGE/SOCKET actions all fit below.
    const narrow = W < 620;
    // Tablet/desktop: the stat readout is drawn much bigger (owner request), so
    // fit the wheel in the gutter between that left column and the right-hand
    // detail panel — no overlap at any big-screen width.
    const big = !narrow && W >= 760;
    const cy = narrow ? 116 : H * 0.5;
    const chipR = narrow ? 19 : 25;
    let cx, R;
    if (narrow) {
      // Pushed right + slightly smaller so the stat readout column (left)
      // never reaches the wheel's chips (owner screenshot: they collided).
      cx = W * 0.63;
      R = Math.min(70, W * 0.27);
    } else if (big) {
      const readoutRight = 215, detailLeft = W * 0.48;
      cx = (readoutRight + detailLeft) / 2;
      R = Math.max(60, Math.min(H * 0.30, (detailLeft - readoutRight) / 2 - 30));
    } else {
      cx = W * 0.26;
      R = Math.min(150, H * 0.32);
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (narrow ? 14 : 17) + 'px Cinzel, Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('EQUIPMENT', cx, cy - R - chipR - 8);

    // (The town portal is now cast from the HUD Portal button, not opened here.)

    // Upper-left live stat readout (owner request) — at a glance, what your gear
    // gives: damage, crit, gold find, life, life/s, essence/s.
    {
      const sf2 = UI.safe || { top: 0, left: 0 };
      const st = Items.computeStats();
      // Raw per-hit damage (equipped primary base × multiplier + flat gem
      // damage) so the player sees an actual number, not only the ×multiplier.
      const rawHit = Items.rawHit(st);
      // Endgame numbers get huge (209,778,275 gold) — shorten to k/m so the
      // readout can NEVER grow wide enough to run into the wheel or headers.
      const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm'
        : n >= 1e5 ? Math.round(n / 1000) + 'k' : n.toLocaleString();
      const rows = [
        ['DMG', '×' + st.dmgMult.toFixed(2), '#6ff7c3'],
        ['DMG/HIT', short(rawHit), '#ff9a6a'],
        ['CRIT', Math.round(st.critChance * 100) + '%', '#ffb43a'],
        ['GOLD FIND', '+' + Math.round((st.goldFind - 1) * 100) + '%', '#ffd76a'],
        ['LIFE', short(st.maxHp), '#e04a5a'],
        ['LIFE/s', st.hpRegen.toFixed(1), '#e0808a'],
        ['ESS/s', st.essenceRegen.toFixed(1), '#8fb0e8']
      ];
      // Gem-driven stats appear only once a gem grants them, so EVERY gem type
      // visibly moves the readout (Emerald crit dmg, Amethyst life/hit, Diamond
      // cooldowns & resist, Topaz resource cost — gold already covers the rest).
      if (st.attackSpeed > 0) rows.push(['ATK SPD', '+' + (st.attackSpeed * 100).toFixed(1) + '%', '#ffd76a']);
      if (st.intelligence > 0) rows.push(['INT', '+' + short(st.intelligence), '#8fd3ff']);
      if (st.vitality > 0) rows.push(['VIT', '+' + short(st.vitality), '#e0808a']);
      if (st.critDamage > 0) rows.push(['CRIT DMG', '+' + Math.round(st.critDamage * 100) + '%', '#ffca6a']);
      if (st.lifePerHit > 0) rows.push(['LIFE/HIT', '+' + short(st.lifePerHit), '#e0808a']);
      if (st.cooldownReduction > 0) rows.push(['CDR', '-' + Math.round(st.cooldownReduction * 100) + '%', '#bfe8f4']);
      if (st.resourceCostReduction > 0) rows.push(['ESS COST', '-' + Math.round(st.resourceCostReduction * 100) + '%', '#8fd0a0']);
      if (st.resistAll > 0) rows.push(['RESIST', short(st.resistAll), '#bfe8f4']);
      // The player's actual gold purse, pinned to the bottom of the readout.
      rows.push(['GOLD', short(Hero.gold), '#ffe08a']);
      // Tablet/desktop gets a much bigger, more spaced-out readout (owner request).
      const labF = big ? 13 : 9, valF = big ? 18 : 11, step = big ? 23 : 15, valX = big ? 92 : 58;
      let sy = (big ? 62 : 50) + sf2.top;
      ctx.textBaseline = 'middle';
      for (const [lbl, val, col] of rows) {
        ctx.textAlign = 'left';
        ctx.font = labF + 'px Cinzel, Georgia';
        ctx.fillStyle = '#8a8070';
        ctx.fillText(lbl, 10 + sf2.left, sy);
        ctx.font = 'bold ' + valF + 'px Cinzel, Georgia';
        ctx.fillStyle = col;
        ctx.fillText(val, valX + sf2.left, sy);
        sy += step;
      }
      // A long readout (endgame gear rolls every stat) must PUSH the detail
      // column below it on phones, never write over its header.
      this._radialStatsBottom = sy;
    }

    // (Damage/Life/Crit live in the upper-left readout now — no duplicate in
    // the wheel hub.)

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
      // Empty-socket hint: a diamond on the BOTTOM of the chip when the equipped
      // item still has an open gem slot — a quick "socket me". It fades out once
      // every socket is filled (eased toward 0 over a few frames).
      {
        const emptyN = it ? (it.sockets || 0) - ((it.gems && it.gems.length) || 0) : 0;
        this._gemHint = this._gemHint || {};
        const tgt = emptyN > 0 ? 1 : 0;
        let ga = this._gemHint[slot];
        if (ga === undefined) ga = tgt;              // first sight: appear at once
        ga += (tgt - ga) * 0.16;                       // ease toward target each frame
        if (ga < 0.02) ga = 0;
        this._gemHint[slot] = ga;
        if (ga > 0.015) {
          const pulse = 0.85 + 0.15 * Math.sin(Game.time * 4 + i);
          const s = (narrow ? 8.5 : 10.5) * pulse;   // much bigger, easy to spot
          ctx.save();
          ctx.globalAlpha = ga;
          ctx.translate(bx, by + chipR + s * 0.35);  // hangs below the chip
          ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0);
          ctx.closePath();
          ctx.fillStyle = '#bfeaff';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.lineWidth = 1.8; ctx.strokeStyle = '#0b1a24';
          ctx.stroke();
          // facets + sparkle
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-s * 0.72, 0); ctx.lineTo(s * 0.72, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.beginPath(); ctx.arc(-s * 0.22, -s * 0.28, 1.6, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }
      // Red "!" badge: a better item for this slot is waiting in the bag.
      if (Items.slotHasUpgrade(slot)) {
        const ex = bx - chipR * 0.72, ey = by - chipR * 0.72;
        ctx.fillStyle = '#e0402f';
        ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#12080a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Cinzel, Georgia';
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

    // Detail column. On narrow screens it starts below BOTH the wheel and the
    // stat readout (whichever runs lower), so the gold line can't collide with
    // the "WEAPON — EQUIPPED" header (owner screenshot).
    const dx = narrow ? 12 : W * 0.48;
    const dw = narrow ? W - 24 : W * 0.48;
    let dy = narrow ? Math.max(cy + R + chipR + 22, (this._radialStatsBottom || 0) + 14) : 54;
    const slot = UI.sel.slot;
    const equipped = Hero.equipped[slot];
    const fam = Items.slotFamily(slot);

    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Cinzel, Georgia';
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
        'INVENTORY ' + Hero.bagUsed() + '/' + Hero.BAG_SIZE + '  —  EXPAND → ' + up.size + ' (' + gshort(up.cost) + 'g)',
        afford ? () => Hero.buyBagUpgrade() : null,
        { size: 10, disabled: !afford, border: '#8a6f4a', color: '#ffd76a' });
    } else {
      ctx.textAlign = 'left'; ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText('INVENTORY ' + Hero.bagUsed() + '/' + Hero.BAG_SIZE + ' (max size)', dx, dy + 16);
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
    // In town the round EXIT button owns the bottom-right corner — stop the
    // list above it so MANAGE SOCKETS / item actions never sit underneath.
    const viewBot = H - (Game.state === 'town' ? 150 : 12);
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
    ctx.font = 'bold 13px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText('IN BAG (' + bagItems.length + ')', dx, c - scrollY + 14);
    c += 24;

    if (!bagItems.length) {
      ctx.font = '12px Cinzel, Georgia';
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
        ctx.font = 'bold 12px Cinzel, Georgia';
        ctx.fillStyle = RARITIES[it.rarity].color;
        const bagNm = it.name + (it.torch && (it.count || 1) > 1 ? '  ×' + it.count : '');
        ctx.fillText(this.fitText(ctx, bagNm, dw - 70), dx + 10, yy + 15);
        ctx.textAlign = 'right';
        ctx.font = 'bold 13px Cinzel, Georgia';
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
          UI.sel.scrollY = 0;   // back to the top so other strong items stay in view
        }, { border: '#57b894', color: '#6ff7c3', size: 12 });
        // Torches are tools — they can't be salvaged, socketed or stashed, so
        // those three actions read "—" (disabled) rather than a bogus "L0".
        const isTorch = !!UI.sel.item.torch;
        const canSalv = Items.canSalvage(UI.sel.item);
        UI.btn(ctx, dx + bw + 8, yy, bw, 34, canSalv ? 'SALVAGE' : '—',
          canSalv ? () => { Items.salvage(UI.sel.item); UI.sel.item = null; } : null,
          { disabled: !canSalv, border: '#8a6f4a', color: '#ffb43a', size: 12 });
        const canSocket = !!UI.sel.item.sockets;
        UI.btn(ctx, dx + (bw + 8) * 2, yy, bw, 34, canSocket ? 'SOCKET' : (isTorch ? '—' : 'SOCKET'), canSocket ? () => {
          UI.sel.gemTarget = UI.sel.item;
          UI.sel.gemPick = true;
          UI.sel.gemKey = undefined;
        } : null, { disabled: !canSocket, border: '#7a4a8f', color: '#b06adf', size: 12 });
        // STASH: deposit this single item into its shared, per-slot vault bin.
        const stashFull = !isTorch && Hero.stashSlotCount(UI.sel.item.slot) >= Hero.stashPerSlot();
        const canStash = !isTorch && !stashFull;
        UI.btn(ctx, dx + (bw + 8) * 3, yy, bw, 34, isTorch ? '—' : (stashFull ? 'FULL' : 'STASH'),
          canStash ? () => { if (Items.toStash(UI.sel.item)) UI.sel.item = null; } : null,
          { disabled: !canStash, border: '#5f7ab0', color: '#8fb0e8', size: 12 });
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
        // Quick jump back to the top of the bag list.
        UI.btn(ctx, dx + 158, c - scrollY + 6, 64, 30, '↑ Top', () => { UI.sel.scrollY = 0; },
          { border: '#5f7ab0', color: '#8fb0e8', size: 12 });
      }
      c += 40;
    }

    ctx.restore();

    // Scroll range for next frame; snap to the actions when an item was just picked.
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
    if (UI.sel.scrollToBottom) { UI.sel.scrollY = UI.sel.scrollMax; UI.sel.scrollToBottom = false; }
    // Fade hints when there's more content above/below the fold.
    ctx.textAlign = 'center';
    ctx.font = '9px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', dx + dw / 2, listTop + 4);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', dx + dw / 2, viewBot - 1);

    // The socketing popup, drawn over everything.
    if (UI.sel.gemPick) this.gemModal(ctx, W, H);
  },

  // Grouped INVENTORY (Settings ▸ Gameplay ▸ Inventory: Grouped) — no wheel:
  // equipped gear + the bag in one scrolling list, in fixed category order
  // (owner rule): Helm → Shoulders → Chest → Gloves → Legs → Boots → Amulet →
  // Ring 1 → Ring 2 → Weapon → Off-Hand → Torch.
  INV_GROUP_ORDER: ['helm', 'shoulders', 'chest', 'gloves', 'legs', 'boots',
                    'amulet', 'ring1', 'ring2', 'weapon', 'offhand', 'torch'],

  invGrouped(ctx, W, H) {
    this.dim(ctx, W, H);
    const sfa = UI.safe || { top: 0 };
    // The painted panel wraps the whole list (v1.6.96 owner rule — Inventory
    // matches the Character sheet's framed look). px/pw = the content column.
    const ppw = Math.min(600, W - 16);
    const ppx = W / 2 - ppw / 2;
    const ppy = Math.max(8, (sfa.top || 0) + 8);
    const ppb = H - 10;
    UI.panel(ctx, ppx, ppy, ppw, ppb - ppy,
      'INVENTORY — ' + Hero.bagUsed() + ' / ' + Hero.BAG_SIZE);
    // Content column padded well off the panel edges AND a right-hand gutter
    // reserved for the skull scrollbar so rows never clip under it (owner rule
    // v1.7.29 — nothing spans the full width).
    const SB_GUT = 30;
    const px = ppx + 24;
    const pw = ppw - 48 - SB_GUT;
    let y = ppy + 52;

    // Bag expansion (same as the wheel's).
    const up = Hero.nextBagUpgrade();
    if (up) {
      const afford = Hero.gold >= up.cost;
      const gshort = n => n >= 1e6 ? (n / 1e6) + 'm' : n >= 1000 ? (n / 1000) + 'k' : '' + n;
      UI.btnPlate2(ctx, px, y, pw, 26, 'EXPAND BAG → ' + up.size + ' slots  (' + gshort(up.cost) + ' g)',
        afford ? () => Hero.buyBagUpgrade() : null,
        { size: 10, disabled: !afford, color: '#ffd76a' });
      y += 32;
    }

    // Filter chips (flow-wrapped): ALL + one per category with something in it.
    const filter = UI.sel.invFilter || 'all';
    const setFilter = f => { UI.sel.invFilter = f; UI.sel.scrollY = 0; UI.sel.invItem = null; };
    const groupLabel = s => s === 'ring1' ? 'Ring 1' : s === 'ring2' ? 'Ring 2' : ITEM_SLOTS[s].label;
    const bagFor = s => s === 'torch'
      ? Hero.bag.filter(it => it && it.torch)
      // Rings are ONE pool shown under BOTH ring groups (v1.7.17 fix — Ring 2
      // never showed); equipping from a group targets that finger.
      : (s === 'ring1' || s === 'ring2')
        ? Hero.bag.filter(it => it && !it.torch && (it.slot === 'ring1' || it.slot === 'ring2'))
        : Hero.bag.filter(it => it && !it.torch && it.slot === s);
    let chX = px, chY = y;
    // Filter chips ride the little empty plate (v1.6.99 owner rule).
    const chip = (label, on, cb) => {
      ctx.font = 'bold 9px Cinzel, Georgia';
      const cw = ctx.measureText(label).width + 26;
      if (chX + cw > px + pw + 1) { chX = px; chY += 24; }
      UI.chip(ctx, chX, chY, cw, 20, label, cb,
        { size: 9, color: on ? '#f0dcae' : '#8a8070' });
      chX += cw + 6;
    };
    chip('ALL', filter === 'all', () => setFilter('all'));
    for (const s of this.INV_GROUP_ORDER) {
      const n = bagFor(s).length + (Hero.equipped[s] ? 1 : 0);
      if (!n && filter !== s) continue;
      chip(groupLabel(s) + (n ? ' ' + n : ''), filter === s, () => setFilter(s));
    }
    y = chY + 28;

    // Scrolling grouped list, clipped inside the panel.
    const listTop = y, viewBot = ppb - 14, viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    // The scroll region extends into the reserved right gutter so the skull
    // scrollbar draws THERE, clear of the rows (which end at px+pw).
    UI.sel.scrollRegion = { x: px - 4, y: listTop - 4, w: pw + 4 + SB_GUT, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(px - 4, listTop - 4, pw + 4 + SB_GUT, viewH + 8); ctx.clip();
    let c = listTop;
    const vis = (top, h) => (top - scrollY + h > listTop) && (top - scrollY < viewBot);

    const drawRow = (slotKey, it, isEq, arrows) => {
      const yy = c - scrollY;
      const selected = UI.sel.invItem === it;
      if (vis(c, 34)) {
        ctx.fillStyle = selected ? 'rgba(46,42,58,0.95)' : isEq ? 'rgba(26,40,32,0.9)' : 'rgba(28,24,38,0.92)';
        rr(ctx, px, yy, pw, 30, 6); ctx.fill();
        if (selected) { ctx.strokeStyle = RARITIES[it.rarity].color; ctx.lineWidth = 1.5; rr(ctx, px, yy, pw, 30, 6); ctx.stroke(); }
        // Empty-socket glow (owner rule v1.7.32 — see at a glance what needs a
        // gem, matching the radial's socket hint).
        const emptyN = !it.torch ? (it.sockets || 0) - ((it.gems && it.gems.length) || 0) : 0;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
        const nm = it.name + (it.torch && (it.count || 1) > 1 ? '  ×' + it.count : '');
        ctx.fillText(this.fitText(ctx, nm, pw - (emptyN > 0 ? 116 : 96)), px + 10, yy + 15);
        if (emptyN > 0) {
          const dx = px + pw - 86, dy = yy + 15;
          const pulse = 0.8 + 0.2 * Math.sin(Game.time * 4);
          const sz = 6.5 * pulse;
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(dx, dy - sz); ctx.lineTo(dx + sz * 0.72, dy); ctx.lineTo(dx, dy + sz); ctx.lineTo(dx - sz * 0.72, dy); ctx.closePath();
          ctx.fillStyle = '#bfeaff'; ctx.fill();
          ctx.shadowBlur = 0; ctx.lineWidth = 1.4; ctx.strokeStyle = '#0b1a24'; ctx.stroke();
          ctx.restore();
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#7fd8ff';
          ctx.fillText('×' + emptyN, dx + sz + 2, dy);
        }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        if (isEq) {
          ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#4ade80';
          ctx.fillText('EQUIPPED', px + pw - 10, yy + 15);
        } else if (!it.torch) {
          ctx.font = 'bold 13px Cinzel, Georgia';
          ctx.fillStyle = arrows > 0 ? '#4ade80' : arrows < 0 ? '#e04a5a' : '#9a9080';
          ctx.fillText(arrows > 0 ? '▲'.repeat(Math.min(3, arrows)) : arrows < 0 ? '▼'.repeat(Math.min(3, -arrows)) : '—', px + pw - 10, yy + 15);
        }
        UI.register(px, yy, pw, 30, () => { UI.sel.invItem = selected ? null : it; UI.sel.gemPick = false; });
      }
      c += 34;
      if (selected) {
        // Full card + actions right under the row.
        const cmp = isEq || it.torch ? null : Hero.equipped[it.slot];
        const cardH = 30 + Items.statLines(it).length * 15 + 8;
        if (vis(c, cardH)) this.itemCard(ctx, px, c - scrollY, pw, it, cmp, true);
        c += cardH + 4;
        const ay = c - scrollY;
        if (vis(c, 36)) {
          if (isEq) {
            if (it.sockets || (it.gems && it.gems.length)) {
              UI.btn(ctx, px, ay, 150, 32, (it.gems && it.gems.length) ? 'MANAGE SOCKETS' : 'SOCKET GEM', () => {
                UI.sel.gemTarget = it; UI.sel.gemPick = true; UI.sel.gemKey = undefined;
              }, { border: '#7a4a8f', color: '#b06adf', size: 11 });
            }
          } else {
            const bw = (pw - 24) / 4;
            UI.btn(ctx, px, ay, bw, 32, 'EQUIP', () => {
              // Equip into THIS group's slot (rings pick the finger, v1.7.17).
              Items.equip(it, it.torch ? 'torch' : slotKey);
              UI.sel.invItem = null;
            }, { border: '#57b894', color: '#6ff7c3', size: 11 });
            const canSalv = Items.canSalvage(it) && !it.torch;
            UI.btn(ctx, px + bw + 8, ay, bw, 32, canSalv ? 'SALVAGE' : '—',
              canSalv ? () => { Items.salvage(it); UI.sel.invItem = null; } : null,
              { disabled: !canSalv, border: '#8a6f4a', color: '#ffb43a', size: 11 });
            const canSocket = !!it.sockets;
            UI.btn(ctx, px + (bw + 8) * 2, ay, bw, 32, 'SOCKET', canSocket ? () => {
              UI.sel.gemTarget = it; UI.sel.gemPick = true; UI.sel.gemKey = undefined;
            } : null, { disabled: !canSocket, border: '#7a4a8f', color: '#b06adf', size: 11 });
            const stashFull = !it.torch && Hero.stashSlotCount(it.slot) >= Hero.stashPerSlot();
            const canStash = !it.torch && !stashFull;
            UI.btn(ctx, px + (bw + 8) * 3, ay, bw, 32, it.torch ? '—' : (stashFull ? 'FULL' : 'STASH'),
              canStash ? () => { if (Items.toStash(it)) UI.sel.invItem = null; } : null,
              { disabled: !canStash, border: '#5f7ab0', color: '#8fb0e8', size: 11 });
          }
        }
        c += 40;
      }
    };

    let anything = false;
    for (const s of this.INV_GROUP_ORDER) {
      if (filter !== 'all' && filter !== s) continue;
      const eq = Hero.equipped[s];
      const bagItems = bagFor(s)
        .map(it => ({ it, arrows: it.torch ? 0 : Items.compareArrows(it, Hero.equipped[it.slot]) }))
        .sort((a, b) => b.arrows - a.arrows || (b.it.rarity || 0) - (a.it.rarity || 0));
      if (!eq && !bagItems.length) continue;
      anything = true;
      // Group header.
      if (vis(c, 20)) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
        ctx.fillText(groupLabel(s).toUpperCase(), px + 2, c - scrollY + 13);
        ctx.strokeStyle = 'rgba(216,197,160,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, c - scrollY + 18); ctx.lineTo(px + pw, c - scrollY + 18); ctx.stroke();
      }
      c += 24;
      if (eq) drawRow(s, eq, true, 0);
      for (const { it, arrows } of bagItems) drawRow(s, it, false, arrows);
      c += 8;
    }
    if (!anything) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Nothing here yet — loot the wilds.', px, c - scrollY + 14);
      c += 24;
    }
    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, listTop + 3);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', px + pw / 2, viewBot - 1);

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
    const GEM_COLS = 3;   // wider chips so the gem TYPE (not just the tier) reads
    const rows = Math.max(1, Math.ceil(shown.length / GEM_COLS));
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
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = RARITIES[target.rarity].color;
    ctx.fillText(this.fitText(ctx, target.name, pw - 32), px + 16, py + 50);
    let y = py + 64;

    // Currently socketed gems, each with a free unsocket. (Tier only — the
    // chip colour says which gem; the info card has the full name.)
    gems.forEach((g, gi) => {
      const gm = GEM_TYPES[g.type];
      ctx.font = '11px Cinzel, Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText(this.fitText(ctx, '◆ ' + GEM_TIERS[g.tier] + ' — ' + gemStatText(g), pw - 150), px + 16, y + 8);
      UI.btn(ctx, px + pw - 136, y - 6, 120, 24, 'UNSOCKET', () => {
        Items.unsocket(target, gi);
        UI.sel.gemKey = undefined;
      }, { size: 10, border: '#7a4a8f', color: '#b06adf' });
      y += 30;
    });
    if (emptyCount > 0) {
      ctx.font = 'italic 10px Cinzel, Georgia';
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
      ctx.font = 'italic 12px Cinzel, Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText(Hero.gems.length ? 'No gems match this filter.' : 'No gems in your pouch — monsters, chests and rifts drop them.', px + 16, y + 14);
      y += 36;
    } else {
      if (groups.length > 12) {
        ctx.font = '10px Cinzel, Georgia';
        ctx.fillStyle = '#9a9080';
        ctx.fillText('+' + (groups.length - 12) + ' more', px + 16, y);
      }
      y += 10;
      const cw = (pw - 32) / GEM_COLS;
      shown.forEach((grp, k) => {
        const gx = px + 16 + (k % GEM_COLS) * cw;
        const gy = y + Math.floor(k / GEM_COLS) * 36;
        const selected = UI.sel.gemKey === grp.key;
        const gcol = GEM_TYPES[grp.type].color;
        // Empty-label button = the tap target + selection highlight; the gem icon
        // and its NAME (type + tier) are drawn on top so the five Marquises read
        // apart at a glance.
        UI.btn(ctx, gx, gy, cw - 6, 30, '', () => {
          UI.sel.gemKey = selected ? undefined : grp.key;
        }, {
          bg: selected ? 'rgba(70,44,90,0.95)' : undefined,
          border: selected ? gcol : undefined
        });
        drawGemIcon(ctx, grp.type, grp.tier, gx + 13, gy + 15, 8);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = gcol;
        ctx.fillText(GEM_TYPES[grp.type].name + (grp.count > 1 ? ' ×' + grp.count : ''), gx + 24, gy + 10);
        ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
        ctx.fillText(GEM_TIERS[grp.tier], gx + 24, gy + 21);
      });
      ctx.textAlign = 'left';
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
      drawGemIcon(ctx, g.type, g.tier, px + pw - 46, y + 31, 18);
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Cinzel, Georgia';
      ctx.fillStyle = gm.color;
      ctx.fillText('◆ ' + gemName(g) + (selGroup.count > 1 ? '  (×' + selGroup.count + ')' : ''), px + 28, y + 16);
      ctx.font = '12px Cinzel, Georgia';
      ctx.fillStyle = '#b5ab94';
      ctx.fillText(this.fitText(ctx, gemStatText(g), pw - 70), px + 32, y + 33);
      ctx.font = '11px Cinzel, Georgia';
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
      ctx.font = 'italic 12px Cinzel, Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('— nothing equipped —', x + 12, y + 18);
      return y + 42;
    }
    const lines = Items.statLines(item);
    const h = 30 + lines.length * 15;
    // Torches carry their own rarity ladder (Common → Legendary) and no ilvl.
    const torchT = item.torch ? (TORCH_TYPES[item.torch] || TORCH_TYPES.wood) : null;
    const rareCol = torchT ? torchT.tierColor : RARITIES[item.rarity].color;
    const rareName = torchT ? torchT.tier : RARITIES[item.rarity].name;
    ctx.fillStyle = 'rgba(20,17,28,0.94)';
    rr(ctx, x, y, w, h, 6); ctx.fill();
    // Artifact and above wear their color IN THE BACKGROUND (owner rule
    // v1.7.8: "blue in the background like the artifact is red") — a soft
    // rarity wash under the text: red / blue / teal / gold.
    if (!torchT && item.rarity >= 6) {
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = rareCol;
      rr(ctx, x, y, w, h, 6); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = rareCol;
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, w, h, 6); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Cinzel, Georgia';
    ctx.fillStyle = rareCol;
    const cardNm = item.name + (item.torch && (item.count || 1) > 1 ? '  ×' + item.count : '');
    ctx.fillText(this.fitText(ctx, cardNm, w - 116), x + 12, y + 15);
    ctx.textAlign = 'right';
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(torchT ? rareName : rareName + ' · lvl ' + item.mLvl, x + w - 10, y + 15);
    ctx.textAlign = 'left';
    ctx.font = '12px Cinzel, Georgia';
    lines.forEach((ln, i) => {
      ctx.fillStyle = ln[0] === '◆' ? '#8fe8c8' : ln[0] === '◇' ? '#6f6552'
        : ln[0] === '❢' ? '#ff9a6a' : ln[0] === '★' ? '#ff8c2a'
        : ln[0] === '◈' ? '#4ade80' : '#b5ab94';
      ctx.fillText(this.fitText(ctx, ln, w - 26), x + 16, y + 32 + i * 15);
    });
    return y + h + 8;
  },

  // ------------------------------------------------------ skills screen

  skills(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    if (!UI.sel.tab) UI.sel.tab = 'actives';
    if (UI.sel.slotIdx === undefined) UI.sel.slotIdx = 0;

    // Roomier on desktop (mouse), tighter on phones. The painted panel wraps
    // the whole screen (v1.6.96 owner rule — match the Character sheet); its
    // title carries SKILLS OF RATHMA.
    const pw = Math.min(UI.desktop ? 860 : 600, W - 16);
    const px = W / 2 - pw / 2;
    const ppy = Math.max(2, ((UI.safe && UI.safe.top) || 0) + 2);
    UI.panel(ctx, Math.max(2, px - 12), ppy, Math.min(W - 4, pw + 24), H - 6 - ppy, 'SKILLS OF BELLMAHATH');
    // Content is inset off the panel edges (owner rule — padding all sides, the
    // tab plates + slot rows don't span the full width).
    const ipx = px + 18, ipw = pw - 36;
    UI.btnPlate(ctx, ipx, ppy + 46, ipw / 2 - 8, 32, 'ACTIVES', () => { UI.sel.tab = 'actives'; UI.sel.info = null; },
      { size: 13, color: UI.sel.tab === 'actives' ? '#f0dcae' : '#8a8070' });
    UI.btnPlate(ctx, ipx + ipw / 2 + 8, ppy + 46, ipw / 2 - 8, 32, 'PASSIVES', () => { UI.sel.tab = 'passives'; UI.sel.info = null; },
      { size: 13, color: UI.sel.tab === 'passives' ? '#f0dcae' : '#8a8070' });

    if (UI.sel.tab === 'actives') this.skillsActives(ctx, W, H, ipx, ipw);
    else this.skillsPassives(ctx, W, H, ipx, ipw);

    // Info footer. (The ACTIVES slot footer + its RUNES button are DELETED,
    // owner rule — tapping a slot opens the chooser straight away.)
    if (UI.sel.tab === 'actives') {
      // no footer
    } else if (UI.sel.info) {
      // Passives footer.
      const s = UI.sel.info;
      const fy = H - 84;
      UI.panel(ctx, ipx, fy, ipw, 76);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 13px Cinzel, Georgia';
      ctx.fillStyle = '#b06adf';
      ctx.fillText(this.fitText(ctx, s.name + '  ·  Passive', ipw - 24), ipx + 12, fy + 16);
      ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
      wrapText(ctx, s.desc, ipx + 12, fy + 33, ipw - 24, 14, 2);
      if (s.lvl > Hero.level) {
        ctx.fillStyle = '#6f6552'; ctx.font = '11px Cinzel, Georgia';
        ctx.fillText(this.fitText(ctx, 'unlocks at level ' + s.lvl, ipw - 24), ipx + 12, fy + 65);
      }
    }
  },

  // Category names for the 6-slot action bar (matches LOADOUT_CATS order).
  slotCatLabels: ['PRIMARY', 'SECONDARY', 'CORPSES', 'REANIM', 'CURSES', 'BLOOD'],

  skillsActives(ctx, W, H, px, pw) {
    // (The "ACTION BAR — one skill per category" header was removed, owner rule.)
    const sy = 118;
    const nSlots = 6;
    const sw = pw / nSlots;
    const cr = Math.min(UI.desktop ? 42 : 26, sw / 2 - 4);
    const cyc = sy + 40;   // clear of the section label above
    for (let i = 0; i < nSlots; i++) {
      const bx = px + i * sw + sw / 2;
      const cat = LOADOUT_CATS[i];
      const selected = UI.sel.slotIdx === i;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, cyc, cr, 0, TAU); ctx.fill();
      // Painted round frame (v1.6.97 owner rule); selection keeps its glow ring.
      const framed = UI.circleFrame(ctx, bx, cyc, cr);
      if (selected || !framed) {
        // Selection ring: faded bone white (owner rule — no bright green).
        ctx.strokeStyle = selected ? '#cfc8b8' : SKILL_CATS[cat].color;
        ctx.lineWidth = selected ? 3 : 2;
        ctx.beginPath(); ctx.arc(bx, cyc, cr, 0, TAU); ctx.stroke();
      }
      const id = Hero.loadout[i];
      if (id) drawSkillIcon(ctx, id, bx, cyc, cr - 3);
      else {
        ctx.fillStyle = '#3a3448'; ctx.font = '22px Cinzel, Georgia'; ctx.textAlign = 'center';
        ctx.fillText('+', bx, cyc + 1);
      }
      // In Elective Mode a slot can hold any category, so label it by the skill
      // that's actually in it; otherwise show the slot's fixed category.
      const elective = typeof Settings !== 'undefined' && Settings.g && Settings.g.electiveMode;
      const lblCat = (elective && id) ? (SKILL_DATA.find(s => s.id === id) || {}).cat || cat : cat;
      ctx.fillStyle = SKILL_CATS[lblCat].color;
      ctx.font = '8px Cinzel, Georgia'; ctx.textAlign = 'center';
      ctx.fillText(elective ? SKILL_CATS[lblCat].name.toUpperCase().slice(0, 9) : this.slotCatLabels[i], bx, cyc + cr + 12);
      UI.register(bx - sw / 2 + 2, sy - 4, sw - 4, cr * 2 + 30, () => {
        UI.sel.slotIdx = i;
        UI.sel.info = null;
        Screens.openChooser(i, Hero.loadout[i], null);   // straight to the chooser (footer deleted)
      });
    }

    // A prominent button opens the fleshed-out category chooser for the
    // selected slot (skills browsable by category, with their runes).
    const slot = UI.sel.slotIdx == null ? 0 : UI.sel.slotIdx;
    const by = cyc + cr + 44;   // breathing room below the slots (owner rule)
    UI.btnPlate(ctx, px + pw * 0.12, by, pw * 0.76, 44, 'CHOOSE SKILLS',
      () => Screens.openChooser(slot, Hero.loadout[slot], null),
      { size: 15, color: '#6ff7c3', border: '#3a7a6a' });
    // (The "Browse every skill & rune…" caption was removed, owner rule.)
  },

  // Open the category skill+rune chooser, seeded to an action-bar slot and its
  // skill. chSlot is the bar slot ACCEPT writes to in Elective Mode; in the
  // default category-locked mode ACCEPT targets the browsed category's slot.
  openChooser(slotIdx, skillId, runeId) {
    UI.open('skillChooser');
    UI.sel.chSlot = clamp(slotIdx || 0, 0, 5);
    let ci = clamp(slotIdx || 0, 0, LOADOUT_CATS.length - 1);
    if (skillId) {
      const s = SKILL_DATA.find(x => x.id === skillId);
      if (s) ci = LOADOUT_CATS.indexOf(s.cat);
    }
    UI.sel.chCat = ci;
    const cs = CAT_SKILLS[LOADOUT_CATS[ci]];
    UI.sel.chSkill = (skillId && cs.includes(skillId)) ? skillId : cs[0];
    UI.sel.chRune = runeId || Hero.runes[UI.sel.chSkill] || 'base';
  },

  // The fleshed-out skill + rune chooser popup: a category selector with ◀ ▶
  // arrows, the category's skills, that skill's runes (with unlock levels), an
  // assigned-skill preview, and ACCEPT / CANCEL.
  skillChooser(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(560, W - 16);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 640);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SKILLS & RUNES');

    if (UI.sel.chCat == null) UI.sel.chCat = 0;
    const catIdx = clamp(UI.sel.chCat, 0, LOADOUT_CATS.length - 1);
    const cat = LOADOUT_CATS[catIdx];
    const catDef = SKILL_CATS[cat];
    const catSkills = CAT_SKILLS[cat];
    if (!catSkills.includes(UI.sel.chSkill)) UI.sel.chSkill = catSkills[0];

    // ---- category selector with arrows ----
    const selY = py + 44;
    const stepCat = dir => {
      UI.sel.chCat = (catIdx + dir + LOADOUT_CATS.length) % LOADOUT_CATS.length;
      const cs = CAT_SKILLS[LOADOUT_CATS[UI.sel.chCat]];
      UI.sel.chSkill = cs[0];
      UI.sel.chRune = Hero.runes[cs[0]] || 'base';
    };
    const chArrow = (ax, key, glyph, cb) => {
      const img = Game.uiImg ? Game.uiImg(key) : null;
      if (img) {
        const abw = 46, abh = Math.round(46 * (img.height / img.width));
        const ay = selY + 16 - abh / 2;
        ctx.drawImage(img, ax, ay, abw, abh);
        UI.register(ax - 4, ay - 4, abw + 8, abh + 8, cb);
      } else UI.btn(ctx, ax, selY, 42, 32, glyph, cb, { size: 15 });
    };
    chArrow(px + 14, 'arrow_left', '◀', () => stepCat(-1));
    chArrow(px + pw - 60, 'arrow_right', '▶', () => stepCat(1));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 17px Cinzel, Georgia'; ctx.fillStyle = catDef.color;
    ctx.fillText(catDef.name.toUpperCase(), W / 2, selY + 15);


    // ---- section 1: skills of this category ----
    let y = selY + 46;
    this.chooserLabel(ctx, px, pw, y, catDef.name.toUpperCase());
    y += 34;   // extra padding so the red level badges clear the label (owner rule)
    const nS = catSkills.length;
    const sCell = pw / Math.max(4, nS);
    const sR = Math.min(30, sCell / 2 - 8);
    catSkills.forEach((id, i) => {
      const s = SKILL_DATA.find(x => x.id === id);
      const sx = px + (pw - nS * sCell) / 2 + i * sCell + sCell / 2;
      const locked = s.lvl > Hero.level;
      const sel = UI.sel.chSkill === id;
      ctx.globalAlpha = locked ? 0.4 : 1;
      ctx.fillStyle = '#16121d';
      ctx.beginPath(); ctx.arc(sx, y + sR, sR, 0, TAU); ctx.fill();
      const sfr = UI.circleFrame(ctx, sx, y + sR, sR);
      if (sel || !sfr) {
        ctx.strokeStyle = sel ? '#cfc8b8' : catDef.color;
        ctx.lineWidth = sel ? 3.5 : 1.5;
        ctx.beginPath(); ctx.arc(sx, y + sR, sR, 0, TAU); ctx.stroke();
      }
      drawSkillIcon(ctx, id, sx, y + sR, sR - 3);
      ctx.globalAlpha = 1;
      // Unlock-level badge on top so the art never clips it.
      if (locked) {
        ctx.fillStyle = 'rgba(10,7,14,0.9)';
        ctx.beginPath(); ctx.arc(sx, y - 1, 10, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e0402f'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(sx, y - 1, 10, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#ff6a5a'; ctx.font = 'bold 11px Cinzel, Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.lvl, sx, y - 0.5); ctx.textBaseline = 'alphabetic';
      }
      ctx.fillStyle = locked ? '#6f6552' : sel ? '#ffd76a' : '#b5ab94';
      ctx.font = (sel ? 'bold ' : '') + '9px Cinzel, Georgia'; ctx.textAlign = 'center';
      this.wrapLabel(ctx, s.name, sx, y + sR * 2 + 12, sCell - 4, 2, 9);
      // Selecting a locked skill is allowed (to READ it); ACCEPT stays disabled
      // until you reach the unlock level.
      UI.register(sx - sR - 2, y - 12, sR * 2 + 4, sR * 2 + 28, () => {
        UI.sel.chSkill = id;
        UI.sel.chRune = Hero.runes[id] || 'base';
      });
    });
    y += sR * 2 + 24;

    // ---- section 2: runes for the selected skill ----
    this.chooserLabel(ctx, px, pw, y, 'SKILL RUNES');
    y += 30;   // padding so the rune level badges clear the label (owner rule)
    const runes = (typeof SKILL_RUNES !== 'undefined' && SKILL_RUNES[UI.sel.chSkill]) || [];
    let runeBase = 0;
    for (let k = 0; k < UI.sel.chSkill.length; k++) runeBase += UI.sel.chSkill.charCodeAt(k) * (k + 1);
    const nR = runes.length;                 // base + 5
    const rCell = pw / nR;
    const rR = Math.min(24, rCell / 2 - 6);
    runes.forEach((rune, ri) => {
      const rx = px + ri * rCell + rCell / 2;
      const locked = rune.lvl && Hero.level < rune.lvl;
      const sel = UI.sel.chRune === rune.id;
      ctx.globalAlpha = locked ? 0.4 : 1;
      const rfr = UI.circleFrame(ctx, rx, y + rR, rR);
      if (ri === 0) {
        // "No Rune" — a plain empty socket.
        if (sel || !rfr) {
          ctx.strokeStyle = sel ? '#cfc8b8' : '#6b5f80'; ctx.lineWidth = sel ? 3 : 1.5;
          ctx.beginPath(); ctx.arc(rx, y + rR, rR - 2, 0, TAU); ctx.stroke();
        }
      } else {
        drawRuneStone(ctx, rx, y + rR, rR * 0.86, 0, runeBase + ri);
        if (sel) {
          ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(rx, y + rR, rR + 2, 0, TAU); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = locked ? '#6f6552' : sel ? '#6ff7c3' : '#b5ab94';
      ctx.font = (sel ? 'bold ' : '') + '8px Cinzel, Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      this.wrapLabel(ctx, ri === 0 ? 'No Rune' : rune.name, rx, y + rR * 2 + 10, rCell - 2, 2, 8);
      // Unlock-level badge drawn ON TOP (a dark chip) so the rune art never clips it.
      if (locked && rune.lvl) {
        const bx = rx, byy = y - 1;
        ctx.fillStyle = 'rgba(10,7,14,0.9)';
        ctx.beginPath(); ctx.arc(bx, byy, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#e0402f'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(bx, byy, 9, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#ff6a5a'; ctx.font = 'bold 10px Cinzel, Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(rune.lvl, bx, byy + 0.5);
        ctx.textBaseline = 'alphabetic';
      }
      // Selecting a locked rune is allowed (to READ it); it just won't apply
      // until you reach the level (Hero.rune() gates usage).
      UI.register(rx - rR - 1, y - 10, rR * 2 + 2, rR * 2 + 22, () => { UI.sel.chRune = rune.id; });
    });
    y += rR * 2 + 20;

    // ---- section 3: assigned skill preview ----
    this.chooserLabel(ctx, px, pw, y, 'ASSIGNED SKILL');
    y += 20;
    const chSkill = SKILL_DATA.find(x => x.id === UI.sel.chSkill);
    const chRune = runes.find(r => r.id === UI.sel.chRune) || runes[0];
    const cardH = 68;
    UI.panel(ctx, px + 16, y, pw - 32, cardH);
    drawSkillIcon(ctx, UI.sel.chSkill, px + 16 + 28, y + cardH / 2, 20);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px Cinzel, Georgia'; ctx.fillStyle = catDef.color;
    ctx.fillText(chSkill ? chSkill.name : '', px + 64, y + 16);
    // Element tag for the previewed skill+rune (a converting rune wins).
    const chElem = (RUNE_ELEMENT[UI.sel.chRune]) || (SKILL_ELEMENT[UI.sel.chSkill]) || 'physical';
    if (ELEMENTS[chElem]) {
      ctx.textAlign = 'right'; ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = ELEMENTS[chElem].color;
      ctx.fillText('◆ ' + ELEMENTS[chElem].name, px + pw - 28, y + 16);
      ctx.textAlign = 'left';
    }
    ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
    // Wrap the rune name + description onto up to THREE lines instead of clipping.
    wrapText(ctx, (chRune && chRune.id !== 'base' ? '◈ ' + chRune.name + ' — ' : '') +
      (chRune ? chRune.desc : ''), px + 64, y + 32, pw - 84, 13, 3);
    y += cardH + 12;

    // ---- accept / cancel ----
    const skillLocked = chSkill && chSkill.lvl > Hero.level;
    const bw = (pw - 44) / 2;
    UI.btnPlate3(ctx, px + 16, y, bw, 40, skillLocked ? 'LOCKED — LVL ' + chSkill.lvl : 'APPLY',
      skillLocked ? null : () => {
        const elective = typeof Settings !== 'undefined' && Settings.g && Settings.g.electiveMode;
        // Elective: write to the slot the chooser was opened from (any category).
        // Category-locked: write to the browsed category's own slot.
        const targetSlot = elective ? (UI.sel.chSlot != null ? UI.sel.chSlot : catIdx) : catIdx;
        if (elective) {
          for (let i = 0; i < 6; i++) if (i !== targetSlot && Hero.loadout[i] === UI.sel.chSkill) Hero.loadout[i] = null;
        }
        Hero.loadout[targetSlot] = UI.sel.chSkill;
        Hero.runes[UI.sel.chSkill] = UI.sel.chRune;
        Hero.sanitize();
        Hero.save();
        UI.toast(chSkill.name + (chRune && chRune.id !== 'base' ? ' · ' + chRune.name : '') + ' assigned', SKILL_CATS[cat].color);
        AudioSys.sfx('level');
        // Return to the skills screen still focused on the slot we just edited —
        // don't snap back to Primary (UI.open wipes UI.sel, so restore after).
        UI.open('skills');
        UI.sel.tab = 'actives';
        UI.sel.slotIdx = targetSlot;
      }, { size: 14, disabled: skillLocked, color: '#6ff7c3', border: '#3a7a6a' });
    UI.btnPlate3(ctx, px + 28 + bw, y, bw, 40, 'CANCEL', () => {
      const backSlot = UI.sel.chSlot != null ? UI.sel.chSlot : catIdx;
      UI.open('skills');
      UI.sel.tab = 'actives';
      UI.sel.slotIdx = backSlot;
    }, { size: 14, color: '#9a9080' });
  },

  // A centered section header with flanking rules (used by the chooser).
  chooserLabel(ctx, px, pw, y, text) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = '#8a7f6c';
    const cx = px + pw / 2;
    ctx.fillText(text, cx, y + 8);
    const tw = ctx.measureText(text).width;
    ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 20, y + 8); ctx.lineTo(cx - tw / 2 - 10, y + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + tw / 2 + 10, y + 8); ctx.lineTo(px + pw - 20, y + 8); ctx.stroke();
  },

  skillsPassives(ctx, W, H, px, pw) {
    // Extra top padding so the header clears the tab plates above (owner rule),
    // and the header is CENTERED.
    const sy = 132;
    const nSlots = Hero.passiveSlots();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText(`PASSIVE SLOTS (${nSlots} unlocked)`, px + pw / 2, sy - 16);
    const nPassiveSlots = PASSIVE_SLOT_LEVELS.length;
    const sw = pw / nPassiveSlots;
    for (let i = 0; i < nPassiveSlots; i++) {
      const bx = px + i * sw + sw / 2;
      const locked = i >= nSlots;
      const selected = UI.sel.slotIdx === i && !locked;
      const pcr = Math.min(UI.desktop ? 34 : 23, sw / 2 - 4);
      ctx.globalAlpha = locked ? 0.35 : 1;
      ctx.fillStyle = selected ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(bx, sy + 34, pcr, 0, TAU); ctx.fill();
      const pfr = UI.circleFrame(ctx, bx, sy + 34, pcr);
      if (selected || !pfr) {
        ctx.strokeStyle = selected ? '#cfc8b8' : '#3a3448';
        ctx.lineWidth = selected ? 3 : 2;
        ctx.beginPath(); ctx.arc(bx, sy + 34, pcr, 0, TAU); ctx.stroke();
      }
      const id = Hero.passives[i];
      ctx.textAlign = 'center';
      if (locked) {
        ctx.fillStyle = '#5c5569';
        ctx.font = '10px Cinzel, Georgia';
        ctx.fillText('lvl ' + PASSIVE_SLOT_LEVELS[i], bx, sy + 35);
      } else if (id) {
        const pd = PASSIVE_DATA.find(x => x.id === id);
        ctx.fillStyle = '#b06adf';
        ctx.font = 'bold 9px Cinzel, Georgia';
        const words = pd.name.split(' ');
        words.forEach((wd, wi) => ctx.fillText(wd, bx, sy + 28 + wi * 11));
      } else {
        ctx.fillStyle = '#3a3448';
        ctx.font = '20px Cinzel, Georgia';
        ctx.fillText('+', bx, sy + 35);
      }
      ctx.globalAlpha = 1;
      if (!locked) UI.register(bx - 25, sy + 9, 50, 52, () => { UI.sel.slotIdx = i; });
    }

    // The passives are a GRID of circle-framed medallions (v1.6.99 owner
    // rule — not a column): 5 columns on desktop, 4 on tablet, 3 on phones,
    // each passive in the painted round frame; name beneath, chosen ones
    // ringed in faded bone white.
    const gy = sy + 84;
    const listCols = UI.desktop ? 5 : (W >= 760 ? 4 : 3);
    const cellW = pw / listCols;
    const rowsN = Math.ceil(PASSIVE_DATA.length / listCols);
    const availH = Math.max(120, H - gy - 100);
    const cellH = Math.min(112, availH / rowsN);
    const gr = Math.min(30, cellW / 2 - 12, (cellH - 34) / 2);
    PASSIVE_DATA.forEach((s, i) => {
      const cx2 = px + (i % listCols) * cellW + cellW / 2;
      const cy2 = gy + Math.floor(i / listCols) * cellH + gr;
      const locked = s.lvl > Hero.level;
      const active = Hero.passives.includes(s.id);
      ctx.globalAlpha = locked ? 0.45 : 1;
      ctx.fillStyle = active ? '#2e2a3a' : '#16121d';
      ctx.beginPath(); ctx.arc(cx2, cy2, gr, 0, TAU); ctx.fill();
      const fr = UI.circleFrame(ctx, cx2, cy2, gr);
      if (active || !fr) {
        ctx.strokeStyle = active ? '#cfc8b8' : '#3a3448';
        ctx.lineWidth = active ? 3 : 1.5;
        ctx.beginPath(); ctx.arc(cx2, cy2, gr, 0, TAU); ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (locked) {
        ctx.fillStyle = '#8a8070'; ctx.font = 'bold 9px Cinzel, Georgia';
        ctx.fillText('lvl ' + s.lvl, cx2, cy2);
      } else if (active) {
        ctx.fillStyle = '#e8e2d0'; ctx.font = 'bold 12px Cinzel, Georgia';
        ctx.fillText('✔', cx2, cy2);
      }
      ctx.globalAlpha = locked ? 0.6 : 1;
      ctx.fillStyle = locked ? '#5c5569' : (active ? '#e8e2d0' : '#c9bfa8');
      ctx.font = '600 ' + (UI.desktop ? 11 : 9) + 'px Cinzel, Georgia';
      this.wrapLabel(ctx, s.name, cx2, cy2 + gr + 14, cellW - 10, 2, UI.desktop ? 12 : 10);
      ctx.globalAlpha = 1;
      UI.tip(cx2 - cellW / 2 + 2, cy2 - gr - 4, cellW - 4, gr * 2 + 30,
        s.name + (locked ? '  (lvl ' + s.lvl + ')' : ''), s.desc);
      if (!locked) UI.register(cx2 - cellW / 2 + 2, cy2 - gr - 4, cellW - 4, gr * 2 + 30, () => {
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
      });
    });
  },

  // ----------------------------------------------------------- artisans

  matsRow(ctx, x, y, w, center) {
    // Gold + the four forge reagents as PAINTED ICONS with counts
    // (owner rule v1.7.0 — no more written material names).
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const gs = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : n >= 1e4 ? (n / 1e3).toFixed(0) + 'k' : '' + n;
    let cx = x;
    if (center) {
      ctx.font = '600 12px Cinzel, Georgia';
      let tot = ctx.measureText(gs(Hero.gold) + 'g').width + 16;
      ctx.font = '600 11px Cinzel, Georgia';
      for (const key of ['parts', 'dust', 'crystal', 'soul'])
        tot += 20 + ctx.measureText(gs(Hero.mats[key] || 0)).width + 16;
      cx = x + Math.max(0, (w - tot) / 2);
    }
    ctx.font = '600 12px Cinzel, Georgia';
    ctx.fillStyle = '#ffd76a';
    const gTxt = gs(Hero.gold) + 'g';
    ctx.fillText(gTxt, cx, y); cx += ctx.measureText(gTxt).width + 16;
    ctx.font = '600 11px Cinzel, Georgia';
    for (const key of ['parts', 'dust', 'crystal', 'soul']) {
      drawMatIcon(ctx, key, cx + 9, y - 4, 18);
      const t = gs(Hero.mats[key] || 0);
      ctx.fillStyle = MATERIALS[key].color;
      ctx.fillText(t, cx + 20, y);
      cx += 20 + ctx.measureText(t).width + 16;
    }
  },


  // BLACKSMITH — art-first hub with four benches (owner rule).
  smith(ctx, W, H) {
    this.artisanHub(ctx, W, H, 'smith', 'THARN THE SMITHY',
      '"The forge is hot. What do you need?"', [
        ['⚒  SALVAGE', 'Break gear down into crafting materials', 'smithSalvage', '#ffb43a'],
        ['⚔  CRAFT WEAPON', 'Forge scythes and phylacteries', 'smithWeapon', '#e0724a'],
        ['🛡  CRAFT ARMOR', 'Forge armor, boots, rings and amulets', 'smithArmor', '#8fb0e8'],
        ['🔥  CRAFT TORCHES', 'Recipe-built lights against the dark', 'torches', '#ffb24a'],
        ['🛠  REPAIR', 'Mend battle-worn gear for gold', 'smithRepair', '#4ade80']
      ], { k: 'smith', label: 'FORGE' });
  },

  smithSalvage(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'smith');
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const hiRows = (Hero.artifactsFound > 0) + (Hero.relicsFound > 0) + (Hero.ancientsFound > 0) + (Hero.mythicsFound > 0);
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 330 + Math.ceil(hiRows / 2) * 54), 'SALVAGE');
    // Reagents CENTERED and dropped clear of the title bar (owner rule).
    this.matsRow(ctx, px + 16, 112, pw - 32, true);
    ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    this.wrapCentered(ctx, 'Bulk-melt everything of a rarity in your bag. Gems survive the forge.', px + pw / 2, 140, pw - 44, 14, 2);
    // SIMPLE plates (owner rule v1.7.17); the beyond-legendary rows only
    // appear once the character has FOUND one of that rarity.
    const q = (pw - 32 - 3 * 8) / 2;
    const epicLvl = Items.BULK_SALVAGE_SMITH.epic, legLvl = Items.BULK_SALVAGE_SMITH.legendary;
    const epicOk = Hero.artisans.smith >= epicLvl, legOk = Hero.artisans.smith >= legLvl;
    const btns = [
      ['COMMON', () => Items.salvageJunk(), '#ffb43a', true],
      ['RARES', () => Items.salvageRares(), '#ffd76a', true],
      [epicOk ? 'EPICS' : 'EPICS  (smith ' + epicLvl + ')', () => Items.salvageEpics(), epicOk ? '#b06adf' : '#6f5a7a', epicOk],
      [legOk ? 'LEGENDARIES' : 'LEGENDARIES  (smith ' + legLvl + ')', () => Items.salvageLegendaries(), legOk ? '#ff8c2a' : '#7a5f45', legOk]
    ];
    if (Hero.artifactsFound > 0) btns.push(['ARTIFACTS', () => Items.salvageHighTier(6, 'Artifact'), legOk ? '#ff5a4a' : '#7a4a45', legOk]);
    if (Hero.relicsFound > 0) btns.push(['RELICS', () => Items.salvageHighTier(7, 'Relic'), legOk ? '#3b8cff' : '#3a5a7a', legOk]);
    if (Hero.ancientsFound > 0) btns.push(['ANCIENTS', () => Items.salvageHighTier(8, 'Ancient'), legOk ? '#2fd4c0' : '#2a6a62', legOk]);
    if (Hero.mythicsFound > 0) btns.push(['MYTHICS', () => Items.salvageHighTier(9, 'Mythic'), legOk ? '#ffcf3b' : '#8a7a3a', legOk]);
    btns.forEach((b, i) => {
      const col = i % 2, rowI = Math.floor(i / 2);
      UI.btnPlate2(ctx, px + 16 + col * (q + 8), 182 + rowI * 54, q, 44, b[0], b[1],
        { size: 12, color: b[2], disabled: !b[3] });
    });
  },

  // REPAIR (owner spec v1.6.84, D3-style): every damaged piece — worn or
  // bagged — listed with its aaa/bbb durability and gold price; broken gear
  // glows red. REPAIR ALL sits on a plate at the top.
  smithRepair(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'smith');
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 430);
    UI.panel(ctx, px, 46, pw, ph, 'REPAIR');
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' g', px + pw - 16, 92);
    const list = Items.damagedGear();
    const total = Items.repairAllCost();
    UI.btnPlate(ctx, px + 16, 104, pw - 32, 34,
      total > 0 ? 'REPAIR ALL  (' + total + 'g)' : 'NOTHING NEEDS REPAIR',
      total > 0 ? () => Items.repairAll() : null,
      { size: 13, disabled: total <= 0 });
    // Scrolling rows.
    const listTop = 152, viewBot = 46 + ph - 14, viewH = Math.max(40, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px, y: listTop - 4, w: pw, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(px, listTop - 4, pw, viewH + 8); ctx.clip();
    let c = listTop;
    for (const it of list) {
      const yy = c - scrollY;
      if (yy + 40 > listTop && yy < viewBot) {
        const broken = it.dur <= 0;
        ctx.fillStyle = broken ? 'rgba(60,20,26,0.92)' : 'rgba(28,24,38,0.92)';
        rr(ctx, px + 12, yy, pw - 24, 36, 6); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
        ctx.fillText(this.fitText(ctx, it.name, pw - 220), px + 22, yy + 12);
        ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = broken ? '#e04a5a' : '#9a9080';
        ctx.fillText((broken ? 'BROKEN — ' : '') + 'Durability ' + it.dur + '/' + it.durMax, px + 22, yy + 26);
        const cost = Items.repairCost(it);
        UI.chip(ctx, px + pw - 118, yy + 5, 100, 26, cost + 'g',
          Hero.gold >= cost ? () => Items.repairItem(it) : null,
          { size: 11, disabled: Hero.gold < cost, color: '#a8d9be' });
      }
      c += 42;
    }
    if (!list.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Every buckle shines. Come back after a real fight.', px + pw / 2, listTop + 30);
    }
    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
  },

  // The shared craft bench body — quality toggle + a CENTERED slot grid on
  // simple plates. Tapping a slot shows its REAGENTS and a "Craft?" plate
  // (owner rules v1.7.2 — no more instant crafting, no cost under the toggles).
  smithCraft(ctx, W, H, title, slots) {
    this.shopBackdrop(ctx, W, H, 'smith');
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const cols = pw >= 480 ? 4 : 3;
    const rows = Math.ceil(slots.length / cols);
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 320 + rows * 44), title);
    if (UI.sel.master === undefined) UI.sel.master = false;
    const half = (pw - 40) / 2;
    UI.btnPlate2(ctx, px + 16, 92, half, 42, '', () => { UI.sel.master = false; });
    UI.btnPlate2(ctx, px + 24 + half, 92, half, 42, '', () => { UI.sel.master = true; });
    ctx.textAlign = 'center'; ctx.font = '600 12px Cinzel, Georgia';
    ctx.fillStyle = !UI.sel.master ? '#f0dcae' : '#8a8070'; ctx.fillText('STANDARD', px + 16 + half / 2, 113);
    ctx.fillStyle = UI.sel.master ? '#ffd76a' : '#8a8070'; ctx.fillText('MASTERWORK', px + 24 + half * 1.5, 113);
    const cost = Items.craftCost(UI.sel.master);
    const afford = Items.canAfford(cost);
    const [flo, fhi] = Items.smithRange();
    ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#ffb43a';
    ctx.fillText('Forges level ' + flo + '–' + fhi, px + pw / 2, 150);
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = !UI.sel.master ? '#cfc8b8' : '#8a8070';
    ctx.fillText(this.fitText(ctx, 'Standard: Crafts a random common, uncommon, or magic item', pw - 40), px + pw / 2, 167);
    ctx.fillStyle = UI.sel.master ? '#ffd76a' : '#8a8070';
    ctx.fillText(this.fitText(ctx, 'Masterwork: Crafts a rare, epic, or legendary item', pw - 40), px + pw / 2, 183);
    // The slot grid — each row CENTERED; tapping SELECTS the slot.
    const bw = Math.min(150, (pw - 32 - (cols - 1) * 8) / cols);
    slots.forEach((slot, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, slots.length - row * cols);
      const rowW = inRow * bw + (inRow - 1) * 8;
      const bx = px + pw / 2 - rowW / 2 + (i % cols) * (bw + 8);
      const by = 200 + row * 44;
      const on = UI.sel.craftSlot === slot;
      UI.btnPlate2(ctx, bx, by, bw, 34, ITEM_SLOTS[slot].label,
        () => { UI.sel.craftSlot = on ? null : slot; },
        { size: 11, color: on ? '#f0dcae' : '#8a8070' });
    });
    // ---- The chosen slot's reagents + a centered "Craft?" plate ----
    if (UI.sel.craftSlot && !slots.includes(UI.sel.craftSlot)) UI.sel.craftSlot = null;
    if (UI.sel.craftSlot) {
      let ry = 200 + rows * 44 + 18;
      // Cost tokens: gold (bright) + material icons with counts, centered.
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const toks = [];
      ctx.font = '600 12px Cinzel, Georgia';
      toks.push({ txt: (cost.gold || 0) + 'g', color: '#ffd76a', icon: null, w: ctx.measureText((cost.gold || 0) + 'g').width + 14 });
      ctx.font = '600 11px Cinzel, Georgia';
      for (const mk of ['parts', 'dust', 'crystal', 'soul']) {
        if (!cost[mk]) continue;
        toks.push({ txt: String(cost[mk]), color: MATERIALS[mk].color, icon: mk,
          w: 20 + ctx.measureText(String(cost[mk])).width + 14 });
      }
      let tx = px + pw / 2 - toks.reduce((a2, t2) => a2 + t2.w, 0) / 2;
      for (const t2 of toks) {
        if (t2.icon) { drawMatIcon(ctx, t2.icon, tx + 9, ry - 4, 18); ctx.fillStyle = t2.color; ctx.font = '600 11px Cinzel, Georgia'; ctx.fillText(t2.txt, tx + 20, ry); }
        else { ctx.fillStyle = t2.color; ctx.font = '600 12px Cinzel, Georgia'; ctx.fillText(t2.txt, tx, ry); }
        tx += t2.w;
      }
      ry += 14;
      UI.btnPlate2(ctx, px + pw / 2 - 90, ry, 180, 36, 'CRAFT?',
        afford ? () => Items.craft(UI.sel.craftSlot, UI.sel.master) : null,
        { size: 13, disabled: !afford });
    }
  },

  smithWeapon(ctx, W, H) { this.smithCraft(ctx, W, H, 'CRAFT WEAPONS', ['weapon', 'offhand']); },
  smithArmor(ctx, W, H) {
    this.smithCraft(ctx, W, H, 'CRAFT ARMOR & JEWELRY',
      ['helm', 'shoulders', 'chest', 'gloves', 'legs', 'boots', 'amulet', 'ring1']);
  },

  // The torch-crafting bench. Torches light the darkness for a limited time,
  // then burn out. All three are recipe-built from smashed-scenery reagents
  // and go straight to the Stash for safe keeping.
  torches(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'smith');
    // Wider + roomier (owner rule v1.7.0).
    const pw = Math.min(640, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 500);
    UI.panel(ctx, px, 46, pw, ph, 'TORCH BENCH');

    let ty = 100;
    // ---- REAGENTS — its own collapsible drawer, closed by default ----
    const open = !!UI.sel.torchReag;
    UI.btnPlate2(ctx, px + 20, ty, pw - 40, 26, (open ? '▾  ' : '▸  ') + 'REAGENTS',
      () => { UI.sel.torchReag = !open; }, { size: 11 });
    ty += 36;
    if (open) {
      ty += 10;   // top padding so the tokens clear the REAGENTS plate (owner fix)
      // Centered reagent tokens (owner rule v1.7.2).
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '600 11px Cinzel, Georgia';
      const reagents = ['lumber', 'rivets', 'heartstring', 'wyrmscale', 'brain', 'rathmasoul'].filter(k => (Hero.mats[k] || 0) > 0);
      if (!reagents.length) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6f6552';
        ctx.fillText('No torch reagents yet — smash scenery in the wilds.', px + pw / 2, ty);
        ctx.textAlign = 'left';
        ty += 20;
      }
      // Lay tokens into centered lines.
      let line = [], lw2 = 0;
      const flush = () => {
        let tx = px + pw / 2 - (lw2 - 18) / 2;
        for (const tk of line) { ctx.fillStyle = tk.c; ctx.fillText(tk.t, tx, ty); tx += tk.w + 18; }
        ty += 17; line = []; lw2 = 0;
      };
      for (const k2 of reagents) {
        const txt = (Hero.mats[k2] || 0) + ' ' + MATERIALS[k2].name;
        const w2 = ctx.measureText(txt).width;
        if (lw2 && lw2 + w2 + 18 > pw - 48) flush();
        line.push({ t: txt, c: MATERIALS[k2].color, w: w2 }); lw2 += w2 + 18;
      }
      if (line.length) flush();
      ty += reagents.length ? 7 : 0;
    }

    // ---- The lit torch, with its live countdown ----
    const eq = Hero.equipped.torch;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 11px Cinzel, Georgia';
    if (eq && eq.burnT !== undefined) {
      const mins = Math.floor(eq.burnT / 60), secs = Math.floor(eq.burnT % 60);
      ctx.fillStyle = '#e8e2d0';
      ctx.fillText('Lit: ' + eq.name + '  —  ' + mins + ':' + String(secs).padStart(2, '0') + ' left', px + 24, ty);
    } else {
      ctx.fillStyle = '#6f6552';
      ctx.fillText('No torch lit — darkness closes in.', px + 24, ty);
    }
    ty += 14;

    // ---- Craft rows — SIMPLE plates, spaced out, no rarity tags ----
    const panelBot = 46 + ph;
    const footTop = panelBot - 46;
    const listTop = ty + 8;
    const listBot = footTop - 4;
    const viewH = Math.max(60, listBot - listTop);
    const order = Object.keys(TORCH_TYPES).filter(t => Items.canCraftTorch(t));
    if (!order.length) {
      ctx.textAlign = 'left'; ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Gather reagents to forge a torch.', px + 24, listTop + 14);
    }
    const rowH = 82;
    const scrollMax = Math.max(0, order.length * rowH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = { x: px + 14, y: listTop, w: pw - 28, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 14, listTop, pw - 28, viewH); ctx.clip();
    order.forEach((type, i) => {
      const y = listTop + i * rowH - scrollY;
      if (y + rowH - 12 < listTop || y > listBot) return;
      const T = TORCH_TYPES[type];
      const can = Items.canCraftTorch(type);
      // The simple plate carries each torch (owner rule).
      if (!UI.btnPlate2(ctx, px + 20, y, pw - 40, rowH - 14, '', null)) {
        ctx.fillStyle = 'rgba(28,24,38,0.92)';
        rr(ctx, px + 20, y, pw - 40, rowH - 14, 8); ctx.fill();
      }
      // Painted torch (owner art v1.7.38) in the left gutter of the plate.
      const timg = Game.torchImg && Game.torchImg(type);
      if (timg) {
        const th = rowH - 22, tw = th * (timg.width / timg.height);
        ctx.drawImage(timg, px + 44 - tw / 2, y + 4, tw, th);
      }
      // Name (no rarity tag — owner rule), spaced in from the finial cap.
      // Bone-white names, brighter burn line, no radius text (owner rules).
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '600 13px Cinzel, Georgia';
      ctx.fillStyle = '#e8e2d0';
      ctx.fillText(T.name, px + 72, y + 22);
      ctx.font = '10px Cinzel, Georgia';
      ctx.fillStyle = '#c9bfa8';
      ctx.fillText('Burns ' + T.minutes + ' min', px + 72, y + 39);
      // Recipe (owned / needed per component).
      const shortMat = { lumber: 'Lumber', rivets: 'Rivets', heartstring: 'Heart', wyrmscale: 'Wyrm', brain: 'Brain', rathmasoul: 'Bellmahath' };
      ctx.font = (pw < 480 ? 10 : 11) + 'px Cinzel, Georgia';
      let rx = px + 72;
      const recipeRight = px + pw - 160;
      for (const [k2, n] of Object.entries(T.recipe)) {
        const have = Hero.mats[k2] || 0;
        const label = have + '/' + n + ' ' + (shortMat[k2] || MATERIALS[k2].name);
        if (rx + ctx.measureText(label).width > recipeRight) break;
        ctx.fillStyle = have >= n ? MATERIALS[k2].color : '#a05a5a';
        ctx.fillText(label, rx, y + 56);
        rx += ctx.measureText(label).width + 14;
      }
      // Craft chip — inside the plate, clear of the finial and the text.
      UI.chip(ctx, px + pw - 152, y + 20, 100, rowH - 46, can ? 'CRAFT' : 'NEED MATS',
        can ? () => Items.craftTorch(type) : null,
        { size: 11, disabled: !can, color: can ? '#e8e2d0' : '#5c5569' });
    });
    ctx.restore();
    if (scrollMax > 0) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, listTop + 2);
      if (scrollY < scrollMax - 1) ctx.fillText('▼ drag for more ▼', px + pw / 2, listBot - 1);
    }

    UI.btnPlate3(ctx, px + 20, footTop + 12, pw - 40, 26, 'BACK TO FORGE', () => UI.open('smith'),
      { size: 11 });
  },

  // JEWELER — art-first hub with five gem benches (owner rule).
  jeweler(ctx, W, H) {
    this.artisanHub(ctx, W, H, 'jeweler', 'ORREN THE JEWELER',
      '"Every stone has a soul. Let me show you."', [
        ['◆  SOCKET A GEM', 'Set a gem into an empty socket', 'jewSocket', '#4ecbe0'],
        ['◇  UNSOCKET A GEM', 'Pull gems back out — always free', 'jewUnsocket', '#b06adf'],
        ['⬘  MERGE GEMS', 'Combine 3 matching gems into a finer one', 'jewMerge', '#4ade80'],
        ['⬖  SELL GEMS', 'Trade gems for gold', 'jewSell', '#ffd76a'],
        ['✧  CRAFT A GEM', 'Cut a brand-new gem of your chosen type', 'jewCraft', '#c88bf0']
      ], { k: 'jeweler', label: 'GEMCRAFT' });
  },

  // Shared gem-stack list with TYPE FILTER chips + tier sort. Returns the keys
  // in display order and lays down list scroll + rows; `onRow` draws the right
  // side of each row. Used by MERGE and SELL.
  gemStackList(ctx, W, H, px, pw, top, panelBot, detailNeed, onSelect) {
    // Filter chips (All + 5 types) and a sort-direction toggle.
    const types = Object.keys(GEM_TYPES);
    // The chip row is CENTERED in the wider panel (owner rule).
    const sortW = 62, gap = 6;
    const chipW = Math.min(84, (pw - 48 - sortW - gap * (types.length + 1)) / (types.length + 1));
    const rowW = (types.length + 1) * (chipW + gap) + sortW;
    let cxr = px + (pw - rowW) / 2;
    UI.btnPlate2(ctx, cxr, top, chipW, 24, 'All', () => { UI.sel.gemFilter = null; UI.sel.gemKey = null; },
      { size: 9, color: !UI.sel.gemFilter ? '#f0dcae' : '#8a8070' });
    cxr += chipW + gap;
    types.forEach(t => {
      const on = UI.sel.gemFilter === t;
      UI.btnPlate2(ctx, cxr, top, chipW, 24, GEM_TYPES[t].name.slice(0, 4),
        () => { UI.sel.gemFilter = on ? null : t; UI.sel.gemKey = null; },
        { size: 9, color: on ? GEM_TYPES[t].color : '#8a8070' });
      cxr += chipW + gap;
    });
    UI.btnPlate2(ctx, cxr, top, sortW, 24, UI.sel.gemSortAsc ? '▲ tier' : '▼ tier',
      () => { UI.sel.gemSortAsc = !UI.sel.gemSortAsc; }, { size: 9 });

    const groups = {};
    for (const g of Hero.gems) {
      if (UI.sel.gemFilter && g.type !== UI.sel.gemFilter) continue;
      const key = g.type + ':' + g.tier;
      groups[key] = (groups[key] || 0) + 1;
    }
    const keys = Object.keys(groups).sort((a, b) => {
      const [ta, tia] = a.split(':'); const [tb, tib] = b.split(':');
      if (ta !== tb) return ta < tb ? -1 : 1;
      return UI.sel.gemSortAsc ? (+tia) - (+tib) : (+tib) - (+tia);
    });
    const listTop = top + 32;
    if (!keys.length) {
      ctx.textAlign = 'left'; ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#544d44';
      ctx.fillText(Hero.gems.length ? 'No gems match this filter.' : 'No gems in your pouch yet.', px + 16, listTop + 16);
      return { groups, listBot: listTop };
    }
    const rowH = 40;
    const listBot = panelBot - 12 - detailNeed;
    const viewH = Math.max(rowH, listBot - listTop);
    const scrollMax = Math.max(0, keys.length * rowH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = { x: px + 14, y: listTop, w: pw - 28, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 14, listTop, pw - 28, viewH); ctx.clip();
    // Centered, narrower SIMPLE plates: the gem ICON stands in for its name;
    // text is plain bone white (owner rules v1.7.2).
    const rw2 = Math.min(340, pw * 0.66);
    const rx2 = px + pw / 2 - rw2 / 2;
    keys.forEach((key, i) => {
      const ry = listTop + i * rowH - scrollY;
      if (ry + rowH - 6 < listTop || ry > listBot) return;
      const [type, tierS] = key.split(':');
      const tier = +tierS, n = groups[key];
      const selected = UI.sel.gemKey === key;
      UI.btnPlate2(ctx, rx2, ry, rw2, rowH - 6, '', () => onSelect(key, selected));
      drawGemIcon(ctx, type, tier, rx2 + 34, ry + rowH / 2 - 3, 11);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = selected ? '#f0dcae' : '#e8e2d0';
      ctx.fillText(GEM_TIERS[tier] + '  ×' + n, rx2 + rw2 / 2 + 8, ry + rowH / 2 - 3);
    });
    ctx.restore();
    if (scrollMax > 0) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, listTop + 3);
      if (scrollY < scrollMax - 1) ctx.fillText('▼ drag ▼', px + pw / 2, listBot - 1);
    }
    return { groups, listBot };
  },

  jewMerge(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'jeweler');
    const pw = Math.min(620, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 470);
    UI.panel(ctx, px, 46, pw, ph, 'MERGE GEMS');
    const sel = UI.sel.gemKey;
    const detailNeed = sel ? 116 : 0;
    const { groups, listBot } = this.gemStackList(ctx, W, H, px, pw, 88, 46 + ph, detailNeed,
      (key, selected) => { UI.sel.gemKey = selected ? null : key; });
    if (sel && groups[sel]) {
      const [type, tierS] = sel.split(':');
      const tier = +tierS, n = groups[sel], gm = GEM_TYPES[type];
      const canCombine = n >= 3 && tier < GEM_TIERS.length - 1;
      const cost = 500 * (tier + 1);
      let y = listBot + 8;
      ctx.textAlign = 'left'; ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
      ctx.fillText(this.fitText(ctx, 'Now: ' + gemStatText({ type, tier }), pw - 40), px + 20, y + 8);
      ctx.fillStyle = tier < GEM_MAX_TIER ? '#4ade80' : '#8a8070';
      ctx.fillText(this.fitText(ctx, tier < GEM_MAX_TIER ? 'Next: ' + gemStatText({ type, tier: tier + 1 }) : 'Already Marquise — the top tier.', pw - 40), px + 20, y + 26);
      y += 40;
      const halfW = Math.min(210, (pw - 60) / 2);
      const bx0 = px + pw / 2 - halfW - 6;
      UI.btnPlate2(ctx, bx0, y, halfW, 36,
        tier >= GEM_TIERS.length - 1 ? 'MAX TIER' : n < 3 ? `NEED 3 (have ${n})` : `COMBINE 3→1  (${cost}g)`,
        canCombine ? () => { Items.combineGems(type, tier); if ((groups[sel] || 0) <= 3) UI.sel.gemKey = null; } : null,
        { size: 11, disabled: !canCombine, color: '#e8e2d0' });
      UI.btnPlate2(ctx, px + pw / 2 + 6, y, halfW, 36, 'COMBINE ALL',
        canCombine && n >= 6 ? () => { Items.combineAllGems(type, tier); UI.sel.gemKey = null; } : null,
        { size: 11, disabled: !(canCombine && n >= 6), color: '#e8e2d0' });
    }
  },

  jewSell(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'jeweler');
    const pw = Math.min(620, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 470);
    UI.panel(ctx, px, 46, pw, ph, 'SELL GEMS');
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold.toLocaleString() + ' g', px + pw - 60, 80);   // clear of the title-bar ✕
    const sel = UI.sel.gemKey;
    const detailNeed = sel ? 64 : 0;
    const { groups, listBot } = this.gemStackList(ctx, W, H, px, pw, 88, 46 + ph, detailNeed,
      (key, selected) => { UI.sel.gemKey = selected ? null : key; });
    if (sel && groups[sel]) {
      const [type, tierS] = sel.split(':');
      const tier = +tierS, n = groups[sel];
      const sell1 = Items.gemSellValue(tier);
      const y = listBot + 10;
      const halfW = Math.min(210, (pw - 60) / 2);
      UI.btnPlate2(ctx, px + pw / 2 - halfW - 6, y, halfW, 36, `SELL 1  (${sell1}g)`,
        () => { Items.sellGem(type, tier, false); if ((groups[sel] || 0) <= 1) UI.sel.gemKey = null; },
        { size: 11, color: '#e8e2d0' });
      UI.btnPlate2(ctx, px + pw / 2 + 6, y, halfW, 36, `SELL ALL ×${n}  (${(sell1 * n).toLocaleString()}g)`,
        () => { Items.sellGem(type, tier, true); UI.sel.gemKey = null; },
        { size: 11, color: '#e8e2d0' });
    }
  },

  jewCraft(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'jeweler');
    // Wider + roomier; everything centered in Cinzel bone white (owner rules).
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 490), 'CRAFT A GEM');
    const spec = Items.gemCraftSpec();
    const cost = Items.gemCraftCost();
    const afford = Items.canAfford(cost);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    let y = this.wrapCentered(ctx, '"Choose a stone and Orren cuts it fresh. The finer my training, the finer the cut."',
      px + pw / 2, 104, pw - 56, 15, 3);
    ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
    y = this.wrapCentered(ctx, 'Jeweler level ' + (Hero.artisans.jeweler || 1) + ' cuts ' + GEM_TIERS[spec.tier].toUpperCase() + ' gems',
      px + pw / 2, y + 10, pw - 56, 14, 2);
    ctx.font = '600 12px Cinzel, Georgia'; ctx.fillStyle = afford ? '#cfc8b8' : '#a05a5a';
    y = this.wrapCentered(ctx, 'Cost: ' + this.costLabel(cost) + '  ·  you have ' + Hero.gold.toLocaleString() + 'g',
      px + pw / 2, y + 6, pw - 56, 14, 2);
    y += 10;
    // Taller gem rows, all text centered; stat line in faded bone white.
    for (const t of Object.keys(GEM_TYPES)) {
      const gm = GEM_TYPES[t];
      UI.btnPlate2(ctx, px + 16, y, pw - 32, 52, '', afford ? () => Items.craftGem(t) : null,
        { disabled: !afford });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 13px Cinzel, Georgia'; ctx.fillStyle = gm.color;
      ctx.fillText(gm.name, px + pw / 2, y + 18);
      ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
      ctx.fillText(this.fitText(ctx, gemStatText({ type: t, tier: spec.tier }).replace(/\s*\/\s*/, ' · '), pw - 130), px + pw / 2, y + 36);
      y += 58;
    }
  },

  jewSocket(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'jeweler');
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 470);
    UI.panel(ctx, px, 46, pw, ph, 'SOCKET A GEM');
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
    this.wrapCentered(ctx, 'Gear with sockets (equipped ◈ and bagged). Tap one to choose its gem.', px + pw / 2, 100, pw - 44, 14, 2);
    const rows = [];
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && (it.sockets || 0) > 0) rows.push({ it, equipped: true });
    }
    for (const it of Hero.bag) if (it && !it.torch && (it.sockets || 0) > 0) rows.push({ it, equipped: false });
    if (!rows.length) {
      ctx.textAlign = 'center'; ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#544d44';
      this.wrapCentered(ctx, 'No socketed gear yet — sockets roll on drops, or the Mystic can add one.', px + pw / 2, 132, pw - 44, 15, 2);
    }
    const rowH = 44, listTop = 134, listBot = 46 + ph - 14;
    const viewH = Math.max(rowH, listBot - listTop);
    const scrollMax = Math.max(0, rows.length * rowH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = UI.sel.gemPick ? null : { x: px + 14, y: listTop, w: pw - 28, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 14, listTop, pw - 28, viewH); ctx.clip();
    rows.forEach(({ it, equipped }, i) => {
      const ry = listTop + i * rowH - scrollY;
      if (ry + rowH - 6 < listTop || ry > listBot) return;
      const free = (it.sockets || 0) - (it.gems || []).length;
      UI.btn(ctx, px + 16, ry, pw - 32, rowH - 6, '', () => {
        UI.sel.gemTarget = it; UI.sel.gemPick = true; UI.sel.gemKey = undefined;
      }, { border: RARITIES[it.rarity].color });
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
      ctx.fillText(this.fitText(ctx, it.name, pw - 190), px + 28, ry + 13);
      ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText((equipped ? 'EQUIPPED · ' : 'in bag · ') + ITEM_SLOTS[it.slot].label, px + 28, ry + 28);
      ctx.textAlign = 'right'; ctx.font = 'bold 11px Cinzel, Georgia';
      ctx.fillStyle = free > 0 ? '#6ff7c3' : '#8a8070';
      ctx.fillText(free > 0 ? free + ' empty ◇' : 'full', px + pw - 28, ry + rowH / 2 - 3);
    });
    ctx.restore();
    if (scrollMax > 0 && !UI.sel.gemPick) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (scrollY < scrollMax - 1) ctx.fillText('▼ drag ▼', px + pw / 2, listBot - 1);
    }
    // The proven gem-choosing popup does the actual socketing.
    if (UI.sel.gemPick) this.gemModal(ctx, W, H);
  },

  jewUnsocket(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'jeweler');
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, 470);
    UI.panel(ctx, px, 46, pw, ph, 'UNSOCKET');
    const rows = [];
    for (const slot of Object.keys(ITEM_SLOTS)) {
      const it = Hero.equipped[slot];
      if (it && it.gems) it.gems.forEach((g, gi) => rows.push({ it, gi, g, equipped: true }));
    }
    for (const it of Hero.bag) if (it && it.gems) it.gems.forEach((g, gi) => rows.push({ it, gi, g, equipped: false }));
    if (!rows.length) {
      ctx.textAlign = 'center'; ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#544d44';
      ctx.fillText('Nothing is socketed right now.', px + pw / 2, 110);
      return;
    }
    const rowH = 40, listTop = 88, listBot = 46 + ph - 14;
    const viewH = Math.max(rowH, listBot - listTop);
    const scrollMax = Math.max(0, rows.length * rowH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = { x: px + 14, y: listTop, w: pw - 28, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 14, listTop, pw - 28, viewH); ctx.clip();
    rows.forEach(({ it, gi, g, equipped }, i) => {
      const ry = listTop + i * rowH - scrollY;
      if (ry + rowH - 6 < listTop || ry > listBot) return;
      const gm = GEM_TYPES[g.type];
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, ry, pw - 32, rowH - 6, 5); ctx.fill();
      drawGemIcon(ctx, g.type, g.tier, px + 32, ry + rowH / 2 - 3, 10);
      // Just the ITEM the gem sits in — the icon already says which gem
      // (owner rule: the "Gem Name in" prefix was redundant).
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
      ctx.fillText(this.fitText(ctx, it.name + (equipped ? '' : '  (bag)'), pw - 200), px + 46, ry + rowH / 2 - 3);
      UI.btn(ctx, px + pw - 128, ry + 4, 112, rowH - 14, 'UNSOCKET', () => Items.unsocket(it, gi),
        { size: 10, border: '#7a4a8f', color: '#b06adf' });
    });
    ctx.restore();
    if (scrollMax > 0) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      if (scrollY < scrollMax - 1) ctx.fillText('▼ drag ▼', px + pw / 2, listBot - 1);
    }
  },

  // Artisan level + train row shared by the three shops.
  // The artisan's training line — CENTERED (owner rule v1.7.27), with the
  // TRAIN plate centered beneath it. Returns the y below the block.
  artisanRow(ctx, px, pw, y, which, label) {
    const lvl = Hero.artisans[which];
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(label + '  ·  LEVEL ' + lvl + ' / 10' + (lvl >= 10 ? '  (MAX)' : ''), px + pw / 2, y + 8);
    if (lvl < 10) {
      const cost = Items.trainCost(which);
      const bw = 168;
      UI.btnPlate(ctx, px + pw / 2 - bw / 2, y + 16, bw, 26, `TRAIN  (${cost}g)`,
        Hero.gold >= cost ? () => Items.train(which) : null,
        { size: 10, disabled: Hero.gold < cost });
      return y + 48;
    }
    return y + 20;
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

  // MYSTIC — art-first hub: enchanting plus the cosmetic wardrobe (owner rule).
  mystic(ctx, W, H) {
    this.artisanHub(ctx, W, H, 'mystic', 'VESSA THE ENCHANTRESS',
      '"The threads of fate can always be rewoven."', [
        ['✦  ENCHANT GEAR', 'Reroll a chosen property on an item', 'mysEnchant', '#b06adf'],
        ['🐾  PETS', 'Choose a companion to walk beside you', 'mysPet', '#6ff7c3'],
        ['🪽  WINGS', 'Choose the wings your Nekromancer wears', 'mysWings', '#e8e0cc'],
        ['🎨  THEMES', 'Re-tint the game\'s menus and buttons', 'mysTheme', '#ffd76a']
      ], { k: 'mystic', label: 'ENCHANTING' });
  },

  // A simple cosmetic chooser grid shared by pets/wings/themes.
  cosmeticList(ctx, W, H, title, entries, current, onPick, noneLabel) {
    this.shopBackdrop(ctx, W, H, 'mystic');
    const pw = Math.min(480, W - 20);
    const px = W / 2 - pw / 2;
    const rows = entries.length + (noneLabel ? 1 : 0);
    UI.panel(ctx, px, 46, pw, Math.min(H - 56, 108 + rows * 52), title);
    let y = 92;
    const row = (label, desc, id, color) => {
      const on = current === id;
      UI.btnPlate2(ctx, px + 16, y, pw - 32, 44, '', () => onPick(id));
      // Centered (owner rule v1.7.0).
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = color || '#e8e0cc';
      ctx.fillText((on ? '✔  ' : '') + label, px + pw / 2, y + 15);
      ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      ctx.fillText(this.fitText(ctx, desc, pw - 120), px + pw / 2, y + 31);
      y += 52;
    };
    if (noneLabel) row(noneLabel, 'Plain and unadorned.', null, '#9a9080');
    for (const [id, e, color] of entries) row(e.name, e.desc || '', id, color);
  },

  mysPet(ctx, W, H) {
    this.cosmeticList(ctx, W, H, 'CHOOSE A PET',
      Object.entries(PETS).map(([id, e]) => [id, e, '#6ff7c3']),
      Hero.pet, id => { Hero.pet = id; Game.pet = null; Hero.noteCosmetic('pets', id); Hero.save(); AudioSys.sfx('gem'); },
      'No pet');
  },

  mysWings(ctx, W, H) {
    this.cosmeticList(ctx, W, H, 'CHOOSE YOUR WINGS',
      Object.entries(WINGS).map(([id, e]) => [id, e, e.color]),
      Hero.wings, id => { Hero.wings = id; Hero.noteCosmetic('wings', id); Hero.save(); AudioSys.sfx('gem'); },
      'No wings');
  },

  mysTheme(ctx, W, H) {
    this.cosmeticList(ctx, W, H, 'CHOOSE A THEME',
      Object.entries(THEMES).map(([id, e]) => [id, { name: e.name, desc: e.desc || ('Menus and buttons take on ' + e.name.toLowerCase() + ' tones.') }, e.title]),
      Settings.g.theme || 'bone',
      id => { if (id) { Settings.g.theme = id; Hero.noteCosmetic('themes', id); Settings.save(); AudioSys.sfx('gem'); } });
  },

  mysEnchant(ctx, W, H) {
    this.shopBackdrop(ctx, W, H, 'mystic');
    // (red ✕ drawn globally by UI.draw, above all content)
    // Tablet/desktop: bigger fonts + more spaced-out rows (owner request).
    const big = W >= 760;
    const pw = Math.min(big ? 640 : 560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 56, big ? 560 : 480);
    UI.panel(ctx, px, 46, pw, ph, 'ENCHANT GEAR');
    UI.sel.scrollRegion = null;   // only the detail view (below) is scrollable
    const rowStep = big ? 42 : 34, rowBoxH = big ? 38 : 30, rowF = big ? 15 : 12;

    // ---- pick an item ----
    if (!UI.sel.item) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = (big ? 14 : 12) + 'px Cinzel, Georgia';
      ctx.fillStyle = '#9a9080';
      ctx.fillText('Choose an item, then a property to reroll. Each reroll', px + pw / 2, big ? 114 : 112);
      ctx.fillText('stays in that property\'s group — you see the exact odds.', px + pw / 2, big ? 134 : 128);
      // Scrollable list so ALL equip slots are reachable — both rings included —
      // even on short screens (the list is 11 slots tall). Torch isn't enchantable.
      const slots = Object.keys(ITEM_SLOTS).filter(s => !ITEM_SLOTS[s].torch);
      const listTop = big ? 148 : 138;
      const listBot = 46 + ph - 8;
      const viewH = Math.max(60, listBot - listTop);
      const contentH = slots.length * rowStep + 6;
      const scrollMax = Math.max(0, contentH - viewH);
      const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
      UI.sel.scrollY = scrollY;
      UI.sel.scrollMax = scrollMax;
      UI.sel.scrollRegion = { x: px + 2, y: listTop, w: pw - 4, h: viewH };
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + 2, listTop, pw - 4, viewH);
      ctx.clip();
      let y = listTop - scrollY;
      for (const slot of slots) {
        const it = Hero.equipped[slot];
        if (y + rowBoxH > listTop && y < listBot) {   // only draw visible rows
          UI.btnPlate3(ctx, px + 16, y, pw - 32, rowBoxH, '', it ? () => {
            UI.sel.item = it;
            UI.sel.affix = null;
            UI.sel.scrollY = 0;   // detail view starts at the top
          } : null, { disabled: !it });
          // Centered gear text (owner rule — no more far-left squish).
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold ' + rowF + 'px Cinzel, Georgia';
          ctx.fillStyle = it ? RARITIES[it.rarity].color : '#453f52';
          ctx.fillText(this.fitText(ctx, ITEM_SLOTS[slot].label + ':  ' + (it ? it.name : '—'), pw - 140), px + pw / 2, y + rowBoxH / 2);
          if (it && it.enchants) {
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.font = (big ? 12 : 10) + 'px Cinzel, Georgia';
            ctx.fillStyle = '#b06adf';
            ctx.fillText('✦ ' + it.enchants, px + pw - 44, y + rowBoxH / 2);
          }
        }
        y += rowStep;
      }
      ctx.restore();
      return;
    }

    // ---- pick the affix & confirm ----
    // Fixed header (BACK + count), a SCROLLABLE middle (card + affix list +
    // odds), and a PINNED footer (cost + reroll) so the button is always
    // reachable on phones no matter how many affixes the item has.
    const it = UI.sel.item;
    UI.btnPlate2(ctx, px + 16, 88, 100, 28, 'BACK', () => { UI.sel.item = null; UI.sel.affix = null; UI.sel.scrollY = 0; }, { size: 12 });
    ctx.textAlign = 'right';
    ctx.font = '11px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    ctx.fillText((it.enchants || 0) + ' enchant' + (it.enchants === 1 ? '' : 's') + ' so far', px + pw - 16, 102);

    // Display names for every rerollable affix (owner fix v1.7.31 — the group
    // pools carry more keys than this map used to, so several showed "undefined").
    const shortAffix = {
      dmg: 'Damage', hp: 'Life', crit: 'Crit', ess: 'Essence', reg: 'Life regen',
      gold: 'Gold find', armor: 'Armor', move: 'Move speed',
      int: 'Intelligence', vit: 'Vitality', atkSpeed: 'Attack speed',
      critDmg: 'Crit damage', cdr: 'Cooldown reduction', elem: 'Elemental damage',
      lph: 'Life per hit', rcr: 'Resource cost reduction'
    };
    const affixName = k => shortAffix[k] || (AFFIX_ROLLS[k] && AFFIX_ROLLS[k].name) || k;
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
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = '#cfc8b8';
    ctx.fillText('CHOOSE WHICH PROPERTY TO REROLL', px + pw / 2, c - scrollY + 8);
    ctx.textAlign = 'left';
    c += 18;
    // Narrower centered plates; plain bone-white text; unknown stat keys
    // (which used to print "undefined") are skipped (owner bug report).
    const arw = Math.min(400, pw * 0.74);
    const arx = px + pw / 2 - arw / 2;
    for (const [key, v] of Object.entries(it.stats)) {
      const roll = AFFIX_ROLLS[key];
      if (!roll || typeof roll.label !== 'function') continue;   // no label = not a real affix
      const grp = affixGroup(key);
      const selected = UI.sel.affix === key;
      const rng = grp ? Items.affixRange(it, key) : null;
      const maxed = rng && v >= rng.max - Math.max(1e-6, rng.max * 0.001);
      const yy = c - scrollY;
      if (vis(c, rowBoxH)) {
        UI.btnPlate2(ctx, arx, yy, arw, rowBoxH, '', grp ? () => {
          UI.sel.affix = selected ? null : key;
        } : null, { disabled: !grp });
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + rowF + 'px Cinzel, Georgia';
        ctx.fillStyle = !grp ? '#6f6552' : selected ? '#f0dcae' : '#e8e2d0';
        ctx.fillText(this.fitText(ctx, roll.label(v), arw - 150), arx + 26, yy + rowBoxH / 2);
        ctx.textAlign = 'right';
        ctx.font = (big ? 12 : 10) + 'px Cinzel, Georgia';
        ctx.fillStyle = !grp ? '#544d44' : '#8a8070';
        ctx.fillText(!grp ? 'signature' : selected ? 'will be rerolled ✦' : maxed ? 'maxed ✓' : AFFIX_GROUP_NAME[grp], arx + arw - 26, yy + rowBoxH / 2);
      }
      c += rowStep;
    }

    // Reroll odds AND the value range of each outcome, so the player sees how
    // close to a perfect roll they can get (owner rule).
    c += 6;
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    if (UI.sel.affix) {
      if (vis(c, 14)) ctx.fillText('REROLL ODDS  ·  ' + AFFIX_GROUP_NAME[affixGroup(UI.sel.affix)] + ' group', px + 16, c - scrollY + 6);
      c += 16;
      for (const o of Items.enchantOutcomes(it, UI.sel.affix)) {
        const rng = Items.affixRange(it, o.key);
        if (vis(c, 26)) {
          const yy = c - scrollY;
          ctx.textAlign = 'left';
          ctx.font = '11px Cinzel, Georgia';
          ctx.fillStyle = o.current ? '#d8b4f0' : '#b5ab94';
          ctx.fillText('•  ' + affixName(o.key) + (o.current ? '  (new value)' : ''), px + 24, yy + 4);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#6a8a5a';
          ctx.fillText(Math.round(o.chance * 100) + '%', px + pw - 24, yy + 4);
          // Range line: min–max the roll can land on, plus the current value.
          ctx.textAlign = 'left';
          ctx.font = '10px Cinzel, Georgia';
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
      ctx.font = '11px Cinzel, Georgia';
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
    ctx.font = '9px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, scrollTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag for more ▼', px + pw / 2, viewBot - 1);

    // ---- pinned footer: cost + reroll ----
    ctx.strokeStyle = '#3a3448';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 12, footerTop); ctx.lineTo(px + pw - 12, footerTop); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '11px Cinzel, Georgia';
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
    UI.btnPlate2(ctx, px + 16, footerTop + 24, pw - 32, 38,
      !UI.sel.affix ? 'SELECT A PROPERTY ABOVE'
        : !afford ? 'NOT ENOUGH GOLD OR SOULS'
        : 'REROLL ' + (AFFIX_ROLLS[UI.sel.affix] ? AFFIX_ROLLS[UI.sel.affix].label(it.stats[UI.sel.affix]).toUpperCase() : ''),
      (UI.sel.affix && afford) ? () => {
        const res = Items.enchant(it, UI.sel.affix);
        // Keep the rerolled property SELECTED so the player watches the value
        // change. A reroll may land on another affix in the same group — follow
        // it to whatever it produced; a socket-uncover leaves the stat as-is.
        if (typeof res === 'string' && res !== 'socket') UI.sel.affix = res;
        else if (!(UI.sel.affix in it.stats)) UI.sel.affix = null;
      } : null,
      { size: 13, disabled: !UI.sel.affix || !afford, color: '#e8e2d0' });
  },

  // ------------------------------------------------- character sheet

  character(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const s = Items.computeStats();
    // Tablet/desktop: scale the whole sheet up (fonts + row spacing) via k.
    const big = W >= 760, k = big ? 1.35 : 1;
    // ONE wide scrolling column (owner rule v1.7.1 — no more two columns).
    const pw = Math.min(big ? 720 : 600, W - 20);
    const px = W / 2 - pw / 2;
    const twoCol = false;
    const ph = Math.min(H - 16, 640);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, this.fitText(ctx, Hero.name.toUpperCase() + '  ·  LVL ' + Hero.level + (Hero.paragon ? '  ·  P' + Hero.paragon : ''), pw - 60));
    // Inset well clear of the painted border (owner rule v1.7.16 — values
    // used to ride the exterior plate).
    const colW = twoCol ? (pw - 68) / 2 : pw - 56;
    const lx = px + 28;
    const rx = twoCol ? px + 40 + colW : lx;

    // Scrollable body — the columns stack tall on phones, so the whole sheet
    // (Combat, Journey, Holdings, ANALYSIS) drag-scrolls; the campfire button
    // stays pinned below.
    const bodyTop = py + 44;
    const footTop = py + ph - 46;
    const viewH = footTop - bodyTop;
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px + 2, y: bodyTop, w: pw - 4, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 2, bodyTop, pw - 4, viewH); ctx.clip();
    let ly = bodyTop + 14 - scrollY, ry = bodyTop + 14 - scrollY;

    const line = (x, yv, label, value, color = '#e8e0cc') => {
      ctx.textAlign = 'left';
      ctx.font = (12 * k) + 'px Cinzel, Georgia';
      ctx.fillStyle = '#8a8070';
      ctx.fillText(label, x, yv);
      ctx.textAlign = 'right';
      ctx.font = 'bold ' + (12 * k) + 'px Cinzel, Georgia';
      ctx.fillStyle = color;
      ctx.fillText(value, x + colW, yv);
      return yv + 19 * k;
    };
    const header = (x, yv, txt) => {
      // Section headings share the plate style: Cinzel caps in parchment gold
      // (owner rule — no more garish per-section colors).
      ctx.textAlign = 'left';
      ctx.font = '600 ' + (12 * k) + 'px Cinzel, Georgia';
      ctx.fillStyle = '#d8c5a0';
      ctx.fillText(txt, x, yv);
      return yv + 18 * k;
    };

    // Combat stats.
    ly = header(lx, ly, '— COMBAT —', '#6ff7c3');
    ly = line(lx, ly, 'Damage', '×' + s.dmgMult.toFixed(2), '#6ff7c3');
    ly = line(lx, ly, 'Damage per hit', Items.rawHit(s).toLocaleString(), '#ff9a6a');
    if (s.intelligence > 0) ly = line(lx, ly, 'Intelligence', '+' + s.intelligence.toLocaleString(), '#8fd3ff');
    if (s.attackSpeed > 0) ly = line(lx, ly, 'Attack speed', '+' + (s.attackSpeed * 100).toFixed(1) + '%', '#ffd76a');
    ly = line(lx, ly, 'Life', s.maxHp, '#e04a5a');
    if (s.vitality > 0) ly = line(lx, ly, 'Vitality', '+' + s.vitality.toLocaleString(), '#e0808a');
    ly = line(lx, ly, 'Crit chance', Math.round(s.critChance * 100) + '%  (×' + (1.8 + (s.critDamage || 0)).toFixed(2) + ')', '#ffb43a');
    if (s.critDamage > 0) ly = line(lx, ly, 'Crit damage', '+' + Math.round(s.critDamage * 100) + '%', '#4ade80');
    if (s.elementalDamage > 0) ly = line(lx, ly, 'Elemental damage', '+' + Math.round(s.elementalDamage * 100) + '%', '#8fd3ff');
    if (s.flatDmg > 0) ly = line(lx, ly, 'Bonus damage', '+' + s.flatDmg + ' per hit', '#e04a5a');
    if (s.lifePerHit > 0) ly = line(lx, ly, 'Life per hit', '+' + s.lifePerHit, '#b06adf');
    ly = line(lx, ly, 'Max essence', s.maxEssence, '#4ecbe0');
    ly = line(lx, ly, 'Essence regen', s.essenceRegen.toFixed(1) + '/s', '#4ecbe0');
    ly = line(lx, ly, 'Life regen', s.hpRegen.toFixed(1) + '/s', '#e04a5a');
    ly = line(lx, ly, 'Armor', s.armor + '  (' + Math.round(s.armorDR * 100) + '% dmg reduced)', '#bfe8f4');
    if (s.blockChance > 0) ly = line(lx, ly, 'Block chance', Math.round(s.blockChance * 100) + '%', '#8fb0e8');
    if (s.resistAll > 0) ly = line(lx, ly, 'All resist', s.resistAll + '  (' + Math.round(s.resistDR * 100) + '% reduced)', '#bfe8f4');
    if (s.cooldownReduction > 0) ly = line(lx, ly, 'Cooldown reduction', '-' + Math.round(s.cooldownReduction * 100) + '%', '#bfe8f4');
    if (s.resourceCostReduction > 0) ly = line(lx, ly, 'Resource cost', '-' + Math.round(s.resourceCostReduction * 100) + '%', '#ffd76a');
    ly = line(lx, ly, 'Move speed', '+' + Math.round((s.moveSpeed || 0) * 100) + '%', '#6ff7c3');
    ly = line(lx, ly, 'Gold find', '+' + Math.round((s.goldFind - 1) * 100) + '%', '#ffd76a');
    if (s.xpBonus > 0) ly = line(lx, ly, 'Bonus XP', '+' + Math.round(s.xpBonus * 100) + '%', '#ffd76a');
    ly += 6 * k;
    ly = header(lx, ly, '— JOURNEY —', '#b06adf');
    ly = Hero.level >= MAX_LEVEL
      ? line(lx, ly, 'Renown', 'R' + (Hero.paragon || 0) + '  (' + (Hero.np || 0) + ' NP)', '#ff8c2a')
      : line(lx, ly, 'XP', `${Hero.xp} / ${XP_CURVE(Hero.level)}`);
    ly = line(lx, ly, 'Story acts finished', (Hero.actsCleared || 0) + ' / 100');
    ly = line(lx, ly, 'Achievement points', achPoints().toLocaleString(), '#ffd76a');
    ly = line(lx, ly, 'Difficulty', DIFFICULTIES[Hero.difficulty].name);
    ly = line(lx, ly, 'Monsters slain', Hero.totalKills);
    if (!twoCol) ry = ly + 6; // stack columns on narrow screens

    // Reagents & holdings.
    ry = header(rx, ry, '— REAGENTS —', '#ffd76a');
    // Painted icon + name for EVERY reagent, gold included (owner art v1.7.32 —
    // gold, lumber, rivets, heartstring, wyrm scale, brain, soul of Bellmahath).
    const matRow = (key, name, val, col) => {
      drawMatIcon(ctx, key, rx + 10 * k, ry - 4 * k, 18 * k);
      ctx.textAlign = 'left'; ctx.font = (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText(name, rx + 24 * k, ry);
      ctx.textAlign = 'right'; ctx.font = '600 ' + (12 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = col;
      ctx.fillText(typeof val === 'number' ? val.toLocaleString() : String(val), rx + colW, ry);
      ry += 19 * k;
    };
    matRow('gold', 'Gold', Hero.gold, '#ffd76a');
    for (const [key, m] of Object.entries(MATERIALS)) matRow(key, m.name, Hero.mats[key] || 0, m.color);
    ry = line(rx, ry, 'Gems in pouch', Hero.gems.length, '#b06adf');
    ry = line(rx, ry, 'Bag', Hero.bagUsed() + ' / ' + Hero.BAG_SIZE);
    ry += 6 * k;

    // Active SHRINES — a WILD shrine (60s) and the FOUNTAIN blessing (10 min)
    // both show here and STACK (owner rule v1.7.33). Above Active Powers.
    ry = header(rx, ry, '— ACTIVE SHRINES —', '#6ff7c3');
    {
      const shrineNames = { fleetfoot: 'Fleetfoot', empowered: 'Empowered', frenzied: 'Frenzied', blessed: 'Blessed', fortune: 'Fortune' };
      const fmtT = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
      const shrineRow = (glyph, buff, t, col) => {
        ctx.textAlign = 'left'; ctx.font = '600 ' + (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = col;
        ctx.fillText(this.fitText(ctx, glyph + ' ' + (shrineNames[buff] || buff), colW - 60 * k), rx, ry);
        ctx.textAlign = 'right'; ctx.font = (10 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
        ctx.fillText(fmtT(t) + ' left', rx + colW, ry);
        ry += 15 * k;
        ctx.textAlign = 'left'; ctx.font = 'italic ' + (10 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#cfc8b8';
        ry = wrapText(ctx, FOUNTAIN_BUFFS[buff] || '', rx, ry, colW, 13 * k, 2) + 4 * k;
      };
      const pl = Game.player;
      let anyShrine = false;
      if (pl && pl.shrine && pl.shrine.t > 0) { shrineRow('◈ Shrine:', pl.shrine.buff, pl.shrine.t, '#6ff7c3'); anyShrine = true; }
      if (Game.fountainBuff && Game.fountainBuff.t > 0) { shrineRow('⛲ Fountain:', Game.fountainBuff.buff, Game.fountainBuff.t, '#7fd8ff'); anyShrine = true; }
      if (!anyShrine) {
        ctx.textAlign = 'left'; ctx.font = (11 * k) + 'px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ry = wrapText(ctx, 'None active — pray at a wild shrine (60s) or the New Haven fountain (10 min).', rx, ry, colW, 14 * k, 2) + 3 * k;
      }
    }
    ry += 6 * k;

    // Active POWERS — equipped legendary powers, Cube-extracted powers and live
    // set bonuses, so the player sees exactly what's shaping their build.
    ry = header(rx, ry, '— ACTIVE POWERS —', '#ff8c2a');
    ctx.textAlign = 'left'; ctx.font = (11 * k) + 'px Cinzel, Georgia';
    const cubeSel = (Hero.cubeActive && Hero.cubeActive.slice()) || [];
    const powerKeys = Object.keys(s.powers || {});
    if (!powerKeys.length && !cubeSel.length && s.setCount < 2) {
      ctx.fillStyle = '#6f6552';
      ry = wrapText(ctx, 'None yet — equip legendaries or extract powers in the Cube.', rx, ry, colW, 14 * k, 2) + 3 * k;
    } else {
      for (const pk of powerKeys) {
        const P = LEGENDARY_POWERS[pk]; if (!P) continue;
        const cubed = cubeSel.includes(pk);
        ctx.fillStyle = cubed ? '#ff5a4a' : '#ffb86a';
        ctx.font = (11 * k) + 'px Cinzel, Georgia';
        ry = wrapText(ctx, (cubed ? '◈ ' : '★ ') + P.name + (cubed ? ' (Cube)' : ''), rx, ry, colW, 14 * k, 2) + 2 * k;
      }
      if (s.setCount >= 2) {
        ctx.fillStyle = '#4ade80';
        ctx.font = (11 * k) + 'px Cinzel, Georgia';
        for (const bonus of INARIUS_SET.bonuses) {
          if (s.setCount >= bonus.pieces) ry = wrapText(ctx, '◈ Inarius ' + bonus.pieces + 'pc active', rx, ry, colW, 14 * k, 1) + 2 * k;
        }
      }
    }
    ry += 6 * k;

    // Analysis — every tip is drawn; the body scrolls if it overflows.
    ry = header(rx, ry, '— ANALYSIS —', '#e04a5a');
    ctx.textAlign = 'left';
    ctx.font = (11 * k) + 'px Cinzel, Georgia';
    ctx.fillStyle = '#b5ab94';
    for (const tip of this.analyze(s)) {
      ry = wrapText(ctx, '• ' + tip, rx, ry, colW, 14 * k, 3) + 3 * k;
    }
    ctx.restore();

    // Scroll extent (from the taller column) + drag hints.
    const contentBot = Math.max(ly, ry) + scrollY;
    UI.sel.scrollMax = Math.max(0, (contentBot - (bodyTop + 14)) - viewH + 16);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', W / 2, bodyTop + 2);
    if (scrollY < UI.sel.scrollMax - 1) ctx.fillText('▼ drag for more ▼', W / 2, footTop - 2);

    // Footer: Renown (once level 70+) beside the campfire roster button.
    const showPara = Hero.level >= MAX_LEVEL || Hero.paragon > 0;
    const fbY = py + ph - 40, fbW = pw - 32;
    if (showPara) {
      const half = (fbW - 8) / 2;
      const np = Hero.np || 0;
      UI.btnPlate2(ctx, px + 16, fbY, half, 30, 'RENOWN' + (np ? ' (' + np + ' NP)' : ''), () => { UI.open('paragon'); UI.sel.paraCat = PARAGON_CATS[0]; UI.sel.scrollY = 0; },
        { size: 12, color: np ? '#ffd76a' : '#c9a04a' });
      UI.btnPlate2(ctx, px + 16 + half + 8, fbY, half, 30, 'CAMPFIRE', () => {
        Hero.save(); Game.state = 'menu'; UI.open('select');
      }, { size: 12, color: '#ffb24a' });
    } else {
      UI.btnPlate2(ctx, px + 16, fbY, fbW, 30, 'CAMPFIRE', () => {
        Hero.save(); Game.state = 'menu'; UI.open('select');
      }, { size: 12, color: '#ffb24a' });
    }
  },

  // The RENOWN screen (renamed from Paragon, owner rule v1.7.8): spend
  // Nekromancer Points across four trees — Might · Warfare · Fortitude ·
  // Cunning. Past level 70 every level earns 1 NP; caps and per-point values
  // live in PARAGON_STATS (internal keys keep their old names).
  paragon(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(500, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 20, 520);
    const py = Math.max(10, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'RENOWN');
    // Header: level, NP, XP-to-next bar.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = '#ff8c2a';
    ctx.fillText('Renown ' + (Hero.paragon || 0), px + 16, py + 60);
    ctx.textAlign = 'right'; ctx.fillStyle = (Hero.np || 0) ? '#ffd76a' : '#9a9080';
    ctx.fillText((Hero.np || 0) + ' NP to spend', px + pw - 16, py + 60);
    const need = PARAGON_XP(Hero.paragon || 0);
    const frac = clamp((Hero.paragonXp || 0) / need, 0, 1);
    ctx.fillStyle = '#241f30'; rr(ctx, px + 16, py + 68, pw - 32, 8, 4); ctx.fill();
    ctx.fillStyle = '#ff8c2a'; rr(ctx, px + 16, py + 68, (pw - 32) * frac, 8, 4); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText(Math.floor(Hero.paragonXp || 0).toLocaleString() + ' / ' + need.toLocaleString() + ' XP to next', W / 2, py + 90);

    // FREE SPEND (v1.6.99 owner rule) — no rotation lock, no banner. The
    // tabs are plain category views on the simple plate.
    if (!UI.sel.paraCat) UI.sel.paraCat = PARAGON_CATS[0];
    const tabW = (pw - 32) / PARAGON_CATS.length;
    PARAGON_CATS.forEach((cat, i) => {
      const on = UI.sel.paraCat === cat;
      UI.btnPlate2(ctx, px + 16 + i * tabW, py + 106, tabW - 4, 26, cat, () => { UI.sel.paraCat = cat; },
        { size: 10, color: on ? '#f0dcae' : '#8a8070' });
    });

    // Footer (undo / reset) on the little empty plate, pinned above the edge.
    const footY = py + ph - 40;
    const spent = Hero.paragonSpent();
    UI.chip(ctx, px + 16, footY, (pw - 40) / 2, 28, 'Undo last', spent > 0 ? () => Hero.refundLastParagon() : null,
      { size: 11, disabled: spent <= 0, color: '#c9bfa8' });
    UI.chip(ctx, px + 24 + (pw - 40) / 2, footY, (pw - 40) / 2, 28, 'Reset all', spent > 0 ? () => Hero.resetParagon() : null,
      { size: 11, disabled: spent <= 0, color: '#e0a0a0' });

    // Stat rows for the VIEWED category (drag-scroll in case of short screens).
    const keys = Object.keys(PARAGON_STATS).filter(k => PARAGON_STATS[k].cat === UI.sel.paraCat);
    const listTop = py + 144, listBot = footY - 10;
    const viewH = listBot - listTop;
    const rowH = 62;
    const scrollMax = Math.max(0, keys.length * rowH - viewH);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
    UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
    UI.sel.scrollRegion = { x: px + 14, y: listTop, w: pw - 28, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 14, listTop, pw - 28, viewH); ctx.clip();

    keys.forEach((k, i) => {
      const y = listTop + i * rowH - scrollY;
      if (y + rowH - 8 < listTop || y > listBot) return;
      const st = PARAGON_STATS[k];
      const pts = Hero.para[k] || 0;
      const capped = st.max && pts >= st.max;
      ctx.fillStyle = 'rgba(24,20,30,0.92)'; rr(ctx, px + 16, y, pw - 32, rowH - 8, 8); ctx.fill();
      ctx.strokeStyle = pts > 0 ? '#8a6f2a' : '#3a3448'; ctx.lineWidth = 1; rr(ctx, px + 16, y, pw - 32, rowH - 8, 8); ctx.stroke();
      ctx.textAlign = 'left'; ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
      ctx.fillText(st.label, px + 28, y + 18);
      ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      const bonus = (Hero.paragonBonus(k) * 100);
      const bTxt = '+' + (bonus % 1 ? bonus.toFixed(1) : bonus) + '% ' + st.note + (st.max ? '' : '  (∞)');
      ctx.fillText(bTxt, px + 28, y + 34);
      ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = capped ? '#e0a24a' : '#6f6552';
      ctx.fillText(pts + (st.max ? ' / ' + st.max + ' pts' : ' pts'), px + 28, y + 47);
      // A single "+" — live whenever points remain (free spend, owner rule).
      const bw = 34, by = y + (rowH - 8) / 2 - 14;
      const canAdd = (Hero.np || 0) > 0 && !capped;
      if (!UI.iconPlate(ctx, 'plus', px + pw - 30 - bw, by, bw, 28, canAdd ? () => Hero.spendParagonN(k, Input.bulkN()) : null,
        { disabled: !canAdd, label: 'para+' }))
        UI.btn(ctx, px + pw - 30 - bw, by, bw, 28, '+', canAdd ? () => Hero.spendParagonN(k, Input.bulkN()) : null,
          { size: 17, disabled: !canAdd, border: '#8a6f2a', color: '#ffd76a' });
    });
    ctx.restore();
    if (scrollMax > 0 && scrollY < scrollMax - 1) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('▼ drag for more ▼', W / 2, listBot + 1);
    }
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
    // Only count an empty slot as "free" if its category actually has a skill
    // unlocked at the hero's level — a level-1 can't fill 5 slots (owner fix).
    let freeSlots = 0;
    Hero.loadout.forEach((id, i) => {
      if (id) return;
      const cat = LOADOUT_CATS[i];
      const hasUnlocked = (CAT_SKILLS[cat] || []).some(sid => {
        const def = SKILL_DATA.find(s => s.id === sid);
        return def && Hero.level >= (def.lvl || 1) && !Hero.loadout.includes(sid);
      });
      if (hasUnlocked) freeSlots++;
    });
    if (freeSlots) tips.push(freeSlots + ' empty skill slot' + (freeSlots > 1 ? 's' : '') + ' you can still fill');
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
    if (Hero.bagUsed() >= Hero.BAG_SIZE - 4) tips.push('Bag nearly full — salvage at the Blacksmith');
    if (Hero.zonesCleared >= ZONES.length && Hero.difficulty < DIFFICULTIES.length - 1) {
      tips.push('You can raise the difficulty for richer rewards');
    }
    if (!tips.length) tips.push('Your build is battle-ready. Sanctuary awaits.');
    return tips;
  },

  // -------------------------------------------------- stash (grouped list)
  // The wheel is GONE (owner rule): the vault is one flat list SORTED INTO
  // GROUPS by gear type, with filter chips and a sort picker (upgrade /
  // rarity / level / name). Items still live in per-slot bins underneath.
  STASH_SORTS: [['up', '▲ UPGRADE'], ['rar', 'RARITY'], ['lvl', 'LEVEL'], ['name', 'NAME']],

  stash(ctx, W, H) {
    this.dim(ctx, W, H);
    const slots = Object.keys(ITEM_SLOTS).filter(s => !ITEM_SLOTS[s].torch);
    // Groups: one per gear type, the two ring bins folded into "Rings".
    const groupsDef = [];
    for (const s of slots) {
      if (s === 'ring2') continue;
      if (s === 'ring1') groupsDef.push(['Rings', ['ring1', 'ring2']]);
      else groupsDef.push([ITEM_SLOTS[s].label, [s]]);
    }
    const filter = UI.sel.stashFilter || 'all';
    const sortKey = UI.sel.stashSort || 'up';
    const sorters = {
      up: (a, b) => Items.compareArrows(b, Hero.equipped[b.slot]) - Items.compareArrows(a, Hero.equipped[a.slot]) || b.rarity - a.rarity,
      rar: (a, b) => b.rarity - a.rarity || (b.stars || 0) - (a.stars || 0) || b.mLvl - a.mLvl,
      lvl: (a, b) => b.mLvl - a.mLvl || b.rarity - a.rarity,
      name: (a, b) => a.name.localeCompare(b.name)
    };

    const sfa = UI.safe || { top: 0 };
    // The painted panel wraps the whole vault (v1.7.0 owner rule — the
    // Stash gets a menu of its own, like Inventory).
    const total = Hero.stash.filter(it => it && !it.torch).length;
    const ppw = Math.min(600, W - 16);
    const ppx = W / 2 - ppw / 2;
    const ppy = Math.max(8, (sfa.top || 0) + 8);
    const ppb = H - 10;
    UI.panel(ctx, ppx, ppy, ppw, ppb - ppy,
      'STASH — ' + total + ' stored · ' + Hero.stashPerSlot().toLocaleString() + '/type');
    const pw = ppw - 40;
    const px = W / 2 - pw / 2;
    let y = ppy + 48;

    // Deposit + upgrade.
    const gs = n => n >= 1e6 ? (n / 1e6) + 'm' : n >= 1000 ? (n / 1000) + 'k' : '' + n;
    const upCost = Hero.stashUpgradeCost();
    const half = (pw - 8) / 2;
    UI.btnPlate3(ctx, px, y, half, 26, 'DEPOSIT BAG (' + Hero.bagUsed() + ')',
      Hero.bagUsed() ? () => Items.depositAll() : null,
      { size: 10, disabled: !Hero.bagUsed(), color: '#a8d9be' });
    UI.btnPlate3(ctx, px + half + 8, y, half, 26,
      upCost === null ? 'STASH MAXED'
        : 'UPGRADE → ' + STASH_PER_SLOT[Hero.stashTier + 1].toLocaleString() + ' (' + gs(upCost) + ' g)',
      upCost !== null && Hero.gold >= upCost ? () => Hero.buyStashUpgrade() : null,
      { size: 9, disabled: upCost === null || Hero.gold < upCost, color: '#ffd76a' });
    y += 34;

    // Filter chips (flow-wrapped): ALL + one per group.
    let chX = px, chY = y;
    // Filter/sort chips ride the SIMPLE plate (v1.6.98 owner rule).
    const chip = (label, on, cb, hue) => {
      ctx.font = 'bold 9px Cinzel, Georgia';
      const cw = ctx.measureText(label).width + 26;
      if (chX + cw > px + pw + 1) { chX = px; chY += 24; }
      UI.btnPlate2(ctx, chX, chY, cw, 20, label, cb,
        { size: 9, color: on ? (hue || '#f0dcae') : '#8a8070', tip: false });
      chX += cw + 6;
    };
    const setFilter = f => { UI.sel.stashFilter = f; UI.sel.scrollY = 0; UI.sel.stashItem = null; };
    chip('ALL (' + total + ')', filter === 'all', () => setFilter('all'));
    for (const [label, gSlots] of groupsDef) {
      const n = gSlots.reduce((s2, sl) => s2 + Hero.stashSlotCount(sl), 0);
      if (!n && filter !== label) continue;   // hide empty groups' chips
      chip(label + (n ? ' ' + n : ''), filter === label, () => setFilter(label));
    }
    y = chY + 26;

    // Sort picker.
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    ctx.fillText('SORT', px, y + 10);
    chX = px + 34; chY = y;
    for (const [key, label] of this.STASH_SORTS) {
      chip(label, sortKey === key, () => { UI.sel.stashSort = key; UI.sel.scrollY = 0; }, '#ffd76a');
    }
    y = chY + 28;

    // The grouped, scrollable list.
    const shown = groupsDef
      .filter(([label]) => filter === 'all' || filter === label)
      .map(([label, gSlots]) => {
        const items = gSlots.reduce((arr, sl) => arr.concat(Hero.stashSlotItems(sl)), []);
        items.sort(sorters[sortKey] || sorters.up);
        return { label, items };
      })
      .filter(g => g.items.length);

    const listTop = y, viewBot = ppb - 14, viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: px - 4, y: listTop - 4, w: pw + 8, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(px - 4, listTop - 4, pw + 8, viewH + 8); ctx.clip();
    let c = listTop;
    const vis = (top, h) => (top - scrollY + h > listTop) && (top - scrollY < viewBot);

    if (!shown.length) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText(total ? 'Nothing in this group.' : 'The vault is empty — deposit your bag here.', px, c - scrollY + 14);
      c += 24;
    }
    for (const g of shown) {
      // Group header.
      if (vis(c, 20)) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = '600 11px Cinzel, Georgia'; ctx.fillStyle = '#d8c5a0';
        ctx.fillText(g.label.toUpperCase(), px + 2, c - scrollY + 13);
        ctx.textAlign = 'right'; ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ctx.fillText(g.items.length + '', px + pw - 2, c - scrollY + 13);
        ctx.strokeStyle = 'rgba(143,176,232,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, c - scrollY + 18); ctx.lineTo(px + pw, c - scrollY + 18); ctx.stroke();
      }
      c += 24;
      for (const it of g.items) {
        const yy = c - scrollY;
        const expanded = UI.sel.stashItem === it;
        if (vis(c, 42)) {
          ctx.fillStyle = expanded ? 'rgba(46,42,58,0.95)' : 'rgba(28,24,38,0.92)';
          rr(ctx, px, yy, pw, 38, 6); ctx.fill();
          if (expanded) { ctx.strokeStyle = RARITIES[it.rarity].color; ctx.lineWidth = 1.5; rr(ctx, px, yy, pw, 38, 6); ctx.stroke(); }
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
          const bw = 76;   // wide enough for WITHDRAW at 9px — never ellipsized
          ctx.fillText(this.fitText(ctx, it.name, pw - bw * 2 - 26), px + 10, yy + 15);
          ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
          ctx.fillText(this.fitText(ctx, ITEM_SLOTS[it.slot].label + ' · lvl ' + it.mLvl + '  ·  tap to inspect', pw - bw * 2 - 26), px + 10, yy + 30);
          // Tap the card area (left of the buttons) to inspect the item.
          UI.register(px, yy, pw - bw * 2 - 16, 38, () => { UI.sel.stashItem = expanded ? null : it; });
          UI.chip(ctx, px + pw - bw * 2 - 12, yy + 5, bw, 28, 'WITHDRAW',
            () => Items.fromStash(it), { size: 9, color: '#a8d9be' });
          const canSalv = Items.canSalvage(it);
          UI.chip(ctx, px + pw - bw - 6, yy + 5, bw, 28, 'SALVAGE',
            canSalv ? () => { const k = Hero.stash.indexOf(it); if (k >= 0) { Hero.stash.splice(k, 1); Items.grantSalvage(it); Hero.saveStash(); Hero.save(); if (UI.sel.stashItem === it) UI.sel.stashItem = null; } } : null,
            { size: 9, disabled: !canSalv, color: '#ffb43a' });
        }
        c += 42;
        // Expanded inspect card: full stats + upgrade arrows vs what's equipped.
        if (expanded) {
          const cardH = 30 + Items.statLines(it).length * 15 + 8;
          if (vis(c, cardH)) this.itemCard(ctx, px, c - scrollY, pw, it, Hero.equipped[it.slot], true);
          c += cardH;
        }
      }
      c += 8;
    }
    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 6);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', px + pw / 2, listTop + 3);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', px + pw / 2, viewBot - 1);
  },

  // ------------------------------------------------- wandering vendor

  // Talk to LUKUS, BRINGER OF LIGHT — a dialog stage (owner spec): Lukus's
  // painted portrait stands on the RIGHT (idle, gently breathing — the art's
  // black background melts into the stage), and his words + the QUEST LINE
  // (500 quests, level 1 → 70 → Paragon 1000) sit on the LEFT, laid straight
  // on the black — NO panel box (owner rule: "it doesn't need to be in a box").
  lukus(ctx, W, H) {
    // The stage — solid black, so the portrait blends seamlessly.
    ctx.fillStyle = '#020104';
    ctx.fillRect(0, 0, W, H);

    // RIGHT: Lukus, idle sway — in HIS OWN AREA, fully clear of the round EXIT
    // button in the corner (owner rule: the NPC and the exit button must not
    // overlap). Text and knight sit SIDE BY SIDE on every screen (owner rule):
    // on wide screens he stands bottom-anchored beside the button zone; on
    // narrow phones he takes the right column, raised above the EXIT button,
    // standing on a soft ground shadow.
    const sf = UI.safe || { right: 0, bottom: 0 };
    const lefty = Settings.g && Settings.g.leftHanded;   // EXIT sits bottom-LEFT when mirrored
    const btnZone = (lefty ? 12 : 118) + (sf.right || 0);
    const img = Game.lukusImg('idle');
    const ready = img.complete && img.naturalWidth;
    const aspect = ready ? img.naturalWidth / img.naturalHeight : 0.62;
    let lx = Math.max(30, W * 0.055);   // indented from the edge (owner rule)

    // Try the wide layout first: knight bottom-anchored left of the button.
    let h = Math.min(H * 0.92, 640), w = h * aspect;
    const maxW = Math.max(120, (W - btnZone) * 0.5);
    if (w > maxW) { w = maxW; h = w / aspect; }
    let lw = Math.min(470, W - w - btnZone - lx - Math.max(12, W * 0.03));
    const nr = lw < 260;   // narrow (portrait phones)
    let px2, py2, feetY = H;
    if (nr) {
      lw = Math.floor(W * 0.52) - lx;
      const colL = lx + lw + 10, colR = W - 10;
      feetY = H - 148 - (sf.bottom || 0);   // his feet clear the EXIT zone
      w = Math.max(40, colR - colL); h = w / aspect;
      const maxH = Math.max(80, feetY - 30);
      if (h > maxH) { h = maxH; w = h * aspect; }
      px2 = colL + (colR - colL - w) / 2;
      py2 = feetY - h;
    } else {
      px2 = W - w - btnZone;
      py2 = H - h;
      // Desktop (owner rule v1.7.15): pure-black stage split in two — the
      // text column centers in the LEFT half, the figure in the RIGHT half.
      if (UI.desktop) {
        lw = Math.min(470, Math.floor(W * 0.42));
        lx = Math.max(14, Math.round(W * 0.25 - lw / 2));
        px2 = Math.round(W * 0.75 - w / 2);
      }
    }
    if (ready) {
      const bob = Math.sin(Game.time * 1.5) * 3;
      if (nr) {   // a soft ground shadow so he stands rather than floats
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(px2 + w / 2, feetY - 3, w * 0.36, 8, 0, 0, TAU); ctx.fill();
      }
      ctx.drawImage(img, px2, py2 + bob, w, h);
    }

    // LEFT column, vertically centered.
    // Text starts at the very top (owner rule: no wasted space on mobile).
    let y = 30 + ((UI.safe && UI.safe.top) || 0);
    const journal = (Hero.journal || []).filter(e => e.src !== 'A');   // Lukus's own deeds only
    const doneCount = clamp(Hero.questLine || 0, 0, QUEST_COUNT);
    const offerIdx = Hero.questOffer();
    const allDone = offerIdx < 0 && !journal.length;

    // Name — a glowing header instead of a panel title. (On narrow phones the
    // header may run a little past the column into the empty black above the
    // knight — that space is always clear.)
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (nr ? 14 : W < 520 ? 15 : 18) + 'px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.shadowColor = 'rgba(255,215,106,0.45)'; ctx.shadowBlur = 12;
    ctx.fillText('⚔ LUKUS, BRINGER OF LIGHT', lx, y);
    ctx.shadowBlur = 0;
    y += 10;
    // A thin gold rule that fades out to the right.
    const rule = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    rule.addColorStop(0, 'rgba(216,180,74,0.65)'); rule.addColorStop(1, 'rgba(216,180,74,0)');
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
    y += 22;

    // His words.
    ctx.font = 'italic ' + (nr ? 12 : 13) + 'px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
    const greet = allDone
      ? '"Five hundred deeds. Every one of them yours. New Haven will sing of you until the sun burns out, friend."'
      : '"Good day! I am Lukus, Bringer of Light and protectorate of New Haven. The Light keeps a ledger of five hundred deeds — shall we work through it together?"';
    y = wrapText(ctx, greet, lx, y, lw, nr ? 16 : 19, nr ? 7 : 5);
    y += 14;

    // Ledger header: turn-ins across the 500-quest line. The count drops to
    // its own line when the column is too narrow to share one (no overlap).
    ctx.font = 'bold ' + (nr ? 10 : 11) + 'px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText(nr ? 'LEDGER OF LIGHT' : 'THE LEDGER OF LIGHT', lx, y);
    y += 8;
    UI.bar(ctx, lx, y, lw, 5, doneCount / QUEST_COUNT, '#221d2e', '#8a6f2a');
    y += 18;

    // ---- THE JOURNAL (up to 7 accepted quests) + Lukus's next offer, in one
    // drag-scrolling column (a full journal outgrows short landscape screens).
    const listTop = y;
    const viewBot = H - (lefty ? 150 : 16);
    const viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: lx - 6, y: listTop - 4, w: lw + 12, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(lx - 6, listTop - 4, lw + 12, viewH + 8); ctx.clip();
    let c = listTop;
    // Reserve a right gutter for the skull scrollbar so the row plates (DROP /
    // TURN IN / ACCEPT) never sit under it (owner fix v1.7.31).
    const cw = lw - 26;
    const vis = (top, hh) => (top - scrollY + hh > listTop) && (top - scrollY < viewBot);

    // NEXT DEED on offer — at the TOP so accepting new quests never needs a
    // scroll (owner rule v1.7.32: quests up top, the accepted list below).
    if (offerIdx >= 0) {
      const def = QUEST_LINE[offerIdx];
      const milestone = def.tid === 'reach';
      const gateOk = def.gate.kind === 'level' ? Hero.level >= def.gate.at : (Hero.paragon || 0) >= def.gate.at;
      const full = journal.length >= QUEST_JOURNAL_MAX;   // HIS slots only — Addy's ride separately
      const rwText = 'Reward:  ' + questRewardText(offerIdx, true);

      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText('NEXT DEED', lx, c - scrollY + 6); c += 14;
      ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = milestone ? '#b06adf' : '#ffd76a';
      ctx.fillText(this.fitText(ctx, (milestone ? '★ ' : '') + def.name.toUpperCase(), cw), lx, c - scrollY + 10); c += 16;
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
      const dBot = wrapText(ctx, def.desc, lx, c - scrollY + 10, cw, 15, nr ? 3 : 2);
      c += (dBot - (c - scrollY + 10)) + 4;
      ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      // Wrapped (2 lines) so the offer's reward can never run off the column.
      const rBot = wrapText(ctx, rwText, lx, c - scrollY + 8, cw, 12, 2);
      c += (rBot - (c - scrollY + 8)) + 8;
      if (vis(c, 44)) {
        if (full) {
          UI.btn(ctx, lx, c - scrollY, cw, 40, 'JOURNAL FULL — ' + QUEST_JOURNAL_MAX + ' / ' + QUEST_JOURNAL_MAX,
            null, { size: 12, disabled: true, color: '#8a8070' });
        } else if (gateOk) {
          UI.btnPlate2(ctx, lx, c - scrollY, cw, 40, 'ACCEPT QUEST', () => {
            const acc = Hero.acceptQuest();
            if (acc) { UI.toast('Quest accepted: ' + acc.name, '#ffd76a'); AudioSys.sfx('gold'); }
          }, { size: 13, color: '#ffd76a' });
        } else {
          // Gated quests share ONE plate with live text (owner rule — no
          // thousand baked images, just "REQUIRES LEVEL X" on the plate).
          UI.btnPlate(ctx, lx, c - scrollY, cw, 40,
            'REQUIRES ' + (def.gate.kind === 'level' ? 'LEVEL ' : 'RENOWN ') + def.gate.at,
            null, { size: 12, disabled: true });
        }
      }
      c += 48;
      if (!full && !gateOk) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ctx.fillText('"Grow a little stronger first — the Light can wait."', lx, c - scrollY + 4);
        c += 16;
      }
    } else if (!journal.length) {
      ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      ctx.fillText('There is nothing left in the ledger.', lx, c - scrollY + 8);
      c += 20;
    }

    // Divider, then the accepted journal (newest first) BELOW the offer.
    c += 4;
    ctx.strokeStyle = 'rgba(216,180,74,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, c - scrollY); ctx.lineTo(lx + cw, c - scrollY); ctx.stroke();
    c += 16;

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText('JOURNAL — ' + journal.length + ' / ' + QUEST_JOURNAL_MAX + ' of mine', lx, c - scrollY + 8);
    c += 16;
    if (!journal.length) {
      ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText(allDone ? 'Every deed is done. Walk in the Light.' : 'Empty — take up a deed above.', lx, c - scrollY + 9);
      c += 20;
    }
    for (const entry of journal.slice().reverse()) {   // newest first (owner rule v1.7.32)
      const qp = Hero.questProgress(entry);
      if (!qp.def) { Hero.abandonQuest(entry); continue; }   // stale save entry
      const def = qp.def, milestone = def.tid === 'reach';
      const expanded = UI.sel.qInfo === entry.idx;
      const yy = c - scrollY;
      // Roomier rows (v1.6.98 owner rule — "so it doesn't look so squished").
      if (vis(c, 54)) {
        ctx.fillStyle = expanded ? 'rgba(46,42,58,0.8)' : 'rgba(28,24,38,0.6)';
        rr(ctx, lx - 4, yy, cw + 8, 50, 6); ctx.fill();
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = milestone ? '#b06adf' : '#e8e0cc';
        ctx.fillText(this.fitText(ctx, (milestone ? '★ ' : '') + def.name, cw - 108), lx + 4, yy + 16);
        UI.bar(ctx, lx + 4, yy + 25, cw - 112, 9, qp.prog / def.need, '#221d2e', qp.done ? '#4ade80' : '#8a6f2a');
        ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
        ctx.fillText(qp.prog + ' / ' + def.need + '  ·  tap for details', lx + 4, yy + 45);
        // Tap the row body (left of the buttons) for full details + reward.
        UI.register(lx - 4, yy, cw - 102, 50, () => { UI.sel.qInfo = expanded ? null : entry.idx; });
        if (qp.done) {
          // Turn in right from the journal row.
          UI.btn(ctx, lx + cw - 94, yy + 8, 90, 34, '✔ TURN IN', () => {
            const rw = Hero.completeQuest(entry);
            if (!rw) return;
            if (rw.gemGot) UI.toast('Lukus presses a gem into your hand: ' + gemName(rw.gemGot), GEM_TYPES[rw.gemGot.type].color);
            UI.toast('Quest complete! +' + rw.gold.toLocaleString() + 'g, +' + rw.souls + ' souls  ·  ' + Hero.questLine + '/' + QUEST_COUNT, '#ffd76a');
            AudioSys.sfx('level');
          }, { size: 10, border: '#3a7a4a', color: '#4ade80' });
        } else if (!def.abs) {
          // Dropping returns the quest to Lukus's queue — nothing is lost.
          // The little empty plate carries DROP (v1.6.98 owner rule).
          UI.chip(ctx, lx + cw - 56, yy + 13, 52, 24, 'DROP', () => {
            Hero.abandonQuest(entry);
            UI.toast('Returned to Lukus: ' + def.name, '#9a9080');
          }, { size: 9, color: '#c98a8a' });
        }
      }
      c += 58;
      // Expanded details: the full deed + the EXACT reward it will pay
      // (compact reward text WRAPS onto two lines — never runs off, owner rule).
      if (expanded) {
        const eh = 92;
        const ey = c - scrollY;
        if (vis(c, eh)) {
          ctx.fillStyle = 'rgba(18,14,26,0.85)';
          rr(ctx, lx - 4, ey - 4, cw + 8, eh - 4, 6); ctx.fill();
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
          wrapText(ctx, def.desc, lx + 4, ey + 10, cw - 8, 13, 2);
          ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
          wrapText(ctx, 'REWARD:  ' + questRewardTextFor(entry, true), lx + 4, ey + 42, cw - 8, 11, 3);
          ctx.font = 'italic 8px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
          ctx.fillText('Quest ' + (entry.idx + 1) + ' of ' + QUEST_COUNT + (milestone ? '  ·  ★ milestone' : ''), lx + 4, ey + 84);
        }
        c += eh;
      }
    }

    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 8);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', lx + lw / 2, listTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', lx + lw / 2, viewBot - 2);
  },

  // Talk to ADDY, QUEEN OF THE UNDERWORLD — the rogue by the rift pavilion.
  // Her own 500-quest LEVEL-70 ledger, plus THE QUEEN'S ERRAND: one daily
  // deed paying a random Marquise gem + an odds-rolled legendary/artifact.
  // Same stage language as Lukus: her painted portrait on the right, the
  // dialog straight on the black, side-by-side even on phones.
  addy(ctx, W, H) {
    ctx.fillStyle = '#020104';
    ctx.fillRect(0, 0, W, H);

    const sf = UI.safe || { right: 0, bottom: 0 };
    const lefty = Settings.g && Settings.g.leftHanded;   // EXIT sits bottom-LEFT when mirrored
    const btnZone = (lefty ? 12 : 118) + (sf.right || 0);
    const img = Game.addyImg();
    const ready = img.complete && img.naturalWidth;
    const aspect = ready ? img.naturalWidth / img.naturalHeight : 0.8;
    let lx = Math.max(14, W * 0.04);

    let h = Math.min(H * 0.92, 640), w = h * aspect;
    const maxW = Math.max(120, (W - btnZone) * 0.5);
    if (w > maxW) { w = maxW; h = w / aspect; }
    let lw = Math.min(470, W - w - btnZone - lx - Math.max(12, W * 0.03));
    const nr = lw < 260;
    let px2, py2, feetY = H;
    if (nr) {
      lw = Math.floor(W * 0.52) - lx;
      const colL = lx + lw + 10, colR = W - 10;
      feetY = H - 148 - (sf.bottom || 0);
      w = Math.max(40, colR - colL); h = w / aspect;
      const maxH = Math.max(80, feetY - 30);
      if (h > maxH) { h = maxH; w = h * aspect; }
      px2 = colL + (colR - colL - w) / 2;
      py2 = feetY - h;
    } else {
      px2 = W - w - btnZone;
      py2 = H - h;
      // Desktop (owner rule v1.7.15): pure-black stage split in two — the
      // text column centers in the LEFT half, the figure in the RIGHT half.
      if (UI.desktop) {
        lw = Math.min(470, Math.floor(W * 0.42));
        lx = Math.max(14, Math.round(W * 0.25 - lw / 2));
        px2 = Math.round(W * 0.75 - w / 2);
      }
    }
    if (ready) {
      const bob = Math.sin(Game.time * 1.3) * 3;
      if (nr) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(px2 + w / 2, feetY - 3, w * 0.36, 8, 0, 0, TAU); ctx.fill();
      }
      ctx.drawImage(img, px2, py2 + bob, w, h);
    }

    // Text starts at the very top (owner rule: no wasted space on mobile).
    let y = 30 + ((UI.safe && UI.safe.top) || 0);
    const lvl70 = Hero.level >= 70;
    const journal = (Hero.journal || []).filter(e => e.src === 'A');
    const doneCount = clamp(Hero.addyLine || 0, 0, ADDY_QUEST_COUNT);
    const offerIdx = Hero.questOffer('A');

    // Name — full title only HERE (the street plate says just "Addy").
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (nr ? 13 : W < 520 ? 15 : 18) + 'px Cinzel, Georgia'; ctx.fillStyle = '#c86adf';
    ctx.shadowColor = 'rgba(200,106,223,0.45)'; ctx.shadowBlur = 12;
    ctx.fillText('🗡 ADDY, QUEEN OF THE UNDERWORLD', lx, y);
    ctx.shadowBlur = 0;
    y += 10;
    const rule = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    rule.addColorStop(0, 'rgba(200,106,223,0.6)'); rule.addColorStop(1, 'rgba(200,106,223,0)');
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
    y += 22;

    ctx.font = 'italic ' + (nr ? 12 : 13) + 'px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
    const greet = !lvl70
      ? '"Not yet, little corpse-raiser. The Underworld deals with professionals — come find me at level 70, and we\'ll talk business."'
      : '"So the Light\'s errand-runner finally graduated. I keep a different ledger — five hundred quests, paid better. And each day, one special quest for one very special stone."';
    y = wrapText(ctx, greet, lx, y, lw, nr ? 16 : 19, nr ? 7 : 5);
    y += 14;

    // Her ledger. The count drops to its own line when the column is too
    // narrow to share one (no overlap).
    ctx.font = 'bold ' + (nr ? 10 : 11) + 'px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText(nr ? 'UNDERWORLD LEDGER' : 'THE UNDERWORLD LEDGER', lx, y);
    y += 8;
    UI.bar(ctx, lx, y, lw, 5, doneCount / ADDY_QUEST_COUNT, '#221d2e', '#7a4a8f');
    y += 18;

    // ---- scrolling column: DAILY first, then her journal, then the offer.
    const listTop = y;
    const viewBot = H - (lefty ? 150 : 16);
    const viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: lx - 6, y: listTop - 4, w: lw + 12, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(lx - 6, listTop - 4, lw + 12, viewH + 8); ctx.clip();
    let c = listTop;
    // Reserve a right gutter for the skull scrollbar so the row plates never
    // sit under it (owner fix v1.7.31).
    const cw = lw - 26;
    const vis = (top, hh) => (top - scrollY + hh > listTop) && (top - scrollY < viewBot);

    if (!lvl70) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Her ledger opens at level 70.', lx, c - scrollY + 12);
      c += 24;
    } else {
      // THE QUEEN'S ERRAND — the daily.
      const st = Hero.dailyState();
      const dd = dailyDeed(st.date);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText(this.fitText(ctx, 'DAILY QUEST — "THE QUEEN\'S ERRAND"', cw), lx, c - scrollY + 8);
      c += 14;
      const dh = st.done ? 34 : st.base !== null ? 74 : 92;
      const dy2 = c - scrollY;
      if (vis(c, dh)) {
        ctx.fillStyle = 'rgba(46,30,54,0.75)';
        rr(ctx, lx - 4, dy2, cw + 8, dh - 4, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(200,106,223,0.45)'; ctx.lineWidth = 1;
        rr(ctx, lx - 4, dy2, cw + 8, dh - 4, 6); ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        if (st.done) {
          ctx.font = 'italic 11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          ctx.fillText('Paid in full. Come back tomorrow.', lx + 4, dy2 + 19);
        } else if (st.base !== null) {
          const prog = clamp(dd.counter() - st.base, 0, dd.need);
          const done = prog >= dd.need;
          ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = '#e8b3f2';
          ctx.fillText(this.fitText(ctx, dd.desc, cw - 100), lx + 4, dy2 + 15);
          UI.bar(ctx, lx + 4, dy2 + 22, cw - 106, 9, prog / dd.need, '#221d2e', done ? '#4ade80' : '#7a4a8f');
          ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          ctx.fillText(prog + ' / ' + dd.need, lx + 4, dy2 + 41);
          ctx.font = 'italic 8px Cinzel, Georgia'; ctx.fillStyle = '#b08ab8';
          ctx.fillText(this.fitText(ctx, 'Pays: a Marquise gem + a legendary (or better)', cw - 100), lx + 4, dy2 + 56);
          if (done) {
            UI.btn(ctx, lx + cw - 94, dy2 + 6, 90, 34, '✔ COLLECT', () => {
              const prize = Hero.completeDaily();
              if (!prize) return;
              UI.toast('The Queen pays: ' + gemName(prize.gem) + ' + ' + prize.item.name, RARITIES[prize.item.rarity].color);
              AudioSys.sfx('setdrop');
            }, { size: 10, border: '#3a7a4a', color: '#4ade80' });
          }
        } else {
          ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = '#e8b3f2';
          ctx.fillText(this.fitText(ctx, dd.desc, cw - 8), lx + 4, dy2 + 15);
          ctx.font = 'italic 9px Cinzel, Georgia'; ctx.fillStyle = '#b08ab8';
          wrapText(ctx, 'Pays: one random MARQUISE gem, plus a legendary — 90% plain, 6% 1–3★, 3% 4–5★, 1% ARTIFACT.', lx + 4, dy2 + 30, cw - 8, 12, 3);
          UI.btnPlate3(ctx, lx, dy2 + 62, cw, 24, 'DAILY QUEST', () => {
            const acc = Hero.acceptDaily();
            if (acc) { UI.toast("The Queen's Errand: " + acc.desc, '#c86adf'); AudioSys.sfx('gold'); }
          }, { size: 11, color: '#c86adf' });
        }
      }
      c += dh + 8;

      // NEXT QUEST on offer — at the TOP (below the daily) so accepting new
      // quests never needs a scroll (owner rule v1.7.32).
      if (offerIdx >= 0) {
        const def = ADDY_QUEST_LINE[offerIdx];
        const full = journal.length >= QUEST_JOURNAL_MAX;   // HER slots only — Lukus's ride separately
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
        ctx.fillText('NEXT QUEST', lx, c - scrollY + 6); c += 14;
        ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = '#c86adf';
        ctx.fillText(this.fitText(ctx, def.name.toUpperCase(), cw), lx, c - scrollY + 10); c += 16;
        ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
        const dBot = wrapText(ctx, def.desc, lx, c - scrollY + 10, cw, 15, nr ? 3 : 2);
        c += (dBot - (c - scrollY + 10)) + 4;
        ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
        const rBot = wrapText(ctx, 'Reward:  ' + questRewardTextSrc('A', offerIdx, true), lx, c - scrollY + 8, cw, 12, 2);
        c += (rBot - (c - scrollY + 8)) + 8;
        if (vis(c, 44)) {
          if (full) {
            UI.btn(ctx, lx, c - scrollY, cw, 40, 'JOURNAL FULL — ' + QUEST_JOURNAL_MAX + ' / ' + QUEST_JOURNAL_MAX,
              null, { size: 12, disabled: true, color: '#8a8070' });
          } else {
            UI.btnPlate2(ctx, lx, c - scrollY, cw, 40, 'ACCEPT QUEST', () => {
              const acc = Hero.acceptQuest('A');
              if (acc) { UI.toast('Quest accepted: ' + acc.name, '#c86adf'); AudioSys.sfx('gold'); }
            }, { size: 13, color: '#c86adf' });
          }
        }
        c += 48;
      } else if (!journal.length) {
        ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
        ctx.fillText('The Underworld ledger is closed. Impressive.', lx, c - scrollY + 8);
        c += 20;
      }

      // Divider, then her journal (newest first) BELOW the offer.
      c += 4;
      ctx.strokeStyle = 'rgba(200,106,223,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx, c - scrollY); ctx.lineTo(lx + cw, c - scrollY); ctx.stroke();
      c += 16;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText('JOURNAL — ' + journal.length + ' / ' + QUEST_JOURNAL_MAX + ' of mine', lx, c - scrollY + 8);
      c += 16;
      if (!journal.length) {
        ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ctx.fillText('No quests of mine in your book yet.', lx, c - scrollY + 9);
        c += 20;
      }
      for (const entry of journal.slice().reverse()) {   // newest first (owner rule v1.7.32)
        const qp = Hero.questProgress(entry);
        if (!qp.def) { Hero.abandonQuest(entry); continue; }
        const def = qp.def;
        const expanded = UI.sel.qInfo === 'A' + entry.idx;
        const yy = c - scrollY;
        if (vis(c, 54)) {
          ctx.fillStyle = expanded ? 'rgba(46,42,58,0.8)' : 'rgba(28,24,38,0.6)';
          rr(ctx, lx - 4, yy, cw + 8, 50, 6); ctx.fill();
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
          ctx.fillText(this.fitText(ctx, def.name, cw - 108), lx + 4, yy + 16);
          UI.bar(ctx, lx + 4, yy + 25, cw - 112, 9, qp.prog / def.need, '#221d2e', qp.done ? '#4ade80' : '#7a4a8f');
          ctx.font = '8px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
          ctx.fillText(qp.prog + ' / ' + def.need + '  ·  tap for details', lx + 4, yy + 45);
          UI.register(lx - 4, yy, cw - 102, 50, () => { UI.sel.qInfo = expanded ? null : 'A' + entry.idx; });
          if (qp.done) {
            UI.btn(ctx, lx + cw - 94, yy + 8, 90, 34, '✔ TURN IN', () => {
              const rw = Hero.completeQuest(entry);
              if (!rw) return;
              if (rw.gemGot) UI.toast('She flips you a gem: ' + gemName(rw.gemGot), GEM_TYPES[rw.gemGot.type].color);
              UI.toast('Quest complete! +' + rw.gold.toLocaleString() + 'g, +' + rw.souls + ' souls  ·  ' + Hero.addyLine + '/' + ADDY_QUEST_COUNT, '#c86adf');
              AudioSys.sfx('level');
            }, { size: 10, border: '#3a7a4a', color: '#4ade80' });
          } else {
            UI.chip(ctx, lx + cw - 56, yy + 13, 52, 24, 'DROP', () => {
              Hero.abandonQuest(entry);
              UI.toast('Returned to Addy: ' + def.name, '#9a9080');
            }, { size: 9, color: '#c98a8a' });
          }
        }
        c += 58;
        if (expanded) {
          const eh = 92;
          const ey = c - scrollY;
          if (vis(c, eh)) {
            ctx.fillStyle = 'rgba(18,14,26,0.85)';
            rr(ctx, lx - 4, ey - 4, cw + 8, eh - 4, 6); ctx.fill();
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            ctx.font = '10px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
            wrapText(ctx, def.desc, lx + 4, ey + 10, cw - 8, 13, 2);
            ctx.font = 'bold 9px Cinzel, Georgia'; ctx.fillStyle = '#c86adf';
            wrapText(ctx, 'REWARD:  ' + questRewardTextFor(entry, true), lx + 4, ey + 42, cw - 8, 11, 3);
            ctx.font = 'italic 8px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
            ctx.fillText('Quest ' + (entry.idx + 1) + ' of ' + ADDY_QUEST_COUNT, lx + 4, ey + 84);
          }
          c += eh;
        }
      }
    }

    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 8);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', lx + lw / 2, listTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', lx + lw / 2, viewBot - 2);
  },

  // Talk to LYSSA, MISTRESS OF FATE — the gambler at the rift pavilion steps
  // (owner rule, Kadala-style like Diablo 3): AMIDRASSI ORBS from rift and
  // season bosses buy weighted rolls of a chosen gear slot. Same stage
  // language as the other NPCs: her painting on the right, text on the black.
  lyssa(ctx, W, H) {
    ctx.fillStyle = '#020104';
    ctx.fillRect(0, 0, W, H);

    const sf = UI.safe || { right: 0, bottom: 0 };
    const lefty = Settings.g && Settings.g.leftHanded;   // EXIT sits bottom-LEFT when mirrored
    const btnZone = (lefty ? 12 : 118) + (sf.right || 0);
    const img = Game.lyssaImg();
    const ready = img.complete && img.naturalWidth;
    const aspect = ready ? img.naturalWidth / img.naturalHeight : 0.66;
    let lx = Math.max(14, W * 0.04);

    let h = Math.min(H * 0.92, 640), w = h * aspect;
    const maxW = Math.max(120, (W - btnZone) * 0.5);
    if (w > maxW) { w = maxW; h = w / aspect; }
    let lw = Math.min(470, W - w - btnZone - lx - Math.max(12, W * 0.03));
    const nr = lw < 260;
    let px2, py2, feetY = H;
    if (nr) {
      lw = Math.floor(W * 0.52) - lx;
      const colL = lx + lw + 10, colR = W - 10;
      feetY = H - 148 - (sf.bottom || 0);
      w = Math.max(40, colR - colL); h = w / aspect;
      const maxH = Math.max(80, feetY - 30);
      if (h > maxH) { h = maxH; w = h * aspect; }
      px2 = colL + (colR - colL - w) / 2;
      py2 = feetY - h;
    } else {
      px2 = W - w - btnZone;
      py2 = H - h;
      // Desktop (owner rule v1.7.15): pure-black stage split in two — the
      // text column centers in the LEFT half, the figure in the RIGHT half.
      if (UI.desktop) {
        lw = Math.min(470, Math.floor(W * 0.42));
        lx = Math.max(14, Math.round(W * 0.25 - lw / 2));
        px2 = Math.round(W * 0.75 - w / 2);
      }
    }
    if (ready) {
      const bob = Math.sin(Game.time * 1.2) * 3;
      if (nr) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath(); ctx.ellipse(px2 + w / 2, feetY - 3, w * 0.36, 8, 0, 0, TAU); ctx.fill();
      }
      ctx.drawImage(img, px2, py2 + bob, w, h);
    }

    // Text starts at the very top (owner rule: no wasted space on mobile).
    let y = 30 + ((UI.safe && UI.safe.top) || 0);

    // Name — full title only HERE (the street plate says just "Lyssa").
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (nr ? 13 : W < 520 ? 15 : 18) + 'px Cinzel, Georgia'; ctx.fillStyle = '#c88bf0';
    ctx.shadowColor = 'rgba(200,139,240,0.45)'; ctx.shadowBlur = 12;
    ctx.fillText('✦ LYSSA, MISTRESS OF FATE', lx, y);
    ctx.shadowBlur = 0;
    y += 10;
    const rule = ctx.createLinearGradient(lx, 0, lx + lw, 0);
    rule.addColorStop(0, 'rgba(200,139,240,0.6)'); rule.addColorStop(1, 'rgba(200,139,240,0)');
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke();
    y += 22;

    ctx.font = 'italic ' + (nr ? 12 : 13) + 'px Cinzel, Georgia'; ctx.fillStyle = '#e8e0cc';
    y = wrapText(ctx,
      '"Every Amidrassi Orb hums with a boss\'s dying breath. Give them to me and fate deals you a hand — no refunds, no promises. Only chance."',
      lx, y, lw, nr ? 16 : 19, nr ? 7 : 5);
    y += 12;

    // Orb purse. (The "Rift & Season bosses drop 1–10" footnote is gone —
    // owner rule v1.7.15.)
    ctx.font = 'bold ' + (nr ? 12 : 14) + 'px Cinzel, Georgia'; ctx.fillStyle = '#c88bf0';
    ctx.fillText('◉ ' + (Hero.amOrbs || 0).toLocaleString() + ' Amidrassi Orbs', lx, y + 4);
    y += nr ? 20 : 24;

    // Scrolling column: the last hand dealt, then the gamble table.
    const listTop = y;
    const viewBot = H - (lefty ? 150 : 16);
    const viewH = Math.max(60, viewBot - listTop);
    const scrollY = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = scrollY;
    UI.sel.scrollRegion = { x: lx - 6, y: listTop - 4, w: lw + 12, h: viewH + 8 };
    ctx.save();
    ctx.beginPath(); ctx.rect(lx - 6, listTop - 4, lw + 12, viewH + 8); ctx.clip();
    let c = listTop;
    const vis = (top, hh) => (top - scrollY + hh > listTop) && (top - scrollY < viewBot);

    // The last item fate dealt, in full.
    if (UI.sel.lastGamble) {
      const it = UI.sel.lastGamble;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
      ctx.fillText('FATE DEALT', lx, c - scrollY + 8);
      c += 14;
      const cardH = 30 + Items.statLines(it).length * 15 + 8;
      if (vis(c, cardH)) this.itemCard(ctx, lx, c - scrollY, lw, it, Hero.equipped[it.slot], true);
      c += cardH + 10;
    }

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText('GAMBLE — PICK A SLOT', lx, c - scrollY + 8);
    c += 16;
    const table = [
      ['helm', 'Helm'], ['shoulders', 'Shoulders'], ['chest', 'Chest Armor'],
      ['gloves', 'Gloves'], ['legs', 'Legs'], ['boots', 'Boots'],
      ['offhand', 'Phylactery'], ['ring', 'Ring'], ['weapon', 'Weapon'], ['amulet', 'Amulet']
    ];
    for (const [key, label] of table) {
      const cost = Items.GAMBLE_COSTS[key];
      const afford = (Hero.amOrbs || 0) >= cost;
      const yy = c - scrollY;
      if (vis(c, 38)) {
        UI.btnPlate2(ctx, lx - 4, yy, lw + 8, 34, '', afford ? () => {
          const it = Items.gambleItem(key);
          if (it) UI.sel.lastGamble = it;
        } : null, { disabled: !afford });
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = afford ? '#e8e0cc' : '#6f6552';
        ctx.fillText(label, lx + 20, yy + 17);
        ctx.textAlign = 'right';
        ctx.font = 'bold 11px Cinzel, Georgia'; ctx.fillStyle = afford ? '#c88bf0' : '#5a4a66';
        ctx.fillText('◉ ' + cost, lx + lw - 28, yy + 17);
      }
      c += 38;
    }
    ctx.restore();
    UI.sel.scrollMax = Math.max(0, (c - listTop) - viewH + 8);
    ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', lx + lw / 2, listTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag to scroll ▼', lx + lw / 2, viewBot - 2);
  },

  vendor(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const o = UI.sel.vendor;
    if (!o) { UI.close(); return; }
    // Two columns of half-width plates (owner rule v1.7.18 — never full
    // width); the panel anchors TOP on desktop so it's always fully visible.
    const twoColV = W >= 560;
    const pw = Math.min(twoColV ? 640 : 540, W - 20);
    const px = W / 2 - pw / 2;
    const rowsV = twoColV ? Math.ceil(o.stock.length / 2) : o.stock.length;
    const ph = Math.min(H - 20, 126 + rowsV * 40 + (UI.sel.buy ? 150 : 40));
    const py = UI.desktop ? 16 : Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, o.name || 'WANDERING MERCHANT');
    // The flavor line shares its row with the gold readout — fit it to the
    // space that's actually left so neither ever overlaps or runs off-panel.
    // Flavor WRAPS to two lines (owner rule — Jeweled Necessities was
    // getting clipped); gold sits right-aligned beneath it.
    ctx.font = 'italic 11px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    this.wrapCentered(ctx, o.flavor || '"Fine wares! Mostly. No refunds."', px + pw / 2, py + 52, pw - 44, 14, 2);
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold + ' gold', px + pw - 20, py + 88);

    let y = py + 96;
    if (!o.stock.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 12px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('The shelves are bare. Come back another day.', px + pw / 2, y + 14);
      y += 34;
    }
    const colW2 = twoColV ? (pw - 40) / 2 : pw - 28;
    o.stock.forEach((entry, ei) => {
      const it = entry.item;
      const selected = UI.sel.buy === entry;
      const cx2 = twoColV ? px + 14 + (ei % 2) * (colW2 + 12) : px + 14;
      const cy2 = y + (twoColV ? Math.floor(ei / 2) : ei) * 40;
      UI.btnPlate2(ctx, cx2, cy2, colW2, 34, '', entry.sold ? null : () => {
        UI.sel.buy = selected ? null : entry;
      }, { disabled: entry.sold });
      // Text + gold sit well clear of the plate's finial caps (owner rule).
      // 'Common' rarity is NEVER printed (owner rule v1.7.18).
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Cinzel, Georgia';
      ctx.fillStyle = entry.sold ? '#544d44' : RARITIES[it.rarity].color;
      ctx.fillText(this.fitText(ctx, it.name, colW2 - 116), cx2 + 26, cy2 + 12);
      ctx.font = '9px Cinzel, Georgia';
      ctx.fillStyle = entry.sold ? '#453f52' : '#8a8070';
      const sub = (it.shield ? 'Shield' : ITEM_SLOTS[it.slot].label) +
        (it.rarity > 0 ? ' · ' + RARITIES[it.rarity].name : '');
      ctx.fillText(this.fitText(ctx, sub, colW2 - 116), cx2 + 26, cy2 + 25);
      ctx.textAlign = 'right';
      ctx.font = 'bold 11px Cinzel, Georgia';
      ctx.fillStyle = entry.sold ? '#453f52' : (Hero.gold >= entry.price ? '#ffd76a' : '#8a5a5a');
      ctx.fillText(entry.sold ? 'SOLD' : entry.price + ' g', cx2 + colW2 - 26, cy2 + 17);
    });
    y += (twoColV ? Math.ceil(o.stock.length / 2) : o.stock.length) * 40;

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
    }
    // (no LEAVE button — the red ✕ / Escape are the exits, owner rule)
  },

  // -------------------------------------------------- town merchant (buy/sell)
  // A permanent shop reachable from the Town Portal menu and the camp. BUY tab:
  // a rotating 5-item stock scaled to the hero. SELL tab: turn bag gear into
  // gold (an alternative to salvaging it at the Blacksmith for materials).
  merchant(ctx, W, H) {
    this.dim(ctx, W, H);
    const big = W >= 760;
    const pw = Math.min(big ? 640 : 560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 20, big ? 620 : 560);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'TRAVELLING MERCHANT');

    if (!UI.sel.shopTab) UI.sel.shopTab = 'buy';
    const buying = UI.sel.shopTab === 'buy';
    const tw = (pw - 44) / 2;
    UI.btn(ctx, px + 16, py + 40, tw, 32, 'BUY',
      () => { UI.sel.shopTab = 'buy'; UI.sel.pick = null; UI.sel.scrollY = 0; },
      { size: 13, bg: buying ? 'rgba(70,54,30,0.95)' : undefined, border: buying ? '#ffd76a' : undefined, color: '#ffd76a' });
    UI.btn(ctx, px + 28 + tw, py + 40, tw, 32, 'SELL',
      () => { UI.sel.shopTab = 'sell'; UI.sel.pick = null; UI.sel.scrollY = 0; },
      { size: 13, bg: !buying ? 'rgba(70,54,30,0.95)' : undefined, border: !buying ? '#ffd76a' : undefined, color: '#ffd76a' });

    // Stock restocks every 10 minutes of play; kept on Game so the countdown is
    // meaningful across open/close (it regenerates on reload, which is fine).
    const REST = 600;
    if (!Game.merchantStock || (Game.time || 0) >= (Game.merchantRestockAt || 0)) {
      Game.merchantStock = Items.townStock();
      Game.merchantRestockAt = (Game.time || 0) + REST;
      UI.sel.pick = null;
    }
    const remain = Math.max(0, (Game.merchantRestockAt || 0) - (Game.time || 0));
    const cd = Math.floor(remain / 60) + ':' + String(Math.floor(remain % 60)).padStart(2, '0');

    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (big ? 15 : 13) + 'px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(Hero.gold.toLocaleString() + ' g', px + pw - 16, py + 88);

    // Merchant flavour — the BUY greeting carries the live restock countdown.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic ' + (big ? 12 : 11) + 'px Cinzel, Georgia'; ctx.fillStyle = '#b5ab94';
    let fBot;
    if (buying) {
      const flavor = 'Good to see you! I will have new items for ya in ' + cd + '. Why don\'t you look at what I\'ve got to sell ya, eh?';
      fBot = wrapText(ctx, flavor, px + 16, py + 82, pw - 96, big ? 17 : 15, 4);
    } else {
      ctx.fillText('"Coin for your cast-offs. Fair enough — one man\'s junk, eh?"', px + 16, py + 82);
      fBot = py + 92;
    }

    // Animated upgrade arrows (matches the inventory): 1/2/3 up = better, down =
    // worse, ▲▲▲ bobs + pulses green. No words — just the arrows (owner request).
    const drawArrows = (ax, ay, arrows) => {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (arrows === 3) {
        const phz = (Game.time || 0) * 4.2, bob = Math.sin(phz) * 2, pul = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(phz));
        ctx.font = 'bold ' + (big ? 14 : 12) + 'px Cinzel, Georgia';
        ctx.fillStyle = `rgba(74,222,128,${pul.toFixed(3)})`;
        ctx.fillText('▲▲▲', ax, ay + bob);
      } else {
        ctx.font = 'bold ' + (big ? 13 : 11) + 'px Cinzel, Georgia';
        ctx.fillStyle = arrows > 0 ? '#4ade80' : arrows < 0 ? '#e04a5a' : '#9a9080';
        ctx.fillText(arrows > 0 ? '▲'.repeat(arrows) : arrows < 0 ? '▼'.repeat(-arrows) : '—', ax, ay);
      }
    };

    const rowH = big ? 48 : 42, nameF = big ? 14 : 12, subF = big ? 11 : 10;
    const detailH = (buying && UI.sel.pick && !UI.sel.pick.sold && UI.sel.pick.kind === 'gear') ? (big ? 200 : 176) : 0;
    const bodyTop = Math.max(fBot + 12, py + 104), bodyBot = py + ph - 12 - detailH;
    const viewH = Math.max(rowH, bodyBot - bodyTop);

    if (buying) {
      const stock = Game.merchantStock;
      const scrollMax = Math.max(0, stock.length * rowH - viewH);
      const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
      UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
      UI.sel.scrollRegion = { x: px + 14, y: bodyTop, w: pw - 28, h: viewH };
      ctx.save(); ctx.beginPath(); ctx.rect(px + 14, bodyTop, pw - 28, viewH); ctx.clip();
      stock.forEach((entry, i) => {
        const y = bodyTop + i * rowH - scrollY;
        if (y + rowH - 6 < bodyTop || y > bodyBot) return;
        if (entry.kind === 'reagent') {
          const afford = Hero.gold >= entry.price;
          const mm = MATERIALS[entry.mat];
          UI.btn(ctx, px + 16, y, pw - 32, rowH - 6, '', entry.sold ? null : () => {
            if (Hero.gold < entry.price) { AudioSys.sfx('denied'); return; }
            Hero.gold -= entry.price; Hero.mats[entry.mat] = (Hero.mats[entry.mat] || 0) + entry.qty; entry.sold = true;
            UI.toast('Bought ' + entry.qty + ' ' + mm.name, mm.color); AudioSys.sfx('gold'); Hero.save();
          }, { disabled: entry.sold });
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = 'bold ' + nameF + 'px Cinzel, Georgia';
          ctx.fillStyle = entry.sold ? '#544d44' : mm.color;
          ctx.fillText(mm.name + '  ×' + entry.qty, px + 28, y + rowH / 2 - 7);
          ctx.font = subF + 'px Cinzel, Georgia'; ctx.fillStyle = entry.sold ? '#453f52' : '#8a8070';
          ctx.fillText('Reagent  ·  ' + Math.round(entry.price / entry.qty) + 'g each', px + 28, y + rowH / 2 + 8);
          ctx.textAlign = 'right'; ctx.font = 'bold ' + nameF + 'px Cinzel, Georgia';
          ctx.fillStyle = entry.sold ? '#453f52' : (afford ? '#ffd76a' : '#8a5a5a');
          ctx.fillText(entry.sold ? 'SOLD' : entry.price + ' g', px + pw - 30, y + rowH / 2);
          return;
        }
        const it = entry.item, sel = UI.sel.pick === entry;
        UI.btn(ctx, px + 16, y, pw - 32, rowH - 6, '', entry.sold ? null : () => { UI.sel.pick = sel ? null : entry; },
          { disabled: entry.sold, bg: sel ? 'rgba(70,54,44,0.95)' : undefined, border: sel ? '#ffd76a' : undefined });
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold ' + nameF + 'px Cinzel, Georgia';
        ctx.fillStyle = entry.sold ? '#544d44' : RARITIES[it.rarity].color;
        ctx.fillText(this.fitText(ctx, it.name, pw - 170), px + 28, y + rowH / 2 - 7);
        ctx.font = subF + 'px Cinzel, Georgia'; ctx.fillStyle = entry.sold ? '#453f52' : '#8a8070';
        ctx.fillText(ITEM_SLOTS[it.slot].label + ' · ' + RARITIES[it.rarity].name, px + 28, y + rowH / 2 + 8);
        ctx.textAlign = 'right'; ctx.font = 'bold ' + nameF + 'px Cinzel, Georgia';
        ctx.fillStyle = entry.sold ? '#453f52' : (Hero.gold >= entry.price ? '#ffd76a' : '#8a5a5a');
        ctx.fillText(entry.sold ? 'SOLD' : entry.price + ' g', px + pw - 30, y + rowH / 2 - 7);
        if (!entry.sold) drawArrows(px + pw - 30, y + rowH / 2 + 9, Items.compareArrows(it, Hero.equipped[it.slot]));
      });
      ctx.restore();
      if (detailH) {
        const entry = UI.sel.pick;
        let dy = bodyBot + 6;
        // No comparison arrows in the stats card — the row already shows them.
        dy = this.itemCard(ctx, px + 14, dy, pw - 28, entry.item, null, true);
        const afford = Hero.gold >= entry.price;
        const bw2 = (pw - 36) * 0.62;
        UI.btn(ctx, px + 14, dy, bw2, 34, afford ? `BUY — ${entry.price}g` : `NEED ${entry.price}g`,
          afford ? () => {
            Hero.gold -= entry.price; entry.sold = true; Items.stash(entry.item);
            UI.toast('Bought: ' + entry.item.name, RARITIES[entry.item.rarity].color); AudioSys.sfx('gold'); Hero.save(); UI.sel.pick = null;
          } : null, { size: 12, disabled: !afford, border: '#8a6f4a', color: '#ffd76a' });
        UI.btn(ctx, px + 22 + bw2, dy, pw - 36 - bw2, 34, 'CANCEL', () => { UI.sel.pick = null; }, { size: 12 });
      }
    } else {
      const items = Hero.bag.filter(it => it && !it.torch)
        .sort((a, b) => Items.sellValue(b) - Items.sellValue(a));   // highest sell price on top
      if (!items.length) {
        ctx.textAlign = 'center'; ctx.font = 'italic ' + (big ? 14 : 12) + 'px Cinzel, Georgia'; ctx.fillStyle = '#544d44';
        ctx.fillText('Your bag has no gear to sell.', W / 2, bodyTop + 30);
      } else {
        const scrollMax = Math.max(0, items.length * rowH - viewH);
        const scrollY = clamp(UI.sel.scrollY || 0, 0, scrollMax);
        UI.sel.scrollY = scrollY; UI.sel.scrollMax = scrollMax;
        UI.sel.scrollRegion = { x: px + 14, y: bodyTop, w: pw - 28, h: viewH };
        ctx.save(); ctx.beginPath(); ctx.rect(px + 14, bodyTop, pw - 28, viewH); ctx.clip();
        items.forEach((it, i) => {
          const y = bodyTop + i * rowH - scrollY;
          if (y + rowH - 6 < bodyTop || y > bodyBot) return;
          const val = Items.sellValue(it);
          ctx.fillStyle = 'rgba(28,24,38,0.92)';
          rr(ctx, px + 16, y, pw - 32, rowH - 6, 6); ctx.fill();
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = 'bold ' + nameF + 'px Cinzel, Georgia'; ctx.fillStyle = RARITIES[it.rarity].color;
          ctx.fillText(this.fitText(ctx, it.name, pw - 200), px + 28, y + rowH / 2 - 7);
          ctx.font = subF + 'px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
          ctx.fillText(ITEM_SLOTS[it.slot].label + (it.stars ? '  ' + '★'.repeat(it.stars) : ''), px + 28, y + rowH / 2 + 8);
          UI.btn(ctx, px + pw - 158, y + (rowH - 6 - 28) / 2, 136, 28, 'SELL  ' + val + 'g',
            () => {
              const k = Hero.bag.indexOf(it);
              if (k >= 0) { Hero.bag.splice(k, 1); Hero.gold += val; UI.toast('Sold ' + it.name + '  +' + val + 'g', '#ffd76a'); AudioSys.sfx('gold'); Hero.save(); }
            }, { size: big ? 12 : 11, border: '#8a6f4a', color: '#ffd76a' });
        });
        ctx.restore();
      }
    }
    if ((UI.sel.scrollMax || 0) > 0 && !detailH) {
      ctx.textAlign = 'center'; ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('▼ drag for more ▼', W / 2, bodyBot - 2);
    }
  },

  // ------------------------------------------------------------ settings

  settings(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(660, W - 20);
    const px = W / 2 - pw / 2;
    // ONE column, padded in from both edges (owner rule v1.7.5).
    const twoCol = false;
    const ph = Math.min(H - 36, 720);   // always daylight above and below
    const compact = H < 720;   // tighten spacing on short phones
    const audioStep = compact ? 36 : 42;
    const rowStep = compact ? 28 : 34;
    const py = Math.max(14, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'SETTINGS');

    // Tabs: options · keybindings · manual save slots.
    if (!UI.sel.stab) UI.sel.stab = 'options';
    const tabs = [['options', 'OPTIONS'], ['keys', 'KEYS'], ['saves', 'SAVES']];
    const tw = (pw - 48) / 3;
    tabs.forEach((t, i) => {
      // Simple-plate tabs (v1.6.96): the selected tab reads bright, the rest dim.
      UI.btnPlate2(ctx, px + 16 + i * (tw + 8), py + 46, tw, 30, t[1], () => { UI.sel.stab = t[0]; UI.sel.rebindAction = null; },
        { size: 12, color: UI.sel.stab === t[0] ? '#f0dcae' : '#8a8070' });
    });
    UI.sel.scrollRegion = null;   // (options tab sets its own below; others don't scroll)
    if (UI.sel.stab === 'saves') { this.savesTab(ctx, W, H, px, py, pw, ph); return; }
    if (UI.sel.stab === 'keys') { this.keysTab(ctx, W, H, px, py, pw, ph); return; }

    // The options list can exceed the panel on phones — DRAG it up/down to
    // scroll (touch/mouse/wheel), clipped to the panel body below the tabs.
    const bodyTop = py + 84, bodyBot = py + ph - 8;
    const sc = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = sc;
    UI.sel.scrollRegion = { x: px + 2, y: bodyTop, w: pw - 4, h: bodyBot - bodyTop };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 2, bodyTop, pw - 4, bodyBot - bodyTop); ctx.clip();

    // ---- audio: slider + mute per channel (Weather FX removed v1.7.15,
    // owner rule — weather loops now ride the Ambience channel) ----
    const chans = [
      ['master', 'Master volume'],
      ['sfx', 'Sound FX'],
      ['music', 'Music'],
      ['ambience', 'Ambience FX']
    ];
    const colW = pw - 96;   // padded 48px each side (owner rule)
    let ay = py + 98 - sc;
    ctx.textAlign = 'left';
    ctx.font = '600 12px Cinzel, Georgia';
    ctx.fillStyle = '#d8c5a0';
    ctx.fillText('— AUDIO —', px + 48, ay);
    ay += 14;
    for (const [chan, label] of chans) {
      const a = Settings.audio[chan];
      ctx.font = '12px Cinzel, Georgia';
      ctx.fillStyle = '#c9bfa8';
      ctx.textAlign = 'left';
      ctx.fillText(label, px + 48, ay + 6);
      ctx.textAlign = 'right';
      ctx.fillStyle = a.mute ? '#8a5a5a' : '#9a9080';
      ctx.fillText(a.mute ? 'muted' : Math.round(a.v * 100) + '%', px + 48 + colW - 66, ay + 6);
      UI.slider(ctx, px + 48, ay + 12, colW - 76, a.v, v => {
        a.v = v;
        Settings.save();
      });
      UI.check(ctx, px + 48 + colW - 56, ay + 2, a.mute, () => {
        a.mute = !a.mute;
        Settings.save();
      }, 'mute');
      ay += audioStep;
    }
    // Mono — fold the effects/ambience/weather/built-in score to one channel for
    // a single or mono Bluetooth speaker. (Uploaded music tracks are unaffected.)
    UI.check(ctx, px + 48, ay - 2, Settings.g.mono, () => {
      Settings.g.mono = !Settings.g.mono;
      Settings.save();
      AudioSys.applyOutputRouting();
      UI.toast(Settings.g.mono ? 'Mono audio ON (single speaker)' : 'Stereo audio ON', '#6ff7c3');
    }, 'Mono audio (single speaker)');
    ay += audioStep;

    // ---- gameplay (Diablo-Immortal-style options) ----
    let gx = px + 48;
    let gy = ay + 24;   // clear the last audio slider
    ctx.textAlign = 'left';
    ctx.font = '600 12px Cinzel, Georgia';
    ctx.fillStyle = '#d8c5a0';
    // ---- MOVEMENT (desktop only, owner rule v1.7.16): click-to-move is
    // always on; WASD keys are the optional extra scheme. ----
    if (UI.desktop) {
      ctx.fillText('— MOVEMENT —', gx, gy - 14);
      UI.check(ctx, gx, gy, Settings.g.wasdMove !== false, () => {
        Settings.g.wasdMove = Settings.g.wasdMove === false;
        Settings.save();
        UI.toast(Settings.g.wasdMove !== false ? 'WASD movement ON (click-to-move stays)' : 'Click-to-move only', '#cfc8b8');
      }, 'WASD movement keys (click-to-move is always on)');
      gy += rowStep + 24;
      ctx.font = '600 12px Cinzel, Georgia';
      ctx.fillStyle = '#d8c5a0';
      // ---- RENDERING (v1.7.18 owner report: screen tearing) ----
      ctx.fillText('— RENDERING —', gx, gy - 14);
      UI.check(ctx, gx, gy, Settings.g.vsync !== false, () => {
        Settings.g.vsync = Settings.g.vsync === false;
        Settings.save();
        UI.toast('V-Sync ' + (Settings.g.vsync !== false ? 'ON' : 'OFF') + ' — reload the game to apply', '#cfc8b8');
      }, 'V-Sync (prevents screen tearing · applies after reload)');
      gy += rowStep + 24;
      ctx.font = '600 12px Cinzel, Georgia';
      ctx.fillStyle = '#d8c5a0';
    }
    ctx.fillText('— GAMEPLAY —', gx, gy - 14);
    // Elective Mode — allow more than one skill from a category on the action
    // bar. Toggling it re-sanitizes the loadout under the new rule.
    UI.check(ctx, gx, gy, Settings.g.electiveMode, () => {
      Settings.g.electiveMode = !Settings.g.electiveMode;
      Settings.save();
      Hero.sanitize();
      Hero.save();
      UI.toast(Settings.g.electiveMode ? 'Elective Mode ON — any skill in any slot' : 'Elective Mode OFF — one skill per category', '#6ff7c3');
    }, 'Elective Mode (multiple skills per category)');
    gy += rowStep;
    // Inventory layout — the radial wheel, or a grouped category list
    // (Helm → Shoulders → … → Torch), owner rule.
    UI.check(ctx, gx, gy, Settings.g.invGrouped, () => {
      Settings.g.invGrouped = !Settings.g.invGrouped;
      Settings.save();
      UI.toast(Settings.g.invGrouped ? 'Inventory: GROUPED list' : 'Inventory: RADIAL wheel', '#6ff7c3');
    }, 'Inventory: Grouped list (off = radial wheel)');
    gy += rowStep;
    // Handedness — right-handed is the designed default; left-handed mirrors
    // the skill cluster / potion / portal / town button to the LEFT side and
    // moves the movement half to the right (owner rule).
    UI.check(ctx, gx, gy, Settings.g.leftHanded, () => {
      Settings.g.leftHanded = !Settings.g.leftHanded;
      Settings.save();
      UI.layout(Game.W, Game.H);   // re-anchor the cluster right away
      UI.toast(Settings.g.leftHanded ? 'LEFT-HANDED — cluster on the left, move on the right' : 'RIGHT-HANDED controls', '#6ff7c3');
    }, 'Left-handed mode (mirror controls)');
    gy += rowStep;
    // Full screen — hide the browser's address bar / chrome (live browser state,
    // not a saved toggle; the checkbox mirrors it). ONLY shown where the
    // Fullscreen API works (Android/desktop); iOS Safari can't do it, so the
    // toggle is hidden there (Add to Home Screen is the iOS route instead).
    if (Game.fullscreenSupported()) {
      UI.check(ctx, gx, gy, !!Game.fullscreenEl(), () => {
        Game.toggleFullscreen();
      }, 'Full screen (hide address bar)');
      gy += rowStep;
    }
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

    // (The Camera-view chip is GONE — v1.7.9 owner rule: Top Down is the only
    // camera; Game.topDown() is hard-wired true.)

    // Loot announcement — position and layout style.
    const lpos = ['bottom', 'middle', 'top'];
    ctx.textAlign = 'left'; ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Loot text position', gx, gy + 14);
    UI.chip(ctx, gx + colW - 118, gy + 1, 118, 26, (Settings.g.lootPos || 'bottom').toUpperCase(), () => {
      Settings.g.lootPos = lpos[(lpos.indexOf(Settings.g.lootPos || 'bottom') + 1) % lpos.length];
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;
    ctx.textAlign = 'left'; ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Loot text style', gx, gy + 14);
    UI.chip(ctx, gx + colW - 118, gy + 1, 118, 26, (Settings.g.lootStyle || 'line') === 'arc' ? 'ARC' : 'STRAIGHT', () => {
      Settings.g.lootStyle = (Settings.g.lootStyle || 'line') === 'line' ? 'arc' : 'line';
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;

    // Bone-hand mouse cursor size (desktop pointer). 1× / 2× / 3×.
    const cscale = clamp(Settings.g.cursorScale || 1, 1, 3);
    ctx.textAlign = 'left'; ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Bone cursor size', gx, gy + 14);
    UI.chip(ctx, gx + colW - 118, gy + 1, 118, 26, cscale + '×', () => {
      Settings.g.cursorScale = (cscale % 3) + 1;   // 1 → 2 → 3 → 1
      Settings.save();
      if (typeof Game !== 'undefined') Game.applyCursor();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;

    // Global UI font size — – / + between 8 and 22 (owner request). Scales ALL
    // on-screen text live, so the change is visible immediately.
    const fsz = clamp(Settings.g.fontSize || 13, 8, 22);
    ctx.textAlign = 'left'; ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Font size', gx, gy + 14);
    if (!UI.iconPlate(ctx, 'minus', gx + colW - 118, gy + 1, 34, 26,
      fsz > 8 ? () => { Settings.g.fontSize = clamp(fsz - 1, 8, 22); Settings.save(); } : null,
      { disabled: fsz <= 8, label: 'font-' }))
      UI.btn(ctx, gx + colW - 118, gy + 1, 34, 26, '–',
        fsz > 8 ? () => { Settings.g.fontSize = clamp(fsz - 1, 8, 22); Settings.save(); } : null,
        { size: 15, disabled: fsz <= 8, border: '#8a6f4a', color: '#ffd76a' });
    ctx.textAlign = 'center'; ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = '#ffd76a';
    ctx.fillText(String(fsz), gx + colW - 59, gy + 15);
    if (!UI.iconPlate(ctx, 'plus', gx + colW - 34, gy + 1, 34, 26,
      fsz < 22 ? () => { Settings.g.fontSize = clamp(fsz + 1, 8, 22); Settings.save(); } : null,
      { disabled: fsz >= 22, label: 'font+' }))
      UI.btn(ctx, gx + colW - 34, gy + 1, 34, 26, '+',
        fsz < 22 ? () => { Settings.g.fontSize = clamp(fsz + 1, 8, 22); Settings.save(); } : null,
        { size: 15, disabled: fsz >= 22, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;

    // Corpse limit — corpses linger until this many exist, then the oldest fade.
    const caps = [100, 500, 1000, 2500, 5000, 10000];
    const curCap = Settings.g.corpseCap || 100;
    ctx.textAlign = 'left';
    ctx.font = '12px Cinzel, Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Corpse limit', gx, gy + 14);
    UI.chip(ctx, gx + colW - 118, gy + 1, 118, 26, curCap.toLocaleString(), () => {
      Settings.g.corpseCap = caps[(caps.indexOf(curCap) + 1) % caps.length];
      Settings.save();
    }, { size: 12, border: '#8a6f4a', color: '#ffd76a' });
    gy += 30;
    ctx.textAlign = 'left';   // UI.btn left it centered
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, 'Bodies linger as necro fuel; raise it to stress-test.', colW), gx, gy + 2);
    gy += compact ? 16 : 22;

    // About — the game's creator (dev panel) and version (patch notes).
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px Cinzel, Georgia';
    ctx.fillStyle = '#57b894';
    ctx.fillText('— ABOUT —', gx, gy + 6);
    gy += 14;
    const abw = (colW - 8) / 2;
    const abh = compact ? 28 : 30;
    UI.chip(ctx, gx, gy, abw, abh, 'Game creator', () => UI.open('devconfirm'), { size: 11 });
    UI.chip(ctx, gx + abw + 8, gy, abw, abh, GAME_VERSION, () => UI.open('patchnotes'), { size: 11 });
    ctx.restore();   // end scroll clip

    // How far the content overruns the panel body → the scrollable range.
    UI.sel.scrollMax = Math.max(0, (gy + sc + abh + 12) - bodyBot);
    if (UI.sel.scrollMax > 0) {
      ctx.textAlign = 'center';
      ctx.font = '9px Cinzel, Georgia';
      ctx.fillStyle = '#6f6552';
      if (sc > 1) ctx.fillText('▲ drag ▲', W / 2, bodyTop + 3);
      if (sc < UI.sel.scrollMax - 1) ctx.fillText('▼ drag to scroll ▼', W / 2, bodyBot - 3);
    }
  },

  // ------------------------------------------------------- manual saves

  // Copy the current hero's save code to the clipboard and show it (canvas game
  // has no text field, so a native prompt lets the player select/copy manually).
  exportSave() {
    const code = Saves.exportCode();
    if (!code) { UI.toast('Export failed', '#e04a5a'); AudioSys.sfx('denied'); return; }
    let copied = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code); copied = true; } } catch (e) { /* ignore */ }
    try { window.prompt(copied ? 'Copied to clipboard! Or copy your save code here:' : 'Copy your save code:', code); } catch (e) { /* prompt blocked */ }
    UI.toast(copied ? 'Save code copied to clipboard' : 'Save code shown — copy it to back up', '#ffd76a');
    AudioSys.sfx('gem');
  },

  // Paste a save code to REPLACE the current hero.
  importSave() {
    let str = null;
    try { str = window.prompt('Paste a save code to REPLACE your current hero:'); } catch (e) { UI.toast('Paste is unavailable in this browser', '#e04a5a'); return; }
    if (str == null || str.trim() === '') return;
    if (Saves.importCode(str)) {
      UI.toast('Save imported — welcome back, ' + Hero.name, '#6ff7c3');
      AudioSys.sfx('level');
      UI.close();
      Game.enterTown();   // the town is the first map after a load (owner rule)
    } else {
      UI.toast('That doesn\'t look like a valid save code', '#e04a5a');
      AudioSys.sfx('denied');
    }
  },

  savesTab(ctx, W, H, px, py, pw, ph) {
    const saves = Saves.list();
    // "Save Hero" — narrower than the panel, centered (owner rule v1.7.1).
    const shw = Math.min(300, pw * 0.62);
    UI.btnPlate2(ctx, px + pw / 2 - shw / 2, py + 84, shw, 34,
      saves.length >= Saves.MAX ? 'ALL 20 SLOTS FULL' : 'SAVE HERO  (' + saves.length + ' / ' + Saves.MAX + ')',
      saves.length >= Saves.MAX ? null : () => Saves.add(),
      { size: 13, disabled: saves.length >= Saves.MAX, color: '#a8d9be' });

    // Portable export / import — move a hero between browsers or devices.
    // Sits BELOW the Save Hero plate (which ends at py+118) so they never overlap.
    const halfW = (pw - 40) / 2;
    UI.btnPlate2(ctx, px + 16, py + 126, halfW, 30, 'EXPORT CODE', () => this.exportSave(),
      { size: 11 });
    UI.btnPlate2(ctx, px + 24 + halfW, py + 126, halfW, 30, 'IMPORT CODE', () => this.importSave(),
      { size: 11 });

    if (!saves.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'italic 12px Cinzel, Georgia';
      ctx.fillStyle = '#544d44';
      ctx.fillText('No manual saves yet. The game still autosaves constantly.', W / 2, py + 186);
      return;
    }
    let y = py + 170;
    const rowH = Math.min(30, (ph - 190) / Math.max(1, saves.length));
    saves.forEach((s, i) => {
      if (y > py + ph - 26) return;
      ctx.fillStyle = 'rgba(28,24,38,0.92)';
      rr(ctx, px + 16, y, pw - 32, rowH - 4, 5); ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px Cinzel, Georgia';
      ctx.fillStyle = '#e8e0cc';
      ctx.fillText(this.fitText(ctx, s.name, pw - 240), px + 26, y + rowH / 2 - 2);
      ctx.font = '10px Cinzel, Georgia';
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
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText('Saves live in this browser (localStorage). Loading replaces your current hero.', W / 2, py + ph - 14);
  },

  // ------------------------------------------------- keybindings (desktop)

  keysTab(ctx, W, H, px, py, pw, ph) {
    const narrow = pw < 480;
    // The flavor lines sit LOW enough to clear the tab plates (owner fix)
    // and ONLY show on desktop (they describe keyboard controls).
    let listTop = py + 92;
    if (UI.desktop) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#9a9080';
      ctx.fillText('Keyboard controls (desktop)', px + pw / 2, py + 100);
      ctx.fillText('Tap a key to remove it · ＋ to add one', px + pw / 2, py + 116);
      listTop = py + 132;
    }
    const listBot = py + ph - 44;
    const cols = narrow ? 1 : 2;
    const gap = 16;
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
      ctx.font = '11px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
      ctx.fillText(this.fitText(ctx, label, labelW - 4), x, y + rowH / 2);

      const chipY = y + (rowH - 18) / 2;
      const addX = x + colW - 20;
      let cxp = x + labelW;
      if (UI.sel.rebindAction === id) {
        ctx.fillStyle = '#6ff7c3'; ctx.font = 'italic 11px Cinzel, Georgia';
        ctx.fillText('press a key…', cxp, y + rowH / 2);
      } else {
        for (const code of (Settings.keys[id] || [])) {
          ctx.font = 'bold 10px Cinzel, Georgia';
          const name = keyName(code);
          const chw = Math.min(58, ctx.measureText(name).width + 12);
          if (cxp + chw > addX - 18) {   // clear the painted ＋ plate
            ctx.fillStyle = '#6f6552'; ctx.font = '10px Cinzel, Georgia';
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
      // ＋ add — enter listening mode for the next keypress. Painted plus
      // plate (v1.6.97 owner rule), procedural chip until the art loads.
      if (!UI.iconPlate(ctx, 'plus', addX - 14, chipY, 32, 18, () => { UI.sel.rebindAction = id; }, { label: 'bind+' })) {
        ctx.fillStyle = 'rgba(28,40,32,0.95)';
        rr(ctx, addX, chipY, 18, 18, 4); ctx.fill();
        ctx.strokeStyle = '#3a7a4a'; ctx.lineWidth = 1;
        rr(ctx, addX, chipY, 18, 18, 4); ctx.stroke();
        ctx.fillStyle = '#6ff7c3'; ctx.font = 'bold 14px Cinzel, Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', addX + 9, chipY + 9);
        UI.register(addX, chipY, 18, 18, () => { UI.sel.rebindAction = id; });
      }
      ctx.textAlign = 'left';
    });

    UI.btnPlate2(ctx, px + 16, py + ph - 38, pw - 32, 28, 'RESET TO DEFAULTS', () => {
      Settings.resetKeys();
      UI.sel.rebindAction = null;
    }, { size: 11, color: '#e08a96' });
  },

  // ------------------------------------------------- dev panel & cheats

  devconfirm(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    // Roomier, centered, wrapped — nothing clipped (owner rule v1.7.2).
    const pw = Math.min(420, W - 30);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 20, 390);
    const py = Math.max(16, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'THE CREATOR');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 19px Cinzel, Georgia';
    ctx.fillStyle = '#cfc8b8';
    ctx.fillText('NEKROMANCER', W / 2, py + 60);
    ctx.font = 'italic 11px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    this.wrapCentered(ctx, 'A Diablo-inspired dungeon-crawling ARPG', W / 2, py + 86, pw - 50, 15, 2);
    ctx.font = 'bold 13px Cinzel, Georgia';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('Created by Sterling Grant', W / 2, py + 122);
    ctx.font = '11px Cinzel, Georgia';
    ctx.fillStyle = '#b5ab94';
    this.wrapCentered(ctx, 'A fan-built game made with love for the Necromancers of Bellmahath · 2026', W / 2, py + 148, pw - 60, 15, 3);
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    this.wrapCentered(ctx, 'Pure HTML / CSS / JS · no engine · everything procedural', W / 2, py + 196, pw - 60, 14, 2);
    ctx.fillStyle = '#57b894';
    ctx.fillText(GAME_VERSION, W / 2, py + 234);

    // Dev-panel gate (checkbox reveals the button).
    if (UI.sel.devToggle === undefined) UI.sel.devToggle = false;
    UI.check(ctx, W / 2 - 66, py + 262, UI.sel.devToggle, () => {
      UI.sel.devToggle = !UI.sel.devToggle;
    }, 'Enable dev panel');
    // Compact centered pair — never the full panel width (owner rule v1.7.15).
    const bw = Math.min(140, (pw - 44) / 2);
    const bx0 = W / 2 - bw - 7;
    UI.btnPlate2(ctx, bx0, py + ph - 56, bw, 38, 'DEV PANEL',
      UI.sel.devToggle ? () => UI.open('cheats') : null,
      { size: 13, disabled: !UI.sel.devToggle, color: '#e08a96' });
    UI.btnPlate2(ctx, W / 2 + 7, py + ph - 56, bw, 38, 'CLOSE', () => UI.close(), { size: 13 });
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

  // Spawn ONE reagent boss near the hero (dev). Each boss has its own button.
  spawnDevBoss(type, opts, label) {
    if (Game.state !== 'playing' || !Game.player || Game.player.dead) {
      UI.toast('Enter a zone first', '#9a9080'); AudioSys.sfx('denied'); return;
    }
    const p = Game.player;
    const a = Math.random() * TAU;
    const e = new Enemy(type, p.x + Math.cos(a) * 170, p.y + Math.sin(a) * 170,
      Object.assign({ name: MONSTERS[type].name }, opts || {}));
    e.sleep = false; e.spawnT = 0.3;
    World.collide(e); Game.enemies.push(e);
    UI.toast('Spawned ' + (label || MONSTERS[type].name), '#ff8c2a');
    UI.close();
  },

  cheats(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 594);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, '☠ DEV CHEATS ☠');

    // The list has grown past one screen, so the body DRAG-scrolls (touch/mouse/
    // wheel) like the inventory/Mystic. Each cheat is its own full-width row,
    // grouped under a category header. Rows outside the view are culled so their
    // taps aren't registered.
    const bodyTop = py + 42, bodyBot = py + ph - 10;
    const viewH = bodyBot - bodyTop;
    const sc = clamp(UI.sel.scrollY || 0, 0, UI.sel.scrollMax || 0);
    UI.sel.scrollY = sc;
    UI.sel.scrollRegion = { x: px + 2, y: bodyTop, w: pw - 4, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 2, bodyTop, pw - 4, viewH); ctx.clip();

    const rowH = 30, gap = 6, rowW = pw - 32;
    let y = 4;                                   // content-space cursor
    const sy = () => bodyTop + y - sc;           // → screen y for the cursor
    const vis = h => sy() + h > bodyTop && sy() < bodyBot;
    const section = title => {
      y += 12;
      if (vis(18)) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#57b894';
        ctx.fillText('— ' + title + ' —', px + 16, sy() + 9);
      }
      y += 24;
    };
    const row = (label, cb, opts) => {
      if (vis(rowH)) UI.btn(ctx, px + 16, sy(), rowW, rowH, label, cb, Object.assign({ size: 12 }, opts || {}));
      y += rowH + gap;
    };
    const check = (label, checked, cb) => {
      if (vis(24)) UI.check(ctx, px + 16, sy(), checked, cb, label);
      y += 32;
    };

    // ---- TOGGLES ----
    section('Toggles');
    check('Immortality (god mode)', Hero.cheats.god, () => { Hero.cheats.god = !Hero.cheats.god; Hero.save(); });
    check('Infinite essence (mana/rage/energy)', Hero.cheats.essence, () => { Hero.cheats.essence = !Hero.cheats.essence; Hero.save(); });
    // Enemy spawn boost slider — multiplies pack sizes/counts, +0%…+1000%.
    if (vis(30)) {
      ctx.textAlign = 'left'; ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
      ctx.fillText('Enemy spawn boost', px + 16, sy() + 6);
      ctx.textAlign = 'right'; ctx.font = 'bold 12px Cinzel, Georgia'; ctx.fillStyle = '#ffb43a';
      ctx.fillText('+' + Math.round((Hero.cheats.spawn || 0) * 100) + '%', px + pw - 16, sy() + 6);
      UI.slider(ctx, px + 16, sy() + 12, pw - 32, clamp((Hero.cheats.spawn || 0) / 10, 0, 1), v => {
        Hero.cheats.spawn = Math.round(v * 100) / 10; Hero.save();
      });
    }
    y += 34;

    // ---- DISPLAY ----
    section('Display');
    check('Desktop HUD on tablet (auto-shrinks to fit)', !!(Settings.g && Settings.g.forceDesktopHud), () => {
      Settings.g.forceDesktopHud = !Settings.g.forceDesktopHud;
      Settings.save();
      UI.layout(Game.W, Game.H);   // re-fit the HUD immediately
      UI.toast(Settings.g.forceDesktopHud ? 'Desktop HUD ON (tablet)' : 'Desktop HUD OFF', '#8fd0ff');
    });

    // ---- CHARACTER ----
    const paraOpt = { color: '#ffb86a', border: '#8a6f2a' };
    section('Character');
    row('+1 level', () => Hero.grantLevels(1));
    row('+5 levels', () => Hero.grantLevels(5));
    row('+10 levels', () => Hero.grantLevels(10));
    row('Jump to level 70', () => Hero.grantLevels(70), paraOpt);
    row('+25 Renown levels', () => { Hero.paragon += 25; Hero.np += 25; Items.apply(); Hero.save(); UI.toast('+25 Renown (' + Hero.np + ' NP)', '#ff8c2a'); }, paraOpt);
    row('+200 Nekromancer Points', () => { Hero.np += 200; Hero.save(); UI.toast('+200 Nekromancer Points', '#ffd76a'); }, paraOpt);

    // ---- RESOURCES ----
    section('Resources');
    row('Add 10,000 of each crafting resource', () => {
      for (const k of Object.keys(MATERIALS)) Hero.mats[k] = (Hero.mats[k] || 0) + 10000;
      UI.toast('+10,000 of every material', '#ffd76a'); Hero.save();
    }, { color: '#ffd76a' });
    row('+5,000 torch & boss reagents', () => {
      for (const k of ['lumber', 'rivets', 'heartstring', 'wyrmscale', 'brain', 'rathmasoul'])
        Hero.mats[k] = (Hero.mats[k] || 0) + 5000;
      Hero.save(); UI.toast('+5,000 Lumber, Rivets, Heartstring, Wyrm Scale, Gluttonous Brain, Souls of Bellmahath', MATERIALS.lumber.color);
    }, { color: MATERIALS.lumber.color, border: '#6a5a3a' });
    // Random beyond-epic pieces straight to the Stash (armor, jewelry,
    // weapon / phylactery / shield — any equip slot).
    for (const [rlabel, rrar, rcol] of [['Artifact', 6, '#ff5a4a'], ['Relic', 7, '#3b8cff'], ['Ancient', 8, '#2fd4c0'], ['Mythic', 9, '#ffcf3b']]) {
      row('★ Add a random ' + rlabel + ' → Stash', () => {
        if (Hero.stash.length >= Hero.STASH_SIZE) { UI.toast('Stash is full — make room first', '#9a9080'); AudioSys.sfx('denied'); return; }
        const slot = pick(Object.keys(ITEM_SLOTS).filter(k => !ITEM_SLOTS[k].torch));
        const it = Items.generate(Math.max(70, Hero.level), 0, slot, { rarity: rrar, stars: randInt(0, 5) });
        Hero.stash.push(it); Hero.saveStash(); Hero.save();
        UI.toast('★ ' + it.name + ' → Stash', rcol); AudioSys.sfx('setdrop');
      }, { color: rcol, border: '#5a3a3a' });
    }
    row('+6 Marquise of each gem type', () => {
      for (const type of Object.keys(GEM_TYPES)) { for (let i = 0; i < 6; i++) Hero.gems.push({ type, tier: GEM_MAX_TIER }); }
      UI.toast('+6 Marquise of every gem', '#b06adf'); Hero.save();
    }, { color: '#b06adf' });
    row('+5 gem slots on equipped weapon', () => {
      const w = Hero.equipped.weapon;
      if (!w) { UI.toast('No weapon equipped', '#9a9080'); AudioSys.sfx('denied'); return; }
      w.sockets = (w.sockets || 0) + 5;
      w.maxSockets = Math.max(w.maxSockets || 0, w.sockets);
      Items.apply();
      UI.toast(w.name + ' now has ' + w.sockets + ' socket' + (w.sockets > 1 ? 's' : ''), '#6ff7c3');
      AudioSys.sfx('gem'); Hero.save();
    }, { color: '#6ff7c3' });

    // ---- GOLD ----
    section('Gold');
    [100, 1000, 10000, 100000, 1000000].forEach(g => {
      row('+' + g.toLocaleString() + ' gold', () => { Hero.gold += g; UI.toast('+' + g.toLocaleString() + ' gold', '#ffd76a'); Hero.save(); }, { color: '#ffd76a' });
    });

    // ---- KEYS & STORAGE ----
    section('Keys & Storage');
    row('Max Stash upgrades', () => { Hero.stashTier = STASH_PER_SLOT.length - 1; Hero.saveStash(); Hero.save(); UI.toast('Stash maxed — ' + Hero.stashPerSlot().toLocaleString() + '/slot', '#8fb0e8'); }, { color: '#8fb0e8', border: '#5f7ab0' });
    row('+100k inventory space', () => { Hero.bagBonus = (Hero.bagBonus || 0) + 100000; Hero.applyBagSize(); Hero.save(); UI.toast('Inventory expanded to ' + Hero.BAG_SIZE.toLocaleString() + ' slots', '#ffd76a'); }, { color: '#ffd76a', border: '#8a6f4a' });
    row('+5 Ashen Keys', () => { Hero.masterKeys += 5; UI.toast('+5 Ashen Keys (' + Hero.masterKeys + ')', '#d8b4f0'); Hero.save(); }, { color: '#d8b4f0', border: '#5a3a7a' });
    row('+5 Crypt Keys', () => { Hero.riftKeys += 5; UI.toast('+5 Crypt Keys (' + Hero.riftKeys + ')', '#b06adf'); Hero.save(); }, { color: '#b06adf', border: '#5a3a7a' });
    row('+5,000 Amidrassi Orbs', () => { Hero.amOrbs = (Hero.amOrbs || 0) + 5000; UI.toast('+5,000 Amidrassi Orbs (◉ ' + Hero.amOrbs.toLocaleString() + ')', '#c88bf0'); Hero.save(); }, { color: '#c88bf0', border: '#5a3a7a' });

    // ---- GEAR & LEGENDARIES ----
    section('Gear & Legendaries');
    row("✦ Haedrig's Gift — full Inarius set + legendaries → Stash", () => {
      const mLvl = Math.max(70, Hero.level);
      let n = 0;
      const give = it => { if (Hero.stash.length < Hero.STASH_SIZE) { Hero.stash.push(it); n++; } };
      for (const slot of Object.keys(INARIUS_SET.pieces)) give(Items.generateSetPiece(mLvl, slot));
      for (const key of ['coe', 'krysbin', 'funeraryPick', 'ironRose', 'aquila']) give(Items.generatePowerItem(mLvl, key));
      Hero.saveStash(); Hero.save();
      UI.toast("Haedrig's Gift: " + n + ' pieces sent to Stash' + (Hero.stash.length >= Hero.STASH_SIZE ? ' (Stash full)' : ''), '#4ade80');
      AudioSys.sfx('setdrop');
    }, { color: '#4ade80', border: '#2e7a4a' });
    row('◈ Royal Grandeur (Act 1) → Stash', () => Screens.grantLegendary('royalGrandeur'), { color: '#ffd76a', border: '#8a6f4a' });
    row('⚔ Bloodtide Blade (Act 5) → Stash', () => Screens.grantLegendary('bloodtide'), { color: '#e04a5a', border: '#8a2635' });
    row('⚔ Scythe of the Cycle (Act 10) → Stash', () => Screens.grantLegendary('cycleScythe'), { color: '#b06adf', border: '#5a3a7a' });

    // ---- SPAWN REAGENT BOSSES (one button each) ----
    section('Spawn Reagent Bosses');
    row('☠ Spawn Bonewyrm', () => Screens.spawnDevBoss('wyrm', {}, 'Bonewyrm'), { color: '#ff8c2a', border: '#a0521a' });
    row('☠ Spawn Gluttonous Brain', () => Screens.spawnDevBoss('glutton', {}, 'Gluttonous Brain'), { color: '#8fbf5a', border: '#5a7a2a' });
    row("☠ Spawn Bellmahath's Chosen", () => Screens.spawnDevBoss('rathma', { rare: true }, "Bellmahath's Chosen"), { color: '#b06adf', border: '#5a3a7a' });

    // ---- ARTISANS ----
    section('Artisans');
    row('Max level Blacksmith (10)', () => { Hero.artisans.smith = 10; UI.toast('Blacksmith mastered', '#ffb43a'); Hero.save(); }, { color: '#ffb43a' });
    row('Max level Mystic (10)', () => { Hero.artisans.mystic = 10; UI.toast('Mystic mastered', '#b06adf'); Hero.save(); }, { color: '#b06adf' });
    row('Max level Jeweler (10)', () => { Hero.artisans.jeweler = 10; UI.toast('Jeweler mastered', '#4ecbe0'); Hero.save(); }, { color: '#4ecbe0' });

    // ---- HORADRIC'S CUBE ----
    section("Soul Crucible");
    row('◈ Grant Soul Crucible', () => { Hero.hasCube = true; Hero.save(); UI.toast('Soul Crucible granted — see it in town', '#ff5a4a'); AudioSys.sfx('setdrop'); }, { color: '#ff5a4a', border: '#a03a2a' });
    row('✦ Grant Golden Mirror', () => { if (!Hero.orbAutoPickup) { Hero.goldenMirror = true; Hero.save(); UI.toast('Golden Mirror granted — transmute it in the Cube', '#ffd76a'); AudioSys.sfx('setdrop'); } else UI.toast('Already transmuted', '#9a9080'); }, { color: '#ffd76a', border: '#8a6f2a' });

    // Footer note (scrolls with the content).
    y += 8;
    if (vis(16)) {
      ctx.textAlign = 'center'; ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
      ctx.fillText('Everything here is saved with the hero.', px + pw / 2, sy() + 8);
    }
    y += 18;

    ctx.restore();

    // Scroll bounds + a slim scrollbar when the list overflows.
    UI.sel.scrollMax = Math.max(0, y - viewH);
    if (UI.sel.scrollMax > 0) {
      ctx.fillStyle = '#3a3448';
      ctx.fillRect(px + pw - 9, bodyTop, 4, viewH);
      const kH = Math.max(24, (viewH / y) * viewH);
      ctx.fillStyle = '#57b894';
      ctx.fillRect(px + pw - 9, bodyTop + (sc / UI.sel.scrollMax) * (viewH - kH), 4, kH);
    }
  },

  // -------------------------------------------------------- patch notes

  // Full-length notes — nothing truncated, nothing off screen. Content
  // scrolls inside the panel via the ▲/▼ buttons when it overflows.
  patchnotes(ctx, W, H) {
    this.dim(ctx, W, H);
    const pw = Math.min(560, W - 20);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 16, 520);
    const py = Math.max(8, H / 2 - ph / 2);
    UI.panel(ctx, px, py, pw, ph, 'PATCH NOTES');

    // Entries are COLLAPSED by default (newest open); each row is TITLED BY
    // ITS DATE (day month year), NEWEST DAY FIRST (owner rule v1.7.25) — the
    // version rides along as a small muted tag. Off-screen rows are never
    // measured or drawn (keeps the framerate up).
    if (!UI.sel.pnOpen) { UI.sel.pnOpen = {}; if (PATCH_NOTES[0]) UI.sel.pnOpen[PATCH_NOTES[0].v] = true; }
    if (UI.sel.scrollY === undefined) UI.sel.scrollY = 0;
    // Subtitle — "say as much" that they're ordered by day.
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'italic 10px Cinzel, Georgia'; ctx.fillStyle = '#8a8070';
    ctx.fillText('Ordered by day — newest first', px + pw / 2, py + 52);
    const top = py + 62;
    const viewH = ph - 74;
    UI.sel.scrollRegion = { x: px + 4, y: top, w: pw - 8, h: viewH };
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 4, top, pw - 8, viewH); ctx.clip();

    const vis = (yy, hh) => yy + hh > top && yy < top + viewH;
    let y = top + 8 - UI.sel.scrollY;
    for (const patch of PATCH_NOTES) {
      const open = !!UI.sel.pnOpen[patch.v];
      if (vis(y, 24)) {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        // Title = the DATE (day month year); version is a small muted tag.
        ctx.font = 'bold 13px Cinzel, Georgia';
        ctx.fillStyle = open ? '#e8e2d0' : '#a89c86';
        ctx.fillText((open ? '▾  ' : '▸  ') + patch.date, px + 22, y + 9);
        const tw = ctx.measureText((open ? '▾  ' : '▸  ') + patch.date).width;
        ctx.font = '9px Cinzel, Georgia'; ctx.fillStyle = '#6f6552';
        ctx.fillText(patch.v + '  ·  ' + patch.notes.length, px + 30 + tw, y + 10);
        UI.register(px + 8, y - 2, pw - 34, 22, ((v) => () => {
          UI.sel.pnOpen[v] = !UI.sel.pnOpen[v];
        })(patch.v));
      }
      y += 24;
      if (open) {
        ctx.font = '11px Cinzel, Georgia';
        for (const n of patch.notes) {
          // Only MEASURE + WRAP notes that could be on screen (a wrapped
          // note tops out around 30 lines ≈ 420px).
          if (vis(y, 440)) {
            ctx.fillStyle = '#b5ab94';
            y = wrapText(ctx, '• ' + n, px + 30, y + 6, pw - 70, 14, 30) + 6;
          } else {
            // Cheap estimated height keeps the scroll extent stable enough.
            y += 20 + Math.ceil(n.length / 60) * 14;
          }
        }
        y += 8;
      }
    }
    ctx.restore();

    const contentH = (y + UI.sel.scrollY) - (top + 8);
    const maxScroll = Math.max(0, contentH - viewH + 16);
    UI.sel.scrollMax = maxScroll;
    UI.sel.scrollY = clamp(UI.sel.scrollY, 0, maxScroll);
    // (The draggable art scrollbar is drawn universally — UI.drawScrollbar.)
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
    ctx.font = 'italic 12px Cinzel, Georgia';
    ctx.fillStyle = '#9a9080';
    c = wrapText(ctx, SEASON.desc, W / 2, c - scrollY, pw - 40, 16, 8) + scrollY + 10;

    const owned = Hero.setPiecesOwned();
    ctx.font = 'bold 14px Cinzel, Georgia';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.fillText('GRACE OF INARIUS  —  ' + owned.size + ' / 6', W / 2, c - scrollY);
    c += 26;
    for (const [slot, name] of Object.entries(INARIUS_SET.pieces)) {
      const has = owned.has(slot);
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px Cinzel, Georgia';
      ctx.fillStyle = has ? '#4ade80' : '#544d44';
      ctx.fillText((has ? '◆  ' : '◇  ') + name, px + 24, c - scrollY);
      ctx.textAlign = 'right';
      ctx.font = '10px Cinzel, Georgia';
      ctx.fillStyle = has ? '#3a7a4a' : '#453f52';
      ctx.fillText(ITEM_SLOTS[slot].label, px + pw - 24, c - scrollY);
      c += 22;
    }
    c += 6;
    ctx.textAlign = 'left';
    ctx.font = '11px Cinzel, Georgia';
    for (const b of INARIUS_SET.bonuses) {
      const active = Items.setCount() >= b.pieces;
      ctx.fillStyle = active ? '#4ade80' : '#6f6552';
      c = wrapText(ctx, `(${b.pieces}) ${b.desc}` + (active ? '  ✓' : ''), px + 24, c - scrollY, pw - 48, 14, 8) + scrollY + 4;
    }
    ctx.restore();

    UI.sel.scrollMax = Math.max(0, (c - scrollTop) - viewH + 6);
    ctx.textAlign = 'center';
    ctx.font = '9px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    if (scrollY > 1) ctx.fillText('▲ drag ▲', W / 2, scrollTop + 2);
    if (scrollY < (UI.sel.scrollMax || 0) - 1) ctx.fillText('▼ drag for more ▼', W / 2, viewBot - 1);

    // Pinned footer: the season is a Master Nephalem Rift (1500 pts, 1 Master key).
    ctx.strokeStyle = '#3a3448';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 12, footerTop); ctx.lineTo(px + pw - 12, footerTop); ctx.stroke();
    const hasMaster = Hero.masterKeys > 0;
    UI.btn(ctx, px + 16, footerTop + 10, pw - 32, 40,
      hasMaster ? `◈ START MASTER RIFT`
        : '◈ NEED AN ASHEN KEY',
      hasMaster ? () => { UI.close(); Game.startRift('season'); } : null,
      { size: 13, disabled: !hasMaster, border: '#3a7a4a', color: '#4ade80' });
    ctx.textAlign = 'center';
    ctx.font = '10px Cinzel, Georgia';
    ctx.fillStyle = '#6f6552';
    ctx.fillText(this.fitText(ctx, '◈ Ashen Keys: ' + Hero.masterKeys + '  ·  Abyss Guardians drop them & set pieces', pw - 24), W / 2, footerTop + 60);
  },

  // ------------------------------------------------------ pause / death

  pause(ctx, W, H) {
    this.dim(ctx, W, H);
    // (red ✕ drawn globally by UI.draw, above all content)
    const bw = Math.min(280, W * 0.72);
    const cx = W / 2 - bw / 2;
    let y = H * 0.24;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px Cinzel, Georgia';
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
    const mode = Game.story ? 'Campaign'
      : Game.riftMode ? ((Game.zone && Game.zone.riftKind === 'season') ? 'Blood Moon'
        : (Game.zone && Game.zone.riftKind === 'greater') ? 'The Abyss' : 'The Ossuary')
      : (Game.bountyPart === 0 && Game.journeyIdx === null) ? 'Expedition'
      : 'Harvest';
    UI.btn(ctx, cx, y, bw, 40, 'ABANDON ' + mode.toUpperCase(), () => Game.toCamp(), { size: 13, border: '#8a4550', color: '#e04a5a' });
  },

  death(ctx, W, H) {
    ctx.fillStyle = 'rgba(20,3,6,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.36;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // The death title wears the chosen face (Cinzel, owner rule).
    ctx.font = `700 ${Math.min(44, W * 0.085)}px Cinzel, Georgia`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText('YOU HAVE FALLEN', cx, cy);
    ctx.fillStyle = '#c22843';
    ctx.fillText('YOU HAVE FALLEN', cx, cy);
    ctx.font = 'italic 14px Cinzel, Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(this.fitText(ctx, 'The dead reclaim their own... but Bellmahath\'s work is not done.', W - 30), cx, cy + 36);
    if (Game.playerDeadT > 1) {
      const bw = Math.min(280, W * 0.72);
      UI.btnPlate2(ctx, cx - bw / 2, cy + 66, bw, 42, 'RISE AT THE ENTRANCE', () => Game.respawn(), { size: 14 });
      UI.btnPlate2(ctx, cx - bw / 2, cy + 122, bw, 38, 'RETURN TO TOWN', () => Game.toCamp(), { size: 13 });
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
    ctx.font = 'bold 15px Cinzel, Georgia';
    ctx.fillStyle = '#ffb43a';
    ctx.fillText(Game.zone ? Game.zone.boss + '  slain' : 'The bounty is done', W / 2, py + 60);
    ctx.font = '13px Cinzel, Georgia';
    ctx.fillStyle = '#c9bfa8';
    ctx.fillText(Game.rewardTitle === 'SEASON COMPLETE' ? 'Season cache:' : 'Forgotten Reliquary:', W / 2, py + 86);
    (Game.rewardLines || []).forEach((ln, i) => {
      ctx.fillStyle = ln[1];
      ctx.font = 'bold 13px Cinzel, Georgia';
      ctx.fillText(ln[0], W / 2, py + 110 + i * 20);
    });
    const by = py + ph - 56;
    UI.btn(ctx, px + 20, by, pw - 40, 42, 'RETURN TO TOWN', () => Game.toCamp(),
      { size: 14, border: '#57b894', color: '#6ff7c3' });
  },

  // Shown when an Act's finale falls. Offers the loot summary, a difficulty
  // stepper (make the next Act easier/harder), then CONTINUE (into the next
  // Act) or TOWN (bank the progress and continue later).
  actClear(ctx, W, H) {
    this.dim(ctx, W, H);
    const lines = Game.rewardLines || [];
    const nextAct = Game.storyNextAct || 2;
    const pw = Math.min(430, W - 24);
    const px = W / 2 - pw / 2;
    const ph = Math.min(H - 20, 288 + lines.length * 20);
    const py = H / 2 - ph / 2;
    UI.panel(ctx, px, py, pw, ph, Game.rewardTitle || 'ACT COMPLETE');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    ctx.font = 'bold 15px Cinzel, Georgia'; ctx.fillStyle = '#ffb43a';
    ctx.fillText((Game.zone && Game.zone.boss ? Game.zone.boss : 'The Act boss') + ' is slain', W / 2, py + 52);
    ctx.font = '12px Cinzel, Georgia'; ctx.fillStyle = '#c9bfa8';
    ctx.fillText('Act cache:', W / 2, py + 74);
    lines.forEach((ln, i) => {
      ctx.fillStyle = ln[1]; ctx.font = 'bold 12px Cinzel, Georgia';
      ctx.fillText(ln[0], W / 2, py + 94 + i * 19);
    });

    // Difficulty stepper for the NEXT Act.
    const dy = py + 100 + lines.length * 19;
    const maxDiff = Hero.level >= MAX_LEVEL ? DIFFICULTIES.length - 1 : 3;
    Hero.difficulty = Math.min(Hero.difficulty, maxDiff);
    const atMin = Hero.difficulty <= 0, atMax = Hero.difficulty >= maxDiff;
    const sdw = Math.min(300, pw - 40), sdx = W / 2 - sdw / 2;
    UI.btn(ctx, sdx, dy, 40, 30, '◀', atMin ? null : () => { Hero.difficulty = Math.max(0, Hero.difficulty - 1); Hero.save(); }, { size: 14, disabled: atMin });
    UI.btn(ctx, sdx + sdw - 40, dy, 40, 30, '▶', atMax ? null : () => { Hero.difficulty = Math.min(maxDiff, Hero.difficulty + 1); Hero.save(); }, { size: 14, disabled: atMax });
    ctx.font = 'bold 13px Cinzel, Georgia'; ctx.fillStyle = Hero.difficulty >= 4 ? '#e04a5a' : '#ffd76a';
    ctx.fillText(DIFFICULTIES[Hero.difficulty].name, W / 2, dy + 15);

    // CONTINUE → the next Act.  TOWN → bank progress, come back later.
    const by = dy + 44;
    UI.btn(ctx, px + 20, by, pw - 40, 44, 'CONTINUE  ·  ACT ' + nextAct,
      () => { UI.close(); Game.startStory(nextAct); },
      { size: 16, color: '#ff8c2a', border: '#8a5a2a' });
    UI.btn(ctx, px + 20, by + 52, pw - 40, 38, 'TOWN', () => Game.toCamp(),
      { size: 14, color: '#6ff7c3', border: '#57b894' });
  }
};
