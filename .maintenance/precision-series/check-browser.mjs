import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const root = process.env.PRECISION_PREVIEW_URL || 'http://127.0.0.1:5196/blog/'
const output = new URL('./evidence/', import.meta.url)
mkdirSync(output, { recursive: true })
const chapters = [
  ['', '模型数值精度'],
  ['01-number-storage', '01. 数字怎样存进计算机'],
  ['02-floating-formats', '02. FP32、FP16 与 BF16'],
  ['03-rounding-errors', '03. 舍入、溢出与计算误差'],
  ['04-mixed-precision', '04. 混合精度怎样计算'],
  ['05-quantization', '05. FP8、FP4 与整数量化'],
  ['06-choosing-precision', '06. 怎样选择与验证精度'],
]
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
const errors = []
const results = []
page.on('pageerror', error => errors.push(error.message))
const url = chapter => `${root}docs/ai/precision/${chapter ? chapter + '.html' : ''}`
const headingText = async () => (await page.locator('.VPDoc h1').innerText()).replace(/\u200b/g, '').trim()
const ready = async () => {
  await page.locator('.VPDoc h1').waitFor()
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.querySelectorAll('.VPDoc img')].map(img => { img.loading = 'eager'; return img.decode() }))
  })
}
const visit = async chapter => { await page.goto(url(chapter)); await ready() }
const painted = async () => {
  for (const canvas of await page.locator('.VPDoc canvas').all()) {
    assert.equal(await canvas.evaluate(el => {
      const pixels = el.getContext('2d').getImageData(0, 0, el.width, el.height).data
      let differences = 0
      for (let i = 0; i < pixels.length; i += 16) if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1] || pixels[i + 2] !== pixels[2]) differences++
      return differences > 20
    }), true, 'canvas contains drawn pixels')
  }
}
const checkLayout = async label => {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth }))
  assert.ok(dimensions.scroll <= dimensions.width, `${label}: document overflow ${dimensions.scroll}`)
  for (const control of await page.locator('.precision-canvas button, .precision-canvas input, .precision-canvas select, .quant-lab input, .accumulation-lab input').all()) {
    const box = await control.boundingBox()
    assert.ok(box && box.width > 0 && box.x >= 0 && box.x + box.width <= dimensions.width, `${label}: clipped control`)
    if (await control.evaluate(el => el.tagName === 'BUTTON')) assert.equal(await control.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true)
  }
  await painted()
  results.push({ label, ...dimensions })
}
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    for (const theme of ['light', 'dark']) {
      for (const [chapter, title] of chapters) {
        await visit(chapter)
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
        assert.equal(await headingText(), title)
        if (width === 1440) {
          const path = new URL(url(chapter)).pathname
          assert.equal((await page.locator(`.VPSidebar a[href="${path}"] .text`).innerText()).trim(), title)
        }
        await checkLayout(`${chapter || 'index'}-${width}-${theme}`)
        if (!chapter || chapter.startsWith('01-')) await page.screenshot({ path: new URL(`${chapter || 'index'}-${width}-${theme}.png`, output).pathname, fullPage: true })
        if (chapter === '06-choosing-precision') {
          await page.locator('.VPDoc table').first().screenshot({ path: new URL(`tradeoffs-${width}-${theme}.png`, output).pathname })
        }
        for (const lab of await page.locator('.precision-canvas, .quant-lab').all()) {
          await lab.screenshot({ path: new URL(`${chapter}-${width}-${theme}.png`, output).pathname, animations: 'disabled' })
        }
        if (chapter === '03-rounding-errors') await page.locator('.accumulation-lab').screenshot({ path: new URL(`accumulation-${width}-${theme}.png`, output).pathname })
        if (width === 390 && chapter.startsWith('01-')) assert.match(await page.locator('.number-encoding img').evaluate(img => img.currentSrc), /number-encoding-mobile.svg$/)
      }
    }
  }
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    for (const chapter of ['', '03-rounding-errors', '04-mixed-precision', '05-quantization', '06-choosing-precision']) {
      await visit(chapter)
      await checkLayout(`${chapter || 'index'}-${width}`)
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit('03-rounding-errors')
  const caption = page.locator('.precision-caption')
  assert.match(await caption.innerText(), /1.0351 → 1.03125/)
  await page.getByRole('button', { name: 'FP32', exact: true }).click()
  assert.match(await caption.innerText(), /1.035099983215332/)
  await page.getByRole('button', { name: 'FP16', exact: true }).click()
  assert.match(await caption.innerText(), /1.03515625/)
  await page.getByRole('button', { name: 'FP8 E4M3', exact: true }).click()
  await page.getByLabel('输入数值').fill('1.0625')
  assert.match(await caption.innerText(), /1.0625 → 1；/)
  await page.getByLabel('输入数值').fill('1.1')
  assert.match(await caption.innerText(), /1.1 → 1.125/)
  await page.getByLabel('观察范围').selectOption('1024')
  await page.getByRole('button', { name: 'FP16', exact: true }).click()
  assert.match(await caption.innerText(), /1024.25 → 1024；.*间距 1$/)
  await page.getByRole('button', { name: 'BF16', exact: true }).click()
  assert.match(await caption.innerText(), /1024.25 → 1024；.*间距 8$/)
  await page.getByRole('button', { name: 'FP32', exact: true }).click()
  assert.match(await caption.innerText(), /1024.25 → 1024.25/)
  await page.getByLabel('输入数值').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByLabel('输入数值').inputValue(), '1024.3')
  await page.locator('.precision-canvas').screenshot({ path: new URL('1024-spacing.png', output).pathname })
  await page.getByLabel('观察范围').selectOption('1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'BF16', exact: true }).click()
  const start = await page.locator('canvas').evaluate(el => el.toDataURL())
  await page.waitForTimeout(550)
  assert.notEqual(await page.locator('canvas').evaluate(el => el.toDataURL()), start, 'rounding marker animates')
  await painted()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const accumulation = page.locator('.accumulation-lab')
  for (let count = 0; count <= 8; count++) {
    await page.getByLabel('已经相加的次数').fill(String(count))
    const description = await accumulation.locator('svg').getAttribute('aria-label')
    assert.ok(description.includes('每步存 FP16 得 1024'))
    assert.ok(description.endsWith(`FP32 累加得 ${1024 + count * 0.25}`))
  }
  assert.match(await accumulation.innerText(), /最后转成 FP16，得到 1026/)
  await accumulation.screenshot({ path: new URL('accumulation-complete.png', output).pathname })

  await visit('04-mixed-precision')
  await page.getByRole('button', { name: 'W4A16', exact: true }).click()
  assert.match(await caption.innerText(), /KV BF16/)
  await page.getByLabel('KV 使用 FP8').check()
  assert.match(await caption.innerText(), /W4A16；KV FP8/)
  await painted()

  await visit('05-quantization')
  const lab = page.locator('.quant-lab')
  const recovered = lab.locator('dl > div').nth(2).locator('dd')
  assert.equal(await recovered.innerText(), '0.285714')
  assert.equal(await page.getByLabel('把大值分到另一组').isDisabled(), true)
  await page.getByLabel('同一组加入大值 20').check()
  assert.equal(await recovered.innerText(), '0')
  await page.getByLabel('把大值分到另一组').check()
  assert.equal(await recovered.innerText(), '0.285714')
  assert.match(await lab.innerText(), /从原始值重新量化/)
  await page.getByLabel('同一组加入大值 20').uncheck()
  assert.equal(await page.getByLabel('把大值分到另一组').isChecked(), false)
  assert.equal(await recovered.innerText(), '0.285714')
  await page.getByLabel('待保存的数').fill('2')
  assert.equal(await recovered.innerText(), '2')
  await page.getByLabel('待保存的数').focus()
  await page.keyboard.press('Home')
  assert.equal(await recovered.innerText(), '0')

  await page.goto(`${root}docs/ai/`)
  await ready()
  await page.locator('.doc-topic-directory').getByRole('link').filter({ hasText: '模型数值精度' }).click()
  await page.waitForURL(url(''))
  await page.waitForFunction(() => document.querySelector('.VPDoc h1')?.textContent.replace(/\u200b/g, '').trim() === '模型数值精度')
  await ready()
  assert.equal(page.url(), url(''))
  assert.equal(await page.locator('.pager-link.prev').count(), 0)
  for (const [chapter, title] of chapters.slice(1)) {
    await page.locator('.VPDoc a').filter({ hasText: title.replace(/^\d+\. /, '') }).first().click()
    await page.waitForURL(url(chapter))
    await page.waitForFunction(title => document.querySelector('.VPDoc h1')?.textContent.replace(/\u200b/g, '').trim() === title, title)
    await ready()
    assert.equal(await headingText(), title)
    const next = chapters[chapters.findIndex(([slug]) => slug === chapter) + 1]
    if (next) assert.equal(await page.locator('.pager-link.next .title').innerText(), next[1])
    else assert.equal(await page.locator('.pager-link.next').count(), 0)
  }
  const trainingLinks = await page.locator('.VPSidebar a[href*="/foundations/0"]').evaluateAll(links => links.map(link => ({ href: link.href, title: link.querySelector('.text').textContent.trim() })))
  assert.equal(trainingLinks.length, 8)
  for (const link of trainingLinks) {
    await page.goto(link.href)
    await ready()
    assert.equal(await headingText(), link.title)
  }
  for (const [legacy, target] of [['14-precision-formats', '02-floating-formats'], ['15-mixed-precision', '04-mixed-precision'], ['16-quantization-now', '05-quantization']]) {
    await page.goto(`${root}docs/ai/inference-series/${legacy}.html`)
    await ready()
    assert.equal(await page.locator('.VPDoc a').evaluateAll((links, targetURL) => links.some(link => link.href === targetURL), url(target)), true)
  }
  await visit('storage-atlas')
  await page.locator('.VPDoc').getByRole('link', { name: '精度取舍与使用场景分析', exact: true }).click()
  await page.waitForURL(`${url('06-choosing-precision')}#tradeoffs`)
  await page.waitForFunction(() => document.querySelector('.VPDoc h1')?.textContent.includes('06. 怎样选择与验证精度'))
  assert.equal(await page.locator('#tradeoffs').count(), 1)
  for (const [query, target] of [['FP32', '02-floating-formats'], ['混合精度', '04-mixed-precision']]) {
    await visit('')
    await page.locator('.VPNavBarSearch button').click()
    await page.locator('#localsearch-input').fill(query)
    const result = page.locator(`.VPLocalSearchBox a.result[href*="/precision/${target}"]`).first()
    await result.click()
    await page.waitForURL(`**/precision/${target}.html*`)
    await ready()
  }
  const script = await page.request.get(`${root}ai/precision/labs/precision_numbers.py`)
  assert.equal(script.status(), 200)
  assert.match(await script.text(), /import struct/)
  assert.ok((await script.body()).length < 2048)
  const resourcePage = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await resourcePage.goto(url('03-rounding-errors'))
  await resourcePage.locator('.accumulation-lab').waitFor()
  await resourcePage.evaluate(() => document.fonts.ready)
  const resources = await resourcePage.evaluate(() => performance.getEntriesByType('resource').map(resource => ({ url: resource.name, bytes: resource.encodedBodySize, transfer: resource.transferSize })))
  const featureResources = resources.filter(resource => /docs_ai_precision_03-rounding-errors|PrecisionCanvas/.test(resource.url))
  assert.ok(featureResources.length > 0)
  assert.ok(featureResources.reduce((sum, resource) => sum + resource.bytes, 0) < 80 * 1024, 'numeric experiment page modules stay below 80 KiB')
  assert.deepEqual(resources.filter(resource => /\.(safetensors|onnx|bin|mp4)(\?|$)/.test(resource.url)), [])
  await resourcePage.close()
  const diagrams = []
  for (const name of ['number-encoding', 'number-encoding-mobile']) {
    const response = await page.request.get(`${root}ai/precision/${name}.svg`)
    assert.equal(response.status(), 200)
    assert.ok((await response.body()).length < 4096, `${name}: SVG budget 4 KiB`)
    await page.goto('about:blank')
    await page.setContent(`<html lang="zh-CN"><style>body{margin:0}</style>${await response.text()}</html>`)
    await page.evaluate(() => document.fonts.ready)
    const overflow = await page.locator('svg').evaluate(svg => {
      const bounds = svg.viewBox.baseVal
      return [...svg.querySelectorAll('text')].filter(text => {
        const box = text.getBBox()
        return box.x < 0 || box.y < 0 || box.x + box.width > bounds.width || box.y + box.height > bounds.height
      }).map(text => text.textContent)
    })
    assert.deepEqual(overflow, [], `${name}: text outside SVG`)
    await page.locator('svg').screenshot({ path: new URL(`${name}.png`, output).pathname })
    diagrams.push(name)
  }
  assert.deepEqual(errors, [])
  const report = { root, layouts: results, checks: ['数值舍入', '数量级切换', '取偶边界', '逐次累加', '动画与减少动态效果', 'Canvas 像素', '权重与 KV 独立', '量化与重新分组', '键盘', '目录与逐篇跳转', '侧栏标题', '搜索', '旧入口', 'Python 下载', 'SVG 边界', '资源预算'], resourceScope: '本地 preview 冷上下文 HTTP 观察；不含线上传输推断，featureResources 仅列精度实验专属模块', featureResources, diagrams, errors }
  writeFileSync(new URL('browser-results.json', output), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ layouts: results.length, checks: report.checks, errors }))
} finally { await browser.close() }
