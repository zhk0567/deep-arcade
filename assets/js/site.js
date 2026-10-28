/* ============================================================
   DeepSeek 深海游乐场 — site controller
   ============================================================ */
(function () {
  "use strict";

  var BEST_PREFIX = "ds-arcade-best-";
  var SAVED_KEY = "ds-arcade-saved-signals";
  var gameOverlay = document.getElementById("gameOverlay");
  var detailOverlay = document.getElementById("detailOverlay");
  var commandLayer = document.getElementById("commandPalette");
  var mobileMenu = document.getElementById("mobileMenu");
  var noticeBar = document.getElementById("noticeBar");
  var noticeOverlay = document.getElementById("noticeModal");
  var noticeLastFocused = null;
  var noticeTimer = null;
  var gamesGrid = document.getElementById("gamesGrid");
  var body = document.body;
  var gameDialog = gameOverlay ? gameOverlay.querySelector(".game-dialog") : null;
  var activeGame = null;
  var activeGameId = null;
  var gameStartedAt = 0;
  var closeTimer = null;
  var menuTimer = null;
  var lastFocused = null;
  var toastTimer = null;
  var commandTimer = null;
  var commandReturnFocus = null;
  var hotFilter = "all";
  var hotOffset = 0;
  var currentSignalId = null;
  var savedSignals = loadSaved();
  var commandCommands = [];
  var commandIndex = 0;
  var commandQuery = "";

  /* ------------------------------------------------------------------
     Game catalogue
     ------------------------------------------------------------------ */

  var playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-play"/></svg>';
  var whaleIcon = '<svg viewBox="0 0 128 80" aria-hidden="true"><use href="#icon-whale"/></svg>';
  var bookmarkIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-bookmark"/></svg>';
  var bookmarkFillIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-bookmark-fill"/></svg>';

  var GAMES = [
    {
      id: "jump",
      index: "01",
      title: "跳一跳",
      tag: "HOLD & HOP",
      status: "live",
      controls: "按住蓄力，松开起跳 · 空格也可以",
      description: "完整试玩版：四角色、四地图、三道具与本地存档。",
      artClass: "jump"
    },
    {
      id: "fish",
      index: "02",
      title: "合成大肥鱼",
      tag: "MERGE & GROW",
      status: "live",
      controls: "移动鼠标选择位置 · 点击 / 空格投放 · P 暂停",
      description: "完整版：10 级形态、图鉴、语音与本地存档。",
      artClass: "fish"
    },
    {
      id: "tokens",
      index: "03",
      title: "Token 消消乐",
      tag: "MATCH & CLEAR",
      status: "live",
      controls: "选中相邻 Token 交换 · 三个同款连成线即可消除",
      description: "交换相邻 Token，三个同款即可消除。",
      artClass: "tokens"
    },
    {
      id: "prompt",
      index: "04",
      title: "提示词接龙",
      tag: "PROMPT CHAIN",
      status: "live",
      controls: "读懂语境，选出最合适的下一句 · 数字键 1 / 2 / 3",
      description: "一句接一句，和鲸鱼一起把脑洞滚成雪球。接得住，还要接得妙。",
      artClass: "prompt"
    },
    {
      id: "radar",
      index: "05",
      title: "深海寻鲸",
      tag: "FIND THE WHALE",
      status: "live",
      controls: "点击海域发射声呐 · 根据距离和热度锁定鲸鱼",
      description: "根据微弱的声呐信号，在噪声海域里找到那条鲸。耐心比运气更重要。",
      artClass: "radar"
    },
    {
      id: "hunter",
      index: "06",
      title: "幻觉猎手",
      tag: "SPOT THE GHOST",
      status: "live",
      controls: "判断真假 · 键盘 T / F 或点击按钮",
      description: "识别一本正经的胡话，在错误蔓延之前按下捕获。保持怀疑，也保持好奇。",
      artClass: "hunter"
    },
    {
      id: "puzzle",
      index: "07",
      title: "鲸落拼图",
      tag: "PIECE BY PIECE",
      status: "live",
      controls: "点击空格旁的图块移动 · 拼回完整鲸鱼",
      description: "把散落的鲸鱼插画拼回完整，让灵感重新浮上海面。每一块都藏着线索。",
      artClass: "puzzle"
    },
    {
      id: "maze",
      index: "08",
      title: "R1 迷宫",
      tag: "THINK AHEAD",
      status: "live",
      controls: "方向键 / WASD 移动 · 手机使用方向按钮",
      description: "每一步都要想清楚。用越来越长的推理路线，走出越来越深的迷宫。",
      artClass: "maze"
    }
  ];

  var TOKEN_ART = [
    ["W", ""], ["D", "token-mini--d"], ["C", "token-mini--c"], ["P", "token-mini--p"],
    ["E", "token-mini--l"], ["W", ""], ["D", "token-mini--d"], ["C", "token-mini--c"],
    ["P", "token-mini--p"], ["E", "token-mini--l"], ["W", ""], ["D", "token-mini--d"]
  ];

  function gameArt(id) {
    if (id === "jump") {
      return (
        '<div class="jump-scene">' +
        '<span class="art-grid"></span><span class="jump-sun"></span>' +
        '<span class="jump-island jump-island--a"></span>' +
        '<span class="jump-island jump-island--b"></span>' +
        '<span class="jump-island jump-island--c"></span>' +
        '<span class="jump-arc"></span>' +
        '<span class="jump-ring"></span>' +
        '<svg class="jump-whale" viewBox="0 0 128 80" aria-hidden="true"><use href="#icon-whale"/></svg>' +
        '<span class="jump-meter"><i></i></span>' +
        "</div>"
      );
    }
    if (id === "fish") {
      return (
        '<div class="fish-scene">' +
        '<span class="fish-bubble fish-bubble--a"></span>' +
        '<span class="fish-bubble fish-bubble--b"></span>' +
        '<span class="fish-bubble fish-bubble--c"></span>' +
        '<span class="fish-blob fish-blob--one"><i></i></span>' +
        '<span class="fish-blob fish-blob--two"><i></i></span>' +
        '<span class="fish-blob fish-blob--three"><i></i></span>' +
        '<span class="fish-blob fish-blob--four"><i></i></span>' +
        '<span class="fish-tank-line"></span>' +
        "</div>"
      );
    }
    if (id === "tokens") {
      return (
        '<div class="token-scene">' +
        '<span class="art-grid"></span>' +
        '<div class="token-mini-grid">' +
        TOKEN_ART.map(function (token) {
          return '<span class="token-mini ' + token[1] + '">' + token[0] + "</span>";
        }).join("") +
        "</div>" +
        '<span class="token-combo">COMBO <b>× 3</b></span>' +
        "</div>"
      );
    }
    if (id === "prompt") {
      return (
        '<div class="prompt-scene">' +
        '<span class="prompt-sun"></span>' +
        '<div class="prompt-window">' +
        '<div class="prompt-window-top"><i></i><i></i><i></i></div>' +
        '<div class="prompt-line prompt-line--active"><span></span><span></span></div>' +
        '<div class="prompt-line"><span></span><span></span></div>' +
        '<div class="prompt-line"><span></span><span></span></div>' +
        '<div class="prompt-line"><span></span><span></span></div>' +
        "</div>" +
        '<span class="prompt-chip">NEXT WORD →</span>' +
        "</div>"
      );
    }
    if (id === "radar") {
      return (
        '<div class="radar-scene">' +
        '<span class="radar-ring radar-ring--a"></span>' +
        '<span class="radar-ring radar-ring--b"></span>' +
        '<span class="radar-ring radar-ring--c"></span>' +
        '<span class="radar-cross"></span><span class="radar-cross radar-cross--v"></span>' +
        '<span class="radar-sweep"></span>' +
        '<span class="radar-blip radar-blip--a"></span>' +
        '<span class="radar-blip radar-blip--b"></span>' +
        '<span class="radar-blip radar-blip--c"></span>' +
        '<svg class="radar-whale" viewBox="0 0 128 80" aria-hidden="true"><use href="#icon-whale"/></svg>' +
        '<span class="radar-label">SCANNING / 1420 kHz</span>' +
        "</div>"
      );
    }
    if (id === "hunter") {
      return (
        '<div class="hunter-scene">' +
        '<div class="hunter-claim">The model says:<b>「鲸鱼可以在陆地行走。」</b>confidence: 99.7%<br>source: &lt;unknown&gt;</div>' +
        '<span class="hunter-reticle"></span>' +
        '<span class="hunter-stamp">HALLUCINATION / CAUGHT</span>' +
        "</div>"
      );
    }
    if (id === "puzzle") {
      return (
        '<div class="puzzle-scene">' +
        '<span class="art-grid"></span>' +
        '<span class="puzzle-piece puzzle-piece--a"></span>' +
        '<span class="puzzle-piece puzzle-piece--b"></span>' +
        '<span class="puzzle-piece puzzle-piece--c">' + whaleIcon + "</span>" +
        '<span class="puzzle-piece puzzle-piece--d"></span>' +
        '<svg class="puzzle-whale" viewBox="0 0 128 80" aria-hidden="true"><use href="#icon-whale"/></svg>' +
        "</div>"
      );
    }
    return (
      '<div class="maze-scene">' +
      '<span class="maze-path"></span>' +
      '<span class="maze-start">' + whaleIcon + "</span>" +
      '<span class="maze-label">DEPTH / ∞</span>' +
      "</div>"
    );
  }

  /* ------------------------------------------------------------------
     Signal feed (editorial demo data)
     ------------------------------------------------------------------ */

  var HOT_ITEMS = [
    {
      id: "v4-preview",
      category: "模型",
      catClass: "model",
      title: "DeepSeek-V4 预览版：迈入百万上下文普惠时代",
      short: "百万字超长上下文，Agent、世界知识与推理性能全面升级，并同步开源。",
      date: "2026/04/24",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news260424/" }
    },
    {
      id: "v4-1-flash",
      category: "模型",
      catClass: "model",
      title: "DeepSeek V4.1 Flash：更强、更快、更普惠",
      short: "更小尺寸的 V4.1 Flash，原生多模态视觉理解，速度更快、成本更低。",
      date: "2026/09/10",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news260910/" }
    },
    {
      id: "v4-1-flash-1017",
      category: "产品",
      catClass: "product",
      title: "DeepSeek V4.1 Flash 新版本：许愿式编程一键成真",
      short: "V4.1-Flash-1017 更新，面向真实编码与产品工作流的又一次能力升级。",
      date: "2026/10/17",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news261017/" }
    },
    {
      id: "v4-pro",
      category: "模型",
      catClass: "model",
      title: "DeepSeek-V4-Pro 正式版上线",
      short: "V4 系列正式版发布，Agentic Coding 与复杂任务能力进一步增强。",
      date: "2026/08/13",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news260813/" }
    },
    {
      id: "v4-flash-vision",
      category: "模型",
      catClass: "model",
      title: "DeepSeek-V4-Flash-Vision-Exp 上线",
      short: "面向视觉理解场景的 Flash 实验版本，原生多模态能力继续扩展。",
      date: "2026/08/21",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news260821/" }
    },
    {
      id: "v3-2",
      category: "开源",
      catClass: "oss",
      title: "DeepSeek-V3.2 正式版：强化 Agent 能力，融入思考推理",
      short: "在 V3.2-Exp 基础上继续打磨，强化 Agent 场景与思考推理能力。",
      date: "2025/12/01",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news251201/" }
    },
    {
      id: "r1-release",
      category: "开源",
      catClass: "oss",
      title: "DeepSeek-R1 发布：用强化学习激发推理能力",
      short: "DeepSeek 第一代推理模型正式开源，展示强化学习驱动推理的完整路径。",
      date: "2025/01/20",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news250120/" }
    },
    {
      id: "v3-release",
      category: "开源",
      catClass: "oss",
      title: "DeepSeek-V3 发布：更强的通用大模型",
      short: "DeepSeek-V3 正式发布并开源，以更高效的训练和推理架构刷新性能表现。",
      date: "2024/12/26",
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com/zh-cn/news/news1226/" }
    }
  ];

  var KEYWORDS = ["推理模型", "Agent", "长上下文", "开源复现", "端侧", "Game Jam", "二创", "Prompt 工作流"];

  /* ------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------ */

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function loadSaved() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(SAVED_KEY) || "[]");
      return new Set(Array.isArray(raw) ? raw : []);
    } catch (error) {
      return new Set();
    }
  }

  function persistSaved() {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(savedSignals)));
    } catch (error) {}
  }

  function getBest(id) {
    try {
      var value = parseInt(window.localStorage.getItem(BEST_PREFIX + id), 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function setBest(id, score) {
    try {
      window.localStorage.setItem(BEST_PREFIX + id, String(score));
    } catch (error) {}
  }

  function padScore(score) {
    return String(score || 0).padStart(3, "0");
  }

  function formatClock(date) {
    return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
  }

  function showToast(message) {
    var toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3000);
  }

  function syncBodyLock() {
    var locked = !gameOverlay.hidden || !detailOverlay.hidden || !commandLayer.hidden ||
      !mobileMenu.hidden || !noticeOverlay.hidden;
    body.classList.toggle("is-locked", locked);
  }

  function trackEvent(name, data) {
    if (window.ArcadeAnalytics && typeof window.ArcadeAnalytics.track === "function") {
      window.ArcadeAnalytics.track(name, data);
    }
  }

  function openNotice() {
    if (!noticeOverlay || !noticeOverlay.hidden) return;
    window.clearTimeout(noticeTimer);
    closeMenu(true);
    closeCommand(true, false);
    noticeLastFocused = getReturnFocus("[data-notice-open]");
    noticeOverlay.hidden = false;
    syncBodyLock();
    trackEvent("notice_open");
    var dialog = noticeOverlay.querySelector(".notice-dialog");
    requestAnimationFrame(function () {
      noticeOverlay.classList.add("is-open");
      if (dialog) dialog.focus();
    });
  }

  function closeNotice() {
    if (!noticeOverlay || noticeOverlay.hidden) return;
    noticeOverlay.classList.remove("is-open");
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(function () {
      noticeOverlay.hidden = true;
      syncBodyLock();
      if (noticeLastFocused && noticeLastFocused.focus && document.contains(noticeLastFocused)) {
        noticeLastFocused.focus();
      }
    }, 220);
  }

  function dismissNotice() {
    if (!noticeBar) return;
    noticeBar.hidden = true;
    trackEvent("notice_dismiss");
    try {
      window.localStorage.setItem("ds-arcade-notice-dismissed", "1");
    } catch (error) {}
  }

  function getReturnFocus(fallbackSelector) {
    var active = document.activeElement;
    var valid = active && active !== body && document.contains(active) &&
      !active.closest("[hidden]") &&
      !(commandLayer && commandLayer.contains(active)) &&
      !(mobileMenu && mobileMenu.contains(active));
    if (valid) return active;
    return document.querySelector(fallbackSelector) ||
      document.querySelector(".command-trigger") ||
      document.querySelector("[data-command-open]") ||
      body;
  }

  function trapFocus(event, container) {
    if (event.key !== "Tab" || !container) return;
    var focusables = Array.prototype.slice.call(
      container.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (element) {
      return element.offsetParent !== null || element === document.activeElement;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function updateSavedCount() {
    document.querySelectorAll("[data-saved-count]").forEach(function (element) {
      element.textContent = String(savedSignals.size);
    });
  }

  function bookmarkMarkup(saved, id, extraClass) {
    return (
      '<button type="button" class="' + extraClass + (saved ? " is-saved" : "") +
      '" data-save-hot="' + escapeHtml(id) + '" aria-pressed="' + (saved ? "true" : "false") +
      '" aria-label="' + (saved ? "取消关注这条信号" : "关注这条信号") + '" title="' +
      (saved ? "取消关注" : "关注") + '">' +
      (saved ? bookmarkFillIcon : bookmarkIcon) +
      "</button>"
    );
  }

  /* ------------------------------------------------------------------
     Game cards
     ------------------------------------------------------------------ */

  function renderGames() {
    gamesGrid.innerHTML =
      '<div class="live-grid">' +
      GAMES.map(function (game, index) {
        var live = game.status === "live";
        var best = live ? getBest(game.id) : 0;
        var cta = live
          ? '<span class="game-tile__cta">开始游戏 <i>' + playIcon + "</i></span>"
          : '<span class="game-tile__cta game-tile__cta--soon">即将上线</span>';

        return (
          '<article class="game-tile" data-game="' + game.id + '" style="--i:' + index + '">' +
          '<a class="game-tile__button" href="#game-' + game.id + '" role="button" data-open-game="' + game.id +
          '" aria-label="' + (live ? "开始游戏：" : "即将上线：") + escapeHtml(game.title) + '">' +
          '<div class="tile-art tile-art--' + game.artClass + '">' + gameArt(game.id) + "</div>" +
          '<div class="game-tile__body">' +
          '<h3>' + escapeHtml(game.title) + "</h3>" +
          '<p class="game-tile__desc">' + escapeHtml(game.description) + "</p>" +
          '<div class="game-tile__meta">' +
          '<span class="game-tile__best" data-best="' + game.id + '"' + (best ? "" : " hidden") + ">" +
          (best ? "最高 " + padScore(best) : "") + "</span>" +
          cta + "</div></div></a></article>"
        );
      }).join("") +
      "</div>";

    refreshBestDisplays();
    updateGameCounts();
    setupCardTilt();
  }

  function setupCardTilt() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gamesGrid.querySelectorAll(".game-tile").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--ry", (x * 5).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-y * 4).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", function () {
        card.style.removeProperty("--rx");
        card.style.removeProperty("--ry");
      });
    });
  }

  function updateGameCounts() {
    var live = GAMES.filter(function (game) { return game.status === "live"; }).length;
    var soon = GAMES.length - live;
    document.querySelectorAll("[data-total-count]").forEach(function (element) {
      element.textContent = String(GAMES.length).padStart(2, "0");
    });
    document.querySelectorAll("[data-live-count]").forEach(function (element) {
      element.textContent = String(live).padStart(2, "0");
    });
    document.querySelectorAll("[data-soon-count]").forEach(function (element) {
      element.textContent = String(soon).padStart(2, "0");
    });
  }

  function refreshBestDisplays() {
    document.querySelectorAll("[data-best]").forEach(function (element) {
      var id = element.getAttribute("data-best");
      if (id === "fish") {
        element.hidden = true;
        element.textContent = "";
        return;
      }
      var best = getBest(id);
      element.hidden = !best;
      element.textContent = best ? "最高 " + padScore(best) : "";
    });
    var gameBest = document.getElementById("gameBest");
    if (gameBest && activeGameId) {
      gameBest.textContent = padScore(getBest(activeGameId));
    }
  }

  /* ------------------------------------------------------------------
     Ticker & signals
     ------------------------------------------------------------------ */

  function renderWire() {
    var track = document.getElementById("wireTrack");
    if (!track) return;
    var items = HOT_ITEMS.slice(0, 7).map(function (item) {
      return '<span class="wire-item"><b>' + escapeHtml(item.title) + "</b><span>" +
        escapeHtml(item.category) + " · " + escapeHtml(item.heat) + "</span></span>";
    }).join("");
    track.innerHTML = items + items;
    track.setAttribute("aria-label", "深海快讯：" + HOT_ITEMS.slice(0, 7).map(function (item) {
      return item.title;
    }).join("；"));
  }

  function orderedHotItems() {
    var items = HOT_ITEMS.slice();
    if (!items.length) return items;
    var offset = ((hotOffset % items.length) + items.length) % items.length;
    return items.slice(offset).concat(items.slice(0, offset));
  }

  function itemsForFilter() {
    var items = orderedHotItems();
    if (hotFilter === "saved") {
      return items.filter(function (item) { return savedSignals.has(item.id); });
    }
    if (hotFilter === "all") return items;
    return items.filter(function (item) { return item.category === hotFilter; });
  }

  function renderHot() {
    var items = itemsForFilter();
    var feature = items[0];
    var rest = items.slice(1, 6);
    var featureBox = document.getElementById("hotFeature");
    var listBox = document.getElementById("trendList");

    document.querySelectorAll("[data-hot-filter]").forEach(function (button) {
      var active = button.getAttribute("data-hot-filter") === hotFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (!feature) {
      featureBox.innerHTML =
        '<div class="sonar-empty"><h3>暂无内容</h3>' +
        "<p>换一个分类看看。</p>" +
        '<button type="button" class="sonar-empty__button" data-hot-reset>查看全部</button></div>';
      listBox.innerHTML = "";
      return;
    }

    featureBox.innerHTML =
      '<a class="hot-feature__card article-link" href="' + escapeHtml(feature.source.url) +
      '" target="_blank" rel="noopener noreferrer" data-article="' + escapeHtml(feature.id) + '">' +
      '<div class="hot-feature__top">' +
      '<span class="hot-feature__cat">' + escapeHtml(feature.category) + "</span>" +
      '<span class="article-date">' + escapeHtml(feature.date) + "</span>" +
      "</div>" +
      '<div class="hot-feature__body">' +
      "<h3>" + escapeHtml(feature.title) + "</h3>" +
      "<p>" + escapeHtml(feature.short) + "</p>" +
      '<span class="hot-feature__action">阅读原文 <svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-arrow-up-right"/></svg></span>' +
      "</div>" +
      '<div class="article-source">' + escapeHtml(feature.source.label) + "</div></a>";

    if (!rest.length) {
      listBox.innerHTML = '<li class="trend-empty">暂无更多文章</li>';
    } else {
      listBox.innerHTML = rest.map(function (item, index) {
        return (
          '<li class="trend-item">' +
          '<a class="trend-button article-link" href="' + escapeHtml(item.source.url) +
          '" target="_blank" rel="noopener noreferrer" data-article="' + escapeHtml(item.id) + '">' +
          '<span class="trend-rank">' + String(index + 2) + "</span>" +
          '<span class="trend-main"><span class="trend-title">' + escapeHtml(item.title) + "</span>" +
          '<span class="trend-meta">' + escapeHtml(item.source.label) + " · " + escapeHtml(item.date) + "</span></span>" +
          '<span class="trend-ext" aria-hidden="true">↗</span>' +
          "</a></li>"
        );
      }).join("");
    }
  }

  function toggleSaved(id) {
    if (!id || !HOT_ITEMS.some(function (item) { return item.id === id; })) return;
    if (savedSignals.has(id)) {
      savedSignals.delete(id);
      showToast("已取消关注这条信号。");
    } else {
      savedSignals.add(id);
      showToast("已关注。下次可以从「关注」分类里找到它。");
    }
    persistSaved();
    updateSavedCount();
    if (window.ArcadeAudio) window.ArcadeAudio.click();
    if (hotFilter === "saved") {
      renderHot();
    } else {
      syncSavedUi();
    }
  }

  function syncSavedUi() {
    document.querySelectorAll("[data-save-hot]").forEach(function (button) {
      var id = button.getAttribute("data-save-hot");
      var saved = savedSignals.has(id);
      button.classList.toggle("is-saved", saved);
      button.setAttribute("aria-pressed", saved ? "true" : "false");
      var icon = saved ? bookmarkFillIcon : bookmarkIcon;
      if (button.classList.contains("save-button") || button.classList.contains("trend-save") || button.classList.contains("detail-save")) {
        button.innerHTML = icon;
      }
      var label = saved ? "取消关注这条信号" : "关注这条信号";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", saved ? "取消关注" : "关注");
    });
  }

  /* ------------------------------------------------------------------
     Signal detail
     ------------------------------------------------------------------ */

  function openHotDetail(id) {
    var item = HOT_ITEMS.find(function (candidate) {
      return candidate.id === id;
    });
    if (!item) return;

    closeMenu(true);
    closeCommand(true);
    lastFocused = getReturnFocus('[data-hot-detail="' + id + '"]');
    currentSignalId = id;
    var top = document.getElementById("detailTop");
    var content = document.getElementById("detailContent");
    var dialog = detailOverlay.querySelector(".detail-dialog");

    top.className = "detail-top detail-top--" + item.catClass;
    top.innerHTML =
      '<span class="detail-category">' + escapeHtml(item.category) + " · " + escapeHtml(item.published) + "</span>" +
      '<h2 id="detailTitle">' + escapeHtml(item.title) + "</h2>" +
      '<div class="detail-save-wrap">' + bookmarkMarkup(savedSignals.has(item.id), item.id, "detail-save") + "</div>";

    content.innerHTML =
      item.body.split("\n\n").map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph) + "</p>";
      }).join("") +
      '<div class="detail-section"><h3>可以这样聊</h3><ul class="detail-prompts">' +
      item.prompts.map(function (prompt, index) {
        return "<li><span>0" + (index + 1) + "</span>" + escapeHtml(prompt) + "</li>";
      }).join("") +
      "</ul></div>" +
      '<div class="detail-section"><h3>相关信号</h3><div class="detail-tags">' +
      item.tags.map(function (tag) {
        return "<span>#" + escapeHtml(tag) + "</span>";
      }).join("") +
      "</div></div>" +
      '<div class="detail-source"><p>编辑精选内容，非实时新闻，也不代表 DeepSeek 官方观点。</p>' +
      '<a href="' + item.source.url + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(item.source.label) +
      ' <svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-arrow-up-right"/></svg></a></div>';

    detailOverlay.hidden = false;
    syncBodyLock();
    requestAnimationFrame(function () {
      detailOverlay.classList.add("is-open");
      dialog.focus();
      content.scrollTop = 0;
      updateDetailProgress();
    });

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#signal-" + encodeURIComponent(id));
    }
  }

  function closeHotDetail() {
    if (detailOverlay.hidden) return;
    detailOverlay.classList.remove("is-open");
    var dialog = detailOverlay.querySelector(".detail-dialog");
    var content = document.getElementById("detailContent");
    if (window.history && window.history.replaceState && window.location.hash.indexOf("#signal-") === 0) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    currentSignalId = null;
    window.setTimeout(function () {
      detailOverlay.hidden = true;
      syncBodyLock();
      if (dialog) dialog.style.removeProperty("--detail-progress");
      if (content) content.scrollTop = 0;
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }, 240);
  }

  function updateDetailProgress() {
    var content = document.getElementById("detailContent");
    var bar = document.querySelector("[data-detail-progress]");
    if (!content || !bar) return;
    var max = content.scrollHeight - content.clientHeight;
    var ratio = max > 30 ? Math.min(1, Math.max(0, content.scrollTop / max)) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + "%";
  }

  function copySignalLink() {
    var id = currentSignalId;
    if (!id) return;
    var url = window.location.origin + window.location.pathname + "#signal-" + encodeURIComponent(id);
    copyText(url)
      .then(function () {
        showToast("信号链接已复制，可以分享给同好。");
        if (window.ArcadeAudio) window.ArcadeAudio.land(true);
      })
      .catch(function () {
        showToast("浏览器没有允许自动复制，可以直接复制地址栏链接。");
      });
  }

  /* ------------------------------------------------------------------
     Game overlay lifecycle
     ------------------------------------------------------------------ */

  function updateGameChrome(game) {
    document.getElementById("gameTitle").textContent = game.title;
    document.getElementById("gameIndex").textContent = game.index;
    document.getElementById("gameControls").textContent = game.controls;
    document.getElementById("gameBest").textContent = padScore(getBest(game.id));
    var trialLink = document.querySelector("[data-fish-trial]");
    if (trialLink) trialLink.hidden = game.id !== "fish";
  }

  function openGame(id) {
    var game = GAMES.find(function (candidate) {
      return candidate.id === id;
    });
    if (!game) return;

    if (id === "jump") {
      trackEvent("jump_full_open");
      window.location.assign("jump-v2/");
      return;
    }

    if (id === "fish") {
      trackEvent("fish_full_open");
      window.location.assign("fat-fish/");
      return;
    }

    clearTimeout(menuTimer);
    closeMenu(true);
    closeCommand(true);
    lastFocused = getReturnFocus('[data-open-game="' + id + '"]');

    if (game.status !== "live") {
      showToast("「" + game.title + "」还在深海里孵化，先玩点已经上岸的吧。");
      if (window.ArcadeAudio) window.ArcadeAudio.click();
      return;
    }

    var gameModule = window.DeepSeekGames && window.DeepSeekGames[id];
    if (!gameModule || typeof gameModule.mount !== "function") {
      showToast("「" + game.title + "」的游戏文件尚未接入，请检查 assets/games/" + id + ".js。");
      return;
    }

    if (window.ArcadeAudio) {
      window.ArcadeAudio.unlock();
      window.ArcadeAudio.click();
    }

    activeGameId = id;
    gameStartedAt = Date.now();
    updateGameChrome(game);
    trackEvent("game_open", { game: id });
    document.getElementById("gameBody").innerHTML = "";
    gameDialog.className = "game-dialog game-dialog--" + id;
    gameOverlay.hidden = false;
    syncBodyLock();
    window.clearTimeout(closeTimer);

    requestAnimationFrame(function () {
      gameOverlay.classList.add("is-open");
      gameDialog.focus();
    });

    activeGame = gameModule.mount(document.getElementById("gameBody"), {
      best: getBest(id),
      audio: window.ArcadeAudio,
      onExit: closeGame,
      onGameEnd: function (score) {
        trackEvent("game_end", {
          game: id,
          score: Number(score) || 0,
          duration: gameStartedAt ? Math.round((Date.now() - gameStartedAt) / 1000) : 0
        });
        var previousBest = getBest(id);
        var nextBest = Math.max(previousBest, score);
        if (score > previousBest) setBest(id, score);
        refreshBestDisplays();
        var headerBest = document.getElementById("gameBest");
        if (headerBest) headerBest.textContent = padScore(nextBest);
        return {
          best: nextBest,
          isRecord: score > previousBest && score > 0
        };
      }
    });
  }

  function closeGame() {
    if (gameOverlay.hidden) return;
    gameOverlay.classList.remove("is-open");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
    syncGameFullscreen(false);
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      gameOverlay.hidden = true;
      if (activeGame && typeof activeGame.destroy === "function") {
        activeGame.destroy();
      }
      activeGame = null;
      activeGameId = null;
      document.getElementById("gameBody").innerHTML = "";
      syncBodyLock();
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }, 260);
  }

  function syncGameFullscreen(active) {
    var button = document.querySelector("[data-game-full]");
    if (!button) return;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.setAttribute("aria-label", active ? "退出全屏" : "全屏游戏");
  }

  function toggleGameFullscreen() {
    if (!gameDialog) return;
    if (!document.fullscreenElement) {
      if (gameDialog.requestFullscreen) {
        gameDialog.requestFullscreen().then(function () {
          syncGameFullscreen(true);
        }).catch(function () {
          showToast("当前浏览器不支持游戏全屏。");
        });
      } else {
        showToast("当前浏览器不支持游戏全屏。");
      }
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  /* ------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------ */

  function openMenu() {
    if (!mobileMenu.hidden) return;
    clearTimeout(menuTimer);
    closeCommand(true);
    lastFocused = getReturnFocus("[data-menu-open]");
    mobileMenu.hidden = false;
    syncBodyLock();
    requestAnimationFrame(function () {
      mobileMenu.classList.add("is-open");
      var drawer = mobileMenu.querySelector(".drawer");
      if (drawer) drawer.focus();
    });
    var toggle = document.querySelector("[data-menu-open]");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu(immediate) {
    if (mobileMenu.hidden) return;
    clearTimeout(menuTimer);
    mobileMenu.classList.remove("is-open");
    var toggle = document.querySelector("[data-menu-open]");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (immediate) {
      mobileMenu.hidden = true;
      syncBodyLock();
    } else {
      menuTimer = window.setTimeout(function () {
        mobileMenu.hidden = true;
        syncBodyLock();
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }, 300);
    }
  }

  /* ------------------------------------------------------------------
     Command palette
     ------------------------------------------------------------------ */

  function buildCommands() {
    var commands = [];

    GAMES.forEach(function (game, index) {
      commands.push({
        id: "game-" + game.id + "-" + index,
        group: "游戏",
        title: game.title,
        subtitle: game.status === "live" ? "可游玩 · " + game.tag : "建造中 · " + game.tag,
        meta: game.status === "live" ? "PLAY" : "SOON",
        icon: game.index,
        search: game.title + " " + game.description + " " + game.tag + " 游戏",
        action: function () { openGame(game.id); }
      });
    });

    HOT_ITEMS.forEach(function (item, index) {
      commands.push({
        id: "article-" + item.id + "-" + index,
        group: "文章",
        title: item.title,
        subtitle: item.source.label + " · " + item.date,
        meta: "原文",
        icon: "↗",
        search: item.title + " " + item.short + " " + item.category + " 文章 新闻",
        action: function () {
          window.open(item.source.url, "_blank", "noopener,noreferrer");
        }
      });
    });

    commands.push(
      {
        id: "action-random",
        group: "操作",
        title: "随机开一局",
        subtitle: "让深海替你做决定",
        meta: "ACTION",
        icon: "↯",
        search: "随机 手气 游戏 random",
        action: randomGame
      },
      {
        id: "action-sound",
        group: "操作",
        title: window.ArcadeAudio && window.ArcadeAudio.isEnabled() ? "关闭音效" : "开启音效",
        subtitle: "声音只在这台设备上播放",
        meta: "ACTION",
        icon: "♪",
        search: "音效 声音 静音 sound mute",
        action: function () {
          if (window.ArcadeAudio) {
            window.ArcadeAudio.setEnabled(!window.ArcadeAudio.isEnabled());
            syncSoundButtons();
          }
        }
      }
    );

    return commands;
  }

  function scoreCommand(command, query) {
    if (!query || !query.trim()) return 1;
    var haystack = command.search.toLowerCase();
    var needle = query.toLowerCase().trim();
    if (command.title.toLowerCase().indexOf(needle) !== -1) return 100;
    if (command.group.toLowerCase().indexOf(needle) !== -1) return 40;
    if (haystack.indexOf(needle) !== -1) return 20;
    var characters = needle.split("");
    var pointer = 0;
    var hits = 0;
    for (var i = 0; i < haystack.length && pointer < characters.length; i += 1) {
      if (haystack[i] === characters[pointer]) {
        pointer += 1;
        hits += 1;
      }
    }
    return pointer === characters.length ? 8 + hits : 0;
  }

  function renderCommandResults(query) {
    commandQuery = query || "";
    var resultsBox = document.getElementById("commandResults");
    if (!resultsBox) return;
    commandCommands = buildCommands()
      .map(function (command) {
        return { command: command, score: scoreCommand(command, commandQuery) };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (entry) { return entry.command; });

    if (!commandCommands.length) {
      resultsBox.innerHTML = '<p class="command-empty">没有找到匹配项。试试「跳一跳」「推理」或者「随机」。</p>';
      commandIndex = -1;
      return;
    }

    commandIndex = 0;
    var groups = {};
    var order = [];
    commandCommands.forEach(function (command) {
      if (!groups[command.group]) {
        groups[command.group] = [];
        order.push(command.group);
      }
      groups[command.group].push(command);
    });

    var flatIndex = 0;
    resultsBox.innerHTML = order.map(function (group) {
      return (
        '<div class="command-group"><div class="command-group__label">' + escapeHtml(group) + "</div>" +
        groups[group].map(function (command) {
          var index = flatIndex;
          flatIndex += 1;
          return (
            '<button type="button" class="command-item" role="option" data-command-index="' + index +
            '" aria-selected="' + (index === 0 ? "true" : "false") + '">' +
            '<span class="command-item__icon">' + escapeHtml(command.icon) + "</span>" +
            '<span class="command-item__body"><b>' + escapeHtml(command.title) + "</b><small>" +
            escapeHtml(command.subtitle) + "</small></span>" +
            '<span class="command-item__meta">' + escapeHtml(command.meta) + "</span></button>"
          );
        }).join("") + "</div>"
      );
    }).join("");
    document.querySelectorAll(".command-item").forEach(function (item, index) {
      item.classList.toggle("is-active", index === 0);
    });
  }

  function setCommandIndex(nextIndex) {
    if (!commandCommands.length) return;
    commandIndex = (nextIndex + commandCommands.length) % commandCommands.length;
    var items = document.querySelectorAll(".command-item");
    items.forEach(function (item, index) {
      var active = index === commandIndex;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
      if (active) item.scrollIntoView({ block: "nearest" });
    });
  }

  function runCommandIndex(index) {
    var command = commandCommands[index];
    if (!command) return;
    closeCommand(true, true);
    window.setTimeout(function () {
      command.action();
    }, 10);
  }

  function openCommand(initialQuery) {
    closeMenu(true);
    trackEvent("search_open");
    window.clearTimeout(commandTimer);
    var opener = getReturnFocus("[data-command-open]");
    lastFocused = opener;
    commandReturnFocus = opener;
    commandLayer.hidden = false;
    syncBodyLock();
    var input = document.getElementById("commandInput");
    if (input) input.value = initialQuery || "";
    renderCommandResults(initialQuery || "");
    requestAnimationFrame(function () {
      commandLayer.classList.add("is-open");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  function closeCommand(immediate, restoreFocus) {
    if (!commandLayer || commandLayer.hidden) return;
    window.clearTimeout(commandTimer);
    commandLayer.classList.remove("is-open");
    var input = document.getElementById("commandInput");
    if (input) input.value = "";
    var target = commandReturnFocus;

    function finish() {
      commandLayer.hidden = true;
      syncBodyLock();
      if (restoreFocus !== false && target && target.focus && document.contains(target)) {
        target.focus();
      }
    }

    if (immediate) {
      finish();
    } else {
      commandTimer = window.setTimeout(finish, 200);
    }
  }

  function scrollToSection(selector) {
    var target = document.querySelector(selector);
    if (!target) return;
    closeCommand();
    closeMenu(true);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ------------------------------------------------------------------
     Random game, clipboard & sound
     ------------------------------------------------------------------ */

  function randomGame() {
    var lives = GAMES.filter(function (game) { return game.status === "live"; });
    if (!lives.length) return;
    var pool = lives.filter(function (game) { return game.id !== activeGameId; });
    var choice = pool[Math.floor(Math.random() * pool.length)] || lives[0];
    closeCommand();
    closeMenu(true);
    if (window.ArcadeAudio) window.ArcadeAudio.click();
    openGame(choice.id);
  }

  function getBrief() {
    return [
      "DeepSeek 深海游乐场 · 游戏接入清单",
      "",
      "1. 游戏代码放进 assets/games/ 目录，建议命名 assets/games/<game-id>.js。",
      "2. 注册 window.DeepSeekGames['<game-id>'] = { mount(root, options) }。",
      "3. mount 返回 { destroy, restart }；destroy 时清理 RAF、定时器和事件监听。",
      "4. 通过 options.onGameEnd(score) 上报分数；站点负责最高分与本地存储。",
      "5. 游戏需同时支持鼠标、触屏和键盘，并适配窄屏。",
      "6. 在 js/site.js 的 GAMES 中加入卡片信息，将 status 改为 live。",
      "7. 保持轻量、免登录、即开即玩。",
      "",
      "详细说明见项目 README.md。"
    ].join("\n");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  function copyBrief() {
    copyText(getBrief())
      .then(function () {
        showToast("接入清单已复制，可以贴到团队协作工具里。");
        if (window.ArcadeAudio) window.ArcadeAudio.land(true);
      })
      .catch(function () {
        showToast("浏览器没有允许自动复制，请查看项目 README.md 中的接入说明。");
      });
  }

  function syncSoundButtons() {
    var enabled = window.ArcadeAudio ? window.ArcadeAudio.isEnabled() : true;
    document.querySelectorAll(".sound-toggle").forEach(function (button) {
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.setAttribute("aria-label", enabled ? "关闭音效" : "开启音效");
      var label = button.querySelector("[data-sound-label]");
      if (label) label.textContent = enabled ? "开启" : "关闭";
    });
  }

  function syncShortcutLabels() {
    var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
    if (!isMac) return;
    document.querySelectorAll(".command-trigger kbd, .drawer-command kbd, .footer-links kbd").forEach(function (element) {
      element.textContent = "⌘ K";
    });
    var trigger = document.querySelector(".command-trigger");
    if (trigger) trigger.setAttribute("aria-label", "搜索游戏和热点，快捷键 Command K");
  }

  /* ------------------------------------------------------------------
     Event wiring
     ------------------------------------------------------------------ */

  document.addEventListener("click", function (event) {
    var target = event.target;

    var articleLink = target.closest(".article-link");
    if (articleLink) {
      trackEvent("article_click", { article: articleLink.getAttribute("data-article") || "" });
    }

    var trialLink = target.closest("[data-fish-trial]");
    if (trialLink) {
      trackEvent("fish_trial_open");
    }

    if (target.closest("[data-notice-open]")) {
      event.preventDefault();
      openNotice();
      return;
    }

    if (target.closest("[data-notice-dismiss]")) {
      dismissNotice();
      return;
    }

    if (target.closest("[data-notice-close]")) {
      closeNotice();
      return;
    }

    var saveButton = target.closest("[data-save-hot]");
    if (saveButton) {
      event.preventDefault();
      toggleSaved(saveButton.getAttribute("data-save-hot"));
      return;
    }

    var openGameTrigger = target.closest("[data-open-game]");
    if (openGameTrigger) {
      event.preventDefault();
      openGame(openGameTrigger.getAttribute("data-open-game"));
      return;
    }

    var menuOpenTrigger = target.closest("[data-menu-open]");
    if (menuOpenTrigger) {
      openMenu();
      return;
    }

    var menuCloseTrigger = target.closest("[data-menu-close]");
    if (menuCloseTrigger) {
      closeMenu();
      return;
    }

    var menuLink = target.closest("[data-menu-link]");
    if (menuLink) {
      closeMenu(true);
      return;
    }

    var commandOpenTrigger = target.closest("[data-command-open]");
    if (commandOpenTrigger) {
      openCommand();
      return;
    }

    var commandCloseTrigger = target.closest("[data-command-close]");
    if (commandCloseTrigger) {
      closeCommand();
      return;
    }

    var commandItem = target.closest("[data-command-index]");
    if (commandItem) {
      runCommandIndex(parseInt(commandItem.getAttribute("data-command-index"), 10));
      return;
    }

    var randomTrigger = target.closest("[data-random-game]");
    if (randomTrigger) {
      randomGame();
      return;
    }

    var hotReset = target.closest("[data-hot-reset]");
    if (hotReset) {
      hotFilter = "all";
      renderHot();
      return;
    }

    var keyword = target.closest("[data-keyword]");
    if (keyword) {
      openCommand(keyword.getAttribute("data-keyword"));
      return;
    }

    var hotFilterButton = target.closest("[data-hot-filter]");
    if (hotFilterButton) {
      hotFilter = hotFilterButton.getAttribute("data-hot-filter");
      hotOffset = 0;
      renderHot();
      if (window.ArcadeAudio) window.ArcadeAudio.click();
      return;
    }

    if (target.closest("[data-refresh-hot]")) {
      hotOffset += 1;
      renderHot();
      showToast("声呐已重新扫描，换来一组社区信号。");
      if (window.ArcadeAudio) window.ArcadeAudio.click();
      return;
    }

    if (target.closest("[data-detail-close]")) {
      closeHotDetail();
      return;
    }

    if (target.closest("[data-copy-signal]")) {
      copySignalLink();
      return;
    }

    if (target.closest("[data-copy-brief]")) {
      copyBrief();
      return;
    }

    if (target.closest("[data-game-close]")) {
      closeGame();
      return;
    }

    if (target.closest("[data-game-reset]")) {
      if (activeGame && typeof activeGame.restart === "function") {
        activeGame.restart();
        if (window.ArcadeAudio) window.ArcadeAudio.click();
      }
      return;
    }

    if (target.closest("[data-game-full]")) {
      toggleGameFullscreen();
      return;
    }

    if (target.closest(".sound-toggle")) {
      if (window.ArcadeAudio) {
        window.ArcadeAudio.setEnabled(!window.ArcadeAudio.isEnabled());
        syncSoundButtons();
      }
      return;
    }
  });

  gameOverlay.addEventListener("click", function (event) {
    if (event.target === gameOverlay) closeGame();
  });

  noticeOverlay.addEventListener("click", function (event) {
    if (event.target === noticeOverlay) closeNotice();
  });

  detailOverlay.addEventListener("click", function (event) {
    if (event.target === detailOverlay) closeHotDetail();
  });

  commandLayer.addEventListener("click", function (event) {
    if (event.target === commandLayer) closeCommand();
  });

  var commandInput = document.getElementById("commandInput");
  if (commandInput) {
    commandInput.addEventListener("input", function () {
      renderCommandResults(commandInput.value);
    });
  }

  document.querySelector("[data-detail-scroll]").addEventListener("scroll", updateDetailProgress, { passive: true });

  document.addEventListener("keydown", function (event) {
    if (!noticeOverlay.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNotice();
      } else {
        trapFocus(event, noticeOverlay.querySelector(".notice-dialog"));
      }
      return;
    }

    if (!commandLayer.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCommand();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandIndex(commandIndex + 1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandIndex(commandIndex - 1);
        return;
      }
      if (event.key === "Enter" && document.activeElement === commandInput) {
        event.preventDefault();
        runCommandIndex(commandIndex);
        return;
      }
      trapFocus(event, commandLayer.querySelector(".command-panel"));
      return;
    }

    if (!detailOverlay.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHotDetail();
      } else {
        trapFocus(event, detailOverlay.querySelector(".detail-dialog"));
      }
      return;
    }

    if (!gameOverlay.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGame();
      } else {
        trapFocus(event, gameOverlay.querySelector(".game-dialog"));
      }
      return;
    }

    if (!mobileMenu.hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      } else {
        trapFocus(event, mobileMenu.querySelector(".drawer"));
      }
      return;
    }

    var activeElement = document.activeElement || document.body;
    var tagName = activeElement.tagName;
    var typing = tagName === "INPUT" || tagName === "TEXTAREA" || activeElement.isContentEditable;
    if (typing) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommand();
      return;
    }

    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      openCommand();
      return;
    }

    if (event.key === " " && activeElement.matches && activeElement.matches("a[data-open-game]")) {
      event.preventDefault();
      activeElement.click();
      return;
    }

    if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      randomGame();
    }
  });

  document.addEventListener("fullscreenchange", function () {
    syncGameFullscreen(Boolean(document.fullscreenElement));
  });

  var stage = document.querySelector("[data-hero-stage]");
  if (stage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stage.addEventListener("pointermove", function (event) {
      var rect = stage.getBoundingClientRect();
      var mx = (event.clientX - rect.left) / rect.width - 0.5;
      var my = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--mx", mx.toFixed(3));
      stage.style.setProperty("--my", my.toFixed(3));
    });
    stage.addEventListener("pointerleave", function () {
      stage.style.setProperty("--mx", "0");
      stage.style.setProperty("--my", "0");
    });
  }

  function setClock() {
    var value = formatClock(new Date());
    document.querySelectorAll("[data-clock]").forEach(function (element) {
      element.textContent = value;
    });
    document.querySelectorAll("[data-sonar-time]").forEach(function (element) {
      element.textContent = value;
    });
  }

  /* nav active state */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var sections = ["games", "sonar", "studio"].map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);

  if ("IntersectionObserver" in window && navLinks.length && document.documentElement.scrollHeight > window.innerHeight + 4) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("data-nav") === entry.target.id);
        });
      });
    }, { rootMargin: "-32% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (section) { navObserver.observe(section); });
  }

  document.querySelectorAll(".main-nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.forEach(function (item) { item.classList.remove("is-active"); });
      link.classList.add("is-active");
    });
  });

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */

  try {
    if (window.localStorage.getItem("ds-arcade-notice-dismissed") === "1" && noticeBar) {
      noticeBar.hidden = true;
    }
  } catch (error) {}

  renderGames();
  renderWire();
  renderHot();
  updateSavedCount();
  syncSoundButtons();
  syncShortcutLabels();
  setClock();
  window.setInterval(setClock, 15000);
})();
