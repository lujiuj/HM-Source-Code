import { test, expect } from 'vitest'
import { chromium } from 'playwright'

test.skip('KTA karaoke functionality test (manual e2e)', async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  
  const consoleMessages = []
  const consoleErrors = []
  
  // Listen for console messages
  page.on('console', (msg) => {
    const text = msg.text()
    consoleMessages.push({ type: msg.type(), text })
    if (msg.type() === 'error') {
      consoleErrors.push(text)
    }
  })
  
  // Navigate to the app
  console.log('Navigating to http://localhost:5178...')
  await page.goto('http://localhost:5178', { waitUntil: 'networkidle' })
  
  // Wait for page to fully load
  await page.waitForTimeout(2000)
  
  // Check if page loaded successfully
  console.log('Page title:', await page.title())
  console.log('Current URL:', page.url())
  
  // Navigate to learn page
  console.log('Navigating to /learn...')
  await page.goto('http://localhost:5178/learn', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  
  // Check if we're on the learn page
  const currentUrl = page.url()
  console.log('Current URL after navigation:', currentUrl)
  
  // Look for song cards
  const songCards = await page.locator('.song-card').all()
  console.log('Found song cards:', songCards.length)
  
  if (songCards.length > 0) {
    // Click on the first song to start karaoke
    console.log('Clicking on first song card...')
    await songCards[0].click()
    
    // Wait for karaoke to load
    await page.waitForTimeout(3000)
    
    console.log('URL after selecting song:', page.url())
    
    // Check if karaoke player is visible
    const karaokePlayer = await page.locator('.wesing-player').first()
    const isKaraokeVisible = await karaokePlayer.isVisible()
    console.log('Karaoke player visible:', isKaraokeVisible)
    
    // Check for pitch visualizer
    const pitchVisualizer = await page.locator('.pitch-visualizer-modern').first()
    const isPitchVisible = await pitchVisualizer.isVisible()
    console.log('Pitch visualizer visible:', isPitchVisible)
    
    // Check for lyrics display
    const lyricsDisplay = await page.locator('.lyrics-display').first()
    const isLyricsVisible = await lyricsDisplay.isVisible()
    console.log('Lyrics display visible:', isLyricsVisible)
    
    // Get lyrics content
    const lyricsContent = await page.locator('.lyric-line').all()
    console.log('Lyrics lines found:', lyricsContent.length)
    
    // Take a screenshot
    console.log('Taking screenshot...')
    await page.screenshot({ path: '/tmp/karaoke-screenshot.png', fullPage: true })
  }
  
  // Print all console messages
  console.log('\n=== Console Messages ===')
  consoleMessages.forEach((msg) => {
    console.log(`[${msg.type}] ${msg.text}`)
  })
  
  console.log('\n=== Console Errors ===')
  if (consoleErrors.length === 0) {
    console.log('No errors found!')
  } else {
    consoleErrors.forEach((error) => {
      console.log(`ERROR: ${error}`)
    })
  }
  
  await browser.close()
  
  // Return results
  return {
    consoleMessages,
    consoleErrors,
    pageTitle: await page.title(),
    finalUrl: page.url()
  }
})
