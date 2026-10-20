# Web 平台的三门语言：HTML、CSS 与 JavaScript

商品标题、价格和“加入购物车”可以拆成三类责任：HTML 提供内容和原生控件，CSS 定义呈现，JavaScript 处理运行时变化。它们通过浏览器的 DOM、样式和 Web API 协作，并非依次执行的三步程序。

![HTML、CSS与JavaScript围绕浏览器模型协作](/front/frontend-foundations-series/ep03-flow.svg)

## 用一个可运行片段观察分工

```html
<main class="product">
  <h1>桌面收纳盒</h1>
  <p>购物车数量：<output id="count" aria-live="polite">0</output></p>
  <button id="add" type="button">加入购物车</button>
</main>
<style>
  .product { max-width: 36rem; margin: 2rem auto; padding: 1rem; }
  button { padding: .6rem 1rem; border: 1px solid currentColor; }
  button:focus-visible { outline: 3px solid #29794b; outline-offset: 3px; }
</style>
<script>
  const count = document.querySelector('#count');
  document.querySelector('#add').addEventListener('click', () => {
    count.value = String(Number(count.value) + 1);
  });
</script>
```

HTML 定义主内容、标题、输出和按钮关系。CSS 控制阅读宽度、间距和焦点外观。脚本监听按钮的 click 并修改输出值，DOM API 把结果交还给浏览器渲染。此例只演示本地计数，不涉及库存、账户或服务端持久化。

## HTML 语义与视觉形状分别检查

button 自带可聚焦、键盘激活和按钮角色；a href 表示导航；form 组织可提交控件。把按钮换成带 click 的 div，即使 CSS 做出相同外观，也不会自动得到这些行为。`role="button"` 仅补角色，仍需自行处理焦点、键盘和禁用状态，日常动作优先用原生按钮。

标题层级说明内容结构，布局位置由 CSS 决定。把普通段落字号调大不等于创建标题；把 h2 调小也不会消除它的标题语义。这种差异在读屏导航、浏览器可访问性树和文档维护时尤其明显。

## CSS 从声明计算到布局

选择器决定候选规则，层叠、继承和具体值计算决定最终样式。Elements 的 Styles 面板可查看规则来源，Computed 可查看最终值。元素存在却看不到时，检查 display、visibility、透明度、尺寸、裁切、遮挡和位置，而不只看是否写了颜色。

禁用作者 CSS 后，示例仍有标题、数量和按钮，但会采用浏览器默认样式。CSS 还会影响点击命中、焦点可见性和元素是否进入可访问性树；因此“只负责好看”不足以描述它的作用。

## JavaScript 与 Web API 的边界

值、函数、对象、作用域和 Promise 属于语言机制；DOM、Fetch、Storage 等由宿主环境提供。浏览器脚本可以更新 DOM，Node.js 中没有默认的页面 document。框架会组织组件和状态，但最终仍要通过平台能力生成界面和处理事件。

禁用 JavaScript 后，示例初始内容仍可见，计数不再增加。原生链接和传统表单可以继续工作；如果页面完全依赖客户端脚本创建 DOM，则可能没有主要内容。因此“关掉 JavaScript 内容一定还在”只适用于已经由 HTML 提供内容的页面。

## 三个有明确预期的实验

1. 保留 HTML 和脚本、移除 style：计数仍增加，排版回到默认样式，说明交互不依赖作者 CSS。
2. 保留 HTML 和 CSS、移除 script：初始数量仍显示为 0，按钮不再修改它。
3. 用 Tab 聚焦原生按钮，分别用 Enter 和 Space 激活；再换成普通 div 比较，确认外观无法证明键盘能力。

结构问题继续看[语义 HTML](./05-semantic-html-dom-structure.md)，样式来源看[CSS 层叠](./07-css-cascade-specificity.md)，运行时问题用[DevTools](./04-devtools-evidence-chain.md)定位。
