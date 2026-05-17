---
title: 嵌入式 C 编程
author: Walt
date: 2026-05-17
---

# 嵌入式 C 编程

嵌入式开发的主力语言是 C。不是因为 C 好写，而是因为 C 能精确控制内存布局、直接操作硬件地址、生成高效的机器码，且几乎所有 MCU 都有成熟的 C 编译器支持。

本篇不是 C 语言入门教程，而是聚焦"嵌入式场景下 C 的特殊用法"——那些在应用层开发中很少碰到，但在固件开发中天天要用的东西。

## 一、指针与内存

### 指针即地址

在 MCU 上，指针就是一个 32 位整数，代表内存地址。操作外设寄存器的本质就是通过指针读写特定地址：

```c
// 直接操作 GPIOA 的输出数据寄存器
#define GPIOA_ODR  (*(volatile uint32_t *)0x40020014)

GPIOA_ODR |= (1 << 5);   // PA5 输出高电平（点亮 LED）
GPIOA_ODR &= ~(1 << 5);  // PA5 输出低电平
```

### 函数指针

中断向量表本质上是一个函数指针数组：

```c
typedef void (*IRQHandler)(void);

__attribute__((section(".isr_vector")))
const IRQHandler vector_table[] = {
    (IRQHandler)&_estack,    // 初始栈指针
    Reset_Handler,           // 复位向量
    NMI_Handler,
    HardFault_Handler,
    // ...
};
```

### 指针运算陷阱

```c
uint32_t *p = (uint32_t *)0x20000000;
p++;  // 地址增加 4（不是 1），因为 sizeof(uint32_t) == 4
```

## 二、位操作

MCU 的寄存器是按位控制的，位操作是最基本的技能。

### 常用操作

```c
// 置位（Set bit）
reg |= (1 << n);

// 清位（Clear bit）
reg &= ~(1 << n);

// 翻转（Toggle bit）
reg ^= (1 << n);

// 读位（Read bit）
if (reg & (1 << n)) { /* bit is set */ }

// 设置多位字段
reg = (reg & ~(0x3 << 4)) | (value << 4);  // 清除 bit[5:4] 再写入
```

### 位域（Bit Field）

```c
typedef struct {
    uint32_t mode   : 2;   // bit[1:0]
    uint32_t otype  : 1;   // bit[2]
    uint32_t ospeed : 2;   // bit[4:3]
    uint32_t pupd   : 2;   // bit[6:5]
    uint32_t reserved : 25;
} GPIO_MODER_Bits;
```

注意：位域的内存布局依赖编译器和平台，跨平台代码慎用。寄存器操作推荐用移位 + 掩码。

## 三、volatile 关键字

`volatile` 告诉编译器"这个变量可能被外部因素改变，不要优化掉对它的读写"。

**必须用 volatile 的场景**：

1. 硬件寄存器（外设可能随时改变寄存器值）
2. 中断服务函数和主循环共享的变量
3. 多任务共享变量（RTOS 环境）

```c
// 错误：编译器可能优化掉循环中的读取
uint32_t *status = (uint32_t *)0x40020010;
while (!(*status & 0x01)) {}  // 可能被优化成死循环

// 正确：
volatile uint32_t *status = (volatile uint32_t *)0x40020010;
while (!(*status & 0x01)) {}  // 每次都真正读取硬件
```

```c
// 中断与主循环共享
volatile uint8_t rx_flag = 0;

void USART1_IRQHandler(void) {
    rx_flag = 1;  // 中断中置位
}

int main(void) {
    while (1) {
        if (rx_flag) {   // 主循环检测
            rx_flag = 0;
            process_data();
        }
    }
}
```

## 四、const 的嵌入式用法

`const` 修饰的全局变量会被放到 Flash（.rodata 段）而不是 SRAM（.data 段）。在 RAM 紧张的 MCU 上，把查找表、字符串、配置数据声明为 const 能节省宝贵的 RAM。

```c
// 放在 Flash，不占 RAM
const uint16_t sin_table[256] = { /* ... */ };
const char firmware_version[] = "v1.2.3";

// 放在 RAM（浪费）
uint16_t sin_table[256] = { /* ... */ };
```

## 五、结构体与内存对齐

### 对齐规则

ARM Cortex-M 要求数据按自然对齐访问（uint32_t 地址必须是 4 的倍数）。编译器会自动插入填充字节：

```c
struct Bad {
    uint8_t  a;   // offset 0
    // 3 bytes padding
    uint32_t b;   // offset 4
    uint8_t  c;   // offset 8
    // 3 bytes padding
};  // sizeof = 12

struct Good {
    uint32_t b;   // offset 0
    uint8_t  a;   // offset 4
    uint8_t  c;   // offset 5
    // 2 bytes padding
};  // sizeof = 8
```

### packed 属性

通信协议解析时经常需要取消对齐填充：

```c
typedef struct __attribute__((packed)) {
    uint8_t  header;
    uint16_t length;
    uint32_t timestamp;
    uint8_t  payload[64];
    uint16_t crc;
} Packet;
```

注意：packed 结构体在某些平台上访问未对齐字段会触发 HardFault 或性能下降。

## 六、链接脚本

链接脚本（.ld 文件）告诉链接器如何把编译后的段放到 MCU 的物理内存中。

```ld
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 512K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS {
    .text : {           /* 代码段 → Flash */
        *(.isr_vector)
        *(.text*)
        *(.rodata*)
    } > FLASH

    .data : {           /* 已初始化全局变量 → RAM（初始值存 Flash） */
        _sdata = .;
        *(.data*)
        _edata = .;
    } > RAM AT > FLASH

    .bss : {            /* 未初始化全局变量 → RAM（启动时清零） */
        _sbss = .;
        *(.bss*)
        *(COMMON)
        _ebss = .;
    } > RAM

    _estack = ORIGIN(RAM) + LENGTH(RAM);  /* 栈顶 */
}
```

理解链接脚本才能做：自定义 Bootloader 分区、把关键函数放到 RAM 执行（提速）、多固件共存。

## 七、启动文件

启动文件（startup_xxx.s）是 MCU 上电后执行的第一段代码，用汇编写：

```asm
Reset_Handler:
    ldr   sp, =_estack       /* 设置栈指针 */
    
    /* 拷贝 .data 段从 Flash 到 RAM */
    ldr   r0, =_sdata
    ldr   r1, =_edata
    ldr   r2, =_sidata
copy_loop:
    cmp   r0, r1
    bge   zero_bss
    ldr   r3, [r2], #4
    str   r3, [r0], #4
    b     copy_loop

    /* 清零 .bss 段 */
zero_bss:
    ldr   r0, =_sbss
    ldr   r1, =_ebss
    mov   r2, #0
bss_loop:
    cmp   r0, r1
    bge   call_main
    str   r2, [r0], #4
    b     bss_loop

call_main:
    bl    SystemInit          /* 配置时钟 */
    bl    main                /* 进入用户代码 */
    b     .                   /* main 不应返回，死循环兜底 */
```

## 八、裸机编程范式

不用 RTOS 时，常见的程序结构：

### 超级循环（Super Loop）

```c
int main(void) {
    system_init();
    
    while (1) {
        task_sensor_read();
        task_display_update();
        task_communication();
    }
}
```

问题：如果某个 task 耗时长，其他 task 响应变慢。

### 时间片轮询

```c
static uint32_t tick = 0;

void SysTick_Handler(void) { tick++; }

int main(void) {
    system_init();
    
    while (1) {
        if (tick - last_sensor >= 100) {    // 每 100ms
            last_sensor = tick;
            task_sensor_read();
        }
        if (tick - last_display >= 500) {   // 每 500ms
            last_display = tick;
            task_display_update();
        }
        if (tick - last_comm >= 10) {       // 每 10ms
            last_comm = tick;
            task_communication();
        }
    }
}
```

### 状态机

复杂逻辑用状态机拆解：

```c
typedef enum { IDLE, CONNECTING, SENDING, WAITING_ACK, ERROR } State;

void task_communication(void) {
    static State state = IDLE;
    
    switch (state) {
    case IDLE:
        if (has_data_to_send()) state = CONNECTING;
        break;
    case CONNECTING:
        start_connection();
        state = SENDING;
        break;
    case SENDING:
        send_packet();
        state = WAITING_ACK;
        break;
    case WAITING_ACK:
        if (ack_received()) state = IDLE;
        else if (timeout()) state = ERROR;
        break;
    case ERROR:
        reset_connection();
        state = IDLE;
        break;
    }
}
```

## 九、常见陷阱

| 陷阱                  | 后果                | 防范                              |
| ------------------- | ----------------- | ------------------------------- |
| 栈溢出                 | HardFault 或数据损坏   | 控制递归深度、减少局部大数组、用静态分析工具检查栈深度    |
| 未初始化变量              | 随机行为              | 开启 -Wall -Werror，.bss 段启动时清零   |
| 中断中操作非原子变量          | 数据竞争              | 关中断保护、用 volatile + 原子操作        |
| 整数溢出                | 计算错误              | 用 uint32_t 做定时器差值比较，避免有符号溢出    |
| 指针越界                | 写坏其他变量或外设寄存器      | 边界检查、MPU 保护                    |
| 忘记清中断标志             | 中断反复触发            | ISR 里第一件事就是清标志                  |

返回 [总览与学习路线](./index.md)
