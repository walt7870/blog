<script setup lang="ts">
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import catalog from '../../static/catalog.json'

const siteInfo = {
  name: '稻草人的技术小站',
  slogan: '技术笔记与知识归档',
  homeUrl: 'https://niuwancheng.cn/blog/'
}

onShareAppMessage(() => ({
  title: `${siteInfo.name} - ${siteInfo.slogan}`,
  path: '/pages/home/index'
}))

onShareTimeline(() => ({
  title: `${siteInfo.name} - ${siteInfo.slogan}`
}))

const openCategory = (categoryKey: string) => {
  uni.navigateTo({
    url: `/subpackages/${categoryKey}/pages/category`
  })
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">{{ siteInfo.name }}</text>
      <text class="slogan">{{ siteInfo.slogan }}</text>
    </view>

    <view class="section-head">
      <text class="section-title">Categories</text>
      <text class="section-meta">{{ catalog.categories.length }}</text>
    </view>

    <view class="list">
      <view
        v-for="item in catalog.categories"
        :key="item.key"
        class="row"
        hover-class="row-hover"
        :hover-stay-time="80"
        @tap="openCategory(item.key)"
      >
        <view class="row-main">
          <text class="row-name">{{ item.name }}</text>
          <text class="row-key">{{ item.key }}</text>
        </view>
        <view class="row-side">
          <text class="row-count">{{ item.count }}</text>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 48rpx 32rpx 32rpx;
}

.header {
  margin-bottom: 56rpx;
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
  letter-spacing: 0;
  margin-bottom: 12rpx;
}

.slogan {
  display: block;
  font-size: 26rpx;
  color: #8b949e;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
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

.section-meta {
  font-size: 22rpx;
  color: #6e7681;
  font-family: "SF Mono", Menlo, monospace;
}

.list {
  display: flex;
  flex-direction: column;
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
}

.row-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #e6edf3;
}

.row-key {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 22rpx;
  color: #6e7681;
}

.row-side {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.row-count {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 24rpx;
  color: #7ee787;
  min-width: 48rpx;
  text-align: right;
}

.row-arrow {
  font-size: 32rpx;
  color: #484f58;
  line-height: 1;
}
</style>
