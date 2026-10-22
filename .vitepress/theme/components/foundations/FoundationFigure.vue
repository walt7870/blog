<script setup>
import { withBase } from 'vitepress'
import { computed } from 'vue'
const props = defineProps({ name: String, alt: String })
const sizes = {
  'prediction-residuals': [420, 360], 'data-split': [420, 620], 'tensor-layout': [330, 520],
  'single-update': [420, 490], 'loss-contours': [480, 410], 'training-cycle': [430, 620],
}
const heights = computed(() => sizes[props.name] || [480, 480])
</script>
<template><picture class="foundation-figure"><source media="(max-width: 600px)" :srcset="withBase(`/ai/foundations/${name}-mobile.svg`)" width="480" :height="heights[1]" /><img :src="withBase(`/ai/foundations/${name}.svg`)" :alt="alt" width="800" :height="heights[0]" loading="lazy" decoding="async" /></picture></template>
<style scoped>.foundation-figure { display: block; margin: 24px 0; }.foundation-figure img { display: block; width: 100%; height: auto; }</style>
