import { beforeEach, describe, expect, it } from 'vitest'
import { LocalIdentityStore } from '../shared/infra/local/LocalIdentityStore.js'
import { LocalPracticeStore } from '../shared/infra/local/LocalPracticeStore.js'
import { LocalWorksStore } from '../shared/infra/local/LocalWorksStore.js'
import {
  getStudyExpSummary,
  journeyStages,
  recordAnalysisVisit,
  submitJourneyQuiz,
  syncJourneyProgress
} from '../modules/learn/utils/studyProgress.js'

beforeEach(() => {
  localStorage.clear()
})

describe('studyProgress journey quiz', () => {
  it('records a passed knowledge gate in the profile journey state', async () => {
    const identity = new LocalIdentityStore()
    const stage = journeyStages.find((item) => item.id === 'rhythm')
    const answers = Object.fromEntries(stage.quiz.questions.map((question) => [question.id, question.correctAnswer]))

    const result = await submitJourneyQuiz(identity, 'rhythm', answers, new Date('2026-03-08T09:00:00').getTime())
    const profile = identity.getProfile()

    expect(result.passed).toBe(true)
    expect(result.correctCount).toBe(stage.quiz.questions.length)
    expect(profile.journey.quizPassStageIds).toContain('rhythm')
    expect(profile.journey.quizPassLog).toContain('rhythm@2026-03-08')
  })

  it('does not mark the stage as passed when the answers are insufficient', async () => {
    const identity = new LocalIdentityStore()
    const stage = journeyStages.find((item) => item.id === 'story')
    const answers = Object.fromEntries(stage.quiz.questions.map((question) => [question.id, 'a']))

    const result = await submitJourneyQuiz(identity, 'story', answers, new Date('2026-03-08T09:00:00').getTime())
    const profile = identity.getProfile()

    expect(result.passed).toBe(false)
    expect(result.correctCount).toBeLessThan(result.passCount)
    expect(profile.journey.quizPassStageIds).not.toContain('story')
  })

  it('builds level summary extras for the learn home badge', async () => {
    const identity = new LocalIdentityStore()
    await identity.saveProfile({
      studyDays: 3,
      journey: {
        ...identity.getProfile().journey,
        clearedStageIds: ['warm-up', 'rhythm']
      }
    })

    const practice = new LocalPracticeStore()
    await practice.savePracticeSession(identity.getUid(), {
      songId: 'tianxianpei-fuqishuangshuang',
      score: 91,
      grade: 'A',
      timestamp: new Date('2026-03-08T09:00:00').getTime()
    })

    const works = new LocalWorksStore()
    await works.publishWork({
      userId: identity.getUid(),
      title: '测试作品',
      songId: 'tianxianpei-fuqishuangshuang',
      timestamp: new Date('2026-03-08T10:00:00').getTime()
    })

    const summary = await getStudyExpSummary(identity.getUid(), {
      identity,
      practice,
      works
    })

    expect(summary.expBreakdown.map((item) => item.id)).toEqual([
      'practice',
      'journey',
      'repertoire',
      'diligence',
      'publish'
    ])
    expect(summary.nextLevelHint).toContain('Lv.')
    expect(summary.journey.activeStage).toBeTruthy()
    expect(summary.journey.stages.every((stage) => stage.taskType && stage.route)).toBe(true)
  })

  it('unlocks the third gate after visiting the matching master analysis page', async () => {
    const identity = new LocalIdentityStore()
    const practice = new LocalPracticeStore()
    const works = new LocalWorksStore()

    const rhythmStage = journeyStages.find((item) => item.id === 'rhythm')
    const answers = Object.fromEntries(rhythmStage.quiz.questions.map((question) => [question.id, question.correctAnswer]))

    await practice.savePracticeSession(identity.getUid(), {
      songId: 'tianxianpei-fuqishuangshuang',
      score: 88,
      grade: 'A',
      timestamp: new Date('2026-03-08T08:00:00').getTime()
    })
    await submitJourneyQuiz(identity, 'rhythm', answers, new Date('2026-03-08T09:00:00').getTime())
    await syncJourneyProgress(identity, { identity, practice, works })

    await recordAnalysisVisit(identity, 'liangzhu-wocongci', new Date('2026-03-08T10:00:00').getTime())
    await syncJourneyProgress(identity, { identity, practice, works })
    const summary = await syncJourneyProgress(identity, { identity, practice, works })
    const lyricStage = summary.journey.stages.find((stage) => stage.id === 'lyric')

    expect(identity.getProfile().journey.viewedAnalysisSongIds).toContain('liangzhu-wocongci')
    expect(identity.getProfile().journey.analysisVisitLog).toContain('liangzhu-wocongci@2026-03-08')
    expect(lyricStage.isCleared).toBe(true)
  })
})
