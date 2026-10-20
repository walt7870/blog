# 轻量框架与 Web Components

轻量框架通常用于特定问题：更小的运行时、更细粒度的响应式、更接近 Web 标准、或在既有页面中增加少量交互。它们不一定适合作为所有业务系统的默认选择，但在合适边界内能明显降低复杂度。

例如公司已有React后台、Vue门户和服务器模板，三端都要显示同一种库存状态。跨框架复用组件应先固定输入属性、事件、样式和无障碍合同，再判断是否适合Web Components；仅把组件打成一个包不会自动解决框架集成。

![跨框架库存组件的属性、事件与样式合同](/front/framework/component-contract.svg)

## 主流方向

| 工具 | 定位 | 适用场景 |
| --- | --- | --- |
| Preact | React API 的轻量替代 | 追求小体积、兼容 React 组件模型 |
| Solid | 细粒度响应式 UI 框架 | 高交互、性能敏感、希望避免虚拟 DOM |
| Qwik | 面向可恢复性和延迟加载 | 首屏性能敏感、复杂页面渐进激活 |
| Lit | Web Components 开发库 | 设计系统、跨框架组件、标准 Web 组件 |
| Alpine.js | HTML 增强式轻量交互 | 服务端模板、活动页、少量交互 |

## 适用边界

轻量框架适合“局部复杂、整体简单”的页面，例如后台系统中的嵌入式小组件、传统服务端模板中的交互增强、跨框架复用的组件库、对首屏 JavaScript 体积极其敏感的页面。

如果项目需要大量业务页面、复杂路由、成熟 UI 组件库、招聘和长期维护，React、Vue 或 Angular 通常更稳。轻量框架不是不能做大型应用，而是需要团队承担生态和工程规范建设成本。

## Web Components

Web Components 适合跨技术栈复用组件，例如设计系统同时服务 React、Vue 和原生页面。Lit 可以降低直接编写 Custom Elements 的样板代码。需要注意的是，Web Components 与框架的事件、表单、样式隔离和服务端渲染集成并不总是零成本。

下面是无需构建的原生Custom Element示例，放到HTML中即可使用。它把库存解析为非负安全整数，使用文本节点更新显示，并向外发出补货意图；不会直接执行真实补货。

```html
<stock-status available="3"></stock-status>
<p id="result" role="status"></p>
<script type="module">
  class StockStatus extends HTMLElement {
    static observedAttributes = ['available'];
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<span></span> <button type="button">申请补货</button>';
      root.querySelector('button').addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('restock-request', {
          detail: { available: this.available }, bubbles: true, composed: true
        }));
      });
    }
    get available() {
      const raw = this.getAttribute('available');
      if (raw === null || !/^\d+$/.test(raw)) return null;
      const value = Number(raw);
      return Number.isSafeInteger(value) ? value : null;
    }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      const count = this.available;
      this.shadowRoot.querySelector('span').textContent =
        count === null ? '库存未知' : `库存${count}件`;
      this.shadowRoot.querySelector('button').disabled = count === null;
    }
  }
  customElements.define('stock-status', StockStatus);
  document.querySelector('stock-status').addEventListener('restock-request', event => {
    document.querySelector('#result').textContent =
      `收到申请，当前库存${event.detail.available}件，尚未写入服务器。`;
  });
</script>
```

属性是字符串合同，复杂对象通常通过属性对应的JavaScript property或框架封装传入；两者不能混为一谈。`bubbles`让事件沿祖先传播，`composed`决定是否可以跨Shadow DOM边界。例中从宿主发出事件，宿主外已能监听；若以后从影子树内部派发，跨边界配置才影响外部接收。

Shadow DOM提供样式封装，仍要设计CSS变量、slot和主题入口；不是凭证或数据的安全边界。普通Custom Element也不自动成为可提交、可校验的表单控件，表单关联需要额外设计。Preact兼容层不能保证任意React库直接替换，Qwik可恢复性也要求应用遵守对应序列化与加载边界，应以目标组件实际集成验证判断。

## 排查入口

| 现象 | 检查点 |
| --- | --- |
| 组件在某框架里事件不触发 | 自定义事件、事件冒泡和框架封装差异 |
| 样式无法覆盖 | Shadow DOM、CSS 变量、样式穿透策略 |
| 包体积没有下降 | 是否引入了大型组件库或 polyfill |
| 团队维护困难 | 是否缺少统一脚手架、测试和组件规范 |

验收示例时，点击后外部应收到库存3的申请；把`available`改为0仍可正常展示，改为负数、小数、非数值或超出安全整数应显示未知并禁用操作。跨框架接入还需检查事件名大小写、键盘焦点、主题、表单和服务端初始HTML，不只比较压缩包大小。
