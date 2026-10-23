<script setup>
import { computed, ref, watch } from 'vue'

const value = ref(0.3)
const outlier = ref(false)
const grouped = ref(false)
watch(outlier, enabled => { if (!enabled) grouped.value = false })
const limit = computed(() => outlier.value && !grouped.value ? 20 : 2)
const scale = computed(() => limit.value / 7)
const code = computed(() => {
  const scaled = value.value / scale.value
  const lower = Math.floor(scaled)
  return Math.max(-7, Math.min(7, scaled - lower === 0.5 ? lower + lower % 2 : Math.round(scaled)))
})
const restored = computed(() => code.value * scale.value)
const format = n => Number(n.toFixed(6))
const x = n => 240 + n / limit.value * 204
</script>

<template>
  <section class="quant-lab" aria-label="INT4 缩放实验">
    <div class="quant-input"><label for="quant-number">待保存的数 <output>{{ value }}</output></label><input id="quant-number" v-model.number="value" type="range" min="0" max="2" step="0.01" /></div>
    <div class="quant-options"><label><input v-model="outlier" type="checkbox" />同一组加入大值 20</label><label><input v-model="grouped" type="checkbox" :disabled="!outlier" />把大值分到另一组</label></div>
    <svg viewBox="0 0 480 180" role="img" aria-label="原始值与量化恢复值在整数刻度上的位置">
      <line x1="36" y1="92" x2="444" y2="92" stroke="currentColor" />
      <line v-for="i in 15" :key="i" :x1="36 + (i - 1) * 408 / 14" y1="86" :x2="36 + (i - 1) * 408 / 14" y2="98" stroke="currentColor" />
      <text x="36" y="122" text-anchor="middle">{{ -limit }}</text><text x="240" y="122" text-anchor="middle">0</text><text x="444" y="122" text-anchor="middle">{{ limit }}</text>
      <line :x1="x(value)" y1="40" :x2="x(value)" y2="84" stroke="var(--vp-c-text-1)" /><circle :cx="x(value)" cy="46" r="5" fill="var(--vp-c-text-1)" />
      <circle :cx="x(restored)" cy="92" r="7" fill="#c64d67" />
      <text x="24" y="164">上方：原始值</text><text x="250" y="164" fill="#c64d67">红点：恢复值</text>
    </svg>
    <dl aria-live="polite"><div><dt>刻度间距 scale</dt><dd>{{ format(scale) }}</dd></div><div><dt>保存的整数</dt><dd>{{ code }}</dd></div><div><dt>恢复的数</dt><dd>{{ format(restored) }}</dd></div></dl>
    <p>绝对误差 {{ format(Math.abs(value - restored)) }}。{{ outlier && grouped ? '从原始值重新量化；大值单独一组，小数这组覆盖 −2 到 2。' : `当前组覆盖 −${limit} 到 ${limit}，共用一个 scale。` }}</p>
  </section>
</template>

<style scoped>
.quant-lab { margin: 24px 0; padding: 16px 0; border-block: 1px solid var(--vp-c-divider); letter-spacing: 0; }
.quant-input label { display: flex; justify-content: space-between; font-size: 14px; }.quant-input input { width: 100%; height: 44px; accent-color: var(--vp-c-brand-1); }.quant-options { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 14px; }.quant-options label { display: flex; align-items: center; gap: 8px; min-height: 44px; }.quant-options input { width: 18px; height: 18px; accent-color: var(--vp-c-brand-1); }
svg { width: 100%; display: block; aspect-ratio: 480/180; color: var(--vp-c-text-2); }text { font: 16px var(--vp-font-family-base); fill: var(--vp-c-text-1); }dl { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }dt { font-size: 12px; color: var(--vp-c-text-2); }dd { margin: 4px 0 0; font-size: 18px; font-variant-numeric: tabular-nums; }p { font-size: 13px; line-height: 1.8; }
</style>
