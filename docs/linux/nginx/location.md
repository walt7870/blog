# location 匹配规则详解

## 1. 前缀匹配（Prefix Matching）

前缀匹配是最简单的匹配方式，它基于 URI 的前缀进行匹配。

### 1.1 精确匹配

如果 URI 完全等于指定的前缀，则匹配成功。

```nginx
location = /exact {
    # 只匹配精确的 URI "/exact"
}
```

**✅说明：**

- 请求 /exact 会匹配到这个 location。
- 请求 /exact/path 不会匹配。

### 1.2 前缀匹配

如果 URI 以指定的前缀开头，则匹配成功。

```nginx
location /prefix {
    # 匹配以 "/prefix" 开头的 URI
}
```

**✅说明：**

- 请求 /prefix 会匹配到这个 location。
- 请求 /prefix/path 也会匹配。

### 1.3 前缀匹配（最长匹配）

如果有多个前缀匹配规则，Nginx 会选择最长的匹配规则。

```nginx
location / {
    # 匹配所有 URI
}

location /api {
    # 匹配以 "/api" 开头的 URI
}

location /api/v1 {
    # 匹配以 "/api/v1" 开头的 URI
}
```

**✅说明：**

- 请求 /api 会匹配到 location /api。
- 请求 /api/v1 会匹配到 location /api/v1。
- 请求 /api/v1/resource 也会匹配到 location /api/v1。
- 请求 / 会匹配到 location /。

## 2. 正则表达式匹配（Regular Expression Matching）

正则表达式匹配允许使用正则表达式来匹配 URI，提供了更强大的匹配能力。

### 2.1 普通正则表达式

使用正则表达式匹配 URI。

```nginx
location ~ ^/regex/ {
    # 匹配以 "/regex/" 开头的 URI
}
```

**✅说明：**

- 请求 /regex/path 会匹配到这个 location。
- 请求 /regex/ 也会匹配。

### 2.2 普通正则表达式（区分大小写）

默认情况下，正则表达式匹配是区分大小写的。

```nginx
location ~ ^/regex/ {
    # 匹配以 "/regex/" 开头的 URI，区分大小写
}
```

**✅说明：**

- 请求 /regex/path 会匹配到这个 location。
- 请求 /REGEX/path 不会匹配。

### 2.3 普通正则表达式（不区分大小写）

使用 ~* 使正则表达式匹配不区分大小写。

```nginx
location ~* ^/regex/ {
    # 匹配以 "/regex/" 开头的 URI，不区分大小写
}
```

**✅说明：**

- 请求 /regex/path 会匹配到这个 location。
- 请求 /REGEX/path 也会匹配。

### 2.4 普通正则表达式（匹配文件扩展名）

常用场景是根据文件扩展名匹配请求。

```nginx
location ~* \.(jpg|jpeg|png|gif)$ {
    # 匹配以 .jpg、.jpeg、.png 或 .gif 结尾的文件
}
```

**✅说明：**

- 请求 /images/photo.jpg 会匹配到这个 location。
- 请求 /images/photo.JPG 也会匹配（因为使用了 ~*）。

## 3. 特殊匹配规则

### 3.1 @ 命名位置

@ 用于定义命名位置，通常用于 try_files 或 error_page 的内部跳转。

```nginx
location / {
    try_files $uri $uri/ @fallback;
}

location @fallback {
    # 处理未找到文件的情况
    proxy_pass http://backend_server;
}
```

**✅说明：**

- 请求 /path 如果没有找到对应的文件，会跳转到 location @fallback。

### 3.2 = 精确匹配

= 用于精确匹配 URI，要求 URI 完全一致。

```nginx
location = /exact {
    # 只匹配精确的 URI "/exact"
}
```

**✅说明：**

- 请求 /exact 会匹配到这个 location。
- 请求 /exact/path 不会匹配。

### 3.3 ^~ 前缀匹配（优先级高

^~ 用于前缀匹配，但优先级高于正则表达式匹配。

```nginx
location ^~ /static/ {
    # 匹配以 "/static/" 开头的 URI，优先级高于正则表达式
}
```

**✅说明：**

- 请求 /static/file 会匹配到这个 location，即使有其他正则表达式匹配规则。

## 4. 匹配优先级

Nginx 的 location 匹配规则有明确的优先级顺序：

1. 精确匹配（=）：最高优先级
2. 正则表达式匹配：按出现顺序匹配，第一个匹配的规则生效
3. 前缀匹配（^~）：优先级高于普通前缀匹配
4. 普通前缀匹配：最长匹配优先
5. 默认匹配（/）：如果没有其他匹配规则，最后匹配默认的 location /

## 5. 实际应用说明

### 5.1 静态文件和 API 请求

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/html;

    # 静态文件
    location /static/ {
        # 匹配以 "/static/" 开头的 URI
        try_files $uri =404;
    }

    # API 请求
    location /api/ {
        # 匹配以 "/api/" 开头的 URI
        proxy_pass http://backend_api_server;
    }

    # 默认页面
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.2 文件扩展名匹配

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/html;

    # 匹配图片文件
    location ~* \.(jpg|jpeg|png|gif)$ {
        # 设置缓存头
        expires 30d;
    }

    # 匹配 CSS 和 JS 文件
    location ~* \.(css|js)$ {
        # 设置缓存头
        expires 1h;
    }

    # 默认页面
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.3 命名位置用于错误处理

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/html;

    # 默认页面
    location / {
        try_files $uri $uri/ @fallback;
    }

    # 命名位置：处理未找到文件的情况
    location @fallback {
        proxy_pass http://backend_server;
    }
}
```
