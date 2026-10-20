import argparse
import json
from pathlib import Path

import torch
from torch import nn


FEATURES = ["x1", "x2"]


def checked_inputs(values):
    x = torch.as_tensor(values, dtype=torch.float32, device="cpu")
    if x.ndim != 2 or x.shape[1] != len(FEATURES) or x.shape[0] == 0:
        raise ValueError("输入必须是非空的 [N,2] 数组")
    if not torch.isfinite(x).all():
        raise ValueError("输入包含 NaN 或无穷大")
    return x


def predict(model, values):
    x = checked_inputs(values)
    model.eval()
    with torch.inference_mode():
        return torch.sigmoid(model(x))


def run(checkpoint):
    torch.manual_seed(7)
    torch.set_num_threads(1)
    model = nn.Linear(2, 1).cpu()
    # 两组网格没有相同坐标，仅用于验证计算链路，不模拟真实业务分布。
    train_x = checked_inputs([[a, b] for a in [-2, -1, 1, 2]
                              for b in [-2, -1, 1, 2]])
    valid_x = checked_inputs([[a, b] for a in [-1.5, -0.5, 0.5, 1.5]
                              for b in [-1.5, -0.5, 0.5, 1.5]])
    train_y = (train_x[:, :1] + 0.5 * train_x[:, 1:] > 0).float()
    valid_y = (valid_x[:, :1] + 0.5 * valid_x[:, 1:] > 0).float()
    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
    initial_loss = criterion(model(train_x), train_y).item()

    model.train()
    for _ in range(300):
        optimizer.zero_grad(set_to_none=True)
        logits = model(train_x)
        loss = criterion(logits, train_y)
        if not torch.isfinite(loss):
            raise RuntimeError("损失出现非有限值")
        loss.backward()
        if any(p.grad is None or not torch.isfinite(p.grad).all()
               for p in model.parameters()):
            raise RuntimeError("梯度缺失或出现非有限值")
        optimizer.step()

    model.eval()
    with torch.inference_mode():
        final_loss = criterion(model(train_x), train_y).item()
    assert final_loss < initial_loss * 0.5, "训练损失未明显下降"
    before = predict(model, valid_x)
    accuracy = ((before >= 0.5) == valid_y.bool()).float().mean().item()

    checkpoint.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "features": FEATURES,
                "threshold": 0.5, "schema_version": 1}, checkpoint)
    saved = torch.load(checkpoint, map_location="cpu", weights_only=True)
    if saved["features"] != FEATURES or saved["schema_version"] != 1:
        raise ValueError("输入合同不兼容")
    restored = nn.Linear(2, 1).cpu()
    restored.load_state_dict(saved["state_dict"], strict=True)
    after = predict(restored, valid_x)
    torch.testing.assert_close(before, after, rtol=0, atol=0)

    for bad in [[[1, 2, 3]], [[float("nan"), 1]], []]:
        try:
            predict(restored, bad)
        except ValueError:
            pass
        else:
            raise AssertionError("非法输入未被拒绝")

    print(json.dumps({"torch": torch.__version__, "device": "cpu",
                      "train_samples": len(train_x), "valid_samples": len(valid_x),
                      "initial_loss": round(initial_loss, 6),
                      "final_loss": round(final_loss, 6),
                      "valid_accuracy": accuracy,
                      "reload_identical": True, "invalid_inputs_rejected": 3},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=Path, default=Path("tiny-classifier.pt"))
    run(parser.parse_args().checkpoint)
