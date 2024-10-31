/*
 * @Author: Wancheng Wancheng@ideamake.cn
 * @Date: 2024-05-27 08:53:00
 * @LastEditors: niu niuwancheng@gamil.com
 * @LastEditTime: 2024-10-31 23:08:46
 * @FilePath: /vite/.vitepress/config.mts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "稻草人",
  description: "一个博客",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      
      // { text: '主页', link: '/' },
      { text: '技术相关', 
        items: [
          { text: '后端技术',link: '/docs/index' },
          // { text: '数据库', link: '/docs/database' }
        ]
         },
         { text: '阅读记录', 
          items: [
            { text: '记录',link: '/docs/reading/2022-07-31/高效能人士的7个习惯' },
            // { text: '数据库', link: '/docs/database' }
          ],
          activeMatch:'/docs/reading/'
           },
      // { text: 'Blog', link: '/blog' }
    ],

    sidebar: [
      {
        text: '容器相关',
        collapsible: true,
        collapsed: true,
        items: [
          { text: '容器相关', link: '/docs/container/docker-component.md' },
          // { text: '数据库', link: '/docs/database' }
        ]
      },
      // {
      //   text: '数据库相关',
      //   collapsible: true,
      //   collapsed: true,
      //   items: [
      //     { text: '容器相关2', link: '/docs/container' },
      //     { text: '数据库2', link: '/docs/database' }
      //   ]
      // },
      {
        text: '领域驱动',
        collapsible: true,
        collapsed: true,
        items: [
          { text: '概述', link: '/docs/DDD/index' },
          { text: '基本概念', link: '/docs/DDD/basic-concept' },
          { text: '学习笔记', link: 'docs/DDD/learn-note' }
        ]
      },
      {
        text: 'linux',
        collapsible: true,
        collapsed: true,
        items: [
          { text: '常用命令', link: '/docs/linux/commond' },
          { text: 'vim备忘录', link: '/docs/linux/vim' },
          // { text: '学习笔记', link: 'docs/DDD/learn-note' }
        ]
      },


    ],

    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    // ]
    },
      search: {
        provider: 'local'
      }
})
