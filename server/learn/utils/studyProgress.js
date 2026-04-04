import { getGradeByScore } from '../../shared/utils/grades.js'
import { getLearnSongById, getLearnSongs, getMasterProfile } from './learnCatalog.js'
import { applyGiftEntitlements, buildGiftEntitlements } from './giftEconomy.js'

const LEVEL_STEP_EXP = 40

const gradeExpMap = {
  C: 20,
  B: 35,
  A: 50,
  S: 70,
  SS: 85,
  SSS: 100
}

const titleMilestones = [
  { level: 1, title: '启声', summary: '先把字头站稳，愿意开口就算进步。' },
  { level: 5, title: '入韵', summary: '开始懂得板眼和口气，唱句子不再发散。' },
  { level: 10, title: '成曲', summary: '能把整段唱完整，开始形成自己的稳定表达。' },
  { level: 15, title: '走腔', summary: '行腔和气口更有味道，听上去有了人物状态。' },
  { level: 20, title: '登台', summary: '完成从练唱到展示的跨越，具备公开登台感。' },
  { level: 26, title: '传韵', summary: '开始把韵味唱出来，也能带动别人一起听戏。' }
]

export const journeyStages = [
  {
    id: 'warm-up',
    title: '开嗓立字',
    subtitle: '先把《天仙配》的字头唱稳，开口要清楚，句尾要收住。',
    songId: 'tianxianpei-fuqishuangshuang',
    masterId: 'hanzaifen',
    taskType: 'score',
    objective: '完成一遍《夫妻双双把家还》练唱，总分达到 60 分。',
    focusLines: ['树上的鸟儿成双对', '绿水青山带笑颜'],
    recommendedMinutes: 6,
    rewardExp: 40,
    unlockRule: { type: 'always' },
    clearRule: { type: 'minScoreOnSong', songId: 'tianxianpei-fuqishuangshuang', minScore: 60 },
    fogState: 'courtyard'
  },
  {
    id: 'rhythm',
    title: '戏文识意',
    subtitle: '学会唱一句还不够，也要知道是谁在唱、唱给谁听、唱的是什么情境。',
    songId: 'tianxianpei-fuqishuangshuang',
    masterId: 'hanzaifen',
    taskType: 'quiz',
    objective: '完成《天仙配》知识问答 4 题，答对至少 3 题。',
    focusLines: ['《天仙配》', '董永与七仙女', '对唱'],
    recommendedMinutes: 4,
    rewardExp: 40,
    unlockRule: { type: 'afterStage', stageId: 'warm-up' },
    clearRule: { type: 'passedJourneyQuiz', stageId: 'rhythm' },
    quiz: {
      passCount: 4,
      questions: [
        {
          id: 'rhythm-q1',
          prompt: '《夫妻双双把家还》出自哪部黄梅戏作品？',
          options: [
            { id: 'a', label: '《女驸马》' },
            { id: 'b', label: '《天仙配》' },
            { id: 'c', label: '《梁祝》' },
            { id: 'd', label: '《徽州女人》' }
          ],
          correctAnswer: 'b',
          explanation: '这段是《天仙配》中的经典唱段，也是学戏模块目前最完整的练唱曲目。'
        },
        {
          id: 'rhythm-q2',
          prompt: '这段唱的主要人物关系是什么？',
          options: [
            { id: 'a', label: '师徒对话' },
            { id: 'b', label: '两位朋友互诉衷肠' },
            { id: 'c', label: '董永与七仙女归家时的夫妻对唱' },
            { id: 'd', label: '官员与书生辩白' }
          ],
          correctAnswer: 'c',
          explanation: '《夫妻双双把家还》重在唱出两人并肩而行、彼此照应的生活气息。'
        },
        {
          id: 'rhythm-q3',
          prompt: '这段在学习上最适合优先练什么？',
          options: [
            { id: 'a', label: '高音爆发和炫技' },
            { id: 'b', label: '连贯气口与双声部情绪' },
            { id: 'c', label: '快板抢拍' },
            { id: 'd', label: '夸张怒腔' }
          ],
          correctAnswer: 'b',
          explanation: '它不是炫技段子，更适合练句子的连贯、气口和温柔对唱的情绪。'
        },
        {
          id: 'rhythm-q4',
          prompt: '韩再芬的示范里，这段更接近哪种表达状态？',
          options: [
            { id: 'a', label: '生活化、温润、字头清楚' },
            { id: 'b', label: '急躁、强顶高音' },
            { id: 'c', label: '冷峻、完全独白' },
            { id: 'd', label: '夸张喜剧腔调' }
          ],
          correctAnswer: 'a',
          explanation: '韩再芬的处理重点是字头、气口和人物温度，不是靠音量压人。'
        }
      ]
    },
    fogState: 'corridor'
  },
  {
    id: 'lyric',
    title: '抒情走腔',
    subtitle: '去名师赏析里听吴琼如何把抒情句唱得柔而不断。',
    songId: 'liangzhu-wocongci',
    masterId: 'wuqiong',
    taskType: 'analysis',
    objective: '打开《梁祝》赏析，读完整段听点与逐句拆解。',
    focusLines: ['我从此不敢看观音'],
    recommendedMinutes: 5,
    rewardExp: 40,
    unlockRule: { type: 'afterStage', stageId: 'rhythm' },
    clearRule: { type: 'analysisVisited', songId: 'liangzhu-wocongci' },
    fogState: 'water'
  },
  {
    id: 'story',
    title: '戏理辨味',
    subtitle: '懂人物、懂行当、懂叙事，唱的时候才不会只剩声音。',
    songId: 'nvfuma-weijiulilang',
    masterId: 'hanzaifen',
    taskType: 'quiz',
    objective: '完成《女驸马》知识问答 4 题，答对至少 3 题。',
    focusLines: ['《女驸马》', '冯素珍', '长线叙事'],
    recommendedMinutes: 4,
    rewardExp: 40,
    unlockRule: { type: 'afterStage', stageId: 'lyric' },
    clearRule: { type: 'passedJourneyQuiz', stageId: 'story' },
    quiz: {
      passCount: 4,
      questions: [
        {
          id: 'story-q1',
          prompt: '《为救李郎离家园》出自哪部剧目？',
          options: [
            { id: 'a', label: '《天仙配》' },
            { id: 'b', label: '《梁祝》' },
            { id: 'c', label: '《女驸马》' },
            { id: 'd', label: '《牛郎织女》' }
          ],
          correctAnswer: 'c',
          explanation: '这是《女驸马》中的代表性唱段，也是韩再芬最广为人知的作品之一。'
        },
        {
          id: 'story-q2',
          prompt: '这段唱段里主要人物是谁？',
          options: [
            { id: 'a', label: '七仙女' },
            { id: 'b', label: '冯素珍' },
            { id: 'c', label: '祝英台' },
            { id: 'd', label: '严凤英' }
          ],
          correctAnswer: 'b',
          explanation: '唱段讲的是冯素珍为救李郎、决意离家赶考前的内心与行动。'
        },
        {
          id: 'story-q3',
          prompt: '这段在训练上更偏向解决什么问题？',
          options: [
            { id: 'a', label: '长线叙事和字头落点' },
            { id: 'b', label: '纯炫技高音' },
            { id: 'c', label: '双人和声配合' },
            { id: 'd', label: '滑稽念白' }
          ],
          correctAnswer: 'a',
          explanation: '它的难点在于长句如何往前推，既要讲清戏，又要立住字头。'
        },
        {
          id: 'story-q4',
          prompt: '学这段时，换气点更适合放在什么位置？',
          options: [
            { id: 'a', label: '哪里憋不住就哪里断' },
            { id: 'b', label: '固定每两个字换一次' },
            { id: 'c', label: '词义边界附近，不把一句切碎' },
            { id: 'd', label: '必须整段一口气唱完' }
          ],
          correctAnswer: 'c',
          explanation: '黄梅戏叙事句最怕被气口切碎，换气应该尽量靠近词义与语气的边界。'
        }
      ]
    },
    fogState: 'pavilion'
  },
  {
    id: 'stage',
    title: '小登台',
    subtitle: '把你练好的版本发出去，完成第一次公开亮相。',
    songId: 'tianxianpei-fuqishuangshuang',
    masterId: 'hanzaifen',
    taskType: 'publish',
    objective: '发布任意一条练唱作品，完成第一次登台。',
    focusLines: ['完整唱段公开发布'],
    recommendedMinutes: 4,
    rewardExp: 40,
    unlockRule: { type: 'afterStage', stageId: 'story' },
    clearRule: { type: 'publishedWorkCount', count: 1 },
    fogState: 'stage'
  }
]

const journeyStageIdSet = new Set(journeyStages.map((stage) => stage.id))

const dailyChallengeTemplates = [
  {
    id: 'pitch-line',
    title: '单句音准',
    taskType: 'score',
    songId: 'tianxianpei-fuqishuangshuang',
    badge: '今日挑战',
    description: '把《夫妻双双把家还》唱到 70 分以上，先稳住音准线。',
    rewardText: '完成后获得今日勤学印记',
    completeWhen: { type: 'minScoreOnSongToday', songId: 'tianxianpei-fuqishuangshuang', minScore: 70 }
  },
  {
    id: 'full-phrase',
    title: '整段跟唱',
    taskType: 'score',
    songId: 'tianxianpei-fuqishuangshuang',
    badge: '今日挑战',
    description: '完整唱完一遍《夫妻双双把家还》，把整段气口连起来。',
    rewardText: '完成后点亮今日练唱徽记',
    completeWhen: { type: 'minPracticeCountOnSongToday', songId: 'tianxianpei-fuqishuangshuang', count: 1 }
  },
  {
    id: 'master-imitate',
    title: '名师复刻',
    taskType: 'analysis',
    songId: 'liangzhu-wocongci',
    badge: '今日挑战',
    description: '打开《梁祝》赏析，把吴琼的抒情走腔听完一遍。',
    rewardText: '完成后记录一枚赏析印记',
    completeWhen: { type: 'analysisVisitedToday', songId: 'liangzhu-wocongci' }
  }
]

function toDateKey(input = Date.now()) {
  const date = input instanceof Date ? input : new Date(input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeGrade(value, score = 0) {
  const grade = String(value || '').trim().toUpperCase()
  if (gradeExpMap[grade]) return grade
  return getGradeByScore(Number(score || 0))
}

function scoreToExp(grade) {
  return gradeExpMap[normalizeGrade(grade)] || 0
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)))
}

function normalizeKnownStageIds(values = []) {
  return unique(values).filter((stageId) => journeyStageIdSet.has(stageId))
}

function songTargetRoute(songId, taskType = 'score') {
  const song = songId ? getLearnSongById(songId) : null
  if (taskType === 'publish') {
    return { path: '/learn/practice/history' }
  }
  if (!song) return { path: '/learn/practice' }
  if (taskType === 'analysis' || !song.isScorable) {
    return { path: `/learn/analysis/${songId}` }
  }
  return { path: '/learn/practice/karaoke', query: { songId } }
}

function stageTargetRoute(stage) {
  if (stage?.taskType === 'quiz') {
    return {
      path: '/learn/journey',
      query: {
        stageId: stage.id,
        action: 'quiz'
      }
    }
  }
  return songTargetRoute(stage?.songId, stage?.taskType)
}

function stageSupportRoute(stage) {
  if (stage?.taskType !== 'quiz' || !stage?.songId) return null
  return { path: `/learn/analysis/${stage.songId}` }
}

export function getJourneyQuiz(stageId) {
  return journeyStages.find((stage) => stage.id === stageId)?.quiz || null
}

function buildHistoryIndex(practiceSessions = []) {
  const highestScoreBySong = new Map()
  const bestGradeBySong = new Map()
  const practiceCountBySong = new Map()
  const todayPracticeCountBySong = new Map()
  const todayKey = toDateKey()

  for (const session of practiceSessions) {
    const songId = String(session?.songId || '')
    if (!songId) continue
    const score = Number(session?.score ?? session?.averageScore ?? 0)
    const grade = normalizeGrade(session?.grade, score)
    const prevScore = highestScoreBySong.get(songId) || 0
    const prevGrade = bestGradeBySong.get(songId) || 'C'

    if (score > prevScore) highestScoreBySong.set(songId, score)
    if (scoreToExp(grade) >= scoreToExp(prevGrade)) bestGradeBySong.set(songId, grade)

    practiceCountBySong.set(songId, (practiceCountBySong.get(songId) || 0) + 1)

    if (toDateKey(session?.timestamp || 0) === todayKey) {
      todayPracticeCountBySong.set(songId, (todayPracticeCountBySong.get(songId) || 0) + 1)
    }
  }

  return {
    highestScoreBySong,
    bestGradeBySong,
    practiceCountBySong,
    todayPracticeCountBySong
  }
}

function isGiftProfileChanged(profile = {}, giftProfile = {}) {
  return (
    Number(profile?.giftBalance || 0) !== Number(giftProfile?.giftBalance || 0)
    || Number(profile?.dailyGiftCap || 0) !== Number(giftProfile?.dailyGiftCap || 0)
    || Number(profile?.perSendCap || 0) !== Number(giftProfile?.perSendCap || 0)
    || Number(profile?.lifetimeEarned || 0) !== Number(giftProfile?.lifetimeEarned || 0)
    || Number(profile?.giftLedgerSummary?.spent || 0) !== Number(giftProfile?.giftLedgerSummary?.spent || 0)
    || Number(profile?.giftLedgerSummary?.earned || 0) !== Number(giftProfile?.giftLedgerSummary?.earned || 0)
    || String(profile?.dailyGiftUsage?.dateKey || '') !== String(giftProfile?.dailyGiftUsage?.dateKey || '')
    || Number(profile?.dailyGiftUsage?.sentCount || 0) !== Number(giftProfile?.dailyGiftUsage?.sentCount || 0)
  )
}

function evaluateRule(rule, context) {
  if (!rule || typeof rule !== 'object') return false
  if (rule.type === 'always') return true
  if (rule.type === 'afterStage') return context.clearedStageIds.includes(rule.stageId)
  if (rule.type === 'minScoreOnSong') {
    return (context.highestScoreBySong.get(rule.songId) || 0) >= Number(rule.minScore || 0)
  }
  if (rule.type === 'minPracticeCountOnSong') {
    return (context.practiceCountBySong.get(rule.songId) || 0) >= Number(rule.count || 0)
  }
  if (rule.type === 'minPracticeCountOnSongToday') {
    return (context.todayPracticeCountBySong.get(rule.songId) || 0) >= Number(rule.count || 0)
  }
  if (rule.type === 'minScoreOnSongToday') {
    return context.practiceSessions.some((session) => (
      session.songId === rule.songId
      && toDateKey(session.timestamp || 0) === context.todayKey
      && Number(session.score ?? session.averageScore ?? 0) >= Number(rule.minScore || 0)
    ))
  }
  if (rule.type === 'analysisVisited') {
    return context.viewedAnalysisSongIds.includes(rule.songId)
  }
  if (rule.type === 'analysisVisitedToday') {
    return context.analysisVisitLog.includes(`${rule.songId}@${context.todayKey}`)
  }
  if (rule.type === 'passedJourneyQuiz') {
    return context.quizPassStageIds.includes(rule.stageId)
  }
  if (rule.type === 'passedJourneyQuizToday') {
    return context.quizPassLog.includes(`${rule.stageId}@${context.todayKey}`)
  }
  if (rule.type === 'minStudyDays') {
    return context.profile.studyDays >= Number(rule.count || 0)
  }
  if (rule.type === 'publishedWorkCount') {
    return context.publishedWorksCount >= Number(rule.count || 0)
  }
  if (rule.type === 'composite') {
    return Array.isArray(rule.rules) && rule.rules.every((item) => evaluateRule(item, context))
  }
  return false
}

export function getStudyLevel(exp = 0) {
  const totalExp = Math.max(0, Math.floor(Number(exp || 0)))
  const level = Math.floor(totalExp / LEVEL_STEP_EXP) + 1
  const levelStartExp = (level - 1) * LEVEL_STEP_EXP
  const nextLevelExp = level * LEVEL_STEP_EXP
  const expIntoLevel = totalExp - levelStartExp
  const progressPercent = Math.max(0, Math.min(100, Math.round((expIntoLevel / LEVEL_STEP_EXP) * 100)))
  return {
    level,
    totalExp,
    levelStartExp,
    nextLevelExp,
    expIntoLevel,
    remainingExp: Math.max(0, nextLevelExp - totalExp),
    progressPercent
  }
}

export function getStudyTitle(level = 1) {
  const current = [...titleMilestones].reverse().find((item) => level >= item.level) || titleMilestones[0]
  const next = titleMilestones.find((item) => item.level > level) || null
  return {
    currentTitle: current.title,
    currentSummary: current.summary,
    currentLevel: current.level,
    nextTitle: next?.title || '',
    nextLevel: next?.level || null,
    nextSummary: next?.summary || '',
    levelsUntilNext: next ? Math.max(0, next.level - level) : 0
  }
}

function buildExpBreakdown({
  scoreExp = 0,
  repertoireExp = 0,
  diligenceExp = 0,
  journeyExp = 0,
  publishedWorksCount = 0
} = {}) {
  return [
    {
      id: 'practice',
      label: '练唱成绩',
      value: scoreExp,
      description: '按每首曲目的最高等级折算经验。'
    },
    {
      id: 'journey',
      label: '闯关进度',
      value: journeyExp,
      description: '完成地图关卡与知识闯关获得经验。'
    },
    {
      id: 'repertoire',
      label: '曲目见识',
      value: repertoireExp,
      description: '每解锁并完成一首可评分曲目都会累计。'
    },
    {
      id: 'diligence',
      label: '连学天数',
      value: diligenceExp,
      description: '连续来学戏会稳定增加基础经验。'
    },
    {
      id: 'publish',
      label: '发布加成',
      value: publishedWorksCount > 0 ? Math.min(16, publishedWorksCount * 4) : 0,
      description: publishedWorksCount > 0
        ? '发布作品会解锁礼物权益与展示机会。'
        : '发布作品不直接算等级经验，但会解锁互动权益。'
    }
  ]
}

function buildNextLevelHint(levelSummary, titleSummary) {
  const remainingExp = Number(levelSummary?.remainingExp || 0)
  const hints = []

  if (remainingExp <= 0) {
    hints.push('当前等级经验已满，可以继续拉开下一段差距。')
  } else {
    hints.push(`再拿 ${remainingExp} 点经验就能升到 Lv.${Number(levelSummary?.level || 1) + 1}。`)
  }

  if (titleSummary?.nextTitle && titleSummary?.levelsUntilNext > 0) {
    hints.push(`距离“${titleSummary.nextTitle}”还差 ${titleSummary.levelsUntilNext} 级。`)
  }

  hints.push('经验主要来自练唱拿分、地图闯关、发布作品和持续来学。')
  return hints.join('')
}

export async function touchStudyVisit(identity, now = Date.now()) {
  if (!identity?.getProfile || !identity?.saveProfile) return null
  const today = toDateKey(now)
  const profile = identity.getProfile()
  if (profile.lastStudyVisitOn === today) return profile
  return await identity.saveProfile({
    studyDays: Number(profile.studyDays || 0) + 1,
    lastStudyVisitOn: today
  })
}

export async function recordAnalysisVisit(identity, songId, now = Date.now()) {
  const normalizedSongId = String(songId || '').trim()
  if (!identity?.getProfile || !identity?.saveProfile || !normalizedSongId) return null
  const profile = identity.getProfile()
  const viewed = unique([...(profile?.journey?.viewedAnalysisSongIds || []), normalizedSongId])
  const todayKey = toDateKey(now)
  const visitLog = unique([...(profile?.journey?.analysisVisitLog || []), `${normalizedSongId}@${todayKey}`]).slice(-40)
  return await identity.saveProfile({
    journey: {
      ...profile.journey,
      viewedAnalysisSongIds: viewed,
      analysisVisitLog: visitLog
    }
  })
}

export async function submitJourneyQuiz(identity, stageId, answers = {}, now = Date.now()) {
  const stage = journeyStages.find((item) => item.id === stageId)
  const quiz = stage?.quiz
  if (!quiz) {
    return {
      passed: false,
      correctCount: 0,
      total: 0,
      passCount: 0,
      questionResults: []
    }
  }

  const responseMap = answers && typeof answers === 'object' ? answers : {}
  const questionResults = quiz.questions.map((question) => {
    const selectedAnswer = String(responseMap[question.id] || '').trim()
    const isCorrect = selectedAnswer === question.correctAnswer
    return {
      id: question.id,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation || ''
    }
  })
  const correctCount = questionResults.filter((item) => item.isCorrect).length
  const total = quiz.questions.length
  const passCount = Number(quiz.passCount || total)
  const passed = correctCount >= passCount

  if (passed && identity?.getProfile && identity?.saveProfile) {
    const todayKey = toDateKey(now)
    const profile = identity.getProfile()
    await identity.saveProfile({
      journey: {
        ...profile.journey,
        quizPassStageIds: normalizeKnownStageIds([...(profile?.journey?.quizPassStageIds || []), stageId]),
        quizPassLog: unique([...(profile?.journey?.quizPassLog || []), `${stageId}@${todayKey}`]).slice(-80)
      }
    })
  }

  return {
    passed,
    correctCount,
    total,
    passCount,
    questionResults
  }
}

export async function getStudyExpSummary(uid, infra) {
  const identity = infra?.identity
  const profile = identity?.getProfile ? identity.getProfile() : null
  const practiceSessions = await infra.practice.listPracticeSessions(uid)
  const publishedWorks = await infra.works.listWorks({ userId: uid, includeDeleted: false })
  const scoredSessions = practiceSessions.filter((session) => Number(session?.score ?? session?.averageScore ?? 0) > 0)
  const historyIndex = buildHistoryIndex(scoredSessions)
  const scoredSongIds = unique(scoredSessions.map((session) => session.songId))

  const scoreExp = scoredSongIds.reduce((sum, songId) => {
    const grade = historyIndex.bestGradeBySong.get(songId) || 'C'
    return sum + scoreToExp(grade)
  }, 0)

  const repertoireExp = scoredSongIds.length * 25
  const diligenceExp = Number(profile?.studyDays || 0) * 8
  const clearedStageIds = normalizeKnownStageIds(profile?.journey?.clearedStageIds || [])
  const quizPassStageIds = normalizeKnownStageIds(profile?.journey?.quizPassStageIds || [])
  const quizPassLog = unique(profile?.journey?.quizPassLog || []).slice(-80)
  const journeyExp = clearedStageIds.length * 40
  const totalExp = scoreExp + repertoireExp + diligenceExp + journeyExp
  const levelSummary = getStudyLevel(totalExp)
  const titleSummary = getStudyTitle(levelSummary.level)
  const expBreakdown = buildExpBreakdown({
    scoreExp,
    repertoireExp,
    diligenceExp,
    journeyExp,
    publishedWorksCount: publishedWorks.length
  })
  const nextLevelHint = buildNextLevelHint(levelSummary, titleSummary)
  const giftProfile = applyGiftEntitlements(
    profile || {},
    buildGiftEntitlements({
      level: levelSummary.level,
      scoredSongIds,
      publishedWorksCount: publishedWorks.length,
      journey: {
        clearedStageIds,
        quizPassStageIds
      }
    })
  )
  const todayKey = toDateKey()
  const context = {
    todayKey,
    profile: profile || {},
    practiceSessions: scoredSessions,
    publishedWorksCount: publishedWorks.length,
    clearedStageIds,
    quizPassStageIds,
    quizPassLog,
    viewedAnalysisSongIds: unique(profile?.journey?.viewedAnalysisSongIds || []),
    analysisVisitLog: unique(profile?.journey?.analysisVisitLog || []),
    ...historyIndex
  }

  const stages = journeyStages.map((stage, index) => {
    const isCleared = clearedStageIds.includes(stage.id)
    const isUnlocked = index === 0 ? true : evaluateRule(stage.unlockRule, context)
    const isClearable = isUnlocked && evaluateRule(stage.clearRule, context)
    const route = stageTargetRoute(stage)
    const song = getLearnSongById(stage.songId)
    const master = getMasterProfile(stage.masterId)
    return {
      ...stage,
      route,
      supportRoute: stageSupportRoute(stage),
      song,
      master,
      isUnlocked,
      isCleared,
      isClearable,
      status: isCleared ? 'cleared' : (isUnlocked ? 'active' : 'locked')
    }
  })

  const activeStage = stages.find((stage) => stage.status === 'active') || stages[stages.length - 1]
  const latestPractice = practiceSessions[0] || null

  return {
    profile,
    practiceSessions,
    publishedWorks,
    scoreExp,
    repertoireExp,
    diligenceExp,
    journeyExp,
    totalExp,
    scoredSongIds,
    publishedWorksCount: publishedWorks.length,
    level: levelSummary.level,
    progressPercent: levelSummary.progressPercent,
    expIntoLevel: levelSummary.expIntoLevel,
    nextLevelExp: levelSummary.nextLevelExp,
    remainingExp: levelSummary.remainingExp,
    expBreakdown,
    nextLevelHint,
    title: titleSummary.currentTitle,
    titleSummary,
    latestPractice,
    giftProfile,
    journey: {
      clearedStageIds,
      quizPassStageIds,
      activeStage,
      stages
    },
    historyIndex
  }
}

export async function syncJourneyProgress(identity, infra) {
  if (!identity?.getProfile || !identity?.saveProfile) return await getStudyExpSummary(identity?.getUid?.() || '', infra)
  const uid = identity.getUid()
  const summary = await getStudyExpSummary(uid, infra)
  const rawCleared = unique(summary.profile?.journey?.clearedStageIds || [])
  const currentCleared = normalizeKnownStageIds(rawCleared)
  const autoCleared = summary.journey.stages
    .filter((stage) => stage.isClearable || stage.isCleared)
    .map((stage) => stage.id)
  const mergedCleared = unique([...currentCleared, ...autoCleared])
  const newlyClearedIds = mergedCleared.filter((id) => !currentCleared.includes(id))

  if (newlyClearedIds.length || rawCleared.length !== currentCleared.length) {
    await identity.saveProfile({
      journey: {
        ...summary.profile.journey,
        clearedStageIds: mergedCleared,
        lastStageId: mergedCleared[mergedCleared.length - 1] || ''
      }
    })
  }

  const nextSummary = newlyClearedIds.length ? await getStudyExpSummary(uid, infra) : summary
  const shouldSyncGiftProfile = isGiftProfileChanged(nextSummary.profile || {}, nextSummary.giftProfile || {})

  if (shouldSyncGiftProfile) {
    await identity.saveProfile({
      giftBalance: nextSummary.giftProfile.giftBalance,
      dailyGiftCap: nextSummary.giftProfile.dailyGiftCap,
      perSendCap: nextSummary.giftProfile.perSendCap,
      lifetimeEarned: nextSummary.giftProfile.lifetimeEarned,
      giftLedgerSummary: nextSummary.giftProfile.giftLedgerSummary,
      dailyGiftUsage: nextSummary.giftProfile.dailyGiftUsage
    })
  }

  return {
    ...nextSummary,
    journey: {
      ...nextSummary.journey,
      newlyClearedIds
    }
  }
}

export function getDailyChallenge(summary, now = Date.now()) {
  const challenge = dailyChallengeTemplates[Math.abs(Math.floor(now / 86400000)) % dailyChallengeTemplates.length]
  const isCompleted = evaluateRule(challenge.completeWhen, {
    todayKey: toDateKey(now),
    profile: summary.profile || {},
    practiceSessions: summary.practiceSessions || [],
    publishedWorksCount: summary.publishedWorksCount || 0,
    clearedStageIds: summary.journey?.clearedStageIds || [],
    quizPassStageIds: summary.journey?.quizPassStageIds || [],
    quizPassLog: summary.profile?.journey?.quizPassLog || [],
    viewedAnalysisSongIds: summary.profile?.journey?.viewedAnalysisSongIds || [],
    analysisVisitLog: summary.profile?.journey?.analysisVisitLog || [],
    ...(summary.historyIndex || buildHistoryIndex(summary.practiceSessions || []))
  })
  return {
    ...challenge,
    song: getLearnSongById(challenge.songId),
    route: songTargetRoute(challenge.songId, challenge.taskType),
    isCompleted
  }
}

export function getQuickStartTarget(summary, dailyChallenge) {
  if (dailyChallenge && !dailyChallenge.isCompleted) {
    return {
      label: `继续 ${dailyChallenge.title}`,
      route: dailyChallenge.route
    }
  }

  const nextStage = summary?.journey?.stages?.find((stage) => stage.status === 'active')
  if (nextStage) {
    const label = nextStage.taskType === 'quiz'
      ? `去答 ${nextStage.title}`
      : nextStage.taskType === 'publish'
        ? '去发布作品'
        : `前往 ${nextStage.title}`
    return {
      label,
      route: nextStage.route
    }
  }

  if (summary?.latestPractice?.songId) {
    return {
      label: '继续上次练唱',
      route: songTargetRoute(summary.latestPractice.songId, 'score')
    }
  }

  return {
    label: '默认推荐《天仙配》',
    route: songTargetRoute('tianxianpei-fuqishuangshuang', 'score')
  }
}
