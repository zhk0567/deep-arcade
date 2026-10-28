/* ============================================================
   DeepSeek 深海游乐场 — 06 幻觉猎手
   Judge whether a claim is real or a hallucination.
   ============================================================ */
(function () {
  "use strict";

  var ROUND_TIME = 6;
  var LIVES = 3;

  var CLAIMS = [
    { claim: "章鱼有三颗心脏。", real: true, why: "章鱼确实有两颗鳃心、一颗主心脏。" },
    { claim: "人类只使用了大脑的 10%。", real: false, why: "这是流传很广的误解，正常活动几乎会用到整个大脑。" },
    { claim: "光从太阳到地球大约需要 8 分钟。", real: true, why: "太阳光约 8 分 20 秒到达地球。" },
    { claim: "闪电永远不会击中同一个地方两次。", real: false, why: "高塔和山顶会被反复击中，避雷针就是利用这一点。" },
    { claim: "蝙蝠是鸟类。", real: false, why: "蝙蝠是哺乳动物，有毛发并靠胎生繁殖。" },
    { claim: "声音可以在真空中传播。", real: false, why: "声音需要介质，真空中没有可以振动的粒子。" },
    { claim: "HTTP 是一种无状态协议。", real: true, why: "HTTP 本身不保存上一次请求的状态，状态通常由 Cookie 或会话维持。" },
    { claim: "JavaScript 和 Java 是同一门编程语言。", real: false, why: "两者名字相似，但设计、运行时和用途都不同。" },
    { claim: "鲸鱼是鱼类。", real: false, why: "鲸鱼是哺乳动物，用肺呼吸。" },
    { claim: "水在标准大气压下约 100°C 沸腾。", real: true, why: "标准大气压是 101.325 kPa，此时水的沸点约为 100°C。" },
    { claim: "长城是唯一能从太空用肉眼看到的人造建筑。", real: false, why: "这是常见误传；从太空肉眼通常很难直接看到长城。" },
    { claim: "GPU 最初主要为了图形渲染而设计。", real: true, why: "GPU 的图形管线设计后来被广泛用于通用计算和 AI。" },
    { claim: "企鹅生活在南半球，北极没有野生企鹅。", real: true, why: "野生企鹅分布在南半球；北极的“企鹅”是已经灭绝的大海雀。" },
    { claim: "闪电和雷声同时发生，先看到闪电是因为光速比声速快。", real: true, why: "光和声同时产生，但光传播得快得多。" },
    { claim: "太阳是一颗行星。", real: false, why: "太阳是恒星，靠核聚变发光发热。" },
    { claim: "海拔越高，水的沸点越低。", real: true, why: "气压随海拔降低，水在更低的温度就会沸腾。" }
  ];

  function pad(value) {
    return String(value).padStart(4, "0");
  }

  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function hearts(count) {
    var out = "";
    for (var i = 0; i < LIVES; i += 1) out += i < count ? "♥" : "·";
    return out;
  }

  var MODULE = {
    mount: function (root, options) {
      var opts = options || {};
      var audio = opts.audio || {};

      root.innerHTML =
        '<div class="xg-shell">' +
        '  <aside class="xg-side">' +
        '    <span class="xg-kicker">GHOST HUNTER / 06</span>' +
        '    <h3 class="xg-side-title">别急着相信</h3>' +
        '    <p class="xg-side-desc">一句话，可能是真的，也可能是一本正经的胡话。看准了就按下判断。</p>' +
        '    <div class="xg-stats">' +
        '      <div class="xg-stat"><span>CLAIM</span><b data-hunter-round>01 / 16</b></div>' +
        '      <div class="xg-stat xg-stat--accent"><span>LIVES</span><b data-hunter-lives>♥♥♥</b></div>' +
        '      <div class="xg-stat"><span>COMBO</span><b data-hunter-combo>×1</b></div>' +
        '      <div class="xg-stat"><span>BEST</span><b data-hunter-best>0000</b></div>' +
        '    </div>' +
        '    <div class="xg-score"><span>SCORE / 本局</span><b data-hunter-score>0000</b></div>' +
        '    <div class="xg-side-note"><span class="xg-kbd">T</span> 真的 · <span class="xg-kbd">F</span> 幻觉<br>每回合 6 秒，答错或超时会失去一颗心。</div>' +
        '  </aside>' +
        '  <div class="xg-stage hunter-stage">' +
        '    <div class="xg-top"><span class="xg-tag"><i></i>MODEL CLAIM / 待判断</span><span class="xg-timer" data-hunter-time>6.0s</span></div>' +
        '    <div class="hunter-card">' +
        '      <div class="hunter-meta"><span>CONFIDENCE / 模型置信度</span><span class="hunter-confidence" data-hunter-confidence>99.2%</span></div>' +
        '      <p class="hunter-claim-text" data-hunter-claim></p>' +
        '      <div class="hunter-timer"><i data-hunter-bar></i></div>' +
        '    </div>' +
        '    <div class="hunter-actions">' +
        '      <button type="button" class="hunter-answer hunter-answer--real" data-hunter-answer="true">这是真的 <span class="xg-kbd">T</span></button>' +
        '      <button type="button" class="hunter-answer hunter-answer--ghost" data-hunter-answer="false">抓到幻觉 <span class="xg-kbd">F</span></button>' +
        '    </div>' +
        '    <div class="hunter-feedback" data-hunter-feedback>保持怀疑，也保持好奇。</div>' +
        '    <div class="game-over" data-hunter-over>' +
        '      <div class="game-over__card">' +
        '        <span class="game-over__kicker">SCAN COMPLETE / 扫描结束</span>' +
        '        <h3 data-hunter-over-title>你的怀疑，很值钱。</h3>' +
        '        <div class="game-over__score" data-hunter-final>0</div>' +
        '        <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '        <span class="game-over__record" data-hunter-record hidden>NEW RECORD · 新纪录</span>' +
        '        <div class="game-over__actions">' +
        '          <button type="button" class="game-over__primary" data-hunter-restart>再扫一遍</button>' +
        '          <button type="button" class="game-over__secondary" data-hunter-exit>返回大厅</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var roundEl = root.querySelector("[data-hunter-round]");
      var livesEl = root.querySelector("[data-hunter-lives]");
      var comboEl = root.querySelector("[data-hunter-combo]");
      var bestEl = root.querySelector("[data-hunter-best]");
      var scoreEl = root.querySelector("[data-hunter-score]");
      var timeEl = root.querySelector("[data-hunter-time]");
      var claimEl = root.querySelector("[data-hunter-claim]");
      var confidenceEl = root.querySelector("[data-hunter-confidence]");
      var barEl = root.querySelector("[data-hunter-bar]");
      var feedbackEl = root.querySelector("[data-hunter-feedback]");
      var overEl = root.querySelector("[data-hunter-over]");
      var finalEl = root.querySelector("[data-hunter-final]");
      var recordEl = root.querySelector("[data-hunter-record]");
      var overTitle = root.querySelector("[data-hunter-over-title]");
      var restartButton = root.querySelector("[data-hunter-restart]");
      var exitButton = root.querySelector("[data-hunter-exit]");
      var answerButtons = root.querySelectorAll("[data-hunter-answer]");

      var deck = [];
      var round = 0;
      var lives = LIVES;
      var score = 0;
      var combo = 1;
      var best = Number(opts.best) || 0;
      var timeLeft = ROUND_TIME;
      var tick = 0;
      var answered = false;
      var ended = false;
      var destroyed = false;
      var nextTimer = 0;

      function updateHud() {
        roundEl.textContent = String(Math.min(round + 1, deck.length)).padStart(2, "0") + " / " + String(deck.length).padStart(2, "0");
        livesEl.textContent = hearts(lives);
        comboEl.textContent = "×" + combo;
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(best);
      }

      function stopClock() {
        window.clearInterval(tick);
        tick = 0;
      }

      function setTimer(ratio) {
        barEl.style.transform = "scaleX(" + Math.max(0, Math.min(1, ratio)) + ")";
        timeEl.textContent = Math.max(0, timeLeft).toFixed(1) + "s";
        timeEl.classList.toggle("is-low", timeLeft <= 2);
      }

      function startClock() {
        stopClock();
        timeLeft = ROUND_TIME;
        setTimer(1);
        tick = window.setInterval(function () {
          if (answered || ended) return;
          timeLeft = Math.max(0, timeLeft - 0.1);
          setTimer(timeLeft / ROUND_TIME);
          if (timeLeft <= 0) {
            stopClock();
            timeoutRound();
          }
        }, 100);
      }

      function setButtonsEnabled(enabled) {
        answerButtons.forEach(function (button) {
          button.disabled = !enabled;
        });
      }

      function renderRound() {
        if (destroyed) return;
        if (round >= deck.length || lives <= 0) {
          endGame();
          return;
        }
        answered = false;
        setButtonsEnabled(true);
        answerButtons.forEach(function (button) {
          button.classList.remove("is-correct", "is-wrong");
        });
        var item = deck[round];
        claimEl.textContent = item.claim;
        confidenceEl.textContent = (93 + Math.random() * 6.5).toFixed(1) + "%";
        feedbackEl.className = "hunter-feedback";
        feedbackEl.textContent = "它是真的，还是听起来很真的胡话？";
        updateHud();
        startClock();
      }

      function markAnswer(item, value, chosenValue) {
        answerButtons.forEach(function (button) {
          var buttonValue = button.getAttribute("data-hunter-answer") === "true";
          button.disabled = true;
          if (buttonValue === item.real) button.classList.add("is-correct");
          if (buttonValue === chosenValue && chosenValue !== item.real) button.classList.add("is-wrong");
        });
        feedbackEl.className = "hunter-feedback " + (value ? "is-good" : "is-bad");
      }

      function answer(value) {
        if (answered || ended || destroyed) return;
        var item = deck[round];
        if (!item) return;
        answered = true;
        stopClock();
        var correct = value === item.real;
        if (correct) {
          var gain = 120 + Math.ceil(timeLeft) * 15 + (combo - 1) * 20;
          score += gain;
          combo += 1;
          if (audio.land) audio.land(true);
          markAnswer(item, true, value);
          feedbackEl.innerHTML = "<b>判断正确 +" + gain + "。</b> " + item.why;
        } else {
          lives -= 1;
          combo = 1;
          if (audio.fail) audio.fail();
          markAnswer(item, false, value);
          feedbackEl.innerHTML = "<b>差一点。</b> " + item.why;
        }
        updateHud();
        window.clearTimeout(nextTimer);
        nextTimer = window.setTimeout(function () {
          if (!destroyed) {
            if (lives <= 0) endGame();
            else {
              round += 1;
              renderRound();
            }
          }
        }, 1300);
      }

      function timeoutRound() {
        if (answered || ended) return;
        var item = deck[round];
        if (!item) return;
        answered = true;
        lives -= 1;
        combo = 1;
        markAnswer(item, false, null);
        feedbackEl.innerHTML = "<b>时间到。</b> " + item.why;
        if (audio.fail) audio.fail();
        updateHud();
        window.clearTimeout(nextTimer);
        nextTimer = window.setTimeout(function () {
          if (!destroyed) {
            if (lives <= 0) endGame();
            else {
              round += 1;
              renderRound();
            }
          }
        }, 1300);
      }

      function endGame() {
        if (ended || destroyed) return;
        ended = true;
        stopClock();
        window.clearTimeout(nextTimer);
        var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : { best: best, isRecord: false };
        best = result.best != null ? result.best : best;
        finalEl.textContent = pad(score);
        overTitle.textContent = lives > 0 ? "你的怀疑，很值钱。" : "怀疑很贵，但别耗尽它。";
        recordEl.hidden = !result.isRecord;
        overEl.classList.add("is-visible");
        if (audio.gameOver) audio.gameOver();
        updateHud();
      }

      function restart() {
        window.clearTimeout(nextTimer);
        deck = shuffle(CLAIMS);
        round = 0;
        lives = LIVES;
        score = 0;
        combo = 1;
        ended = false;
        answered = false;
        overEl.classList.remove("is-visible");
        renderRound();
      }

      function onAnswerClick(event) {
        var button = event.target.closest("[data-hunter-answer]");
        if (!button) return;
        answer(button.getAttribute("data-hunter-answer") === "true");
      }

      function onKeyDown(event) {
        if (ended || answered) return;
        if (event.key === "t" || event.key === "T") {
          event.preventDefault();
          answer(true);
        } else if (event.key === "f" || event.key === "F") {
          event.preventDefault();
          answer(false);
        }
      }

      root.querySelector(".hunter-actions").addEventListener("click", onAnswerClick);
      window.addEventListener("keydown", onKeyDown);
      restartButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      restart();

      return {
        restart: restart,
        destroy: function () {
          destroyed = true;
          ended = true;
          stopClock();
          window.clearTimeout(nextTimer);
          window.removeEventListener("keydown", onKeyDown);
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.hunter = MODULE;
})();
