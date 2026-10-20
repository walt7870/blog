# Init 进程与 PID 1

一项导出任务启动了转换子进程，父服务崩溃后，转换进程仍在运行。谁接管它、谁回收退出状态，取决于进程树、subreaper 和 PID 命名空间。不能把所有孤儿都简单理解成“交给宿主机 systemd”。

## 启动与命名空间

主机启动可简化为固件、引导程序、内核、早期用户空间和最终系统管理器。使用 initramfs 时，内核可以先运行其中的 `/init`，再切换根文件系统并交给最终 init；PID 1 的身份可以通过 `exec` 改变。

```bash
ps -p 1 -o pid,ppid,comm,args
cat /proc/1/comm
readlink /proc/1/ns/pid
```

现代主机常用 systemd，也有其他 init。新的 PID 命名空间有自己的 PID 1；同一个进程在祖先命名空间中有另一个 PID。容器里看到 PID 1，不代表它就是宿主机 PID 1，也不证明服务由 systemd 管理。

![孤儿收养与子进程退出回收](/linux/orphan-reaping.svg)

## 孤儿和僵尸是两件事

父进程先退出，仍存活的子进程成为孤儿。内核会优先把它交给最近的存活祖先 subreaper；没有这样的祖先时，交给适用 PID 命名空间的 init。subreaper 通过 `prctl(PR_SET_CHILD_SUBREAPER, ...)` 设置，是对后代收养职责的声明，不是业务重启策略。

子进程先退出，而父进程尚未通过 `wait/waitpid` 等读取状态时，通常留下僵尸。此时大多数运行资源已释放，但 PID、退出状态等仍被保留。已配置忽略 SIGCHLD 或 `SA_NOCLDWAIT` 等行为时，回收规则有所不同；不能说每次退出都必然长期出现 Z。

例如转换程序退出码为 7：如果父服务只是删掉自己的“运行中”记录，没有调用 wait，就可能丢失失败原因并积累僵尸。给已经退出的僵尸发送 SIGKILL 不能完成回收，应修复等待逻辑，或评估并重启负责管理它的父服务。

```bash
ps -eo stat,ppid,pid,comm | awk '$1 ~ /^Z/'
ps -p 目标父PID -o pid,ppid,stat,args
```

## 容器停止为什么失效

Linux 对 PID 命名空间 init 的信号有特殊规则：普通默认终止动作不能按一般业务进程理解。应用作为 PID 1 时，应显式处理停止信号并回收子进程；从祖先命名空间发来的 SIGKILL/SIGSTOP 还有特殊例外。

容器运行时通常先发送配置的停止信号，超时后强制终止。主进程若只启动一个后台 worker 后自己退出，不能指望该 worker 长期保活；命名空间 init 退出会导致内核终止其中其余进程。

exec 形式的入口让应用直接接收信号；必须使用 shell 初始化时，最后用 `exec 应用程序` 替换 shell。轻量 init 如 tini 可承担转发与回收，但仍需要应用实现有界清理：停止接单、完成或取消在途任务、等待子进程、释放资源。它不会为业务自动保存未提交数据，也不等同于完整 systemd。

## 启动慢如何取证

以下命令适用于由 systemd 管理的主机：

```bash
systemd-analyze
systemd-analyze blame
systemd-analyze critical-chain
systemctl --failed
journalctl -b -p err --no-pager
```

`blame` 展示 unit 激活所花时间，不等于它对总启动时间的贡献；并行启动、排队等待和不同 Type 都影响解读。`critical-chain` 提供顺序链线索，也不能完整覆盖所有设备与运行时等待。

先对齐本次启动的 journal 与依赖关系，再判断慢的是设备、网络等待器还是应用初始化。管理业务服务应使用对应 unit 的命令；进程回收实验见 [用户进程](./user-processes.md)，服务状态详见 [systemd](./systemd.md)。
