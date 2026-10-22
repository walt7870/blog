#!/usr/bin/env python3
"""本地讲解样片：逐句旁白定时，数值驱动画面，FFmpeg 输出 H.264。"""
import argparse
import functools
import hashlib
import json
import math
import re
from pathlib import Path
import subprocess
import time

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path(__file__).parent
WORK = SOURCE / "generated"
OUT = ROOT / "public/ai/foundations/video"
STORY = json.loads((SOURCE / "storyboard.json").read_text())
PUBLISH = argparse.ArgumentParser()
PUBLISH.add_argument('--bilibili', action='store_true', help='输出带画内字幕的B站投稿样片，保留独立SRT')
PUBLISH.add_argument('--audio-manifest', type=Path, help='使用已生成的逐句音源清单，不调用合成服务')
OPTIONS = PUBLISH.parse_args()
WORK = WORK / ('bilibili' if OPTIONS.bilibili else 'web')
if OPTIONS.audio_manifest is None and STORY.get('engine') == 'external-wav':
    OPTIONS.audio_manifest = SOURCE / 'voice-source-20261022.local/manifest.json'
EXTERNAL = json.loads(OPTIONS.audio_manifest.read_text()) if OPTIONS.audio_manifest else None
RUN = json.loads((ROOT / "public/ai/foundations/labs/gradient-run.json").read_text())
W, H, FPS = 1280, 720, 12
SCALE = 1.5 if OPTIONS.bilibili else 1
FPS = 25 if OPTIONS.bilibili else 12
SIZE = (round(W * SCALE), round(H * SCALE))
FONT = "/Library/Fonts/Arial Unicode.ttf"
BG, INK, MUTED = "#f6f9fa", "#23373b", "#52686f"
BLUE, GREEN, RED, GOLD = "#286f9b", "#287658", "#bc4655", "#ad7116"
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]))


@functools.lru_cache(None)
def font(size):
    return ImageFont.truetype(FONT, round(size * SCALE))


class ScaledDraw:
    """在逻辑坐标排版，在最终分辨率直接绘制文字与几何图形。"""
    def __init__(self, image):
        self.native = ImageDraw.Draw(image)

    def points(self, points):
        if isinstance(points[0], (tuple, list)):
            return [(round(x*SCALE), round(y*SCALE)) for x, y in points]
        return tuple(round(v*SCALE) for v in points)

    def text(self, xy, value, **kwargs):
        return self.native.text(self.points(xy), value, **kwargs)

    def textbbox(self, xy, value, **kwargs):
        return tuple(v/SCALE for v in self.native.textbbox(self.points(xy), value, **kwargs))

    def line(self, points, width=1, **kwargs):
        return self.native.line(self.points(points), width=round(width*SCALE), **kwargs)

    def ellipse(self, points, **kwargs):
        return self.native.ellipse(self.points(points), **kwargs)

    def rectangle(self, points, **kwargs):
        return self.native.rectangle(self.points(points), **kwargs)


def text(draw, xy, value, size=28, color=INK):
    bounds = draw.textbbox(xy, value, font=font(size))
    if bounds[2] > W - 8 or bounds[3] > H - 8:
        raise ValueError(f'文字越界：{value}')
    draw.text(xy, value, font=font(size), fill=color)


def wrap(value, width=39):
    return [value[i:i + width] for i in range(0, len(value), width)]


def stamp(seconds):
    millis = round(seconds * 1000)
    return f"{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02}.{millis % 1000:03}"


def caption_parts(value):
    parts = re.findall(r'[^，。！？；：]+[，。！？；：]?', value)
    return [chunk for part in parts for chunk in wrap(part, 28)]


def prepare_audio():
    cues, timeline, cursor, files = [], [], 0.0, []
    expected = [line for scene in STORY['scenes'] for line in scene['cues']]
    if EXTERNAL and [cue['text'] for cue in EXTERNAL['cues']] != expected:
        raise ValueError('外部音源与分镜旁白不一致或尚未生成完整')
    for scene_index, scene in enumerate(STORY["scenes"]):
        start = cursor
        for cue_index, line in enumerate(scene["cues"]):
            if EXTERNAL:
                record = EXTERNAL['cues'][len(files)]
                audio = OPTIONS.audio_manifest.parent / record['path']
                digest = hashlib.sha256(audio.read_bytes()).hexdigest()
                if record.get('sha256') != digest:
                    raise ValueError('外部音源摘要不匹配')
                key = digest[:16]
            else:
                key = hashlib.sha256(f'{STORY["voice"]}:{STORY["rate"]}:{line}'.encode()).hexdigest()[:16]
                audio = WORK / f"voice-{key}.aiff"
                if not audio.exists():
                    run(["say", "-v", STORY["voice"], "-r", str(STORY["rate"]), "-o", str(audio), line])
            wav = WORK / f"voice-{key}.wav"
            if not wav.exists():
                run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-af", "apad=pad_dur=0.45", "-ar", "48000", "-ac", "1", str(wav)])
            length = duration(wav)
            parts = caption_parts(line)
            letters = sum(len(part) for part in parts)
            elapsed = 0
            for part in parts:
                begin = cursor + (length-.25)*elapsed/letters
                elapsed += len(part)
                end = cursor + (length-.25)*elapsed/letters
                cues.append({"start": begin, "end": end, "text": part,
                             "scene": scene_index, "cue": cue_index,
                             "source_cue": len(files)})
            files.append(wav)
            cursor += length
        timeline.append({**scene, "start": start, "end": cursor})
        print(f"旁白 {scene_index + 1}/{len(STORY['scenes'])}：{cursor - start:.1f} 秒", flush=True)
    (WORK / "audio-list.txt").write_text("".join(f"file '{p}'\n" for p in files))
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(WORK / "audio-list.txt"), "-c", "copy", str(WORK / "narration.wav")])
    subtitles = "WEBVTT\n\n" + "\n\n".join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n" + "\n".join(wrap(c["text"], 28)) for c in cues) + "\n"
    (OUT / "gradient-learning-rate.vtt").write_text(subtitles)
    srt = "\n\n".join(f"{i+1}\n{stamp(c['start']).replace('.', ',')} --> {stamp(c['end']).replace('.', ',')}\n" + "\n".join(wrap(c["text"], 28)) for i, c in enumerate(cues)) + "\n"
    (SOURCE / "gradient-learning-rate.srt").write_text(srt)
    (OUT / "gradient-chapters.vtt").write_text("WEBVTT\n\n" + "\n\n".join(f"{stamp(s['start'])} --> {stamp(s['end'])}\n{s['title']}" for s in timeline) + "\n")
    transcript = ["# 梯度与学习率：讲解逐字稿", "", "预测错了以后，程序怎样知道该改哪个数，又该改多少？这是 [07. 梯度与学习率](./07-gradient-and-learning-rate.md) 配套视频的旁白全文。从一次乘法开始，先理解怎样给预测评分，再看梯度和学习率如何影响更新。平方和 `0.5` 的更多数值对照见[怎样衡量预测好坏](./06-loss-and-objective.md#why-half-square)。", ""]
    for s in timeline:
        transcript += [f"## {stamp(s['start'])[3:8]} {s['title']}", "", *[line + "\n" for line in s["cues"]]]
    transcript += ["## 继续实验", "", "[交互曲面与一步更新](./07-gradient-and-learning-rate.md) · [训练、保存与独立重载](./08-first-training-loop.md)", ""]
    (ROOT / "docs/ai/foundations/gradient-video-transcript.md").write_text("\n".join(transcript))
    return timeline, cues, cursor


def base(scene):
    image = Image.new("RGB", SIZE, BG)
    d = ScaledDraw(image)
    text(d, (48, 23), "AI 基础原理 / 07", 20, GREEN)
    text(d, (48, 62), scene["title"], 36)
    d.line((48, 120, 1232, 120), fill="#cddbdd", width=1)
    return image


def curve(draw):
    px = lambda w: 88 + w / 5.5 * 700
    py = lambda loss: 538 - loss / 21 * 355
    for level in [0, 5, 10, 15, 20]:
        draw.line((88, py(level), 788, py(level)), fill="#dce5e7", width=1)
        text(draw, (46, py(level) - 14), str(level), 20, MUTED)
    draw.line((88, 160, 88, 538, 802, 538), fill=MUTED, width=2)
    text(draw, (62, 132), "损失 L", 22, MUTED)
    text(draw, (788, 549), "w", 24, MUTED)
    for v in range(6):
        text(draw, (px(v) - 5, 545), str(v), 20, MUTED)
    pts = [(px(w), py(2 * (w - 2) ** 2)) for w in np.linspace(0, 5.2, 300)]
    draw.line(pts, fill=GREEN, width=4)
    return px, py


@functools.lru_cache(42)
def surface(step):
    fig = plt.figure(figsize=(8.6, 4.5), dpi=100*SCALE, facecolor=BG)
    ax = fig.add_subplot(111, projection="3d", computed_zorder=False)
    ax.set_facecolor(BG)
    w, b = np.meshgrid(np.linspace(-1, 4, 65), np.linspace(-2, 4, 65))
    loss = sum(.5 * (w * x + b - y) ** 2 for x, y in [(1, 3), (2, 5), (3, 7)]) / 3
    ax.plot_surface(w, b, loss, cmap="GnBu", alpha=.84, linewidth=0, antialiased=True, zorder=1)
    ax.contour(w, b, loss, levels=[.1, .5, 2, 6, 14, 28], zdir="z", offset=0, colors="#7f989f", linewidths=.8)
    rows = RUN["rows"][:step + 1]
    ax.plot([r["w"] for r in rows], [r["b"] for r in rows], [r["loss"] for r in rows], color=BLUE, linewidth=3, zorder=5)
    r = rows[-1]
    ax.scatter([r["w"]], [r["b"]], [r["loss"]], color=RED, s=70, depthshade=False, zorder=6)
    ax.set(xlim=(-1, 4), ylim=(-2, 4), zlim=(0, 48), xlabel="w", ylabel="b", zlabel="L")
    ax.set_box_aspect((1.25, 1, .7))
    ax.view_init(elev=29, azim=-61)
    ax.tick_params(labelsize=10, colors=MUTED)
    fig.subplots_adjust(left=0, right=.97, top=1, bottom=.02)
    path = WORK / f"surface-{step:02}.png"
    fig.savefig(path, facecolor=BG)
    plt.close(fig)
    return Image.open(path).convert("RGB")


def draw_scene(scene, progress, cue_index):
    im = base(scene)
    d = ScaledDraw(im)
    kind = scene["kind"]
    if kind == "predict":
        for x, heading, value, color in [(60, "输入", "2", BLUE), (475, "参数 w", "1", GREEN), (890, "预测", "2", BLUE)]:
            text(d, (x, 195), heading, 28, color)
            text(d, (x, 245), value, 88, color)
        text(d, (290, 270), "×", 50, MUTED)
        text(d, (725, 270), "=", 50, MUTED)
        text(d, (60, 415), "正确答案 = 4", 38, GOLD)
        text(d, (60, 485), "输入与目标不变，训练修改参数", 30)
        text(d, (890, 415), "只调整一个数", 26, MUTED)
    elif kind == 'residual':
        text(d, (60, 165), '残差 = 预测 − 正确答案', 34)
        text(d, (60, 225), '2 − 4 = −2', 54, BLUE)
        if cue_index >= 1:
            text(d, (60, 330), '少 2                 多 2', 32, MUTED)
            text(d, (60, 387), '(−2) + (+2) = 0', 46, RED)
            text(d, (740, 330), '先平方，再相加', 32, GREEN)
            text(d, (740, 387), '4 + 4 = 8', 46, GREEN)
        text(d, (60, 510), '偏差 2 → 4，平方 4 → 16', 30, GOLD)
    elif kind == 'half':
        text(d, (60, 170), '损失 L = 0.5 × (预测 − 答案)²', 43, GREEN)
        text(d, (60, 240), '代入：0.5 × (−2)² = 2', 38)
        if cue_index >= 1:
            text(d, (60, 340), '所有分数减半，最低点的位置不变', 34)
        if cue_index >= 2:
            text(d, (60, 410), '平方的变化率：2r → 乘 0.5 → r', 32, BLUE)
            text(d, (60, 466), 'r 表示残差；变化率稍后从数值试探', 26, MUTED)
        if cue_index >= 3:
            text(d, (60, 535), '去掉 0.5：梯度 × 2；相同步长需学习率 ÷ 2', 28, GOLD)
    elif kind == 'probe':
        text(d, (60, 160), '固定输入 2、答案 4，只试着改变参数', 28, MUTED)
        for j, (w, prediction, score) in enumerate([('0.99', '1.98', '2.0402'), ('1.00', '2.00', '2.0000'), ('1.01', '2.02', '1.9602')]):
            if j == 2 and cue_index == 0:
                continue
            x = 60 + 400*j
            text(d, (x, 225), f'w = {w}', 38, GREEN if j == 2 else INK)
            text(d, (x, 300), f'预测 {prediction}', 30, MUTED)
            text(d, (x, 350), f'损失 {score}', 30, GREEN if j == 2 else RED if j == 0 else INK)
        if cue_index >= 2:
            text(d, (60, 445), '坡度 ≈ (1.9602 − 2) ÷ (1.01 − 1) = −3.98', 32, BLUE)
        if cue_index >= 3:
            text(d, (60, 520), '试探越来越小 → 变化率趋近 −4 → 导数', 32, GREEN)
    elif kind in ["loss", "gradient", "small", "large"]:
        px, py = curve(d)
        target = 1.4 if kind == "small" else 5
        fraction = min(1, max(0, (progress - .28) / .4)) if kind in ["small", "large"] else 0
        # 中间位置仅是视觉过渡；右侧始终标明两个离散更新端点。
        w = 1 + (target - 1) * fraction
        if kind == "gradient":
            d.line([(px(v), py(2 - 4 * (v - 1))) for v in [.35, 1.75]], fill=BLUE, width=3)
        if fraction:
            d.line([(px(v), py(2 * (v - 2) ** 2)) for v in np.linspace(1, w, 80)], fill=RED, width=5)
        for a, color in [(2, GOLD), (w, RED)]:
            x, y = px(a), py(2 * (a - 2) ** 2)
            d.ellipse((x - 7, y - 7, x + 7, y + 7), fill=color)
        items = {
            "loss": [("参数 → 预测 → 评分", "1 → 2 → 2"), ("预测正好等于答案", "2 → 4 → 0"), ("L 只是损失的简写", "找较低的位置")],
            "gradient": [("当前位置的坡度", "梯度 = −4"), ("残差 × 输入", "(−2) × 2 = −4"), ("两段影响接起来", "参数 → 预测 → 损失")],
            "small": [("学习率 η = 0.1", "w′ = 1 − 0.1 × (−4)"), ("更新后参数", "w′ = 1.4"), ("损失重新计算", "2 → 0.72")],
            "large": [("学习率 η = 1", "w′ = 1 − 1 × (−4)"), ("更新后参数", "w′ = 5"), ("损失重新计算", "2 → 18")]
        }[kind]
        for j, (label, value) in enumerate(items):
            text(d, (852, 177 + j * 122), label, 23, MUTED)
            text(d, (852, 217 + j * 122), value, 23, RED if j == 2 and kind == "large" else INK)
    elif kind == 'average':
        text(d, (60, 158), '预测运费 = w × 重量 + b', 38, GREEN)
        text(d, (60, 220), '起点 w = 0，b = 0；三条预测都是 0', 28, MUTED)
        for j, (x, y) in enumerate([(1, 3), (2, 5), (3, 7)]):
            left = 60+j*400
            text(d, (left, 300), f'{x} 千克 → {y} 元', 32, BLUE)
            if cue_index >= 2:
                text(d, (left, 365), f'残差 −{y}', 30)
                text(d, (left, 420), f'半平方 {y*y/2}', 30, GOLD)
        if cue_index >= 3:
            text(d, (60, 520), '平均损失 = (4.5 + 12.5 + 24.5) ÷ 3 ≈ 13.8333', 30, GREEN)
    elif kind == "surface":
        step = 0 if cue_index < 3 else min(40, round(max(0, progress - .66) / .29 * 40))
        im.paste(surface(step), (0, round(136*SCALE)))
        d = ScaledDraw(im)
        r = RUN["rows"][step]
        text(d, (880, 165), "三条样本 · 同时更新 w,b", 22, MUTED)
        text(d, (880, 215), f"第 {step} 次更新", 30, GREEN)
        for j, line in enumerate([f"w = {r['w']:.4f}", f"b = {r['b']:.4f}", f"L = {r['loss']:.7f}"]):
            text(d, (880, 290 + j * 58), line, 30)
        text(d, (880, 498), "η = 0.1 / 高度线性比例", 20, MUTED)
    elif kind == "loop":
        headings = ["预测", "损失", "梯度", "更新"]
        for j, heading in enumerate(headings):
            x = 60 + 300 * j
            active = j == int(progress * 8) % 4
            d.line((x, 202, x + 220, 202), fill=GREEN if active else "#cddbdd", width=5)
            text(d, (x, 230), f"{j + 1:02}", 24, MUTED)
            text(d, (x, 283), heading, 42, GREEN if active else INK)
            if j < 3:
                text(d, (x + 240, 285), "→", 32, MUTED)
        text(d, (60, 410), "先算完两个梯度，再同时更新参数", 32)
        text(d, (60, 487), "保存 → 新进程重载 → 2.5 千克 ≈ 6.0062 元", 30, BLUE)
    else:
        text(d, (60, 176), "本次已验证", 26, GREEN)
        text(d, (60, 225), "参数更新、损失变化、保存与重载", 37)
        text(d, (60, 331), "真实任务仍需验证", 26, GOLD)
        text(d, (60, 383), "数据边界 → 基线 → 独立评估 → 错误分析", 33)
        text(d, (60, 504), "文章 + 交互实验 + 可下载脚本", 30, BLUE)
    return im


def main():
    start = time.monotonic()
    timeline, cues, length = prepare_audio()
    print(f"开始排画面：{length:.1f}秒，{SIZE}，{FPS}fps", flush=True)
    exports = SOURCE / 'exports'
    exports.mkdir(exist_ok=True)
    path = (exports / '07-gradient-learning-rate-bilibili.mp4') if OPTIONS.bilibili else (OUT / "gradient-learning-rate.mp4")
    # 静态讲解只在内容变化时画新帧；FFmpeg 保持帧率，避免重复绘制数万张画面。
    events = {0.0, length}
    for cue in cues:
        events.update((cue['start'], cue['end']))
    for scene in timeline:
        if scene['kind'] in ['small', 'large', 'surface']:
            low, high, count = (.66, .96, 42) if scene['kind'] == 'surface' else (.28, .69, 26)
            events.update(scene['start']+(scene['end']-scene['start'])*p for p in np.linspace(low, high, count))
    events = sorted(events)
    frames = WORK / ('frames-bilibili' if OPTIONS.bilibili else 'frames-web')
    frames.mkdir(exist_ok=True)
    entries = []
    scene_index = cue_index = 0
    for i, (t, end) in enumerate(zip(events, events[1:])):
        while scene_index < len(timeline) - 1 and t >= timeline[scene_index]["end"]:
            scene_index += 1
        while cue_index < len(cues) - 1 and t >= cues[cue_index + 1]["start"]:
            cue_index += 1
        scene, cue = timeline[scene_index], cues[cue_index]
        progress = (t - scene["start"]) / (scene["end"] - scene["start"])
        im = draw_scene(scene, progress, cue["cue"])
        d = ScaledDraw(im)
        d.rectangle((0, 604, W, H), fill="#e9f0f2")
        text(d, (1130, 23), f"{scene_index + 1:02} / {len(timeline):02}", 20, MUTED)
        if OPTIONS.bilibili and t < cue['end']:
            bbox = d.textbbox((0, 0), cue['text'], font=font(30))
            text(d, ((W-bbox[2])/2, 636), cue['text'], 30)
        if i == 0 and not OPTIONS.bilibili:
            im.save(OUT / "gradient-poster.webp", quality=82, method=6)
        frame = (frames / f'{i:04}.png').resolve()
        im.save(frame, compress_level=1)
        entries.append(f"file '{frame}'\nduration {end-t:.9f}\n")
        if i % 80 == 0:
            print(f"画面 {i}/{len(events)-1}，已耗时{time.monotonic()-start:.1f}秒", flush=True)
    entries.append(f"file '{frame}'\n")
    listing = frames / 'frames.txt'
    listing.write_text(''.join(entries))
    command = ["ffmpeg", "-v", "warning", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-i", str(WORK / "narration.wav"), "-vf", f"fps={FPS}", "-af", "loudnorm=I=-18:TP=-2:LRA=7", "-c:v", "libx264", "-preset", "fast", "-crf", "18" if OPTIONS.bilibili else "34", "-g", str(FPS*(10 if OPTIONS.bilibili else 60)), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k" if OPTIONS.bilibili else "32k", "-ar", "32000", "-ac", "1", "-movflags", "+faststart", "-t", str(length), str(path)]
    print('画面完成，开始 H.264/AAC 编码', flush=True)
    run(command)
    voice = ({k: EXTERNAL[k] for k in ['engine', 'voice', 'mode']} if EXTERNAL else
             {"engine": "macOS say", "voice": STORY['voice'], "rate": STORY['rate']})
    voice['scope'] = '本地教学样片；未投稿'
    manifest = {"schema": "foundations-video-v2", "revision": STORY['revision'], "title": STORY["title"], "resolution": list(SIZE), "fps": FPS, "duration": duration(path), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "voice": voice, "source_manifest": str(OPTIONS.audio_manifest.relative_to(SOURCE)) if OPTIONS.audio_manifest else None, "caption_count": len(cues), "caption_timing": "逐句实长内按短句字数分配，尚未经逐字强制对齐", "elapsed_seconds": round(time.monotonic() - start, 2), "scenes": [{k: s[k] for k in ["kind", "title", "start", "end"]} for s in timeline]}
    (SOURCE / ("bilibili-manifest.json" if OPTIONS.bilibili else "manifest.json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(manifest, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
