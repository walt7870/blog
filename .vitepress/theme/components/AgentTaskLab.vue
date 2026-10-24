<script setup>
import { computed, ref } from 'vue'
import { ArrowDown, ArrowRight, Check, Circle, CircleAlert, FileCheck, Pause, Play, RotateCcw, Search, Square, StepForward } from '@lucide/vue'
import { archiveFrame, budgetAction, budgetStatus, createBudget, createPartitions, partitionAction } from './agentTaskModel.mjs'

const props = defineProps({ mode: { type: String, required: true } })
const fault = ref(8)
const partitions = ref(createPartitions())
const verified = computed(() => partitions.value.months.filter(m => m === 'verified').length)
const partitionStep = action => { partitions.value = partitionAction(partitions.value, action) }
const policy = ref('query')
const archiveStep = ref(0)
const frame = computed(() => archiveFrame(archiveStep.value, policy.value))
const budget = ref(createBudget())
const status = computed(() => budgetStatus(budget.value))
const spend = action => { budget.value = budgetAction(budget.value, action) }
const labels = { running: '可继续调度', exhausted: '额度耗尽', stalled: '停滞暂停', cancel_requested: '取消待确认', cancelled: '已确认停止' }
const stateLabels = { ready: '就绪', unknown: '结果未知', verifying: '验证中', succeeded: '已完成' }
const monthLabels = { pending: '未查询', failed: '超时', verified: '已核对' }
function reset() {
  partitions.value = createPartitions(Number(fault.value))
  archiveStep.value = 0
  budget.value = createBudget()
}
</script>

<template>
  <section class="agent-lab" :data-lab="mode" :aria-label="mode === 'partitions' ? '分区依赖教学实验' : mode === 'archive' ? '归档响应丢失教学实验' : '预算与取消教学实验'">
    <header class="lab-toolbar">
      <span class="lab-kicker">{{ mode === 'partitions' ? '分区与依赖' : mode === 'archive' ? '执行端与归档服务' : '共享任务账本' }}<span class="lab-simulation">教学模拟</span></span>
      <button class="lab-icon" type="button" title="重置实验" aria-label="重置实验" @click="reset"><RotateCcw :size="17" aria-hidden="true" /></button>
    </header>

    <template v-if="mode === 'partitions'">
      <div class="lab-settings"><label>超时月份 <select v-model="fault" @change="reset"><option v-for="n in 12" :key="n" :value="n">{{ n }} 月</option></select></label><span>会话 {{ partitions.session }}</span></div>
      <ol class="lab-months" aria-label="十二个月的查询状态">
        <li v-for="(month, i) in partitions.months" :key="i" :data-state="month">
          <span>{{ i + 1 }} 月</span><Check v-if="month === 'verified'" :size="17" aria-hidden="true" /><CircleAlert v-else-if="month === 'failed'" :size="17" aria-hidden="true" /><Circle v-else :size="15" aria-hidden="true" />
          <small>{{ monthLabels[month] }}</small>
        </li>
      </ol>
      <div class="lab-dependency" aria-label="聚合的依赖条件"><span :data-ok="verified === 12">已核对 {{ verified }}/12 月</span><ArrowDown :size="20" aria-hidden="true" /><strong :data-ok="partitions.aggregated">{{ partitions.aggregated ? '全年数量核对通过' : verified === 12 ? '依赖齐全，待聚合核对' : '聚合阻塞：必需分区缺失' }}</strong></div>
      <dl class="lab-stats"><div><dt>累计查询</dt><dd>{{ partitions.calls }} 次</dd></div><div><dt>恢复时复用</dt><dd>{{ partitions.reused }} 个月</dd></div></dl>
      <div class="lab-actions">
        <button type="button" :disabled="partitions.queried" @click="partitionStep('query')"><Play :size="16" aria-hidden="true" />执行查询</button>
        <button type="button" @click="partitionStep('handoff')"><StepForward :size="16" aria-hidden="true" />新会话接手</button>
        <button type="button" :disabled="!partitions.queried || verified === 12" @click="partitionStep('retry')"><Search :size="16" aria-hidden="true" />补查缺失月份</button>
        <button type="button" :disabled="verified !== 12 || partitions.aggregated" @click="partitionStep('aggregate')"><FileCheck :size="16" aria-hidden="true" />核对并聚合</button>
      </div>
      <p class="lab-result" role="status">{{ partitions.message }}</p>
    </template>

    <template v-else-if="mode === 'archive'">
      <div class="lab-segments" role="group" aria-label="归档恢复策略">
        <button type="button" :aria-pressed="policy === 'query'" @click="policy = 'query'; archiveStep = 0">原键回查</button>
        <button type="button" :aria-pressed="policy === 'repeat'" @click="policy = 'repeat'; archiveStep = 0">换键重发 · 反例</button>
      </div>
      <ol class="lab-rail" aria-label="归档过程"><li v-for="(label, i) in ['准备', '记意图', '丢响应', '换会话', '恢复', '验证']" :key="label" :aria-current="archiveStep === i ? 'step' : undefined" :data-done="archiveStep >= i"><span>{{ i + 1 }}</span>{{ label }}</li></ol>
      <div class="lab-sides">
        <div><span class="lab-side-label">执行端 · 会话 {{ frame.session }}</span><strong :data-warning="frame.local === 'unknown'">{{ stateLabels[frame.local] }}</strong><code>{{ frame.local }}</code><small>原操作：archive-01</small><small>当前键：{{ frame.key }}</small></div>
        <div><span class="lab-side-label">归档服务</span><strong :data-warning="frame.repeated">{{ frame.count }} 份归档</strong><span>{{ frame.remote }}</span><small>回读报告：{{ frame.report }}</small><small>{{ frame.repeated ? 'report-1 与 report-2 同时存在' : '归档按逻辑操作键去重' }}</small></div>
      </div>
      <div class="lab-actions"><button type="button" class="lab-primary" :disabled="archiveStep === 5" @click="archiveStep++"><ArrowRight :size="17" aria-hidden="true" />{{ frame.action || '过程结束' }}</button><span class="lab-step-count">{{ archiveStep + 1 }} / 6</span></div>
      <p class="lab-result" :data-warning="frame.repeated" role="status">{{ frame.note }}</p>
    </template>

    <template v-else-if="mode === 'budget'">
      <div class="lab-settings"><strong :data-warning="status !== 'running'">{{ labels[status] }}</strong><span>会话 {{ budget.session }}</span></div>
      <div class="lab-budget-meter" role="meter" aria-label="已用业务调用额度" :aria-valuenow="budget.used" :aria-valuemin="0" :aria-valuemax="budget.limit"><span v-for="n in budget.limit" :key="n" :data-used="n <= budget.used"></span></div>
      <dl class="lab-stats lab-stats-three"><div><dt>已用 / 总额度</dt><dd>{{ budget.used }} / {{ budget.limit }}</dd></div><div><dt>新增证据</dt><dd>{{ budget.evidence }} 项</dd></div><div><dt>连续无进展</dt><dd>{{ budget.unchanged }} 次</dd></div></dl>
      <div class="lab-remote"><span>在途作业</span><strong>{{ budget.remote === 'running' ? '远端仍在运行' : '远端已确认停止' }}</strong></div>
      <div class="lab-actions">
        <button type="button" :disabled="status !== 'running'" @click="spend('progress')"><Check :size="16" aria-hidden="true" />取得新证据</button>
        <button type="button" :disabled="status !== 'running'" @click="spend('repeat')"><Search :size="16" aria-hidden="true" />重复相同查询</button>
        <button type="button" @click="spend('handoff')"><StepForward :size="16" aria-hidden="true" />新会话接手</button>
        <button v-if="status === 'stalled'" type="button" @click="spend('replan')"><Play :size="16" aria-hidden="true" />修正计划后继续</button>
        <button type="button" :disabled="Boolean(budget.cancellation)" @click="spend('cancel')"><Pause :size="16" aria-hidden="true" />请求取消</button>
        <button v-if="budget.cancellation" type="button" :disabled="status !== 'cancel_requested'" @click="spend('confirm')"><Square :size="16" aria-hidden="true" />确认远端已停止</button>
      </div>
      <p class="lab-result" role="status">{{ budget.message }}</p>
    </template>
  </section>
</template>

<style scoped>
.agent-lab { margin: 24px 0; padding: 16px 0 0; border-block: 1px solid var(--vp-c-divider); font-size: 14px; line-height: 1.6; letter-spacing: 0; }
.lab-toolbar, .lab-settings, .lab-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.lab-toolbar { justify-content: space-between; margin-bottom: 14px; }
.lab-kicker { display: flex; align-items: center; gap: 12px; font-weight: 600; }
.lab-simulation { font-size: 12px; font-weight: 400; color: var(--vp-c-text-2); }
.agent-lab button { display: inline-flex; justify-content: center; align-items: center; gap: 6px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; cursor: pointer; }
.agent-lab button svg { flex: none; }
.agent-lab button:not(:disabled):hover { background: var(--vp-c-bg-soft); border-color: var(--vp-c-text-2); }
.agent-lab button:focus-visible, .agent-lab select:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.agent-lab button:disabled { opacity: .45; cursor: not-allowed; }
.agent-lab .lab-icon { width: 44px; flex: none; padding: 0; border-color: transparent; }
.lab-settings { justify-content: space-between; margin-bottom: 16px; color: var(--vp-c-text-2); }
.lab-settings label { display: flex; align-items: center; gap: 10px; }
.lab-settings select { min-height: 44px; min-width: 88px; padding: 6px 10px; background: var(--vp-c-bg); color: var(--vp-c-text-1); border: 1px solid var(--vp-c-divider); border-radius: 4px; font: inherit; }
.agent-lab .lab-months { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; list-style: none; padding: 0; margin: 12px 0 20px; }
.lab-months li { display: grid; justify-items: center; align-content: center; gap: 4px; height: 92px; margin: 0; border: 1px solid var(--vp-c-divider); border-radius: 4px; color: var(--vp-c-text-2); background: var(--vp-c-bg-soft); }
.lab-months small { font-size: 11px; }
.lab-months li[data-state="verified"] { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-2); background: var(--vp-c-brand-soft); }
.lab-months li[data-state="failed"] { color: var(--vp-c-danger-1); border-color: var(--vp-c-danger-1); background: var(--vp-c-danger-soft); }
.lab-dependency { display: grid; justify-items: center; gap: 6px; text-align: center; }
.lab-dependency > span { font-size: 13px; }
.lab-dependency > strong { width: 100%; padding: 12px 8px; background: var(--vp-c-bg-soft); border-block: 1px solid var(--vp-c-divider); font-weight: 500; }
.lab-dependency [data-ok="true"] { color: var(--vp-c-brand-1); }
.agent-lab .lab-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 18px 0; gap: 12px; }
.lab-stats dt { color: var(--vp-c-text-2); font-size: 12px; }
.lab-stats dd { margin: 4px 0 0; font-size: 20px; line-height: 1.4; font-variant-numeric: tabular-nums; }
.agent-lab .lab-stats-three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lab-actions { gap: 8px; margin: 18px 0 12px; }
.agent-lab .lab-result { display: flex; align-items: center; min-height: 100px; margin: 0; padding: 16px 0; font-size: 14px; line-height: 1.8; color: var(--vp-c-text-2); overflow-wrap: anywhere; }
.lab-segments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 22px; border-bottom: 1px solid var(--vp-c-divider); }
.agent-lab .lab-segments button { padding-inline: 4px; border: 0; border-bottom: 2px solid transparent; border-radius: 0; color: var(--vp-c-text-2); background: transparent; }
.agent-lab .lab-segments button[aria-pressed="true"] { color: var(--vp-c-brand-1); border-bottom-color: var(--vp-c-brand-1); font-weight: 600; }
.agent-lab .lab-rail { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); list-style: none; padding: 0; margin: 0 0 20px; }
.lab-rail li { display: grid; justify-items: center; gap: 6px; margin: 0; padding: 6px 0; color: var(--vp-c-text-3); font-size: 12px; border-top: 2px solid var(--vp-c-divider); }
.lab-rail li span { display: grid; place-items: center; width: 24px; height: 24px; font-variant-numeric: tabular-nums; }
.lab-rail li[data-done="true"] { color: var(--vp-c-brand-1); border-top-color: var(--vp-c-brand-1); }
.lab-rail li[aria-current="step"] span { color: var(--vp-c-bg); background: var(--vp-c-brand-1); border-radius: 50%; }
.lab-sides { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 206px; }
.lab-sides > div { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; padding: 14px 12px 14px 0; }
.lab-sides > div + div { padding: 14px 0 14px 18px; border-left: 1px solid var(--vp-c-divider); }
.lab-side-label { font-size: 12px; color: var(--vp-c-text-2); }
.lab-sides strong { margin: 3px 0; font-size: 22px; font-weight: 600; line-height: 1.4; }
.lab-sides small { font-size: 12px; overflow-wrap: anywhere; }
.lab-sides code { font-size: 12px; overflow-wrap: anywhere; }
.agent-lab [data-warning="true"] { color: var(--vp-c-danger-1); }
.agent-lab .lab-primary { color: var(--vp-c-bg); border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-1); }
.agent-lab .lab-primary:not(:disabled):hover { background: var(--vp-c-brand-2); border-color: var(--vp-c-brand-2); }
.lab-step-count { margin-left: auto; color: var(--vp-c-text-2); font-variant-numeric: tabular-nums; font-size: 12px; }
.lab-budget-meter { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin: 20px 0; }
.lab-budget-meter span { height: 24px; background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 3px; }
.lab-budget-meter span[data-used="true"] { background: var(--vp-c-brand-2); border-color: var(--vp-c-brand-2); }
.lab-remote { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding-block: 12px; border-block: 1px solid var(--vp-c-divider); font-size: 13px; }
.lab-remote > span { color: var(--vp-c-text-2); }
.lab-remote strong { font-weight: 500; }
@media (max-width: 480px) {
  .agent-lab .lab-months { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lab-months li { height: 84px; }
  .lab-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .agent-lab button { padding-inline: 6px; font-size: 12px; }
  .lab-rail li { font-size: 11px; }
  .lab-sides { min-height: 238px; }
  .lab-sides > div + div { padding-left: 12px; }
  .lab-sides strong { font-size: 20px; }
  .lab-sides small { font-size: 11px; }
  .lab-stats dd { font-size: 18px; }
  .agent-lab .lab-result { min-height: 126px; }
  [data-lab="archive"] .lab-actions { grid-template-columns: minmax(0, 1fr) auto; }
}
@media print { .lab-actions, .lab-icon { display: none; } }
</style>
