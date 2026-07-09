'use strict';
// ---------------------------------------------------------------------------
// Small math / helper toolkit shared by every module.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

function rand(a = 1, b) {
  if (b === undefined) return Math.random() * a;
  return a + Math.random() * (b - a);
}

function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, a, b) {
  return v < a ? a : (v > b ? b : v);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Distance from point (px,py) to the segment (ax,ay)-(bx,by).
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Closest point on segment AB to P (for pushing entities off curvy water).
function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = clamp(t, 0, 1);
  return { x: ax + t * dx, y: ay + t * dy };
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Deterministic pseudo-random in [0,1) for world decoration.
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Shortest-path angle interpolation.
function lerpAngle(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

// Draw word-wrapped text; returns the y just below the last line.
function wrapText(ctx, text, x, y, maxW, lineH, maxLines = 4) {
  // Keep line spacing proportional to the global UI font size (Settings ▸ Font
  // size); ctx.font px is already scaled by the same factor in game.js.
  const _fs = (typeof Settings !== 'undefined' && Settings.g && Settings.g.fontSize) || 13;
  if (_fs !== 13) lineH = lineH * (_fs / 13);
  const words = String(text).split(' ');
  let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lineH);
      lines++;
      if (lines >= maxLines - 1) {
        line = words.slice(i).join(' ');
        while (line.length > 3 && ctx.measureText(line + '…').width > maxW) {
          line = line.slice(0, -2);
        }
        line += '…';
        break;
      }
      line = words[i];
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + lines * lineH);
  return y + (lines + 1) * lineH;
}

// Rounded-rectangle path helper (canvas roundRect isn't everywhere).
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
