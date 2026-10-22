<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import { Eye, Layers3, Wrench, Network, ArrowRight } from '@lucide/vue'

const selected = ref(0)
const stages = [
  { name: '基础概念', range: '01—02', icon: Eye, question: '输入一句话，机器怎样接出回答？', result: '从模型中的数字开始，跟着一个问题看答案逐步出现。', links: [['01-landscape', '01. 推理系统的分工'], ['02-lifecycle', '02. 从输入到逐步生成']] },
  { name: '资源与状态', range: '03—05', icon: Layers3, question: '文档更长、用的人更多，机器为什么吃不消？', result: '先看空间花在哪里，再看怎样省掉重复计算、安排多人一起使用。', links: [['03-memory', '03. GPU 与显存预算'], ['04-cache-attention', '04. 注意力与 KV 缓存'], ['05-scheduling', '05. 批处理与调度']] },
  { name: '优化机制', range: '06—09', icon: Wrench, question: '相同的模型计算，如何减少存储、搬运和串行等待？', result: '从量化、编译和推测解码进入 vLLM、SGLang 的执行组织。', links: [['06-quantization', '06. 量化、算子与编译'], ['07-speculative', '07. 推测解码'], ['08-vllm', '08. vLLM 的执行机制'], ['09-sglang', '09. SGLang 的执行机制']] },
  { name: '工程实践', range: '10—13', icon: Network, question: '多卡、语音和真实流量场景，怎样做出可验证的部署判断？', result: '最后连接分布式执行、语音链路、框架选型和压测排错。', links: [['10-distributed', '10. 多卡、MoE 与分离部署'], ['11-speech', '11. 语音与多模态推理'], ['12-selection-versions', '12. 框架对比与版本'], ['13-practice', '13. 部署、压测与排错']] },
]
</script>

<template>
  <nav class="journey" aria-label="模型推理学习路线">
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
