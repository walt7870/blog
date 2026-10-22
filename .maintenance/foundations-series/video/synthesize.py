"""使用已登录的官方测试客户端生成逐句旁白，支持断点续做。"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import time
import wave

source = Path(__file__).parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--client", type=Path, required=True)
parser.add_argument("--voice", default="噜噜")
parser.add_argument("--output", type=Path, default=source / "voice-source.local")
args = parser.parse_args()
client = runpy.run_path(str(args.client))
if client["BASE"] != "https://test-playground.amphion.top":
    raise ValueError("客户端目标与本次指定的测试站点不符")
opener, _ = client["session"]()
with client["call"](opener, "/tts-sso/voices") as response:
    voices = json.load(response)["voices"]
matches = [item for item in voices if item["name"] == args.voice]
if len(matches) != 1:
    raise ValueError("需有且仅有一个同名的已保存音色")
voice_id = matches[0]["id"]
story = json.loads((source / "storyboard.json").read_text())
lines = [line for scene in story["scenes"] for line in scene["cues"]]
work = args.output
work.mkdir(exist_ok=True)
manifest_path = work / "manifest.json"
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
    "engine": "Emilia2-tts", "voice": args.voice, "mode": "xvector_only",
    "source": client["BASE"] + "/tts-demo/", "cues": [],
}
if manifest["voice"] != args.voice or manifest["mode"] != "xvector_only":
    raise ValueError("已有缓存的音色或复刻模式不匹配")
started = time.monotonic()
for index, line in enumerate(lines):
    name = f"cue-{index+1:02}.wav"
    path = work / name
    cached = index < len(manifest["cues"])
    if cached and manifest["cues"][index]["text"] != line:
        raise ValueError(f"第 {index+1} 句稿件与缓存不一致")
    if not cached:
        payload = {
            "model": "emilia2", "input": line, "voice": voice_id,
            "language": "Chinese", "x_vector_only_mode": True,
            "response_format": "wav", "stream": False, "max_new_tokens": 512,
        }
        with client["call"](opener, "/tts-sso/speech", payload) as response:
            audio = response.read()
        if not audio.startswith(b"RIFF"):
            raise ValueError("服务未返回 WAV")
        path.write_bytes(audio)
    with wave.open(str(path)) as wav:
        if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, 24000):
            raise ValueError(f"第 {index+1} 句音频格式不符")
        duration = wav.getnframes() / wav.getframerate()
    if not 1 < duration < 35:
        raise ValueError(f"第 {index+1} 句时长异常，需复核后再继续")
    record = {"text": line, "path": name, "duration": duration,
              "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    if cached:
        manifest["cues"][index] = record
    else:
        manifest["cues"].append(record)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"completed": index+1, "total": len(lines), "cached": cached,
                      "audio_seconds": round(duration, 2),
                      "elapsed_seconds": round(time.monotonic()-started, 1)}, ensure_ascii=False), flush=True)
