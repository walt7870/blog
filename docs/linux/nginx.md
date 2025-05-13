# Nginx 配置项详解

## 1. 全局块

全局块是配置文件的最外层，其配置对整个 Nginx 服务器生效。

### 1.1 worker_processes

- **作用**：指定 Nginx 的工作进程数。
- **默认值**：1
- **示例**：

```nginx
worker_processes 4;
```

✅ 说明：通常设置为 CPU 核心数，可以充分利用多核 CPU 的性能。

### 1.2 worker_connections

- **作用**：指定每个工作进程允许的最大连接数。
- **默认值**：512
- **示例**：

```nginx
events {
    worker_connections 1024;
}
```

✅ 说明：需要结合操作系统的文件描述符限制来设置，通常需要调整系统的 ulimit 值。

### 1.3 error_log

- **作用**：指定错误日志的路径和日志级别。
- **默认值**：logs/error.log
- **示例**：

```nginx
error_log /var/log/nginx/error.log error;
```

✅ 说明：日志级别可以是 debug、info、notice、warn、error、crit、alert、emerg，其中 debug 级别最详细，但会占用大量磁盘空间。

### 1.4 pid

- **作用**：指定 Nginx 的 PID 文件路径。
- **默认值**：logs/nginx.pid
- **示例**：

```nginx
pid /var/run/nginx.pid;
```

✅ 说明：PID 文件用于 Nginx 的进程管理，例如平滑重启等操作。

## 2. events 块

events 块用于配置与事件驱动相关的参数，主要影响 Nginx 的连接处理能力。

### 2.1 worker_connections

- **作用**：指定每个工作进程允许的最大连接数（已在全局块中介绍，但通常放在 events 块中配置）。
- **示例**：

```nginx
events {
    worker_connections 1024;
}
```

### 2.2 use

- **作用**：指定使用的事件驱动模型。
- **默认值**：根据操作系统自动选择
- **示例**：

```nginx
events {
    use epoll;
}
```

✅ 说明：常见的事件驱动模型包括 epoll（Linux）、kqueue（FreeBSD）、select 和 poll。epoll 是 Linux 下性能最高的事件模型，推荐在 Linux 系统中使用。

### 2.3 multi_accept

- **作用**：控制一个进程是否可以同时接受多个连接。
- **默认值**：off
- **示例**：

```nginx
events {
    multi_accept on;
}
```

✅ 说明：开启后可以提高连接处理的效率，但可能增加系统负载。

## 3. http 块

http 块是 Nginx 配置的核心部分，用于配置 HTTP 服务器的行为。

### 3.1 include

- **作用**：引入其他配置文件。
- **示例**：

```nginx
http {
    include mime.types;
}
```

✅ 说明：通常用于引入 MIME 类型配置文件，也可以引入其他自定义配置文件。

### 3.2 default_type

- **作用**：指定默认的 MIME 类型。
- **默认值**：text/plain
- **示例**：

```nginx
http {
    default_type application/octet-stream;
}
```

### 3.3 sendfile

- **作用**：启用或禁用 sendfile 系统调用。
- **默认值**：off
- **示例**：

```nginx
http {
    sendfile on;
}
```

✅ 说明：sendfile 可以提高静态文件的传输效率，减少上下文切换。

### 3.4 tcp_nopush

- **作用**：启用或禁用 TCP 的 nopush 选项。
- **默认值**：off
- **示例**：

```nginx
http {
    tcp_nopush on;
}
```

✅ 说明：在使用 sendfile 时，tcp_nopush 可以减少 TCP 的分片，提高传输效率。

### 3.5 tcp_nodelay

- **作用**：启用或禁用 TCP 的 nodelay 选项。
- **默认值**：on
- **示例**：

```nginx
http {
    tcp_nodelay on;
}
```

✅ 说明：tcp_nodelay 会立即发送数据，而不是等待数据包填满后再发送，适用于交互式应用。

### 3.6 keepalive_timeout

- **作用**：设置客户端的 Keep-Alive 超时时间。
- **默认值**：65
- **示例**：

```nginx
http {
    keepalive_timeout 75;
}
```

✅ 说明：Keep-Alive 可以减少 TCP 连接的建立和关闭次数，提高性能。

### 3.7 gzip

- **作用**：启用或禁用 Gzip 压缩。
- **默认值**：off
- **示例**：

```nginx
http {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

✅ 说明：Gzip 压缩可以减少传输的数据量，提高页面加载速度。

## 4. server 块

server 块用于定义一个虚拟主机（站点）的配置。

### 4.1 listen

- **作用**：指定服务器监听的端口或 IP 地址。
- **默认值**：80
- **示例**：

```nginx
server {
    listen 80;
    listen 443 ssl;
}
```

✅ 说明：listen 指令可多次出现，用于监听不同端口或协议（如 SSL）。
也可以指定特定ip和端口例如：

```nginx
listen 192.168.1.1:80;   # 监听指定 IP 地址的端口 80
listen 192.168.1.1:443 ssl;  # 监听指定 IP 地址的端口 443 并启用 SSL
listen 192.168.1.2:8080;  # 监听另一个 IP 地址的端口 8080
```

### 4.2 server_name

- **作用**：指定服务器的域名或 IP 地址。
- **默认值**：无
- **示例**：

```nginx
server {
    server_name example.com www.example.com;
}
```

✅ 说明：可配置多个域名，支持通配符和正则表达式。

### 4.3 root

- **作用**：指定网站的根目录。
- **默认值**：无
- **示例**：

```nginx
server {
    root /var/www/html;
}
```

✅ 说明：root 路径影响静态文件的查找位置。

### 4.4 index

- **作用**：指定默认的索引文件。
- **默认值**：index.html
- **示例**：

```nginx
server {
    index index.html index.htm;
}
```

✅ 说明：可指定多个索引文件，按顺序查找。

### 4.5 location

- **作用**：基于请求的 URI 匹配规则，定义不同的处理逻辑。
- **示例**：

```nginx
server {
    location / {
        try_files $uri $uri/ =404;
    }
    location /api/ {
        proxy_pass http://backend_server;
    }
}
```

✅ 说明：location 支持前缀、正则、精确等多种匹配方式。

### 4.6 ssl_certificate 和 ssl_certificate_key

- **作用**：指定 SSL 证书和私钥文件的路径。
- **示例**：

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
}
```

✅ 说明：用于配置 HTTPS，需配合 listen 443 ssl 使用。

## 5. location 块

location 块用于定义基于 URI 的匹配规则和处理逻辑。

### 5.1 try_files

- **作用**：尝试按顺序查找文件，如果文件不存在则返回指定的错误码或重定向。
- **示例**：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

✅ 说明：常用于单页应用（SPA）前端路由。

### 5.2 proxy_pass

- **作用**：将请求代理到后端服务器。
- **示例**：

```nginx
location /api/ {
    proxy_pass http://backend_server;
}
```

✅ 说明：常用于反向代理、负载均衡。

### 5.3 rewrite

- **作用**：基于正则表达式重写 URI。
- **示例**：

```nginx
location /old/ {
    rewrite ^/old/(.*)$ /new/$1 permanent;
}
```

✅ 说明：可实现 URL 重定向、伪静态等功能。

## 6. SSL 配置

### 6.1 ssl_certificate 与 ssl_certificate_key

- **作用**：配置 SSL 证书和私钥路径。
- **示例**：

```nginx
ssl_certificate /etc/nginx/ssl/example.crt;
ssl_certificate_key /etc/nginx/ssl/example.key;
```

### 6.2 ssl_protocols

- **作用**：限制支持的 TLS/SSL 协议版本。
- **示例**：

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

### 6.3 ssl_ciphers

- **作用**：指定加密套件。
- **示例**：

```nginx
ssl_ciphers HIGH:!aNULL:!MD5;
```

### 6.4 ssl_prefer_server_ciphers

- **作用**：优先使用服务器端配置的加密套件。
- **示例**：

```nginx
ssl_prefer_server_ciphers on;
```

## 7. 缓存控制（静态资源缓存）

### 7.1 expires

- **作用**：设置 HTTP 响应头中的缓存过期时间。
- **示例**：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    access_log off;
}
```

### 7.2 add_header Cache-Control

- **作用**：添加自定义缓存控制头部。
- **示例**：

```nginx
add_header Cache-Control "public, max-age=86400";
```

## 8. 负载均衡配置

### 8.1 upstream

- **作用**：定义后端服务器池，配合 proxy_pass 使用。
- **支持策略**：round-robin（默认）、least_conn、ip_hash
- **示例**：

```nginx
upstream backend {
    server 192.168.1.10;
    server 192.168.1.11;
}
server {
    location / {
        proxy_pass http://backend;
    }
}
```

### 8.2 ip_hash

- **作用**：根据客户端 IP 将请求固定转发至某台服务器。
- **示例**：

```nginx
upstream backend {
    ip_hash;
    server 192.168.1.10;
    server 192.168.1.11;
}
```

## 9. 限速限流配置

### 9.1 limit_conn_zone 与 limit_conn

- **作用**：限制并发连接数。
- **示例**：

```nginx
http {
    limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
    server {
        limit_conn conn_limit_per_ip 1;
    }
}
```

### 9.2 limit_req_zone 与 limit_req

- **作用**：限制请求速率。
- **示例**：

```nginx
http {
    limit_req_zone $binary_remote_addr zone=req_limit_per_ip:10m rate=1r/s;
    server {
        location /api/ {
            limit_req zone=req_limit_per_ip burst=5 nodelay;
        }
    }
}
```

## 10. 日志配置

### 10.1 access_log

- **作用**：设置访问日志文件路径和格式。
- **示例**：

```nginx
access_log /var/log/nginx/access.log main;
```

### 10.2 log_format

- **作用**：自定义日志格式。
- **示例**：

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for"';
```

## 11. 安全设置（推荐）

### 11.1 禁止访问隐藏文件

- **作用**：如 .git、.env 文件的访问控制。
- **示例**：

```nginx
location ~ /\. {
    deny all;
}
```

### 11.2 隐藏服务器版本信息

- **作用**：提高安全性。
- **示例**：

```nginx
server_tokens off;
```

## 12. 常用重定向示例

### 12.1 永久重定向（301）

- **示例**：
<!-- 
```nginx
location /old-path/ {
    return 301 /new-path/;
}
``` -->

### 12.2 临时重定向（302）

- **示例**：

```nginx
location /test/ {
    return 302 https://www.example.com/;
}
```


## 13. WebSocket 支持

### 13.1 基础配置

WebSocket 使用 HTTP 协议升级机制，因此 Nginx 需要正确转发 Upgrade 和 Connection 头。

```nginx
location /ws/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

## 14. 跨域 CORS 配置

### 14.1 允许跨域请求（通配）

```nginx
location /api/ {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization';
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

⚠️ 注意事项：
实际部署时请将 '*' 改为具体域名；
OPTIONS 请求必须正确响应 204，否则浏览器会报错。

## 15. 与前端框架集成部署（Vue / React / Angular）

### 15.1 单页应用（SPA）前端路由配置

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

✅ 说明：
try_files $uri $uri/ /index.html; 确保前端路由能 fallback 到 index.html

## 16. URL 重写与正则匹配（rewrite）

### 16.1 重写路径

```nginx
location /old/ {
    rewrite ^/old/(.*)$ /new/$1 permanent;
}
```

### 16.2 常见 rewrite 规则

```nginx
# 非 www 跳转到 www :
rewrite ^/(.*)$
rewrite ^/(.*)$ URL_ADDRESS.example.com/$1 permanent;
# 强制 HTTPS
if ($scheme = http) { return 301 https://$host$request_uri;
```

## 17. Nginx + Lua（简要）

借助 OpenResty 或 ngx_http_lua_module 模块，Nginx 可嵌入 Lua 脚本实现动态逻辑。

### 17.1 示例：请求日志打印

```nginx
location /lua {
    content_by_lua_block {
        ngx.say("Client IP: ", ngx.var.remote_addr)
    }
}
```

应用场景：

- 鉴权逻辑
- 自定义 WAF
- 动态路由分发
  
## 18. Nginx 与 Docker 配置

### 18.1 Dockerfile（示例）

```dockerfile
FROM nginx:alpine
COPY ./dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf
```

### 18.2 docker-compose.yml（简例）

```yaml
version: '3'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf
```

## 19. 性能优化建议

| 项目                | 建议                                   |
|---------------------|----------------------------------------|
| worker_processes    | 设置为 auto                            |
| worker_connections  | 根据负载设置为 1024+                   |
| gzip                | 启用压缩（注意类型匹配）               |
| keepalive_timeout   | 设置为合适时间，如 65 秒               |
| access_log          | 对静态资源关闭日志，加快处理速度        |
| 静态资源缓存        | 设置 expires 和 Cache-Control           |
