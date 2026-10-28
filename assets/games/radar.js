/* ============================================================
   DeepSeek 深海游乐场 — 05 深海寻鲸
   Sonar distance game. Mounted by js/site.js.
   ============================================================ */
(function () {
  "use strict";

  var SIZE = 8;
  var START_PROBES = 8;

  function pad(value) {
    return String(value).padStart(5, "0");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {};

      root.innerHTML =
        '<div class="xg-shell">' +
        '  <aside class="xg-side">' +
        '    <span class="xg-kicker">SONAR / 05</span>' +
        '    <h3 class="xg-side-title">听，海里有鲸</h3>' +
        '    <p class="xg-side-desc">点击海域发射声呐。数字是到鲸鱼的曼哈顿距离，越接近越热。用有限声呐找到它。</p>' +
        '    <div class="xg-stats">' +
        '      <div class="xg-stat xg-stat--accent"><span>PROBES</span><b data-radar-probes>8</b></div>' +
        '      <div class="xg-stat"><span>TIME</span><b data-radar-time>0:00</b></div>' +
        '      <div class="xg-stat"><span>CLOSEST</span><b data-radar-closest>—</b></div>' +
        '      <div class="xg-stat"><span>BEST</span><b data-radar-best>00000</b></div>' +
        '    </div>' +
        '    <div class="xg-score"><span>SCORE / 本局</span><b data-radar-score>00000</b></div>' +
        '    <div class="xg-side-note">距离是横纵格数之和。<br>0 格就是鲸鱼的位置。<br>剩余声呐越多，分数越高。</div>' +
        '  </aside>' +
        '  <div class="xg-stage radar-stage">' +
        '    <div class="xg-top"><span class="xg-tag"><i></i>SONAR GRID / 8 × 8</span><span class="xg-timer" data-radar-timer>LISTENING</span></div>' +
        '    <div class="radar-layout">' +
        '      <div class="radar-board-wrap">' +
        '        <div class="radar-board" data-radar-board role="grid" aria-label="深海声呐网格，八行八列。点击格子发射声呐，寻找鲸鱼。"></div>' +
        '      </div>' +
        '      <div class="radar-panel">' +
        '        <div class="radar-readout">' +
        '          <span>LAST SIGNAL / 最近回声</span>' +
        '          <b data-radar-readout>等待声呐</b>' +
        '          <p data-radar-sub>点击任意海域，听听鲸鱼在哪里。</p>' +
        '        </div>' +
        '        <div class="radar-legend">' +
        '          <span><i class="cold"></i>远海 · 距离较远</span>' +
        '          <span><i class="warm"></i>暖流 · 正在靠近</span>' +
        '          <span><i class="hot"></i>热区 · 非常接近</span>' +
        '        </div>' +
        '        <button type="button" class="xg-primary" data-radar-restart>重新扫描</button>' +
        '      </div>' +
        '    </div>' +
        '    <div class="game-over" data-radar-over>' +
        '      <div class="game-over__card">' +
        '        <span class="game-over__kicker">SIGNAL LOCKED / 声呐结束</span>' +
        '        <h3 data-radar-over-title>它就在那里。</h3>' +
        '        <div class="game-over__score" data-radar-final>0</div>' +
        '        <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '        <span class="game-over__record" data-radar-record hidden>NEW RECORD · 新纪录</span>' +
        '        <div class="game-over__actions">' +
        '          <button type="button" class="game-over__primary" data-radar-again>再听一次</button>' +
        '          <button type="button" class="game-over__secondary" data-radar-exit>返回大厅</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var boardEl = root.querySelector("[data-radar-board]");
      var probesEl = root.querySelector("[data-radar-probes]");
      var timeEl = root.querySelector("[data-radar-time]");
      var closestEl = root.querySelector("[data-radar-closest]");
      var bestEl = root.querySelector("[data-radar-best]");
      var scoreEl = root.querySelector("[data-radar-score]");
      var timerEl = root.querySelector("[data-radar-timer]");
      var readoutEl = root.querySelector("[data-radar-readout]");
      var subEl = root.querySelector("[data-radar-sub]");
      var overEl = root.querySelector("[data-radar-over]");
      var finalEl = root.querySelector("[data-radar-final]");
      var recordEl = root.querySelector("[data-radar-record]");
      var overTitle = root.querySelector("[data-radar-over-title]");
      var restartButton = root.querySelector("[data-radar-restart]");
      var againButton = root.querySelector("[data-radar-again]");
      var exitButton = root.querySelector("[data-radar-exit]");

      var whaleIndex = 0;
      var probes = START_PROBES;
      var score = 0;
      var best = Number(opts.best) || 0;
      var closest = null;
      var found = false;
      var ended = false;
      var destroyed = false;
      var startedAt = 0;
      var clock = 0;
      var foundTimer = 0;

      function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ":" + String(s).padStart(2, "0");
      }

      function elapsed() {
        return startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      }

      function updateHud() {
        probesEl.textContent = String(probes);
        timeEl.textContent = formatTime(elapsed());
        closestEl.textContent = closest == null ? "—" : String(closest);
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(best);
      }

      function distanceAt(index) {
        var row = Math.floor(index / SIZE);
        var column = index % SIZE;
        var targetRow = Math.floor(whaleIndex / SIZE);
        var targetColumn = whaleIndex % SIZE;
        return Math.abs(row - targetRow) + Math.abs(column - targetColumn);
      }

      function heatClass(distance) {
        if (distance === 0) return "is-found";
        if (distance <= 2) return "is-hot";
        if (distance <= 4) return "is-warm";
        return "is-cold";
      }

      function buildBoard() {
        var html = "";
        for (var index = 0; index < SIZE * SIZE; index += 1) {
          html += '<button type="button" class="radar-cell" data-radar-cell="' + index + '" aria-label="海域 ' + (index + 1) + '"></button>';
        }
        boardEl.innerHTML = html;
      }

      function updateStart() {
        startedAt = Date.now();
        window.clearInterval(clock);
        clock = window.setInterval(function () {
          if (!ended && !destroyed) updateHud();
        }, 1000);
      }

      function probe(index, cell) {
        if (ended || found || destroyed || cell.disabled) return;
        var distance = distanceAt(index);
        closest = closest == null ? distance : Math.min(closest, distance);
        probes -= 1;
        if (audio.drop) audio.drop();

        cell.disabled = true;
        cell.classList.add("is-probed", heatClass(distance));
        if (distance === 0) {
          found = true;
          cell.innerHTML = '<svg viewBox="0 0 128 80" aria-hidden="true"><use href="#icon-whale"/></svg>';
          readoutEl.textContent = "鲸鱼找到了";
          subEl.textContent = "声呐回波在 " + (index + 1) + " 号海域汇聚。";
          timerEl.textContent = "CONTACT";
          if (audio.land) audio.land(true);
          score = 1000 + probes * 120 + Math.max(0, 60 - elapsed() * 5);
          updateHud();
          window.clearTimeout(foundTimer);
          foundTimer = window.setTimeout(function () {
            if (!destroyed) endGame(true);
          }, 650);
          return;
        }

        cell.textContent = String(distance);
        var label = distance <= 2 ? "热区" : distance <= 4 ? "暖流" : "远海";
        readoutEl.textContent = "距离 " + distance + " 格 · " + label;
        subEl.textContent = distance <= 2
          ? "非常接近，鲸鱼就在附近。"
          : distance <= 4
            ? "有回温，继续调整方向。"
            : "还很远，换一片海域试试。";
        updateHud();

        if (probes <= 0) {
          endGame(false);
        }
      }

      function endGame(success) {
        if (ended || destroyed) return;
        ended = true;
        window.clearInterval(clock);
        window.clearTimeout(foundTimer);
        if (!success) score = 0;
        var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : { best: best, isRecord: false };
        best = result.best != null ? result.best : best;
        finalEl.textContent = pad(score);
        overTitle.textContent = success ? "它就在那里。" : "声呐用完了，海面又安静下来。";
        recordEl.hidden = !result.isRecord;
        overEl.classList.add("is-visible");
        timerEl.textContent = success ? "CONTACT" : "SILENT";
        updateHud();
        if (audio.gameOver) audio.gameOver();
      }

      function restart() {
        window.clearTimeout(foundTimer);
        ended = false;
        found = false;
        probes = START_PROBES;
        score = 0;
        closest = null;
        whaleIndex = Math.floor(Math.random() * SIZE * SIZE);
        overEl.classList.remove("is-visible");
        buildBoard();
        readoutEl.textContent = "等待声呐";
        subEl.textContent = "点击任意海域，听听鲸鱼在哪里。";
        timerEl.textContent = "LISTENING";
        updateHud();
        updateStart();
      }

      function onBoardClick(event) {
        var cell = event.target.closest("[data-radar-cell]");
        if (!cell) return;
        probe(Number(cell.getAttribute("data-radar-cell")), cell);
      }

      boardEl.addEventListener("click", onBoardClick);
      restartButton.addEventListener("click", restart);
      againButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      updateHud();
      restart();

      return {
        restart: restart,
        destroy: function () {
          destroyed = true;
          ended = true;
          window.clearInterval(clock);
          window.clearTimeout(foundTimer);
          boardEl.removeEventListener("click", onBoardClick);
          if (restartButton) restartButton.onclick = null;
          if (againButton) againButton.onclick = null;
          if (exitButton) exitButton.onclick = null;
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.radar = MODULE;
})();
