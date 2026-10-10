export const topicGroups = [
  {
    id: 'development', title: '开发与架构',
    activeMatch: '^/docs/(devlanguage|design|algorithm|embedded)(/|$)',
    topics: [
      { text: '开发语言', description: 'Java、Rust、Python、前端、Electron 与跨端开发', link: '/docs/devlanguage/' },
      { text: '架构设计', description: '领域建模、服务边界与系统演进', link: '/docs/design/architecture/' },
      { text: '设计模式', description: '设计原则与对象协作', link: '/docs/design/design-pattern/' },
      { text: '开发方法', description: '敏捷、迭代、DevOps 与工程协作', link: '/docs/design/develop-pattern/' },
      { text: '算法', description: '基础算法、数据结构与问题求解', link: '/docs/algorithm/' },
      { text: '嵌入式开发', description: 'MCU、RTOS、外设与嵌入式 Linux', link: '/docs/embedded/' },
    ],
  },
  {
    id: 'ai-audio', title: 'AI 与音频',
    activeMatch: '^/docs/(ai(/|$)|basic/acoustics(/|$))',
    topics: [
      { text: '人工智能与语音工程', description: '大模型、Agent、RAG 与流式语音系统', link: '/docs/ai/' },
      { text: '声学与音频', description: '采集播放、前处理、VAD 与 sherpa-onnx', link: '/docs/basic/acoustics/' },
    ],
  },
  {
    id: 'systems-data', title: '系统与数据',
    activeMatch: '^/docs/(database|container|linux|network-proxy|tools/mq|basic/protocol)(/|$)',
    topics: [
      { text: '数据库与数据工程', description: '关系数据库、缓存、检索与数据处理', link: '/docs/database/' },
      { text: '消息中间件', description: '消息传递、消费语义与异步链路', link: '/docs/tools/mq/' },
      { text: '容器与云原生', description: 'Docker、Kubernetes 与容器运行时', link: '/docs/container/' },
      { text: 'Linux 系统', description: '进程、网络、权限与服务运行', link: '/docs/linux/' },
      { text: '通信协议', description: '网络通信、实时传输与工业协议', link: '/docs/basic/protocol/' },
      { text: '网络代理', description: '代理协议、控制与数据平面、部署与排错', link: '/docs/network-proxy/' },
    ],
  },
  {
    id: 'tools', title: '工程工具',
    activeMatch: '^/docs/tools/(git|vim|vfox|sdkman|editor)(/|$)',
    topics: [
      { text: 'Git 与持续交付', description: '版本控制、代码治理与 GitLab CI/CD', link: '/docs/tools/git/' },
      { text: 'Vim', description: '编辑、导航与工作流', link: '/docs/tools/vim/' },
      { text: '运行时管理 · vfox', description: '多语言运行时与版本切换', link: '/docs/tools/vfox/' },
      { text: 'JVM 工具链 · SDKMAN', description: 'JDK 与 JVM 开发工具管理', link: '/docs/tools/sdkman/' },
    ],
  },
];
