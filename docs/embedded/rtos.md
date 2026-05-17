---
title: 实时操作系统
author: Walt
date: 2026-05-17
---

# 实时操作系统

当裸机的超级循环无法满足多任务并发、优先级调度、精确定时的需求时，就需要 RTOS（Real-Time Operating System）。RTOS 不是 Linux 那种通用 OS，它极度轻量（内核几 KB），专为确定性响应设计。

## 一、为什么需要 RTOS

裸机超级循环的问题：

- 某个任务耗时长会阻塞其他任务
- 无法保证高优先级任务的响应时间
- 复杂状态机难以维护
- 多人协作时代码耦合严重

RTOS 解决这些问题的方式：把程序拆成多个独立任务（线程），由调度器按优先级分配 CPU 时间。

## 二、核心概念

### 任务（Task / Thread）

每个任务是一个独立的执行流，有自己的栈空间。

```c
// FreeRTOS 创建任务
void led_task(void *param) {
    while (1) {
        HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
        vTaskDelay(pdMS_TO_TICKS(500));  // 让出 CPU 500ms
    }
}

xTaskCreate(led_task, "LED", 128, NULL, 1, NULL);
//          函数      名字   栈大小 参数  优先级 句柄
```

### 调度器

决定哪个任务获得 CPU。常见策略：

- **抢占式优先级调度**：高优先级任务就绪时立即抢占低优先级任务（FreeRTOS 默认）
- **时间片轮转**：同优先级任务轮流执行，每个时间片（通常 1ms）切换一次
- **协作式调度**：任务主动让出 CPU（少用，确定性差）

### 临界区与中断管理

```c
// 进入临界区（关中断）
taskENTER_CRITICAL();
shared_variable++;
taskEXIT_CRITICAL();

// 在 ISR 中使用 FromISR 版本的 API
BaseType_t xHigherPriorityTaskWoken = pdFALSE;
xSemaphoreGiveFromISR(sem, &xHigherPriorityTaskWoken);
portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
```

## 三、同步与通信原语

### 信号量（Semaphore）

```c
// 二值信号量：中断通知任务
SemaphoreHandle_t uart_sem = xSemaphoreCreateBinary();

void USART1_IRQHandler(void) {
    // ... 处理接收
    xSemaphoreGiveFromISR(uart_sem, NULL);
}

void uart_task(void *param) {
    while (1) {
        xSemaphoreTake(uart_sem, portMAX_DELAY);  // 阻塞等待
        process_uart_data();
    }
}
```

### 互斥锁（Mutex）

保护共享资源，带优先级继承防止优先级反转。

```c
SemaphoreHandle_t spi_mutex = xSemaphoreCreateMutex();

void task_a(void *param) {
    xSemaphoreTake(spi_mutex, portMAX_DELAY);
    spi_transfer(data_a, len_a);
    xSemaphoreGive(spi_mutex);
}
```

### 消息队列（Queue）

任务间传递数据的安全通道。

```c
QueueHandle_t sensor_queue = xQueueCreate(10, sizeof(SensorData));

// 生产者
void sensor_task(void *param) {
    SensorData d;
    while (1) {
        d.temperature = read_temp();
        d.humidity = read_humi();
        xQueueSend(sensor_queue, &d, portMAX_DELAY);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

// 消费者
void display_task(void *param) {
    SensorData d;
    while (1) {
        xQueueReceive(sensor_queue, &d, portMAX_DELAY);
        lcd_show_temp(d.temperature);
    }
}
```

### 事件组（Event Group）

多个事件的组合等待。

```c
EventGroupHandle_t events = xEventGroupCreate();
#define EVT_WIFI_CONNECTED  (1 << 0)
#define EVT_SENSOR_READY    (1 << 1)

// 等待 Wi-Fi 连接且传感器就绪
xEventGroupWaitBits(events, EVT_WIFI_CONNECTED | EVT_SENSOR_READY,
                    pdTRUE, pdTRUE, portMAX_DELAY);
```

### 软件定时器

```c
TimerHandle_t heartbeat = xTimerCreate("HB", pdMS_TO_TICKS(5000),
                                        pdTRUE, NULL, heartbeat_callback);
xTimerStart(heartbeat, 0);

void heartbeat_callback(TimerHandle_t timer) {
    send_heartbeat_packet();
}
```

## 四、内存管理

FreeRTOS 提供 5 种堆实现：

| 方案    | 特点                          | 适用场景          |
| ----- | --------------------------- | ------------- |
| heap_1 | 只分配不释放                     | 任务/队列创建后不删除   |
| heap_2 | 支持释放但不合并碎片                 | 固定大小块分配       |
| heap_3 | 封装标准 malloc/free            | 有 C 库的平台      |
| heap_4 | 支持释放且合并相邻空闲块               | 通用推荐          |
| heap_5 | heap_4 + 支持不连续内存区域          | 多块 RAM 的 MCU  |

栈溢出检测：

```c
// FreeRTOSConfig.h
#define configCHECK_FOR_STACK_OVERFLOW 2

void vApplicationStackOverflowHook(TaskHandle_t task, char *name) {
    printf("Stack overflow in task: %s\n", name);
    while (1);  // 停在这里方便调试
}
```

## 五、主流 RTOS 对比

| 维度       | FreeRTOS          | RT-Thread         | Zephyr            |
| -------- | ----------------- | ----------------- | ----------------- |
| 许可证      | MIT               | Apache 2.0        | Apache 2.0        |
| 内核大小     | 6~10 KB           | 3~10 KB           | 8~20 KB           |
| 组件生态     | 内核精简，AWS IoT 集成   | 丰富（文件系统/网络/GUI）   | 极丰富（蓝牙/网络/USB）   |
| 中文文档     | 一般                | 优秀                | 一般                |
| 支持芯片     | 几乎所有 MCU          | 主流 ARM/RISC-V     | 广泛（Nordic/ST/NXP） |
| 学习曲线     | 低                 | 中                 | 高                 |
| 适合场景     | 入门学习、简单产品         | 国产生态、中等复杂度产品      | BLE/Thread/复杂 IoT |

### 选型建议

- **入门学习**：FreeRTOS（资料最多、API 最简单）
- **国产芯片 + 中文生态**：RT-Thread（软件包丰富、社区活跃）
- **BLE/Thread/Matter 产品**：Zephyr（Nordic 官方支持）
- **安全认证产品**：SafeRTOS（FreeRTOS 的认证版本）或 Zephyr（有安全子系统）

## 六、FreeRTOS 实战配置

### FreeRTOSConfig.h 关键配置

```c
#define configUSE_PREEMPTION            1       // 抢占式调度
#define configCPU_CLOCK_HZ              168000000
#define configTICK_RATE_HZ              1000    // 1ms tick
#define configMAX_PRIORITIES            5
#define configMINIMAL_STACK_SIZE        128     // 最小栈（单位：字）
#define configTOTAL_HEAP_SIZE           (32 * 1024)
#define configUSE_MUTEXES               1
#define configUSE_COUNTING_SEMAPHORES   1
#define configUSE_QUEUE_SETS            1
#define configUSE_TIMERS                1
#define configTIMER_TASK_STACK_DEPTH    256
```

### 典型任务架构

```
优先级 4（最高）：硬件中断处理任务（接收 ISR 信号量后处理）
优先级 3：通信任务（UART/CAN/BLE 收发）
优先级 2：业务逻辑任务（传感器采集、控制算法）
优先级 1：显示/日志任务
优先级 0（最低）：空闲任务（IDLE，可在此进入低功耗）
```

## 七、调试技巧

- **任务状态查看**：`vTaskList()` 打印所有任务的状态、优先级、剩余栈
- **运行时统计**：`vTaskGetRunTimeStats()` 查看各任务 CPU 占用率
- **Tracealyzer**：SEGGER 出品的 RTOS 可视化分析工具，能看到任务切换时序
- **栈水位线**：`uxTaskGetStackHighWaterMark()` 查看任务栈最大使用量，据此调整栈大小

## 八、常见陷阱

| 问题              | 原因                      | 解决                          |
| --------------- | ----------------------- | --------------------------- |
| 优先级反转           | 低优先级任务持有锁，高优先级任务等待      | 用 Mutex（带优先级继承）而不是二值信号量     |
| 死锁              | 两个任务互相等待对方持有的锁          | 统一加锁顺序、设置超时                 |
| 栈溢出             | 任务栈分配太小                 | 开启溢出检测、用水位线函数调整             |
| ISR 中调用阻塞 API   | ISR 不能阻塞               | 只用 FromISR 版本的 API          |
| 任务饿死            | 高优先级任务不让出 CPU           | 确保高优先级任务有阻塞点（delay/等待信号量）  |

返回 [总览与学习路线](./index.md)
