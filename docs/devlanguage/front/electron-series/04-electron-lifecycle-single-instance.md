# 关闭窗口后，Electron 应用为什么还在运行

Electron 同时维护窗口生命周期和应用生命周期。窗口销毁只表示一个 `BrowserWindow` 不再存在，不等于 Main Process 已退出。菜单、托盘、文件监听、本地服务和单实例锁都可能继续由 Main 持有。

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

`desklab://open?id=demo` 有两条入口：应用未运行时来自启动参数，应用运行时来自第二实例事件。两条入口都应转换成同一种内部对象。

~~~js
{
  source: 'cold-start' | 'second-instance',
  action: 'open',
  documentId: 'demo',
  receivedAt: 1720000000000
}
~~~

窗口尚未准备完成时，Main 把请求放入队列；Renderer `did-finish-load` 后再依序派发。这样冷启动与热唤醒共享解析、校验和业务逻辑。

## 退出意图是一组状态

关闭窗口、退出应用和安装更新后的重启需要不同状态。可以把应用状态定义为 `running`、`quitting`、`restarting-for-update`，窗口状态定义为 `visible`、`hidden`、`destroyed`。事件处理器根据当前意图决定是否阻止 `close`、是否停止后台任务，以及最终调用 `quit` 还是更新器的重启方法。

排查生命周期问题时，先画出窗口状态、应用状态和启动入口三条线，再按时间检查 Main 日志。重复托盘、第二个文档打不开、更新后没有重启，通常都能在这三条线上找到冲突。
