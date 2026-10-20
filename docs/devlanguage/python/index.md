# Python 工程实践

拿到一份客户名单，先把电话号码清洗干净、查出重复订单，再生成日报，这是 Python 基础能力解决的问题。每天要处理几万份文件或同时调用多个接口后，还要判断等待发生在哪里、并发开多少、失败怎样续跑，这才进入并发工程。两条路线可以前后衔接，也可以按当前任务直接进入。

![Python 从数据处理到并发工程的阅读路线](/python/python-learning-routes.svg)

## 按当前问题选择入口

<TopicDirectory :items="[
  { title: '基础与业务小工具', href: '/docs/devlanguage/python/basics-series/', description: '从 CSV 客户名单开始，学习规则、函数、文件、接口、日志与交付。', icon: 'code' },
  { title: '并发与性能诊断', href: '/docs/devlanguage/python/concurrency-series/', description: '从瓶颈定位开始，理解线程、进程、异步、背压与语音处理流水线。', icon: 'workflow' }
]" />

刚开始写脚本时，先走基础系列。它使用客户、订单和回访字段贯穿课程，避免每学一个语法就换一个没有联系的例子。文件章节提供最小输入，规则章节先用内存记录演练；每篇示例可以独立运行。阅读完 [CSV 读写](./basics-series/11-csv-read-write)、[订单检查](./basics-series/15-order-check)和 [生成日报](./basics-series/16-daily-report)后，应能解释每个输入字段怎样变成结果，而不只是运行一段现成代码。

已经有可用程序但运行慢时，进入 [先判断瓶颈](./concurrency-series/01-find-the-bottleneck-before-concurrency)。下载文件慢，可能是在等网络；清洗数据慢，可能是在做 CPU 计算；GPU 推理慢，还可能是预处理、数据搬运或批次调度没有衔接好。它们对应的工具不同，增加线程数不能统一解决。

## 同一项任务怎样逐步变复杂

以“读取客户名单并生成日报”为例，第一版只读本地 CSV，检查空值、重复编号和订单金额，再输出结果文件。此时先把规则写成函数，为一条合法记录和一条错误记录确认结果。不要先引入异步框架，业务口径错误时，跑得更快只会更快地产生错误报表。

第二版需要为每个客户查询外部接口。程序耗时主要来自等待响应，可以在接口配额内增加有限并发，同时设置超时、重试上限和失败清单。详见 [调用 API](./basics-series/21-api-fetch-customers)与 [限流、背压和重试](./concurrency-series/11-rate-limit-backpressure-retry)。

第三版每天处理大量文件，需要记录哪些已成功、哪些待重试，让中断后的任务从检查点恢复。此时关注的是任务生命周期和资源上限，而不只是循环语法。继续阅读 [批量文件处理](./concurrency-series/12-file-batch-checkpoint)；如果是语音文件，再进入 [音频预处理](./concurrency-series/13-audio-transcode-preprocess)和 [实时语音流水线](./concurrency-series/16-realtime-audio-pipeline)。

## 完成一条路线的标志

| 路线 | 可以独立完成什么 | 怎样验证 |
| --- | --- | --- |
| 基础工具 | 读入数据、解释规则、输出结果，并交给他人运行 | 用固定样例核对结果；输入缺列或金额非法时给出明确错误；在新虚拟环境按说明运行 |
| 并发工程 | 找到瓶颈，设定并发和队列上限，处理中断与重试 | 对比串行与并发的耗时、错误率和资源占用；模拟超时与中断，确认没有漏项或重复结果 |

依赖安装、异常、日志和交付问题分别在基础系列展开；线程安全、事件循环、进程池和 GPU 调度在并发系列展开。先完成当前阶段的闭环，再增加工具种类。
