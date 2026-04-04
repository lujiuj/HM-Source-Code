<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import SixDimensionRadar from '../components/analysis/SixDimensionRadar.vue'
import { loadLrcLines } from '../composables/useLrcParser.js'
import { useDisplayName } from '../composables/useDisplayName.js'
import { normalizeAnalysisV2, getAnalysisDimensions, getWeakAnalysisDimensions } from '../utils/analysisV2.js'
import { buildSongGuideTimeline, getLearnSongById, getScoreGrade } from '../utils/learnCatalog.js'
import { hasUsablePublishAiAnalysis, requestPublishAiAnalysis, requestPublishOwnerReview } from '../utils/publishAi.js'
import { buildLearnPublishPayload } from '../utils/publishWorkPayload.js'
import { toSerializablePracticeSession } from '../utils/toSerializablePracticeSession.js'
import {
  isDemoRouteId,
  resolveDemoPracticeSession,
  resolveDemoWorksBySongId
} from '../utils/learnDemoResolvers.js'

const route = useRoute()
const router = useRouter()
const infra = getInfra()
const uid = infra.identity.getUid()

const { displayName, loadDisplayName } = useDisplayName({ identity: infra.identity })
loadDisplayName({ ensureFallback: true, silent: true })

const loading = ref(true)
const session = ref(null)
const audioUrl = ref('')
const publishing = ref(false)
const publishError = ref('')
const publishSuccess = ref(false)
const existingWork = ref(null)
const rankPreview = ref({ board: [] })
const aiToast = ref('')
const showExitDialog = ref(false)
const exitResolve = ref(null)
const playbackTimeline = ref([])
const currentTime = ref(0)
const mediaDuration = ref(0)
const isPlaying = ref(false)
const audioRef = ref(null)
const videoRef = ref(null)
const videoUnavailable = ref(false)

const isDemoSession = computed(() => isDemoRouteId(route.params.practiceId) || Boolean(session.value?.isDemo))
const songMeta = computed(() => getLearnSongById(session.value?.songId))
const displaySongName = computed(() => songMeta.value?.title || session.value?.songName || '示例曲目')
const displayScore = computed(() => Math.round(Number(session.value?.score ?? session.value?.overall ?? 0)))
const displayGrade = computed(() => session.value?.grade || getScoreGrade(displayScore.value))
const starCount = computed(() => Number(session.value?.stars || 0))
const heroCoverUrl = computed(() => {
  return session.value?.heroImage
    || session.value?.bannerImage
    || session.value?.timelineCover
    || songMeta.value?.heroImage
    || songMeta.value?.bannerImage
    || session.value?.coverUrl
    || songMeta.value?.cover
    || ''
})

const analysis = computed(() => {
  if (session.value?.analysisV2) return normalizeAnalysisV2(session.value.analysisV2)
  const pitch = Number(session.value?.breakdown?.pitchAccuracy ?? session.value?.pitchAccuracy ?? 0)
  const breath = Number(session.value?.breakdown?.voiceActivity ?? session.value?.voiceActivity ?? 0)
  return normalizeAnalysisV2({
    overallScore: displayScore.value,
    dimensions: { pitch, breath }
  })
})

const dimensions = computed(() => getAnalysisDimensions(analysis.value))
const weakDims = computed(() => getWeakAnalysisDimensions(analysis.value, 3))
const strongDims = computed(() => {
  return [...dimensions.value]
    .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0))
    .slice(0, 3)
})

const aiOverallJudgement = computed(() => {
  return session.value?.publishAiAnalysis?.overallJudgement
    || session.value?.publishAiAnalysis?.ownerReviewSnapshot?.finalAdvice?.overallJudgement
    || session.value?.publishAiAnalysis?.headline
    || analysis.value?.aiSummary
    || ''
})

const aiStrengths = computed(() => {
  // 优先从 publishAiAnalysis.strengths 获取
  const explicit = (session.value?.publishAiAnalysis?.strengths || [])
    .slice(0, 3)
    .map((item) => ({
      label: item?.label || '亮点',
      detail: item?.detail || item?.text || item?.suggestion || ''
    }))
    .filter((item) => item.detail)
  if (explicit.length) return explicit

  // fallback: 从维度数据中提取最强项
  return strongDims.value.slice(0, 2).map((dim) => ({
    label: dim.label,
    detail: dim.note || '这一维表现相对稳定。'
  }))
})

const aiWeaknesses = computed(() => {
  // 优先从 publishAiAnalysis.weaknesses 获取
  const explicit = (session.value?.publishAiAnalysis?.weaknesses || [])
    .slice(0, 3)
    .map((item) => ({
      label: item?.label || '待提升',
      reason: item?.reason || item?.detail || '',
      suggestion: item?.suggestion || item?.tip || ''
    }))
    .filter((item) => item.reason || item.suggestion)
  if (explicit.length) return explicit

  // fallback: 从维度数据中提取最弱项
  return weakDims.value.slice(0, 2).map((dim) => ({
    label: dim.label,
    reason: dim.note || '这一维还有提升空间。',
    suggestion: dim.hint || '建议拆开慢练后再合句。'
  }))
})

const hasAiAnalysis = computed(() => Boolean(
  aiOverallJudgement.value || aiStrengths.value.length || aiWeaknesses.value.length
))

const reviewHeadline = computed(() => {
  return aiOverallJudgement.value
    || session.value?.publishAiAnalysis?.headline
    || analysis.value?.aiSummary
    || '完成本次练习，发布后可获得更完整的 AI 分析报告。'
})

const reviewHighlights = computed(() => {
  const strengths = (session.value?.publishAiAnalysis?.strengths || [])
    .slice(0, 2)
    .map((item) => item?.detail || item?.suggestion || item?.text)
    .filter(Boolean)
  const weaknesses = (session.value?.publishAiAnalysis?.weaknesses || [])
    .slice(0, 2)
    .map((item) => item?.suggestion || item?.detail || item?.reason)
    .filter(Boolean)
  return [...strengths, ...weaknesses].slice(0, 3)
})

const lineDiagnostics = computed(() => Array.isArray(analysis.value?.lineDiagnostics) ? analysis.value.lineDiagnostics : [])
const strongestDimension = computed(() => strongDims.value[0] || null)
const weakestDimension = computed(() => weakDims.value[0] || null)
const publishReadiness = computed(() => {
  if (displayScore.value >= 92) {
    return {
      label: '推荐发布',
      tone: 'ready',
      summary: '整体表现优秀，建议直接发布到作品广场。'
    }
  }
  if (displayScore.value >= 84) {
    return {
      label: '可以发布',
      tone: 'polish',
      summary: `表现良好，${weakestDimension.value?.label || '部分维度'}还有提升空间。`
    }
  }
  return {
    label: '建议继续练习',
    tone: 'rework',
    summary: '当前版本更适合作为练习记录保存，继续打磨后再发布效果更好。'
  }
})
const readinessStats = computed(() => ([
  {
    label: '最强维度',
    value: strongestDimension.value?.label || '整体完成度'
  },
  {
    label: '待提升',
    value: weakestDimension.value?.label || '细节层次'
  },
  {
    label: '预计排名',
    value: rankPreview.value?.board?.find((item) => item.isMe)?.rank ? `第 ${rankPreview.value.board.find((item) => item.isMe).rank} 名` : '待上榜'
  }
]))
const diagnosticFocusCards = computed(() => {
  const aiWeaknesses = Array.isArray(session.value?.publishAiAnalysis?.weaknesses) ? session.value.publishAiAnalysis.weaknesses : []
  if (aiWeaknesses.length) {
    return aiWeaknesses.slice(0, 3).map((item, index) => ({
      id: `${item?.label || 'weak'}-${index}`,
      title: item?.label || `问题 ${index + 1}`,
      issue: item?.reason || item?.detail || '这部分还可以继续打磨。',
      hint: item?.suggestion || item?.tip || '回到问题句慢速拆练一轮。'
    }))
  }
  if (lineDiagnostics.value.length) {
    return [...lineDiagnostics.value]
      .sort((a, b) => Number(a?.overall || 0) - Number(b?.overall || 0))
      .slice(0, 3)
      .map((item, index) => ({
        id: `${item?.lineIndex ?? index}`,
        title: item?.lineText || `第 ${index + 1} 句`,
        issue: item?.objectiveDiagnosis || item?.issues?.[0] || '这一句需要回听。',
        hint: item?.trainingHint || '先把节奏和字头稳住再连句。'
      }))
  }
  return weakDims.value.slice(0, 3).map((item, index) => ({
    id: `${item.key}-${index}`,
    title: item.label,
    issue: item.note,
    hint: item.hint
  }))
})
const publishActionSteps = computed(() => {
  const explicitSteps = Array.isArray(session.value?.publishAiAnalysis?.nextSteps) ? session.value.publishAiAnalysis.nextSteps : []
  if (explicitSteps.length) {
    return explicitSteps.slice(0, 4).map((item) => String(item || '').trim()).filter(Boolean)
  }
  const fallback = [
    weakestMarkers.value[0]?.lineText ? `先回听“${weakestMarkers.value[0].lineText}”这一句，把问题点改干净。` : '',
    weakestDimension.value?.hint || '',
    reviewHighlights.value[0] || '',
    publishReadiness.value.summary
  ]
  return fallback.filter(Boolean).slice(0, 4)
})
const masterRecallFragments = computed(() => {
  const source = session.value?.publishAiAnalysis?.masterRecall?.fragments
  return Array.isArray(source) ? source.slice(0, 2) : []
})
const masterRecallRecommendations = computed(() => {
  const source = session.value?.publishAiAnalysis?.masterRecall?.recommendations
  return Array.isArray(source) ? source.slice(0, 3).map((item) => String(item || '').trim()).filter(Boolean) : []
})
const dimensionSummary = computed(() => {
  return [...dimensions.value]
    .sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0))
    .map((item) => ({
      ...item,
      tone: item.key === weakestDimension.value?.key ? 'weak' : (item.key === strongestDimension.value?.key ? 'strong' : 'normal')
    }))
})
const videoSurfaceUrl = computed(() => {
  const candidates = [
    session.value?.mvUrl,
    session.value?.mediaUrl,
    songMeta.value?.videoSrc,
    songMeta.value?.mvUrl
  ]
  const candidate = candidates
    .map((item) => safeText(item))
    .find((item) => isLikelyVideoUrl(item))
  return candidate || ''
})
const showVisualVideo = computed(() => Boolean(videoSurfaceUrl.value) && !videoUnavailable.value)
const progressPercent = computed(() => mediaDuration.value ? (currentTime.value / mediaDuration.value) * 100 : 0)

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function isLikelyVideoUrl(value) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(safeText(value))
}

function deriveSongAudioUrl() {
  const lrcPath = safeText(songMeta.value?.lrcPath)
  if (lrcPath && /\.lrc(\?.*)?$/i.test(lrcPath)) return lrcPath.replace(/\.lrc(\?.*)?$/i, '.mp3$1')
  return safeText(songMeta.value?.audioSrc)
}

function resolvePlaybackAudioUrl() {
  const directAudio = [
    session.value?.mediaUrl,
    deriveSongAudioUrl(),
    songMeta.value?.audioSrc
  ]
    .map((item) => safeText(item))
    .find((item) => item && !isLikelyVideoUrl(item))
  if (directAudio) return directAudio
  if (!isDemoSession.value && isLikelyVideoUrl(session.value?.mediaUrl)) return safeText(session.value?.mediaUrl)
  return safeText(songMeta.value?.audioSrc || session.value?.mediaUrl)
}

function fallbackMarkerStart(index, count, totalSec) {
  if (!count) return 0
  return (Math.max(0, index) / Math.max(count, 1)) * Math.max(totalSec, 1)
}

const weakestMarkers = computed(() => {
  const totalDurationSec = Math.max(
    Number(mediaDuration.value || 0),
    Number(session.value?.duration || 0) / 1000,
    Number(songMeta.value?.durationSeconds || 0)
  )
  const source = Array.isArray(session.value?.lineScores) ? session.value.lineScores : []
  const ranked = [...source]
    .map((entry, index) => {
      const timeline = playbackTimeline.value[entry?.lineIndex ?? index] || {}
      const startSec = Number(
        timeline?.startSec
        ?? entry?.startSec
        ?? ((entry?.startMs ?? entry?.time) / 1000)
        ?? fallbackMarkerStart(index, source.length, totalDurationSec)
      )
      const endSec = Number(
        timeline?.endSec
        ?? entry?.endSec
        ?? (startSec + Math.max(2, Number(entry?.durationMs || 0) / 1000 || 3))
      )
      return {
        id: `${entry?.lineIndex ?? index}-${entry?.lineText || ''}`,
        lineIndex: Number(entry?.lineIndex ?? index),
        lineText: entry?.lineText || timeline?.text || `第 ${index + 1} 句`,
        overall: Math.round(Number(entry?.overall || entry?.score || 0)),
        startSec,
        endSec,
        ratio: totalDurationSec ? Math.max(0, Math.min(100, (startSec / totalDurationSec) * 100)) : 0
      }
    })
    .sort((a, b) => a.overall - b.overall)
  const trulyWeak = ranked.filter((item) => item.overall <= 78)
  return (trulyWeak.length ? trulyWeak : ranked)
    .slice(0, trulyWeak.length ? 6 : 3)
})
const playbackFocusCards = computed(() => {
  if (!weakestMarkers.value.length) {
    return [
      {
        id: 'steady-ready',
        timeText: '整段回听',
        title: '先听整体气口',
        note: '这次先确认整段的松弛度、人物关系和句尾收束，不需要逐点跳转。'
      }
    ]
  }
  return weakestMarkers.value.slice(0, 3).map((marker, index) => ({
    id: marker.id,
    timeText: formatTime(marker.startSec),
    title: marker.lineText || `第 ${index + 1} 句`,
    note: marker.overall >= 90
      ? '这一句已经站得住，重点保持现在的口气和收束。'
      : `当前约 ${marker.overall} 分，建议先把句尾落音和字头抛清，再回到整段。`
  }))
})

async function fetchAiAnalysis() {
  if (!session.value?.analysisV2 || isDemoSession.value) return
  try {
    const [publishResult, ownerReviewResult] = await Promise.allSettled([
      requestPublishAiAnalysis({
        songId: session.value.songId,
        songName: displaySongName.value,
        analysisV2: session.value.analysisV2
      }),
      requestPublishOwnerReview({
        practiceId: session.value.id,
        songId: session.value.songId,
        analysisV2: session.value.analysisV2,
        lineScores: toSerializablePracticeSession(session.value.lineScores || []),
        audioUrl: audioUrl.value
      })
    ])
    const publishAnalysis = publishResult.status === 'fulfilled' ? publishResult.value : null
    const ownerReviewSnapshot = ownerReviewResult.status === 'fulfilled' ? ownerReviewResult.value : null
    if (hasUsablePublishAiAnalysis(publishAnalysis) || ownerReviewSnapshot) {
      session.value.publishAiAnalysis = toSerializablePracticeSession({
        ...(publishAnalysis || {}),
        ...(ownerReviewSnapshot ? { ownerReviewSnapshot } : {})
      })
      await infra.practice.savePracticeSession(uid, toSerializablePracticeSession(session.value))
    }
  } catch {
    aiToast.value = '深度复盘暂时不可用，基础结果已保留。'
    setTimeout(() => { aiToast.value = '' }, 4000)
  }
}

async function loadTimeline() {
  const totalDurationSec = Math.max(
    Number(session.value?.duration || 0) / 1000,
    Number(songMeta.value?.durationSeconds || 0),
    0
  )
  const lines = await loadLrcLines(songMeta.value?.lrcPath, { defaultDurationSec: 3.2 })
  playbackTimeline.value = lines.length
    ? lines
    : buildSongGuideTimeline(songMeta.value, { totalDurationSec })
}

async function loadSession() {
  try {
    loading.value = true
    publishError.value = ''
    videoUnavailable.value = false
    const practiceId = String(route.params.practiceId || '')
    if (isDemoRouteId(practiceId)) {
      session.value = resolveDemoPracticeSession(practiceId)
    } else {
      const sessions = await infra.practice.listPracticeSessions(uid)
      session.value = sessions.find((item) => item.id === practiceId) || null
    }
    if (!session.value) return

    audioUrl.value = resolvePlaybackAudioUrl()
    await loadTimeline()

    if (isDemoSession.value) {
      const demoWorks = resolveDemoWorksBySongId(session.value.songId)
      existingWork.value = demoWorks.find((work) => work.userId === uid) || demoWorks[0] || null
      rankPreview.value = {
        board: [...demoWorks].sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 5).map((work, index) => ({
          rank: index + 1,
          userId: work.userId || work.id,
          username: work.username || '示例学员',
          score: work.score || 0,
          isMe: work.userId === uid,
          isDemo: true
        }))
      }
    } else {
      const works = await infra.works.listWorks({ songId: session.value.songId, includeDeleted: false })
      existingWork.value = works.find((work) => work.userId === uid) || null
      rankPreview.value = {
        board: [...works]
          .filter((work) => !work.deletedAt)
          .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
          .slice(0, 5)
          .map((work, index) => ({
            rank: index + 1,
            userId: work.userId || work.id,
            username: work.username || '匿名戏友',
            score: work.score || 0,
            isMe: work.userId === uid,
            isDemo: Boolean(work.isDemo)
          }))
      }
      void fetchAiAnalysis()
    }
  } finally {
    loading.value = false
  }
}

async function publishWork() {
  if (!session.value || !audioUrl.value) return
  if (isDemoSession.value) {
    publishError.value = '示例内容仅用于预览，不能发布。'
    return
  }
  publishing.value = true
  publishError.value = ''
  try {
    const hasOwnerReviewSnapshot = Boolean(session.value?.publishAiAnalysis?.ownerReviewSnapshot?.finalAdvice)
    if (!hasUsablePublishAiAnalysis(session.value?.publishAiAnalysis) || !hasOwnerReviewSnapshot) {
      await fetchAiAnalysis()
    }
    const profile = infra.identity.getProfile()
    const payload = buildLearnPublishPayload({
      userId: uid,
      username: displayName.value || profile?.displayName || '戏友',
      profile,
      session: {
        ...session.value,
        score: displayScore.value,
        averageScore: displayScore.value,
        grade: displayGrade.value,
        stars: starCount.value,
        analysisV2: toSerializablePracticeSession(session.value.analysisV2 || null),
        lineScores: toSerializablePracticeSession(session.value.lineScores || []),
        publishAiAnalysis: toSerializablePracticeSession(session.value.publishAiAnalysis || null)
      },
      audioUrl: audioUrl.value,
      existingWork: existingWork.value,
      songMeta: songMeta.value
    })
    const nextId = await infra.works.publishWork(payload)
    publishSuccess.value = true
    setTimeout(() => { router.push('/learn/works/' + nextId) }, 700)
  } catch (error) {
    publishError.value = error instanceof Error ? error.message : '发布失败，请稍后重试。'
  } finally {
    publishing.value = false
  }
}

function formatTime(value) {
  const total = Math.max(0, Math.floor(Number(value || 0)))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function syncVisualVideo() {
  if (!audioRef.value || !videoRef.value || !showVisualVideo.value) return
  const offset = Math.abs(Number(videoRef.value.currentTime || 0) - Number(audioRef.value.currentTime || 0))
  if (offset > 0.35) videoRef.value.currentTime = Number(audioRef.value.currentTime || 0)
}

function handleLoadedMetadata(event) {
  mediaDuration.value = Number(event.target?.duration || 0)
}

function handleAudioTimeUpdate(event) {
  currentTime.value = Number(event.target?.currentTime || 0)
  syncVisualVideo()
}

function handleAudioPlay() {
  isPlaying.value = true
  if (videoRef.value && showVisualVideo.value) {
    videoRef.value.muted = true
    syncVisualVideo()
    videoRef.value.play().catch(() => {})
  }
}

function handleVideoLoadedMetadata() {
  syncVisualVideo()
}

function handleVideoCanPlay() {
  if (!videoRef.value || !isPlaying.value || !showVisualVideo.value) return
  syncVisualVideo()
  videoRef.value.play().catch(() => {})
}

function handleAudioPause() {
  isPlaying.value = false
  videoRef.value?.pause()
}

function handleAudioEnded() {
  isPlaying.value = false
  videoRef.value?.pause()
}

function handleAudioError() {
  const fallback = deriveSongAudioUrl()
  if (!fallback || safeText(audioUrl.value) === fallback) return
  audioUrl.value = fallback
}

function togglePlayback() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    return
  }
  audioRef.value.play().catch(() => {})
}

function seekMedia(event) {
  if (!audioRef.value || !mediaDuration.value) return
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const target = ratio * mediaDuration.value
  audioRef.value.currentTime = target
  currentTime.value = target
  syncVisualVideo()
}

function goBack() {
  router.push('/learn/practice/history')
}

function goPractice() {
  const songId = safeText(session.value?.songId || route.query.songId)
  router.push(songId ? `/learn/practice/karaoke?songId=${encodeURIComponent(songId)}` : '/learn/practice')
}

function confirmExit() {
  return new Promise((resolve) => {
    showExitDialog.value = true
    exitResolve.value = resolve
  })
}

async function handleExitChoice(choice) {
  showExitDialog.value = false
  if (choice === 'save' && !isDemoSession.value) {
    await infra.practice.savePracticeSession(uid, toSerializablePracticeSession(session.value))
  }
  exitResolve.value?.(choice !== 'cancel')
}

onBeforeRouteLeave(async () => {
  if (publishSuccess.value || !session.value || isDemoSession.value) return true
  return confirmExit()
})

onMounted(() => {
  void loadSession()
})
</script>

<template>
  <div class="publish-page min-h-full font-display text-slate-900">
    <Transition name="fade">
      <div v-if="aiToast" class="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow">
        {{ aiToast }}
      </div>
    </Transition>

    <header class="publish-header">
      <div class="publish-header__left">
        <button class="publish-header__back" @click="goBack">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <p class="publish-header__eyebrow">练习结果</p>
          <h1>发布预览</h1>
          <p>{{ displaySongName }}</p>
        </div>
      </div>
      <button
        class="publish-header__action"
        :disabled="publishing || !session || publishSuccess || isDemoSession"
        @click="publishWork"
      >
        {{ isDemoSession ? '示例预览' : publishSuccess ? '已发布' : publishing ? '发布中' : '发布到作品广场' }}
      </button>
    </header>

    <div v-if="loading" class="publish-state">
      <span class="material-symbols-outlined animate-spin text-4xl text-[#a34135]">progress_activity</span>
    </div>

    <div v-else-if="!session" class="publish-state publish-state--empty">
      <span class="material-symbols-outlined mb-4 text-6xl text-[#a34135]/20">search_off</span>
      <p class="mb-4 text-lg font-serif">没有找到这条练习记录</p>
      <button class="publish-header__action" @click="goPractice">去练唱</button>
    </div>

    <main v-else class="publish-main">
      <p v-if="publishError" class="publish-error">{{ publishError }}</p>

      <section class="hero-grid">
        <article class="player-card">
          <div class="player-stage">
            <div
              v-if="heroCoverUrl"
              class="player-stage__cover"
              :style="{ backgroundImage: `url(${heroCoverUrl})` }"
            ></div>
            <video
              v-if="showVisualVideo"
              ref="videoRef"
              :src="videoSurfaceUrl"
              muted
              playsinline
              preload="metadata"
              class="player-stage__video"
              @loadedmetadata="handleVideoLoadedMetadata"
              @canplay="handleVideoCanPlay"
              @error="videoUnavailable = true"
            ></video>
            <div class="player-stage__mask"></div>

            <audio
              v-if="audioUrl"
              ref="audioRef"
              :src="audioUrl"
              preload="metadata"
              @error="handleAudioError"
              @loadedmetadata="handleLoadedMetadata"
              @timeupdate="handleAudioTimeUpdate"
              @play="handleAudioPlay"
              @pause="handleAudioPause"
              @ended="handleAudioEnded"
            ></audio>

            <button class="player-stage__play" @click="togglePlayback">
              <span class="material-symbols-outlined">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
            </button>

            <div class="player-stage__meta">
              <p class="publish-header__eyebrow">回听录音</p>
              <h2>{{ displaySongName }}</h2>
            </div>
          </div>

          <div class="player-card__controls">
            <div class="player-card__times">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(mediaDuration || (session?.duration || 0) / 1000) }}</span>
            </div>
            <div class="timeline-shell">
              <div class="timeline" @click="seekMedia">
                <i class="timeline__progress" :style="{ width: `${progressPercent}%` }"></i>
              </div>
            </div>
          </div>
        </article>

        <aside class="score-card">
          <div class="score-card__pill" :class="`is-${publishReadiness.tone}`">{{ publishReadiness.label }}</div>
          <p class="publish-header__eyebrow">综合评分</p>
          <div class="score-card__headline">
            <strong>{{ displayScore }}</strong>
            <span>{{ displayGrade }}</span>
          </div>
          <div class="score-card__stars">
            <span
              v-for="n in 5"
              :key="n"
              class="material-symbols-outlined"
              :style="{ fontVariationSettings: n <= starCount ? '\'FILL\' 1' : '\'FILL\' 0' }"
            >star</span>
          </div>
          <p class="score-card__copy">{{ reviewHeadline }}</p>
          <div class="score-card__stats">
            <div v-for="item in readinessStats" :key="item.label" class="score-card__stat">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <button class="score-card__retry" @click="goPractice">重新练习</button>
        </aside>
      </section>

      <section v-if="hasAiAnalysis" class="ai-analysis-section">
        <article class="panel-card panel-card--ai">
          <div class="ai-badge">
            <span class="material-symbols-outlined">auto_awesome</span>
            AI 智能分析
          </div>
          <div class="panel-card__head">
            <div>
              <h3>AI 演唱复盘</h3>
              <p v-if="aiOverallJudgement" class="ai-headline">{{ aiOverallJudgement }}</p>
            </div>
          </div>

          <div v-if="aiStrengths.length" class="ai-block ai-block--strengths">
            <h4><span class="material-symbols-outlined">thumb_up</span> 亮点表现</h4>
            <div class="ai-items">
              <article v-for="(item, i) in aiStrengths" :key="`s-${i}`" class="ai-item">
                <strong>{{ item.label }}</strong>
                <p>{{ item.detail }}</p>
              </article>
            </div>
          </div>

          <div v-if="aiWeaknesses.length" class="ai-block ai-block--weaknesses">
            <h4><span class="material-symbols-outlined">trending_up</span> 提升方向</h4>
            <div class="ai-items">
              <article v-for="(item, i) in aiWeaknesses" :key="`w-${i}`" class="ai-item">
                <strong>{{ item.label }}</strong>
                <p>{{ item.reason }}</p>
                <em v-if="item.suggestion">建议：{{ item.suggestion }}</em>
              </article>
            </div>
          </div>
        </article>
      </section>

      <section class="radar-section">
        <article class="panel-card panel-card--radar">
          <div class="panel-card__head">
            <div>
              <p class="publish-header__eyebrow">六维能力画像</p>
              <h3>各维度得分详情</h3>
            </div>
          </div>
          <div class="radar-layout">
            <div class="radar-layout__chart">
              <SixDimensionRadar
                :dimensions="dimensions"
                :score="displayScore"
                title="六维舞台画像"
                subtitle="分数之外，真正决定观感的是哪一维先塌。"
                primary-legend="当前表现"
                :size="300"
              />
            </div>
            <div class="radar-layout__bars">
              <div v-for="item in dimensionSummary" :key="item.key" class="dim-bar" :class="`is-${item.tone}`">
                <div class="dim-bar__head">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.value }}</span>
                </div>
                <div class="dim-bar__track">
                  <i class="dim-bar__fill" :style="{ width: `${Math.min(100, Math.max(0, item.value))}%` }"></i>
                </div>
                <p class="dim-bar__note">{{ item.note }}</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="review-section">
        <!-- 综合研判 横条 -->
        <article class="panel-card panel-card--verdict">
          <div class="verdict-row">
            <div class="verdict-row__badge" :class="`is-${publishReadiness.tone}`">
              {{ publishReadiness.label }}
            </div>
            <p class="verdict-row__text">{{ publishReadiness.summary }}</p>
            <div class="verdict-row__dims">
              <div class="verdict-dim">
                <span class="material-symbols-outlined">kid_star</span>
                <div><em>最强</em><strong>{{ strongestDimension?.label || '—' }}</strong></div>
              </div>
              <div class="verdict-dim verdict-dim--weak">
                <span class="material-symbols-outlined">priority_high</span>
                <div><em>待提升</em><strong>{{ weakestDimension?.label || '—' }}</strong></div>
              </div>
            </div>
          </div>
        </article>

        <!-- 关键问题句 -->
        <article v-if="diagnosticFocusCards.length || reviewHighlights.length" class="panel-card panel-card--diagnostic">
          <div class="panel-card__head">
            <div>
              <p class="publish-header__eyebrow">重点关注</p>
              <h3>关键问题句</h3>
            </div>
          </div>
          <div v-if="reviewHighlights.length" class="review-list">
            <div v-for="item in reviewHighlights" :key="item" class="review-item">
              <span class="material-symbols-outlined">subdirectory_arrow_right</span>
              <p>{{ item }}</p>
            </div>
          </div>
          <div class="diagnostic-scroll">
            <article v-for="item in diagnosticFocusCards" :key="item.id" class="diagnostic-card">
              <div class="diagnostic-card__head">
                <strong>{{ item.title }}</strong>
                <span>优先处理</span>
              </div>
              <p>{{ item.issue }}</p>
              <em v-if="item.hint">{{ item.hint }}</em>
            </article>
          </div>
        </article>

        <!-- 练习建议 + 名师对照 双栏 -->
        <div class="advice-row">
          <article v-if="publishActionSteps.length" class="panel-card panel-card--steps">
            <div class="panel-card__head">
              <div>
                <p class="publish-header__eyebrow">练习建议</p>
                <h3>后续提升方向</h3>
              </div>
            </div>
            <div class="action-timeline">
              <div v-for="(item, index) in publishActionSteps" :key="`${index}-${item}`" class="action-timeline__item">
                <div class="action-timeline__dot">
                  <span>{{ index + 1 }}</span>
                </div>
                <div class="action-timeline__content">
                  <p>{{ item }}</p>
                </div>
              </div>
            </div>
          </article>

          <article v-if="masterRecallFragments.length || masterRecallRecommendations.length" class="panel-card panel-card--master">
            <div class="panel-card__head">
              <div>
                <p class="publish-header__eyebrow">名师参考</p>
                <h3>名师处理对照</h3>
              </div>
            </div>
            <div v-if="masterRecallFragments.length" class="master-recall-fragments">
              <article v-for="(item, index) in masterRecallFragments" :key="`${item.title || 'fragment'}-${index}`" class="master-recall-fragment">
                <strong>{{ item.title || item.focus || `提示 ${index + 1}` }}</strong>
                <p>{{ item.excerpt || item.drill }}</p>
                <em v-if="item.drill">练法：{{ item.drill }}</em>
              </article>
            </div>
            <div v-if="masterRecallRecommendations.length" class="action-timeline action-timeline--compact">
              <div v-for="(item, index) in masterRecallRecommendations" :key="`${item}-${index}`" class="action-timeline__item">
                <div class="action-timeline__dot"><span>{{ index + 1 }}</span></div>
                <div class="action-timeline__content"><p>{{ item }}</p></div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="rankPreview.board.length" class="panel-card leaderboard-card">
        <div class="panel-card__head">
          <div>
              <p class="publish-header__eyebrow">作品排行</p>
              <h3>当前曲目排名预览</h3>
          </div>
        </div>
        <div class="leaderboard-list">
          <div v-for="item in rankPreview.board" :key="item.rank" class="leaderboard-item" :class="item.isMe ? 'is-active' : ''">
            <div class="leaderboard-item__left">
              <span class="leaderboard-item__rank">{{ item.rank }}</span>
              <div>
                <strong>{{ item.username }}</strong>
                <p v-if="item.isMe">当前预计位置</p>
              </div>
            </div>
            <span class="leaderboard-item__score">{{ item.score }} 分</span>
          </div>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showExitDialog" class="exit-mask">
          <div class="exit-dialog">
            <div class="exit-dialog__icon">
              <span class="material-symbols-outlined text-5xl">warning</span>
            </div>
            <h3>先别离开</h3>
            <p>当前内容还没有正式发布，是否先保存到练习历史？</p>
            <div class="exit-dialog__actions">
              <button class="publish-header__action" @click="handleExitChoice('save')">保存到历史</button>
              <button class="exit-dialog__ghost" @click="handleExitChoice('discard')">直接离开</button>
              <button class="exit-dialog__ghost" @click="handleExitChoice('cancel')">继续查看</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="less">
.publish-page {
  background:
    radial-gradient(circle at top, rgba(255, 244, 226, 0.9), rgba(244, 233, 217, 0.76) 34%, rgba(233, 215, 193, 0.72) 100%),
    linear-gradient(180deg, rgba(253, 250, 244, 0.94), rgba(245, 236, 222, 0.9)),
    url('/images/learn/bg/bg1.webp');
  background-size: auto, auto, cover;
  background-attachment: fixed;
}

.publish-header,
.publish-main {
  max-width: 1560px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.publish-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  background: linear-gradient(180deg, rgba(253, 249, 243, 0.78), rgba(253, 249, 243, 0.52));
  backdrop-filter: blur(16px);
}

.publish-header__left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.publish-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #a34135;
  box-shadow: 0 12px 24px rgba(92, 59, 35, 0.08);
}

.publish-header__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(163, 65, 53, 0.72);
}

.publish-header h1 {
  margin-top: 0.28rem;
  font-size: 1.28rem;
  font-weight: 700;
  color: #2b2622;
}

.publish-header p {
  margin-top: 0.22rem;
  font-size: 12px;
  color: #726659;
}

.publish-header__action,
.score-card__retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #a34135, #c57e43);
  color: #fff;
  padding: 0.88rem 1.35rem;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 20px 28px rgba(163, 65, 53, 0.22);
}

.publish-header__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.publish-state {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.publish-state--empty {
  flex-direction: column;
  color: #8b7d6e;
}

.publish-main {
  padding-bottom: 1.4rem;
}

.publish-error {
  margin-bottom: 1rem;
  border-radius: 18px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  padding: 0.85rem 1rem;
  font-size: 13px;
  color: #dc2626;
}

.hero-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.52fr) minmax(330px, 0.72fr);
  align-items: stretch;
  margin-bottom: 1.1rem;
}

.radar-section {
  margin-bottom: 1.1rem;
}

/* AI Analysis Feature Section */
.ai-analysis-section {
  margin-bottom: 1.1rem;
}

.panel-card--ai {
  position: relative;
  border: 1px solid rgba(163, 65, 53, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(255, 248, 240, 0.96)),
    radial-gradient(circle at top left, rgba(163, 65, 53, 0.06), transparent 50%),
    radial-gradient(circle at bottom right, rgba(212, 175, 55, 0.06), transparent 50%);
  box-shadow:
    0 24px 54px rgba(92, 59, 35, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.8rem;
  padding: 0.4rem 0.9rem 0.4rem 0.5rem;
  border-radius: 999px;
  background: linear-gradient(135deg, #a34135, #c57e43);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  box-shadow: 0 8px 20px rgba(163, 65, 53, 0.2);
}

.ai-badge span {
  font-size: 16px;
}

.ai-headline {
  margin-top: 0.5rem;
  font-size: 14px;
  line-height: 1.85;
  color: #5d5249;
  font-style: italic;
}

.ai-block {
  margin-top: 1rem;
  border-radius: 20px;
  padding: 1rem;
}

.ai-block h4 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.ai-block--strengths {
  background: rgba(236, 250, 244, 0.7);
  border: 1px solid rgba(28, 153, 91, 0.12);
}

.ai-block--strengths h4 {
  color: #1b7c51;
}

.ai-block--strengths h4 span {
  color: #1b9e5f;
}

.ai-block--weaknesses {
  background: rgba(255, 244, 241, 0.7);
  border: 1px solid rgba(163, 65, 53, 0.1);
}

.ai-block--weaknesses h4 {
  color: #a34135;
}

.ai-block--weaknesses h4 span {
  color: #c74a3c;
}

.ai-items {
  display: grid;
  gap: 0.6rem;
}

.ai-item {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.8rem 0.9rem;
}

.ai-item strong {
  display: block;
  font-size: 13px;
  color: #2b2622;
}

.ai-item p {
  margin-top: 0.3rem;
  font-size: 13px;
  line-height: 1.75;
  color: #5d5249;
}

.ai-item em {
  display: block;
  margin-top: 0.3rem;
  font-size: 12px;
  font-style: normal;
  color: #8b6d57;
  padding-left: 0.6rem;
  border-left: 2px solid rgba(163, 65, 53, 0.2);
}

.review-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.1rem;
}

.player-card,
.score-card,
.panel-card {
  border-radius: 32px;
  border: 1px solid rgba(214, 186, 145, 0.24);
  background: rgba(255, 252, 246, 0.92);
  box-shadow: 0 24px 54px rgba(92, 59, 35, 0.1);
  backdrop-filter: blur(18px);
}

.player-card {
  position: relative; /* 为悬浮进度条做相对定位 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 250, 243, 0.96), rgba(249, 241, 228, 0.92)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.08), transparent 34%);
}

.player-stage {
  position: relative;
  flex: 1 1 auto;
  height: 100%;
  min-height: 280px;
}

.player-stage__cover,
.player-stage__video {
  position: absolute;
  inset: 0;
}

.player-stage__cover {
  background-position: center;
  background-size: cover;
  transform: scale(1.03);
}

.player-stage__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-stage__mask {
  position: absolute;
  inset: 0;
  /* background 阴影已移除，应用户要求保持视频清晰 */
}

.player-stage__play {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 92px;
  height: 92px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.92);
  color: #fff;
  box-shadow: 0 24px 30px rgba(163, 65, 53, 0.24);
}

.player-stage__play span {
  font-size: 48px;
}

.player-stage__meta {
  position: absolute;
  left: 1.2rem;
  right: 1.2rem;
  bottom: 4rem;
  z-index: 2;
  color: #fffaf0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.player-stage__meta h2 {
  margin-top: 0.3rem;
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  font-weight: 700;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.7);
}

.player-stage__meta p {
  margin-top: 0.4rem;
  max-width: 36rem;
  font-size: 13px;
  line-height: 1.8;
  color: rgba(255, 247, 235, 0.9);
}

.player-card__controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 0.92rem 1.15rem 0.98rem;
  background: transparent;
}

.player-card__times {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.timeline-shell {
  position: relative;
  margin-top: 0.52rem;
}

.timeline {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
  cursor: pointer;
}

.timeline__progress {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a34135, #d4af37);
}

.score-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.2rem;
  background:
    linear-gradient(180deg, rgba(255, 250, 244, 0.98), rgba(247, 238, 221, 0.94)),
    radial-gradient(circle at top right, rgba(212, 175, 55, 0.16), transparent 34%);
}

.score-card__pill {
  width: fit-content;
  border-radius: 999px;
  padding: 0.38rem 0.8rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.score-card__pill.is-ready {
  background: rgba(28, 153, 91, 0.12);
  color: #1b7c51;
}

.score-card__pill.is-polish {
  background: rgba(212, 175, 55, 0.14);
  color: #8c6224;
}

.score-card__pill.is-rework {
  background: rgba(163, 65, 53, 0.12);
  color: #a34135;
}

.score-card__headline {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
}

.score-card__headline strong {
  font-size: clamp(3.6rem, 6vw, 5rem);
  line-height: 1;
  color: #2b2622;
  letter-spacing: -0.04em;
}

.score-card__headline span {
  font-size: 2rem;
  font-weight: 700;
  color: #a34135;
}

.score-card__stars {
  display: flex;
  gap: 0.2rem;
  color: #d4af37;
}

.score-card__copy {
  font-size: 14px;
  line-height: 1.9;
  color: #695c50;
}

.score-card__summary {
  margin-top: -0.35rem;
  font-size: 13px;
  line-height: 1.8;
  color: #857669;
}

.score-card__stats {
  display: grid;
  gap: 0.75rem;
}

.score-card__stat {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  padding: 0.9rem 0.95rem;
}

.score-card__stat span,
.score-card__stat em {
  display: block;
}

.score-card__stat span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #8b7d6e;
}

.score-card__stat strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1rem;
  color: #2b2622;
}

.score-card__stat em {
  margin-top: 0.25rem;
  font-size: 12px;
  font-style: normal;
  line-height: 1.7;
  color: #796c61;
}

.panel-card {
  padding: 1.2rem;
}

.panel-card--radar {
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.96), rgba(249, 241, 228, 0.9));
}

.panel-card__head {
  margin-bottom: 1rem;
}

.panel-card__head h3 {
  margin-top: 0.28rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2b2622;
}

.panel-card--review {
  background:
    linear-gradient(180deg, rgba(255, 251, 246, 0.96), rgba(249, 240, 231, 0.92)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.08), transparent 28%);
}

.panel-card--diagnostic {
  background:
    linear-gradient(180deg, rgba(255, 252, 248, 0.96), rgba(252, 245, 235, 0.92));
}

.panel-card--steps {
  background:
    linear-gradient(180deg, rgba(255, 253, 249, 0.96), rgba(249, 243, 233, 0.92));
}

.panel-card--master {
  background:
    linear-gradient(180deg, rgba(255, 250, 242, 0.92), rgba(246, 235, 218, 0.88));
}

/* Radar left-right layout */
.radar-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.radar-layout__chart {
  flex: 0 0 auto;
}

.radar-layout__bars {
  flex: 1 1 0;
  display: grid;
  gap: 0.65rem;
  min-width: 0;
}

.dim-bar {
  padding: 0.6rem 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
  transition: background 0.2s;
}

.dim-bar:hover {
  background: rgba(255, 255, 255, 0.88);
}

.dim-bar.is-strong {
  border-left: 3px solid #1b9e5f;
}

.dim-bar.is-weak {
  border-left: 3px solid #c74a3c;
}

.dim-bar__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.dim-bar__head strong {
  font-size: 13px;
  color: #2b2622;
}

.dim-bar__head span {
  font-size: 1rem;
  font-weight: 800;
  min-width: 2rem;
  text-align: right;
}

.dim-bar.is-strong .dim-bar__head span {
  color: #1b7c51;
}

.dim-bar.is-weak .dim-bar__head span {
  color: #a34135;
}

.dim-bar.is-normal .dim-bar__head span {
  color: #6d5d51;
}

.dim-bar__track {
  position: relative;
  height: 6px;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: rgba(115, 109, 97, 0.1);
  overflow: hidden;
}

.dim-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d4af37, #c57e43);
  transition: width 0.6s ease;
}

.dim-bar.is-strong .dim-bar__fill {
  background: linear-gradient(90deg, #34d399, #1b9e5f);
}

.dim-bar.is-weak .dim-bar__fill {
  background: linear-gradient(90deg, #f87171, #c74a3c);
}

.dim-bar__note {
  margin-top: 0.3rem;
  font-size: 11px;
  line-height: 1.6;
  color: #8b7d6e;
}

/* Verdict Banner (compact horizontal bar) */
.panel-card--verdict {
  padding: 0;
  background:
    linear-gradient(180deg, rgba(255, 251, 246, 0.96), rgba(249, 240, 231, 0.92)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.08), transparent 28%);
}

.verdict-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem;
  flex-wrap: wrap;
}

.verdict-row__badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
}

.verdict-row__badge.is-ready {
  background: linear-gradient(135deg, #1b9e5f, #269e6d);
}

.verdict-row__badge.is-polish {
  background: linear-gradient(135deg, #c57e43, #d4af37);
}

.verdict-row__badge.is-rework {
  background: linear-gradient(135deg, #a34135, #c74a3c);
}

.verdict-row__text {
  flex: 1 1 200px;
  font-size: 13px;
  line-height: 1.8;
  color: #695c50;
}

.verdict-row__dims {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.verdict-dim {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 16px;
  background: rgba(236, 250, 244, 0.72);
  padding: 0.45rem 0.8rem;
}

.verdict-dim span {
  font-size: 18px;
  color: #1b9e5f;
}

.verdict-dim em {
  display: block;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #8b7d6e;
}

.verdict-dim strong {
  display: block;
  font-size: 13px;
  color: #2b2622;
}

.verdict-dim--weak {
  background: rgba(255, 244, 241, 0.8);
}

.verdict-dim--weak span {
  color: #c74a3c;
}

/* Diagnostic Section */
.panel-card--diagnostic {
  background:
    linear-gradient(180deg, rgba(255, 252, 248, 0.96), rgba(252, 245, 235, 0.92));
}

.review-list {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.95rem;
}

.review-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  padding: 0.95rem;
}

.review-item span {
  color: #a34135;
}

.review-item p {
  font-size: 14px;
  line-height: 1.85;
  color: #66594d;
}

.diagnostic-scroll {
  display: flex;
  gap: 0.8rem;
  margin-top: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.diagnostic-scroll::-webkit-scrollbar {
  height: 4px;
}

.diagnostic-scroll::-webkit-scrollbar-thumb {
  background: rgba(163, 65, 53, 0.15);
  border-radius: 999px;
}

.diagnostic-card {
  flex: 0 0 280px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  padding: 1rem;
}

.diagnostic-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.diagnostic-card__head strong {
  color: #2b2622;
  font-size: 14px;
}

.diagnostic-card__head span {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  padding: 0.24rem 0.5rem;
  font-size: 11px;
  font-weight: 700;
  color: #a34135;
}

.diagnostic-card p {
  margin-top: 0.55rem;
  font-size: 13px;
  line-height: 1.78;
  color: #5d5249;
}

.diagnostic-card em {
  display: block;
  margin-top: 0.45rem;
  font-size: 12px;
  font-style: normal;
  color: #8b6d57;
}

/* Advice Row (steps + master side by side) */
.advice-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 860px) {
  .advice-row {
    grid-template-columns: 1fr;
  }
}

/* Action timeline */
.action-timeline {
  position: relative;
  padding-left: 1.6rem;
}

.action-timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(163, 65, 53, 0.2), rgba(163, 65, 53, 0.06));
  border-radius: 999px;
}

.action-timeline__item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-bottom: 0.85rem;
}

.action-timeline__item:last-child {
  padding-bottom: 0;
}

.action-timeline__dot {
  position: absolute;
  left: -1.6rem;
  top: 0.15rem;
}

.action-timeline__dot span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: linear-gradient(135deg, #a34135, #c57e43);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(163, 65, 53, 0.2);
}

.action-timeline__content p {
  font-size: 13px;
  line-height: 1.75;
  color: #5d5249;
}

.action-timeline--compact {
  margin-top: 0.75rem;
}

.master-recall-fragments {
  display: grid;
  gap: 0.75rem;
}

.master-recall-fragment {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.9rem 0.95rem;
}

.master-recall-fragment strong {
  display: block;
  font-size: 14px;
  color: #2b2622;
}

.master-recall-fragment p {
  margin-top: 0.45rem;
  font-size: 13px;
  line-height: 1.72;
  color: #5d5249;
}

.master-recall-fragment em {
  display: block;
  margin-top: 0.4rem;
  font-size: 12px;
  font-style: normal;
  color: #8b6d57;
}

.leaderboard-card {
  margin-bottom: 1rem;
  background:
    linear-gradient(180deg, rgba(255, 251, 246, 0.96), rgba(247, 240, 228, 0.92)),
    radial-gradient(circle at top right, rgba(212, 175, 55, 0.1), transparent 30%);
}

.leaderboard-list {
  display: grid;
  gap: 0.75rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.9rem 1rem;
}

.leaderboard-item.is-active {
  border: 1px solid rgba(163, 65, 53, 0.16);
  background: linear-gradient(180deg, rgba(255, 249, 244, 0.94), rgba(253, 246, 236, 0.88));
}

.leaderboard-item__left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.leaderboard-item__rank {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.1);
  color: #8b3232;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.leaderboard-item strong {
  color: #2b2622;
}

.leaderboard-item p {
  margin-top: 0.2rem;
  font-size: 11px;
  color: #9b8d80;
}

.leaderboard-item__score {
  font-size: 14px;
  font-weight: 700;
  color: #a34135;
}

.exit-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(8px);
}

.exit-dialog {
  width: min(92vw, 420px);
  border-radius: 28px;
  background: #fff;
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
}

.exit-dialog__icon {
  display: flex;
  width: 84px;
  height: 84px;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  color: #a34135;
}

.exit-dialog h3 {
  text-align: center;
  font-size: 1.45rem;
  font-weight: 700;
  color: #2b2622;
}

.exit-dialog p {
  margin-top: 0.6rem;
  text-align: center;
  font-size: 14px;
  line-height: 1.8;
  color: #66594d;
}

.exit-dialog__actions {
  display: grid;
  gap: 0.7rem;
  margin-top: 1.2rem;
}

.exit-dialog__ghost {
  border-radius: 999px;
  border: 1px solid rgba(163, 65, 53, 0.14);
  padding: 0.88rem 1rem;
  font-size: 13px;
  font-weight: 700;
  color: #6c5d51;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .insight-grid {
    grid-template-columns: 1fr;
  }

  .radar-layout {
    flex-direction: column;
    align-items: center;
  }

  .radar-layout__bars {
    width: 100%;
  }
}

@media (min-width: 1181px) {
  .score-card {
    position: sticky;
    top: 86px;
    align-self: start;
  }
}

@media (max-width: 768px) {
  .publish-header,
  .publish-main {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .publish-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .player-stage {
    min-height: 340px;
  }

  .player-stage__meta {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
  }

  .timeline-shell {
    margin-top: 0.5rem;
  }

  .playback-focus {
    grid-template-columns: 1fr;
  }

  .review-section {
    grid-template-columns: 1fr;
  }
}
</style>
