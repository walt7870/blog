# 前端框架与工具生态

前端框架生态可以分为四层：组件框架负责组织页面和交互，元框架负责路由、渲染模式和服务端能力，跨端框架负责多运行端交付，构建工具负责开发服务器、打包和资源处理。把这些概念混在一起比较，容易导致选型失焦。

## 分类入口

| 分类 | 页面 | 重点 |
| --- | --- | --- |
| 组件框架 | [React](./react)、[Vue](./vue)、[Angular](./angular)、[Svelte](./svelte) | 组件模型、响应式、状态和生态 |
| 元框架与全栈框架 | [元框架与全栈框架](./meta-frameworks) | Next.js、Nuxt、SvelteKit、Astro、Remix、Umi |
| 轻量框架与 Web Components | [轻量框架](./lightweight-frameworks) | Preact、Solid、Qwik、Lit、Alpine.js |
| 跨端框架 | [跨端框架](./cross-platform) | React Native、Flutter、Taro、uni-app、Electron |
| 构建工具 | [Vite](./vite)、[Webpack](./webpack)、[Rollup](./rollup)、[Parcel](./parcel) | 开发服务器、打包、插件、代码分割 |

## 选型路线

如果要做普通后台和业务系统，优先在 React、Vue、Angular 中选择。React 生态广，适合组件抽象和复杂交互；Vue 上手成本低，国内后台生态成熟；Angular 更完整，适合强规范企业项目。

如果项目需要 SEO、服务端渲染、静态生成、文件路由或服务端接口能力，应优先看元框架，而不是只使用裸 React/Vue/Svelte。内容站、官网、文档、营销页和需要首屏性能的页面，常常更适合 Next.js、Nuxt、Astro 或 SvelteKit。

如果目标是小体积嵌入、微交互、Web Components 或对运行时性能有特殊要求，可以评估轻量框架。它们适合特定问题，但团队招聘、调试资料和组件生态要提前验证。

如果目标是移动 App、小程序、桌面端或多端统一交付，需要进入跨端框架。跨端不是“写一次到处完美运行”，仍要处理平台能力、组件差异、包体积和发布审核。

## 主流框架覆盖

目前本专题已覆盖 React、Vue、Angular、Svelte、Vite、Webpack、Rollup、Parcel，并补充了 Next.js、Nuxt、SvelteKit、Astro、Remix、Umi、Preact、Solid、Qwik、Lit、Alpine.js、React Native、Flutter、Taro、uni-app、Electron 等主流方向的分类说明。

后续如果需要深入某个框架，应按“概念边界 -> 创建项目 -> 路由和状态 -> 构建部署 -> 典型问题”的结构补单独页面。

## 排查入口

| 现象 | 优先检查 |
| --- | --- |
| 框架选型争议 | 先明确渲染模式、团队经验、组件生态和部署方式 |
| 首屏慢 | 是否需要 SSR/SSG，包体积和数据请求是否可拆分 |
| 状态混乱 | 本地状态、全局状态和服务端缓存是否边界清晰 |
| 构建复杂 | 是否使用了过多插件，是否能回到 Vite 或框架默认配置 |
| 跨端适配成本高 | 平台 API、组件差异、样式单位和发布流程是否提前验证 |
