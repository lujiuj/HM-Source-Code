import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import KaraokePlayer from '../KaraokePlayer.vue'
import LyricsDisplay from '../LyricsDisplay.vue'

const lyricState = {
  lyrics: ref([{ time: 0, text: '开场' }]),
  currentLineIndex: ref(0),
  offsetMs: ref(0),
  loadLRC: vi.fn(),
  syncWithMedia: vi.fn(() => () => {})
}

vi.mock('../../../../shared/composables/useLyricSync.js', () => ({
  useLyricSync: () => lyricState
}))

vi.mock('../../../../shared/composables/useHuangmeiScore.js', () => ({
  useHuangmeiScore: () => ({
    addSample: vi.fn(),
    scoreLine: vi.fn(),
    calculateFinalScore: vi.fn(() => ({ overall: 0, lines: [] })),
    reset: vi.fn()
  })
}))

vi.mock('../../../../shared/composables/usePitchDetection.js', () => ({
  usePitchDetection: () => ({
    pitch: ref(0),
    noteInfo: ref(null),
    volume: ref(0),
    isVoiceDetected: ref(false),
    isListening: ref(false),
    error: ref(''),
    start: vi.fn(),
    stop: vi.fn()
  })
}))

vi.mock('../../../../shared/utils/scoreRef.js', () => ({
  getExpectedPitchForLine: vi.fn(() => null),
  loadScoreRef: vi.fn(async () => null)
}))

describe('KaraokePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    lyricState.lyrics.value = [{ time: 0, text: '开场' }]
    lyricState.currentLineIndex.value = 0
    lyricState.offsetMs.value = 0
    lyricState.loadLRC.mockClear()
    lyricState.syncWithMedia.mockClear()
    if (typeof HTMLMediaElement !== 'undefined') {
      vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
      vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders pitch visualizer container', async () => {
    const wrapper = mount(KaraokePlayer, {
      props: {
        song: { id: 'song-1', title: '测试', audioSrc: '/audio.mp3' }
      }
    })

    await vi.runAllTimersAsync()
    await nextTick()

    expect(wrapper.find('.piano-roll-container').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders lyric lines when LyricsDisplay receives lyrics array', () => {
    const lyrics = [
      { time: 0, text: '第一句' },
      { time: 1200, text: '第二句' }
    ]

    const wrapper = mount(LyricsDisplay, {
      props: {
        lyrics,
        currentLineIndex: 0,
        currentTimeMs: 0
      }
    })

    expect(wrapper.findAll('.lyric-line')).toHaveLength(2)
  })

  it('scrolls when currentLineIndex changes', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0))
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id))

    const lyrics = [
      { time: 0, text: '第一句' },
      { time: 1200, text: '第二句' }
    ]

    const wrapper = mount(LyricsDisplay, {
      props: {
        lyrics,
        currentLineIndex: 0,
        currentTimeMs: 0
      }
    })

    const container = wrapper.find('.lyrics-display').element
    container.scrollTo = vi.fn()
    Object.defineProperty(container, 'clientHeight', { value: 200, configurable: true })

    const lines = wrapper.findAll('.lyric-line')
    const scrollIntoViewMocks = []
    lines.forEach((line, index) => {
      Object.defineProperty(line.element, 'offsetTop', { value: index * 40, configurable: true })
      Object.defineProperty(line.element, 'clientHeight', { value: 20, configurable: true })
      const mock = vi.fn()
      line.element.scrollIntoView = mock
      scrollIntoViewMocks.push(mock)
    })

    await vi.runAllTimersAsync()
    container.scrollTo.mockClear()

    await wrapper.setProps({ currentLineIndex: 1 })
    await vi.runAllTimersAsync()

    const calledByScrollIntoView = scrollIntoViewMocks.some((mock) => mock.mock.calls.length > 0)
    expect(container.scrollTo.mock.calls.length > 0 || calledByScrollIntoView).toBe(true)
    wrapper.unmount()
  })
})
