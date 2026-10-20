# 前端部署

静态前端部署需要同时保证HTML入口、JS/CSS资源、路由和API合同可用。SSR应用还包含服务端运行时，不能仅复制`dist/`就视为交付完成；下文以部署在`/admin/`的订单单页应用为例。

![构建、资源发布、入口切换与旧页面恢复](/front/engineering/release-cache.svg)

## 构建与运行边界

先固定Node、安装器和锁文件，执行`npm ci`与`npm run build`。开发服务器可用不代表产物可用，应通过生产静态服务器检查实际HTML引用、分包、图片和深层路由。

Vite子路径配置：

```ts
import { defineConfig } from 'vite';

export default defineConfig({ base: '/admin/' });
```

客户端路由的base也要匹配。浏览器直接打开`/admin/orders/42`和从列表点击进入，是两条不同的验证路径；只检查首页会漏掉刷新404。VitePress等多页静态站不应直接套用SPA统一回退，需按站点实际生成路径提供文件。

`VITE_`环境变量默认在构建时进入浏览器代码，不是秘密；更改服务器环境不会自动改变旧产物。若采用启动时生成的`config.js`，先加载配置再启动应用，并及时再验证该文件。API地址可公开，密码、服务端密钥与发布令牌不能进入前端资源。

## Nginx子路径示例

假设产物完整放在`/data/www/current/admin/`，其中`assets/`只放带内容hash且不会覆盖的构建资源。普通上传图片和运行时配置不应机械使用同一长期缓存规则。

```nginx
server {
    listen 80;
    server_name admin.example.com;
    root /data/www/current;

    location = /admin {
        return 308 /admin/;
    }

    location = /admin/index.html {
        add_header Cache-Control "no-cache";
    }

    location = /admin/config.js {
        add_header Cache-Control "no-cache";
    }

    location ^~ /admin/assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location /admin/ {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /admin/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这里`proxy_pass`带尾斜线，把`/api/orders`转成上游`/orders`；去掉尾斜线会保留`/api/orders`。应与后端路由合同一致。公网入口还需正确配置HTTPS与证书，且后端只信任已知代理设置的转发头。

`no-cache`允许存储，但复用前需验证，不等于`no-store`。资源缺失必须返回404，不能把HTML回退响应发给JS模块。入口回退后还要由应用路由呈现业务404；接口错误不应落入SPA回退。

## 发布顺序与旧页面

用户在旧标签页打开订单列表，发布后才点击“导出”，浏览器可能首次请求旧版本的导出chunk。若新目录只保留新hash文件，旧标签页就会失败；仅保留旧版本目录却不再能通过原URL访问，也解决不了问题。

可以使用版本化资源URL，或在每次活动版本中保留仍在支持窗口内的旧hash资源。先上传全部不可变资源并检查可访问，再切HTML入口；清理必须晚于浏览器会话和CDN支持窗口。覆盖同名hash资源或部署时无差别`--delete`会破坏这个合同。

服务器使用`releases/<版本>/`与`current`指针时，先检查新目录完整性，在同一文件系统创建临时软链接再通过原子rename替换指针。直接`ln -sfn`不保证替换瞬间完全无间隙。只切换静态目录通常不需要重载Nginx；修改配置才需要先`nginx -t`再受控reload。

回滚同时检查HTML引用、运行时配置和API兼容性。前端切回旧版不等于后端数据模型也已回滚，发布方案必须保留兼容窗口或提供明确升级路径。

## 对象存储、CDN与容器

| 形式 | 合适场景 | 需要额外验证 |
| --- | --- | --- |
| Nginx目录 | 现有服务器、后台和文档 | 权限、深层路由、指针切换、旧资源 |
| 对象存储与CDN | 静态内容、区域分发 | MIME、缓存键、404状态、回源与刷新 |
| 静态服务器镜像 | 已有容器交付平台 | 构建运行阶段、镜像摘要、启动与回退 |
| SSR运行时 | 动态页面与服务端会话 | 请求隔离、进程健康、扩容与API边界 |

CDN刷新入口不意味着所有用户立刻更新。按版本检查响应头和实际内容，并观察边缘缓存；不能把全站404都映射为200。容器方式使用多阶段构建，Node只在静态构建阶段，选择符合项目`engines`且仍受维护的版本并固定镜像摘要；SSR则必须保留所需服务端依赖。

## CI权限与发布验收

构建任务产出带提交标识和校验值的制品，部署直接提升这份制品，不重新安装依赖生成另一份。SSH发布使用最小权限账号、受保护凭据和已核验的known_hosts；`ssh-keyscan`只能收集公钥，不能单独证明远端身份。避免把未核验扫描结果即时写入信任文件。

部署前列出线上与待发布文件集，确认没有误删仍在使用的资源。部署后等待客户端启动，验证首页、深层路由刷新、动态导入、API错误、旧标签页、缓存和回滚。HTTP200可能只是错误页或SPA空壳，不能作为唯一验收。

| 现象 | 优先检查 |
| --- | --- |
| 子路径白屏 | 构建base、路由base与HTML引用 |
| 只有刷新失败 | 生产服务器回退与实际文件布局 |
| JS返回HTML | 缺失资源错误地进入SPA回退 |
| 发布后导出失败 | 旧chunk是否仍由原URL提供 |
| 接口404 | `/api/`与proxy_pass尾斜线的重写 |
| 配置没变化 | 构建时注入还是运行时读取、缓存是否再验证 |
| 回滚仍异常 | CDN入口、资源保留、配置与后端兼容性 |

缓存与用户指标见[性能优化](../performance/)，构建与依赖合同见[包管理器](../package-managers/)；Nginx匹配机制见[location](../../../linux/nginx/location.md)。
