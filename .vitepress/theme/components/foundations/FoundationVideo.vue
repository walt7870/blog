<script setup>
import { withBase } from 'vitepress'
import { ExternalLink } from '@lucide/vue'
defineProps({ video: { type: Object, required: true } })
</script>

<template>
  <figure class="foundation-video">
    <a v-if="video.bilibili" :href="video.bilibili" target="_blank" rel="noopener noreferrer" :aria-label="`在B站观看：${video.title}`"><img :src="withBase(video.poster)" :alt="video.title" width="1280" height="720" loading="lazy" /><span><ExternalLink :size="18" /> 在 B 站观看</span></a>
    <video v-else controls playsinline preload="none" width="1280" height="720" :poster="withBase(video.poster)" :aria-label="video.title">
      <source :src="withBase(video.preview)" type="video/mp4" />
      <track kind="captions" :src="withBase(video.captions)" srclang="zh" label="中文" default />
      当前浏览器无法播放此视频，可继续阅读正文与逐字稿。
    </video>
  </figure>
</template>

<style scoped>
.foundation-video { margin: 24px 0; }.foundation-video video, .foundation-video img { display: block; width: 100%; height: auto; aspect-ratio: 16/9; background: #f3f8f8; }.foundation-video>a { display: block; }.foundation-video span { display: flex; gap: 8px; align-items: center; padding-top: 10px; font-size: 14px; }
</style>
