---
title: 通信协议实战
author: Walt
date: 2026-05-17
---

# 通信协议实战

嵌入式设备不是孤岛，需要和其他设备、网关、云平台通信。本篇聚焦嵌入式场景下各种通信协议的实际使用：从有线的 CAN/Modbus 到无线的 BLE/Wi-Fi/LoRa，再到应用层的 MQTT 上云。

协议的物理层原理已在 [通信协议概览](/docs/basic/protocol/) 和 [嵌入式与工业协议详解](/docs/basic/protocol/embedded-protocols) 中介绍，本篇侧重代码实现和工程实践。

## 一、CAN 总线实战

### STM32 CAN 收发

```c
CAN_HandleTypeDef hcan1;
CAN_TxHeaderTypeDef tx_header;
CAN_RxHeaderTypeDef rx_header;
uint8_t tx_data[8], rx_data[8];
uint32_t tx_mailbox;

// 初始化（500kbps，APB1=42MHz）
hcan1.Instance = CAN1;
hcan1.Init.Prescaler = 6;
hcan1.Init.Mode = CAN_MODE_NORMAL;
hcan1.Init.SyncJumpWidth = CAN_SJW_1TQ;
hcan1.Init.TimeSeg1 = CAN_BS1_11TQ;
hcan1.Init.TimeSeg2 = CAN_BS2_2TQ;
HAL_CAN_Init(&hcan1);

// 配置过滤器（接收所有报文）
CAN_FilterTypeDef filter = {0};
filter.FilterMode = CAN_FILTERMODE_IDMASK;
filter.FilterScale = CAN_FILTERSCALE_32BIT;
filter.FilterActivation = ENABLE;
HAL_CAN_ConfigFilter(&hcan1, &filter);

HAL_CAN_Start(&hcan1);
HAL_CAN_ActivateNotification(&hcan1, CAN_IT_RX_FIFO0_MSG_PENDING);

// 发送
tx_header.StdId = 0x321;
tx_header.IDE = CAN_ID_STD;
tx_header.RTR = CAN_RTR_DATA;
tx_header.DLC = 4;
tx_data[0] = 0xDE; tx_data[1] = 0xAD;
tx_data[2] = 0xBE; tx_data[3] = 0xEF;
HAL_CAN_AddTxMessage(&hcan1, &tx_header, tx_data, &tx_mailbox);

// 接收回调
void HAL_CAN_RxFifo0MsgPendingCallback(CAN_HandleTypeDef *hcan) {
    HAL_CAN_GetRxMessage(hcan, CAN_RX_FIFO0, &rx_header, rx_data);
    // 根据 rx_header.StdId 分发处理
}
```

### CAN 工程要点

- 波特率计算：Baud = APB1_CLK / (Prescaler × (SJW + BS1 + BS2))
- 两端必须接 120Ω 终端电阻
- 用 `candump` / `cansend`（Linux SocketCAN）做上位机调试
- 报文 ID 设计要考虑优先级（ID 越小优先级越高）

## 二、Modbus RTU 实战

### 从站实现（STM32 + FreeModbus）

FreeModbus 是开源的 Modbus 协议栈，移植到 STM32 只需实现串口收发和定时器。

```c
#include "mb.h"
#include "mbport.h"

// 保持寄存器（功能码 03/06/16）
static uint16_t holding_regs[100];

// 初始化 Modbus 从站，站号 1，波特率 9600
eMBInit(MB_RTU, 1, 0, 9600, MB_PAR_NONE);
eMBEnable();

// 主循环中轮询
while (1) {
    eMBPoll();
}

// 回调：读保持寄存器
eMBErrorCode eMBRegHoldingCB(UCHAR *buf, USHORT addr, USHORT nregs, eMBRegisterMode mode) {
    if (addr + nregs > 100) return MB_ENOREG;
    if (mode == MB_REG_READ) {
        for (int i = 0; i < nregs; i++) {
            *buf++ = (uint8_t)(holding_regs[addr + i] >> 8);
            *buf++ = (uint8_t)(holding_regs[addr + i]);
        }
    } else {
        for (int i = 0; i < nregs; i++) {
            holding_regs[addr + i] = (*buf << 8) | *(buf + 1);
            buf += 2;
        }
    }
    return MB_ENOERR;
}
```

### 主站测试（Python）

```python
from pymodbus.client import ModbusSerialClient

client = ModbusSerialClient(port='/dev/ttyUSB0', baudrate=9600)
client.connect()

# 读保持寄存器（站号 1，起始地址 0，数量 10）
result = client.read_holding_registers(0, 10, slave=1)
print(result.registers)

# 写单个寄存器
client.write_register(0, 1234, slave=1)
```

## 三、BLE 实战

### ESP32 BLE GATT Server（ESP-IDF）

```c
// 定义服务和特征
static const uint8_t service_uuid[16] = { /* 自定义 UUID */ };
static uint8_t char_value[20] = "Hello BLE";

static const esp_gatts_attr_db_t gatt_db[] = {
    // Service Declaration
    [0] = {{ESP_GATT_AUTO_RSP}, {ESP_UUID_LEN_16, ...}},
    // Characteristic Declaration
    [1] = {{ESP_GATT_AUTO_RSP}, {ESP_UUID_LEN_16, ...}},
    // Characteristic Value
    [2] = {{ESP_GATT_AUTO_RSP}, {ESP_UUID_LEN_128, ...}},
};

// 事件回调
void gatts_event_handler(esp_gatts_cb_event_t event, ...) {
    switch (event) {
    case ESP_GATTS_WRITE_EVT:
        // 手机 App 写入数据
        memcpy(char_value, param->write.value, param->write.len);
        process_ble_command(char_value, param->write.len);
        break;
    case ESP_GATTS_CONNECT_EVT:
        // 设备连接
        break;
    }
}
```

### BLE 开发要点

- GATT 模型：Service → Characteristic → Descriptor
- 手机端用 nRF Connect App 调试
- MTU 协商影响单次传输大小（默认 23 字节，可协商到 512）
- 低功耗关键：广播间隔、连接间隔、Slave Latency

## 四、Wi-Fi + MQTT 上云

### ESP32 连接 Wi-Fi 并发布 MQTT

```c
#include "esp_wifi.h"
#include "mqtt_client.h"

// Wi-Fi 连接
wifi_config_t wifi_config = {
    .sta = {
        .ssid = "MyNetwork",
        .password = "MyPassword",
    },
};
esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
esp_wifi_start();
esp_wifi_connect();

// MQTT 客户端
esp_mqtt_client_config_t mqtt_cfg = {
    .broker.address.uri = "mqtt://broker.emqx.io:1883",
    .credentials.client_id = "esp32_sensor_01",
};
esp_mqtt_client_handle_t client = esp_mqtt_client_init(&mqtt_cfg);
esp_mqtt_client_start(client);

// 发布传感器数据
char payload[64];
snprintf(payload, sizeof(payload),
         "{\"temp\":%.1f,\"humi\":%.1f}", temperature, humidity);
esp_mqtt_client_publish(client, "sensor/living_room", payload, 0, 1, 0);

// 订阅控制指令
esp_mqtt_client_subscribe(client, "control/living_room", 1);

// 接收回调
void mqtt_event_handler(esp_mqtt_event_handle_t event) {
    if (event->event_id == MQTT_EVENT_DATA) {
        // 解析 event->topic 和 event->data
        parse_control_command(event->data, event->data_len);
    }
}
```

### MQTT 工程要点

- QoS 0：最多一次（可丢），适合高频传感器数据
- QoS 1：至少一次（可能重复），适合控制指令
- QoS 2：恰好一次（开销大），嵌入式很少用
- 遗嘱消息（LWT）：设备异常断线时通知其他订阅者
- 保持心跳（Keep Alive）：防止 NAT 超时断连，通常 60~120 秒

## 五、LoRaWAN

### 节点端（STM32 + SX1276）

```c
#include "radio.h"
#include "LoRaMac.h"

// ABP 入网参数
static uint8_t DevAddr[] = {0x01, 0x02, 0x03, 0x04};
static uint8_t NwkSKey[] = { /* 16 bytes */ };
static uint8_t AppSKey[] = { /* 16 bytes */ };

MibRequestConfirm_t mib;
mib.Type = MIB_NET_ID;
mib.Param.NetID = 0x000000;
LoRaMacMibSetRequestConfirm(&mib);

// 发送数据（端口 1，不确认）
McpsReq_t req;
req.Type = MCPS_UNCONFIRMED;
req.Req.Unconfirmed.fPort = 1;
req.Req.Unconfirmed.fBuffer = payload;
req.Req.Unconfirmed.fBufferSize = payload_len;
req.Req.Unconfirmed.Datarate = DR_0;  // SF12，最远距离
LoRaMacMcpsRequest(&req);
```

### LoRaWAN 工程要点

- 上行带宽极低（几十 bps ~ 几 kbps），每次发送尽量压缩数据
- 遵守占空比限制（欧洲 1%，中国相对宽松）
- 网关侧用 ChirpStack 或 TTN（The Things Network）
- 适合场景：农业传感器、水表电表、资产追踪

## 六、协议选型

| 需求                  | 推荐协议                    | 理由                          |
| ------------------- | ----------------------- | --------------------------- |
| 工厂设备互联（有线、短距离）      | CAN / RS-485 + Modbus   | 抗干扰、成熟、成本低                  |
| 智能家居设备 ↔ 手机         | BLE                     | 低功耗、手机原生支持                  |
| 设备 ↔ 云平台            | Wi-Fi + MQTT            | 带宽大、生态成熟                    |
| 远距离低功耗（户外传感器）       | LoRaWAN                 | 数公里覆盖、电池寿命长                 |
| 汽车 ECU 间通信          | CAN / CAN-FD            | 实时性、可靠性、行业标准                |
| 工业设备数据上云            | Modbus TCP / OPC UA     | 兼容存量设备、语义化                  |

返回 [总览与学习路线](./index.md)
