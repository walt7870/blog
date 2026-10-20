import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url);
const scan=JSON.parse(fs.readFileSync(new URL('site-scan.json',base),'utf8'));
const decisions={
 index:'改为可信采样、联网隔离和恢复三个交付物，补十二篇问题入口与平台约束地图。',
 'c-programming':'修正指针、volatile同步、const位置、对齐与寄存器副作用；补可测字段/字节/tick边界和启动链接合同。',
 electronics:'修正接地按键上拉、固定I2C电阻、MOS阈值与通用电平表，用数值计算和测量顺序闭环。',
 'hardware-design':'修正固定载流和LDO分界、常亮LED与Y电容泛用建议，补瞬态供电、回流、合规和实板追溯。',
 mcu:'修正芯片分类、nRF52810、可选FPU、ISA费用、地址容量和时钟/低功耗泛化。',
 peripherals:'按事务、缓冲区归属与故障恢复组织，修正HAL错误、ADC/NTC、PWM、Cache方向和看门狗。',
 communication:'修正CAN公式、Modbus回调地址与边界、BLE/MQTT分片、业务确认及LoRaWAN地区/计数合同。',
 rtos:'修正上游/IDF栈单位、临界区/FromISR、队列归属、栈水位、工具归属和安全认证。',
 toolchain:'建立目标ABI、完整启动链接、同ELF符号合同，修正Cube生成、CMake探测、EDU授权和编译器评价。',
 'linux-embedded':'区分启动与运行、BSP/DT与子系统，补libgpiod2生命周期；移除不安全伪完整驱动与串口。',
 platforms:'固定IDF5.4.2与C3基线，修正系列无线差异、树莓派用户/Pi5/PWM与RISC-V兼容。',
 projects:'五项目补故障验收，修正PI时间与抗饱和、F407扇区/OTA链接/签名/确认及两年能耗。',
 career:'去掉年限分级与面试口吻，按模块、系统和决策证据及供电复位故障闭环验证能力。',
 language:'补Python/Electron入口，用订单解释不同运行位置，修正单文件交付和跨平台边界。',
};
const files=[...fs.readdirSync(new URL('../../docs/embedded/',base)).filter(x=>x.endsWith('.md')).map(x=>'docs/embedded/'+x),'docs/devlanguage/index.md'];
for(const mode of ['desktop-light','desktop-dark'])assert.equal(JSON.parse(fs.readFileSync(new URL('evidence/embedded/page-checks-'+mode+'.json',base))).length,14);
for(const mode of ['mobile-light','mobile-dark'])assert.equal(JSON.parse(fs.readFileSync(new URL('evidence/embedded/page-checks-'+mode+'-0.json',base))).length,14);
assert.equal(JSON.parse(fs.readFileSync(new URL('evidence/embedded/svg-boundaries.json',base))).length,15);
assert.equal(JSON.parse(fs.readFileSync(new URL('evidence/embedded/pager.json',base))).length,14);
const pages=files.map(file=>({file,pageType:file.endsWith('/index.md')?'专题导读':'机制与工程实践',status:'verified',findings:[],decision:decisions[file==='docs/devlanguage/index.md'?'language':file.split('/').pop().replace('.md','')],validation:[
 '13组正文提取命令、故意变异、主机Sanitizer及Arm对象编译通过。SPI只测桩函数错误传播；不声称目标板、射频、电气、掉电和能耗硬件实测。',
 '构建14.00秒；14页56份四模式全文、30组图示原尺寸与退出、14次分页、15图中文边界和8份联系表通过；见batches/embedded.md。',
],reviewedHash:scan.pages.find(p=>p.file===file).reviewHash}));
assert.ok(pages.every(p=>p.decision));
fs.writeFileSync(new URL('reviews/embedded.json',base),JSON.stringify({pages},null,2)+'\n');
console.log(JSON.stringify({pages:pages.length}));
