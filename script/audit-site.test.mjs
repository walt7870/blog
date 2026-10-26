import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const scanner = fileURLToPath(new URL('./audit-site.mjs', import.meta.url));

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-audit-gate-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const folder of ['docs', 'profile', 'projects', 'miniapp', 'public', '.vitepress']) {
    fs.mkdirSync(path.join(root, folder));
  }
  fs.writeFileSync(path.join(root, 'docs/index.md'), '# 示例\n\n![示例图](/example.svg)\n');
  fs.writeFileSync(path.join(root, 'public/example.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>');
  fs.writeFileSync(path.join(root, '.vitepress/style.css'), 'body { color: black; }');
  function scan() {
    const result = spawnSync(process.execPath, [scanner, '--root', root, '--gate'], { encoding: 'utf8' });
    assert.equal(result.stderr, '');
    return { status: result.status, ...JSON.parse(result.stdout) };
  }
  function approve() {
    const directory = path.join(root, '.maintenance/content-audit');
    const source = JSON.parse(fs.readFileSync(path.join(directory, 'site-scan.json'), 'utf8'));
    const ledgerPath = path.join(directory, 'page-reviews.json');
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    for (const page of ledger.pages) Object.assign(page, {
      status: 'retained', pageType: '机制', decision: '测试夹具的显式审查记录',
      validation: ['测试夹具证据'], reviewedHash: source.pages.find(item => item.file === page.file).reviewHash,
    });
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
    fs.writeFileSync(path.join(directory, 'theme-review.json'), JSON.stringify({
      reviewedSharedHash: source.sharedHash, decision: '测试夹具的主题验收', validation: ['测试夹具证据'],
    }));
  }
  return { root, scan, approve };
}

test('扫描与构建不构成审查，通过必须有当前版本的结论和证据', t => {
  const { scan, approve, root } = fixture(t);
  assert.equal(scan().status, 1);
  approve();
  assert.equal(scan().releaseReady, true);
  const ledgerPath = path.join(root, '.maintenance/content-audit/page-reviews.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  ledger.pages[0].decision = null;
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
  assert.equal(scan().status, 1);
});

test('正文和图示变化会使该页结论失效', t => {
  const { scan, approve, root } = fixture(t);
  scan();
  for (const file of ['docs/index.md', 'public/example.svg']) {
    approve();
    assert.equal(scan().status, 0);
    fs.appendFileSync(path.join(root, file), '\n');
    const result = scan();
    assert.equal(result.status, 1);
    assert.deepEqual(result.stale, ['docs/index.md']);
  }
});

test('共享样式变化要求重新做主题验收，不使逐页结论失效', t => {
  const { scan, approve, root } = fixture(t);
  scan(); approve();
  assert.equal(scan().status, 0);
  fs.appendFileSync(path.join(root, '.vitepress/style.css'), '\n');
  const result = scan();
  assert.equal(result.status, 1);
  assert.equal(result.themeReviewed, false);
  assert.deepEqual(result.stale, []);
  approve();
  assert.equal(scan().status, 0);
});

test('连续重跑仍保留未解释的页面删除', t => {
  const { scan, approve, root } = fixture(t);
  scan(); approve();
  fs.unlinkSync(path.join(root, 'docs/index.md'));
  for (let i = 0; i < 3; i++) {
    const result = scan();
    assert.equal(result.status, 1);
    assert.deepEqual(result.missing, ['docs/index.md']);
  }
});

test('VitePress临时产物和缓存不改变已审正文的依赖摘要', t => {
  const { scan, approve, root } = fixture(t);
  scan(); approve();
  for (const folder of ['.temp', '.cache', 'cache', 'dist']) {
    const generated = path.join(root, '.vitepress', folder);
    fs.mkdirSync(generated);
    const artifact = path.join(generated, 'generated.js');
    fs.writeFileSync(artifact, 'export default "构建临时产物";');
    assert.equal(scan().releaseReady, true);
    fs.unlinkSync(artifact);
    assert.equal(scan().releaseReady, true);
  }
});

test('已审页面的未关闭问题与丢失资源阻断发布', t => {
  const { scan, approve, root } = fixture(t);
  scan(); approve();
  const ledgerPath = path.join(root, '.maintenance/content-audit/page-reviews.json');
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  ledger.pages[0].findings.push({ status: 'open', detail: '仍需补齐异常路径' });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger));
  assert.equal(scan().openFindings, 1);
  fs.unlinkSync(path.join(root, 'public/example.svg'));
  const result = scan();
  assert.equal(result.status, 1);
  assert.equal(result.brokenLocalReferences, 1);
});
