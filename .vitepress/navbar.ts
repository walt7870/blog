import type { DefaultTheme } from 'vitepress';
import { topicGroups } from './topics.ts';

export const nav: DefaultTheme.NavItem[] = [
  ...topicGroups.map(group => ({
    text: group.title, activeMatch: group.activeMatch,
    items: group.topics.map(({ text, link }) => ({ text, link })),
  })),
  {
    text: '阅读', activeMatch: '^/docs/reading(/|$)',
    items: [
      { text: '阅读笔记', link: '/docs/reading/' },
      { text: '每日资讯', link: 'https://niuwancheng.cn/knology-news/' },
    ],
  },
  {
    text: '关于我', activeMatch: '^/(profile|projects)(/|$)',
    items: [
      { text: '个人概览', link: '/profile/' },
      { text: '项目实践', link: '/projects/' },
    ],
  },
];
