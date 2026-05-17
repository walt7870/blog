# 镜像与私有源

包管理器本身只负责安装依赖，依赖从哪里下载由 registry 决定。国内团队通常会配置公共镜像、企业私有 npm 仓库或制品库代理，以提高安装速度、隔离外网波动，并控制私有包访问权限。

## 公共镜像

项目级 `.npmrc`：

```ini
registry=https://registry.npmmirror.com
```

pnpm、Yarn 和 Bun 大多也能读取 npm registry 配置。团队应优先把 registry 写在项目或 CI 配置中，避免只依赖个人电脑上的全局配置。

查看当前 registry：

```bash
npm config get registry
pnpm config get registry
yarn config get npmRegistryServer
```

## 私有 scope

企业内部包建议使用 scope 区分，例如 `@company/ui`、`@company/utils`。项目 `.npmrc`：

```ini
registry=https://registry.npmmirror.com
@company:registry=https://npm.company.com
//npm.company.com/:_authToken=${NPM_TOKEN}
```

这样公共包走公共镜像，私有包走企业仓库。`NPM_TOKEN` 由 CI/CD 变量或本机安全配置注入，不写入仓库。

## 私有仓库

常见私有源方案包括 Verdaccio、Nexus Repository、JFrog Artifactory、GitLab Package Registry 和云厂商制品库。选择时重点看四个能力：上游代理、权限模型、审计日志、CI 集成。

```text
开发机 / CI
  -> 企业 npm 仓库
      -> 私有包
      -> 上游公共 registry 代理缓存
```

企业仓库最好作为统一入口，而不是每个项目各自配置不同公共镜像。这样更容易做依赖审计、恶意包拦截和缓存加速。

## 发布私有包

```bash
npm login --registry=https://npm.company.com
npm publish --registry=https://npm.company.com
```

发布前确认 `package.json`：

```json
{
  "name": "@company/ui",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://npm.company.com"
  }
}
```

`publishConfig` 可以避免误发到公共 npm registry。

## CI 安装

CI 中临时生成 `.npmrc`：

```bash
cat > .npmrc <<EOF
registry=https://registry.npmmirror.com
@company:registry=https://npm.company.com
//npm.company.com/:_authToken=${NPM_TOKEN}
EOF

pnpm install --frozen-lockfile
```

流水线结束后不需要保留 `.npmrc`。如果构建产物或镜像包含源码目录，要确认 `.npmrc` 没被打进最终产物。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 公共包下载慢 | registry 是否生效，CI 是否走代理出口 |
| 私有包 401 | token 是否过期，scope registry 是否匹配 |
| 私有包 404 | 包名 scope、版本号、发布仓库是否正确 |
| 本地成功 CI 失败 | CI 是否注入 `.npmrc` 和 `NPM_TOKEN` |
| 误发公共源 | `publishConfig.registry` 是否配置 |
| 依赖审计缺失 | 是否统一经过企业制品库代理 |
