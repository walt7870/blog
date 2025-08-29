# Parcel - 零配置的构建工具

## 简介

Parcel 是一个快速、零配置的 Web 应用打包器，它能够自动处理各种类型的资源，无需复杂的配置文件。它利用多核处理提供极快的性能，并且支持热模块替换（HMR）。

## 核心特性

### 1. 零配置
- 无需配置文件即可开始使用
- 自动检测项目类型和依赖
- 智能的默认配置

### 2. 极速构建
- 多核编译，充分利用 CPU 资源
- 文件系统缓存，提升二次构建速度
- 并行处理，优化构建性能

### 3. 内置支持
- 支持 JS、CSS、HTML、图片等所有常见资源
- 自动转换和优化
- 内置开发服务器

## 安装和使用

### 安装

```bash
# 全局安装
npm install -g parcel

# 或本地安装
npm install --save-dev parcel
```

### 基本使用

```bash
# 开发服务器
parcel index.html

# 构建生产版本
parcel build index.html

# 监听文件变化
parcel watch index.html
```

## 项目结构

```
project/
├── src/
│   ├── index.html
│   ├── index.js
│   └── styles.css
├── dist/          # 构建输出
└── package.json
```

## HTML 入口

```html
<!DOCTYPE html>
<html>
<head>
    <title>Parcel App</title>
    <link rel="stylesheet" href="./styles.css">
</head>
<body>
    <div id="app"></div>
    <script src="./index.js"></script>
</body>
</html>
```

## JavaScript 支持

### ES6+ 语法
Parcel 自动支持 ES6+ 语法，无需额外配置：

```javascript
// 使用 ES6 模块
import { add } from './math.js';

// 使用 async/await
async function fetchData() {
    const response = await fetch('/api/data');
    return response.json();
}
```

### TypeScript 支持
```typescript
// 自动支持 TypeScript
interface User {
    name: string;
    age: number;
}

const user: User = { name: 'Alice', age: 25 };
```

## CSS 处理

### 自动处理
```css
/* 支持 CSS Modules */
.container {
    composes: base from './base.css';
    color: red;
}

/* 支持 PostCSS */
@use postcss-nested;
.card {
    .title {
        font-size: 16px;
    }
}
```

### Sass/SCSS 支持
```scss
// 自动编译 Sass
$primary-color: #007bff;

.button {
    background-color: $primary-color;
    &:hover {
        background-color: darken($primary-color, 10%);
    }
}
```

## 资源处理

### 图片优化
```javascript
// 自动优化图片
import logo from './logo.png';

const img = document.createElement('img');
img.src = logo;
document.body.appendChild(img);
```

### 字体文件
```css
/* 自动处理字体 */
@font-face {
    font-family: 'CustomFont';
    src: url('./fonts/custom.woff2') format('woff2');
}
```

## 环境变量

### 使用环境变量
```javascript
// 自动注入环境变量
const API_URL = process.env.API_URL || 'http://localhost:3000';

// 在 .env 文件中定义
// API_URL=https://api.example.com
```

### 生产环境优化
```bash
# 构建生产版本
parcel build index.html --public-url ./

# 指定输出目录
parcel build index.html --dist-dir build

# 设置环境
parcel build index.html --env production
```

## 插件系统

### 官方插件
- `@parcel/transformer-typescript-tsc` - TypeScript 支持
- `@parcel/transformer-sass` - Sass 支持
- `@parcel/optimizer-cssnano` - CSS 压缩

### 使用插件
```json
// package.json
{
  "devDependencies": {
    "@parcel/transformer-sass": "^2.0.0"
  }
}
```

## 与 Webpack 对比

| 特性 | Parcel | Webpack |
|------|--------|---------|
| 配置 | 零配置 | 需要配置 |
| 构建速度 | 快（多核） | 相对较慢 |
| 学习曲线 | 低 | 高 |
| 生态系统 | 较小 | 丰富 |
| 灵活性 | 较低 | 高 |

## 最佳实践

### 项目初始化
```bash
# 创建项目
mkdir my-parcel-app && cd my-parcel-app
npm init -y
npm install --save-dev parcel

# 添加脚本
npm set-script dev "parcel src/index.html"
npm set-script build "parcel build src/index.html"
```

### 目录结构
```
my-parcel-app/
├── src/
│   ├── index.html
│   ├── index.js
│   ├── styles/
│   │   └── main.css
│   └── assets/
│       └── logo.png
├── dist/
├── .env
└── package.json
```

## 调试技巧

### 开发服务器
```bash
# 启动开发服务器
parcel src/index.html --port 3000

# 自动打开浏览器
parcel src/index.html --open

# 热重载
parcel src/index.html --hmr-port 1234
```

### 构建分析
```bash
# 查看构建报告
parcel build src/index.html --reporter @parcel/reporter-build-details
```

## 总结

Parcel 是一个优秀的零配置构建工具，特别适合快速原型开发和小型项目。它的自动优化和多核构建能力使其在简单场景下表现出色，但对于需要高度定制化的复杂项目，可能需要考虑更灵活的构建工具。