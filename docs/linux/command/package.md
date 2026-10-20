# 软件包来源、依赖与升级验收

订单接口需要升级OpenSSL时，包管理器解决的是“从哪个仓库选择哪个版本、如何满足依赖、怎样把文件和安装状态写入系统”。已经运行的进程可能仍映射旧库，应用也可能需要迁移配置或重启。安装事务成功和业务升级完成需要分别验证。

![软件包从可信仓库到运行服务的升级链路](/linux/package-transaction-runtime.svg)

## 区分仓库索引、包文件和运行进程

仓库索引描述可用包、版本和依赖。刷新索引通常不会立即升级已安装软件；安装器下载并验证包后，才执行解包、维护脚本和配置步骤。卸载也可能运行脚本、停止服务或删除依赖，不能把它当作单纯删除一个二进制文件。

Debian/Ubuntu常用APT解析依赖、dpkg维护包状态；RPM体系用DNF等解析依赖、rpm查询和操作包文件。openSUSE的zypper、Arch的pacman、Alpine的apk分别遵循各自仓库与升级规则，不在同一根文件系统混用发行版的软件源。

`apt`主要面向交互操作，脚本通常用接口更稳定的`apt-get`与`apt-cache`，不能把`apt-get`简单称为被淘汰的旧命令。DNF 4与DNF 5的部分插件、仓库管理和历史语法不同，先看`dnf --version`与本机帮助；`yum`可能是旧工具，也可能是兼容入口，不能仅凭命令名判断版本。

## 先查询，再看事务计划

以Debian系的gzip为例，以下片段只读查询与模拟安装，不刷新索引、不安装软件：

```bash
dpkg-query -W -f='${Package}\t${Version}\t${Status}\n' gzip
dpkg-query -L gzip
dpkg-query -S /bin/gzip
apt-cache policy gzip
apt-cache depends gzip
apt-get --simulate install gzip
dpkg --audit
```

`policy`显示当前索引里的候选版本和优先级，不保证索引刚刚刷新。`dpkg-query -S`只查询包数据库，不证明路径内容没有被修改；usrmerge系统中的`/bin`与`/usr/bin`别名也可能影响归属查询。模拟计划不执行维护脚本，但它不是完整运行时兼容测试，且结果会随仓库元数据和机器状态变化。

安装前记录当前版本、来源、候选版本，以及计划增加、升级和删除的包。包名相同不代表来自同一仓库；精确版本也可能已被镜像移除。需要可重现环境时保存发行版、架构、仓库快照或固定镜像、包清单和配置，不能只保存一串包名。

## APT的安装、移除与状态修复

以下是操作模板，需要在对应维护窗口及测试环境评估后执行：

```text
sudo apt-get update
apt-cache policy 包名
apt-get --simulate install 包名
sudo apt-get install 包名
```

`update`失败或某个仓库不可用时，不能继续依据残留索引声称“系统已最新”。`upgrade`与`full-upgrade`/`dist-upgrade`的依赖处理策略不同，后者可能为完成升级移除包；先查看实际计划。不要为了省确认步骤把升级、自动删依赖和清缓存直接串成一个无人值守脚本。

`remove`移除包但通常保留其受管理配置；`purge`进一步清理配置与相应脚本负责的数据，不能理解为保证删掉所有用户数据。`autoremove`按自动安装状态推导不再需要的依赖，并不理解业务是否通过脚本或手工方式仍使用它；先模拟、核对计划和`apt-mark showmanual`。锁定版本用`apt-mark hold`，但长期hold也会阻挡修复，需要记录解除条件。

本地deb优先交给`apt install ./文件.deb`处理依赖；离线环境仍要准备完整依赖与可信来源。`dpkg -i`不负责从仓库下载缺失依赖。失败先保留错误、检查`dpkg --audit`、APT/dpkg日志和真实磁盘状态，再决定是否需要`dpkg --configure -a`或`apt-get -f install`；这两项会执行配置或依赖修复事务，不是无副作用的检查。

不要用`dpkg --force-depends`、`rpm --nodeps`作为常规修复，否则只是绕过依赖检查，应用仍可能缺库或不兼容。遇到锁时先确认是否有正常包管理任务，不删除锁文件来强行并行运行两个事务。

## 仓库信任要限定到来源

APT通过签名的仓库元数据和包摘要建立获取链的可信性，不等于每个deb都有可独立验证的维护者签名。`dpkg -V`或`rpm -V`检查部分已安装文件与包记录是否相符，也不是恶意代码扫描，更不能证明运行进程已经使用新版本。

添加第三方APT仓库时，核对维护方、域名、发行版代号、架构及签名密钥指纹。自管密钥通常放`/etc/apt/keyrings/`，仓库通过`Signed-By`或` signed-by=`限定使用哪个keyring；文件需允许APT读取。不要把下载来的任意密钥加入全局信任，也不继续用已弃用的`apt-key add`流程。

下面是deb822 `.sources`结构示意，不含可用仓库或密钥，不应直接作为安装来源：

```text
Types: deb
URIs: https://packages.example.com/debian
Suites: 实际发行版代号
Components: main
Architectures: 实际架构
Signed-By: /etc/apt/keyrings/vendor.gpg
```

密钥格式需与扩展名和APT版本兼容，ASCII装甲与二进制keyring不能只改后缀充当转换。仓库签名过期、指纹不符或时间错误时，修复对应来源，不用`trusted=yes`或允许未认证包来消除告警。添加PPA只适用于相应Ubuntu生态，不能把Ubuntu仓库直接加到Debian。

RPM仓库需核对包签名校验和仓库元数据校验各自配置，不能认为启用一个开关就覆盖全部来源。使用`rpm --checksig 文件.rpm`时还要确认验证密钥属于可信维护方；单纯下载与导入一把同站密钥不能独立建立信任。

## 其他发行版按各自升级合同操作

| 环境 | 查询与计划入口 |
| --- | --- |
| DNF体系 | `dnf info`、`dnf repoquery`、`dnf history`；核对本机版本、插件和仓库 |
| openSUSE | `zypper repos`、`zypper info`、更新预演；区分普通更新与发行版升级 |
| Arch | `pacman -Qi/-Si`查询，按完整系统升级流程使用`-Syu` |
| Alpine | `apk policy`、`apk info`，安装/升级前核对分支和架构 |

DNF的`check-update`检测到可用更新时常用退出码100，自动化不能把它直接当作故障。安全更新筛选依赖仓库公告元数据；APT列表中`grep security`不是可靠的完整安全修复清单，unattended-upgrades也要先核对允许来源、重启策略与日志。

Arch不支持常规部分升级。不能先单独`pacman -Sy`刷新数据库，再只升级个别包，把新旧依赖混在一起；按官方完整系统升级流程处理。缓存清理可能删除回退所需版本，`pacman -Scc`不是每次更新后的固定步骤。AUR的PKGBUILD由社区提供，需审查构建脚本与来源，不因使用yay就视为官方仓库包。

Alpine要保持匹配的稳定分支或明确的edge环境，混入不同分支可能造成依赖不一致。SUSE的`dist-upgrade`与普通`update`也不是同义；包格式、仓库与命令应跟随实际系统版本。离线装单个RPM、deb或APK文件，都不能自动补齐完整仓库与依赖合同。

## 更新后的验收与回退

对订单接口的库更新，先确认包数据库版本和磁盘文件，再确认服务是否按维护策略重启、实际加载了哪个库，最后验证健康入口、真实只读请求与错误率。安装器可能触发服务动作，也可能留下“需要重启”的状态；存在`/var/run/reboot-required`是部分系统的提示，文件不存在不能证明所有服务都无需重启。

包降级不等于完整回滚。数据库迁移、配置格式变化、维护脚本副作用和依赖仓库消失都可能阻止直接恢复；DNF历史undo也依赖当前可用版本，不能承诺撤销所有状态。升级前准备可用旧包或镜像、配置备份、数据恢复方案与兼容性判断，测试后再发布。

故障闭环保留包事务日志、服务日志、版本与来源、计划和实际差异。网络获取失败沿[网络请求排查](./network.md)确认，磁盘/inode不足看[系统信息](./system-info.md)，服务启动失败看[systemd](/docs/linux/process/systemd.md)。清缓存、删索引、强装依赖都不能替代对具体失败阶段的定位。
