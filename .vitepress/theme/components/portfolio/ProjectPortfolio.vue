<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { withBase } from 'vitepress';
import { ArrowUpRight, ArrowLeft, ArrowRight, Search, X, LayoutGrid, List, Link, Maximize2, Check, RotateCcw, ZoomIn, ZoomOut, Scan } from '@lucide/vue';
import { categories, projects } from './projects';
import { caseStudies } from './caseStudies';
import { projectMedia } from './media';
import './portfolio.css';
import './portfolio-browser.css';
import './portfolio-refresh.css';

const props = defineProps<{ projectId?: string; profilePath?: string }>();
const category = ref('全部项目');
const query = ref('');
const view = ref('list');
const project = computed(() => projects.find(p => p.id === props.projectId));
const relatedProjects = computed(() => projects.filter(p => p.id !== project.value?.id)
  .sort((a, b) => Number(b.category === project.value?.category) - Number(a.category === project.value?.category)).slice(0, 3));
const study = computed(() => props.projectId ? caseStudies[props.projectId] : undefined);
const architectureTab = ref(0);
const mediaTab = ref(0);
const media = computed(() => projectMedia[props.projectId || ''] || []);
const selectedMedia = computed(() => media.value[mediaTab.value]);
const zoom = ref(1);
const viewer = ref<HTMLElement>();
const imageSize = ref({ width: 1, height: 1 });
const fittedWidth = ref(1);
const viewportSize = ref({ width: 1, height: 1 });
const dragging = ref(false);
let dragOrigin: { x: number; y: number; left: number; top: number } | undefined;
const stageSize = computed(() => ({ width: Math.max(viewportSize.value.width, fittedWidth.value * zoom.value), height: Math.max(viewportSize.value.height, fittedWidth.value * zoom.value * imageSize.value.height / imageSize.value.width) }));
function fitImage(event?: Event) {
  const img = event?.target as HTMLImageElement | undefined;
  if (img?.naturalWidth) imageSize.value = { width: img.naturalWidth, height: img.naturalHeight };
  if (!viewer.value) return;
  viewportSize.value = { width: viewer.value.clientWidth, height: viewer.value.clientHeight };
  fittedWidth.value = Math.min(imageSize.value.width, viewportSize.value.width, viewportSize.value.height * imageSize.value.width / imageSize.value.height);
  zoom.value = 1;
  viewer.value.scrollTo(0, 0);
}
async function setZoom(value: number) {
  if (!viewer.value) return;
  const center = { x: (viewer.value.scrollLeft + viewer.value.clientWidth / 2) / stageSize.value.width, y: (viewer.value.scrollTop + viewer.value.clientHeight / 2) / stageSize.value.height };
  zoom.value = Math.min(Math.max(1, imageSize.value.width / fittedWidth.value, 4), Math.max(1, value));
  await nextTick();
  viewer.value.scrollTo(center.x * stageSize.value.width - viewer.value.clientWidth / 2, center.y * stageSize.value.height - viewer.value.clientHeight / 2);
}
function startDrag(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || event.button !== 0 || !viewer.value) return;
  event.preventDefault();
  viewer.value.setPointerCapture(event.pointerId);
  dragOrigin = { x: event.clientX, y: event.clientY, left: viewer.value.scrollLeft, top: viewer.value.scrollTop };
  dragging.value = true;
}
function moveDrag(event: PointerEvent) {
  if (!dragOrigin || !viewer.value) return;
  viewer.value.scrollTo(dragOrigin.left + dragOrigin.x - event.clientX, dragOrigin.top + dragOrigin.y - event.clientY);
}
function endDrag() { dragging.value = false; dragOrigin = undefined; }
const diagram = computed(() => study.value?.diagrams[architectureTab.value]);
const diagramImage = (id: string) => withBase(`/projects/diagrams/${id}.svg`);
const enlargedDiagram = ref(false);
const modalImage = computed(() => enlargedDiagram.value && diagram.value ? diagramImage(diagram.value.id) : screenshot(selectedMedia.value?.id || ''));
const filtered = computed(() => projects.filter(p =>
  (category.value === '全部项目' || p.category === category.value) &&
  `${p.title} ${p.subtitle} ${p.summary} ${p.tags.join(' ')} ${p.stack.flat().join(' ')}`.toLowerCase().includes(query.value.trim().toLowerCase())
));
const link = (id: string) => withBase(`/projects/${id}`);
const screenshot = (id: string) => withBase(`/projects/screenshots/${id}.webp`);
const image = (id: string) => screenshot(projectMedia[id]?.[0]?.id || id);
const modal = ref<HTMLDialogElement>();
const copied = ref(false);
const copyError = ref(false);
let copyTimer: ReturnType<typeof setTimeout>;
async function share() {
  try {
    await navigator.clipboard.writeText(window.location.href.split('#')[0]);
    copied.value = true;
    copyError.value = false;
  } catch { copyError.value = true; }
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copied.value = false; copyError.value = false; }, 3000);
}
function reset() { category.value = '全部项目'; query.value = ''; }
watch(() => props.projectId, () => { modal.value?.close(); endDrag(); architectureTab.value = 0; mediaTab.value = 0; });
onBeforeUnmount(() => clearTimeout(copyTimer));
async function enlarge(isDiagram = false) { enlargedDiagram.value = isDiagram === true; zoom.value = 1; endDrag(); await nextTick(); modal.value?.showModal(); await nextTick(); fitImage(); }
</script>

<template>
  <div class="portfolio" :class="{ 'portfolio-detail': project }">
    <a class="pf-skip" href="#portfolio-main">跳到项目内容</a>
    <div v-if="!projectId" id="portfolio-main" class="pf-index">
      <header class="pf-intro">
        <div class="pf-collection-title"><h1>项目实践</h1><a :href="withBase(profilePath || '/')">个人概览 <ArrowUpRight :size="16" /></a></div>
        <p class="pf-collection-summary">AI 应用、云平台与跨端 SDK，从业务场景到系统架构和交付验证。</p>
      </header>
      <section class="pf-browser" aria-label="项目作品">
        <div class="pf-tools">
          <div class="pf-search"><Search :size="17" aria-hidden="true"/><input v-model="query" type="search" aria-label="搜索项目或技术栈" placeholder="搜索项目或技术栈"/><button v-if="query" class="pf-icon" title="清除搜索" aria-label="清除搜索" @click="query = ''"><X :size="16"/></button></div>
          <div class="pf-view" role="group" aria-label="展示方式"><button class="pf-icon" :class="{ active: view === 'grid' }" :aria-pressed="view === 'grid'" title="网格视图" aria-label="网格视图" @click="view = 'grid'"><LayoutGrid :size="18"/></button><button class="pf-icon" :class="{ active: view === 'list' }" :aria-pressed="view === 'list'" title="列表视图" aria-label="列表视图" @click="view = 'list'"><List :size="19"/></button></div>
        </div>
        <div class="pf-filters" role="group" aria-label="项目分类"><button v-for="c in categories" :key="c" :class="{ active: category === c }" :aria-pressed="category === c" @click="category = c">{{ c }}<span>{{ c === '全部项目' ? projects.length : projects.filter(p => p.category === c).length }}</span></button></div>
        <div class="pf-results-line"><span>{{ category === '全部项目' ? '精选与项目实践' : category }}</span><span aria-live="polite">{{ filtered.length }} 个项目</span></div>
        <Transition name="pf-results">
        <div v-if="filtered.length" :key="`${category}:${query}:${view}`" class="pf-grid" :class="{ 'pf-list': view === 'list' }">
          <template v-for="(p, index) in filtered" :key="p.id">
          <div v-if="category === '全部项目' && p.category === '公司基础设施' && filtered[index - 1]?.category !== p.category" class="pf-module-heading"><h2>公司基础设施</h2><p>代码协作 · 持续交付 · 内部 AI 接入</p></div>
          <article class="pf-project" :class="[{ featured: !query && category === '全部项目' && index === 0 && view === 'grid' }, `tone-${p.color}`]">
            <a :href="link(p.id)" class="pf-preview" :aria-label="`查看${p.title}项目详情`"><img :src="image(p.id)" :alt="`${p.title}项目预览`" width="1440" height="900" :loading="index < 2 ? 'eager' : 'lazy'"/><span class="pf-preview-label">{{ index === 0 && category === '全部项目' && !query ? '精选案例' : p.category }}</span><span class="pf-preview-arrow"><ArrowUpRight :size="22"/></span></a>
            <div class="pf-project-info"><div class="pf-project-meta"><span>{{ p.category }}</span><span class="pf-status"><i></i>{{ p.status }}</span></div><h2><a :href="link(p.id)">{{ p.title }}<ArrowUpRight :size="19"/></a></h2><p>{{ p.summary }}</p><div class="pf-tags"><span v-for="tag in p.tags" :key="tag">{{ tag }}</span></div><a v-if="!query && category === '全部项目' && index === 0 && view === 'grid'" :href="link(p.id)" class="pf-feature-link">查看项目实践 <ArrowRight :size="17"/></a></div>
          </article>
          </template>
        </div>
        <div v-else key="empty" class="pf-empty"><Search :size="30"/><h2>没有匹配的项目</h2><p>当前分类下没有找到“{{ query }}”。</p><button @click="reset"><RotateCcw :size="16"/> 重置筛选</button></div>
        </Transition>
      </section>
      <footer class="pf-bottom"><span>牛万成 · 项目实践</span><a :href="withBase('/')">回到稻草小站 <ArrowUpRight :size="16"/></a></footer>
    </div>

    <div v-else-if="project" id="portfolio-main">
      <header class="pf-case-header">
        <div class="pf-case-top"><a :href="withBase('/projects/')"><ArrowLeft :size="17"/> 全部项目</a><button class="pf-share" @click="share"><Check v-if="copied" :size="16"/><Link v-else :size="16"/>{{ copied ? '链接已复制' : '分享项目' }}</button><span v-if="copyError" role="status">请复制浏览器地址分享</span></div>
        <div class="pf-eyebrow">{{ project.category }}<span class="pf-divider">/</span>{{ project.status }}</div>
        <h1>{{ project.title }}</h1><p class="pf-case-subtitle">{{ project.subtitle }}</p>
        <div class="pf-case-tags"><span v-for="tag in project.tags" :key="tag">{{ tag }}</span></div>
      </header>
      <figure v-if="selectedMedia" class="pf-case-visual" :class="[{ 'pf-phone-visual': project.id === 'speech-sdk' }, `tone-${project.color}`]"><button @click="enlarge()" :aria-label="`放大${project.title}预览`"><img :src="screenshot(selectedMedia.id)" :alt="selectedMedia.label"/><span class="pf-zoom"><Maximize2 :size="18"/></span></button><figcaption><span>{{ selectedMedia.label }}</span><span>{{ String(mediaTab + 1).padStart(2, '0') }} / {{ String(media.length).padStart(2, '0') }}</span></figcaption></figure>
      <div v-if="media.length > 1" class="pf-media-rail" role="group" aria-label="项目画面"><button v-for="(item, i) in media" :key="item.id" :class="{ active: mediaTab === i }" :aria-pressed="mediaTab === i" @click="mediaTab = i"><img :src="screenshot(item.id)" :alt="item.label"/><span>{{ item.label }}</span></button></div>
      <div class="pf-case-layout">
        <nav class="pf-case-nav" aria-label="项目详情目录"><span>项目概览</span><a href="#business">核心业务</a><a href="#stack">技术栈</a><a href="#architecture">{{ project.type === 'design' ? '内容与页面结构' : '架构设计' }}</a><a href="#flow">{{ project.type === 'design' ? '设计与维护流程' : '核心流程' }}</a><a href="#decisions">{{ project.type === 'design' ? '设计决策' : '关键设计' }}</a><a href="#results">阶段成果</a></nav>
        <div class="pf-case-content">
          <section id="business"><div class="pf-section-heading"><span>01</span><h2>核心业务</h2></div><p v-for="text in study?.context" :key="text" class="pf-business">{{ text }}</p><dl class="pf-domains"><div v-for="[name, detail] in study?.domains" :key="name"><dt>{{ name }}</dt><dd>{{ detail }}</dd></div></dl></section>
          <section id="stack"><div class="pf-section-heading"><span>02</span><h2>技术栈</h2></div><dl class="pf-stack"><div v-for="[name, value] in project.stack" :key="name"><dt>{{ name }}</dt><dd>{{ value }}</dd></div></dl></section>
          <section id="architecture"><div class="pf-section-heading"><span>03</span><h2>{{ project.type === 'design' ? '信息架构与页面设计' : '系统架构与部署' }}</h2></div><div class="pf-diagram-tabs" role="tablist" aria-label="架构视图"><button v-for="(d, i) in study?.diagrams" :id="`tab-${d.id}`" :key="d.id" role="tab" :aria-selected="architectureTab === i" aria-controls="architecture-panel" :class="{ active: architectureTab === i }" @click="architectureTab = i">{{ d.label }}</button></div><div v-if="diagram" id="architecture-panel" role="tabpanel" :aria-labelledby="`tab-${diagram.id}`"><figure class="pf-topology"><button @click="enlarge(true)" :aria-label="`放大${diagram.label}`"><img :src="diagramImage(diagram.id)" :alt="diagram.label"/><span class="pf-zoom"><Maximize2 :size="18"/></span></button><figcaption>{{ diagram.description }}</figcaption></figure></div><div class="pf-deployment"><div v-for="[name, technology, responsibility] in study?.deployment" :key="name"><h3>{{ name }}</h3><span>{{ technology }}</span><p>{{ responsibility }}</p></div></div></section>
          <section id="flow"><div class="pf-section-heading"><span>04</span><h2>{{ project.type === 'design' ? '内容访问与维护' : '核心业务链路' }}</h2></div><article v-for="scenario in study?.scenarios" :key="scenario.title" class="pf-scenario"><h3>{{ scenario.title }}</h3><p class="pf-path">{{ scenario.path }}</p><p>{{ scenario.detail }}</p></article></section>
          <section id="decisions"><div class="pf-section-heading"><span>05</span><h2>{{ project.type === 'design' ? '设计决策' : '关键机制与取舍' }}</h2></div><article v-for="mechanism in study?.mechanisms" :key="mechanism.title" class="pf-mechanism"><h3>{{ mechanism.title }}</h3><p>{{ mechanism.constraint }}</p><p>{{ mechanism.implementation }}</p><p class="pf-effect">{{ mechanism.effect }}</p></article></section>
          <section id="results"><div class="pf-section-heading"><span>06</span><h2>实践成果与验证</h2></div><div class="pf-evidence"><div v-for="item in study?.evidence" :key="item.label"><strong>{{ item.value }}</strong><h3>{{ item.label }}</h3><p>{{ item.detail }}</p></div></div><ul class="pf-outcomes"><li v-for="r in study?.outcomes" :key="r"><Check :size="18"/>{{ r }}</li></ul></section>
        </div>
      </div>
      <section class="pf-more"><h2>继续浏览</h2><div><a v-for="p in relatedProjects" :key="p.id" :href="link(p.id)"><img :src="image(p.id)" :alt="`${p.title}预览`" width="1440" height="900" loading="lazy"/><span>{{ p.title }}<ArrowUpRight :size="18"/></span></a></div></section>
      <dialog ref="modal" class="pf-lightbox" :class="{ 'pf-diagram-lightbox': enlargedDiagram }" @close="endDrag" @click="($event.target === modal) && modal?.close()">
        <div class="pf-lightbox-head"><span>{{ project.title }} · {{ enlargedDiagram ? diagram?.label : selectedMedia?.label }}</span><div class="pf-viewer-tools">
          <button class="pf-icon" title="缩小" aria-label="缩小" :disabled="zoom <= 1" @click="setZoom(zoom - .25)"><ZoomOut :size="18"/></button><span>{{ Math.round(zoom * 100) }}%</span>
          <button class="pf-icon" title="放大" aria-label="放大" @click="setZoom(zoom + .25)"><ZoomIn :size="18"/></button>
          <button class="pf-icon" title="原始尺寸" aria-label="原始尺寸" @click="setZoom(imageSize.width / fittedWidth)"><Scan :size="18"/></button>
          <button class="pf-icon" title="适应窗口" aria-label="重置缩放" @click="fitImage()"><RotateCcw :size="18"/></button>
          <button class="pf-icon" title="关闭预览" aria-label="关闭预览" @click="modal?.close()"><X :size="22"/></button>
        </div></div>
        <div ref="viewer" class="pf-lightbox-scroll" :class="{ dragging }" tabindex="0" aria-label="项目画面查看器" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag">
          <div class="pf-viewer-stage" :style="{ width: `${stageSize.width}px`, height: `${stageSize.height}px` }"><img :src="modalImage" :style="{ width: `${fittedWidth * zoom}px` }" :alt="`${project.title}放大预览`" draggable="false" @load="fitImage"/></div>
        </div>
        <p>{{ enlargedDiagram ? diagram?.description : selectedMedia?.label }}</p>
      </dialog>
    </div>
    <div v-else class="pf-empty"><h1>项目未找到</h1><a :href="withBase('/projects/')">返回项目作品集</a></div>
  </div>
</template>
