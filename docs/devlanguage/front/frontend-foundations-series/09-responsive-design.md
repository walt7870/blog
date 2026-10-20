# 响应式设计：视口、媒体查询与容器查询

同一个商品组件放在宽屏主栏可以横排，放在侧栏仍应竖排。页面窗口很宽，不代表每个组件都有足够空间。响应式设计需要分别考虑布局视口、组件容器、内容长度和输入条件。

![视口条件与容器条件分别作用的范围](/front/frontend-foundations-series/ep09-flow.svg)

## 布局视口不是物理像素

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

移动浏览器可以据此使用适当的 CSS 布局宽度，避免默认的宽布局再缩小展示。CSS 像素与设备物理像素不必一一对应，DPR、缩放、浏览器界面和软键盘都会影响测量。布局视口与 visual viewport 也有区别：双指缩放改变可见区域，不必同样改变布局宽度。

不要用 user-scalable=no 禁止用户放大。响应式验收先断言实际 innerWidth 或文档 clientWidth，不能仅凭测试工具返回“已设置390”就认定窄屏生效；iframe 可验证局部宽度布局，但不能模拟真实触控、软键盘和移动浏览器差异。

## 让内容先自然收缩

页面可用 max-width 限制阅读行长，用百分比与 minmax 分配列宽，用 rem 保持文字与用户字号设置的关系。断点放在内容开始拥挤的位置，例如商品图和购买区无法同时保持可读时切成单列，不能只按某款手机型号定断点。

```css
.page { width: min(100% - 2rem, 72rem); margin-inline: auto; }
.detail { display: grid; gap: 1.5rem; }
@media (min-width: 48rem) {
  .detail { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
```

宽度约束之外，还要处理长URL、代码和表格。正文允许换行，代码与确实需要二维比较的表格可以在自身区域横向滚动；不能让整个页面横向溢出，也不应把所有列挤成每行一个汉字。

## 容器查询跟随组件所在位置

```html
<style>
  .product-slot { container: product / inline-size; }
  .product-card { display: grid; gap: 1rem; }
  .product-card > * { min-width: 0; overflow-wrap: anywhere; }
  @container product (min-width: 32rem) {
    .product-card { grid-template-columns: 1fr 2fr; }
  }
</style>
<div class="product-slot">
  <article class="product-card">
    <h2>桌面收纳盒</h2>
    <p>宽容器横向展示，侧栏中保持纵向。</p>
  </article>
</div>
```

外层声明 inline-size 容器，查询规则影响其后代。不能依赖同一个元素用自身尺寸查询来修改自身布局，否则容易形成尺寸依赖环。容器尺寸包含约束会影响内容对外部尺寸的贡献，使用前要保证外层有合理的可用宽度。

媒体查询适合整页骨架和用户偏好，容器查询适合复用组件。它们可同时存在；不支持容器查询的目标浏览器仍应获得可用的基础单列布局。

## 输入、动效与资源也需要适配

pointer:coarse、hover:none 描述主要输入能力，不等于“这是手机”。触屏电脑可同时连接鼠标，关键操作不能只在 hover 出现。按钮应有足够命中面积和间距，拖拽功能应提供点击或键盘替代。

prefers-reduced-motion 表示减少非必要运动的偏好。应针对装饰动画、视差和位移动效提供静态或低运动版本，不能无差别关闭所有动画并破坏依赖 animationend 的业务逻辑。图片可用 srcset/sizes 提供候选，浏览器结合布局、DPR和策略选择；sizes 是提示，不直接设置显示宽度。width/height 或 aspect-ratio 可提前预留空间，减少布局跳动。

## 验收以实际边界为准

连续改变宽度并检查断点前后各1像素，确认没有短暂溢出；在同一个宽视口把商品组件分别放进宽主栏与窄侧栏，确认容器查询分别生效。再检查长标题、文字放大、键盘焦点、图片加载前后和减少动效偏好。

记录视口宽度、文档宽度、容器宽度和实际截图，说明是响应式夹具还是真机。与交互语义相关的验收见[可访问性基础](./10-web-accessibility-basics.md)。
