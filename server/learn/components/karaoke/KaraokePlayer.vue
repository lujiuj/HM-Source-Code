<template>
  <div class="wesing-player" :class="{ 'audio-mode': isAudioOnly }">
    <!-- Decorative Frame Corners -->
    <div class="frame-corner top-left"></div>
    <div class="frame-corner top-right"></div>
    <div class="frame-corner bottom-left"></div>
    <div class="frame-corner bottom-right"></div>

    <!-- Background Layer (Video/Audio) -->
    <div class="background-layer">
      <div class="background-content-frame">
        <video
          v-if="useVideo"
          ref="videoRef"
          class="bg-video"
          :src="song.videoSrc"
          :muted="shouldMuteVideo"
          @timeupdate="onTimeUpdate"
          @play="onPlay"
          @pause="onPause"
          @ended="onEnded"
          @loadedmetadata="onLoadedMetadata"
          playsinline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
        ></video>
      </div>
      
      <!-- Solid Background when KTV off -->
      <div
        v-if="!useVideo"
        class="solid-bg"
        :style="solidBgStyle"
      ></div>
      
      <audio
        v-if="shouldRenderAudio"
        ref="audioRef"
        :src="audioSource"
        @timeupdate="onTimeUpdate"
        @play="onPlay"
        @pause="onPause"
        @ended="onEnded"
        @loadedmetadata="onLoadedMetadata"
      ></audio>
      
      <!-- Overlay Gradient -->
      <div class="bg-overlay"></div>
      
      <!-- Audio Mode Placeholder -->
      <div v-if="isAudioOnly && !useVideo" class="audio-placeholder">
        <div class="disc-cover">
          <span class="disc-letter">{{ song.title?.charAt(0) || '戏' }}</span>
        </div>
      </div>
    </div>

    <!-- UI Layer -->
    <div class="ui-layout">
      
      <!-- 1. Header (Top) -->
      <header class="header-bar">
        <div class="header-left-spacer"></div>
        
        <div class="header-center">
          <h1 class="song-title">{{ song.title || '加载中...' }}</h1>
          <span class="mode-badge">{{ isGuideLyricsMode ? '提示句' : isKTVMode ? '舞台' : '练唱' }}</span>
        </div>
        
        <div class="header-right">
          <!-- KTV Toggle -->
          <div class="ktv-toggle" @click="toggleKTV">
            <span class="ktv-label">舞台</span>
            <span class="ktv-status">{{ isKTVMode ? '开' : '关' }}</span>
          </div>

          <button class="scoring-btn" @click="showScoringModal = true">
            <span class="material-symbols-outlined scoring-icon">star</span>
            <span>六维评分</span>
          </button>

          <div class="score-pill">
            <span class="material-symbols-outlined score-icon">star</span>
            <span class="score-val">{{ currentTotalScore }}</span>
          </div>
          <button class="menu-dots">
            <span class="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
      </header>

      <!-- 2. Main Visual Area (Upper Middle) -->
      <div class="visualizer-section">
        <div class="lane-playhead" aria-hidden="true"></div>

        <!-- Piano Roll Component -->
        <div class="piano-roll-container">
          <PitchLineVisualizer
            v-if="visualLineIndex >= 0"
            class="piano-roll-canvas"
            :scoreRef="scoreRef"
            :lineIndex="visualLineIndex"
            :relTimeMs="currentRelTimeMs"
            :lineDurationMs="visualLineDurationMs"
            :lineText="visualLineText"
            :windowMs="pianoRollWindowMs"
            :preRollMs="pianoRollPreRollMs"
            :stepMs="40"
            :pitch="uiPitch"
            :noteInfo="noteInfo"
            :pitchTrail="pitchTrail"
            :hitLineRatio="0.3"
            noteStyle="b"
          />
        </div>

        <div v-if="showPosterStage" class="poster-stage">
          <div class="poster-stage__copy">
            <p class="poster-stage__eyebrow">{{ song.operaName || '黄梅戏' }} · {{ song.excerptName || '练唱' }}</p>
            <h2>{{ song.title }}</h2>
            <p>{{ song.summary || '先听句法，再把人物情绪和气口稳住。' }}</p>
            <div class="poster-stage__tags">
              <span v-for="tag in posterTags" :key="tag">{{ tag }}</span>
            </div>
          </div>
          <div v-if="isGuideLyricsMode" class="poster-stage__guide">
            <p class="poster-stage__guide-label">提示句模式</p>
            <strong>{{ currentGuideText }}</strong>
            <span>当前素材暂无逐字歌词，已切换为本地提示句练唱。</span>
          </div>
        </div>

        <!-- Mic Warning -->
        <div v-if="micError" class="mic-toast">{{ micError }}</div>

        <!-- Autoplay blocked overlay (needs user gesture) -->
        <div v-if="autoplayBlocked && !isPlaying" class="autoplay-overlay" @click="handleUserStart">
          <div class="autoplay-card">
            <div class="autoplay-title">点击开始演唱</div>
            <div class="autoplay-sub">浏览器限制自动播放，需要一次点击</div>
            <button class="autoplay-btn" @click.stop="handleUserStart">开始</button>
          </div>
        </div>
      </div>

      <!-- 3. Lyrics Area (Lower Middle) -->
      <div class="lyrics-section">
        <div v-if="isGuideLyricsMode" class="lyrics-guide-banner">
          <span class="lyrics-guide-banner__label">提示句模式</span>
          <p>以下为本地提示句，用于保持节奏感和情绪走向。</p>
        </div>
        <LyricsDisplay
          class="lyrics-display-panel"
          :lyrics="lyrics"
          :currentLineIndex="currentLineIndex"
          :currentTimeMs="alignedTimeMs"
          :fontSize="isAudioOnly ? '48px' : '40px'"
          highlightColor="var(--color-primary-dark)"
          @seek="onLyricSeek"
        />
      </div>

      <!-- 4. Right Sidebar (Floating) -->
      <aside class="right-sidebar">
        <div class="sidebar-item" title="智能助唱">
          <div class="icon-box">
            <span class="material-symbols-outlined">mic</span>
          </div>
          <span>助唱</span>
        </div>
        <div class="sidebar-item" title="和声模式">
          <div class="icon-box">
            <span class="material-symbols-outlined">music_note</span>
          </div>
          <span>和声</span>
        </div>
        <div class="sidebar-item" title="切换主题">
          <div class="icon-box">
            <span class="material-symbols-outlined">palette</span>
          </div>
          <span>主题</span>
        </div>
      </aside>

      <!-- 5. Bottom Controls (Fixed) -->
      <footer class="bottom-bar">
        <div class="progress-meta">
          <span class="progress-label">当前进度</span>
          <span class="progress-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>

        <!-- Progress Line (Top Edge) -->
        <div class="progress-container" @click="seek">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress * 100}%` }"></div>
          </div>
        </div>

        <!-- Control Buttons -->
        <div class="control-row">
          
          <!-- Left Group: Settings -->
          <div class="ctrl-group left">
            <button 
              class="ctrl-btn pill-btn"
              :class="{ active: isAccompanimentMode }"
              v-if="hasAccompaniment"
              @click="toggleAccompaniment"
            >
              <span class="icon"><span class="material-symbols-outlined text-[16px]">{{ isAccompanimentMode ? 'volume_off' : 'mic' }}</span></span>
              <span>{{ isAccompanimentMode ? '原唱' : '伴奏' }}</span>
            </button>
            
            <button class="ctrl-btn pill-btn">
              <span class="icon"><span class="material-symbols-outlined text-[16px]">tune</span></span>
              <span>调音</span>
            </button>
            
            <!-- 纯享按钮已移除，使用KTV开关替代 -->
          </div>

          <!-- Center Group: Playback -->
          <div class="ctrl-group center">
            <button class="unified-btn retry" @click="requestRestart">
              <span class="material-symbols-outlined icon">replay</span>
              <span>重录</span>
            </button>

            <div class="play-btn-wrapper">
              <!-- 进度环SVG -->
              <svg class="progress-ring" viewBox="0 0 100 100">
                <!-- 背景圆环 -->
                <circle
                  class="progress-ring-bg"
                  cx="50" cy="50" r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  stroke-width="3"
                />
                <!-- 进度圆环 -->
                <circle
                  class="progress-ring-fill"
                  cx="50" cy="50" r="46"
                  fill="none"
                  stroke="var(--color-primary-dark)"
                  stroke-width="3"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="progressOffset"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              
              <!-- 播放按钮 -->
              <button class="play-circle" @click="togglePlay">
                <span v-if="isPlaying" class="icon-pause"></span>
                <span v-else class="icon-play"></span>
              </button>
            </div>

            <button class="unified-btn finish" @click="requestFinish">
              <span class="material-symbols-outlined icon">check</span>
              <span>完成</span>
            </button>
          </div>

          <!-- Right Group: Exit -->
          <div class="ctrl-group right">
            <button class="unified-btn exit-btn" @click="$emit('exit')">
              退出
            </button>
          </div>
          
        </div>
      </footer>

      <!-- Global Countdown Overlay -->
      <div v-if="isCountdownVisible" class="countdown-overlay">
        <div class="countdown-dots">
          <div
            v-for="i in 3"
            :key="i"
            class="c-dot"
            :class="{ active: i <= countdownDots }"
          ></div>
          <span class="countdown-num">{{ countdownDots }}</span>
        </div>
      </div>
    </div>

    <div v-if="confirmAction" class="confirm-overlay" @click="closeConfirm">
      <div class="confirm-card" @click.stop>
        <h3>{{ confirmAction === 'restart' ? '确认重录' : '确认完成本次演唱' }}</h3>
        <p>{{ confirmAction === 'restart' ? '将从头开始并重置本次得分。' : '将立即结束并生成当前成绩。' }}</p>
        <div class="confirm-actions">
          <button class="confirm-btn ghost" @click="closeConfirm">取消</button>
          <button class="confirm-btn primary" @click="confirmPrimary">
            {{ confirmAction === 'restart' ? '确认重录' : '确认完成' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Scoring Modal -->
    <div v-if="showScoringModal" class="modal-overlay" @click="showScoringModal = false">
      <div class="modal-content" @click.stop>
        <h3>六维评分说明</h3>
        <p class="scoring-note">
          实时滚动音符主要反馈音准和节奏命中，演唱结束后会结合逐句结果补全咬字、韵味、气息、情感四项分析。
        </p>
        <div class="dimension-list">
          <div class="dimension-item">
            <span class="dim-name">音准</span>
            <span class="dim-desc">检测你的音高准确度</span>
          </div>
          <div class="dimension-item">
            <span class="dim-name">节奏</span>
            <span class="dim-desc">检测你的节奏把握</span>
          </div>
          <div class="dimension-item">
            <span class="dim-name">气息</span>
            <span class="dim-desc">检测你的气息稳定性</span>
          </div>
          <div class="dimension-item">
            <span class="dim-name">咬字</span>
            <span class="dim-desc">检测吐字是否清晰，起音与收音是否利落</span>
          </div>
          <div class="dimension-item">
            <span class="dim-name">韵味</span>
            <span class="dim-desc">检测黄梅行腔与人物气质是否唱出来</span>
          </div>
          <div class="dimension-item">
            <span class="dim-name">情感</span>
            <span class="dim-desc">检测情绪推进、句尾处理与整体感染力</span>
          </div>
        </div>
        <button class="modal-close-btn" @click="showScoringModal = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useHuangmeiScore } from '../../../shared/composables/useHuangmeiScore.js'
import { useLyricSync } from '../../../shared/composables/useLyricSync.js'
import { usePitchDetection } from '../../../shared/composables/usePitchDetection.js'
import { scorePreviousLineOnChange } from '../../../shared/utils/karaokeLineScoring.js'
import { getExpectedPitchForLine, loadScoreRef } from '../../../shared/utils/scoreRef.js'
import { buildSongGuideTimeline } from '../../utils/learnCatalog.js'
import LyricsDisplay from './LyricsDisplay.vue'
import PitchLineVisualizer from './PitchLineVisualizer.vue'

const props = defineProps({
  song: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['exit', 'ended', 'progress', 'finish-early'])

// Refs
const videoRef = ref(null)
const audioRef = ref(null)
const isAudioOnly = ref(false)
const isPlaying = ref(false)
const autoplayBlocked = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const currentTotalScore = ref(0)
const showScoringModal = ref(false)
const isGuideLyricsMode = ref(false)
const isKTVMode = ref(false)
const linePraiseText = ref('GREAT')
const linePraiseMultiplier = ref(1)
let praisePerfectStreak = 0

const useVideo = computed(() => (
  !isAudioOnly.value &&
  isKTVMode.value &&
  Boolean(props.song?.videoSrc)
))

// In accompaniment mode, we still want KTV video visuals, but audio must play.
const shouldRenderAudio = computed(() => (
  isAccompanimentMode.value || !useVideo.value
))

// When accompaniment is on, mute the video element to avoid double audio.
const shouldMuteVideo = computed(() => isAccompanimentMode.value)

const toggleKTV = () => {
  const wasPlaying = isPlaying.value
  const pos = mediaElement.value?.currentTime || 0
  isKTVMode.value = !isKTVMode.value

  // KTV implies video background; don’t let stale audio-only state block it.
  if (isKTVMode.value && props.song?.videoSrc) {
    isAudioOnly.value = false
  }

  // In accompaniment mode, switching KTV mainly affects visuals (video background).
  if (isAccompanimentMode.value) {
    nextTick(() => {
      if (useVideo.value) {
        syncVideoVisualToAudio(true)
        if (wasPlaying) playVideoVisual()
      }
    })
    return
  }

  switchMediaSource({ positionSec: pos, resume: wasPlaying })
}

// Accompaniment mode
const isAccompanimentMode = ref(false)
const hasAccompaniment = computed(() => !!props.song?.accompanimentSrc)
const pendingSeekTime = ref(null)
const pendingPlayAfterSwitch = ref(false)
const pitchTrail = ref([])
let trailSampleSeq = 0
let trailPitchEma = null
const TRAIL_PITCH_ALPHA = 0.18

// Line Scoring
const lineScoreVisible = ref(false)
const lineScoreGrade = ref('')
const lineScorePoints = ref(0)
let lineScoreTimer = null
let progressFrameId = null
const isCountdownVisible = ref(false)
const countdownDots = ref(3)
let countdownTimer = null
let countdownPromise = null
const lineScores = ref(new Map())
const scoredLines = ref(new Set())
const confirmAction = ref('')

let vadState = false
const VAD_ON = 0.005
const VAD_OFF = 0.0028

function resetVADState() {
  vadState = false
}

const scoreRef = ref(null)

const {
  addSample: addHuangmeiSample,
  scoreLine: scoreHuangmeiLine,
  calculateFinalScore,
  reset: resetHuangmeiScore
} = useHuangmeiScore()

let sampleTimer = null
const SAMPLE_INTERVAL_MS = 40 // 更平滑的 trail 更新频率（25Hz）

// Get media element
const mediaElement = computed(() => {
  // In accompaniment mode, audio is always the primary playback driver.
  if (isAccompanimentMode.value) return audioRef.value || videoRef.value
  if (useVideo.value) return videoRef.value || audioRef.value
  return audioRef.value || videoRef.value
})

function isPrimaryMediaTarget(target) {
  const primary = mediaElement.value
  return Boolean(primary) && target === primary
}

function syncVideoVisualToAudio(force = false) {
  if (!isAccompanimentMode.value) return
  if (!useVideo.value) return
  const video = videoRef.value
  const audio = audioRef.value
  if (!video || !audio) return

  const a = audio.currentTime || 0
  const v = video.currentTime || 0
  const drift = Math.abs(v - a)
  if (force || drift > 0.18) {
    try {
      video.currentTime = a
    } catch {
      // ignore
    }
  }
}

function playVideoVisual() {
  const video = videoRef.value
  if (!video) return
  video.muted = true
  video.play().catch(() => {})
}

function pauseVideoVisual() {
  videoRef.value?.pause()
}

// Lyrics sync
const {
  lyrics,
  currentLineIndex,
  offsetMs,
  loadLRC,
  syncWithMedia
} = useLyricSync()

function buildGuideLyrics(song) {
  return buildSongGuideTimeline(song, {
    totalDurationSec: song?.durationSeconds || 0
  }).map((line) => ({
    time: line.time,
    text: line.text
  }))
}

const posterImage = computed(() => (
  props.song?.heroImage ||
  props.song?.bannerImage ||
  props.song?.timelineCover ||
  props.song?.cover ||
  ''
))

const posterObjectPosition = computed(() => (
  props.song?.heroObjectPosition ||
  props.song?.bannerObjectPosition ||
  props.song?.objectPosition ||
  'center center'
))

const solidBgStyle = computed(() => ({
  backgroundImage: [
    'radial-gradient(circle at top, rgba(255, 255, 255, 0.36), transparent 34%)',
    isGuideLyricsMode.value
      ? 'linear-gradient(180deg, rgba(250, 245, 235, 0.98), rgba(238, 226, 210, 0.92))'
      : 'linear-gradient(180deg, rgba(252, 248, 240, 0.98), rgba(243, 232, 217, 0.94))'
  ].join(', '),
  backgroundSize: 'cover, cover',
  backgroundPosition: 'center center, center center'
}))

const posterTags = computed(() => {
  const tags = Array.isArray(props.song?.tags) ? props.song.tags.slice(0, 3) : []
  if (tags.length) return tags
  return [props.song?.operaName, props.song?.excerptName, props.song?.difficultyText]
    .filter(Boolean)
    .slice(0, 3)
})

const showPosterStage = computed(() => false)

const currentGuideText = computed(() => (
  visualLineText.value ||
  props.song?.summary ||
  '先稳住气口，再把人物情绪慢慢唱开。'
))

const visualLineIndex = computed(() => {
  if (Number.isInteger(currentLineIndex.value) && currentLineIndex.value >= 0) return currentLineIndex.value
  // Render immediately once lyrics are ready, so notes keep scrolling from start.
  if (Array.isArray(lyrics.value) && lyrics.value.length > 0) return 0
  return -1
})

const visualLineText = computed(() => {
  if (!Array.isArray(lyrics.value)) return ''
  const idx = visualLineIndex.value
  if (!Number.isInteger(idx) || idx < 0) return ''
  return String(lyrics.value[idx]?.text || '')
})

const visualLineDurationMs = computed(() => {
  if (!Array.isArray(lyrics.value)) return 2400
  const idx = visualLineIndex.value
  if (!Number.isInteger(idx) || idx < 0 || idx >= lyrics.value.length) return 2400
  const start = lyrics.value[idx]?.time ?? 0
  const next = lyrics.value[idx + 1]?.time ?? (start + 2600)
  const raw = next - start
  return Math.max(1800, Math.min(7600, Number.isFinite(raw) ? raw : 2400))
})

const pianoRollPreRollMs = computed(() => {
  // Slow down note travel so the pitch bars are easier to read and anticipate.
  return Math.round(Math.max(2400, Math.min(4400, visualLineDurationMs.value * 1.15)))
})

const pianoRollWindowMs = computed(() => {
  // Extend the visible timeline to reduce perceived scrolling speed.
  return Math.round(Math.max(6600, Math.min(9200, visualLineDurationMs.value + 4300)))
})

// Pitch detection
const {
  pitch,
  noteInfo,
  volume,
  isVoiceDetected,
  isListening,
  error: micError,
  start: startPitchDetection,
  stop: stopPitchDetection
} = usePitchDetection({
  minVolume: 0.0025,
  smoothingWindow: 4
})

// UI pitch dot should feel intuitive: if the user isn't singing, the dot must not drift.
// In real environments, pitch detectors can output unstable values on background noise;
// we gate the UI dot with a stricter hysteresis on volume + pitch presence.
const uiVadState = ref(false)
const UI_VAD_ON = 0.0065
const UI_VAD_OFF = 0.0042

watch([pitch, volume], () => {
  const rms = typeof volume.value === 'number' ? volume.value : 0
  const hasPitch = typeof pitch.value === 'number' && Number.isFinite(pitch.value) && pitch.value > 0
  if (uiVadState.value) {
    if (rms < UI_VAD_OFF || !hasPitch) uiVadState.value = false
  } else if (rms > UI_VAD_ON && hasPitch) {
    uiVadState.value = true
  }
})

const uiPitch = computed(() => (uiVadState.value ? pitch.value : null))

// Progress
const progress = computed(() => {
  if (duration.value === 0) return 0
  return currentTime.value / duration.value
})

const circumference = 2 * Math.PI * 46
const progressOffset = computed(() => {
  return circumference - progress.value * circumference
})

const alignedTimeMs = computed(() => {
  const ms = currentTime.value * 1000
  const off = typeof offsetMs.value === 'number' && Number.isFinite(offsetMs.value) ? offsetMs.value : 0
  return ms + off
})

const currentRelTimeMs = computed(() => {
  const idx = visualLineIndex.value
  if (!Number.isInteger(idx) || idx < 0) return 0
  const startMs = lyrics.value?.[idx]?.time ?? 0
  // Keep negative pre-roll so notes can continuously travel from right to left.
  return Math.floor(alignedTimeMs.value - startMs)
})

// Load lyrics
watch(() => props.song, async (newSong) => {
  if (newSong?.lrcPath) {
    await loadLRC(newSong.lrcPath)
  } else {
    lyrics.value = []
    currentLineIndex.value = -1
  }
  if (!lyrics.value.length) {
    lyrics.value = buildGuideLyrics(newSong)
    currentLineIndex.value = lyrics.value.length ? 0 : -1
    isGuideLyricsMode.value = lyrics.value.length > 0
  } else {
    isGuideLyricsMode.value = false
  }
  // Reset score
  currentTotalScore.value = 0
  lineScores.value.clear()
  scoredLines.value.clear()
  resetHuangmeiScore()
  resetVADState()
  linePraiseText.value = 'GREAT'
  linePraiseMultiplier.value = 1
  praisePerfectStreak = 0
  scoreRef.value = null
  pitchTrail.value = []
  trailPitchEma = null
  trailSampleSeq = 0
  pendingSeekTime.value = null
  pendingPlayAfterSwitch.value = false

  if (newSong?.id && newSong?.lrcPath && lyrics.value.length) {
     try {
       scoreRef.value = await loadScoreRef(newSong.id, lyrics.value)
     } catch {
       scoreRef.value = null
     }
   }
 }, { immediate: true })

// Sync lyrics
watch(mediaElement, (element, _, onCleanup) => {
  if (element) {
    const dispose = syncWithMedia(element)
    if (typeof dispose === 'function') {
      onCleanup(dispose)
    }
  }
})

watch(currentLineIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex) {
    pitchTrail.value = []
    trailPitchEma = null
  }
  if (!Number.isInteger(oldIndex) || oldIndex < 0) return
  if (oldIndex === newIndex) return
  if (scoredLines.value.has(oldIndex)) return

  const result = scorePreviousLineOnChange({
    previousIndex: oldIndex,
    currentIndex: newIndex,
    lyrics: lyrics.value,
    scoreLine: scoreHuangmeiLine
  })

  if (!result) return
  scoredLines.value.add(result.lineIndex)
  triggerHuangmeiLineScore(result)
})

function triggerHuangmeiLineScore(lineResult) {
  const lineOverall = Math.round(lineResult?.overall || 0)
  lineScoreGrade.value = lineResult?.gradeLabel || lineResult?.grade || 'C'
  lineScorePoints.value = Math.max(0, Math.min(100, lineOverall))

  if (lineScorePoints.value >= 88) {
    praisePerfectStreak += 1
    linePraiseText.value = 'PERFECT'
  } else if (lineScorePoints.value >= 74) {
    praisePerfectStreak = 0
    linePraiseText.value = 'GREAT'
  } else if (lineScorePoints.value >= 58) {
    praisePerfectStreak = 0
    linePraiseText.value = 'NICE'
  } else {
    praisePerfectStreak = 0
    linePraiseText.value = 'KEEP'
  }
  linePraiseMultiplier.value = praisePerfectStreak >= 2 ? Math.min(4, praisePerfectStreak) : 1

  const final = calculateFinalScore()
  currentTotalScore.value = Math.round(final?.overall || 0)

}

function scoreLineIfNeeded(lineIndex) {
  if (!Number.isInteger(lineIndex) || lineIndex < 0) return
  if (scoredLines.value.has(lineIndex)) return

  const lineText = Array.isArray(lyrics.value) ? (lyrics.value[lineIndex]?.text || '') : ''
  const result = scoreHuangmeiLine(lineIndex, lineText)
  if (!result) return

  scoredLines.value.add(result.lineIndex)
  triggerHuangmeiLineScore(result)
}

function currentScoreRefSummary() {
  return {
    available: Boolean(scoreRef.value),
    version: Number(scoreRef.value?.version || 0) || null,
    lineCount: Array.isArray(scoreRef.value?.lines) ? scoreRef.value.lines.length : 0,
    source: scoreRef.value?.source || '',
    generatedAt: scoreRef.value?.generatedAt || ''
  }
}

function finishEarly() {
  scoreLineIfNeeded(currentLineIndex.value)
  mediaElement.value?.pause()
  isPlaying.value = false
  stopCountdown()
  stopProgressLoop()

  const final = calculateFinalScore()
  emit('finish-early', {
    score: final?.overall || 0,
    duration: currentTime.value,
    huangmei: final,
    lineScores: Array.isArray(final?.lines) ? final.lines : [],
    scoreRefSummary: currentScoreRefSummary()
  })
}

function requestRestart() {
  confirmAction.value = 'restart'
}

function requestFinish() {
  confirmAction.value = 'finish'
}

function closeConfirm() {
  confirmAction.value = ''
}

async function confirmPrimary() {
  const action = confirmAction.value
  confirmAction.value = ''
  if (action === 'restart') {
    await restart()
    return
  }
  if (action === 'finish') {
    finishEarly()
  }
}

// Event handlers
function onTimeUpdate(e) {
  if (!isPrimaryMediaTarget(e.target)) return
  currentTime.value = e.target.currentTime

  // Keep video background in sync with accompaniment audio.
  syncVideoVisualToAudio(false)

  emit('progress', {
    currentTime: currentTime.value,
    duration: duration.value,
    progress: progress.value,
    pitch: pitch.value,
    volume: volume.value,
    isVoiceDetected: isVoiceDetected.value
  })
}

function onPlay(e) {
  if (e?.target && !isPrimaryMediaTarget(e.target)) return
  isPlaying.value = true
  startProgressLoop()
  startSampling()

  if (isAccompanimentMode.value && useVideo.value) {
    syncVideoVisualToAudio(true)
    playVideoVisual()
  }
}

function onPause(e) {
  if (e?.target && !isPrimaryMediaTarget(e.target)) return
  isPlaying.value = false
  // During restart/lyric-seek we deliberately pause media while the countdown
  // overlay is running; pausing should not cancel that countdown.
  if (!isCountdownVisible.value) stopCountdown()
  stopProgressLoop()
  stopSampling()

  pauseVideoVisual()
}

function onEnded(e) {
  if (e?.target && !isPrimaryMediaTarget(e.target)) return
  isPlaying.value = false
  stopCountdown()
  stopProgressLoop()
  stopSampling()
  pauseVideoVisual()
  scoreLineIfNeeded(currentLineIndex.value)

  const final = calculateFinalScore()
  currentTotalScore.value = final?.overall || 0
  emit('ended', {
    huangmei: final,
    lineScores: Array.isArray(final?.lines) ? final.lines : [],
    scoreRefSummary: currentScoreRefSummary()
  })
}

function onLoadedMetadata(e) {
  // Secondary video in accompaniment mode: sync & play (muted) if needed.
  if (!isPrimaryMediaTarget(e.target)) {
    if (isAccompanimentMode.value && e.target === videoRef.value) {
      syncVideoVisualToAudio(true)
      if (isPlaying.value) playVideoVisual()
    }
    return
  }

  const rawDuration = Number(e.target.duration)
  const fallbackDuration = Number(props.song?.durationSeconds || 0)
  duration.value = Number.isFinite(rawDuration) && rawDuration > 0
    ? rawDuration
    : (fallbackDuration > 0 ? fallbackDuration : 0)
  if (pendingSeekTime.value !== null && Number.isFinite(pendingSeekTime.value)) {
    const media = e.target
    const maxTime = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : pendingSeekTime.value
    media.currentTime = Math.min(Math.max(pendingSeekTime.value, 0), maxTime)
    pendingSeekTime.value = null

    if (pendingPlayAfterSwitch.value) {
      media.play().then(() => {
        autoplayBlocked.value = false
      }).catch(() => {
        autoplayBlocked.value = true
      })
    }
    pendingPlayAfterSwitch.value = false
  }
}

async function playMedia(media) {
  if (!media) return false
  try {
    await media.play()
    autoplayBlocked.value = false
    return true
  } catch {
    autoplayBlocked.value = true
    return false
  }
}

async function togglePlay() {
  const media = mediaElement.value
  if (!media) return
  if (isPlaying.value) {
    media.pause()
    return
  }

  if (!isListening.value) {
    startMicrophone().catch(() => {})
  }

  const shouldCountdown = (media.currentTime || 0) <= 0.12

  // If we are going to await the countdown, do a quick play/pause inside the
  // user gesture to unlock playback first (prevents post-await play() blocks).
  if (shouldCountdown) {
    const unlocked = await tryUnlockMediaPlayback(media)
    if (!unlocked) {
      autoplayBlocked.value = true
      return
    }
  }

  // If autoplay has already been blocked (e.g. initial mount), also try to unlock.
  if (autoplayBlocked.value) {
    const unlocked = await tryUnlockMediaPlayback(media)
    if (!unlocked) {
      autoplayBlocked.value = true
      return
    }
  }

  if (shouldCountdown) {
    await runCountdown()
  }

  await playMedia(media)
}

async function tryUnlockMediaPlayback(media) {
  const prevMuted = media.muted
  try {
    media.muted = true
    await media.play()
    media.pause()
    // Reset so countdown begins from the start.
    if (Number.isFinite(media.currentTime)) media.currentTime = 0
    media.muted = prevMuted
    return true
  } catch {
    media.muted = prevMuted
    return false
  }
}

function handleUserStart() {
  // Must be called synchronously from click.
  togglePlay()
}

function switchMediaSource({ positionSec = 0, resume = false } = {}) {
  pendingSeekTime.value = positionSec
  pendingPlayAfterSwitch.value = Boolean(resume)

  nextTick(() => {
    const media = mediaElement.value
    if (!media) return

    const hasDuration = Number.isFinite(media.duration) && media.duration > 0
    if (hasDuration) {
      const maxTime = media.duration
      media.currentTime = Math.min(Math.max(positionSec, 0), maxTime)
      pendingSeekTime.value = null
      if (resume) {
        media.play().then(() => {
          autoplayBlocked.value = false
        }).catch(() => {
          autoplayBlocked.value = true
        })
      }
      pendingPlayAfterSwitch.value = false
    }
  })
}

function startProgressLoop() {
  if (progressFrameId !== null) return

  const tick = () => {
    if (!isPlaying.value) {
      progressFrameId = null
      return
    }

    const media = mediaElement.value
    if (media) {
      currentTime.value = media.currentTime || 0
    }

    progressFrameId = requestAnimationFrame(tick)
  }

  progressFrameId = requestAnimationFrame(tick)
}

function stopProgressLoop() {
  if (progressFrameId === null) return
  cancelAnimationFrame(progressFrameId)
  progressFrameId = null
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownPromise = null
  isCountdownVisible.value = false
  countdownDots.value = 3
}

function runCountdown({ restart = false } = {}) {
  if (restart) {
    stopCountdown()
  }

  if (countdownPromise) {
    return countdownPromise
  }

  isCountdownVisible.value = true
  countdownDots.value = 3

  countdownPromise = new Promise((resolve) => {
    let remain = 3
    countdownTimer = setInterval(() => {
      remain -= 1
      countdownDots.value = Math.max(0, remain)

      if (remain <= 0) {
        stopCountdown()
        resolve()
      }
    }, 650)
  })

  return countdownPromise
}

async function restart() {
  const media = mediaElement.value
  if (!media) return

  media.pause()
  stopCountdown()
  media.currentTime = 0
  currentTime.value = 0
  syncVideoVisualToAudio(true)
  currentTotalScore.value = 0
  lineScores.value.clear()
  scoredLines.value.clear()
  resetHuangmeiScore()
  resetVADState()
  linePraiseText.value = 'GREAT'
  linePraiseMultiplier.value = 1
  praisePerfectStreak = 0
  pitchTrail.value = []
  trailPitchEma = null
  trailSampleSeq = 0
  if (!isListening.value) {
    startMicrophone().catch(() => {})
  }
  await runCountdown({ restart: true })
  await playMedia(media)
}

function handleSeek(targetTime) {
  const media = mediaElement.value
  if (!media || duration.value === 0) return

  const previousTime = currentTime.value

  media.currentTime = targetTime
  syncVideoVisualToAudio(true)
  pitchTrail.value = []
  trailPitchEma = null

  if (targetTime < previousTime) {
    // Seeking backwards invalidates accumulated scoring state; restart scoring from scratch.
    currentTotalScore.value = 0
    lineScores.value.clear()
    scoredLines.value.clear()
    resetHuangmeiScore()
    resetVADState()
  }
}

function seek(e) {
  const media = mediaElement.value
  if (!media || duration.value === 0) return
  const rect = e.currentTarget.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const percentage = clickX / rect.width
  handleSeek(percentage * duration.value)
}

async function onLyricSeek(timeInSeconds) {
  const media = mediaElement.value
  if (!media) return
  
  media.pause()
  stopCountdown()
  
  handleSeek(timeInSeconds)
  
  // 点击歌词后显示倒计时再繼续播放
  await runCountdown({ restart: true })
  
  // 点击歌词后总是开始播放
  await playMedia(media)
}

function toggleMode() {
  const wasPlaying = isPlaying.value
  const pos = mediaElement.value?.currentTime || 0
  isAudioOnly.value = !isAudioOnly.value
  switchMediaSource({ positionSec: pos, resume: wasPlaying })
}

// Toggle accompaniment (消原唱)
function toggleAccompaniment() {
  if (!hasAccompaniment.value) return
  const wasPlaying = isPlaying.value
  const pos = mediaElement.value?.currentTime || 0

  // Prevent a short “double audio” blip when switching from video→accompaniment.
  // Vue will update :muted on next render, but we want the property change immediately.
  if (!isAccompanimentMode.value && useVideo.value && videoRef.value) {
    videoRef.value.muted = true
  }

  isAccompanimentMode.value = !isAccompanimentMode.value

  switchMediaSource({ positionSec: pos, resume: wasPlaying })

  nextTick(() => {
    if (isAccompanimentMode.value && useVideo.value) {
      syncVideoVisualToAudio(true)
      if (wasPlaying) playVideoVisual()
    }
  })
}

// Computed audio source for accompaniment switching
const audioSource = computed(() => {
  if (!props.song) return ''
  if (isAccompanimentMode.value && props.song.accompanimentSrc) {
    return props.song.accompanimentSrc
  }
  return props.song.audioSrc || props.song.videoSrc
})

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Used in template (Biome doesn't analyze template bindings)
const __templateBindings = {
  LyricsDisplay,
  PitchLineVisualizer,
  showScoringModal,
  autoplayBlocked,
  isGuideLyricsMode,
  useVideo,
  shouldRenderAudio,
  shouldMuteVideo,
  solidBgStyle,
  showPosterStage,
  posterTags,
  currentGuideText,
  toggleKTV,
  isKTVMode,
  handleUserStart,
  currentTotalScore,
  progressOffset,
  visualLineIndex,
  visualLineText,
  visualLineDurationMs,
  currentRelTimeMs,
  linePraiseText,
  linePraiseMultiplier,
  noteInfo,
  micError,
  confirmAction,
  requestRestart,
  requestFinish,
  closeConfirm,
  confirmPrimary,
  finishEarly,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onLoadedMetadata,
  togglePlay,
  seek,
  onLyricSeek,
  toggleMode,
  toggleAccompaniment,
  audioSource,
  formatTime
}

void __templateBindings

async function startMicrophone() {
  await startPitchDetection()
}

function startSampling() {
  if (sampleTimer) return
  sampleTimer = setInterval(() => {
    if (!isPlaying.value) return
    if (!lyrics.value.length) return

    const lineIndex = currentLineIndex.value
    const hasPitch = typeof pitch.value === 'number' && Number.isFinite(pitch.value) && pitch.value > 0
    const rms = typeof volume.value === 'number' ? volume.value : 0
    if (vadState) {
      if (rms < VAD_OFF || !hasPitch) vadState = false
    } else {
      if (rms > VAD_ON && hasPitch) vadState = true
    }
    const isVoiced = vadState || (hasPitch && rms > VAD_OFF)
    const mediaMs = currentTime.value * 1000

    if (lineIndex < 0) {
      pitchTrail.value = []
      return
    }

    const lineStartMs = lyrics.value[lineIndex]?.time ?? 0
    const alignedMs = mediaMs + (offsetMs.value || 0)
    // Keep line-relative time continuous so notes scroll naturally from phrase start.
    const relTimeMs = alignedMs - lineStartMs
    const trailLeftBound = relTimeMs - (pianoRollWindowMs.value + 240)

    if (hasPitch && isVoiced) {
      if (trailPitchEma === null) {
        trailPitchEma = pitch.value
      } else {
        trailPitchEma = trailPitchEma * (1 - TRAIL_PITCH_ALPHA) + pitch.value * TRAIL_PITCH_ALPHA
      }
      trailSampleSeq += 1
      pitchTrail.value.push({ id: trailSampleSeq, lineIndex, relTimeMs, pitch: trailPitchEma })
    }

    if (pitchTrail.value.length > 180) {
      pitchTrail.value = pitchTrail.value.slice(-180)
    }
    pitchTrail.value = pitchTrail.value.filter((item) => (
      item.lineIndex === lineIndex && item.relTimeMs >= trailLeftBound
    ))

    const expectedPitch = scoreRef.value
      ? getExpectedPitchForLine(scoreRef.value, lineIndex, relTimeMs)
      : null

    addHuangmeiSample(
      expectedPitch ? { pitch: pitch.value, expectedPitch } : { pitch: pitch.value },
      { rms: volume.value, isVoiced },
      Date.now()
    )
  }, SAMPLE_INTERVAL_MS)
}

function stopSampling() {
  if (!sampleTimer) return
  clearInterval(sampleTimer)
  sampleTimer = null
}

onMounted(async () => {
  startMicrophone()
  // 倒计时后自动播放
  await runCountdown({ restart: true })
  if (mediaElement.value) {
    const played = await playMedia(mediaElement.value)
    if (!played) console.log('自动播放被阻止')
  }
})

onUnmounted(() => {
  stopCountdown()
  stopProgressLoop()
  stopSampling()
  stopPitchDetection()
  if (lineScoreTimer) clearTimeout(lineScoreTimer)
})

defineExpose({
  play: () => mediaElement.value?.play(),
  pause: () => mediaElement.value?.pause(),
  restart,
  getCurrentTime: () => currentTime.value,
  getDuration: () => duration.value
})
</script>

<style scoped lang="less">
/* === Global Container === */
.wesing-player {
  --player-side-gap: 42px;
  --player-bottom-gap: 18px;
  --player-bottom-bar-height: 104px;
  --player-header-top: 24px;
  position: relative;
  width: 100%;
  height: 100vh;
  background: #F7F4EB url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(%23n)" opacity="0.05"/></svg>') repeat;
  overflow: hidden;
  font-family: "STZhongsong", "Songti SC", "SimSun", serif;
  color: #3E2723;
  user-select: none;
}

/* Decorative borders - Simplified Premium Look */
.frame-corner {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid #D4AF37;
  z-index: 5;
  pointer-events: none;
  opacity: 0.6;
}
.frame-corner.top-left { top: 20px; left: 24px; border-right: none; border-bottom: none; }
.frame-corner.top-right { top: 20px; right: 24px; border-left: none; border-bottom: none; }
.frame-corner.bottom-left { bottom: 20px; left: 24px; border-right: none; border-top: none; }
.frame-corner.bottom-right { bottom: 20px; right: 24px; border-left: none; border-top: none; }

/* === Background Media === */
.background-layer {
  position: absolute;
  inset: 0;
  z-index: 0;

  .background-content-frame {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #F2F1ED;
  }
  
  .bg-video {
    width: 100%; height: 100%; object-fit: cover;
  }

  .solid-bg {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    z-index: 1;
    background-color: #F2F1ED;
    filter: saturate(0.92) contrast(1.04);
  }
  
  .bg-overlay {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background:
      linear-gradient(180deg, rgba(251, 248, 242, 0.04) 0%, rgba(251, 248, 242, 0.01) 24%, rgba(245, 236, 220, 0.04) 100%),
      radial-gradient(circle at center, rgba(255, 255, 255, 0.01) 0%, rgba(247, 244, 235, 0.06) 100%);
    pointer-events: none;
    z-index: 2;
  }
}

.audio-placeholder {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  
  .disc-cover {
    width: 320px; height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #445, #112);
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    border: 8px solid rgba(255,255,255,0.05);
    animation: spin 20s linear infinite;
    
    .disc-letter {
      font-size: 120px; font-weight: 700; color: rgba(255,255,255,0.1);
    }
  }
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* === UI Layout Grid === */
.ui-layout {
  position: relative; z-index: 10;
  width: 100%;
  height: 100%;
  display: flex; flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* === 1. Header (Top) === */
.header-bar {
  position: absolute; top: var(--player-header-top); left: var(--player-side-gap); right: var(--player-side-gap); height: 44px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; z-index: 50;
  background: linear-gradient(180deg, rgba(98, 73, 55, 0.22), rgba(79, 58, 44, 0.28));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(212, 175, 55, 0.16);
  border-bottom: 1px solid rgba(212, 175, 55, 0.22);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(30, 20, 14, 0.1);
}

.header-left-spacer, .header-right { flex: 1; }

.header-center {
  flex: 2; display: flex; flex-direction: column; align-items: center; justify-content: center;gap: 4px;
}

.song-title {
  font-size: 17px; font-weight: 600; 
  color: #3E2723; margin: 0; 
  text-align: center; font-family: '楷体', 'KaiTi', serif;
  letter-spacing: 2px;
  text-shadow: 0 1px 2px rgba(255, 250, 240, 0.9);
}

.mode-badge {
  font-size: 10px; font-weight: bold; background: linear-gradient(135deg, #FFF, #F3E5D8);
  color: #8A2E2E; padding: 2px 8px; border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 2px 4px rgba(93, 64, 55, 0.1);
  letter-spacing: 1px;
}

.header-right {
  display: flex; align-items: center; justify-content: flex-end; gap: 16px;
}
/* === 2. Visualizer (Upper Middle) === */
.visualizer-section {
  flex: 0 0 38%;
  margin-top: 74px;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  perspective: 1000px;
  min-height: 0;
  overflow: hidden;
}

.poster-stage {
  position: absolute;
  inset: 28px 72px 24px 72px;
  z-index: 18;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  padding: 28px 30px;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(20, 11, 8, 0.12), rgba(20, 11, 8, 0.44)),
    radial-gradient(circle at top right, rgba(212, 175, 55, 0.16), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 243, 221, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 22px 44px rgba(18, 10, 8, 0.18);
  pointer-events: none;
}

.poster-stage__copy {
  max-width: min(58%, 620px);
  color: #fff7ea;
}

.poster-stage__eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: rgba(255, 233, 194, 0.82);
}

.poster-stage__copy h2 {
  margin: 0.85rem 0 0;
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.poster-stage__copy p {
  margin: 0.9rem 0 0;
  max-width: 34rem;
  color: rgba(255, 245, 227, 0.88);
  line-height: 1.8;
  font-size: 0.98rem;
}

.poster-stage__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.poster-stage__tags span {
  border-radius: 999px;
  border: 1px solid rgba(255, 239, 210, 0.16);
  background: rgba(255, 255, 255, 0.08);
  padding: 0.36rem 0.78rem;
  color: #fff6e6;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.poster-stage__guide {
  width: min(320px, 32%);
  border-radius: 24px;
  border: 1px solid rgba(255, 239, 210, 0.16);
  background: rgba(255, 248, 240, 0.12);
  padding: 1rem 1.1rem;
  backdrop-filter: blur(18px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  color: #fff9f1;
}

.poster-stage__guide-label {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.22em;
  color: rgba(255, 230, 185, 0.82);
}

.poster-stage__guide strong {
  display: block;
  margin-top: 0.7rem;
  font-size: 1.18rem;
  line-height: 1.55;
}

.poster-stage__guide span {
  display: block;
  margin-top: 0.65rem;
  color: rgba(255, 244, 220, 0.82);
  line-height: 1.75;
  font-size: 0.84rem;
}

.lane-playhead {
  position: absolute;
  left: 25%; /* Synchronized with PitchLineVisualizer's hitLineRatio */
  top: 12px;
  bottom: 12px;
  width: 1.5px;
  background: linear-gradient(to bottom, rgba(212, 175, 55, 0), rgba(212, 175, 55, 0.9) 20%, rgba(160, 58, 58, 0.9) 50%, rgba(212, 175, 55, 0.9) 80%, rgba(212, 175, 55, 0));
  transform: translateX(-0.75px);
  z-index: 36;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.5);
  pointer-events: none;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #FFF;
    box-shadow: 0 0 16px 4px rgba(212, 175, 55, 0.6);
  }
}

.piano-roll-container {
    width: 100%;
    height: 304px;
    padding: 8px 0;
    position: relative;
  overflow: visible;
  mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: none;
  border-top: 1px solid rgba(212, 175, 55, 0.08);
  border-bottom: 1px solid rgba(212, 175, 55, 0.08);
  box-shadow: inset 0 0 40px rgba(93, 64, 55, 0.03);
}

.piano-roll-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* === 3. Lyrics (Lower Middle) === */
.lyrics-section {
  flex: 1;
  position: relative;
  display: flex; flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding-bottom: calc(var(--player-bottom-gap) + var(--player-bottom-bar-height) + 18px);
  mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
}

.lyrics-guide-banner {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  align-self: center;
  margin: 0 42px 10px;
  border-radius: 999px;
  border: 1px solid rgba(212, 175, 55, 0.32);
  background: rgba(255, 249, 240, 0.84);
  padding: 0.6rem 1rem;
  color: #7a342f;
  box-shadow: 0 10px 24px rgba(92, 59, 35, 0.08);
}

.lyrics-guide-banner p {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 700;
  line-height: 1.6;
}

.lyrics-guide-banner__label {
  border-radius: 999px;
  background: rgba(192, 74, 68, 0.1);
  padding: 0.22rem 0.58rem;
  color: #a03a3a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.lyrics-display-panel {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  background: rgba(255, 252, 246, 0.02);
  backdrop-filter: none;
  border: 1px solid rgba(212, 175, 55, 0.06);
  border-radius: 20px;
  margin: 0 42px;
}

.lyrics-empty {
  position: absolute;
  left: 50%;
  top: 60%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  color: #3E2723;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  background: rgba(247, 244, 235, 0.8);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.countdown-overlay {
  position: absolute;
  left: 50%;
  top: 39%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  z-index: 90;
  pointer-events: none;
  
  .countdown-dots {
    display: flex;
    gap: 11px;
    padding: 14px 18px;
    background: rgba(247, 244, 235, 0.8);
    border: 1px solid rgba(212, 175, 55, 0.5);
    border-radius: 999px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 12px rgba(62, 39, 35, 0.2);
    
    .c-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #D4AF37;
      opacity: 0;
      transform: scale(0.7);
      transition: opacity 0.22s ease, transform 0.22s ease;
      &.active {
        opacity: 1;
        transform: scale(1.65);
        background: #A03A3A;
        box-shadow: 0 0 12px rgba(160, 58, 58, 0.4);
      }
    }

    .countdown-num {
      display: none;
    }
  }
}

/* === 4. Right Sidebar === */
.right-sidebar {
  position: absolute; right: calc(var(--player-side-gap) - 6px); top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 16px;
  z-index: 40;
  
  .sidebar-item {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    cursor: pointer; opacity: 0.74; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    
    &:hover { 
      opacity: 1; 
      transform: translateY(-4px) scale(1.05); 
    }
    
    .icon-box {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(247, 244, 235, 0.6));
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; 
      border: 1px solid rgba(212, 175, 55, 0.3);
      color: #8A2E2E;
      box-shadow: 0 2px 8px rgba(93, 64, 55, 0.08);
      transition: all 0.3s ease;
      
      svg { width: 18px; height: 18px; stroke: #8D6E63; transition: stroke 0.3s; }
    }
    
    &:hover .icon-box {
      background: linear-gradient(135deg, #FFF, #FDFBF7);
      box-shadow: 
        0 8px 20px rgba(138, 46, 46, 0.18),
        inset 0 2px 4px rgba(255, 255, 255, 1);
      border-color: rgba(212, 175, 55, 0.7);
      color: #A03A3A;
      svg { stroke: #A03A3A; }
    }
    
    span { 
      font-size: 11px; 
      font-weight: 600; 
      color: #5D4037; 
      text-shadow: 0 1px 2px rgba(255, 250, 240, 0.9); 
      letter-spacing: 0.5px;
    }
  }
}

/* === 5. Bottom Controls === */
.bottom-bar {
  position: absolute; bottom: var(--player-bottom-gap); left: var(--player-side-gap); right: var(--player-side-gap);
  min-height: var(--player-bottom-bar-height);
  background:
    linear-gradient(180deg, rgba(71, 53, 41, 0.52), rgba(46, 32, 25, 0.66));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.12);
  border-top: 1px solid rgba(236, 210, 142, 0.18);
  border-radius: 16px;
  display: flex; flex-direction: column;
  box-shadow: 0 8px 20px rgba(17, 10, 7, 0.14);
  overflow: hidden;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px 0;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba(255, 244, 220, 0.68);
}

.progress-label {
  font-weight: 700;
}

.progress-time {
  font-weight: 800;
  color: rgba(255, 244, 220, 0.86);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.progress-container {
  height: 10px; width: 100%; cursor: pointer;
  position: relative;
  background: rgba(255, 244, 220, 0.02);
  
  &:hover .progress-track { height: 6px; background: rgba(212, 175, 55, 0.25); }
  
  .progress-track {
    width: 100%; height: 3px; background: rgba(212, 175, 55, 0.15);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    position: absolute; bottom: 0;
  }
  .progress-fill { 
    height: 100%; 
    background: linear-gradient(90deg, #D4AF37, #A03A3A); 
    box-shadow: 0 0 12px rgba(160, 58, 58, 0.4); 
    border-radius: 0 3px 3px 0;
  }
}

.control-row {
  flex: 1; display: flex; align-items: center; justify-content: space-between;
  padding: 8px 22px 12px;
}

.ctrl-group {
  display: flex; align-items: center; gap: 16px;
  &.center {
    gap: 24px;
    position: relative;
    padding-bottom: 0;
  }
  &.left, &.right { flex: 1; }
  &.right { justify-content: flex-end; }
}

.pill-btn {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(247, 244, 235, 0.7));
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 8px 18px; border-radius: 20px;
  color: #5D4037; font-size: 14px; font-weight: 600; cursor: pointer; 
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 
    0 4px 12px rgba(93, 64, 55, 0.06),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
  
  &:hover { 
    transform: translateY(-2px);
    background: linear-gradient(135deg, #FFF, #FDFBF7); 
    color: #8A2E2E; 
    border-color: rgba(212, 175, 55, 0.8); 
    box-shadow: 
      0 6px 16px rgba(138, 46, 46, 0.15),
      inset 0 1px 2px rgba(255, 255, 255, 1);
  }
  
  &.active { 
    background: linear-gradient(135deg, #A03A3A, #8A2E2E); 
    color: #FFF; 
    border-color: #7A2020; 
    box-shadow: 
      0 4px 12px rgba(160, 58, 58, 0.4),
      inset 0 1px 3px rgba(0, 0, 0, 0.2); 
  }
}

.unified-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  height: 40px;
  padding: 0 20px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(247, 244, 235, 0.8));
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-bottom: 2px solid rgba(212, 175, 55, 0.5);
  border-radius: 20px;
  color: #5D4037;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 
    0 4px 12px rgba(93, 64, 55, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
    
  .icon {
    font-size: 16px;
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  
  &:hover {
    background: #FFF; 
    color: #A03A3A; 
    border-color: rgba(212, 175, 55, 0.6);
    transform: translateY(-2px);
    box-shadow: 
      0 6px 16px rgba(138, 46, 46, 0.15),
      inset 0 2px 0 rgba(255, 255, 255, 1);
      
    .icon { transform: scale(1.15); }
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(93, 64, 55, 0.1);
  }
  
  &:focus-visible {
    outline: 2px solid #A03A3A;
    outline-offset: 2px;
  }
}

.play-btn-wrapper {
  position: relative;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* 呼吸光晕动画 */
@keyframes pulseGlow {
  0% { box-shadow: 0 0 0 0 rgba(160, 58, 58, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(160, 58, 58, 0); }
  100% { box-shadow: 0 0 0 0 rgba(160, 58, 58, 0); }
}

.play-circle {
  width: 52px; height: 52px;
  border-radius: 50%;
  /* 红宝石红渐变 */
  background: linear-gradient(135deg, #c62828, #8e0000);
  border: 2px solid rgba(212, 175, 55, 0.8); 
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 
    0 4px 16px rgba(160, 58, 58, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 1;
  position: relative;
  
  /* 播放中呼吸效果 (通过外部控制类，但这里给hover默认反馈) */
  animation: pulseGlow 2.5s infinite;
  
  .icon-play {
    width: 0; height: 0; border-style: solid;
    border-width: 10px 0 10px 15px;
    border-color: transparent transparent transparent #FFFAF0;
    margin-left: 5px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  
  .icon-pause {
    width: 14px; height: 18px; 
    border-left: 4px solid #FFFAF0; 
    border-right: 4px solid #FFFAF0;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  
  &:hover { 
    transform: scale(1.08); 
    box-shadow: 
      0 6px 20px rgba(160, 58, 58, 0.6),
      inset 0 2px 6px rgba(255, 255, 255, 0.5);
    border-color: #D4AF37;
  }
  
  &:active { 
    transform: scale(0.95); 
    box-shadow: 0 2px 8px rgba(160, 58, 58, 0.5);
  }
}



/* === Confirm Overlay === */
@media (max-width: 768px) {
  .wesing-player {
    --player-side-gap: 14px;
    --player-bottom-gap: 12px;
    --player-bottom-bar-height: 112px;
    --player-header-top: 14px;
  }

  .header-bar {
    padding: 0 16px;
  }

  .header-left-spacer {
    width: 138px;
    flex-basis: 138px;
  }

  .header-right {
    gap: 8px;
  }

  .visualizer-section {
    flex: 0 0 34%;
  }

  .poster-stage {
    inset: 18px 16px 18px 16px;
    flex-direction: column;
    align-items: flex-start;
    padding: 18px;
  }

  .poster-stage__copy,
  .poster-stage__guide {
    max-width: 100%;
    width: 100%;
  }

  .poster-stage__copy h2 {
    font-size: clamp(1.7rem, 7vw, 2.4rem);
  }

  .piano-roll-container {
    height: 340px;
    padding: 8px 0 10px;
  }

  .lyrics-section {
    padding-bottom: calc(var(--player-bottom-gap) + var(--player-bottom-bar-height) + 18px);
  }

  .lyrics-guide-banner,
  .lyrics-display-panel {
    margin-left: 14px;
    margin-right: 14px;
  }

  .right-sidebar {
    right: 8px;
    gap: 14px;
    
    .sidebar-item {
      .icon-box {
        width: 38px;
        height: 38px;
      }

      span {
        font-size: 10px;
      }
    }
  }

  .bottom-bar {
    min-height: var(--player-bottom-bar-height);
  }

  .progress-meta {
    padding: 10px 12px 0;
    font-size: 11px;
  }

  .control-row {
    padding: 6px 10px 10px;
  }

  .ctrl-group.center {
    gap: 14px;
  }

  .pill-btn {
    padding: 7px 10px;
    font-size: 12px;
  }
}

.mic-toast {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(247, 244, 235, 0.95);
  color: #A03A3A;
  border: 1px solid #D4AF37;
  box-shadow: 0 4px 12px rgba(62, 39, 35, 0.2);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
  z-index: 100;
}

.autoplay-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  background: rgba(247, 244, 235, 0.8);
  backdrop-filter: blur(8px);
}

.autoplay-card {
  width: min(360px, calc(100vw - 48px));
  padding: 16px 16px 14px;
  border-radius: 14px;
  background: #F7F4EB;
  border: 2px solid #D4AF37;
  box-shadow: 0 8px 24px rgba(62, 39, 35, 0.2);
  text-align: center;
}

.autoplay-title {
  font-size: 16px;
  font-weight: bold;
  color: #3E2723;
  margin-bottom: 6px;
}

.autoplay-sub {
  font-size: 12px;
  color: #A03A3A;
  margin-bottom: 12px;
}

.autoplay-btn {
  appearance: none;
  border: 1px solid #D4AF37;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: bold;
  color: #F7F4EB;
  background: linear-gradient(90deg, #A03A3A, #8A2E2E);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(62, 39, 35, 0.1);
  transition: all 0.2s;
  &:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(160, 58, 58, 0.3); }
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(247, 244, 235, 0.8);
  backdrop-filter: blur(7px);
  z-index: 980;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
}

.confirm-card {
  width: min(420px, 100%);
  border-radius: 18px;
  border: 2px solid #D4AF37;
  background: #F7F4EB;
  padding: 18px 18px 16px;
  box-shadow: 0 8px 24px rgba(62, 39, 35, 0.2);

  h3 {
    margin: 0;
    font-size: 20px;
    color: #3E2723;
    font-weight: bold;
  }

  p {
    margin: 10px 0 0;
    font-size: 14px;
    color: #A03A3A;
    line-height: 1.5;
  }
}

.confirm-actions {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.confirm-btn {
  border-radius: 11px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;

  &.ghost {
    border-color: #D4AF37;
    background: transparent;
    color: #3E2723;
    &:hover { background: rgba(212, 175, 55, 0.1); }
  }

  &.primary {
    border-color: #D4AF37;
    background: linear-gradient(90deg, #A03A3A, #8A2E2E);
    color: #F7F4EB;
    box-shadow: 0 2px 6px rgba(62, 39, 35, 0.1);
    &:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(160, 58, 58, 0.3); }
  }
}

/* === Scoring Button & Modal === */
.scoring-btn {
  background: #F7F4EB;
  border: 1px solid #D4AF37;
  border-radius: 20px;
  padding: 8px 14px;
  color: #3E2723;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(62, 39, 35, 0.1);
  
  .scoring-icon { font-size: 16px; color: #A03A3A; }
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    color: #A03A3A;
  }
  &:active { transform: translateY(0); }
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(247, 244, 235, 0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: #F7F4EB;
  padding: 32px;
  border-radius: 24px;
  width: 90%;
  max-width: 460px;
  border: 2px solid #D4AF37;
  box-shadow: 0 8px 24px rgba(62, 39, 35, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
  
  h3 {
    margin: 0 0 24px 0;
    font-size: 20px;
    color: #3E2723;
    font-weight: bold;
  }
}

.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.scoring-note {
  margin: -8px 0 18px;
  color: #7d5f47;
  font-size: 12px;
  line-height: 1.8;
}


.dimension-item {
  display: flex;
  align-items: center;
  background: rgba(212, 175, 55, 0.1);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  
  .dim-name {
    font-weight: bold;
    color: #A03A3A;
    width: 60px;
    text-align: left;
    font-size: 16px;
  }
  
  .dim-desc {
    color: #3E2723;
    font-size: 13px;
    flex: 1;
    text-align: left;
  }
}

.modal-close-btn {
  background: #F7F4EB;
  border: 1px solid #D4AF37;
  color: #3E2723;
  padding: 10px 32px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(62, 39, 35, 0.1);
  
  &:hover {
    background: #fff;
    color: #A03A3A;
    transform: translateY(-1px);
  }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

</style>
