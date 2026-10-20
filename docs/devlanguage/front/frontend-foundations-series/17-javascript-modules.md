# JavaScript 模块系统：接口、依赖图与按需加载

商品列表和购物车都要显示价格。如果各自复制格式化函数，规则变更时很容易只改一处。模块把这条规则放进一个明确接口；两个页面分别导入它，依赖关系可以被浏览器和构建工具分析。

![购物页面的静态依赖与动态编辑器](/front/frontend-foundations-series/ep17-flow.svg)

## 从两个文件观察模块行为

在同一目录创建下列文件，通过 HTTP 开发服务器访问 HTML，避免用 `file://` 打开时遇到模块安全限制。

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>商品数量</title>
<button id="add" type="button">增加</button>
<output id="quantity" aria-live="polite"></output>
<script type="module" src="./app.js"></script>
</html>
```

`cart.js` 暴露一个实时绑定和一个修改入口。金额若参与业务计算，应另用整数分表示；这里先只观察数量。

```js
// cart.js
console.count("cart初始化");
export let quantity = 1;
export function add() {
  quantity += 1;
}
```

`app.js` 中的命名导入必须匹配导出名称。模块脚本默认延后到文档解析完成再执行，不需要为这个按钮额外监听 DOMContentLoaded。

```js
// app.js
import { quantity, add } from "./cart.js";
import * as cart from "./cart.js";

const button = document.querySelector("#add");
const output = document.querySelector("#quantity");
function render() {
  output.textContent = String(quantity);
}
button.addEventListener("click", () => {
  add();
  render();
  console.log(quantity === cart.quantity); // true
});
render();
```

初次显示 1，点击后显示 2；同一个页面中 `cart初始化` 只计一次。导入的是实时绑定，后续 `add()` 修改能被导入方读到；导入方不能用 `quantity = 99` 给这个绑定重新赋值。若导出的是对象，绑定只读也不会自动冻结它的属性。

## “执行一次”有身份与环境边界

浏览器在同一文档的模块环境中按解析后的模块 URL 管理模块。`./cart.js` 和规范化后相同的绝对 URL 可以指向同一模块，但 `cart.js?v=1` 与 `cart.js?v=2` 是不同 URL，可能分别求值。新文档、iframe、Worker 或服务端的另一个执行环境也不能据此共享内存状态。

因此模块状态适合当前应用实例内的缓存或工具状态，不能当成跨用户的数据库。SSR 若把用户购物车放在服务进程的全局模块变量中，还可能造成请求之间的数据串用，应按请求或会话建立状态。

默认导出与命名导出只是接口写法：`export default function ...` 对应无花括号导入；命名导出对应花括号。默认导出不意味着“更晚加载”或独立分包。模块顶层是独立作用域并采用严格模式，顶层 `this` 为 `undefined`。

## 加载依赖与执行依赖是两件事

静态 `import` 在模块顶层声明，加载器从入口解析依赖，建立绑定，再按依赖关系求值。下载可并行，执行还受依赖和顶层 await 等条件约束，不能把网络面板的先后当成完整执行顺序。

循环依赖不一定立刻报错，但在依赖初始化前读取尚未初始化的 `let`、`const` 或 `class` 绑定会抛错。价格工具若反过来导入页面入口，就值得重新检查职责：共享纯规则应放在不依赖页面的下层模块。

浏览器原生 ESM 通常需要可解析的 URL；`import "vue"` 这样的裸包名依赖 import map 或工具转换。路径别名也要分别配置构建工具、编辑器或类型检查器，不能只让其中一层识别。

## 动态导入需要加载与失败状态

导出报表只在用户点击时使用，可以放到 `report.js`。下列片段假定页面存在按钮 `#export` 和状态区 `#status`，模块导出 `exportReport()`；应在模块脚本中执行。

```js
const exportButton = document.querySelector("#export");
const status = document.querySelector("#status");
exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  status.textContent = "正在准备报表";
  try {
    const { exportReport } = await import("./report.js");
    await exportReport();
    status.textContent = "报表已生成";
  } catch {
    status.textContent = "报表暂时不可用，请重新尝试";
  } finally {
    exportButton.disabled = false;
  }
});
```

`import()` 返回模块命名空间的 Promise，下载、解析或求值失败都会使它拒绝。再次点击会重新进入处理，但不保证所有模块求值失败都能在当前文档中恢复；不要用不断添加随机查询参数强行重试，它会制造不同模块身份。

构建工具常把可分析的动态导入作为分包边界，实际输出仍受配置与共享依赖影响。随意拼接任意路径也不保证能被构建器收集。上线后旧 HTML 引用已删除的 chunk，是一种独立的发布一致性问题。

## Tree shaking 的限制与验收

ESM 的静态接口有利于分析未使用的导出，但模块顶层的注册、日志、样式导入等可能必须保留。`sideEffects: false` 是给工具的承诺，错误标记会让必要初始化或 CSS 被删除。动态导入解决加载时机，tree shaking 解决可删除代码，两者不能互相替代。

用上述例子验收三件事：重复导入同一模块只初始化一次，按钮修改后两个导入视角得到相同数量，修改 URL 身份后初始化计数发生变化。若页面白屏，再按模块 URL、HTTP 状态、JavaScript MIME、导出名称和控制台异常逐层查。构建和 HMR 的细节见 [Vite 流水线](./20-vite-build-pipeline)。
