import fs from 'node:fs';

const out = new URL('../../public/acoustics/', import.meta.url);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (x, y, s, k = 's', anchor = 'start') => `<text x="${x}" y="${y}" class="${k}" text-anchor="${anchor}">${esc(s)}</text>`;
const box = (x, y, w, h, title, lines = [], k = 'b') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" class="${k}"/>${text(x + 16, y + 32, title, 't')}${lines.map((s, i) => text(x + 16, y + 60 + i * 26, s)).join('')}`;
const edge = (d, dashed = false) => `<path d="${d}" class="e${dashed ? ' d' : ''}"/>`;
const label = (x, y, s) => `<rect x="${x - s.length * 9 - 8}" y="${y - 20}" width="${s.length * 18 + 16}" height="28" fill="white"/>${text(x, y, s, 's', 'middle')}`;
function draw(name, title, desc, h, body) {
  fs.writeFileSync(new URL(`${name}.svg`, out), `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="${h}" viewBox="0 0 1120 ${h}" role="img" aria-labelledby="${name}-title ${name}-desc"><title id="${name}-title">${esc(title)}</title><desc id="${name}-desc">${esc(desc)}</desc><defs><marker id="${name}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#52616b"/></marker><style>text{font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;fill:#17252a;letter-spacing:0}.h{font-size:26px;font-weight:600}.t{font-size:20px;font-weight:600}.s{font-size:17px;fill:#43545b}.b{fill:#edf4fa;stroke:#4280a8;stroke-width:1.5}.g{fill:#eaf5ed;stroke:#488661;stroke-width:1.5}.r{fill:#f5eef2;stroke:#a46a84;stroke-width:1.5}.e{fill:none;stroke:#52616b;stroke-width:2;marker-end:url(#${name}-arrow)}.d{stroke-dasharray:6 5}</style></defs><rect width="1120" height="${h}" fill="white"/>${text(32, 44, title, 'h')}${text(32, 78, desc)}${body()}</svg>\n`);
}

draw('structure-sound-paths', '麦克风同时收到目标人声、反射与设备自播声', '实线表示空气传播，虚线表示设备结构耦合；先对比原始分路录音，再调整算法。', 578, () =>
  edge('M256 210H824') + edge('M180 258V302Q180 310 188 310H380') +
  edge('M644 352H740Q748 352 748 344V238Q748 230 756 230H824') +
  edge('M956 392V258') + edge('M824 470H800Q792 470 792 462V282Q792 274 800 274H900Q908 274 908 266V258', true) +
  box(32, 156, 224, 102, '说话人', ['直达声随距离衰减']) +
  box(380, 284, 264, 112, '墙面与桌面', ['反射、遮挡、混响', '房间改变传播路径']) +
  box(824, 156, 264, 102, '声孔与麦克风', ['网布、密封影响频响'], 'g') +
  box(824, 392, 264, 112, '设备扬声器', ['播放声进入空气', '腔体与外壳也会振动'], 'r') +
  label(500, 196, '目标直达声') + label(956, 330, '空气回声') + label(716, 492, '结构漏音') +
  text(32, 540, '改开孔或密封后重新测频响与多麦一致性；AEC不能恢复被结构遮挡的辅音。')
);

draw('capture-playback-reference', 'AEC 需要采集 PCM，也需要完整且对齐的播放参考', '参考通常取自实际混音和音量处理之后；硬件非线性、系统旁路声与时钟漂移仍须实测。', 602, () =>
  edge('M236 180H320') + edge('M576 180H644') + edge('M856 180H940') +
  edge('M1014 230V380') + edge('M940 430H856') + edge('M644 430H576') + edge('M320 430H236') +
  edge('M448 230V292Q448 300 440 300H142Q134 300 134 308V380', true) +
  box(32, 130, 204, 100, 'TTS / 音乐 / 提示', ['所有播放源']) +
  box(320, 130, 256, 100, '混音与数字音量', ['保留对应样本时间轴'], 'g') +
  box(644, 130, 212, 100, '播放缓冲 / DAC', ['可观测排队与延迟']) +
  box(940, 130, 148, 100, '功放 / 喇叭', ['输出声波']) +
  box(940, 380, 148, 100, 'Mic / ADC', ['采集含回声']) +
  box(644, 380, 212, 100, '驱动与 DMA', ['时钟、声道、丢帧']) +
  box(320, 380, 256, 100, '有界环形缓冲', ['按样本时间戳对齐']) +
  box(32, 380, 204, 100, 'AEC', ['近端语音送后级'], 'g') +
  label(1014, 308, '空气回采') + label(290, 300, '播放参考 PCM') +
  text(32, 538, '20 ms × 5块缓冲 = 100 ms容量；它不是固定延迟，实际延迟看当前已排队样本数。') +
  text(32, 576, '例：16kHz单声道s16中，排队1600个样本占3200字节，对应100ms；溢出需显式报告。')
);

draw('engineering-deployment-choice', '先用离线边界选路线，再用目标设备决定能否交付', '同一模型的文件转写吞吐与实时交互延迟不同；以下是候选路线，最终均需回放与设备验证。', 730, () =>
  edge('M332 190H448') + edge('M332 240V448Q332 456 340 456H448') +
  edge('M724 190H824') + edge('M586 246V294') +
  edge('M724 456H824') + edge('M586 512V574') +
  box(32, 146, 300, 120, '部署边界', ['必须离线 / 禁止上传？', '还是允许远端处理？']) +
  box(448, 134, 276, 112, '本地实测是否达标？', ['内存、持续RTF、延迟', '功耗、语言与效果']) +
  box(824, 134, 264, 112, '端侧方案', ['短句与长文本均可', '能力由模型和设备决定'], 'g') +
  box(448, 294, 276, 64, '升级设备 / 降低模型规模', [], 'r') +
  box(448, 400, 276, 112, '远端候选评估', ['网络、费用、数据边界', '负载、故障与回退']) +
  box(824, 400, 264, 112, '云端 / 私有服务', ['确认数据和网络可用', '结合离线降级'], 'g') +
  box(448, 574, 640, 78, '混合方案：明确结果所有者与幂等请求', ['本地先执行后，远端补强不得重复触发同一业务。']) +
  label(390, 180, '必须') + label(336, 330, '允许上传') + label(774, 180, '达标') +
  label(586, 278, '未达标') + label(776, 446, '通过') + label(586, 554, '组合') +
  text(32, 698, '必须离线且设备不达标时，调整设备与需求；不能静默切到云端。')
);

draw('tts-acoustic-vocoder', '文本条件经过生成模型成为音频，再交给播放器', '示意常见声学特征路线；codec token等模型可能合并或替换中间阶段。', 570, () =>
  edge('M246 194H304') + edge('M528 194H588') + edge('M812 194H872') +
  edge('M980 246V350') + edge('M416 350V246', true) +
  box(32, 142, 214, 104, '文本前端 / 分句', ['数字、单位、多音字', '按可朗读边界送入']) +
  box(304, 142, 224, 104, '声学生成', ['韵律与声学特征', '可能包含内部对齐']) +
  box(588, 142, 224, 104, '声码器 / 解码器', ['特征转为波形', '按模型合同出音频']) +
  box(872, 142, 216, 104, '播放适配', ['响度、限幅、重采样', '生成有序PCM分片'], 'g') +
  box(304, 350, 224, 104, '音色与风格条件', ['参考音频或说话人ID', '具体接口依模型确定']) +
  box(872, 350, 216, 104, '播放器与设备', ['缓冲 / DAC / 喇叭', '同步送AEC参考'], 'g') +
  label(980, 306, '音频数据') + label(416, 310, '模型条件') +
  text(32, 510, '文本流式切分、模型逐块生成和播放器分片传输是三层能力，不能仅凭HTTP分块宣称模型流式。') +
  text(32, 546, '用户打断时取消生成并清空旧轮次播放队列，迟到的旧音频不再入队。')
);

draw('vad-state-flow', '分段器确认开始与结束，也必须撤销未满足条件的候选', '应用层通用四状态示意；Silero VADIterator不等同于这套带最短语音确认的完整分段器。', 600, () =>
  edge('M286 194H428') + edge('M692 194H832') + edge('M964 246V388') +
  edge('M832 444H164Q156 444 156 436V246') +
  edge('M560 142V112Q560 104 552 104H164Q156 104 156 112V142') +
  edge('M1088 444H1098Q1106 444 1106 436V202Q1106 194 1098 194H1088') +
  box(32, 142, 254, 104, '未说话 idle', ['持续保留前置缓存']) +
  box(428, 142, 264, 104, '候选语音 starting', ['累计满足起始条件']) +
  box(832, 142, 256, 104, '说话中 speech', ['确认开始，回补字头'], 'g') +
  box(832, 388, 256, 112, '候选结束 ending', ['累计低概率时长', '仍保留尾部音频']) +
  label(356, 184, 'p ≥ 起始阈值') + label(760, 184, '达到最短语音') +
  label(330, 104, '候选失败，回退') + label(964, 326, 'p < 结束阈值') +
  label(570, 444, '达到最短静音 / 输出结束，裁定片段') +
  text(310, 320, '概率恢复：撤销结束，回到说话中。', 't') +
  text(310, 354, '右侧回路表示恢复；短停顿不立即封口。') +
  text(32, 550, 'EOF：仅提交一次剩余音频；尚未结束的活动片段以真实样本长度封口，随后重置会话。') +
  text(32, 582, '最大段长、候选超时和异常断开由应用另设上限；时间戳来自采样点，不能按回调次数估计。')
);

// A topic map expresses coverage, not a fictitious serial path through physical concepts.
draw('acoustic-system-map', '声学系统的三个观察层：物理路径、数字信号和业务反馈', '分层用于定位问题；同层栏目是关注对象，不表示声音依次经过每一项。', 586, () =>
  box(32, 124, 1056, 110, '物理路径', ['说话人、房间反射  /  麦克风声孔与阵列  /  扬声器、腔体与结构漏音']) +
  edge('M560 234V290') +
  box(32, 290, 1056, 110, '数字信号', ['采集与播放时钟  /  PCM格式与有界缓冲  /  AEC、NS、AGC  /  VAD概率与边界'], 'g') +
  edge('M560 400V456') +
  box(32, 456, 1056, 98, '模型与业务', ['KWS进入交互  /  ASR转写与确认  /  业务执行  /  TTS生成与播放']) +
  label(560, 270, '换能、采样与播放') + label(560, 436, '提供稳定输入与可观测结果')
);

for (const name of fs.readdirSync(out).filter(f => f.endsWith('.svg'))) {
  const file = new URL(name, out);
  const prefix = name.slice(0, -4);
  let source = fs.readFileSync(file, 'utf8');
  for (const id of ['title', 'desc', 'arrow']) {
    source = source.replaceAll(`id="${id}"`, `id="${prefix}-${id}"`).replaceAll(`url(#${id})`, `url(#${prefix}-${id})`);
  }
  source = source.replace('aria-labelledby="title desc"', `aria-labelledby="${prefix}-title ${prefix}-desc"`);
  fs.writeFileSync(file, source);
}
