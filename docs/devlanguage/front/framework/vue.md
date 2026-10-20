# Vue：响应式状态与组件合同

Vue把模板、响应式状态和组件生命周期组织在一起。业务应用的难点通常在状态归属：输入草稿何时可以覆盖服务器记录，子组件能否改父对象，跨页面共享的内容由谁清理。先确定这些合同，再选择`ref`、组件事件或Pinia。

例如商品数量编辑，父组件持有数量，子组件只报告新输入，金额由数量派生。把数量复制到多个组件并互相watch，容易出现循环同步和旧值回写。

![Vue状态、派生结果、组件更新与请求清理](/front/frontend-foundations-series/ep32-flow.svg)

## 项目入口

新应用使用Vue3和`create-vue`。Vue2已于2023年12月31日结束官方维护，Vue CLI处于维护模式；旧项目迁移要单独核对插件、路由和构建链，不将Vue2示例与Vue3安装命令混用。Options API在Vue3仍可使用，不是Vue2专属。

```bash
npm create vue@latest product-editor
cd product-editor
npm install
npm run dev
npm run build
```

初始化可选择TypeScript、Router、Pinia和测试能力。以生成项目的脚本与Node要求为准，不假设所有项目都有相同的检查命令。编辑器使用Vue语言工具，SFC类型检查使用`vue-tsc`或生成项目的对应脚本；仅构建成功不能证明类型已检查。

## 父组件持有业务状态

下面两个文件放到`src/`，主入口继续挂载`App.vue`。示例使用Vue3.4起支持的`defineModel`；它声明组件的`modelValue`属性与`update:modelValue`事件，不是跨组件的全局变量。

```vue
<!-- QuantityInput.vue -->
<script setup>
const quantity = defineModel({ type: String, required: true });
</script>

<template>
  <label>数量
    <input v-model="quantity" type="text" inputmode="numeric">
  </label>
</template>
```

```vue
<!-- App.vue -->
<script setup>
import { computed, ref } from 'vue';
import QuantityInput from './QuantityInput.vue';

const quantity = ref('1');
const count = computed(() => Number(quantity.value));
const valid = computed(() => /^\d+$/.test(quantity.value)
  && Number.isInteger(count.value) && count.value >= 1 && count.value <= 5);
const totalCents = computed(() => valid.value ? count.value * 1990 : null);
</script>

<template>
  <main>
    <h1>商品数量</h1>
    <QuantityInput v-model="quantity" />
    <p v-if="valid" role="status">
      {{ count }}件，{{ (totalCents / 100).toFixed(2) }}元
    </p>
    <p v-else role="alert">数量必须为1至5的整数。</p>
    <button type="button" @click="quantity = '1'">重置</button>
  </main>
</template>
```

输入先保留字符串，清空和无效输入不会立刻被强行改成0。`computed`表达派生值，不向其他状态写入。模板自动解包ref，脚本通常通过`.value`访问。若把`reactive`对象的普通数值属性解构到局部变量，该变量不会继续跟踪原属性；Vue3.5的`defineProps`解构存在编译器转换，不能据此推断普通JavaScript解构都有响应式。

props为只读输入。对象prop的内部字段可能仍能被间接修改，但这样会绕过父组件合同。编辑服务器商品时，应明确是即时编辑还是独立草稿：独立草稿在进入编辑时创建，保存成功才更新已保存记录；不能每次服务器刷新都无条件覆盖正在输入的草稿。

## 共享状态与请求生命周期

一个面板内先用父子属性和事件；多层组件共享上下文可以使用`provide/inject`；跨页面业务状态可以用Pinia。`storeToRefs(store)`提取需要保留响应式的状态和getter，action可直接调用。SSR场景为每次请求创建应用和store，避免模块级可变单例混入另一位访问者的数据。

事件总线不等于共享状态。`app.config.globalProperties`只是实例属性扩展位置，不具备旧版`$on/$off`总线能力。兄弟组件需要共同数据时，优先上移状态；真正的事件订阅必须说明解除时机。

搜索请求使用`watch`观察输入，清理旧请求并拦截迟到结果。HTTP状态、JSON结构和业务状态分别验证：`fetch`收到500不会自动reject，TypeScript接口也不能证明JSON字段正确。组合式函数应说明每次调用创建独立状态，还是返回共享实例；不要仅因封装了`useXxx`就假设全局共享。可运行的请求清理示例见[响应式机制](../frontend-foundations-series/32-vue-sfc-reactivity-composition.md)。

## 路由与交付

Vue Router4用于Vue3应用。路由定义的`name`和参数键必须与导航对象一致；`createWebHistory(import.meta.env.BASE_URL)`可以衔接构建前缀，但服务器仍需为页面路由提供适当回退。动态路由参数变化不一定销毁组件，加载逻辑要观察参数变化并处理竞态。

`v-if`切换会创建和销毁分支，`v-show`主要切换显示，隐藏内容仍可能持有订阅和计时器。决定用哪一种应看初始化成本、切换频率和生命周期要求。`scoped`样式是选择器转换，不是完整Shadow DOM安全隔离；`v-html`绕过文本转义，不能直接插入不可信HTML。

| 现象 | 检查与验证 |
| --- | --- |
| 解构后数值不更新 | 分清普通解构、ref和编译器宏转换，检查真实读取位置 |
| 子组件修改后父数据意外改变 | 检查嵌套对象共享引用，确认草稿与事件合同 |
| 切换商品仍显示上一个结果 | 观察路由参数，取消旧请求并验证结果身份 |
| 页面离开后持续请求 | 检查异步创建的watch、手动订阅和计时器销毁 |
| 开发可用、生产路径错误 | 检查base、Router history和资源URL，不依赖开发代理 |

本地示例验证数量1为19.90元，输入2为39.80元，空串、6和小数进入错误状态，重置恢复1。接入库存API后需要单独验证服务器拒绝、字段错误和保存冲突。更完整的应用职责见[框架生态](./index.md)、[状态管理](../state-management/)和[测试](../testing/)。
