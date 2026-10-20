<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import { Eye, Layers3, Wrench, Network, ArrowRight } from '@lucide/vue'

const selected = ref(0)
const stages = [
  { name: '看见现象', range: '01—02', icon: Eye, question: '小林问“年假怎么申请”，屏幕上的回答怎样出现？', result: '先分清应用、引擎与模型，再观察读完输入和逐步生成。', links: [['01-landscape', '01. 谁在处理问题'], ['02-lifecycle', '02. 一次回答怎样生成']] },
  { name: '拆开资源', range: '03—05', icon: Layers3, question: '文档越来越长、同事越来越多，机器为什么装不下或排长队？', result: '把显存当工作台、KV 当计算便笺，再观察如何复用和安排多人。', links: [['03-memory', '03. 工作台装了什么'], ['04-cache-attention', '04. 哪些状态可以复用'], ['05-scheduling', '05. 多人怎样一起算']] },
  { name: '走进实现', range: '06—09', icon: Wrench, question: '同一套服务，怎样少搬、少算、少等？这些机制放在哪个框架里？', result: '量化与编译降低单步成本，推测减少串行轮次，再进入 vLLM 和 SGLang。', links: [['06-quantization', '06. 降低一次计算的成本'], ['07-speculative', '07. 先写草稿再校对'], ['08-vllm', '08. vLLM 怎样组织执行'], ['09-sglang', '09. SGLang 怎样组织前缀']] },
  { name: '回到工程', range: '10—13', icon: Network, question: '一台机器不够，或想直接语音提问，应该怎样扩展与验证？', result: '先理解多卡与语音链路，再选择候选框架，用相同负载验证收益。', links: [['10-distributed', '10. 扩展到多卡与多机'], ['11-speech', '11. 从文字走向语音'], ['12-selection-versions', '12. 比较方案与版本'], ['13-practice', '13. 用实验检验理解']] },
]
</script>

<template>
  <nav class="journey" aria-label="从浅到深的学习路线">
    <div class="journey-stages" role="group" aria-label="选择学习阶段"><button v-for="(stage, i) in stages" :key="stage.name" type="button" :aria-pressed="selected === i" @click="selected = i"><component :is="stage.icon" :size="24" aria-hidden="true" /><span>{{ i + 1 }}. {{ stage.name }}</span><small>{{ stage.range }} 章</small></button></div>
    <div class="journey-explanation" aria-live="polite"><p class="journey-question">{{ stages[selected].question }}</p><p>{{ stages[selected].result }}</p><ol><li v-for="[path, title] in stages[selected].links" :key="path"><a :href="withBase(`/docs/ai/inference-series/${path}.html`)">{{ title }}<ArrowRight :size="16" aria-hidden="true" /></a></li></ol></div>
  </nav>
</template>

<style scoped>
.journey { margin: 28px 0; letter-spacing: 0; }
.journey-stages { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.journey-stages button { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 16px 10px; min-height: 132px; font: inherit; cursor: pointer; border-bottom: 3px solid var(--vp-c-divider); text-align: left; }
.journey-stages button[aria-pressed="true"] { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.journey-stages small { font-size: 12px; color: var(--vp-c-text-2); }
.journey-stages button:focus-visible, .journey a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.journey-explanation { margin-top: 18px; min-height: 310px; }
.journey-explanation p { margin: 8px 0; font-size: 14px; line-height: 1.9; }
.journey-explanation .journey-question { font-size: 17px; font-weight: 600; }
.journey-explanation ol { list-style: none; margin: 12px 0; padding: 0; }
.journey-explanation li { margin: 0; }
.journey-explanation a { display: inline-flex; gap: 10px; align-items: center; min-height: 44px; font-size: 14px; }
@media (max-width: 560px) { .journey-stages { grid-template-columns: repeat(2, minmax(0, 1fr)); } .journey-stages button { min-height: 124px; font-size: 14px; } .journey-explanation { min-height: 370px; } }
</style>
