<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { withBase } from 'vitepress'
import { ArrowUpRight, Maximize2, X } from '@lucide/vue'

const selected = ref('全部阶段')
const filters = ['全部阶段', '确认需求', '实现与验证', '发布与改进']
const root = '/docs/design/develop-pattern/'
const stages = [
  {
    phase: '确认需求', title: '还没想清楚要做什么？',
    image: 'increment-slices', alt: '按可用能力切分迭代与增量的对比',
    description: '先交付一个可试用的小功能。例如先导出一个月的 CSV，再根据试用结果决定是否增加 Excel 和定时导出。技术风险大时，先用试验验证瓶颈。',
    links: [['iterative', '迭代与增量'], ['agile', '敏捷与看板'], ['lean', '精益与价值流'], ['spiral', '螺旋与风险验证'], ['waterfall', '瀑布与 V 模型']],
  },
  {
    phase: '实现与验证', title: '目标明确，怎样让代码可信？',
    image: 'agent-swimlane', alt: '工程师与 Agent 在需求、实现、测试和评审中的分工',
    description: '把“不能导出其他账户的账单”变成可执行测试，再手写或交给 Agent 实现。Vibe Coding 适合试想法；进入真实业务后，需要规格、代码评审和验证证据。',
    links: [['engineering-practices', 'TDD、BDD 与契约测试'], ['ai-coding', 'AI 辅助与 Agentic Coding']],
  },
  {
    phase: '发布与改进', title: '功能做完，怎样交付给用户？',
    image: 'devops-release', alt: '制品构建、灰度发布、运行观测与恢复流程',
    description: '先给少量用户开放导出，观察失败率、文件权限和数据库压力。发现异常先停止放量，恢复服务，再把问题变成下一轮测试和改进任务。',
    links: [['devops', 'DevOps 与持续交付'], ['selection-practice', '方法选型与组合实践']],
  },
]
const visible = computed(() => stages.filter(s => selected.value === '全部阶段' || s.phase === selected.value))
const modal = ref<HTMLDialogElement>()
const enlarged = ref<(typeof stages)[number]>()
async function enlarge(stage: (typeof stages)[number]) {
  enlarged.value = stage
  await nextTick()
  modal.value?.showModal()
}
</script>

<template>
  <div class="method-explorer">
    <div class="method-filters" role="group" aria-label="按开发阶段筛选">
      <button v-for="filter in filters" :key="filter" type="button" :aria-pressed="selected === filter" @click="selected = filter">{{ filter }}</button>
    </div>
    <p class="method-count" aria-live="polite">{{ selected }} · {{ visible.length }} 个场景</p>
    <TransitionGroup name="method-result" tag="div" class="method-list">
      <article v-for="stage in visible" :key="stage.phase" class="method-case" :data-phase="stage.phase">
        <button type="button" class="method-image" :aria-label="`放大${stage.alt}`" :title="`放大${stage.alt}`" @click="enlarge(stage)">
          <img :src="withBase(`/develop-method/${stage.image}.svg`)" :alt="stage.alt" width="1200" height="720" loading="lazy" />
          <Maximize2 class="method-zoom" :size="18" aria-hidden="true" />
        </button>
        <div class="method-body">
          <span class="method-phase">{{ stage.phase }}</span>
          <h3>{{ stage.title }}</h3>
          <p>{{ stage.description }}</p>
          <div class="method-links">
            <a v-for="[path, label] in stage.links" :key="path" :href="withBase(`${root}${path}.html`)">{{ label }}<ArrowUpRight :size="14" aria-hidden="true" /></a>
          </div>
        </div>
      </article>
    </TransitionGroup>
    <dialog ref="modal" class="method-dialog" aria-labelledby="method-diagram-title" @click="($event.target === modal) && modal?.close()">
      <header><span id="method-diagram-title">{{ enlarged?.alt }}</span><button type="button" aria-label="关闭流程图预览" title="关闭" @click="modal?.close()"><X :size="20" /></button></header>
      <div class="method-diagram-scroll" tabindex="0" aria-label="流程图查看器"><img v-if="enlarged" :src="withBase(`/develop-method/${enlarged.image}.svg`)" :alt="enlarged.alt" /></div>
    </dialog>
  </div>
</template>

<style scoped>
.method-explorer { margin: 24px 0; }
.method-filters { display: flex; flex-wrap: wrap; gap: 8px; }
.method-filters button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 6px; font: inherit; font-size: 14px; cursor: pointer; transition: background .18s, color .18s; }
.method-filters button[aria-pressed="true"] { color: var(--vp-c-bg); background: var(--vp-c-text-1); border-color: var(--vp-c-text-1); }
.method-count { color: var(--vp-c-text-2); font-size: 13px; }
.method-list { display: grid; gap: 20px; }
.method-case { display: grid; grid-template-columns: minmax(0, 1fr); border: 1px solid var(--vp-c-divider); border-radius: 8px; overflow: hidden; min-width: 0; }
.method-image { position: relative; display: flex; align-items: center; background: #f5f7fa; aspect-ratio: 2.1; padding: 12px; width: 100%; min-width: 0; border: 0; cursor: zoom-in; }
.method-zoom { position: absolute; bottom: 10px; right: 10px; color: #46576b; background: #fff; box-sizing: content-box; padding: 6px; border-radius: 4px; }
.method-explorer .method-image img { width: 100%; height: 100%; object-fit: contain; border: 0; border-radius: 0; padding: 0; box-shadow: none; background: transparent; }
.method-body { padding: 20px; }
.method-phase { color: var(--vp-c-brand-1); font-size: 12px; font-weight: 600; }
.method-case[data-phase="实现与验证"] .method-phase { color: #356fa3; }
.method-case[data-phase="发布与改进"] .method-phase { color: #a14e43; }
.method-body h3 { margin: 8px 0 10px; font-size: 19px; line-height: 1.5; letter-spacing: 0; }
.method-body p { margin: 0; color: var(--vp-c-text-2); font-size: 14px; line-height: 1.8; }
.method-links { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 14px; }
.method-links a { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-size: 13px; text-decoration: none; }
.method-explorer a:focus-visible, .method-explorer button:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: -3px; }
.method-dialog { width: min(1200px, 94vw); max-width: 94vw; max-height: 90vh; margin: auto; padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 8px; color: var(--vp-c-text-1); background: var(--vp-c-bg); }
.method-dialog::backdrop { background: #101820bb; }
.method-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; font-size: 14px; }
.method-dialog header button { display: grid; place-items: center; flex: none; width: 44px; height: 44px; cursor: pointer; }
.method-diagram-scroll { overflow: auto; max-height: 72vh; background: #f5f7fa; }
.method-explorer .method-diagram-scroll img { display: block; width: 100%; min-width: 860px; max-width: none; height: auto; border: 0; border-radius: 0; padding: 0; box-shadow: none; }
.method-result-enter-active { animation: method-in .24s ease-out; }
@keyframes method-in { from { opacity: .35; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (min-width: 1280px) {
  .method-case { grid-template-columns: minmax(0, 38%) minmax(0, 1fr); }
  .method-image { aspect-ratio: auto; }
}
@media (prefers-reduced-motion: no-preference) {
  .method-filters { animation: method-in .3s ease-out; }
}
@media (prefers-reduced-motion: reduce) {
  .method-result-enter-active { animation: none; }
  .method-filters button { transition: none; }
}
.dark .method-case[data-phase="实现与验证"] .method-phase { color: #8dbbe5; }
.dark .method-case[data-phase="发布与改进"] .method-phase { color: #e79c8d; }
</style>
