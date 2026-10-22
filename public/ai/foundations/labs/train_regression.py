#!/usr/bin/env python3
"""标准库教学实验：两参数回归、有限差分检查与独立重载。"""
import argparse
import json
import math
from pathlib import Path

SAMPLES = [(1.0, 3.0), (2.0, 5.0), (3.0, 7.0)]


def evaluate(w, b, data):
    if not data or not all(math.isfinite(v) for pair in data for v in pair):
        raise ValueError("样本必须非空且有限")
    if not math.isfinite(w) or not math.isfinite(b):
        raise ValueError("参数必须有限")
    residuals = [(w * x + b - y, x) for x, y in data]
    n = len(data)
    return (sum(r * r / 2 for r, _ in residuals) / n,
            sum(r * x for r, x in residuals) / n,
            sum(r for r, _ in residuals) / n)


def check_gradient(data):
    w, b, eps = 0.7, -0.3, 1e-5
    _, dw, db = evaluate(w, b, data)
    numeric_w = (evaluate(w + eps, b, data)[0] - evaluate(w - eps, b, data)[0]) / (2 * eps)
    numeric_b = (evaluate(w, b + eps, data)[0] - evaluate(w, b - eps, data)[0]) / (2 * eps)
    if not math.isclose(dw, numeric_w, abs_tol=1e-7) or not math.isclose(db, numeric_b, abs_tol=1e-7):
        raise AssertionError("解析梯度与有限差分不一致")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lr", type=float, default=0.1)
    parser.add_argument("--steps", type=int, default=40)
    parser.add_argument("--output", type=Path, default=Path("run.json"))
    parser.add_argument("--single", action="store_true", help="单样本手算：x=2,y=4,w=1,b固定为0")
    parser.add_argument("--load", type=Path, help="独立加载已保存模型，只执行预测")
    parser.add_argument("--weight", type=float, default=2.5, help="待预测重量，单位千克")
    args = parser.parse_args()
    if not math.isfinite(args.weight) or args.weight <= 0:
        parser.error("重量必须是有限正数")
    if args.load:
        saved = json.loads(args.load.read_text(encoding="utf-8"))
        if saved.get("schema") != "foundations-regression-v1":
            parser.error("不支持的模型版本")
        w, b = saved["model"]["w"], saved["model"]["b"]
        evaluate(w, b, SAMPLES)
        print(json.dumps({"weight_kg": args.weight, "predicted_yuan": w * args.weight + b}, ensure_ascii=False))
        return
    if not math.isfinite(args.lr) or args.lr <= 0 or not 1 <= args.steps <= 10000:
        parser.error("学习率必须为有限正数，步数范围为1至10000")
    data = [(2.0, 4.0)] if args.single else SAMPLES
    check_gradient(data)
    w, b = (1.0, 0.0) if args.single else (0.0, 0.0)
    rows = []
    stop = "completed"
    for step in range(args.steps + 1):
        loss, dw, db = evaluate(w, b, data)
        rows.append({"step": step, "w": w, "b": b, "loss": loss, "dw": dw, "db": db})
        if step == args.steps:
            break
        next_w = w - args.lr * dw
        next_b = b if args.single else b - args.lr * db
        if not all(math.isfinite(v) and abs(v) < 1e6 for v in [next_w, next_b]):
            stop = "parameter_limit"
            break
        w, b = next_w, next_b
    result = {"schema": "foundations-regression-v1", "data_kind": "synthetic_teaching",
              "samples": [{"x": x, "y": y} for x, y in data],
              "config": {"lr": args.lr, "steps": args.steps, "single": args.single},
              "model": {"w": rows[-1]["w"], "b": rows[-1]["b"]},
              "stop": stop, "rows": rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"initial_loss": rows[0]["loss"], "final_loss": rows[-1]["loss"],
                      "steps": rows[-1]["step"], "stop": stop, "output": str(args.output)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
