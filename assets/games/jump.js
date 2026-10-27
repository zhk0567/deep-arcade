/* ============================================================
   DeepSeek 深海游乐场 — 01 跳一跳
   Canvas mini game. Mounted by js/site.js.
   ============================================================ */
(function () {
  "use strict";

  var GRAVITY = 1650;
  var MAX_CHARGE_MS = 980;
  var START_POWER = 230;
  var POWER_RANGE = 390;
  var JUMP_LIFT = 575;
  var LIFT_RANGE = 85;

  function pad(value) {
    return String(value).padStart(3, "0");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {
        jump: function () {},
        land: function () {},
        fail: function () {},
        charge: function () {},
        click: function () {}
      };

      root.innerHTML =
        '<div class="jump-shell">' +
        '<canvas class="jump-canvas" tabindex="0" aria-label="跳一跳游戏区域，按住蓄力，松开起跳"></canvas>' +
        '<div class="jump-hud">' +
        '  <div class="hud-panel"><span class="hud-label">SCORE / 本局</span><b data-jump-score>000</b></div>' +
        '  <div class="jump-combo" data-jump-combo></div>' +
        '  <div class="hud-panel hud-panel--best"><span class="hud-label">BEST / 最佳</span><b data-jump-best>000</b></div>' +
        "</div>" +
        '<div class="jump-power"><div class="jump-power-head"><span>JUMP POWER</span><b data-jump-power-label>0%</b></div>' +
        '  <div class="jump-power-track"><div class="jump-power-fill" data-jump-power-fill></div></div>' +
        "</div>" +
        '<div class="jump-hint"><i></i><span data-jump-hint-text>按住蓄力 · 松开起跳</span></div>' +
        '<div class="jump-flash" data-jump-flash></div>' +
        '<div class="game-over" data-jump-over>' +
        '  <div class="game-over__card">' +
        '    <span class="game-over__kicker">DIVE ENDED / 信号中断</span>' +
        '    <h3 data-jump-over-title>差一点点，就上岸了。</h3>' +
        '    <div class="game-over__score" data-jump-final>0</div>' +
        '    <p class="game-over__sub">本次跳跃 / 最佳纪录</p>' +
        '    <span class="game-over__record" data-jump-record hidden>NEW RECORD · 新纪录</span>' +
        '    <div class="game-over__actions">' +
        '      <button type="button" class="game-over__primary" data-jump-restart>再来一局</button>' +
        '      <button type="button" class="game-over__secondary" data-jump-exit>返回大厅</button>' +
        "    </div>" +
        "  </div>" +
        "</div>" +
        "</div>";

      var shell = root.querySelector(".jump-shell");
      var canvas = root.querySelector(".jump-canvas");
      var ctx = canvas.getContext("2d");
      var scoreEl = root.querySelector("[data-jump-score]");
      var bestEl = root.querySelector("[data-jump-best]");
      var comboEl = root.querySelector("[data-jump-combo]");
      var powerFill = root.querySelector("[data-jump-power-fill]");
      var powerLabel = root.querySelector("[data-jump-power-label]");
      var hint = root.querySelector(".jump-hint");
      var hintText = root.querySelector("[data-jump-hint-text]");
      var flashEl = root.querySelector("[data-jump-flash]");
      var overEl = root.querySelector("[data-jump-over]");
      var finalEl = root.querySelector("[data-jump-final]");
      var recordEl = root.querySelector("[data-jump-record]");
      var overTitle = root.querySelector("[data-jump-over-title]");
      var restartButton = root.querySelector("[data-jump-restart]");
      var exitButton = root.querySelector("[data-jump-exit]");

      var W = 0;
      var H = 0;
      var DPR = 1;
      var layoutScale = 1;
      var visualScale = 1;
      var state = "idle";
      var score = 0;
      var best = Number(opts.best) || 0;
      var currentIndex = 0;
      var platforms = [];
      var particles = [];
      var bubbles = [];
      var camera = 0;
      var cameraTarget = 0;
      var power = 0;
      var chargeStart = 0;
      var chargingPointer = false;
      var players = null;
      var raf = 0;
      var lastFrame = 0;
      var gameOverTimer = 0;
      var overOpen = false;
      var endHandled = false;
      var hintTimer = 0;
      var screenPulse = 0;
      var farWhales = [];
      var resizeObserver = null;
      var isDestroyed = false;
      var lastPowerLabel = -1;

      var player = {
        x: 0,
        feet: 0,
        vx: 0,
        vy: 0,
        rot: 0,
        deadTime: 0
      };

      function initBackground() {
        bubbles = [];
        var count = Math.round(clamp(W / 45, 14, 38));
        for (var i = 0; i < count; i += 1) {
          bubbles.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: random(1, 3.4),
            speed: random(7, 22),
            alpha: random(0.06, 0.28),
            sway: Math.random() * Math.PI * 2
          });
        }
        farWhales = [
          { x: W * 0.16, y: H * 0.32, scale: 0.55, alpha: 0.035, speed: 7 },
          { x: W * 0.82, y: H * 0.42, scale: 0.38, alpha: 0.025, speed: 4 }
        ];
      }

      function platformY(offset) {
        return H * 0.65 + offset;
      }

      function addPlatform(previous, index) {
        var difficulty = Math.min(index, 13);
        var baseWidth = random(132 - difficulty * 2, 158 - difficulty * 2.2);
        baseWidth = clamp(baseWidth, 92, 158);
        var width = baseWidth * layoutScale;
        var gap = random(128 + difficulty * 4, 175 + difficulty * 6);
        gap = Math.min(gap, 255) * layoutScale;
        var offset = index === 0 ? 0 : random(-22, 22);
        var x;
        if (previous) {
          x = previous.x + previous.width / 2 + gap + width / 2;
        } else {
          x = W * 0.23;
        }
        return {
          x: x,
          width: width,
          offset: offset,
          y: platformY(offset),
          index: index,
          tone: index % 3
        };
      }

      function buildPlatforms() {
        platforms = [];
        currentIndex = 0;
        var first = addPlatform(null, 0);
        platforms.push(first);
        for (var i = 1; i < 9; i += 1) {
          platforms.push(addPlatform(platforms[i - 1], i));
        }
        player.x = first.x;
        player.feet = first.y;
        player.vx = 0;
        player.vy = 0;
        player.rot = 0;
        player.deadTime = 0;
        camera = 0;
        cameraTarget = Math.max(0, player.x - W * 0.32);
      }

      function extendPlatforms() {
        while (platforms.length < currentIndex + 9) {
          platforms.push(addPlatform(platforms[platforms.length - 1], platforms.length));
        }
      }

      function reset() {
        window.clearTimeout(gameOverTimer);
        window.clearTimeout(hintTimer);
        state = "idle";
        score = 0;
        power = 0;
        chargingPointer = false;
        overOpen = false;
        endHandled = false;
        players = null;
        lastPowerLabel = -1;
        particles = [];
        overEl.classList.remove("is-visible");
        hint.classList.remove("is-hidden");
        hintText.textContent = "按住蓄力 · 松开起跳";
        comboEl.textContent = "";
        comboEl.classList.remove("is-visible");
        flashEl.classList.remove("is-visible");
        powerFill.style.width = "0%";
        powerLabel.textContent = "0%";
        buildPlatforms();
        updateHud();
        lastFrame = performance.now();
      }

      function updateHud() {
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(Math.max(best, score));
        updatePowerUi();
      }

      function updatePowerUi() {
        var percent = Math.round(power * 100);
        if (percent === lastPowerLabel) return;
        lastPowerLabel = percent;
        powerFill.style.width = percent + "%";
        powerLabel.textContent = percent + "%";
      }

      function beginCharge() {
        if (state !== "idle" || overOpen) return;
        if (!canPlay()) return;
        state = "charging";
        power = 0;
        chargeStart = performance.now();
        chargingPointer = true;
        hint.classList.add("is-hidden");
        lastPowerLabel = -1;
        updatePowerUi();
        audio.charge(0);
      }

      function releaseCharge() {
        if (state !== "charging") return;
        chargingPointer = false;
        state = "air";
        var launchPower = clamp(power, 0.06, 1);
        player.vx = (START_POWER + launchPower * POWER_RANGE) * layoutScale;
        player.vy = -(JUMP_LIFT + launchPower * LIFT_RANGE);
        power = 0;
        updatePowerUi();
        spawnBurst(player.x, player.feet - 6, ["#dcf56c", "#83e8ff", "#ffffff"], 9, 70);
        audio.jump();
        hintText.textContent = "落点稳稳的，才叫推理。";
        window.clearTimeout(hintTimer);
        hintTimer = window.setTimeout(function () {
          hint.classList.add("is-hidden");
        }, 1300);
        flashEl.textContent = launchPower > 0.94 ? "FULL POWER!" : "";
        if (flashEl.textContent) {
          flashEl.classList.remove("is-visible");
          void flashEl.offsetWidth;
          flashEl.classList.add("is-visible");
        }
      }

      function canPlay() {
        return W > 0 && H > 0;
      }

      function landOn(platform) {
        state = "idle";
        player.feet = platform.y;
        player.vx = 0;
        player.vy = 0;
        player.rot = 0;
        var previousIndex = currentIndex;
        var skip = platform.index - previousIndex;
        if (skip > 0) {
          currentIndex = platform.index;
          var perfect = Math.abs(player.x - platform.x) < platform.width * 0.19;
          if (perfect) {
            score += 1 + (skip > 1 ? skip : 0) + 1;
          } else {
            score += 1 + (skip > 1 ? skip - 1 : 0);
          }
          extendPlatforms();
          cameraTarget = Math.max(0, player.x - W * 0.32);
          spawnBurst(
            player.x,
            player.feet - 4,
            perfect ? ["#dcf56c", "#ffffff", "#83e8ff"] : ["#83e8ff", "#ffffff"],
            perfect ? 18 : 10,
            perfect ? 120 : 70
          );
          audio.land(perfect);
          if (perfect) {
            comboEl.textContent = "PERFECT · LANDING";
            comboEl.classList.add("is-visible");
            flashEl.textContent = "PERFECT +2";
            flashEl.classList.remove("is-visible");
            void flashEl.offsetWidth;
            flashEl.classList.add("is-visible");
            window.setTimeout(function () {
              comboEl.classList.remove("is-visible");
            }, 1100);
          } else {
            comboEl.classList.remove("is-visible");
          }
          updateHud();
          screenPulse = 0.35;
        } else {
          cameraTarget = Math.max(0, player.x - W * 0.32);
        }
      }

      function fail() {
        if (state === "dead" || overOpen) return;
        state = "dead";
        player.vx = 0;
        player.vy = 0;
        player.deadTime = 0;
        audio.fail();
        spawnBurst(player.x, player.feet, ["#7ecbff", "#4d6bfe", "#ffffff"], 16, 130);
        window.clearTimeout(gameOverTimer);
        gameOverTimer = window.setTimeout(showGameOver, 560);
      }

      function showGameOver() {
        if (isDestroyed) return;
        overOpen = true;
        if (!endHandled) {
          endHandled = true;
          var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : null;
          if (result) {
            best = Math.max(best, result.best || 0);
            recordEl.hidden = !result.isRecord;
          } else {
            best = Math.max(best, score);
            recordEl.hidden = score === 0;
          }
          bestEl.textContent = pad(best);
        }
        finalEl.textContent = String(score);
        overTitle.textContent =
          score === 0
            ? "第一跳，先热个身。"
            : score < 4
              ? "差一点点，就上岸了。"
              : score < 9
                ? "手感来了，再深一点。"
                : "这条鲸鱼，已经游得很远了。";
        overEl.classList.add("is-visible");
        window.setTimeout(function () {
          if (!overOpen || isDestroyed || !restartButton.isConnected) return;
          restartButton.focus();
        }, 280);
      }

      function spawnBurst(x, y, colors, count, force) {
        for (var i = 0; i < count; i += 1) {
          var angle = random(-Math.PI, 0);
          var speed = random(force * 0.35, force);
          particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: random(1.4, 3.8),
            life: random(0.4, 0.9),
            maxLife: 0.9,
            color: colors[Math.floor(Math.random() * colors.length)],
            gravity: random(80, 260)
          });
        }
      }

      function update(dt, now) {
        if (!canPlay()) return;

        if (state === "charging") {
          power = clamp((now - chargeStart) / MAX_CHARGE_MS, 0, 1);
          updatePowerUi();
          if (power === 1 && Math.floor(now / 120) % 4 === 0) {
            audio.charge(1);
          }
        }

        if (state === "air") {
          player.vy += GRAVITY * dt;
          player.x += player.vx * dt;
          var previousFeet = player.feet;
          player.feet += player.vy * dt;
          player.rot = clamp(player.vy / 2200, -0.16, 0.33);

          if (player.vy > 0) {
            for (var i = 0; i < platforms.length; i += 1) {
              var platform = platforms[i];
              var withinX =
                player.x > platform.x - platform.width / 2 + 5 &&
                player.x < platform.x + platform.width / 2 - 5;
              if (
                withinX &&
                previousFeet <= platform.y + 2 &&
                player.feet >= platform.y &&
                player.feet < platform.y + 34
              ) {
                landOn(platform);
                break;
              }
            }
          }

          if (player.feet > H + 100) {
            fail();
          }

          if (player.x > camera + W * 0.6) {
            cameraTarget = Math.max(0, player.x - W * 0.38);
          }
        }

        if (state === "dead") {
          player.deadTime += dt;
          player.vy += GRAVITY * 0.72 * dt;
          player.feet += player.vy * dt;
          player.rot += dt * 2.2;
          cameraTarget = Math.max(0, player.x - W * 0.38);
        }

        camera += (cameraTarget - camera) * clamp(dt * 5.5, 0, 1);

        if (state === "idle" || state === "charging") {
          var currentPlatform = platforms[currentIndex];
          if (currentPlatform) {
            cameraTarget = Math.max(0, currentPlatform.x - W * 0.32);
          }
        }

        for (var p = particles.length - 1; p >= 0; p -= 1) {
          var particle = particles[p];
          particle.life -= dt;
          if (particle.life <= 0) {
            particles.splice(p, 1);
            continue;
          }
          particle.vy += particle.gravity * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vx *= 0.985;
        }

        for (var b = 0; b < bubbles.length; b += 1) {
          var bubble = bubbles[b];
          bubble.y -= bubble.speed * dt;
          bubble.sway += dt;
          bubble.x += Math.sin(bubble.sway * 0.8) * 3 * dt;
          if (bubble.y < -10) {
            bubble.y = H + 10;
            bubble.x = Math.random() * W;
          }
          if (bubble.x < -10) bubble.x = W + 10;
          if (bubble.x > W + 10) bubble.x = -10;
        }

        screenPulse = Math.max(0, screenPulse - dt);
      }

      function drawBackground(now) {
        var gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#0a2149");
        gradient.addColorStop(0.45, "#071936");
        gradient.addColorStop(1, "#040c20");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        var glow = ctx.createRadialGradient(W * 0.55, -H * 0.05, 0, W * 0.55, -H * 0.05, H * 0.88);
        glow.addColorStop(0, "rgba(83, 148, 255, 0.24)");
        glow.addColorStop(0.45, "rgba(32, 77, 164, 0.09)");
        glow.addColorStop(1, "rgba(4, 12, 32, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        drawLightShafts(now);
        drawGrid();
        drawDistantWhales(now);

        for (var i = 0; i < bubbles.length; i += 1) {
          var bubble = bubbles[i];
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(163, 216, 255, " + bubble.alpha + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        var floor = ctx.createLinearGradient(0, H * 0.86, 0, H);
        floor.addColorStop(0, "rgba(5, 16, 42, 0)");
        floor.addColorStop(1, "rgba(2, 8, 24, 0.85)");
        ctx.fillStyle = floor;
        ctx.fillRect(0, H * 0.86, W, H * 0.14);
      }

      function drawLightShafts(now) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        var sway = Math.sin(now * 0.00016) * 18;
        var shafts = [
          { x: W * 0.27 + sway, w: 80, alpha: 0.055 },
          { x: W * 0.55 - sway * 0.5, w: 48, alpha: 0.04 },
          { x: W * 0.78 + sway * 0.7, w: 110, alpha: 0.03 }
        ];
        for (var i = 0; i < shafts.length; i += 1) {
          var shaft = shafts[i];
          var grad = ctx.createLinearGradient(shaft.x, 0, shaft.x + 70, H);
          grad.addColorStop(0, "rgba(152, 211, 255, " + shaft.alpha + ")");
          grad.addColorStop(1, "rgba(152, 211, 255, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(shaft.x, 0);
          ctx.lineTo(shaft.x + shaft.w, 0);
          ctx.lineTo(shaft.x + shaft.w * 2.4, H);
          ctx.lineTo(shaft.x + shaft.w * 0.6, H);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      function drawGrid() {
        ctx.save();
        ctx.strokeStyle = "rgba(116, 171, 255, 0.05)";
        ctx.lineWidth = 1;
        var offset = (camera * 0.18) % 72;
        for (var x = -offset; x < W + 72; x += 72) {
          ctx.beginPath();
          ctx.moveTo(x, H * 0.08);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        for (var y = H * 0.16; y < H; y += 72) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      function drawDistantWhales(now) {
        for (var i = 0; i < farWhales.length; i += 1) {
          var whale = farWhales[i];
          var drift = Math.sin(now * 0.00008 + i * 2) * 18;
          ctx.save();
          ctx.globalAlpha = whale.alpha;
          ctx.translate(whale.x + drift, whale.y);
          ctx.scale(whale.scale, whale.scale);
          drawWhaleBody(0, 0, 0, 1, 1);
          ctx.restore();
        }
      }

      function drawPlatforms(now) {
        var targetIndex = Math.min(currentIndex + 1, platforms.length - 1);
        for (var i = 0; i < platforms.length; i += 1) {
          var platform = platforms[i];
          var sx = platform.x - camera;
          if (sx + platform.width / 2 < -60 || sx - platform.width / 2 > W + 60) continue;
          drawPlatform(platform, sx, state === "charging" && i === targetIndex, now);
        }
      }

      function drawPlatform(platform, sx, isTarget, now) {
        var half = platform.width / 2;
        var depth = 17;
        var palette =
          platform.tone === 0
            ? { top: "#f2f6ff", topAlt: "#cbd8ff", side: "#4257a9", line: "rgba(28, 42, 105, 0.38)" }
            : platform.tone === 1
              ? { top: "#f3ffd3", topAlt: "#d8f08b", side: "#5e7133", line: "rgba(53, 66, 14, 0.35)" }
              : { top: "#ddf9ff", topAlt: "#a9e9f8", side: "#2e6a80", line: "rgba(18, 70, 88, 0.35)" };

        var beam = ctx.createLinearGradient(0, platform.y, 0, H);
        beam.addColorStop(0, "rgba(127, 214, 255, 0.09)");
        beam.addColorStop(1, "rgba(127, 214, 255, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(sx - 1, platform.y + depth, 2, H - platform.y);
        ctx.beginPath();
        ctx.moveTo(sx - half * 0.65, platform.y + depth);
        ctx.lineTo(sx - 20, H);
        ctx.lineTo(sx + 20, H);
        ctx.lineTo(sx + half * 0.65, platform.y + depth);
        ctx.closePath();
        ctx.fill();

        if (isTarget) {
          var pulse = 0.55 + Math.sin(now * 0.008) * 0.2;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = "#dcf56c";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(sx, platform.y, half + 12, 18, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = pulse * 0.4;
          ctx.beginPath();
          ctx.ellipse(sx, platform.y, half + 20, 24, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.fillStyle = "rgba(220, 245, 108, 0.86)";
          ctx.font = '7px "Cascadia Code", Consolas, monospace';
          ctx.textAlign = "center";
          ctx.fillText("LANDING ZONE", sx, platform.y - 27);
          ctx.restore();
        }

        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 12;

        var sideGradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + depth);
        sideGradient.addColorStop(0, palette.side);
        sideGradient.addColorStop(1, "rgba(9, 24, 63, 0.92)");
        ctx.fillStyle = sideGradient;
        roundedRect(ctx, sx - half, platform.y + 1, platform.width, depth, 8);
        ctx.fill();
        ctx.restore();

        var topGradient = ctx.createLinearGradient(sx, platform.y - 10, sx, platform.y + 10);
        topGradient.addColorStop(0, palette.top);
        topGradient.addColorStop(1, palette.topAlt);
        ctx.beginPath();
        ctx.ellipse(sx, platform.y, half, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = topGradient;
        ctx.fill();
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(sx, platform.y + 1, half * 0.79, 6.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(20, 35, 88, 0.13)";
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(sx, platform.y, 13, 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(32, 53, 124, 0.27)";
        ctx.stroke();

        ctx.fillStyle = palette.line;
        ctx.font = '600 8px "Cascadia Code", Consolas, monospace';
        ctx.textAlign = "center";
        ctx.fillText("PAD " + String(platform.index + 1).padStart(2, "0"), sx, platform.y + 2.5);

        if (state === "charging" && isTarget) {
          ctx.strokeStyle = "rgba(220, 245, 108, 0.28)";
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.ellipse(sx, platform.y, platform.width * 0.19, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      function drawTrajectory() {
        if (state !== "charging") return;
        var launchPower = clamp(power, 0.06, 1);
        var vx = (START_POWER + launchPower * POWER_RANGE) * layoutScale;
        var vy = -(JUMP_LIFT + launchPower * LIFT_RANGE);
        var x = player.x;
        var feet = player.feet;
        ctx.save();
        for (var step = 0; step < 24; step += 1) {
          var t = 0.06;
          vy += GRAVITY * t;
          x += vx * t;
          feet += vy * t;
          if (step % 2 === 0) {
            var sx = x - camera;
            var alpha = 0.8 - step * 0.025;
            ctx.beginPath();
            ctx.arc(sx, feet, Math.max(1.2, 3.2 - step * 0.07), 0, Math.PI * 2);
            ctx.fillStyle = "rgba(220, 245, 108, " + alpha + ")";
            ctx.fill();
          }
          if (feet > H) break;
        }
        ctx.restore();
      }

      function drawWhaleBody(x, feet, rot, scaleX, scaleY, eyeOffset, renderScale) {
        var whaleScale = renderScale || 1;
        ctx.save();
        ctx.translate(x, feet);
        ctx.scale(scaleX * whaleScale, scaleY * whaleScale);
        ctx.translate(0, -26);
        ctx.rotate(rot);

        var tail = ctx.createLinearGradient(-58, -55, -20, -7);
        tail.addColorStop(0, "#7e9aff");
        tail.addColorStop(1, "#2b43c9");
        ctx.fillStyle = tail;
        ctx.beginPath();
        ctx.moveTo(-23, -31);
        ctx.bezierCurveTo(-35, -43, -48, -54, -59, -50);
        ctx.bezierCurveTo(-54, -37, -44, -28, -33, -24);
        ctx.bezierCurveTo(-45, -21, -53, -13, -55, -4);
        ctx.bezierCurveTo(-42, -7, -31, -16, -21, -23);
        ctx.closePath();
        ctx.fill();

        var bodyGradient = ctx.createLinearGradient(-25, -50, 28, 5);
        bodyGradient.addColorStop(0, "#8aa6ff");
        bodyGradient.addColorStop(0.5, "#5d7cff");
        bodyGradient.addColorStop(1, "#3856e1");
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, -27, 37, 25, -0.04, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -27, 36, 24, -0.04, 0, Math.PI * 2);
        ctx.clip();
        var belly = ctx.createLinearGradient(0, -30, 0, 0);
        belly.addColorStop(0, "rgba(220, 234, 255, 0.05)");
        belly.addColorStop(1, "rgba(225, 240, 255, 0.42)");
        ctx.fillStyle = belly;
        ctx.beginPath();
        ctx.ellipse(6, -13, 26, 15, 0.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#2d46cf";
        ctx.beginPath();
        ctx.moveTo(-8, -11);
        ctx.quadraticCurveTo(-19, 1, -5, -2);
        ctx.quadraticCurveTo(4, -3, 8, -13);
        ctx.closePath();
        ctx.fill();

        var eyeX = 19 + (eyeOffset || 0);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(eyeX, -34, 5.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#07102a";
        ctx.beginPath();
        ctx.arc(eyeX + 1.1, -33.7, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(eyeX + 2.1, -34.9, 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(7, 16, 42, 0.5)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(24, -24, 4, 0.16, Math.PI * 0.75);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 150, 160, 0.22)";
        ctx.beginPath();
        ctx.ellipse(11, -22.5, 4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.ellipse(-15, -41, 12, 4, -0.34, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      function drawPlayer(now) {
        var sx = player.x - camera;
        var bob = 0;
        var scaleX = 1;
        var scaleY = 1;
        var rot = 0;
        if (state === "idle") {
          bob = Math.sin(now * 0.003) * 2;
        } else if (state === "charging") {
          scaleY = 1 - power * 0.22;
          scaleX = 1 + power * 0.14;
          bob = Math.sin(now * 0.012) * 1.1;
        } else if (state === "air") {
          scaleX = 0.94;
          scaleY = 1.06;
          rot = player.rot;
        } else if (state === "dead") {
          rot = player.rot;
        }

        if (state === "idle" || state === "charging") {
          ctx.save();
          ctx.fillStyle = "rgba(2, 10, 28, 0.26)";
          ctx.beginPath();
          ctx.ellipse(
            sx,
            player.feet + 2,
            (36 - power * 5) * visualScale,
            8 * visualScale,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
        }

        if (state === "charging") {
          var aura = 0.12 + Math.sin(now * 0.02) * 0.05 + power * 0.08;
          ctx.save();
          ctx.strokeStyle = "rgba(220, 245, 108, " + aura + ")";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(
            sx,
            player.feet - 26 * visualScale,
            (53 + power * 17) * visualScale,
            (38 + power * 10) * visualScale,
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        drawWhaleBody(
          sx,
          player.feet + bob,
          rot,
          scaleX,
          scaleY,
          state === "charging" ? -1 : 0,
          visualScale
        );

        if (state === "charging" && power > 0.96) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
          ctx.lineWidth = 1;
          for (var i = 0; i < 3; i += 1) {
            ctx.beginPath();
            ctx.arc(
              sx,
              player.feet - 27 * visualScale,
              (54 + i * 7 + Math.sin(now * 0.02 + i) * 3) * visualScale,
              Math.PI * 1.08,
              Math.PI * 1.5
            );
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      function drawParticles() {
        for (var i = 0; i < particles.length; i += 1) {
          var particle = particles[i];
          var alpha = clamp(particle.life / particle.maxLife, 0, 1);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x - camera, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      function draw(now) {
        if (!W || !H) return;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);

        var shake = state === "dead" ? Math.max(0, 10 - player.deadTime * 22) : 0;
        if (shake > 0.2) {
          ctx.save();
          ctx.translate(random(-shake, shake), random(-shake, shake));
        }

        drawBackground(now);
        drawPlatforms(now);
        drawTrajectory();
        drawPlayer(now);
        drawParticles();

        if (state === "charging" && power > 0.01) {
          var next = platforms[currentIndex + 1];
          if (next) {
            ctx.save();
            ctx.strokeStyle = "rgba(220, 245, 108, 0.2)";
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(player.x - camera, player.feet - 50);
            ctx.lineTo(next.x - camera, next.y - 18);
            ctx.stroke();
            ctx.restore();
          }
        }

        if (shake > 0.2) ctx.restore();
      }

      function loop(now) {
        if (isDestroyed) return;
        if (!lastFrame) lastFrame = now;
        var dt = Math.min((now - lastFrame) / 1000, 0.034);
        lastFrame = now;
        update(dt, now);
        draw(now);
        raf = window.requestAnimationFrame(loop);
      }

      function handlePointerDown(event) {
        if (event.button != null && event.button !== 0) return;
        if (!canPlay() || overOpen) return;
        event.preventDefault();
        beginCharge();
      }

      function handlePointerUp() {
        if (state === "charging") {
          releaseCharge();
        }
      }

      function handleKeyDown(event) {
        if (event.code === "Space" || event.code === "ArrowUp") {
          if (overOpen || state === "dead" || state === "air") return;
          event.preventDefault();
          if (event.repeat) return;
          if (state === "idle") beginCharge();
        }
      }

      function handleKeyUp(event) {
        if (event.code === "Space" || event.code === "ArrowUp") {
          if (state === "charging") {
            event.preventDefault();
            releaseCharge();
          }
        }
      }

      function handleVisibility() {
        if (document.hidden && state === "charging") {
          releaseCharge();
        }
      }

      function resizeCanvas(restartIfNeeded) {
        var rect = shell.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        var newW = rect.width;
        var newH = rect.height;
        var changed = Math.abs(newW - W) > 2 || Math.abs(newH - H) > 2;
        W = newW;
        H = newH;
        layoutScale = clamp(W / 1100, 0.55, 1);
        visualScale = clamp(W / 900, 0.68, 1);
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width = W + "px";
        canvas.style.height = H + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        if (changed && platforms.length) {
          for (var i = 0; i < platforms.length; i += 1) {
            platforms[i].y = platformY(platforms[i].offset);
          }
          if (state === "idle" || state === "charging") {
            var current = platforms[currentIndex];
            if (current) player.feet = current.y;
          }
          cameraTarget = Math.max(0, player.x - W * 0.32);
        }

        if (restartIfNeeded && !platforms.length) {
          initBackground();
          reset();
        } else if (changed) {
          initBackground();
          if (state === "idle" || state === "charging") {
            var platform = platforms[currentIndex];
            if (platform) player.feet = platform.y;
          }
        }
        return true;
      }

      function onResize() {
        if (isDestroyed) return;
        resizeCanvas(false);
      }

      function destroy() {
        isDestroyed = true;
        window.clearTimeout(gameOverTimer);
        window.clearTimeout(hintTimer);
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
        if (resizeObserver) resizeObserver.disconnect();
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
        window.removeEventListener("blur", handlePointerUp);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        document.removeEventListener("visibilitychange", handleVisibility);
        if (canvas) {
          canvas.removeEventListener("pointerdown", handlePointerDown);
        }
      }

      function restart() {
        reset();
        if (overOpen) {
          overOpen = false;
        }
        if (canvas && canvas.focus) {
          window.setTimeout(function () {
            if (!isDestroyed) canvas.focus({ preventScroll: true });
          }, 30);
        }
      }

      canvas.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      window.addEventListener("blur", handlePointerUp);
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      document.addEventListener("visibilitychange", handleVisibility);
      restartButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      resizeCanvas(false);
      if (!platforms.length) {
        initBackground();
        reset();
      }

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(shell);
      } else {
        window.addEventListener("resize", onResize);
      }

      raf = window.requestAnimationFrame(loop);

      return {
        destroy: destroy,
        restart: restart
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.jump = MODULE;
})();
