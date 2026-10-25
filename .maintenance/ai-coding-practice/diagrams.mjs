// Generates the SVG figures for docs/ai/ai-coding-practice/. Run: node .maintenance/ai-coding-practice/diagrams.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../../public/ai/ai-coding-practice/', import.meta.url);
mkdirSync(out, { recursive: true });

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";

function svg(id, w, h, title, desc, heading, sub, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc" id="${id}-root">
<title id="${id}-title">${esc(title)}</title>
<desc id="${id}-desc">${esc(desc)}</desc>
<defs><style>
#${id}-root text { font-family: ${font}; fill: #172b3a; }
#${id}-root .h { font-size: 26px; font-weight: 700; }
#${id}-root .t { font-size: 19px; font-weight: 600; }
#${id}-root .s { font-size: 15px; fill: #475569; }
#${id}-root .k { font-size: 13px; font-weight: 700; letter-spacing: .04em; fill: #64748b; }
#${id}-root .node { fill: #fff; stroke: #cbd5e1; stroke-width: 2; }
#${id}-root .blue { fill: #eff6ff; stroke: #60a5fa; stroke-width: 2; }
#${id}-root .green { fill: #ecfdf5; stroke: #20a28c; stroke-width: 2; }
#${id}-root .red { fill: #fff1f2; stroke: #e88191; stroke-width: 2; }
#${id}-root .amber { fill: #fffbeb; stroke: #e0a63a; stroke-width: 2; }
#${id}-root .violet { fill: #f5f3ff; stroke: #9b87f5; stroke-width: 2; }
#${id}-root .edge { fill: none; stroke: #64748b; stroke-width: 2; marker-end: url(#${id}-arrow); }
#${id}-root .dash { fill: none; stroke: #94a3b8; stroke-width: 2; stroke-dasharray: 7 6; marker-end: url(#${id}-arrow); }
#${id}-root .line { stroke: #cbd5e1; stroke-width: 1.5; }
</style><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker></defs>
<rect width="${w}" height="${h}" fill="#f8fafc"/>
<text x="32" y="46" class="h">${esc(heading)}</text>
<text x="32" y="78" class="s">${esc(sub)}</text>
${body}
</svg>
`;
}

// A box with a title line and optional sub lines; `node` names the group so tests can find it.
function box(node, x, y, w, h, cls, title, lines = [], kicker) {
  let ty = y + (kicker ? 52 : 36);
  let t = `<g data-node="${node}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>`;
  if (kicker) t += `<text x="${x + 18}" y="${y + 26}" class="k">${esc(kicker)}</text>`;
  t += `<text x="${x + 18}" y="${ty}" class="t">${esc(title)}</text>`;
  lines.forEach((l, i) => { t += `<text x="${x + 18}" y="${ty + 28 + i * 23}" class="s">${esc(l)}</text>`; });
  return t + '</g>';
}
const edge = (d, cls = 'edge') => `<path d="${d}" class="${cls}"/>`;
const label = (x, y, text, w) => `<rect x="${x - 6}" y="${y - 18}" width="${w ?? text.length * 15 + 12}" height="26" rx="4" fill="#f8fafc"/><text x="${x}" y="${y}" class="s">${esc(text)}</text>`;

const figures = {
  'series-map': svg('series-map', 960, 520, '实战手记六篇的阅读路线', '从认识 Agent 的工作循环开始，依次讲多会话分工、规则与授权、验证证据、出错复盘和任务选择，每篇都基于真实项目经验。',
    '六篇文章，沿一次任务的生命周期展开', '先认识工具，再看怎样分工、立规矩、验收、复盘，最后决定什么活交出去。',
    [
      box('01', 32, 120, 280, 136, 'blue', '它怎么干活', ['补全、对话到 Agent', '读、改、跑、看结果的循环'], '01'),
      box('02', 340, 120, 280, 136, 'node', '多会话怎样分工', ['一项目一会话', '交接文档与知识笔记'], '02'),
      box('03', 648, 120, 280, 136, 'node', '给它立规矩', ['仓库规则、技能', '一次授权只管一件事'], '03'),
      box('04', 648, 328, 280, 136, 'green', '让它拿出证据', ['测试、浏览器、线上回读', '每份证据写明范围'], '04'),
      box('05', 340, 328, 280, 136, 'red', '出错以后', ['误判回滚、过度宣称', 'AI 审查门禁的取舍'], '05'),
      box('06', 32, 328, 280, 136, 'amber', '什么活交出去', ['按可验证、可撤回', '划分人和 Agent 的分工'], '06'),
      edge('M312 188H340'), edge('M620 188H648'), edge('M788 256V328'), edge('M648 396H620'), edge('M340 396H312'),
    ].join('\n')),

  'agent-loop': svg('agent-loop', 960, 600, 'Coding Agent 的工作循环', '人给出任务和边界，Agent 反复读取仓库、修改文件、运行命令并读取结果，失败就回到计划，通过后带着证据交付，由人审查和授权。',
    'Agent 和补全工具的差别：它会自己跑命令、看结果', '模型负责判断下一步，工具负责真的执行；人守住目标、权限和最后的确认。',
    [
      box('task', 32, 128, 220, 112, 'amber', '人：任务与边界', ['目标、范围、验收', '哪些操作要先问']),
      box('read', 320, 128, 220, 112, 'node', '读', ['仓库、文档、日志', '交接笔记']),
      box('edit', 608, 128, 220, 112, 'node', '改', ['编辑文件', '写测试、脚本']),
      box('run', 608, 320, 220, 112, 'blue', '跑', ['构建、测试、浏览器', '查询服务状态']),
      box('check', 320, 320, 220, 112, 'blue', '看结果', ['对照验收条件', '失败就找原因']),
      box('deliver', 32, 320, 220, 112, 'green', '交付与证据', ['改了什么、跑了什么', '还没验证什么']),
      edge('M252 184H320'), edge('M540 184H608'), edge('M718 240V320'), edge('M608 376H540'),
      edge('M430 320V240', 'dash'), label(440, 288, '未通过：回到读和改', 168),
      edge('M320 376H252'), label(262, 360, '通过', 44),
      `<path d="M32 488H928" class="line"/>`,
      `<text x="32" y="524" class="s">循环里的每一步都受权限约束：读和本地测试通常放开，推送、发布、改线上数据要等人确认。</text>`,
      `<text x="32" y="552" class="s">人审查的对象是证据和改动范围，而不是 Agent 的自我评价。</text>`,
    ].join('\n')),

  'memory-layers': svg('memory-layers', 960, 630, '多会话协作的四层记忆', '会话上下文只活在当前对话里；仓库内的规则和交接文档随 git 跨机器、跨工具；本机知识笔记沉淀跨项目经验；个人记忆只保存偏好和指针。',
    '会话会结束，事实要写到比会话活得久的地方', '四层各管一段寿命；每层只放适合它的东西，密钥哪层都不放。',
    [
      box('session', 32, 112, 896, 100, 'node', '会话上下文', ['本次对话读过的文件和结论；上下文压缩后细节会丢'], '活到会话结束'),
      box('repo', 32, 224, 896, 100, 'blue', '仓库内：AGENTS.md、HANDOFF.md、验收文档', ['跟着 git 走，换电脑、换 Claude / Codex 都能读到；交接写“结论、位置、待办”'], '跟随仓库'),
      box('notes', 32, 336, 896, 100, 'green', '本机知识笔记：INDEX + 主题笔记', ['跨项目的部署、交付经验；最新状态写在前面并带日期，旧结论标为历史'], '跨项目'),
      box('memory', 32, 448, 896, 100, 'violet', '个人记忆', ['偏好、红线和指针：指向仓库文档或知识笔记，不重复事实'], '跨会话'),
      `<text x="32" y="596" class="s">会话收尾前把新结论写回仓库或笔记；下一个会话先读 INDEX 和 HANDOFF，再核对线上现状。</text>`,
    ].join('\n')),

  'rule-layers': svg('rule-layers', 960, 560, '规则从全局到单次授权的四层', '全局规则约束所有项目，仓库规则写项目红线，技能封装可复用的做法，单次授权只针对一个具体操作，不能外推到下一次。',
    '规则分四层：越往下越具体，也越短命', '上层回答“永远不做什么”，下层回答“这一次可以做什么”。',
    [
      box('global', 32, 116, 430, 184, 'node', '全局规则', ['任何界面改动先过设计底线', '不在笔记里存密钥', '先读知识索引，再核对现状'], '所有项目'),
      box('repo', 498, 116, 430, 184, 'blue', '仓库 AGENTS.md', ['改生产前只读核对目标', '不 git clean / reset 工作区', '同一检查失败三次就停下分析'], '一个项目'),
      box('skill', 32, 328, 430, 184, 'green', '技能 Skill', ['界面设计、图示、交付手册', '同一份技能软链给多个 Agent', '按任务加载，不常驻上下文'], '一类任务'),
      box('grant', 498, 328, 430, 184, 'amber', '单次授权', ['“合并这个 MR”', '只管这一个 MR、这一台机器', '下一次要重新问'], '一个操作'),
    ].join('\n')),

  'evidence-ladder': svg('evidence-ladder', 960, 600, '验证证据的五级台阶', '能编译、单元测试、模拟集成、真实服务调用、线上回读逐级证明更多事情；每份证据要写明它站在哪一级。',
    '证据有高低：先说清这份证据证明到哪一级', '越往右越接近用户真实看到的结果，成本和风险也越高。',
    [
      box('build', 32, 392, 168, 128, 'node', '能编译', ['语法与依赖', '能打出包']),
      box('unit', 214, 336, 168, 184, 'node', '单元测试', ['函数和状态', '边界条件', '失败用例']),
      box('mock', 396, 280, 168, 240, 'blue', '模拟集成', ['夹具、Mock', '本地浏览器', '协议往返', '标明是模拟']),
      box('real', 578, 224, 168, 296, 'green', '真实调用', ['真实服务', '真实设备', '真实音频', '有限样本', '写明环境']),
      box('prod', 760, 168, 168, 352, 'green', '线上回读', ['发布后用', '业务路径', '读回结果', '对比发布前', '记录时间', '保留回滚']),
      `<text x="32" y="560" class="s">“SKIP 不算通过”：跳过的检查要单独列出，不能并进通过数。</text>`,
    ].join('\n')),

  'outage-chain': svg('outage-chain', 960, 620, '验收脚本误判引发的连锁回滚', '验收脚本把尚未就绪的 ready=None 当成失败，触发模型回滚，回滚连续重启撞上 systemd 启动次数上限，服务中断约 13 分钟；改进措施分别切断三处传播。',
    '一次约 13 分钟的中断：错误怎样一步步放大', '每个环节单独看都“按规则执行”，问题在于判断条件和回滚范围。',
    [
      box('check', 32, 120, 200, 136, 'amber', '验收脚本', ['把 ready=None', '当作失败']),
      box('rollback', 264, 120, 200, 136, 'red', '触发回滚', ['网关检查失败', '连模型一起回滚']),
      box('restart', 496, 120, 200, 136, 'red', '连续重启', ['撞上 systemd', 'StartLimitBurst']),
      box('down', 728, 120, 200, 136, 'red', '服务不可用', ['中断约 13 分钟', '启动保护生效']),
      edge('M232 188H264'), edge('M464 188H496'), edge('M696 188H728'),
      box('fix1', 32, 328, 280, 152, 'green', '先演练验收脚本', ['停服务前，对线上', '只读跑一遍检查', '确认判断条件'], '改进 1'),
      box('fix2', 340, 328, 280, 152, 'green', '回滚只动出错的部分', ['网关检查失败', '只回滚网关', '模型保持不动'], '改进 2'),
      box('fix3', 648, 328, 280, 152, 'green', '启动前清状态', ['先 reset-failed', '同时检查 is-active', '和 ready'], '改进 3'),
      edge('M132 256V328', 'dash'), edge('M364 256V328', 'dash'), edge('M596 256Q596 292 760 292Q788 292 788 328', 'dash'),
      `<text x="32" y="540" class="s">脚本由 Agent 编写和执行；改进以后写进项目交接文档，后续会话按新流程发布。</text>`,
    ].join('\n')),

  'task-quadrant': svg('task-quadrant', 960, 640, '按可验证和可撤回划分任务', '横轴是结果能否被测试或回读证明，纵轴是操作能否撤回；两者都高的交给 Agent，难验证且难撤回的由人主导。',
    '两个问题决定交给谁：能不能验证，能不能撤回', '交出去之前先问：做错了，我们多快能发现，又能不能退回去？',
    [
      `<path d="M120 576H912" class="edge"/><path d="M120 576V112" class="edge"/>`,
      `<text x="700" y="610" class="s">结果容易验证 →</text>`,
      `<text x="20" y="128" class="s">容易</text><text x="20" y="150" class="s">撤回</text>`,
      box('q1', 528, 120, 384, 208, 'green', '交给 Agent 做完', ['重构、补测试、写脚本', '文档、页面、图示', '有测试和截图兜底'], '可验证 · 可撤回'),
      box('q2', 136, 120, 376, 208, 'blue', 'Agent 探索，人来判断', ['界面风格、方案对比', '写作口吻、命名', '多给几个选项'], '难验证 · 可撤回'),
      box('q3', 528, 344, 384, 208, 'amber', 'Agent 准备，人批准', ['生产发布、数据迁移', '升级、合并到主干', '先只读核对，再单次授权'], '可验证 · 难撤回'),
      box('q4', 136, 344, 376, 208, 'red', '人主导', ['客户沟通、对外发送', '授权与凭据、架构取舍', 'Agent 起草，人发出'], '难验证 · 难撤回'),
    ].join('\n')),
};

for (const [name, content] of Object.entries(figures)) writeFileSync(new URL(`${name}.svg`, out), content);
console.log(`wrote ${Object.keys(figures).length} figures`);
