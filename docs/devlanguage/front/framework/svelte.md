# Svelte：编译、响应式与应用生命周期

Svelte编译组件并生成更新DOM所需的代码，Svelte5通过runes表达状态与派生值，依赖在运行时读取过程中跟踪。编译器与运行时共同工作，不能概括为“零运行时”，也不能仅凭没有虚拟DOM断言任何业务都更快。

例如商品数量变化后，需要更新数量、金额与按钮状态。状态是输入，派生值负责计算，事件负责业务动作，Effect只承担与外部系统的同步。把金额复制成另一个状态再用Effect回写，会增加更新链与短暂不一致。

![Svelte5从组件编译到状态更新和生命周期清理](/front/framework/svelte-runtime.svg)

## 初始化

```bash
npx sv create product-app
cd product-app
npm install
npm run dev
```

`sv create`创建SvelteKit应用，路由页放在`src/routes/+page.svelte`。只需要嵌入式组件时，可以采用Vite的Svelte模板。部署前先确认SvelteKit adapter：静态生成和请求时渲染的运行环境不同，不能假设任何项目都有`npm run deploy`。

下面采用Svelte5 runes语法。旧`export let`、`$:`和`on:click`属于legacy模式的常见写法，迁移时可以逐组件进行，但同一组件的语法要遵循相应模式；不是把所有`let`机械改为`$state`就完成应用迁移。

## 一个商品报价组件

把下面组件作为`src/routes/+page.svelte`。选择范围固定，金额采用分值计算；示例只生成本地报价。

```svelte
<script>
  let quantity = $state(1);
  let quoted = $state(false);
  let totalCents = $derived(quantity * 1990);

  function change(delta) {
    quantity = Math.min(5, Math.max(1, quantity + delta));
    quoted = false;
  }
</script>

<main>
  <h1>商品报价</h1>
  <p>数量：{quantity}</p>
  <button type="button" disabled={quantity === 1} onclick={() => change(-1)}>
    减少
  </button>
  <button type="button" disabled={quantity === 5} onclick={() => change(1)}>
    增加
  </button>
  <p>金额：{(totalCents / 100).toFixed(2)}元</p>
  <button type="button" onclick={() => quoted = true}>确认报价</button>
  <button type="button" onclick={() => { quantity = 1; quoted = false; }}>重置</button>
  {#if quoted}
    <p role="status">已确认{quantity}件，仅本地报价，尚未提交服务器。</p>
  {/if}
</main>
```

`$state`是编译器识别的rune，不是需要导入的普通函数。`$derived`用于纯计算，不写入其他状态。子组件用`$props()`声明输入，回调prop传递变更；双向绑定需要明确`$bindable`合同，不能任意修改父组件传入对象。可变业务列表使用稳定业务ID的key，避免排序后把子组件状态对应到另一商品。

## 外部资源与清理

DOM监听、定时器等外部资源需要明确释放。以下片段可放进组件`<script>`，表示在客户端挂载后记录活动秒数；`onMount`回调同步返回清理函数，不能把回调整体改成async再期望Promise成为清理函数。

```js
import { onMount } from 'svelte';

let seconds = $state(0);
onMount(() => {
  const timer = setInterval(() => seconds += 1, 1000);
  return () => clearInterval(timer);
});
```

`onMount`不在服务端渲染执行。模块顶层访问window或启动定时器仍可能在服务器报错或泄漏。`$effect`可用于依赖状态的外部同步，返回函数在重运行前及销毁时清理；异步await之后读取的值不会自动成为此前同步执行的依赖。请求还要验证HTTP状态和JSON合同，并防止旧结果覆盖新输入。

跨组件共享可以采用context、store或明确实例化的状态容器。store在Svelte5仍可用。SSR中不要把用户草稿放进模块级共享可变状态，应用实例与访问者之间的隔离需要单独设计。

## 渲染与交付

Svelte组件负责界面，SvelteKit负责路由、数据加载、服务端能力与adapter。需要随请求读取用户数据时，区分服务器代码和会发送到浏览器的代码；客户端环境变量和页面序列化数据都不能保留服务器密钥。

静态生成适合公开且可在构建时确定的页面，动态订单通常还需API或服务器运行时。首屏快慢要同时测量HTML等待、下载脚本、组件激活和交互耗时，不能引用不同版本与配置的TodoMVC体积作业务收益保证。

| 现象 | 检查与验证 |
| --- | --- |
| 改变量但页面没更新 | 当前组件模式、状态声明与读取位置，是否已脱离响应式引用 |
| 组件销毁后仍请求 | onMount/Effect清理、取消控制与迟到结果保护 |
| SSR访问window失败 | 代码执行环境，客户端挂载边界与服务端数据入口 |
| 切换账号出现旧草稿 | 是否使用模块级可变单例，context实例是否正确隔离 |
| 本地正常，部署后404 | adapter、输出目录、子路径与服务器路由处理 |

验收报价组件：初始19.90元与减少禁用，增加到5得到99.50元并禁止继续增加，确认后显示结果，再减少时结果消失，重置恢复初始状态。生命周期片段还要验证离开页面后定时器停止。完整应用的渲染模式和部署边界见[元框架](./meta-frameworks.md)。
