# 数值精度系列改造记录

记录日期：2026-10-23。当前已发布，正文版本为 `a0c2ff6`；下文各轮“未提交或部署”为当时的历史状态。

## 发布与线上验收

2026-10-23 北京时间 14:24 部署到 `https://www.niuwancheng.cn/blog/docs/ai/precision/`。中文提交 `a0c2ff6` 包含六篇主线、存储图解、资源及维护脚本；该提交的 Git 远程推送未在本任务执行。

Node.js 24 下从主工作区启动发布构建，使用已提交源码快照、主工作区依赖及线上已有静态资源，构建 19.90 秒。保留 12 个尚未入库的线上资源，排除 4 个未发布的其他专题素材和 1 个 Python 缓存。发布前对比线上 1499 个非哈希文件，没有遗漏；新增 68 项均属于精度专题。没有覆盖其他会话的工作区改动。

发布 ZIP 为 32259324 字节，SHA256 为 `6eb43f83e9ef9511c5e07069d6f0b42a46c3030cd5de848f9fbfc0488c3c55e0`，远程回读一致。同步前再次核对文件集，并备份至 `/opt/tmpfile/20261023142435_precision_backup`。旧哈希资产保留；发布副本与压缩中间产物在验收后清理。

`node .maintenance/precision-series/check-live.mjs` 对真实 HTTPS 站点检查：8 页、16 组桌面/手机布局，28 种图解均可解码，手机采用窄屏图源；位翻转、键盘操作、1024 附近舍入、图解到取舍分析的 SPA 跳转、专题入口、完整标题搜索及旧页面入口共 7 项通过。Canvas 已绘制像素，页面异常和站内失败请求均为零。人工查看手机图解首屏和舍入实验截图；证据在忽略目录 `evidence/live/`。原有本地数值和完整交互验收记录保留在下文；本次部署没有运行真实 GPU 模型，也没有开展真实初学者试读。

## 阅读对象与核心问题

读者会日常小数、乘法和加法，想理解 FP32、FP16、BF16 等格式。主线回答“有限的位怎样表示一个数，表示差异怎样影响计算”。训练、梯度、框架与部署是按兴趣展开的相关内容。

此前的主要问题是精度正文位于推理系列第 14—16 篇，入口与读者目标脱节；基础训练材料又占据了主要导航。新入口为 `/docs/ai/precision/`，主线分成六篇：

1. 数字怎样存进计算机：位权、二进制小数、规格化、偏移指数，推导 1.25 的 FP16 编码。
2. FP32、FP16 与 BF16：由位数分配推导范围与刻度，说明数量级改变时的间距。
3. 舍入、溢出与计算误差：操作刻度实验，解释 1024 连加 0.25 的结果。
4. 混合精度怎样计算：区分权重、激活、累加与输出，说明转换后仍保留已发生的输入误差。
5. FP8、FP4 与整数量化：用 0.3、2、20 解释 scale、分组和裁切，再介绍编码与 W4A16。
6. 怎样选择与验证精度：计算权重空间，用受控比较观察质量、内存与速度。

## 对照阅读与采用的方法

以下为写作方法和技术事实的资料核对，不进入读者正文。读取日期均为 2026-10-23。未将安装量、仓库星数或文章名气当成本文质量的证明。

| 资料 | 实际采用 | 针对原稿的修正 |
| --- | --- | --- |
| [Bartosz Ciechanowski: Exposing Floating Point](https://ciechanow.ski/exposing-floating-point/) | 从熟悉的十进制位权走向二进制、规格化和有限编码；用可操作的变化解释抽象规则 | 补整数位权、负指数与偏移量的推导；编码图移到解释之后 |
| [Fabien Sanglard: Floating Point Visually Explained](https://fabiensanglard.net/floating_point_visually_explained/) | 把相邻 2 的幂之间的范围与内部刻度结合起来解释 | 实验可切换 1 与 1024 附近，让同一格式的间距变化可见 |
| [Sentry blog-writing-guide](https://github.com/getsentry/skills/blob/main/skills/blog-writing-guide/SKILL.md) | 围绕读者的问题推进，使用具体数字、工作示例，对薄弱段落逐处改写 | 删除泛化导读和过早出现的工具术语；保留贯穿算例；未采用其企业署名和营销规则 |
| [Anthropic doc-coauthoring](https://github.com/anthropics/skills/blob/main/skills/doc-coauthoring/SKILL.md) | Reader Testing：由没有写作历史上下文的独立模型阅读并回答问题 | 进行两轮模拟读者检查，修复下述断点；这是模型审查，仍需真实新手试读 |
| [PyTorch AMP](https://github.com/pytorch/pytorch/blob/main/docs/source/amp.md) | 按算子选择格式、FP16 梯度缩放、BF16 常见用法 | 将训练扩展折叠，解释放大、还原及还原时的保存精度 |
| [PyTorch numerical accuracy](https://github.com/pytorch/pytorch/blob/main/docs/source/notes/numerical_accuracy.md) | 非结合性、累加与归约精度、极值和 TF32 计算模式 | 区分保存格式、计算位置和设备行为；不宣称位数下降必然加速 |
| [NVIDIA Transformer Engine FP8/FP4 primer 源稿](https://github.com/NVIDIA/TransformerEngine/blob/main/docs/examples/fp8_primer.ipynb) | 读取官方 notebook 的相关 Markdown，核对 E4M3/E5M2 的位数和最大值，以及 NVFP4 的块缩放 | 保留 448、57344 与 E2M1 说明，细分组方案只交代比较维度；未把训练配方扩展成新手前置 |

通过 `find-skills` 检索技术写作技能，核查源码后安装 `doc-coauthoring`。本机技能路径为 `/Users/waltniu/.codex/skills/find-skills/` 与 `/Users/waltniu/.codex/skills/doc-coauthoring/`。参考文章与官方材料独立阅读，未复制作者的图、段落或交互实现。

资料访问限制：Google technical writing 页读取超时，Distill 页读取失败；一次 NVIDIA 文档旧地址及 Ciechanowski 的 `/float/` 地址返回 404。这些失败结果没有作为事实依据；Ciechanowski 正确文章已完整读取。正文解释稳定的数值规则，不声称覆盖当天各后端的最新发行特性。

## 模拟读者检查

独立读者只阅读本系列和必要组件，按仅懂基础算术的新手检查下列问题是否可由正文回答：

1. 怎样推导 1.25 的 FP16 三段编码？
2. BF16 为什么范围更大，而同一数量级内刻度更疏？
3. 1024 加 0.25 为什么在 FP16 中原地不动？
4. FP32 累加是否能找回 BF16 输入已经丢失的小数？
5. 同组出现 20 怎样影响 0.3，重新分组需要从哪里取数据？
6. 只知道 W4A16，为什么还无法确定运行速度与缓存占用？

第一轮发现并修复：

- 先使用了幂、负指数和二进制整数，却没有交代计算方法。
- 范围上限给出了结论，缺少指数编码、偏移与特殊值的推导。
- 次正规区域的刻度描述错误，改为固定绝对间距及逐渐变差的相对精度。
- 梯度缩放缺少梯度对象、同比放大和高精度还原的解释。
- FP32 累加可能被误读为能恢复输入，补 BF16 转回 FP32 的具体例子。
- 重新分组可能被误读为恢复已丢数据，明确从原始值重新量化及实际分组约束。
- 部署术语打断主线，改放展开区。
- 导读中的编码图超前，移动到第一篇完成编码推导之后。

第二轮未发现新的核心数值错误与 P1 断点，六题都可依据正文回答。继续修复次正规编码规则推导和“单位放大”的歧义，删除导读中重复的编码说明。后续人工复核又统一阈值例子为“严格大于 0.5”，避免“达到”与比较符号冲突。

## 验收标准

| 范围 | 通过条件 | 检查方式 |
| --- | --- | --- |
| 知识依赖 | 每个核心算例的符号、对象和运算有前文依据，六题可从正文推出 | 全文连读、两轮模拟读者审查 |
| 数值事实 | 编码、舍入、边界、累加、量化结果可独立复算 | `python3 .maintenance/precision-series/check-numbers.py` |
| 读者复现 | 标准库脚本直接运行并给出正文列出的六行结果 | `python3 public/ai/precision/labs/precision_numbers.py` |
| 可发现性 | AI 入口、侧栏、搜索能进入独立精度系列，侧栏名与 H1 一致 | 浏览器点击与文本断言 |
| 阅读顺序 | 导读经 01—06 连续跳转，首尾不自动引向无关课程 | 浏览器真实跳转与相邻篇链接检查 |
| 历史入口 | 旧 14—16 页面指向新正文 | 解析链接并核对实际目标 |
| 交互因果 | 格式、数量级、scale 和分组改变后，输出符合独立算例 | 浏览器操作及输出断言 |
| 画布状态 | 非空白、有绘制像素，移动点动画可见，减少动态效果时仍能操作 | Canvas 像素及前后帧检查 |
| 页面呈现 | 1440/390 浅深色七页；320/768/1920 重点页；控件可见且无整页横溢 | 尺寸与控件边界断言、截图人工复核 |
| 图示 | 中文文字未出界，手机图源正确，放大可阅读 | SVG 字体边界、手机图片源断言、浏览器截图 |
| 构建 | 全站构建通过，下载资源真实返回脚本 | VitePress 构建、HTTP 状态与文件内容 |

浏览器验收入口：`PRECISION_PREVIEW_URL=http://127.0.0.1:5196/blog/ node .maintenance/precision-series/check-browser.mjs`。截图和机器结果在本目录忽略的 `evidence/` 下。共享 Canvas 的既有使用和导航变更另用推理、训练系列检查器回归。

连续加法从静态结果表改为 0—8 次可推进实验，实际按每步取偶与 `Math.fround` 计算两条轨迹；浏览器逐次检查全部九个状态。FP32 轨迹采用总数坐标展示，红点显示每一步保存后的 FP16 值。

## 本轮执行结果

- 最终标准命令 `npm run docs:build` 通过，用时 14.11 秒。保留站点已有的 ld/dts/gdb 高亮及大分块提示。
- 数值检查和供读者下载的 Python 脚本都通过，输出与正文一致。
- 最终精度浏览器检查通过：40 组布局，16 类检查，页面异常为零。逐次加法九个状态均符合预期；40 组布局包含 28 组逐页浅深色与 12 组补充宽度。
- 推理回归通过：14 页、11 项交互、30 张 SVG，以及 1440/390/320/768/1920 宽度。证据另存 `evidence/inference/`，未覆盖旧的已追踪截图。
- 训练导航回归通过：两次搜索、七次逐篇跳转；精度检查器另核对了八篇训练文章的侧栏与 H1。
- 新增两张独立 SVG 分别为 1583/1641 字节，预算每张 4 KiB；Python 下载 856 字节，预算 2 KiB。第三篇首次加载观察到的专属 lean 页面模块与共享 PrecisionCanvas 模块响应体合计 4560 字节，预算 80 KiB。这仅是本地 preview 的模块观察，不含全站框架、样式和字体，不推断线上传输量。
- 已人工查看目录手机页、桌面与手机编码图、浅深色交互截图、1024 数量级及累加结束状态；未见文本重叠或画布裁切。`git diff --check` 通过。

过程中的两个构建问题：Python 下载先按 Markdown 链接解析成页面，已采用项目现有的 `withBase` 下载链接修复；另一个正在修改的 Agent 专题曾暂时缺少正文，产生四处外部断链，随后原文件恢复。一次验证尝试使用内存中的限定忽略规则，没有改站点配置；成功构建时该文件已恢复、没有触发忽略日志，最后又用无覆盖参数的标准构建确认通过。

交付状态：本地修订，未提交或部署；真实初学者试读尚未进行。模型读者检查、可复算实验与浏览器验收分别证明文字依据、数值行为和页面可用性，不能据此声称真实读者已理解。

目录页使用短段落与数值对照表；表内各列就是需要比较的空间与结果，没有把知识依赖压成术语表。第六篇使用预算表和复现结果；这些内容保留表格更易核对。未为满足图数添加装饰图。交互为浏览器内数值计算，未加载模型，未将结果标作 GPU 性能测量。

## 位、字节与逐格式图解补充

本次补充对应“每种类型单独画图，解释各部分存什么”的阅读需求，保留六篇主线，新增按名称查阅的 `storage-atlas.md`。01 增加 bit/byte、位编号/位值/位权的区分及八位翻转实验；02 逐个拆开 FP32/FP16/BF16；05 从补码与 INT4/INT8 进入量化，再分别拆开两种 FP8 和 E2M1。

图解包含 28 项：FP64/32/16、BF16、四种 FP8、两种 FP6、FP4、INT4/8/16/32/64、UINT4/8、NF4、E8M0、MXFP8/6/4、NVFP4、Q4_0、Q4_K、TF32 与 INT4 打包。数字编码、块缩放方案、计算模式分节解释，未将它们视为同一层级的 dtype，也未声称穷尽所有私有编码。

图源由 `storage-formats.mjs` 与 `render-storage.mjs` 生成，保留独立 SVG、HTML 源稿和可复算样本。沿用本站纸色与三类字段色；手机源采用纵排及完整数字/标识符换行，避免拆开 1.25、dmin。`StorageFigure` 使用响应式图源、尺寸预留和 lazy loading，没有新增运行时绘图库。

### 补充事实核查

以下资料于 2026-10-23 实际读取相关规范/源码，来源仅在维护记录保存。

| 资料 | 核查内容 |
| --- | --- |
| [ONNX Float8](https://onnx.ai/onnx/technical/float8.html) | 四种 FP8 的偏移量、最大值、FNUZ 的单一零/NaN、E8M0 的有限编码范围 |
| [ONNX Float4](https://onnx.ai/onnx/technical/float4.html) | E2M1 的全部非负幅值、无 Inf/NaN、打包顺序及尾部填充 |
| [Microsoft microxcaling formats.py](https://github.com/microsoft/microxcaling/blob/main/mx/formats.py) | FP6 E2M3/E3M2、FP4 的 exponent/mantissa 配置、有限范围和 MX 格式家族 |
| [bitsandbytes kernels.cu](https://github.com/bitsandbytes-foundation/bitsandbytes/blob/main/csrc/kernels.cu) | NF4 完整 16 项 LUT、四位索引、乘块级 absmax；正文码本按六位小数给近似值 |
| [GGML ggml-common.h](https://github.com/ggml-org/ggml/blob/master/src/ggml-common.h) | Q4_0/Q4_K 字段、大小断言、NVFP4/MXFP4 的实现结构；区分 GGML 块与 Transformer Engine 示意 |
| 上文 NVIDIA Transformer Engine FP8/FP4 primer | 32 值 E8M0 的 MX 分组、16 值 E4M3 + 张量级 FP32 的 NVFP4 示意、训练二维缩放 |

Float8/Float4 页面成功读取；单独 `int4.html` 网络读取失败，打包次序使用成功读取的 Float4 页面。microxcaling 首次 web-read 失败，随后有超时限制的 curl 成功读取源码。NF4 的 LUT 已核对源码首段，未仅依赖其名称推测码值。

新增独立模拟读者审查发现并修复：01 补码前置、scale 与张量解释不足、NF4 码本/scale 类型缺失、E4M3FN 的 448 边界推导、Q4_K 六位字段的无符号解读与偏移用途，以及十六进制突然出现的问题。新增完整码本展开表和 Q4_K 数值代入。这是模型模拟审查，尚未开展真实新手试读。

### 补充验收命令

- `python3 .maintenance/precision-series/check-storage.py`：使用标准库浮点编码与显式边界核对，另算补码、打包和块大小。
- `node .maintenance/precision-series/check-storage-browser.mjs`：56 个 SVG 的实际字体边界/文字相交检查；320/390/1440 浅深色四页；八位实验与键盘；图解覆盖、图片解码、入口/搜索/锚点、按需加载和每张 16 KiB 预算。
- `node .maintenance/precision-series/check-browser.mjs`：六篇主线和既有实验回归。

补充验收结果在下方记录；上文上一轮的通过结论不代替本轮新图解的复核。

补充执行结果：

- Node.js 24.22.1 下全站构建通过，保留既有高亮语言与大分块提示；命令为 `npx --yes --package=node@24 node node_modules/vitepress/bin/vitepress.js build`。系统默认 Node 26 的标准 `npm run docs:build` 也通过，没有修改依赖清单或锁文件。
- `check-storage.py` 通过，标准库编码与显式边界核对了示例、补码、INT4 打包和块空间；原有 `check-numbers.py` 通过。
- 新图解浏览器检查通过：56 个 SVG、24 组布局（320/390/1440，浅/深色，01/02/05/atlas），全部图片实际解码，28 项引用齐全，文字未出界或相交，页面无横向溢出，运行异常为零。
- 八位实验初值 5，翻转位 7 得 133，键盘翻转位 0 得 132，全零/全一分别为 0/255；图解入口、完整标题搜索和正文页内锚点均通过。本站默认中文搜索对词中子串支持有限，使用完整标题验证可达性，没有声称任意中文片段都能命中。
- 六篇原有交互回归通过：40 组布局、16 类检查，无页面异常；本轮未修改这些实验的数值算法。
- 56 个 SVG 合计 197120 字节，单张最大 8921 字节，均小于 16 KiB 预算；冷上下文中图源按屏幕选择且懒加载，未请求 Three.js、模型或视频资源。这是本地 preview 观察，未推断线上传输量。
- 人工复核桌面、320/390 图解、浅深色、INT4/FP8/FP4/NVFP4/Q4_K 和长 INT64 编码截图。数字和标识符保持完整；移除图解首页的分类表，让格式图更早出现。
- 检查中修复：中文标点导致的锚点不命中；测试切换筛选按钮时使用了会变动的 locator；SPA URL 已变但正文尚未更新的测试等待。重新构建后需要重启 preview，避免旧资源映射产生 404。上述测试问题均未通过增大固定等待时间掩盖。

最终仍为本地修订，未提交或部署。

## 精度使用取舍补充

2026-10-23：扩展第六篇，以空间、局部误差、执行效率和维护成本比较 FP32、FP16、BF16、FP8、INT8 与四位方案。FP64/FP6/TF32 用短段交代使用位置；继续区分编码与计算模式。图解末尾增加取舍摘要并直接链接 `06-choosing-precision.html#tradeoffs`，导读同步说明第六篇职责。

新增案例保持 70 亿参数、相同缓存/临时空间，只改变权重：16/8/4 位总预算分别为 20/13/9.5 GB，缓存增到 12 GB 后四位方案也需 17.5 GB。所有数字按十亿字节计算，是预算演算。1 亿参数保留 16 位时，八位权重改为 7.1 GB，按增加的字节数补差额。Python Decimal 已独立核对。

重新读取 [PyTorch numerical accuracy](https://github.com/pytorch/pytorch/blob/main/docs/source/notes/numerical_accuracy.md) 与 [Transformers bitsandbytes](https://github.com/huggingface/transformers/blob/main/docs/source/en/quantization/bitsandbytes.md) 的完整相关源稿，核查 TF32/归约精度、部分模块保留不同 dtype、NF4/额外可训练参数和反量化空间。公开文档入口与 raw 域名读取超时后，通过 GitHub Contents API 的 raw 响应成功读取；未把失败访问当作资料。沿用前文已核对的 AMP 与 Transformer Engine 原理，不新增未经目标设备验证的 GPU 型号或速度推荐。

独立模拟新手审查发现 FP16/BF16 刻度比较遗漏次正规范围，以及未量化层预算容易重复计入。已修正文、对照表与图解摘要，并同步修复第二篇原有的过宽概括。用实际相邻 FP16/BF16 编码验证 `10^-7` 附近的间距分别为 `2^-24` 与 `2^-31`，加入 `check-numbers.py`。

本轮使用对比表表达方案属性，用连续段落推导取舍和实际预算；保留前文存储图解，不新增装饰图或绘图库。浏览器回归增加第六篇的 320/768/1920 宽度、对比表截图，以及从图解摘要进入取舍分析的真实跳转。

取舍补充验收：Node.js 24 下完整构建通过（62.88 秒）；数值检查通过；主线浏览器回归通过 43 组布局、16 类检查，页面异常为零，新增摘要入口已实际点击并检查目标锚点。另检查图解摘要的 320/390/1440 浅深色共六组布局并人工查看截图。手机对比表采用本站既有的局部横向滚动，实测可见宽 342、内容宽 449、可滚动 107 像素，最右侧“常见用途”列可以到达，整页无横向溢出。`git diff --check` 通过。本轮仍为本地修改，未运行模型/GPU 性能测量，未提交或部署。
