# Linux x86/x64 平台开发指南

Linux x86/x64平台是现代企业级应用开发的主流选择，以其高性能、稳定性和丰富的开源生态著称。作为服务器和云计算的核心平台，Linux x86在数据中心、云服务和企业应用中占据主导地位。

## 平台特性

### 架构优势
- **高性能计算**：x86/x64架构针对复杂计算优化
- **内存管理**：支持大内存寻址和虚拟内存
- **多核支持**：充分利用多核CPU性能
- **指令集丰富**：SSE、AVX等SIMD指令集加速

### 系统特点
- **多用户多任务**：支持并发用户和进程管理
- **文件系统**：ext4、XFS、Btrfs等高性能文件系统
- **网络栈**：完整的TCP/IP协议栈实现
- **安全机制**：SELinux、AppArmor等安全框架
- **虚拟化支持**：KVM、Docker、LXC等虚拟化技术
- **包管理**：APT、YUM/DNF、Zypper等包管理系统

## 主要发行版

### 企业级发行版

#### Red Hat Enterprise Linux (RHEL)
- **特点**：商业支持、长期维护、企业认证
- **适用场景**：关键业务系统、大型企业环境
- **支持周期**：10年生命周期，安全更新保障
- **认证生态**：广泛的硬件和软件认证

#### SUSE Linux Enterprise Server (SLES)
- **特点**：企业级支持、SAP官方认证
- **适用场景**：SAP环境、高可用集群
- **技术优势**：YaST管理工具、Btrfs文件系统
- **市场定位**：欧洲市场领先，企业级应用

### 社区发行版

#### Ubuntu Server
- **特点**：易用性好、社区活跃、云原生支持
- **适用场景**：云计算、容器化、开发环境
- **发布周期**：6个月常规版本，2年LTS版本
- **生态优势**：丰富的第三方软件包

#### Debian
- **特点**：稳定性极高、包管理优秀
- **适用场景**：服务器环境、嵌入式系统
- **技术特色**：严格的软件质量控制
- **社区文化**：开源纯粹性、技术导向

#### CentOS Stream/Rocky Linux
- **特点**：RHEL兼容、免费使用
- **适用场景**：中小企业、开发测试环境
- **技术优势**：企业级特性、稳定可靠
- **发展趋势**：Rocky Linux接替CentOS地位

## 开发工具生态

### 编译器工具链

#### GCC (GNU Compiler Collection)
- **特点**：开源、跨平台、标准兼容性好
- **语言支持**：C、C++、Fortran、Go等多种语言
- **优化能力**：成熟的优化算法，性能优秀
- **生态地位**：Linux系统默认编译器

#### Clang/LLVM
- **特点**：模块化设计、错误信息友好
- **技术优势**：快速编译、静态分析能力强
- **应用场景**：现代C++开发、工具链集成
- **发展趋势**：Apple、Google等大厂支持

#### Intel C++ Compiler
- **特点**：Intel CPU深度优化
- **性能优势**：数值计算、科学计算领域领先
- **适用场景**：高性能计算、数据中心应用
- **商业模式**：商业许可，技术支持完善

### 构建系统

#### Make
- **特点**：传统构建工具，简单直接
- **适用场景**：小型项目、系统级编程
- **优势**：轻量级、学习成本低
- **局限性**：复杂项目管理困难

#### CMake
- **特点**：跨平台构建系统生成器
- **技术优势**：支持多种构建后端
- **生态地位**：现代C++项目标准选择
- **扩展性**：丰富的模块和第三方支持

#### Ninja
- **特点**：高速构建系统
- **性能优势**：并行构建能力强
- **适用场景**：大型项目快速构建
- **集成性**：与CMake完美配合

## 应用场景

### 企业服务器
- **Web服务器**：Apache、Nginx等高性能Web服务
- **数据库服务器**：MySQL、PostgreSQL、MongoDB等
- **应用服务器**：Java EE、.NET Core等企业应用
- **文件服务器**：Samba、NFS等文件共享服务

### 云计算平台
- **公有云**：AWS、Azure、Google Cloud的基础设施
- **私有云**：OpenStack、VMware等私有云解决方案
- **容器平台**：Docker、Kubernetes等容器编排
- **微服务架构**：Spring Cloud、Service Mesh等

### 高性能计算
- **科学计算**：数值模拟、数据分析、机器学习
- **大数据处理**：Hadoop、Spark等大数据框架
- **AI训练**：TensorFlow、PyTorch等深度学习框架
- **区块链**：比特币、以太坊等区块链节点

## 技术优势

### 性能特点
- **计算性能**：x86/x64指令集优化，单核性能强
- **内存支持**：支持大容量内存，适合内存密集型应用
- **I/O性能**：高速存储和网络I/O支持
- **并发能力**：多核多线程处理能力强

### 生态优势
- **软件生态**：丰富的开源软件和商业软件支持
- **硬件兼容**：广泛的硬件厂商支持
- **社区支持**：活跃的开发者社区和技术支持
- **标准化**：遵循开放标准，互操作性好

### 成本效益
- **硬件成本**：x86服务器价格竞争激烈，成本可控
- **运维成本**：成熟的运维工具和管理经验
- **人才成本**：Linux技能普及，人才供给充足
- **迁移成本**：标准化程度高，迁移风险低
set(CMAKE_BUILD_TYPE Release)

add_executable(myapp main.cpp utils.cpp)
target_link_libraries(myapp pthread)
EOF

mkdir build && cd build
cmake ..
make -j$(nproc)

# Ninja
ninja --version
cmake -GNinja ..
ninja
```

#### 调试工具
```bash
# GDB (GNU Debugger)
gcc -g -o myapp main.c
gdb ./myapp
# (gdb) break main
# (gdb) run
# (gdb) step
# (gdb) print variable

# Valgrind (内存检查)
sudo apt install valgrind
valgrind --leak-check=full ./myapp
valgrind --tool=callgrind ./myapp

# Perf (性能分析)
sudo apt install linux-tools-generic
perf record ./myapp
perf report
perf stat ./myapp

# Strace (系统调用跟踪)
strace -o trace.log ./myapp
strace -c ./myapp  # 统计系统调用
```

## 系统编程

### 进程管理
```c
// process_example.c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>

int main() {
    pid_t pid = fork();
    
    if (pid == 0) {
        // 子进程
        printf("Child process: PID=%d\n", getpid());
        execl("/bin/ls", "ls", "-l", NULL);
    } else if (pid > 0) {
        // 父进程
        printf("Parent process: PID=%d, Child PID=%d\n", getpid(), pid);
        int status;
        wait(&status);
        printf("Child exited with status %d\n", status);
    } else {
        perror("fork failed");
        return 1;
    }
    
    return 0;
}
```

### 线程编程
```c
// thread_example.c
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

void* worker_thread(void* arg) {
    int thread_id = *(int*)arg;
    printf("Thread %d starting\n", thread_id);
    
    // 模拟工作
    sleep(2);
    
    printf("Thread %d finishing\n", thread_id);
    return NULL;
}

int main() {
    const int NUM_THREADS = 4;
    pthread_t threads[NUM_THREADS];
    int thread_ids[NUM_THREADS];
    
    // 创建线程
    for (int i = 0; i < NUM_THREADS; i++) {
        thread_ids[i] = i;
        if (pthread_create(&threads[i], NULL, worker_thread, &thread_ids[i]) != 0) {
            perror("pthread_create failed");
            return 1;
        }
    }
    
    // 等待线程完成
    for (int i = 0; i < NUM_THREADS; i++) {
        pthread_join(threads[i], NULL);
    }
    
    printf("All threads completed\n");
    return 0;
}

// 编译：gcc -pthread -o thread_example thread_example.c
```

### 网络编程
```c
// server_example.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT 8080
#define BUFFER_SIZE 1024

int main() {
    int server_fd, client_fd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);
    char buffer[BUFFER_SIZE];
    
    // 创建socket
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket failed");
        exit(1);
    }
    
    // 设置地址重用
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    // 绑定地址
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);
    
    if (bind(server_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind failed");
        exit(1);
    }
    
    // 监听连接
    if (listen(server_fd, 5) < 0) {
        perror("listen failed");
        exit(1);
    }
    
    printf("Server listening on port %d\n", PORT);
    
    while (1) {
        // 接受连接
        client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            perror("accept failed");
            continue;
        }
        
        printf("Client connected: %s\n", inet_ntoa(client_addr.sin_addr));
        
        // 读取数据
        ssize_t bytes_read = read(client_fd, buffer, BUFFER_SIZE - 1);
        if (bytes_read > 0) {
            buffer[bytes_read] = '\0';
            printf("Received: %s\n", buffer);
            
            // 发送响应
            const char* response = "HTTP/1.1 200 OK\r\n\r\nHello, World!";
            write(client_fd, response, strlen(response));
        }
        
        close(client_fd);
    }
    
    close(server_fd);
    return 0;
}
```

## 高性能开发

### SIMD优化
```c
// simd_example.c
#include <stdio.h>
#include <immintrin.h>
#include <time.h>

// 标量版本
void add_arrays_scalar(float* a, float* b, float* result, int size) {
    for (int i = 0; i < size; i++) {
        result[i] = a[i] + b[i];
    }
}

// AVX版本
void add_arrays_avx(float* a, float* b, float* result, int size) {
    int simd_size = size - (size % 8);
    
    for (int i = 0; i < simd_size; i += 8) {
        __m256 va = _mm256_load_ps(&a[i]);
        __m256 vb = _mm256_load_ps(&b[i]);
        __m256 vresult = _mm256_add_ps(va, vb);
        _mm256_store_ps(&result[i], vresult);
    }
    
    // 处理剩余元素
    for (int i = simd_size; i < size; i++) {
        result[i] = a[i] + b[i];
    }
}

int main() {
    const int SIZE = 1000000;
    float* a = aligned_alloc(32, SIZE * sizeof(float));
    float* b = aligned_alloc(32, SIZE * sizeof(float));
    float* result1 = aligned_alloc(32, SIZE * sizeof(float));
    float* result2 = aligned_alloc(32, SIZE * sizeof(float));
    
    // 初始化数据
    for (int i = 0; i < SIZE; i++) {
        a[i] = i * 1.5f;
        b[i] = i * 2.0f;
    }
    
    // 测试标量版本
    clock_t start = clock();
    add_arrays_scalar(a, b, result1, SIZE);
    clock_t end = clock();
    printf("Scalar time: %f seconds\n", (double)(end - start) / CLOCKS_PER_SEC);
    
    // 测试AVX版本
    start = clock();
    add_arrays_avx(a, b, result2, SIZE);
    end = clock();
    printf("AVX time: %f seconds\n", (double)(end - start) / CLOCKS_PER_SEC);
    
    free(a);
    free(b);
    free(result1);
    free(result2);
    
    return 0;
}

// 编译：gcc -mavx -O3 -o simd_example simd_example.c
```

### 内存管理优化
```c
// memory_pool.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>

typedef struct {
    void* memory;
    size_t size;
    size_t used;
    size_t alignment;
} memory_pool_t;

memory_pool_t* create_memory_pool(size_t size, size_t alignment) {
    memory_pool_t* pool = malloc(sizeof(memory_pool_t));
    if (!pool) return NULL;
    
    // 使用mmap分配大页内存
    pool->memory = mmap(NULL, size, PROT_READ | PROT_WRITE,
                       MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (pool->memory == MAP_FAILED) {
        free(pool);
        return NULL;
    }
    
    pool->size = size;
    pool->used = 0;
    pool->alignment = alignment;
    
    return pool;
}

void* pool_alloc(memory_pool_t* pool, size_t size) {
    // 对齐计算
    size_t aligned_size = (size + pool->alignment - 1) & ~(pool->alignment - 1);
    
    if (pool->used + aligned_size > pool->size) {
        return NULL; // 内存不足
    }
    
    void* ptr = (char*)pool->memory + pool->used;
    pool->used += aligned_size;
    
    return ptr;
}

void destroy_memory_pool(memory_pool_t* pool) {
    if (pool) {
        munmap(pool->memory, pool->size);
        free(pool);
    }
}

int main() {
    memory_pool_t* pool = create_memory_pool(1024 * 1024, 64); // 1MB pool
    
    // 分配内存
    void* ptr1 = pool_alloc(pool, 1024);
    void* ptr2 = pool_alloc(pool, 2048);
    
    printf("Allocated %zu bytes\n", pool->used);
    
    destroy_memory_pool(pool);
    return 0;
}
```

## 容器化部署

### Docker配置
```dockerfile
# Dockerfile
FROM ubuntu:22.04

# 安装依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制源代码
COPY . .

# 构建应用
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# 运行时配置
EXPOSE 8080
CMD ["./build/myapp"]
```

```bash
# 构建和运行
docker build -t myapp .
docker run -p 8080:8080 myapp

# 多阶段构建优化
cat > Dockerfile.multi << 'EOF'
# 构建阶段
FROM ubuntu:22.04 AS builder
RUN apt-get update && apt-get install -y build-essential cmake
WORKDIR /app
COPY . .
RUN mkdir build && cd build && cmake .. && make

# 运行阶段
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/build/myapp .
EXPOSE 8080
CMD ["./myapp"]
EOF
```

### Kubernetes部署
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: LOG_LEVEL
          value: "INFO"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

## 性能优化

### 编译器优化
```bash
# GCC优化选项
gcc -O3 -march=native -mtune=native -flto -o myapp main.c

# 详细优化选项
gcc -O3 \
    -march=native \
    -mtune=native \
    -flto \
    -ffast-math \
    -funroll-loops \
    -fomit-frame-pointer \
    -DNDEBUG \
    -o myapp main.c

# Profile Guided Optimization (PGO)
gcc -O3 -fprofile-generate -o myapp main.c
./myapp  # 运行收集profile数据
gcc -O3 -fprofile-use -o myapp main.c
```

### 系统调优
```bash
# CPU调度器优化
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# 内存大页
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages
# 在程序中使用大页
mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0);

# 网络优化
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"

# 文件系统优化
sudo mount -o remount,noatime /
```

## 监控和诊断

### 系统监控
```bash
# htop - 进程监控
sudo apt install htop
htop

# iotop - I/O监控
sudo apt install iotop
sudo iotop

# nethogs - 网络监控
sudo apt install nethogs
sudo nethogs

# 系统资源监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    echo "=== $(date) ==="
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
    
    echo "Memory Usage:"
    free -h | grep Mem | awk '{print $3"/"$2}'
    
    echo "Disk Usage:"
    df -h / | tail -1 | awk '{print $5}'
    
    echo "Load Average:"
    uptime | awk -F'load average:' '{print $2}'
    
    sleep 5
done
EOF
chmod +x monitor.sh
```

### 应用监控
```c
// monitoring.c
#include <stdio.h>
#include <time.h>
#include <sys/resource.h>
#include <unistd.h>

void print_resource_usage() {
    struct rusage usage;
    getrusage(RUSAGE_SELF, &usage);
    
    printf("Resource Usage:\n");
    printf("  User CPU time: %ld.%06ld seconds\n", 
           usage.ru_utime.tv_sec, usage.ru_utime.tv_usec);
    printf("  System CPU time: %ld.%06ld seconds\n", 
           usage.ru_stime.tv_sec, usage.ru_stime.tv_usec);
    printf("  Maximum RSS: %ld KB\n", usage.ru_maxrss);
    printf("  Page faults: %ld\n", usage.ru_majflt);
    printf("  Context switches: %ld voluntary, %ld involuntary\n", 
           usage.ru_nvcsw, usage.ru_nivcsw);
}

int main() {
    // 模拟工作负载
    for (int i = 0; i < 1000000; i++) {
        // 一些计算
    }
    
    print_resource_usage();
    return 0;
}
```

## 实际应用案例

### Web服务器
```c
// high_performance_server.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/epoll.h>
#include <netinet/in.h>
#include <fcntl.h>
#include <errno.h>

#define MAX_EVENTS 1000
#define BUFFER_SIZE 4096
#define PORT 8080

int make_socket_non_blocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags == -1) return -1;
    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

int main() {
    int server_fd, epoll_fd;
    struct sockaddr_in server_addr;
    struct epoll_event event, events[MAX_EVENTS];
    
    // 创建服务器socket
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        exit(1);
    }
    
    // 设置非阻塞
    make_socket_non_blocking(server_fd);
    
    // 设置地址重用
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    // 绑定地址
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);
    
    if (bind(server_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        exit(1);
    }
    
    if (listen(server_fd, SOMAXCONN) < 0) {
        perror("listen");
        exit(1);
    }
    
    // 创建epoll实例
    epoll_fd = epoll_create1(0);
    if (epoll_fd < 0) {
        perror("epoll_create1");
        exit(1);
    }
    
    // 添加服务器socket到epoll
    event.events = EPOLLIN;
    event.data.fd = server_fd;
    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, server_fd, &event) < 0) {
        perror("epoll_ctl");
        exit(1);
    }
    
    printf("High-performance server listening on port %d\n", PORT);
    
    char buffer[BUFFER_SIZE];
    const char* response = "HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello, World!";
    
    while (1) {
        int nfds = epoll_wait(epoll_fd, events, MAX_EVENTS, -1);
        if (nfds < 0) {
            perror("epoll_wait");
            break;
        }
        
        for (int i = 0; i < nfds; i++) {
            if (events[i].data.fd == server_fd) {
                // 新连接
                while (1) {
                    struct sockaddr_in client_addr;
                    socklen_t client_len = sizeof(client_addr);
                    int client_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
                    
                    if (client_fd < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) {
                            break; // 没有更多连接
                        }
                        perror("accept");
                        break;
                    }
                    
                    make_socket_non_blocking(client_fd);
                    
                    event.events = EPOLLIN | EPOLLET; // 边缘触发
                    event.data.fd = client_fd;
                    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, client_fd, &event) < 0) {
                        perror("epoll_ctl");
                        close(client_fd);
                    }
                }
            } else {
                // 客户端数据
                int client_fd = events[i].data.fd;
                
                while (1) {
                    ssize_t bytes_read = read(client_fd, buffer, BUFFER_SIZE);
                    if (bytes_read <= 0) {
                        if (bytes_read < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
                            break; // 没有更多数据
                        }
                        // 连接关闭或错误
                        epoll_ctl(epoll_fd, EPOLL_CTL_DEL, client_fd, NULL);
                        close(client_fd);
                        break;
                    }
                    
                    // 发送响应
                    write(client_fd, response, strlen(response));
                }
            }
        }
    }
    
    close(server_fd);
    close(epoll_fd);
    return 0;
}
```

### 数据库应用
```c
// database_client.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mysql/mysql.h>

typedef struct {
    MYSQL* connection;
    char* host;
    char* user;
    char* password;
    char* database;
} db_context_t;

db_context_t* db_init(const char* host, const char* user, 
                      const char* password, const char* database) {
    db_context_t* ctx = malloc(sizeof(db_context_t));
    if (!ctx) return NULL;
    
    ctx->connection = mysql_init(NULL);
    if (!ctx->connection) {
        free(ctx);
        return NULL;
    }
    
    // 设置连接选项
    my_bool reconnect = 1;
    mysql_options(ctx->connection, MYSQL_OPT_RECONNECT, &reconnect);
    mysql_options(ctx->connection, MYSQL_SET_CHARSET_NAME, "utf8mb4");
    
    if (!mysql_real_connect(ctx->connection, host, user, password, 
                           database, 0, NULL, 0)) {
        fprintf(stderr, "MySQL connection failed: %s\n", mysql_error(ctx->connection));
        mysql_close(ctx->connection);
        free(ctx);
        return NULL;
    }
    
    ctx->host = strdup(host);
    ctx->user = strdup(user);
    ctx->password = strdup(password);
    ctx->database = strdup(database);
    
    return ctx;
}

int db_execute_query(db_context_t* ctx, const char* query) {
    if (mysql_query(ctx->connection, query)) {
        fprintf(stderr, "Query failed: %s\n", mysql_error(ctx->connection));
        return -1;
    }
    
    MYSQL_RES* result = mysql_store_result(ctx->connection);
    if (result) {
        int num_fields = mysql_num_fields(result);
        MYSQL_ROW row;
        
        // 打印字段名
        MYSQL_FIELD* fields = mysql_fetch_fields(result);
        for (int i = 0; i < num_fields; i++) {
            printf("%s\t", fields[i].name);
        }
        printf("\n");
        
        // 打印数据
        while ((row = mysql_fetch_row(result))) {
            for (int i = 0; i < num_fields; i++) {
                printf("%s\t", row[i] ? row[i] : "NULL");
            }
            printf("\n");
        }
        
        mysql_free_result(result);
    }
    
    return 0;
}

void db_cleanup(db_context_t* ctx) {
    if (ctx) {
        mysql_close(ctx->connection);
        free(ctx->host);
        free(ctx->user);
        free(ctx->password);
        free(ctx->database);
        free(ctx);
    }
}

int main() {
    db_context_t* db = db_init("localhost", "user", "password", "testdb");
    if (!db) {
        return 1;
    }
    
    // 创建表
    db_execute_query(db, "CREATE TABLE IF NOT EXISTS users ("
                         "id INT AUTO_INCREMENT PRIMARY KEY,"
                         "name VARCHAR(100),"
                         "email VARCHAR(100)"
                         ")");
    
    // 插入数据
    db_execute_query(db, "INSERT INTO users (name, email) VALUES "
                         "('John Doe', 'john@example.com'),"
                         "('Jane Smith', 'jane@example.com')");
    
    // 查询数据
    db_execute_query(db, "SELECT * FROM users");
    
    db_cleanup(db);
    return 0;
}

// 编译：gcc -o database_client database_client.c -lmysqlclient
```

## 最佳实践

### 代码质量
```bash
# 静态分析工具
sudo apt install cppcheck clang-tidy

# 代码检查
cppcheck --enable=all --std=c11 *.c
clang-tidy *.c -- -std=c11

# 代码格式化
sudo apt install clang-format
clang-format -i *.c *.h

# 内存泄漏检查
valgrind --leak-check=full --show-leak-kinds=all ./myapp

# 线程安全检查
valgrind --tool=helgrind ./myapp
```

### 安全考虑
```c
// secure_coding.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <pwd.h>

// 安全的字符串复制
char* safe_strdup(const char* src, size_t max_len) {
    if (!src) return NULL;
    
    size_t len = strnlen(src, max_len);
    char* dst = malloc(len + 1);
    if (!dst) return NULL;
    
    memcpy(dst, src, len);
    dst[len] = '\0';
    
    return dst;
}

// 权限降级
int drop_privileges(const char* username) {
    struct passwd* pw = getpwnam(username);
    if (!pw) {
        fprintf(stderr, "User %s not found\n", username);
        return -1;
    }
    
    if (setgid(pw->pw_gid) != 0) {
        perror("setgid");
        return -1;
    }
    
    if (setuid(pw->pw_uid) != 0) {
        perror("setuid");
        return -1;
    }
    
    return 0;
}

int main() {
    // 检查是否以root运行
    if (getuid() == 0) {
        printf("Running as root, dropping privileges...\n");
        if (drop_privileges("nobody") != 0) {
            fprintf(stderr, "Failed to drop privileges\n");
            return 1;
        }
    }
    
    printf("Running as UID: %d, GID: %d\n", getuid(), getgid());
    
    return 0;
}
```

### 部署脚本
```bash
#!/bin/bash
# deploy.sh

set -e  # 遇到错误立即退出

APP_NAME="myapp"
APP_VERSION="1.0.0"
DEPLOY_DIR="/opt/${APP_NAME}"
SERVICE_USER="myapp"

echo "Deploying ${APP_NAME} v${APP_VERSION}..."

# 创建用户
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd -r -s /bin/false "$SERVICE_USER"
fi

# 创建目录
sudo mkdir -p "$DEPLOY_DIR"
sudo chown "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"

# 编译应用
make clean
make release

# 复制文件
sudo cp build/release/myapp "$DEPLOY_DIR/"
sudo cp config/myapp.conf "$DEPLOY_DIR/"
sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$DEPLOY_DIR"
sudo chmod +x "$DEPLOY_DIR/myapp"

# 创建systemd服务
sudo tee /etc/systemd/system/myapp.service > /dev/null << EOF
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$DEPLOY_DIR
ExecStart=$DEPLOY_DIR/myapp
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp

echo "Deployment completed successfully!"
echo "Service status:"
sudo systemctl status myapp
```

## 总结

Linux x86/x64平台为现代应用开发提供了强大的基础：

### 核心优势
- **性能卓越**：充分利用x86架构的计算能力
- **生态丰富**：完整的开发工具链和库支持
- **稳定可靠**：经过大规模生产环境验证
- **成本效益**：开源特性降低总体拥有成本

### 适用场景
- **企业服务器**：Web服务、数据库、应用服务器
- **云计算平台**：虚拟化、容器化、微服务
- **高性能计算**：科学计算、数据分析、机器学习
- **开发环境**：CI/CD、测试、构建系统

### 发展方向
- **容器化**：Docker和Kubernetes成为标准
- **云原生**：微服务和Serverless架构
- **性能优化**：SIMD、多核并行、内存优化
- **安全增强**：零信任架构、容器安全

Linux x86平台将继续作为企业级应用的主要选择，其开放性、稳定性和性能优势使其在云计算时代仍然具有重要地位。