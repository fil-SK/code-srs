const { chromium } = require('playwright')

const BASE = 'http://localhost:5173'
const OUT_DIR = 'C:/Users/SK/AppData/Local/Temp/claude/c--Users-SK-Desktop-code-srs/5edeb08b-cf38-4158-a2a8-cf1cd28700f4/scratchpad'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } })
  const errors = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Import JSON')
  await page.locator('input[type=file]').setInputFiles(
    'C:/Users/SK/AppData/Local/Temp/claude/c--Users-SK-Desktop-code-srs/5edeb08b-cf38-4158-a2a8-cf1cd28700f4/scratchpad/seed-backup.json',
  )
  await page.waitForSelector('text=Imported', { timeout: 15000 })

  await page.goto(`${BASE}/decks/seed-deck-fundamentals`, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Study Now')

  // Type dropdown
  await page.locator('button:has-text("Type")').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT_DIR}/type-dropdown.png` })
  await page.keyboard.press('Escape')
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  // Status dropdown
  await page.locator('button:has-text("Status")').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT_DIR}/status-dropdown.png` })
  await page.locator('body').click({ position: { x: 5, y: 5 } })

  // Compact density toggle
  await page.locator('button[aria-label="Compact rows"]').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT_DIR}/compact-rows.png` })
  await page.locator('button[aria-label="Comfortable rows"]').click()

  // Shortcuts popover
  await page.locator('button:has-text("View keyboard shortcuts")').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT_DIR}/shortcuts-popover.png` })

  // Sort dropdown -> pick Due soon (switches to paginated branch, no grip)
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.locator('button:has-text("Sort: Manual")').click()
  await page.waitForTimeout(100)
  await page.locator('text=Due soon').click()
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${OUT_DIR}/sort-due-soon.png` })

  console.log('ERRORS:', JSON.stringify(errors))
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
