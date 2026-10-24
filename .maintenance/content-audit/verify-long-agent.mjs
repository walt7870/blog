import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = resolve('public/ai/examples/long-agent-resume.mjs');
const evidence = resolve('.maintenance/content-audit/evidence/long-agent');
mkdirSync(evidence, { recursive: true });
const results = [];
const fixture = () => mkdtempSync(join(tmpdir(), 'blog-long-agent-'));
const read = (folder, name) => JSON.parse(readFileSync(join(folder, name), 'utf8'));
const save = (folder, name, value) => writeFileSync(join(folder, name), JSON.stringify(value));
function run(name, folder, command, expected, option) {
  const result = spawnSync(process.execPath, [script, command, folder, ...option ? [option] : []], { encoding: 'utf8' });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  results.push({ name, exit: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() });
}
const folder = fixture();
run('初始化', folder, 'init', 0);
run('成功写入后响应丢失', folder, 'run', 75, '--crash-after-submit');
assert.equal(read(folder, 'checkpoint.json').status, 'unknown');
assert.equal(read(folder, 'service.json').archive_count, 1);
run('检查未知状态', folder, 'inspect', 0);
run('新进程恢复', folder, 'run', 0);
assert.equal(read(folder, 'checkpoint.json').status, 'succeeded');
assert.equal(read(folder, 'checkpoint.json').report_id, 'report-1');
run('再次运行复用结果', folder, 'run', 0);
assert.equal(read(folder, 'service.json').archive_count, 1);
assert.equal(read(folder, 'checkpoint.json').attempts, 1);
const before = read(folder, 'checkpoint.json');
run('拒绝覆盖现有实验', folder, 'init', 2);
assert.deepEqual(read(folder, 'checkpoint.json'), before);

const stale = fixture();
run('过期输入初始化', stale, 'init', 0);
const report = read(stale, 'report.json');
report.amount++;
save(stale, 'report.json', report);
run('输入变化拒绝执行', stale, 'run', 2);
assert.equal(read(stale, 'service.json').archive_count, 0);

const conflict = fixture();
run('冲突初始化', conflict, 'init', 0);
run('冲突前保存远端结果', conflict, 'run', 75, '--crash-after-submit');
const service = read(conflict, 'service.json');
service.operations['report-01:r1:archive'].digest = 'different-parameters';
save(conflict, 'service.json', service);
run('同键不同参数拒绝执行', conflict, 'run', 2);
assert.equal(read(conflict, 'checkpoint.json').status, 'unknown');
assert.equal(read(conflict, 'service.json').archive_count, 1);

const corrupt = fixture();
run('内容异常初始化', corrupt, 'init', 0);
run('内容异常前保存远端结果', corrupt, 'run', 0);
const corruptService = read(corrupt, 'service.json');
corruptService.operations['report-01:r1:archive'].report.amount++;
save(corrupt, 'service.json', corruptService);
run('回读内容变化保留验证状态', corrupt, 'run', 2);
assert.equal(read(corrupt, 'checkpoint.json').status, 'verifying');
assert.equal(read(corrupt, 'service.json').archive_count, 1);
save(corrupt, 'service.json', { archive_count: 0, operations: {} });
run('验证状态下记录丢失不能新建', corrupt, 'run', 2);
assert.equal(read(corrupt, 'service.json').archive_count, 0);

writeFileSync(join(evidence, 'simulation.json'), JSON.stringify({ checkedAt: new Date().toISOString(),
  node: process.version, scope: '单执行者本地模拟；独立子进程恢复，无真实外部接口或模型。', results }, null, 2) + '\n');
console.log(JSON.stringify({ checks: results.length, passed: true, evidence }, null, 2));
