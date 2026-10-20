# Web 可访问性基础：语义、键盘与可感知界面

配送表单“提交失败”若只把边框染红，低视力用户可能无法识别原因，读屏用户也不知道哪个字段出错。可访问性要落实到一次完整操作：找到控件、理解含义、输入数据、发现错误、修正并完成，而不只是检查几个ARIA属性。

![表单出错到修正完成的可访问交互路径](/front/frontend-foundations-series/ep10-flow.svg)

## 原生语义提供起点，名称仍需检查

按钮使用 button，导航使用 a href，字段使用 label 关联。原生按钮提供角色和键盘行为，但空按钮不会自动得到有意义的名称。图标按钮可使用 aria-label，且名称应表达动作，例如“关闭配送信息”，而不是“叉号”。有可见文字时，应保留与该文字一致的可访问名称。

ARIA用于补充关系和状态。`aria-expanded` 要与折叠内容同步；`aria-disabled` 不会自动阻止动作；`aria-hidden` 不能用来隐藏仍可获得焦点的后代。声明了 role 也要实现相应键盘规则，不能只追求检查工具不报错。

## 错误信息与字段建立关系

```html
<form id="address-form" novalidate>
  <label for="address-email">收件邮箱</label>
  <input id="address-email" name="email" type="email" required
    aria-describedby="email-help">
  <p id="email-help">用于接收配送进度。</p>
  <p id="email-error" hidden>请填写有效邮箱，例如 reader@example.com。</p>
  <button type="submit">保存</button>
  <p id="save-status" role="status"></p>
</form>
<script>
  const addressForm = document.querySelector('#address-form');
  const emailField = document.querySelector('#address-email');
  const errorText = document.querySelector('#email-error');
  const saveStatus = document.querySelector('#save-status');
  addressForm.addEventListener('submit', event => {
    event.preventDefault();
    const invalid = !emailField.validity.valid;
    errorText.hidden = !invalid;
    emailField.setAttribute('aria-invalid', String(invalid));
    emailField.setAttribute('aria-describedby',
      invalid ? 'email-help email-error' : 'email-help');
    saveStatus.textContent = '';
    if (invalid) emailField.focus();
    else saveStatus.textContent = '输入检查通过，尚未发送到服务器。';
  });
</script>
```

这个示例有意使用 novalidate 接管交互式错误展示，仍通过 validity 检查原生约束。失败时显示具体错误、关联描述并聚焦字段；成功时只声明本地检查通过，不能伪称服务端已保存。多字段表单可增加带链接的错误摘要，避免每个错误都抢焦点。

## 键盘验收要覆盖进入与退出

Tab 和 Shift+Tab 应按文档逻辑移动，按钮支持 Enter/Space，链接通常用 Enter。Escape 是否退出取决于控件模式，不能要求所有页面元素都处理 Escape。对话框需要进入时合理聚焦、阻止焦点进入背景、可退出、关闭后返回触发者；使用原生 dialog.showModal 可以获得部分平台行为，仍需验证标签、初始焦点和关闭结果。

焦点轮廓必须可见，且不能被固定工具栏遮住。使用 focus-visible 时要保留对浏览器启发式与辅助输入方式的支持，不要假设它只等同于“按了键盘”。不要用正数 tabindex 拼凑视觉顺序。

## 让信息可感知

普通文本在WCAG AA下通常要求至少4.5:1对比度，符合大文本条件时为3:1；必要控件边界和状态等非文本信息另有3:1等适用条件与例外。不能拿某一条数字覆盖图片、禁用控件、装饰内容和所有焦点要求。错误至少同时提供文字，不只用红色。

信息图片提供与目的对应的 alt，纯装饰 img 使用空 alt；链接中的图片如果承担链接名称，就不能随意置空。复杂SVG流程图应有正文解释，节点和关系不能只编码为颜色。视频需要适用的字幕与其他替代内容；自动字幕仍要核对术语和关键数字。

## 工具结果与实际能力分开报告

自动检查可以发现缺名称、部分对比度和结构错误，却不能证明焦点顺序合理、错误易懂、读屏播报完整。人工至少走通键盘流程，并在目标读屏与浏览器组合验证名称、状态变化和错误恢复。未执行读屏测试时，应明确记录范围，不能把DOM属性检查写成读屏通过。

对示例先空提交，确认焦点到邮箱、错误显示且被描述关联；填合法值后再次提交，错误隐藏、aria-invalid变为false、状态提示出现。再放大文字检查输入框、错误和按钮不互相覆盖。测试组织方法见[前端测试分层](./26-frontend-testing-layers.md)。
