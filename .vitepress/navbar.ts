// .vitepress/nav.ts
import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
    { text: '概览', link: '/index' },
    {
      text: '架构', items: [
        { text: '领域驱动', link: '/docs/DDD/' },
        { text: '容器相关', link: '/docs/container/' }
      ]
    },
    {
      text: '后端', items: [
        {
          text: 'java', items: [
            { text: 'JVM', link: '/docs/devlanguage/java/jvm/jvm' },
            // { text: '垃圾回收', link: 'docs/devlanguage/java/gc/gc' },
          ]
        },

      ]
    },

    // {
    //   text: '垃圾回收', items: [
    //     { text: '概述', link: '/docs/devlanguage/java/gc/gc' },
    //     // { text: 'G1', link: '/docs/devlanauge/java/gc/g1' }
    //   ]
    // },
    // {
    //   text: 'JVM', items: [
    //     { text: '类加载', link: '/docs/devlanauge/java/gc/gc' },
    //     { text: '内存模型', link: '/docs/devlanauge/java/gc/g1' },
    //     { text: '执行引擎', link: '/docs/devlanauge/java/gc/g1' }
    //   ]
    // },
    // { text: '数据库', link: '...' }



    {
      text: '工具', items: [
        {
          text: 'web服务', items: [
            { text: "nginx概览", link: "/docs/linux/nginx/nginx" },
          ]
        },
        {
          text: '构建工具', items: [
            { text: "gradle", link: "/docs/devlanguage/java/manager/gradle" }
          ]
        },
        {
          text: 'linux', items: [
            { text: "常用命令", link: "/docs/linux/commond" }
          ]
        },
        {
          text: '编辑器', items: [
            { text: 'vim', link: '/docs/linux/vim' },
            // { text: 'vscode', link: '...' }
          ]
        }
      ]
    }
  ]