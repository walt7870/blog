# 镜像与私有源

包管理器本身只负责安装依赖，依赖从哪里下载由 registry 决定。国内团队通常会配置公共镜像、企业私有 npm 仓库或制品库代理，以提高安装速度、隔离外网波动，并控制私有包访问权限。

![公共包、私有scope与仓库凭证的请求边界](/front/package-managers/registry-scope.svg)

## 公共镜像

项目级 `.npmrc`：

```ini
registry=https://registry.npmmirror.com
```

npm、pnpm及Bun可使用对应npm配置能力，现代Yarn使用`.yarnrc.yml`。按实际工具核对，不能因一次成功就认定都经过新镜像；锁中解析地址、scope和缓存均会影响请求。

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

现代Yarn对应配置：

```yaml
npmRegistryServer: "https://registry.npmjs.org"
npmScopes:
  company:
    npmRegistryServer: "https://npm.company.com"
    npmAlwaysAuth: true
    npmAuthToken: "${NPM_TOKEN}"
```

凭证只绑定目标仓库，不关闭TLS检查解决证书问题。企业代理需要正确证书链或CA配置。scope也不自动杜绝依赖混淆，应限制仓库回退并验证内部包解析到预期仓库。

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

`publishConfig`提供目标约束，仍须检查命令覆盖参数和CI配置。内部应用不应发布时设置`private: true`。可发布库先用`npm pack --dry-run`检查文件，确认没有`.env`、令牌或业务数据，再准备发布。只读安装令牌与发布令牌分开。

## CI 安装

CI可提交仅含变量占位的项目`.npmrc`，运行时注入变量，无需把明文令牌写入项目文件：

```ini
registry=https://registry.npmmirror.com
@company:registry=https://npm.company.com
//npm.company.com/:_authToken=${NPM_TOKEN}
```

```bash
pnpm install --frozen-lockfile
```

CI以受保护变量注入`NPM_TOKEN`，日志不打印整份环境和认证配置。镜像构建采用秘密挂载，不能将令牌写入镜像层再删除。示例仓库只是配置占位，验证时不向其发送请求或执行真实发布。

## 排查

| 现象 | 检查点 |
| --- | --- |
| 公共包下载慢 | registry 是否生效，CI 是否走代理出口 |
| 私有包 401 | token 是否过期，scope registry 是否匹配 |
| 私有包 404 | 包名 scope、版本号、发布仓库是否正确 |
| 本地成功 CI 失败 | CI 是否注入 `.npmrc` 和 `NPM_TOKEN` |
| 误发公共源 | `publishConfig.registry` 是否配置 |
| 依赖审计缺失 | 是否统一经过企业制品库代理 |
