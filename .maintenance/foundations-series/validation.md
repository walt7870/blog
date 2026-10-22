# 首批实现与验收

当前已随推理系列发布；线上验证与提交见 [2026-10-22 发布记录](../releases/2026-10-22-ai-series.md)。下方“未提交、未部署”为对应历史阶段状态。

## 2026-10-22 发布前复核

- 完整阅读导读与 01—08，移除重复的“本篇回顾”标题，保留自然段中的回顾与下一篇引导。当前范围为导读、八篇入门课与视频逐字稿；09—28 仍为课程规划。
- 修复三维曲面旋转后在手机上的裁切：初始化、旋转和窗口变化统一按场景边界计算相机位置。390/1440 宽度的四个角度截图已目视检查，曲面、网格和轴标签均在画布内。
- `check-math.mjs`、`check-lab.mjs`、`check-resources.mjs` 和 `check-media.py` 通过；训练的 41 个 JS/Python 状态及独立进程重载结果一致。最终本地全站构建 19.14 秒通过。
- 新增 `check-release.mjs`：10 页 × 两种宽度 × 浅深色共 40 次布局检查，图片加载与整页宽度通过；三维非空像素、四次旋转复位、单步更新、过大学习率停止及 WebGL 不可用降级通过，无页面脚本错误。当前视频实际播放，时长 455.7 秒、字幕开启，Range 请求返回 206/256 字节；3D 和 MP4 在选择前均未加载。证据在本机 `evidence/release/`。
- `npm audit` 仍为原有 Mermaid → KaTeX 链的两个 low，无 moderate/high/critical；未为此升级无关主版本。全站审查摘要因共享主题变化过期，保留独立专题验收范围，未批量追认旧页面。
- 本节覆盖下方历史记录中的旋转、WebGL 不可用和当前视频播放待验项目；完整逐句审听、真实手机硬件与 B 站投稿仍待后续。此次网页小样可在文章内按需播放。

## 当前视频修订：2026-10-22

第07集已按新版初学者解释重制：12段、42句噜噜旁白，197条短句字幕，约7分36秒。B站版为原生1920×1080/25fps/12553331字节；网页预览为1280×720/12fps/2502353字节，低于2.5MiB预算。音源、逐字稿、字幕、封面、章节和投稿草稿已同步。当前逐项结果见 `video/validation-20261022.md`，音源与回退记录见 `video/voice-revision.md`。双版媒体检查、数学、资源检查及全站构建通过；四种布局检查通过，完整审听和逐字字幕对齐待人工复核。未上传、未部署。

以下为2026-10-21历史记录；其中旧视频规格、大小和播放证据不用于证明当前视频。

日期：2026-10-21，macOS，Asia/Shanghai。范围为导读、01—08、逐字稿、两项局部交互、12 张 SVG、标准库训练实验，以及第 07 集网页/B 站两份本地样片。09—28 仍为规划。未提交、未部署、未登录或投稿 B 站。

## 历史：入门阅读修订

导读、01—08 与逐字稿导语按初学者阅读顺序改写，补充新词具体对象、符号含义和公式选择理由，删除视频下方的制作说明。完整逐页问题与修订记录见 `beginner-reading-review.md`；旧四篇作为深入材料保留。视频旁白与音源未改，渲染器仅同步逐字稿页首模板。

最终全站构建 13.28 秒通过；数学、资源预算和 Python 语法检查通过。十页桌面/手机浅深色共 40 条实际尺寸与溢出检查通过，重新保存截图，见 `evidence/beginner-browser-results.json`。额外完成展开推导四种布局、中文搜索命中新锚点、逐字稿到公式说明的跳转，以及逐篇点击 01—08 的下一篇导航，见 `evidence/beginner-reading-extra.json`。未新增媒体或运行依赖，未重新测量线上流量。全站审查门禁与真实新读者验证的边界保持下文说明。

## 历史：“噜噜”配音与导读修订

当前视频已替换为“噜噜”纯音色，25 段原始 WAV、文本及摘要通过核对，格式均为 24kHz 单声道 PCM16。两版成片为 1280×720、12fps、224.666667 秒，网页 2,563,490 bytes，B 站审阅版 4,791,049 bytes；音画时长差约 0.667ms，最终音轨 mean -18.0dB、max -4.0dB。25 条字幕时序与双版本 8 镜头抽帧检查通过，联系表已目视检查。详情见 `video/voice-revision.md`、当前两份 manifest 与 `evidence/media-results.json`。

Node.js 24 下本轮全站构建通过，16.21 秒；资源预算检查通过，网页视频仍低于 2.5MiB。导读新增训练框架、推理引擎和服务的分工。三个受影响页面重新检查桌面/手机、浅深色共 12 条布局，实际宽高与整页宽度一致；证据 `evidence/lulu-browser-results.json`。手机宽表保持局部滚动，推理系列链接实际跳转通过。

浏览器真实播放新视频，观察 currentTime 从 0 推进至 17.13954 秒，duration 为 224.666667，readyState=4，中文字幕 showing，preload=none。原生进度条定位后右箭头从 129.427536 跳到 131.674666 秒，空格暂停通过；见 `evidence/lulu-playback-results.json` 与 `lulu-video-playback.jpg`。完整逐句审听尚未完成，不将这些检查作为自然度验收。

下面保留首版完整课程、交互与请求测量记录；其中 208 秒、Tingting 和旧视频大小仅属于首版。首版 40 条页面记录不替代本轮 12 条复核。没有重新测量新版首次传输总量，不能将下面的 294,666 bytes 作为新版实测。数学与训练代码未因配音修订改变，未重复执行无关实验。

## 首版构建与数值

- Node.js 24 下 `npm ci`、`npm run docs:build` 通过，最近全站构建约 16.26 秒；没有死链构建失败。已有 gdb/ld/dts 高亮提示及按需 Three chunk 体积提示。
- 锁定 `three@0.186.1`；`npm audit` 的两个 low 来自原有 Mermaid → KaTeX 链，未强制升级无关依赖。
- `check-math.mjs` 通过解析梯度/有限差分、等高线、单样本大小步长与训练轨迹检查。
- `check-lab.mjs` 在 Python 3.12.14 下通过全部 41 个 JS/Python 状态比较、保存后新进程推理、发散保护与非法输入检查。第 02 篇读者训练环境只需标准库；视频制作环境另有 NumPy、Pillow、Matplotlib。
- 三样本 `L(0,0)=83/6`；学习率 0.1 一步后 `w=1.1333333333,b=.5,L=2.7442592593`；40 步后 `L=.000276492386`。独立重载预测 2.5 千克得 `6.006193390558`。单样本 `w=1,x=2,y=4,b=0` 的大小步长损失分别为 `.72` 和 `18`。

复核入口（在项目根目录）：

```bash
npx --yes --package=node@24 -- node .maintenance/foundations-series/check-math.mjs
FOUNDATIONS_PYTHON=/tmp/blog-foundations-video-venv/bin/python npx --yes --package=node@24 -- node .maintenance/foundations-series/check-lab.mjs
npx --yes --package=node@24 -- node .maintenance/foundations-series/check-resources.mjs
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/check-canvas.py
/tmp/blog-foundations-video-venv/bin/python .maintenance/foundations-series/check-media.py
```

`/tmp/` 解释器是本机临时制作环境，不是读者安装路径；未来可用相应 Python 3.12 环境替换。

## 首版浏览器与图示

生产预览：`http://127.0.0.1:5194/blog/docs/ai/foundations/`。通过 CUA 的 Playwright 接口验收，非开发服务器旧截图。10 页 × 1440×900/390×844 × 浅深色共 40 条最终记录，实际读取 `innerWidth/innerHeight`，无整页横向溢出，引用图均已滚动加载或实际打开。逐页完整阅读、取舍与结果见 `page-reviews.md`。

损失场景额外检查 320px；单步、播放/暂停、复位、四档旋转、2D/3D 切换、滑条/数值输入联动通过。学习率 1 时如实显示超显示范围参数并停止；不夹回边界。中文搜索找到新课程并点击完成真实导航。最终读取当前页浏览器 warn/error 记录为空，不代表覆盖所有浏览器故障。

12 张 SVG 结构自检通过，实际字体边界记录无文字越画布。截图像素检查：桌面内容占比约 16.44%，手机前后约 24.50%/24.64%；单步后显著变化像素约 0.165%，画面非空且确有更新。像素检查只验证画面，不代替数学核对、性能基准或真人手机检查。

## 首版小服务器资源

`check-resources.mjs` 预算检查通过，明细见 `resource-report.json`：

| 资源 | 实际大小 | 加载行为 |
| --- | --- | --- |
| 12 张 SVG | 合计约 98 KB，最大 30,185 bytes | 图片懒加载，手机使用独立重排版，预留尺寸 |
| 视频封面 WebP | 16,486 bytes | 首屏只需轻量封面 |
| 网页临时样片 | 2,365,870 bytes | `preload=none`，点击播放后请求，无自动播放 |
| Three.js 独立 chunk | raw 736,440 / gzip 185,282 bytes | 默认二维；选择三维且接近可见才加载 |

经本地请求代理记录，首次 17 个请求合计 294,666 bytes，Three 与 MP4 请求均为 0；随后选择三维才请求引擎，播放后 MP4 返回 206。证据为 `evidence/initial-requests.json`、`requests.jsonl`，仅代表本地生产预览压缩和请求行为，未测线上 Nginx。原有 `/favicon.png` 404 保留记录，未扩改无关资源。

正式系列由 B 站承载视频：在 `video-catalog.mjs` 登记真实链接后，组件显示封面外链，不创建 iframe；确认 B 站播放正常后移出网页临时 MP4。投稿成片、中间音频与逐帧文件不进入 `public/`。服务器不保存整套视频、不转发 B 站播放流。缓存、Content-Encoding、MIME/Range 仍须发布时核对。

## 首版视频交付

两版均为真实 1280×720、12fps、208.3565 秒的图示样片，H.264/AAC。网页版用原生字幕，B 站审阅版带画内字幕；不能标成 1080p/25fps 正式片。25 条字幕顺序无重叠、在片长内；8 镜头双版本抽帧非空，联系表已目视复核，公式和文字无裁切。封面已目视复核。

网页真实播放时 `currentTime` 推进，`duration≈208.3565`、readyState=4、中文字幕 showing；键盘右箭头跳转与空格暂停通过。音视频时长差约 23ms；音轨均值约 -18.5dB、峰值约 -2.9dB，无静音或峰值削波，不代替完整审听。

| 文件 | 用途 |
| --- | --- |
| `video/storyboard.json`、`video/render.py` | 25 句旁白唯一源与程序化画面/配音合成 |
| `video/manifest.json`、`video/bilibili-manifest.json` | 两版尺寸、时序、文件大小和 SHA256 |
| `video/exports/07-gradient-learning-rate-bilibili.mp4` | 4,615,306 bytes，本地投稿审阅版，Git 忽略 |
| `video/exports/07-gradient-cover.png` | B 站封面，本地导出文件 |
| `video/gradient-learning-rate.srt` | 独立字幕，保留编辑与投稿入口 |
| `public/ai/foundations/video/` | 临时网页样片、WebP 封面、字幕和章节 |
| `video/bilibili-plan.md`、`video/07-bilibili-submission.md` | 28 集规划、分集状态和第 07 集投稿草稿 |

MP4 与 `exports/` 不入 Git，均保留在本机。首版使用 macOS `say` 的 Tingting 音色；当前默认已改为本地外部 WAV，复现见 `video/voice-revision.md`。本地 `/Library/Fonts/Arial Unicode.ttf`、FFmpeg/ffprobe 和 Python 绘图环境仍用于制作。首版约 50 MB 可再生中间文件已移到本机废纸篓 `blog-foundations-generated-20261021`，正式输出、源稿、清单和证据保留。后续换配音或渲染规格后须重新验收，不能沿用历史摘要。

## 门禁与剩余范围

执行 `script/audit-site.mjs --gate` 时使用隔离扫描输出目录，读取当前主工作区但不重写已有全站台账。结果 exit 1：615 条记录本地死链 0、未解决条目 0；共享主题/导航摘要变化导致原有审查 hash 失效，另有新增待审记录。当前首批 10 页的审读证据在独立台账，未将全站数百页追认为已重新审读，因此不能声称全站发布门禁通过。完整摘要见 `evidence/site-gate.json`。

未完成：200% 浏览器缩放、WebGL 不可用/context lost 与异步失败故障注入、无 JS/reduced motion 全链路验证、长时路由资源累积测量、真实手机硬件和全屏播放、完整成片逐句审听及配音公开发行条件核查。没有 GPU/数字项目/模型优化实测；这些属于后续课程。未部署或投稿，不把本地预览成功当作线上验收。
