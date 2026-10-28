'use strict';
// 球面精灵：把立绘裁成圆形头像并缓存，避免每帧重复绘制。
// 移植自 dist/game.js 的 createSprite，只把 document.createElement 换成离屏画布。

const C = require('../config.js');
const platform = require('./platform.js');

const SIZE = 512; // 精灵本身分辨率；缩放由绘制时的半径决定
const sprites = new Map();

function createSprite(level, image) {
  const def = C.levels[level - 1];
  const layer = platform.offscreen(SIZE, SIZE);
  const ctx = layer.getContext('2d');

  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.clip();

  const gradient = ctx.createLinearGradient(70, 20, 420, 495);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.4, def.pale);
  gradient.addColorStop(1, def.color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // portrait 是原图上的裁切锚点：[中心x比例, 中心y比例, 边长比例]，与分辨率无关。
  const side = Math.min(image.width * def.portrait[2], image.height);
  const sx = Math.max(0, Math.min(image.width - side, image.width * def.portrait[0] - side / 2));
  const sy = Math.max(0, Math.min(image.height - side, image.height * def.portrait[1] - side / 2));
  ctx.drawImage(image, sx, sy, side, side, 0, 0, SIZE, SIZE);

  const bottom = ctx.createLinearGradient(0, 390, 0, 490);
  bottom.addColorStop(0, 'rgba(25,61,68,0)');
  bottom.addColorStop(1, 'rgba(25,61,68,.18)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 350, SIZE, 162);

  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 253, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(215, 211, 210, Math.PI * 1.08, Math.PI * 1.54);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  return layer;
}

async function loadAll() {
  const tasks = C.levels.map(async def => {
    // 浏览器版用 png，小游戏包用同名 jpg（体积约省 95%）
    const src = def.asset.replace(/\.png$/i, '.jpg');
    const image = await platform.loadImage(src);
    sprites.set(def.id, createSprite(def.id, image));
    return def.id;
  });
  await Promise.all(tasks);
  return sprites;
}

function get(level) { return sprites.get(level); }
function ready() { return sprites.size === C.levels.length; }

module.exports = { loadAll, get, ready };
