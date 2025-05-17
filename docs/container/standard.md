# 容器标准规范

## 一、容器相关的开放标准

### 1. OCI 标准

#### 1.1 镜像规范（Image Specification）

定义容器镜像的文件布局、清单（manifest）格式和校验方式，确保不同运行时之间可互换镜像。
参考：[mkdev](https://mkdev.me/posts/what-is-open-container-initiative-oci-build-spec-runtime-spec-image-spec-and-more)。

##### 核心构成

1. **Manifest：** 描述镜像的各层及其校验信息；

2. **Image Index（可选）：** 支持多平台镜像，通过指向不同平台清单实现跨架构兼容；

3. **Layers：** 按顺序叠加的只读文件系统差异层；

4. **Config：** 包含容器运行时需要的元数据（如环境变量、入口点、用户权限等）

##### 2.3 版本与发布

最新的 Image Spec v1.1.0 于 2024 年 2 月 15 日发布，进一步完善了 mediaType 定义和注解规范，最新动态参考：[Open Container Initiative](https://opencontainers.org/)。

#### 1.2 分发规范（Distribution Specification）

规范了镜像仓库中镜像拉取（pull）、推送（push）和内容寻址（content-addressable）等 API，使 Registry 与客户端能够一致交互。
参考：[GitHub](https://github.com/opencontainers/image-spec)
**核心组成：**

+ **Content Negotiation**：通过 HTTP header 协商不同媒体类型；
+ **Manifest API**：管理镜像清单的上传和查询；
+ **Blob API**：分层数据的上传与下载；
+ **Conformance Tests**：确保不同仓库实现符合规范要求，具体参考[GitHub](https://github.com/opencontainers/distribution-spec)

#### 1.3 运行时规范（Runtime Specification）

规定如何从一个“文件系统 bundle”启动并运行容器，涵盖命名空间（namespaces）、控制组（cgroups）等底层隔离机制的参数格式。
参考：[Open Container Initiative](https://opencontainers.org/)

##### 核心组成

+ **Spec File（config.json）**：定义容器运行环境和生命周期参数；
+ **Hooks**：在容器生命周期不同阶段执行自定义脚本或程序；
+ **Runtime Implementations**：如 runc、crun、gVisor 等，作为规范的参考实现和其他工具的基础，具体参考：[GitHub](https://github.com/opencontainers/runtime-spec)

##### 版本与发布

Runtime Spec v1.2.0 于 2024 年 1 月发布，新增了对更多 cgroup v2 功能的支持以及钩子扩展机制优化
具体参考：

+ [Open Container Initiative](https://opencontainers.org/)+ [https://opencontainers.github.io](https://specs.opencontainers.org/runtime-spec/?v=v1.0.2)。

### 2. 其他容器镜像与打包标准

+ **CNAB（Cloud Native Application Bundle）**：定义如何将多镜像、多服务以及部署逻辑打包为单一应用包，支持多种运行时环境（如 Kubernetes、Docker）互操作。
+ **OCI Artifact Spec**：扩展镜像规范，将 Helm Chart、SBOM 等非镜像制品纳入统一仓储与分发体系。

---

## 二、容器编排相关标准

### 1. CRI（Container Runtime Interface）

CRI 是 Kubernetes kubelet 与容器运行时之间的插件接口，包括以 Protobuf 描述的生命周期管理、镜像管理、日志流等 RPC 方法。任何实现该接口的运行时（如 containerd、CRI-O、Mirantis CRI）都可即插即用于 Kubernetes 集群
参考：[Kubernetes](https://kubernetes.io/docs/concepts/architecture/cri/)

### 2. CNI（Container Network Interface）

CNI 定义了容器网络的配置文件格式和插件调用契约，运行时在创建容器网络命名空间时会调用配置中的插件，插件负责配置 IP、路由、带宽限速等网络功能。Kubernetes、Mesos、Nomad 等系统均通过 CNI 插件提供 Pod/任务网络
参考：[CNI](https://www.cni.dev/docs/spec/)

### 3. CSI（Container Storage Interface）

CSI 规定了存储编排系统（Container Orchestrator）与存储系统之间的交互接口，包括：

+ **节点插件（Node Plugin）**：在每个节点上负责卷的挂载、格式化和卸载。
+ **控制面插件（Controller Plugin）**：管理卷的创建、删除和快照等操作。

该规范使第三方存储厂商无需改动编排系统核心代码，即可通过 CSI 驱动接入 Kubernetes、Mesos、Docker Swarm 等平台
参考：

+ [GitHub](https://github.com/container-storage-interface/spec)
  
+ [kubernetes-csi.github.io](https://kubernetes-csi.github.io/docs/)。

### 4. SMI（Service Mesh Interface）

SMI 提供一组 Kubernetes CRD（Custom Resource Definition），涵盖：

+ **TrafficSplit**：分流流量到不同后端的策略。
+ **TrafficTarget**：定义服务间的访问控制和加密要求。
+ **HTTPRouteGroup / TCPRoute**：对 HTTP/TCP 流量进行分组与匹配。
+ **TrafficMetrics**：暴露延迟、错误率等关键指标。

通过 SMI，用户可以用统一 API 操作不同服务网格实现（如 Istio、Linkerd、Consul Connect）
参考：

+ [SMI](https://smi-spec.io/)

+ [GitHub](https://github.com/servicemeshinterface/smi-spec)。

---

## 三、标准生态与典型场景

| 标准 | 核心组件 | 典型实现 | 场景举例 |
| --- | --- | --- | --- |
| OCI | Image Spec / Runtime Spec / Distribution Spec | Docker, containerd, runc | 跨运行时镜像兼容、镜像仓库互通 |
| CRI | RuntimeService / ImageService RPC | containerd, CRI-O, Mirantis CRI | Kubernetes 集群的运行时抽象 |
| CNI | 网络配置 JSON / ADD/DEL 接口 | Calico, Flannel, Cilium | Pod 网络初始化、网络策略实施 |
| CSI | ControllerPublish / NodePublish RPC | Ceph CSI, Portworx CSI, AWS EBS CSI | 动态 PV/PVC 挂载与管理 |
| SMI | TrafficSplit, TrafficTarget 等 CRD | Istio SMI Adapter, Linkerd SMI Support | 多服务流量管理、灰度发布、跨网格监控 |

---

通过以上标准的协同，容器化应用在镜像构建、运行时调度、网络互通、存储管理和微服务治理等各个环节都能实现高度可插拔与生态互操作。根据具体需求，选择并组合相应规范与实现，能够构建安全、可扩展、易运维的云原生平台。
