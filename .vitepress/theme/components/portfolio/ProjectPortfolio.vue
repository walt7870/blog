<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { withBase } from 'vitepress';
import { ArrowUpRight, ArrowLeft, ArrowRight, Search, X, LayoutGrid, List, Link, Maximize2, Check, RotateCcw, ZoomIn, ZoomOut, Scan } from '@lucide/vue';
import { categories, projects } from './projects';
import { caseStudies } from './caseStudies';
import { projectMedia } from './media';
import { toneOf } from './tones';
import './portfolio.css';
import './portfolio-browser.css';
import './portfolio-refresh.css';
import './showcase.css';

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
const caseSections = computed(() => {
  const design = project.value?.type === 'design';
  const s = study.value;
  return [
    { id: 'overview', label: '项目速览' },
    { id: 'business', label: '核心业务' },
    s?.modes && { id: 'modes', label: '识别模式' },
    { id: 'stack', label: '技术栈' },
    { id: 'architecture', label: design ? '内容与页面结构' : '架构设计' },
    s?.capacity && { id: 'capacity', label: '热词体系' },
    s?.benchmark && { id: 'benchmark', label: '并发性能' },
    { id: 'flow', label: design ? '设计与维护流程' : '核心流程' },
    { id: 'decisions', label: design ? '设计决策' : '关键机制' },
    s?.delivery && { id: 'delivery', label: '质量与交付' },
    s?.specs && selectedMedia.value && { id: 'tools', label: '调试工具' },
    { id: 'results', label: '阶段成果' },
  ].filter((item): item is { id: string; label: string } => Boolean(item));
});
// Section numbers follow the rendered order, so optional sections keep the sequence continuous.
const sectionNo = (id: string) => String(caseSections.value.findIndex(item => item.id === id)).padStart(2, '0');
const benchmarkMax = computed(() => Math.max(...(study.value?.benchmark?.groups.flatMap(g => g.rows.map(r => r[1])) || [1])));
const barWidth = (value: number) => `${Math.max(2, value / benchmarkMax.value * 100)}%`;
// Highlights the section nearest the top of the viewport in the case navigation.
const activeSection = ref('overview');
let sectionObserver: IntersectionObserver | undefined;
function observeSections() {
  sectionObserver?.disconnect();
  if (!props.projectId || typeof IntersectionObserver === 'undefined') return;
  sectionObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (visible) activeSection.value = visible.target.id;
  }, { rootMargin: '-96px 0px -60% 0px' });
  caseSections.value.forEach(item => { const el = document.getElementById(item.id); if (el) sectionObserver!.observe(el); });
}
onMounted(observeSections);
watch(() => props.projectId, () => { activeSection.value = 'overview'; nextTick(observeSections); });
onBeforeUnmount(() => { clearTimeout(copyTimer); sectionObserver?.disconnect(); });
async function enlarge(isDiagram = false) { enlargedDiagram.value = isDiagram === true; zoom.value = 1; endDrag(); await nextTick(); modal.value?.showModal(); await nextTick(); fitImage(); }
</script>

<template>
  <div class="portfolio" :class="{ 'portfolio-detail': project }">
    <a class="pf-skip" href="#portfolio-main">跳到项目内容</a>
    <div v-if="!projectId" id="portfolio-main" class="pf-index">
      <header class="pf-intro sc-hero sc-bleed">
        <div class="sc-hero-inner sc-single">
          <p class="sc-eyebrow"><span class="sc-pulse" aria-hidden="true"></span>牛万成 · 项目作品集</p>
          <h1 class="sc-title">项目<span>实践</span></h1>
          <p class="sc-lead">AI 应用、云平台与跨端 SDK，从业务场景到系统架构和交付验证。每个案例给出负责范围、关键机制与有范围说明的验证结果。</p>
          <div class="sc-actions">
            <dl class="sc-stats"><div><dd>{{ projects.length }}</dd><dt>个项目案例</dt></div><div><dd>{{ categories.length - 1 }}</dd><dt>个项目领域</dt></div></dl>
            <a class="sc-link pf-profile-link" :href="withBase(profilePath || '/')">个人概览 <ArrowUpRight :size="15" /></a>
          </div>
        </div>
      </header>
      <section class="pf-browser" aria-label="项目作品">
        <div class="pf-toolbar">
        <div class="pf-tools">
          <div class="pf-search"><Search :size="17" aria-hidden="true"/><input v-model="query" type="search" aria-label="搜索项目或技术栈" placeholder="搜索项目或技术栈"/><button v-if="query" class="pf-icon" title="清除搜索" aria-label="清除搜索" @click="query = ''"><X :size="16"/></button></div>
          <div class="pf-view" role="group" aria-label="展示方式"><button class="pf-icon" :class="{ active: view === 'grid' }" :aria-pressed="view === 'grid'" title="网格视图" aria-label="网格视图" @click="view = 'grid'"><LayoutGrid :size="18"/></button><button class="pf-icon" :class="{ active: view === 'list' }" :aria-pressed="view === 'list'" title="列表视图" aria-label="列表视图" @click="view = 'list'"><List :size="19"/></button></div>
        </div>
        <div class="pf-filters" role="group" aria-label="项目分类"><button v-for="c in categories" :key="c" :class="{ active: category === c }" :aria-pressed="category === c" @click="category = c">{{ c }}<span>{{ c === '全部项目' ? projects.length : projects.filter(p => p.category === c).length }}</span></button></div>
        </div>
        <div class="pf-results-line"><span>{{ category === '全部项目' ? '精选与项目实践' : category }}</span><span aria-live="polite">{{ filtered.length }} 个项目</span></div>
        <Transition name="pf-results" mode="out-in">
        <div v-if="filtered.length" :key="`${category}:${query}:${view}`" class="pf-grid" :class="{ 'pf-list': view === 'list' }">
          <template v-for="(p, index) in filtered" :key="p.id">
          <div v-if="category === '全部项目' && p.category === '公司基础设施' && filtered[index - 1]?.category !== p.category" class="pf-module-heading"><h2>公司基础设施</h2><p>代码协作 · 持续交付 · 内部 AI 接入</p></div>
          <article class="pf-project" :data-tone="toneOf(p.category)" :class="[{ featured: !query && category === '全部项目' && index === 0 && view === 'grid' }, `tone-${p.color}`]">
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
      <header class="pf-case-header sc-hero sc-bleed" :data-tone="toneOf(project.category)">
        <div class="sc-hero-inner sc-single" :class="{ 'pf-hero-specs': study?.specs }">
        <div class="pf-case-top"><a :href="withBase('/projects/')"><ArrowLeft :size="17"/> 全部项目</a><button class="pf-share" @click="share"><Check v-if="copied" :size="16"/><Link v-else :size="16"/>{{ copied ? '链接已复制' : '分享项目' }}</button><span v-if="copyError" role="status">请复制浏览器地址分享</span></div>
        <div class="pf-eyebrow">{{ project.category }}<span class="pf-divider">/</span>{{ project.status }}</div>
        <h1 class="sc-title">{{ project.title }}</h1><p class="pf-case-subtitle">{{ project.subtitle }}</p>
        <div class="pf-case-tags"><span v-for="tag in project.tags" :key="tag">{{ tag }}</span></div>
        <dl v-if="study?.specs" class="pf-specs"><div v-for="item in study.specs" :key="item.label"><dd>{{ item.value }}</dd><dt>{{ item.label }}</dt></div></dl>
        </div>
      </header>
      <ol v-if="study?.pipeline" class="pf-pipeline" :data-tone="toneOf(project.category)" aria-label="处理链路"><li v-for="(stage, i) in study.pipeline" :key="stage.name"><span class="pf-pipeline-no">{{ String(i + 1).padStart(2, '0') }}</span><strong>{{ stage.name }}</strong><em>{{ stage.tech }}</em><p>{{ stage.detail }}</p></li></ol>
      <figure v-if="selectedMedia && !study?.specs" class="pf-case-visual" :class="[{ 'pf-phone-visual': project.id === 'speech-sdk' }, `tone-${project.color}`]"><button @click="enlarge()" :aria-label="`放大${project.title}预览`"><img :src="screenshot(selectedMedia.id)" :alt="selectedMedia.label"/><span class="pf-zoom"><Maximize2 :size="18"/></span></button><figcaption><span>{{ selectedMedia.label }}</span><span>{{ String(mediaTab + 1).padStart(2, '0') }} / {{ String(media.length).padStart(2, '0') }}</span></figcaption></figure>
      <div v-if="media.length > 1 && !study?.specs" class="pf-media-rail" role="group" aria-label="项目画面"><button v-for="(item, i) in media" :key="item.id" :class="{ active: mediaTab === i }" :aria-pressed="mediaTab === i" @click="mediaTab = i"><img :src="screenshot(item.id)" :alt="item.label"/><span>{{ item.label }}</span></button></div>
      <section v-if="study" id="overview" class="pf-overview" :data-tone="toneOf(project.category)" aria-labelledby="overview-title">
        <h2 id="overview-title" class="pf-overview-title">项目速览</h2>
        <div class="pf-overview-grid">
          <div class="pf-overview-brief"><span class="pf-overview-label">业务背景</span><p>{{ project.business }}</p></div>
          <div class="pf-overview-scope"><span class="pf-overview-label">负责范围</span><ul><li v-for="s in project.scope" :key="s"><Check :size="15" aria-hidden="true"/>{{ s }}</li></ul></div>
        </div>
        <div v-if="study.evidence.length" class="pf-overview-evidence"><div v-for="item in study.evidence" :key="item.label"><strong>{{ item.value }}</strong><h3>{{ item.label }}</h3><p>{{ item.detail }}</p></div></div>
      </section>
      <div class="pf-case-layout">
        <nav class="pf-case-nav" aria-label="项目详情目录"><span>项目概览</span><a v-for="item in caseSections" :key="item.id" :href="`#${item.id}`" :class="{ active: activeSection === item.id }" :aria-current="activeSection === item.id ? 'location' : undefined">{{ item.label }}</a></nav>
        <div class="pf-case-content">
          <section id="business"><div class="pf-section-heading"><span>{{ sectionNo('business') }}</span><h2>核心业务</h2></div><p v-for="text in study?.context" :key="text" class="pf-business">{{ text }}</p><dl class="pf-domain-cards"><div v-for="([name, detail], i) in study?.domains" :key="name"><dt><b>{{ String(i + 1).padStart(2, '0') }}</b>{{ name }}</dt><dd>{{ detail }}</dd></div></dl></section>
          <section v-if="study?.modes" id="modes"><div class="pf-section-heading"><span>{{ sectionNo('modes') }}</span><h2>识别模式</h2></div><div class="pf-modes"><article v-for="mode in study.modes" :key="mode.name"><header><h3>{{ mode.name }}</h3><span>{{ mode.tag }}</span></header><p class="pf-mode-does">{{ mode.does }}</p><dl><div><dt>实现</dt><dd>{{ mode.how }}</dd></div><div><dt>输出</dt><dd>{{ mode.output }}</dd></div><div class="pf-mode-limit"><dt>边界</dt><dd>{{ mode.limit }}</dd></div></dl></article></div></section>
          <section id="stack"><div class="pf-section-heading"><span>{{ sectionNo('stack') }}</span><h2>技术栈</h2></div><dl class="pf-stack-chips"><div v-for="[name, value] in project.stack" :key="name"><dt>{{ name }}</dt><dd><span v-for="item in value.split(' · ')" :key="item">{{ item }}</span></dd></div></dl></section>
          <section id="architecture"><div class="pf-section-heading"><span>{{ sectionNo('architecture') }}</span><h2>{{ project.type === 'design' ? '信息架构与页面设计' : '系统架构与部署' }}</h2></div><div class="pf-diagram-tabs" role="tablist" aria-label="架构视图"><button v-for="(d, i) in study?.diagrams" :id="`tab-${d.id}`" :key="d.id" role="tab" :aria-selected="architectureTab === i" aria-controls="architecture-panel" :class="{ active: architectureTab === i }" @click="architectureTab = i">{{ d.label }}</button></div><div v-if="diagram" id="architecture-panel" role="tabpanel" :aria-labelledby="`tab-${diagram.id}`"><figure class="pf-topology"><button @click="enlarge(true)" :aria-label="`放大${diagram.label}`"><img :src="diagramImage(diagram.id)" :alt="diagram.label"/><span class="pf-zoom"><Maximize2 :size="18"/></span></button><figcaption>{{ diagram.description }}</figcaption></figure></div><div class="pf-deployment"><div v-for="[name, technology, responsibility] in study?.deployment" :key="name"><h3>{{ name }}</h3><span>{{ technology }}</span><p>{{ responsibility }}</p></div></div></section>
          <section v-if="study?.capacity" id="capacity"><div class="pf-section-heading"><span>{{ sectionNo('capacity') }}</span><h2>热词：{{ study.capacity.title }}</h2></div><p class="pf-business">{{ study.capacity.lead }}</p><dl class="pf-capacity"><div v-for="item in study.capacity.items" :key="item.name"><dd>{{ item.value }}</dd><dt>{{ item.name }}</dt><p>{{ item.detail }}</p></div></dl><p class="pf-note">{{ study.capacity.note }}</p></section>
          <section v-if="study?.benchmark" id="benchmark"><div class="pf-section-heading"><span>{{ sectionNo('benchmark') }}</span><h2>单卡并发：{{ study.benchmark.title }}</h2></div><p class="pf-business">{{ study.benchmark.lead }}</p><figure class="pf-bench"><figcaption class="pf-bench-legend"><span class="is-before">{{ study.benchmark.legend[0] }}</span><span class="is-after">{{ study.benchmark.legend[1] }}</span><span>单位：{{ study.benchmark.unit }}</span></figcaption><div v-for="group in study.benchmark.groups" :key="group.label" class="pf-bench-group"><h3>{{ group.label }}</h3><div v-for="[label, before, after] in group.rows" :key="label" class="pf-bench-row"><span class="pf-bench-label">{{ label }}</span><div class="pf-bench-bars"><div class="is-before"><i :style="{ width: barWidth(before) }"></i><b>{{ before.toFixed(1) }}</b></div><div class="is-after"><i :style="{ width: barWidth(after) }"></i><b>{{ after.toFixed(1) }}</b></div></div><span class="pf-bench-delta">−{{ Math.round((1 - after / before) * 100) }}%</span></div></div></figure><p class="pf-note">{{ study.benchmark.note }}</p></section>
          <section id="flow"><div class="pf-section-heading"><span>{{ sectionNo('flow') }}</span><h2>{{ project.type === 'design' ? '内容访问与维护' : '核心业务链路' }}</h2></div><article v-for="scenario in study?.scenarios" :key="scenario.title" class="pf-scenario-card"><h3>{{ scenario.title }}</h3><ol class="pf-steps" :aria-label="`${scenario.title}步骤`"><li v-for="(step, i) in scenario.path.split(' → ')" :key="step"><b>{{ i + 1 }}</b>{{ step }}</li></ol><p>{{ scenario.detail }}</p></article></section>
          <section id="decisions"><div class="pf-section-heading"><span>{{ sectionNo('decisions') }}</span><h2>{{ project.type === 'design' ? '设计决策' : '关键机制与取舍' }}</h2></div><article v-for="(mechanism, i) in study?.mechanisms" :key="mechanism.title" class="pf-mechanism-card"><h3><b>{{ String(i + 1).padStart(2, '0') }}</b>{{ mechanism.title }}</h3><dl><div class="is-constraint"><dt>约束</dt><dd>{{ mechanism.constraint }}</dd></div><div class="is-implementation"><dt>做法</dt><dd>{{ mechanism.implementation }}</dd></div><div class="is-effect"><dt>效果</dt><dd>{{ mechanism.effect }}</dd></div></dl></article></section>
          <section v-if="study?.delivery" id="delivery"><div class="pf-section-heading"><span>{{ sectionNo('delivery') }}</span><h2>质量与交付</h2></div><p class="pf-business">{{ study.delivery.lead }}</p><ol class="pf-steps pf-delivery-steps" aria-label="迭代交付步骤"><li v-for="([step, detail], i) in study.delivery.steps" :key="step"><b>{{ i + 1 }}</b><span><strong>{{ step }}</strong>{{ detail }}</span></li></ol><div class="pf-overview-evidence pf-quality"><div v-for="item in study.delivery.quality" :key="item.label"><strong>{{ item.value }}</strong><h3>{{ item.label }}</h3><p>{{ item.detail }}</p></div></div><div class="pf-rejected"><h3>试过、验证无效的方向</h3><ul><li v-for="[name, reason] in study.delivery.rejected" :key="name"><X :size="15" aria-hidden="true"/><span><strong>{{ name }}</strong>{{ reason }}</span></li></ul></div></section>
          <section v-if="study?.specs && selectedMedia" id="tools"><div class="pf-section-heading"><span>{{ sectionNo('tools') }}</span><h2>调试工具</h2></div><figure class="pf-case-visual pf-tools-visual"><button @click="enlarge()" :aria-label="`放大${project.title}预览`"><img :src="screenshot(selectedMedia.id)" :alt="selectedMedia.label" loading="lazy"/><span class="pf-zoom"><Maximize2 :size="18"/></span></button><figcaption><span>{{ selectedMedia.label }}</span><span>{{ study.caption }}</span></figcaption></figure></section>
          <section id="results"><div class="pf-section-heading"><span>{{ sectionNo('results') }}</span><h2>阶段成果</h2></div><ul class="pf-outcomes"><li v-for="r in study?.outcomes" :key="r"><Check :size="18"/>{{ r }}</li></ul></section>
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
