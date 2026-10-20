---
title: InfluxDB 时序建模、窗口与恢复
author: Walt
date: 2024-12-19 10:00:00
LastEditTime: 2026-10-20 00:00:00
LastEditors: Walt
---

# InfluxDB 时序建模、窗口与恢复

仓库的温湿度传感器每 30 秒上报一次，值班人员查看最近一小时曲线，管理员保留一年的小时均值。这类数据围绕“某台设备在什么时间测到了什么”组织，适合时序数据库。设备资产、用户权限和告警工单仍有自己的业务存储，不能把所有对象都变成时间点。

## 先确定产品版本

InfluxDB 的主版本不是一套语法逐步增加功能。本文的写入、Flux、任务与恢复练习限定为 **InfluxDB OSS 2.7.12**，不把它写成当前全部产品的统一入口。部署时固定补丁版本或镜像摘要，避免使用 `latest` 跨主版本变化。

| 产品范围 | 数据与查询入口 | 迁移时需要确认 |
| --- | --- | --- |
| 1.x 的既有系统 | database/retention policy，主要使用 InfluxQL | 认证、连续查询、保留策略和旧客户端；不能直接执行2.x任务 |
| OSS 2.x | organization/bucket，v2写入API，Flux；部分兼容入口支持InfluxQL | DBRP映射、Token权限、任务与备份；兼容API不等于所有1.x管理语句都支持 |
| InfluxDB 3 Core 等3.x产品 | 新存储引擎，SQL/InfluxQL入口；不同产品能力有区别 | **不支持Flux**，重新设计查询、任务和运维；不能拿2.x的数据目录直接替换 |

Flux 已进入维护状态。维护 2.x 可以继续使用；新项目应结合具体 3.x 产品的部署方式、查询范围和功能评估，而不是把下面的 Flux 代码改个连接地址就迁移。InfluxQL 是类 SQL 语言，不能假定支持 SQL 的 `CASE`、任意 JOIN 或关系库事务。

## 时间、标签和字段一起确定一条数据

在 2.x 的 TSM 模型里，measurement 与完整 tag set 确定一条序列，timestamp 定位其中的一个点。field 保存该点的数值、布尔或字符串属性。对同一 measurement/tag set/timestamp 重写，会合并字段集；相同字段的新值覆盖旧值，并不会自动新增一行。

![InfluxDB 数据点身份与重复写入](/database/influxdb-point-identity.svg)

例如 `sensor,site=warehouse_a,device=d1 temperature=20.0,humidity=40.0 1792368000` 表示 UTC 2026-10-19 00:00:00 的采样，示例使用**秒**精度。Line Protocol 自身不带“这个整数是秒”的标记，必须通过写入 API/CLI 的 precision 明确指定；把秒数当默认纳秒会落到 1970 年附近。

| 数据 | 放置位置 | 原因与边界 |
| --- | --- | --- |
| site、device | tag | 常用于定位与分组；设备数量仍需计入基数预算 |
| temperature、humidity | field | 连续数值，不把每个温度取值建成标签 |
| request_id、原始SQL、任意用户文本 | 通常field或日志系统 | 放进tag会不断创造新序列，且可能泄露业务数据 |
| 采样时刻 | timestamp | 不再复制为每次变化的tag；时间来自设备还是接收端要写入合同 |

不能只看单个 tag 有多少值，完整组合才决定序列规模。例如 1 万设备各有 20 个实际出现的通道就可能产生 20 万组合，再加每次唯一 request_id 会持续增长。2.x 的标签索引机制不能直接套到 3.x 的存储与查询优化结论上。

## 本机建立练习桶

容器只绑定回环端口，初始化通过容器内交互执行，密码和初始 Token 不写进命令历史或仓库。示例假设本机已有 Docker，实验数据使用具名卷：

```bash
docker run -d --name influx-sensor-lab \
  -p 127.0.0.1:18086:8086 \
  -v influx-sensor-data:/var/lib/influxdb2 \
  -v influx-sensor-config:/etc/influxdb2 \
  influxdb:2.7.12

curl -fsS http://127.0.0.1:18086/health

docker exec -it influx-sensor-lab influx setup \
  --org sensor_lab --bucket sensor_raw --retention 0
```

按提示设置实验管理员并完成初始化。这里 `retention 0` 表示不自动过期，使固定日期样本可以重复查询；生产原始数据应根据合规、补数窗口和存储预算设置有限保留期，例如 30 天。保留期按分片组异步执行清理，不保证到期那一秒物理删除。

接下来 CLI 都在容器内执行，使用初始化保存的本地 CLI 配置；可先用 `docker exec -it influx-sensor-lab sh` 进入。管理员用于实验管理，不交给采集器。实际接入创建仅有目标 bucket 写权限的 Token，查询端使用读权限 Token，走 HTTPS 并验证 CA；备份管理员权限独立保管。不要把 Token 放进浏览器页面或打印完整认证头。

```bash
influx bucket list --org sensor_lab
influx bucket create --org sensor_lab --name sensor_hourly --retention 0
```

## 写入与可重复的查询

以下 6 行是 Line Protocol 数据，不是 shell 命令。保存为容器内 `samples.lp` 后写入；measurement/tag 里空格、逗号、等号等有转义规则，实际采集优先使用客户端的 Point 编码器。`20.0` 是浮点，`20i` 是有符号整数，字符串用双引号，不能让同一字段在同一分片内随意切换类型。

```text
sensor,site=warehouse_a,device=d1 temperature=20.0,humidity=40.0 1792368000
sensor,site=warehouse_a,device=d1 temperature=24.0,humidity=50.0 1792368030
sensor,site=warehouse_a,device=d1 temperature=26.0,humidity=60.0 1792368060
sensor,site=warehouse_a,device=d2 temperature=30.0,humidity=65.0 1792368000
sensor,site=warehouse_a,device=d2 temperature=34.0,humidity=70.0 1792368030
sensor,site=warehouse_a,device=d2 temperature=36.0,humidity=75.0 1792368060
```

```bash
influx write --org sensor_lab --bucket sensor_raw --precision s --file samples.lp
```

时间点不能在重试时重新调用“当前时间”，否则同一采样会变成新点；相同身份、相同字段值的覆盖写可以重试，但并发发送不同值时不能假定业务事件顺序与最终覆盖顺序一致。批量写入可能部分成功，错误日志与重放队列要记录被拒的行和原因，不能用“HTTP有响应”判断全批写入成功。

### 先过滤，再决定合并哪些表

将下面内容保存为 `temperature.flux`，执行 `influx query --org sensor_lab --file temperature.flux`。`range` 是左闭右开区间，显式固定范围避免一小时后示例“没有数据”。Flux 返回一组表，默认按标签、measurement、field 等分组，不是一张天然平铺的关系表。

```text
from(bucket: "sensor_raw")
  |> range(start: 2026-10-19T00:00:00Z, stop: 2026-10-19T00:02:00Z)
  |> filter(fn: (r) => r._measurement == "sensor")
  |> filter(fn: (r) => r.site == "warehouse_a" and r._field == "temperature")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false, timeSrc: "_start")
  |> yield(name: "minute_temperature")
```

预期每台设备两个窗口：d1 为 22、26，d2 为 32、36。00:01:00 的样本属于第二个窗口；显式 `timeSrc: "_start"` 将窗口起点写成结果时间，默认通常使用窗口终点。不要在平均温度前删除 `_field` 再把湿度一起平均，也不要随意 `group(columns: [])` 混合所有设备。

如果确实要全仓库平均值，还要定义“每条采样等权”还是“每台设备等权”。设备 d1 一小时采集 120 次、d2 只采集 1 次时，平均所有采样和平均两台设备各自的均值不是同一口径。均值不是 P95；需要百分位时应保留足够原始分布或可合并的统计结构。

### 同时展示温湿度

界面需要把同一采样的两个 field 放到一行，可在保留设备标签后做 pivot。若用 join，需同时考虑时间、设备、位置和分组键；仅按时间连接两台设备可能产生错配。

```text
from(bucket: "sensor_raw")
  |> range(start: 2026-10-19T00:00:00Z, stop: 2026-10-19T00:02:00Z)
  |> filter(fn: (r) => r._measurement == "sensor" and r.device == "d1")
  |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "site", "device", "temperature", "humidity"])
```

d1 应返回三行，温湿度分别是 20/40、24/50、26/60。`sort` 和 `limit` 默认按每张输入表执行，想要全局前十要先明确合并范围再排序，而不是以为对多张表各取十行等于全局十行。

### 观察覆盖与字段合并

先写入 `merge_demo`，再以相同身份写入另一组字段：

```bash
influx write --org sensor_lab --bucket sensor_raw --precision s \
  'merge_demo,device=d1 temperature=20.0,humidity=40.0 1792368000'
influx write --org sensor_lab --bucket sensor_raw --precision s \
  'merge_demo,device=d1 temperature=21.0,voltage=3.3 1792368000'
```

```text
from(bucket: "sensor_raw")
  |> range(start: 2026-10-19T00:00:00Z, stop: 2026-10-19T00:00:01Z)
  |> filter(fn: (r) => r._measurement == "merge_demo")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
```

结果是一行 temperature=21、humidity=40、voltage=3.3，旧 humidity 没有被删除。为了保留每次上报而随手增加唯一 UUID tag 会引入高基数；应先确认是要保存独立事件，还是覆盖同一时刻的测量。修改采样时间以躲避覆盖也会改变时间语义。

## 从分钟采样到小时数据

![InfluxDB 原始数据与降采样补数](/database/influxdb-downsample-boundaries.svg)

降采样不是删除一部分原始行，而是将明确窗口内的值计算成摘要，并写入独立桶。先确认查询口径、标签与结果时间，再决定删除原始数据的时间；原始数据过期后不能靠小时均值重新计算峰值或任意区间的分位数。

下面任务用于 2.x 的 Tasks 编辑器，提交后由服务端定时执行。它每小时重算最近两个小时的温度均值，延迟 10 分钟运行以容纳短时迟到；输出使用窗口起点、同一measurement、同一设备标签和相同field，重算会覆盖同一摘要点。

```text
option task = {name: "sensor_hourly_temperature", every: 1h, offset: 10m}

from(bucket: "sensor_raw")
  |> range(start: -2h)
  |> filter(fn: (r) => r._measurement == "sensor" and r._field == "temperature")
  |> aggregateWindow(every: 1h, fn: mean, createEmpty: false, timeSrc: "_start")
  |> to(bucket: "sensor_hourly", org: "sensor_lab", tagColumns: ["site", "device"])
```

`offset` 延后执行，不会自动等待所有设备到齐，更不会修复任意时长的断网补传。超过重算范围的迟到数据，需要用固定 start/stop 手动补算，记录覆盖范围并验证输出。任务停机超过两个小时同样需要补数；关注任务最近成功时间、失败日志和源数据水位，不能只看任务已创建。

如果原始采样被纠正为“这个窗口没有任何点”，`createEmpty: false` 不会主动删除已经写出的旧摘要；需要对应的纠正协议。若还要合并小时结果得到日均值，保存 sum/count 并按数量加权，不能不加区分地平均各小时 mean。

## 客户端先确认写入完成

Node.js 示例使用 `@influxdata/influxdb-client` 的 2.x 客户端。`writePoint` 可以只进入本地缓冲，`close()` 返回的 Promise 完成后才能据此发起需要读到本次数据的查询；退出进程也要等待缓冲处理完成。以下 Token 来自进程环境，只授予对应桶的读写权限，实际服务可以继续拆分读写身份。

```javascript
import { InfluxDB, Point } from '@influxdata/influxdb-client'

const token = process.env.INFLUX_TOKEN
if (!token) throw new Error('缺少 INFLUX_TOKEN')
const org = 'sensor_lab'
const bucket = 'sensor_raw'
const client = new InfluxDB({ url: 'http://127.0.0.1:18086', token })
const writeApi = client.getWriteApi(org, bucket, 's')

try {
  writeApi.writePoint(
    new Point('client_probe')
      .tag('device', 'd1')
      .floatField('temperature', 25.0)
      .timestamp(new Date('2026-10-19T00:00:00Z'))
  )
  await writeApi.close()
  const queryApi = client.getQueryApi(org)
  const query = `from(bucket: "sensor_raw")
    |> range(start: 2026-10-19T00:00:00Z, stop: 2026-10-19T00:00:01Z)
    |> filter(fn: (r) => r._measurement == "client_probe" and r._field == "temperature")`
  for await (const { values, tableMeta } of queryApi.iterateRows(query)) {
    const row = tableMeta.toObject(values)
    console.log(row._time, row.device, row._value)
  }
} catch (error) {
  process.exitCode = 1
  console.error(error instanceof Error ? error.message : '写入或查询失败')
}
```

这是一次小批采集，不是生产队列实现。生产还需限制本地积压、处理退出信号、设置重试上限和失败持久化；已写入部分样本后连接断开时，按稳定的采样身份重放。不要用无限内存队列掩盖服务端持续拒写。

## 备份恢复要验证到桶和数值

`influx backup` 是 2.x 备份入口，不是导出CSV。备份权限与普通桶读写权限不同，使用受控管理员运行；备份目录含敏感元数据，应按敏感工件限制访问并离机保存。以下命令仍在实验容器内、使用实验管理员配置：

```bash
influx backup --org sensor_lab --bucket sensor_raw /tmp/sensor-backup

# sensor_restored 必须是新桶，不能覆盖已经存在的桶
influx restore --org sensor_lab --bucket sensor_raw \
  --new-bucket sensor_restored /tmp/sensor-backup
```

恢复完成后，把上面的温度与 pivot 查询换成 `sensor_restored`，应得到同样的 6 条温度采样和 4 个分钟结果；核对标签、字段类型、起止时间与覆盖合并示例。目录存在、命令退出成功、查询返回一行，分别都不足以证明业务数据完整。

完整 `--full` 恢复会替换元数据，不能当普通“导入新桶”。新服务器恢复涉及源实例 operator Token；2.9 起默认 Token 哈希还改变了相关恢复前提，需要匹配服务端与 CLI 的能力。不要把2.7的恢复步骤直接套到2.9或3.x，更不要通过删除原桶来制造恢复空间。

## 排查按数据经过的位置推进

| 现象 | 先核对什么 | 验证闭环 |
| --- | --- | --- |
| 写入报错或只收到部分样本 | 返回状态/错误行、Token权限、bucket、字段类型、保留期 | 修正失败行并按原时间重放，查询固定设备与时间区间 |
| 查询为空 | org/bucket、秒/毫秒/纳秒、UTC时区、range右边界、measurement/field | 先查窄范围原始点，再恢复聚合和界面筛选 |
| 温度曲线混入湿度 | `_field`过滤、group key、单位 | 输出保留device与field，使用已知样本核对数值 |
| 内存和索引增长 | 实际tag组合、设备/通道数量、request_id等无界标签 | 对比序列增长与写入量，重设计后迁移并限制入口 |
| 小时曲线漏点或不更新 | 任务失败、迟到时间、重算范围、源数据是否已过期 | 对固定窗口补数，核对原始count与摘要数值 |
| 备份不能恢复 | CLI/服务端版本、权限、目标桶冲突、备份元数据 | 恢复到隔离新桶，用相同查询逐项比对 |

`/health`、`/ready` 与 `/metrics` 可以帮助定位进程状态；健康不等于采集器真的写入了数据。监控服务端拒写率、磁盘、WAL/压缩、查询内存、任务成功时间和端到端采样延迟。`_monitoring` 等系统桶不能假定自动存在旧示例中的任意 measurement，先检查实际采集配置与指标。

这套练习的验收重点是采样身份稳定、时间窗口正确、迟到有补算入口、备份可恢复。吞吐和保留周期需要用真实设备数量、采样频率、字段数、查询并发和磁盘条件测量，不能从六行样本推导生产容量。
