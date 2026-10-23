<script setup>
import { computed, ref } from 'vue'

const value = ref(5)
const bits = [7, 6, 5, 4, 3, 2, 1, 0]
const bit = position => (value.value >> position) & 1
const code = computed(() => value.value.toString(2).padStart(8, '0'))
const sum = computed(() => bits.filter(position => bit(position)).map(position => 2 ** position).join(' + ') || '0')
</script>

<template>
  <section class="bit-byte-lab" aria-label="一个字节的位权实验">
    <div class="bit-cells">
      <div v-for="position in bits" :key="position" class="bit-cell">
        <span>位 {{ position }}</span>
        <button type="button" :aria-pressed="Boolean(bit(position))" :aria-label="`第 ${position} 位，位权 ${2 ** position}，当前 ${bit(position)}`" @click="value ^= 1 << position">{{ bit(position) }}</button>
        <span>位权 {{ 2 ** position }}</span>
      </div>
    </div>
    <p aria-live="polite"><code>{{ code }}₂</code> = {{ sum }} = <strong>{{ value }}</strong></p>
    <p class="byte-caption">8 位组成 1 字节，当前按无符号整数读取。</p>
  </section>
</template>

<style scoped>
.bit-byte-lab { margin: 24px 0; padding-block: 18px; border-block: 1px solid var(--vp-c-divider); }
.bit-cells { display: grid; grid-template-columns: repeat(8,minmax(0,1fr)); gap: 8px; }
.bit-cell { display: grid; gap: 6px; text-align: center; font-size: 13px; font-variant-numeric: tabular-nums; }
button { height: 48px; width: 100%; border: 1px solid var(--vp-c-divider); border-radius: 4px; color: var(--vp-c-text-1); background: var(--vp-c-bg); font: inherit; font-size: 20px; cursor: pointer; }
button[aria-pressed="true"] { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
p { margin-bottom: 0; overflow-wrap: anywhere; }.byte-caption { color: var(--vp-c-text-2); font-size: 13px; }
@media (max-width: 480px) { .bit-cells { grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px 12px; } }
</style>
