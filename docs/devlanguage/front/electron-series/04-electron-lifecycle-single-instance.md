# 关闭窗口后，Electron 应用为什么还在运行

Electron 同时维护窗口生命周期和应用生命周期。窗口销毁只表示一个 `BrowserWindow` 不再存在，不等于 Main Process 已退出。菜单、托盘、文件监听、本地服务和单实例锁都可能继续由 Main 持有。

![窗口状态与应用退出意图](/electron/lifecycle-intent.svg)

例如编辑器在用户点关闭时隐藏到托盘，但用户选择“退出”时必须放行窗口关闭。若两个动作都无条件 `preventDefault()`，应用会连正常退出和更新重启都阻止。

## 五个容易混淆的事件

| 事件 | 含义 | 常见处理 |
|---|---|---|
| `close` | 窗口准备关闭 | 可阻止关闭并改为隐藏 |
| `closed` | 原生窗口已经销毁 | 清空窗口引用 |
| `window-all-closed` | 所有窗口均已关闭 | Windows/Linux 常在此退出 |
| `before-quit` | 应用开始退出 | 停止接收新任务 |
| `will-quit` | 即将结束进程 | 释放快捷键、锁和后台资源 |

事件日志至少记录事件名、窗口编号、退出意图和单调时钟。只打印“窗口关闭”无法判断应用是在隐藏、正常退出，还是为更新而重启。

## 平台策略写在 Main 中

~~~js
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({ /* ... */ })
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
  else mainWindow.show()
})
~~~

macOS 应用关闭最后一个窗口后通常仍留在 Dock，用户再次激活时重建窗口。Windows 和 Linux 的常见策略是在最后一个窗口关闭后退出。这个差异来自应用层策略，不是 Renderer 的页面行为。

## 单实例先于窗口创建

~~~js
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const request = parseOpenRequest(argv)
    if (!request) return
    if (mainWindow?.isMinimized()) mainWindow.restore()
    mainWindow?.show()
    mainWindow?.focus()
    dispatchOpenRequest(request)
  })
}
~~~

锁应在创建窗口、注册后台服务之前申请。第二个进程拿不到锁就立即退出；旧进程收到 `second-instance` 后解析文件或协议参数，再唤醒现有窗口。参数仍是不可信输入，需要校验类型、长度、协议版本和目标路径。

## 自定义协议统一成内部请求

`desklab://open?id=demo` 的入口取决于平台。Windows/Linux 通常从启动参数和 `second-instance` 接收；macOS 通过 `open-url`，且必须在 `ready` 前注册监听，以免错过触发冷启动的 URL。文件打开还应处理 macOS 的 `open-file`。这些入口统一转换成同一种内部对象。

~~~js
const openRequest = {
  source: 'open-url',
  action: 'open',
  documentId: 'demo',
  receivedAt: 1720000000000
}
~~~

窗口尚未准备完成时，Main 把请求放入队列；Renderer `did-finish-load` 后再依序派发。这样冷启动与热唤醒共享解析、校验和业务逻辑。

这里的对象是一次 macOS URL 唤醒示例，`source` 还可记录其他实际入口。队列需要数量上限和请求去重，业务页面还应主动报告“文档控制器已就绪”：`did-finish-load` 只能证明页面加载阶段结束，不能保证异步初始化完成。注册 URL scheme 属于安装与打包配置，监听事件本身不会完成系统注册。

## 退出意图是一组状态

关闭窗口、退出应用和安装更新后的重启需要不同状态。可以把应用状态定义为 `running`、`quitting`、`restarting-for-update`，窗口状态定义为 `visible`、`hidden`、`destroyed`。事件处理器根据当前意图决定是否阻止 `close`、是否停止后台任务，以及最终调用 `quit` 还是更新器的重启方法。

有未保存文档时，Main 可在 `before-quit` 首次触发时阻止默认退出，等待页面确认和后台任务收尾，再设置“已完成清理”标记并重新调用 `app.quit()`；必须设截止时间并防止事件递归。不能依赖 `will-quit` 中一个未被等待的 Promise 完成写盘。系统关机、强制终止和崩溃可能跳过正常事件，因此重要状态应在运行中持续保存。

排查生命周期问题时，先画出窗口状态、应用状态和启动入口三条线，再按时间检查 Main 日志。重复托盘、第二个文档打不开、更新后没有重启，通常都能在这三条线上找到冲突。
