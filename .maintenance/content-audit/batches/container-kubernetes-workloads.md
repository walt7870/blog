# Kubernetes 资源总览与工作负载逐页审查

2026-10-20，覆盖视频目录、资源总览、Pod、Deployment、StatefulSet、DaemonSet、Job/CronJob七页。全部正文、代码及引用图源码已完整阅读，逐页决定和验证见同名 reviews JSON。

## 改动与验证

新增四张独立SVG：发布容量、稳定身份与卷、节点覆盖、任务幂等。均为1120宽，以实际浏览器中文字体测量text矩形并检查完整截图。资源总览和Pod保留此前已审查的机制图。完整桌面1280×900和手机390×844浅深色截图逐页检查；六张正文图片均在两端打开原尺寸并关闭。手机所有溢出代码经ArrowRight验证滚动；无整页横溢。总览→Pod→Deployment、StatefulSet→DaemonSet→Job客户端分页URL和H1正确。

Deployment手机状态表初次截图发现长Condition/reason组合挤出解释列，已拆开，重新构建并复验桌面/手机双主题。最终整站构建14.39秒通过。五篇工作负载共6段YAML fence（StatefulSet含两对象）经Ruby解析，6段Bash fence通过bash -n和zsh -n。没有集群、数据库、CSI、调度运行实验，不把静态检查写成集成通过。

## 资料边界

- https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ ：核对selector、terminating资源、rollout和deadline相关段。
- https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/ ：核对identity、顺序、Parallel、PVC retention、partition和forced rollback相关段。
- https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/ ：核对自动tolerations、unschedulable、示例及更新相关段。
- https://kubernetes.io/docs/concepts/workloads/controllers/job/ ：抓取65760字符且截断，仅核对重复启动、backoff、deadline、Failed相关段。
- https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/ ：全文阅读，核对concurrency、deadline、timeZone、suspend和template更新。

其余官方文档未声称全文阅读。临时原始证据见 `/tmp/blog-k8s-workloads-official.json`、`/tmp/blog-k8s-cronjob-official.json`。24视频此前通过公开view元数据核对，没有播放验证。

## 最终共享UI阶段事项

资源总览和Pod旧图被现有共享CSS的kubernetes前缀规则固定为760宽，手机依靠局部横滚和图片放大读图。最终UI阶段调整为更易发现的完整缩略图，并对所有受影响页面重新验收；当前没有为绕过reviewHash复核而修改共享主题或批量更新摘要。该事项不得在发布前遗漏。
