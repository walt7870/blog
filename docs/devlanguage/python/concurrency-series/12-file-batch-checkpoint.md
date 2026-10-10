# 批量文件处理实战：跑几个小时，也要能恢复、能跳过、能定位坏文件

> 对应视频：EP12《批量文件处理实战》  
> 视频入口：[B站 EP12 定时稿](https://www.bilibili.com/video/BV1X3u76cEUw)（计划公开：2026-08-15 10:58）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![批量文件处理 checkpoint 状态图](/python/concurrency/ep12-file-checkpoint-state.svg)

这张图把批量文件处理看成状态流转：发现、处理中、完成、失败、跳过，每个状态都要能恢复。

## 这篇解决什么问题

批量文件处理的重点是长时间运行后的可恢复性。程序要能跳过 done，隔离 failed，记录 skipped，并且每个批次都有 checkpoint。

## 核心模板

扫描器按批产出路径，线程池按批提交，as_completed 收敛结果，writer 统一写状态文件。不要一次性提交所有任务。

## 排查链路

进度停住时看 files/sec、failed_rate、RSS、队列长度和 last_checkpoint。不同指标指向不同问题。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| 一次性把所有路径塞进内存，会把任务表变成新瓶颈 | 批处理最怕任务还没开始，内存和状态就已经失控。 | 全量列表 / 重复处理 / 坏文件拖垮全局 |
| 状态文件决定程序能不能继续跑 | checkpoint 解决的是恢复，不是日志好看。 | done / failed / skipped / attempt |
| 坏文件是任务状态，不是全局失败 | 坏文件隔离解决的是长任务被单点拖垮。 | 隔离目录 / 错误原因 / 重试次数 |
| 批处理排查要看进度速度和失败分布 | 只显示百分比不够，要知道卡在哪一类文件和哪一段。 | files/sec / failed_rate / RSS / last_checkpoint |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- manifest 记录输入事实，checkpoint 记录处理进度，failed table 记录无法自动恢复的问题。
- 文件批处理的目标不是只跑完一次，而是中断后能继续、坏文件能隔离、已完成能跳过。
- 状态字段要比文件名更可靠，建议记录 path、size、mtime、hash、status、attempt、error。

**排查路径**

- 先确认扫描阶段是否稳定：文件数、重复数、坏路径、权限错误。
- 处理阶段观察 RSS、每批大小、失败率和 checkpoint 写入频率。
- 恢复运行时抽样核对 DONE 文件和输出是否一致，避免只看状态不看结果。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 中断后从头跑 | 是否有 checkpoint、DONE 标记 | 按文件状态跳过已完成任务 |
| 坏文件拖垮全局 | error_type、failed_rate | 失败归档，超过阈值隔离 |
| 内存随文件数增长 | RSS、pending 列表长度 | 流式扫描 + 分批处理 |
| 文件更新后仍被跳过 | mtime、size、hash | 用摘要或版本字段判断是否重跑 |

**落地边界**

- checkpoint 要原子写入，避免程序崩溃时留下半条状态。
- 输出文件也要可校验，不能只相信状态表里的 DONE。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

批量文件处理真正要解决的是长时间运行：不要一次持有全量任务，用分批扫描控制内存；不要只写日志，用 checkpoint 支持恢复；不要让坏文件中断全局，用状态表和隔离目录收敛失败。

排查时看 files per second、failed_rate、RSS、队列长度和 last_checkpoint，才能知道该调扫描、处理、写入还是状态落盘。

## 配套示例代码

源码文件：`examples/ep12/file_batch_checkpoint.py`

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import time

STATE = Path('batch_state.json')

def load_state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}

def save_state(state):
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2))

def iter_batches(root, size=100):
    batch = []
    for path in Path(root).rglob('*'):
        if path.is_file():
            batch.append(path)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch

def handle_file(path):
    time.sleep(0.01)
    return {'bytes': path.stat().st_size}

def run(root='.'):
    state = load_state()
    with ThreadPoolExecutor(max_workers=8) as pool:
        for batch in iter_batches(root, 50):
            todo = [p for p in batch if state.get(str(p), {}).get('status') != 'done']
            futures = {pool.submit(handle_file, p): p for p in todo}
            for fut in as_completed(futures):
                path = futures[fut]
                try:
                    state[str(path)] = {'status': 'done', 'result': fut.result()}
                except Exception as exc:
                    state[str(path)] = {'status': 'failed', 'error': repr(exc)}
            save_state(state)

if __name__ == '__main__':
    run()
```

