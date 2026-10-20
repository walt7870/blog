# pnpm

pnpm使用内容寻址store复用包文件，在项目虚拟store与符号链接中组织依赖。内容复用、依赖可见范围和锁文件是不同机制；文件导入方式受文件系统与配置影响，不能保证跨盘目录都只保存一份文件。

![pnpm内容存储与项目依赖关系](/front/package-managers/dependency-layout.svg)

## 适用场景

pnpm 适合新项目、依赖数量较多的项目和 Monorepo。它默认不允许代码随意引用没有声明在自身 `package.json` 中的依赖，因此能更早暴露“幽灵依赖”问题。

如果项目依赖了老旧工具，可能会遇到对扁平 `node_modules` 的隐式假设。遇到这类问题时，先升级相关工具；确实无法升级时，再考虑局部兼容配置。

## 常用命令

```bash
# 项目声明pnpm@10.32.0，先按Corepack页准备兼容工具
corepack install
corepack pnpm --version

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

以下采用pnpm10系列。根目录配置`pnpm-workspace.yaml`；筛选器匹配`package.json`的name，不能仅凭目录名推断：

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
registry=https://registry.npmjs.org/
strict-peer-dependencies=true
auto-install-peers=true
```

先把框架、插件和UI库peer版本对齐。设为false只改变是否阻止安装，不会使不兼容API可用。可见性还受提升配置、根依赖和工具解析规则影响，pnpm不是绝对阻止任意幽灵依赖的沙箱。

## 安装脚本策略

pnpm10默认限制依赖包的安装构建脚本。安装成功却缺少原生二进制时，检查被忽略的构建，不直接允许所有脚本。10.1起可用`pnpm approve-builds`交互审查；10系列决策保存在工作区配置的`onlyBuiltDependencies`与`ignoredBuiltDependencies`。后续大版本配置已变化，升级不能照搬旧字段。

批准前核对来源、版本和脚本用途，批准后重建并验证功能。允许脚本是在授予执行代码的能力，不是安全扫描结论。CI使用已审查并提交的明确名单，避免交互或全量批准成为隐式发布步骤。

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
