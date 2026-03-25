/**
 * Karaoke song library for Huangmei Opera learning module
 */

export const karaokeLibrary = {
  'tianxianpei-fuqishuangshuang': {
    id: 'tianxianpei-fuqishuangshuang',
    operaName: '天仙配',
    excerptName: '夫妻双双把家还',
    title: '《天仙配》选段 - 夫妻双双把家还',
    singer: '韩再芬',
    videoSrc: '/video/《天仙配》选段_夫妻双双把家还_韩再芬.mp4',
    audioSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬.mp3',
    lrcPath: '/music/《天仙配》选段_夫妻双双把家还_韩再芬.lrc',
    duration: '1:21',
    durationSeconds: 81,
    type: '经典选段',
    difficulty: 2,
    description: '黄梅戏经典剧目《天仙配》中最著名的选段，讲述董永与七仙女夫妻恩爱、憧憬美好生活',
    tags: ['经典', '爱情', '对唱'],
    style: '花腔',
    thumbnail: null,
    referenceVocalSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬_人声.wav',
    accompanimentSrc: '/music/《天仙配》选段_夫妻双双把家还_韩再芬_伴奏.wav'
  },
  'nvfuma-weijiulilang': {
    id: 'nvfuma-weijiulilang',
    operaName: '女驸马',
    excerptName: '为救李郎离家园',
    title: '《女驸马》选段 - 为救李郎离家园',
    singer: '严凤英',
    videoSrc: '/video/《女驸马》选段_为救李郎离家园_韩再芬.mp4',
    audioSrc: null,
    lrcPath: null,
    duration: '3:41',
    durationSeconds: 222,
    type: '经典选段',
    difficulty: 3,
    description: '黄梅戏经典剧目《女驸马》中的著名选段，讲述冯素珍女扮男装考状元救夫的故事',
    tags: ['经典', '爱情', '独白'],
    style: '主调',
    thumbnail: null,
    accompanimentSrc: null
  },
  'liangzhu-wocongci': {
    id: 'liangzhu-wocongci',
    operaName: '梁祝',
    excerptName: '我从此不敢看观音',
    title: '《梁祝》选段 - 我从此不敢看观音',
    singer: '吴琼',
    videoSrc: '/video/《梁祝》选段 _ 我从此不敢看观音.mp4',
    audioSrc: null,
    lrcPath: null,
    duration: '0:54',
    durationSeconds: 55,
    type: '经典选段',
    difficulty: 2,
    description: '黄梅戏经典剧目《梁山伯与祝英台》中的选段',
    tags: ['经典', '爱情', '悲情'],
    style: '主调',
    thumbnail: null,
    accompanimentSrc: null
  }
}

export function getSongById(id) {
  return karaokeLibrary[id]
}

export function getAllSongs() {
  return Object.values(karaokeLibrary)
}

export function getSongsByDifficulty(ascending = true) {
  const songs = Object.values(karaokeLibrary)
  return songs.sort((a, b) => ascending ? a.difficulty - b.difficulty : b.difficulty - a.difficulty)
}

export function getSongsByType(type) {
  return Object.values(karaokeLibrary).filter(song => song.type === type)
}
