---
title: 主流平台实战
author: Walt
date: 2026-05-17
---

# 主流平台实战

不同平台有不同的开发生态和最佳实践。本篇覆盖嵌入式开发中最常用的四个平台：STM32（工业标杆）、ESP32（IoT 首选）、树莓派（Linux 入门）、RISC-V（新兴生态）。

## 一、STM32（CubeMX + HAL）

### 开发流程

1. **CubeMX 配置**：图形化选择引脚功能、时钟树、外设参数
2. **生成代码**：选择工具链（Makefile/CMake/Keil/IAR），生成初始化代码
3. **编写业务逻辑**：在 `/* USER CODE BEGIN */` 和 `/* USER CODE END */` 之间写代码
4. **编译烧录调试**：GCC + OpenOCD 或 Keil + ST-Link

### 项目结构

```
project/
├── Core/
│   ├── Inc/          # 用户头文件
│   └── Src/          # main.c、中断处理、系统初始化
├── Drivers/
│   ├── CMSIS/        # ARM 内核头文件
│   └── STM32F4xx_HAL_Driver/  # HAL 库源码
├── Middlewares/      # FreeRTOS、USB、FATFS 等中间件
├── STM32F407VGTx_FLASH.ld    # 链接脚本
├── Makefile
└── .ioc             # CubeMX 工程文件
```

### HAL vs LL vs 寄存器

| 层级     | 特点                    | 适用场景          |
| ------ | --------------------- | ------------- |
| HAL    | 高度抽象、跨系列移植方便、代码量大     | 快速开发、不关心底层    |
| LL     | 轻量封装、接近寄存器、效率高        | 对性能敏感的外设操作    |
| 寄存器直接操作 | 最高效、最灵活、可读性差         | 学习原理、极致优化     |

### 常见坑

- CubeMX 重新生成会覆盖 USER CODE 区域外的修改
- HAL_Delay() 在中断中调用会死锁（SysTick 优先级问题）
- DMA 传输完成后要手动 Invalidate Cache（M7 系列）
- 时钟配置错误导致串口乱码是最常见的新手问题

## 二、ESP32（ESP-IDF + Arduino）

### ESP-IDF（官方框架）

ESP-IDF 是乐鑫官方的开发框架，基于 FreeRTOS，功能完整。

```bash
# 安装
mkdir -p ~/esp && cd ~/esp
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf && ./install.sh
source export.sh

# 创建项目
idf.py create-project my_project
cd my_project

# 配置
idf.py menuconfig

# 编译、烧录、监控
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

### 项目结构

```
my_project/
├── main/
│   ├── CMakeLists.txt
│   └── main.c
├── components/       # 自定义组件
├── sdkconfig         # menuconfig 生成的配置
└── CMakeLists.txt
```

### Wi-Fi + BLE 双模

ESP32 的核心优势是集成 Wi-Fi 和 BLE，且 ESP-IDF 提供完整的协议栈：

```c
// Wi-Fi Station 模式
esp_wifi_init(&cfg);
esp_wifi_set_mode(WIFI_MODE_STA);
esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
esp_wifi_start();

// BLE GATT Server
esp_ble_gatts_register_callback(gatts_event_handler);
esp_ble_gap_set_device_name("ESP32_SENSOR");
esp_ble_gatts_app_register(0);
```

### Arduino 模式

ESP32 也支持 Arduino 框架，适合快速原型：

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient mqtt(espClient);

void setup() {
    WiFi.begin("SSID", "PASSWORD");
    while (WiFi.status() != WL_CONNECTED) delay(500);
    mqtt.setServer("broker.emqx.io", 1883);
    mqtt.connect("esp32_client");
}

void loop() {
    mqtt.publish("sensor/temp", String(readTemp()).c_str());
    mqtt.loop();
    delay(5000);
}
```

### ESP32 vs STM32

| 维度       | ESP32                | STM32              |
| -------- | -------------------- | ------------------ |
| 无线       | Wi-Fi + BLE 内置       | 需要外挂模块             |
| 实时性      | FreeRTOS，但 Wi-Fi 协议栈占资源 | 裸机或 RTOS，确定性更强  |
| 功耗       | 活跃时较高（Wi-Fi ~240mA）  | 可以做到 µA 级          |
| 外设精度     | ADC 精度一般             | ADC/DAC/Timer 精度高  |
| 生态       | IoT 生态强              | 工业生态强              |

## 三、树莓派（Linux + GPIO）

树莓派是学习嵌入式 Linux 的最佳入门平台，但它更接近"小型 Linux 电脑"而非传统嵌入式。

### 基本使用

```bash
# 烧录系统（Raspberry Pi OS）
# 用 Raspberry Pi Imager 工具写入 SD 卡

# SSH 连接
ssh pi@raspberrypi.local

# GPIO 操作（Python）
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(18, GPIO.OUT)
GPIO.output(18, GPIO.HIGH)

# 或用 gpiozero（更 Pythonic）
from gpiozero import LED, Button
led = LED(18)
button = Button(17)
button.when_pressed = led.on
button.when_released = led.off
```

### 适合树莓派的项目

- 智能家居中控（Home Assistant）
- 网络摄像头 + 图像识别
- NAS / 广告拦截（Pi-hole）
- 学习 Linux 系统管理和驱动开发
- 机器人上位机（ROS）

### 树莓派的局限

- 不适合低功耗电池产品（待机功耗 > 100mA）
- 启动慢（十几秒），不适合需要即时响应的场景
- GPIO 没有硬件 PWM 精度（软件模拟抖动大）
- 不是实时系统，不适合精确时序控制

## 四、RISC-V

RISC-V 是开源指令集架构，近年在国产 MCU 中快速普及。

### 主流 RISC-V MCU

| 芯片          | 厂商    | 特点                          |
| ----------- | ----- | --------------------------- |
| GD32VF103   | 兆易创新  | 对标 STM32F103，国产替代           |
| CH32V303    | 沁恒    | 高性价比，USB + CAN              |
| BL602/BL616 | 博流智能  | Wi-Fi + BLE，IoT 方向          |
| ESP32-C3/C6 | 乐鑫    | RISC-V + Wi-Fi/BLE，ESP-IDF 生态 |
| K210        | 嘉楠    | 双核 + KPU（AI 加速），视觉应用       |

### 开发工具

```bash
# GCC 工具链
# 使用 xPack 或 MounRiver Studio（沁恒官方 IDE）

# ESP32-C3 直接用 ESP-IDF
idf.py set-target esp32c3
idf.py build flash monitor

# GD32VF103 用 PlatformIO
pio init --board gd32vf103c_start
pio run --target upload
```

### RISC-V 的优势与现状

优势：
- 无授权费，芯片成本更低
- 指令集可定制扩展
- 工具链完全开源（GCC/LLVM/GDB 原生支持）
- 国产化趋势下的首选架构

现状：
- 生态不如 ARM 成熟（库、例程、社区）
- 部分调试工具支持不完善
- 高性能核心（对标 Cortex-A）还在追赶

## 五、跨平台开发建议

- **抽象硬件层**：用 HAL 或自定义接口隔离硬件差异，业务逻辑可跨平台复用
- **统一构建系统**：CMake 或 PlatformIO 支持多平台
- **选择跨平台 RTOS**：FreeRTOS、Zephyr 支持 ARM + RISC-V + ESP32
- **模块化设计**：通信协议栈、数据处理算法做成独立模块，不依赖特定硬件

返回 [总览与学习路线](./index.md)
