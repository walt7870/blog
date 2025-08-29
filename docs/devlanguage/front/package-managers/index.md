# 前端包管理器指南

## 包管理器概览

包管理器是前端开发的核心工具，负责管理项目依赖、版本控制和代码分发。随着前端生态的发展，包管理器也在不断演进，提供了更高效的依赖管理和更安全的包安装机制。

## npm (Node Package Manager)

### 基础概念
npm是Node.js的默认包管理器，也是目前使用最广泛的前端包管理工具。它包含三个主要组件：
- **npm CLI**: 命令行工具
- **npm Registry**: 包注册中心
- **npm Website**: 包管理平台

### 常用命令

#### 项目初始化
```bash
# 创建新项目
npm init
npm init -y  # 使用默认配置

# 设置项目信息
npm set init.author.name "Your Name"
npm set init.author.email "your.email@example.com"
npm set init.license "MIT"
```

#### 依赖管理
```bash
# 安装依赖
npm install package-name
npm install package-name@version
npm install --save-dev package-name  # 开发依赖
npm install --global package-name    # 全局安装

# 更新依赖
npm update package-name
npm update --save-dev

# 卸载依赖
npm uninstall package-name
npm uninstall --save-dev package-name

# 检查过时的依赖
npm outdated
npm audit  # 安全审计
```

#### 版本管理
```bash
# 查看版本
npm list
npm list --depth=0  # 只查看顶层依赖
npm list package-name

# 查看包信息
npm view package-name versions
npm view package-name dependencies
npm view package-name dist-tags
```

### package.json详解

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "项目描述",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.5",
    "@types/react": "^18.2.15",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not dead"
  ]
}
```

### npm配置
```bash
# 查看配置
npm config list
npm config get registry

# 设置国内镜像
npm config set registry https://registry.npmmirror.com
npm config set disturl https://npmmirror.com/dist

# 设置缓存路径
npm config set cache ~/.npm-cache
npm config set prefix ~/.npm-global
```

## Yarn

### Yarn 1.x (Classic)
Yarn 1.x是Facebook开发的npm替代品，提供了更快的安装速度和更好的依赖管理。

#### 安装和初始化
```bash
# 安装Yarn
npm install -g yarn

# 项目初始化
yarn init

# 设置版本
yarn set version 1.22.19
```

#### 常用命令
```bash
# 安装依赖
yarn add package-name
yarn add package-name@version
yarn add --dev package-name
yarn global add package-name

# 更新依赖
yarn upgrade package-name
yarn upgrade-interactive  # 交互式更新

# 移除依赖
yarn remove package-name

# 其他命令
yarn install
yarn list
yarn outdated
yarn audit
```

### Yarn 2+ (Berry)
Yarn 2+引入了Plug'n'Play (PnP)机制，提供了更好的性能和安全性。

#### 特性
- **Zero-Installs**: 无需node_modules
- **PnP**: 即插即用机制
- **Workspaces**: 原生Monorepo支持
- **Constraints**: 依赖约束

#### 配置
```yaml
# .yarnrc.yml
nodeLinker: pnp
pnpMode: strict
compressionLevel: mixed
enableGlobalCache: true
```

#### 命令
```bash
# 安装Yarn 2+
npm install -g yarn
yarn set version berry

# 使用命令
yarn add package-name
yarn up package-name  # 更新
yarn remove package-name
```

## pnpm

### 核心特性
pnpm通过内容寻址存储和硬链接机制，解决了npm的依赖地狱问题，提供了：
- **磁盘空间优化**: 全局存储依赖
- **安装速度**: 并行安装
- **严格的依赖管理**: 防止幽灵依赖
- **Monorepo支持**: 原生Workspaces

### 安装和使用
```bash
# 安装pnpm
npm install -g pnpm

# 项目初始化
pnpm init

# 安装依赖
pnpm add package-name
pnpm add -D package-name  # 开发依赖
pnpm add -g package-name  # 全局安装

# 更新依赖
pnpm update package-name
pnpm up --latest package-name

# 移除依赖
pnpm remove package-name

# 其他命令
pnpm install
pnpm list
pnpm outdated
pnpm audit
```

### 配置文件
```yaml
# .npmrc
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

### Monorepo配置
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'
```

## 包管理器对比

| 特性 | npm | Yarn Classic | Yarn Berry | pnpm |
|------|-----|--------------|------------|------|
| 安装速度 | 中等 | 快 | 快 | 最快 |
| 磁盘使用 | 高 | 高 | 低 | 最低 |
| 依赖解析 | 扁平 | 扁平 | PnP | 严格 |
| Monorepo | 需工具 | Workspaces | Workspaces | Workspaces |
| 离线模式 | 支持 | 支持 | 支持 | 支持 |
| 安全特性 | 基本 | 基本 | 强 | 强 |

## 版本控制策略

### 语义化版本 (SemVer)
```
主版本.次版本.补丁版本 (MAJOR.MINOR.PATCH)
- MAJOR: 不兼容的API变更
- MINOR: 向下兼容的功能新增
- PATCH: 向下兼容的问题修正
```

### 版本范围
```json
{
  "dependencies": {
    "exact": "1.2.3",           // 精确版本
    "tilde": "~1.2.3",          // 补丁版本更新
    "caret": "^1.2.3",          // 次版本和补丁更新
    "wildcard": "1.x" || "*",   // 通配符
    "range": ">=1.2.3 <2.0.0"   // 范围
  }
}
```

### 锁定文件
```json
// package-lock.json (npm)
// yarn.lock (Yarn)
// pnpm-lock.yaml (pnpm)
{
  "lockfileVersion": 2,
  "packages": {
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

## 私有包管理

### npm私有包
```bash
# 创建组织
npm org create my-org

# 发布私有包
npm publish --access restricted

# 安装私有包
npm install @my-org/package-name
```

### Verdaccio私有仓库
```yaml
# ~/.config/verdaccio/config.yaml
storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  '@*/*':
    access: $all
    publish: $authenticated
  '**':
    access: $all
    publish: $authenticated
```

### GitHub Packages
```json
// .npmrc
@my-org:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## 最佳实践

### 1. 依赖管理策略
```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "deps:check": "pnpm audit",
    "deps:update": "pnpm update --interactive",
    "deps:clean": "pnpm store prune"
  }
}
```

### 2. 安全配置
```bash
# 启用自动审计
npm config set audit-level moderate

# 使用安全镜像
npm config set registry https://registry.npmjs.org/

# 启用双重验证
npm profile enable-2fa
```

### 3. 性能优化
```bash
# 使用缓存
npm config set cache-max 86400000

# 并行安装
npm config set maxsockets 10

# 使用更快的镜像
npm config set registry https://registry.npmmirror.com
```

### 4. 团队协作
```json
{
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0",
    "yarn": ">=1.22.0"
  },
  "packageManager": "pnpm@8.6.0"
}
```

## 故障排除

### 常见问题

#### 1. 权限问题
```bash
# 修复权限
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# 使用sudo (不推荐)
sudo npm install -g package-name
```

#### 2. 缓存问题
```bash
# 清除缓存
npm cache clean --force
yarn cache clean
pnpm store prune
```

#### 3. 版本冲突
```bash
# 删除node_modules和锁定文件
rm -rf node_modules package-lock.json
npm install

# 使用resolutions (Yarn)
# 使用overrides (npm/pnpm)
```

#### 4. 网络问题
```bash
# 使用代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 使用镜像
npm config set registry https://registry.npmmirror.com
```

## 未来趋势

### 新兴工具
- **Bun**: 集成的JavaScript运行时和包管理器
- **Turborepo**: 高性能的Monorepo构建工具
- **Nix**: 函数式包管理器

### 发展方向
1. **性能优化**: 更快的安装速度和更低的磁盘占用
2. **安全性**: 更强的安全审计和漏洞检测
3. **Monorepo**: 更好的Monorepo支持
4. **标准化**: 统一的包管理标准

## 总结

选择合适的包管理器对于项目的成功至关重要。npm作为标准选择适合大多数项目，Yarn提供了更好的性能和功能，pnpm则在磁盘空间优化和严格依赖管理方面表现突出。团队应根据项目需求、团队规模和技术栈选择最适合的包管理器，并遵循最佳实践确保项目的可维护性和安全性。