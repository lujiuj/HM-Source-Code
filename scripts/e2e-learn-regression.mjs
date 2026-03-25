import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const DEV_HOST = process.env.E2E_DEV_HOST || process.env.VITE_DEV_HOST || 'localhost'
const BASE_URL = process.env.E2E_BASE_URL || `http://${DEV_HOST}:5173`
const API_URL = process.env.E2E_API_URL || `http://${DEV_HOST}:3000`
const OUT_DIR = path.join(process.cwd(), 'test-results', 'learn-regression')

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true })
}

async function saveScreenshot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage })
}

async function seedLocalData(page) {
  await page.evaluate(async () => {
    const uid = 'anon_design_user'
    const displayName = '戏迷测试官'
    localStorage.setItem('karaoke_anonymous_id', uid)
    localStorage.setItem('karaoke_display_name', displayName)

    const DB_NAME = 'hmx_local_store'
    const DB_VERSION = 2
    const STORES = {
      PRACTICE_SESSIONS: 'practice_sessions',
      WORKS: 'works',
      DANMAKU: 'danmaku',
      GIFTS: 'gifts',
      COMMENTS: 'comments',
      LEADERBOARDS: 'leaderboards',
      MEDIA: 'media',
      INTERACTION_EVENTS: 'interaction_events'
    }

    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onupgradeneeded = (event) => {
        const database = event.target.result

        if (!database.objectStoreNames.contains(STORES.PRACTICE_SESSIONS)) {
          const store = database.createObjectStore(STORES.PRACTICE_SESSIONS, { keyPath: 'id' })
          store.createIndex('userId_timestamp', ['userId', 'timestamp'], { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.WORKS)) {
          const store = database.createObjectStore(STORES.WORKS, { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.DANMAKU)) {
          const store = database.createObjectStore(STORES.DANMAKU, { keyPath: 'id' })
          store.createIndex('workId_timestamp', ['workId', 'timestamp'], { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.GIFTS)) {
          const store = database.createObjectStore(STORES.GIFTS, { keyPath: 'id' })
          store.createIndex('workId', 'workId', { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.COMMENTS)) {
          const store = database.createObjectStore(STORES.COMMENTS, { keyPath: 'id' })
          store.createIndex('workId', 'workId', { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.LEADERBOARDS)) {
          const store = database.createObjectStore(STORES.LEADERBOARDS, { keyPath: ['songId', 'userId'] })
          store.createIndex('songId_score', ['songId', 'score'], { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.MEDIA)) {
          const store = database.createObjectStore(STORES.MEDIA, { keyPath: 'id' })
          store.createIndex('userId', 'userId', { unique: false })
        }

        if (!database.objectStoreNames.contains(STORES.INTERACTION_EVENTS)) {
          const store = database.createObjectStore(STORES.INTERACTION_EVENTS, { keyPath: 'id' })
          store.createIndex('targetUserId_timestamp', ['targetUserId', 'timestamp'], { unique: false })
          store.createIndex('workId', 'workId', { unique: false })
        }
      }
      request.onsuccess = () => resolve(request.result)
    })

    const now = Date.now()
    const songId = 'tianxianpei-fuqishuangshuang'
    const guestWorkId = `${songId}__seed_guest`
    const practiceId = 'practice_seed_1'
    const demoAudioUrl = encodeURI('/music/《天仙配》选段_夫妻双双把家还_韩再芬.mp3')

    const payload = {
      [STORES.MEDIA]: [
        {
          id: 'media_seed_guest',
          userId: 'seed_guest',
          type: 'audio/mpeg',
          size: 0,
          timestamp: now - 86000,
          url: demoAudioUrl
        },
        {
          id: 'media_practice_1',
          userId: uid,
          type: 'audio/mpeg',
          size: 0,
          timestamp: now - 32000,
          url: demoAudioUrl
        }
      ],
      [STORES.WORKS]: [
        {
          id: guestWorkId,
          userId: 'seed_guest',
          username: '梨园戏友',
          songId,
          songName: '夫妻双双把家还',
          score: 92,
          totalScore: 92,
          averageScore: 92,
          lineCount: 12,
          stars: 5,
          grade: 'S',
          mediaId: 'media_seed_guest',
          timestamp: now - 84000,
          deletedAt: null
        },
        {
          id: `${songId}__seed_runner_up`,
          userId: 'seed_runner_up',
          username: '黄梅新秀',
          songId,
          songName: '夫妻双双把家还',
          score: 85,
          totalScore: 85,
          averageScore: 85,
          lineCount: 12,
          stars: 4,
          grade: 'A',
          mediaId: null,
          timestamp: now - 92000,
          deletedAt: null
        }
      ],
      [STORES.LEADERBOARDS]: [
        {
          songId,
          userId: 'seed_guest',
          username: '梨园戏友',
          score: 92,
          totalScore: 92,
          averageScore: 92,
          lineCount: 12,
          stars: 5,
          grade: 'S',
          workId: guestWorkId,
          timestamp: now - 84000
        },
        {
          songId,
          userId: 'seed_runner_up',
          username: '黄梅新秀',
          score: 85,
          totalScore: 85,
          averageScore: 85,
          lineCount: 12,
          stars: 4,
          grade: 'A',
          workId: `${songId}__seed_runner_up`,
          timestamp: now - 92000
        }
      ],
      [STORES.COMMENTS]: [
        {
          id: 'comment_seed_1',
          workId: guestWorkId,
          userId: 'seed_user_1',
          username: '青柠',
          text: '这首戏绝了！',
          likes: 6,
          timestamp: now - 62000,
          replyTo: null
        },
        {
          id: 'comment_seed_2',
          workId: guestWorkId,
          userId: 'seed_user_2',
          username: '旭旭',
          text: '明明初次听你唱歌，却有着相识的熟悉感',
          likes: 3,
          timestamp: now - 56000,
          replyTo: null
        }
      ],
      [STORES.DANMAKU]: [
        {
          id: 'danmaku_seed_1',
          workId: guestWorkId,
          userId: 'seed_user_3',
          username: '禾木',
          text: '送你小蛋糕 x5',
          timeMs: 11000,
          timestamp: now - 54000
        },
        {
          id: 'danmaku_seed_2',
          workId: guestWorkId,
          userId: 'seed_user_4',
          username: '戏迷甲',
          text: '有韵味，爱了爱了',
          timeMs: 19600,
          timestamp: now - 50000
        }
      ],
      [STORES.GIFTS]: [
        {
          id: 'gift_seed_1',
          workId: guestWorkId,
          userId: 'seed_user_5',
          username: '快来加入合唱',
          type: 'flower',
          count: 66,
          timestamp: now - 52000
        },
        {
          id: 'gift_seed_2',
          workId: guestWorkId,
          userId: 'seed_user_6',
          username: '200 鲜花',
          type: 'trophy',
          count: 95,
          timestamp: now - 48000
        }
      ],
      [STORES.PRACTICE_SESSIONS]: [
        {
          id: practiceId,
          userId: uid,
          songId,
          songName: '夫妻双双把家还',
          score: 87,
          totalScore: 87,
          averageScore: 87,
          lineCount: 12,
          voiceActivity: 86,
          pitchAccuracy: 84,
          stars: 4,
          grade: 'A',
          duration: 81,
          mediaId: 'media_practice_1',
          lineScores: [
            { lineIndex: 0, overall: 82, scores: { pitch: 80, rhythm: 83 } },
            { lineIndex: 1, overall: 88, scores: { pitch: 89, rhythm: 87 } },
            { lineIndex: 2, overall: 85, scores: { pitch: 83, rhythm: 86 } }
          ],
          timestamp: now - 26000,
          deletedAt: null
        }
      ]
    }

    const putStoreRows = async (storeName, rows) => {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        for (const row of rows) {
          store.put(row)
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    }

    for (const [storeName, rows] of Object.entries(payload)) {
      await putStoreRows(storeName, rows)
    }
  })
}

async function triggerRenameDialog(page, nextName, { accept }) {
  const dialogPromise = page
    .waitForEvent('dialog', { timeout: 4000 })
    .then(async (dialog) => {
      const message = dialog.message()
      if (accept) await dialog.accept()
      else await dialog.dismiss()
      return message
    })
    .catch(() => null)

  const input = page.locator('.nickname-input').first()
  await input.fill(nextName)
  await input.press('Enter')
  const message = await dialogPromise
  await page.waitForTimeout(200)
  const value = await input.inputValue()
  return { message, value }
}

async function run() {
  await ensureDir()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  const report = {
    at: new Date().toISOString(),
    health: null,
    aiHealth: null,
    renameConfirm: {},
    flow: {},
    checks: {},
    screenshots: []
  }

  try {
    const healthResp = await fetch(`${API_URL}/api/health`)
    report.health = await healthResp.json()

    const aiResp = await fetch(`${API_URL}/api/learn/smart-advice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'master-line', lineText: '树上的鸟儿成双对', metrics: { span: 4.8, phraseSeconds: 3.9, density: 2.1 } })
    })
    report.aiHealth = await aiResp.json()

    await page.goto(`${BASE_URL}/learn/practice`, { waitUntil: 'networkidle' })
    await seedLocalData(page)
    await page.reload({ waitUntil: 'networkidle' })
    await saveScreenshot(page, '01-practice-selection')
    report.screenshots.push('01-practice-selection.png')

    const nameInput = page.locator('.nickname-input').first()
    const originalName = await nameInput.inputValue()

    const cancelled = await triggerRenameDialog(page, '改名取消测试', { accept: false })
    const accepted = await triggerRenameDialog(page, '改名确认测试', { accept: true })

    report.renameConfirm = {
      originalName,
      cancelDialogSeen: Boolean(cancelled.message),
      cancelDialogText: cancelled.message,
      valueAfterCancel: cancelled.value,
      acceptDialogSeen: Boolean(accepted.message),
      acceptDialogText: accepted.message,
      valueAfterAccept: accepted.value
    }

    await page.locator('.song-card').first().click()
    await page.waitForSelector('.wesing-player', { timeout: 20000 })
    await page.waitForTimeout(1500)
    await saveScreenshot(page, '02-karaoke')
    report.screenshots.push('02-karaoke.png')

    await page.locator('.unified-btn.finish').click()
    await page.waitForSelector('.confirm-overlay', { timeout: 8000 })
    await page.locator('.confirm-btn.primary').click()
    await page.waitForSelector('text=发布工作台', { timeout: 20000 })
    await saveScreenshot(page, '03-publish-from-karaoke')
    report.screenshots.push('03-publish-from-karaoke.png')

    await page.goto(`${BASE_URL}/learn/practice/history/practice_seed_1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=发布工作台', { timeout: 10000 })
    await saveScreenshot(page, '04-publish')
    report.screenshots.push('04-publish.png')

    // Publish page - score & radar section
    const scoreText = await page.locator('text=得分').first().textContent().catch(() => '')
    const gradeText = await page.locator('.border-double').first().textContent().catch(() => '')
    const dimensionCount = await page.locator('.grid.grid-cols-3 > div').count()

    // Click publish button in header
    const publishBtn = page.locator('button:has-text("发布到社区")').first()
    await publishBtn.click()
    await page.waitForURL(/\/learn\/works\//, { timeout: 15000 })
    await page.waitForSelector('.min-h-screen', { timeout: 10000 })
    await page.waitForTimeout(1200)
    await saveScreenshot(page, '05-detail-after-publish')
    report.screenshots.push('05-detail-after-publish.png')

    const publishedUrl = page.url()

    await page.goto(`${BASE_URL}/learn/works/tianxianpei-fuqishuangshuang__seed_guest`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.min-h-screen', { timeout: 10000 })
    await page.waitForTimeout(1200)
    await saveScreenshot(page, '06-detail-seeded')
    report.screenshots.push('06-detail-seeded.png')

    // Check work detail page has audio player and interaction elements
    const hasAudioPlayer = await page.locator('audio').count() > 0
    const commentInputVisible = await page.locator('input[placeholder*="赏析"]').isVisible().catch(() => false)

    await page.goto(`${BASE_URL}/learn/practice/leaderboard?songId=tianxianpei-fuqishuangshuang`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.leaderboard-page', { timeout: 10000 })
    await saveScreenshot(page, '07-leaderboard')
    report.screenshots.push('07-leaderboard.png')

    const activeNavCount = await page.locator('.shell-nav .nav-pill.active').count()

    await page.goto(`${BASE_URL}/learn/analysis/tianxianpei-fuqishuangshuang`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=名师赏析', { timeout: 10000 })
    // Wait for lyric lines to appear (逐句赏析 section)
    await page.waitForSelector('.space-y-8 .cursor-pointer', { timeout: 10000 })
    await page.waitForTimeout(1000)

    // Click play button
    const playBtn = page.locator('button .material-symbols-outlined:has-text("play_arrow")').first()
    const playBtnVisible = await playBtn.isVisible().catch(() => false)

    // Click 2nd lyric line
    await page.locator('.space-y-8 .cursor-pointer').nth(1).click()
    await page.waitForTimeout(450)
    // Check if the line guide appeared (the border-l-2 guide panel)
    const lineGuideVisible = await page.locator('.border-l-2.border-primary\\/30').isVisible().catch(() => false)

    const layoutCheck = await page.evaluate(() => {
      const el = document.querySelector('main')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        right: rect.right,
        viewportWidth: window.innerWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
      }
    })

    await saveScreenshot(page, '08-master-analysis')
    report.screenshots.push('08-master-analysis.png')

    // Journey page
    await page.goto(`${BASE_URL}/learn/journey`, { waitUntil: 'networkidle' })
    await page.waitForSelector('text=学戏之路', { timeout: 10000 })
    await page.waitForTimeout(800)
    await saveScreenshot(page, '09-learning-journey')
    report.screenshots.push('09-learning-journey.png')

    // Master Library page
    await page.goto(`${BASE_URL}/learn/master`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.master-library', { timeout: 10000 })
    await page.waitForTimeout(800)
    const masterCardCount = await page.locator('.master-card').count()
    await saveScreenshot(page, '10-master-library')
    report.screenshots.push('10-master-library.png')

    report.flow = {
      scoreText,
      gradeText,
      dimensionCount,
      publishedUrl,
      hasAudioPlayer,
      commentInputVisible,
      playBtnVisible,
      lineGuideVisible,
      masterCardCount
    }

    report.checks = {
      publishRedirectToDetail: /\/learn\/works\//.test(publishedUrl),
      detailHasAudioPlayer: hasAudioPlayer,
      detailHasCommentInput: commentInputVisible,
      masterClickLineShowsGuide: lineGuideVisible,
      masterLayoutVisible: Boolean(layoutCheck && !layoutCheck.hasHorizontalOverflow),
      shellSingleActiveNav: activeNavCount === 1,
      songSelectHas3Cards: await page.goto(`${BASE_URL}/learn/practice`, { waitUntil: 'networkidle' })
        .then(() => page.locator('.song-card').count())
        .then(c => c === 3)
        .catch(() => false),
      masterLibraryHasCards: masterCardCount > 0
    }

    report.layout = layoutCheck
    report.consoleErrors = consoleErrors
  } catch (error) {
    report.error = {
      message: error?.message || String(error),
      stack: error?.stack || null
    }
  } finally {
    await browser.close()
  }

  await fs.writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8')

  if (report.error) {
    console.error('E2E failed:', report.error.message)
    process.exit(1)
  }

  console.log('E2E done. Report:', path.join(OUT_DIR, 'report.json'))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
