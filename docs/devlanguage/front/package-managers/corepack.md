# Corepack

Corepack 是 Node.js 项目中管理包管理器版本的工具入口。它会读取项目 `package.json` 里的 `packageManager` 字段，并为 pnpm、Yarn 等包管理器准备对应版本。团队协作时，Corepack 的价值在于减少“同一项目被不同包管理器版本安装”的问题。

## 适用场景

![Corepack选择安装器与依赖锁文件的职责](/front/package-managers/install-contract.svg)

Node从14.19起曾随发行版提供Corepack，但从Node25开始不再捆绑，系统包也可能裁剪它。先检查`node --version`、`corepack --version`和命令路径，升级Node并不保证Corepack出现。

多人协作、CI 构建、Monorepo 和长期维护项目都建议固定包管理器版本。只锁依赖版本还不够，包管理器自身的解析规则变化也可能改变安装结果。

## 基本用法

已有兼容Corepack时启用代理；缺少时，在开发机或CI镜像固定安装。以下0.36.0是工具版本示例，先核对其Node兼容要求，不是让旧Node直接安装：

```bash
npm view corepack@0.36.0 engines --json
npm install -g corepack@0.36.0
corepack enable pnpm yarn
```

先写下方`packageManager`，再准备项目声明的安装器：

```bash
corepack install
corepack pnpm --version
```

在项目中写入包管理器版本：

```json
{
  "packageManager": "pnpm@10.32.0"
}
```

通过Corepack代理执行`pnpm`时会选择声明版本；绕过代理直接运行另一份全局二进制仍可能避开检查。`packageManager`可附加完整性摘要。`corepack use pnpm@10.32.0`会写入选择并触发安装，应作为依赖变更审查。

## 与 npm 的关系

npm 通常随 Node.js 安装，是默认可用的包管理器。Corepack 更常用于管理 pnpm 和 Yarn 的版本。实际项目中可以这样理解：

Corepack默认不启用npm代理，普通`npm`调用不能仅凭`packageManager`就保证被接管。Corepack也不负责选择Node版本或解析项目依赖。

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
    - corepack install
    - corepack pnpm install --frozen-lockfile
```

CI镜像预装固定兼容Corepack，显式调用可以避免无权限写系统代理目录。离线环境还需提前缓存安装器与项目依赖，这是两份缓存。签名失败先核对工具版本、时间和信任链，不关闭校验绕过问题。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 本地 pnpm 版本和项目不一致 | 是否执行 `corepack enable`，`packageManager` 是否存在 |
| CI 找不到 pnpm 或 Yarn | Node.js 镜像是否包含 Corepack，是否启用 |
| 安装结果变化 | 包管理器版本是否被锁定，锁文件是否提交 |
| 多项目切换混乱 | 每个项目是否都写了自己的 `packageManager` 字段 |
