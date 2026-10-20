# 语义 HTML 与 DOM 结构

“加入购物车”是动作，“查看配送说明”是导航。两者可以画成相同的绿色矩形，但应分别使用 button 与带 href 的 a。正确元素让浏览器同时获得结构、默认交互和可访问性信息，减少每个页面重复补键盘逻辑的成本。

![DOM、原生行为与可访问性信息的关系](/front/frontend-foundations-series/ep05-flow.svg)

## 一个商品页的文档骨架

```html
<header>
  <nav aria-label="主导航"><a href="/products">全部商品</a></nav>
</header>
<main id="content">
  <h1>桌面收纳盒</h1>
  <section aria-labelledby="details">
    <h2 id="details">商品说明</h2>
    <p>适用于桌面文具分类收纳。</p>
  </section>
  <button type="button">加入购物车</button>
  <a href="/delivery">查看配送说明</a>
</main>
<footer><p>售后服务工作时间：周一至周五</p></footer>
```

main 标识当前主内容，标题描述内容层级，nav 内放导航链接。页面级 header 和 footer 通常对应 banner 与 contentinfo；嵌在 article 或 section 中时则有不同语义。section 通常需要可访问名称才成为 region landmark，aside 的意义也取决于上下文。不能只凭元素名字断言所有区域都产生同一类 landmark。

## DOM 是结构，可访问性树是面向辅助技术的视图

浏览器解析 HTML 得到 DOM，再结合语义、ARIA 和可见性等信息暴露可访问性树。两棵树不是逐节点复制关系。例如用于布局的普通容器可能被合并，隐藏内容可能不再暴露，按钮文字则可作为按钮的可访问名称。

因此既要检查节点，也要检查 role、name 和 state。按钮为空、仅使用没有说明的图标时，即使角色正确，读屏用户仍不知道它做什么。优先提供可见文本；必要时为图标按钮补充准确的 aria-label，但不能让名称与可见标签互相矛盾。

## 原生行为与 ARIA 的职责

button 在未禁用时进入正常焦点顺序，支持 Enter 和 Space 激活；`type="button"` 避免它在表单里意外充当提交按钮。带 href 的链接可用 Enter 激活，并支持打开新标签、复制链接等浏览器操作。给 div 添加 role 不会自动实现这些行为。

| 写法 | 浏览器默认提供 | 需要额外关注 |
| --- | --- | --- |
| `button type="button"` | 按钮角色、焦点、键盘激活 | 名称、禁用策略、动作结果反馈 |
| `a href="/delivery"` | 链接角色、导航、链接菜单 | 目标与文字一致，焦点清晰 |
| `div role="button"` | 声明按钮角色 | 焦点、Enter/Space、禁用、状态与全部行为 |

ARIA 适合描述原生 HTML 尚不能完整表达的状态或复杂控件关系。它不会修复错误的交互设计，`aria-disabled="true"` 也不会自动阻止点击处理函数。复杂菜单、对话框等还需要完整焦点管理，见[可访问性基础](./10-web-accessibility-basics.md)。

## 从源码到实际操作验收

在 Elements 查看真实嵌套，而不只查看原始 HTML 字符串；浏览器解析错误标记时可能修正结构。随后查看 Accessibility 信息，确认标题层级、区域名称、按钮角色和名称。最后只用键盘完成导航和购物车操作，检查焦点位置和动作反馈。

验收应覆盖 Tab 与 Shift+Tab 顺序、按钮的 Enter/Space、链接的 Enter，并确认没有用正数 tabindex 人为打乱文档顺序。焦点轮廓不能仅因视觉偏好被删除；DOM 中存在按钮也不足以证明它能被键盘到达。

语义结构会帮助内容理解和机器导航，但不能承诺某个元素直接提高搜索排名。表单字段关系继续看[HTML 表单模型](./06-html-form-model.md)。
