# Kubernetes 网络资源逐页审查

已完整阅读并处理 Service、EndpointSlice、Ingress/Gateway、NetworkPolicy 四页及引用图源码。逐页决策与验证见同名 reviews JSON；累计 247/589 页。

新增 `service-named-port-slices.svg` 与 `networkpolicy-selector-scope.svg`；前者区分配置虚线与请求实线，后者用命名空间边界对比 AND/OR 允许集合。Service 图首次原尺寸检查发现注释与虚线冲突，调整注释并移除冗余线后重新构建复验。

8段YAML共10对象经Ruby解析，7段Bash经bash/zsh语法检查；整站构建13.98秒通过。四页逐一完成1280×900和390×844浅深色完整截图，两端全部图片原尺寸加载关闭，手机全部长代码键盘横滚与页面宽度检查。手机Service正文到EndpointSlice、桌面Service到Ingress和EndpointSlice到NetworkPolicy客户端跳转正确。

官方资料原始结果保留 `/tmp/blog-k8s-network-resources-official.json`、`/tmp/blog-k8s-gateway-resources-official.json` 与 `/tmp/blog-k8s-gateway-resources-detail.json`。失败URL未作为依据；Service/Ingress/NetworkPolicy按相关段核对，未冒称全文阅读。未运行集群、CNI、Gateway或应用集成实验。

共享UI待办仍包括旧 `kubernetes-*.svg` 手机固定760宽导致的局部滚动，Ingress本页已实测可原尺寸放大；最终共享UI阶段统一改完整缩略图并逐页复验。
