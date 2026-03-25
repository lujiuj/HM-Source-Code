import paperFibers from '../../shared/assets/learn-external/paper_fibers.png'
import fabricOne from '../../shared/assets/learn-external/fabric_1.png'
import hanzaifenStage from '../assets/masters/hanzaifen_stage.jpg'
import hanzaifenGallery from '../assets/masters/han_zaifen.jpg'
import wuqiongStage from '../assets/masters/wuqiong_stage.webp'
import wuqiongStageHero from '../assets/masters/wuqiong_stage_hero.webp'
import wuqiongGallery from '../assets/masters/wu_qiong.jpg'
import yanfengyingStage from '../assets/masters/yanfengying_stage.jpg'
import mistBackdrop from '../assets/backdrops/mist_backdrop.png'
import riverBackdrop from '../assets/backdrops/river_backdrop.png'
import mountainBackdrop from '../assets/backdrops/mountain_backdrop.png'
import stageBackdrop from '../assets/backdrops/stage_backdrop.png'

const publicAsset = (path) => `/assets/${path}`

const defaultSongVisuals = {
  cover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  heroImage: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  bannerImage: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
  timelineCover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  galleryCover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  textureImage: paperFibers,
  accentImage: fabricOne,
  objectPosition: 'center center',
  heroObjectPosition: 'center center',
  bannerObjectPosition: 'center center',
  note: '本地剧照与封面已入库'
}

const songVisuals = {
  'tianxianpei-fuqishuangshuang': {
    cover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
    heroImage: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
    bannerImage: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
    portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
    galleryCover: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 18%',
    heroObjectPosition: 'center 16%',
    bannerObjectPosition: 'center 18%',
    note: '夫妻对唱，气口舒展，适合练习连腔'
  },
  'nvfuma-weijiulilang': {
    cover: publicAsset('learn-real/downloaded/hanzaifen_nvfuma_stage2.jpg'),
    heroImage: publicAsset('learn-real/stills/nvfuma_hero.jpg'),
    bannerImage: publicAsset('learn-real/downloaded/hanzaifen_nvfuma_stage2.jpg'),
    portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/nvfuma_hero.jpg'),
    galleryCover: publicAsset('learn-real/downloaded/hanzaifen_nvfuma_stage.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 24%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 28%',
    note: '独唱线条清楚，适合练字头与人物感'
  },
  'liangzhu-wocongci': {
    cover: publicAsset('learn-real/stills/liangzhu_wocongci_hero.jpg'),
    heroImage: publicAsset('learn-real/stills/liangzhu_wocongci_hero.jpg'),
    bannerImage: publicAsset('learn-real/stills/liangzhu_loutaihui_banner.jpg'),
    portrait: publicAsset('masters/wuqiong_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/liangzhu_wocongci_hero.jpg'),
    galleryCover: publicAsset('learn-real/stills/liangzhu_loutaihui_duet.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 20%',
    heroObjectPosition: 'center 20%',
    bannerObjectPosition: 'center 24%',
    note: '抒情唱段，宜放慢呼吸，强调尾音'
  },
  'mengjiangnu-shieryuediao': {
    cover: publicAsset('learn-real/stills/mengjiangnu_banner.jpg'),
    heroImage: publicAsset('learn-real/stills/mengjiangnu_banner.jpg'),
    bannerImage: publicAsset('learn-real/stills/mengjiangnu_card.jpg'),
    portrait: publicAsset('masters/yanfengying_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/mengjiangnu_banner.jpg'),
    galleryCover: publicAsset('learn-real/stills/mengjiangnu_card.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 22%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 20%',
    note: '叙事感强，适合练节奏与层次'
  },
  'liangzhu-loutaihui': {
    cover: publicAsset('learn-real/stills/liangzhu_loutaihui_duet.jpg'),
    heroImage: publicAsset('learn-real/stills/liangzhu_loutaihui_banner.jpg'),
    bannerImage: publicAsset('learn-real/stills/liangzhu_loutaihui_card.jpg'),
    portrait: publicAsset('masters/wuqiong_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/liangzhu_loutaihui_banner.jpg'),
    galleryCover: publicAsset('learn-real/stills/liangzhu_loutaihui_duet.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 18%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 16%',
    note: '对唱张力强，适合练人物关系和转折'
  },
  'bangdaboqinglang-mingchang': {
    cover: publicAsset('learn-real/stills/bangdaboqinglang_duet.jpg'),
    heroImage: publicAsset('learn-real/stills/bangdaboqinglang_banner.jpg'),
    bannerImage: publicAsset('learn-real/stills/bangdaboqinglang_card.jpg'),
    portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
    timelineCover: publicAsset('learn-real/stills/bangdaboqinglang_duet.jpg'),
    galleryCover: publicAsset('learn-real/stills/bangdaboqinglang_duet.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 20%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 18%',
    note: '板眼清晰，适合拆句与咬字训练'
  },
  'taqing-youchun': {
    cover: publicAsset('learn-real/stills/taqing_card.jpg'),
    heroImage: publicAsset('learn-real/stills/taqing_banner.jpg'),
    bannerImage: publicAsset('learn-real/stills/taqing_card.jpg'),
    portrait: publicAsset('learn-real/stills/taqing_bridal_portrait.jpg'),
    timelineCover: publicAsset('learn-real/stills/taqing_banner.jpg'),
    galleryCover: publicAsset('learn-real/stills/taqing_card.jpg'),
    textureImage: paperFibers,
    accentImage: fabricOne,
    objectPosition: 'center 18%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 18%',
    note: '轻快舒展，适合练身段与节奏感'
  }
}

const defaultMasterVisuals = {
  avatar: publicAsset('masters/hanzaifen_avatar.jpg'),
  heroImage: hanzaifenStage,
  bannerImage: hanzaifenGallery,
  portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
  timelineCover: hanzaifenGallery,
  galleryCover: hanzaifenGallery,
  textureImage: paperFibers,
  accentImage: fabricOne,
  avatarObjectPosition: '60% 22%',
  heroObjectPosition: 'center 16%',
  bannerObjectPosition: 'center 42%',
  note: '本地名师素材已入库'
}

const masterVisuals = {
  hanzaifen: {
    avatar: publicAsset('masters/hanzaifen_avatar.jpg'),
    heroImage: hanzaifenStage,
    bannerImage: hanzaifenGallery,
    portrait: publicAsset('masters/hanzaifen_avatar.jpg'),
    timelineCover: hanzaifenGallery,
    galleryCover: hanzaifenGallery,
    textureImage: paperFibers,
    accentImage: fabricOne,
    avatarObjectPosition: '60% 22%',
    heroObjectPosition: 'center 16%',
    bannerObjectPosition: 'center 42%',
    note: '代表曲目以天仙配、女驸马为主'
  },
  wuqiong: {
    avatar: publicAsset('masters/wuqiong_avatar.jpg'),
    heroImage: wuqiongStageHero,
    bannerImage: wuqiongGallery,
    portrait: publicAsset('masters/wuqiong_avatar.jpg'),
    timelineCover: wuqiongStage,
    galleryCover: wuqiongGallery,
    textureImage: paperFibers,
    accentImage: fabricOne,
    avatarObjectPosition: 'center center',
    heroObjectPosition: '34% 22%',
    bannerObjectPosition: 'center 46%',
    note: '抒情线条细，舞台张力更强'
  },
  yanfengying: {
    avatar: publicAsset('masters/yanfengying_avatar.jpg'),
    heroImage: yanfengyingStage,
    bannerImage: yanfengyingStage,
    portrait: publicAsset('masters/yanfengying_avatar.jpg'),
    timelineCover: yanfengyingStage,
    galleryCover: yanfengyingStage,
    textureImage: paperFibers,
    accentImage: fabricOne,
    avatarObjectPosition: 'center 18%',
    heroObjectPosition: 'center 18%',
    bannerObjectPosition: 'center 18%',
    note: '严派气韵清正，唱念做更讲分寸'
  }
}

const journeyVisuals = {
  backdropImage: mountainBackdrop,
  scrollImage: mistBackdrop,
  textureImage: paperFibers,
  accentImage: fabricOne,
  bannerImage: stageBackdrop,
  mapOverlayImage: riverBackdrop
}

const practiceLandingVisuals = {
  heroImage: publicAsset('learn-real/stills/tianxianpei_hero.jpg'),
  resumeImage: mistBackdrop,
  reviewImage: stageBackdrop
}

const communityVisuals = {
  plazaImage: riverBackdrop,
  spotlightImage: stageBackdrop,
  ambientImage: mistBackdrop,
  detailImage: mountainBackdrop
}

export function getSongVisuals(songId) {
  return songVisuals[songId] || defaultSongVisuals
}

export function getMasterVisuals(masterId) {
  return masterVisuals[masterId] || defaultMasterVisuals
}

export function getJourneyVisuals() {
  return journeyVisuals
}

export function getPracticeLandingVisuals() {
  return practiceLandingVisuals
}

export function getCommunityVisuals() {
  return communityVisuals
}
