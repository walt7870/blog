/**
 * parse-md.mjs
 *
 * 共享的 markdown 解析逻辑。
 * 目标：生成带完整 inline 样式的 HTML，在小程序 mp-html 组件里呈现
 * VitePress dark 主题的阅读体验。
 *
 * 为什么全部 inline？
 * - 小程序 rich-text 不认 class
 * - mp-html 虽然支持 tag-style，但层级选择器有限
 * - inline 样式最可靠，还能顺便支持公众号图文
 */

import fs from 'node:fs'
import path from 'node:path'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

// ============= GitHub dark 风格色板（与 home/category 视觉对齐）=============
const COLORS = {
  bg: '#0d1117',
  bgElevated: '#161b22',
  bgCode: '#161b22',
  text: '#c9d1d9',
  textStrong: '#e6edf3',
  textMute: '#8b949e',
  accent: '#58a6ff',
  accent2: '#7ee787',
  border: '#30363d',
  borderStrong: '#21262d',
  inlineCode: '#79c0ff',
  inlineCodeBg: 'rgba(110,118,129,0.18)',
  // highlight.js token 颜色（GitHub dark 实际值）
  hlKeyword: '#ff7b72',
  hlString: '#a5d6ff',
  hlNumber: '#79c0ff',
  hlComment: '#8b949e',
  hlFunction: '#d2a8ff',
  hlType: '#ffa657',
  hlBuiltin: '#79c0ff',
  hlAttr: '#79c0ff',
  hlOperator: '#ff7b72',
  hlVariable: '#ffa657',
  hlLiteral: '#79c0ff',
  hlTag: '#7ee787',
  hlPunctuation: '#c9d1d9',
  hlSection: '#7ee787',
  hlBullet: '#79c0ff'
}

// markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    // 生成带 class 的 hljs 输出，后面再把 class 转成 inline style
    let inner
    if (lang && hljs.getLanguage(lang)) {
      try {
        inner = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } catch {
        inner = md.utils.escapeHtml(str)
      }
    } else {
      inner = md.utils.escapeHtml(str)
    }
    // 标记 PRE_BLOCK，applyStyles 识别后加特殊样式（代码块外壳）
    return `<pre data-block="code" data-lang="${lang || ''}">${inner}</pre>`
  }
})

// ============= 标签级 inline 样式（GitHub dark）=============
const TAG_STYLES = {
  h1: `display:block;font-size:44rpx;font-weight:700;color:${COLORS.textStrong};margin:48rpx 0 24rpx;padding-bottom:16rpx;border-bottom:1rpx solid ${COLORS.borderStrong};line-height:1.3;`,
  h2: `display:block;font-size:36rpx;font-weight:700;color:${COLORS.textStrong};margin:48rpx 0 20rpx;padding-bottom:12rpx;border-bottom:1rpx solid ${COLORS.borderStrong};line-height:1.4;`,
  h3: `display:block;font-size:32rpx;font-weight:600;color:${COLORS.textStrong};margin:36rpx 0 16rpx;line-height:1.4;`,
  h4: `display:block;font-size:28rpx;font-weight:600;color:${COLORS.textStrong};margin:28rpx 0 12rpx;line-height:1.4;`,
  h5: `display:block;font-size:26rpx;font-weight:600;color:${COLORS.text};margin:22rpx 0 10rpx;`,
  h6: `display:block;font-size:26rpx;font-weight:600;color:${COLORS.textMute};margin:22rpx 0 10rpx;`,
  p: `display:block;font-size:28rpx;line-height:1.85;color:${COLORS.text};margin:20rpx 0;word-break:break-word;`,
  ul: 'display:block;padding-left:44rpx;margin:16rpx 0;',
  ol: 'display:block;padding-left:44rpx;margin:16rpx 0;',
  li: `display:list-item;font-size:28rpx;line-height:1.85;color:${COLORS.text};margin:8rpx 0;`,
  strong: `font-weight:700;color:${COLORS.textStrong};`,
  em: `font-style:italic;color:${COLORS.text};`,
  a: `color:${COLORS.accent};text-decoration:none;word-break:break-all;`,
  blockquote: `display:block;padding:12rpx 24rpx;margin:24rpx 0;border-left:6rpx solid ${COLORS.border};background:transparent;color:${COLORS.textMute};font-size:27rpx;line-height:1.8;`,
  hr: `display:block;height:1rpx;border:none;background:${COLORS.border};margin:40rpx 0;`,
  img: 'display:block;max-width:100%;margin:24rpx auto;border-radius:8rpx;',
  // 表格
  table: `display:table;width:100%;margin:24rpx 0;border-collapse:collapse;font-size:26rpx;color:${COLORS.text};border:1rpx solid ${COLORS.border};border-radius:8rpx;overflow:hidden;`,
  thead: `display:table-header-group;background:${COLORS.bgElevated};`,
  tbody: 'display:table-row-group;',
  tr: 'display:table-row;',
  th: `display:table-cell;padding:16rpx 20rpx;font-weight:600;color:${COLORS.textStrong};border:1rpx solid ${COLORS.border};text-align:left;`,
  td: `display:table-cell;padding:16rpx 20rpx;border:1rpx solid ${COLORS.border};line-height:1.7;vertical-align:top;`
}

// 行内 <code>
const INLINE_CODE_STYLE = `padding:4rpx 12rpx;border-radius:6rpx;font-size:25rpx;color:${COLORS.inlineCode};background:${COLORS.inlineCodeBg};font-family:Consolas,Monaco,monospace;word-break:break-word;`

// 代码块 <pre>
const PRE_BLOCK_STYLE = `display:block;padding:24rpx;margin:24rpx 0;border-radius:8rpx;background:${COLORS.bgCode};color:${COLORS.text};font-size:24rpx;line-height:1.7;font-family:Consolas,Monaco,monospace;overflow-x:auto;white-space:pre;border:1rpx solid ${COLORS.border};`

// 代码块内的 <code> 不需要额外 padding / 背景
const PRE_CODE_STYLE = 'background:transparent;padding:0;color:inherit;font-size:inherit;'

// ============= highlight.js class → inline 颜色 =============
const HLJS_STYLES = {
  'hljs-keyword': `color:${COLORS.hlKeyword};`,
  'hljs-selector-tag': `color:${COLORS.hlKeyword};`,
  'hljs-built_in': `color:${COLORS.hlBuiltin};`,
  'hljs-type': `color:${COLORS.hlType};`,
  'hljs-literal': `color:${COLORS.hlLiteral};`,
  'hljs-number': `color:${COLORS.hlNumber};`,
  'hljs-regexp': `color:${COLORS.hlString};`,
  'hljs-string': `color:${COLORS.hlString};`,
  'hljs-subst': `color:${COLORS.text};`,
  'hljs-symbol': `color:${COLORS.hlLiteral};`,
  'hljs-class': `color:${COLORS.hlType};`,
  'hljs-function': `color:${COLORS.hlFunction};`,
  'hljs-title': `color:${COLORS.hlFunction};`,
  'hljs-params': `color:${COLORS.text};`,
  'hljs-comment': `color:${COLORS.hlComment};font-style:italic;`,
  'hljs-doctag': `color:${COLORS.hlComment};`,
  'hljs-meta': `color:${COLORS.hlComment};`,
  'hljs-section': `color:${COLORS.hlSection};`,
  'hljs-name': `color:${COLORS.hlTag};`,
  'hljs-tag': `color:${COLORS.hlTag};`,
  'hljs-attr': `color:${COLORS.hlAttr};`,
  'hljs-attribute': `color:${COLORS.hlAttr};`,
  'hljs-variable': `color:${COLORS.hlVariable};`,
  'hljs-template-variable': `color:${COLORS.hlVariable};`,
  'hljs-property': `color:${COLORS.hlAttr};`,
  'hljs-bullet': `color:${COLORS.hlBullet};`,
  'hljs-link': `color:${COLORS.accent};text-decoration:underline;`,
  'hljs-selector-id': `color:${COLORS.hlAttr};`,
  'hljs-selector-class': `color:${COLORS.hlType};`,
  'hljs-quote': `color:${COLORS.hlComment};font-style:italic;`,
  'hljs-deletion': 'color:#f97583;',
  'hljs-addition': 'color:#85e89d;',
  'hljs-emphasis': 'font-style:italic;',
  'hljs-strong': 'font-weight:700;'
}

/**
 * 把 hljs 输出的 <span class="hljs-xxx">...</span>
 * 转成 <span style="color:...">...</span>
 */
function convertHljsClassesToInline(html) {
  return html.replace(/<span class="(hljs-[\w-]+)">/g, (match, cls) => {
    const style = HLJS_STYLES[cls]
    return style ? `<span style="${style}">` : '<span>'
  })
}

/**
 * 判断一段 HTML 中某个位置是否在 <pre>...</pre> 内部
 * 用于区分行内 code 和代码块内的 code
 */
function isInsidePre(html, index) {
  const before = html.slice(0, index)
  const lastPreOpen = before.lastIndexOf('<pre')
  const lastPreClose = before.lastIndexOf('</pre>')
  return lastPreOpen > lastPreClose
}

/**
 * 给 HTML 标签注入 inline style
 * 特殊处理：
 * - <pre data-block="code"> 用 PRE_BLOCK_STYLE
 * - <code> 在 <pre> 外走 INLINE_CODE_STYLE，在 <pre> 内走 PRE_CODE_STYLE
 * - hljs class 转 inline 颜色
 */
function applyStyles(html) {
  let result = html

  // 1. 处理 <pre data-block="code">
  result = result.replace(
    /<pre\s+data-block="code"[^>]*>/g,
    `<pre style="${PRE_BLOCK_STYLE}">`
  )

  // 2. 处理 <code>：区分行内与块级
  //    用一个占位过程，先全量扫描定位
  const codeMatches = []
  const codeRegex = /<code(\s[^>]*)?>/g
  let m
  while ((m = codeRegex.exec(result)) !== null) {
    codeMatches.push({ index: m.index, full: m[0], attrs: m[1] || '' })
  }
  // 倒序替换以保持索引正确
  for (let i = codeMatches.length - 1; i >= 0; i--) {
    const item = codeMatches[i]
    const inPre = isInsidePre(result, item.index)
    const style = inPre ? PRE_CODE_STYLE : INLINE_CODE_STYLE
    const replacement = `<code${item.attrs} style="${style}">`
    result = result.slice(0, item.index) + replacement + result.slice(item.index + item.full.length)
  }

  // 3. 其他标签
  for (const [tag, style] of Object.entries(TAG_STYLES)) {
    const tagRegex = new RegExp(`<${tag}(\\s[^>]*?)?>`, 'gi')
    result = result.replace(tagRegex, (match, attrs = '') => {
      if (/\sstyle\s*=/.test(attrs)) return match
      return `<${tag}${attrs || ''} style="${style}">`
    })
  }

  // 4. hljs class → inline
  result = convertHljsClassesToInline(result)

  return result
}

// ============= 对外 API =============

export function scanMarkdownFiles(dir, baseDir) {
  const results = []

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({
          path: fullPath,
          relativePath: path.relative(baseDir, fullPath)
        })
      }
    }
  }

  walk(dir)
  return results
}

export function parseMarkdownFile(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf-8')

  let frontmatter = null
  let content = rawContent

  const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n/)
  if (frontmatterMatch) {
    try {
      const lines = frontmatterMatch[1].split('\n')
      frontmatter = {}
      lines.forEach(line => {
        const match = line.match(/^(\w+):\s*(.+)$/)
        if (match) {
          frontmatter[match[1]] = match[2].replace(/^["']|["']$/g, '')
        }
      })
    } catch {}
    content = rawContent.slice(frontmatterMatch[0].length)
  }

  // 渲染 HTML 并注入 inline 样式
  const rawHtml = md.render(content)
  const html = applyStyles(rawHtml)

  let title = frontmatter?.title || ''
  if (!title) {
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) {
      title = h1Match[1].trim()
    } else {
      title = path.basename(filePath, '.md')
    }
  }

  return { title, html, frontmatter, rawContent }
}

export function inferCategory(relativePath) {
  const parts = relativePath.split(path.sep)

  if (parts[0] === 'design') {
    if (parts[1] === 'architecture') return 'design-architecture'
    if (parts[1] === 'design-pattern') {
      if (parts[2] === 'creational') return 'pattern-creational'
      if (parts[2] === 'structural') return 'pattern-structural'
      if (parts[2] === 'behavioral') return 'pattern-behavioral'
      return 'pattern-creational' // index.md 归 creational
    }
    if (parts[1] === 'develop-pattern') return 'design-architecture'
    return 'design-architecture'
  }

  if (parts[0] === 'database') {
    if (parts[1] === 'bigdata') return 'database-bigdata'
    if (parts[1] === 'mysql') {
      // 按文件名拆：基础语法/数据类型/存储引擎/索引 归 basic，其余归 advanced
      const file = parts[parts.length - 1]
      const basicFiles = ['index.md', 'basic-syntax.md', 'data-types-design.md', 'storage-engines.md', 'index-system.md', 'service-modules.md']
      if (basicFiles.includes(file)) return 'database-mysql-basic'
      return 'database-mysql-advanced'
    }
    return 'database-mysql-basic'
  }

  if (parts[0] === 'container') {
    if (parts[1] === 'docker' || parts[0] === 'docker-component.md') return 'container-docker'
    if (parts[1] === 'resources') {
      // k8s resources 再拆：前半归 k8s-core，后半归 k8s-ext
      const coreResources = ['pod.md', 'deployment.md', 'service.md', 'ingress.md', 'configmap.md', 'secret.md', 'pv-pvc.md', 'statefulset.md', 'daemonset.md', 'job-cronjob.md', 'namespace.md']
      const file = parts[parts.length - 1]
      if (coreResources.includes(file)) return 'container-k8s-core'
      return 'container-k8s-ext'
    }
    if (parts[1] === 'tools' || parts[1] === 'advanced') return 'container-tools'
    const file = parts[parts.length - 1]
    if (file === 'kubernetes.md' || file === 'standard.md') return 'container-k8s-core'
    if (file === 'docker-component.md') return 'container-docker'
    return 'container-docker'
  }

  if (parts[0] === 'devlanguage') {
    if (parts[1] === 'java') {
      if (parts[2] === 'jvm') return 'devlanguage-java-jvm'
      if (parts[2] === 'framework') return 'devlanguage-java-framework'
      return 'devlanguage-java-core'
    }
    if (parts[1] === 'front') return 'devlanguage-front'
    return 'devlanguage-java-core'
  }

  return parts[0]
}

export function generateArticleId(relativePath) {
  return relativePath
    .replace(/\.md$/, '')
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
    .toLowerCase()
}
