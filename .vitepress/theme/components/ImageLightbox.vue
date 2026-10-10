<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const isOpen = ref(false)
const imageSrc = ref('')
const imageAlt = ref('')

let cleanupImages: (() => void) | null = null

function closeLightbox() {
  isOpen.value = false
  imageSrc.value = ''
  imageAlt.value = ''
  document.body.classList.remove('image-lightbox-open')
}

function openLightbox(img: HTMLImageElement) {
  imageSrc.value = img.currentSrc || img.src
  imageAlt.value = img.alt || '图片预览'
  isOpen.value = true
  document.body.classList.add('image-lightbox-open')
}

function bindImages() {
  cleanupImages?.()
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('.vp-doc img'))
    .filter((img) => !img.closest('a'))

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

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isOpen.value) closeLightbox()
}

onMounted(() => {
  nextTick(bindImages)
  document.addEventListener('keydown', onDocumentKeydown)
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
  document.removeEventListener('keydown', onDocumentKeydown)
  document.body.classList.remove('image-lightbox-open')
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="image-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="imageAlt"
      @click.self="closeLightbox"
    >
      <button class="image-lightbox-close" type="button" aria-label="关闭图片预览" @click="closeLightbox">
        ×
      </button>
      <figure class="image-lightbox-frame">
        <img :src="imageSrc" :alt="imageAlt" />
        <figcaption v-if="imageAlt">{{ imageAlt }}</figcaption>
      </figure>
    </div>
  </Teleport>
</template>
