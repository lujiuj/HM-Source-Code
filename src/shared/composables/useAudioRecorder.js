import { ref, computed, onUnmounted } from 'vue'

/**
 * Convert Blob to base64 string
 * @param {Blob} blob - Audio blob
 * @returns {Promise<string>} Base64 encoded string
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      // Remove data URL prefix to get pure base64
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Convert base64 string back to Blob
 * @param {string} base64 - Base64 encoded string
 * @param {string} mimeType - MIME type of the audio
 * @returns {Blob} Audio blob
 */
export function base64ToBlob(base64, mimeType = 'audio/webm') {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

/**
 * Get supported audio MIME type
 * @returns {string} Supported MIME type
 */
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ]
  
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return 'audio/webm' // Fallback
}

/**
 * Composable for audio recording
 * @param {Object} options - Configuration options
 * @returns {Object} Reactive recording state and controls
 */
export function useAudioRecorder(options = {}) {
  const {
    maxDuration = 120000, // 2 minutes max
    onDataAvailable = null,
    stopTimeout = 5000 // Default 5 second timeout for stop()
  } = options
  
  // State
  const isRecording = ref(false)
  const isPaused = ref(false)
  const recordingBlob = ref(null)
  const recordingUrl = ref(null)
  const recordingDuration = ref(0)
  const error = ref(null)
  const mimeType = ref(getSupportedMimeType())
  
  // Internal
  let mediaRecorder = null
  let stream = null
  let chunks = []
  let startTime = 0
  let durationInterval = null
  let maxDurationTimeout = null
  
  // Promise-related variables for stop()
  let stopResolve = null
  let stopReject = null
  let stopTimeoutId = null
  let stopPromise = null
  
  // Computed
  const hasRecording = computed(() => recordingBlob.value !== null)
  
  const recordingSize = computed(() => {
    if (!recordingBlob.value) return 0
    return recordingBlob.value.size
  })
  
  const recordingSizeKB = computed(() => {
    return Math.round(recordingSize.value / 1024)
  })
  
  // Start duration tracking
  function startDurationTracking() {
    startTime = Date.now() - recordingDuration.value // Account for existing duration if resumed
    durationInterval = setInterval(() => {
      recordingDuration.value = Date.now() - startTime
    }, 100)
    
    // Auto-stop at max duration
    if (maxDurationTimeout) clearTimeout(maxDurationTimeout)
    const remainingTime = maxDuration - recordingDuration.value
    if (remainingTime > 0) {
      maxDurationTimeout = setTimeout(() => {
        if (isRecording.value) {
          stop()
        }
      }, remainingTime)
    }
  }
  
  // Stop duration tracking
  function stopDurationTracking() {
    if (durationInterval) {
      clearInterval(durationInterval)
      durationInterval = null
    }
    if (maxDurationTimeout) {
      clearTimeout(maxDurationTimeout)
      maxDurationTimeout = null
    }
  }
  
  // Start recording
  async function start() {
    if (isRecording.value) return
    
    error.value = null
    chunks = []
    recordingDuration.value = 0 // Reset duration on new start
    
    try {
      // Get microphone stream
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType.value
      })
      
      // Handle data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          if (onDataAvailable) {
            onDataAvailable(event.data)
          }
        }
      }
      
      // Handle stop
      mediaRecorder.onstop = () => {
        // Create blob from chunks
        recordingBlob.value = new Blob(chunks, { type: mimeType.value })
        
        // Create playback URL
        if (recordingUrl.value) {
          URL.revokeObjectURL(recordingUrl.value)
        }
        recordingUrl.value = URL.createObjectURL(recordingBlob.value)
        
        stopDurationTracking()
        
        // Resolve stop Promise if exists
        if (stopResolve) {
          clearTimeout(stopTimeoutId)
          stopResolve(recordingBlob.value)
          cleanupStopPromise()
        }
      }
      
      // Handle error
      mediaRecorder.onerror = (event) => {
        error.value = `录音错误: ${event.error?.message || '未知错误'}`
        
        // Reject stop Promise if exists
        if (stopReject) {
          stopReject(new Error(error.value))
          cleanupStopPromise()
        }
        
        cleanup()
      }
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      isRecording.value = true
      isPaused.value = false
      
      startDurationTracking()
      
    } catch (e) {
      error.value = e.name === 'NotAllowedError'
        ? '请允许麦克风访问权限'
        : `录音失败: ${e.message}`
    }
  }
  
  // Pause recording
  function pause() {
    if (!isRecording.value || isPaused.value || !mediaRecorder) return
    
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      isPaused.value = true
      stopDurationTracking()
    }
  }
  
  // Resume recording
  function resume() {
    if (!isRecording.value || !isPaused.value || !mediaRecorder) return
    
    if (mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      isPaused.value = false
      startDurationTracking()
    }
  }
  
  // Stop recording
  function stop() {
    if (stopPromise) return stopPromise

    stopPromise = new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        isRecording.value = false
        isPaused.value = false
        stopDurationTracking()

        if (stream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop()
            } catch {
              // ignore
            }
          })
          stream = null
        }

        resolve(recordingBlob.value || null)
        return
      }

      // Store resolve/reject for onstop callback
      stopResolve = resolve
      stopReject = reject
      
      // Set timeout for stop operation
      if (stopTimeoutId) clearTimeout(stopTimeoutId)
      stopTimeoutId = setTimeout(() => {
        cleanupStopPromise()
        reject(new Error('Recording stop timeout'))
      }, stopTimeout)
      
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      } else {
        // Already stopped, resolve immediately
        cleanupStopPromise()
        resolve(recordingBlob.value)
      }
      
      isRecording.value = false
      isPaused.value = false
      
      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
        })
        stream = null
      }
    })

    stopPromise = stopPromise.finally(() => {
      stopPromise = null
    })
    return stopPromise
  }
  
  // Cleanup stop promise variables
  function cleanupStopPromise() {
    if (stopTimeoutId) {
      clearTimeout(stopTimeoutId)
      stopTimeoutId = null
    }
    stopResolve = null
    stopReject = null
  }
  
  // Clear recording
  function clear() {
    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }
    recordingBlob.value = null
    recordingUrl.value = null
    recordingDuration.value = 0
    chunks = []
  }
  
  // Cleanup all resources
  function cleanup() {
    cleanupStopPromise()
    // Avoid throwing unhandled rejection when recorder was never created.
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    } catch {
      // Ignore cleanup-time stop errors.
    }

    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      stream = null
    }

    mediaRecorder = null
    isRecording.value = false
    isPaused.value = false
    clear()
    stopDurationTracking()
  }
  
  // Get base64 representation for storage
  async function getBase64() {
    if (!recordingBlob.value) return null
    return await blobToBase64(recordingBlob.value)
  }
  
  // Load from base64
  function loadFromBase64(base64Data, type = null) {
    const blob = base64ToBlob(base64Data, type || mimeType.value)
    recordingBlob.value = blob
    
    if (recordingUrl.value) {
      URL.revokeObjectURL(recordingUrl.value)
    }
    recordingUrl.value = URL.createObjectURL(blob)
  }
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // State
    isRecording,
    isPaused,
    recordingBlob,
    recordingUrl,
    recordingDuration,
    recordingSize,
    recordingSizeKB,
    hasRecording,
    error,
    mimeType,
    
    // Methods
    start,
    pause,
    resume,
    stop,
    clear,
    getBase64,
    loadFromBase64
  }
}

// Export helpers for testing
export { getSupportedMimeType }
