/* ============================================================
   DeepSeek 深海游乐场 — 08 R1 迷宫
   Generated mazes with three depths. Mounted by js/site.js.
   ============================================================ */
(function () {
  "use strict";

  var LEVEL_SIZES = [9, 13, 17];
  var LEVEL_TIME = 50;
  var DIRS = [
    { key: "n", row: -1, col: 0, opposite: "s" },
    { key: "e", row: 0, col: 1, opposite: "w" },
    { key: "s", row: 1, col: 0, opposite: "n" },
    { key: "w", row: 0, col: -1, opposite: "e" }
  ];
  var DIR_INDEX = { n: 0, e: 1, s: 2, w: 3 };

  function pad(value) {
    return String(value).padStart(4, "0");
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function generateMaze(size) {
    var cells = [];
    for (var i = 0; i < size * size; i += 1) {
      cells.push({
        walls: { n: true, e: true, s: true, w: true },
        visited: false
      });
    }
    cells[0].visited = true;
    var stack = [0];
    while (stack.length) {
      var current = stack[stack.length - 1];
      var row = Math.floor(current / size);
      var col = current % size;
      var options = [];
      DIRS.forEach(function (dir) {
        var nr = row + dir.row;
        var nc = col + dir.col;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) return;
        var next = nr * size + nc;
        if (!cells[next].visited) {
          options.push({ index: next, dir: dir });
        }
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      var pick = options[Math.floor(Math.random() * options.length)];
      cells[current].walls[pick.dir.key] = false;
      cells[pick.index].walls[pick.dir.opposite] = false;
      cells[pick.index].visited = true;
      stack.push(pick.index);
    }
    return cells;
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {};

      root.innerHTML =
        '<div class="xg-shell">' +
        '  <aside class="xg-side">' +
        '    <span class="xg-kicker">R1 MAZE / 08</span>' +
        '    <h3 class="xg-side-title">往更深处走</h3>' +
        '    <p class="xg-side-desc">从左上角出发，走到右下角的光点。每过一层，迷宫都会变得更深。</p>' +
        '    <div class="xg-stats">' +
        '      <div class="xg-stat"><span>LEVEL</span><b data-maze-level>01 / 03</b></div>' +
        '      <div class="xg-stat xg-stat--accent"><span>TIME</span><b data-maze-time>0:50</b></div>' +
        '      <div class="xg-stat"><span>MOVES</span><b data-maze-moves>0</b></div>' +
        '      <div class="xg-stat"><span>BEST</span><b data-maze-best>0000</b></div>' +
        '    </div>' +
        '    <div class="xg-score"><span>SCORE / 本局</span><b data-maze-score>0000</b></div>' +
        '    <div class="maze-levels" data-maze-levels></div>' +
        '    <div class="xg-side-note"><span class="xg-kbd">↑</span> <span class="xg-kbd">↓</span> <span class="xg-kbd">←</span> <span class="xg-kbd">→</span> 或 WASD 移动<br>手机可以使用下方方向键。</div>' +
        '  </aside>' +
        '  <div class="xg-stage maze-stage">' +
        '    <div class="xg-top"><span class="xg-tag"><i></i>DEPTH / R1</span><span class="xg-timer" data-maze-timer>50.0s</span></div>' +
        '    <div class="maze-wrap"><div class="maze-board" data-maze-board role="application" aria-label="迷宫，从左上角走到右下角"></div></div>' +
        '    <div class="maze-status" data-maze-status>用方向键出发，找到右下角的光点。</div>' +
        '    <div class="maze-dpad" aria-label="迷宫方向控制">' +
        '      <button type="button" data-maze-dir="up" aria-label="向上">↑</button>' +
        '      <button type="button" data-maze-dir="left" aria-label="向左">←</button>' +
        '      <button type="button" data-maze-dir="down" aria-label="向下">↓</button>' +
        '      <button type="button" data-maze-dir="right" aria-label="向右">→</button>' +
        '    </div>' +
        '    <div class="game-over" data-maze-over>' +
        '      <div class="game-over__card">' +
        '        <span class="game-over__kicker">DEPTH REACHED / 航行结束</span>' +
        '        <h3 data-maze-over-title>你走到了更深处。</h3>' +
        '        <div class="game-over__score" data-maze-final>0</div>' +
        '        <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '        <span class="game-over__record" data-maze-record hidden>NEW RECORD · 新纪录</span>' +
        '        <div class="game-over__actions">' +
        '          <button type="button" class="game-over__primary" data-maze-again>再走一次</button>' +
        '          <button type="button" class="game-over__secondary" data-maze-exit>返回大厅</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var boardEl = root.querySelector("[data-maze-board]");
      var levelEl = root.querySelector("[data-maze-level]");
      var timeEl = root.querySelector("[data-maze-time]");
      var movesEl = root.querySelector("[data-maze-moves]");
      var bestEl = root.querySelector("[data-maze-best]");
      var scoreEl = root.querySelector("[data-maze-score]");
      var timerEl = root.querySelector("[data-maze-timer]");
      var statusEl = root.querySelector("[data-maze-status]");
      var levelsEl = root.querySelector("[data-maze-levels]");
      var overEl = root.querySelector("[data-maze-over]");
      var finalEl = root.querySelector("[data-maze-final]");
      var recordEl = root.querySelector("[data-maze-record]");
      var overTitle = root.querySelector("[data-maze-over-title]");
      var againButton = root.querySelector("[data-maze-again]");
      var exitButton = root.querySelector("[data-maze-exit]");

      var level = 0;
      var size = LEVEL_SIZES[0];
      var maze = [];
      var player = 0;
      var visited = [];
      var moves = 0;
      var score = 0;
      var best = Number(opts.best) || 0;
      var levelTime = LEVEL_TIME;
      var timeLeft = LEVEL_TIME;
      var clock = 0;
      var transitionTimer = 0;
      var transition = false;
      var ended = false;
      var destroyed = false;
      var cellEls = [];

      function updateHud() {
        levelEl.textContent = String(level + 1).padStart(2, "0") + " / " + String(LEVEL_SIZES.length).padStart(2, "0");
        timeEl.textContent = formatTime(Math.max(0, Math.ceil(timeLeft)));
        movesEl.textContent = String(moves);
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(best);
        timerEl.textContent = Math.max(0, timeLeft).toFixed(1) + "s";
        timerEl.classList.toggle("is-low", timeLeft <= 10);
      }

      function renderLevelChips() {
        levelsEl.innerHTML = LEVEL_SIZES.map(function (value, index) {
          var cls = "maze-level";
          if (index === level) cls += " is-active";
          if (index < level) cls += " is-done";
          return '<span class="' + cls + '">' + value + "×" + value + "</span>";
        }).join("");
      }

      function renderMaze() {
        boardEl.style.setProperty("--maze-size", String(size));
        var html = "";
        maze.forEach(function (cell, index) {
          var classes = "maze-cell";
          if (cell.walls.n) classes += " w-n";
          if (cell.walls.e) classes += " w-e";
          if (cell.walls.s) classes += " w-s";
          if (cell.walls.w) classes += " w-w";
          html += '<div class="' + classes + '" data-maze-cell="' + index + '"></div>';
        });
        boardEl.innerHTML = html;
        cellEls = Array.prototype.slice.call(boardEl.querySelectorAll("[data-maze-cell]"));
        updateActors();
      }

      function updateActors() {
        cellEls.forEach(function (element, index) {
          element.classList.toggle("is-player", index === player);
          element.classList.toggle("is-exit", index === size * size - 1);
          element.classList.toggle("is-visited", Boolean(visited[index]));
        });
      }

      function clearClock() {
        window.clearInterval(clock);
        clock = 0;
      }

      function startClock() {
        clearClock();
        timeLeft = levelTime;
        updateHud();
        clock = window.setInterval(function () {
          if (ended || transition || destroyed) return;
          timeLeft = Math.max(0, timeLeft - 0.1);
          updateHud();
          if (timeLeft <= 0) {
            clearClock();
            endGame(false);
          }
        }, 100);
      }

      function startLevel() {
        window.clearTimeout(transitionTimer);
        size = LEVEL_SIZES[level];
        maze = generateMaze(size);
        player = 0;
        moves = 0;
        visited = new Array(size * size).fill(false);
        visited[0] = true;
        levelTime = LEVEL_TIME;
        transition = false;
        statusEl.innerHTML = "第 " + (level + 1) + " 层 · 找到右下角的光点。";
        renderLevelChips();
        renderMaze();
        updateHud();
        startClock();
      }

      function move(direction) {
        if (ended || transition || destroyed) return;
        var index = DIR_INDEX[direction];
        if (index == null) return;
        var dir = DIRS[index];
        if (maze[player].walls[dir.key]) return;
        var row = Math.floor(player / size) + dir.row;
        var col = (player % size) + dir.col;
        if (row < 0 || row >= size || col < 0 || col >= size) return;
        var next = row * size + col;
        player = next;
        visited[player] = true;
        moves += 1;
        if (audio.drop) audio.drop();
        updateActors();
        updateHud();
        if (player === size * size - 1) {
          completeLevel();
        }
      }

      function completeLevel() {
        transition = true;
        clearClock();
        var bonus = 500 + Math.ceil(timeLeft) * 12;
        score += bonus;
        statusEl.innerHTML = "<b>第 " + (level + 1) + " 层通过 +" + bonus + "</b>";
        if (audio.land) audio.land(true);
        updateHud();
        if (level >= LEVEL_SIZES.length - 1) {
          window.clearTimeout(transitionTimer);
          transitionTimer = window.setTimeout(function () {
            if (!destroyed) endGame(true);
          }, 650);
          return;
        }
        window.clearTimeout(transitionTimer);
        transitionTimer = window.setTimeout(function () {
          if (destroyed) return;
          level += 1;
          startLevel();
        }, 720);
      }

      function endGame(success) {
        if (ended || destroyed) return;
        ended = true;
        transition = true;
        clearClock();
        window.clearTimeout(transitionTimer);
        var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : { best: best, isRecord: false };
        best = result.best != null ? result.best : best;
        finalEl.textContent = pad(score);
        overTitle.textContent = success ? "你走到了更深处。" : "时间到了，深处还在等你。";
        recordEl.hidden = !result.isRecord;
        overEl.classList.add("is-visible");
        if (audio.gameOver) audio.gameOver();
        updateHud();
      }

      function restart() {
        clearClock();
        window.clearTimeout(transitionTimer);
        level = 0;
        score = 0;
        moves = 0;
        ended = false;
        transition = false;
        overEl.classList.remove("is-visible");
        startLevel();
      }

      function onKeyDown(event) {
        var map = {
          ArrowUp: "n", ArrowRight: "e", ArrowDown: "s", ArrowLeft: "w",
          w: "n", a: "w", s: "s", d: "e", W: "n", A: "w", S: "s", D: "e"
        };
        var direction = map[event.key];
        if (!direction) return;
        event.preventDefault();
        move(direction);
      }

      function onPadClick(event) {
        var button = event.target.closest("[data-maze-dir]");
        if (!button) return;
        var map = { up: "n", right: "e", down: "s", left: "w" };
        move(map[button.getAttribute("data-maze-dir")]);
      }

      window.addEventListener("keydown", onKeyDown);
      root.querySelector(".maze-dpad").addEventListener("click", onPadClick);
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
          clearClock();
          window.clearTimeout(transitionTimer);
          window.removeEventListener("keydown", onKeyDown);
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.maze = MODULE;
})();
