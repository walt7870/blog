# CSS 布局系统：盒模型、Flex 与 Grid

商品页里，标题和说明按文档顺序排列，工具栏沿一行分配空间，商品列表需要多列对齐，促销角标又叠在图片上。这些关系适合由不同布局机制处理，不能把 flow、Flex、Grid 和 position 画成必须依次升级的阶段。

![按内容空间关系选择布局机制](/front/frontend-foundations-series/ep08-flow.svg)

## 先算盒子，再看排列

在 content-box 下，声明 width 为 300px、左右 padding 各16px、border各1px，边框盒宽度为334px；border-box 下同一声明的边框盒宽度为300px。margin 不包含在这两个 width 内，且普通块的垂直外边距可能折叠，不能把所有 margin 简单加成固定占用。

```css
*, *::before, *::after { box-sizing: border-box; }
img { display: block; max-width: 100%; height: auto; }
```

普通流适合文章和说明。在常见水平书写模式中，块沿垂直方向堆叠，行内内容沿行排列；改变 writing-mode 后轴向也会变化。并非每个元素都天然对应一个独立可见盒子，例如 display:contents、display:none 和匿名盒子都有不同表现。

## Flex 分配一条主轴上的空间

工具栏里“商品名称占剩余空间，操作按钮保持可用尺寸”，适合 Flex。主轴由 flex-direction 与书写方向共同确定，不能把 justify-content 永远解释成水平对齐。换行后的每一行独立分配空间，因此 Flex 并不保证跨行列宽对齐。

```css
.toolbar { display: flex; align-items: center; gap: 1rem; }
.toolbar-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.toolbar-action { flex: 0 0 auto; }
```

长商品名或文件名挤出按钮时，先查 flex 项目的自动最小尺寸。必要的 min-width:0 允许内容区收缩，overflow-wrap 决定长单词如何断行；不能只给容器隐藏溢出来掩盖丢失内容。

## Grid 让行列约束共同生效

```html
<style>
  .products {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    gap: 1rem;
  }
  .products > article { min-width: 0; border: 1px solid #739b86; padding: 1rem; }
</style>
<div class="products">
  <article><h2>桌面收纳盒</h2><p>适用于文具分类。</p></article>
  <article><h2>文件收纳架</h2><p>适用于资料整理。</p></article>
</div>
```

auto-fit 按可用宽度容纳列，内层 min 让最小轨道不超过容器，避免窄于16rem时仍撑出页面。如果明确需要主栏与侧栏，可用 `minmax(0, 1fr) 18rem`，再在内容放不下时改为单列。Grid 与 Flex 可嵌套：页面用 Grid，工具栏用 Flex，并不存在二选一的限制。

## 定位处理覆盖与吸附

relative 通常保留原布局空间，并可建立绝对定位的包含块；absolute 脱离普通流，但包含块不一定只是最近的 relative 祖先，transform 等条件也可能参与。fixed 通常相对视口，但某些祖先属性可让包含块改变。定位还受堆叠上下文影响，增加 z-index 未必跨得出祖先边界。

sticky 仍参与流，在指定 inset、滚动容器和包含块约束下吸附，不是简单“变成 fixed”。吸顶失败时检查 top 是否设置、祖先 overflow 是否引入另一滚动容器，以及是否还有可滚动空间。浮层遮住焦点时，也应重新检查布局与滚动策略。

## 用尺寸与顺序验收

把示例容器从宽到窄连续调整，确认列数下降、内容不裁切、图片不拉伸。再替换为长商品名、放大文字，检查自动最小尺寸。DevTools 的 Flex/Grid overlay 用于解释轨道与间隙，矩形测量用于核对边框盒；不能只看截图中的大致位置。

CSS order 和网格重排可以改变视觉顺序，但键盘和辅助技术通常仍按 DOM 顺序。购买步骤等有顺序的信息应先写对 DOM，再调整布局。视口和组件容器的条件切换见[响应式设计](./09-responsive-design.md)。
