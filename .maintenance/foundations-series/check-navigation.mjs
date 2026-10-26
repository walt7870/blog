import { chromium } from '/Users/waltniu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'
import assert from 'node:assert/strict'

const root = process.env.BLOG_RELEASE_URL || 'http://127.0.0.1:5195/blog/'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [query, target] of [['为什么要平方', '06-loss-and-objective'], ['混合精度', '04-mixed-precision']]) {
    await page.goto(root)
    await page.waitForFunction(() => Boolean(document.querySelector('#app')?.__vue_app__))
    await page.locator('.VPNavBarSearch button').click()
    await page.locator('.site-search .search-input').fill(query)
    await page.locator(`.site-search a.result[href*="${target}"]`).first().click()
    await page.waitForURL(`**/${target}.html*`)
    await page.locator('.VPDoc h1').waitFor()
  }
  await page.goto(`${root}docs/ai/foundations/01-what-models-learn.html`)
  for (const chapter of ['02-python-and-environment', '03-data-task-and-split', '04-linear-prediction', '05-vectors-and-tensors', '06-loss-and-objective', '07-gradient-and-learning-rate', '08-first-training-loop']) {
    await page.locator(`.VPDoc a[href$="/${chapter}.html"]`).last().click()
    await page.waitForURL(`**/${chapter}.html`)
    await page.locator('.VPDoc h1').waitFor()
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ root, search: 2, chapterTransitions: 7, errors }))
} finally { await browser.close() }
