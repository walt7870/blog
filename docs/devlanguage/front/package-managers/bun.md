# Bun

Bun 不只是包管理器，它同时提供 JavaScript 运行时、脚本执行器、测试工具和打包能力。作为包管理器使用时，Bun 的目标是兼容 Node.js 项目中的 `package.json`，并提供更快的依赖安装和脚本执行体验。

## 适用场景

Bun 适合新工具链试点、内部工具、脚手架、构建脚本和对安装速度敏感的项目。对于核心生产项目，尤其是依赖复杂的 SSR、Node.js 服务端运行时或原生扩展项目，应先验证兼容性，再决定是否替换 npm、pnpm 或 Yarn。

前端静态应用只把 Bun 用作安装器和脚本执行器时，迁移风险通常低于把 Bun 作为服务端运行时。

![Bun依赖安装、脚本信任与运行验证](/front/package-managers/bun-script-trust.svg)

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
  "packageManager": "bun@1.3.0"
}
```

Bun1.2起新项目默认使用文本`bun.lock`，老项目可能仍有`bun.lockb`。迁移先保留旧基线，明确转换锁与CI步骤。`packageManager`记录预期工具，不意味着Corepack会管理Bun，二进制安装与版本检查另行配置。

## 迁移验证

```bash
# 在独立副本验证，保留原锁文件基线
bun --version
bun install
bun install --frozen-lockfile
bun run build
bun run test
```

如果依赖`postinstall`、原生模块或Workspace，要确认脚本实际执行。Bun不默认执行任意依赖生命周期脚本，内置受信任名单和项目`trustedDependencies`影响执行结果；安装退出0不代表原生扩展已构建。

显式允许脚本前先审查来源和用途，再用固定Bun版本验证名单语义，不为单个包全局信任所有依赖。业务脚本的shebang、Node API、模块加载与平台扩展分别测试：用Bun安装一个包，不代表该包一定在Bun运行时执行。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 安装成功但构建失败 | 包是否依赖 npm/pnpm/Yarn 特定行为 |
| 脚本行为不同 | `bun run` 和原包管理器执行环境是否一致 |
| 原生模块异常 | 平台、Node ABI、编译工具链和包兼容性 |
| CI 与本地不同 | Bun 版本、锁文件和操作系统是否一致 |
| 想部分使用 Bun | 先只用于脚本或非核心包，不要在同一项目混用锁文件 |
