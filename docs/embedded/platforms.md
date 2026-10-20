---
title: 主流平台实战
author: Walt
date: 2026-05-17
---

# 主流平台实战

选平台时，完整开发链比芯片跑分更重要：能否固定 SDK、重建示例、连接调试器、恢复错误配置，并在目标板验证外设。下面分别说明 STM32、ESP32、树莓派和 RISC-V 的入口，不把不同芯片的无线、功耗和驱动能力混为一谈。

![同一采集业务在不同平台的适配边界](/embedded/platform-adapter-boundaries.svg)

## STM32：配置生成与业务隔离

先用板卡对应工程验证 LED 和串口，再在 CubeMX/CubeIDE 中检查 pinmux、时钟树、外设参数与中间件。生成方式由工具版本和工程目标决定，保存 `.ioc`、软件包版本与生成选项。业务模块放独立源文件，生成文件中只在受保护区接入，重新生成后检查 diff 并重建。

HAL、LL 和直接寄存器访问可以组合，但同一外设必须有明确所有者。不能一边让 HAL 管 DMA 状态，一边改寄存器绕过它，又期待状态机保持一致。性能瓶颈先用测量定位，再选择更直接的访问；裸寄存器并不自动更快或更正确。

最小验收包含复位启动、时钟实际频率、串口收发、错误回调与调试器重连。ISR 中调用依赖低优先级 tick 的 `HAL_Delay` 可能永远等待，应把延时工作转给主循环或任务。M7 的 Cache/DMA 方向与缓冲区规则见[外设驱动](./peripherals.md)。

## ESP32：先固定 SDK 和目标

ESP32 是一个系列：ESP32-S2 有 Wi-Fi 但无 Bluetooth，ESP32-H2 有 BLE/802.15.4 而无 Wi-Fi，C3/S3 等又有各自能力。STM32 也有无线系列，不能笼统写成“ESP32 全内置，STM32 全外挂”。

下面固定 ESP-IDF `v5.4.2`、目标 `esp32c3`，用于建立可复现的 hello_world 基线，并非当前最新版本推荐。安装脚本会下载主机工具；烧录命令会改写已连接的目标板，串口需替换为实际设备。

```bash
git clone --branch v5.4.2 --recursive https://github.com/espressif/esp-idf.git esp-idf-v5.4.2
cd esp-idf-v5.4.2
./install.sh esp32c3
source export.sh
cp -R examples/get-started/hello_world ../sensor-hello
cd ../sensor-hello
idf.py set-target esp32c3
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

保存 SDK 提交、`sdkconfig.defaults`、组件依赖和构建信息；生成的 `sdkconfig` 也按项目策略归档。`set-target` 会重新生成配置，应先保护已有修改。退出 monitor 常用 Ctrl+]。

联网从该 SDK 版本的 Wi-Fi/HTTPS/MQTT 官方完整示例起步，正确处理事件循环、获得 IP、TLS、凭据与重连。新 SDK 的组件组织可能变化，例如 ESP-IDF 6.x 中 ESP-MQTT 已独立为组件；不要把跨版本片段直接拼接。Arduino 适合原型，也要固定 core 和库版本，避免阻塞重连影响采样。

## 树莓派：Linux 用户态与实时边界

用 Raspberry Pi Imager 选择对应板卡系统，并设置用户名、主机名、网络与 SSH，不能依赖历史默认 `pi` 用户。连接后记录板型、系统、内核与 GPIO 库版本。GPIO 编号需要区分排针物理位置、BCM 编号与 gpiochip line offset。

gpiozero 在受支持的 Raspberry Pi OS 与合适后端上可用于简单输入输出，Pi 5 与旧版 RPi.GPIO 的支持不能混用。下面是 Python 文件内容，LED 必须串联限流电阻，外部输入不能超过引脚规格。

```python
from gpiozero import LED, Button
from signal import pause

led = LED(18)
button = Button(17, pull_up=True, bounce_time=0.05)
button.when_pressed = led.on
button.when_released = led.off
try:
    pause()
finally:
    button.close()
    led.close()
```

树莓派有硬件 PWM 能力，但具体引脚、内核配置、后端与资源占用决定如何使用。普通用户态软件定时仍受调度影响；电机闭环和严格脉冲可交给专用 MCU，Linux 负责规划、界面与日志。供电、散热、存储损坏恢复也应纳入网关验收。

## RISC-V：检查实现与生态

RISC-V 是 ISA，ESP32-C3、不同厂商 MCU 和 Linux SoC 可能采用完全不同的中断控制器、启动格式与 SDK。先使用芯片厂商支持的版本验证下载、调试和异常入口，再考虑统一构建。替换 Cortex-M 时，不能只重编 C 文件；检查汇编、原子操作、对齐、浮点 ABI、RTOS port、端序假设和驱动寄存器。

## 业务层如何复用

把采样值校验、帧解析和重试决策做成不依赖厂商头文件的模块，用主机测试覆盖；硬件层提供明确的读取、发送和时钟接口，说明阻塞、线程上下文与所有权。跨平台不是把所有 API 取相同名字，而是让错误、取消与完成语义保持一致。

返回[总览](./index.md)。
