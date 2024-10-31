/*
 * @Author: Wancheng Wancheng@ideamake.cn
 * @Date: 2024-05-27 08:53:00
 * @LastEditors: Wancheng Wancheng@ideamake.cn
 * @LastEditTime: 2024-10-31 19:33:34
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
      { text: '主页', link: '/' },
      { text: '技术相关', link: '/markdown-examples' },
      // { text: 'Blog', link: '/blog' }
    ],

    sidebar: [
      {
        text: '技术相关',
        collapsible: true,
        collapsed: true,
        items: [
          { text: '容器相关', link: '/docs/container' },
          { text: '数据库', link: '/docs/database' }
        ]
      },
      // {
      //   text: '技术相关2',
      //   collapsible: true,
      //   collapsed: true,
      //   items: [
      //     { text: '容器相关2', link: '/docs/container' },
      //     { text: '数据库2', link: '/docs/database' }
      //   ]
      // }

    ],

    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    // ]
    }
})
