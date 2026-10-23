<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { topicGroups } from '../../topics.ts'

const props = withDefaults(defineProps<{ place?: 'top' | 'bottom' }>(), { place: 'top' })
const { page, frontmatter } = useData()

// The longest matching topic link is the page's topic; group and topic form the breadcrumb.
const crumb = computed(() => {
  const route = '/' + page.value.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html')
  let best: { group: string; text: string; link: string; description: string } | undefined
  for (const group of topicGroups) for (const topic of group.topics) {
    if (route.startsWith(topic.link) && (!best || topic.link.length > best.link.length)) best = { group: group.title, text: topic.text, link: topic.link, description: topic.description }
  }
  if (!best && route.startsWith('/docs/reading/')) best = { group: '阅读', text: '阅读笔记', link: '/docs/reading/', description: '书籍与长文的结构化摘录' }
  return best && { ...best, isTopicHome: route === best.link }
})

const updated = computed(() => {
  const time = page.value.lastUpdated
  return time ? new Date(time + 8 * 3600 * 1000).toISOString().slice(0, 10) : ''
})
const minutes = computed(() => Number(frontmatter.value.readingMinutes) || 0)
const visible = computed(() => frontmatter.value.docHeader !== false && (crumb.value || updated.value || minutes.value))
</script>

<template>
  <template v-if="props.place === 'bottom'">
    <a v-if="visible && crumb && !crumb.isTopicHome" class="doc-topic-back" :href="withBase(crumb.link)">
      <span class="back-label">所属专题 · {{ crumb.group }}</span>
      <strong>{{ crumb.text }}</strong>
      <span class="back-desc">{{ crumb.description }}</span>
    </a>
  </template>
  <header v-else-if="visible" class="doc-header">
    <nav v-if="crumb" class="doc-crumb" aria-label="所在专题">
      <span>{{ crumb.group }}</span>
      <span class="sep" aria-hidden="true">/</span>
      <span v-if="crumb.isTopicHome" aria-current="page">{{ crumb.text }}</span>
      <a v-else :href="withBase(crumb.link)">{{ crumb.text }}</a>
    </nav>
    <p class="doc-meta">
      <time v-if="updated" :datetime="updated">更新于 {{ updated }}</time>
      <span v-if="minutes">约 {{ minutes }} 分钟阅读</span>
    </p>
  </header>
</template>

<style scoped>
.doc-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 20px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
.doc-crumb { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--vp-c-text-3); }
.doc-crumb a, .doc-crumb [aria-current] { color: var(--vp-c-brand-1); font-weight: 500; }
.doc-crumb a { text-decoration: none; }
.doc-crumb a:hover { text-decoration: underline; text-underline-offset: 3px; }
.doc-crumb .sep { color: var(--vp-c-divider); }
.doc-meta { display: flex; gap: 16px; margin: 0; color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; }
.doc-meta:empty { display: none; }
.doc-topic-back { display: grid; gap: 4px; margin: 48px 0 24px; padding: 16px 20px; border: 1px solid var(--vp-c-divider); border-left: 3px solid var(--vp-c-brand-1); border-radius: 6px; color: var(--vp-c-text-1); text-decoration: none; transition: border-color .16s ease, background-color .16s ease; }
.doc-topic-back:hover { background: var(--vp-c-bg-soft); border-color: var(--vp-c-brand-1); }
.doc-topic-back:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.back-label { color: var(--vp-c-text-3); font-size: 12px; }
.doc-topic-back strong { font-size: 15px; font-weight: 600; }
.back-desc { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { .doc-topic-back { transition: none; } }
</style>
