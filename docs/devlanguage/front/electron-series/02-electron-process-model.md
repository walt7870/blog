# 一个窗口为什么带出一串进程

DeskLab 只打开一个窗口，app.getAppMetrics() 仍能看到 Browser、Tab、GPU 和 Utility。进程数量本身不是故障；需要判断的是每个 PID 的职责、隔离范围和工作集。

## Main 是应用级控制面

Main 负责 app 生命周期、BrowserWindow、菜单、托盘、对话框和 IPC handler。它只有一个 JavaScript 事件循环，长计算、同步文件扫描或大量串行任务都会让窗口创建、菜单响应和 IPC 一起排队。

如果所有窗口的本地能力调用同时变慢，优先检查 Main handler 的入口与出口时间；如果只有一个页面输入和绘制停止，优先检查对应 Renderer。

## 窗口对象不等于页面进程

BrowserWindow 是操作系统窗口的应用侧对象，webContents 管理页面导航与渲染，getOSProcessId() 才能映射到实际 Renderer PID。排障时至少记录三项：

| 标识 | 用途 |
| --- | --- |
| BrowserWindow 引用 | 窗口生命周期与原生行为 |
| webContents ID | 页面导航、事件与 IPC |
| OS PID | CPU、内存、崩溃和系统工具 |

Renderer 崩溃后，窗口外壳和 Main 可能仍然存在，旧 PID 已经失效。render-process-gone 的 reason、exitCode、导航 URL 和恢复次数应该进入同一份日志，避免无限重载制造更多进程。

## GPU 和 Utility 的边界

GPU 进程承担页面合成、纹理、视频和图形路径。Utility Process 适合索引、解析或可取消的独立 Node 任务。把重活迁出 Main 能缩小阻塞范围，但会引入进程启动、序列化、消息协议和额外内存。

一个可观测的 Utility 任务至少包含 taskId、输入摘要、进度、取消、结果和退出原因。窗口关闭时由 Main 取消关联任务；子进程崩溃时只重建该任务，而不是重启整个应用。

## 进程指标怎么记录

~~~js
const rows = app.getAppMetrics().map(metric => ({
  type: metric.type,
  pid: metric.pid,
  cpuPercent: metric.cpu.percentCPUUsage,
  workingSetSizeKb: metric.memory.workingSetSize,
}))
~~~

内存快照要注明机器、Electron 版本、窗口数量和采样动作。Browser 行不代表应用总内存，应按进程类型解释；共享缓存、回收时机和系统策略也会改变结果。

## 排查顺序

1. 把窗口映射到 webContents 和 OS PID。
2. 判断故障影响一个窗口、全部窗口还是图形路径。
3. 查看 render-process-gone 或 child-process-gone。
4. 对照 Main 与 Renderer 的事件循环延迟。
5. 决定任务留在 Main、迁到 Utility，还是优化 Renderer。

