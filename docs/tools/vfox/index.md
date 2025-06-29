# vfox - 跨平台版本管理工具

vfox 是一个现代化的跨平台版本管理工具，用于管理多种编程语言和工具的版本。它提供了统一的接口来安装、切换和管理不同版本的开发工具。

## 概述

vfox 是 VersionFox 的简称，是一个用 Go 语言编写的版本管理器，旨在替代传统的版本管理工具如 nvm、pyenv、rbenv 等。它具有以下特点：

- **跨平台支持**：支持 Windows、macOS 和 Linux
- **统一接口**：一个工具管理多种语言版本
- **插件系统**：通过插件支持各种编程语言和工具
- **性能优异**：Go 语言编写，启动速度快
- **配置简单**：最小化配置，开箱即用

## 安装

### 自动安装脚本

**Unix/Linux/macOS:**
```bash
curl -sSL https://raw.githubusercontent.com/version-fox/vfox/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://raw.githubusercontent.com/version-fox/vfox/main/install.ps1 | iex
```

### 手动安装

1. 从 [GitHub Releases](https://github.com/version-fox/vfox/releases) 下载对应平台的二进制文件
2. 解压并将可执行文件放到 PATH 环境变量中
3. 重启终端或重新加载 shell 配置

### 包管理器安装

**Homebrew (macOS/Linux):**
```bash
brew install vfox
```

**Scoop (Windows):**
```powershell
scoop install vfox
```

## 基本使用

### 初始化

首次使用需要初始化 vfox：

```bash
vfox setup
```

这会在你的 shell 配置文件中添加必要的环境变量和函数。

### 插件管理

vfox 通过插件系统支持不同的编程语言和工具。

#### 添加插件

```bash
# 添加 Node.js 插件
vfox add nodejs

# 添加 Python 插件
vfox add python

# 添加 Java 插件
vfox add java

# 添加 Go 插件
vfox add golang
```

#### 查看已安装插件

```bash
vfox list
```

#### 移除插件

```bash
vfox remove nodejs
```

### 版本管理

#### 安装版本

```bash
# 安装最新版本
vfox install nodejs@latest

# 安装指定版本
vfox install nodejs@18.17.0
vfox install python@3.11.4
vfox install java@17.0.7

# 安装多个版本
vfox install nodejs@16.20.1 nodejs@18.17.0 nodejs@20.5.0
```

#### 查看可用版本

```bash
# 查看远程可用版本
vfox search nodejs
vfox search python

# 查看已安装版本
vfox list nodejs
vfox list python
```

#### 切换版本

```bash
# 全局切换
vfox use nodejs@18.17.0
vfox use python@3.11.4

# 项目级切换（在项目目录下）
vfox use nodejs@16.20.1 --project
vfox use python@3.9.17 --project

# 会话级切换（仅当前终端会话）
vfox use nodejs@20.5.0 --session
```

#### 卸载版本

```bash
vfox uninstall nodejs@16.20.1
vfox uninstall python@3.9.17
```

## 高级功能

### 项目配置文件

vfox 支持项目级别的版本配置，通过 `.vfox.yaml` 文件：

```yaml
# .vfox.yaml
versions:
  nodejs: "18.17.0"
  python: "3.11.4"
  java: "17.0.7"
```

当进入包含此文件的目录时，vfox 会自动切换到指定版本。

### 环境变量管理

vfox 可以管理与版本相关的环境变量：

```bash
# 查看当前环境变量
vfox env

# 查看特定插件的环境变量
vfox env nodejs

# 导出环境变量到当前 shell
eval "$(vfox env)"
```

### 别名功能

为常用版本创建别名：

```bash
# 创建别名
vfox alias nodejs lts 18.17.0
vfox alias python stable 3.11.4

# 使用别名
vfox use nodejs@lts
vfox use python@stable

# 查看别名
vfox alias list

# 删除别名
vfox alias remove nodejs lts
```

### 钩子脚本

vfox 支持在版本切换时执行自定义脚本：

```bash
# 在 ~/.vfox/hooks/ 目录下创建钩子脚本
# pre-use.sh - 版本切换前执行
# post-use.sh - 版本切换后执行
```

## 常用插件

### Node.js

```bash
vfox add nodejs
vfox install nodejs@latest
vfox install nodejs@lts
vfox use nodejs@18.17.0
```

### Python

```bash
vfox add python
vfox install python@3.11.4
vfox install python@3.12.0
vfox use python@3.11.4
```

### Java

```bash
vfox add java
vfox install java@17.0.7
vfox install java@11.0.19
vfox use java@17.0.7
```

### Go

```bash
vfox add golang
vfox install golang@1.21.0
vfox install golang@1.20.7
vfox use golang@1.21.0
```

### Ruby

```bash
vfox add ruby
vfox install ruby@3.2.2
vfox install ruby@3.1.4
vfox use ruby@3.2.2
```

## 配置

### 全局配置

vfox 的全局配置文件位于 `~/.vfox/config.yaml`：

```yaml
# ~/.vfox/config.yaml
registry:
  # 插件注册表地址
  url: "https://registry.vfox.io"

proxy:
  # HTTP 代理设置
  http: "http://proxy.example.com:8080"
  https: "https://proxy.example.com:8080"

cache:
  # 缓存目录
  dir: "~/.vfox/cache"
  # 缓存过期时间（小时）
  ttl: 24

shell:
  # 自动切换版本
  auto_switch: true
  # 显示版本信息
  show_version: true
```

### 插件配置

每个插件可以有自己的配置文件：

```yaml
# ~/.vfox/plugins/nodejs/config.yaml
mirror:
  # Node.js 镜像地址
  url: "https://npmmirror.com/mirrors/node/"

install:
  # 安装后自动安装 npm 包
  auto_npm_install: true
  packages:
    - "yarn"
    - "pnpm"
```

## 命令参考

### 基本命令

```bash
vfox --version          # 查看版本
vfox --help             # 查看帮助
vfox setup              # 初始化设置
vfox update             # 更新 vfox
```

### 插件命令

```bash
vfox add <plugin>       # 添加插件
vfox remove <plugin>    # 移除插件
vfox list               # 列出已安装插件
vfox search <keyword>   # 搜索插件
vfox info <plugin>      # 查看插件信息
```

### 版本命令

```bash
vfox install <plugin>@<version>    # 安装版本
vfox uninstall <plugin>@<version>  # 卸载版本
vfox use <plugin>@<version>        # 使用版本
vfox list <plugin>                 # 列出已安装版本
vfox search <plugin>               # 搜索可用版本
vfox current                       # 查看当前版本
```

### 环境命令

```bash
vfox env                # 查看环境变量
vfox env <plugin>       # 查看插件环境变量
vfox which <command>    # 查看命令路径
vfox exec <command>     # 在指定版本环境中执行命令
```

## 最佳实践

### 1. 项目版本管理

在每个项目根目录创建 `.vfox.yaml` 文件：

```yaml
versions:
  nodejs: "18.17.0"
  python: "3.11.4"
```

### 2. 团队协作

将 `.vfox.yaml` 文件提交到版本控制系统，确保团队成员使用相同版本：

```bash
git add .vfox.yaml
git commit -m "Add vfox version configuration"
```

### 3. CI/CD 集成

在 CI/CD 流水线中使用 vfox：

```yaml
# GitHub Actions 示例
steps:
  - name: Setup vfox
    run: |
      curl -sSL https://raw.githubusercontent.com/version-fox/vfox/main/install.sh | bash
      vfox setup
      
  - name: Install versions
    run: |
      vfox add nodejs
      vfox install nodejs@$(cat .vfox.yaml | grep nodejs | cut -d'"' -f4)
      vfox use nodejs@$(cat .vfox.yaml | grep nodejs | cut -d'"' -f4)
```

### 4. 性能优化

- 使用镜像源加速下载
- 定期清理不用的版本
- 配置合适的缓存策略

```bash
# 清理缓存
vfox cache clean

# 清理未使用的版本
vfox gc
```

## 故障排除

### 常见问题

**1. 命令未找到**
```bash
# 确保 vfox 已正确初始化
vfox setup
source ~/.bashrc  # 或 ~/.zshrc
```

**2. 版本切换不生效**
```bash
# 检查当前版本
vfox current

# 重新加载环境
eval "$(vfox env)"
```

**3. 下载速度慢**
```bash
# 配置镜像源
vfox config set registry.mirror "https://mirror.example.com"
```

**4. 权限问题**
```bash
# 检查目录权限
ls -la ~/.vfox

# 修复权限
chmod -R 755 ~/.vfox
```

### 调试模式

```bash
# 启用详细日志
vfox --verbose install nodejs@18.17.0

# 查看调试信息
vfox --debug use nodejs@18.17.0
```

## 与其他工具对比

| 特性 | vfox | nvm | pyenv | rbenv |
|------|------|-----|-------|-------|
| 跨平台 | ✅ | ❌ | ✅ | ✅ |
| 多语言支持 | ✅ | ❌ | ❌ | ❌ |
| 性能 | 🚀 | 🐌 | 🐌 | 🐌 |
| 配置复杂度 | 简单 | 中等 | 复杂 | 中等 |
| 插件系统 | ✅ | ❌ | ✅ | ✅ |
| 项目配置 | ✅ | ✅ | ✅ | ✅ |

---

vfox 作为新一代版本管理工具，提供了统一、高效的多语言版本管理解决方案。通过其强大的插件系统和简洁的配置，可以大大简化开发环境的管理工作。