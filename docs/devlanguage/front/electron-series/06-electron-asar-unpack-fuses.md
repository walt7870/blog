# ASAR 是归档格式，不是加密边界

Electron 常把应用 JavaScript、HTML 和依赖放进 `app.asar`。它减少零散文件，便于分发，并让 Electron 的部分文件 API 以接近普通目录的方式读取归档内容。归档中的代码仍然可以被列出和提取，因此 ASAR 不承担保密职责。

## 透明读取与真实文件操作

DeskLab 的实际产物中，`asar list` 能看到 `main.js`、`preload.js`、`index.html`、`package.json`、`node_modules` 和测试夹具。Electron 运行时成功读取：

~~~text
app.asar/package.json
name=desklab-electron-startup-evidence
version=0.1.0
~~~

同一归档上的写入和切换工作目录均失败：

~~~text
write app.asar/write-test.txt -> ENOTDIR
process.chdir(app.asar)       -> ENOTDIR
~~~

这反映了两种边界：Electron 对部分读操作提供归档感知，操作系统仍把 ASAR 视为一个文件。写入、`chdir`、动态库加载、外部程序调用等要求真实路径的操作不能依赖透明读取。

## `asarUnpack` 只解包必要文件

原生 `.node` 模块、需要被系统工具直接打开的可执行文件，以及必须由第三方库按真实路径访问的资源，通常进入 `app.asar.unpacked`。

~~~js
module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/*.{node,dylib,so,dll}',
    },
  },
}
~~~

规则过宽会让大量源码和资源暴露在普通目录中，也会增大更新差异；规则过窄则常在开发环境正常、打包后报 `ENOENT` 或 `ERR_DLOPEN_FAILED`。应从具体运行时需求反推匹配范围，并在打包产物上跑测试。

## Fuse 改变运行时能力

DeskLab 测试产物读取到的 Fuse 状态包括：

| Fuse | 状态 |
|---|---|
| `EnableEmbeddedAsarIntegrityValidation` | Disabled |
| `OnlyLoadAppFromAsar` | Disabled |
| `RunAsNode` | Enabled |
| `EnableNodeOptionsEnvironmentVariable` | Enabled |
| `EnableNodeCliInspectArguments` | Enabled |

这是一份开发态结果，不代表生产配置。生产流水线可以按需求关闭调试入口，并启用 ASAR 完整性相关能力。Fuse 是 Electron 二进制中的构建期开关，修改后必须重新签名并重新验证启动、崩溃上报和更新流程。

## 完整性来自多层组合

ASAR 负责归档；Integrity 检查归档是否符合构建时记录；代码签名绑定发布者身份并检测签名覆盖范围内的变化；平台公证或信誉服务影响系统是否放行。任何一层都不等于代码加密，也不能单独代替另外几层。

验证生产产物时，至少保留 ASAR 文件清单、`app.asar.unpacked` 清单、Fuse 读取结果、平台签名结果和冷启动日志。这样才能判断故障是路径问题、归档完整性问题还是平台信任问题。
