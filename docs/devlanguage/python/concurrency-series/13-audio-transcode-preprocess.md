# 批量语音转码与预处理：用 ffmpeg 有界命令池，把输入先标准化

> 对应视频：EP13《批量语音转码与预处理》  
> 视频入口：[B站 EP13](https://www.bilibili.com/video/BV1Ruu76aEW7)。
> 对应合集：[Python 并发实战：从基础模型到语音工程](https://space.bilibili.com/181407346/lists/8787437?type=season)。

![ffmpeg 有界命令池转码流程图](/python/concurrency/ep13-ffmpeg-command-pool.svg)

这张图把 ffmpeg 转码放进有界命令池：先统一音频规格，再把退出码、stderr 和输出校验纳入状态表。

## 这篇解决什么问题

音频预处理既是质量步骤，也是并发边界。输入标准化以后，ASR 阶段才更容易稳定；命令池受限以后，CPU、磁盘和进程数才不会失控。

## ffmpeg 模板

按模型合同设置采样率、声道和编码；保留returncode和stderr。下方代码需本机安装ffmpeg，只转换格式，不自动调响度。

## 排查链路

看 returncode、stderr、duration、输出大小、CPU、磁盘等待和临时目录大小。

## 输入规格与输出发布

采样率和声道必须服从模型合同，16kHz单声道只是本例目标。立体声直接混为单声道可能丢失分轨说话人，盲目响度归一化也可能改变阈值或引入削波；需要分轨的输入应保留声道，响度处理另做评估。本例没有加入响度滤镜。

下方用源文件绝对路径的摘要区分同名文件，临时输出放在结果目录里，超时则subprocess.run结束并回收直接子进程。退出码为0后再用wave检查PCM16、单声道、16kHz和非空帧，最终用os.link排他发布，已有目标时报错，不覆盖。目标文件系统需支持硬链接；修改原输入后需用新结果目录或明确版本，不能把旧文件当缓存命中。

## 实战检查清单

- 模型需要的采样率、编码、声道与分轨语义是否确认。
- 同名输入是否映射到不同结果，重复发布是否拒绝覆盖。
- 命令是否有超时、退出码与stderr，临时目录是否清理。
- 输出是否校验实际WAV参数与非空帧，而非只看文件扩展名。

## 运行示例

示例保存为`examples/ep13/ffmpeg_command_pool.py`；目录和文件名由本地自行创建。

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import sha256
from itertools import islice
from pathlib import Path
import subprocess
import os
import tempfile
import wave

def transcode(src, dst_dir="normalized"):
    src = Path(src).resolve(strict=True)
    target_dir = Path(dst_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    key = sha256(str(src).encode("utf-8")).hexdigest()[:16]
    dst = target_dir / f"{src.stem}-{key}.wav"
    if dst.exists():
        raise FileExistsError(dst)
    with tempfile.TemporaryDirectory(dir=target_dir) as work:
        temporary = Path(work) / "audio.wav"
        command = ["ffmpeg", "-nostdin", "-v", "error", "-n", "-i", str(src),
                   "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
                   str(temporary)]
        proc = subprocess.run(command, capture_output=True, text=True,
                              errors="replace", timeout=120)
        if proc.returncode:
            raise RuntimeError(proc.stderr[-1000:])
        with wave.open(str(temporary), "rb") as audio:
            if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
                raise ValueError("输出格式不符")
            if audio.getnframes() == 0:
                raise ValueError("输出为空")
        os.link(temporary, dst)
    return dst

def run(paths, workers=3):
    if workers < 1:
        raise ValueError("workers必须大于0")
    paths = iter(paths)
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        while batch := list(islice(paths, workers * 2)):
            futures = {pool.submit(transcode, path): path for path in batch}
            for future in as_completed(futures):
                try:
                    results.append((str(futures[future]), "done", str(future.result())))
                except Exception as exc:
                    results.append((str(futures[future]), "failed", repr(exc)))
    return results
```

