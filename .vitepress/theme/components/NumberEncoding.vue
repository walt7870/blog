<script setup>
import { withBase } from 'vitepress'
</script>
<template>
  <picture class="number-encoding"><source media="(max-width: 600px)" :srcset="withBase('/ai/precision/number-encoding-mobile.svg')" width="360" height="480" /><img :src="withBase('/ai/precision/number-encoding.svg')" width="640" height="400" alt="1.25 化为二进制 1.01，FP16 保存符号 0、带偏移的指数 01111 和小数部分 0100000000" loading="lazy" decoding="async" /></picture>
</template>
<style scoped>.number-encoding { display: block; margin: 24px 0; }.number-encoding img { width: 100%; height: auto; display: block; }</style>
