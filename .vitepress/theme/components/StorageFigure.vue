<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import figures from './precision/storage-figures.json'

const props = defineProps({ kind: { type: String, required: true } })
const figure = computed(() => {
  const value = figures[props.kind]
  if (!value) throw new Error(`Unknown storage figure: ${props.kind}`)
  return value
})
</script>

<template>
  <picture class="storage-figure" :data-format="kind">
    <source media="(max-width: 600px)" :srcset="withBase(`/ai/precision/storage/${kind}-mobile.svg`)" :width="figure.mobile.width" :height="figure.mobile.height" />
    <img :src="withBase(`/ai/precision/storage/${kind}.svg`)" :width="figure.desktop.width" :height="figure.desktop.height" :alt="`${figure.title}：逐段标出存储位数、示例编码和读回过程`" loading="lazy" decoding="async" />
  </picture>
</template>

<style scoped>
.storage-figure { display: block; margin: 24px 0; }
img { display: block; width: 100%; height: auto; }
</style>
