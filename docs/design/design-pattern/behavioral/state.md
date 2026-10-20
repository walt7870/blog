# 状态模式

状态（State）把“当前处境下允许做什么”交给对应状态对象，再由上下文统一持有当前状态。导出任务排队时可以启动或取消，运行中可以完成或失败，成功后不能再次启动。变化的不只是一个标签，而是同一个操作在不同阶段的合法性。

![导出任务的合法迁移与终态](/design-pattern/patterns/state.svg)

## 先列事件与迁移，再拆状态类

状态图描述业务规则，状态模式是组织这些规则的一种代码方式，两者不等同。只有几个稳定状态时，枚举和 `switch` 往往足够；多个操作反复按状态分支、各阶段行为明显不同时，才需要将行为分配到状态实现中。

以打印店为例，文件还没开始打印时可直接取消；机器正在打印时，点击取消只能提出请求，是否停止还要由机器确认。把界面文字改成“已取消”不会让物理打印停止。同理，导出任务的取消必须定义工作线程和文件产物如何处理，不能只给字段赋值。

下面的最小模型只允许取消尚未启动的任务，不包含运行中取消、自动重试或远端上传。这样每条边都能有明确含义：

| 当前状态 | 事件 | 下一个状态 | 约束 |
| --- | --- | --- | --- |
| QUEUED | START | RUNNING | 获得本次执行权 |
| QUEUED | CANCEL | CANCELLED | 尚无工作线程开始生成 |
| RUNNING | COMPLETE | SUCCEEDED | 携带非空产物键 |
| RUNNING | FAIL | FAILED | 本次执行失败 |
| 三种终态 | 任意事件 | 拒绝 | 新执行需要新的任务或尝试标识 |

## 状态实现只计算下一步

每个枚举常量都是一个无状态行为实例，负责本阶段的事件规则。`Job` 在同一个锁中检查版本、计算新状态、校验产物，再一次性替换不可变快照。非法事件或参数失败不会提前修改当前状态，外部也不能绕过事件直接调用 `setState()`。

保存为 `StateDemo.java`，使用 Java 17+ 编译运行。程序只验证内存状态与元数据，不创建真实导出文件：

```java
import java.util.Objects;

public class StateDemo {
    enum Action { START, COMPLETE, FAIL, CANCEL }

    interface Behavior {
        Phase next(Action action);
    }

    enum Phase implements Behavior {
        QUEUED {
            @Override
            public Phase next(Action action) {
                return switch (action) {
                    case START -> RUNNING;
                    case CANCEL -> CANCELLED;
                    default -> reject(action);
                };
            }
        },
        RUNNING {
            @Override
            public Phase next(Action action) {
                return switch (action) {
                    case COMPLETE -> SUCCEEDED;
                    case FAIL -> FAILED;
                    default -> reject(action);
                };
            }
        },
        SUCCEEDED, FAILED, CANCELLED;

        @Override
        public Phase next(Action action) {
            return reject(action);
        }

        Phase reject(Action action) {
            throw new IllegalStateException(name() + "不允许" + action);
        }
    }

    record Snapshot(Phase phase, long version, String artifactKey) {}

    static final class Job {
        private Snapshot current = new Snapshot(Phase.QUEUED, 0, null);

        synchronized Snapshot fire(Action action, long expectedVersion, String artifactKey) {
            Objects.requireNonNull(action);
            if (current.version() != expectedVersion) {
                throw new IllegalStateException("任务版本已变化");
            }
            Phase next = current.phase().next(action);
            if (action == Action.COMPLETE) {
                if (artifactKey == null || artifactKey.isBlank()) {
                    throw new IllegalArgumentException("完成事件必须携带产物键");
                }
            } else if (artifactKey != null) {
                throw new IllegalArgumentException("只有完成事件可以携带产物键");
            }
            Snapshot updated = new Snapshot(next,
                    Math.addExact(current.version(), 1), artifactKey);
            current = updated;
            return updated;
        }

        synchronized Snapshot snapshot() { return current; }
    }

    public static void main(String[] args) {
        Job job = new Job();
        try {
            job.fire(Action.COMPLETE, 0, "exports/demo.txt");
            throw new AssertionError("排队任务不能直接成功");
        } catch (IllegalStateException expected) {
            if (job.snapshot().version() != 0) throw new AssertionError("拒绝后状态变化");
        }
        job.fire(Action.START, 0, null);
        try {
            job.fire(Action.COMPLETE, 1, " ");
            throw new AssertionError("空产物键应被拒绝");
        } catch (IllegalArgumentException expected) {
            if (job.snapshot().phase() != Phase.RUNNING
                    || job.snapshot().version() != 1) throw new AssertionError();
        }
        Snapshot done = job.fire(Action.COMPLETE, 1, "exports/demo.txt");
        if (done.phase() != Phase.SUCCEEDED || done.version() != 2) {
            throw new AssertionError("完成状态错误");
        }
        Job cancelled = new Job();
        cancelled.fire(Action.CANCEL, 0, null);
        if (cancelled.snapshot().phase() != Phase.CANCELLED) throw new AssertionError();
        System.out.println(done);
        System.out.println(cancelled.snapshot());
    }
}
```

状态实例里没有订单号、运行次数或用户信息，所以可以安全复用；这些上下文数据应由各自任务持有。若状态对象含倒计时等可变字段，退出后再进入是否重置、是否被其他对象共享，都必须明确，不能默认把所有状态放进对象池。

本例 `COMPLETE` 仅表示收到了合法格式的元数据，不能证明产物真实存在。生产中应由可信工作线程在产物写入并达到约定发布条件后发出完成事件，并校验任务、租户、执行尝试与产物归属；浏览器传来一条“已完成”不能直接作为成功证据。

## 并发迁移与外部副作用

`volatile` 只保证引用可见，不保证“读取当前状态、检查、写入”这个组合原子。本例锁只保护同一个 JVM 对象；多实例服务需要在持久层实施条件更新，例如：

```sql
UPDATE export_job
SET state = 'RUNNING', version = version + 1
WHERE id = :id AND tenant_id = :tenant_id
  AND state = 'QUEUED' AND version = :expected_version;
```

这是使用命名参数的伪代码，具体绑定方式取决于数据库访问库。必须检查影响行数：只有一行更新才获得该次迁移；零行可能是状态变化、版本过期或对象不存在，不能仍继续执行任务。进程获得执行权后崩溃，还需租约或恢复扫描等机制，本条 SQL 并未解决。

进入或退出状态的钩子若访问外部系统，可能在字段更新前后失败。把 `currentState = next` 写回旧值并不能撤销已经发出的邮件或已上传文件。应把纯迁移与副作用执行拆开，明确持久事件、幂等键、执行尝试和恢复路径，不能捕获异常返回 `false` 却留下已改变的状态。

## 重复事件、取消与重试

同一条完成事件重复到达，可以按幂等协议返回原结果，也可以明确报告冲突，但不能再执行副作用。仅按“当前状态已经成功”忽略请求还不够，必须判断是否是相同任务、相同尝试和相同事件，防止旧尝试覆盖新尝试。

若业务需要运行中取消，应增加“取消请求已受理”与工作线程确认的区分，并规定完成与取消竞争的裁决方式。失败重试可以新建尝试记录，保留历史失败与对应产物，不能偷偷把所有失败都退回排队。外部支付超时还可能处于结果未知，需要查询后才能决定成功或补偿。

## 与其他模式的分工

[策略](./strategy)选择计算算法；状态决定当前允许哪些操作与迁移。[命令](./command)携带一个请求，执行时仍须受状态规则约束；命令不天然可撤销。[备忘录](./memento)恢复本地对象快照，不应把已支付订单直接恢复成未支付而忽略外部账目。

TCP等协议确有状态机，但三四个随意命名的状态类不能代表真实协议实现。需要协议完整性时，应以协议规范中的事件、计时器、重传和异常迁移为依据，再选择适合的代码组织。

## 失败与验收

按“状态 × 事件”枚举允许与拒绝的组合，同时检查拒绝不改状态、终态约束、重复事件、版本过期、完成元数据非法，以及两个线程争抢同一版本。记录任务标识、旧状态、事件、守卫结果、新状态和版本，不能只输出“处理失败”。

耗时统计要区分当前仍在状态中的任务和已经退出的任务，平均驻留时间使用已完成驻留次数作为分母；进入次数不等于完成次数。新增状态时还要同步迁移图、持久层取值、旧事件兼容和运行中对象恢复，不能仅以“新增一个类不用改其他代码”判断扩展完成。
