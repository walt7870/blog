# 自动更新的核心是一台可恢复状态机

自动更新不是“发现新版本后下载”这一条直线。客户端要先选择匹配版本，再经历检查、下载、校验、等待安装、重启和失败恢复。网络中断、架构不匹配、签名失败和用户延迟重启都必须有明确状态。

![更新候选与可恢复状态](/electron/update-lifecycle.svg)

例如服务器同时保留 1.1.0 和 1.2.0 两个 stable 版本，客户端不应因数组顺序先遇到 1.1.0 就停止。选最高兼容版本还要结合最低系统要求、灰度规则及回滚策略；下方选择器只实现版本、OS、架构和 channel 的本地教学合同。

## 先筛选候选产物

客户端当前身份至少包含版本、平台、CPU 架构和 channel。DeskLab 的隔离实验以 `1.0.0 / darwin / arm64 / stable` 查询三份本地元数据：

| Feed 内容 | 选择结果 |
|---|---|
| darwin/arm64/stable 1.1.0 | 选中 arm64 ZIP |
| 只有 darwin/x64 1.2.0 | `no-candidate` |
| 只有 darwin/arm64/beta 1.3.0 | `no-candidate` |

选择器应该逐项匹配，并在版本比较时使用规范化的语义版本规则。示例在 CommonJS 文件中运行，依赖通过 `npm install semver` 安装；生产 feed 还需对完整字段、URL 和摘要进行结构校验。

~~~js
const semver = require('semver')

function selectUpdate(feed, client) {
  if (!semver.valid(client.version) || !Array.isArray(feed.artifacts)) {
    throw new Error('invalid update contract')
  }
  return feed.artifacts.filter(item => item &&
    item.platform === client.platform &&
    item.arch === client.arch &&
    item.channel === client.channel &&
    semver.valid(item.version) &&
    (client.channel !== 'stable' || semver.prerelease(item.version) === null) &&
    semver.gt(item.version, client.version)
  ).sort((a, b) => semver.rcompare(a.version, b.version))[0] ?? null
}
~~~

架构或 channel 不匹配时返回“无候选”是正确结果，不能退回到任意较新的文件。

## 状态与事件分开记录

检查无候选时回到可继续使用的 `not-available`；用户稍后安装时停留 `downloaded`；下载或校验失败进入 `failed`，记录可重试原因与下次检查时间。状态图中的 `downloaded` 表示该教学模型已完成摘要和签名检查，不应直接照搬某个更新库的同名事件含义。

状态描述客户端现在在哪里；事件记录是谁触发了变化，例如定时检查、用户点击、网络失败、校验失败或退出安装。每次转换应记录旧状态、新状态、版本、artifact ID 和请求编号。

## 下载完成不等于可以安装

客户端下载后需要核对文件长度与 SHA-256，再验证平台签名。元数据本身也必须通过 HTTPS、访问控制或额外签名获得可信来源。只校验下载文件摘要，无法阻止攻击者同时替换文件和未受保护的摘要。

安装前还要处理未保存工作、后台任务和多窗口。用户选择“稍后”时保持 `downloaded`，下一次退出或明确确认后再进入安装。更新重启应使用独立退出意图，避免普通 `close` 处理器把窗口隐藏，导致安装永远无法开始。

## 回滚依赖版本化数据

应用二进制可以回退，用户数据未必可以。数据库迁移和配置格式若只支持单向升级，旧版本启动时会继续失败。更新设计应明确哪些数据迁移可逆、何时备份、失败后由谁恢复，以及旧版本是否能读取新数据。

本地选择器实验只证明候选筛选边界。一次真实发布还要验证 Publisher 上传、feed 公网可达、签名、断点下载、安装重启和失败恢复，并在目标 OS/CPU 上分别执行。
