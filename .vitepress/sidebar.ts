// .vitepress/sidebar.ts
import type { DefaultTheme } from 'vitepress';

export const sidebar: DefaultTheme.Sidebar = {
  // 网络代理
  '/docs/network-proxy/': [
    {
      text: '网络代理',
      collapsed: false,
      items: [
        { text: '专题总览', link: '/docs/network-proxy/' },
        { text: '基础原理', link: '/docs/network-proxy/fundamentals' },
        { text: '组件链路', link: '/docs/network-proxy/components' },
        { text: '协议、插件与传输', link: '/docs/network-proxy/protocol-stack' },
        {
          text: '实施部署',
          collapsed: true,
          items: [
            { text: '实施总览', link: '/docs/network-proxy/implementation' },
            { text: '证书申请与续期', link: '/docs/network-proxy/certificate' },
            { text: '服务端部署（systemd）', link: '/docs/network-proxy/server-systemd' },
            { text: '服务端部署（Docker）', link: '/docs/network-proxy/server-docker' },
            { text: '新增用户与常用命令', link: '/docs/network-proxy/user-management' },
            { text: 'Clash Verge 客户端', link: '/docs/network-proxy/clash-verge' },
          ]
        },
        { text: '运维与排查', link: '/docs/network-proxy/operations' },
        { text: '跨境链路慢与不稳定的诊断', link: '/docs/network-proxy/cross-border-diagnosis' },
        { text: 'Hysteria2 落地与订阅编排', link: '/docs/network-proxy/hysteria2-practice' },
      ]
    }
  ],

  // 基础知识 - 通信协议
  '/docs/basic/protocol/': [
    {
      text: '通信协议',
      collapsed: false,
      items: [
        { text: '网络与协议总览', link: '/docs/basic/protocol/' },
        { text: '分层、寻址与路由', link: '/docs/basic/protocol/network-foundations' },
        { text: 'TCP、UDP 与 Socket', link: '/docs/basic/protocol/transport-socket' },
        { text: '现代应用与实时协议', link: '/docs/basic/protocol/application-realtime' },
        { text: '容量、并发与性能', link: '/docs/basic/protocol/capacity-performance' },
        { text: '网络排障方法与案例', link: '/docs/basic/protocol/troubleshooting' },
        { text: 'HTTP vs WebSocket', link: '/docs/basic/protocol/http-vs-websocket' },
        { text: '嵌入式与工业协议', link: '/docs/basic/protocol/embedded-protocols' },
      ]
    }
  ],

  // 基础知识 - 声学
  '/docs/basic/acoustics/': [
    {
      text: '声学',
      collapsed: false,
      items: [
        { text: '声学概览', link: '/docs/basic/acoustics/' },
        {
          text: '基础链路',
          collapsed: true,
          items: [
            { text: '声学结构', link: '/docs/basic/acoustics/structure' },
            { text: '声音与信号基础', link: '/docs/basic/acoustics/sound-fundamentals' },
            { text: '采集与播放链路', link: '/docs/basic/acoustics/capture-playback' },
          ],
        },
        {
          text: '语音模块',
          collapsed: true,
          items: [
            { text: '降噪与前处理', link: '/docs/basic/acoustics/noise-reduction' },
            {
              text: 'VAD',
              collapsed: true,
              items: [
                { text: 'VAD 总览', link: '/docs/basic/acoustics/vad/' },
                { text: 'Silero VAD', link: '/docs/basic/acoustics/vad/silero-vad' },
              ],
            },
            { text: '语音唤醒', link: '/docs/basic/acoustics/wake-word' },
            { text: '语音识别', link: '/docs/basic/acoustics/speech-recognition' },
            {
              text: 'sherpa-onnx',
              collapsed: true,
              items: [
                { text: '框架总览', link: '/docs/basic/acoustics/sherpa-onnx/' },
                { text: '识别运行模式', link: '/docs/basic/acoustics/sherpa-onnx/recognition-modes' },
                { text: '模型与部署选型', link: '/docs/basic/acoustics/sherpa-onnx/model-selection-deployment' },
              ],
            },
            { text: '语音合成', link: '/docs/basic/acoustics/speech-synthesis' },
            { text: '语音交互链路', link: '/docs/basic/acoustics/voice-interaction' },
          ],
        },
        {
          text: '工程实践',
          collapsed: true,
          items: [
            { text: '质量评估与排错', link: '/docs/basic/acoustics/quality-evaluation' },
            { text: '工程选型', link: '/docs/basic/acoustics/engineering' },
          ],
        },
      ]
    }
  ],

  // 算法
  '/docs/algorithm/': [
    {
      text: '算法',
      collapsed: false,
      items: [
        { text: '算法概览', link: '/docs/algorithm/' },
        { text: '复杂度分析', link: '/docs/algorithm/complexity-analysis' },
        { text: '排序算法', link: '/docs/algorithm/sorting-algorithms' },
        { text: '搜索算法', link: '/docs/algorithm/search-algorithms' },
        { text: '动态规划', link: '/docs/algorithm/dynamic-programming' },
        { text: '回溯算法', link: '/docs/algorithm/backtracking' },
        { text: '贪心算法', link: '/docs/algorithm/greedy-algorithms' },
        { text: '分治算法', link: '/docs/algorithm/divide-and-conquer' },
        { text: '图算法', link: '/docs/algorithm/graph-algorithms' },
        { text: '字符串算法', link: '/docs/algorithm/string-algorithms' },
        { text: '数学算法', link: '/docs/algorithm/mathematical-algorithms' },
      ]
    }
  ],

  // 嵌入式开发
  '/docs/embedded/': [
    {
      text: '嵌入式开发',
      collapsed: false,
      items: [
        { text: '总览与学习路线', link: '/docs/embedded/' },
        { text: '电子电路基础', link: '/docs/embedded/electronics' },
        { text: '微控制器原理与选型', link: '/docs/embedded/mcu' },
        { text: '嵌入式 C 编程', link: '/docs/embedded/c-programming' },
        { text: '开发工具链', link: '/docs/embedded/toolchain' },
        { text: '外设驱动开发', link: '/docs/embedded/peripherals' },
        { text: '实时操作系统', link: '/docs/embedded/rtos' },
        { text: '通信协议实战', link: '/docs/embedded/communication' },
        { text: '嵌入式 Linux', link: '/docs/embedded/linux-embedded' },
        { text: '硬件设计入门', link: '/docs/embedded/hardware-design' },
        { text: '主流平台实战', link: '/docs/embedded/platforms' },
        { text: '综合项目案例', link: '/docs/embedded/projects' },
        { text: '职业发展与进阶', link: '/docs/embedded/career' },
      ]
    }
  ],

  '/docs/ai/': [
    {
      text: '人工智能',
      collapsed: false,
      items: [
        {
          text: 'AI 全景',
          collapsed: false,
          items: [
            { text: '人工智能全景', link: '/docs/ai/' },
            { text: '发展脉络', link: '/docs/ai/history' },
            { text: '核心概念词典', link: '/docs/ai/glossary' },
            { text: '学习与实践路线', link: '/docs/ai/learning-path' },
          ],
        },
        {
          text: '基础原理',
          collapsed: true,
          items: [
            { text: '基础原理概述', link: '/docs/ai/foundations/' },
            { text: '数据与任务建模', link: '/docs/ai/foundations/data-and-tasks' },
            { text: '数学直觉', link: '/docs/ai/foundations/math-intuition' },
            { text: '训练与优化', link: '/docs/ai/foundations/training-optimization' },
            { text: '泛化与评估', link: '/docs/ai/foundations/generalization-evaluation' },
          ],
        },
        {
          text: '机器学习',
          collapsed: true,
          items: [
            { text: '机器学习概述', link: '/docs/ai/ml' },
            { text: '项目：流失预测', link: '/docs/ai/practice/machine-learning-project' },
          ],
        },
        {
          text: '深度学习',
          collapsed: true,
          items: [
            { text: '深度学习概述', link: '/docs/ai/deep-learning/' },
            { text: '神经网络与反向传播', link: '/docs/ai/deep-learning/neural-networks' },
            { text: '主要网络架构', link: '/docs/ai/deep-learning/architectures' },
            { text: '工程实践', link: '/docs/ai/deep-learning/framework-practice' },
          ],
        },
        {
          text: '主要应用方向',
          collapsed: true,
          items: [
            { text: '领域概览', link: '/docs/ai/domains/' },
            { text: '自然语言处理', link: '/docs/ai/domains/nlp' },
            { text: '计算机视觉', link: '/docs/ai/domains/computer-vision' },
            { text: '语音技术', link: '/docs/ai/domains/speech' },
            { text: '推荐系统', link: '/docs/ai/domains/recommendation' },
            { text: '时间序列与预测', link: '/docs/ai/domains/time-series' },
            { text: '强化学习', link: '/docs/ai/domains/reinforcement-learning' },
            { text: '多模态模型', link: '/docs/ai/domains/multimodal' },
          ],
        },
        {
          text: '流式语音技术实践',
          collapsed: true,
          items: [
            { text: '专题概览', link: '/docs/ai/speech-engineering/' },
            { text: '处理链路与运行架构', link: '/docs/ai/speech-engineering/architecture-and-workflow' },
            { text: '角色证据与目标说话人识别', link: '/docs/ai/speech-engineering/pipeline-boundaries' },
            { text: '断句、收尾与逐句时延', link: '/docs/ai/speech-engineering/latency-and-finalization' },
            { text: '动态批处理与推理调度', link: '/docs/ai/speech-engineering/performance-and-capacity' },
            { text: '推理输入合同与资源生命周期', link: '/docs/ai/speech-engineering/inference-contracts-and-lifecycle' },
            { text: '共享热词召回与请求隔离', link: '/docs/ai/speech-engineering/hotword-routing' },
            { text: '音频回放与质量回归', link: '/docs/ai/speech-engineering/evidence-driven-validation' },
            { text: '离线推理容器与工件一致性', link: '/docs/ai/speech-engineering/delivery-and-handoff' },
          ],
        },
        {
          text: '模型推理系列',
          collapsed: true,
          items: [
            { text: '系列导读', link: '/docs/ai/inference-series/' },
            { text: '01. 推理系统的分工', link: '/docs/ai/inference-series/01-landscape' },
            { text: '02. 从输入到逐步生成', link: '/docs/ai/inference-series/02-lifecycle' },
            { text: '03. GPU 与显存预算', link: '/docs/ai/inference-series/03-memory' },
            { text: '04. 注意力与 KV 缓存', link: '/docs/ai/inference-series/04-cache-attention' },
            { text: '05. 批处理与调度', link: '/docs/ai/inference-series/05-scheduling' },
            { text: '06. 量化、算子与编译', link: '/docs/ai/inference-series/06-quantization' },
            { text: '07. 推测解码', link: '/docs/ai/inference-series/07-speculative' },
            { text: '08. vLLM 的执行机制', link: '/docs/ai/inference-series/08-vllm' },
            { text: '09. SGLang 的执行机制', link: '/docs/ai/inference-series/09-sglang' },
            { text: '10. 多卡、MoE 与分离部署', link: '/docs/ai/inference-series/10-distributed' },
            { text: '11. 语音与多模态推理', link: '/docs/ai/inference-series/11-speech' },
            { text: '12. 框架对比与版本', link: '/docs/ai/inference-series/12-selection-versions' },
            { text: '13. 部署、压测与排错', link: '/docs/ai/inference-series/13-practice' },
          ],
        },
        {
          text: '大模型',
          collapsed: true,
          items: [
            { text: '概述', link: '/docs/ai/llm/' },
            { text: '核心概念', link: '/docs/ai/llm/concepts' },
            { text: '训练与微调', link: '/docs/ai/llm/training' },
            { text: 'SFT', link: '/docs/ai/llm/sft' },
            { text: '推理与部署', link: '/docs/ai/llm/inference' },
            { text: 'RAG 与工具调用', link: '/docs/ai/llm/rag-tools' }
          ]
        },
        {
          text: 'AI 应用开发',
          collapsed: true,
          items: [
            { text: '应用开发概述', link: '/docs/ai/applications/' },
            { text: '模型 API 与结构化输出', link: '/docs/ai/applications/model-api' },
            { text: 'AI 应用架构', link: '/docs/ai/applications/application-architecture' },
            { text: '知识库问答', link: '/docs/ai/first-ai-app' },
            { text: 'MCP', link: '/docs/ai/mcp' },
            { text: '智能体', link: '/docs/ai/agent' },
          ],
        },
        {
          text: 'RSI 递归自我改进',
          collapsed: true,
          items: [
            { text: '专题导读', link: '/docs/ai/rsi/' },
            { text: '01. 机制、实践与影响', link: '/docs/ai/rsi/01-recursive-self-improvement' },
          ],
        },
        {
          text: 'LangChain 实战',
          collapsed: true,
          items: [
            { text: '系列导读', link: '/docs/ai/applications/langchain/' },
            { text: '01. LangChain 到底是什么', link: '/docs/ai/applications/langchain/01-what-is-langchain' },
            { text: '02. LangGraph 状态工作流', link: '/docs/ai/applications/langchain/02-langgraph-workflow' },
            { text: '03. 完整 RAG 链路', link: '/docs/ai/applications/langchain/03-rag-from-zero' },
            { text: '04. Tool、工作流与 Agent', link: '/docs/ai/applications/langchain/04-tools-workflows-agents' },
            { text: '05. 生产化实践', link: '/docs/ai/applications/langchain/05-production-practices' },
          ],
        },
        {
          text: 'AI 工程化',
          collapsed: true,
          items: [
            { text: '工程化概述', link: '/docs/ai/engineering/' },
            { text: '模型服务与部署', link: '/docs/ai/engineering/serving-deployment' },
            { text: 'MLOps 与 LLMOps', link: '/docs/ai/engineering/mlops-llmops' },
            { text: '成本、容量与性能', link: '/docs/ai/engineering/cost-capacity' },
            { text: '安全、隐私与治理', link: '/docs/ai/engineering/security-governance' },
            { text: '评估与排错', link: '/docs/ai/evaluation-troubleshooting' },
          ],
        },
        {
          text: '项目实践',
          collapsed: true,
          items: [
            { text: '实践路线', link: '/docs/ai/practice/' },
            { text: '流失预测', link: '/docs/ai/practice/machine-learning-project' },
            { text: '产品质量分类', link: '/docs/ai/practice/vision-project' },
            { text: '知识库问答', link: '/docs/ai/first-ai-app' },
            { text: '工单处理助手', link: '/docs/ai/practice/agent-project' },
          ],
        },
        {
          text: 'Agent Skill',
          collapsed: true,
          items: [
            { text: 'Skill 概述', link: '/docs/ai/skill/' },
            { text: '推荐与选型', link: '/docs/ai/skill/recommendations' },
            { text: 'Claude Code 实践', link: '/docs/ai/skill/claude-code-best-practices' },
          ]
        },
        {
          text: 'AI 编程深度系列',
          collapsed: true,
          items: [
            { text: '系列导读', link: '/docs/ai/coding-agent-series/' },
            { text: '01. 任务闭环与自治边界', link: '/docs/ai/coding-agent-series/01-ai-coding-agent-era' },
            { text: '02. Coding Agent 怎样工作', link: '/docs/ai/coding-agent-series/02-coding-agent-internals' },
            { text: '03. 工具工作流选型', link: '/docs/ai/coding-agent-series/03-ai-coding-tool-landscape-2026' },
            { text: '04. Vibe、Agentic 与 Spec-Driven', link: '/docs/ai/coding-agent-series/04-vibe-agentic-spec-driven' },
            { text: '05. Agent 可执行的任务契约', link: '/docs/ai/coding-agent-series/05-executable-task-contract' },
            { text: '06. Context Engineering', link: '/docs/ai/coding-agent-series/06-context-engineering' },
            { text: '07. AGENTS.md、Rules、Skills、Hooks', link: '/docs/ai/coding-agent-series/07-agents-rules-skills-hooks' },
            { text: '08. MCP 与 Agent 工具工程', link: '/docs/ai/coding-agent-series/08-mcp-agent-tool-engineering' },
            { text: '09. Brownfield：先理解再修改', link: '/docs/ai/coding-agent-series/09-brownfield-understand-before-edit' },
            { text: '10. Brownfield：测试驱动实现', link: '/docs/ai/coding-agent-series/10-brownfield-test-driven-agent-change' },
            { text: '11. Brownfield：验证与交付', link: '/docs/ai/coding-agent-series/11-brownfield-verification-review-delivery' },
            { text: '12. Cloud Agent 与多 Agent', link: '/docs/ai/coding-agent-series/12-cloud-agent-worktree-multi-agent' },
            { text: '13. 安全与团队治理', link: '/docs/ai/coding-agent-series/13-ai-coding-security-governance' },
            { text: '14. AI 编程是否提效', link: '/docs/ai/coding-agent-series/14-does-ai-coding-improve-productivity' },
          ],
        },
        {
          text: 'AI 编程工程化',
          collapsed: true,
          items: [
            { text: '工程化导读', link: '/docs/ai/vibe-coding/' },
            { text: '开发方式与选型', link: '/docs/design/develop-pattern/ai-coding' },
            { text: '原型快速验证', link: '/docs/ai/vibe-coding/vibe-coding' },
            { text: '提示词工程', link: '/docs/ai/vibe-coding/prompt-engineering' },
            { text: '上下文工程', link: '/docs/ai/vibe-coding/context-engineering' },
            { text: 'Spec Driven', link: '/docs/ai/vibe-coding/spec-driven' },
            { text: '工具与 Agent 工程', link: '/docs/ai/vibe-coding/tool-agent-engineering' },
            { text: 'Harness 工程', link: '/docs/ai/vibe-coding/harness-engineering' },
            { text: '项目实战', link: '/docs/ai/vibe-coding/project-practice' },
            { text: '组织流程工程', link: '/docs/ai/vibe-coding/organizational-engineering' },
          ],
        },
      ]
    }
  ],
  // 容器相关
  '/docs/container/': [
    {
      text: '容器技术',
      collapsed: false,
      items: [
        { text: '容器概览', link: '/docs/container/' },
        { text: '视频学习系列', link: '/docs/container/video-series' },
        {
          text: 'Basic',
          collapsed: true,
          items: [
            { text: '基础导览', link: '/docs/container/basic/' },
            { text: '核心概念', link: '/docs/container/basic/concepts' },
            { text: '运行时与工具边界', link: '/docs/container/basic/runtimes' },
            { text: '容器标准', link: '/docs/container/basic/standards' },
          ],
        },
        {
          text: 'Docker',
          collapsed: true,
          items: [
            { text: 'Docker 导览', link: '/docs/container/docker/' },
            { text: '常用命令', link: '/docs/container/docker/command' },
            { text: '镜像构建与供应链', link: '/docs/container/docker/image-build-supply-chain' },
            { text: '存储、网络与 Compose', link: '/docs/container/docker/storage-network-compose' },
            { text: 'Java 应用镜像', link: '/docs/container/docker/java-application' },
          ],
        },
        {
          text: 'Kubernetes',
          collapsed: true,
          items: [
            { text: 'Kubernetes 导览', link: '/docs/container/kubernetes/' },
            { text: 'Kubernetes 进阶视频系列', link: '/docs/container/kubernetes/video-series' },
            {
              text: '核心机制',
              collapsed: true,
              items: [
                { text: '控制面、API 与调谐', link: '/docs/container/kubernetes/control-plane' },
                { text: '调度与节点生命周期', link: '/docs/container/kubernetes/scheduling-node-lifecycle' },
                { text: '数据面、存储与可靠性', link: '/docs/container/kubernetes/data-plane-reliability' },
                { text: '可靠性、弹性与容量', link: '/docs/container/kubernetes/reliability-capacity' },
                { text: '可观测性与证据链', link: '/docs/container/kubernetes/observability' },
                { text: '版本与升级', link: '/docs/container/kubernetes/version-upgrade' },
                { text: '生产实践', link: '/docs/container/kubernetes/production-practice' },
              ],
            },
            {
              text: '资源对象',
              collapsed: true,
              items: [
                { text: '资源导览', link: '/docs/container/kubernetes/resources/' },
                { text: 'Pod', link: '/docs/container/kubernetes/resources/pod' },
                { text: 'Deployment', link: '/docs/container/kubernetes/resources/deployment' },
                { text: 'Service', link: '/docs/container/kubernetes/resources/service' },
                { text: 'Ingress', link: '/docs/container/kubernetes/resources/ingress' },
                { text: 'ConfigMap', link: '/docs/container/kubernetes/resources/configmap' },
                { text: 'Secret', link: '/docs/container/kubernetes/resources/secret' },
                { text: 'PV & PVC', link: '/docs/container/kubernetes/resources/pv-pvc' },
                { text: 'StatefulSet', link: '/docs/container/kubernetes/resources/statefulset' },
                { text: 'DaemonSet', link: '/docs/container/kubernetes/resources/daemonset' },
                { text: 'Job & CronJob', link: '/docs/container/kubernetes/resources/job-cronjob' },
                { text: 'Namespace', link: '/docs/container/kubernetes/resources/namespace' },
                { text: 'ServiceAccount', link: '/docs/container/kubernetes/resources/serviceaccount' },
                { text: 'RBAC', link: '/docs/container/kubernetes/resources/rbac' },
                { text: 'NetworkPolicy', link: '/docs/container/kubernetes/resources/networkpolicy' },
                { text: 'EndpointSlice', link: '/docs/container/kubernetes/resources/endpoint' },
                { text: 'HPA', link: '/docs/container/kubernetes/resources/hpa' },
                { text: 'VPA', link: '/docs/container/kubernetes/resources/vpa' },
                { text: 'PodDisruptionBudget', link: '/docs/container/kubernetes/resources/poddisruptionbudget' },
                { text: 'LimitRange', link: '/docs/container/kubernetes/resources/limitrange' },
                { text: 'ResourceQuota', link: '/docs/container/kubernetes/resources/resourcequota' },
                { text: 'Custom Resource', link: '/docs/container/kubernetes/resources/customresource' },
              ],
            },
            {
              text: '进阶扩展',
              collapsed: true,
              items: [
                { text: '进阶导览', link: '/docs/container/kubernetes/advanced/' },
                { text: '扩展点与接口边界', link: '/docs/container/kubernetes/advanced/extension-points' },
                { text: 'CR 和 CRD', link: '/docs/container/kubernetes/advanced/CR-CRD' },
                { text: 'Operator', link: '/docs/container/kubernetes/advanced/operator' },
                { text: '云原生扩展生态', link: '/docs/container/kubernetes/advanced/ecosystem' },
                { text: 'Gateway、Cilium 与 Mesh', link: '/docs/container/kubernetes/advanced/traffic-engineering' },
                { text: 'GitOps、策略与供应链', link: '/docs/container/kubernetes/advanced/delivery-security' },
                { text: '平台工程', link: '/docs/container/kubernetes/advanced/platform-engineering' },
              ],
            },
          ],
        },
        {
          text: 'Tools',
          collapsed: true,
          items: [
            { text: '工具导览', link: '/docs/container/tools/' },
            { text: 'Colima', link: '/docs/container/tools/colima' },
          ],
        },
      ],
    }
  ],

  // 架构设计
  '/docs/design/architecture/': [
    {
      text: '架构设计',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/design/architecture/index' },
        { text: '分层架构', link: '/docs/design/architecture/layered-architecture' },
        { text: '六边形架构', link: '/docs/design/architecture/hexagonal-architecture' },
        { text: '微服务架构', link: '/docs/design/architecture/microservices-architecture' },
        { text: '事件驱动架构', link: '/docs/design/architecture/event-driven-architecture' },
        { text: 'CQRS架构', link: '/docs/design/architecture/cqrs-architecture' },
        { text: '云原生架构', link: '/docs/design/architecture/cloud-native-architecture' },
        { text: 'SOA架构', link: '/docs/design/architecture/soa' },
        { text: '无服务器架构', link: '/docs/design/architecture/serverless-architecture' },
        {
          text: '领域驱动设计(DDD)',
          collapsed: true,
          items: [
            { text: 'DDD总览', link: '/docs/design/architecture/DDD/' },
            { text: '模型详细说明', link: '/docs/design/architecture/DDD/model' },
            { text: 'DDD概述', link: '/docs/design/architecture/DDD/domain-driven-design' },
            { text: '基础概念', link: '/docs/design/architecture/DDD/basic-concept' },
            { text: '聚合根', link: '/docs/design/architecture/DDD/Aggregate' },
            { text: '事件风暴', link: '/docs/design/architecture/DDD/event-storming' },
            { text: '实践指南', link: '/docs/design/architecture/DDD/practice' },
            { text: '学习笔记', link: '/docs/design/architecture/DDD/learn-note' },
            { text: 'DDD 与 UML', link: '/docs/design/architecture/DDD/uml/uml' }
          ]
        },
        {
          text: 'UML建模',
          collapsed: true,
          items: [
            { text: 'UML总览', link: '/docs/design/architecture/uml/' },
            { text: '类图关系', link: '/docs/design/architecture/uml/class-relationships' }
          ]
        },
        {
          text: '平台架构',
          collapsed: true,
          items: [
            { text: '平台架构概览', link: '/docs/design/architecture/platform/' },
            { text: 'Android 平台', link: '/docs/design/architecture/platform/android' },
            { text: 'iOS 平台', link: '/docs/design/architecture/platform/ios' },
            { text: 'Linux ARM 平台', link: '/docs/design/architecture/platform/linux-arm' },
            { text: 'Linux x86/x64 平台', link: '/docs/design/architecture/platform/linux-x86' },
            { text: 'Windows 平台', link: '/docs/design/architecture/platform/windows' },
          ]
        },
        {
          text: 'TOGAF架构框架',
          collapsed: true,
          items: [
            { text: 'TOGAF概述', link: '/docs/design/architecture/togaf/index' },
            { text: 'TOGAF深度实践', link: '/docs/design/architecture/togaf/deep-practice' },
            { text: '营销系统架构实战', link: '/docs/design/architecture/togaf/marketing-system-practice' },
            { text: '核心问题与应用辨析', link: '/docs/design/architecture/togaf/core-questions' },
            { text: '干系人与架构原则', link: '/docs/design/architecture/togaf/stakeholders-principles' },
            { text: 'ADM方法', link: '/docs/design/architecture/togaf/adm-method' },
            { text: '业务架构', link: '/docs/design/architecture/togaf/business-architecture' },
            { text: '数据架构', link: '/docs/design/architecture/togaf/data-architecture' },
            { text: '应用架构', link: '/docs/design/architecture/togaf/application-architecture' },
            { text: '技术架构', link: '/docs/design/architecture/togaf/technology-architecture' },
            { text: '架构内容与仓库', link: '/docs/design/architecture/togaf/architecture-content-repository' },
            { text: 'Baseline与Gap', link: '/docs/design/architecture/togaf/baseline-target-gap' },
            { text: '过渡架构与迁移', link: '/docs/design/architecture/togaf/transition-migration-planning' },
            { text: '架构治理', link: '/docs/design/architecture/togaf/architecture-governance' }
          ]
        }
      ]
    }
  ],

  //消息中间件 
  '/docs/tools/mq/': [
    {
      text: '消息中间件',
      collapsed: false,
      items: [
        { text: '概览', link: '/docs/tools/mq/' },
        { text: 'Kafka', link: '/docs/tools/mq/kafka' },
        { text: 'RabbitMQ', link: '/docs/tools/mq/rabbitmq' },
        { text: 'RocketMQ', link: '/docs/tools/mq/rocketmq' },
        { text: 'Pulsar', link: '/docs/tools/mq/pulsar/' },
      ]
    }
  ],

  //设计模式
  '/docs/design/design-pattern/': [
  {
    text: '设计模式概述',
    link: '/docs/design/design-pattern/',
  },
  {
    text: '设计原则',
    collapsed: false,
    items: [
      { text: '原则概述', link: '/docs/design/design-pattern/principles/' },
      { text: '单一职责原则', link: '/docs/design/design-pattern/principles/single-responsibility' },
      { text: '开闭原则', link: '/docs/design/design-pattern/principles/open-closed' },
      { text: '里氏替换原则', link: '/docs/design/design-pattern/principles/liskov-substitution' },
      { text: '依赖倒置原则', link: '/docs/design/design-pattern/principles/dependency-inversion' },
      { text: '接口隔离原则', link: '/docs/design/design-pattern/principles/interface-segregation' },
      { text: '迪米特法则', link: '/docs/design/design-pattern/principles/law-of-demeter' },
      { text: '合成复用原则', link: '/docs/design/design-pattern/principles/composite-reuse' },
    ]
  },
  {
    text: '创建型模式',
      collapsed: false,  
      items: [
      { text: '创建型概述', link: '/docs/design/design-pattern/creational/' },
      { text: '工厂方法', link: '/docs/design/design-pattern/creational/factory-method' },
      { text: '抽象工厂', link: '/docs/design/design-pattern/creational/abstract-method' },
      { text: '单例模式', link: '/docs/design/design-pattern/creational/singleton' },
      { text: '建造者模式', link: '/docs/design/design-pattern/creational/builder' },
      { text: '原型模式', link: '/docs/design/design-pattern/creational/prototype' },
    ]
  },
  {
    text: '结构型模式',
    collapsed: false,  
    items: [
      { text: '结构型概述', link: '/docs/design/design-pattern/structural/' },
      { text: '适配器模式', link: '/docs/design/design-pattern/structural/adapter' },
      { text: '桥接模式', link: '/docs/design/design-pattern/structural/bridge' },
      { text: '装饰器模式', link: '/docs/design/design-pattern/structural/decorator' },
      { text: '代理模式', link: '/docs/design/design-pattern/structural/proxy' },
      { text: '外观模式', link: '/docs/design/design-pattern/structural/facade' },
      { text: '享元模式', link: '/docs/design/design-pattern/structural/flyweight' },
      { text: '组合模式', link: '/docs/design/design-pattern/structural/composite' },
    ]
  },
  {
    text: '行为型模式',
    collapsed: false,
    items: [
      { text: '行为型概述', link: '/docs/design/design-pattern/behavioral/' },
      { text: '模板方法模式', link: '/docs/design/design-pattern/behavioral/template-method' },
      { text: '策略模式', link: '/docs/design/design-pattern/behavioral/strategy' },
      { text: '观察者模式', link: '/docs/design/design-pattern/behavioral/observer' },
      { text: '迭代器模式', link: '/docs/design/design-pattern/behavioral/iterator' },
      { text: '责任链模式', link: '/docs/design/design-pattern/behavioral/chain-of-responsibility' },
      { text: '状态模式', link: '/docs/design/design-pattern/behavioral/state' },
      { text: '命令模式', link: '/docs/design/design-pattern/behavioral/command' },
      { text: '备忘录模式', link: '/docs/design/design-pattern/behavioral/memento' },
      { text: '解释器模式', link: '/docs/design/design-pattern/behavioral/interpreter' },
      { text: '访问者模式', link: '/docs/design/design-pattern/behavioral/visitor' },
      { text: '中介者模式', link: '/docs/design/design-pattern/behavioral/mediator' },
    ]
  },



],



  // 开发语言（所有 devlanguage 子目录共享同一棵侧边栏树）
  '/docs/devlanguage/': [
    {
      text: '开发语言',
      collapsed: false,
      items: [
        { text: '总览', link: '/docs/devlanguage/' },
        {
          text: 'Java',
          collapsed: false,
          items: [
            { text: 'Java 概览', link: '/docs/devlanguage/java/' },
            {
              text: 'Java 基础',
              collapsed: true,
              items: [
                { text: '基础语法', link: '/docs/devlanguage/java/basic/' },
                {
                  text: 'JDK 与版本',
                  collapsed: true,
                  items: [
                    { text: 'JDK 概述', link: '/docs/devlanguage/java/basic/jdk/' },
                    { text: 'JDK 版本变化', link: '/docs/devlanguage/java/basic/jdk/upgrade' },
                  ]
                },
                { text: '基础工具类', link: '/docs/devlanguage/java/basic/base-class' },
                { text: '语言特性', link: '/docs/devlanguage/java/basic/special' },
              ]
            },
            {
              text: 'JVM',
              collapsed: true,
              items: [
                { text: 'JVM 概览', link: '/docs/devlanguage/java/jvm/' },
                { text: 'JVM 深入视频系列', link: '/docs/devlanguage/java/jvm/video-series' },
                { text: '动手入门路径', link: '/docs/devlanguage/java/jvm/hands-on' },
                {
                  text: '核心机制',
                  collapsed: true,
                  items: [
                    { text: 'Class 文件与字节码', link: '/docs/devlanguage/java/jvm/class-file-bytecode' },
                    { text: '类加载机制', link: '/docs/devlanguage/java/jvm/class-loading' },
                    { text: '执行引擎与 JIT', link: '/docs/devlanguage/java/jvm/execution-engine-jit' },
                    { text: '对象生命周期', link: '/docs/devlanguage/java/jvm/object-lifecycle' },
                  ]
                },
                {
                  text: '运行时数据区',
                  collapsed: true,
                  items: [
                    { text: '概述', link: '/docs/devlanguage/java/jvm/runtime-area/' },
                    { text: '堆', link: '/docs/devlanguage/java/jvm/runtime-area/heap' },
                    { text: '虚拟机栈', link: '/docs/devlanguage/java/jvm/runtime-area/vm-stack' },
                    { text: '程序计数器', link: '/docs/devlanguage/java/jvm/runtime-area/program-counter' },
                    { text: '本地方法栈', link: '/docs/devlanguage/java/jvm/runtime-area/native-method-stack' },
                    { text: '方法区', link: '/docs/devlanguage/java/jvm/runtime-area/method-area' },
                    { text: '直接内存', link: '/docs/devlanguage/java/jvm/runtime-area/direct-memory' },
                  ]
                },
                {
                  text: 'GC',
                  collapsed: true,
                  items: [
                    { text: '概述', link: '/docs/devlanguage/java/jvm/gc/' },
                    { text: 'Serial', link: '/docs/devlanguage/java/jvm/gc/serial' },
                    { text: 'Parallel', link: '/docs/devlanguage/java/jvm/gc/parallel' },
                    { text: 'ParNew', link: '/docs/devlanguage/java/jvm/gc/parnew' },
                    { text: 'CMS', link: '/docs/devlanguage/java/jvm/gc/cms' },
                    { text: 'G1', link: '/docs/devlanguage/java/jvm/gc/g1' },
                    { text: 'ZGC', link: '/docs/devlanguage/java/jvm/gc/zgc' },
                    { text: 'Shenandoah', link: '/docs/devlanguage/java/jvm/gc/shenandoah' },
                    { text: 'Epsilon', link: '/docs/devlanguage/java/jvm/gc/epsilon' },
                  ]
                },
                { text: '诊断案例', link: '/docs/devlanguage/java/jvm/diagnostic-cases' },
                { text: '现代 JVM 发展', link: '/docs/devlanguage/java/jvm/modern-jvm' },
                { text: 'JNI', link: '/docs/devlanguage/java/jvm/jni' },
              ]
            },
            {
              text: '依赖管理',
              collapsed: true,
              items: [
                { text: '依赖管理概览', link: '/docs/devlanguage/java/manager/' },
                { text: 'Gradle', link: '/docs/devlanguage/java/manager/gradle' },
                { text: 'Maven', link: '/docs/devlanguage/java/manager/maven' },
              ]
            },
            {
              text: 'Java 框架',
              collapsed: true,
              items: [
                { text: '框架概览', link: '/docs/devlanguage/java/framework/' },
                {
                  text: 'Mybatis',
                  collapsed: true,
                  items: [
                    { text: '概述', link: '/docs/devlanguage/java/framework/mybatis/' },
                    { text: '插件', link: '/docs/devlanguage/java/framework/mybatis/plugin' },
                  ]
                },
                {
                  text: 'Spring',
                  collapsed: true,
                  items: [
                    { text: '体系总览', link: '/docs/devlanguage/java/framework/spring/' },
                    {
                      text: '基础运行模型',
                      collapsed: false,
                      items: [
                        { text: 'Spring 解决了什么问题', link: '/docs/devlanguage/java/framework/spring/foundation/why-spring' },
                        { text: '从启动到 JSON 响应', link: '/docs/devlanguage/java/framework/spring/runtime-model' },
                        { text: 'Framework、Boot 与容器边界', link: '/docs/devlanguage/java/framework/spring/foundation/platform-boundaries' },
                        { text: 'Spring 注解运行机制', link: '/docs/devlanguage/java/framework/spring/annotations' },
                      ],
                    },
                    {
                      text: 'Core Container',
                      collapsed: true,
                      items: [
                        { text: 'IoC 容器与 Bean 生命周期', link: '/docs/devlanguage/java/framework/spring/ioc' },
                      ],
                    },
                    {
                      text: 'AOP、事务与数据访问',
                      collapsed: true,
                      items: [
                        { text: 'AOP 代理与事务入口', link: '/docs/devlanguage/java/framework/spring/aop' },
                      ],
                    },
                    {
                      text: 'Web',
                      collapsed: true,
                      items: [
                        { text: 'Spring MVC 请求链', link: '/docs/devlanguage/java/framework/spring/mvc' },
                      ],
                    },
                    {
                      text: 'Spring Boot',
                      collapsed: true,
                      items: [
                        { text: 'Spring Boot 总览', link: '/docs/devlanguage/java/framework/spring/springboot' },
                        { text: 'SpringApplication 启动过程', link: '/docs/devlanguage/java/framework/spring/boot-startup' },
                        { text: 'Config Data 与配置绑定', link: '/docs/devlanguage/java/framework/spring/boot-config-data' },
                        { text: '自动配置与条件退让', link: '/docs/devlanguage/java/framework/spring/boot-autoconfiguration' },
                        { text: '配置与生产运行', link: '/docs/devlanguage/java/framework/spring/boot-production' },
                      ],
                    },
                    { text: '源码视频系列', link: '/docs/devlanguage/java/framework/spring/video-series' },
                  ]
                },
              ]
            },
          ]
        },
        {
          text: 'Rust',
          collapsed: true,
          items: [
            { text: 'Rust 概览', link: '/docs/devlanguage/rust/' },
            { text: '视频学习系列', link: '/docs/devlanguage/rust/video-series' },
            { text: '基础概念', link: '/docs/devlanguage/rust/basic' },
            { text: '所有权与借用', link: '/docs/devlanguage/rust/ownership' },
            { text: '类型系统与错误处理', link: '/docs/devlanguage/rust/type-system' },
            { text: '并发与异步', link: '/docs/devlanguage/rust/concurrency' },
            { text: '核心优势', link: '/docs/devlanguage/rust/advantages' },
            { text: '发展历程', link: '/docs/devlanguage/rust/history' },
            { text: '生态系统', link: '/docs/devlanguage/rust/ecosystem' },
            { text: '工具链与工程实践', link: '/docs/devlanguage/rust/tooling' },
            { text: '动手入门路径', link: '/docs/devlanguage/rust/hands-on' },
            { text: '排错手册', link: '/docs/devlanguage/rust/troubleshooting' },
            { text: '项目实战路线', link: '/docs/devlanguage/rust/project-practice' },
            { text: '学习路线与选型', link: '/docs/devlanguage/rust/learning-path' },
          ]
        },
        {
          text: 'Python',
          collapsed: true,
          items: [
            { text: 'Python 概览', link: '/docs/devlanguage/python/' },
            {
              text: 'Python 基础客户教程',
              collapsed: true,
              items: [
                { text: '系列导读', link: '/docs/devlanguage/python/basics-series/' },
                { text: '00. 基础工具能力地图', link: '/docs/devlanguage/python/basics-series/00-python-basics-course-map' },
                { text: '01. 客户名单数据检查', link: '/docs/devlanguage/python/basics-series/01-customer-list-data-cleaning' },
                { text: '02. 安装、运行和脚本文件', link: '/docs/devlanguage/python/basics-series/02-run-python-script' },
                { text: '03. 变量和字段类型', link: '/docs/devlanguage/python/basics-series/03-field-types' },
                { text: '04. 列表、字典和表格行', link: '/docs/devlanguage/python/basics-series/04-customer-records-list-dict' },
                { text: '05. 条件判断与业务规则', link: '/docs/devlanguage/python/basics-series/05-customer-rules-if' },
                { text: '06. 循环与批量检查', link: '/docs/devlanguage/python/basics-series/06-batch-loop' },
                { text: '07. 字符串清洗', link: '/docs/devlanguage/python/basics-series/07-string-cleaning' },
                { text: '08. 数字、日期与超期', link: '/docs/devlanguage/python/basics-series/08-numbers-dates-overdue' },
                { text: '09. 函数与规则复用', link: '/docs/devlanguage/python/basics-series/09-functions-reusable-rules' },
                { text: '10. 模块与脚本拆分', link: '/docs/devlanguage/python/basics-series/10-modules-split-script' },
                { text: '11. CSV 读写', link: '/docs/devlanguage/python/basics-series/11-csv-read-write' },
                { text: '12. JSON 与接口数据', link: '/docs/devlanguage/python/basics-series/12-json-api-shape' },
                { text: '13. 表格数据体检', link: '/docs/devlanguage/python/basics-series/13-table-health-check' },
                { text: '14. 分组统计', link: '/docs/devlanguage/python/basics-series/14-group-summary' },
                { text: '15. 订单检查', link: '/docs/devlanguage/python/basics-series/15-order-check' },
                { text: '16. 生成日报', link: '/docs/devlanguage/python/basics-series/16-daily-report' },
                { text: '17. 虚拟环境和依赖', link: '/docs/devlanguage/python/basics-series/17-venv-dependencies' },
                { text: '18. 阅读报错信息', link: '/docs/devlanguage/python/basics-series/18-read-traceback' },
                { text: '19. 异常处理', link: '/docs/devlanguage/python/basics-series/19-exception-handling' },
                { text: '20. 日志', link: '/docs/devlanguage/python/basics-series/20-logging' },
                { text: '21. 调用 API', link: '/docs/devlanguage/python/basics-series/21-api-fetch-customers' },
                { text: '22. 批量文件自动化', link: '/docs/devlanguage/python/basics-series/22-batch-files' },
                { text: '23. 参数配置', link: '/docs/devlanguage/python/basics-series/23-argparse-config' },
                { text: '24. 交付可用小工具', link: '/docs/devlanguage/python/basics-series/24-delivery-package' },
                { text: '25. 类与对象', link: '/docs/devlanguage/python/basics-series/25-classes-and-objects' },
                { text: '26. 第一个可用工具', link: '/docs/devlanguage/python/basics-series/26-first-usable-tool' },
              ],
            },
            {
              text: '并发实战系列',
              collapsed: true,
              items: [
                { text: '系列导读', link: '/docs/devlanguage/python/concurrency-series/' },
                { text: '00. 并发工程全景图', link: '/docs/devlanguage/python/concurrency-series/00-python-concurrency-engineering-map' },
                { text: '01. 先判断瓶颈', link: '/docs/devlanguage/python/concurrency-series/01-find-the-bottleneck-before-concurrency' },
                { text: '02. 并发、并行、异步、流水线', link: '/docs/devlanguage/python/concurrency-series/02-concurrency-parallelism-async-pipeline' },
                { text: '03. Python 并发工具地图', link: '/docs/devlanguage/python/concurrency-series/03-python-concurrency-tool-map' },
                { text: '04. 线程与线程池实战', link: '/docs/devlanguage/python/concurrency-series/04-threadpool-practice' },
                { text: '05. 线程安全与共享状态', link: '/docs/devlanguage/python/concurrency-series/05-thread-safety-shared-state' },
                { text: '06. asyncio 事件循环模型', link: '/docs/devlanguage/python/concurrency-series/06-asyncio-event-loop-model' },
                { text: '07. 异步任务编排', link: '/docs/devlanguage/python/concurrency-series/07-async-task-orchestration' },
                { text: '08. 同步库与异步系统边界', link: '/docs/devlanguage/python/concurrency-series/08-sync-blocking-in-async-system' },
                { text: '09. 进程池与 CPU 密集任务', link: '/docs/devlanguage/python/concurrency-series/09-processpool-cpu-bound-work' },
                { text: '10. 生产者-消费者与任务队列', link: '/docs/devlanguage/python/concurrency-series/10-producer-consumer-task-queue' },
                { text: '11. 限流、背压、重试', link: '/docs/devlanguage/python/concurrency-series/11-rate-limit-backpressure-retry' },
                { text: '12. 批量文件处理实战', link: '/docs/devlanguage/python/concurrency-series/12-file-batch-checkpoint' },
                { text: '13. 批量语音转码与预处理', link: '/docs/devlanguage/python/concurrency-series/13-audio-transcode-preprocess' },
                { text: '14. ASR/TTS API 并发实战', link: '/docs/devlanguage/python/concurrency-series/14-asr-tts-api-concurrency' },
                { text: '15. 本地模型/GPU 推理并发', link: '/docs/devlanguage/python/concurrency-series/15-local-model-gpu-inference' },
                { text: '16. 实时语音流水线', link: '/docs/devlanguage/python/concurrency-series/16-realtime-audio-pipeline' },
                { text: '17. 性能观测与压测', link: '/docs/devlanguage/python/concurrency-series/17-observability-benchmark' },
                { text: '18. GIL 与未来选型', link: '/docs/devlanguage/python/concurrency-series/18-gil-free-threading-future' },
              ],
            },
          ]
        },
        {
          text: 'Flutter',
          collapsed: true,
          items: [
            { text: 'Flutter 概览', link: '/docs/devlanguage/flutter/' },
            { text: '学习路线', link: '/docs/devlanguage/flutter/video-series' },
            { text: '动手入门路径', link: '/docs/devlanguage/flutter/hands-on' },
            { text: '核心架构', link: '/docs/devlanguage/flutter/architecture' },
            { text: '项目实战路线', link: '/docs/devlanguage/flutter/project-practice' },
            { text: '完整项目承接清单', link: '/docs/devlanguage/flutter/project-delivery' },
            { text: '排错手册', link: '/docs/devlanguage/flutter/troubleshooting' },
          ]
        },
        {
          text: '前端开发',
          collapsed: true,
          items: [
            { text: '前端概览', link: '/docs/devlanguage/front/' },
            {
              text: '前端全链路系列',
              collapsed: true,
              items: [
                { text: '系列导读', link: '/docs/devlanguage/front/frontend-foundations-series/' },
                { text: '01. 前端技术全景', link: '/docs/devlanguage/front/frontend-foundations-series/01-modern-frontend-overview' },
                { text: '02. 浏览器导航与渲染', link: '/docs/devlanguage/front/frontend-foundations-series/02-browser-navigation-pipeline' },
                { text: '03. HTML、CSS 与 JavaScript', link: '/docs/devlanguage/front/frontend-foundations-series/03-html-css-javascript-responsibilities' },
                { text: '04. DevTools 排查入口', link: '/docs/devlanguage/front/frontend-foundations-series/04-devtools-evidence-chain' },
                { text: '05. 语义 HTML 与 DOM 结构', link: '/docs/devlanguage/front/frontend-foundations-series/05-semantic-html-dom-structure' },
                { text: '06. HTML 表单与原生校验', link: '/docs/devlanguage/front/frontend-foundations-series/06-html-form-model' },
                { text: '07. CSS 层叠、选择器与样式计算', link: '/docs/devlanguage/front/frontend-foundations-series/07-css-cascade-specificity' },
                { text: '08. 盒模型、Flex 与 Grid', link: '/docs/devlanguage/front/frontend-foundations-series/08-css-layout-flex-grid' },
                { text: '09. 响应式与容器查询', link: '/docs/devlanguage/front/frontend-foundations-series/09-responsive-design' },
                { text: '10. Web 可访问性', link: '/docs/devlanguage/front/frontend-foundations-series/10-web-accessibility-basics' },
                { text: '11. JavaScript 值与作用域', link: '/docs/devlanguage/front/frontend-foundations-series/11-javascript-language-model' },
                { text: '12. DOM 节点与更新', link: '/docs/devlanguage/front/frontend-foundations-series/12-dom-programming' },
                { text: '13. 事件传播与默认行为', link: '/docs/devlanguage/front/frontend-foundations-series/13-browser-event-system' },
                { text: '14. 事件循环与渲染', link: '/docs/devlanguage/front/frontend-foundations-series/14-javascript-event-loop' },
                { text: '15. Fetch 请求与响应', link: '/docs/devlanguage/front/frontend-foundations-series/15-fetch-network-requests' },
                { text: '16. 浏览器存储边界', link: '/docs/devlanguage/front/frontend-foundations-series/16-browser-storage' },
                { text: '17. JavaScript 模块', link: '/docs/devlanguage/front/frontend-foundations-series/17-javascript-modules' },
                { text: '18. TypeScript 类型检查', link: '/docs/devlanguage/front/frontend-foundations-series/18-typescript-static-types' },
                { text: '19. Node.js 与包管理', link: '/docs/devlanguage/front/frontend-foundations-series/19-node-package-management' },
                { text: '20. Vite 开发与构建', link: '/docs/devlanguage/front/frontend-foundations-series/20-vite-build-pipeline' },
                { text: '21. 前端质量门禁', link: '/docs/devlanguage/front/frontend-foundations-series/21-frontend-quality-toolchain' },
                { text: '22. 组件化 UI 与响应式更新模型', link: '/docs/devlanguage/front/frontend-foundations-series/22-component-reactive-ui' },
                { text: '23. 四种框架的架构比较', link: '/docs/devlanguage/front/frontend-foundations-series/23-framework-architecture-comparison' },
                { text: '24. Web 渲染架构', link: '/docs/devlanguage/front/frontend-foundations-series/24-web-rendering-architecture' },
                { text: '25. 路由、快照与编辑草稿', link: '/docs/devlanguage/front/frontend-foundations-series/25-frontend-application-architecture' },
                { text: '26. 前端测试分层', link: '/docs/devlanguage/front/frontend-foundations-series/26-frontend-testing-layers' },
                { text: '27. Web 性能与指标', link: '/docs/devlanguage/front/frontend-foundations-series/27-web-performance-engineering' },
                { text: '28. 前端安全边界', link: '/docs/devlanguage/front/frontend-foundations-series/28-web-frontend-security' },
                { text: '29. 前端交付与可观测性', link: '/docs/devlanguage/front/frontend-foundations-series/29-frontend-delivery-observability' },
                { text: '30. AI 协作与能力验证', link: '/docs/devlanguage/front/frontend-foundations-series/30-ai-assisted-frontend-learning-path' },
                { text: '31. React 状态与外部同步', link: '/docs/devlanguage/front/frontend-foundations-series/31-react-components-hooks-state' },
                { text: '32. Vue 依赖追踪与复用', link: '/docs/devlanguage/front/frontend-foundations-series/32-vue-sfc-reactivity-composition' },
                { text: '33. Angular 注入与状态', link: '/docs/devlanguage/front/frontend-foundations-series/33-angular-di-signals-application-structure' },
              ],
            },
            {
              text: 'Electron 深度科普',
              collapsed: true,
              items: [
                { text: '系列导读', link: '/docs/devlanguage/front/electron-series/' },
                { text: '01. 启动与运行时', link: '/docs/devlanguage/front/electron-series/01-electron-startup-runtime' },
                { text: '02. 多进程模型', link: '/docs/devlanguage/front/electron-series/02-electron-process-model' },
                { text: '03. Preload 与 IPC 安全', link: '/docs/devlanguage/front/electron-series/03-electron-preload-ipc-security' },
                { text: '04. 生命周期与单实例', link: '/docs/devlanguage/front/electron-series/04-electron-lifecycle-single-instance' },
                { text: '05. 构建与发布边界', link: '/docs/devlanguage/front/electron-series/05-electron-forge-build-release' },
                { text: '06. ASAR、Unpack 与 Fuse', link: '/docs/devlanguage/front/electron-series/06-electron-asar-unpack-fuses' },
                { text: '07. 原生模块与 ABI', link: '/docs/devlanguage/front/electron-series/07-electron-native-module-abi' },
                { text: '08. 签名与平台信任', link: '/docs/devlanguage/front/electron-series/08-electron-signing-notarization' },
                { text: '09. 自动更新状态机', link: '/docs/devlanguage/front/electron-series/09-electron-auto-update-state-machine' },
                { text: '10. 性能测量与优化', link: '/docs/devlanguage/front/electron-series/10-electron-performance-measurement' },
              ],
            },
            {
              text: '包管理器',
              collapsed: true,
              items: [
                { text: '包管理器概览', link: '/docs/devlanguage/front/package-managers/' },
                { text: 'npm', link: '/docs/devlanguage/front/package-managers/npm' },
                { text: 'pnpm', link: '/docs/devlanguage/front/package-managers/pnpm' },
                { text: 'Yarn', link: '/docs/devlanguage/front/package-managers/yarn' },
                { text: 'Bun', link: '/docs/devlanguage/front/package-managers/bun' },
                { text: 'Corepack', link: '/docs/devlanguage/front/package-managers/corepack' },
                { text: '镜像与私有源', link: '/docs/devlanguage/front/package-managers/registry' },
              ]
            },
            {
              text: '框架与构建工具',
              collapsed: true,
              items: [
                { text: '框架生态概览', link: '/docs/devlanguage/front/framework/' },
                { text: 'React', link: '/docs/devlanguage/front/framework/react' },
                { text: 'Vue', link: '/docs/devlanguage/front/framework/vue' },
                { text: 'Angular', link: '/docs/devlanguage/front/framework/angular' },
                { text: 'Svelte', link: '/docs/devlanguage/front/framework/svelte' },
                { text: '元框架与全栈框架', link: '/docs/devlanguage/front/framework/meta-frameworks' },
                { text: '轻量框架', link: '/docs/devlanguage/front/framework/lightweight-frameworks' },
                { text: '跨端框架', link: '/docs/devlanguage/front/framework/cross-platform' },
                { text: 'Vite', link: '/docs/devlanguage/front/framework/vite' },
                { text: 'Webpack', link: '/docs/devlanguage/front/framework/webpack' },
                { text: 'Rollup', link: '/docs/devlanguage/front/framework/rollup' },
                { text: 'Parcel', link: '/docs/devlanguage/front/framework/parcel' },
              ]
            },
            { text: '状态管理', link: '/docs/devlanguage/front/state-management/' },
            { text: '质量工具', link: '/docs/devlanguage/front/quality-tools/' },
            { text: '测试策略', link: '/docs/devlanguage/front/testing/' },
            { text: '性能优化', link: '/docs/devlanguage/front/performance/' },
            { text: '前端部署', link: '/docs/devlanguage/front/deployment/' },
          ]
        },
      ]
    }
  ],

  
  // vim
  '/docs/tools/vim/': [
    {
      text: 'vim',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/tools/vim/' },
        { text: '寄存器', link: '/docs/tools/vim/register' },
        { text: '搜索与特殊用法', link: '/docs/tools/vim/special' },
        { text: '插件生态', link: '/docs/tools/vim/plugin' },
      ]
    }
  ],

  // Android Studio
  '/docs/tools/editor/andorid-studio/': [
    {
      text: 'Android Studio',
      collapsed: false,
      items: [
        { text: 'JDK 选择与排错', link: '/docs/tools/editor/andorid-studio/' },
      ]
    }
  ],

  // SDKMAN
  '/docs/tools/sdkman/': [
    {
      text: 'SDKMAN',
      collapsed: false,
      items: [
        { text: 'SDKMAN 概览', link: '/docs/tools/sdkman/' },
      ]
    }
  ],

  // vfox
  '/docs/tools/vfox/': [
    {
      text: 'vfox',
      collapsed: false,
      items: [
        { text: 'vfox 概览', link: '/docs/tools/vfox/' },
      ]
    }
  ],

  // git
  '/docs/tools/git/': [
    {
      text: 'Git',
      collapsed: false,
      items: [
        { text: '概览', link: '/docs/tools/git/' },
        { text: '基础命令', link: '/docs/tools/git/git' },
        { text: '核心概念', link: '/docs/tools/git/concepts' },
        { text: '分支与合并', link: '/docs/tools/git/branching' },
        { text: '协作流程', link: '/docs/tools/git/workflow' },
        { text: '提交规范', link: '/docs/tools/git/conventions' },
        { text: '撤销与恢复', link: '/docs/tools/git/recovery' },
        { text: '对象库与大型仓库', link: '/docs/tools/git/internals-large-repositories' },
        { text: '仓库组织策略', link: '/docs/tools/git/repository-strategies' },
        { text: '安全与治理', link: '/docs/tools/git/security' },
        { text: '进阶操作', link: '/docs/tools/git/advanced' },
        { text: '生态工具', link: '/docs/tools/git/ecosystem' },
        { text: 'GitLab CI/CD 搭建与发布', link: '/docs/tools/git/gitlab-cicd' },
        { text: '视频系列', link: '/docs/tools/git/video-series' },
      ]
    }
  ],


  // 数据库技术
  '/docs/database/': [
    {
      text: '数据库技术',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/database/index' },
        {
          text: '关系型数据库',
          collapsed: true,
          items: [
            {
              text: 'MySQL',
              collapsed: true,
              items: [
                { text: '概述', link: '/docs/database/mysql/index' },
                { text: '基础语法', link: '/docs/database/mysql/basic-syntax' },
                { text: '数据类型设计', link: '/docs/database/mysql/data-types-design' },
                { text: '存储引擎', link: '/docs/database/mysql/storage-engines' },
                { text: '索引系统', link: '/docs/database/mysql/index-system' },
                { text: '事务系统', link: '/docs/database/mysql/transaction-system' },
                { text: '查询优化', link: '/docs/database/mysql/query-optimization' },
                { text: '分区表', link: '/docs/database/mysql/partitioning' },
                { text: '高可用', link: '/docs/database/mysql/high-availability' },
                { text: '备份恢复', link: '/docs/database/mysql/backup-recovery' },
                { text: '安全权限', link: '/docs/database/mysql/security-permissions' },
                { text: '监控运维', link: '/docs/database/mysql/monitoring-operations' },
                { text: '服务模块', link: '/docs/database/mysql/service-modules' },
              ],
            },
            { text: 'PostgreSQL', link: '/docs/database/postgresql' },
          ],
        },
        {
          text: 'NoSQL 与专用数据库',
          collapsed: true,
          items: [
            { text: 'MongoDB', link: '/docs/database/mongodb' },
            { text: 'Redis', link: '/docs/database/redis' },
            { text: 'Elasticsearch', link: '/docs/database/elasticsearch' },
            { text: 'InfluxDB', link: '/docs/database/influxdb' },
            { text: '图数据库', link: '/docs/database/graph-database' },
          ],
        },
        {
          text: '大数据技术',
          collapsed: true,
          items: [
            { text: '概述', link: '/docs/database/bigdata/index' },
            { text: 'Apache Spark', link: '/docs/database/bigdata/apache-spark' },
            { text: 'Apache Flink', link: '/docs/database/bigdata/apache-flink' },
            { text: 'Apache Kafka', link: '/docs/database/bigdata/apache-kafka' },
            { text: 'HDFS', link: '/docs/database/bigdata/hdfs' },
            { text: 'NoSQL 数据库', link: '/docs/database/bigdata/nosql-databases' },
            { text: '数据分层架构', link: '/docs/database/bigdata/data-layering' },
            { text: '数据仓库与数据湖', link: '/docs/database/bigdata/data-warehouse-lake' },
            { text: 'DolphinScheduler', link: '/docs/database/bigdata/dolphinscheduler' },
          ],
        },
      ]
    }
  ],

  // Linux系统
  '/docs/linux/': [
    {
      text: 'Linux系统',
      collapsed: false,
      items: [
        { text: '系统概述', link: '/docs/linux/index' },
        { text: '常用命令', link: '/docs/linux/command/index' },
        { text: '进程管理', collapsed: true, items: [
          { text: '概述', link: '/docs/linux/process/index' },
          { text: 'systemd 服务管理', link: '/docs/linux/process/systemd' },
          { text: '内核线程', link: '/docs/linux/process/kernel-threads' },
          { text: 'Init 进程', link: '/docs/linux/process/init-process' },
          { text: '用户进程', link: '/docs/linux/process/user-processes' }
        ]},
        { text: 'Nginx', collapsed: true, items: [
          { text: '概述', link: '/docs/linux/nginx/nginx' },
          { text: 'location 匹配', link: '/docs/linux/nginx/location' },
          { text: '自动证书续期', link: '/docs/linux/nginx/auto-renew-cert' },
        ]},
      ]
    }
  ],

  // Linux命令详解
  '/docs/linux/command/': [
    {
      text: 'Linux 命令',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/linux/command/index' },
        {
          text: '文件与目录',
          collapsed: true,
          items: [
            { text: '文件基础操作', link: '/docs/linux/command/file-basic' },
            { text: '文件查看与编辑', link: '/docs/linux/command/file-view-edit' },
            { text: '文件查找和定位', link: '/docs/linux/command/file-search' },
            { text: '文件权限和属性', link: '/docs/linux/command/file-permissions' },
          ]
        },
        {
          text: '文本处理',
          collapsed: true,
          items: [
            { text: '文本处理命令', link: '/docs/linux/command/text-processing' },
            { text: '文本比较和合并', link: '/docs/linux/command/text-compare' },
          ]
        },
        {
          text: '系统与进程',
          collapsed: true,
          items: [
            { text: '系统信息', link: '/docs/linux/command/system-info' },
            { text: '系统监控', link: '/docs/linux/command/system-monitoring' },
            { text: '进程管理命令', link: '/docs/linux/command/process' },
            { text: '进程管理速查', link: '/docs/linux/command/process-management' },
          ]
        },
        {
          text: '网络',
          collapsed: true,
          items: [
            { text: '网络命令', link: '/docs/linux/command/network' },
            { text: '网络基础命令', link: '/docs/linux/command/network-basic' },
            { text: '网络配置和诊断', link: '/docs/linux/command/network-config' },
          ]
        },
        {
          text: '权限、用户与环境',
          collapsed: true,
          items: [
            { text: '权限管理', link: '/docs/linux/command/permissions' },
            { text: '用户和权限管理', link: '/docs/linux/command/user-management' },
            { text: '环境变量和配置', link: '/docs/linux/command/environment' },
          ]
        },
        {
          text: '归档和软件包',
          collapsed: true,
          items: [
            { text: '压缩归档命令', link: '/docs/linux/command/archive' },
            { text: '压缩和解压速查', link: '/docs/linux/command/archive-compress' },
            { text: '软件包管理', link: '/docs/linux/command/package' },
          ]
        },
      ]
    }
  ],

  // Nginx配置
  '/docs/linux/nginx/': [
    {
      text: 'Nginx',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/linux/nginx/nginx' },
        { text: 'location 匹配', link: '/docs/linux/nginx/location' },
        { text: '自动证书续期', link: '/docs/linux/nginx/auto-renew-cert' },
      ]
    }
  ],

  // 开发方法
  '/docs/design/develop-pattern/': [
    {
      text: '开发方法',
      collapsed: false,
      items: [
        { text: '总览与阅读路径', link: '/docs/design/develop-pattern/' },
        {
          text: '生命周期与工作组织', collapsed: true,
          items: [
            { text: '瀑布与 V 模型', link: '/docs/design/develop-pattern/waterfall' },
            { text: '迭代与增量', link: '/docs/design/develop-pattern/iterative' },
            { text: '螺旋与风险验证', link: '/docs/design/develop-pattern/spiral' },
            { text: '敏捷、Scrum 与看板', link: '/docs/design/develop-pattern/agile' },
            { text: '精益与价值流', link: '/docs/design/develop-pattern/lean' },
          ]
        },
        {
          text: '实现、验证与交付', collapsed: true,
          items: [
            { text: 'XP、TDD、BDD 与契约测试', link: '/docs/design/develop-pattern/engineering-practices' },
            { text: 'DevOps 与持续交付', link: '/docs/design/develop-pattern/devops' },
          ]
        },
        {
          text: 'AI 编程与组合实践', collapsed: true,
          items: [
            { text: 'AI 编程方式', link: '/docs/design/develop-pattern/ai-coding' },
            { text: '方法选型与组合实践', link: '/docs/design/develop-pattern/selection-practice' },
            { text: 'AI 编程工程化导读', link: '/docs/ai/vibe-coding/' },
          ]
        }
      ]
    }
  ]

};
