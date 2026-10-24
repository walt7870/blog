import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [command, directory, option] = process.argv.slice(2);
if (!['init', 'run', 'inspect'].includes(command) || !directory
    || (option !== undefined && (command !== 'run' || option !== '--crash-after-submit'))) {
  console.error('用法: node long-agent-resume.mjs init|run|inspect <已存在的实验目录> [--crash-after-submit]');
  process.exit(2);
}
const folder = resolve(directory);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read = name => JSON.parse(readFileSync(join(folder, name), 'utf8'));
function save(name, value) {
  const destination = join(folder, name);
  const temporary = destination + '.' + process.pid + '.tmp';
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  renameSync(temporary, destination);
}
function check(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  if (command === 'init') {
    for (const name of ['report.json', 'checkpoint.json', 'service.json']) {
      check(!existsSync(join(folder, name)), '目录已有实验数据，请换用一个新的空目录。');
    }
    const report = { title: '教学订单报告', snapshot: 'snapshot-01', months: 12, amount: 1200 };
    save('report.json', report);
    save('service.json', { archive_count: 0, operations: {} });
    save('checkpoint.json', {
      task_id: 'report-01', revision: 1, status: 'ready',
      key: 'report-01:r1:archive', input_digest: digest(report),
      verification: { revision: 1, digest: digest(report), passed: true },
      attempts: 0, report_id: null,
    });
    console.log('已初始化十二个月的教学报告与独立的执行端、服务端文件。');
  } else {
    const state = read('checkpoint.json');
    const service = read('service.json');
    const report = read('report.json');
    if (command === 'inspect') {
      console.log(JSON.stringify({ status: state.status, archive_count: service.archive_count,
        report_id: state.report_id, remote_report_id: service.operations[state.key]?.report_id ?? null }, null, 2));
    } else {
      check(state.verification.passed && state.verification.revision === state.revision
        && state.verification.digest === digest(report) && state.input_digest === digest(report),
      '输入或版本已变化：原验收证据过期，停止执行。');
      check(['ready', 'unknown', 'verifying', 'succeeded'].includes(state.status), '不支持的检查点状态。');

      // The service file is an independent, single-writer stand-in for a remote API.
      function lookup() {
        const operation = read('service.json').operations[state.key];
        if (operation) check(operation.digest === state.input_digest, '服务端拒绝：同键不同参数。');
        return operation;
      }
      function submit() {
        const remote = read('service.json');
        const existing = remote.operations[state.key];
        if (existing) {
          check(existing.digest === state.input_digest, '服务端拒绝：同键不同参数。');
          return existing;
        }
        remote.archive_count++;
        const operation = { report_id: 'report-' + remote.archive_count,
          digest: state.input_digest, report };
        remote.operations[state.key] = operation;
        save('service.json', remote);
        return operation;
      }

      let operation = lookup();
      if (!operation) {
        check(state.status === 'ready' || state.status === 'unknown', '检查点声称已有结果，但服务端记录缺失。');
        // Persist intent before submission, so restart always knows which operation to query.
        state.status = 'unknown';
        state.attempts++;
        save('checkpoint.json', state);
        operation = submit();
        if (option === '--crash-after-submit') {
          console.error('模拟响应丢失：归档已完成，本地仍为 unknown。退出码 75。');
          process.exit(75);
        }
      }
      state.status = 'verifying';
      state.report_id = operation.report_id;
      save('checkpoint.json', state);
      const reread = lookup();
      check(reread && reread.report_id === state.report_id && digest(reread.report) === state.input_digest,
        '回读验证失败，保留 verifying 状态供核查。');
      state.status = 'succeeded';
      save('checkpoint.json', state);
      console.log(JSON.stringify({ status: state.status, report_id: state.report_id,
        archive_count: read('service.json').archive_count, attempts: state.attempts }, null, 2));
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
