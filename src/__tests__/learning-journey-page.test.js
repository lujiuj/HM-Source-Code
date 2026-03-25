import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import LearningJourney from '../modules/learn/pages/LearningJourney.vue'

const routerPush = vi.fn()
const syncJourneyProgress = vi.fn()
const getJourneyQuiz = vi.fn()
const submitJourneyQuiz = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('../shared/infra/index.js', () => ({
  getInfra: () => ({
    identity: {
      getUid: () => 'user-1'
    }
  })
}))

vi.mock('../modules/learn/utils/studyProgress.js', () => ({
  syncJourneyProgress: (...args) => syncJourneyProgress(...args),
  getJourneyQuiz: (...args) => getJourneyQuiz(...args),
  submitJourneyQuiz: (...args) => submitJourneyQuiz(...args)
}))

function buildSummary({ quizCleared = false, publishUnlocked = false } = {}) {
  return {
    journey: {
      activeStage: {
        id: quizCleared ? 'publish' : 'rhythm'
      },
      stages: [
        {
          id: 'warm-up',
          title: '开嗓立字',
          subtitle: '先把字头唱清楚。',
          objective: '完成一遍练唱。',
          taskType: 'score',
          isUnlocked: true,
          isCleared: true,
          route: { path: '/learn/practice/karaoke', query: { songId: 'tianxianpei-fuqishuangshuang' } },
          supportRoute: null,
          rewardExp: 40,
          recommendedMinutes: 6,
          song: { title: '《天仙配》·夫妻双双把家还' }
        },
        {
          id: 'rhythm',
          title: '戏文识意',
          subtitle: '用理论题补全戏文理解。',
          objective: '答对 1 题即可通关。',
          taskType: 'quiz',
          isUnlocked: true,
          isCleared: quizCleared,
          route: { path: '/learn/journey', query: { stageId: 'rhythm', action: 'quiz' } },
          supportRoute: { path: '/learn/analysis/tianxianpei-fuqishuangshuang' },
          rewardExp: 40,
          recommendedMinutes: 4,
          song: { title: '《天仙配》·夫妻双双把家还' }
        },
        {
          id: 'publish',
          title: '登台发布',
          subtitle: '把结果发到社区里。',
          objective: '完成一次公开发布。',
          taskType: 'publish',
          isUnlocked: publishUnlocked,
          isCleared: false,
          route: { path: '/learn/practice/history' },
          supportRoute: null,
          rewardExp: 40,
          recommendedMinutes: 3,
          song: { title: '任一完整评分唱段' }
        }
      ]
    }
  }
}

describe('LearningJourney page', () => {
  beforeEach(() => {
    routerPush.mockReset()
    syncJourneyProgress.mockReset()
    getJourneyQuiz.mockReset()
    submitJourneyQuiz.mockReset()
  })

  it('opens the quiz drawer and unlocks the next stage after a passing submission', async () => {
    syncJourneyProgress
      .mockResolvedValueOnce(buildSummary())
      .mockResolvedValueOnce(buildSummary({ quizCleared: true, publishUnlocked: true }))

    getJourneyQuiz.mockReturnValue({
      passCount: 1,
      questions: [
        {
          id: 'q1',
          prompt: '《夫妻双双把家还》出自哪部戏？',
          options: [
            { id: 'a', label: '《天仙配》' },
            { id: 'b', label: '《女驸马》' }
          ]
        }
      ]
    })

    submitJourneyQuiz.mockResolvedValue({
      passed: true,
      correctCount: 1,
      total: 1,
      passCount: 1,
      questionResults: [
        { id: 'q1', isCorrect: true, explanation: '这是《天仙配》的经典唱段。' }
      ]
    })

    const wrapper = mount(LearningJourney)
    await flushPromises()

    expect(wrapper.text()).toContain('戏文识意')

    const openQuizButton = wrapper.findAll('button').find((button) => button.text().includes('开始答题'))
    expect(openQuizButton).toBeTruthy()
    await openQuizButton.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('理论闯关')

    await wrapper.get('input[type="radio"][value="a"]').setValue()
    const submitButton = wrapper.findAll('button').find((button) => button.text().includes('提交答案'))
    expect(submitButton).toBeTruthy()
    await submitButton.trigger('click')
    await flushPromises()

    expect(submitJourneyQuiz).toHaveBeenCalled()
    expect(syncJourneyProgress).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('登台发布')
  })
})
