export function kvBytes({ layers, heads, dimension, bytes, tokens, sequences }) {
  return 2 * layers * heads * dimension * bytes * tokens * sequences
}

export function matchPrefix(a, b, pageSize) {
  let exact = 0
  while (exact < a.length && exact < b.length && a[exact] === b[exact]) exact++
  return { exact, reusable: Math.floor(exact / pageSize) * pageSize }
}

// 教学模型：全部请求同时到达，每轮每条活跃序列推进一个 token。
export function schedule(lengths, slots, continuous) {
  const remaining = [...lengths]
  const rows = lengths.map(() => [])
  let next = 0
  let active = []
  let tick = 0
  while (next < lengths.length || active.length) {
    if (continuous || active.length === 0) {
      while (active.length < slots && next < lengths.length) active.push(next++)
    }
    for (const id of active) { rows[id].push(tick); remaining[id]-- }
    active = active.filter(id => remaining[id] > 0)
    tick++
  }
  return { rows, ticks: tick, work: lengths.reduce((a, b) => a + b, 0) }
}

export function greedyVerification(target, draft) {
  let accepted = 0
  while (accepted < draft.length && draft[accepted] === target[accepted]) accepted++
  return {
    accepted,
    committed: target.slice(0, Math.min(accepted + 1, target.length)),
    rejected: accepted < draft.length,
  }
}
