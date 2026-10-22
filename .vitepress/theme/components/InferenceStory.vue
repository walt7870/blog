<script setup lang="ts">
import { ref } from 'vue'
import { MessageSquare, Files, Copy, Users, Cpu, AudioLines, ArrowRight } from '@lucide/vue'
import { withBase } from 'vitepress'

const active = ref(0)
const scenes = [
  { icon: MessageSquare, title: '先问一个问题', quote: '“年假怎么申请？”', text: '问题发出去以后，助手先处理输入，再接出一段段回答。我们从这一次等待开始，看答案怎样产生。', topic: '答案怎样生成', path: '02-lifecycle', parts: ['读问题', '生成', '生成', '生成'] },
  { icon: Files, title: '再放进整本手册', quote: '“顺便帮我读完这份附件。”', text: '读得越多，计算时要保存的信息也越多。机器既要放下模型，又要为这次对话腾出空间。', topic: '显存怎样分配', path: '03-memory', parts: ['模型', '对话', '对话', '工作区'] },
  { icon: Copy, title: '同一份资料，反复提问', quote: '“报销呢？调休呢？”', text: '每次从头处理同一本手册，难免重复劳动。把已算过的部分保留下来，后续问题就有机会接着用。', topic: '怎样减少重复计算', path: '04-cache-attention', parts: ['已算过', '已算过', '已算过', '新问题'] },
  { icon: Users, title: '同事们也来了', quote: '“我的问题能先答吗？”', text: '长问题和短问题一起到达，调度器要安排谁先算、谁一起算。批处理和分块让设备忙得更有条理。', topic: '并发怎样调度', path: '05-scheduling', parts: ['请求 A', '请求 B', '请求 A', '请求 C'] },
  { icon: Cpu, title: '让每一步更省力', quote: '“这台机器还能再快些吗？”', text: '可以让模型中的数字少占一些空间，也可以重新安排计算步骤。省了多少、回答有没有变差，需要一起比较。', topic: '怎样降低计算成本', path: '06-quantization', parts: ['少存', '少搬', '少等', '比较'] },
  { icon: AudioLines, title: '从聊天窗口走向服务', quote: '“能直接说话，再多接些用户吗？”', text: '开口提问后，还要把声音转成文字，再把回答读出来。每一段都有等待，最后听起来流不流畅，要沿整条过程观察。', topic: '语音怎样接入', path: '11-speech', parts: ['听清', '回答', '朗读', '播放'] },
]
</script>

<template>
  <section class="story" aria-label="资料助手的六个使用场景">
    <div class="story-track" role="group" aria-label="选择场景">
      <button v-for="(scene, i) in scenes" :key="scene.title" type="button" :aria-pressed="active === i" @click="active = i">
        <component :is="scene.icon" :size="23" aria-hidden="true" />
        <span>{{ scene.title }}</span>
      </button>
    </div>
    <div class="story-scene" aria-live="polite">
      <p class="story-quote">{{ scenes[active].quote }}</p>
      <div class="story-strip" aria-hidden="true"><span v-for="(part, i) in scenes[active].parts" :key="i" :class="{ fresh: i === 3 }">{{ part }}</span></div>
      <p>{{ scenes[active].text }}</p>
      <a :href="withBase(`/docs/ai/inference-series/${scenes[active].path}.html`)">{{ scenes[active].topic }}<ArrowRight :size="16" aria-hidden="true" /></a>
    </div>
  </section>
</template>

<style scoped>
.story { margin: 24px 0; }
.story-track { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 16px; }
.story-track button { display: flex; gap: 8px; align-items: center; min-height: 76px; padding: 12px 0; border-bottom: 2px solid var(--vp-c-divider); text-align: left; font: inherit; font-size: 14px; cursor: pointer; }
.story-track svg { flex: none; }
.story-track button[aria-pressed=true] { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.story-scene { margin-top: 24px; min-height: 252px; }
.story-scene .story-quote { font-size: 21px; font-weight: 600; margin-bottom: 20px; }
.story-strip { display: flex; gap: 6px; height: 44px; }
.story-strip span { display: grid; place-items: center; flex: 1; background: var(--vp-c-brand-soft); color: var(--vp-c-text-1); font-size: 13px; }
.story-strip .fresh { background: var(--vp-c-bg-alt); border: 1px dashed var(--vp-c-brand-1); }
.story-scene a { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; }
.story button:focus-visible, .story a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 4px; }
@media(max-width:560px) { .story-track { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0 12px; } .story-track button { font-size: 13px; } .story-scene { min-height: 310px; } .story-scene .story-quote { font-size: 18px; } }
</style>
