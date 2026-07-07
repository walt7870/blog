# Flutter 项目实战路线

推荐用一个任务管理 App 作为练习项目。它足够小，可以独立完成；又足够完整，能覆盖真实 Flutter 工程里的关键问题。

## 功能范围

- 登录与用户信息。
- 任务列表、详情、创建、编辑、删除。
- 搜索、筛选、分页。
- 本地缓存和离线草稿。
- 错误重试和空状态。
- 基础主题和组件库。
- 单元测试、Widget 测试和构建发布。

## 推荐目录

```text
lib/
  core/
    network/
    storage/
    logging/
    error/
  shared/
    widgets/
    theme/
  features/
    auth/
    task/
      presentation/
      application/
      data/
      domain/
```

`presentation` 放页面和组件，`application` 放状态和用例编排，`data` 放接口、缓存和 Repository 实现，`domain` 放业务模型和规则。

## 状态设计

每个页面至少定义清楚四类状态：

| 状态 | 页面表现 |
| --- | --- |
| Loading | 骨架屏或加载指示 |
| Success | 正常内容 |
| Empty | 空数据说明和下一步动作 |
| Error | 错误原因、重试入口、必要日志 |

复杂页面可以进一步拆出 `refreshing`、`loadingMore`、`offline`、`partialError` 等状态。

## 接口与缓存

Repository 是数据边界。页面不直接知道数据来自网络还是本地：

1. 先从缓存读取可用数据。
2. 同时发起网络刷新。
3. 网络成功后写回缓存。
4. 网络失败时展示可恢复错误。
5. 离线写入进入同步队列。

## 测试和发布

最小质量门禁：

```bash
dart format --set-exit-if-changed .
flutter analyze
flutter test
```

发布前确认：

- 多环境配置没有串。
- Android 和 iOS 签名可追溯。
- 权限文案和隐私说明完整。
- 崩溃、日志、性能和关键埋点已接入。
- 发布记录包含版本、提交、环境和回滚方案。
