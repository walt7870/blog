<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { ArrowRight, ArrowUpRight, AudioLines, Code2, Database, Search, Wrench } from '@lucide/vue'
import { data } from './home.data.ts'

const groupIcons: Record<string, typeof Code2> = { development: Code2, 'ai-audio': AudioLines, 'systems-data': Database, tools: Wrench }

const routes = [
  { title: '理解后端运行时', path: 'JVM、GC、Spring、MySQL、Redis', link: '/docs/devlanguage/java/jvm/' },
  { title: '理解部署链路', path: '容器基础、Docker、运行时、Kubernetes', link: '/docs/container/basic/' },
  { title: '搭建 AI 应用', path: '大模型、RAG、Agent、推理与语音', link: '/docs/ai/' },
  { title: '梳理设计能力', path: '设计原则、设计模式、架构风格', link: '/docs/design/design-pattern/' },
]

const more = [
  { text: '阅读笔记', note: '书籍与长文的结构化摘录', link: withBase('/docs/reading/') },
  { text: '每日资讯', note: '技术与产业动态，独立站点', link: 'https://niuwancheng.cn/knology-news/', external: true },
  { text: '个人概览', note: '研发经历与技术方向', link: withBase('/profile/') },
  { text: '项目实践', note: '真实项目的架构与交付', link: withBase('/projects/') },
]

const searchKey = ref('Ctrl K')
onMounted(() => { if (/Mac|iPhone|iPad/.test(navigator.platform)) searchKey.value = '⌘ K' })

// Reuses the navbar search so the home page and every other page share one search entry.
function openSearch() {
  const button = document.querySelector<HTMLButtonElement>('.VPNavBarSearchButton')
  if (button) return button.click()
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))
}
</script>

<template>
  <div class="home">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="home-eyebrow">工程实践知识库</p>
        <h1 id="home-title">稻草小站</h1>
        <p class="hero-lead">
          从协议、Linux、容器和数据库，到 Java、架构设计、AI 与语音工程。每个专题先讲清概念边界，再给出配置入口、典型场景和排查路径。
        </p>
        <button type="button" class="hero-search" @click="openSearch">
          <Search :size="18" aria-hidden="true" />
          <span>搜索文章、命令或概念</span>
          <kbd>{{ searchKey }}</kbd>
        </button>
        <dl class="hero-stats">
          <div><dt>文章</dt><dd>{{ data.total }}</dd></div>
          <div><dt>专题</dt><dd>{{ data.topicCount }}</dd></div>
          <div v-if="data.latest"><dt>最近更新</dt><dd>{{ data.latest }}</dd></div>
        </dl>
      </div>

      <aside class="hero-updates" aria-labelledby="updates-title">
        <h2 id="updates-title">最近更新</h2>
        <ol v-if="data.updates.length">
          <li v-for="item in data.updates" :key="item.url">
            <a :href="withBase(item.url)">
              <span class="update-title">{{ item.title }}</span>
              <span class="update-meta">{{ item.topic }} · <time :datetime="item.date">{{ item.date }}</time></span>
            </a>
          </li>
        </ol>
        <p v-else class="updates-empty">更新记录暂不可用，可从下方专题目录进入。</p>
      </aside>
    </section>

    <section class="home-section" aria-labelledby="catalog-title">
      <header class="section-head">
        <h2 id="catalog-title">专题目录</h2>
        <p>入口页负责总览和阅读路径，细节页拆解机制、配置与排错。</p>
      </header>
      <div class="catalog">
        <section v-for="group in data.groups" :key="group.id" class="catalog-group" :class="`group-${group.id}`" :aria-labelledby="`group-${group.id}`">
          <h3 :id="`group-${group.id}`">
            <component :is="groupIcons[group.id] || Code2" :size="18" aria-hidden="true" />
            <span>{{ group.title }}</span>
            <small>{{ group.count }} 篇</small>
          </h3>
          <ul>
            <li v-for="topic in group.topics" :key="topic.link">
              <a :href="withBase(topic.link)">
                <span class="topic-text">
                  <strong>{{ topic.text }}</strong>
                  <span>{{ topic.description }}</span>
                </span>
                <span class="topic-count">{{ topic.count }}</span>
                <ArrowRight class="topic-arrow" :size="16" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <section class="home-section" aria-labelledby="routes-title">
      <header class="section-head">
        <h2 id="routes-title">按问题进入</h2>
        <p>不是线性教程。从当前要解决的问题进入，再沿专题页的导读继续深入。</p>
      </header>
      <ol class="routes">
        <li v-for="(route, index) in routes" :key="route.link">
          <a :href="withBase(route.link)">
            <span class="route-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ route.title }}</strong>
            <span>{{ route.path }}</span>
          </a>
        </li>
      </ol>
    </section>

    <nav class="home-more" aria-label="更多内容">
      <a v-for="item in more" :key="item.text" :href="item.link" :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noreferrer' : undefined">
        <strong>{{ item.text }}<ArrowUpRight v-if="item.external" :size="14" aria-label="在新窗口打开" /></strong>
        <span>{{ item.note }}</span>
      </a>
    </nav>
  </div>
</template>

<style scoped>
.home {
  --home-accent-development: #3d719d;
  --home-accent-ai-audio: var(--vp-c-brand-1);
  --home-accent-systems-data: #bb624b;
  --home-accent-tools: #6b6f86;
  width: min(1200px, 100% - 48px);
  margin: 0 auto;
  padding: 56px 0 88px;
  color: var(--vp-c-text-1);
}
.dark .home {
  --home-accent-development: #91badb;
  --home-accent-systems-data: #e5a18a;
  --home-accent-tools: #b4b7cc;
}

.home a { color: inherit; text-decoration: none; }
.home a:focus-visible, .hero-search:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; border-radius: 6px; }

/* Hero: identity and search on the left, real recent updates on the right. */
.home-hero {
  display: grid;
  align-items: center;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 1fr);
  gap: 64px;
  padding-bottom: 56px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.home-eyebrow { margin: 0 0 14px; color: var(--vp-c-brand-1); font-size: 14px; font-weight: 600; letter-spacing: .04em; }
.hero-copy h1 { margin: 0; font-size: 52px; line-height: 1.15; font-weight: 700; letter-spacing: -.01em; }
.hero-lead { max-width: 34em; margin: 20px 0 0; color: var(--vp-c-text-2); font-size: 17px; line-height: 1.85; }

.hero-search {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 460px);
  height: 48px;
  margin-top: 32px;
  padding: 0 12px 0 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 15px;
  cursor: pointer;
  transition: border-color .16s ease, background-color .16s ease;
}
.hero-search:hover { border-color: var(--vp-c-brand-1); background: var(--vp-c-bg); }
.hero-search span { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-search kbd { padding: 2px 7px; border: 1px solid var(--vp-c-divider); border-radius: 4px; background: var(--vp-c-bg); color: var(--vp-c-text-3); font: 12px/1.6 var(--vp-font-family-mono); }

.hero-stats { display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 32px 0 0; }
.hero-stats div { display: grid; gap: 2px; }
.hero-stats dt { color: var(--vp-c-text-3); font-size: 13px; }
.hero-stats dd { margin: 0; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }

.hero-updates { padding-left: 32px; border-left: 1px solid var(--vp-c-divider); }
.hero-updates h2 { margin: 6px 0 10px; color: var(--vp-c-text-2); font-size: 14px; font-weight: 600; }
.hero-updates ol { margin: 0; padding: 0; list-style: none; }
.hero-updates li + li { border-top: 1px solid var(--vp-c-divider); }
.hero-updates a { display: grid; gap: 4px; padding: 12px 0; }
.update-title { font-size: 15px; font-weight: 500; line-height: 1.55; overflow-wrap: anywhere; transition: color .16s ease; }
.hero-updates a:hover .update-title { color: var(--vp-c-brand-1); }
.update-meta { color: var(--vp-c-text-3); font-size: 13px; font-variant-numeric: tabular-nums; }
.updates-empty { margin: 0; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.7; }

/* Sections */
.home-section { margin-top: 64px; }
.home-section:has(.catalog) .section-head { margin-bottom: 20px; }
.section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 24px; margin-bottom: 24px; }
.section-head h2 { margin: 0; font-size: 26px; font-weight: 650; line-height: 1.3; }
.section-head p { margin: 0; color: var(--vp-c-text-2); font-size: 15px; line-height: 1.7; }

.catalog { columns: 2; column-gap: 56px; }
.catalog-group { --accent: var(--home-accent-development); break-inside: avoid; padding-bottom: 40px; }
.group-ai-audio { --accent: var(--home-accent-ai-audio); }
.group-systems-data { --accent: var(--home-accent-systems-data); }
.group-tools { --accent: var(--home-accent-tools); }
.catalog-group h3 { display: flex; align-items: center; gap: 8px; margin: 0; padding-bottom: 10px; border-bottom: 2px solid var(--accent); font-size: 16px; font-weight: 600; }
.catalog-group h3 svg { color: var(--accent); }
.catalog-group h3 small { margin-left: auto; color: var(--vp-c-text-3); font-size: 13px; font-weight: 400; font-variant-numeric: tabular-nums; }
.catalog-group ul { margin: 0; padding: 0; list-style: none; }
.catalog-group li { border-bottom: 1px solid var(--vp-c-divider); }
.catalog-group a { display: flex; align-items: center; gap: 16px; padding: 14px 8px; margin: 0 -8px; border-radius: 6px; transition: background-color .16s ease; }
.catalog-group a:hover { background: var(--vp-c-bg-soft); }
.topic-text { display: grid; flex: 1; gap: 3px; min-width: 0; }
.topic-text strong { font-size: 15px; font-weight: 600; line-height: 1.5; }
.topic-text span { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.65; overflow-wrap: anywhere; }
.topic-count { flex: none; min-width: 2.5em; color: var(--vp-c-text-3); font-size: 13px; text-align: right; font-variant-numeric: tabular-nums; }
.topic-count::after { content: ' 篇'; }
.topic-arrow { flex: none; color: var(--vp-c-text-3); transition: transform .16s ease, color .16s ease; }
.catalog-group a:hover .topic-arrow { color: var(--accent); transform: translateX(2px); }

.routes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.routes a { display: grid; gap: 6px; height: 100%; padding: 18px 20px 20px; border: 1px solid var(--vp-c-divider); border-radius: 8px; transition: border-color .16s ease; }
.routes a:hover { border-color: var(--vp-c-brand-1); }
.route-index { color: var(--vp-c-brand-1); font: 600 13px/1.4 var(--vp-font-family-mono); }
.routes strong { font-size: 16px; font-weight: 600; line-height: 1.5; }
.routes span:last-child { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.7; }

.home-more { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 64px; border-top: 1px solid var(--vp-c-divider); }
.home-more a { display: grid; gap: 4px; padding: 20px 20px 0 0; }
.home-more strong { display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 600; }
.home-more a:hover strong { color: var(--vp-c-brand-1); }
.home-more span { color: var(--vp-c-text-3); font-size: 13px; line-height: 1.6; }

@media (max-width: 960px) {
  .home-hero { grid-template-columns: minmax(0, 1fr); gap: 40px; }
  .hero-updates { padding: 24px 0 0; border-left: 0; border-top: 1px solid var(--vp-c-divider); }
  .catalog { columns: 1; }
  .routes, .home-more { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .home { width: calc(100% - 32px); padding: 32px 0 64px; }
  .hero-copy h1 { font-size: 38px; }
  .hero-lead { font-size: 16px; }
  .hero-search kbd { display: none; }
  .home-section, .home-more { margin-top: 48px; }
  .section-head h2 { font-size: 22px; }
  .routes { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .home-more { grid-template-columns: minmax(0, 1fr); }
  .home-more a { padding: 16px 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .home *, .home *::after { transition: none !important; }
}
</style>
