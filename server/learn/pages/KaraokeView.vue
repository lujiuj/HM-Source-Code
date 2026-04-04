<script setup>
import { onMounted, onUnmounted, ref, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KaraokePlayer from '../components/karaoke/KaraokePlayer.vue'
import { useAudioRecorder } from '../../shared/composables/useAudioRecorder.js'
import { getInfra } from '../../shared/infra/index.js'
import { getGradeByScore } from '../../shared/utils/grades.js'
import { useDisplayName } from '../composables/useDisplayName.js'
import { buildAnalysisV2FromKaraoke, getLegacyBreakdownFromAnalysis } from '../utils/analysisV2.js'
import { getLearnSongById, getLearnSongs } from '../utils/learnCatalog.js'

const router = useRouter()
const route = useRoute()
const infra = getInfra()
const uid = infra.identity.getUid()

const selectedSong = ref(null)
const songNotFound = ref(false)
const silentWarning = ref('')
const { displayName, loadDisplayName, saveDisplayName } = useDisplayName({ identity: infra.identity })

const {
  recordingUrl,
  recordingBlob,
  recordingDuration,
  start: startRecording,
  stop: stopRecording,
  clear: clearRecording
} = useAudioRecorder()

let recordingFinalizationPromise = null
let previousBodyOverflow = ''

function startRecordingInBackground(reason = 'unknown') {
  startRecording().catch((e) => {
    console.log(`Recording not available (${reason}):`, e)
  })
}

async function finalizeRecording({ reason } = {}) {
  if (recordingBlob.value) return recordingBlob.value
  if (recordingFinalizationPromise) return await recordingFinalizationPromise
  recordingFinalizationPromise = (async () => {
    try {
      const blob = await stopRecording()
      return blob || recordingBlob.value || null
    } catch (e) {
      console.warn(`[KaraokeView] 录音停止失败${reason ? ` (${reason})` : ''}:`, e)
      return recordingBlob.value || null
    }
  })().finally(() => { recordingFinalizationPromise = null })
  return await recordingFinalizationPromise
}

function normalizeHuangmeiResult(huangmei) {
  const rawTotalScore = typeof huangmei?.totalScore === 'number'
    ? huangmei.totalScore
    : (typeof huangmei?.overall === 'number' ? huangmei.overall : 0)
  const totalScore = Number.isFinite(rawTotalScore) ? Math.max(0, rawTotalScore) : 0
  const rawLineCount = typeof huangmei?.lineCount === 'number'
    ? huangmei.lineCount
    : (Array.isArray(huangmei?.lines) ? huangmei.lines.length : 0)
  const lineCount = Number.isFinite(rawLineCount) ? Math.max(0, Math.floor(rawLineCount)) : 0
  const rawAverageScore = typeof huangmei?.averageScore === 'number'
    ? huangmei.averageScore
    : (lineCount > 0 ? totalScore / lineCount : 0)
  const averageScore = Number.isFinite(rawAverageScore) ? Math.max(0, Math.min(100, rawAverageScore)) : 0
  const rawPitch = typeof huangmei?.breakdown?.pitch === 'number' ? huangmei.breakdown.pitch : averageScore
  const rawRhythm = typeof huangmei?.breakdown?.rhythm === 'number' ? huangmei.breakdown.rhythm : averageScore
  const fallbackFloor = lineCount > 0 ? Math.max(36, Math.min(76, Math.round(averageScore * 0.62))) : 0
  const pitchAccuracy = Math.max(rawPitch || 0, fallbackFloor)
  const voiceActivity = Math.max(rawRhythm || 0, Math.max(30, fallbackFloor - 8))
  const breakdown = {
    pitch: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.pitch === 'number' ? huangmei.breakdown.pitch : pitchAccuracy))),
    rhythm: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.rhythm === 'number' ? huangmei.breakdown.rhythm : voiceActivity))),
    articulation: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.articulation === 'number' ? huangmei.breakdown.articulation : averageScore))),
    style: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.style === 'number' ? huangmei.breakdown.style : averageScore))),
    breath: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.breath === 'number' ? huangmei.breakdown.breath : voiceActivity))),
    emotion: Math.max(0, Math.min(100, Math.round(typeof huangmei?.breakdown?.emotion === 'number' ? huangmei.breakdown.emotion : averageScore)))
  }
  const grade = typeof huangmei?.grade === 'string' ? huangmei.grade : ''
  const safeGrade = ['SSS', 'SS', 'S', 'A', 'B', 'C'].includes(grade) ? grade : getGradeByScore(averageScore)
  const stars = Math.max(0, Math.min(5, Math.round(averageScore / 20)))
  return {
    totalScore: Math.round(totalScore),
    averageScore: Math.round(averageScore),
    lineCount,
    voiceActivity: Math.max(0, Math.min(100, Math.round(voiceActivity))),
    pitchAccuracy: Math.max(0, Math.min(100, Math.round(pitchAccuracy))),
    breakdown,
    stars,
    grade: safeGrade
  }
}

async function handlePracticeComplete(isEarlyFinish, payload) {
  const blob = await finalizeRecording({ reason: isEarlyFinish ? 'finish-early' : 'song-ended' })
  const huangmei = payload?.huangmei
  const result = huangmei
    ? normalizeHuangmeiResult(huangmei)
    : { totalScore: 0, averageScore: 0, lineCount: 0, voiceActivity: 0, pitchAccuracy: 0, breakdown: {}, stars: 0, grade: 'C' }
  const v2LineResults = Array.isArray(payload?.lineScores) ? payload.lineScores : []
  const analysisV2 = buildAnalysisV2FromKaraoke({
    huangmei: {
      ...huangmei,
      breakdown: result.breakdown,
      averageScore: result.averageScore,
      grade: result.grade
    },
    lineScores: v2LineResults,
    scoreRefSummary: payload?.scoreRefSummary
  })
  const legacyBreakdown = getLegacyBreakdownFromAnalysis(analysisV2)

  const noVoice = result.lineCount === 0 || result.voiceActivity <= 5

  // Save practice session
  try {
    const infraMode = import.meta.env.VITE_INFRA_MODE || 'local'
    let mediaId = null
    if (blob && infraMode === 'local') {
      try {
        const stored = await infra.media.storeMedia(blob, { userId: uid, songId: selectedSong.value.id, type: blob.type || 'audio/webm' })
        mediaId = stored?.id || null
      } catch (e) { console.warn('保存练习录音失败:', e) }
    }
    const durationSec = Math.round((recordingDuration.value || 0) / 1000)
    const session = {
      songId: selectedSong.value.id,
      songName: selectedSong.value.excerptName,
      score: result.averageScore,
      totalScore: result.totalScore,
      averageScore: result.averageScore,
      lineCount: result.lineCount,
      voiceActivity: legacyBreakdown.voiceActivity,
      pitchAccuracy: legacyBreakdown.pitchAccuracy,
      breakdown: {
        ...result.breakdown,
        ...legacyBreakdown
      },
      stars: result.stars,
      grade: result.grade,
      duration: durationSec,
      mediaId,
      analysisV2,
      lineScores: toRaw(v2LineResults),
      timestamp: Date.now()
    }
    const practiceId = await infra.practice.savePracticeSession(uid, session)
    if (practiceId) {
      const query = noVoice ? { hint: 'silent' } : {}
      router.push({ path: `/learn/practice/history/${practiceId}`, query })
      return
    }
  } catch (e) {
    console.error('保存分数失败:', e)
  }
  // Fallback — still navigate even on save failure
  if (noVoice) {
    silentWarning.value = '本次未录到有效演唱内容，可先回听伴奏或重新录一遍'
  }
  router.push('/learn/practice')
}

async function onSongEnded(payload) { await handlePracticeComplete(false, payload) }
async function onFinishEarly(payload) { await handlePracticeComplete(true, payload) }

function exitKaraoke() {
  void finalizeRecording({ reason: 'exit-karaoke' })
  router.push('/learn/practice')
}

onMounted(async () => {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  loadDisplayName({ ensureFallback: true, silent: true })

  const songId = String(route.query.songId || '').trim()
  if (!songId) {
    router.replace('/learn/practice')
    return
  }
  const catalogSong = getLearnSongById(songId)
  const fallbackSong = getLearnSongs().find((item) => item.isScorable) || null
  const target = catalogSong || (songId ? null : fallbackSong)
  if (!target) {
    songNotFound.value = true
    return
  }
  selectedSong.value = {
    ...target,
    title: target.title || `${target.operaName || '黄梅戏'} - ${target.excerptName || '唱段'}`,
    description: target.summary || target.description || ''
  }
  clearRecording()
  startRecordingInBackground('karaoke-mount')
})

onUnmounted(() => {
  document.body.style.overflow = previousBodyOverflow
  void finalizeRecording({ reason: 'unmount' })
})
</script>

<template>
  <div class="h-screen w-full relative overflow-hidden">
    <!-- Silent recording warning -->
    <div v-if="silentWarning" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 text-amber-100 px-6 py-3 rounded-xl text-sm font-bold shadow-lg backdrop-blur-sm">
      {{ silentWarning }}
    </div>
    <div v-if="songNotFound" class="flex items-center justify-center h-full text-slate-800">
      <div class="text-center">
        <span class="material-symbols-outlined text-6xl text-primary/40 mb-4 block">music_off</span>
        <p class="text-lg mb-4">找不到该唱段</p>
        <button @click="$router.push('/learn/practice')" class="px-6 py-2 bg-primary text-slate-900 font-bold rounded">返回选曲</button>
      </div>
    </div>
    <KaraokePlayer
      v-else-if="selectedSong"
      :song="selectedSong"
      @exit="exitKaraoke"
      @ended="onSongEnded"
      @finish-early="onFinishEarly"
    />
  </div>
</template>
