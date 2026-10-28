// Figures for 21-evaluation.md (eval-*) and 22-engineering.md (eng-*).
// Run: node .maintenance/model-training/diagrams-eng.mjs
import { svg, box, cell, edge, text, label, write } from './svg-kit.mjs';

// 21: offline -> online release gates, failures fall to one "go back" bar.
function releaseGate() {
  const W = 1370, H = 560, y = 130, h = 200, w = 172, gap = 18, x0 = 32;
  const xs = [0, 1, 2, 3, 4, 5, 6].map(i => x0 + i * (w + gap));
  const steps = [
    ['门 1', '冒烟检查', ['几十条固定问题', '模板、格式、停止', '几分钟出结果'], 'node'],
    ['门 2', '业务评测集', ['按切片统计', '政策题、无答案题', '对抗题、条款编号', '和上一版逐题配对'], 'blue'],
    ['门 3', '回归套件', ['通用能力基准', '安全与越权', '拒答率、回答长度', '只许在容差内波动'], 'blue'],
    ['门 4', '评委与抽检', ['LLM 评委换序两次', '按评分细则打分', '人工复核分歧题'], 'violet'],
    ['门 5', '影子评估', ['复制真实请求', '新旧版本同时跑', '只返回旧版答案', '比较差异与延迟'], 'amber'],
    ['门 6', '小流量 A/B', ['5% 员工用新版', '看采纳率、追问率', '看投诉与转人工', '预先定好停止条件'], 'amber'],
    ['通过', '发布登记', ['注册表记录证据', '保留旧版可回滚', '继续监控漂移'], 'green'],
  ];
  let body = '';
  // Bracket labels over the offline and online groups.
  const bracket = (a, b, s) => {
    const x1 = xs[a], x2 = xs[b] + w;
    return `<path d="M${x1} ${y - 8}V${y - 18}H${x2}V${y - 8}" class="line"/>` + label(x1 + 12, y - 12, s);
  };
  body += bracket(0, 3, '离线：模型没见过的固定题目');
  body += bracket(4, 5, '在线：真实请求');
  steps.forEach(([k, t, lines, cls], i) => {
    body += box(`gate-${i + 1}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 6) body += edge(`M${xs[i] + w + 1} ${y + h / 2}H${xs[i + 1] - 3}`);
  });
  const by = 410, bh = 116;
  for (let i = 0; i < 6; i++) body += edge(`M${xs[i] + w / 2} ${y + h + 2}V${by - 4}`, 'dash');
  body += box('go-back', x0, by, xs[6] + w - x0, bh, 'red', '任一关不过：退回，不带着问题往下走', [
    '先看失败样本落在哪个切片，再决定补数据、改训练配方，还是放弃这次训练、保留旧版。',
    '为调参反复看过的题目转入回归集；最终结论用另外留出、从没看过的冻结测试集重新测一遍。',
  ]);
  return svg('eval-release-gate', W, H,
    '资料助手新模型从离线评估到在线发布的六道门',
    '候选模型依次经过冒烟检查、业务评测集、回归套件、LLM 评委与人工抽检四道离线门，再经过影子评估和小流量 A/B 两道在线门，全部通过才登记发布；任何一道不过都退回，按失败切片补数据或改配方。',
    '新版资料助手怎样一步步证明“更好且没变坏”',
    '越靠前越便宜、越快；越靠后越接近真实用户，代价也越高，所以便宜的门先挡住明显问题',
    body);
}

// 21: 95% confidence half-width vs. number of questions, accuracy around 80%.
function sampleSize() {
  const W = 1180, H = 790;
  const ns = [100, 200, 500, 1000, 2000];
  const p = 0.8, disc = 0.10, z = 1.96;
  const single = n => z * Math.sqrt(p * (1 - p) / n) * 100;
  const indep = n => z * Math.sqrt(2 * p * (1 - p) / n) * 100;
  const paired = n => z * Math.sqrt((disc - 0.0009) / n) * 100;
  const series = [
    ['单个版本的准确率', single, 'fblue'],
    ['两版之差：各用一套题', indep, 'famber'],
    ['两版之差：同一套题逐题配对', paired, 'fgreen'],
  ];
  const x0 = 220, scale = 66, top = 186, bh = 22, rowGap = 4, groupGap = 30;
  let body = '';
  // Legend
  series.forEach(([name, , cls], i) => {
    const lx = 32 + i * 330;
    body += `<rect x="${lx}" y="100" width="18" height="18" rx="3" class="${cls}"/>` + text(lx + 28, 115, name);
  });
  const groupH = series.length * (bh + rowGap) + groupGap;
  const bottom = top + ns.length * groupH - groupGap + 10;
  // Grid lines every 2 points
  for (let v = 0; v <= 12; v += 2) {
    const gx = x0 + v * scale;
    body += `<path d="M${gx} ${top - 10}V${bottom}" class="line"/>` + text(gx, bottom + 24, `±${v}`, 'xs', 'middle');
  }
  body += text(x0 + 6 * scale, bottom + 50, '95% 置信区间的半宽（百分点），准确率按 80% 计算', 'xs', 'middle');
  // Bars first, then the 3-point line over them, then value labels on top of the line.
  let labels = '';
  ns.forEach((n, g) => {
    const gy = top + g * groupH;
    body += text(32, gy + 45, `${n} 道题`, 't');
    series.forEach(([, f, cls], i) => {
      const v = f(n), by = gy + i * (bh + rowGap);
      body += `<rect x="${x0}" y="${by}" width="${v * scale}" height="${bh}" rx="3" class="${cls}"/>`;
      labels += label(x0 + v * scale + 12, by + 17, `±${v.toFixed(1)}`, 56);
    });
  });
  const tx = x0 + 3 * scale;
  body += `<path d="M${tx} ${top - 24}V${bottom}" stroke="#e11d48" stroke-width="2.5" stroke-dasharray="6 5" fill="none"/>`;
  body += label(tx + 10, top - 26, '想分辨的差距：3 个百分点', 200) + labels;
  return svg('eval-sample-size', W, H,
    '评测题数与 95% 置信区间半宽',
    '准确率约 80% 时，100 到 2000 道题对应的置信区间半宽：单版准确率、两版各用一套题的差、同一套题配对比较的差；配对比较在约 500 题时区间半宽降到 3 个百分点以内，独立比较需要约 1400 题。',
    '要多少道题，才看得清 3 个百分点的提升',
    '条形越过红色虚线，说明噪声比想看的差距还大；同一套题逐题配对比较，噪声小得多',
    body);
}

// 22: from data snapshot to registry, with the checkpoint / resume loop under the training job.
function pipeline() {
  const W = 1340, H = 724, y = 150, h = 180, w = 190, gap = 26, x0 = 32;
  const xs = [0, 1, 2, 3, 4, 5].map(i => x0 + i * (w + gap));
  const steps = [
    ['输入 1', '数据快照', ['版本号与哈希', '来源与许可证', '已清洗个人信息', '按条款分组切分'], 'node'],
    ['输入 2', '配置与代码', ['一个配置文件', '代码提交号', '随机种子', '镜像与依赖版本'], 'node'],
    ['运行', '训练作业', ['单卡或多机多卡', '每 N 步保存检查点', '每 M 步跑小评测', '曲线实时上报'], 'blue'],
    ['门禁', '离线评估', ['业务评测集', '通用与安全回归', '第 21 篇的门'], 'violet'],
    ['登记', '模型注册表', ['权重与适配器', '证据：数据、配置、', '评估报告链接', '状态：候选/生产'], 'green'],
    ['交付', '部署', ['推理引擎加载', '影子与小流量', '可回滚到上一版'], 'amber'],
  ];
  let body = '';
  steps.forEach(([k, t, lines, cls], i) => {
    body += box(`step-${i + 1}`, xs[i], y, w, h, cls, t, lines, k);
    if (i < 5) body += edge(`M${xs[i] + w + 1} ${y + h / 2}H${xs[i + 1] - 3}`);
  });
  // Gate failure goes back to config / data: new experiment.
  const ay = y - 26;
  body += edge(`M${xs[3] + w / 2} ${y - 2}V${ay}H${xs[1] + w / 2}V${y - 4}`, 'dash');
  body += label(xs[1] + w / 2 + 30, ay - 8, '不过：改数据或配置，开一个新实验', 270);
  // Checkpoint store under the training job.
  const cy = 420, ch = 168, cx = xs[2] - 70, cw = 330;
  body += box('ckpt', cx, cy, cw, ch, 'gray', '检查点存储', [
    '权重（或 LoRA 适配器）', '优化器状态、学习率调度器', '各进程随机数状态', '数据读到第几步、全局 step',
  ], '共享存储，保留最近几份');
  const tx = xs[2] + 50, rx = xs[2] + w - 50;
  body += edge(`M${tx} ${y + h + 2}V${cy - 4}`);
  body += label(tx - 124, y + h + 46, '每 N 步保存', 106);
  body += edge(`M${rx} ${cy - 2}V${y + h + 4}`, 'dash');
  body += label(rx + 12, y + h + 46, '从最近一份完整检查点恢复', 210);
  // Failure source.
  const fx = xs[4] - 10, fw = 300;
  body += box('fail', fx, cy + 10, fw, 148, 'red', '节点故障或被抢占', [
    '作业中断，进度停在最近一次保存', '调度器重新拉起作业', '先校验检查点完整，再恢复',
  ], '中断');
  body += edge(`M${fx - 2} ${cy + 84}H${cx + cw + 4}`, 'dash');
  // Tracking bar.
  body += box('track', x0, 604, xs[5] + w - x0, 96, 'node', '实验追踪', [
    '每次运行记录配置、代码提交、数据版本、种子、曲线、评估结果和检查点路径；注册表里的每个版本都能追回到这里。',
  ]);
  return svg('eng-pipeline', W, H,
    '从数据快照到模型注册表的训练流水线与断点续训回路',
    '数据快照和配置代码输入训练作业，训练作业定期把权重、优化器、调度器、随机数和数据位置写入检查点存储；节点故障后作业从最近一份完整检查点恢复。训练产出经过离线评估门禁，通过后登记到模型注册表再交付部署，不通过则改数据或配置开新实验。实验追踪贯穿全程。',
    '一次可复现、可续训的训练从哪里来、到哪里去',
    '上排是正常流程；下排是检查点回路：中断只损失最近一次保存之后的进度',
    body);
}

// 22: framework layers, from hardware to one-stop tools.
function frameworkLayers() {
  const W = 1300, H = 640, x0 = 32, lw = 210, cx0 = x0 + lw + 16, cw = W - 32 - cx0, rh = 54, rg = 14, top = 104;
  const rows = [
    ['一站式微调', '改配置文件就能跑', ['LLaMA-Factory', 'ms-swift', 'Axolotl', 'Unsloth'], 'famber'],
    ['强化学习编排', '采样与训练交替', ['verl', 'OpenRLHF', 'TRL 的 GRPO 训练器'], 'fviolet'],
    ['任务与模型库', '模型定义和训练器', ['Transformers', 'PEFT', 'TRL', 'diffusers', 'sentence-transformers'], 'fblue'],
    ['语音工具包', '识别与合成配方', ['ESPnet', 'WeNet', 'FunASR', 'NeMo Speech'], 'fgreen'],
    ['分布式与加速', '把模型和状态切到多卡', ['FSDP2', 'DeepSpeed ZeRO', 'Megatron-Core', 'Accelerate'], 'fgray'],
    ['深度学习框架', '张量、求导、编译', ['PyTorch：自动求导、torch.compile、分布式检查点'], 'fgray'],
    ['硬件与通信', '算子和集合通信', ['GPU 与驱动、CUDA 或 ROCm、NCCL 通信库'], 'fgray'],
  ];
  let body = '';
  rows.forEach(([name, sub, items, cls], r) => {
    const ry = top + r * (rh + rg);
    body += text(x0, ry + 24, name, 't') + text(x0, ry + 46, sub, 'xs');
    const iw = (cw - (items.length - 1) * 10) / items.length;
    items.forEach((it, i) => { body += cell(cx0 + i * (iw + 10), ry, iw, rh, cls, it, 'm'); });
  });
  const by = top + rows.length * (rh + rg) + 18;
  body += text(x0, by, '越往上，现成配方越多、改动越少；越往下，可控性越强，也要自己处理更多细节。上层工具大多建在下层之上，出问题时要往下查。', 's');
  return svg('eng-framework-layers', W, H,
    '训练框架分层图',
    '自下而上：硬件与通信、PyTorch、分布式与加速（FSDP2、DeepSpeed、Megatron-Core、Accelerate）、语音工具包、任务与模型库（Transformers、PEFT、TRL、diffusers、sentence-transformers）、强化学习编排（verl、OpenRLHF）、一站式微调工具（LLaMA-Factory、ms-swift、Axolotl、Unsloth）。',
    '训练框架的分层：每一层替你做了什么',
    '同一行的项目处在同一层，各管一类任务；不同行之间是“上层调用下层”的关系',
    body);
}

write({
  'eval-release-gate': releaseGate(),
  'eval-sample-size': sampleSize(),
  'eng-pipeline': pipeline(),
  'eng-framework-layers': frameworkLayers(),
});
