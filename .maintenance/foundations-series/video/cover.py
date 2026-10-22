#!/usr/bin/env python3
"""生成第07集投稿封面；坐标与曲线为教学公式。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).parent / "exports"
out.mkdir(exist_ok=True)
image = Image.new("RGB", (1280, 720), "#f3f8f8")
d = ImageDraw.Draw(image)
font = lambda size: ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", size)
def text(x, y, value, size, color="#263d45"):
    d.text((x, y), value, font=font(size), fill=color)

text(54, 32, "AI 基础原理", 30, "#287356")
text(54, 90, "梯度与学习率", 88)
text(58, 210, "从预测偏差到一次参数更新", 38, "#526a74")
text(1030, 40, "07", 118, "#287356")
x = lambda w: 90 + w / 5.5 * 1080
y = lambda loss: 620 - loss / 21 * 300
d.line((90, 300, 90, 620, 1190, 620), fill="#8fa7ae", width=3)
pts = [(x(i/100), y(2*(i/100-2)**2)) for i in range(521)]
d.line(pts, fill="#287356", width=6)
for w, color in [(1, "#286f9b"), (1.4, "#287356"), (5, "#bc4655")]:
    px, py = x(w), y(2*(w-2)**2)
    d.ellipse((px-10, py-10, px+10, py+10), fill=color)
text(145, 350, "η = 0.1", 35, "#287356")
text(145, 402, "损失 2 → 0.72", 32, "#287356")
text(700, 315, "η = 1", 35, "#bc4655")
text(700, 367, "损失 2 → 18", 32, "#bc4655")
text(55, 270, "L", 28)
text(1190, 630, "w", 28)
text(56, 662, "为什么平方 · 怎样选步长 · 三维曲面", 28, "#526a74")
image.save(out / "07-gradient-cover.png", optimize=True)
print(out / "07-gradient-cover.png")
