<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, withBase } from 'vitepress'

const messages = [
  '别急，先让缓存热一下。',
  '这波先灰度，人生也要可回滚。',
  '需求池里泡一泡，优先级自然沉淀。',
  '今天不卷了，CPU 先降频。',
  '先别上价值，先上监控。',
  '别问进度，问就是链路在打通。',
  '代码会骗人，日志一般比较诚实。',
  '这个锅先别背，等 Trace 出来。',
  '低头写 Bug，抬头造轮子。',
  '老板说简单改改，懂的都懂。',
  '先跑起来，优雅后补票。',
  '线上没事，就是最大的喜报。',
  '这里先埋个点，情绪也要可观测。',
  '今天主打一个低耦合高内聚。',
  '别慌，先把上下文补齐。',
  '先同步认知，再异步推进。',
]

const gameUrl = 'https://niuwancheng.cn/static/files/webfile/games/index.html'

const route = useRoute()
const index = ref(0)
const visible = ref(true)
const motionKey = ref(0)
const warningMessage = ref('')
const locked = ref(false)
const clickTimes: number[] = []
let unlockTimer: ReturnType<typeof setTimeout> | undefined

const message = computed(() => warningMessage.value || messages[index.value])

function randomizeMessage() {
  if (messages.length <= 1) return
  warningMessage.value = ''
  const next = Math.floor(Math.random() * messages.length)
  index.value = next === index.value ? (next + 1) % messages.length : next
  visible.value = true
  motionKey.value += 1
}

function unlockAvatar() {
  locked.value = false
  clickTimes.length = 0
  unlockTimer = undefined
}

function handleAvatarClick() {
  if (locked.value) {
    visible.value = true
    return
  }

  const now = Date.now()
  while (clickTimes.length && now - clickTimes[0] > 5000) {
    clickTimes.shift()
  }
  clickTimes.push(now)

  if (clickTimes.length > 3) {
    warningMessage.value = '别点了，别点了，我要晕了'
    visible.value = true
    motionKey.value += 1
    locked.value = true
    clickTimes.length = 0
    if (unlockTimer) clearTimeout(unlockTimer)
    unlockTimer = setTimeout(unlockAvatar, 2000)
    return
  }

  randomizeMessage()
}

function hideBubble(event: MouseEvent) {
  event.stopPropagation()
  visible.value = false
}

function takeABreak(event: MouseEvent) {
  event.stopPropagation()
  const ok = window.confirm('休闲一下？确认后进入小游戏页面。')
  if (ok) {
    window.open(gameUrl, '_blank', 'noopener,noreferrer')
  }
}

onMounted(randomizeMessage)

onBeforeUnmount(() => {
  if (unlockTimer) clearTimeout(unlockTimer)
})

watch(
  () => route.path,
  () => randomizeMessage()
)
</script>

<template>
  <div class="global-pet" aria-live="polite">
    <div v-if="visible" :key="message" class="pet-bubble">
      <span>{{ message }}</span>
      <div class="pet-bubble-actions">
        <button type="button" class="pet-break" @click="takeABreak">休闲一下</button>
        <button type="button" class="pet-close" aria-label="收起提示" @click="hideBubble">×</button>
      </div>
    </div>
    <button
      :key="motionKey"
      class="pet-avatar"
      type="button"
      aria-label="稻草小站小宠物，点击切换提示"
      @click="handleAvatarClick"
    >
      <img :src="withBase('/logo-transparent.webp')" alt="" />
      <span class="pet-spark pet-spark-a"></span>
      <span class="pet-spark pet-spark-b"></span>
    </button>
  </div>
</template>
