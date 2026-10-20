# 前端全链路：从浏览器基础到现代生态

商品页显示错位、购物车请求失败、构建后资源丢失，分别涉及浏览器、应用状态和交付环境。本系列从这些真实工作出发，解释 HTML、CSS、JavaScript 到框架和上线之间的关系。总览用于找到问题所在层，细节页提供机制、示例和验收路径。

![前端全链路系列技术地图](/front/frontend-foundations-series/ep01-flow.svg)

## 阅读路线

如果基础比较薄，建议按 EP01 到 EP30 顺序阅读，再看 EP31 到 EP33 的 React、Vue、Angular 专项。前三十篇会先把浏览器、Web 平台和工程化链路讲清楚；后三篇再单独下钻框架心智模型，避免一开始就陷进 API 列表。

| 篇目 | 主题 |
| --- | --- |
| EP01 | [现代前端技术全景：Web 平台、工程化与框架生态](./01-modern-frontend-overview.md) |
| EP02 | [浏览器导航流程：URL、DNS、HTTP、DOM 与渲染管线](./02-browser-navigation-pipeline.md) |
| EP03 | [Web 平台的三门语言：HTML、CSS 与 JavaScript](./03-html-css-javascript-responsibilities.md) |
| EP04 | [浏览器 DevTools 技术体系：DOM、网络、运行时与性能](./04-devtools-evidence-chain.md) |
| EP05 | [语义 HTML 与 DOM 结构](./05-semantic-html-dom-structure.md) |
| EP06 | [HTML 表单模型：label、输入控件与原生校验](./06-html-form-model.md) |
| EP07 | [CSS 层叠、选择器与样式计算](./07-css-cascade-specificity.md) |
| EP08 | [CSS 布局系统：盒模型、Flex 与 Grid](./08-css-layout-flex-grid.md) |
| EP09 | [响应式设计：视口、媒体查询与容器查询](./09-responsive-design.md) |
| EP10 | [Web 可访问性基础：语义、键盘与可感知界面](./10-web-accessibility-basics.md) |
| EP11 | [JavaScript 语言基础：值、函数、对象与作用域](./11-javascript-language-model.md) |
| EP12 | [DOM 编程：节点、查询、修改与渲染影响](./12-dom-programming.md) |
| EP13 | [浏览器事件系统：监听、冒泡、委托与默认行为](./13-browser-event-system.md) |
| EP14 | [事件循环：调用栈、任务队列、微任务与渲染](./14-javascript-event-loop.md) |
| EP15 | [Fetch 与网络请求：Request、Response、CORS 与错误处理](./15-fetch-network-requests.md) |
| EP16 | [浏览器存储：Cookie、localStorage、IndexedDB 与 Cache](./16-browser-storage.md) |
| EP17 | [JavaScript 模块系统：import、export、依赖图与加载策略](./17-javascript-modules.md) |
| EP18 | [TypeScript 静态类型系统：推断、收窄、泛型与类型擦除](./18-typescript-static-types.md) |
| EP19 | [Node.js 与包管理：npm、pnpm、依赖树和 Lockfile](./19-node-package-management.md) |
| EP20 | [Vite 构建流水线：原生 ESM、HMR、转换与打包](./20-vite-build-pipeline.md) |
| EP21 | [前端代码质量工具链：Formatter、Lint、类型检查与测试](./21-frontend-quality-toolchain.md) |
| EP22 | [组件化 UI 与响应式更新模型](./22-component-reactive-ui.md) |
| EP23 | [前端框架架构比较：React、Vue、Angular 与 Svelte](./23-framework-architecture-comparison.md) |
| EP24 | [Web 渲染架构：CSR、SSR、SSG、Hydration 与 Islands](./24-web-rendering-architecture.md) |
| EP25 | [前端应用层架构：路由、数据获取、状态管理与表单](./25-frontend-application-architecture.md) |
| EP26 | [前端测试分层：单元、组件、集成、E2E 与视觉回归](./26-frontend-testing-layers.md) |
| EP27 | [Web 性能工程：加载、渲染、交互与 Core Web Vitals](./27-web-performance-engineering.md) |
| EP28 | [Web 前端安全：XSS、CSRF、CSP 与依赖供应链](./28-web-frontend-security.md) |
| EP29 | [前端交付与可观测性：构建产物、CDN、缓存、Source Map 与监控](./29-frontend-delivery-observability.md) |
| EP30 | [AI 辅助前端工程与学习路线：生成、验证与质量边界](./30-ai-assisted-frontend-learning-path.md) |
| EP31 | [React 深讲：组件函数、Hooks、状态更新与生态边界](./31-react-components-hooks-state.md) |
| EP32 | [Vue 深讲：单文件组件、响应式系统、Composition API 与渐进式架构](./32-vue-sfc-reactivity-composition.md) |
| EP33 | [Angular 深讲：完整框架、组件模板、依赖注入、Signals 与大型应用结构](./33-angular-di-signals-application-structure.md) |

## 这套文章怎么读

- 遇到页面显示问题，优先看 EP02、EP03、EP04、EP07、EP08。
- 遇到交互、异步、请求和状态问题，优先看 EP11 到 EP17。
- 遇到工程化、依赖、构建和质量问题，优先看 EP18 到 EP21。
- 做框架选型或理解渲染架构，优先看 EP22 到 EP25，再看 EP31 到 EP33。
- 准备上线和排查线上问题，优先看 EP26 到 EP29。

## 核心判断

开发机负责检查和构建，服务器或 CDN 提供产物，浏览器加载并运行页面。框架组织组件，Web 平台执行交互，后端保存业务事实。遇到问题时先确认环境和证据，再决定查样式、请求、状态还是部署配置；完整环境关系见[现代前端技术全景](./01-modern-frontend-overview.md)。
