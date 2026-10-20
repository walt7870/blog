# Git 进阶八页逐页审查

范围：advanced、conventions、ecosystem、internals-large-repositories、repository-strategies、security、gitlab-cicd、video-series。逐页结论见 reviews/git-advanced.json。

正文与旧SVG全文核对后修正实际操作错误。五幅SVG完成独立浏览器截图与技能self_check；对象图缩短贴边标签后复制到预览目录，用audit=2避开旧缓存截图确认。完整构建14.42秒通过，只有既有ld/dts高亮回退和大chunk提醒；最后两处图中文字修改不影响构建，后续完整构建会重新纳入。

临时仓库行为验证由12项扩展到16项并全通过，覆盖Worktree脏保护/共享引用、正常移除后提交保留，以及Bundle创建/校验/克隆的实际恢复范围。Git操作只作用于临时仓库，未改写博客仓库历史，未执行正文中的远端推送或云部署。

官方核对：git-scm.com/docs/git-bisect全文退出码段；git-worktree和GitLab Kubernetes executor页面已提取，截断内容仅用于实际覆盖的章节。B站18个view接口均HTTP200/code0，标题与全部18集匹配，不等于逐集播放验收。

八页均完成1280×720、390×844浅色首屏和客户端分页；七页深色全文截图，CI长页按权限、静态发布、通知回滚、排错验收四段双视口截图。六张引用图完成双视口放大、原尺寸按钮、关闭。原尺寸的图片getBoundingClientRect为1120或1200，之前记录的内容盒padding问题仍留全站UI核对。

新增两个手机表格列宽问题：对象库四列对比和CI排错表，页面不横溢出且表可滚动，但部分列逐字换行。已记为open，必须全站UI修复后逐页关闭。未把构建成功作为关闭依据。
