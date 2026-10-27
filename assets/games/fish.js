/* ============================================================
   DeepSeek 深海游乐场 — 02 合成大肥鱼
   A lightweight circle-physics merge game. No dependencies.
   ============================================================ */
(function () {
  "use strict";

  var LEVELS = [
    { name: "泡泡鱼", radius: 17, points: 0, color: "#ffd66e", dark: "#d49a24", belly: "#fff0b7", accent: "#fff7d6" },
    { name: "小丑鱼", radius: 22, points: 2, color: "#ff9b82", dark: "#d45b43", belly: "#ffd2c5", accent: "#fff1ea" },
    { name: "小河豚", radius: 28, points: 4, color: "#ffc86f", dark: "#d0872e", belly: "#ffefc3", accent: "#f5a95a" },
    { name: "小章鱼", radius: 35, points: 8, color: "#c3a1ff", dark: "#8560d6", belly: "#eadcff", accent: "#9a78ee" },
    { name: "胖头鱼", radius: 43, points: 14, color: "#b9e96d", dark: "#76a72b", belly: "#eaffc0", accent: "#9cd544" },
    { name: "鲸鱼宝宝", radius: 53, points: 22, color: "#73dce9", dark: "#288fa3", belly: "#d7fcff", accent: "#51c5d6" },
    { name: "深海鲸", radius: 66, points: 34, color: "#5f81ff", dark: "#2944be", belly: "#cdd9ff", accent: "#3e5de8" },
    { name: "巨型鲲", radius: 82, points: 50, color: "#ffd97b", dark: "#a87414", belly: "#fff1be", accent: "#ffeaa2" }
  ];

  var GRAVITY = 1850;
  var WALL = 13;
  var FLOOR_MARGIN = 18;
  var MAX_TIER = LEVELS.length - 1;
  var FISH_SCALE = 1.6;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function pad(value) {
    return String(value).padStart(3, "0");
  }

  function createSeed() {
    return Math.random() * Math.PI * 2;
  }

  function pickTier() {
    var roll = Math.random();
    if (roll < 0.32) return 0;
    if (roll < 0.58) return 1;
    if (roll < 0.78) return 2;
    if (roll < 0.92) return 3;
    return 4;
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {
        drop: function () {},
        merge: function () {},
        gameOver: function () {},
        click: function () {},
        land: function () {}
      };

      var chainMarkup = LEVELS.map(function (level, index) {
        return (
          '<span class="fish-chain__item" data-fish-level="' + index + '">' +
          '<i class="fish-chain__dot" style="background:' + level.color + '"></i>' +
          level.name +
          "</span>"
        );
      }).join("");

      root.innerHTML =
        '<div class="fish-shell">' +
        '<aside class="fish-side">' +
        '  <div class="fish-side-kicker">SPECIMEN TANK / 02</div>' +
        '  <div class="fish-side-score"><span>SCORE / 本局</span><b data-fish-score>000</b></div>' +
        '  <div class="fish-best-row"><span>BEST</span><b data-fish-best>000</b><span>· 本地纪录</span></div>' +
        '  <div class="fish-next-card">' +
        "    <span>NEXT / 下一条</span>" +
        '    <div class="fish-next-preview" data-fish-next-preview></div>' +
        '    <b data-fish-next-name>泡泡鱼</b>' +
        "  </div>" +
        '  <div class="fish-howto">' +
        "    <h3>HOW TO PLAY / 怎么玩</h3>" +
        "    <p>移动光标，<b>点击投放</b>小鱼。<br>两条相同的小鱼碰到一起，就会合成更胖的一条。<br>别让鱼缸堆过标线。</p>" +
        "  </div>" +
        '  <div class="fish-chain" data-fish-chain>' + chainMarkup + "</div>" +
        '  <div class="fish-side-foot">PHYSICS / GRAVITY 1.85G · LOCAL ONLY</div>' +
        "</aside>" +
        '<div class="fish-stage">' +
        '  <canvas class="fish-canvas" tabindex="0" aria-label="合成大肥鱼游戏区域。移动鼠标或使用左右方向键选择位置，点击或按空格投放小鱼。"></canvas>' +
        '  <div class="fish-hud">' +
        '    <span class="fish-hud__tag" data-fish-status><i></i> TANK 02 · WATER STABLE</span>' +
        '    <span class="fish-hud__tag">← → 移动 · SPACE 投放</span>' +
        "  </div>" +
        '  <div class="fish-combo" data-fish-combo></div>' +
        '  <div class="fish-hint"><b>移动</b> 选择位置 · <b>点击</b> 投放小鱼</div>' +
        '  <div class="game-over" data-fish-over>' +
        '    <div class="game-over__card">' +
        '      <span class="game-over__kicker">TANK OVERFLOW / 鱼缸满了</span>' +
        '      <h3 data-fish-over-title>鱼缸装不下了。</h3>' +
        '      <div class="game-over__score" data-fish-final>0</div>' +
        '      <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '      <span class="game-over__record" data-fish-record hidden>NEW RECORD · 新纪录</span>' +
        '      <div class="game-over__actions">' +
        '        <button type="button" class="game-over__primary" data-fish-restart>再养一缸</button>' +
        '        <button type="button" class="game-over__secondary" data-fish-exit>返回大厅</button>' +
        "      </div>" +
        "    </div>" +
        "  </div>" +
        "</div>" +
        "</div>";

      var shell = root.querySelector(".fish-shell");
      var stage = root.querySelector(".fish-stage");
      var canvas = root.querySelector(".fish-canvas");
      var ctx = canvas.getContext("2d");
      var scoreEl = root.querySelector("[data-fish-score]");
      var bestEl = root.querySelector("[data-fish-best]");
      var nextPreview = root.querySelector("[data-fish-next-preview]");
      var nextName = root.querySelector("[data-fish-next-name]");
      var chainItems = Array.prototype.slice.call(root.querySelectorAll("[data-fish-level]"));
      var statusEl = root.querySelector("[data-fish-status]");
      var comboEl = root.querySelector("[data-fish-combo]");
      var hint = root.querySelector(".fish-hint");
      var overEl = root.querySelector("[data-fish-over]");
      var finalEl = root.querySelector("[data-fish-final]");
      var recordEl = root.querySelector("[data-fish-record]");
      var overTitle = root.querySelector("[data-fish-over-title]");
      var restartButton = root.querySelector("[data-fish-restart]");
      var exitButton = root.querySelector("[data-fish-exit]");

      var W = 0;
      var H = 0;
      var DPR = 1;
      var scale = 1;
      var bodies = [];
      var effects = [];
      var floats = [];
      var bubbles = [];
      var score = 0;
      var best = Number(opts.best) || 0;
      var maxTierReached = 0;
      var currentTier = pickTier();
      var nextTier = pickTier();
      var cursorX = 0;
      var dropLock = 0;
      var state = "playing";
      var overflowTime = 0;
      var lastFrame = 0;
      var raf = 0;
      var nextBodyId = 1;
      var dragging = false;
      var isDestroyed = false;
      var resizeObserver = null;
      var gameOverOpen = false;
      var endHandled = false;
      var lastMergeAt = 0;
      var combo = 0;
      var comboHideTimer = 0;
      var warningFlash = 0;
      var lastHudScore = -1;

      function paddle(value) {
        return String(value).padStart(3, "0");
      }

      function fishRadius(tier) {
        return LEVELS[tier].radius * scale * FISH_SCALE;
      }

      function spawnY() {
        return Math.max(76, H * 0.105);
      }

      function dangerY() {
        return Math.max(110, H * 0.2);
      }

      function floorY() {
        return H - FLOOR_MARGIN;
      }

      function wallX() {
        if (W <= 660) return WALL;
        return Math.min(170, Math.max(WALL, (W - 520) / 2));
      }

      function createBody(tier, x, y, vx, vy) {
        var radius = fishRadius(tier);
        return {
          id: nextBodyId,
          tier: tier,
          x: x,
          y: y,
          vx: vx || 0,
          vy: vy || 0,
          r: radius,
          seed: createSeed(),
          age: 0,
          mergeCooldown: 0.08,
          removed: false,
          mergeQueued: false,
          born: 0
        };
      }

      function createBackground() {
        bubbles = [];
        var count = Math.round(clamp(W / 34, 9, 26));
        for (var i = 0; i < count; i += 1) {
          bubbles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: random(1, 3.2),
            speed: random(5, 18),
            alpha: random(0.05, 0.2),
            phase: Math.random() * Math.PI * 2
          });
        }
      }

      function reset() {
        window.clearTimeout(comboHideTimer);
        bodies = [];
        effects = [];
        floats = [];
        score = 0;
        maxTierReached = 0;
        currentTier = pickTier();
        nextTier = pickTier();
        dropLock = 0;
        overflowTime = 0;
        warningFlash = 0;
        state = "playing";
        gameOverOpen = false;
        endHandled = false;
        dragging = false;
        combo = 0;
        lastMergeAt = 0;
        lastHudScore = -1;
        overEl.classList.remove("is-visible");
        overEl.querySelector(".game-over__card").style.opacity = "";
        recordEl.hidden = true;
        hint.classList.remove("is-hidden");
        comboEl.classList.remove("is-visible");
        cursorX = W / 2;
        updateHud();
        lastFrame = performance.now();
      }

      function updateHud() {
        if (lastHudScore !== score) {
          scoreEl.textContent = pad(score);
          lastHudScore = score;
        }
        bestEl.textContent = pad(Math.max(best, score));
        updateNextPreview();
        updateChain();
      }

      function updateNextPreview() {
        var level = LEVELS[nextTier];
        var size = clamp(LEVELS[nextTier].radius * scale * 0.62, 12, 35);
        nextPreview.innerHTML =
          '<span class="fish-next-dot" style="width:' + size.toFixed(1) + "px;height:" + size.toFixed(1) +
          "px;background:linear-gradient(145deg," + level.color + "," + level.dark + ')"></span>';
        nextName.textContent = level.name;
      }

      function updateChain() {
        chainItems.forEach(function (item) {
          var level = parseInt(item.getAttribute("data-fish-level"), 10);
          item.classList.toggle("is-reached", level <= maxTierReached);
        });
      }

      function addFloat(x, y, text, color) {
        floats.push({
          x: x,
          y: y,
          text: text,
          color: color || "#dcf56c",
          life: 0.85,
          maxLife: 0.85
        });
      }

      function addMergeEffects(body, newRadius) {
        effects.push({
          type: "ring",
          x: body.x,
          y: body.y,
          radius: newRadius * 0.6,
          maxRadius: newRadius * 1.9,
          life: 0.45,
          maxLife: 0.45,
          color: LEVELS[Math.min(body.tier + 1, MAX_TIER)].accent
        });
        var colors = ["#dcf56c", "#83e8ff", "#ffffff", LEVELS[Math.min(body.tier + 1, MAX_TIER)].color];
        for (var i = 0; i < 14; i += 1) {
          var angle = random(0, Math.PI * 2);
          var speed = random(40, 190);
          effects.push({
            type: "particle",
            x: body.x,
            y: body.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: random(1.5, 4),
            life: random(0.35, 0.8),
            maxLife: 0.8,
            gravity: 180,
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
      }

      function dropFish() {
        if (state !== "playing" || dropLock > 0) return;
        var radius = fishRadius(currentTier);
        var wall = wallX();
        var x = clamp(cursorX, wall + radius + 3, W - wall - radius - 3);
        var body = createBody(currentTier, x, spawnY(), random(-12, 12), 40);
        bodies.push(body);
        audio.drop();
        hint.classList.add("is-hidden");
        dropLock = 0.32;
        currentTier = nextTier;
        nextTier = pickTier();
        updateHud();
      }

      function mergeBodies(first, second) {
        if (first.removed || second.removed) return;
        first.removed = true;
        second.removed = true;
        var newTier = Math.min(first.tier + 1, MAX_TIER);
        var newRadius = fishRadius(newTier);
        var vx = (first.vx + second.vx) * 0.28;
        var vy = (first.vy + second.vy) * 0.28 - 75;
        var merged = createBody(
          newTier,
          (first.x + second.x) / 2,
          (first.y + second.y) / 2,
          vx,
          vy
        );
        merged.mergeCooldown = 0.1;
        merged.born = 0;
        bodies.push(merged);
        maxTierReached = Math.max(maxTierReached, newTier);
        score += LEVELS[newTier].points;
        var now = performance.now();
        if (now - lastMergeAt < 1500) {
          combo += 1;
        } else {
          combo = 1;
        }
        lastMergeAt = now;
        if (combo > 1) {
          comboEl.textContent = "COMBO × " + combo;
          comboEl.classList.remove("is-visible");
          void comboEl.offsetWidth;
          comboEl.classList.add("is-visible");
          window.clearTimeout(comboHideTimer);
          comboHideTimer = window.setTimeout(function () {
            comboEl.classList.remove("is-visible");
          }, 850);
        }
        addMergeEffects(merged, newRadius);
        addFloat(merged.x, merged.y - newRadius - 4, "+" + LEVELS[newTier].points, LEVELS[newTier].accent);
        audio.merge(newTier);
        updateHud();
      }

      function clampBounds(body) {
        var wall = wallX();
        if (body.x - body.r < wall) {
          body.x = wall + body.r;
          if (body.vx < 0) body.vx *= -0.16;
        } else if (body.x + body.r > W - wall) {
          body.x = W - wall - body.r;
          if (body.vx > 0) body.vx *= -0.16;
        }
        if (body.y + body.r > floorY()) {
          body.y = floorY() - body.r;
          if (body.vy > 0) {
            body.vy = Math.abs(body.vy) > 110 ? -body.vy * 0.13 : 0;
          }
          body.vx *= 0.9;
        }
      }

      function resolvePair(first, second) {
        var dx = second.x - first.x;
        var dy = second.y - first.y;
        var distanceSq = dx * dx + dy * dy;
        var minDist = first.r + second.r;
        if (distanceSq >= minDist * minDist || distanceSq === 0) return;

        var distance = Math.sqrt(distanceSq);
        var nx = dx / distance;
        var ny = dy / distance;

        if (
          first.tier === second.tier &&
          first.tier < MAX_TIER &&
          !first.mergeQueued &&
          !second.mergeQueued &&
          first.mergeCooldown <= 0 &&
          second.mergeCooldown <= 0 &&
          distance < minDist * 0.94
        ) {
          first.mergeQueued = true;
          second.mergeQueued = true;
          return;
        }

        var overlap = minDist - distance;
        var massFirst = first.r * first.r;
        var massSecond = second.r * second.r;
        var totalMass = massFirst + massSecond;
        var correction = 0.72;
        first.x -= nx * overlap * (massSecond / totalMass) * correction;
        first.y -= ny * overlap * (massSecond / totalMass) * correction;
        second.x += nx * overlap * (massFirst / totalMass) * correction;
        second.y += ny * overlap * (massFirst / totalMass) * correction;

        var relativeX = second.vx - first.vx;
        var relativeY = second.vy - first.vy;
        var normalVelocity = relativeX * nx + relativeY * ny;
        if (normalVelocity < 0) {
          var restitution = 0.08;
          var impulse = (-(1 + restitution) * normalVelocity) / (1 / massFirst + 1 / massSecond);
          first.vx -= (impulse * nx) / massFirst;
          first.vy -= (impulse * ny) / massFirst;
          second.vx += (impulse * nx) / massSecond;
          second.vy += (impulse * ny) / massSecond;

          var tangentX = relativeX - normalVelocity * nx;
          var tangentY = relativeY - normalVelocity * ny;
          var friction = 0.06;
          first.vx += (tangentX * friction) / (1 + massSecond / massFirst);
          first.vy += (tangentY * friction) / (1 + massSecond / massFirst);
          second.vx -= (tangentX * friction) / (1 + massFirst / massSecond);
          second.vy -= (tangentY * friction) / (1 + massFirst / massSecond);
        }
      }

      function stepPhysics(dt) {
        for (var i = 0; i < bodies.length; i += 1) {
          var body = bodies[i];
          body.age += dt;
          body.born = Math.min(1, body.born + dt / 0.16);
          body.mergeCooldown = Math.max(0, body.mergeCooldown - dt);
          body.mergeQueued = false;
          body.vy += GRAVITY * dt;
          body.vx *= 0.997;
          body.x += body.vx * dt;
          body.y += body.vy * dt;
          body.vx = clamp(body.vx, -1000, 1000);
          body.vy = clamp(body.vy, -1000, 1400);
          clampBounds(body);
        }

        for (var iteration = 0; iteration < 4; iteration += 1) {
          for (var a = 0; a < bodies.length; a += 1) {
            for (var b = a + 1; b < bodies.length; b += 1) {
              resolvePair(bodies[a], bodies[b]);
            }
          }
          for (var k = 0; k < bodies.length; k += 1) {
            clampBounds(bodies[k]);
          }
        }

        var mergeQueue = bodies.filter(function (body) {
          return body.mergeQueued && !body.removed;
        });
        var queuedIds = {};
        for (var m = 0; m < mergeQueue.length; m += 1) {
          var first = mergeQueue[m];
          if (queuedIds[first.id] || first.removed) continue;
          var partner = null;
          for (var n = m + 1; n < mergeQueue.length; n += 1) {
            var candidate = mergeQueue[n];
            if (queuedIds[candidate.id] || candidate.removed) continue;
            if (candidate.tier !== first.tier) continue;
            var dx = candidate.x - first.x;
            var dy = candidate.y - first.y;
            var reach = first.r + candidate.r;
            if (dx * dx + dy * dy <= reach * reach) {
              partner = candidate;
              break;
            }
          }
          if (partner) {
            queuedIds[first.id] = true;
            queuedIds[partner.id] = true;
            mergeBodies(first, partner);
          }
        }

        if (bodies.some(function (body) { return body.removed; })) {
          bodies = bodies.filter(function (body) { return !body.removed; });
        }
        bodies.forEach(function (body) {
          body.mergeQueued = false;
        });
      }

      function updateOverflow(dt) {
        if (state !== "playing") return;
        var line = dangerY();
        var hasOverflow = bodies.some(function (body) {
          return body.age > 1.05 && body.y - body.r < line && Math.abs(body.vy) < 85;
        });
        if (hasOverflow) {
          overflowTime += dt;
          warningFlash += dt;
        } else {
          overflowTime = Math.max(0, overflowTime - dt * 2.4);
        }
        if (overflowTime > 0.35) {
          statusEl.innerHTML = "<i></i> TANK 02 · PRESSURE HIGH";
          statusEl.style.color = "#ffb3a8";
        } else {
          statusEl.innerHTML = "<i></i> TANK 02 · WATER STABLE";
          statusEl.style.color = "";
        }
        if (overflowTime > 1.55) {
          endGame();
        }
      }

      function endGame() {
        if (state === "over") return;
        state = "over";
        gameOverOpen = true;
        audio.gameOver();
        var result = !endHandled && typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : null;
        endHandled = true;
        if (result) {
          best = Math.max(best, result.best || 0);
          recordEl.hidden = !result.isRecord;
        } else {
          best = Math.max(best, score);
          recordEl.hidden = score === 0;
        }
        finalEl.textContent = String(score);
        bestEl.textContent = pad(best);
        overTitle.textContent =
          maxTierReached >= MAX_TIER
            ? "鲲已经养出来了，鱼缸也满了。"
            : maxTierReached >= 5
              ? "一缸好鱼，差一点就装下了。"
              : "鱼缸装不下了。";
        overEl.classList.add("is-visible");
        window.setTimeout(function () {
          if (!gameOverOpen || isDestroyed || !restartButton.isConnected) return;
          restartButton.focus();
        }, 280);
      }

      function updateEffects(dt) {
        for (var i = effects.length - 1; i >= 0; i -= 1) {
          var effect = effects[i];
          effect.life -= dt;
          if (effect.life <= 0) {
            effects.splice(i, 1);
            continue;
          }
          if (effect.type === "particle") {
            effect.vy += (effect.gravity || 0) * dt;
            effect.x += effect.vx * dt;
            effect.y += effect.vy * dt;
          }
        }
        for (var f = floats.length - 1; f >= 0; f -= 1) {
          floats[f].life -= dt;
          floats[f].y -= dt * 28;
          if (floats[f].life <= 0) floats.splice(f, 1);
        }
        for (var b = 0; b < bubbles.length; b += 1) {
          var bubble = bubbles[b];
          bubble.y -= bubble.speed * dt;
          bubble.phase += dt * 1.4;
          bubble.x += Math.sin(bubble.phase) * 3 * dt;
          if (bubble.y < -8) {
            bubble.y = H + 8;
            bubble.x = Math.random() * W;
          }
        }
      }

      function drawWater(now) {
        var wall = wallX();
        var tankWidth = W - wall * 2;
        var water = ctx.createLinearGradient(0, 0, 0, H);
        water.addColorStop(0, "rgba(44, 100, 148, 0.2)");
        water.addColorStop(0.45, "rgba(7, 24, 54, 0.08)");
        water.addColorStop(1, "rgba(2, 9, 24, 0.24)");
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = "rgba(164, 234, 255, 0.25)";
        ctx.lineWidth = 1;
        var top = 24;
        for (var i = 0; i < 4; i += 1) {
          ctx.beginPath();
          var offset = now * 0.00012 + i * 1.8;
          for (var x = wall + 4; x <= W - wall - 4; x += 12) {
            var y = top + i * 12 + Math.sin(x * 0.016 + offset) * 4 + Math.cos(x * 0.007 - offset * 1.4) * 3;
            if (x === wall + 4) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();

        if (wall > WALL + 5) {
          var gutter = ctx.createLinearGradient(0, 0, wall, 0);
          gutter.addColorStop(0, "rgba(1, 6, 18, 0.42)");
          gutter.addColorStop(0.75, "rgba(4, 14, 34, 0.16)");
          gutter.addColorStop(1, "rgba(119, 204, 241, 0.05)");
          ctx.fillStyle = gutter;
          ctx.fillRect(0, 0, wall, H);
          var gutterRight = ctx.createLinearGradient(W - wall, 0, W, 0);
          gutterRight.addColorStop(0, "rgba(119, 204, 241, 0.05)");
          gutterRight.addColorStop(0.25, "rgba(4, 14, 34, 0.16)");
          gutterRight.addColorStop(1, "rgba(1, 6, 18, 0.42)");
          ctx.fillStyle = gutterRight;
          ctx.fillRect(W - wall, 0, wall, H);

          ctx.strokeStyle = "rgba(152, 224, 255, 0.22)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(wall + 0.5, 0);
          ctx.lineTo(wall + 0.5, H);
          ctx.moveTo(W - wall - 0.5, 0);
          ctx.lineTo(W - wall - 0.5, H);
          ctx.stroke();

          ctx.fillStyle = "rgba(166, 226, 255, 0.2)";
          ctx.font = '6.5px "Cascadia Code", Consolas, monospace';
          ctx.textAlign = "center";
          for (var tick = H * 0.2; tick < H * 0.9; tick += 42) {
            ctx.fillRect(wall - 8, tick, 5, 1);
            ctx.fillRect(W - wall + 3, tick, 5, 1);
          }

          ctx.save();
          ctx.translate(wall * 0.44, H * 0.68);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = "rgba(174, 228, 255, 0.18)";
          ctx.font = '7px "Cascadia Code", Consolas, monospace';
          ctx.textAlign = "left";
          ctx.fillText("SPECIMEN TANK / " + Math.round(tankWidth) + " PX", 0, 0);
          ctx.restore();
        }

        for (var b = 0; b < bubbles.length; b += 1) {
          var bubble = bubbles[b];
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(195, 241, 255, " + bubble.alpha + ")";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        var leftGlass = ctx.createLinearGradient(wall, 0, wall + 22, 0);
        leftGlass.addColorStop(0, "rgba(154, 223, 255, 0.13)");
        leftGlass.addColorStop(1, "rgba(154, 223, 255, 0)");
        ctx.fillStyle = leftGlass;
        ctx.fillRect(wall, 0, 22, H);
        var rightGlass = ctx.createLinearGradient(W - wall - 22, 0, W - wall, 0);
        rightGlass.addColorStop(0, "rgba(154, 223, 255, 0)");
        rightGlass.addColorStop(1, "rgba(154, 223, 255, 0.09)");
        ctx.fillStyle = rightGlass;
        ctx.fillRect(W - wall - 22, 0, 22, H);

        var floorGradient = ctx.createLinearGradient(0, floorY() - 20, 0, H);
        floorGradient.addColorStop(0, "rgba(28, 62, 92, 0)");
        floorGradient.addColorStop(1, "rgba(24, 57, 83, 0.32)");
        ctx.fillStyle = floorGradient;
        ctx.fillRect(wall, floorY() - 20, W - wall * 2, H - floorY() + 20);
        ctx.strokeStyle = "rgba(147, 219, 255, 0.16)";
        ctx.beginPath();
        ctx.moveTo(wall, floorY());
        ctx.lineTo(W - wall, floorY());
        ctx.stroke();
      }

      function drawDangerLine(now) {
        var wall = wallX();
        var y = dangerY();
        var danger = overflowTime > 0.3;
        var alpha = danger ? 0.62 + Math.sin(now * 0.016) * 0.18 : 0.24;
        ctx.save();
        ctx.strokeStyle = danger ? "rgba(255, 139, 120, " + alpha + ")" : "rgba(255, 255, 255, " + alpha + ")";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(wall + 7, y);
        ctx.lineTo(W - wall - 7, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = danger ? "rgba(255, 173, 158, 0.8)" : "rgba(223, 243, 255, 0.32)";
        ctx.font = '7px "Cascadia Code", Consolas, monospace';
        ctx.textAlign = "right";
        ctx.fillText("OVERFLOW LINE", W - wall - 10, y - 9);
        ctx.restore();
      }

      function drawGuide() {
        if (state !== "playing") return;
        var wall = wallX();
        var heldRadius = fishRadius(currentTier);
        var x = clamp(cursorX, wall + heldRadius + 3, W - wall - heldRadius - 3);
        var y = spawnY();
        ctx.save();
        ctx.strokeStyle = "rgba(146, 222, 255, 0.16)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.beginPath();
        ctx.moveTo(x, y + heldRadius + 8);
        ctx.lineTo(x, floorY());
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "rgba(220, 245, 108, 0.16)";
        ctx.beginPath();
        ctx.ellipse(x, floorY() - 1, heldRadius * 0.66, 4, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (dropLock <= 0) {
          var hover = 1 + Math.sin(performance.now() * 0.004) * 0.025;
          drawFish(
            {
              x: x,
              y: y,
              r: heldRadius,
              tier: currentTier,
              seed: 1.7,
              vx: 0,
              vy: 0,
              born: 1,
              age: 1
            },
            performance.now(),
            hover
          );
          ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
          ctx.beginPath();
          ctx.arc(x, y, heldRadius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawFish(body, now, popScale) {
        var r = body.r;
        var level = LEVELS[body.tier];
        var bornScale = popScale || (0.8 + body.born * 0.2);
        var seed = body.seed || 0;
        var wobble = Math.sin(now * 0.004 + seed) * 0.035;
        var tilt = clamp((body.vx || 0) * 0.0006, -0.18, 0.18) + wobble;
        var tailWag = Math.sin(now * 0.006 + seed * 3) * 0.16;

        ctx.save();
        ctx.translate(body.x, body.y);
        ctx.rotate(tilt);
        ctx.scale(bornScale, bornScale);

        if (body.tier === 2) {
          ctx.fillStyle = level.dark;
          for (var spike = 0; spike < 13; spike += 1) {
            var angle = (spike / 13) * Math.PI * 2;
            var inner = r * 0.93;
            var outer = r * (1.12 + (spike % 2) * 0.035);
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle - 0.1) * inner, Math.sin(angle - 0.1) * inner);
            ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            ctx.lineTo(Math.cos(angle + 0.1) * inner, Math.sin(angle + 0.1) * inner);
            ctx.closePath();
            ctx.fill();
          }
        }

        if (body.tier === 3) {
          ctx.strokeStyle = level.dark;
          ctx.lineWidth = Math.max(3, r * 0.12);
          ctx.lineCap = "round";
          for (var t = -2; t <= 2; t += 1) {
            ctx.beginPath();
            ctx.moveTo(t * r * 0.2, r * 0.62);
            ctx.bezierCurveTo(
              t * r * 0.34,
              r * (0.92 + Math.sin(now * 0.004 + t) * 0.08),
              t * r * 0.08,
              r * 1.12,
              t * r * 0.36 + Math.sin(now * 0.005 + t) * 5,
              r * 1.3
            );
            ctx.stroke();
          }
        }

        ctx.save();
        ctx.rotate(tailWag);
        var tailGradient = ctx.createLinearGradient(-r * 1.4, 0, -r * 0.5, 0);
        tailGradient.addColorStop(0, level.accent);
        tailGradient.addColorStop(1, level.dark);
        ctx.fillStyle = tailGradient;
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.12);
        ctx.bezierCurveTo(-r * 1.2, -r * 0.72, -r * 1.55, -r * 0.6, -r * 1.38, -r * 0.03);
        ctx.bezierCurveTo(-r * 1.28, r * 0.34, -r * 1.12, r * 0.43, -r * 0.7, r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        var bodyGradient = ctx.createRadialGradient(-r * 0.32, -r * 0.42, r * 0.06, r * 0.1, r * 0.1, r * 1.12);
        bodyGradient.addColorStop(0, level.accent);
        bodyGradient.addColorStop(0.45, level.color);
        bodyGradient.addColorStop(1, level.dark);
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(8, 20, 42, 0.17)";
        ctx.lineWidth = Math.max(1, r * 0.025);
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();
        var bellyGradient = ctx.createLinearGradient(0, 0, 0, r);
        bellyGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        bellyGradient.addColorStop(1, level.belly);
        ctx.fillStyle = bellyGradient;
        ctx.beginPath();
        ctx.ellipse(0, r * 0.35, r * 0.95, r * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        if (body.tier === 1) {
          ctx.fillStyle = "rgba(255, 250, 240, 0.75)";
          ctx.beginPath();
          ctx.ellipse(-r * 0.42, -r * 0.08, r * 0.11, r * 0.5, 0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(r * 0.27, r * 0.03, r * 0.1, r * 0.46, 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else if (body.tier >= 4) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
          for (var dot = 0; dot < 3; dot += 1) {
            ctx.beginPath();
            ctx.arc(-r * 0.38 + dot * r * 0.28, r * 0.28 - dot * r * 0.07, r * 0.07, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        ctx.fillStyle = "rgba(8, 20, 42, 0.1)";
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.12, r * 0.94, r * 0.76, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.52, r * 0.34, r * 0.14, -0.46, 0, Math.PI * 2);
        ctx.fill();

        var eyeY = -r * 0.11;
        var eyeOffset = r * 0.27;
        var eyeRadius = r * 0.15;
        var lookX = clamp((body.vx || 0) * 0.006, -r * 0.035, r * 0.035);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.arc(eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#102039";
        ctx.beginPath();
        ctx.arc(-eyeOffset + lookX, eyeY + r * 0.018, eyeRadius * 0.54, 0, Math.PI * 2);
        ctx.arc(eyeOffset + lookX, eyeY + r * 0.018, eyeRadius * 0.54, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(-eyeOffset + lookX + r * 0.03, eyeY - r * 0.03, eyeRadius * 0.18, 0, Math.PI * 2);
        ctx.arc(eyeOffset + lookX + r * 0.03, eyeY - r * 0.03, eyeRadius * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 105, 113, 0.22)";
        ctx.beginPath();
        ctx.ellipse(-r * 0.52, r * 0.13, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.52, r * 0.13, r * 0.12, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(28, 33, 48, 0.55)";
        ctx.lineWidth = Math.max(1, r * 0.035);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, r * 0.09, r * 0.18, 0.15, Math.PI - 0.15);
        ctx.stroke();

        if (body.tier >= 5) {
          ctx.fillStyle = level.dark;
          ctx.beginPath();
          ctx.moveTo(-r * 0.05, -r * 0.98);
          ctx.quadraticCurveTo(r * 0.38, -r * 1.34, r * 0.5, -r * 0.85);
          ctx.closePath();
          ctx.fill();
        }

        if (body.tier === 7) {
          ctx.save();
          ctx.translate(0, -r * 0.8);
          ctx.fillStyle = "#ffefad";
          ctx.strokeStyle = "#b8861b";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-r * 0.3, r * 0.12);
          ctx.lineTo(-r * 0.34, -r * 0.22);
          ctx.lineTo(-r * 0.1, -r * 0.02);
          ctx.lineTo(0, -r * 0.3);
          ctx.lineTo(r * 0.12, -r * 0.02);
          ctx.lineTo(r * 0.35, -r * 0.24);
          ctx.lineTo(r * 0.3, r * 0.12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      }

      function drawEffects() {
        for (var i = 0; i < effects.length; i += 1) {
          var effect = effects[i];
          var alpha = clamp(effect.life / effect.maxLife, 0, 1);
          if (effect.type === "ring") {
            var progress = 1 - effect.life / effect.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha * 0.55;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              effect.x,
              effect.y,
              effect.radius + (effect.maxRadius - effect.radius) * progress,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
          } else {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        for (var f = 0; f < floats.length; f += 1) {
          var floatText = floats[f];
          ctx.save();
          ctx.globalAlpha = clamp(floatText.life / floatText.maxLife, 0, 1);
          ctx.fillStyle = floatText.color;
          ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
          ctx.textAlign = "center";
          ctx.fillText(floatText.text, floatText.x, floatText.y);
          ctx.restore();
        }
      }

      function draw() {
        if (!W || !H) return;
        var now = performance.now();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);

        drawWater(now);
        drawDangerLine(now);
        drawGuide();
        for (var i = 0; i < bodies.length; i += 1) {
          drawFish(bodies[i], now);
        }
        drawEffects();

        if (overflowTime > 0.2) {
          var flash = Math.min(0.16, overflowTime * 0.06);
          ctx.fillStyle = "rgba(255, 92, 74, " + flash + ")";
          ctx.fillRect(0, 0, W, H);
        }

        if (state === "playing") {
          var line = dangerY();
          for (var b = 0; b < bodies.length; b += 1) {
            if (bodies[b].y - bodies[b].r < line) {
              ctx.save();
              ctx.globalAlpha = 0.38 + Math.sin(now * 0.012) * 0.15;
              ctx.fillStyle = "#ffb3a8";
              ctx.font = '7px "Cascadia Code", Consolas, monospace';
              ctx.textAlign = "left";
              ctx.fillText("STACKING…", wallX() + 10, line - 9);
              ctx.restore();
              break;
            }
          }
        }
      }

      function loop(now) {
        if (isDestroyed) return;
        if (!lastFrame) lastFrame = now;
        var dt = Math.min((now - lastFrame) / 1000, 0.034);
        lastFrame = now;

        if (state === "playing") {
          dropLock = Math.max(0, dropLock - dt);
          var substeps = Math.max(1, Math.ceil(dt / 0.018));
          var step = dt / substeps;
          for (var i = 0; i < substeps; i += 1) {
            stepPhysics(step);
          }
          updateOverflow(dt);
          updateHud();
        }
        updateEffects(dt);
        draw();
        raf = window.requestAnimationFrame(loop);
      }

      function getPointerX(event) {
        var rect = canvas.getBoundingClientRect();
        var relative = ((event.clientX - rect.left) / rect.width) * W;
        var wall = wallX();
        return clamp(relative, wall + 10, W - wall - 10);
      }

      function onPointerDown(event) {
        if (state !== "playing") return;
        event.preventDefault();
        dragging = true;
        cursorX = getPointerX(event);
        if (canvas.setPointerCapture) {
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch (error) {}
        }
        canvas.focus();
      }

      function onPointerMove(event) {
        if (state !== "playing") return;
        cursorX = getPointerX(event);
      }

      function onPointerUp(event) {
        if (!dragging) return;
        dragging = false;
        if (state !== "playing") return;
        cursorX = getPointerX(event);
        dropFish();
      }

      function onKeyDown(event) {
        if (state !== "playing") return;
        if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
          event.preventDefault();
          var step = Math.max(14, W * 0.035);
          var wall = wallX();
          cursorX = clamp(
            cursorX + (event.code === "ArrowLeft" ? -step : step),
            wall + fishRadius(currentTier) + 3,
            W - wall - fishRadius(currentTier) - 3
          );
        } else if (event.code === "Space") {
          event.preventDefault();
          dropFish();
        }
      }

      function resizeCanvas() {
        var rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        var oldW = W;
        var oldH = H;
        var oldScale = scale;
        W = rect.width;
        H = rect.height;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        scale = clamp(Math.min(W / 460, H / 690), 0.62, 1.18);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        if (oldW > 0 && oldH > 0 && bodies.length) {
          var ratioX = W / oldW;
          var ratioY = H / oldH;
          var ratioScale = scale / oldScale;
          for (var i = 0; i < bodies.length; i += 1) {
            var body = bodies[i];
            body.x *= ratioX;
            body.y *= ratioY;
            body.r *= ratioScale;
            clampBounds(body);
          }
          cursorX = clamp(cursorX * ratioX, wallX() + 10, W - wallX() - 10);
        } else if (!bodies.length) {
          cursorX = W / 2;
        }
        createBackground();
        return true;
      }

      function onResize() {
        if (isDestroyed) return;
        resizeCanvas();
      }

      function restart() {
        reset();
        canvas.focus();
      }

      function destroy() {
        isDestroyed = true;
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        window.clearTimeout(comboHideTimer);
        if (resizeObserver) resizeObserver.disconnect();
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onResize);
      }

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onResize);
      restartButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      resizeCanvas();
      if (!W) {
        W = 460;
        H = 690;
        scale = 1;
        createBackground();
      }
      reset();

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(stage);
      }

      raf = window.requestAnimationFrame(loop);

      return {
        destroy: destroy,
        restart: restart
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.fish = MODULE;
})();
