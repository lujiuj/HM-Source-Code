<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import { getLearnSongById, getLearnSongs } from '../utils/learnCatalog.js'
import { hasUsablePublishAiAnalysis, requestPublishAiAnalysis } from '../utils/publishAi.js'
import { toSerializablePracticeSession } from '../utils/toSerializablePracticeSession.js'
import {
  isDemoRouteId,
  resolveDemoPracticeSessions
} from '../utils/learnDemoResolvers.js'

const router = useRouter()
const infra = getInfra()
const uid = infra.identity.getUid()

const loading = ref(true)
const historyRecords = ref([])
const selectedSongFilter = ref('')
const searchQuery = ref('')
const preparingPublish = ref({
  loading: false,
  songName: '',
  phase: '',
  progress: 0
})
const isDemoHistory = ref(false)

let preparingProgressTimer = null
let preparingProgressTarget = 0

const uniqueSongs = computed(() => getLearnSongs())

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return historyRecords.value.filter((record) => {
    const matchesSong = !selectedSongFilter.value || record.songId === selectedSongFilter.value
    const matchesQuery = !query || `${record.songName || ''}`.toLowerCase().includes(query)
    return matchesSong && matchesQuery
  })
})

const totalRecords = computed(() => historyRecords.value.length)
const averageScore = computed(() => {
  if (!historyRecords.value.length) return 0
  const total = historyRecords.value.reduce((sum, record) => sum + Number(record.overall || 0), 0)
  return total / historyRecords.value.length
})
const bestScore = computed(() => Math.max(0, ...historyRecords.value.map((record) => Number(record.overall || 0))))
const recentTrend = computed(() => {
  if (historyRecords.value.length < 3) return '数据不足'
  const recent = historyRecords.value.slice(0, 5)
  const averageRecent = recent.reduce((sum, record) => sum + Number(record.overall || 0), 0) / recent.length
  if (averageRecent > averageScore.value + 5) return '持续上升'
  if (averageRecent < averageScore.value - 5) return '略有回落'
  return '保持稳定'
})

const bestRecordId = computed(() => {
  if (!historyRecords.value.length) return null
  return [...historyRecords.value].sort((a, b) => Number(b.overall || 0) - Number(a.overall || 0))[0]?.id || null
})

const chartPoints = computed(() => {
  const list = [...filteredRecords.value].reverse()
  if (!list.length) return []
  return list.map((record, index) => {
    const x = list.length === 1 ? 50 : (index / (list.length - 1)) * 100
    const score = Math.max(0, Math.min(100, Number(record.overall || 0)))
    const y = 28 - (score / 100) * 20
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) }
  })
})

const chartPolyline = computed(() => chartPoints.value.map((point) => `${point.x},${point.y}`).join(' '))

function toChineseScore(num) {
  const value = Number(num)
  if (!Number.isFinite(value)) return '零分'
  return `${Math.round(value)}分`
}

function stopPreparingProgress() {
  if (preparingProgressTimer) {
    clearInterval(preparingProgressTimer)
    preparingProgressTimer = null
  }
}

function ensurePreparingProgressTimer() {
  if (preparingProgressTimer) return
  preparingProgressTimer = setInterval(() => {
    if (!preparingPublish.value.loading) return
    const current = Number(preparingPublish.value.progress || 0)
    if (current >= preparingProgressTarget) return
    const step = Math.max(1, Math.ceil((preparingProgressTarget - current) * 0.16))
    preparingPublish.value = {
      ...preparingPublish.value,
      progress: Math.min(preparingProgressTarget, current + step)
    }
  }, 140)
}

function setPreparingPhase(songName, phase, target) {
  preparingProgressTarget = Math.max(preparingProgressTarget, Math.min(99, Number(target || 0)))
  preparingPublish.value = {
    loading: true,
    songName,
    phase,
    progress: Math.max(
      Number(preparingPublish.value.progress || 0),
      preparingProgressTarget > 0 ? Math.min(preparingProgressTarget - 12, preparingProgressTarget) : 8
    )
  }
  ensurePreparingProgressTimer()
}

async function finishPreparingProgress() {
  preparingProgressTarget = 100
  preparingPublish.value = {
    ...preparingPublish.value,
    progress: 100
  }
  await new Promise((resolve) => setTimeout(resolve, 180))
}

function formatDay(ts) {
  try {
    return new Date(ts).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  } catch {
    return '--'
  }
}

function formatClock(ts) {
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return '--:--'
  }
}

async function loadHistoryRecords() {
  try {
    loading.value = true
    const sessions = await infra.practice.listPracticeSessions(uid)
    if (Array.isArray(sessions) && sessions.length) {
      isDemoHistory.value = false
      historyRecords.value = sessions.map((session) => {
        const song = getLearnSongById(session.songId)
        return {
          id: session.id,
          songId: session.songId,
          songName: session.songName || song?.title || '示例曲目',
          overall: Number(session.score ?? session.overall ?? 0),
          grade: session.grade || 'C',
          stars: Number(session.stars || 0),
          breakdown: session.breakdown || {
            voiceActivity: Number(session.voiceActivity || 0),
            pitchAccuracy: Number(session.pitchAccuracy || 0)
          },
          timestamp: Number(session.timestamp || Date.now()),
          duration: Number(session.duration || 0),
          mediaUrl: session.mediaUrl || song?.videoSrc || '',
          coverUrl: session.coverUrl || song?.cover || '',
          timelineCover: session.timelineCover || song?.timelineCover || song?.bannerImage || song?.heroImage || song?.cover || '',
          heroImage: session.heroImage || song?.heroImage || song?.bannerImage || song?.cover || '',
          portrait: session.portrait || song?.portrait || '',
          summaryCopy: song?.summary || song?.description || '继续把这一段磨细，留住当前状态。',
          rawSession: session,
          isDemo: Boolean(session.isDemo)
        }
      })
      return
    }

    isDemoHistory.value = true
    historyRecords.value = resolveDemoPracticeSessions().map((session) => {
      const song = getLearnSongById(session.songId)
      return {
        id: session.id,
        songId: session.songId,
        songName: session.songName || song?.title || '示例曲目',
        overall: Number(session.score ?? session.overall ?? 0),
        grade: session.grade || 'C',
        stars: Number(session.stars || 0),
        breakdown: session.breakdown || {
          voiceActivity: Number(session.voiceActivity || 0),
          pitchAccuracy: Number(session.pitchAccuracy || 0)
        },
        timestamp: Number(session.timestamp || Date.now()),
        duration: Number(session.duration || 0),
        mediaUrl: session.mediaUrl || song?.videoSrc || '',
        coverUrl: session.coverUrl || song?.cover || '',
        timelineCover: session.timelineCover || song?.timelineCover || song?.bannerImage || song?.heroImage || song?.cover || '',
        heroImage: session.heroImage || song?.heroImage || song?.bannerImage || song?.cover || '',
        portrait: session.portrait || song?.portrait || '',
        summaryCopy: song?.summary || song?.description || '这条示例复盘只做页面展示，不写入真实数据。',
        rawSession: session,
        isDemo: true
      }
    })
  } finally {
    loading.value = false
  }
}

async function deleteRecord(record) {
  if (record?.isDemo || isDemoHistory.value) return
  if (!window.confirm(`确认删除《${record.songName}》这条练习记录吗？`)) return
  await infra.practice.deletePracticeSession(uid, record.id)
  await loadHistoryRecords()
}

async function clearHistory() {
  if (isDemoHistory.value || !historyRecords.value.length) return
  if (!window.confirm('确认清空当前账号下的全部练习记录吗？')) return
  await Promise.all(historyRecords.value.map((record) => infra.practice.deletePracticeSession(uid, record.id)))
  await loadHistoryRecords()
}

async function openPublish(record) {
  if (!record?.id) return
  const session = record.rawSession || null

  if (record.isDemo || isDemoHistory.value || isDemoRouteId(record.id)) {
    router.push(`/learn/practice/history/${record.id}`)
    return
  }

  if (
    session?.songId
    && session?.songName
    && session?.analysisV2
    && Array.isArray(session?.lineScores)
    && session.lineScores.length
    && !hasUsablePublishAiAnalysis(session.publishAiAnalysis)
  ) {
    try {
      setPreparingPhase(record.songName, '正在整理发布建议', 72)
      const publishAiAnalysis = await requestPublishAiAnalysis({
        songId: session.songId,
        songName: session.songName,
        analysisV2: session.analysisV2
      })
      const nextSession = {
        ...session,
        publishAiAnalysis
      }
      await infra.practice.savePracticeSession(uid, toSerializablePracticeSession(nextSession))
      record.rawSession = nextSession
    } catch (error) {
      console.warn('[PracticeHistory] prepare publish ai failed:', error)
    } finally {
      preparingPublish.value = {
        loading: false,
        songName: '',
        phase: '',
        progress: 0
      }
      stopPreparingProgress()
    }
  }

  router.push(`/learn/practice/history/${record.id}`)
}

function goToLearn() {
  router.push('/learn/practice')
}

onMounted(() => {
  void loadHistoryRecords()
})

onBeforeUnmount(() => {
  stopPreparingProgress()
})
</script>

<template>
  <div class="history-page bg-pattern min-h-full font-display text-slate-900 p-6 lg:p-8">
    <div v-if="preparingPublish.loading" class="fixed inset-0 z-50 flex items-center justify-center bg-[#1d1208]/45 px-4 backdrop-blur-[2px]">
      <div class="w-full max-w-[420px] rounded-xl border border-white/15 bg-[linear-gradient(145deg,rgba(41,26,16,0.96),rgba(24,14,8,0.96))] px-6 py-7 text-white shadow-2xl">
        <div class="mx-auto flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <span class="inline-flex size-9 animate-spin rounded-full border-[3px] border-white/25 border-t-[#a34135]"></span>
        </div>
        <p class="mt-5 text-center text-[11px] tracking-[0.28em] text-white/55">正在整理发布建议</p>
        <h2 class="shufa mt-3 text-center text-[28px] font-bold tracking-tight">{{ preparingPublish.songName || '正在准备发布页面' }}</h2>
        <p class="mt-3 text-center text-sm leading-7 text-white/78">{{ preparingPublish.phase || '正在整理分析结果' }}</p>
        <div class="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div class="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#a34135] via-[#ffd182] to-[#fff0cb]"></div>
        </div>
      </div>
    </div>

    <header class="history-hero mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <h2 class="seal-title text-2xl font-bold text-[#a34135]">练习历史</h2>
        <span v-if="isDemoHistory" class="rounded-full border border-[#a34135]/20 bg-[#a34135]/8 px-3 py-1 text-[11px] font-bold tracking-widest text-[#a34135]">示例</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="historyRecords.length && !isDemoHistory"
          class="rounded-full border border-[rgba(180,140,94,0.24)] bg-[linear-gradient(180deg,rgba(255,250,243,0.94),rgba(246,233,214,0.84))] px-5 py-2 text-xs font-bold tracking-widest text-[#736D61] shadow-[0_10px_24px_rgba(92,59,35,0.05)] transition-colors hover:border-[#a34135]/40"
          @click="clearHistory"
        >清空历史</button>
        <button
          class="rounded-full bg-[#a34135] px-5 py-2 text-xs font-bold tracking-widest text-white transition-all hover:bg-[#D4AF37]"
          @click="goToLearn"
        >去练唱</button>
      </div>
    </header>

    <div v-if="historyRecords.length" class="mb-10 rounded-xl bg-[linear-gradient(180deg,rgba(255,249,240,0.88),rgba(242,230,212,0.8))] p-5 card-texture">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p class="text-xs text-[#736D61]/60 mb-1">练习次数</p>
          <span class="text-2xl font-bold text-slate-800">{{ totalRecords }}</span>
        </div>
        <div>
          <p class="text-xs text-[#736D61]/60 mb-1">平均分数</p>
          <span class="text-2xl font-bold text-slate-800">{{ averageScore.toFixed(1) }}</span>
        </div>
        <div>
          <p class="text-xs text-[#736D61]/60 mb-1">最佳成绩</p>
          <span class="text-2xl font-bold text-slate-800">{{ bestScore }}</span>
        </div>
        <div class="relative overflow-hidden">
          <p class="text-xs text-[#736D61]/60 mb-1">近期趋势</p>
          <span class="text-base font-bold" :class="recentTrend === '持续上升' ? 'text-emerald-600' : recentTrend === '略有回落' ? 'text-red-500' : 'text-[#736D61]'">{{ recentTrend }}</span>
        </div>
      </div>
    </div>

    <div class="mb-10 flex flex-col gap-4 md:flex-row">
      <div class="relative flex-1 group">
        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#736D61]/40 group-focus-within:text-[#a34135] transition-colors">search</span>
        <input
          v-model.trim="searchQuery"
          class="w-full rounded-xl border border-[rgba(180,140,94,0.24)] bg-[linear-gradient(180deg,rgba(255,250,243,0.92),rgba(246,233,214,0.82))] py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-[#a34135] focus:ring-1 focus:ring-[#a34135]/30"
          placeholder="搜索曲目或日期"
          type="text"
        />
      </div>
      <div class="relative w-full md:w-64">
        <select
          v-model="selectedSongFilter"
          class="w-full appearance-none rounded-xl border border-[rgba(180,140,94,0.24)] bg-[linear-gradient(180deg,rgba(255,250,243,0.92),rgba(246,233,214,0.82))] py-3 px-4 pr-10 text-sm text-[#736D61] outline-none focus:border-[#a34135] focus:ring-1 focus:ring-[#a34135]/30"
        >
          <option value="">全部曲目</option>
          <option v-for="song in uniqueSongs" :key="song.id" :value="song.id">{{ song.title }}</option>
        </select>
        <span class="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#a34135]">expand_more</span>
      </div>
    </div>

    <div v-if="loading" class="space-y-6">
      <div v-for="n in 3" :key="n" class="flex animate-pulse rounded-xl border border-[#D4AF37]/10 bg-[linear-gradient(180deg,rgba(255,249,240,0.86),rgba(242,231,214,0.78))] p-5">
        <div class="mr-4 h-16 w-16 rounded-xl bg-[#a34135]/5"></div>
        <div class="flex-1 space-y-3 py-2">
          <div class="h-4 w-1/3 rounded-full bg-[#a34135]/10"></div>
          <div class="h-3 w-1/2 rounded-full bg-[#a34135]/10"></div>
        </div>
      </div>
    </div>

    <div v-else-if="filteredRecords.length" class="relative space-y-8">
      <div class="timeline-line absolute left-24 top-4 bottom-4 z-0 hidden md:block"></div>
      <div v-for="record in filteredRecords" :key="record.id" class="group relative z-10 flex items-start gap-8">
        <div class="hidden shrink-0 pt-2 text-right md:block w-20">
          <p class="shufa text-base font-bold" :class="record.overall >= 80 ? 'text-[#a34135]' : 'text-[#736D61]'">{{ formatDay(record.timestamp) }}</p>
          <p class="text-[11px] text-[#736D61] font-serif opacity-60">{{ formatClock(record.timestamp) }}</p>
        </div>
        <div class="hidden h-5 w-5 shrink-0 rounded-full md:block mt-3" :class="record.id === bestRecordId ? 'bg-[#a34135] ring-4 ring-[#a34135]/10' : record.overall >= 80 ? 'bg-[#a34135]' : 'bg-[#736D61]/20'"></div>
        <div
          class="card-texture flex flex-1 flex-col gap-4 rounded-xl border border-[#D4AF37]/10 bg-[linear-gradient(180deg,rgba(255,249,240,0.88),rgba(242,231,214,0.8))] p-5 transition-all hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between"
          :class="record.id === bestRecordId ? 'ring-2 ring-[#a34135]/20' : ''"
        >
          <div class="flex min-w-0 flex-1 items-center gap-5">
            <div class="relative h-24 w-28 overflow-hidden rounded-xl border border-[#D4AF37]/10 bg-slate-100 shrink-0 shadow-sm">
              <img
                v-if="record.timelineCover || record.heroImage || record.coverUrl"
                :src="record.timelineCover || record.heroImage || record.coverUrl"
                :alt="record.songName"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center">
                <span class="material-symbols-outlined text-3xl text-[#736D61]/20">music_note</span>
              </div>
              <div class="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(180deg,transparent,rgba(20,11,8,0.75))]"></div>
              <span class="absolute left-3 top-3 rounded-full border border-[rgba(255,248,238,0.82)] bg-[linear-gradient(180deg,rgba(255,251,246,0.94),rgba(247,235,217,0.88))] px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] text-[#a34135]">{{ record.grade }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="mb-1 text-[11px] text-[#736D61]/50 md:hidden">{{ formatDay(record.timestamp) }} {{ formatClock(record.timestamp) }}</p>
              <h4 class="truncate text-xl font-bold text-slate-800 shufa">{{ record.songName }}</h4>
              <p class="mt-1 line-clamp-2 text-sm leading-6 text-[#736D61]">{{ record.summaryCopy }}</p>
              <div class="mt-2 flex items-center gap-4">
                <div class="flex items-center gap-1">
                  <span class="text-[#a34135] shufa text-2xl">{{ toChineseScore(record.overall).replace('分', '') }}</span>
                  <span class="text-[9px] text-[#736D61] font-serif opacity-50 tracking-tighter">分数</span>
                </div>
                <div class="h-4 w-px bg-[#D4AF37]/20"></div>
                <div class="flex scale-75 origin-left text-[#D4AF37]">
                  <span
                    v-for="i in 5"
                    :key="i"
                    class="material-symbols-outlined"
                    :class="i <= Math.min(5, Number(record.stars || 0)) ? 'fill-star' : 'text-[#736D61]/20'"
                  >star</span>
                </div>
                <span class="rounded border border-[#a34135]/20 bg-[#a34135]/10 px-2 py-0.5 text-[11px] font-bold tracking-widest text-[#a34135]">{{ record.grade }}</span>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-4">
            <span v-if="record.id === bestRecordId" class="hidden border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[8px] font-bold tracking-widest text-emerald-600 sm:inline">最佳</span>
            <button
              class="rounded-full px-5 py-2 text-xs font-bold tracking-widest transition-all"
              :class="record.id === bestRecordId ? 'bg-[#a34135] text-white hover:bg-[#D4AF37]' : 'border border-[rgba(180,140,94,0.24)] bg-[linear-gradient(180deg,rgba(255,250,243,0.94),rgba(246,233,214,0.84))] text-[#a34135] hover:border-[#a34135]'"
              @click="openPublish(record)"
            >查看复盘</button>
            <button
              v-if="!isDemoHistory && !record.isDemo"
              class="p-2 text-[#736D61]/30 transition-colors hover:text-[#a34135]"
              @click="deleteRecord(record)"
            >
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div class="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#a34135]/8">
        <span class="material-symbols-outlined text-5xl text-[#a34135]/40">folder_open</span>
      </div>
      <h3 class="text-lg font-bold text-slate-700">还没有练习记录</h3>
      <p class="mt-1 text-sm text-[#736D61]/50 font-serif">先去练一段，再把作品带回来。</p>
      <button class="mt-6 rounded-full bg-[#a34135] px-6 py-2.5 text-sm font-bold tracking-widest text-white transition-all hover:bg-[#D4AF37]" @click="goToLearn">去练唱</button>
    </div>
  </div>
</template>

<style scoped lang="less">
.history-page {
  background: transparent;
}

.bg-pattern {
  background: transparent;
}

.history-hero {
  position: relative;
  overflow: hidden;
  padding: 1.4rem 1.5rem;
  border-radius: 30px;
  border: 1px solid rgba(255, 248, 235, 0.5);
  background:
    radial-gradient(circle at top right, rgba(163, 65, 53, 0.14), transparent 28%),
    linear-gradient(90deg, rgba(255, 251, 244, 0.96) 0%, rgba(255, 248, 240, 0.88) 42%, rgba(255, 248, 240, 0.62) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(120, 72, 42, 0.08));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 24px 56px rgba(92, 59, 35, 0.1);
}

.history-hero p,
.history-hero h2 {
  color: #201815;
}

.card-texture {
  border: 1px solid rgba(212, 175, 55, 0.2);
  box-shadow: 0 14px 34px rgba(92, 59, 35, 0.08);
}

.seal-title::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 1.5rem;
  background-color: #a34135;
  margin-right: 0.75rem;
  vertical-align: middle;
}

.timeline-line {
  background: linear-gradient(to bottom, transparent, #d4af37 15%, #d4af37 85%, transparent);
  width: 1px;
}
</style>
