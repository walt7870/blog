# 并发、异步与运行时

导出服务可能同时收到许多请求，但一次只能生成少量文件。关键不是“创建多少任务”，而是限定排队数量、决定谁持有数据、区分失败与取消，并在关闭时等待资源回收。Rust 的类型约束能帮助防止数据竞争，业务并发合同仍要单独设计。

![导出请求的有界排队、执行与关闭](/rust/bounded-work-lifecycle.svg)

## 线程与数据转移

并发描述多个任务在一段时间内推进，并行描述同一时刻真正同时执行。标准库提供线程、锁和通道；线程的 `join` 等待结束，`move` 闭包按捕获方式接管数据。`move` 也可能移动一个引用，并不会自动把引用指向的对象变成长期有效。

下面只使用标准库，容量为 2 的同步通道在队列满时阻塞生产者；消费者取出消息后空出容量，发送返回并不等于任务完成。

```rust
use std::{sync::mpsc::sync_channel, thread};

fn main() {
    let (tx, rx) = sync_channel::<String>(2);
    let worker = thread::spawn(move || {
        let mut completed = 0;
        for job in rx {
            println!("导出 {job}");
            completed += 1;
        }
        completed
    });
    for id in ["order-1", "order-2", "order-3"] {
        tx.send(id.to_owned()).expect("工作线程提前退出");
    }
    drop(tx);
    assert_eq!(worker.join().expect("工作线程panic"), 3);
}
```

`drop(tx)` 关闭最后一个发送端后，接收端读完存量消息才退出。如果发送端克隆还活着，消费者可能一直等；无界通道则可能把过载变成内存持续增长。真实服务需选择等待、超时或立即拒绝，不能无限等待后仍称作限流。

## Send、Sync与共享状态

`Send` 表示值可以安全转移到另一个线程；`Sync` 表示 `&T` 可以安全跨线程共享。`Arc<T>` 只管理原子引用计数，是否能跨线程仍取决于 `T`。例如 `Arc<RefCell<T>>` 不会自动变成线程安全存储。

`Arc<Mutex<T>>` 可以保护符合相应约束的数据，但检查库存与扣减必须在同一临界区或数据库事务内。分别加锁读取、解锁、再加锁写入，依然可能产生业务竞态。锁顺序、死锁、重复处理与分布式一致性都超出编译器的数据竞争保证。

## Future与运行时

调用 `async fn` 得到 Future；其函数体在被轮询时推进。`.await` 轮询子 Future，只有遇到未就绪等情况才可能挂起，立即就绪时可能继续执行，不能把每次 `.await` 都当成公平让出CPU。

标准库定义 Future 等抽象，Tokio之类运行时提供调度、I/O和定时器。下面片段需要 `tokio = { version = "1", features = ["macros", "rt", "sync", "time"] }`：

```rust
#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<u64>(2);
    let worker = tokio::spawn(async move {
        let mut total = 0;
        while let Some(id) = rx.recv().await { total += id; }
        Ok::<u64, &'static str>(total)
    });
    for id in 1..=3 { tx.send(id).await.expect("消费者关闭"); }
    drop(tx);
    match worker.await {
        Ok(Ok(total)) => assert_eq!(total, 6),
        Ok(Err(error)) => panic!("业务失败：{error}"),
        Err(error) => panic!("任务失败：{error}"),
    }
}
```

这是单线程运行时上的并发，不是多核并行。`tokio::spawn` 的任务通常要求 `Send + 'static`；局部非Send任务可有专门入口。CPU密集计算和阻塞库会占住执行线程，应放进受控线程池或合适的阻塞任务入口，并限制并发数。`spawn_blocking` 的已启动工作通常不能用 `abort` 直接停止，仍需协作式退出。

## 超时、取消与关闭

取消 Future 一般意味着丢弃后续轮询，并不回滚已经发送的支付请求或已提交事务。调用超时也可能是结果未知，重试之前应查状态并使用幂等标识。`JoinHandle` 被丢弃时，Tokio任务通常继续运行；调用 `abort` 后还应等待句柄，确认退出并处理已发生的副作用。

关闭服务时先停止接收新任务，再关闭发送端，按约定排空队列或标记未完成，最后等待工作任务与资源关闭。超时策略必须说明剩余任务如何恢复，不能只调用一个取消函数就报告全部处理成功。

`Pin` 约束的是被固定目标的移动，并不表示持有它的指针句柄完全不能移动；`Unpin` 类型又有不同条件。普通异步应用优先使用运行时与安全库封装，避免为了消除错误手写不受证明的 `unsafe` 投影。

## 验收与定位

分别记录入队等待、队列长度、执行时长和结果状态。入队变慢说明生产速率超过处理能力或消费者卡住，不能只增加队列容量；吞吐不足要检查I/O、锁范围、CPU及外部服务。测试应覆盖满队列、接收端提前关闭、任务panic、业务失败、关闭排空与取消后的重复请求，不能把“能编译”当成负载或恢复验证。
