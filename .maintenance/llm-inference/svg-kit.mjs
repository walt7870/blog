// Shared drawing helpers for the docs/ai/llm-inference/ figures. Each diagrams-*.mjs file
// imports these and writes its SVGs to public/ai/llm-inference/.
import { mkdirSync, writeFileSync } from 'node:fs';

export const out = new URL('../../public/ai/llm-inference/', import.meta.url);
mkdirSync(out, { recursive: true });

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = "Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
const mono = "'SFMono-Regular', Menlo, Consolas, monospace";

// Page frame: heading + subheading at the top, then `body`. Class names:
// h heading, t box title, s secondary text, k small caps kicker, m monospace,
// node/blue/green/red/amber/violet/gray box fills, edge/dash arrows, line separators.
export function svg(id, w, h, title, desc, heading, sub, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc" id="${id}-root">
<title id="${id}-title">${esc(title)}</title>
<desc id="${id}-desc">${esc(desc)}</desc>
<defs><style>
#${id}-root text { font-family: ${font}; fill: #172b3a; }
#${id}-root .h { font-size: 26px; font-weight: 700; }
#${id}-root .t { font-size: 19px; font-weight: 600; }
#${id}-root .s { font-size: 15px; fill: #475569; }
#${id}-root .xs { font-size: 13px; fill: #64748b; }
#${id}-root .k { font-size: 13px; font-weight: 700; letter-spacing: .04em; fill: #64748b; }
#${id}-root .m { font-family: ${mono}; font-size: 14px; fill: #172b3a; }
#${id}-root .node { fill: #fff; stroke: #cbd5e1; stroke-width: 2; }
#${id}-root .blue { fill: #eff6ff; stroke: #60a5fa; stroke-width: 2; }
#${id}-root .green { fill: #ecfdf5; stroke: #20a28c; stroke-width: 2; }
#${id}-root .red { fill: #fff1f2; stroke: #e88191; stroke-width: 2; }
#${id}-root .amber { fill: #fffbeb; stroke: #e0a63a; stroke-width: 2; }
#${id}-root .violet { fill: #f5f3ff; stroke: #9b87f5; stroke-width: 2; }
#${id}-root .gray { fill: #f1f5f9; stroke: #cbd5e1; stroke-width: 2; }
#${id}-root .fblue { fill: #93c5fd; } #${id}-root .fgreen { fill: #6ee7b7; } #${id}-root .fred { fill: #fda4af; }
#${id}-root .famber { fill: #fcd34d; } #${id}-root .fviolet { fill: #c4b5fd; } #${id}-root .fgray { fill: #e2e8f0; }
#${id}-root .edge { fill: none; stroke: #64748b; stroke-width: 2; marker-end: url(#${id}-arrow); }
#${id}-root .dash { fill: none; stroke: #94a3b8; stroke-width: 2; stroke-dasharray: 7 6; marker-end: url(#${id}-arrow); }
#${id}-root .line { stroke: #cbd5e1; stroke-width: 1.5; fill: none; }
#${id}-root .axis { stroke: #64748b; stroke-width: 2; fill: none; }
</style><marker id="${id}-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#64748b"/></marker></defs>
<rect width="${w}" height="${h}" fill="#f8fafc"/>
<text x="32" y="46" class="h">${esc(heading)}</text>
<text x="32" y="78" class="s">${esc(sub)}</text>
${body}
</svg>
`;
}

// A box with a title line and optional sub lines. `node` names the group so the
// checker can verify text stays inside the rect.
export function box(node, x, y, w, h, cls, title, lines = [], kicker) {
  const ty = y + (kicker ? 52 : 36);
  let t = `<g data-node="${node}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" class="${cls}"/>`;
  if (kicker) t += `<text x="${x + 18}" y="${y + 26}" class="k">${esc(kicker)}</text>`;
  if (title) t += `<text x="${x + 18}" y="${ty}" class="t">${esc(title)}</text>`;
  lines.forEach((l, i) => { t += `<text x="${x + 18}" y="${ty + 28 + i * 23}" class="s">${esc(l)}</text>`; });
  return t + '</g>';
}

// A small filled cell, optionally labelled in its centre (token, block, time slot).
export function cell(x, y, w, h, cls, text = '', textCls = 'xs') {
  let t = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="${cls}"/>`;
  if (text !== '') t += `<text x="${x + w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="${textCls}">${esc(text)}</text>`;
  return t;
}

export const edge = (d, cls = 'edge') => `<path d="${d}" class="${cls}"/>`;
export const text = (x, y, s, cls = 's', anchor = 'start') => `<text x="${x}" y="${y}" class="${cls}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}>${esc(s)}</text>`;
// Text on a background patch so it stays readable over lines.
export const label = (x, y, s, w) => `<rect x="${x - 6}" y="${y - 18}" width="${w ?? String(s).length * 15 + 12}" height="26" rx="4" fill="#f8fafc"/><text x="${x}" y="${y}" class="s">${esc(s)}</text>`;

export function write(figures) {
  for (const [name, content] of Object.entries(figures)) writeFileSync(new URL(`${name}.svg`, out), content);
  console.log(`wrote ${Object.keys(figures).length} figures: ${Object.keys(figures).join(', ')}`);
}
