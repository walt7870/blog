# 前端开发

前端开发负责把业务能力交付到浏览器、WebView、小程序或跨端运行环境中。它不是只写页面样式，也包括工程化、状态管理、组件设计、构建优化、质量保障和发布回滚。

这个专题按“基础能力 -> 工程工具 -> 框架生态 -> 质量与部署”组织。总览负责定位问题，HTML、CSS、JavaScript和运行机制在全链路系列中展开，框架、包管理、测试、性能和部署各有独立入口。

例如订单页“能显示”只是开始：输入数量属于表单状态，保存失败涉及接口合同，刷新详情404属于部署路由，而发布后导出模块失效又涉及旧资源保留。沿同一条用户操作链判断问题，能避免把所有现象都归给框架。

![从订单页面操作到工程交付的责任边界](/front/engineering/frontend-delivery.svg)

## 阅读路径

<TopicDirectory :items="[
  { title: '前端全链路系列', href: '/docs/devlanguage/front/frontend-foundations-series/', icon: 'book', description: '从浏览器打开页面开始，沿 33 篇图文进入基础、框架和工程生态。' },
  { title: '包管理器', href: '/docs/devlanguage/front/package-managers/', icon: 'boxes', description: '解决安装失败、依赖版本漂移与私有源配置，比较 npm、pnpm、Yarn 和 Bun。' },
  { title: '前端框架', href: '/docs/devlanguage/front/framework/', icon: 'code', description: '围绕组件、路由与渲染方式，选择 React、Vue、Angular、Svelte 或跨端方案。' },
  { title: '状态管理', href: '/docs/devlanguage/front/state-management/', icon: 'branch', description: '购物车放哪里、列表何时刷新：区分本地状态、全局状态与服务端缓存。' },
  { title: '质量工具', href: '/docs/devlanguage/front/quality-tools/', icon: 'shield', description: '让类型、格式和代码检查在提交前运行，减少协作中可提前发现的错误。' },
  { title: '测试策略', href: '/docs/devlanguage/front/testing/', icon: 'workflow', description: '从金额计算的单元测试，到下单流程的端到端测试，按风险分配验证。' },
  { title: '性能优化', href: '/docs/devlanguage/front/performance/', icon: 'gauge', description: '页面打开慢或交互卡顿时，从加载资源、长任务和监控指标定位原因。' },
  { title: '前端部署', href: '/docs/devlanguage/front/deployment/', icon: 'terminal', description: '把构建产物发布到 Nginx 或 CDN，处理缓存、刷新 404 和版本回滚。' }
]" />

基础能力见本页的[基础边界](#基础边界)，系统学习从系列课程进入，已有项目可直接按当前问题选择工具、测试或部署专题。

## 系列课程

[前端全链路：从浏览器基础到现代生态](./frontend-foundations-series/) 是这个专区的系统化学习路线。它把浏览器导航、HTML/CSS/JavaScript、TypeScript、Node、Vite、框架、渲染架构、测试、性能、安全和部署监控放到一条链路里讲，适合从基础补到现代前端工程。

## 基础边界

HTML 负责结构和语义，CSS 负责布局和视觉，JavaScript 负责交互和运行逻辑。现代前端项目通常还会引入 TypeScript、组件框架、构建工具和包管理器，但这些工具都建立在浏览器基础能力之上。

```text
浏览器平台
  -> HTML：结构、语义、表单、可访问性
  -> CSS：布局、响应式、动画、主题
  -> JavaScript：事件、状态、网络请求、模块
  -> TypeScript：类型约束、接口设计、重构安全
  -> 构建工具：开发服务器、打包、代码分割、资源处理
  -> 部署链路：静态资源、缓存、CDN、回滚
```

学习前端时不要直接从框架开始。框架能提高组织大型应用的效率，但浏览器渲染、事件循环、HTTP 缓存、跨域、Cookie、模块加载和 CSS 布局问题，最终仍要回到基础机制排查。

## 工程目录

一个中型前端项目常见结构如下：

```text
web-admin/
├── src/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── router/
│   ├── stores/
│   └── main.ts
├── public/
├── tests/
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
└── .env.production
```

目录不是越细越好。页面、组件、状态、接口和路由边界清晰，比机械套用复杂分层更重要。后台管理系统应优先保证表单、表格、权限、错误处理和部署回滚稳定；官网和活动页更关注首屏性能、SEO、图片资源和 CDN 缓存。

## 技术选型

| 场景 | 建议 |
| --- | --- |
| 管理后台、业务系统 | Vue 或 React，加成熟 UI 组件库 |
| 企业级大型应用 | Angular、React 或 Vue，配套统一工程规范 |
| 官网、文档、内容站 | Astro、Nuxt、Next.js 或静态站点方案 |
| 多端统一交付 | React Native、Flutter、Taro、uni-app 等跨端方案 |
| 组件库或内部设计系统 | React/Vue 组件库，配合 Vite/Rollup 构建 |
| 新项目包管理 | 优先评估 pnpm，并用 Corepack 固定版本 |

## 排查入口

| 现象 | 优先检查 |
| --- | --- |
| 页面空白 | 控制台错误、资源路径、构建 `base`、路由回退 |
| 样式错乱 | CSS 优先级、作用域、构建顺序、浏览器兼容性 |
| 接口跨域 | CORS、Cookie、HTTPS、代理路径、网关配置 |
| 本地正常线上异常 | 环境变量注入时机、缓存、CDN、构建命令 |
| 依赖安装失败 | 包管理器版本、锁文件、registry、私有源 token |
| 性能变差 | 包体积、首屏资源、长任务、图片、缓存策略 |

## 能力验证清单

- 能独立搭建一个固定 Node.js 和包管理器版本的前端项目。
- 能解释 `package.json`、锁文件、构建产物和部署目录之间的关系。
- 能在 React、Vue、Angular、Svelte 和元框架之间做基本选型。
- 能配置 Nginx 或对象存储/CDN 发布单页应用，并处理刷新 404。
- 能用浏览器开发者工具定位网络、样式、脚本和性能问题。
