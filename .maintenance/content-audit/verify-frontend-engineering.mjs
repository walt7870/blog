import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';

const root = fs.mkdtempSync('/tmp/blog-front-engineering-');
const checker = '/tmp/blog-front-engineering-checker/node_modules';
fs.symlinkSync(checker, path.join(root, 'node_modules'), 'dir');
fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module","private":true}');
const results = { root, commands: [], assertions: [] };
const source = new URL('../../docs/devlanguage/front/', import.meta.url);
const blocks = name => [...fs.readFileSync(new URL(name + '/index.md', source), 'utf8').matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)].map(([, lang, code]) => ({ lang, code }));
const write = (name, value) => fs.writeFileSync(path.join(root, name), value);
function run(command, args, failure = false) {
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 30000 });
  results.commands.push({ command, args, exit: r.status, output: (r.stdout + r.stderr).slice(-4000) });
  assert.ok(failure ? r.status !== null && r.status !== 0 : r.status === 0, r.stdout + r.stderr);
  return r;
}

const tests = blocks('testing');
write('quote.mjs', tests[0].code);
write('quote.test.mjs', tests[1].code);
run('node', ['--test', 'quote.test.mjs']);
write('quote.mjs', tests[0].code.replace('return quantity * unitCents;', 'return quantity + unitCents;'));
run('node', ['--test', 'quote.test.mjs'], true);
write('quote.mjs', tests[0].code);

const quality = blocks('quality-tools');
write('eslint.config.mjs', quality.find(x => x.lang === 'js').code);
write('.prettierrc.json', quality.filter(x => x.lang === 'json')[0].code);
write('.stylelintrc.json', quality.filter(x => x.lang === 'json')[1].code);
fs.mkdirSync(path.join(root, 'src'));
write('src/quote.js', tests[0].code);
write('src/site.css', '.total { color: #fff; }\n');
const eslint = checker + '/eslint/bin/eslint.js';
const prettier = checker + '/prettier/bin/prettier.cjs';
const stylelint = checker + '/stylelint/bin/stylelint.mjs';
run('node', [eslint, 'src', '--max-warnings', '0']);
write('src/bad.js', 'missingPrice += 1;\n');
run('node', [eslint, 'src', '--max-warnings', '0'], true);
fs.unlinkSync(path.join(root, 'src/bad.js'));
run('node', [prettier, '--check', 'src'], true);
run('node', [prettier, '--write', 'src']);
run('node', [prettier, '--check', 'src']);
run('node', [stylelint, 'src/**/*.css']);
write('src/bad.css', '.total { colr: red; }\n');
run('node', [stylelint, 'src/**/*.css'], true);
fs.unlinkSync(path.join(root, 'src/bad.css'));

write('cart.mjs', blocks('state-management').find(x => x.lang === 'js').code);
const { createPinia, setActivePinia } = await import(pathToFileURL(checker + '/pinia/dist/pinia.mjs'));
setActivePinia(createPinia());
const { useCart } = await import(pathToFileURL(root + '/cart.mjs'));
const cart = useCart();
cart.setQuantity(2); assert.equal(cart.totalCents, 3980);
for (const v of ['', null, 0, -1, 1.5, 6, NaN]) assert.throws(() => cart.setQuantity(v), RangeError);
cart.reset(); assert.equal(cart.quantity, 1);
results.assertions.push('Pinia3正文store：3980分、非法数量拒绝、reset通过');

const { QueryClient } = await import(pathToFileURL(checker + '/@tanstack/query-core/build/modern/index.js'));
const cache = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
cache.setQueryData(['order', 'tenant-a', '42'], { totalCents: 3980 });
cache.setQueryData(['order', 'tenant-b', '42'], { totalCents: 1990 });
await cache.invalidateQueries({ queryKey: ['order', 'tenant-a', '42'] });
assert.equal(cache.getQueryState(['order', 'tenant-a', '42']).isInvalidated, true);
assert.equal(cache.getQueryState(['order', 'tenant-b', '42']).isInvalidated, false);
assert.equal(cache.getQueryData(['order', 'tenant-b', '42']).totalCents, 1990);
cache.clear(); assert.equal(cache.getQueryCache().getAll().length, 0);
results.assertions.push('TanStack Query5核心：租户键隔离、精确失效、clear通过；不冒称React Hook或真实接口集成');

const backend = http.createServer((req, res) => res.end(req.url));
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const probe = http.createServer(); await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
fs.mkdirSync(root + '/web/admin/assets', { recursive: true });
write('web/admin/index.html', '<!doctype html><title>订单</title>order-spa');
write('web/admin/config.js', 'window.__APP_CONFIG__ = {};');
write('web/admin/assets/export.old.js', 'export default "old-export";');
const server = blocks('deployment').find(x => x.lang === 'nginx').code
  .replace('listen 80;', 'listen 127.0.0.1:' + port + ';')
  .replace('/data/www/current', root + '/web')
  .replace('127.0.0.1:8080/', '127.0.0.1:' + backend.address().port + '/');
write('nginx.conf', `pid ${root}/nginx.pid;\nerror_log ${root}/error.log;\nevents {}\nhttp { include /opt/homebrew/etc/nginx/mime.types; access_log off; ${server} }`);
const nginx = '/opt/homebrew/bin/nginx';
run(nginx, ['-t', '-p', root + '/', '-c', root + '/nginx.conf']);
const child = spawn(nginx, ['-p', root + '/', '-c', root + '/nginx.conf', '-g', 'daemon off;'], { stdio: 'ignore' });
try {
  const origin = 'http://127.0.0.1:' + port;
  for (let n = 0; ; n++) {
    try { await fetch(origin + '/admin/'); break; }
    catch (e) { if (n > 20) throw e; await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  const rows = [];
  for (const [url, status, body, cacheHeader] of [
    ['/admin/orders/42', 200, 'order-spa', 'no-cache'],
    ['/admin/assets/missing.js', 404, '404', null],
    ['/admin/assets/export.old.js', 200, 'old-export', 'immutable'],
    ['/admin/config.js', 200, '__APP_CONFIG__', 'no-cache'],
    ['/api/orders/42?view=full', 200, '/orders/42?view=full', null],
  ]) {
    const r = await fetch(origin + url); const content = await r.text();
    assert.equal(r.status, status); assert.ok(content.includes(body));
    if (cacheHeader) assert.ok(r.headers.get('cache-control').includes(cacheHeader));
    rows.push({ url, status, cache: r.headers.get('cache-control'), mime: r.headers.get('content-type') });
  }
  const redirect = await fetch(origin + '/admin', { redirect: 'manual' }); assert.equal(redirect.status, 308);
  results.nginx = { version: run(nginx, ['-v']).stderr.trim(), rows, redirect: 308 };
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
  await new Promise(resolve => backend.close(resolve));
}
write('results.json', JSON.stringify(results, null, 2));
fs.writeFileSync('/tmp/blog-front-engineering-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({ root, commands: results.commands.length, assertions: results.assertions, nginx: results.nginx, passed: true }));
