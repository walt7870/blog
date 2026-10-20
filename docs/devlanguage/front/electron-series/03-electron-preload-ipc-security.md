# 网页按钮怎样安全读取本地文件

Renderer 展示的是 Web 页面，它会执行前端依赖、解析用户输入，也可能遭遇脚本注入。让页面直接 require('fs')，等于把本地文件系统权限交给整个页面上下文。安全链路应该是 Renderer 提交明确业务动作，Preload 暴露窄能力，Main 验证来源和参数。

![文件读取的权限边界与拒绝分支](/electron/ipc-file-boundary.svg)

以下片段分属 Main、Preload 和 Renderer，不应拼进同一个文件。Main 需要导入 `node:path`、`node:fs/promises`、`node:url` 的 `pathToFileURL` 以及 `electron` 的 `BrowserWindow`、`ipcMain`，在 `app.whenReady()` 后创建窗口。

## 窗口权限基线

以下保留本地 `file://` 入口，演示已有应用如何收紧固定文档的 IPC。生产应用优先使用受控自定义协议提供页面，只映射允许的资源；为其注册标准、安全的 scheme 后，按可信 origin 校验发送方。`file://` 的 origin 不能靠共同的 `null` 值授权，下面还要绑定指定窗口、主 frame 和精确页面地址。

~~~js
const pageUrl = pathToFileURL(path.join(__dirname, 'index.html')).href
const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
})
win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
win.webContents.on('will-navigate', (event, url) => {
  if (url !== pageUrl) event.preventDefault()
})
win.loadURL(pageUrl).catch(error => console.error('load failed', error))
~~~

Context Isolation 让 Preload 和页面脚本处于不同 JavaScript 世界。Renderer 拿到的是 contextBridge 暴露的方法，不是 ipcRenderer 本体。

这个单窗口示例只注册一次固定 channel。`index.html` 还应设置 CSP，例如 `default-src 'self'; script-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'`，并把页面脚本放入独立文件。若编辑器支持 Markdown 原始 HTML，需要清理不可信标记；Context Isolation 不能替代内容净化。

## Preload 只暴露业务能力

~~~js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('deskLab', Object.freeze({
  openDemoFile: () => ipcRenderer.invoke('desklab:read-demo-file'),
}))
~~~

openDemoFile 没有任意 channel，也没有任意路径参数。页面只知道“读取示例文档”，不知道底层通过哪个 Electron 模块完成。

危险的接口通常长这样：

~~~js
contextBridge.exposeInMainWorld('bridge', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
})
~~~

页面一旦被注入，攻击代码就能枚举 channel 和参数，把一项文件能力扩展成更多系统能力。窄接口能被逐项搜索、测试和撤销。

## Main 保留最终授权

~~~js
ipcMain.handle('desklab:read-demo-file', async event => {
  if (win.isDestroyed() || event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      event.senderFrame?.url !== pageUrl) {
    throw new Error('unexpected sender')
  }

  const demoFilePath = path.join(__dirname, 'fixtures', 'demo.md')
  const content = await fs.readFile(demoFilePath, 'utf8')
  return { content }
})
~~~

这里只允许指定窗口的主 frame、指定页面读取固定资源。检查 `file://` 前缀会错误接受其他本地页面；URL 正确也不能替代窗口与 frame 身份检查。读取失败时 `invoke` 会拒绝，Renderer 应捕获错误并显示失败状态，不能把空文本当成成功。

如果需求变成“打开用户选择的文件”，由 Main 打开文件选择器并保存授权结果，返回文件句柄编号或内容。不要把示例改成接收任意路径再拼接目录。需要目录授权时，应核对真实路径、符号链接及读取时的竞态；仅 `normalize` 或字符串前缀不足以建立沙箱。

## 一次请求的证据链

固定测试文件应同时核对内容、UTF-8 字节数与预期路径。请求编号可以把 Renderer 点击、Main 校验、文件读取和响应串成一条链。测试至少加入另一窗口、子 frame、错误 URL 和缺失文件；前面三类应在读取前拒绝，缺失文件应返回可识别的失败。

## 审计顺序

1. 列出 window 上新增的能力。
2. 定位每个 Preload 方法使用的固定 channel。
3. 检查 Main handler 的发送方、参数、路径和错误分支。
4. 确认页面只拿到完成业务动作所需的结果。
5. 配合 CSP、导航限制、Sandbox 和最小权限形成多层防线。

