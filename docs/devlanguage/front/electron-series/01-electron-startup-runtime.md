# 双击 Electron 应用，系统到底启动了什么

DeskLab 的源码只有 HTML、CSS 和 JavaScript，历史实验中的 macOS 应用目录却达到约 276 MB，而应用自己的 app.asar 只有约 232 KB。体积主要来自 Electron Framework 和 Helper。这个对照说明 Electron 没有把页面编译成原生 UI，而是把完整运行时和应用代码一起交付；体积随版本、架构和资源变化，不能作为其他项目的预算。

![Electron启动链与白屏定位](/electron/startup-runtime.svg)

例如一个本地 Markdown 编辑器，菜单属于 Main 的桌面能力，文档内容由 Renderer 绘制。菜单能打开而正文白屏，下一步应看页面导航与脚本错误。

## 运行时由三层组成

| 层 | 提供什么 |
| --- | --- |
| Chromium | DOM、CSS、页面绘制、V8 |
| Node.js | 文件、网络、子进程等本地能力 |
| Electron | app、BrowserWindow、IPC、菜单、托盘等桌面接口 |

操作系统先执行 Contents/MacOS/DeskLab，Main 进程加载 main.js，等待 app ready，创建 BrowserWindow，再导航到 index.html。页面代码随后在独立 Renderer 中运行。

## 记录真实启动链

Main 入口可以用高精度时钟记录阶段：

~~~js
const { app, BrowserWindow } = require('electron')
const path = require('node:path')

const startedAt = process.hrtime.bigint()

function log(event, details = {}) {
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
  console.log(JSON.stringify({ event, elapsedMs, pid: process.pid, ...details }))
}

app.whenReady().then(async () => {
  log('when-ready-resolved')
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  })
  win.webContents.on('did-fail-load', (_event, code, reason, url) => {
    log('load-failed', { code, reason, url })
  })
  win.webContents.once('dom-ready', () => {
    log('renderer-dom-ready', { rendererPid: win.webContents.getOSProcessId() })
  })
  await win.loadFile('index.html')
  log('load-file-resolved')
}).catch(error => {
  log('startup-failed', { message: error.message })
  app.quit()
})
~~~

该片段放在 CommonJS 的 `main.js`，同目录需有 `preload.js` 和 `index.html`；`package.json` 的 `main` 指向它。Preload 必须使用绝对路径。`dom-ready` 与 `loadFile` 完成均不代表业务数据已加载或编辑器可以输入，还需在页面初始化成功后报告业务就绪。

DeskLab 的历史观测中，Main PID 和 Renderer PID 不同；app ready、DOM ready 和页面加载完成也各有独立时间戳。窗口没有出现时先查 Main 与 app ready；窗口出现但白屏时查 loadFile、导航事件和 Renderer。

## app.asar 不是整个应用

macOS 应用目录中至少能看到：

- Contents/MacOS：操作系统启动的可执行入口。
- Contents/Frameworks：Electron Framework 与各类 Helper。
- Contents/Resources：app.asar、图标和应用资源。

只比较源码与 app.asar 会忽略 Chromium、Node.js 和 Helper。评估体积时应比较整个交付产物，并注明 Electron 版本、平台和 CPU 架构。

## 排查顺序

1. 确认操作系统实际启动的可执行文件。
2. 记录 Main 的 app ready 和窗口创建事件。
3. 记录 webContents 导航、DOM ready 与 Renderer PID。
4. 打印 process.versions，确认 Electron、Chromium、Node.js 和 modules。
5. 对照开发态与 Package 产物的入口路径。

Electron 的启动问题只有落到可执行文件、Main、BrowserWindow 和 Renderer 四段链路，才有明确的故障位置。

