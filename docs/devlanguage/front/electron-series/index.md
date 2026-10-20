# Electron 深度科普：从双击图标到签名更新

Electron 应用不是“把网页压成一个安装包”。操作系统启动的是一套包含 Chromium、Node.js、Electron API 和应用代码的桌面运行时；从源码到用户机器，中间还要经过多进程边界、IPC 权限、Package、Make、ASAR、原生模块、代码签名和更新状态机。

这套文章使用同一个 Markdown 工作台 DeskLab 贯穿十个工程问题。历史实验基线为 Electron 43.3.0、Electron Forge 7.11.2 和 macOS arm64；具体大小、启动毫秒数和 ABI 输出是该环境的样本。涉及 Windows、Linux、证书和平台政策时，区分实验记录与平台机制，不把一台机器的结果扩展成跨平台结论。

![Electron从源码到分发的职责链](/electron/forge-delivery-chain.svg)

例如“能打开本地文档”同时涉及两条链：运行时由 Main 创建窗口、Renderer 展示内容，文件权限由 Preload 的业务接口与 Main 的来源校验控制。交付时再把这两条链装入目标系统的产物，验证签名、首次启动和更新。按问题切入，才不会把白屏、权限与安装失败混为同一种“打包问题”。

## 阅读路线

| 篇目 | 工程问题 |
| --- | --- |
| 01 | [双击 Electron 应用，系统到底启动了什么](./01-electron-startup-runtime.md) |
| 02 | [一个窗口为什么带出一串进程](./02-electron-process-model.md) |
| 03 | [网页按钮怎样安全读取本地文件](./03-electron-preload-ipc-security.md) |
| 04 | [关闭窗口为什么不一定退出应用](./04-electron-lifecycle-single-instance.md) |
| 05 | [打包不是编译：Package、Make、Publish 的边界](./05-electron-forge-build-release.md) |
| 06 | [app.asar 里装了什么](./06-electron-asar-unpack-fuses.md) |
| 07 | [ABI mismatch 如何击穿跨平台构建](./07-electron-native-module-abi.md) |
| 08 | [为什么“能运行”仍不等于“能交付”](./08-electron-signing-notarization.md) |
| 09 | [自动更新不是下载一个 ZIP](./09-electron-auto-update-state-machine.md) |
| 10 | [Electron 为什么卡、占内存，应该怎么测](./10-electron-performance-measurement.md) |

## 一条完整链路

源码先由 bundler 整理，Forge Package 装配 Electron 运行时，Maker 生成分发格式，签名和平台服务建立信任，Publisher 把产物送到服务端，客户端再依赖元数据、签名和生命周期完成更新。

这条链上的状态不能互相替代：

- 可运行：目标机器能启动 packaged app。
- 可分发：Maker 生成了 ZIP、DMG、安装器或发行包。
- 已上传：目标服务收到了产物。
- 已公开：用户通过规范 HTTPS 页面能够访问。
- 可更新：客户端能够选择、验证、安装并启动新版本。

## 推荐阅读方式

01 到 04 建立运行时、进程和安全边界；05 到 09 追踪桌面应用的交付链；10 用启动时间、进程指标和用户路径回答性能与选型问题。遇到具体故障时，可以直接按错误入口进入对应文章。

| 现象 | 优先阅读 |
| --- | --- |
| 窗口白屏、菜单卡住 | 01、02、10 |
| Renderer 需要文件权限 | 03 |
| 关闭窗口后进程仍在 | 04 |
| 只有 app，没有安装包 | 05 |
| 开发态能读，打包后路径失败 | 06 |
| compiled against a different NODE_MODULE_VERSION | 07 |
| Gatekeeper 或发布者警告 | 08 |
| 服务器有新版本，客户端找不到 | 09 |
