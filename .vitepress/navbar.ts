// .vitepress/nav.ts
import type { DefaultTheme } from 'vitepress';

export const nav: DefaultTheme.NavItem[] = [
    // { text: '概览', link: 'index' },
    {
      text: '人工智能',
      link: '/docs/ai/',
    },
    {
      text: '架构', items: [
        { text: '架构设计', link: '/docs/design/architecture/' },
        { text: '开发模式', link: '/docs/design/develop-pattern/' },
        { text: '容器相关', link: '/docs/container/' },
        { text: '设计模式', link: '/docs/design/design-pattern/' },
      ]
    },
    {
      text: '数据',
      link: '/docs/database/',
    },
    {
      text: '开发语言',
      link: '/docs/devlanguage/',
    },





    {
      text: '基础', items: [
        { text: '通信协议', link: '/docs/basic/protocol/' },
        { text: '声学', link: '/docs/basic/acoustics/' },
      ]
    },
    {
      text: '嵌入式开发',
      link: '/docs/embedded/'
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
        { text: 'Git', link: '/docs/tools/git/' },
        {text: '消息中间件', link:"/docs/tools/mq/"},
        { text: 'vim', link: '/docs/tools/vim/' },
        { text: 'vfox', link: '/docs/tools/vfox/' },
        { text: 'sdkman', link: '/docs/tools/sdkman/' },
      ]
    },
    {
      text: '每日资讯',
      link: 'https://niuwancheng.cn/knology-news/',
    }
  ]
