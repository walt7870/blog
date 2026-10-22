#!/usr/bin/env python3
"""抽检镜头、字幕时序、音视频时长，并生成关键帧联系表。"""
import json
from pathlib import Path
import re
import subprocess
import hashlib
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageStat

root = Path(__file__).resolve().parents[2]
work = Path(__file__).parent
evidence = work / "evidence"
evidence.mkdir(exist_ok=True)
video = root / "public/ai/foundations/video/gradient-learning-rate.mp4"
manifest = json.loads((work / "video/manifest.json").read_text())
probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)]))
v, a = [s for s in probe["streams"] if s["codec_type"] == "video"][0], [s for s in probe["streams"] if s["codec_type"] == "audio"][0]
assert (v["width"], v["height"], v["codec_name"]) == (1280, 720, "h264")
assert a["codec_name"] == "aac"
assert abs(float(v["duration"]) - float(a["duration"])) < .15
def seconds(value):
    h, m, s = value.split(":")
    return int(h)*3600 + int(m)*60 + float(s)
vtt = (root / "public/ai/foundations/video/gradient-learning-rate.vtt").read_text()
timings = re.findall(r"([\d:.]+) --> ([\d:.]+)", vtt)
previous = 0
for start, end in timings:
    begin, finish = seconds(start), seconds(end)
    assert previous <= begin < finish <= manifest["duration"]
    previous = finish
canvas = Image.new("RGB", (1280, len(manifest['scenes'])*360), "white")
frames = []
for i, scene in enumerate(manifest["scenes"]):
    t = scene["start"] + (scene["end"] - scene["start"]) * .8
    target = evidence / f"video-{i+1:02}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1", str(target)], check=True)
    image = Image.open(target).convert("RGB")
    assert sum(ImageStat.Stat(image).stddev) > 20, scene["kind"]
    canvas.paste(image.resize((640, 360)), (0, i*360))
    # 对照 B 站画内字幕版同一时间点。
    upload = work / "video/exports/07-gradient-learning-rate-bilibili.mp4"
    target2 = evidence / f"bilibili-{i+1:02}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(upload), "-frames:v", "1", str(target2)], check=True)
    canvas.paste(Image.open(target2).resize((640, 360)), (640, i*360))
    frames.append({"scene": scene["kind"], "time": t})
canvas.save(evidence / "video-contact.jpg", quality=90)
report = {"duration": manifest["duration"], "video_duration": v["duration"], "audio_duration": a["duration"], "captions": len(timings), "frames": frames, "audio_note": "另用FFmpeg测得非静音且无采样峰值削波；不代替逐句审听", "web": {"width": v["width"], "height": v["height"], "fps": v["avg_frame_rate"]}}
upload_probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(upload)]))
uv, ua = [next(s for s in upload_probe['streams'] if s['codec_type'] == kind) for kind in ['video', 'audio']]
assert (uv['width'], uv['height'], uv['avg_frame_rate'], uv['codec_name']) == (1920, 1080, '25/1', 'h264')
assert abs(float(uv['duration']) - float(ua['duration'])) < .15
assert abs(float(uv['duration']) - manifest['duration']) < .15
upload_manifest = json.loads((work / 'video/bilibili-manifest.json').read_text())
for path, record in [(video, manifest), (upload, upload_manifest)]:
    assert record['sha256'] == hashlib.sha256(path.read_bytes()).hexdigest()
    assert record['bytes'] == path.stat().st_size
report['bilibili'] = {'width': uv['width'], 'height': uv['height'], 'fps': uv['avg_frame_rate'], 'bytes': upload.stat().st_size}
report['voice'] = manifest['voice']
if manifest['voice']['engine'] == 'Emilia2-tts':
    voice_root = (work / 'video' / manifest['source_manifest']).parent
    voice = json.loads((voice_root / 'manifest.json').read_text())
    story = json.loads((work / 'video/storyboard.json').read_text())
    expected = [line for scene in story['scenes'] for line in scene['cues']]
    assert [cue['text'] for cue in voice['cues']] == expected
    clips = []
    for index, cue in enumerate(voice['cues']):
        path = voice_root / cue['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == cue['sha256']
        with wave.open(str(path)) as wav:
            assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, 24000)
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(float) / 32768
        peak = float(np.abs(samples).max())
        active = float((np.abs(samples) > .01).mean())
        clipped = float((np.abs(samples) > .999).mean())
        assert peak > .02 and active > .2 and clipped < .001, index+1
        clips.append({'cue': index+1, 'seconds': len(samples)/24000,
                      'peak': peak, 'active_ratio': active, 'clipped_ratio': clipped})
    report['source_clips'] = clips
    assert len(clips) == len(expected)
    assert len(timings) == manifest['caption_count']
    assert ''.join(re.sub(r'\s+', '', block.split('\n', 1)[1]) for block in re.findall(r'[\d:.]+ --> [\d:.]+\n[^\n]+', vtt)) == re.sub(r'\s+', '', ''.join(expected))
(evidence / "media-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
