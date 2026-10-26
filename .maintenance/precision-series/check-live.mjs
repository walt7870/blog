import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

const root = 'https://www.niuwancheng.cn/blog/'
const output = new URL('./evidence/live/', import.meta.url)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const errors = [], responses = [], results = []
page.on('pageerror', error => errors.push(error.message))
page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(root)) responses.push({ url: response.url(), status: response.status() }) })
async function ready() {
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await page.locator('.VPDoc h1').waitFor()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.querySelectorAll('.VPDoc img')].map(img => { img.loading = 'eager'; return img.decode() }))
  })
}
async function visit(path) { await page.goto(root + path); await ready() }
const chapters = ['', '01-number-storage', '02-floating-formats', '03-rounding-errors', '04-mixed-precision', '05-quantization', '06-choosing-precision', 'storage-atlas']
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const chapter of chapters) {
      await visit(`docs/ai/precision/${chapter ? chapter + '.html' : ''}`)
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), width === 390)
      const state = await page.evaluate(() => ({ title: document.querySelector('.VPDoc h1').textContent.replace(/\u200b/g, '').trim(), width: innerWidth, scroll: document.documentElement.scrollWidth, images: document.querySelectorAll('.VPDoc img').length }))
      assert.ok(state.scroll <= state.width, `${chapter} overflow`)
      assert.ok(!state.title.includes('NOT FOUND'))
      if (chapter === 'storage-atlas') {
        assert.equal(await page.locator('.storage-figure').count(), 28)
        if (width === 390) assert.match(await page.locator('.storage-figure img').first().evaluate(img => img.currentSrc), /mobile\.svg$/)
        await page.screenshot({ path: new URL(`atlas-${width}.png`, output).pathname })
        await page.locator('.VPDoc a[href*="06-choosing-precision"][href*="#tradeoffs"]').first().click()
        await page.waitForFunction(() => location.hash === '#tradeoffs' && document.querySelector('.VPDoc h1')?.textContent.includes('选择'))
        await page.locator('#tradeoffs').waitFor()
      }
      results.push({ chapter: chapter || 'index', ...state })
    }
  }
  await visit('docs/ai/precision/01-number-storage.html')
  await page.getByRole('button', { name: '第 7 位，位权 128，当前 0', exact: true }).click()
  assert.equal(await page.locator('.bit-byte-lab strong').innerText(), '133')
  await page.getByRole('button', { name: '第 0 位，位权 1，当前 1', exact: true }).focus()
  await page.keyboard.press('Space')
  assert.equal(await page.locator('.bit-byte-lab strong').innerText(), '132')
  await page.locator('.bit-byte-lab').screenshot({ path: new URL('bit-lab-mobile.png', output).pathname })
  await visit('docs/ai/precision/03-rounding-errors.html')
  await page.getByLabel('观察范围').selectOption('1024')
  await page.getByRole('button', { name: 'FP16', exact: true }).click()
  assert.match(await page.locator('.precision-caption').innerText(), /1024.25 → 1024；.*间距 1$/)
  const canvasPainted = await page.locator('.precision-canvas canvas').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < data.length; i += 16) if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2]) return true
    return false
  })
  assert.ok(canvasPainted)
  await page.locator('.precision-canvas').screenshot({ path: new URL('rounding-mobile.png', output).pathname })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit('docs/ai/')
  await page.locator('.doc-topic-directory a[href$="/docs/ai/precision/"]').click()
  await page.waitForFunction(() => document.querySelector('.VPDoc h1')?.textContent.trim().startsWith('模型数值精度'))
  await page.locator('.VPNavBarSearch button').click()
  await page.locator('.site-search .search-input').fill('常见数值格式存储图解')
  const searchResult = page.locator('.site-search a.result[href*="precision/storage-atlas"]').first()
  await searchResult.waitFor()
  await searchResult.click()
  await page.waitForFunction(() => document.querySelector('.VPDoc h1')?.textContent.includes('常见数值格式存储图解'))
  await visit('docs/ai/inference-series/14-precision-formats.html')
  await page.locator('.VPDoc a[href*="precision/"]').first().click()
  await page.waitForFunction(() => location.pathname.includes('/precision/') && document.querySelector('.VPDoc h1')?.textContent.includes('精度'))
  assert.deepEqual(errors, [])
  assert.deepEqual(responses, [])
  writeFileSync(new URL('results.json', output), JSON.stringify({ root, checkedAt: new Date().toISOString(), results, canvasPainted, errors, responses, interactions: ['bit-toggle', 'keyboard-toggle', 'rounding', 'atlas-to-tradeoffs', 'topic-entry', 'search', 'legacy-entry'] }, null, 2))
  console.log(JSON.stringify({ layouts: results.length, formats: 28, interactions: 7, errors, responses }))
} finally { await browser.close() }
