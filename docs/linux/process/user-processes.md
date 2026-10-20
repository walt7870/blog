# 用户进程

一项订单导出会启动压缩子进程。压缩程序返回成功后，父服务才应把导出标记为完成；收到停止请求时，还要决定等待、取消和回收子进程。进程管理既涉及“运行什么”，也涉及“如何知道它已经结束”。

## 创建、执行和回收

![Linux进程状态与退出回收](/linux/process-state-flow.svg)

常见路径是 fork 创建子进程，子进程 exec 替换程序映像；exec 成功时 PID 不变，也不返回原程序。Linux 还有 clone、vfork、posix_spawn 等入口及实现路径，不是所有进程都必须通过一段显式 fork/exec 业务代码创建。

线程是调度实体。Linux 下同一进程的线程有各自 TID，共享地址空间和许多资源；查看主进程CPU与某个线程CPU时必须分清统计对象。用户进程执行系统调用会进入内核态，不能把“用户进程”理解为永远只在用户态运行。

## 一个有限的子进程实验

保存为 `child-status.c`，在 Linux、GCC或兼容C编译器与procps工具齐备的环境运行。示例只派生一个孩子，不是可直接用于生产的进程池：

```c
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

int main(void) {
    pid_t child = fork();
    if (child == -1) {
        perror("fork");
        return EXIT_FAILURE;
    }
    if (child == 0) {
        _exit(7);
    }
    printf("parent=%ld child=%ld\n", (long)getpid(), (long)child);
    fflush(stdout);

    struct timespec remaining = {.tv_sec = 3, .tv_nsec = 0};
    while (nanosleep(&remaining, &remaining) == -1) {
        if (errno != EINTR) {
            perror("nanosleep");
            return EXIT_FAILURE;
        }
    }

    int status;
    pid_t result;
    do {
        result = waitpid(child, &status, 0);
    } while (result == -1 && errno == EINTR);
    if (result == -1) {
        perror("waitpid");
        return EXIT_FAILURE;
    }
    if (!WIFEXITED(status)) {
        fputs("child did not exit normally\n", stderr);
        return EXIT_FAILURE;
    }
    printf("child_exit=%d\n", WEXITSTATUS(status));
    return WEXITSTATUS(status) == 7 ? EXIT_SUCCESS : EXIT_FAILURE;
}
```

```bash
cc -std=c11 -Wall -Wextra -Werror child-status.c -o child-status
./child-status &
parent=$!
sleep 1
ps --ppid "$parent" -o pid,ppid,stat,comm
wait "$parent"
```

孩子立即退出，父进程先等3秒，通常可以在 ps 中观察到 Z；之后 waitpid 读取退出码7，父程序输出 `child_exit=7` 并返回0。这里 shell 的 `wait` 回收父程序，C 的 waitpid 回收孩子，是两层等待。采样若错过窗口，就看不到Z，不能因此断言没有回收过程。

生产代码应循环等待所有需管理的子进程，处理信号中断、超时及异常退出，并把结果关联到任务；不要只凭压缩文件“存在”判断成功。subreaper与命名空间见 [Init](./init-process.md)。

## 信号不等于业务语义

| 信号 | 内核层含义或默认行为 | 应用需要做什么 |
| --- | --- | --- |
| SIGTERM | 默认终止，可捕获或改变处理 | 实现有界退出，才可能优雅 |
| SIGKILL | 不能捕获、阻塞或忽略 | 不会执行应用清理代码 |
| SIGHUP | 默认终止 | 只有应用约定才表示重载 |
| SIGSTOP | 不可捕获的停止 | 暂停不等于退出或释放资源 |
| SIGCONT | 恢复停止任务 | 后续仍按调度与等待条件运行 |

优先请求服务管理器停止对应服务；对独立任务发送信号前核对PID、身份、命令和启动时间，PID可能被复用。SIGKILL 后内核会清理进程资源，但业务事务、外部任务和未落盘结果不能靠它自动完成。

D 表示不可中断类等待，常见于I/O，单凭状态不能确定设备根因。真正的不可中断等待不能被信号立即打断；有些内核等待是 killable 变体，因此不能把所有显示D的任务都绝对归为“SIGKILL永远无效”。

## 后台执行与资源限制

`command &` 让shell异步等待，`nohup` 主要改变挂断信号处理及部分输出行为；二者不提供自动重启、健康检查或日志轮转。长期服务应由systemd或容器管理器维护。

```bash
ulimit -a
cat /proc/目标PID/limits
cat /proc/目标PID/cgroup
```

shell 的限制只影响由它派生的进程。systemd 服务通常需要检查 unit 的 LimitNOFILE 等配置；容器或 cgroup 还有独立资源控制。不要在当前终端调高 ulimit 后，就认定已运行的服务获得新上限。

## 从现象回到实际进程

| 现象 | 入口 | 解读边界 |
| --- | --- | --- |
| CPU持续高 | `top -H -p PID`、应用采样 | 区分线程、调用栈与时间窗口 |
| 文件或连接积累 | `/proc/PID/fd`、`lsof -p PID` | 快照后对象仍可能变化 |
| 等待来源不明 | `strace -p PID`、wchan、日志 | 需权限；系统调用跟踪有开销 |
| 内存增长 | status、smaps与应用对象分析 | RSS含共享映射，不等于独占 |
| 僵尸增加 | Z状态与PPID | 修父进程回收，不是杀已退出孩子 |

查8080监听可以使用 `ss -lntp 'sport = :8080'`；查看其他用户的进程信息可能需要权限。确认是否受服务管理器管理后再操作，避免杀掉后被自动拉起。修复完成后复验进程数量、子进程退出状态和同一业务请求，不以“进程不见了”代替任务正确结束。
