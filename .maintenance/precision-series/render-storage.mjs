import { mkdirSync, writeFileSync } from 'node:fs'
import { storageFormats } from './storage-formats.mjs'

const assets = new URL('../../public/ai/precision/storage/', import.meta.url)
const sources = new URL('./sources/storage/', import.meta.url)
const manifestFile = new URL('../../.vitepress/theme/components/precision/storage-figures.json', import.meta.url)
for (const directory of [assets, sources, new URL('.', manifestFile)]) mkdirSync(directory, { recursive: true })
const colors = { sign: '#f9e5e9', exponent: '#dcece9', fraction: '#e0e9f6', data: '#e0e9f6', muted: '#e7eaed' }
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const wrap = (value, limit) => {
  const lines = ['']
  let width = 0
  const measure = text => [...text].reduce((sum, char) => sum + (/[\u0020-\u007e]/.test(char) ? 0.61 : 1), 0)
  const tokens = String(value).match(/[A-Za-z0-9_]+(?:[.][A-Za-z0-9_]+)*|./gu) || []
  for (const token of tokens) {
    const parts = measure(token) > limit ? [...token] : [token]
    for (const part of parts) {
      const next = measure(part)
      if (width + next > limit) { lines.push(''); width = 0 }
      lines[lines.length - 1] += part
      width += next
    }
  }
  return lines
}
const text = (x, y, content, size = 16, attrs = '') => `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${escape(content)}</text>`
const lines = (x, y, content, size, limit, attrs = '') => {
  const values = wrap(content, limit)
  return { svg: values.map((value, i) => text(x, y + i * (size + 6), value, size, attrs)).join(''), height: values.length * (size + 6) }
}
function draw(format, mobile) {
  const width = mobile ? 320 : 720
  const margin = mobile ? 20 : 24
  const inner = width - margin * 2
  const elements = []
  const title = lines(margin, 36, format.title, mobile ? 22 : 25, mobile ? inner / 22 : 39, 'font-weight="600"')
  elements.push(title.svg)
  let y = 36 + title.height
  const subtitle = lines(margin, y + 4, format.subtitle, 15, mobile ? inner / 15 : 44, 'fill="#536975"')
  elements.push(subtitle.svg)
  y += subtitle.height + 20
  const stored = format.fields.filter(part => part.bits > 0)
  const total = stored.reduce((sum, part) => sum + part.bits, 0)
  let x = margin
  for (const part of stored) {
    const segment = inner * part.bits / total
    elements.push(`<rect x="${x}" y="${y}" width="${segment}" height="32" fill="${colors[part.role]}"/>`)
    if (total <= 32 && /^[01]+$/.test(part.code)) {
      for (let i = 0; i < part.bits; i++) {
        const bx = x + i * inner / total
        elements.push(`<line x1="${bx}" y1="${y}" x2="${bx}" y2="${y + 32}" stroke="#ffffff"/>`)
        if (!mobile || total <= 16) elements.push(text(bx + inner / total / 2, y + 22, part.code[i], 15, 'text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace"'))
      }
    }
    x += segment
  }
  y += 70
  let high = format.total - 1
  for (const part of format.fields) {
    const bitRange = part.bits === 1 ? `位 ${high}` : `位 ${high}—${high - part.bits + 1}`
    const scalar = ['float', 'integer', 'scale', 'compute', 'packing', 'lookup'].includes(format.family)
    const meta = part.bits ? `${part.bits} 位${scalar ? ` · ${bitRange}` : ' · 块内字段'}` : '固定规则或共享数据'
    if (part.bits) high -= part.bits
    elements.push(`<rect x="${margin}" y="${y - 18}" width="4" height="${mobile ? 21 : 22}" fill="${colors[part.role]}"/>`)
    elements.push(text(margin + 12, y, part.name, 17, 'font-weight="600"'))
    elements.push(text(margin + 12, y + 23, meta, 13, 'fill="#536975"'))
    if (mobile) {
      const code = lines(margin + 12, y + 52, part.code, 16, (inner - 12) / 16, 'font-family="ui-monospace, SFMono-Regular, monospace"')
      elements.push(code.svg)
      const detail = lines(margin + 12, y + 56 + code.height, part.detail, 15, (inner - 12) / 15)
      elements.push(detail.svg)
      y += 78 + code.height + detail.height
    } else {
      const code = lines(width - margin, y + 22, part.code, 15, 18, 'text-anchor="end" font-family="ui-monospace, SFMono-Regular, monospace"')
      elements.push(code.svg)
      const detail = lines(margin + 12, y + 47, part.detail, 14, 27)
      elements.push(detail.svg)
      y += Math.max(86, detail.height + 58, code.height + 40)
    }
  }
  elements.push(`<line x1="${margin}" y1="${y - 5}" x2="${width - margin}" y2="${y - 5}" stroke="#c9d4db"/>`)
  y += 24
  for (const result of format.result) {
    const row = lines(margin, y, result, 15, mobile ? inner / 15 : 44)
    elements.push(row.svg)
    y += row.height + 9
  }
  const height = Math.ceil((y + 12) / 4) * 4
  return {
    width, height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${format.id}-title ${format.id}-desc"><title id="${format.id}-title">${escape(format.title)} 的存储结构</title><desc id="${format.id}-desc">${escape(format.fields.map(part => `${part.name}：${part.bits ? part.bits + ' 位，' : ''}${part.code}，${part.detail}`).join('；'))}</desc><rect width="${width}" height="${height}" fill="#f4f7f9"/><g font-family="PingFang SC, Microsoft YaHei, sans-serif" fill="#243b45">${elements.join('')}</g></svg>`,
  }
}
const manifest = {}
for (const format of storageFormats) {
  const desktop = draw(format, false)
  const mobile = draw(format, true)
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(format.title)}</title><style>body{margin:0;background:#f4f7f9}.figure{max-width:720px;margin:auto}svg{display:block;width:100%;height:auto}.mobile{display:none}@media(max-width:600px){.desktop{display:none}.mobile{display:block}}</style><div class="figure desktop">${desktop.svg}</div><div class="figure mobile">${mobile.svg}</div></html>`
  writeFileSync(new URL(`${format.id}.html`, sources), html)
  writeFileSync(new URL(`${format.id}.svg`, assets), desktop.svg)
  writeFileSync(new URL(`${format.id}-mobile.svg`, assets), mobile.svg)
  manifest[format.id] = { title: format.title, desktop: { width: desktop.width, height: desktop.height }, mobile: { width: mobile.width, height: mobile.height } }
}
writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
writeFileSync(new URL('./storage-samples.json', import.meta.url), JSON.stringify(storageFormats, null, 2) + '\n')
console.log(`已生成 ${storageFormats.length} 种格式的桌面/手机 SVG、HTML 源稿与尺寸清单`)
