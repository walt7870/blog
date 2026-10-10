# Electron 性能优化先建立可重复测量

“Electron 占内存”不是一个可操作的指标。Main、Renderer、GPU 和 Utility Process 各自承担不同工作；冷启动、热启动、窗口数量、页面内容和采样时刻都会改变结果。优化前应固定场景，并把用户可感知的阶段分开计时。

## DeskLab 的一次启动时间线

实验环境为 Electron 43.3.0、Chromium 150.0.7871.212、macOS arm64、1120×720。一次 smoke 运行得到：

| 事件 | 相对启动时间 |
|---|---:|
| `app-ready-event` | 59.290 ms |
| `create-window-start` | 59.403 ms |
| `window-ready-to-show` | 266.541 ms |
| `renderer-dom-ready` | 266.637 ms |
| `renderer-finish-load` | 267.767 ms |

这些时间来自同一单调时钟，可以直接计算阶段差。它们只描述这台机器上的一次样本，不是 Electron 的通用基准。

~~~js
const { performance } = require('node:perf_hooks')
const startedAt = performance.now()

function mark(name) {
  console.log(JSON.stringify({
    name,
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
  }))
}

app.whenReady().then(() => {
  mark('app-ready-event')
  createWindow()
})
~~~

Renderer 可以用 `performance.mark()` 记录脚本启动、首屏数据到达和交互可用，再通过受控 IPC 把指标交给 Main。Main 与 Renderer 的时钟原点不同，合并前要统一定义或只比较各自阶段时长。

## 进程内存分别看

同一次运行中，`app.getAppMetrics()` 的工作集快照为：

| 进程类型 | 工作集 |
|---|---:|
| Browser | 149,392 KB |
| GPU | 67,728 KB |
| Utility | 45,248 KB |
| Tab | 102,464 KB |

总和能描述该采样点的系统占用，但定位问题要回到进程类型。Browser 持续增长可检查 Main 缓存和监听器；Tab 增长可检查 DOM、图片和前端状态；GPU 异常要结合硬件加速、画布和视频内容；Utility 则看网络、音频等具体服务。

## 建立对照实验

性能数据至少区分冷启动与热启动，固定应用版本、系统版本、窗口大小、测试数据和等待时间。每个场景重复多次，报告中位数和高分位，同时保留原始样本。比较改动前后时，每次只改变一个主要变量。

常见优化落点包括：延迟加载非首屏模块、避免 Main 顶层同步 I/O、减少首屏网络与大资源、复用合理数量的窗口、及时解除 IPC 和事件监听、对大列表做虚拟化。是否有效由阶段时间、内存曲线和交互指标共同判断。

这一方法的重点是把“慢”定位到可复现的进程和阶段。只有测量边界稳定，优化结果才有可比性。
