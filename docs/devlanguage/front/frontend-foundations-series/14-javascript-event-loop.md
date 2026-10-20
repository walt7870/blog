# 事件循环：调用栈、任务队列、微任务与渲染

点击“生成报表”后，脚本先把按钮改成“处理中”，紧接着计算几十万条记录，用户却看不到提示。这不是DOM没有改，而是同一主线程还忙于同步计算，没有及时获得后续渲染机会。

![一次任务、微任务检查点与可选渲染机会](/front/frontend-foundations-series/ep14-flow.svg)

## 一个任务中的同步代码先完成

函数调用进出调用栈。主线程当前执行的JavaScript通常持续运行到当前调用完成，其他输入回调不能随意插入。网络I/O和浏览器其他线程可以推进，但页面脚本的长同步任务仍会延迟主线程交互与渲染。

浏览器有不同任务源和队列，并不是所有任务严格排在一个全局FIFO里。定时器延迟表示达到可调度条件的等待时间，不是精确执行时刻；后台标签、嵌套定时器与系统负载会影响实际时间。

## 用顺序实验理解微任务

```js
console.log('A');
setTimeout(() => console.log('timer'), 0);
Promise.resolve().then(() => console.log('promise'));
queueMicrotask(() => console.log('microtask'));
console.log('B');
// 在普通浏览器脚本中：A B promise microtask timer
```

Promise执行器本身同步运行，then回调在Promise结果可用后作为微任务运行。这里已兑现的Promise先入队，queueMicrotask随后入队。微任务检查点会继续执行期间新加入的微任务，直到队列耗尽，因此递归补充微任务可能让后续任务和渲染饥饿。

微任务检查点也可能出现在其他规范规定的位置，不能把整套机制缩成“每个宏任务之后固定只跑一次Promise”。这里的普通脚本顺序不用于推断Node.js全部阶段或不同文档间的调度。

## await暂停当前函数，不创建新线程

```js
async function calculate() {
  console.log('inside');
  await Promise.resolve();
  console.log('continued');
}
calculate();
console.log('outside');
// inside outside continued
```

await前面的部分立即运行，延续在异步路径恢复。即使等待已兑现的Promise，后续语句也不会作为同一次同步调用直接继续。若await后执行大循环，仍会阻塞主线程；“加了async”与“在后台计算”是不同概念。

## 渲染不是每个任务之后必然发生

浏览器根据渲染机会、可见性和调度更新画面，可能跳过或合并多次更新。requestAnimationFrame把回调安排在相关渲染更新阶段，并不保证紧接着一定产生用户可见的绘制；后台页面回调还可能被暂停或节流。回调里仍应保持轻量。

`await Promise.resolve()` 只让出到微任务，不能可靠地让输入和绘制先运行。把重计算放进requestAnimationFrame同样不会变成后台任务。需要分批时，可以在有界批次间安排后续任务，支持时使用scheduler.yield等机制；独立计算可考虑Web Worker，但DOM仍需主线程处理。

## 报表处理如何改

先按数据量测量同步计算耗时，再选择分页、分批或Worker。分批要允许取消，保留进度状态，最后一次性提交结果，避免失败后留下半更新界面。Worker还涉及消息序列化、传输与结果版本，不能仅把循环包进新文件就认定没有交互延迟。

用Performance录制点击到结果出现，检查长任务、输入等待与帧更新。上面的两个顺序实验只验证语言与队列结果，不能由日志证明某一帧已经展示。可见提示的验收应在真实页面中同时观察画面和时间轴，性能范围见[Web性能工程](./27-web-performance-engineering.md)。
