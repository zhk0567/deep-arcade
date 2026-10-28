'use strict';
// 合成特效：碎粒、飘分、顶部提示。数学与浏览器版一致，只去掉 DOM 相关部分。

const C = require('../config.js');

let particles = [];
let floating = [];
let toasts = [];

function emitMerge(event, now) {
  const def = C.levels[event.level - 1];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 25 + Math.random() * 35;
    particles.push({
      x: event.x, y: event.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 18,
      color: def.color,
      born: now,
      duration: 600 + Math.random() * 250,
      size: 1.4 + Math.random() * 2.2
    });
  }
  particles = particles.slice(-120);
  floating.push({ x: event.x, y: event.y, text: '+' + event.points, born: now });
}

function toast(text, now, duration) {
  toasts = toasts.filter(item => now - item.born < item.duration);
  toasts.push({ text, born: now, duration: duration || 1900 });
  if (toasts.length > 2) toasts = toasts.slice(-2);
}

function clear() { particles = []; floating = []; toasts = []; }

function update(now) {
  particles = particles.filter(p => now - p.born < p.duration);
  floating = floating.filter(p => now - p.born < 950);
  toasts = toasts.filter(p => now - p.born < p.duration);
}

// 在棋盘坐标系（420×640）里绘制
function draw(ctx, now) {
  for (const p of particles) {
    const age = (now - p.born) / 1000;
    const fraction = (now - p.born) / p.duration;
    ctx.globalAlpha = (1 - fraction) * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x + p.vx * age, p.y + p.vy * age + 26 * age * age, p.size * (1 - fraction * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.font = '600 15px sans-serif';
  for (const p of floating) {
    const fraction = (now - p.born) / 950;
    ctx.globalAlpha = 1 - fraction;
    const y = p.y - 22 - fraction * 32;
    ctx.strokeStyle = 'rgba(249,255,242,.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, y);
    ctx.fillStyle = '#4d887d';
    ctx.fillText(p.text, p.x, y);
  }
  ctx.globalAlpha = 1;
}

// 顶部提示条，画在 HUD 与棋盘之间的空隙里
function drawToast(ctx, layout, now) {
  const item = toasts[toasts.length - 1];
  if (!item) return;
  const fraction = (now - item.born) / item.duration;
  const alpha = fraction < 0.12 ? fraction / 0.12 : (fraction > 0.82 ? (1 - fraction) / 0.18 : 1);
  const cx = layout.boardX + layout.boardW / 2;
  const cy = layout.boardY + 18;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = '13px sans-serif';
  const width = Math.min(layout.boardW - 24, ctx.measureText(item.text).width + 28);
  const height = 30;
  ctx.fillStyle = 'rgba(20,52,48,.82)';
  roundRect(ctx, cx - width / 2, cy - height / 2, width, height, 15);
  ctx.fill();
  ctx.fillStyle = '#f4fbf0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.text, cx, cy + 0.5);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

module.exports = { emitMerge, toast, update, draw, drawToast, clear, roundRect };
