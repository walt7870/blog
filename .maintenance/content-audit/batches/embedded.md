# 嵌入式与语言总览逐页审查

嵌入式13篇原文2990行与语言总览已全文阅读；逐页决定见reviews/embedded.json。以采样节点贯穿电气、MCU、驱动、调度、通信、升级与能耗，保留五项目和各主题职责，新增15张独立SVG。

修正volatile同步、const位置、CAN位时间、Modbus地址、FPU和内核分类、时钟/ADC/PWM前提、DMA寿命与Cache方向、F407扇区和OTA链接/签名/确认；两年理想电荷278.37mAh。伪完整BLE/MQTT与驱动片段改为合同及完整工程入口，平台版本分别说明。

verify-embedded.mjs实际提取正文，13组命令通过：字段掩码与非法值、短包与tick回绕、Arm裸机对象、Modbus边界、PI周期一致/抗饱和、SPI桩错误路径。故意放宽字段范围、去掉PI的dt均触发失败。核算CAN/PWM、上拉、分区和电荷。主机Sanitizer不证明板上MMIO、DMA、射频、电气、掉电和能耗实测。

来源：官方OTA完整正文及ESP-IDF6.1 MQTT组件迁移经web-read核对。固定5.4.2 RTOS网页提取失败后浏览器读取栈单位与临界区；libgpiod旧域路径404，改用Arch所带gpioset手册核对--chip与进程寿命。两次raw请求超时，局部文件不作为完整版本依据；不把搜索摘要算核对成功。见evidence/embedded/。

构建14.00秒通过；ld/dts/gdb回落纯文本高亮及既有大chunk警告不影响产物。15图结构自检和实际中文节点/画布边界通过；14页桌面1280、iframe窄屏390浅深色56份全文，14次分页，首图28组加OTA第二图2组原尺寸/关闭通过。8份联系表均已查看，截图/tmp/blog-embedded-ui；窄屏不称物理手机。

共享UI旧摘要仍须最终逐页复验，尚未提交、推送、部署。
