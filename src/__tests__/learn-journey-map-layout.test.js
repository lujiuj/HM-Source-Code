import { buildJourneyTrackPath, canSelectJourneyStage, getJourneyStageLayout } from '../modules/learn/utils/journeyMapLayout.js'

describe('journey map layout', () => {
  it('maps known stage ids to fixed coordinates', () => {
    expect(getJourneyStageLayout('warm-up')).toMatchObject({ left: 14, top: 72 })
    expect(getJourneyStageLayout('story')).toMatchObject({ left: 76, top: 52 })
  })

  it('prevents locked stages from being selected', () => {
    expect(canSelectJourneyStage({ status: 'locked' })).toBe(false)
    expect(canSelectJourneyStage({ status: 'active' })).toBe(true)
    expect(canSelectJourneyStage({ status: 'cleared' })).toBe(true)
  })

  it('builds a stable track path from stage ids', () => {
    const path = buildJourneyTrackPath([{ id: 'warm-up' }, { id: 'rhythm' }, { id: 'lyric' }])
    expect(path).toBe('M 14,72 L 33,58 L 55,37')
  })
})
