import { describe, it, expect } from 'vitest'
import { blobToBase64, base64ToBlob } from '../composables/useAudioRecorder.js'

describe('blobToBase64', () => {
  it('should convert blob to base64', async () => {
    const text = 'Hello, World!'
    const blob = new Blob([text], { type: 'text/plain' })
    
    const base64 = await blobToBase64(blob)
    
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)
  })
})

describe('base64ToBlob', () => {
  it('should convert base64 back to blob', async () => {
    const originalText = 'Test audio data'
    const originalBlob = new Blob([originalText], { type: 'audio/webm' })
    
    const base64 = await blobToBase64(originalBlob)
    const restoredBlob = base64ToBlob(base64, 'audio/webm')
    
    expect(restoredBlob).toBeInstanceOf(Blob)
    expect(restoredBlob.type).toBe('audio/webm')
  })
  
  it('should use default mime type if not provided', () => {
    const base64 = btoa('test data')
    const blob = base64ToBlob(base64)
    
    expect(blob.type).toBe('audio/webm')
  })
})

describe('round-trip conversion', () => {
  it('should preserve data through base64 conversion', async () => {
    const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const originalBlob = new Blob([originalData], { type: 'audio/webm' })
    
    const base64 = await blobToBase64(originalBlob)
    const restoredBlob = base64ToBlob(base64, 'audio/webm')
    
    expect(restoredBlob.size).toBe(originalBlob.size)
  })
})
