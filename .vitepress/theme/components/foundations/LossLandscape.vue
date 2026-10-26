<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { Pause, Play, RotateCcw, StepForward, RotateCw } from '@lucide/vue'
import { bounds, contour, evaluate, format, update } from './math.mjs'

const host = ref(null), canvas = ref(null), ready = ref(false), failure = ref(false)
const w = ref(0), b = ref(0), lr = ref(0.1), mode = ref('2d'), playing = ref(false)
const steps = ref(0), message = ref(''), history = ref([[0, 0]])
const current = computed(() => evaluate(w.value, b.value))
const proposed = computed(() => update(w.value, b.value, lr.value))
const contours = [0.1, 0.5, 2, 6, 14, 28].map(level => ({ level, branches: contour(level) }))
const cx = v => 52 + (v + 1) / 5 * 486, cy = v => 324 - (v + 2) / 6 * 292
const points = list => list.map(([x, y]) => `${cx(x)},${cy(y)}`).join(' ')
let scene, camera, renderer, marker, pathLine, THREE, resizeObserver, intersectionObserver, timer, visible = true, rotation = 0
const cleanups = []
const pause = () => { playing.value = false; clearInterval(timer) }
function step() {
  const n = proposed.value
  if (n.w < bounds.w[0] || n.w > bounds.w[1] || n.b < bounds.b[0] || n.b > bounds.b[1]) {
    message.value = `下一步 w=${format(n.w)}、b=${format(n.b)}，超出当前曲面范围；已停止，未截断数值。`
    pause(); return
  }
  if (steps.value >= 100 || Math.hypot(current.value.dw, current.value.db) < 0.0001) {
    message.value = '本次演示已达到停止条件。'; pause(); return
  }
  w.value = n.w; b.value = n.b; steps.value++
  history.value = [...history.value, [n.w, n.b]]
  message.value = n.loss > n.before.loss ? '这一步损失上升，检查步长。' : '这一步按当前梯度更新了两个参数。'
}
function toggle() {
  if (playing.value) return pause()
  playing.value = true
  timer = setInterval(step, 650)
}
function reset() { pause(); w.value = 0; b.value = 0; steps.value = 0; history.value = [[0, 0]]; message.value = '' }
function edited() { pause(); steps.value = 0; history.value = [[w.value, b.value]]; message.value = '' }
function setParameter(key, event) {
  const value = Number(event.target.value), limits = bounds[key]
  if (event.target.value === '' || !Number.isFinite(value)) return
  ;(key === 'w' ? w : b).value = Math.max(limits[0], Math.min(limits[1], value))
  edited()
}
const world = (a, c) => new THREE.Vector3((a - 1.5) * 1.6, evaluate(a, c).loss * 0.12 + 0.025, (c - 1) * 1.1)
function render() {
  if (!renderer || !visible || failure.value) return
  marker.position.copy(world(w.value, b.value))
  pathLine.geometry.dispose()
  pathLine.geometry = new THREE.BufferGeometry().setFromPoints(history.value.map(([a, c]) => world(a, c)))
  renderer.render(scene, camera)
}
function rotate() {
  rotation = (rotation + 1) % 4
  fitCamera(); render()
}
function fitCamera() {
  if (!camera) return
  const angle = rotation * Math.PI / 2 + Math.PI / 4
  const direction = new THREE.Vector3(Math.sin(angle), 0.8, Math.cos(angle)).normalize()
  const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))
  const up = new THREE.Vector3().crossVectors(direction, right)
  const target = new THREE.Vector3(0.1, 2.9, 0)
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
  const horizontal = vertical * camera.aspect
  let distance = 0
  // Fit the surface, grid and billboard labels at every quarter-turn.
  for (const x of [-5.8, 6]) for (const y of [-0.7, 6.5]) for (const z of [-5, 5]) {
    const point = new THREE.Vector3(x, y, z).sub(target)
    distance = Math.max(distance, Math.abs(point.dot(right)) / horizontal + point.dot(direction), Math.abs(point.dot(up)) / vertical + point.dot(direction))
  }
  camera.position.copy(target).addScaledVector(direction, distance * 1.08)
  camera.lookAt(target)
}
watch([w, b, mode], async () => { await nextTick(); resize(); render() })
watch(lr, pause)
function resize() {
  if (!renderer || !host.value) return
  const { width, height } = host.value.getBoundingClientRect()
  if (!width || !height) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height; camera.updateProjectionMatrix(); fitCamera()
  render()
}
onMounted(async () => {
  let disposed = false
  cleanups.push(() => { disposed = true })
  const onVisibility = () => { if (document.hidden) pause() }
  document.addEventListener('visibilitychange', onVisibility)
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))
  try {
    await new Promise(resolve => {
      let near = false
      const finish = () => { if (near && mode.value === '3d') { observer.disconnect(); stop(); resolve() } }
      const stop = watch(mode, finish)
      const observer = new IntersectionObserver(([entry]) => { near = entry.isIntersecting; finish() }, { rootMargin: '160px' })
      observer.observe(host.value)
      cleanups.push(() => { observer.disconnect(); stop(); resolve() })
    })
    if (disposed) return
    THREE = await import('three')
    if (disposed) return
    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    const geo = new THREE.PlaneGeometry(8, 6.6, 64, 64)
    const pos = geo.attributes.position, colors = []
    for (let i = 0; i < pos.count; i++) {
      const a = pos.getX(i) / 1.6 + 1.5, c = pos.getY(i) / 1.1 + 1
      const loss = evaluate(a, c).loss
      pos.setXYZ(i, (a - 1.5) * 1.6, loss * 0.12, (c - 1) * 1.1)
      const color = new THREE.Color().setHSL(0.45 + Math.min(loss / 44, 1) * 0.13, 0.5, 0.38 + Math.min(loss / 44, 1) * 0.14)
      colors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals()
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75, metalness: 0 })))
    for (const { branches } of contours) for (const branch of branches) {
      const vertices = branch.filter(([, value]) => value >= bounds.b[0] && value <= bounds.b[1]).map(([a, c]) => world(a, c))
      if (vertices.length > 1) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices), new THREE.LineBasicMaterial({ color: '#396c7a', transparent: true, opacity: 0.55 })))
    }
    const grid = new THREE.GridHelper(10, 10, '#8b9ca1', '#d5dedf'); grid.position.y = -0.02; scene.add(grid)
    const axisMaterial = new THREE.LineBasicMaterial({ color: '#56717b' })
    for (const pair of [[[-4, 0, -3.3], [4.6, 0, -3.3]], [[-4, 0, -3.3], [-4, 0, 4]], [[-4, 0, -3.3], [-4, 5.7, -3.3]]]) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pair.map(p => new THREE.Vector3(...p))), axisMaterial))
    function label(value, position, size = 1.3) {
      const bitmap = document.createElement('canvas'); bitmap.width = 256; bitmap.height = 96
      const context = bitmap.getContext('2d')
      context.font = '54px Arial, sans-serif'; context.fillStyle = '#263d45'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(value, 128, 48)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(bitmap), depthTest: false }))
      sprite.scale.set(size * 256 / 96, size, 1); sprite.position.set(...position); sprite.renderOrder = 12; scene.add(sprite)
    }
    label('w', [5.4, 0, -3.3]); label('b', [-4, 0, 5]); label('L', [-4, 6.1, -3.3])
    // Axis names sit past the last tick so they never share its spot.
    // The axes meet at w = -1, b = -2; ticks there would pile up in one corner, so they start one step in.
    for (const value of [0, 2, 4]) label(String(value), [(value - 1.5) * 1.6, -.35, -3.9], 1.4)
    for (const value of [0, 2, 4]) label(String(value), [-4.8, -.1, (value - 1) * 1.1], 1.4)
    for (const value of [20, 40]) label(String(value), [-4.8, value * .12, -3.3], 1.4)
    marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 12), new THREE.MeshBasicMaterial({ color: '#d14b51', depthTest: false }))
    marker.renderOrder = 10; scene.add(marker)
    pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#1b597e', depthTest: false })); pathLine.renderOrder = 9; scene.add(pathLine)
    scene.add(new THREE.HemisphereLight('#ffffff', '#647f88', 1.1))
    const light = new THREE.DirectionalLight('#ffffff', 1.3); light.position.set(4, 10, 6); scene.add(light)
    const lost = event => { event.preventDefault(); failure.value = true; ready.value = false; pause() }
    const restored = () => { failure.value = false; ready.value = true; resize(); render() }
    canvas.value.addEventListener('webglcontextlost', lost)
    canvas.value.addEventListener('webglcontextrestored', restored)
    const element = canvas.value
    cleanups.push(() => { element.removeEventListener('webglcontextlost', lost); element.removeEventListener('webglcontextrestored', restored) })
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host.value)
    intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) pause(); else render() })
    intersectionObserver.observe(host.value)
    ready.value = true; resize()
  } catch { if (!disposed) { failure.value = true; ready.value = false } }
})
onUnmounted(() => {
  pause(); cleanups.forEach(fn => fn()); resizeObserver?.disconnect(); intersectionObserver?.disconnect()
  const resources = new Set()
  scene?.traverse(object => { if (object.geometry) resources.add(object.geometry); for (const m of (Array.isArray(object.material) ? object.material : [object.material])) if (m) { resources.add(m); if (m.map) resources.add(m.map) } })
  resources.forEach(resource => resource.dispose()); renderer?.dispose(); renderer?.forceContextLoss()
})
</script>

<template>
  <section class="landscape" aria-label="梯度下降交互实验" data-foundation-lab="landscape">
    <div class="topbar"><div role="group" aria-label="损失视图"><button type="button" :aria-pressed="mode === '3d'" @click="mode = '3d'">三维曲面</button><button type="button" :aria-pressed="mode === '2d'" @click="mode = '2d'">等高线</button></div><span>三条教学样本 · 平均半平方损失</span></div>
    <div ref="host" class="scene" :data-ready="ready && !failure">
      <canvas ref="canvas" v-show="mode === '3d' && ready" aria-label="两参数损失曲面，红点为当前参数位置，蓝线为已执行更新" role="img" />
      <img v-if="mode === '3d' && !ready" :src="withBase('/ai/foundations/loss-contours.svg')" alt="两参数损失等高线，最低点为w等于2、b等于1" />
      <svg v-if="mode === '2d'" viewBox="0 0 580 370" role="img" aria-label="当前参数和历史更新在同一损失等高线上的位置">
        <defs><clipPath id="foundation-contour-clip"><rect x="52" y="32" width="486" height="292" /></clipPath></defs>
        <g clip-path="url(#foundation-contour-clip)"><g v-for="c in contours" :key="c.level"><polyline v-for="(branch, i) in c.branches" :key="i" :points="points(branch)" fill="none" stroke="#629f9b" stroke-width="1.6" /></g><polyline :points="points(history)" fill="none" stroke="#2b78aa" stroke-width="2" /><circle :cx="cx(2)" :cy="cy(1)" r="4" fill="var(--vp-c-text-1)" /><circle :cx="cx(w)" :cy="cy(b)" r="6" fill="#d14b51" /></g>
        <path d="M52 32V324H538" fill="none" stroke="var(--vp-c-text-2)" /><text x="556" y="329" font-style="italic">w</text><text x="52" y="22" text-anchor="middle" font-style="italic">b</text><text :x="cx(2)" :y="cy(1)-12" text-anchor="middle">最低点 (2, 1)</text>
        <g v-for="v in [0,1,2,3,4]" :key="v"><text :x="cx(v)" y="345" text-anchor="middle">{{ v }}</text></g><g v-for="v in [-2,0,2,4]" :key="v"><text x="40" :y="cy(v)+5" text-anchor="end">{{ v }}</text></g>
      </svg>
      <button v-if="mode === '3d' && ready" class="rotate" type="button" aria-label="切换曲面观察角度" title="切换观察角度" @click="rotate"><RotateCw :size="18" /></button>
    </div>
    <div class="axis-key"><span>w：重量系数，范围 -1 至 4</span><span>b：固定费用，范围 -2 至 4</span><span>L：损失，高度为线性比例</span></div>
    <div class="controls"><label>学习率 <select v-model.number="lr" aria-label="学习率"><option :value="0.02">0.02</option><option :value="0.1">0.1</option><option :value="0.5">0.5</option><option :value="1">1</option></select></label><div class="parameter"><span>w</span><input :value="format(w)" aria-label="w 数值" type="number" min="-1" max="4" step="any" @input="setParameter('w', $event)" /><input v-model.number="w" aria-label="w 滑条" type="range" min="-1" max="4" step="any" @input="edited" /></div><div class="parameter"><span>b</span><input :value="format(b)" aria-label="b 数值" type="number" min="-2" max="4" step="any" @input="setParameter('b', $event)" /><input v-model.number="b" aria-label="b 滑条" type="range" min="-2" max="4" step="any" @input="edited" /></div></div>
    <div class="transport"><button type="button" aria-label="执行一次参数更新" title="单步更新" @click="pause(); step()"><StepForward :size="20" /></button><button type="button" :aria-label="playing ? '暂停连续更新' : '连续更新'" :title="playing ? '暂停' : '连续更新'" @click="toggle"><Pause v-if="playing" :size="20" /><Play v-else :size="20" /></button><button type="button" aria-label="复位训练参数" title="复位训练参数" @click="reset"><RotateCcw :size="20" /></button><span>第 {{ steps }} 次更新</span></div>
    <dl class="numbers" aria-live="polite"><div><dt>当前损失 L</dt><dd>{{ format(current.loss) }}</dd></div><div><dt>梯度 ∂L/∂w</dt><dd>{{ format(current.dw) }}</dd></div><div><dt>梯度 ∂L/∂b</dt><dd>{{ format(current.db) }}</dd></div></dl>
    <p class="status" role="status">{{ message || (failure ? '当前环境无法显示三维，仍可使用等高线、参数与单步计算。' : '红点是当前参数；单步执行后，参数、损失和轨迹一起更新。') }}</p>
  </section>
</template>

<style scoped>
.landscape { margin: 28px 0; padding: 16px 0; border-block: 1px solid var(--vp-c-divider); letter-spacing: 0; }
.topbar { display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center; gap: 10px; }.topbar>span { font-size: 12px; color: var(--vp-c-text-2); }.topbar>div { display: flex; gap: 4px; }button { min-width: 44px; min-height: 44px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 4px; font: inherit; cursor: pointer; }button[aria-pressed=true] { background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.scene { position: relative; width: 100%; aspect-ratio: 1.55; margin-top: 12px; background: #f3f8f8; overflow: hidden; }.dark .scene { background: #dbe8e9; }.scene canvas, .scene>img, .scene>svg { display: block; width: 100%; height: 100%; object-fit: contain; }.scene svg { font: 16px var(--vp-font-family-base); fill: var(--vp-c-text-1); background: var(--vp-c-bg); }.rotate { position: absolute; right: 10px; bottom: 10px; display: grid; place-items: center; background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.axis-key { display: flex; gap: 4px 16px; flex-wrap: wrap; font-size: 12px; line-height: 1.7; padding-block: 8px; color: var(--vp-c-text-2); }.controls { display: grid; grid-template-columns: 120px 1fr 1fr; gap: 16px; margin-top: 12px; }label { display: grid; grid-template-columns: 1fr 45px; align-items: center; gap: 4px; font-size: 14px; }label>input { grid-column: 1; min-width: 0; width: 100%; height: 44px; accent-color: var(--vp-c-brand-1); }label>output { grid-column: 2; grid-row: 2; text-align: right; font-variant-numeric: tabular-nums; }select { grid-column: 1/3; border: 1px solid var(--vp-c-divider); border-radius: 4px; height: 44px; padding: 6px; background: var(--vp-c-bg); font: inherit; }.transport { display: flex; gap: 8px; align-items: center; margin-block: 12px; }.transport button { display: grid; place-items: center; }.transport>span { margin-left: 8px; font-size: 14px; }
.numbers { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px; border-top: 1px solid var(--vp-c-divider); padding-top: 16px; }.numbers dt { font-size: 12px; color: var(--vp-c-text-2); }.numbers dd { margin: 4px 0 0; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }.status { font-size: 13px; color: var(--vp-c-text-2); min-height: 52px; line-height: 1.8; }
.parameter { display: grid; grid-template-columns: minmax(0,1fr) 80px; gap: 4px; align-items: center; font-size: 14px; }.parameter input[type=number] { width: 80px; min-height: 44px; border: 1px solid var(--vp-c-divider); border-radius: 4px; padding: 4px; font: inherit; font-variant-numeric: tabular-nums; }.parameter input[type=range] { grid-column: 1/-1; min-width: 0; width: 100%; height: 44px; accent-color: var(--vp-c-brand-1); }
@media(max-width:540px) { .controls { grid-template-columns: 1fr 1fr; }.controls>label:first-child { grid-column: 1/-1; grid-template-columns: 80px 1fr; }.controls select { grid-column: 2; }.scene { aspect-ratio: 1.12; }.numbers dd { font-size: 18px; }.numbers { gap: 6px; }.transport>span { margin-left: 0; } }
</style>
