# 学戏模块交接说明

## 1. 当前交付范围

本次交付保留两部分：

- 首页：`/`
- 学戏模块：`/learn/**`

已移除内容：

- 观戏模块
- 入戏模块
- 对应 3D 模型、贴图、旧舞台资源、旧匹配/擂台配置

当前路由兼容策略：

- `/watch`、`/play`、`/tip`、`/stages` 会重定向到 `/learn`

## 2. 学戏模块功能

学戏模块覆盖以下主链路：

1. 选曲
2. 练唱打分
3. 练习历史
4. 发布作品
5. 作品详情互动
6. 名师赏析
7. 学习旅程

核心能力包括：

- 卡拉 OK 式练唱
- 音高/节奏可视化
- AI 点评与复盘
- 作品发布与展示
- 评论、弹幕、送礼互动
- 名师分析与学习旅程

## 3. 路由

路由定义文件：`src/router/index.js`

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | `src/modules/immerse/pages/Home.vue` | 首页，页面外观保留原样 |
| `/learn` | `LearnShell.vue` | 学戏容器，默认跳转 `/learn/practice` |
| `/learn/practice` | `SongSelect.vue` | 选曲首页 |
| `/learn/practice/karaoke` | `KaraokeView.vue` | 练唱页 |
| `/learn/practice/leaderboard` | `LearnLeaderboard.vue` | 排行榜 |
| `/learn/practice/history` | `PracticeHistory.vue` | 练习历史 |
| `/learn/practice/history/:practiceId` | `PublishFromPractice.vue` | 从练习发布作品 |
| `/learn/works` | `LearnWorks.vue` | 作品列表 |
| `/learn/works/:workId` | `WorkDetail.vue` | 作品详情 |
| `/learn/master` | `MasterLibrary.vue` | 名师库 |
| `/learn/analysis/:songId?` | `MasterAnalysis.vue` | 名师分析 |
| `/learn/journey` | `LearningJourney.vue` | 学习旅程 |

## 4. 技术栈

- Vue 3
- Vue Router 4
- Vite 6
- Tailwind CSS 4 + Less
- Express 5
- Socket.io
- Firebase Auth / Realtime Database / Storage
- Vitest

## 5. 目录结构

```text
src/modules/learn/
├─ pages/
├─ components/
│  ├─ analysis/
│  ├─ common/
│  ├─ karaoke/
│  └─ work/
├─ composables/
├─ styles/
├─ utils/
└─ assets/
```

关键页面：

- `SongSelect.vue`
- `KaraokeView.vue`
- `PracticeHistory.vue`
- `PublishFromPractice.vue`
- `LearnWorks.vue`
- `WorkDetail.vue`
- `MasterLibrary.vue`
- `MasterAnalysis.vue`
- `LearningJourney.vue`
- `LearnShell.vue`

## 6. 静态资源现状

### 已保留

- 首页背景与图标资源
- 学戏模块图片资源
- 学戏所需音频资源
- 3 个练唱视频：
  - `《天仙配》选段_夫妻双双把家还_韩再芬.mp4`
  - `《女驸马》选段_为救李郎离家园_韩再芬.mp4`
  - `《梁祝》选段 _ 我从此不敢看观音.mp4`

### 已删除

- 超大演示视频：
  - `棒打薄情郎.mp4`
  - `踏青.mp4`
  - `孟姜女.mp4`
  - `梁祝·楼台会.mp4`
- 旧观戏/入戏模型、贴图、动画资源

说明：

- 学戏页面中仍保留部分演示条目与视觉展示数据
- 若点击已删除视频对应条目，会缺少视频文件
- 本次交付按“演示不点这些条目”处理

## 7. 本地用户数据

项目当前已开启“首次打开自动清空本地用户数据”。

涉及范围：

- `localStorage`
  - `hmx_learn_profile_v2`
  - `karaoke_anonymous_id`
  - `karaoke_display_name`
- `IndexedDB`
  - `hmx_local_store`

实现文件：

- `src/modules/learn/utils/resetLearnLocalData.js`
- `src/main.js`

说明：

- 负责人首次打开交付包时，会自动清空本地用户身份、练习记录、作品、评论、弹幕等浏览器侧数据
- 仓库中的演示素材不会受影响

## 8. 运行方式

### 交付目录

建议直接使用：

- `C:\Users\shixi\Desktop\HMX2_delivery`

### 启动命令

```bash
npm run dev:learn
```

说明：

- 交付目录已安装 `node_modules`
- 若换新机器，需要先执行一次 `npm install`

### 其他命令

```bash
npm run dev
npm run build
npm test
```

## 9. 测试

本轮交付已验证：

- `npm run build`
- `npm test`
- 作品详情页相关测试
- 路由与本地数据安全相关测试

## 10. 需要负责人知晓的事项

1. 这是一个“首页 + 学戏模块”的裁剪交付版本。
2. 观戏、入戏已经移除，不再维护。
3. 学戏里有少量展示卡片仍保留，但其中部分超大视频文件已删。
4. 需要完整恢复那些演示视频时，可后续再补回资源文件，无需重做页面结构。
5. 如果运行环境使用 Node 24，安装依赖时会看到个别 `engine` 警告；优先建议使用 Node 22。
