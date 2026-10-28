# DeepSeek 深海游乐场

一个 DeepSeek 主题的社区迷你游戏站。8 款游戏统一平铺在一个视口内，旁边是一列可筛选、可直接跳转的 DeepSeek 官方动态。无登录、无构建步骤、无第三方运行时依赖，打开即玩。

> 后续接手请先阅读：[HANDOFF.md](HANDOFF.md)。

- 正式域名：<https://大肥鱼.fun>
- GitHub Pages：<https://zhk0567.github.io/deep-arcade/>
- 源码仓库：<https://github.com/zhk0567/deep-arcade>

## 页面结构

```text
┌ 页头：品牌 / 搜索 / 音效 ──────────────────────────────────┐
├ 主视觉：标题 / 一句说明 / 随机开局 ────────────────────────┤
│ ┌ 游戏库 8 款，4 × 2 平铺 ──────┐ ┌ 最新动态 ────────────┐ │
│ │ 插画 / 标题 / 说明 / 操作      │ │ 最新官方文章          │ │
│ │ 不区分开发状态、无筛选栏       │ │ 可跳转文章列表        │ │
│ └───────────────────────────────┘ └───────────────────────┘ │
├ 页脚：品牌 / 简短说明 / 提交游戏 ─────────────────────────┤
└───────────────────────────────────────────────────────────┘
```

整页使用 `100dvh` 与 `overflow: hidden` 固定在一屏，不产生纵向滚动；桌面、平板、手机分别适配。游戏、搜索面板和移动菜单均为固定层。

## 功能

### 游戏

- **跳一跳**：按住蓄力，松开起跳；随机平台、连击、完美落点、实时力度条与失败结算。
- **合成大肥鱼**：点击卡片直接打开作者提供的「好友试玩完整版 v0.6.8」（当前页跳转），包含 10 级形态、图鉴、语音与独立本地存档。
- **Token 消消乐**：8×8 棋盘、六种 Token、24 步、相邻交换、三连消除、连锁倍率、深渊补给、无解重排、提示一步、键盘操作与结束结算。
- **提示词接龙**：10 轮语境选择、每轮 15 秒、3 条命、连续答对加成与接龙链展示。
- **深海寻鲸**：8×8 声呐网格、8 次探测、曼哈顿距离与冷热反馈、计时加分。
- **幻觉猎手**：16 条真/假断言、每轮 6 秒、3 条命、连击与知识点解释。
- **鲸落拼图**：3×3 滑动拼图、程序化鲸鱼插画、步数与时间计分、目标图参考。
- **R1 迷宫**：9×9 / 13×13 / 17×17 三层生成迷宫、倒计时、键盘与手机方向键、逐层加分。

> 好友试玩完整版已拆成 **约 0.2 MB 的 HTML + 外部 WebP/音频素材**。首页不再等待立绘加载，会先启用「开始合成」，素材在后台按需加载；未完成的图块用占位表情兜底，因此不会卡在加载状态。图片已缩放到 640px 内（WebP 质量 78）。

### 最新动态

- 8 条真实存在的 DeepSeek 官方文章，覆盖模型发布、产品更新与开源项目。
- 精选文章 + 文章列表，每条都直接跳转 DeepSeek API Docs 官方原文（新标签页打开）。
- 分类筛选：全部 / 模型 / 开源 / 产品。
- 面板右上角「全部文章」直达官方新闻索引。
- 文章日期、来源和标题均来自官方页面，不在站内伪造新闻内容。

### 访问统计（Umami）

项目已接入 Umami Cloud，Website ID 与域名白名单配置在 `assets/js/analytics-config.js`。

当前配置：

- Website ID：`81573f4d-2ccc-473b-b838-5ecb05f94008`
- 统计域名：`xn--pssy23g5qs.fun`、`www.xn--pssy23g5qs.fun`
- 自建 Umami 时，把 `scriptSrc` 改成自己的 `script.js` 地址

清空 `websiteId` 时，页面不会加载 Umami 脚本，也不会发出统计请求。

已埋点事件：

```text
game_open     { game }
game_end      { game, score, duration }
article_click { article }
search_open
notice_open
notice_dismiss
fish_full_open
fish_trial_open
```

页面浏览量由 Umami 脚本自动记录。统计不写 Cookie，不记录搜索原文，不建立用户画像；脚本带 `data-do-not-track`，会尊重浏览器的 Do Not Track 设置。

### 视觉

- 浅色深海主题：暖白底、珊瑚橙、湖水青、柠檬黄与电光蓝。
- 主视觉使用渐变标题、荧光笔 underline、漂浮气泡与缓慢流动的文字渐变。
- 游戏卡按游戏使用独立强调色，悬停上浮、轻微 3D 倾斜与彩色投影。
- 文章区使用浅色卡片与蓝色外链按钮，全部真实链接。

### 体验

- 全局搜索 / 命令面板：`Ctrl K`、`⌘ K`、`/` 打开，支持搜索游戏、官方文章和操作。
- 移动端菜单提供快速开始、搜索和音效。
- 游戏弹层支持全屏、重开、ESC 退出，关闭后焦点回到打开位置。
- 最高分只保存在浏览器 `localStorage`。
- 顶部公告栏说明非官方企划与官方来源；可关闭，也可通过页脚「免责声明」再次打开完整声明。
- 桌面端使用 DeepSeek Mint Cursors 的 48px 光标；快速点击不会误选文字。
- 完整版鱼游戏的解锁卡牌在展示 3 秒后自动淡出；首页「戳一戳」会避免连续两次使用同一句语音。
- 「合成大肥鱼」完整版提高了正文/按钮字号与文字对比度，棋盘标签同步放大。

## 技术栈

- 原生 HTML / CSS / JavaScript，无框架、无构建步骤。
- Canvas 2D 游戏，DOM / CSS 实现三消与界面动效。
- WebAudio 合成音效，无外部音频文件。
- 可选 Umami 匿名统计，不使用 Cookie。
- 全部视觉素材由 CSS、内联 SVG 与 Canvas 绘制。

## 目录结构

```text
deep-arcade/
├─ index.html              # 主站单页入口
├─ fat-fish/               # 合成大肥鱼 v0.6.8 生产版
│  ├─ index.html           # 首屏约 219 KB
│  ├─ README.md            # 生产版说明
│  └─ assets/              # 23 张 WebP + 21 条 MP3（相对加载）
├─ source/
│  └─ merge-fat-fish/      # 合作者完整源码、Node 后台、测试、微信小游戏骨架
├─ fish-v068.html          # 旧入口 → fat-fish/ 的跳转页
├─ fish-v068-v5.html       # 旧入口 → fat-fish/ 的跳转页
├─ fish-v068-v6.html       # 旧入口 → fat-fish/ 的跳转页
├─ 404.html
├─ CNAME
├─ robots.txt
├─ sitemap.xml
├─ .nojekyll
├─ assets/
│  ├─ css/
│  │  ├─ arcade.css
│  │  ├─ theme.css
│  │  ├─ theme-mint.css      # 当前主站主题（含 DeepSeek Mint 光标）
│  │  ├─ notice.css
│  │  └─ games-extra.css
│  ├─ js/
│  │  ├─ audio.js
│  │  ├─ analytics-config.js
│  │  ├─ analytics.js
│  │  └─ site.js
│  └─ games/
│     ├─ jump.js
│     ├─ fish.js           # 旧轻量版，主站卡片已不再挂载
│     ├─ tokens.js
│     ├─ prompt.js
│     ├─ radar.js
│     ├─ hunter.js
│     ├─ puzzle.js
│     └─ maze.js
├─ HANDOFF.md
└─ README.md
```

## 光标素材与许可

- 指针项目：<https://github.com/nibushiyigeren123-bot/DeepSeek-mint-cursors>
- 角色素材作者：**YunYueSama**，<https://github.com/YunYueSama/codex-deepseek-pet>
- 许可：大肥鱼项目署名许可 1.0（需保留作者与仓库署名）
- 本站修改：从 64px `Arrow.ani` 提取透明首帧，缩放为 48px PNG，仅用于网页光标
- 文件：`assets/cursors/deepseek-mint-48.png`
- 完整说明：[CREDITS.md](CREDITS.md) 与 [许可文本](assets/cursors/LICENSE-DeepSeek-mint-cursors.txt)

## 本地运行

项目不需要安装依赖。推荐用静态服务器打开，确保剪贴板、音频与本地存储行为正常：

```powershell
cd F:\commercial\deep-arcade
python -m http.server 4173 --bind 127.0.0.1
```

打开 <http://127.0.0.1:4173/>。

直接双击 `index.html` 也能浏览，但部分浏览器会限制剪贴板或音频。

## 部署

### GitHub Pages

仓库已配置为从 `main` 分支根目录发布，并包含：

- `CNAME`：`xn--pssy23g5qs.fun`
- `.nojekyll`：禁止 Jekyll 处理静态资源
- `404.html`：自定义 404

发布入口：<https://zhk0567.github.io/deep-arcade/>

### 自定义域名 DNS

域名 `大肥鱼.fun` 使用阿里云 DNS（`dns7.hichina.com` / `dns8.hichina.com`）。在阿里云域名控制台的「云解析 DNS」中，为 `@` 添加 4 条 A 记录：

| 主机记录 | 记录类型 | 记录值 |
| --- | --- | --- |
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |

再添加一条 `www` 记录：

| 主机记录 | 记录类型 | 记录值 |
| --- | --- | --- |
| `www` | CNAME | `zhk0567.github.io` |

保存后等待 DNS 生效（通常几分钟到几小时），然后在 GitHub 仓库的 **Settings → Pages** 中确认 Custom domain 为 `大肥鱼.fun`，并勾选 **Enforce HTTPS**。

### 如果改用自有服务器

这是纯静态站，把仓库根目录的全部文件放到任意静态 Web 服务器根目录即可。Nginx 示例：

```nginx
server {
    listen 80;
    server_name xn--pssy23g5qs.fun www.xn--pssy23g5qs.fun;
    root /var/www/deep-arcade;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }
}
```

## 接入新游戏

### 1. 注册游戏模块

在 `assets/games/<game-id>.js` 中注册：

```js
window.DeepSeekGames = window.DeepSeekGames || {};

window.DeepSeekGames["my-game"] = {
  mount(root, options) {
    // options.best        当前本地最高分
    // options.audio       ArcadeAudio 音效工具
    // options.onGameEnd(score)  本局结束，返回 { best, isRecord }
    // options.onExit      请求关闭游戏弹层

    return {
      destroy() {
        // 清理 RAF、定时器和事件监听
      },
      restart() {
        // 原地重开
      }
    };
  }
};
```

在 `index.html` 中、`assets/js/site.js` 之前引入：

```html
<script src="assets/games/my-game.js"></script>
```

### 2. 登记游戏

编辑 `assets/js/site.js` 中的 `GAMES` 数组：

```js
{
  id: "my-game",
  index: "09",
  title: "游戏名",
  tag: "TAGLINE",
  status: "live", // live | soon
  controls: "操作提示",
  description: "一句话介绍",
  artClass: "my-game"
}
```

并在 `gameArt(id)` 中增加对应封面。封面样式追加到 `assets/css/games-extra.css` 末尾。

### 3. 分数

通过 `options.onGameEnd(score)` 上报，站点会写入：

```text
localStorage["ds-arcade-best-<game-id>"]
localStorage["ds-arcade-notice-dismissed"]
```

## 替换官方文章

编辑 `assets/js/site.js` 中的 `HOT_ITEMS`：

```js
{
  id,
  category,            // 模型 / 开源 / 产品
  catClass,            // model | oss | product
  title, short,        // 标题、摘要
  date,                // YYYY/MM/DD
  source               // { label, url }
}
```

每篇文章都会渲染成指向 `source.url` 的外部链接，并自动带上 `target="_blank"` 与 `rel="noopener noreferrer"`。

> 当前收录的全部是 DeepSeek 官方页面。更换文章时请确认链接真实可访问，避免写入无法验证的内容。

## 浏览器支持

现代 Chrome、Edge、Safari、Firefox。使用 Canvas 2D、CSS Grid、`container-type`、Pointer Events、Fullscreen API、WebAudio；不支持 IE。

## 验收

- [x] 1440×900 / 1366×768 / 1024×768 一屏展示，无页面滚动
- [x] 768×1024 / 390×844 / 375×667 / 844×390 无横向溢出
- [x] 8 款游戏统一平铺，无状态分组、无筛选栏
- [x] 游戏卡文字位于插画下方，无覆盖、无溢出
- [x] 八款游戏均可打开、关闭、重开，最高分写入本地
- [x] 八款游戏均完成可玩的得分/结算流程
- [x] 最新动态展示官方文章，可直接跳转原文
- [x] 分类筛选、全部文章入口、搜索面板可用
- [x] 顶部公告可关闭，页脚与移动端均可再次打开完整免责声明
- [x] 标题无裁切，卡片文字无重叠
- [x] 命令面板与移动菜单可用
- [x] 无 JavaScript 异常（浏览器自动播放提示除外）
