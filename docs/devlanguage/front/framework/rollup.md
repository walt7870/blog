# Rollup - 专注于ES模块的打包器

## 简介

Rollup 是一个 JavaScript 模块打包器，专注于将小块代码编译成大块复杂的代码。它特别适用于构建库和应用程序，因为它能够利用 ES6 模块的特性，实现更有效的 tree-shaking（摇树优化）。

## 核心特性

### 1. ES6 模块优先

- 原生支持 ES6 模块语法
- 生成更小、更高效的 bundle
- 更好的 tree-shaking 支持

### 2. Tree Shaking

- 自动移除未使用的代码
- 只打包实际使用的导出
- 显著减少最终包大小

### 3. 代码分割

- 支持动态导入
- 按需加载模块
- 提高应用加载性能

## 安装和配置

### 安装

```bash
npm install --save-dev rollup
```

### 基础配置

创建 `rollup.config.js`：

```javascript
export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'cjs'
  }
};
```

### 使用插件

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd',
    name: 'MyLibrary'
  },
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ]
};
```

## 常用插件

### 官方插件

- `@rollup/plugin-node-resolve` - 解析第三方模块
- `@rollup/plugin-commonjs` - 转换 CommonJS 模块
- `@rollup/plugin-typescript` - TypeScript 支持
- `@rollup/plugin-json` - JSON 文件支持

### 社区插件

- `rollup-plugin-terser` - 代码压缩
- `rollup-plugin-postcss` - PostCSS 处理
- `rollup-plugin-babel` - Babel 转译

## 使用场景

### 构建库

- 生成 UMD、CommonJS、ES 模块格式
- 支持多入口打包
- 自动处理依赖

### 构建应用

- 配合现代框架使用
- 支持代码分割
- 优化加载性能

## 与 Webpack 对比

| 特性 | Rollup | Webpack |
|------|--------|---------|
| 打包大小 | 更小 | 较大 |
| Tree Shaking | 原生支持 | 需要配置 |
| 配置复杂度 | 简单 | 复杂 |
| 生态系统 | 较小 | 丰富 |
| 开发体验 | 适合库开发 | 适合应用开发 |

## 最佳实践

### 库开发

```javascript
// 多格式输出
export default [
  {
    input: 'src/index.js',
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [resolve(), commonjs()]
  }
];
```

### 应用开发

```javascript
// 代码分割配置
export default {
  input: 'src/main.js',
  output: {
    dir: 'dist',
    format: 'es',
    chunkFileNames: '[name]-[hash].js'
  },
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ]
};
```

## 命令行使用

```bash
# 开发模式
rollup -c --watch

# 生产构建
rollup -c

# 指定配置文件
rollup -c rollup.config.js

# 查看打包结果
rollup -c --silent
```

## 总结

Rollup 特别适合构建库和工具，其优秀的 tree-shaking 能力能够生成非常小的包。虽然在应用开发方面不如 Webpack 功能丰富，但对于需要最小化包大小的场景，Rollup 是一个很好的选择。