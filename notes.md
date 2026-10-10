---
title: 技术专题
layout: page
sidebar: false
outline: false
---

<script setup>
import { withBase } from 'vitepress'
import { ArrowUpRight, AudioLines, Braces, Server, Wrench } from '@lucide/vue'
import { topicGroups as groups } from './.vitepress/topics'

const icons = { development: Braces, 'ai-audio': AudioLines, 'systems-data': Server, tools: Wrench }
const featured = [
  ['流式语音技术实践', '分段、角色归属、模型调度与离线运行', '/docs/ai/speech-engineering/'],
  ['VAD 语音活动检测', '连续音频切分、状态与阈值调节', '/docs/basic/acoustics/vad/'],
  ['sherpa-onnx 端侧推理', '运行对象、识别模式与模型选型', '/docs/basic/acoustics/sherpa-onnx/'],
  ['GitLab CI/CD', 'Runner 权限、制品发布与故障回滚', '/docs/tools/git/gitlab-cicd'],
]
</script>

<main class="topic-directory">
  <header><h1>技术专题</h1><p>围绕系统开发、AI 工程和运行维护积累的技术笔记。</p></header>
  <nav class="topic-directory-jumps" aria-label="专题分类"><a v-for="group in groups" :key="group.id" :href="`#${group.id}`">{{ group.title }}</a></nav>
  <section id="featured">
    <h2>工程实践专题</h2>
    <div class="topic-directory-links"><a v-for="[title, description, path] in featured" :key="path" :href="withBase(path)"><div><h3>{{ title }}</h3><p>{{ description }}</p></div><ArrowUpRight :size="18" aria-hidden="true" /></a></div>
  </section>
  <section v-for="group in groups" :id="group.id" :key="group.title">
    <h2><component :is="icons[group.id]" :size="21" aria-hidden="true" />{{ group.title }}</h2>
    <div class="topic-directory-links"><a v-for="topic in group.topics" :key="topic.link" :href="withBase(topic.link)"><div><h3>{{ topic.text }}</h3><p>{{ topic.description }}</p></div><ArrowUpRight :size="18" aria-hidden="true" /></a></div>
  </section>
  <footer><a :href="withBase('/docs/reading/')">阅读笔记 <ArrowUpRight :size="16" /></a><a href="https://niuwancheng.cn/knology-news/">每日资讯 <ArrowUpRight :size="16" /></a></footer>
</main>

<style>
.topic-directory-jumps{display:flex;flex-wrap:wrap;gap:12px 24px;margin-top:20px}.topic-directory-jumps a{font-size:14px;color:var(--vp-c-text-2);padding:6px 0;border-bottom:1px solid var(--vp-c-divider)}.topic-directory-jumps a:hover{color:var(--vp-c-brand-1)}.topic-directory section{scroll-margin-top:88px}.topic-directory a:focus-visible{outline:2px solid var(--vp-c-brand-1);outline-offset:4px}.topic-directory footer{flex-wrap:wrap}
.topic-directory{max-width:1120px;margin:auto;padding:48px 40px 64px;color:var(--vp-c-text-1);letter-spacing:0}.topic-directory header{border-top:3px solid #23674e;padding-top:24px}.topic-directory h1{font-size:32px;font-weight:650;line-height:1.4;margin:0}.topic-directory p{color:var(--vp-c-text-2);font-size:14px;line-height:1.8;margin:8px 0 0}.topic-directory section{margin-top:36px;border-top:1px solid var(--vp-c-divider);padding-top:22px}.topic-directory h2{display:flex;align-items:center;gap:10px;font-size:21px;font-weight:600;margin:0}.topic-directory h2>svg{color:#23674e;flex:none}.topic-directory-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin-top:12px}.topic-directory-links>a{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 0;border-bottom:1px solid var(--vp-c-divider);text-decoration:none}.topic-directory h3{font-size:16px;font-weight:550;margin:0}.topic-directory-links>a>svg{flex:none;color:#23674e}.topic-directory-links>a:hover h3{color:#23674e}.topic-directory footer{display:flex;gap:28px;margin-top:36px}.topic-directory footer a{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--vp-c-text-2)}.dark .topic-directory h2>svg,.dark .topic-directory-links>a>svg,.dark .topic-directory-links>a:hover h3{color:#91cfaf}.dark .topic-directory header{border-color:#91cfaf}@media(max-width:760px){.topic-directory{padding:28px 24px 48px}.topic-directory h1{font-size:28px}.topic-directory-links{grid-template-columns:1fr}.topic-directory section{margin-top:28px}}
</style>
