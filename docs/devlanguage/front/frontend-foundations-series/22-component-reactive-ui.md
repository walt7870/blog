# 组件化 UI：状态归属与响应式更新

购物车数量从1改为2，标题、总价和结算按钮都要同步。如果每个事件处理器分别修改三个 DOM 节点，漏掉一个就会出现自相矛盾的页面。组件模型把状态和展示规则放到明确边界，让一次状态变化推导出一致结果。

![父组件状态、子组件输入和更新事件闭环](/front/frontend-foundations-series/ep22-flow.svg)

## 先确定状态由谁拥有

以“购物车数量编辑器”为例，商品单价和数量由购物车页拥有；数量组件接收当前数量、库存上限和禁用状态，输出用户想要的新数量。总价从单价与数量计算，不再保存另一份需要手动同步的 total。

| 数据 | 归属与用途 |
| --- | --- |
| 商品ID、整数分单价、数量 | 购物车页或业务状态层的事实 |
| 是否展开配送说明 | 使用它的局部组件状态 |
| 单价×数量得到的总价 | 从事实推导，不重复存储 |
| 正在保存、保存错误 | 请求过程状态，需包含恢复路径 |
| 库存最终是否足够 | 服务端在提交时再次判断 |

多个兄弟组件需要同一数量时，把它提升到最近的共同拥有者。跨路由、跨页面仍需共享时再考虑状态容器。把每个输入框都放进全局状态，会放大耦合；把同一商品数量复制到多个局部状态，又会造成不同步。

## 输入向下，意图向上

下面用 Vue 3 表达一个受控的数量组件 `QuantityInput.vue`。它不修改 props，也不直接调用保存接口；父级收到事件后决定是否接受。

```vue
<script setup>
const props = defineProps({
  quantity: { type: Number, required: true },
  max: { type: Number, required: true },
  disabled: { type: Boolean, default: false }
});
const emit = defineEmits(["change"]);
function increase() {
  if (props.disabled || props.quantity >= props.max) return;
  emit("change", props.quantity + 1);
}
</script>

<template>
  <div>
    <output aria-live="polite">{{ quantity }}</output>
    <button type="button"
      :disabled="disabled || quantity >= max"
      @click="increase">增加数量</button>
  </div>
</template>
```

父组件中，单价为1290分、库存上限为5。组件类型声明不会校验服务端权限和库存；此例使用固定有效输入来观察状态流。

```vue
<script setup>
import { computed, ref } from "vue";
import QuantityInput from "./QuantityInput.vue";

const quantity = ref(1);
const max = 5;
const priceCents = 1290;
const total = computed(() => "¥" + (quantity.value * priceCents / 100).toFixed(2));
function changeQuantity(next) {
  if (Number.isSafeInteger(next) && next >= 1 && next <= max) {
    quantity.value = next;
  }
}
</script>

<template>
  <QuantityInput :quantity="quantity" :max="max" @change="changeQuantity" />
  <p>合计：{{ total }}</p>
</template>
```

初始合计 ¥12.90，点击后数量2、合计 ¥25.80，到5时按钮禁用。父级拒绝事件时，子组件不会擅自改变展示值。这比子组件先修改本地数量、父级再纠正它更容易解释。

## 声明式更新仍有运行成本

声明式 UI 表达“状态对应什么结果”，框架负责安排计算与 DOM 提交。React 常通过重新执行组件函数和协调结果组织更新；Vue 使用响应式依赖和组件更新任务；其他框架也可能借助编译或 signal。不能把它们都描述成相同的自动字段追踪。

更新模型也不等于布局响应式：后者是页面随视口或容器宽度变化。这里讨论的是数据变化怎样驱动界面。

批处理可以合并重复更新，但不保证每次状态修改都立刻提交 DOM，也不保证提交后浏览器已经绘制。Vue 中若要在状态修改后读取新 DOM，可等待 `nextTick()`；React 应按提交和 effect 的语义选择位置。先区分“状态已变”“DOM已变”“已上屏”，再定位时序问题。

## 身份与副作用决定组件能否安全复用

商品列表应使用稳定商品 ID 作为 key。删除第一行后，其余行仍要保留正确的输入值和焦点；索引 key 容易把旧组件状态配给新商品。切换 key 又可能使组件重建并重置状态，所以它不是随意消除告警的标记。

渲染计算应尽量保持纯粹。网络订阅、定时器和外部事件需要在对应生命周期建立并清理；把请求放进每次渲染路径可能造成重复调用和竞态。不要同时让框架和手写 DOM 代码管理同一子树；第三方编辑器等场景应明确节点所有权和销毁入口。

## 验收完整状态闭环

依次验证初始值、连续增加、上限禁用、父级拒绝和组件卸载。扩展到真实保存时，再加入加载状态、失败提示、重复点击限制和旧响应保护。服务端保存成功后应使用确认结果更新业务事实，不能把本地展示变化误写成库存已扣减。

若数量变了总价未变，检查总价是否从同一状态推导；若子组件和父级不同步，检查是否复制 props；若删除后输入串行，检查 key 和组件身份。具体模型见 [React](./31-react-components-hooks-state)、[Vue](./32-vue-sfc-reactivity-composition) 与 [Angular](./33-angular-di-signals-application-structure)。
