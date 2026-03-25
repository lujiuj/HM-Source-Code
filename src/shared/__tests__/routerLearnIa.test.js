import { describe, expect, it } from 'vitest'
import router from '../../router/index.js'

describe('Learn router', () => {
  it('keeps home page mounted at root', async () => {
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redirects /learn to /learn/practice', async () => {
    await router.push('/learn')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/learn/practice')
  })

  it('redirects retired routes into the learn module', async () => {
    await router.push('/watch')
    expect(router.currentRoute.value.path).toBe('/learn/practice')

    await router.push('/play')
    expect(router.currentRoute.value.path).toBe('/learn/practice')
  })

  it('resolves canonical learn module routes only', () => {
    expect(router.resolve('/learn/works').matched.length).toBeGreaterThan(0)
    expect(router.resolve('/learn/master').matched.length).toBeGreaterThan(0)
    expect(router.resolve('/learn/practice/leaderboard').matched.length).toBeGreaterThan(0)
    expect(router.resolve('/learn/practice/history').matched.length).toBeGreaterThan(0)
  })

  it('resolves canonical practice publish route', async () => {
    const practiceId = 'practice-1'
    await router.push(`/learn/practice/history/${practiceId}`)
    expect(router.currentRoute.value.name).toBe('LearnPracticePublish')
    expect(router.currentRoute.value.params.practiceId).toBe(practiceId)
  })

  it('resolves /learn/works/:workId with props', async () => {
    const workId = 'test-work-id'
    await router.push(`/learn/works/${workId}`)
    expect(router.currentRoute.value.name).toBe('LearnWorkDetail')
    expect(router.currentRoute.value.params.workId).toBe(workId)
  })
})
