/* ============================================================
   DeepSeek 深海游乐场 — 03 Token 消消乐
   A dependency-free match-3 game. Mounted by js/site.js.
   ============================================================ */
(function () {
  "use strict";

  var SIZE = 8;
  var START_MOVES = 24;
  var BONUS_STEP = 3000;

  var TYPES = [
    { key: "w", name: "权重", glyph: "W", color: "#4b5cff" },
    { key: "d", name: "数据", glyph: "D", color: "#56cdbb" },
    { key: "c", name: "算力", glyph: "C", color: "#ff7a61" },
    { key: "x", name: "上下文", glyph: "X", color: "#a489ff" },
    { key: "p", name: "提示", glyph: "P", color: "#dff56b" },
    { key: "s", name: "灵感", glyph: "✦", color: "#ffd36e" }
  ];

  function randomType(exclude) {
    var pool = [0, 1, 2, 3, 4, 5].filter(function (value) {
      return exclude == null || value !== exclude;
    });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function cellKey(row, column) {
    return row + "," + column;
  }

  function clampCell(row, column) {
    return row >= 0 && row < SIZE && column >= 0 && column < SIZE;
  }

  function pad(value) {
    return String(value).padStart(5, "0");
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {
        drop: function () {},
        merge: function () {},
        gameOver: function () {},
        click: function () {},
        land: function () {},
        fail: function () {}
      };

      var legend = TYPES.map(function (type) {
        return (
          '<span class="tokens-legend__item"><i class="token-swatch token-swatch--' + type.key + '"></i>' +
          type.name + "</span>"
        );
      }).join("");

      root.innerHTML =
        '<div class="tokens-shell">' +
        '<aside class="tokens-side">' +
        '  <div class="tokens-side-kicker">TOKEN LAB / 03</div>' +
        '  <div class="tokens-score"><span>SCORE / 本局</span><b data-tokens-score>00000</b></div>' +
        '  <div class="tokens-best"><span>BEST / 本地纪录</span><b data-tokens-best>00000</b></div>' +
        '  <div class="tokens-stats">' +
        '    <div><span>MOVES / 步数</span><b data-tokens-moves>24</b></div>' +
        '    <div><span>CHAIN / 连锁</span><b data-tokens-chain>×1</b></div>' +
        "  </div>" +
        '  <div class="tokens-goal">' +
        '    <div class="tokens-goal__head"><span>深渊补给</span><b data-tokens-goal-label>0 / 3,000</b></div>' +
        '    <div class="tokens-goal__track"><i data-tokens-goal-fill></i></div>' +
        '    <p>每累计 3,000 分，自动获得 3 步额外移动。</p>' +
        "  </div>" +
        '  <div class="tokens-legend"><span class="tokens-legend__label">SIX SIGNALS / 六种 Token</span>' +
        legend + "</div>" +
        '  <div class="tokens-howto"><b>怎么玩</b><p>选中一枚 Token，再点相邻的另一枚交换位置。横向或纵向凑齐三个同款即可消除，连锁会带来更高分。</p></div>' +
        '  <button type="button" class="tokens-hint-button" data-tokens-hint>提示一步 <span>HINT</span></button>' +
        '  <div class="tokens-side-foot">MATCH / CASCADE / LOCAL SCORE</div>' +
        "</aside>" +
        '<div class="tokens-stage">' +
        '  <div class="tokens-hud">' +
        '    <span class="tokens-hud__tag"><i></i> TOKEN GRID / 8 × 8</span>' +
        '    <span class="tokens-status" data-tokens-status>READY</span>' +
        "  </div>" +
        '  <div class="tokens-board-wrap">' +
        '    <div class="tokens-board" data-tokens-board role="grid" aria-label="Token 消消乐棋盘，八行八列。选择相邻 Token 交换，三个同款连成线即可消除。" tabindex="0"></div>' +
        '    <div class="tokens-combo" data-tokens-combo></div>' +
        "  </div>" +
        '  <div class="tokens-tip" data-tokens-tip><b>点击</b> 两枚相邻 Token 交换 · <b>方向键</b> 移动 · <b>Enter</b> 选择</div>' +
        '  <div class="game-over" data-tokens-over>' +
        '    <div class="game-over__card">' +
        '      <span class="game-over__kicker">CONTEXT FULL / 步数用尽</span>' +
        '      <h3 data-tokens-over-title>注意力用完了。</h3>' +
        '      <div class="game-over__score" data-tokens-final>0</div>' +
        '      <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '      <span class="game-over__record" data-tokens-record hidden>NEW RECORD · 新纪录</span>' +
        '      <div class="game-over__actions">' +
        '        <button type="button" class="game-over__primary" data-tokens-restart>再消一局</button>' +
        '        <button type="button" class="game-over__secondary" data-tokens-exit>返回大厅</button>' +
        "      </div>" +
        "    </div>" +
        "  </div>" +
        "</div></div>";

      var shell = root.querySelector(".tokens-shell");
      var boardEl = root.querySelector("[data-tokens-board]");
      var scoreEl = root.querySelector("[data-tokens-score]");
      var bestEl = root.querySelector("[data-tokens-best]");
      var movesEl = root.querySelector("[data-tokens-moves]");
      var chainEl = root.querySelector("[data-tokens-chain]");
      var goalLabel = root.querySelector("[data-tokens-goal-label]");
      var goalFill = root.querySelector("[data-tokens-goal-fill]");
      var statusEl = root.querySelector("[data-tokens-status]");
      var comboEl = root.querySelector("[data-tokens-combo]");
      var tipEl = root.querySelector("[data-tokens-tip]");
      var overEl = root.querySelector("[data-tokens-over]");
      var finalEl = root.querySelector("[data-tokens-final]");
      var recordEl = root.querySelector("[data-tokens-record]");
      var overTitle = root.querySelector("[data-tokens-over-title]");
      var restartButton = root.querySelector("[data-tokens-restart]");
      var exitButton = root.querySelector("[data-tokens-exit]");
      var hintButton = root.querySelector("[data-tokens-hint]");

      var board = [];
      var score = 0;
      var best = Number(opts.best) || 0;
      var moves = START_MOVES;
      var nextBonus = BONUS_STEP;
      var chain = 0;
      var selected = null;
      var busy = false;
      var over = false;
      var destroyed = false;
      var keyboardMode = false;
      var focusRow = 0;
      var focusColumn = 0;
      var timers = [];
      var comboTimer = 0;
      var hintTimer = 0;
      var endHandled = false;

      function later(callback, delay) {
        var id = window.setTimeout(function () {
          if (!destroyed) callback();
        }, delay);
        timers.push(id);
        return id;
      }

      function clearTimers() {
        timers.forEach(function (id) { window.clearTimeout(id); });
        timers = [];
        window.clearTimeout(comboTimer);
        window.clearTimeout(hintTimer);
      }

      function createBoard() {
        var next = [];
        for (var row = 0; row < SIZE; row += 1) {
          next[row] = [];
          for (var column = 0; column < SIZE; column += 1) {
            var blocked = [];
            if (column >= 2 && next[row][column - 1] === next[row][column - 2]) {
              blocked.push(next[row][column - 1]);
            }
            if (row >= 2 && next[row - 1][column] === next[row - 2][column]) {
              blocked.push(next[row - 1][column]);
            }
            var value;
            do {
              value = randomType();
            } while (blocked.indexOf(value) !== -1);
            next[row][column] = value;
          }
        }
        return next;
      }

      function buildBoard() {
        var attempts = 0;
        do {
          board = createBoard();
          attempts += 1;
        } while (!findHint(board) && attempts < 30);
        if (!findHint(board)) {
          board[0][0] = (board[0][0] + 1) % TYPES.length;
        }
        return board;
      }

      function findMatches(source) {
        var target = source || board;
        var matches = new Set();
        for (var row = 0; row < SIZE; row += 1) {
          var runStart = 0;
          for (var column = 1; column <= SIZE; column += 1) {
            var same = column < SIZE && target[row][column] === target[row][runStart];
            if (!same) {
              if (column - runStart >= 3 && target[row][runStart] !== -1) {
                for (var c = runStart; c < column; c += 1) matches.add(cellKey(row, c));
              }
              runStart = column;
            }
          }
        }
        for (var col = 0; col < SIZE; col += 1) {
          var start = 0;
          for (var r = 1; r <= SIZE; r += 1) {
            var vertical = r < SIZE && target[r][col] === target[start][col];
            if (!vertical) {
              if (r - start >= 3 && target[start][col] !== -1) {
                for (var rr = start; rr < r; rr += 1) matches.add(cellKey(rr, col));
              }
              start = r;
            }
          }
        }
        return matches;
      }

      function swapOn(source, a, b) {
        var temp = source[a.row][a.column];
        source[a.row][a.column] = source[b.row][b.column];
        source[b.row][b.column] = temp;
      }

      function findHint(source) {
        var temp = source.map(function (row) { return row.slice(); });
        for (var row = 0; row < SIZE; row += 1) {
          for (var column = 0; column < SIZE; column += 1) {
            var first = { row: row, column: column };
            if (column + 1 < SIZE) {
              var right = { row: row, column: column + 1 };
              swapOn(temp, first, right);
              if (findMatches(temp).size) return [first, right];
              swapOn(temp, first, right);
            }
            if (row + 1 < SIZE) {
              var below = { row: row + 1, column: column };
              swapOn(temp, first, below);
              if (findMatches(temp).size) return [first, below];
              swapOn(temp, first, below);
            }
          }
        }
        return null;
      }

      function renderBoard(state) {
        var config = state || {};
        var matched = config.matched || new Set();
        var entering = Boolean(config.entering);
        var invalid = config.invalid || new Set();
        var hint = config.hint || new Set();
        var markup = "";

        for (var row = 0; row < SIZE; row += 1) {
          for (var column = 0; column < SIZE; column += 1) {
            var value = board[row][column];
            var type = TYPES[value] || TYPES[0];
            var key = cellKey(row, column);
            var isSelected = selected && selected.row === row && selected.column === column;
            var classes = [
              "token-cell",
              isSelected ? "is-selected" : "",
              matched.has(key) ? "is-matched" : "",
              entering ? "is-entering" : "",
              invalid.has(key) ? "is-invalid" : "",
              hint.has(key) ? "is-hint" : ""
            ].filter(Boolean).join(" ");
            markup +=
              '<button type="button" class="' + classes + '" data-cell data-r="' + row + '" data-c="' + column +
              '" role="gridcell" aria-label="第' + (row + 1) + "行第" + (column + 1) + "列，" + type.name +
              " Token" + '" aria-selected="' + (isSelected ? "true" : "false") + '" tabindex="' +
              (row === focusRow && column === focusColumn ? "0" : "-1") + '" style="--delay:' +
              (row + column) * 5 + 'ms">' +
              '<span class="token-gem token-gem--' + type.key + '"><span class="token-glyph">' + type.glyph +
              '</span><span class="token-name">' + type.name + "</span></span></button>";
          }
        }

        boardEl.innerHTML = markup;
        if (config.focus) {
          var target = boardEl.querySelector('[data-r="' + focusRow + '"][data-c="' + focusColumn + '"]');
          if (target) target.focus({ preventScroll: true });
        }
      }

      function setStatus(text, tone) {
        statusEl.textContent = text;
        statusEl.className = "tokens-status" + (tone ? " tokens-status--" + tone : "");
      }

      function updateHud() {
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(best);
        movesEl.textContent = String(moves);
        chainEl.textContent = "×" + Math.max(1, chain);
        var progress = Math.min(1, (score % BONUS_STEP) / BONUS_STEP);
        if (score > 0 && score % BONUS_STEP === 0) progress = 1;
        goalFill.style.width = (progress * 100).toFixed(2) + "%";
        goalLabel.textContent = (score % BONUS_STEP).toLocaleString("en-US") + " / 3,000";
      }

      function showCombo(text, tone) {
        comboEl.textContent = text;
        comboEl.className = "tokens-combo is-visible" + (tone ? " tokens-combo--" + tone : "");
        window.clearTimeout(comboTimer);
        comboTimer = window.setTimeout(function () {
          comboEl.classList.remove("is-visible");
        }, 1200);
      }

      function removeMatches(matches) {
        matches.forEach(function (key) {
          var parts = key.split(",");
          board[Number(parts[0])][Number(parts[1])] = -1;
        });
      }

      function collapseBoard() {
        for (var column = 0; column < SIZE; column += 1) {
          var write = SIZE - 1;
          for (var row = SIZE - 1; row >= 0; row -= 1) {
            if (board[row][column] !== -1) {
              board[write][column] = board[row][column];
              write -= 1;
            }
          }
          while (write >= 0) {
            board[write][column] = randomType();
            write -= 1;
          }
        }
      }

      function shakeInvalid(first, second) {
        boardEl.querySelectorAll(".token-cell").forEach(function (cell) {
          var row = Number(cell.getAttribute("data-r"));
          var column = Number(cell.getAttribute("data-c"));
          if (
            (row === first.row && column === first.column) ||
            (row === second.row && column === second.column)
          ) {
            cell.classList.add("is-invalid");
          }
        });
        audio.fail();
        later(function () {
          boardEl.querySelectorAll(".is-invalid").forEach(function (cell) {
            cell.classList.remove("is-invalid");
          });
        }, 360);
      }

      function finishGame() {
        over = true;
        busy = false;
        chain = 0;
        setStatus("SIGNAL LOST", "lost");
        audio.gameOver();
        var result = opts.onGameEnd ? opts.onGameEnd(score) : { best: Math.max(best, score), isRecord: score > best };
        best = result && result.best ? result.best : Math.max(best, score);
        bestEl.textContent = pad(best);
        finalEl.textContent = pad(score);
        recordEl.hidden = !(result && result.isRecord);
        overTitle.textContent = score > 0 ? "注意力用完了。" : "还没开始，就结束了。";
        overEl.classList.add("is-visible");
        endHandled = true;
      }

      function finishTurn() {
        chain = 0;
        chainEl.textContent = "×1";
        var bonuses = 0;
        while (score >= nextBonus) {
          bonuses += 1;
          nextBonus += BONUS_STEP;
        }
        if (bonuses > 0) {
          moves += bonuses * 3;
          movesEl.textContent = String(moves);
          showCombo("SUPPLY +" + bonuses * 3 + " MOVES", "bonus");
          audio.land(true);
        }

        if (!findHint(board)) {
          setStatus("RESHUFFLING", "warn");
          showCombo("NO MOVES / 重排", "warn");
          buildBoard();
          later(function () {
            renderBoard({ entering: true });
            setStatus("READY");
          }, 360);
        } else {
          setStatus("READY");
        }

        if (moves <= 0) {
          later(finishGame, 500);
        } else {
          busy = false;
          tipEl.classList.remove("is-hidden");
        }
        updateHud();
      }

      function resolveCascade() {
        chain = 0;
        tipEl.classList.add("is-hidden");

        function step() {
          var matches = findMatches();
          if (!matches.size) {
            finishTurn();
            return;
          }
          chain += 1;
          var gained = matches.size * 50 * chain;
          score += gained;
          updateHud();
          setStatus(chain > 1 ? "CHAIN ×" + chain : "CLEAR +" + gained, chain > 1 ? "hot" : "ok");
          chainEl.textContent = "×" + chain;
          if (chain > 1) {
            showCombo("CHAIN ×" + chain + "  +" + gained);
          } else if (matches.size > 3) {
            showCombo("+" + gained + "  " + matches.size + " TOKENS");
          }
          audio.merge(chain + 2);
          renderBoard({ matched: matches });
          later(function () {
            removeMatches(matches);
            collapseBoard();
            renderBoard({ entering: true });
            later(step, 230);
          }, 240);
        }

        step();
      }

      function cellsAdjacent(first, second) {
        return Math.abs(first.row - second.row) + Math.abs(first.column - second.column) === 1;
      }

      function paintSelection() {
        boardEl.querySelectorAll(".token-cell").forEach(function (cell) {
          var row = Number(cell.getAttribute("data-r"));
          var column = Number(cell.getAttribute("data-c"));
          var isSelected = selected && selected.row === row && selected.column === column;
          cell.classList.toggle("is-selected", Boolean(isSelected));
          cell.setAttribute("aria-selected", isSelected ? "true" : "false");
          cell.tabIndex = row === focusRow && column === focusColumn ? 0 : -1;
        });
      }

      function selectCell(row, column) {
        if (busy || over || !clampCell(row, column)) return;
        selected = { row: row, column: column };
        focusRow = row;
        focusColumn = column;
        paintSelection();
        var target = boardEl.querySelector('[data-r="' + row + '"][data-c="' + column + '"]');
        if (target) target.focus({ preventScroll: true });
      }

      function tryCell(row, column) {
        if (busy || over || !clampCell(row, column)) return;
        if (!selected) {
          selectCell(row, column);
          audio.click();
          return;
        }
        if (selected.row === row && selected.column === column) {
          selected = null;
          paintSelection();
          var oldCell = boardEl.querySelector('[data-r="' + row + '"][data-c="' + column + '"]');
          if (oldCell) oldCell.focus({ preventScroll: true });
          audio.click();
          return;
        }
        if (!cellsAdjacent(selected, { row: row, column: column })) {
          selectCell(row, column);
          audio.click();
          return;
        }

        var first = { row: selected.row, column: selected.column };
        var second = { row: row, column: column };
        selected = null;
        busy = true;
        tipEl.classList.add("is-hidden");
        swapOn(board, first, second);
        focusRow = row;
        focusColumn = column;
        renderBoard({ focus: true, entering: true });
        setStatus("CHECKING", "warn");

        later(function () {
          if (findMatches().size) {
            moves -= 1;
            updateHud();
            audio.drop();
            resolveCascade();
          } else {
            swapOn(board, first, second);
            focusRow = first.row;
            focusColumn = first.column;
            renderBoard({ focus: false });
            setStatus("NO MATCH", "warn");
            shakeInvalid(first, second);
            later(function () {
              setStatus("READY");
              busy = false;
              tipEl.classList.remove("is-hidden");
            }, 380);
          }
        }, 150);
      }

      function showHint() {
        if (busy || over) return;
        var hint = findHint(board);
        if (!hint) {
          setStatus("RESHUFFLING", "warn");
          buildBoard();
          renderBoard({ entering: true });
          return;
        }
        audio.click();
        setStatus("HINT", "hint");
        var keys = new Set([cellKey(hint[0].row, hint[0].column), cellKey(hint[1].row, hint[1].column)]);
        boardEl.querySelectorAll(".token-cell").forEach(function (cell) {
          var key = cellKey(Number(cell.getAttribute("data-r")), Number(cell.getAttribute("data-c")));
          if (keys.has(key)) cell.classList.add("is-hint");
        });
        window.clearTimeout(hintTimer);
        hintTimer = window.setTimeout(function () {
          boardEl.querySelectorAll(".is-hint").forEach(function (cell) {
            cell.classList.remove("is-hint");
          });
          if (!over && !busy) setStatus("READY");
        }, 2200);
      }

      function restart() {
        clearTimers();
        board = [];
        score = 0;
        moves = START_MOVES;
        nextBonus = BONUS_STEP;
        chain = 0;
        selected = null;
        busy = false;
        over = false;
        destroyed = false;
        endHandled = false;
        keyboardMode = false;
        focusRow = 0;
        focusColumn = 0;
        overEl.classList.remove("is-visible");
        tipEl.classList.remove("is-hidden");
        comboEl.classList.remove("is-visible");
        overTitle.textContent = "注意力用完了。";
        recordEl.hidden = true;
        setStatus("READY");
        buildBoard();
        updateHud();
        renderBoard({ entering: true });
        if (window.ArcadeAudio) window.ArcadeAudio.click();
      }

      function onCellClick(event) {
        var cell = event.target.closest("[data-cell]");
        if (!cell || !boardEl.contains(cell)) return;
        keyboardMode = false;
        tryCell(Number(cell.getAttribute("data-r")), Number(cell.getAttribute("data-c")));
      }

      function onBoardKeydown(event) {
        var key = event.key;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(key) !== -1) {
          event.preventDefault();
          keyboardMode = true;
          if (key === "ArrowUp") focusRow = (focusRow + SIZE - 1) % SIZE;
          if (key === "ArrowDown") focusRow = (focusRow + 1) % SIZE;
          if (key === "ArrowLeft") focusColumn = (focusColumn + SIZE - 1) % SIZE;
          if (key === "ArrowRight") focusColumn = (focusColumn + 1) % SIZE;
          renderBoard({ focus: true });
          return;
        }
        if (key === "Enter" || key === " ") {
          event.preventDefault();
          keyboardMode = true;
          tryCell(focusRow, focusColumn);
        }
      }

      function onFocus(event) {
        var cell = event.target.closest("[data-cell]");
        if (!cell) return;
        focusRow = Number(cell.getAttribute("data-r"));
        focusColumn = Number(cell.getAttribute("data-c"));
      }

      shell.addEventListener("click", function (event) {
        if (event.target.closest("[data-tokens-restart]")) {
          restart();
          return;
        }
        if (event.target.closest("[data-tokens-exit]")) {
          if (opts.onExit) opts.onExit();
          return;
        }
        if (event.target.closest("[data-tokens-hint]")) {
          showHint();
        }
      });

      boardEl.addEventListener("click", onCellClick);
      boardEl.addEventListener("keydown", onBoardKeydown);
      boardEl.addEventListener("focusin", onFocus);

      buildBoard();
      updateHud();
      renderBoard();
      setStatus("READY");

      return {
        restart: restart,
        destroy: function () {
          destroyed = true;
          clearTimers();
          boardEl.removeEventListener("click", onCellClick);
          boardEl.removeEventListener("keydown", onBoardKeydown);
          boardEl.removeEventListener("focusin", onFocus);
          if (restartButton) restartButton.onclick = null;
          if (exitButton) exitButton.onclick = null;
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.tokens = MODULE;
})();
