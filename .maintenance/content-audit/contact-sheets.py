import argparse
from pathlib import Path
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument("directory", type=Path)
parser.add_argument("pattern")
parser.add_argument("prefix")
parser.add_argument("--columns", type=int, default=2)
parser.add_argument("--rows", type=int, default=2)
parser.add_argument("--width", type=int, default=640)
parser.add_argument("--height", type=int, default=1900)
parser.add_argument("--crop-width", type=int)
args = parser.parse_args()
files = sorted(args.directory.glob(args.pattern))
count = args.columns * args.rows
for batch in range(0, len(files), count):
    items = []
    for file in files[batch:batch + count]:
        image = Image.open(file).convert("RGB")
        if args.crop_width:
            image = image.crop((0, 0, args.crop_width, image.height))
        image.thumbnail((args.width, args.height))
        items.append((file.name, image))
    row_height = max(image.height for _, image in items) + 32
    sheet = Image.new("RGB", (args.width * args.columns, row_height * args.rows), "#dce2de")
    pen = ImageDraw.Draw(sheet)
    for number, (name, image) in enumerate(items):
        x = (number % args.columns) * args.width
        y = (number // args.columns) * row_height
        pen.text((x + 8, y + 6), name, fill="black")
        sheet.paste(image, (x, y + 28))
    target = args.directory / f"{args.prefix}-{batch // count:02d}.png"
    sheet.save(target)
    print(target)
