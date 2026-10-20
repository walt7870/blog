<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { Scan, X, ZoomIn } from '@lucide/vue'

const route = useRoute()
const isOpen = ref(false)
const imageSrc = ref('')
const imageAlt = ref('')
const originalSize = ref(false)
const imageWidth = ref(0)
const dialog = ref<HTMLDialogElement>()
const svgWidths = new Map<string, number>()
let imageRequest: AbortController | null = null

let cleanupImages: (() => void) | null = null

function closeLightbox() {
  imageRequest?.abort()
  imageRequest = null
  dialog.value?.close()
  isOpen.value = false
  imageSrc.value = ''
  imageAlt.value = ''
  document.body.classList.remove('image-lightbox-open')
}

async function openLightbox(img: HTMLImageElement) {
  imageRequest?.abort()
  originalSize.value = false
  imageWidth.value = img.naturalWidth
  imageSrc.value = img.currentSrc || img.src
  imageAlt.value = img.alt || '图片预览'
  isOpen.value = true
  document.body.classList.add('image-lightbox-open')
  await nextTick()
  if (!isOpen.value) return
  dialog.value?.showModal()

  const source = imageSrc.value
  if (!/\.svg(?:[?#]|$)|^data:image\/svg\+xml/i.test(source)) return
  if (svgWidths.has(source)) {
    imageWidth.value = svgWidths.get(source)!
    return
  }
  const request = new AbortController()
  imageRequest = request
  try {
    const response = await fetch(source, { signal: request.signal })
    if (!response.ok) return
    const xml = new DOMParser().parseFromString(await response.text(), 'image/svg+xml')
    const svg = xml.documentElement
    if (svg.localName !== 'svg' || xml.querySelector('parsererror')) return
    const width = svg.getAttribute('width')?.trim() || ''
    const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number)
    // SVG 未声明宽度时，naturalWidth 常为 300，使用画布宽度保留图示比例。
    const intrinsicWidth = /^\d+(?:\.\d+)?(?:px)?$/.test(width)
      ? Number.parseFloat(width)
      : viewBox?.length === 4 ? viewBox[2] : 0
    if (Number.isFinite(intrinsicWidth) && intrinsicWidth > 0) {
      svgWidths.set(source, intrinsicWidth)
      if (!request.signal.aborted && imageSrc.value === source) imageWidth.value = intrinsicWidth
    }
  } catch {
    // 跨域图片可能不允许读取源码，仍可按浏览器报告的尺寸预览。
  } finally {
    if (imageRequest === request) imageRequest = null
  }
}

function bindImages() {
  cleanupImages?.()
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('.vp-doc img'))
    .filter((img) => !img.closest('a, button, dialog'))

  const removers = images.map((img) => {
    img.classList.add('is-zoomable-doc-image')
    img.tabIndex = 0
    img.setAttribute('role', 'button')
    img.setAttribute('title', '点击放大查看')

    const onClick = () => openLightbox(img)
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openLightbox(img)
      }
    }

    img.addEventListener('click', onClick)
    img.addEventListener('keydown', onKeydown)

    return () => {
      img.classList.remove('is-zoomable-doc-image')
      img.removeAttribute('role')
      img.removeAttribute('title')
      img.removeEventListener('click', onClick)
      img.removeEventListener('keydown', onKeydown)
    }
  })

  cleanupImages = () => {
    removers.forEach((remove) => remove())
    cleanupImages = null
  }
}

onMounted(() => {
  nextTick(bindImages)
})

watch(
  () => route.path,
  () => {
    closeLightbox()
    nextTick(bindImages)
  },
)

onBeforeUnmount(() => {
  cleanupImages?.()
  closeLightbox()
})
</script>

<template>
  <Teleport to="body">
    <dialog
      v-if="isOpen"
      ref="dialog"
      class="image-lightbox"
      :aria-label="imageAlt"
      @click.self="closeLightbox"
      @cancel.prevent="closeLightbox"
    >
      <button class="image-lightbox-close" type="button" aria-label="关闭图片预览" @click="closeLightbox">
        <X :size="22" />
      </button>
      <button class="image-lightbox-size" type="button" :aria-label="originalSize ? '适应屏幕' : '原尺寸查看'" :title="originalSize ? '适应屏幕' : '原尺寸查看'" :aria-pressed="originalSize" @click="originalSize = !originalSize">
        <Scan v-if="originalSize" :size="22" />
        <ZoomIn v-else :size="22" />
      </button>
      <figure class="image-lightbox-frame" :class="{ 'is-original-size': originalSize }">
        <img :src="imageSrc" :alt="imageAlt" :style="originalSize ? { width: `${imageWidth}px` } : undefined" />
        <figcaption v-if="imageAlt">{{ imageAlt }}</figcaption>
      </figure>
    </dialog>
  </Teleport>
</template>

<style scoped>
.image-lightbox {
  width: 100vw;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
}
.image-lightbox-size {
  position: fixed;
  top: 18px;
  right: 76px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid #ffffff66;
  border-radius: 6px;
  color: white;
  background: #17212dcc;
}
.image-lightbox-frame.is-original-size {
  display: block;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 130px);
  overflow: auto;
  overscroll-behavior: contain;
}
.image-lightbox-frame.is-original-size img {
  box-sizing: content-box;
  padding: 0;
  max-width: none;
  max-height: none;
  flex: none;
}
.image-lightbox-frame.is-original-size figcaption {
  display: none;
}
</style>
