# location 匹配与路径映射

订单接口`/api/reports/monthly.csv`虽然以`.csv`结尾，仍可能需要发给后端；静态资源`/assets/app.js`则应读文件。`location`负责按URI选择配置，随后`root`、`alias`、`proxy_pass`决定文件或上游路径。把选择规则与路径映射分开，才能解释“接口变下载文件”或“代理后多了一层目录”。

![同层精确、最长前缀与正则的location决策流程](/nginx/location-priority.svg)

本页用Linux上Nginx 1.22可运行的传统字符串与正则规则说明；图示限定同一层、不嵌套且无其他扩展匹配形式。更高版本新增语法需核对实际二进制，不能把本图当作所有版本与嵌套结构的完整算法。

## 先看匹配对象与同层选择顺序

匹配对象是规范化后的URI路径，涉及百分号解码、相对路径处理及默认的连续斜杠合并；查询参数不参与常规location路径匹配。`/api/orders?format=csv`的`.csv`参数不会让扩展名正则命中。原始请求`$request_uri`与可被内部跳转修改的`$uri`也不是同一个值。

同层精确`=`命中即结束；否则记录最长匹配前缀。只有**这个最长前缀**带`^~`时才跳过该层正则，不是任意一个较短的`^~`命中就能保护所有子路径。未跳过时按配置出现顺序测试`~`与`~*`，第一个命中的正则生效；都不命中才使用记住的最长前缀。

`~`区分大小写，`~*`不区分；正则不会自动选“更长或更具体”的那个。`@fallback`是内部命名位置，不参与外部路径的普通匹配，也不是可供浏览器直接访问的地址。

以下站点仅返回标签，便于在测试环境观察选择结果：

```nginx
server {
    listen 8089;
    server_name location.example.com;
    default_type text/plain;

    location = /api/orders { return 200 "exact\n"; }
    location ^~ /api/      { return 200 "api-prefix\n"; }
    location /reports/    { return 200 "reports-prefix\n"; }
    location ~* \.(csv|js)$ { return 200 "extension-regex\n"; }
    location /            { return 200 "fallback-prefix\n"; }
}
```

| 请求路径 | 应返回的标签与原因 |
| --- | --- |
| `/api/orders?format=csv` | `exact`，参数不影响精确路径 |
| `/api/report.csv` | `api-prefix`，最长前缀的`^~`阻止正则 |
| `/reports/month.csv` | `extension-regex`，普通最长前缀被正则覆盖 |
| `/reports/month` | `reports-prefix`，无正则命中 |
| `/other` | `fallback-prefix`，使用`/` |

把这些请求用`curl -H 'Host: location.example.com'`发到测试监听端口，核对标签；改回生产配置时删除诊断返回。嵌套location还涉及逐层搜索与外层正则：内层`^~`不能概括为跳过所有祖先层正则。优先把关键入口保持在清晰同层结构，需要嵌套时以最小配置复现真实URI，不能直接套同层口诀。

## root与alias改变的是磁盘路径

普通前缀`location /static/ { root /srv/www; }`把URI追加在根后，`/static/logo.png`对应`/srv/www/static/logo.png`。改为`alias /data/assets/;`则替换匹配前缀，同一请求对应`/data/assets/logo.png`。

```nginx
location /downloads/ {
    alias /srv/releases/;
}
```

这里配对的尾部斜杠是路径合同的一部分。正则location使用alias时需要相应捕获和显式映射，不能照搬普通前缀的替换理解。权限、符号链接、文件系统与访问控制仍单独生效；路径算对不代表worker能读取。不要把含密钥、源码或`.git`的目录作为公开root，再依赖一条扩展名正则补救。

## try_files的最后一项可能重新选择位置

`try_files $uri $uri/ /index.html`先按当前`root/alias`检查文件和目录，末项`/index.html`是内部跳转URI；`=404`则直接结束为404。内部跳转可能改变`$uri`并重新匹配location，`index`也可能触发相同现象，不能只看第一次命中。

```nginx
location ^~ /assets/ {
    try_files $uri =404;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

此片段需要在server中设置实际root，且入口文件存在。订单详情作为SPA路由可以回退，丢失的JS必须404，否则浏览器拿到HTML会报MIME或语法错误。末项指向不存在的入口还可能造成内部跳转循环；API也不应落入页面回退。

## proxy_pass按是否包含URI决定替换

对普通前缀且没有额外rewrite、变量的场景：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8080;
}
```

请求`/api/orders?limit=2`保留`/api/orders?limit=2`转发。若改为`proxy_pass http://127.0.0.1:8080/;`，配置含URI`/`，匹配前缀被替换，上游收到`/orders?limit=2`；若URI是`/internal/`则变为`/internal/orders?limit=2`。这关乎后端路由合同，不是“末尾加斜杠更规范”。

正则与命名location中不能套用普通前缀的URI替换，应使用不含URI的proxy_pass。变量或`rewrite ... break`会改变规则，也必须单独验证。以斜杠结尾并使用代理的前缀还可能把缺少斜杠的路径重定向，例如`/api`到`/api/`；不能假定两个地址总返回相同状态。

## location不是独立的安全边界

常见隐藏文件规则`location ~ /\.(?!well-known)`有两个局限：负向判断会放过`.well-known-other`等相似名字，其他`^~`入口也可能跳过这条正则。HTTP-01只需要相应挑战路径，不必笼统放行所有隐藏目录；DNS-01根本不依赖Web挑战目录。

静态部署优先让公开目录只包含允许发布的产物，再按需要精确放行挑战前缀并拒绝其余隐藏路径。鉴权和访问限制要放在实际会处理请求的位置，核对include、嵌套与内部跳转，不能认为另一个正则已经替所有入口拦截。

排错时保留原始URL、Host、规范化URI、匹配规则、最终文件/上游路径及响应状态。先用`nginx -T`还原加载配置，再用最小标签实验区分“选错位置”和“位置正确但路径错”，最后检查文件、后端和内部跳转。完整入口验收见[Nginx请求入口](./nginx.md)。
