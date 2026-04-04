import {
  cloneDemo,
  demoCurrentUserId,
  getDemoInteractionsByWorkId,
  getDemoPracticeSessionById,
  getDemoPracticeSessions,
  getDemoWorkById,
  getDemoWorks,
  getDemoWorksBySongId
} from './learnDemoFixtures.js'

export { cloneDemo, demoCurrentUserId }

export function isDemoRouteId(value) {
  return String(value || '').startsWith('demo-')
}

export function resolveDemoPracticeSession(practiceId) {
  return cloneDemo(getDemoPracticeSessionById(practiceId))
}

export function resolveDemoPracticeSessions() {
  return getDemoPracticeSessions()
}

export function resolveDemoWork(workId) {
  return cloneDemo(getDemoWorkById(workId))
}

export function resolveDemoWorks() {
  return getDemoWorks()
}

export function resolveDemoWorksBySongId(songId) {
  return getDemoWorksBySongId(songId)
}

export function resolveDemoInteractions(workId) {
  return getDemoInteractionsByWorkId(workId)
}
