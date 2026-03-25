import { ref, computed, onUnmounted } from 'vue'
import Pitchfinder from 'pitchfinder'

/**
 * Note names for pitch-to-note conversion
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * Convert frequency to note info
 * @param {number} frequency - Frequency in Hz
 * @returns {Object} Note info with name, octave, cents
 */
export function frequencyToNote(frequency) {
  if (!frequency || frequency <= 0) return null
  
  // A4 = 440Hz is the reference
  const A4 = 440
  const C0 = A4 * Math.pow(2, -4.75) // Frequency of C0
  
  // Calculate number of half steps from C0
  const halfSteps = 12 * Math.log2(frequency / C0)
  const roundedHalfSteps = Math.round(halfSteps)
  
  // Calculate cents deviation from the nearest note
  const cents = Math.round((halfSteps - roundedHalfSteps) * 100)
  
  // Get note name and octave
  const noteIndex = ((roundedHalfSteps % 12) + 12) % 12
  const octave = Math.floor(roundedHalfSteps / 12)
  
  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
    frequency: Math.round(frequency * 10) / 10,
    midiFloat: halfSteps + 12,
    midiNumber: roundedHalfSteps + 12 // C0 = MIDI 12
  }
}

/**
 * Simple moving average for pitch smoothing
 */
class PitchSmoother {
  constructor(windowSize = 5) {
    this.windowSize = windowSize
    this.values = []
  }
  
  add(value) {
    if (value === null) return null
    
    this.values.push(value)
    if (this.values.length > this.windowSize) {
      this.values.shift()
    }
    
    // Return median for better noise rejection
    const sorted = [...this.values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
  
  reset() {
    this.values = []
  }
}

/**
 * Composable for pitch detection
 * @param {Object} options - Configuration options
 * @returns {Object} Reactive pitch state and controls
 */
export function usePitchDetection(options = {}) {
  const {
    sampleRate = 44100,
    bufferSize = 2048,
    smoothingWindow = 5,
    minVolume = 0.004 // Minimum volume to consider as singing
  } = options
  
  // State
  const pitch = ref(null) // Current frequency in Hz
  const noteInfo = ref(null) // { note, octave, cents, frequency, midiNumber }
  const volume = ref(0) // Current volume level (0-1)
  const isListening = ref(false)
  const error = ref(null)
  const hasPermission = ref(false)
  
  // Internal
  let audioContext = null
  let analyser = null
  let sourceNode = null
  let stream = null
  let animationFrameId = null
  let detectPitch = null
  const smoother = new PitchSmoother(smoothingWindow)
  
  // Computed
  const isVoiceDetected = computed(() => volume.value > minVolume && pitch.value !== null)
  
  const pitchDirection = computed(() => {
    if (!noteInfo.value) return 'none'
    const cents = noteInfo.value.cents
    if (cents > 10) return 'sharp'
    if (cents < -10) return 'flat'
    return 'in-tune'
  })
  
  // Initialize pitch detector
  function initDetector() {
    detectPitch = Pitchfinder.YIN({ sampleRate })
  }
  
  // Calculate volume from audio data
  function calculateVolume(dataArray) {
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    return Math.sqrt(sum / dataArray.length)
  }
  
  // Main detection loop
  function detect() {
    if (!isListening.value || !analyser) return
    
    const dataArray = new Float32Array(bufferSize)
    analyser.getFloatTimeDomainData(dataArray)
    
    // Calculate volume
    volume.value = calculateVolume(dataArray)
    
    // Only detect pitch if volume is above threshold
    if (volume.value > minVolume) {
      const rawPitch = detectPitch(dataArray)
      
      if (rawPitch && rawPitch > 50 && rawPitch < 2000) {
        // Smooth the pitch
        const smoothedPitch = smoother.add(rawPitch)
        pitch.value = smoothedPitch
        noteInfo.value = frequencyToNote(smoothedPitch)
      } else {
        pitch.value = null
        noteInfo.value = null
      }
    } else {
      pitch.value = null
      noteInfo.value = null
    }
    
    animationFrameId = requestAnimationFrame(detect)
  }
  
  // Request microphone access and start detection
  async function start() {
    if (isListening.value) return
    
    error.value = null
    
    try {
      // Initialize audio context (needs user gesture in most browsers)
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate
        })
      } catch (audioCtxError) {
        error.value = '音频设备初始化失败，请检查设备连接'
        hasPermission.value = false
        return
      }
      
      // Request microphone permission
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      hasPermission.value = true
      
      // Create audio nodes
      sourceNode = audioContext.createMediaStreamSource(stream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = bufferSize * 2
      
      // Connect nodes
      sourceNode.connect(analyser)
      
      // Initialize pitch detector
      initDetector()

      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume()
        } catch (resumeError) {
          error.value = '音频设备无法启动，请检查设备权限'
          hasPermission.value = false
          return
        }
      }
      
      // Start detection loop
      isListening.value = true
      detect()
      
    } catch (e) {
      const msg = String(e?.message || '')
      if (e?.name === 'NotAllowedError') {
        error.value = '请允许麦克风访问权限'
      } else if (e?.name === 'NotFoundError' || /not supported/i.test(msg)) {
        error.value = '当前设备不支持麦克风采集，请改用已有示范音频继续学习'
      } else {
        error.value = `麦克风错误: ${msg || '未知异常'}`
      }
      hasPermission.value = false
    }
  }
  
  // Stop detection
  function stop() {
    isListening.value = false
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    
    if (sourceNode) {
      sourceNode.disconnect()
      sourceNode = null
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
      audioContext = null
    }
    
    analyser = null
    pitch.value = null
    noteInfo.value = null
    volume.value = 0
    smoother.reset()
  }
  
  // Get pitch history for visualization
  const pitchHistory = ref([])
  const MAX_HISTORY = 100
  
  function recordPitchSample() {
    if (pitch.value !== null) {
      pitchHistory.value.push({
        time: Date.now(),
        pitch: pitch.value,
        note: noteInfo.value?.note,
        volume: volume.value
      })
      
      if (pitchHistory.value.length > MAX_HISTORY) {
        pitchHistory.value.shift()
      }
    }
  }
  
  function clearHistory() {
    pitchHistory.value = []
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })
  
  return {
    // State
    pitch,
    noteInfo,
    volume,
    isListening,
    error,
    hasPermission,
    isVoiceDetected,
    pitchDirection,
    pitchHistory,
    
    // Methods
    start,
    stop,
    recordPitchSample,
    clearHistory
  }
}

// Export helper for testing
export { PitchSmoother }
