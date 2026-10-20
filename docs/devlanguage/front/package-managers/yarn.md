# Yarn

Yarn 分为两个常见分支：Yarn Classic，也就是 1.x；Yarn Berry，也就是 2.x 之后的现代 Yarn。维护已有项目时，要先确认项目使用的是哪一类，因为配置文件、安装模式和命令细节差异明显。

![node_modules与Yarn PnP的解析合同](/front/package-managers/yarn-resolution.svg)

## 适用场景

Yarn Classic 适合已有老项目继续维护。它的命令简单，和传统 `node_modules` 模式兼容性好。

Yarn Berry 适合希望使用 Workspaces、约束规则、插件机制和 Plug'n'Play 的团队。PnP 能减少 `node_modules` 带来的开销，但一些工具可能需要额外适配。企业项目迁移时，应先在分支中验证构建、测试、IDE 类型提示和编辑器插件。

## 常用命令

```bash
# 安装全部依赖
yarn install

# 现代 Yarn 的不可变安装，适合 CI
yarn install --immutable

# 添加依赖
yarn add vue
yarn add -D vite

# 移除依赖
yarn remove vue

# 更新依赖
yarn up vite

# 执行脚本
yarn dev
yarn build

# 临时执行包
yarn dlx create-vite
```

Yarn Classic 中常见的是 `yarn upgrade`；现代 Yarn 中更常用 `yarn up`。维护老项目时不要机械替换命令，先看项目的 Yarn 版本。

## 版本固定

推荐使用 `packageManager` 字段和 Corepack 固定 Yarn 版本：

```json
{
  "packageManager": "yarn@4.9.2"
}
```

启用：

```bash
corepack install
corepack yarn --version
corepack yarn install
```

## nodeLinker

现代Yarn默认采用PnP，也可选择`node_modules`。PnP通过`.pnp.cjs`等映射解析包内容，工具运行需要加载解析环境；不能因没有`node_modules`就认定失败。项目`.yarnrc.yml`可明确选择：

```yaml
nodeLinker: node-modules
```

如果项目工具链对 PnP 兼容性不足，先使用 `node-modules` 模式更稳。等构建、测试、IDE 都确认支持后，再评估 PnP。

现代Yarn使用`.yarnrc.yml`配置registry与认证，不将`.npmrc`当作通用配置。`npmRegistryServer`、`npmScopes`和`npmAuthToken`分别声明，见[镜像与私有源](./registry.md)。Yarn1有不同的旧配置行为。

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

执行指定工作区命令：

```bash
yarn workspace admin build
yarn workspaces foreach -A run test
```

`foreach -A`选择全部工作区，不自动保证共享库先构建。存在构建依赖时使用拓扑顺序，例如`yarn workspaces foreach -A -t run build`，并核对依赖声明。命令成功也不能代替每个产物检查。

`--immutable`禁止修改锁文件，不禁止所有缓存写入；零安装方案还需核对缓存策略。用`yarn node`验证直接依赖导入，再故意修改清单而不改锁，确认不可变安装失败；切换linker后也验证编辑器与测试运行器。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 同事安装结果不同 | Yarn 版本是否固定，是否启用 Corepack |
| IDE 类型提示异常 | PnP SDK 是否配置，或是否需要切回 `node-modules` |
| 老项目命令不兼容 | 当前是 Yarn Classic 还是 Yarn Berry |
| CI 安装修改锁文件 | 是否使用 `yarn install --immutable` |
| 依赖解析失败 | `resolutions`、peer 依赖和插件版本是否冲突 |
