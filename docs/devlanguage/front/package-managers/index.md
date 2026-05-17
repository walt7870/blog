# 前端包管理器概览

前端包管理器负责三件事：解析 `package.json` 中声明的依赖，生成锁文件保证团队安装结果一致，把依赖下载到本地并组织成运行时可识别的目录结构。它直接影响安装速度、磁盘占用、依赖边界、Monorepo 体验和 CI 构建稳定性。

这个目录按工具拆分说明。先读本页建立选型边界，再进入具体工具页查看命令、配置和排查方式。

## 阅读路径

| 页面 | 重点 | 适用场景 |
| --- | --- | --- |
| [npm](./npm) | Node.js 默认包管理器、通用命令、锁文件、审计 | 小到中型项目、对工具链兼容性要求最高的项目 |
| [pnpm](./pnpm) | 内容寻址存储、严格依赖、Workspace | Monorepo、依赖多、希望减少磁盘占用和幽灵依赖的项目 |
| [Yarn](./yarn) | Yarn Classic 与 Yarn Berry、工作区、PnP | 已有 Yarn 项目、需要约束和工作区能力的团队 |
| [Bun](./bun) | 运行时、包管理器、脚本和测试一体化 | 追求安装速度、愿意验证兼容性的项目或工具链 |
| [Corepack](./corepack) | 锁定包管理器版本、读取 `packageManager` 字段 | 团队协作、CI、多人维护项目 |
| [镜像与私有源](./registry) | 国内镜像、私有 npm 仓库、认证配置 | 内网开发、企业制品库、CI 加速和权限隔离 |

## 选型

不要在一个项目里混用多个包管理器。锁文件、依赖提升规则和脚本执行细节不同，混用很容易出现“本地能跑、CI 失败”或“某个人安装后锁文件大面积变化”的问题。

| 项目情况 | 建议 |
| --- | --- |
| 普通业务项目，团队不想增加工具理解成本 | 使用 npm，保留 `package-lock.json` |
| 新项目或依赖规模较大 | 优先评估 pnpm，保留 `pnpm-lock.yaml` |
| Monorepo、多包、多应用共仓 | pnpm Workspace 或 Yarn Workspace |
| 既有 Yarn Classic 项目 | 不急于迁移，先统一 Yarn 版本和锁文件 |
| 想尝试 Bun 的速度优势 | 先在非核心项目验证安装、脚本和构建兼容性 |
| 多人协作或 CI 环境 | 使用 Corepack 或项目脚本固定包管理器版本 |

## 共通文件

### package.json

`package.json` 是依赖、脚本和项目元数据入口。团队协作时，应把包管理器版本也写进去：

```json
{
  "name": "web-admin",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@10.0.0"
}
```

### 锁文件

锁文件必须提交到仓库。它记录解析后的具体版本和完整性校验信息，是 CI 可复现构建的基础。

| 工具 | 锁文件 |
| --- | --- |
| npm | `package-lock.json` |
| pnpm | `pnpm-lock.yaml` |
| Yarn | `yarn.lock` |
| Bun | `bun.lock` 或 `bun.lockb`，以项目实际版本为准 |

切换包管理器时，要清理旧锁文件并重新安装，不要保留多个锁文件并让团队自行选择。

## 常用命令对照

| 动作 | npm | pnpm | Yarn | Bun |
| --- | --- | --- | --- | --- |
| 安装全部依赖 | `npm install` | `pnpm install` | `yarn install` | `bun install` |
| CI 安装 | `npm ci` | `pnpm install --frozen-lockfile` | `yarn install --immutable` | `bun install --frozen-lockfile` |
| 安装生产依赖 | `npm install vue` | `pnpm add vue` | `yarn add vue` | `bun add vue` |
| 安装开发依赖 | `npm install -D vite` | `pnpm add -D vite` | `yarn add -D vite` | `bun add -d vite` |
| 移除依赖 | `npm uninstall vue` | `pnpm remove vue` | `yarn remove vue` | `bun remove vue` |
| 执行脚本 | `npm run build` | `pnpm build` | `yarn build` | `bun run build` |
| 临时执行包 | `npx create-vite` | `pnpm dlx create-vite` | `yarn dlx create-vite` | `bunx create-vite` |

## 迁移顺序

包管理器迁移不要和业务代码改动混在一个提交里。推荐单独做一次工具链迁移：

1. 确认 Node.js 版本和目标包管理器版本。
2. 删除旧锁文件和 `node_modules`。
3. 使用目标包管理器重新安装依赖。
4. 提交新的锁文件和 `packageManager` 字段。
5. 修改 CI 安装命令。
6. 跑 `lint`、测试和构建。

## 排查入口

| 现象 | 优先检查 |
| --- | --- |
| CI 安装结果和本地不同 | Node.js 版本、包管理器版本、锁文件是否提交 |
| 安装速度慢 | registry、缓存、内网代理、CI 缓存目录 |
| 本地能引用未声明依赖 | 是否存在依赖提升，是否需要 pnpm 严格依赖 |
| 依赖冲突 | `peerDependencies`、重复版本、插件和框架版本是否匹配 |
| 锁文件频繁变化 | 团队是否混用 npm、Yarn、pnpm、Bun |
| 安装失败 401/403 | 私有源认证、`.npmrc` 作用范围、CI token |
