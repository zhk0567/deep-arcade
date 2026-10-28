/* ============================================================
   DeepSeek 深海游乐场 — 04 提示词接龙
   Pick the best next line. Mounted by js/site.js.
   ============================================================ */
(function () {
  "use strict";

  var ROUND_TIME = 15;
  var LIVES = 3;

  var ROUNDS = [
    {
      prompt: "写一封邀请朋友参加海边生日会的短信，语气轻松。",
      options: [
        { text: "请周六下午三点到蓝湾沙滩，带上防晒和好心情。", correct: true },
        { text: "邀请函是一种用于邀请他人的应用文体。", correct: false },
        { text: "我想让你帮我写一封邀请函。", correct: false }
      ],
      why: "具体时间、地点和轻松语气都到位了，这才是一句能直接用的邀请。"
    },
    {
      prompt: "为一张深海主题海报写文案，面向年轻人。",
      options: [
        { text: "海报是一种把文字和图像组合起来的视觉传达形式。", correct: false },
        { text: "把灵感潜到 2000 米，捞一颗会发光的想法。", correct: true },
        { text: "请写一个好看一点的文案。", correct: false }
      ],
      why: "有画面、有动作、有情绪，比解释“海报是什么”更像海报文案。"
    },
    {
      prompt: "让模型把一段技术说明改得更易懂，读者是中学生。",
      options: [
        { text: "写得更专业一些，术语越多越好。", correct: false },
        { text: "帮我改得通俗易懂。", correct: false },
        { text: "用初中生能懂的比喻解释，保留关键结论，控制在 120 字内。", correct: true }
      ],
      why: "点明读者、方法和长度，模型才知道“易懂”具体要做到什么程度。"
    },
    {
      prompt: "策划一个 3 天的杭州旅行，预算 2000 元，喜欢徒步。",
      options: [
        { text: "推荐一些杭州的景点。", correct: false },
        { text: "给我一个杭州旅行计划。", correct: false },
        { text: "按天安排路线、交通和预算，避开网红打卡点，多排徒步路段。", correct: true }
      ],
      why: "把预算、天数和偏好变成可执行约束，计划才不会变成泛泛的景点清单。"
    },
    {
      prompt: "让模型检查一份产品需求文档的风险。",
      options: [
        { text: "列出最可能被忽略的 5 个风险，按影响排序，并给出验证方法。", correct: true },
        { text: "看看这份文档有没有问题。", correct: false },
        { text: "把文档重新写一遍。", correct: false }
      ],
      why: "指定数量、排序方式和验证动作，输出才会变成可执行的审查结果。"
    },
    {
      prompt: "想要一张鲸鱼在星空中游泳的插画提示词。",
      options: [
        { text: "画一只鲸鱼，要好看。", correct: false },
        { text: "一头蓝鲸在星云中缓慢游动，超广角，电影感蓝紫光线，细腻颗粒。", correct: true },
        { text: "生成一张图片。", correct: false }
      ],
      why: "主体、环境、镜头、光线和质感都全了，画面才稳定。"
    },
    {
      prompt: "让模型把会议记录整理成行动项。",
      options: [
        { text: "总结一下会议。", correct: false },
        { text: "提取重点。", correct: false },
        { text: "按负责人和截止时间整理成表格，标出未明确的事项。", correct: true }
      ],
      why: "行动项需要负责人、时间和未决问题，不是一段更短的会议摘要。"
    },
    {
      prompt: "为一个面向儿童的海洋科普短视频写开头。",
      options: [
        { text: "用 15 秒提出一个问题：鲸鱼睡觉时会不会沉下去？", correct: true },
        { text: "开头要吸引人。", correct: false },
        { text: "写一个视频脚本。", correct: false }
      ],
      why: "给出时长和具体的悬念问题，比“吸引人”更容易直接开拍。"
    },
    {
      prompt: "让模型模拟面试官，进行 10 分钟产品经理面试。",
      options: [
        { text: "问我一些问题。", correct: false },
        { text: "模拟面试。", correct: false },
        { text: "一次只问一个问题，根据我的回答追问，最后给改进建议。", correct: true }
      ],
      why: "规定节奏、追问和收尾方式，模拟面试才不会变成一次性问卷。"
    },
    {
      prompt: "让模型把一段长文压缩成三条推文。",
      options: [
        { text: "总结成三条。", correct: false },
        { text: "每条不超过 80 字，保留数字和结论，语气直接。", correct: true },
        { text: "压缩一下。", correct: false }
      ],
      why: "字数、保留信息和语气都明确了，压缩结果才可控。"
    }
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
        '    <span class="xg-kicker">PROMPT CHAIN / 04</span>' +
        '    <h3 class="xg-side-title">接住下一句</h3>' +
        '    <p class="xg-side-desc">读懂语境，从三个续写里选出最顺的一句。连续答对，分数会越滚越高。</p>' +
        '    <div class="xg-stats">' +
        '      <div class="xg-stat"><span>ROUND</span><b data-prompt-round>01 / 10</b></div>' +
        '      <div class="xg-stat xg-stat--accent"><span>LIVES</span><b data-prompt-lives>♥♥♥</b></div>' +
        '      <div class="xg-stat"><span>COMBO</span><b data-prompt-combo>×1</b></div>' +
        '      <div class="xg-stat"><span>BEST</span><b data-prompt-best>0000</b></div>' +
        '    </div>' +
        '    <div class="xg-score"><span>SCORE / 本局</span><b data-prompt-score>0000</b></div>' +
        '    <div class="xg-side-note"><span class="xg-kbd">1</span> <span class="xg-kbd">2</span> <span class="xg-kbd">3</span> 也可以选择<br>每回合 15 秒，答错或超时会失去一颗心。</div>' +
        '  </aside>' +
        '  <div class="xg-stage prompt-stage">' +
        '    <div class="xg-top"><span class="xg-tag"><i></i>CONTEXT WINDOW / 接龙</span><span class="xg-timer" data-prompt-time>15.0s</span></div>' +
        '    <div class="xg-progress"><i data-prompt-progress></i></div>' +
        '    <div class="prompt-chain" data-prompt-chain><span class="prompt-chain__empty">已经接住的句子会在这里连成一条提示词链。</span></div>' +
        '    <div class="prompt-panel">' +
        '      <span class="prompt-label">CURRENT PROMPT / 当前语境</span>' +
        '      <p class="prompt-question" data-prompt-question></p>' +
        '      <div class="prompt-choices" data-prompt-choices></div>' +
        '    </div>' +
        '    <div class="prompt-feedback" data-prompt-feedback>读懂语境，选出最合适的一句。</div>' +
        '    <div class="game-over" data-prompt-over>' +
        '      <div class="game-over__card">' +
        '        <span class="game-over__kicker">CHAIN COMPLETE / 接龙结束</span>' +
        '        <h3 data-prompt-over-title>这条链，接得漂亮。</h3>' +
        '        <div class="game-over__score" data-prompt-final>0</div>' +
        '        <p class="game-over__sub">本局得分 / 最佳纪录</p>' +
        '        <span class="game-over__record" data-prompt-record hidden>NEW RECORD · 新纪录</span>' +
        '        <div class="game-over__actions">' +
        '          <button type="button" class="game-over__primary" data-prompt-restart>再链一局</button>' +
        '          <button type="button" class="game-over__secondary" data-prompt-exit>返回大厅</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      var shell = root.querySelector(".xg-shell");
      var roundEl = root.querySelector("[data-prompt-round]");
      var livesEl = root.querySelector("[data-prompt-lives]");
      var comboEl = root.querySelector("[data-prompt-combo]");
      var bestEl = root.querySelector("[data-prompt-best]");
      var scoreEl = root.querySelector("[data-prompt-score]");
      var timeEl = root.querySelector("[data-prompt-time]");
      var progressEl = root.querySelector("[data-prompt-progress]");
      var chainEl = root.querySelector("[data-prompt-chain]");
      var questionEl = root.querySelector("[data-prompt-question]");
      var choicesEl = root.querySelector("[data-prompt-choices]");
      var feedbackEl = root.querySelector("[data-prompt-feedback]");
      var overEl = root.querySelector("[data-prompt-over]");
      var finalEl = root.querySelector("[data-prompt-final]");
      var recordEl = root.querySelector("[data-prompt-record]");
      var overTitle = root.querySelector("[data-prompt-over-title]");
      var restartButton = root.querySelector("[data-prompt-restart]");
      var exitButton = root.querySelector("[data-prompt-exit]");

      var round = 0;
      var lives = LIVES;
      var score = 0;
      var combo = 1;
      var best = Number(opts.best) || 0;
      var chain = [];
      var timeLeft = ROUND_TIME;
      var tick = 0;
      var answered = false;
      var ended = false;
      var destroyed = false;
      var currentOptions = [];
      var nextTimer = 0;

      function setTimerBar(ratio) {
        progressEl.style.transform = "scaleX(" + Math.max(0, Math.min(1, ratio)) + ")";
      }

      function updateHud() {
        roundEl.textContent = String(Math.min(round + 1, ROUNDS.length)).padStart(2, "0") + " / " + String(ROUNDS.length).padStart(2, "0");
        livesEl.textContent = hearts(lives);
        comboEl.textContent = "×" + combo;
        scoreEl.textContent = pad(score);
        bestEl.textContent = pad(best);
      }

      function renderChain() {
        if (!chain.length) {
          chainEl.innerHTML = '<span class="prompt-chain__empty">已经接住的句子会在这里连成一条提示词链。</span>';
          return;
        }
        chainEl.innerHTML = chain.map(function (item, index) {
          return '<span class="prompt-chain-chip"><b>' + String(index + 1).padStart(2, "0") + "</b>" + item + "</span>";
        }).join("");
        chainEl.scrollTop = chainEl.scrollHeight;
      }

      function stopClock() {
        window.clearInterval(tick);
        tick = 0;
      }

      function startClock() {
        stopClock();
        timeLeft = ROUND_TIME;
        timeEl.textContent = timeLeft.toFixed(1) + "s";
        timeEl.classList.remove("is-low");
        setTimerBar(1);
        tick = window.setInterval(function () {
          if (answered || ended) return;
          timeLeft = Math.max(0, timeLeft - 0.1);
          timeEl.textContent = timeLeft.toFixed(1) + "s";
          timeEl.classList.toggle("is-low", timeLeft <= 5);
          setTimerBar(timeLeft / ROUND_TIME);
          if (timeLeft <= 0) {
            stopClock();
            timeoutRound();
          }
        }, 100);
      }

      function renderRound() {
        if (destroyed) return;
        if (round >= ROUNDS.length || lives <= 0) {
          endGame();
          return;
        }
        answered = false;
        timeEl.classList.remove("is-low");
        var data = ROUNDS[round];
        questionEl.textContent = data.prompt;
        feedbackEl.className = "prompt-feedback";
        feedbackEl.textContent = "读懂语境，选出最合适的一句。";
        currentOptions = shuffle(data.options);
        choicesEl.innerHTML = currentOptions.map(function (option, index) {
          return '<button type="button" class="prompt-choice" data-prompt-option="' + index + '">' +
            "<b>" + (index + 1) + "</b><span>" + option.text + "</span></button>";
        }).join("");
        renderChain();
        updateHud();
        startClock();
      }

      function findCorrectText() {
        var found = "";
        currentOptions.forEach(function (option) {
          if (option.correct) found = option.text;
        });
        return found;
      }

      function markCorrect() {
        var buttons = choicesEl.querySelectorAll("[data-prompt-option]");
        buttons.forEach(function (button) {
          var option = currentOptions[Number(button.getAttribute("data-prompt-option"))];
          button.disabled = true;
          if (option.correct) button.classList.add("is-correct");
        });
      }

      function choose(index) {
        if (answered || ended || destroyed) return;
        var option = currentOptions[index];
        if (!option) return;
        answered = true;
        stopClock();
        var buttons = choicesEl.querySelectorAll("[data-prompt-option]");
        var chosen = buttons[index];
        if (option.correct) {
          var gain = 100 + Math.ceil(timeLeft) * 8 + (combo - 1) * 20;
          score += gain;
          chain.push(option.text);
          combo += 1;
          if (chosen) chosen.classList.add("is-correct");
          feedbackEl.className = "prompt-feedback is-good";
          feedbackEl.innerHTML = "<b>接住了 +" + gain + "</b> " + ROUNDS[round].why;
          markCorrect();
          if (audio.land) audio.land(true);
          updateHud();
          renderChain();
          window.clearTimeout(nextTimer);
          nextTimer = window.setTimeout(function () {
            if (!destroyed) {
              round += 1;
              renderRound();
            }
          }, 850);
        } else {
          lives -= 1;
          combo = 1;
          if (chosen) chosen.classList.add("is-wrong");
          markCorrect();
          feedbackEl.className = "prompt-feedback is-bad";
          feedbackEl.innerHTML = "<b>差一点。</b>更顺的接法是：「" + findCorrectText() + "」";
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
          }, 1150);
        }
      }

      function timeoutRound() {
        if (answered || ended) return;
        answered = true;
        lives -= 1;
        combo = 1;
        markCorrect();
        feedbackEl.className = "prompt-feedback is-bad";
        feedbackEl.innerHTML = "<b>时间到。</b>更顺的接法是：「" + findCorrectText() + "」";
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
        }, 1150);
      }

      function endGame() {
        if (ended || destroyed) return;
        ended = true;
        stopClock();
        window.clearTimeout(nextTimer);
        var result = typeof opts.onGameEnd === "function" ? opts.onGameEnd(score) : { best: best, isRecord: false };
        best = result.best != null ? result.best : best;
        finalEl.textContent = pad(score);
        overTitle.textContent = lives > 0 ? "这条链，接得漂亮。" : "链断了，但灵感还在。";
        recordEl.hidden = !result.isRecord;
        overEl.classList.add("is-visible");
        if (audio.gameOver) audio.gameOver();
        updateHud();
      }

      function restart() {
        round = 0;
        lives = LIVES;
        score = 0;
        combo = 1;
        chain = [];
        ended = false;
        answered = false;
        window.clearTimeout(nextTimer);
        overEl.classList.remove("is-visible");
        updateHud();
        renderRound();
      }

      function onChoicesClick(event) {
        var button = event.target.closest("[data-prompt-option]");
        if (!button) return;
        choose(Number(button.getAttribute("data-prompt-option")));
      }

      function onKeyDown(event) {
        if (ended || answered) return;
        if (event.key === "1" || event.key === "2" || event.key === "3") {
          event.preventDefault();
          choose(Number(event.key) - 1);
        }
      }

      choicesEl.addEventListener("click", onChoicesClick);
      window.addEventListener("keydown", onKeyDown);
      restartButton.addEventListener("click", restart);
      exitButton.addEventListener("click", function () {
        if (typeof opts.onExit === "function") opts.onExit();
      });

      updateHud();
      renderRound();

      return {
        restart: restart,
        destroy: function () {
          destroyed = true;
          ended = true;
          stopClock();
          window.clearTimeout(nextTimer);
          choicesEl.removeEventListener("click", onChoicesClick);
          window.removeEventListener("keydown", onKeyDown);
          if (shell) shell.setAttribute("aria-hidden", "true");
        }
      };
    }
  };

  window.DeepSeekGames = window.DeepSeekGames || {};
  window.DeepSeekGames.prompt = MODULE;
})();
