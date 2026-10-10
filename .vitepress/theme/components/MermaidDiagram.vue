<template>
  <figure class="mermaid-diagram">
    <div v-if="error" class="mermaid-diagram__error">
      <p>流程图渲染失败，以下是原始 Mermaid 内容。</p>
      <pre>{{ source }}</pre>
    </div>
    <div v-else-if="svg" class="mermaid-diagram__canvas" v-html="svg"></div>
    <div v-else class="mermaid-diagram__loading">流程图加载中…</div>
  </figure>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  code: string
}>()

const svg = ref('')
const error = ref<Error | null>(null)

const source = computed(() => decodeBase64(props.code))

onMounted(async () => {
  try {
    const mermaidModule = await import('mermaid')
    const mermaid = mermaidModule.default
    const isDark = document.documentElement.classList.contains('dark')

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark ? 'dark' : 'default',
    })

    const id = `mermaid-${hashCode(source.value)}-${Date.now()}`
    const rendered = await mermaid.render(id, source.value)
    svg.value = rendered.svg
  } catch (caught) {
    error.value = caught instanceof Error ? caught : new Error(String(caught))
  }
})

function decodeBase64(value: string) {
  const binary = window.atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function hashCode(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}
</script>
