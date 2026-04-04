<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getInfra } from '../../shared/infra/index.js'
import SixDimensionRadar from '../components/analysis/SixDimensionRadar.vue'
import { loadLrcLines } from '../composables/useLrcParser.js'
import { normalizeAnalysisV2, getAnalysisDimensions } from '../utils/analysisV2.js'
import {
  buildSongGuideTimeline,
  getLearnSongById,
  getLearnSongs,
  getMasterAnalysisContent,
  getMasterReferenceDimensions,
  getSongMaster
} from '../utils/learnCatalog.js'
import { isDemoRouteId, resolveDemoPracticeSessions } from '../utils/learnDemoResolvers.js'
import { recordAnalysisVisit } from '../utils/studyProgress.js'

const route = useRoute()
const router = useRouter()
const infra = getInfra()
const uid = infra.identity.getUid()

const song = ref(null)
const analysisLines = ref([])
const usingGuideLines = ref(false)
const activeLineIndex = ref(0)
const currentTime = ref(0)
const mediaDuration = ref(0)
const isPlaying = ref(false)
const audioRef = ref(null)
const latestPractice = ref(null)
const segmentEndSec = ref(null)

const audioSrc = computed(() => song.value?.masterAudioPath || song.value?.musicPath || song.value?.audioSrc || '')
const master = computed(() => getSongMaster(song.value))
const heroImage = computed(() => master.value?.heroImage || master.value?.bannerImage || song.value?.heroImage || song.value?.bannerImage || song.value?.cover)
const heroObjectPosition = computed(() => song.value?.heroObjectPosition || song.value?.bannerObjectPosition || 'center center')
const activeLine = computed(() => analysisLines.value[activeLineIndex.value] || null)
const masterContent = computed(() => getMasterAnalysisContent(song.value))

const referenceDimensions = computed(() => {
  const referenceMap = getMasterReferenceDimensions(song.value)
  const fallbackLabels = {
    pitch: '音准',
    rhythm: '节奏',
    articulation: '咬字',
    style: '韵味',
    breath: '气息',
    emotion: '情绪'
  }
  return Object.entries(fallbackLabels).map(([key, label]) => ({
    key,
    label,
    value: Number(referenceMap?.[key] || 0)
  }))
})

const userDimensions = computed(() => {
  if (!latestPractice.value?.analysisV2) return []
  return getAnalysisDimensions(normalizeAnalysisV2(latestPractice.value.analysisV2))
})

const comparisonSubtitle = computed(() => (
  latestPractice.value
    ? '名师范式叠加你最近一次同曲练习'
    : '先看名师标准轮廓，再回到练唱页对照'
))

const lineCoachingEntries = computed(() => {
  const custom = masterContent.value?.lineCoaching || []
  return analysisLines.value.map((line, index) => {
    const matched = custom[index] || custom.find((item) => String(item?.text || '').trim() === String(line?.text || '').trim()) || null
    return {
      index,
      line,
      text: line?.text || matched?.text || `第 ${index + 1} 句`,
      wordHead: matched?.wordHead || '先把重字抛清，别急着往下赶。',
      breath: matched?.breath || '换气尽量藏在语意里，保持一句一线。',
      emotion: matched?.emotion || '先把人物口气唱出来，再放情绪。',
      masterPoint: matched?.masterPoint || '这一句先求稳，再求韵味。'
    }
  })
})

async function loadSong() {
  const fallbackSong = getLearnSongs().find((item) => item.isScorable) || getLearnSongs()[0]
  const targetId = String(route.params.songId || fallbackSong?.id || '')
  song.value = getLearnSongById(targetId) || fallbackSong || null

  const lines = await loadLrcLines(song.value?.lrcPath, { defaultDurationSec: 3.2 })
  usingGuideLines.value = !lines.length
  analysisLines.value = lines.length
    ? lines
    : buildSongGuideTimeline(song.value, { totalDurationSec: song.value?.durationSeconds || 0 })
  activeLineIndex.value = 0
}

async function loadLatestPractice() {
  if (!song.value?.id) return
  try {
    const sessions = await infra.practice.listPracticeSessions(uid)
    const matched = [...sessions]
      .filter((item) => String(item?.songId || '') === song.value.id)
      .sort((a, b) => Number(b?.updatedAt || b?.timestamp || 0) - Number(a?.updatedAt || a?.timestamp || 0))[0]
    latestPractice.value = matched || null
  } catch {
    latestPractice.value = null
  }

  if (!latestPractice.value) {
    latestPractice.value = resolveDemoPracticeSessions()
      .filter((item) => String(item?.songId || '') === song.value.id && isDemoRouteId(item?.id))
      .sort((a, b) => Number(b?.updatedAt || b?.timestamp || 0) - Number(a?.updatedAt || a?.timestamp || 0))[0] || null
  }
}

function syncActiveLine(time) {
  const index = analysisLines.value.findIndex((line) => time >= Number(line?.startSec || 0) && time < Number(line?.endSec || 0))
  if (index >= 0) activeLineIndex.value = index
}

function stopSegmentPlayback() {
  if (!audioRef.value) return
  if (segmentEndSec.value != null) {
    audioRef.value.pause()
    audioRef.value.currentTime = Math.min(segmentEndSec.value, Number(audioRef.value.duration || segmentEndSec.value))
    currentTime.value = audioRef.value.currentTime
    isPlaying.value = false
    segmentEndSec.value = null
  }
}

async function playCurrentLine(index) {
  const line = analysisLines.value[index]
  if (!audioRef.value || !line || !audioSrc.value) return
  activeLineIndex.value = index
  segmentEndSec.value = Number(line.endSec || line.startSec || 0)
  audioRef.value.currentTime = Number(line.startSec || 0)
  currentTime.value = Number(line.startSec || 0)
  try {
    await audioRef.value.play()
    isPlaying.value = true
  } catch {
    isPlaying.value = false
  }
}

function focusLine(index) {
  activeLineIndex.value = index
  if (!analysisLines.value[index]) return
  if (!audioSrc.value) return
  void playCurrentLine(index)
}

async function togglePlay() {
  if (!audioRef.value || !audioSrc.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
    segmentEndSec.value = null
    return
  }
  segmentEndSec.value = null
  try {
    await audioRef.value.play()
    isPlaying.value = true
  } catch {
    isPlaying.value = false
  }
}

function handleTimeUpdate(event) {
  const time = Number(event.target?.currentTime || 0)
  currentTime.value = time
  syncActiveLine(time)
  if (segmentEndSec.value != null && time >= segmentEndSec.value - 0.05) {
    stopSegmentPlayback()
  }
}

function handleLoadedMetadata(event) {
  mediaDuration.value = Number(event.target?.duration || 0)
}

function formatTime(value) {
  const total = Math.max(0, Math.floor(Number(value || 0)))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function goPractice() {
  router.push({ path: '/learn/practice/karaoke', query: song.value?.id ? { songId: song.value.id } : {} })
}

function goPublish() {
  const targetSongId = song.value?.id || ''
  const demoSession = resolveDemoPracticeSessions().find((item) => item.songId === targetSongId)
  if (demoSession?.id) {
    router.push(`/learn/practice/history/${demoSession.id}`)
    return
  }
  goPractice()
}

onMounted(async () => {
  await loadSong()
  await loadLatestPractice()
  if (song.value?.id) {
    try {
      await recordAnalysisVisit(infra.identity, song.value.id)
    } catch {
      // Keep the analysis page usable even if progress sync fails.
    }
  }
})
</script>

<template>
  <div class="master-analysis min-h-full overflow-hidden text-slate-900" :style="{ '--analysis-backdrop': `url(${heroImage})` }">
    <header class="top-bar">
      <div class="top-bar__left">
        <button class="back-btn" @click="$router.back()">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <p class="eyebrow">名师解构</p>
          <h1 class="shufa">{{ song?.title || '唱段解构' }}</h1>
        </div>
      </div>
      <div class="top-bar__right">
        <span>{{ master?.name || song?.singer || '黄梅戏名师' }}</span>
        <span>·</span>
        <span>{{ song?.excerptName || '唱段拆解' }}</span>
      </div>
    </header>

    <section class="hero">
      <article class="hero__lead">
        <div class="hero__image">
          <img :src="heroImage" :alt="song?.title" :style="{ objectPosition: heroObjectPosition }" />
          <div class="hero__mask"></div>
        </div>
        <div class="hero__copy">
          <div class="hero__master">
            <div>
              <p class="eyebrow eyebrow--light">主讲名师</p>
              <h2>{{ master?.name || song?.singer }}</h2>
              <p class="hero__master-title">{{ master?.shortTitle || '黄梅戏名师' }}</p>
            </div>
          </div>
          <p class="hero__summary">{{ masterContent?.masterSummary || song?.summary }}</p>
          <div class="hero__actions">
            <button class="primary-btn" :disabled="!audioSrc" @click="togglePlay">
              <span class="material-symbols-outlined">{{ isPlaying ? 'pause' : 'play_arrow' }}</span>
              {{ isPlaying ? '暂停示范' : '播放示范' }}
            </button>
            <button class="ghost-btn" @click="goPractice">
              <span class="material-symbols-outlined">mic</span>
              去练唱
            </button>
          </div>
          <p v-if="audioSrc" class="hero__time">{{ formatTime(currentTime) }} / {{ formatTime(mediaDuration || song?.durationSeconds || 0) }}</p>
        </div>
      </article>

      <article class="hero__compare">
        <SixDimensionRadar
          :dimensions="referenceDimensions"
          :comparison-dimensions="userDimensions"
          :score="referenceDimensions.reduce((sum, item) => sum + Number(item.value || 0), 0) / Math.max(referenceDimensions.length, 1)"
          title="名师六维轮廓"
          :subtitle="comparisonSubtitle"
          primary-legend="名师范式"
          comparison-legend="你的最近一次"
          :size="320"
        />
      </article>
    </section>

    <div class="content-grid">
      <aside class="lyrics-panel">
        <div class="panel-head">
          <div>
            <h3>{{ usingGuideLines ? '逐句点听与指导' : '逐句点听与指导' }}</h3>
            <p>{{ usingGuideLines ? '当前曲目暂无逐字歌词，以下按训练提示句拆解，每句都直接给到听点和练法。' : '点任意一句会直接播放这一句，同时展开字头、气口、情绪和名师提醒。' }}</p>
          </div>
        </div>

        <audio
          v-if="audioSrc"
          ref="audioRef"
          :src="audioSrc"
          preload="metadata"
          @loadedmetadata="handleLoadedMetadata"
          @timeupdate="handleTimeUpdate"
          @pause="isPlaying = false"
          @play="isPlaying = true"
          @ended="isPlaying = false"
        ></audio>

        <div class="lyrics-list">
          <button
            v-for="item in lineCoachingEntries"
            :key="`${item.index}-${item.text}`"
            class="lyric-row"
            :class="item.index === activeLineIndex ? 'is-active' : ''"
            @click="focusLine(item.index)"
          >
            <div class="lyric-row__meta">
              <span>{{ formatTime(item.line?.startSec || 0) }}</span>
              <strong>第 {{ item.index + 1 }} 句</strong>
            </div>
            <p>{{ item.text }}</p>
            <div class="lyric-row__guide">
              <div>
                <span>字头</span>
                <strong>{{ item.wordHead }}</strong>
              </div>
              <div>
                <span>气口</span>
                <strong>{{ item.breath }}</strong>
              </div>
              <div>
                <span>情绪</span>
                <strong>{{ item.emotion }}</strong>
              </div>
              <div>
                <span>名师提醒</span>
                <strong>{{ item.masterPoint }}</strong>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <section class="analysis-panel">
        <div class="analysis-grid">
          <article v-for="card in masterContent?.cards || []" :key="card.title" class="analysis-card">
            <div class="analysis-card__head">
              <span class="material-symbols-outlined">{{ card.icon }}</span>
              <h4>{{ card.title }}</h4>
            </div>
            <p>{{ card.description }}</p>
          </article>
        </div>

        <article class="teaching-card">
          <div class="panel-head">
            <div>
              <h3>名师要点</h3>
              <p>不是套话，而是按这首唱段的字头、句法和人物关系拆开的练法。</p>
            </div>
          </div>
          <div class="teaching-list">
            <div v-for="point in masterContent?.teachingPoints || []" :key="point.title" class="teaching-item">
              <div>
                <h4>{{ point.title }}</h4>
                <p>{{ point.description }}</p>
              </div>
              <div class="tag-row">
                <span v-for="tag in point.tags || []" :key="tag" class="mini-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </article>

        <article class="step-card">
          <div class="panel-head">
            <div>
              <h3>分步练法</h3>
              <p>先拆句，再连句，最后回到完整演唱。</p>
            </div>
          </div>
          <div class="step-grid">
            <div v-for="(item, index) in masterContent?.practiceSteps || []" :key="item" class="step-item">
              <div class="step-item__index">{{ index + 1 }}</div>
              <span>{{ item }}</span>
            </div>
          </div>
        </article>

      </section>
    </div>

    <footer class="bottom-bar">
      <button class="bottom-btn bottom-btn--primary" @click="goPractice">
        <span class="material-symbols-outlined">mic</span>
        去练唱
      </button>
      <button class="bottom-btn" @click="goPublish">
        <span class="material-symbols-outlined">upload_file</span>
        看发布页
      </button>
    </footer>
  </div>
</template>

<style scoped lang="less">
.master-analysis {
  background:
    linear-gradient(180deg, rgba(253, 249, 242, 0.92), rgba(245, 235, 221, 0.72)),
    var(--analysis-backdrop) center/cover no-repeat fixed;
}

.top-bar,
.hero,
.content-grid,
.bottom-bar {
  max-width: 1560px;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

.top-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.top-bar__left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(216, 199, 164, 0.35);
  color: #a34135;
}

.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: rgba(163, 65, 53, 0.72);
}

.eyebrow--light {
  color: rgba(255, 239, 215, 0.82);
}

.top-bar h1 {
  margin-top: 0.3rem;
  font-size: clamp(1.8rem, 2.8vw, 2.5rem);
  font-weight: 700;
}

.top-bar__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 12px;
  color: #736d61;
}

.hero {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.24fr) 360px;
  margin-bottom: 1rem;
}

.hero__lead,
.hero__compare,
.lyrics-panel,
.analysis-card,
.teaching-card,
.step-card,
.bottom-bar {
  border-radius: 28px;
  border: 1px solid rgba(255, 248, 235, 0.58);
  background: rgba(255, 252, 246, 0.88);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 52px rgba(92, 59, 35, 0.08);
}

.hero__lead {
  position: relative;
  overflow: hidden;
  min-height: 360px;
}

.hero__image {
  position: absolute;
  inset: 0;
}

.hero__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(20, 12, 8, 0.76) 0%, rgba(20, 12, 8, 0.34) 46%, rgba(20, 12, 8, 0.08) 100%);
}

.hero__copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 360px;
  max-width: 520px;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.5rem;
  color: #fff8f1;
}

.hero__master {
  display: block;
}

.hero__master h2 {
  margin-top: 0.25rem;
  font-size: clamp(1.8rem, 2.4vw, 2.3rem);
  font-weight: 700;
}

.hero__master-title {
  margin-top: 0.25rem;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: rgba(255, 239, 215, 0.74);
}

.hero__summary {
  margin-top: 1rem;
  max-width: 34rem;
  font-size: 15px;
  line-height: 1.9;
  color: rgba(255, 248, 240, 0.9);
}

.hero__actions,
.bottom-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.primary-btn,
.ghost-btn,
.bottom-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.92rem 1.25rem;
  font-size: 13px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.primary-btn,
.bottom-btn--primary {
  background: linear-gradient(135deg, #a34135, #c57e43);
  color: #fff;
  box-shadow: 0 18px 28px rgba(163, 65, 53, 0.24);
}

.ghost-btn,
.bottom-btn {
  background: rgba(255, 255, 255, 0.88);
  color: #5f5146;
}

.primary-btn:hover,
.ghost-btn:hover,
.bottom-btn:hover {
  transform: translateY(-1px);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.hero__time {
  margin-top: 1rem;
  font-size: 12px;
  color: rgba(255, 239, 215, 0.78);
}

.hero__compare {
  padding: 1.3rem 1rem 1rem;
}

.content-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 360px minmax(0, 1fr);
  margin-bottom: 1rem;
}

.lyrics-panel,
.teaching-card,
.step-card {
  padding: 1.2rem;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-head h3 {
  font-size: 1.18rem;
  font-weight: 700;
  color: #2b2622;
}

.panel-head p {
  margin-top: 0.35rem;
  font-size: 12px;
  line-height: 1.75;
  color: #766b60;
}

.lyrics-list {
  display: grid;
  gap: 0.75rem;
  max-height: 980px;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.lyric-row {
  border-radius: 22px;
  border: 1px solid rgba(186, 158, 122, 0.16);
  background: rgba(255, 255, 255, 0.72);
  padding: 1rem;
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.lyric-row:hover,
.lyric-row.is-active {
  border-color: rgba(163, 65, 53, 0.26);
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(163, 65, 53, 0.08);
}

.lyric-row__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  font-size: 11px;
  color: #8b7d6e;
}

.lyric-row p {
  margin-top: 0.45rem;
  font-size: 15px;
  line-height: 1.8;
  color: #2f2824;
}

.lyric-row__guide {
  display: grid;
  gap: 0.65rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 0.85rem;
}

.lyric-row__guide div {
  border-radius: 18px;
  background: rgba(248, 239, 228, 0.88);
  padding: 0.75rem 0.8rem;
}

.lyric-row__guide span {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: #8f7d6c;
}

.lyric-row__guide strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 12px;
  line-height: 1.75;
  color: #433932;
}

.analysis-panel {
  display: grid;
  gap: 1rem;
}

.analysis-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.analysis-card {
  padding: 1.1rem;
}

.analysis-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.analysis-card__head span {
  color: #a34135;
}

.analysis-card__head h4,
.teaching-item h4 {
  font-size: 1rem;
  font-weight: 700;
  color: #2b2622;
}

.analysis-card p,
.teaching-item p {
  margin-top: 0.6rem;
  font-size: 13px;
  line-height: 1.8;
  color: #6f6256;
}

.teaching-list,
.step-grid {
  display: grid;
  gap: 0.8rem;
}

.teaching-item {
  border-radius: 24px;
  border: 1px solid rgba(186, 158, 122, 0.16);
  background: rgba(255, 255, 255, 0.74);
  padding: 1rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.8rem;
}

.mini-tag {
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.08);
  padding: 0.34rem 0.7rem;
  font-size: 11px;
  font-weight: 700;
  color: #8b3232;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  padding: 1rem;
  font-size: 14px;
  line-height: 1.8;
  color: #564d46;
}

.step-item__index {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(163, 65, 53, 0.1);
  color: #8b3232;
  font-weight: 800;
}

.bottom-bar {
  margin-bottom: 1rem;
  padding: 1rem;
  justify-content: center;
}

@media (max-width: 1180px) {
  .hero,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .analysis-grid {
    grid-template-columns: 1fr;
  }

  .lyrics-list {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .top-bar,
  .hero,
  .content-grid,
  .bottom-bar {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .hero__copy {
    min-height: 400px;
    padding: 1.1rem;
  }

  .lyric-row__guide {
    grid-template-columns: 1fr;
  }
}
</style>
