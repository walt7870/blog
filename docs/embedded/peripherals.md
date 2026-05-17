---
title: 外设驱动开发
author: Walt
date: 2026-05-17
---

# 外设驱动开发

MCU 的价值在于它集成的外设：GPIO 控制 LED 和按键、UART 做串口通信、SPI/I2C 连接传感器、ADC 采集模拟信号、PWM 驱动电机、DMA 搬运数据。掌握外设驱动是嵌入式开发的核心技能。

本篇以 STM32F4 为例，每个外设给出寄存器级和 HAL 库两种写法。

## 一、GPIO

GPIO（General Purpose Input/Output）是最基础的外设，控制引脚的高低电平。

### 输出模式（点亮 LED）

**寄存器级**

```c
// 开启 GPIOA 时钟
RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

// PA5 配置为推挽输出
GPIOA->MODER &= ~(3 << 10);   // 清除 bit[11:10]
GPIOA->MODER |= (1 << 10);    // 01 = 输出模式
GPIOA->OTYPER &= ~(1 << 5);   // 0 = 推挽
GPIOA->OSPEEDR |= (2 << 10);  // 10 = 高速

// 输出高电平
GPIOA->BSRR = (1 << 5);       // 置位（原子操作）
// 输出低电平
GPIOA->BSRR = (1 << 21);      // 复位（写高 16 位）
```

**HAL 库**

```c
GPIO_InitTypeDef gpio = {0};
__HAL_RCC_GPIOA_CLK_ENABLE();
gpio.Pin = GPIO_PIN_5;
gpio.Mode = GPIO_MODE_OUTPUT_PP;
gpio.Speed = GPIO_SPEED_FREQ_HIGH;
HAL_GPIO_Init(GPIOA, &gpio);

HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);
HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
```

### 输入模式（读按键）

```c
// PA0 配置为输入，内部上拉
GPIOA->MODER &= ~(3 << 0);    // 00 = 输入
GPIOA->PUPDR &= ~(3 << 0);
GPIOA->PUPDR |= (1 << 0);     // 01 = 上拉

// 读取电平
if (!(GPIOA->IDR & (1 << 0))) {
    // 按键按下（低电平有效）
}
```

### 外部中断（EXTI）

按键用轮询会浪费 CPU，用外部中断更合理：

```c
// HAL 方式配置 PA0 下降沿中断
gpio.Pin = GPIO_PIN_0;
gpio.Mode = GPIO_MODE_IT_FALLING;
gpio.Pull = GPIO_PULLUP;
HAL_GPIO_Init(GPIOA, &gpio);

HAL_NVIC_SetPriority(EXTI0_IRQn, 2, 0);
HAL_NVIC_EnableIRQ(EXTI0_IRQn);

// 中断回调
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin) {
    if (GPIO_Pin == GPIO_PIN_0) {
        // 按键处理（注意消抖）
    }
}
```

## 二、UART

UART 是嵌入式最常用的通信接口，调试打印、AT 指令、传感器数据都靠它。

### 寄存器级发送

```c
// 开时钟、配置引脚（AF7）、配置波特率
RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
// ... 引脚配置省略

// 波特率 = fck / (16 * USARTDIV)
// 84MHz / (16 * 115200) ≈ 45.5625 → BRR = (45 << 4) | 9
USART1->BRR = 0x02D9;
USART1->CR1 = USART_CR1_TE | USART_CR1_RE | USART_CR1_UE;

// 发送一个字节
void uart_send(uint8_t ch) {
    while (!(USART1->SR & USART_SR_TXE));
    USART1->DR = ch;
}
```

### HAL + 中断接收

```c
UART_HandleTypeDef huart1;
uint8_t rx_byte;

// 初始化
huart1.Instance = USART1;
huart1.Init.BaudRate = 115200;
huart1.Init.WordLength = UART_WORDLENGTH_8B;
huart1.Init.StopBits = UART_STOPBITS_1;
huart1.Init.Parity = UART_PARITY_NONE;
huart1.Init.Mode = UART_MODE_TX_RX;
HAL_UART_Init(&huart1);

// 开启接收中断
HAL_UART_Receive_IT(&huart1, &rx_byte, 1);

// 接收完成回调
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
    ring_buffer_push(&rx_buf, rx_byte);
    HAL_UART_Receive_IT(huart, &rx_byte, 1);  // 重新开启
}
```

### printf 重定向

```c
int _write(int fd, char *ptr, int len) {
    HAL_UART_Transmit(&huart1, (uint8_t *)ptr, len, HAL_MAX_DELAY);
    return len;
}
```

## 三、SPI

SPI 速度快、全双工，常用于 Flash、显示屏、高速 ADC。

```c
// HAL 方式初始化
hspi1.Instance = SPI1;
hspi1.Init.Mode = SPI_MODE_MASTER;
hspi1.Init.Direction = SPI_DIRECTION_2LINES;
hspi1.Init.DataSize = SPI_DATASIZE_8BIT;
hspi1.Init.CLKPolarity = SPI_POLARITY_LOW;   // CPOL=0
hspi1.Init.CLKPhase = SPI_PHASE_1EDGE;       // CPHA=0
hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_8;
HAL_SPI_Init(&hspi1);

// 读写 SPI Flash（W25Q128）
void flash_read_id(uint8_t *id) {
    uint8_t cmd = 0x9F;  // JEDEC ID
    HAL_GPIO_WritePin(CS_PORT, CS_PIN, GPIO_PIN_RESET);
    HAL_SPI_Transmit(&hspi1, &cmd, 1, 100);
    HAL_SPI_Receive(&hspi1, id, 3, 100);
    HAL_GPIO_WritePin(CS_PORT, CS_PIN, GPIO_PIN_SET);
}
```

## 四、I2C

I2C 两根线挂多个设备，适合低速传感器。

```c
// 读取 BME280 温湿度传感器
uint8_t reg = 0xF7;  // 数据寄存器起始地址
uint8_t data[8];

HAL_I2C_Master_Transmit(&hi2c1, 0x76 << 1, &reg, 1, 100);
HAL_I2C_Master_Receive(&hi2c1, 0x76 << 1, data, 8, 100);

// 或用 Mem 系列函数（更简洁）
HAL_I2C_Mem_Read(&hi2c1, 0x76 << 1, 0xF7, I2C_MEMADD_SIZE_8BIT, data, 8, 100);
```

I2C 常见问题排查：
- 总线挂死 → 检查上拉电阻、尝试发 9 个时钟脉冲恢复
- NAK → 地址错误（注意 7 位地址要左移 1 位）
- 速度不对 → 检查时钟配置和上拉电阻值

## 五、ADC

ADC 把模拟电压转换为数字值。STM32F4 的 ADC 是 12 位，量程 0~3.3V。

```c
// 单次转换
HAL_ADC_Start(&hadc1);
HAL_ADC_PollForConversion(&hadc1, 100);
uint32_t raw = HAL_ADC_GetValue(&hadc1);

// 转换为电压
float voltage = raw * 3.3f / 4095.0f;

// 转换为温度（NTC 热敏电阻分压电路）
float resistance = 10000.0f * raw / (4095.0f - raw);
float temperature = 1.0f / (log(resistance / 10000.0f) / 3950.0f + 1.0f / 298.15f) - 273.15f;
```

多通道采集用 DMA 最高效，避免 CPU 轮询等待。

## 六、PWM 与定时器

PWM（脉宽调制）通过改变占空比控制平均输出电压，用于 LED 调光、电机调速、舵机控制。

```c
// TIM3 CH1 输出 1kHz PWM，占空比 50%
// 假设 TIM3 时钟 84MHz，预分频 83 → 计数频率 1MHz
// ARR = 999 → PWM 频率 = 1MHz / 1000 = 1kHz
htim3.Instance = TIM3;
htim3.Init.Prescaler = 83;
htim3.Init.Period = 999;
HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);

// 设置占空比
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 500);  // 50%
__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 250);  // 25%
```

舵机控制（50Hz PWM，脉宽 0.5~2.5ms 对应 0~180°）：

```c
// ARR = 19999, PSC = 83 → 50Hz
// 0° = 500, 90° = 1500, 180° = 2500
void servo_set_angle(uint16_t angle) {
    uint16_t pulse = 500 + angle * 2000 / 180;
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, pulse);
}
```

## 七、DMA

DMA（Direct Memory Access）让外设和内存之间直接搬运数据，不需要 CPU 介入。适合大量数据传输（ADC 多通道采集、UART 收发大包、SPI Flash 读写）。

```c
// UART DMA 发送
uint8_t tx_buf[] = "Hello DMA\r\n";
HAL_UART_Transmit_DMA(&huart1, tx_buf, sizeof(tx_buf) - 1);
// CPU 可以去做其他事，传输完成会触发回调

// ADC + DMA 连续采集
uint16_t adc_buf[4];  // 4 通道
HAL_ADC_Start_DMA(&hadc1, (uint32_t *)adc_buf, 4);
// adc_buf 会被 DMA 自动填充，无需 CPU 干预
```

DMA 注意事项：
- 缓冲区不能是局部变量（DMA 传输期间函数可能已返回）
- 双缓冲（Double Buffer）模式适合音频等连续流
- 注意 Cache 一致性（Cortex-M7 有 D-Cache，DMA 前要 Clean/Invalidate）

## 八、看门狗

看门狗定时器防止程序跑飞。如果程序在规定时间内没有"喂狗"，看门狗会触发系统复位。

```c
// 独立看门狗（IWDG），LSI 时钟驱动，不依赖主时钟
hiwdg.Instance = IWDG;
hiwdg.Init.Prescaler = IWDG_PRESCALER_64;
hiwdg.Init.Reload = 625;  // 超时 ≈ 1 秒（32kHz / 64 / 625）
HAL_IWDG_Init(&hiwdg);

// 主循环中定期喂狗
while (1) {
    HAL_IWDG_Refresh(&hiwdg);
    // ... 业务逻辑
}
```

窗口看门狗（WWDG）更严格：必须在特定时间窗口内喂狗，太早或太晚都会复位。

## 九、外设选型与组合

| 需求             | 推荐外设组合                          |
| -------------- | ------------------------------- |
| 调试打印           | UART + printf 重定向               |
| 读温湿度传感器        | I2C（BME280）或 1-Wire（DS18B20）    |
| 读加速度/陀螺仪       | SPI（MPU6500）或 I2C（MPU6050）      |
| 驱动 TFT 显示屏     | SPI（ST7789）+ DMA               |
| 电机调速           | PWM + 定时器                       |
| 多通道电压采集        | ADC + DMA                       |
| 大数据量传输         | UART/SPI + DMA                  |
| 存储数据到 Flash    | SPI（W25Q128）                    |
| 读 SD 卡         | SDIO 或 SPI 模式                   |

返回 [总览与学习路线](./index.md)
