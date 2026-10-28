'use strict';
// 无头冒烟测试：用一个最小的「小游戏运行时」替身把 game.js 完整跑起来，
// 验证移植后的主循环、物理、合成、计分、暂停、重开都能工作。
// 不验证像素级外观——那需要在微信开发者工具里用真机预览看。
//
// 运行：node tools/headless-smoke.cjs

const path = require('path');
const assert = require('node:assert');

// ---------- 画布替身 ----------
function createContext(canvas) {
  const gradient = { addColorStop() {} };
  const base = {
    canvas,
    measureText: text => ({ width: String(text).length * 7 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient
  };
  // 其余绘制 API 一律 no-op：setTransform/beginPath/arc/fillText/......
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'then') return undefined;
      return () => undefined;
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

function createCanvas(width, height) {
  const canvas = { width: width || 0, height: height || 0 };
  canvas.getContext = () => (canvas.__ctx || (canvas.__ctx = createContext(canvas)));
  return canvas;
}

// ---------- wx 替身 ----------
const storage = new Map();
const frameQueue = [];
const handlers = {};
let clock = 0;
let screenCanvas = null;

global.wx = {
  getWindowInfo: () => ({
    windowWidth: 390, windowHeight: 844, pixelRatio: 3,
    safeArea: { top: 47, bottom: 810, left: 0, right: 390 },
    statusBarHeight: 47
  }),
  getMenuButtonBoundingClientRect: () => ({ top: 50, bottom: 80, left: 300, right: 380, width: 80, height: 30 }),
  createCanvas: () => {
    if (!screenCanvas) { screenCanvas = createCanvas(1170, 2532); return screenCanvas; }
    return createCanvas(0, 0);
  },
  createImage: () => {
    const image = { width: 700, height: 950, _src: '' };
    Object.defineProperty(image, 'src', {
      set(value) { image._src = value; setTimeout(() => { if (image.onload) image.onload(); }, 0); },
      get() { return image._src; }
    });
    return image;
  },
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => { storage.set(key, value); },
  removeStorageSync: key => { storage.delete(key); },
  onTouchStart: fn => { handlers.start = fn; },
  onTouchMove: fn => { handlers.move = fn; },
  onTouchEnd: fn => { handlers.end = fn; },
  onTouchCancel: fn => { handlers.cancel = fn; },
  onHide: fn => { handlers.hide = fn; },
  onShow: fn => { handlers.show = fn; }
};

global.requestAnimationFrame = callback => { frameQueue.push(callback); return frameQueue.length; };
global.performance = { now: () => clock };

// ---------- 驱动 ----------
function stepFrame(ms) {
  clock += (ms === undefined ? 1000 / 60 : ms);
  const pending = frameQueue.splice(0, frameQueue.length);
  for (const callback of pending) callback(clock);
}

function pressAt(x, y) {
  const touch = { clientX: x, clientY: y, identifier: 0 };
  assert.ok(handlers.start && handlers.end, '触摸事件未注册');
  handlers.start({ touches: [touch], changedTouches: [touch] });
  handlers.end({ touches: [], changedTouches: [touch] });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  require(path.join(__dirname, '..', 'game.js'));

  await sleep(80);              // 等图片 onload 与精灵生成
  for (let i = 0; i < 3; i++) stepFrame();

  const game = globalThis.__fatfish;
  assert.ok(game, '缺少调试钩子 __fatfish');
  const session = game.session;

  assert.equal(session.state, 'playing', '加载完成后应自动开局');
  assert.equal(game.layout.width, 390, '布局宽度应等于窗口宽度');
  assert.ok(game.layout.boardH > 400, '棋盘应占据足够高度，实际 ' + game.layout.boardH);

  // 在棋盘中部反复投放，直到够多次数
  const dropX = game.layout.boardX + game.layout.boardW / 2;
  const dropY = game.layout.boardY + game.layout.boardH * 0.55;
  let attempts = 0;
  while (session.drops < 24 && attempts < 500) {
    pressAt(dropX + ((attempts % 5) - 2) * 16, dropY);
    for (let f = 0; f < 14; f++) stepFrame();
    attempts++;
  }
  for (let f = 0; f < 180; f++) stepFrame();   // 等球堆落稳

  assert.ok(session.drops >= 20, '应完成多次投放，实际 ' + session.drops);
  assert.ok(session.merges > 0, '应至少发生一次合成，实际 ' + session.merges);
  assert.ok(session.score > 0, '合成后得分应大于 0，实际 ' + session.score);
  assert.ok(session.entities.size < 200 && session.entities.size > 0,
    '球体数量应在地面数量级，实际 ' + session.entities.size);

  // 记下来，重开之后 session 会归零
  const reported = { drops: session.drops, merges: session.merges, score: session.score };

  const scoreBeforePause = session.score;
  const bodiesBeforePause = session.entities.size;

  // 暂停按钮
  const scene = require(path.join(__dirname, '..', 'src', 'scene.js'));
  const pauseButton = scene.pauseButton(game.layout);
  pressAt(pauseButton.x + pauseButton.w / 2, pauseButton.y + pauseButton.h / 2);
  stepFrame();
  assert.equal(session.state, 'paused', '点暂停按钮后应暂停');
  assert.ok(game.overlay && game.overlay.title === '暂停中', '暂停应显示遮罩');

  for (let f = 0; f < 30; f++) stepFrame();
  assert.equal(session.score, scoreBeforePause, '暂停期间不应继续计分');
  assert.equal(session.entities.size, bodiesBeforePause, '暂停期间球体不应变化');

  game.resumeRound();
  stepFrame();
  assert.equal(session.state, 'playing', '继续后应回到 playing');

  // 切后台自动暂停
  handlers.hide();
  stepFrame();
  assert.equal(session.state, 'paused', '切后台应自动暂停');

  // 重开
  game.startRound();
  stepFrame();
  assert.equal(session.state, 'playing', '重开应进入 playing');
  assert.equal(session.score, 0, '重开后得分应归零');

  assert.ok(storage.has('fatfish.v1.best'), '最高分应写入本地存储');

  console.log('冒烟测试通过');
  console.log('  投放 ' + reported.drops + ' 次，合成 ' + reported.merges + ' 次，得分 ' + reported.score);
  console.log('  布局 ' + Math.round(game.layout.boardW) + '×' + Math.round(game.layout.boardH)
    + ' @ scale ' + game.layout.scale.toFixed(3) + '，HUD 起点 y=' + Math.round(game.layout.hudTop));
  console.log('  最高分已存：' + storage.get('fatfish.v1.best'));
}

main().catch(error => {
  console.error('冒烟测试失败：', error);
  process.exit(1);
});
