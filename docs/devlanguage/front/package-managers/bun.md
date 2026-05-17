# Bun

Bun 不只是包管理器，它同时提供 JavaScript 运行时、脚本执行器、测试工具和打包能力。作为包管理器使用时，Bun 的目标是兼容 Node.js 项目中的 `package.json`，并提供更快的依赖安装和脚本执行体验。

## 适用场景

Bun 适合新工具链试点、内部工具、脚手架、构建脚本和对安装速度敏感的项目。对于核心生产项目，尤其是依赖复杂的 SSR、Node.js 服务端运行时或原生扩展项目，应先验证兼容性，再决定是否替换 npm、pnpm 或 Yarn。

前端静态应用只把 Bun 用作安装器和脚本执行器时，迁移风险通常低于把 Bun 作为服务端运行时。

## 常用命令

```bash
# 安装依赖
bun install

# CI 安装
bun install --frozen-lockfile

# 添加依赖
bun add vue
bun add -d vite

# 移除依赖
bun remove vue

# 执行脚本
bun run dev
bun run build

# 临时执行包
bunx create-vite
```

## 项目配置

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "packageManager": "bun@1.2.0"
}
```

Bun 会生成自己的锁文件。迁移时不要同时保留 `package-lock.json`、`pnpm-lock.yaml`、`yarn.lock` 和 Bun 锁文件。

## 迁移验证

```bash
rm -rf node_modules
bun install
bun run build
bun run test
```

如果项目依赖 `postinstall`、原生模块、特定 npm 生命周期脚本或复杂 Workspace，迁移后要额外确认这些脚本是否按预期执行。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 安装成功但构建失败 | 包是否依赖 npm/pnpm/Yarn 特定行为 |
| 脚本行为不同 | `bun run` 和原包管理器执行环境是否一致 |
| 原生模块异常 | 平台、Node ABI、编译工具链和包兼容性 |
| CI 与本地不同 | Bun 版本、锁文件和操作系统是否一致 |
| 想部分使用 Bun | 先只用于脚本或非核心包，不要在同一项目混用锁文件 |
