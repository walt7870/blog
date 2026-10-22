# “噜噜”配音修订

## 当前版本：2026-10-22

新版为 `beginner-20261022`，沿用测试平台已保存的“噜噜”纯音色模式。12段讲解、42句旁白，用正负残差抵消、平方评分、0.5缩放、0.99/1/1.01数值试探衔接梯度和学习率，再进入三样本双参数曲面。没有重新克隆或修改音色。

原始音源共436.8秒，合成实测431.4秒，存于被忽略的 `voice-source-20261022.local/`。每句补0.45秒停顿，成片455.7秒。保留旧25句音源及 `exports/previous-lulu-20261021/` 回退。42句均核对稿件、SHA256、24kHz单声道PCM16格式及非静音；源音频最大满幅比例约0.0101%，不声称源音频零削波。成片归一化后mean -18.0dB、max -3.8dB。

| 版本 | 实际规格 | 字节数 | SHA256 |
| --- | --- | ---: | --- |
| B站本地成片 | 1920×1080 / 25fps / H.264 / AAC128k / 455.72秒 | 12553331 | `ca42be3dd581b54109130419c8bff473fb5230a676b19bfafc1eb3f43ee82110` |
| 网页预览 | 1280×720 / 12fps / H.264 / AAC32k / 455.70秒 | 2502353 | `ee804c5e19fea2ab691a7dbc2af10492ad77ca9794b6331032584ebd90a503a2` |

B站文字与几何图形在最终分辨率直接绘制，三维图按150dpi渲染。画面有内容变化时才重绘，再由FFmpeg保持输出帧率，降低本地制作开销。两版音源相同，编码工作目录隔离；首次并行编码的共享临时音轨导致B站版缺失尾部音频，已废弃并重编码，修正版音轨455.70秒、画面455.72秒。

字幕拆成197条短句，在各源句实长内按字数分配，尚未经逐字强制对齐。程序检查了内容无缺漏、时间范围、双版音画时长、12段画面和文件摘要；完整审听、公式读法和短句时间的人工复核仍待投稿前完成。没有上传B站或部署博客。

复现使用Python3.12、Pillow、Matplotlib、NumPy和FFmpeg；已有WAV时渲染不访问合成服务：

```bash
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/video/render.py --bilibili
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/video/render.py
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/video/cover.py
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/check-media.py
node .maintenance/foundations-series/check-resources.mjs
```

重新合成时给 `synthesize.py` 传 `--output .maintenance/foundations-series/video/voice-source-20261022.local`，已有逐句缓存会复用；修改旁白应使用新的源音频目录，不覆盖旧音源。测试客户端使用既有本地会话，不将凭据或私有音色标识写入工程。

## 历史版本：2026-10-21

2026-10-21。复用用户指定测试平台当前账号中已保存的“噜噜”音色，采用纯音色（xvector_only）模式，不携带参考录音表演语气，不修改或重新保存音色。原参考录音、私有音色 ID、会话凭据不进入项目记录。

25 句均来自 `storyboard.json`。前 4 句在指定网页生成并下载，后 21 句通过本机已有测试客户端串行合成，用时 177.4 秒；没有重复生成已缓存片段。`synthesize.py` 按音色名称精确选择，使用客户端既有本地会话，不将凭据写入参数或清单。

原始 WAV 和文本、时长、SHA256 清单保存在被 Git 忽略的 `voice-source.local/`，不进入 `public/`。全部 24kHz、单声道、PCM16，源音频总长约 213.36 秒。逐句增加 0.45 秒停顿后按实长排镜头、字幕和逐字稿；成片 224.666667 秒。渲染前验证稿件与 WAV 摘要，默认不再访问合成服务。

```bash
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/video/render.py
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/video/render.py --bilibili
```

两版均为 1280×720、12fps。网页 2,563,490 bytes，B 站审阅版 4,791,049 bytes。旧 Tingting 配音的两份视频和清单在被忽略的 `exports/previous-tingting/` 保留回退，不占网站体积。新音轨采用 `loudnorm=I=-18:TP=-2:LRA=7`；实测 mean -18.0dB、max -4.0dB。源 WAV 存在极少量满幅样本，最大占比约 0.0436%，不宣称源音频零削波。

已完成 25 句非静音、活跃比例、格式、摘要和字幕时序检查，双版本 8 镜头抽帧、音画时长与浏览器播放检查。自然度、公式读法和整体节奏尚未完整逐句审听；投稿前还需核对音色公开发行条件。没有发布或上传 B 站。

本轮约 47 MB 可再生画面、拼接音轨等中间文件已移入本机废纸篓 `blog-foundations-lulu-generated-20261021`。保留原始 25 句 WAV、正式成片、清单、源码和证据；网站仅保留一份新配音预览视频。
