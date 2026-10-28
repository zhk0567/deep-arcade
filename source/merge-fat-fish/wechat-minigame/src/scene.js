'use strict';
// 画面层：把浏览器版 index.html + styles.css 的界面，用 Canvas 重画。
// 棋盘内部仍然使用 420×640 的设计坐标，整体由一个 scale 映射到真机屏幕。

const C = require('../config.js');
const Sprite = require('./sprites.js');
const Fx = require('./effects.js');
const { roundRect } = Fx;

function createLayout(p) {
  const w = p.windowWidth;
  const h = p.windowHeight;
  // 右上角原生胶囊下面开始放 HUD，避免重叠
  const hudTop = p.menuRect ? p.menuRect.bottom + 10 : p.safeTop + 10;
  const hudHeight = 66;
  const bottomPad = 16;
  const available = h - (hudTop + hudHeight) - bottomPad;
  const scale = Math.min(w / C.width, available / C.height);
  const boardW = C.width * scale;
  const boardH = C.height * scale;
  return {
    width: w, height: h, hudTop, hudHeight,
    cardX: 14, cardY: hudTop, cardW: w - 28, cardH: hudHeight,
    scale, boardW, boardH,
    boardX: (w - boardW) / 2,
    boardY: hudTop + hudHeight + Math.max(0, (available - boardH) / 2)
  };
}

// 屏幕坐标 → 棋盘设计坐标
function toBoard(layout, x, y) {
  return {
    x: (x - layout.boardX) / layout.scale,
    y: (y - layout.boardY) / layout.scale
  };
}

function pauseButton(layout) {
  return {
    x: layout.cardX + layout.cardW - 52,
    y: layout.cardY + layout.cardH / 2 - 20,
    w: 40, h: 40
  };
}

function hit(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function drawHud(ctx, layout, session, best) {
  ctx.save();
  // 卡片
  ctx.fillStyle = 'rgba(255,255,255,.80)';
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 1;
  roundRect(ctx, layout.cardX, layout.cardY, layout.cardW, layout.cardH, 18);
  ctx.fill();
  ctx.stroke();

  // 本局得分
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7d9c90';
  ctx.font = '11px sans-serif';
  ctx.fillText('本局得分', layout.cardX + 18, layout.cardY + 24);
  ctx.fillStyle = '#2e5c52';
  ctx.font = '600 26px sans-serif';
  ctx.fillText(String(session.score), layout.cardX + 18, layout.cardY + 54);

  // 最高分
  const rightEdge = layout.cardX + layout.cardW - 68;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7d9c90';
  ctx.font = '11px sans-serif';
  ctx.fillText('最高分', rightEdge, layout.cardY + 24);
  ctx.fillStyle = '#4a7f73';
  ctx.font = '600 16px sans-serif';
  ctx.fillText(String(best), rightEdge, layout.cardY + 50);

  // 暂停按钮
  const btn = pauseButton(layout);
  ctx.fillStyle = 'rgba(108,177,164,.16)';
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fill();
  ctx.fillStyle = '#4a7f73';
  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;
  roundRect(ctx, cx - 7, cy - 8, 5, 16, 2);
  ctx.fill();
  roundRect(ctx, cx + 2, cy - 8, 5, 16, 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, now) {
  const time = now / 1000;
  const gradient = ctx.createLinearGradient(0, 0, 0, C.height);
  gradient.addColorStop(0, '#eaf6ed');
  gradient.addColorStop(0.45, '#d6efe5');
  gradient.addColorStop(1, '#9dcac4');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, C.width, C.height);

  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 88, 0); ctx.lineTo(100 + i * 104, 0);
    ctx.lineTo(30 + i * 118, 640); ctx.lineTo(-60 + i * 115, 640);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,' + (0.035 + i * 0.008) + ')';
    ctx.fill();
  }
  for (let layer = 0; layer < 3; layer++) {
    const y = 400 + layer * 74;
    ctx.beginPath();
    ctx.moveTo(0, C.height);
    for (let x = 0; x <= C.width; x += 7) {
      ctx.lineTo(x, y + Math.sin(x / 85 + time * 0.22 + layer * 2) * 16);
    }
    ctx.lineTo(C.width, C.height);
    ctx.closePath();
    ctx.fillStyle = ['rgba(108,177,164,.04)', 'rgba(92,164,155,.045)', 'rgba(84,151,146,.055)'][layer];
    ctx.fill();
  }
  for (let i = 0; i < 15; i++) {
    const y = C.height - ((i * 53 + time * (6 + i % 4)) % (C.height + 50));
    const x = 25 + ((i * 71) % 370) + Math.sin(time * 0.3 + i) * 4;
    ctx.beginPath();
    ctx.arc(x, y, 2 + i % 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.38)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  const floor = ctx.createLinearGradient(0, C.floorY - 7, 0, C.height);
  floor.addColorStop(0, 'rgba(221,226,199,.25)');
  floor.addColorStop(1, '#cbd9bd');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, C.floorY + 2);
  ctx.bezierCurveTo(130, C.floorY - 8, 260, C.floorY + 6, 420, C.floorY);
  ctx.lineTo(420, 640); ctx.lineTo(0, 640);
  ctx.fill();
  for (const [x, height, direction] of [[28, 33, -1], [36, 23, 1], [389, 29, 1], [377, 20, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, 622);
    ctx.bezierCurveTo(x + direction * 15, 612, x - direction * 10, 615 - height, x + direction * 6, 622 - height);
    ctx.strokeStyle = 'rgba(116,162,139,.35)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoard(ctx, layout, session, best, now) {
  drawHud(ctx, layout, session, best);

  // 棋盘投影
  ctx.save();
  ctx.shadowColor = 'rgba(60,110,100,.22)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#eaf6ed';
  roundRect(ctx, layout.boardX, layout.boardY, layout.boardW, layout.boardH, 18);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, layout.boardX, layout.boardY, layout.boardW, layout.boardH, 18);
  ctx.clip();
  ctx.translate(layout.boardX, layout.boardY);
  ctx.scale(layout.scale, layout.scale);

  drawBackground(ctx, now);

  // 警戒线
  const danger = session.dangerRatio;
  ctx.save();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = danger > 0
    ? 'rgba(186,107,85,' + (0.35 + danger * 0.5) + ')'
    : 'rgba(100,153,137,.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(24, C.dangerY);
  ctx.lineTo(C.width - 24, C.dangerY);
  ctx.stroke();
  ctx.restore();
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = danger > 0 ? '#b27662' : '#9bb8a7';
  ctx.fillText('警戒线', C.width - 25, C.dangerY - 7);

  // 待投放的角色
  if (session.state === 'playing' && Sprite.ready()) {
    const radius = C.levels[session.currentLevel - 1].radius;
    const bob = Math.sin(now / 330) * 1.2;
    ctx.save();
    ctx.globalAlpha = session.canDrop() ? 0.95 : 0.42;
    const sprite = Sprite.get(session.currentLevel);
    if (sprite) ctx.drawImage(sprite, session.aimX - radius, C.spawnY - radius + bob, radius * 2, radius * 2);
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8ea995';
    ctx.fillText('本次', session.aimX, C.spawnY - radius - 9);
    ctx.restore();
  }

  // 球体（含挤压形变）
  if (Sprite.ready()) {
    for (const body of session.entities.values()) {
      const data = body.plugin.whale;
      const radius = body.circleRadius;
      const squash = data.squash;
      const major = Math.max(1 + squash, 1 / (1 + squash));
      const sprite = Sprite.get(data.level);
      if (!sprite) continue;
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(data.squashAngle);
      ctx.scale((1 + squash) / major, 1 / (1 + squash) / major);
      ctx.rotate(-data.squashAngle);
      ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
  }

  Fx.update(now);
  Fx.draw(ctx, now);

  // 警戒提示
  if (session.dangerActive && session.state === 'playing') {
    const text = danger >= 1
      ? '等待最后一次投放落稳…'
      : '触及警戒线 · ' + (session.dangerRemainingMs / 1000).toFixed(1) + '秒内合成腾出空间';
    ctx.save();
    ctx.font = '11px sans-serif';
    const width = Math.min(C.width - 40, ctx.measureText(text).width + 26);
    const x = (C.width - width) / 2;
    const y = 10;
    ctx.fillStyle = 'rgba(186,107,85,.92)';
    roundRect(ctx, x, y, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#fff8f2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, C.width / 2, y + 13);
    ctx.restore();
  }

  ctx.restore();

  Fx.drawToast(ctx, layout, now);
}

function drawOverlay(ctx, layout, options) {
  const { title, text, button, score } = options;
  ctx.save();
  ctx.fillStyle = 'rgba(18,44,40,.42)';
  roundRect(ctx, layout.boardX, layout.boardY, layout.boardW, layout.boardH, 18);
  ctx.fill();

  const panelW = Math.min(300, layout.width - 56);
  const panelH = 210;
  const panelX = (layout.width - panelW) / 2;
  const panelY = layout.boardY + layout.boardH / 2 - panelH / 2;
  ctx.fillStyle = 'rgba(250,255,251,.97)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 22);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2e5c52';
  ctx.font = '600 20px sans-serif';
  ctx.fillText(title, layout.width / 2, panelY + 52);

  ctx.fillStyle = '#6f8f84';
  ctx.font = '13px sans-serif';
  ctx.fillText(text, layout.width / 2, panelY + 82);

  if (typeof score === 'number') {
    ctx.fillStyle = '#2e5c52';
    ctx.font = '600 34px sans-serif';
    ctx.fillText(String(score), layout.width / 2, panelY + 128);
    ctx.fillStyle = '#93ada2';
    ctx.font = '11px sans-serif';
    ctx.fillText('本局得分', layout.width / 2, panelY + 146);
  }

  const buttonRect = { x: (layout.width - 160) / 2, y: panelY + panelH - 64, w: 160, h: 44 };
  ctx.fillStyle = '#5fae9b';
  roundRect(ctx, buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 22);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 15px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(button || '继续', layout.width / 2, buttonRect.y + 22);
  ctx.restore();
  return buttonRect;
}

module.exports = {
  createLayout, toBoard, drawBoard, drawOverlay, drawHud,
  pauseButton, hit
};
