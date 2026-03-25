import Pitchfinder from 'pitchfinder'
import { frequencyToNote, PitchSmoother } from './usePitchDetection'

const DEFAULT_ANALYZER_OPTIONS = {
  targetSampleRate: null,
  frameSize: 2048,
  hopSize: 512,
  minPitch: 50,
  maxPitch: 2000,
  minVolume: 0.01,
  silenceDb: -45,
  pitchSmoothingWindow: 5,
  noteChangeThresholdCents: 80,
  minNoteDurationMs: 120,
  minSilenceDurationMs: 120,
  maxBreathDurationMs: 1200,
  breathFlatnessThreshold: 0.25,
  breathCentroidThreshold: 1800,
  beatMinIntervalMs: 250,
  beatThreshold: 1.5,
  spectralRolloffPercent: 0.85,
  vibratoMinCents: 6,
  glideMinStepCents: 4,
  glideMinTotalCents: 80,
  glideMinDurationMs: 120
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return value
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
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

function toDb(rms, floor = -120) {
  if (!rms || rms <= 0) return floor
  const db = 20 * Math.log10(rms)
  return Math.max(db, floor)
}

function toCents(frequency) {
  if (!frequency || frequency <= 0) return null
  return 1200 * Math.log2(frequency / 440)
}

function createHannWindow(size) {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
  }
  return window
}

function createBitReversalIndices(size) {
  const indices = new Uint32Array(size)
  const bits = Math.log2(size)
  for (let i = 0; i < size; i += 1) {
    let x = i
    let reversed = 0
    for (let bit = 0; bit < bits; bit += 1) {
      reversed = (reversed << 1) | (x & 1)
      x >>= 1
    }
    indices[i] = reversed
  }
  return indices
}

function createFftPlan(size) {
  return {
    size,
    window: createHannWindow(size),
    bitReversal: createBitReversalIndices(size),
    real: new Float32Array(size),
    imag: new Float32Array(size)
  }
}

function computeMagnitudeSpectrum(frame, sampleRate, plan, rolloffPercent) {
  const { size, window, bitReversal, real, imag } = plan
  for (let i = 0; i < size; i += 1) {
    const sample = frame[i] ?? 0
    real[i] = sample * window[i]
    imag[i] = 0
  }

  for (let i = 0; i < size; i += 1) {
    const j = bitReversal[i]
    if (j > i) {
      const temp = real[i]
      real[i] = real[j]
      real[j] = temp
    }
  }

  for (let len = 2; len <= size; len <<= 1) {
    const half = len / 2
    const angleStep = (-2 * Math.PI) / len
    for (let start = 0; start < size; start += len) {
      for (let offset = 0; offset < half; offset += 1) {
        const angle = angleStep * offset
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const evenIndex = start + offset
        const oddIndex = evenIndex + half
        const tre = real[oddIndex] * cos - imag[oddIndex] * sin
        const tim = real[oddIndex] * sin + imag[oddIndex] * cos
        const ure = real[evenIndex]
        const uim = imag[evenIndex]
        real[evenIndex] = ure + tre
        imag[evenIndex] = uim + tim
        real[oddIndex] = ure - tre
        imag[oddIndex] = uim - tim
      }
    }
  }

  const halfSize = size / 2
  const magnitude = new Float32Array(halfSize)
  let sum = 0
  for (let i = 0; i < halfSize; i += 1) {
    const mag = Math.hypot(real[i], imag[i])
    magnitude[i] = mag
    sum += mag
  }

  let centroid = 0
  if (sum > 0) {
    let weighted = 0
    for (let i = 0; i < halfSize; i += 1) {
      const frequency = (i * sampleRate) / size
      weighted += frequency * magnitude[i]
    }
    centroid = weighted / sum
  }

  let rolloff = 0
  if (sum > 0) {
    const threshold = sum * rolloffPercent
    let cumulative = 0
    for (let i = 0; i < halfSize; i += 1) {
      cumulative += magnitude[i]
      if (cumulative >= threshold) {
        rolloff = (i * sampleRate) / size
        break
      }
    }
  }

  let flatness = 0
  if (sum > 0) {
    let logSum = 0
    let count = 0
    for (let i = 0; i < halfSize; i += 1) {
      const value = magnitude[i]
      if (value > 0) {
        logSum += Math.log(value)
        count += 1
      }
    }
    if (count > 0) {
      const geoMean = Math.exp(logSum / count)
      const arithMean = sum / halfSize
      flatness = arithMean > 0 ? geoMean / arithMean : 0
    }
  }

  return {
    centroid,
    rolloff,
    flatness
  }
}

function calculateRms(frame) {
  let sum = 0
  for (let i = 0; i < frame.length; i += 1) {
    sum += frame[i] * frame[i]
  }
  return Math.sqrt(sum / frame.length)
}

function mixToMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer
  if (numberOfChannels === 1) {
    return audioBuffer.getChannelData(0)
  }
  const mix = new Float32Array(length)
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      mix[i] += data[i]
    }
  }
  for (let i = 0; i < length; i += 1) {
    mix[i] /= numberOfChannels
  }
  return mix
}

async function decodeAudioBuffer(arrayBuffer) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContextClass()
  try {
    return await audioContext.decodeAudioData(arrayBuffer)
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
    }
  }
}

async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
  if (!targetSampleRate || Math.round(audioBuffer.sampleRate) === Math.round(targetSampleRate)) {
    return audioBuffer
  }
  const length = Math.ceil(audioBuffer.duration * targetSampleRate)
  const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, length, targetSampleRate)
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineContext.destination)
  source.start(0)
  return await offlineContext.startRendering()
}

async function loadAudioBufferFromUrl(url, options) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load audio: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const decoded = await decodeAudioBuffer(arrayBuffer)
  return await resampleAudioBuffer(decoded, options.targetSampleRate)
}

function createEmptyResult() {
  const emptyPitchData = []
  emptyPitchData.sampleRate = 0
  emptyPitchData.statistics = {
    avgFrequency: 0,
    minFrequency: 0,
    maxFrequency: 0,
    pitchRange: 0,
    vibratoCount: 0,
    vibratoRate: 0,
    avgVibratoDepth: 0,
    pitchStability: 0,
    pitchChangeRate: 0
  }

  const emptyRhythmData = {
    bpm: 0,
    beats: [],
    tempoChanges: [],
    statistics: {
      avgBpm: 0,
      bpmStability: 0,
      rhythmComplexity: 0
    }
  }

  const emptyVolumeData = []
  emptyVolumeData.sampleRate = 0
  emptyVolumeData.statistics = {
    avgDb: 0,
    dynamicRange: 0,
    crescendos: [],
    diminuendos: []
  }

  const breathPoints = []
  const breathData = {
    breathPoints,
    longPhrases: [],
    statistics: {
      avgPhraseLength: 0,
      maxPhraseLength: 0,
      breathCount: 0,
      breathStability: 0
    }
  }

  const pitchSummary = {
    sampleRate: 0,
    data: emptyPitchData,
    statistics: emptyPitchData.statistics
  }

  const volumeSummary = {
    sampleRate: 0,
    data: emptyVolumeData,
    statistics: emptyVolumeData.statistics
  }

  return {
    pitchData: pitchSummary,
    rhythmData: emptyRhythmData,
    volumeData: volumeSummary,
    breathData,
    breathPoints,
    techniqueMarks: [],
    teachingPoints: [],
    statistics: {
      avgPitch: 0,
      pitchRange: 0,
      vibratoRate: 0,
      dynamicRange: 0,
      avgVolume: 0,
      breathCount: 0,
      pitchStability: 0,
      pitchChangeRate: 0,
      rhythmStability: 0,
      longToneDuration: 0,
      breathStability: 0,
      spectralCentroidAvg: 0,
      spectralRolloffAvg: 0
    }
  }
}

function extractNoteSegments(pitchData, options) {
  const segments = []
  let current = null

  for (const frame of pitchData) {
    if (!frame.frequency) {
      if (current) {
        const duration = current.endTime - current.startTime
        if (duration >= options.minNoteDurationMs) {
          segments.push({
            startTime: current.startTime,
            endTime: current.endTime,
            duration,
            note: current.note
          })
        }
        current = null
      }
      continue
    }

    const cents = toCents(frame.frequency)
    if (!current) {
      current = {
        startTime: frame.time,
        endTime: frame.time,
        note: frame.note,
        lastCents: cents
      }
      continue
    }

    const noteChanged = frame.note && current.note && frame.note !== current.note
    const centsDiff = cents !== null && current.lastCents !== null
      ? Math.abs(cents - current.lastCents)
      : 0
    if (noteChanged || centsDiff >= options.noteChangeThresholdCents) {
      const duration = current.endTime - current.startTime
      if (duration >= options.minNoteDurationMs) {
        segments.push({
          startTime: current.startTime,
          endTime: current.endTime,
          duration,
          note: current.note
        })
      }
      current = {
        startTime: frame.time,
        endTime: frame.time,
        note: frame.note,
        lastCents: cents
      }
    } else {
      current.endTime = frame.time
      current.lastCents = cents
    }
  }

  if (current) {
    const duration = current.endTime - current.startTime
    if (duration >= options.minNoteDurationMs) {
      segments.push({
        startTime: current.startTime,
        endTime: current.endTime,
        duration,
        note: current.note
      })
    }
  }

  return segments
}

function detectGlideSegments(pitchPoints, options) {
  const glides = []
  let startIndex = null
  let direction = null
  let lastCents = null

  const finalize = (endIndex) => {
    if (startIndex === null || endIndex <= startIndex) return
    const start = pitchPoints[startIndex]
    const end = pitchPoints[endIndex]
    if (!start || !end || start.cents === null || end.cents === null) return
    const duration = end.time - start.time
    const totalCents = end.cents - start.cents
    if (duration >= options.glideMinDurationMs && Math.abs(totalCents) >= options.glideMinTotalCents) {
      glides.push({
        startTime: start.time,
        endTime: end.time,
        duration,
        totalCents
      })
    }
  }

  for (let i = 0; i < pitchPoints.length; i += 1) {
    const frequency = pitchPoints[i].frequency
    const cents = frequency ? toCents(frequency) : null
    if (cents === null || cents === undefined) {
      finalize(i - 1)
      startIndex = null
      direction = null
      lastCents = null
      continue
    }

    if (lastCents === null) {
      lastCents = cents
      startIndex = i
      continue
    }

    const delta = cents - lastCents
    if (Math.abs(delta) < options.glideMinStepCents) {
      lastCents = cents
      continue
    }

    const stepDirection = Math.sign(delta)
    if (direction === null) {
      direction = stepDirection
      if (startIndex === null) startIndex = i - 1
    } else if (stepDirection !== direction) {
      finalize(i - 1)
      startIndex = i - 1
      direction = stepDirection
    }

    lastCents = cents
  }

  finalize(pitchPoints.length - 1)
  return glides
}

function buildTechniqueMarks(pitchPoints, noteSegments, vibratoRate, breathPoints, options) {
  const marks = []
  if (vibratoRate > 0) {
    const vibratoPoints = pitchPoints.filter((point) => point.hasVibrato)
    let lastTime = -Infinity
    for (const point of vibratoPoints) {
      if (point.time - lastTime < 400) continue
      marks.push({
        time: point.time / 1000,
        type: 'vibrato',
        description: '颤音段落',
        severity: Math.min(5, Math.max(2, Math.round(vibratoRate)))
      })
      lastTime = point.time
    }
  }

  const glides = detectGlideSegments(pitchPoints, options)
  for (const glide of glides) {
    marks.push({
      time: glide.startTime / 1000,
      type: 'glide',
      description: '滑音连接',
      severity: Math.min(5, Math.max(2, Math.round(Math.abs(glide.totalCents) / 60)))
    })
  }

  for (const segment of noteSegments) {
    if (segment.duration >= 600) {
      marks.push({
        time: segment.startTime / 1000,
        type: 'legato',
        description: '连音长句',
        severity: 3
      })
    }
  }

  for (const breath of breathPoints) {
    marks.push({
      time: breath.time / 1000,
      type: 'breath',
      description: breath.type === 'breath' ? '换气' : '停顿',
      severity: 2
    })
  }

  return marks
}

function buildTeachingPoints(noteSegments, breathPoints, pitchStability, rhythmStability) {
  const tips = []
  if (noteSegments.length) {
    const longSegment = noteSegments.reduce((max, segment) => (segment.duration > max.duration ? segment : max), noteSegments[0])
    tips.push({
      time: longSegment.startTime / 1000,
      type: 'pitch',
      title: '长音控制',
      description: '注意保持音高稳定，避免尾部下滑。',
      difficulty: pitchStability > 0.7 ? 2 : 4
    })
  }

  if (breathPoints.length) {
    const breath = breathPoints[0]
    tips.push({
      time: breath.time / 1000,
      type: 'breath',
      title: '换气位置',
      description: '此处换气较为自然，保持气息连贯。',
      difficulty: 2
    })
  }

  tips.push({
    time: 0,
    type: 'rhythm',
    title: '节奏稳定性',
    description: rhythmStability > 0.7 ? '节奏稳定，保持均匀行进感。' : '注意节拍均匀，避免忽快忽慢。',
    difficulty: rhythmStability > 0.7 ? 2 : 3
  })

  return tips
}

function detectBeats(rmsValues, times, options) {
  if (rmsValues.length < 3) {
    return { bpm: 0, beats: [], stability: 0 }
  }

  const flux = new Array(rmsValues.length).fill(0)
  for (let i = 1; i < rmsValues.length; i += 1) {
    flux[i] = Math.max(0, rmsValues[i] - rmsValues[i - 1])
  }

  const fluxMean = mean(flux)
  const threshold = fluxMean * options.beatThreshold
  const beats = []
  let lastBeatTime = -Infinity

  for (let i = 1; i < flux.length - 1; i += 1) {
    const time = times[i]
    if (flux[i] > threshold && flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]) {
      if (time - lastBeatTime >= options.beatMinIntervalMs) {
        beats.push({
          time: roundTo(time, 1),
          strength: roundTo(flux[i] / (fluxMean || 1), 2)
        })
        lastBeatTime = time
      }
    }
  }

  const intervals = beats.slice(1).map((beat, index) => beat.time - beats[index].time)
  const intervalMean = mean(intervals)
  const intervalStd = std(intervals, intervalMean)
  const stability = intervalMean ? clamp(1 - intervalStd / intervalMean, 0, 1) : 0
  const bpm = intervalMean ? Math.round(60000 / intervalMean) : 0

  return { bpm, beats, stability }
}

function computeSegmentMean(values, startIndex, endIndex) {
  if (!values || startIndex === null || endIndex === null) return 0
  let sum = 0
  let count = 0
  for (let i = startIndex; i < endIndex; i += 1) {
    const value = values[i]
    if (value !== null && value !== undefined && !Number.isNaN(value)) {
      sum += value
      count += 1
    }
  }
  return count ? sum / count : 0
}

function detectBreathPoints(volumeData, spectralFlatness, spectralCentroids, options) {
  const breathPoints = []
  let silenceStart = null
  let silenceStartIndex = null
  let hasVoice = false

  for (let i = 0; i < volumeData.length; i += 1) {
    const { rms, db, time } = volumeData[i]
    const isSilent = rms < options.minVolume || db < options.silenceDb

    if (isSilent) {
      if (silenceStart === null) {
        silenceStart = time
        silenceStartIndex = i
      }
    } else {
      hasVoice = true
      if (silenceStart !== null) {
        const duration = time - silenceStart
        if (duration >= options.minSilenceDurationMs && hasVoice) {
          const flatnessMean = computeSegmentMean(spectralFlatness, silenceStartIndex, i)
          const centroidMean = computeSegmentMean(spectralCentroids, silenceStartIndex, i)
          const isBreathLike = flatnessMean >= options.breathFlatnessThreshold
            || centroidMean >= options.breathCentroidThreshold
          const type = duration <= options.maxBreathDurationMs && isBreathLike ? 'breath' : 'rest'
          breathPoints.push({
            time: roundTo(silenceStart, 1),
            duration: roundTo(duration, 1),
            type
          })
        }
        silenceStart = null
        silenceStartIndex = null
      }
    }
  }

  return breathPoints
}

function computePitchChangeRate(centsValues, times) {
  const rates = []
  let prevIndex = null
  for (let i = 0; i < centsValues.length; i += 1) {
    if (centsValues[i] === null || centsValues[i] === undefined) continue
    if (prevIndex !== null) {
      const deltaCents = Math.abs(centsValues[i] - centsValues[prevIndex])
      const deltaTime = (times[i] - times[prevIndex]) / 1000
      if (deltaTime > 0) {
        rates.push(deltaCents / deltaTime)
      }
    }
    prevIndex = i
  }
  return mean(rates)
}

function computeVibratoRate(centsValues, times, minDepth) {
  const voicedIndices = []
  for (let i = 0; i < centsValues.length; i += 1) {
    if (centsValues[i] !== null && centsValues[i] !== undefined) {
      voicedIndices.push(i)
    }
  }
  if (voicedIndices.length < 3) return 0

  const diffs = []
  for (let i = 1; i < voicedIndices.length; i += 1) {
    const current = centsValues[voicedIndices[i]]
    const prev = centsValues[voicedIndices[i - 1]]
    diffs.push(current - prev)
  }

  const signChanges = diffs.slice(1).filter((value, index) => {
    const prev = diffs[index]
    return Math.sign(value) !== Math.sign(prev) && Math.abs(value) >= minDepth
  }).length

  const duration = (times[voicedIndices[voicedIndices.length - 1]] - times[voicedIndices[0]]) / 1000
  if (duration <= 0) return 0
  return (signChanges / 2) / duration
}

function computeDynamicRange(rmsValues) {
  const valid = rmsValues.filter((value) => value > 0)
  if (!valid.length) return 0
  const maxRms = Math.max(...valid)
  const minRms = Math.min(...valid)
  if (minRms <= 0) return 0
  return 20 * Math.log10(maxRms / minRms)
}

function computeBreathStability(breathPoints, totalDuration) {
  if (!breathPoints.length || totalDuration <= 0) return 0
  const intervals = breathPoints.slice(1).map((point, index) => point.time - breathPoints[index].time)
  const intervalMean = mean(intervals)
  const intervalStd = std(intervals, intervalMean)
  return intervalMean ? clamp(1 - intervalStd / intervalMean, 0, 1) : 0
}

function analyzeAudioBuffer(audioBuffer, options = {}) {
  if (!audioBuffer || audioBuffer.length === 0) {
    return createEmptyResult()
  }

  const settings = { ...DEFAULT_ANALYZER_OPTIONS, ...options }
  if ((settings.frameSize & (settings.frameSize - 1)) !== 0) {
    throw new Error('frameSize must be a power of two for FFT analysis')
  }

  const sampleRate = audioBuffer.sampleRate
  const channelData = mixToMono(audioBuffer)
  if (channelData.length < settings.frameSize) {
    return createEmptyResult()
  }

  const detectPitch = Pitchfinder.YIN({ sampleRate })
  const smoother = new PitchSmoother(settings.pitchSmoothingWindow)
  const fftPlan = createFftPlan(settings.frameSize)

  const pitchData = []
  const volumeData = []
  const times = []
  const rmsValues = []
  const pitchValues = []
  const centsValues = []
  const spectralCentroids = []
  const spectralRolloffs = []
  const spectralFlatness = []

  for (let i = 0; i + settings.frameSize <= channelData.length; i += settings.hopSize) {
    const frame = channelData.subarray(i, i + settings.frameSize)
    const timeMs = (i / sampleRate) * 1000
    const rms = calculateRms(frame)
    const db = toDb(rms)

    times.push(timeMs)
    rmsValues.push(rms)
    volumeData.push({
      time: roundTo(timeMs, 1),
      rms: roundTo(rms, 5),
      db: roundTo(db, 1)
    })

    let pitch = null
    let note = null
    let cents = null
    let noteInfo = null

    if (rms >= settings.minVolume && db >= settings.silenceDb) {
      const rawPitch = detectPitch(frame)
      if (rawPitch && rawPitch >= settings.minPitch && rawPitch <= settings.maxPitch) {
        pitch = smoother.add(rawPitch)
        noteInfo = frequencyToNote(pitch)
        if (noteInfo) {
          note = `${noteInfo.note}${noteInfo.octave}`
          cents = noteInfo.cents
        }
      } else {
        smoother.reset()
      }
    } else {
      smoother.reset()
    }

    if (!noteInfo && pitch) {
      noteInfo = frequencyToNote(pitch)
    }
    const previousCents = pitchData.length ? pitchData[pitchData.length - 1].cents : null
    const prePreviousCents = pitchData.length > 1 ? pitchData[pitchData.length - 2].cents : null
    const currentDelta = cents !== null && previousCents !== null ? cents - previousCents : null
    const previousDelta = previousCents !== null && prePreviousCents !== null
      ? previousCents - prePreviousCents
      : null
    const hasVibrato = currentDelta !== null && previousDelta !== null
      ? Math.sign(currentDelta) !== Math.sign(previousDelta)
        && Math.abs(currentDelta) >= settings.vibratoMinCents
      : false
    pitchData.push({
      time: roundTo(timeMs, 1),
      frequency: pitch ? roundTo(pitch, 1) : null,
      note,
      cents,
      midiNumber: noteInfo?.midiNumber ?? null,
      isStable: noteInfo ? Math.abs(noteInfo.cents) <= 15 : false,
      hasVibrato
    })
    pitchValues.push(pitch)
    centsValues.push(pitch ? toCents(pitch) : null)

    const spectral = computeMagnitudeSpectrum(frame, sampleRate, fftPlan, settings.spectralRolloffPercent)
    spectralCentroids.push(spectral.centroid)
    spectralRolloffs.push(spectral.rolloff)
    spectralFlatness.push(spectral.flatness)
  }

  const beats = detectBeats(rmsValues, times, settings)
  const breathPointsMs = detectBreathPoints(volumeData, spectralFlatness, spectralCentroids, settings)
  const noteSegmentsMs = extractNoteSegments(pitchData, settings)
  const totalDuration = times.length ? times[times.length - 1] - times[0] : 0

  const voicedPitches = pitchValues.filter((value) => value !== null && value !== undefined)
  const avgPitch = mean(voicedPitches)
  const pitchCents = centsValues.filter((value) => value !== null && value !== undefined)
  const pitchCenter = median(pitchCents)
  const pitchRange = pitchCents.length
    ? (Math.max(...pitchCents) - Math.min(...pitchCents)) / 100
    : 0
  const pitchStability = pitchCents.length
    ? clamp(1 - std(pitchCents, pitchCenter) / 80, 0, 1)
    : 0

  const pitchChangeRate = computePitchChangeRate(centsValues, times)
  const vibratoRate = computeVibratoRate(centsValues, times, settings.vibratoMinCents)
  const vibratoCount = vibratoRate > 0 ? Math.round(vibratoRate * (totalDuration / 1000)) : 0

  const avgVolume = mean(rmsValues)
  const dynamicRange = computeDynamicRange(rmsValues)
  const longToneDuration = noteSegmentsMs.length
    ? Math.max(...noteSegmentsMs.map((segment) => segment.duration))
    : 0
  const breathStability = computeBreathStability(breathPointsMs, totalDuration)

  const phraseDurations = noteSegmentsMs.map((segment) => segment.duration)
  const maxPhraseLength = phraseDurations.length ? Math.max(...phraseDurations) / 1000 : 0
  const avgPhraseLength = phraseDurations.length ? mean(phraseDurations) / 1000 : 0

  const averageStepMs = times.length > 1 ? mean(times.slice(1).map((time, index) => time - times[index])) : 0
  const pitchSampleRate = averageStepMs ? roundTo(1000 / averageStepMs, 2) : 0
  const volumeSampleRate = pitchSampleRate

  const minPitch = voicedPitches.length ? Math.min(...voicedPitches) : 0
  const maxPitch = voicedPitches.length ? Math.max(...voicedPitches) : 0

  const avgDb = mean(volumeData.map((frame) => frame.db))

  const pitchCurve = pitchData.map((frame) => {
    const midiNumber = frame.frequency ? Math.round(12 * Math.log2(frame.frequency / 440) + 69) : null
    return {
      ...frame,
      time: roundTo(frame.time / 1000, 3),
      midiNumber,
      midi: midiNumber
    }
  })

  const volumeCurve = volumeData.map((frame) => ({
    ...frame,
    time: roundTo(frame.time / 1000, 3)
  }))

  const beatPoints = beats.beats.map((beat) => ({
    ...beat,
    time: roundTo(beat.time / 1000, 3),
    isDownbeat: false
  }))

  const breathPoints = breathPointsMs.map((point) => ({
    ...point,
    time: roundTo(point.time / 1000, 3),
    duration: roundTo(point.duration / 1000, 3)
  }))

  const techniqueMarks = buildTechniqueMarks(pitchData, noteSegmentsMs, vibratoRate, breathPointsMs, settings)
  const teachingPoints = buildTeachingPoints(noteSegmentsMs, breathPointsMs, pitchStability, beats.stability)

  const pitchSummary = {
    sampleRate: pitchSampleRate,
    data: pitchCurve,
    statistics: {
      avgFrequency: roundTo(avgPitch, 2),
      minFrequency: roundTo(minPitch, 2),
      maxFrequency: roundTo(maxPitch, 2),
      pitchRange: roundTo(pitchRange, 2),
      vibratoCount,
      vibratoRate: roundTo(vibratoRate, 2),
      avgVibratoDepth: roundTo(std(pitchCents, pitchCenter), 2),
      pitchStability: roundTo(pitchStability, 3),
      pitchChangeRate: roundTo(pitchChangeRate, 2)
    }
  }

  const rhythmSummary = {
    bpm: beats.bpm,
    beats: beatPoints,
    tempoChanges: [],
    statistics: {
      avgBpm: beats.bpm,
      bpmStability: roundTo(beats.stability * 100, 1),
      rhythmComplexity: totalDuration > 0
        ? roundTo(clamp(beats.beats.length / (totalDuration / 1000), 0, 1) * 100, 1)
        : 0
    }
  }

  const volumeSummary = {
    sampleRate: volumeSampleRate,
    data: volumeCurve.map((frame) => ({
      ...frame,
      dynamics: null
    })),
    statistics: {
      avgDb: roundTo(avgDb, 1),
      dynamicRange: roundTo(dynamicRange, 2),
      crescendos: [],
      diminuendos: []
    }
  }

  const breathSummary = {
    breathPoints,
    longPhrases: noteSegmentsMs.slice(0, 6).map((segment) => ({
      startTime: roundTo(segment.startTime / 1000, 2),
      endTime: roundTo(segment.endTime / 1000, 2),
      duration: roundTo(segment.duration / 1000, 2),
      note: segment.note
    })),
    statistics: {
      avgPhraseLength: roundTo(avgPhraseLength, 2),
      maxPhraseLength: roundTo(maxPhraseLength, 2),
      breathCount: breathPointsMs.length,
      breathStability: roundTo(breathStability, 3)
    }
  }

  const statistics = {
    avgPitch: roundTo(avgPitch, 2),
    pitchRange: roundTo(pitchRange, 2),
    vibratoRate: roundTo(vibratoRate, 2),
    dynamicRange: roundTo(dynamicRange, 2),
    avgVolume: roundTo(avgVolume, 4),
    breathCount: breathPointsMs.length,
    pitchStability: roundTo(pitchStability, 3),
    pitchChangeRate: roundTo(pitchChangeRate, 2),
    rhythmStability: roundTo(beats.stability, 3),
    longToneDuration: roundTo(longToneDuration / 1000, 2),
    breathStability: roundTo(breathStability, 3),
    spectralCentroidAvg: roundTo(mean(spectralCentroids), 1),
    spectralRolloffAvg: roundTo(mean(spectralRolloffs), 1)
  }

  return {
    pitchData: pitchSummary,
    rhythmData: rhythmSummary,
    volumeData: volumeSummary,
    breathData: breathSummary,
    breathPoints: breathSummary.breathPoints,
    techniqueMarks,
    teachingPoints,
    statistics
  }
}

/**
 * Audio analysis engine for offline processing.
 * @param {Object} options - Analyzer configuration
 * @returns {Object} Analyzer API
 */
export function useAudioAnalyzer(options = {}) {
  const baseOptions = { ...DEFAULT_ANALYZER_OPTIONS, ...options }

  async function analyzeFromUrl(url, overrideOptions = {}) {
    const settings = { ...baseOptions, ...overrideOptions }
    const audioBuffer = await loadAudioBufferFromUrl(url, settings)
    return analyzeAudioBuffer(audioBuffer, settings)
  }

  function analyzeBuffer(audioBuffer, overrideOptions = {}) {
    const settings = { ...baseOptions, ...overrideOptions }
    return analyzeAudioBuffer(audioBuffer, settings)
  }

  async function loadFromUrl(url, overrideOptions = {}) {
    const settings = { ...baseOptions, ...overrideOptions }
    return await loadAudioBufferFromUrl(url, settings)
  }

  return {
    analyzeFromUrl,
    analyzeBuffer,
    loadFromUrl
  }
}

export async function analyzeAudio(url, options = {}) {
  const analyzer = useAudioAnalyzer(options)
  return await analyzer.analyzeFromUrl(url)
}

export {
  DEFAULT_ANALYZER_OPTIONS,
  analyzeAudioBuffer,
  loadAudioBufferFromUrl
}
