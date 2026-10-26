# Agent 工作流程：作品集、AI 实战系列与发布

给接手本仓库的 Agent 使用，记录作品集页面、“AI 编程实战手记”系列和发布环节的做法与已经踩过的坑。项目约束以 `AGENTS.md` 为准，写作标准见 `blog-writing.md`。

## 作品集页面（`/profile/`、`/projects/`）

- 源头是私有仓库 `walt7870/project-portfolio`（本机 `~/Documents/项目/工作记录/项目整理`）。改案例、个人概览或作品集组件，先读那边的 `context/WORKFLOW.md`：文件清单、深度案例字段、`ai` 字段写法、图示生成和检查脚本都在里面。
- 不要只在本仓库新增或改写案例。绕过源头仓库的会话读不到那边的事实与公开边界，曾经把客户域名和带客户缩写的服务名发布到线上。确实先在本仓库改了，就把同名文件回写过去，再跑那边的 `build` 和 `verify`。
- 客户名称等敏感词清单只放在私有的作品集仓库（`scripts/scan-public.mjs`），不要抄进本仓库：本仓库公开。

## AI 编程实战手记（`docs/ai/ai-coding-practice/`）

- 七页：总览加 01–06 篇。图示由 `.maintenance/ai-coding-practice/diagrams.mjs` 生成到 `public/ai/ai-coding-practice/`，改图改脚本后重新运行，不手改 SVG。
- 事实来自 `~/.codex/knowledge/*.md`、各项目仓库的 `AGENTS.md` / `HANDOFF.md` / 验收文档和 Claude 记忆。新增内容同样要能追到记录；查不到出处的细节删掉，不凭印象补全（初稿里“第一次测试全部通过”“第三次才完成”这类说法核对不到出处，已删除）。
- 已做的取舍，修改时保持：
  - 合并请求编号、主机、人员不写，只写过程和数字。
  - 私有化交付的授权文件错发事故不公开，只写之后加的闸门。
  - 全双工语音约 13 分钟的中断以匿名复盘公开。
  - AI 代码审查门禁的移除原因没有记录；“作为提示而非硬门禁”是作者的判断，不写成当时的决策理由。
- 案例页的“AI 协作开发”章节和本系列引用同一批事实，改数字或结论时两边一起检查。
- 系列入口：`.vitepress/sidebar.ts` 的“AI 编程实战手记”分组、`docs/ai/index.md` 卡片、`docs/ai/coding-agent-series/index.md` 的互链、个人概览的知识专题卡片（后者在作品集仓库）。

## 页面验收

`node script/check-pages.mjs <站点地址> <截图目录> <路径>...` 依次在 1440 / 390 宽度、浅色 / 深色下打开页面，检查横向溢出、失效图片、页面报错和 4xx/5xx 响应，并保存截图。本地用开发服务地址（`http://localhost:<端口>/blog/`），发布后用 `https://niuwancheng.cn/blog/` 回读。脚本通过不代表页面没问题，截图要人工看：文字越框、图示裁切、深色下看不清，脚本都查不出来。

Playwright 不是项目依赖：能 `import('playwright')` 就用它，否则回退到 Codex 运行时自带的副本，也可以用 `PLAYWRIGHT_MODULE` 指定。

## 审查台账

- 每页记录在 `.maintenance/content-audit/reviews/*.json`，`reviewedHash` 必须等于 `node script/audit-site.mjs` 扫描得到的 `reviewHash`。改动 `.vitepress` 时另在 `.maintenance/content-audit/theme-review.json` 记录一次主题验收。
- `reviewHash` 只包含页面正文、直接引用的静态资源和 `dependencyFiles`；`.vitepress` 下的主题、组件和侧边栏改动由 `theme-review.json` 单独验收，不会让页面记录过期。通过组件加载的图片（如精度图集）审计发现不了，要写进该页的 `dependencyFiles`。不要为了让门禁通过批量刷新哈希；只为自己实际读过、验过的页面新增或更新记录，并在交付说明里写明门禁状态。
- 新文件名按字母序排在后面（如 `zzzzzzz-<专题>.json`），避免和其他会话的记录冲突。

## 发布

1. 从干净的主工作区发布：`git status` 为空，其他会话的未提交改动不能夹带上线（需要隔离时按 `AGENTS.md` 的 worktree 流程）。
2. `REMOTE_HOST=root@117.72.10.198 bash ./dep.sh`。脚本依次：构建 → 作品集仓库的公开内容扫描（找不到仓库时只告警）→ 检查线上非哈希文件都在构建里 → 上传、备份、替换。
3. 删除或改名页面时，保留检查会拦住部署。先在服务器上把旧文件**移到** `/opt/tmpfile/removed-<名称>-<日期>/`（保留相对路径），再部署，不直接删除。
4. 发布后用 `script/check-pages.mjs` 对线上地址回读改动页面；HTTP 200 不等于发布成功。
5. 推送到 GitHub 会触发 GitHub Pages 发布。用户要求“先部署 JD 审核”时，先部署 JD，等用户确认后再推送。
