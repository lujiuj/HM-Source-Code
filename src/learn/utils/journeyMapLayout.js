export const JOURNEY_MAP_LAYOUT = {
  'warm-up': { left: 14, top: 72, fogSize: 170 },
  rhythm: { left: 33, top: 58, fogSize: 182 },
  lyric: { left: 55, top: 37, fogSize: 194 },
  story: { left: 76, top: 52, fogSize: 206 },
  stage: { left: 88, top: 24, fogSize: 224 }
}

const FALLBACK_LAYOUTS = [
  { left: 14, top: 72, fogSize: 170 },
  { left: 33, top: 58, fogSize: 182 },
  { left: 55, top: 37, fogSize: 194 },
  { left: 76, top: 52, fogSize: 206 },
  { left: 88, top: 24, fogSize: 224 }
]

export function getJourneyStageLayout(stageId, index = 0) {
  return JOURNEY_MAP_LAYOUT[stageId] || FALLBACK_LAYOUTS[index % FALLBACK_LAYOUTS.length]
}

export function canSelectJourneyStage(stage) {
  return Boolean(stage) && String(stage.status || '') !== 'locked'
}

export function buildJourneyTrackPath(stages = []) {
  const points = stages
    .map((stage, index) => {
      const layout = getJourneyStageLayout(stage?.id, index)
      return `${layout.left},${layout.top}`
    })

  if (points.length <= 1) return ''
  return `M ${points.join(' L ')}`
}
