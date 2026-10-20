# 浏览器 DevTools 技术体系：DOM、网络、运行时与性能

商品列表的“加载更多”可能看不见、点击没反应、请求报错，也可能数据已返回但界面仍卡顿。DevTools 的价值在于把这些现象定位到实际节点、代码、响应和耗时。面板没有固定的必经顺序，应从当前现象选择入口。

![按页面故障选择DevTools证据入口](/front/frontend-foundations-series/ep04-flow.svg)

## 节点存在却看不到：Elements 与 Computed

先在 Elements 搜索按钮。没有节点时，检查条件渲染、接口数据和脚本异常；节点存在时，再查最终样式、盒模型和祖先裁切。`display:none` 不占布局空间，`visibility:hidden` 通常保留布局空间，`opacity:0` 的元素仍可能截获指针或获得焦点，三者不能当成相同状态。

在 Console 可以针对选中的元素 $0 查看：

```js
({
  rect: $0.getBoundingClientRect().toJSON(),
  display: getComputedStyle($0).display,
  visibility: getComputedStyle($0).visibility,
  opacity: getComputedStyle($0).opacity,
});
```

Computed 显示的是最终值，Styles 帮助追到规则来源。临时关闭某条 CSS 后按钮出现，是定位线索；刷新后仍应在源码修复并复验。不要把面板里的临时修改当成已保存代码。

## 点击没有结果：Console 与 Sources

Console 先看异常和警告，注意当前执行上下文是否选中了正确 iframe。`querySelector` 返回 null 可能是选择器错误、节点尚未创建或选错文档，不足以直接断言“框架没加载”。

在 Sources 设置事件监听断点或在处理函数上断点，确认 click 是否到达、当前分支如何判断、变量是什么。调用栈说明执行来源，作用域说明当时输入。Source Map 可以映射到源文件，但必须与部署 bundle 版本对应；映射错误时，应先核对产物和 release 标识。

## 请求有问题：Network 分开看传输与业务

打开 Network 后复现，保留请求 URL、方法、状态、响应头、响应体、Initiator 和 Timing。`fetch` 收到 404 或 500 通常仍会 resolve，只有主动检查 `response.ok` 后才会按业务逻辑抛错。没有代码输出时，Console 未必出现任何提示。

```js
async function loadProducts() {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
loadProducts().catch(error => console.error('加载商品失败', error));
```

收到 200 也不能证明数据满足页面合同：可能返回登录 HTML、错误字段或旧缓存。区分响应内容、JSON 解析和字段校验，才能确定失败在何处。Network 看得到响应不代表脚本一定能读它，跨源读取还受 CORS 约束。

## 数据已返回却卡顿：Performance

从点击之前开始录制，到结果显示后停止。把请求完成时间与主线程任务放在同一时间轴，查看长脚本、重复布局、绘制和交互延迟。如果每添加一行都读取布局并立即写样式，可能造成多次同步布局；修复前后应在相同数据量和节流条件下比较。

断点暂停会改变时序，Console 大量输出也可能增加成本。性能结论用正常执行的录制验证；不要拿断点调试期间的耗时作为用户体验数据。

## 把排查结论写成可复现记录

| 现象 | 应保留的关键证据 | 修复后的验收 |
| --- | --- | --- |
| 按钮消失 | DOM存在性、最终样式、遮挡元素 | 桌面和窄屏都可见、可聚焦 |
| 点击无结果 | 事件断点、异常位置、分支输入 | 鼠标与键盘都完成一次操作 |
| 列表加载失败 | 请求与响应合同、错误分支 | 成功、空列表和失败重试 |
| 列表更新卡顿 | 同条件录制、长任务及布局次数 | 同数据量复测并比较交互耗时 |

分享 HAR、截图和控制台记录前检查 Cookie、Authorization、查询参数和响应中的隐私数据。排查证据应保留技术因果关系，不能顺带传播凭据。
