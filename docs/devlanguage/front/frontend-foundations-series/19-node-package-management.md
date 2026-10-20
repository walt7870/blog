# Node.js 与包管理：运行环境、依赖树和锁文件

同一份商品页面在本机能构建，在 CI 却提示模块不存在。排查要先区分：Node 版本不符、依赖没有按锁文件安装，还是代码使用了未声明的间接依赖。浏览器页面正常并不能证明构建环境一致。

![声明、锁定、安装和浏览器产物的关系](/front/frontend-foundations-series/ep19-flow.svg)

## Node 不负责浏览器布局

Node.js 运行构建器、检查器和开发服务器，提供文件、进程与网络能力；浏览器运行页面脚本，提供 DOM、样式与交互。两者共享 JavaScript 语言和部分 Web API，但 Node 默认没有 document，也不会把 CSS 排版成页面。

静态站点部署的是构建后的 HTML、CSS、JS 和资源，用户访问时一般不需要 Node 参与。SSR 或 BFF 则会在服务器运行代码，服务器依赖与浏览器包的边界要另外处理。不要把前端能打包等同于服务端代码可直接在浏览器运行。

## package.json 记录声明，锁文件记录解析

下面是已有 Vite 和 TypeScript 依赖项目中的字段片段，不是完整的新项目安装清单。

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

`npm run build` 会解析本项目安装的可执行入口；脚本叫 build 并不意味着里面自动包含 lint、类型检查和测试，要读它实际执行的命令。`type: module` 影响 Node 对 .js 文件的解释，不会自动给浏览器 HTML 加上模块脚本。

`dependencies` 表达项目使用的依赖，`devDependencies` 通常放构建、测试和检查工具。在浏览器应用中，两者都可能参与构建，构建器按可达模块决定打包内容；devDependency 不意味着“永远不进入 dist”。SSR 部署若只安装生产依赖，则服务运行需要的包必须正确归类。

`package-lock.json` 或 `pnpm-lock.yaml` 锁定具体解析结果和完整性信息；`^1.2.0` 只是声明允许的范围。完整性校验有助于确认下载字节符合锁定结果，但不证明包安全或行为正确。

## 日常更新与 CI 安装分开

已有 npm 项目的一组只读检查和安装入口如下。执行安装前先确认目录、Node 及 npm 版本；不要同时运行 npm 与 pnpm 修改同一个 node_modules。

```bash
node --version
npm --version
npm ls --depth=0
npm ci
npm run typecheck
npm run build
```

`npm ci` 要求存在匹配的锁文件，遇到 package.json 与锁文件不一致会失败，并会重新建立 node_modules，不是日常给项目增加单个包的命令。`npm install 包名` 用于有意更新声明和锁定结果，变化需要一起审查。

选择 pnpm 的项目对应使用 `pnpm install --frozen-lockfile`，并固定实际包管理器版本。Node 版本、包管理器版本、安装参数、操作系统、原生扩展和生命周期脚本仍会影响结果，因此只有锁文件不能承诺字节完全相同的构建。

## 直接依赖必须直接声明

应用直接 `import` 的包应写进自己的依赖声明，不能因为它恰好被别的工具安装就依赖它。npm 的提升策略可能让未声明包暂时可见；pnpm 的默认链接布局更容易暴露这类隐藏关系。换包管理器后报错，应先修依赖所有权，再讨论兼容配置。

多个版本不一定是重复浪费：两个子依赖可能要求不兼容的版本。可以用 `npm explain 包名` 或 `pnpm why 包名` 找来源，再决定升级。peerDependencies 表达与宿主配合的版本约束；把所有冲突都交给强制安装，可能把安装错误推迟成运行时错误。

## 安装也会执行代码

依赖的 install 等生命周期脚本可能在开发机或 CI 执行。锁文件不是权限隔离；对未知包应核对来源、脚本和实际权限。私有 registry 的凭据通过环境或受控配置注入，不写入 Git。

下载超时先看 registry、代理、证书和错误阶段；原生扩展失败看平台、Node ABI 和构建工具；模块找不到看依赖声明与解析路径。不要先删锁文件，因为那会把“恢复原安装”变成“重新选择依赖树”。

完成一次环境验收，应记录 Node 与包管理器版本、锁文件、安装参数和关键脚本结果。包管理器的具体差异见 [包管理专题](../package-managers/)；生产构建的输入输出见 [Vite 流水线](./20-vite-build-pipeline)。
