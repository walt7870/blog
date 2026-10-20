# Vite 流水线：开发模块、HMR 与生产产物

修改商品标题后几乎立即看到变化，并不意味着生产服务器也在逐个转换源码。Vite 的开发反馈和生产产物承担不同任务：前者缩短修改到观察的时间，后者生成可部署、可缓存的文件。

![开发请求和生产构建两条路径](/front/frontend-foundations-series/ep20-flow.svg)

## 先确定项目的版本

截至 2026-10-20，本页以 Vite 8 为当前实现说明：它使用 Rolldown 与 Oxc 工具链。Vite 7 及更早版本常见的 esbuild 预构建、Rollup 生产打包组合属于不同版本背景，不能把旧配置名称和实现描述直接当成 Vite 8 的固定机制。

已有项目先运行 `npm ls vite`，再读对应版本配置。VitePress、Nuxt 等上层工具可能间接带入 Vite，根 package.json 没有直接声明不代表没有使用。

## 开发请求沿模块图展开

浏览器请求 HTML，发现模块入口，随后沿 import 请求源码模块。开发服务器解析模块、运行插件转换，把 TypeScript 或组件文件转换为浏览器可执行代码；裸包导入会被改写为可请求的 URL。

依赖预构建主要处理第三方包的格式与零散模块，转换 CommonJS 等输入并减少请求开销。它不同于完整生产构建，也不保证所有依赖都在启动前一次处理完。项目源码规模、插件开销、冷缓存和网络请求数都会影响体验，不能只用“原生 ESM 所以一定快”解释性能。

## 文件变化不总能原地替换

HMR 会沿受影响模块关系传播，找到可接受更新的边界，再通知浏览器与框架插件。样式通常可以独立替换；组件状态是否保留取决于插件与改动类型。若没有合适边界，整页刷新是正常回退。

“改代码没生效”先确认文件是否被监听、请求是否拿到新代码、HMR 连接是否可达，再检查框架状态。反向代理未转发 WebSocket、容器文件监听异常、代码实际来自另一个目录，都不是清缓存一定能解决的问题。

## 生产构建生成另一份部署输入

在已有 Vite 项目中运行：

```bash
npm run build
npm run preview
```

这两个脚本需要分别映射到 `vite build` 和 `vite preview`。构建从入口分析可达模块，转换、分包、压缩并写入输出目录；preview 用于检查这些输出，不是生产托管服务。

构建后在 Network 中观察 HTML 引用的 JS/CSS、动态导入 chunk 和资源 URL。文件名有内容 hash 有利于长缓存，但页面文档与资源仍需保持版本一致：先发布新资源，再切换 HTML，并为仍打开旧页面的用户保留旧 chunk。SSR 项目还需部署服务器运行产物，不能只上传客户端 dist。

## 子路径部署要检查 base

以下配置用于部署在 `/shop/` 的静态应用，public 目录中的图标放在 `public/icon.svg`。

```js
// vite.config.js
import { defineConfig } from "vite";
export default defineConfig({
  base: "/shop/"
});
```

```js
// src/main.js
import productUrl from "./product.png";
const iconUrl = import.meta.env.BASE_URL + "icon.svg";
console.log(productUrl, iconUrl);
```

通过 import 引入的资源进入构建依赖；public 文件按原样复制，路径应结合 base 组织。上层框架可能有自己的资源助手，按框架规则使用，不能仅凭开发服务器根路径访问成功就认定子路径正确。

`import.meta.env.VITE_*` 会进入客户端可见代码，不能存密钥。`mode`、NODE_ENV、`DEV/PROD` 和自定义环境变量的含义不同；排查时核对具体构建命令和加载的环境文件，不把所有生产问题归因于一个“环境”开关。

## 转换成功不代表合同正确

Vite 的 TypeScript 转换不执行完整类型检查；一个把字符串赋给 number 的例子可能仍能输出 JS。类型检查应通过 `tsc --noEmit` 或框架检查器单独执行。语法转换目标也不自动为缺失的浏览器 API 提供 polyfill。

| 现象 | 优先核对 |
| --- | --- |
| 开发正常、生产缺图 | dist中的资源、base与实际HTTP路径 |
| 更新时报旧chunk 404 | 旧页面仍引用的资源及发布保留策略 |
| 本机HMR好、代理后失效 | WebSocket转发、可达地址和监听 |
| 构建成功、界面数据报错 | 类型检查、运行时数据校验和业务测试 |
| 首次加载慢 | 模块请求、插件耗时、依赖预构建及缓存状态 |

用相同源码分别启动开发和 preview，比较模块请求；再在 `/shop/` 下刷新深链接并触发动态导入，验证资源与路由。工具插件和框架集成细节见 [Vite 专题](../framework/vite)，发布过程见 [前端交付](./29-frontend-delivery-observability)。
