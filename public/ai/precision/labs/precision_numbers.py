"""Run with Python 3.10+; uses only the standard library."""

import struct


def fp32(value):
    return struct.unpack(">f", struct.pack(">f", value))[0]


def fp16(value):
    return struct.unpack(">e", struct.pack(">e", value))[0]


def bf16(value):
    bits = struct.unpack(">I", struct.pack(">f", value))[0]
    bits = (bits + 0x7FFF + ((bits >> 16) & 1)) & 0xFFFF0000
    return struct.unpack(">f", struct.pack(">I", bits))[0]


def main():
    value = 1.0351
    print(f"FP32: {fp32(value)}")
    print(f"FP16: {fp16(value)}")
    print(f"BF16: {bf16(value)}")
    print(f"BF16 -> FP32: {fp32(bf16(value))}")

    low, high = 1024.0, 1024.0
    for _ in range(8):
        low = fp16(low + 0.25)
        high = fp32(high + 0.25)
    print(f"FP16 each step: {low}")
    print(f"FP32 sum -> FP16: {fp16(high)}")


if __name__ == "__main__":
    main()
