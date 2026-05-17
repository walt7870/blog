# Nginx 概述

Nginx 常放在业务服务前面，负责接收外部 HTTP/HTTPS 请求，再决定请求应该返回静态文件、转发到后端服务、重定向，还是拒绝访问。它不是业务框架，而是流量入口层。

可以把 Nginx 理解成网站门口的分流台：先看请求进了哪个端口和域名，再看 URI 匹配哪个规则，最后把请求交给静态目录、后端服务或重定向规则。

![Nginx 请求处理链路](/nginx/nginx-request-flow.svg)

## 本模块内容

| 页面 | 说明 |
| --- | --- |
| [Nginx 概述](./nginx.md) | 理解配置层级、请求链路、常见场景和排错入口 |
| [location 匹配](./location.md) | 理解 URI 如何命中具体 `location` |
| [自动证书续期](./auto-renew-cert.md) | 使用 `acme.sh` 申请、部署和续期 HTTPS 证书 |

## 请求怎么被处理

一次请求进入 Nginx 后，通常按这个顺序处理：

1. 根据 `listen` 选择监听端口。
2. 根据 `server_name` 选择站点配置。
3. 根据 URI 选择最合适的 `location`。
4. 在 `location` 中执行静态文件查找、反向代理、重定向、限流、鉴权等动作。
5. 返回响应并写入访问日志或错误日志。

排错时也按这个顺序看：端口是否通、域名是否进了正确 server、URI 是否命中正确 location、后端是否可达、日志里记录了什么。

## 配置层级

Nginx 配置不是平铺的，常见层级如下：

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name example.com;

        location / {
            root /usr/share/nginx/html;
            index index.html;
        }
    }
}
```

| 配置块 | 负责什么 | 常见配置 |
| --- | --- | --- |
| 全局块 | 进程、用户、日志、PID | `worker_processes`、`error_log` |
| `events` | 连接处理模型 | `worker_connections` |
| `http` | HTTP 全局行为 | gzip、日志格式、upstream、include |
| `server` | 一个站点或虚拟主机 | `listen`、`server_name`、SSL |
| `location` | 某类 URI 的处理方式 | `root`、`try_files`、`proxy_pass` |

`server` 决定“进哪个站点”，`location` 决定“这个路径怎么处理”。很多问题都是把这两层混在一起导致的。

## 常见场景

### 静态网站

适合部署纯 HTML、Vue/React 构建产物、图片和下载文件。

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/example;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

`try_files $uri $uri/ /index.html` 常用于 SPA 前端路由。浏览器访问 `/users/1` 时，磁盘上可能没有这个文件，最终回退到 `index.html`，再由前端路由接管。

### 反向代理

适合把外部请求转发到后端服务。

```nginx
upstream order_api {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://order_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

反向代理时，后端看到的客户端信息通常来自 `X-Forwarded-*` 头。后端如果要生成回调地址、判断 HTTPS、记录真实 IP，需要明确是否信任这些头。

### 静态资源缓存

适合给图片、CSS、JS 设置浏览器缓存。

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}
```

带 hash 的构建产物可以缓存较久；不带版本号的文件不要随意设置长缓存，否则发布后用户可能一直看到旧资源。

### HTTPS 入口

HTTPS 配置由证书文件、私钥文件和 TLS 参数组成。

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

证书自动申请和续期见 [自动证书续期](./auto-renew-cert.md)。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `nginx -t` | 检查配置语法和文件引用 |
| `nginx -s reload` | 平滑重载配置 |
| `systemctl reload nginx` | systemd 管理的 Nginx 重载 |
| `systemctl status nginx` | 查看服务状态 |
| `tail -f /var/log/nginx/error.log` | 查看错误日志 |
| `tail -f /var/log/nginx/access.log` | 查看访问日志 |

改配置后先 `nginx -t`，再 reload。不要直接 restart，除非明确需要重启进程。

## 常见问题

### 访问到了错误站点

检查：

1. 请求域名是否符合 `server_name`。
2. 多个 `server` 是否监听同一端口。
3. 是否存在 `default_server`。
4. DNS 是否指向当前机器。
5. 反向代理或负载均衡前面是否还有一层入口。

### 静态文件 404

检查：

1. `root` 指向的目录是否正确。
2. URI 拼接后的实际文件路径是否存在。
3. `try_files` 是否回退到预期路径。
4. Nginx worker 用户是否有读取权限。
5. 是否被更高优先级的 `location` 抢走。

### 反向代理 502

502 表示 Nginx 作为代理没有从上游拿到有效响应。优先检查：

1. 后端进程是否启动。
2. `proxy_pass` 地址和端口是否正确。
3. 本机能否 `curl` 到后端。
4. 后端是否超时或主动断开连接。
5. 错误日志中的具体原因。

### 修改配置后不生效

检查：

1. 是否改的是实际加载的配置文件。
2. `include` 路径是否包含该文件。
3. 是否执行了 reload。
4. `nginx -t` 是否通过。
5. 浏览器或 CDN 是否缓存了旧内容。

## 总结

理解 Nginx 先抓住三层：`server` 选站点，`location` 选处理规则，具体指令决定返回静态文件、代理后端、重定向或拒绝访问。排错时不要先猜配置项，按“端口和域名 -> location -> 文件或后端 -> 日志”的顺序推进。
