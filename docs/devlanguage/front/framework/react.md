# React：组件合同与应用状态

React负责根据状态描述界面。路由、请求缓存、表单和部署需要由应用方案共同组织。把它当成“所有功能都齐全的脚手架”，容易在项目长大后出现重复请求、多个状态副本和临时拼接的权限判断。

例如订单编辑页，服务器记录是已保存事实，输入框是未提交草稿，筛选条件属于URL，保存中和保存失败属于请求状态。它们的生命周期不同，不应塞进同一个全局对象再靠Effect互相同步。

![React状态快照、更新队列、提交与外部同步](/front/frontend-foundations-series/ep31-flow.svg)

## 初始化与版本边界

新建完整应用先评估带路由和数据加载约定的框架；独立后台、已有后端或学习组件模型，可以用Vite。Create React App已于2025年2月宣布弃用，不再作为新项目入口。以下示例采用React19组件API，不依赖React Compiler。

```bash
npm create vite@latest order-editor -- --template react
cd order-editor
npm install
npm run dev
```

构建脚本、Node要求与锁文件以生成项目为准。入口使用`react-dom/client`的`createRoot`；React19已移除`ReactDOM.render`。函数组件默认值写在参数中，运行时接口数据仍要校验，TypeScript类型不能验证网络JSON。

## 用订单草稿组织组件

将下面内容放到`src/App.jsx`。这是本地草稿示例，点击确认只生成预览，不代表已创建服务器订单。输入保留字符串，可以表达用户暂时清空输入框的状态；转换和验证放在提交边界。

```jsx
import { useReducer } from 'react';

const initial = { customer: '', quantity: '1', preview: null };

export function reducer(state, action) {
  switch (action.type) {
    case 'customer':
      return { ...state, customer: action.value, preview: null };
    case 'quantity':
      return { ...state, quantity: action.value, preview: null };
    case 'preview':
      return { ...state, preview: action.value };
    case 'reset':
      return { ...initial };
    default:
      return state;
  }
}

function QuantityInput({ value, onChange }) {
  return <label>数量
    <input type="number" min="1" max="5" step="1"
      value={value} onChange={e => onChange(e.target.value)} />
  </label>;
}

export default function App() {
  const [draft, dispatch] = useReducer(reducer, initial);
  const quantity = Number(draft.quantity);
  const valid = draft.customer.trim().length > 0
    && Number.isInteger(quantity) && quantity >= 1 && quantity <= 5;

  function submit(event) {
    event.preventDefault();
    if (!valid) return;
    dispatch({ type: 'preview', value: {
      customer: draft.customer.trim(), quantity, totalCents: quantity * 1990
    } });
  }

  return <main>
    <h1>订单草稿</h1>
    <form onSubmit={submit}>
      <label>客户
        <input value={draft.customer} onChange={e =>
          dispatch({ type: 'customer', value: e.target.value })} />
      </label>
      <QuantityInput value={draft.quantity} onChange={value =>
        dispatch({ type: 'quantity', value })} />
      <button type="submit" disabled={!valid}>确认草稿</button>
      <button type="button" onClick={() => dispatch({ type: 'reset' })}>
        重置
      </button>
    </form>
    {!valid && <p>客户不能为空，数量必须为1至5的整数。</p>}
    {draft.preview && <p role="status">
      {draft.preview.customer}：{draft.preview.quantity}件，
      {(draft.preview.totalCents / 100).toFixed(2)}元，尚未提交服务器。
    </p>}
  </main>;
}
```

父组件持有草稿，子组件接收`value`并报告变更。编辑任一字段即清空旧预览，防止界面继续显示已经失效的金额。金额由数量计算，不另存一份`total`再用Effect同步。reducer是纯状态转换，不能在其中请求、写存储或生成随机ID；这些行为应在事件或专门的数据层发生。

小表单直接用`useState`也合理。当“编辑、校验、确认、重置”共同改变多个字段时，reducer让迁移集中可查。若多个页面共同使用草稿，再考虑上移状态或共享容器；Context解决跨层传递，不自动提供服务器缓存、持久化或细粒度订阅。

## 路由、请求与保存

例如`/orders/42?tab=history`，订单身份和可分享的页签来自URL。React Router是独立路由生态，具有声明式、数据和框架等使用模式，选择后按同一模式组织loader、错误和导航；不能称其为React内置官方路由。

真实保存要形成`editing → saving → saved / error / conflict`闭环。保存时使用当前草稿快照，禁用重复提交，失败保留草稿，409冲突提示重新读取版本。接口返回成功后，以服务器返回的订单号、版本和金额更新界面。服务器必须重新校验价格、库存和身份，前端路由守卫只改善导航体验。

Effect用于与外部系统同步，如订阅、定时器和浏览器API。搜索请求要清理旧任务并阻止迟到结果覆盖新查询；错误边界主要捕获后代渲染错误，不代替事件处理器和异步请求的`try/catch`。`Suspense`也不会自动接管普通Effect里的`fetch`。

## 性能与排查

先用Profiler定位提交耗时和重复更新，再判断是否需要拆组件、虚拟列表或缓存。`memo`、`useMemo`、`useCallback`是优化手段，不能作为业务正确性的前提；缓存也不承诺永久保留。列表用稳定业务ID作为key，筛选与排序时不能依靠数组下标保持输入草稿。

| 现象 | 检查与验证 |
| --- | --- |
| 点击多次却只增加一次 | 检查状态快照与更新队列，依赖前值时用函数更新 |
| 开发环境请求或订阅重复 | 检查StrictMode开发检查及Effect清理，不靠删除检查掩盖泄漏 |
| 输入后别的行内容错位 | 检查key是否稳定，避免用随机值或排序后索引 |
| 线上刷新子路由404 | 检查服务器SPA回退与部署base，API和静态资源不能都回退HTML |
| 请求失败后旧内容看似最新 | 明确loading/error与旧数据展示策略，标记结果所属查询 |

组件快照、Hooks规则和清理机制见[React基础模型](../frontend-foundations-series/31-react-components-hooks-state.md)。应用状态选型见[状态管理](../state-management/)，渲染与交付见[元框架](./meta-frameworks.md)和[部署](../deployment/)。

验收本地示例时，先确认空客户不可提交，再输入客户和数量2，结果应为39.80元；修改数量后旧预览消失，清空数量和输入小数都不可确认，重置后恢复数量1与空客户。接入服务器后，还要补失败、超时、重复提交和版本冲突验证。
