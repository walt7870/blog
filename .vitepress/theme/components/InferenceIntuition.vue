<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, ClipboardList, Cpu, MessageSquare, Send } from '@lucide/vue'

defineProps<{ mode: 'roles' | 'desk' | 'notes' }>()
const role = ref(0)
const roles = [
  { title: '应用', icon: MessageSquare, action: '准备问题与资料', analogy: '业务柜台', detail: '把“年假怎么申请？”和有权访问的制度片段交给模型服务；结果回来后决定如何展示、是否调用业务接口。' },
  { title: '推理引擎', icon: ClipboardList, action: '排队、保存进度', analogy: '派单与进度管理', detail: 'vLLM、SGLang 在这里工作：决定这一轮推进哪些请求，给它们分配状态空间，处理结束与取消。' },
  { title: '模型与硬件', icon: Cpu, action: '实际计算下一步', analogy: '方法与执行设备', detail: '模型架构和权重规定计算，GPU 等设备执行它。换派单流程可以影响效率，但不会自动让模型学会新制度。' },
  { title: '返回应用', icon: Send, action: '把片段交给用户', analogy: '交付答复', detail: '已生成片段逐步返回。模型说“提交申请”只是文字；真正提交还要由应用校验身份、权限和业务状态。' },
]
const preset = ref(0)
const presets = [
  { name: '1 人 · 短对话', tokens: 1024, sequences: 1, story: '权重加载一份；这条短上下文只占少量计算便笺。' },
  { name: '1 人 · 8K 资料', tokens: 8192, sequences: 1, story: '权重没有改变；资料变长，需要保留的中间状态增加。' },
  { name: '32 人 · 各自 8K', tokens: 8192, sequences: 32, story: '同一份权重服务多人，但独立上下文各有状态；总预算超过 48 GiB。' },
]
const weights = 8e9 * 2 / 2 ** 30
const kv = computed(() => presets[preset.value].tokens * presets[preset.value].sequences * 128 * 1024 / 2 ** 30)
const total = computed(() => weights + kv.value + 4)
const scale = computed(() => Math.max(total.value, 48))
const parts = computed(() => [{ name: '共享权重', value: weights, tone: 'blue' }, { name: '请求 KV', value: kv.value, tone: 'green' }, { name: '其他预留', value: 4, tone: 'amber' }])
const useNotes = ref(true)
const tokens = ['年假', '怎么', '申请', '？', '先', '提交']
const noteRows = [{ name: '读题', length: 4, fresh: 4 }, { name: '接着写', length: 5, fresh: 1 }, { name: '再写', length: 6, fresh: 1 }]
</script>

<template>
  <section class="intuition" :data-intuition="mode">
    <template v-if="mode === 'roles'">
      <p class="question"><MessageSquare :size="20" aria-hidden="true" /><strong>小林：年假怎么申请？</strong></p>
      <div class="role-flow" role="group" aria-label="问答服务中的职责">
        <template v-for="(item, i) in roles" :key="item.title">
          <button type="button" :aria-pressed="role === i" @click="role = i"><component :is="item.icon" :size="28" aria-hidden="true" /><strong>{{ i + 1 }}. {{ item.title }}</strong><span>{{ item.action }}</span></button>
          <ArrowRight v-if="i < roles.length - 1" class="flow-arrow" :size="18" aria-hidden="true" />
        </template>
      </div>
      <p class="role-detail" aria-live="polite"><strong>{{ roles[role].analogy }}</strong><br />{{ roles[role].detail }}</p>
    </template>

    <template v-else-if="mode === 'desk'">
      <div class="choices" role="group" aria-label="改变资料助手的工作量"><button v-for="(item, i) in presets" :key="item.name" type="button" :aria-pressed="preset === i" @click="preset = i">{{ item.name }}</button></div>
      <p class="desk-caption">一张 48 GiB 的“工作台”</p>
      <div class="desk-bar" role="img" :aria-label="`权重${weights.toFixed(2)}GiB，KV${kv}GiB，其他4GiB`"><span v-for="part in parts" :key="part.name" :class="part.tone" :style="{ width: `${part.value / scale * 100}%` }"></span><i class="capacity" :style="{ left: `${48 / scale * 100}%` }"></i></div>
      <div class="legend"><span v-for="part in parts" :key="part.name"><i :class="part.tone"></i>{{ part.name }} {{ part.value.toFixed(2) }} GiB</span></div>
      <p class="result" aria-live="polite">{{ presets[preset].story }}<br /><strong>{{ total.toFixed(2) }} / 48 GiB{{ total > 48 ? '，放不下' : '，原始预算可容纳' }}</strong></p>
      <p class="note">工作台类比对应显存容量。假设 8B BF16 权重，每 token KV 128 KiB，各请求不共享前缀；4 GiB 为手动预留。竖线是容量上限，超出部分仍显示在比例条内。实际峰值还要测量。</p>
    </template>

    <template v-else>
      <div class="choices" role="group" aria-label="是否保留计算便笺"><button type="button" :aria-pressed="!useNotes" @click="useNotes = false">每轮从头算 K/V</button><button type="button" :aria-pressed="useNotes" @click="useNotes = true">保留历史 K/V</button></div>
      <div class="note-grid"><span></span><span v-for="(token, i) in tokens" :key="i">{{ token }}</span><template v-for="row in noteRows" :key="row.name"><strong>{{ row.name }}</strong><span v-for="(_, i) in tokens" :key="i" class="note-cell" :class="i >= row.length ? 'empty' : useNotes && i < row.length - row.fresh ? 'reused' : 'fresh'">{{ i >= row.length ? '—' : useNotes && i < row.length - row.fresh ? '复用' : '新算' }}</span></template></div>
      <div class="legend"><span><i class="fresh"></i>本轮计算</span><span><i class="reused"></i>已有状态</span></div>
      <p class="result" aria-live="polite">三轮共建立 {{ useNotes ? '4 + 1 + 1 = 6' : '4 + 5 + 6 = 15' }} 个位置的 K/V。{{ useNotes ? '历史便笺保留下来，只为新位置建立状态。' : '旧位置也反复计算，重复工作越来越多。' }}</p>
      <p class="note">词块仅为教学 token。这里只数 K/V 位置的重复建立；每个新位置仍要查询历史，表格不代表整体 FLOP 或加速倍数。</p>
    </template>
  </section>
</template>

<style scoped>
.intuition { margin: 24px 0; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); font-size: 14px; letter-spacing: 0; }
.intuition p { margin: 12px 0; line-height: 1.85; }
.intuition .question { display: flex; align-items: center; gap: 10px; margin: 0 0 20px; font-size: 17px; }
.role-flow { display: grid; grid-template-columns: 1fr 18px 1fr 18px 1fr 18px 1fr; align-items: center; gap: 6px; }
.role-flow button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 150px; width: 100%; padding: 8px 2px; border-bottom: 3px solid var(--vp-c-divider); cursor: pointer; font: inherit; }
.role-flow button > span { color: var(--vp-c-text-2); font-size: 12px; }
.role-flow button[aria-pressed="true"] { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.role-flow svg { flex: none; }
.flow-arrow { color: var(--vp-c-text-3); }
.intuition .role-detail { min-height: 140px; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--vp-c-divider); }
.choices { display: flex; flex-wrap: wrap; gap: 8px; }
.choices button { min-height: 44px; padding: 8px 10px; font: inherit; border: 1px solid var(--vp-c-divider); border-radius: 4px; cursor: pointer; }
.choices button[aria-pressed="true"] { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); }
.intuition button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.desk-caption { padding-top: 12px; }
.desk-bar { position: relative; display: flex; height: 76px; background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); margin: 22px 0 12px; }
.desk-bar > span { flex: none; }
.capacity { position: absolute; height: calc(100% + 12px); top: -6px; border-right: 2px dashed var(--vp-c-text-1); transform: translateX(-2px); }
.legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 12px; font-size: 12px; }
.legend > span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { display: inline-block; width: 12px; height: 12px; border: 1px solid #64748b; }
.blue, .fresh { background: #dbeafe; color: #1e40af; }
.green, .reused { background: #d1fae5; color: #065f46; }
.amber { background: #fef3c7; color: #854d0e; }
.intuition .result { min-height: 92px; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--vp-c-divider); }
.intuition .note { font-size: 12px; color: var(--vp-c-text-2); }
.note-grid { display: grid; grid-template-columns: 48px repeat(6, minmax(0, 1fr)); gap: 4px; align-items: center; text-align: center; margin-top: 26px; font-size: 12px; }
.note-grid > span, .note-grid > strong { min-height: 38px; display: grid; place-items: center; }
.note-cell { border: 1px solid var(--vp-c-divider); border-radius: 3px; }
.note-cell.empty { border-style: dashed; color: var(--vp-c-text-3); }
@media (max-width: 560px) { .intuition { padding: 14px; } .role-flow { grid-template-columns: 1fr 1fr; gap: 8px; } .role-flow .flow-arrow { display: none; } .role-flow button { min-height: 130px; } .intuition .role-detail { min-height: 175px; } .note-grid { grid-template-columns: 40px repeat(6, minmax(0, 1fr)); gap: 3px; font-size: 11px; } }
</style>
