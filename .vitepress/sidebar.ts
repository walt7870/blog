// .vitepress/sidebar.ts
import type { DefaultTheme } from 'vitepress';

export const sidebar: DefaultTheme.Sidebar = {
  // 容器相关
  '/docs/container/': [
    {
      text: '容器相关',
      items: [
        { text: '概述', link: '/docs/container/index' },
        { text: '容器', link: '/docs/container/docker-component' },
        { text: '相关标准', link: 'docs/container/standard' },
        { text: 'kubernetes', link: 'docs/container/kubernetes' },
      ]
    }
  ],

  // 领域驱动
  '/docs/DDD/': [
    {
      text: '领域驱动',
      items: [
        { text: '概述', link: '/docs/DDD/index' },
        { text: '基础概念', link: '/docs/DDD/basic-concept' },
        { text: '学习笔记', link: '/docs/DDD/learn-note' },
      ]
    }
  ],

  // 领域驱动
  '/docs/component/': [
    {
      text: '消息中间件',
      items: [
        { text: 'kafka', link: '/docs/component/kafka' },
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
  // {
  //   text: '结构型模式',
  //   items: [
  //     { text: '适配器模式', link: '/docs/design/design-pattern/structural/adapter' },
  //     { text: '桥接模式', link: '/docs/design/design-pattern/structural/bridge' },
  //     { text: '装饰器模式', link: '/docs/design/design-pattern/structural/decorator' },
  //     { text: '代理模式', link: '/docs/design/design-pattern/structural/proxy' },
  //     { text: '外观模式', link: '/docs/design/design-pattern/structural/facade' },
  //     { text: '享元模式', link: '/docs/design/design-pattern/structural/flyweight' },
  //     { text: '组合模式', link: '/docs/design/design-pattern/structural/composite' },
  //   ]
  // },
  // {
  //   text: '行为型模式',
  //   items: [
  //     { text: '模板方法模式', link: '/docs/design/design-pattern/behavioral/template-method' },
  //     { text: '策略模式', link: '/docs/design/design-pattern/behavioral/strategy' },
  //     { text: '观察者模式', link: '/docs/design/design-pattern/behavioral/observer' },
  //     { text: '迭代器模式', link: '/docs/design/design-pattern/behavioral/iterator' },
  //     { text: '责任链模式', link: '/docs/design/design-pattern/behavioral/chain-of-responsibility' },
  //     { text: '状态模式', link: '/docs/design/design-pattern/behavioral/state' },
  //     { text: '命令模式', link: '/docs/design/design-pattern/behavioral/command' },
  //     { text: '备忘录模式', link: '/docs/design/design-pattern/behavioral/memento' },
  //     { text: '解释器模式', link: '/docs/design/design-pattern/behavioral/interpreter' },
  //     { text: '访问者模式', link: '/docs/design/design-pattern/behavioral/visitor' },
  //   ]
  // },



],


  // 后端-java-jvm
  '/docs/devlanguage/java/jvm/': [
    {
      text: 'JVM',
      items: [
        { text: '概述', link: '/docs/devlanguage/java/jvm/jvm' },
        { text: '垃圾回收', link: '/docs/devlanguage/java/jvm/gc/gc' },
        // { text: '内存模型', link: '/docs/DDD/learn-note' },
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
  ]


};
