/* ============================================================
   DeepSeek 深海游乐场 — 07 鲸落拼图
   A 3x3 sliding puzzle with a procedurally drawn whale scene.
   ============================================================ */
(function () {
  "use strict";

  var SIZE = 3;
  var TOTAL = SIZE * SIZE;

  function pad(value) {
    return String(value).padStart(4, "0");
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function createArtwork() {
    var canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    var ctx = canvas.getContext("2d");
    if (!ctx) return "";

    var sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, "#0a1638");
    sky.addColorStop(0.52, "#122a5e");
    sky.addColorStop(1, "#07152f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 600, 600);

    var glow = ctx.createRadialGradient(430, 120, 8, 430, 120, 230);
    glow.addColorStop(0, "rgba(255, 213, 108, 0.55)");
    glow.addColorStop(0.22, "rgba(255, 183, 91, 0.16)");
    glow.addColorStop(1, "rgba(255, 183, 91, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 600, 600);

    ctx.fillStyle = "#ffe2a1";
    ctx.beginPath();
    ctx.arc(452, 104, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(441, 94, 10, 0, Math.PI * 2);
    ctx.fill();

    for (var i = 0; i < 48; i += 1) {
      var x = (i * 137.3) % 600;
      var y = (i * 83.7 + 29) % 390;
      var radius = i % 7 === 0 ? 2 : 1;
      ctx.fillStyle = "rgba(210, 232, 255, " + (0.18 + (i % 5) * 0.08) + ")";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(90, 137, 232, 0.22)";
    ctx.lineWidth = 1.2;
    for (var wave = 0; wave < 4; wave += 1) {
      ctx.beginPath();
      for (var wx = 0; wx <= 600; wx += 10) {
        var wy = 392 + wave * 44 + Math.sin(wx / 62 + wave) * 12;
        if (wx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(300, 334);
    ctx.rotate(-0.1);
    var body = ctx.createLinearGradient(-180, -80, 170, 105);
    body.addColorStop(0, "#81e6ff");
    body.addColorStop(0.48, "#5f8cff");
    body.addColorStop(1, "#3551c8");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-178, 10);
    ctx.bezierCurveTo(-120, -91, 28, -104, 120, -38);
    ctx.bezierCurveTo(155, -14, 174, -20, 195, -47);
    ctx.bezierCurveTo(184, -2, 188, 36, 207, 62);
    ctx.bezierCurveTo(156, 63, 128, 91, 53, 95);
    ctx.bezierCurveTo(-42, 99, -142, 70, -178, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.64)";
    ctx.beginPath();
    ctx.moveTo(-83, 70);
    ctx.bezierCurveTo(-9, 102, 82, 86, 125, 50);
    ctx.bezierCurveTo(84, 94, -20, 111, -95, 84);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2c45b5";
    ctx.beginPath();
    ctx.moveTo(-34, -58);
    ctx.bezierCurveTo(2, -26, 22, 12, 20, 48);
    ctx.bezierCurveTo(-1, 19, -23, -15, -62, -42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#07152f";
    ctx.beginPath();
    ctx.arc(138, 3, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.beginPath();
    ctx.arc(140, 1, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(218, 240, 255, 0.48)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(162, 40);
    ctx.quadraticCurveTo(197, 55, 216, 28);
    ctx.stroke();
    ctx.restore();

    var bubbles = [
      [400, 220, 15], [446, 280, 8], [368, 272, 5], [470, 210, 4],
      [126, 230, 9], [93, 290, 5], [168, 186, 4]
    ];
    bubbles.forEach(function (bubble) {
      ctx.strokeStyle = "rgba(174, 236, 255, 0.5)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bubble[0], bubble[1], bubble[2], 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(174, 236, 255, 0.14)";
      ctx.beginPath();
      ctx.arc(bubble[0] - bubble[2] * 0.24, bubble[1] - bubble[2] * 0.24, bubble[2] * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(126, 221, 175, 0.5)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (var seaweed = 0; seaweed < 3; seaweed += 1) {
      var sx = 74 + seaweed * 34;
      ctx.beginPath();
      ctx.moveTo(sx, 600);
      ctx.bezierCurveTo(sx - 22, 548, sx + 32, 516, sx + 6, 470);
      ctx.stroke();
    }

    return canvas.toDataURL("image/png");
  }

  function isSolved(positions) {
    for (var i = 0; i < TOTAL; i += 1) {
      if (positions[i] !== i) return false;
    }
    return true;
  }

  function blankNeighbors(positions) {
    var blank = positions.indexOf(TOTAL - 1);
    var row = Math.floor(blank / SIZE);
    var col = blank % SIZE;
    var result = [];
    if (row > 0) result.push(blank - SIZE);
    if (row < SIZE - 1) result.push(blank + SIZE);
    if (col > 0) result.push(blank - 1);
    if (col < SIZE - 1) result.push(blank + 1);
    return result;
  }

  function shufflePositions() {
    var positions = [];
    for (var i = 0; i < TOTAL; i += 1) positions.push(i);
    var previous = -1;
    for (var move = 0; move < 120; move += 1) {
      var options = blankNeighbors(positions);
      var choices = options.filter(function (value) { return value !== previous; });
      var target = choices[Math.floor(Math.random() * choices.length)];
      previous = positions.indexOf(TOTAL - 1);
      var blank = previous;
      var temp = positions[blank];
      positions[blank] = positions[target];
      positions[target] = temp;
    }
    if (isSolved(positions)) return shufflePositions();
    return positions;
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {};
      var artwork = createArtwork();

      root.innerHTML =
        '<div class="xg-shell">' +
        '  <aside class="xg-side">' +
        '    <span class="xg-kicker">WHALE FALL / 07</span>' +
        '    <h3 class="xg-side-title">把鲸鱼拼回来</h3>' +
        '    <p class="xg-side-desc">滑动图块，把散落的鲸鱼插画拼回完整。空白格只能和相邻图块交换。</p>' +
        '    <div class="xg-stats">' +
        '      <div class="xg-stat"><span>MOVES</span><b data-puzzle-moves>0</b></div>' +
        '      <div class="xg-stat"><span>TIME</span><b data-puzzle-time>0:00</b></div>' +
        '      <div class="xg-stat"><span>FIXED</span><b data-puzzle-pieces>0 / 8</b></div>' +
        '      <div class="xg-stat"><span>BEST</span><b data-puzzle-best>0000</b></div>' +
        '    </div>' +
        '    <div class="puzzle-reference xg-reference">' +
        '      <img alt="鲸落拼图的目标图像：深海中一头发光蓝鲸" data-puzzle-reference>' +
        '      <span>TARGET IMAGE / 目标图</span>' +
        '    </div>' +
        '    <button type="button" class="xg-secondary" data-puzzle-restart>重新打乱</button>' +
        '    <div class="xg-side-note">点击空白格旁边的图块移动。<br>步数越少，分数越高。</div>' +
        '  </aside>' +
        '  <div class="xg-stage puzzle-stage">' +
        '    <div class="xg-top"><span class="xg-tag"><i></i>SLIDING PIECES / 3 × 3</span><span class="xg-timer" data-puzzle-timer>READY</span></div>' +
        '    <div class="puzzle-wrap">' +
        '      <div class="puzzle-board" data-puzzle-board role="group" aria-label="鲸落拼图，三行三列。点击空白格旁边的图块移动。"></div>' +
        '    </div>' +
        '    <div class="puzzle-tip" data-puzzle-tip>点击空白格旁边的图块，把鲸鱼拼回完整。</div>' +
        '    <div class="game-over" data-puzzle-over>' +
        '      <div class="game-over__card">' +
        '        <span class="game-over__kicker">WHALE RESTORED / 拼图完成</span>' +
        '        <h3 data-puzzle-over-title>鲸鱼重新浮上来了。</h3>' +
        '        <div class="game-over__score" data-puzzle-final>0</div>' +
        '        <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '        <span class="game-over__record" data-puzzle-record hidden>NEW RECORD · 新纪录</span>' +
        '        <div class="game-over__actions">' +
        '          <button type="button" class="game-over__primary" data-puzzle-again>再拼一次</button>' +
        '          <button type="button" class="game-over__secondary" data-puzzle-exit>返回大厅</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var boardEl = root.querySelector("[data-puzzle-board]");
      var movesEl = root.querySelector("[data-puzzle-moves]");
      var timeEl = root.querySelector("[data-puzzle-time]");
      var piecesEl = root.querySelector("[data-puzzle-pieces]");
      var bestEl = root.querySelector("[data-puzzle-best]");
      var timerEl = root.querySelector("[data-puzzle-timer]");
      var tipEl = root.querySelector("[data-puzzle-tip]");
      var referenceEl = root.querySelector("[data-puzzle-reference]");
      var overEl = root.querySelector("[data-puzzle-over]");
      var finalEl = root.querySelector("[data-puzzle-final]");
      var recordEl = root.querySelector("[data-puzzle-record]");
      var overTitle = root.querySelector("[data-puzzle-over-title]");
      var restartButton = root.querySelector("[data-puzzle-restart]");
      var againButton = root.querySelector("[data-puzzle-again]");
      var exitButton = root.querySelector("[data-puzzle-exit]");

      var positions = [];
      var moves = 0;
      var best = Number(opts.best) || 0;
      var startedAt = 0;
      var clock = 0;
      var ended = false;
      var destroyed = false;
      var solveTimer = 0;

      if (referenceEl && artwork) referenceEl.src = artwork;
      boardEl.style.setProperty("--puzzle-image", artwork ? 'url("' + artwork + '")' : "linear-gradient(135deg, #173b77, #7c5cff 52%, #65d7ff)");

      function elapsed() {
        return startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      }

      function updateHud() {
        var fixed = 0;
        positions.forEach(function (piece, index) {
          if (piece !== TOTAL - 1 && piece === index) fixed += 1;
        });
        movesEl.textContent = String(moves);
        timeEl.textContent = formatTime(elapsed());
        piecesEl.textContent = fixed + " / 8";
        bestEl.textContent = pad(best);
      }

      function renderBoard() {
        var html = "";
        positions.forEach(function (piece, position) {
          if (piece === TOTAL - 1) {
            html += '<button type="button" class="puzzle-tile is-blank" data-puzzle-position="' + position + '" aria-label="空格"></button>';
          } else {
            var col = piece % SIZE;
            var row = Math.floor(piece / SIZE);
            var bgX = (col / (SIZE - 1)) * 100;
            var bgY = (row / (SIZE - 1)) * 100;
            html += '<button type="button" class="puzzle-tile" data-puzzle-position="' + position + '" style="background-position:' + bgX + '% ' + bgY + '%" aria-label="图块 ' + (piece + 1) + '"></button>';
          }
        });
        boardEl.innerHTML = html;
      }

      function startClock() {
        window.clearInterval(clock);
        clock = window.setInterval(function () {
          if (!ended && !destroyed) updateHud();
        }, 1000);
      }

      function moveTile(position) {
        if (ended || destroyed) return;
        var blank = positions.indexOf(TOTAL - 1);
        var row = Math.floor(position / SIZE);
        var col = position % SIZE;
        var blankRow = Math.floor(blank / SIZE);
        var blankCol = blank % SIZE;
        if (Math.abs(row - blankRow) + Math.abs(col - blankCol) !== 1) return;
        if (!startedAt) {
          startedAt = Date.now();
          startClock();
          timerEl.textContent = "RUNNING";
        }
        var temp = positions[position];
        positions[position] = positions[blank];
        positions[blank] = temp;
        moves += 1;
        if (audio.click) audio.click();
        renderBoard();
        updateHud();
        if (isSolved(positions)) {
          ended = true;
          window.clearInterval(clock);
          boardEl.classList.add("is-solved");
          timerEl.textContent = "COMPLETE";
          tipEl.textContent = "拼图完成，鲸鱼重新浮上来了。";
          window.clearTimeout(solveTimer);
          solveTimer = window.setTimeout(function () {
            if (!destroyed) finish();
          }, 450);
        }
      }

      function finish() {
        var seconds = elapsed();
        var score = Math.max(200, 4200 - moves * 28 - seconds * 10);
        var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : { best: best, isRecord: false };
        best = result.best != null ? result.best : best;
        finalEl.textContent = pad(score);
        overTitle.textContent = moves <= 24 ? "拼得又快又准。" : "鲸鱼重新浮上来了。";
        recordEl.hidden = !result.isRecord;
        overEl.classList.add("is-visible");
        if (audio.land) audio.land(true);
        updateHud();
      }

      function restart() {
        window.clearTimeout(solveTimer);
        positions = shufflePositions();
        moves = 0;
        startedAt = 0;
        ended = false;
        boardEl.classList.remove("is-solved");
        overEl.classList.remove("is-visible");
        timerEl.textContent = "READY";
        tipEl.textContent = "点击空白格旁边的图块，把鲸鱼拼回完整。";
        renderBoard();
        updateHud();
      }

      function onBoardClick(event) {
        var tile = event.target.closest("[data-puzzle-position]");
        if (!tile) return;
        moveTile(Number(tile.getAttribute("data-puzzle-position")));
      }

      boardEl.addEventListener("click", onBoardClick);
      restartButton.addEventListener("click", restart);
      againButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      restart();

      return {
        restart: restart,
        destroy: function () {
          destroyed = true;
          ended = true;
          window.clearTimeout(solveTimer);
          window.clearInterval(clock);
          boardEl.removeEventListener("click", onBoardClick);
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.puzzle = MODULE;
})();
