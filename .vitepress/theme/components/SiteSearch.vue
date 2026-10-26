<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, withBase } from 'vitepress'
import VPNavBarSearchButton from 'vitepress/dist/client/theme-default/components/VPNavBarSearchButton.vue'

// Replaces the default nav search. Pagefind splits its index into chunks and fetches only the ones a
// query touches, so a search downloads a few hundred KB instead of the whole site's text.

interface Hit {
  url: string
  page: string
  section: string
  excerpt: string
}

interface PagefindResult {
  url: string
  excerpt: string
  meta: { title?: string }
  sub_results?: { title: string, url: string, excerpt: string, locations?: number[] }[]
}

interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>
  init(): Promise<void>
  search(query: string): Promise<{ results: { data(): Promise<PagefindResult> }[] } | null>
}

const MAX_RESULTS = 12

const router = useRouter()
const dialog = ref<HTMLDialogElement>()
const input = ref<HTMLInputElement>()
const list = ref<HTMLUListElement>()
const isOpen = ref(false)
const query = ref('')
const hits = ref<Hit[]>([])
const selected = ref(0)
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')

let pagefind: Promise<Pagefind> | null = null
let searchId = 0
let timer: ReturnType<typeof setTimeout> | undefined

function loadPagefind() {
  pagefind ??= (async () => {
    const module: Pagefind = await import(/* @vite-ignore */ withBase('/assets/pagefind/pagefind.js'))
    await module.options({ baseUrl: withBase('/'), excerptLength: 36 })
    await module.init()
    return module
  })()
  // A failed load is not cached, so the retry button can try again.
  pagefind.catch(() => { pagefind = null })
  return pagefind
}

async function open() {
  if (isOpen.value) return
  isOpen.value = true
  document.body.classList.add('site-search-open')
  await nextTick()
  dialog.value?.showModal()
  input.value?.focus()
  input.value?.select()
  if (query.value.trim()) runSearch()
  else loadPagefind().catch(() => {})
}

function close() {
  if (!isOpen.value) return
  dialog.value?.close()
}

function onClosed() {
  isOpen.value = false
  document.body.classList.remove('site-search-open')
}

async function runSearch() {
  const text = query.value.trim()
  const id = ++searchId
  if (!text) {
    hits.value = []
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  try {
    const engine = await loadPagefind()
    const found = await engine.search(text)
    const pages = await Promise.all((found?.results ?? []).slice(0, MAX_RESULTS).map(result => result.data()))
    if (id !== searchId) return
    hits.value = pages.map(toHit)
    selected.value = 0
    status.value = 'done'
    list.value?.scrollTo({ top: 0 })
  } catch {
    if (id === searchId) status.value = 'error'
  }
}

// Point each page at the section with the most matches, so the link lands next to the text that matched.
function toHit(page: PagefindResult): Hit {
  const title = clean(page.meta.title) || page.url
  const best = (page.sub_results ?? [])
    .filter(sub => sub.url !== page.url)
    .reduce<NonNullable<PagefindResult['sub_results']>[number] | undefined>(
      (top, sub) => (sub.locations?.length ?? 0) > (top?.locations?.length ?? 0) ? sub : top,
      undefined,
    )
  return {
    url: best?.url ?? page.url,
    page: title,
    section: best && clean(best.title) !== title ? clean(best.title) : '',
    excerpt: best?.excerpt || page.excerpt,
  }
}

// Heading anchors leave a zero-width space in section titles.
function clean(text = '') {
  return text.replace(/\u200b/g, '').trim()
}

watch(query, () => {
  clearTimeout(timer)
  timer = setTimeout(runSearch, 150)
})

function move(step: number) {
  if (!hits.value.length) return
  selected.value = (selected.value + step + hits.value.length) % hits.value.length
  nextTick(() => list.value?.querySelector('.selected')?.scrollIntoView({ block: 'nearest' }))
}

function go(hit?: Hit) {
  if (!hit) return
  close()
  router.go(hit.url)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
  else if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); go(hits.value[selected.value]) }
  // A search field clears itself on Escape instead of letting the dialog close.
  else if (event.key === 'Escape') { event.preventDefault(); close() }
}

function isEditing(target: EventTarget | null) {
  const element = target as HTMLElement | null
  return !!element && (element.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(element.tagName))
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    isOpen.value ? close() : open()
  } else if (event.key === '/' && !isOpen.value && !isEditing(event.target)) {
    event.preventDefault()
    open()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  clearTimeout(timer)
  document.body.classList.remove('site-search-open')
})
</script>

<template>
  <div class="VPNavBarSearch">
    <VPNavBarSearchButton
      text="搜索文档"
      aria-label="搜索文档"
      aria-keyshortcuts="/ control+k meta+k"
      @click="open"
      @pointerenter="loadPagefind().catch(() => {})"
      @focus="loadPagefind().catch(() => {})"
    />
    <Teleport to="body">
      <dialog
        v-if="isOpen"
        ref="dialog"
        class="site-search"
        aria-label="搜索文档"
        @close="onClosed"
        @click.self="close"
      >
        <div class="shell">
          <form class="search-bar" role="search" @submit.prevent="go(hits[selected])">
            <button class="back-button" type="button" title="关闭搜索" aria-label="关闭搜索" @click="close">
              <span class="vpi-arrow-left icon" aria-hidden="true" />
            </button>
            <span class="vpi-search icon search-icon" aria-hidden="true" />
            <input
              ref="input"
              v-model="query"
              class="search-input"
              type="search"
              placeholder="搜索文档"
              aria-label="搜索关键词"
              aria-controls="site-search-results"
              :aria-activedescendant="hits.length ? `site-search-hit-${selected}` : undefined"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              enterkeyhint="go"
              maxlength="64"
              @keydown="onKeydown"
            >
            <span class="spinner" :class="{ active: status === 'loading' }" aria-hidden="true" />
            <button
              class="clear-button"
              type="button"
              title="清除查询条件"
              aria-label="清除查询条件"
              :disabled="!query"
              @click="query = ''; input?.focus()"
            >
              <span class="vpi-delete icon" aria-hidden="true" />
            </button>
          </form>

          <p class="sr-only" aria-live="polite">
            {{ status === 'done' ? `找到 ${hits.length} 篇相关文章` : '' }}
          </p>

          <ul v-if="hits.length" id="site-search-results" ref="list" class="results" role="listbox">
            <li
              v-for="(hit, index) in hits"
              :id="`site-search-hit-${index}`"
              :key="hit.url"
              role="option"
              :aria-selected="selected === index"
            >
              <a
                :href="hit.url"
                class="result"
                :class="{ selected: selected === index }"
                @mouseenter="selected = index"
                @click.exact.prevent="go(hit)"
              >
                <span class="titles">
                  <span class="title-icon" aria-hidden="true">#</span>
                  <span class="page">{{ hit.page }}</span>
                  <template v-if="hit.section">
                    <span class="vpi-chevron-right chevron" aria-hidden="true" />
                    <span class="section">{{ hit.section }}</span>
                  </template>
                </span>
                <!-- Pagefind escapes page text and only adds <mark> around matches. -->
                <span class="excerpt" v-html="hit.excerpt" />
              </a>
            </li>
          </ul>

          <div v-else-if="status === 'error'" class="message" role="alert">
            <p>搜索索引没有加载成功，可能是网络中断。</p>
            <button type="button" class="retry" @click="runSearch">重新搜索</button>
          </div>
          <p v-else-if="status === 'done'" class="message">
            没有找到与“<strong>{{ query.trim() }}</strong>”相关的内容，可以换个说法或减少关键词。
          </p>
          <p v-else-if="status === 'idle'" class="message hint">输入关键词，在全部文章中搜索。多个词用空格分开，结果需同时包含。</p>

          <div class="shortcuts" aria-hidden="true">
            <span><kbd><span class="vpi-arrow-up" /></kbd><kbd><span class="vpi-arrow-down" /></kbd>切换</span>
            <span><kbd><span class="vpi-corner-down-left" /></kbd>打开</span>
            <span><kbd>esc</kbd>关闭</span>
          </div>
        </div>
      </dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.site-search {
  position: fixed;
  inset: 0;
  z-index: 100;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-1);
}

.site-search::backdrop {
  background: var(--vp-backdrop-bg-color);
}

.shell {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: min(100vw - 3.75rem, 50rem);
  max-height: min(100vh - 8rem, 50rem);
  margin: 4rem auto;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--vp-local-search-bg, var(--vp-c-bg));
  box-shadow: var(--vp-shadow-4);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0.375rem;
}

.search-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.icon {
  display: block;
  font-size: 1.125rem;
}

.search-icon {
  margin: 0.5rem;
  color: var(--vp-c-text-2);
}

.back-button {
  display: none;
}

.search-bar button {
  padding: 0.5rem;
  color: var(--vp-c-text-2);
}

.search-bar button:not(:disabled):hover {
  color: var(--vp-c-brand-1);
}

.search-bar button:disabled {
  opacity: 0.37;
}

.search-input {
  flex: 1;
  min-width: 0;
  padding: 0.625rem 0.25rem;
  font-size: 1rem;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.spinner {
  visibility: hidden;
  flex: none;
  width: 1rem;
  height: 1rem;
  margin: 0.5rem;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
}

.spinner.active {
  visibility: visible;
  animation: site-search-spin 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spinner.active {
    animation: none;
  }
}

@keyframes site-search-spin {
  to {
    transform: rotate(360deg);
  }
}

.results {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  list-style: none;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  border: 2px solid var(--vp-c-divider);
  border-radius: 0.375rem;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.result.selected {
  border-color: var(--vp-c-brand-1);
}

.titles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.result.selected .titles {
  color: var(--vp-c-brand-1);
}

.title-icon {
  color: var(--vp-c-brand-1);
  opacity: 0.6;
}

.chevron {
  font-size: 0.875rem;
  opacity: 0.5;
}

.section {
  font-weight: 400;
}

.excerpt {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  overflow-wrap: anywhere;
}

.excerpt :deep(mark) {
  padding: 0 0.125rem;
  border-radius: 0.125rem;
  background: var(--vp-local-search-highlight-bg, var(--vp-c-brand-1));
  color: var(--vp-local-search-highlight-text, var(--vp-c-neutral-inverse));
}

.message {
  margin: 0;
  padding: 1rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.6;
  text-align: center;
  color: var(--vp-c-text-2);
}

.message p {
  margin: 0 0 0.75rem;
}

.retry {
  padding: 0.375rem 1rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 0.375rem;
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.retry:hover {
  background: var(--vp-c-brand-soft);
}

.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.shortcuts span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.shortcuts kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.1875rem 0.375rem;
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 0.25rem;
  background: rgba(128, 128, 128, 0.1);
  font-family: inherit;
  font-size: 0.75rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media not all and (min-width: 48rem) {
  .shell {
    width: 100%;
    height: 100%;
    max-height: none;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .back-button {
    display: block;
  }

  .search-icon,
  .shortcuts {
    display: none;
  }
}
</style>

<style>
body.site-search-open {
  overflow: hidden;
}
</style>
