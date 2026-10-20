# Flutter 项目交付

交付一份可安装应用，需要把需求、代码、环境、签名、测试与线上版本对应起来。以待办应用为例，Android测试包跑通列表，不代表iOS签名、离线恢复或商店升级已经验证。

![Flutter从接手工程到灰度与恢复的交付链路](/flutter/release-gates.svg)

## 先建立工程基线

接手时记录提交、Flutter精确版本及revision、随附Dart、目标平台与系统范围、依赖锁文件、原生构建工具和发布渠道。SDK constraint是允许范围，`stable` 是移动通道，二者都不能替代固定环境。应用提交 `pubspec.lock`，平台锁文件按工程策略保留。

```bash
flutter --version
flutter doctor -v
flutter devices
flutter pub get --enforce-lockfile
flutter analyze
flutter test
```

`doctor` 报告与目标无关的平台缺项时，不必把所有平台装齐；目标平台的阻断项则必须解决。`--enforce-lockfile` 用于已有锁文件的CI验证，初次解析依赖和有意升级应在开发变更中完成并审查差异。CocoaPods、Swift Package Manager、Gradle等采用哪条链路，按实际Flutter版本、工程与插件核对。

## 环境与初始化

`main` 负责建立绑定并进入明确的初始化入口，避免在build中重复打开数据库或配置客户端。长初始化需要可见的启动与失败状态；登录恢复、首屏数据和可延后插件不必全部阻塞首帧。

`--dart-define` 是编译配置，不是密钥保管库。客户端产物中的地址、Key和开关都可能被提取，不能放服务端秘密；真正敏感凭据由服务端签发、短期使用并按平台安全存储策略保存。

```bash
flutter run --dart-define=APP_ENV=dev
flutter build appbundle --release --dart-define=APP_ENV=prod
flutter build ipa --release --dart-define=APP_ENV=prod
```

Android flavor与iOS scheme还影响应用ID、资源和签名，`APP_ENV` 不会自动创建或切换它们。发布前在产物中核对真实接口、应用身份和观测环境，而非只看命令写了prod。

## 自动检查与设备验收

```bash
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter test integration_test -d <设备ID>
```

最后一条要求工程已配置integration_test且有可用设备，不是随处可运行的单元测试。格式检查不修改源码；静态检查、Widget测试与实机测试分别保护不同边界。具体数据与请求合同见[实战页](./project-practice.md)。

| 验收对象 | 至少覆盖 |
| --- | --- |
| 业务与身份 | 登录过期、账号切换、权限不足、空数据与重复提交 |
| 数据与恢复 | 慢响应、离线草稿、冲突、被终止后的恢复 |
| 布局与操作 | 长文本、字号放大、键盘、横竖屏、系统返回与读屏 |
| 平台能力 | 权限拒绝、系统设置返回、前后台、插件错误 |
| 安装与升级 | 首装、旧版数据迁移、签名、版本号与渠道 |
| 性能 | 目标真机profile与发布包、启动、UI/Raster、内存 |

iOS设备构建通常需要macOS、Xcode与匹配签名；`flutter build ios` 不等于已导出可分发IPA。Android APK和AAB也有不同分发用途。所有结果必须对应具体平台和设备范围，不用“支持多端”替代验收。

## 版本、符号与灰度

保留应用ID、版本与build号、提交、依赖、构建命令、产物校验、签名身份及测试结果。签名私钥和密码放受控密钥存储，不进入仓库或发布日志。

Dart混淆与 `--split-debug-info` 需要保留对应符号文件，原生侧还可能需要dSYM、R8 mapping等；各类符号不是互相替代品。先用测试崩溃验证符号化能定位到该版本，再依赖它排查线上错误。

灰度观察启动、崩溃、关键流程成功率及接口错误，按版本、系统和设备分组。商店通常不能立即降级所有已安装客户端；恢复措施应包括停止扩大、服务端兼容开关、修复版本和数据恢复。服务端回退也必须兼容已经升级的客户端与本地数据，不把“回滚”写成无需验证的承诺。
