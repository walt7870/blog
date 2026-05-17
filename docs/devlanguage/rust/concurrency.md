# 并发、异步与运行时

Rust 对并发的核心态度是：允许你写高性能并发程序，但不把数据竞争留到运行时碰运气。很多并发错误会在编译期被拒绝。

## 并发与并行

- 并发：多个任务在同一时间段内推进，重点是结构。
- 并行：多个任务在同一时刻真正同时运行，重点是执行。

Rust 标准库提供线程、锁、通道、原子类型等基础能力；异步运行时和网络生态主要由社区库提供，例如 Tokio、async-std、smol。

## 线程

最基本的线程示例：

```rust
use std::thread;

fn main() {
    let handle = thread::spawn(|| {
        println!("hello from thread");
    });

    handle.join().unwrap();
}
```

`join` 会等待子线程结束。`unwrap` 在示例中用于简化处理，真实业务里应根据需要处理错误。

## move 闭包

跨线程传递数据时，经常使用 `move` 把所有权转移进线程：

```rust
use std::thread;

fn main() {
    let values = vec![1, 2, 3];

    let handle = thread::spawn(move || {
        println!("{values:?}");
    });

    handle.join().unwrap();
}
```

如果不移动所有权，子线程可能比当前作用域活得更久，引用就可能失效。Rust 会阻止这种不安全情况。

## Send 与 Sync

Rust 并发安全依赖两个重要 Trait：

| Trait | 含义 |
| --- | --- |
| `Send` | 类型的值可以安全地转移到另一个线程 |
| `Sync` | 类型的引用可以安全地被多个线程共享 |

多数基础类型自动满足这些约束。某些类型不满足，例如 `Rc<T>` 不能跨线程共享，应改用 `Arc<T>`。

## 消息传递

通道适合让线程之间通过消息通信：

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        tx.send(String::from("hello")).unwrap();
    });

    let message = rx.recv().unwrap();
    println!("{message}");
}
```

这种模式的优势是共享状态少，线程之间边界清楚。

## 共享状态

需要多个线程访问同一份数据时，可以使用 `Arc<Mutex<T>>`：

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            let mut value = counter.lock().unwrap();
            *value += 1;
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("{}", *counter.lock().unwrap());
}
```

`Arc` 负责多线程引用计数，`Mutex` 负责互斥访问。Rust 类型系统会迫使你明确写出共享和加锁策略。

## 异步编程

Rust 的异步模型基于 `Future`。`async fn` 返回一个尚未执行完成的未来值，只有被运行时轮询时才推进：

```rust
async fn fetch_user(id: u64) -> Result<String, reqwest::Error> {
    let url = format!("https://example.com/users/{id}");
    let text = reqwest::get(url).await?.text().await?;
    Ok(text)
}
```

`.await` 表示当前任务可以让出执行权，等待 I/O 完成后再继续。

## 为什么需要运行时

Rust 标准库定义了 `Future` 抽象，但不内置完整异步运行时。网络 I/O、定时器、任务调度通常由运行时提供。

最常见的是 Tokio：

```rust
#[tokio::main]
async fn main() {
    println!("async Rust");
}
```

Tokio 提供异步 TCP/UDP、文件、定时器、任务调度、同步原语等能力，是 Rust 后端服务和网络程序里的主流选择之一。

## async 不等于多线程

异步任务可以在单线程运行，也可以由多线程运行时调度。它解决的主要是 I/O 等待期间的资源利用率问题，而不是自动让 CPU 密集任务变快。

经验上：

- I/O 密集：适合 async。
- CPU 密集：适合线程池、并行迭代或专门任务队列。
- 简单脚本或工具：同步代码通常更清晰。

## Pin 与 Future 的直观理解

入门阶段经常会看到 `Pin`，但不必一开始深入。可以先理解为：某些异步状态机内部保存了自引用关系，运行过程中不能随意移动内存位置，`Pin` 用类型系统表达这种限制。

日常业务代码一般通过 `async fn`、`.await`、运行时和库封装使用异步，不需要手写复杂 `Future`。

## 并发中的错误处理

线程和异步任务都有“任务本身失败”和“业务逻辑失败”两层错误：

```rust
let handle = tokio::spawn(async {
    Ok::<_, std::io::Error>("done")
});

let result = handle.await;
```

`await` 可能返回任务调度层面的错误，任务内部还可能返回业务错误。实际项目中要明确区分这两层。

## 常见陷阱

- 在异步函数中执行长时间阻塞操作，导致运行时线程被占住。
- `Mutex` 锁范围过大，甚至跨 `.await` 持有锁。
- 为了绕过所有权问题过度使用 `Arc<Mutex<T>>`。
- 在 CPU 密集任务中误以为 async 会自动并行。
- 忽略任务取消、超时和背压。

## 实践建议

- 优先用所有权转移和消息传递减少共享状态。
- 共享状态必须明确 `Arc`、`Mutex`、`RwLock` 的责任边界。
- 异步服务里给外部调用加超时。
- 高并发系统要关注连接池、队列长度、限流和背压。
- 不要在库中强绑定某个异步运行时，除非领域本身要求。

## 参考资料

- Fearless Concurrency：https://doc.rust-lang.org/book/ch16-00-concurrency.html
- Async Book：https://rust-lang.github.io/async-book/
- Tokio：https://tokio.rs/
