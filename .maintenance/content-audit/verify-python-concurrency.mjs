import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const python = process.env.PYTHON || 'python3';
const root = path.resolve('docs/devlanguage/python/concurrency-series');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-python-concurrency-'));
const pages = fs.readdirSync(root).filter(file => file.endsWith('.md')).sort();
const scripts = {};
let blocks = 0;
for (const file of pages) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const snippets = [...source.matchAll(/```python\n([\s\S]*?)```/g)].map(match => match[1]);
  for (const [index, snippet] of snippets.entries()) {
    const target = path.join(temporary, `${file.slice(0, 2)}-${index}.py`);
    fs.writeFileSync(target, snippet);
    const check = spawnSync(python, ['-c', 'import ast,sys; ast.parse(open(sys.argv[1]).read(), feature_version=(3,11))', target], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(`${file}: ${check.stderr}`);
    blocks++;
  }
  if (snippets.length) scripts[file.slice(0, 2)] = path.join(temporary, `${file.slice(0, 2)}-${snippets.length - 1}.py`);
}
const evidence = [];
for (const [episode, file] of Object.entries(scripts)) {
  if (['12', '13'].includes(episode)) continue;
  const run = spawnSync(python, [file], { cwd: temporary, encoding: 'utf8', timeout: 15000 });
  if (run.status !== 0) throw new Error(`EP${episode}: ${run.stderr}`);
  evidence.push({ episode, execution: 'passed', output: run.stdout.trim() });
}
const checks = String.raw`
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import struct
import sys
import threading
import time
import wave

scripts = json.loads(sys.argv[1])
modules = {}
for episode, file in scripts.items():
    spec = importlib.util.spec_from_file_location("ep" + episode, file)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    modules[episode] = module

m = modules["04"]
assert sorted(m.run_batch((str(i) for i in range(101)), 2)) == sorted((str(i), len(str(i))) for i in range(101))
try:
    m.run_batch([], 0)
except ValueError:
    pass
else:
    raise AssertionError("非法线程数未拒绝")
original = m.handle_one
def bad_item(item):
    if item == "bad":
        raise ValueError("expected")
    return original(item)
m.handle_one = bad_item
try:
    m.run_batch(["a", "bad", "c"], 2)
except RuntimeError:
    pass
else:
    raise AssertionError("线程异常未汇总")

assert modules["05"].main() == ["processed:a", "processed:b", "processed:c"]
rows = modules["10"].run([f"audio-{i}.mp3" for i in range(50)] + ["broken.mp3", "bad.mp3"])
assert len(rows) == 52 and sum(row.status == "failed" for row in rows) == 2
assert len({row.path for row in rows}) == 52
assert not any(thread.name != "MainThread" and thread.is_alive() for thread in threading.enumerate())

async def async_checks():
    m = modules["07"]
    result = await asyncio.gather(*(m.run_one(x) for x in ["a", "bad", "slow"]))
    assert [r[1] for r in result] == ["success", "failed", "timeout"]
    task = asyncio.create_task(m.run_one("slow"))
    await asyncio.sleep(0.005)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    else:
        raise AssertionError("取消未传播")

    m = modules["08"]
    done = threading.Event()
    def blocked():
        time.sleep(0.06)
        done.set()
    try:
        await asyncio.wait_for(asyncio.to_thread(blocked), 0.01)
    except TimeoutError:
        pass
    assert not done.is_set()
    await asyncio.sleep(0.08)
    assert done.is_set(), "外层超时并未终止线程，应验证其继续运行"

    m = modules["11"]
    pacer = m.Pacer(100)
    times = []
    async def started():
        await pacer.wait()
        times.append(asyncio.get_running_loop().time())
    await asyncio.gather(*(started() for _ in range(6)))
    assert all(b - a >= 0.009 for a, b in zip(times, times[1:]))
    result = await m.call_with_retry(0, asyncio.Semaphore(1), m.Pacer(100))
    assert result["attempt"] == 2 and result["status"] == "done"
    original = m.fake_call
    async def timeout(*args):
        raise TimeoutError()
    m.fake_call = timeout
    failed = await m.call_with_retry(0, asyncio.Semaphore(1), m.Pacer(100), 2)
    assert failed["status"] == "failed" and failed["attempt"] == 2
    m.fake_call = original

    m = modules["14"]
    slow = m.Task("slow", "slow.wav")
    await m.transcribe(slow, asyncio.Semaphore(1))
    assert slow.status == "unknown" and slow.billing == "unknown" and slow.cost is None
    complete = m.Task("a", "a.wav")
    await m.transcribe(complete, asyncio.Semaphore(1))
    await m.transcribe(complete, asyncio.Semaphore(1))
    assert complete.attempt == 1 and complete.status == "done"

    m = modules["15"]
    rows = await asyncio.wait_for(m.main(), 2)
    assert sorted(item for item, _ in rows) == list(range(20))
    async def model_error(batch):
        raise RuntimeError("模拟模型故障")
    m.run_model = model_error
    try:
        await asyncio.wait_for(m.main(), 2)
    except ExceptionGroup as exc:
        assert any(isinstance(error, RuntimeError) for error in exc.exceptions)
    else:
        raise AssertionError("模型故障未传播")

    m = modules["16"]
    assert await m.main() == list(range(12))
    for sequence, deadline in [(1, 1), (0, -1)]:
        queue = asyncio.Queue()
        await queue.put({"sequence": sequence, "deadline": asyncio.get_running_loop().time() + deadline})
        try:
            await m.uploader(queue, [])
        except (ValueError, TimeoutError):
            pass
        else:
            raise AssertionError("序号或截止时间未拒绝")
asyncio.run(async_checks())

root = Path("inputs")
root.mkdir()
(root / "a.txt").write_text("hello", encoding="utf-8")
(root / "b.txt").write_text("world", encoding="utf-8")
m = modules["12"]
assert m.run()["processed"] == 2
assert m.run()["skipped"] == 2
(root / "a.txt").write_text("HELLO", encoding="utf-8")
assert m.run() == {"processed": 1, "skipped": 1, "failed": 0}
try:
    m.run(state_path="inputs/state.json")
except ValueError:
    pass
else:
    raise AssertionError("状态自扫描未拒绝")
before = Path("state/batch.json").read_bytes()
replace = m.os.replace
def fail_replace(*args):
    raise OSError("模拟提交中断")
m.os.replace = fail_replace
try:
    m.save_state(Path("state/batch.json"), {"wrong": True})
except OSError:
    pass
assert Path("state/batch.json").read_bytes() == before
m.os.replace = replace

m = modules["13"]
for directory in ["tone-a", "tone-b"]:
    Path(directory).mkdir()
    with wave.open(str(Path(directory) / "tone.wav"), "wb") as audio:
        audio.setnchannels(2)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(struct.pack("<hh", 100, -100) * 800)
first = m.transcode("tone-a/tone.wav")
second = m.transcode("tone-b/tone.wav")
assert first != second
original_bytes = first.read_bytes()
try:
    m.transcode("tone-a/tone.wav")
except FileExistsError:
    pass
else:
    raise AssertionError("重复目标未拒绝")
assert first.read_bytes() == original_bytes
Path("bad.wav").write_text("not-audio")
assert m.run(["bad.wav"], 1)[0][1] == "failed"

m = modules["17"]
assert m.percentile(list(range(1, 101)), 95) == 95
assert m.percentile([7], 99) == 7
one, four = m.run_case(1), m.run_case(4)
assert one["errors"] == four["errors"] == 3
assert one["error_rate"] == four["error_rate"] == 0.03
assert four["elapsed"] < one["elapsed"]
print(json.dumps({"thread_window": "passed", "pipeline": "50 success + 2 failed",
    "async_cancel_timeout": "passed", "retry_pacing": "passed",
    "checkpoint": "skip, changed input, failed replace passed",
    "ffmpeg": "real local synthetic WAV conversion, duplicate and invalid input passed",
    "batch_failure": "TaskGroup propagated", "realtime": "sequence and expiry passed",
    "benchmark": {"one_worker": one, "four_workers": four}}, ensure_ascii=False))
`;
const checkFile = path.join(temporary, 'checks.py');
fs.writeFileSync(checkFile, checks);
const result = spawnSync(python, [checkFile, JSON.stringify(scripts)], { cwd: temporary, encoding: 'utf8', timeout: 30000 });
if (result.status !== 0) throw new Error(result.stderr + result.stdout);
const output = { python: spawnSync(python, ['--version'], { encoding: 'utf8' }).stdout.trim(), pages: pages.length, blocks, temporary, examples: evidence, behavior: JSON.parse(result.stdout.trim().split('\n').at(-1)), limits: ['未访问真实ASR/TTS服务，未运行模型或GPU，未访问麦克风', 'ffmpeg仅处理本机生成的短合成WAV', '本机并发耗时只验证worker参数生效，不作为容量基准'] };
const directory = '.maintenance/content-audit/evidence/python-concurrency';
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(`${directory}/code-checks.json`, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
