---
title: 嵌入式与工业通信协议详解
author: Walt
date: 2026-05-17
---

# 嵌入式与工业通信协议详解

互联网协议（HTTP、TCP/IP）解决的是"远程主机之间怎么可靠交换大量数据"。而到了嵌入式、工业、车载、IoT 场景，问题完全变了：MCU 只有几十 KB RAM、传感器要持续工作十年用一节电池、车载总线要在强电磁干扰下保证毫秒级响应。这些约束催生了完全不同的一套协议体系。

本文按"距离"和"用途"分类介绍：板内总线 → 现场总线 → 工业以太网 → 无线 IoT。

![嵌入式四大总线接线示意](/protocol/embedded-bus.svg)

## 一、UART 与串口

UART（Universal Asynchronous Receiver/Transmitter）是最古老、最简单的串行通信方式。日常说的"串口"通常就是 UART。

### 物理与电平

UART 本身是协议，不规定电平。常见的物理层标准：

| 标准         | 电平                | 距离      | 用途                     |
| ---------- | ----------------- | ------- | ---------------------- |
| TTL UART   | 0V/3.3V 或 0V/5V   | 板内 < 1m | MCU 之间、调试串口            |
| RS-232     | ±3~±15V           | < 15m   | 老式 PC 串口、工控仪表           |
| RS-422     | 差分 ±2~±6V         | < 1.2km | 单向多点，抗干扰               |
| RS-485     | 差分 ±2~±6V         | < 1.2km | 多机半双工，工业最常用            |
| USB-Serial | USB 转 TTL（CH340 等） | USB 距离  | 现代电脑没有 RS-232，用转换芯片调试 |

### 协议帧格式

```
 起始位  数据位（5~9）  校验位（可选）  停止位（1/1.5/2）
   0      D0...Dn         P              1
```

最常见的配置叫 `8N1`：8 数据位、无校验、1 停止位。

### 关键参数

- **波特率**：每秒符号数。常用 9600、115200、921600。两端必须一致
- **错误检测**：奇偶校验非常弱，工程上一般在应用层加 CRC
- **流控**：硬件流控用 RTS/CTS 两根线，软件流控用 XON/XOFF 字符

### 代码示例（Linux）

```c
#include <termios.h>
#include <fcntl.h>
#include <unistd.h>

int fd = open("/dev/ttyUSB0", O_RDWR | O_NOCTTY);
struct termios tty;
tcgetattr(fd, &tty);

cfsetispeed(&tty, B115200);
cfsetospeed(&tty, B115200);
tty.c_cflag = (tty.c_cflag & ~CSIZE) | CS8;  // 8 数据位
tty.c_cflag &= ~PARENB;                       // 无校验
tty.c_cflag &= ~CSTOPB;                       // 1 停止位
tty.c_cflag |= CLOCAL | CREAD;
tty.c_lflag = 0;                              // 原始模式
tty.c_oflag = 0;
tcsetattr(fd, TCSANOW, &tty);

write(fd, "AT\r\n", 4);
char buf[64];
int n = read(fd, buf, sizeof(buf));
```

调试工具：`screen /dev/ttyUSB0 115200`、`minicom`、`picocom`、Windows 上的 SSCOM、SecureCRT。

### 典型应用

- MCU 调试日志（`printf` 重定向到串口）
- AT 指令控制模块（GSM、Wi-Fi、蓝牙模块）
- GPS NMEA 协议
- 工业仪表（套 RS-485）
- 老 PC 与单片机通信

## 二、RS-485

RS-485 是 UART 的"长跑版"。把 TTL 单端电平换成差分信号，立刻得到三个好处：抗干扰、传输距离、多机总线。

### 关键特性

- **差分传输**：两根线 A/B 的电压差表示 0 和 1，共模干扰被抵消
- **半双工**：默认一根总线只能一个人在说话，发收要切换方向
- **多机**：一条总线最多挂 32 个标准节点（带新型收发器可以到 256）
- **总线拓扑**：手拉手菊花链，两端 120Ω 终端电阻防反射

### 软件视角

操作系统看到的还是一个串口（`/dev/ttyXXX`），代码和 UART 完全一样。区别在硬件层：通过 RS-485 收发芯片（MAX485、SP3485 等）连接，发送前要拉高 DE 引脚切换到发送模式。

### 典型应用

- Modbus RTU（工业现场最广泛的协议）
- BACnet MS/TP（楼宇自控）
- DMX512（舞台灯光）
- 电表抄表、传感器组网

## 三、I²C

I²C（Inter-Integrated Circuit，发音"I-squared-C"）由飞利浦发明，专为板内芯片间低速通信设计。

### 物理层

只用两根线：

- **SDA**（数据线）
- **SCL**（时钟线）

两根线都是开漏输出，要外接上拉电阻（典型 4.7kΩ）。这样多个设备并在总线上不会冲突，谁要拉低就拉低，没人拉就被电阻拉高。

### 协议要点

- **主从模型**：主机生成时钟，从机被寻址才说话
- **地址寻址**：每个从机有 7 位（或 10 位）地址
- **起始/停止条件**：SCL 高时 SDA 下降沿表示开始，SCL 高时 SDA 上升沿表示停止
- **应答（ACK）**：每发完一字节，接收方拉低 SDA 一个时钟表示已收到

### 速率

| 模式               | 速率        |
| ---------------- | --------- |
| Standard         | 100 kbps  |
| Fast             | 400 kbps  |
| Fast Plus        | 1 Mbps    |
| High Speed       | 3.4 Mbps  |
| Ultra Fast (单向)  | 5 Mbps    |

### 代码示例（Arduino）

```cpp
#include <Wire.h>

void setup() {
  Wire.begin();              // 主机模式
  Serial.begin(115200);
}

void loop() {
  Wire.beginTransmission(0x68);   // DS3231 RTC 地址
  Wire.write(0x00);                // 寄存器地址
  Wire.endTransmission(false);     // 重启动条件，不释放总线
  Wire.requestFrom(0x68, 7);       // 读 7 字节
  while (Wire.available()) {
    Serial.print(Wire.read(), HEX);
  }
  delay(1000);
}
```

### 典型应用

- 板内传感器（BME280 温湿度、MPU6050 陀螺仪、各种 ADC/DAC）
- 实时时钟（DS3231、PCF8563）
- EEPROM（24Cxx 系列）
- HDMI EDID（显示器告诉电脑自己的分辨率）

### 工程注意

- **地址冲突**：同型号传感器只能挂一个，除非有地址引脚可调
- **总线挂死**：从机如果在 ACK 期间复位，会把 SDA 拉低不放，主机要发 9 个时钟脉冲尝试解锁
- **上拉电阻**：长走线、多设备要适当减小上拉电阻

## 四、SPI

SPI（Serial Peripheral Interface）由摩托罗拉发明，速度比 I²C 快得多，没有寻址，每个从机独立片选。

### 物理层

四根线：

- **SCLK**：时钟（主机发出）
- **MOSI**：Master Out Slave In，主到从
- **MISO**：Master In Slave Out，从到主
- **CS / SS**：片选（每个从机一根，主机拉低选中）

### 协议要点

- **全双工**：MOSI 和 MISO 同时工作，主机发一个字节的同时就收一个字节
- **无寻址、无 ACK**：主机直接拉低 CS 开始通信，时钟一来就移位
- **四种模式**：CPOL（时钟极性）和 CPHA（时钟相位）的 4 种组合，主从必须匹配

### 速度

工程上常见 1~50 MHz，可以跑到上百 MHz。比 I²C 快 1~2 个数量级。

### 代码示例（STM32 HAL）

```c
SPI_HandleTypeDef hspi1;
uint8_t tx[] = {0x9F};   // Read JEDEC ID
uint8_t rx[3] = {0};

HAL_GPIO_WritePin(CS_GPIO_Port, CS_Pin, GPIO_PIN_RESET);
HAL_SPI_Transmit(&hspi1, tx, 1, HAL_MAX_DELAY);
HAL_SPI_Receive(&hspi1, rx, 3, HAL_MAX_DELAY);
HAL_GPIO_WritePin(CS_GPIO_Port, CS_Pin, GPIO_PIN_SET);
```

### 典型应用

- SPI Flash（W25Q 系列）
- SD 卡（SPI 模式）
- 高速 ADC/DAC
- TFT 显示屏（ST7789、ILI9341）
- 以太网芯片（W5500）、CAN 控制器（MCP2515）

### I²C vs SPI

| 维度       | I²C            | SPI         |
| -------- | -------------- | ----------- |
| 线数       | 2              | 4 + N×CS    |
| 速度       | 100k~3.4M      | 数十 Mbps     |
| 双工       | 半双工            | 全双工         |
| 寻址       | 总线地址           | 片选          |
| 多从机扩展     | 加设备就行           | 每个从机加一根 CS  |
| 板上走线     | 简单             | 多           |

简单来说：低速、多从机、想省线选 I²C；高速、点对点选 SPI。

## 五、1-Wire

只用一根线（加一根地线，外加可选的电源线，或直接寄生供电），由 Dallas / Maxim 推出。

### 关键特性

- 一根数据线既供电又传输（寄生供电模式）
- 每个 1-Wire 器件出厂烧录唯一 64 位 ROM ID
- 总线挂数十个器件没问题

### 经典器件

- **DS18B20**：数字温度传感器，业余电子爱好者的最爱
- **DS2401**：电子序列号（防伪）
- **iButton**：早年门禁、考勤的"钥匙扣"

实测代码用 OneWire 库（Arduino 生态）几行就能读温度，工程上一般作为温度传感方案的备选项。

## 六、CAN 总线

CAN（Controller Area Network）是 Bosch 为汽车设计的总线协议，已经是汽车电子的事实标准。

### 物理层

差分两根线：CAN_H 和 CAN_L，两端 120Ω 终端。速率最高 1 Mbps（CAN-FD 可到 5~8 Mbps）。

### 协议特点

- **多主**：任何节点都可以主动发送，不需要主机
- **基于消息**：每个报文有 11 位（标准帧）或 29 位（扩展帧）ID，没有"目的地址"概念，谁感兴趣谁过滤
- **位仲裁**：多节点同时发，ID 越小（0 越多）优先级越高，靠"显性 0 覆盖隐性 1"在物理层完成无损仲裁
- **强 CRC + 自动重传**：硬件级错误检测和恢复
- **错误界定**：节点频繁出错会被自动隔离

### 报文结构（标准帧）

```
SOF | ID(11) | RTR | IDE | r0 | DLC(4) | DATA(0~8B) | CRC | ACK | EOF
```

数据载荷只有 8 字节（CAN-FD 扩展到 64 字节）。听上去很少，但车载场景里"发动机转速"、"车速"这种信号几个字节足够。

### 上层协议

CAN 物理层之上还有应用层协议栈：

- **OBD-II / UDS**：汽车诊断（连 ELM327 那个就是它）
- **J1939**：商用车（卡车、客车、工程车辆）
- **CANopen**：工业自动化、机器人
- **DeviceNet**：工业 I/O

### 代码示例（SocketCAN，Linux）

```bash
# 启动 CAN 接口
sudo ip link set can0 type can bitrate 500000
sudo ip link set up can0

# 发送
cansend can0 123#DEADBEEF

# 监听
candump can0
```

```c
#include <linux/can.h>
struct can_frame f = {.can_id = 0x123, .can_dlc = 4,
                      .data = {0xDE,0xAD,0xBE,0xEF}};
write(sock, &f, sizeof(f));
```

### 典型应用

- 汽车 ECU（发动机、变速箱、ABS、车身控制）
- 工业机器人
- 楼宇电梯
- 农业、工程机械

## 七、Modbus

Modbus 是工业控制最广泛的协议，1979 年 Modicon 推出，简单到任何 MCU 都能在一周内实现。

### 三种变体

| 变体        | 物理层    | 编码      | 用途              |
| --------- | ------ | ------- | --------------- |
| Modbus RTU | RS-485 | 二进制     | 现场总线，最常见         |
| Modbus ASCII | RS-485 | ASCII   | 老设备             |
| Modbus TCP | TCP/IP  | 二进制 + MBAP 头 | 工厂上位机、SCADA      |

### 协议模型

主从、请求-响应。主机发请求，从机回响应。基本数据模型只有四种：

| 区  | 名称              | 操作             |
| -- | --------------- | -------------- |
| 0X | Coils           | 读/写离散量（线圈）     |
| 1X | Discrete Inputs | 只读离散量          |
| 3X | Input Registers | 只读寄存器          |
| 4X | Holding Registers | 读/写寄存器        |

### 报文示例（功能码 03，读保持寄存器）

请求：

```
01 03 00 00 00 02 C4 0B
└┘ └┘ └─┬─┘ └─┬─┘ └─┬─┘
站号 功能 起始地址 数量  CRC
```

响应：

```
01 03 04 00 0A 00 14 5A 35
└┘ └┘ └┘ └─┬─┘ └─┬─┘ └─┬─┘
站号 功能 字节数 寄存器1 寄存器2 CRC
```

### 工程要点

- **超时与重试**：Modbus RTU 字符间隔 > 1.5 字节时间表示帧结束，主机要做整体超时
- **CRC**：必须算对，错一位整帧丢
- **大端字节序**：寄存器内 16 位是大端，但跨寄存器的 32 位浮点数厂家各不相同，要测
- **从站超时丢线**：现场最常见故障是线接触不良，软件要能容忍

Python 用 `pymodbus` 半小时能写出一个上位机；Modbus TCP 因为底层换成了 TCP/IP，无 CRC（TCP 自己保证），结构更简单。

## 八、Profibus / Profinet

西门子家族。

- **Profibus DP**：基于 RS-485 的现场总线，PLC 与 IO 模块通信。是 1990 年代的主力，正在被 Profinet 替代
- **Profinet**：基于工业以太网，支持实时（RT）和等时实时（IRT）。带 PROFIsafe 可做安全控制
- **协议栈**：用一个普通以太网网线就能跑 Profinet，但要支持的 PLC 和交换机要带 IRT 能力

PLC 工程师的世界，软件层一般用 TIA Portal 配置，开发者一般不直接处理报文。

## 九、EtherCAT

由倍福（Beckhoff）发起的工业以太网协议，目标是"以太网的连接 + 现场总线的实时性"。

### 工作原理

主站发一个大数据帧"打通"整个网络，每个从站在帧经过自己时实时插入/读取自己的数据。一帧到所有从站，延迟在 100µs 量级。

### 适用场景

- 运动控制（多轴伺服同步）
- 高速数据采集
- 半导体设备

### 工程现状

EtherCAT 主站开源选项：SOEM、IgH EtherCAT Master。从站需要专用 ASIC（ET1100、ET1200）或集成了 ESC 的 SoC。

## 十、OPC UA

OPC Unified Architecture，工业 4.0 / 工业互联网时代的"语义通信"层。

### 它解决什么

PLC 之间的协议（Profinet、EtherCAT）解决的是"实时控制"，而 MES、ERP、云平台需要的是"语义化的数据"。OPC UA 提供：

- **统一信息模型**：电机不只是几个寄存器，而是有"转速属性、温度属性、报警事件、控制方法"的对象
- **跨平台**：基于 TCP/IP 或 HTTPS，Windows / Linux / 嵌入式都能跑
- **安全**：内置 X.509 证书、签名、加密
- **发现机制**：客户端可以遍历服务器的对象树

### 部署形态

- **Client/Server**：传统模型，类似 OPC Classic
- **Pub/Sub**：基于 UDP/MQTT/AMQP 的发布订阅，工业 IoT 上云首选

实现：开源有 open62541（C/C++）、Eclipse Milo（Java）、node-opcua、asyncua（Python）。

## 十一、车载补充：LIN / FlexRay / 车载以太网

- **LIN**：单线、低速（最高 20 kbps）、低成本，挂在 CAN 主干下做"末梢"。比如车窗、座椅这种对实时性要求不高的子系统
- **FlexRay**：早期高安全性总线（10 Mbps、双通道、时间触发），用于线控转向/制动等 X-by-Wire 系统
- **车载以太网（100BASE-T1 / 1000BASE-T1）**：单对双绞线的以太网，正在取代部分高带宽场景。智能驾驶域控制器、摄像头数据传输都在用
- **SOME/IP**：基于 IP 的车载服务发现与 RPC 协议，AUTOSAR 生态的"中间件"

## 十二、无线 IoT 协议

### BLE（蓝牙低功耗）

- 短距离（10~100m）、低功耗（纽扣电池能撑数月）
- 协议栈复杂，但 GATT 模型很统一
- 常见用法：手机 App ↔ 智能硬件、可穿戴设备
- BLE Mesh 让多个 BLE 设备组成网状网

### Zigbee

- 基于 IEEE 802.15.4
- 自组网 Mesh，节点能转发数据
- 智能家居（米家、Aqara、Hue）的主流协议

### LoRa / LoRaWAN

- LPWAN（低功耗广域网）代表，距离数公里至十几公里
- 速率很低（0.3~50 kbps），但信号能穿墙能下井
- 网关汇聚到 LoRaWAN 服务器，再到云
- 农业传感器、智慧路灯、远程抄表

### NB-IoT / Cat-M1

- 蜂窝制式，运营商网络覆盖
- 模组直接和 4G/5G 基站通信，不用自建网关
- 共享单车、定位手表、烟感

### Thread / Matter

- Thread：低功耗 IPv6 Mesh，基于 802.15.4，Apple HomeKit、Google Home 都在推
- Matter（原 CHIP）：跨厂家、跨生态的应用层标准。底层可以是 Wi-Fi / Thread / Ethernet，应用层统一
- 是智能家居"标准之争"的最终答案候选

### MQTT

虽然定义在应用层，但在 IoT 场景里和上面这些无线协议天然搭配：

- 发布/订阅模型，topic 树形结构
- QoS 三档（0/1/2）
- 适合长连接、低带宽、不稳定网络
- 物联网平台（AWS IoT、阿里云 IoT、HiveMQ）几乎都用 MQTT 做接入

## 十三、选型建议

| 场景需求                    | 推荐协议                              |
| ----------------------- | --------------------------------- |
| 板内 MCU 调试日志              | UART (TTL)                        |
| 板内传感器（少量、低速）            | I²C                               |
| 板内 SD 卡 / Flash / 显示屏   | SPI                               |
| 一根线挂温度传感器               | 1-Wire                            |
| 工厂车间多机长距离通信             | RS-485 + Modbus RTU              |
| 工厂上位机 ↔ PLC             | Modbus TCP / OPC UA               |
| 汽车电子                    | CAN / CAN-FD / 车载以太网              |
| 汽车末梢传感器                 | LIN                               |
| 高速运动控制                  | EtherCAT                          |
| 工业 4.0、设备数据上云           | OPC UA                            |
| 智能家居（手机/网关→设备）          | BLE / Zigbee / Thread / Matter    |
| 远距离低速传感（农业、抄表）          | LoRaWAN / NB-IoT                  |
| 设备数据接入云端 IoT 平台         | MQTT                              |

## 十四、和互联网协议的关系

嵌入式协议和互联网协议越来越融合：

- **网关化**：Modbus RTU 设备 → 网关 → MQTT → 云
- **协议转换**：Profinet ↔ OPC UA ↔ Kafka
- **TSN（时间敏感网络）**：让普通以太网具备硬实时能力，逐步取代部分专用工业总线

理解了这些协议的"形状"——什么距离、什么实时性、什么成本——就能在前后端、嵌入式、工业、车载之间灵活穿梭，而不会被陌生术语吓住。

相关阅读：[通信协议概览](./index.md)
