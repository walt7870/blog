/*
 * @Author: Wancheng Wancheng@ideamake.cn
 * @Date: 2024-05-27 08:53:00
 * @LastEditors: Wancheng Wancheng@ideamake.cn
 * @LastEditTime: 2024-11-01 16:49:44
 * @FilePath: /vite/.vitepress/config.mts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vitepress';

import { nav } from './navbar.ts';
import { sidebar } from './sidebar.ts';

// https://vitepress.dev/reference/site-config
export default  defineConfig({
  base: '/blog/',
  title: '稻草人的文档',
  // logo: 'logo.png',)
  head: [
    ['link', { rel: 'icon', href: '/blog/favicon.ico' }]
  ],
  themeConfig: {
    logo: {
      light: '/logo.png',
      dark: '/logov1.png',
      // alt: '站点 Logo'
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },
    nav: nav,
    sidebar: sidebar
  }
})