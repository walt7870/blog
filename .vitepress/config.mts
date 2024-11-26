/*
 * @Author: Wancheng Wancheng@ideamake.cn
 * @Date: 2024-05-27 08:53:00
 * @LastEditors: Wancheng Wancheng@ideamake.cn
 * @LastEditTime: 2024-11-01 16:49:44
 * @FilePath: /vite/.vitepress/config.mts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


// https://vitepress.dev/reference/site-config
export default {
  // base: '/docs/',
  themeConfig: {
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
    nav: [
      { text: '概览', link: '/index' },
      {
        text: '架构', items: [
          { text: '领域驱动', link: '/docs/DDD/' },
          { text: '容器相关', link: '/docs/container/' }
        ]
      },
      {
        text: '后端', items: [
          // {
          //   text: '开发语言', items: [
          //     { text: 'Java', link: '/' }
          //   ]
          // },
          {
            text: '垃圾回收', items: [
              { text: '概述', link: '/docs/devlanguage/java/gc/gc' },
              // { text: 'G1', link: '/docs/devlanauge/java/gc/g1' }
            ]
          },
          // {
          //   text: 'JVM', items: [
          //     { text: '类加载', link: '/docs/devlanauge/java/gc/gc' },
          //     { text: '内存模型', link: '/docs/devlanauge/java/gc/g1' },
          //     { text: '执行引擎', link: '/docs/devlanauge/java/gc/g1' }
          //   ]
          // },
          // { text: '数据库', link: '...' }
        ]
      },


      {
        text: '工具', items: [
          { text: 'linux', items: [
              { text: "常用命令", link: "/docs/linux/commond" }
            ]
          },
          { text: '编辑器', items: [
              { text: 'vim', link: '/docs/linux/vim' },
              // { text: 'vscode', link: '...' }
            ]
          }
        ]
      }
    ],


    sidebar: {
      // 当用户位于 `guide` 目录时，会显示此侧边栏
      '/docs/container/': [
        {
          text: '容器相关',
          items: [
            { text: '概述', link: '/docs/container/index' },
            { text: '容器', link: '/docs/container/docker-component' },
            {
              text: '容器编排', items: [
                // { text: "kubernetes", link: "" }
              ]
            }
          ]
        }
      ],

      // 当用户位于 `config` 目录时，会显示此侧边栏
      '/docs/DDD/': [
        {
          text: '领域驱动',
          items: [
            { text: '概述', link: '/docs/DDD/index' },
            { text: '基础概念', link: '/docs/DDD/basic-concept' },
            { text: '学习笔记', link: '/docs/DDD/learn-note' },
          ]
        }
      ]

    }
  }
}