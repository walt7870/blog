export type CategoryKey =
  | 'ai'
  | 'architecture'
  | 'database'
  | 'devlanguage'
  | 'linux'
  | 'tools'

export interface CategorySection {
  key: CategoryKey
  name: string
  subtitle: string
  emoji: string
  accent: string
  intro: string
  sourceName: string
  sourceUrl: string
}

export interface LinkItem {
  id: string
  category: CategoryKey
  title: string
  summary: string
  url: string
  source: string
  tag: string
}

const BASE = 'https://niuwancheng.cn/blog'

export const categorySections: CategorySection[] = [
  {
    key: 'ai',
    name: '人工智能',
    subtitle: '大模型 · Agent · MCP · Skill',
    emoji: '🤖',
    accent: '#4c8bff',
    intro: '覆盖机器学习基础、大模型 SFT、Agent 编排、MCP 协议以及 Claude Agent Skill 推荐与选型。',
    sourceName: 'AI 专栏',
    sourceUrl: `${BASE}/docs/ai/`
  },
  {
    key: 'architecture',
    name: '架构设计',
    subtitle: '分层 · 微服务 · DDD · 云原生',
    emoji: '🏛️',
    accent: '#7b61ff',
    intro: '从分层架构、事件驱动到 CQRS、DDD、TOGAF，配套容器与设计模式，构建完整的架构知识体系。',
    sourceName: '架构专栏',
    sourceUrl: `${BASE}/docs/design/architecture/`
  },
  {
    key: 'database',
    name: '数据库 & 大数据',
    subtitle: 'MySQL · Redis · Kafka · Flink',
    emoji: '🗄️',
    accent: '#36c5f0',
    intro: '从 MySQL 内核、Redis、Elasticsearch 等关系 / 非关系数据库，到 Spark、Flink、HDFS 等大数据栈。',
    sourceName: '数据库专栏',
    sourceUrl: `${BASE}/docs/database/`
  },
  {
    key: 'devlanguage',
    name: '开发语言',
    subtitle: 'Java 基础 · 框架 · JVM · JDK',
    emoji: '☕',
    accent: '#f59f3a',
    intro: 'Java 体系内的基础语法、Spring / Mybatis 等框架、JVM 运行时与 GC，以及 JDK 版本演进。',
    sourceName: 'Java 专栏',
    sourceUrl: `${BASE}/docs/devlanguage/java/`
  },
  {
    key: 'linux',
    name: 'Linux 系统',
    subtitle: '命令 · 进程 · Nginx',
    emoji: '🐧',
    accent: '#3ec6a8',
    intro: 'Linux 常用命令、进程与 systemd 机制，Nginx 配置与证书续期实战。',
    sourceName: 'Linux 专栏',
    sourceUrl: `${BASE}/docs/linux/`
  },
  {
    key: 'tools',
    name: '开发工具',
    subtitle: 'Vim · 消息队列 · 版本管理',
    emoji: '🛠️',
    accent: '#ff6a8b',
    intro: 'Vim 效率技巧、消息中间件（Kafka / RabbitMQ / RocketMQ / Pulsar），以及 vfox / sdkman 版本管理。',
    sourceName: '工具专栏',
    sourceUrl: `${BASE}/docs/tools/vim/`
  }
]

export const linkFeed: LinkItem[] = [
  // ==== AI ====
  {
    id: 'ai-overview',
    category: 'ai',
    tag: '概览',
    title: '人工智能概述',
    summary: '从科幻到现实的智能革命，介绍 AI 基本概念与发展脉络。',
    url: `${BASE}/docs/ai/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-skill',
    category: 'ai',
    tag: 'Agent Skill',
    title: 'Agent Skill 概述',
    summary: 'Claude Agent Skill 的设计理念、能力边界与工程实践。',
    url: `${BASE}/docs/ai/skill/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-skill-recommend',
    category: 'ai',
    tag: 'Agent Skill',
    title: 'Skill 推荐与选型',
    summary: '主流 Skill 的使用场景对比，帮助快速完成技术选型。',
    url: `${BASE}/docs/ai/skill/recommendations`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-ml',
    category: 'ai',
    tag: '机器学习',
    title: '机器学习',
    summary: '监督 / 无监督学习、常见算法与工程化落地思路。',
    url: `${BASE}/docs/ai/ml`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-mcp',
    category: 'ai',
    tag: '协议',
    title: 'MCP',
    summary: 'Model Context Protocol 的核心概念与典型实现。',
    url: `${BASE}/docs/ai/mcp`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-agent',
    category: 'ai',
    tag: '智能体',
    title: '智能体',
    summary: 'Agent 的编排、记忆与工具调用范式。',
    url: `${BASE}/docs/ai/agent`,
    source: '稻草人的技术小站'
  },
  {
    id: 'ai-llm',
    category: 'ai',
    tag: '大模型',
    title: '大模型概述与 SFT',
    summary: '大模型基础原理、监督微调（SFT）流程与实战要点。',
    url: `${BASE}/docs/ai/llm/`,
    source: '稻草人的技术小站'
  },

  // ==== 架构 ====
  {
    id: 'arch-overview',
    category: 'architecture',
    tag: '架构设计',
    title: '架构设计概述',
    summary: '架构设计的目标、权衡与常见风格速览。',
    url: `${BASE}/docs/design/architecture/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-layered',
    category: 'architecture',
    tag: '架构风格',
    title: '分层架构',
    summary: '经典三层 / 四层架构的定义、优势与适用场景。',
    url: `${BASE}/docs/design/architecture/layered-architecture`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-microservices',
    category: 'architecture',
    tag: '架构风格',
    title: '微服务架构',
    summary: '服务拆分原则、通信机制、治理与可观测性。',
    url: `${BASE}/docs/design/architecture/microservices-architecture`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-cqrs',
    category: 'architecture',
    tag: '架构风格',
    title: 'CQRS 架构',
    summary: '命令与查询职责分离的动机、落地模式与注意事项。',
    url: `${BASE}/docs/design/architecture/cqrs-architecture`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-ddd',
    category: 'architecture',
    tag: 'DDD',
    title: '领域驱动设计 DDD',
    summary: '核心概念、聚合根、限界上下文与实践指南。',
    url: `${BASE}/docs/design/architecture/DDD/domain-driven-design`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-container',
    category: 'architecture',
    tag: '容器',
    title: '容器与编排',
    summary: 'Docker、Kubernetes 核心资源与 Operator 模式。',
    url: `${BASE}/docs/container/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-design-pattern',
    category: 'architecture',
    tag: '设计模式',
    title: '设计模式',
    summary: '创建型、结构型、行为型模式的系统梳理。',
    url: `${BASE}/docs/design/design-pattern/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'arch-develop-pattern',
    category: 'architecture',
    tag: '开发模式',
    title: '开发模式',
    summary: '瀑布、敏捷、DevOps、精益等交付方法论。',
    url: `${BASE}/docs/design/develop-pattern/`,
    source: '稻草人的技术小站'
  },

  // ==== 数据 ====
  {
    id: 'db-overview',
    category: 'database',
    tag: '数据库',
    title: '数据库技术概述',
    summary: '关系型、文档、KV、搜索、时序、图数据库全景。',
    url: `${BASE}/docs/database/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'db-mysql',
    category: 'database',
    tag: 'MySQL',
    title: 'MySQL 专栏',
    summary: '从基础语法到存储引擎、事务、查询优化与高可用。',
    url: `${BASE}/docs/database/mysql/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'db-redis',
    category: 'database',
    tag: 'Redis',
    title: 'Redis',
    summary: '数据结构、持久化、集群与典型使用场景。',
    url: `${BASE}/docs/database/redis`,
    source: '稻草人的技术小站'
  },
  {
    id: 'db-es',
    category: 'database',
    tag: '搜索',
    title: 'Elasticsearch',
    summary: '倒排索引、查询 DSL、集群与调优要点。',
    url: `${BASE}/docs/database/elasticsearch`,
    source: '稻草人的技术小站'
  },
  {
    id: 'db-mongo',
    category: 'database',
    tag: '文档数据库',
    title: 'MongoDB',
    summary: '文档模型、聚合管道、副本集与分片架构。',
    url: `${BASE}/docs/database/mongodb`,
    source: '稻草人的技术小站'
  },
  {
    id: 'bd-overview',
    category: 'database',
    tag: '大数据',
    title: '大数据技术概述',
    summary: '数据分层、数据仓库与数据湖的演进。',
    url: `${BASE}/docs/database/bigdata/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'bd-spark',
    category: 'database',
    tag: '大数据',
    title: 'Apache Spark',
    summary: '批处理 / 流处理统一引擎的原理与实践。',
    url: `${BASE}/docs/database/bigdata/apache-spark`,
    source: '稻草人的技术小站'
  },
  {
    id: 'bd-flink',
    category: 'database',
    tag: '大数据',
    title: 'Apache Flink',
    summary: '状态管理、时间语义与流批一体实现。',
    url: `${BASE}/docs/database/bigdata/apache-flink`,
    source: '稻草人的技术小站'
  },

  // ==== 开发语言 ====
  {
    id: 'java-basic',
    category: 'devlanguage',
    tag: 'Java 基础',
    title: 'Java 基础',
    summary: '基础语法、工具类与语言特性的系统回顾。',
    url: `${BASE}/docs/devlanguage/java/basic/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'java-framework',
    category: 'devlanguage',
    tag: 'Java 框架',
    title: 'Java 框架',
    summary: 'Spring 生态（IOC / AOP / MVC / Boot）与 Mybatis。',
    url: `${BASE}/docs/devlanguage/java/framework/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'java-jvm',
    category: 'devlanguage',
    tag: 'JVM',
    title: 'JVM 内核',
    summary: '运行时数据区、GC 策略（G1 / ZGC / Shenandoah）。',
    url: `${BASE}/docs/devlanguage/java/jvm/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'java-jdk',
    category: 'devlanguage',
    tag: 'JDK',
    title: 'JDK 演进',
    summary: 'JDK 版本特性演化与升级要点。',
    url: `${BASE}/docs/devlanguage/java/jdk/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'java-manager',
    category: 'devlanguage',
    tag: '依赖管理',
    title: 'Maven & Gradle',
    summary: 'Java 依赖与构建工具的使用与比较。',
    url: `${BASE}/docs/devlanguage/java/manager/`,
    source: '稻草人的技术小站'
  },

  // ==== Linux ====
  {
    id: 'linux-overview',
    category: 'linux',
    tag: 'Linux',
    title: 'Linux 系统概述',
    summary: '发行版、内核与用户空间的基础概念。',
    url: `${BASE}/docs/linux/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'linux-command',
    category: 'linux',
    tag: '命令',
    title: 'Linux 常用命令',
    summary: '文件 / 文本 / 网络 / 权限 / 进程相关命令速查。',
    url: `${BASE}/docs/linux/command/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'linux-process',
    category: 'linux',
    tag: '进程',
    title: '进程管理',
    summary: 'Init、systemd、内核线程与用户进程的全景。',
    url: `${BASE}/docs/linux/process/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'linux-nginx',
    category: 'linux',
    tag: 'Nginx',
    title: 'Nginx 实战',
    summary: '核心配置、location 详解与证书自动续期。',
    url: `${BASE}/docs/linux/nginx/nginx`,
    source: '稻草人的技术小站'
  },

  // ==== 工具 ====
  {
    id: 'tool-vim',
    category: 'tools',
    tag: '编辑器',
    title: 'Vim',
    summary: '终端编辑器、寄存器与高效操作技巧。',
    url: `${BASE}/docs/tools/vim/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'tool-mq',
    category: 'tools',
    tag: '消息队列',
    title: '消息中间件',
    summary: 'Kafka、RabbitMQ、RocketMQ、Pulsar 的对比与实战。',
    url: `${BASE}/docs/tools/mq/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'tool-vfox',
    category: 'tools',
    tag: '版本管理',
    title: 'vfox',
    summary: '跨语言、跨平台的版本管理工具。',
    url: `${BASE}/docs/tools/vfox/`,
    source: '稻草人的技术小站'
  },
  {
    id: 'tool-sdkman',
    category: 'tools',
    tag: '版本管理',
    title: 'sdkman',
    summary: 'JVM 生态构建工具的版本管理利器。',
    url: `${BASE}/docs/tools/sdkman/`,
    source: '稻草人的技术小站'
  }
]

export const homeHighlights = [
  { id: 'ai-skill', label: 'Agent Skill', emoji: '✨' },
  { id: 'arch-ddd', label: '领域驱动设计', emoji: '🧩' },
  { id: 'db-mysql', label: 'MySQL 进阶', emoji: '💾' },
  { id: 'java-jvm', label: 'JVM 内核', emoji: '⚙️' }
]

export const siteInfo = {
  name: '稻草人的技术小站',
  slogan: '专注技术分享与知识传播',
  description:
    '后端、架构、数据、AI、Linux、工具链，系统化整理的技术文档与实战经验。',
  homeUrl: `${BASE}/`
}

export const getCategorySection = (category: CategoryKey) =>
  categorySections.find((item) => item.key === category) || categorySections[0]

export const getLinksByCategory = (category: CategoryKey) =>
  linkFeed.filter((item) => item.category === category)

export const getLinkById = (id: string) =>
  linkFeed.find((item) => item.id === id)
