import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('../../', import.meta.url).pathname);
const output = '/tmp/blog-audit-preview-root';
fs.copyFileSync(root + '/.maintenance/content-audit/responsive-harness.html', output + '/audit-responsive.html');
for (const [group, directory] of [['inference', '/ai/inference-series'], ['closing', '/reading']]) {
  const target = output + '/__' + group + '-diagrams';
  fs.mkdirSync(target, { recursive: true });
  fs.mkdirSync(root + '/.maintenance/content-audit/evidence/' + group, { recursive: true });
  for (const file of fs.readdirSync(root + '/public' + directory).filter(x => x.endsWith('.svg'))) {
    fs.writeFileSync(target + '/' + file.replace('.svg', '.html'), '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block}</style>' + fs.readFileSync(root + '/public' + directory + '/' + file, 'utf8'));
  }
}
