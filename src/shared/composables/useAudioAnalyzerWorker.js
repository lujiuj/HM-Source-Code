/**
 * Audio Analyzer Web Worker Wrapper
 * Provides the same interface as useAudioAnalyzer but uses Worker for off-main-thread processing
 */

import { ref, onUnmounted } from 'vue'

export function useAudioAnalyzerWorker() {
  const worker = new Worker(
    new URL('../workers/audioAnalyzer.worker.js', import.meta.url),
    { type: 'module' }
  )
  
  const isAnalyzing = ref(false)
  const progress = ref(0)
  const error = ref(null)
  
  let requestId = 0
  const pendingRequests = new Map()
  
  worker.onmessage = (e) => {
    const { type, id, payload } = e.data
    const pending = pendingRequests.get(id)
    if (!pending) return
    
    if (type === 'result') {
      pending.resolve(payload)
      isAnalyzing.value = false
    } else if (type === 'error') {
      isAnalyzing.value = false
      pending.reject(new Error(payload))
    } else if (type === 'progress') {
      progress.value = payload
    }
    
    pendingRequests.delete(id)
    isAnalyzing.value = pendingRequests.size > 0
  }
  
  worker.onerror = (e) => {
    error.value = new Error('Worker error: ' + e.message)
    isAnalyzing.value = false
    pendingRequests.forEach(p => p.reject(new Error('Worker error')))
    pendingRequests.clear()
  }
  
  /**
   * Analyze audio buffer using Worker
   * @param {AudioBuffer} audioBuffer - The audio data to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results with pitchData, breathData, rhythmData
   */
  async function analyze(audioBuffer, options = {}) {
    isAnalyzing.value = true
    error.value = null
    progress.value = 0
    
    const id = ++requestId
    
    try {
      const audioData = audioBuffer.getChannelData(0)
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject })
        
        const transferable = new Float32Array(audioData)
        worker.postMessage(
          { 
            type: 'analyze', 
            id,
            payload: { 
              audioData: transferable, 
              sampleRate: audioBuffer.sampleRate, 
              options,
              useCache: options.useCache !== false
            } 
          },
          [transferable.buffer]
        )
      })
    } catch (e) {
      isAnalyzing.value = false
      throw e
    }
  }
  
  /**
   * Cancel current analysis
   */
  function cancel() {
    worker.postMessage({ type: 'cancel' })
    pendingRequests.forEach(p => p.reject(new Error('Cancelled')))
    pendingRequests.clear()
    isAnalyzing.value = false
    progress.value = 0
  }
  
  /**
   * Terminate worker and cleanup
   */
  onUnmounted(() => {
    cancel()
    worker.terminate()
  })
  
  return { 
    analyze, 
    cancel, 
    isAnalyzing, 
    progress, 
    error 
  }
}
