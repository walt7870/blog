# Angular：组件、注入作用域与 Signals

订单后台的两个编辑区，都要保存自己的未提交数量；顶部购物车又需要跨页面共享。关键问题不是“service 能不能存数据”，而是“哪个 injector 创建它、谁能拿到同一实例、实例何时销毁”。Angular 将组件模板、DI、路由和表单组织在同一套框架约束中，这些边界比目录层数更影响应用行为。

本页使用 standalone 组件、`signal`、`computed` 和显式的组件输入依赖。已有 NgModule 应用可以逐步迁移，不需要为了使用 Signals 一次性重建全部模块。

![Angular 根注入器、局部提供者与购物车状态的关系](/front/frontend-foundations-series/ep33-flow.svg)

## 组件读取状态，事件修改状态

下面是 `cart.service.ts`。数量范围为 1 至 5，派生金额使用整数分；这里只演示客户端规则，不代表服务器承认库存或价格。

```ts
import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly quantityState = signal(1);
  readonly quantity = this.quantityState.asReadonly();
  readonly totalCents = computed(() => this.quantity() * 1990);

  add() {
    this.quantityState.update(quantity => Math.min(5, quantity + 1));
  }

  reset() {
    this.quantityState.set(1);
  }
}
```

`app.ts` 注入同一个 service，并用模板绑定读取状态。组件显式导入 `DecimalPipe` 供 `number` 管道使用；standalone 的含义是直接声明模板依赖，不是没有依赖。

```ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <p>数量 {{ cart.quantity() }}，
        共 {{ cart.totalCents() / 100 | number:'1.2-2' }} 元</p>
      <button type="button" (click)="cart.add()" [disabled]="cart.quantity() >= 5">
        加一件
      </button>
      <button type="button" (click)="cart.reset()">重置</button>
    </main>
  `,
})
export class App {
  readonly cart = inject(CartService);
}
```

在已有 Angular CLI standalone 项目中，用 `bootstrapApplication(App)` 作为入口。初始为 1 件、19.90 元，连续增加到 5 件、99.50 元时禁用，重置恢复。模板中的 `{{ }}` 是插值，`[disabled]` 绑定属性，`(click)` 绑定事件；更复杂的判断放到组件或业务服务，避免模板反复执行昂贵计算。

signal 的读取是函数调用，`quantity()` 与函数对象 `quantity` 不同。computed 惰性求值并缓存，根据实际读取动态追踪依赖。修改嵌套对象却仍返回同一个引用，可能不会产生预期通知；应采用新对象或清楚的不可变更新边界。`asReadonly()` 隐藏写 API，但不是深度冻结对象。

## DI 决定实例共享范围

`providedIn: 'root'` 通常让同一应用根注入器中的消费者共享实例。组件的 `providers: [CartService]` 则在该组件作用域重新提供，当前组件及其可见后代可获得这份局部实例，它会遮蔽祖先提供者。兄弟编辑区各有 provider 时互不共享；不要把“service”这个类名当成全局单例保证。

例如编辑表单的临时草稿适合随页面或编辑区销毁；顶部购物车需要应用范围共享。如果在购物车按钮组件中误加局部 provider，就会出现“详情页加了商品，顶部数量没变”。反过来，把全部订单草稿放在根 service，又可能在切换订单时保留上一次的内容。

`inject()` 必须处于注入上下文，例如组件字段初始化或 provider 工厂。事件点击后再随意调用 `inject(CartService)` 会越过这个边界；先在字段获取依赖，再让事件调用已有对象。测试时可以按 token 替换依赖，但应同时验证业务结果，不能只断言“注入成功”。

HTTP 拦截器、路由级 provider、元素注入器各有解析关系；排查时从实际消费者出发看最近提供者。根作用域也不能作为跨 SSR 请求保存用户事实的默认位置，应核对服务端应用与请求的创建和销毁边界。

## Signals、Effect 与 RxJS 的分工

数量和总价属于同步状态与派生结果，使用 signal 和 computed。写浏览器存储、连接第三方图表等外部同步才需要 effect，并处理清理和浏览器环境。不要用 effect 把总价复制进另一个 signal，也不要靠 effect 级联写状态来拼装业务流程。

RxJS 适合随时间发生的序列：路由参数、表单变化、HTTP 或实时事件。HttpClient 的 Observable 通常在订阅后发送请求，重复订阅可能重复发送；`switchMap` 在新值到来时取消旧的内部订阅，但不能保证已经发出的服务端写入没有生效。

商品搜索可将“关键字变化 → 去重 → 切换查询 → 成功或错误状态”组成流。`catchError` 放在单次查询内部可使后续关键字继续工作，放到外层却返回一个完成流可能让搜索以后不再响应。组件销毁时使用 `AsyncPipe`、`takeUntilDestroyed` 或明确撤销订阅，不能把短 HTTP 请求自动结束外推到永久 WebSocket。

`toSignal` 可以把 Observable 接到模板使用的 signal，但应复用转换结果，避免每次调用重复订阅，并明确首次值和错误处理。Signals 不替代所有流操作，Observable 也不要求每个同步变量都变成流。

## 路由、表单与业务边界

| 对象 | 订单编辑中的职责 | 失败处理 |
| --- | --- | --- |
| Router | URL携带订单ID，懒加载页面 | 无效ID、加载失败和未保存离开 |
| 页面组件 | 加载、草稿、提交与结果反馈 | 保存失败保留草稿，允许重试 |
| 领域 service | 数量与业务动作 | 错误传给调用方，避免静默吞掉 |
| API service | 协议字段、鉴权请求与响应 | 区分网络、HTTP、字段合同 |
| Reactive Forms | 字段值、验证、dirty与touched | invalid/pending阻止提交并定位错误 |

前端路由守卫改善访问流程，权限仍须后端检查。复杂表单可以用 `FormGroup` 和 `FormControl` 显式组织模型；`dirty` 表示用户改过，不等于当前值必然不同于服务端基线；`touched` 表示控件经历过交互焦点边界，也不等于校验失败。异步校验的 pending、提交中的 saving、保存后的成功是不同状态，不宜共用一个布尔值。

表单默认可能不在提交值中包含禁用字段，需要按业务选择 `value` 或 `getRawValue()`，不能把禁用当作后端信任依据。多标签同时编辑同一订单还需要版本号或 ETag；表单验证不能防止覆盖他人的保存。

## 变更检测与验收

OnPush 不等于“只在输入引用变了才更新”。组件事件、模板消费的 signal 更新、显式标记等也可使相关视图需要检查。具体调度还取决于应用是否使用 Zone.js 或 zoneless 配置；不能拿旧版全局异步触发的模型解释所有新项目。

性能排查先固定订单行数和操作，观察 Angular DevTools 与浏览器主线程。长列表使用稳定 `track` 标识，避免每次都重建行；昂贵派生结果才考虑缓存。把所有组件改成 OnPush 不能代替修复状态归属或副作用循环。

本例验收数量上限、重置和金额后，再创建两个局部 provider：修改 A 不应影响 B；移除局部 provider 后两个消费者应共享根实例。表单另测 invalid、pending、接口失败、重复提交和未保存离开。完整应用还需真实 HTTP、路由刷新和服务端权限验收，机制例子不能代替这些结果。更多框架选型见 [架构比较](./23-framework-architecture-comparison.md)。
