<script setup lang="ts">
import { withBase } from 'vitepress'
defineProps<{ name: string; alt: string }>()
</script>

<template>
  <picture class="inference-figure">
    <source media="(max-width: 600px)" :srcset="withBase(`/ai/inference-series/${name}-mobile.svg`)" />
    <img :src="withBase(`/ai/inference-series/${name}.svg`)" :alt="alt" />
  </picture>
</template>

<style scoped>
.inference-figure { display: block; margin: 24px 0; }
.inference-figure img { display: block; width: 100%; height: auto; }
</style>
