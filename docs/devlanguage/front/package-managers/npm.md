# npm

npm 是 Node.js 生态中最通用的包管理器，通常随 Node.js 一起安装。它的优势是默认可用、兼容性好、文档和社区资料最多。对于普通前端项目、库项目和 CI 环境，npm 是最稳妥的基线选择。

## 适用场景

npm 适合工具链要求简单、团队成员水平差异较大、项目不需要复杂 Monorepo 能力的场景。它生成 `package-lock.json`，通过 `npm ci` 可以在 CI 中按锁文件进行干净安装。

如果项目依赖规模很大、仓库里包含多个应用和包，npm 也能使用 Workspaces，但依赖边界和磁盘复用能力通常不如 pnpm 明确。

## 常用命令

![npm依赖锁与构建验证合同](/front/package-managers/install-contract.svg)

```bash
# 初始化
npm init
npm init -y

# 安装全部依赖
npm install

# 按锁文件干净安装，适合 CI
npm ci

# 添加依赖
npm install vue
npm install -D vite

# 移除依赖
npm uninstall vue

# 查看依赖
npm list --depth=0
npm outdated

# 执行脚本
npm run dev
npm run build

# 安全审计
npm audit
```

`npm ci`要求锁文件与清单匹配，删除现有`node_modules`且不改清单和锁文件；缺锁或不一致应失败。生成锁时影响依赖树的配置，如`legacy-peer-deps`或`install-links`，CI也需一致。它仍可运行生命周期脚本，不代表离线或不执行代码。

例如安装`is-number@7.0.0`后，将清单单独改为`6.0.0`，`npm ci`应失败。应审查依赖变更并重新生成锁，不能在CI前临时运行`npm install`掩盖不一致。

## package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=22.12.0",
    "npm": ">=11"
  },
  "packageManager": "npm@11.19.1"
}
```

`dependencies` 放运行时依赖，`devDependencies` 放构建、测试、类型、格式化工具。前端项目最终会被构建成静态资源，但依赖分类仍然有意义，尤其是库项目和服务端渲染项目。

## registry 配置

项目级 registry 建议写在项目根目录 `.npmrc`，不要只依赖个人机器的全局配置：

```ini
registry=https://registry.npmjs.org/
save-exact=false
engine-strict=true
```

企业私有包通常按 scope 配置：

```ini
@company:registry=https://npm.company.com
//npm.company.com/:_authToken=${NPM_TOKEN}
```

不要把真实 token 提交到仓库。CI 中应通过变量注入。

## Workspaces

```json
{
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

安装依赖到指定工作区：

```bash
npm install lodash -w packages/shared
npm run build -w apps/admin
```

npm Workspaces 适合简单多包项目。如果仓库里包数量多、依赖关系复杂，通常优先评估 pnpm。

静态前端构建通常需要开发依赖，不能构建前`--omit=dev`导致Vite缺失；SSR运行时还需要服务端依赖。`engines`是否强制取决于配置，`packageManager`也不自动替换当前npm。

依赖提升可能让未声明的传递包恰好可见，发布后却找不到。每个包应声明直接导入的依赖。用`npm explain 包名`定位来源，用`npm ls 包名`查看树；`npm audit fix`会改变依赖，需要审查与回归。开发工具风险也影响构建机，不能只检查最终浏览器包。

## 排查

| 现象 | 检查点 |
| --- | --- |
| `npm ci` 失败 | `package-lock.json` 是否和 `package.json` 同步 |
| 安装慢 | registry、代理、CI 缓存、网络出口 |
| 全局命令找不到 | 不优先全局安装，改用 `npx` 或项目脚本 |
| 依赖安全告警 | 先判断是否进入生产包，再升级直接依赖 |
| 本地和 CI 结果不同 | Node.js、npm 版本和锁文件是否一致 |
