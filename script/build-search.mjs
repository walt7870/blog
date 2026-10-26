// Builds the Pagefind index for the VitePress output in .vitepress/dist.
//
// Pagefind splits Chinese with its own dictionary when indexing but with the browser's Intl.Segmenter
// when searching, and the two disagree often enough that common words go missing. This script
// segments Han text with Intl.Segmenter in an indexing-only copy of the pages and indexes it as a
// language Pagefind does not segment; SiteSearch.vue segments the query the same way, so both sides
// see identical words. The published HTML is not modified.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, '.vitepress/dist');
const output = path.join(dist, 'assets/pagefind');
const words = new Intl.Segmenter('zh', { granularity: 'word' });

export function segmentHan(text) {
  return text.replace(/\p{Script=Han}+/gu, run => ` ${[...words.segment(run)].map(part => part.segment).join(' ')} `);
}

function segmentHtml(html) {
  let skip = false;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) {
      if (/^<(script|style)\b/i.test(part)) skip = true;
      else if (/^<\/(script|style)>/i.test(part)) skip = false;
      return part;
    }
    return skip ? part : segmentHan(part);
  }).join('');
}

function pages(directory, relative = '') {
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).flatMap(entry => {
    const file = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) return file === 'assets' ? [] : pages(directory, file);
    return file.endsWith('.html') ? [file] : [];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-search-'));
  try {
    let count = 0;
    for (const file of pages(dist)) {
      const html = fs.readFileSync(path.join(dist, file), 'utf8');
      if (!html.includes('data-pagefind-body')) continue;
      fs.mkdirSync(path.dirname(path.join(staging, file)), { recursive: true });
      fs.writeFileSync(path.join(staging, file), segmentHtml(html));
      count++;
    }
    fs.rmSync(output, { recursive: true, force: true });
    const bin = path.join(root, 'node_modules/.bin/pagefind');
    const result = spawnSync(bin, ['--site', staging, '--output-path', output, '--force-language', 'en'], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
    console.log(`搜索索引：${count} 个页面`);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
