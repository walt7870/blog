# 原生 Node 模块为什么在 Electron 中加载失败

带有 `.node` 二进制的依赖并不是纯 JavaScript。它在编译时绑定操作系统、CPU 架构和 Node 模块 ABI；Electron 又内置自己的 Node/V8 版本。只要其中一个维度不匹配，`require()` 就可能在加载阶段失败。

![原生模块兼容性与rebuild分支](/electron/native-module-contract.svg)

例如给编辑器加 SQLite，网页开发服务器可以正常启动，真正调用数据库时却报 `ERR_DLOPEN_FAILED`。这首先是宿主与二进制加载问题；删除前端缓存不会改变 `.node` 文件的架构或 ABI。

## 一次可复现的 ABI 冲突

DeskLab 的历史实验使用 `better-sqlite3@11.10.0`：普通 Node 24.7.0 报告模块 ABI 137，Electron 43.3.0 报告内置 Node 24.18.1、模块 ABI 148。ABI 应以目标运行时的 `process.versions.modules` 实际输出为准，不能只按 Node 主版本推断。

~~~js
console.log(process.versions.node)
console.log(process.versions.modules)
console.log(process.platform, process.arch)
~~~

同一份模块在普通 Node 中成功建表、写入并读回 `ABI fixture`；在 Electron 中加载失败：

~~~text
ERR_DLOPEN_FAILED
compiled against NODE_MODULE_VERSION 137
this version of Node.js requires NODE_MODULE_VERSION 148
~~~

这个错误明确指出编译所用模块 ABI 与当前宿主不同。修复该层后仍可能暴露缺失动态库、签名或架构问题，因此不能把这条错误当成其他维度均已验收的证明。

## Rebuild 解决哪一层问题

`@electron/rebuild` 会读取 Electron 版本，下载对应头文件，再为目标 ABI 重编译原生依赖。

~~~bash
npx @electron/rebuild -f -w better-sqlite3
~~~

该次历史实验的 rebuild 没有成功。编译器继续报 `SetNativeDataProperty`、`External::Value` 等 V8 API 错误，说明问题从“已有二进制 ABI 不匹配”进入“依赖源码不兼容当前 Electron/V8”。此时反复执行 rebuild 不会改变源码兼容性，需要升级依赖、使用支持该 Electron 版本的分支，或调整 Electron 版本。

这条命令在安装了目标 Electron 的应用目录中执行。若同一仓库还要用系统 Node 运行这个原生依赖，应隔离两种安装输出；为 Electron rebuild 后再直接运行 Node，可能制造反向 ABI 冲突。CI 缓存键至少包含锁文件摘要、Electron 版本、OS 和架构。

## 按错误层级排查

1. 打印 `process.platform`、`process.arch`、`process.versions.modules` 和 Electron 版本。
2. 用 `file module.node` 或平台工具确认二进制格式与 CPU。
3. 确认模块是否被正确放入 `app.asar.unpacked`。
4. 为目标 Electron 执行 rebuild，保留完整编译日志。
5. 若进入 C/C++ API 错误，查询依赖支持矩阵并调整版本。
6. 在 Package 产物中再次加载，不能只在源码目录验证。

## N-API 能减少但不能消除矩阵

采用稳定 N-API 的模块通常能跨多个 Node 版本复用二进制，降低 ABI 重编译频率。但操作系统、CPU 架构、系统动态库和打包路径仍然存在差异。预构建文件也必须覆盖实际目标。

CI 应把 Electron 版本、OS、CPU、模块版本和结果保存为矩阵。DeskLab 当前只验证了 macOS arm64；其他平台保持“未验证”，不能从一台机器的成功或失败外推。
