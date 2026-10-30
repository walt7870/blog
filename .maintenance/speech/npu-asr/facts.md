# 端侧 NPU 加速子系列（声学与语音 15—19）事实清单

来源：一次端侧 ASR 模型压缩与 NPU 适配的工作会话（2026-10-28 至 2026-10-30，以 2026-10-30 为快照，会话当时仍在进行）。本文件只服务写作与复核，不对外发布。

脱敏规则：去掉公司、项目、产品、内部仓库、域名、IP、设备序列号与 UDID、账号、签名口令、内部路径与业务音频。设备只写公开芯片系列与系统版本。保留技术因果与数字。

## 一、被测对象

| 项 | 事实 | 正文怎么写 |
| --- | --- | --- |
| 模型 | 流式 zipformer2 transducer，encoder / decoder / joiner 三件；`decode_chunk_len=64`、输入 `x=[N,77,80]`、117 路输入 117 路输出（1 路音频 + 116 路 `cached_*` 状态） | 原样写，不写模型内部代号 |
| 一拍 | 64 帧 = 640 ms 音频 | 原样 |
| encoder 规模 | 去量化 FP32 ONNX 617,234,820 B、10891 节点；固定形状并常量折叠后 3766 节点 | 原样 |
| 设备 A | 麒麟 8020 的鸿蒙手机，HarmonyOS 6.0.2.130，API 22；NNRt 枚举出 `NPU_ohos.boot.hardware.kirin8020_v2_0` 与 `HIAI_F` | 写「一台搭载麒麟 8020 的鸿蒙手机（HarmonyOS 6.0.2，API 22）」，不写机型代号与序列号 |
| 设备 B | 第二台鸿蒙手机，API 23，仅用于 GPU 结论交叉确认 | 写「另一台鸿蒙手机（API 23）」 |
| 对照模型 | 说话人编码器，90 节点、10 秒窗，FP16 10.7 MB | 写「同一颗 NPU 上的另一个模型：一个说话人编码器」 |

## 二、两条通路

| 通路 | 组成 | 校验方式 | 结果 |
| --- | --- | --- | --- |
| 在线 | MindSpore Lite → NNRt → `NPU_ohos...kirin8020_v2_0` | 设备侧在线能力校验（`dllite_service`，`VerifyNPUCapability`），拒绝时 `NNRt: Authentication failed, input model cannot run by npu`（DLSA 日志 `Authentication failed, fail to authenticate model.`） | encoder 被拒 |
| 离线 | 主机 OMG 编译 `.om` → NNRt → `HIAI_F`（HiAI Foundation） | 主机编译期；设备侧 `HMS_HiAICompatibility_CheckFromFile` 返回 0 = COMPATIBLE | encoder 通过 |

设备侧要点：`libhiai_foundation.so` 必须在进程内保持加载，NNRt 才会枚举出 `HIAI_F`；dlopen 后立刻 dlclose 会让该设备消失。它只在 HMS sysroot，不在 OpenHarmony sysroot，所以用 dlopen 而不是链接。加载 API 在 `neural_network_runtime/neural_network_core.h`（`OH_NNCompilation_ConstructWithOfflineModelFile` / `SetDevice` / `Build` / `OH_NNExecutor_RunSync`），不在 CANN Kit 的单算子头文件里。

把 `.ms` 喂给 `HIAI_F` 在 build 阶段被拒（code −1），不报 `Authentication failed`——在线校验不在这条路上。

## 三、压缩与体量门槛（在线通路实测）

- 单模型体量上限落在 **201–268 MB** 之间，且作用在**反量化后**的字节数。
- 决定性对照：FP32 640 MB 权重量化后文件 169 MB（低于 201 MB 线）仍 FAIL，且为**慢拒 4272 ms**；而明显超限的 FP32 是**秒拒 185 ms**。两种拒绝的耗时量级不同，说明不是同一道门。
- 只有 FP16 有效：336 MB FP32 → 168 MB FP16 即 PASS。
- `WEIGHT_QUANT` 权重量化被运行时反量化，等于没压。
- `FULL_QUANT` 产出的 `QuantDTypeCast` 不被识别：`Unrecognized node type 113`。

## 四、离线通路的压缩（OMG + DOPT）

- 工具链：CANN Kit DDK `tools-next-6.1.1.0`（2026-10-28 取得，264,363,620 B，SHA256 `87d7e3f1…6f87e5`），含 `tools_omg`、`tools_dopt`、`tools_ascendc`。平台插件只有 kirin9020/x90/9030，**没有** kirin8020；用默认 `--target=om`（硬件无关）就不需要插件。
- OMG 在 macOS 上经 docker `--platform linux/amd64`（ubuntu:22.04）可跑。
- `--mode=3` 预检：total=3766 pass=3766 fail=0。
- FP32 `.om` 614,205,325 B。`--weight_data_type=FP16` **无效**，FP32 与 FP16 两次产物字节数完全相同。OMG 默认已把 MatMul 权重存 FP16（`.om` 恰为 FP32 的一半），所以这个开关没有额外空间。
- DOPT `Quant_INT8-8`（权重 AbsMax、激活 EmaMinMax，纯 CPU 无训练量化）→ INT8 `.om` **157,611,404 B（150.3 MiB，压缩 3.90×）**。32 组校准 389 s。
- DOPT 环境：Python 3.10 + onnx 1.14.1 + onnxruntime 1.15.1 + **protobuf 3.20.3**（官方文档写 3.20.0，与 onnx 的 `>=3.20.2` 冲突，交集是 3.20.3）+ cv2 + tqdm（后两者文档未列）。Docker VM 需 ≥16 GB（8 GB 在第 1 组校准即 OOM）。
- 校准 bin 需 20 字节头；**样本数体现为首维 × N**，前置一个 N 维会让 DOPT 用 `bin_shape[0]/model_shape[0]` 反推出 0 组，报 `Too few input data!`。我一度误判为样本数门槛（N=32→208 仍报错），已撤回。
- DOPT 要求输入形状全静态（joiner 的动态 batch 直接报 `[0,512]`）。

真机准入（设备 A，INT8 `.om`）：`HMS_HiAICompatibility_CheckFromFile` = 0，117 路输入输出全对上，build 3.67 s，无体量拒绝、无 `Authentication failed`。

## 五、算子适配

| 对象 | 设备拒收的算子 | 等价重写 | 验证 |
| --- | --- | --- | --- |
| decoder | `Squeeze`（HiAI 适配层：`squeeze op input output size invalid`）；int64 的 `Clip(min=0)`+`GreaterOrEqual` 掩码 | `Squeeze` → `Reshape(1,512)`；掩码 → 零填充表的 `Gather(y+1)` 走 int32（上游用 −1 占位，掩码不能直接删） | ORT 2506 组输入逐位一致；NPU 0.69 ms vs CPU 2.87 ms |
| encoder（转换期） | `Add` 不收 INT64（`Input[0] DataType INT64 is wrong`） | `processed_lens`、`new_processed_lens`、一个值为 32 的常量由 INT64 改 INT32 | 改完 OMG 通过 |
| encoder（算子集） | `GatherElements` ×19、`LessOrEqual` ×1 | `LessOrEqual` → `Greater`+`Not`；`GatherElements` 按 axis 展开 | 重写 20 个节点；batch=16 版本 117 路输出在 ORT 上最大绝对偏差 9.59e-4（最差输出 `new_cached_conv2_18`） |

反例：我的 INT64→INT32 改写漏了一处 `/Expand_output_0`，ORT 报 `Greater` 类型不符，**而 OMG 却接受并产出了 `.om`**。教训：转换成功不等于图类型自洽，必须有独立的宿主侧等价性验证。

另一条反例：原 decoder 的 `.ms` 在 CPU 上数值就是错的（偏差 25%–364%，由转换器的 `clip_convert_activation_pass` 造成），所以上一轮复测对 decoder 的结论是在一张坏图上得出的。

## 六、时延实测（设备 A，全零输入，只测时延）

背靠背 20 次：

| | 加载/编译 | min | 中位 | 均值 | p95 |
| --- | --- | --- | --- | --- | --- |
| CPU（ORT INT8，4 线程） | 4392 ms | 61.94 | **64.52** | 66.76 | 90.97 |
| NPU（`HIAI_F`，INT8 `.om`） | 3671 ms | 110.38 | **143.58** | 141.21 | 148.68 |

NPU 慢 2.23×；加载 NPU 快 1.20×。样本由 5 增至 20 时 NPU 中位由 124.7 劣化到 143.6，CPU 稳定 —— 所以 5 次采样不够。

按 640 ms 定速（10 分钟 937 拍）：

| | 中位 | 均值 | p95 | 超时 | 占空比 |
| --- | --- | --- | --- | --- | --- |
| CPU | 69.06 | 77.67 | 101.30 | 0/937 | 11% |
| NPU | 146.91 | 146.28 | 152.85 | 0/937 | 23% |

结论：NPU 跟得上实时，只是每拍更慢。

定速与背靠背不可混比：背靠背 CPU 64.5，定速 CPU 69.1/90.8（不同轮次），因为 CPU 在背靠背下缓存更热。

## 七、功耗实测（设备 A）

条件：**拔掉 USB、电池供电**（`plug=0 charge=0`），控制走无线调试；屏幕常亮；系统 NORMAL 模式；每档按 640 ms 一拍连续 10 分钟（937 拍），两档处理的音频量完全相同；全零输入；应用内采样器读电池电压 × 电流，1 Hz。空载基线用同一 app、同一节拍跑一个 100 节点的极小模型（占空比 0.29%）。

| | 整机功耗 | 推理净增 | 95% CI | 每拍能耗 | 每拍耗时 | 超时 |
| --- | --- | --- | --- | --- | --- | --- |
| 空载 | 1.21 W | — | — | — | — | — |
| NPU | 1.31 W | **+98 mW** | ±22 mW | **63 mJ** | 147 ms | 0/937 |
| CPU | 1.52 W | **+311 mW** | ±42 mW | **199 mJ** | 69 ms | 0/937 |

p90 峰值：NPU 1.43 W，CPU 2.10 W。NPU 每拍能耗省约 69%，整机功耗低约 14%（屏幕摊薄）。

口径：

- 必须用**均值**。1 Hz 采样大多落在 CPU 两次突发之间的空闲期，按中位数算 CPU 净功耗只有 +80 mW，看起来比 NPU 还低，这是采样假象。三种口径（全段均值、去前 60 s、去两头 10%）排序一致。
- **插线测不出功耗**：同样两档插线时读数为 NPU −631 mW、CPU −627 mW，几乎相同；`plug=2` 时电池电流被充电回路钳住、与负载脱钩。早先两组插线数据（CPU 790 / NPU 781 mW）作废。
- **温升区分不出**：每段只升约 1 °C（26→28、28→29、29→30 °C），起点被上一段抬高，电池温度传感器太慢。
- 局限：每档只跑一次且顺序固定（CPU 段最后、最热，对 CPU 略不利）；CPU 档实际走 MLAS（见第十节），修好 XNNPACK 后约降 24%，**估算**仍是 NPU 的约 2.4 倍；只测 encoder；整机功耗含屏幕。

被撤回的功耗数字（反例，正文作为教训写，不作为结论）：

- 「合成模型测得 NPU 净功耗 −38%、单次能量 19.4 → 15.0 mJ、温升 +4.0 → +2.0 °C」——溯源不到可信采样，且与仓库内两份记录「从未直接测到瓦数」矛盾，已撤回。
- 「每次推理温升低 37%」——过度精确，已主动收回。
- 一处代码 bug：对毫瓦取绝对值，把充电电流当成消耗，复测出现 2675 mW 假值。

## 八、内存归因

- 鸿蒙商用系统上 `/proc/<pid>/smaps` 和 `smaps_rollup` 对调试 shell 返回 `Operation not permitted`（SELinux）。可用的是 `hidumper --mem <pid>`（分类汇总）与 `--mem-smaps`（逐映射），由系统服务侧读取，单次约 530 ms，1 秒间隔可行；`/proc/<pid>/status` 的 `VmRSS` 世界可读，可作交叉校验。
- 带说话人分离的 NPU 档峰值：VmRSS 580.2 MB、Pss 518.2 MB，拆分为 `.hap` 169.3（文件页，可回收）+ native heap 134.7 + **Graph 55.3（NPU 图内存）** + ArkTS 20.2 + `.so` 15.7。
- 分离净增 Pss 约 145 MB，与 55 MB 模型相符，无重复加载、无缓存泄漏。
- 前提性错误（已撤回）：早先文档把 181 MB → 611.8 MB 的 +428 MB 全归给说话人分离；实测纯转写活跃识别即 502 MB，且 611.8 是外部采的 `VmRSS`，含约 170 MB 可回收模型文件页与测试壳的 ArkTS 堆。
- 把 encoder 切成两段 FP16 放上 NPU 的方案（节点 2050 切开，两段 145/148 MiB，跨段仅 7–9 张量约 60 KB）会让内存从 162 MB（INT8）涨到 293 MB（FP16），**+131 MB**，所以没有采用。

## 九、为什么没有变快：被标尺否掉的五个假说

用合成 `.om` 在真机 `HIAI_F` 上逐项实测，得到可复用的常数：

| 量 | 实测 | 怎么测的 |
| --- | --- | --- |
| 每节点地板价 | 0.0024 ms | 100/400/800/1600 节点的 Abs/Add 链，min 值线性，斜率 0.00236、截距 0.178 ms；`.om` 体积严格 1:4:8:16，证明 OMG 没折叠链条 |
| 真实形状下每节点 | 0.0035 ms | 把链条张量换成 encoder 主流形状 `(8,1,512)` |
| 每张量绑定 | 0.003 ms | 117 进/117 出 vs 8 进/8 出、同体积，只差 0.32 ms |
| 权重读带宽 | 23.9 GB/s | 单 MatMul 扫 8.39 / 33.6 / 81.9 MB，斜率 0.0418 ms/MB |
| 形状敏感度 | 5.6× | 同为 64 KB/张量、200 节点：2D `[1,16384]` 4.956 ms vs 4D `[1,64,16,16]` 0.890 ms |
| 宽度扫描 | w64 0.62 / w1024 0.92 / w16384 4.96 ms | 200 节点固定，大张量下有效带宽约 5 GB/s；w64 与节点扫描外推的 0.65 ms 自洽 |
| batch 扩展收益 | 16 倍数据只花 2.44 倍时间 | 200 节点链从 `(8,1,512)` 到 `(8,16,512)`，单位数据成本 −6.6× |

据此 144 ms 的归因：节点地板价 3766 × 0.0035 = 13.2 ms、权重 157 MB = 6.6 ms、234 路张量绑定 = 2.4 ms，合计约 22–25 ms（约 17%），**余下约 83% 是真实算术**。

被证伪、不得再引用的说法：

1. ❌ 每节点过路费 F ≈ 0.037 ms、96% 的时间是开销 —— 实测小 15 倍。
2. ❌ 砍节点到 1605 就能打平 CPU —— 折掉 600 节点只值 1.4 ms。
3. ❌ 把 99 处 softplus 展开回折成 `Softplus` 是必要铺垫 —— 数学等价但只值约 1.4 ms。
4. ❌ 每张量绑定上界 0.25 ms × 234 = 58 ms —— 松了 20 倍。
5. ❌ I/O 只有 63 MB/s 所以排除带宽 —— 推理错误（漏算 157 MB 权重与 121 MB 激活），结论侥幸成立、依据无效。

真因：encoder 81% 的节点（3063/3766）是 rank-3 且形状为 `(T=8, batch=1, D)`。达芬奇 cube 是 16×16×16，`8×1` 的瓦片只填 1/32。这不是算子选得不好，是流式档的张量本身填不满计算单元。

算子构成（3766 节点，供判断「可削的搬运有多少」）：Add 777、MatMul 420、Slice 381、Sub 364、Mul 302、Reshape 278、Transpose 250、Concat 120、Max/Abs/Neg/Exp/Log 各 99、Conv 82、Where 57、Expand 43、Pow 40、Sigmoid 38、Unsqueeze 34、ReduceMean 20、Gather/Softmax/Tanh 各 19、ReduceSum 6、Greater/Not 各 1。其中 Concat 120 里 115 贴着 cache、Slice 381 里 153 贴着 cache、Transpose 250 里 0 贴着 cache（全是层内注意力转置）。

另外两条操作性结论：OMG 自己会消除冗余 Transpose（往返 Transpose 链的 `.om` 反而更小更快），所以不要手动动那 250 个 Transpose；搬运合计只占 6%，单独减搬运没有空间。

对照：同一颗 NPU 上的说话人编码器 90 节点、10 秒窗，CPU 307.7 ms → NPU 27.7 ms（11.1×）。差别在于它每个节点带的数据量远大于 encoder 的流式小张量。

## 十、batch=16（快照时点未完成）

动机：填满 batch 是唯一实测有效、且同时压掉搬运（权重每 N 拍读一次）与计算的杠杆。

- 一次被更正的说法：「batch 维是符号维，不需要改图」不准确。上游 ONNX 的 117 路输入输出 batch 维确实是符号维 `N`（`x=[N,77,80]`、`cached_key_0=[256,N,128]`、`cached_nonlin_attn_0=[1,N,256,192]`），但固定形状时做过常量折叠（10891 → 3766 节点），把 batch=1 烧进了 278 个 `Reshape` 的 shape 常量、38 个 `Expand` 和一份 `[1,32]` 掩码常量，而且 batch 槽不总在 index 0（有 `[32,1,1,-1]`）。手工回改在 `/Concat_4`、`/Concat_16` 连续撞形状冲突。
- 正确做法：回到带符号维的上游 FP32 图，用重写脚本自带的 `--batch 16` 重跑整条链。已跑通：3766 节点、零残留不支持算子、117 路输出 ORT 校验最大偏差 9.59e-4。
- 校准集：16 路**错开起点**的真实流并行递推（不是一路复制 16 份，否则会低估激活范围），117 个 bin、16 样本 × batch16、1130.5 MB。DOPT 量化 157.9 s。
- OMG 产出 `encoder_int8_b16.om` 166,697,763 B。
- 真机 **FAIL**：`compatibility=1`、stage=build、code=1；hilog：`CheckSupported: the op name [/MatMul_26] type [BatchMatMul] is not supported in npucl store [fe_lib]`、`Node /MatMul_1 type BatchMatMul don't support!` → `check ir model compatibility failed` → `BuildModelByHcl failed`。
- 隔离实验（合成 `.om` 真机准入）：
  - `mm_b1_t8` / `mm_b1_t32` / `mm_b4_t8` 全 PASS（中位 0.25 / 0.28 / 0.28 ms）→ 不是「任何 batch>1 都不行」。
  - rank-4 等 batch BatchMatMul `bmm_r3_b4` / `bmm_r3_b64` / `bmm_r4_4x16` / `bmm_r4_4x1` FP32 全 PASS（0.23 / 1.15 / 1.22 / 0.27 ms），包括被报不支持的那个形状 `[4,16,32,32]×[4,16,32,288]`。
  - batch 维广播形态 `bc_b1_match` / `bc_b16_bcast` / `bc_b16_tiled` FP32 全 PASS（0.26 / 0.34 / 0.87 ms）。
  - 决定性验证：同一个广播 BatchMatMul，FP32 PASS（compat=0），**INT8 量化后 FAIL**（`BatchMatMul is not supported in npucl store [elementary_lib]/[fe_lib]`）。
- 结论：这颗 NPU 没有量化版 BatchMatMul 的 kernel。batch=1 时报错的 19 个节点降解成普通 `MatMul`（有 INT8 kernel），batch>1 就变 `BatchMatMul`，没有 INT8 实现。那 19 个都是 rank-4 权重的注意力 MatMul（4 种形态，形如 `[H,16,T,4] × [H,1,4,N]`），权重合计只有 0.1 MB（而 325 个 rank-2 权重合计 608.5 MB），所以把它们排除出量化几乎不花体量。
- **这条补救（混合精度：19 个节点留 FP32、其余 INT8）在快照时点只写好了 DOPT 跳层配置，没有跑完、没有真机结果。正文必须写成未验证的待办，不能写成结论。**
- 同样属于**推测**、不得写成结论的：按合成链的缩放外推，吞吐档每拍可能降到约 22 ms、能耗约 10 mJ 量级。代价是 batch=16 要先缓冲 10.2 秒音频，不适合交互式。

## 十一、GPU 与 CPU 后端的两条平台级事实

GPU：

- MindSpore Lite 在 context 校验阶段就否（1.17 ms 返回）：`[mindspore/lite/src/litert/inner_context.cc:191] IsValid# GPU is not supported.`，系统自带的 MindSpore Lite 编译时未启用 GPU/OpenCL 后端，应用侧没有开关。
- 旁证：系统参数只有 `EGL / GLES2 / GLES3 / WebGL`，没有 OpenCL 能力位。GPU 只对渲染开放。
- 设备 A、设备 B 两台一致。
- 其余 GPU 通路：ORT CUDA/ROCm/TensorRT 非本平台；ORT NNAPI 不存在于 OpenHarmony；ORT OpenCL EP 官方已移除；手写 GLES3/Vulkan compute shader 理论可行但 3766 节点量级工作量按月计，且 FP16/INT8 支持残缺。

CPU 后端（一个被长期误记为正常的缺陷）：

- 端侧 `libonnxruntime.so`（SHA256 `f9fd9080…5fcc2b`，12,930,856 B）与上游预编译的 ONNX Runtime 1.16.3 **同一个 SHA**；`xnn_` 符号 0 个、`pthreadpool` 0 个，只有 provider 名字串 —— 里面没有 XNNPACK。
- 代码无条件 `AppendExecutionProvider("XNNPACK")`，在这个 `.so` 上抛 `Ort::Exception`，导致说话人分离加载即崩；三档全中、与机型无关。源码本身是对的，坏的是构建输入：构建脚本里的 `["CPU","XNNPACK"]` 是硬编码字面量、从不校验，编译步骤从未成功过，而进度记录把它记成「功能正常」。
- MLAS 比 XNNPACK 贵 24%（3.31 vs 2.68 CPU-s/s）。所以上面功耗表里的 CPU 档是 MLAS 的数字。
- 一度说成「仓库 HEAD 在非麒麟机型不可用」，方向错了，已更正：这一行三档全中，只是因为说话人分离默认 `auto`、麒麟上走 NPU，CPU 档实际只服务非麒麟机型。

## 十二、环境与工具坑（写进正文的「怎么测」部分）

- 商用系统上调试 shell 不能执行任何非系统 ELF（即便自签、即便经 `ld-musl` 加载），所以所有设备侧探针必须做成应用内的能力，不能推一个可执行文件上去跑。
- 往应用沙箱推文件要用调试工具的 `-b <bundle>` 形式，直接写应用数据目录会被权限拒绝。
- 定速必须按绝对时间边界打拍（`loop_started + pace × (i+1)`），不能用「跑完睡一会」，否则误差累计；同时记录超时拍数，这是实时能力的判据。
- 自动化门禁：功耗脚本在 `plug != 0` 时直接 abort，不产出废数据。
- 调试证书有效期约 14 天，设备 UDID 要在描述文件里。
- 打开 IDE 会改动锁文件与构建配置，跑真机前要有一次「前置检查」把这些还原。

## 十三、刻意不写进正文的内容

| 内容 | 原因 |
| --- | --- |
| 公司、项目、产品、SDK、客户名；内部仓库路径、桶名、域名、IP；设备序列号与 UDID；签名口令与许可证私钥 | 脱敏 |
| 端侧识别准确率（普通识别 840 条、机主 340 条、说话人分离 360 条的 CER / DER / cpCER）与测试集名称 | 业务验收数据；且参考文本在快照时点已随临时目录被系统清理而无法复算，口径也由另一方统一 |
| SDK 的崩溃条目、错误码、接口默认值、热词池规模 | 属产品实现细节与客户交付信息 |
| 混合精度（19 个 BatchMatMul 留 FP32）的效果 | 快照时点未跑完，无真机结果 |
| 吞吐档 22 ms / 10 mJ | 由合成链外推，未在真模型上验证，正文只作为「待验证的方向」提及且标注 |
| 「拆 encoder 两段」的时延收益 | 只算了体量与内存，没有时延实测 |
| 具体工具链下载链接 | 易变，且与账号/渠道相关 |

## 十四、版本与日期

| 对象 | 版本 | 日期 |
| --- | --- | --- |
| 在线通路转换器 `converter_lite` | 2.7.0 | 会话期间在用 |
| CANN Kit DDK | tools-next 6.1.1.0 | 2026-10-28 取得 |
| 设备系统 | HarmonyOS 6.0.2.130，API 22（设备 A）／API 23（设备 B） | 2026-10-28—30 |
| 端侧 ONNX Runtime | 1.16.3 | 同上 |
| DOPT 运行环境 | Python 3.10、onnx 1.14.1、onnxruntime 1.15.1、protobuf 3.20.3 | 同上 |
| 快照 | 会话仍在进行 | 2026-10-30 |

## 十五、图示

由 `.maintenance/speech/npu-asr/diagrams-npu-asr.mjs` 生成，输出到 `public/acoustics/`：

| 文件 | 回答的问题 | 用在 |
| --- | --- | --- |
| `npu-asr-two-paths.svg` | 两条端侧 NPU 通路的数据流与各自的拒绝点 | 15 |
| `npu-asr-size-gate.svg` | 压缩手段与体量门槛：哪一级过线、哪一级被反量化 | 16 |
| `npu-asr-convert-pipeline.svg` | 从上游 ONNX 到设备可加载模型的转换流水线与三道验证关卡 | 17 |
| `npu-asr-measure-protocol.svg` | 时延与功耗的测量协议：定速、三段对照、无效读数门禁 | 18 |
| `npu-asr-why-slower.svg` | 用合成标尺做的归因：假说、实测与真因 | 19 |

检查：`node .maintenance/llm-architecture/check-svg.mjs public/acoustics <png 目录> npu-asr`，再看 PNG。不要手改 SVG。
