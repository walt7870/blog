---
title: 嵌入式开发
author: Walt
date: 2026-05-17
---

# 嵌入式开发

嵌入式开发是面向特定功能的计算机系统开发，目标硬件通常是微控制器（MCU）或嵌入式处理器，运行环境受限于有限的内存、算力和功耗预算。与通用软件开发相比，嵌入式开发需要同时理解硬件和软件，写出的代码直接操控物理世界。

从智能手表到工业机器人，从汽车 ECU 到卫星姿态控制，嵌入式系统无处不在。这个专题从零开始，覆盖电路基础、MCU 原理、C 编程、工具链、外设驱动、RTOS、通信协议、嵌入式 Linux、硬件设计、平台实战到综合项目，目标是帮助一个完全没有硬件背景的开发者建立完整的嵌入式能力。

## 知识体系

![嵌入式知识体系](/embedded/knowledge-map.svg)

嵌入式开发的知识从底向上分为五层：

| 层级     | 内容                                         | 对应文档                                           |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| 电子基础   | 电路原理、元器件、数字逻辑                              | [电子电路基础](./electronics.md)                     |
| 硬件平台   | MCU 架构、时钟/中断/存储、原理图与 PCB                   | [微控制器](./mcu.md)、[硬件设计](./hardware-design.md) |
| 系统软件   | 裸机编程、启动流程、链接脚本、RTOS                        | [C 编程](./c-programming.md)、[RTOS](./rtos.md)  |
| 驱动与协议  | GPIO/SPI/I2C/UART/CAN/BLE/Wi-Fi            | [外设驱动](./peripherals.md)、[通信协议](./communication.md) |
| 应用与集成  | 产品逻辑、OTA、低功耗、嵌入式 Linux、云接入                 | [嵌入式 Linux](./linux-embedded.md)、[项目案例](./projects.md) |

## 学习路线

### 第一阶段：入门（0~3 个月）

目标：能在 STM32 上点亮 LED、读传感器、串口打印。

1. [电子电路基础](./electronics.md) — 欧姆定律、电阻电容、万用表使用、面包板接线
2. [微控制器原理与选型](./mcu.md) — 理解 ARM Cortex-M 架构、寄存器、中断
3. [嵌入式 C 编程](./c-programming.md) — 指针、位操作、volatile、结构体
4. [开发工具链](./toolchain.md) — 安装 GCC ARM、学会用 VS Code + OpenOCD 烧录调试

入门推荐开发板：**STM32F103C8T6**（蓝色药丸，10 元左右）或 **STM32F407 Discovery**（带更多外设）。

### 第二阶段：进阶（3~9 个月）

目标：能独立完成一个带通信功能的嵌入式产品原型。

5. [外设驱动开发](./peripherals.md) — 掌握 GPIO/UART/SPI/I2C/ADC/PWM/DMA
6. [实时操作系统](./rtos.md) — FreeRTOS 任务管理、同步原语、内存管理
7. [通信协议实战](./communication.md) — CAN 总线、Modbus、BLE、MQTT 上云
8. [硬件设计入门](./hardware-design.md) — 能看懂原理图、理解电源设计、画简单 PCB

进阶推荐开发板：**ESP32-S3**（Wi-Fi + BLE + 丰富外设）、**STM32H7 Nucleo**（高性能 Cortex-M7）。

### 第三阶段：精通（9~18 个月）

目标：能设计完整的嵌入式产品，从硬件选型到量产。

9. [嵌入式 Linux](./linux-embedded.md) — U-Boot、内核裁剪、设备树、驱动框架、Buildroot/Yocto
10. [主流平台实战](./platforms.md) — 深入 STM32 CubeMX、ESP-IDF、树莓派、RISC-V
11. [综合项目案例](./projects.md) — 智能家居网关、环境监测站、OTA 系统、低功耗节点
12. [职业发展与进阶](./career.md) — 岗位分类、面试准备、从工程师到架构师

精通推荐平台：**i.MX6ULL / 全志 T113**（嵌入式 Linux）、**GD32VF103 / BL602**（RISC-V 生态）。

## 各模块导读

| 文档 | 覆盖内容 | 适合阶段 |
|------|---------|---------|
| [电子电路基础](./electronics.md) | 欧姆定律、RCL 元件、半导体器件、运放、数字逻辑、测量工具 | 入门 |
| [微控制器原理与选型](./mcu.md) | ARM/RISC-V 架构、存储体系、时钟树、中断、启动流程、选型方法 | 入门 |
| [嵌入式 C 编程](./c-programming.md) | 指针与内存模型、位操作、volatile/const、链接脚本、裸机编程范式 | 入门 |
| [开发工具链](./toolchain.md) | GCC ARM、Makefile/CMake、OpenOCD、J-Link、GDB、IDE 选择 | 入门 |
| [外设驱动开发](./peripherals.md) | GPIO/UART/SPI/I2C/ADC/PWM/DMA/看门狗，寄存器级 + HAL 双写法 | 进阶 |
| [实时操作系统](./rtos.md) | 调度算法、同步原语、内存管理、FreeRTOS/RT-Thread/Zephyr 对比 | 进阶 |
| [通信协议实战](./communication.md) | CAN/Modbus/BLE GATT/Wi-Fi/LoRaWAN/MQTT，含完整收发代码 | 进阶 |
| [硬件设计入门](./hardware-design.md) | 原理图阅读、PCB 布局布线、电源设计、ESD/EMC、打样流程 | 进阶 |
| [嵌入式 Linux](./linux-embedded.md) | U-Boot、内核裁剪、设备树、Buildroot/Yocto、驱动框架 | 精通 |
| [主流平台实战](./platforms.md) | STM32 CubeMX、ESP-IDF、树莓派、RISC-V 开发实践 | 精通 |
| [综合项目案例](./projects.md) | 智能网关、环境监测、无人小车、OTA 升级、低功耗节点 | 精通 |
| [职业发展与进阶](./career.md) | 岗位分类、技能树、面试准备、开源贡献、架构师成长路径 | 全阶段 |

## 嵌入式 vs 通用软件开发

| 维度       | 通用软件开发                | 嵌入式开发                          |
| -------- | --------------------- | ------------------------------ |
| 运行环境     | OS 托管（Linux/Windows）   | 裸机或 RTOS，资源极度受限                |
| 内存       | GB 级，有虚拟内存            | KB~MB 级，无 MMU 或受限 MMU          |
| 调试方式     | 打断点、日志、profiler       | JTAG/SWD、逻辑分析仪、示波器             |
| 编程语言     | 多样（Python/Java/Go…）   | C 为主，C++ 次之，Rust 新兴            |
| 关注点      | 业务逻辑、并发、分布式           | 时序、功耗、中断响应、硬件寄存器               |
| 交付物      | 可执行文件 / 容器镜像          | 固件二进制（.bin/.hex）烧录到 Flash      |
| 错误代价     | 重启 / 回滚               | 可能烧板、召回产品                      |

## 开发板选型建议

### 入门（预算 < 50 元）

| 开发板                    | MCU              | 特点                                  |
| ---------------------- | ---------------- | ----------------------------------- |
| STM32F103C8T6（蓝色药丸）    | Cortex-M3 72MHz  | 便宜、资料多、适合学寄存器操作                     |
| Arduino Uno R3         | ATmega328P       | 生态最大、库最多，但不适合深入学习底层                 |
| ESP32-C3 DevKit        | RISC-V 160MHz    | 带 Wi-Fi/BLE、价格低、ESP-IDF 文档好        |

### 进阶（预算 50~200 元）

| 开发板                    | MCU              | 特点                                  |
| ---------------------- | ---------------- | ----------------------------------- |
| STM32F407 Discovery    | Cortex-M4 168MHz | 带 FPU、丰富外设、适合学 RTOS 和 DSP           |
| ESP32-S3 DevKitC       | Xtensa 240MHz    | 双核、Wi-Fi/BLE5、USB OTG、AI 加速         |
| Nucleo-H743ZI          | Cortex-M7 480MHz | 高性能、大内存、适合复杂项目                      |

### 精通（嵌入式 Linux 方向）

| 开发板                    | SoC              | 特点                                  |
| ---------------------- | ---------------- | ----------------------------------- |
| 正点原子 i.MX6ULL         | Cortex-A7 800MHz | 国内资料最全的 Linux 学习板                   |
| 全志 T113-S3 / D1s       | RISC-V / ARM     | 便宜、适合学 Buildroot                    |
| 树莓派 4B / 5             | Cortex-A72/A76   | 生态强大，但偏通用 Linux 而非传统嵌入式            |

## 学习资源

### 书籍

- 《嵌入式系统设计与实践》（Elecia White）— 工程方法论
- 《ARM Cortex-M3 与 Cortex-M4 权威指南》（Joseph Yiu）— 架构圣经
- 《FreeRTOS 内核实现与应用开发实战》— RTOS 入门
- 《Linux 设备驱动程序》（LDD3）— 嵌入式 Linux 驱动经典
- 《The Art of Electronics》（Horowitz & Hill）— 电子电路圣经

### 社区与资源

- [STM32 官方文档](https://www.st.com/en/microcontrollers-microprocessors/stm32-32-bit-arm-cortex-mcus.html) — Reference Manual 是第一手资料
- [ESP-IDF 编程指南](https://docs.espressif.com/projects/esp-idf/en/latest/) — ESP32 官方框架
- [RT-Thread 社区](https://www.rt-thread.org/) — 国产 RTOS，中文文档友好
- [EEVblog 论坛](https://www.eevblog.com/forum/) — 硬件工程师社区
- [嘉立创 EDA](https://lceda.cn/) — 免费 PCB 设计 + 打样

### 开源项目（适合学习和贡献）

- [FreeRTOS](https://github.com/FreeRTOS/FreeRTOS) — 最流行的嵌入式 RTOS
- [Zephyr](https://github.com/zephyrproject-rtos/zephyr) — Linux 基金会支持的现代 RTOS
- [MicroPython](https://github.com/micropython/micropython) — MCU 上跑 Python
- [PlatformIO](https://platformio.org/) — 跨平台嵌入式开发工具
- [OpenMV](https://github.com/openmv/openmv) — 嵌入式机器视觉
