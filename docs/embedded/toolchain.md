---
title: 开发工具链
author: Walt
date: 2026-05-17
---

# 开发工具链

嵌入式开发的工具链和 Web/后端开发完全不同。你的代码在 PC 上编译，但要在另一个架构（ARM/RISC-V）的芯片上运行，这叫交叉编译。编译完还要把二进制烧录到 MCU 的 Flash 里，调试时通过专用硬件接口（JTAG/SWD）连接。

## 一、交叉编译工具链

### GCC ARM Embedded

ARM 官方维护的 GCC 工具链，免费开源，支持所有 Cortex-M/R/A。

**安装**

```bash
# macOS
brew install --cask gcc-arm-embedded

# Ubuntu/Debian
sudo apt install gcc-arm-none-eabi

# 或从 ARM 官网下载
# https://developer.arm.com/downloads/-/gnu-rm
```

**核心工具**

| 工具                    | 用途                    |
| --------------------- | --------------------- |
| arm-none-eabi-gcc     | C 编译器                 |
| arm-none-eabi-g++     | C++ 编译器               |
| arm-none-eabi-as      | 汇编器                   |
| arm-none-eabi-ld      | 链接器                   |
| arm-none-eabi-objcopy | 格式转换（ELF → BIN/HEX）  |
| arm-none-eabi-objdump | 反汇编、查看段信息             |
| arm-none-eabi-size    | 查看代码/数据占用大小           |
| arm-none-eabi-gdb     | 调试器                   |

**编译一个裸机程序**

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 \
    -O2 -Wall -g \
    -DSTM32F407xx \
    -Iinc \
    -T STM32F407VGTx_FLASH.ld \
    -o firmware.elf \
    src/*.c startup_stm32f407xx.s

arm-none-eabi-objcopy -O binary firmware.elf firmware.bin
arm-none-eabi-size firmware.elf
```

### RISC-V 工具链

```bash
# Ubuntu
sudo apt install gcc-riscv64-unknown-elf

# 或用 xPack 预编译包
# https://github.com/xpack-dev-tools/riscv-none-elf-gcc-xpack
```

## 二、构建系统

### Makefile

最基础的构建方式，STM32CubeMX 生成的项目默认带 Makefile。

```makefile
TARGET = firmware
BUILD_DIR = build

C_SOURCES = $(wildcard src/*.c)
ASM_SOURCES = startup_stm32f407xx.s

PREFIX = arm-none-eabi-
CC = $(PREFIX)gcc
AS = $(PREFIX)gcc -x assembler-with-cpp
CP = $(PREFIX)objcopy
SZ = $(PREFIX)size

CPU = -mcpu=cortex-m4
FPU = -mfpu=fpv4-sp-d16
FLOAT-ABI = -mfloat-abi=hard
MCU = $(CPU) -mthumb $(FPU) $(FLOAT-ABI)

C_DEFS = -DSTM32F407xx
C_INCLUDES = -Iinc -IDrivers/CMSIS/Include

CFLAGS = $(MCU) $(C_DEFS) $(C_INCLUDES) -O2 -Wall -g -fdata-sections -ffunction-sections
LDFLAGS = $(MCU) -T STM32F407VGTx_FLASH.ld -Wl,--gc-sections -lnosys

all: $(BUILD_DIR)/$(TARGET).bin

$(BUILD_DIR)/$(TARGET).elf: $(C_SOURCES) $(ASM_SOURCES)
	@mkdir -p $(BUILD_DIR)
	$(CC) $(CFLAGS) $^ $(LDFLAGS) -o $@
	$(SZ) $@

$(BUILD_DIR)/$(TARGET).bin: $(BUILD_DIR)/$(TARGET).elf
	$(CP) -O binary $< $@

clean:
	rm -rf $(BUILD_DIR)

flash: $(BUILD_DIR)/$(TARGET).bin
	openocd -f interface/stlink.cfg -f target/stm32f4x.cfg \
	    -c "program $< 0x08000000 verify reset exit"
```

### CMake

更现代的选择，跨平台、IDE 支持好。

```cmake
cmake_minimum_required(VERSION 3.20)
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_ASM_COMPILER arm-none-eabi-gcc)

project(firmware C ASM)

set(MCU_FLAGS "-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard")
set(CMAKE_C_FLAGS "${MCU_FLAGS} -O2 -Wall -g -fdata-sections -ffunction-sections")
set(CMAKE_EXE_LINKER_FLAGS "${MCU_FLAGS} -T${CMAKE_SOURCE_DIR}/STM32F407.ld -Wl,--gc-sections")

add_executable(firmware.elf
    src/main.c
    src/system_stm32f4xx.c
    startup_stm32f407xx.s
)
target_include_directories(firmware.elf PRIVATE inc)
target_compile_definitions(firmware.elf PRIVATE STM32F407xx)

add_custom_command(TARGET firmware.elf POST_BUILD
    COMMAND arm-none-eabi-objcopy -O binary firmware.elf firmware.bin
    COMMAND arm-none-eabi-size firmware.elf
)
```

## 三、烧录工具

### OpenOCD

开源的片上调试器，支持几乎所有 MCU 和调试器硬件。

```bash
# 安装
brew install openocd   # macOS
sudo apt install openocd  # Ubuntu

# 烧录 STM32（通过 ST-Link）
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg \
    -c "program firmware.bin 0x08000000 verify reset exit"

# 启动 GDB Server
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
# 然后在另一个终端连接 GDB
arm-none-eabi-gdb firmware.elf -ex "target remote :3333"
```

### J-Link

SEGGER 出品的商业调试器，速度快、稳定性好。教育版免费。

```bash
# J-Link Commander 烧录
JLinkExe -device STM32F407VG -if SWD -speed 4000 \
    -CommandFile flash.jlink

# flash.jlink 内容：
# loadbin firmware.bin, 0x08000000
# r
# g
# exit
```

### ST-Link

ST 官方调试器，STM32 开发板自带。配合 `st-flash` 或 OpenOCD 使用。

```bash
# 使用 stlink 工具
st-flash write firmware.bin 0x08000000
st-flash reset
```

## 四、调试

### GDB 调试

```bash
# 启动 OpenOCD（保持运行）
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg &

# 连接 GDB
arm-none-eabi-gdb firmware.elf
(gdb) target remote :3333
(gdb) monitor reset halt
(gdb) break main
(gdb) continue
(gdb) print variable_name
(gdb) x/16xw 0x40020000    # 查看外设寄存器
(gdb) info registers
(gdb) backtrace             # 查看调用栈（HardFault 排查）
```

### VS Code 调试配置

安装 Cortex-Debug 扩展后，配置 `.vscode/launch.json`：

```json
{
    "version": "0.2.0",
    "configurations": [{
        "name": "Debug (OpenOCD)",
        "type": "cortex-debug",
        "request": "launch",
        "servertype": "openocd",
        "cwd": "${workspaceFolder}",
        "executable": "build/firmware.elf",
        "configFiles": [
            "interface/stlink.cfg",
            "target/stm32f4x.cfg"
        ],
        "svdFile": "STM32F407.svd",
        "runToEntryPoint": "main"
    }]
}
```

SVD 文件让你在调试时能以结构化方式查看外设寄存器，而不是手动算地址。

### 常用调试手段

| 手段          | 适用场景                    | 工具                    |
| ----------- | ----------------------- | --------------------- |
| printf 重定向  | 快速打印变量值                 | 串口 + 终端               |
| SWO/ITM 输出  | 不占用串口的 printf           | SWV Viewer            |
| 断点 + 单步     | 逻辑错误、流程排查               | GDB / IDE             |
| 寄存器查看       | 外设配置是否正确                | SVD + Cortex-Debug    |
| 逻辑分析仪       | 时序问题、协议解码               | Saleae / PulseView   |
| 示波器         | 信号质量、电源纹波               | Rigol DS1054Z        |
| HardFault 分析 | 程序崩溃                   | 查看 LR/PC/CFSR 寄存器    |

## 五、IDE 选择

| IDE            | 优点                          | 缺点                    | 适合场景          |
| -------------- | --------------------------- | --------------------- | ------------- |
| Keil MDK       | 编译优化好、调试强、ST 官方支持          | 收费、仅 Windows          | 公司项目、量产优化     |
| IAR EWARM      | 编译质量最高、代码密度最小              | 贵、仅 Windows           | 对代码大小敏感的产品    |
| STM32CubeIDE   | 免费、集成 CubeMX 配置            | 基于 Eclipse，略重         | STM32 入门      |
| VS Code        | 轻量、跨平台、扩展丰富               | 需要自己配置工具链             | 熟悉命令行的开发者     |
| CLion           | 智能补全强、CMake 原生支持           | 收费、资源占用大              | 大型嵌入式项目       |
| PlatformIO     | 跨平台跨芯片、库管理方便              | 对底层控制不够精细             | 快速原型、Arduino 生态 |

推荐路线：入门用 STM32CubeIDE（零配置），熟悉后切 VS Code + Makefile/CMake（灵活高效）。

## 六、版本管理与 CI

嵌入式项目同样需要 Git 管理。注意事项：

- `.gitignore` 排除 `build/`、`*.o`、`*.elf`、IDE 生成文件
- 固件版本号写入代码，构建时自动从 git tag 注入
- CI 用 Docker 镜像封装工具链，保证构建可复现

```yaml
# GitHub Actions 示例
name: Build Firmware
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    container: ghcr.io/xpack-dev-tools/arm-none-eabi-gcc:latest
    steps:
      - uses: actions/checkout@v4
      - run: make all
      - uses: actions/upload-artifact@v4
        with:
          name: firmware
          path: build/firmware.bin
```

返回 [总览与学习路线](./index.md)
