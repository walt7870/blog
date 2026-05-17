<script setup lang="ts">
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { computed } from 'vue'
import catalog from '../../static/catalog.json'

const siteInfo = {
  name: '稻草小站',
  slogan: '技术笔记与知识归档',
  description: '后端 / 架构 / 数据 / AI / Linux / 工具链，系统化整理的技术文档。',
  homeUrl: 'https://niuwancheng.cn/blog/'
}

const totalArticles = computed(() =>
  catalog.categories.reduce((sum, c) => sum + c.count, 0)
)

onShareAppMessage(() => ({
  title: `关于 ${siteInfo.name}`,
  path: '/pages/about/index'
}))

onShareTimeline(() => ({
  title: `关于 ${siteInfo.name}`
}))

const copyUrl = () => {
  uni.setClipboardData({
    data: siteInfo.homeUrl,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'none' })
    }
  })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="logo">$ about</text>
      <text class="title">{{ siteInfo.name }}</text>
      <text class="slogan">{{ siteInfo.slogan }}</text>
    </view>

    <view class="card">
      <text class="desc">{{ siteInfo.description }}</text>
    </view>

    <view class="section-head">
      <text class="section-title">Stats</text>
    </view>

    <view class="stats">
      <view class="stat">
        <text class="stat-num">{{ catalog.categories.length }}</text>
        <text class="stat-label">categories</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ totalArticles }}</text>
        <text class="stat-label">articles</text>
      </view>
    </view>

    <view class="section-head">
      <text class="section-title">Links</text>
    </view>

    <view class="list">
      <view class="row" hover-class="row-hover" :hover-stay-time="80" @tap="copyUrl">
        <view class="row-main">
          <text class="row-name">复制网站链接</text>
          <text class="row-key">{{ siteInfo.homeUrl }}</text>
        </view>
        <text class="row-arrow">⎘</text>
      </view>
    </view>

    <view class="footer">
      <text class="footer-line">© {{ new Date().getFullYear() }} {{ siteInfo.name }}</text>
      <text class="footer-line sub">Built with VitePress · uni-app</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 48rpx 32rpx 32rpx;
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
  font-size: 44rpx;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 12rpx;
}

.slogan {
  display: block;
  font-size: 26rpx;
  color: #8b949e;
}

.card {
  padding: 28rpx;
  background: #161b22;
  border: 1rpx solid #30363d;
  border-radius: 12rpx;
  margin-bottom: 48rpx;
}

.desc {
  display: block;
  font-size: 26rpx;
  line-height: 1.75;
  color: #c9d1d9;
}

.section-head {
  padding: 0 0 16rpx;
  border-bottom: 1rpx solid #30363d;
  margin-bottom: 8rpx;
}

.section-title {
  font-size: 22rpx;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 2rpx;
}

.stats {
  display: flex;
  gap: 16rpx;
  margin: 24rpx 0 48rpx;
}

.stat {
  flex: 1;
  padding: 32rpx 24rpx;
  background: #161b22;
  border: 1rpx solid #30363d;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stat-num {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 48rpx;
  font-weight: 700;
  color: #7ee787;
  line-height: 1;
}

.stat-label {
  font-size: 22rpx;
  color: #8b949e;
  font-family: "SF Mono", Menlo, monospace;
}

.list {
  display: flex;
  flex-direction: column;
  margin-bottom: 48rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 8rpx;
  border-bottom: 1rpx solid #21262d;
}

.row-hover {
  background: #161b22;
}

.row-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 1;
  min-width: 0;
}

.row-name {
  font-size: 28rpx;
  color: #e6edf3;
}

.row-key {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 22rpx;
  color: #6e7681;
  word-break: break-all;
}

.row-arrow {
  font-size: 32rpx;
  color: #58a6ff;
  line-height: 1;
  margin-left: 16rpx;
}

.footer {
  margin-top: 64rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid #21262d;
  text-align: center;
}

.footer-line {
  display: block;
  font-size: 22rpx;
  color: #6e7681;
  line-height: 1.8;
}

.footer-line.sub {
  color: #484f58;
  font-family: "SF Mono", Menlo, monospace;
}
</style>
