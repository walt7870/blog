# DOM 编程：节点、查询、修改与渲染影响

商品接口返回了一组名称，页面需要新增列表项。脚本操作的是浏览器中的节点对象，HTML字符串只是创建结构的其中一种输入。分清节点身份、属性与当前状态，才能避免更新时丢监听器、重置表单或把用户文本当成标记解析。

![数据到DOM节点再到渲染更新的路径](/front/frontend-foundations-series/ep12-flow.svg)

## 查询结果与节点身份

document是当前文档入口，元素、文本和注释都是节点。`children` 只取元素子节点，`childNodes` 还包含空白文本等节点。querySelector返回第一个匹配元素或null，querySelectorAll返回静态NodeList；getElementsByClassName等返回的集合则可以随DOM变化实时更新，迭代删除时要注意集合变化。

查询发生在脚本执行时。若经典脚本位于节点之前，应调整加载时机或使用defer，而不是用任意setTimeout等待。文档查询也不会自动穿过iframe文档或Shadow DOM边界。

## 文本、特性与属性各有用途

textContent用于文本，设置它会替换子节点；innerText关注渲染文本，读取时可能涉及样式和布局。setAttribute修改HTML特性，DOM属性则可能表达当前状态：文本框的value属性与初始value特性不同，checkbox.checked与初始checked特性也不能混为一谈。

classList适合切换样式类。innerHTML解析字符串并替换子树，原节点上的监听器和节点身份不会自动转移。用户输入应按文本写入；创建a元素后还要验证href协议，不能因为使用createElement就认为所有属性都安全。

## 可运行的列表更新

```html
<ul id="products"></ul>
<button id="refresh" type="button">更新商品</button>
<script>
  const productList = document.querySelector('#products');
  const productNames = ['桌面收纳盒', '<img src=x onerror=alert(1)>'];
  function renderProducts() {
    const fragment = document.createDocumentFragment();
    for (const title of productNames) {
      const item = document.createElement('li');
      item.textContent = title;
      fragment.append(item);
    }
    productList.replaceChildren(fragment);
  }
  document.querySelector('#refresh').addEventListener('click', renderProducts);
  renderProducts();
</script>
```

第二项会显示尖括号文本，不生成图片或事件处理器。replaceChildren有意替换整组列表，适合此处没有字段焦点和子项状态的展示列表；编辑中的复杂列表应考虑保留节点身份，避免每次更新都重建所有控件。

DocumentFragment主要用于在离线子树组织结构，插入后其子节点移动到目标位置，fragment本身不留在树中。它不保证总比直接append更快；性能应在实际数据量下测量，不能把“一次插入”直接等同于“一次重排”。

## DOM写入与屏幕更新不是同一时刻

节点和属性修改立即改变DOM，但浏览器可以延后并合并样式、布局和绘制。写入尺寸后马上读取offsetWidth等几何信息，可能要求浏览器同步计算前面的变化；循环中反复这样做容易造成布局抖动。读取纯业务数据则不等同于读取布局。

先集中读取必要尺寸，再批量写入样式，可以减少强制同步布局。requestAnimationFrame用于在渲染更新机会执行回调，并不会把耗时计算移到后台。大量列表还要考虑分页或虚拟化，不能仅靠换API消除DOM规模成本。

## 验收结构、安全与操作连续性

运行示例后检查列表有两个li、没有img节点；重复点击更新仍为两个li，不能重复累加。再检查按钮键盘激活和焦点保持。需要测性能时，用同一数据量录制更新过程，比较脚本、布局和绘制，而不是把DOM操作次数当成用户耗时。

事件监听与动态子项关系继续看[浏览器事件系统](./13-browser-event-system.md)，异步更新时机见[事件循环](./14-javascript-event-loop.md)。
