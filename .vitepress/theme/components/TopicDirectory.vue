<script setup lang="ts">
import { withBase } from 'vitepress'
import { ArrowUpRight, BookOpen, Boxes, BrainCircuit, Code2, Database, Gauge, GitBranch, Layers3, Network, Search, ShieldCheck, Terminal, Workflow } from '@lucide/vue'

type Topic = { title: string; href: string; description: string; icon?: string }
withDefaults(defineProps<{ items: Topic[]; label?: string }>(), { label: '专题目录' })
const icons: Record<string, typeof BookOpen> = { book: BookOpen, boxes: Boxes, brain: BrainCircuit, code: Code2, database: Database, gauge: Gauge, branch: GitBranch, layers: Layers3, network: Network, search: Search, shield: ShieldCheck, terminal: Terminal, workflow: Workflow }
</script>

<template>
  <nav class="doc-topic-directory" :aria-label="label">
    <ul>
      <li v-for="item in items" :key="item.href">
        <a :href="withBase(item.href)">
          <component :is="icons[item.icon || 'book'] || BookOpen" class="topic-icon" :size="21" aria-hidden="true" />
          <span class="topic-copy"><strong>{{ item.title }}</strong><span>{{ item.description }}</span></span>
          <ArrowUpRight class="topic-arrow" :size="17" aria-hidden="true" />
        </a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.doc-topic-directory { margin: 24px 0 32px; }
.doc-topic-directory ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; padding: 0; margin: 0; list-style: none; }
.doc-topic-directory li { min-width: 0; margin: 0; border-bottom: 1px solid var(--vp-c-divider); }
.doc-topic-directory a { display: flex; gap: 13px; align-items: flex-start; height: 100%; min-height: 112px; padding: 20px 6px; color: var(--vp-c-text-1); text-decoration: none; transition: background-color .16s ease; }
.doc-topic-directory a:hover { background: var(--vp-c-bg-soft); }
.doc-topic-directory a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.topic-icon { flex: none; margin-top: 3px; color: var(--vp-c-brand-1); }
.doc-topic-directory li:nth-child(3n + 2) .topic-icon { color: #3d719d; }
.dark .doc-topic-directory li:nth-child(3n + 2) .topic-icon { color: #91badb; }
.doc-topic-directory li:nth-child(3n) .topic-icon { color: #bb624b; }
.dark .doc-topic-directory li:nth-child(3n) .topic-icon { color: #e5a18a; }
.topic-copy { display: grid; gap: 7px; flex: 1; min-width: 0; }
.topic-copy strong { font-size: 15px; line-height: 1.6; font-weight: 600; color: var(--vp-c-text-1); }
.topic-copy > span { font-size: 13px; line-height: 1.75; font-weight: 400; color: var(--vp-c-text-2); overflow-wrap: anywhere; }
.topic-arrow { flex: none; margin-top: 4px; color: var(--vp-c-text-3); }
@media (max-width: 600px) {
  .doc-topic-directory ul { grid-template-columns: minmax(0, 1fr); }
  .doc-topic-directory a { min-height: 96px; padding: 18px 4px; }
}
@media (prefers-reduced-motion: reduce) { .doc-topic-directory a { transition: none; } }
</style>
