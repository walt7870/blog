<script setup>
import { computed, ref } from 'vue'

const count = ref(0)
// FP16 has unit spacing throughout this experiment's [1024, 2048) interval.
const toHalf = value => {
  const lower = Math.floor(value)
  return value - lower === 0.5 ? lower + lower % 2 : Math.round(value)
}
const totals = computed(() => {
  let half = 1024
  let single = 1024
  for (let i = 0; i < count.value; i++) {
    half = toHalf(half + 0.25)
    single = Math.fround(single + 0.25)
  }
  return { half, single, finalHalf: toHalf(single) }
})
const position = value => 28 + (value - 1024) / 2 * 424
</script>

<template>
  <section class="accumulation-lab" aria-label="连续加法实验">
    <label class="addition-count">已加 {{ count }} 次，每次加 0.25<input v-model.number="count" type="range" min="0" max="8" step="1" aria-label="已经相加的次数" /></label>
    <svg viewBox="0 0 480 210" role="img" :aria-label="`从 1024 开始加 ${count} 次：每步存 FP16 得 ${totals.half}，FP32 累加得 ${totals.single}`">
      <text x="20" y="28">每步存 FP16</text><text x="460" y="28" text-anchor="end">{{ totals.half }}</text>
      <text x="20" y="112">FP32 累加</text><text x="460" y="112" text-anchor="end">{{ totals.single }}</text>
      <g stroke="var(--vp-c-divider)">
        <line x1="28" y1="55" x2="452" y2="55" /><line x1="28" y1="139" x2="452" y2="139" />
        <template v-for="i in 9" :key="i"><line :x1="28 + (i - 1) * 53" y1="49" :x2="28 + (i - 1) * 53" y2="61" /><line :x1="28 + (i - 1) * 53" y1="133" :x2="28 + (i - 1) * 53" y2="145" /></template>
      </g>
      <circle :cx="position(totals.half)" cy="55" r="7" fill="#be123c" />
      <circle :cx="position(totals.single)" cy="139" r="7" fill="#0f766e" />
      <text x="28" y="178">1024</text><text x="452" y="178" text-anchor="end">1026</text>
      <text x="240" y="205" text-anchor="middle" class="axis-label">横轴：计算结果的位置</text>
    </svg>
    <p aria-live="polite">{{ count === 0 ? '两边都从 1024 开始。' : `每步存 FP16：1024 + 0.25 → 1024，重复 ${count} 次仍为 1024。` }}{{ count === 8 ? ` FP32 的和最后转成 FP16，得到 ${totals.finalHalf}。` : '' }}</p>
  </section>
</template>

<style scoped>
.accumulation-lab { margin: 24px 0; padding: 16px 0; border-block: 1px solid var(--vp-c-divider); }
.addition-count { display: flex; flex-direction: column; font-size: 14px; }
input { width: 100%; min-height: 44px; accent-color: var(--vp-c-brand-1); }
svg { display: block; width: 100%; aspect-ratio: 480 / 210; }
text { font: 19px var(--vp-font-family-base); fill: var(--vp-c-text-1); }
.axis-label { font-size: 16px; fill: var(--vp-c-text-2); }
circle { transition: cx 180ms ease-out; }
p { min-height: 48px; font-size: 14px; line-height: 1.8; }
@media (prefers-reduced-motion: reduce) { circle { transition: none; } }
</style>
