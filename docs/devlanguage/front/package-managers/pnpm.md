# pnpm

pnpm 的核心特点是快、节省磁盘空间、依赖边界更严格。它会把包内容存到全局内容寻址存储中，项目里的 `node_modules` 通过链接组织依赖，多个项目可以复用同一份包内容。

## 适用场景

pnpm 适合新项目、依赖数量较多的项目和 Monorepo。它默认不允许代码随意引用没有声明在自身 `package.json` 中的依赖，因此能更早暴露“幽灵依赖”问题。

如果项目依赖了老旧工具，可能会遇到对扁平 `node_modules` 的隐式假设。遇到这类问题时，先升级相关工具；确实无法升级时，再考虑局部兼容配置。

## 常用命令

```bash
# 启用 Corepack 后使用
corepack enable
corepack prepare pnpm@10.0.0 --activate

# 初始化和安装
pnpm init
pnpm install

# CI 安装
pnpm install --frozen-lockfile

# 添加依赖
pnpm add vue
pnpm add -D vite

# 移除依赖
pnpm remove vue

# 执行脚本
pnpm dev
pnpm build

# 临时执行包
pnpm dlx create-vite

# 清理全局 store 中不再使用的包
pnpm store prune
```

## Workspace

pnpm 的 Workspace 是它最常用的能力之一。根目录配置 `pnpm-workspace.yaml`：

```yaml
packages:
  - apps/*
  - packages/*
  - tools/*
```

典型目录：

```text
repo/
├── apps/
│   ├── admin/
│   └── mobile-h5/
├── packages/
│   ├── ui/
│   └── shared/
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

在指定包执行命令：

```bash
pnpm --filter admin build
pnpm --filter @company/ui test
```

工作区内部依赖可以使用 `workspace:` 协议，避免误装线上同名包：

```json
{
  "dependencies": {
    "@company/shared": "workspace:*"
  }
}
```

## 常用配置

项目根目录 `.npmrc`：

```ini
registry=https://registry.npmmirror.com
strict-peer-dependencies=false
auto-install-peers=true
```

`strict-peer-dependencies=false` 可以减少部分老项目迁移时的阻塞，但不应掩盖真实版本冲突。长期维护项目应尽量把框架、插件和 UI 库版本对齐。

## CI 缓存

pnpm 的缓存重点是 store，而不是只缓存 `node_modules`。CI 中通常缓存 pnpm store，再执行：

```bash
pnpm install --frozen-lockfile
pnpm build
```

如果构建机每次都是全新环境，可以先查看 store 路径：

```bash
pnpm store path
```

## 排查

| 现象 | 检查点 |
| --- | --- |
| 代码引用某依赖失败 | 当前包是否在自己的 `package.json` 中声明该依赖 |
| peer 依赖告警很多 | 框架、插件、UI 库版本是否匹配 |
| 迁移后构建失败 | 老工具是否依赖扁平 `node_modules` |
| CI 缓存无效 | 是否缓存了 pnpm store，包管理器版本是否固定 |
| 锁文件变化很大 | 是否多人混用 npm、Yarn 或不同 pnpm 版本 |
