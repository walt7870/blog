# Yarn

Yarn 分为两个常见分支：Yarn Classic，也就是 1.x；Yarn Berry，也就是 2.x 之后的现代 Yarn。维护已有项目时，要先确认项目使用的是哪一类，因为配置文件、安装模式和命令细节差异明显。

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
  "packageManager": "yarn@4.0.0"
}
```

启用：

```bash
corepack enable
yarn install
```

## nodeLinker

现代 Yarn 默认可以使用 PnP，也可以切回 `node_modules`。项目根目录 `.yarnrc.yml`：

```yaml
nodeLinker: node-modules
```

如果项目工具链对 PnP 兼容性不足，先使用 `node-modules` 模式更稳。等构建、测试、IDE 都确认支持后，再评估 PnP。

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

## 排查

| 现象 | 检查点 |
| --- | --- |
| 同事安装结果不同 | Yarn 版本是否固定，是否启用 Corepack |
| IDE 类型提示异常 | PnP SDK 是否配置，或是否需要切回 `node-modules` |
| 老项目命令不兼容 | 当前是 Yarn Classic 还是 Yarn Berry |
| CI 安装修改锁文件 | 是否使用 `yarn install --immutable` |
| 依赖解析失败 | `resolutions`、peer 依赖和插件版本是否冲突 |
