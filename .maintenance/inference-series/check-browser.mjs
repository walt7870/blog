import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = process.env.INFERENCE_PREVIEW_URL || 'http://127.0.0.1:5187/blog/'
const output = new URL(process.env.INFERENCE_EVIDENCE_DIR || './evidence/', import.meta.url)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const capture = { style: '.VPNav, .VPLocalNav { visibility: hidden !important; }' }
const errors = []
page.on('pageerror', e => errors.push(e.message))
const chapters = ['','01-landscape','02-lifecycle','03-memory','04-cache-attention','05-scheduling','06-quantization','07-speculative','08-vllm','09-sglang','10-distributed','11-speech','12-selection-versions','13-practice']
const results = []
const visit = async chapter => {
  await page.goto(`${root}docs/ai/inference-series/${chapter ? chapter + '.html' : ''}`)
  await page.locator('.VPDoc h1').waitFor()
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await page.evaluate(() => document.fonts.ready)
}
const reveal = async locator => locator.evaluate(el => {
  for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true
})
const assertCanvasPainted = async locator => {
  const painted = await locator.evaluate(canvas => {
    const context = canvas.getContext('2d')
    if (!context) return false
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    let varied = 0
    for (let i = 0; i < data.length; i += 16) if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2]) varied += 1
    return varied > 20
  })
  assert.equal(painted, true, 'canvas should contain drawn pixels')
}
try {
  for (const chapter of chapters) {
    await visit(chapter)
    assert.equal(await page.locator('.VPDoc h1').count(), 1)
    const badImages = await page.locator('.VPDoc img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src))
    assert.deepEqual(badImages, [])
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth }))
    assert.ok(dimensions.scroll <= dimensions.width, `${chapter} desktop overflow`)
    results.push({ chapter: chapter || 'index', desktop: dimensions })
    if (['', '01-landscape', '02-lifecycle', '03-memory', '04-cache-attention', '05-scheduling'].includes(chapter)) {
      await page.screenshot({ path: new URL(`${chapter || 'index'}-opening-desktop.png`, output).pathname })
    }
  }
  await visit('')
  await page.goto(`${root}docs/ai/precision/03-rounding-errors.html`)
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await assertCanvasPainted(page.locator('[data-mode="format"] canvas'))
  await page.locator('[data-mode="format"]').getByRole('button', { name: 'FP16' }).click()
  assert.match(await page.locator('.precision-caption').innerText(), /1.03515625/)
  await page.getByRole('button', { name: 'BF16', exact: true }).click()
  assert.match(await page.locator('.precision-caption').innerText(), /1.03125/)
  await page.getByRole('button', { name: 'FP8 E4M3', exact: true }).click()
  await page.getByLabel('输入数值').fill('1.0625')
  assert.match(await page.locator('.precision-caption').innerText(), /1.0625 → 1；/)
  await page.getByLabel('输入数值').fill('1.1')
  assert.match(await page.locator('.precision-caption').innerText(), /1.1 → 1.125/)
  await page.locator('.precision-canvas').screenshot({ path: new URL('precision-format-desktop.png', output).pathname })
  await page.goto(`${root}docs/ai/precision/04-mixed-precision.html`)
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await assertCanvasPainted(page.locator('[data-mode="pipeline"] canvas'))
  await page.getByRole('button', { name: 'W4A16', exact: true }).click()
  assert.match(await page.locator('.precision-caption').innerText(), /KV BF16/)
  await page.getByLabel('KV 使用 FP8').check()
  assert.match(await page.locator('.precision-caption').innerText(), /KV FP8/)
  await page.locator('.precision-canvas').screenshot({ path: new URL('precision-config-desktop.png', output).pathname })
  await visit('')
  const journey = page.locator('.journey')
  for (const [stage, count] of [['基础概念', 2], ['资源与状态', 3], ['优化机制', 4], ['工程实践', 4]]) {
    await journey.getByRole('button').filter({ hasText: stage }).click()
    await page.waitForFunction(n => document.querySelectorAll('.journey a').length === n, count)
    assert.equal(await journey.locator('a').count(), count)
  }
  await visit('01-landscape')
  const roles = page.locator('[data-intuition="roles"]')
  await roles.getByRole('button').filter({ hasText: '推理引擎' }).click()
  assert.match(await roles.locator('.role-detail').innerText(), /这一轮推进哪些请求/)
  await roles.getByRole('button').filter({ hasText: '返回应用' }).click()
  assert.match(await roles.locator('.role-detail').innerText(), /校验身份、权限/)
  await roles.screenshot({ path: new URL('roles-desktop.png', output).pathname })
  await visit('03-memory')
  const desk = page.locator('[data-intuition="desk"]')
  for (const [name, value] of [['1 人 · 短对话', '19.03 / 48'], ['1 人 · 8K 资料', '19.90 / 48'], ['32 人 · 各自 8K', '50.90 / 48']]) {
    await desk.getByRole('button', { name, exact: true }).click()
    assert.ok((await desk.innerText()).includes(value))
  }
  await desk.screenshot({ path: new URL('desk-desktop.png', output).pathname })
  await visit('04-cache-attention')
  const notes = page.locator('[data-intuition="notes"]')
  assert.match(await notes.innerText(), /4 \+ 1 \+ 1 = 6/)
  await notes.getByRole('button', { name: '每轮从头算 K/V' }).click()
  assert.match(await notes.innerText(), /4 \+ 5 \+ 6 = 15/)
  await notes.getByRole('button', { name: '保留历史 K/V' }).click()
  await notes.screenshot({ path: new URL('notes-desktop.png', output).pathname })
  await visit('02-lifecycle')
  const generation = page.locator('[data-lab="generation"]')
  assert.match(await generation.innerText(), /当前最高的是“先”/)
  await generation.getByRole('button', { name: '选择最高项' }).click()
  assert.match(await generation.innerText(), /当前最高的是“提交”/)
  await generation.getByRole('button', { name: '选择最高项' }).click()
  assert.match(await generation.innerText(), /当前最高的是“申请”/)
  await generation.getByRole('button', { name: '选择最高项' }).click()
  assert.equal(await generation.getByRole('button', { name: '选择最高项' }).isDisabled(), true)
  await generation.getByRole('button', { name: '重新开始生成' }).click()
  assert.match(await generation.innerText(), /等待选择第一段/)
  await generation.screenshot({ path: new URL('generation-desktop.png', output).pathname })
  const life = page.locator('[data-lab="lifecycle"]')
  await reveal(life)
  await life.getByRole('button', { name: '下一步' }).click()
  assert.match(await life.innerText(), /活跃 KV：4 个位置/)
  await life.getByRole('button', { name: '下一步' }).click()
  assert.match(await life.innerText(), /活跃 KV：5 个位置/)
  await life.screenshot({ path: new URL('lifecycle-desktop.png', output).pathname })
  await life.getByRole('button', { name: '重新开始', exact: true }).click()
  assert.match(await life.innerText(), /活跃 KV：0 个位置/)
  await life.getByRole('button', { name: '重新开始', exact: true }).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  assert.match(await life.innerText(), /活跃 KV：4 个位置/)

  await visit('03-memory')
  const memory = page.locator('[data-lab="memory"]')
  await reveal(memory)
  assert.match(await memory.innerText(), /50.9 \/ 48 GiB/)
  await memory.getByLabel('独立序列数').fill('1')
  assert.match(await memory.innerText(), /19.9 \/ 48 GiB/)
  await memory.getByLabel('层数', { exact: true }).fill('0')
  assert.match(await memory.innerText(), /有效数字/)
  await memory.getByLabel('层数', { exact: true }).fill('32')
  await memory.screenshot({ path: new URL('memory-desktop.png', output).pathname })

  await visit('04-cache-attention')
  const prefix = page.locator('[data-lab="prefix"]')
  assert.match(await prefix.innerText(), /相同前缀 7 token → 完整页可复用 4/)
  await prefix.getByLabel('完整页粒度').selectOption('1')
  assert.match(await prefix.innerText(), /完整页可复用 7/)
  await prefix.getByRole('button', { name: '改动开头' }).click()
  assert.match(await prefix.innerText(), /完整页可复用 0/)
  await prefix.getByRole('button', { name: '只改末尾' }).click()
  await prefix.getByLabel('完整页粒度').selectOption('4')
  assert.match(await prefix.innerText(), /完整页可复用 8/)
  await prefix.screenshot({ path: new URL('prefix-desktop.png', output).pathname })

  await visit('05-scheduling')
  const batch = page.locator('[data-lab="batch"]')
  assert.match(await batch.innerText(), /完成需 13 轮/)
  assert.match(await batch.innerText(), /完成需 10 轮/)
  await batch.locator('input[type="range"]').fill('13')
  await batch.screenshot({ path: new URL('batch-desktop.png', output).pathname })
  await batch.getByLabel('活跃序列上限').selectOption('3')
  assert.equal(await batch.locator('input[type="range"]').inputValue(), '0')

  await visit('07-speculative')
  const spec = page.locator('[data-lab="speculative"]')
  await spec.getByRole('button', { name: '提出草稿' }).click()
  await spec.getByRole('button', { name: '目标验证' }).click()
  assert.match(await spec.innerText(), /匹配 2 个/)
  await spec.getByRole('button', { name: '提交结果' }).click()
  assert.match(await spec.innerText(), /本轮提交 3 个 token/)
  await spec.screenshot({ path: new URL('speculative-desktop.png', output).pathname })
  await spec.getByLabel('草稿错误位置').selectOption('-1')
  for (const name of ['提出草稿','目标验证','提交结果']) await spec.getByRole('button', { name }).click()
  assert.match(await spec.innerText(), /本轮提交 5 个 token/)

  await visit('11-speech')
  const speech = page.locator('[data-lab="speech"]')
  assert.match(await speech.innerText(), /首个可播放音频约 930 ms/)
  await speech.getByRole('button', { name: '等待完整文本与音频' }).click()
  assert.match(await speech.innerText(), /首个可播放音频约 2330 ms/)
  await speech.screenshot({ path: new URL('speech-desktop.png', output).pathname })
  await speech.getByRole('button', { name: '文本与音频均分块' }).click()
  assert.equal(await speech.locator('input:disabled').count(), 2)

  await visit('03-memory')
  const roof = page.locator('[data-lab="roofline"]')
  await reveal(roof)
  assert.match(await roof.innerText(), /本轮耗时至少 7.00 ms/)
  await roof.getByLabel('本轮序列数').fill('128')
  assert.match(await roof.innerText(), /17.92 ms/)

  await page.setViewportSize({ width: 390, height: 844 })
  for (const chapter of chapters) {
    await visit(chapter)
    await page.locator('.inference-figure img').evaluateAll(async imgs => {
      await Promise.all(imgs.map(img => img.decode()))
    })
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth }))
    assert.equal(dimensions.width, 390)
    assert.ok(dimensions.scroll <= 390, `${chapter} mobile overflow: ${dimensions.scroll}`)
    results.find(r => r.chapter === (chapter || 'index')).mobile = dimensions
    assert.deepEqual(await page.locator('.inference-figure img').evaluateAll(imgs => imgs.filter(img => !img.currentSrc.endsWith('-mobile.svg') || img.naturalWidth !== 480).map(img => img.currentSrc)), [], `${chapter} mobile figure source`)
    if (['', '01-landscape', '02-lifecycle', '03-memory', '04-cache-attention', '05-scheduling'].includes(chapter)) {
      await page.screenshot({ path: new URL(`${chapter || 'index'}-opening-mobile.png`, output).pathname })
    }
    if (['01-landscape', '02-lifecycle', '03-memory', '04-cache-attention', '05-scheduling', '07-speculative', '11-speech'].includes(chapter)) {
      const lab = page.locator('.intuition, .inference-lab').filter({ visible: true }).first()
      await lab.screenshot({ path: new URL(`${chapter}-mobile.png`, output).pathname, ...capture })
      const inputs = lab.locator('input,button,select,textarea')
      for (let i = 0; i < await inputs.count(); i++) {
        const b = await inputs.nth(i).boundingBox()
        assert.ok(b.x >= 0 && b.x + b.width <= 390, `${chapter} clipped control`)
      }
    }
  }
  await visit('11-speech')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.locator('[data-lab="speech"]').screenshot({ path: new URL('speech-mobile-dark.png', output).pathname, ...capture })
  await visit('04-cache-attention')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.locator('[data-intuition="notes"]').screenshot({ path: new URL('notes-mobile-dark.png', output).pathname, ...capture })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit('03-memory')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await reveal(page.locator('[data-lab="memory"]'))
  await page.locator('[data-lab="memory"]').screenshot({ path: new URL('memory-desktop-dark.png', output).pathname })
  await page.locator('[data-intuition="desk"]').screenshot({ path: new URL('desk-desktop-dark.png', output).pathname })
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  const extraViewports = []
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const chapter of ['', '01-landscape', '03-memory', '04-cache-attention', '05-scheduling', '11-speech']) {
      await visit(chapter)
      const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth }))
      assert.equal(dimensions.width, width)
      assert.ok(dimensions.scroll <= width, `${chapter} overflow at ${width}`)
      extraViewports.push({ chapter: chapter || 'index', ...dimensions })
      const controls = page.locator('.intuition button, .journey button, .precision-controls button')
      for (const control of await controls.all()) {
        const b = await control.boundingBox()
        assert.ok(b && b.x >= 0 && b.x + b.width <= width, `${chapter} control at ${width}`)
        assert.equal(await control.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${chapter} button text at ${width}`)
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await visit('10-distributed')
  const diagram = page.locator('.VPDoc img').first()
  await diagram.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: '原尺寸查看' }).click()
  assert.equal(await page.locator('.image-lightbox img').evaluate(img => Math.round(img.getBoundingClientRect().width)), 1120)
  await page.screenshot({ path: new URL('diagram-mobile-zoom.png', output).pathname })
  await page.getByRole('button', { name: '关闭图片预览' }).click()
  await page.setViewportSize({ width: 1440, height: 1000 })

  await visit('13-practice')
  assert.equal(await page.getByRole('link', { name: '下载 measure_stream.py' }).getAttribute('href'), '/blog/ai/inference-series/measure_stream.py')
  assert.equal((await page.request.get(`${root}ai/inference-series/measure_stream.py`)).status(), 200)
  await page.goto(`${root}docs/ai/`)
  await page.locator('.doc-topic-directory').getByRole('link').filter({ hasText: '模型推理系列' }).click()
  await page.getByRole('heading', { name: '模型推理系列', exact: true }).waitFor()
  await page.locator('.journey').getByRole('link', { name: '02. 从输入到逐步生成', exact: true }).click()
  await reveal(page.locator('[data-lab="lifecycle"]'))
  await page.locator('[data-lab="lifecycle"]').getByRole('button', { name: '下一步' }).click()
  assert.match(await page.locator('[data-lab="lifecycle"]').innerText(), /活跃 KV：4 个位置/)
  await page.screenshot({ path: new URL('reading-desktop.png', output).pathname })
  const diagramResults = []
  for (const name of readdirSync(new URL('../../public/ai/inference-series/', import.meta.url)).filter(n => n.endsWith('.svg')).map(n => n.slice(0, -4))) {
    const response = await page.request.get(`${root}ai/inference-series/${name}.svg`)
    assert.equal(response.status(), 200)
    await page.goto('about:blank')
    await page.setContent(`<html lang="zh-CN"><style>body{margin:0}</style>${await response.text()}</html>`)
    await page.evaluate(() => document.fonts.ready)
    const checks = await page.evaluate(() => {
      const svg = document.querySelector('svg')
      const { width, height } = svg.viewBox.baseVal
      const overflow = [...svg.querySelectorAll('text')].filter(t => { const b = t.getBBox(); return b.x < 0 || b.y < 0 || b.x + b.width > width || b.y + b.height > height }).map(t => t.textContent)
      const boxOverflow = [...svg.querySelectorAll('g')].filter(g => g.firstElementChild?.tagName === 'rect').flatMap(g => {
        const rect = g.firstElementChild.getBBox()
        return [...g.querySelectorAll('text')].filter(t => { const b = t.getBBox(); return b.x < rect.x || b.x + b.width > rect.x + rect.width || b.y + b.height > rect.y + rect.height }).map(t => t.textContent)
      })
      return { width, height, overflow, boxOverflow }
    })
    await page.locator('svg').screenshot({ path: new URL(`${name}.png`, output).pathname })
    diagramResults.push({ name, ...checks })
  }
  assert.deepEqual(diagramResults.filter(r => r.overflow.length || r.boxOverflow.length), [], 'diagram text boundaries')
  assert.deepEqual(errors, [])
  writeFileSync(new URL('browser-results.json', output), JSON.stringify({ results, extraViewports, diagramResults, errors }, null, 2))
  console.log(JSON.stringify({ pages: results.length, dimensions: '1440×1000 / 390×844 / 320 / 768 / 1920', interactions: 11, diagrams: diagramResults.length, errors }))
} finally {
  await browser.close()
}
