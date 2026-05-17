# 前端开发

前端开发负责把业务能力交付到浏览器、WebView、小程序或跨端运行环境中。它不是只写页面样式，也包括工程化、状态管理、组件设计、构建优化、质量保障和发布回滚。

这个专题按“基础能力 -> 工程工具 -> 框架生态 -> 质量与部署”组织。已有文章中，HTML、CSS、JavaScript 的基础内容暂时收敛在本页；框架、包管理、测试、性能和部署分别放到独立目录。

## 阅读路径

| 阶段 | 关注点 | 入口 |
| --- | --- | --- |
| 基础能力 | HTML 语义、CSS 布局、JavaScript/TypeScript、浏览器模型 | 本页 |
| 包管理 | npm、pnpm、Yarn、Bun、Corepack、镜像和私有源 | [包管理器](./package-managers/) |
| 框架生态 | React、Vue、Angular、Svelte、元框架、轻量框架、跨端框架 | [前端框架](./framework/) |
| 状态管理 | 本地状态、全局状态、服务端状态、缓存同步 | [状态管理](./state-management/) |
| 质量工具 | ESLint、Prettier、TypeScript、提交规范、代码扫描 | [质量工具](./quality-tools/) |
| 测试 | 单元测试、组件测试、端到端测试 | [测试策略](./testing/) |
| 性能 | 加载性能、运行时性能、资源优化、监控指标 | [性能优化](./performance/) |
| 部署 | Nginx、对象存储/CDN、Docker、GitLab CI、回滚 | [前端部署](./deployment/) |

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
