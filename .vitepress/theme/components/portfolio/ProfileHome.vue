<script setup lang="ts">
import { withBase } from 'vitepress';
import { ArrowRight, ArrowUpRight, Bot, BrainCircuit, Code2, GitFork, Layers3, Mail, Video } from '@lucide/vue';
import { categories, projects } from './projects';
import { caseStudies } from './caseStudies';
import { projectMedia } from './media';
import { toneOf } from './tones';
import './showcase.css';

defineProps<{ showKnowledge?: boolean; contactEmail?: string }>();

const featuredIds = ['amphion-cloud', 'private-asr', 'speech-sdk'];
const featured = featuredIds.map(id => projects.find(p => p.id === id)!).map(p => ({
  ...p,
  tone: toneOf(p.category),
  image: projectMedia[p.id]?.[0],
  evidence: (caseStudies[p.id]?.evidence || []).slice(0, 3),
}));

// Remaining projects keep the portfolio's category order so the overview and the list page agree.
const groups = categories.slice(1).map(category => ({
  category,
  tone: toneOf(category),
  items: projects.filter(p => p.category === category && !featuredIds.includes(p.id)).map(p => ({ ...p, evidence: caseStudies[p.id]?.evidence?.[0] })),
})).filter(group => group.items.length);
// Categories whose projects are all featured link to the first featured project instead of an empty group.
const domainCounts = categories.slice(1).map(category => ({
  category,
  tone: toneOf(category),
  count: projects.filter(p => p.category === category).length,
  target: groups.some(g => g.category === category) ? `#domain-${category}` : `#project-${featured.find(p => p.category === category)?.id}`,
})).filter(d => d.count);

const strengths = [
  { title: '技术管理与系统架构', icon: Layers3, tone: 'blue', text: '在思为科技承担后端负责人、架构设计与团队管理工作，围绕营销云业务划分服务边界，推进微服务与云原生改造；近期项目中建设代码治理、持续集成与发布流程。' },
  { title: '全栈开发与产品建设', icon: Code2, tone: 'violet', text: '覆盖前端工作台、后端服务、数据与消息链路，以及桌面和移动端适配，处理权限、状态一致性、数据恢复和跨端交互等贯穿系统的问题。' },
  { title: 'AI 应用与工程化', icon: BrainCircuit, tone: 'green', text: '在科大讯飞参与行业 AI 方案与私有化项目，近期延伸至 AI 能力云平台、语音 SDK 和模型服务，连接模型能力、业务系统和不同运行环境。' },
  { title: 'AI Agent 协作开发', icon: Bot, tone: 'orange', text: '把 Claude Code、Codex 等 Coding Agent 纳入十几个项目的日常交付：仓库规则约束生产操作，交接文档支撑多会话接力，测试、真机与线上回读分级验证，发布与对外发送按单次授权执行。' },
];
const stack = [['服务端', ['Java / Spring Cloud', 'Go', 'Rust']], ['前端与跨端', ['Vue / TypeScript', 'Flutter', '原生桥接']], ['数据与消息', ['MySQL', 'PostgreSQL', 'Redis', 'RocketMQ']], ['工程平台', ['Docker', 'Kubernetes', 'GitLab CI']]] as const;
const topics = [
  { title: 'AI 工程', description: '模型接入、Agent、RAG 与语音工程', path: '/docs/ai/' },
  { title: '架构设计', description: '领域建模、服务边界与系统演进', path: '/docs/design/architecture/' },
  { title: '容器与部署', description: 'Docker、Kubernetes 与运行维护', path: '/docs/container/' },
  { title: '工程工具', description: 'Git、CI 与交付实践', path: '/docs/tools/git/' },
  { title: 'AI 编程实战', description: '多 Agent 分工、规则、验证与复盘', path: '/docs/ai/ai-coding-practice/' },
];
const projectLink = (id: string) => withBase(`/projects/${id}`);
const shot = (id?: string) => withBase(`/projects/screenshots/${id}.webp`);
</script>

<template>
  <div class="profile-root">
    <section class="sc-hero" aria-labelledby="profile-name">
      <div class="sc-hero-inner">
        <div>
          <p class="sc-eyebrow"><span class="sc-pulse" aria-hidden="true"></span>技术管理 · 系统架构 · 全栈工程</p>
          <h1 id="profile-name" class="sc-title">牛万成</h1>
          <p class="sc-lead">10 年以上软件研发经验。曾带领后端团队推进营销云的微服务和云原生改造，项目经历覆盖智慧安防、AI 能力平台、私有化语音系统与跨端 SDK。从服务边界、数据所有权到部署与验收，围绕业务目标制定方案并深入核心实现；近期以多个 Coding Agent 协作推进开发与交付，用规则和分级验证保证结果可核对。</p>
          <div class="sc-actions">
            <a class="sc-btn" :href="withBase('/projects/')">全部项目案例 <ArrowRight :size="17" aria-hidden="true" /></a>
            <a class="sc-link" href="https://github.com/walt7870" target="_blank" rel="noopener noreferrer"><GitFork :size="16" aria-hidden="true" />GitHub<ArrowUpRight :size="13" aria-hidden="true" /></a>
            <a class="sc-link" href="https://space.bilibili.com/181407346" target="_blank" rel="noopener noreferrer"><Video :size="16" aria-hidden="true" />B站 · 技术视频<ArrowUpRight :size="13" aria-hidden="true" /></a>
            <a v-if="contactEmail" class="sc-link" :href="`mailto:${contactEmail}`"><Mail :size="16" aria-hidden="true" />{{ contactEmail }}</a>
          </div>
          <dl class="sc-stats">
            <div><dd>10+</dd><dt>年研发经验</dt></div>
            <div><dd>{{ projects.length }}</dd><dt>个项目案例</dt></div>
            <div><dd>{{ domainCounts.length }}</dd><dt>个项目领域</dt></div>
          </dl>
        </div>
        <div class="sc-collage" aria-label="重点项目画面">
          <a v-for="(p, i) in featured" :key="p.id" :href="projectLink(p.id)" class="sc-shot" :class="[`sc-shot-${i}`, { 'is-phone': ['speech-sdk', 'livecode-duplex'].includes(p.id) }]">
            <span class="sc-shot-bar" aria-hidden="true"><i></i><i></i><i></i><b>{{ p.title }}</b></span>
            <img :src="shot(p.image?.id)" :alt="p.image?.label" width="720" height="450" :loading="i ? 'lazy' : 'eager'" />
          </a>
        </div>
      </div>
    </section>

    <main class="profile">
      <nav class="domains" aria-label="项目领域">
        <span class="domains-label">项目领域</span>
        <a v-for="d in domainCounts" :key="d.category" :href="d.target" :data-tone="d.tone"><i aria-hidden="true"></i>{{ d.category }}<b>{{ d.count }}</b></a>
      </nav>

      <section class="block" aria-labelledby="featured-title">
        <header class="sc-head">
          <h2 id="featured-title"><span class="sc-idx">01</span>重点项目</h2>
          <p>负责范围、关键工程问题和有范围说明的验证结果。</p>
        </header>
        <article v-for="(p, index) in featured" :id="`project-${p.id}`" :key="p.id" class="feature" :class="{ flip: index % 2 }" :data-tone="p.tone">
          <a class="feature-media" :class="{ 'is-phone': ['speech-sdk', 'livecode-duplex'].includes(p.id) }" :href="projectLink(p.id)" tabindex="-1" aria-hidden="true">
            <span class="sc-shot-bar"><i></i><i></i><i></i><b>{{ p.image?.label }}</b></span>
            <img v-if="p.image" :src="shot(p.image.id)" :alt="p.image.label" width="720" height="450" loading="lazy" />
          </a>
          <div class="feature-body">
            <p class="meta"><span class="chip">{{ p.category }}</span><span>{{ p.status }}</span></p>
            <h3><a :href="projectLink(p.id)">{{ p.title }}</a></h3>
            <p class="subtitle">{{ p.subtitle }}</p>
            <p class="business">{{ p.business }}</p>
            <ul class="scope" aria-label="负责范围"><li v-for="s in p.scope" :key="s">{{ s }}</li></ul>
            <dl v-if="p.evidence.length" class="evidence">
              <div v-for="e in p.evidence" :key="e.label"><dd>{{ e.value }}</dd><dt>{{ e.label }}</dt></div>
            </dl>
            <div class="feature-foot">
              <span class="stack-line">{{ p.tags.join(' · ') }}</span>
              <a class="feature-link" :href="projectLink(p.id)">查看案例 <ArrowRight :size="15" aria-hidden="true" /></a>
            </div>
          </div>
        </article>
      </section>

      <section class="block" aria-labelledby="more-title">
        <header class="sc-head">
          <h2 id="more-title"><span class="sc-idx">02</span>更多项目经历</h2>
          <p>按领域分组，每项列出负责范围与一项关键结果。</p>
        </header>
        <section v-for="g in groups" :id="`domain-${g.category}`" :key="g.category" class="domain" :data-tone="g.tone" :aria-labelledby="`domain-title-${g.category}`">
          <h3 :id="`domain-title-${g.category}`" class="domain-title"><i aria-hidden="true"></i>{{ g.category }}<small>{{ g.items.length }} 项</small></h3>
          <div class="cards">
            <a v-for="p in g.items" :key="p.id" :href="projectLink(p.id)" class="card">
              <span class="card-top"><strong>{{ p.title }}</strong><small>{{ p.status }}</small></span>
              <span class="card-summary">{{ p.summary }}</span>
              <span class="card-scope">{{ p.scope.join(' · ') }}</span>
              <span v-if="p.evidence" class="card-evidence"><b>{{ p.evidence.value }}</b>{{ p.evidence.label }}<ArrowRight class="card-arrow" :size="16" aria-hidden="true" /></span>
            </a>
          </div>
        </section>
      </section>

      <section class="block" aria-labelledby="strength-title">
        <header class="sc-head"><h2 id="strength-title"><span class="sc-idx">03</span>能力与技术栈</h2></header>
        <div class="strengths">
          <div v-for="s in strengths" :key="s.title" class="strength" :data-tone="s.tone">
            <span class="strength-icon"><component :is="s.icon" :size="22" aria-hidden="true" /></span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </div>
        <dl class="stack">
          <div v-for="[k, items] in stack" :key="k"><dt>{{ k }}</dt><dd><span v-for="v in items" :key="v">{{ v }}</span></dd></div>
        </dl>
      </section>

      <section v-if="showKnowledge" class="block" aria-labelledby="notes-title">
        <header class="sc-head">
          <h2 id="notes-title"><span class="sc-idx">04</span>技术笔记</h2>
          <a :href="withBase('/')">全部专题 <ArrowRight :size="15" aria-hidden="true" /></a>
        </header>
        <div class="topics">
          <a v-for="t in topics" :key="t.path" :href="withBase(t.path)"><strong>{{ t.title }}<ArrowUpRight :size="16" aria-hidden="true" /></strong><span>{{ t.description }}</span></a>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.profile-root { overflow-x: clip; color: var(--vp-c-text-1); }
.profile { width: min(1240px, 100% - 48px); margin: 0 auto; padding: 0 0 96px; }
.profile h1, .profile h2, .profile h3, .profile p, .profile dl, .profile ul { margin: 0; }
.profile ul { padding: 0; list-style: none; }
.profile a { color: inherit; text-decoration: none; }
.profile a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; border-radius: 6px; }

/* Domain chips: raised panel overlapping the hero edge */
.domains { position: relative; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: -40px; padding: 18px 22px; border: 1px solid var(--vp-c-divider); border-radius: 18px; background: var(--vp-c-bg); box-shadow: 0 24px 48px -24px rgba(8, 19, 15, .35); }
.domains-label { margin-right: 6px; color: var(--vp-c-text-2); font-size: 14px; font-weight: 600; }
.domains a { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border: 1px solid color-mix(in srgb, var(--tone) 30%, var(--vp-c-divider)); border-radius: 999px; background: color-mix(in srgb, var(--tone) 8%, var(--vp-c-bg)); font-size: 14px; font-weight: 500; transition: background-color .18s ease, transform .18s ease; }
.domains a:hover { background: color-mix(in srgb, var(--tone) 16%, var(--vp-c-bg)); transform: translateY(-2px); }
.domains i { width: 8px; height: 8px; border-radius: 50%; background: var(--tone); }
.domains b { color: var(--tone); font: 700 13px/1 var(--vp-font-family-mono); }

.block { margin-top: 80px; scroll-margin-top: 88px; }

/* Featured projects: tinted panels, screen and story side by side */
.feature { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 40px; align-items: center; padding: 36px; border: 1px solid color-mix(in srgb, var(--tone) 24%, var(--vp-c-divider)); border-radius: 24px; background: linear-gradient(135deg, color-mix(in srgb, var(--tone) 12%, var(--vp-c-bg)), var(--vp-c-bg) 60%); scroll-margin-top: 88px; }
.feature + .feature { margin-top: 24px; }
.feature.flip .feature-media { order: 2; }
.feature-media { display: block; overflow: hidden; border: 1px solid color-mix(in srgb, var(--tone) 20%, var(--vp-c-divider)); border-radius: 14px; background: #0f1d18; box-shadow: 0 30px 60px -30px color-mix(in srgb, var(--tone) 70%, #000); transition: transform .35s cubic-bezier(.2, .8, .2, 1); }
.feature:hover .feature-media { transform: translateY(-4px) rotate(-.6deg); }
.feature-media img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: top left; background: #fff; }
.is-phone img { object-fit: contain !important; object-position: center !important; background: #eef2ef !important; }
.meta { display: flex; align-items: center; gap: 12px; color: var(--vp-c-text-2); font-size: 13px; }
.chip { padding: 3px 10px; border-radius: 999px; background: var(--tone); color: #fff; font-size: 12px; font-weight: 600; }
.dark .chip { color: #0b1210; }
.feature h3 { margin-top: 12px !important; font-size: 30px; font-weight: 800; line-height: 1.25; letter-spacing: -.01em; }
.feature h3 a:hover { color: var(--tone); }
.subtitle { margin-top: 6px !important; color: var(--vp-c-text-2); font-size: 15px; }
.business { margin-top: 14px !important; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.85; }
.scope { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px !important; }
.scope li { padding: 3px 10px; border: 1px solid color-mix(in srgb, var(--tone) 28%, var(--vp-c-divider)); border-radius: 8px; background: var(--vp-c-bg); font-size: 13px; line-height: 1.7; }
.evidence { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px !important; }
.evidence div { min-width: 0; padding: 12px 14px; border-radius: 12px; background: color-mix(in srgb, var(--tone) 10%, var(--vp-c-bg)); }
.evidence dd { margin: 0; color: var(--tone); font: 800 18px/1.3 var(--vp-font-family-mono); overflow-wrap: anywhere; }
.evidence dt { margin-top: 4px; color: var(--vp-c-text-2); font-size: 12px; }
.feature-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; margin-top: 18px; }
.stack-line { color: var(--vp-c-text-3); font: 12.5px/1.6 var(--vp-font-family-mono); }
.feature-link { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 10px; background: var(--vp-c-text-1); color: var(--vp-c-bg) !important; font-size: 14px; font-weight: 600; transition: transform .18s ease; }
.feature-link:hover { transform: translateX(2px); }

/* More projects: grouped cards */
.domain { scroll-margin-top: 88px; }
.domain + .domain { margin-top: 36px; }
.domain-title { display: flex; align-items: center; gap: 10px; margin-bottom: 14px !important; font-size: 18px; font-weight: 700; }
.domain-title i { width: 12px; height: 12px; border-radius: 4px; background: var(--tone); box-shadow: 0 0 0 4px color-mix(in srgb, var(--tone) 18%, transparent); }
.domain-title small { color: var(--vp-c-text-3); font-size: 13px; font-weight: 400; }
.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.card { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 20px 20px 18px; border: 1px solid var(--vp-c-divider); border-top: 3px solid var(--tone); border-radius: 16px; background: var(--vp-c-bg); transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.card:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--tone) 45%, var(--vp-c-divider)); box-shadow: 0 20px 40px -24px color-mix(in srgb, var(--tone) 60%, #000); }
.card-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.card-top strong { font-size: 17px; font-weight: 700; }
.card-top small { flex: none; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--tone) 12%, transparent); color: var(--tone); font-size: 11px; font-weight: 600; }
.card-summary { color: var(--vp-c-text-2); font-size: 14px; line-height: 1.7; }
.card-scope { color: var(--vp-c-text-3); font-size: 12.5px; line-height: 1.6; }
.card-evidence { display: flex; align-items: baseline; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px dashed var(--vp-c-divider); color: var(--vp-c-text-2); font-size: 12px; }
.card-evidence b { color: var(--tone); font: 800 16px/1.3 var(--vp-font-family-mono); }
.card-arrow { margin-left: auto; align-self: center; color: var(--vp-c-text-3); transition: transform .2s ease, color .2s ease; }
.card:hover .card-arrow { color: var(--tone); transform: translateX(3px); }

/* Strengths */
.strengths { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.strength { padding: 24px; border: 1px solid color-mix(in srgb, var(--tone) 22%, var(--vp-c-divider)); border-radius: 18px; background: linear-gradient(160deg, color-mix(in srgb, var(--tone) 10%, var(--vp-c-bg)), var(--vp-c-bg) 60%); }
.strength-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; background: var(--tone); color: #fff; box-shadow: 0 10px 24px -10px var(--tone); }
.dark .strength-icon { color: #0b1210; }
.strength h3 { margin-top: 16px !important; font-size: 17px; font-weight: 700; }
.strength p { margin-top: 8px !important; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.85; }
.stack { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 16px !important; padding: 20px 24px; border-radius: 18px; background: var(--vp-c-bg-soft); }
.stack dt { color: var(--vp-c-text-2); font-size: 12px; font-weight: 600; }
.stack dd { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; }
.stack dd span { padding: 2px 9px; border-radius: 6px; background: var(--vp-c-bg); font: 12.5px/1.7 var(--vp-font-family-mono); }

.topics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.topics a { display: grid; gap: 6px; padding: 20px 22px; border-radius: 16px; background: var(--vp-c-bg-soft); transition: background-color .2s ease, transform .2s ease; }
.topics a:hover { background: var(--vp-c-brand-soft); transform: translateY(-3px); }
.topics strong { display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: 700; }
.topics span { color: var(--vp-c-text-2); font-size: 13px; line-height: 1.6; }

@media (max-width: 1080px) {
  .feature { grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 24px; }
  .feature.flip .feature-media { order: 0; }
  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .strengths { grid-template-columns: minmax(0, 1fr); }
  .stack, .topics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .profile { width: calc(100% - 32px); }
  .domains { padding: 14px; gap: 8px; }
  .domains-label { width: 100%; }
  .block { margin-top: 56px; }
  .feature { padding: 16px; border-radius: 18px; }
  .feature h3 { font-size: 24px; }
  .evidence { grid-template-columns: minmax(0, 1fr); }
  .evidence div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .evidence dt { margin: 0; text-align: right; }
  .cards, .stack, .topics { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .profile *, .profile *::before { transition: none !important; }
}
</style>
