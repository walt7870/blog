# Vite 全面指南

Vite（法语意为"快速"）是由Vue.js作者尤雨溪开发的新一代前端构建工具。它利用ES模块的原生支持和现代浏览器的能力，提供了极快的开发服务器启动速度和热更新体验。

## Vite 简介

### 核心特性
- **极速的服务器启动**：利用ES模块，无需打包即可启动
- **闪电般的热更新**：基于ES模块的HMR，更新速度不受应用大小影响
- **丰富的功能**：支持TypeScript、JSX、CSS预处理器等
- **优化的构建**：使用Rollup进行生产构建，内置优化
- **通用的插件接口**：兼容Rollup插件生态
- **完全类型化的API**：TypeScript支持

### 为什么选择Vite？

#### 传统构建工具的问题
```
传统工具（如Webpack）:
启动 → 打包整个应用 → 启动服务器
更新 → 重新打包相关模块 → 热更新

问题：
- 启动时间随项目增大而增长
- 热更新速度受影响
- 开发体验下降
```

#### Vite的解决方案
```
Vite:
启动 → 直接启动服务器 → 按需编译
更新 → 只编译变更的模块 → 即时热更新

优势：
- 启动时间恒定
- 热更新速度恒定
- 开发体验极佳
```

## 快速开始

### 创建新项目
```bash
# 使用npm
npm create vite@latest my-vite-app

# 使用yarn
yarn create vite my-vite-app

# 使用pnpm
pnpm create vite my-vite-app

# 直接指定模板
npm create vite@latest my-vue-app -- --template vue
npm create vite@latest my-react-app -- --template react
npm create vite@latest my-svelte-app -- --template svelte
```

### 可用模板
```bash
# JavaScript模板
vite create my-app --template vanilla
vite create my-app --template vue
vite create my-app --template react
vite create my-app --template preact
vite create my-app --template lit
vite create my-app --template svelte

# TypeScript模板
vite create my-app --template vanilla-ts
vite create my-app --template vue-ts
vite create my-app --template react-ts
vite create my-app --template preact-ts
vite create my-app --template lit-ts
vite create my-app --template svelte-ts
```

### 项目结构
```
my-vite-app/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   ├── App.vue
│   └── main.js
├── index.html              # 入口HTML文件
├── package.json
├── vite.config.js          # Vite配置文件
└── README.md
```

### 基本命令
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## Vite配置

### 基础配置
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // 插件配置
  plugins: [vue()],
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: '[ext]/[name]-[hash].[ext]'
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // CSS配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      },
      less: {
        modifyVars: {
          'primary-color': '#1890ff'
        },
        javascriptEnabled: true
      }
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

### 条件配置
```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [],
    server: {},
    build: {}
  }
  
  if (command === 'serve') {
    // 开发环境配置
    config.server = {
      port: 3000,
      open: true
    }
  } else {
    // 生产环境配置
    config.build = {
      minify: 'terser',
      sourcemap: false
    }
  }
  
  if (mode === 'development') {
    config.define = {
      __DEV__: true
    }
  }
  
  return config
})
```

### TypeScript配置
```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  }
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 插件系统

### 官方插件
```javascript
// Vue项目
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig({
  plugins: [
    vue(),
    vueJsx()
  ]
})

// React项目
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})

// Svelte项目
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()]
})
```

### 常用社区插件
```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 自动导入
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// PWA
import { VitePWA } from 'vite-plugin-pwa'

// 环境变量类型
import { loadEnv } from 'vite'

// ESLint
import eslint from 'vite-plugin-eslint'

// Mock
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      
      // ESLint检查
      eslint({
        include: ['src/**/*.js', 'src/**/*.vue', 'src/**/*.ts'],
        exclude: ['node_modules']
      }),
      
      // 自动导入API
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          'pinia'
        ],
        resolvers: [ElementPlusResolver()],
        dts: true
      }),
      
      // 自动导入组件
      Components({
        resolvers: [ElementPlusResolver()],
        dts: true
      }),
      
      // PWA
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: 'My Vite App',
          short_name: 'ViteApp',
          description: 'My Awesome Vite App',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            }
          ]
        }
      }),
      
      // Mock服务
      viteMockServe({
        mockPath: 'mock',
        localEnabled: mode === 'development',
        prodEnabled: false
      })
    ]
  }
})
```

### 自定义插件
```javascript
// plugins/custom-plugin.js
function customPlugin(options = {}) {
  return {
    name: 'custom-plugin',
    configResolved(config) {
      // 配置解析完成后调用
      console.log('Config resolved:', config)
    },
    buildStart(opts) {
      // 构建开始时调用
      console.log('Build started')
    },
    load(id) {
      // 加载模块时调用
      if (id === 'virtual:my-module') {
        return 'export const msg = "Hello from virtual module"'
      }
    },
    transform(code, id) {
      // 转换代码时调用
      if (id.endsWith('.special')) {
        return `export default ${JSON.stringify(code)}`
      }
    },
    generateBundle(options, bundle) {
      // 生成bundle时调用
      console.log('Bundle generated')
    }
  }
}

// 使用自定义插件
export default defineConfig({
  plugins: [
    vue(),
    customPlugin({
      option1: 'value1'
    })
  ]
})
```

## 开发特性

### 热模块替换 (HMR)
```javascript
// 在Vue组件中使用HMR API
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // 模块更新时的回调
    console.log('Module updated:', newModule)
  })
  
  import.meta.hot.dispose(() => {
    // 模块销毁时的清理工作
    console.log('Module disposed')
  })
}

// 条件性HMR
if (import.meta.hot) {
  import.meta.hot.accept('./dependency.js', (newDep) => {
    // 只有当dependency.js更新时才触发
    updateDependency(newDep)
  })
}
```

### 环境变量
```bash
# .env
VITE_APP_TITLE=My Vite App
VITE_API_URL=https://api.example.com

# .env.local
VITE_SECRET_KEY=secret123

# .env.development
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true

# .env.production
VITE_API_URL=https://prod-api.example.com
VITE_DEBUG=false
```

```javascript
// 在代码中使用环境变量
console.log(import.meta.env.VITE_APP_TITLE)
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.MODE) // 'development' 或 'production'
console.log(import.meta.env.DEV)  // boolean
console.log(import.meta.env.PROD) // boolean

// TypeScript类型定义
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_URL: string
  readonly VITE_SECRET_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 静态资源处理
```javascript
// 导入静态资源
import imgUrl from './img.png'
import workerUrl from './worker.js?worker'
import inlineWorker from './worker.js?worker&inline'

// 显式URL导入
import assetAsURL from './asset.js?url'

// 导入为字符串
import assetAsString from './shader.glsl?raw'

// 动态导入
const modules = import.meta.glob('./dir/*.js')
const components = import.meta.glob('./components/*.vue', { eager: true })

// 使用示例
function loadAssets() {
  // 图片
  const img = new Image()
  img.src = imgUrl
  
  // Worker
  const worker = new Worker(workerUrl)
  
  // 动态加载模块
  for (const path in modules) {
    modules[path]().then((mod) => {
      console.log(path, mod)
    })
  }
}
```

### CSS功能
```scss
// CSS Modules
// styles.module.css
.button {
  background: blue;
  color: white;
}

.button:hover {
  background: darkblue;
}
```

```javascript
// 使用CSS Modules
import styles from './styles.module.css'

function Button() {
  return <button className={styles.button}>Click me</button>
}
```

```scss
// SCSS预处理器
// variables.scss
$primary-color: #3498db;
$secondary-color: #2ecc71;

@mixin button-style($bg-color) {
  background: $bg-color;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: darken($bg-color, 10%);
  }
}

// component.scss
@import './variables.scss';

.primary-button {
  @include button-style($primary-color);
}

.secondary-button {
  @include button-style($secondary-color);
}
```

```css
/* PostCSS自动前缀 */
.container {
  display: flex;
  transform: translateX(100px);
  user-select: none;
}

/* 编译后自动添加前缀 */
.container {
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  -webkit-transform: translateX(100px);
  transform: translateX(100px);
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
```

## 构建优化

### 代码分割
```javascript
// 路由级别的代码分割
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('./views/Home.vue')
  },
  {
    path: '/about',
    component: () => import('./views/About.vue')
  },
  {
    path: '/user',
    component: () => import('./views/User.vue')
  }
]

// 组件级别的代码分割
const AsyncComponent = defineAsyncComponent(() => import('./AsyncComponent.vue'))

// 手动代码分割
const loadModule = () => import('./heavy-module.js')

function handleClick() {
  loadModule().then(module => {
    module.doSomething()
  })
}
```

### 构建配置优化
```javascript
// vite.config.js
export default defineConfig({
  build: {
    // 启用/禁用 gzip 压缩大小报告
    reportCompressedSize: false,
    
    // chunk 大小警告的限制（以 kbs 为单位）
    chunkSizeWarningLimit: 500,
    
    // 自定义底层的 Rollup 打包配置
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          // 将 React 相关库打包成单独的 chunk
          react: ['react', 'react-dom'],
          // 将 Lodash 打包成单独的 chunk
          lodash: ['lodash'],
          // 将组件库打包成单独的 chunk
          antd: ['antd']
        }
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

### 预构建优化
```javascript
// vite.config.js
export default defineConfig({
  optimizeDeps: {
    // 强制预构建链接的包
    include: ['lodash', 'axios'],
    
    // 在预构建中强制排除的依赖项
    exclude: ['your-local-package'],
    
    // 传递给 esbuild 的选项
    esbuildOptions: {
      target: 'es2020'
    }
  }
})
```

## 部署

### 静态部署
```bash
# 构建项目
npm run build

# 部署到静态服务器
# dist/ 目录包含所有构建产物
```

### 服务器配置
```nginx
# Nginx配置
server {
    listen 80;
    server_name example.com;
    root /var/www/dist;
    index index.html;
    
    # 处理SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```apache
# Apache配置 (.htaccess)
RewriteEngine On
RewriteBase /

# 处理SPA路由
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# 静态资源缓存
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
</FilesMatch>
```

### Docker部署
```dockerfile
# Dockerfile
FROM node:18-alpine as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
```

### CI/CD配置
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Deploy to S3
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Sync to S3
      run: aws s3 sync dist/ s3://my-bucket --delete
    
    - name: Invalidate CloudFront
      run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## 迁移指南

### 从Webpack迁移
```javascript
// webpack.config.js → vite.config.js

// Webpack配置
module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  }
}

// 对应的Vite配置
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // SCSS配置
      }
    }
  }
})
```

### 常见迁移问题
```javascript
// 1. require() → import
// 旧的写法
const utils = require('./utils')

// 新的写法
import utils from './utils'

// 2. 动态require → 动态import
// 旧的写法
const module = require(`./modules/${name}.js`)

// 新的写法
const module = await import(`./modules/${name}.js`)

// 3. process.env → import.meta.env
// 旧的写法
if (process.env.NODE_ENV === 'development') {
  // ...
}

// 新的写法
if (import.meta.env.DEV) {
  // ...
}

// 4. __dirname → import.meta.url
// 旧的写法
const currentDir = __dirname

// 新的写法
import { fileURLToPath, URL } from 'node:url'
const currentDir = fileURLToPath(new URL('.', import.meta.url))
```

## 性能优化

### 开发时性能
```javascript
// vite.config.js
export default defineConfig({
  server: {
    // 预热常用文件
    warmup: {
      clientFiles: ['./src/components/*.vue', './src/utils/*.ts']
    }
  },
  
  optimizeDeps: {
    // 预构建大型依赖
    include: ['lodash', 'moment', 'echarts']
  }
})
```

### 构建时性能
```javascript
// vite.config.js
export default defineConfig({
  build: {
    // 使用更快的压缩器
    minify: 'esbuild', // 比terser快但压缩率稍低
    
    // 禁用压缩大小报告以加快构建
    reportCompressedSize: false,
    
    // 调整chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      // 外部化依赖
      external: ['vue', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
```

## 故障排除

### 常见问题
```javascript
// 1. 依赖预构建问题
// 清除缓存
rm -rf node_modules/.vite

// 强制重新预构建
vite --force

// 2. 路径解析问题
// 检查别名配置
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
}

// 3. 环境变量问题
// 确保变量以VITE_开头
VITE_API_URL=http://localhost:3000

// 4. 热更新不工作
// 检查文件监听配置
server: {
  watch: {
    usePolling: true // 在某些系统上需要
  }
}
```

### 调试技巧
```javascript
// 启用调试模式
DEBUG=vite:* npm run dev

// 分析构建产物
npm run build -- --mode analyze

// 检查依赖预构建
vite optimize --force

// 查看配置
vite config
```

## 最佳实践

### 1. 项目组织
```
src/
├── assets/          # 静态资源
├── components/      # 可复用组件
├── composables/     # 组合式函数
├── layouts/         # 布局组件
├── pages/           # 页面组件
├── plugins/         # 插件
├── stores/          # 状态管理
├── styles/          # 样式文件
├── utils/           # 工具函数
├── App.vue
└── main.js
```

### 2. 性能优化
```javascript
// 懒加载路由
const routes = [
  {
    path: '/heavy',
    component: () => import('./views/Heavy.vue')
  }
]

// 预加载关键资源
<link rel="preload" href="/critical.css" as="style">
<link rel="prefetch" href="/next-page.js">

// 使用Web Workers
const worker = new Worker(new URL('./worker.js', import.meta.url))
```

### 3. 代码质量
```javascript
// ESLint + Prettier配置
// .eslintrc.js
module.exports = {
  extends: [
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ]
}

// Husky + lint-staged
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,vue,ts}": ["eslint --fix", "git add"]
  }
}
```

## 总结

Vite是现代前端开发的优秀构建工具，具有以下特点：

### 优势
- **极快的启动速度**：基于ES模块的开发服务器
- **即时热更新**：不受项目大小影响的HMR
- **现代化**：原生支持TypeScript、JSX、CSS预处理器
- **优化的构建**：基于Rollup的生产构建
- **丰富的生态**：兼容Rollup插件，活跃的社区

### 适用场景
- **现代前端项目**：Vue、React、Svelte等
- **快速原型开发**：极快的启动和热更新
- **大型项目**：优秀的构建性能
- **团队协作**：统一的开发体验

### 学习建议
1. **理解ES模块**：Vite的核心原理
2. **掌握配置**：灵活的配置系统
3. **学习插件**：扩展Vite功能
4. **实践项目**：在实际项目中使用
5. **关注生态**：跟上社区发展

Vite代表了前端构建工具的未来方向，其快速、现代化的特性使其成为新项目的首选构建工具。