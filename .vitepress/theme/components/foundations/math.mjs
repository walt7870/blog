export const samples = Object.freeze([{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }])
export const bounds = Object.freeze({ w: [-1, 4], b: [-2, 4] })

export function evaluate(w, b, data = samples) {
  if (!Number.isFinite(w) || !Number.isFinite(b) || !data.length) throw new Error('参数和样本必须有效')
  let loss = 0, dw = 0, db = 0
  for (const { x, y } of data) {
    const residual = w * x + b - y
    loss += residual * residual / 2
    dw += residual * x
    db += residual
  }
  return { loss: loss / data.length, dw: dw / data.length, db: db / data.length }
}

export function update(w, b, lr, data = samples) {
  if (!Number.isFinite(lr) || lr <= 0) throw new Error('学习率必须是正数')
  const before = evaluate(w, b, data)
  const nextW = w - lr * before.dw, nextB = b - lr * before.db
  return { w: nextW, b: nextB, ...evaluate(nextW, nextB, data), before }
}

export function trajectory(lr = 0.1, steps = 40, w = 0, b = 0, data = samples) {
  const rows = [{ step: 0, w, b, ...evaluate(w, b, data) }]
  for (let step = 1; step <= steps; step++) {
    const next = update(w, b, lr, data)
    if (!Number.isFinite(next.loss) || next.loss > 1e12) break
    w = next.w; b = next.b
    rows.push({ step, w, b, loss: next.loss, dw: next.dw, db: next.db })
  }
  return rows
}

export const format = value => Math.abs(value) < 0.00005 ? '0' : Number(value.toFixed(4)).toString()

export function contour(level) {
  // Solve L(w,b)=level for b; this quadratic is exact for the three samples.
  const branches = [[], []]
  for (let i = 0; i <= 240; i++) {
    const w = bounds.w[0] + i / 240 * (bounds.w[1] - bounds.w[0])
    const base = samples.map(({ x, y }) => w * x - y)
    const mean = base.reduce((a, v) => a + v, 0) / base.length
    const square = base.reduce((a, v) => a + v * v, 0) / base.length
    const disc = mean * mean - square + 2 * level
    if (disc >= 0) {
      const root = Math.sqrt(disc)
      branches[0].push([w, -mean - root])
      branches[1].push([w, -mean + root])
    }
  }
  return branches
}
