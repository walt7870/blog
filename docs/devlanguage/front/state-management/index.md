# 前端状态管理

订单页面同时存在筛选条件、未提交的数量、服务端库存、当前用户和“保存中”提示。如果把它们全部放进一个全局对象，容易出现切换账号还看到旧订单、刷新丢筛选、提交失败却清空草稿等问题。先确定事实归属和生命周期，再选库。

![订单页面状态归属与提交后的同步](/front/engineering/state-ownership.svg)

## 状态放在哪里

| 对象 | 建议归属 | 生命周期与约束 |
| --- | --- | --- |
| 当前页筛选、页码 | URL与路由 | 可分享、可刷新；解析并校验参数 |
| 编辑数量、字段错误 | 组件或表单模型 | 提交成功前保留，关闭时明确丢弃策略 |
| 跨页购物车、主题 | 客户端共享store | 明确持久化、版本迁移与清理 |
| 库存、订单详情 | 服务端查询缓存 | 服务端是事实来源，客户端可能过时 |
| 权限与会话 | 身份上下文 | 前端控制展示，服务端仍须鉴权 |

例如打开订单A再快速切到B，A的慢响应不能覆盖B。查询键要包含订单标识及影响返回的账号、租户或筛选范围；手写请求则需取消或比对请求标识。将所有结果塞到`currentOrder`并不自动解决竞态。

## 本地与共享状态

React的`useState/useReducer`适合页面内部状态；Context传递作用域数据，不等于具备细粒度订阅的store。Context值变化会通知消费者，先根据Profiler确定问题，再拆分读写或采用选择器方案，不能靠到处添加`memo`保证性能。

需要集中动作、调试与中间件时可评估Redux Toolkit；需要小型外部store时可评估Zustand。Zustand5选择器每次创建新对象时须注意快照稳定性，可分别选择字段或使用`useShallow`。不要把是否采用某库只按“小中大型”项目划分。

Vue新项目通常评估Pinia，Vuex用于已有项目维护。下面是可独立运行的Pinia3草稿合同，金额使用整数分，数量限定1至5：

```js
// cart.js
import { defineStore } from 'pinia';

export const useCart = defineStore('cart', {
  state: () => ({ quantity: 1 }),
  getters: {
    totalCents: state => state.quantity * 1990,
  },
  actions: {
    setQuantity(value) {
      if (!Number.isSafeInteger(value) || value < 1 || value > 5) {
        throw new RangeError('数量必须为1至5的整数');
      }
      this.quantity = value;
    },
    reset() {
      this.$reset();
    },
  },
});
```

应用入口需要`app.use(createPinia())`；输入框先处理空字符串再转数字。该store是本地报价草稿，不能代表后台库存锁定或最终成交价格。SSR应用按请求创建store与查询客户端，不能让进程级单例串用不同访问者的数据。

Recoil仓库已在2025年归档，维护老项目应核对React兼容性与迁移成本，不再作为新项目默认候选。迁移先明确状态合同和测试，避免同一事实长期同时存于两个store。

## 服务端缓存

TanStack Query5使用`staleTime`表示数据保持新鲜的时长，`gcTime`表示无观察者后的缓存回收时长。新鲜、过期、正在请求、已报错和缓存已删除是不同状态；过期不等于立即删除。查询键相同时才共享同一缓存条目。

以下React片段假设外层已有`QueryClientProvider`，`tenantId`来自可信会话上下文，后端仍重新校验身份：

```js
import { useQuery } from '@tanstack/react-query';

export function useOrder(tenantId, orderId) {
  return useQuery({
    queryKey: ['order', tenantId, orderId],
    enabled: Boolean(tenantId && orderId),
    staleTime: 30_000,
    gcTime: 300_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        '/api/orders/' + encodeURIComponent(orderId),
        { signal, credentials: 'same-origin' },
      );
      if (!response.ok) throw new Error('订单读取失败');
      const data = await response.json();
      if (!data || typeof data.id !== 'string' ||
          !Number.isSafeInteger(data.totalCents)) {
        throw new Error('订单数据不符合合同');
      }
      return data;
    },
  });
}
```

保存成功后使用服务端返回值更新详情，再使对应列表查询失效。失效是重新同步的信号，不是事务提交证明。乐观更新还必须保存快照、处理失败回滚与并发覆盖；支付确认、库存扣减等操作不能仅凭前端乐观结果展示最终成功。

退出账号时先结束旧身份请求，移除包含身份数据的查询与持久缓存，再切换界面。不要持久化密码、会话令牌或无边界的完整用户资料。换了查询键能避免读错条目，但不能替代清除不该保留的数据。

## 提交状态与失败恢复

表单应明确“编辑中→校验→提交中→成功或失败”。失败时保留草稿和错误说明；提交中禁用按钮只能减少重复点击，服务端仍需幂等保护。动态字段使用稳定标识，不能用数组下标造成删除后错误提示串行。

可把React Hook Form或Vue表单库用于字段校验和dirty状态，但页面仍负责接口错误、取消、未保存离开与成功后的清理。服务端校验是最终边界，前端类型和输入限制只是即时反馈。

## 验证

用两个不同账号分别打开相同订单号，确认缓存不串用；让A请求晚于B返回，确认页面仍显示B；保存失败确认草稿未清空，保存成功确认列表和详情一致。持久化结构升级后还要验证旧数据迁移与主动清除。

本地数量合同可独立测试，服务端查询以受控响应测试取消、错误和数据校验，最后在浏览器跑完整编辑流程。组件边界见[React](../framework/react.md)和[Vue](../framework/vue.md)，验证分层见[测试策略](../testing/)。
