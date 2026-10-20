---
title: 嵌入式 C 编程
author: Walt
date: 2026-05-17
---

# 嵌入式 C 编程

采集节点会把传感器字节解析成数值，把数值装进缓冲区，再交给 UART 或 DMA。C 允许精确表达这些操作，也把边界检查、对象寿命和并发责任交给程序。这里聚焦硬件访问和数据合同；完整外设初始化见[外设驱动](./peripherals.md)。

![寄存器、普通内存与 DMA 的访问合同](/embedded/c-memory-contract.svg)

## 指针、寄存器与位字段

指针是带类型的地址引用，其大小和表示由目标 ABI 决定，不能概括成“32 位整数”。许多 Cortex-M 目标使用 32 位地址，但主机测试可能是 64 位。内存映射寄存器还要求特定访问宽度、顺序和副作用；应优先使用匹配芯片的 CMSIS/厂商头文件。

以下是普通 `uint32_t` 值的字段更新函数，可在电脑上测试。它只修改 bit[5:4]，拒绝范围外的字段值，其他位保持原样。

```c
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>

bool set_mode(uint32_t original, uint32_t mode, uint32_t *out) {
    if (out == NULL || mode > UINT32_C(3)) return false;
    const uint32_t mask = UINT32_C(3) << 4;
    *out = (original & ~mask) | ((mode << 4) & mask);
    return true;
}
```

用于寄存器前还要查手册：读写普通配置寄存器可以采用掩码操作；写 1 清零（W1C）、读清零和只写寄存器不能套用读改写。STM32F4 的 GPIO BSRR 用独立的置位/复位写入避免 ODR 的读改写竞争，但不会让多次写入自动组成事务。移位使用无符号数，并验证移位量小于类型位宽。

## volatile 不提供线程同步

`volatile` 用于表达访问不能被当作普通内存读写随意消除或合并，具体语义仍受编译器和目标约定约束。它不保证读改写原子性、不建立线程间 happens-before，也不是 DMA Cache 维护或内存屏障的替代品。

例如 ISR 置 `rx_flag=1`，主循环先判断后清零；两步之间再次中断，第二次通知可能被清掉。给标志加 `volatile` 仍然丢事件。需要累计事件时可用 RTOS 的 ISR 安全队列或计数通知；裸机则在平台支持的短临界区内取走计数，并处理计数上限。使用 C 原子操作前确认目标实现是否无锁，以及是否允许在 ISR 中使用，不能让 ISR 调入会阻塞的库实现。

## 字节解析与对象寿命

把网络字节强制转成结构体指针，可能同时踩到对齐、字节序、对象有效类型和越界问题。`packed` 只影响布局，不解决全部问题。下面显式读取两个大端字节，空指针和短包都拒绝。

```c
bool read_u16_be(const uint8_t *buf, size_t len, uint16_t *out) {
    if (buf == NULL || out == NULL || len < 2) return false;
    *out = (uint16_t)(((uint16_t)buf[0] << 8) | buf[1]);
    return true;
}

bool elapsed(uint32_t now, uint32_t since, uint32_t interval) {
    return (uint32_t)(now - since) >= interval;
}
```

无符号 tick 差值允许跨一次计数回绕，但前提是实际经过时间没有达到完整计数周期，且周期内持续检查；它不是任意长时间的时间戳。周期调度还要决定超时后补跑、跳过还是重新起算，不能在延迟很久后无限补任务。

局部缓冲区并非永远不能用于 DMA，关键在于 DMA 完成前对象仍存活且不被修改。异步发送函数返回后，自动局部数组通常失效；静态数组解决寿命却未解决重入。应明确谁持有、何时释放、错误和取消后何时停止硬件访问。

## 链接地址与启动初始化

`const` 表示不可通过该限定类型修改对象，不保证对象一定放在 Flash。最终位置由链接脚本、节属性和加载方式决定。用 ELF 的段表和 map 文件验证，而不是从声明猜测 SRAM 用量。

典型 Cortex-M Flash 启动需要向量表、`.data` 的加载地址与运行地址、`.bss` 清零和栈边界。下面仅展示 GNU ld 的段关系；`FLASH`/`RAM` 区域、栈堆、异常展开和其他运行库段应沿用具体芯片完整脚本，不能独立烧录。

```ld
/* 位于目标链接脚本的 SECTIONS 内 */
.isr_vector : { KEEP(*(.isr_vector)) } > FLASH
.text : { *(.text*) *(.rodata*) . = ALIGN(4); } > FLASH
.data : {
    . = ALIGN(4); _sdata = .;
    *(.data*)
    . = ALIGN(4); _edata = .;
} > RAM AT > FLASH
_sidata = LOADADDR(.data);
.bss (NOLOAD) : {
    . = ALIGN(4); _sbss = .;
    *(.bss*) *(COMMON)
    . = ALIGN(4); _ebss = .;
} > RAM
```

复位处理程序把 `_sidata` 开始的初值复制到 `_sdata.._edata`，再清零 `_sbss.._ebss`。系统初始化和 C/C++ 运行库初始化的顺序应核对当前启动文件，尤其是外部 RAM 与构造函数；不能随意照抄另一块板子的汇编。向量表首项是初始栈指针，不宜把整个表描述为纯函数指针数组。

## 验证与排错

把前两段代码放进 `logic.c`，追加下面入口，可先验证与芯片无关的边界。

```c
#include <assert.h>

int main(void) {
    uint32_t value = 0;
    uint16_t word = 0;
    const uint8_t bytes[] = {0x12, 0x34};
    assert(set_mode(UINT32_C(0xffff), 2, &value));
    assert(value == UINT32_C(0xffef));
    assert(!set_mode(0, 4, &value));
    assert(!set_mode(0, 1, NULL));
    assert(read_u16_be(bytes, sizeof bytes, &word) && word == 0x1234);
    assert(!read_u16_be(bytes, 1, &word));
    assert(!read_u16_be(NULL, 2, &word));
    assert(elapsed(3, UINT32_MAX - 6, 10));
    assert(!elapsed(2, UINT32_MAX - 6, 10));
    return 0;
}
```

```bash
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined logic.c -o logic
./logic
```

主机通过后，再用目标工具链检查段和指令，并在板上验证寄存器行为。HardFault 排查保存故障寄存器、栈帧 PC/LR、构建对应 ELF 与复现输入；不是所有 Cortex-M 都支持同一组故障寄存器或非对齐访问。ISR 标志的清除顺序按具体外设手册执行，不能统一规定“进入 ISR 第一件事清标志”。

返回[总览](./index.md)。
