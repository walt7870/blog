<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ mode: 'format' | 'pipeline' }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const selected = ref(props.mode === 'format' ? 'BF16' : 'BF16 基线')
const input = ref(1.0351)
const magnitude = ref(1)
const formats = {
  FP32: { bits: 23, color: '#2563eb' },
  FP16: { bits: 10, color: '#0f766e' },
  BF16: { bits: 7, color: '#be123c' },
  'FP8 E4M3': { bits: 3, color: '#b45309' },
}
const configurations = {
  'BF16 基线': ['BF16', 'BF16', 'BF16'],
  'FP8 权重与激活': ['FP8 + scale', 'FP8 + scale', 'BF16'],
  W4A16: ['INT4 + scale', 'BF16', 'BF16'],
}
const cacheFP8 = ref(false)
const current = computed(() => formats[selected.value as keyof typeof formats] || formats.BF16)
// Both selectable magnitudes are powers of two, so the interval has one exponent.
const spacing = computed(() => magnitude.value * 2 ** -current.value.bits)
const rounded = computed(() => {
  const scaled = input.value / spacing.value
  const lower = Math.floor(scaled)
  const fraction = scaled - lower
  const nearest = fraction === 0.5 ? lower + lower % 2 : Math.round(scaled)
  return nearest * spacing.value
})
const description = computed(() => props.mode === 'format'
  ? `${selected.value}：${input.value} → ${rounded.value}；绝对误差 ${Number(Math.abs(rounded.value - input.value).toPrecision(5))}；[${magnitude.value}, ${magnitude.value * 2}) 内间距 ${spacing.value}`
  : `${selected.value}；KV ${cacheFP8.value ? 'FP8 + scale' : 'BF16'}。归一化与累加示例均保留 FP32。`)
let resizeObserver: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined
let frame = 0
let startedAt = 0
let reducedMotion: MediaQueryList | undefined

function fitCanvas() {
  const element = canvas.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  element.width = Math.max(1, Math.round(rect.width * dpr))
  element.height = Math.max(1, Math.round(rect.height * dpr))
  element.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
  render()
}

function render() {
  cancelAnimationFrame(frame)
  const element = canvas.value
  const ctx = element?.getContext('2d')
  if (!element || !ctx) return
  const width = element.clientWidth
  const height = element.clientHeight
  const styles = getComputedStyle(element)
  const ink = styles.getPropertyValue('--vp-c-text-1').trim()
  const muted = styles.getPropertyValue('--vp-c-text-2').trim()
  const divider = styles.getPropertyValue('--vp-c-divider').trim()
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = styles.getPropertyValue('--vp-c-bg').trim()
  ctx.fillRect(0, 0, width, height)
  ctx.font = '13px Arial, PingFang SC, Microsoft YaHei, sans-serif'
  if (props.mode === 'format') {
    const left = 24
    const right = width - 24
    const span = magnitude.value * 0.125
    const x = (value: number) => left + (value - magnitude.value) / span * (right - left)
    ctx.fillStyle = ink; ctx.fillText(`放大观察：${magnitude.value} 到 ${magnitude.value + span}`, left, 28)
    const spacingLabel = spacing.value < 0.0001 ? spacing.value.toExponential(3) : spacing.value
    ctx.fillStyle = muted; ctx.fillText(`刻度间距：${spacingLabel}`, left, 51)
    ctx.strokeStyle = divider
    ctx.beginPath(); ctx.moveTo(left, 122); ctx.lineTo(right, 122); ctx.stroke()
    // Thin dense ticks for display; rounding still uses the exact spacing.
    const stride = Math.max(1, Math.ceil(5 / ((right - left) * spacing.value / span)))
    const count = Math.floor(span / spacing.value)
    for (let i = 0; i <= count; i += stride) {
      const tick = x(magnitude.value + i * spacing.value)
      ctx.beginPath(); ctx.moveTo(tick, 114); ctx.lineTo(tick, 130); ctx.stroke()
    }
    ctx.fillStyle = muted; ctx.fillText(String(magnitude.value), left, 151)
    ctx.textAlign = 'right'; ctx.fillText(String(magnitude.value + span), right, 151); ctx.textAlign = 'left'
    const progress = reducedMotion?.matches ? 1 : Math.min(1, (performance.now() - startedAt) / 450)
    const animated = input.value + (rounded.value - input.value) * (1 - (1 - progress) ** 3)
    ctx.strokeStyle = ink
    ctx.beginPath(); ctx.moveTo(x(input.value), 76); ctx.lineTo(x(input.value), 111); ctx.stroke()
    ctx.fillStyle = ink
    ctx.beginPath(); ctx.arc(x(input.value), 82, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = current.value.color
    ctx.beginPath(); ctx.arc(x(animated), 122, 7, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = ink; ctx.fillText('● 输入值', left, 185)
    ctx.fillStyle = current.value.color; ctx.fillText('● 舍入结果', left + 95, 185)
    if (progress < 1) frame = requestAnimationFrame(render)
  } else {
    const values = configurations[selected.value as keyof typeof configurations]
    const labels = ['权重', '矩阵乘法激活', 'KV 缓存', '归一化 / 累加']
    const entries = [values[0], values[1], cacheFP8.value ? 'FP8 + scale' : values[2], 'FP32 / FP32']
    ctx.fillStyle = ink; ctx.fillText('同一模型中的精度分配示例', 18, 28)
    labels.forEach((label, i) => {
      const y = 59 + i * 37
      ctx.strokeStyle = divider
      ctx.beginPath(); ctx.moveTo(18, y + 13); ctx.lineTo(width - 18, y + 13); ctx.stroke()
      ctx.fillStyle = muted; ctx.fillText(label, 18, y)
      ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.fillText(entries[i], width - 18, y)
      ctx.textAlign = 'left'
    })
  }
}

watch([selected, input, cacheFP8], () => { startedAt = performance.now(); render() })
watch(magnitude, value => { input.value = value === 1 ? 1.0351 : 1024.25 })
watch(() => props.mode, mode => { selected.value = mode === 'format' ? 'BF16' : 'BF16 基线' })
onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.addEventListener('change', render)
  resizeObserver = new ResizeObserver(fitCanvas)
  if (canvas.value) resizeObserver.observe(canvas.value)
  themeObserver = new MutationObserver(render)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  startedAt = performance.now()
  fitCanvas()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  reducedMotion?.removeEventListener('change', render)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <section class="precision-canvas" :data-mode="mode" :aria-label="mode === 'format' ? '浮点舍入实验' : '混合精度配置实验'">
    <div class="precision-controls" role="group" :aria-label="mode === 'format' ? '选择浮点格式' : '选择混合精度方案'">
      <button v-for="value in (mode === 'format' ? Object.keys(formats) : Object.keys(configurations))" :key="value" type="button" :aria-pressed="selected === value" @click="selected = value">{{ value }}</button>
    </div>
    <template v-if="mode === 'format'">
      <label class="precision-input">观察范围 <select v-model.number="magnitude" aria-label="观察范围"><option :value="1">1 附近</option><option :value="1024">1024 附近</option></select></label>
      <label class="precision-input">输入值 {{ input }}<input v-model.number="input" type="range" :min="magnitude" :max="magnitude * 1.1" :step="magnitude === 1 ? 0.0001 : 0.05" aria-label="输入数值"></label>
    </template>
    <label v-else class="precision-input"><input v-model="cacheFP8" type="checkbox">KV 使用 FP8</label>
    <canvas ref="canvas" width="960" height="210" role="img" :aria-label="description"></canvas>
    <p class="precision-caption" aria-live="polite">{{ description }}</p>
  </section>
</template>

<style scoped>
.precision-canvas { margin: 24px 0; padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 6px; }
.precision-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.precision-controls button { min-height: 44px; padding: 7px 10px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); cursor: pointer; font: inherit; }
.precision-controls button[aria-pressed="true"] { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }
.precision-controls button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.precision-input { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; font-size: 14px; }
.precision-input input[type="range"] { flex: 1 1 130px; min-width: 0; min-height: 44px; accent-color: var(--vp-c-brand-1); }
.precision-input select { min-height: 44px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-1); padding: 6px 10px; font: inherit; }
canvas { display: block; width: 100%; height: 210px; }
.precision-caption { min-height: 48px; margin: 10px 0 0; color: var(--vp-c-text-2); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
@media (max-width: 560px) { .precision-canvas { padding: 12px; } }
</style>
