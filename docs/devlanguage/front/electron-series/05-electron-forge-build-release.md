# Electron Forge 的 Package、Make 和 Publish 分别做什么

Electron 应用从源码到用户可下载文件至少经过三层：Package 生成可运行应用目录，Make 生成平台分发物，Publish 把分发物和元数据传到远端。命令成功只证明当前一层完成，不能替后面的层背书。

## DeskLab 的实际构建结果

实验环境为 Electron 43.3.0、Electron Forge 7.11.2、macOS arm64。

| 阶段 | 产物 | 实测结果 |
|---|---|---:|
| Package | `DeskLab.app` | 276 MB |
| Package | `Contents/Resources/app.asar` | 232 KB |
| Make | arm64 ZIP | 119,923,785 bytes，约 128 MB |

~~~bash
npm run package
npm run make
~~~

两条命令均返回 0。当前 Forge 配置只有 `@electron-forge/maker-zip`，因此结果只覆盖 macOS arm64 ZIP，没有产生 DMG、Windows 安装包，也没有执行上传。

## Package：组装可运行目录

Package 会收集业务代码、生产依赖和 Electron Runtime，再按目标平台形成 `.app`、`.exe` 所在目录或 Linux 应用目录。它还会执行 Forge hooks、ASAR 打包和图标配置。

Package 阶段应检查：

1. 主入口和 Preload 是否位于产物中；
2. 原生模块是否匹配目标 OS、CPU 和 Electron ABI；
3. 不需要的测试夹具、源码映射和开发依赖是否被排除；
4. 必须以真实文件存在的资源是否进入 `asarUnpack`；
5. 产物能否在隔离环境冷启动并完成核心路径。

## Make：生成平台分发物

Maker 接收 Package 目录并输出 ZIP、DMG、Squirrel、deb、rpm 等文件。一个项目可以配置多个 Maker，但每个 Maker 都有自己的平台约束。macOS 上成功生成 ZIP，不代表 Windows 安装器也能生成。

建议保存 artifact matrix：

| OS | CPU | 格式 | 构建 | 签名 | 安装验证 |
|---|---|---|---|---|---|
| macOS | arm64 | ZIP | 通过 | 待验证 | 待验证 |
| macOS | x64 | ZIP | 待验证 | 待验证 | 待验证 |
| Windows | x64 | installer | 待验证 | 待验证 | 待验证 |

空白格比一个笼统的“构建成功”更准确。

## Publish：上传及更新元数据

Publisher 通常负责上传 Make 产物、校验和与版本元数据。它不自动证明以下事项：公网地址可访问、CDN 已刷新、签名有效、更新客户端能选中正确架构、安装后可启动。

一次完整发布至少保留四类证据：构建命令和退出码、文件名/大小/SHA-256、平台签名或公证结果、公开 URL 的下载与内容校验。版本号、channel、OS、CPU 和文件名必须在这些记录中一致。

## 构建流水线的判断原则

Package 成功说明应用目录已生成；Make 成功说明某个 Maker 产出了文件；Publish 成功说明上传调用完成；公开发布则需要远端可达和客户端验证。把状态拆开记录，失败时才能判断问题位于依赖收集、平台制品、签名、公网分发还是更新选择。
