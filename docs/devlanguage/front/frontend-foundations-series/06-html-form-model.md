# HTML 表单模型：label、输入控件与原生校验

配送信息表单需要知道“这是邮箱还是备注”“哪些字段提交”“错误出现后焦点在哪里”。HTML 已有一套控件关联、数据收集和约束校验模型，框架可以在其上增加状态管理，不必从普通 div 和 click 事件重新模拟全部行为。

![原生表单校验、提交与服务端验证的分支](/front/frontend-foundations-series/ep06-flow.svg)

## 用可提交的字段建立数据合同

```html
<form id="delivery" action="/api/delivery" method="post">
  <label for="email">收件邮箱</label>
  <input id="email" name="email" type="email" required autocomplete="email">
  <label for="note">配送备注</label>
  <input id="note" name="note" maxlength="100">
  <label><input name="updates" type="checkbox" value="yes">接收配送通知</label>
  <button type="submit" name="intent" value="save">保存配送信息</button>
</form>
```

for 与 id 建立 label 关联，name 定义提交键，当前 value 定义提交值。id 用于文档定位和关联，不能代替 name。placeholder 会随输入消失，不能代替始终可见的字段名称。这里 action 仅表示服务端接口合同，必须由应用实现，不能把 HTML 片段本身视为完整后端。

## 哪些值会进入 FormData

文本输入的当前值可以不同于初始 value 属性。复选框使用 checked 状态决定是否提交，value 决定勾选后的值；没有 value 时通常为 `on`。radio 在同一表单的同名组内互斥，select 按选中项收集值。同名字段可能有多个值，不能一律用普通对象覆盖。

| 控件状态 | 提交结果 |
| --- | --- |
| 有name、未禁用的文本框 | 包含当前值，包括空字符串 |
| 没有name或被disabled的控件 | 不进入数据集合 |
| 未勾选checkbox / radio | 不提交该项，而不是自动提交false |
| readonly文本框 | 通常仍提交，且可被脚本修改 |
| submit按钮 | 仅实际提交者进入；FormData需显式传入该提交者 |

```js
const form = document.querySelector('#delivery');
form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form, event.submitter);
  console.log([...data.entries()]);
});
```

这段脚本只展示收集结果，不发送请求。不勾通知时结果里没有 updates；勾选后出现 `updates=yes`。用 `data.getAll(name)` 读取同名多值。`new FormData(form)` 只收集数据，不会自动执行约束校验或提交请求。

## 原生校验何时发生

用户激活提交按钮或调用 `requestSubmit()` 时，默认先执行交互式约束校验，失败则阻止提交；通过后触发 submit 事件。`novalidate` 或提交者的 `formnovalidate` 会跳过该校验。`form.submit()` 直接提交，不执行同一套校验，也不触发 submit 事件，因此需要模拟用户提交时优先使用 requestSubmit。

required 检查必填，type=email 检查语法，不验证邮箱存在或归属。minlength 的交互校验还有用户输入与程序赋值差异，不能依靠脚本设置值后通过检查来证明所有规则满足。跨字段业务规则可使用 `setCustomValidity()`，条件恢复后必须用空字符串清除旧错误。

## 服务端决定是否接受

客户端可以被修改，也可能完全绕过页面发送请求。服务端必须重新验证长度、格式、身份、权限及配送业务规则，防止额外字段被直接写入。Cookie 认证的写请求还要考虑 CSRF 防护，不能因使用 POST 就认定安全。

成功后明确显示保存结果；校验失败时保留输入，将错误关联到对应字段；网络失败时恢复提交能力。禁用按钮能减少重复点击，但可靠的重复写入控制需要服务端幂等或业务约束。

## 验证这张表单

依次尝试空邮箱、非法邮箱、合法邮箱，确认前两者不会触发上述 submit 日志；切换通知勾选并检查数据项差异。再临时移除 name、添加 disabled 和 readonly，对照数据结果。最后用键盘完成输入和提交，确认 label、错误与焦点可理解。

框架里的受控输入与 v-model 应保留 name、label、类型和提交关系；复杂表单架构见[前端应用层架构](./25-frontend-application-architecture.md)。
