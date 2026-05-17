# npm

npm 是 Node.js 生态中最通用的包管理器，通常随 Node.js 一起安装。它的优势是默认可用、兼容性好、文档和社区资料最多。对于普通前端项目、库项目和 CI 环境，npm 是最稳妥的基线选择。

## 适用场景

npm 适合工具链要求简单、团队成员水平差异较大、项目不需要复杂 Monorepo 能力的场景。它生成 `package-lock.json`，通过 `npm ci` 可以在 CI 中按锁文件进行干净安装。

如果项目依赖规模很大、仓库里包含多个应用和包，npm 也能使用 Workspaces，但依赖边界和磁盘复用能力通常不如 pnpm 明确。

## 常用命令

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
npm audit fix
```

`npm ci` 会删除现有 `node_modules` 并完全按 `package-lock.json` 安装，适合流水线；本地开发通常使用 `npm install`。

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
    "vite": "^6.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20",
    "npm": ">=10"
  },
  "packageManager": "npm@10.9.0"
}
```

`dependencies` 放运行时依赖，`devDependencies` 放构建、测试、类型、格式化工具。前端项目最终会被构建成静态资源，但依赖分类仍然有意义，尤其是库项目和服务端渲染项目。

## registry 配置

项目级 registry 建议写在项目根目录 `.npmrc`，不要只依赖个人机器的全局配置：

```ini
registry=https://registry.npmmirror.com
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

## 排查

| 现象 | 检查点 |
| --- | --- |
| `npm ci` 失败 | `package-lock.json` 是否和 `package.json` 同步 |
| 安装慢 | registry、代理、CI 缓存、网络出口 |
| 全局命令找不到 | 不优先全局安装，改用 `npx` 或项目脚本 |
| 依赖安全告警 | 先判断是否进入生产包，再升级直接依赖 |
| 本地和 CI 结果不同 | Node.js、npm 版本和锁文件是否一致 |
