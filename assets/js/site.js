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
  var gamesGrid = document.getElementById("gamesGrid");
  var body = document.body;
  var gameDialog = gameOverlay ? gameOverlay.querySelector(".game-dialog") : null;
  var activeGame = null;
  var activeGameId = null;
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
      description: "按住蓄力，踩着浮岛向深处跳。",
      artClass: "jump"
    },
    {
      id: "fish",
      index: "02",
      title: "合成大肥鱼",
      tag: "MERGE & GROW",
      status: "live",
      controls: "移动光标选择位置 · 点击或空格投放",
      description: "相同的小鱼合体，养出更大的鱼。",
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
      status: "soon",
      description: "一句接一句，和鲸鱼一起把脑洞滚成雪球。接得住，还要接得妙。",
      artClass: "prompt"
    },
    {
      id: "radar",
      index: "05",
      title: "深海寻鲸",
      tag: "FIND THE WHALE",
      status: "soon",
      description: "根据微弱的声呐信号，在噪声海域里找到那条鲸。耐心比运气更重要。",
      artClass: "radar"
    },
    {
      id: "hunter",
      index: "06",
      title: "幻觉猎手",
      tag: "SPOT THE GHOST",
      status: "soon",
      description: "识别一本正经的胡话，在错误蔓延之前按下捕获。保持怀疑，也保持好奇。",
      artClass: "hunter"
    },
    {
      id: "puzzle",
      index: "07",
      title: "鲸落拼图",
      tag: "PIECE BY PIECE",
      status: "soon",
      description: "把散落的鲸鱼插画拼回完整，让灵感重新浮上海面。每一块都藏着线索。",
      artClass: "puzzle"
    },
    {
      id: "maze",
      index: "08",
      title: "R1 迷宫",
      tag: "THINK AHEAD",
      status: "soon",
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
      id: "reasoning-wait",
      category: "模型",
      catClass: "model",
      title: "推理模型之后，产品经理开始重新定义「等待」",
      short: "当模型学会思考，界面上的转圈就不再只是加载。等待被拆成了信任、节奏与可解释性。",
      body: "推理模型把「回答」变成了一段过程。过程越长，产品越需要回答一个原本不存在的问题：这段等待里，用户应该看到什么？\n\n有人把思维链折成进度节点，有人只给一个稳定的呼吸动画，也有人干脆把中间步骤变成可编辑的草稿。讨论的共识正在收敛：等待本身不是问题，失去控制感才是。",
      heat: "9.8k",
      delta: "+18%",
      published: "10/27 21:10",
      read: "5 MIN",
      prompts: [
        "你愿意为更准的答案多等几秒？这个上限会随场景变化吗？",
        "推理过程应该被展示、被折叠，还是完全隐藏？",
        "如果等待无法避免，什么样的界面反馈最让你安心？"
      ],
      tags: ["推理模型", "等待体验", "产品设计"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
    },
    {
      id: "open-fail-log",
      category: "开源",
      catClass: "oss",
      title: "开源复刻的下半场：把失败也写进日志",
      short: "权重、配方与工程细节之外，社区开始认真记录「哪条路走不通」，以及为什么。",
      body: "复刻一个模型，不只是把参数量对上。数据配比、训练稳定性、推理加速、评测方式，任何一个环节都可能变成瓶颈。最近的复刻笔记里，「失败」出现的频率明显变高。\n\n失败日志的价值在于边界：它告诉后来者哪些技巧无法迁移，哪些坑在特定规模才会出现。把过程写下来，本身就是开源最珍贵的部分。",
      heat: "8.6k",
      delta: "+12%",
      published: "10/27 20:42",
      read: "6 MIN",
      prompts: [
        "如果只能公开一样东西，你会选权重、数据，还是训练日志？",
        "复刻失败时，怎样判断是方法问题还是工程问题？",
        "对小团队来说，复现大模型最现实的切入点在哪里？"
      ],
      tags: ["开源", "复现", "失败日志"],
      source: { label: "DeepSeek GitHub", url: "https://github.com/deepseek-ai" }
    },
    {
      id: "long-context-daily",
      category: "产品",
      catClass: "product",
      title: "长上下文进入日常之后，谁真的用满了 1M Token？",
      short: "能装下不等于用得好。检索策略、注意力分配和成本结构，正在重写「上下文」的产品含义。",
      body: "上下文窗口越做越大，但真实产品里，塞满窗口通常不是最优解。更常见的选择是分层：把稳定信息放进缓存，把变化信息做检索，把关键指令放在最后。\n\n社区里的实践帖普遍提到同一件事：长上下文最贵的不是 token，而是注意力被无关内容稀释之后，模型开始抓错重点。",
      heat: "7.9k",
      delta: "+23%",
      published: "10/27 19:28",
      read: "4 MIN",
      prompts: [
        "你会把哪些内容放进长期上下文，哪些坚持按需检索？",
        "上下文变长之后，评测方式需要怎样改变？",
        "如果成本不是问题，你还会做检索吗？"
      ],
      tags: ["长上下文", "RAG", "成本"],
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com" }
    },
    {
      id: "gamejam-ai",
      category: "社区",
      catClass: "community",
      title: "一场 48 小时 Game Jam，AI 把原型时间砍半之后",
      short: "代码、美术和文案都能被搭把手，创作者的时间被重新分配到了试玩与删减上。",
      body: "Game Jam 最迷人的地方，是在极限时间里做一个「能玩」的东西。AI 加入后，原型变快了，但判断什么好玩仍然只能靠人。\n\n社区复盘里出现了一个共同变化：写代码的时间少了，试玩、删减和打磨的时间多了。工具改变了流程，没有替代品味。",
      heat: "7.4k",
      delta: "+15%",
      published: "10/27 18:50",
      read: "5 MIN",
      prompts: [
        "AI 最应该接手 Game Jam 里的哪个环节？",
        "当原型成本变低，游戏数量变多，好点子会更容易被发现吗？",
        "你会接受一个完全由 AI 生成美术的小游戏吗？"
      ],
      tags: ["Game Jam", "AI 协作", "游戏创作"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
    },
    {
      id: "small-model-return",
      category: "模型",
      catClass: "model",
      title: "小模型回潮：端侧推理的第二次机会",
      short: "当量化、蒸馏与专用芯片同时成熟，小模型不再只是「便宜替代品」。",
      body: "云端模型继续变大，端侧模型却在变小。两个方向并不矛盾：一个追求能力上限，一个追求随时可用、数据不出设备。\n\n社区里最务实的讨论不再是「小模型能不能替代大模型」，而是「哪些任务根本不需要请求云端」。输入法、相册整理、离线摘要，这些场景正在给出答案。",
      heat: "6.8k",
      delta: "+9%",
      published: "10/27 17:36",
      read: "4 MIN",
      prompts: [
        "你的设备上，哪一个 AI 功能最值得本地化？",
        "端侧模型的隐私优势，能抵消能力差距吗？",
        "小模型的产品形态，会和大模型一样吗？"
      ],
      tags: ["小模型", "端侧", "量化"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
    },
    {
      id: "kv-cache-path",
      category: "开源",
      catClass: "oss",
      title: "从手搓推理引擎到读懂 KV Cache：一条被重排的学习路线",
      short: "先跑通、再测量、最后解释。社区正在把「学 LLM」从纸面公式拉回可运行的代码。",
      body: "「从零手搓」的意义不在于重新发明轮子，而在于把黑盒拆开。写一个能跑起来的小推理引擎，会逼你真正理解注意力怎么占显存、采样参数如何改变输出、连续批处理为什么难。\n\n社区里的学习路线很多，但最靠谱的进度条永远是：能跑、能测、能解释。",
      heat: "5.7k",
      delta: "+14%",
      published: "10/27 16:20",
      read: "7 MIN",
      prompts: [
        "学推理引擎，应该先补数学还是先跑通代码？",
        "手搓一个 mini 引擎，最少需要实现哪些功能？",
        "有哪些性能优化，看论文能懂、自己写就写不出来？"
      ],
      tags: ["推理引擎", "KV Cache", "学习路线"],
      source: { label: "DeepSeek GitHub", url: "https://github.com/deepseek-ai" }
    },
    {
      id: "agent-last-mile",
      category: "产品",
      catClass: "product",
      title: "Agent 产品的最后一公里：权限、回滚与审计",
      short: "会调用工具只是开始。真正让 Agent 进入生产环境的，是一套可撤销的信任机制。",
      body: "让模型点下「发送」或「删除」之前，产品必须回答三个问题：它有哪些权限，做错了怎么撤回，谁来看记录。\n\n社区里越来越多的 Agent 复盘不再讨论提示词，而是讨论边界。人类确认节点放在哪里、失败之后如何恢复、操作日志怎样让普通人看懂，这些细节决定了 Agent 是玩具还是同事。",
      heat: "5.3k",
      delta: "+21%",
      published: "10/27 15:08",
      read: "6 MIN",
      prompts: [
        "哪些操作必须由人类确认，哪些可以交给 Agent？",
        "一个不可回滚的 Agent 功能，你会允许它上线吗？",
        "审计日志应该给谁看，看到什么粒度？"
      ],
      tags: ["Agent", "权限", "可回滚"],
      source: { label: "DeepSeek API Docs", url: "https://api-docs.deepseek.com" }
    },
    {
      id: "whale-meme",
      category: "社区",
      catClass: "community",
      title: "把鲸鱼做成表情包：社区二创的野生美学",
      short: "同一个标志，在不同人的屏幕里变成贴纸、角色、世界观和游戏。",
      body: "社区创作最有趣的地方，是它从不解释自己为什么可爱。有人把鲸鱼画成像素风，有人给它编了深海冒险的设定，还有人把它做成了游戏角色。\n\n二次创作让一个技术符号拥有了温度，也让更多人愿意从「玩」开始认识它。边界感仍然重要，但灵感往往就长在边界附近。",
      heat: "4.8k",
      delta: "+26%",
      published: "10/27 13:40",
      read: "3 MIN",
      prompts: [
        "如果鲸鱼是游戏主角，它的技能应该是什么？",
        "你心中最适合 DeepSeek 的美术风格是什么？",
        "社区二创需要怎样的边界感，才能既自由又尊重原创？"
      ],
      tags: ["二创", "像素画", "社区文化"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
    },
    {
      id: "model-feel",
      category: "模型",
      catClass: "model",
      title: "评测集之外，开发者如何判断模型「手感」",
      short: "跑分回答能力上限，真实任务回答使用体验。两者之间隔着大量无法量化的细节。",
      body: "选模型像选工具：日常问答、结构化抽取、代码补全、复杂推理，关注点完全不同。速度、成本、稳定性、可控性，每个维度都会影响最终体验。\n\n社区里最好用的清单，永远是自己踩坑后写的那一份。与其问「哪个更好」，不如把真实任务列出来，让模型在固定评测集上跑一遍。",
      heat: "4.1k",
      delta: "+7%",
      published: "10/27 12:15",
      read: "5 MIN",
      prompts: [
        "你会用哪些维度给模型做一张「手感评分表」？",
        "什么任务看起来适合推理模型，实际却更适合普通对话模型？",
        "模型切换时，怎样保证线上产品体验不突然变差？"
      ],
      tags: ["评测", "模型选型", "手感"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
    },
    {
      id: "prompt-swap",
      category: "社区",
      catClass: "community",
      title: "深夜的 Prompt 交换局：那些不愿公开的工作流",
      short: "最有价值的提示词往往不是一句咒语，而是一串被反复修正的协作习惯。",
      body: "真正好用的 Prompt，通常长得不像 Prompt。它可能是一份检查清单，一段角色设定，或者一套让模型先提问再回答的流程。\n\n社区里开始流行交换「工作流」而不是「咒语」：先给约束、再给样例、最后要求自检。比起追求一句话的魔法，这些方法更慢，也更可复用。",
      heat: "3.6k",
      delta: "+11%",
      published: "10/27 11:02",
      read: "4 MIN",
      prompts: [
        "你愿意公开自己的 Prompt 吗？边界在哪里？",
        "一套好用的工作流，最重要的组成部分是什么？",
        "让模型先提问，真的能得到更好的答案吗？"
      ],
      tags: ["Prompt", "工作流", "协作"],
      source: { label: "DeepSeek 官网", url: "https://www.deepseek.com" }
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
    var locked = !gameOverlay.hidden || !detailOverlay.hidden || !commandLayer.hidden || !mobileMenu.hidden;
    body.classList.toggle("is-locked", locked);
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

  function signalBars(id) {
    var seed = 0;
    for (var i = 0; i < id.length; i += 1) seed += id.charCodeAt(i);
    var bars = [];
    for (var index = 0; index < 34; index += 1) {
      var value = 9 + Math.abs(Math.sin(seed * 0.37 + index * 1.7)) * 43;
      var delay = ((seed + index * 7) % 18) / 10;
      bars.push('<i class="signal-bar" style="height:' + value.toFixed(1) + 'px;animation-delay:-' + delay + 's"></i>');
    }
    return bars.join("");
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
    } else {
      featureBox.innerHTML =
        '<article class="hot-feature__card">' +
        '<div class="hot-feature__top">' +
        '<span class="hot-feature__cat">' + escapeHtml(feature.category) + "</span>" +
        '<span class="hot-feature__top-actions"><span class="feature-heat">' + escapeHtml(feature.heat) + "</span>" +
        bookmarkMarkup(savedSignals.has(feature.id), feature.id, "save-button") +
        "</span></div>" +
        '<div class="hot-feature__body">' +
        "<h3>" + escapeHtml(feature.title) + "</h3>" +
        "<p>" + escapeHtml(feature.short) + "</p>" +
        '<button type="button" class="hot-feature__action" data-hot-detail="' + feature.id +
        '">阅读全文 <svg viewBox="0 0 20 20" aria-hidden="true"><use href="#icon-arrow"/></svg></button>' +
        "</div></article>";

      if (!rest.length) {
        listBox.innerHTML = '<li class="trend-empty">暂无更多内容</li>';
      } else {
        listBox.innerHTML = rest.map(function (item, index) {
          return (
            '<li class="trend-item">' +
            '<button type="button" class="trend-button" data-hot-detail="' + item.id + '">' +
            '<span class="trend-rank">' + String(index + 2) + "</span>" +
            '<span class="trend-main"><span class="trend-title">' + escapeHtml(item.title) + "</span></span>" +
            '<span class="trend-heat">' + escapeHtml(item.heat) + "</span>" +
            "</button></li>"
          );
        }).join("");
      }
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
  }

  function openGame(id) {
    var game = GAMES.find(function (candidate) {
      return candidate.id === id;
    });
    if (!game) return;

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
    updateGameChrome(game);
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
        id: "signal-" + item.id + "-" + index,
        group: "热点",
        title: item.title,
        subtitle: item.category + " · " + item.published + " · " + item.read,
        meta: item.heat,
        icon: "✦",
        search: item.title + " " + item.short + " " + item.tags.join(" ") + " 热点 新闻",
        action: function () { openHotDetail(item.id); }
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

    var detailTrigger = target.closest("[data-hot-detail]");
    if (detailTrigger) {
      openHotDetail(detailTrigger.getAttribute("data-hot-detail"));
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

  renderGames();
  renderWire();
  renderHot();
  updateSavedCount();
  syncSoundButtons();
  syncShortcutLabels();
  setClock();
  window.setInterval(setClock, 15000);

  if (window.location.hash.indexOf("#signal-") === 0) {
    var initialSignal = decodeURIComponent(window.location.hash.replace("#signal-", ""));
    if (HOT_ITEMS.some(function (item) { return item.id === initialSignal; })) {
      window.setTimeout(function () { openHotDetail(initialSignal); }, 180);
    }
  }
})();
