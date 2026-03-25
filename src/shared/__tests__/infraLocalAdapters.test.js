import { describe, it, expect, beforeEach } from 'vitest'
import { LocalIdentityStore } from '../infra/local/LocalIdentityStore.js'
import { LocalPracticeStore } from '../infra/local/LocalPracticeStore.js'
import { LocalWorksStore } from '../infra/local/LocalWorksStore.js'
import { LocalInteractionStore } from '../infra/local/LocalInteractionStore.js'
import { LocalLeaderboardStore } from '../infra/local/LocalLeaderboardStore.js'
import { LocalMediaStore } from '../infra/local/LocalMediaStore.js'
import { getInfra, createInfra } from '../infra/index.js'
import { resetDBCache } from '../infra/local/indexedDBHelper.js'

beforeEach(() => {
  localStorage.clear()
  resetDBCache()
})

describe('LocalIdentityStore', () => {
  it('generates and persists anonymous uid', () => {
    const store = new LocalIdentityStore()
    const uid1 = store.getUid()
    const uid2 = store.getUid()
    
    expect(uid1).toBe(uid2)
    expect(uid1).toMatch(/^anon_/)
  })

  it('stores and retrieves display name', () => {
    const store = new LocalIdentityStore()
    
    expect(store.getDisplayName()).toBe('')
    
    store.setDisplayName('张三')
    expect(store.getDisplayName()).toBe('张三')
    
    store.setDisplayName('  李四  ')
    expect(store.getDisplayName()).toBe('李四')

    const profile = store.getProfile()
    expect(profile.displayName).toBe('李四')
    expect(profile.studyDays).toBe(0)

    const saved = store.saveProfile({
      studyDays: 3,
      preferences: { viewMode: 'list' },
      journey: { quizPassStageIds: ['rhythm'], quizPassLog: ['rhythm@2026-03-08'] }
    })

    expect(saved.studyDays).toBe(3)
    expect(saved.preferences.viewMode).toBe('list')
    expect(saved.journey.quizPassStageIds).toEqual(['rhythm'])
    expect(saved.journey.quizPassLog).toEqual(['rhythm@2026-03-08'])
  })
})

describe('LocalPracticeStore', () => {
  it('saves and lists practice sessions', async () => {
    const store = new LocalPracticeStore()
    const uid = 'test_user'
    
    const session1 = {
      songId: 'song1',
      songName: '女驸马',
      score: 85,
      voiceActivity: 80,
      pitchAccuracy: 90,
      stars: 4,
      grade: 'B'
    }
    
    const id = await store.savePracticeSession(uid, session1)
    expect(id).toBeTruthy()
    
    const sessions = await store.listPracticeSessions(uid)
    expect(sessions.length).toBe(1)
    expect(sessions[0].songId).toBe('song1')
    expect(sessions[0].score).toBe(85)
  })

  it('enforces retention limit', async () => {
    const store = new LocalPracticeStore()
    const uid = 'test_user'
    
    for (let i = 0; i < 55; i++) {
      await store.savePracticeSession(uid, {
        songId: `song${i}`,
        songName: `Song ${i}`,
        score: 70 + i,
        voiceActivity: 70,
        pitchAccuracy: 70,
        stars: 3,
        grade: 'C'
      })
    }
    
    const sessions = await store.listPracticeSessions(uid)
    expect(sessions.length).toBeLessThanOrEqual(50)
  })

  it('deletes associated media when enforcing retention', async () => {
    const uid = 'test_user_media_retention'
    const media = new LocalMediaStore()
    const store = new LocalPracticeStore({ mediaStore: media })

    const first = await media.storeMedia(new Blob(['first'], { type: 'audio/webm' }), {
      userId: uid,
      type: 'audio/webm'
    })

    await store.savePracticeSession(uid, {
      songId: 'song1',
      songName: '女驸马',
      score: 1,
      voiceActivity: 0,
      pitchAccuracy: 0,
      stars: 1,
      grade: 'C',
      mediaId: first.id,
      timestamp: 1
    })

    for (let i = 0; i < 55; i++) {
      const stored = await media.storeMedia(new Blob([`data-${i}`], { type: 'audio/webm' }), {
        userId: uid,
        type: 'audio/webm'
      })
      await store.savePracticeSession(uid, {
        songId: `song${i}`,
        songName: `Song ${i}`,
        score: 70 + i,
        voiceActivity: 70,
        pitchAccuracy: 70,
        stars: 3,
        grade: 'C',
        mediaId: stored.id,
        timestamp: 2 + i
      })
    }

    const sessions = await store.listPracticeSessions(uid)
    expect(sessions.length).toBeLessThanOrEqual(50)

    const shouldBeDeleted = await media.getMediaUrl(first.id)
    expect(shouldBeDeleted).toBe(null)
  })
})

describe('LocalLeaderboardStore', () => {
  it('overwrites per-user slot (overwrite anyway)', async () => {
    const store = new LocalLeaderboardStore()
    const songId = 'test_song_upsert'
    const uid = 'test_user_upsert'
    
    await store.upsertBestBySong(songId, uid, {
      username: '张三',
      score: 80,
      stars: 3,
      grade: 'B'
    })
    
    const board = await store.listBySong(songId)
    expect(board.length).toBe(1)
    expect(board[0].score).toBe(80)
    
    await store.upsertBestBySong(songId, uid, {
      username: '张三',
      score: 75,
      stars: 3,
      grade: 'C'
    })
    
    const board2 = await store.listBySong(songId)
    expect(board2[0].score).toBe(75)
    
    await store.upsertBestBySong(songId, uid, {
      username: '张三',
      score: 90,
      stars: 4,
      grade: 'A'
    })
    
    const board3 = await store.listBySong(songId)
    expect(board3[0].score).toBe(90)
  })

  it('lists top scores in descending order', async () => {
    const store = new LocalLeaderboardStore()
    const songId = 'test_song_multiuser'
    
    await store.upsertBestBySong(songId, 'test_user_a', {
      username: '张三',
      score: 80,
      stars: 3,
      grade: 'B'
    })
    
    await store.upsertBestBySong(songId, 'test_user_b', {
      username: '李四',
      score: 95,
      stars: 5,
      grade: 'S'
    })
    
    await store.upsertBestBySong(songId, 'test_user_c', {
      username: '王五',
      score: 70,
      stars: 2,
      grade: 'C'
    })
    
    const board = await store.listBySong(songId)
    expect(board.length).toBe(3)
    expect(board[0].score).toBe(95)
    expect(board[1].score).toBe(80)
    expect(board[2].score).toBe(70)
  })
})

describe('LocalWorksStore', () => {
  it('publishes and lists works', async () => {
    const store = new LocalWorksStore()
    
    const work1 = {
      userId: 'user1',
      username: '张三',
      songId: 'song1',
      songName: '女驸马',
      score: 85,
      timestamp: Date.now()
    }
    
    const workId = await store.publishWork(work1)
    expect(workId).toBeTruthy()
    
    const works = await store.listWorks()
    expect(works.length).toBe(1)
    expect(works[0].songId).toBe('song1')
    expect(works[0].deletedAt).toBeNull()
  })

  it('gets specific work by id', async () => {
    const store = new LocalWorksStore()
    
    const workId = await store.publishWork({
      userId: 'user1',
      username: '张三',
      songId: 'song1',
      songName: '女驸马',
      score: 85
    })
    
    const work = await store.getWork(workId)
    expect(work).toBeTruthy()
    expect(work.id).toBe(workId)
    expect(work.songId).toBe('song1')
  })

  it('soft delete hides work from public list', async () => {
    const store = new LocalWorksStore()
    
    const workId = await store.publishWork({
      userId: 'test_user_softdel',
      username: '张三',
      songId: 'test_song_softdel',
      songName: '女驸马',
      score: 85
    })
    
    let works = await store.listWorks({ userId: 'test_user_softdel' })
    expect(works.length).toBe(1)
    
    await store.softDeleteWork(workId, Date.now())
    
    works = await store.listWorks({ userId: 'test_user_softdel' })
    expect(works.length).toBe(0)
    
    works = await store.listWorks({ userId: 'test_user_softdel', includeDeleted: true })
    expect(works.length).toBe(1)
    expect(works[0].deletedAt).toBeTruthy()
  })

  it('filters works by userId and songId', async () => {
    const store = new LocalWorksStore()
    
    await store.publishWork({
      userId: 'test_filter_user1',
      username: '张三',
      songId: 'test_filter_song1',
      songName: '女驸马',
      score: 85
    })
    
    await store.publishWork({
      userId: 'test_filter_user2',
      username: '李四',
      songId: 'test_filter_song1',
      songName: '女驸马',
      score: 90
    })
    
    await store.publishWork({
      userId: 'test_filter_user1',
      username: '张三',
      songId: 'test_filter_song2',
      songName: '天仙配',
      score: 80
    })
    
    const user1Works = await store.listWorks({ userId: 'test_filter_user1' })
    expect(user1Works.length).toBe(2)
    
    const song1Works = await store.listWorks({ songId: 'test_filter_song1' })
    expect(song1Works.length).toBe(2)
    
    const user1Song1 = await store.listWorks({ userId: 'test_filter_user1', songId: 'test_filter_song1' })
    expect(user1Song1.length).toBe(1)
  })
})

describe('LocalInteractionStore', () => {
  it('sends and lists danmaku', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_danmaku_send'
    
    const danmakuId = await store.sendDanmaku(workId, {
      userId: 'user1',
      username: '张三',
      text: '唱得好！',
      timestamp: Date.now()
    })
    
    expect(danmakuId).toBeTruthy()
    
    const messages = await store.listDanmaku(workId)
    expect(messages.length).toBe(1)
    expect(messages[0].text).toBe('唱得好！')
  })

  it('enforces danmaku retention limit of 200', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_retention_250'
    const baseTime = Date.now()
    
    for (let i = 0; i < 250; i++) {
      await store.sendDanmaku(workId, {
        userId: 'user1',
        username: '张三',
        text: `Message ${i}`,
        timestamp: baseTime + i
      })
    }
    
    const messages = await store.listDanmaku(workId, 200)
    expect(messages.length).toBe(200)
    
    expect(messages[0].text).toBe('Message 50')
    expect(messages[199].text).toBe('Message 249')
  })

  it('danmaku retention keeps only latest messages', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_retention_210'
    const baseTime = 1000000
    
    for (let i = 0; i < 210; i++) {
      await store.sendDanmaku(workId, {
        userId: 'user1',
        username: 'User',
        text: `Msg${i}`,
        timestamp: baseTime + i * 1000
      })
    }
    
    const messages = await store.listDanmaku(workId)
    
    expect(messages.length).toBe(200)
    expect(messages[0].text).toBe('Msg10')
    expect(messages[messages.length - 1].text).toBe('Msg209')
    
    const timestamps = messages.map(m => m.timestamp)
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
    }
  })

  it('sends and lists gifts', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_gifts'

    await store.sendGift(workId, {
      userId: 'u1',
      username: '张三',
      type: 'flower',
      count: 1,
      timestamp: 10
    })
    await store.sendGift(workId, {
      userId: 'u2',
      username: '李四',
      type: 'trophy',
      count: 2,
      timestamp: 20
    })

    const gifts = await store.listGifts(workId)
    expect(gifts.length).toBe(2)
    expect(gifts[0].type).toBe('trophy')
    expect(gifts[1].type).toBe('flower')
  })

  it('adds comments, replies, and likes', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_comments'

    const c1 = await store.addComment(workId, {
      userId: 'u1',
      username: '张三',
      text: '唱得真好',
      replyTo: null,
      timestamp: 10
    })
    const r1 = await store.replyComment(workId, {
      userId: 'u2',
      username: '李四',
      text: '同感！',
      replyTo: c1,
      timestamp: 20
    })

    expect(c1).toBeTruthy()
    expect(r1).toBeTruthy()

    await store.likeComment(workId, c1)
    await store.likeComment(workId, c1)

    const comments = await store.listComments(workId)
    expect(comments.length).toBe(2)

    const top = comments.find(c => c.id === c1)
    const reply = comments.find(c => c.id === r1)
    expect(top.replyTo).toBe(null)
    expect(top.likes).toBe(2)
    expect(reply.replyTo).toBe(c1)
  })

  it('produces interaction events for comment and gift, then supports mark-read', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_events'
    const ownerId = 'owner_1'

    await store.addComment(workId, {
      userId: 'viewer_1',
      username: '甲',
      avatar: 'preset:camellia',
      text: '这句很稳',
      targetUserId: ownerId,
      timestamp: 100
    })

    await store.sendGift(workId, {
      userId: 'viewer_2',
      username: '乙',
      avatar: 'preset:lotus',
      type: 'flower',
      count: 3,
      targetUserId: ownerId,
      timestamp: 200
    })

    const events = await store.listInteractionEvents(ownerId, 10)
    expect(events.length).toBe(2)
    expect(events[0].type).toBe('gift_sent')
    expect(events[1].type).toBe('comment_created')
    expect(events[0].giftCount).toBe(3)
    expect(events[1].commentText).toBe('这句很稳')
    expect(events.every((item) => item.targetUserId === ownerId)).toBe(true)
    expect(events.every((item) => !item.readAt)).toBe(true)

    await store.markInteractionEventsRead(ownerId, [events[0].id], 999)
    const afterRead = await store.listInteractionEvents(ownerId, 10)
    const marked = afterRead.find((item) => item.id === events[0].id)
    const unmarked = afterRead.find((item) => item.id === events[1].id)
    expect(marked?.readAt).toBe(999)
    expect(unmarked?.readAt).toBe(null)
  })

  it('skips creating interaction event for self action', async () => {
    const store = new LocalInteractionStore()
    const workId = 'test_work_self_event'
    const sameUser = 'same_user'

    await store.addComment(workId, {
      userId: sameUser,
      username: '自己',
      text: '给自己评论',
      targetUserId: sameUser,
      timestamp: 1
    })

    const events = await store.listInteractionEvents(sameUser, 10)
    expect(events.length).toBe(0)
  })
})

describe('getInfra / createInfra', () => {
  it('creates infra with all stores', () => {
    const infra = createInfra('local')
    
    expect(infra.identity).toBeDefined()
    expect(infra.practice).toBeDefined()
    expect(infra.works).toBeDefined()
    expect(infra.interaction).toBeDefined()
    expect(infra.leaderboard).toBeDefined()
    expect(infra.media).toBeDefined()
  })

  it('getInfra returns singleton', () => {
    const infra1 = getInfra()
    const infra2 = getInfra()
    
    expect(infra1).toBe(infra2)
  })
})
