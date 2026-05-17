/**
 * build-miniapp.mjs
 *
 * 构建小程序内容：
 * 1. 扫描 ../../docs/docs/ 下所有 .md 文件
 * 2. 按分包策略分组
 * 3. 每个分包生成：
 *    - content.json：该分包下所有文章的 { id, title, html }
 *    - pages/article.vue：分包页面，静态 import 同目录的 content.json
 * 4. 生成全局 catalog.json，供首页/分类页使用
 *
 * 运行：node scripts/build-miniapp.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    generateArticleId,
    inferCategory,
    parseMarkdownFile,
    scanMarkdownFiles
} from './parse-md.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = path.resolve(__dirname, '../../docs')
const OUTPUT_DIR = path.resolve(__dirname, '../src')
const SUBPACKAGES_DIR = path.join(OUTPUT_DIR, 'subpackages')
const CATALOG_PATH = path.join(OUTPUT_DIR, 'static', 'catalog.json')

// 分包定义（细粒度拆分，确保每个分包 < 2MB）
const SUBPACKAGES = [
  'ai',
  'container-docker',
  'container-k8s-core',
  'container-k8s-ext',
  'container-tools',
  'database-mysql-basic',
  'database-mysql-advanced',
  'database-bigdata',
  'design-architecture',
  'pattern-creational',
  'pattern-structural',
  'pattern-behavioral',
  'devlanguage-java-core',
  'devlanguage-java-jvm',
  'devlanguage-java-framework',
  'devlanguage-front',
  'linux',
  'tools'
]

// 分包到显示名称的映射
const CATEGORY_NAMES = {
  'ai': '人工智能',
  'container-docker': 'Docker 容器',
  'container-k8s-core': 'K8s 核心资源',
  'container-k8s-ext': 'K8s 扩展资源',
  'container-tools': '容器工具',
  'database-mysql-basic': 'MySQL 基础',
  'database-mysql-advanced': 'MySQL 进阶',
  'database-bigdata': '大数据技术',
  'design-architecture': '架构设计',
  'pattern-creational': '创建型模式',
  'pattern-structural': '结构型模式',
  'pattern-behavioral': '行为型模式',
  'devlanguage-java-core': 'Java 基础',
  'devlanguage-java-jvm': 'JVM',
  'devlanguage-java-framework': 'Java 框架',
  'devlanguage-front': '前端开发',
  'linux': 'Linux 系统',
  'tools': '开发工具'
}

/**
 * 生成分包内的 category.vue 页面
 * 文章元信息（id + title）作为字面量嵌入，避免 vite 把 JSON 识别为共享模块
 */
function generateCategoryVue(categoryKey, categoryName, articlesMeta) {
  // 把 articlesMeta 作为 JS 字面量嵌入（不是 import JSON 模块）
  // 构建期就把序号算好，避免在 wxml 表达式里用 padStart
  const withIndex = articlesMeta.map((item, idx) => ({
    ...item,
    idx: String(idx + 1).padStart(2, '0')
  }))
  const metaLiteral = JSON.stringify(withIndex)

  return `<script setup>
import { ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

// 文章元信息作为字面量，随 category.vue 一起打进分包
const articles = ref(${metaLiteral})

onLoad(() => {
  uni.setNavigationBarTitle({ title: '${categoryName}' })
})

onShareAppMessage(() => ({
  title: '${categoryName} - 稻草小站',
  path: '/subpackages/${categoryKey}/pages/category'
}))

onShareTimeline(() => ({
  title: '${categoryName} - 稻草小站'
}))

const openArticle = (id) => {
  uni.navigateTo({
    url: '/subpackages/${categoryKey}/pages/article?id=' + id
  })
}
<\/script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">${categoryName}</text>
      <text class="slogan">{{ articles.length }} articles</text>
    </view>

    <view v-if="articles.length" class="list">
      <view
        v-for="item in articles"
        :key="item.id"
        class="row"
        hover-class="row-hover"
        :hover-stay-time="80"
        @tap="openArticle(item.id)"
      >
        <text class="row-idx">{{ item.idx }}</text>
        <view class="row-main">
          <text class="row-title">{{ item.title }}</text>
          <text class="row-id">{{ item.id }}</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-text">No articles yet.</text>
    </view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  padding: 48rpx 32rpx 32rpx;
  background: #0d1117;
}

.header {
  margin-bottom: 40rpx;
}

.logo {
  display: block;
  font-family: "SF Mono", Menlo, monospace;
  font-size: 24rpx;
  color: #7ee787;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 12rpx;
}

.slogan {
  display: block;
  font-size: 24rpx;
  color: #8b949e;
  font-family: "SF Mono", Menlo, monospace;
}

.list {
  display: flex;
  flex-direction: column;
  border-top: 1rpx solid #21262d;
}

.row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 8rpx;
  border-bottom: 1rpx solid #21262d;
}

.row-hover {
  background: #161b22;
}

.row-idx {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 22rpx;
  color: #6e7681;
  min-width: 48rpx;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.row-title {
  font-size: 28rpx;
  color: #e6edf3;
  line-height: 1.45;
}

.row-id {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 22rpx;
  color: #6e7681;
}

.row-arrow {
  font-size: 32rpx;
  color: #484f58;
  line-height: 1;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}

.empty-text {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 24rpx;
  color: #6e7681;
}
</style>
`
}

/**
 * 生成分包内的 article.vue 页面
 * 每个分包一个独立的 article.vue，静态 import 同分包的 content.json
 */
function generateArticleVue(categoryKey, fullArticles) {
  // 完整文章内容作为字面量嵌入
  const articlesLiteral = JSON.stringify(fullArticles)

  return `<script setup>
import { ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

// 文章内容作为字面量，随 article.vue 一起打进分包
const allArticles = ${articlesLiteral}

const title = ref('加载中...')
const htmlContent = ref('')
const loading = ref(true)
const error = ref('')

const articleId = ref('')

onLoad((options) => {
  const id = options && options.id
  if (!id) {
    error.value = '缺少文章参数'
    loading.value = false
    return
  }

  articleId.value = id
  const article = allArticles.find((item) => item.id === id)

  if (!article) {
    error.value = '文章不存在'
    loading.value = false
    return
  }

  title.value = article.title
  htmlContent.value = article.html
  uni.setNavigationBarTitle({ title: article.title })
  loading.value = false
})

onShareAppMessage(() => ({
  title: title.value,
  path: '/subpackages/${categoryKey}/pages/article?id=' + articleId.value
}))

onShareTimeline(() => ({
  title: title.value
}))

const goBack = () => {
  uni.navigateBack()
}
<\/script>

<template>
  <view class="page">
    <view v-if="loading" class="state">
      <text class="state-text">loading...</text>
    </view>

    <view v-else-if="error" class="state">
      <text class="state-text error">! {{ error }}</text>
      <view class="back-btn" @tap="goBack">返回</view>
    </view>

    <view v-else class="article">
      <view class="meta-bar">
        <text class="meta-tag">${categoryKey}</text>
        <text class="meta-id">{{ articleId }}</text>
      </view>
      <view class="head">
        <text class="title-text">{{ title }}</text>
      </view>
      <mp-html :content="htmlContent" container-style="font-size:28rpx;line-height:1.85;color:#c9d1d9;" />
    </view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #0d1117;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 60rpx 40rpx;
  gap: 32rpx;
}

.state-text {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 26rpx;
  color: #6e7681;
}

.state-text.error {
  color: #f85149;
}

.back-btn {
  padding: 16rpx 40rpx;
  font-size: 26rpx;
  color: #e6edf3;
  background: #21262d;
  border: 1rpx solid #30363d;
  border-radius: 8rpx;
}

.article {
  padding: 40rpx 32rpx 64rpx;
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.meta-tag {
  padding: 4rpx 14rpx;
  font-family: "SF Mono", Menlo, monospace;
  font-size: 20rpx;
  color: #7ee787;
  background: rgba(126, 231, 135, 0.1);
  border: 1rpx solid rgba(126, 231, 135, 0.2);
  border-radius: 999rpx;
}

.meta-id {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 22rpx;
  color: #6e7681;
}

.head {
  margin-bottom: 32rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #21262d;
}

.title-text {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #e6edf3;
  line-height: 1.35;
}
</style>
`
}

function main() {
  console.log('🚀 开始构建小程序内容...\n')

  // 1. 扫描所有 md 文件
  console.log('📂 扫描 markdown 文件...')
  const files = scanMarkdownFiles(DOCS_DIR, DOCS_DIR)
  console.log(`   找到 ${files.length} 个 .md 文件\n`)

  // 2. 解析并分组
  console.log('📝 解析并分组...')
  const articlesByCategory = {}
  const catalog = []

  SUBPACKAGES.forEach(pkg => {
    articlesByCategory[pkg] = []
  })

  files.forEach(({ path: filePath, relativePath }) => {
    // relativePath 已经是相对于 docs/docs/ 的路径，直接使用
    const category = inferCategory(relativePath)

    // 跳过不在分包列表中的分类
    if (!SUBPACKAGES.includes(category)) {
      console.log(`   ⚠️  跳过未定义分类: ${category} (${relativePath})`)
      return
    }

    try {
      const { title, html, frontmatter } = parseMarkdownFile(filePath)
      const id = generateArticleId(relativePath)

      const article = {
        id,
        title,
        html,
        category,
        path: relativePath,
        frontmatter
      }

      articlesByCategory[category].push(article)

      // catalog 只保留元信息，不含 html
      catalog.push({
        id,
        title,
        category,
        path: relativePath,
        categoryName: CATEGORY_NAMES[category]
      })

      console.log(`   ✓ ${category}/${id}`)
    } catch (err) {
      console.log(`   ✗ 解析失败: ${relativePath}`, err.message)
    }
  })

  console.log(`\n📦 分包统计:`)
  SUBPACKAGES.forEach(pkg => {
    const count = articlesByCategory[pkg].length
    console.log(`   ${pkg}: ${count} 篇`)
  })

  // 3. 输出分包 content.json + category.vue + article.vue 页面
  //    category/article 里把 content 作为字面量内联，避免 vite 把 JSON 模块提升到主包
  console.log('\n💾 写入分包内容...')
  SUBPACKAGES.forEach(pkg => {
    const pkgDir = path.join(SUBPACKAGES_DIR, pkg)
    const pagesDir = path.join(pkgDir, 'pages')
    fs.mkdirSync(pagesDir, { recursive: true })

    // 轻量 content.json 只保留文章元信息（id, title），用于 category 列表页
    // 完整 content 作为字面量嵌入 article.vue 里
    const lightContent = {
      category: pkg,
      categoryName: CATEGORY_NAMES[pkg],
      articles: articlesByCategory[pkg].map(a => ({ id: a.id, title: a.title }))
    }
    const fullArticles = articlesByCategory[pkg]

    // content.json 只做调试用，不被 import
    fs.writeFileSync(path.join(pkgDir, 'content.json'), JSON.stringify(lightContent), 'utf-8')

    // 生成分包 category.vue —— 列表数据作为字面量嵌入
    const categoryVueContent = generateCategoryVue(pkg, CATEGORY_NAMES[pkg], lightContent.articles)
    fs.writeFileSync(path.join(pagesDir, 'category.vue'), categoryVueContent, 'utf-8')

    // 生成分包 article.vue —— 完整 HTML 内容字面量嵌入
    const articleVueContent = generateArticleVue(pkg, fullArticles)
    fs.writeFileSync(path.join(pagesDir, 'article.vue'), articleVueContent, 'utf-8')

    console.log(`   ✓ ${pkg}/pages/category.vue (${lightContent.articles.length} 篇元信息)`)
    console.log(`   ✓ ${pkg}/pages/article.vue (完整内容)`)
  })

  // 4. 输出全局 categories.json（主包瘦身：只保留分类列表）
  console.log('\n💾 写入全局分类目录...')
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true })

  const categoriesData = {
    categories: SUBPACKAGES.map(key => ({
      key,
      name: CATEGORY_NAMES[key],
      count: articlesByCategory[key].length
    }))
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(categoriesData), 'utf-8')
  const catalogSize = (JSON.stringify(categoriesData).length / 1024).toFixed(1)
  console.log(`   ✓ static/catalog.json (${categoriesData.categories.length} 个分类，${catalogSize}KB)\n`)

  console.log('✅ 构建完成！\n')
  console.log('📊 统计:')
  console.log(`   总文章数: ${catalog.length}`)
  console.log(`   分包数: ${SUBPACKAGES.length}`)
  console.log(`   输出目录: ${SUBPACKAGES_DIR}`)
}

main()
