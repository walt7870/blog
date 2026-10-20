import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from '@vue/compiler-dom';
const [directory, output, previous] = process.argv.slice(2);
const rows = {};
function shape(node) {
  if (node.type === 2) return ['text', node.content];
  if (node.type !== 1 || node.tag === 'script') return null;
  const attrs = node.props.map(p => [p.name, p.value?.content || '']).filter(([name, value]) =>
    !(name === 'href' && value.startsWith('/blog/assets/')));
  return [node.tag, attrs, node.children.map(shape).filter(Boolean)];
}
function visit(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith('.html')) {
      const ast = parse(fs.readFileSync(file, 'utf8'), { parseMode: 'html', comments: false });
      const body = ast.children.find(n => n.tag === 'html')?.children.find(n => n.tag === 'body');
      if (!body) continue;
      rows[path.relative(directory, file)] = createHash('sha256').update(JSON.stringify(shape(body))).digest('hex');
    }
  }
}
visit(directory);
fs.writeFileSync(output, JSON.stringify(rows, null, 2) + '\n');
if (previous) {
  const old = JSON.parse(fs.readFileSync(previous, 'utf8'));
  const changed = Object.keys(rows).filter(file => old[file] && old[file] !== rows[file]);
  const missing = Object.keys(old).filter(file => !rows[file]);
  console.log(JSON.stringify({ pages: Object.keys(rows).length, changed, missing }, null, 2));
}
