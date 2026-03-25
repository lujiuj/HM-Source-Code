const baseNow = Date.now()

export const demoCurrentUserId = 'demo-learner-001'

const demoUserProfiles = {
  'demo-learner-001': { username: '春归', avatar: '/assets/learn-real/avatars/demo-chungui.jpg' },
  'demo-learner-002': { username: '采春', avatar: '/assets/learn-real/avatars/demo-caichun.jpg' },
  'demo-learner-003': { username: '青松', avatar: '/assets/learn-real/avatars/demo-qingsong.jpg' },
  'demo-learner-004': { username: '落雪', avatar: '/assets/learn-real/avatars/demo-luoxue.jpg' },
  'demo-learner-005': { username: '闻莺', avatar: '/assets/learn-real/avatars/demo-wenying.jpg' },
  'demo-learner-006': { username: '琴心', avatar: '/assets/learn-real/avatars/demo-qinxin.jpg' },
  'demo-learner-007': { username: '暮秋', avatar: '/assets/learn-real/avatars/demo-muqiu.jpg' },
  'demo-learner-008': { username: '玉兰', avatar: '/assets/learn-real/avatars/demo-yulan.jpg' },
  'demo-learner-009': { username: '书蘅', avatar: '/assets/learn-real/avatars/demo-shuheng.jpg' },
  'demo-audience-001': { username: '听戏人', avatar: '/assets/learn-real/avatars/demo-tingxiren.jpg' },
  'demo-audience-002': { username: '小舟', avatar: '/assets/learn-real/avatars/demo-xiaozhou.jpg' },
  'demo-audience-003': { username: '拾春', avatar: '/assets/learn-real/avatars/demo-shichun.jpg' },
  'demo-audience-004': { username: '曲友', avatar: '/assets/learn-real/avatars/demo-quyou.jpg' }
}

function resolveDemoProfile(userId, fallbackName = '示例学员', fallbackAvatar = '') {
  return {
    username: demoUserProfiles[userId]?.username || fallbackName,
    avatar: demoUserProfiles[userId]?.avatar || fallbackAvatar || ''
  }
}

export const demoVisualsBySongId = {
  'tianxianpei-fuqishuangshuang': {
    songName: '天仙配·夫妻双双把家还',
    coverUrl: '/assets/covers/tianxianpei_cover.jpg',
    heroImage: '/assets/learn-real/stills/tianxianpei_hero.jpg',
    bannerImage: '/assets/learn-real/stills/tianxianpei_hero.jpg',
    timelineCover: '/assets/learn-real/stills/tianxianpei_hero.jpg',
    galleryCover: '/assets/learn-real/stills/tianxianpei_hero.jpg',
    portrait: '/assets/masters/hanzaifen_avatar.jpg',
    mediaUrl: '/video/《天仙配》选段_夫妻双双把家还_韩再芬.mp4'
  },
  'nvfuma-weijiulilang': {
    songName: '女驸马·为救李郎离家园',
    coverUrl: '/assets/covers/nvfuma_cover.jpg',
    heroImage: '/assets/learn-real/stills/nvfuma_hero.jpg',
    bannerImage: '/assets/learn-real/stills/nvfuma_hero.jpg',
    timelineCover: '/assets/learn-real/stills/nvfuma_hero.jpg',
    galleryCover: '/assets/learn-real/stills/nvfuma_hero.jpg',
    portrait: '/assets/masters/hanzaifen_avatar.jpg',
    mediaUrl: '/video/《女驸马》选段_为救李郎离家园_韩再芬.mp4'
  },
  'liangzhu-wocongci': {
    songName: '梁祝·我从此不敢看观音',
    coverUrl: '/assets/covers/liangzhu_cover.jpg',
    heroImage: '/assets/learn-real/stills/liangzhu_wocongci_hero.jpg',
    bannerImage: '/assets/learn-real/stills/liangzhu_wocongci_hero.jpg',
    timelineCover: '/assets/learn-real/stills/liangzhu_wocongci_hero.jpg',
    galleryCover: '/assets/learn-real/stills/liangzhu_wocongci_hero.jpg',
    portrait: '/assets/masters/wuqiong_avatar.jpg',
    mediaUrl: '/video/《梁祝》选段 _ 我从此不敢看观音.mp4'
  },
  'liangzhu-loutaihui': {
    songName: '梁祝·楼台会',
    coverUrl: '/assets/covers/liangzhu_loutaihui_cover.jpg',
    heroImage: '/assets/learn-real/stills/liangzhu_loutaihui_banner.jpg',
    bannerImage: '/assets/learn-real/stills/liangzhu_loutaihui_card.jpg',
    timelineCover: '/assets/learn-real/stills/liangzhu_loutaihui_duet.jpg',
    galleryCover: '/assets/learn-real/stills/liangzhu_loutaihui_card.jpg',
    portrait: '/assets/masters/wuqiong_avatar.jpg',
    mediaUrl: '/video/梁祝·楼台会.mp4'
  },
  'taqing-youchun': {
    songName: '踏青·游春',
    coverUrl: '/assets/covers/taqing_cover.jpg',
    heroImage: '/assets/learn-real/stills/taqing_banner.jpg',
    bannerImage: '/assets/learn-real/stills/taqing_card.jpg',
    timelineCover: '/assets/learn-real/stills/taqing_banner.jpg',
    galleryCover: '/assets/learn-real/stills/taqing_card.jpg',
    portrait: '/assets/learn-real/stills/taqing_bridal_portrait.jpg',
    mediaUrl: '/video/踏青.mp4'
  },
  'bangdaboqinglang-mingchang': {
    songName: '棒打薄情郎·闹门对质',
    coverUrl: '/assets/covers/bangdaboqinglang_cover.jpg',
    heroImage: '/assets/learn-real/stills/bangdaboqinglang_banner.jpg',
    bannerImage: '/assets/learn-real/stills/bangdaboqinglang_card.jpg',
    timelineCover: '/assets/learn-real/stills/bangdaboqinglang_duet.jpg',
    galleryCover: '/assets/learn-real/stills/bangdaboqinglang_card.jpg',
    portrait: '/assets/masters/hanzaifen_avatar.jpg',
    mediaUrl: '/video/棒打薄情郎.mp4'
  },
  'mengjiangnu-shieryuediao': {
    songName: '孟姜女·十二月调',
    coverUrl: '/assets/covers/mengjiangnu_cover.jpg',
    heroImage: '/assets/learn-real/stills/mengjiangnu_banner.jpg',
    bannerImage: '/assets/learn-real/stills/mengjiangnu_card.jpg',
    timelineCover: '/assets/learn-real/stills/mengjiangnu_portrait.jpg',
    galleryCover: '/assets/learn-real/stills/mengjiangnu_card.jpg',
    portrait: '/assets/masters/yanfengying_avatar.jpg',
    mediaUrl: '/video/孟姜女.mp4'
  }
}

function createAnalysis({
  overallScore,
  summary,
  strongestLabel,
  weakestLabel,
  trainingLabel
}) {
  const pitch = Math.max(0, Math.min(100, overallScore - 2))
  const rhythm = Math.max(0, Math.min(100, overallScore - 5))
  const articulation = Math.max(0, Math.min(100, overallScore - 1))
  const style = Math.max(0, Math.min(100, overallScore))
  const breath = Math.max(0, Math.min(100, overallScore - 6))
  const emotion = Math.max(0, Math.min(100, overallScore - 3))

  return {
    overallScore,
    aiSummary: summary,
    dimensions: {
      pitch,
      rhythm,
      articulation,
      style,
      breath,
      emotion
    },
    objectiveDiagnosis: [
      `${strongestLabel}已经比较稳，继续把整段的呼吸和停连压住。`,
      `${weakestLabel}还可以更完整，建议先拆成短句慢练。`,
      '把当前的节奏和人物语气保留下来，整体完成度会更好。'
    ],
    trainingSuggestions: [
      {
        id: 'demo-train-1',
        label: trainingLabel,
        hint: `围绕${weakestLabel}做一次慢速回练。`,
        drill: '先拆句，再合句，最后回到整段。'
      },
      {
        id: 'demo-train-2',
        label: '稳住节拍',
        hint: '先把板眼踩稳，再加装饰。',
        drill: '每句句头单独起拍一次。'
      },
      {
        id: 'demo-train-3',
        label: '收紧尾音',
        hint: '句尾不要散，要收在人物情绪里。',
        drill: '把每句最后两个字单独拉出来练。'
      }
    ],
    lineDiagnostics: [
      {
        lineIndex: 0,
        lineText: '示例唱句一',
        overall: Math.max(0, overallScore - 3),
        grade: 'A',
        sampleCount: 18,
        scores: {
          pitch: pitch - 1,
          rhythm: rhythm - 1,
          articulation,
          style,
          breath: breath - 1,
          emotion
        },
        objectiveDiagnosis: '这一句起势稳，人物状态立得住。',
        trainingHint: '保持句头力度，句尾轻轻收回。'
      },
      {
        lineIndex: 1,
        lineText: '示例唱句二',
        overall: Math.max(0, overallScore - 6),
        grade: 'B',
        sampleCount: 16,
        scores: {
          pitch: pitch - 4,
          rhythm: rhythm - 3,
          articulation: articulation - 1,
          style: style - 1,
          breath,
          emotion: emotion - 2
        },
        objectiveDiagnosis: '这句的气口略松，尾音还能更稳。',
        trainingHint: '先把换气点固定下来，再拉开整句。'
      },
      {
        lineIndex: 2,
        lineText: '示例唱句三',
        overall: Math.max(0, overallScore - 2),
        grade: 'A',
        sampleCount: 20,
        scores: {
          pitch,
          rhythm: rhythm - 1,
          articulation,
          style: style - 1,
          breath: breath - 1,
          emotion
        },
        objectiveDiagnosis: '这一句的情绪已经展开，完成度很好。',
        trainingHint: '把句尾拖得再干净一点会更耐听。'
      }
    ],
    weakestDimensions: [
      {
        key: 'breath',
        label: weakestLabel,
        suggestion: '先把换气点固定下来，再追求细碎装饰。'
      }
    ]
  }
}

function createPublishAnalysis({
  headline,
  overallJudgement,
  strongestLabel,
  weakestLabel
}) {
  return {
    headline,
    overallJudgement,
    strengths: [
      {
        label: strongestLabel,
        detail: '这一项已经比较稳，适合作为当前示例态的主亮点。'
      },
      {
        label: '气口',
        detail: '整段换气节奏清楚，舞台感能够撑住。'
      }
    ],
    weaknesses: [
      {
        label: weakestLabel,
        reason: '这一维还有继续打磨的空间。',
        suggestion: '下一版可以先把这一项单独慢练，再回到整段。'
      }
    ],
    nextSteps: [
      '把最弱的一项拆成两个短句单独回练。',
      '保持当前的节奏和情绪层次，不要为了提分去唱得太满。',
      '再录一版对照，方便看出前后差别。'
    ],
    lineIssues: [
      {
        lineIndex: 1,
        lineText: '示例唱句二',
        issue: '句尾略微松散，收束还可以更干净。',
        tip: '尾音提前半拍收住，会更耐听。'
      }
    ],
    voiceoverText: headline,
    weakestDimension: {
      label: weakestLabel,
      suggestion: '这里先别追求复杂装饰，先把主干稳定下来。'
    }
  }
}

function createDemoPracticeSession({
  id,
  userId = demoCurrentUserId,
  songId,
  songName,
  score,
  grade,
  stars,
  timestampOffset,
  duration,
  lineCount,
  strengthLabel,
  weaknessLabel,
  trainingLabel
}) {
  const visuals = demoVisualsBySongId[songId] || {}
  const profile = resolveDemoProfile(userId, '示例学员', visuals.portrait || '')
  const analysisV2 = createAnalysis({
    overallScore: score,
    summary: `${songName}这段练习已经接近可以展示的状态，适合用来撑起空数据页的复盘质感。`,
    strongestLabel: strengthLabel,
    weakestLabel: weaknessLabel,
    trainingLabel
  })

  return {
    id,
    isDemo: true,
    userId,
    username: profile.username,
    songId,
    songName,
    score,
    overall: score,
    grade,
    stars,
    timestamp: baseNow - timestampOffset,
    duration,
    lineCount,
    breakdown: {
      pitchAccuracy: Math.max(0, score - 2),
      voiceActivity: Math.max(0, score - 5)
    },
    coverUrl: visuals.coverUrl,
    heroImage: visuals.heroImage,
    bannerImage: visuals.bannerImage,
    timelineCover: visuals.timelineCover,
    galleryCover: visuals.galleryCover,
    mediaUrl: visuals.mediaUrl,
    mediaId: null,
    analysisV2,
    publishAiAnalysis: createPublishAnalysis({
      headline: `${songName}适合当前示例态展示`,
      overallJudgement: `这段${songName}已经具备较完整的舞台感，足够作为示例复盘与发布页头图使用。`,
      strongestLabel: strengthLabel,
      weakestLabel: weaknessLabel
    }),
    lineScores: Array.from({ length: lineCount }).map((_, index) => ({
      lineIndex: index,
      lineText: `示例唱句 ${index + 1}`,
      overall: Math.max(0, score - (index % 3) * 2),
      grade: index === 0 ? 'A' : 'B',
      score: Math.max(0, score - (index % 3) * 2),
      scores: {
        pitch: Math.max(0, score - 2 - index),
        rhythm: Math.max(0, score - 4 - index),
        articulation: Math.max(0, score - index),
        style: Math.max(0, score - 1),
        breath: Math.max(0, score - 6 + index),
        emotion: Math.max(0, score - 3)
      }
    })),
    publishedFromPracticeId: id,
    avatarSnapshot: {
      displayName: profile.username,
      avatar: profile.avatar
    }
  }
}

function createDemoWork({
  id,
  userId,
  username,
  songId,
  score,
  grade,
  stars,
  timestampOffset,
  strengthLabel,
  weaknessLabel,
  practiceId = null
}) {
  const visuals = demoVisualsBySongId[songId] || {}
  const profile = resolveDemoProfile(userId, username, visuals.portrait || '')
  const songName = visuals.songName || songId
  const analysisV2 = createAnalysis({
    overallScore: score,
    summary: '这是一条本地示例作品，用于空数据兜底和页面展示，不会写入真实业务数据。',
    strongestLabel: strengthLabel,
    weakestLabel: weaknessLabel,
    trainingLabel: '示例练习建议'
  })
  const publishAiAnalysis = createPublishAnalysis({
    headline: `${songName}的示例榜单表现`,
    overallJudgement: `这条作品适合用于榜单、详情和发布后的示例展示。`,
    strongestLabel: strengthLabel,
    weakestLabel: weaknessLabel
  })

  return {
    id,
    isDemo: true,
    userId,
    username: profile.username,
    songId,
    songName,
    score,
    totalScore: score,
    averageScore: score,
    grade,
    stars,
    timestamp: baseNow - timestampOffset,
    duration: 246000,
    lineCount: 8,
    coverUrl: visuals.coverUrl,
    heroImage: visuals.heroImage,
    bannerImage: visuals.bannerImage,
    galleryCover: visuals.galleryCover,
    timelineCover: visuals.timelineCover,
    mediaUrl: visuals.mediaUrl,
    mvUrl: visuals.mediaUrl,
    mediaId: null,
    analysisV2,
    publishAiAnalysis,
    breakdown: {
      pitchAccuracy: Math.max(0, score - 2),
      voiceActivity: Math.max(0, score - 5)
    },
    avatarSnapshot: {
      displayName: profile.username,
      avatar: profile.avatar
    },
    publishedFromPracticeId: practiceId || null,
    practiceId: practiceId || null
  }
}

export const demoPracticeSessions = [
  createDemoPracticeSession({
    id: 'demo-practice-liangzhu-01',
    songId: 'liangzhu-loutaihui',
    songName: '梁祝·楼台会',
    score: 95,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 60 * 12,
    duration: 248000,
    lineCount: 8,
    strengthLabel: '情绪推进',
    weaknessLabel: '气口',
    trainingLabel: '慢速对句'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-taqing-01',
    userId: 'demo-learner-002',
    songId: 'taqing-youchun',
    songName: '踏青·游春',
    score: 91,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 60 * 28,
    duration: 201000,
    lineCount: 7,
    strengthLabel: '身段',
    weaknessLabel: '收尾',
    trainingLabel: '稳拍练习'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-bangda-01',
    userId: 'demo-learner-003',
    songId: 'bangdaboqinglang-mingchang',
    songName: '棒打薄情郎·闹门对质',
    score: 88,
    grade: 'B',
    stars: 4,
    timestampOffset: 1000 * 60 * 60 * 51,
    duration: 228000,
    lineCount: 6,
    strengthLabel: '咬字',
    weaknessLabel: '节奏',
    trainingLabel: '分句慢练'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-meng-01',
    userId: 'demo-learner-004',
    songId: 'mengjiangnu-shieryuediao',
    songName: '孟姜女·十二月调',
    score: 93,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 60 * 79,
    duration: 237000,
    lineCount: 7,
    strengthLabel: '情感',
    weaknessLabel: '气息',
    trainingLabel: '换气点'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-tianxianpei-01',
    userId: 'demo-learner-005',
    songId: 'tianxianpei-fuqishuangshuang',
    songName: '天仙配·夫妻双双把家还',
    score: 90,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 60 * 104,
    duration: 214000,
    lineCount: 7,
    strengthLabel: '气口',
    weaknessLabel: '节奏',
    trainingLabel: '连贯收放'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-nvfuma-01',
    userId: 'demo-learner-006',
    songId: 'nvfuma-weijiulilang',
    songName: '女驸马·为救李郎离家园',
    score: 92,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 60 * 129,
    duration: 232000,
    lineCount: 8,
    strengthLabel: '吐字',
    weaknessLabel: '收句',
    trainingLabel: '叙事推进'
  }),
  createDemoPracticeSession({
    id: 'demo-practice-liangzhu-02',
    userId: 'demo-learner-007',
    songId: 'liangzhu-wocongci',
    songName: '梁祝·我从此不敢看观音',
    score: 89,
    grade: 'B',
    stars: 4,
    timestampOffset: 1000 * 60 * 60 * 154,
    duration: 196000,
    lineCount: 6,
    strengthLabel: '抒情',
    weaknessLabel: '尾音',
    trainingLabel: '轻推轻收'
  })
]

export const demoWorks = [
  createDemoWork({
    id: 'demo-work-liangzhu-01',
    userId: demoCurrentUserId,
    username: '春归',
    songId: 'liangzhu-loutaihui',
    score: 96,
    grade: 'SS',
    stars: 5,
    timestampOffset: 1000 * 60 * 30,
    strengthLabel: '情绪',
    weaknessLabel: '气口',
    practiceId: 'demo-practice-liangzhu-01'
  }),
  createDemoWork({
    id: 'demo-work-liangzhu-02',
    userId: 'demo-learner-007',
    username: '暮秋',
    songId: 'liangzhu-loutaihui',
    score: 94,
    grade: 'S',
    stars: 5,
    timestampOffset: 1000 * 60 * 58,
    strengthLabel: '人物关系',
    weaknessLabel: '板眼'
  }),
  createDemoWork({
    id: 'demo-work-liangzhu-03',
    userId: 'demo-learner-008',
    username: '玉兰',
    songId: 'liangzhu-loutaihui',
    score: 92,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 86,
    strengthLabel: '尾音',
    weaknessLabel: '气口'
  }),
  createDemoWork({
    id: 'demo-work-taqing-01',
    userId: 'demo-learner-002',
    username: '采春',
    songId: 'taqing-youchun',
    score: 94,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 90,
    strengthLabel: '身段',
    weaknessLabel: '节奏',
    practiceId: 'demo-practice-taqing-01'
  }),
  createDemoWork({
    id: 'demo-work-taqing-02',
    userId: 'demo-learner-009',
    username: '书蘅',
    songId: 'taqing-youchun',
    score: 90,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 120,
    strengthLabel: '轻巧',
    weaknessLabel: '句尾'
  }),
  createDemoWork({
    id: 'demo-work-bangda-01',
    userId: 'demo-learner-003',
    username: '青松',
    songId: 'bangdaboqinglang-mingchang',
    score: 93,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 150,
    strengthLabel: '咬字',
    weaknessLabel: '收尾',
    practiceId: 'demo-practice-bangda-01'
  }),
  createDemoWork({
    id: 'demo-work-bangda-02',
    userId: 'demo-learner-006',
    username: '琴心',
    songId: 'bangdaboqinglang-mingchang',
    score: 90,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 184,
    strengthLabel: '板眼',
    weaknessLabel: '情绪'
  }),
  createDemoWork({
    id: 'demo-work-meng-01',
    userId: 'demo-learner-004',
    username: '落雪',
    songId: 'mengjiangnu-shieryuediao',
    score: 91,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 220,
    strengthLabel: '情感',
    weaknessLabel: '气息',
    practiceId: 'demo-practice-meng-01'
  }),
  createDemoWork({
    id: 'demo-work-tianxianpei-01',
    userId: 'demo-learner-005',
    username: '闻莺',
    songId: 'tianxianpei-fuqishuangshuang',
    score: 95,
    grade: 'S',
    stars: 5,
    timestampOffset: 1000 * 60 * 260,
    strengthLabel: '连腔',
    weaknessLabel: '节奏',
    practiceId: 'demo-practice-tianxianpei-01'
  }),
  createDemoWork({
    id: 'demo-work-tianxianpei-02',
    userId: 'demo-learner-002',
    username: '采春',
    songId: 'tianxianpei-fuqishuangshuang',
    score: 92,
    grade: 'A',
    stars: 4,
    timestampOffset: 1000 * 60 * 286,
    strengthLabel: '甜润',
    weaknessLabel: '板眼'
  }),
  createDemoWork({
    id: 'demo-work-nvfuma-01',
    userId: 'demo-learner-006',
    username: '琴心',
    songId: 'nvfuma-weijiulilang',
    score: 93,
    grade: 'A',
    stars: 5,
    timestampOffset: 1000 * 60 * 318,
    strengthLabel: '吐字',
    weaknessLabel: '收句',
    practiceId: 'demo-practice-nvfuma-01'
  }),
  createDemoWork({
    id: 'demo-work-liangzhu-wocongci-01',
    userId: 'demo-learner-007',
    username: '暮秋',
    songId: 'liangzhu-wocongci',
    score: 89,
    grade: 'B',
    stars: 4,
    timestampOffset: 1000 * 60 * 352,
    strengthLabel: '抒情',
    weaknessLabel: '尾音',
    practiceId: 'demo-practice-liangzhu-02'
  })
]

function createComment(id, userId, text, timestampOffset) {
  const profile = resolveDemoProfile(userId, '曲友')
  return {
    id,
    userId,
    username: profile.username,
    userName: profile.username,
    avatar: profile.avatar,
    userAvatar: profile.avatar,
    text,
    content: text,
    timestamp: baseNow - timestampOffset,
    createdAt: baseNow - timestampOffset
  }
}

function createGift(id, userId, type, count, timestampOffset) {
  const profile = resolveDemoProfile(userId, '曲友')
  return {
    id,
    userId,
    username: profile.username,
    avatar: profile.avatar,
    type,
    count,
    timestamp: baseNow - timestampOffset
  }
}

function createDanmaku(id, userId, text, timeMs, timestampOffset) {
  const profile = resolveDemoProfile(userId, '曲友')
  return {
    id,
    userId,
    username: profile.username,
    avatar: profile.avatar,
    text,
    timestamp: baseNow - timestampOffset,
    timeMs
  }
}

const demoWorkInteractionsById = {
  'demo-work-liangzhu-01': {
    comments: [
      createComment('demo-comment-1', 'demo-audience-001', '这一版情绪很稳，人物关系也出来了。', 1000 * 60 * 12),
      createComment('demo-comment-2', 'demo-audience-002', '句尾再轻一点，会更耐听。', 1000 * 60 * 36)
    ],
    gifts: [
      createGift('demo-gift-1', 'demo-audience-003', 'flower', 12, 1000 * 60 * 14),
      createGift('demo-gift-2', 'demo-audience-002', 'cheer', 5, 1000 * 60 * 22)
    ],
    danmaku: [
      createDanmaku('demo-danmaku-1', 'demo-audience-001', '这句很有梁祝味道。', 61000, 1000 * 60 * 11),
      createDanmaku('demo-danmaku-2', 'demo-audience-004', '人物气口拿住了。', 104000, 1000 * 60 * 9)
    ]
  },
  'demo-work-tianxianpei-01': {
    comments: [
      createComment('demo-comment-3', 'demo-audience-003', '甜味出来了，适合放在首页示例位。', 1000 * 60 * 44),
      createComment('demo-comment-4', 'demo-audience-004', '对唱关系很顺，听起来舒服。', 1000 * 60 * 58)
    ],
    gifts: [
      createGift('demo-gift-3', 'demo-audience-001', 'tea', 6, 1000 * 60 * 46),
      createGift('demo-gift-4', 'demo-audience-002', 'flower', 9, 1000 * 60 * 39)
    ],
    danmaku: [
      createDanmaku('demo-danmaku-3', 'demo-audience-003', '这一句真甜。', 48000, 1000 * 60 * 41)
    ]
  }
}

function buildGenericDemoInteractions(workId) {
  const work = demoWorks.find((item) => item.id === workId) || demoWorks[0]
  const shortSongName = work?.songName || '这段唱段'
  return {
    comments: [
      createComment(`demo-comment-${workId}-1`, 'demo-audience-001', `${shortSongName}这一版的画面感已经很足。`, 1000 * 60 * 18),
      createComment(`demo-comment-${workId}-2`, 'demo-audience-002', '情绪和节奏拿得住，适合继续往舞台感上推。', 1000 * 60 * 28)
    ],
    gifts: [
      createGift(`demo-gift-${workId}-1`, 'demo-audience-003', 'flower', 8, 1000 * 60 * 20),
      createGift(`demo-gift-${workId}-2`, 'demo-audience-004', 'cheer', 3, 1000 * 60 * 10)
    ],
    danmaku: [
      createDanmaku(`demo-danmaku-${workId}-1`, 'demo-audience-001', '这句收得漂亮。', 36000, 1000 * 60 * 16)
    ]
  }
}

export function cloneDemo(value) {
  return JSON.parse(JSON.stringify(value))
}

export function getDemoPracticeSessionById(id) {
  return demoPracticeSessions.find((item) => item.id === id) || demoPracticeSessions[0] || null
}

export function getDemoPracticeSessions() {
  return cloneDemo(demoPracticeSessions)
}

export function getDemoWorkById(id) {
  return demoWorks.find((item) => item.id === id) || demoWorks[0] || null
}

export function getDemoWorks() {
  return cloneDemo(demoWorks)
}

export function getDemoWorksBySongId(songId) {
  const list = demoWorks.filter((item) => item.songId === songId)
  return cloneDemo(list.length ? list : demoWorks)
}

export function getDemoLeaderboardBySongId(songId) {
  return getDemoWorksBySongId(songId)
}

export function getDemoInteractionsByWorkId(workId) {
  const value = demoWorkInteractionsById[workId] || buildGenericDemoInteractions(workId)
  return cloneDemo(value)
}
