/**
 * Audio Analyzer Web Worker
 * Handles heavy FFT/pitch/breath analysis off the main thread
 */

self.onmessage = async (e) => {
  const { type, payload, id } = e.data
  
  try {
    switch (type) {
      case 'analyze': {
        const { audioData, sampleRate, options } = payload
        const result = analyzeAudio(audioData, sampleRate, options)
        self.postMessage({ type: 'result', id, payload: result })
        break
      }
      case 'cancel':
        // Handle cancellation if needed
        break
      default:
        self.postMessage({ type: 'error', id, payload: `Unknown message type: ${type}` })
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, payload: error.message })
  }
}

/**
 * Main analysis function - runs heavy computation
 */
function analyzeAudio(audioData, sampleRate, options = {}) {
  const pitchData = extractPitchData(audioData, sampleRate)
  const breathData = analyzeBreath(audioData, sampleRate)
  const rhythmData = analyzeRhythm(audioData, sampleRate)
  
  return {
    pitchData,
    breathData,
    rhythmData,
    duration: audioData.length / sampleRate,
    sampleRate
  }
}

/**
 * Extract pitch data using autocorrelation
 */
function extractPitchData(audioData, sampleRate) {
  const frameSize = 2048
  const hopSize = 512
  const pitches = []
  
  for (let i = 0; i + frameSize < audioData.length; i += hopSize) {
    const frame = new Float32Array(audioData.buffer, audioData.byteOffset + i * 4, frameSize)
    const pitch = detectPitch(frame, sampleRate)
    const rms = calculateRMS(frame)
    
    pitches.push({
      time: i / sampleRate,
      pitch: pitch,
      confidence: pitch > 0 ? 0.8 : 0,
      volume: rms
    })
    
    // Report progress every 10%
    if (i % Math.floor(audioData.length / 10) < hopSize) {
      self.postMessage({ 
        type: 'progress', 
        payload: Math.floor((i / audioData.length) * 100) 
      })
    }
  }
  
  return pitches
}

/**
 * Simple autocorrelation pitch detection
 */
function detectPitch(frame, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 500)  // 500 Hz max
  const maxPeriod = Math.floor(sampleRate / 80)   // 80 Hz min
  
  // Check if signal is too quiet
  const rms = calculateRMS(frame)
  if (rms < 0.01) return 0
  
  let bestCorr = 0
  let bestPeriod = 0
  
  for (let period = minPeriod; period <= maxPeriod; period++) {
    let corr = 0
    for (let i = 0; i < frame.length - period; i++) {
      corr += frame[i] * frame[i + period]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestPeriod = period
    }
  }
  
  return bestPeriod > 0 ? sampleRate / bestPeriod : 0
}

/**
 * Calculate RMS (Root Mean Square) for volume
 */
function calculateRMS(frame) {
  let sum = 0
  for (let i = 0; i < frame.length; i++) {
    sum += frame[i] * frame[i]
  }
  return Math.sqrt(sum / frame.length)
}

/**
 * Detect breath points via amplitude envelope
 */
function analyzeBreath(audioData, sampleRate) {
  const windowSize = Math.floor(sampleRate * 0.05) // 50ms windows
  const breathPoints = []
  let wasQuiet = false
  
  for (let i = 0; i + windowSize < audioData.length; i += windowSize) {
    const window = new Float32Array(audioData.buffer, audioData.byteOffset + i * 4, windowSize)
    const rms = calculateRMS(window)
    const isQuiet = rms < 0.01
    
    // Detect transition from sound to silence (potential breath)
    if (isQuiet && !wasQuiet) {
      breathPoints.push({ 
        time: i / sampleRate, 
        type: 'breath',
        duration: 0 // Will be calculated
      })
    }
    wasQuiet = isQuiet
  }
  
  return breathPoints
}

/**
 * Simple onset detection for rhythm analysis
 */
function analyzeRhythm(audioData, sampleRate) {
  const onsets = []
  const windowSize = 1024
  let prevEnergy = 0
  
  for (let i = 0; i + windowSize < audioData.length; i += windowSize) {
    const window = new Float32Array(audioData.buffer, audioData.byteOffset + i * 4, windowSize)
    let energy = 0
    for (let j = 0; j < window.length; j++) {
      energy += window[j] * window[j]
    }
    
    // Detect onset (sudden increase in energy)
    if (energy > prevEnergy * 1.5 && energy > 0.001) {
      onsets.push({ 
        time: i / sampleRate, 
        strength: energy 
      })
    }
    prevEnergy = energy
  }
  
  return { 
    onsets, 
    tempo: estimateTempo(onsets),
    beatCount: onsets.length
  }
}

/**
 * Estimate tempo from onset intervals
 */
function estimateTempo(onsets) {
  if (onsets.length < 2) return 0
  
  const intervals = []
  for (let i = 1; i < Math.min(onsets.length, 50); i++) {
    intervals.push(onsets[i].time - onsets[i - 1].time)
  }
  
  // Filter out very short/long intervals
  const validIntervals = intervals.filter(i => i > 0.2 && i < 2)
  if (validIntervals.length === 0) return 0
  
  const avgInterval = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length
  return avgInterval > 0 ? Math.round(60 / avgInterval) : 0
}
