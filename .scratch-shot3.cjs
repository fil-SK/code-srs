const { chromium } = require('playwright')

const BASE = 'http://localhost:5173'
const SCRATCH = 'C:/Users/SK/AppData/Local/Temp/claude/c--Users-SK-Desktop-code-srs/c952bb0e-a37a-4094-9e5d-82c4c7403d93/scratchpad'
const SEED = `${SCRATCH}/seed-backup.json`
const OUT = `${SCRATCH}/deck-page-after.png`

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } })
  const errors = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Import JSON')
  await page.locator('input[type=file]').setInputFiles(SEED)
  await page.waitForSelector('text=Imported', { timeout: 15000 })
  console.log('Import status:', await page.locator('text=Imported').first().textContent())

  await page.goto(`${BASE}/decks/seed-deck-fundamentals`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Study Now', { timeout: 15000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: OUT, fullPage: true })
  console.log('Saved screenshot to', OUT)
  console.log('ERRORS:', JSON.stringify(errors))

  await browser.close()
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
