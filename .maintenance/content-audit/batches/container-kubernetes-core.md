# Kubernetes 总览与三篇机制页逐页审查

完整阅读四页和五张直接引用SVG，逐项修改见reviews/container-kubernetes-core.json。五图统一1120宽浅底蓝绿，逐项核对API方向、配置传播和真实请求/IO路径，没有把EndpointSlice或PVC画成转发中间件。

## 核对来源和边界

- https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/ 全文，校准Reserve/Permit周期位置。
- https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/ 全文，校准ready/serving/terminating。
- https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/ 只读启动、探针、终止相关段，没有声称全文。
- https://kubernetes.io/docs/reference/using-api/server-side-apply/ 只读字段所有权和冲突相关段。
- https://kubernetes.io/docs/reference/networking/virtual-ips/ 仅核IPVS弃用相关段；未采用未来计划。
- https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/pkg/registry/apps/deployment/strategy.go 的PrepareForUpdate段确认spec或annotation更新推进generation。
- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/ PDB/Eviction/rollout相关段。

来源提取暂存/tmp/blog-k8s-core-official.json、/tmp/blog-k8s-proxy-generation-official.json、/tmp/blog-k8s-network-disruption-official.json。Service/Volumes来源未据此声称全文核对。24个视频逐项官方view API标题与编号匹配，公开state0，证据/tmp/blog-k8s-video-metadata.json；不是播放验证。

10段Bash通过bash -n；拓扑PodSpec片段Ruby YAML解析通过并人工核放置位置。未运行Kubernetes集群，没有把命令语法通过写成调度、探针、CSI、终止等集成测试通过。

整站14.64秒构建成功，仅既有高亮ld/dts与chunk提示；preview独立root配置真实指向/tmp/blog-audit-full-20261019。四页桌面1280×900、手机390×844浅深色全页截图全部查看，无整页横溢。五图独立原尺寸实际字体rect与截图、正文放大/原尺寸/关闭通过。手机所有超宽pre键盘横滚验证；正文导览到控制面以Enter激活，控制面到调度到数据面分页客户端跳转URL/H1正确。
