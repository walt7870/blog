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
