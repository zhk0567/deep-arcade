# DeepSeek 深海游乐场 — 交接文档

> 最后更新：2026-10-28 14:00（Asia/Shanghai）
> 用途：给后续接手的 agent / 开发者快速恢复上下文。
> 本文不包含密码、私钥、GitHub Token 等敏感凭证。

---

## 1. 项目概览

- 项目：DeepSeek 主题的社区迷你游戏站「DeepSeek 深海游乐场」
- 主站：<https://大肥鱼.fun>
- GitHub 仓库：<https://github.com/zhk0567/deep-arcade>
- 本地目录：`F:\commercial\deep-arcade`
- 形态：纯静态 HTML / CSS / JavaScript，无构建步骤、无框架、无运行时依赖
- 主站布局：一屏 `100dvh`，桌面 4×2 游戏卡 + 右侧官方动态；手机单列
- 8 款游戏全部已完成，不再有「即将上线」
- 其中「合成大肥鱼」卡片打开的是**独立完整版页面**，不是主站弹层

---

## 2. 线上与部署状态

### 2.1 GitHub Pages

| 项 | 值 |
|---|---|
| 仓库 | `zhk0567/deep-arcade` |
| 分支 | `main` |
| Pages 来源 | legacy branch / root |
| 当前远程 HEAD | `dc1ab9b9fd3afaa696b5becc640bb5f7a03dc08e`（HANDOFF 文档提交前） |
| 交接文档提交前 Pages 构建 | `dc1ab9b9...`，状态 `built` |
| 自定义域名 | `xn--pssy23g5qs.fun`（`大肥鱼.fun`） |
| HTTPS | 已签发并验证通过 |
| 强制 HTTPS | 已开启 |

### 2.2 DNS（阿里云）

当前：

```text
@    A       185.199.108.153
@    A       185.199.109.153
@    A       185.199.110.153
@    A       185.199.111.153
www  CNAME   zhk0567.github.io
```

DNS 服务商：阿里云（`dns7.hichina.com` / `dns8.hichina.com`）。

### 2.3 GitHub 访问注意

当前机器访问 GitHub 的线路不稳定，直接 `git push` 曾出现：

- `TLS connect error`
- `Recv failure`
- `schannel` 握手失败

实际最后几次发布是通过 GitHub API 完成（`git/blobs` → `git/trees` → `git/commits` → `PATCH git/refs/heads/main`），使用 `git credential fill` 读取本机缓存 Token。

**本地与远程 Git 状态：**

- 本地 HEAD：`566391f`（`Open fish game in the current tab`）
- 远程 HEAD：`675955e`（同一功能提交，API 创建）
- 本地与远程不是同一条提交链，直接 `git push` 可能 non-fast-forward
- 远程多出用户后来提交的 `merge-fat-fish/` 大项目；本地没有
- 下一个 agent 如果继续用 Git，**先 `git fetch` / 重新 clone**，不要直接强推

### 2.3.1 其他贡献者 / 权限（需要用户确认）

2026-10-28 检查结果：

- 主分支只有 `main`，没有其他分支、tag 或 release
- 本文档提交前的 HEAD `675955e` 为 `zhk0567` 的提交
- 唯一一条其他账号提交：

| 项 | 值 |
|---|---|
| SHA | `4adbfef6969c8fac11935415b42262d77e00c952` |
| 作者 | `lyh2723790237-oss <lyh2723790237@gmail.com>` |
| 时间 | 2026-10-28 04:17:47 UTC（北京时间 12:17） |
| 信息 | `Add complete Merge Fat Fish v0.6.8 project and WeChat skeleton` |
| 改动 | 148 个文件，+4272 行；新增 `merge-fat-fish/`，另修改 `README.md` +5 |

说明：

- 该提交没有修改主站 `index.html`、`assets/js/site.js` 等运行代码
- 它新增的 `merge-fat-fish/` 目前未被站点使用，但会随 GitHub Pages 一起被公开托管
- 该提交的 README 改动后来被我们的版本覆盖，`merge-fat-fish/` 文件仍保留
- 仓库 collaborators 中有 `Lyh5590`（write 权限），但历史提交里没有该账号的提交
- `lyh2723790237-oss` 不在当前 collaborators 列表中，可能是提交后被移除，或使用了其他本地 Git 身份
- `main` 分支保护未开启

**如果这些不是用户自己的账号，建议：**

1. 移除 `Lyh5590` 的 write 权限
2. 检查 GitHub 的 Sessions / SSH keys / GPG keys / Deploy keys / Webhooks
3. 确认 `merge-fat-fish/` 是否要保留；不需要就移到单独分支或删除
4. 开启 main 分支保护，至少禁止 force push


### 2.4 阿里云 ECS（已购买，尚未部署站点）

用户提供了服务器截图，信息如下：

| 项 | 值 |
|---|---|
| 公网 IP | `39.106.117.118` |
| 地域 | 华北 2（北京） |
| 系统 | Alibaba Cloud Linux 3.2104 LTS 64 位 |
| 配置 | 2 vCPU / 2 GiB |
| 带宽 | 3 Mbps |
| 状态 | 运行中 |
| 到期 | 2027-04-28 |

**尚未确认 / 尚未完成：**

1. 是否已完成 `大肥鱼.fun` 的 ICP 备案（北京地域绑定域名必须有）
2. 安全组是否放行 `22`、`80`、`443`
3. 是否已将临时 SSH 公钥加入服务器
4. 尚未登录过服务器、未安装 Nginx、未切 DNS

已生成临时部署密钥（未提交）：

- 私钥：`%TEMP%\deep-arcade-deploy.pem`（只在本机）
- 公钥曾发给用户，但用户尚未确认添加
- **绝对不要把私钥写入仓库或文档**

### 2.5 可部署安装包

- `F:\commercial\deep-arcade-static.zip`（约 1.7 MB）
- 包含：主站、8 款游戏、鱼完整版 v6、44 个素材、Nginx 示例、部署说明
- 不包含：`.git`、`merge-fat-fish/`
- 可直接上传到 ECS / 阿里云 OSS / 腾讯云 COS

服务器推荐路径：`/var/www/deep-arcade`。

---

## 3. 当前入口与 URL

| 页面 | URL |
|---|---|
| 主站 | <https://大肥鱼.fun> |
| 合成大肥鱼完整版 | <https://大肥鱼.fun/fish-v068-v6.html> |
| 旧完整版（兼容） | `/fish-v068.html`、`/fish-v068-v5.html` |
| 鱼素材 | `/fish-v068-assets/` |
| 鲸鱼光标 | `/assets/cursors/deepseek-whale.svg` |

> 鱼页面使用版本化文件名以绕过 GitHub Pages 约 10 分钟的 CDN 缓存。修改鱼页面时，优先复制成新文件名（例如 v7），再更新卡片链接，不要只覆盖同名文件。

---

## 4. 目录与关键文件

```text
F:\commercial\deep-arcade\
├─ index.html                  # 主站入口
├─ fish-v068-v6.html           # 当前鱼完整版入口（219,891 bytes）
├─ fish-v068-v5.html           # 上一版（兼容）
├─ fish-v068.html              # 更早版本（兼容）
├─ fish-v068-assets/           # 44 个外部素材：23 WebP + 21 MP3
├─ assets/
│  ├─ css/
│  │  ├─ arcade.css            # 基础样式
│  │  ├─ theme.css             # 浅色主题、光标、选择保护
│  │  ├─ notice.css            # 公告栏、免责声明
│  │  └─ games-extra.css       # 后五款游戏 UI
│  ├─ cursors/
│  │  └─ deepseek-whale.svg    # 自绘鲸鱼光标
│  ├─ games/
│  │  ├─ jump.js
│  │  ├─ fish.js               # 旧轻量鱼（主站卡片已不再打开它）
│  │  ├─ tokens.js
│  │  ├─ prompt.js
│  │  ├─ radar.js
│  │  ├─ hunter.js
│  │  ├─ puzzle.js
│  │  └─ maze.js
│  └─ js/
│     ├─ audio.js
│     ├─ analytics-config.js   # Umami Website ID / 域名白名单
│     ├─ analytics.js          # Umami 加载、事件队列
│     └─ site.js               # 主控制器
├─ README.md
├─ HANDOFF.md                  # 本文
├─ 404.html
├─ CNAME
├─ robots.txt
├─ sitemap.xml
└─ .gitattributes
```

---

## 5. 主站功能

### 5.1 游戏

8 款全部可玩：

1. 跳一跳（Canvas）
2. 合成大肥鱼（卡片当前页跳转到完整版外部页）
3. Token 消消乐（8×8 DOM）
4. 提示词接龙（10 轮、3 命、15 秒）
5. 深海寻鲸（8×8、8 次声呐）
6. 幻觉猎手（16 条断言、3 命、6 秒）
7. 鲸落拼图（3×3 滑动、程序化插画）
8. R1 迷宫（9/13/17 三层生成）

所有游戏最高分：

```text
localStorage["ds-arcade-best-<game-id>"]
```

鱼完整版使用它自己的 localStorage：`fatfish.*` 键，和主站轻量版分开。

### 5.2 新闻与免责声明

- 右侧「最新动态」：8 条真实 DeepSeek 官方文章，6 条可见 +「全部文章」入口
- 文章链接全部带 `target="_blank"` / `rel="noopener noreferrer"`
- 顶部公告栏 + 页脚「免责声明」
- 弹层包含 6 部分：非官方、内容版权、数据隐私、使用责任、商标、使用条款
- 页脚可再次打开，移动端有独立「免责声明」按钮

### 5.3 交互/视觉

- 浅色鲜艳主题：暖白、珊瑚橙、湖水青、柠檬黄、电光蓝
- 标题渐变、气泡、卡片悬停上浮/3D 倾斜
- 自定义鲸鱼光标（SVG，自绘，无第三方素材）
- `user-select: none`；输入框保留文字选择
- 快速点击不误选文字
- 主站资产业已加 `?v=20261028d`

### 5.4 鱼完整版 v6

当前文件：`fish-v068-v6.html`

包含：

- 字体整体放大、深墨绿色高对比度配色
- 棋盘标签放大
- 顶部 sticky「← 返回游乐场」返回主站
- 顶部栏使用主站同款渐变
- 3 秒自动淡出的解锁卡牌
- 戳人物语音不连续重复
- 自定义光标、防选中
- 首屏 219,891 bytes，素材外部加载
- 开始按钮不再等待全部立绘

**材质路径要注意：**

- `fish-v068-v6.html` 通过相对路径引用 `fish-v068-assets/`
- 部署时必须同时上传整个 `fish-v068-assets/`
- 不能只移动 HTML 文件

---

## 6. Umami 统计

已接入 Umami Cloud。

| 项 | 值 |
|---|---|
| Website ID | `81573f4d-2ccc-473b-b838-5ecb05f94008` |
| 脚本 | `https://cloud.umami.is/script.js` |
| 统计域名 | `xn--pssy23g5qs.fun`、`www.xn--pssy23g5qs.fun` |
| Cookie | 不使用 |
| DNT | 支持（`data-do-not-track`） |

配置在 `assets/js/analytics-config.js`。

已埋点事件：

```text
game_open      { game }
game_end       { game, score, duration }
article_click  { article }
search_open
notice_open
notice_dismiss
fish_full_open
fish_trial_open
```

说明：

- `pageview` 由 Umami 自动记录
- 本地 `127.0.0.1` 已通过 `data-domains` 排除
- 之前本地测试可能已在 Umami 留下 `127.0.0.1` 记录，可忽略
- 广告拦截插件会阻止统计
- 若要关闭统计：清空 `websiteId`，不会请求 Umami

验证方法（本地）：

```js
window.ArcadeAnalytics.isConfigured() // true
```

Umami 后台应能看到 `game_open` 和 `pageview`。

---

## 7. 本地开发 / 预览

```powershell
cd F:\commercial\deep-arcade
python -m http.server 4173 --bind 127.0.0.1
```

打开：

- 主站：<http://127.0.0.1:4173/>
- 鱼 v6：<http://127.0.0.1:4173/fish-v068-v6.html>

项目没有 build 命令、没有依赖安装步骤。

### 建议测试尺寸

- 1440×900
- 1366×768
- 1024×768
- 390×844
- 375×667

主站必须保持无纵向滚动、无卡片文字重叠。

---

## 8. 部署流程

### 8.1 GitHub Pages（当前）

修改后：

1. 主站改动的 CSS/JS 记得 bump `?v=` 查询参数
2. 鱼页面建议复制成新文件名（v7/v8）后更新卡片
3. 本地验证
4. 提交
5. 推送到 `main`
6. 等 Pages 构建，通常 30–90 秒
7. 验证线上资源 200

当前网络若无法 `git push`，可走 GitHub API；不要硬编码 Token。

### 8.2 迁移到 ECS（待完成）

前置条件：

1. 用户确认 ICP 备案
2. 安全组放行 22/80/443
3. 将临时 SSH 公钥加入服务器

计划：

```text
上传 deep-arcade-static.zip
  → 解压到 /var/www/deep-arcade
  → 安装 Nginx
  → 配置 nginx.conf.example
  → certbot 申请 HTTPS
  → 先通过 http://39.106.117.118 验证
  → 把 @ A 记录切到 39.106.117.118
  → 验证 https://大肥鱼.fun
```

注意：

- 北京地域绑定域名需要 ICP；没有备案时只适合先用 IP 验证
- 3 Mbps 带宽有限，首屏 219 KB 可以，素材 1.6 MB 建议后续接 CDN
- 服务器上不要保留私钥明文；部署完移除临时公钥

---

## 9. 已知问题 / 待办

| 优先级 | 事项 |
|---|---|
| P0 | 服务器迁移：等待 ICP / SSH 公钥 / 安全组确认 |
| P1 | 实际触发一次鱼「解锁新角色」验证 3 秒自动淡出（代码已加，但未通过真实解锁流程截图验证） |
| P1 | 确认 Umami 后台已收到正式域名数据 |
| P2 | 决定是否使用/清理远程仓库里的 `merge-fat-fish/` 大项目（用户提交，约 80 MB，当前站点未使用） |
| P2 | 清理旧的 `fish-v068.html`、`fish-v068-v5.html` 和未使用的 `assets/games/fish.js` |
| P2 | 若继续使用 GitHub Pages，考虑 Service Worker 做二次访问离线缓存 |
| P3 | 为服务器部署配置自动 HTTPS 续期、日志轮转、备份 |
| P3 | 检查 ICP 备案与商标/版权声明是否随部署更新 |

### 9.1 已知缓存问题

- GitHub Pages 的 HTML 缓存约 10 分钟
- 同名鱼页面更新后可能仍显示旧版
- 所以当前使用 `fish-v068-v6.html` 新文件名
- 主站资源通过 `?v=20261028d` 破缓存
- 更新后如果用户看到旧页面，先 `Ctrl + F5`

### 9.2 已知代码问题

- `assets/games/fish.js` 仍被 `index.html` 加载，但主站 `openGame("fish")` 已拦截并打开完整版，旧模块实际未使用
- `fish-v068.html` / `v5` 保留用于兼容旧链接
- 鱼页面的解锁自动淡出计时从「翻牌完成」开始，不是从「开始翻牌」开始；当前约为 2.5 秒翻牌 + 3 秒展示 + 0.26 秒淡出
- 自定义 SVG 光标在 Chrome/Edge/Firefox 正常；极旧浏览器会回退到系统光标

---

## 10. 编码与操作注意事项

1. **不要用 Windows PowerShell 的 `Get-Content` / `Set-Content` 直接改写含中文的 UTF-8 文件**。之前曾造成不可逆乱码。  
   请使用 `read` / `edit` / `write` 工具，或 Python `encoding='utf-8'`。
2. 主站保持单屏；改动后测量 `scrollHeight === innerHeight`。
3. 不要覆盖正在使用的版本化鱼页面；新增版本文件再切链接。
4. 不要把 GitHub Token、SSH 私钥、服务器密码写进仓库。
5. 文章只放官方标题、短摘要和链接，不要整篇复制。
6. 站点是非官方企划，继续保持免责声明和商标声明。
7. 北京 ECS 绑定域名需要 ICP，不能用非标准方式规避。

---

## 11. 快速定位

| 想改什么 | 文件 |
|---|---|
| 主站布局 / 文案 | `index.html` |
| 主站主题 / 光标 / 防选中 | `assets/css/theme.css` |
| 主站逻辑 / 游戏目录 / 文章 | `assets/js/site.js` |
| Umami | `assets/js/analytics-config.js`、`assets/js/analytics.js` |
| 8 款游戏 | `assets/games/*.js` |
| 后五款游戏 UI | `assets/css/games-extra.css` |
| 鱼完整版 | `fish-v068-v6.html` + `fish-v068-assets/` |
| 公告 / 免责声明 | `index.html` + `assets/css/notice.css` |
| 部署包 | `F:\commercial\deep-arcade-static.zip` |

---

## 12. 最近提交

```text
1e39ad2  Add arcade return bar to fish page
0af8f88  Bump main asset cache keys
f433848  Serve readable fish page under a fresh URL
da5f855  Improve fish game typography and contrast
e84fac2  Add themed cursor, selection guard, and unlock auto-fade
23c5183  Bust fish game cache for fast version
e180d16  Split fish assets for instant loading
e0ecaac  Start fish game without waiting for artwork
4adbfef  Add complete Merge Fat Fish v0.6.8 project and WeChat skeleton
```

> 注：`4adbfef` 是用户提交的远程提交，包含 `merge-fat-fish/`；本地没有这个目录。
