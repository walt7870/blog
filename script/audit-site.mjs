import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import MarkdownIt from 'markdown-it';
import { parse } from '@vue/compiler-dom';

const { values } = parseArgs({ options: { root: { type: 'string' }, gate: { type: 'boolean' } } });
const root = path.resolve(values.root || fileURLToPath(new URL('../', import.meta.url))) + path.sep;
const directory = path.join(root, '.maintenance/content-audit');
const ledgerPath = path.join(directory, 'page-reviews.json');
const scanPath = path.join(directory, 'site-scan.json');
const themeReviewPath = path.join(directory, 'theme-review.json');
const markdown = new MarkdownIt({ html: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const files = [];
const readJson = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const existing = readJson(ledgerPath, { schemaVersion: 1, pages: [], missing: [] });
const previous = new Map(existing.pages.map(page => [page.file, page]));
const recordsPath = path.join(directory, 'reviews');
if (fs.existsSync(recordsPath)) {
  for (const file of fs.readdirSync(recordsPath).filter(file => file.endsWith('.json')).sort()) {
    for (const record of readJson(path.join(recordsPath, file), { pages: [] }).pages) {
      previous.set(record.file, { ...previous.get(record.file), ...record });
    }
  }
}
const sharedInputs = [];
function collectShared(relative) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const file = path.posix.join(relative, entry.name);
    if (entry.isDirectory() && !['cache', 'dist', '.cache', '.temp'].includes(entry.name)) collectShared(file);
    else if (entry.isFile() && /\.(?:vue|css|[cm]?ts|[cm]?js)$/.test(file)) {
      sharedInputs.push([file, sha(fs.readFileSync(path.join(root, file)))]);
    }
  }
}
collectShared('.vitepress');
sharedInputs.sort((a, b) => a[0].localeCompare(b[0], 'en'));
const sharedHash = sha(JSON.stringify(sharedInputs));

function visit(relative) {
  for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
    const file = path.posix.join(relative, entry.name);
    // miniapp/ has its own dependencies and build output; their Markdown is not site content.
    if (entry.isDirectory()) { if (!['node_modules', 'dist', 'unpackage'].includes(entry.name)) visit(file); }
    else if (file.endsWith('.md')) files.push(file);
  }
}
for (const folder of ['docs', 'profile', 'projects', 'miniapp']) visit(folder);
for (const file of fs.readdirSync(root)) if (file.endsWith('.md')) files.push(file);
files.sort((a, b) => a.localeCompare(b, 'en'));

function resolveLocal(file, reference, image) {
  if (!reference || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(reference)) return null;
  let target;
  try { target = decodeURIComponent(reference.split(/[?#]/)[0]); } catch { return { error: 'URL 编码无效' }; }
  if (target.startsWith('/blog/')) target = target.slice(5);
  if (!target) return null;
  const publicFile = path.join(root, 'public', target.replace(/^\//, ''));
  const relative = target.startsWith('/') ? target.slice(1) : path.posix.join(path.posix.dirname(file), target);
  const source = path.join(root, relative);
  const candidates = image
    ? [publicFile, source]
    : [source, source.replace(/\.html$/, '.md'), source + '.md', path.join(source, 'index.md'), publicFile];
  const found = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  return found ? { file: path.relative(root, found).split(path.sep).join('/') } : { error: '本地目标不存在' };
}

function inspect(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || '';
  const body = source.slice(frontmatter.length);
  const offset = frontmatter.split('\n').length - 1;
  const tokens = markdown.parse(body, {});
  const findings = [];
  const references = [];
  const add = (kind, line, detail) => findings.push({ kind, line, detail });
  let visualCount = 0;
  let proseChars = 0;
  let codeLines = 0;
  let headings = 0;
  let htmlComponents = false;
  for (const token of tokens) {
    const line = offset + (token.map?.[0] || 0) + 1;
    if (token.type === 'heading_open') headings++;
    if (token.type === 'fence') {
      if (token.info.trim().split(/\s/)[0] === 'mermaid') visualCount++;
      else codeLines += token.content.split('\n').length - 1;
    }
    if (token.type === 'inline') {
      for (const child of token.children || []) {
        if (['text', 'code_inline'].includes(child.type)) proseChars += child.content.length;
        if (child.type === 'image') {
          visualCount++;
          references.push({ line, target: child.attrGet('src'), image: true });
          if (!child.content.trim()) add('image-alt', line, '图片缺少说明文字');
        }
        if (child.type === 'link_open') references.push({ line, target: child.attrGet('href'), image: false });
      }
    }
    const htmlParts = token.type === 'html_block' ? [token] : (token.children || []).filter(child => child.type === 'html_inline');
    for (const html of htmlParts) {
      if (/<[A-Z][A-Za-z]+\b/.test(html.content)) htmlComponents = true;
      const ast = parse(html.content, { onError() {} });
      function walk(node) {
        if (['img', 'svg'].includes(node.tag)) visualCount++;
        for (const prop of node.props || []) {
          if (prop.type === 6 && ['href', 'src', 'poster'].includes(prop.name)) {
            references.push({ line, target: prop.value?.content, image: prop.name !== 'href' });
          }
        }
        for (const child of node.children || []) walk(child);
      }
      walk(ast);
    }
  }
  const dependencies = [];
  for (const reference of references) {
    const resolved = resolveLocal(file, reference.target, reference.image);
    if (resolved?.error) add('broken-local-reference', reference.line, `${resolved.error}：${reference.target}`);
    if (resolved?.file?.startsWith('public/')) dependencies.push([resolved.file, sha(fs.readFileSync(path.join(root, resolved.file)))]);
  }
  for (const resource of previous.get(file)?.dependencyFiles || []) {
    const absolute = path.resolve(root, resource);
    if (!absolute.startsWith(root) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      add('broken-local-reference', 1, `审查依赖不存在：${resource}`);
    } else dependencies.push([resource, sha(fs.readFileSync(absolute))]);
  }
  if (!visualCount && !htmlComponents) add('visual-review', 1, '需逐页判断图示是否有助于理解，不自动判为缺陷');
  if (proseChars < 650) add('short-text-review', 1, '需区分目录、迁移、速查与内容不足');
  if (codeLines > 200 && proseChars / codeLines < 10) add('code-density-review', 1, '代码较集中，需检查推导、运行条件与结果解释');
  const lines = body.split('\n');
  let inFence = false;
  lines.forEach((text, index) => {
    if (/^\s*(`{3,}|~{3,})/.test(text)) { inFence = !inFence; return; }
    if (inFence) return;
    if (/一句话(?:总结|理解)|一张图看清|面试高频|八股文|常见考点|下面为你|本文由 AI/.test(text)) add('editorial-review', index + offset + 1, '需核对知识库口吻');
    if (/TODO|待补充|敬请期待|建设中|待完善/.test(text)) add('placeholder-review', index + offset + 1, '需确认是否为未完成正文或正常示例');
    if (/所有操作都是原子|唯一实体|天然对应.*微服务|大O.*最坏|大Ω.*最好|大Θ.*平均/.test(text)) add('technical-review', index + offset + 1, '需核对技术断言的适用边界');
  });
  dependencies.sort((a, b) => a[0].localeCompare(b[0], 'en'));
  return {
    file,
    contentHash: sha(source),
    // Theme and config changes are reviewed once in theme-review.json rather than staling every page.
    reviewHash: sha(JSON.stringify([source, dependencies])),
    dependencies: [...new Set(dependencies.map(([file]) => file))],
    bytes: Buffer.byteLength(source),
    lines: source.split('\n').length,
    proseChars, headings, codeLines, visualCount, htmlComponents,
    localReferences: references.filter(reference => resolveLocal(file, reference.target, reference.image) !== null).length,
    findings,
  };
}

function groupFor(file) {
  const p = file.split('/');
  if (p[0] !== 'docs') return '00-站点与作品集';
  if (p[1] === 'design') return '01-' + p.slice(0, 3).join('/');
  if (p[1] === 'devlanguage' || p[1] === 'tools' || p[1] === 'basic') return p.slice(0, 3).join('/').replace(/\/index\.md$/, '');
  return p.slice(0, 2).join('/');
}

const pages = files.map(inspect);
const groups = Map.groupBy(pages, page => groupFor(page.file));
const batches = [];
for (const [topic, group] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
  let chunk = [];
  let bytes = 0;
  function flush() {
    if (!chunk.length) return;
    batches.push({ id: `B${String(batches.length + 1).padStart(3, '0')}`, topic, pages: chunk.map(page => page.file), bytes });
    chunk = []; bytes = 0;
  }
  for (const page of group) {
    if (chunk.length && (chunk.length >= 12 || bytes + page.bytes > 100_000)) flush();
    chunk.push(page); bytes += page.bytes;
  }
  flush();
}
const batchByFile = new Map(batches.flatMap(batch => batch.pages.map(file => [file, batch.id])));
const reviews = pages.map(page => {
  const old = previous.get(page.file);
  return old ? { ...old, batch: batchByFile.get(page.file) } : {
    file: page.file, batch: batchByFile.get(page.file), status: 'pending', reviewedHash: null,
    pageType: null, findings: [], decision: null, validation: [],
  };
});
const missing = [...new Map([
  ...(existing.missing || []), ...existing.pages.filter(page => !files.includes(page.file)),
].filter(page => !files.includes(page.file)).map(page => [page.file, page])).values()];
const unexplainedMissing = missing.filter(page => page.status !== 'removed-approved' || !page.decision);
const errors = pages.flatMap(page => page.findings.filter(finding => finding.kind === 'broken-local-reference').map(finding => ({ file: page.file, ...finding })));
const verified = reviews.filter(page => ['verified', 'retained'].includes(page.status)
  && page.reviewedHash === pages.find(item => item.file === page.file).reviewHash
  && page.pageType && page.decision && page.validation.length);
const stale = reviews.filter(page => page.reviewedHash && page.reviewedHash !== pages.find(item => item.file === page.file).reviewHash);
const openFindings = reviews.flatMap(page => page.findings.filter(finding => finding.status !== 'resolved').map(finding => ({ file: page.file, ...finding })));
const themeReview = readJson(themeReviewPath, null);
const themeReviewed = themeReview?.reviewedSharedHash === sharedHash && !!themeReview.decision && !!themeReview.validation?.length;
const summary = {
  pages: pages.length, bytes: pages.reduce((sum, page) => sum + page.bytes, 0),
  batches: batches.length, scanned: pages.length, reviewed: verified.length,
  pending: reviews.filter(page => page.status === 'pending').length,
  changesRequired: reviews.filter(page => page.status === 'changes-required').length,
  stale: stale.map(page => page.file), missing: unexplainedMissing.map(page => page.file),
  brokenLocalReferences: errors.length, openFindings: openFindings.length, themeReviewed,
  releaseReady: verified.length === pages.length && themeReviewed && !errors.length && !openFindings.length && !unexplainedMissing.length,
};
fs.mkdirSync(directory, { recursive: true });
writeJson(scanPath, { schemaVersion: 2, summary, sharedHash, sharedInputs, batches, pages });
writeJson(ledgerPath, { schemaVersion: 2, note: '自动扫描只同步清单；逐页审查状态由实际阅读、改造与验证记录维护。reviewedHash 包含正文、直接静态资源和 dependencyFiles，变化后须复核；.vitepress 主题与配置的变化记录在 theme-review.json，由一次全站验收覆盖。', pages: reviews, missing });
console.log(JSON.stringify({ ...summary, errors: errors.slice(0, 30) }, null, 2));
if (values.gate && !summary.releaseReady) process.exitCode = 1;
