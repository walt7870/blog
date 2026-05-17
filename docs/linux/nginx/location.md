# location 匹配

`location` 决定某个 URI 进入 Nginx 后由哪段配置处理。它是 Nginx 最容易误解的部分：不是谁写在前面谁生效，也不是最长前缀永远优先。

可以把 `location` 匹配理解成分诊：先看有没有完全相同的专用窗口，再看有没有明确声明“不再走正则”的前缀窗口，之后才轮到正则窗口，最后用普通最长前缀兜底。

![Nginx location 匹配优先级](/nginx/location-priority.svg)

## 基本类型

| 写法 | 类型 | 特点 |
| --- | --- | --- |
| `location = /login` | 精确匹配 | URI 完全相等才命中，命中后立即停止 |
| `location ^~ /static/` | 高优先级前缀 | 命中最长 `^~` 后跳过正则 |
| `location ~ \.php$` | 区分大小写正则 | 按配置顺序测试正则 |
| `location ~* \.(png|jpg)$` | 不区分大小写正则 | 常用于扩展名 |
| `location /api/` | 普通前缀 | 记录最长匹配，但可能被正则覆盖 |
| `location @fallback` | 命名位置 | 不能被外部 URI 直接访问，常用于内部跳转 |

## 匹配顺序

Nginx 对一个 URI 的选择过程可以简化为：

1. 先检查 `=` 精确匹配；命中就直接使用。
2. 找到最长前缀匹配。
3. 如果最长前缀带 `^~`，直接使用它，不再检查正则。
4. 否则按配置顺序检查正则 `~`、`~*`；第一个命中的正则生效。
5. 如果没有正则命中，使用第 2 步记录的最长普通前缀。

最容易踩坑的是第 4 步：普通最长前缀可能被后面的正则覆盖。

## 例子：API 与静态资源

```nginx
server {
    listen 80;
    server_name example.com;

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:8080;
    }

    location ~* \.(js|css|png|jpg)$ {
        root /var/www/static;
        expires 30d;
    }

    location / {
        root /var/www/app;
        try_files $uri $uri/ /index.html;
    }
}
```

这段配置里：

- `/api/users` 命中 `^~ /api/`，不会再进入正则。
- `/assets/app.js` 命中静态资源正则。
- `/profile` 命中 `/`，最终回退到 `index.html`。

如果把 `/api/` 写成普通前缀，且请求路径看起来像静态扩展名，就可能被正则抢走。

## `root` 与 `alias`

`root` 是把 URI 追加到根目录后面；`alias` 是把匹配前缀替换成指定目录。

```nginx
location /static/ {
    root /var/www;
}
```

访问 `/static/logo.png` 时，实际路径是：

```text
/var/www/static/logo.png
```

```nginx
location /static/ {
    alias /data/assets/;
}
```

访问 `/static/logo.png` 时，实际路径是：

```text
/data/assets/logo.png
```

`alias` 结尾斜杠和 `location` 前缀要配套，否则路径拼接很容易出错。

## `try_files`

`try_files` 用来按顺序尝试文件路径，找不到时回退到最后一个参数。

SPA 常见写法：

```nginx
location / {
    root /var/www/app;
    try_files $uri $uri/ /index.html;
}
```

含义：

1. 先找 URI 对应文件。
2. 再找 URI 对应目录。
3. 都没有就返回 `/index.html`。

这不是“所有 404 都变成成功”。如果静态资源路径写错，也可能被回退成 HTML，导致浏览器报 JS MIME 类型错误。

## `proxy_pass` 的路径问题

`proxy_pass` 是否带 URI，会影响转发路径。

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
```

请求 `/api/users` 转给后端仍是 `/api/users`。

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080/;
}
```

请求 `/api/users` 转给后端通常会变成 `/users`。

处理接口前缀时要先确认后端是否需要保留 `/api`。路径错位是 404 和接口不通的高发原因。

## 常见场景

### 前端应用 + API

```nginx
location ^~ /api/ {
    proxy_pass http://127.0.0.1:8080;
}

location / {
    root /var/www/app;
    try_files $uri $uri/ /index.html;
}
```

`/api/` 用 `^~` 是为了避免被静态资源正则误抢。

### 禁止访问隐藏文件

```nginx
location ~ /\.(?!well-known) {
    return 404;
}
```

它用于阻止访问 `.git`、`.env` 等隐藏文件，同时保留 ACME 可能使用的 `.well-known`。

### 错误回退

```nginx
location / {
    try_files $uri @backend;
}

location @backend {
    proxy_pass http://127.0.0.1:8080;
}
```

命名 location 只能内部跳转，适合做 fallback。

## 排查路径

### 请求命中了错误 location

检查顺序：

1. 是否有 `=` 精确匹配。
2. 最长前缀是哪一个。
3. 最长前缀是否带 `^~`。
4. 是否有正则按配置顺序抢先命中。
5. 是否存在 include 引入的额外 location。

### 静态文件路径不对

重点区分 `root` 和 `alias`。把 URI 和目录手动拼一遍，通常能很快发现问题。

### API 被当成静态资源

优先给 API 前缀使用 `^~ /api/`，并把静态资源正则放在不会误伤接口的位置。

### SPA 刷新 404

需要让前端路由回退到 `index.html`，但 API 和静态资源不要被错误回退。

## 总结

`location` 的核心是选择规则。精确匹配最强，`^~` 可以阻止正则抢走请求，普通最长前缀可能被正则覆盖。排查时不要只看配置顺序，要按 Nginx 的匹配流程一步步还原 URI 最终落到哪里。
