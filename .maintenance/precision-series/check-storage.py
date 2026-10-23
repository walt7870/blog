"""Use standard-library encodings and explicit boundary cases to verify figures."""
import json
import struct
from pathlib import Path

formats = json.loads((Path(__file__).parent / "storage-samples.json").read_text())
by_id = {item["id"]: item for item in formats}
code = lambda item: "".join(field["code"] for field in item["fields"] if field["bits"])
for name, pack in [("fp64", ">d"), ("fp32", ">f"), ("fp16", ">e")]:
    encoded = "".join(f"{byte:08b}" for byte in struct.pack(pack, 1.25))
    assert code(by_id[name]) == encoded, name
assert code(by_id["bf16"]) == code(by_id["fp32"])[:16]

# Explicit format-specific expectations also catch accidental bias changes.
expected = {
    "fp8-e4m3fn": "00111010", "fp8-e5m2": "00111101",
    "fp8-e4m3fnuz": "01000010", "fp8-e5m2fnuz": "01000001",
    "fp6-e2m3": "001010", "fp6-e3m2": "001101", "fp4-e2m1": "0011",
}
for name, bits in expected.items():
    assert code(by_id[name]) == bits, name
for width in [4, 8, 16, 32, 64]:
    bits = code(by_id[f"int{width}"])
    assert len(bits) == width
    assert int(bits, 2) - 2**width == -5
for width, number in [(4, 11), (8, 251)]:
    assert int(code(by_id[f"uint{width}"]), 2) == number

# Boundary encodings are evaluated separately from the rendering definitions.
assert (1 + 6/8) * 2**(15-7) == 448
assert (1 + 3/4) * 2**(30-15) == 57344
assert (1 + 7/8) * 2**(15-8) == 240
assert (1 + 3/4) * 2**(31-16) == 57344
assert (1 + 7/8) * 2**(3-1) == 7.5
assert (1 + 3/4) * 2**(7-3) == 28
fp4 = [0, .5, 1, 1.5, 2, 3, 4, 6]
assert min(enumerate(fp4), key=lambda pair: (abs(pair[1] - 1.25), pair[0] % 2))[1] == 1
assert int(code(by_id["e8m0"]), 2) == 128
assert 2**(128-127) == 2
assert int(code(by_id["int4-packing"]), 2) == ((3 << 4) | (-5 & 15)) == 0x3b
for name, total in [("mxfp8", 264), ("mxfp6", 200), ("mxfp4", 136),
                    ("nvfp4", 72), ("gguf-q4-0", 144), ("gguf-q4-k", 1152)]:
    item = by_id[name]
    assert sum(part["bits"] for part in item["fields"]) == item["total"] == total
assert 136 / 32 == 4.25
assert 72 / 16 == 144 / 32 == 1152 / 256 == 4.5
assert len(by_id) == 28
print("28 种图解：标准库浮点编码、整数补码、低位边界、打包与块空间核对通过")
