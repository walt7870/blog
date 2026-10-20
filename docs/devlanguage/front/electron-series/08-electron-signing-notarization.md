# Electron 签名、公证和系统放行是三次检查

桌面应用生成安装包后，操作系统还会检查发布者身份、文件是否被修改，以及平台信任服务是否认可这次分发。macOS 和 Windows 的术语、工具不同，但都需要在最终产物上保存可复核证据。

![macOS签名公证及系统评估](/electron/signing-trust-chain.svg)

例如同事从浏览器下载 ZIP 后首次打开，与开发者在自己的构建目录启动 `.app`，会经历不同的隔离属性和平台检查。本机能启动不能替代下载后的首次启动验收；出现警告应回到签名、公证与产物完整性定位原因。

## DeskLab 历史开发产物的签名状态

对 macOS arm64 的 `DeskLab.app` 执行详细检查，得到：

~~~text
Format=app bundle with Mach-O thin (arm64)
flags=0x20002(adhoc,linker-signed)
Signature=adhoc
TeamIdentifier=not set
Sealed Resources=none
~~~

`spctl -a -vv --type execute` 返回资源封装相关拒绝。结论是：这个本地开发产物可以用于本机实验，但没有可供用户核验的开发者身份，也没有 Apple 公证证据。

## macOS 的交付链

典型顺序是：使用 Developer ID Application 对应用及嵌套代码签名，验证签名结构，提交 Apple Notary Service，等待结果，再把 ticket stapling 到分发物并执行 Gatekeeper 检查。

~~~bash
codesign --verify --deep --strict --verbose=2 DeskLab.app
spctl -a -vv --type execute DeskLab.app
xcrun stapler validate DeskLab.app
~~~

`codesign` 成功说明签名结构可验证；公证提交成功要有请求 ID 与最终 Accepted 状态；`stapler` 和 `spctl` 检查的是用户离线或在线打开时能否识别公证和平台策略。三者不是同一个状态。

ZIP 本身不能直接 stapling；可将票据附到其中的 `.app` 后重新生成 ZIP，或按支持的 DMG/PKG 分发格式处理。重新压缩后更新文件摘要，再从实际下载入口复验。不要把公证任务已提交、上传接口返回成功误写成公证已接受。

签名必须放在所有二进制修改之后。修改 Fuse、重写 Mach-O、替换原生模块或重新打包都会改变被签名内容，需要重新签名并验证。

## Windows 的对应边界

Windows 通常使用受信代码签名证书为 EXE/MSI 签名，再用系统工具验证签名、时间戳与证书链。SmartScreen 还会结合证书和下载信誉做判断。签名有效不保证立即拥有足够信誉，安装器能启动也不证明升级、卸载和回滚正常。

## CI 中不要混用密钥和构建日志

签名身份应来自受控密钥服务或 CI secret，最小化可访问范围，日志只记录证书标识、时间戳服务、产物摘要和验证结果。不要打印私钥、证书密码或完整环境变量。

发布记录建议包含：产物 SHA-256、签名身份、签名时间戳、Apple 公证请求与最终状态，或 Windows 验签输出，以及一台干净机器上的首次启动结果。只有这些证据齐全，才能把状态从“已构建”推进到“可交付”。
