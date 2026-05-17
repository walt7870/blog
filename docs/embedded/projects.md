---
title: 综合项目案例
author: Walt
date: 2026-05-17
---

# 综合项目案例

学完各模块知识后，需要通过完整项目把它们串起来。本篇给出五个由浅入深的项目，每个项目标注涉及的知识点和推荐平台。

## 一、环境监测站

**难度**：入门 → 进阶

**功能**：采集温湿度、气压、光照，本地 OLED 显示，串口上报数据。

**硬件清单**

| 模块          | 接口   | 芯片/型号        |
| ----------- | ---- | ------------ |
| MCU         | -    | STM32F103C8T6 |
| 温湿度+气压      | I2C  | BME280       |
| 光照          | ADC  | 光敏电阻分压       |
| 显示屏         | SPI  | 0.96" OLED SSD1306 |
| 调试/上报       | UART | USB-TTL      |

**软件架构**

```
main loop (时间片轮询)
├── 每 2s：读 BME280（I2C）
├── 每 2s：读 ADC（光照）
├── 每 500ms：刷新 OLED（SPI）
└── 每 5s：串口打印 JSON 数据
```

**涉及知识**：GPIO、I2C、SPI、ADC、定时器、printf 重定向。

**进阶扩展**：
- 加 ESP8266 模块，通过 AT 指令连 Wi-Fi，MQTT 上报到云平台
- 加 SD 卡模块，本地存储历史数据
- 加电池供电 + 低功耗模式，太阳能充电

## 二、智能家居网关

**难度**：进阶

**功能**：ESP32 作为网关，BLE 连接传感器节点，Wi-Fi 连接云平台，手机 App 远程查看和控制。

**系统架构**

```
[BLE 传感器节点] ←BLE→ [ESP32 网关] ←Wi-Fi/MQTT→ [云平台]
                                                      ↕
                                                 [手机 App]
```

**ESP32 网关核心任务**

```c
// FreeRTOS 任务划分
xTaskCreate(ble_scan_task, "BLE", 4096, NULL, 3, NULL);    // BLE 扫描和数据接收
xTaskCreate(mqtt_task, "MQTT", 4096, NULL, 2, NULL);       // MQTT 发布和订阅
xTaskCreate(control_task, "CTRL", 2048, NULL, 2, NULL);    // 下行控制指令分发
xTaskCreate(watchdog_task, "WDG", 1024, NULL, 1, NULL);    // 心跳和异常恢复
```

**涉及知识**：FreeRTOS 多任务、BLE GATT Client、Wi-Fi Station、MQTT、JSON 解析、OTA 升级。

**工程要点**：
- BLE 和 Wi-Fi 共存时注意射频时分复用
- MQTT 断线重连 + 消息缓存
- 看门狗防止网络异常导致死机
- NVS（Non-Volatile Storage）保存 Wi-Fi 配置

## 三、无人小车

**难度**：进阶 → 精通

**功能**：四轮驱动小车，超声波避障，红外循迹，蓝牙遥控，可选摄像头视觉。

**硬件清单**

| 模块       | 接口        | 说明                    |
| -------- | --------- | --------------------- |
| MCU      | -         | STM32F407             |
| 电机驱动     | PWM + GPIO | L298N 或 TB6612        |
| 超声波      | GPIO      | HC-SR04               |
| 红外循迹     | ADC/GPIO  | 5 路红外传感器              |
| 蓝牙       | UART      | HC-05 或 BLE 模块        |
| 编码器      | Timer 编码器模式 | 测速反馈                |
| 电源       | -         | 2S 锂电池 + DC-DC        |

**软件架构（FreeRTOS）**

```
高优先级：电机 PID 控制（10ms 周期）
中优先级：传感器采集（超声波 + 红外）
中优先级：蓝牙命令解析
低优先级：模式切换逻辑（遥控/避障/循迹）
```

**PID 速度控制**

```c
typedef struct {
    float kp, ki, kd;
    float integral, prev_error;
} PID;

float pid_compute(PID *pid, float setpoint, float measured) {
    float error = setpoint - measured;
    pid->integral += error;
    float derivative = error - pid->prev_error;
    pid->prev_error = error;
    return pid->kp * error + pid->ki * pid->integral + pid->kd * derivative;
}
```

**涉及知识**：PWM 电机驱动、编码器、PID 控制、超声波测距、RTOS 多任务、蓝牙通信。

## 四、OTA 升级系统

**难度**：精通

**功能**：设备通过网络下载新固件，验证完整性后安全升级，失败自动回滚。

**分区设计（STM32 1MB Flash）**

```
0x0800_0000 ┌──────────────────┐
            │   Bootloader     │  32KB
0x0800_8000 ├──────────────────┤
            │   App Slot A     │  448KB（当前运行）
0x0807_8000 ├──────────────────┤
            │   App Slot B     │  448KB（下载新固件）
0x080E_8000 ├──────────────────┤
            │   Config/NVS     │  64KB（升级标志、版本号）
0x080F_8000 └──────────────────┘
```

**升级流程**

```
1. App A 运行中，从服务器下载新固件到 Slot B
2. 下载完成，校验 CRC/SHA256
3. 写入升级标志到 Config 区
4. 软件复位 → Bootloader 启动
5. Bootloader 检测到升级标志 → 跳转到 Slot B
6. Slot B 启动成功 → 清除升级标志（确认升级）
7. 如果 Slot B 启动失败（看门狗超时）→ Bootloader 回滚到 Slot A
```

**Bootloader 核心逻辑**

```c
void bootloader_main(void) {
    uint32_t flag = read_upgrade_flag();
    
    if (flag == UPGRADE_PENDING) {
        if (verify_firmware(SLOT_B)) {
            set_boot_slot(SLOT_B);
            jump_to_app(SLOT_B_ADDR);
        } else {
            clear_upgrade_flag();
            jump_to_app(SLOT_A_ADDR);
        }
    } else {
        jump_to_app(get_current_slot());
    }
}

void jump_to_app(uint32_t addr) {
    uint32_t sp = *(uint32_t *)addr;
    uint32_t pc = *(uint32_t *)(addr + 4);
    __set_MSP(sp);
    ((void (*)(void))pc)();
}
```

**涉及知识**：Flash 读写、Bootloader 设计、链接脚本分区、CRC/SHA 校验、HTTP/MQTT 下载、看门狗回滚。

## 五、低功耗传感器节点

**难度**：精通

**功能**：电池供电的 LoRa 传感器节点，每 15 分钟唤醒采集一次数据，发送后立即休眠。目标寿命 > 2 年（AA 电池）。

**功耗预算**

```
AA 电池容量：2500mAh
目标寿命：2 年 = 17520 小时

每次唤醒：
  - 启动 + 采集：50ms × 10mA = 0.5µAh
  - LoRa 发送：100ms × 120mA = 12µAh
  - 合计：~13µAh / 次

每小时 4 次 = 52µAh/h
休眠电流：2µA → 2µAh/h
总计：54µAh/h × 17520h = 945mAh < 2500mAh ✓
```

**关键技术**

- MCU 选型：STM32L4（Stop2 模式 < 1µA）或 nRF52840
- 唤醒源：RTC 定时唤醒
- 外设电源控制：传感器用 MOS 管控制供电，不用时彻底断电
- LoRa 参数优化：SF7（速度快、功耗低）vs SF12（距离远、功耗高）
- 固件优化：减少 Flash 写入、避免不必要的外设初始化

**涉及知识**：低功耗模式、RTC、电源管理、LoRaWAN、功耗测量（用万用表 µA 档或 Power Profiler Kit）。

## 六、项目开发建议

1. **先跑通最小原型**：不要一开始就追求完美架构，先让硬件动起来
2. **模块化开发**：每个外设驱动独立测试通过后再集成
3. **版本管理**：硬件版本（PCB Rev）和软件版本（git tag）都要管理
4. **写测试**：至少对通信协议解析、算法逻辑写单元测试（可以在 PC 上跑）
5. **记录问题**：硬件调试过程中遇到的坑记下来，下次不踩

返回 [总览与学习路线](./index.md)
