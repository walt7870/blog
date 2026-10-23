import importlib.util
import math
from pathlib import Path
import struct

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "precision_numbers", root / "public/ai/precision/labs/precision_numbers.py"
)
numbers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(numbers)

assert format(struct.unpack(">H", struct.pack(">e", 1.25))[0], "016b") == "0011110100000000"
assert numbers.fp32(1.0351) == 1.035099983215332
assert numbers.fp16(1.0351) == 1.03515625
assert numbers.bf16(1.0351) == 1.03125
assert numbers.fp32(numbers.bf16(1.0351)) == 1.03125
assert numbers.fp16(2**-24) == 2**-24
assert numbers.fp16(1e-8) == 0
# Compare adjacent encodings where FP16 is subnormal and BF16 is normal.
half_code = struct.unpack(">H", struct.pack(">e", 1e-7))[0]
half_value = lambda bits: struct.unpack(">e", struct.pack(">H", bits))[0]
bf_code = struct.unpack(">I", struct.pack(">f", numbers.bf16(1e-7)))[0] >> 16
bf_value = lambda bits: struct.unpack(">f", struct.pack(">I", bits << 16))[0]
assert half_value(half_code + 1) - half_value(half_code) == 2**-24
assert bf_value(bf_code + 1) - bf_value(bf_code) == 2**-31
assert numbers.fp16(65504) == 65504
assert (2 - 2**-10) * 2**15 == 65504
assert numbers.bf16(0.5001) == 0.5
assert numbers.fp16(1024 + 0.25) == 1024
low, high = 1024.0, 1024.0
for _ in range(8):
    low = numbers.fp16(low + 0.25)
    high = numbers.fp32(high + 0.25)
assert (low, numbers.fp16(high)) == (1024, 1026)

# Enumerate E4M3FN codes independently of the Canvas spacing formula.
fp8 = []
for code in range(127):
    exponent, fraction = divmod(code, 8)
    value = fraction * 2**-9 if exponent == 0 else (1 + fraction / 8) * 2**(exponent - 7)
    fp8.append((code, value))
assert max(value for _, value in fp8) == 448
nearest = lambda target: min(fp8, key=lambda item: (abs(item[1] - target), item[0] % 2))[1]
assert nearest(1.0625) == 1
assert nearest(1.1) == 1.125
for limit, expected in [(2, 2/7), (20, 0)]:
    restored = round(0.3 / (limit / 7)) * limit / 7
    assert math.isclose(restored, expected, abs_tol=1e-12)
numbers.main()
print("编码、舍入、下溢、累加、FP8 枚举与 INT4 缩放核对通过")
