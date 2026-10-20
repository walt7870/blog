# Rollup：库输出、外部依赖与 Tree Shaking

Rollup 将模块图转换成指定格式的 JavaScript。发布库时需要回答三个问题：消费者使用 ESM 还是 CommonJS、依赖由库打进去还是由消费者提供、导出路径是否指向真实产物。它不会替你完成类型检查、生成任意声明文件或配置应用路由。

下面用整数分金额库说明输出合同。Rollup 不保证总比其他工具生成更小的包，最终结果取决于依赖、导出用法、副作用和压缩策略。

![Rollup 库打包与消费者依赖边界](/front/build-tools/rollup-library.svg)

## 同一源码生成两种格式

在独立目录初始化，安装后保留锁文件：

```bash
mkdir price-library
cd price-library
npm init -y
npm pkg set type=module
npm install -D rollup@^4
npm pkg set 'scripts.build=rollup -c'
mkdir src
```

`src/index.js` 对输入明确设边界，不接受字符串、负数、非整数或超出安全范围的分值：

```js
export function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new TypeError('金额必须为非负安全整数分');
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function sumCents(values) {
  let total = 0;
  for (const value of values) {
    formatCents(value);
    total += value;
    formatCents(total);
  }
  return total;
}
```

`rollup.config.mjs`：

```js
export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/index.js', format: 'es', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
  ],
};
```

构建后可分别执行：

```bash
npm run build
node --input-type=module -e "import {formatCents} from './dist/index.js'; console.log(formatCents(1990))"
node -e "const {formatCents}=require('./dist/index.cjs'); console.log(formatCents(1990))"
npm pack --dry-run
```

两个消费入口都应输出 `19.90`。包文件清单检查通过还不足以证明 exports 正确，需要从打包后的安装环境再次导入。下面是应合并到 package.json 的发布字段，实际版本、许可和包名按项目确定：

```json
{
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

`.cjs` 明确 CommonJS，避免在 `type: module` 包里把 CJS 内容命名成普通 `.js`。没有生成 `.d.ts` 时不要声明一个不存在的 `types` 路径；需要类型时另用 TypeScript 或相应声明构建流程，并把声明也放进发布文件。

## 外部依赖把责任交给谁

如果组件库导入 Vue，通常把 Vue 声明为 peerDependency，并用 `external` 保留对应导入，避免打入另一份运行时。peerDependencies 是安装与版本合同，external 是打包合同，两者不会自动互相推导。

外部化要匹配实际导入，例如既有 `vue` 又有子路径时核对匹配范围。ESM 消费者需要能解析保留的包名；UMD/IIFE 输出还需要为 external 设定浏览器全局对象映射。只写 `globals` 不会自动下载依赖，也不会把 external 变成可用模块。

需要打包第三方模块时再安装 `@rollup/plugin-node-resolve` 解析包入口、`@rollup/plugin-commonjs` 转换 CommonJS；压缩可选 `@rollup/plugin-terser`。本例没有这些依赖，因此不引入插件。插件处理格式转换不等于类型校验或运行环境 API 的兼容补齐。

## Tree Shaking 的观察边界

库入口对外保留导出，不能因为当前仓库没有调用 `sumCents` 就从发布入口删掉它。消费者只导入 `formatCents` 后再打包，才有机会删除未使用的 `sumCents`。如果模块顶层有注册、自执行或修改全局对象，相关副作用仍可能保留。

先构建一个只消费 `formatCents` 的独立入口，再观察产物和实际执行；不要只搜索函数名，因为压缩会改名。验证应同时断言输出正确、错误输入仍拒绝，以及带副作用的模块没有被错误删除。

多入口或动态 import 需要产生多个 chunk 时通常使用 `output.dir`。UMD/IIFE 不适合直接承载通用代码分割输出；把 `inlineDynamicImports` 打开也会改变执行时机，不能仅为了消除报错盲目使用。

## 排查与验收

| 现象 | 检查证据 | 处理方向 |
| --- | --- | --- |
| ESM能导入，require失败 | 扩展名、type、exports条件 | 用实际CJS消费者检查路径和内容 |
| 浏览器报无法解析包名 | external后的产物import | 给消费者配置解析，或按合同打入依赖 |
| 组件库出现两份运行时 | 产物与依赖树 | peer范围与external共同核对 |
| “未用”代码仍存在 | 顶层副作用、入口导出与消费路径 | 保留必要副作用，改消费者实验验证 |
| 本地通过，安装包缺文件 | npm pack文件清单与实际安装 | 修正files、exports和构建顺序 |

更新构建链时先保留消费端合同，再调整输出格式。应用构建、HTML 与资源服务器配置继续看 [Vite](./vite.md) 或 [Webpack](./webpack.md)。
