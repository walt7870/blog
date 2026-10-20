# Angular：独立组件、表单与服务边界

Angular将组件、依赖注入、路由、HTTP与表单纳入同一平台。统一约定能减少项目间组织差异，但不能自动保证业务边界正确。订单编辑仍要区分输入草稿、派生金额、请求状态和服务器事实。

以下采用Angular21系列的独立组件和稳定Reactive Forms API。旧NgModule应用仍可维护与渐进迁移，不需要为了使用新组件立即重写全部模块。AngularJS1.x是另一套技术，不能把相关插件直接当作现代Angular插件使用。

![Angular根注入器、局部提供者与购物车状态](/front/frontend-foundations-series/ep33-flow.svg)

## 初始化与配置位置

```bash
npx @angular/cli@21 new order-editor --standalone --routing --style=css
cd order-editor
npm start
npm run build
```

CLI、Angular、Node和TypeScript按所选版本兼容矩阵配套，锁文件进入仓库。独立组件从`main.ts`通过`bootstrapApplication`启动；应用级providers通常放在`app.config.ts`，路由在`app.routes.ts`。新CLI的文件命名可能与旧`app.component.ts`不同，应以实际生成入口为准。

`ng lint`和端到端命令需要配置对应builder或工具，不能假定初始化后都可运行。现代CLI构建也不能一概交给Webpack分析器读取，先确认实际builder和stats格式。

## 用响应式表单表达输入合同

下面是一个可独立启动的本地报价表单。用它替换生成项目的`src/main.ts`可以验证核心行为；真实应用应拆回组件与配置文件。输入是草稿，确认后只形成报价预览，不代表服务器订单创建成功。

```ts
import { Component, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { AbstractControl, ValidationErrors } from '@angular/forms';

function integer(control: AbstractControl): ValidationErrors | null {
  return Number.isInteger(control.value) ? null : { integer: true };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>订单报价</h1>
    <form [formGroup]="form" (ngSubmit)="confirm()">
      <label>数量
        <input type="number" formControlName="quantity" min="1" max="5" step="1">
      </label>
      @if (form.controls.quantity.invalid) {
        <p role="alert">数量必须为1至5的整数。</p>
      }
      <button type="submit" [disabled]="form.invalid">确认报价</button>
      <button type="button" (click)="reset()">重置</button>
    </form>
    @if (preview(); as result) {
      <p role="status">{{ result.quantity }}件，{{ result.amount }}元，仅本地报价。</p>
    }
  `
})
export class App {
  readonly form = new FormGroup({
    quantity: new FormControl<number | null>(1, {
      validators: [Validators.required, Validators.min(1), Validators.max(5), integer]
    })
  });
  readonly preview = signal<{ quantity: number; amount: string } | null>(null);

  confirm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const quantity = this.form.controls.quantity.value!;
    this.preview.set({ quantity, amount: (quantity * 1990 / 100).toFixed(2) });
    this.form.disable();
  }

  reset(): void {
    this.form.enable();
    this.form.reset({ quantity: 1 });
    this.preview.set(null);
  }
}

bootstrapApplication(App).catch(console.error);
```

HTML的`min/max/step`改善输入体验，Angular验证器才决定表单状态；整数验证防止1.5通过单纯范围检查。数值输入清空时可能产生null，不能仅用非空断言代替验证。确认后禁用编辑以保持报价与输入一致，重置重新启用。生产保存还需要失败后恢复编辑，并保留草稿。

表单禁用控件通常不进入`form.value`，需要包含禁用值时明确使用`getRawValue()`；这不是跳过业务验证的理由。Signal适合界面状态和派生值，Reactive Forms组织输入、校验与交互状态，RxJS组织异步流，不必强行把三者全部改写成同一种工具。

## 服务、HTTP与路由

组件的`imports`解决模板使用哪些组件、指令和管道，`providers`解决注入器创建哪些服务，二者不同。`providedIn: 'root'`通常提供应用根作用域实例；组件再次声明providers会创建局部实例，并不保证全站只有一个对象。订单编辑草稿可放组件或路由作用域，登录态等共享服务则明确根生命周期。

HTTP客户端需要应用providers注册，例如配置中使用`provideHttpClient()`，不是只导入`HttpClient`类型就能注入。`http.get<Order>()`的泛型只帮助编译器，不执行JSON运行时校验。组件直接订阅长生命周期流时，使用`takeUntilDestroyed`等清理方式；参数切换查询可用`switchMap`取消旧订阅。普通请求完成与组件销毁是不同边界，不能用“HTTP通常完成”推断任意组合流无泄漏。

路由使用`provideRouter(routes)`注册，独立页面可通过`loadComponent`延迟加载，容器模板导入`RouterOutlet`。守卫返回布尔或重定向结果；它改善客户端导航，服务端仍需鉴权。认证拦截器只能给受信任的API目标附加凭证，不能给任意第三方资源统一附加Authorization；刷新令牌还要处理并发合并、一次重试和失败退出。

## 维护与验收

OnPush会跳过满足条件的子树，但输入引用、模板事件、信号通知和显式标记等都可能触发检查，不能解释为“只在Input变化时运行”。异步回调中原地改普通字段，尤其在zoneless环境，不应假定必然触发界面更新。具体检测机制与注入器实例实验见[Angular基础模型](../frontend-foundations-series/33-angular-di-signals-application-structure.md)。

| 现象 | 检查与验证 |
| --- | --- |
| 模板不认识formGroup | 独立组件是否导入ReactiveFormsModule |
| NullInjectorError | 应用provider注册位置、注入器父子关系与测试替身 |
| 修改草稿影响另一页面 | 服务作用域是否过大，是否共享同一个可变对象 |
| 重复查询或切换后旧数据覆盖 | 路由参数流、重复订阅、取消与结果归属 |
| 页面销毁后仍有回调 | 订阅、计时器、监听器是否有销毁路径 |

验证本地报价时，数量2得到39.80元且表单锁定；重置恢复1并清除结果；清空、0、6和1.5都不可确认。真实订单API还要验证HTTP失败、后端校验、版本冲突和保存后回读。应用层的测试与发布合同分别见[测试策略](../testing/)和[前端部署](../deployment/)。
