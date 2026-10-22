import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'

const root = process.env.BLOG_RELEASE_URL || 'http://127.0.0.1:5195/blog/'
const evidence = new URL('./evidence/release/', import.meta.url)
mkdirSync(evidence, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const errors = []
const checks = []
const chapters = ['', '01-what-models-learn', '02-python-and-environment', '03-data-task-and-split', '04-linear-prediction', '05-vectors-and-tensors', '06-loss-and-objective', '07-gradient-and-learning-rate', '08-first-training-loop', 'gradient-video-transcript']
const url = chapter => `${root}docs/ai/foundations/${chapter ? chapter + '.html' : ''}`
async function visit(page, chapter) {
  await page.goto(url(chapter))
  await page.locator('.VPDoc h1').waitFor()
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
}
async function pixels(page, bytes) {
  return page.evaluate(async base64 => {
    const image = new Image()
    image.src = 'data:image/png;base64,' + base64
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width; canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let varied = 0
    for (let i = 0; i < data.length; i += 4) {
      if (Math.max(Math.abs(data[i] - data[0]), Math.abs(data[i + 1] - data[1]), Math.abs(data[i + 2] - data[2])) > 25) varied++
    }
    return varied / (data.length / 4)
  }, bytes.toString('base64'))
}
try {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [390, 1440]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 900 })
    for (const chapter of chapters) {
      await visit(page, chapter)
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
      await page.locator('.VPDoc img').evaluateAll(async images => {
        images.forEach(image => { image.loading = 'eager' })
        await Promise.all(images.map(image => image.decode()))
      })
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
      assert.equal(dimensions.width, width)
      assert.ok(dimensions.scroll <= width, `${chapter}: ${JSON.stringify(dimensions)}`)
      checks.push({ chapter: chapter || 'index', width, dark })
    }
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const requests = []
    const track = request => requests.push(request.url())
    page.on('request', track)
    await visit(page, '07-gradient-and-learning-rate')
    const lab = page.locator('[data-foundation-lab="landscape"]')
    await lab.scrollIntoViewIfNeeded()
    assert.equal(requests.some(value => /three\.|\.mp4/.test(value)), false, 'heavy media loaded before selection')
    await lab.getByRole('button', { name: '执行一次参数更新' }).click()
    assert.match(await lab.innerText(), /2.7443/)
    await lab.getByRole('button', { name: '复位训练参数' }).click()
    await lab.getByLabel('学习率', { exact: true }).selectOption('1')
    await lab.getByRole('button', { name: '执行一次参数更新' }).click()
    assert.match(await lab.innerText(), /超出当前曲面范围/)
    await lab.getByRole('button', { name: '复位训练参数' }).click()
    await lab.getByLabel('学习率', { exact: true }).selectOption('0.1')
    await lab.getByRole('button', { name: '三维曲面', exact: true }).click()
    await lab.locator('.scene[data-ready="true"]').waitFor()
    const canvas = lab.locator('canvas')
    const before = await canvas.screenshot({ path: new URL(`surface-${width}.png`, evidence).pathname })
    assert.ok(await pixels(page, before) > 0.03, 'blank 3D surface')
    for (let angle = 1; angle <= 4; angle++) {
      await lab.getByRole('button', { name: '切换曲面观察角度' }).click()
      const after = await canvas.screenshot({ path: new URL(`surface-angle-${angle}-${width}.png`, evidence).pathname })
      assert.ok(await pixels(page, after) > 0.03, 'blank rotated surface')
      if (angle < 4) assert.notEqual(before.toString('base64'), after.toString('base64'), 'rotation did not change view')
      else assert.equal(before.toString('base64'), after.toString('base64'), 'full rotation changed framing')
    }
    await lab.getByRole('button', { name: '执行一次参数更新' }).click()
    assert.match(await lab.innerText(), /2.7443/)
    await lab.getByRole('button', { name: '等高线', exact: true }).click()
    assert.equal(await lab.locator('.scene > svg').isVisible(), true)
    page.off('request', track)
  }
  const video = page.locator('video')
  await video.scrollIntoViewIfNeeded()
  assert.equal(await video.getAttribute('preload'), 'none')
  await video.evaluate(async element => { element.muted = true; await element.play() })
  await page.waitForFunction(() => document.querySelector('video').currentTime > 0.3)
  await video.evaluate(element => element.pause())
  const media = await video.evaluate(element => ({ time: element.currentTime, duration: element.duration, captions: element.textTracks[0]?.mode }))
  assert.ok(media.duration > 450 && media.duration < 460)
  const response = await page.request.get(`${root}ai/foundations/video/gradient-learning-rate.mp4`, { headers: { Range: 'bytes=0-255' } })
  assert.equal(response.status(), 206)
  assert.equal((await response.body()).length, 256)

  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith('webgl')) return null
      return original.call(this, type, ...args)
    }
  })
  await visit(fallback, '07-gradient-and-learning-rate')
  const fallbackLab = fallback.locator('[data-foundation-lab="landscape"]')
  await fallbackLab.getByRole('button', { name: '三维曲面', exact: true }).click()
  await fallbackLab.getByText('当前环境无法显示三维', { exact: false }).waitFor()
  await fallbackLab.getByRole('button', { name: '执行一次参数更新' }).click()
  assert.match(await fallbackLab.innerText(), /2.7443/)
  await fallback.close()
  assert.deepEqual(errors, [])
  const report = { root, checks, surface: 'desktop/mobile nonblank, rotation and updates passed', fallback: 'WebGL unavailable, calculation preserved', media, errors }
  writeFileSync(new URL('results.json', evidence), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ pages: chapters.length, layouts: checks.length, surface: report.surface, fallback: report.fallback, media, errors }))
} finally { await browser.close() }
