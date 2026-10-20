# Kubernetes 生产治理四页审查

完整阅读reliability-capacity、observability、version-upgrade、production-practice正文及全部直接SVG。具体修改与验证见reviews/container-kubernetes-operations.json。

## 核对资料

- https://kubernetes.io/releases/ 与 https://kubernetes.io/releases/version-skew-policy/ 全文。当前提取未给出完整动态patch列表，因此不写猜测补丁号。
- https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/ 和 https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/ 全文。
- https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/ 资源超额、Priority、相对用量相关段。
- https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/ 历史对象迁移及storedVersions相关段。
- https://opentelemetry.io/docs/collector/components/ receiver、processor及部署相关段，不声称全文。
- https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ 跳minor限制和升级流程相关段；该页未找到downgrade字样。
- https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/cmd/kubeadm/app/phases/upgrade/policy.go 全文。存在MaximumAllowedMinorVersionDowngradeSkew检查，因此删除“kubeadm不支持原地降级”绝对断言，且不把版本偏差检查等同受支持的完整恢复方案。

提取结果暂存/tmp/blog-k8s-operations-official.json、/tmp/blog-k8s-operations-detail-official.json、/tmp/blog-k8s-kubeadm-policy.json。troubleshooting-kubeadm提取只找到Docker降级例子，不作为Kubernetes降级证据。

5段Bash通过bash -n及zsh -n，4段YAML通过Ruby解析，未运行Kubernetes集群实验。三张新/重画图1120宽、一张保留可观测图1280宽，独立原尺寸实际字体边界及截图复核。四页均完成1280×900桌面及390×844手机浅深色全页截图；手机超宽代码键盘滚动、图原尺寸加载关闭通过，观测→升级→生产实践客户端分页URL/H1正确。最终构建13.99秒成功，仅既有ld/dts高亮和chunk提示；本批diff检查通过。
