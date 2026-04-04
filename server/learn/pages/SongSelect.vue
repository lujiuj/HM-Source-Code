<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import { getWeakAnalysisDimensions, normalizeAnalysisV2 } from '../utils/analysisV2.js'
import { formatRelativeTime, formatScore, getLearnSongById, getLearnSongs } from '../utils/learnCatalog.js'
import { getPracticeLandingVisuals } from '../utils/learnVisuals.js'
import { requestPublishAiAnalysis } from '../utils/publishAi.js'
import { getDailyChallenge, syncJourneyProgress, touchStudyVisit } from '../utils/studyProgress.js'
import { analyzeUploadedSongFile, isSongUploadAnalysisSupported } from '../utils/uploadedAudioAnalysis.js'

const VIEW_MODE_KEY = 'learn.practice.view-mode'
const DEMO_PRACTICE_SONG_ID = 'tianxianpei-fuqishuangshuang'
const router = useRouter()
const infra = getInfra()
const landingVisuals = getPracticeLandingVisuals()

const songs = ref([])
const loading = ref(true)
const songFilter = ref('all')
const searchQuery = ref('')
const studySummary = ref(null)
const dailyChallenge = ref(null)
const viewMode = ref(typeof window === 'undefined' ? 'grid' : (window.localStorage.getItem(VIEW_MODE_KEY) || 'grid'))
const uploadInputRef = ref(null)
const pendingUploadSongId = ref('')
const uploadError = ref('')
const shellPrompt = ref({ open: false, song: null, action: 'practice' })
const uploadState = ref({ loading: false, phase: '', songName: '', progress: 0 })
let uploadProgressTimer = null
let uploadProgressTarget = 0

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'score', label: '完整演示' },
  { key: 'analysis', label: '待接入唱段' }
]

const filteredSongs = computed(() => {
  const keyword = String(searchQuery.value || '').trim().toLowerCase()
  return songs.value.filter((song) => {
    const matchesFilter = songFilter.value === 'all'
      || (songFilter.value === 'score' && song.isScorable)
      || (songFilter.value === 'analysis' && !song.isScorable)
    if (!matchesFilter) return false
    if (!keyword) return true
    return [song.title, song.operaName, song.excerptName, song.singer, song.summary, ...(song.tags || [])]
      .some((item) => String(item || '').toLowerCase().includes(keyword))
  })
})
const practiceSongs = computed(() => songs.value.filter((song) => song.isScorable))
const analysisSongs = computed(() => songs.value.filter((song) => !song.isScorable))

function pickAlternateSong(excludedIds = [], predicate = null) {
  const blocked = new Set((excludedIds || []).filter(Boolean))
  const matcher = typeof predicate === 'function' ? predicate : () => true
  return songs.value.find((song) => !blocked.has(song.id) && matcher(song))
    || songs.value.find((song) => !blocked.has(song.id))
    || null
}

function resolveUniqueImage(song, preferredKeys = [], usedUrls = []) {
  const blocked = new Set((usedUrls || []).filter(Boolean))
  const fallbackKeys = ['galleryCover', 'timelineCover', 'cover', 'bannerImage', 'heroImage', 'portrait']
  const queue = [...preferredKeys, ...fallbackKeys]
  const seen = new Set()
  for (const key of queue) {
    if (!key || seen.has(key)) continue
    seen.add(key)
    const candidate = String(song?.[key] || '').trim()
    if (!candidate || blocked.has(candidate)) continue
    return candidate
  }
  return ''
}

const latestPractice = computed(() => studySummary.value?.latestPractice || null)
const latestPracticeSong = computed(() => (latestPractice.value?.songId ? getLearnSongById(latestPractice.value.songId) : null))
const featuredSong = computed(() => {
  const challengeSong = dailyChallenge.value?.song
  if (challengeSong?.isScorable) return challengeSong
  return practiceSongs.value[0] || songs.value[0] || null
})
const featuredEyebrow = computed(() => (dailyChallenge.value?.song?.isScorable ? '今日练唱' : '推荐练唱'))
const resumeSong = computed(() => {
  if (latestPracticeSong.value) return latestPracticeSong.value
  return pickAlternateSong([featuredSong.value?.id], (song) => song.isScorable)
    || pickAlternateSong([featuredSong.value?.id])
    || featuredSong.value
    || songs.value[0]
    || null
})
const uploadEntrySong = computed(() => songs.value.find((song) => isSongUploadAnalysisSupported(song)) || null)
const analysisHighlightSong = computed(() => {
  const challengeSong = dailyChallenge.value?.song
  if (challengeSong && !challengeSong.isScorable) return challengeSong
  return analysisSongs.value.find((song) => song.id !== featuredSong.value?.id) || null
})
const practiceDemoSong = computed(() => getLearnSongById(DEMO_PRACTICE_SONG_ID) || featuredSong.value || songs.value[0] || null)
const reviewSong = computed(() => {
  if (latestPracticeSong.value) return latestPracticeSong.value
  return pickAlternateSong([featuredSong.value?.id, resumeSong.value?.id], (song) => isSongUploadAnalysisSupported(song))
    || pickAlternateSong([featuredSong.value?.id, resumeSong.value?.id])
    || resumeSong.value
    || featuredSong.value
    || null
})
const heroImageUrl = computed(() => {
  return resolveUniqueImage(featuredSong.value, ['bannerImage', 'heroImage', 'galleryCover', 'cover'])
    || landingVisuals.heroImage
    || '/images/learn/practice-banner.png'
})
const resumeImageUrl = computed(() => {
  return resolveUniqueImage(
    resumeSong.value,
    ['timelineCover', 'galleryCover', 'cover', 'heroImage', 'bannerImage'],
    [heroImageUrl.value]
  ) || landingVisuals.resumeImage
    || '/images/learn/practice-banner.png'
})
const reviewImageUrl = computed(() => {
  return resolveUniqueImage(
    reviewSong.value,
    ['timelineCover', 'galleryCover', 'bannerImage', 'cover', 'portrait', 'heroImage'],
    [heroImageUrl.value, resumeImageUrl.value]
  ) || landingVisuals.reviewImage
    || '/images/learn/master-bg.png'
})
const weakestDimensions = computed(() => {
  if (!latestPractice.value) return []
  return getWeakAnalysisDimensions(normalizeAnalysisV2(latestPractice.value.analysisV2 || {
    overallScore: latestPractice.value.score || latestPractice.value.averageScore || 0,
    overallGrade: latestPractice.value.grade || 'C',
    dimensions: latestPractice.value.breakdown || {}
  }), 3)
})
const practiceScoreText = computed(() => latestPractice.value ? formatScore(latestPractice.value.averageScore || latestPractice.value.score || 0) : '--')
const practiceDurationText = computed(() => {
  let total = Number(latestPractice.value?.durationSec || latestPractice.value?.duration || 0)
  if (!total) return '未记录'
  if (total > 1000) total = total / 1000
  const minute = Math.floor(total / 60)
  const second = Math.round(total % 60)
  return `${minute}分${String(second).padStart(2, '0')}秒`
})
const practiceTimeText = computed(() => {
  const time = latestPractice.value?.updatedAt || latestPractice.value?.createdAt || latestPractice.value?.timestamp
  return latestPractice.value ? formatRelativeTime(time) : '暂未开始'
})
const practiceGradeText = computed(() => latestPractice.value?.grade || '--')
const levelLabel = computed(() => `第 ${studySummary.value?.level || 1} 层`)
const levelHint = computed(() => studySummary.value ? `还需 ${studySummary.value.remainingExp || 0} 经验进入下一层` : '先完成一次练唱，系统会自动记录进度。')
const progressPercent = computed(() => {
  if (!studySummary.value) return 0
  const currentExp = Number(studySummary.value.currentExp || 0)
  const remainingExp = Number(studySummary.value.remainingExp || 0)
  return Math.max(0, Math.min(100, Math.round((currentExp / Math.max(1, currentExp + remainingExp)) * 100)))
})

function openRoute(target) { if (target) router.push(target) }
function difficultyLabel(song) {
  if (song?.difficultyText) return song.difficultyText
  const level = Math.max(1, Math.min(5, Number(song?.difficulty || 1)))
  return ['入门', '易上手', '进阶', '挑战', '舞台级'][level - 1]
}
function songCardImage(song) {
  return resolveUniqueImage(song, ['galleryCover', 'timelineCover', 'bannerImage', 'heroImage', 'cover'])
    || landingVisuals.heroImage
    || '/images/learn/practice-banner.png'
}
function songCardObjectPosition(song) {
  return song?.bannerObjectPosition || song?.heroObjectPosition || song?.objectPosition || 'center center'
}
function openSong(song) {
  if (!song) return
  if (song.isScorable) return router.push({ path: '/learn/practice/karaoke', query: { songId: song.id } })
  openShellPrompt(song, 'practice')
}
function openShellPrompt(song, action = 'practice') {
  shellPrompt.value = {
    open: true,
    song,
    action
  }
}
function closeShellPrompt() {
  shellPrompt.value = { open: false, song: null, action: 'practice' }
}
function goToDemoPractice(songId = DEMO_PRACTICE_SONG_ID) {
  router.push({ path: '/learn/practice/karaoke', query: { songId } })
}
function persistViewMode(mode) {
  viewMode.value = mode
  if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_MODE_KEY, mode)
}
function stopUploadProgress() {
  if (uploadProgressTimer) {
    clearInterval(uploadProgressTimer)
    uploadProgressTimer = null
  }
}
function ensureUploadProgressTimer() {
  if (uploadProgressTimer) return
  uploadProgressTimer = setInterval(() => {
    if (!uploadState.value.loading) return
    const current = Number(uploadState.value.progress || 0)
    if (current >= uploadProgressTarget) return
    const step = Math.max(1, Math.ceil((uploadProgressTarget - current) * 0.16))
    uploadState.value = { ...uploadState.value, progress: Math.min(uploadProgressTarget, current + step) }
  }, 140)
}
function setUploadPhase(phase, target, songName = uploadState.value.songName) {
  uploadProgressTarget = Math.max(uploadProgressTarget, Math.min(99, Number(target || 0)))
  uploadState.value = {
    loading: true,
    phase,
    songName,
    progress: Math.max(Number(uploadState.value.progress || 0), uploadProgressTarget > 0 ? Math.min(uploadProgressTarget - 12, uploadProgressTarget) : 8)
  }
  ensureUploadProgressTimer()
}
async function finishUploadProgress() {
  uploadProgressTarget = 100
  uploadState.value = { ...uploadState.value, progress: 100 }
  await new Promise((resolve) => setTimeout(resolve, 180))
}
function openUploadAnalysis(song = null) {
  if (song && !isSongUploadAnalysisSupported(song)) {
    openShellPrompt(song, 'upload')
    return
  }
  const targetSong = song && isSongUploadAnalysisSupported(song) ? song : uploadEntrySong.value
  if (!targetSong?.id) return
  uploadError.value = ''
  pendingUploadSongId.value = targetSong.id
  uploadInputRef.value?.click?.()
}
function continueDemoShell() {
  const targetSong = practiceDemoSong.value
  const action = shellPrompt.value.action
  closeShellPrompt()
  if (!targetSong?.id) return
  if (action === 'upload') {
    openUploadAnalysis(targetSong)
    return
  }
  goToDemoPractice(targetSong.id)
}
function toPlainJson(value) { return value == null ? value : JSON.parse(JSON.stringify(value)) }
async function loadPage() {
  loading.value = true
  try {
    songs.value = getLearnSongs()
    await touchStudyVisit(infra.identity)
    const summary = await syncJourneyProgress(infra.identity, infra)
    studySummary.value = summary
    dailyChallenge.value = getDailyChallenge(summary)
  } finally {
    loading.value = false
  }
}
async function handleUploadFromHome(event) {
  const file = event?.target?.files?.[0]
  const songId = pendingUploadSongId.value
  const song = songs.value.find((item) => item.id === songId) || uploadEntrySong.value
  if (!file || !song?.id) {
    if (event?.target) event.target.value = ''
    return
  }
  uploadError.value = ''
  let storedMediaId = ''
  try {
    setUploadPhase('正在上传音频', 28, song.title)
    const stored = await infra.media.storeMedia(file, {
      userId: infra.identity.getUid(),
      songId: song.id,
      type: file.type || 'audio/wav'
    })
    storedMediaId = String(stored?.id || '')
    setUploadPhase('正在生成结构化评分', 62, song.title)
    const analysisResult = await analyzeUploadedSongFile({ file, song })
    setUploadPhase('智能助手正在整理发布建议', 88, song.title)
    const publishAiAnalysis = await requestPublishAiAnalysis({
      songId: song.id,
      songName: song.title,
      analysisV2: analysisResult.analysisV2
    })
    const practiceId = await infra.practice.savePracticeSession(infra.identity.getUid(), {
      songId: song.id,
      songName: song.title,
      score: analysisResult.averageScore,
      averageScore: analysisResult.averageScore,
      totalScore: analysisResult.totalScore,
      lineCount: analysisResult.lineCount,
      grade: analysisResult.grade,
      stars: analysisResult.stars,
      duration: analysisResult.durationSec,
      breakdown: toPlainJson(analysisResult.breakdown),
      mediaId: storedMediaId,
      mediaUrl: String(stored?.url || ''),
      analysisV2: toPlainJson(analysisResult.analysisV2),
      lineScores: toPlainJson(analysisResult.lineScores),
      publishAiAnalysis: toPlainJson(publishAiAnalysis),
      source: 'uploaded-audio'
    })
    await finishUploadProgress()
    pendingUploadSongId.value = ''
    router.push(`/learn/practice/history/${practiceId}`)
  } catch (error) {
    if (storedMediaId) await infra.media.deleteMedia(storedMediaId).catch(() => {})
    uploadError.value = error instanceof Error ? error.message : '上传分析失败，请稍后重试。'
  } finally {
    stopUploadProgress()
    uploadState.value = { loading: false, phase: '', songName: '', progress: 0 }
    pendingUploadSongId.value = ''
    if (event?.target) event.target.value = ''
  }
}

onMounted(() => { void loadPage() })
onBeforeUnmount(() => { stopUploadProgress() })
</script>

<template>
  <div class="song-select-page min-h-full text-slate-900">
    <div
      v-if="uploadState.loading"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1208]/45 px-4 backdrop-blur-[2px]"
    >
      <div class="w-full max-w-[420px] rounded-[26px] border border-white/15 bg-[linear-gradient(145deg,rgba(41,26,16,0.96),rgba(24,14,8,0.96))] px-6 py-7 text-white shadow-2xl">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <span class="inline-flex size-9 animate-spin rounded-full border-[3px] border-white/25 border-t-[#a34135]"></span>
        </div>
        <p class="mt-5 text-center text-[10px] tracking-[0.28em] text-white/55">智能助手正在准备发布页</p>
        <h2 class="mt-3 text-center text-[28px] font-bold tracking-tight">{{ uploadState.songName || '正在准备发布页' }}</h2>
        <p class="mt-3 text-center text-sm leading-7 text-white/78">{{ uploadState.phase || '正在整理分析结果' }}</p>
        <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div class="h-full rounded-full bg-gradient-to-r from-[#a34135] via-[#ffd182] to-[#fff0cb]" :style="{ width: `${Math.max(8, uploadState.progress || 0)}%` }"></div>
        </div>
        <p class="mt-3 text-center text-xs font-bold tracking-[0.16em] text-white/58">{{ Math.max(8, Math.round(uploadState.progress || 0)) }}%</p>
      </div>
    </div>

    <Transition name="sheet-fade">
      <div v-if="shellPrompt.open" class="shell-prompt" @click.self="closeShellPrompt">
        <article class="shell-prompt__dialog">
          <div class="shell-prompt__art">
            <img
              :src="shellPrompt.song?.bannerImage || shellPrompt.song?.heroImage || practiceDemoSong?.bannerImage || practiceDemoSong?.heroImage"
              :alt="shellPrompt.song?.title || '当前唱段'"
            />
            <div class="shell-prompt__mask"></div>
            <div class="shell-prompt__copy">
              <span>演示说明</span>
              <h2>{{ shellPrompt.song?.title || '当前唱段' }}</h2>
              <p>
                当前完整接通的是《天仙配》的演示流程。这个唱段先沿用同一套直接演唱与上传分析入口，正式接入后只需要替换音轨、歌词和分析素材。
              </p>
            </div>
          </div>
          <div class="shell-prompt__body">
            <div class="shell-prompt__meta">
              <strong>{{ shellPrompt.action === 'upload' ? '上传录音分析' : '直接演唱' }}</strong>
              <p>现在会进入《天仙配》的同款演示流程，方便你现场把完整链路走通。</p>
            </div>
            <div class="shell-prompt__actions">
              <button class="primary-btn" @click="continueDemoShell">
                <span class="material-symbols-outlined text-[18px]">{{ shellPrompt.action === 'upload' ? 'upload_file' : 'mic' }}</span>
                {{ shellPrompt.action === 'upload' ? '上传录音分析' : '直接演唱' }}
              </button>
              <button class="ghost-btn" @click="closeShellPrompt">
                <span class="material-symbols-outlined text-[18px]">close</span>
                先留在当前页
              </button>
            </div>
          </div>
        </article>
      </div>
    </Transition>

    <input ref="uploadInputRef" class="hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.webm" @change="handleUploadFromHome" />

    <div class="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-6 lg:px-8">
      <header class="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.88fr)]">
        <article class="hero-panel">
          <img
            :src="heroImageUrl"
            class="hero-panel__image"
            :style="{ objectPosition: featuredSong?.bannerObjectPosition || featuredSong?.heroObjectPosition || 'center center' }"
            :alt="featuredSong?.title || '今日练唱'"
          />
          <div class="hero-panel__mask"></div>
          <div class="hero-panel__texture" :style="{ backgroundImage: featuredSong?.textureImage ? `url(${featuredSong.textureImage})` : 'none' }"></div>
          <div class="hero-panel__content">
            <span class="pill">{{ featuredEyebrow }}</span>
            <div>
              <h1 class="hero-title">{{ featuredSong?.title || '先选一段好戏开始练习' }}</h1>
              <p class="hero-copy">{{ featuredSong?.summary || '从这里开始你的黄梅戏练唱之旅。' }}</p>
            </div>
            <div class="hero-actions">
              <button class="primary-btn" :disabled="!featuredSong" @click="openSong(featuredSong)">
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                开始练习
              </button>
              <button
                v-if="featuredSong && isSongUploadAnalysisSupported(featuredSong)"
                class="ghost-btn"
                @click="openUploadAnalysis(featuredSong)"
              >
                <span class="material-symbols-outlined text-[18px]">upload_file</span>
                上传录音分析
              </button>
              <button
                v-else
                class="ghost-btn"
                :disabled="!featuredSong"
                @click="openRoute('/learn/practice/history')"
              >
                <span class="material-symbols-outlined text-[18px]">history</span>
                查看历史
              </button>
            </div>
          </div>
        </article>

        <article class="resume-panel">
          <img
            :src="resumeImageUrl"
            class="resume-panel__image"
            :style="{ objectPosition: resumeSong?.heroObjectPosition || resumeSong?.objectPosition || 'center center' }"
            :alt="resumeSong?.title || '继续练习'"
          />
          <div class="resume-panel__mask"></div>
          <div class="resume-panel__texture" :style="{ backgroundImage: resumeSong?.textureImage ? `url(${resumeSong.textureImage})` : 'none' }"></div>
          <div class="resume-panel__content">
            <span class="pill pill--soft">继续练习</span>
            <div>
              <h2 class="hero-title hero-title--resume">{{ resumeSong?.title || '还没有生成练习记录' }}</h2>
              <p class="hero-copy hero-copy--resume">{{ latestPractice ? `上次练习 ${practiceTimeText}` : '完成一次练唱后，这里会显示你的进度。' }}</p>
            </div>
            <div class="mini-grid">
              <div class="mini-card"><p>最近得分</p><strong>{{ practiceScoreText }}</strong></div>
              <div class="mini-card"><p>练习时长</p><strong>{{ practiceDurationText }}</strong></div>
              <div class="mini-card"><p>当前层级</p><strong>{{ levelLabel }}</strong></div>
            </div>
            <div class="hero-actions">
              <button class="accent-btn" :disabled="!resumeSong" @click="openSong(resumeSong)">
                <span class="material-symbols-outlined text-[18px]">mic</span>
                继续练唱
              </button>
              <button class="ghost-btn ghost-btn--light" @click="openRoute('/learn/practice/history')">
                <span class="material-symbols-outlined text-[18px]">history</span>
                查看历史
              </button>
            </div>
          </div>
        </article>
      </header>

      <div class="grid gap-6 2xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,0.92fr)]">
        <section class="space-y-6">
          <div class="section-head">
            <div>
              <h2 class="section-title">曲目练唱</h2>
              <p class="section-copy">选一段喜欢的唱段，开始练习吧。</p>
            </div>
            <div class="mode-switch">
              <button :class="viewMode === 'grid' ? 'is-active' : ''" @click="persistViewMode('grid')"><span class="material-symbols-outlined text-[18px]">grid_view</span></button>
              <button :class="viewMode === 'list' ? 'is-active' : ''" @click="persistViewMode('list')"><span class="material-symbols-outlined text-[18px]">view_list</span></button>
            </div>
          </div>

          <div class="toolbar">
            <div class="search-box">
              <span class="material-symbols-outlined">search</span>
              <input v-model.trim="searchQuery" placeholder="搜索曲目、剧目、唱段或名师" />
            </div>
            <div class="filter-row">
              <button v-for="item in filterOptions" :key="item.key" :class="songFilter === item.key ? 'filter-chip is-active' : 'filter-chip'" @click="songFilter = item.key">
                {{ item.label }}
              </button>
              <p class="count-text">{{ filteredSongs.length }} 段</p>
            </div>
          </div>

          <div v-if="loading" class="empty-state">正在整理今日练唱内容</div>

          <div v-else :class="['song-grid', viewMode === 'grid' ? 'song-grid--grid' : 'song-grid--list']">
            <article
              v-for="song in filteredSongs"
              :key="song.id"
              class="song-card"
              :class="viewMode === 'list' ? 'song-card--list' : 'song-card--grid'"
              @click="openSong(song)"
            >
              <div class="song-card__media">
                <img :src="songCardImage(song)" :alt="song.title" :style="{ objectPosition: songCardObjectPosition(song) }" />
                <div class="song-card__veil"></div>
                <div class="song-card__texture" :style="{ backgroundImage: song.textureImage ? `url(${song.textureImage})` : 'none' }"></div>
                <div class="song-card__tags">
                  <span class="badge" :class="difficultyLabel(song) === '入门' ? 'badge--red' : difficultyLabel(song) === '进阶' ? 'badge--gold' : 'badge--gray'">{{ difficultyLabel(song) }}</span>
                  <span v-if="song.role" class="badge badge--dark">{{ song.role }}</span>
                </div>
                <button class="song-card__play">
                  <span class="material-symbols-outlined text-2xl">{{ song.isScorable ? 'play_circle' : 'headphones' }}</span>
                </button>
              </div>

              <div class="song-card__body">
                <div class="song-card__top">
                  <div class="min-w-0">
                    <h3>{{ song.title }}</h3>
                    <p>{{ song.singer }} · {{ song.type }}</p>
                  </div>
                  <span class="song-card__state">{{ song.isScorable ? '完整演示' : '待接入唱段' }}</span>
                </div>
                <p class="song-card__summary">{{ song.summary }}</p>
                <div class="song-card__bottom">
                  <div class="song-card__bottom-head">
                    <div class="tag-row">
                      <span v-for="tag in song.tags?.slice(0, 3) || []" :key="tag" class="mini-tag">{{ tag }}</span>
                    </div>
                    <p class="song-card__hint">{{ song.isScorable ? '可直接开唱，也可以先上传成品做一次完整分析。' : '当前先沿用统一的演示入口，现场会跳入《天仙配》的完整流程。' }}</p>
                  </div>
                  <div class="song-card__actions">
                    <button
                      class="song-action song-action--primary"
                      @click.stop="openSong(song)"
                    >
                      <span class="material-symbols-outlined text-[18px]">mic</span>
                      直接演唱
                    </button>
                    <button
                      class="song-action song-action--ghost"
                      @click.stop="openUploadAnalysis(song)"
                    >
                      <span class="material-symbols-outlined text-[18px]">upload_file</span>
                      上传录音分析
                    </button>
                  </div>
                </div>
              </div>
            </article>

            <div v-if="!filteredSongs.length" class="empty-state empty-state--card">没有匹配曲目</div>
          </div>
        </section>

        <aside class="space-y-6">
          <article v-if="weakestDimensions.length" class="side-card">
            <p class="side-kicker">薄弱项</p>
            <h3>最近练唱分析</h3>
            <div class="dimension-list">
              <div v-for="dim in weakestDimensions" :key="dim.key" class="dimension-item">
                <div class="dimension-item__head">
                  <span>{{ dim.label }}</span>
                  <strong>{{ formatScore(dim.value) }}</strong>
                </div>
                <div class="dimension-bar"><i :style="{ width: `${Math.max(8, Math.min(100, dim.value || 0))}%` }"></i></div>
              </div>
            </div>
          </article>
          <article v-if="analysisHighlightSong" class="side-card side-card--soft">
            <p class="side-kicker">演示说明</p>
            <h3>{{ analysisHighlightSong.title }}</h3>
            <p class="side-copy">非《天仙配》唱段先沿用统一入口，演示时会跳入同一套直接演唱与上传分析流程，视觉和动线保持一致，后续再逐首补真实音轨与分析模型。</p>
            <div class="hero-actions" style="margin-top: 1rem">
              <button class="ghost-btn ghost-btn--neutral" @click="openShellPrompt(analysisHighlightSong, 'practice')">
                <span class="material-symbols-outlined text-[18px]">mic</span>
                直接演唱
              </button>
              <button class="ghost-btn ghost-btn--neutral" @click="openShellPrompt(analysisHighlightSong, 'upload')">
                <span class="material-symbols-outlined text-[18px]">upload_file</span>
                上传录音分析
              </button>
            </div>
          </article>
        </aside>
      </div>
    </div>

    <p v-if="uploadError" class="toast-error">{{ uploadError }}</p>
  </div>
</template>

<style scoped lang="less">
.song-select-page {
  background: transparent;
}

.shell-prompt {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(28, 17, 10, 0.42);
  backdrop-filter: blur(10px);
}

.shell-prompt__dialog {
  width: min(92vw, 860px);
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(255, 244, 228, 0.28);
  background:
    linear-gradient(180deg, rgba(255, 251, 244, 0.98), rgba(246, 235, 217, 0.96)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.12), transparent 30%);
  box-shadow: 0 26px 82px rgba(35, 20, 11, 0.34);
}

.shell-prompt__art {
  position: relative;
  min-height: 248px;
}

.shell-prompt__art img,
.shell-prompt__mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.shell-prompt__art img {
  object-fit: cover;
}

.shell-prompt__mask {
  background:
    linear-gradient(120deg, rgba(21, 13, 9, 0.82), rgba(21, 13, 9, 0.28) 60%, rgba(21, 13, 9, 0.56)),
    linear-gradient(180deg, rgba(212, 175, 55, 0.12), transparent 40%);
}

.shell-prompt__copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.85rem;
  max-width: 32rem;
  padding: 1.5rem 1.55rem;
  color: #fff7ee;
}

.shell-prompt__copy span {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(255, 238, 213, 0.74);
}

.shell-prompt__copy h2 {
  font-size: clamp(1.8rem, 2.8vw, 2.6rem);
  line-height: 1.08;
  font-family: var(--learn-font-display);
}

.shell-prompt__copy p {
  font-size: 14px;
  line-height: 1.85;
  color: rgba(255, 247, 238, 0.86);
}

.shell-prompt__body {
  display: grid;
  gap: 1rem;
  padding: 1.3rem 1.4rem 1.45rem;
}

.shell-prompt__meta {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  padding: 1rem 1.05rem;
}

.shell-prompt__meta strong {
  display: block;
  font-size: 15px;
  color: #2b2622;
}

.shell-prompt__meta p {
  margin-top: 0.4rem;
  font-size: 13px;
  line-height: 1.8;
  color: #6e6156;
}

.shell-prompt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-panel,
.resume-panel,
.side-card,
.toolbar,
.section-head,
.mobile-sheet,
.empty-state {
  border-radius: var(--learn-radius-card, 12px);
}

.hero-panel,
.resume-panel {
  position: relative;
  overflow: hidden;
  min-height: 240px;
  box-shadow: 0 22px 56px rgba(92, 59, 35, 0.12);
  border: 1px solid rgba(255, 244, 228, 0.74);
  background: rgba(255, 255, 255, 0.94);
}

@media (min-width: 1280px) {
  .hero-panel {
    min-height: 280px;
  }
}

.hero-panel__image,
.resume-panel__image,
.side-card--image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-panel__mask {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 250, 243, 0.96) 0%, rgba(255, 250, 243, 0.82) 38%, rgba(255, 250, 243, 0.16) 100%),
    linear-gradient(180deg, rgba(212, 175, 55, 0.1), rgba(255, 255, 255, 0));
}

.resume-panel__mask {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(34, 21, 15, 0.86) 0%, rgba(98, 43, 35, 0.78) 64%, rgba(139, 61, 37, 0.72) 100%);
}

.hero-panel__texture,
.resume-panel__texture,
.song-card__texture {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  background-size: 180px 180px;
  opacity: 0.18;
  mix-blend-mode: soft-light;
}

.hero-panel__content,
.resume-panel__content,
.side-card__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 260px;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
}

.resume-panel__content {
  color: #fff;
  align-items: flex-start;
}

.pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border: 1px solid rgba(163, 65, 53, 0.15);
  background: rgba(163, 65, 53, 0.05);
  padding: 0.38rem 0.95rem;
  border-radius: var(--learn-radius-sm, 8px);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--learn-primary, #a34135);
}

.pill--soft {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.hero-title {
  margin-top: 0.75rem;
  max-width: 14ch;
  font-size: clamp(1.6rem, 2.6vw, 2.4rem);
  line-height: 1.15;
  font-weight: 700;
  color: #221610;
  font-family: var(--learn-font-display);
  letter-spacing: 0.01em;
  text-shadow: none;
}

.hero-title--resume {
  color: #fff;
  max-width: 14ch;
  font-size: clamp(1.35rem, 1.8vw, 1.8rem);
}

.hero-copy {
  max-width: 31rem;
  margin-top: 0.72rem;
  font-size: 0.98rem;
  line-height: 1.78;
  color: #736D61;
  text-shadow: none;
}

.hero-copy--resume {
  color: rgba(255, 255, 255, 0.8);
  max-width: 24rem;
  font-size: 0.9rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1rem;
}

.hero-actions--stack {
  align-items: stretch;
}

.mini-grid {
  width: 100%;
  margin-top: 1.05rem;
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mini-card {
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.1);
  padding: 0.72rem 0.8rem;
  backdrop-filter: blur(12px);
}

.mini-card p {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
}

.mini-card strong {
  display: block;
  margin-top: 0.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.primary-btn,
.ghost-btn,
.accent-btn,
.upload-btn,
.sheet-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--learn-radius-sm, 8px);
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  letter-spacing: 0.02em;
}

.primary-btn,
.accent-btn,
.upload-btn {
  padding: 0.82rem 1.26rem;
  color: #fff;
  background: #a34135;
  box-shadow: 0 4px 12px rgba(192, 74, 68, 0.2);
  border: 1px solid #a34135;
  font-size: 14px;
}

.primary-btn:hover,
.accent-btn:hover,
.upload-btn:hover {
  transform: translateY(-2px);
  background: #a62c2b;
  box-shadow: 0 6px 16px rgba(192, 74, 68, 0.3);
}

.primary-btn--wide {
  flex: 1;
}

.accent-btn {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.6);
  color: var(--learn-primary, #a34135);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.accent-btn:hover {
  background: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.ghost-btn,
.sheet-btn {
  padding: 0.82rem 1.26rem;
  background: transparent;
  color: #a34135;
  border: 1px solid #a34135;
  font-size: 14px;
}

.ghost-btn:hover,
.sheet-btn:hover {
  background: rgba(192, 74, 68, 0.05);
  transform: translateY(-2px);
}

.ghost-btn--light {
  color: #fff;
  border-color: #fff;
}

.ghost-btn--light:hover {
  background: rgba(255, 255, 255, 0.1);
}

.ghost-btn--neutral {
  color: #a34135;
  background: rgba(192, 74, 68, 0.08);
  border-color: rgba(192, 74, 68, 0.12);
}

.ghost-btn--neutral:hover {
  background: rgba(192, 74, 68, 0.12);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.section-head,
.toolbar,
.side-card,
.empty-state {
  border: 1px solid rgba(255, 248, 235, 0.5);
  background: rgba(255, 251, 244, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 8px rgba(92, 59, 35, 0.05);
}

.section-head,
.toolbar {
  padding: 1rem 1.25rem;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: end;
  gap: 1rem;
}

.section-title {
  font-size: clamp(1.5rem, 1.9vw, 1.9rem);
  font-weight: 700;
  color: #241a14;
}

.section-copy,
.side-copy {
  margin-top: 0.3rem;
  line-height: 1.75;
  color: #655647;
}

.mode-switch {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(216, 199, 164, 0.6);
  background: rgba(255, 255, 255, 0.8);
}

.mode-switch button {
  border-radius: var(--learn-radius-sm, 8px);
  padding: 0.55rem 0.9rem;
  color: rgba(115, 109, 97, 0.72);
}

.mode-switch .is-active {
  background: var(--learn-primary, #a34135);
  color: #fff;
}

.toolbar {
  display: grid;
  gap: 0.9rem;
}

.search-box {
  position: relative;
}

.search-box span {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(115, 109, 97, 0.4);
}

.search-box input {
  width: 100%;
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(216, 199, 164, 0.45);
  background: rgba(255, 255, 255, 0.98);
  padding: 0.8rem 1rem 0.8rem 2.75rem;
  outline: none;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.filter-chip {
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(216, 199, 164, 0.35);
  background: #fff;
  padding: 0.55rem 1rem;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #736d61;
}

.filter-chip.is-active {
  background: var(--learn-primary, #a34135);
  color: #fff;
  border-color: var(--learn-primary, #a34135);
}

.count-text {
  margin-left: auto;
  font-size: 12px;
  color: rgba(115, 109, 97, 0.7);
}

.empty-state {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  border-radius: var(--learn-radius-card, 12px);
  border-style: dashed;
  color: rgba(115, 109, 97, 0.62);
}

.empty-state--card {
  width: 100%;
}

.empty-state--small {
  min-height: 120px;
}

.song-grid {
  display: grid;
  gap: 1.25rem;
}

.song-grid--grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.song-grid--list {
  grid-template-columns: 1fr;
}

.song-card {
  overflow: hidden;
  border-radius: var(--learn-radius-card, 12px);
  border: 1px solid rgba(255, 245, 232, 0.88);
  background: rgba(255, 252, 247, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 18px 42px rgba(92, 59, 35, 0.08);
  cursor: pointer;
  transition: transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 280ms ease, border-color 280ms ease;
}

.song-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 28px 68px rgba(92, 59, 35, 0.16);
  border-color: rgba(192, 74, 68, 0.22);
}

.song-card--list {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
}

.song-card__media {
  position: relative;
  overflow: hidden;
  background: #f4ead8;
  aspect-ratio: 4 / 5;
}

.song-card--list .song-card__media {
  aspect-ratio: auto;
  min-height: 160px;
}

.song-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-card__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(17, 11, 8, 0) 45%, rgba(17, 11, 8, 0.35) 100%);
}

.song-card__texture {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  background-size: 160px 160px;
  opacity: 0.2;
  mix-blend-mode: soft-light;
}

.song-card__tags {
  position: absolute;
  left: 0.85rem;
  top: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fff;
}

.badge--red { background: linear-gradient(135deg, #a34135, #a83a34); }
.badge--gold { background: linear-gradient(135deg, #d4af37, #b8960d); }
.badge--gray { background: linear-gradient(135deg, #736d61, #5c574c); }
.badge--dark { background: rgba(17, 24, 39, 0.85); backdrop-filter: blur(4px); }

.song-card__play {
  position: absolute;
  left: 50%;
  top: 50%;
  display: flex;
  height: 56px;
  width: 56px;
  translate: -50% -50%;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(163, 65, 53, 0.92);
  color: #fff;
  opacity: 0;
  box-shadow: 0 16px 34px rgba(192, 74, 68, 0.28);
  transition: opacity 180ms ease;
}

.song-card:hover .song-card__play {
  opacity: 1;
}

.song-card__body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: 1.05rem 1.05rem 1.15rem;
}

.song-card__top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.song-card__top h3 {
  font-weight: 700;
  line-height: 1.2;
  color: #111827;
  transition: color 180ms ease;
}

.song-card:hover .song-card__top h3 {
  color: #a34135;
}

.song-card__top p {
  margin-top: 0.3rem;
  font-size: 12px;
  color: #6b5d4e;
}

.song-card__state {
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid rgba(216, 199, 164, 0.35);
  padding: 0.35rem 0.65rem;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--learn-primary, #a34135);
}

.song-card__summary {
  margin-top: 0.6rem;
  line-height: 1.65;
  font-size: 13px;
  color: rgba(66, 58, 51, 0.78);
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.song-card__bottom {
  margin-top: auto;
  display: grid;
  gap: 0.85rem;
  padding-top: 0.95rem;
  border-top: 1px solid rgba(216, 199, 164, 0.15);
}

.song-card__bottom-head {
  display: grid;
  gap: 0.55rem;
}

.song-card__hint {
  font-size: 12px;
  line-height: 1.65;
  color: rgba(102, 89, 75, 0.72);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.mini-tag {
  border-radius: 6px;
  background: #f6efe1;
  padding: 0.35rem 0.55rem;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #736d61;
}

.mini-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--learn-radius-sm, 8px);
  padding: 0.45rem;
  color: rgba(115, 109, 97, 0.55);
  transition: background-color 180ms ease, color 180ms ease;
}

.mini-icon:hover {
  background: rgba(192, 74, 68, 0.08);
  color: #a34135;
}

.song-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.song-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(166, 91, 56, 0.18);
  background: rgba(255, 255, 255, 0.86);
  padding: 0.65rem 0.9rem;
  font-size: 12px;
  font-weight: 800;
  color: #7e3a31;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.song-action:hover {
  transform: translateY(-1px);
  border-color: rgba(163, 65, 53, 0.28);
  box-shadow: 0 10px 18px rgba(92, 59, 35, 0.08);
}

.song-action--primary {
  border-color: rgba(163, 65, 53, 0.1);
  background: linear-gradient(135deg, #a34135, #8f302f);
  color: #fff;
}

.song-action--ghost {
  background: rgba(163, 65, 53, 0.06);
}

.side-card {
  position: relative;
  overflow: hidden;
  padding: 1.32rem;
}

.side-card--image {
  min-height: 24rem;
  padding: 0;
  color: #fff;
}

.side-card--image .side-card__content {
  min-height: 24rem;
  padding: 1.2rem;
}

.side-card--image .side-card__mask,
.side-card--texture .side-card__mask {
  position: absolute;
  inset: 0;
}

.side-card--image .side-card__mask {
  background: linear-gradient(180deg, rgba(19, 11, 8, 0.16) 0%, rgba(19, 11, 8, 0.48) 46%, rgba(19, 11, 8, 0.86) 100%);
}

.side-card--texture {
  background:
    linear-gradient(155deg, rgba(255, 250, 244, 0.98), rgba(246, 238, 223, 0.98)),
    radial-gradient(circle at top right, rgba(192, 74, 68, 0.08), transparent 34%);
}

.side-card--soft {
  background:
    linear-gradient(180deg, rgba(255, 252, 247, 0.98), rgba(246, 238, 223, 0.94)),
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.08), transparent 34%);
}

.side-kicker {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--learn-primary, #a34135);
  opacity: 0.8;
}

.side-card h3 {
  margin-top: 0.35rem;
  font-size: 1.12rem;
  font-weight: 700;
}

.side-card--image h3 {
  font-size: 1.34rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.stat-box {
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.1);
  padding: 0.8rem;
  backdrop-filter: blur(10px);
}

.stat-box span {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.65);
}

.stat-box strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
}

.dimension-list {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.dimension-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.dimension-item__head span {
  font-size: 0.92rem;
  font-weight: 700;
  color: #374151;
}

.dimension-item__head strong {
  font-weight: 700;
  color: #a34135;
}

.dimension-bar {
  overflow: hidden;
  border-radius: var(--learn-radius-sm, 8px);
  background: #f2e7d1;
  height: 8px;
}

.dimension-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #a34135, #d4af37);
}

.dimension-bar--large { height: 10px; }

.tip-box {
  border-radius: var(--learn-radius-sm, 8px);
  border: 1px solid rgba(216, 199, 164, 0.2);
  background: #faf6ee;
  padding: 1rem;
  line-height: 1.75;
  color: #736d61;
}

.upload-btn {
  width: 100%;
  margin-top: 1rem;
}

.toast-error {
  position: fixed;
  left: 50%;
  bottom: 5rem;
  z-index: 50;
  transform: translateX(-50%);
  border-radius: var(--learn-radius-sm, 8px);
  background: #dc2626;
  padding: 0.6rem 1rem;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 8px 24px rgba(220, 38, 38, 0.26);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.22s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .hero-panel__content,
  .resume-panel__content {
    min-height: 300px;
  }

  .shell-prompt__dialog {
    border-radius: 24px;
  }

  .shell-prompt__copy,
  .shell-prompt__body {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .side-card--image {
    min-height: 28rem;
  }

  .song-card--list {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .song-card,
  .primary-btn,
  .ghost-btn,
  .accent-btn,
  .upload-btn,
  .sheet-btn {
    transition: none !important;
  }
}
</style>
