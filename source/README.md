# Source projects

`merge-fat-fish/` 是合作者提供的完整源码工程：

- `web/`：模块化浏览器版本、Node 排行榜后台、61 项测试
- `wechat-minigame/`：微信小游戏移植骨架
- `web/dist/assets/`：原始高分辨率 PNG 素材

当前线上实际运行的是 `../fat-fish/` 下的优化生产版：

- 219 KB 首屏
- 23 张 640px WebP 立绘
- 21 条 MP3 语音
- 顶部返回主站、3 秒解锁卡自动淡出、防选中、主题光标

**不要把 `source/` 当成生产入口。**  
修改生产页时改 `../fat-fish/`；需要重新生成或跑测试时再用 `source/merge-fat-fish/web/`。
