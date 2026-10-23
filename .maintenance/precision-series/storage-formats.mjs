const binary = (value, width) => value.toString(2).padStart(width, '0')
const field = (name, bits, code, detail, role = 'data') => ({ name, bits, code, detail, role })
const floating = (id, title, exponent, fraction, bias, range, special, sample = 1.25) => ({
  id, title, family: 'float', total: 1 + exponent + fraction, exponent, fraction, bias, sample,
  subtitle: `${1 + exponent + fraction} 位；示例 ${sample}`,
  fields: [
    field('符号 S', 1, '0', '0 取正号，1 取负号', 'sign'),
    field('指数 E', exponent, binary(bias, exponent), `${bias} − 偏移 ${bias} = 指数 0`, 'exponent'),
    field('小数部分 F', fraction, sample === 1.5 ? '1'.padEnd(fraction, '0') : '01'.padEnd(fraction, '0'), sample === 1.5 ? '首位的位权为 1/2；隐含开头的 1' : '第二位的位权为 1/4；隐含开头的 1', 'fraction'),
  ],
  result: [`读回：(+1) × (1 + ${sample === 1.5 ? '1/2' : '1/4'}) × 2^0 = ${sample}`, `最大有限值：${range}`, special],
})
const integer = (width, unsigned = false) => {
  const id = `${unsigned ? 'uint' : 'int'}${width}`
  const value = unsigned ? (width === 4 ? 11 : 251) : -5
  const code = unsigned ? binary(value, width) : binary((1n << BigInt(width)) - 5n, width)
  return {
    id, title: id.toUpperCase(), family: 'integer', total: width, sample: value,
    subtitle: `${width} 位${unsigned ? '无符号' : '补码'}整数；示例 ${value}`,
    fields: unsigned ? [field('全部位共同表示整数', width, code, `每位的正位权从 2^${width - 1} 递减到 2^0`)] : [
      field('最高位', 1, code[0], `位权为 −2^${width - 1}；1 时计入这一负值`, 'sign'),
      field('其余位', width - 1, code.slice(1), `位权从 2^${width - 2} 递减到 2^0`, 'data'),
    ],
    result: unsigned ? [`读回：${code}₂ = ${value}`, `范围：0 到 ${2 ** width - 1}`, '用于无符号数据，也可配零点与 scale 量化'] : [
      width === 4 ? '读回：−8 + 0×4 + 1×2 + 1×1 = −5' : width === 8 ? '读回：−128 + 123 = −5' : `读回：−2^${width - 1} + (2^${width - 1} − 5) = −5`,
      width <= 8 ? `范围：−${2 ** (width - 1)} 到 ${2 ** (width - 1) - 1}` : `范围：−2^${width - 1} 到 2^${width - 1}−1`, width <= 8 ? '量化时另保存组级 scale，按方案还可有零点' : '用于整数数据；最高位按负位权参与求和'],
  }
}
const mx = (id, title, width, payload) => ({
  id, title, family: 'block', total: 8 + 32 * width,
  subtitle: `32 个 ${width} 位值，共用 1 个 E8M0 缩放因子`,
  fields: [
    field('组级 scale', 8, '10000000', 'E8M0 编码 128 → 2^(128−127) = 2', 'exponent'),
    field('32 个数值编码', 32 * width, `32 × ${payload}`, `${32 * width} 位载荷；每个数按自身格式解码`, 'data'),
  ],
  result: ['示例：组内编码读为 1.5，乘 scale 2 → 3', `每组 ${(8 + 32 * width) / 8} 字节；平均 ${width + 0.25} 位/值`, 'scale 由一组共享，计入总存储空间'],
})

export const storageFormats = [
  floating('fp64', 'FP64', 11, 52, 1023, '约 1.80 × 10^308', '科学计算常见；支持零、次正规数、Inf 与 NaN'),
  floating('fp32', 'FP32', 8, 23, 127, '约 3.40 × 10^38', '支持零、次正规数、Inf 与 NaN'),
  floating('fp16', 'FP16', 5, 10, 15, '65504', '支持零、次正规数、Inf 与 NaN'),
  floating('bf16', 'BF16', 8, 7, 127, '约 3.39 × 10^38', '8 位指数保留宽范围；小数部分保存 7 位'),
  floating('fp8-e4m3fn', 'FP8 E4M3FN', 4, 3, 7, '448', '保留 NaN；指数全 1 的部分编码仍表示有限值'),
  floating('fp8-e5m2', 'FP8 E5M2', 5, 2, 15, '57344', '支持 Inf 与 NaN；小数部分保存 2 位'),
  floating('fp8-e4m3fnuz', 'FP8 E4M3FNUZ', 4, 3, 8, '240', '单一零；10000000 是 NaN；偏移量为 8'),
  floating('fp8-e5m2fnuz', 'FP8 E5M2FNUZ', 5, 2, 16, '57344', '单一零；10000000 是 NaN；偏移量为 16'),
  floating('fp6-e2m3', 'FP6 E2M3', 2, 3, 1, '7.5', '有限值编码；常作为 MX 块内的 6 位数值'),
  floating('fp6-e3m2', 'FP6 E3M2', 3, 2, 3, '28', '有限值编码；指数更宽，小数部分更短'),
  floating('fp4-e2m1', 'FP4 E2M1', 2, 1, 1, '6', '正幅值：0、0.5、1、1.5、2、3、4、6', 1.5),
  integer(8), integer(4), integer(8, true), integer(4, true), integer(16), integer(32), integer(64),
  {
    id: 'nf4', title: 'NF4', family: 'lookup', total: 4,
    subtitle: '每个数保存 4 位索引；一组另有共享缩放因子',
    fields: [
      field('码本索引', 4, '1111', '四位组成索引 15，去固定码本查数值'),
      field('固定 NF4 码本', 0, '表[15] = 1', '例如：表[0] = −1，表[7] = 0', 'fraction'),
      field('块级缩放因子', 0, 'FP32，约为 0.3', '图示 64 值共享一个 32 位 scale', 'exponent'),
    ],
    result: ['读回：表[15] × scale ≈ 1 × 0.3 = 0.3', 'NF4 的位表示查表索引，刻度由码本安排', '图示每组 64×4 + 32 = 288 位，平均 4.5 位/值'],
  },
  {
    id: 'e8m0', title: 'E8M0 缩放格式', family: 'scale', total: 8,
    subtitle: '8 位都用于指数；常保存 MX 块的 scale',
    fields: [field('指数编码 E', 8, '10000000', '128 − 偏移 127 = 1；因此 scale = 2^1', 'exponent')],
    result: ['读回：2^(128−127) = 2', '有限编码 0—254 对应 2^−127—2^127', '11111111 表示 NaN；该格式保存正的 2 的幂'],
  },
  mx('mxfp8', 'MXFP8（图中采用 E4M3）', 8, 'FP8'),
  mx('mxfp6', 'MXFP6', 6, 'FP6'),
  mx('mxfp4', 'MXFP4', 4, 'FP4 E2M1'),
  {
    id: 'nvfp4', title: 'NVFP4', family: 'block', total: 72,
    subtitle: '图示 16 值分组：块级 scale + E2M1 数值',
    fields: [
      field('块级 scale', 8, '0 | 1000 | 000', 'FP8 E4M3 编码读为 2', 'exponent'),
      field('16 个 E2M1 编码', 64, '16 × 4 位', '每个值 4 位；示例 0 | 01 | 1 读为 1.5'),
      field('张量级 scale', 0, 'FP32，例如 1.0', '整个张量共享，单独保存', 'fraction'),
    ],
    result: ['读回示例：1.5 × 块级 2 × 张量级 1 = 3', '组内 72 位 / 16 = 4.5 位/值', '另加张量级 FP32 scale 的摊销空间'],
  },
  {
    id: 'gguf-q4-0', title: 'GGUF / GGML Q4_0', family: 'block', total: 144,
    subtitle: '32 个值一块；结构体中保存 scale 与量化码',
    fields: [
      field('缩放因子 d', 16, 'FP16，占 2 字节', '一块的 32 个值共用 d', 'exponent'),
      field('量化码 qs', 128, '32 × 4 位，占 16 字节', '一个字节装两个 4 位码，q 范围为 0—15'),
    ],
    result: ['读回：x = d × (q − 8)', '2 + 16 = 18 字节 / 32 值 = 4.5 位/值', '例如 d = 0.25、q = 9，得到 x = 0.25'],
  },
  {
    id: 'gguf-q4-k', title: 'GGUF / GGML Q4_K', family: 'block', total: 1152,
    subtitle: '256 个值一块；细分为 8 组，每组 32 个值',
    fields: [
      field('总 scale 与总 min', 32, 'd、dmin 各为 FP16', '两个 16 位数共占 4 字节', 'exponent'),
      field('组级 scale 与 min', 96, '8 × (6 + 6) 位', '打包为 12 字节，服务于 8 个子组', 'fraction'),
      field('量化码 qs', 1024, '256 × 4 位', '载荷占 128 字节，q 范围为 0—15'),
    ],
    result: ['读回：x = d × 组 scale × q − dmin × 组 min', '4 + 12 + 128 = 144 字节 / 256 值', '平均 4.5 位/值，已包含块内元数据'],
  },
  {
    id: 'tf32', title: 'TF32 矩阵计算模式', family: 'compute', total: 32,
    subtitle: '输入仍为 FP32；图示进入乘法时的有效位',
    fields: [
      field('符号', 1, '0', '沿用输入的正负号', 'sign'),
      field('指数', 8, '01111111', '保留 FP32 的 8 位指数范围', 'exponent'),
      field('进入乘法的小数部分', 10, '0100000000', '保留 10 位小数部分，隐含开头的 1', 'fraction'),
      field('FP32 的其余小数位', 13, '0000000000000', '进入乘法前参与舍入；累加通常采用 FP32', 'muted'),
    ],
    result: ['示例 1.25 在这次舍入中仍为 1.25', '模型输入与输出可以继续按 FP32 保存', '记录配置时分别写保存 dtype 和 TF32 计算开关'],
  },
  {
    id: 'int4-packing', title: '两个 INT4 怎样装进一字节', family: 'packing', total: 8,
    subtitle: '采用 ONNX 的先低半字节、后高半字节排列',
    fields: [
      field('高 4 位', 4, '0011', '第二个值：补码 0011 = 3', 'fraction'),
      field('低 4 位', 4, '1011', '第一个值：补码 1011 = −5'),
    ],
    result: ['存储顺序：第一个值 −5，第二个值 3', '整个字节：00111011₂ = 0x3B', '奇数个值时，最后一个字节还会留下填充半字节'],
  },
]
