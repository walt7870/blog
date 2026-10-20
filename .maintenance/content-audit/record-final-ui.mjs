import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = new URL('./', import.meta.url);
const read = file => JSON.parse(fs.readFileSync(new URL(file, base), 'utf8'));
const scan = read('site-scan.json');
const ledger = read('page-reviews.json');
const modes = ['desktop-light', 'mobile-light', 'desktop-dark', 'mobile-dark'];
const evidence = new Map();
const summary = {};
for (const mode of modes) {
  const files = fs.readdirSync(new URL('evidence/final/', base)).filter(f => f.startsWith('page-checks-' + mode + '-'));
  const rows = files.flatMap(file => read('evidence/final/' + file));
  assert.equal(rows.length, scan.pages.length, mode);
  const byFile = new Map(rows.map(r => [r.file, r]));
  assert.equal(byFile.size, scan.pages.length, mode);
  const screenshots = [];
  for (const [index, page] of scan.pages.entries()) {
    const row = byFile.get(page.file);
    assert.ok(row?.title && row.text > 0, page.file);
    assert.equal(row.width, mode.startsWith('mobile') ? 390 : 1280);
    assert.ok(row.scroll <= row.width + 1);
    assert.equal(row.dark, mode.endsWith('dark'));
    assert.ok(row.images.every(image => image.complete && image.width > 0));
    const screenshot = '/tmp/blog-final-ui/' + mode + '-' + String(index).padStart(3, '0') + '.png';
    const bytes = fs.readFileSync(screenshot);
    assert.ok(bytes.length > 1000, screenshot);
    screenshots.push({ file: page.file, screenshot, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  summary[mode] = { pages: rows.length, images: rows.reduce((n, r) => n + r.images.length, 0) };
  evidence.set(mode, { files, screenshots });
}
const pages = ledger.pages.map(page => {
  assert.ok(['verified', 'retained'].includes(page.status), page.file);
  assert.ok(page.decision && page.pageType && page.validation.length, page.file);
  return { ...page, reviewedHash: scan.pages.find(p => p.file === page.file).reviewHash,
    validation: [...page.validation.filter(v => !v.startsWith('最终共享UI复验：')),
      '最终共享UI复验：本页在1280桌面/390像素iframe、浅色/深色四模式分别访问，全文截图、图片加载及整页宽度通过；见evidence/final与final-ui-summary.json。'],
  };
});
fs.writeFileSync(new URL('reviews/zzz-final-ui.json', base), JSON.stringify({ pages }, null, 2) + '\n');
fs.writeFileSync(new URL('evidence/final/final-ui-summary.json', base), JSON.stringify({
  pages: pages.length, summary, sharedHash: scan.sharedHash,
  note: '逐页正文阅读与图示语义结论见原批次；本记录是共享UI回页复验，不能代替正文或业务运行测试。手机为390像素iframe布局。截图在本机临时目录，仓库保留路径及摘要。',
  evidence: Object.fromEntries(evidence),
}, null, 2) + '\n');
console.log(JSON.stringify({ pages: pages.length, summary }));
