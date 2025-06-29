// .vitepress/sidebar.ts
import type { DefaultTheme } from 'vitepress';

export const sidebar: DefaultTheme.Sidebar = {
  '/docs/ai/': [
    {
      text: '人工智能',
      items: [
        { text: '概述', link: '/docs/ai/index' },
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
        { text: '相关标准', link: 'docs/container/standard' },
        { text: '容器编排', link: 'docs/container/kubernetes' },
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
        }
      ]
    }
  ],

  //消息中间件 
  '/docs/tools/mq/': [
    {
      text: '概览',
      items: [
        { text: '概览', link: '/docs/tools/mq/' },
        { text: 'kafka', link: '/docs/tools/mq/kafka' },
        { text: 'rocketmq', link: '/docs/tools/mq/rocketmq' },
        { text: 'rabbitmq', link: '/docs/tools/mq/rabbitmq' },
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
  //nginx
  '/docs/linux/nginx/': [
    {
      text: 'nginx',
      items: [
        { text: '概述', link: 'docs/linux/nginx/nginx' },
        { text: 'location详解', link: 'docs/linux/nginx/location' },
      ]
    }
  ],

  // 数据库
  '/docs/database/': [
    {
      text: '数据库技术',
      items: [
        { text: '概述', link: '/docs/database/index' },
        { text: 'MySQL', link: '/docs/database/mysql' },
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
      ]
    }
  ]

};
