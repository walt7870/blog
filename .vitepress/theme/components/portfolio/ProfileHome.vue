<script setup lang="ts">
import { withBase } from 'vitepress';
import { ArrowUpRight, ArrowRight, Layers3, BriefcaseBusiness, NotebookText, GitFork, Mail, Video } from '@lucide/vue';
import { projects } from './projects';
import { projectMedia } from './media';
import './profile.css';

defineProps<{ showKnowledge?: boolean; contactEmail?: string }>();
const topics = [
  { title: 'AI 工程', description: '模型接入、Agent、RAG 与语音工程', path: '/docs/ai/' },
  { title: '架构设计', description: '领域建模、服务边界与系统演进', path: '/docs/design/architecture/' },
  { title: '容器与部署', description: 'Docker、Kubernetes 与运行维护', path: '/docs/container/' },
  { title: '工程工具', description: 'Git、CI 与交付实践', path: '/docs/tools/git/' },
];
const selected = ['amphion-cloud', 'speech-sdk', 'gitlab-platform'].map(id => projects.find(p => p.id === id)!);
</script>

<template>
  <main class="profile-home">
    <header class="profile-intro">
      <p class="profile-role"><span>技术管理</span><span class="profile-role-divider" aria-hidden="true">/</span><span>全栈工程</span></p>
      <h1>牛万成</h1>
      <p class="profile-summary">10 年以上软件研发经验，兼具团队管理、系统架构与全栈开发能力。曾带领后端团队推进营销云的微服务和云原生改造，项目经历覆盖智慧安防、AI 平台与跨端应用。围绕业务目标制定技术方案，统筹研发协作并深入核心实现，推动产品从方案设计走向稳定运行与持续演进。</p>
      <a class="profile-primary" :href="withBase('/projects/')">查看项目实践 <ArrowRight :size="19" /></a>
      <nav class="profile-contact" aria-label="联系与作品平台">
        <a href="https://github.com/walt7870" target="_blank" rel="noopener noreferrer"><GitFork :size="17" aria-hidden="true" /><span>GitHub</span><ArrowUpRight :size="14" aria-hidden="true" /></a>
        <a href="https://space.bilibili.com/181407346" target="_blank" rel="noopener noreferrer"><Video :size="17" aria-hidden="true" /><span>B站 · 技术视频</span><ArrowUpRight :size="14" aria-hidden="true" /></a>
        <a v-if="contactEmail" :href="`mailto:${contactEmail}`"><Mail :size="17" aria-hidden="true" /><span>{{ contactEmail }}</span></a>
      </nav>
    </header>

    <section class="profile-experience" aria-labelledby="profile-directions">
      <h2 id="profile-directions"><Layers3 :size="21" aria-hidden="true" />主要经历与能力</h2>
      <dl>
        <div><dt>技术管理与系统架构</dt><dd>在思为科技承担后端负责人、架构设计与团队管理工作，围绕营销云业务划分服务边界，推进微服务与云原生改造。结合网关、客户体系、业务事件和报表等核心能力建设，协调团队实施与系统演进；在近期项目中建设代码治理、持续集成与发布流程。</dd></div>
        <div><dt>全栈开发与产品建设</dt><dd>项目实践覆盖前端工作台、后端服务、数据与消息链路，以及桌面和移动端适配。从营销云、智慧安防到会议工作台与语音应用，将业务流程转化为产品功能，处理权限、状态一致性、数据恢复和跨端交互等贯穿系统的问题。</dd></div>
        <div><dt>AI 应用与工程化</dt><dd>在科大讯飞参与行业 AI 方案与私有化项目，近期实践延伸至 AI 能力云平台、语音 SDK 和模型服务。围绕实时语音、异步任务、模型调度与授权计量设计工程链路，连接模型能力、业务系统和不同运行环境，推进 AI 应用的产品化落地。</dd></div>
      </dl>
      <dl class="profile-stack"><div><dt>服务端</dt><dd>Java / Spring Cloud · Go / Rust</dd></div><div><dt>前端与跨端</dt><dd>Vue / TypeScript · 跨端应用</dd></div><div><dt>数据</dt><dd>MySQL / PostgreSQL / Redis</dd></div><div><dt>工程平台</dt><dd>Docker / Kubernetes / GitLab CI</dd></div></dl>
    </section>

    <section class="profile-selected" aria-labelledby="profile-selected-title">
      <div class="profile-section-title"><h2 id="profile-selected-title"><BriefcaseBusiness :size="21" aria-hidden="true" />代表项目</h2><a :href="withBase('/projects/')">全部项目 <ArrowUpRight :size="17" /></a></div>
      <a v-for="p in selected" :key="p.id" :href="withBase(`/projects/${p.id}`)" class="profile-project" :data-category="p.category">
        <img :src="withBase(`/projects/screenshots/${projectMedia[p.id][0].id}.webp`)" :alt="projectMedia[p.id][0].label" width="240" height="150" />
        <div><span class="profile-category">{{ p.category }}</span><h3>{{ p.title }}</h3><p>{{ p.summary }}</p></div>
        <ArrowUpRight :size="21" />
      </a>
    </section>
    <section v-if="showKnowledge" class="profile-knowledge" aria-labelledby="profile-knowledge-title">
      <div class="profile-section-title"><h2 id="profile-knowledge-title"><NotebookText :size="21" aria-hidden="true" />技术笔记</h2><a :href="withBase('/notes')">全部专题 <ArrowUpRight :size="17" /></a></div>
      <div class="profile-topic-grid"><a v-for="topic in topics" :key="topic.path" :href="withBase(topic.path)"><h3>{{ topic.title }} <ArrowUpRight :size="16" /></h3><p>{{ topic.description }}</p></a></div>
    </section>
  </main>
</template>
