# Vue：单文件组件、依赖追踪与逻辑复用

商品搜索页通常有三种不同的变化：输入关键字、根据关键字过滤已有数据、到服务端重新查询。第一种保存状态，第二种计算派生结果，第三种产生外部副作用。把三者分开，就能解释 `ref`、`computed`、`watch` 各自该放在哪里。

Vue 3 的单文件组件把模板、逻辑和相关样式收在同一个边界内，构建工具将其编译成 JavaScript 与 CSS。模板不是直接交给浏览器的 HTML 字符串，`<script setup>` 中的代码也不是全应用只运行一次：它会为组件实例建立各自的状态。

![Vue 状态读取、派生结果、组件更新与请求清理](/front/frontend-foundations-series/ep32-flow.svg)

## 从筛选组件观察依赖

在 Vite 的 Vue 模板中将下面内容放进 `App.vue`。这是本地数据筛选，不会发送接口请求。输入“咖啡”留下两项，选择“只看有货”后只剩第一项；清空关键字后恢复全部有货商品。

```vue
<script setup>
import { computed, ref } from 'vue';

const keyword = ref('');
const onlyInStock = ref(false);
const products = ref([
  { id: 'p1', name: '咖啡豆', stock: 8 },
  { id: 'p2', name: '咖啡杯', stock: 0 },
  { id: 'p3', name: '滤纸', stock: 12 },
]);
const visible = computed(() => {
  const query = keyword.value.trim();
  return products.value.filter(product =>
    product.name.includes(query) && (!onlyInStock.value || product.stock > 0));
});
</script>

<template>
  <main>
    <label>商品关键字 <input v-model="keyword" /></label>
    <label><input v-model="onlyInStock" type="checkbox" />只看有货</label>
    <p>找到 {{ visible.length }} 项</p>
    <ul v-if="visible.length">
      <li v-for="product in visible" :key="product.id">
        {{ product.name }}：库存 {{ product.stock }}
      </li>
    </ul>
    <p v-else>没有匹配的商品</p>
  </main>
</template>
```

在脚本中通过 `.value` 读写 ref，模板里这些顶层 ref 自动解包。渲染与 computed 执行时读取的响应式值形成依赖，变化后使相关结果失效、安排后续更新。computed 是惰性求值和缓存的派生值，不应在计算函数里发请求或反过来修改依赖。

数组的 `filter` 会短路判断，因此某次运行未读取的分支不形成这次的依赖；下一次执行会重新收集。不能把依赖图理解成启动时扫描过一次、以后永久不变。

## 响应式值与普通变量的边界

Vue 3 用代理处理 reactive 对象，用 ref 的访问入口处理 `.value`。从代理上解构一个数值，只拿到当时的普通值：

```js
import { reactive, toRefs } from 'vue';

const cart = reactive({ quantity: 1, delivery: { city: '杭州' } });
const { quantity: snapshot } = cart;
const { quantity } = toRefs(cart);
cart.quantity = 2;
console.log(snapshot, quantity.value); // 1, 2
```

这里“解构失去响应式”指这个基本类型字段的读取关系；解构得到的嵌套代理对象仍可能有响应式。Vue 3.5+ 在同一 `<script setup>` 中对 `defineProps()` 的响应式解构有编译器支持，也不能用普通 JavaScript 解构规则一概而论。传给 `watch` 时仍需传 ref 或 getter，例如 `watch(() => props.productId, ...)`；直接传当下字符串没有可追踪来源。

用 `reactive` 后整体替换局部变量，会让既有消费者仍指向旧代理；需要整体替换时，`ref` 包住对象通常更直接。DOM 更新会被缓冲，修改状态后若要读取更新后的节点，可 `await nextTick()`；这证明 Vue 已完成该轮 DOM 刷新，不保证图片加载完成或浏览器已经绘制。

## 请求副作用与过期结果

本地筛选用 computed；查询接口用 watcher 或现有查询库。下面是可放在 `<script setup>` 中的查询片段，接口合同为成功返回 `{ items: [{ id: string, name: string }] }`。接口、鉴权和服务端分页需要另行提供，不能拿本地筛选冒充真实搜索。

```js
import { ref, watch } from 'vue';

const keyword = ref('');
const items = ref([]);
const status = ref('idle');
const error = ref('');

watch(keyword, (raw, _previous, onCleanup) => {
  const controller = new AbortController();
  let active = true;
  onCleanup(() => {
    active = false;
    controller.abort();
  });
  items.value = [];
  error.value = '';
  const query = raw.trim();
  if (!query) { status.value = 'idle'; return; }
  status.value = 'loading';

  void (async () => {
    try {
      const response = await fetch(`/api/products?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.items) || !data.items.every(item =>
        item && typeof item.id === 'string' && typeof item.name === 'string')) {
        throw new Error('商品字段不符合合同');
      }
      if (active) { items.value = data.items; status.value = 'success'; }
    } catch (cause) {
      if (active) {
        error.value = cause instanceof Error ? cause.message : '查询失败';
        status.value = 'error';
      }
    }
  })();
});
```

清理同时撤销客户端等待并让旧任务失去写入资格。只 `abort()` 不能替代结果归属检查，也不能撤回已发生的服务端写入。本例没有防抖、缓存或重试，生产搜索应按交互频率补充这些策略，并区分输入关键字和已提交查询。

组件 setup 中同步创建的 watcher 随组件卸载停止；异步回调里额外创建的 watcher 要明确停止。`watch` 显式声明来源；`watchEffect` 自动收集同步执行期间的读取，异步函数中第一次 `await` 之后的读取不自动计入。Vue 3.5+ 的 `onWatcherCleanup` 还要求在同步阶段注册，本例使用回调参数 `onCleanup`，并同样在请求开始前注册。

## 组件、composable 与共享状态

props 向下传数据，emit 向上表达修改意图。子组件不应直接修改父级对象的嵌套字段来绕开单向数据流；即使某个对象可写，也需要维护清楚的所有权。`v-model` 是值与更新事件的约定，不是自动获得服务端保存能力。

composable 把一组状态、方法和清理逻辑按业务组织，例如 `useProductSearch()`。状态写在函数内部时，每次调用分别创建；移到模块顶层会共享同一模块实例的状态。SSR 中无意使用模块级用户状态可能串到其他请求，需要按请求或应用实例建立 store。

| 边界 | 商品页中的用途 | 需要约束的内容 |
| --- | --- | --- |
| 组件局部 ref | 关键字、弹窗与未保存草稿 | 卸载是否丢弃，刷新是否恢复 |
| props / emit | 数量控件与父级购物车 | 父级校验后才更新事实值 |
| provide / inject | 编辑区域的上下文 | 提供者作用域，统一修改方法 |
| Pinia | 多页面共享购物车 | 账户退出清理，SSR实例隔离 |
| 查询缓存 | 商品接口快照 | 参数键、过期、重试与失效 |

slot 传可渲染结构，props 传数据与配置。样式 `scoped` 通过编译后的属性选择器限制匹配，不等于 Shadow DOM 隔离；全局样式、继承以及子组件根节点仍需检查。渐进式采用可以从局部增强发展到 Router、Pinia 或 Nuxt，但不要求每个小页面都引入完整组合。

## 排查与验收

过滤后项目没变，先检查改的是 ref、代理还是解构快照；结果回到旧关键字，检查旧请求是否仍有写入资格；行内输入错位，检查 `:key` 是否使用稳定业务 ID。不要用深度 watcher 为整个应用兜底，它会扩大遍历与副作用范围。

验收本地筛选时覆盖空关键字、空格、无结果、有货筛选和恢复；验收请求时故意让旧查询延迟，确认它不会覆盖新查询，再测试 HTTP 错误、字段不合法和卸载清理。组件事件与数量控件继续看 [组件更新模型](./22-component-reactive-ui.md)，路由、草稿和服务端快照的分工见 [应用架构](./25-frontend-application-architecture.md)。
