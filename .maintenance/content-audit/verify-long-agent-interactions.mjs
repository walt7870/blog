import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { archiveFrame, budgetAction, budgetStatus, createBudget, createPartitions, partitionAction } from '../../.vitepress/theme/components/agentTaskModel.mjs';

const checks = [];
function check(name, run) { run(); checks.push(name); }
for (const fault of [1, 8, 12]) {
  check(`${fault}月失败后按分区恢复，聚合受依赖约束`, () => {
    const initial = createPartitions(fault);
    assert.equal(partitionAction(initial, 'aggregate').aggregated, false);
    const failed = partitionAction(initial, 'query');
    assert.equal(failed.months.filter(m => m === 'verified').length, fault - 1);
    assert.equal(failed.months[fault - 1], 'failed');
    assert.equal(failed.calls, fault);
    assert.equal(partitionAction(failed, 'aggregate').aggregated, false);
    const handed = partitionAction(failed, 'handoff');
    assert.deepEqual(handed.months, failed.months);
    assert.equal(handed.calls, fault);
    const recovered = partitionAction(handed, 'retry');
    assert.equal(recovered.reused, fault - 1);
    assert.equal(recovered.calls, 13);
    assert.ok(recovered.months.every(m => m === 'verified'));
    assert.equal(partitionAction(recovered, 'aggregate').aggregated, true);
    assert.deepEqual(partitionAction(recovered, 'retry'), recovered);
    assert.ok(initial.months.every(m => m === 'pending'));
  });
}
check('响应丢失：服务端成功与客户端未知同时成立', () => {
  for (const policy of ['query', 'repeat']) {
    assert.equal(archiveFrame(1, policy).count, 0);
    const lost = archiveFrame(2, policy);
    assert.equal(lost.local, 'unknown');
    assert.equal(lost.count, 1);
    assert.equal(archiveFrame(3, policy).session, 2);
  }
});
check('原键恢复保持一份归档，换键反例产生两份', () => {
  for (const policy of ['query', 'repeat']) {
    const recovered = archiveFrame(4, policy);
    assert.equal(recovered.local, 'verifying');
    assert.equal(archiveFrame(5, policy).local, 'succeeded');
    assert.equal(recovered.count, policy === 'query' ? 1 : 2);
    assert.equal(recovered.key, policy === 'query' ? 'archive-01' : 'archive-02');
  }
});
check('换会话不重置额度，耗尽后不再接受业务调用', () => {
  let state = createBudget();
  state = budgetAction(state, 'progress');
  const handed = budgetAction(state, 'handoff');
  assert.equal(handed.used, state.used);
  assert.equal(handed.evidence, state.evidence);
  for (let i = 0; i < 10; i++) state = budgetAction(state, 'progress');
  assert.equal(state.used, 6);
  assert.equal(state.evidence, 5);
  assert.equal(budgetStatus(state), 'exhausted');
  assert.equal(budgetAction(state, 'handoff').used, 6);
});
check('三次无进展暂停，修正计划后沿用剩余预算', () => {
  let state = createBudget();
  for (let i = 0; i < 3; i++) state = budgetAction(state, 'repeat');
  assert.equal(budgetStatus(state), 'stalled');
  assert.equal(budgetAction(state, 'progress').used, 4);
  assert.equal(budgetStatus(budgetAction(state, 'handoff')), 'stalled');
  state = budgetAction(state, 'replan');
  assert.equal(state.used, 4);
  assert.equal(budgetStatus(state), 'running');
  assert.equal(budgetAction(state, 'progress').used, 5);
});
check('取消请求先停调度，远端确认后才完成取消', () => {
  const pending = budgetAction(createBudget(), 'cancel');
  assert.equal(budgetStatus(pending), 'cancel_requested');
  assert.equal(pending.remote, 'running');
  assert.equal(budgetAction(pending, 'progress').used, pending.used);
  assert.equal(budgetStatus(budgetAction(pending, 'handoff')), 'cancel_requested');
  const stopped = budgetAction(pending, 'confirm');
  assert.equal(budgetStatus(stopped), 'cancelled');
  assert.equal(stopped.remote, 'stopped');
  assert.equal(budgetAction(stopped, 'repeat').used, stopped.used);
});
const result = { checkedAt: new Date().toISOString(), node: process.version,
  scope: '页面教学模型；确定性状态转换，不代表真实服务或并发验证。', checks, passed: true };
writeFileSync('.maintenance/content-audit/evidence/long-agent/interactions.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
