// .vitepress/nav.ts
import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
    // { text: '概览', link: 'index' },
    { text: '人工智能', link: '/docs/ai/' },
    {
      text: '架构', items: [
        { text: '架构设计', link: '/docs/design/architecture/' },
        { text: '开发模式', link: '/docs/design/develop-pattern/' },
        { text: '容器相关', link: '/docs/container/' },
        { text: '设计模式', link: '/docs/design/design-pattern/' },
      ]
    },
    {
      text: '数据', items: [
        { text: '数据库技术', link: '/docs/database/' },
        { text: '大数据技术', link: '/docs/database/bigdata/' },
      ]
    },
    {
      text: '开发语言', items: [
        {
          text:'JAVA',
          items: [
            {text: 'java基础', link: '/docs/devlanguage/java/basic/'},
            {text: 'java框架', link: '/docs/devlanguage/java/framework/'},
            {text: 'JVM', link: '/docs/devlanguage/java/jvm/'},
            {text: 'jdk', link: '/docs/devlanguage/java/jdk/'},
          ]
        }

      ]
    },





    {
      text: 'Linux系统', items: [
        { text: '系统概述', link: '/docs/linux/index' },
        { text: '常用命令', link: '/docs/linux/command/index' },
        { text: '进程管理', link: '/docs/linux/process/index' },
        { text: 'Nginx', link: '/docs/linux/nginx/nginx' },
      ]
    },
    {
      text: '工具', items: [
        {text: '依赖管理', link: '/docs/devlanguage/java/manager/'},
        {text: '消息中间件', link:"/docs/tools/mq"},
        { text: 'vim', link: '/docs/tools/vim/' },
        { text: 'vfox', link: '/docs/tools/vfox/' },
        { text: 'sdkman', link: '/docs/tools/sdkman/' },
      ]
    }
  ]