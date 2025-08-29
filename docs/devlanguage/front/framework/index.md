# 前端框架与工具生态

## 框架概述

现代前端开发已经形成了完整的生态系统，包括各种框架、库和工具的组合。本章节将详细介绍主流的前端技术栈。

## 主流前端框架

### React 生态
React 是由 Facebook 开发的用于构建用户界面的 JavaScript 库，采用组件化开发模式。

**核心特性：**
- 虚拟 DOM 提高渲染性能
- 单向数据流
- 强大的生态系统
- Hooks 函数式编程

**相关技术栈：**
- [React 基础](./react.md)
- Next.js (服务端渲染)
- Redux/Zustand (状态管理)
- React Router (路由管理)

### Vue 生态  
Vue 是一个渐进式 JavaScript 框架，易于上手且功能强大。

**核心特性：**
- 响应式数据绑定
- 组件化开发
- 模板语法简洁
- 渐进式采用

**相关技术栈：**
- [Vue.js 详解](./vue.md)
- Nuxt.js (服务端渲染)
- Vuex/Pinia (状态管理)
- Vue Router (路由管理)

### Angular 生态
Angular 是由 Google 开发的完整前端框架。

**核心特性：**
- TypeScript 优先
- 依赖注入
- 完整的解决方案
- 企业级应用支持

**相关技术栈：**
- [Angular 指南](./angular.md)
- RxJS (响应式编程)
- NgRx (状态管理)
- Angular Material (UI组件)

### Svelte 生态
Svelte 是一个编译时优化的框架，将组件编译成高效的原生 JavaScript。

**核心特性：**
- 无虚拟 DOM
- 编译时优化
- 响应式声明
- 更小的包体积

**相关技术栈：**
- [Svelte 详解](./svelte.md)
- SvelteKit (全栈框架)
- Svelte Store (状态管理)

## 构建工具

### Webpack
功能强大的模块打包器，生态最为丰富。
- [Webpack 详解](./webpack.md)

### Vite
新一代前端构建工具，基于原生 ES 模块。
- [Vite 指南](./vite.md)

### Rollup
专注于 ES 模块的打包器，适合库开发。
- [Rollup 详解](./rollup.md)

### Parcel
零配置的构建工具，开箱即用。
- [Parcel 指南](./parcel.md)

## 性能优化

性能优化是前端开发的重要环节，包括：
- 代码分割和懒加载
- 图片优化和压缩
- 缓存策略
- 网络优化
- 渲染优化

[查看性能优化指南 →](../performance/index.md)

## 测试体系

### 单元测试
- Jest (JavaScript测试框架)
- Vitest (Vite原生测试)
- React Testing Library

### 端到端测试
- Cypress
- Playwright
- Puppeteer

### 性能测试
- Lighthouse
- WebPageTest
- Chrome DevTools

[查看测试指南 →](../testing/index.md)

## 部署策略

### 静态部署
- GitHub Pages
- Netlify
- Vercel

### 容器化部署
- Docker
- Kubernetes

### CDN部署
- Cloudflare
- AWS CloudFront

[查看部署指南 →](../deployment/index.md)