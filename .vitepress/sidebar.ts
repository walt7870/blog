// .vitepress/sidebar.ts
import type { DefaultTheme } from 'vitepress';

export const sidebar: DefaultTheme.Sidebar = {
  '/docs/ai/': [
    {
      text: '人工智能',
      items: [
        { text: '概述', link: '/docs/ai/index' },
        {
          text: 'Agent Skill',
          collapsed: false,
          items: [
            { text: 'Skill 概述', link: '/docs/ai/skill/' },
            { text: '推荐与选型', link: '/docs/ai/skill/recommendations' },
          ],
        },
        { text: '机器学习', link: '/docs/ai/ml' },
        { text: 'mcp', link: '/docs/ai/mcp' },
        { text: '智能体', link: '/docs/ai/agent' },
        { text: '大模型', items: [
          { text: '概述', link: '/docs/ai/llm/' },
          { text: 'SFT', link: '/docs/ai/llm/sft' }
        ] },
      ]
    }
  ],
  // 容器相关
  '/docs/container/': 
  [
    {
      text: '容器相关',
      collapsed: false,  
      items: [
        { text: '概述', link: '/docs/container/index' },
        { text: '容器', link: '/docs/container/docker-component' },
        { text: '相关标准', link: '/docs/container/standard' },
        { text: '容器编排', link: '/docs/container/kubernetes' },
        { 
          text: 'kubernetes相关资源', 
          collapsed: false,  
          items: [
            { text: 'Pod', link: '/docs/container/resources/pod' },
            { text: 'Deployment', link: '/docs/container/resources/deployment' },
            { text: 'Service', link: '/docs/container/resources/service' },
            { text: 'Ingress', link: '/docs/container/resources/ingress' },
            { text: 'ConfigMap', link: '/docs/container/resources/configmap' },
            { text: 'Secret', link: '/docs/container/resources/secret' },
            { text: 'PV & PVC', link: '/docs/container/resources/pv-pvc' },
            { text: 'StatefulSet', link: '/docs/container/resources/statefulset' },
            { text: 'DaemonSet', link: '/docs/container/resources/daemonset' },
            { text: 'Job & CronJob', link: '/docs/container/resources/job-cronjob' },
            { text: 'Namespace', link: '/docs/container/resources/namespace' },
            { text: 'ServiceAccount', link: '/docs/container/resources/serviceaccount' },
            { text: 'RBAC', link: '/docs/container/resources/rbac' },
            { text: 'NetworkPolicy', link: '/docs/container/resources/networkpolicy' },
            { text: 'Endpoint', link: '/docs/container/resources/endpoint' },
            { text: 'HPA', link: '/docs/container/resources/hpa' },
            { text: 'VPA', link: '/docs/container/resources/vpa' },
            { text: 'PodDisruptionBudget', link: '/docs/container/resources/poddisruptionbudget' },
            { text: 'LimitRange', link: '/docs/container/resources/limitrange' },
            { text: 'ResourceQuota', link: '/docs/container/resources/resourcequota' },
            { text: 'Custom Resource', link: '/docs/container/resources/customresource' },
         ],
        },
                { 
          text: 'kubernetes进阶', 
          collapsed: false,  
          items: [
            { text: 'CR和CRD', link: '/docs/container/advanced/CR-CRD' },
            { text: 'Operator', link: '/docs/container/advanced/operator' },
         ],
        },
      ],
    }
  ],

  // 架构设计
  '/docs/design/architecture/': [
    {
      text: '架构设计',
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
            { text: 'DDD概述', link: '/docs/design/architecture/DDD/domain-driven-design' },
            { text: '基础概念', link: '/docs/design/architecture/DDD/basic-concept' },
            { text: '聚合根', link: '/docs/design/architecture/DDD/Aggregate' },
            { text: '实践指南', link: '/docs/design/architecture/DDD/practice' },
            { text: '学习笔记', link: '/docs/design/architecture/DDD/learn-note' },
            {
              text: 'UML建模',
              collapsed: true,
              items: [
                { text: 'UML详解', link: '/docs/design/architecture/DDD/uml/uml' }
              ]
            }
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
    text: '创建型模式',
      collapsed: false,  
      items: [
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
    ]
  },



],



  // 后端-java-jvm
  '/docs/devlanguage/java/basic/': [
    {
      text: 'java体系',
      items: [
        { text: '概述', link: '/docs/devlanguage/java/' },
        { text: '基础', items:[
          {text: '基础语法',link: '/docs/devlanguage/java/basic'},
          {text: '基础工具类',link: '/docs/devlanguage/java/basic/base-class'},
          {text: '语言特性',link: '/docs/devlanguage/java/basic/special'},
        ]},
      ]
    }
  ],
  //java 框架
  '/docs/devlanguage/java/framework/':[
        { text: '框架', items:[
          {text: 'Mybatis',items: [
            {text: '概述',link: '/docs/devlanguage/java/framework/mybatis/'},
            {text: '插件',link: '/docs/devlanguage/java/framework/mybatis/plugin'},
          ]},
          {text: 'Spring',items:[
            {text: '概述',link: '/docs/devlanguage/java/framework/spring/'},
            {text: 'AOP',link: '/docs/devlanguage/java/framework/spring/aop'},
            {text: 'IOC',link: '/docs/devlanguage/java/framework/spring/ioc'},
            {text: 'MVC',link: '/docs/devlanguage/java/framework/spring/mvc'},
            {text: 'Springboot',link: '/docs/devlanguage/java/framework/spring/springboot'},
            
          ]},
        ]},
  ],

  //jvm
  '/docs/devlanguage/java/jvm/':[
        {text: 'JVM', items:[
          { text: '运行时数据区', items:[
          {text: '概述',link: '/docs/devlanguage/java/jvm/runtime-area/'},
            {text: '堆', link: '/docs/devlanguage/java/jvm/runtime-area/heap'},
            {text: '栈',link: '/docs/devlanguage/java/jvm/runtime-area/stack'},
            {text: '虚拟机栈',link: '/docs/devlanguage/java/jvm/runtime-area/vm-stack'},
            {text: '程序计数器',link: '/docs/devlanguage/java/jvm/runtime-area/pc'},
            {text: '本地方法栈',link: '/docs/devlanguage/java/jvm/runtime-area/local-stack'},
            {text: '方法区',link: '/docs/devlanguage/java/jvm/runtime-area/method-area'},
            {text: '运行时常量池',link: '/docs/devlanguage/java/jvm/runtime-area/constant-pool'},
        ] },

         {text: 'GC',items:[
            {text: '概述', link: '/docs/devlanguage/java/jvm/gc/'},
            {text: 'Serial',link: '/docs/devlanguage/java/jvm/gc/serial'},
            {text: 'Parallel',link: '/docs/devlanguage/java/jvm/gc/parallel'},
            {text: 'ParNew',link: '/docs/devlanguage/java/jvm/gc/parnew'},
            {text: 'CMS',link: '/docs/devlanguage/java/jvm/gc/cms'},
            {text: 'G1',link: '/docs/devlanguage/java/jvm/gc/g1'},
            {text: 'ZGC',link: '/docs/devlanguage/java/jvm/gc/zgc'},
            {text: 'Shenandoah',link: '/docs/devlanguage/java/jvm/gc/shenandoah'},
            {text: 'Epsilon',link: '/docs/devlanguage/java/jvm/gc/epsilon'},
          ]},

         ]
        },  
  ],
  //jdk
  '/docs/devlanguage/java/jdk/':[
    {text: '概述', link: '/docs/devlanguage/java/jdk/'},
    {text: 'jdk变化', link: '/docs/devlanguage/java/jdk/upgrade'}
  ],
  //依赖管理
  '/docs/devlanguage/java/manager/':[
        { text: '依赖管理', items:[
          {text: 'Gradle',link: '/docs/devlanguage/java/manager/gradle'},
          {text: 'Maven',link: '/docs/devlanguage/java/manager/maven'},
        ]},
  ],

  
  // vim
  '/docs/tools/vim/': [
    {
      text: 'vim',
      items: [
        { text: '概述', link: '/docs/tools/vim/' },
        { text: '寄存器', link: '/docs/tools/vim/register' },
        { text: '特殊字符', link: '/docs/tools/vim/special' },
      ]
    }
  ],


  // 数据库技术
  '/docs/database/': [
    {
      text: '数据库技术',
      items: [
        { text: '概述', link: '/docs/database/index' },
        { text: 'MySQL', items: [
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
        ]},
        { text: 'PostgreSQL', link: '/docs/database/postgresql' },
        { text: 'MongoDB', link: '/docs/database/mongodb' },
        { text: 'Redis', link: '/docs/database/redis' },
        { text: 'Elasticsearch', link: '/docs/database/elasticsearch' },
        { text: 'InfluxDB', link: '/docs/database/influxdb' },
        { text: '图数据库', link: '/docs/database/graph-database' },
      ]
    }
  ],

  // 大数据技术
  '/docs/database/bigdata/': [
    {
      text: '大数据技术',
      items: [
        { text: '概述', link: '/docs/database/bigdata/index' },
        { text: 'Apache Spark', link: '/docs/database/bigdata/apache-spark' },
        { text: 'Apache Flink', link: '/docs/database/bigdata/apache-flink' },
        { text: 'Apache Kafka', link: '/docs/database/bigdata/apache-kafka' },
        { text: 'HDFS', link: '/docs/database/bigdata/hdfs' },
        { text: 'NoSQL数据库', link: '/docs/database/bigdata/nosql-databases' },
        { text: '数据分层架构', link: '/docs/database/bigdata/data-layering' },
        { text: '数据仓库与数据湖', link: '/docs/database/bigdata/data-warehouse-lake' },
        { text: 'DolphinScheduler', link: '/docs/database/bigdata/dolphinscheduler' },
      ]
    }
  ],

  // Linux系统
  '/docs/linux/': [
    {
      text: 'Linux系统',
      items: [
        { text: '系统概述', link: '/docs/linux/index' },
        { text: '常用命令', link: '/docs/linux/command/index' },
        { text: '进程管理', items: [
          { text: '进程管理概述', link: '/docs/linux/process/index' },
          { text: 'systemd 详解', link: '/docs/linux/process/systemd' },
          { text: '内核线程', link: '/docs/linux/process/kernel-threads' },
          { text: 'Init 进程', link: '/docs/linux/process/init-process' },
          { text: '用户进程管理', link: '/docs/linux/process/user-processes' }
        ]},
        { text: 'Nginx', items: [
          { text: '概述', link: '/docs/linux/nginx/nginx' },
          { text: 'location详解', link: '/docs/linux/nginx/location' },
          { text: '自动证书续期', link: '/docs/linux/nginx/auto-renew-cert' },
        ]},
      ]
    }
  ],

  // Linux命令详解
  '/docs/linux/command/': [
    {
      text: 'Linux命令详解',
      items: [
        { text: '概述', link: '/docs/linux/command/index' },
        { text: '文件基础操作', link: '/docs/linux/command/file-basic' },
        { text: '文本处理', link: '/docs/linux/command/text-processing' },
        { text: '系统信息', link: '/docs/linux/command/system-info' },
        { text: '权限管理', link: '/docs/linux/command/permissions' },
        { text: '网络命令', link: '/docs/linux/command/network' },
        { text: '进程管理', link: '/docs/linux/command/process' },
        { text: '压缩归档', link: '/docs/linux/command/archive' },
        { text: '软件包管理', link: '/docs/linux/command/package' },
      ]
    }
  ],

  // Nginx配置
  '/docs/linux/nginx/': [
    {
      text: 'Nginx',
      items: [
        { text: '概述', link: '/docs/linux/nginx/nginx' },
        { text: 'location详解', link: '/docs/linux/nginx/location' },
        { text: '自动证书续期', link: '/docs/linux/nginx/auto-renew-cert' },
      ]
    }
  ],

  // 开发模式
  '/docs/design/develop-pattern/': [
    {
      text: '开发模式',
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
