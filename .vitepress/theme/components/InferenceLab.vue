<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, RotateCcw } from '@lucide/vue'
import { kvBytes, matchPrefix, schedule, greedyVerification } from './inferenceMath.mjs'

defineProps<{ mode: 'generation' | 'lifecycle' | 'memory' | 'prefix' | 'batch' | 'speculative' | 'speech' | 'roofline' }>()
const generationStep = ref(0)
const generationCandidates = [
  [{ text: '先', probability: 60 }, { text: '请', probability: 30 }, { text: '可以', probability: 10 }],
  [{ text: '提交', probability: 70 }, { text: '打开', probability: 20 }, { text: '查看', probability: 10 }],
  [{ text: '申请', probability: 80 }, { text: '表单', probability: 15 }, { text: '材料', probability: 5 }],
]
const step = ref(0)
const lifecycle = [
  ['排队与分词', '输入已转换为 4 个教学 token；尚未进行模型计算。'],
  ['Prefill', '并行处理 4 个已知输入位置，建立 4 份位置状态，并从最后位置的输出选出“先”。'],
  ['Decode 1', '把“先”送入模型，缓存增至 5 个位置，得到“提交”。'],
  ['Decode 2', '把“提交”送入模型，缓存增至 6 个位置，得到“申请”。'],
  ['停止与释放', '达到演示停止条件，解除活跃引用。共享缓存是否保留，取决于缓存策略。'],
]
const input = ['年假', '怎么', '申请', '？']
const output = ['先', '提交', '申请']
const cached = computed(() => [0, 4, 5, 6, 0][step.value])
const shownOutput = computed(() => Math.min(3, step.value))

const memory = ref({ layers: 32, heads: 8, dimension: 128, bytes: 2, tokens: 8192, sequences: 32, parameters: 8, bits: 16, overhead: 4, capacity: 48 })
const numericFields = [
  { key: 'layers', label: '层数', min: 1, max: 256, step: 1 },
  { key: 'heads', label: 'KV 头数', min: 1, max: 256, step: 1 },
  { key: 'dimension', label: '每头维度', min: 1, max: 1024, step: 1 },
  { key: 'tokens', label: '每序列缓存 token', min: 1, max: 1048576, step: 1 },
  { key: 'sequences', label: '独立序列数', min: 1, max: 4096, step: 1 },
  { key: 'parameters', label: '参数量（十亿）', min: 0.1, max: 2000, step: 0.1 },
  { key: 'overhead', label: '预留其他显存（GiB）', min: 0, max: 1024, step: 0.5 },
  { key: 'capacity', label: '设备总显存（GiB）', min: 1, max: 2048, step: 1 },
] as const
const validMemory = computed(() => numericFields.every(f => Number.isFinite(memory.value[f.key]) && memory.value[f.key] >= f.min && memory.value[f.key] <= f.max && (f.step !== 1 || Number.isInteger(memory.value[f.key]))))
const kv = computed(() => kvBytes(memory.value) / 2 ** 30)
const weights = computed(() => memory.value.parameters * 1e9 * memory.value.bits / 8 / 2 ** 30)
const total = computed(() => kv.value + weights.value + memory.value.overhead)
const memoryParts = computed(() => [
  { label: '原始权重', value: weights.value, cls: 'blue' },
  { label: '原始 KV', value: kv.value, cls: 'green' },
  { label: '其他预留', value: memory.value.overhead, cls: 'amber' },
])
const mib = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const cacheTokens = 'A B C D E F G H I J K L'.split(' ')
const prefixText = ref('A B C D E F G X I J K L')
const pageSize = ref(4)
const requestedTokens = computed(() => prefixText.value.trim().split(/\s+/).filter(Boolean).slice(0, 40))
const prefix = computed(() => matchPrefix(cacheTokens, requestedTokens.value, pageSize.value))
const prefixCases = [
  ['局部改动', 'A B C D E F G X I J K L'],
  ['只改末尾', 'A B C D E F G H I J X Y'],
  ['改动开头', 'X B C D E F G H I J K L'],
  ['完全相同', 'A B C D E F G H I J K L'],
]

const lengths = [2, 6, 3, 2, 4]
const slots = ref(2)
const batchStep = ref(0)
const plans = computed(() => [
  { name: '整批结束后补入', ...schedule(lengths, slots.value, false) },
  { name: '每轮补入新请求', ...schedule(lengths, slots.value, true) },
])
const timelineTicks = computed(() => Math.max(...plans.value.map(p => p.ticks)))

const specStage = ref(0)
const draftCase = ref(2)
const target = ['先', '提交', '申请', '再', '等待']
const drafts = computed(() => [0, 1, 2, 3].map((i) => i === draftCase.value ? '删除' : target[i]))
const verification = computed(() => greedyVerification(target, drafts.value))

const speechStream = ref(true)
const speech = ref({ endpoint: 300, queue: 50, asr: 150, llm: 250, textRest: 600, tts: 180, audioRest: 800 })
const speechFields = [
  { key: 'endpoint', label: '断句等待', max: 1000 }, { key: 'queue', label: '累计排队', max: 1000 },
  { key: 'asr', label: 'ASR 收尾', max: 1000 }, { key: 'llm', label: '首段可合成文本', max: 1500 },
  { key: 'textRest', label: '等待剩余文本', max: 2000 }, { key: 'tts', label: 'TTS 首个可播放块', max: 1000 },
  { key: 'audioRest', label: '等待剩余音频', max: 2000 },
] as const
const speechParts = computed(() => speechFields.filter(f => !speechStream.value || !['textRest', 'audioRest'].includes(f.key)).map(f => ({ label: f.label, value: speech.value[f.key] })))
const speechTotal = computed(() => speechParts.value.reduce((sum, s) => sum + s.value, 0))
const roof = ref({ weightGB: 14, bandwidth: 2, flops: 14, compute: 100, batch: 1 })
const bandwidthMs = computed(() => roof.value.weightGB / roof.value.bandwidth)
const computeMs = computed(() => roof.value.flops * roof.value.batch / roof.value.compute)
const boundMs = computed(() => Math.max(bandwidthMs.value, computeMs.value))
</script>

<template>
  <section class="inference-lab" :data-lab="mode" :aria-label="`${mode} 教学实验`">
    <template v-if="mode === 'generation'">
      <div class="lab-heading"><strong>接出下一段文字</strong><span>固定候选概率的教学演示</span></div>
      <p>问题：年假怎么申请？</p>
      <div class="token-line"><span class="row-label">已生成</span><span v-for="(token, i) in output.slice(0, generationStep)" :key="i" class="token blue">{{ token }}</span><span v-if="!generationStep">等待选择第一段</span></div>
      <template v-if="generationStep < 3">
        <p>根据问题{{ generationStep ? '和已生成的内容' : '' }}，下一段的候选为：</p>
        <div v-for="candidate in generationCandidates[generationStep]" :key="candidate.text" class="bound-row"><span>{{ candidate.text }}</span><meter min="0" max="100" :value="candidate.probability" :aria-label="`${candidate.text}，示例概率 ${candidate.probability}%`" /><strong>{{ candidate.probability }}%</strong></div>
      </template>
      <p v-else>已经接出“先提交申请”。真实生成还可以继续接字句，直到结束；这里在第三段停下。</p>
      <p class="result" aria-live="polite">{{ generationStep < 3 ? `第 ${generationStep + 1} 轮：当前最高的是“${generationCandidates[generationStep][0].text}”。` : '三轮选择完成，每一轮都使用了前面选出的结果。' }}</p>
      <div class="lab-actions"><button type="button" class="icon-button" title="重新开始生成" aria-label="重新开始生成" @click="generationStep = 0"><RotateCcw :size="18" /></button><button type="button" :disabled="generationStep === 3" @click="generationStep++">选择最高项<ArrowRight :size="18" /></button></div>
    </template>

    <template v-else-if="mode === 'lifecycle'">
      <div class="lab-heading"><strong>逐步观察一个请求</strong><span>教学 token，不是真实分词</span></div>
      <ol class="phase-track"><li v-for="(phase, i) in lifecycle" :key="phase[0]" :class="{ current: step === i, done: step > i }"><span>{{ i + 1 }}</span>{{ phase[0] }}</li></ol>
      <div class="token-line"><span class="row-label">输入</span><span v-for="(token, i) in input" :key="i" class="token" :class="{ green: step > 0 && step < 4 }">{{ token }}</span></div>
      <div class="token-line"><span class="row-label">输出</span><span v-for="(token, i) in output" :key="i" class="token" :class="{ blue: i < shownOutput, unseen: i >= shownOutput }">{{ i < shownOutput ? token : '待生成' }}</span></div>
      <p class="result" aria-live="polite">{{ lifecycle[step][1] }}</p>
      <p class="lab-note">活跃 KV：{{ cached }} 个位置。刚采样出的 token，要在下一次前向中才建立自己的 KV。</p>
      <div class="lab-actions"><button type="button" class="icon-button" title="重新开始" aria-label="重新开始" @click="step = 0"><RotateCcw :size="18" /></button><button type="button" :disabled="step === 4" @click="step++">下一步<ArrowRight :size="18" /></button><span>{{ step + 1 }} / 5</span></div>
    </template>

    <template v-else-if="mode === 'memory'">
      <div class="lab-heading"><strong>显存预算计算器</strong><span>常规全历史 MHA / GQA / MQA</span></div>
      <div class="field-grid"><label v-for="field in numericFields" :key="field.key">{{ field.label }}<input v-model.number="memory[field.key]" type="number" :min="field.min" :max="field.max" :step="field.step" /></label><label>权重位宽<select v-model.number="memory.bits"><option :value="16">16 bit</option><option :value="8">8 bit</option><option :value="4">4 bit</option></select></label><label>KV 每元素字节<select v-model.number="memory.bytes"><option :value="2">2 字节（BF16 / FP16）</option><option :value="1">1 字节（8 bit）</option><option :value="0.5">0.5 字节（4 bit 下界）</option></select></label></div>
      <template v-if="validMemory"><div class="budget-bar" role="img" :aria-label="`预算共 ${mib(total)} GiB`"><span v-for="part in memoryParts" :key="part.label" :class="part.cls" :style="{ flex: part.value }"></span></div><div class="legend"><span v-for="part in memoryParts" :key="part.label"><i :class="part.cls"></i>{{ part.label }} {{ mib(part.value) }} GiB</span></div><p class="result" aria-live="polite">合计 {{ mib(total) }} / {{ memory.capacity }} GiB · {{ total > memory.capacity ? '超出预算' : '原始预算可容纳，仍需实测峰值' }}</p><p class="lab-note">单序列每 token {{ mib(kvBytes({ ...memory, tokens: 1, sequences: 1 }) / 1024) }} KiB。权重与 KV 均为原始位数估算，不含量化 scale、分页尾块等；“其他预留”由你填写，不是自动测量。独立序列不共享前缀，不按 GPU 数自动相除。</p></template>
      <p v-else role="alert" class="result">请填写范围内的有效数字；层数、头数、维度、长度和序列数必须为整数。</p>
    </template>

    <template v-else-if="mode === 'prefix'">
      <div class="lab-heading"><strong>找到可复用的前缀</strong><span>显式 token ID 演示，最多显示 40 个</span></div>
      <div class="choice-row" role="group" aria-label="前缀变化场景"><button v-for="[label, value] in prefixCases" :key="label" type="button" :aria-pressed="prefixText === value" @click="prefixText = value">{{ label }}</button></div>
      <label class="full-label">新请求 token（空格分隔）<textarea v-model="prefixText" rows="2" spellcheck="false" maxlength="300" /></label>
      <label class="inline-field">完整页粒度<select v-model.number="pageSize"><option :value="1">1 token</option><option :value="2">2 token</option><option :value="4">4 token</option></select></label>
      <div class="token-line"><span class="row-label">已缓存</span><span v-for="(token, i) in cacheTokens" :key="i" class="token" :class="{ green: i < prefix.reusable, 'page-end': (i + 1) % pageSize === 0 }">{{ token }}</span></div>
      <div class="token-line"><span class="row-label">新请求</span><span v-for="(token, i) in requestedTokens" :key="i" class="token" :class="{ green: i < prefix.reusable, amber: i >= prefix.reusable && i < prefix.exact, 'page-end': (i + 1) % pageSize === 0 }">{{ token }}</span><span v-if="!requestedTokens.length">空请求</span></div>
      <p class="result" aria-live="polite">相同前缀 {{ prefix.exact }} token → 完整页可复用 {{ prefix.reusable }} → 至少重算 {{ requestedTokens.length - prefix.reusable }}</p>
      <p class="lab-note">绿色是可复用页，黄色是相同但未凑成完整页的位置。首次不同时，后面即使再次相同也不能直接续用。此处假设模型、LoRA、位置及其他状态标识全部兼容；两个引擎的实际粒度还受模型与后端限制。</p>
    </template>

    <template v-else-if="mode === 'batch'">
      <div class="lab-heading"><strong>观察批处理的空位</strong><span>全部请求在第 0 轮到达；每步成本相同</span></div>
      <label class="inline-field">活跃序列上限<select v-model.number="slots" @change="batchStep = 0"><option :value="2">2 条</option><option :value="3">3 条</option></select></label>
      <label class="full-label">观察到第 {{ batchStep }} 轮<input v-model.number="batchStep" type="range" :min="0" :max="timelineTicks" /></label>
      <div v-for="plan in plans" :key="plan.name" class="timeline-plan"><strong>{{ plan.name }}</strong><div class="timeline-scroll" tabindex="0" :aria-label="plan.name + '时间线'"><div class="timeline" :style="{ gridTemplateColumns: `62px repeat(${timelineTicks}, minmax(27px, 1fr))` }"><span>轮次</span><span v-for="n in timelineTicks" :key="n">{{ n }}</span><template v-for="(row, i) in plan.rows" :key="i"><span>{{ String.fromCharCode(65 + i) }} · {{ lengths[i] }}</span><span v-for="t in timelineTicks" :key="t" class="tick" :class="{ blue: row.includes(t - 1) && t <= batchStep, ghost: row.includes(t - 1) && t > batchStep }">{{ row.includes(t - 1) && t <= batchStep ? String.fromCharCode(65 + i) : '' }}</span></template></div></div><p class="lab-note">完成需 {{ plan.ticks }} 轮 · 序列槽位利用率 {{ Math.round(plan.work / (plan.ticks * slots) * 100) }}%</p></div>
      <p class="result">灰色虚线为尚未推进的工作。两种方法都完成 17 个输出 token；总轮数差别来自空位能否及时补入。</p>
      <p class="lab-note">这不是 GPU 利用率或性能预测：没有计算 prefill、KV 限制、不同 batch 的耗时及抢占。真实连续批处理在迭代边界重组执行集合。</p>
    </template>

    <template v-else-if="mode === 'speculative'">
      <div class="lab-heading"><strong>先提议，再验证</strong><span>确定性 greedy 教学模型</span></div>
      <label class="inline-field">草稿错误位置<select v-model.number="draftCase" @change="specStage = 0"><option :value="0">第 1 个</option><option :value="2">第 3 个</option><option :value="-1">全部匹配</option></select></label>
      <div class="token-line"><span class="row-label">草稿</span><span v-for="(token, i) in drafts" :key="i" class="token" :class="{ unseen: specStage === 0, green: specStage > 1 && i < verification.accepted, red: specStage > 1 && i === verification.accepted, discarded: specStage > 1 && i > verification.accepted }">{{ specStage ? token : '候选' }}</span></div>
      <div class="token-line"><span class="row-label">目标路径</span><span v-for="(token, i) in target" :key="i" class="token" :class="{ unseen: specStage < 2, blue: specStage >= 2 }">{{ specStage >= 2 ? token : '?' }}</span></div>
      <div class="token-line"><span class="row-label">已提交</span><template v-if="specStage === 3"><span v-for="(token, i) in verification.committed" :key="i" class="token green">{{ token }}</span></template><span v-else>尚未提交</span></div>
      <p class="result" aria-live="polite">{{ ['等待提出 4 个候选。', '草稿已产生；目标模型尚未验证。', `并行验证：匹配 ${verification.accepted} 个。${verification.rejected ? '首个错误后的候选全部作废。' : '全部匹配，可以额外推进一个目标 token。'}`, `本轮提交 ${verification.committed.length} 个 token：接受前缀加目标模型给出的修正或额外 token。`][specStage] }}</p>
      <div class="lab-actions"><button type="button" class="icon-button" title="重新开始" aria-label="重新开始推测验证" @click="specStage = 0"><RotateCcw :size="18" /></button><button type="button" :disabled="specStage === 3" @click="specStage++">{{ ['提出草稿', '目标验证', '提交结果', '已完成'][specStage] }}<ArrowRight :size="18" /></button></div>
      <p class="lab-note">这演示的是 greedy 匹配，未模拟随机采样分布。精确随机推测采样还需要接受概率和拒绝后的修正分布，不能只比较两个模型的最高概率词。</p>
    </template>

    <template v-else-if="mode === 'speech'">
      <div class="lab-heading"><strong>首音频时延预算</strong><span>从用户实际停止说话起算</span></div>
      <div class="choice-row" role="group" aria-label="语音输出方式"><button type="button" :aria-pressed="speechStream" @click="speechStream = true">文本与音频均分块</button><button type="button" :aria-pressed="!speechStream" @click="speechStream = false">等待完整文本与音频</button></div>
      <div class="field-grid"><label v-for="field in speechFields" :key="field.key">{{ field.label }} · {{ speech[field.key] }} ms<input v-model.number="speech[field.key]" type="range" :min="0" :max="field.max" :step="10" :disabled="speechStream && ['textRest', 'audioRest'].includes(field.key)" /></label></div>
      <div class="speech-waterfall"><div v-for="(part, i) in speechParts" :key="part.label"><span>{{ part.label }}</span><div class="waterfall-track"><span :style="{ marginLeft: `${speechTotal ? speechParts.slice(0, i).reduce((sum, s) => sum + s.value, 0) / speechTotal * 100 : 0}%`, width: `${speechTotal ? part.value / speechTotal * 100 : 0}%` }" :class="i % 2 ? 'blue' : 'green'"></span></div><span>{{ part.value }} ms</span></div></div>
      <p class="result" aria-live="polite">首个可播放音频约 {{ speechTotal }} ms</p>
      <p class="lab-note">串行关键路径估算，未计网络、播放缓冲、回声消除与设备开销；ASR 主体假设已在说话时运行，只计收尾。分块模式仍须攒够可合成文本，后续音频也须及时续上。这里不估计整段对话完成时间。</p>
    </template>

    <template v-else-if="mode === 'roofline'">
      <div class="lab-heading"><strong>计算与搬运的理想下界</strong><span>简化单步稠密模型估算</span></div>
      <div class="field-grid"><label>权重读取 {{ roof.weightGB }} GB<input v-model.number="roof.weightGB" type="range" min="1" max="80" /></label><label>有效带宽 {{ roof.bandwidth }} TB/s<input v-model.number="roof.bandwidth" type="range" min="0.1" max="4" step="0.1" /></label><label>每 token 运算 {{ roof.flops }} GFLOP<input v-model.number="roof.flops" type="range" min="1" max="200" /></label><label>有效算力 {{ roof.compute }} TFLOP/s<input v-model.number="roof.compute" type="range" min="1" max="200" /></label><label>本轮序列数 {{ roof.batch }}<input v-model.number="roof.batch" type="range" min="1" max="128" /></label></div>
      <div class="bound-row"><span>读取权重</span><meter min="0" :max="Math.max(bandwidthMs, computeMs)" :value="bandwidthMs" /> <strong>{{ bandwidthMs.toFixed(2) }} ms</strong></div><div class="bound-row"><span>执行计算</span><meter min="0" :max="Math.max(bandwidthMs, computeMs)" :value="computeMs" /><strong>{{ computeMs.toFixed(2) }} ms</strong></div>
      <p class="result" aria-live="polite">本轮耗时至少 {{ boundMs.toFixed(2) }} ms · 当前偏{{ bandwidthMs >= computeMs ? '权重带宽' : '计算' }}约束</p>
      <p class="lab-note">假设整批共享一次权重读取，运算量随序列数线性增加，两项可理想重叠。未计 KV、注意力、通信、启动和调度；有效带宽与算力由你假设。默认 14 GB / 2 TB/s = 7 ms 仅为权重搬运下界，不是实测 token 速度。</p>
    </template>
  </section>
</template>

<style scoped>
.inference-lab { margin: 28px 0; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); font-size: 14px; letter-spacing: 0; }
.lab-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; margin-bottom: 20px; }
.lab-heading strong { font-size: 17px; }
.lab-heading > span, .lab-note { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.8; }
.inference-lab .lab-note { margin: 10px 0 0; }
.inference-lab label { display: grid; gap: 6px; min-width: 0; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.inference-lab input:not([type="range"]), .inference-lab select, .inference-lab textarea { width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }
.inference-lab textarea { resize: vertical; }
.inference-lab input[type="range"] { width: 100%; min-height: 32px; accent-color: var(--vp-c-brand-1); }
.inference-lab input:disabled { opacity: .35; }
.inference-lab button { display: inline-flex; gap: 8px; justify-content: center; align-items: center; min-height: 44px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); font: inherit; color: var(--vp-c-text-1); cursor: pointer; }
.inference-lab button[aria-pressed="true"] { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.inference-lab button:disabled { cursor: default; opacity: .4; }
.inference-lab :is(button,input,select,textarea):focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.lab-actions, .choice-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.inference-lab .icon-button { width: 44px; padding: 0; }
.inference-lab .result { padding-top: 14px; margin: 16px 0 0; border-top: 1px solid var(--vp-c-divider); line-height: 1.9; font-weight: 600; overflow-wrap: anywhere; }
.phase-track { padding: 0; margin: 0 0 24px; list-style: none; display: grid; gap: 6px; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.phase-track li { margin: 0; padding: 8px 4px; text-align: center; font-size: 12px; border-bottom: 3px solid var(--vp-c-divider); }
.phase-track li > span { display: block; font-variant-numeric: tabular-nums; }
.phase-track .current { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); font-weight: 600; }
.phase-track .done { border-color: #14b8a6; }
.token-line { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 12px 0; min-height: 40px; }
.row-label { min-width: 62px; color: var(--vp-c-text-2); }
.token { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; min-height: 34px; padding: 4px 8px; border-radius: 3px; border: 1px solid var(--vp-c-divider); overflow-wrap: anywhere; max-width: 100%; font-variant-numeric: tabular-nums; }
.unseen { color: var(--vp-c-text-3); background: transparent; border-style: dashed; }
.green { background: #d1fae5; color: #065f46; }
.blue { background: #dbeafe; color: #1e40af; }
.amber { background: #fef3c7; color: #854d0e; }
.red { background: #ffe4e6; color: #9f1239; }
.discarded { opacity: .45; text-decoration: line-through; }
.page-end { margin-right: 10px; border-right: 3px solid var(--vp-c-text-2); }
.budget-bar { display: flex; width: 100%; height: 28px; margin-top: 24px; border: 1px solid var(--vp-c-divider); overflow: hidden; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 12px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border: 1px solid #64748b; }
.full-label { margin: 16px 0; }
.inference-lab .inline-field { grid-template-columns: auto minmax(120px, 220px); justify-content: start; align-items: center; margin: 16px 0; }
.timeline-plan { margin: 20px 0; }
.timeline-scroll { overflow-x: auto; margin-top: 10px; }
.timeline { display: grid; min-width: 460px; gap: 3px; font-size: 12px; text-align: center; font-variant-numeric: tabular-nums; }
.timeline > span { min-height: 26px; display: grid; place-items: center; }
.tick { border: 1px solid var(--vp-c-divider); border-radius: 2px; }
.ghost { border-style: dashed; background: var(--vp-c-bg); }
.speech-waterfall { margin-top: 24px; display: grid; gap: 8px; }
.speech-waterfall > div { display: grid; grid-template-columns: 112px minmax(0, 1fr) 70px; align-items: center; gap: 8px; font-size: 12px; }
.waterfall-track { height: 18px; background: var(--vp-c-bg); }
.waterfall-track > span { display: block; height: 100%; min-width: 1px; }
.bound-row { display: grid; grid-template-columns: 80px minmax(0, 1fr) 85px; align-items: center; gap: 8px; margin-top: 14px; }
.bound-row meter { width: 100%; height: 24px; }
.bound-row strong { text-align: right; font-variant-numeric: tabular-nums; }
@media (max-width: 520px) { .inference-lab { padding: 14px; } .field-grid { grid-template-columns: 1fr; } .phase-track { grid-template-columns: 1fr; gap: 2px; } .phase-track li { display: flex; text-align: left; gap: 10px; border-bottom-width: 1px; padding: 4px; } .speech-waterfall > div { grid-template-columns: 82px minmax(0, 1fr) 60px; gap: 4px; } .bound-row { grid-template-columns: 70px minmax(0, 1fr) 75px; font-size: 12px; } }
</style>
