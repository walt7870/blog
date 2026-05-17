---
title: 嵌入式 Linux
author: Walt
date: 2026-05-17
---

# 嵌入式 Linux

当产品需要文件系统、网络协议栈、多媒体、复杂 UI 或丰富的开源软件生态时，MCU + RTOS 就不够用了，需要上嵌入式 Linux。嵌入式 Linux 跑在有 MMU 的处理器上（Cortex-A 系列、MIPS、RISC-V），拥有完整的 Linux 内核能力，但针对资源受限场景做了裁剪。

## 一、与桌面 Linux 的区别

| 维度       | 桌面/服务器 Linux       | 嵌入式 Linux              |
| -------- | ------------------ | ---------------------- |
| 硬件       | x86_64，GB 级内存      | ARM/MIPS/RISC-V，MB 级内存 |
| 启动方式     | BIOS/UEFI → GRUB   | Bootloader（U-Boot）     |
| 根文件系统    | ext4，几十 GB         | SquashFS/UBIFS，几十 MB   |
| 包管理      | apt/yum            | 交叉编译 + 手动部署或 opkg      |
| 图形界面     | X11/Wayland + 桌面环境 | framebuffer / Qt / LVGL |
| 构建方式     | 安装发行版              | Buildroot / Yocto 从源码构建 |

## 二、系统组成

```
┌─────────────────────────────────────┐
│         应用层（用户程序）              │
├─────────────────────────────────────┤
│    C 库（musl / glibc）              │
├─────────────────────────────────────┤
│         Linux 内核                   │
│  （进程调度/内存管理/设备驱动/网络协议栈）  │
├─────────────────────────────────────┤
│       Bootloader（U-Boot）           │
├─────────────────────────────────────┤
│         硬件（SoC + 外设）            │
└─────────────────────────────────────┘
```

## 三、Bootloader（U-Boot）

U-Boot 是嵌入式 Linux 最常用的引导程序，负责：硬件初始化 → 加载内核到内存 → 传递设备树 → 跳转执行。

### 常用命令

```bash
# U-Boot 命令行
printenv              # 查看环境变量
setenv bootargs 'console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait'
saveenv               # 保存到 Flash

# 从 SD 卡加载内核和设备树
load mmc 0:1 0x80008000 zImage
load mmc 0:1 0x83000000 imx6ull.dtb
bootz 0x80008000 - 0x83000000
```

### 启动流程

1. SoC 内部 ROM 代码 → 从 SD/eMMC/SPI Flash 加载 SPL（Secondary Program Loader）
2. SPL 初始化 DDR → 加载完整 U-Boot
3. U-Boot 初始化外设 → 加载 Linux 内核 + 设备树 + 根文件系统
4. 内核启动 → 挂载根文件系统 → 执行 init 进程

## 四、内核裁剪与编译

### 交叉编译环境

```bash
# 下载工具链
sudo apt install gcc-arm-linux-gnueabihf

# 或使用 Linaro/ARM 官方工具链
export CROSS_COMPILE=arm-linux-gnueabihf-
export ARCH=arm
```

### 内核配置与编译

```bash
# 基于默认配置
make imx_v6_v7_defconfig

# 图形化裁剪
make menuconfig
# 关闭不需要的驱动、文件系统、网络协议以减小体积

# 编译
make -j$(nproc) zImage dtbs modules

# 输出
# arch/arm/boot/zImage          — 压缩内核
# arch/arm/boot/dts/xxx.dtb    — 设备树
```

### 设备树（Device Tree）

设备树描述硬件拓扑，让同一个内核适配不同板子。

```dts
/ {
    model = "My Custom Board";
    compatible = "myvendor,myboard", "fsl,imx6ull";

    leds {
        compatible = "gpio-leds";
        status-led {
            gpios = <&gpio1 3 GPIO_ACTIVE_LOW>;
            linux,default-trigger = "heartbeat";
        };
    };
};

&uart1 {
    status = "okay";
};

&i2c1 {
    clock-frequency = <400000>;
    bme280@76 {
        compatible = "bosch,bme280";
        reg = <0x76>;
    };
};
```

## 五、根文件系统

### Buildroot

最简单的嵌入式 Linux 构建系统，一条命令生成完整的根文件系统。

```bash
git clone https://github.com/buildroot/buildroot.git
cd buildroot
make menuconfig   # 选择目标架构、工具链、软件包
make -j$(nproc)

# 输出在 output/images/
# rootfs.tar    — 根文件系统
# zImage        — 内核
# xxx.dtb       — 设备树
```

Buildroot 适合：小型系统、快速原型、对构建时间敏感的场景。

### Yocto / OpenEmbedded

工业级构建系统，支持层（Layer）机制，适合大型团队和长期维护的产品。

```bash
# 初始化构建环境
source oe-init-build-env

# 编辑 conf/local.conf 设置目标机器
MACHINE = "imx6ullevk"

# 构建最小镜像
bitbake core-image-minimal
```

Yocto 适合：量产产品、需要长期安全更新、多人协作、复杂软件栈。

### BusyBox

嵌入式 Linux 的"瑞士军刀"，一个二进制文件提供几百个常用命令（ls、cat、mount、ifconfig…）。Buildroot 和 Yocto 都默认集成 BusyBox。

## 六、驱动开发

### 字符设备驱动框架

```c
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>

static int my_open(struct inode *inode, struct file *file) { return 0; }
static ssize_t my_read(struct file *file, char __user *buf, size_t len, loff_t *off) {
    char data[] = "hello\n";
    if (copy_to_user(buf, data, sizeof(data))) return -EFAULT;
    return sizeof(data);
}

static struct file_operations fops = {
    .owner = THIS_MODULE,
    .open = my_open,
    .read = my_read,
};

static dev_t devno;
static struct cdev cdev;

static int __init my_init(void) {
    alloc_chrdev_region(&devno, 0, 1, "mydev");
    cdev_init(&cdev, &fops);
    cdev_add(&cdev, devno, 1);
    return 0;
}

static void __exit my_exit(void) {
    cdev_del(&cdev);
    unregister_chrdev_region(devno, 1);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

### Platform 驱动（配合设备树）

现代 Linux 驱动通过设备树匹配：

```c
static const struct of_device_id my_of_match[] = {
    { .compatible = "myvendor,mysensor" },
    {},
};

static int my_probe(struct platform_device *pdev) {
    // 从设备树获取资源（GPIO、中断、寄存器地址）
    struct resource *res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    void __iomem *base = devm_ioremap_resource(&pdev->dev, res);
    return 0;
}

static struct platform_driver my_driver = {
    .probe = my_probe,
    .driver = {
        .name = "mysensor",
        .of_match_table = my_of_match,
    },
};
module_platform_driver(my_driver);
```

## 七、应用层开发

嵌入式 Linux 应用和普通 Linux 程序一样，用 C/C++/Python/Go 都行，区别在于交叉编译。

### GPIO 操作（sysfs / libgpiod）

```bash
# 新接口：libgpiod
gpiodetect
gpioinfo gpiochip0
gpioset gpiochip0 3=1
gpiomon gpiochip0 5
```

```c
#include <gpiod.h>

struct gpiod_chip *chip = gpiod_chip_open("/dev/gpiochip0");
struct gpiod_line *line = gpiod_chip_get_line(chip, 3);
gpiod_line_request_output(line, "myapp", 0);
gpiod_line_set_value(line, 1);  // 输出高
```

### 串口通信

```c
int fd = open("/dev/ttyS1", O_RDWR | O_NOCTTY);
struct termios tty;
tcgetattr(fd, &tty);
cfsetispeed(&tty, B115200);
cfsetospeed(&tty, B115200);
tty.c_cflag = CS8 | CLOCAL | CREAD;
tty.c_lflag = 0;
tcsetattr(fd, TCSANOW, &tty);

write(fd, "AT\r\n", 4);
char buf[64];
int n = read(fd, buf, sizeof(buf));
```

## 八、OTA 升级

量产产品必须支持远程固件升级。常见方案：

| 方案         | 原理                    | 代表工具              |
| ---------- | --------------------- | ----------------- |
| 双分区（A/B）   | 两个系统分区交替升级，失败回滚       | SWUpdate、RAUC     |
| 差分升级       | 只下载变化部分，节省带宽          | bsdiff、Mender     |
| 容器化升级      | 应用跑在容器里，独立于系统升级       | Docker、balena     |

## 九、调试手段

- **串口终端**：最基本的调试方式，内核 printk + 应用 printf
- **SSH**：网络通了之后远程登录
- **GDB + gdbserver**：目标板跑 gdbserver，PC 端 GDB 远程调试
- **strace**：跟踪系统调用，排查文件/网络/权限问题
- **perf / ftrace**：性能分析、内核函数追踪
- **dmesg**：查看内核日志，排查驱动问题

返回 [总览与学习路线](./index.md)
