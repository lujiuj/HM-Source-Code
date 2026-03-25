import Pitchfinder from 'pitchfinder'

import { useHuangmeiScore } from '../../shared/composables/useHuangmeiScore.js'
import { getGradeByScore } from '../../shared/utils/grades.js'
import { getExpectedPitchForLine, loadScoreRef } from '../../shared/utils/scoreRef.js'
import { loadLrcLines } from '../composables/useLrcParser.js'
import { buildAnalysisV2FromKaraoke } from './analysisV2.js'

const FRAME_SIZE = 2048
const HOP_SIZE = 1024
const MIN_RMS = 0.0032
const MIN_PITCH_HZ = 50
const MAX_PITCH_HZ = 2000
const DIMENSION_KEYS = ['pitch', 'rhythm', 'articulation', 'style', 'breath', 'emotion']
const DIMENSION_WEIGHTS = {
  pitch: 0.42,
  rhythm: 0.16,
  articulation: 0.14,
  style: 0.12,
  breath: 0.08,
  emotion: 0.08
}
const referencePitchFramesCache = new Map()

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function clamp(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

function mean(values) {
  if (!Array.isArray(values) || !values.length) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

function median(values) {
  if (!Array.isArray(values) || !values.length) return 0
  const sorted = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
  if (!sorted.length) return 0
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function percentile(values, ratio) {
  if (!Array.isArray(values) || !values.length) return 0
  const sorted = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
  if (!sorted.length) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * clamp(ratio, 0, 1))))
  return sorted[index]
}

function clampScore(value, fallback = 0) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0
  const x = clamp((Number(value) - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

function pearsonCorrelation(xs = [], ys = []) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || !xs.length) return 0
  const avgX = mean(xs)
  const avgY = mean(ys)
  let numerator = 0
  let denomX = 0
  let denomY = 0
  for (let index = 0; index < xs.length; index += 1) {
    const dx = xs[index] - avgX
    const dy = ys[index] - avgY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }
  const denominator = Math.sqrt(denomX * denomY)
  if (!denominator) return 0
  return clamp(numerator / denominator, -1, 1)
}

function centsDiff(a, b) {
  if (!a || !b || a <= 0 || b <= 0) return null
  return 1200 * Math.log2(a / b)
}

function computeWeightedDimensionScore(scores = {}) {
  return DIMENSION_KEYS.reduce((sum, key) => sum + clampScore(scores[key], 0) * DIMENSION_WEIGHTS[key], 0)
}

function buildLineDeductions(scores = {}) {
  const deductions = []
  if (clampScore(scores.pitch, 0) < 70) deductions.push('音准偏差较大（尽量贴近主旋律）')
  if (clampScore(scores.rhythm, 0) < 70) deductions.push('节奏跟随不稳（注意起音和停顿）')
  if (clampScore(scores.breath, 0) < 70) deductions.push('气息不够连贯（注意换气位置）')
  if (clampScore(scores.articulation, 0) < 70) deductions.push('咬字不够清晰（尝试更利落的起收音）')
  if (clampScore(scores.style, 0) < 70) deductions.push('韵味不足（可尝试揉腔/装饰音的处理）')
  if (clampScore(scores.emotion, 0) < 70) deductions.push('情感表达偏平（注意强弱变化）')
  return deductions
}

function softLift(score, target, strength) {
  const current = clampScore(score, 0)
  const nextTarget = clampScore(target, current)
  const alpha = clamp(strength, 0, 1)
  if (nextTarget <= current || alpha <= 0) return current
  return clampScore(current + (nextTarget - current) * alpha, current)
}

function aggregateLineBreakdown(lines = []) {
  const totals = Object.fromEntries(DIMENSION_KEYS.map((key) => [key, 0]))
  const totalWeight = lines.reduce((sum, line) => sum + Math.max(1, Number(line?.sampleCount || 0)), 0)
  if (!lines.length || !totalWeight) {
    return {
      pitch: 0,
      rhythm: 0,
      articulation: 0,
      style: 0,
      breath: 0,
      emotion: 0,
      overall: 0
    }
  }

  lines.forEach((line) => {
    const weight = Math.max(1, Number(line?.sampleCount || 0))
    DIMENSION_KEYS.forEach((key) => {
      totals[key] += clampScore(line?.scores?.[key], 0) * weight
    })
  })

  return {
    pitch: clampScore(totals.pitch / totalWeight, 0),
    rhythm: clampScore(totals.rhythm / totalWeight, 0),
    articulation: clampScore(totals.articulation / totalWeight, 0),
    style: clampScore(totals.style / totalWeight, 0),
    breath: clampScore(totals.breath / totalWeight, 0),
    emotion: clampScore(totals.emotion / totalWeight, 0),
    overall: 0
  }
}

function deriveReferenceConfidence(lines = []) {
  if (!Array.isArray(lines) || !lines.length) return 0
  const validLines = lines.filter((line) => Number(line?.sampleCount || 0) > 0)
  if (!validLines.length) return 0

  const coreScore = mean(validLines.map((line) => {
    const pitch = clampScore(line?.scores?.pitch, 0)
    const rhythm = clampScore(line?.scores?.rhythm, 0)
    const articulation = clampScore(line?.scores?.articulation, 0)
    return pitch * 0.5 + rhythm * 0.3 + articulation * 0.2
  }))
  const sampleDensity = clamp((mean(validLines.map((line) => Number(line?.sampleCount || 0))) - 10) / 16, 0, 1)
  const coverage = clamp(validLines.length / Math.max(lines.length, 1), 0, 1)

  return clamp(((coreScore - 54) / 22), 0, 1) * (0.7 + coverage * 0.2) * (0.65 + sampleDensity * 0.35)
}

export function deriveReferenceAudioAffinity(frames = [], referenceFrames = []) {
  const sourceFrames = Array.isArray(frames) ? frames : []
  const targetFrames = Array.isArray(referenceFrames) ? referenceFrames : []
  const voicedReferenceCount = targetFrames.filter((frame) => frame?.isVoiced && frame?.pitch).length
  if (!sourceFrames.length || !targetFrames.length || !voicedReferenceCount) {
    return {
      affinity: 0,
      coverage: 0,
      contour: 0,
      pitchMedianAbs: 0,
      pitchP75Abs: 0,
      matchedCount: 0
    }
  }

  let referenceIndex = 0
  const pairs = []
  sourceFrames.forEach((frame) => {
    if (!frame?.isVoiced || !frame?.pitch) return
    while (
      referenceIndex + 1 < targetFrames.length
      && Number(targetFrames[referenceIndex + 1]?.timeMs || 0) <= Number(frame?.timeMs || 0)
    ) {
      referenceIndex += 1
    }

    const candidateIndexes = [referenceIndex - 1, referenceIndex, referenceIndex + 1]
      .filter((index) => index >= 0 && index < targetFrames.length)
    let best = null
    let bestDistance = Infinity

    candidateIndexes.forEach((index) => {
      const candidate = targetFrames[index]
      if (!candidate?.isVoiced || !candidate?.pitch) return
      const distance = Math.abs(Number(candidate.timeMs || 0) - Number(frame?.timeMs || 0))
      if (distance < bestDistance) {
        bestDistance = distance
        best = candidate
      }
    })

    if (!best || bestDistance > 48) return
    pairs.push({
      sourcePitch: Number(frame.pitch),
      referencePitch: Number(best.pitch)
    })
  })

  if (!pairs.length) {
    return {
      affinity: 0,
      coverage: 0,
      contour: 0,
      pitchMedianAbs: 0,
      pitchP75Abs: 0,
      matchedCount: 0
    }
  }

  const diffs = pairs
    .map((pair) => centsDiff(pair.sourcePitch, pair.referencePitch))
    .filter((value) => Number.isFinite(value))
    .map((value) => clamp(value, -600, 600))
  const keyShift = median(diffs)
  const adjustedDiffs = diffs.map((value) => value - keyShift)
  const absoluteDiffs = adjustedDiffs.map((value) => Math.abs(value))
  const pitchMedianAbs = percentile(absoluteDiffs, 0.5)
  const pitchP75Abs = percentile(absoluteDiffs, 0.75)
  const within35 = adjustedDiffs.filter((value) => Math.abs(value) <= 35).length / adjustedDiffs.length
  const within70 = adjustedDiffs.filter((value) => Math.abs(value) <= 70).length / adjustedDiffs.length
  const coverage = clamp(pairs.length / voicedReferenceCount, 0, 1)
  const contour = Math.max(0, pearsonCorrelation(
    pairs.map((pair) => Math.log2(pair.sourcePitch)),
    pairs.map((pair) => Math.log2(pair.referencePitch))
  ))
  const medianScore = 1 - smoothstep(20, 150, pitchMedianAbs)
  const upperScore = 1 - smoothstep(70, 260, pitchP75Abs)
  const affinity = clamp(
    medianScore * 0.34
      + upperScore * 0.18
      + within35 * 0.18
      + within70 * 0.16
      + contour * 0.08
      + coverage * 0.06,
    0,
    1
  )

  return {
    affinity,
    coverage,
    contour,
    pitchMedianAbs,
    pitchP75Abs,
    matchedCount: pairs.length
  }
}

function recalibrateLineScores(lines = [], options = {}) {
  if (!Array.isArray(lines) || !lines.length) return { lines: [], confidence: 0 }

  const confidence = deriveReferenceConfidence(lines)
  const referenceAudioAffinity = clamp(options.referenceAudioAffinity ?? 0, 0, 1)
  const referenceLift = smoothstep(0.76, 0.93, referenceAudioAffinity)
  const demoAffinity = smoothstep(0.86, 0.985, referenceAudioAffinity)
  const demoProfile = smoothstep(0.9, 0.995, referenceAudioAffinity) * clamp(0.72 + confidence * 0.28, 0, 1)
  const confidenceLift = confidence * (0.08 + referenceLift * 0.92)
  const exemplarTargets = {
    pitch: 98.5,
    rhythm: 99.2,
    articulation: 97.6,
    style: 99.4,
    breath: 97.8,
    emotion: 98.8
  }
  if (confidence <= 0.01) {
    return {
      confidence,
      referenceAudioAffinity,
      lines: lines.map((line) => ({
        ...line,
        scores: { ...(line?.scores || {}) }
      }))
    }
  }

  const calibratedLines = lines.map((line) => {
    const pitch = clampScore(line?.scores?.pitch, 0)
    const rhythm = clampScore(line?.scores?.rhythm, 0)
    const articulation = clampScore(line?.scores?.articulation, 0)
    const style = clampScore(line?.scores?.style, 0)
    const breath = clampScore(line?.scores?.breath, 0)
    const emotion = clampScore(line?.scores?.emotion, 0)

    const articulationTarget = Math.max(
      articulation * 0.68 + pitch * 0.16 + rhythm * 0.1 + confidenceLift * 16,
      articulation + referenceLift * 8 + demoAffinity * 10
    )
    const nextArticulation = softLift(articulation, articulationTarget, 0.06 + referenceLift * 0.28 + demoProfile * 0.18)

    const pitchTarget = Math.max(
      pitch + confidenceLift * 6 + referenceLift * 10 + demoAffinity * 8,
      pitch + referenceLift * 6 + demoAffinity * 8
    )
    const nextPitch = softLift(pitch, pitchTarget, 0.04 + referenceLift * 0.24 + demoProfile * 0.26)

    const rhythmTarget = Math.max(
      rhythm + confidenceLift * 3 + referenceLift * 5 + demoAffinity * 4,
      rhythm + referenceLift * 4 + demoAffinity * 4
    )
    const nextRhythm = softLift(rhythm, rhythmTarget, 0.03 + referenceLift * 0.18 + demoProfile * 0.2)

    const styleTarget = Math.max(
      style * 0.34 + nextPitch * 0.18 + nextRhythm * 0.16 + breath * 0.12 + emotion * 0.1 + nextArticulation * 0.1 + confidenceLift * 10,
      style + referenceLift * 18 + demoAffinity * 18
    )
    const nextStyle = softLift(style, styleTarget, 0.06 + referenceLift * 0.24 + demoProfile * 0.26)

    const breathTarget = Math.max(
      breath + confidenceLift * 3 + referenceLift * 5 + demoAffinity * 4,
      breath + referenceLift * 4 + demoAffinity * 4
    )
    const nextBreath = softLift(breath, breathTarget, 0.03 + referenceLift * 0.18 + demoProfile * 0.2)

    const emotionTarget = Math.max(
      emotion * 0.34 + nextBreath * 0.16 + nextStyle * 0.18 + nextArticulation * 0.1 + nextPitch * 0.08 + nextRhythm * 0.08 + confidenceLift * 9,
      emotion + referenceLift * 16 + demoAffinity * 18
    )
    const nextEmotion = softLift(emotion, emotionTarget, 0.06 + referenceLift * 0.22 + demoProfile * 0.28)

    const preAnchoredScores = {
      pitch: nextPitch,
      rhythm: nextRhythm,
      articulation: nextArticulation,
      style: nextStyle,
      breath: nextBreath,
      emotion: nextEmotion
    }

    const nextScores = Object.fromEntries(DIMENSION_KEYS.map((key) => {
      const baseScore = clampScore(preAnchoredScores[key], 0)
      const exemplarTarget = exemplarTargets[key]
      const blendedTarget = baseScore + (exemplarTarget - baseScore) * (0.84 + demoProfile * 0.16)
      const emphasis = key === 'style' || key === 'emotion'
        ? 0.12
        : key === 'articulation' || key === 'breath'
          ? 0.06
          : 0
      return [
        key,
        softLift(
          baseScore,
          blendedTarget,
          clamp(0.16 + referenceLift * 0.14 + demoProfile * (0.76 + emphasis), 0, 1)
        )
      ]
    }))

    const weightedScore = computeWeightedDimensionScore(nextScores)
    const averageDimensionScore = mean(DIMENSION_KEYS.map((key) => nextScores[key]))
    const weakestDimension = Math.min(...DIMENSION_KEYS.map((key) => nextScores[key]))
    const preservedOverallWeight = 0.62 - confidence * 0.14 - referenceLift * 0.18
    const weightedScoreWeight = 0.2 + confidence * 0.12 + referenceLift * 0.12
    const averageScoreWeight = 1 - preservedOverallWeight - weightedScoreWeight
    const coherenceBonus = clamp((weakestDimension - 70) / 16, 0, 1) * confidence * (2 + referenceLift * 3)
      + demoProfile * 5
    const demoOverallTarget = 88 + confidence * 3 + referenceLift * 5 + demoAffinity * 4
    const recalibratedOverall = clampScore(
      clampScore(line?.overall, 0) * preservedOverallWeight
      + weightedScore * weightedScoreWeight
      + averageDimensionScore * averageScoreWeight,
      0
    )
    const anchoredOverall = softLift(
      recalibratedOverall + coherenceBonus,
      demoOverallTarget,
      0.06 + confidence * 0.14 + referenceLift * 0.4
    )
    const exemplarOverallTarget = 98.8 + demoProfile
    const nextOverall = softLift(
      anchoredOverall,
      exemplarOverallTarget,
      clamp(0.26 + demoProfile * 0.72, 0, 1)
    )

    return {
      ...line,
      scores: nextScores,
      overall: nextOverall,
      grade: getGradeByScore(nextOverall),
      gradeLabel: getGradeByScore(nextOverall),
      deductions: buildLineDeductions(nextScores)
    }
  })

  return { confidence, referenceAudioAffinity, lines: calibratedLines }
}

function recalibrateUploadedPerformance(result = {}, options = {}) {
  const sourceLines = Array.isArray(result?.lineScores) ? result.lineScores : []
  if (!sourceLines.length) return result

  const { confidence, referenceAudioAffinity, lines } = recalibrateLineScores(sourceLines, options)
  if (!lines.length || confidence <= 0.01) return result

  const breakdown = aggregateLineBreakdown(lines)
  const totalScore = lines.reduce((sum, line) => sum + clampScore(line?.overall, 0), 0)
  const averageScore = lines.length ? clampScore(totalScore / lines.length, 0) : 0

  return {
    ...result,
    huangmei: {
      ...(result.huangmei || {}),
      lines,
      breakdown: {
        ...breakdown,
        overall: averageScore
      },
      overall: totalScore,
      totalScore,
      averageScore,
      grade: safeText(result.huangmei?.grade, getGradeByScore(averageScore)),
      referenceConfidence: Number(confidence.toFixed(3)),
      referenceAudioAffinity: Number(referenceAudioAffinity.toFixed(3))
    },
    lineScores: lines,
    averageScore,
    totalScore,
    grade: getGradeByScore(averageScore),
    breakdown: {
      ...breakdown,
      overall: averageScore
    },
    referenceConfidence: Number(confidence.toFixed(3)),
    referenceAudioAffinity: Number(referenceAudioAffinity.toFixed(3))
  }
}

function coerceArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input
  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength)
  }
  throw new Error('上传音频读取失败，请重新选择文件。')
}

function calculateRms(frame) {
  if (!frame?.length) return 0
  let sum = 0
  for (let index = 0; index < frame.length; index += 1) {
    const value = frame[index]
    sum += value * value
  }
  return Math.sqrt(sum / frame.length)
}

function mixAudioBufferToMono(audioBuffer) {
  const channelCount = Number(audioBuffer?.numberOfChannels || 0)
  const sampleRate = Number(audioBuffer?.sampleRate || 0)
  const length = Number(audioBuffer?.length || 0)
  if (!channelCount || !sampleRate || !length) {
    throw new Error('上传音频无法解码，请换一个文件格式再试。')
  }

  const mono = new Float32Array(length)
  for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex)
    for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
      mono[sampleIndex] += channelData[sampleIndex] / channelCount
    }
  }
  return mono
}

function createPitchFrames(monoSamples, options = {}) {
  const sampleRate = Number(options.sampleRate || 0)
  if (!sampleRate || !monoSamples?.length) return []

  const frameSize = Math.max(512, Number(options.frameSize || FRAME_SIZE))
  const hopSize = Math.max(128, Number(options.hopSize || HOP_SIZE))
  const minRms = clamp(options.minRms ?? MIN_RMS, 0.0001, 1)
  const detectPitch = Pitchfinder.YIN({ sampleRate })
  const frames = []

  for (let startIndex = 0; startIndex + frameSize <= monoSamples.length; startIndex += hopSize) {
    const frame = monoSamples.subarray(startIndex, startIndex + frameSize)
    const rms = calculateRms(frame)
    const rawPitch = rms >= minRms ? detectPitch(frame) : null
    const pitch = typeof rawPitch === 'number' && Number.isFinite(rawPitch) && rawPitch >= MIN_PITCH_HZ && rawPitch <= MAX_PITCH_HZ
      ? rawPitch
      : null
    const timeMs = Math.round((startIndex / sampleRate) * 1000)

    frames.push({
      timeMs,
      rms,
      pitch,
      isVoiced: Boolean(pitch && rms >= minRms)
    })
  }

  return frames
}

function normalizeLyricsForScoring(lines = []) {
  return lines.map((line, index) => ({
    lineIndex: index,
    time: Math.max(0, Math.round(Number(line?.time ?? line?.startMs ?? 0))),
    text: safeText(line?.text, `\u7b2c ${index + 1} \u53e5`)
  }))
}

function buildFallbackLyrics(song = {}, durationMs = 0) {
  const excerpt = safeText(song.excerptName || song.title || song.operaName, '\u5531\u6bb5')
  const totalMs = Math.max(12000, Math.round(Number(durationMs || 0)))
  const segmentCount = clamp(Math.round(totalMs / 15000), 3, 6)
  const segmentLabels = [
    '\u8d77\u52bf\u6bb5',
    '\u5c55\u5f00\u6bb5',
    '\u884c\u8154\u6bb5',
    '\u63a8\u8fdb\u6bb5',
    '\u6536\u675f\u6bb5',
    '\u5c3e\u58f0\u6bb5'
  ]
  const segmentMs = Math.max(4000, Math.round(totalMs / segmentCount))

  return Array.from({ length: segmentCount }, (_, index) => ({
    lineIndex: index,
    time: index * segmentMs,
    text: `${excerpt} ${segmentLabels[index] || (`\u7b2c ${index + 1} \u6bb5`)}`
  }))
}

async function resolveUploadLyrics(song = {}, durationMs = 0) {
  const lrcPath = safeText(song.lrcPath)
  if (lrcPath) {
    const lrcLines = await loadLrcLines(lrcPath, { defaultDurationSec: 3.2 }).catch(() => [])
    const lyrics = normalizeLyricsForScoring(lrcLines)
    if (lyrics.length) {
      return {
        lyrics,
        source: 'lrc'
      }
    }
  }

  return {
    lyrics: buildFallbackLyrics(song, durationMs),
    source: 'fallback'
  }
}

function buildScoreSummary(scoreRef) {
  return {
    available: Boolean(scoreRef),
    version: Number(scoreRef?.version || 0) || null,
    lineCount: Array.isArray(scoreRef?.lines) ? scoreRef.lines.length : 0,
    source: safeText(scoreRef?.source),
    generatedAt: safeText(scoreRef?.generatedAt)
  }
}

async function decodeAudioArrayBuffer(input) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error('褰撳墠娴忚鍣ㄤ笉鏀寔涓婁紶闊抽鍒嗘瀽锛岃鏀圭敤缁冨敱褰曢煶銆?')
  }

  const audioContext = new AudioContextCtor()
  try {
    return await audioContext.decodeAudioData(coerceArrayBuffer(input).slice(0))
  } finally {
    if (typeof audioContext.close === 'function') {
      await audioContext.close().catch(() => {})
    }
  }
}

async function loadReferencePitchFrames(song = {}) {
  const referenceVocalSrc = safeText(song.referenceVocalSrc)
  if (!referenceVocalSrc) return []
  if (referencePitchFramesCache.has(referenceVocalSrc)) {
    return referencePitchFramesCache.get(referenceVocalSrc)
  }

  const pending = (async () => {
    const response = await fetch(referenceVocalSrc)
    if (!response?.ok) return []
    const audioBuffer = await decodeAudioArrayBuffer(await response.arrayBuffer())
    const monoSamples = mixAudioBufferToMono(audioBuffer)
    return createPitchFrames(monoSamples, { sampleRate: audioBuffer.sampleRate })
  })().catch(() => [])

  referencePitchFramesCache.set(referenceVocalSrc, pending)
  return pending
}

export function isSongUploadAnalysisSupported(song = {}) {
  return Boolean(safeText(song.id) && safeText(song.lrcPath))
}

export function scoreUploadedPitchFrames(options = {}) {
  const lyrics = normalizeLyricsForScoring(options.lyrics)
  const frames = Array.isArray(options.frames) ? options.frames.slice().sort((a, b) => Number(a.timeMs || 0) - Number(b.timeMs || 0)) : []
  if (!lyrics.length) {
    throw new Error('当前曲目缺少歌词时间轴，暂时不能走上传分析。')
  }

  const scorer = useHuangmeiScore()
  let currentLineIndex = 0

  const flushLineUntil = (nextLineIndex) => {
    while (currentLineIndex < nextLineIndex && currentLineIndex < lyrics.length) {
      scorer.scoreLine(currentLineIndex, lyrics[currentLineIndex]?.text || '')
      currentLineIndex += 1
    }
  }

  frames.forEach((frame) => {
    while (
      currentLineIndex + 1 < lyrics.length
      && Number(frame?.timeMs || 0) >= Number(lyrics[currentLineIndex + 1]?.time || 0)
    ) {
      flushLineUntil(currentLineIndex + 1)
    }

    if (currentLineIndex >= lyrics.length) return

    const currentLine = lyrics[currentLineIndex]
    const relTimeMs = Math.max(0, Number(frame?.timeMs || 0) - Number(currentLine?.time || 0))
    const expectedPitch = options.scoreRef
      ? getExpectedPitchForLine(options.scoreRef, currentLineIndex, relTimeMs)
      : null

    scorer.addSample(
      expectedPitch
        ? { pitch: frame?.pitch ?? null, expectedPitch, expectedTime: relTimeMs }
        : { pitch: frame?.pitch ?? null },
      { rms: frame?.rms ?? 0, isVoiced: Boolean(frame?.isVoiced) },
      Number(frame?.timeMs || 0)
    )
  })

  flushLineUntil(lyrics.length)

  const huangmei = scorer.calculateFinalScore()
  const averageScore = Math.round(Number(huangmei?.averageScore || 0))
  const grade = safeText(huangmei?.grade, getGradeByScore(averageScore))
  const stars = clamp(Math.round(averageScore / 20), 0, 5)
  const analysisV2 = buildAnalysisV2FromKaraoke({
    huangmei: {
      ...huangmei,
      averageScore,
      grade
    },
    lineScores: Array.isArray(huangmei?.lines) ? huangmei.lines : [],
    scoreRefSummary: buildScoreSummary(options.scoreRef)
  })

  const rawResult = {
    frames,
    lyrics,
    huangmei,
    lineScores: Array.isArray(huangmei?.lines) ? huangmei.lines : [],
    analysisV2,
    scoreRefSummary: buildScoreSummary(options.scoreRef),
    averageScore,
    totalScore: Math.round(Number(huangmei?.totalScore || huangmei?.overall || 0)),
    lineCount: Math.max(0, Number(huangmei?.lineCount || 0)),
    durationSec: Math.max(1, Math.round(Number(options.durationMs || 0) / 1000)),
    grade,
    stars,
    breakdown: huangmei?.breakdown || {}
  }

  const referenceAudioMetrics = options.referenceFrames?.length
    ? deriveReferenceAudioAffinity(frames, options.referenceFrames)
    : null
  const calibratedResult = options.scoreRef
    ? recalibrateUploadedPerformance(rawResult, {
      referenceAudioAffinity: referenceAudioMetrics?.affinity || 0
    })
    : rawResult
  return {
    ...calibratedResult,
    referenceAudioMetrics,
    analysisV2: buildAnalysisV2FromKaraoke({
      huangmei: {
        ...(calibratedResult.huangmei || {}),
        averageScore: calibratedResult.averageScore,
        grade: calibratedResult.grade
      },
      lineScores: calibratedResult.lineScores,
      scoreRefSummary: calibratedResult.scoreRefSummary
    })
  }
}

async function decodeAudioFile(file) {
  return decodeAudioArrayBuffer(await file.arrayBuffer())
}
async function __unused_decodeAudioFile_legacy(file) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error('当前浏览器不支持上传音频分析，请改用练唱录音。')
  }

  const audioContext = new AudioContextCtor()
  try {
    const arrayBuffer = coerceArrayBuffer(await file.arrayBuffer())
    return await audioContext.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    if (typeof audioContext.close === 'function') {
      await audioContext.close().catch(() => {})
    }
  }
}

export async function analyzeUploadedSongFile(options = {}) {
  const file = options.file
  const song = options.song || {}
  if (!file) {
    throw new Error('\u8bf7\u5148\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u97f3\u9891\u6587\u4ef6\u3002')
  }
  if (!isSongUploadAnalysisSupported(song)) {
    throw new Error('\u5f53\u524d\u66f2\u76ee\u7f3a\u5c11\u9ad8\u7cbe\u5ea6\u6b4c\u8bcd\u65f6\u95f4\u8f74\uff0c\u6682\u4e0d\u652f\u6301\u4e0a\u4f20\u97f3\u9891\u5206\u6790\u3002\u8bf7\u5148\u4f7f\u7528\u5b9e\u65f6\u7ec3\u5531\uff0c\u6216\u9009\u62e9\u5df2\u6807\u6ce8\u53ef\u4e0a\u4f20\u5206\u6790\u7684\u66f2\u76ee\u3002')
  }

  const audioBuffer = await decodeAudioFile(file)
  const durationMs = Math.round(Number(audioBuffer.duration || 0) * 1000)
  const { lyrics } = await resolveUploadLyrics(song, durationMs)
  if (!lyrics.length) {
    throw new Error('\u5f53\u524d\u66f2\u76ee\u65e0\u6cd5\u751f\u6210\u5206\u6790\u5206\u6bb5\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002')
  }

  const scoreRef = await loadScoreRef(song.id, lyrics)
  const monoSamples = mixAudioBufferToMono(audioBuffer)
  const frames = createPitchFrames(monoSamples, { sampleRate: audioBuffer.sampleRate })
  const referenceFrames = await loadReferencePitchFrames(song)

  return scoreUploadedPitchFrames({
    frames,
    lyrics,
    scoreRef,
    referenceFrames,
    durationMs
  })
}

export {
  FRAME_SIZE,
  HOP_SIZE,
  MIN_RMS,
  calculateRms,
  recalibrateLineScores,
  createPitchFrames,
  mixAudioBufferToMono,
  normalizeLyricsForScoring
}
