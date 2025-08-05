# HDFS (Hadoop Distributed File System) 详解

## 概述

HDFS（Hadoop Distributed File System）是Apache Hadoop项目的核心组件之一，是一个分布式文件系统，专门设计用于在商用硬件集群上存储大量数据。HDFS具有高容错性、高吞吐量和可扩展性的特点，是大数据生态系统的基础存储层。

### 核心特性

- **高容错性**：通过数据副本机制保证数据可靠性
- **高吞吐量**：优化大文件的顺序读写性能
- **可扩展性**：支持PB级数据存储，可动态扩展节点
- **流式数据访问**：适合批处理而非交互式应用
- **简单一致性模型**：一次写入，多次读取
- **跨平台性**：支持多种操作系统和硬件平台

## HDFS架构

### 1. 主从架构

```java
// HDFS架构组件说明
public class HDFSArchitecture {
    
    /**
     * HDFS采用主从架构模式：
     * 
     * 1. NameNode（主节点）：
     *    - 管理文件系统命名空间
     *    - 维护文件系统树和文件/目录的元数据
     *    - 记录每个文件的数据块位置信息
     *    - 处理客户端的文件系统操作请求
     * 
     * 2. DataNode（从节点）：
     *    - 存储实际的数据块
     *    - 定期向NameNode发送心跳和块报告
     *    - 执行数据块的创建、删除和复制操作
     *    - 为客户端提供数据读写服务
     * 
     * 3. Secondary NameNode：
     *    - 辅助NameNode进行元数据的检查点操作
     *    - 定期合并fsimage和edits日志
     *    - 不是NameNode的热备份
     */
    
    /**
     * NameNode元数据管理
     */
    public static class NameNodeMetadata {
        
        // 文件系统命名空间
        private FSDirectory fsDirectory;
        
        // 块管理器
        private BlockManager blockManager;
        
        // 编辑日志
        private FSEditLog editLog;
        
        // 文件系统镜像
        private FSImage fsImage;
        
        /**
         * 文件系统操作示例
         */
        public void fileSystemOperations() {
            // 创建目录
            createDirectory("/user/data");
            
            // 创建文件
            createFile("/user/data/input.txt", (short) 3); // 3个副本
            
            // 获取文件信息
            FileStatus fileStatus = getFileStatus("/user/data/input.txt");
            
            // 列出目录内容
            FileStatus[] files = listStatus("/user/data");
            
            // 删除文件
            delete("/user/data/temp.txt", false);
        }
        
        private void createDirectory(String path) {
            // 在命名空间中创建目录
            System.out.println("创建目录: " + path);
        }
        
        private void createFile(String path, short replication) {
            // 在命名空间中创建文件元数据
            System.out.println("创建文件: " + path + ", 副本数: " + replication);
        }
        
        private FileStatus getFileStatus(String path) {
            // 返回文件状态信息
            return new FileStatus();
        }
        
        private FileStatus[] listStatus(String path) {
            // 返回目录下的文件列表
            return new FileStatus[0];
        }
        
        private boolean delete(String path, boolean recursive) {
            // 删除文件或目录
            System.out.println("删除: " + path);
            return true;
        }
    }
    
    /**
     * DataNode数据管理
     */
    public static class DataNodeStorage {
        
        // 数据存储目录
        private List<String> dataDirectories;
        
        // 块存储管理
        private Map<String, Block> blocks;
        
        /**
         * 数据块操作
         */
        public void blockOperations() {
            // 写入数据块
            writeBlock("blk_1001", "data content".getBytes());
            
            // 读取数据块
            byte[] data = readBlock("blk_1001");
            
            // 复制数据块
            replicateBlock("blk_1001", "target-datanode");
            
            // 删除数据块
            deleteBlock("blk_1001");
            
            // 发送心跳
            sendHeartbeat();
            
            // 发送块报告
            sendBlockReport();
        }
        
        private void writeBlock(String blockId, byte[] data) {
            System.out.println("写入数据块: " + blockId + ", 大小: " + data.length);
        }
        
        private byte[] readBlock(String blockId) {
            System.out.println("读取数据块: " + blockId);
            return new byte[0];
        }
        
        private void replicateBlock(String blockId, String targetNode) {
            System.out.println("复制数据块: " + blockId + " 到 " + targetNode);
        }
        
        private void deleteBlock(String blockId) {
            System.out.println("删除数据块: " + blockId);
        }
        
        private void sendHeartbeat() {
            System.out.println("发送心跳到NameNode");
        }
        
        private void sendBlockReport() {
            System.out.println("发送块报告到NameNode");
        }
    }
    
    // 简单的文件状态类
    public static class FileStatus {
        private String path;
        private long length;
        private boolean isDirectory;
        private short replication;
        private long blockSize;
        private long modificationTime;
        
        // 构造函数和getter/setter方法
    }
    
    // 简单的数据块类
    public static class Block {
        private String blockId;
        private long length;
        private long generationStamp;
        
        // 构造函数和getter/setter方法
    }
}
```

### 2. 数据块机制

```java
// HDFS数据块机制
public class HDFSBlockMechanism {
    
    /**
     * HDFS数据块特性：
     * 
     * 1. 默认块大小：128MB（Hadoop 2.x+）
     * 2. 块是文件存储的基本单位
     * 3. 文件被分割成多个块进行存储
     * 4. 每个块有多个副本分布在不同节点
     * 5. 块的副本数可以配置（默认3个）
     */
    
    private static final long DEFAULT_BLOCK_SIZE = 128 * 1024 * 1024; // 128MB
    private static final short DEFAULT_REPLICATION = 3;
    
    /**
     * 文件分块示例
     */
    public void fileBlockingExample() {
        long fileSize = 300 * 1024 * 1024; // 300MB文件
        long blockSize = DEFAULT_BLOCK_SIZE;
        
        int blockCount = (int) Math.ceil((double) fileSize / blockSize);
        
        System.out.println("文件大小: " + fileSize + " bytes");
        System.out.println("块大小: " + blockSize + " bytes");
        System.out.println("块数量: " + blockCount);
        
        for (int i = 0; i < blockCount; i++) {
            long blockStart = i * blockSize;
            long blockEnd = Math.min(blockStart + blockSize, fileSize);
            long actualBlockSize = blockEnd - blockStart;
            
            System.out.printf("块 %d: 偏移量 %d-%d, 大小 %d bytes%n", 
                            i, blockStart, blockEnd - 1, actualBlockSize);
        }
    }
    
    /**
     * 副本放置策略
     */
    public static class ReplicaPlacementPolicy {
        
        /**
         * HDFS默认副本放置策略：
         * 
         * 1. 第一个副本：放在写入客户端所在的节点
         * 2. 第二个副本：放在不同机架的随机节点
         * 3. 第三个副本：放在第二个副本同机架的不同节点
         * 4. 更多副本：随机放置
         * 
         * 这种策略平衡了可靠性、写入性能和网络带宽使用
         */
        
        public List<String> selectReplicaNodes(String clientNode, int replicationFactor) {
            List<String> replicaNodes = new ArrayList<>();
            
            // 第一个副本：客户端节点
            replicaNodes.add(clientNode);
            
            if (replicationFactor > 1) {
                // 第二个副本：不同机架的节点
                String secondReplica = selectNodeFromDifferentRack(clientNode);
                replicaNodes.add(secondReplica);
            }
            
            if (replicationFactor > 2) {
                // 第三个副本：第二个副本同机架的不同节点
                String thirdReplica = selectNodeFromSameRack(replicaNodes.get(1), replicaNodes);
                replicaNodes.add(thirdReplica);
            }
            
            // 更多副本：随机选择
            for (int i = 3; i < replicationFactor; i++) {
                String additionalReplica = selectRandomNode(replicaNodes);
                replicaNodes.add(additionalReplica);
            }
            
            return replicaNodes;
        }
        
        private String selectNodeFromDifferentRack(String clientNode) {
            // 模拟选择不同机架的节点
            return "rack2-node1";
        }
        
        private String selectNodeFromSameRack(String referenceNode, List<String> excludeNodes) {
            // 模拟选择同机架的不同节点
            return "rack2-node2";
        }
        
        private String selectRandomNode(List<String> excludeNodes) {
            // 模拟随机选择节点
            return "rack3-node1";
        }
    }
    
    /**
     * 数据完整性检查
     */
    public static class DataIntegrityChecker {
        
        /**
         * HDFS使用CRC32校验和确保数据完整性
         */
        public boolean verifyBlockIntegrity(byte[] blockData, long expectedChecksum) {
            CRC32 crc = new CRC32();
            crc.update(blockData);
            long actualChecksum = crc.getValue();
            
            boolean isValid = actualChecksum == expectedChecksum;
            
            if (!isValid) {
                System.err.println("数据块校验失败: 期望 " + expectedChecksum + 
                                 ", 实际 " + actualChecksum);
            }
            
            return isValid;
        }
        
        /**
         * 定期数据块扫描
         */
        public void scheduleBlockScanning() {
            ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
            
            scheduler.scheduleAtFixedRate(() -> {
                System.out.println("开始数据块完整性扫描...");
                scanAllBlocks();
                System.out.println("数据块扫描完成");
            }, 0, 24, TimeUnit.HOURS); // 每24小时扫描一次
        }
        
        private void scanAllBlocks() {
            // 扫描所有数据块的完整性
            // 如果发现损坏的块，触发重新复制
        }
    }
}
```

## HDFS客户端API

### 1. Java API

```java
// HDFS Java API使用示例
public class HDFSClientExample {
    
    private Configuration conf;
    private FileSystem fs;
    
    public HDFSClientExample() throws IOException {
        // 初始化配置
        conf = new Configuration();
        conf.set("fs.defaultFS", "hdfs://namenode:9000");
        conf.set("dfs.replication", "3");
        conf.set("dfs.blocksize", "134217728"); // 128MB
        
        // 获取文件系统实例
        fs = FileSystem.get(conf);
    }
    
    /**
     * 文件上传
     */
    public void uploadFile(String localPath, String hdfsPath) throws IOException {
        Path localFile = new Path(localPath);
        Path hdfsFile = new Path(hdfsPath);
        
        // 方式1：使用copyFromLocalFile
        fs.copyFromLocalFile(localFile, hdfsFile);
        
        // 方式2：使用流式上传（适合大文件）
        try (FSDataInputStream in = new FSDataInputStream(
                new FileInputStream(localPath));
             FSDataOutputStream out = fs.create(hdfsFile, true)) {
            
            IOUtils.copyBytes(in, out, conf, true);
        }
        
        System.out.println("文件上传成功: " + localPath + " -> " + hdfsPath);
    }
    
    /**
     * 文件下载
     */
    public void downloadFile(String hdfsPath, String localPath) throws IOException {
        Path hdfsFile = new Path(hdfsPath);
        Path localFile = new Path(localPath);
        
        // 方式1：使用copyToLocalFile
        fs.copyToLocalFile(hdfsFile, localFile);
        
        // 方式2：使用流式下载
        try (FSDataInputStream in = fs.open(hdfsFile);
             FileOutputStream out = new FileOutputStream(localPath)) {
            
            IOUtils.copyBytes(in, out, conf, true);
        }
        
        System.out.println("文件下载成功: " + hdfsPath + " -> " + localPath);
    }
    
    /**
     * 创建目录
     */
    public void createDirectory(String dirPath) throws IOException {
        Path path = new Path(dirPath);
        
        if (!fs.exists(path)) {
            boolean success = fs.mkdirs(path);
            if (success) {
                System.out.println("目录创建成功: " + dirPath);
            } else {
                System.err.println("目录创建失败: " + dirPath);
            }
        } else {
            System.out.println("目录已存在: " + dirPath);
        }
    }
    
    /**
     * 列出目录内容
     */
    public void listDirectory(String dirPath) throws IOException {
        Path path = new Path(dirPath);
        
        if (fs.exists(path) && fs.isDirectory(path)) {
            FileStatus[] files = fs.listStatus(path);
            
            System.out.println("目录内容: " + dirPath);
            for (FileStatus file : files) {
                String type = file.isDirectory() ? "目录" : "文件";
                System.out.printf("%s: %s (大小: %d, 修改时间: %s)%n",
                                type, file.getPath().getName(),
                                file.getLen(), new Date(file.getModificationTime()));
            }
        } else {
            System.err.println("路径不存在或不是目录: " + dirPath);
        }
    }
    
    /**
     * 删除文件或目录
     */
    public void delete(String path, boolean recursive) throws IOException {
        Path hdfsPath = new Path(path);
        
        if (fs.exists(hdfsPath)) {
            boolean success = fs.delete(hdfsPath, recursive);
            if (success) {
                System.out.println("删除成功: " + path);
            } else {
                System.err.println("删除失败: " + path);
            }
        } else {
            System.err.println("路径不存在: " + path);
        }
    }
    
    /**
     * 获取文件信息
     */
    public void getFileInfo(String filePath) throws IOException {
        Path path = new Path(filePath);
        
        if (fs.exists(path)) {
            FileStatus status = fs.getFileStatus(path);
            
            System.out.println("文件信息: " + filePath);
            System.out.println("  大小: " + status.getLen() + " bytes");
            System.out.println("  副本数: " + status.getReplication());
            System.out.println("  块大小: " + status.getBlockSize() + " bytes");
            System.out.println("  修改时间: " + new Date(status.getModificationTime()));
            System.out.println("  权限: " + status.getPermission());
            System.out.println("  所有者: " + status.getOwner());
            System.out.println("  组: " + status.getGroup());
        } else {
            System.err.println("文件不存在: " + filePath);
        }
    }
    
    /**
     * 获取文件块信息
     */
    public void getBlockLocations(String filePath) throws IOException {
        Path path = new Path(filePath);
        
        if (fs.exists(path) && !fs.isDirectory(path)) {
            FileStatus status = fs.getFileStatus(path);
            BlockLocation[] blocks = fs.getFileBlockLocations(status, 0, status.getLen());
            
            System.out.println("文件块信息: " + filePath);
            for (int i = 0; i < blocks.length; i++) {
                BlockLocation block = blocks[i];
                System.out.printf("块 %d: 偏移量 %d, 长度 %d%n", 
                                i, block.getOffset(), block.getLength());
                System.out.println("  主机: " + Arrays.toString(block.getHosts()));
                System.out.println("  机架: " + Arrays.toString(block.getTopologyPaths()));
            }
        } else {
            System.err.println("文件不存在或是目录: " + filePath);
        }
    }
    
    /**
     * 流式读取文件
     */
    public void streamReadFile(String filePath) throws IOException {
        Path path = new Path(filePath);
        
        try (FSDataInputStream in = fs.open(path);
             BufferedReader reader = new BufferedReader(new InputStreamReader(in))) {
            
            String line;
            int lineCount = 0;
            
            while ((line = reader.readLine()) != null && lineCount < 10) {
                System.out.println("行 " + (lineCount + 1) + ": " + line);
                lineCount++;
            }
            
            if (lineCount == 10) {
                System.out.println("... (仅显示前10行)");
            }
        }
    }
    
    /**
     * 流式写入文件
     */
    public void streamWriteFile(String filePath, List<String> lines) throws IOException {
        Path path = new Path(filePath);
        
        try (FSDataOutputStream out = fs.create(path, true);
             BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(out))) {
            
            for (String line : lines) {
                writer.write(line);
                writer.newLine();
            }
            
            writer.flush();
        }
        
        System.out.println("文件写入成功: " + filePath + " (" + lines.size() + " 行)");
    }
    
    /**
     * 设置文件副本数
     */
    public void setReplication(String filePath, short replication) throws IOException {
        Path path = new Path(filePath);
        
        if (fs.exists(path) && !fs.isDirectory(path)) {
            boolean success = fs.setReplication(path, replication);
            if (success) {
                System.out.println("副本数设置成功: " + filePath + " -> " + replication);
            } else {
                System.err.println("副本数设置失败: " + filePath);
            }
        } else {
            System.err.println("文件不存在或是目录: " + filePath);
        }
    }
    
    /**
     * 关闭文件系统连接
     */
    public void close() throws IOException {
        if (fs != null) {
            fs.close();
        }
    }
    
    /**
     * 使用示例
     */
    public static void main(String[] args) {
        try {
            HDFSClientExample client = new HDFSClientExample();
            
            // 创建目录
            client.createDirectory("/user/data");
            
            // 上传文件
            client.uploadFile("/local/path/input.txt", "/user/data/input.txt");
            
            // 获取文件信息
            client.getFileInfo("/user/data/input.txt");
            
            // 列出目录
            client.listDirectory("/user/data");
            
            // 获取块信息
            client.getBlockLocations("/user/data/input.txt");
            
            // 设置副本数
            client.setReplication("/user/data/input.txt", (short) 2);
            
            // 流式读取
            client.streamReadFile("/user/data/input.txt");
            
            // 下载文件
            client.downloadFile("/user/data/input.txt", "/local/path/output.txt");
            
            client.close();
            
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

### 2. 命令行工具

```bash
#!/bin/bash
# HDFS命令行工具使用示例

# 设置HDFS环境
export HADOOP_HOME="/opt/hadoop"
export PATH="$HADOOP_HOME/bin:$PATH"

# 1. 基本文件操作
echo "=== 基本文件操作 ==="

# 创建目录
hdfs dfs -mkdir -p /user/data/input
hdfs dfs -mkdir -p /user/data/output

# 上传文件
hdfs dfs -put /local/path/file.txt /user/data/input/

# 下载文件
hdfs dfs -get /user/data/input/file.txt /local/path/downloaded_file.txt

# 复制文件
hdfs dfs -cp /user/data/input/file.txt /user/data/backup/

# 移动文件
hdfs dfs -mv /user/data/input/temp.txt /user/data/archive/

# 删除文件
hdfs dfs -rm /user/data/input/unwanted.txt

# 删除目录（递归）
hdfs dfs -rm -r /user/data/temp

# 2. 文件信息查看
echo "=== 文件信息查看 ==="

# 列出目录内容
hdfs dfs -ls /user/data/

# 递归列出目录内容
hdfs dfs -ls -R /user/data/

# 查看文件内容
hdfs dfs -cat /user/data/input/file.txt

# 查看文件头部
hdfs dfs -head /user/data/input/large_file.txt

# 查看文件尾部
hdfs dfs -tail /user/data/input/large_file.txt

# 统计目录大小
hdfs dfs -du -h /user/data/

# 统计文件系统使用情况
hdfs dfs -df -h

# 3. 权限管理
echo "=== 权限管理 ==="

# 修改文件权限
hdfs dfs -chmod 755 /user/data/input/file.txt

# 修改文件所有者
hdfs dfs -chown user:group /user/data/input/file.txt

# 递归修改权限
hdfs dfs -chmod -R 644 /user/data/input/

# 4. 高级操作
echo "=== 高级操作 ==="

# 设置副本数
hdfs dfs -setrep 2 /user/data/input/file.txt

# 递归设置副本数
hdfs dfs -setrep -R 3 /user/data/

# 查看文件块信息
hdfs fsck /user/data/input/file.txt -files -blocks -locations

# 平衡集群数据
hdfs balancer -threshold 10

# 安全模式操作
hdfs dfsadmin -safemode get
hdfs dfsadmin -safemode enter
hdfs dfsadmin -safemode leave

# 刷新NameNode
hdfs dfsadmin -refreshNodes

# 5. 性能测试
echo "=== 性能测试 ==="

# 写入性能测试
hadoop jar $HADOOP_HOME/share/hadoop/mapreduce/hadoop-mapreduce-client-jobclient-*.jar \
    TestDFSIO -write -nrFiles 10 -fileSize 1GB -resFile /tmp/TestDFSIO_write.txt

# 读取性能测试
hadoop jar $HADOOP_HOME/share/hadoop/mapreduce/hadoop-mapreduce-client-jobclient-*.jar \
    TestDFSIO -read -nrFiles 10 -fileSize 1GB -resFile /tmp/TestDFSIO_read.txt

# 清理测试数据
hadoop jar $HADOOP_HOME/share/hadoop/mapreduce/hadoop-mapreduce-client-jobclient-*.jar \
    TestDFSIO -clean

# 6. 监控和诊断
echo "=== 监控和诊断 ==="

# 检查文件系统
hdfs fsck / -files -blocks -locations

# 查看DataNode状态
hdfs dfsadmin -report

# 查看NameNode状态
hdfs dfsadmin -printTopology

# 查看正在进行的操作
hdfs dfsadmin -metasave /tmp/metasave.txt

# 7. 快照管理
echo "=== 快照管理 ==="

# 允许目录创建快照
hdfs dfsadmin -allowSnapshot /user/data

# 创建快照
hdfs dfs -createSnapshot /user/data snapshot_$(date +%Y%m%d_%H%M%S)

# 列出快照
hdfs lsSnapshottableDir

# 比较快照
hdfs snapshotDiff /user/data snapshot1 snapshot2

# 删除快照
hdfs dfs -deleteSnapshot /user/data snapshot_20231201_120000

# 禁止目录创建快照
hdfs dfsadmin -disallowSnapshot /user/data

echo "HDFS操作完成"
```

## 性能优化

### 1. 配置优化

```xml
<!-- hdfs-site.xml 性能优化配置 -->
<configuration>
    <!-- 数据块大小优化 -->
    <property>
        <name>dfs.blocksize</name>
        <value>268435456</value> <!-- 256MB，适合大文件 -->
        <description>HDFS块大小</description>
    </property>
    
    <!-- 副本数配置 -->
    <property>
        <name>dfs.replication</name>
        <value>3</value>
        <description>默认副本数</description>
    </property>
    
    <!-- NameNode内存优化 -->
    <property>
        <name>dfs.namenode.handler.count</name>
        <value>100</value>
        <description>NameNode处理线程数</description>
    </property>
    
    <!-- DataNode优化 -->
    <property>
        <name>dfs.datanode.handler.count</name>
        <value>40</value>
        <description>DataNode处理线程数</description>
    </property>
    
    <!-- 网络传输优化 -->
    <property>
        <name>dfs.datanode.socket.write.timeout</name>
        <value>480000</value>
        <description>写入超时时间</description>
    </property>
    
    <!-- 磁盘IO优化 -->
    <property>
        <name>dfs.datanode.max.transfer.threads</name>
        <value>8192</value>
        <description>最大传输线程数</description>
    </property>
    
    <!-- 缓存优化 -->
    <property>
        <name>dfs.client.read.shortcircuit</name>
        <value>true</value>
        <description>启用短路读取</description>
    </property>
    
    <!-- 压缩优化 -->
    <property>
        <name>dfs.compress.image</name>
        <value>true</value>
        <description>压缩fsimage</description>
    </property>
    
    <!-- 平衡器优化 -->
    <property>
        <name>dfs.balancer.bandwidth</name>
        <value>104857600</value> <!-- 100MB/s -->
        <description>平衡器带宽限制</description>
    </property>
</configuration>
```

### 2. JVM优化

```bash
#!/bin/bash
# HDFS JVM优化配置

# NameNode JVM配置
export HDFS_NAMENODE_OPTS="
    -Xms8g -Xmx8g
    -XX:+UseG1GC
    -XX:G1HeapRegionSize=32m
    -XX:+UseG1MixedGCCountTarget=8
    -XX:+UseStringDeduplication
    -XX:+PrintGCDetails
    -XX:+PrintGCTimeStamps
    -XX:+PrintGCApplicationStoppedTime
    -Xloggc:/var/log/hadoop/namenode-gc.log
    -XX:+UseGCLogFileRotation
    -XX:NumberOfGCLogFiles=10
    -XX:GCLogFileSize=10M
    -Djava.net.preferIPv4Stack=true
    -Dhadoop.security.logger=INFO,RFAS
"

# DataNode JVM配置
export HDFS_DATANODE_OPTS="
    -Xms4g -Xmx4g
    -XX:+UseG1GC
    -XX:G1HeapRegionSize=16m
    -XX:+UseStringDeduplication
    -XX:+PrintGCDetails
    -XX:+PrintGCTimeStamps
    -Xloggc:/var/log/hadoop/datanode-gc.log
    -XX:+UseGCLogFileRotation
    -XX:NumberOfGCLogFiles=5
    -XX:GCLogFileSize=10M
    -Djava.net.preferIPv4Stack=true
"

# Secondary NameNode JVM配置
export HDFS_SECONDARYNAMENODE_OPTS="
    -Xms2g -Xmx2g
    -XX:+UseG1GC
    -XX:+PrintGCDetails
    -Xloggc:/var/log/hadoop/secondarynamenode-gc.log
"

echo "HDFS JVM配置已设置"
```

## 监控与运维

### 1. 监控脚本

```bash
#!/bin/bash
# HDFS监控脚本

HDFS_LOG_DIR="/var/log/hadoop"
MONITOR_LOG="/var/log/hdfs-monitor.log"
ALERT_THRESHOLD_DISK=85
ALERT_THRESHOLD_MEMORY=80

# 记录日志函数
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $MONITOR_LOG
}

# 检查HDFS服务状态
check_hdfs_services() {
    log_message "检查HDFS服务状态..."
    
    # 检查NameNode
    if pgrep -f "org.apache.hadoop.hdfs.server.namenode.NameNode" > /dev/null; then
        log_message "✓ NameNode运行正常"
    else
        log_message "✗ NameNode未运行"
        send_alert "NameNode服务异常" "NameNode进程未运行"
    fi
    
    # 检查DataNode
    datanode_count=$(pgrep -f "org.apache.hadoop.hdfs.server.datanode.DataNode" | wc -l)
    if [ $datanode_count -gt 0 ]; then
        log_message "✓ DataNode运行正常 (数量: $datanode_count)"
    else
        log_message "✗ DataNode未运行"
        send_alert "DataNode服务异常" "DataNode进程未运行"
    fi
    
    # 检查Secondary NameNode
    if pgrep -f "org.apache.hadoop.hdfs.server.namenode.SecondaryNameNode" > /dev/null; then
        log_message "✓ Secondary NameNode运行正常"
    else
        log_message "✗ Secondary NameNode未运行"
    fi
}

# 检查HDFS集群健康状态
check_hdfs_health() {
    log_message "检查HDFS集群健康状态..."
    
    # 检查安全模式
    safemode_status=$(hdfs dfsadmin -safemode get 2>/dev/null)
    if echo "$safemode_status" | grep -q "OFF"; then
        log_message "✓ HDFS不在安全模式"
    else
        log_message "⚠ HDFS在安全模式: $safemode_status"
        send_alert "HDFS安全模式告警" "$safemode_status"
    fi
    
    # 检查文件系统状态
    fsck_output=$(hdfs fsck / -files -blocks 2>/dev/null | tail -10)
    if echo "$fsck_output" | grep -q "HEALTHY"; then
        log_message "✓ HDFS文件系统健康"
    else
        log_message "⚠ HDFS文件系统可能有问题"
        log_message "FSCK输出: $fsck_output"
    fi
}

# 检查磁盘使用情况
check_disk_usage() {
    log_message "检查磁盘使用情况..."
    
    # 检查HDFS数据目录磁盘使用率
    data_dirs=("/data1/hadoop" "/data2/hadoop" "/data3/hadoop")
    
    for dir in "${data_dirs[@]}"; do
        if [ -d "$dir" ]; then
            usage=$(df "$dir" | awk 'NR==2 {print $5}' | sed 's/%//')
            if [ $usage -gt $ALERT_THRESHOLD_DISK ]; then
                log_message "⚠ 磁盘使用率过高: $dir ($usage%)"
                send_alert "磁盘使用率告警" "$dir 使用率: $usage%"
            else
                log_message "✓ 磁盘使用率正常: $dir ($usage%)"
            fi
        fi
    done
    
    # 检查HDFS总体使用情况
    hdfs_usage=$(hdfs dfs -df -h / 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ ! -z "$hdfs_usage" ]; then
        if [ $hdfs_usage -gt $ALERT_THRESHOLD_DISK ]; then
            log_message "⚠ HDFS使用率过高: $hdfs_usage%"
            send_alert "HDFS使用率告警" "HDFS使用率: $hdfs_usage%"
        else
            log_message "✓ HDFS使用率正常: $hdfs_usage%"
        fi
    fi
}

# 检查DataNode状态
check_datanode_status() {
    log_message "检查DataNode状态..."
    
    # 获取DataNode报告
    report_output=$(hdfs dfsadmin -report 2>/dev/null)
    
    # 提取活跃和死亡的DataNode数量
    live_nodes=$(echo "$report_output" | grep "Live datanodes" | awk '{print $3}' | sed 's/://')
    dead_nodes=$(echo "$report_output" | grep "Dead datanodes" | awk '{print $3}' | sed 's/://')
    
    log_message "活跃DataNode: $live_nodes, 死亡DataNode: $dead_nodes"
    
    if [ "$dead_nodes" -gt 0 ]; then
        log_message "⚠ 发现死亡DataNode: $dead_nodes 个"
        send_alert "DataNode状态告警" "死亡DataNode数量: $dead_nodes"
    fi
    
    # 检查DataNode磁盘使用情况
    echo "$report_output" | grep -A 20 "Live datanodes" | while read line; do
        if echo "$line" | grep -q "DFS Used%"; then
            node_usage=$(echo "$line" | awk '{print $3}' | sed 's/%//' | sed 's/(//')
            node_name=$(echo "$line" | awk '{print $1}')
            
            if [ "$node_usage" -gt $ALERT_THRESHOLD_DISK ]; then
                log_message "⚠ DataNode磁盘使用率过高: $node_name ($node_usage%)"
            fi
        fi
    done
}

# 检查NameNode内存使用
check_namenode_memory() {
    log_message "检查NameNode内存使用..."
    
    # 获取NameNode进程ID
    namenode_pid=$(pgrep -f "org.apache.hadoop.hdfs.server.namenode.NameNode")
    
    if [ ! -z "$namenode_pid" ]; then
        # 获取内存使用情况
        memory_info=$(ps -p $namenode_pid -o pid,ppid,pcpu,pmem,vsz,rss,comm --no-headers)
        memory_percent=$(echo $memory_info | awk '{print $4}' | cut -d. -f1)
        
        log_message "NameNode内存使用: $memory_percent%"
        
        if [ $memory_percent -gt $ALERT_THRESHOLD_MEMORY ]; then
            log_message "⚠ NameNode内存使用率过高: $memory_percent%"
            send_alert "NameNode内存告警" "内存使用率: $memory_percent%"
        fi
    fi
}

# 检查HDFS块状态
check_block_status() {
    log_message "检查HDFS块状态..."
    
    # 运行fsck检查
    fsck_result=$(hdfs fsck / 2>/dev/null | tail -20)
    
    # 检查损坏的块
    corrupt_blocks=$(echo "$fsck_result" | grep "Corrupt blocks" | awk '{print $3}')
    missing_blocks=$(echo "$fsck_result" | grep "Missing blocks" | awk '{print $3}')
    under_replicated=$(echo "$fsck_result" | grep "Under replicated blocks" | awk '{print $4}')
    
    if [ ! -z "$corrupt_blocks" ] && [ $corrupt_blocks -gt 0 ]; then
        log_message "⚠ 发现损坏块: $corrupt_blocks 个"
        send_alert "HDFS块损坏告警" "损坏块数量: $corrupt_blocks"
    fi
    
    if [ ! -z "$missing_blocks" ] && [ $missing_blocks -gt 0 ]; then
        log_message "⚠ 发现丢失块: $missing_blocks 个"
        send_alert "HDFS块丢失告警" "丢失块数量: $missing_blocks"
    fi
    
    if [ ! -z "$under_replicated" ] && [ $under_replicated -gt 0 ]; then
        log_message "⚠ 发现副本不足块: $under_replicated 个"
    fi
}

# 发送告警
send_alert() {
    local title="$1"
    local message="$2"
    
    # 记录告警日志
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [ALERT] $title: $message" >> $MONITOR_LOG
    
    # 这里可以集成各种告警方式
    # 例如：邮件、钉钉、企业微信、短信等
    
    # 示例：发送邮件（需要配置邮件服务）
    # echo "$message" | mail -s "HDFS告警: $title" admin@company.com
    
    # 示例：写入系统日志
    logger "HDFS Monitor Alert: $title - $message"
}

# 生成监控报告
generate_report() {
    local report_file="/tmp/hdfs-monitor-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "HDFS监控报告 - $(date)"
        echo "=============================="
        echo
        
        echo "1. 服务状态"
        check_hdfs_services
        echo
        
        echo "2. 集群健康状态"
        check_hdfs_health
        echo
        
        echo "3. 磁盘使用情况"
        check_disk_usage
        echo
        
        echo "4. DataNode状态"
        check_datanode_status
        echo
        
        echo "5. NameNode内存使用"
        check_namenode_memory
        echo
        
        echo "6. 块状态检查"
        check_block_status
        echo
        
        echo "报告生成完成: $(date)"
    } > $report_file
    
    log_message "监控报告已生成: $report_file"
}

# 主函数
main() {
    log_message "开始HDFS监控检查..."
    
    check_hdfs_services
    check_hdfs_health
    check_disk_usage
    check_datanode_status
    check_namenode_memory
    check_block_status
    
    log_message "HDFS监控检查完成"
    
    # 如果指定了生成报告参数
    if [ "$1" = "--report" ]; then
        generate_report
    fi
}

# 执行监控
main $@
```

## 最佳实践

### 1. 架构设计

- **合理规划集群规模**：根据数据量和访问模式设计节点数量
- **机架感知配置**：配置机架拓扑以优化副本放置
- **NameNode高可用**：生产环境必须配置NameNode HA
- **存储分层**：使用不同类型的存储介质（SSD、HDD）

### 2. 性能优化

- **块大小调优**：根据文件大小特点调整块大小
- **副本数配置**：平衡可靠性和存储成本
- **网络优化**：配置高速网络和合理的网络拓扑
- **JVM调优**：针对不同组件进行JVM参数优化

### 3. 运维管理

- **定期备份**：备份NameNode元数据和重要数据
- **监控告警**：建立完善的监控和告警体系
- **容量规划**：定期评估存储容量和性能需求
- **升级策略**：制定滚动升级和回滚方案

### 4. 安全配置

- **Kerberos认证**：启用Kerberos身份认证
- **数据加密**：配置传输和存储加密
- **权限控制**：合理设置文件和目录权限
- **审计日志**：启用操作审计日志

## 总结

HDFS作为Hadoop生态系统的核心存储组件，为大数据处理提供了可靠、可扩展的分布式存储解决方案。通过深入理解HDFS的架构原理、掌握API使用方法、进行合理的性能优化和运维管理，可以构建高效稳定的大数据存储平台。

随着云计算和容器技术的发展，HDFS也在不断演进，支持云原生部署、存储分层、纠删码等新特性，为现代大数据架构提供更强大的存储能力。