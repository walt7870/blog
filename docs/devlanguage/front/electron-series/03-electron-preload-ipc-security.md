# 网页按钮怎样安全读取本地文件

Renderer 展示的是 Web 页面，它会执行前端依赖、解析用户输入，也可能遭遇脚本注入。让页面直接 require('fs')，等于把本地文件系统权限交给整个页面上下文。安全链路应该是 Renderer 提交明确业务动作，Preload 暴露窄能力，Main 验证来源和参数。

## 窗口权限基线

~~~js
const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
})
~~~

Context Isolation 让 Preload 和页面脚本处于不同 JavaScript 世界。Renderer 拿到的是 contextBridge 暴露的方法，不是 ipcRenderer 本体。

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
  const senderUrl = event.senderFrame?.url ?? ''
  if (!senderUrl.startsWith('file://')) {
    throw new Error('unexpected sender')
  }

  return fs.readFile(demoFilePath, 'utf8')
})
~~~

真实项目还要验证 event 对应的 webContents、窗口身份、当前导航来源、参数类型和路径范围。路径在拼接后应先规范化，再确认仍处于允许目录；只做字符串前缀比较无法覆盖符号链接、编码和大小写差异。

## 一次请求的证据链

DeskLab 的 smoke 日志按顺序出现 request accepted、response sent、smoke observed，最终读取固定测试文件的 85 字节内容。请求编号可以把 Renderer 点击、Main 校验、文件读取和响应串成一条链。

## 审计顺序

1. 列出 window 上新增的能力。
2. 定位每个 Preload 方法使用的固定 channel。
3. 检查 Main handler 的发送方、参数、路径和错误分支。
4. 确认页面只拿到完成业务动作所需的结果。
5. 配合 CSP、导航限制、Sandbox 和最小权限形成多层防线。

