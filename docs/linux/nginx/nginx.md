# Nginx 请求入口与配置验收

订单网站可以把页面、图片和订单接口放在同一个域名下：Nginx接收请求，静态资源从文件系统读取，`/api/`转给订单服务，HTTPS在入口终止。它处理连接、路由和转发，库存是否扣减仍由业务服务决定。

![订单网站经Nginx选择站点、处理路径并记录响应](/nginx/nginx-request-flow.svg)

本页建立请求与配置的全局模型；URI选择、目录映射与代理路径见[location匹配](./location.md)，证书申请、部署和定时验收见[自动证书续期](./auto-renew-cert.md)。一般网络连接问题先沿[网络请求证据链](/docs/linux/command/network.md)定位，不用反复改Nginx参数碰运气。

## 先确定请求实际进入哪个站点

Nginx先按本地监听地址和端口找到候选站点，HTTPS还涉及TLS握手与SNI选择证书，随后HTTP请求中的名称参与虚拟主机选择。`server_name`不是DNS配置，也不能单凭写了域名就让请求到达机器。未匹配名称时通常落到该监听地址与端口的默认站点；`default_server`属于`listen`，没有显式设置时通常使用这一组中的第一个站点。

因此“IP能打开、域名不行”应分别查DNS、请求Host、SNI、证书和站点配置；“浏览器证书正确”也不保证HTTP路径进入预期location。前面有CDN或负载均衡时，还要区分公网TLS终止层与源站。

同一URI还可能因`index`、`try_files`末项或rewrite发生内部跳转，再次选择处理位置。访问日志一般在请求最终处理结束的位置写出，不能把最初看到的前缀当作全部执行过程。

## 配置层级决定指令的作用范围

主配置通常包含全局指令、`events`与`http`，后者包含`upstream`、`server`及`location`。`include`是把配置纳入当前上下文，不是一个独立作用域。站点文件所在目录取决于发行包、容器镜像和编译参数，不能假定`sites-enabled`一定被加载。

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    include /etc/nginx/conf.d/*.conf;
}
```

每条指令都有允许的上下文和继承规则。尤其是`add_header`、`proxy_set_header`，子层定义可能改变从上层继承的集合；不能将“父层写过”当作所有响应和代理请求均携带它的证据。`worker_connections`是每个worker的连接预算，客户端与上游连接都占用，不能直接等同并发用户数；实际还受文件描述符与业务资源约束。

## 一个可验证的订单站点

下面是放入已加载的`http`配置中的站点片段。假定页面位于`/srv/order-web`、版本化资源位于其`assets/`，订单服务监听同一网络命名空间的`127.0.0.1:8080`，并接收带`/api/`的路径。容器中的回环地址指向容器自身，不会自动指向宿主或其他容器。

```nginx
server {
    listen 8088;
    server_name orders.example.com;
    root /srv/order-web;
    index index.html;

    location = /healthz {
        default_type text/plain;
        return 200 "nginx-ready\n";
    }

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 3s;
        proxy_read_timeout 30s;
    }

    location ^~ /assets/ {
        try_files $uri =404;
        expires 30d;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`/healthz`只证明Nginx可以应答；订单服务健康和真实订单读取仍要单独验证。`/assets/missing.js`应返回404，不能回退成HTML；`/orders/1001`作为SPA路由可以回退到入口文件。普通静态文档站如果没有客户端路由，应按构建产物设计`try_files`，不直接照搬SPA回退。

`expires`会生成相应缓存头，不需要再叠加一份同义`Cache-Control`。长缓存仅用于带版本标识且内容不变的资源，HTML入口需要能及时更新；个性化接口不能因此全站缓存。后端只应信任来自明确代理地址的转发头，公网传入的`X-Forwarded-For`前段可能伪造，`$proxy_add_x_forwarded_for`不会自动替后端建立可信链。

`proxy_read_timeout`衡量两次上游读取之间的空闲时间，不是整个订单请求的总时限。502常见于连接拒绝、无有效上游响应，504常见于等待上游超时，但最终状态也受重试与错误页配置影响，应结合错误日志和上游日志判断。支付写操作的重试要由幂等合同约束，不能通过扩大超时或盲目重试掩盖问题。

## 修改配置到实际生效的闭环

先确认服务使用哪个二进制、前缀和主配置。以下是检查入口，不是通用于所有安装方式的固定路径：

```text
nginx -V
sudo nginx -T
sudo nginx -t
sudo systemctl reload nginx
systemctl status nginx
```

`-V`显示版本和编译参数，`-T`测试并输出加载配置，`-t`检查语法及部分文件访问；输出配置可能含内部地址或凭据，不直接贴到公开日志。手动安装时显式使用实际二进制和相同`-p/-c`参数，容器则进入对应容器操作。systemd的服务名与`ExecReload`要以实际unit为准。

reload通常让master检查并应用配置、启动新worker，旧worker继续完成已有连接。应用失败时可能仍由旧配置服务；命令返回或进程还在都不等于新规则已生效。先测试，再重载，观察错误日志、worker变化和新请求。长连接也不保证在reload瞬间全部切到新配置。

在上面的测试站点可执行：

```text
curl --noproxy '*' -i -H 'Host: orders.example.com' http://127.0.0.1:8088/healthz
curl --noproxy '*' -i -H 'Host: orders.example.com' http://127.0.0.1:8088/assets/missing.js
curl --noproxy '*' -i -H 'Host: orders.example.com' http://127.0.0.1:8088/api/orders/1001
```

分别确认入口200、缺失资源404及上游业务结果。HTTPS测试应用`curl --resolve`同时保持正确URL主机名与目标IP，使Host、SNI和证书校验一致；仅给IP请求加Host头不能完成同样的TLS验证。不要用`-k`把证书错误变成成功验收。

## 用日志区分失败阶段

访问日志可加入请求耗时、`$upstream_addr`、`$upstream_status`和上游响应耗时，定位请求是否到达后端。多次尝试可能产生多个上游值，不把它们当一个数字解析。请求URI和查询参数可能含敏感值，日志字段与保留策略应受控。

静态404先还原最终URI和`root/alias`路径，再查worker用户的逐级目录权限，不直接`chmod -R 777`。代理502先从同一容器或主机访问上游，再核对地址、协议、网络命名空间和日志里的具体错误。域名走错站点时查监听组、默认站点、Host/SNI与前置入口；配置未生效时查实际include、配置测试、reload和缓存。每次改动都要保留可恢复配置，并重新验证对应请求。
