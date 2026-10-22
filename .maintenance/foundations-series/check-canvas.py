"""检查浏览器截图中的实际画布内容与更新差异。"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

evidence = Path(__file__).parent / "evidence"
rectangles = json.loads((evidence / "canvas-rectangles.json").read_text())


def crop(name, rect):
    screenshot = Image.open(evidence / name).convert("RGB")
    x, y, width, height = (round(rect[k]) for k in ("x", "y", "width", "height"))
    assert 0 <= x < x + width <= screenshot.width
    assert 0 <= y < y + height <= screenshot.height
    return np.asarray(screenshot.crop((x, y, x + width, y + height))).astype(float)


before = crop("canvas-mobile-before.jpg", rectangles["mobileBefore"])
after = crop("canvas-mobile-after.jpg", rectangles["mobileAfter"])
desktop = crop("landscape-desktop-final.jpg", {
    "x": 384, "y": 303.140625, "width": 688, "height": 443.8671875,
})
report = {}
for name, pixels in [("mobileBefore", before), ("mobileAfter", after), ("desktop", desktop)]:
    background = pixels[0, 0]
    content = np.max(np.abs(pixels - background), axis=2) > 25
    ratio = float(content.mean())
    assert ratio > .03, f"{name}: 画布内容不足"
    report[name] = {"content_ratio": ratio, "rgb_stddev": pixels.std(axis=(0, 1)).tolist()}
assert before.shape == after.shape
change_ratio = float((np.max(np.abs(after - before), axis=2) > 25).mean())
assert change_ratio > .001, "更新前后画布未出现足够变化"
report["mobile_changed_ratio"] = change_ratio
report["scope"] = "JPEG 截图局部像素检查；数值与控件行为另行验证，不作为帧率或真实手机性能证明。"
(evidence / "canvas-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report, ensure_ascii=False))
