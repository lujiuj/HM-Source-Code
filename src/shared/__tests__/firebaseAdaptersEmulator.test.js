import { describe, it, expect, beforeEach, vi } from 'vitest'

import { FirebaseIdentityStore } from '../infra/firebase/FirebaseIdentityStore.js'
import { FirebaseMediaStore } from '../infra/firebase/FirebaseMediaStore.js'
import { FirebasePracticeStore } from '../infra/firebase/FirebasePracticeStore.js'
import { FirebaseWorksStore } from '../infra/firebase/FirebaseWorksStore.js'
import { FirebaseLeaderboardStore } from '../infra/firebase/FirebaseLeaderboardStore.js'
import { FirebaseInteractionStore } from '../infra/firebase/FirebaseInteractionStore.js'
import { auth, connectToEmulatorsIfEnabled, ensureAnonymousAuth, database, storage } from '../config/firebase.js'

const hasDatabaseEmulator = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST)
const hasStorageEmulator = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST)

beforeEach(() => {
  localStorage.clear()
})

describe('FirebaseIdentityStore (unit)', () => {
  it('returns cached displayName synchronously and trims input', async () => {
    const profileWriter = vi.fn(async () => {})
    const store = new FirebaseIdentityStore({
      auth: { currentUser: { uid: 'test_uid' } },
      database,
      profileWriter
    })

    expect(store.getDisplayName()).toBe('')
    await store.setDisplayName('  张三  ')
    expect(store.getDisplayName()).toBe('张三')
    expect(profileWriter).toHaveBeenCalledTimes(1)
    expect(profileWriter.mock.calls[0][0]).toMatchObject({
      uid: 'test_uid',
      profile: expect.objectContaining({ displayName: '张三' })
    })
  })
})

describe('FirebaseMediaStore (unit)', () => {
  it('uploads to works/{songId}/{uid}/current.webm and returns storagePath as id', async () => {
    const uploader = vi.fn(async ({ storagePath }) => `https://example.test/${storagePath}`)

    const store = new FirebaseMediaStore({ uploader })

    const blob = new Blob(['hello'], { type: 'audio/webm' })
    const res = await store.storeMedia(blob, { userId: 'u1', songId: 's1', type: blob.type })

    expect(uploader).toHaveBeenCalledTimes(1)
    expect(uploader.mock.calls[0][0]).toMatchObject({ storagePath: 'works/s1/u1/current.webm' })
    expect(res).toEqual({ id: 'works/s1/u1/current.webm', url: 'https://example.test/works/s1/u1/current.webm' })
  })

  it('rejects uploads larger than 30MB', async () => {
    const uploader = vi.fn(async () => 'https://example.test')
    const store = new FirebaseMediaStore({ uploader })

    const tooLarge = { size: 31 * 1024 * 1024, type: 'audio/webm' }
    await expect(store.storeMedia(tooLarge, { userId: 'u1', songId: 's1', type: 'audio/webm' })).rejects.toThrow(
      /file too large/i
    )
    expect(uploader).toHaveBeenCalledTimes(0)
  })
})

describe('FirebasePracticeStore (unit)', () => {
  it('saves sessions and lists them by timestamp desc', async () => {
    const memory = {}
    const store = new FirebasePracticeStore({
      sessionWriter: async ({ uid, practiceId, session }) => {
        if (!memory[uid]) memory[uid] = {}
        memory[uid][practiceId] = session
      },
      allReader: async (uid) => memory[uid] || null
    })

    await store.savePracticeSession('u1', {
      songId: 's1',
      songName: 'Song 1',
      score: 81,
      timestamp: 1
    })

    await store.savePracticeSession('u1', {
      songId: 's2',
      songName: 'Song 2',
      score: 91,
      timestamp: 2
    })

    const sessions = await store.listPracticeSessions('u1')
    expect(sessions.length).toBe(2)
    expect(sessions[0].songId).toBe('s2')
    expect(sessions[1].songId).toBe('s1')
    expect(sessions[0].userId).toBe('u1')
  })

  it('deletePracticeSession removes linked media', async () => {
    const deletedMediaIds = []
    const store = new FirebasePracticeStore({
      sessionReader: async () => ({ mediaId: 'works/s1/u1/current.webm' }),
      sessionRemover: async () => {},
      mediaStore: {
        deleteMedia: async (mediaId) => {
          deletedMediaIds.push(mediaId)
        }
      }
    })

    await store.deletePracticeSession('u1', 'p1')
    expect(deletedMediaIds).toEqual(['works/s1/u1/current.webm'])
  })

  it('enforceRetention removes oldest overflow records', async () => {
    const memory = {
      u1: {
        p1: { id: 'p1', timestamp: 1 },
        p2: { id: 'p2', timestamp: 2 },
        p3: { id: 'p3', timestamp: 3 }
      }
    }

    const removed = []
    const store = new FirebasePracticeStore({
      allReader: async (uid) => memory[uid] || null,
      sessionReader: async ({ uid, practiceId }) => memory[uid]?.[practiceId] || null,
      sessionRemover: async ({ uid, practiceId }) => {
        removed.push(practiceId)
        delete memory[uid][practiceId]
      }
    })

    const removedCount = await store.enforceRetention('u1', 2)
    expect(removedCount).toBe(1)
    expect(removed).toEqual(['p1'])
  })
})

describe('FirebaseWorksStore (unit)', () => {
  it('writes to learn/works/{songId}/{uid} and returns computed workId', async () => {
    const updater = vi.fn(async () => {})
    const store = new FirebaseWorksStore({ updater, database: {}, ref: () => 'root' })

    const workId = await store.publishWork('u1', {
      username: 'User',
      songId: 's1',
      songName: 'Song',
      score: 88,
      grade: 'A',
      stars: 4,
      mediaId: 'works/s1/u1/current.webm',
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 88 }]
    })

    expect(workId).toBe('s1__u1')
    expect(updater).toHaveBeenCalledTimes(1)
    const updates = updater.mock.calls[0][1]
    expect(Object.keys(updates)).toContain('learn/works/s1/u1')
    expect(updates['learn/works/s1/u1']).toMatchObject({
      lineScores: [{ lineIndex: 0, lineText: '第一句', overall: 88 }]
    })
  })

  it('softDeleteWork validates workId', async () => {
    const store = new FirebaseWorksStore({
      database,
      workReader: async () => ({ id: 's1__u1', userId: 'u1', songId: 's1', timestamp: 1 })
    })

    // Just validate it throws for invalid ids (happy path covered by emulator test)
    await expect(store.softDeleteWork(null, 1)).rejects.toThrow(/workId is required/i)
  })
})

describe('FirebaseLeaderboardStore (unit)', () => {
  it('sorts by score desc, then timestamp desc', async () => {
    const store = new FirebaseLeaderboardStore({
      listReader: async () => ({
        a: { userId: 'a', username: 'A', score: 90, timestamp: 1 },
        b: { userId: 'b', username: 'B', score: 90, timestamp: 3 },
        c: { userId: 'c', username: 'C', score: 10, timestamp: 2 }
      })
    })

    const res = await store.listBySong('s1', 2)
    expect(res.map(r => r.userId)).toEqual(['b', 'a'])
  })
})

describe('FirebaseInteractionStore (unit)', () => {
  it('writes danmaku under learn/interactions/{songId}/{ownerUid} and ensures timeMs', async () => {
    const poster = vi.fn(async () => 'd1')
    const store = new FirebaseInteractionStore({ poster })

    const workId = 's1__u1'
    const id = await store.sendDanmaku(workId, {
      userId: 'u1',
      username: 'User',
      text: 'hello',
      timestamp: 123
    })

    expect(id).toBe('d1')
    expect(poster).toHaveBeenCalledTimes(1)
    expect(poster.mock.calls[0][0]).toBe('learn/interactions/s1__u1/danmaku')
    expect(poster.mock.calls[0][1]).toMatchObject({
      workId,
      userId: 'u1',
      username: 'User',
      text: 'hello',
      timestamp: 123,
      timeMs: 0
    })
  })

  it('creates comments with likes=0 and replyTo normalized', async () => {
    const poster = vi.fn(async () => 'c1')
    const store = new FirebaseInteractionStore({ poster })

    const workId = 's1__u1'
    const id = await store.addComment(workId, {
      userId: 'u1',
      username: 'User',
      text: 'comment',
      replyTo: '',
      timestamp: 1
    })

    expect(id).toBe('c1')
    expect(poster).toHaveBeenCalledTimes(1)
    expect(poster.mock.calls[0][0]).toBe('learn/interactions/s1__u1/comments')
    expect(poster.mock.calls[0][1]).toMatchObject({
      workId,
      userId: 'u1',
      username: 'User',
      text: 'comment',
      replyTo: null,
      likes: 0,
      timestamp: 1
    })
  })

  it('writes interaction event for gift/comment and marks selected events as read', async () => {
    const posted = []
    const poster = vi.fn(async (path, value) => {
      posted.push({ path, value })
      if (path.includes('/gifts')) return 'g1'
      if (path.includes('/comments')) return 'c1'
      if (path.includes('interactionEvents')) return `evt_${posted.length}`
      return 'id'
    })

    const updater = vi.fn(async () => {})
    const getter = vi.fn(async (path) => {
      if (path === 'learn/interactionEvents/owner_1') {
        return {
          e1: {
            type: 'gift_sent',
            targetUserId: 'owner_1',
            workId: 's1__owner_1',
            timestamp: 200,
            actorSnapshot: { userId: 'u2', username: 'B' },
            giftCount: 2
          },
          e2: {
            type: 'comment_created',
            targetUserId: 'owner_1',
            workId: 's1__owner_1',
            timestamp: 100,
            actorSnapshot: { userId: 'u3', username: 'C' },
            commentText: 'nice'
          }
        }
      }
      return {}
    })

    const store = new FirebaseInteractionStore({ poster, getter, updater })
    const workId = 's1__owner_1'

    await store.sendGift(workId, {
      userId: 'viewer_1',
      username: 'Viewer',
      avatar: 'preset:camellia',
      type: 'flower',
      count: 2,
      targetUserId: 'owner_1',
      timestamp: 10
    })

    await store.addComment(workId, {
      userId: 'viewer_2',
      username: 'Viewer2',
      avatar: 'preset:lotus',
      text: '厉害',
      targetUserId: 'owner_1',
      timestamp: 11
    })

    const eventWrites = posted.filter((item) => item.path === 'learn/interactionEvents/owner_1')
    expect(eventWrites.length).toBe(2)
    expect(eventWrites.some((item) => item.value.type === 'gift_sent')).toBe(true)
    expect(eventWrites.some((item) => item.value.type === 'comment_created')).toBe(true)

    const events = await store.listInteractionEvents('owner_1', 10)
    expect(events.length).toBe(2)
    expect(events[0].timestamp).toBeGreaterThanOrEqual(events[1].timestamp)

    await store.markInteractionEventsRead('owner_1', ['e1'], 777)
    expect(updater).toHaveBeenCalledWith('learn/interactionEvents/owner_1', { 'e1/readAt': 777 })
  })

  it('does not write interaction event for self action', async () => {
    const poster = vi.fn(async () => 'id')
    const store = new FirebaseInteractionStore({ poster })
    const workId = 's1__u1'

    await store.addComment(workId, {
      userId: 'u1',
      username: 'User',
      text: 'self',
      targetUserId: 'u1',
      timestamp: 1
    })

    const eventWrites = poster.mock.calls.filter((call) => String(call[0]).includes('interactionEvents'))
    expect(eventWrites.length).toBe(0)
  })
})

const describeEmulators = hasDatabaseEmulator ? describe : describe.skip
const describeStorageEmulators = hasStorageEmulator ? describe : describe.skip

describeEmulators('Firebase adapters (emulators)', () => {
  it(
    'setDisplayName writes profile to RTDB learn/profiles/{uid}',
    async () => {
      connectToEmulatorsIfEnabled()
      await ensureAnonymousAuth()

      const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
      expect(host).toBeTruthy()

      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT ||
        process.env.PROJECT_ID ||
        'demo-yellow-play'
      
      const ns = `${projectId}-default-rtdb`

      const uid = auth.currentUser?.uid
      expect(uid).toBeTruthy()
      const idToken = await auth.currentUser.getIdToken()

      const url = `http://${host}/learn/profiles/${uid}.json?ns=${encodeURIComponent(ns)}&auth=${encodeURIComponent(idToken)}`

      const profileWriter = async ({ profile, updatedAt }) => {
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...(profile || {}), updatedAt })
        })
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(`RTDB emulator PATCH failed: ${res.status} ${res.statusText} ${text}`)
        }
      }

      const store = new FirebaseIdentityStore({
        auth,
        database,
        profileWriter
      })

      await store.setDisplayName('Emu User')

      const readRes = await fetch(url)
      expect(readRes.ok).toBe(true)
      const data = await readRes.json()
      expect(data?.displayName).toBe('Emu User')
      expect(typeof data?.updatedAt).toBe('number')
    },
    20000
  )
})

describeEmulators('FirebaseWorksStore (emulators)', () => {
  it(
    'publishWork overwrites slot and softDeleteWork hides unless includeDeleted',
    async () => {
      connectToEmulatorsIfEnabled()
      await ensureAnonymousAuth()

      const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
      expect(host).toBeTruthy()

      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT ||
        process.env.PROJECT_ID ||
        'demo-yellow-play'
      const ns = `${projectId}-default-rtdb`

      const uid = auth.currentUser?.uid
      expect(uid).toBeTruthy()

      const idToken = await auth.currentUser.getIdToken()

      const baseQuery = `ns=${encodeURIComponent(ns)}&auth=${encodeURIComponent(idToken)}`

      async function put(path, body) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error(`RTDB PUT failed: ${res.status} ${res.statusText}`)
      }

      async function patch(path, body) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error(`RTDB PATCH failed: ${res.status} ${res.statusText}`)
      }

      async function getJson(path) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`)
        if (!res.ok) throw new Error(`RTDB GET failed: ${res.status} ${res.statusText}`)
        return await res.json()
      }

      const store = new FirebaseWorksStore({
        database,
        workWriter: async ({ songId, userId, work }) => {
          await put(`learn/works/${songId}/${userId}`, work)
        },
        workUpdater: async ({ songId, userId, patch: body }) => {
          await patch(`learn/works/${songId}/${userId}`, body)
        },
        workReader: async ({ songId, userId }) => {
          return await getJson(`learn/works/${songId}/${userId}`)
        },
        songWorksReader: async (songId) => {
          return await getJson(`learn/works/${songId}`)
        },
        allWorksReader: async () => {
          return await getJson('learn/works')
        }
      })
      const songId = 'emu_song_works'

      const base = {
        userId: uid,
        username: 'Emu User',
        songId,
        songName: 'Emu Song',
        score: 80,
        grade: 'C',
        stars: 3,
        mediaId: `works/${songId}/${uid}/current.webm`,
        timestamp: Date.now()
      }

      const workId1 = await store.publishWork(base)
      expect(workId1).toBe(`${songId}__${uid}`)

      const w1 = await store.getWork(workId1)
      expect(w1?.score).toBe(80)

      await store.publishWork({ ...base, score: 10, timestamp: base.timestamp + 1 })
      const w2 = await store.getWork(workId1)
      expect(w2?.score).toBe(10)

      const list1 = await store.listWorks({ songId })
      expect(list1.some(w => w.id === workId1)).toBe(true)

      await store.softDeleteWork(workId1, 123)

      const list2 = await store.listWorks({ songId })
      expect(list2.some(w => w.id === workId1)).toBe(false)

      const list3 = await store.listWorks({ songId, includeDeleted: true })
      const deleted = list3.find(w => w.id === workId1)
      expect(deleted?.deletedAt).toBe(123)
    },
    20000
  )
})

describeEmulators('FirebaseLeaderboardStore (emulators)', () => {
  it(
    'writes and reads leaderboard entry for current user',
    async () => {
      connectToEmulatorsIfEnabled()
      await ensureAnonymousAuth()

      const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
      expect(host).toBeTruthy()

      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT ||
        process.env.PROJECT_ID ||
        'demo-yellow-play'
      const ns = `${projectId}-default-rtdb`

      const uid = auth.currentUser?.uid
      expect(uid).toBeTruthy()

      const idToken = await auth.currentUser.getIdToken()
      const baseQuery = `ns=${encodeURIComponent(ns)}&auth=${encodeURIComponent(idToken)}`

      async function put(path, body) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error(`RTDB PUT failed: ${res.status} ${res.statusText}`)
      }

      async function getJson(path) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`)
        if (!res.ok) throw new Error(`RTDB GET failed: ${res.status} ${res.statusText}`)
        return await res.json()
      }

      async function listTopByScore(songId, limit) {
        const params = new URLSearchParams()
        params.set('ns', ns)
        params.set('auth', idToken)
        params.set('orderBy', '"score"')
        params.set('limitToLast', String(limit))
        const res = await fetch(
          `http://${host}/learn/leaderboard/${songId}.json?${params.toString()}`
        )
        if (!res.ok) throw new Error(`RTDB query failed: ${res.status} ${res.statusText}`)
        return await res.json()
      }

      const store = new FirebaseLeaderboardStore({
        database,
        entryWriter: async ({ songId, uid: u, entry }) => {
          await put(`learn/leaderboard/${songId}/${u}`, entry)
        },
        entryReader: async ({ songId, uid: u }) => {
          return await getJson(`learn/leaderboard/${songId}/${u}`)
        },
        listReader: async ({ songId, limit }) => {
          return await listTopByScore(songId, limit)
        },
        officialReader: async (songId) => {
          return await getJson(`learn/official/${songId}`)
        }
      })

      const songId = 'emu_song_leaderboard'

      await store.upsertBestBySong(songId, uid, {
        username: 'Emu User',
        score: 66,
        grade: 'C',
        stars: 3,
        workId: `${songId}__${uid}`
      })

      const mine = await store.getBySongAndUser(songId, uid)
      expect(mine?.score).toBe(66)

      const top = await store.listBySong(songId, 50)
      expect(top.length).toBe(1)
      expect(top[0].userId).toBe(uid)
    },
    20000
  )
})

describeEmulators('FirebaseInteractionStore (emulators)', () => {
  it(
    'writes and reads danmaku/gifts/comments (danmaku requires timeMs) and likes increments by 1',
    async () => {
      connectToEmulatorsIfEnabled()
      await ensureAnonymousAuth()

      const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST
      expect(host).toBeTruthy()

      const projectId =
        process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT ||
        process.env.PROJECT_ID ||
        'demo-yellow-play'
      const ns = `${projectId}-default-rtdb`

      const uid = auth.currentUser?.uid
      expect(uid).toBeTruthy()

      const idToken = await auth.currentUser.getIdToken()
      const baseQuery = `ns=${encodeURIComponent(ns)}&auth=${encodeURIComponent(idToken)}`

      async function put(path, body) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) throw new Error(`RTDB PUT failed: ${res.status} ${res.statusText}`)
      }

      function makeId(prefix) {
        const rand = Math.random().toString(36).slice(2, 8)
        return `${prefix}_${Date.now().toString(36)}_${rand}`
      }

      async function post(path, body) {
        const id = makeId('p')
        await put(`${path}/${id}`, body)
        return id
      }

      async function getJson(path) {
        const res = await fetch(`http://${host}/${path}.json?${baseQuery}`)
        if (!res.ok) throw new Error(`RTDB GET failed: ${res.status} ${res.statusText}`)
        return await res.json()
      }

      const store = new FirebaseInteractionStore({
        database,
        poster: post,
        getter: getJson,
        incrementer: async (path) => {
          const current = await getJson(path)
          const prev = typeof current === 'number' ? current : 0
          await put(path, prev + 1)
        }
      })

      const songId = 'emu_song_interactions'
      const workId = `${songId}__${uid}`

      const danmakuId = await store.sendDanmaku(workId, {
        userId: uid,
        username: 'Emu User',
        text: 'hello',
        timeMs: 1234,
        timestamp: Date.now()
      })
      expect(typeof danmakuId).toBe('string')

      const danmaku = await store.listDanmaku(workId, 200)
      expect(danmaku.some(d => d.id === danmakuId && d.timeMs === 1234)).toBe(true)

      const giftId = await store.sendGift(workId, {
        userId: uid,
        username: 'Emu User',
        type: 'flower',
        count: 1,
        timestamp: Date.now()
      })
      expect(typeof giftId).toBe('string')

      const gifts = await store.listGifts(workId, 50)
      expect(gifts.some(g => g.id === giftId && g.type === 'flower')).toBe(true)

      const commentId = await store.addComment(workId, {
        userId: uid,
        username: 'Emu User',
        text: 'nice',
        replyTo: null,
        timestamp: Date.now()
      })
      expect(typeof commentId).toBe('string')

      await store.replyComment(workId, {
        userId: uid,
        username: 'Emu User',
        text: 'reply',
        replyTo: commentId,
        timestamp: Date.now()
      })

      await store.likeComment(workId, commentId)

      const comments = await store.listComments(workId, 200)
      const baseComment = comments.find(c => c.id === commentId)
      expect(baseComment?.likes).toBe(1)
      expect(comments.some(c => c.replyTo === commentId)).toBe(true)
    },
    20000
  )
})

describeStorageEmulators('FirebaseMediaStore (emulators)', () => {
  it(
    'stores and deletes media at works/{songId}/{uid}/current.webm',
    async () => {
      connectToEmulatorsIfEnabled()
      await ensureAnonymousAuth()

      const uid = auth.currentUser?.uid
      expect(uid).toBeTruthy()

      const store = new FirebaseMediaStore({ storage })
      const blob = new Blob(['test-audio'], { type: 'audio/webm' })

      const songId = 'emu_song_media'

      const stored = await store.storeMedia(blob, { userId: uid, songId, type: blob.type })
      expect(stored.id).toBe(`works/${songId}/${uid}/current.webm`)
      expect(typeof stored.url).toBe('string')

      const fetchedUrl = await store.getMediaUrl(stored.id)
      expect(typeof fetchedUrl).toBe('string')

      await store.deleteMedia(stored.id)

      // Storage SDK may cache download URLs; verify deletion by attempting to fetch the URL.
      const downloadRes = await fetch(stored.url)
      expect(downloadRes.ok).toBe(false)
    },
    20000
  )
})
