/*
 * @Author: Wancheng Wancheng@ideamake.cn
 * @Date: 2024-05-27 08:53:00
 * @LastEditors: Wancheng Wancheng@ideamake.cn
 * @LastEditTime: 2024-11-01 16:49:44
 * @FilePath: /vite/.vitepress/config.mts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vitepress';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { nav } from './navbar.ts';
import { sidebar } from './sidebar.ts';
import { pageHead, pageMetadata, publicRoute, siteDescription, siteUrl } from './seo.mts';

// https://vitepress.dev/reference/site-config
export default  defineConfig({
  base: '/blog/',
  title: '稻草小站',
  lang: 'zh-CN',
  description: siteDescription,
  lastUpdated: true,
  sitemap: {
    hostname: siteUrl,
    transformItems: items => items.filter(item => publicRoute(item.url)),
  },
  async transformPageData(pageData, { siteConfig }) {
    const metadata = await pageMetadata(pageData);
    const updated = { ...pageData, ...metadata };
    return {
      ...metadata,
      frontmatter: {
        ...pageData.frontmatter,
        readingMinutes: readingMinutes(resolve(siteConfig.srcDir, pageData.filePath)),
        head: [...(pageData.frontmatter.head || []), ...pageHead(updated)],
      },
    };
  },
  transformHead({ pageData, description }) {
    // Attribute serialization escapes quotes in excerpts before crawlers read the HTML.
    return [
      ['meta', { name: 'description', content: description }],
      ...(pageData.relativePath === '404.md' ? pageHead(pageData) : []),
    ];
  },
  // logo: 'logo.png',)
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }]
  ],
  themeConfig: {
    logo: {
      light: '/logo-transparent.webp',
      dark: '/logo-transparent.webp',
      // alt: '站点 Logo'
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            displayDetails: '显示详细结果',
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            backButtonTitle: '关闭搜索',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },
    nav: nav,
    sidebar: sidebar,
    outline: {
      label: '本页目录',
    },
    docFooter: { prev: '上一篇', next: '下一篇' },
    footer: {
      message:
        '专题：<a href="/blog/docs/ai/skill/">Agent Skill</a> · <a href="/blog/docs/ai/skill/recommendations">推荐与选型</a>',
      copyright: '稻草小站 · 粤ICP备2026008222号-1',
    },
  },
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const language = token.info.trim().split(/\s+/)[0];

        if (language === 'mermaid') {
          const encoded = Buffer.from(token.content, 'utf8').toString('base64');
          return `<MermaidDiagram code="${encoded}" />`;
        }

        return defaultFence
          ? defaultFence(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options);
      };
    },
  },
})

// Chinese prose is read at roughly 400 characters a minute; code blocks and markup are not counted.
function readingMinutes(file: string) {
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { return 0; }
  text = text.replace(/^---[\s\S]*?\n---/, '').replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/<[^>]+>/g, '');
  const han = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const words = text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g)?.length || 0;
  return Math.round(han / 400 + words / 200);
}
