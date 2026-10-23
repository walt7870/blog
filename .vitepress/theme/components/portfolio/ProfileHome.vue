<script setup lang="ts">
import { withBase } from 'vitepress';
import { ArrowRight, ArrowUpRight, GitFork, Mail, Video } from '@lucide/vue';
import { categories, projects } from './projects';
import { caseStudies } from './caseStudies';
import { projectMedia } from './media';

defineProps<{ showKnowledge?: boolean; contactEmail?: string }>();

const featuredIds = ['amphion-cloud', 'private-asr', 'speech-sdk'];
const featured = featuredIds.map(id => projects.find(p => p.id === id)!).map(p => ({
  ...p,
  image: projectMedia[p.id]?.[0],
  evidence: (caseStudies[p.id]?.evidence || []).slice(0, 3),
}));

// Remaining projects keep the portfolio's category order so the overview and the list page agree.
const groups = categories.slice(1).map(category => ({
  category,
  items: projects.filter(p => p.category === category && !featuredIds.includes(p.id)).map(p => ({ ...p, evidence: caseStudies[p.id]?.evidence?.[0] })),
})).filter(group => group.items.length);
// Categories whose projects are all featured link to the first featured project instead of an empty group.
const domainCounts = categories.slice(1).map(category => ({
  category,
  count: projects.filter(p => p.category === category).length,
  target: groups.some(g => g.category === category) ? `#domain-${category}` : `#project-${featured.find(p => p.category === category)?.id}`,
})).filter(d => d.count);

const strengths = [
  { title: '技术管理与系统架构', text: '在思为科技承担后端负责人、架构设计与团队管理工作，围绕营销云业务划分服务边界，推进微服务与云原生改造；近期项目中建设代码治理、持续集成与发布流程。' },
  { title: '全栈开发与产品建设', text: '覆盖前端工作台、后端服务、数据与消息链路，以及桌面和移动端适配，处理权限、状态一致性、数据恢复和跨端交互等贯穿系统的问题。' },
  { title: 'AI 应用与工程化', text: '在科大讯飞参与行业 AI 方案与私有化项目，近期延伸至 AI 能力云平台、语音 SDK 和模型服务，连接模型能力、业务系统和不同运行环境。' },
];
const stack = [['服务端', 'Java / Spring Cloud · Go · Rust'], ['前端与跨端', 'Vue / TypeScript · Flutter · 原生桥接'], ['数据与消息', 'MySQL / PostgreSQL / Redis · RocketMQ'], ['工程平台', 'Docker / Kubernetes · GitLab CI']];
const topics = [
  { title: 'AI 工程', description: '模型接入、Agent、RAG 与语音工程', path: '/docs/ai/' },
  { title: '架构设计', description: '领域建模、服务边界与系统演进', path: '/docs/design/architecture/' },
  { title: '容器与部署', description: 'Docker、Kubernetes 与运行维护', path: '/docs/container/' },
  { title: '工程工具', description: 'Git、CI 与交付实践', path: '/docs/tools/git/' },
];
const projectLink = (id: string) => withBase(`/projects/${id}`);
</script>

<template>
  <main class="profile">
    <header class="profile-intro">
      <div class="intro-copy">
        <p class="intro-role">技术管理 · 系统架构 · 全栈工程</p>
        <h1>牛万成</h1>
        <p class="intro-summary">10 年以上软件研发经验。曾带领后端团队推进营销云的微服务和云原生改造，项目经历覆盖智慧安防、AI 能力平台、私有化语音系统与跨端 SDK。从服务边界、数据所有权到部署与验收，围绕业务目标制定方案并深入核心实现。</p>
        <div class="intro-actions">
          <a class="btn-primary" :href="withBase('/projects/')">全部项目案例 <ArrowRight :size="17" aria-hidden="true" /></a>
          <a href="https://github.com/walt7870" target="_blank" rel="noopener noreferrer"><GitFork :size="16" aria-hidden="true" />GitHub<ArrowUpRight :size="13" aria-hidden="true" /></a>
          <a href="https://space.bilibili.com/181407346" target="_blank" rel="noopener noreferrer"><Video :size="16" aria-hidden="true" />B站 · 技术视频<ArrowUpRight :size="13" aria-hidden="true" /></a>
          <a v-if="contactEmail" :href="`mailto:${contactEmail}`"><Mail :size="16" aria-hidden="true" />{{ contactEmail }}</a>
        </div>
      </div>
      <nav class="intro-domains" aria-label="项目领域">
        <p><strong>{{ projects.length }}</strong> 个项目案例</p>
        <ul>
          <li v-for="d in domainCounts" :key="d.category"><a :href="d.target"><span>{{ d.category }}</span><span class="count">{{ d.count }}</span></a></li>
        </ul>
      </nav>
    </header>

    <section class="block" aria-labelledby="featured-title">
      <div class="block-head">
        <h2 id="featured-title">重点项目</h2>
        <p>负责范围、关键工程问题和有范围说明的验证结果；完整架构与链路见案例页。</p>
      </div>
      <article v-for="(p, index) in featured" :id="`project-${p.id}`" :key="p.id" class="feature">
        <a class="feature-media" :href="projectLink(p.id)" tabindex="-1" aria-hidden="true">
          <img v-if="p.image" :src="withBase(`/projects/screenshots/${p.image.id}.webp`)" :alt="p.image.label" width="480" height="300" :loading="index ? 'lazy' : 'eager'" />
        </a>
        <div class="feature-body">
          <p class="meta"><span class="category">{{ p.category }}</span><span>{{ p.status }}</span></p>
          <h3><a :href="projectLink(p.id)">{{ p.title }}</a></h3>
          <p class="subtitle">{{ p.subtitle }}</p>
          <p class="business">{{ p.business }}</p>
          <div class="scope">
            <span class="label">负责范围</span>
            <ul><li v-for="s in p.scope" :key="s">{{ s }}</li></ul>
          </div>
          <dl v-if="p.evidence.length" class="evidence">
            <div v-for="e in p.evidence" :key="e.label"><dt>{{ e.label }}</dt><dd>{{ e.value }}</dd></div>
          </dl>
          <p class="stack-line">{{ p.tags.join(' · ') }}</p>
          <a class="feature-link" :href="projectLink(p.id)">查看案例：架构、链路与验证 <ArrowRight :size="15" aria-hidden="true" /></a>
        </div>
      </article>
    </section>

    <section class="block" aria-labelledby="more-title">
      <div class="block-head">
        <h2 id="more-title">更多项目经历</h2>
        <p>按领域分组，每项列出负责范围与一项关键结果。</p>
      </div>
      <section v-for="g in groups" :id="`domain-${g.category}`" :key="g.category" class="domain" :aria-label="g.category">
        <h3 class="domain-title">{{ g.category }}</h3>
        <ul class="rows">
          <li v-for="p in g.items" :key="p.id">
            <a :href="projectLink(p.id)">
              <span class="row-main">
                <strong>{{ p.title }}<small>{{ p.status }}</small></strong>
                <span class="row-summary">{{ p.summary }}</span>
                <span class="row-scope">{{ p.scope.join(' · ') }}</span>
              </span>
              <span v-if="p.evidence" class="row-evidence"><b>{{ p.evidence.value }}</b><span>{{ p.evidence.label }}</span></span>
              <ArrowRight class="row-arrow" :size="16" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>
    </section>

    <section class="block" aria-labelledby="strength-title">
      <div class="block-head"><h2 id="strength-title">能力与技术栈</h2></div>
      <div class="strengths">
        <div v-for="s in strengths" :key="s.title"><h3>{{ s.title }}</h3><p>{{ s.text }}</p></div>
      </div>
      <dl class="stack">
        <div v-for="[k, v] in stack" :key="k"><dt>{{ k }}</dt><dd>{{ v }}</dd></div>
      </dl>
    </section>

    <section v-if="showKnowledge" class="block" aria-labelledby="notes-title">
      <div class="block-head">
        <h2 id="notes-title">技术笔记</h2>
        <a :href="withBase('/')">全部专题 <ArrowRight :size="15" aria-hidden="true" /></a>
      </div>
      <div class="topics">
        <a v-for="t in topics" :key="t.path" :href="withBase(t.path)"><strong>{{ t.title }}</strong><span>{{ t.description }}</span></a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.profile { width: min(1120px, 100% - 48px); margin: 0 auto; padding: 56px 0 88px; color: var(--vp-c-text-1); }
.profile h1, .profile h2, .profile h3, .profile p, .profile dl, .profile ul { margin: 0; }
.profile ul { padding: 0; list-style: none; }
.profile a { color: inherit; text-decoration: none; }
.profile a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; border-radius: 4px; }

/* Intro */
.profile-intro { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 56px; align-items: end; padding-bottom: 40px; border-bottom: 1px solid var(--vp-c-divider); }
.intro-role { color: var(--vp-c-brand-1); font-size: 14px; font-weight: 600; }
.intro-copy h1 { margin-top: 10px; font-size: 44px; line-height: 1.2; font-weight: 700; }
.intro-summary { max-width: 40em; margin-top: 18px !important; color: var(--vp-c-text-2); font-size: 17px; line-height: 1.85; }
.intro-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 22px; margin-top: 28px; font-size: 14px; }
.intro-actions a { display: inline-flex; align-items: center; gap: 6px; color: var(--vp-c-text-2); }
.intro-actions a:hover { color: var(--vp-c-brand-1); }
.intro-actions .btn-primary { gap: 10px; height: 42px; padding: 0 18px; border-radius: 6px; background: var(--vp-c-brand-1); color: var(--vp-c-white); font-weight: 600; }
.dark .intro-actions .btn-primary { color: #0f1a15; }
.intro-actions .btn-primary:hover { background: var(--vp-c-brand-2); color: var(--vp-c-white); }
.dark .intro-actions .btn-primary:hover { color: #0f1a15; }
.intro-domains { padding-left: 28px; border-left: 1px solid var(--vp-c-divider); }
.intro-domains p { color: var(--vp-c-text-2); font-size: 14px; }
.intro-domains p strong { margin-right: 4px; color: var(--vp-c-text-1); font-size: 28px; font-weight: 650; font-variant-numeric: tabular-nums; }
.intro-domains ul { margin-top: 10px; }
.intro-domains a { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--vp-c-divider); font-size: 14px; }
.intro-domains a:hover { color: var(--vp-c-brand-1); }
.intro-domains .count { color: var(--vp-c-text-3); font-variant-numeric: tabular-nums; }

/* Blocks */
.block { margin-top: 64px; }
.block-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 24px; margin-bottom: 24px; }
.block-head h2 { font-size: 26px; font-weight: 650; line-height: 1.3; }
.block-head p { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.7; }
.block-head > a { display: inline-flex; align-items: center; gap: 4px; color: var(--vp-c-brand-1); font-size: 14px; }

/* Featured projects */
.feature { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 40px; padding: 32px 0; border-top: 1px solid var(--vp-c-divider); }
.feature:last-child { border-bottom: 1px solid var(--vp-c-divider); }
.feature-media { align-self: start; display: block; overflow: hidden; border: 1px solid var(--vp-c-divider); border-radius: 8px; background: var(--vp-c-bg-soft); aspect-ratio: 16 / 10; }
.feature-media img { display: block; width: 100%; height: 100%; object-fit: contain; transition: transform .3s ease; }
.feature:hover .feature-media img { transform: scale(1.02); }
.meta { display: flex; gap: 12px; color: var(--vp-c-text-3); font-size: 13px; }
.meta .category { color: var(--vp-c-brand-1); font-weight: 600; }
.feature h3 { margin-top: 6px !important; font-size: 22px; font-weight: 650; line-height: 1.4; }
.feature h3 a:hover { color: var(--vp-c-brand-1); }
.subtitle { margin-top: 2px !important; color: var(--vp-c-text-2); font-size: 15px; }
.business { margin-top: 14px !important; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.85; }
.scope { display: flex; gap: 12px; align-items: baseline; margin-top: 16px; }
.label { flex: none; color: var(--vp-c-text-3); font-size: 13px; }
.scope ul { display: flex; flex-wrap: wrap; gap: 6px; }
.scope li { padding: 2px 9px; border-radius: 4px; background: var(--vp-c-bg-soft); font-size: 13px; line-height: 1.7; }
.evidence { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px !important; padding: 14px 0; border-block: 1px solid var(--vp-c-divider); }
.evidence div { display: flex; flex-direction: column-reverse; gap: 2px; min-width: 0; }
.evidence dd { margin: 0; font-size: 17px; font-weight: 650; line-height: 1.4; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.evidence dt { color: var(--vp-c-text-3); font-size: 12px; }
.stack-line { margin-top: 14px !important; color: var(--vp-c-text-3); font: 12.5px/1.6 var(--vp-font-family-mono); }
.feature-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 14px; color: var(--vp-c-brand-1) !important; font-size: 14px; font-weight: 600; }
.feature-link:hover { text-decoration: underline !important; text-underline-offset: 3px; }

/* Project rows */
.domain + .domain { margin-top: 32px; }
.domain-title { padding-bottom: 8px; border-bottom: 2px solid var(--vp-c-text-1); font-size: 15px; font-weight: 600; scroll-margin-top: 88px; }
.domain, .feature { scroll-margin-top: 88px; }
.rows li { border-bottom: 1px solid var(--vp-c-divider); }
.rows a { display: flex; align-items: center; gap: 24px; padding: 16px 8px; margin: 0 -8px; border-radius: 6px; transition: background-color .16s ease; }
.rows a:hover { background: var(--vp-c-bg-soft); }
.row-main { display: grid; flex: 1; gap: 3px; min-width: 0; }
.row-main strong { display: flex; align-items: baseline; gap: 10px; font-size: 16px; font-weight: 600; }
.row-main small { color: var(--vp-c-text-3); font-size: 12px; font-weight: 400; }
.row-summary { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.7; }
.row-scope { color: var(--vp-c-text-3); font-size: 13px; }
.row-evidence { display: grid; flex: none; width: 168px; text-align: right; }
.row-evidence b { font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.row-evidence span { color: var(--vp-c-text-3); font-size: 12px; }
.row-arrow { flex: none; color: var(--vp-c-text-3); transition: transform .16s ease; }
.rows a:hover .row-arrow { color: var(--vp-c-brand-1); transform: translateX(2px); }

/* Strengths */
.strengths { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.strengths h3 { padding-top: 12px; border-top: 2px solid var(--vp-c-brand-1); font-size: 16px; font-weight: 600; }
.strengths p { margin-top: 8px !important; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.85; }
.stack { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 28px !important; padding-top: 20px; border-top: 1px solid var(--vp-c-divider); }
.stack dt { color: var(--vp-c-text-3); font-size: 12px; }
.stack dd { margin: 2px 0 0; font-size: 13.5px; line-height: 1.6; }

.topics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.topics a { display: grid; gap: 4px; padding: 16px 18px; border: 1px solid var(--vp-c-divider); border-radius: 8px; transition: border-color .16s ease; }
.topics a:hover { border-color: var(--vp-c-brand-1); }
.topics strong { font-size: 15px; font-weight: 600; }
.topics span { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.6; }

@media (max-width: 960px) {
  .profile-intro { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .intro-domains { padding: 20px 0 0; border-left: 0; border-top: 1px solid var(--vp-c-divider); }
  .feature { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .strengths { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .stack, .topics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .profile { width: calc(100% - 32px); padding: 32px 0 64px; }
  .intro-copy h1 { font-size: 34px; }
  .intro-summary { font-size: 16px; }
  .block { margin-top: 48px; }
  .block-head h2 { font-size: 22px; }
  .scope { flex-direction: column; gap: 6px; }
  .evidence { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .evidence div { flex-direction: row-reverse; justify-content: space-between; align-items: baseline; gap: 12px; }
  .evidence dd { font-size: 15px; text-align: left; }
  .rows a { flex-wrap: wrap; gap: 8px 16px; }
  .row-main { flex-basis: calc(100% - 40px); }
  .row-evidence { order: 3; width: auto; padding-left: 0; text-align: left; grid-template-columns: auto auto; gap: 8px; align-items: baseline; }
  .row-arrow { display: none; }
  .stack, .topics { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .profile *, .profile *::before { transition: none !important; }
}
</style>
