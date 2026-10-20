# Vite：开发反馈、生产构建与路径合同

Vite 提供开发服务器和生产构建。开发阶段按浏览器请求转换源码并维护模块更新关系；生产阶段从入口构建依赖图，输出可部署资源。开发启动、依赖扫描和 HMR 都受模块数量、插件、文件系统与更新边界影响，不能承诺“项目再大耗时也恒定”。

本页按 Vite 8 解释：依赖优化与生产打包使用 Rolldown，JavaScript 转换和默认压缩使用 Oxc。旧版本的 Rollup/esbuild 配置不能原样当作当前机制；迁移时要连同框架插件、目标浏览器、配置项和锁文件一起核对。

![Vite 的开发模块路径与生产发布路径](/front/build-tools/vite-delivery.svg)

## 一个可部署到子路径的项目

下面创建独立演示项目，选择符合 Vite 8 要求的 Node 版本，例如 Node 22.12+。锁文件与 Node、npm 版本一起保存，后续在干净环境使用 `npm ci`。

```bash
mkdir vite-demo
cd vite-demo
npm init -y
npm pkg set type=module
npm install -D vite@^8 typescript
npm pkg set 'scripts.dev=vite' 'scripts.build=tsc --noEmit && vite build' 'scripts.preview=vite preview'
mkdir src
```

根目录的 `index.html` 是入口，资源通过依赖图进入构建：

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>数量演示</title>
<button type="button">加一件</button>
<output aria-live="polite">1</output>
<script type="module" src="/src/main.ts"></script>
</html>
```

`src/main.ts` 只处理本地数量，样式放在 `src/style.css`，例如 `body { font-family: sans-serif; }`。

```ts
import './style.css';

const button = document.querySelector<HTMLButtonElement>('button');
const output = document.querySelector<HTMLOutputElement>('output');
if (!button || !output) throw new Error('入口控件缺失');
let quantity = 1;
button.addEventListener('click', () => {
  output.value = String(++quantity);
});
```

`tsconfig.json` 确定检查范围。Vite 能转换 TypeScript 不等于完成类型检查，所以构建脚本单独运行 `tsc`。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

`vite.config.mjs` 声明部署前缀。这里保留默认打包策略，需要定制底层选项时再使用 Vite 8 的 `build.rolldownOptions`，避免先堆分包配置。

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/shop/',
  server: { host: '127.0.0.1', port: 5187, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
});
```

先 `npm run dev` 点击按钮，再 `npm run build`、`npm run preview` 访问输出中的 `/shop/`。检查 HTML 引用的 JS/CSS 都带正确前缀，刷新后控件仍能工作。预览只服务构建产物，不能代替正式服务器的重写、缓存和权限配置。

## 插件、HMR 与依赖优化

Vue SFC、React Fast Refresh 等需要对应插件。插件里的转换工作、依赖解析和生成产物职责不同，不是每个 Rollup 插件都能不加判断用于开发服务器。添加插件先确认当前 Vite 大版本、插件 peerDependencies、执行环境以及使用的 hook。

HMR 会沿受影响模块图寻找可接受更新的边界；找到时局部更新，找不到或插件要求时可整页刷新。组件状态是否保留取决于更新类型与框架集成，普通模块的局部变量不应被当作持久状态。自行接入定时器或监听器时，要在 dispose 中撤销旧资源。

依赖预构建主要改善开发时的依赖访问；生产构建是另一条路径。遇到链接包或新增依赖识别异常，可以在保存现场后运行 `npm run dev -- --force` 重建优化缓存。缓存清理不是所有解析错误的通用修复，仍需检查依赖声明、导出条件和路径大小写。

## 环境与资源的边界

`VITE_` 前缀变量会暴露给浏览器代码，`.env.local` 只影响本地版本管理约定，不会让进入构建的值变成秘密。密钥放在后端；客户端只使用可公开配置，例如 API 路径或站点名称。`import.meta.env` 中自定义值默认是字符串，`"false"` 不能直接当布尔值。

`--mode staging` 选择 mode 相关配置，不等价于切换生产优化或任意 Node 环境变量。开发代理仅对开发服务器有效，生产 API 路由要由网关或后端部署实现；增加 `cors: true` 也不能让别的服务器自动允许跨源。

源码 import 的资源可进入指纹化与转换；默认 `public/` 的文件原样复制，不能一律套用 immutable 长缓存。项目也可能自定义 `publicDir`，应看实际配置。`base` 不会自动重写任意运行时拼出的字符串 URL，动态路径应按部署合同生成。

## 排查与验收

| 现象 | 先取什么证据 | 修正方向 |
| --- | --- | --- |
| 开发正常，子路径资源404 | 生产HTML与Network实际URL | base、资源引用和服务器挂载前缀一致 |
| 构建过了，类型仍错误 | tsc或框架类型检查输出 | 将独立类型检查纳入门禁 |
| 更新后整页刷新 | HMR日志、变动模块与插件 | 判断是否有接受边界，不承诺保留任意状态 |
| 浏览器里出现内部值 | 构建文件、env前缀与define | 从客户端产物移除秘密，必要时轮换已泄露凭据 |
| 首次导入慢 | 依赖优化日志、请求瀑布 | 先区分下载、转换和模块数量，再调整 |

升级前对照 [开发与构建模型](../frontend-foundations-series/20-vite-build-pipeline.md)，发布继续看 [交付与可观测性](../frontend-foundations-series/29-frontend-delivery-observability.md)。不要用增大 chunk 警告阈值冒充包体积优化，也不要为了减小包而外部化浏览器无法解析的依赖。
