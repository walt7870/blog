// .vitepress/sidebar.ts
import type { DefaultTheme } from 'vitepress';

export const sidebar: DefaultTheme.Sidebar = {
  // 基础知识 - 通信协议
  '/docs/basic/protocol/': [
    {
      text: '通信协议',
      collapsed: false,
      items: [
        { text: '协议概览', link: '/docs/basic/protocol/' },
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
            { text: '语音唤醒', link: '/docs/basic/acoustics/wake-word' },
            { text: '语音识别', link: '/docs/basic/acoustics/speech-recognition' },
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
        { text: '概述', link: '/docs/ai/' },
        {
          text: 'Agent Skill',
          collapsed: true,
          items: [
            { text: 'Skill 概述', link: '/docs/ai/skill/' },
            { text: '推荐与选型', link: '/docs/ai/skill/recommendations' },
            { text: 'Claude Code 实践', link: '/docs/ai/skill/claude-code-best-practices' },
          ],
        },
        { text: 'Vibe Coding', link: '/docs/ai/vibe-coding/' },
        { text: '机器学习', link: '/docs/ai/ml' },
        { text: 'MCP', link: '/docs/ai/mcp' },
        { text: '智能体', link: '/docs/ai/agent' },
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
        {
          text: 'Basic',
          collapsed: false,
          items: [
            { text: '基础导览', link: '/docs/container/basic/' },
            { text: '核心概念', link: '/docs/container/basic/concepts' },
            { text: '运行时与工具边界', link: '/docs/container/basic/runtimes' },
            { text: '容器标准', link: '/docs/container/basic/standards' },
          ],
        },
        {
          text: 'Docker',
          collapsed: false,
          items: [
            { text: 'Docker 导览', link: '/docs/container/docker/' },
            { text: '常用命令', link: '/docs/container/docker/command' },
            { text: 'Java 应用镜像', link: '/docs/container/docker/java-application' },
          ],
        },
        {
          text: 'Kubernetes',
          collapsed: false,
          items: [
            { text: 'Kubernetes 导览', link: '/docs/container/kubernetes/' },
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
                { text: 'Endpoint', link: '/docs/container/kubernetes/resources/endpoint' },
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
                { text: 'CR 和 CRD', link: '/docs/container/kubernetes/advanced/CR-CRD' },
                { text: 'Operator', link: '/docs/container/kubernetes/advanced/operator' },
              ],
            },
          ],
        },
        {
          text: 'Tools',
          collapsed: false,
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
            { text: '学习笔记', link: '/docs/design/architecture/DDD/learn-note' }
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
          text: 'TOGAF架构框架',
          collapsed: true,
          items: [
            { text: 'TOGAF概述', link: '/docs/design/architecture/togaf/index' },
            { text: '业务架构', link: '/docs/design/architecture/togaf/business-architecture' },
            { text: '数据架构', link: '/docs/design/architecture/togaf/data-architecture' },
            { text: '应用架构', link: '/docs/design/architecture/togaf/application-architecture' },
            { text: '技术架构', link: '/docs/design/architecture/togaf/technology-architecture' },
            { text: 'ADM方法', link: '/docs/design/architecture/togaf/adm-method' },
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
      { text: '抽象方法', link: '/docs/design/design-pattern/creational/abstract-method' },
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
          text: 'Flutter',
          collapsed: true,
          items: [
            { text: 'Flutter 概览', link: '/docs/devlanguage/flutter/' },
            { text: '视频学习系列', link: '/docs/devlanguage/flutter/video-series' },
            { text: '动手入门路径', link: '/docs/devlanguage/flutter/hands-on' },
            { text: '核心架构', link: '/docs/devlanguage/flutter/architecture' },
            { text: '项目实战路线', link: '/docs/devlanguage/flutter/project-practice' },
            { text: '排错手册', link: '/docs/devlanguage/flutter/troubleshooting' },
          ]
        },
        {
          text: '前端开发',
          collapsed: true,
          items: [
            { text: '前端概览', link: '/docs/devlanguage/front/' },
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
        { text: '安全与治理', link: '/docs/tools/git/security' },
        { text: '进阶操作', link: '/docs/tools/git/advanced' },
        { text: '生态工具', link: '/docs/tools/git/ecosystem' },
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

  // 开发模式
  '/docs/design/develop-pattern/': [
    {
      text: '开发模式',
      collapsed: false,
      items: [
        { text: '概述', link: '/docs/design/develop-pattern/index' },
        { text: '瀑布模型', link: '/docs/design/develop-pattern/waterfall' },
        { text: '敏捷开发', link: '/docs/design/develop-pattern/agile' },
        { text: '迭代模型', link: '/docs/design/develop-pattern/iterative' },
        { text: '螺旋模型', link: '/docs/design/develop-pattern/spiral' },
        { text: 'DevOps模式', link: '/docs/design/develop-pattern/devops' },
        { text: '精益开发', link: '/docs/design/develop-pattern/lean' }
      ]
    }
  ]

};
