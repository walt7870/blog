<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Check, RotateCcw } from '@lucide/vue'

defineProps<{ mode: 'pipeline' | 'hotwords' }>()

const position = ref(0)
const stages = [
  { name: '收音', owner: '应用 · 音频接入', input: '麦克风的声音采样', output: '采样率、声道明确的音频块', detail: '应用取得录音权限，检查音频格式，把音频块送给识别器。此时还没有文字，也没有调用语言模型。' },
  { name: '准备输入', owner: 'sherpa-onnx · 特征与流状态', input: '音频块', output: '模型需要的声学特征与历史状态', detail: '常见识别模型需要先从波形中提取声学特征。流式路线还保留前面音频块的状态；具体输入由模型架构决定。' },
  { name: '模型计算', owner: 'ONNX Runtime · 计算后端', input: '特征、模型权重与所需状态', output: '模型输出的分数或中间表示', detail: '执行已适配模型的张量运算。图计算可能在解码过程中被多次调用；这里压成一个阶段便于观察职责。' },
  { name: '得到文字', owner: 'sherpa-onnx · 解码与结果', input: '模型输出与配套词表', output: '“年假怎么申请？”', detail: '匹配模型的解码过程将输出解释为文字。流式识别还要区分可修改的中间结果与提交后的最终结果。' },
  { name: '查资料并回答', owner: '应用 + vLLM / SGLang', input: '问题 + 有权访问的年假制度', output: '“在内部系统提交申请，由直属主管审批。”', detail: '应用检查权限并检索制度；引擎组织已适配语言模型的生成。权限校验和检索属于应用工作。' },
  { name: '合成声音', owner: 'sherpa-onnx + TTS 模型 + 计算后端', input: '回答文字', output: '可交给播放器的音频采样', detail: '这次加载的是受支持的语音合成模型。按模型需要完成文本处理、声学或波形计算；能否增量合成取决于具体模型与接口。' },
  { name: '播放', owner: '应用 · 播放器', input: '合成音频与当前会话标识', output: '小林听见回答', detail: '应用按音频时钟播放；用户打断时还要清除旧播放队列。推理完成和声音播放完成是两个时刻。' },
]
const stage = computed(() => stages[position.value])
const transducer = ref(true)
const beam = ref(true)
const enabled = ref(true)
const supported = computed(() => transducer.value && beam.value)
const status = computed(() => {
  if (!enabled.value) return { title: '未启用热词增强', detail: '没有给“周望君”对应的候选路径额外加分，识别结果由原始分数和解码过程决定。' }
  if (!transducer.value) return { title: '模型条件不满足', detail: '这套热词机制要求 Transducer 模型。换成其他架构后，仅勾选热词或填写文件不能获得这项能力。' }
  if (!beam.value) return { title: '解码条件不满足', detail: 'greedy_search 每步只保留局部最优选择；sherpa-onnx 的这套热词增强要求 modified_beam_search。' }
  return { title: '具备热词增强条件', detail: '搜索时可给“周望君”对应的路径加分，模型权重保持不变。候选是否最终胜出仍取决于声音、原始分数和热词分数。' }
})
</script>

<template>
  <section class="speech-runtime-lab" :data-speech-runtime="mode" :aria-label="mode === 'pipeline' ? '语音助手流程回放' : '热词配置条件实验'">
    <template v-if="mode === 'pipeline'">
      <div class="lab-heading"><strong>小林：年假怎么申请？</strong><span>固定样例 · 教学回放</span></div>
      <ol class="stages" aria-label="语音助手处理进度">
        <li v-for="(item, i) in stages" :key="item.name" :class="{ current: i === position, completed: i < position }" :aria-current="i === position ? 'step' : undefined">
          <span class="stage-number"><Check v-if="i < position" :size="14" aria-hidden="true" /><template v-else>{{ i + 1 }}</template></span>
          <span>{{ item.name }}</span>
        </li>
      </ol>
      <div class="stage-content" aria-live="polite" aria-atomic="true">
        <p class="owner">{{ position + 1 }} / {{ stages.length }} · {{ stage.owner }}</p>
        <dl class="data-change"><div><dt>输入</dt><dd>{{ stage.input }}</dd></div><div><dt>输出</dt><dd>{{ stage.output }}</dd></div></dl>
        <p class="stage-detail">{{ stage.detail }}</p>
      </div>
      <div class="playback-controls" role="group" aria-label="推进语音处理">
        <button type="button" aria-label="上一步" title="上一步" :disabled="position === 0" @click="position--"><ArrowLeft :size="18" aria-hidden="true" /></button>
        <button type="button" aria-label="重新开始语音流程" title="重新开始" :disabled="position === 0" @click="position = 0"><RotateCcw :size="18" aria-hidden="true" /></button>
        <button class="advance" type="button" :disabled="position === stages.length - 1" @click="position++">{{ position === stages.length - 1 ? '已到播放阶段' : '推进下一步' }}<ArrowRight :size="18" aria-hidden="true" /></button>
      </div>
      <p class="lab-note">模型与结果均为教学示例；不录音、不调用真实模型。实际服务可以重叠运行部分阶段，耗时需单独测量。</p>
    </template>
    <template v-else>
      <div class="lab-heading"><strong>联系人：周望君</strong><span>配置条件 · 教学实验</span></div>
      <div class="hotword-controls">
        <label>模型架构<select v-model="transducer" aria-label="热词实验模型架构"><option :value="true">Transducer</option><option :value="false">其他架构</option></select></label>
        <label>解码方式<select v-model="beam" aria-label="热词实验解码方式"><option :value="true">modified_beam_search</option><option :value="false">greedy_search</option></select></label>
      </div>
      <label class="hotword-toggle"><input v-model="enabled" type="checkbox" />启用“周望君”热词增强</label>
      <div class="conditions" aria-label="热词前提"><span>{{ transducer ? '模型条件满足' : '模型条件缺失' }}</span><span>{{ beam ? '解码条件满足' : '解码条件缺失' }}</span><span>权重始终不变</span></div>
      <div class="hotword-result" :class="{ available: supported && enabled }" aria-live="polite" aria-atomic="true"><strong>{{ status.title }}</strong><p>{{ status.detail }}</p></div>
      <p class="lab-note">这里只判断文档规定的配置前提，不模拟识别准确率，也不预测错误配置会被具体接口如何处理。实际还要核对词表、热词文件和加载结果。</p>
    </template>
  </section>
</template>

<style scoped>
.speech-runtime-lab { margin: 24px 0; padding: 20px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg-soft); font-size: 14px; letter-spacing: 0; }
.lab-heading { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
.lab-heading > span, .lab-note { color: var(--vp-c-text-2); font-size: 12px; }
.stages { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; padding: 0; margin: 20px 0; list-style: none; }
.stages li { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0; margin: 0; min-width: 0; text-align: center; font-size: 12px; border-bottom: 3px solid var(--vp-c-divider); }
.stage-number { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid var(--vp-c-divider); border-radius: 50%; }
.stages .current { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.current .stage-number { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); }
.stages .completed { border-color: var(--vp-c-brand-2); }
.stage-content { min-height: 284px; }
.speech-runtime-lab p { line-height: 1.8; }
.speech-runtime-lab .owner { margin: 16px 0; font-weight: 600; overflow-wrap: anywhere; }
.data-change { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
.data-change > div { padding-left: 12px; border-left: 3px solid var(--vp-c-divider); }
.data-change dt { color: var(--vp-c-text-2); font-size: 12px; }
.data-change dd { margin: 8px 0 0; line-height: 1.8; }
.stage-detail { margin: 16px 0; }
.playback-controls { display: flex; align-items: center; gap: 8px; }
.playback-controls button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 44px; height: 44px; border: 1px solid var(--vp-c-divider); border-radius: 4px; cursor: pointer; font: inherit; }
.playback-controls .advance { width: auto; min-width: 154px; margin-left: auto; padding: 0 12px; }
button:disabled { opacity: .45; cursor: default; }
button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.hotword-controls { display: grid; grid-template-columns: 1fr 1.5fr; gap: 16px; margin: 20px 0 12px; }
.hotword-controls label { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
select { width: 100%; min-height: 44px; padding: 8px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }
.hotword-toggle { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; }
input { width: 18px; height: 18px; accent-color: var(--vp-c-brand-1); }
.conditions { display: flex; flex-wrap: wrap; gap: 8px 16px; margin: 12px 0; color: var(--vp-c-text-2); font-size: 12px; }
.hotword-result { min-height: 156px; padding: 16px 0 0 12px; border-left: 3px solid var(--vp-c-text-3); }
.hotword-result.available { border-color: var(--vp-c-brand-1); }
.hotword-result p { margin: 8px 0; }
.lab-note { margin: 16px 0 0; }
@media (max-width: 600px) {
  .speech-runtime-lab { padding: 14px; }
  .stages { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .stages li { min-height: 76px; }
  .stage-content { min-height: 350px; }
  .data-change { gap: 12px; }
  .hotword-controls { grid-template-columns: 1fr; gap: 12px; }
  .hotword-result { min-height: 190px; }
}
@media (max-width: 360px) {
  .data-change { grid-template-columns: 1fr; }
  .stage-content { min-height: 440px; }
  .playback-controls .advance { min-width: 0; font-size: 12px; }
}
</style>
