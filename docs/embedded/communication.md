---
title: 通信协议实战
author: Walt
date: 2026-05-17
---

# 通信协议实战

网关发出“打开阀门”，协议栈成功发送不等于阀门已经打开。总线确认、消息交付与业务执行分别发生在不同层。这里解释设备端的配置、边界和恢复；物理层与协议对比见[嵌入式与工业协议](/docs/basic/protocol/embedded-protocols)。

![设备命令从传输到执行确认](/embedded/protocol-command-contract.svg)

## CAN：位时间与业务确认

经典 bxCAN 的 nominal bitrate 为 `fCAN/(Prescaler×(1+BS1+BS2))`，同步段固定为 1 tq，SJW 是重同步允许调整的宽度，不是额外时间段。42 MHz、分频 6、BS1=11、BS2=2 时，位率为 500 kbit/s，采样点为 `(1+11)/14≈85.7%`。还需核对线长、时钟误差、收发器延迟、采样点和器件约束。

总线两端按拓扑终端匹配，典型高速 CAN 为两端各 120 Ω，断电测 CAN_H/L 间常约 60 Ω，但实际电路与其他负载会影响读数。控制器还需要收发器，不能把 MCU 的 TX/RX 直接接 CAN_H/L。先 loopback 验证软件，再 normal 模式用第二节点检查 ACK、错误计数、过滤器、FIFO 溢出和 bus-off 恢复。

SocketCAN 接口已经由系统按正确位率启动后，可用以下命令观察与发送经典帧；它们不能替代供电和总线配置。

```bash
candump can0
cansend can0 321#01020304
```

CAN ACK 只说明至少有节点在链路层正确接收，不代表目标业务执行。控制命令需要序号、权限与执行结果，超时先查询状态或按幂等合同重试。

## Modbus：地址、边界与原子写入

文档编号 40001、PDU 地址 0 和 FreeModbus 回调地址 1 可能表示同一寄存器。必须分别写明“文档地址、线上地址、库回调约定”。下列函数按一基回调地址映射 100 个寄存器，使用减法检查余量，避免 `addr+count` 的整数溢出。

```c
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

bool holding_range(uint16_t callback_addr, uint16_t count, size_t *start) {
    if (start == NULL || callback_addr == 0 || count == 0) return false;
    const size_t offset = (size_t)callback_addr - 1;
    if (offset >= 100 || (size_t)count > 100 - offset) return false;
    *start = offset;
    return true;
}
```

收到多寄存器写入，先完整校验范围和业务值，再在合适的同步区提交，不能写到一半才发现后一项无效。线上每个寄存器的两个字节通常高字节在前；32 位数的寄存器顺序和缩放是设备合同，不能仅凭 Modbus 名称推断。RTU 还需要收发方向、帧间隔与 CRC，串口库的 API 版本则属于上位机适配范围。

## BLE：属性与分片边界

GATT 用服务、特征和描述符表达数据。写入处理检查句柄、权限、长度、offset、连接状态与 prepare write 语义，拒绝超出缓冲区的输入；不能直接 `memcpy` 任意长度。Notification 没有 ATT 层确认，Indication 的确认也不代表业务已经执行。

默认 ATT MTU=23 时，常见 Write Request/Notification 单包值最多 MTU−3，即 20 字节；最大属性值、协商 MTU 与各操作负载上限不是同一个概念。传大对象需序号、总长度、片段边界、超时与完整性校验，并限制并发和内存。用调试客户端验证拒绝超长写、断开后重新连接、重复片段和未授权访问。

## Wi-Fi 与 MQTT：连接是状态机

ESP-IDF 设备要先初始化存储、网络接口与事件循环，配置 Wi-Fi 并等待获得 IP，再启动依赖网络的业务。MQTT 连接使用受信任的 TLS、正确时间/证书校验、设备身份和按主题授权；凭据从受控配置/配网进入，不写进公开示例或日志。

MQTT QoS 0/1/2 分别提供对应协议交付语义。QoS 1 可能重复；QoS 2 也不能把设备重启后的电机动作变成业务恰好一次。为命令保存 `command_id` 和结果，定义重复命令的响应与持久化时机。回调中的 topic/data 按显式长度读取，不假定以 NUL 结尾；ESP-MQTT 的大消息可能分事件交付，须使用总长度和当前偏移有界重组。

重连采用退避和抖动，缓存有条数/字节/过期上限，恢复后控制发布速率。LWT 由 broker 在检测到异常断连等条件后发布，存在检测时间，不是即时掉线告警。保留消息用于状态快照时要避免陈旧命令在订阅恢复后重新执行。

## LoRaWAN 与选型

LoRa 是无线调制技术，LoRaWAN 定义组网与安全等机制。先按部署地区选择频段、区域参数、发射功率、占空比/驻留时间要求和合法设备。DR0 对应的参数因区域而异，不能统一解释为 SF12。降低速率可能增加空中时间、碰撞与电量，不等于无代价增加距离。

优先使用成熟协议栈实现入网、密钥和计数管理；OTAA 也要满足版本对应的持久化规则，ABP 尤其不能每次启动都重置帧计数。节点电池预算要计入入网、接收窗口和重传。

| 场景 | 候选 | 最先验证 |
| --- | --- | --- |
| 工厂有线设备 | CAN、RS-485/Modbus | 拓扑、终端、共模、错误恢复 |
| 手机近距离交互 | BLE | 权限、连接、MTU、手机兼容 |
| 局域网上云 | Wi-Fi + MQTT | 供电峰值、TLS、离线与重复命令 |
| 低频远距离采样 | LoRaWAN | 地区要求、覆盖、容量与完整周期能耗 |

返回[总览](./index.md)。
