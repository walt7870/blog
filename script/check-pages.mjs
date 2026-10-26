// Opens pages at desktop and phone widths in light and dark mode, and fails on
// horizontal overflow, broken images, page errors or 4xx/5xx responses.
// Usage: node script/check-pages.mjs <base url> <screenshot dir> <route>...
//   e.g. node script/check-pages.mjs https://niuwancheng.cn/blog/ /tmp/shots profile/ projects/private-asr.html
// Playwright is not a project dependency; set PLAYWRIGHT_MODULE to its index.mjs when it is not resolvable.
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const fallback = homedir() + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright').catch(() => import(fallback));

const [base, out, ...routes] = process.argv.slice(2);
if (!base || !out || !routes.length) {
  console.error('用法：node script/check-pages.mjs <站点地址> <截图目录> <路径>...');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
let failed = 0;
for (const scheme of ['light', 'dark']) {
  for (const width of [1440, 390]) {
    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
      await page.goto(base + route, { waitUntil: 'networkidle' });
      if (scheme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'));
      // Lazy images only load near the viewport; force them so broken ones are detected.
      await page.evaluate(() => document.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; }));
      await page.waitForTimeout(800);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        broken: [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src),
        h1: document.querySelector('h1')?.textContent?.trim(),
      }));
      const bad = result.overflow > 0 || result.broken.length || errors.length;
      if (bad) failed++;
      console.log(`${bad ? '✗' : '✓'} ${scheme} ${width} ${route} h1=${result.h1 ?? '-'} overflow=${result.overflow} broken=${result.broken.length}${errors.length ? ` errors=${errors.join(' | ')}` : ''}`);
      const name = route.replace(/[/]/g, '_') || 'home';
      await page.screenshot({ path: `${out}/${name}-${width}-${scheme}.png`, fullPage: width === 1440 });
      await page.close();
    }
  }
}
await browser.close();
console.log(failed ? `${failed} 项未通过；截图在 ${out}` : `全部通过；截图在 ${out}，仍需人工查看`);
process.exit(failed ? 1 : 0);
