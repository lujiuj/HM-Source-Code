import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WorkDetail from '../modules/learn/pages/WorkDetail.vue'

const routerPush = vi.fn()
const getWork = vi.fn()
const getMediaUrl = vi.fn()
const listComments = vi.fn()
const listGifts = vi.fn()
const listDanmaku = vi.fn()
const getInteractionSummary = vi.fn()
const listInteractionEvents = vi.fn()
const syncJourneyProgress = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { workId: 'work-1' }, query: {} }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('../shared/infra/index.js', () => ({
  getInfra: () => ({
    identity: {
      getUid: () => 'viewer-1',
      getProfile: () => ({
        displayName: '观众甲',
        avatar: '',
        giftBalance: 9
      }),
      saveProfile: vi.fn().mockResolvedValue(null)
    },
    works: {
      getWork: (...args) => getWork(...args)
    },
    media: {
      getMediaUrl: (...args) => getMediaUrl(...args)
    },
    interaction: {
      listComments: (...args) => listComments(...args),
      listGifts: (...args) => listGifts(...args),
      listDanmaku: (...args) => listDanmaku(...args),
      getInteractionSummary: (...args) => getInteractionSummary(...args),
      listInteractionEvents: (...args) => listInteractionEvents(...args),
      addComment: vi.fn().mockResolvedValue(null),
      sendDanmaku: vi.fn().mockResolvedValue(null),
      sendGift: vi.fn().mockResolvedValue(null)
    }
  })
}))

vi.mock('../modules/learn/utils/studyProgress.js', async () => {
  const actual = await vi.importActual('../modules/learn/utils/studyProgress.js')
  return {
    ...actual,
    syncJourneyProgress: (...args) => syncJourneyProgress(...args)
  }
})

describe('WorkDetail page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    getWork.mockReset()
    getMediaUrl.mockReset()
    listComments.mockReset()
    listGifts.mockReset()
    listDanmaku.mockReset()
    getInteractionSummary.mockReset()
    listInteractionEvents.mockReset()
    syncJourneyProgress.mockReset()

    getWork.mockResolvedValue({
      id: 'work-1',
      userId: 'author-9',
      username: '戏友阿青',
      songId: 'tianxianpei-fuqishuangshuang',
      songName: '《天仙配》·夫妻双双把家还',
      mediaUrl: 'https://example.com/audio.mp3',
      score: 95,
      analysisV2: {
        overallScore: 95,
        dimensions: {
          pitch: 96,
          rhythm: 94,
          articulation: 92,
          style: 95,
          breath: 93,
          emotion: 96
        }
      },
      publishAiAnalysis: {
        summary: '这条唱段完成度很稳，适合放在社区里展示。'
      }
    })
    getMediaUrl.mockResolvedValue('https://example.com/audio.mp3')
    listComments.mockResolvedValue([
      { id: 'c1', username: '听众甲', text: '这一句很稳。', timestamp: Date.now() }
    ])
    listGifts.mockResolvedValue([
      { id: 'g1', type: 'flower', count: 2, timestamp: Date.now(), actorSnapshot: { username: '花友' } }
    ])
    listDanmaku.mockResolvedValue([
      { id: 'd1', text: '好听', timestamp: Date.now() }
    ])
    getInteractionSummary.mockResolvedValue({ giftProfile: { giftBalance: 9 } })
    listInteractionEvents.mockResolvedValue([])
    syncJourneyProgress.mockResolvedValue({ giftProfile: { giftBalance: 9 } })
  })

  it('shows community metrics and hides public analysis cards for non-owners', async () => {
    const wrapper = mount(WorkDetail, {
      global: {
        stubs: {
          GiftBurstOverlay: { template: '<div />' },
          LearnAvatarPreset: { template: '<div class="avatar-stub" />' }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('投喂打赏')
    expect(wrapper.text()).toContain('评论交流')
    expect(wrapper.text()).toContain('最新评论')
    expect(wrapper.text()).toContain('音准')
    expect(wrapper.text()).not.toContain('查看作者私有复盘')
  })
})
