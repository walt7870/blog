// .vitepress/nav.ts
import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
    // { text: '概览', link: 'index' },
    { text: '人工智能', link: '/docs/ai/' },
    {
      text: '架构', items: [
        { text: '架构设计', link: '/docs/design/architecture/' },
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
            {text: '依赖管理', link: '/docs/devlanguage/java/manager/'},
          ]
        }


      ]
    },





    {
      text: '工具', items: [
        {
          text: '消息中间件', link:"/docs/tools/mq",
        },
        {
          text: 'web服务', items: [
            { text: "nginx概览", link: "/docs/linux/nginx/nginx" },
          ]
        },
        // {
        //   text: '依赖管理工具', items: [
        //     { text: "gradle", link: "/docs/devlanguage/java/manager/gradle" },
        //     { text: "maven", link: "/docs/devlanguage/java/manager/maven" }
        //   ]
        // },
        {
          text: 'linux', items: [
            { text: "常用命令", link: "/docs/linux/commond" }
          ]
        },
        {
          text: '编辑器', items: [
            { text: 'vim', link: '/docs/tools/vim/' },
            // { text: 'vscode', link: '...' }
          ]
        }
      ]
    }
  ]