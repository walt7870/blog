import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const source = resolve('public/ai/examples/coding-order-lab');
const work = mkdtempSync(join(tmpdir(), 'blog-order-verify-'));
const evidence = resolve('.maintenance/content-audit/evidence/coding-order');
mkdirSync(evidence, { recursive: true });
cpSync(source, work, { recursive: true });
const maven = process.env.BLOG_AUDIT_MAVEN || 'mvn';
const results = [];
function run(name, args, expected, match) {
  const result = spawnSync(maven, ['-B', ...args], { cwd: work, encoding: 'utf8' });
  const output = (result.stdout || '') + (result.stderr || '');
  writeFileSync(join(evidence, name + '.log'), output);
  assert.equal(result.status === 0, expected, `${name}: unexpected exit ${result.status}`);
  if (match) assert.match(output, match, name);
  results.push({ name, exit: result.status, expectedSuccess: expected });
  console.log(name, result.status);
}
run('baseline', ['clean', 'test'], true, /Tests run: 8, Failures: 0, Errors: 0, Skipped: 0/);
cpSync(join(work, 'contract/example/orders/CancelOrderTest.java'), join(work, 'tests/example/orders/CancelOrderTest.java'));
run('contract-red', ['clean', 'test'], false, /cannot find symbol|找不到符号/);
run('final-green', ['clean', 'test', '-Dlab.stage=final'], true, /Tests run: 16, Failures: 0, Errors: 0, Skipped: 0/);

// Mutations stay in the temporary copy; each starts from the verified source.
for (const mutation of [
  ['paid-allowed', 'Order.java', 'if (status != Status.CREATED) throw new OrderCannotBeCancelledException();', '', /domainPaidIsRejected|servicePaidDoesNotSave/],
  ['repeat-save', 'OrderService.java', 'return cancelled == order ? order : repository.save(cancelled);', 'return repository.save(cancelled);', /serviceRepeatDoesNotSaveAgain/],
  ['wrong-404', 'OrderExceptionHandler.java', 'status(404)', 'status(500)', /webCreateCancelRepeatAndMissing/],
  ['wrong-409', 'OrderExceptionHandler.java', 'status(409)', 'status(500)', /webPaidMapsToConflict/],
]) {
  const [name, file, before, after, failure] = mutation;
  const relative = 'final/example/orders/' + file;
  const original = readFileSync(join(source, relative), 'utf8');
  assert.ok(original.includes(before));
  writeFileSync(join(work, relative), original.replace(before, after));
  run(name, ['clean', 'test', '-Dlab.stage=final'], false, failure);
  writeFileSync(join(work, relative), original);
}
run('package-green', ['clean', 'package', '-Dlab.stage=final'], true, /Tests run: 16, Failures: 0, Errors: 0, Skipped: 0/);
const child = spawn('java', ['-jar', 'target/coding-order-lab-1.0.0.jar', '--server.address=127.0.0.1', '--server.port=0'], { cwd: work });
let startup = '';
child.stdout.on('data', data => { startup += data; });
child.stderr.on('data', data => { startup += data; });
const http = [];
try {
  let port;
  for (let attempt = 0; attempt < 200; attempt++) {
    const match = startup.match(/Tomcat started on port (\d+)/);
    if (match) { port = match[1]; break; }
    assert.equal(child.exitCode, null, startup);
    await new Promise(done => setTimeout(done, 100));
  }
  assert.ok(port, startup);
  async function post(path, body, status, code) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await response.json();
    assert.equal(response.status, status);
    if (code) assert.equal(payload.code || payload.status, code);
    http.push({ path: path.replace(/[a-f\d-]{36}/g, '{uuid}'), status, code: payload.code || payload.status || null });
    return response;
  }
  const created = await post('/api/orders', { amount: 12.30 }, 201, 'CREATED');
  const location = created.headers.get('location');
  assert.match(location, /^\/api\/orders\/[a-f\d-]{36}$/);
  await post(location + '/cancel', undefined, 200, 'CANCELLED');
  await post(location + '/cancel', undefined, 200, 'CANCELLED');
  await post('/api/orders/00000000-0000-0000-0000-000000000001/cancel', undefined, 404, 'ORDER_NOT_FOUND');
  await post('/api/orders/not-a-uuid/cancel', undefined, 400);
  await post('/api/orders', { amount: 0 }, 400);
} finally {
  child.kill('SIGTERM');
  await new Promise(done => { if (child.exitCode !== null) done(); else child.once('exit', done); });
  writeFileSync(join(evidence, 'http-startup.log'), startup);
}
writeFileSync(join(evidence, 'results.json'), JSON.stringify({ checkedAt: new Date().toISOString(), java: 'release 17; local runtime 21', results, http, scope: 'Local source snapshots; 409 verified via MockMvc fixture, no external payment endpoint.' }, null, 2) + '\n');
console.log(JSON.stringify({ work, results, http }, null, 2));
