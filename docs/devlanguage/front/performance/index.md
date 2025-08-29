# 前端性能优化指南

## 性能优化的重要性

在现代 Web 应用中，性能直接影响用户体验和业务指标。研究表明，页面加载时间每增加1秒，转化率就会下降7%。

## 性能指标

### 核心 Web 指标 (Core Web Vitals)
- **LCP (Largest Contentful Paint)**: 最大内容绘制时间 < 2.5s
- **FID (First Input Delay)**: 首次输入延迟 < 100ms  
- **CLS (Cumulative Layout Shift)**: 累积布局偏移 < 0.1

### 其他重要指标
- **FCP (First Contentful Paint)**: 首次内容绘制
- **TTI (Time to Interactive)**: 可交互时间
- **TBT (Total Blocking Time)**: 总阻塞时间

## 加载性能优化

### 代码分割 (Code Splitting)

#### 路由级别的代码分割
```javascript
// React Router 示例
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

#### 组件级别的代码分割
```javascript
// 动态导入组件
const HeavyComponent = lazy(() => 
  import('./components/HeavyComponent')
);

function MyComponent() {
  const [show, setShow] = useState(false);
  
  return (
    <>
      <button onClick={() => setShow(true)}>Show</button>
      {show && (
        <Suspense fallback={<div>Loading...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </>
  );
}
```

### 懒加载 (Lazy Loading)

#### 图片懒加载
```html
<!-- 原生懒加载 -->
<img src="image.jpg" loading="lazy" alt="Description">

<!-- Intersection Observer API -->
<script>
const images = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});

images.forEach(img => imageObserver.observe(img));
</script>
```

#### 组件懒加载
```javascript
// Vue 异步组件
const AsyncComp = defineAsyncComponent(() =>
  import('./components/MyComp.vue')
);

// 带加载状态的异步组件
const AsyncCompWithLoading = defineAsyncComponent({
  loader: () => import('./components/MyComp.vue'),
  loadingComponent: LoadingComp,
  delay: 200,
  timeout: 3000
});
```

### 预加载和预获取

#### 资源预加载
```html
<!-- 预加载关键资源 -->
<link rel="preload" href="critical-font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="main.css" as="style">

<!-- 预获取下一页资源 -->
<link rel="prefetch" href="next-page-bundle.js">

<!-- DNS预解析 -->
<link rel="dns-prefetch" href="//example-cdn.com">
```

## 网络优化

### CDN使用
```javascript
// Webpack配置CDN
module.exports = {
  output: {
    publicPath: 'https://cdn.example.com/'
  },
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM'
  }
};
```

### 缓存策略
```javascript
// Service Worker缓存策略
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
```

## 渲染性能优化

### 减少重排和重绘
```javascript
// 批量DOM操作
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div');
  div.textContent = `Item ${i}`;
  fragment.appendChild(div);
}
document.body.appendChild(fragment);

// 使用transform替代top/left
// 不推荐
// element.style.top = '100px';

// 推荐
element.style.transform = 'translateY(100px)';
```

### 虚拟滚动
```javascript
// React虚拟滚动示例
import { FixedSizeList } from 'react-window';

function LargeList({ items }) {
  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={35}
      width={300}
    >
      {({ index, style }) => (
        <div style={style}>
          {items[index]}
        </div>
      )}
    </FixedSizeList>
  );
}
```

## 图片优化

### 响应式图片
```html
<picture>
  <source media="(min-width: 1200px)" srcset="hero-large.webp" type="image/webp">
  <source media="(min-width: 768px)" srcset="hero-medium.webp" type="image/webp">
  <img src="hero-small.jpg" alt="Hero image" loading="lazy">
</picture>
```

### 现代图片格式
- **WebP**: 比JPEG小25-35%
- **AVIF**: 比WebP小20-50%
- **JPEG XL**: 下一代图片格式

### 图片压缩
```javascript
// 使用Sharp进行图片压缩
const sharp = require('sharp');

sharp('input.jpg')
  .resize(800, 600)
  .jpeg({ quality: 85 })
  .toFile('output.jpg');
```

## 代码优化

### Tree Shaking
```javascript
// 确保使用ES6模块
// package.json
{
  "sideEffects": ["*.css"],
  "main": "dist/index.js",
  "module": "dist/index.esm.js"
}

// Webpack配置
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: false
  }
};
```

### 压缩和混淆
```javascript
// Terser配置
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      })
    ]
  }
};
```

## 性能监控

### 使用Performance API
```javascript
// 监控关键指标
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];
  
  console.log('DNS查询时间:', perfData.domainLookupEnd - perfData.domainLookupStart);
  console.log('TCP连接时间:', perfData.connectEnd - perfData.connectStart);
  console.log('页面加载时间:', perfData.loadEventEnd - perfData.loadEventStart);
});

// 监控资源加载
performance.getEntriesByType('resource').forEach(resource => {
  console.log(`${resource.name}: ${resource.duration}ms`);
});
```

### 使用Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

## 性能优化清单

### 开发阶段
- [ ] 启用代码分割
- [ ] 配置懒加载
- [ ] 优化图片资源
- [ ] 使用CDN
- [ ] 配置缓存策略

### 构建阶段
- [ ] 启用Tree Shaking
- [ ] 压缩代码
- [ ] 优化打包大小
- [ ] 生成source map
- [ ] 检查bundle分析

### 部署阶段
- [ ] 配置gzip压缩
- [ ] 设置缓存头
- [ ] 使用Service Worker
- [ ] 监控性能指标
- [ ] 设置性能预算

## 性能工具推荐

### 分析工具
- **Lighthouse**: Google的性能分析工具
- **WebPageTest**: 详细的性能测试
- **Chrome DevTools**: 内置开发者工具
- **Bundle Analyzer**: 包大小分析

### 监控工具
- **Core Web Vitals**: 核心Web指标监控
- **Performance Observer**: 性能观察API
- **Google Analytics**: 用户行为分析
- **Sentry**: 错误和性能监控

## 总结

前端性能优化是一个持续的过程，需要从开发、构建到部署的全流程考虑。通过合理的代码分割、资源优化、网络优化和监控，可以显著提升用户体验和应用性能。