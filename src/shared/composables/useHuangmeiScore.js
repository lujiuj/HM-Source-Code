import { ref, reactive, computed } from 'vue'
import { getGradeByScore } from '../utils/grades.js'

const weights = {
  pitch: 0.42,
  rhythm: 0.16,
  articulation: 0.14,
  style: 0.12,
  breath: 0.08,
  emotion: 0.08
}

const dimensionLabels = {
  pitch: '音准',
  rhythm: '节奏',
  articulation: '咬字',
  style: '韵味',
  breath: '气息',
  emotion: '情感'
}

const gradeLabels = {
  SSS: '宗师',
  SS: '名家',
  S: '高手',
  A: '优秀',
  B: '良好',
  C: '加油'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mean(values) {
  if (!values.length) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function std(values, avg = null) {
  if (!values.length) return 0
  const mu = avg === null ? mean(values) : avg
  const variance = mean(values.map((v) => (v - mu) ** 2))
  return Math.sqrt(variance)
}

function toCents(pitch) {
  if (!pitch || pitch <= 0) return null
  return 1200 * Math.log2(pitch / 440)
}

function centsDiff(a, b) {
  if (!a || !b || a <= 0 || b <= 0) return null
  return 1200 * Math.log2(a / b)
}

function gaussianScore(value, sigma) {
  return Math.exp(-0.5 * (value / sigma) ** 2) * 100
}

function encouragingPitchAccuracy(diffCents) {
  const diff = Math.max(0, Number(diffCents) || 0)
  // “鼓励型”音准映射：小偏差给满分，大偏差逐级拉开。
  if (diff <= 65) return 100
  if (diff <= 100) return 99 - (diff - 65) * 0.32
  if (diff <= 150) return 88 - (diff - 100) * 0.18
  if (diff <= 220) return 79 - (diff - 150) * 0.2
  if (diff <= 320) return 65 - (diff - 220) * 0.16
  if (diff <= 420) return 49 - (diff - 320) * 0.13
  return Math.max(18, 36 - (diff - 420) * 0.05)
}

function rangeScore(value, min, max, falloff) {
  if (value >= min && value <= max) return 100
  if (value < min) return gaussianScore(min - value, falloff)
  return gaussianScore(value - max, falloff)
}

function pearsonCorrelation(xs, ys) {
  if (xs.length !== ys.length || xs.length === 0) return 0
  const avgX = mean(xs)
  const avgY = mean(ys)
  const dx = xs.map((x) => x - avgX)
  const dy = ys.map((y) => y - avgY)
  const numerator = dx.reduce((sum, v, i) => sum + v * dy[i], 0)
  const denom = Math.sqrt(dx.reduce((sum, v) => sum + v ** 2, 0) * dy.reduce((sum, v) => sum + v ** 2, 0))
  if (!denom) return 0
  return clamp(numerator / denom, -1, 1)
}

function getGradeInfo(score) {
  const grade = getGradeByScore(score)
  return { grade, label: gradeLabels[grade] || grade }
}

function normalizeSample(pitchData, volumeData, timestamp) {
  const pitch = typeof pitchData === 'number' ? pitchData : pitchData?.pitch ?? null
  const expectedPitch = typeof pitchData === 'object' ? pitchData.expectedPitch ?? pitchData.refPitch ?? null : null
  const pitchConfidence = typeof pitchData === 'object' ? pitchData.confidence ?? null : null
  const expectedTime = typeof pitchData === 'object' ? pitchData.expectedTime ?? null : null
  const expectedTimestamp = typeof pitchData === 'object' ? pitchData.expectedTimestamp ?? null : null
  const rms = typeof volumeData === 'number' ? volumeData : volumeData?.rms ?? volumeData?.energy ?? null
  const clarity = typeof volumeData === 'object' ? volumeData.clarity ?? null : null
  const noise = typeof volumeData === 'object' ? volumeData.noise ?? null : null
  const isVoiced = typeof volumeData === 'object'
    ? volumeData.isVoiced ?? (pitch !== null && pitch > 0)
    : pitch !== null && pitch > 0

  return {
    time: timestamp,
    pitch,
    expectedPitch,
    expectedTime,
    expectedTimestamp,
    pitchConfidence: pitchConfidence ?? 1,
    rms: rms ?? 0,
    clarity: clarity ?? null,
    noise: noise ?? null,
    isVoiced: Boolean(isVoiced)
  }
}

function computePitchScore(samples) {
  const voiced = samples.filter((s) => s.isVoiced && s.pitch)
  if (!voiced.length) return 38
  const withExpected = voiced.filter((s) => s.expectedPitch)
  let accuracyScore = 0
  let contourScore = 0

  if (withExpected.length) {
    // Allow a small key shift: if user整体偏高/偏低但“跟着旋律走”，仍应给鼓励分。
    const rawDiffs = withExpected
      .map((s) => centsDiff(s.pitch, s.expectedPitch))
      .filter((v) => typeof v === 'number' && Number.isFinite(v))
      .map((v) => clamp(v, -600, 600))
    const keyShift = rawDiffs.length >= 8
      ? clamp(median(rawDiffs), -240, 240)
      : clamp(mean(rawDiffs), -200, 200)

    const accuracyValues = withExpected.map((s) => {
      const diff = Math.abs((centsDiff(s.pitch, s.expectedPitch) || 0) - keyShift)
      const conf = clamp(s.pitchConfidence ?? 1, 0.2, 1)
      // 先给“唱在附近”的鼓励分，再拉开明显跑调的差距
      return encouragingPitchAccuracy(diff || 0) * conf
    })
    accuracyScore = mean(accuracyValues)

    const detectedCents = withExpected.map((s) => toCents(s.pitch))
    const expectedCents = withExpected.map((s) => toCents(s.expectedPitch))
    const detectedSlope = detectedCents.slice(1).map((v, i) => v - detectedCents[i])
    const expectedSlope = expectedCents.slice(1).map((v, i) => v - expectedCents[i])
    const corr = pearsonCorrelation(detectedSlope, expectedSlope)
    contourScore = (corr + 1) * 50
  } else {
    const cents = voiced.map((s) => toCents(s.pitch)).filter((v) => v !== null)
    const center = median(cents)
    const jitter = std(cents, center)
    accuracyScore = clamp(100 - jitter * 0.8, 50, 95)
    contourScore = clamp(100 - std(cents) * 0.5, 40, 90)
  }

  return clamp(accuracyScore * 0.7 + contourScore * 0.3, 0, 100)
}

function computeRhythmScore(samples, lineStartTime) {
  if (!samples.length) return 0
  const withExpected = samples.filter((s) => s.expectedTime !== null || s.expectedTimestamp !== null)
  let expectedScore = 0

  if (withExpected.length) {
    const errors = withExpected.map((s) => {
      const expected = s.expectedTimestamp !== null
        ? s.expectedTimestamp
        : lineStartTime + s.expectedTime
      return Math.abs(s.time - expected)
    })
    // 节奏容错进一步扩大（毫秒）
    expectedScore = mean(errors.map((err) => gaussianScore(err, 520)))
  }

  const onsetTimes = []
  let prevVoiced = false
  for (const s of samples) {
    if (s.isVoiced && !prevVoiced) onsetTimes.push(s.time)
    prevVoiced = s.isVoiced
  }
  const intervals = onsetTimes.slice(1).map((t, i) => t - onsetTimes[i])
  const intervalMean = mean(intervals)
  const intervalStd = std(intervals, intervalMean)
  const stability = intervalMean ? clamp(100 - (intervalStd / intervalMean) * 120, 40, 100) : 60

  if (!withExpected.length) return stability
  return clamp(expectedScore * 0.7 + stability * 0.3, 0, 100)
}

function computeArticulationScore(samples) {
  if (!samples.length) return 0
  const segments = []
  let current = []
  for (const s of samples) {
    if (s.isVoiced) {
      current.push(s)
    } else if (current.length) {
      segments.push(current)
      current = []
    }
  }
  if (current.length) segments.push(current)

  if (!segments.length) return 0

  const attackScores = []
  const releaseScores = []
  const clarityScores = []

  for (const segment of segments) {
    const rmsValues = segment.map((s) => s.rms ?? 0)
    const peak = Math.max(...rmsValues, 0.001)
    const attackIndex = rmsValues.findIndex((v) => v >= peak * 0.7)
    const releaseIndex = rmsValues.length - 1 - [...rmsValues].reverse().findIndex((v) => v >= peak * 0.7)
    const attackTime = attackIndex > 0 ? segment[attackIndex].time - segment[0].time : 0
    const releaseTime = releaseIndex < segment.length - 1
      ? segment[segment.length - 1].time - segment[releaseIndex].time
      : 0

    attackScores.push(rangeScore(attackTime, 20, 90, 80))
    releaseScores.push(rangeScore(releaseTime, 30, 120, 100))

    const clarity = segment.map((s) => {
      if (s.clarity !== null && s.clarity !== undefined) return clamp(s.clarity, 0, 1) * 100
      if (s.noise !== null && s.noise !== undefined) return clamp(1 - s.noise, 0, 1) * 100
      return clamp((s.rms ?? 0) * 100, 40, 95)
    })
    clarityScores.push(mean(clarity))
  }

  return clamp(mean(attackScores) * 0.4 + mean(releaseScores) * 0.2 + mean(clarityScores) * 0.4, 0, 100)
}

function computeStyleScore(samples, lineText) {
  const voiced = samples.filter((s) => s.isVoiced && s.pitch)
  if (voiced.length < 4) return 0

  const times = voiced.map((s) => s.time)
  const pitches = voiced.map((s) => toCents(s.pitch))
  const avgStep = mean(times.slice(1).map((t, i) => t - times[i])) || 20

  const diffs = pitches.slice(1).map((v, i) => v - pitches[i])
  const signChanges = diffs.slice(1).filter((v, i) => Math.sign(v) !== Math.sign(diffs[i]) && Math.abs(v) > 1).length
  const vibratoRate = signChanges > 0 ? (signChanges / 2) / ((times[times.length - 1] - times[0]) / 1000) : 0
  const depth = std(pitches, mean(pitches))
  const ornamentJumps = diffs.filter((v) => Math.abs(v) > 80).length
  const ornamentRate = ornamentJumps / ((times[times.length - 1] - times[0]) / 1000)

  const isHuqiang = /花腔|彩腔|滚腔|快板|流水/.test(lineText || '')
  const vibratoScore = isHuqiang
    ? rangeScore(vibratoRate, 5, 9, 3)
    : rangeScore(vibratoRate, 4, 7, 2.5)
  const depthScore = isHuqiang
    ? rangeScore(depth, 45, 120, 40)
    : rangeScore(depth, 20, 60, 25)
  const ornamentScore = isHuqiang
    ? rangeScore(ornamentRate, 1.8, 4.5, 1.2)
    : rangeScore(ornamentRate, 0.2, 1.2, 0.8)

  const stability = clamp(100 - std(diffs) * 0.4, 50, 95)
  return clamp(vibratoScore * 0.35 + depthScore * 0.25 + ornamentScore * 0.25 + stability * 0.15, 0, 100)
}

function computeBreathScore(samples, lineText) {
  if (!samples.length) return 0
  const duration = samples[samples.length - 1].time - samples[0].time
  if (duration <= 0) return 0

  const voiced = samples.filter((s) => s.isVoiced)
  const voicedDuration = voiced.length ? voiced[voiced.length - 1].time - voiced[0].time : 0
  const voicedRatio = duration ? voicedDuration / duration : 0

  let breaks = 0
  let currentSilenceStart = null
  for (const s of samples) {
    if (!s.isVoiced) {
      if (currentSilenceStart === null) currentSilenceStart = s.time
    } else if (currentSilenceStart !== null) {
      const silenceDuration = s.time - currentSilenceStart
      if (silenceDuration >= 120) breaks += 1
      currentSilenceStart = null
    }
  }

  const punctuation = (lineText || '').match(/[，、；。！？]/g) || []
  const expectedBreaks = Math.max(1, punctuation.length)
  const breakDiff = Math.abs(breaks - expectedBreaks)
  const breakScore = clamp(100 - breakDiff * 18, 40, 100)

  const sustainability = clamp(60 + voicedRatio * 40, 40, 100)
  return clamp(sustainability * 0.6 + breakScore * 0.4, 0, 100)
}

function computeEmotionScore(samples) {
  if (!samples.length) return 0
  const rmsValues = samples.map((s) => s.rms ?? 0)
  const maxRms = Math.max(...rmsValues, 0.0001)
  const minRms = Math.max(Math.min(...rmsValues), 0.0001)
  const dynamicRange = 20 * Math.log10(maxRms / minRms)
  const rangeScoreValue = rangeScore(dynamicRange, 12, 28, 8)

  const rmsMean = mean(rmsValues)
  const rmsStd = std(rmsValues, rmsMean)
  const variability = rmsMean ? clamp(100 - Math.abs((rmsStd / rmsMean) - 0.35) * 140, 40, 100) : 50

  const pitchValues = samples.filter((s) => s.isVoiced && s.pitch).map((s) => toCents(s.pitch))
  const pitchRange = pitchValues.length ? Math.max(...pitchValues) - Math.min(...pitchValues) : 0
  const pitchRangeScore = rangeScore(pitchRange, 140, 420, 120)

  return clamp(rangeScoreValue * 0.4 + variability * 0.3 + pitchRangeScore * 0.3, 0, 100)
}

function computeWeightedOverall(scores) {
  return Object.keys(weights).reduce((sum, key) => sum + scores[key] * weights[key], 0)
}

function relaxLineOverall(rawOverall, sampleCount, extras = {}) {
  const raw = clamp(rawOverall, 0, 100)
  if (!sampleCount || sampleCount <= 0) return 0

  const voiceRatio = clamp(Number(extras.voiceRatio || 0), 0, 1)
  const pitchScore = clamp(Number(extras.pitchScore || 0), 0, 100)

  // 评分体验目标：
  // 1) 用户“基本唱在点上”能得到更明显鼓励；
  // 2) 完全没唱/明显跑调仍会被拉开；
  // 3) 高分段继续保留可冲空间。
  // Overall curve tuned for “鼓励型”分布：更接近 K 歌产品手感。
  // 评分体验目标（鼓励向上调整版）：
  // 1) 基本唱在调上 → 轻松拿80+
  // 2) 唱得不错 → 90+
  // 3) 完全没唱/严重跑调才明显扣分
  let adjusted = raw * 0.52 + 56

  if (voiceRatio < 0.1) adjusted -= 26
  else if (voiceRatio < 0.2) adjusted -= 12
  else if (voiceRatio < 0.32) adjusted -= 3
  else if (voiceRatio < 0.42) adjusted += 6
  else if (voiceRatio < 0.55) adjusted += 11
  else adjusted += 15

  if (pitchScore < 30) adjusted -= 18
  else if (pitchScore < 45) adjusted -= 6
  else if (pitchScore < 58) adjusted += 2
  else if (pitchScore < 72) adjusted += 10
  else if (pitchScore < 84) adjusted += 14
  else adjusted += 18

  if (sampleCount > 18 && voiceRatio > 0.36) {
    adjusted = Math.max(adjusted, 74)
  }
  if (sampleCount > 26 && voiceRatio > 0.38 && pitchScore > 54) {
    adjusted = Math.max(adjusted, 82)
  }
  if (sampleCount > 30 && voiceRatio > 0.42 && pitchScore > 76) {
    adjusted = Math.max(adjusted, 88)
  }

  if (raw >= 90 && pitchScore >= 84) adjusted += 3
  if (pitchScore < 42) adjusted = Math.min(adjusted, 82)

  return Math.round(clamp(adjusted, 0, 100))
}

function buildDeductions(lineScoresValue) {
  const deductions = []
  if (!lineScoresValue) return deductions

  if (lineScoresValue.pitch < 70) deductions.push('音准偏差较大（尽量贴近主旋律）')
  if (lineScoresValue.rhythm < 70) deductions.push('节奏跟随不稳（注意起音和停顿）')
  if (lineScoresValue.breath < 70) deductions.push('气息不够连贯（注意换气位置）')
  if (lineScoresValue.articulation < 70) deductions.push('咬字不够清晰（尝试更利落的起收音）')
  if (lineScoresValue.style < 70) deductions.push('韵味不足（可尝试揉腔/装饰音的处理）')
  if (lineScoresValue.emotion < 70) deductions.push('情感表达偏平（注意强弱变化）')

  return deductions
}

export function useHuangmeiScore() {
  const samples = ref([])
  const lineScores = ref([])
  const overallBreakdown = reactive({
    pitch: 0,
    rhythm: 0,
    articulation: 0,
    style: 0,
    breath: 0,
    emotion: 0,
    overall: 0
  })
  const totalSamples = ref(0)
  const lineSampleBuffer = ref([])
  const lineStartTime = ref(null)

  const overallGrade = computed(() => getGradeInfo(overallBreakdown.overall))

  function addSample(pitchData, volumeData, timestamp = Date.now()) {
    const normalized = normalizeSample(pitchData, volumeData, timestamp)
    samples.value.push(normalized)
    lineSampleBuffer.value.push(normalized)
    totalSamples.value += 1
    if (lineStartTime.value === null) lineStartTime.value = normalized.time
    return normalized
  }

  function scoreLine(lineIndex, lineText = '') {
    const lineSamples = lineSampleBuffer.value
    if (!lineSamples.length) {
      const baseline = 46
      const gradeInfo = getGradeInfo(baseline)
      const emptyResult = {
        lineIndex,
        lineText,
        scores: {
          pitch: 38,
          rhythm: 42,
          articulation: 43,
          style: 42,
          breath: 38,
          emotion: 42,
        },
        overall: baseline,
        grade: gradeInfo.grade,
        gradeLabel: gradeInfo.label,
        labels: dimensionLabels,
        deductions: ['未检测到稳定人声，已按基础完成度计分'],
        sampleCount: 0,
        durationMs: 0
      }
      lineScores.value.push(emptyResult)
      return emptyResult
    }

    const startTime = lineStartTime.value ?? lineSamples[0].time
    const lineScoresValue = {
      pitch: computePitchScore(lineSamples),
      rhythm: computeRhythmScore(lineSamples, startTime),
      articulation: computeArticulationScore(lineSamples),
      style: computeStyleScore(lineSamples, lineText),
      breath: computeBreathScore(lineSamples, lineText),
      emotion: computeEmotionScore(lineSamples)
    }
    const rawOverall = computeWeightedOverall(lineScoresValue)
    const voicedCount = lineSamples.filter((s) => s.isVoiced).length
    const voiceRatio = lineSamples.length ? (voicedCount / lineSamples.length) : 0
    const overall = relaxLineOverall(rawOverall, lineSamples.length, {
      voiceRatio,
      pitchScore: lineScoresValue.pitch
    })
    const gradeInfo = getGradeInfo(overall)

    const result = {
      lineIndex,
      lineText,
      scores: lineScoresValue,
      overall,
      grade: gradeInfo.grade,
      gradeLabel: gradeInfo.label,
      labels: dimensionLabels,
      deductions: buildDeductions(lineScoresValue),
      sampleCount: lineSamples.length,
      durationMs: lineSamples[lineSamples.length - 1].time - lineSamples[0].time
    }

    lineScores.value.push(result)
    lineSampleBuffer.value = []
    lineStartTime.value = null
    return result
  }

  function calculateFinalScore() {
    if (!lineScores.value.length && samples.value.length) {
      scoreLine(lineScores.value.length, '')
    }

    if (!lineScores.value.length) {
      overallBreakdown.pitch = 0
      overallBreakdown.rhythm = 0
      overallBreakdown.articulation = 0
      overallBreakdown.style = 0
      overallBreakdown.breath = 0
      overallBreakdown.emotion = 0
      overallBreakdown.overall = 0
      return {
        breakdown: { ...overallBreakdown },
        overall: 0,
        totalScore: 0,
        averageScore: 0,
        maxTotalScore: 0,
        lineCount: 0,
        grade: 'C',
        gradeLabel: gradeLabels.C,
        labels: dimensionLabels,
        deductions: ['未检测到有效人声'],
        lines: []
      }
    }

    const totals = {
      pitch: 0,
      rhythm: 0,
      articulation: 0,
      style: 0,
      breath: 0,
      emotion: 0
    }
    let totalWeight = 0

    for (const line of lineScores.value) {
      const weight = line.sampleCount || 1
      totalWeight += weight
      totals.pitch += line.scores.pitch * weight
      totals.rhythm += line.scores.rhythm * weight
      totals.articulation += line.scores.articulation * weight
      totals.style += line.scores.style * weight
      totals.breath += line.scores.breath * weight
      totals.emotion += line.scores.emotion * weight
    }

    overallBreakdown.pitch = Math.round(totals.pitch / totalWeight)
    overallBreakdown.rhythm = Math.round(totals.rhythm / totalWeight)
    overallBreakdown.articulation = Math.round(totals.articulation / totalWeight)
    overallBreakdown.style = Math.round(totals.style / totalWeight)
    overallBreakdown.breath = Math.round(totals.breath / totalWeight)
    overallBreakdown.emotion = Math.round(totals.emotion / totalWeight)
    const lineCount = lineScores.value.length
    const totalScore = lineScores.value.reduce((sum, line) => {
      const score = Number.isFinite(line?.overall) ? line.overall : 0
      return sum + Math.max(0, Math.min(100, Math.round(score)))
    }, 0)
    const averageScore = lineCount > 0 ? Math.round(totalScore / lineCount) : 0
    overallBreakdown.overall = averageScore

    const gradeInfo = getGradeInfo(averageScore)
    return {
      breakdown: { ...overallBreakdown },
      overall: totalScore,
      totalScore,
      averageScore,
      maxTotalScore: lineCount * 100,
      lineCount,
      grade: gradeInfo.grade,
      gradeLabel: gradeInfo.label,
      labels: dimensionLabels,
      deductions: buildDeductions(overallBreakdown),
      lines: lineScores.value
    }
  }

  function reset() {
    samples.value = []
    lineScores.value = []
    lineSampleBuffer.value = []
    totalSamples.value = 0
    lineStartTime.value = null
    overallBreakdown.pitch = 0
    overallBreakdown.rhythm = 0
    overallBreakdown.articulation = 0
    overallBreakdown.style = 0
    overallBreakdown.breath = 0
    overallBreakdown.emotion = 0
    overallBreakdown.overall = 0
  }

  return {
    samples,
    lineScores,
    totalSamples,
    overallBreakdown,
    overallGrade,
    labels: dimensionLabels,
    addSample,
    scoreLine,
    calculateFinalScore,
    reset
  }
}
