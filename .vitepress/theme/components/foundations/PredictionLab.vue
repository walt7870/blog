<script setup>
import { computed, ref } from 'vue'
import { RotateCcw } from '@lucide/vue'
import { samples, evaluate, format } from './math.mjs'
const w = ref(0), b = ref(0)
const result = computed(() => evaluate(w.value, b.value))
const px = x => 48 + x / 4 * 464
const py = y => 264 - y / 14 * 224
</script>

<template>
  <section class="prediction-lab" aria-label="运费预测实验">
    <svg viewBox="0 0 560 304" role="img" aria-label="三条教学样本、当前预测线与残差">
      <path d="M48 24V264H528" fill="none" stroke="var(--vp-c-text-3)" />
      <g v-for="v in [0, 4, 8, 12]" :key="v"><line x1="48" x2="520" :y1="py(v)" :y2="py(v)" stroke="var(--vp-c-divider)" /><text x="38" :y="py(v) + 5" text-anchor="end">{{ v }}</text></g>
      <text x="50" y="18">运费 / 元</text><text x="516" y="295" text-anchor="end">重量 / 千克</text>
      <line :x1="px(0)" :y1="py(b)" :x2="px(3.5)" :y2="py(w * 3.5 + b)" stroke="#2b78aa" stroke-width="3" />
      <g v-for="p in samples" :key="p.x"><line :x1="px(p.x)" :x2="px(p.x)" :y1="py(p.y)" :y2="py(w * p.x + b)" stroke="#bd4d55" stroke-width="2" stroke-dasharray="4 4" /><circle :cx="px(p.x)" :cy="py(p.y)" r="6" fill="#c48118" /><circle :cx="px(p.x)" :cy="py(w*p.x+b)" r="4" fill="#2b78aa" /><text :x="px(p.x)" y="283" text-anchor="middle">{{ p.x }}</text></g>
    </svg>
    <div class="knobs"><label>重量系数 w <input v-model.number="w" type="range" min="0" max="3" step="0.1" /><output>{{ format(w) }}</output></label><label>固定费用 b <input v-model.number="b" type="range" min="0" max="3" step="0.1" /><output>{{ format(b) }}</output></label></div>
    <div class="readout" aria-live="polite"><strong>预测 = {{ format(w) }} × 重量 + {{ format(b) }}</strong><span>损失 L {{ format(result.loss) }}</span><button type="button" aria-label="复位预测参数" title="复位预测参数" @click="w = 0; b = 0"><RotateCcw :size="18" /></button></div>
    <p class="legend">琥珀点：教学目标；蓝线和蓝点：当前预测；红色虚线：预测减目标的差。</p>
  </section>
</template>

<style scoped>
.prediction-lab { margin: 24px 0; padding: 16px 0; border-block: 1px solid var(--vp-c-divider); }
svg { display: block; width: 100%; overflow: visible; font: 14px var(--vp-font-family-base); fill: var(--vp-c-text-2); }
.knobs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 18px 0; }
label { display: grid; grid-template-columns: 1fr 40px; gap: 8px; font-size: 14px; } input { grid-column: 1; width: 100%; accent-color: var(--vp-c-brand-1); min-height: 36px; } output { grid-column: 2; grid-row: 2; align-self: center; text-align: right; font-variant-numeric: tabular-nums; }
.readout { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 20px; min-height: 88px; font-size: 14px; }.readout span { color: var(--vp-c-text-2); }button { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--vp-c-divider); border-radius: 4px; cursor: pointer; }button:focus-visible, input:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }.legend { font-size: 13px; color: var(--vp-c-text-2); }
@media(max-width:480px) { .knobs { grid-template-columns: 1fr; gap: 12px; } }
</style>
