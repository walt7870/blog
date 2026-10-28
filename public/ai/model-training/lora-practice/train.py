"""在 Qwen2.5-0.5B-Instruct 上训练 LoRA 适配器，只对回答部分计算损失。"""
import time, torch
from datasets import load_dataset
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

data = load_dataset("json", data_files="train.jsonl", split="train")
peft_config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules="all-linear", task_type="CAUSAL_LM")
args = SFTConfig(
    output_dir="out", num_train_epochs=3, per_device_train_batch_size=4, gradient_accumulation_steps=1,
    learning_rate=2e-4, lr_scheduler_type="cosine", warmup_steps=3, logging_steps=5,
    max_length=1024, save_strategy="no", report_to=[], seed=42,
)
trainer = SFTTrainer(model="Qwen/Qwen2.5-0.5B-Instruct", args=args, train_dataset=data, peft_config=peft_config)
trainer.model.print_trainable_parameters()
t0 = time.time()
trainer.train()
print(f"train seconds {time.time() - t0:.0f}")
trainer.save_model("adapter")
