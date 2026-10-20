# 线程安全与共享状态：别让任务完成但结果写错

> 对应视频：EP05《线程安全与共享状态》  
> 视频入口：[B站 EP05](https://www.bilibili.com/video/BV1QLu76tEfa)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

视频讲共享状态为什么会让线程池结果不稳定。文章给出三种实战策略：避免共享、队列汇聚、必要时加锁。

![线程安全共享状态策略图](/python/concurrency/ep05-shared-state-strategies.svg)

这张图的核心是先减少共享，再考虑加锁；共享状态越少，线程安全问题越容易定位和复现。

## 三种策略

| 策略 | 适合场景 | 优先级 |
| --- | --- | --- |
| 避免共享 | 每个任务能独立返回结果 | 最高 |
| 队列汇聚 | 多 worker，单写入者落盘 | 高 |
| Lock | 必须修改共享对象 | 谨慎使用 |

## 单写入者的结果去向

结果去向可以改为JSONL或数据库；替换前要增加写入失败向监督者传播的协议。

## 单写入者保证什么

下方仅演示三个消息进入有界队列后，由一个线程追加到内存列表。STOP排在普通消息后面，writer消费完消息才退出；每次get都必须对应一次task_done，join等待的是计数归零，不是写入成功。

若把append改为文件或数据库写入，writer遇到磁盘满后直接退出，会让生产者或join永久等待。需要把写入异常传给监督者，由监督者停止上游、保存尚未确认的任务并返回失败；不能只把task_done放进finally就宣称实现了可靠落盘。单写入者也不自动保证事务、持久化和跨进程去重。

例如先检查客户编号不存在、再插入缓存是两个动作，即使单次dict操作有内部保护，整段业务检查仍需同一个锁或唯一约束。frozen dataclass也只禁止字段重新赋值，其字段若指向列表，列表内容仍可改变。

## 常见失败模式

| 错误写法 | 现象 | 修正 |
| --- | --- | --- |
| worker 同时写一个文件 | 丢行、乱序、文件损坏 | 单写入者 |
| 共享计数器无锁自增 | 统计不准确 | 主线程汇总或 Lock |
| 多线程共享数据库连接 | 偶发事务和连接错误 | 每线程连接或连接池 |
| 到处加锁 | 程序变慢，甚至死锁 | 重新设计数据流 |

## 实战检查清单

- worker 是否只返回结果，不直接改全局状态。
- 是否只有一个组件负责结果落盘。
- Queue 是否有停止信号。
- 写入失败是否能记录并恢复。
- 锁保护的代码块是否足够小。

## 读完之后能完成什么

- 能识别线程池中的共享状态风险。
- 能用 Queue 设计单写入者结果收集。
- 能判断什么时候该避免共享，什么时候才需要锁。

## 运行示例

示例保存为`examples/ep05/single_writer.py`；目录和文件名由本地自行创建。

```python
from queue import Queue
from threading import Thread

STOP = object()

def writer(results: Queue, output: list[str]) -> None:
    while True:
        item = results.get()
        try:
            if item is STOP:
                return
            output.append(item)
        finally:
            results.task_done()

def main() -> list[str]:
    results: Queue = Queue(maxsize=8)
    output: list[str] = []
    thread = Thread(target=writer, args=(results, output))
    thread.start()

    for item in ["a", "b", "c"]:
        results.put(f"processed:{item}")

    results.put(STOP)
    results.join()
    thread.join()
    return output

if __name__ == "__main__":
    print(main())
```

