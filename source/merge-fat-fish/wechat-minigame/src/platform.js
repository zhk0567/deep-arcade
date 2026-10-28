'use strict';
// 微信小游戏适配层。
// 小游戏没有 document / window / localStorage / Image / Audio，
// 现有浏览器代码需要的这几样能力全部收敛到这个文件里；
// 游戏逻辑（engine.js / config.js）保持零改动。

const info = (typeof wx.getWindowInfo === 'function')
  ? wx.getWindowInfo()
  : wx.getSystemInfoSync();

const windowWidth = info.windowWidth;
const windowHeight = info.windowHeight;
const dpr = Math.min(3, info.pixelRatio || 2);

// 小游戏里第一次 wx.createCanvas() 返回上屏画布，之后每次都是离屏画布。
const canvas = wx.createCanvas();
canvas.width = Math.round(windowWidth * dpr);
canvas.height = Math.round(windowHeight * dpr);

function offscreen(width, height) {
  const layer = wx.createCanvas();
  layer.width = width;
  layer.height = height;
  return layer;
}

// 小游戏图片按需异步解码，等价于浏览器的 new Image()。
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = wx.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片读取失败：' + src));
    image.src = src;
  });
}

// 同步接口与 localStorage 对齐，progress.js / saved-round.js 可以直接复用。
const storage = {
  getItem(key) {
    try {
      const value = wx.getStorageSync(key);
      return value === '' || value === undefined || value === null ? null : value;
    } catch (_) { return null; }
  },
  setItem(key, value) {
    try { wx.setStorageSync(key, String(value)); } catch (_) {}
  },
  removeItem(key) {
    try { wx.removeStorageSync(key); } catch (_) {}
  }
};

// 顶部安全区：刘海/挖孔屏用 safeArea，普通机型退回状态栏高度。
const safeTop = info.safeArea ? info.safeArea.top : (info.statusBarHeight || 20);

// 小游戏右上角有原生胶囊，用它避开按钮区。
let menuRect = null;
try { menuRect = wx.getMenuButtonBoundingClientRect(); } catch (_) { menuRect = null; }

module.exports = {
  info, windowWidth, windowHeight, dpr, canvas, offscreen, loadImage,
  storage, safeTop, menuRect
};
