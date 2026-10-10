# 批量语音转码与预处理：用 ffmpeg 有界命令池，把输入先标准化

> 对应视频：EP13《批量语音转码与预处理》  
> 视频入口：[B站 EP13 定时稿](https://www.bilibili.com/video/BV1Ruu76aEW7)（计划公开：2026-08-15 17:36）。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。
> 本文为视频的工程展开版，补充代码模板、排查链路、状态字段和检查清单。
> 最后核验：2026/08/09 08:26:33

这篇文章是视频的工程展开版。视频负责建立问题现场、工具选择和排查链路；文章补充代码模板、状态字段、指标口径和落地检查清单。

![ffmpeg 有界命令池转码流程图](/python/concurrency/ep13-ffmpeg-command-pool.svg)

这张图把 ffmpeg 转码放进有界命令池：先统一音频规格，再把退出码、stderr 和输出校验纳入状态表。

## 这篇解决什么问题

音频预处理既是质量步骤，也是并发边界。输入标准化以后，ASR 阶段才更容易稳定；命令池受限以后，CPU、磁盘和进程数才不会失控。

## ffmpeg 模板

固定采样率、声道和响度参数；保留 returncode 和 stderr；失败转成任务状态，不在主流程里直接吞掉。

## 排查链路

看 returncode、stderr、duration、输出大小、CPU、磁盘等待和临时目录大小。

## 示例代码

下方保留可直接阅读的示例代码。

## 问题、解决方式和工具

| 问题 | 解决方式 | 工具 |
| --- | --- | --- |
| mp3、wav、m4a 混在一起，后面每一步都会抖 | 输入不标准，ASR 阶段的错误和耗时也会变得不稳定。 | 格式混杂 / 采样率不一 / 响度波动 |
| 外部命令也需要并发上限 | 命令池解决的是 CPU、磁盘和进程数边界。 | Semaphore / Process count / 磁盘 I/O |
| 临时目录要能清理，也要能保留失败现场 | 临时文件管理解决磁盘膨胀和失败复现。 | workdir / atomic rename / failed samples |
| 转码池不要和 API 请求池混在一起 | 分池解决的是资源隔离：CPU 密集和网络限流不能抢同一批 worker。 | scan queue / ffmpeg pool / ASR queue |


<!-- concurrency-series-engineering-supplement:start -->
## 工程补充：怎么把这篇用到项目里

**读图方式**

- 并发 ASR 前先统一采样率、声道、编码和响度，否则后面的问题会混在模型或 API 里。
- `ffprobe` 用来读事实，`ffmpeg` 用来执行转换，状态表用来记录每次命令的结果。
- 命令池要限制进程数，因为转码会同时压 CPU、磁盘和临时目录。

**排查路径**

- 每个输入先记录 duration、sample_rate、channels、codec，再决定是否需要转码。
- 失败时保留 returncode、stderr 前后关键行、输出文件大小和 duration。
- 并发调参时观察 CPU util、磁盘 util、tmpdir 剩余空间和单文件转码耗时。

**问题、证据和解决动作**

| 问题现场 | 先查什么 | 解决动作 |
| --- | --- | --- |
| 转码后 ASR 识别异常 | 采样率、声道、duration | 统一 16kHz mono，并校验输出 |
| ffmpeg 偶发失败 | returncode、stderr、输入路径 | 分类错误，坏文件隔离，可恢复错误重试 |
| 并发转码让机器卡死 | CPU/磁盘 util、load、tmpdir | 限制命令池大小和临时目录水位 |
| 输出文件残缺 | 输出大小、duration、原子重命名 | 先写临时文件，校验后 rename |

**落地边界**

- 不要丢掉 stderr；很多音频问题只能从 ffmpeg 的 stderr 里定位。
- 转码结果要可复用，避免每次失败重试都重复消耗 CPU。
<!-- concurrency-series-engineering-supplement:end -->

## 实战检查清单

- 入口是否有容量边界，而不是无限提交。
- 任务是否有状态字段，失败是否能恢复。
- 每个重试是否有上限、退避和幂等保护。
- 是否记录吞吐、P95、错误率、队列长度和关键资源水位。
- 排查结果是否能指向具体动作：降并发、拆阶段、调 batch、隔离坏文件或回退方案。

## 结尾总结

最后把这一集收回来。

音频预处理先解决输入不一致：格式、采样率、声道和响度要标准化。

实现时用 ffmpeg 命令模板和有界命令池，控制 CPU、磁盘、进程数和临时文件。

排查时看 returncode、stderr、duration、输出大小和临时目录水位，才能判断是输入坏、命令错、磁盘慢，还是并发开太高。

## 配套示例代码

源码文件：`examples/ep13/ffmpeg_command_pool.py`

```python
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def transcode(src, dst_dir='normalized'):
    src = Path(src)
    dst = Path(dst_dir) / (src.stem + '.wav')
    dst.parent.mkdir(exist_ok=True)
    cmd = ['ffmpeg', '-y', '-i', str(src), '-ar', '16000', '-ac', '1', str(dst)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr[-500:])
    return dst


def run(paths, workers=3):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(transcode, p): p for p in paths}
        for fut in as_completed(futures):
            src = futures[fut]
            try:
                print('done', src, '->', fut.result())
            except Exception as exc:
                print('failed', src, exc)
```

