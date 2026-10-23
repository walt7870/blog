import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { storageFormats } from './storage-formats.mjs'

const root = process.env.PRECISION_PREVIEW_URL || 'http://127.0.0.1:5196/blog/'
const evidence = new URL('./evidence/storage/', import.meta.url)
mkdirSync(evidence, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
const figures = []
const layouts = []
const anchorTargets = new Set()
page.on('pageerror', e => errors.push(e.message))
const ready = async () => {
  await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  await page.evaluate(() => document.fonts.ready)
}
try {
  const atlas = readFileSync(new URL('../../docs/ai/precision/storage-atlas.md', import.meta.url), 'utf8')
  for (const format of storageFormats) {
    assert.ok(atlas.includes(`kind="${format.id}"`), `${format.id}: linked in atlas`)
    for (const suffix of ['', '-mobile']) {
      const name = format.id + suffix
      const response = await page.request.get(`${root}ai/precision/storage/${name}.svg`)
      assert.equal(response.status(), 200)
      assert.ok((await response.body()).length < 16 * 1024, `${name}: 16 KiB budget`)
      await page.goto('about:blank')
      await page.setViewportSize({ width: suffix ? 360 : 900, height: 1200 })
      await page.setContent(`<html><style>body{margin:0}svg{display:block}</style>${await response.text()}</html>`)
      await page.evaluate(() => document.fonts.ready)
      const issues = await page.locator('svg').evaluate(svg => {
        const bounds = svg.viewBox.baseVal
        const texts = [...svg.querySelectorAll('text')].map(el => ({ text: el.textContent, box: el.getBBox() }))
        const outside = texts.filter(({ box: b }) => b.x < 0 || b.y < 0 || b.x + b.width > bounds.width || b.y + b.height > bounds.height).map(t => t.text)
        const collisions = []
        for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i].box, b = texts[j].box
          if (Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1 && Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1) collisions.push([texts[i].text, texts[j].text])
        }
        return { outside, collisions }
      })
      assert.deepEqual(issues, { outside: [], collisions: [] }, name)
      if (['fp32', 'int64', 'nvfp4', 'gguf-q4-k', 'fp8-e4m3fn', 'fp4-e2m1', 'int4'].includes(format.id)) {
        await page.locator('svg').screenshot({ path: new URL(`${name}.png`, evidence).pathname })
      }
      figures.push(name)
    }
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const dark of [false, true]) {
      for (const chapter of ['01-number-storage', '02-floating-formats', '05-quantization', 'storage-atlas']) {
        await page.goto(`${root}docs/ai/precision/${chapter}.html`)
        await ready()
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark)
        await page.evaluate(() => document.querySelectorAll('.VPDoc details').forEach(el => el.open = true))
        await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('.VPDoc img')].map(img => { img.loading = 'eager'; return img.decode() })) })
        const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
        for (const link of await page.locator('.VPDoc a[href*="#"]').evaluateAll(links => links.map(a => a.href).filter(href => /\/precision\//.test(href) && new URL(href).hash.length > 1))) anchorTargets.add(link)
        assert.equal(layout.width, width)
        assert.ok(layout.scroll <= width, `${chapter}: document overflow`)
        for (const img of await page.locator('.storage-figure img').all()) {
          assert.equal(await img.evaluate(el => el.naturalWidth > 0), true)
          assert.match(await img.evaluate(el => el.currentSrc), width < 600 ? /-mobile.svg$/ : /(?<!-mobile).svg$/)
        }
        if (chapter === 'storage-atlas') assert.equal(await page.locator('.storage-figure').count(), 28)
        for (const button of await page.locator('.bit-byte-lab button').all()) assert.equal(await button.evaluate(el => el.scrollWidth <= el.clientWidth), true)
        if (chapter === '01-number-storage') await page.locator('.bit-byte-lab').screenshot({ path: new URL(`bits-${width}-${dark}.png`, evidence).pathname })
        if (chapter === '02-floating-formats') await page.locator('.storage-figure').first().screenshot({ path: new URL(`fp32-page-${width}-${dark}.png`, evidence).pathname })
        layouts.push({ chapter, dark, ...layout })
      }
    }
  }
  await page.goto(`${root}docs/ai/precision/01-number-storage.html`)
  await ready()
  const lab = page.locator('.bit-byte-lab')
  const output = lab.locator('[aria-live]')
  assert.match(await output.innerText(), /00000101₂ = 4 \+ 1 = 5/)
  await lab.getByRole('button').first().click()
  assert.match(await output.innerText(), /10000101₂ = 128 \+ 4 \+ 1 = 133/)
  await lab.getByRole('button').last().focus()
  await page.keyboard.press('Space')
  assert.match(await output.innerText(), /10000100₂ = 128 \+ 4 = 132/)
  while (await lab.locator('button[aria-pressed="true"]').count()) await lab.locator('button[aria-pressed="true"]').first().click()
  assert.match(await output.innerText(), /00000000₂ = 0 = 0/)
  for (const button of await lab.getByRole('button').all()) await button.click()
  assert.match(await output.innerText(), /11111111₂ = .* = 255/)
  for (const target of anchorTargets) {
    await page.goto(target)
    await ready()
    const id = decodeURIComponent(new URL(target).hash.slice(1))
    assert.equal(await page.evaluate(id => Boolean(document.getElementById(id)), id), true, `anchor ${target}`)
  }
  await page.goto(`${root}docs/ai/precision/`)
  await ready()
  await page.locator('.VPDoc').getByRole('link', { name: '常见数值格式存储图解', exact: true }).click()
  await page.waitForURL('**/storage-atlas.html')
  await ready()
  await page.waitForFunction(() => document.querySelector('.VPDoc h1')?.textContent.includes('常见数值格式存储图解'))
  assert.match(await page.locator('.VPDoc h1').innerText(), /常见数值格式存储图解/)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: new URL('atlas-entry.png', evidence).pathname })
  await page.locator('.VPNavBarSearch button').click()
  await page.locator('#localsearch-input').fill('常见数值格式存储图解')
  await page.locator('.VPLocalSearchBox a.result[href*="/precision/storage-atlas"]').first().waitFor()
  const cold = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await cold.goto(`${root}docs/ai/precision/storage-atlas.html`)
  await cold.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
  const loading = await cold.locator('.storage-figure img').evaluateAll(images => images.map(img => ({ loading: img.loading, loaded: img.complete && img.naturalWidth > 0, src: img.currentSrc })))
  assert.equal(loading.length, 28)
  assert.equal(loading.every(img => img.loading === 'lazy'), true)
  const resources = await cold.evaluate(() => performance.getEntriesByType('resource').map(item => item.name))
  assert.ok(resources.filter(url => /\/storage\/.+\.svg$/.test(url)).length < 28, 'below-fold figures stay deferred')
  assert.deepEqual(resources.filter(url => /three|\.(mp4|bin|safetensors|onnx)(\?|$)/i.test(url)), [])
  await cold.close()
  assert.deepEqual(errors, [])
  writeFileSync(new URL('results.json', evidence), JSON.stringify({ root, figures, layouts, anchorTargets: [...anchorTargets], loading, checks: ['SVG 边界与文字相交', '28 格式覆盖', '响应式图源', '位实验与键盘', '入口与搜索', '页内锚点', '按需加载与资源预算'], errors }, null, 2))
  console.log(JSON.stringify({ diagrams: figures.length, layouts: layouts.length, errors }))
} finally { await browser.close() }
