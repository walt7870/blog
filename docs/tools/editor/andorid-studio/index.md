# Android Studio

## jdk设置

在 Android Studio 中，“当前使用哪个 JDK”要分 3 个层级理解，对应 3 个不同的入口。只要按下面顺序检查/修改，就能 100% 确定 IDE 到底用哪一套 JDK。

------------------------------------------------
1. **Gradle 构建进程用的 JDK**（决定构建成败）  
   配置路径：  
   **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**  
   - 下拉框里可以直接选“jbr-17”“Download JDK…”或自己“Add Local JDK…”。  
   - 选中后值会写入 `.idea/gradle.xml` 中的 `<option name="gradleJvm" value="…" />`，**仅对当前工程生效**。  
   - **AGP 4.2.1 最低要求 Gradle 6.7.1，对应的 Gradle JDK 必须是 11 ≤ 版本 ≤ 17**；用 8 会报 “Unsupported class file major version …”，用 21 会报 “Gradle JDK version too high”。

2. **项目语言级别/索引用的“Project SDK”**（决定代码提示、高亮）  
   配置路径：  
   **File → Project Structure → Project → SDK / Project SDK**  
   - 这里只影响 Android Studio 的语法解析和编辑器索引，**不影响 Gradle 构建**。  
   - 通常与 Gradle JDK 保持同一大版本即可（例如都选 11 或都选 17）。

3. **IDE 自身运行的 Runtime**（Android Studio 本体用）  
   2024.2+ 的 IDE 自带 JetBrains Runtime 21，**无需手动改**；如果一定要换，  
   **Help → Change IDE Boot Runtime…** 里选择官方提供的 JBR 版本即可。

------------------------------------------------
快速验证当前“构建 JDK”  
在 Android Studio 底部 **Terminal** 执行：  

```bash
# Windows
./gradlew --version | findstr "JVM"

# macOS/Linux
./gradlew --version | grep "JVM"
```

输出示例：  

```bash
JVM:          17.0.12 (JetBrains s.r.o. 17.0.12+1-b1207.1)
```

这里的 17 就是你刚才在“Gradle JDK”里选的版本。

------------------------------------------------
一句话总结  
**真正决定构建用的是“Gradle JDK”那一项**；  
**File → Settings → Build Tools → Gradle → Gradle JDK** 里选好 11~17 之间的版本，点 OK，重新 Sync，就完成了当前项目的 JDK 切换。

## 版本对应关系

| AGP版本 | 最低Gradle版本 | 推荐Gradle版本 | 可用JDK范围 | 编译SDK上限 | 生命周期状态 |
| ----- | ---------- | ---------- | ------- | ------- | ------ |
| 8.6   | 8.6        | 8.6        | 17 ～ 21 | 35      | 开发中    |
| 8.5   | 8.4        | 8.4–8.6    | 17 ～ 21 | 35      | 稳定     |
| 8.4   | 8.4        | 8.4–8.6    | 17 ～ 21 | 35      | 稳定     |
| 8.3   | 8.4        | 8.4        | 17 ～ 21 | 34      | 稳定     |
| 8.2   | 8.2        | 8.2–8.4    | 17 ～ 21 | 34      | 稳定     |
| 8.1   | 8.0        | 8.0–8.2    | 17 ～ 21 | 34      | 稳定     |
| 8.0   | 8.0        | 8.0        | 17 ～ 21 | 34      | 稳定     |
| 7.4   | 7.5        | 7.5–7.6    | 11 ～ 17 | 33      | 稳定     |
| 7.3   | 7.4        | 7.4–7.6    | 11 ～ 17 | 33      | 稳定     |
| 7.2   | 7.3.3      | 7.3.3–7.4  | 11 ～ 17 | 32      | 已弃用    |
| 7.1   | 7.2        | 7.2        | 11 ～ 17 | 31      | 已弃用    |
| 7.0   | 7.0        | 7.0–7.1    | 11 ～ 17 | 31      | 已弃用    |
| 4.2.2 | 6.7.1      | 6.7.1–6.9  | 8 ～ 11  | 30      | 已弃用    |
