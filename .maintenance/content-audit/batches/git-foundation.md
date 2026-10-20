# Git 基础与协作六页

2026-10-20 完整阅读 index、concepts、branching、git、recovery、workflow 六篇及引用旧图。发现旧图把origin/main画在远端、add后再编辑未解释；恢复页把建分支当未提交备份；stash pop冲突保留与reset范围需要修正。已按订单导出业务线重组，三个旧图重画、新增提交关系与恢复选择图。

## 验证

- `.maintenance/content-audit/git-behavior-check.mjs` 仅在临时仓库执行，12项实际行为通过，临时仓库清理完毕。
- 五张SVG通过技能self_check；独立截图核查，恢复图标签避开分支线，连线改圆角。正文图桌面和手机均可放大、切原尺寸模式并关闭。当前全局padding使原尺寸模式内容宽桌面1080、手机1100（natural1120），尚未改共享CSS；最终UI阶段应检查该命名和尺寸合同。
- 构建14.16秒通过，仅已有ld/dts高亮回退和大chunk提示。
- 六页桌面1280×720、手机390×844：深色全文截图与浅色首屏，正文/表格无整页横向溢出；workflow/recovery/git手机长代码实测滚动80/73/72.5。六页逐个点击下一页，客户端标题正确。
- 本地预览曾在重建期间读取被清空的输出目录退出；已重启并重新创建桌面验证tab18。后续先停止预览再重建，避免误判为站点问题。

## 下一批

advanced、conventions、ecosystem、internals-large-repositories已全文阅读。待修：bisect返回码125/128以上、worktree生命周期、submodule锁定提交；soft reset拆分仍已全部暂存；Hook不能作为强制门禁；对象路径与fsck dangling定义。其余Git四篇仍待全文阅读，不能登记完成。
