# React：组件、状态快照与外部同步

购物车里点一次“加三件”，数量为什么只增加一件？把商品顺序倒过来，备注为什么跑到了另一行？这些现象需要分别检查更新队列和组件身份，不能都归为“React 没有刷新”。

React 组件根据 props、当前 state 和 context 计算界面。一次重新执行不一定产生 DOM 修改，也不等于浏览器已经绘制。应用的 URL、接口缓存和服务端权限则需要路由、数据层和后端共同处理。

![React 的状态快照、更新队列、提交与外部同步](/front/frontend-foundations-series/ep31-flow.svg)

## 状态快照与更新队列

每次渲染得到自己的状态快照，事件处理函数也闭包捕获这次的值。假设数量为 1，在同一个点击事件中连续三次 `setQuantity(quantity + 1)`，三次提交的都是“替换成 2”；改成三次 `setQuantity(q => q + 1)`，更新函数依次收到 1、2、3，结果为 4。函数式更新解决的是基于待处理状态继续计算，不能让已经捕获的普通变量变成实时引用。

在 Vite 的 React 模板中，用下面的 `App.jsx` 替换默认组件即可观察。金额使用整数分，数量上限只是本地交互规则，真实结算仍应由服务端检查价格与库存。

```jsx
import { useState } from 'react';

export default function App() {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('咖啡豆');
  const unitCents = 1990;
  const totalCents = quantity * unitCents;

  function addThree() {
    setQuantity(q => Math.min(5, q + 1));
    setQuantity(q => Math.min(5, q + 1));
    setQuantity(q => Math.min(5, q + 1));
  }

  return (
    <main>
      <label>商品名称
        <input value={name} onChange={e => setName(e.target.value)} />
      </label>
      <p>{name}：{quantity} 件，共 {(totalCents / 100).toFixed(2)} 元</p>
      <button type="button" onClick={addThree} disabled={quantity >= 5}>
        加三件
      </button>
      <button type="button" onClick={() => setQuantity(1)}>重置</button>
    </main>
  );
}
```

初始总价 19.90 元，点击后为 4 件、79.60 元，再点一次到 5 件并禁用；重置恢复 1 件。名称只保存一份输入值，总价直接派生，不需要再存一个 state 或用 Effect 写回。JSX 会经过构建转换；花括号放表达式，事件属性传函数，`className` 对应 CSS 类名。

React 会批处理更新，但不同的有意用户事件分别处理。更新函数必须纯净，不能在里面发请求、写日志账单或修改外部对象；开发期 Strict Mode 可能额外调用它来发现问题。异步回调若还需要最新数量，同样可以使用函数式更新；若要同步外部系统，应明确同步哪个版本。

## 渲染、提交与组件身份

渲染阶段计算下一份界面，可以被重新尝试或放弃；提交阶段才把已采用的变化应用到 DOM。读取 DOM 尺寸、开启订阅或直接写全局对象放在组件函数顶部，会让一次未提交的尝试也产生外部影响。`useLayoutEffect` 适合必须在绘制前完成的布局测量，但会阻塞绘制；普通 `useEffect` 不保证在所有交互情况下都严格晚于绘制。

状态跟随树中的位置、组件类型和 key。商品行内部保存备注时，下面两种写法在排序后的行为不同：

```jsx
// 排序、插入、删除后，位置索引仍对应原来的状态位置。
products.map((product, index) => <ProductRow key={index} product={product} />);

// 业务ID随商品移动，原行的局部状态可继续对应同一商品。
products.map(product => <ProductRow key={product.id} product={product} />);
```

key 在同一父级的兄弟节点之间标识身份，不是全站唯一 ID，也不会作为普通 prop 传入。每次 `Math.random()` 产生新 key 会强制重建，焦点和草稿都可能丢失。切换订单时主动更换表单 key 可以重置草稿，但必须先处理未保存修改，不能把重置当作并发冲突解决方案。

## Hooks 组织状态，不复制可派生结果

`useState` 保存参与渲染的状态；`useRef` 保存 DOM 引用或不参与渲染的可变值，修改 `ref.current` 不会安排界面更新；`useMemo` 缓存计算结果，不能承担正确性或持久存储责任。父组件把事实状态通过 props 下传，子组件用回调表达意图，父级决定是否接受。

`useState`、`useEffect` 等 Hook 必须在函数组件或自定义 Hook 的顶层按稳定顺序调用，也要位于提前返回之前。可以把条件放在 Effect 内，或者拆出条件挂载的子组件。React 的 `use` API 有允许条件与循环调用的特殊规则，不能把这个例外推广到其他 Hook。

自定义 Hook 复用状态逻辑，不自动共享状态实例。两个组件分别调用 `useCartDraft()`，通常会各自得到草稿；需要共享时应提升到共同父级、提供 context 或使用明确定义的外部 store。服务端商品快照另有加载、失效、重试与账户隔离，不宜塞进一个无限增长的全局 context。

## Effect 建立同步关系，也负责撤销

订阅窗口事件是一个适合 Effect 的场景。下面的 Hook 应在组件顶层调用，显示返回值即可观察窗口变化：

```jsx
import { useEffect, useState } from 'react';

export function useWindowWidth() {
  const [width, setWidth] = useState(null);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}
```

依赖变化时先清理旧同步，再用新值建立同步；卸载时清理最后一次。开发期 Strict Mode 还会额外执行一次建立与清理来检查对称性。遗漏清理可能重复监听或重复连接，正确做法是让撤销对应建立，而不是用“只运行一次”的 ref 掩盖问题。

Effect 使用的响应式值应进入依赖数组。把读取了 `productId` 的请求强行写成 `[]`，切换商品就仍然使用旧 ID。手写请求还要同时处理取消和过期响应：先启动的请求可能后完成，取消等待也不能证明服务端写入未发生。复杂应用优先沿用路由加载或查询缓存方案，基础请求分层见 [Fetch 与网络请求](./15-fetch-network-requests.md)。

用户明确点击“购买”触发的写请求通常放在事件处理流程，不能仅因为某个 state 变了就用 Effect 自动下单。购买需要防重复、服务端校验、幂等和明确的结果状态。

## 排查与验收

| 现象 | 检查位置 | 验证办法 |
| --- | --- | --- |
| 连续加三次只加一件 | 事件闭包与更新参数 | 对比替换值、函数式更新；从 1 验证到 4 |
| 排序后备注错行 | 业务 ID、key、树位置 | 编辑一行再反序，备注仍属于同一商品 |
| 开发时订阅执行两次 | Effect 建立与清理 | 挂载、卸载、再挂载后只有一份有效订阅 |
| 输入改变但总价不变 | 对象是否被原地修改、派生链 | 用新对象更新，检查当前数量与金额 |
| 点击卡顿 | React Profiler 与 Performance | 固定列表规模，定位计算或提交，再决定拆分与缓存 |

先缩小状态归属和受影响子树，再判断是否需要 `memo` 或 `useMemo`。重新渲染次数不能单独作为性能结论。路由、SSR、Server Components、接口缓存和部署边界继续看 [渲染架构](./24-web-rendering-architecture.md) 与 [应用架构](./25-frontend-application-architecture.md)。
