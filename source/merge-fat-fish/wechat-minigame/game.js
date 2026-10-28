'use strict';
// 合成大肥鱼 · 微信小游戏入口（骨架版，最小闭环）
// 物理与规则来自 dist/engine.js（零改动），这里只做：加载 → 输入 → 循环 → 绘制。

const platform = require('./src/platform.js');
const C = require('./config.js');
const { Session } = require('./engine.js');
const Sprite = require('./src/sprites.js');
const Scene = require('./src/scene.js');
const Fx = require('./src/effects.js');

const canvas = platform.canvas;
const ctx = canvas.getContext('2d');
const layout = Scene.createLayout(platform);

const STORAGE_BEST = 'fatfish.v1.best';
let best = Math.max(0, Number(platform.storage.getItem(STORAGE_BEST)) || 0);
let bestDirty = false;

// 最高分随合成实时刷新，不必等到本局结束
function syncBest() {
  if (session.score > best) { best = session.score; bestDirty = true; }
  if (bestDirty) { platform.storage.setItem(STORAGE_BEST, best); bestDirty = false; }
}

let session = new Session({ onEvent: onGameEvent });
let overlay = null;          // { title, text, button, score, action }
let overlayButtonRect = null;
let dragging = false;
let ready = false;
let lastFrame = 0;
let accumulator = 0;
const STEP = 1000 / 60;

// ---------- 事件 ----------
function onGameEvent(event) {
  if (event.type === 'merge') {
    Fx.emitMerge(event, now());
    bestDirty = true;
  } else if (event.type === 'discover' && event.level > 1) {
    Fx.toast('遇见了新的她：' + C.levels[event.level - 1].name, now(), 1700);
  } else if (event.type === 'gameover') {
    finish(event);
  }
}

function finish(event) {
  syncBest();
  overlay = {
    title: '这局到这里',
    text: '上下文溢出，下局再见',
    button: '再来一局',
    score: event.score,
    action: 'restart'
  };
}

function startRound() {
  Fx.clear();
  overlay = null;
  session.start();
}

function pauseRound() {
  if (session.state !== 'playing') return;
  session.pause();
  overlay = { title: '暂停中', text: '回来的时候，球堆还在这里', button: '继续合成', action: 'resume' };
}

function resumeRound() {
  overlay = null;
  session.resume();
}

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

// ---------- 输入 ----------
function aimAt(clientX) {
  const point = Scene.toBoard(layout, clientX, 0);
  session.setAim(point.x);
}

function onTouchStart(event) {
  const touch = event.touches[0] || event.changedTouches[0];
  if (!touch) return;
  const x = touch.clientX;
  const y = touch.clientY;

  if (overlay) {
    if (overlayButtonRect && Scene.hit(overlayButtonRect, x, y)) {
      if (overlay.action === 'resume') resumeRound();
      else startRound();
    }
    return;
  }
  if (Scene.hit(Scene.pauseButton(layout), x, y)) { pauseRound(); return; }
  if (session.state !== 'playing') return;

  dragging = true;
  aimAt(x);
}

function onTouchMove(event) {
  if (!dragging || session.state !== 'playing') return;
  const touch = event.touches[0];
  if (!touch) return;
  aimAt(touch.clientX);
}

function onTouchEnd() {
  if (!dragging) return;
  dragging = false;
  if (session.state === 'playing') session.drop();
}

wx.onTouchStart(onTouchStart);
wx.onTouchMove(onTouchMove);
wx.onTouchEnd(onTouchEnd);
wx.onTouchCancel(() => { dragging = false; });

// 切后台：暂停，避免回来时球堆还在继续掉
wx.onHide(() => { if (session.state === 'playing') pauseRound(); });

// ---------- 主循环 ----------
function frame() {
  const timestamp = now();
  const delta = lastFrame ? Math.max(0, Math.min(80, timestamp - lastFrame)) : STEP;
  lastFrame = timestamp;

  if (session.state === 'playing') {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= STEP && steps < 5) {
      session.step(STEP);
      accumulator -= STEP;
      steps++;
      if (session.state !== 'playing') { accumulator = 0; break; }
    }
  } else {
    accumulator = 0;
  }
  syncBest();

  ctx.setTransform(platform.dpr, 0, 0, platform.dpr, 0, 0);
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#f3faf4';
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (!ready) {
    ctx.fillStyle = '#6f8f84';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('正在唤醒鲸娘…', layout.width / 2, layout.height / 2);
  } else {
    Scene.drawBoard(ctx, layout, session, best, timestamp);
    if (overlay) overlayButtonRect = Scene.drawOverlay(ctx, layout, overlay);
  }
  requestAnimationFrame(frame);
}

// ---------- 启动 ----------
// 调试钩子：开发者工具控制台里可直接看 __fatfish.session.score / entities.size
const root = (typeof globalThis !== 'undefined') ? globalThis : this;
root.__fatfish = {
  get session() { return session; },
  get overlay() { return overlay; },
  layout,
  startRound, pauseRound, resumeRound
};

Sprite.loadAll()
  .then(() => {
    ready = true;
    startRound();
    requestAnimationFrame(frame);
  })
  .catch(error => {
    console.error(error);
    ready = true;
    overlay = { title: '素材还没到齐', text: '请检查 assets/levels 下的图片', button: '重试', action: 'restart' };
    requestAnimationFrame(frame);
  });
