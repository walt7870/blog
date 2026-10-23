<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { ArrowRight, ArrowUpRight, AudioLines, Code2, Database, Search, Wrench } from '@lucide/vue'
import { data } from './home.data.ts'
import { projects } from '../portfolio/projects'
import { caseStudies } from '../portfolio/caseStudies'
import { projectMedia } from '../portfolio/media'

const groupMeta: Record<string, { icon: typeof Code2; tone: string; tag: string }> = {
  development: { icon: Code2, tone: 'blue', tag: '语言 · 架构 · 算法' },
  'ai-audio': { icon: AudioLines, tone: 'green', tag: '大模型 · Agent · 语音' },
  'systems-data': { icon: Database, tone: 'orange', tag: '数据 · 容器 · 网络' },
  tools: { icon: Wrench, tone: 'violet', tag: 'Git · 编辑器 · 运行时' },
}

const showcase = ['amphion-cloud', 'memo-ai', 'voice-platform'].map(id => projects.find(p => p.id === id)!).map(p => ({
  ...p,
  image: projectMedia[p.id]?.[0],
  evidence: caseStudies[p.id]?.evidence?.[0],
}))

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
    <section class="sc-hero" aria-labelledby="home-title">
      <div class="sc-hero-inner">
        <div class="hero-copy">
          <p class="sc-eyebrow"><span class="sc-pulse" aria-hidden="true"></span>工程实践知识库 · 持续更新</p>
          <h1 id="home-title" class="sc-title">稻草<span>小站</span></h1>
          <p class="sc-lead">从协议、Linux、容器和数据库，到 Java、架构设计、AI 与语音工程。每个专题先讲清概念边界，再给出配置入口、典型场景和排查路径。</p>
          <button type="button" class="hero-search" @click="openSearch">
            <Search :size="18" aria-hidden="true" />
            <span>搜索文章、命令或概念</span>
            <kbd>{{ searchKey }}</kbd>
          </button>
          <dl class="sc-stats">
            <div><dd>{{ data.total }}</dd><dt>篇文章</dt></div>
            <div><dd>{{ data.topicCount }}</dd><dt>个专题</dt></div>
            <div><dd>{{ projects.length }}</dd><dt>个项目案例</dt></div>
          </dl>
        </div>

        <div class="sc-collage" aria-label="项目实践画面">
          <a v-for="(p, i) in showcase" :key="p.id" :href="withBase(`/projects/${p.id}`)" class="sc-shot" :class="`sc-shot-${i}`">
            <span class="sc-shot-bar" aria-hidden="true"><i></i><i></i><i></i><b>{{ p.title }}</b></span>
            <img :src="withBase(`/projects/screenshots/${p.image?.id}.webp`)" :alt="p.image?.label" width="720" height="450" :loading="i ? 'lazy' : 'eager'" />
          </a>
        </div>
      </div>
    </section>

    <div class="home-body">
      <section v-if="data.updates.length" class="section updates-panel" aria-labelledby="updates-title">
        <header class="sc-head">
          <h2 id="updates-title"><span class="sc-idx">01</span>最近更新</h2>
          <p v-if="data.latest">最近一次更新于 {{ data.latest }}</p>
        </header>
        <ol class="updates">
          <li v-for="item in data.updates" :key="item.url">
            <a :href="withBase(item.url)">
              <span class="update-topic">{{ item.topic }}</span>
              <strong>{{ item.title }}</strong>
              <time :datetime="item.date">{{ item.date }}</time>
            </a>
          </li>
        </ol>
      </section>

      <section class="section" aria-labelledby="catalog-title">
        <header class="sc-head">
          <h2 id="catalog-title"><span class="sc-idx">02</span>专题目录</h2>
          <p>入口页负责总览和阅读路径，细节页拆解机制、配置与排错。</p>
        </header>
        <div class="catalog">
          <section v-for="group in data.groups" :key="group.id" class="group" :class="`tone-${groupMeta[group.id]?.tone || 'blue'}`" :aria-labelledby="`group-${group.id}`">
            <header class="group-head">
              <span class="group-icon"><component :is="groupMeta[group.id]?.icon || Code2" :size="24" aria-hidden="true" /></span>
              <div>
                <h3 :id="`group-${group.id}`">{{ group.title }}</h3>
                <p>{{ groupMeta[group.id]?.tag }}</p>
              </div>
              <span class="group-count"><b>{{ group.count }}</b>篇</span>
            </header>
            <ul>
              <li v-for="topic in group.topics" :key="topic.link">
                <a :href="withBase(topic.link)">
                  <span class="topic-text"><strong>{{ topic.text }}</strong><span>{{ topic.description }}</span></span>
                  <span class="topic-count">{{ topic.count }}</span>
                  <ArrowRight class="topic-arrow" :size="16" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <section class="section" aria-labelledby="projects-title">
        <header class="sc-head">
          <h2 id="projects-title"><span class="sc-idx">03</span>项目实践</h2>
          <a :href="withBase('/projects/')">全部 {{ projects.length }} 个案例 <ArrowRight :size="15" aria-hidden="true" /></a>
        </header>
        <div class="showcase">
          <a v-for="p in showcase" :key="p.id" :href="withBase(`/projects/${p.id}`)" class="case">
            <span class="case-media"><img :src="withBase(`/projects/screenshots/${p.image?.id}.webp`)" :alt="p.image?.label" width="720" height="450" loading="lazy" /></span>
            <span class="case-body">
              <span class="case-meta">{{ p.category }} · {{ p.status }}</span>
              <strong>{{ p.title }}</strong>
              <span class="case-summary">{{ p.summary }}</span>
              <span v-if="p.evidence" class="case-evidence"><b>{{ p.evidence.value }}</b>{{ p.evidence.label }}</span>
            </span>
          </a>
        </div>
      </section>

      <section class="section" aria-labelledby="routes-title">
        <header class="sc-head">
          <h2 id="routes-title"><span class="sc-idx">04</span>按问题进入</h2>
          <p>从当前要解决的问题进入，再沿专题页的导读继续深入。</p>
        </header>
        <ol class="routes">
          <li v-for="(route, index) in routes" :key="route.link">
            <a :href="withBase(route.link)">
              <span class="route-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <strong>{{ route.title }}</strong>
              <span>{{ route.path }}</span>
              <ArrowUpRight class="route-arrow" :size="18" aria-hidden="true" />
            </a>
          </li>
        </ol>
      </section>

      <nav class="more" aria-label="更多内容">
        <a v-for="item in more" :key="item.text" :href="item.link" :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noreferrer' : undefined">
          <strong>{{ item.text }}<ArrowUpRight :size="14" aria-hidden="true" /></strong>
          <span>{{ item.note }}</span>
        </a>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.home {
  --tone-blue: #2f6fe4;
  --tone-green: #0f9f6e;
  --tone-orange: #e8692c;
  --tone-violet: #7c5ce0;
  color: var(--vp-c-text-1);
  overflow-x: clip;
}
.dark .home { --tone-blue: #7aa7ff; --tone-green: #46d39b; --tone-orange: #ff9a63; --tone-violet: #a993ff; }
.home a { color: inherit; text-decoration: none; }
.home a:focus-visible, .hero-search:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; border-radius: 8px; }

.hero-search { display: flex; align-items: center; gap: 12px; width: min(100%, 480px); height: 54px; margin-top: 34px; padding: 0 12px 0 18px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 12px; background: rgba(255, 255, 255, .06); color: #cfdcd5; font-size: 15px; cursor: pointer; transition: border-color .2s ease, background-color .2s ease, box-shadow .2s ease; }
.hero-search:hover { border-color: rgba(94, 224, 168, .6); background: rgba(255, 255, 255, .09); box-shadow: 0 0 0 4px rgba(94, 224, 168, .1); }
.hero-search span { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-search kbd { padding: 3px 8px; border: 1px solid rgba(255, 255, 255, .18); border-radius: 6px; color: #9fb2a8; font: 12px/1.5 var(--vp-font-family-mono); }


/* Body */
.home-body { width: min(1240px, 100% - 48px); margin: 0 auto; padding: 0 0 96px; }
.section { margin-top: 80px; }

/* Recent updates: a raised panel overlapping the hero edge. */
.updates-panel { position: relative; z-index: 2; margin-top: -60px; padding: 28px 28px 24px; border: 1px solid var(--vp-c-divider); border-radius: 18px; background: var(--vp-c-bg); box-shadow: 0 24px 48px -24px rgba(8, 19, 15, .35); }
.updates-panel .sc-head { margin-bottom: 18px; }
.updates-panel .sc-head h2 { font-size: 22px; }
.updates { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.updates a { display: grid; gap: 6px; height: 100%; padding: 16px 18px; border-radius: 12px; background: var(--vp-c-bg-soft); transition: background-color .2s ease, transform .2s ease; }
.updates a:hover { background: var(--vp-c-brand-soft); transform: translateY(-2px); }
.update-topic { color: var(--vp-c-brand-1); font-size: 12px; font-weight: 600; }
.updates strong { font-size: 15px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
.updates time { color: var(--vp-c-text-3); font: 12px/1.4 var(--vp-font-family-mono); }

/* Topic groups: each group is a tinted panel with its own colour. */
.catalog { columns: 2; column-gap: 20px; }
.catalog .group { break-inside: avoid; margin-bottom: 20px; }
.group { --tone: var(--tone-blue); position: relative; padding: 24px 24px 12px; border: 1px solid color-mix(in srgb, var(--tone) 24%, var(--vp-c-divider)); border-radius: 18px; background: linear-gradient(160deg, color-mix(in srgb, var(--tone) 12%, var(--vp-c-bg)) 0%, var(--vp-c-bg) 55%); overflow: hidden; }
.tone-green { --tone: var(--tone-green); }
.tone-orange { --tone: var(--tone-orange); }
.tone-violet { --tone: var(--tone-violet); }
.group::after { content: ''; position: absolute; top: -60px; right: -60px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--tone) 24%, transparent), transparent 70%); pointer-events: none; }
.group-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.group-icon { display: grid; place-items: center; flex: none; width: 52px; height: 52px; border-radius: 14px; background: var(--tone); color: #fff; box-shadow: 0 10px 24px -10px var(--tone); }
.dark .group-icon { color: #0b1210; }
.group-head h3 { margin: 0; font-size: 20px; font-weight: 700; }
.group-head p { margin: 2px 0 0; color: var(--vp-c-text-2); font-size: 13px; }
.group-count { margin-left: auto; color: var(--vp-c-text-2); font-size: 13px; white-space: nowrap; }
.group-count b { margin-right: 3px; color: var(--tone); font: 700 26px/1 var(--vp-font-family-mono); }
.group ul { margin: 0; padding: 0; list-style: none; }
.group li + li { border-top: 1px solid color-mix(in srgb, var(--tone) 14%, var(--vp-c-divider)); }
.group a { display: flex; align-items: center; gap: 14px; padding: 13px 10px; margin: 0 -10px; border-radius: 10px; transition: background-color .18s ease; }
.group a:hover { background: color-mix(in srgb, var(--tone) 9%, transparent); }
.topic-text { display: grid; flex: 1; gap: 2px; min-width: 0; }
.topic-text strong { font-size: 15px; font-weight: 600; }
.topic-text span { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.topic-count { flex: none; min-width: 2.6em; padding: 2px 8px; border-radius: 999px; background: color-mix(in srgb, var(--tone) 12%, transparent); color: var(--tone); font: 600 12px/1.6 var(--vp-font-family-mono); text-align: center; }
.topic-arrow { flex: none; color: var(--vp-c-text-3); transition: transform .18s ease, color .18s ease; }
.group a:hover .topic-arrow { color: var(--tone); transform: translateX(3px); }

/* Project showcase */
.showcase { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 20px; }
.case { display: flex; flex-direction: column; border: 1px solid var(--vp-c-divider); border-radius: 18px; background: var(--vp-c-bg); overflow: hidden; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.case:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, var(--vp-c-divider)); box-shadow: 0 24px 48px -24px rgba(8, 19, 15, .35); }
.case-media { display: block; overflow: hidden; border-bottom: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); aspect-ratio: 16 / 10; }
.case-media img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top left; transition: transform .5s ease; }
.case:hover .case-media img { transform: scale(1.04); }
.case-body { display: grid; gap: 6px; padding: 20px 22px 22px; }
.case-meta { color: var(--vp-c-brand-1); font-size: 12px; font-weight: 600; }
.case-body strong { font-size: 19px; font-weight: 700; }
.case-summary { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.7; }
.case-evidence { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px dashed var(--vp-c-divider); color: var(--vp-c-text-2); font-size: 12px; }
.case-evidence b { color: var(--vp-c-text-1); font: 700 16px/1.3 var(--vp-font-family-mono); }

/* Routes */
.routes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.routes a { position: relative; display: grid; align-content: start; gap: 8px; height: 100%; padding: 22px 22px 24px; border-radius: 16px; background: var(--vp-c-bg-soft); overflow: hidden; transition: background-color .2s ease, transform .2s ease; }
.routes a:hover { background: var(--vp-c-brand-soft); transform: translateY(-3px); }
.route-index { color: color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent); font: 800 40px/1 var(--vp-font-family-mono); }
.routes strong { font-size: 17px; font-weight: 700; }
.routes span:not(.route-index) { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.7; }
.route-arrow { position: absolute; top: 22px; right: 20px; color: var(--vp-c-text-3); transition: color .2s ease, transform .2s ease; }
.routes a:hover .route-arrow { color: var(--vp-c-brand-1); transform: translate(2px, -2px); }

.more { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 80px; padding-top: 28px; border-top: 1px solid var(--vp-c-divider); }
.more a { display: grid; gap: 4px; }
.more strong { display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 600; }
.more a:hover strong { color: var(--vp-c-brand-1); }
.more span { color: var(--vp-c-text-3); font-size: 13px; }


@media (max-width: 1080px) {
  .catalog { columns: 1; }
  .showcase { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .showcase .case:first-child { grid-column: 1 / -1; }
  .routes, .more { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .updates { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .home-body { width: calc(100% - 32px); }
  .hero-search kbd { display: none; }
  .section { margin-top: 56px; }
  .updates-panel { padding: 20px 16px 16px; border-radius: 14px; }
  .updates, .showcase, .routes, .more { grid-template-columns: minmax(0, 1fr); }
  .showcase .case:first-child { grid-column: auto; }
  .group { padding: 20px 16px 8px; }
  .group-icon { width: 44px; height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  .home *, .home *::before, .home *::after { animation: none !important; transition: none !important; }
}
</style>
