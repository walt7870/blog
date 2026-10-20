订单构建与缓存实验

示例基线：JDK 17、Maven 3.9、Gradle 8.11.1。
固定依赖用于重现实验，不作为生产版本推荐。

Maven：
  mvn clean verify
  java -cp target/order-build-lab-1.0.0-SNAPSHOT.jar example.orders.OrderTotal

Gradle：先使用可信的本地 Gradle 生成 Wrapper。
  gradle wrapper --gradle-version 8.11.1 --distribution-type bin
  ./gradlew clean build
  java -cp build/libs/order-build-lab-1.0.0-SNAPSHOT.jar example.orders.OrderTotal

两种构建应各执行4个测试，0失败，主类输出5970。
普通JAR不包含测试依赖，不提供java -jar入口。

Gradle缓存：
  ./gradlew clean
  ./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
  ./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
  ./gradlew clean
  ./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.0
  ./gradlew writeBuildInfo --build-cache --configuration-cache -PbuildVersion=1.0.1
  cat build/generated/build-info/build-info.properties

相同输入可复用工作区输出或缓存；改变版本后文件必须变成release=1.0.1。
实验不访问数据库和外部业务服务。不会执行制品发布或服务部署。
