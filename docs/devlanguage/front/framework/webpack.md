# Webpack：模块图、转换规则与运行时资源

Webpack 从入口解析依赖，使用 loader 转换模块，通过插件参与编译和资源输出，再为浏览器生成入口与异步 chunk。它适合需要维护既有 loader、复杂多入口或特定插件约定的项目；选型应看真实改造成本，不能凭工具名字推断包大小或速度。

本页使用 Webpack 5、webpack-cli 6 和 webpack-dev-server 5。示例把“导出报表”单独动态加载，观察生成的 HTML、CSS、入口 JS 和报表 chunk 如何共同交付。

![Webpack 编译、异步 chunk 与浏览器加载关系](/front/build-tools/webpack-chunks.svg)

## 建立最小项目

在独立目录安装全部实际使用的依赖，配置用 `.cjs` 明确 CommonJS，避免受到 package.json 的 `type` 影响。

```bash
mkdir webpack-demo
cd webpack-demo
npm init -y
npm install -D webpack@^5 webpack-cli@^6 webpack-dev-server@^5 html-webpack-plugin@^5 css-loader@^7 style-loader@^4 mini-css-extract-plugin@^2
npm pkg set 'scripts.dev=webpack serve --mode development' 'scripts.build=webpack --mode production'
mkdir src
```

`webpack.config.cjs` 中输出路径是磁盘位置，`publicPath` 是浏览器请求资源的 URL 前缀。`clean` 只应清理这个项目的专用产物目录，不要把输出指向共享发布资源。

```js
const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (_env, argv) => {
  const production = argv.mode === 'production';
  return {
    mode: production ? 'production' : 'development',
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: '/shop/',
      filename: '[name].[contenthash].js',
      chunkFilename: '[name].[contenthash].js',
      clean: true,
    },
    module: {
      rules: [{ test: /\.css$/, use: [
        production ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader',
      ] }],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './src/index.html' }),
      ...(production ? [new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' })] : []),
    ],
    devServer: {
      host: '127.0.0.1', port: 5188, hot: true,
      historyApiFallback: { index: '/shop/index.html' },
    },
  };
};
```

`src/index.html` 由插件注入产物引用，不要手写未知的 hash 文件名：

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>报表演示</title>
<button id="export" type="button">导出报表</button>
<output id="status" aria-live="polite">尚未导出</output>
</html>
```

`src/main.js` 在点击后才加载报表模块，失败恢复按钮并留下明确状态。没有把加载成功冒充真实文件下载。

```js
import './style.css';

const button = document.querySelector('#export');
const status = document.querySelector('#status');
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const { summarize } = await import('./report.js');
    status.value = summarize([1990, 2990]);
  } catch {
    status.value = '报表加载失败，请重试';
  } finally {
    button.disabled = false;
  }
});
```

`src/report.js` 和 `src/style.css`：

```js
export function summarize(cents) {
  return `合计 ${(cents.reduce((sum, value) => sum + value, 0) / 100).toFixed(2)} 元`;
}
```

```css
body { font-family: sans-serif; }
button { padding: 8px 16px; }
```

运行 `npm run dev` 访问 `/shop/`，再 `npm run build` 检查 `dist`。生产 HTML 应引用带前缀的 JS 和独立 CSS；首次点击的 Network 应出现报表 chunk，结果为 49.80 元。正式服务器仍需在 `/shop/` 挂载完整产物。

## Loader、插件与优化分别影响什么

常规 loader 链按从右到左执行。例如 `['style-loader', 'css-loader']` 中先由 css-loader 处理 CSS 依赖，再由 style-loader 在运行时注入样式；生产例子改为抽取 CSS。loader 的 pitch 阶段另有规则，不能把普通执行顺序外推到全部生命周期。

插件参与编译生命周期，HtmlWebpackPlugin 生成引用，MiniCssExtractPlugin 组织 CSS 输出。重复配置多个能匹配同一文件的 rule 可能重复处理，图片若用 `asset/resource` 就不要再无意叠加旧 file-loader。需要互斥时使用 `oneOf` 或明确排除范围。

production 模式启用一组默认优化，但 tree shaking 仍依赖静态可分析导出和副作用语义。`sideEffects: false` 是包作者对模块副作用的声明，不是安全删除任意代码的开关；CSS、polyfill、注册器通常需要被保留。`optimization.sideEffects: false` 则关闭相应优化分析，不等于“所有模块无副作用”。

`splitChunks` 抽取公共代码不意味着每次网络请求都减少。为所有依赖强制生成一个 vendors 大包，可能损害按路由加载；先记录入口请求、缓存命中与主要交互，再评估拆分。`externals` 会把依赖提供责任移到运行环境，浏览器没有对应全局对象或模块解析方案就会失败。

## 开发与上线的不同边界

开发服务器中的 HMR、history fallback 和代理不会随 dist 自动上线。dev-server 5 的 proxy 使用数组配置，真实 API 要核对 context 与目标路径；生产重写必须排除静态资源404和 API 错误，否则缺少 chunk 也会返回 HTML，出现 MIME 或语法错误。

`DefinePlugin` 是构建时的代码替换，只白名单注入公开常量。把整个 `.env` 序列化进 `process.env` 会把本应留在构建机的值带进浏览器。Source Map 能改善错误定位，但访问权限和版本关联要单独设计。

上线 B 后保留仍被旧页面 A 引用的 chunk，回滚使用完整旧产物。`clean: true` 是本地构建行为，不能成为删除线上所有旧版本资源的依据。

## 排查与验收

```bash
npx webpack --mode production --profile --json=stats.json
```

stats 可以检查模块与 chunk 归属、重复依赖和构建耗时。`--analyze` 不是安装任意分析插件后自动可用的通用参数，应显式配置对应插件或独立分析命令。

验收时故意让报表 chunk 不可用：页面应反馈失败并恢复按钮；恢复资源后重新加载页面再试。还要验证子路径、独立刷新、CSS 和旧页面资源保留。缺模块先检查安装、exports 与大小写；构建慢先看 stats 和缓存失效原因，再考虑并发转换，不能只加内存或线程。
