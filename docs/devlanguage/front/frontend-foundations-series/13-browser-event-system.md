# 浏览器事件系统：监听、冒泡、委托与默认行为

购物车每行有“移除”按钮，按钮里还包含图标。点击图标时，事件目标可能是内部元素，监听器却放在整个列表上。理解传播路径与默认行为，才能让新增行、键盘操作和嵌套组件都按预期工作。

![捕获、目标与冒泡期间的监听器位置](/front/frontend-foundations-series/ep13-flow.svg)

## 监听器在传播途中执行

事件沿传播路径进入捕获、到达目标，并在事件允许冒泡时向外传播。捕获监听使用capture:true，默认监听通常在目标或冒泡阶段执行。监听器不是等整条传播结束后才统一运行。

target是在当前上下文看到的事件目标，currentTarget是当前监听器所在对象；后者在回调执行之外通常为null。Shadow DOM会产生事件重定向，是否跨边界还受composed影响，因此target不总能当成最内部原始节点。异步逻辑要提前保存所需节点或业务ID。

## 动态列表使用有边界的委托

```html
<ul id="cart-lines">
  <li><span>桌面收纳盒</span>
    <button type="button" data-remove="box"><span>移除收纳盒</span></button>
  </li>
  <li><span>文件收纳架</span>
    <button type="button" data-remove="rack"><span>移除收纳架</span></button>
  </li>
</ul>
<p id="cart-status" role="status" tabindex="-1"></p>
<script>
  const cartLines = document.querySelector('#cart-lines');
  cartLines.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-remove]');
    if (!button || !cartLines.contains(button) ||
        button.closest('ul') !== cartLines) return;
    const line = button.closest('li');
    const nextFocus = line.nextElementSibling?.querySelector('button') ??
      line.previousElementSibling?.querySelector('button');
    const id = button.dataset.remove;
    line.remove();
    const status = document.querySelector('#cart-status');
    status.textContent = '已移除：' + id;
    (nextFocus ?? status).focus();
  });
</script>
```

closest可以从内部span回到按钮；contains和最近列表判断限制委托范围，避免嵌套列表或外部祖先被误处理。示例有意只演示本地删除，服务端购物车应先设计失败恢复与并发更新。删除后把焦点移到相邻操作；最后一项删除后聚焦状态文字，实际产品还应提供空态与明确的后续入口。

## 阻止传播与取消默认动作分别处理

stopPropagation阻止事件继续沿路径传播，不会自动阻止同一节点其他监听器，也不会取消默认导航。stopImmediatePropagation还阻止同节点后续监听器。preventDefault只在事件可取消且监听器允许取消时有效，不停止传播；passive监听器中不能用它取消滚动等默认动作。

注册函数返回false通常不能代替这些API。前端路由拦截链接时，还应保留修饰键、新标签、外部链接和下载等原生行为；不要对页面所有click一律preventDefault。

## 选择适合的事件与生命周期

focus和blur不按普通冒泡处理，委托可考虑focusin/focusout或捕获监听。mouseenter也不等同于mouseover的冒泡规则，不能把所有事件都套成click模型。原生button的键盘激活会产生click，通常无需再给Enter和Space重复绑定相同业务动作，否则可能执行两次。

临时组件销毁时应移除长期对象上的监听器。可用AbortController的signal集中管理，也可用同一个函数引用及对应capture值removeEventListener。重新创建同样源码的匿名箭头函数不是同一个引用，不能据此移除旧监听器。

## 验证一次操作只处理一次

分别用鼠标点击内部span、用Tab加Enter或Space激活按钮，检查每次只删除一项且状态对应正确ID。再插入新行，不增加监听器也应能删除；嵌套列表不应误触外层处理。排查时记录eventPhase、target与currentTarget，再决定是传播问题还是业务分支问题。
