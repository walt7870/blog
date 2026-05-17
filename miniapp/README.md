# 稻草小站 - 小程序版（方案 A：离线内容打包）

基于 [uni-app](https://uniapp.dcloud.net.cn/) + Vue 3 + TypeScript，将 VitePress 博客（`blog/docs`）的 markdown 内容在**构建期**转换为 HTML 并打包进小程序，实现完全离线可用的技术文档阅读体验。

## 🎯 方案选择：为什么是方案 A

个人主体小程序**不支持 web-view 业务域名配置**，无法直接内嵌外部网页。我们采用**方案 A（构建期预编译 + 分包）**：

- ✅ **零服务端依赖**：内容完全打包进小程序，离线可用
- ✅ **完全合规**：个人主体无任何限制
- ✅ **多端复用**：同一套构建脚本可输出小程序、公众号、H5 多种格式
- ✅ **性能优异**：本地加载，无网络延迟
- ⚠️ **内容更新需发版**：适合更新频率为月级/季度级的文档站

## 📂 目录结构

```
miniapp/
├── scripts/
│   ├── parse-md.mjs           # 共享的 markdown 解析逻辑
│   └── build-miniapp.mjs      # 小程序构建脚本（生成分包 JSON）
├── src/
│   ├── App.vue                # 全局样式
│   ├── main.ts                # uni-app 入口
│   ├── env.d.ts               # 类型声明
│   ├── manifest.json          # uni-app 配置
│   ├── pages.json             # 页面路由 + 分包声明
│   ├── components/
│   │   └── category-feed.vue  # 分类列表通用组件（已废弃，改用 catalog 驱动）
│   ├── pages/
│   │   ├── home/index.vue     # 首页：专栏列表
│   │   ├── category/index.vue # 分类详情：文章列表
│   │   ├── article/index.vue  # 文章详情：HTML 渲染
│   │   └── about/index.vue    # 关于页
│   ├── static/
│   │   └── catalog.json       # 全局目录（构建产物，git ignore）
│   └── subpackages/           # 分包目录（构建产物，git ignore）
│       ├── ai/content.json
│       ├── container/content.json
│       ├── database-mysql/content.json
│       ├── database-bigdata/content.json
│       ├── design-architecture/content.json
│       ├── design-pattern/content.json
│       ├── devlanguage-java/content.json
│       ├── devlanguage-front/content.json
│       ├── linux/content.json
│       └── tools/content.json
├── index.html
├── package.json
├── project.config.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔧 构建流程

### 1. 安装依赖

```bash
cd miniapp
npm install
```

### 2. 构建内容

```bash
npm run build:content
```

**构建脚本做了什么**：

1. 扫描 `../../docs/docs/` 下所有 `.md` 文件（共 238 篇）
2. 用 `markdown-it` + `highlight.js` 将 md 转换为 HTML
3. 按分包策略分组（10 个分包，每个 ≤2MB）：
   - `ai`（10 篇）
   - `container`（30 篇）
   - `database-mysql`（20 篇）
   - `database-bigdata`（9 篇）
   - `design-architecture`（37 篇）
   - `design-pattern`（24 篇）
   - `devlanguage-java`（35 篇）
   - `devlanguage-front`（17 篇）
   - `linux`（30 篇）
   - `tools`（13 篇）
4. 输出：
   - `src/subpackages/{category}/content.json`：包含该分类下所有文章的 `{ id, title, html, category, path }`
   - `src/static/catalog.json`：全局目录，包含所有文章的元信息（不含 html）

### 3. 启动开发

```bash
npm run dev:mp-weixin
```

编译产物位于 `dist/dev/mp-weixin`，用**微信开发者工具**导入该目录。

### 4. 打包生产

```bash
npm run build:mp-weixin
```

## 📊 数据结构

### catalog.json（全局目录）

```json
{
  "categories": [
    { "key": "ai", "name": "人工智能", "count": 10 },
    { "key": "container", "name": "容器技术", "count": 30 }
    // ...
  ],
  "articles": [
    {
      "id": "ai-agent",
      "title": "AI智能体完全指南",
      "category": "ai",
      "path": "ai/agent.md",
      "categoryName": "人工智能"
    }
    // ...
  ]
}
```

### subpackages/{category}/content.json（分包内容）

```json
{
  "category": "ai",
  "categoryName": "人工智能",
  "articles": [
    {
      "id": "ai-agent",
      "title": "AI智能体完全指南",
      "html": "<h1>AI智能体完全指南</h1><p>...</p>",
      "category": "ai",
      "path": "ai/agent.md",
      "frontmatter": null
    }
    // ...
  ]
}
```

## 🚀 页面逻辑

### 首页（home/index.vue）

- 读取 `catalog.json` 的 `categories` 数组
- 展示 10 个专栏卡片，点击跳转到分类页

### 分类页（category/index.vue）

- 接收 `?category=ai` 参数
- 从 `catalog.json` 的 `articles` 数组中筛选该分类的文章
- 展示文章列表，点击跳转到文章详情页

### 文章详情页（article/index.vue）

- 接收 `?id=ai-agent&category=ai` 参数
- 动态 `import` 对应分包的 `content.json`
- 找到对应文章，用 `mp-html` 组件渲染 HTML

> ⚠️ **当前简化实现**：article 页面暂时使用简单的文本展示，`mp-html` 的完整集成需要额外配置（见下方"后续优化"）。

## 🎨 样式设计

- **深色玻璃拟态**：`rgba` 半透明 + `backdrop-filter`
- **rpx 适配**：响应式单位，自动适配不同屏幕
- **渐变光晕**：`radial-gradient` 营造科技感
- **微交互**：`:active` 伪类实现点击反馈

## ⚙️ 分包策略

小程序限制：**主包 2MB，单分包 2MB，总包 20MB**。

我们的分包边界：

| 分包 | 文章数 | 原始大小 | 转 HTML 后预估 |
|---|---|---|---|
| ai | 10 | 184K | ~250K |
| container | 30 | 732K | ~1M |
| database-mysql | 20 | 1.3M → 拆分 | ~900K |
| database-bigdata | 9 | 1.3M → 拆分 | ~600K |
| design-architecture | 37 | 660K + 48K | ~1M |
| design-pattern | 24 | 752K | ~1M |
| devlanguage-java | 35 | 1.1M | ~1.5M |
| devlanguage-front | 17 | 276K | ~400K |
| linux | 30 | 396K | ~550K |
| tools | 13 | 280K | ~400K |

**总计**：225 篇文章，预估总包大小 ~8-10MB，远低于 20MB 限制。

## 🔄 内容更新流程

1. 在 `blog/docs/docs/` 下新增或修改 `.md` 文件
2. 运行 `npm run build:content` 重新生成分包 JSON
3. 运行 `npm run build:mp-weixin` 打包
4. 提交微信小程序审核
5. 审核通过后发布新版本

## 🛠️ 后续优化方向

### 1. 完整集成 mp-html

**当前状态**：article 页面暂时简化，未完整集成 `mp-html`。

**优化方案**：

```bash
npm install mp-html
```

在 `pages.json` 中配置 `mp-html` 组件：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "^mp-html$": "mp-html/dist/uni-app/components/mp-html/mp-html"
    }
  }
}
```

在 `article/index.vue` 中使用：

```vue
<template>
  <mp-html :content="htmlContent" />
</template>
```

**收益**：
- 支持代码高亮（需配置 highlight.js 主题）
- 支持图片、表格、列表等富文本元素
- 更好的排版和阅读体验

### 2. 图片资源处理

**当前状态**：markdown 中的图片路径未处理，可能无法显示。

**优化方案**：

在 `parse-md.mjs` 中增加图片处理逻辑：

```js
// 方案 1：上传到 CDN
const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
html = html.replace(imgRegex, (match, alt, src) => {
  const cdnUrl = uploadToCDN(src) // 上传到 OSS/CDN
  return `![${alt}](${cdnUrl})`
})

// 方案 2：转 base64 内嵌（小图片）
const base64 = fs.readFileSync(imgPath, 'base64')
return `![${alt}](data:image/png;base64,${base64})`
```

### 3. 搜索功能

**方案**：在 `catalog.json` 中增加全文索引，实现本地搜索。

```json
{
  "articles": [
    {
      "id": "ai-agent",
      "title": "AI智能体完全指南",
      "keywords": ["AI", "Agent", "智能体", "Coze", "Dify"]
    }
  ]
}
```

在首页增加搜索框，前端过滤 `catalog.articles`。

### 4. 阅读进度记录

**方案**：用 `uni.setStorageSync` 记录用户的阅读进度。

```js
// 保存进度
uni.setStorageSync('reading_progress', {
  articleId: 'ai-agent',
  scrollTop: 1200,
  timestamp: Date.now()
})

// 恢复进度
const progress = uni.getStorageSync('reading_progress')
if (progress && progress.articleId === currentArticleId) {
  uni.pageScrollTo({ scrollTop: progress.scrollTop })
}
```

### 5. 公众号图文生成（预留）

**当前架构已支持**：`scripts/parse-md.mjs` 是共享的解析逻辑，可复用。

**新增脚本**：`scripts/build-wechat-mp.mjs`

```js
import { parseMarkdownFile } from './parse-md.mjs'
import juice from 'juice' // CSS inline
import { uploadMedia } from './wechat-api.mjs' // 上传素材

// 1. 解析 md → HTML
const { html } = parseMarkdownFile(filePath)

// 2. 套主题 CSS
const styledHtml = applyTheme(html)

// 3. CSS inline（公众号不支持外链 CSS）
const inlinedHtml = juice(styledHtml)

// 4. 上传图片到公众号素材库
const finalHtml = await replaceImagesWithMediaId(inlinedHtml)

// 5. 调用公众号 API 创建草稿
await createDraft(title, finalHtml)
```

**收益**：一套 md 源文件，输出小程序 + 公众号 + VitePress 三端内容。

## 📝 开发注意事项

### 1. 构建产物不提交 git

`.gitignore` 已配置：

```
src/subpackages
src/static/catalog.json
```

每次 `npm run dev:mp-weixin` 或 `npm run build:mp-weixin` 会自动运行 `build:content`。

### 2. AppID 配置

已配置 `wx6de94d55c6781813`，位于：

- `src/manifest.json` 的 `mp-weixin.appid`
- `project.config.json` 的 `appid`

### 3. 分包加载

小程序会在用户首次访问某分类时**按需下载**对应分包，无需一次性下载全部内容。

### 4. 代码高亮主题

`highlight.js` 默认无样式，需在 `App.vue` 中引入主题 CSS：

```vue
<style lang="scss">
@import 'highlight.js/styles/github-dark.css'; // 或其他主题
</style>
```

## 🔗 相关资源

- **VitePress 博客**：https://niuwancheng.cn/blog/
- **uni-app 文档**：https://uniapp.dcloud.net.cn/
- **mp-html 文档**：https://github.com/jin-yufeng/mp-html
- **markdown-it 文档**：https://github.com/markdown-it/markdown-it
- **highlight.js 主题**：https://highlightjs.org/static/demo/

## 📄 License

与主项目保持一致。
