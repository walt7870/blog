// Figures for the new pages of docs/basic/acoustics/ (09 asr-models, 10 speaker).
// Reuses the llm-architecture drawing kit but writes to public/acoustics/.
// Run: node .maintenance/speech/diagrams-speech.mjs
import { writeFileSync } from 'node:fs';
import { svg, box, cell, edge, text } from '../llm-architecture/svg-kit.mjs';

const out = new URL('../../public/acoustics/', import.meta.url);

// 09: the four end-to-end ASR families, same audio in, how text comes out.
function families() {
  const W = 1400, H = 780;
  const cols = [
    { k: 'CTC', cls: 'blue', title: '编码器 + CTC', how: ['每一帧独立输出一个 token', '或空白，合并重复后得到文字'], pro: ['并行解码，快', '可做流式'], con: ['帧之间条件独立', '上下文常靠外部语言模型补'], ex: 'SenseVoice-Small、Parakeet-CTC' },
    { k: 'Transducer', cls: 'green', title: '编码器 + 预测网络', how: ['联合网络每帧决定：输出', 'token，还是读下一帧'], pro: ['天然流式', '解码时可加热词偏置'], con: ['训练显存大', '结构比 CTC 复杂'], ex: 'Zipformer、Parakeet-TDT' },
    { k: '编码器-解码器', cls: 'amber', title: '编码器 + 自回归解码器', how: ['解码器用交叉注意力读整段', '音频，逐个生成 token'], pro: ['整段上下文，准确率高', '一并输出标点和语言'], con: ['通常非流式', '静音和噪声上会幻觉'], ex: 'Whisper、Canary' },
    { k: '大模型路线', cls: 'violet', title: '音频编码器 + 大语言模型', how: ['音频向量经适配层投影成', 'LLM 的输入，由 LLM 生成文字'], pro: ['语言知识强，可用提示词', '给上下文和热词'], con: ['参数大、首字慢', '幻觉风险与 LLM 相同'], ex: 'Qwen3-ASR、FireRedASR-LLM' },
  ];
  const cw = 312, gap = 24, x0 = 32;
  let b = '';
  cols.forEach((c, i) => {
    const x = x0 + i * (cw + gap);
    b += box(`in-${i}`, x, 112, cw, 84, 'gray', '同一段音频', ['16 kHz PCM → Fbank 特征']);
    b += edge(`M${x + cw / 2} 198V222`);
    b += box(`arch-${i}`, x, 224, cw, 128, c.cls, c.title, c.how, c.k);
    b += edge(`M${x + cw / 2} 354V380`);
    b += box(`pro-${i}`, x, 382, cw, 96, 'green', '长处', c.pro);
    b += box(`con-${i}`, x, 494, cw, 96, 'red', '代价', c.con);
    b += box(`ex-${i}`, x, 606, cw, 76, 'node', '代表模型', [c.ex]);
  });
  b += text(32, 732, '非自回归的 Paraformer 介于第一、三类之间：先用 CIF 预测这段有几个字，再由解码器一次并行生成全部字，不逐字等待。');
  return svg('asr-families', W, H, '端到端语音识别的四类结构', '同一段音频分别进入 CTC、Transducer、编码器-解码器和音频编码器加大语言模型四类结构，对比解码方式、长处、代价与代表模型。', '端到端识别模型的四类结构', '区别在于“文字怎样从音频向量里生成出来”：逐帧判、边读边判、读完整段再写、交给大模型写。', b);
}

// 10: four speaker-related tasks on one 12-second timeline.
function tasks() {
  const W = 1400, H = 700;
  const x0 = 300, sec = 82; // 12 s -> 984 px
  const X = s => x0 + s * sec;
  let b = '';
  // time axis
  b += `<path d="M${x0} 136H${X(12)}" class="axis"/>`;
  for (let s = 0; s <= 12; s += 2) b += `<path d="M${X(s)} 130V142" class="axis"/>` + text(X(s), 124, `${s}s`, 'xs', 'middle');
  const rows = [
    { y: 160, title: 'VAD', q: '哪里有人声', segs: [[0.5, 4.2, 'fgray', '语音'], [4.8, 8.6, 'fgray', '语音'], [9.2, 11.6, 'fgray', '语音']] },
    { y: 260, title: '说话人分离', q: '谁在什么时候说（匿名）', segs: [[0.5, 4.2, 'fblue', 'spk0'], [4.8, 7.4, 'fgreen', 'spk1'], [7.0, 8.6, 'fblue', 'spk0'], [9.2, 11.6, 'fgreen', 'spk1']] },
    { y: 380, title: '声纹验证', q: '这段是不是登记的张三', segs: [[0.5, 4.2, 'fgreen', '是 0.81'], [4.8, 7.0, 'fred', '否 0.12'], [7.4, 8.6, 'fgreen', '是 0.74'], [9.2, 11.6, 'fred', '否 0.09']] },
    { y: 480, title: '目标说话人 ASR', q: '只转写张三说的话', segs: [[0.5, 4.2, 'fviolet', '“下周三开评审会”'], [7.0, 8.6, 'fviolet', '“我来定”']] },
  ];
  for (const r of rows) {
    b += box(`row-${r.title}`, 32, r.y, 244, 76, 'node', r.title, [r.q]);
    b += `<path d="M${x0} ${r.y + 38}H${X(12)}" class="line"/>`;
    const lane = r.title === '说话人分离';
    for (const [s, e, cls, t] of r.segs) {
      const overlap = lane && s === 7.0;
      const y = overlap ? r.y + 44 : r.y + (lane ? 8 : 20);
      const h = lane ? 30 : 36;
      b += cell(X(s), y, X(e) - X(s), h, cls, t, 'xs');
    }
  }
  b += text(X(7.0), 352, '7.0—7.4 s 两人重叠', 'xs');
  b += box('note', 32, 588, 1336, 76, 'amber', '它们的输出不能互相顶替', ['分离给出的 spk0 只在本次会话内有意义，不等于张三；验证要先有登记录音；目标说话人 ASR 把登记参考作为模型输入；先用分离结果剪音频是另一种做法，重叠处易丢字或混入他人。']);
  return svg('speaker-tasks', W, H, '说话人相关的四个任务', '同一段 12 秒、两人交替并有重叠的音频，分别给出 VAD、说话人分离、声纹验证和目标说话人 ASR 的输出。', '同一段对话，四个任务给出四种答案', '两人交替说话，7.0—7.4 秒重叠；张三是事先登记过声音的目标说话人。', b);
}

for (const [name, content] of Object.entries({ 'asr-families': families(), 'speaker-tasks': tasks() })) writeFileSync(new URL(`${name}.svg`, out), content);
console.log('wrote asr-families, speaker-tasks');
