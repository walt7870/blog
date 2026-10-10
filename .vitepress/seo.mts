import MarkdownIt from 'markdown-it';
import { createContentLoader } from 'vitepress';
import type { HeadConfig, PageData } from 'vitepress';

export const siteUrl = 'https://niuwancheng.cn/blog/';
export const siteDescription = '稻草小站：面向工程实践的技术知识库，涵盖人工智能与语音、开发语言、系统架构、云原生、数据工程及项目实践。';
const markdown = new MarkdownIt({ html: true });

export function pageRoute(source: string) {
  return source.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '.html');
}

export function publicRoute(route: string) {
  return route === '' || route === 'notes.html' || /^(docs|profile|projects)\//.test(route);
}

export function canonicalUrl(source: string) {
  return new URL(pageRoute(source), siteUrl).href;
}

export function pageHead(page: PageData): HeadConfig[] {
  const url = canonicalUrl(page.relativePath);
  const title = !page.title || page.title === '稻草小站' ? '稻草小站' : `${page.title} | 稻草小站`;
  return [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { name: 'robots', content: publicRoute(pageRoute(page.relativePath)) ? 'index, follow' : 'noindex, follow' }],
    ['meta', { property: 'og:type', content: page.relativePath.startsWith('docs/') ? 'article' : 'website' }],
    ['meta', { property: 'og:site_name', content: '稻草小站' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: page.description }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: page.description }],
  ];
}

export async function pageMetadata(page: PageData) {
  if (page.relativePath === 'index.md') return { description: siteDescription };
  if (page.relativePath === 'profile/index.md') {
    return {
      title: '牛万成 · 个人概览',
      description: '牛万成，10 年以上软件研发经验，兼具技术管理、系统架构与全栈开发能力。项目涉及 AI 与语音、云平台、跨端应用及商业系统。',
    };
  }
  const title = page.title || page.filePath.split('/').at(-1)!.replace(/\.md$/, '');
  const titleMetadata = page.title ? {} : { title };
  if (page.description) return titleMetadata;
  let description = '';
  await createContentLoader(page.filePath, {
    excerpt(file) { description = paragraphDescription(file.content); },
  }).load();
  return { ...titleMetadata, description: description || `${title}，稻草小站技术知识库中的专题内容与工程实践。` };
}

function paragraphDescription(content: string) {
  const tokens = markdown.parse(content, {});
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].type !== 'paragraph_open' || tokens[index].level !== 0) continue;
    const inline = tokens[index + 1];
    if (inline?.type !== 'inline') continue;
    const text = (inline.children || []).map(token => {
      if (token.type === 'text' || token.type === 'code_inline') return token.content;
      if (token.type === 'softbreak' || token.type === 'hardbreak') return ' ';
      return '';
    }).join('').replace(/\s+/g, ' ').trim();
    if (text && !text.startsWith(':::')) {
      return Array.from(text).slice(0, 160).join('');
    }
  }
  return '';
}
