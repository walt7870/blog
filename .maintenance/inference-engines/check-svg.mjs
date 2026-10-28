// Renders each SVG in Chrome and reports box text that spills out of its rect, or free text past the canvas.
// Usage: node .maintenance/llm-inference/check-svg.mjs <svg dir> <png out dir> [name-filter]
import { homedir } from 'node:os';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright').catch(() => import(homedir() + '/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
import { readdirSync, readFileSync } from 'node:fs';
const [dir, out, filter] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
for (const f of readdirSync(dir).filter(f => f.endsWith('.svg') && (!filter || f.includes(filter)))) {
  await p.setContent(`<body style="margin:0">${readFileSync(dir + '/' + f, 'utf8').replace(/<\?xml[^>]*>/, '')}</body>`);
  await p.evaluate(() => document.fonts.ready);
  const v = await p.evaluate(() => {
    const bad = []; const svg = document.querySelector('svg'); const W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    for (const g of document.querySelectorAll('g[data-node]')) { const r = g.querySelector('rect').getBBox();
      for (const t of g.querySelectorAll('text')) { const bb = t.getBBox(); if (bb.x + bb.width > r.x + r.width - 8 || bb.y + bb.height > r.y + r.height - 4) bad.push(g.dataset.node + ':' + t.textContent); } }
    for (const t of document.querySelectorAll('svg text')) { const bb = t.getBBox(); if (bb.x + bb.width > W - 16 || bb.y + bb.height > H) bad.push('free:' + t.textContent); }
    return bad; });
  console.log(f, v.length ? v : 'ok');
  await p.locator('svg').screenshot({ path: `${out}/${f}.png` });
}
await b.close();
