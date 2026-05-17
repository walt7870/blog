# 内核线程

内核线程是由 Linux 内核创建和调度的特殊执行单元。它们不运行用户态业务代码，主要负责内核内部任务，例如工作队列、内存回收、软中断处理、RCU 回收和看门狗。

在 `ps` 输出中，内核线程名称通常带方括号，例如 `[kworker/0:1]`、`[kswapd0]`。看到它们不代表异常，关键是看资源占用和系统现象是否匹配。

## 常见内核线程

| 名称 | 作用 | 异常时常见现象 |
| --- | --- | --- |
| `kthreadd` | 内核线程的父进程，PID 通常为 2 | 很少直接成为问题源 |
| `kworker` | 执行内核工作队列任务 | CPU 高，可能与驱动、块设备、网络有关 |
| `ksoftirqd` | 处理软中断 | 网络包量大、软中断积压、CPU 高 |
| `kswapd` | 内存回收 | 内存紧张、swap 活跃、系统变慢 |
| `kcompactd` | 内存碎片整理 | 大页分配、内存碎片相关 |
| `rcu_*` | RCU 回收和同步 | RCU stall、系统卡顿 |
| `watchdog` | 检测 CPU 或系统卡死 | watchdog 报警、内核日志异常 |

## 怎么观察

```bash
ps -eLo pid,ppid,stat,comm | grep '^\s*[0-9].*\['
top
cat /proc/softirqs
cat /proc/interrupts
dmesg -T | tail -100
```

观察内核线程时不要只看名字，要结合：

- CPU 使用率。
- I/O wait。
- 网络包量。
- 内核日志。
- 最近是否更换驱动、内核、硬件或存储。

## kworker CPU 高

`kworker` 是工作队列执行者，本身不是根因。它 CPU 高通常说明某类内核任务很多。

排查方向：

1. 看 `dmesg` 是否有驱动、磁盘、USB、网络错误。
2. 看 `iostat` 是否有磁盘异常。
3. 看 `/proc/interrupts` 是否某个设备中断激增。
4. 回忆最近是否接入新硬件或升级内核。

不要直接尝试“杀掉 kworker”。它是内核线程，不是普通业务进程。

## ksoftirqd CPU 高

`ksoftirqd` 常和网络流量、中断处理有关。

排查：

```bash
cat /proc/softirqs
cat /proc/interrupts
ss -s
sar -n DEV 1
```

重点看：

- 是否某个网卡流量异常。
- 是否连接数暴涨。
- 是否出现包丢弃。
- 中断是否集中在少数 CPU。

## kswapd 活跃

`kswapd` 负责内存回收。它活跃通常说明系统内存压力较大。

排查：

```bash
free -h
vmstat 1
cat /proc/meminfo
ps aux --sort=-%mem | head
```

如果 `si/so` 持续不为 0，说明 swap 读写活跃，应用可能已经受到明显影响。

## RCU stall

RCU stall 通常会在内核日志中出现，表示某些 CPU 长时间没有完成 RCU 期望的调度点。它可能由内核 bug、驱动问题、长时间关中断、CPU 卡死等引起。

处理时优先保留现场：

- 保存 `dmesg`。
- 记录内核版本和驱动版本。
- 记录最近变更。
- 如果频繁复现，考虑升级内核或回滚驱动。

## 总结

内核线程是系统后台机制，不应按普通进程处理。看到内核线程高 CPU 或异常状态时，要把它当成线索：`kworker` 指向工作队列，`ksoftirqd` 指向软中断，`kswapd` 指向内存回收，RCU 和 watchdog 指向内核调度或卡顿。真正的根因通常在设备、驱动、网络、内存或内核日志里。
