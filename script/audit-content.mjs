import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const root = fileURLToPath(new URL('../', import.meta.url));
const markdown = new MarkdownIt({ html: true });
const pages = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filename);
    else if (entry.name.endsWith('.md')) inspect(filename);
  }
}

function inspect(filename) {
  const source = fs.readFileSync(filename, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const tokens = markdown.parse(source, {});
  const inline = tokens.filter(token => token.type === 'inline');
  const text = inline.flatMap(token => token.children || [])
    .filter(token => ['text', 'code_inline'].includes(token.type)).map(token => token.content).join('');
  const images = inline.flatMap(token => token.children || []).filter(token => token.type === 'image');
  const svgImages = images.filter(token => /\.svg(?:[?#].*)?$/i.test(token.attrGet('src') || '')).length;
  const html = [
    ...tokens.filter(token => token.type === 'html_block'),
    ...inline.flatMap(token => token.children || []).filter(token => token.type === 'html_inline'),
  ].map(token => token.content).join('\n');
  const mermaid = tokens.filter(token => token.type === 'fence' && token.info.trim() === 'mermaid').length;
  const file = path.relative(root, filename).split(path.sep).join('/');
  const headings = tokens.filter(token => token.type === 'heading_open').length;
  const fences = tokens.filter(token => token.type === 'fence' && token.info.trim() !== 'mermaid').length;
  const hasVisual = images.length > 0 || mermaid > 0 || /<(?:img|svg)\b/i.test(html);
  const flags = [];
  if (!hasVisual) flags.push('未检测到图示');
  if (text.length < 650) flags.push('短正文待分类');
  if (fences >= 10 && text.length < 1200) flags.push('代码集中待抽查');
  if (headings >= 8 && text.length / headings < 100) flags.push('标题密集待抽查');
  pages.push({ file, inlineTextChars: text.length, headings, codeBlocks: fences, images: images.length, svgImages, mermaid, hasVisual, flags });
}

visit(path.join(root, 'docs'));
const topics = {};
for (const page of pages) {
  const parts = page.file.split('/');
  const topic = parts.slice(0, ['devlanguage', 'design', 'basic', 'tools'].includes(parts[1]) ? 3 : 2).join('/').replace(/\/index\.md$/, '');
  const item = topics[topic] ||= { pages: 0, withoutVisual: 0, withSvg: 0, shortText: 0 };
  item.pages++;
  item.withoutVisual += Number(!page.hasVisual);
  item.withSvg += Number(page.svgImages > 0);
  item.shortText += Number(page.inlineTextChars < 650);
}
const result = {
  schemaVersion: 1,
  note: '指标只用于筛选候选，不代表质量评分；目录、迁移页、代码速查须人工分类。图片统计包含 Markdown 图片、HTML img/svg 和 Mermaid，不展开 Vue 组件或代码围栏中的图片示例。字符数排除 frontmatter 和代码围栏，保留标题、列表及行内代码。',
  totals: { pages: pages.length, withoutVisual: pages.filter(page => !page.hasVisual).length, withSvg: pages.filter(page => page.svgImages > 0).length, shortText: pages.filter(page => page.inlineTextChars < 650).length },
  topics,
  pages,
};
const outputIndex = process.argv.indexOf('--output');
if (outputIndex !== -1) {
  if (!process.argv[outputIndex + 1]) throw new Error('--output 需要文件路径');
  const output = path.resolve(process.argv[outputIndex + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ output, ...result.totals, topics }, null, 2));
} else {
  console.log(JSON.stringify(result, null, 2));
}
