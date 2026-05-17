# Corepack

Corepack 是 Node.js 项目中管理包管理器版本的工具入口。它会读取项目 `package.json` 里的 `packageManager` 字段，并为 pnpm、Yarn 等包管理器准备对应版本。团队协作时，Corepack 的价值在于减少“同一项目被不同包管理器版本安装”的问题。

## 适用场景

多人协作、CI 构建、Monorepo 和长期维护项目都建议固定包管理器版本。只锁依赖版本还不够，包管理器自身的解析规则变化也可能改变安装结果。

## 基本用法

启用 Corepack：

```bash
corepack enable
```

准备指定版本：

```bash
corepack prepare pnpm@10.0.0 --activate
corepack prepare yarn@4.0.0 --activate
```

在项目中写入包管理器版本：

```json
{
  "packageManager": "pnpm@10.0.0"
}
```

之后团队成员进入项目执行 `pnpm install` 或 `yarn install` 时，会使用项目声明的版本。

## 与 npm 的关系

npm 通常随 Node.js 安装，是默认可用的包管理器。Corepack 更常用于管理 pnpm 和 Yarn 的版本。实际项目中可以这样理解：

```text
Node.js 版本管理：nvm、fnm、volta、asdf 等
包管理器版本管理：Corepack + packageManager 字段
依赖版本锁定：lockfile
```

这三层解决的是不同问题，不要混为一谈。

## CI 配置

```yaml
install:
  script:
    - corepack enable
    - pnpm install --frozen-lockfile
```

如果 CI 基础镜像没有 Corepack，先升级 Node.js 镜像，或者在镜像里明确安装需要的包管理器版本。不要让流水线自动使用“当前最新版本”。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 本地 pnpm 版本和项目不一致 | 是否执行 `corepack enable`，`packageManager` 是否存在 |
| CI 找不到 pnpm 或 Yarn | Node.js 镜像是否包含 Corepack，是否启用 |
| 安装结果变化 | 包管理器版本是否被锁定，锁文件是否提交 |
| 多项目切换混乱 | 每个项目是否都写了自己的 `packageManager` 字段 |
