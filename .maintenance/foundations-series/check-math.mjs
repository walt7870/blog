import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluate, update, trajectory, contour } from '../../.vitepress/theme/components/foundations/math.mjs'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
for(const[w,b]of[[0,0],[2,1],[-.5,3],[3,-1]]) {
  const r=evaluate(w,b),h=1e-5
  near(r.dw,(evaluate(w+h,b).loss-evaluate(w-h,b).loss)/(2*h))
  near(r.db,(evaluate(w,b+h).loss-evaluate(w,b-h).loss)/(2*h))
}
near(evaluate(2,1).loss,0)
near(evaluate(0,0).loss,83/6)
for(const level of[.1,2,14]) for(const branch of contour(level)) for(const[w,b]of branch) near(evaluate(w,b).loss,level)
const single=[{x:2,y:4}]
const one=evaluate(1,0,single);near(one.loss,2);near(one.dw,-4)
near(evaluate(1-.1*one.dw,0,single).loss,.72)
near(evaluate(1-one.dw,0,single).loss,18)
const rows=trajectory(.1,40)
assert.ok(rows.at(-1).loss<rows[0].loss/1000)
assert.ok(update(0,0,1).loss>rows[0].loss)
const saved=JSON.parse(readFileSync(new URL('../../public/ai/foundations/labs/gradient-run.json',import.meta.url)))
assert.deepEqual(saved.rows,rows)
console.log(JSON.stringify({checks:'解析梯度/有限差分、等高线、手算反例、训练轨迹一致',initial:rows[0],final:rows.at(-1)},null,2))
