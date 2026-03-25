# 学戏模块素材来源清单

本清单记录学戏模块本轮重构实际使用的主视觉素材。原则固定如下：

1. 页面运行时只引用仓库内本地文件，不直接吃外链。
2. 缺失素材优先复用仓库已有图，再用本地视频截帧，最后才补联网下载。
3. 示例内容只做展示 fallback，不写入真实业务数据。

## 一、仓库既有本地素材

以下素材为仓库内原有文件，本轮继续复用并纳入统一映射：

- 曲目封面：`public/assets/covers/tianxianpei_cover.jpg`
- 曲目封面：`public/assets/covers/nvfuma_cover.jpg`
- 曲目封面：`public/assets/covers/liangzhu_cover.jpg`
- 曲目封面：`public/assets/covers/liangzhu_loutaihui_cover.jpg`
- 曲目封面：`public/assets/covers/mengjiangnu_cover.jpg`
- 曲目封面：`public/assets/covers/taqing_cover.jpg`
- 曲目封面：`public/assets/covers/bangdaboqinglang_cover.jpg`
- 名师头像：`public/assets/masters/hanzaifen_avatar.jpg`
- 名师头像：`public/assets/masters/wuqiong_avatar.jpg`
- 名师头像：`public/assets/masters/yanfengying_avatar.jpg`
- 名师舞台图：`src/modules/learn/assets/masters/hanzaifen_stage.jpg`
- 名师舞台图：`src/modules/learn/assets/masters/han_zaifen.jpg`
- 名师舞台图：`src/modules/learn/assets/masters/wuqiong_stage_hero.webp`
- 名师舞台图：`src/modules/learn/assets/masters/wuqiong_stage.webp`
- 名师舞台图：`src/modules/learn/assets/masters/wu_qiong.jpg`
- 名师舞台图：`src/modules/learn/assets/masters/yanfengying_stage.jpg`
- 纸感纹理：`src/shared/assets/learn-external/paper_fibers.png`
- 织物纹理：`src/shared/assets/learn-external/fabric_1.png`

说明：以上文件当前统一由 `src/modules/learn/utils/learnVisuals.js`、`src/modules/learn/utils/learnCatalog.js` 和 `src/modules/learn/utils/learnDemoFixtures.js` 管理。

## 二、本地视频截帧生成素材

以下素材由仓库内本地视频使用 `ffmpeg` 截帧生成，供首页、赏析页、地图页、历史页、榜单页和示例作品页复用。

### 截帧源视频

- `public/video/梁祝·楼台会.mp4`
- `public/video/踏青.mp4`
- `public/video/棒打薄情郎.mp4`
- `public/video/孟姜女.mp4`
- `public/video/《天仙配》选段_夫妻双双把家还_韩再芬.mp4`
- `public/video/《女驸马》选段_为救李郎离家园_韩再芬.mp4`
- `public/video/《梁祝》选段 _ 我从此不敢看观音.mp4`

### 截帧结果

- `public/assets/learn-real/stills/tianxianpei_hero.jpg`
- `public/assets/learn-real/stills/nvfuma_hero.jpg`
- `public/assets/learn-real/stills/liangzhu_wocongci_hero.jpg`
- `public/assets/learn-real/stills/liangzhu_loutaihui_banner.jpg`
- `public/assets/learn-real/stills/liangzhu_loutaihui_card.jpg`
- `public/assets/learn-real/stills/liangzhu_loutaihui_duet.jpg`
- `public/assets/learn-real/stills/taqing_banner.jpg`
- `public/assets/learn-real/stills/taqing_card.jpg`
- `public/assets/learn-real/stills/taqing_bridal_portrait.jpg`
- `public/assets/learn-real/stills/bangdaboqinglang_banner.jpg`
- `public/assets/learn-real/stills/bangdaboqinglang_card.jpg`
- `public/assets/learn-real/stills/bangdaboqinglang_duet.jpg`
- `public/assets/learn-real/stills/mengjiangnu_banner.jpg`
- `public/assets/learn-real/stills/mengjiangnu_card.jpg`
- `public/assets/learn-real/stills/mengjiangnu_portrait.jpg`

说明：截帧图已按 `3:4`、`16:9`、近景肖像等比例整理，用于 `cover / heroImage / bannerImage / timelineCover / galleryCover / portrait` 等字段。

## 三、联网下载后本地化素材

以下素材通过联网检索后下载入库，页面运行时只读取本地副本。

### 学习地图与场景长卷

- 文件：`public/assets/learn-real/downloaded/huangmei_theatre.jpg`
  - 来源页面：[Wikimedia Commons - 安徽再芬黄梅艺术剧院《倾宁夫人》](https://commons.wikimedia.org/wiki/File:%E5%AE%89%E5%BE%BD%E5%86%8D%E8%8A%AC%E9%BB%84%E6%A2%85%E8%89%BA%E6%9C%AF%E5%89%A7%E9%99%A2%E3%80%8A%E5%80%BE%E5%AE%81%E5%A4%AB%E4%BA%BA%E3%80%8B_%E5%AE%89%E5%BA%86%E5%B8%82%E9%BB%84%E6%A2%85%E6%88%8F%E8%89%BA%E6%9C%AF%E4%B8%AD%E5%BF%83_1.jpg)
  - 当前用途：地图长卷、作品页氛围大图、示例榜单背景

### 本轮新增 Commons 实景图

- 文件：`public/assets/learn-real/commons/fairy_couple_stage.jpg`
  - 来源页面：[Wikimedia Commons - File:DSC 0473 (5185772563).jpg](https://commons.wikimedia.org/wiki/File:DSC_0473_(5185772563).jpg)
  - 当前用途：学习演练页舞台侧栏、学戏之旅横幅图

- 文件：`public/assets/learn-real/commons/huangmei_grand_theatre_exterior.jpg`
  - 来源页面：[Wikimedia Commons - File:黄冈·黄梅戏大剧院.jpg](https://commons.wikimedia.org/wiki/File:%E9%BB%84%E5%86%88%C2%B7%E9%BB%84%E6%A2%85%E6%88%8F%E5%A4%A7%E5%89%A7%E9%99%A2.jpg)
  - 当前用途：作品广场页头图、社区氛围主视觉

- 文件：`public/assets/learn-real/commons/huangshan_cloud_sea.jpg`
  - 来源页面：[Wikimedia Commons - File:Cloud sea - huangshan.jpg](https://commons.wikimedia.org/wiki/File:Cloud_sea_-_huangshan.jpg)
  - 当前用途：学戏之旅长卷底图、社区环境氛围图

- 文件：`public/assets/learn-real/commons/huangshan_sunrise_commons.jpg`
  - 来源页面：[Wikimedia Commons - File:Huangshan-morning-ss.jpg](https://commons.wikimedia.org/wiki/File:Huangshan-morning-ss.jpg)
  - 当前用途：学戏之旅背景远景、复盘与示例时间线氛围图

## 四、当前实际引用入口

本轮统一视觉映射集中在以下文件：

- `src/modules/learn/utils/learnVisuals.js`
- `src/modules/learn/utils/learnCatalog.js`
- `src/modules/learn/utils/learnDemoFixtures.js`

后续若替换素材，优先改映射，不直接在页面内散写路径。
