# SDKMAN! —— 多语言SDK版本管理器

SDKMAN! 是一个跨平台（主要支持 macOS 与 Linux）的命令行工具，用于安装、管理并切换多种开发工具/SDK 的多个版本，如 Java、Kotlin、Scala、Groovy、Maven、Gradle 等。它能让你在同一台机器上轻松维护不同项目所需的不同工具链版本。

## 为什么选择 SDKMAN!

- 多版本共存与一键切换：在同一环境下维护多个版本并快速切换
- 覆盖主流 JVM 生态工具：Java、Maven、Gradle、Kotlin、Scala、Groovy 等
- 非侵入式与用户态安装：无需管理员权限，安装于用户目录下
- 面向项目的环境文件：以 .sdkmanrc 定义项目所需版本，进入目录即可生效
- 统一命令体验：安装、卸载、查看、切换等命令一致

## 安装

> 支持 macOS 与 Linux。Windows 推荐通过 WSL 使用，或选择其他 Windows 版本管理方案。

- 交互式安装（推荐）：

```bash
curl -s "https://get.sdkman.io" | bash
# 安装完成后，按提示重新打开终端，或手动执行：
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

- 验证安装：

```bash
sdk version
```

若出现 “command not found”，请检查 shell 初始化文件是否已 source：

```bash
# zsh
source "$HOME/.sdkman/bin/sdkman-init.sh"
# bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

## 基本概念

- Candidate（候选项）：被管理的工具类别，例如 java、maven、gradle
- Version（版本）：某个候选项的具体版本号/发行版标识
- Default（默认版本）：当前用户全局默认使用的版本
- Current（当前版本）：当前会话正在使用的版本

## 常用命令速查

- 查看所有候选项与可用版本：

```bash
sdk list            # 总览
sdk list java       # 查看 Java 可用发行版/版本
sdk list maven      # 查看 Maven 版本
```

- 安装/卸载：

```bash
sdk install java <version>      # 安装指定 Java 版本
sdk uninstall java <version>    # 卸载指定 Java 版本
```

- 切换/设置默认：

```bash
sdk use java <version>          # 当前会话临时切换
sdk default java <version>      # 设置为全局默认版本
```

- 查询当前版本：

```bash
sdk current            # 显示所有候选项的当前版本
sdk current java       # 显示 Java 当前版本
```

- 升级：

```bash
sdk upgrade            # 检查并升级已安装候选项
```

- 帮助：

```bash
sdk help
```

## 典型工作流示例（以 Java/Maven/Gradle 为例）

```bash
# 查看可安装版本
sdk list java
sdk list maven
sdk list gradle

# 安装所需版本（示例版本号请以实际可用为准）
sdk install java 17.0.x-tem
sdk install maven 3.9.x
sdk install gradle 8.x

# 设置默认版本
sdk default java 17.0.x-tem
sdk default maven 3.9.x
sdk default gradle 8.x

# 临时切换当前会话版本
sdk use java 21.0.x-tem
```

## 项目级版本固定（.sdkmanrc）

在团队协作与多项目并行时，建议使用 .sdkmanrc 固定项目所需版本，确保一致的构建环境。

1) 在项目根目录创建 .sdkmanrc：

```properties
java=17.0.x-tem
maven=3.9.x
gradle=8.x
```

2) 初始化与启用项目环境：

```bash
sdk env init           # 在当前目录创建样例 .sdkmanrc（如未存在）
# 根据需要编辑 .sdkmanrc 后
sdk env                # 读取并切换到 .sdkmanrc 指定版本
sdk env install        # 按 .sdkmanrc 安装缺失的版本
```

> 提示：进入包含 .sdkmanrc 的目录后执行 `sdk env` 即可一键切换；离开目录后可通过 `sdk use` 或 `sdk default` 恢复其它版本。

## 目录结构与存放位置

- 安装根目录：`$HOME/.sdkman`
- 候选项目录：`$HOME/.sdkman/candidates/<candidate>`
- 初始化脚本：`$HOME/.sdkman/bin/sdkman-init.sh`

## 与其他工具的对比与协同

- asdf：多语言版本管理器，插件生态丰富；SDKMAN! 更聚焦 JVM 生态，开箱即用
- jenv：专注 Java 版本管理；SDKMAN! 同时覆盖 Maven/Gradle 等多种候选项
- vfox：通用跨平台版本管理（参见本仓库 vfox 文档）；SDKMAN! 在 JVM 家族上资源更集中
- nvm：Node.js 版本管理器；可与 SDKMAN! 并存，分别管理不同技术栈

## 常见问题（FAQ）

- sdk 命令无效或找不到：
  - 确认已执行 `source "$HOME/.sdkman/bin/sdkman-init.sh"`
  - 重新打开终端或在 shell 配置文件（如 `~/.zshrc`、`~/.bashrc`）中追加上述 source 行

- 无法下载或网络问题：
  - 检查代理设置（HTTP_PROXY/HTTPS_PROXY）
  - 稍后重试或切换网络

- Windows 如何使用：
  - 推荐在 WSL 中安装使用

## 卸载

```bash
# 删除目录
rm -rf "$HOME/.sdkman"
# 从 shell 初始化文件中移除对 sdkman-init.sh 的引用
```

## 最佳实践

- 团队项目统一使用 .sdkmanrc 固定版本，保证一致性
- 使用 `sdk default` 设置“常用版本”，再通过 `sdk use` 临时切换
- 定期 `sdk upgrade`，关注安全修复与功能更新
- 与 CI/CD 协同：在构建容器/镜像中预装所需版本，避免每次动态下载

---

通过 SDKMAN!，你可以以最小成本在本机维护稳定、可重复的多版本开发环境，显著提升多人协作与多项目并行时的开发效率与一致性。