# Parcel：HTML 入口、目标环境与资源图

Parcel 2 从入口识别资源依赖，按目标环境转换和打包。HTML 中的模块脚本、CSS 中的资源 URL、JavaScript 的静态或动态导入共同形成资源图。“零配置”表示常见场景可以使用默认约定，不表示浏览器目标、输出格式和部署路径不需要决定。

例如活动页只需要一个按钮和少量样式，可以从 HTML 入口开始；若项目依赖既有复杂插件或需要库发布格式，仍应验证相应目标与生态，不凭“简单项目专用”或“自动最快”下结论。

![Parcel 入口发现、目标转换与资源URL生成](/front/build-tools/parcel-targets.svg)

## 从 HTML 启动

在独立目录创建项目，使用本地依赖和 npm scripts，避免全局版本漂移。`npm init -y` 可能带有 `main` 字段，本例是 Web 应用，应移除它，避免被识别成库输出目标。

```bash
mkdir parcel-demo
cd parcel-demo
npm init -y
npm pkg delete main
npm install -D parcel@^2
npm pkg set 'scripts.dev=parcel src/index.html' 'scripts.build=parcel build src/index.html --public-url /shop/'
mkdir src
```

`src/index.html` 中模块脚本必须标明 `type="module"`，HTML、CSS 和 JS 都由 Parcel 发现：

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>活动报名</title>
<link rel="stylesheet" href="./style.css">
<button type="button">增加报名人数</button>
<output aria-live="polite">0</output>
<script type="module" src="./main.js"></script>
</html>
```

`src/main.js`：

```js
const button = document.querySelector('button');
const output = document.querySelector('output');
let count = 0;
button.addEventListener('click', () => {
  output.value = String(++count);
});
```

`src/style.css`：

```css
body { font-family: sans-serif; }
button { padding: 8px 16px; }
```

执行 `npm run dev` 验证点击，再 `npm run build`。默认产物在 dist，HTML 引用生成的 JS/CSS；部署到 `/shop/` 时保持 `--public-url` 与服务器挂载一致。浏览器实际点击能增加人数，才证明资源下载、解析和事件运行都完成。

## Target 不只决定输出目录

入口决定从哪里开始，target 决定为哪个环境生成。例如 `browserslist` 控制浏览器兼容范围，`engines.node` 和库发布字段也可能影响环境与输出。多个目标可以分别构建现代浏览器和其他环境，代价是产物数量和验证范围增加。

浏览器目标并非一个可以随意缩小的压缩参数，应来自实际用户设备要求。`type="module"`、目标浏览器与差异化构建共同决定是否生成额外 fallback；不能把另一项目的输出文件数当成固定规则。

`--dist-dir` 控制输出位置，显式 target 的 `distDir` 可能覆盖它。库的 main、module、types 等字段会参与目标解析，因此遇到“HTML不能写到某个JS文件”时，先查 package.json，而不是反复删除缓存。

## 转换、校验与插件

Parcel 可以转换 TypeScript，但默认转换不是完整类型检查。TypeScript 项目应独立执行 `tsc --noEmit`，并按框架选择对应检查器。`.scss` 需要相应转换器；在受控 CI 中应把实际依赖与锁文件提前固定，不能依赖构建过程临时修改依赖。

PostCSS 插件写在它的配置中，`@use postcss-nested` 不是配置 PostCSS 的通用 CSS 语法。CSS Modules 使用 `.module.css` 等约定，并核对最终类名引用；原样复制资产和进入依赖图的资产也有不同的指纹与缓存策略。

需要修改构建流水线时，`.parcelrc` 声明 transformer、resolver、optimizer 或 reporter。先用默认配置复现，再添加最少扩展，避免把原生支持和手动插件重复叠加。

## 环境与发布检查

`parcel build` 进入生产构建，选择 dotenv 文件与公开变量仍需按实际 mode/环境核对，不能套用不存在的通用 `--env production` 命令。进入客户端 bundle 的环境变量都可能被用户读取，构建机秘密不应注入。

将产物放到独立静态预览服务器，验证 `/shop/` 的 HTML、CSS、脚本和异步资源；直接打开源码 HTML 或只看构建成功都不够。开发 HMR 不保证所有变量和组件状态保留，刷新后需要恢复的数据应通过明确的状态存储方案处理。

| 现象 | 优先检查 |
| --- | --- |
| import报错或脚本未当模块处理 | HTML脚本type和入口资源类型 |
| 输出目标冲突 | main/module/targets、distDir与入口 |
| 子路径资源404 | public-url、HTML引用、服务器挂载 |
| TS错误未被发现 | 独立类型检查是否执行 |
| 冷构建与二次差异大 | 缓存、转换器安装和目标数量 |

性能比较需固定同一源码、目标和缓存条件。发布仍要保留旧页面需要的资源，不能因为本地输出目录是全新内容就删除线上全部旧 chunk。
