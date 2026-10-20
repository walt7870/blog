# 网络协议八页审查

完整阅读协议总览、分层寻址、传输与Socket、现代应用、容量性能、排障、HTTP/WebSocket、嵌入式工业协议八篇正文、代码及直接引用SVG。逐页修正和验证见reviews/protocol.json。

## 核对范围

- MDN WebSocket constructor全文：浏览器API仅提供URL和子协议参数。
- RFC9001的TLS Record封装、握手、0RTT相关段；RFC8441的扩展CONNECT与101差异段，不声称规范全文阅读。
- curl CURLINFO_CONNECT_TIME、CURLINFO_APPCONNECT_TIME、CURLINFO_STARTTRANSFER_TIME三篇全文。curl manpage提取未覆盖计时内容，不把它作为依据。
- Modbus官网现行串行规范PDF第13/14/19/39页相关段：字符位、t1.5/t3.5、19200以上固定间隔及CRC低字节先发。旧下载路径403，实际从https://www.modbus.org/file/secure/modbusoverserial.pdf读取，不声称44页全文阅读。

资料提取保存在/tmp/blog-protocol-official.json、/tmp/blog-protocol-timing-serial.json、/tmp/blog-modbus-serial.pdf。HTTP Body实测24字节，两帧Modbus CRC由Node独立计算；27段Bash经bash -n，UART C片段包装后经本机cc语法检查，均通过。无真实网络、gRPC、串口、Arduino/HAL或现场总线集成实验。

新增3张SVG、修改6张直接引用SVG，全部结构自检与独立原尺寸浏览器截图通过。八页分别完成1280×900桌面、390×844手机浅深色全页检查；每页图原尺寸加载关闭、手机全部超宽代码键盘横滚、桌面和手机实际分页通过，入口耗时拆分锚点正确。手机clientWidth/scrollWidth均390，缩略图均342宽。

最终整站构建14.10秒成功，仍有既有ld/dts语言高亮回退和大chunk提示。未引用的http-versions.svg和tcp-vs-udp.svg没有计入本批图验收。
