# Linux 进程管理

进程是 Linux 中正在运行的程序实例。一个服务、一个 shell 命令、一个后台任务、一个容器里的应用，最终都会表现为进程或线程。理解进程，重点不是背命令，而是看清它从哪里来、处于什么状态、占用了哪些资源、由谁管理、出了问题从哪里查。

![Linux 进程模型](/linux/process-model.svg)

## 本模块内容

| 页面 | 说明 |
| --- | --- |
| [进程管理概述](./index.md) | 进程树、状态、资源、排障路径 |
| [systemd](./systemd.md) | 现代 Linux 服务管理和 unit 机制 |
| [Init 进程](./init-process.md) | PID 1、启动链路和孤儿进程收养 |
| [内核线程](./kernel-threads.md) | kworker、kswapd、ksoftirqd 等内核后台任务 |
| [用户进程](./user-processes.md) | 用户进程生命周期、信号、资源限制和调试 |

命令速查集中在 [进程管理命令](../command/process.md) 和 [进程管理速查](../command/process-management.md)。本模块更关注机制和排查思路。

## 进程树

Linux 进程有父子关系。系统启动后，内核启动第一个用户空间进程 PID 1，现代发行版通常是 `systemd`。用户登录、服务启动、脚本运行，都会从已有进程派生出新进程。

常用观察命令：

```bash
pstree -ap
ps -ef --forest
```

读进程树时重点看：

- 父进程是谁。
- 子进程是否异常增多。
- 进程是否被 PID 1 收养。
- 服务是否由 systemd 管理。
- 同一服务是否拉起了多个 worker。

## 进程状态

![Linux 进程状态流转](/linux/process-state-flow.svg)

常见状态：

| 状态 | 含义 | 排查重点 |
| --- | --- | --- |
| `R` | 运行或等待 CPU | CPU 是否过载，是否有高优先级任务 |
| `S` | 可中断睡眠 | 通常正常，等待网络、定时器、锁等事件 |
| `D` | 不可中断睡眠 | 多与磁盘、NFS、块设备、内核 I/O 等有关 |
| `T` | 停止 | 被 `SIGSTOP`、调试器或作业控制暂停 |
| `Z` | 僵尸 | 子进程已退出，父进程未回收退出状态 |

`D` 和 `Z` 是排障高频状态。`D` 状态不能靠 `kill -9` 直接解决，通常要查 I/O 或内核等待；僵尸进程不能直接杀掉，应处理父进程。

## 资源维度

一个进程至少要关注这些资源：

| 资源 | 常用观察 | 典型问题 |
| --- | --- | --- |
| CPU | `top`、`pidstat`、`ps` | 计算过载、死循环、频繁 GC |
| 内存 | `free`、`pmap`、`smem`、`/proc/PID/status` | 泄漏、缓存膨胀、OOM |
| 磁盘 I/O | `iostat`、`iotop`、`pidstat -d` | 慢盘、日志过量、同步写 |
| 文件描述符 | `lsof`、`/proc/PID/fd` | 连接泄漏、文件句柄耗尽 |
| 网络 | `ss`、`lsof -i`、`tcpdump` | 端口占用、连接堆积、超时 |
| 信号 | `kill -l`、日志 | 终止不优雅、重载失败 |

## 排障路径

### 服务没有启动

1. `systemctl status 服务名` 看状态和退出码。
2. `journalctl -u 服务名 -xe` 看日志。
3. 检查配置文件、权限、端口占用。
4. 确认 `ExecStart` 指向的程序是否存在。
5. 查看是否触发 systemd 重启限制。

### CPU 高

1. `top` 找到高 CPU 进程。
2. 看是单进程高还是整体负载高。
3. 区分用户态、系统态、I/O wait。
4. 对应用进程看线程、堆栈、业务日志。
5. 对内核线程高 CPU，结合中断、网络和 I/O 排查。

### 内存高

1. `free -h` 看系统是否真的缺内存。
2. `ps aux --sort=-%mem | head` 找大进程。
3. 查进程 RSS、文件映射、缓存和 swap。
4. 看是否被 OOM Killer 处理过。
5. 对服务进程结合应用指标和堆转储分析。

### 僵尸进程

1. `ps -eo stat,ppid,pid,cmd | grep '^Z'` 找僵尸。
2. 查父进程 PID。
3. 判断父进程是否还能正常回收子进程。
4. 必要时重启父进程或对应服务。

## 与命令文档的边界

| 需求 | 看哪里 |
| --- | --- |
| 快速查 `ps`、`top`、`kill` 用法 | [进程管理命令](../command/process.md) |
| 查 `nohup`、后台任务、优先级 | [进程管理速查](../command/process-management.md) |
| 理解 systemd 服务为什么失败 | [systemd](./systemd.md) |
| 理解 PID 1 和启动过程 | [Init 进程](./init-process.md) |
| 理解 kworker、kswapd 等线程 | [内核线程](./kernel-threads.md) |

## 总结

进程管理的核心是把现象落到具体层级：是服务管理问题、用户进程问题、内核线程问题、资源耗尽问题，还是启动链路问题。先看进程树和状态，再看资源，再看日志和管理器，排查会比单纯堆命令更稳定。
