# 批量文件处理实战：跑几个小时，也要能恢复、能跳过、能定位坏文件

> 对应视频：EP12《批量文件处理实战》  
> 视频入口：[B站 EP12](https://www.bilibili.com/video/BV1X3u76cEUw)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![批量文件处理 checkpoint 状态图](/python/concurrency/ep12-file-checkpoint-state.svg)

这张图把批量文件处理看成状态流转：发现、处理中、完成、失败、跳过，每个状态都要能恢复。

## 这篇解决什么问题

批量文件处理的重点是长时间运行后的可恢复性。程序要能跳过 done，隔离 failed，记录 skipped，并且每个批次都有 checkpoint。

## 核心模板

扫描器分批产出路径，最多50份一批；线程处理结束后由主线程统一保存状态。输入和状态目录分离，不扫描当前项目全部文件。输入目录在运行前创建并放入需要检查的文件，空目录返回全零计数。

## 排查链路

进度停住时看 files/sec、failed_rate、RSS、队列长度和 last_checkpoint。不同指标指向不同问题。

## 输入变化与恢复一致性

下方程序只读取文件字节数，使用SHA256判断输入是否变化；state位于扫描树之外。首次得到done，原件不变时重跑跳过，内容变化后重新处理。失败记录包含异常，下一次运行会再试；这是有限目录的单进程示例，状态字典仍随文件总数增长，海量任务应换成数据库。

每批结束先把完整JSON写入同目录临时文件、flush并fsync，再用os.replace替换状态文件，避免读到半份JSON。替换原子性不等于突然断电后的全链路持久性，关键场景还需目录同步或事务存储。若真实任务会写业务结果，必须先保证结果可校验且幂等，再标记done；不能仅靠文件名或成功日志跳过。

## 实战检查清单

- 状态文件是否在扫描树之外，输入变化是否使旧done失效。
- 是否区分坏输入、处理中变化与无法提交checkpoint。
- 原子替换失败时，旧状态是否完整保留。
- 真实输出是否先校验再标记done，重试写入是否幂等。

## 运行示例

示例保存为`examples/ep12/file_batch_checkpoint.py`；目录和文件名由本地自行创建。

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from pathlib import Path
import json
import os
import tempfile

def fingerprint(path):
    digest = sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def save_state(target, state):
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                     dir=target.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            json.dump(state, stream, ensure_ascii=False, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    try:
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)

def iter_batches(root, size=50):
    batch = []
    for path in root.rglob("*"):
        if path.is_file():
            batch.append(path)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch

def handle_file(path):
    return {"bytes": path.stat().st_size}

def run(root="inputs", state_path="state/batch.json"):
    root, target = Path(root).resolve(strict=True), Path(state_path).resolve()
    if not root.is_dir():
        raise ValueError("输入必须是目录")
    if target == root or root in target.parents:
        raise ValueError("状态文件必须位于扫描目录之外")
    state = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    if not isinstance(state, dict):
        raise ValueError("状态文件必须是JSON对象")
    processed = skipped = failed = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for batch in iter_batches(root):
            futures = {}
            for path in batch:
                key = str(path)
                try:
                    digest = fingerprint(path)
                    previous = state.get(key, {})
                    if previous.get("status") == "done" and previous.get("sha256") == digest:
                        skipped += 1
                        continue
                    future = pool.submit(handle_file, path)
                    futures[future] = (path, digest)
                except OSError as exc:
                    state[key] = {"status": "failed", "error": repr(exc)}
                    failed += 1
            for future in as_completed(futures):
                path, digest = futures[future]
                try:
                    result = future.result()
                    if fingerprint(path) != digest:
                        raise ValueError("处理过程中输入发生变化")
                    state[str(path)] = {"status": "done", "sha256": digest,
                                        "result": result}
                    processed += 1
                except Exception as exc:
                    state[str(path)] = {"status": "failed", "error": repr(exc)}
                    failed += 1
            save_state(target, state)
    return {"processed": processed, "skipped": skipped, "failed": failed}

if __name__ == "__main__":
    print(run())
```

