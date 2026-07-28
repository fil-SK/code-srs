const path = require('path')
const { chromium } = require('playwright')

const BASE = 'http://localhost:5173'
const SEED = 'C:/Users/SK/AppData/Local/Temp/claude/c--Users-SK-Desktop-code-srs/5edeb08b-cf38-4158-a2a8-cf1cd28700f4/scratchpad/seed-backup.json'
const OUT = 'C:/Users/SK/AppData/Local/Temp/claude/c--Users-SK-Desktop-code-srs/5edeb08b-cf38-4158-a2a8-cf1cd28700f4/scratchpad/deck-page.png'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } })
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text())
  })
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Import JSON')
  const fileInput = page.locator('input[type=file]')
  await fileInput.setInputFiles(SEED)
  await page.waitForSelector('text=Imported', { timeout: 15000 })
  console.log('Import status:', await page.locator('text=Imported').first().textContent())

  await page.goto(`${BASE}/decks/seed-deck-fundamentals`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Study Now', { timeout: 15000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: OUT, fullPage: true })
  console.log('Saved screenshot to', OUT)

  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
