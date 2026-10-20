# 前端应用工程六页审查

完整阅读前端总览、状态管理1017行、质量600行、测试448行、性能350行及部署289行。逐页重写干涩内容与不完整示例，沿订单页面说明对象关系、失败方式与验证，补六张SVG。状态页不再按应用大小机械选库；测试页取消固定比例；性能页改INP；质量页使用当前ESLint10配置；部署页保护旧标签页与子路径资源。

`verify-frontend-engineering.mjs`：正文金额测试正常/坏值/溢出通过，故意改乘为加测试失败；ESLint10.13.0与@eslint/js10.0.1配置正反例、Prettier3格式失败/修复/通过、Stylelint16正确/错误属性通过；正文Pinia3 store正常3980分/非法数量/重置通过；TanStack Query5核心租户键隔离/精确失效/清空通过，不冒称正文React Hook真实接口集成。隔离本机Nginx1.31.6校验配置、深层SPA刷新、缺失asset404、旧chunk MIME与immutable、config.js no-cache、API尾斜线路径及308通过，服务器与上游均已停止，无Docker或线上变更。

官方资料保存于`evidence/frontend-engineering/`：Web Vitals实际浏览器阈值、第75百分位与INP说明；Husky init；Recoil Jan 1 2025归档；ESLint配置与TanStack默认值关键章节。长ESLint资料截断，仅核对使用到的配置部分。首次安装ESLint9提示停止维护后改10并重跑成功。

构建第一次在渲染时缺失共享`.vitepress/.temp`模块，同期另一构建清理了共享临时目录；顺序重跑14.13秒成功，无放宽构建检查。六页24份明暗/桌面1280/390iframe窄屏全文截图、12组原尺寸/退出、6次分页通过；六图self_check及实际中文字体边界通过，五份联系表已查看。窄屏第一次因未等弹窗与frame坐标点击失败，改为等待目标h1与dialog可见、键盘激活后逐页重跑通过，不改站点功能掩盖验收问题。

累计内容完成530/603，剩73；最终共享UI仍需全603页实际逐页复验。
