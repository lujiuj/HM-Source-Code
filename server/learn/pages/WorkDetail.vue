<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LearnAvatarPreset from '../components/common/LearnAvatarPreset.vue'
import DanmakuContainer from '../components/work/DanmakuContainer.vue'
import GiftBurstOverlay from '../components/work/GiftBurstOverlay.vue'
import WorkPerformancePanel from '../components/work/WorkPerformancePanel.vue'
import WorkStatsPanel from '../components/work/WorkStatsPanel.vue'
import { getInfra } from '../../shared/infra/index.js'
import { canSendGift, consumeGiftBalance } from '../utils/giftEconomy.js'
import { formatRelativeTime, getLearnSongById } from '../utils/learnCatalog.js'
import { syncJourneyProgress } from '../utils/studyProgress.js'
import { normalizeAnalysisV2 } from '../utils/analysisV2.js'
import {
  buildOwnerReviewFallback,
  buildOwnerReviewPayload,
  resolveLearnApiEndpoint,
  resolveOwnerReviewError,
  resolveTtsFeedback
} from '../utils/workDetailAi.js'
import {
  cloneDemo,
  isDemoRouteId,
  resolveDemoInteractions,
  resolveDemoWork
} from '../utils/learnDemoResolvers.js'

const route = useRoute()
const router = useRouter()
const infra = getInfra()
const uid = infra.identity.getUid()

const loading = ref(true)
const work = ref(null)
const comments = ref([])
const gifts = ref([])
const danmaku = ref([])
const commentText = ref('')
const danmakuText = ref('')
const commentError = ref('')
const danmakuError = ref('')
const audioRef = ref(null)
const teacherAudioRef = ref(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const resolvedMediaUrl = ref('')
const activeGiftBursts = ref([])
const comboState = ref({ count: 0, timer: null, lastType: '' })
const interactionSectionRef = ref(null)
const giftAmountInput = ref('1')
const giftError = ref('')
const interactionTab = ref('comment')
const ownerUnreadCount = ref(0)
const ownerReviewOpen = ref(false)
const videoRef = ref(null)
const selectedGiftType = ref('flower')
const videoUnavailable = ref(false)

const profileState = ref(infra.identity.getProfile())
const ownerAiState = ref({
  loading: false,
  error: '',
  data: null,
  unavailable: false
})
// removed

const teacherVoiceState = ref({
  loading: false,
  error: '',
  available: false,
  audioUrl: '',
  reason: '',
  text: ''
})

const giftOptions = [
  { type: 'flower', label: '鲜花', icon: 'local_florist', desc: '送一句鼓励' },
  { type: 'tea', label: '敬茶', icon: 'emoji_food_beverage', desc: '送一份捧场' },
  { type: 'cheer', label: '喝彩', icon: 'celebration', desc: '送一波热度' }
]

const isDemoMode = computed(() => isDemoRouteId(route.params.workId) || Boolean(work.value?.isDemo))
const readOnlyMode = computed(() => isDemoMode.value)

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function clampInt(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.round(number)))
}

function isImageAvatar(value) {
  return /^(data:image\/|blob:|https?:\/\/|\/assets\/)/.test(String(value || '').trim())
}

function isPresetAvatar(value) {
  return String(value || '').startsWith('preset:')
}

function isRenderableImageAvatar(value) {
  const text = String(value || '').trim()
  return Boolean(text) && !isPresetAvatar(text)
}

function isLikelyVideoUrl(value) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(String(value || '').trim())
}

function formatClock(value) {
  const raw = Number(value || 0)
  if (!Number.isFinite(raw) || raw < 0) return '0:00'
  const total = Math.floor(raw)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function giftLabel(type) {
  return giftOptions.find((item) => item.type === type)?.label || '喝彩'
}

function giftIcon(type) {
  return giftOptions.find((item) => item.type === type)?.icon || 'celebration'
}

function isSameDimension(candidate = {}, target = {}) {
  const candidateKey = safeText(candidate?.key)
  const targetKey = safeText(target?.key)
  if (candidateKey && targetKey) return candidateKey === targetKey
  const candidateLabel = safeText(candidate?.label)
  const targetLabel = safeText(target?.label)
  return Boolean(candidateLabel && targetLabel && candidateLabel === targetLabel)
}

const songMeta = computed(() => getLearnSongById(work.value?.songId))
const cleanSongTitle = computed(() => songMeta.value?.title || work.value?.songName || '黄梅选段')
const performerName = computed(() => {
  if (work.value?.userId === uid) return profileState.value?.displayName || infra.identity.getProfile()?.displayName || work.value?.avatarSnapshot?.displayName || work.value?.username || '戏友'
  if (work.value?.avatarSnapshot?.displayName) return work.value.avatarSnapshot.displayName
  if (work.value?.username) return work.value.username
  return '戏友'
})
const performerAvatar = computed(() => {
  if (work.value?.userId === uid) return profileState.value?.avatar || infra.identity.getProfile()?.avatar || work.value?.avatarSnapshot?.avatar || ''
  if (work.value?.avatarSnapshot?.avatar) return work.value.avatarSnapshot.avatar
  return ''
})
const isOwner = computed(() => work.value?.userId === uid || isDemoMode.value)
const baseAnalysis = computed(() => {
  if (!work.value?.analysisV2) return null
  return normalizeAnalysisV2(work.value.analysisV2)
})
const progress = computed(() => (duration.value ? currentTime.value / duration.value : 0))
const currentTimeText = computed(() => formatClock(currentTime.value))
const durationText = computed(() => formatClock(duration.value))
const heroVideoUrl = computed(() => {
  const directVideo = [work.value?.mvUrl, resolvedMediaUrl.value]
    .map((item) => safeText(item))
    .find((item) => isLikelyVideoUrl(item))
  return directVideo || ''
})
const prefersAudioPlayback = computed(() => Boolean(resolvedMediaUrl.value && !isLikelyVideoUrl(resolvedMediaUrl.value) && !heroVideoUrl.value))
const audioSurfaceUrl = computed(() => (prefersAudioPlayback.value ? resolvedMediaUrl.value : (isLikelyVideoUrl(resolvedMediaUrl.value) ? resolvedMediaUrl.value : '')))
const videoSurfaceUrl = computed(() => {
  if (prefersAudioPlayback.value) return ''
  return heroVideoUrl.value || ''
})
const showVideoSurface = computed(() => Boolean(videoSurfaceUrl.value) && !videoUnavailable.value)
const heroCoverUrl = computed(() => {
  return work.value?.heroImage
    || work.value?.bannerImage
    || work.value?.galleryCover
    || work.value?.timelineCover
    || work.value?.coverUrl
    || songMeta.value?.heroImage
    || songMeta.value?.bannerImage
    || songMeta.value?.galleryCover
    || songMeta.value?.timelineCover
    || songMeta.value?.cover
    || ''
})
/* ── Video playback computed (template expects these) ── */
const videoTime = computed(() => currentTime.value)
const videoDuration = computed(() => duration.value)
const progressPercent = computed(() => videoDuration.value ? (videoTime.value / videoDuration.value) * 100 : 0)
const formatTime = formatClock
const recentComments = computed(() => [...comments.value].sort((a, b) => Number(b.timestamp || b.createdAt || 0) - Number(a.timestamp || a.createdAt || 0)).slice(0, 20))
const danmakuList = computed(() => danmaku.value)
const scoringMode = computed(() => (work.value?.pitchRecords?.length ? 'pitch' : 'none'))
const giftTotal = computed(() => gifts.value.reduce((sum, gift) => sum + Number(gift.count || 1), 0))
const giftTotalsByType = computed(() => {
  return giftOptions.map((option) => ({
    ...option,
    count: gifts.value
      .filter((gift) => gift.type === option.type)
      .reduce((sum, gift) => sum + Number(gift.count || 1), 0)
  })).sort((a, b) => b.count - a.count)
})
const recentGifts = computed(() => [...gifts.value].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 6))
const recentDanmaku = computed(() => [...danmaku.value].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 8))
const heroDanmaku = computed(() => recentDanmaku.value.slice(0, 3))
const giftAmount = computed(() => clampInt(giftAmountInput.value, 0, 9999))
const giftVerdict = computed(() => canSendGift(profileState.value, giftAmount.value))
const ownerReviewPayload = computed(() => buildOwnerReviewPayload(work.value || {}, resolvedMediaUrl.value))
const ownerReviewFallback = computed(() => buildOwnerReviewFallback(work.value || {}))
const publishOwnerReviewSnapshot = computed(() => {
  const snapshot = work.value?.publishAiAnalysis?.ownerReviewSnapshot
  return snapshot && typeof snapshot === 'object' ? snapshot : null
})
const ownerReviewSource = computed(() => ownerAiState.value.data || publishOwnerReviewSnapshot.value || null)
const ownerReviewData = computed(() => ownerReviewSource.value?.finalAdvice || null)
const ownerObjectiveAnalysis = computed(() => ownerReviewSource.value?.objectiveAnalysis || null)
const ownerAudioInsights = computed(() => ownerReviewSource.value?.audioInsights || null)
const ownerMasterRecall = computed(() => ownerReviewSource.value?.masterRecall || null)
const ownerReviewAnalysis = computed(() => ownerObjectiveAnalysis.value?.analysisV2 || baseAnalysis.value)
const ownerReviewScore = computed(() => Number(ownerObjectiveAnalysis.value?.overallScore || work.value?.score || work.value?.averageScore || 0))
const ownerReviewGrade = computed(() => ownerObjectiveAnalysis.value?.overallGrade || work.value?.grade || 'C')
const ownerReviewConfidence = computed(() => Math.round(Number(ownerObjectiveAnalysis.value?.confidence || 0) * 100))
const ownerReviewStrongest = computed(() => ownerObjectiveAnalysis.value?.strongestDimensions?.[0] || null)
const ownerReviewWeakest = computed(() => ownerReviewData.value?.weakestDimension || ownerObjectiveAnalysis.value?.weakestDimensions?.[0] || ownerReviewFallback.value?.weakestDimension || null)
const ownerReviewDimensions = computed(() => {
  const dimensions = Array.isArray(ownerReviewAnalysis.value?.dimensions) ? ownerReviewAnalysis.value.dimensions : []
  return dimensions.map((item) => {
    const value = clampInt(item?.value, 0, 100)
    const strongest = isSameDimension(item, ownerReviewStrongest.value)
    const weakest = isSameDimension(item, ownerReviewWeakest.value)
    return {
      ...item,
      value,
      emphasis: weakest ? 'weak' : (strongest ? 'strong' : 'normal'),
      badge: weakest ? '优先回练' : (strongest ? '当前最稳' : ''),
      summary: weakest
        ? safeText(ownerReviewWeakest.value?.suggestion || ownerReviewWeakest.value?.reason || item?.hint || item?.note)
        : safeText(item?.note || item?.hint, '继续保持这一维的稳定度。')
    }
  })
})
const ownerReviewLines = computed(() => {
  if (Array.isArray(ownerReviewData.value?.lineIssues) && ownerReviewData.value.lineIssues.length) {
    return ownerReviewData.value.lineIssues.slice(0, 3)
  }
  if (Array.isArray(ownerObjectiveAnalysis.value?.lineHighlights) && ownerObjectiveAnalysis.value.lineHighlights.length) {
    return ownerObjectiveAnalysis.value.lineHighlights.slice(0, 3).map((item) => ({
      lineIndex: item.lineIndex,
      lineText: item.lineText,
      issue: item.issue,
      tip: item.tip
    }))
  }
  return ownerReviewFallback.value?.lineIssues || []
})
const ownerReviewNextSteps = computed(() => {
  if (Array.isArray(ownerReviewData.value?.nextSteps) && ownerReviewData.value.nextSteps.length) {
    return ownerReviewData.value.nextSteps.slice(0, 3)
  }
  return ownerReviewFallback.value?.nextSteps || []
})
const ownerReviewHeadline = computed(() => {
  if (ownerReviewData.value?.overallJudgement) return ownerReviewData.value.overallJudgement
  if (ownerAiState.value.unavailable) return ownerReviewFallback.value?.overallJudgement || ''
  return ''
})
const publicAiHeadline = computed(() => {
  if (ownerReviewHeadline.value) return ownerReviewHeadline.value
  return safeText(
    work.value?.publishAiAnalysis?.finalAdvice?.overallJudgement
      || work.value?.publishAiAnalysis?.overallJudgement
      || work.value?.publishAiAnalysis?.summary,
    '这条唱段整体完成度不错，建议继续打磨咬字与气息稳定度。'
  )
})
const publicAiWeakest = computed(() => {
  if (ownerReviewWeakest.value?.label) return ownerReviewWeakest.value
  const dimensions = Array.isArray(baseAnalysis.value?.dimensions) ? [...baseAnalysis.value.dimensions] : []
  if (dimensions.length) {
    const weakest = dimensions
      .map((item) => ({
        ...item,
        value: clampInt(item?.value, 0, 100)
      }))
      .sort((a, b) => a.value - b.value)[0]
    return {
      label: weakest?.label || '最弱维度',
      suggestion: safeText(weakest?.note || weakest?.hint, '先拆句慢练，再回到整段。')
    }
  }
  return {
    label: '最该改什么',
    suggestion: '逐句拆练，稳步提升'
  }
})
const publicReviewDimensions = computed(() => {
  if (Array.isArray(baseAnalysis.value?.dimensions)) return baseAnalysis.value.dimensions
  return []
})
const publicStrongest = computed(() => {
  if (!publicReviewDimensions.value.length) return null
  return [...publicReviewDimensions.value]
    .map((item) => ({
      ...item,
      value: clampInt(item?.value, 0, 100)
    }))
    .sort((a, b) => b.value - a.value)[0] || null
})
const workSummary = computed(() => safeText(
  work.value?.summaryCopy || songMeta.value?.summary || songMeta.value?.description,
  '这段唱词适合先稳字头，再顺气口，最后把人物关系唱圆。'
))
const workTagList = computed(() => {
  const tags = []
  if (songMeta.value?.operaName) tags.push(songMeta.value.operaName)
  ;(songMeta.value?.tags || []).forEach((tag) => {
    if (!tag || tags.includes(tag) || tags.length >= 4) return
    tags.push(tag)
  })
  if (work.value?.grade && tags.length < 4) {
    tags.push(`${work.value.grade} 级呈现`)
  }
  return tags
})
const stageBriefStats = computed(() => ([
  {
    label: '综合评分',
    value: work.value ? `${clampInt(work.value?.score || work.value?.averageScore, 0, 100)} 分` : '--'
  },
  {
    label: '发布时间',
    value: work.value ? formatRelativeTime(work.value?.createdAt || work.value?.timestamp || 0) : '--'
  },
  {
    label: 'AI关注点',
    value: publicAiWeakest.value?.label || '继续稳住'
  },
  {
    label: '当前模式',
    value: isOwner.value ? '我的复盘视角' : '公开展演视角'
  }
]))
const ownerReviewStatusText = computed(() => {
  if (ownerAiState.value.loading) return '正在分析'
  return ''
})
const teacherVoiceHint = computed(() => {
  if (teacherVoiceState.value.loading) return '准备中'
  if (teacherVoiceState.value.error) return teacherVoiceState.value.error
  return ''
})
const teacherVoiceButtonText = computed(() => {
  if (teacherVoiceState.value.loading) return '老师备课中…'
  if (teacherVoiceState.value.available && teacherVoiceState.value.audioUrl) return '再听一遍'
  return '听老师讲一遍'
})
const ownerAudioSummary = computed(() => safeText(ownerAudioInsights.value?.insights?.summary))
const ownerAudioDetailCards = computed(() => {
  const insights = ownerAudioInsights.value?.insights || {}
  const items = [
    { label: '音色', text: safeText(insights.timbre) },
    { label: '咬字', text: safeText(insights.diction) },
    { label: '气息', text: safeText(insights.breath) },
    { label: '情绪', text: safeText(insights.emotion) }
  ]
  return items.filter((item) => item.text).slice(0, 4)
})
const ownerRecallFragments = computed(() => (
  Array.isArray(ownerMasterRecall.value?.fragments) ? ownerMasterRecall.value.fragments.slice(0, 3) : []
))
const ownerRecallRecommendations = computed(() => (
  Array.isArray(ownerMasterRecall.value?.recommendations) ? ownerMasterRecall.value.recommendations.slice(0, 4) : []
))

function snapshotActor(profile = {}) {
  return {
    userId: uid,
    username: profile.displayName || '戏友',
    avatar: profile.avatar || ''
  }
}

function resetTeacherVoice() {
  if (teacherAudioRef.value) {
    teacherAudioRef.value.pause()
    teacherAudioRef.value.currentTime = 0
  }
  teacherVoiceState.value = {
    loading: false,
    error: '',
    available: false,
    audioUrl: '',
    reason: '',
    text: ''
  }
}

function resetOwnerAiState() {
  ownerAiState.value = {
    loading: false,
    error: '',
    data: null,
    unavailable: false
  }
}

function normalizeCommentRecord(item = {}) {
  return {
    ...item,
    userName: item.userName || item.username || '戏友',
    userAvatar: item.userAvatar || item.avatar || '',
    content: item.content || item.text || '',
    createdAt: item.createdAt || item.timestamp || Date.now()
  }
}

function normalizeGiftRecord(item = {}) {
  return {
    ...item,
    userName: item.userName || item.username || '戏友',
    userAvatar: item.userAvatar || item.avatar || '',
    createdAt: item.createdAt || item.timestamp || Date.now()
  }
}

function normalizeDanmakuRecord(item = {}) {
  return {
    ...item,
    userName: item.userName || item.username || '戏友',
    userAvatar: item.userAvatar || item.avatar || '',
    content: item.content || item.text || '',
    createdAt: item.createdAt || item.timestamp || Date.now()
  }
}

function handleProfileUpdated(event) {
  const nextProfile = event?.detail && typeof event.detail === 'object'
    ? event.detail
    : infra.identity.getProfile()
  profileState.value = {
    ...profileState.value,
    ...nextProfile
  }
}

function handleProfileStorage(event) {
  if (event?.key && event.key !== 'hmx_learn_profile_v2' && event.key !== 'karaoke_display_name') return
  handleProfileUpdated({ detail: infra.identity.getProfile() })
}

function appendCommentRecord(record = {}) {
  comments.value = [...comments.value, normalizeCommentRecord(record)]
    .sort((a, b) => Number(a.timestamp || a.createdAt || 0) - Number(b.timestamp || b.createdAt || 0))
    .slice(-80)
}

function appendGiftRecord(record = {}) {
  gifts.value = [...gifts.value, normalizeGiftRecord(record)]
    .sort((a, b) => Number(b.timestamp || b.createdAt || 0) - Number(a.timestamp || a.createdAt || 0))
    .slice(0, 80)
}

function appendDanmakuRecord(record = {}) {
  danmaku.value = [...danmaku.value, normalizeDanmakuRecord(record)]
    .sort((a, b) => Number(a.timeMs || 0) - Number(b.timeMs || 0))
    .slice(-200)
}

function applyDemoOwnerReview(workItem) {
  const analysisV2 = cloneDemo(workItem?.analysisV2 || null)
  const publishAiAnalysis = cloneDemo(workItem?.publishAiAnalysis || null)
  ownerAiState.value = {
    loading: false,
    error: '',
    data: {
      finalAdvice: publishAiAnalysis,
      objectiveAnalysis: {
        analysisV2,
        overallScore: Number(workItem?.score || 0),
        overallGrade: workItem?.grade || 'B',
        confidence: 0.96,
        strongestDimensions: [],
        weakestDimensions: []
      },
      audioInsights: null
    },
    unavailable: false
  }
  teacherVoiceState.value = {
    loading: false,
    error: '',
    available: false,
    audioUrl: '',
    reason: 'demo-mode',
    text: ''
  }
}

async function loadDemoInteractionSnapshot(workId, ownerUserId = '') {
  const snapshot = resolveDemoInteractions(workId)
  comments.value = (snapshot.comments || []).map(normalizeCommentRecord)
  gifts.value = (snapshot.gifts || []).map(normalizeGiftRecord)
  danmaku.value = (snapshot.danmaku || []).map(normalizeDanmakuRecord)
  profileState.value = {
    ...infra.identity.getProfile(),
    giftBalance: 999
  }
  ownerUnreadCount.value = ownerUserId ? snapshot.comments.length : 0
}

async function playTeacherAudio() {
  if (!teacherAudioRef.value || !teacherVoiceState.value.audioUrl) return
  try {
    await teacherAudioRef.value.play()
  } catch (error) {
    teacherVoiceState.value = {
      ...teacherVoiceState.value,
      error: error instanceof Error ? error.message : '语音播放失败，请稍后重试。'
    }
  }
}

async function loadOwnerReview(force = false, payloadOverride = null) {
  if (readOnlyMode.value) return
  if (!isOwner.value) {
    resetOwnerAiState()
    resetTeacherVoice()
    return
  }

  const payload = payloadOverride || ownerReviewPayload.value

  if (!payload) {
    ownerAiState.value = {
      loading: false,
      error: '',
      data: null,
      unavailable: true
    }
    resetTeacherVoice()
    return
  }

  if (!force && publishOwnerReviewSnapshot.value) {
    ownerAiState.value = {
      loading: false,
      error: '',
      data: publishOwnerReviewSnapshot.value,
      unavailable: false
    }
    return
  }

  if (ownerAiState.value.loading && !force) return

  ownerAiState.value = {
    loading: true,
    error: '',
    data: ownerAiState.value.data,
    unavailable: false
  }

  try {
    const response = await fetch(resolveLearnApiEndpoint('/api/learn/audio-analysis'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ payload })
    })
    const json = await response.json()

    if (!response.ok || json?.unavailable || !json?.finalAdvice) {
      throw new Error(resolveOwnerReviewError(json?.error, json?.detail))
    }

    ownerAiState.value = {
      loading: false,
      error: '',
      data: json,
      unavailable: false
    }
  } catch (error) {
    ownerAiState.value = {
      loading: false,
      error: resolveOwnerReviewError(error instanceof Error ? error.message : '作者复盘请求失败。'),
      data: null,
      unavailable: false
    }
  }
}

async function loadInteractionSnapshot(workId, ownerUserId = '') {
  const [commentResult, giftResult, danmakuResult, summaryResult] = await Promise.allSettled([
    infra.interaction.listComments(workId, 50),
    infra.interaction.listGifts(workId, 50),
    infra.interaction.listDanmaku(workId, 30),
    syncJourneyProgress(infra.identity, infra)
  ])

  comments.value = commentResult.status === 'fulfilled' ? (commentResult.value || []).map(normalizeCommentRecord) : []
  gifts.value = giftResult.status === 'fulfilled' ? (giftResult.value || []).map(normalizeGiftRecord) : []
  danmaku.value = danmakuResult.status === 'fulfilled' ? (danmakuResult.value || []).map(normalizeDanmakuRecord) : []
  profileState.value = {
    ...infra.identity.getProfile(),
    ...((summaryResult.status === 'fulfilled' ? summaryResult.value?.giftProfile : null) || {})
  }

  if (ownerUserId) {
    try {
      const events = await infra.interaction.listInteractionEvents(ownerUserId, 200)
      ownerUnreadCount.value = events.filter((item) => !item.readAt).length
    } catch (error) {
      ownerUnreadCount.value = 0
      console.warn('[WorkDetail] Failed to load owner unread interaction count', error)
    }
  } else {
    ownerUnreadCount.value = 0
  }

  ;[
    ['comments', commentResult],
    ['gifts', giftResult],
    ['danmaku', danmakuResult],
    ['journey', summaryResult]
  ].forEach(([scope, result]) => {
    if (result.status === 'rejected') {
      console.warn(`[WorkDetail] Failed to load ${scope}`, result.reason)
    }
  })
}

async function requestTeacherVoice() {
  if (readOnlyMode.value) return
  const finalAdvice = ownerReviewData.value
  const voiceText = safeText(finalAdvice?.voiceoverText || ownerReviewHeadline.value)
  if (!voiceText || teacherVoiceState.value.loading) return

  if (teacherVoiceState.value.available && teacherVoiceState.value.audioUrl) {
    await playTeacherAudio()
    return
  }

  teacherVoiceState.value = {
    ...teacherVoiceState.value,
    loading: true,
    error: '',
    text: voiceText
  }

  try {
    const response = await fetch(resolveLearnApiEndpoint('/api/learn/tts'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        payload: {
          finalAdvice,
          voiceStyle: 'opera-teacher'
        }
      })
    })
    const json = await response.json()

    if (response.ok && json?.available && json?.audioUrl) {
      teacherVoiceState.value = {
        loading: false,
        error: '',
        available: true,
        audioUrl: json.audioUrl,
        reason: safeText(json.reason),
        text: safeText(json.text, voiceText)
      }
      await nextTick()
      await playTeacherAudio()
      return
    }

    teacherVoiceState.value = {
      loading: false,
      error: resolveTtsFeedback(json),
      available: false,
      audioUrl: '',
      reason: safeText(json?.reason),
      text: safeText(json?.text, voiceText)
    }
  } catch (error) {
    teacherVoiceState.value = {
      loading: false,
      error: resolveTtsFeedback({
        reason: 'request-failed',
        error: error instanceof Error ? error.message : '语音播报请求失败。'
      }),
      available: false,
      audioUrl: '',
      reason: 'request-failed',
      text: voiceText
    }
  }
}

async function loadData() {
  try {
    loading.value = true
    commentError.value = ''
    danmakuError.value = ''
    giftError.value = ''
    videoUnavailable.value = false
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0

    const workId = String(route.params.workId || '')
    if (isDemoMode.value) {
      const demoWork = resolveDemoWork(workId)
      work.value = demoWork && !demoWork.deletedAt ? demoWork : null
      if (!work.value) {
        resetOwnerAiState()
        resetTeacherVoice()
        return
      }

      resolvedMediaUrl.value = work.value.mediaUrl || work.value.mvUrl || ''
      await loadDemoInteractionSnapshot(workId, work.value?.userId || '')
      applyDemoOwnerReview(work.value)
    } else {
      const data = await infra.works.getWork(workId)
      work.value = data && !data.deletedAt ? data : null
      if (!work.value) {
        resetOwnerAiState()
        resetTeacherVoice()
        return
      }

      if (work.value.mediaId) {
        resolvedMediaUrl.value = (await infra.media.getMediaUrl(work.value.mediaId)) || work.value.mediaUrl || ''
      } else {
        resolvedMediaUrl.value = work.value.mediaUrl || ''
      }

      const interactionTask = loadInteractionSnapshot(workId, work.value?.userId || '')
      if (work.value.userId === uid) {
        const reviewPayload = buildOwnerReviewPayload(work.value, resolvedMediaUrl.value)
        void loadOwnerReview(false, reviewPayload)
        await interactionTask
      } else {
        resetOwnerAiState()
        resetTeacherVoice()
        await interactionTask
      }
    }

    if (route.query.focus === 'interactions') {
      await nextTick()
      interactionSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  } catch (error) {
    console.error('[WorkDetail] Failed to load page data.', error)
  } finally {
    loading.value = false
  }
}

async function submitComment() {
  if (readOnlyMode.value) return
  const text = safeText(commentText.value)
  if (!work.value || !text) return
  commentError.value = ''
  const profile = infra.identity.getProfile()
  try {
    const payload = {
      workId: work.value.id,
      userId: uid,
      username: profile.displayName || '戏友',
      avatar: profile.avatar || '',
      actorSnapshot: snapshotActor(profile),
      targetUserId: work.value.userId,
      text,
      replyTo: null,
      timestamp: Date.now()
    }
    const id = await infra.interaction.addComment(work.value.id, payload)
    appendCommentRecord({ ...payload, id })
    commentText.value = ''
  } catch (error) {
    commentError.value = error instanceof Error ? error.message : '评论发送失败。'
  }
}

async function submitDanmaku() {
  if (readOnlyMode.value) return
  const text = safeText(danmakuText.value)
  if (!work.value || !text) return
  danmakuError.value = ''
  const profile = infra.identity.getProfile()
  try {
    const payload = {
      workId: work.value.id,
      userId: uid,
      username: profile.displayName || '戏友',
      avatar: profile.avatar || '',
      actorSnapshot: snapshotActor(profile),
      targetUserId: work.value.userId,
      text,
      timestamp: Date.now(),
      timeMs: Math.round(currentTime.value * 1000)
    }
    const id = await infra.interaction.sendDanmaku(work.value.id, payload)
    appendDanmakuRecord({ ...payload, id })
    danmakuText.value = ''
  } catch (error) {
    danmakuError.value = error instanceof Error ? error.message : '弹幕发送失败。'
  }
}

function queueGiftBurst(type, count, combo = 0) {
  const id = `burst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const mega = count >= 50
  const big = count >= 10
  activeGiftBursts.value = [...activeGiftBursts.value, { id, type, count, combo, mega, big }]
  const lifetime = mega ? 3500 : big ? 2800 : 2200
  window.setTimeout(() => {
    activeGiftBursts.value = activeGiftBursts.value.filter((item) => item.id !== id)
  }, lifetime)
}

function playGiftTimeline(type, count, combo = 0) {
  const total = Number(count || 1)
  const waves = total >= 99 ? 9 : total >= 24 ? 4 : total >= 9 ? 3 : 1
  for (let index = 1; index <= waves; index += 1) {
    const shownCount = index === waves ? total : Math.max(1, Math.round((total / waves) * index))
    window.setTimeout(() => {
      queueGiftBurst(type, shownCount, combo)
    }, (index - 1) * 180)
  }
}

async function sendGift(type) {
  if (readOnlyMode.value) return
  if (!work.value) return
  const count = giftAmount.value
  const profile = infra.identity.getProfile()
  const previousProfileState = { ...profileState.value }
  const verdict = canSendGift(profileState.value, count)
  if (!verdict.ok) {
    giftError.value = verdict.reason
    return
  }

  const consumeResult = consumeGiftBalance(profileState.value, count)
  if (!consumeResult.ok) {
    giftError.value = consumeResult.reason
    return
  }

  giftError.value = ''
  profileState.value = {
    ...profileState.value,
    ...consumeResult.profile
  }
  await infra.identity.saveProfile(consumeResult.profile)

  try {
    const payload = {
      workId: work.value.id,
      userId: uid,
      username: profile.displayName || '戏友',
      avatar: profile.avatar || '',
      actorSnapshot: snapshotActor(profile),
      targetUserId: work.value.userId,
      type,
      count,
      timestamp: Date.now()
    }
    const id = await infra.interaction.sendGift(work.value.id, payload)
    appendGiftRecord({ ...payload, id })
    // Combo tracking: increment if same type within 2s
    if (comboState.value.timer) clearTimeout(comboState.value.timer)
    const nextCombo = (comboState.value.lastType === type) ? comboState.value.count + 1 : 1
    comboState.value = {
      count: nextCombo,
      lastType: type,
      timer: setTimeout(() => { comboState.value = { count: 0, timer: null, lastType: '' } }, 2000)
    }
    playGiftTimeline(type, count, nextCombo)
  } catch (error) {
    profileState.value = previousProfileState
    await infra.identity.saveProfile(previousProfileState).catch(() => {})
    giftError.value = error instanceof Error ? error.message : '送礼失败。'
  }
}

async function softDelete() {
  if (readOnlyMode.value) return
  if (!work.value) return
  if (!window.confirm(`确认删除「${cleanSongTitle.value}」这条作品吗？`)) return
  await infra.works.softDeleteWork(work.value.id, Date.now())
  router.push('/learn/works')
}

function goBack() {
  router.push('/learn/works')
}

function wantToSing() {
  const song = getLearnSongById(work.value?.songId)
  if (song?.isScorable) {
    router.push({ path: '/learn/practice/karaoke', query: { songId: song.id } })
    return
  }
  router.push({ path: '/learn/practice', query: work.value?.songId ? { songId: work.value.songId } : {} })
}

function scrollToInteractions() {
  interactionSectionRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

function toggleAudio() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    void audioRef.value.play()
  }
}

/* ── Video playback controls (template expects these) ── */
function togglePlay() {
  const el = videoRef.value || audioRef.value
  if (!el) return
  if (isPlaying.value) { el.pause() } else { void el.play() }
}
function seekVideo(event) {
  const el = videoRef.value || audioRef.value
  if (!el || !el.duration) return
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
  currentTime.value = el.currentTime
}
function onVideoPlay() { isPlaying.value = true }
function onVideoPause() { isPlaying.value = false }
function onVideoTimeUpdate(event) { currentTime.value = Number(event.target?.currentTime || 0) }
function onVideoEnded() { isPlaying.value = false }
function onVideoError(event) {
  videoUnavailable.value = true
  isPlaying.value = false
}
function submitGift() { sendGift(selectedGiftType.value) }

function onLoadedMetadata(event) {
  const val = Number(event.target?.duration || 0)
  duration.value = Number.isFinite(val) ? val : 0
}

function onTimeUpdate(event) {
  currentTime.value = Number(event.target?.currentTime || 0)
}

function handleAudioPlay() {
  isPlaying.value = true
}

function handleAudioPause() {
  isPlaying.value = false
}

function handleEnded() {
  isPlaying.value = false
}

onBeforeUnmount(() => {
  window.removeEventListener('learn-profile-updated', handleProfileUpdated)
  window.removeEventListener('storage', handleProfileStorage)
  resetTeacherVoice()
})

onMounted(() => {
  window.addEventListener('learn-profile-updated', handleProfileUpdated)
  window.addEventListener('storage', handleProfileStorage)
  void loadData()
})
</script>

<template>
  <div class="work-detail-page relative min-h-full bg-[#FDFBF7] font-display text-slate-900">
    <GiftBurstOverlay :bursts="activeGiftBursts" />

    <!-- Header -->
    <header class="sticky top-0 z-40 px-4 py-4">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-[26px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,252,246,0.92),rgba(248,239,228,0.88))] px-5 py-4 shadow-[0_18px_40px_rgba(92,59,35,0.12)] backdrop-blur-xl">
        <div class="flex items-center gap-4">
          <button class="rounded-full bg-white/80 p-2 text-[#a34135] shadow-sm transition-colors hover:bg-white" @click="goBack">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="flex flex-col">
            <h2 class="text-lg font-bold leading-tight text-slate-900">{{ cleanSongTitle }}</h2>
            <p class="text-xs text-slate-500">演唱: {{ performerName }}</p>
          </div>
        </div>
        <div class="flex gap-3">
          <button class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 transition-colors hover:bg-[#a34135]/14" @click="wantToSing">
            <span class="material-symbols-outlined text-xl">mic</span>
          </button>
          <button
            v-if="isOwner && !readOnlyMode"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-red-500 transition-colors hover:bg-red-100"
            @click="softDelete"
          >
            <span class="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex min-h-[60vh] items-center justify-center">
      <span class="material-symbols-outlined animate-spin text-5xl text-[#a34135]">progress_activity</span>
    </div>

    <!-- Not found -->
    <div v-else-if="!work" class="flex min-h-[60vh] flex-col items-center justify-center text-slate-400">
      <span class="material-symbols-outlined mb-4 text-6xl text-[#a34135]/30">search_off</span>
      <p class="mb-4 text-lg font-bold text-slate-500">作品不存在或已删除</p>
    </div>

    <!-- Main Content -->
    <main v-else class="mx-auto flex-1 w-full max-w-5xl p-4 space-y-6">

      <!-- Video Player -->
      <section class="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl group">
        <!-- Cover bg fallback -->
        <div
          v-if="heroCoverUrl && (!isPlaying || prefersAudioPlayback || !showVideoSurface)"
          class="absolute inset-0 bg-cover bg-center opacity-60"
          :style="{ backgroundImage: `url(${heroCoverUrl})` }"
        ></div>

        <audio
          v-if="audioSurfaceUrl"
          ref="audioRef"
          :src="audioSurfaceUrl"
          preload="metadata"
          class="hidden"
          @loadedmetadata="onLoadedMetadata"
          @timeupdate="onTimeUpdate"
          @play="handleAudioPlay"
          @pause="handleAudioPause"
          @ended="handleEnded"
        ></audio>

        <video
          v-if="showVideoSurface"
          ref="videoRef"
          :src="videoSurfaceUrl"
          class="absolute inset-0 h-full w-full object-contain"
          playsinline
          crossorigin="anonymous"
          preload="metadata"
          @loadedmetadata="onLoadedMetadata"
          @play="onVideoPlay"
          @pause="onVideoPause"
          @timeupdate="onVideoTimeUpdate"
          @ended="onVideoEnded"
          @error="onVideoError"
        ></video>

        <!-- Hidden audio for teacher voice -->
        <audio ref="teacherAudioRef" class="hidden"></audio>

        <!-- Danmaku layer -->
        <DanmakuContainer
          :is-playing="isPlaying"
          :current-time="videoTime"
          :danmakus="danmakuList"
          class="pointer-events-none absolute inset-0 z-20"
        />

        <!-- Play / Pause overlay -->
        <div
          class="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          @click.stop="togglePlay"
        >
          <button
            v-if="!isPlaying"
            class="size-20 bg-[#a34135] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
          >
            <span class="material-symbols-outlined text-5xl">play_arrow</span>
          </button>
        </div>

        <div v-if="prefersAudioPlayback" class="absolute left-4 top-4 z-20 rounded-full border border-white/16 bg-black/35 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-white/84 backdrop-blur-sm">
          录音回放
        </div>

        <!-- Control bar -->
        <div class="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-30">
          <div class="flex items-center gap-4 mb-2">
            <span class="text-xs text-white/80 font-mono">{{ formatTime(videoTime) }}</span>
            <div
              class="flex-1 h-1.5 bg-white/20 rounded-full relative cursor-pointer"
              @click="seekVideo"
            >
              <div class="absolute inset-y-0 left-0 bg-[#a34135] rounded-full" :style="{ width: progressPercent + '%' }"></div>
              <div
                class="absolute top-1/2 -translate-y-1/2 size-3 bg-white rounded-full shadow-md border-2 border-[#a34135]"
                :style="{ left: progressPercent + '%' }"
              ></div>
            </div>
            <span class="text-xs text-white/80 font-mono">{{ formatTime(videoDuration) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex gap-4">
              <span class="material-symbols-outlined text-white cursor-pointer hover:text-[#a34135]" @click.stop="togglePlay">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Performance Panel (pitch overlay) -->
      <WorkPerformancePanel
        v-if="scoringMode !== 'none'"
        :pitch-records="work.pitchRecords"
        :video-time="videoTime"
        :video-duration="videoDuration"
        :is-playing="isPlaying"
        :song-meta="songMeta"
      />

      <section class="interaction-composer sticky top-4 z-30">
        <div class="interaction-composer__shell mx-auto flex max-w-5xl flex-col gap-3 rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,237,226,0.94))] p-4 shadow-[0_18px_36px_rgba(92,59,35,0.12)] backdrop-blur-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold tracking-[0.16em] text-[#736D61]">
            <span>互动发送区</span>
            <span>当前播放 {{ currentTimeText }} / {{ durationText }}</span>
          </div>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div class="relative flex-1">
              <input
                v-model.trim="danmakuText"
                class="h-11 w-full rounded-xl border border-white/70 bg-white/90 pl-4 pr-16 text-sm outline-none focus:ring-2 focus:ring-[#a34135]/20"
                placeholder="看到这一句时，立刻发弹幕..."
                @keyup.enter="submitDanmaku"
              />
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1 text-sm font-bold text-[#a34135] transition hover:bg-[#a34135]/10"
                @click="submitDanmaku"
              >
                发送
              </button>
            </div>
            <div class="relative flex-1">
              <input
                v-model.trim="commentText"
                class="h-11 w-full rounded-xl border border-white/70 bg-white/90 pl-4 pr-16 text-sm outline-none focus:ring-2 focus:ring-[#a34135]/20"
                placeholder="写评论，记录这一段感受..."
                @keyup.enter="submitComment"
              />
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1 text-sm font-bold text-[#a34135] transition hover:bg-[#a34135]/10"
                @click="submitComment"
              >
                发布
              </button>
            </div>
          </div>
        </div>
        <p v-if="commentError" class="mx-auto mt-2 max-w-5xl text-xs text-rose-500">{{ commentError }}</p>
        <p v-if="danmakuError" class="mx-auto mt-1 max-w-5xl text-xs text-rose-500">{{ danmakuError }}</p>
      </section>

      <!-- Social action row -->
      <section class="flex flex-wrap items-center justify-between gap-4 px-2">
        <div class="flex items-center gap-6">
          <div class="flex flex-col items-center gap-1 group cursor-pointer" @click="interactionTab = 'gift'">
            <div class="p-3 bg-slate-100 rounded-xl group-hover:text-[#a34135] transition-colors">
              <span class="material-symbols-outlined">redeem</span>
            </div>
            <span class="text-xs font-bold">{{ giftTotal }}</span>
          </div>
          <div class="flex flex-col items-center gap-1 group cursor-pointer">
            <div class="p-3 bg-slate-100 rounded-xl group-hover:text-[#a34135] transition-colors">
              <span class="material-symbols-outlined">chat_bubble</span>
            </div>
            <span class="text-xs font-bold">{{ recentComments.length }}</span>
          </div>
          <div class="flex flex-col items-center gap-1 group cursor-pointer" @click="wantToSing">
            <div class="p-3 bg-slate-100 rounded-xl group-hover:text-[#a34135] transition-colors">
              <span class="material-symbols-outlined">mic</span>
            </div>
            <span class="text-xs font-bold">我也唱</span>
          </div>
        </div>
        <!-- Performer info -->
        <div class="rounded-[22px] border border-white/50 bg-white/72 px-3 py-2 shadow-sm backdrop-blur-sm flex items-center gap-3">
          <div
            v-if="isRenderableImageAvatar(performerAvatar)"
            class="size-10 rounded-full bg-cover bg-center ring-2 ring-[#FDFBF7]"
            :style="{ backgroundImage: `url(${performerAvatar})` }"
          ></div>
          <LearnAvatarPreset
            v-else-if="performerAvatar"
            :value="performerAvatar"
            :name="performerName"
            :size="40"
            framed
          />
          <LearnAvatarPreset
            v-else
            :value="''"
            :name="performerName"
            :size="40"
            framed
          />
          <span class="text-sm font-bold text-slate-700">{{ performerName }}</span>
        </div>
      </section>

      <section class="stage-brief">
        <div class="stage-brief__copy">
          <p class="stage-brief__eyebrow">舞台摘要</p>
          <div class="stage-brief__headline">
            <h3>{{ cleanSongTitle }}</h3>
            <p>{{ workSummary }}</p>
          </div>
          <div v-if="workTagList.length" class="stage-brief__tags">
            <span v-for="tag in workTagList" :key="tag">{{ tag }}</span>
          </div>
          <div class="stage-brief__actions">
            <button
              v-if="isOwner"
              class="stage-brief__action stage-brief__action--primary"
              @click="ownerReviewOpen = true"
            >
              <span class="material-symbols-outlined">auto_awesome</span>
              打开 AI 逐句复盘
            </button>
            <button class="stage-brief__action" @click="scrollToInteractions">
              <span class="material-symbols-outlined">forum</span>
              去互动区
            </button>
          </div>
        </div>
        <div class="stage-brief__stats">
          <article v-for="item in stageBriefStats" :key="item.label">
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </section>

      <!-- 我的唱段复盘 -->
      <section v-if="isOwner" class="review-panel owner-review-panel">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h3 class="text-lg font-bold">我的唱段复盘</h3>
            <p class="text-sm text-slate-500">仅自己可见的多维记录与逐句问题</p>
          </div>
          <div class="text-right">
            <span class="text-3xl font-bold text-[#a34135]">{{ ownerReviewScore || work.score || '—' }}</span>
            <span class="text-sm text-slate-500 ml-1">综合分</span>
          </div>
        </div>

        <!-- Dimension bars -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div v-for="dim in (ownerReviewDimensions.length ? ownerReviewDimensions : baseAnalysis?.dimensions || [])" :key="dim.label || dim.key" class="flex items-center justify-between">
              <span class="text-sm font-medium w-24 shrink-0">{{ dim.label }}</span>
              <div class="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden ml-4">
                <div class="h-full bg-[#a34135] transition-all" :style="{ width: dim.value + '%' }"></div>
              </div>
              <span class="text-xs text-slate-500 ml-2 w-8 text-right">{{ dim.value }}</span>
            </div>
          </div>
          <div class="flex flex-col justify-center gap-4">
            <!-- Tags -->
            <div class="flex flex-wrap gap-2">
              <span v-if="ownerReviewStrongest" class="px-2 py-1 bg-green-100 text-green-600 text-xs rounded">{{ ownerReviewStrongest.label }}</span>
              <span v-if="publicAiWeakest" class="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded">{{ publicAiWeakest.label }}</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-600 italic">
              "{{ publicAiHeadline }}"
            </p>
          </div>
        </div>

        <button
          class="w-full mt-6 py-3 border border-[#a34135]/30 text-[#a34135] font-bold rounded-xl hover:bg-[#a34135]/5 transition-colors flex items-center justify-center gap-2"
          @click="ownerReviewOpen = true"
        >
          <span class="material-symbols-outlined">auto_awesome</span>
          查看逐句复盘
        </button>
      </section>

      <section v-else-if="publicReviewDimensions.length || publicAiHeadline" class="review-panel public-review-panel">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="space-y-2">
            <p class="text-[11px] font-bold tracking-[0.24em] text-[#a34135]/60">PUBLIC REVIEW</p>
            <h3 class="text-xl font-bold text-slate-900">公开演唱画像</h3>
            <p class="max-w-2xl text-sm leading-7 text-slate-600">
              {{ publicAiHeadline }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-if="publicStrongest" class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              最稳：{{ publicStrongest.label }}
            </span>
            <span v-if="publicAiWeakest" class="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              可继续打磨：{{ publicAiWeakest.label }}
            </span>
          </div>
        </div>

        <WorkStatsPanel
          v-if="publicReviewDimensions.length"
          class="mt-5"
          :score="work.score || work.averageScore || 0"
          :play-duration="work.playDuration || work.duration || 0"
          :publish-time="work.createdAt || work.timestamp || 0"
          :dimensions="publicReviewDimensions"
        />
      </section>

      <!-- Gift Section -->
      <section ref="interactionSectionRef" class="interaction-panel">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-md font-bold flex items-center gap-2">
            <span class="material-symbols-outlined text-[#a34135]">redeem</span>
            投喂打赏
          </h3>
          <span class="text-xs text-[#D4AF37] font-bold">余额: {{ profileState.giftBalance || 0 }}</span>
        </div>
        <div class="flex gap-3 mb-3">
          <button
            v-for="opt in giftOptions" :key="opt.type"
            class="flex-1 flex items-center gap-2 p-3 bg-white rounded-lg hover:shadow transition-shadow border border-transparent hover:border-[#a34135]/20"
            :class="{ 'ring-2 ring-[#a34135] border-[#a34135]/30': selectedGiftType === opt.type }"
            @click="selectedGiftType = opt.type"
          >
            <span class="material-symbols-outlined text-lg" :class="selectedGiftType === opt.type ? 'text-[#a34135]' : 'text-slate-400'">{{ opt.icon }}</span>
            <span class="text-xs font-bold">{{ opt.label }}</span>
            <span class="text-[11px] text-slate-400 hidden sm:inline">{{ opt.desc }}</span>
          </button>
        </div>
        <div class="flex gap-3">
          <input
            v-model.trim="giftAmountInput"
            type="number"
            min="1"
            class="flex-1 h-11 bg-white border border-slate-200 rounded-xl pl-4 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#a34135]/20"
            placeholder="数量"
          />
          <button
            class="px-6 h-11 bg-[#a34135] text-white font-bold rounded-xl shadow-lg shadow-[#a34135]/20 hover:brightness-110 transition-all"
            @click="submitGift"
          >
            送出
          </button>
        </div>
        <p v-if="giftError" class="mt-2 text-xs font-bold text-rose-500">{{ giftError }}</p>
      </section>

      <!-- Comments Section -->
      <section class="comments-panel space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold flex items-center gap-2">
            评论交流
            <span v-if="ownerUnreadCount > 0" class="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{{ ownerUnreadCount }}</span>
          </h3>
        </div>

        <!-- Comment list -->
        <div class="space-y-6">
          <p class="text-xs font-bold tracking-[0.2em] text-slate-400">最新评论</p>
          <div v-if="!recentComments.length" class="text-center py-8 text-sm text-slate-400">
            还没有人评论，来聊聊这段唱法？
          </div>
          <div v-for="item in recentComments" :key="item.id" class="flex gap-4">
            <div
              v-if="isRenderableImageAvatar(item.userAvatar || item.avatar)"
              class="size-10 shrink-0 rounded-full bg-slate-200 bg-cover bg-center"
              :style="{ backgroundImage: `url(${item.userAvatar || item.avatar})` }"
            ></div>
            <LearnAvatarPreset
              v-else
              :value="item.userAvatar || item.avatar || ''"
              :name="item.userName || item.username || '戏友'"
              :size="40"
              framed
            />
            <div class="flex-1 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-sm">{{ item.userName || item.username || '戏友' }}</span>
                <span class="text-xs text-slate-400">{{ item.createdAt || item.timestamp ? new Date(item.createdAt || item.timestamp).toLocaleDateString() : '' }}</span>
              </div>
              <p class="text-sm leading-relaxed">{{ item.content || item.text }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Sticky bottom footer -->
    <footer v-if="work && !loading" class="interaction-footer sticky bottom-0 z-40 px-4 py-4">
      <div class="mx-auto flex max-w-5xl gap-4 items-center rounded-[28px] border border-white/55 bg-[linear-gradient(180deg,rgba(255,252,246,0.95),rgba(246,237,226,0.92))] p-4 shadow-[0_-14px_32px_rgba(92,59,35,0.08)] backdrop-blur-xl">
        <div class="flex-1 relative">
          <input
            v-model.trim="danmakuText"
            class="w-full h-11 rounded-xl border border-white/70 bg-white/90 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#a34135]/20"
            placeholder="发个弹幕评价一下..."
            @keyup.enter="submitDanmaku"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#a34135] font-bold px-3 py-1 hover:bg-[#a34135]/10 rounded-xl text-sm"
            @click="submitDanmaku"
          >
            发送
          </button>
        </div>
        <div class="flex-1 relative">
          <input
            v-model.trim="commentText"
            class="w-full h-11 rounded-xl border border-white/70 bg-white/90 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#a34135]/20"
            placeholder="写评论..."
            @keyup.enter="submitComment"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 text-[#a34135] font-bold px-3 py-1 hover:bg-[#a34135]/10 rounded-xl text-sm"
            @click="submitComment"
          >
            发布
          </button>
        </div>
      </div>
      <p v-if="commentError" class="max-w-5xl mx-auto mt-1 text-xs text-rose-500">{{ commentError }}</p>
      <p v-if="danmakuError" class="max-w-5xl mx-auto mt-1 text-xs text-rose-500">{{ danmakuError }}</p>
    </footer>

    <!-- Owner Review Modal -->
    <div v-if="ownerReviewOpen" class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm" @click.self="ownerReviewOpen = false">
      <div class="w-full bg-[#FDFBF7] rounded-t-2xl sm:rounded-xl sm:max-w-2xl sm:max-h-[85vh] h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 class="text-lg font-bold shufa flex items-center gap-2">
            <span class="material-symbols-outlined text-[#a34135]">auto_awesome</span>
            逐句复盘
          </h3>
          <button class="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition" @click="ownerReviewOpen = false">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          <!-- Loading -->
          <div v-if="ownerAiState.loading" class="flex flex-col items-center justify-center py-12">
            <div class="h-12 w-12 animate-spin rounded-full border-4 border-[#a34135] border-t-transparent"></div>
            <p class="mt-4 text-sm font-bold text-slate-500">正在整理逐句复盘...</p>
          </div>

          <!-- Error -->
          <div v-else-if="ownerAiState.unavailable || ownerAiState.error" class="bg-red-50 text-red-500 rounded-xl p-4 text-sm font-bold">
            {{ ownerAiState.error || '生成复盘报告失败，请稍后重试' }}
          </div>

          <!-- Review content -->
          <template v-else-if="ownerReviewData">
            <div class="bg-white rounded-xl p-5 border border-slate-100">
              <h4 class="text-xs tracking-widest text-[#a34135]/70 font-bold mb-3">综合评价</h4>
              <p class="text-sm leading-relaxed text-slate-700">{{ ownerReviewData.overallJudgement }}</p>
            </div>

            <!-- Strengths -->
            <div v-if="ownerReviewData.strengths?.length" class="bg-green-50 rounded-xl p-5 border border-green-200">
              <h4 class="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined">thumb_up</span> 你的闪光点
              </h4>
              <ul class="space-y-3">
                <li v-for="(s, idx) in ownerReviewData.strengths" :key="idx" class="text-sm text-green-800">
                  <span class="font-bold">{{ s.label }}:</span> {{ s.detail }}
                </li>
              </ul>
            </div>

            <!-- Weaknesses -->
            <div v-if="ownerReviewData.weaknesses?.length" class="bg-rose-50 rounded-xl p-5 border border-rose-200">
              <h4 class="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined">trending_up</span> 提升空间
              </h4>
              <ul class="space-y-4">
                <li v-for="(w, idx) in ownerReviewData.weaknesses" :key="idx" class="text-sm text-rose-800 bg-white/50 p-3 rounded-xl">
                  <p class="font-bold mb-1">{{ w.label }}</p>
                  <p class="mb-2 opacity-90">{{ w.reason }}</p>
                  <div class="bg-white p-2 rounded-xl text-xs flex gap-2">
                    <span class="font-bold shrink-0 text-amber-600">练习建议:</span>
                    <span class="text-slate-600">{{ w.suggestion }}</span>
                  </div>
                </li>
              </ul>
            </div>

            <div v-if="ownerAudioSummary || ownerAudioDetailCards.length" class="bg-[#f7f1e7] rounded-xl p-5 border border-[#d8c7a4]/40">
              <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[#a34135]">graphic_eq</span> 音频池听感补充
              </h4>
              <p v-if="ownerAudioSummary" class="text-sm leading-7 text-slate-700">{{ ownerAudioSummary }}</p>
              <div v-if="ownerAudioDetailCards.length" class="mt-4 grid gap-3 md:grid-cols-2">
                <article v-for="item in ownerAudioDetailCards" :key="item.label" class="rounded-xl bg-white/75 p-3 text-sm">
                  <p class="text-[11px] font-bold tracking-[0.18em] text-[#736D61]/72">{{ item.label }}</p>
                  <strong class="mt-1 block text-slate-800 leading-6">{{ item.text }}</strong>
                </article>
              </div>
            </div>

            <div v-if="ownerRecallFragments.length || ownerRecallRecommendations.length" class="bg-[#fff8ee] rounded-xl p-5 border border-[#D4AF37]/22">
              <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span class="material-symbols-outlined text-[#D4AF37]">menu_book</span> 名师对照提示
              </h4>
              <div v-if="ownerRecallFragments.length" class="space-y-3">
                <article v-for="(item, idx) in ownerRecallFragments" :key="`${item.title || 'fragment'}-${idx}`" class="rounded-xl bg-white/78 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <strong class="text-sm text-slate-900">{{ item.title || item.focus || `提示 ${idx + 1}` }}</strong>
                    <span v-if="item.focus" class="rounded-full bg-[#a34135]/8 px-2 py-0.5 text-[11px] font-bold text-[#a34135]">{{ item.focus }}</span>
                  </div>
                  <p v-if="item.excerpt" class="mt-2 text-sm leading-6 text-slate-700">{{ item.excerpt }}</p>
                  <p v-if="item.drill" class="mt-2 text-xs leading-6 text-[#736D61]">练法：{{ item.drill }}</p>
                </article>
              </div>
              <ul v-if="ownerRecallRecommendations.length" class="mt-4 space-y-2">
                <li v-for="(item, idx) in ownerRecallRecommendations" :key="`${item}-${idx}`" class="text-sm text-slate-700 flex gap-2">
                  <span class="text-[#D4AF37] font-bold">{{ idx + 1 }}.</span>
                  {{ item }}
                </li>
              </ul>
            </div>

            <!-- Line issues -->
            <div v-if="ownerReviewLines.length" class="space-y-3">
              <h4 class="text-sm font-bold text-slate-800">逐句问题</h4>
              <div v-for="(line, idx) in ownerReviewLines" :key="idx" class="bg-white rounded-xl p-4 border border-slate-100">
                <p class="text-xs text-slate-500 mb-1">第 {{ line.lineIndex + 1 }} 句: {{ line.lineText }}</p>
                <p class="text-sm text-[#a34135] font-medium">{{ line.issue }}</p>
                <p v-if="line.tip" class="text-xs text-slate-600 mt-1">{{ line.tip }}</p>
              </div>
            </div>

            <!-- Next steps -->
            <div v-if="ownerReviewNextSteps.length" class="bg-[#D4AF37]/5 rounded-xl p-5 border border-[#D4AF37]/20">
              <h4 class="text-sm font-bold text-slate-800 mb-3">下步练习建议</h4>
              <ul class="space-y-2">
                <li v-for="(step, idx) in ownerReviewNextSteps" :key="idx" class="text-sm text-slate-700 flex gap-2">
                  <span class="text-[#D4AF37] font-bold">{{ idx + 1 }}.</span>
                  {{ typeof step === 'string' ? step : step.text || step.suggestion || '' }}
                </li>
              </ul>
            </div>

            <!-- Teacher voice -->
            <div v-if="isOwner && ownerReviewHeadline" class="bg-slate-900 text-white rounded-xl p-5">
              <div class="flex items-center gap-3 mb-3">
                <span class="material-symbols-outlined text-[#D4AF37]">record_voice_over</span>
                <h4 class="text-sm font-bold">老师语音点评</h4>
              </div>
              <p v-if="teacherVoiceHint" class="text-xs text-white/60 mb-2">{{ teacherVoiceHint }}</p>
              <button
                class="px-5 py-2.5 bg-[#a34135] rounded-xl text-sm font-bold hover:brightness-110 transition-all"
                :disabled="teacherVoiceState.loading"
                @click="requestTeacherVoice"
              >
                {{ teacherVoiceButtonText }}
              </button>
              <audio v-if="teacherVoiceState.audioUrl" ref="teacherAudioRef" :src="teacherVoiceState.audioUrl" class="hidden"></audio>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.work-detail-page {
  background:
    radial-gradient(circle at top left, rgba(212, 175, 55, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(253, 251, 247, 0.98), rgba(246, 239, 228, 0.96));
  overflow: hidden;
}

.work-detail-page::before,
.work-detail-page::after {
  content: "";
  position: fixed;
  width: 340px;
  height: 340px;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(90px);
  opacity: 0.28;
}

.work-detail-page::before {
  top: 92px;
  right: -88px;
  background: rgba(212, 175, 55, 0.28);
}

.work-detail-page::after {
  bottom: 120px;
  left: -120px;
  background: rgba(163, 65, 53, 0.16);
}

/* Rice paper texture background */
.bg-\[\#FDFBF7\] {
  background-image: radial-gradient(#E5E1D8 0.5px, transparent 0.5px);
  background-size: 24px 24px;
}

.stage-brief,
.review-panel,
.interaction-panel,
.comments-panel {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(255, 247, 235, 0.72);
  box-shadow: 0 22px 52px rgba(92, 59, 35, 0.08);
}

.stage-brief {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  padding: 1.5rem;
  background:
    linear-gradient(135deg, rgba(255, 252, 246, 0.96), rgba(245, 234, 220, 0.9)),
    radial-gradient(circle at top right, rgba(212, 175, 55, 0.16), transparent 32%);
}

.stage-brief__copy {
  display: grid;
  gap: 0.95rem;
}

.stage-brief__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(163, 65, 53, 0.72);
}

.stage-brief__headline h3 {
  font-size: clamp(1.45rem, 2.2vw, 2rem);
  font-weight: 800;
  color: #201815;
}

.stage-brief__headline p {
  margin-top: 0.45rem;
  max-width: 42rem;
  line-height: 1.8;
  color: #6b5c50;
}

.stage-brief__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.stage-brief__tags span {
  border-radius: 999px;
  border: 1px solid rgba(163, 65, 53, 0.12);
  background: rgba(255, 255, 255, 0.7);
  padding: 0.42rem 0.8rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #8d4f42;
}

.stage-brief__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.stage-brief__action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 999px;
  border: 1px solid rgba(163, 65, 53, 0.16);
  background: rgba(255, 255, 255, 0.72);
  padding: 0.72rem 1rem;
  font-size: 13px;
  font-weight: 700;
  color: #7b463b;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.stage-brief__action:hover {
  transform: translateY(-1px);
  border-color: rgba(163, 65, 53, 0.26);
  box-shadow: 0 10px 22px rgba(92, 59, 35, 0.08);
}

.stage-brief__action--primary {
  background: linear-gradient(135deg, #a34135, #be705b);
  color: #fff;
  border-color: transparent;
}

.stage-brief__stats {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stage-brief__stats article {
  border-radius: 22px;
  border: 1px solid rgba(163, 65, 53, 0.08);
  background: rgba(255, 255, 255, 0.78);
  padding: 1rem;
}

.stage-brief__stats p {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(115, 109, 97, 0.72);
}

.stage-brief__stats strong {
  display: block;
  margin-top: 0.52rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #201815;
}

.review-panel {
  padding: 1.5rem;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(250, 243, 233, 0.92));
}

.owner-review-panel {
  border-color: rgba(163, 65, 53, 0.12);
}

.public-review-panel {
  border-color: rgba(163, 65, 53, 0.14);
}

.interaction-panel {
  padding: 1.35rem;
  background:
    linear-gradient(145deg, rgba(255, 247, 238, 0.96), rgba(244, 232, 215, 0.88)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.14), transparent 26%);
}

.comments-panel {
  padding: 1.5rem;
  background: linear-gradient(180deg, rgba(255, 252, 246, 0.94), rgba(248, 241, 231, 0.9));
}

.interaction-composer {
  margin-top: -0.5rem;
}

.interaction-composer__shell {
  position: relative;
  overflow: hidden;
}

.interaction-footer {
  display: none;
}

@media (max-width: 900px) {
  .stage-brief {
    grid-template-columns: 1fr;
  }

  .stage-brief__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stage-brief,
  .review-panel,
  .interaction-panel,
  .comments-panel {
    border-radius: 24px;
  }

  .stage-brief__stats {
    grid-template-columns: 1fr;
  }

  .interaction-composer {
    top: 0.75rem;
  }
}
</style>
