// 布局自检：在常见屏幕尺寸上算一遍棋盘位置，确认不越界、不压 HUD。
// 运行：node tools/layout-check.cjs
const path = require('path');

// scene.js -> sprites.js -> platform.js 会读 wx，这里给个最小替身
global.wx = {
  getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeArea: { top: 47 }, statusBarHeight: 47 }),
  getMenuButtonBoundingClientRect: () => ({ top: 50, bottom: 80, left: 300, right: 380, width: 80, height: 30 }),
  createCanvas: () => ({ width: 0, height: 0, getContext: () => new Proxy({ measureText: t => ({ width: String(t).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (t, p) => (p in t ? t[p] : () => undefined), set: (t, p, v) => (t[p] = v, true) }) })
};

const Scene = require(path.join(__dirname, '..', 'src', 'scene.js'));
const devices = [
  ['iPhone SE 320x568', 320, 568, 20, { top: 50, bottom: 74, left: 230, right: 310, width: 80, height: 24 }],
  ['Android 360x640', 360, 640, 24, { top: 54, bottom: 78, left: 270, right: 350, width: 80, height: 24 }],
  ['iPhone 8 375x667', 375, 667, 20, { top: 54, bottom: 86, left: 281, right: 361, width: 80, height: 32 }],
  ['iPhone 13 390x844', 390, 844, 47, { top: 50, bottom: 80, left: 300, right: 380, width: 80, height: 30 }],
  ['iPhone Pro Max 430x932', 430, 932, 59, { top: 56, bottom: 88, left: 337, right: 417, width: 80, height: 32 }],
  ['折叠屏 673x841', 673, 841, 30, { top: 56, bottom: 92, left: 580, right: 660, width: 80, height: 36 }]
];

let failures = 0;
for (const [name, w, h, safeTop, menuRect] of devices) {
  const layout = Scene.createLayout({ windowWidth: w, windowHeight: h, safeTop, menuRect });
  const bottomGap = h - (layout.boardY + layout.boardH);
  const hudBottom = layout.cardY + layout.cardH;
  const ok = layout.boardY >= hudBottom && bottomGap >= 0 && layout.boardW <= w + 0.5 && layout.boardH <= h;
  if (!ok) failures++;
  console.log(
    (ok ? 'OK  ' : 'BAD ') + name.padEnd(22),
    '棋盘 ' + String(Math.round(layout.boardW)).padStart(3) + 'x' + String(Math.round(layout.boardH)).padStart(3),
    '@' + layout.scale.toFixed(3),
    'y=' + String(Math.round(layout.boardY)).padStart(4),
    '底余 ' + String(Math.round(bottomGap)).padStart(3),
    '胶囊底 ' + menuRect.bottom
  );
}
console.log(failures ? '有 ' + failures + ' 个尺寸不合适' : '全部尺寸通过');
process.exit(failures ? 1 : 0);
